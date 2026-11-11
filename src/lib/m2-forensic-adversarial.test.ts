import { describe, expect, it } from "vitest";
import {
  MPBSE_BLUEPRINT_TEMPLATES,
  STANDARD_BLUEPRINT_TEMPLATES,
  adaptChaptersHamiltonHare,
  normalizeQuestionType,
  validateCircular465Blueprint,
  TERM_CONFIGS,
} from "./curriculumTemplates";
import { blueprintSchema } from "./schemas";

describe("Forensic Adversarial Audit: Milestone 2 Deliverables", () => {
  // ===========================================================================
  // 1. STATUTORY CIRCULAR 465 COMPLIANCE & EXPLOIT ATTEMPTS
  // ===========================================================================
  describe("Statutory Circular 465 Exploit Attempts", () => {
    it("strictly flags any attempt to enable internal choice on 2-mark questions", () => {
      const exploitPayload = [
        {
          title: "Exploit Section",
          type: "SHORT",
          count: 5,
          marksEach: 2,
          orChoiceMode: "REQUIRED",
        },
      ];
      const audit = validateCircular465Blueprint(exploitPayload);
      expect(audit.isCompliant).toBe(false);
      expect(audit.violations.length).toBe(1);
      expect(audit.violations[0].ruleType).toBe("NO_CHOICE_2M");
      expect(audit.violations[0].severity).toBe("error");
    });

    it("strictly flags any attempt to disable internal choice on 3-mark or 4-mark questions", () => {
      const exploitPayload = [
        {
          title: "Exploit 3m",
          type: "SHORT",
          count: 3,
          marksEach: 3,
          orChoiceMode: "NOT_REQUIRED",
        },
        {
          title: "Exploit 4m",
          type: "LONG",
          count: 3,
          marksEach: 4,
          orChoiceMode: "NOT_REQUIRED",
        },
      ];
      const audit = validateCircular465Blueprint(exploitPayload);
      expect(audit.isCompliant).toBe(false);
      expect(audit.violations.length).toBe(2);
      expect(audit.violations.every((v) => v.ruleType === "MANDATORY_OR_3M_4M")).toBe(true);
    });

    it("verifies that 100% of all 27 board templates have NO choice on 2m questions without exception", () => {
      for (const template of MPBSE_BLUEPRINT_TEMPLATES) {
        for (const grp of template.sections) {
          for (const qt of grp.questionTypes) {
            if (qt.marksEach === 2) {
              expect(qt.orChoiceMode).not.toBe("REQUIRED");
              expect(qt.orAlternativeCount ?? 0).toBe(0);
              if (qt.choicePolicy) {
                expect(qt.choicePolicy.policyType).toBe("NO_CHOICE");
              }
            }
          }
        }
      }
    });

    it("verifies that all non-English templates enforce 100% mandatory OR choices on 3m and 4m questions", () => {
      const nonEnglish = MPBSE_BLUEPRINT_TEMPLATES.filter(
        (t) => t.archetype !== "ENGLISH_16Q_75M" && t.archetype !== "ENGLISH_15Q_80M" && !t.archetype.endsWith("MUSIC")
      );
      expect(nonEnglish.length).toBeGreaterThanOrEqual(25);
      for (const template of nonEnglish) {
        for (const grp of template.sections) {
          for (const qt of grp.questionTypes) {
            if (qt.marksEach === 3 || qt.marksEach === 4) {
              expect(qt.orChoiceMode).toBe("REQUIRED");
              expect(qt.orAlternativeCount).toBe(1);
              if (qt.choicePolicy) {
                expect(qt.choicePolicy.policyType).toBe("FULL_OR_ALTERNATIVE");
                expect(qt.choicePolicy.poolScope).toBe("SAME_UNIT");
              }
            }
          }
        }
      }
    });
  });

  // ===========================================================================
  // 2. DYNAMIC PROGRAMMING FEASIBILITY ALGORITHM STRESS-TESTING
  // ===========================================================================
  // ===========================================================================
  // 3. HAMILTON-HARE PROPORTIONAL ADAPTATION ALGORITHM
  // ===========================================================================
  describe("Hamilton-Hare Largest Remainder Method: Stress & Conservation", () => {
    it("strictly conserves targetMarks for prime number of chapters and uneven remainders", () => {
      // 11 active chapters into 70 marks (Class 11/12 Science)
      const chapters = [
        { chapterId: "c1", officialMarks: 7 },
        { chapterId: "c2", officialMarks: 6 },
        { chapterId: "c3", officialMarks: 8 },
        { chapterId: "c4", officialMarks: 5 },
        { chapterId: "c5", officialMarks: 7 },
        { chapterId: "c6", officialMarks: 6 },
        { chapterId: "c7", officialMarks: 6 },
        { chapterId: "c8", officialMarks: 8 },
        { chapterId: "c9", officialMarks: 5 },
        { chapterId: "c10", officialMarks: 6 },
        { chapterId: "c11", officialMarks: 6 },
      ]; // Total official = 70

      // Adapt to 25m (Unit Test)
      const adapted25 = adaptChaptersHamiltonHare(chapters, 25, 1);
      expect(adapted25.reduce((sum, c) => sum + c.marks, 0)).toBe(25);
      expect(adapted25.every((c) => c.marks >= 1)).toBe(true);

      // Adapt to 50m (Quarterly)
      const adapted50 = adaptChaptersHamiltonHare(chapters, 50, 1);
      expect(adapted50.reduce((sum, c) => sum + c.marks, 0)).toBe(50);
      expect(adapted50.every((c) => c.marks >= 1)).toBe(true);

      // Adapt to 80m
      const adapted80 = adaptChaptersHamiltonHare(chapters, 80, 1);
      expect(adapted80.reduce((sum, c) => sum + c.marks, 0)).toBe(80);
      expect(adapted80.every((c) => c.marks >= 1)).toBe(true);
    });

    it("handles boundary condition with 0 active chapters", () => {
      expect(adaptChaptersHamiltonHare([], 50, 1)).toEqual([]);
    });

    it("handles boundary condition with 1 active chapter", () => {
      const single = [{ chapterId: "solitary", officialMarks: 10 }];
      const res = adaptChaptersHamiltonHare(single, 50, 2);
      expect(res).toEqual([{ chapterId: "solitary", officialMarks: 10, marks: 50 }]);
    });

    it("preserves relative chapter weight ordering under proportional scaling", () => {
      const chapters = [
        { chapterId: "heavy", officialMarks: 20 },
        { chapterId: "medium", officialMarks: 10 },
        { chapterId: "light", officialMarks: 5 },
      ];
      const adapted = adaptChaptersHamiltonHare(chapters, 35, 1);
      expect(adapted[0].marks).toBeGreaterThan(adapted[1].marks);
      expect(adapted[1].marks).toBeGreaterThan(adapted[2].marks);
      expect(adapted.reduce((s, c) => s + c.marks, 0)).toBe(35);
    });
  });

  // ===========================================================================
  // 4. SCHEMA & PERSISTENCE INTEGRITY
  // ===========================================================================
  describe("Blueprint Schema & Persistence Model Integrity", () => {
    it("validates that curriculumMode accepts only allowed literals", () => {
      const validPayload = {
        name: "Test Blueprint",
        bookId: "b1",
        examType: "ANNUAL",
        durationMin: 180,
        curriculumMode: "STANDARD_MPBSE",
        chapters: [{ chapterId: "c1", marks: 75 }],
        sections: [{ title: "S1", type: "MCQ", count: 75, marksEach: 1 }],
      };
      expect(() => blueprintSchema.parse(validPayload)).not.toThrow();

      const invalidPayload = {
        ...validPayload,
        curriculumMode: "INVALID_HACKED_MODE",
      };
      expect(() => blueprintSchema.parse(invalidPayload)).toThrow();
    });

    it("defaults curriculumMode to BLANK_CUSTOM when omitted", () => {
      const minimalPayload = {
        name: "Minimal",
        bookId: "b1",
        examType: "QUARTERLY",
        durationMin: 120,
        chapters: [{ chapterId: "c1", marks: 50 }],
        sections: [{ title: "S1", type: "MCQ", count: 50, marksEach: 1 }],
      };
      const parsed = blueprintSchema.parse(minimalPayload);
      expect(parsed.curriculumMode).toBe("BLANK_CUSTOM");
    });
  });
});
