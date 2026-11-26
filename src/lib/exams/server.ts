import "server-only";
import type { Prisma } from "@prisma/client";
import { HttpError, type SessionUser } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { DEFAULT_SCHOOL_NAME, resolvePaperExamType } from "@/lib/constants";
import { createPaperFromBlueprint } from "@/lib/paperCreate";
import { prisma } from "@/lib/prisma";
import { paperCreateSchema } from "@/lib/schemas";
import { STANDARD_CURRICULUM_PRESETS } from "@/lib/curriculumPresets";
import { isSubjectMatching } from "@/lib/schoolCurriculum";
import { importIntoSubjectBook } from "@/lib/subjectBooks";
import { formatDMY, todayIST } from "./dates";
import { checkAddClass, checkAddDate, checkCellSubjects, checkMoveDate, copyLayout } from "./grid";
import { paperCandidateWhere, pickPaper } from "./paperMatch";
import { examSummary, slotStatus, slotWarnings } from "./status";
import { cellDuration, paperSyncFields } from "./sync";
import type { BlockView, ExamListItem, ExamStatus, ExamView, SignatureMode, SlotView } from "./types";

const parseList = (json: string): string[] => {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const examInclude = {
  blocks: { orderBy: { position: "asc" as const } },
  slots: {
    orderBy: [{ examDate: "asc" as const }, { className: "asc" as const }, { id: "asc" as const }],
    include: { paper: { select: { id: true, title: true, status: true, updatedAt: true } } },
  },
};

/** class|subject keys that have a blueprint of this exam's type and session. */
async function blueprintKeys(examType: string, academicSession: string, slots: { className: string; subject: string }[]) {
  if (slots.length === 0) return new Set<string>();
  const rows = await prisma.blueprint.findMany({
    where: {
      examType,
      academicSession,
      book: { OR: slots.map((s) => ({ className: s.className, subject: s.subject })) },
    },
    select: { book: { select: { className: true, subject: true } } },
  });
  return new Set(rows.map((r) => `${r.book.className}|${r.book.subject}`));
}

export async function loadExamView(id: string): Promise<ExamView> {
  const exam = await prisma.exam.findUnique({ where: { id }, include: examInclude });
  if (!exam) throw new HttpError(404, "Exam not found");
  const keys = await blueprintKeys(exam.examType, exam.academicSession, exam.slots);
  const printerIds = [...new Set(exam.slots.map((s) => s.printedById).filter((x): x is string => !!x))];
  const printers = printerIds.length
    ? new Map((await prisma.user.findMany({ where: { id: { in: printerIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]))
    : new Map<string, string>();

  const blocks: BlockView[] = exam.blocks.map((b) => ({
    id: b.id,
    title: b.title,
    position: b.position,
    timeText: b.timeText,
    dates: parseList(b.datesJson),
    classes: parseList(b.classesJson),
  }));
  const slots: SlotView[] = exam.slots.map((s) => {
    const paper = s.paper
      ? { id: s.paper.id, title: s.paper.title, status: s.paper.status === "FINAL" ? ("FINAL" as const) : ("DRAFT" as const), updatedAt: s.paper.updatedAt.toISOString() }
      : null;
    const base = {
      id: s.id,
      blockId: s.blockId,
      className: s.className,
      subject: s.subject,
      examDate: s.examDate,
      paper,
      hasBlueprint: keys.has(`${s.className}|${s.subject}`),
      printedAt: s.printedAt?.toISOString() ?? null,
      printedByName: s.printedById ? (printers.get(s.printedById) ?? null) : null,
      printedPaperAt: s.printedPaperAt?.toISOString() ?? null,
      dateChangedAfterPrint: s.dateChangedAfterPrint,
    };
    return { ...base, status: slotStatus(base), warnings: slotWarnings(base) };
  });
  return {
    id: exam.id,
    name: exam.name,
    examType: exam.examType,
    academicSession: exam.academicSession,
    status: exam.status as ExamStatus,
    signatureMode: exam.signatureMode as SignatureMode,
    showInstructions: exam.showInstructions,
    instructions: exam.instructions,
    blocks,
    slots,
  };
}

/** Upcoming and ongoing exams first (nearest first), then finished ones (latest first). */
export async function listExams(): Promise<ExamListItem[]> {
  const ids = await prisma.exam.findMany({ select: { id: true } });
  const today = todayIST();
  const items = await Promise.all(
    ids.map(async ({ id }) => {
      const v = await loadExamView(id);
      return { id: v.id, name: v.name, examType: v.examType, academicSession: v.academicSession, status: v.status, summary: examSummary(v.slots, today) };
    }),
  );
  const upcoming = items.filter((e) => !e.summary.isPast).sort((a, b) => (a.summary.firstDate ?? "9999").localeCompare(b.summary.firstDate ?? "9999"));
  const past = items.filter((e) => e.summary.isPast).sort((a, b) => (b.summary.lastDate ?? "").localeCompare(a.summary.lastDate ?? ""));
  return [...upcoming, ...past];
}

export async function createExam(input: { name: string; examType: string; academicSession: string }, user: SessionUser) {
  const exam = await prisma.exam.create({ data: { ...input, createdById: user.id } });
  await recordAudit(user, "EXAM_CREATE", "EXAM", exam.id, input);
  return loadExamView(exam.id);
}

export async function updateExam(
  id: string,
  input: Partial<{ name: string; examType: string; academicSession: string; status: ExamStatus; signatureMode: SignatureMode; showInstructions: boolean; instructions: string }>,
  user: SessionUser,
) {
  await prisma.exam.update({ where: { id }, data: input });
  if (input.examType !== undefined || input.academicSession !== undefined) {
    const linked = await prisma.examSlot.findMany({ where: { examId: id, paperId: { not: null } }, select: { id: true } });
    for (const s of linked) await syncLinkedPaper(s.id, user, id);
  }
  await recordAudit(user, "EXAM_UPDATE", "EXAM", id, input);
  if (input.examType !== undefined || input.academicSession !== undefined) await linkFreePapers(id, user);
  return loadExamView(id);
}

export async function deleteExam(id: string, user: SessionUser) {
  const released = await linkedPaperIds({ examId: id });
  const exam = await prisma.exam.delete({ where: { id } });
  await releasePapers(released);
  await recordAudit(user, "EXAM_DELETE", "EXAM", id, { name: exam.name });
  return { ok: true };
}

export async function copyExam(id: string, user: SessionUser): Promise<{ id: string }> {
  const source = await loadExamView(id);
  const layout = copyLayout(source);
  const copy = await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({
      data: { name: `${source.name} (copy)`, examType: source.examType, academicSession: source.academicSession, signatureMode: source.signatureMode, showInstructions: source.showInstructions, instructions: source.instructions, createdById: user.id },
    });
    const blockIds: string[] = [];
    for (const b of layout.blocks) {
      const row = await tx.examBlock.create({
        data: { examId: exam.id, title: b.title, position: b.position, timeText: b.timeText, datesJson: JSON.stringify(b.dates), classesJson: JSON.stringify(b.classes) },
      });
      blockIds.push(row.id);
    }
    if (layout.slots.length) {
      await tx.examSlot.createMany({
        data: layout.slots.map((s) => ({ examId: exam.id, blockId: blockIds[s.blockIndex], className: s.className, subject: s.subject, examDate: s.examDate })),
      });
    }
    return exam;
  });
  await recordAudit(user, "EXAM_CREATE", "EXAM", copy.id, { copiedFrom: id, name: copy.name });
  return { id: copy.id };
}

async function blockOf(examId: string, blockId: string) {
  const exam = await loadExamView(examId);
  const block = exam.blocks.find((b) => b.id === blockId);
  if (!block) throw new HttpError(404, "Block not found");
  return { exam, block };
}

export async function addBlock(examId: string, input: { title: string; timeText: string }, user: SessionUser) {
  const exam = await loadExamView(examId);
  const last = exam.blocks.reduce((m, b) => Math.max(m, b.position), -1);
  await prisma.examBlock.create({ data: { examId, title: input.title, timeText: input.timeText, position: last + 1 } });
  await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { addBlock: input.title });
  return loadExamView(examId);
}

export async function deleteBlock(examId: string, blockId: string, user: SessionUser) {
  const { exam, block } = await blockOf(examId, blockId);
  const rest = exam.blocks.filter((b) => b.id !== blockId);
  const released = await linkedPaperIds({ blockId });
  await prisma.$transaction([
    prisma.examBlock.delete({ where: { id: blockId } }),
    ...rest.map((b, i) => prisma.examBlock.update({ where: { id: b.id }, data: { position: i } })),
  ]);
  await releasePapers(released);
  await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { deleteBlock: block.title });
  await linkFreePapers(examId, user);
  return loadExamView(examId);
}

export type BlockPatch =
  | { title: string }
  | { timeText: string }
  | { position: number }
  | { addDate: string }
  | { removeDate: string }
  | { moveDate: { from: string; to: string } }
  | { addClass: string }
  | { removeClass: string };

export async function patchBlock(examId: string, blockId: string, patch: BlockPatch, user: SessionUser) {
  const { exam, block } = await blockOf(examId, blockId);
  const fail = (msg: string | null) => {
    if (msg) throw new HttpError(400, msg);
  };
  const saveDates = (dates: string[]) => ({ datesJson: JSON.stringify([...dates].sort()) });
  const saveClasses = (classes: string[]) => ({ classesJson: JSON.stringify(classes) });

  if ("title" in patch) await prisma.examBlock.update({ where: { id: blockId }, data: { title: patch.title } });
  else if ("timeText" in patch) {
    await prisma.examBlock.update({ where: { id: blockId }, data: { timeText: patch.timeText } });
    const linked = await prisma.examSlot.findMany({ where: { blockId, paperId: { not: null } }, select: { id: true } });
    for (const s of linked) await syncLinkedPaper(s.id, user, examId);
  }
  else if ("position" in patch) {
    const order = exam.blocks.filter((b) => b.id !== blockId);
    order.splice(Math.min(patch.position, order.length), 0, block);
    await prisma.$transaction(order.map((b, i) => prisma.examBlock.update({ where: { id: b.id }, data: { position: i } })));
  } else if ("addDate" in patch) {
    fail(checkAddDate(block, patch.addDate));
    await prisma.examBlock.update({ where: { id: blockId }, data: saveDates([...block.dates, patch.addDate]) });
  } else if ("removeDate" in patch) {
    const released = await linkedPaperIds({ blockId, examDate: patch.removeDate });
    await prisma.$transaction([
      prisma.examSlot.deleteMany({ where: { blockId, examDate: patch.removeDate } }),
      prisma.examBlock.update({ where: { id: blockId }, data: saveDates(block.dates.filter((d) => d !== patch.removeDate)) }),
    ]);
    await releasePapers(released);
  } else if ("moveDate" in patch) {
    const { from, to } = patch.moveDate;
    fail(checkMoveDate(block, from, to));
    if (from !== to) {
      await prisma.$transaction([
        prisma.examSlot.updateMany({ where: { blockId, examDate: from, printedAt: { not: null } }, data: { dateChangedAfterPrint: true } }),
        prisma.examSlot.updateMany({ where: { blockId, examDate: from }, data: { examDate: to } }),
        prisma.examBlock.update({ where: { id: blockId }, data: saveDates(block.dates.map((d) => (d === from ? to : d))) }),
      ]);
      await syncMovedPapers(examId, blockId, to, user);
    }
  } else if ("addClass" in patch) {
    fail(checkAddClass(exam.blocks, blockId, patch.addClass));
    if (!block.classes.includes(patch.addClass)) {
      await prisma.examBlock.update({ where: { id: blockId }, data: saveClasses([...block.classes, patch.addClass]) });
    }
  } else if ("removeClass" in patch) {
    const released = await linkedPaperIds({ blockId, className: patch.removeClass });
    await prisma.$transaction([
      prisma.examSlot.deleteMany({ where: { blockId, className: patch.removeClass } }),
      prisma.examBlock.update({ where: { id: blockId }, data: saveClasses(block.classes.filter((c) => c !== patch.removeClass)) }),
    ]);
    await releasePapers(released);
  }
  await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { block: block.title, ...patch });
  if ("removeDate" in patch || "removeClass" in patch) await linkFreePapers(examId, user);
  return loadExamView(examId);
}

/** Linked papers follow a moved date column, Final ones included (the date sheet is the authority on dates). */
async function syncMovedPapers(examId: string, blockId: string, date: string, user: SessionUser): Promise<void> {
  const slots = await prisma.examSlot.findMany({ where: { blockId, examDate: date, paperId: { not: null } }, select: { id: true } });
  for (const s of slots) await syncLinkedPaper(s.id, user, examId);
}

type Candidate = { id: string; title: string; paperSet: string };

async function candidatesFor(exam: { examType: string; academicSession: string }, slot: { className: string; subject: string }): Promise<Candidate[]> {
  const papers = await prisma.paper.findMany({
    // a paper already on a date sheet stays there: one paper, one exam day
    where: { ...paperCandidateWhere(slot, exam), examSlots: { none: {} } },
    select: { id: true, title: true, paperSet: true, examType: true, blueprint: { select: { examType: true } } },
    orderBy: { updatedAt: "desc" },
  });
  // a paper set to this exam's type counts even when its blueprint was made for another one
  return papers
    .filter((p) => p.examType === exam.examType || resolvePaperExamType(p) === exam.examType)
    .map((p) => ({ id: p.id, title: p.title, paperSet: p.paperSet }));
}

/**
 * Links every empty slot of the exam that has exactly one free matching paper. Linking used to happen only when a
 * subject was first placed, so a paper freed by a later edit (a repeated subject or a wrong date removed), made after
 * the slot, or matching only after the exam's type or session changed stayed unlinked.
 */
export async function linkFreePapers(examId: string, user: SessionUser): Promise<number> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { slots: { where: { paperId: null }, orderBy: [{ examDate: "asc" }, { id: "asc" }] } },
  });
  if (!exam || !exam.slots.length) return 0;
  let linked = 0;
  const tried = new Set<string>();
  for (const slot of exam.slots) {
    // one paper fills one slot, so a class-subject that appears twice links only its first slot
    const key = `${slot.className}|${slot.subject}`;
    if (tried.has(key)) continue;
    tried.add(key);
    const pick = pickPaper(await candidatesFor(exam, slot));
    if (!pick.paperId) continue;
    try {
      const claimed = await prisma.examSlot.updateMany({ where: { id: slot.id, paperId: null }, data: { paperId: pick.paperId } });
      if (!claimed.count) continue;
    } catch (e) {
      // linked elsewhere a moment ago
      if (isUniqueViolation(e)) continue;
      throw e;
    }
    await syncLinkedPaper(slot.id, user, examId);
    linked++;
  }
  if (linked) await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { autoLinkedPapers: linked });
  return linked;
}

/**
 * Sets one cell of the date sheet (a class on a date) to these subjects: none, one, or two papers sharing the day
 * (GK and Drawing). A subject already in the cell keeps its slot, linked paper and printed mark; a new one is
 * added and auto-linked; a dropped one is removed.
 */
export async function setCell(
  examId: string,
  input: { blockId: string; className: string; date: string; subjects: string[] },
  user: SessionUser,
): Promise<{ exam: ExamView; ambiguousCandidates?: Candidate[] }> {
  const { exam, block } = await blockOf(examId, input.blockId);
  if (!block.dates.includes(input.date)) throw new HttpError(400, "That date is not in this block");
  if (!block.classes.includes(input.className)) throw new HttpError(400, "That class is not in this block");
  const cell = { blockId: input.blockId, className: input.className, examDate: input.date };
  const existing = await prisma.examSlot.findMany({ where: cell });
  const dropped = existing.filter((s) => !input.subjects.includes(s.subject));
  const added = input.subjects.filter((sub) => !existing.some((s) => s.subject === sub));
  // the whole cell: at most two papers, none repeated; "already on another date" only for subjects being added,
  // so an older exam that already repeats a subject can still be edited
  const refusal =
    checkCellSubjects([], input.className, input.date, input.subjects) ?? checkCellSubjects(exam.slots, input.className, input.date, added);
  if (refusal) throw new HttpError(400, refusal);
  if (dropped.length) {
    await prisma.examSlot.deleteMany({ where: { id: { in: dropped.map((s) => s.id) } } });
    await releasePapers(dropped.map((s) => s.paperId));
  }

  let ambiguousCandidates: Candidate[] | undefined;
  for (const subject of added) {
    const candidates = await candidatesFor(exam, { className: input.className, subject });
    const pick = pickPaper(candidates);
    const create = (paperId: string | null) => prisma.examSlot.create({ data: { examId, ...cell, subject, paperId } });
    // the auto-picked paper may have been linked elsewhere a moment ago: then start without a paper
    await create(pick.paperId).catch((e) => (isUniqueViolation(e) ? create(null) : Promise.reject(e)));
    if (pick.ambiguous) ambiguousCandidates = candidates;
  }
  await dedupeCell(cell);
  // the papers' time depends on how many share the day, so every paper in the cell is brought up to date
  await syncCell(examId, cell, user);
  if (dropped.length || added.length) {
    await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { cell: `${input.className} ${input.date}`, subjects: input.subjects });
  }
  // a paper this edit freed can now fill another slot
  if (dropped.length) await linkFreePapers(examId, user);
  return { exam: await loadExamView(examId), ...(ambiguousCandidates ? { ambiguousCandidates } : {}) };
}

/**
 * One slot per subject in a cell. Two edits of the same cell at once can both add a subject (the database keeps no
 * unique rule here, so deploys never need a data-loss prompt); the extra slots go, keeping the one with a paper or
 * printed mark, else the oldest.
 */
async function dedupeCell(cell: { blockId: string; className: string; examDate: string }) {
  const slots = await prisma.examSlot.findMany({ where: cell, orderBy: { id: "asc" } });
  const keep = new Map<string, (typeof slots)[number]>();
  const extra: typeof slots = [];
  for (const s of slots) {
    const kept = keep.get(s.subject);
    if (!kept) keep.set(s.subject, s);
    else if (!kept.paperId && !kept.printedAt && (s.paperId || s.printedAt)) {
      extra.push(kept);
      keep.set(s.subject, s);
    } else extra.push(s);
  }
  if (!extra.length) return;
  await prisma.examSlot.deleteMany({ where: { id: { in: extra.map((s) => s.id) } } });
  await releasePapers(extra.map((s) => s.paperId));
}

/** Brings every linked paper of one cell up to date (date, type, session, and time from the date sheet). */
async function syncCell(examId: string, cell: { blockId: string; className: string; examDate: string }, user: SessionUser) {
  const slots = await prisma.examSlot.findMany({ where: { ...cell, paperId: { not: null } }, select: { id: true } });
  for (const s of slots) await syncLinkedPaper(s.id, user, examId);
}

/**
 * A linked paper takes the exam's date, type and session, and the block's time when it is the day's only paper
 * (otherwise its blueprint's own time). This deliberately writes past the Final lock: the printed header must match
 * the date sheet, and a printed slot is flagged for a reprint when its date moves.
 */
async function syncLinkedPaper(slotId: string, user: SessionUser, examId?: string): Promise<void> {
  const slot = await prisma.examSlot.findUnique({
    where: { id: slotId },
    include: { exam: { select: { id: true, examType: true, academicSession: true } }, block: { select: { timeText: true } } },
  });
  if (!slot?.paperId) return;
  const sharing = await prisma.examSlot.count({ where: { blockId: slot.blockId, className: slot.className, examDate: slot.examDate } });
  const fields = paperSyncFields(slot.exam, slot.examDate, cellDuration(slot.block.timeText, sharing));
  const paper = await prisma.paper.findUnique({
    where: { id: slot.paperId },
    select: { examDate: true, examType: true, academicSession: true, durationMin: true, updatedAt: true },
  });
  if (
    !paper ||
    (paper.examDate === fields.examDate &&
      paper.examType === fields.examType &&
      paper.academicSession === fields.academicSession &&
      paper.durationMin === fields.durationMin)
  ) {
    return;
  }
  // keep updatedAt as it was, so a date-sheet sync never reads as "paper changed after printing"
  await prisma.paper.update({ where: { id: slot.paperId }, data: { ...fields, updatedAt: paper.updatedAt } });
  await recordAudit(user, "PAPER_UPDATE", "PAPER", slot.paperId, { reason: "exam date sheet", examId: examId ?? slot.exam.id, ...fields });
}

async function slotIn(examId: string, slotId: string) {
  const slot = await prisma.examSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.examId !== examId) throw new HttpError(404, "Paper slot not found");
  return slot;
}

export async function setSlotPaper(examId: string, slotId: string, paperId: string | null, user: SessionUser) {
  const before = await slotIn(examId, slotId);
  if (paperId) {
    if (!(await prisma.paper.findUnique({ where: { id: paperId }, select: { id: true } }))) throw new HttpError(400, "Paper not found");
    const other = await prisma.examSlot.findFirst({ where: { paperId, NOT: { id: slotId } }, include: { exam: { select: { name: true } } } });
    if (other) throw new HttpError(400, `That paper is already on ${other.exam.name} (${other.className}, ${formatDMY(other.examDate)})`);
  }
  try {
    await prisma.examSlot.update({ where: { id: slotId }, data: { paperId } });
  } catch (e) {
    // another tab linked the same paper a moment ago: the database keeps one paper on one slot
    if (isUniqueViolation(e)) throw new HttpError(400, "That paper was just linked to another exam day. Reload to see where.");
    throw e;
  }
  if (before.paperId && before.paperId !== paperId) await releasePapers([before.paperId]);
  if (paperId) await syncLinkedPaper(slotId, user);
  await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { slotId, paperId });
  return loadExamView(examId);
}

export async function setSlotPrinted(examId: string, slotId: string, printed: boolean, user: SessionUser) {
  const slot = await slotIn(examId, slotId);
  const paper = slot.paperId ? await prisma.paper.findUnique({ where: { id: slot.paperId }, select: { updatedAt: true } }) : null;
  await prisma.examSlot.update({
    where: { id: slotId },
    data: printed
      ? { printedAt: new Date(), printedById: user.id, printedPaperAt: paper?.updatedAt ?? null, dateChangedAfterPrint: false }
      : { printedAt: null, printedById: null, printedPaperAt: null, dateChangedAfterPrint: false },
  });
  await recordAudit(user, printed ? "EXAM_SLOT_PRINTED" : "EXAM_SLOT_UNPRINTED", "EXAM", examId, {
    slotId,
    className: slot.className,
    subject: slot.subject,
    examDate: slot.examDate,
  });
  return loadExamView(examId);
}

/** Slots this paper fills that are not printed yet and whose exam day is today or later. */
export async function pendingPrintSlotsForPaper(paperId: string, today: string) {
  const slots = await prisma.examSlot.findMany({
    where: { paperId, printedAt: null, examDate: { gte: today } },
    include: { exam: { select: { id: true, name: true } } },
    orderBy: { examDate: "asc" },
  });
  return slots.map((s) => ({ slotId: s.id, examId: s.exam.id, examName: s.exam.name, className: s.className, examDate: s.examDate }));
}

export async function getSignature(): Promise<{ fileName: string | null }> {
  const row = await prisma.schoolSetting.findUnique({ where: { key: "principalSignature" } });
  return { fileName: row?.value || null };
}

export async function setSignature(fileName: string | null, user: SessionUser) {
  if (fileName) {
    await prisma.schoolSetting.upsert({ where: { key: "principalSignature" }, create: { key: "principalSignature", value: fileName }, update: { value: fileName } });
  } else {
    await prisma.schoolSetting.deleteMany({ where: { key: "principalSignature" } });
  }
  await recordAudit(user, "EXAM_UPDATE", "SYSTEM", null, { principalSignature: fileName ? "uploaded" : "removed" });
  return { fileName };
}

/** Papers leaving the date sheet go back to their blueprint's time (their date and type are left as they are). */
async function releasePapers(paperIds: (string | null)[]): Promise<void> {
  const ids = paperIds.filter((x): x is string => !!x);
  if (!ids.length) return;
  const papers = await prisma.paper.findMany({ where: { id: { in: ids }, durationMin: { not: null } }, select: { id: true, updatedAt: true } });
  for (const p of papers) await prisma.paper.update({ where: { id: p.id }, data: { durationMin: null, updatedAt: p.updatedAt } });
}

/** Linked papers of the slots matching `where`, read before those slots are deleted. */
async function linkedPaperIds(where: Prisma.ExamSlotWhereInput): Promise<string[]> {
  const rows = await prisma.examSlot.findMany({ where: { ...where, paperId: { not: null } }, select: { paperId: true } });
  return rows.map((r) => r.paperId!);
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

type SetupRow = { bookId: string; className: string; subject: string };

/** The book of each scheduled class-subject in this session, and whether it has a blueprint for this exam. */
async function setupRows(exam: { examType: string; academicSession: string }, slots: { className: string; subject: string }[]) {
  const pairs = [...new Map(slots.map((s) => [`${s.className}|${s.subject}`, { className: s.className, subject: s.subject }])).values()];
  if (!pairs.length) return [];
  const books = await prisma.book.findMany({
    where: { academicSession: exam.academicSession, OR: pairs.map((p) => ({ className: p.className, subject: p.subject })) },
    select: {
      id: true,
      className: true,
      subject: true,
      blueprints: { where: { examType: exam.examType, academicSession: exam.academicSession }, select: { id: true }, orderBy: { updatedAt: "desc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return pairs.map((p) => {
    const matching = books.filter((b) => b.className === p.className && b.subject === p.subject);
    const withBlueprint = matching.find((b) => b.blueprints.length);
    return { ...p, book: withBlueprint ?? matching[0] ?? null, blueprintId: withBlueprint?.blueprints[0]?.id ?? null };
  });
}

export type ExamSetup = {
  missingBlueprints: SetupRow[];
  /** `presetAvailable`: a built-in syllabus (e.g. the GK and Drawing topic lists) can create the book in one click. */
  noBook: { className: string; subject: string; presetAvailable: boolean }[];
};

/** The built-in syllabus for a class and subject, if there is one. */
function syllabusPresetFor(className: string, subject: string) {
  return STANDARD_CURRICULUM_PRESETS.find((p) => p.className === className && isSubjectMatching(p.subject, subject)) ?? null;
}

export async function examSetup(examId: string): Promise<ExamSetup> {
  const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { slots: { orderBy: [{ examDate: "asc" }, { id: "asc" }] } } });
  if (!exam) throw new HttpError(404, "Exam not found");
  const rows = await setupRows(exam, exam.slots);
  return {
    missingBlueprints: rows.filter((r) => r.book && !r.blueprintId).map((r) => ({ bookId: r.book!.id, className: r.className, subject: r.subject })),
    noBook: rows
      .filter((r) => !r.book)
      .map((r) => ({ className: r.className, subject: r.subject, presetAvailable: !!syllabusPresetFor(r.className, r.subject) })),
  };
}

/** Creates the missing books that have a built-in syllabus (GK and Drawing topic lists, the school's textbooks). */
export async function addBooksFromPresets(examId: string, user: SessionUser): Promise<{ added: string[]; setup: ExamSetup }> {
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { academicSession: true } });
  if (!exam) throw new HttpError(404, "Exam not found");
  const { noBook } = await examSetup(examId);
  const added: string[] = [];
  for (const row of noBook) {
    const preset = syllabusPresetFor(row.className, row.subject);
    if (!preset) continue;
    const result = await prisma.$transaction((tx) =>
      importIntoSubjectBook(tx, {
        className: row.className,
        subject: row.subject,
        session: exam.academicSession,
        parts: [{ title: preset.title, chapters: preset.chapters }],
      }),
    );
    await recordAudit(user, "BOOK_IMPORT", "BOOK", result.bookId ?? null, { action: "SYLLABUS_IMPORTED", preset: preset.id, fromExam: examId });
    added.push(`${row.className} ${row.subject}`);
  }
  return { added, setup: await examSetup(examId) };
}

/** Draft papers for scheduled slots that have a blueprint but no paper; each is dated from the date sheet and linked. */
export async function createMissingDrafts(examId: string, user: SessionUser, onlySlotId?: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { slots: { where: { paperId: null, ...(onlySlotId ? { id: onlySlotId } : {}) }, orderBy: [{ examDate: "asc" }] } },
  });
  if (!exam) throw new HttpError(404, "Exam not found");
  const rows = await setupRows(exam, exam.slots);
  const byPair = new Map(rows.map((r) => [`${r.className}|${r.subject}`, r]));
  let created = 0;
  const skipped: { slotId: string; reason: string }[] = [];
  for (const slot of exam.slots) {
    const row = byPair.get(`${slot.className}|${slot.subject}`);
    if (!row?.book) {
      skipped.push({ slotId: slot.id, reason: `No book for ${slot.className} ${slot.subject} in ${exam.academicSession}` });
      continue;
    }
    if (!row.blueprintId) {
      skipped.push({ slotId: slot.id, reason: `No blueprint for ${slot.className} ${slot.subject}` });
      continue;
    }
    const recent = await prisma.paper.findFirst({ where: { blueprint: { bookId: row.book.id } }, orderBy: { updatedAt: "desc" }, select: { layout: true } });
    const input = paperCreateSchema.parse({
      title: `${exam.name} — ${slot.subject} (${slot.className})`,
      blueprintId: row.blueprintId,
      layout: recent?.layout ?? "PAGE",
      schoolName: DEFAULT_SCHOOL_NAME,
      ...paperSyncFields(exam, slot.examDate),
    });
    const paper = await createPaperFromBlueprint(input, user.id, user);
    // link only if the slot is still empty: a second click (or tab) that got there first keeps its paper
    const claimed = await prisma.examSlot.updateMany({ where: { id: slot.id, paperId: null }, data: { paperId: paper.id } });
    if (claimed.count === 0) {
      await prisma.paper.delete({ where: { id: paper.id } }).catch((e) => console.error("Could not remove a duplicate draft", paper.id, e));
      continue;
    }
    await syncLinkedPaper(slot.id, user, examId);
    created++;
  }
  await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { createdDrafts: created, skipped: skipped.length });
  return { created, skipped, exam: await loadExamView(examId) };
}
