import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// 1. Session Mocking for RBAC
let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

// 2. Route Handler Imports
import { DELETE as deleteBulkQuestions } from "@/app/api/questions/bulk/route";
import { POST as bulkUpdateDifficulty } from "@/app/api/questions/bulk-difficulty/route";
import { POST as commitAiSection } from "@/app/api/papers/[id]/ai-commit-section/route";
import { PATCH as patchPaper } from "@/app/api/papers/[id]/route";
import { GET as exportDocx } from "@/app/api/papers/[id]/export-docx/route";
import { POST as addQuestionToPaper } from "@/app/api/papers/[id]/questions/route";
import { PATCH as patchPaperQuestion } from "@/app/api/papers/[id]/questions/[itemId]/route";
import { prisma } from "./prisma";
import { assertCanModifyPaper } from "./papers";
import { HttpError } from "./api";

describe("Phase 2 Defect Fixes Regression Suite (API & Route Integration)", () => {
  const testStamp = Date.now();
  let teacherUser: { id: string; email: string; role: string };
  let otherTeacherUser: { id: string; email: string; role: string };
  let hodUser: { id: string; email: string; role: string };
  let adminUser: { id: string; email: string; role: string };

  let bookId: string;
  let ch1Id: string;
  let blueprintId: string;
  let section1Id: string;
  let paperId: string;

  beforeAll(async () => {
    // Create Users with distinct RBAC roles
    teacherUser = await prisma.user.create({
      data: {
        name: `Teacher ${testStamp}`,
        email: `t-${testStamp}@test.internal`,
        passwordHash: "hash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });
    otherTeacherUser = await prisma.user.create({
      data: {
        name: `Other ${testStamp}`,
        email: `o-${testStamp}@test.internal`,
        passwordHash: "hash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });
    hodUser = await prisma.user.create({
      data: {
        name: `HOD ${testStamp}`,
        email: `h-${testStamp}@test.internal`,
        passwordHash: "hash",
        role: "HOD",
        department: "Science",
        active: true,
      },
    });
    adminUser = await prisma.user.create({
      data: {
        name: `Admin ${testStamp}`,
        email: `a-${testStamp}@test.internal`,
        passwordHash: "hash",
        role: "ADMIN",
        department: "Admin",
        active: true,
      },
    });

    // Create Book & Chapter
    const book = await prisma.book.create({
      data: {
        title: `Physics Integration ${testStamp}`,
        subject: "Physics",
        className: "Class 12",
        academicSession: "2026–27",
      },
    });
    bookId = book.id;

    const ch = await prisma.chapter.create({
      data: { bookId, number: 1, title: "Electromagnetism" },
    });
    ch1Id = ch.id;

    // Create Blueprint
    const bp = await prisma.blueprint.create({
      data: {
        name: `Regression BP ${testStamp}`,
        bookId,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 180,
        chapters: { create: [{ chapterId: ch1Id, marks: 10 }] },
        sections: {
          create: [
            {
              position: 1,
              title: "Short Answer",
              instructions: "Answer all",
              type: "SHORT",
              count: 5,
              marksEach: 2,
            },
          ],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    section1Id = bp.sections[0].id;

    // Create Draft Paper
    const p = await prisma.paper.create({
      data: {
        title: `Regression Paper ${testStamp}`,
        blueprintId,
        layout: "BOOKLET_A4",
        schoolName: "Test Model School",
        academicSession: "2026–27",
        createdById: teacherUser.id,
        targetPages: 2,
        status: "DRAFT",
      },
    });
    paperId = p.id;
  });

  afterAll(async () => {
    try {
      await prisma.paperQuestion.deleteMany({ where: { paperId } });
      await prisma.paper.deleteMany({ where: { id: paperId } });
      await prisma.question.deleteMany({ where: { bookId } });
      await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
      await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
      await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
      await prisma.chapter.deleteMany({ where: { bookId } });
      await prisma.book.deleteMany({ where: { id: bookId } });
      await prisma.auditLog.deleteMany({
        where: { userId: { in: [teacherUser.id, otherTeacherUser.id, hodUser.id, adminUser.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [teacherUser.id, otherTeacherUser.id, hodUser.id, adminUser.id] } },
      });
    } catch (e) {
      console.error("Cleanup error in afterAll:", e);
    }
  });

  // AREA 1: Bulk Delete Atomicity
  describe("DEF-A03: Bulk Delete Atomicity (DELETE /api/questions/bulk)", () => {
    it("deletes multiple questions in an atomic batch and returns verified deletedCount", async () => {
      mockSessionUserId = teacherUser.id;
      const q1 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "BD-1", createdById: teacherUser.id },
      });
      const q2 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "BD-2", createdById: teacherUser.id },
      });

      const req = new Request("http://localhost/api/questions/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [q1.id, q2.id] }),
      });
      const res = await deleteBulkQuestions(req, { params: Promise.resolve({}) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(2);

      const check = await prisma.question.findMany({ where: { id: { in: [q1.id, q2.id] } } });
      expect(check).toHaveLength(0);
    });

    it("rolls back entirely (deletes 0 questions) if any question is linked to an exam paper", async () => {
      mockSessionUserId = teacherUser.id;
      const qA = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "BD-A", createdById: teacherUser.id },
      });
      const qB = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "BD-B", createdById: teacherUser.id },
      });

      const pq = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: qB.id, position: 0 },
      });

      const req = new Request("http://localhost/api/questions/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [qA.id, qB.id] }),
      });
      const res = await deleteBulkQuestions(req, { params: Promise.resolve({}) });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain("used in exam paper");

      // Critical atomic rollback assertion: qA must NOT have been deleted
      const checkQA = await prisma.question.findUnique({ where: { id: qA.id } });
      expect(checkQA).not.toBeNull();

      // Cleanup
      await prisma.paperQuestion.delete({ where: { id: pq.id } });
      await prisma.question.deleteMany({ where: { id: { in: [qA.id, qB.id] } } });
    });

    it("rejects deletion with 403 when user does not own all questions and is not elevated", async () => {
      mockSessionUserId = teacherUser.id;
      const qOther = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Other-Q", createdById: otherTeacherUser.id },
      });

      const req = new Request("http://localhost/api/questions/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [qOther.id] }),
      });
      const res = await deleteBulkQuestions(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);

      await prisma.question.delete({ where: { id: qOther.id } });
    });
  });

  // AREA 2: Bulk-Difficulty Verified Counts
  describe("DEF-S02: Bulk-Difficulty Verified Counts (POST /api/questions/bulk-difficulty)", () => {
    it("returns verified updatedCount reflecting actual rows modified in the database", async () => {
      mockSessionUserId = teacherUser.id;
      const q1 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Diff-1", difficulty: "EASY", createdById: teacherUser.id },
      });
      const q2 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Diff-2", difficulty: "EASY", createdById: teacherUser.id },
      });

      const req = new Request("http://localhost/api/questions/bulk-difficulty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [q1.id, q2.id, "phantom-id-999"], difficulty: "HARD" }),
      });
      const res = await bulkUpdateDifficulty(req, { params: Promise.resolve({}) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(2);
      expect(data.count).toBe(2);

      const updated = await prisma.question.findMany({ where: { id: { in: [q1.id, q2.id] } } });
      expect(updated.every((q) => q.difficulty === "HARD")).toBe(true);

      await prisma.question.deleteMany({ where: { id: { in: [q1.id, q2.id] } } });
    });

    it("rejects bulk difficulty modification with 409 if any question is part of a FINAL paper", async () => {
      mockSessionUserId = teacherUser.id;
      const qFinal = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Locked-Q", difficulty: "EASY", createdById: teacherUser.id },
      });
      const pq = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: qFinal.id, position: 0 },
      });
      await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL" } });

      const req = new Request("http://localhost/api/questions/bulk-difficulty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [qFinal.id], difficulty: "HARD" }),
      });
      const res = await bulkUpdateDifficulty(req, { params: Promise.resolve({}) });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain("Cannot edit questions that are part of finalised exam paper");

      // Reset
      await prisma.paper.update({ where: { id: paperId }, data: { status: "DRAFT" } });
      await prisma.paperQuestion.delete({ where: { id: pq.id } });
      await prisma.question.delete({ where: { id: qFinal.id } });
    });

    it("rejects bulk difficulty modification with 403 when non-elevated user touches other authors questions", async () => {
      mockSessionUserId = teacherUser.id;
      const qOther = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Other-Author-Q", difficulty: "EASY", createdById: otherTeacherUser.id },
      });

      const req = new Request("http://localhost/api/questions/bulk-difficulty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [qOther.id], difficulty: "HARD" }),
      });
      const res = await bulkUpdateDifficulty(req, { params: Promise.resolve({}) });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain("You do not have permission to modify questions authored by other users");

      await prisma.question.delete({ where: { id: qOther.id } });
    });

    it("allows elevated users (HOD / Admin) to update difficulty for questions authored by others", async () => {
      mockSessionUserId = hodUser.id;
      const qOther = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Other-Author-Q", difficulty: "EASY", createdById: otherTeacherUser.id },
      });

      const req = new Request("http://localhost/api/questions/bulk-difficulty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [qOther.id], difficulty: "MEDIUM" }),
      });
      const res = await bulkUpdateDifficulty(req, { params: Promise.resolve({}) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(1);

      const refreshed = await prisma.question.findUnique({ where: { id: qOther.id } });
      expect(refreshed?.difficulty).toBe("MEDIUM");

      await prisma.question.delete({ where: { id: qOther.id } });
    });
  });

  // AREA 3: AI Commit Section Persistence
  describe("DEF-D01: AI Commit Section Persistence (POST /api/papers/[id]/ai-commit-section)", () => {
    it("persists cognitiveLevel, explanation, and figureScene into Question model", async () => {
      mockSessionUserId = teacherUser.id;
      const req = new Request(`http://localhost/api/papers/${paperId}/ai-commit-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: section1Id,
          questions: [
            {
              slotIndex: 0,
              chapterId: ch1Id,
              type: "SHORT",
              text: "Explain Faraday's Law of induction.",
              answer: "Induced EMF is proportional to negative time rate of magnetic flux change.",
              difficulty: "MEDIUM",
              cognitiveLevel: "UNDERSTAND",
              explanation: "Foundational rule for generators and inductors.",
              figureScene: { version: 1, elements: [{ id: "solenoid", type: "path" }] },
              imagePath: "faraday.png",
            },
          ],
        }),
      });

      const res = await commitAiSection(req, { params: Promise.resolve({ id: paperId }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.addedCount).toBe(1);

      const saved = await prisma.paperQuestion.findFirst({
        where: { paperId, sectionId: section1Id },
        include: { question: true },
      });
      expect(saved).not.toBeNull();
      expect(saved?.question.cognitiveLevel).toBe("UNDERSTAND");
      expect(saved?.question.explanation).toBe("Foundational rule for generators and inductors.");
      expect(saved?.question.figureScene).toContain("solenoid");
      expect(saved?.question.imagePath).toBe("faraday.png");

      // Cleanup
      await prisma.paperQuestion.delete({ where: { id: saved!.id } });
      await prisma.question.delete({ where: { id: saved!.questionId } });
    });
  });

  // AREA 4: Print PATCH Guard on FINAL Papers
  describe("DEF-F04: Print PATCH Guard on FINAL Papers (PATCH /api/papers/[id])", () => {
    it("assertCanModifyPaper and PATCH route reject modification with 403 on FINAL paper for TEACHER", async () => {
      await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL", targetPages: 2 } });
      mockSessionUserId = teacherUser.id;

      // Unit guard check
      expect(() => assertCanModifyPaper(teacherUser as any, { createdById: teacherUser.id, status: "FINAL" }))
        .toThrowError(HttpError);

      // Route check
      const req = new Request(`http://localhost/api/papers/${paperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPages: 4 }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperId }) });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain("Cannot modify or delete a finalized paper. Only an Administrator can unlock it.");

      const dbPaper = await prisma.paper.findUnique({ where: { id: paperId } });
      expect(dbPaper?.targetPages).toBe(2);

      // Reset
      await prisma.paper.update({ where: { id: paperId }, data: { status: "DRAFT" } });
    });

    it("assertCanModifyPaper and PATCH route reject modification with 403 on FINAL paper for HOD", async () => {
      await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL", targetPages: 2 } });
      mockSessionUserId = hodUser.id;

      // Unit guard check
      expect(() => assertCanModifyPaper(hodUser as any, { createdById: teacherUser.id, status: "FINAL" }))
        .toThrowError(HttpError);

      // Route check
      const req = new Request(`http://localhost/api/papers/${paperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPages: 6 }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperId }) });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain("Cannot modify or delete a finalized paper. Only an Administrator can unlock it.");

      // Reset
      await prisma.paper.update({ where: { id: paperId }, data: { status: "DRAFT" } });
    });

    it("allows ADMIN to modify and unlock a FINAL paper", async () => {
      await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL", targetPages: 2 } });
      mockSessionUserId = adminUser.id;

      // Unit guard check: Admin does not throw
      expect(() => assertCanModifyPaper(adminUser as any, { createdById: teacherUser.id, status: "FINAL" }))
        .not.toThrow();

      // Route check: Admin unlocks paper back to DRAFT
      const req = new Request(`http://localhost/api/papers/${paperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT", targetPages: 5 }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperId }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("DRAFT");
      expect(data.targetPages).toBe(5);

      const dbPaper = await prisma.paper.findUnique({ where: { id: paperId } });
      expect(dbPaper?.status).toBe("DRAFT");
      expect(dbPaper?.targetPages).toBe(5);
    });

    it("allows targetPages modification when paper is in DRAFT status", async () => {
      mockSessionUserId = teacherUser.id;
      const req = new Request(`http://localhost/api/papers/${paperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPages: 3 }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperId }) });
      expect(res.status).toBe(200);

      const dbPaper = await prisma.paper.findUnique({ where: { id: paperId } });
      expect(dbPaper?.targetPages).toBe(3);
    });
  });

  // AREA 5: Export Error Handling
  describe("DEF-S01 & DEF-P02: Export Error Handling (GET /api/papers/[id]/export-docx)", () => {
    it("returns HTTP 404 with structured JSON error (not binary file) when paper does not exist", async () => {
      mockSessionUserId = teacherUser.id;
      const req = new Request("http://localhost/api/papers/ghost-paper-id/export-docx");
      const res = await exportDocx(req, { params: Promise.resolve({ id: "ghost-paper-id" }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Paper not found");
      expect(res.headers.get("Content-Type")).toContain("application/json");
    });

    it("returns HTTP 401 JSON when unauthenticated", async () => {
      mockSessionUserId = null;
      const req = new Request(`http://localhost/api/papers/${paperId}/export-docx`);
      const res = await exportDocx(req, { params: Promise.resolve({ id: paperId }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Not signed in");
      expect(res.headers.get("Content-Type")).toContain("application/json");
    });

    it("returns binary DOCX attachment with valid PK zip magic header when valid", async () => {
      mockSessionUserId = teacherUser.id;
      const req = new Request(`http://localhost/api/papers/${paperId}/export-docx`);
      const res = await exportDocx(req, { params: Promise.resolve({ id: paperId }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");

      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Valid DOCX starts with PK\x03\x04
      expect(bytes[0]).toBe(0x50);
      expect(bytes[1]).toBe(0x4b);
      expect(bytes[2]).toBe(0x03);
      expect(bytes[3]).toBe(0x04);
    });
  });

  // AREA 6: Duplicate Add-to-Slot and Reorder Protection
  describe("DEF-A01 & DEF-A02: Duplicate Add-to-Slot and Reorder Protection", () => {
    it("rejects duplicate addition of the same question to a paper with 409 Conflict", async () => {
      mockSessionUserId = teacherUser.id;
      const q = await prisma.question.create({
        data: {
          bookId,
          chapterId: ch1Id,
          type: "SHORT",
          text: "Duplicate test question",
          createdById: teacherUser.id,
        },
      });

      // First addition succeeds
      const req1 = new Request(`http://localhost/api/papers/${paperId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: section1Id, questionId: q.id }),
      });
      const res1 = await addQuestionToPaper(req1, { params: Promise.resolve({ id: paperId }) });
      expect(res1.status).toBe(200);

      // Second addition of identical question is rejected by route guard with 409
      const req2 = new Request(`http://localhost/api/papers/${paperId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: section1Id, questionId: q.id }),
      });
      const res2 = await addQuestionToPaper(req2, { params: Promise.resolve({ id: paperId }) });
      const data2 = await res2.json();

      expect(res2.status).toBe(409);
      expect(data2.error).toContain("This question is already in the paper");

      // Database unique constraint test: directly inserting duplicate fails @@unique([paperId, questionId])
      await expect(
        prisma.paperQuestion.create({
          data: { paperId, sectionId: section1Id, questionId: q.id, position: 99 },
        }),
      ).rejects.toThrow();

      // Cleanup
      await prisma.paperQuestion.deleteMany({ where: { paperId, questionId: q.id } });
      await prisma.question.delete({ where: { id: q.id } });
    });

    it("reorders questions atomically using direction up/down and respects boundaries", async () => {
      mockSessionUserId = teacherUser.id;
      const q1 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Pos-0", createdById: teacherUser.id },
      });
      const q2 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Pos-1", createdById: teacherUser.id },
      });

      const item1 = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: q1.id, position: 0 },
      });
      const item2 = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: q2.id, position: 1 },
      });

      // Move item2 up (swapping with item1)
      const reqUp = new Request(`http://localhost/api/papers/${paperId}/questions/${item2.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "up" }),
      });
      const resUp = await patchPaperQuestion(reqUp, { params: Promise.resolve({ id: paperId, itemId: item2.id }) });
      expect(resUp.status).toBe(200);

      const refreshed1 = await prisma.paperQuestion.findUnique({ where: { id: item1.id } });
      const refreshed2 = await prisma.paperQuestion.findUnique({ where: { id: item2.id } });

      expect(refreshed2?.position).toBe(0);
      expect(refreshed1?.position).toBe(1);

      // Boundary check: moving item2 up again is a safe no-op
      const resBoundary = await patchPaperQuestion(reqUp, { params: Promise.resolve({ id: paperId, itemId: item2.id }) });
      expect(resBoundary.status).toBe(200);
      const afterBoundary = await prisma.paperQuestion.findUnique({ where: { id: item2.id } });
      expect(afterBoundary?.position).toBe(0);

      // Move item2 down (swapping back)
      const reqDown = new Request(`http://localhost/api/papers/${paperId}/questions/${item2.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "down" }),
      });
      const resDown = await patchPaperQuestion(reqDown, { params: Promise.resolve({ id: paperId, itemId: item2.id }) });
      expect(resDown.status).toBe(200);

      const refreshedDown1 = await prisma.paperQuestion.findUnique({ where: { id: item1.id } });
      const refreshedDown2 = await prisma.paperQuestion.findUnique({ where: { id: item2.id } });
      expect(refreshedDown2?.position).toBe(1);
      expect(refreshedDown1?.position).toBe(0);

      // Cleanup
      await prisma.paperQuestion.deleteMany({ where: { id: { in: [item1.id, item2.id] } } });
      await prisma.question.deleteMany({ where: { id: { in: [q1.id, q2.id] } } });
    });
  });
});
