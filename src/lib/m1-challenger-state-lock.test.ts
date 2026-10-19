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
import {
  DELETE as deletePaperItem,
  PATCH as patchPaperItem,
  PUT as putPaperItem,
} from "../app/api/papers/[id]/questions/[itemId]/route";
import { POST as postPaperAutofill } from "../app/api/papers/[id]/autofill/route";
import { POST as postImportQuestions } from "../app/api/papers/[id]/import-questions/route";

describe("Milestone 1.2 Challenger Empirical State Machine & Finalized Lock Harness", () => {
  const testStamp = Date.now();

  let teacherAlice: { id: string };
  let teacherBob: { id: string };
  let adminCarol: { id: string };

  let bookId: string;
  let ch1Id: string;
  let ch2Id: string;
  let blueprintId: string;
  let sectionId: string;

  let q1Id: string;
  let q2Id: string;
  let q3Id: string;
  let qReplacementId: string;

  // Dedicated test paper fixtures for full test isolation
  let paperFinalUnlockId: string;
  let paperFinalDeleteId: string;
  let paperDirectDeleteId: string;
  let paperSubroutesFinalId: string;
  let paperSubroutesItemId: string;
  let paperLifecycleId: string;

  beforeAll(async () => {
    // 1. Users
    teacherAlice = await prisma.user.create({
      data: {
        name: `Teacher Alice ${testStamp}`,
        email: `alice-lock-${testStamp}@school.internal`,
        passwordHash: "dummyhash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });

    teacherBob = await prisma.user.create({
      data: {
        name: `Teacher Bob ${testStamp}`,
        email: `bob-lock-${testStamp}@school.internal`,
        passwordHash: "dummyhash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });

    adminCarol = await prisma.user.create({
      data: {
        name: `Admin Carol ${testStamp}`,
        email: `carol-lock-${testStamp}@school.internal`,
        passwordHash: "dummyhash",
        role: "ADMIN",
        department: "Administration",
        active: true,
      },
    });

    // 2. Book & Chapters
    const book = await prisma.book.create({
      data: {
        title: `State Lock Book ${testStamp}`,
        subject: "Physics",
        className: "Class 12",
        chapters: {
          create: [
            { number: 1, title: "Electromagnetism" },
            { number: 2, title: "Optics" },
          ],
        },
      },
      include: { chapters: true },
    });
    bookId = book.id;
    ch1Id = book.chapters[0].id;
    ch2Id = book.chapters[1].id;

    // 3. Blueprint with 1 section requiring 2 questions of 2 marks = 4 marks total
    const bp = await prisma.blueprint.create({
      data: {
        name: `State Lock Blueprint ${testStamp}`,
        bookId,
        examType: "ANNUAL",
        durationMin: 180,
        sections: {
          create: [{ position: 1, title: "Section A", type: "SHORT", count: 2, marksEach: 2 }],
        },
        chapters: {
          create: [{ chapterId: ch1Id, marks: 4 }],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    sectionId = bp.sections[0].id;

    // 4. Questions
    const q1 = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "SHORT",
        text: "Question 1 for State Lock Test",
        answer: "Ans 1",
        difficulty: "EASY",
        createdById: teacherAlice.id,
      },
    });
    q1Id = q1.id;

    const q2 = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "SHORT",
        text: "Question 2 for State Lock Test",
        answer: "Ans 2",
        difficulty: "MEDIUM",
        createdById: teacherAlice.id,
      },
    });
    q2Id = q2.id;

    const q3 = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "SHORT",
        text: "Question 3 for State Lock Test (Bank)",
        answer: "Ans 3",
        difficulty: "HARD",
        createdById: teacherAlice.id,
      },
    });
    q3Id = q3.id;

    const qRep = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "SHORT",
        text: "Replacement Question",
        answer: "Ans Rep",
        difficulty: "EASY",
        createdById: teacherAlice.id,
      },
    });
    qReplacementId = qRep.id;

    // 5. Fixture: Paper for Unlock Tests (FINAL, owned by Alice)
    const pUnlock = await prisma.paper.create({
      data: {
        title: `Alice Finalized Exam for Unlock ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "FINAL",
        createdById: teacherAlice.id,
        items: {
          create: [
            { sectionId, questionId: q1Id, position: 0 },
            { sectionId, questionId: q2Id, position: 1 },
          ],
        },
      },
    });
    paperFinalUnlockId = pUnlock.id;

    // 6. Fixture: Paper for Delete Tests (FINAL, owned by Alice)
    const pDelete = await prisma.paper.create({
      data: {
        title: `Alice Finalized Exam for Delete Test ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "FINAL",
        createdById: teacherAlice.id,
      },
    });
    paperFinalDeleteId = pDelete.id;

    // 7. Fixture: Paper for Admin Direct Delete (FINAL, owned by Alice)
    const pDirectDelete = await prisma.paper.create({
      data: {
        title: `Alice Paper for Admin Direct Delete ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "FINAL",
        createdById: teacherAlice.id,
      },
    });
    paperDirectDeleteId = pDirectDelete.id;

    // 8. Fixture: Paper for Subroute Mutation Tests (FINAL, owned by Alice)
    const pSubroutes = await prisma.paper.create({
      data: {
        title: `Alice Finalized Exam for Subroute Tests ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "FINAL",
        createdById: teacherAlice.id,
        items: {
          create: [
            { sectionId, questionId: q1Id, position: 0 },
            { sectionId, questionId: q2Id, position: 1 },
          ],
        },
      },
      include: { items: true },
    });
    paperSubroutesFinalId = pSubroutes.id;
    paperSubroutesItemId = pSubroutes.items[0].id;

    // 9. Fixture: Paper for Lifecycle Tests (DRAFT, owned by Alice, incomplete)
    const pLife = await prisma.paper.create({
      data: {
        title: `Alice Lifecycle Draft ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "DRAFT",
        createdById: teacherAlice.id,
        items: {
          create: [{ sectionId, questionId: q1Id, position: 0 }],
        },
      },
    });
    paperLifecycleId = pLife.id;
  });

  afterAll(async () => {
    // Cleanup in dependency order
    const allPaperIds = [
      paperFinalUnlockId,
      paperFinalDeleteId,
      paperDirectDeleteId,
      paperSubroutesFinalId,
      paperLifecycleId,
    ].filter(Boolean);

    if (allPaperIds.length > 0) {
      await prisma.paperQuestion.deleteMany({ where: { paperId: { in: allPaperIds } } });
      await prisma.paper.deleteMany({ where: { id: { in: allPaperIds } } });
    }
    if (blueprintId) {
      await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
      await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
      await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    }
    const qIds = [q1Id, q2Id, q3Id, qReplacementId].filter(Boolean);
    if (qIds.length > 0) {
      await prisma.question.deleteMany({ where: { id: { in: qIds } } });
    }
    if (ch1Id || ch2Id) {
      await prisma.chapter.deleteMany({ where: { bookId } });
    }
    if (bookId) {
      await prisma.book.deleteMany({ where: { id: bookId } });
    }
    const userIds = [teacherAlice?.id, teacherBob?.id, adminCarol?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // Challenge Area 1: Paper State Machine Transitions & Lock Enforcement
  // =========================================================================
  describe("1. Paper State Machine Transitions & Lock Enforcement", () => {
    it("MUST return HTTP 403 Forbidden when teacher author attempts to unlock FINAL paper to DRAFT via PATCH", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperFinalUnlockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperFinalUnlockId }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/finalized.*Admin/i);

      // Verify DB state is still FINAL
      const paperInDb = await prisma.paper.findUnique({ where: { id: paperFinalUnlockId } });
      expect(paperInDb?.status).toBe("FINAL");
    });

    it("MUST return HTTP 403 Forbidden when non-author teacher attempts to unlock FINAL paper to DRAFT", async () => {
      mockSessionUserId = teacherBob.id;
      const req = new Request(`http://localhost/api/papers/${paperFinalUnlockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperFinalUnlockId }) });

      expect(res.status).toBe(403);

      const paperInDb = await prisma.paper.findUnique({ where: { id: paperFinalUnlockId } });
      expect(paperInDb?.status).toBe("FINAL");
    });

    it("MUST return HTTP 403 Forbidden when teacher author attempts to mutate fields (title/date) on FINAL paper", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperFinalUnlockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Tampered Title on Final Paper" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperFinalUnlockId }) });

      expect(res.status).toBe(403);

      // Verify title in DB was NOT changed
      const paperInDb = await prisma.paper.findUnique({ where: { id: paperFinalUnlockId } });
      expect(paperInDb?.title).toBe(`Alice Finalized Exam for Unlock ${testStamp}`);
    });

    it("MUST return HTTP 200 OK when Admin unlocks FINAL paper to DRAFT via PATCH", async () => {
      mockSessionUserId = adminCarol.id;
      const req = new Request(`http://localhost/api/papers/${paperFinalUnlockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperFinalUnlockId }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("DRAFT");

      // Verify DB state transitioned to DRAFT
      const paperInDb = await prisma.paper.findUnique({ where: { id: paperFinalUnlockId } });
      expect(paperInDb?.status).toBe("DRAFT");

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { entityId: paperFinalUnlockId, action: "PAPER_STATUS_CHANGE" },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.detailsJson).toContain('"from":"FINAL"');
      expect(audit?.detailsJson).toContain('"to":"DRAFT"');
    });

    it("allows teacher author to edit fields once Admin unlocked the paper to DRAFT", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperFinalUnlockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Alice Legitimate Update Post-Unlock ${testStamp}` }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperFinalUnlockId }) });

      expect(res.status).toBe(200);
      const paperInDb = await prisma.paper.findUnique({ where: { id: paperFinalUnlockId } });
      expect(paperInDb?.title).toBe(`Alice Legitimate Update Post-Unlock ${testStamp}`);
    });
  });

  // =========================================================================
  // Challenge Area 2: Deletion Permissions on FINAL Papers
  // =========================================================================
  describe("2. Deletion Permissions on FINAL Papers", () => {
    it("MUST return HTTP 403 Forbidden when teacher author attempts to DELETE their own FINAL paper", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperFinalDeleteId}`, {
        method: "DELETE",
      });
      const res = await deletePaper(req, { params: Promise.resolve({ id: paperFinalDeleteId }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/finalized.*Admin/i);

      // Verify paper still exists in DB
      const paperInDb = await prisma.paper.findUnique({ where: { id: paperFinalDeleteId } });
      expect(paperInDb).not.toBeNull();
    });

    it("MUST return HTTP 403 Forbidden when teacher non-author attempts to DELETE FINAL paper", async () => {
      mockSessionUserId = teacherBob.id;
      const req = new Request(`http://localhost/api/papers/${paperFinalDeleteId}`, {
        method: "DELETE",
      });
      const res = await deletePaper(req, { params: Promise.resolve({ id: paperFinalDeleteId }) });

      expect(res.status).toBe(403);

      const paperInDb = await prisma.paper.findUnique({ where: { id: paperFinalDeleteId } });
      expect(paperInDb).not.toBeNull();
    });

    it("MUST return HTTP 200 OK when Admin directly deletes a FINAL paper", async () => {
      mockSessionUserId = adminCarol.id;
      const req = new Request(`http://localhost/api/papers/${paperDirectDeleteId}`, {
        method: "DELETE",
      });
      const res = await deletePaper(req, { params: Promise.resolve({ id: paperDirectDeleteId }) });

      expect(res.status).toBe(200);

      // Verify paper was permanently removed from DB
      const paperInDb = await prisma.paper.findUnique({ where: { id: paperDirectDeleteId } });
      expect(paperInDb).toBeNull();

      // Verify audit record
      const audit = await prisma.auditLog.findFirst({
        where: { entityId: paperDirectDeleteId, action: "PAPER_UPDATE" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.detailsJson).toContain('"action":"DELETED"');
    });
  });

  // =========================================================================
  // Challenge Area 3: Sub-Route Mutation Protection on FINAL Papers
  // =========================================================================
  describe("3. Sub-Route Mutation Protection on FINAL Papers", () => {
    it("MUST return HTTP 403 Forbidden when teacher attempts to add question via POST /questions", async () => {
      mockSessionUserId = teacherAlice.id;
      const countBefore = await prisma.paperQuestion.count({ where: { paperId: paperSubroutesFinalId } });

      const req = new Request(`http://localhost/api/papers/${paperSubroutesFinalId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, questionId: q3Id }),
      });
      const res = await postPaperQuestion(req, { params: Promise.resolve({ id: paperSubroutesFinalId }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/finalized.*Admin/i);

      // Verify no item was added in DB
      const countAfter = await prisma.paperQuestion.count({ where: { paperId: paperSubroutesFinalId } });
      expect(countAfter).toBe(countBefore);
    });

    it("MUST return HTTP 403 Forbidden when teacher attempts to remove question via DELETE /questions/[itemId]", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(
        `http://localhost/api/papers/${paperSubroutesFinalId}/questions/${paperSubroutesItemId}`,
        { method: "DELETE" }
      );
      const res = await deletePaperItem(req, {
        params: Promise.resolve({ id: paperSubroutesFinalId, itemId: paperSubroutesItemId }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/finalized.*Admin/i);

      // Verify item still exists in DB
      const itemInDb = await prisma.paperQuestion.findUnique({ where: { id: paperSubroutesItemId } });
      expect(itemInDb).not.toBeNull();
    });

    it("MUST return HTTP 403 Forbidden when teacher attempts to replace question via PATCH /questions/[itemId]", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(
        `http://localhost/api/papers/${paperSubroutesFinalId}/questions/${paperSubroutesItemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replaceWithQuestionId: qReplacementId }),
        }
      );
      const res = await patchPaperItem(req, {
        params: Promise.resolve({ id: paperSubroutesFinalId, itemId: paperSubroutesItemId }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/finalized.*Admin/i);

      // Verify questionId unchanged in DB
      const itemInDb = await prisma.paperQuestion.findUnique({ where: { id: paperSubroutesItemId } });
      expect(itemInDb?.questionId).toBe(q1Id);
    });

    it("MUST return HTTP 403 Forbidden when teacher attempts to add OR question via PATCH /questions/[itemId]", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(
        `http://localhost/api/papers/${paperSubroutesFinalId}/questions/${paperSubroutesItemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orQuestionId: qReplacementId }),
        }
      );
      const res = await patchPaperItem(req, {
        params: Promise.resolve({ id: paperSubroutesFinalId, itemId: paperSubroutesItemId }),
      });

      expect(res.status).toBe(403);

      const itemInDb = await prisma.paperQuestion.findUnique({ where: { id: paperSubroutesItemId } });
      expect(itemInDb?.orQuestionId).toBeNull();
    });

    it("MUST return HTTP 403 Forbidden when teacher attempts to reorder question via PATCH /questions/[itemId]", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(
        `http://localhost/api/papers/${paperSubroutesFinalId}/questions/${paperSubroutesItemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction: "down" }),
        }
      );
      const res = await patchPaperItem(req, {
        params: Promise.resolve({ id: paperSubroutesFinalId, itemId: paperSubroutesItemId }),
      });

      expect(res.status).toBe(403);

      const itemInDb = await prisma.paperQuestion.findUnique({ where: { id: paperSubroutesItemId } });
      expect(itemInDb?.position).toBe(0);
    });

    it("MUST return HTTP 403 Forbidden when teacher attempts UPDATE_MASTER via PUT /questions/[itemId]", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(
        `http://localhost/api/papers/${paperSubroutesFinalId}/questions/${paperSubroutesItemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "UPDATE_MASTER",
            question: {
              bookId,
              chapterId: ch1Id,
              type: "SHORT",
              text: "Illegally updated master text",
              options: [],
              subparts: [],
              answer: "Updated Ans",
              difficulty: "HARD",
            },
          }),
        }
      );
      const res = await putPaperItem(req, {
        params: Promise.resolve({ id: paperSubroutesFinalId, itemId: paperSubroutesItemId }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/finalized.*Admin/i);

      // Verify question was NOT updated in DB
      const qInDb = await prisma.question.findUnique({ where: { id: q1Id } });
      expect(qInDb?.text).toBe("Question 1 for State Lock Test");
    });

    it("MUST return HTTP 403 Forbidden when teacher attempts FORK_COPY via PUT /questions/[itemId]", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(
        `http://localhost/api/papers/${paperSubroutesFinalId}/questions/${paperSubroutesItemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "FORK_COPY",
            question: {
              bookId,
              chapterId: ch1Id,
              type: "SHORT",
              text: "Forked question attempt on final paper",
              options: [],
              subparts: [],
              answer: "Forked Ans",
              difficulty: "MEDIUM",
            },
          }),
        }
      );
      const res = await putPaperItem(req, {
        params: Promise.resolve({ id: paperSubroutesFinalId, itemId: paperSubroutesItemId }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/finalized.*Admin/i);

      // Verify item still points to original q1Id
      const itemInDb = await prisma.paperQuestion.findUnique({ where: { id: paperSubroutesItemId } });
      expect(itemInDb?.questionId).toBe(q1Id);
    });

    it("MUST return HTTP 403 Forbidden when teacher attempts 1-click autofill via POST /autofill", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperSubroutesFinalId}/autofill`, {
        method: "POST",
      });
      const res = await postPaperAutofill(req, { params: Promise.resolve({ id: paperSubroutesFinalId }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/finalized.*Admin/i);
    });

    it("MUST return HTTP 403 Forbidden when teacher attempts JSON import via POST /import-questions", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperSubroutesFinalId}/import-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "replace",
          paperData: {
            sections: [
              {
                title: "Section A",
                questions: [{ text: "Tampered imported question", type: "SHORT" }],
              },
            ],
          },
        }),
      });
      const res = await postImportQuestions(req, { params: Promise.resolve({ id: paperSubroutesFinalId }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/finalized.*Admin/i);

      // Verify questions were NOT replaced in DB
      const count = await prisma.paperQuestion.count({ where: { paperId: paperSubroutesFinalId } });
      expect(count).toBe(2);
    });
  });

  // =========================================================================
  // Challenge Area 4: Complete State Machine Lifecycle (DRAFT -> FINAL -> DRAFT)
  // =========================================================================
  describe("4. Complete State Machine Lifecycle (DRAFT -> FINAL -> DRAFT)", () => {
    it("prevents finalizing an incomplete DRAFT paper with HTTP 409 Conflict", async () => {
      // paperLifecycleId has only 1 question, but blueprint requires 2
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperLifecycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FINAL" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperLifecycleId }) });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("doesn't match its blueprint yet");

      const inDb = await prisma.paper.findUnique({ where: { id: paperLifecycleId } });
      expect(inDb?.status).toBe("DRAFT");
    });

    it("allows teacher author to add required question to complete the DRAFT paper", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperLifecycleId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, questionId: q2Id }),
      });
      const res = await postPaperQuestion(req, { params: Promise.resolve({ id: paperLifecycleId }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.progress.complete).toBe(true);
    });

    it("allows teacher author to finalize the complete paper to FINAL with HTTP 200", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperLifecycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FINAL" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperLifecycleId }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("FINAL");

      const inDb = await prisma.paper.findUnique({ where: { id: paperLifecycleId } });
      expect(inDb?.status).toBe("FINAL");
    });

    it("locks the paper immediately: teacher author receives HTTP 403 on subsequent mutations", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperLifecycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Alice illegal rename after finalizing" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperLifecycleId }) });

      expect(res.status).toBe(403);
    });

    it("allows Admin to unlock the paper back to DRAFT with HTTP 200", async () => {
      mockSessionUserId = adminCarol.id;
      const req = new Request(`http://localhost/api/papers/${paperLifecycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperLifecycleId }) });

      expect(res.status).toBe(200);
      const inDb = await prisma.paper.findUnique({ where: { id: paperLifecycleId } });
      expect(inDb?.status).toBe("DRAFT");
    });

    it("restores teacher author mutation rights once unlocked to DRAFT", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperLifecycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Alice legitimate rename after Admin unlock" }),
      });
      const res = await patchPaper(req, { params: Promise.resolve({ id: paperLifecycleId }) });

      expect(res.status).toBe(200);
      const inDb = await prisma.paper.findUnique({ where: { id: paperLifecycleId } });
      expect(inDb?.title).toBe("Alice legitimate rename after Admin unlock");
    });

    it("allows teacher author to delete their paper once in DRAFT status with HTTP 200", async () => {
      mockSessionUserId = teacherAlice.id;
      const req = new Request(`http://localhost/api/papers/${paperLifecycleId}`, {
        method: "DELETE",
      });
      const res = await deletePaper(req, { params: Promise.resolve({ id: paperLifecycleId }) });

      expect(res.status).toBe(200);
      const inDb = await prisma.paper.findUnique({ where: { id: paperLifecycleId } });
      expect(inDb).toBeNull();
    });
  });
});
