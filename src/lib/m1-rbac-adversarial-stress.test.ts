import { createHmac } from "node:crypto";
import { hash } from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";

// Ensure SESSION_SECRET is available for genuine HMAC signing in tests
const SESSION_SECRET =
  process.env.SESSION_SECRET || "66891132bfd6ceef60adf849088b03281489d505ef5dd6092c904de64fe68a08";
process.env.SESSION_SECRET = SESSION_SECRET;

// Import route handlers under stress test
import { PATCH as patchPaper, DELETE as deletePaper } from "../app/api/papers/[id]/route";
import { POST as postPaper } from "../app/api/papers/route";
import { POST as postPaperQuestion } from "../app/api/papers/[id]/questions/route";
import {
  PATCH as patchPaperItem,
  DELETE as deletePaperItem,
} from "../app/api/papers/[id]/questions/[itemId]/route";
import {
  PATCH as patchQuestion,
  PUT as putQuestion,
  DELETE as deleteQuestion,
} from "../app/api/questions/[id]/route";
import { POST as postClass } from "../app/api/classes/route";
import { PATCH as patchClass, DELETE as deleteClass } from "../app/api/classes/[id]/route";
import { POST as postClassSubject } from "../app/api/classes/[id]/subjects/route";
import {
  PATCH as patchClassSubject,
  DELETE as deleteClassSubject,
} from "../app/api/classes/[id]/subjects/[subjectId]/route";
import { POST as postRollover } from "../app/api/academic-rollover/route";
import { POST as postBooksRollover } from "../app/api/books/rollover/route";
import { POST as postBlueprintsRollover } from "../app/api/blueprints/rollover/route";
import { POST as postUser } from "../app/api/users/route";
import { PATCH as patchUser, DELETE as deleteUser } from "../app/api/users/[id]/route";
import { GET as getMe } from "../app/api/me/route";
import { POST as loginPost } from "../app/api/auth/login/route";

function signCookiePayload(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

function makeSessionCookie(userId: string, expSecondsFromNow = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = `${userId}.${exp}`;
  const sig = signCookiePayload(payload);
  return `epb_session=${payload}.${sig}`;
}

describe("Milestone 1 RBAC Adversarial Stress Challenge Suite", () => {
  const testStamp = Date.now();

  let teacherA: { id: string; email: string };
  let teacherB: { id: string; email: string };
  let adminUser: { id: string; email: string };
  let deactivatedTeacher: { id: string; email: string };
  let deactivatedAdmin: { id: string; email: string };

  let bookId: string;
  let chId: string;
  let blueprintId: string;
  let sectionId: string;

  let paperA_draftId: string;
  let paperB_draftId: string;
  let paperB_itemId: string;
  let paperA_finalId: string;
  let orphanPaperId: string;

  let questionAId: string;
  let questionBId: string;
  let orphanQuestionId: string;

  let testClassId: string;
  let testSubjectId: string;

  beforeAll(async () => {
    const validPasswordHash = await hash("password123", 10);

    // 1. Create Active Users
    teacherA = await prisma.user.create({
      data: {
        name: `Teacher Alice Adv ${testStamp}`,
        email: `alice-adv-${testStamp}@school.internal`,
        passwordHash: validPasswordHash,
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });

    teacherB = await prisma.user.create({
      data: {
        name: `Teacher Bob Adv ${testStamp}`,
        email: `bob-adv-${testStamp}@school.internal`,
        passwordHash: validPasswordHash,
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        name: `Admin Carol Adv ${testStamp}`,
        email: `carol-adv-${testStamp}@school.internal`,
        passwordHash: validPasswordHash,
        role: "ADMIN",
        department: "Administration",
        active: true,
      },
    });

    // 2. Create Deactivated Users
    deactivatedTeacher = await prisma.user.create({
      data: {
        name: `Deactivated Teacher Adv ${testStamp}`,
        email: `deact-teacher-${testStamp}@school.internal`,
        passwordHash: validPasswordHash,
        role: "TEACHER",
        department: "Science",
        active: false,
      },
    });

    deactivatedAdmin = await prisma.user.create({
      data: {
        name: `Deactivated Admin Adv ${testStamp}`,
        email: `deact-admin-${testStamp}@school.internal`,
        passwordHash: validPasswordHash,
        role: "ADMIN",
        department: "Administration",
        active: false,
      },
    });

    // 3. Create Book & Blueprint
    const book = await prisma.book.create({
      data: {
        title: `RBAC Adv Stress Book ${testStamp}`,
        subject: "Physics",
        className: "Class 11",
        academicSession: "2025–26",
        chapters: {
          create: [{ number: 1, title: "Kinematics" }],
        },
      },
      include: { chapters: true },
    });
    bookId = book.id;
    chId = book.chapters[0].id;

    const bp = await prisma.blueprint.create({
      data: {
        name: `RBAC Adv Blueprint ${testStamp}`,
        bookId,
        examType: "ANNUAL",
        durationMin: 180,
        sections: {
          create: [
            { position: 1, title: "Section A", type: "SHORT", count: 2, marksEach: 2 },
          ],
        },
        chapters: {
          create: [{ chapterId: chId, marks: 4 }],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    sectionId = bp.sections[0].id;

    // 2.5 Create Third Teacher (representing former/other faculty)
    const formerFaculty = await prisma.user.create({
      data: {
        name: `Former Faculty Adv ${testStamp}`,
        email: `former-faculty-${testStamp}@school.internal`,
        passwordHash: "$2a$10$wT0l8c7U7qC7T8w9yL7i4.5eHlDqgA3C.t5m6r7e8w9q0a1b2c3d4",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });

    // 4. Create Questions (Teacher A, Teacher B, and Third/Former Faculty)
    const qA = await prisma.question.create({
      data: {
        bookId,
        chapterId: chId,
        type: "SHORT",
        text: `Question authored by Teacher A ${testStamp}`,
        answer: "A_ans",
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
        text: `Question authored by Teacher B ${testStamp}`,
        answer: "B_ans",
        difficulty: "MEDIUM",
        createdById: teacherB.id,
      },
    });
    questionBId = qB.id;

    const qOrphan = await prisma.question.create({
      data: {
        bookId,
        chapterId: chId,
        type: "SHORT",
        text: `Legacy Orphan Question ${testStamp}`,
        answer: "O_ans",
        difficulty: "HARD",
        createdById: formerFaculty.id,
      },
    });
    orphanQuestionId = qOrphan.id;

    // 5. Create Papers
    const pA = await prisma.paper.create({
      data: {
        title: `Teacher A Draft ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "DRAFT",
        createdById: teacherA.id,
      },
    });
    paperA_draftId = pA.id;

    const pB = await prisma.paper.create({
      data: {
        title: `Teacher B Draft ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "DRAFT",
        createdById: teacherB.id,
      },
    });
    paperB_draftId = pB.id;

    // Place question B into Paper B
    const itemB = await prisma.paperQuestion.create({
      data: {
        paperId: paperB_draftId,
        sectionId,
        questionId: questionBId,
        position: 0,
      },
    });
    paperB_itemId = itemB.id;

    const pA_final = await prisma.paper.create({
      data: {
        title: `Teacher A Final ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "FINAL",
        createdById: teacherA.id,
      },
    });
    paperA_finalId = pA_final.id;

    const pOrphan = await prisma.paper.create({
      data: {
        title: `Legacy Orphan Paper ${testStamp}`,
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Sarvodaya Lakhnadon",
        status: "DRAFT",
        createdById: formerFaculty.id,
      },
    });
    orphanPaperId = pOrphan.id;

    // 6. Create Test Class & Subject for Class API probes
    const cls = await prisma.academicClass.create({
      data: {
        name: `Class-Adv-${testStamp}`,
        stream: "Science",
        academicSession: "2025–26",
        sectionsJson: JSON.stringify(["A", "B"]),
        subjects: {
          create: [{ name: "Physics", code: "PHY101" }],
        },
      },
      include: { subjects: true },
    });
    testClassId = cls.id;
    testSubjectId = cls.subjects[0].id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.classSubject.deleteMany({ where: { classId: testClassId } }).catch(() => {});
    await prisma.academicClass.deleteMany({ where: { id: testClassId } }).catch(() => {});
    await prisma.academicClass.deleteMany({ where: { name: { contains: `${testStamp}` } } }).catch(() => {});

    const paperIds = [paperA_draftId, paperB_draftId, paperA_finalId, orphanPaperId].filter(Boolean);
    if (paperIds.length > 0) {
      await prisma.paperQuestion.deleteMany({ where: { paperId: { in: paperIds } } }).catch(() => {});
      await prisma.paper.deleteMany({ where: { id: { in: paperIds } } }).catch(() => {});
    }

    if (blueprintId) {
      await prisma.blueprintSection.deleteMany({ where: { blueprintId } }).catch(() => {});
      await prisma.blueprintChapter.deleteMany({ where: { blueprintId } }).catch(() => {});
      await prisma.blueprint.deleteMany({ where: { id: blueprintId } }).catch(() => {});
    }

    const qIds = [questionAId, questionBId, orphanQuestionId].filter(Boolean);
    if (qIds.length > 0) {
      await prisma.question.deleteMany({ where: { id: { in: qIds } } }).catch(() => {});
    }

    if (chId) await prisma.chapter.deleteMany({ where: { id: chId } }).catch(() => {});
    if (bookId) await prisma.book.deleteMany({ where: { id: bookId } }).catch(() => {});

    const userIds = [
      teacherA?.id,
      teacherB?.id,
      adminUser?.id,
      deactivatedTeacher?.id,
      deactivatedAdmin?.id,
    ].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    }
  });

  // =========================================================================
  // SECTION 1: QUESTION & PAPER ID MANIPULATION & OWNERSHIP BYPASS PROBES
  // =========================================================================
  describe("1. Question & Paper ID Manipulation Probes", () => {
    it("Probe 1.1: Cross-paper question item deletion attempt with mismatched URL IDs returns HTTP 404", async () => {
      // Teacher A calls DELETE on their own paperA_draftId, but passes paperB_itemId
      const req = new Request(
        `http://localhost/api/papers/${paperA_draftId}/questions/${paperB_itemId}`,
        {
          method: "DELETE",
          headers: { Cookie: makeSessionCookie(teacherA.id) },
        },
      );
      const res = await deletePaperItem(req, {
        params: Promise.resolve({ id: paperA_draftId, itemId: paperB_itemId }),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Item not found");
    });

    it("Probe 1.2: Direct cross-paper question item deletion on Teacher B's paper returns HTTP 403", async () => {
      // Teacher A attempts to directly DELETE paperB_itemId from paperB_draftId
      const req = new Request(
        `http://localhost/api/papers/${paperB_draftId}/questions/${paperB_itemId}`,
        {
          method: "DELETE",
          headers: { Cookie: makeSessionCookie(teacherA.id) },
        },
      );
      const res = await deletePaperItem(req, {
        params: Promise.resolve({ id: paperB_draftId, itemId: paperB_itemId }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Only the paper creator, Department Head (HOD), or Administrator");
    });

    it("Probe 1.3: Cross-paper question replacement on Teacher B's paper returns HTTP 403", async () => {
      // Teacher A attempts to replace an item in Teacher B's paper
      const req = new Request(
        `http://localhost/api/papers/${paperB_draftId}/questions/${paperB_itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: makeSessionCookie(teacherA.id),
          },
          body: JSON.stringify({ replaceWithQuestionId: questionAId }),
        },
      );
      const res = await patchPaperItem(req, {
        params: Promise.resolve({ id: paperB_draftId, itemId: paperB_itemId }),
      });
      expect(res.status).toBe(403);
    });

    it("Probe 1.4: Cross-paper alternate (OR) choice mutation returns HTTP 403", async () => {
      // Teacher A attempts to attach an OR question to Teacher B's paper item
      const req = new Request(
        `http://localhost/api/papers/${paperB_draftId}/questions/${paperB_itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: makeSessionCookie(teacherA.id),
          },
          body: JSON.stringify({ orQuestionId: questionAId }),
        },
      );
      const res = await patchPaperItem(req, {
        params: Promise.resolve({ id: paperB_draftId, itemId: paperB_itemId }),
      });
      expect(res.status).toBe(403);
    });

    it("Probe 1.5: Teacher attempting to steal paper ownership via createdById in PATCH body is denied (403)", async () => {
      // Teacher A crafts PATCH to Paper B with body { createdById: teacherA.id }
      const req = new Request(`http://localhost/api/papers/${paperB_draftId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({ title: "Stolen Paper", createdById: teacherA.id }),
      });
      const res = await patchPaper(req, {
        params: Promise.resolve({ id: paperB_draftId }),
      });
      expect(res.status).toBe(403);

      // Verify paper owner in DB was NOT changed
      const current = await prisma.paper.findUnique({ where: { id: paperB_draftId } });
      expect(current?.createdById).toBe(teacherB.id);
    });

    it("Probe 1.6: Teacher attempting to transfer their paper via createdById in PATCH body does not alter DB ownership", async () => {
      // Teacher A patches their own paper passing createdById: teacherB.id
      const req = new Request(`http://localhost/api/papers/${paperA_draftId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({ title: "Updated Legitimately", createdById: teacherB.id }),
      });
      const res = await patchPaper(req, {
        params: Promise.resolve({ id: paperA_draftId }),
      });
      expect(res.status).toBe(200);

      // Verify paper owner in DB remains Teacher A (schema stripped createdById)
      const current = await prisma.paper.findUnique({ where: { id: paperA_draftId } });
      expect(current?.createdById).toBe(teacherA.id);
    });

    it("Probe 1.7: Legacy / Orphan question with null createdById cannot be modified or deleted by Teacher A (HTTP 403)", async () => {
      // PATCH orphan question
      const patchReq = new Request(`http://localhost/api/questions/${orphanQuestionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({ text: "Teacher A attempting to hijack orphan question" }),
      });
      const patchRes = await patchQuestion(patchReq, {
        params: Promise.resolve({ id: orphanQuestionId }),
      });
      expect(patchRes.status).toBe(403);
      const patchJson = await patchRes.json();
      expect(patchJson.error).toContain("Forbidden: You can only edit or delete your own questions.");

      // PUT orphan question
      const putReq = new Request(`http://localhost/api/questions/${orphanQuestionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({
          bookId,
          chapterId: chId,
          type: "SHORT",
          text: "Full overwrite attempt on orphan",
          answer: "Hijacked",
          difficulty: "EASY",
        }),
      });
      const putRes = await putQuestion(putReq, {
        params: Promise.resolve({ id: orphanQuestionId }),
      });
      expect(putRes.status).toBe(403);

      // DELETE orphan question
      const delReq = new Request(`http://localhost/api/questions/${orphanQuestionId}`, {
        method: "DELETE",
        headers: { Cookie: makeSessionCookie(teacherA.id) },
      });
      const delRes = await deleteQuestion(delReq, {
        params: Promise.resolve({ id: orphanQuestionId }),
      });
      expect(delRes.status).toBe(403);
    });

    it("Probe 1.8: Administrator CAN curate legacy orphan questions with HTTP 200", async () => {
      const adminReq = new Request(`http://localhost/api/questions/${orphanQuestionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(adminUser.id),
        },
        body: JSON.stringify({ text: "Admin curated orphan question text" }),
      });
      const adminRes = await patchQuestion(adminReq, {
        params: Promise.resolve({ id: orphanQuestionId }),
      });
      expect(adminRes.status).toBe(200);
      const data = await adminRes.json();
      expect(data.text).toBe("Admin curated orphan question text");
    });

    it("Probe 1.9: Legacy / Orphan paper with null createdById cannot be modified by Teacher A (HTTP 403)", async () => {
      const req = new Request(`http://localhost/api/papers/${orphanPaperId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({ title: "Teacher A orphan paper takeover" }),
      });
      const res = await patchPaper(req, {
        params: Promise.resolve({ id: orphanPaperId }),
      });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // SECTION 2: PRIVILEGE ESCALATION & ADMINISTRATIVE ENDPOINT PROBES
  // =========================================================================
  describe("2. Administrative Route Protection & Privilege Escalation Probes", () => {
    it("Probe 2.1: Teacher A calling POST /api/classes receives HTTP 403", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({
          name: `Malicious-Class-${testStamp}`,
          sections: ["A"],
          academicSession: "2025–26",
        }),
      });
      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Insufficient permissions for this action");
    });

    it("Probe 2.2: Teacher A calling POST /api/classes with SEED_STANDARD receives HTTP 403", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({ action: "SEED_STANDARD", academicSession: "2026–27" }),
      });
      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it("Probe 2.3: Teacher A calling POST /api/classes with ROLLOVER receives HTTP 403", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({
          action: "ROLLOVER",
          sourceSession: "2025–26",
          targetSession: "2026–27",
        }),
      });
      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it("Probe 2.4: Teacher A calling PATCH /api/classes/[id] receives HTTP 403", async () => {
      const req = new Request(`http://localhost/api/classes/${testClassId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({ name: "Tampered Class Name" }),
      });
      const res = await patchClass(req, {
        params: Promise.resolve({ id: testClassId }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Insufficient permissions for this action");
    });

    it("Probe 2.5: Teacher A calling DELETE /api/classes/[id] receives HTTP 403", async () => {
      const req = new Request(`http://localhost/api/classes/${testClassId}`, {
        method: "DELETE",
        headers: { Cookie: makeSessionCookie(teacherA.id) },
      });
      const res = await deleteClass(req, {
        params: Promise.resolve({ id: testClassId }),
      });
      expect(res.status).toBe(403);
    });

    it("Probe 2.6: Teacher A calling POST /api/classes/[id]/subjects receives HTTP 403", async () => {
      const req = new Request(`http://localhost/api/classes/${testClassId}/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({ name: "Unauthorized Subject", code: "UNAUTH101" }),
      });
      const res = await postClassSubject(req, {
        params: Promise.resolve({ id: testClassId }),
      });
      expect(res.status).toBe(403);
    });

    it("Probe 2.7: Teacher A calling PATCH /api/classes/[id]/subjects/[subjectId] receives HTTP 403", async () => {
      const req = new Request(
        `http://localhost/api/classes/${testClassId}/subjects/${testSubjectId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: makeSessionCookie(teacherA.id),
          },
          body: JSON.stringify({ name: "Tampered Subject" }),
        },
      );
      const res = await patchClassSubject(req, {
        params: Promise.resolve({ id: testClassId, subjectId: testSubjectId }),
      });
      expect(res.status).toBe(403);
    });

    it("Probe 2.8: Teacher A calling DELETE /api/classes/[id]/subjects/[subjectId] receives HTTP 403", async () => {
      const req = new Request(
        `http://localhost/api/classes/${testClassId}/subjects/${testSubjectId}`,
        {
          method: "DELETE",
          headers: { Cookie: makeSessionCookie(teacherA.id) },
        },
      );
      const res = await deleteClassSubject(req, {
        params: Promise.resolve({ id: testClassId, subjectId: testSubjectId }),
      });
      expect(res.status).toBe(403);
    });

    it("Probe 2.9: Teacher A calling POST /api/academic-rollover receives HTTP 403", async () => {
      const req = new Request("http://localhost/api/academic-rollover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({
          sourceSession: "2025–26",
          targetSession: "2026–27",
          includeClasses: true,
          includeBooks: false,
          includeBlueprints: false,
        }),
      });
      const res = await postRollover(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Insufficient permissions for this action");
    });

    it("Probe 2.10: Teacher A calling POST /api/books/rollover receives HTTP 403", async () => {
      const req = new Request("http://localhost/api/books/rollover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({
          sourceBookId: bookId,
          targetAcademicSession: "2026–27",
          title: "Rolled Book",
        }),
      });
      const res = await postBooksRollover(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it("Probe 2.11: Teacher A calling POST /api/blueprints/rollover receives HTTP 403", async () => {
      const req = new Request("http://localhost/api/blueprints/rollover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({
          sourceAcademicSession: "2025–26",
          targetAcademicSession: "2026–27",
          blueprintIds: [blueprintId],
        }),
      });
      const res = await postBlueprintsRollover(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it("Probe 2.12: Teacher A calling POST /api/users (user creation) receives HTTP 403", async () => {
      const req = new Request("http://localhost/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({
          name: "Attacker Created Admin",
          email: `attacker-admin-${testStamp}@school.internal`,
          password: "password123",
          role: "ADMIN",
          department: "Administration",
        }),
      });
      const res = await postUser(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it("Probe 2.13: Teacher A calling PATCH /api/users/[id] (elevating their own role) receives HTTP 403", async () => {
      const req = new Request(`http://localhost/api/users/${teacherA.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      const res = await patchUser(req, { params: Promise.resolve({ id: teacherA.id }) });
      expect(res.status).toBe(403);

      // Verify in DB Teacher A is still a TEACHER
      const freshUser = await prisma.user.findUnique({ where: { id: teacherA.id } });
      expect(freshUser?.role).toBe("TEACHER");
    });

    it("Probe 2.14: Payload role injection is ignored and session determines authorization (HTTP 403)", async () => {
      // Teacher A sends body containing { role: "ADMIN", user: { role: "ADMIN" } }
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: makeSessionCookie(teacherA.id),
        },
        body: JSON.stringify({
          name: `Crafted-Class-${testStamp}`,
          sections: ["A"],
          academicSession: "2025–26",
          role: "ADMIN",
          user: { role: "ADMIN" },
        }),
      });
      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it("Probe 2.15: Unauthenticated request to administrative routes returns HTTP 401", async () => {
      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Unauth Class", sections: ["A"] }),
      });
      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Not signed in");
    });
  });

  // =========================================================================
  // SECTION 3: COOKIE FORGERY, EXPIRATION, AND ACCOUNT DEACTIVATION PROBES
  // =========================================================================
  describe("3. Cookie Forgery, Expiration, and Deactivated Account Probes", () => {
    it("Probe 3.1: Validly signed session cookie allows authenticated requests (HTTP 200)", async () => {
      const validCookie = makeSessionCookie(teacherA.id, 3600);
      const req = new Request("http://localhost/api/me", {
        method: "GET",
        headers: { Cookie: validCookie },
      });
      const res = await getMe(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(teacherA.id);
      expect(data.role).toBe("TEACHER");
    });

    it("Probe 3.2: Cookie with forged / invalid HMAC signature returns HTTP 401", async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const forgedSig = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const forgedCookie = `epb_session=${adminUser.id}.${exp}.${forgedSig}`;

      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: forgedCookie,
        },
        body: JSON.stringify({ name: "Forged Class", sections: ["A"] }),
      });
      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Not signed in");
    });

    it("Probe 3.3: Cookie swapping user ID to Admin while keeping Teacher signature returns HTTP 401", async () => {
      // Teacher A's valid payload and signature
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const teacherPayload = `${teacherA.id}.${exp}`;
      const teacherSig = signCookiePayload(teacherPayload);

      // Attacker swaps userId to adminUser.id but keeps teacher's signature
      const tamperedCookie = `epb_session=${adminUser.id}.${exp}.${teacherSig}`;

      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: tamperedCookie,
        },
        body: JSON.stringify({ name: "Tampered Class", sections: ["A"] }),
      });
      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
    });

    it("Probe 3.4: Expired session cookie returns HTTP 401", async () => {
      // Cookie expired 10 minutes ago
      const expiredCookie = makeSessionCookie(teacherA.id, -600);
      const req = new Request("http://localhost/api/me", {
        method: "GET",
        headers: { Cookie: expiredCookie },
      });
      const res = await getMe(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
    });

    it("Probe 3.5: Malformed cookie strings are safely rejected with HTTP 401", async () => {
      const malformedCases = [
        "epb_session=",
        "epb_session=onlyonepart",
        "epb_session=two.parts",
        "epb_session=four.parts.in.cookie",
        `epb_session=${adminUser.id}.notanumber.validsig`,
        "epb_session=..",
        "epb_session=;;;",
      ];

      for (const cookie of malformedCases) {
        const req = new Request("http://localhost/api/me", {
          method: "GET",
          headers: { Cookie: cookie },
        });
        const res = await getMe(req, { params: Promise.resolve({}) });
        expect(res.status).toBe(401);
      }
    });

    it("Probe 3.6: Deactivated Teacher account receives HTTP 403 on GET /api/me", async () => {
      const cookie = makeSessionCookie(deactivatedTeacher.id, 3600);
      const req = new Request("http://localhost/api/me", {
        method: "GET",
        headers: { Cookie: cookie },
      });
      const res = await getMe(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Account is deactivated");
    });

    it("Probe 3.7: Deactivated Teacher account receives HTTP 403 on paper mutations", async () => {
      const cookie = makeSessionCookie(deactivatedTeacher.id, 3600);

      // Attempt POST /api/papers
      const postReq = new Request("http://localhost/api/papers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({
          title: "Deactivated Paper",
          blueprintId,
          schoolName: "Sarvodaya",
          examType: "ANNUAL",
          layout: "BOOKLET",
        }),
      });
      const postRes = await postPaper(postReq, { params: Promise.resolve({}) });
      expect(postRes.status).toBe(403);
      const postJson = await postRes.json();
      expect(postJson.error).toBe("Account is deactivated");

      // Attempt PATCH /api/papers/[id]
      const patchReq = new Request(`http://localhost/api/papers/${paperA_draftId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({ title: "Deactivated Teacher Edit" }),
      });
      const patchRes = await patchPaper(patchReq, {
        params: Promise.resolve({ id: paperA_draftId }),
      });
      expect(patchRes.status).toBe(403);
      const patchJson = await patchRes.json();
      expect(patchJson.error).toBe("Account is deactivated");
    });

    it("Probe 3.8: Deactivated Administrator account receives HTTP 403 on administrative endpoints", async () => {
      const cookie = makeSessionCookie(deactivatedAdmin.id, 3600);

      const req = new Request("http://localhost/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({
          name: `Deact-Admin-Class-${testStamp}`,
          sections: ["A"],
          academicSession: "2025–26",
        }),
      });
      const res = await postClass(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Account is deactivated");
    });

    it("Probe 3.9: Deactivated user attempting login via POST /api/auth/login receives HTTP 403", async () => {
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: deactivatedTeacher.email,
          password: "password123",
        }),
      });
      const res = await loginPost(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("This account is deactivated");
    });
  });

  // =========================================================================
  // SECTION 4: DIRECT BOUNDARY FUNCTION STRESS & HOD PERMISSION RULES
  // =========================================================================
  describe("4. Direct Boundary Function & HOD Role Stress Probes", () => {
    const teacherUser = {
      id: "u-teacher-1",
      name: "Teacher One",
      email: "t1@school.internal",
      role: "TEACHER" as const,
      department: "Science",
      active: true,
    };

    const hodUser = {
      id: "u-hod-1",
      name: "HOD Science",
      email: "hod@school.internal",
      role: "HOD" as const,
      department: "Science",
      active: true,
    };

    const adminSessionUser = {
      id: "u-admin-1",
      name: "Admin Carol",
      email: "admin@school.internal",
      role: "ADMIN" as const,
      department: "Administration",
      active: true,
    };

    it("Probe 4.1: canModifyPaper returns false for non-owner teacher on draft paper", async () => {
      const { canModifyPaper } = await import("./papers");
      expect(canModifyPaper(teacherUser, { createdById: "u-teacher-2", status: "DRAFT" })).toBe(false);
    });

    it("Probe 4.2: canModifyPaper returns false when createdById is empty string", async () => {
      const { canModifyPaper } = await import("./papers");
      expect(canModifyPaper(teacherUser, { createdById: "", status: "DRAFT" })).toBe(false);
    });

    it("Probe 4.3: canModifyPaper on FINAL paper returns false for both teacher and HOD, true only for ADMIN", async () => {
      const { canModifyPaper } = await import("./papers");
      expect(canModifyPaper(teacherUser, { createdById: teacherUser.id, status: "FINAL" })).toBe(false);
      expect(canModifyPaper(hodUser, { createdById: "u-teacher-1", status: "FINAL" })).toBe(false);
      expect(canModifyPaper(adminSessionUser, { createdById: "u-teacher-1", status: "FINAL" })).toBe(true);
    });

    it("Probe 4.4: assertCanModifyPaper on FINAL paper throws 403 mentioning Administrator unlock", async () => {
      const { assertCanModifyPaper } = await import("./papers");
      expect(() => {
        assertCanModifyPaper(hodUser, { createdById: "u-teacher-1", status: "FINAL" });
      }).toThrowError(/Cannot modify or delete a finalized paper. Only an Administrator can unlock it./);
    });

    it("Probe 4.5: canModifyQuestion returns true for HOD and ADMIN on any question, false for non-owner teacher", async () => {
      const { canModifyQuestion } = await import("./papers");
      expect(canModifyQuestion(teacherUser, { createdById: "u-teacher-2" })).toBe(false);
      expect(canModifyQuestion(teacherUser, { createdById: "" })).toBe(false);
      expect(canModifyQuestion(teacherUser, { createdById: teacherUser.id })).toBe(true);
      expect(canModifyQuestion(hodUser, { createdById: "u-teacher-2" })).toBe(true);
      expect(canModifyQuestion(adminSessionUser, { createdById: "u-teacher-2" })).toBe(true);
    });
  });
});
