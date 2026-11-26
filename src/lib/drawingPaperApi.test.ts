import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as postPaper } from "../app/api/papers/route";
import { PATCH as patchPaper } from "../app/api/papers/[id]/route";

const stamp = `${Date.now()}`;
const req = (method: string, json: unknown) =>
  new Request("http://localhost/api/papers", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(json) });
const p = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });

describe("Drawing papers stay on single portrait pages", () => {
  let adminId = "";
  let bookId = "";
  let blueprintId = "";
  beforeAll(async () => {
    adminId = (await prisma.user.create({ data: { name: `Admin ${stamp}`, email: `drawing-${stamp}@test.internal`, passwordHash: "x", role: "ADMIN" } })).id;
    bookId = (await prisma.book.create({ data: { title: "Drawing", subject: "Drawing", className: `Draw Class ${stamp}`, academicSession: "2026–27" } })).id;
    blueprintId = (await prisma.blueprint.create({ data: { name: "Drawing", bookId, examType: "HALF_YEARLY", durationMin: 90 } })).id;
    mockSessionUserId = adminId;
  });
  afterAll(async () => {
    await prisma.paper.deleteMany({ where: { blueprintId } });
    await prisma.blueprint.delete({ where: { id: blueprintId } });
    await prisma.book.delete({ where: { id: bookId } });
    await prisma.auditLog.deleteMany({ where: { userId: adminId } });
    await prisma.user.delete({ where: { id: adminId } });
  });

  it("creates and keeps a Drawing paper in the single-page layout", async () => {
    const res = await postPaper(req("POST", { title: "Drawing HY", blueprintId, layout: "BOOKLET", schoolName: "School" }), p());
    expect(res.status).toBe(200);
    const created = (await res.json()) as { id: string };
    expect((await prisma.paper.findUniqueOrThrow({ where: { id: created.id } })).layout).toBe("PAGE");

    const patched = await patchPaper(req("PATCH", { layout: "BOOKLET_A4" }), p({ id: created.id }));
    expect(patched.status).toBe(200);
    expect((await prisma.paper.findUniqueOrThrow({ where: { id: created.id } })).layout).toBe("PAGE");
  });
});
