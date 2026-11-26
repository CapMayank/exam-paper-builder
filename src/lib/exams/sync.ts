/** What a paper linked to a date-sheet slot takes from the exam. */
export function paperSyncFields(exam: { examType: string; academicSession: string }, examDate: string) {
  return { examDate, examType: exam.examType, academicSession: exam.academicSession };
}
