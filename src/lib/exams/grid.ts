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
