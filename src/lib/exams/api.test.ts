import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
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
import { PATCH as patchBlock } from "../../app/api/exams/[id]/blocks/[blockId]/route";
import { PUT as putCell } from "../../app/api/exams/[id]/cells/route";
import { PATCH as patchSlot } from "../../app/api/exams/[id]/slots/[slotId]/route";
import { GET as printedPrompt } from "../../app/api/exams/printed-prompt/route";

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

    const copy = await as<{ id: string }>(ids.admin, () => copyExam(req("", "POST"), p({ id: examId })));
    examIds.push(copy.json.id);
    const copied = (await as<ExamView>(ids.admin, () => getExam(req("", "GET"), p({ id: copy.json.id })))).json;
    expect(copied.name).toBe(`Half Yearly ${stamp} (copy)`);
    expect(copied.status).toBe("DRAFT");
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

      await as(ids.admin, () => patchSlot(req("", "PATCH", { printed: true }), p({ id: examId, slotId: slot.id })));
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

  it("lists unprinted upcoming slots for a paper's print prompt, for managers only", async () => {
    const res = await as<unknown[]>(ids.examCell, () => printedPrompt(req("/api/exams/printed-prompt?paperId=nope", "GET"), p()));
    expect(res.status).toBe(200);
    expect(res.json).toEqual([]);
    expect((await as(ids.teacher, () => printedPrompt(req("/api/exams/printed-prompt?paperId=nope", "GET"), p()))).status).toBe(403);
  });
});
