import { HttpError, route } from "@/lib/api";
import { buildExternalPaperPrompt } from "@/lib/externalPaperPrompt";
import { planPaperWithComponents } from "@/lib/paperAutogen";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";

/**
 * A prompt to paste into another chat AI for this paper's questions.
 * ?scope=all plans the whole paper (for a replacing import); the default plans only the empty slots.
 */
export const GET = route(async (req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.blueprint.chapters.length === 0) {
    throw new HttpError(400, "This blueprint has no chapters. Add chapters and their marks to the blueprint first.");
  }

  const url = new URL(req.url);
  const whole = url.searchParams.get("scope") === "all";
  const input = { ...paper, items: whole ? [] : paper.items } as Parameters<typeof planPaperWithComponents>[0];
  const plan = planPaperWithComponents(input);

  const result = buildExternalPaperPrompt({
    plan,
    schoolName: paper.schoolName,
    academicSession: paper.academicSession || paper.blueprint.academicSession,
    examType: paper.examType || paper.blueprint.examType,
    subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
    difficulty: url.searchParams.get("difficulty"),
    teacherFocus: url.searchParams.get("focus"),
    existingQuestionTexts: whole
      ? []
      : paper.items.flatMap((i) => [i.question.text, i.orQuestion?.text].filter((t): t is string => Boolean(t?.trim()))),
  });
  if (result.questionCount === 0) {
    throw new HttpError(409, "Every slot on this paper is already filled. Choose “Replace existing paper questions” to get a prompt for the whole paper.");
  }
  return result;
});
