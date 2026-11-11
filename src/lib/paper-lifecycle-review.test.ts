import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { GET as listQuestions, POST as createQuestion } from "@/app/api/questions/route";
import { PATCH as patchQuestion, PUT as putQuestion } from "@/app/api/questions/[id]/route";
import { PATCH as patchPaper } from "@/app/api/papers/[id]/route";
import { POST as addItem } from "@/app/api/papers/[id]/questions/route";
import { POST as bulkAdd } from "@/app/api/papers/[id]/questions/bulk/route";
import { PATCH as patchItem, PUT as editItem } from "@/app/api/papers/[id]/questions/[itemId]/route";
import { POST as createSnapshot } from "@/app/api/papers/[id]/snapshots/route";
import { POST as restoreSnapshot } from "@/app/api/papers/[id]/snapshots/[snapshotId]/restore/route";
import { POST as clearQuestions } from "@/app/api/papers/[id]/clear-questions/route";
import { POST as duplicatePaper } from "@/app/api/papers/[id]/duplicate/route";
import { POST as duplicateSet } from "@/app/api/papers/[id]/duplicate-set/route";
import { POST as parallelSets } from "@/app/api/papers/[id]/parallel-sets/route";
import { POST as autofill } from "@/app/api/papers/[id]/autofill/route";
import { POST as reconcile } from "@/app/api/papers/[id]/reconcile-blueprint/route";
import { PUT as putBlueprint } from "@/app/api/blueprints/[id]/route";
import { validatePaperPreflight } from "./preflight";
import { loadPaperView } from "./papers";
import { prisma } from "./prisma";
import type { PaperData } from "./types";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

async function call(handler: Handler, method: string, path: string, params: Record<string, string>, json?: unknown) {
  const res = await handler(
    new Request(`http://localhost${path}`, {
      method,
      headers: json === undefined ? {} : { "Content-Type": "application/json" },
      body: json === undefined ? undefined : JSON.stringify(json),
    }),
    { params: Promise.resolve(params) },
  );
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

/**
 * The paper lifecycle end to end: bank question → placement → edit → internal choice → snapshot → finalise →
 * copies and sets. Each test is a defect found in the November 2026 review.
 */
describe("paper lifecycle review", () => {
  const stamp = Date.now();
  let userId: string;
  let bookId: string;
  let ch1: string;
  let ch2: string;
  let blueprintId: string;
  let paperId: string;
  const sec: Record<string, string> = {};
  const extraPaperIds: string[] = [];

  const mk = (type: string, chapterId: string, text: string, extra: Record<string, unknown> = {}) =>
    prisma.question.create({
      data: {
        bookId,
        chapterId,
        type,
        text,
        optionsJson: type === "MCQ" ? JSON.stringify(["alpha", "beta", "gamma", "delta"]) : "[]",
        answer: type === "MCQ" ? "A" : "Model answer",
        createdById: userId,
        ...extra,
      },
    });
  const place = (sectionId: string, questionId: string, position: number, extra: Record<string, unknown> = {}) =>
    prisma.paperQuestion.create({ data: { paperId, sectionId, questionId, position, ...extra } });
  const twoParts = JSON.stringify([
    { label: "(a)", text: "Part one", marks: 2 },
    { label: "(b)", text: "Part two", marks: 2 },
  ]);
  const anyTwoOfThree = [
    { label: "(a)", text: "What is rusting?", marks: 2 },
    { label: "(b)", text: "State two ways to prevent it.", marks: 2 },
    { label: "(c)", text: "Why does aluminium resist corrosion?", marks: 2 },
  ];
  const P = () => `/api/papers/${paperId}`;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: `Lifecycle ${stamp}`, email: `lifecycle-${stamp}@test.internal`, passwordHash: "hash", role: "ADMIN", active: true },
    });
    userId = user.id;
    const book = await prisma.book.create({ data: { title: `Lifecycle ${stamp}`, subject: "Science", className: "Class 8", academicSession: "2026–27" } });
    bookId = book.id;
    ch1 = (await prisma.chapter.create({ data: { bookId, number: 1, title: "Light" } })).id;
    ch2 = (await prisma.chapter.create({ data: { bookId, number: 2, title: "Sound" } })).id;
    const bp = await prisma.blueprint.create({
      data: {
        name: `Lifecycle BP ${stamp}`,
        bookId,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 120,
        chapters: { create: [{ chapterId: ch1, marks: 10 }, { chapterId: ch2, marks: 8 }] },
        sections: {
          create: [
            { position: 0, title: "Section A", type: "MCQ", count: 2, marksEach: 1 },
            { position: 1, title: "Section A", type: "MATCH_COLUMN", count: 4, marksEach: 1 },
            { position: 2, title: "Section B", type: "VERY_SHORT", count: 2, marksEach: 2 },
            { position: 3, title: "Section C", type: "LONG", count: 2, marksEach: 4 },
          ],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    for (const s of bp.sections) sec[s.type] = s.id;
  });

  beforeEach(async () => {
    mockSessionUserId = userId;
    paperId = (
      await prisma.paper.create({
        data: { title: `Lifecycle paper ${stamp}-${extraPaperIds.length}`, blueprintId, layout: "PAGE", schoolName: "Test School", academicSession: "2026–27", createdById: userId, status: "DRAFT" },
      })
    ).id;
    extraPaperIds.push(paperId);
  });

  afterAll(async () => {
    const papers = await prisma.paper.findMany({ where: { blueprintId }, select: { id: true } });
    await prisma.paperQuestion.deleteMany({ where: { paperId: { in: papers.map((p) => p.id) } } });
    await prisma.paper.deleteMany({ where: { blueprintId } });
    await prisma.question.deleteMany({ where: { bookId } });
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    await prisma.chapter.deleteMany({ where: { bookId } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  /** A complete paper: 2 MCQ, one 4-pair match, 2 very short, 2 long. Chapter 1 = 10 marks, chapter 2 = 8. */
  async function fillPaper() {
    const m1 = await mk("MCQ", ch1, `Which mirror forms a virtual image? ${Math.random()}`, { explanation: "Plane mirrors always do.", figureScene: '{"v":1}' });
    const m2 = await mk("MCQ", ch1, `Which colour of light bends least? ${Math.random()}`);
    const match = await mk("MATCH_COLUMN", ch1, "Match the columns.", {
      optionsJson: JSON.stringify(["Concave ||| Converging", "Convex ||| Diverging", "Plane ||| Same size", "Prism ||| Dispersion"]),
    });
    const v1 = await mk("VERY_SHORT", ch2, `Define frequency. ${Math.random()}`);
    const v2 = await mk("VERY_SHORT", ch2, `Define amplitude. ${Math.random()}`);
    const l1 = await mk("LONG", ch1, `Explain reflection with a ray diagram. ${Math.random()}`);
    const l2 = await mk("LONG", ch2, `Explain how sound travels through air. ${Math.random()}`);
    const items = [
      await place(sec.MCQ, m1.id, 0),
      await place(sec.MCQ, m2.id, 1),
      await place(sec.MATCH_COLUMN, match.id, 0),
      await place(sec.VERY_SHORT, v1.id, 0),
      await place(sec.VERY_SHORT, v2.id, 1),
      await place(sec.LONG, l1.id, 0, { instruction: "Answer with a diagram.", pageBreakBefore: true }),
      await place(sec.LONG, l2.id, 1),
    ];
    return { m1, m2, match, v1, v2, l1, l2, items };
  }

  describe("questions with 'attempt any N' sub-questions", () => {
    const payload = (over: Record<string, unknown> = {}) => ({
      bookId,
      chapterId: ch1,
      type: "LONG",
      text: "Answer any two of the following.",
      options: [],
      subparts: anyTwoOfThree,
      attemptCount: 2,
      answer: "",
      ...over,
    });

    it("the bank saves and returns the attempt count", async () => {
      const res = await call(createQuestion as Handler, "POST", "/api/questions", {}, payload());
      expect(res.status).toBe(200);
      expect(res.data.attemptCount).toBe(2);
      expect(res.data.subparts).toHaveLength(3);

      const put = await call(putQuestion as Handler, "PUT", `/api/questions/${res.data.id}`, { id: res.data.id }, payload({ text: "Answer any two of these." }));
      expect(put.status).toBe(200);
      expect(put.data.attemptCount).toBe(2);

      // an inline edit of the parts alone must not drop "any two"
      const patch = await call(patchQuestion as Handler, "PATCH", `/api/questions/${res.data.id}`, { id: res.data.id }, {
        subparts: anyTwoOfThree.map((s) => ({ ...s, text: s.text + " (reworded)" })),
      });
      expect(patch.status).toBe(200);
      expect(patch.data.attemptCount).toBe(2);
    });

    it("can be batch-added to a slot worth its attempted marks, and edited there", async () => {
      const q = await mk("LONG", ch1, "Answer any two of the following about light.", {
        subpartsJson: JSON.stringify({ attemptCount: 2, subparts: anyTwoOfThree }),
      });
      const add = await call(bulkAdd as Handler, "POST", `${P()}/questions/bulk`, { id: paperId }, { sectionId: sec.LONG, questionIds: [q.id] });
      expect(add.data?.error).toBeUndefined();
      expect(add.status).toBe(200);
      const itemId = add.data.paper.items[0].id;

      const edit = await call(editItem as Handler, "PUT", `${P()}/questions/${itemId}`, { id: paperId, itemId }, {
        mode: "UPDATE_MASTER",
        question: payload({ text: "Answer any two of the following about light (typo fixed)." }),
      });
      expect(edit.data?.error).toBeUndefined();
      expect(edit.status).toBe(200);
      const saved = edit.data.items.find((i: { id: string }) => i.id === itemId).question;
      expect(saved.attemptCount).toBe(2);
      expect(saved.text).toMatch(/typo fixed/);
    });
  });

  it("a question with two parts takes one slot, not two, in batch add and in edit", async () => {
    const a = await mk("LONG", ch1, "Two-part long question A", { subpartsJson: twoParts });
    const b = await mk("LONG", ch2, "Two-part long question B", { subpartsJson: twoParts });
    const first = await call(bulkAdd as Handler, "POST", `${P()}/questions/bulk`, { id: paperId }, { sectionId: sec.LONG, questionIds: [a.id] });
    expect(first.status).toBe(200);
    const second = await call(bulkAdd as Handler, "POST", `${P()}/questions/bulk`, { id: paperId }, { sectionId: sec.LONG, questionIds: [b.id] });
    expect(second.data?.error).toBeUndefined();
    expect(second.status).toBe(200);

    const itemId = second.data.paper.items.find((i: { question: { id: string } }) => i.question.id === b.id).id;
    const edit = await call(editItem as Handler, "PUT", `${P()}/questions/${itemId}`, { id: paperId, itemId }, {
      mode: "UPDATE_MASTER",
      question: { bookId, chapterId: ch2, type: "LONG", text: "Two-part long question B (edited)", options: [], subparts: JSON.parse(twoParts), answer: "" },
    });
    expect(edit.data?.error).toBeUndefined();
    expect(edit.status).toBe(200);
  });

  it("editing a combined match question keeps it worth one mark per pair", async () => {
    const { match, items } = await fillPaper();
    const itemId = items[2].id;
    const res = await call(editItem as Handler, "PUT", `${P()}/questions/${itemId}`, { id: paperId, itemId }, {
      mode: "UPDATE_MASTER",
      question: { bookId, chapterId: ch1, type: "MATCH_COLUMN", text: "Match the following columns.", options: JSON.parse(match.optionsJson), subparts: [], answer: "" },
    });
    expect(res.data?.error).toBeUndefined();
    expect(res.status).toBe(200);
    expect(res.data.progress.complete).toBe(true);
  });

  describe("internal choice (OR)", () => {
    it("an OR sent with add or replace is checked like any other OR", async () => {
      const primary = await mk("LONG", ch1, "Primary long question on light");
      const otherChapter = await mk("LONG", ch2, "A long question from another chapter");
      const add = await call(addItem as Handler, "POST", `${P()}/questions`, { id: paperId }, { sectionId: sec.LONG, questionId: primary.id, orQuestionId: otherChapter.id });
      expect(add.status).toBe(400);
      expect(add.data.error).toMatch(/must match primary question chapter/);
      expect(await prisma.paperQuestion.count({ where: { paperId } })).toBe(0);

      const item = await place(sec.LONG, primary.id, 0);
      const replacement = await mk("LONG", ch1, "Replacement long question on light");
      const rep = await call(patchItem as Handler, "PATCH", `${P()}/questions/${item.id}`, { id: paperId, itemId: item.id }, {
        replaceWithQuestionId: replacement.id,
        orQuestionId: otherChapter.id,
      });
      expect(rep.status).toBe(400);
      expect((await prisma.paperQuestion.findUnique({ where: { id: item.id } }))?.questionId).toBe(primary.id);

      const missing = await call(addItem as Handler, "POST", `${P()}/questions`, { id: paperId }, { sectionId: sec.LONG, questionId: replacement.id, orQuestionId: "no-such-question" });
      expect(missing.status).toBe(404);
    });

    it("a section the blueprint marks 'OR required' accepts an OR, and reports the same thing everywhere", async () => {
      await prisma.blueprintSection.update({ where: { id: sec.MCQ }, data: { orChoiceMode: "REQUIRED" } });
      try {
        const primary = await mk("MCQ", ch1, "Primary MCQ on light");
        const alt = await mk("MCQ", ch1, "A quite different MCQ about lenses and focal length");
        const item = await place(sec.MCQ, primary.id, 0);

        const before = (await loadPaperView(paperId))!;
        expect(before.internalChoiceAudit.issues.some((i) => i.code === "MISSING_INTERNAL_CHOICE")).toBe(true);
        // the pre-finalise check must agree with the server's audit
        const pre = validatePaperPreflight(before as unknown as PaperData);
        expect(pre.errors.some((e) => e.code === "MISSING_INTERNAL_CHOICE")).toBe(true);

        const link = await call(patchItem as Handler, "PATCH", `${P()}/questions/${item.id}`, { id: paperId, itemId: item.id }, { orQuestionId: alt.id });
        expect(link.data?.error).toBeUndefined();
        expect(link.status).toBe(200);

        // replacing the main question keeps the OR of the same chapter
        const replacement = await mk("MCQ", ch1, "Replacement MCQ on mirrors");
        const rep = await call(patchItem as Handler, "PATCH", `${P()}/questions/${item.id}`, { id: paperId, itemId: item.id }, { replaceWithQuestionId: replacement.id });
        expect(rep.status).toBe(200);
        expect((await prisma.paperQuestion.findUnique({ where: { id: item.id } }))?.orQuestionId).toBe(alt.id);
      } finally {
        await prisma.blueprintSection.update({ where: { id: sec.MCQ }, data: { orChoiceMode: "BOARD_DEFAULT" } });
      }
    });
  });

  it("the pre-finalise check numbers questions as the paper does", async () => {
    const { v1, v2 } = await fillPaper();
    await prisma.question.update({ where: { id: v2.id }, data: { text: (await prisma.question.findUnique({ where: { id: v1.id } }))!.text } });
    const view = (await loadPaperView(paperId))!;
    const report = validatePaperPreflight(view as unknown as PaperData);
    const dup = report.warnings.find((w) => w.code === "DUPLICATE_QUESTION_TEXT");
    // 2 MCQ + 1 match question + 2 very short: the repeated one is question 5, a repeat of question 4
    expect(dup?.questionNumber).toBe(5);
    expect(dup?.message).toMatch(/Question 4/);
  });

  it("restoring a snapshot brings back each question's instruction, page break and component", async () => {
    const { items } = await fillPaper();
    const snap = await call(createSnapshot as Handler, "POST", `${P()}/snapshots`, { id: paperId }, { name: "before" });
    expect(snap.status).toBe(200);
    await call(clearQuestions as Handler, "POST", `${P()}/clear-questions`, { id: paperId });
    const res = await call(restoreSnapshot as Handler, "POST", `${P()}/snapshots/${snap.data.id}/restore`, { id: paperId, snapshotId: snap.data.id });
    expect(res.status).toBe(200);
    const long1 = await prisma.paperQuestion.findFirst({ where: { paperId, questionId: items[5].questionId } });
    expect(long1).toMatchObject({ instruction: "Answer with a diagram.", pageBreakBefore: true });
  });

  it("a harmless blueprint edit leaves a complete finalised paper finalised; a breaking one reopens it", async () => {
    await fillPaper();
    const fin = await call(patchPaper as Handler, "PATCH", P(), { id: paperId }, { status: "FINAL" });
    expect(fin.data?.error).toBeUndefined();
    expect(fin.data.status).toBe("FINAL");

    const bp = await prisma.blueprint.findUniqueOrThrow({ where: { id: blueprintId }, include: { sections: { orderBy: { position: "asc" } }, chapters: true } });
    const input = (over: (s: (typeof bp.sections)[number]) => Record<string, unknown> = () => ({})) => ({
      name: `${bp.name} renamed`,
      bookId,
      academicSession: "2026–27",
      examType: "ANNUAL",
      durationMin: 150,
      sections: bp.sections.map((s) => ({ id: s.id, title: s.title, type: s.type, count: s.count, marksEach: s.marksEach, instructions: s.instructions, ...over(s) })),
      chapters: bp.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
    });

    const rename = await call(putBlueprint as Handler, "PUT", `/api/blueprints/${blueprintId}`, { id: blueprintId }, input());
    expect(rename.status).toBe(200);
    expect((await prisma.paper.findUnique({ where: { id: paperId } }))?.status).toBe("FINAL");

    // now every MCQ needs an OR the paper does not have: it no longer matches, so it goes back to draft
    const breaking = await call(putBlueprint as Handler, "PUT", `/api/blueprints/${blueprintId}`, { id: blueprintId }, input((s) => (s.type === "MCQ" ? { orChoiceMode: "REQUIRED" } : {})));
    expect(breaking.status).toBe(200);
    expect((await prisma.paper.findUnique({ where: { id: paperId } }))?.status).toBe("DRAFT");
    await prisma.blueprintSection.update({ where: { id: sec.MCQ }, data: { orChoiceMode: "BOARD_DEFAULT" } });
    await prisma.blueprint.update({ where: { id: blueprintId }, data: { name: bp.name } });
  });

  describe("copies and sets", () => {
    it("a duplicate keeps per-question settings and the watermark", async () => {
      const { items } = await fillPaper();
      await prisma.paper.update({ where: { id: paperId }, data: { securityWatermark: true, watermarkText: "CONFIDENTIAL", language: "hi" } });
      const res = await call(duplicatePaper as Handler, "POST", `${P()}/duplicate`, { id: paperId }, {});
      expect(res.status).toBe(200);
      const copy = await prisma.paper.findUniqueOrThrow({ where: { id: res.data.paper.id }, include: { items: true } });
      expect(copy).toMatchObject({ securityWatermark: true, watermarkText: "CONFIDENTIAL", language: "hi" });
      expect(copy.items.find((i) => i.questionId === items[5].questionId)).toMatchObject({ instruction: "Answer with a diagram.", pageBreakBefore: true });
    });

    it("a shuffled set keeps figures, explanations and language, and its copies stay out of the bank", async () => {
      const { m1, items } = await fillPaper();
      await prisma.paper.update({ where: { id: paperId }, data: { language: "hi", securityWatermark: true } });

      for (const [handler, path, json] of [
        [duplicateSet, "duplicate-set", { targetSet: "SET B", shuffleQuestions: true, shuffleMcqOptions: true }],
        [parallelSets, "parallel-sets", { sets: ["C"], commonRatio: 1, shufflePositions: false, shuffleMcqOptions: true, prefixTitle: true }],
      ] as const) {
        const res = await call(handler as Handler, "POST", `${P()}/${path}`, { id: paperId }, json);
        expect(res.data?.error).toBeUndefined();
        expect(res.status).toBe(200);
        const setId = (res.data.paper ?? res.data.papers[0]).id;
        const set = await prisma.paper.findUniqueOrThrow({ where: { id: setId }, include: { items: { include: { question: true } } } });
        expect(set, path).toMatchObject({ language: "hi", securityWatermark: true });
        const mcqCopy = set.items.map((i) => i.question).find((q) => q.text === m1.text)!;
        expect(mcqCopy.id, path).not.toBe(m1.id);
        expect(mcqCopy, path).toMatchObject({ explanation: "Plane mirrors always do.", figureScene: '{"v":1}' });
        // a page break marks a place on the sheet: it is kept only when the questions keep their order
        expect(set.items.find((i) => i.questionId === items[5].questionId), path).toMatchObject({
          instruction: "Answer with a diagram.",
          pageBreakBefore: path === "parallel-sets",
        });
      }

      const bank = await call(listQuestions as Handler, "GET", `/api/questions?bookId=${bookId}&take=1000`, {});
      const sameText = (bank.data as Array<{ text: string }>).filter((q) => q.text === m1.text);
      expect(sameText).toHaveLength(1);
    });

    it("auto-fill never places a set's shuffled copy next to its original", async () => {
      const only = await mk("MCQ", ch1, `The only MCQ in this bank ${stamp}`);
      await prisma.question.deleteMany({ where: { bookId, type: "MCQ", id: { not: only.id }, paperQuestions: { none: {} }, orPaperQuestions: { none: {} } } });
      await place(sec.MCQ, only.id, 0);
      const set = await call(duplicateSet as Handler, "POST", `${P()}/duplicate-set`, { id: paperId }, { targetSet: "SET B", shuffleQuestions: false, shuffleMcqOptions: true });
      expect(set.status).toBe(200);

      const fresh = await prisma.paper.create({
        data: { title: `Lifecycle autofill ${stamp}`, blueprintId, layout: "PAGE", schoolName: "Test School", academicSession: "2026–27", createdById: userId },
      });
      const res = await call(autofill as Handler, "POST", `/api/papers/${fresh.id}/autofill`, { id: fresh.id }, { sectionId: sec.MCQ });
      expect(res.status).toBe(200);
      const texts = (await prisma.paperQuestion.findMany({ where: { paperId: fresh.id }, include: { question: true } })).map((i) => i.question.text);
      expect(texts.filter((t) => t === only.text).length).toBeLessThanOrEqual(1);
    });

    it("a reconciled question keeps its figure, explanation and 'attempt any N'", async () => {
      // chapter 1 over quota, chapter 2 short: reconcile re-tags one long question to chapter 2
      const m1 = await mk("MCQ", ch1, `MCQ r1 ${Math.random()}`);
      const m2 = await mk("MCQ", ch1, `MCQ r2 ${Math.random()}`);
      const kept = { explanation: "Marking note", figureScene: '{"v":2}' };
      const match = await mk("MATCH_COLUMN", ch1, "Match the columns.", { optionsJson: JSON.stringify(["A ||| 1", "B ||| 2", "C ||| 3", "D ||| 4"]), ...kept });
      const v1 = await mk("VERY_SHORT", ch2, `VSA r1 ${Math.random()}`);
      const v2 = await mk("VERY_SHORT", ch2, `VSA r2 ${Math.random()}`);
      const anyTwo = { subpartsJson: JSON.stringify({ attemptCount: 2, subparts: anyTwoOfThree }), ...kept };
      const l1 = await mk("LONG", ch1, "Answer any two of the following (reconcile 1).", anyTwo);
      const l2 = await mk("LONG", ch1, "Answer any two of the following (reconcile 2).", anyTwo);
      await place(sec.MCQ, m1.id, 0);
      await place(sec.MCQ, m2.id, 1);
      await place(sec.MATCH_COLUMN, match.id, 0);
      await place(sec.VERY_SHORT, v1.id, 0);
      await place(sec.VERY_SHORT, v2.id, 1);
      await place(sec.LONG, l1.id, 0);
      await place(sec.LONG, l2.id, 1);

      const res = await call(reconcile as Handler, "POST", `${P()}/reconcile-blueprint`, { id: paperId });
      expect(res.status).toBe(200);
      expect(res.data.reassignmentsCount).toBeGreaterThan(0);
      const view = (await loadPaperView(paperId))!;
      expect(view.progress.complete).toBe(true);
      // whichever 4-mark question was re-tagged to chapter 2 is this paper's own copy, complete
      const items = await prisma.paperQuestion.findMany({ where: { paperId }, include: { question: true } });
      const copies = items.map((i) => i.question).filter((q) => q.subpartsJson.includes("_forkedFrom"));
      expect(copies).toHaveLength(1);
      expect(copies[0]).toMatchObject({ chapterId: ch2, ...kept });
      expect(copies[0].subpartsJson).toContain(`"_paperId":"${paperId}"`);
      if (copies[0].type === "LONG") {
        expect(view.items.find((i) => i.question.id === copies[0].id)?.question.attemptCount).toBe(2);
      }
    });
  });

  describe("chapter weightage is a guide", () => {
    /** Chapter 2's whole 8-mark target is used by two 4-mark long questions. */
    async function fillChapterTwo() {
      for (const [i, text] of ["Guide long 1", "Guide long 2"].entries()) {
        const q = await mk("LONG", ch2, `${text} ${stamp}`);
        await place(sec.LONG, q.id, i);
      }
    }

    it("adds a question whose chapter is already at its target", async () => {
      await fillChapterTwo();
      const extra = await mk("VERY_SHORT", ch2, `Guide extra ${stamp}-${Math.random()}`);
      const res = await call(addItem as Handler, "POST", `${P()}/questions`, { id: paperId }, { sectionId: sec.VERY_SHORT, questionId: extra.id });
      expect(res.status).toBe(200);
      expect(await prisma.paperQuestion.count({ where: { paperId, sectionId: sec.VERY_SHORT } })).toBe(1);
    });

    it("auto-fill fills a section from a chapter that is at its target", async () => {
      await fillChapterTwo();
      await prisma.question.deleteMany({ where: { bookId, type: "VERY_SHORT", paperQuestions: { none: {} }, orPaperQuestions: { none: {} } } });
      await mk("VERY_SHORT", ch2, `Guide fill 1 ${stamp}`);
      await mk("VERY_SHORT", ch2, `Guide fill 2 ${stamp}`);
      const res = await call(autofill as Handler, "POST", `${P()}/autofill`, { id: paperId }, { sectionId: sec.VERY_SHORT });
      expect(res.status).toBe(200);
      expect(await prisma.paperQuestion.count({ where: { paperId, sectionId: sec.VERY_SHORT } })).toBe(2);
    });
  });
});
