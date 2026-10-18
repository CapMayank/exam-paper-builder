import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import {
  formatSetIdentifier,
  permuteMcqOptions,
  planMultiSetDistribution,
} from "@/lib/multiset";
import { loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";

export const parallelSetsSchema = z.object({
  sets: z.array(z.string().trim().min(1)).min(1, "Specify at least one target set"),
  commonRatio: z.number().min(0).max(1).default(0.6),
  shufflePositions: z.boolean().default(true),
  shuffleMcqOptions: z.boolean().default(true),
  prefixTitle: z.boolean().default(true),
  skipAcademicSessionCollisions: z.boolean().optional(),
});

export const POST = route(async (req, params, user) => {
  const { id } = await params;
  const input = await body(req, parallelSetsSchema);

  // 1. Fetch source paper with full relations
  const source = await prisma.paper.findUnique({
    where: { id },
    include: {
      blueprint: {
        include: {
          sections: { orderBy: { position: "asc" } },
          chapters: { include: { chapter: true } },
        },
      },
      items: {
        orderBy: { position: "asc" },
        include: {
          question: { include: { chapter: true } },
          orQuestion: { include: { chapter: true } },
          section: true,
        },
      },
    },
  });

  if (!source) throw new HttpError(404, "Paper not found");
  if (source.items.length === 0) {
    throw new HttpError(400, "Source paper has no questions placed. Place questions before generating parallel sets.");
  }

  // 2. Fetch candidate questions from bank for this book
  const bankQuestions = await prisma.question.findMany({
    where: { bookId: source.blueprint.bookId },
    select: {
      id: true,
      bookId: true,
      chapterId: true,
      type: true,
      text: true,
      difficulty: true,
      subpartsJson: true,
      optionsJson: true,
      answer: true,
      spaceMm: true,
      showGrid: true,
      imagePath: true,
    },
  });

  const questionBankLookup = new Map(bankQuestions.map((q) => [q.id, q]));

  // 3. Run pure multi-set distribution planner
  const planResult = planMultiSetDistribution({
    sections: source.blueprint.sections,
    sourceItems: source.items,
    candidatePool: bankQuestions,
    targetSets: input.sets,
    commonRatio: input.commonRatio,
    shufflePositions: input.shufflePositions,
  });

  const baseTitle = source.title.replace(/\s*\([^)]*SET[^)]*\)/i, "").trim();
  const createdPaperIds: string[] = [];
  const summaryList: Array<{
    id: string;
    setCode: string;
    title: string;
    totalQuestions: number;
    commonCount: number;
    variantCount: number;
    overlapPercentage: number;
  }> = [];

  // 4. Execute atomic generation inside Prisma transaction
  await prisma.$transaction(
    async (tx) => {
      for (const setPlan of planResult.plans) {
        const formattedSet = setPlan.setCode;
        const newTitle = input.prefixTitle ? `${baseTitle} (${formattedSet})` : `${source.title} - ${formattedSet}`;

        const createdPaper = await tx.paper.create({
          data: {
            title: newTitle,
            blueprintId: source.blueprintId,
            examType: source.examType,
            layout: source.layout,
            schoolName: source.schoolName,
            examDate: source.examDate,
            paperSet: formattedSet,
            subjectCode: source.subjectCode,
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

        createdPaperIds.push(createdPaper.id);

        summaryList.push({
          id: createdPaper.id,
          setCode: formattedSet,
          title: newTitle,
          totalQuestions: setPlan.totalQuestions,
          commonCount: setPlan.commonCount,
          variantCount: setPlan.variantCount,
          overlapPercentage: setPlan.overlapPercentage,
        });

        // Insert paper items
        for (const itemPlan of setPlan.items) {
          let finalQuestionId = itemPlan.questionId;
          let finalOrQuestionId = itemPlan.orQuestionId;

          const q = questionBankLookup.get(itemPlan.questionId);

          // Handle MCQ option permutation
          if (input.shuffleMcqOptions && q && q.type === "MCQ") {
            try {
              const rawOptions = JSON.parse(q.optionsJson) as string[];
              const permuted = permuteMcqOptions(rawOptions, q.answer);
              const forked = await tx.question.create({
                data: {
                  bookId: q.bookId,
                  chapterId: q.chapterId,
                  type: q.type,
                  text: q.text,
                  optionsJson: JSON.stringify(permuted.options),
                  answer: permuted.answer,
                  difficulty: q.difficulty,
                  imagePath: q.imagePath,
                  spaceMm: q.spaceMm,
                  showGrid: q.showGrid,
                  subpartsJson: q.subpartsJson ?? "[]",
                  createdById: user.id,
                },
              });
              finalQuestionId = forked.id;
            } catch {
              finalQuestionId = itemPlan.questionId;
            }
          }

          // Handle Alternate (OR) question MCQ permutation
          if (input.shuffleMcqOptions && itemPlan.orQuestionId) {
            const orQ = questionBankLookup.get(itemPlan.orQuestionId);
            if (orQ && orQ.type === "MCQ") {
              try {
                const rawOptions = JSON.parse(orQ.optionsJson) as string[];
                const permutedOr = permuteMcqOptions(rawOptions, orQ.answer);
                const forkedOr = await tx.question.create({
                  data: {
                    bookId: orQ.bookId,
                    chapterId: orQ.chapterId,
                    type: orQ.type,
                    text: orQ.text,
                    optionsJson: JSON.stringify(permutedOr.options),
                    answer: permutedOr.answer,
                    difficulty: orQ.difficulty,
                    imagePath: orQ.imagePath,
                    spaceMm: orQ.spaceMm,
                    showGrid: orQ.showGrid,
                    subpartsJson: orQ.subpartsJson ?? "[]",
                    createdById: user.id,
                  },
                });
                finalOrQuestionId = forkedOr.id;
              } catch {
                finalOrQuestionId = itemPlan.orQuestionId;
              }
            }
          }

          await tx.paperQuestion.create({
            data: {
              paperId: createdPaper.id,
              sectionId: itemPlan.sectionId,
              questionId: finalQuestionId,
              orQuestionId: finalOrQuestionId,
              position: itemPlan.position,
            },
          });
        }
      }
    },
    { timeout: 20000 },
  );

  // 5. Load full views for client
  const createdViews = [];
  for (const paperId of createdPaperIds) {
    const view = await loadPaperView(paperId);
    if (view) createdViews.push(view);
  }

  return {
    success: true,
    parentPaperId: source.id,
    createdPapers: summaryList,
    papers: createdViews,
    warnings: planResult.warnings,
    message: `Generated ${createdViews.length} parallel set(s) (${summaryList.map((s) => s.setCode).join(", ")}) with ${Math.round(input.commonRatio * 100)}% target overlap.`,
  };
});
