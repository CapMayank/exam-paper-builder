import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { permuteMcqOptions, shuffle } from "@/lib/multiset";
import { assertCanCopyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { itemCopyData, paperCopyData, questionCopyData, variantSubpartsColumn } from "@/lib/questionWrite";

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
      blueprint: { select: { book: { select: { className: true, subject: true } } } },
      slotMoves: true,
      items: {
        include: {
          question: true,
          orQuestion: true,
        },
      },
    },
  });

  if (!source) throw new HttpError(404, "Paper not found");
  assertCanCopyPaper(user, source);

  const formattedSet = input.targetSet.toUpperCase().startsWith("SET")
    ? input.targetSet.toUpperCase()
    : `SET ${input.targetSet.toUpperCase()}`;

  const baseTitle = source.title.replace(/\s*\([^)]*SET[^)]*\)/i, "").trim();
  const newTitle = `${baseTitle} (${formattedSet})`;

  // Group items by section to preserve section grouping
  const sectionsMap = new Map<string, typeof source.items>();
  for (const it of source.items) {
    const list = sectionsMap.get(it.sectionId) ?? [];
    list.push(it);
    sectionsMap.set(it.sectionId, list);
  }

  const newPaper = await prisma.$transaction(
    async (tx) => {
      const created = await tx.paper.create({
        data: {
          ...paperCopyData(source),
          title: newTitle,
          paperSet: formattedSet,
          status: "DRAFT",
          createdById: user.id,
          slotMoves: { create: source.slotMoves.map((m) => ({ sectionId: m.sectionId, delta: m.delta })) },
        },
      });

      /** The set's own copy of an MCQ with its options mixed; the original when it cannot be shuffled. */
      const shuffledCopy = async (q: (typeof source.items)[number]["question"]): Promise<string> => {
        if (!input.shuffleMcqOptions || q.type !== "MCQ") return q.id;
        let options: string[];
        try {
          const parsed = JSON.parse(q.optionsJson);
          if (!Array.isArray(parsed) || parsed.length < 2) return q.id;
          options = parsed.map(String);
        } catch {
          return q.id;
        }
        const permuted = permuteMcqOptions(options, q.answer);
        const forked = await tx.question.create({
          data: {
            ...questionCopyData(q),
            optionsJson: JSON.stringify(permuted.options),
            answer: permuted.answer,
            subpartsJson: variantSubpartsColumn(q.subpartsJson, { forkedFrom: q.id, paperId: created.id, paperSet: formattedSet }),
            createdById: user.id,
          },
        });
        return forked.id;
      };

      for (const [, items] of sectionsMap.entries()) {
        const orderedItems = input.shuffleQuestions ? shuffle(items) : [...items].sort((a, b) => a.position - b.position);
        for (let pos = 0; pos < orderedItems.length; pos++) {
          const it = orderedItems[pos];
          await tx.paperQuestion.create({
            data: {
              ...itemCopyData(it),
              paperId: created.id,
              position: pos,
              // a page break belongs to a place on the sheet, not to a question that has just moved
              pageBreakBefore: input.shuffleQuestions ? false : it.pageBreakBefore,
              questionId: await shuffledCopy(it.question),
              orQuestionId: it.orQuestion ? await shuffledCopy(it.orQuestion) : null,
            },
          });
        }
      }
      return created;
    },
    { timeout: 20000 },
  );

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
