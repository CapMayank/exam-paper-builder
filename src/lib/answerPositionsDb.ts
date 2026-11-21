// Applies answerPositions plans to a paper's stored questions. Only questions that belong to this paper alone are
// rearranged (a bank question shared with another paper, or anything on a finalised paper, keeps its order, since
// it may already be printed); they still count when spreading the answers.

import { planMatch, planMcqPositions, type MatchUnit, type McqUnit, type Rand } from "./answerPositions";
import { prisma } from "./prisma";

type Row = { id: string; type: string; text: string; optionsJson: string; subpartsJson: string; answer: string };

function parse(json: string | null | undefined): unknown {
  try {
    return JSON.parse(json || "null");
  } catch {
    return null;
  }
}

function partList(container: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(container)) return container;
  if (container && typeof container === "object") {
    const c = container as { items?: unknown; subparts?: unknown };
    if (Array.isArray(c.items)) return c.items as Record<string, unknown>[];
    if (Array.isArray(c.subparts)) return c.subparts as Record<string, unknown>[];
  }
  return null;
}

/** MCQ parts (any depth) with their index path, e.g. "2" or "0.1". */
function mcqParts(list: Record<string, unknown>[], prefix = ""): { path: string; part: Record<string, unknown> }[] {
  return list.flatMap((sp, i) => {
    if (!sp || typeof sp !== "object") return [];
    const path = prefix ? `${prefix}.${i}` : String(i);
    const nested = Array.isArray(sp.subparts) ? mcqParts(sp.subparts as Record<string, unknown>[], path) : [];
    const own = Array.isArray(sp.options) && sp.options.length > 0 ? [{ path, part: sp }] : [];
    return [...own, ...nested];
  });
}

const stringArray = (v: unknown) => (Array.isArray(v) ? v.map((o) => String(o)) : []);

export type BalanceResult = { changedQuestions: string[]; skippedShared: number };

/**
 * Spreads a paper's correct answers: MCQs (and MCQ parts) so no letter dominates or runs three times, match
 * questions so no item sits opposite its match, each key moved with its option. `shuffleUnanswered` also shuffles
 * questions that have no key yet (used right after an import, before any key is written).
 */
export async function balancePaperAnswerPositions(
  paperId: string,
  opts: { shuffleUnanswered?: boolean; /** Limits shuffleUnanswered to these questions (the ones just imported). */ freshIds?: readonly string[]; rand?: Rand } = {},
): Promise<BalanceResult> {
  const rand = opts.rand ?? Math.random;
  const fields = { id: true, type: true, text: true, optionsJson: true, subpartsJson: true, answer: true } as const;
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: {
      status: true,
      items: {
        select: { position: true, section: { select: { position: true } }, question: { select: fields }, orQuestion: { select: fields } },
      },
    },
  });
  if (!paper) return { changedQuestions: [], skippedShared: 0 };

  const items = [...paper.items].sort((a, b) => a.section.position - b.section.position || a.position - b.position);
  const rows: Row[] = items.flatMap((it) => (it.orQuestion ? [it.question, it.orQuestion] : [it.question]));
  const ids = [...new Set(rows.map((r) => r.id))];

  // questions also placed on another paper keep their order
  const elsewhere = await prisma.paperQuestion.findMany({
    where: { paperId: { not: paperId }, OR: [{ questionId: { in: ids } }, { orQuestionId: { in: ids } }] },
    select: { questionId: true, orQuestionId: true },
  });
  const shared = new Set(elsewhere.flatMap((e) => [e.questionId, e.orQuestionId].filter((x): x is string => Boolean(x))));
  const movable = (id: string) => paper.status !== "FINAL" && !shared.has(id);
  const freshSet = opts.freshIds ? new Set(opts.freshIds) : null;
  const fresh = (id: string) => !freshSet || freshSet.has(id);

  const mcqs: McqUnit[] = [];
  const matches: MatchUnit[] = [];
  const parsedParts = new Map<string, { container: unknown; parts: { path: string; part: Record<string, unknown> }[] }>();
  for (const r of rows) {
    if (r.type === "MCQ") {
      mcqs.push({ key: r.id, options: stringArray(parse(r.optionsJson)), answer: r.answer ?? "", movable: movable(r.id), fresh: fresh(r.id) });
    } else if (r.type === "MATCH_COLUMN") {
      matches.push({ key: r.id, text: r.text, options: stringArray(parse(r.optionsJson)), answer: r.answer ?? "", movable: movable(r.id), fresh: fresh(r.id) });
    }
    const container = parse(r.subpartsJson);
    const list = partList(container);
    if (list) {
      const parts = mcqParts(list);
      if (parts.length > 0) {
        parsedParts.set(r.id, { container, parts });
        for (const { path, part } of parts) {
          mcqs.push({ key: `${r.id}#${path}`, options: stringArray(part.options), answer: typeof part.answer === "string" ? part.answer : "", movable: movable(r.id), fresh: fresh(r.id) });
        }
      }
    }
  }

  const mcqPlan = planMcqPositions(mcqs, rand, { shuffleUnanswered: opts.shuffleUnanswered });
  const updates = new Map<string, { optionsJson?: string; answer?: string; subpartsJson?: string }>();
  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const [key, change] of mcqPlan) {
    const [qid, path] = key.split("#");
    const u = updates.get(qid) ?? {};
    if (path === undefined) {
      u.optionsJson = JSON.stringify(change.options);
      u.answer = change.answer;
    } else {
      const entry = parsedParts.get(qid);
      const target = entry?.parts.find((p) => p.path === path);
      if (!entry || !target) continue;
      target.part.options = change.options;
      if (change.answer) target.part.answer = change.answer;
      u.subpartsJson = JSON.stringify(entry.container);
    }
    updates.set(qid, u);
  }
  for (const m of matches) {
    const change = planMatch(m, rand, { shuffleUnanswered: opts.shuffleUnanswered });
    if (!change) continue;
    updates.set(m.key, { ...(updates.get(m.key) ?? {}), optionsJson: JSON.stringify(change.options), answer: change.answer });
  }

  const changedQuestions: string[] = [];
  for (const [qid, data] of updates) {
    const before = byId.get(qid)!;
    // only if nobody edited the question meanwhile
    const { count } = await prisma.question.updateMany({
      where: { id: qid, optionsJson: before.optionsJson, answer: before.answer, subpartsJson: before.subpartsJson },
      data,
    });
    if (count > 0) changedQuestions.push(qid);
  }
  return { changedQuestions, skippedShared: ids.filter((id) => shared.has(id)).length };
}
