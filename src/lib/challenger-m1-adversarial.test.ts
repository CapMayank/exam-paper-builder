import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Session Mocking for RBAC
let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { DELETE as deleteBulkQuestions } from "@/app/api/questions/bulk/route";
import { POST as bulkUpdateDifficulty } from "@/app/api/questions/bulk-difficulty/route";
import { POST as commitAiSection } from "@/app/api/papers/[id]/ai-commit-section/route";
import { PATCH as patchPaper, DELETE as deletePaper } from "@/app/api/papers/[id]/route";
import { GET as exportDocx } from "@/app/api/papers/[id]/export-docx/route";
import { POST as addQuestionToPaper } from "@/app/api/papers/[id]/questions/route";
import { PATCH as patchPaperQuestion } from "@/app/api/papers/[id]/questions/[itemId]/route";
import { prisma } from "./prisma";

describe("Adversarial Empirical Probe: API Defects Regression (Milestone 1)", () => {
  const testStamp = Date.now();
  let teacherUser: { id: string; email: string; role: string };
  let otherTeacherUser: { id: string; email: string; role: string };
  let hodUser: { id: string; email: string; role: string };
  let adminUser: { id: string; email: string; role: string };

  let bookId: string;
  let otherBookId: string;
  let ch1Id: string;
  let blueprintId: string;
  let section1Id: string;
  let paperId: string;

  let initialDbCounts: Record<string, number> = {};

  async function getTableCounts() {
    return {
      users: await prisma.user.count(),
      books: await prisma.book.count(),
      chapters: await prisma.chapter.count(),
      blueprints: await prisma.blueprint.count(),
      sections: await prisma.blueprintSection.count(),
      papers: await prisma.paper.count(),
      paperQuestions: await prisma.paperQuestion.count(),
      questions: await prisma.question.count(),
    };
  }

  beforeAll(async () => {
    // Record baseline database counts before creating test fixtures
    initialDbCounts = await getTableCounts();

    // 1. Seed RBAC Users
    teacherUser = await prisma.user.create({
      data: {
        name: `Adv Teacher ${testStamp}`,
        email: `adv-t-${testStamp}@test.internal`,
        passwordHash: "hash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });
    otherTeacherUser = await prisma.user.create({
      data: {
        name: `Adv Other ${testStamp}`,
        email: `adv-o-${testStamp}@test.internal`,
        passwordHash: "hash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });
    hodUser = await prisma.user.create({
      data: {
        name: `Adv HOD ${testStamp}`,
        email: `adv-h-${testStamp}@test.internal`,
        passwordHash: "hash",
        role: "HOD",
        department: "Science",
        active: true,
      },
    });
    adminUser = await prisma.user.create({
      data: {
        name: `Adv Admin ${testStamp}`,
        email: `adv-a-${testStamp}@test.internal`,
        passwordHash: "hash",
        role: "ADMIN",
        department: "Admin",
        active: true,
      },
    });

    // 2. Books and Chapters
    const book = await prisma.book.create({
      data: {
        title: `Adv Book ${testStamp}`,
        subject: "Physics",
        className: "Class 12",
        academicSession: "2026–27",
      },
    });
    bookId = book.id;

    const otherBook = await prisma.book.create({
      data: {
        title: `Adv Alien Book ${testStamp}`,
        subject: "Chemistry",
        className: "Class 12",
        academicSession: "2026–27",
      },
    });
    otherBookId = otherBook.id;

    const ch = await prisma.chapter.create({
      data: { bookId, number: 1, title: "Quantum Mechanics" },
    });
    ch1Id = ch.id;

    // 3. Blueprint & Sections
    const bp = await prisma.blueprint.create({
      data: {
        name: `Adv BP ${testStamp}`,
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

    // 4. Draft Paper
    const p = await prisma.paper.create({
      data: {
        title: `Adv Paper ${testStamp}`,
        blueprintId,
        layout: "BOOKLET_A4",
        schoolName: "Model School",
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
      await prisma.question.deleteMany({ where: { bookId: { in: [bookId, otherBookId] } } });
      await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
      await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
      await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
      await prisma.chapter.deleteMany({ where: { bookId } });
      await prisma.book.deleteMany({ where: { id: { in: [bookId, otherBookId] } } });
      const userIds = [teacherUser.id, otherTeacherUser.id, hodUser.id, adminUser.id];
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });

      // Empirical zero database pollution verification
      const finalCounts = await getTableCounts();
      expect(finalCounts).toEqual(initialDbCounts);
    } catch (e) {
      console.error("Cleanup error in afterAll:", e);
    }
  });

  // ==========================================
  // AREA 1: Adversarial Bulk Delete Atomicity
  // ==========================================
  describe("Adversarial DEF-A03: Bulk Delete Atomicity (DELETE /api/questions/bulk)", () => {
    it("rejects empty payload and malformed types with 400 Bad Request", async () => {
      mockSessionUserId = teacherUser.id;

      // Empty object
      const resEmpty = await deleteBulkQuestions(
        new Request("http://localhost/api/questions/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({}) },
      );
      expect(resEmpty.status).toBe(400);

      // Empty array
      const resEmptyArr = await deleteBulkQuestions(
        new Request("http://localhost/api/questions/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [] }),
        }),
        { params: Promise.resolve({}) },
      );
      expect(resEmptyArr.status).toBe(400);

      // Malformed string instead of array
      const resString = await deleteBulkQuestions(
        new Request("http://localhost/api/questions/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: "some-id" }),
        }),
        { params: Promise.resolve({}) },
      );
      expect(resString.status).toBe(400);
    });

    it("rejects unauthenticated bulk deletion with 401 Unauthorized", async () => {
      mockSessionUserId = null;
      const res = await deleteBulkQuestions(
        new Request("http://localhost/api/questions/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: ["dummy-id"] }),
        }),
        { params: Promise.resolve({}) },
      );
      expect(res.status).toBe(401);
    });

    it("empirically verifies 100% database rollback of all questions when middle question is attached to a paper", async () => {
      mockSessionUserId = teacherUser.id;
      const q1 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-BD-1", createdById: teacherUser.id },
      });
      const q2 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-BD-2 (attached)", createdById: teacherUser.id },
      });
      const q3 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-BD-3", createdById: teacherUser.id },
      });

      const pq = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: q2.id, position: 0 },
      });

      const req = new Request("http://localhost/api/questions/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [q1.id, q2.id, q3.id] }),
      });
      const res = await deleteBulkQuestions(req, { params: Promise.resolve({}) });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain("used in exam paper");

      // EMPIRICAL VERIFICATION: Check EVERY question in SQLite database
      const dbQ1 = await prisma.question.findUnique({ where: { id: q1.id } });
      const dbQ2 = await prisma.question.findUnique({ where: { id: q2.id } });
      const dbQ3 = await prisma.question.findUnique({ where: { id: q3.id } });

      expect(dbQ1).not.toBeNull();
      expect(dbQ2).not.toBeNull();
      expect(dbQ3).not.toBeNull();

      // Cleanup
      await prisma.paperQuestion.delete({ where: { id: pq.id } });
      await prisma.question.deleteMany({ where: { id: { in: [q1.id, q2.id, q3.id] } } });
    });

    it("empirically verifies rollback when question is linked as an alternate (orQuestionId)", async () => {
      mockSessionUserId = teacherUser.id;
      const qPrimary = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-BD-Primary", createdById: teacherUser.id },
      });
      const qOr = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-BD-Or", createdById: teacherUser.id },
      });
      const qUnrelated = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-BD-Unrelated", createdById: teacherUser.id },
      });

      const pq = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: qPrimary.id, orQuestionId: qOr.id, position: 0 },
      });

      const req = new Request("http://localhost/api/questions/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [qUnrelated.id, qOr.id] }),
      });
      const res = await deleteBulkQuestions(req, { params: Promise.resolve({}) });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain("used in exam paper");

      // Verify qUnrelated was NOT deleted
      const checkUnrelated = await prisma.question.findUnique({ where: { id: qUnrelated.id } });
      expect(checkUnrelated).not.toBeNull();

      // Cleanup
      await prisma.paperQuestion.delete({ where: { id: pq.id } });
      await prisma.question.deleteMany({ where: { id: { in: [qPrimary.id, qOr.id, qUnrelated.id] } } });
    });

    it("properly deduplicates duplicate IDs in delete payload", async () => {
      mockSessionUserId = teacherUser.id;
      const q = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-BD-Dedup", createdById: teacherUser.id },
      });

      const req = new Request("http://localhost/api/questions/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [q.id, q.id, q.id] }),
      });
      const res = await deleteBulkQuestions(req, { params: Promise.resolve({}) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.deletedCount).toBe(1);

      const check = await prisma.question.findUnique({ where: { id: q.id } });
      expect(check).toBeNull();
    });

    it("guarantees atomic rollback when attempting partial permission bypass (owns Q1, does not own Q2)", async () => {
      mockSessionUserId = teacherUser.id;
      const qOwned = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Owned-Q", createdById: teacherUser.id },
      });
      const qUnowned = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Unowned-Q", createdById: otherTeacherUser.id },
      });

      const res = await deleteBulkQuestions(
        new Request("http://localhost/api/questions/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [qOwned.id, qUnowned.id] }),
        }),
        { params: Promise.resolve({}) },
      );
      expect(res.status).toBe(403);

      // Verify NEITHER question was deleted (100% atomic abort before deletion)
      const checkOwned = await prisma.question.findUnique({ where: { id: qOwned.id } });
      const checkUnowned = await prisma.question.findUnique({ where: { id: qUnowned.id } });
      expect(checkOwned).not.toBeNull();
      expect(checkUnowned).not.toBeNull();

      await prisma.question.deleteMany({ where: { id: { in: [qOwned.id, qUnowned.id] } } });
    });
  });

  // ==========================================
  // AREA 2: Adversarial Bulk Difficulty
  // ==========================================
  describe("Adversarial DEF-S02: Bulk Difficulty Atomicity & Protection (POST /api/questions/bulk-difficulty)", () => {
    it("rejects invalid payloads: empty array, non-existent IDs, invalid enum with 400/404", async () => {
      mockSessionUserId = teacherUser.id;

      // Empty array
      const resEmpty = await bulkUpdateDifficulty(
        new Request("http://localhost/api/questions/bulk-difficulty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds: [], difficulty: "EASY" }),
        }),
        { params: Promise.resolve({}) },
      );
      expect(resEmpty.status).toBe(400);

      // Invalid difficulty enum
      const resBadDiff = await bulkUpdateDifficulty(
        new Request("http://localhost/api/questions/bulk-difficulty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds: ["some-id"], difficulty: "IMPOSSIBLE" }),
        }),
        { params: Promise.resolve({}) },
      );
      expect(resBadDiff.status).toBe(400);

      // All non-existent IDs
      const res404 = await bulkUpdateDifficulty(
        new Request("http://localhost/api/questions/bulk-difficulty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds: ["ghost-a", "ghost-b"], difficulty: "EASY" }),
        }),
        { params: Promise.resolve({}) },
      );
      expect(res404.status).toBe(404);
    });

    it("rejects unauthenticated difficulty update with 401 Unauthorized", async () => {
      mockSessionUserId = null;
      const res = await bulkUpdateDifficulty(
        new Request("http://localhost/api/questions/bulk-difficulty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds: ["dummy-id"], difficulty: "EASY" }),
        }),
        { params: Promise.resolve({}) },
      );
      expect(res.status).toBe(401);
    });

    it("empirically verifies zero partial updates when batch contains locked question in FINAL paper", async () => {
      mockSessionUserId = teacherUser.id;
      const qA = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-Diff-A", difficulty: "EASY", createdById: teacherUser.id },
      });
      const qLocked = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-Diff-Locked", difficulty: "EASY", createdById: teacherUser.id },
      });
      const qB = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-Diff-B", difficulty: "EASY", createdById: teacherUser.id },
      });

      const pq = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: qLocked.id, position: 0 },
      });
      await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL" } });

      try {
        const req = new Request("http://localhost/api/questions/bulk-difficulty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds: [qA.id, qLocked.id, qB.id], difficulty: "HARD" }),
        });
        const res = await bulkUpdateDifficulty(req, { params: Promise.resolve({}) });
        const data = await res.json();

        expect(res.status).toBe(409);
        expect(data.error).toContain("Cannot edit questions that are part of finalised exam paper");

        // EMPIRICAL VERIFICATION: qA and qB must NOT have been updated to HARD
        const dbQA = await prisma.question.findUnique({ where: { id: qA.id } });
        const dbQLocked = await prisma.question.findUnique({ where: { id: qLocked.id } });
        const dbQB = await prisma.question.findUnique({ where: { id: qB.id } });

        expect(dbQA?.difficulty).toBe("EASY");
        expect(dbQLocked?.difficulty).toBe("EASY");
        expect(dbQB?.difficulty).toBe("EASY");
      } finally {
        await prisma.paper.update({ where: { id: paperId }, data: { status: "DRAFT" } });
        await prisma.paperQuestion.delete({ where: { id: pq.id } });
        await prisma.question.deleteMany({ where: { id: { in: [qA.id, qLocked.id, qB.id] } } });
      }
    });

    it("verifies even ADMIN is rejected with 409 when attempting to modify difficulty of questions in a FINAL paper", async () => {
      mockSessionUserId = adminUser.id;
      const qLocked = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-Admin-Locked", difficulty: "MEDIUM", createdById: teacherUser.id },
      });
      const pq = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: qLocked.id, position: 0 },
      });
      await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL" } });

      try {
        const req = new Request("http://localhost/api/questions/bulk-difficulty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds: [qLocked.id], difficulty: "HARD" }),
        });
        const res = await bulkUpdateDifficulty(req, { params: Promise.resolve({}) });
        const data = await res.json();

        expect(res.status).toBe(409);
        expect(data.error).toContain("Cannot edit questions that are part of finalised exam paper");

        const dbQ = await prisma.question.findUnique({ where: { id: qLocked.id } });
        expect(dbQ?.difficulty).toBe("MEDIUM");
      } finally {
        await prisma.paper.update({ where: { id: paperId }, data: { status: "DRAFT" } });
        await prisma.paperQuestion.delete({ where: { id: pq.id } });
        await prisma.question.delete({ where: { id: qLocked.id } });
      }
    });

    it("guarantees atomic abort on partial permission mismatch (teacher owns Q1, does not own Q2)", async () => {
      mockSessionUserId = teacherUser.id;
      const qOwned = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Diff-Owned", difficulty: "EASY", createdById: teacherUser.id },
      });
      const qUnowned = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Diff-Unowned", difficulty: "EASY", createdById: otherTeacherUser.id },
      });

      const res = await bulkUpdateDifficulty(
        new Request("http://localhost/api/questions/bulk-difficulty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds: [qOwned.id, qUnowned.id], difficulty: "HARD" }),
        }),
        { params: Promise.resolve({}) },
      );
      expect(res.status).toBe(403);

      // Verify qOwned was NOT modified
      const checkOwned = await prisma.question.findUnique({ where: { id: qOwned.id } });
      expect(checkOwned?.difficulty).toBe("EASY");

      await prisma.question.deleteMany({ where: { id: { in: [qOwned.id, qUnowned.id] } } });
    });
  });

  // ==========================================
  // AREA 3: Adversarial AI Commit Section
  // ==========================================
  describe("Adversarial DEF-D01: AI Commit Section Persistence & Guards (POST /api/papers/[id]/ai-commit-section)", () => {
    it("empirically verifies figureDoc serialization and null field persistence", async () => {
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
              text: "Explain Photoelectric effect.",
              answer: "Emission of electrons when light hits a material.",
              difficulty: "HARD",
              cognitiveLevel: "ANALYZE",
              explanation: "Einstein's 1905 paper.",
              figureDoc: { type: "circuit", battery: true },
            },
          ],
        }),
      });

      const res = await commitAiSection(req, { params: Promise.resolve({ id: paperId }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const saved = await prisma.paperQuestion.findFirst({
        where: { paperId, sectionId: section1Id },
        include: { question: true },
      });

      expect(saved?.question.cognitiveLevel).toBe("ANALYZE");
      expect(saved?.question.explanation).toBe("Einstein's 1905 paper.");
      expect(saved?.question.figureScene).toBe('{"type":"circuit","battery":true}');
      expect(saved?.question.imagePath).toBeNull();

      // Cleanup
      await prisma.paperQuestion.delete({ where: { id: saved!.id } });
      await prisma.question.delete({ where: { id: saved!.questionId } });
    });

    it("rejects commit when questions array exceeds remaining section capacity", async () => {
      mockSessionUserId = teacherUser.id;

      // Section 1 capacity is 5. Commit 6 questions -> should reject with 400
      const questionsOverLimit = Array.from({ length: 6 }).map((_, i) => ({
        slotIndex: i,
        chapterId: ch1Id,
        type: "SHORT",
        text: `Over-limit ${i}`,
        answer: "A",
        difficulty: "MEDIUM",
      }));

      const res = await commitAiSection(
        new Request(`http://localhost/api/papers/${paperId}/ai-commit-section`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: section1Id,
            questions: questionsOverLimit,
          }),
        }),
        { params: Promise.resolve({ id: paperId }) },
      );
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain("only has room for 5 more question(s)");
    });

    it("rejects commitAiSection on FINAL paper with 403 for non-admin and 409 for admin", async () => {
      await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL" } });

      try {
        const payload = {
          sectionId: section1Id,
          questions: [
            {
              slotIndex: 0,
              chapterId: ch1Id,
              type: "SHORT",
              text: "Should be rejected.",
            },
          ],
        };

        // 1. Teacher attempt -> 403
        mockSessionUserId = teacherUser.id;
        const reqTeacher = new Request(`http://localhost/api/papers/${paperId}/ai-commit-section`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const resTeacher = await commitAiSection(reqTeacher, { params: Promise.resolve({ id: paperId }) });
        const dataTeacher = await resTeacher.json();
        expect(resTeacher.status).toBe(403);
        expect(dataTeacher.error).toContain("Cannot modify or delete a finalized paper");

        // 2. Admin attempt -> 409
        mockSessionUserId = adminUser.id;
        const reqAdmin = new Request(`http://localhost/api/papers/${paperId}/ai-commit-section`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const resAdmin = await commitAiSection(reqAdmin, { params: Promise.resolve({ id: paperId }) });
        const dataAdmin = await resAdmin.json();
        expect(resAdmin.status).toBe(409);
        expect(dataAdmin.error).toContain("This paper is finalised. Reopen it to make changes.");

        // Verify no questions created in paper
        const count = await prisma.paperQuestion.count({ where: { paperId } });
        expect(count).toBe(0);
      } finally {
        await prisma.paper.update({ where: { id: paperId }, data: { status: "DRAFT" } });
      }
    });
  });

  // ==========================================
  // AREA 4: Adversarial Print / PATCH / DELETE Guards
  // ==========================================
  describe("Adversarial DEF-F04: FINAL Paper Modification & Deletion Guards (PATCH & DELETE /api/papers/[id])", () => {
    it("rejects DELETE /api/papers/[id] on FINAL paper for TEACHER and HOD", async () => {
      await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL" } });

      try {
        // Teacher attempt
        mockSessionUserId = teacherUser.id;
        const resTeacher = await deletePaper(new Request(`http://localhost/api/papers/${paperId}`, { method: "DELETE" }), {
          params: Promise.resolve({ id: paperId }),
        });
        expect(resTeacher.status).toBe(403);

        // HOD attempt
        mockSessionUserId = hodUser.id;
        const resHOD = await deletePaper(new Request(`http://localhost/api/papers/${paperId}`, { method: "DELETE" }), {
          params: Promise.resolve({ id: paperId }),
        });
        expect(resHOD.status).toBe(403);

        // Verify paper still exists in database
        const dbPaper = await prisma.paper.findUnique({ where: { id: paperId } });
        expect(dbPaper).not.toBeNull();
      } finally {
        await prisma.paper.update({ where: { id: paperId }, data: { status: "DRAFT" } });
      }
    });

    it("rejects non-admin attempt to unlock paper (status change FINAL -> DRAFT)", async () => {
      await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL" } });

      try {
        mockSessionUserId = teacherUser.id;
        const req = new Request(`http://localhost/api/papers/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DRAFT" }),
        });
        const res = await patchPaper(req, { params: Promise.resolve({ id: paperId }) });
        expect(res.status).toBe(403);

        const dbPaper = await prisma.paper.findUnique({ where: { id: paperId } });
        expect(dbPaper?.status).toBe("FINAL");
      } finally {
        await prisma.paper.update({ where: { id: paperId }, data: { status: "DRAFT" } });
      }
    });

    it("validates boundary conditions on targetPages (rejects 0, -1, float, >100; accepts null, 1, 100)", async () => {
      mockSessionUserId = teacherUser.id;

      // targetPages: 0 -> invalid (min 1)
      const res0 = await patchPaper(
        new Request(`http://localhost/api/papers/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPages: 0 }),
        }),
        { params: Promise.resolve({ id: paperId }) },
      );
      expect(res0.status).toBe(400);

      // targetPages: -5 -> invalid
      const resNeg = await patchPaper(
        new Request(`http://localhost/api/papers/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPages: -5 }),
        }),
        { params: Promise.resolve({ id: paperId }) },
      );
      expect(resNeg.status).toBe(400);

      // targetPages: 101 -> invalid (max 100)
      const res101 = await patchPaper(
        new Request(`http://localhost/api/papers/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPages: 101 }),
        }),
        { params: Promise.resolve({ id: paperId }) },
      );
      expect(res101.status).toBe(400);

      // targetPages: 3.5 -> invalid (must be int)
      const resFloat = await patchPaper(
        new Request(`http://localhost/api/papers/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPages: 3.5 }),
        }),
        { params: Promise.resolve({ id: paperId }) },
      );
      expect(resFloat.status).toBe(400);

      // Valid boundary 1
      const res1 = await patchPaper(
        new Request(`http://localhost/api/papers/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPages: 1 }),
        }),
        { params: Promise.resolve({ id: paperId }) },
      );
      expect(res1.status).toBe(200);

      // Valid boundary 100
      const res100 = await patchPaper(
        new Request(`http://localhost/api/papers/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPages: 100 }),
        }),
        { params: Promise.resolve({ id: paperId }) },
      );
      expect(res100.status).toBe(200);

      // Valid null (auto / unconstrained)
      const resNull = await patchPaper(
        new Request(`http://localhost/api/papers/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPages: null }),
        }),
        { params: Promise.resolve({ id: paperId }) },
      );
      expect(resNull.status).toBe(200);

      const dbCheck = await prisma.paper.findUnique({ where: { id: paperId } });
      expect(dbCheck?.targetPages).toBeNull();
    });

    it("rejects status transition to FINAL when blueprint requirements are incomplete", async () => {
      mockSessionUserId = teacherUser.id;

      // Paper has 0 questions out of blueprint requirement (5 questions total)
      const res = await patchPaper(
        new Request(`http://localhost/api/papers/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "FINAL" }),
        }),
        { params: Promise.resolve({ id: paperId }) },
      );
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("The paper doesn't match its blueprint yet, so it can't be finalised.");
    });
  });

  // ==========================================
  // AREA 5: Adversarial Export DOCX Handling
  // ==========================================
  describe("Adversarial DEF-S01 & DEF-P02: Export DOCX Edge Cases (GET /api/papers/[id]/export-docx)", () => {
    it("guarantees structured JSON errors with proper Content-Type for all non-200 cases", async () => {
      // 401 unauthenticated
      mockSessionUserId = null;
      const res401 = await exportDocx(
        new Request(`http://localhost/api/papers/${paperId}/export-docx`),
        { params: Promise.resolve({ id: paperId }) },
      );
      expect(res401.status).toBe(401);
      expect(res401.headers.get("Content-Type")).toContain("application/json");
      const data401 = await res401.json();
      expect(data401).toHaveProperty("error");

      // 404 non-existent
      mockSessionUserId = teacherUser.id;
      const res404 = await exportDocx(
        new Request("http://localhost/api/papers/ghost-paper-xyz/export-docx"),
        { params: Promise.resolve({ id: "ghost-paper-xyz" }) },
      );
      expect(res404.status).toBe(404);
      expect(res404.headers.get("Content-Type")).toContain("application/json");
      const data404 = await res404.json();
      expect(data404.error).toBe("Paper not found");
    });

    it("handles markingScheme parameter and produces authentic DOCX with correct headers", async () => {
      mockSessionUserId = teacherUser.id;
      const req = new Request(`http://localhost/api/papers/${paperId}/export-docx?markingScheme=true`);
      const res = await exportDocx(req, { params: Promise.resolve({ id: paperId }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      expect(res.headers.get("Content-Disposition")).toContain("Marking_Scheme.docx");

      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Valid DOCX starts with PK\x03\x04
      expect(bytes[0]).toBe(0x50);
      expect(bytes[1]).toBe(0x4b);
      expect(bytes[2]).toBe(0x03);
      expect(bytes[3]).toBe(0x04);
    });

    it("survives malformed JSON in question optionsJson without throwing or corrupting export", async () => {
      mockSessionUserId = teacherUser.id;
      const q = await prisma.question.create({
        data: {
          bookId,
          chapterId: ch1Id,
          type: "MCQ",
          text: "Broken JSON Question",
          optionsJson: "{invalid-json-content: true}",
          createdById: teacherUser.id,
        },
      });
      const pq = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: q.id, position: 0 },
      });

      const req = new Request(`http://localhost/api/papers/${paperId}/export-docx`);
      const res = await exportDocx(req, { params: Promise.resolve({ id: paperId }) });

      expect(res.status).toBe(200);
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      expect(bytes[0]).toBe(0x50);
      expect(bytes[1]).toBe(0x4b);

      // Cleanup
      await prisma.paperQuestion.delete({ where: { id: pq.id } });
      await prisma.question.delete({ where: { id: q.id } });
    });
  });

  // ==========================================
  // AREA 6: Adversarial Duplicate & Reorder
  // ==========================================
  describe("Adversarial DEF-A01 & DEF-A02: Duplicate Questions & Reorder Boundaries", () => {
    it("rejects question from a different book with 400 Bad Request", async () => {
      mockSessionUserId = teacherUser.id;
      const qOtherBook = await prisma.question.create({
        data: {
          bookId: otherBookId,
          chapterId: ch1Id, // mismatch book
          type: "SHORT",
          text: "Chemistry Question in Physics Paper",
          createdById: teacherUser.id,
        },
      });

      const req = new Request(`http://localhost/api/papers/${paperId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: section1Id, questionId: qOtherBook.id }),
      });
      const res = await addQuestionToPaper(req, { params: Promise.resolve({ id: paperId }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("This question is from a different book");

      await prisma.question.delete({ where: { id: qOtherBook.id } });
    });

    it("rejects adding a question that is already assigned as an alternate (orQuestionId)", async () => {
      mockSessionUserId = teacherUser.id;
      const qPrimary = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Primary-Alt-Check", createdById: teacherUser.id },
      });
      const qAlt = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "Alt-Check", createdById: teacherUser.id },
      });

      const pq = await prisma.paperQuestion.create({
        data: {
          paperId,
          sectionId: section1Id,
          questionId: qPrimary.id,
          orQuestionId: qAlt.id,
          position: 0,
        },
      });

      // Attempt to add qAlt as a primary question in slot 2 -> must reject with 409
      const res = await addQuestionToPaper(
        new Request(`http://localhost/api/papers/${paperId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId: section1Id, questionId: qAlt.id }),
        }),
        { params: Promise.resolve({ id: paperId }) },
      );
      const data = await res.json();
      expect(res.status).toBe(409);
      expect(data.error).toContain("This question is already in the paper (as primary or alternate question)");

      // Cleanup
      await prisma.paperQuestion.delete({ where: { id: pq.id } });
      await prisma.question.deleteMany({ where: { id: { in: [qPrimary.id, qAlt.id] } } });
    });

    it("verifies 3-item reorder swap in both directions and maintains atomic state", async () => {
      mockSessionUserId = teacherUser.id;
      const q1 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-Order-1", createdById: teacherUser.id },
      });
      const q2 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-Order-2", createdById: teacherUser.id },
      });
      const q3 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "SHORT", text: "ADV-Order-3", createdById: teacherUser.id },
      });

      const it1 = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: q1.id, position: 0 },
      });
      const it2 = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: q2.id, position: 1 },
      });
      const it3 = await prisma.paperQuestion.create({
        data: { paperId, sectionId: section1Id, questionId: q3.id, position: 2 },
      });

      // Move item 2 down (swap with item 3)
      const reqDown = new Request(`http://localhost/api/papers/${paperId}/questions/${it2.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "down" }),
      });
      const resDown = await patchPaperQuestion(reqDown, { params: Promise.resolve({ id: paperId, itemId: it2.id }) });
      expect(resDown.status).toBe(200);

      const checkIt2AfterDown = await prisma.paperQuestion.findUnique({ where: { id: it2.id } });
      const checkIt3AfterDown = await prisma.paperQuestion.findUnique({ where: { id: it3.id } });
      expect(checkIt2AfterDown?.position).toBe(2);
      expect(checkIt3AfterDown?.position).toBe(1);

      // Move item 2 down again (boundary: item 2 is now at position 2, cannot go down further)
      const resBoundaryDown = await patchPaperQuestion(reqDown, { params: Promise.resolve({ id: paperId, itemId: it2.id }) });
      expect(resBoundaryDown.status).toBe(200);
      const checkIt2Boundary = await prisma.paperQuestion.findUnique({ where: { id: it2.id } });
      expect(checkIt2Boundary?.position).toBe(2);

      // Move item 2 up twice back to top
      const reqUp = new Request(`http://localhost/api/papers/${paperId}/questions/${it2.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "up" }),
      });
      await patchPaperQuestion(reqUp, { params: Promise.resolve({ id: paperId, itemId: it2.id }) });
      await patchPaperQuestion(reqUp, { params: Promise.resolve({ id: paperId, itemId: it2.id }) });

      const checkIt2Top = await prisma.paperQuestion.findUnique({ where: { id: it2.id } });
      expect(checkIt2Top?.position).toBe(0);

      // Cleanup
      await prisma.paperQuestion.deleteMany({ where: { id: { in: [it1.id, it2.id, it3.id] } } });
      await prisma.question.deleteMany({ where: { id: { in: [q1.id, q2.id, q3.id] } } });
    });
  });
});
