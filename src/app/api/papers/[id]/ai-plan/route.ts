import { HttpError, route } from "@/lib/api";
import { planPaperSlotAssignments } from "@/lib/paperAutogen";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";

export const GET = route(async (_req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);

  const plan = planPaperSlotAssignments(paper);

  return {
    success: true,
    plan,
  };
});
