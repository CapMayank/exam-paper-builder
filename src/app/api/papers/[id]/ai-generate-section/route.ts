import { HttpError, route } from "@/lib/api";
import { generatePaperSectionWithGemini, type GeneratePaperSectionSlot } from "@/lib/gemini";
import { resolveInternalChoiceRequirement } from "@/lib/internalChoiceRules";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";

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
    difficulty = "BALANCED",
    model = "gemini-2.5-pro",
    teacherFocus = "",
    generateDiagrams = true,
    slots = [],
    customKey,
  } = body;

  if (!Array.isArray(slots) || slots.length === 0) {
    throw new HttpError(400, "Slots array is required and must not be empty.");
  }

  const matchedSection = paper.blueprint.sections.find(
    (s) => (sectionId && s.id === sectionId) || s.title === sectionTitle,
  );
  const effectiveInstructions = sectionInstructions ?? matchedSection?.instructions ?? null;

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
    return {
      ...slot,
      slotIndex: slotIdx,
      requiresInternalChoice: reqChoice,
    };
  });

  const res = await generatePaperSectionWithGemini({
    className: paper.blueprint.book.className,
    subject: paper.blueprint.book.subject,
    sectionTitle: sectionTitle || matchedSection?.title || "Section",
    sectionType: sectionType || matchedSection?.type || "MCQ",
    sectionInstructions: effectiveInstructions,
    marksEach: Number(marksEach) || matchedSection?.marksEach || 1,
    language,
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
  });

  if (!res.success) {
    throw new HttpError(422, res.error || "Failed to generate valid curriculum-grounded questions for section.");
  }

  return {
    success: true,
    isMock: res.isMock,
    questions: res.data,
    trace: res.trace,
    contract: res.contract,
    validationIssues: res.validationIssues,
  };
});
