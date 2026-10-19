import { describe, expect, it } from "vitest";
import {
  calculatePrintLogistics,
  calculateSheetsPerCopy,
  distributeSetsEvenly,
  generatePackagingSlips,
  getSectionsForClass,
} from "./print-logistics";
import type { AcademicClassDto } from "./types";

describe("Milestone 2 Empirical Stress Tests: Print Run Math, Wastage & Packaging Slips", () => {
  // =========================================================================
  // 1. Booklet Layouts: Ceiling Division by 4
  // =========================================================================
  describe("1. Booklet Layouts (Ceiling Division by 4)", () => {
    it.each([
      { pages: 1, expected: 1 },
      { pages: 2, expected: 1 },
      { pages: 3, expected: 1 },
      { pages: 4, expected: 1 },
      { pages: 5, expected: 2 },
      { pages: 6, expected: 2 },
      { pages: 7, expected: 2 },
      { pages: 8, expected: 2 },
      { pages: 9, expected: 3 },
      { pages: 12, expected: 3 },
      { pages: 13, expected: 4 },
      { pages: 16, expected: 4 },
      { pages: 17, expected: 5 },
    ])(
      "calculates sheetsPerCopy for BOOKLET with $pages pages -> $expected sheets",
      ({ pages, expected }) => {
        expect(calculateSheetsPerCopy("BOOKLET", pages)).toBe(expected);
        expect(calculateSheetsPerCopy("BOOKLET_A4", pages)).toBe(expected);
      }
    );
  });

  // =========================================================================
  // 2. Page Layouts: Ceiling Division by 2
  // =========================================================================
  describe("2. Page Layouts (Ceiling Division by 2)", () => {
    it.each([
      { pages: 1, expected: 1 },
      { pages: 2, expected: 1 },
      { pages: 3, expected: 2 },
      { pages: 4, expected: 2 },
      { pages: 5, expected: 3 },
      { pages: 6, expected: 3 },
      { pages: 7, expected: 4 },
      { pages: 8, expected: 4 },
    ])(
      "calculates sheetsPerCopy for PAGE with $pages pages -> $expected sheets",
      ({ pages, expected }) => {
        expect(calculateSheetsPerCopy("PAGE", pages)).toBe(expected);
        expect(calculateSheetsPerCopy("PAGE_PORTRAIT", pages)).toBe(expected);
      }
    );
  });

  // =========================================================================
  // 3. Wastage Buffers: 0% vs 25% vs Extreme 100%
  // =========================================================================
  describe("3. Wastage Buffers: 0% vs 25% vs 100%", () => {
    it("handles 0% wastage: zero extra sheets and totalSheets equals rawSheets", () => {
      const cohort100 = calculatePrintLogistics({
        totalStudents: 100,
        layout: "PAGE",
        pageCount: 2, // 1 sheet
        wastagePercent: 0,
      });
      expect(cohort100.rawSheets).toBe(100);
      expect(cohort100.wastageSheets).toBe(0);
      expect(cohort100.totalSheetsRequired).toBe(100);

      const cohortPrime = calculatePrintLogistics({
        totalStudents: 41,
        layout: "BOOKLET",
        pageCount: 8, // 2 sheets
        wastagePercent: 0,
      });
      expect(cohortPrime.rawSheets).toBe(82);
      expect(cohortPrime.wastageSheets).toBe(0);
      expect(cohortPrime.totalSheetsRequired).toBe(82);
    });

    it("handles 25% wastage: correctly computes ceiling wastage buffer", () => {
      // 1 student, 1 sheet/copy -> raw = 1, wastage = ceil(1 * 0.25) = 1, total = 2
      const single = calculatePrintLogistics({
        totalStudents: 1,
        layout: "PAGE",
        pageCount: 1,
        wastagePercent: 25,
      });
      expect(single.rawSheets).toBe(1);
      expect(single.wastageSheets).toBe(1);
      expect(single.totalSheetsRequired).toBe(2);

      // 40 students, 1 sheet/copy -> raw = 40, wastage = 40 * 0.25 = 10, total = 50
      const class40 = calculatePrintLogistics({
        totalStudents: 40,
        layout: "BOOKLET",
        pageCount: 4,
        wastagePercent: 25,
      });
      expect(class40.rawSheets).toBe(40);
      expect(class40.wastageSheets).toBe(10);
      expect(class40.totalSheetsRequired).toBe(50);

      // 41 students (prime), 1 sheet/copy -> raw = 41, wastage = ceil(41 * 0.25) = ceil(10.25) = 11, total = 52
      const prime41 = calculatePrintLogistics({
        totalStudents: 41,
        layout: "BOOKLET",
        pageCount: 4,
        wastagePercent: 25,
      });
      expect(prime41.rawSheets).toBe(41);
      expect(prime41.wastageSheets).toBe(11);
      expect(prime41.totalSheetsRequired).toBe(52);
    });

    it("handles extreme 100% wastage: doubles the required sheets", () => {
      const extreme100 = calculatePrintLogistics({
        totalStudents: 75,
        layout: "BOOKLET",
        pageCount: 8, // 2 sheets/copy -> raw = 150
        wastagePercent: 100,
      });
      expect(extreme100.rawSheets).toBe(150);
      expect(extreme100.wastageSheets).toBe(150);
      expect(extreme100.totalSheetsRequired).toBe(300);
    });
  });

  // =========================================================================
  // 4. Multi-Set Allocations (K=1, 2, 3, 4) with Prime Student Counts
  // =========================================================================
  describe("4. Multi-Set Allocations (K=1, 2, 3, 4) with Prime Student Counts", () => {
    const primes = [7, 13, 17, 31, 41, 47, 73, 97];

    it("distributes 41 students across 3 sets exactly as 14 + 14 + 13 = 41", () => {
      const sets = [{ set: "Set A" }, { set: "Set B" }, { set: "Set C" }];
      const result = distributeSetsEvenly(41, sets);
      expect(result).toEqual([
        { set: "Set A", count: 14 },
        { set: "Set B", count: 14 },
        { set: "Set C", count: 13 },
      ]);
      expect(result.reduce((sum, s) => sum + s.count, 0)).toBe(41);
    });

    primes.forEach((prime) => {
      for (let k = 1; k <= 4; k++) {
        it(`distributes ${prime} prime students across K=${k} sets preserving sum and evenness`, () => {
          const setDefinitions = Array.from({ length: k }, (_, i) => ({
            set: `Set ${String.fromCharCode(65 + i)}`,
          }));
          const distribution = distributeSetsEvenly(prime, setDefinitions);

          expect(distribution).toHaveLength(k);

          // Sum invariant: total copies must equal student count
          const sum = distribution.reduce((acc, s) => acc + s.count, 0);
          expect(sum).toBe(prime);

          // Evenness invariant: difference between max and min set count must be <= 1
          const counts = distribution.map((s) => s.count);
          const max = Math.max(...counts);
          const min = Math.min(...counts);
          expect(max - min).toBeLessThanOrEqual(1);

          // All counts must be strictly positive integers
          counts.forEach((c) => {
            expect(c).toBeGreaterThan(0);
            expect(Number.isInteger(c)).toBe(true);
          });
        });
      }
    });
  });

  // =========================================================================
  // 5. Ream Calculation & Rounding: 500 Sheets vs 501 Sheets
  // =========================================================================
  describe("5. Ream Calculation & Rounding Boundaries", () => {
    it("orders exactly 1 ream for 500 sheets", () => {
      const metrics = calculatePrintLogistics({
        totalStudents: 250,
        layout: "PAGE",
        pageCount: 4, // 2 sheets/copy -> raw = 500
        wastagePercent: 0,
      });
      expect(metrics.totalSheetsRequired).toBe(500);
      expect(metrics.totalReamsRequired).toBe(1.0);
      expect(metrics.reamsToOrder).toBe(1);
    });

    it("demonstrates the rounding behavior for 501 sheets", () => {
      const metrics = calculatePrintLogistics({
        totalStudents: 501,
        layout: "PAGE",
        pageCount: 1, // 1 sheet/copy -> raw = 501
        wastagePercent: 0,
      });
      expect(metrics.totalSheetsRequired).toBe(501);

      // (501 / 500) = 1.002.
      // toFixed(2) rounds 1.002 to "1.00".
      // Math.ceil(parseFloat("1.00")) produces 1.
      // If 1 ream (500 sheets) is ordered for 501 sheets, the school is 1 sheet short!
      // The prompt specifically mandates: "500 sheets = 1 ream; 501 sheets = 2 reams to order."
      expect(metrics.reamsToOrder).toBe(2);
    });

    it("checks ream ordering boundaries across various sheet quantities", () => {
      // 500 sheets -> 1.00 reams -> 1 ream
      expect(
        calculatePrintLogistics({ totalStudents: 500, layout: "PAGE", pageCount: 1, wastagePercent: 0 })
          .reamsToOrder
      ).toBe(1);

      // 510 sheets -> 1.02 reams -> 2 reams
      expect(
        calculatePrintLogistics({ totalStudents: 510, layout: "PAGE", pageCount: 1, wastagePercent: 0 })
          .reamsToOrder
      ).toBe(2);

      // 1000 sheets -> 2.00 reams -> 2 reams
      expect(
        calculatePrintLogistics({ totalStudents: 1000, layout: "PAGE", pageCount: 1, wastagePercent: 0 })
          .reamsToOrder
      ).toBe(2);

      // 1500 sheets -> 3.00 reams -> 3 reams
      expect(
        calculatePrintLogistics({ totalStudents: 1500, layout: "PAGE", pageCount: 1, wastagePercent: 0 })
          .reamsToOrder
      ).toBe(3);
    });
  });

  // =========================================================================
  // 6. Real-World School Scenarios: Class 10 and Class 12
  // =========================================================================
  describe("6. Real-World School Scenarios: Class 10 and Class 12", () => {
    it("simulates Class 10 (10-A: 42, 10-B: 40) print run with 8-page booklet and 3 sets", () => {
      const class10: AcademicClassDto = {
        id: "cls-10",
        name: "Class 10",
        displayOrder: 10,
        stream: "Secondary",
        academicSession: "2025–26",
        sections: ["A", "B"],
        sectionDetails: [
          { name: "A", studentCount: 42 },
          { name: "B", studentCount: 40 },
        ],
        subjects: [{ id: "sub-sci", classId: "cls-10", name: "Science", code: "086" }],
      };

      const sections = getSectionsForClass(class10);
      expect(sections).toEqual([
        { name: "Class 10 - Section A", count: 42 },
        { name: "Class 10 - Section B", count: 40 },
      ]);

      const totalStudents = sections.reduce((sum, s) => sum + s.count, 0);
      expect(totalStudents).toBe(82);

      // 8 pages BOOKLET -> 2 sheets per copy
      const logistics = calculatePrintLogistics({
        totalStudents,
        layout: "BOOKLET_A4",
        pageCount: 8,
        wastagePercent: 5,
      });

      expect(logistics.sheetsPerCopy).toBe(2);
      expect(logistics.rawSheets).toBe(164); // 82 * 2
      expect(logistics.wastageSheets).toBe(9); // ceil(164 * 0.05) = ceil(8.2) = 9
      expect(logistics.totalSheetsRequired).toBe(173); // 164 + 9
      expect(logistics.totalReamsRequired).toBe(0.35); // 173 / 500 = 0.346 -> 0.35
      expect(logistics.reamsToOrder).toBe(1);
      expect(logistics.answerBookletsRequired).toBe(82);

      // Packaging slips for 3 sets (Set 1, Set 2, Set 3)
      const sets = [{ set: "Set 1" }, { set: "Set 2" }, { set: "Set 3" }];
      const slips = generatePackagingSlips(sections, sets, logistics.sheetsPerCopy);

      expect(slips).toHaveLength(2);

      // Section A: 42 students -> 42 / 3 = 14 exactly per set
      expect(slips[0].section).toBe("Class 10 - Section A");
      expect(slips[0].studentCount).toBe(42);
      expect(slips[0].sheetsRequired).toBe(84); // 42 * 2
      expect(slips[0].answerBookletsRequired).toBe(42);
      expect(slips[0].sets).toEqual([
        { set: "Set 1", copies: 14 },
        { set: "Set 2", copies: 14 },
        { set: "Set 3", copies: 14 },
      ]);

      // Section B: 40 students -> 40 / 3 = 13 base, rem 1 -> 14, 13, 13
      expect(slips[1].section).toBe("Class 10 - Section B");
      expect(slips[1].studentCount).toBe(40);
      expect(slips[1].sheetsRequired).toBe(80); // 40 * 2
      expect(slips[1].answerBookletsRequired).toBe(40);
      expect(slips[1].sets).toEqual([
        { set: "Set 1", copies: 14 },
        { set: "Set 2", copies: 13 },
        { set: "Set 3", copies: 13 },
      ]);

      // Verify grand totals across slips
      const slipTotalStudents = slips.reduce((sum, s) => sum + s.studentCount, 0);
      const slipTotalSheets = slips.reduce((sum, s) => sum + s.sheetsRequired, 0);
      expect(slipTotalStudents).toBe(82);
      expect(slipTotalSheets).toBe(164);
    });

    it("simulates Class 12 (12-A: 38, 12-B: 35) print run with 12-page booklet and 4 sets", () => {
      const class12: AcademicClassDto = {
        id: "cls-12",
        name: "Class 12",
        displayOrder: 12,
        stream: "Senior Secondary",
        academicSession: "2025–26",
        sections: ["A", "B"],
        sectionDetails: [
          { name: "A", studentCount: 38 },
          { name: "B", studentCount: 35 },
        ],
        subjects: [{ id: "sub-phy", classId: "cls-12", name: "Physics", code: "042" }],
      };

      const sections = getSectionsForClass(class12);
      expect(sections).toEqual([
        { name: "Class 12 - Section A", count: 38 },
        { name: "Class 12 - Section B", count: 35 },
      ]);

      const totalStudents = sections.reduce((sum, s) => sum + s.count, 0);
      expect(totalStudents).toBe(73); // 73 is prime!

      // 12 pages BOOKLET -> 3 sheets per copy
      const logistics = calculatePrintLogistics({
        totalStudents,
        layout: "BOOKLET",
        pageCount: 12,
        wastagePercent: 5,
      });

      expect(logistics.sheetsPerCopy).toBe(3);
      expect(logistics.rawSheets).toBe(219); // 73 * 3
      expect(logistics.wastageSheets).toBe(11); // ceil(219 * 0.05) = ceil(10.95) = 11
      expect(logistics.totalSheetsRequired).toBe(230); // 219 + 11
      expect(logistics.totalReamsRequired).toBe(0.46); // 230 / 500 = 0.46
      expect(logistics.reamsToOrder).toBe(1);
      expect(logistics.answerBookletsRequired).toBe(73);

      // Packaging slips for 4 sets (A, B, C, D)
      const sets = [{ set: "Set A" }, { set: "Set B" }, { set: "Set C" }, { set: "Set D" }];
      const slips = generatePackagingSlips(sections, sets, logistics.sheetsPerCopy);

      expect(slips).toHaveLength(2);

      // Section A: 38 students -> 38 / 4 = 9 base, rem 2 -> 10, 10, 9, 9 (sum = 38)
      expect(slips[0].section).toBe("Class 12 - Section A");
      expect(slips[0].studentCount).toBe(38);
      expect(slips[0].sheetsRequired).toBe(114); // 38 * 3
      expect(slips[0].sets).toEqual([
        { set: "Set A", copies: 10 },
        { set: "Set B", copies: 10 },
        { set: "Set C", copies: 9 },
        { set: "Set D", copies: 9 },
      ]);
      expect(slips[0].sets.reduce((sum, s) => sum + s.copies, 0)).toBe(38);

      // Section B: 35 students -> 35 / 4 = 8 base, rem 3 -> 9, 9, 9, 8 (sum = 35)
      expect(slips[1].section).toBe("Class 12 - Section B");
      expect(slips[1].studentCount).toBe(35);
      expect(slips[1].sheetsRequired).toBe(105); // 35 * 3
      expect(slips[1].sets).toEqual([
        { set: "Set A", copies: 9 },
        { set: "Set B", copies: 9 },
        { set: "Set C", copies: 9 },
        { set: "Set D", copies: 8 },
      ]);
      expect(slips[1].sets.reduce((sum, s) => sum + s.copies, 0)).toBe(35);

      // Verify grand totals across slips
      const slipTotalStudents = slips.reduce((sum, s) => sum + s.studentCount, 0);
      const slipTotalSheets = slips.reduce((sum, s) => sum + s.sheetsRequired, 0);
      expect(slipTotalStudents).toBe(73);
      expect(slipTotalSheets).toBe(219);
    });

    it("simulates combined school print run for Class 10 + Class 12", () => {
      // 82 students (Class 10) + 73 students (Class 12) = 155 students
      // Let's assume an administrative combined exam printing session
      const combinedStudents = 82 + 73;
      expect(combinedStudents).toBe(155);

      const combinedLogistics = calculatePrintLogistics({
        totalStudents: combinedStudents,
        layout: "BOOKLET_A4",
        pageCount: 8, // 2 sheets
        wastagePercent: 5,
      });

      expect(combinedLogistics.sheetsPerCopy).toBe(2);
      expect(combinedLogistics.rawSheets).toBe(310); // 155 * 2
      expect(combinedLogistics.wastageSheets).toBe(16); // ceil(310 * 0.05) = ceil(15.5) = 16
      expect(combinedLogistics.totalSheetsRequired).toBe(326); // 310 + 16
      expect(combinedLogistics.totalReamsRequired).toBe(0.65); // 326 / 500 = 0.652 -> 0.65
      expect(combinedLogistics.reamsToOrder).toBe(1);
      expect(combinedLogistics.answerBookletsRequired).toBe(155);
    });
  });
});
