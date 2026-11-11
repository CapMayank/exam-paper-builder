import { HttpError, route } from "@/lib/api";
import { buildCoverageReport } from "@/lib/aiCoverage";
import { classifyPaperChaptersWithGemini, quotaErrorText } from "@/lib/gemini";
import { computeDisplayedPaperNumbering } from "@/lib/layout";
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

  // section by section, then by place in the section (positions restart in every section)
  const sectionIndex = new Map(paper.blueprint.sections.map((s, i) => [s.id, i]));
  const ordered = [...paper.items].sort(
    (a, b) => (sectionIndex.get(a.sectionId) ?? 999) - (sectionIndex.get(b.sectionId) ?? 999) || a.position - b.position,
  );
  const placed = toPlacedItems(paper.blueprint.sections, ordered);
  // the number each question carries on the printed paper, so the teacher can find what the AI is talking about
  const printed = computeDisplayedPaperNumbering(paper.blueprint.sections, paper.items, (paper.numberingStyle as "CONTINUOUS" | "PREFIXED" | "SECTION_RELATIVE" | undefined) || "CONTINUOUS");
  const items = ordered.map((it, i) => ({
    itemId: it.id,
    questionId: it.question.id,
    number: i + 1,
    marks: placed[i]?.marks ?? 0,
    storedChapterId: it.question.chapterId,
    text: it.question.text,
    label: String(printed.itemNumbers[it.id]?.questionNumber ?? i + 1),
    preview: it.question.text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 90),
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
    items: items.map((it) => ({
      itemId: it.itemId,
      questionId: it.questionId,
      number: it.number,
      marks: it.marks,
      storedChapterId: it.storedChapterId,
      label: it.label,
      preview: it.preview,
    })),
    targets,
    rows: res.data.rows,
  });
});
