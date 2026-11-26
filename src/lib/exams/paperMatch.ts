import { resolvePaperExamType } from "@/lib/constants";

/** One match links itself; several (e.g. Set A and Set B) are left for the admin to choose. */
export function pickPaper(candidates: { id: string }[]): { paperId: string | null; ambiguous: boolean } {
  if (candidates.length === 1) return { paperId: candidates[0].id, ambiguous: false };
  return { paperId: null, ambiguous: candidates.length > 1 };
}

/** Papers of the exam's type, using the app's usual rule (blueprint, then paper, then title). */
export function filterByExamType<T extends { examType?: string | null; title?: string | null; blueprint?: { examType?: string | null } | null }>(
  papers: T[],
  examType: string,
): T[] {
  return papers.filter((p) => resolvePaperExamType(p) === examType);
}

/** Prisma `where` for papers that could fill a slot: same class, subject and session. Filter by exam type afterwards. */
export function paperCandidateWhere(slot: { className: string; subject: string }, exam: { academicSession: string }) {
  return {
    academicSession: exam.academicSession,
    blueprint: { book: { className: slot.className, subject: slot.subject } },
  };
}
