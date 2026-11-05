// Pure helpers for setting up many blueprints at once: which pattern suits a book, the blueprint a pattern makes
// for that book, and how a changed pattern's sections line up with an existing blueprint's. Safe on client and server.

import { EXAM_TYPE_LABEL, type ExamType } from "./constants";
import { isSchoolPattern, type BlueprintPreset } from "./presets";
import { isSubjectMatching } from "./schoolCurriculum";
import { distributeMarksByRole } from "./roleMarks";
import { defaultAllowedTypes } from "./sectionTypes";
import { rowSlotSpecs, slotsWithRoles } from "./slotPlan";

export type SetupBook = { id: string; className: string; subject: string; chapters: Array<{ id: string; title?: string }> };

export type SetupExam = { examType: ExamType; academicSession: string; durationMin?: number | null };

export type SetupSection = {
  id?: string;
  title: string;
  instructions: string;
  type: string;
  count: number;
  marksEach: number;
  orChoiceMode: "BOARD_DEFAULT" | "REQUIRED" | "NOT_REQUIRED";
  orAlternativeCount: number;
  orSlotsJson: string;
  allowedTypesJson: string;
  slotPlanJson: string;
  role: "STANDARD" | "PASSAGE" | "GRAMMAR" | "WRITING" | "LITERATURE";
  groupKey: string;
};

export function classLevel(className: string): number | null {
  const m = className.match(/\d{1,2}/);
  return m ? parseInt(m[0], 10) : null;
}

/** Patterns offered for a book: the board's pattern for its class and subject, and the school's own patterns. */
export function presetsForBook(presets: BlueprintPreset[], book: Pick<SetupBook, "className" | "subject">): BlueprintPreset[] {
  const level = classLevel(book.className);
  if (level === null) return [];
  return presets.filter(
    (p) =>
      level >= p.classFrom &&
      level <= p.classTo &&
      (isSchoolPattern(p) ? !p.subjectName || isSubjectMatching(p.subjectName, book.subject) : isSubjectMatching(p.subjectName, book.subject)),
  );
}

const norm = (s: string | undefined) => (s ?? "").toLowerCase().replace(/[^a-zऀ-ॿ]+/g, " ").trim();

/**
 * How closely a pattern names this book's subject: every word of the book's subject found in the pattern's subject,
 * variant or title counts (so "Mathematics Basic" prefers the pattern titled Basic), the same subject name breaks ties.
 */
function subjectCloseness(p: BlueprintPreset, subject: string): number {
  const words = norm(subject).split(" ").filter(Boolean);
  const hay = ` ${norm(`${p.subjectName ?? ""} ${p.variant ?? ""} ${p.title}`)} `;
  const hits = words.filter((w) => hay.includes(` ${w} `)).length;
  return hits * 2 + (norm(p.subjectName) === norm(subject) ? 1 : 0);
}

/**
 * The pattern to start from: the board's own for this subject when there is one (the closest-named, so Mathematics
 * Basic gets the Basic pattern, not Standard), else the school's.
 */
export function suggestPreset(presets: BlueprintPreset[], book: Pick<SetupBook, "className" | "subject">): BlueprintPreset | null {
  const offered = presetsForBook(presets, book);
  const board = offered
    .filter((p) => !isSchoolPattern(p))
    .sort((x, y) => subjectCloseness(y, book.subject) - subjectCloseness(x, book.subject));
  // among the school's patterns, one made for this subject (English, Hindi) comes before the general one
  const school = offered
    .filter((p) => isSchoolPattern(p))
    .sort((x, y) => Number(Boolean(y.subjectName)) - Number(Boolean(x.subjectName)));
  return board[0] ?? school[0] ?? offered[0] ?? null;
}

export function presetTotals(p: Pick<BlueprintPreset, "sections">) {
  let marks = 0;
  let questions = 0;
  for (const g of p.sections) for (const q of g.questionTypes) {
    marks += q.count * q.marksEach;
    questions += q.type === "MATCH_COLUMN" ? 1 : q.count;
  }
  return { marks, questions };
}

const ROLES = ["PASSAGE", "GRAMMAR", "WRITING", "LITERATURE"];

/** A pattern's sections as blueprint sections; school patterns also accept the subject's other forms per slot. */
export function presetSections(preset: BlueprintPreset, subject: string): SetupSection[] {
  const school = isSchoolPattern(preset);
  return preset.sections.flatMap((g) =>
    g.questionTypes.map((qt) => {
      const raw = String(qt.orChoiceMode ?? "BOARD_DEFAULT");
      const policy = qt.choicePolicy?.policyType;
      let orChoiceMode: SetupSection["orChoiceMode"] = "BOARD_DEFAULT";
      if (qt.type === "UNSEEN_PASSAGE" || raw === "NOT_REQUIRED" || raw === "NO_CHOICE" || policy === "NO_CHOICE") orChoiceMode = "NOT_REQUIRED";
      else if (raw === "REQUIRED" || raw === "FULL_OR_ALTERNATIVE" || policy === "FULL_OR_ALTERNATIVE") orChoiceMode = "REQUIRED";
      const role = (ROLES.includes(qt.role ?? "") ? qt.role : "STANDARD") as SetupSection["role"];
      const slotPlanJson = Array.isArray(qt.slotPlan) && qt.slotPlan.length > 0 ? JSON.stringify(qt.slotPlan) : "[]";
      return {
        title: g.title,
        instructions: g.instructions ?? "",
        type: qt.type,
        count: qt.count,
        marksEach: qt.marksEach,
        orChoiceMode,
        orAlternativeCount: qt.orAlternativeCount ?? (orChoiceMode === "REQUIRED" ? 1 : orChoiceMode === "NOT_REQUIRED" ? 0 : 1),
        orSlotsJson: Array.isArray(qt.orSlots) ? JSON.stringify(qt.orSlots) : "[]",
        allowedTypesJson: school ? JSON.stringify(rowAllowedTypes({ type: qt.type, count: qt.count, role, slotPlanJson }, qt.marksEach, subject)) : "[]",
        slotPlanJson,
        role,
        groupKey: qt.groupKey ?? "",
      };
    }),
  );
}

/**
 * Forms a school-pattern slot accepts. A slot with its own role takes only forms of that kind; when a pattern has
 * such rows, its lesson rows stop offering passage, writing and grammar forms, so those marks stay where they belong.
 */
export function schoolAllowedTypes(type: string, marksEach: number, subject: string, role?: string | null): string[] {
  if (role === "PASSAGE") return ["UNSEEN_PASSAGE"];
  if (role === "WRITING") return Array.from(new Set([type, "WRITING_SKILL", "LONG"]));
  if (role === "GRAMMAR") return Array.from(new Set([type, "GRAMMAR"]));
  const all = defaultAllowedTypes(type, marksEach, subject);
  return role === "LITERATURE" ? all.filter((t) => t === type || !["UNSEEN_PASSAGE", "WRITING_SKILL", "GRAMMAR"].includes(t)) : all;
}

/** Forms a school-pattern row accepts: those of every kind of slot it has (a lesson MCQ row with one grammar slot). */
export function rowAllowedTypes(
  row: { type: string; count: number; role?: string | null; slotPlanJson?: string | null },
  marksEach: number,
  subject: string,
): string[] {
  const specs = rowSlotSpecs(row);
  const out: string[] = [row.type];
  for (const role of new Set(specs.map((s) => s.role))) {
    for (const t of schoolAllowedTypes(row.type, marksEach, subject, role)) if (!out.includes(t)) out.push(t);
  }
  for (const s of specs) if (!out.includes(s.type)) out.push(s.type);
  return out;
}

export function setupBlueprintName(book: Pick<SetupBook, "className" | "subject">, examType: ExamType): string {
  return `${book.className} ${book.subject} – ${EXAM_TYPE_LABEL[examType]}`;
}

/**
 * The blueprint a pattern makes for a book: its sections, and chapter quotas handed out whole question by question
 * so each chapter's quota is a sum of real question marks. The board's official chapter marks are applied on the
 * server where it has them.
 */
export function buildSetupInput(preset: BlueprintPreset, book: SetupBook, exam: SetupExam) {
  const sections = presetSections(preset, book.subject);
  const slots = slotsWithRoles(sections);
  const marks = distributeMarksByRole(slots, book.chapters.map((c) => ({ id: c.id, title: c.title ?? "" })), book.subject);
  return {
    name: setupBlueprintName(book, exam.examType),
    bookId: book.id,
    academicSession: exam.academicSession,
    examType: exam.examType,
    durationMin: exam.durationMin && exam.durationMin > 0 ? exam.durationMin : preset.durationMin,
    subjectCode: preset.subjectCode ?? "",
    language: (preset.language === "hi" || preset.language === "sa" || preset.language === "bilingual" ? preset.language : "en") as
      | "en"
      | "hi"
      | "sa"
      | "bilingual",
    curriculumMode: isSchoolPattern(preset) ? "CUSTOM_SCHOOL" : "STANDARD_MPBSE",
    curriculumTemplateId: isSchoolPattern(preset) ? null : preset.templateCode || preset.id,
    curriculumVariantId: null,
    componentsJson: JSON.stringify(preset.components ?? []),
    sections,
    chapters: Object.entries(marks)
      .filter(([, m]) => m > 0)
      .map(([chapterId, m]) => ({ chapterId, marks: m, unitKey: "", unitTitle: "" })),
  };
}

/**
 * Lines a new pattern's sections up with an existing blueprint's so that kept sections keep their id (and with it
 * the questions placed in them): first the same type at the same marks, then any free section at the same marks,
 * in order. Sections left over are new; existing sections not reused will be removed.
 */
/**
 * Rows an update drops whose questions have a home in a kept row: the same heading and marks (a pattern that
 * printed "MCQ 4 + MCQ 1" under one heading now has one row of five). Returns dropped row id -> kept row id.
 */
export function absorbingRows(
  removed: Array<{ id: string; title: string; marksEach: number }>,
  kept: Array<{ id?: string; title: string; marksEach: number }>,
): Map<string, string> {
  const key = (s: { title: string; marksEach: number }) => `${s.title.trim().toLowerCase()}|${s.marksEach}`;
  const out = new Map<string, string>();
  for (const r of removed) {
    const home = kept.find((k) => k.id && key(k) === key(r));
    if (home?.id) out.set(r.id, home.id);
  }
  return out;
}

export function matchSectionIds<T extends { type: string; marksEach: number; id?: string }>(
  existing: Array<{ id: string; type: string; marksEach: number }>,
  incoming: T[],
): { sections: Array<T & { id?: string }>; removedIds: string[] } {
  const free = [...existing];
  const take = (pred: (e: { id: string; type: string; marksEach: number }) => boolean) => {
    const i = free.findIndex(pred);
    return i < 0 ? undefined : free.splice(i, 1)[0].id;
  };
  const ids: Array<string | undefined> = incoming.map((s) => take((e) => e.type === s.type && e.marksEach === s.marksEach));
  const sections = incoming.map((s, i) => ({ ...s, id: ids[i] ?? take((e) => e.marksEach === s.marksEach) }));
  return { sections, removedIds: free.map((e) => e.id) };
}
