import { describe, expect, it } from "vitest";
import {
  MPBSE_BLUEPRINT_TEMPLATES,
  STANDARD_BLUEPRINT_TEMPLATES,
  adaptChaptersHamiltonHare,
  normalizeQuestionType,
  validateCircular465Blueprint,
  TERM_CONFIGS,
} from "./curriculumTemplates";
import { checkBlueprintFeasibility, validateBlueprint } from "./blueprint";
import {
  adaptCustomSchoolBlueprint,
  mapCurriculumTemplateToBlueprintInput,
} from "./blueprints";
import { prisma } from "./prisma";

describe("MPBSE Blueprint Engine & Circular 465 Logic", () => {
  // ===========================================================================
  // SUITE 1: 27 VERIFIED TEMPLATES & ARCHETYPES COVERAGE
  // ===========================================================================
  describe("Suite 1: All 27 Verified Board Blueprint Templates", () => {
    it("exports exactly 27 verified board blueprint templates", () => {
      expect(MPBSE_BLUEPRINT_TEMPLATES.length).toBe(27);
    });

    it("verifies template distribution across classes and streams", () => {
      const class9 = MPBSE_BLUEPRINT_TEMPLATES.filter((t) => t.classLevel === 9);
      const class10 = MPBSE_BLUEPRINT_TEMPLATES.filter((t) => t.classLevel === 10);
      const class11 = MPBSE_BLUEPRINT_TEMPLATES.filter((t) => t.classLevel === 11);
      const class12 = MPBSE_BLUEPRINT_TEMPLATES.filter((t) => t.classLevel === 12);

      expect(class9.length).toBe(7);
      expect(class10.length).toBe(8);
      expect(class11.length).toBe(6);
      expect(class12.length).toBe(6);
    });

    it("enforces total marks integrity across all archetypes", () => {
      for (const t of MPBSE_BLUEPRINT_TEMPLATES) {
        const totalMarks = t.sections.reduce(
          (sum, grp) =>
            sum + grp.questionTypes.reduce((s, qt) => s + qt.count * qt.marksEach, 0),
          0
        );

        if (t.archetype === "STANDARD_23Q_75M" || t.archetype === "ENGLISH_16Q_75M") {
          expect(totalMarks).toBe(75);
          expect(t.totalMarks).toBe(75);
        } else if (t.archetype === "SCIENCE_20Q_70M") {
          expect(totalMarks).toBe(70);
          expect(t.totalMarks).toBe(70);
        } else if (t.archetype === "STANDARD_23Q_80M" || t.archetype === "ENGLISH_15Q_80M") {
          expect(totalMarks).toBe(80);
          expect(t.totalMarks).toBe(80);
        }
      }
    });

    it("verifies STANDARD_23Q_75M archetype question structure", () => {
      const template = MPBSE_BLUEPRINT_TEMPLATES.find(
        (t) => t.archetype === "STANDARD_23Q_75M" && t.classLevel === 10 && t.subjectCode === "100"
      )!;
      expect(template).toBeDefined();

      const flatQts = template.sections.flatMap((g) => g.questionTypes);
      const objItems = flatQts.slice(0, 5);
      const vsaItems = flatQts[5]; // Q.6 to Q.17
      const saItems = flatQts[6];  // Q.18 to Q.20
      const laItems = flatQts[7];  // Q.21 to Q.23

      expect(objItems.reduce((s, q) => s + q.count, 0)).toBe(30);
      expect(vsaItems.count).toBe(12);
      expect(vsaItems.marksEach).toBe(2);
      expect(saItems.count).toBe(3);
      expect(saItems.marksEach).toBe(3);
      expect(laItems.count).toBe(3);
      expect(laItems.marksEach).toBe(4);

      // Total numbered questions: 5 objective groups + 12 VSA + 3 SA + 3 LA = 23 questions
      const numberedCount = 5 + vsaItems.count + saItems.count + laItems.count;
      expect(numberedCount).toBe(23);
    });

    it("verifies SCIENCE_20Q_70M archetype question structure", () => {
      const template = MPBSE_BLUEPRINT_TEMPLATES.find(
        (t) => t.archetype === "SCIENCE_20Q_70M" && t.classLevel === 12 && t.subjectCode === "210"
      )!;
      expect(template).toBeDefined();

      const flatQts = template.sections.flatMap((g) => g.questionTypes);
      const objItems = flatQts.slice(0, 5);
      const vsaItems = flatQts[5]; // Q.6 to Q.12
      const saItems = flatQts[6];  // Q.13 to Q.16
      const laItems = flatQts[7];  // Q.17 to Q.20

      expect(objItems.reduce((s, q) => s + q.count, 0)).toBe(28); // 6 + 6 + 5 + 5 + 6
      expect(vsaItems.count).toBe(7);
      expect(vsaItems.marksEach).toBe(2);
      expect(saItems.count).toBe(4);
      expect(saItems.marksEach).toBe(3);
      expect(laItems.count).toBe(4);
      expect(laItems.marksEach).toBe(4);

      // Numbered questions: 5 obj groups + 7 VSA + 4 SA + 4 LA = 20 questions
      const numberedCount = 5 + vsaItems.count + saItems.count + laItems.count;
      expect(numberedCount).toBe(20);
    });

    it("verifies STANDARD_23Q_80M archetype question structure", () => {
      const template = MPBSE_BLUEPRINT_TEMPLATES.find(
        (t) => t.archetype === "STANDARD_23Q_80M" && t.classLevel === 12 && t.subjectCode === "150"
      )!;
      expect(template).toBeDefined();

      const flatQts = template.sections.flatMap((g) => g.questionTypes);
      const objItems = flatQts.slice(0, 5);
      const vsaItems = flatQts[5]; // Q.6 to Q.15
      const saItems = flatQts[6];  // Q.16 to Q.19
      const laItems = flatQts[7];  // Q.20 to Q.23

      expect(objItems.reduce((s, q) => s + q.count, 0)).toBe(32); // 6 + 6 + 6 + 7 + 7
      expect(vsaItems.count).toBe(10);
      expect(vsaItems.marksEach).toBe(2);
      expect(saItems.count).toBe(4);
      expect(saItems.marksEach).toBe(3);
      expect(laItems.count).toBe(4);
      expect(laItems.marksEach).toBe(4);

      // Numbered questions: 5 obj groups + 10 VSA + 4 SA + 4 LA = 23 questions
      const numberedCount = 5 + vsaItems.count + saItems.count + laItems.count;
      expect(numberedCount).toBe(23);
    });

    it("normalizes question type strings correctly", () => {
      expect(normalizeQuestionType("FILL_IN_BLANKS")).toBe("FILL_BLANK");
      expect(normalizeQuestionType("MATCH_FOLLOWING")).toBe("MATCH_COLUMN");
      expect(normalizeQuestionType("ONE_WORD")).toBe("VERY_SHORT");
      expect(normalizeQuestionType("VERY_SHORT_ANSWER")).toBe("VERY_SHORT");
      expect(normalizeQuestionType("SHORT_ANSWER")).toBe("SHORT");
      expect(normalizeQuestionType("LONG_ANSWER")).toBe("LONG");
      expect(normalizeQuestionType("MCQ")).toBe("MCQ");
      expect(normalizeQuestionType("TRUE_FALSE")).toBe("TRUE_FALSE");
      expect(normalizeQuestionType("UNKNOWN_CUSTOM")).toBe("SHORT");
    });
  });

  // ===========================================================================
  // SUITE 2: STATUTORY CIRCULAR 465 CHOICE RULES ENGINE
  // ===========================================================================
  describe("Suite 2: Statutory Circular 465 Internal Choice Rules", () => {
    it("enforces complete abolition of internal choice in 2-mark questions across all templates", () => {
      for (const t of MPBSE_BLUEPRINT_TEMPLATES) {
        for (const grp of t.sections) {
          for (const qt of grp.questionTypes) {
            if (qt.marksEach === 2) {
              expect(qt.orChoiceMode).toBe("NOT_REQUIRED");
              expect(qt.orAlternativeCount ?? 0).toBe(0);
              if (qt.choicePolicy) {
                expect(qt.choicePolicy.policyType).toBe("NO_CHOICE");
              }
            }
          }
        }
      }
    });

    it("enforces 100% mandatory internal choice on 3-mark and 4-mark questions", () => {
      for (const t of MPBSE_BLUEPRINT_TEMPLATES) {
        // Exclude English reading/writing specific passages if any
        if (t.archetype === "ENGLISH_16Q_75M" || t.archetype === "ENGLISH_15Q_80M") continue;

        for (const grp of t.sections) {
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

    it("validates Circular 465 compliance and detects illegal choices on 2m questions", () => {
      const illegalSections = [
        { title: "2m Section", type: "SHORT", count: 5, marksEach: 2, orChoiceMode: "REQUIRED" },
        { title: "3m Section", type: "SHORT", count: 3, marksEach: 3, orChoiceMode: "REQUIRED" },
      ];
      const audit = validateCircular465Blueprint(illegalSections);
      expect(audit.isCompliant).toBe(false);
      expect(audit.violations.some((v) => v.ruleType === "NO_CHOICE_2M")).toBe(true);
      expect(audit.circularReference).toBe("465/विद्योचित/2026");
    });

    it("validates Circular 465 compliance and detects missing choices on 3m/4m questions", () => {
      const nonCompliantSections = [
        { title: "2m Section", type: "SHORT", count: 5, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        { title: "3m Section", type: "SHORT", count: 3, marksEach: 3, orChoiceMode: "NOT_REQUIRED" },
      ];
      const audit = validateCircular465Blueprint(nonCompliantSections);
      expect(audit.isCompliant).toBe(false);
      expect(audit.violations.some((v) => v.ruleType === "MANDATORY_OR_3M_4M")).toBe(true);
    });

    it("passes compliant MPBSE blueprint sections with 100% coverage", () => {
      const compliantSections = [
        { title: "1m Section", type: "MCQ", count: 30, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        { title: "2m Section", type: "VERY_SHORT", count: 12, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        { title: "3m Section", type: "SHORT", count: 3, marksEach: 3, orChoiceMode: "REQUIRED" },
        { title: "4m Section", type: "LONG", count: 3, marksEach: 4, orChoiceMode: "REQUIRED" },
      ];
      const audit = validateCircular465Blueprint(compliantSections);
      expect(audit.isCompliant).toBe(true);
      expect(audit.violations.length).toBe(0);
      expect(audit.coveragePercent).toBe(100);
    });
  });

  // ===========================================================================
  // SUITE 3: ENHANCED DP FEASIBILITY ENGINE (LEVELS 1, 2, 3)
  // ===========================================================================
  describe("Suite 3: 3-Level Dynamic Programming Feasibility Engine", () => {
    it("Level 1: detects total marks mismatch when enforceMarksConservation is true", () => {
      const warnings = checkBlueprintFeasibility({
        sections: [{ count: 10, marksEach: 2 }], // 20m
        chapters: [{ chapterId: "c1", marks: 15 }], // 15m
        enforceMarksConservation: true,
      });
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toMatch(/Sections total 20 marks but chapter weightage totals 15/);
    });

    it("Level 2: detects chapter marks quota below minimum section denomination", () => {
      const warnings = checkBlueprintFeasibility({
        sections: [{ count: 5, marksEach: 3 }],
        chapters: [{ chapterId: "c1", title: "Chemistry", marks: 2 }, { chapterId: "c2", marks: 13 }],
      });
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toMatch(/smallest section question is 3 marks/);
    });

    it("Level 2: detects unreachable single-chapter coin-change denomination combinations", () => {
      const warnings = checkBlueprintFeasibility({
        sections: [{ count: 2, marksEach: 4 }, { count: 2, marksEach: 6 }],
        chapters: [{ chapterId: "c1", title: "Physics", marks: 5 }, { chapterId: "c2", marks: 15 }],
      });
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toMatch(/cannot be formed by any combination of section question denominations/);
    });

    it("Level 3: detects global bounded capacity partition conflicts when single-chapter DP passes", () => {
      // Setup: Sections provide 2x3m and 1x2m questions = 8 total marks.
      // Capacities: C(2m) = 1, C(3m) = 2.
      // Chapters: Ch1 = 4m, Ch2 = 4m = 8 total marks.
      // Single-chapter DP:
      // Ch1 (4m) is reachable via 2+2=4.
      // Ch2 (4m) is reachable via 2+2=4.
      // Level 2 passes for each chapter individually!
      // But together they require four 2m questions, while only one 2m question exists.
      // Level 3 bounded capacity engine must detect this conflict.
      const warnings = checkBlueprintFeasibility({
        sections: [
          { count: 2, marksEach: 3 },
          { count: 1, marksEach: 2 },
        ],
        chapters: [
          { chapterId: "ch1", title: "Mechanics", marks: 4 },
          { chapterId: "ch2", title: "Thermodynamics", marks: 4 },
        ],
      });

      expect(warnings.length).toBe(1);
      expect(warnings[0]).toMatch(/Denomination capacity conflict/);
    });

    it("Level 3: passes when valid global assignment partition exists", () => {
      // Sections: 2x2m, 1x4m = 8m.
      // Chapters: Ch1 = 4m (takes 2x2m), Ch2 = 4m (takes 1x4m). Total = 8m.
      const warnings = checkBlueprintFeasibility({
        sections: [
          { count: 2, marksEach: 2 },
          { count: 1, marksEach: 4 },
        ],
        chapters: [
          { chapterId: "ch1", marks: 4 },
          { chapterId: "ch2", marks: 4 },
        ],
      });
      expect(warnings).toEqual([]);
    });
  });

  // ===========================================================================
  // SUITE 4: HAMILTON-HARE PROPORTIONAL TERM ADAPTATION ALGORITHM
  // ===========================================================================
  describe("Suite 4: Hamilton-Hare Proportional Term Adaptation", () => {
    it("distributes marks with exact integer sum without rounding drift", () => {
      const activeChapters = [
        { chapterId: "c1", officialMarks: 6 },
        { chapterId: "c2", officialMarks: 5 },
        { chapterId: "c3", officialMarks: 7 },
        { chapterId: "c4", officialMarks: 4 },
      ];
      // Adapt to 50 marks (Quarterly)
      const adapted = adaptChaptersHamiltonHare(activeChapters, 50, 1);
      const sum = adapted.reduce((s, c) => s + c.marks, 0);
      expect(sum).toBe(50);
      expect(adapted.every((c) => Number.isInteger(c.marks) && c.marks >= 1)).toBe(true);
    });

    it("handles prime number of chapters into arbitrary target marks", () => {
      // 7 active chapters into 75 marks
      const activeChapters = Array.from({ length: 7 }, (_, i) => ({
        chapterId: `ch-${i + 1}`,
        officialMarks: 5 + (i % 3),
      }));
      const adapted = adaptChaptersHamiltonHare(activeChapters, 75, 1);
      const sum = adapted.reduce((s, c) => s + c.marks, 0);
      expect(sum).toBe(75);
    });

    it("respects single active chapter edge case", () => {
      const active = [{ chapterId: "c1", officialMarks: 6 }];
      const adapted = adaptChaptersHamiltonHare(active, 25, 1);
      expect(adapted).toEqual([{ chapterId: "c1", officialMarks: 6, marks: 25 }]);
    });
  });

  // ===========================================================================
  // SUITE 5: DATABASE RECONCILIATION & ADAPTATION END-TO-END
  // ===========================================================================
  describe("Suite 5: End-to-End Database Template Loading & Adaptation", () => {
    it("loads official Class 10 Math Standard template and produces valid BlueprintInput", async () => {
      const book = await prisma.book.findFirst({
        where: { className: "Class 10", subject: "Mathematics" },
      });
      if (!book) return; // Skip if db not populated in this test worker

      const input = await mapCurriculumTemplateToBlueprintInput(
        "mpbse-10th-mathematics-standard-100-75m",
        book.id
      );

      expect(input.curriculumMode).toBe("STANDARD_MPBSE");
      expect(input.durationMin).toBe(180);
      expect(input.subjectCode).toBe("100");

      const totalSectionMarks = input.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const totalChapterMarks = input.chapters.reduce((s, ch) => s + ch.marks, 0);

      expect(totalSectionMarks).toBe(75);
      expect(totalChapterMarks).toBe(75);

      const errors = validateBlueprint(input);
      expect(errors).toEqual([]);
    });

    it("adapts Class 10 Math to Quarterly examination with 4 chapters and 50 marks", async () => {
      const book = await prisma.book.findFirst({
        where: { className: "Class 10", subject: "Mathematics" },
        include: { chapters: true },
      });
      if (!book || book.chapters.length < 4) return;

      const activeIds = book.chapters.slice(0, 4).map((c) => c.id);
      const adapted = await adaptCustomSchoolBlueprint(
        "mpbse-10th-mathematics-standard-100-75m",
        book.id,
        "QUARTERLY",
        activeIds
      );

      expect(adapted.curriculumMode).toBe("CUSTOM_SCHOOL");
      expect(adapted.durationMin).toBe(120);

      const totalSectionMarks = adapted.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const totalChapterMarks = adapted.chapters.reduce((s, ch) => s + ch.marks, 0);

      expect(totalSectionMarks).toBe(50);
      expect(totalChapterMarks).toBe(50);

      // Verify inactive chapters have 0 marks
      const inactive = adapted.chapters.filter((c) => !activeIds.includes(c.chapterId));
      expect(inactive.every((c) => c.marks === 0)).toBe(true);

      // Verify active chapters have positive marks
      const active = adapted.chapters.filter((c) => activeIds.includes(c.chapterId));
      expect(active.every((c) => c.marks > 0)).toBe(true);

      const errors = validateBlueprint(adapted);
      expect(errors).toEqual([]);
    });

    it("adapts Class 12 Physics to Unit Test with 25 marks", async () => {
      const book = await prisma.book.findFirst({
        where: { className: "Class 12", subject: "Physics" },
        include: { chapters: true },
      });
      if (!book || book.chapters.length < 2) return;

      const activeIds = book.chapters.slice(0, 2).map((c) => c.id);
      const adapted = await adaptCustomSchoolBlueprint(
        "mpbse-12th-physics-210-70m",
        book.id,
        "UNIT_TEST",
        activeIds
      );

      expect(adapted.curriculumMode).toBe("CUSTOM_SCHOOL");
      expect(adapted.durationMin).toBe(60);

      const totalSectionMarks = adapted.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const totalChapterMarks = adapted.chapters.reduce((s, ch) => s + ch.marks, 0);

      expect(totalSectionMarks).toBe(25);
      expect(totalChapterMarks).toBe(25);

      const errors = validateBlueprint(adapted);
      expect(errors).toEqual([]);
    });
  });
});
