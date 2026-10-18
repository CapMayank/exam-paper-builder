import { HttpError, route } from "@/lib/api";
import { exportQuestionsToCsv, exportQuestionsToJson } from "@/lib/batchQuestionIo";
import { toQuestionDto } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export const GET = route(async (req, _params, _user) => {
  const url = new URL(req.url);
  const bookId = url.searchParams.get("bookId");
  const chapterId = url.searchParams.get("chapterId") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const difficulty = url.searchParams.get("difficulty") || undefined;
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  if (!bookId) {
    throw new HttpError(400, "Query parameter 'bookId' is required.");
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    throw new HttpError(404, "Book not found.");
  }

  const questions = await prisma.question.findMany({
    where: {
      bookId,
      ...(chapterId ? { chapterId } : {}),
      ...(type ? { type } : {}),
      ...(difficulty ? { difficulty } : {}),
    },
    include: {
      chapter: true,
    },
    orderBy: [
      { chapter: { number: "asc" } },
      { createdAt: "asc" },
    ],
  });

  const questionDtos = questions.map(toQuestionDto);
  const safeTitle = book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (format === "json") {
    const jsonContent = exportQuestionsToJson(questionDtos, {
      bookTitle: book.title,
      subject: book.subject,
      className: book.className,
    });

    const filename = `questions-${safeTitle || "export"}.json`;
    return new Response(jsonContent, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Default: CSV format with UTF-8 BOM
  const csvContent = exportQuestionsToCsv(questionDtos, book.title);
  const filename = `questions-${safeTitle || "export"}.csv`;
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
