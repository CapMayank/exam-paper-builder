import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { parseAndValidateBatch } from "@/lib/batchQuestionIo";
import { DIFFICULTIES, QUESTION_TYPES } from "@/lib/constants";
import { toQuestionDto } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

// Legacy schema for backward compatibility
const legacyBulkSchema = z.object({
  bookId: z.string().min(1),
  chapterId: z.string().min(1),
  questions: z
    .array(
      z.object({
        type: z.enum(QUESTION_TYPES),
        text: z.string().trim().min(1),
        options: z.array(z.string().trim()).default([]),
        answer: z.string().default(""),
        difficulty: z.enum(DIFFICULTIES).default("MEDIUM"),
        spaceMm: z.number().int().min(0).max(250).default(0),
        showGrid: z.boolean().default(false),
      }),
    )
    .min(1),
});

// New R4 Specification schema
const modernBulkSchema = z.object({
  format: z.enum(["csv", "json"]),
  content: z.string().min(1, "Import content cannot be empty"),
  bookId: z.string().min(1, "Target bookId is required"),
  chapterId: z.string().optional(),
  skipDuplicates: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
});

const bulkRequestSchema = z.union([modernBulkSchema, legacyBulkSchema]);

export const POST = route(async (req, _params, user) => {
  const input = await body(req, bulkRequestSchema);

  // Modern Batch Import Flow (R4)
  if ("format" in input) {
    const book = await prisma.book.findUnique({
      where: { id: input.bookId },
      include: {
        chapters: {
          orderBy: { number: "asc" },
        },
      },
    });

    if (!book) throw new HttpError(404, "Target book not found");

    // Fetch existing questions to populate duplicate detection index
    const existingQuestions = await prisma.question.findMany({
      where: { bookId: input.bookId },
      select: {
        id: true,
        chapterId: true,
        text: true,
      },
    });

    const report = parseAndValidateBatch({
      format: input.format,
      content: input.content,
      bookId: input.bookId,
      chapterId: input.chapterId,
      chapters: book.chapters,
      existingQuestions,
      skipDuplicates: input.skipDuplicates,
    });

    // If dryRun requested, return validation report without persistence
    if (input.dryRun) {
      return Response.json(report, { status: 200 });
    }

    // If validation errors exist, abort transaction and return 422 with full line errors
    if (report.errorCount > 0) {
      return Response.json(report, { status: 422 });
    }

    // Atomic database persistence via Prisma transaction
    const createdRecords = await prisma.$transaction(
      report.items.map((item) =>
        prisma.question.create({
          data: {
            bookId: item.bookId,
            chapterId: item.chapterId,
            type: item.type,
            text: item.text,
            optionsJson: JSON.stringify(item.type === "MCQ" ? item.options : []),
            subpartsJson: JSON.stringify(item.subparts || []),
            answer: item.answer,
            difficulty: item.difficulty,
            spaceMm: item.spaceMm,
            showGrid: item.showGrid,
            createdById: user.id,
          },
          include: {
            chapter: true,
          },
        }),
      ),
    );

    const createdQuestions = createdRecords.map(toQuestionDto);

    const fullReport = {
      ...report,
      createdQuestions,
      message: `Successfully imported ${createdQuestions.length} question(s) into ${book.title}.`,
    };

    return Response.json(fullReport, { status: 201 });
  }

  // Legacy Bulk Flow
  const chapter = await prisma.chapter.findFirst({
    where: { id: input.chapterId, bookId: input.bookId },
  });
  if (!chapter) throw new HttpError(400, "Selected chapter does not belong to the book.");

  const createdQuestions = await prisma.$transaction(
    input.questions.map((q) =>
      prisma.question.create({
        data: {
          bookId: input.bookId,
          chapterId: input.chapterId,
          type: q.type,
          text: q.text,
          optionsJson: JSON.stringify(q.type === "MCQ" ? q.options : []),
          answer: q.answer,
          difficulty: q.difficulty,
          spaceMm: q.spaceMm,
          showGrid: q.type === "DRAW" && q.showGrid,
          createdById: user.id,
        },
        include: { chapter: true },
      }),
    ),
  );

  return {
    success: true,
    count: createdQuestions.length,
    questions: createdQuestions.map(toQuestionDto),
    message: `Successfully imported ${createdQuestions.length} questions into Chapter ${chapter.number}.`,
  };
});
