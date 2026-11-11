import { HttpError, route } from "@/lib/api";
import { buildCoverageReport } from "@/lib/aiCoverage";
import { classifyPaperChaptersWithGemini, quotaErrorText } from "@/lib/gemini";
import { canModifyPaper, loadPaperView, toPlacedItems } from "@/lib/papers";

/**
 * The AI coverage check: one request that labels every question of the paper with the chapter it tests, then
 * the chapter-wise spread by that reading and the questions whose stored chapter disagrees. Changes nothing.
 */
export const POST = route(async (req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  if (!canModifyPaper(user, paper)) {
    throw new HttpError(403, "Only the paper's creator, a teacher assigned to this class and subject, or an Administrator can run this check.");
  }
  if (paper.items.length === 0) throw new HttpError(400, "Add some questions first: there is nothing to check yet.");
  if (paper.blueprint.chapters.length === 0) throw new HttpError(400, "This blueprint has no chapters to check against.");

  // numbered in paper order, in the same order the marks are counted
  const ordered = [...paper.items].sort((a, b) => a.position - b.position);
  const placed = toPlacedItems(paper.blueprint.sections, ordered);
  const items = ordered.map((it, i) => ({
    itemId: it.id,
    questionId: it.question.id,
    number: i + 1,
    marks: placed[i]?.marks ?? 0,
    storedChapterId: it.question.chapterId,
    text: it.question.text,
  }));
  const targets = paper.blueprint.chapters.map((c) => ({
    chapterId: c.chapterId,
    title: c.chapter.title.replace(/^\[[^\]]+\]\s*/, ""),
    target: paper.progress.chapters.find((p) => p.chapterId === c.chapterId)?.target ?? c.marks,
  }));

  const res = await classifyPaperChaptersWithGemini({
    className: paper.blueprint.book.className,
    subject: paper.blueprint.book.subject,
    chapters: paper.blueprint.chapters.map((c) => ({ id: c.chapterId, number: c.chapter.number, title: c.chapter.title })),
    questions: items.map((it) => ({ number: it.number, text: it.text, marks: it.marks })),
    apiKey: req.headers.get("x-gemini-api-key"),
  });
  if (!res.success || res.isMock) {
    const quota = quotaErrorText();
    if (quota) throw new HttpError(429, quota);
    throw new HttpError(502, res.error || "The AI is unavailable right now. The estimate in the coverage panel is unchanged.");
  }

  return buildCoverageReport({
    items: items.map(({ text: _text, ...rest }) => rest),
    targets,
    rows: res.data.rows,
  });
});
