import { minutesBetween } from "./timing";

/**
 * The time a linked paper takes from the date sheet: the block's sitting when the paper is that day's only one;
 * null (the blueprint's own time) when two papers share the day or the time line can't be read.
 */
export function cellDuration(timeText: string, papersInCell: number): number | null {
  return papersInCell === 1 ? minutesBetween(timeText) : null;
}

/** What a paper linked to a date-sheet slot takes from the exam. */
export function paperSyncFields(exam: { examType: string; academicSession: string }, examDate: string, durationMin: number | null = null) {
  return { examDate, examType: exam.examType, academicSession: exam.academicSession, durationMin };
}
