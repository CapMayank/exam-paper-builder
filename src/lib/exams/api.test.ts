import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { loadPaperView } from "@/lib/papers";
import { buildPaperDocx } from "@/lib/paperDocx";
import type { ExamListItem, ExamView } from "./types";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { GET as listExams, POST as createExam } from "../../app/api/exams/route";
import { DELETE as deleteExam, GET as getExam, PATCH as patchExam } from "../../app/api/exams/[id]/route";
import { POST as copyExam } from "../../app/api/exams/[id]/copy/route";
import { POST as addBlock } from "../../app/api/exams/[id]/blocks/route";
import { DELETE as deleteBlockRoute, PATCH as patchBlock } from "../../app/api/exams/[id]/blocks/[blockId]/route";
import { PUT as putCell } from "../../app/api/exams/[id]/cells/route";
import { PATCH as patchSlot } from "../../app/api/exams/[id]/slots/[slotId]/route";
import { GET as printedPrompt } from "../../app/api/exams/printed-prompt/route";
import { GET as getSetup } from "../../app/api/exams/[id]/setup/route";
import { POST as createDrafts } from "../../app/api/exams/[id]/create-drafts/route";
import { POST as addBooks } from "../../app/api/exams/[id]/add-books/route";
import { POST as createPaper } from "../../app/api/papers/route";

const stamp = `${Date.now()}`;
function req(url: string, method: string, json?: unknown) {
  return new Request(`http://localhost${url || "/api/exams/x"}`, {
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

describe("exams API", () => {
  const ids = { admin: "", examCell: "", teacher: "" };
  const examIds: string[] = [];

  beforeAll(async () => {
    for (const [key, role] of [
      ["admin", "ADMIN"],
      ["examCell", "EXAM_CELL"],
      ["teacher", "TEACHER"],
    ] as const) {
      const u = await prisma.user.create({
        data: { name: `${key} ${stamp}`, email: `exams-${key}-${stamp}@test.internal`, passwordHash: "x", role },
      });
      ids[key] = u.id;
    }
  });

  afterAll(async () => {
    await prisma.exam.deleteMany({ where: { id: { in: examIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: Object.values(ids) } } });
    await prisma.user.deleteMany({ where: { email: { contains: `-${stamp}@test.internal` } } });
  });

  it("is closed to teachers and open to Exam Cell", async () => {
    expect((await as(ids.teacher, () => listExams(req("/api/exams", "GET"), p()))).status).toBe(403);
    const made = await as<ExamView>(ids.examCell, () =>
      createExam(req("/api/exams", "POST", { name: `Cell ${stamp}`, examType: "PRE_BOARD", academicSession: "2026–27" }), p()),
    );
    expect(made.status).toBe(200);
    examIds.push(made.json.id);
  });

  it("refuses an impossible date", async () => {
    const made = await as<ExamView>(ids.admin, () =>
      createExam(req("/api/exams", "POST", { name: `Bad ${stamp}`, examType: "UNIT_TEST", academicSession: "2026–27" }), p()),
    );
    examIds.push(made.json.id);
    const block = await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "Only", timeText: "9 to 10" }), p({ id: made.json.id })));
    const bad = await as<{ error: string }>(ids.admin, () =>
      patchBlock(req("", "PATCH", { addDate: "2026-02-30" }), p({ id: made.json.id, blockId: block.json.blocks[0].id })),
    );
    expect(bad.status).toBe(400);
  });

  it("keeps block positions unique after a block is deleted and another added", async () => {
    const made = await as<ExamView>(ids.admin, () =>
      createExam(req("/api/exams", "POST", { name: `Order ${stamp}`, examType: "UNIT_TEST", academicSession: "2026–27" }), p()),
    );
    const examId = made.json.id;
    examIds.push(examId);
    let view = made.json;
    for (const title of ["A", "B", "C"]) view = (await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title, timeText: "" }), p({ id: examId })))).json;
    const a = view.blocks.find((b) => b.title === "A")!.id;
    await as(ids.admin, () => deleteBlockRoute(req("", "DELETE"), p({ id: examId, blockId: a })));
    view = (await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "D", timeText: "" }), p({ id: examId })))).json;
    expect(view.blocks.map((b) => b.title)).toEqual(["B", "C", "D"]);
    expect(new Set(view.blocks.map((b) => b.position)).size).toBe(3);
  });

  it("refuses a date with an unlikely year, as typed digit by digit into a date box", async () => {
    const made = await as<ExamView>(ids.admin, () =>
      createExam(req("/api/exams", "POST", { name: `Year ${stamp}`, examType: "UNIT_TEST", academicSession: "2026–27" }), p()),
    );
    examIds.push(made.json.id);
    const b = (await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "Only", timeText: "" }), p({ id: made.json.id })))).json.blocks[0].id;
    for (const bad of ["0002-12-10", "0202-12-10", "2201-12-10"]) {
      const res = await as<{ error: string }>(ids.admin, () => patchBlock(req("", "PATCH", { addDate: bad }), p({ id: made.json.id, blockId: b })));
      expect(res.status, bad).toBe(400);
    }
  });

  it("stores the session with an en dash however it is typed", async () => {
    const made = await as<ExamView>(ids.admin, () =>
      createExam(req("/api/exams", "POST", { name: `Dash ${stamp}`, examType: "UNIT_TEST", academicSession: "2026-27" }), p()),
    );
    examIds.push(made.json.id);
    expect(made.json.academicSession).toBe("2026–27");
    const updated = await as<ExamView>(ids.admin, () => patchExam(req("", "PATCH", { academicSession: " 2027-28 " }), p({ id: made.json.id })));
    expect(updated.json.academicSession).toBe("2027–28");
    const long = await as<ExamView>(ids.admin, () => patchExam(req("", "PATCH", { academicSession: "2026-2027" }), p({ id: made.json.id })));
    expect(long.json.academicSession).toBe("2026–27");
  });

  it("holds two papers in one cell and keeps each subject to one day", async () => {
    const made = await as<ExamView>(ids.admin, () =>
      createExam(req("/api/exams", "POST", { name: `Pair ${stamp}`, examType: "HALF_YEARLY", academicSession: "2026–27" }), p()),
    );
    const examId = made.json.id;
    examIds.push(examId);
    const b = (await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "Primary", timeText: "11:00 am to 01:30 pm" }), p({ id: examId })))).json.blocks[0].id;
    for (const d of ["2026-12-11", "2026-12-22"]) await as(ids.admin, () => patchBlock(req("", "PATCH", { addDate: d }), p({ id: examId, blockId: b })));
    await as(ids.admin, () => patchBlock(req("", "PATCH", { addClass: "Class 5" }), p({ id: examId, blockId: b })));
    const put = (date: string, subjects: string[]) =>
      as<{ exam: ExamView; error?: string }>(ids.admin, () => putCell(req("", "PUT", { blockId: b, className: "Class 5", date, subjects }), p({ id: examId })));

    expect((await put("2026-12-11", ["English"])).status).toBe(200);
    const pair = await put("2026-12-22", ["General Knowledge", "Drawing"]);
    expect(pair.status).toBe(200);
    expect(pair.json.exam.slots.filter((x) => x.examDate === "2026-12-22").map((x) => x.subject).sort()).toEqual(["Drawing", "General Knowledge"]);

    const three = await put("2026-12-22", ["General Knowledge", "Drawing", "Hindi"]);
    expect(three.status).toBe(400);
    const again = await put("2026-12-22", ["English"]);
    expect(again.status).toBe(400);
    expect(again.json.error).toBe("English is already on 11/12/2026 for Class 5");

    // two edits of one cell at the same moment never leave the same subject twice
    mockSessionUserId = ids.admin;
    await Promise.all([
      putCell(req("", "PUT", { blockId: b, className: "Class 5", date: "2026-12-22", subjects: ["General Knowledge"] }), p({ id: examId })),
      putCell(req("", "PUT", { blockId: b, className: "Class 5", date: "2026-12-22", subjects: ["General Knowledge"] }), p({ id: examId })),
    ]);
    await put("2026-12-22", []);
    await Promise.all([
      putCell(req("", "PUT", { blockId: b, className: "Class 5", date: "2026-12-22", subjects: ["Drawing"] }), p({ id: examId })),
      putCell(req("", "PUT", { blockId: b, className: "Class 5", date: "2026-12-22", subjects: ["Drawing"] }), p({ id: examId })),
    ]);
    expect(await prisma.examSlot.count({ where: { examId, className: "Class 5", examDate: "2026-12-22", subject: "Drawing" } })).toBe(1);

    // an older exam may already repeat a subject on two dates: editing that cell must still work
    await prisma.examSlot.create({ data: { examId, blockId: b, className: "Class 5", examDate: "2026-12-22", subject: "English" } });
    const legacy = await put("2026-12-22", ["Drawing", "English"]);
    expect(legacy.status).toBe(200);
    // adding a repeat is still refused
    await put("2026-12-22", ["Drawing"]);
    expect((await put("2026-12-22", ["Drawing", "English"])).status).toBe(400);

    // the old single-subject form still works: it replaces the cell
    const single = await as<{ exam: ExamView }>(ids.admin, () =>
      putCell(req("", "PUT", { blockId: b, className: "Class 5", date: "2026-12-22", subject: "Drawing" }), p({ id: examId })),
    );
    expect(single.json.exam.slots.filter((x) => x.examDate === "2026-12-22").map((x) => x.subject)).toEqual(["Drawing"]);
  });

  it("builds a date sheet, moves a date and tracks printing", async () => {
    const made = await as<ExamView>(ids.admin, () =>
      createExam(req("/api/exams", "POST", { name: `Half Yearly ${stamp}`, examType: "HALF_YEARLY", academicSession: "2026–27" }), p()),
    );
    const examId = made.json.id;
    examIds.push(examId);
    expect(made.json.status).toBe("DRAFT");

    const high = await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "High School", timeText: "11:00 am to 02:00 pm" }), p({ id: examId })));
    const middle = await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "Middle School", timeText: "11:00 am to 02:00 pm" }), p({ id: examId })));
    const b1 = high.json.blocks[0].id;
    const b2 = middle.json.blocks[1].id;
    const patch = (blockId: string, body: unknown) =>
      as<ExamView & { error?: string }>(ids.admin, () => patchBlock(req("", "PATCH", body), p({ id: examId, blockId })));

    await patch(b1, { addDate: "2026-12-10" });
    await patch(b1, { addDate: "2026-12-12" });
    await patch(b1, { addClass: "Class 10" });
    await patch(b1, { addClass: "Class 12" });

    const dupClass = await patch(b2, { addClass: "Class 10" });
    expect(dupClass.status).toBe(400);
    expect(dupClass.json.error).toBe("Class 10 is already in High School");

    const cell = (className: string, date: string, subject: string | null) =>
      as<{ slot: unknown }>(ids.admin, () => putCell(req("", "PUT", { blockId: b1, className, date, subject }), p({ id: examId })));
    expect((await cell("Class 10", "2026-12-10", "Mathematics")).status).toBe(200);
    await cell("Class 12", "2026-12-10", "Chemistry");
    await cell("Class 10", "2026-12-12", "Science");

    const clash = await patch(b1, { moveDate: { from: "2026-12-10", to: "2026-12-12" } });
    expect(clash.status).toBe(400);
    expect(clash.json.error).toBe("12/12/2026 is already a date in High School");

    const moved = await patch(b1, { moveDate: { from: "2026-12-10", to: "2026-12-11" } });
    expect(moved.status).toBe(200);
    expect(moved.json.blocks[0].dates).toEqual(["2026-12-11", "2026-12-12"]);
    expect(moved.json.slots.filter((s) => s.examDate === "2026-12-11").map((s) => s.subject).sort()).toEqual(["Chemistry", "Mathematics"]);

    await cell("Class 12", "2026-12-11", null);
    let view = (await as<ExamView>(ids.admin, () => getExam(req("", "GET"), p({ id: examId })))).json;
    expect(view.slots).toHaveLength(2);

    const maths = view.slots.find((s) => s.subject === "Mathematics")!;
    const printed = await as<ExamView>(ids.examCell, () => patchSlot(req("", "PATCH", { printed: true }), p({ id: examId, slotId: maths.id })));
    expect(printed.status).toBe(200);
    view = printed.json;
    const after = view.slots.find((s) => s.id === maths.id)!;
    expect(after.status).toBe("PRINTED");
    expect(after.printedByName).toBe(`examCell ${stamp}`);

    // moving a printed slot's date flags it for a reprint
    const moved2 = await patch(b1, { moveDate: { from: "2026-12-11", to: "2026-12-14" } });
    expect(moved2.json.slots.find((s) => s.id === maths.id)!.warnings).toContain("DATE_CHANGED_AFTER_PRINT");

    // removing a date drops its slots
    const removed = await patch(b1, { removeDate: "2026-12-12" });
    expect(removed.json.slots.map((s) => s.subject)).toEqual(["Mathematics"]);

    const list = await as<ExamListItem[]>(ids.admin, () => listExams(req("/api/exams", "GET"), p()));
    expect(list.json.find((e) => e.id === examId)!.summary).toMatchObject({ total: 1, printed: 1, ready: 1 });

    const circulated = await as<ExamView>(ids.admin, () =>
      patchExam(req("", "PATCH", { status: "CIRCULATED", signatureMode: "BLANK" }), p({ id: examId })),
    );
    expect(circulated.json).toMatchObject({ status: "CIRCULATED", signatureMode: "BLANK" });

    // instructions are off until turned on, and keep the text they are given
    expect(circulated.json).toMatchObject({ showInstructions: false, instructions: "" });
    const notes = await as<ExamView>(ids.admin, () =>
      patchExam(req("", "PATCH", { showInstructions: true, instructions: "Reach by 10:45 am.\nBring your ID card." }), p({ id: examId })),
    );
    expect(notes.json).toMatchObject({ showInstructions: true, instructions: "Reach by 10:45 am.\nBring your ID card." });

    const copy = await as<{ id: string }>(ids.admin, () => copyExam(req("", "POST"), p({ id: examId })));
    examIds.push(copy.json.id);
    const copied = (await as<ExamView>(ids.admin, () => getExam(req("", "GET"), p({ id: copy.json.id })))).json;
    expect(copied.name).toBe(`Half Yearly ${stamp} (copy)`);
    expect(copied.status).toBe("DRAFT");
    expect(copied).toMatchObject({ showInstructions: true, instructions: "Reach by 10:45 am.\nBring your ID card." });
    expect(copied.blocks.map((b) => b.title)).toEqual(["High School", "Middle School"]);
    expect(copied.slots).toHaveLength(1);
    expect(copied.slots[0]).toMatchObject({ subject: "Mathematics", examDate: "2026-12-14", printedAt: null, paper: null });

    expect((await as(ids.admin, () => deleteExam(req("", "DELETE"), p({ id: copy.json.id })))).status).toBe(200);
    expect(await prisma.examSlot.count({ where: { examId: copy.json.id } })).toBe(0);
  });

  it("gives linked papers the exam's date and moves it with the date column", async () => {
    const cls = `Exam Sync ${stamp}`;
    const book = await prisma.book.create({ data: { title: "Maths", subject: "Mathematics", className: cls, academicSession: "2026–27" } });
    const bp = await prisma.blueprint.create({
      data: { name: "HY Maths", bookId: book.id, academicSession: "2026–27", examType: "HALF_YEARLY", durationMin: 180 },
    });
    const paper = await prisma.paper.create({
      data: { title: "HY Maths", blueprintId: bp.id, layout: "PAGE", schoolName: "S", academicSession: "2026–27", examType: "HALF_YEARLY", status: "FINAL", createdById: ids.admin },
    });
    try {
      const made = await as<ExamView>(ids.admin, () =>
        createExam(req("/api/exams", "POST", { name: `Sync ${stamp}`, examType: "HALF_YEARLY", academicSession: "2026–27" }), p()),
      );
      const examId = made.json.id;
      examIds.push(examId);
      const withBlock = await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "Only", timeText: "11 to 2" }), p({ id: examId })));
      const b = withBlock.json.blocks[0].id;
      await as(ids.admin, () => patchBlock(req("", "PATCH", { addDate: "2026-12-10" }), p({ id: examId, blockId: b })));
      await as(ids.admin, () => patchBlock(req("", "PATCH", { addClass: cls }), p({ id: examId, blockId: b })));
      const set = await as<{ exam: ExamView }>(ids.admin, () =>
        putCell(req("", "PUT", { blockId: b, className: cls, date: "2026-12-10", subject: "Mathematics" }), p({ id: examId })),
      );
      const slot = set.json.exam.slots[0];
      expect(slot.paper?.id).toBe(paper.id);
      expect(slot.status).toBe("FINAL");
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).examDate).toBe("2026-12-10");

      // the block's time ("11 to 2" = 3 hours) becomes the paper's time; the blueprint's own time stays the default
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).durationMin).toBe(180);
      expect((await loadPaperView(paper.id))!.blueprint.durationMin).toBe(180);
      await as(ids.admin, () => patchBlock(req("", "PATCH", { timeText: "11:00 am to 01:30 pm" }), p({ id: examId, blockId: b })));
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).durationMin).toBe(150);
      // the Word export prints the same time as the printed paper
      const docx = await buildPaperDocx(paper.id, false, { id: ids.admin, name: "admin", email: "a@x", role: "ADMIN", active: true, assignments: [] });
      const { default: JSZip } = await import("jszip");
      const docText = (await (await JSZip.loadAsync(docx.buffer)).file("word/document.xml")!.async("string")).replace(/<[^>]+>/g, "");
      expect(docText).toMatch(/Time Allowed: 2 hr 30/);
      await as(ids.admin, () => patchBlock(req("", "PATCH", { timeText: "to be announced" }), p({ id: examId, blockId: b })));
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).durationMin).toBeNull();
      expect((await loadPaperView(paper.id))!.blueprint.durationMin).toBe(180);
      await as(ids.admin, () => patchBlock(req("", "PATCH", { timeText: "11 to 2" }), p({ id: examId, blockId: b })));

      // a second paper the same day: both keep their blueprint time
      const two = await as<{ exam: ExamView }>(ids.admin, () =>
        putCell(req("", "PUT", { blockId: b, className: cls, date: "2026-12-10", subjects: ["Mathematics", "Drawing"] }), p({ id: examId })),
      );
      expect(two.json.exam.slots.map((x) => x.subject).sort()).toEqual(["Drawing", "Mathematics"]);
      expect(two.json.exam.slots.find((x) => x.subject === "Mathematics")!.paper?.id).toBe(paper.id);
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).durationMin).toBeNull();
      await as(ids.admin, () => putCell(req("", "PUT", { blockId: b, className: cls, date: "2026-12-10", subjects: ["Mathematics"] }), p({ id: examId })));
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).durationMin).toBe(180);

      // a paper that leaves the date sheet goes back to its blueprint's time
      const linkedSlot = (await prisma.examSlot.findFirstOrThrow({ where: { paperId: paper.id } })).id;
      await as(ids.admin, () => patchSlot(req("", "PATCH", { paperId: null }), p({ id: examId, slotId: linkedSlot })));
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).durationMin).toBeNull();
      await as(ids.admin, () => patchSlot(req("", "PATCH", { paperId: paper.id }), p({ id: examId, slotId: linkedSlot })));
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).durationMin).toBe(180);
      await as(ids.admin, () => putCell(req("", "PUT", { blockId: b, className: cls, date: "2026-12-10", subjects: [] }), p({ id: examId })));
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).durationMin).toBeNull();
      await as(ids.admin, () => putCell(req("", "PUT", { blockId: b, className: cls, date: "2026-12-10", subjects: ["Mathematics"] }), p({ id: examId })));
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).durationMin).toBe(180);

      const current = (await prisma.examSlot.findFirstOrThrow({ where: { paperId: paper.id } })).id;
      const printed = await as(ids.admin, () => patchSlot(req("", "PATCH", { printed: true }), p({ id: examId, slotId: current })));
      expect(printed.status).toBe(200);
      const moved = await as<ExamView>(ids.admin, () => patchBlock(req("", "PATCH", { moveDate: { from: "2026-12-10", to: "2026-12-15" } }), p({ id: examId, blockId: b })));
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).examDate).toBe("2026-12-15");
      expect(moved.json.slots[0].warnings).toContain("DATE_CHANGED_AFTER_PRINT");
      expect(moved.json.slots[0].warnings).not.toContain("PAPER_CHANGED_AFTER_PRINT");

      await as(ids.admin, () => patchExam(req("", "PATCH", { examType: "PRE_BOARD" }), p({ id: examId })));
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).examType).toBe("PRE_BOARD");
    } finally {
      await prisma.examSlot.deleteMany({ where: { paperId: paper.id } });
      await prisma.paper.delete({ where: { id: paper.id } });
      await prisma.blueprint.delete({ where: { id: bp.id } });
      await prisma.book.delete({ where: { id: book.id } });
    }
  });

  it("reports missing blueprints and creates the missing drafts, dated from the date sheet", async () => {
    const cls = `Exam Setup ${stamp}`;
    const maths = await prisma.book.create({ data: { title: "Maths", subject: "Mathematics", className: cls, academicSession: "2026–27" } });
    const science = await prisma.book.create({ data: { title: "Science", subject: "Science", className: cls, academicSession: "2026–27" } });
    const bp = await prisma.blueprint.create({
      data: { name: "HY Maths", bookId: maths.id, academicSession: "2026–27", examType: "HALF_YEARLY", durationMin: 180 },
    });
    try {
      const made = await as<ExamView>(ids.admin, () =>
        createExam(req("/api/exams", "POST", { name: `Setup ${stamp}`, examType: "HALF_YEARLY", academicSession: "2026–27" }), p()),
      );
      const examId = made.json.id;
      examIds.push(examId);
      const b = (await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "Only", timeText: "11 to 2" }), p({ id: examId })))).json.blocks[0].id;
      for (const d of ["2026-12-10", "2026-12-12", "2026-12-14"]) {
        await as(ids.admin, () => patchBlock(req("", "PATCH", { addDate: d }), p({ id: examId, blockId: b })));
      }
      await as(ids.admin, () => patchBlock(req("", "PATCH", { addClass: cls }), p({ id: examId, blockId: b })));
      const cell = (date: string, subject: string) =>
        as(ids.admin, () => putCell(req("", "PUT", { blockId: b, className: cls, date, subject }), p({ id: examId })));
      await cell("2026-12-10", "Mathematics");
      await cell("2026-12-12", "Science");
      await cell("2026-12-14", "Hindi");

      const setup = await as<{ missingBlueprints: { bookId: string; className: string; subject: string }[]; noBook: { className: string; subject: string; presetAvailable: boolean }[] }>(
        ids.admin,
        () => getSetup(req("", "GET"), p({ id: examId })),
      );
      expect(setup.json.missingBlueprints).toEqual([{ bookId: science.id, className: cls, subject: "Science" }]);
      expect(setup.json.noBook).toEqual([{ className: cls, subject: "Hindi", presetAvailable: false }]);

      const res = await as<{ created: number; skipped: { slotId: string; reason: string }[]; exam: ExamView }>(ids.admin, () =>
        createDrafts(req("", "POST", {}), p({ id: examId })),
      );
      expect(res.status).toBe(200);
      expect(res.json.created).toBe(1);
      expect(res.json.skipped.map((x) => x.reason).sort()).toEqual([`No blueprint for ${cls} Science`, `No book for ${cls} Hindi in 2026–27`]);
      const slot = res.json.exam.slots.find((x) => x.subject === "Mathematics")!;
      expect(slot.status).toBe("DRAFT");
      const paper = await prisma.paper.findUniqueOrThrow({ where: { id: slot.paper!.id } });
      expect(paper).toMatchObject({ examDate: "2026-12-10", examType: "HALF_YEARLY", academicSession: "2026–27", createdById: ids.admin, blueprintId: bp.id, status: "DRAFT" });
      expect(paper.title).toBe(`Setup ${stamp} — Mathematics (${cls})`);

      const again = await as<{ created: number }>(ids.admin, () => createDrafts(req("", "POST", {}), p({ id: examId })));
      expect(again.json.created).toBe(0);

      // two clicks at once never make two papers for one slot
      await prisma.examSlot.updateMany({ where: { examId }, data: { paperId: null } });
      await prisma.paper.deleteMany({ where: { blueprintId: bp.id } });
      mockSessionUserId = ids.admin;
      const both = await Promise.all([createDrafts(req("", "POST", {}), p({ id: examId })), createDrafts(req("", "POST", {}), p({ id: examId }))]);
      const created = (await Promise.all(both.map((r) => r.json()))).reduce((n: number, r: { created: number }) => n + r.created, 0);
      expect(created).toBe(1);
      expect(await prisma.paper.count({ where: { blueprintId: bp.id } })).toBe(1);
      expect((await as(ids.teacher, () => createDrafts(req("", "POST", {}), p({ id: examId })))).status).toBe(403);
    } finally {
      await prisma.examSlot.deleteMany({ where: { className: cls } });
      await prisma.paper.deleteMany({ where: { blueprintId: bp.id } });
      await prisma.blueprint.delete({ where: { id: bp.id } });
      await prisma.book.deleteMany({ where: { id: { in: [maths.id, science.id] } } });
    }
  });

  it("links a free paper after wrong entries are cleared, when made later, and by the paper's own exam type", async () => {
    const cls = `Exam Relink ${stamp}`;
    const maths = await prisma.book.create({ data: { title: "Maths", subject: "Mathematics", className: cls, academicSession: "2026–27" } });
    const english = await prisma.book.create({ data: { title: "English", subject: "English", className: cls, academicSession: "2026–27" } });
    const hy = await prisma.blueprint.create({ data: { name: "HY", bookId: maths.id, academicSession: "2026–27", examType: "HALF_YEARLY", durationMin: 180 } });
    // a blueprint made for the annual exam, used for a paper set to Half Yearly
    const annual = await prisma.blueprint.create({ data: { name: "AN", bookId: english.id, academicSession: "2026–27", examType: "ANNUAL", durationMin: 180 } });
    const base = { layout: "PAGE", schoolName: "S", academicSession: "2026–27", createdById: ids.admin };
    const mathsPaper = await prisma.paper.create({ data: { ...base, title: "HY Maths", blueprintId: hy.id, examType: "HALF_YEARLY" } });
    try {
      const made = await as<ExamView>(ids.admin, () => createExam(req("/api/exams", "POST", { name: `Relink ${stamp}`, examType: "HALF_YEARLY", academicSession: "2026–27" }), p()));
      const examId = made.json.id;
      examIds.push(examId);
      const b = (await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "Only", timeText: "" }), p({ id: examId })))).json.blocks[0].id;
      for (const date of ["2026-12-10", "2026-12-11", "2026-12-12"]) await as(ids.admin, () => patchBlock(req("", "PATCH", { addDate: date }), p({ id: examId, blockId: b })));
      await as(ids.admin, () => patchBlock(req("", "PATCH", { addClass: cls }), p({ id: examId, blockId: b })));
      const cell = (date: string, subjects: string[]) =>
        as<{ exam: ExamView }>(ids.admin, () => putCell(req("", "PUT", { blockId: b, className: cls, date, subjects }), p({ id: examId })));
      const mathsSlot = (v: ExamView) => v.slots.find((x) => x.subject === "Mathematics");

      // the legacy data this fix repairs: Maths entered twice, the paper on the wrong day
      await cell("2026-12-10", ["Mathematics"]);
      await prisma.examSlot.create({ data: { examId, blockId: b, className: cls, examDate: "2026-12-11", subject: "Mathematics" } });
      // clearing the wrong day frees the paper for the right one
      const cleared = (await cell("2026-12-10", [])).json.exam;
      expect(mathsSlot(cleared)?.examDate).toBe("2026-12-11");
      expect(mathsSlot(cleared)?.paper?.id).toBe(mathsPaper.id);
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: mathsPaper.id } })).examDate).toBe("2026-12-11");

      // removing the whole day frees it too
      await cell("2026-12-12", []);
      await prisma.examSlot.updateMany({ where: { examId, subject: "Mathematics" }, data: { examDate: "2026-12-12" } });
      await prisma.examSlot.create({ data: { examId, blockId: b, className: cls, examDate: "2026-12-11", subject: "Mathematics" } });
      const byDate = (await as<ExamView>(ids.admin, () => patchBlock(req("", "PATCH", { removeDate: "2026-12-12" }), p({ id: examId, blockId: b })))).json;
      expect(mathsSlot(byDate)?.examDate).toBe("2026-12-11");
      expect(mathsSlot(byDate)?.paper?.id).toBe(mathsPaper.id);

      // English placed before its paper exists; the paper is set to Half Yearly though its blueprint is Annual
      const placed = (await cell("2026-12-10", ["English"])).json.exam;
      expect(placed.slots.find((x) => x.subject === "English")?.paper).toBeNull();
      const englishPaper = await prisma.paper.create({ data: { ...base, title: "HY English", blueprintId: annual.id, examType: "HALF_YEARLY" } });
      const opened = (await as<ExamView>(ids.admin, () => getExam(req("", "GET"), p({ id: examId })))).json;
      expect(opened.slots.find((x) => x.subject === "English")?.paper?.id).toBe(englishPaper.id);
    } finally {
      await prisma.examSlot.deleteMany({ where: { className: cls } });
      await prisma.paper.deleteMany({ where: { blueprintId: { in: [hy.id, annual.id] } } });
      await prisma.blueprint.deleteMany({ where: { id: { in: [hy.id, annual.id] } } });
      await prisma.book.deleteMany({ where: { id: { in: [maths.id, english.id] } } });
    }
  });

  it("gives a paper made after its date-sheet slot the slot's date and time at once, without opening the exam", async () => {
    const cls = `Exam NewPaper ${stamp}`;
    const book = await prisma.book.create({ data: { title: "Science", subject: "Science", className: cls, academicSession: "2026–27" } });
    const bp = await prisma.blueprint.create({ data: { name: "HY Sci", bookId: book.id, academicSession: "2026–27", examType: "HALF_YEARLY", durationMin: 90 } });
    try {
      const made = await as<ExamView>(ids.admin, () => createExam(req("/api/exams", "POST", { name: `NewPaper ${stamp}`, examType: "HALF_YEARLY", academicSession: "2026–27" }), p()));
      const examId = made.json.id;
      examIds.push(examId);
      const b = (await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "Morning", timeText: "10:00 AM – 1:00 PM" }), p({ id: examId })))).json.blocks[0].id;
      await as(ids.admin, () => patchBlock(req("", "PATCH", { addDate: "2026-12-15" }), p({ id: examId, blockId: b })));
      await as(ids.admin, () => patchBlock(req("", "PATCH", { addClass: cls }), p({ id: examId, blockId: b })));
      await as(ids.admin, () => putCell(req("", "PUT", { blockId: b, className: cls, date: "2026-12-15", subjects: ["Science"] }), p({ id: examId })));

      const created = await as<{ id: string; examDate: string; durationMin: number | null }>(ids.admin, () =>
        createPaper(
          req("/api/papers", "POST", { title: "HY Science", blueprintId: bp.id, layout: "PAGE", schoolName: "S", academicSession: "2026–27", examType: "HALF_YEARLY" }),
          p(),
        ),
      );
      expect(created.status).toBe(200);
      // the paper the teacher sees straight after creating it already carries the date sheet's day and sitting
      expect(created.json.examDate).toBe("2026-12-15");
      expect(created.json.durationMin).toBe(180);
      const slot = await prisma.examSlot.findFirstOrThrow({ where: { examId, className: cls } });
      expect(slot.paperId).toBe(created.json.id);
    } finally {
      await prisma.examSlot.deleteMany({ where: { className: cls } });
      await prisma.paper.deleteMany({ where: { blueprintId: bp.id } });
      await prisma.blueprint.deleteMany({ where: { id: bp.id } });
      await prisma.book.deleteMany({ where: { id: book.id } });
    }
  });

  it("never links one paper to two date-sheet slots", async () => {
    const cls = `Exam Shared ${stamp}`;
    const book = await prisma.book.create({ data: { title: "Maths", subject: "Mathematics", className: cls, academicSession: "2026–27" } });
    const bp = await prisma.blueprint.create({ data: { name: "HY", bookId: book.id, academicSession: "2026–27", examType: "HALF_YEARLY", durationMin: 180 } });
    const paper = await prisma.paper.create({
      data: { title: "HY Maths", blueprintId: bp.id, layout: "PAGE", schoolName: "S", academicSession: "2026–27", examType: "HALF_YEARLY", createdById: ids.admin },
    });
    try {
      const sheet = async (name: string, date: string) => {
        const made = await as<ExamView>(ids.admin, () => createExam(req("/api/exams", "POST", { name, examType: "HALF_YEARLY", academicSession: "2026–27" }), p()));
        examIds.push(made.json.id);
        const b = (await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "Only", timeText: "" }), p({ id: made.json.id })))).json.blocks[0].id;
        await as(ids.admin, () => patchBlock(req("", "PATCH", { addDate: date }), p({ id: made.json.id, blockId: b })));
        await as(ids.admin, () => patchBlock(req("", "PATCH", { addClass: cls }), p({ id: made.json.id, blockId: b })));
        const set = await as<{ exam: ExamView }>(ids.admin, () => putCell(req("", "PUT", { blockId: b, className: cls, date, subject: "Mathematics" }), p({ id: made.json.id })));
        return set.json.exam;
      };
      const first = await sheet(`First ${stamp}`, "2026-12-10");
      expect(first.slots[0].paper?.id).toBe(paper.id);
      const second = await sheet(`Second ${stamp}`, "2027-03-10");
      expect(second.slots[0].paper).toBeNull();
      expect((await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } })).examDate).toBe("2026-12-10");

      const manual = await as<{ error: string }>(ids.admin, () => patchSlot(req("", "PATCH", { paperId: paper.id }), p({ id: second.id, slotId: second.slots[0].id })));
      expect(manual.status).toBe(400);
      expect(manual.json.error).toContain(`First ${stamp}`);

      // two tabs linking the same free paper at once: only one wins, the other gets a clear 400
      await prisma.examSlot.updateMany({ where: { paperId: paper.id }, data: { paperId: null } });
      mockSessionUserId = ids.admin;
      const racing = await Promise.all([
        patchSlot(req("", "PATCH", { paperId: paper.id }), p({ id: first.id, slotId: first.slots[0].id })),
        patchSlot(req("", "PATCH", { paperId: paper.id }), p({ id: second.id, slotId: second.slots[0].id })),
      ]);
      expect(racing.map((r) => r.status).sort()).toEqual([200, 400]);
      expect(await prisma.examSlot.count({ where: { paperId: paper.id } })).toBe(1);
    } finally {
      await prisma.examSlot.deleteMany({ where: { className: cls } });
      await prisma.paper.delete({ where: { id: paper.id } });
      await prisma.blueprint.delete({ where: { id: bp.id } });
      await prisma.book.delete({ where: { id: book.id } });
    }
  });

  it("adds GK and Drawing books from their topic presets", async () => {
    const session = "2097–98";
    try {
      const made = await as<ExamView>(ids.admin, () => createExam(req("/api/exams", "POST", { name: `Books ${stamp}`, examType: "HALF_YEARLY", academicSession: session }), p()));
      const examId = made.json.id;
      examIds.push(examId);
      const b = (await as<ExamView>(ids.admin, () => addBlock(req("", "POST", { title: "Primary", timeText: "" }), p({ id: examId })))).json.blocks[0].id;
      await as(ids.admin, () => patchBlock(req("", "PATCH", { addDate: "2026-12-22" }), p({ id: examId, blockId: b })));
      await as(ids.admin, () => patchBlock(req("", "PATCH", { addDate: "2026-12-23" }), p({ id: examId, blockId: b })));
      await as(ids.admin, () => patchBlock(req("", "PATCH", { addClass: "Class 3" }), p({ id: examId, blockId: b })));
      await as(ids.admin, () => putCell(req("", "PUT", { blockId: b, className: "Class 3", date: "2026-12-22", subjects: ["General Knowledge", "Drawing"] }), p({ id: examId })));
      await as(ids.admin, () => putCell(req("", "PUT", { blockId: b, className: "Class 3", date: "2026-12-23", subjects: ["Astronomy"] }), p({ id: examId })));

      type Setup = { noBook: { className: string; subject: string; presetAvailable: boolean }[]; missingBlueprints: { subject: string }[] };
      const before = await as<Setup>(ids.admin, () => getSetup(req("", "GET"), p({ id: examId })));
      expect(before.json.noBook).toEqual([
        { className: "Class 3", subject: "General Knowledge", presetAvailable: true },
        { className: "Class 3", subject: "Drawing", presetAvailable: true },
        { className: "Class 3", subject: "Astronomy", presetAvailable: false },
      ]);

      const res = await as<{ added: string[]; setup: Setup }>(ids.admin, () => addBooks(req("", "POST", {}), p({ id: examId })));
      expect(res.status).toBe(200);
      expect(res.json.added.sort()).toEqual(["Class 3 Drawing", "Class 3 General Knowledge"]);
      expect(res.json.setup.noBook.map((x) => x.subject)).toEqual(["Astronomy"]);
      expect(res.json.setup.missingBlueprints.map((x) => x.subject).sort()).toEqual(["Drawing", "General Knowledge"]);
      const gk = await prisma.book.findFirstOrThrow({ where: { academicSession: session, className: "Class 3", subject: "General Knowledge" }, include: { chapters: true } });
      expect(gk.chapters.length).toBe(10);
      expect((await as(ids.examCell, () => addBooks(req("", "POST", {}), p({ id: examId })))).status).toBe(403);
    } finally {
      await prisma.chapter.deleteMany({ where: { book: { academicSession: session } } });
      await prisma.book.deleteMany({ where: { academicSession: session } });
    }
  });

  it("lists unprinted upcoming slots for a paper's print prompt, for managers only", async () => {
    const res = await as<unknown[]>(ids.examCell, () => printedPrompt(req("/api/exams/printed-prompt?paperId=nope", "GET"), p()));
    expect(res.status).toBe(200);
    expect(res.json).toEqual([]);
    expect((await as(ids.teacher, () => printedPrompt(req("/api/exams/printed-prompt?paperId=nope", "GET"), p()))).status).toBe(403);
  });
});
