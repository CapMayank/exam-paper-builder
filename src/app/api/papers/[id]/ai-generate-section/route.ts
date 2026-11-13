import { HttpError, route } from "@/lib/api";
import {
  DEFAULT_GENERATION_MODEL,
  generatePaperSectionWithGemini,
  getGeminiApiKey,
  quotaErrorText,
  type GeneratePaperSectionSlot,
} from "@/lib/gemini";
import {
  isParaphraseOrDuplicateChoice,
  orChapterRefusal,
  orChapterRule,
  resolveInternalChoiceRequirement,
} from "@/lib/internalChoiceRules";
import { detectPaperLanguage, type PaperLanguage } from "@/lib/localization";
import { DEFAULT_DIFFICULTY_PROFILE } from "@/lib/difficultyProfiles";
import { slotRowRole, slotTaskDirective } from "@/lib/paperAutogen";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { allowedTypesFor, isTypeAllowed } from "@/lib/sectionTypes";

export const POST = route(async (req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") {
    throw new HttpError(409, "This paper is finalised. Reopen it to generate questions.");
  }

  const body = await req.json();
  const {
    sectionId,
    sectionTitle,
    sectionType,
    sectionInstructions,
    marksEach,
    language = "en",
    difficulty = DEFAULT_DIFFICULTY_PROFILE,
    model = DEFAULT_GENERATION_MODEL,
    teacherFocus = "",
    generateDiagrams = true,
    slots = [],
    customKey,
    answerMode = "separate",
    /** Paper item whose main question the generated one will be the internal-choice alternative (OR) of. */
    alternateForItemId,
  } = body;

  if (!Array.isArray(slots) || slots.length === 0) {
    throw new HttpError(400, "Slots array is required and must not be empty.");
  }

  // by id first: several rows of one printed section share its title (lessons, grammar and the unseen passage
  // under "Short Answer Type Questions"), and matching by title found the lesson row for the passage row
  const matchedSection =
    (sectionId ? paper.blueprint.sections.find((s) => s.id === sectionId) : undefined) ??
    paper.blueprint.sections.find((s) => s.title === sectionTitle);
  // the teacher may generate any form the section accepts; the slot's marks never change
  if (matchedSection && sectionType && !isTypeAllowed(matchedSection, String(sectionType))) {
    throw new HttpError(
      422,
      `"${matchedSection.title}" does not accept ${sectionType} questions (allowed: ${allowedTypesFor(matchedSection).join(", ")}).`,
    );
  }
  const effectiveType = String(sectionType || matchedSection?.type || "MCQ");
  if (
    matchedSection &&
    (matchedSection as { role?: string }).role === "PASSAGE" &&
    !["UNSEEN_PASSAGE", "CASE_STUDY", "REFERENCE_CONTEXT"].includes(effectiveType)
  ) {
    throw new HttpError(
      422,
      `"${matchedSection.title}" is a passage section made of ${matchedSection.type} slots. AI generates a passage with its sub-questions as one unit, so set the section type to Unseen passage (or add passage questions manually).`,
    );
  }
  const effectiveInstructions = sectionInstructions ?? matchedSection?.instructions ?? null;

  const alternateFor = alternateForItemId ? paper.items.find((i) => i.id === alternateForItemId) : null;
  if (alternateForItemId && !alternateFor) throw new HttpError(404, "The question to write an alternative (OR) for is not in this paper.");
  if (alternateFor && matchedSection && alternateFor.sectionId !== matchedSection.id) {
    throw new HttpError(422, "The alternative (OR) must be generated in the main question's own section.");
  }
  if (alternateFor && slots.length !== 1) throw new HttpError(400, "An alternative (OR) question is generated one at a time.");
  // up to class 8 the same chapter is only a guideline; from class 9 it is required
  if (
    alternateFor &&
    (slots as GeneratePaperSectionSlot[])[0].chapterId !== alternateFor.question.chapterId &&
    orChapterRule(paper.blueprint.book.className) === "required"
  ) {
    throw new HttpError(422, orChapterRefusal(alternateFor.question.chapter));
  }
  // the model sees the main question, so it writes an equivalent alternative instead of guessing (or paraphrasing)
  // up to class 8 the teacher may ask for the alternative from another chapter: the slot's chapter is then the one to use
  const alternateChapter =
    alternateFor && (slots as GeneratePaperSectionSlot[])[0].chapterId !== alternateFor.question.chapterId ? "the chapter named for this slot" : "same chapter";
  const alternateDirective = alternateFor
    ? `This question will be printed as the internal-choice alternative (OR) to the main question below. Write an equivalent question: ${alternateChapter}, same marks and marking depth, same difficulty, but testing a different subtopic, method or example. It must NOT be a paraphrase or a reworded copy of the main question, and must not reuse its numbers or scenario. Main question: """${alternateFor.question.text.slice(0, 1500)}"""`
    : "";

  const validBookChapterIds = new Set(paper.blueprint.chapters.map((c) => c.chapterId));
  const existingQuestionTexts = paper.items.flatMap((i) =>
    [i.question.text, i.orQuestion?.text].filter((t): t is string => Boolean(t && t.trim())),
  );

  const resolvedSlots: GeneratePaperSectionSlot[] = (slots as GeneratePaperSectionSlot[]).map((slot, idx) => {
    const slotIdx = typeof slot.slotIndex === "number" ? slot.slotIndex : idx;
    let reqChoice = slot.requiresInternalChoice;
    if (matchedSection) {
      const choiceRule = resolveInternalChoiceRequirement({
        schoolName: paper.schoolName,
        blueprintName: paper.blueprint.name,
        className: paper.blueprint.book.className,
        academicSession: paper.academicSession || paper.blueprint.academicSession,
        subject: paper.blueprint.book.subject,
        subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
        questionType: matchedSection.type,
        marksEach: matchedSection.marksEach,
        sectionTitle: matchedSection.title,
        sectionInstructions: effectiveInstructions,
        slotIndex: slotIdx,
        orChoiceMode: (matchedSection as any).orChoiceMode,
        orAlternativeCount: (matchedSection as any).orAlternativeCount,
        orSlotsJson: (matchedSection as any).orSlotsJson,
      });
      reqChoice = choiceRule.required;
    }
    // an alternative is itself the OR: it never carries an OR of its own
    if (alternateFor) reqChoice = false;
    const slotId = slot.slotId || (matchedSection ? `slot_${matchedSection.id}_${slotIdx}` : `slot_${slotIdx}`);
    const cTitle = (slot as { componentTitle?: string }).componentTitle;
    const subjectName = paper.blueprint.book.subject;
    const task = slotTaskDirective(
      slotRowRole(slot.chapterTitle, subjectName, (matchedSection as { role?: string } | undefined)?.role),
      slot.chapterTitle,
      effectiveType,
      matchedSection?.marksEach ?? (Number(marksEach) || 1),
      subjectName,
      paper.blueprint.book.className,
    );
    const focus = [cTitle ? `Syllabus component: ${cTitle}. Keep the question inside this component.` : "", task, alternateDirective]
      .filter(Boolean)
      .join(" ");
    return {
      ...slot,
      slotId,
      slotIndex: slotIdx,
      requiresInternalChoice: reqChoice,
      ...(focus ? { topicFocus: focus } : {}),
    };
  });

  const resolvedLanguage: PaperLanguage =
    language && language !== "en"
      ? (language as PaperLanguage)
      : detectPaperLanguage(paper, paper.items);

  const res = await generatePaperSectionWithGemini({
    className: paper.blueprint.book.className,
    subject: paper.blueprint.book.subject,
    sectionTitle: sectionTitle || matchedSection?.title || "Section",
    sectionType: effectiveType,
    sectionInstructions: effectiveInstructions,
    marksEach: Number(marksEach) || matchedSection?.marksEach || 1,
    language: resolvedLanguage,
    difficulty,
    model,
    teacherFocus,
    generateDiagrams: Boolean(generateDiagrams),
    slots: resolvedSlots,
    schoolName: paper.schoolName,
    blueprintName: paper.blueprint.name,
    academicSession: paper.academicSession || paper.blueprint.academicSession,
    examType: paper.examType || paper.blueprint.examType,
    bookId: paper.blueprint.bookId,
    subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
    validBookChapterIds,
    existingQuestionTexts,
    apiKey: customKey || req.headers.get("x-gemini-api-key") || (user as any)?.apiKey || null,
    // two-stage by default: questions here, model answers from the answer-key pass after commit
    answerMode: answerMode === "together" ? "together" : "separate",
  });

  // with no key at all, a passage cannot come from templates; with a key, the real failure reason is reported below
  if (res.isMock && ["UNSEEN_PASSAGE", "REFERENCE_CONTEXT"].includes(effectiveType) && !getGeminiApiKey(customKey || req.headers.get("x-gemini-api-key"))) {
    throw new HttpError(422, "Offline templates cannot write a real unseen passage. Connect a Gemini API key, or add the passage and its questions manually.");
  }

  // A configured model that still failed after retries must not silently hand back template text.
  if (res.isMock && getGeminiApiKey(customKey || req.headers.get("x-gemini-api-key"))) {
    const quota = quotaErrorText(model);
    if (quota) throw new HttpError(429, quota);
    console.warn(`ai-generate-section "${sectionTitle ?? matchedSection?.title}" fell back to templates: ${res.error ?? "no reason recorded"}`);
    throw new HttpError(
      502,
      `The AI did not return usable questions for this section. Reason: ${res.error ?? "unknown"} Nothing was added; please try again.`,
    );
  }

  if (!res.success) {
    throw new HttpError(422, res.error || "Failed to generate valid curriculum-grounded questions for section.");
  }

  // label each generated question with the component its slot was planned for
  const keyBySlot = new Map<number, string>(
    (slots as Array<{ slotIndex?: number; componentKey?: string }>).map((sl, i) => [sl.slotIndex ?? i, sl.componentKey ?? ""] as [number, string]),
  );
  let labelled = (res.data ?? []).map((q, i) => ({
    ...q,
    componentKey: keyBySlot.get(typeof q.slotIndex === "number" ? q.slotIndex : i) || undefined,
  }));

  if (alternateFor) {
    labelled = labelled.map((q) => ({ ...q, requiresInternalChoice: false, orQuestion: undefined }));
    const copy = labelled.find((q) => isParaphraseOrDuplicateChoice(alternateFor.question.text, q.text).isDuplicateOrParaphrase);
    if (copy) {
      throw new HttpError(502, "The AI wrote a near copy of the main question instead of an alternative. Nothing was added; please try again.");
    }
  }

  return {
    success: true,
    isMock: res.isMock,
    questions: labelled,
    trace: res.trace,
    contract: res.contract,
    validationIssues: res.validationIssues,
  };
});
