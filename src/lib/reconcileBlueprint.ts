import { parseMatchColumnPairs } from "./constants";
import { parseSubparts, parseSubpartsPayload, subpartsTotalMarks } from "./types";

export interface ReconcileItemInput {
  paperItemId: string;
  questionId: string;
  sectionId: string;
  chapterId: string;
  type: string;
  text: string;
  optionsJson?: string;
  subpartsJson?: string;
}

export interface ReconcileChapterInput {
  chapterId: string;
  title: string;
  marks: number;
}

export interface ReconcileSectionInput {
  id: string;
  title: string;
  type: string;
  count: number;
  marksEach: number;
}

export interface ReassignmentResult {
  questionId: string;
  paperItemId: string;
  fromChapterId: string;
  toChapterId: string;
  marks: number;
  reason: string;
}

export interface ReconcileBlueprintOutput {
  reassignments: ReassignmentResult[];
  isBalanced: boolean;
  unreconciledExcessMarks: number;
  unreconciledDeficitMarks: number;
  summary: string;
}

/**
 * Calculates effective marks of a question item accounting for MATCH_COLUMN pairs and subparts.
 */
export function getEffectiveQuestionMarks(
  item: { type: string; text: string; optionsJson?: string; subpartsJson?: string; explanation?: string },
  sectionMarksEach: number,
): number {
  if (item.type === "MATCH_COLUMN") {
    let opts: string[] = [];
    try {
      opts = JSON.parse(item.optionsJson || "[]");
    } catch {}
    const pairs = parseMatchColumnPairs(opts, item.text, item.explanation);
    if (pairs.length > 0) return pairs.length * sectionMarksEach;
  }

  const { subparts, attemptCount } = parseSubpartsPayload(item.subpartsJson);
  const subTotal = attemptCount
    ? attemptCount * (subparts[0]?.marks || 1)
    : subpartsTotalMarks(subparts);
  if (subTotal > 0) return subTotal;

  return sectionMarksEach;
}

/**
 * Pure blueprint reconciliation solver:
 * Rebalances placed questions from chapters with EXCESS marks to chapters with DEFICIT marks,
 * prioritizing exact mark denomination matches and keyword topic relevance.
 */
export function reconcileBlueprintQuestions(params: {
  chapters: ReconcileChapterInput[];
  sections: ReconcileSectionInput[];
  items: ReconcileItemInput[];
}): ReconcileBlueprintOutput {
  const { chapters, sections, items } = params;
  const sectionById = new Map(sections.map((s) => [s.id, s]));

  // Working copy of items with calculated marks and mutable chapterId
  const workingItems = items.map((it) => {
    const sec = sectionById.get(it.sectionId);
    const marks = getEffectiveQuestionMarks(it, sec?.marksEach ?? 1);
    return {
      ...it,
      marks,
      currentChapterId: it.chapterId,
    };
  });

  const reassignments: ReassignmentResult[] = [];

  // Helper to calculate current marks per chapter
  function calculateCurrentMarks(): Map<string, number> {
    const map = new Map<string, number>();
    for (const c of chapters) map.set(c.chapterId, 0);
    for (const it of workingItems) {
      map.set(it.currentChapterId, (map.get(it.currentChapterId) ?? 0) + it.marks);
    }
    return map;
  }

  // Tokenize string for topic matching
  function getTokens(str: string): Set<string> {
    return new Set(
      str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  }

  const chapterTokens = new Map(chapters.map((c) => [c.chapterId, getTokens(c.title)]));

  // Iteratively reassign questions from excess chapters to deficit chapters
  let maxPasses = 100;
  while (maxPasses-- > 0) {
    const marksMap = calculateCurrentMarks();

    const excessChapters = chapters
      .map((c) => ({
        ...c,
        excess: (marksMap.get(c.chapterId) ?? 0) - c.marks,
      }))
      .filter((c) => c.excess > 0)
      .sort((a, b) => b.excess - a.excess);

    const deficitChapters = chapters
      .map((c) => ({
        ...c,
        deficit: c.marks - (marksMap.get(c.chapterId) ?? 0),
      }))
      .filter((c) => c.deficit > 0)
      .sort((a, b) => b.deficit - a.deficit);

    if (excessChapters.length === 0 || deficitChapters.length === 0) break;

    let matched = false;

    // 1. Pass: Try to find a question in an excess chapter whose marks EXACTLY match a deficit
    for (const excessChap of excessChapters) {
      const candidates = workingItems.filter((it) => it.currentChapterId === excessChap.chapterId);

      for (const q of candidates) {
        if (q.marks > excessChap.excess) continue;

        // Exact match for deficit
        const exactDeficit = deficitChapters.find((d) => d.deficit === q.marks);
        if (exactDeficit) {
          reassignments.push({
            questionId: q.questionId,
            paperItemId: q.paperItemId,
            fromChapterId: q.currentChapterId,
            toChapterId: exactDeficit.chapterId,
            marks: q.marks,
            reason: `Realigned ${q.marks}m question from excess chapter (${excessChap.title}) to exact deficit in (${exactDeficit.title}).`,
          });
          q.currentChapterId = exactDeficit.chapterId;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (matched) continue;

    // 2. Pass: Find a question in an excess chapter whose marks fit within a deficit (<= deficit)
    // Prioritize candidates with highest keyword topic overlap with the deficit chapter
    for (const excessChap of excessChapters) {
      const candidates = workingItems
        .filter((it) => it.currentChapterId === excessChap.chapterId)
        .sort((a, b) => a.marks - b.marks);

      for (const q of candidates) {
        if (q.marks > excessChap.excess) continue;

        const eligibleDeficits = deficitChapters.filter((d) => d.deficit >= q.marks);
        if (eligibleDeficits.length > 0) {
          // Sort by keyword overlap with question text
          const qTokens = getTokens(q.text);
          eligibleDeficits.sort((a, b) => {
            const aTokens = chapterTokens.get(a.chapterId) ?? new Set();
            const bTokens = chapterTokens.get(b.chapterId) ?? new Set();
            let aOverlap = 0;
            let bOverlap = 0;
            for (const t of qTokens) {
              if (aTokens.has(t)) aOverlap++;
              if (bTokens.has(t)) bOverlap++;
            }
            return bOverlap - aOverlap || b.deficit - a.deficit;
          });

          const bestDeficit = eligibleDeficits[0];
          reassignments.push({
            questionId: q.questionId,
            paperItemId: q.paperItemId,
            fromChapterId: q.currentChapterId,
            toChapterId: bestDeficit.chapterId,
            marks: q.marks,
            reason: `Realigned ${q.marks}m question from excess chapter (${excessChap.title}) to fit deficit in (${bestDeficit.title}).`,
          });
          q.currentChapterId = bestDeficit.chapterId;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      // 3. Fallback: If no single candidate fits <= excess and <= deficit, pick any candidate
      // from the highest excess chapter to the highest deficit chapter
      const highestExcess = excessChapters[0];
      const highestDeficit = deficitChapters[0];
      const candidate = workingItems.find((it) => it.currentChapterId === highestExcess.chapterId);

      if (candidate) {
        reassignments.push({
          questionId: candidate.questionId,
          paperItemId: candidate.paperItemId,
          fromChapterId: candidate.currentChapterId,
          toChapterId: highestDeficit.chapterId,
          marks: candidate.marks,
          reason: `Reallocated ${candidate.marks}m question to balance chapter quotas between (${highestExcess.title}) and (${highestDeficit.title}).`,
        });
        candidate.currentChapterId = highestDeficit.chapterId;
        matched = true;
      } else {
        break;
      }
    }
  }

  const finalMarks = calculateCurrentMarks();
  let unreconciledExcess = 0;
  let unreconciledDeficit = 0;

  for (const c of chapters) {
    const cur = finalMarks.get(c.chapterId) ?? 0;
    if (cur > c.marks) unreconciledExcess += cur - c.marks;
    if (cur < c.marks) unreconciledDeficit += c.marks - cur;
  }

  const isBalanced = unreconciledExcess === 0 && unreconciledDeficit === 0;

  const summary =
    reassignments.length === 0
      ? "All questions already match the blueprint chapter quotas."
      : isBalanced
      ? `Successfully realigned ${reassignments.length} question(s). All chapter marks now match blueprint quotas perfectly.`
      : `Realigned ${reassignments.length} question(s). Chapter distribution improved (${unreconciledDeficit}m deficit remaining).`;

  return {
    reassignments,
    isBalanced,
    unreconciledExcessMarks: unreconciledExcess,
    unreconciledDeficitMarks: unreconciledDeficit,
    summary,
  };
}
