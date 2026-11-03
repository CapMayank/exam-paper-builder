import { HttpError, route } from "@/lib/api";
import { fillMissingAnswers, findMissingAnswer, mergeGeneratedAnswer, type GeneratedAnswer } from "@/lib/answerKeyFill";
import { recordAudit } from "@/lib/audit";
import { generateAnswerKeyWithGemini } from "@/lib/gemini";
import { canModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";

const answerFields = { id: true, type: true, text: true, optionsJson: true, subpartsJson: true, answer: true } as const;

/**
 * Builds the answer key: answers already stored are used as they are, and only the
 * questions without one are sent to the AI. Each generated answer is saved to its
 * question (blanks only), then the refreshed paper comes back with what is still missing.
 */
export const POST = route(async (req, { id }, user) => {
  const paper = await prisma.paper.findUnique({
    where: { id },
    select: {
      createdById: true,
      blueprint: { select: { book: { select: { className: true, subject: true } } } },
      items: {
        orderBy: { position: "asc" },
        select: {
          section: { select: { marksEach: true } },
          question: { select: answerFields },
          orQuestion: { select: answerFields },
        },
      },
    },
  });
  if (!paper) throw new HttpError(404, "Paper not found");
  // Filling a blank answer never changes what the paper prints, so its owners may do it after finalising too.
  if (!canModifyPaper(user, { createdById: paper.createdById })) {
    throw new HttpError(403, "Only the paper creator, Department Head (HOD), or Administrator can generate missing answers.");
  }

  const marksById = new Map<string, number>();
  const questions = paper.items.flatMap((it) => {
    const list = it.orQuestion ? [it.question, it.orQuestion] : [it.question];
    for (const q of list) marksById.set(q.id, it.section.marksEach);
    return list;
  });

  const customKey = req.headers.get("x-gemini-api-key");
  const result = await fillMissingAnswers({
    questions,
    batchSize: 10,
    generate: async (batch) => {
      // short keys instead of cuids: the model copies "q3" back reliably, a 25-char id not always
      const idByKey = new Map(batch.map((need, i) => [`q${i + 1}`, need.id]));
      const res = await generateAnswerKeyWithGemini({
        className: paper.blueprint.book.className,
        subject: paper.blueprint.book.subject,
        items: batch.map((need, i) => ({ ...need, id: `q${i + 1}`, marks: marksById.get(need.id) })),
        apiKey: customKey,
      });
      if (!res.success || res.isMock) throw new Error(res.error || "AI answer generation is unavailable right now.");
      const answers = new Map<string, GeneratedAnswer>();
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.answers) ? res.data.answers : [];
      for (const a of list) {
        // accept "q3", "Q3" or a bare 3
        const key = a && (typeof a.id === "string" || typeof a.id === "number") ? String(a.id).trim().toLowerCase() : "";
        const questionId = idByKey.get(key) ?? idByKey.get(`q${key}`);
        if (questionId) answers.set(questionId, { answer: a.answer, subparts: a.subparts });
      }
      if (answers.size === 0) console.warn("Answer key: no usable answers in AI reply:", res.rawResponse?.slice(0, 500));
      return answers;
    },
    save: (questionId, generated) =>
      prisma.$transaction(async (tx) => {
        // merge into the row as it is now, and only write if nobody changed it since
        const current = await tx.question.findUnique({ where: { id: questionId }, select: answerFields });
        if (!current) throw new Error("Question no longer exists");
        const merged = mergeGeneratedAnswer(current, generated);
        if (!merged.filledMain && merged.filledPaths.length === 0) {
          // complete by now means a teacher filled it in meanwhile; otherwise the AI output was unusable
          return findMissingAnswer(current) ? "nothing" : "kept";
        }
        const { count } = await tx.question.updateMany({
          where: { id: questionId, answer: current.answer, subpartsJson: current.subpartsJson },
          data: { answer: merged.answer, subpartsJson: merged.subpartsJson },
        });
        return count > 0 ? "saved" : "kept";
      }),
  });

  if (result.saved.length > 0) {
    await recordAudit(user, "QUESTION_BULK_UPDATE", "PAPER", id, {
      action: "ANSWER_KEY_FILL_MISSING",
      questionIds: result.saved,
      failed: result.failed.length,
    });
  }

  return { ...result, paper: await loadPaperView(id) };
});
