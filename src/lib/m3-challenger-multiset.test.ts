import { describe, expect, it } from "vitest";
import {
  calculateSectionOverlap,
  formatSetIdentifier,
  nextSetIdentifier,
  permuteMcqOptions,
  planMultiSetDistribution,
  selectVariantCandidates,
  shuffle,
  type BlueprintSectionDef,
  type CandidateQuestionDef,
  type SourceItemDef,
} from "./multiset";

describe("Milestone 3 Challenger Empirical Stress Tests: Multi-Set Overlap & Invariants", () => {
  // ---------------------------------------------------------------------------
  // 1. Overlap Ratios & Boundary Mathematical Tests
  // ---------------------------------------------------------------------------
  describe("1. Overlap Ratios & Boundary Tests", () => {
    it("handles boundary overlap ratios (0%, 25%, 50%, 60%, 75%, 100%) on odd, single, and large counts", () => {
      const testCases = [
        // count, ratio, expectedCommon, expectedVariant
        { count: 0, ratio: 0.6, expectedCommon: 0, expectedVariant: 0 },
        { count: 1, ratio: 0.0, expectedCommon: 0, expectedVariant: 1 },
        { count: 1, ratio: 0.6, expectedCommon: 1, expectedVariant: 0 },
        { count: 1, ratio: 1.0, expectedCommon: 1, expectedVariant: 0 },
        { count: 3, ratio: 0.6, expectedCommon: 2, expectedVariant: 1 },
        { count: 5, ratio: 0.0, expectedCommon: 0, expectedVariant: 5 },
        { count: 5, ratio: 0.25, expectedCommon: 1, expectedVariant: 4 },
        { count: 5, ratio: 0.5, expectedCommon: 3, expectedVariant: 2 },
        { count: 5, ratio: 0.6, expectedCommon: 3, expectedVariant: 2 },
        { count: 5, ratio: 0.75, expectedCommon: 4, expectedVariant: 1 },
        { count: 5, ratio: 1.0, expectedCommon: 5, expectedVariant: 0 },
        { count: 20, ratio: 0.6, expectedCommon: 12, expectedVariant: 8 },
        { count: 25, ratio: 0.6, expectedCommon: 15, expectedVariant: 10 },
        { count: 50, ratio: 0.6, expectedCommon: 30, expectedVariant: 20 },
      ];

      for (const tc of testCases) {
        const result = calculateSectionOverlap(tc.count, tc.ratio);
        expect(result.commonCount + result.variantCount).toBe(tc.count);
        expect(result.commonCount).toBe(tc.expectedCommon);
        expect(result.variantCount).toBe(tc.expectedVariant);
      }
    });

    it("clamps out-of-range overlap ratios gracefully (-0.5 -> 0, 1.5 -> 1.0)", () => {
      const low = calculateSectionOverlap(10, -0.5);
      expect(low.commonCount).toBe(0);
      expect(low.variantCount).toBe(10);

      const high = calculateSectionOverlap(10, 1.5);
      expect(low.commonCount + low.variantCount).toBe(10);
      expect(high.commonCount).toBe(10);
      expect(high.variantCount).toBe(0);
    });

    it("works identically with array input and extracts object ids", () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: `q_id_${i + 1}`, val: i }));
      const split = calculateSectionOverlap(items, 0.6);

      expect(split.commonCount).toBe(6);
      expect(split.variantCount).toBe(4);
      expect(split.commonIds).toEqual(["q_id_1", "q_id_2", "q_id_3", "q_id_4", "q_id_5", "q_id_6"]);
      expect(split.variantSlots.length).toBe(4);
      expect(split.variantSlots[0].id).toBe("q_id_7");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Chapter Marks Mathematical Invariance Across Sets 1, 2, 3
  // ---------------------------------------------------------------------------
  describe("2. Chapter Marks Mathematical Invariance", () => {
    it("strictly preserves total marks per chapter across Sets 1, 2, and 3", () => {
      const sections: BlueprintSectionDef[] = [
        { id: "sec_a", title: "Section A (MCQ)", type: "MCQ", count: 6, marksEach: 1 },
        { id: "sec_b", title: "Section B (Short)", type: "SHORT", count: 4, marksEach: 2 },
        { id: "sec_c", title: "Section C (Long)", type: "LONG", count: 3, marksEach: 3 },
      ];

      // Set 1 items distributed across 3 chapters:
      // Ch 1: 2 MCQs (2m) + 1 Short (2m) + 1 Long (3m) = 7 marks
      // Ch 2: 2 MCQs (2m) + 2 Short (4m) + 1 Long (3m) = 9 marks
      // Ch 3: 2 MCQs (2m) + 1 Short (2m) + 1 Long (3m) = 7 marks
      // Total exam marks: 23 marks
      const sourceItems: SourceItemDef[] = [
        // Section A (1m each)
        { id: "s1_1", sectionId: "sec_a", position: 1, questionId: "q_a1", question: { id: "q_a1", chapterId: "ch_1", type: "MCQ", difficulty: "EASY" } },
        { id: "s1_2", sectionId: "sec_a", position: 2, questionId: "q_a2", question: { id: "q_a2", chapterId: "ch_1", type: "MCQ", difficulty: "MEDIUM" } },
        { id: "s1_3", sectionId: "sec_a", position: 3, questionId: "q_a3", question: { id: "q_a3", chapterId: "ch_2", type: "MCQ", difficulty: "EASY" } },
        { id: "s1_4", sectionId: "sec_a", position: 4, questionId: "q_a4", question: { id: "q_a4", chapterId: "ch_2", type: "MCQ", difficulty: "HARD" } },
        { id: "s1_5", sectionId: "sec_a", position: 5, questionId: "q_a5", question: { id: "q_a5", chapterId: "ch_3", type: "MCQ", difficulty: "EASY" } },
        { id: "s1_6", sectionId: "sec_a", position: 6, questionId: "q_a6", question: { id: "q_a6", chapterId: "ch_3", type: "MCQ", difficulty: "MEDIUM" } },
        // Section B (2m each)
        { id: "s1_7", sectionId: "sec_b", position: 1, questionId: "q_b1", question: { id: "q_b1", chapterId: "ch_1", type: "SHORT", difficulty: "MEDIUM" } },
        { id: "s1_8", sectionId: "sec_b", position: 2, questionId: "q_b2", question: { id: "q_b2", chapterId: "ch_2", type: "SHORT", difficulty: "MEDIUM" } },
        { id: "s1_9", sectionId: "sec_b", position: 3, questionId: "q_b3", question: { id: "q_b3", chapterId: "ch_2", type: "SHORT", difficulty: "HARD" } },
        { id: "s1_10", sectionId: "sec_b", position: 4, questionId: "q_b4", question: { id: "q_b4", chapterId: "ch_3", type: "SHORT", difficulty: "EASY" } },
        // Section C (3m each)
        { id: "s1_11", sectionId: "sec_c", position: 1, questionId: "q_c1", question: { id: "q_c1", chapterId: "ch_1", type: "LONG", difficulty: "HARD" } },
        { id: "s1_12", sectionId: "sec_c", position: 2, questionId: "q_c2", question: { id: "q_c2", chapterId: "ch_2", type: "LONG", difficulty: "MEDIUM" } },
        { id: "s1_13", sectionId: "sec_c", position: 3, questionId: "q_c3", question: { id: "q_c3", chapterId: "ch_3", type: "LONG", difficulty: "HARD" } },
      ];

      // Build rich candidate pool for Sets 2 and 3
      const candidatePool: CandidateQuestionDef[] = [];
      const chapters = ["ch_1", "ch_2", "ch_3"];
      const difficulties = ["EASY", "MEDIUM", "HARD"];
      let candCounter = 1;

      for (const ch of chapters) {
        for (let i = 0; i < 4; i++) {
          candidatePool.push({
            id: `cand_mcq_${candCounter++}`,
            chapterId: ch,
            type: "MCQ",
            difficulty: difficulties[i % 3],
            marks: 1,
          });
        }
        for (let i = 0; i < 4; i++) {
          candidatePool.push({
            id: `cand_short_${candCounter++}`,
            chapterId: ch,
            type: "SHORT",
            difficulty: difficulties[i % 3],
            marks: 2,
          });
        }
        for (let i = 0; i < 3; i++) {
          candidatePool.push({
            id: `cand_long_${candCounter++}`,
            chapterId: ch,
            type: "LONG",
            difficulty: difficulties[i % 3],
            marks: 3,
          });
        }
      }

      const multiSetResult = planMultiSetDistribution({
        sections,
        sourceItems,
        candidatePool,
        targetSets: ["SET 2", "SET 3"],
        commonRatio: 0.6,
        shufflePositions: false,
      });

      expect(multiSetResult.plans.length).toBe(2);

      // Helper to compute chapter marks from planned items
      const allQuestionsLookup = new Map<string, { chapterId: string; marks: number }>();
      for (const it of sourceItems) {
        const sec = sections.find((s) => s.id === it.sectionId)!;
        allQuestionsLookup.set(it.questionId, { chapterId: it.question.chapterId, marks: sec.marksEach });
      }
      for (const c of candidatePool) {
        allQuestionsLookup.set(c.id, { chapterId: c.chapterId, marks: c.marks! });
      }

      function computeChapterMarks(items: { questionId: string; sectionId: string }[]) {
        const marksByChapter: Record<string, number> = { ch_1: 0, ch_2: 0, ch_3: 0 };
        for (const item of items) {
          const q = allQuestionsLookup.get(item.questionId)!;
          const sec = sections.find((s) => s.id === item.sectionId)!;
          marksByChapter[q.chapterId] += sec.marksEach;
        }
        return marksByChapter;
      }

      // Expected Set 1 marks:
      const set1Marks = computeChapterMarks(sourceItems);
      expect(set1Marks.ch_1).toBe(7);
      expect(set1Marks.ch_2).toBe(9);
      expect(set1Marks.ch_3).toBe(7);

      // Verify Set 2 chapter marks
      const set2Marks = computeChapterMarks(multiSetResult.plans[0].items);
      expect(set2Marks.ch_1).toBe(set1Marks.ch_1);
      expect(set2Marks.ch_2).toBe(set1Marks.ch_2);
      expect(set2Marks.ch_3).toBe(set1Marks.ch_3);

      // Verify Set 3 chapter marks
      const set3Marks = computeChapterMarks(multiSetResult.plans[1].items);
      expect(set3Marks.ch_1).toBe(set1Marks.ch_1);
      expect(set3Marks.ch_2).toBe(set1Marks.ch_2);
      expect(set3Marks.ch_3).toBe(set1Marks.ch_3);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Mutual Exclusivity Across Parallel Sets
  // ---------------------------------------------------------------------------
  describe("3. Mutual Exclusivity Verification", () => {
    it("ensures variant questions picked for Set 2 do not collide with Set 3 or Set 1", () => {
      const sections: BlueprintSectionDef[] = [
        { id: "sec_a", title: "Section A", type: "MCQ", count: 10, marksEach: 1 },
      ];

      const sourceItems: SourceItemDef[] = Array.from({ length: 10 }, (_, i) => ({
        id: `s1_${i + 1}`,
        sectionId: "sec_a",
        position: i + 1,
        questionId: `src_q_${i + 1}`,
        question: { id: `src_q_${i + 1}`, chapterId: "ch_1", type: "MCQ", difficulty: "MEDIUM" },
      }));

      // Candidate pool with 12 distinct MCQs
      const candidatePool: CandidateQuestionDef[] = Array.from({ length: 12 }, (_, i) => ({
        id: `cand_q_${i + 1}`,
        chapterId: "ch_1",
        type: "MCQ",
        difficulty: "MEDIUM",
        marks: 1,
      }));

      // 60% overlap on 10 questions => 6 common, 4 variant per target set
      // Set 2 needs 4 variants. Set 3 needs 4 variants. Pool has 12, so 8 total will be used.
      const result = planMultiSetDistribution({
        sections,
        sourceItems,
        candidatePool,
        targetSets: ["SET B", "SET C"],
        commonRatio: 0.6,
        shufflePositions: false,
      });

      const setBVariants = result.plans[0].items.filter((i) => i.isVariant).map((i) => i.questionId);
      const setCVariants = result.plans[1].items.filter((i) => i.isVariant).map((i) => i.questionId);
      const set1Ids = new Set(sourceItems.map((i) => i.questionId));

      expect(setBVariants.length).toBe(4);
      expect(setCVariants.length).toBe(4);

      // Verify Set B variants don't intersect with Set 1
      for (const id of setBVariants) {
        expect(set1Ids.has(id)).toBe(false);
      }

      // Verify Set C variants don't intersect with Set 1
      for (const id of setCVariants) {
        expect(set1Ids.has(id)).toBe(false);
      }

      // Verify Set B and Set C variants are mutually disjoint
      const setBVariantSet = new Set(setBVariants);
      for (const id of setCVariants) {
        expect(setBVariantSet.has(id)).toBe(false);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Candidate Bank Depletion & Graceful Fallback
  // ---------------------------------------------------------------------------
  describe("4. Candidate Bank Depletion & Graceful Fallback", () => {
    it("falls back gracefully when bank has 0 candidates and logs warning without crash", () => {
      const sections: BlueprintSectionDef[] = [
        { id: "sec_a", title: "Section A", type: "SHORT", count: 4, marksEach: 2 },
      ];

      const sourceItems: SourceItemDef[] = Array.from({ length: 4 }, (_, i) => ({
        id: `it_${i + 1}`,
        sectionId: "sec_a",
        position: i + 1,
        questionId: `q_orig_${i + 1}`,
        question: { id: `q_orig_${i + 1}`, chapterId: "ch_empty", type: "SHORT", difficulty: "EASY" },
      }));

      const result = planMultiSetDistribution({
        sections,
        sourceItems,
        candidatePool: [], // 0 candidates!
        targetSets: ["SET B"],
        commonRatio: 0.5,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("insufficient questions in bank");
      const plan = result.plans[0];
      expect(plan.totalQuestions).toBe(4);
      expect(plan.commonCount).toBe(4); // All 4 fallback to common
      expect(plan.variantCount).toBe(0);
      expect(plan.items.every((i) => i.isFallback)).toBe(false); // Only variant slots became fallbacks
      expect(plan.items.filter((i) => i.isFallback).length).toBe(2);
    });

    it("handles bank with exactly 1 candidate across 2 target sets", () => {
      const sections: BlueprintSectionDef[] = [
        { id: "sec_a", title: "Section A", type: "MCQ", count: 2, marksEach: 1 },
      ];

      const sourceItems: SourceItemDef[] = [
        { id: "it_1", sectionId: "sec_a", position: 1, questionId: "q_1", question: { id: "q_1", chapterId: "ch_1", type: "MCQ", difficulty: "EASY" } },
        { id: "it_2", sectionId: "sec_a", position: 2, questionId: "q_2", question: { id: "q_2", chapterId: "ch_1", type: "MCQ", difficulty: "EASY" } },
      ];

      // 50% ratio on 2 questions = 1 common, 1 variant.
      // Candidate pool has exactly 1 candidate.
      const candidatePool: CandidateQuestionDef[] = [
        { id: "only_cand_1", chapterId: "ch_1", type: "MCQ", difficulty: "EASY", marks: 1 },
      ];

      const result = planMultiSetDistribution({
        sections,
        sourceItems,
        candidatePool,
        targetSets: ["SET B", "SET C"],
        commonRatio: 0.5,
        shufflePositions: false,
      });

      // Set B gets only_cand_1
      expect(result.plans[0].variantCount).toBe(1);
      expect(result.plans[0].items.some((i) => i.questionId === "only_cand_1")).toBe(true);

      // Set C finds pool depleted, falls back to original question and logs warning
      expect(result.plans[1].variantCount).toBe(0);
      expect(result.plans[1].items.some((i) => i.isFallback)).toBe(true);
      expect(result.warnings.some((w) => w.includes("[SET C]") && w.includes("insufficient questions"))).toBe(true);
    });

    it("relaxes difficulty when exact difficulty is unavailable and logs a clear warning", () => {
      const sections: BlueprintSectionDef[] = [
        { id: "sec_a", title: "Section A", type: "MCQ", count: 2, marksEach: 1 },
      ];

      const sourceItems: SourceItemDef[] = [
        { id: "it_1", sectionId: "sec_a", position: 1, questionId: "q_1", question: { id: "q_1", chapterId: "ch_1", type: "MCQ", difficulty: "HARD" } },
        { id: "it_2", sectionId: "sec_a", position: 2, questionId: "q_2", question: { id: "q_2", chapterId: "ch_1", type: "MCQ", difficulty: "HARD" } },
      ];

      // Candidate has EASY difficulty, not HARD
      const candidatePool: CandidateQuestionDef[] = [
        { id: "cand_easy_1", chapterId: "ch_1", type: "MCQ", difficulty: "EASY", marks: 1 },
      ];

      const result = planMultiSetDistribution({
        sections,
        sourceItems,
        candidatePool,
        targetSets: ["SET B"],
        commonRatio: 0.5,
        shufflePositions: false,
      });

      expect(result.plans[0].variantCount).toBe(1);
      expect(result.plans[0].items.some((i) => i.questionId === "cand_easy_1")).toBe(true);
      expect(result.warnings.some((w) => w.includes("exact difficulty 'HARD' unavailable; used 'EASY' replacement"))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Alternate (OR) Choice Parity
  // ---------------------------------------------------------------------------
  describe("5. Alternate (OR) Choice Parity", () => {
    it("allocates paired variant OR choices matching primary question chapter and marks", () => {
      const sections: BlueprintSectionDef[] = [
        { id: "sec_a", title: "Section A", type: "LONG", count: 2, marksEach: 5 },
      ];

      const sourceItems: SourceItemDef[] = [
        {
          id: "it_1",
          sectionId: "sec_a",
          position: 1,
          questionId: "q_prim_1",
          orQuestionId: "q_or_1",
          question: { id: "q_prim_1", chapterId: "ch_math", type: "LONG", difficulty: "MEDIUM" },
          orQuestion: { id: "q_or_1", chapterId: "ch_math", type: "LONG", difficulty: "MEDIUM" },
        },
        {
          id: "it_2",
          sectionId: "sec_a",
          position: 2,
          questionId: "q_prim_2",
          orQuestionId: null,
          question: { id: "q_prim_2", chapterId: "ch_math", type: "LONG", difficulty: "EASY" },
          orQuestion: null,
        },
      ];

      const candidatePool: CandidateQuestionDef[] = [
        { id: "cand_math_p", chapterId: "ch_math", type: "LONG", difficulty: "MEDIUM", marks: 5 },
        { id: "cand_math_or", chapterId: "ch_math", type: "LONG", difficulty: "MEDIUM", marks: 5 },
      ];

      const result = planMultiSetDistribution({
        sections,
        sourceItems,
        candidatePool,
        targetSets: ["SET B"],
        commonRatio: 0.5,
        shufflePositions: false,
      });

      const variantItem = result.plans[0].items.find((i) => i.isVariant);
      expect(variantItem).toBeDefined();
      expect(variantItem?.questionId).toBe("cand_math_p");
      expect(variantItem?.orQuestionId).toBe("cand_math_or");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. MCQ Option Permutation Across Diverse Answer Formats
  // ---------------------------------------------------------------------------
  describe("6. MCQ Option Permutation Across Diverse Answer Formats", () => {
    const sampleOptionSets = [
      ["Hydrogen", "Oxygen", "Nitrogen", "Carbon"],
      ["Option 1", "Option 2", "Option 3", "Option 4"],
      ["3 x 10^8 m/s", "2 x 10^8 m/s", "1.5 x 10^8 m/s", "Zero"],
      ["Real and inverted", "Virtual and erect", "Real and erect", "Virtual and inverted"],
      ["True", "False"],
    ];

    it("verifies standard formats (uppercase 'A', lowercase 'c', 1-based number '2', option text) correctly resolve", () => {
      const standardFormats = [
        { name: "Uppercase letter", formatAns: (letter: string) => letter },
        { name: "Lowercase letter", formatAns: (letter: string) => letter.toLowerCase() },
        { name: "1-based numeric string", formatAns: (_: string, idx: number) => String(idx + 1) },
        { name: "Option text value", formatAns: (_: string, idx: number, opts: string[]) => opts[idx] },
      ];

      const letters = "ABCDEF";
      for (const options of sampleOptionSets) {
        for (let targetIdx = 0; targetIdx < options.length; targetIdx++) {
          const letter = letters[targetIdx];
          const expectedTargetText = options[targetIdx];

          for (const fmt of standardFormats) {
            const inputAnswer = fmt.formatAns(letter, targetIdx, options);
            const permuted = permuteMcqOptions(options, inputAnswer);

            const trimmedAns = (permuted.answer || "").trim().toUpperCase();
            const newLetterIdx = letters.indexOf(trimmedAns);
            expect(newLetterIdx).toBeGreaterThanOrEqual(0);
            expect(newLetterIdx).toBeLessThan(permuted.options.length);
            expect(permuted.options[newLetterIdx]).toBe(expectedTargetText);
          }
        }
      }
    });

    it("correctly remaps parenthesized answers '(A)', '(B)', '(b)' to the new shuffled letter without desync", () => {
      // Testing parenthesized letters e.g. "(B)"
      const options = ["Option A", "Option B", "Option C", "Option D"];
      const inputAnswer = "(B)"; // Expected to point to "Option B"

      let desyncCount = 0;
      const letters = "ABCDEF";

      for (let i = 0; i < 30; i++) {
        const permuted = permuteMcqOptions(options, inputAnswer);
        const newIdx = letters.indexOf(permuted.answer);
        const resultingOption = newIdx >= 0 ? permuted.options[newIdx] : undefined;
        if (resultingOption !== "Option B") {
          desyncCount++;
        }
      }

      expect(desyncCount).toBe(0);
    });

    it("verifies full adversarial oracle across 50+ MCQ permutations with all formats including parenthesized", () => {
      const allFormats: Array<{
        name: string;
        formatAns: (letter: string, idx: number, options: string[]) => string;
      }> = [
        { name: "Uppercase letter", formatAns: (letter) => letter },
        { name: "Lowercase letter", formatAns: (letter) => letter.toLowerCase() },
        { name: "Parenthesized letter", formatAns: (letter) => `(${letter})` },
        { name: "1-based numeric string", formatAns: (_, idx) => String(idx + 1) },
        { name: "Option text value", formatAns: (_, idx, options) => options[idx] },
      ];

      const letters = "ABCDEF";
      const failures: string[] = [];

      for (const options of sampleOptionSets) {
        for (let targetIdx = 0; targetIdx < options.length; targetIdx++) {
          const letter = letters[targetIdx];
          const expectedTargetText = options[targetIdx];

          for (const fmt of allFormats) {
            const inputAnswer = fmt.formatAns(letter, targetIdx, options);
            const permuted = permuteMcqOptions(options, inputAnswer);

            const trimmedAns = (permuted.answer || "").trim().toUpperCase();
            let resolvedText: string | undefined;

            const newLetterIdx = letters.indexOf(trimmedAns);
            if (newLetterIdx >= 0 && newLetterIdx < permuted.options.length) {
              resolvedText = permuted.options[newLetterIdx];
            } else if (/^\([A-F]\)$/.test(trimmedAns)) {
              const insideChar = trimmedAns.charAt(1);
              const insideIdx = letters.indexOf(insideChar);
              if (insideIdx >= 0 && insideIdx < permuted.options.length) {
                resolvedText = permuted.options[insideIdx];
              }
            } else {
              const valMatch = permuted.options.find((o) => o.trim().toLowerCase() === trimmedAns.toLowerCase());
              if (valMatch) resolvedText = valMatch;
            }

            if (resolvedText !== expectedTargetText) {
              failures.push(
                `[FAIL] Format: '${fmt.name}', inputAnswer: '${inputAnswer}', expectedText: '${expectedTargetText}', returnedAnswer: '${permuted.answer}'`,
              );
            }
          }
        }
      }

      // This assertion captures the failure of parenthesized letters to remap
      expect(failures).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Structural Integrity & Position Layout
  // ---------------------------------------------------------------------------
  describe("7. Structural Integrity & Position Layout", () => {
    it("preserves continuous 1..N position sequence when shufflePositions is true or false", () => {
      const sections: BlueprintSectionDef[] = [
        { id: "sec_a", title: "Section A", type: "MCQ", count: 5, marksEach: 1 },
      ];

      const sourceItems: SourceItemDef[] = Array.from({ length: 5 }, (_, i) => ({
        id: `it_${i + 1}`,
        sectionId: "sec_a",
        position: i + 1,
        questionId: `q_orig_${i + 1}`,
        question: { id: `q_orig_${i + 1}`, chapterId: "ch_1", type: "MCQ", difficulty: "MEDIUM" },
      }));

      const candidatePool: CandidateQuestionDef[] = [
        { id: "cand_1", chapterId: "ch_1", type: "MCQ", difficulty: "MEDIUM", marks: 1 },
        { id: "cand_2", chapterId: "ch_1", type: "MCQ", difficulty: "MEDIUM", marks: 1 },
      ];

      // Test with shufflePositions: true
      const resultShuffled = planMultiSetDistribution({
        sections,
        sourceItems,
        candidatePool,
        targetSets: ["SET B"],
        commonRatio: 0.6,
        shufflePositions: true,
      });

      const positionsShuffled = resultShuffled.plans[0].items.map((i) => i.position);
      expect(positionsShuffled).toEqual([1, 2, 3, 4, 5]);

      // Test with shufflePositions: false
      const resultUnshuffled = planMultiSetDistribution({
        sections,
        sourceItems,
        candidatePool,
        targetSets: ["SET B"],
        commonRatio: 0.6,
        shufflePositions: false,
      });

      const positionsUnshuffled = resultUnshuffled.plans[0].items.map((i) => i.position);
      expect(positionsUnshuffled).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
