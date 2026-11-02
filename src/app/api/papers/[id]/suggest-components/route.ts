import { HttpError, route } from "@/lib/api";
import { parseComponents } from "@/lib/languageComponents";
import { suggestComponentsForPaper } from "@/lib/paperComponents";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";

/** Suggests a syllabus component for every question that has none (the teacher can change any of them). */
export const POST = route(async (_req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");
  if (parseComponents((paper.blueprint as { componentsJson?: string }).componentsJson).length === 0) {
    throw new HttpError(400, "This blueprint has no syllabus components.");
  }
  const assigned = await suggestComponentsForPaper(id);
  return { assigned, paper: await loadPaperView(id) };
});
