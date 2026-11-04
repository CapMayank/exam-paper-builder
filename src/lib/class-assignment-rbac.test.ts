import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  canManageAiSettings,
  canManageClassSettings,
  canManageScope,
  canManageTimetable,
  canManageUsers,
  canModifyPaper,
  canModifyQuestion,
  canViewAudit,
  hasAnyWriteScope,
  normalizeRole,
  type Actor,
} from "./permissions";
import { prisma } from "./prisma";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as postBook } from "../app/api/books/route";
import { DELETE as deleteBook } from "../app/api/books/[id]/route";
import { POST as postChapter } from "../app/api/books/[id]/chapters/route";
import { POST as postQuestion } from "../app/api/questions/route";
import { PATCH as patchQuestion } from "../app/api/questions/[id]/route";
import { POST as postBlueprint } from "../app/api/blueprints/route";
import { POST as postPaper } from "../app/api/papers/route";
import { PATCH as patchPaper } from "../app/api/papers/[id]/route";
import { POST as duplicatePaper } from "../app/api/papers/[id]/duplicate/route";
import { PATCH as patchClass } from "../app/api/classes/[id]/route";
import { POST as postClassSubject } from "../app/api/classes/[id]/subjects/route";
import { GET as getUsers, POST as postUser } from "../app/api/users/route";
import { PATCH as patchUser } from "../app/api/users/[id]/route";
import { GET as getMe } from "../app/api/me/route";
import { GET as getAudit } from "../app/api/audit/route";
import { POST as postTimetable } from "../app/api/exam-cell/timetable/route";

// ---------------------------------------------------------------------------
// 1. The matrix as pure functions (shared by API and UI)
// ---------------------------------------------------------------------------

const admin: Actor = { id: "a", role: "ADMIN", assignments: [] };
const superAdmin: Actor = { id: "sa", role: "SUPER_ADMIN", assignments: [] };
const exam: Actor = { id: "e", role: "EXAM_CELL", assignments: [] };
const inCharge: Actor = { id: "c", role: "TEACHER", assignments: [{ className: "Class 10", subject: "" }] };
const mathsTeacher: Actor = { id: "m", role: "TEACHER", assignments: [{ className: "Class 10", subject: "Mathematics" }] };
const unassigned: Actor = { id: "u", role: "TEACHER", assignments: [] };
const legacyHod: Actor = { id: "h", role: "HOD", assignments: [] };

const c10maths = { className: "Class 10", subject: "Mathematics" };
const c10science = { className: "Class 10", subject: "Science" };
const c9maths = { className: "Class 9", subject: "Mathematics" };

describe("permission matrix (pure)", () => {
  it("HOD and unknown roles read as Teacher; Admin and Exam Cell stay", () => {
    expect(normalizeRole("HOD")).toBe("TEACHER");
    expect(normalizeRole("PRINCIPAL")).toBe("TEACHER");
    expect(normalizeRole(undefined)).toBe("TEACHER");
    expect(normalizeRole("ADMIN")).toBe("ADMIN");
    expect(normalizeRole("EXAM_CELL")).toBe("EXAM_CELL");
  });

  it.each([
    ["admin", admin, c10maths, true],
    ["admin", admin, c9maths, true],
    ["in-charge in own class, any subject", inCharge, c10science, true],
    ["in-charge in another class", inCharge, c9maths, false],
    ["subject teacher, own subject", mathsTeacher, c10maths, true],
    ["subject teacher, other subject same class", mathsTeacher, c10science, false],
    ["subject teacher, same subject other class", mathsTeacher, c9maths, false],
    ["unassigned teacher", unassigned, c10maths, false],
    ["exam cell", exam, c10maths, false],
    ["legacy HOD", legacyHod, c10maths, false],
  ] as const)("canManageScope: %s", (_label, actor, scope, expected) => {
    expect(canManageScope(actor, scope)).toBe(expected);
  });

  it("matches class and subject names case- and space-insensitively", () => {
    expect(canManageScope(mathsTeacher, { className: " class  10 ", subject: "MATHEMATICS" })).toBe(true);
  });

  it("class settings: Admin and the Class In-charge only", () => {
    expect(canManageClassSettings(admin, "Class 10")).toBe(true);
    expect(canManageClassSettings(inCharge, "Class 10")).toBe(true);
    expect(canManageClassSettings(inCharge, "Class 9")).toBe(false);
    expect(canManageClassSettings(mathsTeacher, "Class 10")).toBe(false);
    expect(canManageClassSettings(exam, "Class 10")).toBe(false);
  });

  it("papers: creator keeps own drafts, scope opens others' drafts, FINAL is Admin-only", () => {
    const draft = { createdById: "someone", status: "DRAFT", blueprint: { book: c10maths } };
    expect(canModifyPaper(mathsTeacher, draft)).toBe(true);
    expect(canModifyPaper(inCharge, draft)).toBe(true);
    expect(canModifyPaper(unassigned, draft)).toBe(false);
    expect(canModifyPaper(exam, draft)).toBe(false);
    expect(canModifyPaper(unassigned, { ...draft, createdById: "u" })).toBe(true);
    const final = { ...draft, status: "FINAL" };
    expect(canModifyPaper(mathsTeacher, final)).toBe(false);
    expect(canModifyPaper(inCharge, { ...final, createdById: "c" })).toBe(false);
    expect(canModifyPaper(admin, final)).toBe(true);
  });

  it("questions: creator, assigned teacher or Admin", () => {
    const q = { createdById: "someone", book: c10science };
    expect(canModifyQuestion(inCharge, q)).toBe(true);
    expect(canModifyQuestion(mathsTeacher, q)).toBe(false);
    expect(canModifyQuestion(mathsTeacher, { ...q, createdById: "m" })).toBe(true);
    expect(canModifyQuestion(admin, q)).toBe(true);
    expect(canModifyQuestion(exam, q)).toBe(false);
  });

  it("school-wide powers", () => {
    // accounts, roles and class assignments belong to the Super Admin alone
    for (const a of [admin, inCharge, mathsTeacher, unassigned, exam]) {
      expect(canManageUsers(a)).toBe(false);
      expect(canManageAiSettings(a)).toBe(false);
    }
    expect(canManageUsers(superAdmin)).toBe(true);
    expect(canManageAiSettings(superAdmin)).toBe(true);
    expect(canManageTimetable(exam)).toBe(true);
    expect(canViewAudit(exam)).toBe(true);
    expect(canManageTimetable(inCharge)).toBe(false);
    expect(canViewAudit(mathsTeacher)).toBe(false);
    expect(hasAnyWriteScope(unassigned)).toBe(false);
    expect(hasAnyWriteScope(mathsTeacher)).toBe(true);
    expect(hasAnyWriteScope(exam)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. The matrix enforced by the API routes
// ---------------------------------------------------------------------------

const stamp = Date.now();
const CLASS = `RBAC Class ${stamp}`;
const OTHER = `RBAC Other ${stamp}`;

function req(url: string, method: string, json?: unknown) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
}
const p = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
async function as<T>(userId: string, run: () => Promise<Response>): Promise<{ status: number; json: T }> {
  mockSessionUserId = userId;
  const res = await run();
  return { status: res.status, json: (await res.json()) as T };
}

describe("permission matrix (API routes)", () => {
  const ids = {} as Record<"superAdmin" | "admin" | "inCharge" | "maths" | "unassigned" | "exam" | "hod", string>;
  let mathsBookId = "";
  let scienceBookId = "";
  let otherBookId = "";
  let mathsChapterId = "";
  let scienceChapterId = "";
  let mathsBlueprintId = "";
  let classId = "";
  const paperIds: string[] = [];

  beforeAll(async () => {
    const mk = (key: keyof typeof ids, role: string, assignments: { className: string; subject: string }[] = []) =>
      prisma.user
        .create({
          data: {
            name: `${key} ${stamp}`,
            email: `rbac-${key}-${stamp}@test.internal`,
            passwordHash: "x",
            role,
            assignments: { create: assignments },
          },
        })
        .then((u) => (ids[key] = u.id));
    await mk("superAdmin", "SUPER_ADMIN");
    await mk("admin", "ADMIN");
    await mk("inCharge", "TEACHER", [{ className: CLASS, subject: "" }]);
    await mk("maths", "TEACHER", [{ className: CLASS, subject: "Mathematics" }]);
    await mk("unassigned", "TEACHER");
    await mk("exam", "EXAM_CELL");
    await mk("hod", "HOD"); // legacy row as it exists before migrate-rbac.mjs runs

    const mkBook = async (className: string, subject: string) => {
      const b = await prisma.book.create({ data: { title: `${subject} ${stamp}`, className, subject, academicSession: "2026–27" } });
      const ch = await prisma.chapter.create({ data: { bookId: b.id, number: 1, title: "Ch 1" } });
      return [b.id, ch.id] as const;
    };
    [mathsBookId, mathsChapterId] = await mkBook(CLASS, "Mathematics");
    [scienceBookId, scienceChapterId] = await mkBook(CLASS, "Science");
    [otherBookId] = await mkBook(OTHER, "Mathematics");

    const bp = await prisma.blueprint.create({
      data: {
        name: `BP ${stamp}`,
        bookId: mathsBookId,
        examType: "QUARTERLY",
        durationMin: 60,
        sections: { create: [{ position: 1, title: "A", type: "SHORT", count: 1, marksEach: 2 }] },
        chapters: { create: [{ chapterId: mathsChapterId, marks: 2 }] },
      },
    });
    mathsBlueprintId = bp.id;

    const cls = await prisma.academicClass.create({ data: { name: CLASS, academicSession: "2026–27" } });
    classId = cls.id;
  });

  afterAll(async () => {
    const userIds = Object.values(ids);
    await prisma.paper.deleteMany({ where: { OR: [{ id: { in: paperIds } }, { blueprintId: mathsBlueprintId }] } });
    await prisma.blueprint.deleteMany({ where: { book: { className: { in: [CLASS, OTHER] } } } });
    await prisma.question.deleteMany({ where: { book: { className: { in: [CLASS, OTHER] } } } });
    await prisma.book.deleteMany({ where: { className: { in: [CLASS, OTHER] } } });
    await prisma.academicClass.deleteMany({ where: { name: { in: [CLASS, OTHER] } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { email: { contains: `-${stamp}@test.internal` } } });
  });

  it("route() treats a legacy HOD row as an unassigned Teacher", async () => {
    const me = await as<{ role: string }>(ids.hod, () => getMe(req("/api/me", "GET"), p()));
    expect(me.json.role).toBe("TEACHER");
    const r = await as(ids.hod, () => postBook(req("/api/books", "POST", { title: "x", className: CLASS, subject: "Mathematics" }), p()));
    expect(r.status).toBe(403);
  });

  it("books: subject teacher adds a book in their subject, not in another subject or class", async () => {
    const ok = await as<{ id: string }>(ids.maths, () =>
      postBook(req("/api/books", "POST", { title: `Maths extra ${stamp}`, className: CLASS, subject: "Mathematics" }), p()),
    );
    expect(ok.status).toBe(200);
    const wrongSubject = await as(ids.maths, () =>
      postBook(req("/api/books", "POST", { title: "x", className: CLASS, subject: "Science" }), p()),
    );
    expect(wrongSubject.status).toBe(403);
    const wrongClass = await as(ids.maths, () =>
      postBook(req("/api/books", "POST", { title: "x", className: OTHER, subject: "Mathematics" }), p()),
    );
    expect(wrongClass.status).toBe(403);
    const del = await as(ids.maths, () => deleteBook(req(`/api/books/${ok.json.id}`, "DELETE"), p({ id: ok.json.id })));
    expect(del.status).toBe(200);
  });

  it("chapters: in-charge can add to any subject of the class; exam cell cannot", async () => {
    const ok = await as(ids.inCharge, () =>
      postChapter(req(`/api/books/${scienceBookId}/chapters`, "POST", { number: 2, title: "Ch 2" }), p({ id: scienceBookId })),
    );
    expect(ok.status).toBe(200);
    const exam = await as(ids.exam, () =>
      postChapter(req(`/api/books/${scienceBookId}/chapters`, "POST", { number: 3, title: "Ch 3" }), p({ id: scienceBookId })),
    );
    expect(exam.status).toBe(403);
  });

  it("questions: create within scope; edit others' only within scope", async () => {
    const q = { bookId: scienceBookId, chapterId: scienceChapterId, type: "SHORT", text: "Define force.", answer: "" };
    const byInCharge = await as<{ id: string }>(ids.inCharge, () => postQuestion(req("/api/questions", "POST", q), p()));
    expect(byInCharge.status).toBe(200);
    const byMaths = await as(ids.maths, () => postQuestion(req("/api/questions", "POST", q), p()));
    expect(byMaths.status).toBe(403);
    const byUnassigned = await as(ids.unassigned, () => postQuestion(req("/api/questions", "POST", q), p()));
    expect(byUnassigned.status).toBe(403);

    const qid = byInCharge.json.id;
    const editByMaths = await as(ids.maths, () =>
      patchQuestion(req(`/api/questions/${qid}`, "PATCH", { text: "Changed" }), p({ id: qid })),
    );
    expect(editByMaths.status).toBe(403);
    const editByAdmin = await as(ids.admin, () =>
      patchQuestion(req(`/api/questions/${qid}`, "PATCH", { text: "Define force (admin)." }), p({ id: qid })),
    );
    expect(editByAdmin.status).toBe(200);
  });

  it("blueprints: only for the user's class/subject", async () => {
    const body = (bookId: string, chapterId: string) => ({
      name: `BP2 ${stamp}`,
      bookId,
      examType: "QUARTERLY",
      durationMin: 60,
      sections: [{ title: "A", type: "SHORT", count: 1, marksEach: 2 }],
      chapters: [{ chapterId, marks: 2 }],
    });
    const ok = await as(ids.maths, () => postBlueprint(req("/api/blueprints", "POST", body(mathsBookId, mathsChapterId)), p()));
    expect(ok.status).toBe(200);
    const denied = await as(ids.maths, () =>
      postBlueprint(req("/api/blueprints", "POST", body(scienceBookId, scienceChapterId)), p()),
    );
    expect(denied.status).toBe(403);
  });

  it("papers: subject teacher creates, a colleague in scope edits, outsiders and exam cell cannot", async () => {
    const created = await as<{ id: string }>(ids.maths, () =>
      postPaper(req("/api/papers", "POST", { title: `Paper ${stamp}`, blueprintId: mathsBlueprintId, layout: "PAGE", schoolName: "Sarvodaya" }), p()),
    );
    expect(created.status).toBe(200);
    const pid = created.json.id;
    paperIds.push(pid);

    const byUnassigned = await as(ids.unassigned, () =>
      postPaper(req("/api/papers", "POST", { title: "x", blueprintId: mathsBlueprintId, layout: "PAGE", schoolName: "S" }), p()),
    );
    expect(byUnassigned.status).toBe(403);

    const editInCharge = await as(ids.inCharge, () => patchPaper(req(`/api/papers/${pid}`, "PATCH", { title: `Edited ${stamp}` }), p({ id: pid })));
    expect(editInCharge.status).toBe(200);
    const editExam = await as(ids.exam, () => patchPaper(req(`/api/papers/${pid}`, "PATCH", { title: "x" }), p({ id: pid })));
    expect(editExam.status).toBe(403);
    const dupExam = await as(ids.exam, () => duplicatePaper(req(`/api/papers/${pid}/duplicate`, "POST", {}), p({ id: pid })));
    expect(dupExam.status).toBe(403);

    // Once FINAL (an empty paper can't be finalised through the API, so set it directly), only the Admin can reopen.
    await prisma.paper.update({ where: { id: pid }, data: { status: "FINAL" } });
    const reopenTeacher = await as(ids.maths, () => patchPaper(req(`/api/papers/${pid}`, "PATCH", { status: "DRAFT" }), p({ id: pid })));
    expect(reopenTeacher.status).toBe(403);
    const reopenAdmin = await as(ids.admin, () => patchPaper(req(`/api/papers/${pid}`, "PATCH", { status: "DRAFT" }), p({ id: pid })));
    expect(reopenAdmin.status).toBe(200);
  });

  it("class settings: in-charge edits sections and subjects of their class, cannot rename it", async () => {
    const sections = await as(ids.inCharge, () =>
      patchClass(req(`/api/classes/${classId}`, "PATCH", { sections: ["A", "B"] }), p({ id: classId })),
    );
    expect(sections.status).toBe(200);
    const subject = await as(ids.inCharge, () =>
      postClassSubject(req(`/api/classes/${classId}/subjects`, "POST", { name: "Sanskrit" }), p({ id: classId })),
    );
    expect(subject.status).toBe(200);
    const rename = await as(ids.inCharge, () =>
      patchClass(req(`/api/classes/${classId}`, "PATCH", { name: `${CLASS} renamed` }), p({ id: classId })),
    );
    expect(rename.status).toBe(403);
    const bySubjectTeacher = await as(ids.maths, () =>
      patchClass(req(`/api/classes/${classId}`, "PATCH", { sections: ["A"] }), p({ id: classId })),
    );
    expect(bySubjectTeacher.status).toBe(403);
  });

  it("users and assignments: Super Admin only; assignments are cleaned and dropped for non-teachers", async () => {
    expect((await as(ids.inCharge, () => getUsers(req("/api/users", "GET"), p()))).status).toBe(403);
    expect((await as(ids.exam, () => getUsers(req("/api/users", "GET"), p()))).status).toBe(403);
    expect((await as(ids.admin, () => getUsers(req("/api/users", "GET"), p()))).status).toBe(403);

    const created = await as<{ id: string; assignments: { className: string; subject: string }[] }>(ids.superAdmin, () =>
      postUser(
        req("/api/users", "POST", {
          name: "New Teacher",
          email: `rbac-new-${stamp}@test.internal`,
          password: "secret1",
          role: "TEACHER",
          assignments: [
            { className: CLASS, subject: "Science" },
            { className: CLASS, subject: "" },
            { className: CLASS, subject: "" },
            { className: OTHER, subject: "Mathematics" },
          ],
        }),
        p(),
      ),
    );
    expect(created.status).toBe(200);
    // In-charge of CLASS swallows the Science line; duplicates removed.
    expect(created.json.assignments).toEqual([
      { className: CLASS, subject: "" },
      { className: OTHER, subject: "Mathematics" },
    ]);

    const nid = created.json.id;
    const toExam = await as<{ role: string; assignments: unknown[] }>(ids.superAdmin, () =>
      patchUser(req(`/api/users/${nid}`, "PATCH", { role: "EXAM_CELL" }), p({ id: nid })),
    );
    expect(toExam.json.role).toBe("EXAM_CELL");
    expect(toExam.json.assignments).toEqual([]);

    const byTeacher = await as(ids.inCharge, () =>
      patchUser(req(`/api/users/${nid}`, "PATCH", { assignments: [{ className: OTHER, subject: "" }] }), p({ id: nid })),
    );
    expect(byTeacher.status).toBe(403);
  });

  it("exam logistics: timetable and audit for Exam Cell and Admin, not teachers", async () => {
    const entry = {
      title: `Exam ${stamp}`,
      className: CLASS,
      subject: "Mathematics",
      examDate: "2027-03-01",
      startTime: "09:00",
      endTime: "12:00",
    };
    expect((await as(ids.inCharge, () => postTimetable(req("/api/exam-cell/timetable", "POST", entry), p()))).status).toBe(403);
    const ok = await as<{ id: string }>(ids.exam, () => postTimetable(req("/api/exam-cell/timetable", "POST", entry), p()));
    expect(ok.status).toBe(200);
    await prisma.examTimetableEntry.deleteMany({ where: { title: `Exam ${stamp}` } });

    expect((await as(ids.maths, () => getAudit(req("/api/audit", "GET"), p()))).status).toBe(403);
    expect((await as(ids.exam, () => getAudit(req("/api/audit", "GET"), p()))).status).toBe(200);
  });

  it("everyone can still read and browse the whole bank", async () => {
    const otherBook = await prisma.book.findUnique({ where: { id: otherBookId } });
    expect(otherBook).not.toBeNull();
    const me = await as<{ assignments: unknown[] }>(ids.unassigned, () => getMe(req("/api/me", "GET"), p()));
    expect(me.status).toBe(200);
    expect(me.json.assignments).toEqual([]);
  });
});
