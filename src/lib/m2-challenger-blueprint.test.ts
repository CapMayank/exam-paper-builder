import { describe, it, expect } from "vitest";
import {
  validateCircular465Blueprint,
  MPBSE_BLUEPRINT_TEMPLATES,
} from "./curriculumTemplates";
import {
  checkBlueprintFeasibility,
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
  describe("2. 3-Level DP Feasibility Engine Challenges", () => {
    it("flags unreachable single-chapter mark (e.g. 5m with 2m and 4m denominations)", () => {
      const bp = {
        sections: [
          { count: 5, marksEach: 2 },
          { count: 3, marksEach: 4 },
        ],
        chapters: [
          { chapterId: "ch-5m", title: "Unreachable Chapter", marks: 5 },
          { chapterId: "ch-other", title: "Other Chapter", marks: 17 },
        ],
      };
      const warnings = checkBlueprintFeasibility(bp);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes("cannot be formed by any combination"))).toBe(true);
    });

    it("flags unreachable single-chapter mark for other combinations (e.g. 7m with 4m and 6m)", () => {
      const bp = {
        sections: [
          { count: 3, marksEach: 4 },
          { count: 2, marksEach: 6 },
        ],
        chapters: [
          { chapterId: "ch-7m", title: "Optics", marks: 7 },
          { chapterId: "ch-17m", title: "Electrostatics", marks: 17 },
        ],
      };
      const warnings = checkBlueprintFeasibility(bp);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes("cannot be formed by any combination"))).toBe(true);
    });

    it("flags chapter quota smaller than minimum question denomination (e.g. 1m when smallest is 2m)", () => {
      const bp = {
        sections: [
          { count: 5, marksEach: 2 },
          { count: 2, marksEach: 3 },
        ],
        chapters: [
          { chapterId: "ch-1m", title: "Tiny Quota Chapter", marks: 1 },
          { chapterId: "ch-other", title: "Other Chapter", marks: 15 },
        ],
      };
      const warnings = checkBlueprintFeasibility(bp);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes("smallest section question is 2 marks"))).toBe(true);
    });

    it("flags chapter quota smaller than minimum question denomination when smallest is 3m", () => {
      const bp = {
        sections: [
          { count: 4, marksEach: 3 },
          { count: 2, marksEach: 4 },
        ],
        chapters: [
          { chapterId: "ch-2m", title: "Sub-min Chapter", marks: 2 },
          { chapterId: "ch-other", title: "Other Chapter", marks: 18 },
        ],
      };
      const warnings = checkBlueprintFeasibility(bp);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes("smallest section question is 3 marks"))).toBe(true);
    });

    it("flags global denomination oversubscription when two chapters require 4m questions but only one 4m question exists", () => {
      // Sections: 1x4m (4m), 1x5m (5m), 3x3m (9m) -> Total = 18m.
      // Denominations: {3, 4, 5}.
      // Capacities: C(3)=3, C(4)=1, C(5)=1.
      // Chapters:
      // Ch1: 7m (can only be formed by 4+3; requires 1x4m and 1x3m)
      // Ch2: 7m (can only be formed by 4+3; requires 1x4m and 1x3m)
      // Ch3: 4m (can only be formed by 1x4m)
      // Total chapter marks = 7 + 7 + 4 = 18m.
      // Both Level 1 (total marks match 18===18) and Level 2 (each chapter quota 7, 7, 4 is reachable) pass.
      // But together they require three 4m questions when only one 4m question exists!
      const bp = {
        sections: [
          { count: 1, marksEach: 4 },
          { count: 1, marksEach: 5 },
          { count: 3, marksEach: 3 },
        ],
        chapters: [
          { chapterId: "ch-1", title: "Chapter 1", marks: 7 },
          { chapterId: "ch-2", title: "Chapter 2", marks: 7 },
          { chapterId: "ch-3", title: "Chapter 3", marks: 4 },
        ],
      };

      const warnings = checkBlueprintFeasibility(bp);
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toMatch(/Denomination capacity conflict/);
    });

    it("flags global denomination oversubscription with another 4m contention scenario", () => {
      // Sections: 1x4m, 2x3m, 1x2m (Total: 4 + 6 + 2 = 12m).
      // Capacities: C(2)=1, C(3)=2, C(4)=1.
      // Chapters: Ch1=4m, Ch2=4m, Ch3=4m (Total: 12m).
      // For a 4m target with {2, 3, 4}:
      // Candidate sums:
      // - 4 = 4 (uses 1x4m)
      // - 4 = 2 + 2 (requires TWO 2m, but C(2)=1!)
      // - 4 = 3 + 1 (1m doesn't exist)
      // Therefore, the ONLY valid partition for 4m is 1x4m!
      // All three chapters need 1x4m, but only ONE 4m question exists in the sections!
      const bp = {
        sections: [
          { count: 1, marksEach: 4 },
          { count: 2, marksEach: 3 },
          { count: 1, marksEach: 2 },
        ],
        chapters: [
          { chapterId: "ch-1", title: "Mechanics", marks: 4 },
          { chapterId: "ch-2", title: "Optics", marks: 4 },
          { chapterId: "ch-3", title: "Thermodynamics", marks: 4 },
        ],
      };

      const warnings = checkBlueprintFeasibility(bp);
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toMatch(/Denomination capacity conflict/);
    });

    it("edge case: handles chapter with 0 marks cleanly", () => {
      const bp = {
        sections: [
          { count: 2, marksEach: 2 },
          { count: 1, marksEach: 4 },
        ],
        chapters: [
          { chapterId: "ch-active", title: "Active Chapter", marks: 8 },
          { chapterId: "ch-inactive", title: "Inactive Chapter", marks: 0 },
        ],
      };
      const warnings = checkBlueprintFeasibility(bp);
      expect(warnings).toEqual([]);
    });

    it("edge case: single chapter with all marks passes when valid partition exists", () => {
      const bp = {
        sections: [
          { count: 10, marksEach: 2 },
          { count: 5, marksEach: 3 },
        ], // 20 + 15 = 35 marks
        chapters: [
          { chapterId: "ch-solo", title: "Solo Chapter", marks: 35 },
        ],
      };
      const warnings = checkBlueprintFeasibility(bp);
      expect(warnings).toEqual([]);
    });

    it("edge case: all chapters equal marks passes when partition matches", () => {
      const bp = {
        sections: [
          { count: 4, marksEach: 2 },
          { count: 4, marksEach: 3 },
        ], // 8 + 12 = 20 marks
        chapters: [
          { chapterId: "ch-1", title: "Chapter 1", marks: 5 },
          { chapterId: "ch-2", title: "Chapter 2", marks: 5 },
          { chapterId: "ch-3", title: "Chapter 3", marks: 5 },
          { chapterId: "ch-4", title: "Chapter 4", marks: 5 },
        ], // 4 chapters * 5m each = 20m. Each chapter takes (1x2m + 1x3m) = 5m.
      };
      const warnings = checkBlueprintFeasibility(bp);
      expect(warnings).toEqual([]);
    });

    it("edge case: enforceMarksConservation flag activates Level 1 total check", () => {
      const bp = {
        sections: [{ count: 5, marksEach: 2 }], // 10m
        chapters: [{ chapterId: "c1", marks: 8 }], // 8m
        enforceMarksConservation: true,
      };
      const warnings = checkBlueprintFeasibility(bp);
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toMatch(/Sections total 10 marks but chapter weightage totals 8/);
    });

    it("edge case: empty sections or chapters returns empty warnings", () => {
      expect(checkBlueprintFeasibility({ sections: [], chapters: [] })).toEqual([]);
      expect(checkBlueprintFeasibility({ sections: [{ count: 1, marksEach: 2 }], chapters: [] })).toEqual([]);
      expect(checkBlueprintFeasibility({ sections: [], chapters: [{ chapterId: "c1", marks: 5 }] })).toEqual([]);
    });

    it("edge case: chapter count > 30 bypasses Level 3 to prevent exponential blowup", () => {
      // 31 chapters
      const chapters = Array.from({ length: 31 }, (_, i) => ({
        chapterId: `ch-${i + 1}`,
        title: `Chapter ${i + 1}`,
        marks: 2,
      }));
      const sections = [{ count: 31, marksEach: 2 }];
      const warnings = checkBlueprintFeasibility({ sections, chapters });
      expect(warnings).toEqual([]);
    });
  });
});
