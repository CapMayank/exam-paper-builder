import { describe, expect, it } from "vitest";
import { blueprintSchema } from "@/lib/schemas";
import {
  flattenSectionGroups,
  groupSectionsFromFlat,
  type SectionDef,
  type SectionGroup,
} from "@/lib/blueprint";
import {
  detectBoardRuleConflict,
  getBoardDefaultChoiceRequirement,
  resolveInternalChoiceRequirement,
  evaluatePaperInternalChoiceCompliance,
} from "@/lib/internalChoiceRules";
import { buildBlueprintExportPayload } from "@/lib/blueprintExport";
import { parseBlueprintImport } from "@/lib/blueprintImport";
import { autoFillPaper, type CandidateQuestion } from "@/lib/autofill";

describe("Blueprint-Level Internal Choice (OR / अथवा) Configuration", () => {
  describe("1. Zod Schema & Blueprint Section Model", () => {
    it("validates sections with orChoiceMode, orAlternativeCount, and orSlotsJson", () => {
      const validPayload = {
        name: "Class 10 Science Midterm",
        bookId: "book-123",
        examType: "HALF_YEARLY",
        durationMin: 180,
        academicSession: "2026-27",
        subjectCode: "086",
        sections: [
          {
            title: "Section A - Objective",
            type: "MCQ",
            count: 5,
            marksEach: 1,
            orChoiceMode: "NOT_REQUIRED",
            orAlternativeCount: 0,
            orSlotsJson: "[]",
          },
          {
            title: "Section B - Short Answer",
            type: "SHORT",
            count: 3,
            marksEach: 3,
            orChoiceMode: "REQUIRED",
            orAlternativeCount: 1,
            orSlotsJson: JSON.stringify([
              { slotIndex: 0, required: true },
              { slotIndex: 1, required: false },
              { slotIndex: 2, required: true },
            ]),
          },
        ],
        chapters: [{ chapterId: "ch-1", marks: 14 }],
      };

      const result = blueprintSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sections[0].orChoiceMode).toBe("NOT_REQUIRED");
        expect(result.data.sections[1].orChoiceMode).toBe("REQUIRED");
        expect(result.data.sections[1].orSlotsJson).toContain("slotIndex");
      }
    });

    it("falls back gracefully when orChoiceMode is omitted (backwards compatibility)", () => {
      const legacyPayload = {
        name: "Legacy Blueprint",
        bookId: "book-legacy",
        examType: "ANNUAL",
        durationMin: 180,
        sections: [
          {
            title: "Section C",
            type: "LONG",
            count: 2,
            marksEach: 4,
          },
        ],
        chapters: [{ chapterId: "ch-1", marks: 8 }],
      };

      const result = blueprintSchema.safeParse(legacyPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sections[0].orChoiceMode).toBe("BOARD_DEFAULT");
        expect(result.data.sections[0].orAlternativeCount).toBe(1);
      }
    });
  });

  describe("2. Board Default Rules & Soft Conflict Detection (MPBSE 2026-27)", () => {
    it("reports 2-mark questions as forbidden/not-required under MPBSE 2026-27 Circular 465", () => {
      const boardRule = getBoardDefaultChoiceRequirement({
        board: "MPBSE",
        academicSession: "2026-27",
        className: "Class 10",
        subject: "Science",
        questionType: "VERY_SHORT",
        marksEach: 2,
      });

      expect(boardRule.required).toBe(false);
      expect(boardRule.forbidden).toBe(true);
      expect(boardRule.reason).toContain("Circular 465");
    });

    it("reports 3-mark and 4-mark questions as required under MPBSE 2026-27", () => {
      const rule3m = getBoardDefaultChoiceRequirement({
        board: "MPBSE",
        academicSession: "2026-27",
        className: "Class 10",
        subject: "Science",
        questionType: "SHORT",
        marksEach: 3,
      });
      expect(rule3m.required).toBe(true);
      expect(rule3m.forbidden).toBe(false);

      const rule4m = getBoardDefaultChoiceRequirement({
        board: "MPBSE",
        academicSession: "2026-27",
        className: "Class 10",
        subject: "Science",
        questionType: "LONG",
        marksEach: 4,
      });
      expect(rule4m.required).toBe(true);
      expect(rule4m.forbidden).toBe(false);
    });

    it("detects soft conflict when teacher overrides 2-mark questions to REQUIRED", () => {
      const conflict = detectBoardRuleConflict({
        board: "MPBSE",
        academicSession: "2026-27",
        className: "Class 10",
        subject: "Science",
        questionType: "VERY_SHORT",
        marksEach: 2,
        orChoiceMode: "REQUIRED",
      });

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.message).toContain("Circular 465");
    });

    it("detects soft conflict when teacher disables required 3-mark or 4-mark questions", () => {
      const conflict = detectBoardRuleConflict({
        board: "MPBSE",
        academicSession: "2026-27",
        className: "Class 10",
        subject: "Science",
        questionType: "SHORT",
        marksEach: 3,
        orChoiceMode: "NOT_REQUIRED",
      });

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.message).toContain("prescribes internal choices");
    });
  });

  describe("3. Section Grouping & Flattening Roundtrip", () => {
    it("preserves orChoiceMode, orAlternativeCount, and orSlotsJson during grouping and flattening", () => {
      const flatSections: SectionDef[] = [
        {
          id: "s1",
          title: "Section B",
          type: "SHORT",
          count: 4,
          marksEach: 3,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          orSlotsJson: JSON.stringify([{ slotIndex: 1, required: false }]),
        },
      ];

      const groups = groupSectionsFromFlat(flatSections);
      expect(groups).toHaveLength(1);
      expect(groups[0].questionTypes[0].orChoiceMode).toBe("REQUIRED");
      expect(groups[0].questionTypes[0].orSlotsJson).toContain("slotIndex");

      const flattened = flattenSectionGroups(groups);
      expect(flattened).toHaveLength(1);
      expect(flattened[0].orChoiceMode).toBe("REQUIRED");
      expect(flattened[0].orSlotsJson).toContain("slotIndex");
    });
  });

  describe("4. JSON Export & Import Roundtrip", () => {
    it("exports and imports blueprint with internal choice configuration", () => {
      const blueprintData: any = {
        name: "Maths Blueprint",
        examType: "ANNUAL",
        durationMin: 180,
        academicSession: "2026-27",
        subjectCode: "041",
        book: { className: "Class 10", subject: "Mathematics" },
        sections: [
          {
            id: "sec-c",
            title: "Section C",
            type: "SHORT",
            count: 3,
            marksEach: 3,
            instructions: "Answer with internal choice",
            orChoiceMode: "REQUIRED",
            orAlternativeCount: 1,
            orSlotsJson: JSON.stringify([{ slotIndex: 0, required: true }, { slotIndex: 1, required: false }]),
          },
        ],
        chapters: [{ chapterId: "ch-1", marks: 9, chapter: { title: "Real Numbers", number: 1 } }],
      };

      const exported = buildBlueprintExportPayload(blueprintData);
      expect(exported.sections[0].questionTypes[0].orChoiceMode).toBe("REQUIRED");
      expect(exported.sections[0].questionTypes[0].orSlots).toBeDefined();

      const jsonStr = JSON.stringify(exported);
      const imported = parseBlueprintImport(jsonStr);

      expect(imported.success).toBe(true);
      expect(imported.blueprint.sections[0].orChoiceMode).toBe("REQUIRED");
      expect(imported.blueprint.sections[0].orAlternativeCount).toBe(1);
      expect(imported.blueprint.sections[0].orSlotsJson).toContain("slotIndex");
    });
  });

  describe("5. Slot-Level Overrides in Rules Engine & Audit", () => {
    it("resolves per-slot choice requirement from orSlotsJson override", () => {
      const slot0Req = resolveInternalChoiceRequirement({
        board: "MPBSE",
        academicSession: "2026-27",
        className: "Class 10",
        subject: "Science",
        questionType: "SHORT",
        marksEach: 3,
        slotIndex: 0,
        orChoiceMode: "REQUIRED",
        orSlotsJson: JSON.stringify([
          { slotIndex: 0, required: false },
          { slotIndex: 1, required: true },
        ]),
      });
      expect(slot0Req.required).toBe(false);

      const slot1Req = resolveInternalChoiceRequirement({
        board: "MPBSE",
        academicSession: "2026-27",
        className: "Class 10",
        subject: "Science",
        questionType: "SHORT",
        marksEach: 3,
        slotIndex: 1,
        orChoiceMode: "REQUIRED",
        orSlotsJson: JSON.stringify([
          { slotIndex: 0, required: false },
          { slotIndex: 1, required: true },
        ]),
      });
      expect(slot1Req.required).toBe(true);
    });

    it("evaluates paper compliance accurately when slot override is applied", () => {
      const audit = evaluatePaperInternalChoiceCompliance({
        schoolName: "Test School",
        blueprintName: "Audit Test",
        className: "Class 10",
        academicSession: "2026-27",
        subject: "Science",
        sections: [
          {
            id: "sec-b",
            title: "Section B",
            type: "SHORT",
            count: 2,
            marksEach: 3,
            orChoiceMode: "REQUIRED",
            orSlotsJson: JSON.stringify([
              { slotIndex: 0, required: false }, // slot 0 explicitly does NOT require OR
              { slotIndex: 1, required: true },  // slot 1 requires OR
            ]),
          },
        ],
        items: [
          {
            sectionId: "sec-b",
            question: { id: "q1", chapterId: "ch-1", type: "SHORT", text: "Primary Q1 without OR" },
            orQuestion: null,
          },
          {
            sectionId: "sec-b",
            question: { id: "q2", chapterId: "ch-1", type: "SHORT", text: "Primary Q2 with OR" },
            orQuestion: { id: "q2-or", chapterId: "ch-1", type: "SHORT", text: "Alternative Q2 text" },
          },
        ],
      });

      // Slot 0 has no OR and is compliant because of override; Slot 1 has OR and is compliant
      expect(audit.compliant).toBe(true);
      expect(audit.missingChoiceSlots).toHaveLength(0);
      expect(audit.invalidChoiceSlots).toHaveLength(0);
      expect(audit.issues).toHaveLength(0);
    });
  });

  describe("6. Autofill Solver with Blueprint-Level Internal Choices", () => {
    it("autofills alternative OR questions strictly from the same chapter when required", () => {
      const candidates: CandidateQuestion[] = [
        { id: "q1", chapterId: "ch-1", type: "SHORT", difficulty: "MEDIUM" },
        { id: "q2", chapterId: "ch-1", type: "SHORT", difficulty: "MEDIUM" }, // candidate OR for q1
        { id: "q3", chapterId: "ch-2", type: "SHORT", difficulty: "MEDIUM" }, // different chapter
      ];

      const bp = {
        sections: [
          {
            id: "sec-1",
            title: "Short Answer",
            type: "SHORT",
            count: 1,
            marksEach: 3,
            orChoiceMode: "REQUIRED",
          },
        ],
        chapters: [{ chapterId: "ch-1", marks: 3 }, { chapterId: "ch-2", marks: 3 }],
      };

      const result = autoFillPaper(bp, [], candidates);
      expect(result.added).toHaveLength(1);
      const placed = result.added[0];
      expect(placed.questionId).toBe("q1");
      expect(placed.requiresInternalChoice).toBe(true);
      expect(placed.orQuestionId).toBe("q2"); // picked q2 because chapterId matches q1
    });

    it("does not generate OR alternative when section has orChoiceMode: NOT_REQUIRED", () => {
      const candidates: CandidateQuestion[] = [
        { id: "q1", chapterId: "ch-1", type: "SHORT", difficulty: "MEDIUM" },
        { id: "q2", chapterId: "ch-1", type: "SHORT", difficulty: "MEDIUM" },
      ];

      const bp = {
        sections: [
          {
            id: "sec-1",
            title: "Short Answer",
            type: "SHORT",
            count: 1,
            marksEach: 3,
            orChoiceMode: "NOT_REQUIRED",
          },
        ],
        chapters: [{ chapterId: "ch-1", marks: 3 }],
      };

      const result = autoFillPaper(bp, [], candidates);
      expect(result.added).toHaveLength(1);
      expect(result.added[0].orQuestionId).toBeNull();
      expect(result.added[0].requiresInternalChoice).toBe(false);
    });
  });
});
