import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { PATCH as patchPaper, DELETE as deletePaper } from "../app/api/papers/[id]/route";
import { POST as postPaperQuestion } from "../app/api/papers/[id]/questions/route";
import { POST as postPaperAutofill } from "../app/api/papers/[id]/autofill/route";
import { PATCH as patchQuestion, PUT as putQuestion, DELETE as deleteQuestion } from "../app/api/questions/[id]/route";
import { POST as postClass } from "../app/api/classes/route";
import { POST as postRollover } from "../app/api/academic-rollover/route";

describe("Milestone 1 RBAC & Ownership Enforcement Test Suite (Requirement R1)", () => {
  let teacherA: { id: string };
  let teacherB: { id: string };
  let adminUser: { id: string };

  let bookId: string;
  let chId: string;
  let blueprintId: string;
  let sectionId: string;

  let paperB_draftId: string;
  let paperA_finalId: string;
  let paperA_draftId: string;

  let questionAId: string;
  let questionBId: string;

  const testStamp = Date.now();

  beforeAll(async () => {
    // 1. Create Users
    teacherA = await prisma.user.create({
      data: {
        name: `Teacher Alice ${testStamp}`,
        email: `alice-${testStamp}@school.internal`,
        passwordHash: "dummyhash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });

    teacherB = await prisma.user.create({
      data: {
        name: `Teacher Bob ${testStamp}`,
        email: `bob-${testStamp}@school.internal`,
        passwordHash: "dummyhash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        name: `Admin Carol ${testStamp}`,
        email: `carol-${testStamp}@school.internal`,
        passwordHash: "dummyhash",
        role: "ADMIN",
        department: "Administration",
        active: true,
      },
    });

    // 2. Create Book, Chapter, Blueprint
    const book = await prisma.book.create({
      data: {
        title: `RBAC Science ${testStamp}`,
        subject: "Science",
        className: "Class 10",
        chapters: {
          create: [{ number: 1, title: "Light and Optics" }],
        },
      },
      include: { chapters: true },
    });
    bookId = book.id;
    chId = book.chapters[0].id;

    const bp = await prisma.blueprint.create({
      data: {
        name: `RBAC Blueprint ${testStamp}`,
        bookId,
        examType: "ANNUAL",
        durationMin: 180,
        sections: {
          create: [{ position: 1, title: "Section A", type: "SHORT", count: 2, marksEach: 2 }],
        },
        chapters: {
          create: [{ chapterId: chId, marks: 4 }],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    sectionId = bp.sections[0].id;

    // 3. Create Questions
    const qA = await prisma.question.create({
      data: {
        bookId,
        chapterId: chId,
        type: "SHORT",
        text: "Question created by Teacher A",
        answer: "A1",
        difficulty: "EASY",
        createdById: teacherA.id,
      },
    });
    questionAId = qA.id;

    const qB = await prisma.question.create({
      data: {
        bookId,
        chapterId: chId,
        type: "SHORT",
        text: "Question created by Teacher B",
        answer: "B1",
        difficulty: "MEDIUM",
        createdById: teacherB.id,
      },
    });
    questionBId = qB.id;

    // 4. Create Papers
    const pB = await prisma.paper.create({
      data: {
        title: `Teacher B Draft Paper ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "DRAFT",
        createdById: teacherB.id,
      },
    });
    paperB_draftId = pB.id;

    const pA_final = await prisma.paper.create({
      data: {
        title: `Teacher A Final Paper ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "FINAL",
        createdById: teacherA.id,
      },
    });
    paperA_finalId = pA_final.id;

    const pA_draft = await prisma.paper.create({
      data: {
        title: `Teacher A Draft Paper ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "DRAFT",
        createdById: teacherA.id,
      },
    });
    paperA_draftId = pA_draft.id;
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await prisma.academicClass.deleteMany({ where: { name: `Class-RBAC-${testStamp}` } });
    const paperIds = [paperB_draftId, paperA_finalId, paperA_draftId].filter(Boolean);
    if (paperIds.length > 0) {
      await prisma.paperQuestion.deleteMany({ where: { paperId: { in: paperIds } } });
      await prisma.paper.deleteMany({ where: { id: { in: paperIds } } });
    }
    if (blueprintId) {
      await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
      await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
      await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    }
    const qIds = [questionAId, questionBId].filter(Boolean);
    if (qIds.length > 0) {
      await prisma.question.deleteMany({ where: { id: { in: qIds } } });
    }
    if (chId) {
      await prisma.chapter.deleteMany({ where: { id: chId } });
    }
    if (bookId) {
      await prisma.book.deleteMany({ where: { id: bookId } });
    }
    const userIds = [teacherA?.id, teacherB?.id, adminUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  describe("1. Paper Ownership: Teacher A attempting to mutate Teacher B's paper", () => {
    it("returns HTTP 403 Forbidden when Teacher A attempts to PATCH Teacher B's paper", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/papers/${paperB_draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Tampered Title" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperB_draftId }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Only the paper creator, Department Head (HOD), or Administrator");
    });

    it("returns HTTP 403 Forbidden when Teacher A attempts to DELETE Teacher B's paper", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/papers/${paperB_draftId}`, { method: "DELETE" });
      const res = await deletePaper(req, { params: Promise.resolve({ id: paperB_draftId }) });
      expect(res.status).toBe(403);
    });

    it("returns HTTP 403 Forbidden when Teacher A attempts to add questions to Teacher B's paper", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/papers/${paperB_draftId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, questionId: questionAId }),
      });
      const res = await postPaperQuestion(req, { params: Promise.resolve({ id: paperB_draftId }) });
      expect(res.status).toBe(403);
    });

    it("returns HTTP 403 Forbidden when Teacher A attempts to autofill Teacher B's paper", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/papers/${paperB_draftId}/autofill`, { method: "POST" });
      const res = await postPaperAutofill(req, { params: Promise.resolve({ id: paperB_draftId }) });
      expect(res.status).toBe(403);
    });
  });

  describe("2. Finalized Papers: Teacher attempting to mutate or unlock FINAL paper", () => {
    it("returns HTTP 403 Forbidden when author Teacher A attempts to PATCH their own FINAL paper", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/papers/${paperA_finalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Modified Final Title" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperA_finalId }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("finalized");
    });

    it("returns HTTP 403 Forbidden when author Teacher A attempts to unlock (status: DRAFT) their own FINAL paper", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/papers/${paperA_finalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperA_finalId }) });
      expect(res.status).toBe(403);
    });

    it("returns HTTP 403 Forbidden when author Teacher A attempts to DELETE their own FINAL paper", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/papers/${paperA_finalId}`, { method: "DELETE" });
      const res = await deletePaper(req, { params: Promise.resolve({ id: paperA_finalId }) });
      expect(res.status).toBe(403);
    });

    it("returns HTTP 403 Forbidden when author Teacher A attempts to add questions to a FINAL paper", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/papers/${paperA_finalId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, questionId: questionAId }),
      });
      const res = await postPaperQuestion(req, { params: Promise.resolve({ id: paperA_finalId }) });
      expect(res.status).toBe(403);
    });
  });

  describe("3. Administrative Unlock & Deletion: Admin unlocking or deleting FINAL paper", () => {
    it("allows Admin to unlock a FINAL paper by setting status: DRAFT with HTTP 200", async () => {
      mockSessionUserId = adminUser.id;
      const req = new Request(`http://localhost/api/papers/${paperA_finalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperA_finalId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("DRAFT");

      // Verify in DB
      const updated = await prisma.paper.findUnique({ where: { id: paperA_finalId } });
      expect(updated?.status).toBe("DRAFT");
    });

    it("allows Admin to directly DELETE a FINAL paper with HTTP 200", async () => {
      const pFinal = await prisma.paper.create({
        data: {
          title: `Direct Delete Final Paper ${testStamp}`,
          blueprintId,
          layout: "BOOKLET",
          schoolName: "Sarvodaya Lakhnadon",
          status: "FINAL",
          createdById: teacherA.id,
        },
      });
      mockSessionUserId = adminUser.id;
      const req = new Request(`http://localhost/api/papers/${pFinal.id}`, { method: "DELETE" });
      const res = await deletePaper(req, { params: Promise.resolve({ id: pFinal.id }) });
      expect(res.status).toBe(200);
      const exists = await prisma.paper.findUnique({ where: { id: pFinal.id } });
      expect(exists).toBeNull();
    });
  });

  describe("4. Question Ownership: Teacher attempting to mutate another teacher's question", () => {
    it("returns HTTP 403 Forbidden when Teacher A attempts to PATCH Teacher B's question", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/questions/${questionBId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Tampered question text" }),
      });
      const res = await patchQuestion(req, { params: Promise.resolve({ id: questionBId }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Forbidden: You can only edit or delete your own questions.");
    });

    it("returns HTTP 403 Forbidden when Teacher A attempts to PUT Teacher B's question", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/questions/${questionBId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          chapterId: chId,
          type: "SHORT",
          text: "Tampered full question",
          answer: "Tampered Answer",
          difficulty: "HARD",
        }),
      });
      const res = await putQuestion(req, { params: Promise.resolve({ id: questionBId }) });
      expect(res.status).toBe(403);
    });

    it("returns HTTP 403 Forbidden when Teacher A attempts to DELETE Teacher B's question", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request(`http://localhost/api/questions/${questionBId}`, { method: "DELETE" });
      const res = await deleteQuestion(req, { params: Promise.resolve({ id: questionBId }) });
      expect(res.status).toBe(403);
    });

    it("allows Teacher B to PATCH their own question with HTTP 200", async () => {
      mockSessionUserId = teacherB.id;
      const req = new Request(`http://localhost/api/questions/${questionBId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Teacher B legitimately updated text" }),
      });
      const res = await patchQuestion(req, { params: Promise.resolve({ id: questionBId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.text).toBe("Teacher B legitimately updated text");
    });

    it("allows Admin to PATCH Teacher B's question with HTTP 200", async () => {
      mockSessionUserId = adminUser.id;
      const req = new Request(`http://localhost/api/questions/${questionBId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Admin reviewed text" }),
      });
      const res = await patchQuestion(req, { params: Promise.resolve({ id: questionBId }) });
      expect(res.status).toBe(200);
    });
  });

  describe("5. Admin-Only Routes: Teacher attempting to access global administrative routes", () => {
    it("returns HTTP 403 Forbidden when Teacher A calls POST /api/classes", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Class-RBAC-${testStamp}`, sections: ["A"] }),
      });
      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Insufficient permissions for this action");
    });

    it("returns HTTP 403 Forbidden when Teacher A calls POST /api/academic-rollover", async () => {
      mockSessionUserId = teacherA.id;
      const req = new Request("http://localhost/api/academic-rollover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSession: "2025–26",
          targetSession: "2026–27",
          includeClasses: true,
        }),
      });
      const res = await postRollover(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Insufficient permissions for this action");
    });

    it("allows Admin to call POST /api/classes with HTTP 200", async () => {
      mockSessionUserId = adminUser.id;
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Class-RBAC-${testStamp}`,
          stream: "General",
          academicSession: "2025–26",
          sections: ["A"],
        }),
      });
      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
    });
  });

  describe("6. Session Auth Guard: Unauthenticated requests return HTTP 401", () => {
    it("returns HTTP 401 when unauthenticated user attempts to PATCH a paper", async () => {
      mockSessionUserId = null;
      const req = new Request(`http://localhost/api/papers/${paperA_draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Unauthenticated Tamper" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperA_draftId }) });
      expect(res.status).toBe(401);
    });
  });
});
