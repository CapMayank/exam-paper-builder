import { cleanOptionText, normalizeMcqAnswer, parseMatchColumnPairs } from "./constants";
import { isParaphraseOrDuplicateChoice } from "./internalChoiceRules";
import { attemptedSubpartsMarks, parseSubparts, parseSubpartsPayload, subpartsTotalMarks, type SubPart } from "./types";

export const LETTERS = "ABCDEF";

/**
 * Fisher-Yates array shuffle. Returns a new array.
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles MCQ options and computes the new correct answer key.
 * Robust against letter answers (A-F), lowercase letters, numeric indices, and option text.
 */
export function permuteMcqOptions(
  options: string[],
  currentAnswer: string,
): { options: string[]; answer: string } {
  if (!options || options.length < 2) {
    return { options: options ?? [], answer: currentAnswer };
  }

  const normalized = normalizeMcqAnswer(currentAnswer, options);
  let targetOptionValue: string | null = null;

  if (normalized.letter) {
    const idx = LETTERS.indexOf(normalized.letter);
    if (idx >= 0 && idx < options.length) {
      targetOptionValue = options[idx];
    }
  }

  if (targetOptionValue === null && normalized.optionText) {
    const targetClean = cleanOptionText(normalized.optionText).trim().toLowerCase();
    const foundIdx = options.findIndex((o) => cleanOptionText(o).trim().toLowerCase() === targetClean);
    if (foundIdx >= 0) {
      targetOptionValue = options[foundIdx];
    }
  }

  if (targetOptionValue === null) {
    const trimmed = (currentAnswer || "").trim().toLowerCase();
    const foundIdx = options.findIndex((o) => o.trim().toLowerCase() === trimmed);
    if (foundIdx >= 0) {
      targetOptionValue = options[foundIdx];
    }
  }

  const newOptions = shuffle(options);

  if (targetOptionValue !== null) {
    const newIdx = newOptions.indexOf(targetOptionValue);
    if (newIdx >= 0 && newIdx < LETTERS.length) {
      return { options: newOptions, answer: LETTERS[newIdx] };
    }
  }

  return { options: newOptions, answer: currentAnswer };
}

/** Options whose meaning depends on their position ("All of the above", "Both (a) and (b)", "A and B"), in English or Hindi. */
const POSITION_DEPENDENT_OPTION =
  /\b(?:above|both|neither|none of|all of|any of)\b|\((?:[a-d])\)|\b[A-D]\s*(?:and|&|,)\s*[A-D]\b|उपरोक्त|इनमें से|दोनों|कोई नहीं|सभी/i;

/**
 * Shuffles an MCQ's options and remaps its answer letter so the correct option is not predictably first.
 * Leaves the question as it is when any option depends on its position or the answer cannot be resolved to a letter.
 */
export function shuffleMcqOptionsIfSafe(
  options: string[],
  answerLetter: string,
): { options: string[]; answer: string } {
  const letterIdx = LETTERS.indexOf((answerLetter || "").trim().toUpperCase());
  if (options.length < 3 || answerLetter.trim().length !== 1 || letterIdx < 0 || letterIdx >= options.length) {
    return { options, answer: answerLetter };
  }
  if (options.some((o) => POSITION_DEPENDENT_OPTION.test(o))) {
    return { options, answer: answerLetter };
  }
  return permuteMcqOptions(options, answerLetter);
}

/**
 * Formats set identifiers cleanly: "B" -> "SET B", "Set 2" -> "SET 2", "3" -> "SET 3".
 */
export function formatSetIdentifier(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "SET B";
  if (/^SET\s+/i.test(trimmed)) {
    const rest = trimmed.replace(/^SET\s+/i, "").trim().toUpperCase();
    return `SET ${rest}`;
  }
  return `SET ${trimmed.toUpperCase()}`;
}

/**
 * Suggests the next set identifier based on the current one.
 * e.g., "SET A" -> "SET B", "A" -> "B", "SET 1" -> "SET 2", "1" -> "2"
 */
export function nextSetIdentifier(currentSet: string): string {
  const trimmed = (currentSet || "").trim();
  if (!trimmed) return "SET B";

  const upper = trimmed.toUpperCase();

  // Pattern: SET A, SET B...
  const setLetterMatch = upper.match(/^SET\s+([A-Z])$/);
  if (setLetterMatch) {
    const nextChar = String.fromCharCode(setLetterMatch[1].charCodeAt(0) + 1);
    return `SET ${nextChar}`;
  }

  // Pattern: Just a single letter: A, B...
  if (/^[A-Z]$/.test(upper)) {
    return String.fromCharCode(upper.charCodeAt(0) + 1);
  }

  // Pattern: SET 1, SET 2...
  const setNumMatch = upper.match(/^SET\s+(\d+)$/);
  if (setNumMatch) {
    return `SET ${parseInt(setNumMatch[1], 10) + 1}`;
  }

  // Pattern: Just a number: 1, 2...
  if (/^\d+$/.test(upper)) {
    return String(parseInt(upper, 10) + 1);
  }

  return `${trimmed} - Copy`;
}

export type OverlapCalculationResult<T = unknown> = {
  commonCount: number;
  variantCount: number;
  commonIds: string[];
  variantSlots: T[];
};

/**
 * Calculates common vs variant question counts and splits items for a section given total count/items and ratio.
 * Supports both totalCount: number or array of items.
 */
export function calculateSectionOverlap<T = unknown>(
  input: number | T[],
  commonRatio: number,
): OverlapCalculationResult<T> {
  const isArray = Array.isArray(input);
  const totalCount = isArray ? input.length : Math.max(0, Math.floor(input));

  if (totalCount <= 0) {
    return {
      commonCount: 0,
      variantCount: 0,
      commonIds: [],
      variantSlots: [],
    };
  }

  const clampedRatio = Math.max(0, Math.min(1, commonRatio));
  const commonCount = Math.min(totalCount, Math.max(0, Math.round(totalCount * clampedRatio)));
  const variantCount = totalCount - commonCount;

  let commonIds: string[] = [];
  let variantSlots: T[] = [];

  if (isArray) {
    const commonItems = input.slice(0, commonCount);
    commonIds = commonItems.map((it) => {
      if (typeof it === "object" && it !== null && "id" in it) {
        return String((it as { id: unknown }).id);
      }
      return String(it);
    });
    variantSlots = input.slice(commonCount);
  }

  return {
    commonCount,
    variantCount,
    commonIds,
    variantSlots,
  };
}

export type CandidateQuestionDef = {
  id: string;
  bookId?: string;
  chapterId: string;
  type: string;
  difficulty: string;
  marks?: number;
  subpartsJson?: string | null;
  optionsJson?: string | null;
  text?: string;
  subparts?: SubPart[];
};

export type TargetSlotDef = {
  chapterId: string;
  marks?: number;
  type?: string;
  difficulty?: string;
};

/**
 * Filters bank candidates matching slot requirements (chapter, marks, type, difficulty).
 */
export function selectVariantCandidates<T extends CandidateQuestionDef>(
  targetSlot: TargetSlotDef,
  bank: T[],
  excludedIds: string[] = [],
): T[] {
  const excludedSet = new Set(excludedIds);

  return bank.filter((cand) => {
    if (excludedSet.has(cand.id)) return false;
    if (cand.chapterId !== targetSlot.chapterId) return false;
    if (targetSlot.type !== undefined && cand.type !== targetSlot.type) return false;
    if (targetSlot.difficulty !== undefined && cand.difficulty !== targetSlot.difficulty) return false;

    // Check marks if specified
    if (targetSlot.marks !== undefined) {
      if (cand.marks !== undefined && cand.marks !== targetSlot.marks) {
        return false;
      }
      if (cand.type === "CASE_STUDY") {
        let subs: SubPart[] = [];
        if (cand.subparts && Array.isArray(cand.subparts)) {
          subs = cand.subparts;
        } else if (cand.subpartsJson) {
          subs = parseSubparts(cand.subpartsJson);
        }
        if (subs.length > 0 && subpartsTotalMarks(subs) !== targetSlot.marks) {
          return false;
        }
      }
    }

    return true;
  });
}

export type SourceItemDef = {
  id: string;
  sectionId: string;
  position: number;
  questionId: string;
  orQuestionId?: string | null;
  question: {
    id: string;
    chapterId: string;
    type: string;
    difficulty: string;
    text?: string;
    subpartsJson?: string | null;
    optionsJson?: string | null;
    chapter?: { id: string; number: number; title: string };
  };
  orQuestion?: {
    id: string;
    chapterId: string;
    type: string;
    difficulty: string;
    subpartsJson?: string | null;
    chapter?: { id: string; number: number; title: string };
  } | null;
};

export type BlueprintSectionDef = {
  id: string;
  title: string;
  type: string;
  count: number;
  marksEach: number;
  /** class 8 and below: a match question may span slots, so a replacement must keep its pair count */
  flexible?: boolean;
};

export type TargetSetItemPlan = {
  sectionId: string;
  position: number;
  questionId: string;
  orQuestionId: string | null;
  isCommon: boolean;
  isVariant: boolean;
  isFallback: boolean;
  originalQuestionId: string;
  /** The Set 1 placement this slot was planned from: its per-question settings carry over to the new set. */
  sourceItemId: string;
  sourcePosition: number;
};

export type TargetSetPlan = {
  setCode: string;
  items: TargetSetItemPlan[];
  totalQuestions: number;
  commonCount: number;
  variantCount: number;
  overlapPercentage: number;
};

export type MultiSetPlanResult = {
  targetSets: string[];
  commonRatio: number;
  warnings: string[];
  plans: TargetSetPlan[];
};

/**
 * Pure multi-set distribution planner.
 * Takes blueprint sections, source items, candidate bank questions, and parameters.
 * Produces an exact deterministic allocation plan for all parallel sets with zero DB side effects.
 */
export function planMultiSetDistribution(params: {
  sections: BlueprintSectionDef[];
  sourceItems: SourceItemDef[];
  candidatePool: CandidateQuestionDef[];
  targetSets: string[];
  commonRatio: number;
  shufflePositions?: boolean;
}): MultiSetPlanResult {
  const { sections, sourceItems, candidatePool, targetSets, commonRatio, shufflePositions = true } = params;
  const warnings: string[] = [];

  const normalizedSets = targetSets.map(formatSetIdentifier);
  const usedQuestionIds = new Set<string>();

  // Mark all Set 1 questions as used
  for (const it of sourceItems) {
    usedQuestionIds.add(it.questionId);
    if (it.orQuestionId) usedQuestionIds.add(it.orQuestionId);
  }

  // A match question may span several slots of its section (flexible marks), so a replacement match must have as many
  // pairs as the one it replaces or the set would no longer fill its slots. Set per source item before it is searched.
  let pairsWanted: number | undefined;
  const pairsOfMatch = (q: { type: string; optionsJson?: string | null; text?: string }): number | undefined => {
    if (q.type !== "MATCH_COLUMN") return undefined;
    let opts: string[] = [];
    try {
      const parsed = JSON.parse(q.optionsJson || "[]");
      opts = Array.isArray(parsed) ? parsed : [];
    } catch {}
    return parseMatchColumnPairs(opts, q.text ?? "").length;
  };

  // Pre-filter candidate bank questions helper
  function getEligible(
    chapterId: string,
    type: string,
    difficulty?: string,
    marksEach?: number,
    excludeId?: string,
    notSimilarToText?: string,
  ): CandidateQuestionDef[] {
    return candidatePool.filter((q) => {
      if (usedQuestionIds.has(q.id)) return false;
      if (excludeId && q.id === excludeId) return false;
      // an OR alternative that merely rephrases its primary question is not a real choice
      if (notSimilarToText && q.text && isParaphraseOrDuplicateChoice(notSimilarToText, q.text).isDuplicateOrParaphrase) return false;
      if (q.chapterId !== chapterId || q.type !== type) return false;
      if (pairsWanted !== undefined && pairsOfMatch(q) !== pairsWanted) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      if (marksEach !== undefined) {
        if (q.marks !== undefined && q.marks !== marksEach) return false;
        // a question with parts must be worth exactly the slot ("any N of" counts the N attempted)
        const payload = parseSubpartsPayload(q.subpartsJson);
        const sub = q.subparts ?? payload.subparts;
        if (sub.length > 0 && attemptedSubpartsMarks(sub, payload.attemptCount) !== marksEach) return false;
      }
      return true;
    });
  }

  // Group source items by section
  const sectionItemsMap = new Map<string, SourceItemDef[]>();
  for (const it of sourceItems) {
    const list = sectionItemsMap.get(it.sectionId) ?? [];
    list.push(it);
    sectionItemsMap.set(it.sectionId, list);
  }

  type SectionAllocation = {
    section: BlueprintSectionDef;
    commonSlots: SourceItemDef[];
    variantSlots: SourceItemDef[];
  };

  const sectionAllocations: SectionAllocation[] = [];

  for (const sec of sections) {
    const items = (sectionItemsMap.get(sec.id) ?? []).sort((a, b) => a.position - b.position);
    if (items.length === 0) continue;

    const { commonCount, variantCount } = calculateSectionOverlap(items.length, commonRatio);

    // A combined match question fills the whole section by its pairs; another one rarely has the same number of
    // pairs, so it stays common to every set.
    const combinedMatch = sec.type === "MATCH_COLUMN" && sec.count > 1;
    if (variantCount === 0 || combinedMatch) {
      sectionAllocations.push({ section: sec, commonSlots: items, variantSlots: [] });
      continue;
    }

    // Score items by available candidate inventory in bank
    const scored = items.map((it) => {
      pairsWanted = sec.flexible ? pairsOfMatch(it.question) : undefined;
      const exact = getEligible(it.question.chapterId, it.question.type, it.question.difficulty, sec.marksEach);
      const total = getEligible(it.question.chapterId, it.question.type, undefined, sec.marksEach);
      const score = exact.length * 100 + total.length;
      return { item: it, score };
    });

    // Items with highest available candidate inventory are designated as variant slots
    scored.sort((a, b) => b.score - a.score);

    const variantSlots = scored.slice(0, variantCount).map((s) => s.item);
    const commonSlots = scored.slice(variantCount).map((s) => s.item);

    sectionAllocations.push({ section: sec, commonSlots, variantSlots });
  }

  // Generate target set plans
  const plans: TargetSetPlan[] = [];

  for (const setCode of normalizedSets) {
    const allSetItems: TargetSetItemPlan[] = [];

    for (const alloc of sectionAllocations) {
      const sec = alloc.section;
      const sectionPlannedItems: TargetSetItemPlan[] = [];

      // 1. Process common slots
      for (const item of alloc.commonSlots) {
        sectionPlannedItems.push({
          sectionId: sec.id,
          position: 0,
          questionId: item.questionId,
          orQuestionId: item.orQuestionId ?? null,
          isCommon: true,
          isVariant: false,
          isFallback: false,
          originalQuestionId: item.questionId,
          sourceItemId: item.id,
          sourcePosition: item.position,
        });
      }

      // 2. Process variant slots
      for (const item of alloc.variantSlots) {
        pairsWanted = sec.flexible ? pairsOfMatch(item.question) : undefined;
        // Priority 1: Exact difficulty match
        let chosenPrimary: CandidateQuestionDef | null = null;
        let isFallback = false;

        const exactCandidates = getEligible(
          item.question.chapterId,
          item.question.type,
          item.question.difficulty,
          sec.marksEach,
        );

        if (exactCandidates.length > 0) {
          chosenPrimary = exactCandidates[0];
        } else {
          // Priority 2: Relaxed difficulty match
          const anyDiffCandidates = getEligible(
            item.question.chapterId,
            item.question.type,
            undefined,
            sec.marksEach,
          );
          if (anyDiffCandidates.length > 0) {
            chosenPrimary = anyDiffCandidates[0];
            const chName = item.question.chapter?.title ?? item.question.chapterId;
            warnings.push(
              `[${setCode}] Section '${sec.title}' (Chapter: ${chName}): exact difficulty '${item.question.difficulty}' unavailable; used '${chosenPrimary.difficulty}' replacement.`,
            );
          }
        }

        let finalPrimaryId = item.questionId;
        if (chosenPrimary) {
          finalPrimaryId = chosenPrimary.id;
          usedQuestionIds.add(chosenPrimary.id);
        } else {
          // Priority 3: Fallback to Set 1 question
          isFallback = true;
          const chName = item.question.chapter?.title ?? item.question.chapterId;
          warnings.push(
            `[${setCode}] Section '${sec.title}' (Chapter: ${chName}): insufficient questions in bank for ${sec.type} (${sec.marksEach}m). Preserved Set 1 question.`,
          );
        }

        // Handle OR question for variant slot
        let finalOrId: string | null = null;
        if (item.orQuestionId) {
          const primaryText = chosenPrimary?.text ?? item.question.text;
          const exactOr = getEligible(
            item.question.chapterId,
            item.question.type,
            item.orQuestion?.difficulty,
            sec.marksEach,
            finalPrimaryId,
            primaryText,
          );

          if (exactOr.length > 0) {
            finalOrId = exactOr[0].id;
            usedQuestionIds.add(finalOrId);
          } else {
            const anyOr = getEligible(
              item.question.chapterId,
              item.question.type,
              undefined,
              sec.marksEach,
              finalPrimaryId,
              primaryText,
            );
            if (anyOr.length > 0) {
              finalOrId = anyOr[0].id;
              usedQuestionIds.add(finalOrId);
            } else if (item.orQuestionId !== finalPrimaryId) {
              finalOrId = item.orQuestionId;
            } else {
              finalOrId = null;
              warnings.push(
                `[${setCode}] Section '${sec.title}': No eligible alternate (OR) question found; alternate choice omitted.`,
              );
            }
          }
        }

        sectionPlannedItems.push({
          sectionId: sec.id,
          position: 0,
          questionId: finalPrimaryId,
          orQuestionId: finalOrId,
          isCommon: isFallback || finalPrimaryId === item.questionId,
          isVariant: !isFallback && finalPrimaryId !== item.questionId,
          isFallback,
          originalQuestionId: item.questionId,
          sourceItemId: item.id,
          sourcePosition: item.position,
        });
      }

      // 3. Shuffle or preserve positions within section
      const ordered = shufflePositions
        ? shuffle(sectionPlannedItems)
        : [...sectionPlannedItems].sort((a, b) => a.sourcePosition - b.sourcePosition);
      for (let p = 0; p < ordered.length; p++) {
        ordered[p].position = p + 1;
        allSetItems.push(ordered[p]);
      }
    }

    const totalQuestions = allSetItems.length;
    const commonCount = allSetItems.filter((i) => i.isCommon).length;
    const variantCount = allSetItems.filter((i) => i.isVariant).length;
    const overlapPercentage = totalQuestions > 0 ? Math.round((commonCount / totalQuestions) * 100) : 0;

    plans.push({
      setCode,
      items: allSetItems,
      totalQuestions,
      commonCount,
      variantCount,
      overlapPercentage,
    });
  }

  return {
    targetSets: normalizedSets,
    commonRatio,
    warnings,
    plans,
  };
}
