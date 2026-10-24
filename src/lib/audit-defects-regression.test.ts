import { describe, expect, it } from "vitest";
import { exportQuestionsToCsv } from "./batchQuestionIo";
import { formatQuestionNumber as formatNumberConstants, normalizeMcqAnswer } from "./constants";
import { formatQuestionNumber as formatNumberLayout } from "./layout";
import { permuteMcqOptions } from "./multiset";
import { toPlacedItems } from "./papers";
import { questionSchema } from "./schemas";
import { normalizeSubpartMarks, parseSubparts, type QuestionDto, type SubPart } from "./types";

describe("Audit Defect Fixes Regression Test Suite (DEF-01 to DEF-15)", () => {
  describe("DEF-01 & DEF-02: Subparts Preservation in Forked Question Variants", () => {
    it("parseSubparts extracts subparts from object wrappers with _forkedFrom metadata", () => {
      const originalSubparts: SubPart[] = [
        { label: "(i)", text: "What is photosynthesis?", marks: 2 },
        { label: "(ii)", text: "Write the chemical equation.", marks: 2 },
      ];

      const forkedPayload = JSON.stringify({
        items: originalSubparts,
        _forkedFrom: "orig-question-123",
        _reconciledToChapter: "ch-456",
        _paperSet: "SET B",
        _paperId: "paper-789",
      });

      const parsed = parseSubparts(forkedPayload);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].label).toBe("(i)");
      expect(parsed[0].text).toBe("What is photosynthesis?");
      expect(parsed[0].marks).toBe(2);
      expect(parsed[1].label).toBe("(ii)");
      expect(parsed[1].marks).toBe(2);
    });

    it("parseSubparts still seamlessly parses legacy raw array JSON", () => {
      const rawSubparts: SubPart[] = [
        { label: "(a)", text: "Calculate resistance.", marks: 3 },
      ];
      const parsed = parseSubparts(JSON.stringify(rawSubparts));
      expect(parsed).toHaveLength(1);
      expect(parsed[0].label).toBe("(a)");
      expect(parsed[0].marks).toBe(3);
    });
  });

  describe("DEF-04: MCQ Shuffling Answer Key Synchronization with Prefixes", () => {
    it("permutes MCQ options correctly when answer contains '(B) Mitochondria'", () => {
      const options = ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"];
      const answer = "(B) Mitochondria";

      const result = permuteMcqOptions(options, answer);
      expect(result.options).toHaveLength(4);

      // Mitochondria must be tracked to its new shuffled letter
      const newMitoIndex = result.options.indexOf("Mitochondria");
      expect(newMitoIndex).toBeGreaterThanOrEqual(0);
      const expectedLetter = ["A", "B", "C", "D"][newMitoIndex];
      expect(result.answer).toBe(expectedLetter);
    });

    it("permutes MCQ options correctly when answer is 'Option C: Chloroplast'", () => {
      const options = ["Vacuole", "Ribosome", "Chloroplast", "Lysosome"];
      const answer = "Option C: Chloroplast";

      const result = permuteMcqOptions(options, answer);
      const newIndex = result.options.indexOf("Chloroplast");
      const expectedLetter = ["A", "B", "C", "D"][newIndex];
      expect(result.answer).toBe(expectedLetter);
    });
  });

  describe("DEF-06: SVG Image Upload Schema Compatibility", () => {
    it("accepts .svg imagePath in questionSchema", () => {
      const validPayload = {
        bookId: "b1",
        chapterId: "c1",
        type: "SHORT",
        text: "Explain the circuit diagram below:",
        options: [],
        subparts: [],
        answer: "Current flows from positive to negative terminal.",
        difficulty: "MEDIUM",
        imagePath: "12345678-1234-1234-1234-123456789abc.svg",
        spaceMm: 20,
        showGrid: false,
      };

      const parsed = questionSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
    });

    it("still accepts png, jpg, webp, and gif", () => {
      for (const ext of ["png", "jpg", "jpeg", "webp", "gif"]) {
        const payload = {
          bookId: "b1",
          chapterId: "c1",
          type: "SHORT",
          text: "Question text",
          options: [],
          subparts: [],
          answer: "Answer text",
          difficulty: "EASY",
          imagePath: `12345678-1234-1234-1234-123456789abc.${ext}`,
          spaceMm: 0,
          showGrid: false,
        };
        expect(questionSchema.safeParse(payload).success).toBe(true);
      }
    });
  });

  describe("DEF-07: Multi-Unit Match Allocation with secMarksEach > 1", () => {
    it("evaluates effectiveMarks as count * secMarksEach when secMarksEach is 2", () => {
      const placed = toPlacedItems(
        {
          sections: [
            {
              id: "s1",
              title: "Section B",
              type: "MATCH_COLUMN",
              count: 4,
              marksEach: 2, // 4 pairs * 2 marks = 8 marks total
            } as any,
          ],
        },
        [
          {
            id: "item-1",
            sectionId: "s1",
            question: {
              id: "q1",
              chapterId: "ch1",
              type: "MATCH_COLUMN",
              text: "Match Column I with Column II",
              options: ["A::1", "B::2", "C::3", "D::4"],
              optionsJson: JSON.stringify(["A::1", "B::2", "C::3", "D::4"]),
              subparts: [],
            } as any,
          } as any,
        ],
      );

      expect(placed).toHaveLength(1);
      // 4 pairs * 2 marks = 8 marks total
      expect(placed[0].marks).toBe(8);
      expect(placed[0].subpartsCount).toBe(4);
    });
  });

  describe("DEF-10: Conflicting formatQuestionNumber Signatures & Index Collision", () => {
    it("formats sequential section-relative numbers without 0/1 index collision", () => {
      // Index 0 -> A1, Index 1 -> A2, Index 2 -> A3
      expect(formatNumberLayout("SECTION_RELATIVE", 0, "A", 0)).toBe("A1");
      expect(formatNumberLayout("SECTION_RELATIVE", 1, "A", 1)).toBe("A2");
      expect(formatNumberLayout("SECTION_RELATIVE", 2, "A", 2)).toBe("A3");
    });

    it("constants formatQuestionNumber handles both layout and constants signatures gracefully", () => {
      // Constants signature (num, style, secLetter, secIndex)
      expect(formatNumberConstants(1, "SECTION_RELATIVE", "A", 1)).toBe("A1.");
      expect(formatNumberConstants(2, "SECTION_RELATIVE", "A", 2)).toBe("A2.");

      // Layout signature (style, globalIdx, secLetter, secIndex)
      expect(formatNumberConstants("SECTION_RELATIVE", 0, "B", 0)).toBe("B1.");
      expect(formatNumberConstants("SECTION_RELATIVE", 1, "B", 1)).toBe("B2.");
      expect(formatNumberConstants("PREFIXED", 0, "A", 0)).toBe("Q.1");
      expect(formatNumberConstants("CONTINUOUS", 4, "A", 4)).toBe("5.");
    });
  });

  describe("DEF-11: Subpart Preservation in normalizeSubpartMarks", () => {
    it("preserves all 4 subparts when target marks is 3 (does not truncate subparts)", () => {
      const subparts = [
        { label: "(i)", text: "Define inertia.", marks: 1 },
        { label: "(ii)", text: "State Newton's first law.", marks: 1 },
        { label: "(iii)", text: "Give one daily life example.", marks: 1 },
        { label: "(iv)", text: "What happens when brakes are applied?", marks: 1 },
      ];

      const normalized = normalizeSubpartMarks(subparts, 3);
      // Must NOT truncate the 4th subpart!
      expect(normalized).toHaveLength(4);
      expect(normalized[3].text).toBe("What happens when brakes are applied?");
      for (const sp of normalized) {
        expect(sp.marks).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("DEF-13: Question CSV Export Option E & Option F", () => {
    it("exports Option E and Option F in CSV output", () => {
      const dummyQuestions: QuestionDto[] = [
        {
          id: "q-1",
          bookId: "b1",
          chapterId: "c1",
          type: "MCQ",
          text: "Which of the following are halogens?",
          options: ["Fluorine", "Chlorine", "Bromine", "Iodine", "Astatine", "Tennessine"],
          answer: "(A) Fluorine",
          difficulty: "HARD",
          spaceMm: 0,
          showGrid: false,
          chapter: { id: "c1", number: 5, title: "Periodic Table" } as any,
          subparts: [],
        },
      ];

      const csv = exportQuestionsToCsv(dummyQuestions);
      expect(csv).toContain("Option E");
      expect(csv).toContain("Option F");
      expect(csv).toContain("Astatine");
      expect(csv).toContain("Tennessine");
    });
  });
});
