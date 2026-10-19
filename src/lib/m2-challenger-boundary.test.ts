import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";
import {
  academicClassSchema,
  patchClassSchema,
  sectionDetailSchema,
  sectionItemSchema,
} from "./schemas";
import {
  normalizeSectionDetails,
  toAcademicClassDto,
} from "./classes";
import {
  calculatePrintLogistics,
  getSectionsForClass,
} from "./print-logistics";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as postClass } from "../app/api/classes/route";
import { PATCH as patchClass } from "../app/api/classes/[id]/route";

describe("Milestone 2 Challenger Empirical Test Suite: Section Enrollment & Boundary Stress", () => {
  let adminUserId: string;
  let teacherUserId: string;
  const createdClassIds: string[] = [];
  const testStamp = Date.now();
  const testSession = `2028–29`;

  beforeAll(async () => {
    // 1. Setup Admin user
    let admin = await prisma.user.findFirst({ where: { role: "ADMIN", active: true } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: `M2 Challenger Admin ${testStamp}`,
          email: `m2_challenger_admin_${testStamp}@school.edu`,
          passwordHash: "test_hash",
          role: "ADMIN",
          active: true,
        },
      });
    }
    adminUserId = admin.id;

    // 2. Setup Teacher user
    const teacher = await prisma.user.create({
      data: {
        name: `M2 Challenger Teacher ${testStamp}`,
        email: `m2_challenger_teacher_${testStamp}@school.edu`,
        passwordHash: "test_hash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });
    teacherUserId = teacher.id;

    // Default session context to admin
    mockSessionUserId = adminUserId;
  });

  afterAll(async () => {
    // Clean up created classes
    if (createdClassIds.length > 0) {
      await prisma.classSubject.deleteMany({ where: { classId: { in: createdClassIds } } });
      await prisma.academicClass.deleteMany({ where: { id: { in: createdClassIds } } });
    }
    // Clean up test teacher
    if (teacherUserId) {
      await prisma.user.deleteMany({ where: { id: teacherUserId } });
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // SUITE 1: Zod Schema Boundaries (studentCount: 1, 500, 0, neg, 501, float, null, undef)
  // =========================================================================
  describe("Suite 1: Zod Schema Boundaries for sectionDetailSchema and sectionItemSchema", () => {
    it("accepts lower boundary studentCount = 1", () => {
      const parsed = sectionDetailSchema.parse({ name: "A", studentCount: 1 });
      expect(parsed).toEqual({ name: "A", studentCount: 1 });
    });

    it("accepts upper boundary studentCount = 500", () => {
      const parsed = sectionDetailSchema.parse({ name: "A", studentCount: 500 });
      expect(parsed).toEqual({ name: "A", studentCount: 500 });
    });

    it("rejects zero studentCount = 0", () => {
      expect(() => sectionDetailSchema.parse({ name: "A", studentCount: 0 })).toThrow();
    });

    it("rejects negative studentCount values (-1, -100)", () => {
      expect(() => sectionDetailSchema.parse({ name: "A", studentCount: -1 })).toThrow();
      expect(() => sectionDetailSchema.parse({ name: "A", studentCount: -100 })).toThrow();
    });

    it("rejects studentCount exceeding upper limit (501, 10000)", () => {
      expect(() => sectionDetailSchema.parse({ name: "A", studentCount: 501 })).toThrow();
      expect(() => sectionDetailSchema.parse({ name: "A", studentCount: 10000 })).toThrow();
    });

    it("rejects non-integer floating point studentCount values (42.5, 1.1)", () => {
      expect(() => sectionDetailSchema.parse({ name: "A", studentCount: 42.5 })).toThrow();
      expect(() => sectionDetailSchema.parse({ name: "A", studentCount: 1.1 })).toThrow();
    });

    it("rejects null studentCount", () => {
      expect(() => sectionDetailSchema.parse({ name: "A", studentCount: null })).toThrow();
    });

    it("transparently defaults undefined / omitted studentCount to 40", () => {
      const parsed = sectionDetailSchema.parse({ name: "A" });
      expect(parsed).toEqual({ name: "A", studentCount: 40 });

      const parsedExplicitUndefined = sectionDetailSchema.parse({ name: "B", studentCount: undefined });
      expect(parsedExplicitUndefined).toEqual({ name: "B", studentCount: 40 });
    });

    it("accepts string-only sectionItemSchema and trims whitespace", () => {
      const parsed = sectionItemSchema.parse("  Rose  ");
      expect(parsed).toBe("Rose");
    });

    it("rejects empty or whitespace-only section names", () => {
      expect(() => sectionDetailSchema.parse({ name: "", studentCount: 40 })).toThrow();
      expect(() => sectionDetailSchema.parse({ name: "   ", studentCount: 40 })).toThrow();
      expect(() => sectionItemSchema.parse("")).toThrow();
      expect(() => sectionItemSchema.parse("   ")).toThrow();
    });

    it("rejects section names exceeding 20 characters", () => {
      const longName = "A".repeat(21);
      expect(() => sectionDetailSchema.parse({ name: longName, studentCount: 40 })).toThrow();
      expect(() => sectionItemSchema.parse(longName)).toThrow();

      const exact20 = "A".repeat(20);
      expect(sectionDetailSchema.parse({ name: exact20, studentCount: 40 }).name).toBe(exact20);
    });

    it("validates mixed section input formats in academicClassSchema and patchClassSchema", () => {
      const payload = {
        name: "Class 10-Mixed",
        academicSession: "2028–29",
        sections: [
          "A",
          { name: "B", studentCount: 42 },
          "C",
          { name: "D", studentCount: 1 },
          { name: "E", studentCount: 500 },
        ],
      };

      const parsed = academicClassSchema.parse(payload);
      expect(parsed.sections).toEqual([
        "A",
        { name: "B", studentCount: 42 },
        "C",
        { name: "D", studentCount: 1 },
        { name: "E", studentCount: 500 },
      ]);

      const patchParsed = patchClassSchema.parse({ sections: payload.sections });
      expect(patchParsed.sections).toEqual(parsed.sections);
    });

    it("rejects academicClassSchema when any mixed item fails studentCount boundaries", () => {
      expect(() =>
        academicClassSchema.parse({
          name: "Class 10-Fail",
          sections: ["A", { name: "B", studentCount: 501 }],
        })
      ).toThrow();

      expect(() =>
        academicClassSchema.parse({
          name: "Class 10-Fail",
          sections: ["A", { name: "B", studentCount: 0 }],
        })
      ).toThrow();

      expect(() =>
        academicClassSchema.parse({
          name: "Class 10-Fail",
          sections: ["A", { name: "B", studentCount: 42.8 }],
        })
      ).toThrow();
    });
  });

  // =========================================================================
  // SUITE 2: Normalization Engine Stress (normalizeSectionDetails)
  // =========================================================================
  describe("Suite 2: normalizeSectionDetails stress testing and defense in depth", () => {
    it("preserves exact valid boundaries: 1 and 500", () => {
      const res = normalizeSectionDetails([
        { name: "Min", studentCount: 1 },
        { name: "Max", studentCount: 500 },
      ]);
      expect(res).toEqual([
        { name: "Min", studentCount: 1 },
        { name: "Max", studentCount: 500 },
      ]);
    });

    it("falls back to 40 for zero and negative studentCount", () => {
      const res = normalizeSectionDetails([
        { name: "Zero", studentCount: 0 },
        { name: "Neg", studentCount: -25 },
      ]);
      expect(res).toEqual([
        { name: "Zero", studentCount: 40 },
        { name: "Neg", studentCount: 40 },
      ]);
    });

    it("clamps studentCount > 500 to exactly 500", () => {
      const res = normalizeSectionDetails([
        { name: "Over1", studentCount: 501 },
        { name: "Over2", studentCount: 999999 },
      ]);
      expect(res).toEqual([
        { name: "Over1", studentCount: 500 },
        { name: "Over2", studentCount: 500 },
      ]);
    });

    it("floors non-integer floats to integer", () => {
      const res = normalizeSectionDetails([
        { name: "Float1", studentCount: 42.9 },
        { name: "Float2", studentCount: 1.05 },
      ]);
      expect(res).toEqual([
        { name: "Float1", studentCount: 42 },
        { name: "Float2", studentCount: 1 },
      ]);
    });

    it("falls back to 40 for null, undefined, NaN, and non-numeric counts", () => {
      const res = normalizeSectionDetails([
        { name: "NullCount", studentCount: null },
        { name: "UndefCount", studentCount: undefined },
        { name: "NanCount", studentCount: NaN },
        { name: "InfCount", studentCount: Infinity },
        { name: "StrCount", studentCount: "50" as unknown },
      ]);
      expect(res).toEqual([
        { name: "NullCount", studentCount: 40 },
        { name: "UndefCount", studentCount: 40 },
        { name: "NanCount", studentCount: 40 },
        { name: "InfCount", studentCount: 40 },
        { name: "StrCount", studentCount: 40 },
      ]);
    });

    it("normalizes mixed string and object formats seamlessly", () => {
      const mixed = ["A", { name: "B", studentCount: 42 }, "C"];
      const res = normalizeSectionDetails(mixed);
      expect(res).toEqual([
        { name: "A", studentCount: 40 },
        { name: "B", studentCount: 42 },
        { name: "C", studentCount: 40 },
      ]);
    });

    it("handles null, undefined, empty array, or invalid primitives gracefully", () => {
      expect(normalizeSectionDetails([])).toEqual([{ name: "A", studentCount: 40 }]);
      expect(normalizeSectionDetails(null)).toEqual([{ name: "A", studentCount: 40 }]);
      expect(normalizeSectionDetails(undefined)).toEqual([{ name: "A", studentCount: 40 }]);
      expect(normalizeSectionDetails([123 as unknown as string, true as unknown as string])).toEqual([
        { name: "123", studentCount: 40 },
        { name: "true", studentCount: 40 },
      ]);
    });

    it("defaults blank or whitespace names to 'A'", () => {
      const res = normalizeSectionDetails([
        { name: "", studentCount: 35 },
        { name: "   ", studentCount: 45 },
      ]);
      expect(res).toEqual([
        { name: "A", studentCount: 35 },
        { name: "A", studentCount: 45 },
      ]);
    });
  });

  // =========================================================================
  // SUITE 3: Malformed SQLite sectionsJson Text & DTO Mapping
  // =========================================================================
  describe("Suite 3: Malformed SQLite sectionsJson handling in toAcademicClassDto", () => {
    const baseRow = {
      id: "cls-corrupt",
      name: "Class Corrupt",
      displayOrder: 1,
      stream: "General",
      academicSession: "2028-29",
      subjects: [],
    };

    it("handles corrupt JSON syntax '{invalid' gracefully without crashing", () => {
      const dto = toAcademicClassDto({ ...baseRow, sectionsJson: "{invalid" });
      expect(dto.sections).toEqual(["A"]);
      expect(dto.sectionDetails).toEqual([{ name: "A", studentCount: 40 }]);
      expect(dto.academicSession).toBe("2028–29");
    });

    it("handles empty string '' gracefully", () => {
      const dto = toAcademicClassDto({ ...baseRow, sectionsJson: "" });
      expect(dto.sections).toEqual(["A"]);
      expect(dto.sectionDetails).toEqual([{ name: "A", studentCount: 40 }]);
    });

    it("handles empty array '[]' gracefully", () => {
      const dto = toAcademicClassDto({ ...baseRow, sectionsJson: "[]" });
      expect(dto.sections).toEqual(["A"]);
      expect(dto.sectionDetails).toEqual([{ name: "A", studentCount: 40 }]);
    });

    it("handles numeric primitive array '[123]' gracefully", () => {
      const dto = toAcademicClassDto({ ...baseRow, sectionsJson: "[123]" });
      expect(dto.sections).toEqual(["123"]);
      expect(dto.sectionDetails).toEqual([{ name: "123", studentCount: 40 }]);
    });

    it("handles non-array JSON object '{\"key\": \"val\"}' gracefully", () => {
      const dto = toAcademicClassDto({ ...baseRow, sectionsJson: '{"key": "val"}' });
      expect(dto.sections).toEqual(["A"]);
      expect(dto.sectionDetails).toEqual([{ name: "A", studentCount: 40 }]);
    });

    it("handles literal 'null' and 'undefined' strings gracefully", () => {
      const dtoNull = toAcademicClassDto({ ...baseRow, sectionsJson: "null" });
      expect(dtoNull.sections).toEqual(["A"]);
      expect(dtoNull.sectionDetails).toEqual([{ name: "A", studentCount: 40 }]);

      const dtoUndef = toAcademicClassDto({ ...baseRow, sectionsJson: "undefined" });
      expect(dtoUndef.sections).toEqual(["A"]);
      expect(dtoUndef.sectionDetails).toEqual([{ name: "A", studentCount: 40 }]);
    });
  });

  // =========================================================================
  // SUITE 4: Legacy Records Backward Compatibility & Print Logistics Integration
  // =========================================================================
  describe("Suite 4: Legacy Records without studentCount default to 40 and drive Print Logistics", () => {
    it("transparently converts legacy string array '[\"A\", \"B\", \"C\"]' to 40 students each", () => {
      const dto = toAcademicClassDto({
        id: "legacy-cls",
        name: "Class 9",
        displayOrder: 9,
        stream: "General",
        academicSession: "2028–29",
        sectionsJson: '["A", "B", "C"]',
        subjects: [],
      });

      expect(dto.sections).toEqual(["A", "B", "C"]);
      expect(dto.sectionDetails).toEqual([
        { name: "A", studentCount: 40 },
        { name: "B", studentCount: 40 },
        { name: "C", studentCount: 40 },
      ]);

      // Verify Print Logistics auto-population for legacy class
      const printSections = getSectionsForClass(dto);
      expect(printSections).toEqual([
        { name: "Class 9 - Section A", count: 40 },
        { name: "Class 9 - Section B", count: 40 },
        { name: "Class 9 - Section C", count: 40 },
      ]);

      const totalStudents = printSections.reduce((acc, s) => acc + s.count, 0);
      expect(totalStudents).toBe(120);

      const metrics = calculatePrintLogistics({
        totalStudents,
        layout: "BOOKLET",
        pageCount: 8, // 8 pages in booklet = 2 sheets per copy
        wastagePercent: 5,
      });

      expect(metrics.sheetsPerCopy).toBe(2);
      expect(metrics.rawSheets).toBe(240); // 120 * 2
      expect(metrics.wastageSheets).toBe(12); // ceil(240 * 0.05) = 12
      expect(metrics.totalSheetsRequired).toBe(252);
      expect(metrics.totalReamsRequired).toBe(0.5); // 252 / 500 = 0.504 -> 0.5
      expect(metrics.reamsToOrder).toBe(1);
      expect(metrics.answerBookletsRequired).toBe(120);
    });

    it("accurately passes modernized section student counts to Print Logistics", () => {
      const dto = toAcademicClassDto({
        id: "modern-cls",
        name: "Class 10",
        displayOrder: 10,
        stream: "Secondary",
        academicSession: "2028–29",
        sectionsJson: JSON.stringify([
          { name: "A", studentCount: 42 },
          { name: "B", studentCount: 38 },
        ]),
        subjects: [],
      });

      expect(dto.sections).toEqual(["A", "B"]);
      expect(dto.sectionDetails).toEqual([
        { name: "A", studentCount: 42 },
        { name: "B", studentCount: 38 },
      ]);

      const printSections = getSectionsForClass(dto);
      expect(printSections).toEqual([
        { name: "Class 10 - Section A", count: 42 },
        { name: "Class 10 - Section B", count: 38 },
      ]);

      const totalStudents = printSections.reduce((acc, s) => acc + s.count, 0);
      expect(totalStudents).toBe(80);

      const metrics = calculatePrintLogistics({
        totalStudents,
        layout: "PAGE",
        pageCount: 4, // 4 pages duplex = 2 sheets per copy
        wastagePercent: 10,
      });

      expect(metrics.sheetsPerCopy).toBe(2);
      expect(metrics.rawSheets).toBe(160); // 80 * 2
      expect(metrics.wastageSheets).toBe(16); // ceil(160 * 0.10)
      expect(metrics.totalSheetsRequired).toBe(176);
      expect(metrics.reamsToOrder).toBe(1);
    });
  });

  // =========================================================================
  // SUITE 5: Empirical API Route Testing (POST /api/classes & PATCH /api/classes/[id])
  // =========================================================================
  describe("Suite 5: Live API Route Endpoints with Boundary and Mixed Payloads", () => {
    it("POST /api/classes persists boundary studentCount = 1 and 500 into SQLite", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Class 11-Boundary-${testStamp}`,
          stream: "Science",
          academicSession: testSession,
          sections: [
            { name: "MinSec", studentCount: 1 },
            { name: "MaxSec", studentCount: 500 },
          ],
        }),
      });

      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBeDefined();
      createdClassIds.push(data.id);

      expect(data.sections).toEqual(["MinSec", "MaxSec"]);
      expect(data.sectionDetails).toEqual([
        { name: "MinSec", studentCount: 1 },
        { name: "MaxSec", studentCount: 500 },
      ]);

      // Verify raw SQLite record
      const dbRow = await prisma.academicClass.findUniqueOrThrow({ where: { id: data.id } });
      const rawParsed = JSON.parse(dbRow.sectionsJson);
      expect(rawParsed).toEqual([
        { name: "MinSec", studentCount: 1 },
        { name: "MaxSec", studentCount: 500 },
      ]);
    });

    it("POST /api/classes accepts mixed format ['A', { name: 'B', studentCount: 42 }]", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Class 12-Mixed-${testStamp}`,
          stream: "Commerce",
          academicSession: testSession,
          sections: ["A", { name: "B", studentCount: 42 }],
        }),
      });

      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBeDefined();
      createdClassIds.push(data.id);

      expect(data.sections).toEqual(["A", "B"]);
      expect(data.sectionDetails).toEqual([
        { name: "A", studentCount: 40 },
        { name: "B", studentCount: 42 },
      ]);

      // Verify raw SQLite record
      const dbRow = await prisma.academicClass.findUniqueOrThrow({ where: { id: data.id } });
      expect(JSON.parse(dbRow.sectionsJson)).toEqual([
        { name: "A", studentCount: 40 },
        { name: "B", studentCount: 42 },
      ]);
    });

    it("POST /api/classes defaults omitted studentCount to 40", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Class 8-Def-${testStamp}`,
          stream: "Middle",
          academicSession: testSession,
          sections: [{ name: "DefaultSec" }],
        }),
      });

      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBeDefined();
      createdClassIds.push(data.id);

      expect(data.sectionDetails).toEqual([{ name: "DefaultSec", studentCount: 40 }]);
    });

    it("POST /api/classes strictly rejects studentCount = 0 with HTTP 400", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Class 10-Zero-${testStamp}`,
          academicSession: testSession,
          sections: [{ name: "A", studentCount: 0 }],
        }),
      });

      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("POST /api/classes strictly rejects studentCount < 0 with HTTP 400", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Class 10-Neg-${testStamp}`,
          academicSession: testSession,
          sections: [{ name: "A", studentCount: -5 }],
        }),
      });

      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });

    it("POST /api/classes strictly rejects studentCount = 501 with HTTP 400", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Class 10-Exceed-${testStamp}`,
          academicSession: testSession,
          sections: [{ name: "A", studentCount: 501 }],
        }),
      });

      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });

    it("POST /api/classes strictly rejects non-integer float studentCount with HTTP 400", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Class 10-Float-${testStamp}`,
          academicSession: testSession,
          sections: [{ name: "A", studentCount: 42.5 }],
        }),
      });

      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });

    it("POST /api/classes strictly rejects null studentCount with HTTP 400", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Class 10-Null-${testStamp}`,
          academicSession: testSession,
          sections: [{ name: "A", studentCount: null }],
        }),
      });

      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });

    it("PATCH /api/classes/[id] successfully updates section capacities and formats", async () => {
      // First create a class to patch
      const initial = await prisma.academicClass.create({
        data: {
          name: `Class PatchTarget-${testStamp}`,
          displayOrder: 6,
          stream: "Middle",
          academicSession: testSession,
          sectionsJson: JSON.stringify(["A"]),
        },
      });
      createdClassIds.push(initial.id);

      // 1. Patch with mixed sections
      const reqMixed = new Request(`http://localhost/api/classes/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: [
            { name: "Alpha", studentCount: 35 },
            "Beta",
          ],
        }),
      });

      const resMixed = await patchClass(reqMixed, { params: Promise.resolve({ id: initial.id }) });
      expect(resMixed.status).toBe(200);

      const mixedData = await resMixed.json();
      expect(mixedData.sections).toEqual(["Alpha", "Beta"]);
      expect(mixedData.sectionDetails).toEqual([
        { name: "Alpha", studentCount: 35 },
        { name: "Beta", studentCount: 40 },
      ]);

      // 2. Patch with boundary values 1 and 500
      const reqBoundary = new Request(`http://localhost/api/classes/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: [
            { name: "P1", studentCount: 1 },
            { name: "P500", studentCount: 500 },
          ],
        }),
      });

      const resBoundary = await patchClass(reqBoundary, { params: Promise.resolve({ id: initial.id }) });
      expect(resBoundary.status).toBe(200);

      const boundaryData = await resBoundary.json();
      expect(boundaryData.sectionDetails).toEqual([
        { name: "P1", studentCount: 1 },
        { name: "P500", studentCount: 500 },
      ]);

      // Verify SQLite state
      const updatedRow = await prisma.academicClass.findUniqueOrThrow({ where: { id: initial.id } });
      expect(JSON.parse(updatedRow.sectionsJson)).toEqual([
        { name: "P1", studentCount: 1 },
        { name: "P500", studentCount: 500 },
      ]);
    });

    it("PATCH /api/classes/[id] strictly rejects invalid studentCount (0, 501, float, null) with HTTP 400", async () => {
      const cls = await prisma.academicClass.create({
        data: {
          name: `Class PatchFail-${testStamp}`,
          displayOrder: 7,
          stream: "Middle",
          academicSession: testSession,
          sectionsJson: JSON.stringify([{ name: "A", studentCount: 40 }]),
        },
      });
      createdClassIds.push(cls.id);

      // 0 rejected
      const res0 = await patchClass(
        new Request(`http://localhost/api/classes/${cls.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: [{ name: "A", studentCount: 0 }] }),
        }),
        { params: Promise.resolve({ id: cls.id }) }
      );
      expect(res0.status).toBe(400);

      // 501 rejected
      const res501 = await patchClass(
        new Request(`http://localhost/api/classes/${cls.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: [{ name: "A", studentCount: 501 }] }),
        }),
        { params: Promise.resolve({ id: cls.id }) }
      );
      expect(res501.status).toBe(400);

      // float rejected
      const resFloat = await patchClass(
        new Request(`http://localhost/api/classes/${cls.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: [{ name: "A", studentCount: 30.7 }] }),
        }),
        { params: Promise.resolve({ id: cls.id }) }
      );
      expect(resFloat.status).toBe(400);

      // null rejected
      const resNull = await patchClass(
        new Request(`http://localhost/api/classes/${cls.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: [{ name: "A", studentCount: null }] }),
        }),
        { params: Promise.resolve({ id: cls.id }) }
      );
      expect(resNull.status).toBe(400);

      // Verify that the database record was untouched
      const untouchedRow = await prisma.academicClass.findUniqueOrThrow({ where: { id: cls.id } });
      expect(JSON.parse(untouchedRow.sectionsJson)).toEqual([{ name: "A", studentCount: 40 }]);
    });

    it("verifies TEACHER role is blocked with HTTP 403 Forbidden from mutating classes", async () => {
      // Switch session to Teacher
      mockSessionUserId = teacherUserId;

      const postRes = await postClass(
        new Request("http://localhost/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Unauthorized-${testStamp}`,
            academicSession: testSession,
            sections: ["A"],
          }),
        }),
        { params: Promise.resolve({}) }
      );
      expect(postRes.status).toBe(403);

      const patchRes = await patchClass(
        new Request(`http://localhost/api/classes/${createdClassIds[0]}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: [{ name: "A", studentCount: 50 }] }),
        }),
        { params: Promise.resolve({ id: createdClassIds[0] }) }
      );
      expect(patchRes.status).toBe(403);
    });
  });
});
