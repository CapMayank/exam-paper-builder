/**
 * A blueprint as students see it: the question pattern (question numbers, type, marks) and the marks per
 * chapter. Nothing internal (templates, quotas by id, curriculum mode) and no questions.
 */
import { EXAM_TYPE_LABEL, inferClassOrder, QUESTION_TYPE_LABEL, type ExamType } from "./constants";
import { normalizeSession } from "./academicSessionUtils";
import { resolveInternalChoiceRequirement } from "./internalChoiceRules";
import { splitChapterTitle } from "./subjectBooks";
import type { Blueprint } from "./types";

/** The school grid's names for the common question types. */
const STUDENT_TYPE_LABEL: Record<string, string> = {
  MCQ: "Multiple Choice Questions (MCQ)",
  FILL_BLANK: "Fill in the Blanks (FIB)",
  TRUE_FALSE: "True / False",
  VERY_SHORT: "Very Short Answer (VSA)",
  SHORT: "Short Answer (SA)",
  LONG: "Long Answer (LA)",
  MATCH_COLUMN: "Match the Columns",
};

export function studentTypeLabel(type: string): string {
  return STUDENT_TYPE_LABEL[type] ?? QUESTION_TYPE_LABEL[type as keyof typeof QUESTION_TYPE_LABEL] ?? type;
}

export type PatternRow = {
  section: string;
  /** "1–5", or "6" for a single question */
  questionNos: string;
  type: string;
  count: number;
  marksEach: number;
  total: number;
  /** Questions of this row that offer an internal choice (OR). */
  withChoice: number;
};

export type ChapterRow = { part: string | null; title: string; marks: number };

export type BlueprintSheet = {
  id: string;
  className: string;
  subject: string;
  examLabel: string;
  session: string;
  durationMin: number;
  totalMarks: number;
  questionCount: number;
  pattern: PatternRow[];
  /** Chapter (or unit) and its marks; a unit lists its chapters together. */
  chapters: ChapterRow[];
};

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} minutes`;
  const hours = m === 30 ? `${h}½` : `${h}`;
  if (m === 0 || m === 30) return `${hours} ${h === 1 && m === 0 ? "hour" : "hours"}`;
  return `${h} h ${m} min`;
}

function choiceCount(bp: Blueprint, s: Blueprint["sections"][number]): number {
  let n = 0;
  for (let i = 0; i < s.count; i++) {
    const req = resolveInternalChoiceRequirement({
      blueprintName: bp.name,
      academicSession: bp.academicSession,
      className: bp.book.className,
      subject: bp.book.subject,
      subjectCode: bp.subjectCode,
      examType: bp.examType,
      sectionTitle: s.title,
      sectionInstructions: s.instructions,
      questionType: s.type,
      marksEach: s.marksEach,
      orChoiceMode: s.orChoiceMode,
      orAlternativeCount: s.orAlternativeCount,
      orSlotsJson: s.orSlotsJson,
      slotIndex: i,
    });
    if (req.required) n++;
  }
  return n;
}

export function buildBlueprintSheet(bp: Blueprint): BlueprintSheet {
  const sections = [...bp.sections].sort((a, b) => a.position - b.position);
  let q = 1;
  const pattern: PatternRow[] = sections.map((s) => {
    // a multi-pair "match the columns" is one question on the paper
    const questions = s.type === "MATCH_COLUMN" ? 1 : s.count;
    const from = q;
    q += questions;
    const to = q - 1;
    return {
      section: s.title,
      questionNos: from === to ? `${from}` : `${from}–${to}`,
      type: studentTypeLabel(s.type),
      count: questions,
      marksEach: s.type === "MATCH_COLUMN" ? s.count * s.marksEach : s.marksEach,
      total: s.count * s.marksEach,
      withChoice: s.type === "MATCH_COLUMN" ? 0 : choiceCount(bp, s),
    };
  });

  // chapters in book order; chapters sharing a unit quota are one row whose marks are the unit's total
  const ordered = [...bp.chapters].filter((c) => c.marks > 0).sort((a, b) => a.chapter.number - b.chapter.number);
  const chapters: ChapterRow[] = [];
  const units = new Map<string, ChapterRow>();
  for (const c of ordered) {
    const { part, title } = splitChapterTitle(c.chapter.title);
    const unit = c.unitKey?.trim();
    const existing = unit ? units.get(unit) : undefined;
    if (existing) {
      existing.title += `, ${title}`;
      existing.marks += c.marks;
      continue;
    }
    const row = { part, title, marks: c.marks };
    if (unit) units.set(unit, row);
    chapters.push(row);
  }

  const examLabel = EXAM_TYPE_LABEL[bp.examType as ExamType] ?? bp.examType;
  return {
    id: bp.id,
    className: bp.book.className,
    subject: bp.book.subject,
    examLabel: /exam/i.test(examLabel) ? examLabel : `${examLabel} Examination`,
    session: normalizeSession(bp.academicSession),
    durationMin: bp.durationMin,
    totalMarks: pattern.reduce((n, r) => n + r.total, 0),
    questionCount: pattern.reduce((n, r) => n + r.count, 0),
    pattern,
    chapters,
  };
}

export type ExportFilter = { session: string; examType: string; classes: string[] };

/** The blueprints an export covers, class by class (in school order) and subject by subject. */
export function blueprintsForExport<T extends Pick<Blueprint, "academicSession" | "examType" | "book" | "curriculumMode">>(
  list: T[],
  filter: ExportFilter,
): T[] {
  const session = normalizeSession(filter.session);
  const classes = new Set(filter.classes.map((c) => c.trim().toLowerCase()));
  return list
    .filter(
      (b) =>
        normalizeSession(b.academicSession) === session &&
        (filter.examType === "ALL" || b.examType === filter.examType) &&
        classes.has(b.book.className.trim().toLowerCase()) &&
        b.curriculumMode !== "KG_WORKSHEET",
    )
    .sort(
      (a, b) =>
        inferClassOrder(a.book.className) - inferClassOrder(b.book.className) ||
        a.book.className.localeCompare(b.book.className) ||
        a.book.subject.localeCompare(b.book.subject),
    );
}
