import "server-only";
import { HttpError, type SessionUser } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { todayIST } from "./dates";
import { checkAddClass, checkAddDate, checkMoveDate, copyLayout } from "./grid";
import { filterByExamType, paperCandidateWhere, pickPaper } from "./paperMatch";
import { examSummary, slotStatus, slotWarnings } from "./status";
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
    orderBy: [{ examDate: "asc" as const }, { className: "asc" as const }],
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
  input: Partial<{ name: string; examType: string; academicSession: string; status: ExamStatus; signatureMode: SignatureMode }>,
  user: SessionUser,
) {
  await prisma.exam.update({ where: { id }, data: input });
  await recordAudit(user, "EXAM_UPDATE", "EXAM", id, input);
  return loadExamView(id);
}

export async function deleteExam(id: string, user: SessionUser) {
  const exam = await prisma.exam.delete({ where: { id } });
  await recordAudit(user, "EXAM_DELETE", "EXAM", id, { name: exam.name });
  return { ok: true };
}

export async function copyExam(id: string, user: SessionUser): Promise<{ id: string }> {
  const source = await loadExamView(id);
  const layout = copyLayout(source);
  const copy = await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({
      data: { name: `${source.name} (copy)`, examType: source.examType, academicSession: source.academicSession, signatureMode: source.signatureMode, createdById: user.id },
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
  await prisma.examBlock.create({ data: { examId, title: input.title, timeText: input.timeText, position: exam.blocks.length } });
  await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { addBlock: input.title });
  return loadExamView(examId);
}

export async function deleteBlock(examId: string, blockId: string, user: SessionUser) {
  const { block } = await blockOf(examId, blockId);
  await prisma.examBlock.delete({ where: { id: blockId } });
  await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { deleteBlock: block.title });
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
  else if ("timeText" in patch) await prisma.examBlock.update({ where: { id: blockId }, data: { timeText: patch.timeText } });
  else if ("position" in patch) {
    const order = exam.blocks.filter((b) => b.id !== blockId);
    order.splice(Math.min(patch.position, order.length), 0, block);
    await prisma.$transaction(order.map((b, i) => prisma.examBlock.update({ where: { id: b.id }, data: { position: i } })));
  } else if ("addDate" in patch) {
    fail(checkAddDate(block, patch.addDate));
    await prisma.examBlock.update({ where: { id: blockId }, data: saveDates([...block.dates, patch.addDate]) });
  } else if ("removeDate" in patch) {
    await prisma.$transaction([
      prisma.examSlot.deleteMany({ where: { blockId, examDate: patch.removeDate } }),
      prisma.examBlock.update({ where: { id: blockId }, data: saveDates(block.dates.filter((d) => d !== patch.removeDate)) }),
    ]);
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
    await prisma.$transaction([
      prisma.examSlot.deleteMany({ where: { blockId, className: patch.removeClass } }),
      prisma.examBlock.update({ where: { id: blockId }, data: saveClasses(block.classes.filter((c) => c !== patch.removeClass)) }),
    ]);
  }
  await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { block: block.title, ...patch });
  return loadExamView(examId);
}

/** Phase 2 hook: linked papers follow a moved date. */
async function syncMovedPapers(_examId: string, _blockId: string, _date: string, _user: SessionUser): Promise<void> {}

type Candidate = { id: string; title: string; paperSet: string };

async function candidatesFor(exam: { examType: string; academicSession: string }, slot: { className: string; subject: string }): Promise<Candidate[]> {
  const papers = await prisma.paper.findMany({
    where: paperCandidateWhere(slot, exam),
    select: { id: true, title: true, paperSet: true, examType: true, blueprint: { select: { examType: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return filterByExamType(papers, exam.examType).map((p) => ({ id: p.id, title: p.title, paperSet: p.paperSet }));
}

export async function setCell(
  examId: string,
  input: { blockId: string; className: string; date: string; subject: string | null },
  user: SessionUser,
): Promise<{ exam: ExamView; ambiguousCandidates?: Candidate[] }> {
  const { exam, block } = await blockOf(examId, input.blockId);
  if (!block.dates.includes(input.date)) throw new HttpError(400, "That date is not in this block");
  if (!block.classes.includes(input.className)) throw new HttpError(400, "That class is not in this block");
  const where = { blockId_className_examDate: { blockId: input.blockId, className: input.className, examDate: input.date } };

  if (input.subject === null) {
    await prisma.examSlot.deleteMany({ where: { blockId: input.blockId, className: input.className, examDate: input.date } });
    await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { clearCell: `${input.className} ${input.date}` });
    return { exam: await loadExamView(examId) };
  }

  const existing = await prisma.examSlot.findUnique({ where });
  if (existing && existing.subject === input.subject) return { exam: await loadExamView(examId) };

  const candidates = await candidatesFor(exam, { className: input.className, subject: input.subject });
  const pick = pickPaper(candidates);
  const data = { subject: input.subject, paperId: pick.paperId, printedAt: null, printedById: null, printedPaperAt: null, dateChangedAfterPrint: false };
  const slot = existing
    ? await prisma.examSlot.update({ where, data })
    : await prisma.examSlot.create({ data: { examId, blockId: input.blockId, className: input.className, examDate: input.date, ...data } });
  if (pick.paperId) await syncLinkedPaper(slot.id, user);
  await recordAudit(user, "EXAM_UPDATE", "EXAM", examId, { cell: `${input.className} ${input.date}`, subject: input.subject, paperId: pick.paperId });
  return { exam: await loadExamView(examId), ...(pick.ambiguous ? { ambiguousCandidates: candidates } : {}) };
}

/** Phase 2 hook: a newly linked paper takes the exam's date, type and session. */
async function syncLinkedPaper(_slotId: string, _user: SessionUser): Promise<void> {}

async function slotIn(examId: string, slotId: string) {
  const slot = await prisma.examSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.examId !== examId) throw new HttpError(404, "Paper slot not found");
  return slot;
}

export async function setSlotPaper(examId: string, slotId: string, paperId: string | null, user: SessionUser) {
  await slotIn(examId, slotId);
  if (paperId && !(await prisma.paper.findUnique({ where: { id: paperId }, select: { id: true } }))) throw new HttpError(400, "Paper not found");
  await prisma.examSlot.update({ where: { id: slotId }, data: { paperId } });
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
