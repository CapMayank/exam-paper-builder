import { body, HttpError, route } from "@/lib/api";
import { isKindergartenType } from "@/lib/constants";
import {
  DEFAULT_GENERATION_MODEL,
  generatePaperSectionWithGemini,
  generateQuestionsWithGemini,
  getGeminiApiKey,
  quotaErrorText,
} from "@/lib/gemini";
import { assertCanManageScope } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const generateSchema = z.object({
  /** The bank's book and chapter. With them the request runs through the same pipeline as paper generation. */
  bookId: z.string().trim().min(1).optional(),
  chapterId: z.string().trim().min(1).optional(),
  chapter: z.string().trim().min(1, "Chapter is required"),
  className: z.string().trim().default("Class 10"),
  subject: z.string().trim().default("Science"),
  type: z.string().trim().default("SHORT"),
  marks: z.number().int().min(1).max(20).default(3),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  cognitiveLevel: z.string().optional().default("APPLYING"),
  language: z.enum(["en", "hi", "sa", "bilingual"]).default("en"),
  count: z.number().int().min(1).max(10).default(1),
  topicContext: z.string().trim().max(500).optional().default(""),
  board: z.string().trim().optional(),
  academicSession: z.string().trim().optional(),
  subjectCode: z.string().trim().optional(),
  sectionInstructions: z.string().trim().optional(),
  requiresInternalChoice: z.boolean().optional(),
});

/** How many of the chapter's bank questions the model is shown as "do not repeat". */
const BANK_AVOID_LIMIT = 60;

export const POST = route(async (req, _ctx, user) => {
  const customKey = req.headers.get("x-gemini-api-key");
  const data = await body(req, generateSchema);

  const isSanskritSubject =
    data.subject.toLowerCase().includes("sanskrit") ||
    data.subject.includes("संस्कृत") ||
    data.subjectCode === "122" ||
    data.subjectCode === "512" ||
    data.subjectCode === "022";
  const isHindiSubject =
    data.subject.toLowerCase().includes("hindi") ||
    data.subject.includes("हिंदी") ||
    data.subject.includes("हिन्दी");

  const effectiveLanguage =
    data.language && data.language !== "en"
      ? data.language
      : isSanskritSubject
      ? "sa"
      : isHindiSubject
      ? "hi"
      : "en";

  // Kindergarten activities have their own generator; everything else with a known chapter uses the paper pipeline.
  if (data.bookId && data.chapterId && !isKindergartenType(data.type)) {
    const book = await prisma.book.findUnique({ where: { id: data.bookId }, include: { chapters: { orderBy: { number: "asc" } } } });
    if (!book) throw new HttpError(404, "Book not found");
    assertCanManageScope(user, book);
    const chapter = book.chapters.find((c) => c.id === data.chapterId);
    if (!chapter) throw new HttpError(400, "Chapter does not belong to this book");

    // the chapter's bank questions are what a new one must not repeat (the paper pipeline's "already placed" list)
    const existing = await prisma.question.findMany({
      where: { chapterId: chapter.id },
      orderBy: { createdAt: "desc" },
      take: BANK_AVOID_LIMIT,
      select: { text: true },
    });

    const res = await generatePaperSectionWithGemini({
      className: book.className,
      subject: book.subject,
      sectionTitle: "Question bank",
      sectionType: data.type,
      sectionInstructions: data.sectionInstructions ?? null,
      marksEach: data.marks,
      language: effectiveLanguage,
      difficulty: data.difficulty,
      model: DEFAULT_GENERATION_MODEL,
      teacherFocus: [data.topicContext, data.cognitiveLevel ? `Cognitive level for each question: ${data.cognitiveLevel}.` : ""]
        .filter(Boolean)
        .join(" "),
      generateDiagrams: false,
      slots: Array.from({ length: data.count }, (_, i) => ({
        slotIndex: i,
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        marks: data.marks,
        targetDifficulty: data.difficulty,
        requiresInternalChoice: Boolean(data.requiresInternalChoice),
      })),
      board: data.board ?? null,
      academicSession: data.academicSession || book.academicSession,
      bookId: book.id,
      subjectCode: data.subjectCode ?? null,
      validBookChapterIds: new Set(book.chapters.map((c) => c.id)),
      existingQuestionTexts: existing.map((q) => q.text).filter((t) => t.trim()),
      apiKey: customKey,
      // a bank question is saved as it is reviewed, so it needs its full model answer now
      answerMode: "together",
    });

    // A configured model that failed must not hand back template text dressed up as AI output.
    if (res.isMock && getGeminiApiKey(customKey)) {
      const quota = quotaErrorText(DEFAULT_GENERATION_MODEL);
      if (quota) throw new HttpError(429, quota);
      throw new HttpError(502, `The AI did not return a usable question. Reason: ${res.error ?? "unknown"} Nothing was generated; please try again.`);
    }
    if (!res.success) throw new HttpError(422, res.error || "The generated question failed the curriculum checks. Please try again.");

    return {
      success: true,
      isMock: res.isMock,
      ...(res.error ? { error: res.error } : {}),
      data: (res.data ?? []).map((q) => ({ ...q, marks: data.marks, cognitiveLevel: q.cognitiveLevel || data.cognitiveLevel })),
      trace: res.trace,
      validationIssues: res.validationIssues,
    };
  }

  const result = await generateQuestionsWithGemini({
    ...data,
    language: effectiveLanguage,
    apiKey: customKey,
  });
  // the same rule for the older single-question path: no silent templates when a key is configured
  if (result.isMock && getGeminiApiKey(customKey) && !isKindergartenType(data.type)) {
    const quota = quotaErrorText();
    if (quota) throw new HttpError(429, quota);
    throw new HttpError(502, `The AI did not return a usable question. Reason: ${result.error ?? "unknown"} Nothing was generated; please try again.`);
  }
  return result;
});
