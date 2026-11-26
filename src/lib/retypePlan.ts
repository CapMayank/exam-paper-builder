// Which bank questions to give a closer type, and which to leave because a paper depends on their type. Shared by
// the bank's "Check types" apply route and the one-time sweep (scripts/retype-questions.ts). Takes the client as
// an argument so the script can pass its own.
import type { Prisma, PrismaClient } from "@prisma/client";
import { isTypeAllowed, typeLabel, withEffectiveAllowedTypes } from "./sectionTypes";
import { suggestQuestionType } from "./typeInference";
import { parseSubpartsPayload } from "./types";

type Book = { className: string; subject: string };
type Use = { paper: { title: string; status: string }; section: { title: string; type: string; marksEach: number; allowedTypesJson: string } };

/** Why a question placed in these papers cannot take `to`, or null when every placement accepts it. */
export function placementBlock(uses: Use[], book: Book, to: string): string | null {
  const final = uses.find((u) => u.paper.status === "FINAL");
  if (final) return `used in the finalised paper "${final.paper.title}"`;
  const refusing = uses.find((u) => !isTypeAllowed(withEffectiveAllowedTypes(u.section, book), to));
  if (refusing) return `placed in "${refusing.section.title}" of "${refusing.paper.title}", which does not take ${typeLabel(to)}`;
  return null;
}

const useSelect = {
  select: {
    paper: { select: { title: true, status: true } },
    section: { select: { title: true, type: true, marksEach: true, allowedTypesJson: true } },
  },
} as const;

export const retypeQuestionSelect = {
  id: true,
  type: true,
  text: true,
  subpartsJson: true,
  book: { select: { className: true, subject: true, title: true } },
  chapter: { select: { number: true, title: true } },
  paperQuestions: useSelect,
  orPaperQuestions: useSelect,
} satisfies Prisma.QuestionSelect;

type Row = Prisma.QuestionGetPayload<{ select: typeof retypeQuestionSelect }>;

export type RetypeCandidate = {
  id: string;
  from: string;
  to: string;
  reason: string;
  text: string;
  where: string;
  /** Set when the question is left as it is: why. */
  keptBecause: string | null;
};

/** The closer type for one loaded question, with whether its papers allow the change; null when its type fits. */
export function retypeCandidate(q: Row): RetypeCandidate | null {
  const s = suggestQuestionType({
    type: q.type,
    text: q.text,
    subparts: parseSubpartsPayload(q.subpartsJson).subparts,
    chapterTitle: q.chapter.title,
    subject: q.book.subject,
    className: q.book.className,
  });
  if (!s) return null;
  return {
    id: q.id,
    from: q.type,
    to: s.type,
    reason: s.reason,
    text: q.text,
    where: `${q.book.className} ${q.book.subject} · Ch ${q.chapter.number} ${q.chapter.title}`,
    keptBecause: placementBlock([...q.paperQuestions, ...q.orPaperQuestions], q.book, s.type),
  };
}

/** Every question matching `where` whose type looks wrong. */
export async function planRetypes(db: PrismaClient, where: Prisma.QuestionWhereInput = {}): Promise<RetypeCandidate[]> {
  const rows = await db.question.findMany({ where, select: retypeQuestionSelect, orderBy: { createdAt: "asc" } });
  return rows.map(retypeCandidate).filter((c): c is RetypeCandidate => c !== null);
}
