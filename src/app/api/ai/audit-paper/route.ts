import { body, HttpError, route } from "@/lib/api";
import { auditPaperWithGemini } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const auditSchema = z.object({
  paperId: z.string().optional(),
  paperTitle: z.string().optional(),
  className: z.string().optional(),
  subject: z.string().optional(),
  totalMarks: z.number().int().optional(),
  questions: z
    .array(
      z.object({
        id: z.string().default(""),
        number: z.number().int().default(1),
        sectionTitle: z.string().default("Section A"),
        type: z.string().default("SHORT"),
        text: z.string().default(""),
        options: z.array(z.string()).default([]),
        answer: z.string().default(""),
        marks: z.number().int().default(1),
        difficulty: z.string().default("MEDIUM"),
      }),
    )
    .optional(),
});

export const POST = route(async (req) => {
  const customKey = req.headers.get("x-gemini-api-key");
  const data = await body(req, auditSchema);

  if (data.paperId) {
    const paper = await prisma.paper.findUnique({
      where: { id: data.paperId },
      include: {
        blueprint: {
          include: {
            book: true,
            sections: { orderBy: { position: "asc" } },
          },
        },
        items: {
          include: {
            question: true,
            section: true,
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!paper) {
      throw new HttpError(404, "Paper not found");
    }

    const totalMarks = paper.blueprint.sections.reduce(
      (sum: number, s: { count: number; marksEach: number }) => sum + s.count * s.marksEach,
      0,
    );

    const questions = paper.items.map((pq, idx: number) => {
      let parsedOptions: string[] = [];
      try {
        parsedOptions = JSON.parse(pq.question.optionsJson || "[]");
      } catch {
        parsedOptions = [];
      }

      return {
        id: pq.question.id,
        number: idx + 1,
        sectionTitle: pq.section.title,
        type: pq.question.type,
        text: pq.question.text,
        options: parsedOptions,
        answer: pq.question.answer,
        marks: pq.section.marksEach,
        difficulty: pq.question.difficulty,
      };
    });

    const result = await auditPaperWithGemini({
      paperTitle: paper.title,
      className: paper.blueprint.book.className,
      subject: paper.blueprint.book.subject,
      totalMarks,
      questions,
      apiKey: customKey,
    });

    return result;
  }

  if (!data.questions || data.questions.length === 0) {
    throw new HttpError(400, "Provide either paperId or questions array to audit.");
  }

  const result = await auditPaperWithGemini({
    paperTitle: data.paperTitle || "Draft Examination Paper",
    className: data.className || "Class 10",
    subject: data.subject || "General",
    totalMarks: data.totalMarks || 80,
    questions: data.questions,
    apiKey: customKey,
  });

  return result;
});
