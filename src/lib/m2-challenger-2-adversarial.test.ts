import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";
import {
  MPBSE_BLUEPRINT_TEMPLATES,
  adaptChaptersHamiltonHare,
  validateCircular465Blueprint,
  TERM_CONFIGS,
  type ExaminationTerm,
} from "./curriculumTemplates";
import {
  adaptCustomSchoolBlueprint,
  mapCurriculumTemplateToBlueprintInput,
} from "./blueprints";
import { validateBlueprint, checkBlueprintFeasibility } from "./blueprint";

// Session Mocking for RBAC on API route handlers
let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as postBlueprint, GET as getBlueprints } from "@/app/api/blueprints/route";
import { GET as getCurriculumTemplates } from "@/app/api/curriculum/templates/route";
import { POST as adaptCurriculumBlueprint } from "@/app/api/curriculum/blueprints/adapt/route";

describe("Milestone 2 Challenger Adversarial Empirical Test Suite", () => {
  let teacherUser: { id: string; email: string; role: string };
  const testStamp = Date.now();
  let testBookId: string;
  let testChapterIds: string[] = [];

  beforeAll(async () => {
    // Create an authenticated test teacher
    teacherUser = await prisma.user.create({
      data: {
        name: `M2 Challenger Teacher ${testStamp}`,
        email: `m2_chal_teacher_${testStamp}@test.internal`,
        passwordHash: "dummy_hash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });
    mockSessionUserId = teacherUser.id;

    // Retrieve or create a test book with at least 19 chapters for extreme ratio testing
    let book = await prisma.book.findFirst({
      where: { className: "Class 10", subject: "Mathematics" },
      include: { chapters: { orderBy: { number: "asc" } } },
    });

    if (!book || book.chapters.length < 14) {
      // Create a dedicated synthetic book with 19 chapters
      book = await prisma.book.create({
        data: {
          title: `Challenger Synthetic Book ${testStamp}`,
          className: "Class 10",
          subject: "Mathematics",
          chapters: {
            create: Array.from({ length: 19 }, (_, i) => ({
              title: `Chapter ${i + 1}`,
              number: i + 1,
            })),
          },
        },
        include: { chapters: { orderBy: { number: "asc" } } },
      });
    }

    testBookId = book.id;
    testChapterIds = book.chapters.map((c) => c.id);
  });

  afterAll(async () => {
    if (teacherUser) {
      await prisma.user.delete({ where: { id: teacherUser.id } }).catch(() => {});
    }
  });

  // ===========================================================================
  // SECTION 1: HAMILTON-HARE PROPORTIONAL REBALANCING INVARIANTS & EXTREMES
  // ===========================================================================
  describe("Section 1: Hamilton-Hare Invariants & Stress Testing", () => {
    const targetMarksList = [25, 50, 75, 100];

    it("Invariant: Sum of adapted marks ALWAYS strictly equals target marks (zero drift)", () => {
      for (const targetMarks of targetMarksList) {
        // Vary active chapter counts from 1 to 25
        for (let chapterCount = 1; chapterCount <= 25; chapterCount++) {
          const chapters = Array.from({ length: chapterCount }, (_, i) => ({
            chapterId: `ch-${i + 1}`,
            officialMarks: (i % 7) + 1, // varied weights
          }));

          const adapted = adaptChaptersHamiltonHare(chapters, targetMarks, 1);
          const totalMarks = adapted.reduce((s, c) => s + c.marks, 0);

          expect(totalMarks).toBe(targetMarks);
          expect(adapted.length).toBe(chapterCount);
          expect(adapted.every((c) => Number.isInteger(c.marks))).toBe(true);
        }
      }
    });

    it("Extreme Ratio: 1 active chapter out of 14 across target marks (25m, 50m, 75m, 100m)", () => {
      const activeChapters = [{ chapterId: "ch-active-1", officialMarks: 6 }];

      for (const target of [25, 50, 75, 100]) {
        const adapted = adaptChaptersHamiltonHare(activeChapters, target, 1);
        expect(adapted.length).toBe(1);
        expect(adapted[0].marks).toBe(target);
        expect(adapted[0].marks).toBeGreaterThan(0);
      }
    });

    it("Extreme Ratio: 2 active chapters out of 19 across target marks (25m, 50m, 75m, 100m)", () => {
      const activeChapters = [
        { chapterId: "ch-1", officialMarks: 8 },
        { chapterId: "ch-2", officialMarks: 4 },
      ];

      for (const target of [25, 50, 75, 100]) {
        const adapted = adaptChaptersHamiltonHare(activeChapters, target, 1);
        expect(adapted.length).toBe(2);
        const sum = adapted.reduce((s, c) => s + c.marks, 0);
        expect(sum).toBe(target);
        const ch1 = adapted.find((c) => c.chapterId === "ch-1")!;
        const ch2 = adapted.find((c) => c.chapterId === "ch-2")!;
        expect(ch1).toBeDefined();
        expect(ch2).toBeDefined();
        expect(ch1.marks).toBeGreaterThan(0);
        expect(ch2.marks).toBeGreaterThan(0);
        // Chapter 1 had 2x the weight of Chapter 2, so it should receive more marks
        expect(ch1.marks).toBeGreaterThanOrEqual(ch2.marks);
      }
    });

    it("Invariant: No active chapter receives 0 marks when target marks >= active chapter count", () => {
      // Test edge where targetMarks == activeChapters.length (e.g., 25 chapters into 25 marks)
      const chapters25 = Array.from({ length: 25 }, (_, i) => ({
        chapterId: `ch-${i + 1}`,
        officialMarks: i === 0 ? 100 : 1, // extremely skewed weight
      }));

      const adapted25 = adaptChaptersHamiltonHare(chapters25, 25, 1);
      const sum25 = adapted25.reduce((s, c) => s + c.marks, 0);
      expect(sum25).toBe(25);
      // Even with 100:1 skew, every single chapter must get at least 1 mark
      expect(adapted25.every((c) => c.marks >= 1)).toBe(true);

      // Test where targetMarks = 25 and active chapters = 19
      const chapters19 = Array.from({ length: 19 }, (_, i) => ({
        chapterId: `ch-${i + 1}`,
        officialMarks: i === 0 ? 50 : 1,
      }));
      const adapted19 = adaptChaptersHamiltonHare(chapters19, 25, 1);
      expect(adapted19.reduce((s, c) => s + c.marks, 0)).toBe(25);
      expect(adapted19.every((c) => c.marks >= 1)).toBe(true);

      // Test where targetMarks = 25 and active chapters = 14
      const chapters14 = Array.from({ length: 14 }, (_, i) => ({
        chapterId: `ch-${i + 1}`,
        officialMarks: i % 2 === 0 ? 10 : 2,
      }));
      const adapted14 = adaptChaptersHamiltonHare(chapters14, 25, 1);
      expect(adapted14.reduce((s, c) => s + c.marks, 0)).toBe(25);
      expect(adapted14.every((c) => c.marks >= 1)).toBe(true);
    });

    it("Adversarial: Extreme weight disparities [1000:1] across 50m and 100m", () => {
      const skewed = [
        { chapterId: "ch-giant", officialMarks: 1000 },
        { chapterId: "ch-tiny", officialMarks: 1 },
      ];

      const adapted50 = adaptChaptersHamiltonHare(skewed, 50, 1);
      expect(adapted50.reduce((s, c) => s + c.marks, 0)).toBe(50);
      expect(adapted50.find((c) => c.chapterId === "ch-tiny")!.marks).toBe(1);
      expect(adapted50.find((c) => c.chapterId === "ch-giant")!.marks).toBe(49);

      const adapted100 = adaptChaptersHamiltonHare(skewed, 100, 1);
      expect(adapted100.reduce((s, c) => s + c.marks, 0)).toBe(100);
      expect(adapted100.find((c) => c.chapterId === "ch-tiny")!.marks).toBe(1);
      expect(adapted100.find((c) => c.chapterId === "ch-giant")!.marks).toBe(99);
    });

    it("Adversarial: Zero/null/undefined officialMarks fallback to unit weight", () => {
      const corruptWeights = [
        { chapterId: "ch-1", officialMarks: 0 },
        { chapterId: "ch-2", marks: 0 },
        { chapterId: "ch-3", officialMarks: undefined },
        { chapterId: "ch-4", officialMarks: 10 },
      ];

      const adapted = adaptChaptersHamiltonHare(corruptWeights, 25, 1);
      expect(adapted.reduce((s, c) => s + c.marks, 0)).toBe(25);
      expect(adapted.every((c) => c.marks >= 1)).toBe(true);
    });

    it("Adversarial: Empty active chapters array returns empty array", () => {
      expect(adaptChaptersHamiltonHare([], 50, 1)).toEqual([]);
    });
  });

  // ===========================================================================
  // SECTION 2: adaptCustomSchoolBlueprint() ADVERSARIAL STRESS
  // ===========================================================================
  describe("Section 2: adaptCustomSchoolBlueprint() End-to-End Stress", () => {
    it("adapts 1 active chapter out of 14 for UNIT_TEST (25m) and QUARTERLY (50m)", async () => {
      const activeIds = [testChapterIds[0]];
      expect(testChapterIds.length).toBeGreaterThanOrEqual(14);

      // 1. UNIT_TEST (25m)
      const adaptedUT = await adaptCustomSchoolBlueprint(
        "mpbse-10th-mathematics-standard-100-75m",
        testBookId,
        "UNIT_TEST",
        activeIds
      );

      expect(adaptedUT.curriculumMode).toBe("CUSTOM_SCHOOL");
      expect(adaptedUT.durationMin).toBe(60);
      const utSecSum = adaptedUT.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const utChSum = adaptedUT.chapters.reduce((s, ch) => s + ch.marks, 0);
      expect(utSecSum).toBe(25);
      expect(utChSum).toBe(25);

      // Verify active chapter received 25 marks
      const activeChUT = adaptedUT.chapters.find((c) => c.chapterId === activeIds[0]);
      expect(activeChUT?.marks).toBe(25);

      // Verify all other 13+ inactive chapters received EXACTLY 0 marks
      const inactiveUT = adaptedUT.chapters.filter((c) => c.chapterId !== activeIds[0]);
      expect(inactiveUT.length).toBeGreaterThanOrEqual(13);
      expect(inactiveUT.every((c) => c.marks === 0)).toBe(true);

      // 2. QUARTERLY (50m)
      const adaptedQ = await adaptCustomSchoolBlueprint(
        "mpbse-10th-mathematics-standard-100-75m",
        testBookId,
        "QUARTERLY",
        activeIds
      );
      expect(adaptedQ.durationMin).toBe(120);
      const qSecSum = adaptedQ.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const qChSum = adaptedQ.chapters.reduce((s, ch) => s + ch.marks, 0);
      expect(qSecSum).toBe(50);
      expect(qChSum).toBe(50);
      expect(adaptedQ.chapters.find((c) => c.chapterId === activeIds[0])?.marks).toBe(50);
      expect(adaptedQ.chapters.filter((c) => c.chapterId !== activeIds[0]).every((c) => c.marks === 0)).toBe(true);
    });

    it("adapts 2 active chapters out of 19 for UNIT_TEST (25m) and QUARTERLY (50m)", async () => {
      // Use 2 active chapters
      const activeIds = [testChapterIds[0], testChapterIds[1]];

      const adaptedUT = await adaptCustomSchoolBlueprint(
        "mpbse-10th-mathematics-standard-100-75m",
        testBookId,
        "UNIT_TEST",
        activeIds
      );

      const utSecSum = adaptedUT.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const utChSum = adaptedUT.chapters.reduce((s, ch) => s + ch.marks, 0);
      expect(utSecSum).toBe(25);
      expect(utChSum).toBe(25);

      const activeUT = adaptedUT.chapters.filter((c) => activeIds.includes(c.chapterId));
      expect(activeUT.length).toBe(2);
      expect(activeUT.every((c) => c.marks > 0)).toBe(true);
      expect(activeUT[0].marks + activeUT[1].marks).toBe(25);

      const inactiveUT = adaptedUT.chapters.filter((c) => !activeIds.includes(c.chapterId));
      expect(inactiveUT.length).toBeGreaterThanOrEqual(12);
      expect(inactiveUT.every((c) => c.marks === 0)).toBe(true);
    });

    it("preserves Circular 465 rules after term scaling", async () => {
      const activeIds = testChapterIds.slice(0, 3);
      const adapted = await adaptCustomSchoolBlueprint(
        "mpbse-10th-mathematics-standard-100-75m",
        testBookId,
        "QUARTERLY",
        activeIds
      );

      // Verify Circular 465: 2m has NO choice, 3m/4m has REQUIRED choice
      for (const sec of adapted.sections) {
        if (sec.marksEach === 2) {
          expect(sec.orChoiceMode).toBe("NOT_REQUIRED");
          expect(sec.orAlternativeCount).toBe(0);
        }
        if (sec.marksEach === 3 || sec.marksEach === 4) {
          expect(sec.orChoiceMode).toBe("REQUIRED");
          expect(sec.orAlternativeCount).toBe(1);
        }
      }

      const audit = validateCircular465Blueprint(adapted.sections);
      expect(audit.isCompliant).toBe(true);
      expect(audit.violations.length).toBe(0);
    });

    it("adapts Class 10 Math (75m template) for HALF_YEARLY and PRE_BOARD with 1 and 2 active chapters", async () => {
      // 1 active chapter out of 14 for HALF_YEARLY (75m)
      const adaptedHY1 = await adaptCustomSchoolBlueprint(
        "mpbse-10th-mathematics-standard-100-75m",
        testBookId,
        "HALF_YEARLY",
        [testChapterIds[0]]
      );
      expect(adaptedHY1.durationMin).toBe(180);
      const hy1SecSum = adaptedHY1.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const hy1ChSum = adaptedHY1.chapters.reduce((s, ch) => s + ch.marks, 0);
      expect(hy1SecSum).toBe(75);
      expect(hy1ChSum).toBe(75);
      expect(adaptedHY1.chapters.find((c) => c.chapterId === testChapterIds[0])?.marks).toBe(75);
      expect(adaptedHY1.chapters.filter((c) => c.chapterId !== testChapterIds[0]).every((c) => c.marks === 0)).toBe(true);

      // 2 active chapters out of 19 for PRE_BOARD (75m)
      const active2 = [testChapterIds[0], testChapterIds[1]];
      const adaptedPB2 = await adaptCustomSchoolBlueprint(
        "mpbse-10th-mathematics-standard-100-75m",
        testBookId,
        "PRE_BOARD",
        active2
      );
      expect(adaptedPB2.durationMin).toBe(180);
      const pb2SecSum = adaptedPB2.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const pb2ChSum = adaptedPB2.chapters.reduce((s, ch) => s + ch.marks, 0);
      expect(pb2SecSum).toBe(75);
      expect(pb2ChSum).toBe(75);
      expect(adaptedPB2.chapters.filter((c) => active2.includes(c.chapterId)).every((c) => c.marks > 0)).toBe(true);
      expect(adaptedPB2.chapters.filter((c) => !active2.includes(c.chapterId)).every((c) => c.marks === 0)).toBe(true);
    });

    it("evaluates behavior on 70m Science template (Physics Class 12) across terms", async () => {
      const physBook = await prisma.book.findFirst({
        where: { className: "Class 12", subject: "Physics" },
        include: { chapters: true },
      });
      if (!physBook || physBook.chapters.length < 2) return;

      const activeIds = [physBook.chapters[0].id, physBook.chapters[1].id];

      // 1. UNIT_TEST (25m) on 70m template
      const adaptedUT = await adaptCustomSchoolBlueprint(
        "mpbse-12th-physics-210-70m",
        physBook.id,
        "UNIT_TEST",
        activeIds
      );
      const utSecSum = adaptedUT.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const utChSum = adaptedUT.chapters.reduce((s, ch) => s + ch.marks, 0);
      expect(utSecSum).toBe(25);
      expect(utChSum).toBe(25);
      expect(adaptedUT.chapters.filter((c) => activeIds.includes(c.chapterId)).every((c) => c.marks > 0)).toBe(true);
      expect(adaptedUT.chapters.filter((c) => !activeIds.includes(c.chapterId)).every((c) => c.marks === 0)).toBe(true);

      // 2. QUARTERLY (50m) on 70m template
      const adaptedQ = await adaptCustomSchoolBlueprint(
        "mpbse-12th-physics-210-70m",
        physBook.id,
        "QUARTERLY",
        activeIds
      );
      const qSecSum = adaptedQ.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const qChSum = adaptedQ.chapters.reduce((s, ch) => s + ch.marks, 0);
      expect(qSecSum).toBe(50);
      expect(qChSum).toBe(50);

      // 3. HALF_YEARLY on 70m template:
      // Note: Base template is 70m (theory for subjects with practical), whereas TERM_CONFIGS.HALF_YEARLY
      // defaults to 75m without proportional scaling.
      const adaptedHY = await adaptCustomSchoolBlueprint(
        "mpbse-12th-physics-210-70m",
        physBook.id,
        "HALF_YEARLY",
        activeIds
      );
      const hySecSum = adaptedHY.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const hyChSum = adaptedHY.chapters.reduce((s, ch) => s + ch.marks, 0);
      expect(hySecSum).toBe(70); // Preserves 70m official science sections
      expect(hyChSum).toBe(75);  // Hamilton-Hare rebalanced to TERM_CONFIGS targetMarks (75m)
      expect(adaptedHY.chapters.filter((c) => !activeIds.includes(c.chapterId)).every((c) => c.marks === 0)).toBe(true);
    });

    it("evaluates behavior on 80m template (Math Class 12) across terms", async () => {
      const mathBook = await prisma.book.findFirst({
        where: { className: "Class 12", subject: "Mathematics" },
        include: { chapters: true },
      });
      if (!mathBook || mathBook.chapters.length < 2) return;

      const activeIds = [mathBook.chapters[0].id, mathBook.chapters[1].id];

      // 1. UNIT_TEST (25m) on 80m template
      const adaptedUT = await adaptCustomSchoolBlueprint(
        "mpbse-12th-mathematics-150-80m",
        mathBook.id,
        "UNIT_TEST",
        activeIds
      );
      const utSecSum = adaptedUT.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const utChSum = adaptedUT.chapters.reduce((s, ch) => s + ch.marks, 0);
      expect(utSecSum).toBe(25);
      expect(utChSum).toBe(25);

      // 2. QUARTERLY (50m) on 80m template
      const adaptedQ = await adaptCustomSchoolBlueprint(
        "mpbse-12th-mathematics-150-80m",
        mathBook.id,
        "QUARTERLY",
        activeIds
      );
      const qSecSum = adaptedQ.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
      const qChSum = adaptedQ.chapters.reduce((s, ch) => s + ch.marks, 0);
      expect(qSecSum).toBe(50);
      expect(qChSum).toBe(50);
    });

    it("rejects adaptation when zero active chapters are provided", async () => {
      await expect(
        adaptCustomSchoolBlueprint(
          "mpbse-10th-mathematics-standard-100-75m",
          testBookId,
          "QUARTERLY",
          []
        )
      ).rejects.toThrow(/At least one active chapter must be selected/);
    });
  });

  // ===========================================================================
  // SECTION 3: API ENDPOINT ROBUSTNESS (POST /api/blueprints)
  // ===========================================================================
  describe("Section 3: POST /api/blueprints Robustness & Backward Compatibility", () => {
    const basePayload = {
      name: "API Challenger Test Blueprint",
      academicSession: "2026-27",
      examType: "ANNUAL" as const,
      durationMin: 180,
      subjectCode: "100",
      language: "en" as const,
      sections: [
        {
          title: "Section A: Objectives",
          instructions: "Answer all questions",
          type: "MCQ" as const,
          count: 10,
          marksEach: 1,
        },
        {
          title: "Section B: Short Answer",
          instructions: "Answer all questions",
          type: "SHORT" as const,
          count: 5,
          marksEach: 2,
        },
      ],
    };

    it("Mode 1: POST with curriculumMode = STANDARD_MPBSE", async () => {
      const dbTemplate = await prisma.curriculumBlueprintTemplate.findFirst({
        where: { templateCode: "mpbse-10th-mathematics-standard-100-75m" },
      });
      expect(dbTemplate).toBeDefined();

      const payload = {
        ...basePayload,
        name: `Standard MPBSE Blueprint ${testStamp}`,
        bookId: testBookId,
        curriculumMode: "STANDARD_MPBSE",
        curriculumTemplateId: dbTemplate!.id,
        chapters: [{ chapterId: testChapterIds[0], marks: 20 }],
      };

      const req = new Request("http://localhost/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await postBlueprint(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.curriculumMode).toBe("STANDARD_MPBSE");
      expect(data.curriculumTemplateId).toBe(dbTemplate!.id);
      expect(data.bookId).toBe(testBookId);
    });

    it("Mode 2: POST with curriculumMode = CUSTOM_SCHOOL", async () => {
      const dbTemplate = await prisma.curriculumBlueprintTemplate.findFirst({
        where: { templateCode: "mpbse-10th-mathematics-standard-100-75m" },
      });

      const payload = {
        ...basePayload,
        name: `Custom School Blueprint ${testStamp}`,
        bookId: testBookId,
        curriculumMode: "CUSTOM_SCHOOL",
        curriculumTemplateId: dbTemplate?.id || null,
        chapters: [
          { chapterId: testChapterIds[0], marks: 10 },
          { chapterId: testChapterIds[1], marks: 10 },
        ],
      };

      const req = new Request("http://localhost/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await postBlueprint(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.curriculumMode).toBe("CUSTOM_SCHOOL");
    });

    it("Mode 3: POST with curriculumMode = BLANK_CUSTOM", async () => {
      const payload = {
        ...basePayload,
        name: `Blank Custom Blueprint ${testStamp}`,
        bookId: testBookId,
        curriculumMode: "BLANK_CUSTOM",
        chapters: [{ chapterId: testChapterIds[0], marks: 20 }],
      };

      const req = new Request("http://localhost/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await postBlueprint(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.curriculumMode).toBe("BLANK_CUSTOM");
    });

    it("Backward Compatibility: Omitted curriculumMode defaults cleanly to BLANK_CUSTOM", async () => {
      const payload = {
        ...basePayload,
        name: `Legacy Blueprint Without Mode ${testStamp}`,
        bookId: testBookId,
        // curriculumMode is omitted!
        chapters: [{ chapterId: testChapterIds[0], marks: 20 }],
      };

      const req = new Request("http://localhost/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await postBlueprint(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.curriculumMode).toBe("BLANK_CUSTOM");
    });

    it("Zod Validation: Invalid curriculumMode returns 400 Bad Request", async () => {
      const invalidPayload = {
        ...basePayload,
        name: `Invalid Mode Blueprint ${testStamp}`,
        bookId: testBookId,
        curriculumMode: "INVALID_MODE_VALUE",
        chapters: [{ chapterId: testChapterIds[0], marks: 20 }],
      };

      const req = new Request("http://localhost/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPayload),
      });

      const res = await postBlueprint(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);

      const bodyJson = await res.json();
      expect(bodyJson.error).toBeDefined();
      expect(bodyJson.error).toMatch(/curriculumMode/);
    });

    it("Zod Validation: Marks mismatch between sections and chapters returns 400 Bad Request", async () => {
      const mismatchPayload = {
        ...basePayload,
        name: `Mismatch Marks Blueprint ${testStamp}`,
        bookId: testBookId,
        curriculumMode: "BLANK_CUSTOM",
        chapters: [{ chapterId: testChapterIds[0], marks: 99 }], // 99 != 20
      };

      const req = new Request("http://localhost/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mismatchPayload),
      });

      const res = await postBlueprint(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);

      const bodyJson = await res.json();
      expect(bodyJson.error).toMatch(/They must match/);
    });
  });

  // ===========================================================================
  // SECTION 4: GET /api/curriculum/templates FILTERING & 27 TEMPLATES COUNT
  // ===========================================================================
  describe("Section 4: GET /api/curriculum/templates Filters & Count", () => {
    it("returns all 27 verified board templates when unfiltered", async () => {
      const req = new Request("http://localhost/api/curriculum/templates");
      const res = await getCurriculumTemplates(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const templates = await res.json();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBe(27);
    });

    it("filters correctly by classLevel (9, 10, 11, 12)", async () => {
      const expectedCounts: Record<number, number> = {
        9: 7,
        10: 8,
        11: 6,
        12: 6,
      };

      for (const [classLevel, count] of Object.entries(expectedCounts)) {
        const req = new Request(`http://localhost/api/curriculum/templates?classLevel=${classLevel}`);
        const res = await getCurriculumTemplates(req, { params: Promise.resolve({}) });
        expect(res.status).toBe(200);

        const templates = await res.json();
        expect(templates.length).toBe(count);
        expect(
          templates.every((t: any) =>
            t.subject?.classLevel ? t.subject.classLevel === Number(classLevel) : t.classLevel === Number(classLevel)
          )
        ).toBe(true);
      }
    });

    it("filters correctly by stream (SCIENCE)", async () => {
      const req = new Request("http://localhost/api/curriculum/templates?stream=SCIENCE");
      const res = await getCurriculumTemplates(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const templates = await res.json();
      expect(templates.length).toBeGreaterThan(0);
      expect(
        templates.every((t: any) => {
          const streamCode = t.subject?.streamCode || t.stream;
          return streamCode?.includes("SCIENCE");
        })
      ).toBe(true);
    });

    it("filters correctly by subjectCode (100 = Class 10 Math)", async () => {
      const req = new Request("http://localhost/api/curriculum/templates?subjectCode=100");
      const res = await getCurriculumTemplates(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const templates = await res.json();
      expect(templates.length).toBeGreaterThanOrEqual(1);
      expect(
        templates.every((t: any) => {
          const code = t.subject?.code || t.subjectCode;
          return code === "100";
        })
      ).toBe(true);
    });

    it("filters by combined classLevel and subjectCode", async () => {
      const req = new Request("http://localhost/api/curriculum/templates?classLevel=10&subjectCode=100");
      const res = await getCurriculumTemplates(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const templates = await res.json();
      expect(templates.length).toBe(1);
      const t = templates[0];
      const code = t.subject?.code || t.subjectCode;
      const cls = t.subject?.classLevel || t.classLevel;
      expect(code).toBe("100");
      expect(cls).toBe(10);
    });

    it("returns empty array for non-existent subjectCode", async () => {
      const req = new Request("http://localhost/api/curriculum/templates?subjectCode=NONEXISTENT_999");
      const res = await getCurriculumTemplates(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const templates = await res.json();
      expect(templates).toEqual([]);
    });
  });

  // ===========================================================================
  // SECTION 5: POST /api/curriculum/blueprints/adapt ENDPOINT ROBUSTNESS
  // ===========================================================================
  describe("Section 5: POST /api/curriculum/blueprints/adapt Endpoint", () => {
    it("runs term adaptation and feasibility checks via API", async () => {
      const payload = {
        baseTemplateId: "mpbse-10th-mathematics-standard-100-75m",
        bookId: testBookId,
        term: "QUARTERLY",
        activeChapterIds: testChapterIds.slice(0, 4),
      };

      const req = new Request("http://localhost/api/curriculum/blueprints/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await adaptCurriculumBlueprint(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.blueprint).toBeDefined();
      expect(data.feasibility).toBeDefined();
      expect(data.blueprint.curriculumMode).toBe("CUSTOM_SCHOOL");
      expect(data.blueprint.sections.reduce((s: number, sec: any) => s + sec.count * sec.marksEach, 0)).toBe(50);
      expect(data.blueprint.chapters.reduce((s: number, ch: any) => s + ch.marks, 0)).toBe(50);
    });

    it("rejects request with empty activeChapterIds with 400 Bad Request", async () => {
      const payload = {
        baseTemplateId: "mpbse-10th-mathematics-standard-100-75m",
        bookId: testBookId,
        term: "QUARTERLY",
        activeChapterIds: [],
      };

      const req = new Request("http://localhost/api/curriculum/blueprints/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await adaptCurriculumBlueprint(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toMatch(/Select at least one active chapter/);
    });
  });
});
