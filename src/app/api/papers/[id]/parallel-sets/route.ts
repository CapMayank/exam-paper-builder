import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { permuteMcqOptions, planMultiSetDistribution } from "@/lib/multiset";
import { assertCanCopyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { isQuestionContaminated } from "@/lib/questionValidator";
import { isVariantCopy, paperCopyData, questionCopyData, variantSubpartsColumn } from "@/lib/questionWrite";

const parallelSetsSchema = z.object({
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
          book: true,
          sections: { orderBy: { position: "asc" } },
          chapters: { include: { chapter: true } },
        },
      },
      slotMoves: true,
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
  assertCanCopyPaper(user, source);
  if (source.items.length === 0) {
    throw new HttpError(400, "Source paper has no questions placed. Place questions before generating parallel sets.");
  }

  // 2. Candidate questions from the bank for this book: no contaminated legacy questions, and none of the
  //    shuffled or re-tagged copies that belong to another paper.
  const rawBankQuestions = await prisma.question.findMany({ where: { bookId: source.blueprint.bookId } });

  const bankQuestions = rawBankQuestions.filter((q) => {
    if (isVariantCopy(q.subpartsJson)) return false;
    let parsedOptions: string[] | undefined;
    if (q.optionsJson) {
      try {
        parsedOptions = JSON.parse(q.optionsJson);
      } catch {
        parsedOptions = undefined;
      }
    }
    return !isQuestionContaminated(
      { text: q.text, options: parsedOptions, answer: q.answer },
      source.blueprint.book.subject,
      source.blueprint.book.className
    ).contaminated;
  });

  // every question a set can end up with: the bank's, and the source paper's own (which may be copies)
  const questionBankLookup = new Map(rawBankQuestions.map((q) => [q.id, q]));
  const sourceItemById = new Map(source.items.map((it) => [it.id, it]));

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
            ...paperCopyData(source),
            title: newTitle,
            paperSet: formattedSet,
            status: "DRAFT",
            createdById: user.id,
            // every set keeps the source's slot layout, so its marks add up the same way
            slotMoves: { create: source.slotMoves.map((m) => ({ sectionId: m.sectionId, delta: m.delta })) },
          },
        });

        /** The set's own copy of an MCQ with its options mixed; the question itself when it cannot be shuffled. */
        const shuffledCopy = async (questionId: string): Promise<string> => {
          const q = questionBankLookup.get(questionId);
          if (!input.shuffleMcqOptions || !q || q.type !== "MCQ") return questionId;
          let options: string[];
          try {
            const parsed = JSON.parse(q.optionsJson);
            if (!Array.isArray(parsed) || parsed.length < 2) return questionId;
            options = parsed.map(String);
          } catch {
            return questionId;
          }
          const permuted = permuteMcqOptions(options, q.answer);
          const forked = await tx.question.create({
            data: {
              ...questionCopyData(q),
              optionsJson: JSON.stringify(permuted.options),
              answer: permuted.answer,
              subpartsJson: variantSubpartsColumn(q.subpartsJson, { forkedFrom: q.id, paperId: createdPaper.id, paperSet: formattedSet }),
              createdById: user.id,
            },
          });
          return forked.id;
        };

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
          const from = sourceItemById.get(itemPlan.sourceItemId);
          await tx.paperQuestion.create({
            data: {
              paperId: createdPaper.id,
              sectionId: itemPlan.sectionId,
              questionId: await shuffledCopy(itemPlan.questionId),
              orQuestionId: itemPlan.orQuestionId ? await shuffledCopy(itemPlan.orQuestionId) : null,
              position: itemPlan.position,
              componentKey: from?.componentKey ?? "",
              // the instruction was written for the Set 1 question; a different question gets the automatic one
              instruction: itemPlan.questionId === itemPlan.originalQuestionId ? from?.instruction ?? "" : "",
              // a page break belongs to a place on the sheet, not to a question that has just moved
              pageBreakBefore: input.shufflePositions ? false : Boolean(from?.pageBreakBefore),
              // a replacement match has as many pairs as the one it replaces (see multiset), so the pair value carries over
              pairMarks: from?.pairMarks ?? null,
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

  for (const p of summaryList) {
    await recordAudit(user, "PAPER_CREATE", "PAPER", p.id, {
      action: "PARALLEL_SET_GENERATED",
      parentPaperId: source.id,
      setCode: p.setCode,
      title: p.title,
      commonCount: p.commonCount,
      variantCount: p.variantCount,
    });
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
