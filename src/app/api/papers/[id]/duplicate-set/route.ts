import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { permuteMcqOptions, shuffle } from "@/lib/multiset";
import { loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";

const duplicateSetSchema = z.object({
  targetSet: z.string().trim().min(1).default("SET B"),
  shuffleQuestions: z.boolean().default(true),
  shuffleMcqOptions: z.boolean().default(true),
});

export const POST = route(async (req, params, user) => {
  const { id } = await params;
  const input = await body(req, duplicateSetSchema);

  const source = await prisma.paper.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          question: true,
          orQuestion: true,
        },
      },
    },
  });

  if (!source) throw new HttpError(404, "Paper not found");

  const formattedSet = input.targetSet.toUpperCase().startsWith("SET")
    ? input.targetSet.toUpperCase()
    : `SET ${input.targetSet.toUpperCase()}`;

  const baseTitle = source.title.replace(/\s*\([^)]*SET[^)]*\)/i, "").trim();
  const newTitle = `${baseTitle} (${formattedSet})`;

  // Create duplicate paper
  const newPaper = await prisma.paper.create({
    data: {
      title: newTitle,
      blueprintId: source.blueprintId,
      examType: source.examType,
      layout: source.layout,
      schoolName: source.schoolName,
      examDate: source.examDate,
      paperSet: formattedSet,
      subjectCode: source.subjectCode,
      language: source.language,
      generalInstructions: source.generalInstructions,
      academicSession: source.academicSession,
      schoolLogo: source.schoolLogo,
      logoPath: source.logoPath,
      printDensity: source.printDensity,
      twoColumn: source.twoColumn,
      targetPages: source.targetPages,
      numberingStyle: source.numberingStyle,
      marksStyle: source.marksStyle,
      showCandidateDetails: source.showCandidateDetails,
      showSignatures: source.showSignatures,
      status: "DRAFT",
      createdById: user.id,
    },
  });

  // Group items by section to preserve section grouping
  const sectionsMap = new Map<string, typeof source.items>();
  for (const it of source.items) {
    const list = sectionsMap.get(it.sectionId) ?? [];
    list.push(it);
    sectionsMap.set(it.sectionId, list);
  }

  for (const [sectionId, items] of sectionsMap.entries()) {
    const orderedItems = input.shuffleQuestions ? shuffle(items) : [...items];

    for (let pos = 0; pos < orderedItems.length; pos++) {
      const it = orderedItems[pos];
      let finalQuestionId = it.questionId;
      let finalOrQuestionId = it.orQuestionId;

      // Handle MCQ option shuffling for primary question
      if (input.shuffleMcqOptions && it.question.type === "MCQ") {
        try {
          const rawOptions = JSON.parse(it.question.optionsJson) as string[];
          const permuted = permuteMcqOptions(rawOptions, it.question.answer);
          const forked = await prisma.question.create({
            data: {
              bookId: it.question.bookId,
              chapterId: it.question.chapterId,
              type: it.question.type,
              text: it.question.text,
              optionsJson: JSON.stringify(permuted.options),
              answer: permuted.answer,
              difficulty: it.question.difficulty,
              imagePath: it.question.imagePath,
              spaceMm: it.question.spaceMm,
              showGrid: it.question.showGrid,
              subpartsJson: it.question.subpartsJson ?? "[]",
              createdById: user.id,
            },
          });
          finalQuestionId = forked.id;
        } catch {
          // Fallback to original question ID if parsing fails
          finalQuestionId = it.questionId;
        }
      }

      // Handle MCQ option shuffling for alternate (OR) question if present
      if (input.shuffleMcqOptions && it.orQuestion && it.orQuestion.type === "MCQ") {
        try {
          const rawOptions = JSON.parse(it.orQuestion.optionsJson) as string[];
          const permuted = permuteMcqOptions(rawOptions, it.orQuestion.answer);
          const forkedOr = await prisma.question.create({
            data: {
              bookId: it.orQuestion.bookId,
              chapterId: it.orQuestion.chapterId,
              type: it.orQuestion.type,
              text: it.orQuestion.text,
              optionsJson: JSON.stringify(permuted.options),
              answer: permuted.answer,
              difficulty: it.orQuestion.difficulty,
              imagePath: it.orQuestion.imagePath,
              spaceMm: it.orQuestion.spaceMm,
              showGrid: it.orQuestion.showGrid,
              subpartsJson: it.orQuestion.subpartsJson ?? "[]",
              createdById: user.id,
            },
          });
          finalOrQuestionId = forkedOr.id;
        } catch {
          finalOrQuestionId = it.orQuestionId;
        }
      }

      await prisma.paperQuestion.create({
        data: {
          paperId: newPaper.id,
          sectionId,
          questionId: finalQuestionId,
          orQuestionId: finalOrQuestionId,
          position: pos + 1,
        },
      });
    }
  }

  await recordAudit(user, "PAPER_CREATE", "PAPER", newPaper.id, {
    action: "PAPER_DUPLICATE_SET",
    sourcePaperId: source.id,
    targetSet: formattedSet,
    title: newTitle,
    itemsCount: source.items.length,
  });

  const result = await loadPaperView(newPaper.id);
  return {
    success: true,
    paper: result,
    message: `Generated parallel set ${formattedSet} with ${source.items.length} questions.`,
  };
});
