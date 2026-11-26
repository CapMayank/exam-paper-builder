import { formatDMY } from "./dates";
import type { BlockView, ExamView } from "./types";

/** A class sits in one block of an exam. Returns the refusal text, or null when the class may be added. */
export function checkAddClass(blocks: BlockView[], blockId: string, className: string): string | null {
  const other = blocks.find((b) => b.id !== blockId && b.classes.includes(className));
  return other ? `${className} is already in ${other.title}` : null;
}

export function checkAddDate(block: BlockView, date: string): string | null {
  return block.dates.includes(date) ? `${formatDMY(date)} is already a date in ${block.title}` : null;
}

/** Moving a date column must not land on another column of the same block. */
export function checkMoveDate(block: BlockView, from: string, to: string): string | null {
  if (!block.dates.includes(from)) return `${formatDMY(from)} is not a date in ${block.title}`;
  if (from === to) return null;
  return checkAddDate(block, to);
}

export type CopiedLayout = {
  blocks: Omit<BlockView, "id">[];
  slots: { blockIndex: number; className: string; subject: string; examDate: string }[];
};

/** What "Copy exam" carries over: blocks, dates, classes and subjects; never linked papers or printed state. */
export function copyLayout(exam: ExamView): CopiedLayout {
  const ordered = [...exam.blocks].sort((a, b) => a.position - b.position);
  return {
    blocks: ordered.map((b, i) => ({ title: b.title, position: i, timeText: b.timeText, dates: [...b.dates], classes: [...b.classes] })),
    slots: ordered.flatMap((b, blockIndex) =>
      exam.slots
        .filter((s) => s.blockId === b.id)
        .map((s) => ({ blockIndex, className: s.className, subject: s.subject, examDate: s.examDate })),
    ),
  };
}

/** Papers a class may sit on one day (GK and Drawing go together). */
export const MAX_PAPERS_PER_DAY = 2;

/**
 * The subjects of one cell (a class on a date): at most two, none repeated, and none the class already has on
 * another date of the exam. Returns the refusal text, or null.
 */
export function checkCellSubjects(
  placed: { className: string; examDate: string; subject: string }[],
  className: string,
  date: string,
  subjects: string[],
): string | null {
  if (subjects.length > MAX_PAPERS_PER_DAY) return "A day can hold at most two papers for a class";
  const seen = new Set<string>();
  for (const s of subjects) {
    if (seen.has(s)) return `${s} is already in this cell`;
    seen.add(s);
    const elsewhere = placed.find((p) => p.className === className && p.subject === s && p.examDate !== date);
    if (elsewhere) return `${s} is already on ${formatDMY(elsewhere.examDate)} for ${className}`;
  }
  return null;
}
