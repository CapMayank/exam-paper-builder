import { body, HttpError, route } from "@/lib/api";
import { parseBlueprintWithGemini } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const parseBlueprintSchema = z.object({
  rawText: z.string().trim().optional(),
  fileData: z.string().optional(),
  mimeType: z.string().optional(),
  bookId: z.string().min(1, "Please select a target book"),
  academicSession: z.string().optional(),
});

export const POST = route(async (req) => {
  const customKey = req.headers.get("x-gemini-api-key");
  const data = await body(req, parseBlueprintSchema);

  if (!data.rawText && !data.fileData) {
    throw new HttpError(400, "Please provide either blueprint text or upload a document/image file.");
  }

  const book = await prisma.book.findUnique({
    where: { id: data.bookId },
    include: {
      chapters: {
        orderBy: { number: "asc" },
        select: { id: true, number: true, title: true },
      },
    },
  });

  if (!book) {
    throw new HttpError(404, "Selected book was not found.");
  }

  const result = await parseBlueprintWithGemini({
    rawText: data.rawText,
    fileData: data.fileData,
    mimeType: data.mimeType,
    className: book.className,
    subject: book.subject,
    academicSession: data.academicSession,
    bookChapters: book.chapters,
    apiKey: customKey,
  });

  return {
    ...result,
    book: {
      id: book.id,
      title: book.title,
      className: book.className,
      subject: book.subject,
      chapters: book.chapters,
    },
  };
});
