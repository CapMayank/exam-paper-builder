import { describe, it, expect } from "vitest";
import {
  validateCircular465Blueprint,
  MPBSE_BLUEPRINT_TEMPLATES,
} from "./curriculumTemplates";
import {
  validateBlueprint,
  toPlacedItems,
  paperStatus,
  BlueprintDef,
} from "./blueprint";
import {
  evaluatePaperInternalChoiceCompliance,
  resolveInternalChoiceRequirement,
} from "./internalChoiceRules";

describe("Milestone 2 Adversarial Challenger Test Suite", () => {
  // =========================================================================
  // 1. CIRCULAR 465 CHOICE RULES ADVERSARIAL CHALLENGES
  // =========================================================================
  describe("1. Circular 465 Choice Rules Engine Challenges", () => {
    it("catches 2-mark question with orChoiceMode === 'REQUIRED'", () => {
      const sections = [
        {
          title: "Section B: 2-Mark Questions",
          type: "SHORT",
          count: 5,
          marksEach: 2,
          orChoiceMode: "REQUIRED",
        },
      ];
      const audit = validateCircular465Blueprint(sections);
      expect(audit.isCompliant).toBe(false);
      expect(audit.violations.length).toBe(1);
      expect(audit.violations[0].ruleType).toBe("NO_CHOICE_2M");
      expect(audit.violations[0].marksEach).toBe(2);
    });

    it("catches 2-mark question with orAlternativeCount > 0 even when orChoiceMode is not 'REQUIRED'", () => {
      // Adversarial attack: Inject an OR alternative into a 2m question via orAlternativeCount: 1
      // while leaving orChoiceMode as BOARD_DEFAULT, NOT_REQUIRED, or omitted.
      const sectionsWithAlternativeCount1 = [
        {
          title: "Section B: 2-Mark Questions",
          type: "SHORT",
          count: 5,
          marksEach: 2,
          orAlternativeCount: 1,
          orChoiceMode: "BOARD_DEFAULT",
        },
      ];
      const audit1 = validateCircular465Blueprint(sectionsWithAlternativeCount1);

      const sectionsWithAlternativeCount2 = [
        {
          title: "Section B: 2-Mark Questions",
          type: "SHORT",
          count: 5,
          marksEach: 2,
          orAlternativeCount: 1,
          orChoiceMode: "NOT_REQUIRED",
        },
      ];
      const audit2 = validateCircular465Blueprint(sectionsWithAlternativeCount2);

      const sectionsWithAlternativeCount3 = [
        {
          title: "Section B: 2-Mark Questions",
          type: "SHORT",
          count: 5,
          marksEach: 2,
          orAlternativeCount: 1,
        },
      ];
      const audit3 = validateCircular465Blueprint(sectionsWithAlternativeCount3);

      // VERIFICATION RESULT:
      // validateCircular465Blueprint inspects sec.orAlternativeCount and flags 2m violations.
      expect(audit1.isCompliant).toBe(false);
      expect(audit1.violations.length).toBe(1);
      expect(audit1.violations[0].ruleType).toBe("NO_CHOICE_2M");
      expect(audit2.isCompliant).toBe(false);
      expect(audit2.violations.length).toBe(1);
      expect(audit2.violations[0].ruleType).toBe("NO_CHOICE_2M");
      expect(audit3.isCompliant).toBe(false);
      expect(audit3.violations.length).toBe(1);
      expect(audit3.violations[0].ruleType).toBe("NO_CHOICE_2M");
    });

    it("paper-level audit catches 2-mark question with OR question when orChoiceMode is BOARD_DEFAULT", () => {
      const report = evaluatePaperInternalChoiceCompliance({
        board: "MPBSE",
        academicSession: "2026–27",
        className: "Class 10",
        subject: "Science",
        sections: [
          {
            id: "sec-2m",
            title: "Section B",
            type: "SHORT",
            count: 1,
            marksEach: 2,
            orChoiceMode: "BOARD_DEFAULT",
            orAlternativeCount: 1,
          },
        ],
        items: [
          {
            id: "item-1",
            sectionId: "sec-2m",
            question: {
              id: "q1",
              chapterId: "ch1",
              type: "SHORT",
              text: "Define Ohm's law.",
            },
            orQuestion: {
              id: "q1-or",
              chapterId: "ch1",
              type: "SHORT",
              text: "State Joule's heating effect law.",
            },
          },
        ],
      });

      expect(report.compliant).toBe(false);
      expect(report.forbiddenChoiceSlots.length).toBe(1);
      expect(report.forbiddenChoiceSlots[0].status).toBe("FORBIDDEN_OR_PRESENT");
    });

    it("paper-level audit catches 2-mark question with OR even if section has orChoiceMode === 'NOT_REQUIRED'", () => {
      // If a section is marked NOT_REQUIRED (statutory MPBSE 2m mode),
      // but an OR question is attached anyway, evaluatePaperInternalChoiceCompliance
      // must flag it as FORBIDDEN_OR_PRESENT rather than masking it as VALID.
      const report = evaluatePaperInternalChoiceCompliance({
        board: "MPBSE",
        academicSession: "2026–27",
        className: "Class 10",
        subject: "Science",
        sections: [
          {
            id: "sec-2m",
            title: "Section B",
            type: "SHORT",
            count: 1,
            marksEach: 2,
            orChoiceMode: "NOT_REQUIRED",
            orAlternativeCount: 1,
          },
        ],
        items: [
          {
            id: "item-1",
            sectionId: "sec-2m",
            question: {
              id: "q1",
              chapterId: "ch1",
              type: "SHORT",
              text: "Define Ohm's law.",
            },
            orQuestion: {
              id: "q1-or",
              chapterId: "ch1",
              type: "SHORT",
              text: "State Joule's heating effect law.",
            },
          },
        ],
      });

      expect(report.compliant).toBe(false);
      expect(report.forbiddenChoiceSlots.length).toBe(1);
      expect(report.forbiddenChoiceSlots[0].status).toBe("FORBIDDEN_OR_PRESENT");
    });

    it("catches omission of OR alternative in 3-mark questions (orChoiceMode === 'NOT_REQUIRED')", () => {
      const sections = [
        {
          title: "Section C: 3-Mark Questions",
          type: "SHORT",
          count: 4,
          marksEach: 3,
          orChoiceMode: "NOT_REQUIRED",
        },
      ];
      const audit = validateCircular465Blueprint(sections);
      expect(audit.isCompliant).toBe(false);
      expect(audit.violations.length).toBe(1);
      expect(audit.violations[0].ruleType).toBe("MANDATORY_OR_3M_4M");
      expect(audit.violations[0].marksEach).toBe(3);
    });

    it("catches omission of OR alternative in 4-mark questions (orChoiceMode === 'NOT_REQUIRED')", () => {
      const sections = [
        {
          title: "Section D: 4-Mark Questions",
          type: "LONG",
          count: 3,
          marksEach: 4,
          orChoiceMode: "NOT_REQUIRED",
        },
      ];
      const audit = validateCircular465Blueprint(sections);
      expect(audit.isCompliant).toBe(false);
      expect(audit.violations.length).toBe(1);
      expect(audit.violations[0].ruleType).toBe("MANDATORY_OR_3M_4M");
      expect(audit.violations[0].marksEach).toBe(4);
    });

    it("verifies English attempt-k-of-n subpart pool calculation accuracy across multiple pool sizes", () => {
      // 1. Flamingo prose Q10: attempt 6 of 7 for 2m questions = 12m
      const bpSectionsQ10 = [{ id: "sec-q10", count: 1, marksEach: 12, type: "SHORT" }];
      const itemQ10 = {
        sectionId: "sec-q10",
        question: {
          id: "q10",
          chapterId: "ch-flam-1",
          type: "SHORT",
          text: "Answer any 6 of 7:",
          subpartsJson: JSON.stringify({
            attemptCount: 6,
            subparts: Array.from({ length: 7 }, (_, i) => ({ marks: 2, text: `Q10 subpart ${i + 1}` })),
          }),
        },
      };
      const placedQ10 = toPlacedItems(bpSectionsQ10, [itemQ10]);
      expect(placedQ10[0].marks).toBe(12); // K * marksEach = 6 * 2 = 12

      // 2. Flamingo poetry Q11: attempt 3 of 4 for 2m questions = 6m
      const bpSectionsQ11 = [{ id: "sec-q11", count: 1, marksEach: 6, type: "SHORT" }];
      const itemQ11 = {
        sectionId: "sec-q11",
        question: {
          id: "q11",
          chapterId: "ch-flam-p1",
          type: "SHORT",
          text: "Answer any 3 of 4:",
          subpartsJson: JSON.stringify({
            attemptCount: 3,
            subparts: Array.from({ length: 4 }, (_, i) => ({ marks: 2, text: `Q11 subpart ${i + 1}` })),
          }),
        },
      };
      const placedQ11 = toPlacedItems(bpSectionsQ11, [itemQ11]);
      expect(placedQ11[0].marks).toBe(6); // K * marksEach = 3 * 2 = 6

      // 3. Vistas Q12: attempt 2 of 3 for 2m questions = 4m
      const bpSectionsQ12 = [{ id: "sec-q12", count: 1, marksEach: 4, type: "SHORT" }];
      const itemQ12 = {
        sectionId: "sec-q12",
        question: {
          id: "q12",
          chapterId: "ch-vistas-1",
          type: "SHORT",
          text: "Answer any 2 of 3:",
          subpartsJson: JSON.stringify({
            attemptCount: 2,
            subparts: Array.from({ length: 3 }, (_, i) => ({ marks: 2, text: `Q12 subpart ${i + 1}` })),
          }),
        },
      };
      const placedQ12 = toPlacedItems(bpSectionsQ12, [itemQ12]);
      expect(placedQ12[0].marks).toBe(4); // K * marksEach = 2 * 2 = 4

      // 4. Grammar Q7: attempt 5 of 6 for 1m questions = 5m
      const bpSectionsQ7 = [{ id: "sec-q7", count: 1, marksEach: 5, type: "FILL_BLANK" }];
      const itemQ7 = {
        sectionId: "sec-q7",
        question: {
          id: "q7",
          chapterId: "ch-gram-1",
          type: "FILL_BLANK",
          text: "Fill blanks (attempt 5 of 6):",
          subpartsJson: JSON.stringify({
            attemptCount: 5,
            subparts: Array.from({ length: 6 }, (_, i) => ({ marks: 1, text: `Q7 subpart ${i + 1}` })),
          }),
        },
      };
      const placedQ7 = toPlacedItems(bpSectionsQ7, [itemQ7]);
      expect(placedQ7[0].marks).toBe(5); // K * marksEach = 5 * 1 = 5

      // 5. Paper status marks accounting: verify paperStatus sums correctly
      const bpDef: BlueprintDef = {
        sections: [
          { id: "sec-q10", title: "Flamingo Prose", type: "SHORT", count: 1, marksEach: 12 },
          { id: "sec-q11", title: "Flamingo Poetry", type: "SHORT", count: 1, marksEach: 6 },
          { id: "sec-q12", title: "Vistas Short", type: "SHORT", count: 1, marksEach: 4 },
          { id: "sec-q7", title: "Grammar Fill", type: "FILL_BLANK", count: 1, marksEach: 5 },
        ],
        chapters: [
          { chapterId: "ch-flam-1", marks: 12 },
          { chapterId: "ch-flam-p1", marks: 6 },
          { chapterId: "ch-vistas-1", marks: 4 },
          { chapterId: "ch-gram-1", marks: 5 },
        ],
      };

      const allPlaced = [...placedQ10, ...placedQ11, ...placedQ12, ...placedQ7];
      const status = paperStatus(bpDef, allPlaced);
      expect(status.totalMarks).toBe(27);
      expect(status.usedMarks).toBe(27);
      expect(status.complete).toBe(true);
      expect(status.chapters.every((c) => c.used === c.target)).toBe(true);
    });
  });

  // =========================================================================
  // 2. 3-LEVEL DP FEASIBILITY ENGINE CHALLENGES
  // =========================================================================
});
