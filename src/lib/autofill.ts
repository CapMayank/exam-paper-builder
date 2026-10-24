import type { BlueprintDef, PlacedItem } from "./blueprint";

export type CandidateQuestion = {
  id: string;
  chapterId: string;
  type: string;
  difficulty?: string;
  subpartsMarks?: number;
};

export type AutoFillResult = {
  added: { sectionId: string; questionId: string; chapterId: string }[];
  unfilled: { sectionId: string; title: string; count: number }[];
  complete: boolean;
  solverMode?: "optimal" | "greedy";
  exhaustedBudget?: boolean;
};

type Slot = {
  sectionId: string;
  title: string;
  type: string;
  marksEach: number;
  order: number;
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
export function autoFillPaper(
  bp: BlueprintDef,
  currentItems: (PlacedItem & { questionId: string })[],
  candidatePool: CandidateQuestion[],
  excludedQuestionIds: string[] | { targetSectionId?: string; preferredDifficulty?: string } = [],
  options?: {
    targetSectionId?: string;
    preferredDifficulty?: string;
  },
): AutoFillResult {
  const actualExcluded: string[] = Array.isArray(excludedQuestionIds) ? excludedQuestionIds : [];
  const actualOptions = Array.isArray(excludedQuestionIds) ? options : excludedQuestionIds;
  const sectionById = new Map(bp.sections.map((s) => [s.id, s]));
  const usedQuestionIds = new Set([
    ...currentItems.map((i) => i.questionId),
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
  let order = 0;
  for (const sec of bp.sections) {
    if (actualOptions?.targetSectionId && sec.id !== actualOptions.targetSectionId) {
      continue;
    }
    const placed = placedCount.get(sec.id) ?? 0;
    const needed = Math.max(0, sec.count - placed);
    for (let i = 0; i < needed; i++) {
      slots.push({
        sectionId: sec.id,
        title: sec.title,
        type: sec.type,
        marksEach: sec.marksEach,
        order: order++,
      });
    }
  }

  if (slots.length === 0) {
    return { added: [], unfilled: [], complete: true };
  }

  // Available unused candidates
  const available = candidatePool.filter((q) => !usedQuestionIds.has(q.id));

  // Sort slots by marksEach descending to fill larger marks first (avoids quota fragmentation)
  const sortedSlots = [...slots].sort((a, b) => b.marksEach - a.marksEach || a.order - b.order);

  // Group candidates by type
  const candidatesByType = new Map<string, CandidateQuestion[]>();
  for (const c of available) {
    const list = candidatesByType.get(c.type) ?? [];
    list.push(c);
    candidatesByType.set(c.type, list);
  }

  // Backtracking solver
  const chosen = new Map<number, CandidateQuestion>();
  const chosenQuestionIds = new Set<string>();

  let steps = 0;
  const maxSteps = 4000;
  let hitStepLimit = false;

  function solve(slotIdx: number): boolean {
    if (slotIdx >= sortedSlots.length) return true;
    if (++steps > maxSteps) {
      hitStepLimit = true;
      return false;
    }

    const slot = sortedSlots[slotIdx];
    const pool = candidatesByType.get(slot.type) ?? [];

    // Filter valid candidates for this slot
    const validCandidates = pool.filter((c) => {
      if (chosenQuestionIds.has(c.id)) return false;
      // If the candidate has explicit subpart marks, they must strictly match the slot marks
      if (c.subpartsMarks !== undefined && c.subpartsMarks !== slot.marksEach) return false;
      const rem = chapterRemaining.get(c.chapterId) ?? 0;
      return rem >= slot.marksEach;
    });

    // Heuristic: Pick from preferred difficulty first, then highest remaining chapter quota
    validCandidates.sort((a, b) => {
      if (actualOptions?.preferredDifficulty && actualOptions.preferredDifficulty !== "ANY") {
        const aDiff = a.difficulty === actualOptions.preferredDifficulty ? 0 : 1;
        const bDiff = b.difficulty === actualOptions.preferredDifficulty ? 0 : 1;
        if (aDiff !== bDiff) return aDiff - bDiff;
      }
      const remA = chapterRemaining.get(a.chapterId) ?? 0;
      const remB = chapterRemaining.get(b.chapterId) ?? 0;
      return remB - remA;
    });

    for (const cand of validCandidates) {
      // Pick
      chosen.set(slot.order, cand);
      chosenQuestionIds.add(cand.id);
      const rem = chapterRemaining.get(cand.chapterId) ?? 0;
      chapterRemaining.set(cand.chapterId, rem - slot.marksEach);

      if (solve(slotIdx + 1)) return true;

      // Undo
      chosen.delete(slot.order);
      chosenQuestionIds.delete(cand.id);
      chapterRemaining.set(cand.chapterId, rem);
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
      const pool = candidatesByType.get(slot.type) ?? [];
      const valid = pool
        .filter((c) => {
          if (chosenQuestionIds.has(c.id)) return false;
          if (c.subpartsMarks !== undefined && c.subpartsMarks !== slot.marksEach) return false;
          return (chapterRemaining.get(c.chapterId) ?? 0) >= slot.marksEach;
        })
        .sort((a, b) => (chapterRemaining.get(b.chapterId) ?? 0) - (chapterRemaining.get(a.chapterId) ?? 0));

      if (valid.length > 0) {
        const cand = valid[0];
        chosen.set(slot.order, cand);
        chosenQuestionIds.add(cand.id);
        const rem = chapterRemaining.get(cand.chapterId) ?? 0;
        chapterRemaining.set(cand.chapterId, rem - slot.marksEach);
      }
    }
  }

  // Format result ordered by original section slot order
  const added: AutoFillResult["added"] = [];
  const unfilledMap = new Map<string, { title: string; count: number }>();

  for (const slot of slots) {
    const q = chosen.get(slot.order);
    if (q) {
      added.push({ sectionId: slot.sectionId, questionId: q.id, chapterId: q.chapterId });
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

  const complete = unfilled.length === 0 && slots.length === added.length;
  const solverMode = success ? "optimal" : "greedy";

  return { added, unfilled, complete, solverMode, exhaustedBudget: hitStepLimit };
}
