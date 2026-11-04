import { HttpError, route } from "@/lib/api";
import { planPaperWithComponents } from "@/lib/paperAutogen";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";

export const GET = route(async (_req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.blueprint.chapters.length === 0) {
    throw new HttpError(400, "This blueprint has no chapters. Add chapters and their marks to the blueprint before generating with AI.");
  }

  // language papers: each slot also carries the syllabus component it is suggested for
  const plan = planPaperWithComponents(paper as Parameters<typeof planPaperWithComponents>[0]);

  return {
    success: true,
    plan,
  };
});
