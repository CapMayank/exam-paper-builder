import { HttpError, route } from "@/lib/api";
import { balancePaperAnswerPositions } from "@/lib/answerPositionsDb";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";

/**
 * Spreads the paper's correct answers: MCQ options reordered so no letter dominates or runs three times, match
 * columns so no item sits opposite its match, each key moved with its option. Only this paper's own questions move.
 */
export const POST = route(async (_req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to rearrange options.");
  const result = await balancePaperAnswerPositions(id);
  return { ...result, paper: await loadPaperView(id) };
});
