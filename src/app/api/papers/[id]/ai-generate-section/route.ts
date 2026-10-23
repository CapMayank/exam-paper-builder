import { HttpError, route } from "@/lib/api";
import { generatePaperSectionWithGemini, type GeneratePaperSectionSlot } from "@/lib/gemini";
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
    sectionTitle,
    sectionType,
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

  const res = await generatePaperSectionWithGemini({
    className: paper.blueprint.book.className,
    subject: paper.blueprint.book.subject,
    sectionTitle: sectionTitle || "Section",
    sectionType: sectionType || "MCQ",
    marksEach: Number(marksEach) || 1,
    language,
    difficulty,
    model,
    teacherFocus,
    generateDiagrams: Boolean(generateDiagrams),
    slots: slots as GeneratePaperSectionSlot[],
    apiKey: customKey || req.headers.get("x-gemini-api-key") || (user as any)?.apiKey || null,
  });

  if (!res.success) {
    throw new HttpError(500, res.error || "Failed to generate questions for section.");
  }

  return {
    success: true,
    isMock: res.isMock,
    questions: res.data,
  };
});
