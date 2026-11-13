import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as duplicatePaper } from "@/app/api/papers/[id]/duplicate/route";
import { PATCH as patchItem } from "@/app/api/papers/[id]/questions/[itemId]/route";
import { POST as addItem } from "@/app/api/papers/[id]/questions/route";
import { POST as rebalance } from "@/app/api/papers/[id]/rebalance/route";
import { prisma } from "./prisma";

const pairs = (n: number) => JSON.stringify(Array.from({ length: n }, (_, i) => `Left ${i + 1} ||| Right ${i + 1}`));

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
const call = (fn: unknown, url: string, method: string, params: Record<string, string>, json?: unknown) =>
  (fn as Handler)(
    new Request(`http://localhost${url}`, { method, headers: { "Content-Type": "application/json" }, body: json === undefined ? undefined : JSON.stringify(json) }),
    { params: Promise.resolve(params) },
  );

describe("flexible marks through the API", () => {
  const stamp = Date.now();
  let userId: string;
  const bookIds: string[] = [];
  const blueprintIds: string[] = [];
  const paperIds: string[] = [];

  async function setup(className: string) {
    const tag = `${stamp}-${className}-${bookIds.length}`;
    const book = await prisma.book.create({ data: { title: `Flex ${tag}`, subject: "English", className, academicSession: "2026–27" } });
    bookIds.push(book.id);
    const ch = (await prisma.chapter.create({ data: { bookId: book.id, number: 1, title: "Chapter" } })).id;
    const allowed = JSON.stringify(["MCQ", "FILL_BLANK", "MATCH_COLUMN"]);
    const bp = await prisma.blueprint.create({
      data: {
        name: `Flex BP ${tag}`,
        bookId: book.id,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 60,
        chapters: { create: [{ chapterId: ch, marks: 10 }] },
        sections: {
          create: [
            { position: 1, title: "Section A", instructions: "", type: "MCQ", count: 5, marksEach: 1, allowedTypesJson: allowed },
            { position: 2, title: "Section B", instructions: "", type: "FILL_BLANK", count: 5, marksEach: 1, allowedTypesJson: allowed },
          ],
        },
      },
      include: { sections: { orderBy: { position: "asc" } } },
    });
    blueprintIds.push(bp.id);
    const paperId = (
      await prisma.paper.create({ data: { title: `Flex paper ${tag}`, blueprintId: bp.id, layout: "PAGE", schoolName: "Test School", createdById: userId, status: "DRAFT" } })
    ).id;
    paperIds.push(paperId);
    const mk = (n: number) =>
      prisma.question.create({
        data: { bookId: book.id, chapterId: ch, type: "MATCH_COLUMN", text: "Match the following", optionsJson: pairs(n), answer: "1-1", createdById: userId },
      });
    const add = async (sectionId: string, questionId: string) =>
      call(addItem, `/api/papers/${paperId}/questions`, "POST", { id: paperId }, { sectionId, questionId });
    const patch = (itemId: string, json: unknown) => call(patchItem, `/api/papers/${paperId}/questions/${itemId}`, "PATCH", { id: paperId, itemId }, json);
    const move = (fromSectionId: string, toSectionId: string, slots: number) =>
      call(rebalance, `/api/papers/${paperId}/rebalance`, "POST", { id: paperId }, { fromSectionId, toSectionId, slots });
    return { paperId, a: bp.sections[0].id, b: bp.sections[1].id, mk, add, patch, move };
  }

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { name: `Flex ${stamp}`, email: `flex-${stamp}@test.internal`, passwordHash: "hash", role: "TEACHER", active: true } });
    userId = user.id;
    mockSessionUserId = userId;
  });

  afterAll(async () => {
    await prisma.paperSectionSlots.deleteMany({ where: { paperId: { in: paperIds } } });
    await prisma.paperQuestion.deleteMany({ where: { paperId: { in: paperIds } } });
    await prisma.paper.deleteMany({ where: { id: { in: paperIds } } });
    await prisma.question.deleteMany({ where: { bookId: { in: bookIds } } });
    await prisma.blueprintSection.deleteMany({ where: { blueprintId: { in: blueprintIds } } });
    await prisma.blueprintChapter.deleteMany({ where: { blueprintId: { in: blueprintIds } } });
    await prisma.blueprint.deleteMany({ where: { id: { in: blueprintIds } } });
    await prisma.chapter.deleteMany({ where: { bookId: { in: bookIds } } });
    await prisma.book.deleteMany({ where: { id: { in: bookIds } } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  type View = { id: string; progress: { usedMarks: number; sections: { id: string; filled: number; needed: number }[] }; items: { id: string; question: { id: string; pairMarks?: number | null } }[] };
  const sec = (view: View, id: string) => view.progress.sections.find((s) => s.id === id)!;

  it("class 6: a 4-pair match uses 4 slots and 4 marks; a second one that does not fit is refused", async () => {
    const t = await setup("Class 6");
    const res = await t.add(t.a, (await t.mk(4)).id);
    const view = (await res.json()) as View;
    expect(res.status).toBe(200);
    expect(sec(view, t.a)).toMatchObject({ filled: 4, needed: 5 });
    expect(view.progress.usedMarks).toBe(4);
    expect((await t.add(t.a, (await t.mk(2)).id)).status).toBe(409);
  });

  it("class 6: half a mark per pair frees slots; bad and odd values are refused; going back must still fit", async () => {
    const t = await setup("Class 6");
    const added = (await (await t.add(t.a, (await t.mk(4)).id)).json()) as View;
    const itemId = added.items[0].id;
    const half = await t.patch(itemId, { pairMarks: 0.5 });
    const halfView = (await half.json()) as View;
    expect(half.status).toBe(200);
    expect(sec(halfView, t.a).filled).toBe(2);
    expect(halfView.progress.usedMarks).toBe(2);
    expect(halfView.items[0].question.pairMarks).toBe(0.5);
    expect((await t.patch(itemId, { pairMarks: 0.25 })).status).toBe(400);

    // fill the freed slots, so going back to 1 mark per pair (4 slots) no longer fits
    for (let i = 0; i < 3; i++) {
      const q = await prisma.question.create({
        data: { bookId: (await prisma.chapter.findFirst({ where: { bookId: { in: bookIds } }, orderBy: { id: "desc" } }))!.bookId, chapterId: (await prisma.chapter.findFirst({ where: { bookId: { in: bookIds } }, orderBy: { id: "desc" } }))!.id, type: "MCQ", text: `Filler ${i}?`, optionsJson: JSON.stringify(["a", "b", "c", "d"]), answer: "a", createdById: userId },
      });
      expect((await t.add(t.a, q.id)).status).toBe(200);
    }
    expect((await t.patch(itemId, { pairMarks: 1 })).status).toBe(409);

    const odd = (await (await t.add(t.b, (await t.mk(3)).id)).json()) as View;
    const oddItem = odd.items.find((i) => i.id !== itemId)!;
    expect((await t.patch(oddItem.id, { pairMarks: 0.5 })).status).toBe(400);
  });

  it("class 6: slots move between same-mark sections, the total stays, and filled slots cannot be taken", async () => {
    const t = await setup("Class 6");
    await t.add(t.a, (await t.mk(4)).id);
    const ok = await t.move(t.a, t.b, 1);
    const view = (await ok.json()) as View;
    expect(ok.status).toBe(200);
    expect(sec(view, t.a)).toMatchObject({ needed: 4, filled: 4 });
    expect(sec(view, t.b).needed).toBe(6);
    expect(sec(view, t.a).needed + sec(view, t.b).needed).toBe(10);
    const refused = await t.move(t.a, t.b, 1);
    expect(refused.status).toBe(400);
    expect(((await refused.json()) as { error: string }).error).toMatch(/already has 4/);
  });

  it("class 10: the match counts as one slot, and pair value and slot moves are refused", async () => {
    const t = await setup("Class 10");
    const res = await t.add(t.a, (await t.mk(4)).id);
    const view = (await res.json()) as View;
    expect(sec(view, t.a)).toMatchObject({ filled: 1, needed: 5 });
    expect((await t.patch(view.items[0].id, { pairMarks: 0.5 })).status).toBe(400);
    expect((await t.move(t.a, t.b, 1)).status).toBe(400);
  });

  it("a duplicated paper keeps its slot moves and pair values", async () => {
    const t = await setup("Class 6");
    const added = (await (await t.add(t.b, (await t.mk(4)).id)).json()) as View;
    await t.patch(added.items[0].id, { pairMarks: 0.5 });
    expect((await t.move(t.b, t.a, 2)).status).toBe(200);
    const copy = ((await (await call(duplicatePaper, `/api/papers/${t.paperId}/duplicate`, "POST", { id: t.paperId }, {})).json()) as { paper: View }).paper;
    paperIds.push(copy.id);
    expect(sec(copy, t.a).needed).toBe(7);
    expect(sec(copy, t.b)).toMatchObject({ needed: 3, filled: 2 });
    expect(copy.items[0].question.pairMarks).toBe(0.5);
  });
});
