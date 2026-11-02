import type { BlueprintDef, PlacedItem } from "./blueprint";

export type CandidateQuestion = {
  id: string;
  chapterId: string;
  type: string;
  difficulty?: string;
  subpartsMarks?: number;
  /** Shared by the sub-questions of one passage; such a question only fits a PASSAGE section. */
  passageGroupId?: string | null;
  /** MATCH_COLUMN: number of pairs. A multi-pair question fills that many slots of a match section at once. */
  matchPairs?: number;
};

const PASSAGE_PARENT_TYPES = new Set(["UNSEEN_PASSAGE", "CASE_STUDY", "REFERENCE_CONTEXT"]);

/** Pool key: question type plus whether it is a passage sub-question (P) or a stand-alone one (S). */
function poolKey(type: string, isPassageChild: boolean): string {
  return `${type}|${isPassageChild && !PASSAGE_PARENT_TYPES.has(type) ? "P" : "S"}`;
}

export type AutoFillResult = {
  added: {
    sectionId: string;
    questionId: string;
    orQuestionId?: string | null;
    requiresInternalChoice?: boolean;
    chapterId: string;
  }[];
  unfilled: { sectionId: string; title: string; count: number }[];
  complete: boolean;
  solverMode?: "optimal" | "greedy";
  exhaustedBudget?: boolean;
};

type Slot = {
  sectionId: string;
  title: string;
  type: string;
  poolKey: string;
  marksEach: number;
  /** Slots consumed (a multi-pair match question fills several) and the marks it carries. */
  units: number;
  cost: number;
  needsPairs?: number;
  order: number;
  requiresInternalChoice?: boolean;
};

function getItemUnits(item: PlacedItem, secCount: number): number {
  if (item.subpartsCount && item.subpartsCount > 1 && secCount >= item.subpartsCount) {
    return item.subpartsCount;
  }
  return 1;
}

function getItemMarks(item: PlacedItem, secMarksEach: number): number {
  if (item.marks && item.marks > 0) {
    return item.marks;
  }
  if (item.subpartsCount && item.subpartsCount > 1) {
    return item.subpartsCount * secMarksEach;
  }
  return secMarksEach;
}

/**
 * Pure auto-fill solver:
 * Takes a blueprint, currently placed items, and candidate questions from the question bank.
 * Assigns questions to remaining empty slots while strictly adhering to:
 * 1. Section question type constraints.
 * 2. Section total question counts.
 * 3. Chapter max marks weightage constraints.
 * 4. No duplicate questions.
 */
export type AutoFillOptions = {
  targetSectionId?: string;
  preferredDifficulty?: string;
  internalChoiceSectionIds?: Set<string>;
  isSlotChoiceRequired?: (sectionId: string, slotIndex: number, defaultRequired: boolean) => boolean;
};

export function autoFillPaper(
  bp: BlueprintDef,
  currentItems: (PlacedItem & { questionId?: string })[],
  candidatePool: CandidateQuestion[],
  excludedQuestionIds: string[] | AutoFillOptions = [],
  options?: AutoFillOptions,
): AutoFillResult {
  const actualExcluded: string[] = Array.isArray(excludedQuestionIds) ? excludedQuestionIds : [];
  const actualOptions = Array.isArray(excludedQuestionIds) ? options : excludedQuestionIds;
  const sectionById = new Map(bp.sections.map((s) => [s.id, s]));
  const usedQuestionIds = new Set([
    ...currentItems.map((i) => i.questionId).filter((id): id is string => Boolean(id)),
    ...actualExcluded,
  ]);

  // Compute remaining quota for each chapter
  const chapterRemaining = new Map<string, number>();
  for (const c of bp.chapters) {
    chapterRemaining.set(c.chapterId, c.marks);
  }
  for (const item of currentItems) {
    const sec = sectionById.get(item.sectionId);
    const marks = getItemMarks(item, sec?.marksEach ?? 0);
    const cur = chapterRemaining.get(item.chapterId) ?? 0;
    chapterRemaining.set(item.chapterId, Math.max(0, cur - marks));
  }

  // Count placed items per section
  const placedCount = new Map<string, number>();
  for (const item of currentItems) {
    const sec = sectionById.get(item.sectionId);
    const units = getItemUnits(item, sec?.count ?? 0);
    placedCount.set(item.sectionId, (placedCount.get(item.sectionId) ?? 0) + units);
  }

  // Build list of empty slots
  const slots: Slot[] = [];
  const preAdded: AutoFillResult["added"] = [];
  let order = 0;
  for (const sec of bp.sections) {
    if (actualOptions?.targetSectionId && sec.id !== actualOptions.targetSectionId) {
      continue;
    }
    const placed = placedCount.get(sec.id) ?? 0;
    const needed = Math.max(0, sec.count - placed);

    let slotOverrides: Record<number, boolean> | null = null;
    if (sec.orSlotsJson) {
      try {
        const parsed = JSON.parse(sec.orSlotsJson);
        if (Array.isArray(parsed)) {
          slotOverrides = {};
          parsed.forEach((s: any) => {
            if (typeof s?.slotIndex === "number" && typeof s?.required === "boolean") {
              slotOverrides![s.slotIndex] = s.required;
            }
          });
        }
      } catch {}
    }

    const defaultRequires = sec.orChoiceMode === "REQUIRED"
      ? true
      : sec.orChoiceMode === "NOT_REQUIRED"
        ? false
        : Boolean(actualOptions?.internalChoiceSectionIds?.has(sec.id));

    const multiMatch =
      sec.type === "MATCH_COLUMN" &&
      sec.count > 1 &&
      sec.marksEach === 1 &&
      candidatePool.some((c) => c.type === "MATCH_COLUMN" && c.matchPairs !== undefined);
    if (multiMatch && needed > 0) {
      const pool = candidatePool.filter((c) => c.type === "MATCH_COLUMN" && !usedQuestionIds.has(c.id) && (c.matchPairs ?? 0) > 0);
      const hasSingle = pool.some((c) => (c.matchPairs ?? 0) >= needed && (chapterRemaining.get(c.chapterId) ?? 0) >= needed);
      if (!hasSingle) {
        // No single question has enough pairs: combine up to three whose pair counts add up EXACTLY to the
        // section (a question always counts all of its pairs, so overshooting would overfill the section).
        const budget = new Map(chapterRemaining);
        const sorted = [...pool].sort((x, y) => (y.matchPairs ?? 0) - (x.matchPairs ?? 0));
        const search = (start: number, left: number, picked: CandidateQuestion[]): CandidateQuestion[] | null => {
          if (left === 0) return picked;
          if (picked.length >= 3) return null;
          for (let i = start; i < sorted.length; i++) {
            const c = sorted[i];
            const n = c.matchPairs ?? 0;
            if (n > left || (budget.get(c.chapterId) ?? 0) < n) continue;
            budget.set(c.chapterId, (budget.get(c.chapterId) ?? 0) - n);
            const found = search(i + 1, left - n, [...picked, c]);
            if (found) return found;
            budget.set(c.chapterId, (budget.get(c.chapterId) ?? 0) + n);
          }
          return null;
        };
        const picked = search(0, needed, []);
        if (picked) {
          for (const c of picked) {
            usedQuestionIds.add(c.id);
            preAdded.push({ sectionId: sec.id, questionId: c.id, orQuestionId: null, requiresInternalChoice: false, chapterId: c.chapterId });
          }
          for (const [k, v] of budget) chapterRemaining.set(k, v);
          continue;
        }
      }
      slots.push({
        sectionId: sec.id,
        title: sec.title,
        type: sec.type,
        poolKey: poolKey(sec.type, false),
        marksEach: sec.marksEach,
        units: needed,
        cost: needed * sec.marksEach,
        needsPairs: needed,
        order: order++,
        requiresInternalChoice: false,
      });
      continue;
    }

    for (let i = 0; i < needed; i++) {
      const slotIndex = placed + i;
      let requiresInternalChoice = defaultRequires;
      if (slotOverrides && typeof slotOverrides[slotIndex] === "boolean") {
        requiresInternalChoice = slotOverrides[slotIndex];
      }
      if (actualOptions?.isSlotChoiceRequired) {
        requiresInternalChoice = actualOptions.isSlotChoiceRequired(sec.id, slotIndex, requiresInternalChoice);
      }

      slots.push({
        sectionId: sec.id,
        title: sec.title,
        type: sec.type,
        poolKey: poolKey(sec.type, sec.role === "PASSAGE"),
        marksEach: sec.marksEach,
        units: 1,
        cost: sec.marksEach,
        order: order++,
        requiresInternalChoice,
      });
    }
  }

  if (slots.length === 0) {
    return { added: preAdded, unfilled: [], complete: true };
  }

  // Available unused candidates
  const available = candidatePool.filter((q) => !usedQuestionIds.has(q.id));

  // Sort slots by marksEach descending to fill larger marks first (avoids quota fragmentation)
  const sortedSlots = [...slots].sort((a, b) => b.cost / b.units - a.cost / a.units || a.order - b.order);

  // Group candidates by type
  const candidatesByType = new Map<string, CandidateQuestion[]>();
  for (const c of available) {
    const key = poolKey(c.type, Boolean(c.passageGroupId));
    const list = candidatesByType.get(key) ?? [];
    list.push(c);
    candidatesByType.set(key, list);
  }

  // Backtracking solver. It branches on WHICH CHAPTER a slot goes to (few options), not on which of many
  // interchangeable questions to use (huge), so exact-quota papers are solved in a handful of steps.
  const chosen = new Map<number, CandidateQuestion>();
  const chosenQuestionIds = new Set<string>();
  const chapterIds = bp.chapters.map((c) => c.chapterId);

  const difficultyRank = (c: CandidateQuestion) =>
    actualOptions?.preferredDifficulty &&
    actualOptions.preferredDifficulty !== "ANY" &&
    c.difficulty !== actualOptions.preferredDifficulty
      ? 1
      : 0;
  // candidates bucketed by pool and chapter, preferred difficulty first
  const buckets = new Map<string, CandidateQuestion[]>();
  for (const [key, list] of candidatesByType) {
    for (const ch of chapterIds) {
      buckets.set(
        `${key}#${ch}`,
        list.filter((c) => c.chapterId === ch).sort((x, y) => difficultyRank(x) - difficultyRank(y)),
      );
    }
  }
  const fits = (c: CandidateQuestion, slot: Slot) => {
    if (chosenQuestionIds.has(c.id)) return false;
    if (slot.needsPairs !== undefined) return (c.matchPairs ?? 0) >= slot.needsPairs;
    return c.subpartsMarks === undefined || c.subpartsMarks === slot.marksEach;
  };
  const firstFit = (slot: Slot, ch: string) =>
    (buckets.get(`${slot.poolKey}#${ch}`) ?? []).find((c) => fits(c, slot));

  let steps = 0;
  const maxSteps = 200000;
  let hitStepLimit = false;

  function solve(slotIdx: number): boolean {
    if (slotIdx >= sortedSlots.length) return true;
    if (++steps > maxSteps) {
      hitStepLimit = true;
      return false;
    }
    const slot = sortedSlots[slotIdx];
    const options = chapterIds
      .filter((ch) => (chapterRemaining.get(ch) ?? 0) >= slot.cost)
      .map((ch) => ({ ch, cand: firstFit(slot, ch) }))
      .filter((o): o is { ch: string; cand: CandidateQuestion } => Boolean(o.cand))
      .sort((x, y) => difficultyRank(x.cand) - difficultyRank(y.cand) || (chapterRemaining.get(y.ch) ?? 0) - (chapterRemaining.get(x.ch) ?? 0));
    const triedRemaining = new Set<string>();
    for (const { ch, cand } of options) {
      // chapters with identical remaining quota and nothing else different are interchangeable for feasibility
      const sig = `${chapterRemaining.get(ch)}|${(buckets.get(`${slot.poolKey}#${ch}`) ?? []).filter((c) => !chosenQuestionIds.has(c.id)).length}`;
      if (triedRemaining.has(sig)) continue;
      triedRemaining.add(sig);
      chosen.set(slot.order, cand);
      chosenQuestionIds.add(cand.id);
      const rem = chapterRemaining.get(ch) ?? 0;
      chapterRemaining.set(ch, rem - slot.cost);
      if (solve(slotIdx + 1)) return true;
      chosen.delete(slot.order);
      chosenQuestionIds.delete(cand.id);
      chapterRemaining.set(ch, rem);
    }
    return false;
  }

  const success = solve(0);

  // If backtracking couldn't find a 100% complete fill within step budget,
  // do a best-effort greedy fill so the teacher still gets maximum possible questions filled.
  if (!success) {
    chosen.clear();
    chosenQuestionIds.clear();

    // Reset remaining quota
    for (const c of bp.chapters) {
      chapterRemaining.set(c.chapterId, c.marks);
    }
    for (const item of currentItems) {
      const sec = sectionById.get(item.sectionId);
      const marks = getItemMarks(item, sec?.marksEach ?? 0);
      const cur = chapterRemaining.get(item.chapterId) ?? 0;
      chapterRemaining.set(item.chapterId, Math.max(0, cur - marks));
    }

    for (const slot of sortedSlots) {
      const pool = candidatesByType.get(slot.poolKey) ?? [];
      const valid = pool
        .filter((c) => {
          if (chosenQuestionIds.has(c.id)) return false;
          if (slot.needsPairs !== undefined) {
            if ((c.matchPairs ?? 0) < slot.needsPairs) return false;
          } else if (c.subpartsMarks !== undefined && c.subpartsMarks !== slot.marksEach) return false;
          return (chapterRemaining.get(c.chapterId) ?? 0) >= slot.cost;
        })
        .sort((a, b) => (chapterRemaining.get(b.chapterId) ?? 0) - (chapterRemaining.get(a.chapterId) ?? 0));

      if (valid.length > 0) {
        const cand = valid[0];
        chosen.set(slot.order, cand);
        chosenQuestionIds.add(cand.id);
        const rem = chapterRemaining.get(cand.chapterId) ?? 0;
        chapterRemaining.set(cand.chapterId, rem - slot.cost);
      }
    }
  }

  // Format result ordered by original section slot order
  const added: AutoFillResult["added"] = [];
  const unfilledMap = new Map<string, { title: string; count: number }>();

  for (const slot of slots) {
    const q = chosen.get(slot.order);
    if (q) {
      let orQuestionId: string | null = null;
      if (slot.requiresInternalChoice) {
        const pool = candidatesByType.get(slot.poolKey) ?? [];
        const orCand = pool.find(
          (c) =>
            c.id !== q.id &&
            !chosenQuestionIds.has(c.id) &&
            c.chapterId === q.chapterId &&
            slot.needsPairs === undefined &&
            (c.subpartsMarks === undefined || c.subpartsMarks === slot.marksEach),
        );
        if (orCand) {
          orQuestionId = orCand.id;
          chosenQuestionIds.add(orCand.id);
        }
      }
      added.push({
        sectionId: slot.sectionId,
        questionId: q.id,
        orQuestionId,
        requiresInternalChoice: slot.requiresInternalChoice,
        chapterId: q.chapterId,
      });
    } else {
      const cur = unfilledMap.get(slot.sectionId) ?? { title: slot.title, count: 0 };
      cur.count++;
      unfilledMap.set(slot.sectionId, cur);
    }
  }

  const unfilled = Array.from(unfilledMap.entries()).map(([sectionId, info]) => ({
    sectionId,
    title: info.title,
    count: info.count,
  }));

  added.unshift(...preAdded);
  const complete = unfilled.length === 0 && slots.length === added.length - preAdded.length;
  // a collapsed multi-pair match slot reports every slot it stands for
  for (const u of unfilled) {
    const s = slots.find((x) => x.sectionId === u.sectionId && x.needsPairs !== undefined);
    if (s) u.count = s.units;
  }
  const solverMode = success ? "optimal" : "greedy";

  return { added, unfilled, complete, solverMode, exhaustedBudget: hitStepLimit };
}
