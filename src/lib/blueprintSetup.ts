import "server-only";
// Setting up the blueprints of one exam for many classes and subjects at once. `planSetup` says what would happen
// (including what an update would do to the papers already built); `applySetup` does it, row by row, with the same
// rules as editing a blueprint on its own.

import type { SessionUser } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { diagnosePaperImplications, validateBlueprint } from "@/lib/blueprint";
import { mapCurriculumTemplateToBlueprintInput, type BlueprintInput } from "@/lib/blueprints";
import { buildSetupInput, matchSectionIds, presetTotals, type SetupExam } from "@/lib/blueprintSetupPlan";
import { createBlueprint, updateBlueprintWithPapers, type BlueprintUpdateResult } from "@/lib/blueprintWrite";
import { WORKSHEET_MODE } from "@/lib/constants";
import { canManageScope, isAdmin } from "@/lib/permissions";
import { effectivePresets, isSchoolPattern, type BlueprintPreset } from "@/lib/presets";
import { prisma } from "@/lib/prisma";
import { missingUnitRoles } from "@/lib/roleMarks";
import { getLanguageNonChapterUnits } from "@/lib/syllabusImport";
import { presetSections } from "@/lib/blueprintSetupPlan";

const DOMAIN_OF = { PASSAGE: "reading", WRITING: "writing", GRAMMAR: "grammar" } as const;

/**
 * Adds the syllabus units a pattern's passage, writing and grammar slots need when the book has none (a book typed
 * in by hand has only its lessons). Without them those marks would fall back onto lessons. Returns the book as it
 * now is.
 */
async function ensureUnitsFor(preset: BlueprintPreset, book: SetupBookRow): Promise<SetupBookRow> {
  const sections = presetSections(preset, book.subject);
  const slots = sections.flatMap((s) => Array.from({ length: s.count }, () => ({ marks: s.marksEach, role: s.role })));
  const missing = missingUnitRoles(slots, book.chapters, book.subject);
  if (missing.length === 0) return book;
  const units = getLanguageNonChapterUnits(book.subject, book.className);
  let next = book.chapters.reduce((m, c) => Math.max(m, c.number), 0) + 1;
  const added = [];
  for (const role of missing) {
    const unit = units.find((u) => u.domain === DOMAIN_OF[role]);
    if (!unit) continue;
    added.push(await prisma.chapter.create({ data: { bookId: book.id, number: next++, title: unit.title }, select: { id: true, title: true, number: true } }));
  }
  return { ...book, chapters: [...book.chapters, ...added] };
}

export type SetupRowInput = {
  bookId: string;
  presetId: string;
  action?: "create" | "update" | "skip";
  /** The existing blueprint to update, when action is "update". */
  targetBlueprintId?: string;
};

export type UpdateImpact = {
  papers: number;
  finalised: number;
  /** Placed questions whose section the new pattern drops; they are saved to a paper snapshot and taken out. */
  archivedQuestions: number;
  /** Papers the change puts out of step: a question of a type its section no longer takes, or a section or chapter over its quota. */
  papersNeedingReview: number;
  revertToDraft: number;
  /** Why this blueprint cannot be updated by this user, if it cannot. */
  blocked?: string;
};

export type PlanRow = {
  bookId: string;
  className: string;
  subject: string;
  presetId: string;
  presetTitle: string;
  totalMarks: number;
  questions: number;
  durationMin: number;
  existing: Array<{ id: string; name: string; totalMarks: number; updatedAt: string; impact: UpdateImpact }>;
  error?: string;
};

export type ApplyRow = {
  bookId: string;
  className: string;
  subject: string;
  action: "created" | "updated" | "skipped" | "failed";
  blueprintId?: string;
  name?: string;
  update?: BlueprintUpdateResult;
  error?: string;
};

const sessionVariants = (s: string) => Array.from(new Set([s, s.replace(/[–—]/g, "-"), s.replace(/-/g, "–")]));

async function loadPresets(): Promise<BlueprintPreset[]> {
  const rows = await prisma.presetOverride.findMany({ where: { kind: "BLUEPRINT" }, orderBy: { createdAt: "asc" } });
  return effectivePresets("BLUEPRINT", rows);
}

async function loadBooks(ids: string[]) {
  return prisma.book.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, className: true, subject: true, chapters: { select: { id: true, title: true, number: true }, orderBy: { number: "asc" } } },
  });
}
type SetupBookRow = Awaited<ReturnType<typeof loadBooks>>[number];

/** The blueprint a pattern makes for a book; a board pattern also takes the board's official chapter marks. */
async function inputFor(preset: BlueprintPreset, book: SetupBookRow, exam: SetupExam): Promise<BlueprintInput> {
  const input = buildSetupInput(preset, book, exam) as BlueprintInput;
  if (!isSchoolPattern(preset)) {
    try {
      const official = await mapCurriculumTemplateToBlueprintInput(preset.templateCode || preset.id, book.id);
      const officialTotal = official.chapters.reduce((s, c) => s + c.marks, 0);
      if (officialTotal === presetTotals(preset).marks) {
        input.chapters = official.chapters.filter((c) => c.marks > 0);
        input.subjectCode = official.subjectCode || input.subjectCode;
        input.verificationStatus = official.verificationStatus;
        input.sourceRef = official.sourceRef;
        input.blueprintVersion = official.blueprintVersion;
      }
    } catch {
      // no official template for this preset (e.g. one the school added): keep the even question-by-question split
    }
  }
  return input;
}

async function existingFor(bookId: string, exam: SetupExam) {
  return prisma.blueprint.findMany({
    where: { bookId, examType: exam.examType, academicSession: { in: sessionVariants(exam.academicSession) }, NOT: { curriculumMode: WORKSHEET_MODE } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      sections: { select: { id: true, type: true, count: true, marksEach: true, title: true } },
      papers: { select: { id: true, status: true } },
    },
  });
}
type ExistingBlueprint = Awaited<ReturnType<typeof existingFor>>[number];

/** What updating `bp` to `input` would do to its papers, without changing anything. */
async function updateImpact(bp: ExistingBlueprint, input: BlueprintInput, user: SessionUser): Promise<UpdateImpact> {
  const finalised = bp.papers.filter((p) => p.status === "FINAL").length;
  const { sections, removedIds } = matchSectionIds(bp.sections, input.sections);
  const impact: UpdateImpact = { papers: bp.papers.length, finalised, archivedQuestions: 0, papersNeedingReview: 0, revertToDraft: 0 };
  if (finalised > 0 && !isAdmin(user)) impact.blocked = "A finalised paper uses it; only an administrator can change it.";
  if (bp.papers.length === 0) return impact;

  const removed = new Set(removedIds);
  const def = {
    sections: sections.map((s, i) => ({ ...s, id: s.id ?? `new-${i}` })),
    chapters: input.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks, unitKey: c.unitKey, unitTitle: c.unitTitle })),
  };
  const items = await prisma.paperQuestion.findMany({
    where: { paperId: { in: bp.papers.map((p) => p.id) } },
    select: { id: true, paperId: true, sectionId: true, question: { select: { chapterId: true, type: true, text: true } } },
  });
  for (const p of bp.papers) {
    const own = items.filter((i) => i.paperId === p.id);
    impact.archivedQuestions += own.filter((i) => removed.has(i.sectionId)).length;
    const kept = own.filter((i) => !removed.has(i.sectionId));
    const implications = diagnosePaperImplications(
      def,
      kept.map((i) => ({ id: i.id, sectionId: i.sectionId, chapterId: i.question.chapterId, type: i.question.type, text: i.question.text })),
    );
    // a slot or chapter still to fill is unfinished work, not something the change broke
    const problems = implications.filter((x) => x.code !== "SECTION_UNDERFILLED" && x.code !== "CHAPTER_DEFICIT");
    if (problems.length > 0 || own.length !== kept.length) impact.papersNeedingReview++;
    if (p.status === "FINAL" && implications.length > 0) impact.revertToDraft++;
  }
  return impact;
}

const totalOf = (sections: Array<{ count: number; marksEach: number }>) => sections.reduce((s, x) => s + x.count * x.marksEach, 0);

export async function planSetup(exam: SetupExam, rows: SetupRowInput[], user: SessionUser): Promise<PlanRow[]> {
  const [presets, books] = await Promise.all([loadPresets(), loadBooks(rows.map((r) => r.bookId))]);
  const out: PlanRow[] = [];
  for (const r of rows) {
    const book = books.find((b) => b.id === r.bookId);
    const preset = presets.find((p) => p.id === r.presetId);
    const base = {
      bookId: r.bookId,
      className: book?.className ?? "",
      subject: book?.subject ?? "",
      presetId: r.presetId,
      presetTitle: preset?.title ?? "",
      totalMarks: preset ? presetTotals(preset).marks : 0,
      questions: preset ? presetTotals(preset).questions : 0,
      durationMin: exam.durationMin || preset?.durationMin || 0,
      existing: [] as PlanRow["existing"],
    };
    if (!book) { out.push({ ...base, error: "This book no longer exists." }); continue; }
    if (!preset) { out.push({ ...base, error: "This pattern is no longer offered." }); continue; }
    if (!canManageScope(user, book)) { out.push({ ...base, error: `You do not look after ${book.className} ${book.subject}.` }); continue; }
    if (book.chapters.length === 0) { out.push({ ...base, error: "This book has no chapters yet; add its syllabus first." }); continue; }
    const input = await inputFor(preset, book, exam);
    const errors = validateBlueprint(input as never);
    if (errors.length > 0) { out.push({ ...base, error: errors.join(" ") }); continue; }
    const existing = await existingFor(book.id, exam);
    for (const bp of existing) {
      base.existing.push({
        id: bp.id,
        name: bp.name,
        totalMarks: totalOf(bp.sections),
        updatedAt: bp.updatedAt.toISOString(),
        impact: await updateImpact(bp, input, user),
      });
    }
    out.push(base);
  }
  return out;
}

export async function applySetup(exam: SetupExam, rows: SetupRowInput[], user: SessionUser): Promise<ApplyRow[]> {
  const [presets, books] = await Promise.all([loadPresets(), loadBooks(rows.map((r) => r.bookId))]);
  const out: ApplyRow[] = [];
  for (const r of rows) {
    const book = books.find((b) => b.id === r.bookId);
    const head = { bookId: r.bookId, className: book?.className ?? "", subject: book?.subject ?? "" };
    if (r.action === "skip") { out.push({ ...head, action: "skipped" }); continue; }
    const preset = presets.find((p) => p.id === r.presetId);
    try {
      if (!book) throw new Error("This book no longer exists.");
      if (!preset) throw new Error("This pattern is no longer offered.");
      if (!canManageScope(user, book)) throw new Error(`You do not look after ${book.className} ${book.subject}.`);
      const input = await inputFor(preset, await ensureUnitsFor(preset, book), exam);
      const errors = validateBlueprint(input as never);
      if (errors.length > 0) throw new Error(errors.join(" "));

      if (r.action === "update") {
        const target = (await existingFor(book.id, exam)).find((b) => b.id === r.targetBlueprintId);
        if (!target) throw new Error("The blueprint to update was not found for this exam.");
        if (target.papers.some((p) => p.status === "FINAL") && !isAdmin(user)) {
          throw new Error("A finalised paper uses it; only an administrator can change it.");
        }
        // the teacher's name for it stays; its sections line up with the new pattern so placed questions stay put
        const { sections } = matchSectionIds(target.sections, input.sections);
        const update = await updateBlueprintWithPapers(target.id, { ...input, name: target.name, sections }, user);
        out.push({ ...head, action: "updated", blueprintId: target.id, name: target.name, update });
      } else {
        const id = await createBlueprint(input);
        out.push({ ...head, action: "created", blueprintId: id, name: input.name });
      }
    } catch (e) {
      out.push({ ...head, action: "failed", error: (e as Error).message });
    }
  }
  await recordAudit(user, "API_CHANGE", "BLUEPRINT", null, {
    title: `Set up ${exam.examType} blueprints for ${exam.academicSession}`,
    created: out.filter((o) => o.action === "created").length,
    updated: out.filter((o) => o.action === "updated").length,
    skipped: out.filter((o) => o.action === "skipped").length,
    failed: out.filter((o) => o.action === "failed").length,
  });
  return out;
}
