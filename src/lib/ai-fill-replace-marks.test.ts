import { describe, expect, it } from "vitest";
import {
  derangeMatchColumnPairs,
  parseMatchColumnPairs,
  serializeMatchColumnPair,
} from "./constants";
import {
  generatePaperSectionWithGemini,
  generateQuestionsWithGemini,
} from "./gemini";
import { toPlacedItems } from "./papers";
import { normalizeSubpartMarks, type SubPart } from "./types";

describe("AI Fill, AI Replace, Question Mapping, and Marks Allocation Suite", () => {
  describe("Subpart Marks Normalization (normalizeSubpartMarks)", () => {
    it("returns subparts unchanged when their sum already matches expectedTotalMarks", () => {
      const subparts: SubPart[] = [
        { label: "(i)", text: "Subpart 1", marks: 1 },
        { label: "(ii)", text: "Subpart 2", marks: 2 },
        { label: "(iii)", text: "Subpart 3", marks: 1 },
      ];
      const normalized = normalizeSubpartMarks(subparts, 4);
      expect(normalized).toHaveLength(3);
      expect(normalized.reduce((s, p) => s + p.marks, 0)).toBe(4);
      expect(normalized[0].marks).toBe(1);
      expect(normalized[1].marks).toBe(2);
      expect(normalized[2].marks).toBe(1);
    });

    it("scales up deficient subpart marks to match expected total marks", () => {
      // AI frequently generates three 1-mark subparts for a 4-mark question
      const subparts: SubPart[] = [
        { label: "(a)", text: "Part A", marks: 1 },
        { label: "(b)", text: "Part B", marks: 1 },
        { label: "(c)", text: "Part C", marks: 1 },
      ];
      const normalized = normalizeSubpartMarks(subparts, 4);
      expect(normalized).toHaveLength(3);
      const total = normalized.reduce((s, p) => s + p.marks, 0);
      expect(total).toBe(4);
      // All individual marks must be positive integers
      for (const sp of normalized) {
        expect(sp.marks).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(sp.marks)).toBe(true);
      }
    });

    it("scales down excess subpart marks to match expected total marks", () => {
      // AI sometimes generates subparts totaling 6 marks for a 4-mark question
      const subparts: SubPart[] = [
        { label: "(i)", text: "Part 1", marks: 2 },
        { label: "(ii)", text: "Part 2", marks: 2 },
        { label: "(iii)", text: "Part 3", marks: 2 },
      ];
      const normalized = normalizeSubpartMarks(subparts, 4);
      expect(normalized).toHaveLength(3);
      const total = normalized.reduce((s, p) => s + p.marks, 0);
      expect(total).toBe(4);
      for (const sp of normalized) {
        expect(sp.marks).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(sp.marks)).toBe(true);
      }
    });

    it("handles single subpart matching target marks", () => {
      const subparts: SubPart[] = [{ label: "(a)", text: "Sole Part", marks: 1 }];
      const normalized = normalizeSubpartMarks(subparts, 5);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].marks).toBe(5);
    });

    it("handles zero or non-positive expectedTotalMarks gracefully", () => {
      const subparts: SubPart[] = [
        { label: "(a)", text: "Part A", marks: 2 },
        { label: "(b)", text: "Part B", marks: 2 },
      ];
      const normalized = normalizeSubpartMarks(subparts, 0);
      expect(normalized).toEqual(subparts);
    });

    it("handles empty subparts array gracefully", () => {
      const normalized = normalizeSubpartMarks([], 4);
      expect(normalized).toEqual([]);
    });

    it("corrects subparts with 0 marks to positive integers", () => {
      const subparts: SubPart[] = [
        { label: "(i)", text: "Part 1", marks: 0 },
        { label: "(ii)", text: "Part 2", marks: 0 },
      ];
      const normalized = normalizeSubpartMarks(subparts, 3);
      expect(normalized.reduce((s, p) => s + p.marks, 0)).toBe(3);
      for (const sp of normalized) {
        expect(sp.marks).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("MATCH_COLUMN Serialization & Column Independence", () => {
    it("serializes and deserializes column pairs with standard ||| delimiter", () => {
      const left = "Mitochondria";
      const right = "Powerhouse of the cell";
      const serialized = serializeMatchColumnPair(left, right);
      expect(serialized).toBe("Mitochondria ||| Powerhouse of the cell");

      const parsed = parseMatchColumnPairs([serialized]);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].left).toBe(left);
      expect(parsed[0].right).toBe(right);
    });

    it("supports parsing alternate delimiter :: for backward compatibility", () => {
      const legacyPair = "Chloroplast :: Site of photosynthesis";
      const parsed = parseMatchColumnPairs([legacyPair]);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].left).toBe("Chloroplast");
      expect(parsed[0].right).toBe("Site of photosynthesis");
    });

    it("derangeMatchColumnPairs ensures right column is permuted to prevent answer leakage", () => {
      const pairs = [
        { left: "Item 1", right: "Match A" },
        { left: "Item 2", right: "Match B" },
        { left: "Item 3", right: "Match C" },
        { left: "Item 4", right: "Match D" },
      ];

      const deranged = derangeMatchColumnPairs(pairs);
      expect(deranged).toHaveLength(4);

      // Verify left column items retain their original identity
      expect(deranged.map((d) => d.left)).toEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);

      // Verify at least one item (or all when length > 1) has been permuted
      const sameIndexMatches = deranged.filter((d, idx) => d.right === pairs[idx].right);
      expect(sameIndexMatches.length).toBeLessThan(pairs.length);
    });
  });

  describe("toPlacedItems Question Unit Accounting", () => {
    it("counts standard multi-part CASE_STUDY as 1 question unit in section", () => {
      const mockQuestions = [
        {
          id: "cs-1",
          type: "CASE_STUDY",
          marks: 4,
          text: "Read the following passage and answer the questions...",
          subpartsJson: JSON.stringify([
            { label: "(i)", text: "Subpart 1", marks: 1 },
            { label: "(ii)", text: "Subpart 2", marks: 1 },
            { label: "(iii)", text: "Subpart 3", marks: 2 },
          ]),
          optionsJson: null,
        },
      ];

      const mockItems = [
        {
          id: "item-1",
          paperId: "paper-1",
          sectionId: "sec-e",
          questionId: "cs-1",
          order: 0,
          marks: 4,
          question: mockQuestions[0],
        },
      ];

      const mockSection = {
        id: "sec-e",
        name: "Section E",
        type: "CASE_STUDY" as const,
        count: 3,
        marksEach: 4,
      };

      const placed = toPlacedItems([mockSection as any], mockItems as any);
      expect(placed).toHaveLength(1);
      const placedItem = placed[0];

      // Multi-part question in a standard section should NOT have subpartsCount set
      // because it represents 1 question unit, not 3 units!
      expect(placedItem.subpartsCount).toBeUndefined();
      expect(placedItem.marks).toBe(4);
    });

    it("only sets subpartsCount for multi-pair MATCH_COLUMN sections with marksEach === 1", () => {
      const mockMatchQuestion = {
        id: "mc-1",
        type: "MATCH_COLUMN",
        marks: 4,
        text: "Match the following terms with their definitions",
        optionsJson: JSON.stringify([
          "Term A ||| Def 1",
          "Term B ||| Def 2",
          "Term C ||| Def 3",
          "Term D ||| Def 4",
        ]),
        subpartsJson: null,
      };

      const mockItems = [
        {
          id: "item-match",
          paperId: "paper-1",
          sectionId: "sec-b",
          questionId: "mc-1",
          order: 0,
          marks: 4,
          question: mockMatchQuestion,
        },
      ];

      // Multi-unit MATCH_COLUMN section where marksEach is 1 and count is 4
      const mockSection = {
        id: "sec-b",
        name: "Section B",
        type: "MATCH_COLUMN" as const,
        count: 4,
        marksEach: 1,
      };

      const placed = toPlacedItems([mockSection as any], mockItems as any);
      expect(placed).toHaveLength(1);
      expect(placed[0].subpartsCount).toBe(4);
      expect(placed[0].marks).toBe(4);
    });
  });

  describe("AI Generation Normalization & Invariant Preservation", () => {
    it("generateQuestionsWithGemini normalizes subparts to match requested marks", async () => {
      const res = await generateQuestionsWithGemini({
        subject: "Science",
        className: "Class 10",
        chapter: "Life Processes",
        type: "CASE_STUDY",
        marks: 4,
        difficulty: "MEDIUM",
        count: 1,
        language: "en",
      });

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);

      const q = res.data[0];
      expect(q.type).toBe("CASE_STUDY");
      expect(q.subparts).toBeDefined();
      expect(q.subparts!.length).toBeGreaterThan(0);

      // Verify that subparts total marks strictly equals requested slot marks (4)
      const totalSubpartMarks = q.subparts!.reduce((acc, sp) => acc + (sp.marks || 0), 0);
      expect(totalSubpartMarks).toBe(4);
    }, 20000);

    it("generatePaperSectionWithGemini balances subparts to slot.marks / marksEach", async () => {
      const res = await generatePaperSectionWithGemini({
        className: "Class 10",
        subject: "Science",
        sectionTitle: "Section E: Case Study",
        sectionType: "CASE_STUDY",
        marksEach: 4,
        language: "en",
        difficulty: "BALANCED",
        slots: [
          { slotIndex: 0, chapterId: "c1", chapterNumber: 1, chapterTitle: "Electricity", marks: 4 },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);

      const q = res.data[0];
      expect(q.type).toBe("CASE_STUDY");
      expect(q.subparts).toBeDefined();

      const totalSubpartMarks = (q.subparts || []).reduce((acc, sp) => acc + (sp.marks || 0), 0);
      expect(totalSubpartMarks).toBe(4);
    }, 20000);

    it("generateQuestionsWithGemini deranges MATCH_COLUMN options automatically", async () => {
      const res = await generateQuestionsWithGemini({
        subject: "Science",
        className: "Class 10",
        chapter: "Acids, Bases and Salts",
        type: "MATCH_COLUMN",
        marks: 4,
        difficulty: "MEDIUM",
        count: 1,
        language: "en",
      });

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);

      const q = res.data[0];
      expect(q.type).toBe("MATCH_COLUMN");
      expect(q.options?.length).toBeGreaterThanOrEqual(4);

      // Deserializing options with text should yield pairs without throwing
      const pairs = parseMatchColumnPairs(q.options || [], q.text);
      expect(pairs.length).toBeGreaterThanOrEqual(4);
      for (const p of pairs) {
        expect(p.left).toBeTruthy();
        expect(p.right).toBeTruthy();
      }
    }, 20000);

    it("recovers matching pairs from explanation text when LLM places pairs in explanation", () => {
      const text =
        "Match the integrals in Column I with their correct evaluated forms in Column II based on standard integration formulas and algebraic substitutions:";
      const explanation =
        "To solve this, apply standard integration formulas: (A) \\int \\frac{1}{a^2 - x^2} dx = \\sin^{-1}(x/a) + C, which matches (iv). (B) \\int \\frac{1}{x^2 - a^2} dx = \\frac{1}{2a} \\log |(x-a)/(x+a)| + C, which matches (ii). (C) \\int \\sqrt{x^2 - a^2} dx = \\frac{x}{2} \\sqrt{x^2 - a^2} - \\frac{a^2}{2} \\log |x + \\sqrt{x^2 - a^2}| + C, which matches (iii). (D) \\int \\tan^{-1} x dx = x \\tan^{-1} x - \\frac{1}{2} \\log(1+x^2) + C, which matches (i).";

      const pairs = parseMatchColumnPairs([], text, explanation);
      expect(pairs).toHaveLength(4);
      expect(pairs[0].left).toContain("\\int \\frac{1}{a^2 - x^2} dx");
      expect(pairs[0].right).toContain("\\sin^{-1}(x/a) + C");
      expect(pairs[1].left).toContain("\\int \\frac{1}{x^2 - a^2} dx");
      expect(pairs[1].right).toContain("\\frac{1}{2a} \\log");
      expect(pairs[2].left).toContain("\\int \\sqrt{x^2 - a^2} dx");
      expect(pairs[3].left).toContain("\\int \\tan^{-1} x dx");
    });
  });
});
