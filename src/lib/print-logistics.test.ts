import { describe, expect, it } from "vitest";
import {
  calculatePrintLogistics,
  calculateSheetsPerCopy,
  distributeSetsEvenly,
  generatePackagingSlips,
  getSectionsForClass,
} from "./print-logistics";
import type { AcademicClassDto } from "./types";

describe("Print Logistics & Automated Calculator Integration (Requirement R2)", () => {
  describe("1. Sheet Calculations for Booklet vs Page Layout", () => {
    it("calculates Booklet layout sheets accurately (1 folded sheet = 4 page sides)", () => {
      // 1-4 pages fits on 1 folded sheet
      expect(calculateSheetsPerCopy("BOOKLET", 1)).toBe(1);
      expect(calculateSheetsPerCopy("BOOKLET", 2)).toBe(1);
      expect(calculateSheetsPerCopy("BOOKLET", 3)).toBe(1);
      expect(calculateSheetsPerCopy("BOOKLET", 4)).toBe(1);

      // 5-8 pages requires 2 folded sheets
      expect(calculateSheetsPerCopy("BOOKLET", 5)).toBe(2);
      expect(calculateSheetsPerCopy("BOOKLET", 8)).toBe(2);

      // 9-12 pages requires 3 folded sheets
      expect(calculateSheetsPerCopy("BOOKLET", 9)).toBe(3);
      expect(calculateSheetsPerCopy("BOOKLET", 12)).toBe(3);

      // BOOKLET_A4 behaves identically to BOOKLET
      expect(calculateSheetsPerCopy("BOOKLET_A4", 4)).toBe(1);
      expect(calculateSheetsPerCopy("BOOKLET_A4", 7)).toBe(2);
    });

    it("calculates Page layout sheets accurately (1 duplex sheet = 2 page sides)", () => {
      // 1-2 pages fits on 1 duplex sheet
      expect(calculateSheetsPerCopy("PAGE", 1)).toBe(1);
      expect(calculateSheetsPerCopy("PAGE", 2)).toBe(1);

      // 3-4 pages requires 2 duplex sheets
      expect(calculateSheetsPerCopy("PAGE", 3)).toBe(2);
      expect(calculateSheetsPerCopy("PAGE", 4)).toBe(2);

      // 5-6 pages requires 3 duplex sheets
      expect(calculateSheetsPerCopy("PAGE", 5)).toBe(3);
      expect(calculateSheetsPerCopy("PAGE", 6)).toBe(3);
    });

    it("guards against zero or negative page counts", () => {
      expect(calculateSheetsPerCopy("BOOKLET", 0)).toBe(1);
      expect(calculateSheetsPerCopy("PAGE", -2)).toBe(1);
    });
  });

  describe("2. Wastage Buffer Formula and Rounding", () => {
    it("computes exact raw sheets, ceiling wastage buffer, and total sheets required", () => {
      // 82 students, 2 sheets per copy (e.g. 8-page booklet)
      // raw = 82 * 2 = 164 sheets
      // 5% wastage = 164 * 0.05 = 8.2 -> Math.ceil(8.2) = 9 sheets
      // total = 164 + 9 = 173 sheets
      const metrics = calculatePrintLogistics({
        totalStudents: 82,
        layout: "BOOKLET",
        pageCount: 8,
        wastagePercent: 5,
      });

      expect(metrics.sheetsPerCopy).toBe(2);
      expect(metrics.rawSheets).toBe(164);
      expect(metrics.wastageSheets).toBe(9);
      expect(metrics.totalSheetsRequired).toBe(173);
      expect(metrics.answerBookletsRequired).toBe(82);
    });

    it("handles 0% wastage buffer with zero extra sheets", () => {
      const metrics = calculatePrintLogistics({
        totalStudents: 100,
        layout: "PAGE",
        pageCount: 2,
        wastagePercent: 0,
      });

      expect(metrics.sheetsPerCopy).toBe(1);
      expect(metrics.rawSheets).toBe(100);
      expect(metrics.wastageSheets).toBe(0);
      expect(metrics.totalSheetsRequired).toBe(100);
    });

    it("rounds up fractional wastage sheets to the next integer", () => {
      // 41 students, 1 sheet per copy = 41 sheets
      // 2.5% wastage = 41 * 0.025 = 1.025 -> ceil = 2 sheets
      const metrics = calculatePrintLogistics({
        totalStudents: 41,
        layout: "BOOKLET",
        pageCount: 4,
        wastagePercent: 2.5,
      });

      expect(metrics.rawSheets).toBe(41);
      expect(metrics.wastageSheets).toBe(2);
      expect(metrics.totalSheetsRequired).toBe(43);
    });
  });

  describe("3. Reams Required and Reams to Order", () => {
    it("calculates total reams as float (500 sheets/ream) and ceiling reams to order", () => {
      // 173 sheets -> 173 / 500 = 0.346 -> 0.35 reams -> 1 ream to order
      const small = calculatePrintLogistics({
        totalStudents: 82,
        layout: "BOOKLET",
        pageCount: 8,
        wastagePercent: 5,
      });
      expect(small.totalSheetsRequired).toBe(173);
      expect(small.totalReamsRequired).toBe(0.35);
      expect(small.reamsToOrder).toBe(1);

      // Exactly 500 sheets -> 1.00 ream required -> 1 ream to order
      const exactOneReam = calculatePrintLogistics({
        totalStudents: 250,
        layout: "PAGE",
        pageCount: 4, // 2 sheets
        wastagePercent: 0, // 500 raw + 0 wastage
      });
      expect(exactOneReam.totalSheetsRequired).toBe(500);
      expect(exactOneReam.totalReamsRequired).toBe(1);
      expect(exactOneReam.reamsToOrder).toBe(1);

      // Boundary: 501 sheets -> float is 1.002 (rounds to 1.00 display) -> must order 2 reams to avoid paper shortage
      const boundaryEdge = calculatePrintLogistics({
        totalStudents: 501,
        layout: "PAGE",
        pageCount: 1,
        wastagePercent: 0,
      });
      expect(boundaryEdge.totalSheetsRequired).toBe(501);
      expect(boundaryEdge.reamsToOrder).toBe(2);

      // 510 sheets -> 1.02 reams -> 2 reams to order
      const justOverOneReam = calculatePrintLogistics({
        totalStudents: 510,
        layout: "PAGE",
        pageCount: 1, // 1 sheet
        wastagePercent: 0,
      });
      expect(justOverOneReam.totalSheetsRequired).toBe(510);
      expect(justOverOneReam.totalReamsRequired).toBe(1.02);
      expect(justOverOneReam.reamsToOrder).toBe(2);

      // Large school examination: 600 students, 4 sheets per copy = 2400 raw
      // 5% wastage = 120 -> total = 2520 sheets
      // 2520 / 500 = 5.04 reams -> 6 reams to order
      const largeRun = calculatePrintLogistics({
        totalStudents: 600,
        layout: "PAGE",
        pageCount: 8,
        wastagePercent: 5,
      });
      expect(largeRun.totalSheetsRequired).toBe(2520);
      expect(largeRun.totalReamsRequired).toBe(5.04);
      expect(largeRun.reamsToOrder).toBe(6);
    });
  });

  describe("4. Auto-Population from AcademicClassDto with Section Enrollments", () => {
    it("auto-populates section counts from AcademicClassDto sectionDetails", () => {
      const cls: AcademicClassDto = {
        id: "cls-10",
        name: "Class 10",
        displayOrder: 10,
        stream: "Secondary",
        academicSession: "2025–26",
        sections: ["A", "B", "C"],
        sectionDetails: [
          { name: "A", studentCount: 42 },
          { name: "B", studentCount: 40 },
          { name: "C", studentCount: 35 },
        ],
        subjects: [],
      };

      const sections = getSectionsForClass(cls);

      expect(sections).toHaveLength(3);
      expect(sections[0]).toEqual({ name: "Class 10 - Section A", count: 42 });
      expect(sections[1]).toEqual({ name: "Class 10 - Section B", count: 40 });
      expect(sections[2]).toEqual({ name: "Class 10 - Section C", count: 35 });

      // Total students directly sums to configured capacity
      const totalStudents = sections.reduce((sum, s) => sum + s.count, 0);
      expect(totalStudents).toBe(117);

      // Automated print logistics immediately reflect the 117 students
      const logistics = calculatePrintLogistics({
        totalStudents,
        layout: "BOOKLET_A4",
        pageCount: 8, // 2 sheets
        wastagePercent: 5,
      });
      expect(logistics.rawSheets).toBe(234); // 117 * 2
      expect(logistics.wastageSheets).toBe(12); // ceil(234 * 0.05 = 11.7) = 12
      expect(logistics.totalSheetsRequired).toBe(246);
      expect(logistics.reamsToOrder).toBe(1); // 246 / 500 = 0.49 -> 1 ream
      expect(logistics.answerBookletsRequired).toBe(117);
    });

    it("falls back to default count 40 for legacy AcademicClass records without sectionDetails", () => {
      const legacyClass: AcademicClassDto = {
        id: "cls-9",
        name: "Class 9",
        displayOrder: 9,
        stream: "Secondary",
        academicSession: "2025–26",
        sections: ["A", "B"],
        sectionDetails: [],
        subjects: [],
      };

      const sections = getSectionsForClass(legacyClass);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toEqual({ name: "Class 9 - Section A", count: 40 });
      expect(sections[1]).toEqual({ name: "Class 9 - Section B", count: 40 });
    });

    it("handles null or undefined class gracefully", () => {
      expect(getSectionsForClass(null)).toEqual([{ name: "Section A", count: 40 }]);
      expect(getSectionsForClass(undefined)).toEqual([{ name: "Section A", count: 40 }]);
    });
  });

  describe("5. Multi-Set Packaging Slips Distribution", () => {
    it("distributes students evenly across multi-sets with sum equal to total student count", () => {
      // 43 students across 3 sets (Set A, Set B, Set C)
      // 43 / 3 = 14 base, remainder 1
      // Set A gets 15, Set B gets 14, Set C gets 14
      const sets = [{ set: "Set A" }, { set: "Set B" }, { set: "Set C" }];
      const distributed = distributeSetsEvenly(43, sets);

      expect(distributed).toEqual([
        { set: "Set A", count: 15 },
        { set: "Set B", count: 14 },
        { set: "Set C", count: 14 },
      ]);
      const sum = distributed.reduce((acc, s) => acc + s.count, 0);
      expect(sum).toBe(43);
    });

    it("generates packaging slips for each section summing to section student strength", () => {
      const sections = [
        { name: "Class 10 - Section A", count: 42 },
        { name: "Class 10 - Section B", count: 41 },
        { name: "Class 10 - Section C", count: 35 },
      ];
      const sets = [{ set: "Set 1" }, { set: "Set 2" }];
      const sheetsPerCopy = 2;

      const slips = generatePackagingSlips(sections, sets, sheetsPerCopy);

      expect(slips).toHaveLength(3);

      // Section A: 42 students -> 21 Set 1, 21 Set 2
      expect(slips[0].section).toBe("Class 10 - Section A");
      expect(slips[0].studentCount).toBe(42);
      expect(slips[0].sheetsRequired).toBe(84);
      expect(slips[0].answerBookletsRequired).toBe(42);
      expect(slips[0].sets).toEqual([
        { set: "Set 1", copies: 21 },
        { set: "Set 2", copies: 21 },
      ]);
      expect(slips[0].sets.reduce((sum, s) => sum + s.copies, 0)).toBe(42);

      // Section B: 41 students -> 21 Set 1, 20 Set 2
      expect(slips[1].section).toBe("Class 10 - Section B");
      expect(slips[1].studentCount).toBe(41);
      expect(slips[1].sheetsRequired).toBe(82);
      expect(slips[1].sets).toEqual([
        { set: "Set 1", copies: 21 },
        { set: "Set 2", copies: 20 },
      ]);
      expect(slips[1].sets.reduce((sum, s) => sum + s.copies, 0)).toBe(41);

      // Section C: 35 students -> 18 Set 1, 17 Set 2
      expect(slips[2].section).toBe("Class 10 - Section C");
      expect(slips[2].studentCount).toBe(35);
      expect(slips[2].sheetsRequired).toBe(70);
      expect(slips[2].sets).toEqual([
        { set: "Set 1", copies: 18 },
        { set: "Set 2", copies: 17 },
      ]);
      expect(slips[2].sets.reduce((sum, s) => sum + s.copies, 0)).toBe(35);

      // Overall total verified across all slips
      const grandTotalStudents = slips.reduce((sum, s) => sum + s.studentCount, 0);
      expect(grandTotalStudents).toBe(118);
    });
  });
});
