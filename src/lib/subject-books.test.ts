import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";
import {
  consolidateCurriculumBooks,
  importIntoSubjectBook,
  orderByTextbooks,
  parsePastedChapters,
  splitChapterTitle,
  subjectBookTitle,
  type CurriculumSubjectBooks,
} from "./subjectBooks";
import { isSameSubjectGroup, subjectGroupName } from "./schoolCurriculum";
import { matchOfficialChapterMarks } from "./officialChapterMarks";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as postImport } from "../app/api/books/import/route";

const stamp = Date.now().toString(36);
const LEVEL = 90 + (Date.now() % 9); // "Class 9x": never a real class
const CLASS = `Class ${LEVEL}`;
const SUBJECT = `English`;
const TB_A = `Reader A ${stamp}`;
const TB_B = `Grammar Components ${stamp}`;
const ALL = subjectBookTitle(SUBJECT, CLASS, [TB_A, TB_B]);

const curriculum: CurriculumSubjectBooks[] = [
  {
    classLevel: LEVEL,
    name: SUBJECT,
    textbooks: [
      { title: TB_A, chapters: [{ chapterNumber: 1, title: "A Letter to God" }, { chapterNumber: 2, title: "Two Stories" }] },
      { title: TB_B, chapters: [{ chapterNumber: 1, title: "Reading Skills" }, { chapterNumber: 2, title: "Grammar" }] },
    ],
  },
];

describe("pure helpers", () => {
  it("splits and builds part titles", () => {
    expect(splitChapterTitle("[First Flight] A Letter to God")).toEqual({ part: "First Flight", title: "A Letter to God" });
    expect(splitChapterTitle("Real Numbers")).toEqual({ part: null, title: "Real Numbers" });
    expect(subjectBookTitle("Science", "Class 10", ["Science (NCERT)"])).toBe("Science (NCERT)");
    expect(subjectBookTitle("Hindi", "Class 10", ["Kshitij", "Kritika"])).toBe("Hindi Class 10 – all prescribed books");
  });

  it("parses a pasted list with textbook headings and numbering", () => {
    expect(parsePastedChapters("# First Flight\n1. A Letter to God\nChapter 2: Nelson Mandela\n\n# Footprints\nA Triumph of Surgery", "X")).toEqual([
      { title: "First Flight", chapters: [{ number: 1, title: "A Letter to God" }, { number: 2, title: "Nelson Mandela" }] },
      { title: "Footprints", chapters: [{ number: 1, title: "A Triumph of Surgery" }] },
    ]);
    expect(parsePastedChapters("Real Numbers\nPolynomials", "Maths")).toEqual([
      { title: "Maths", chapters: [{ number: 1, title: "Real Numbers" }, { number: 2, title: "Polynomials" }] },
    ]);
  });

  it("keeps Mathematics Basic and Standard apart, other variants together", () => {
    expect(subjectGroupName("Mathematics Basic")).toBe("Mathematics Basic");
    expect(subjectGroupName("Mathematics Standard")).toBe("Mathematics Standard");
    expect(subjectGroupName("Maths")).toBe("Mathematics");
    expect(isSameSubjectGroup("Mathematics Basic", "Mathematics Standard")).toBe(false);
    expect(isSameSubjectGroup("English Core", "English")).toBe(true);
  });

  it("orders merged chapters by textbook, then by official order", () => {
    const ids = orderByTextbooks(
      [
        { id: "b2", number: 1, title: `[${TB_B}] Grammar` },
        { id: "a1", number: 2, title: `[${TB_A}] A Letter to God` },
        { id: "x", number: 3, title: "Something else" },
        { id: "b1", number: 4, title: `[${TB_B}] Reading Skills` },
        { id: "a2", number: 5, title: `[${TB_A}] Two Stories` },
      ],
      curriculum[0].textbooks,
    );
    expect(ids).toEqual(["a1", "a2", "b1", "b2", "x"]);
  });
});

describe("consolidating per-textbook books into one subject book", () => {
  const made: string[] = [];
  let userId = "";
  const ch: Record<string, string> = {};
  let questionId = "";
  let compositeBlueprintId = "";
  let readerBlueprintId = "";

  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { name: `sb ${stamp}`, email: `sb-${stamp}@test.internal`, passwordHash: "x", role: "ADMIN" } })).id;

    // what the old seed + "combine" left behind: two textbook books and a combined copy
    const a = await prisma.book.create({
      data: { title: TB_A, subject: SUBJECT, className: CLASS, academicSession: "2026-27", chapters: { create: [{ number: 1, title: "A Letter to God" }, { number: 2, title: "Two Stories" }] } },
      include: { chapters: true },
    });
    const b = await prisma.book.create({
      data: { title: TB_B, subject: SUBJECT, className: CLASS, academicSession: "2026-27", chapters: { create: [{ number: 1, title: "Reading Skills" }, { number: 2, title: "Grammar" }] } },
      include: { chapters: true },
    });
    const all = await prisma.book.create({
      data: {
        title: ALL,
        subject: SUBJECT,
        className: CLASS,
        academicSession: "2026–27",
        chapters: { create: [{ number: 1, title: `[${TB_A}] A Letter to God` }, { number: 2, title: `[${TB_B}] Grammar` }] },
      },
      include: { chapters: true },
    });
    made.push(a.id, b.id, all.id);
    for (const c of [...a.chapters, ...b.chapters]) ch[`${c.bookId === a.id ? "A" : "B"}:${c.title}`] = c.id;
    for (const c of all.chapters) ch[`ALL:${c.title}`] = c.id;

    // a question on the reader's copy of a chapter the combined book also has
    questionId = (
      await prisma.question.create({ data: { bookId: a.id, chapterId: ch["A:A Letter to God"], type: "SHORT", text: `Q ${stamp}`, createdById: userId } })
    ).id;
    // the combined book's blueprint: grammar has weightage although no textbook chapter teaches it
    compositeBlueprintId = (
      await prisma.blueprint.create({
        data: {
          name: `BP all ${stamp}`,
          bookId: all.id,
          examType: "ANNUAL",
          durationMin: 180,
          chapters: {
            create: [
              { chapterId: ch[`ALL:[${TB_A}] A Letter to God`], marks: 10, unitKey: "u1", unitTitle: "Literature" },
              { chapterId: ch[`ALL:[${TB_B}] Grammar`], marks: 15, unitKey: "u3", unitTitle: "Grammar" },
            ],
          },
        },
      })
    ).id;
    // an older blueprint made on the reader alone
    readerBlueprintId = (
      await prisma.blueprint.create({
        data: { name: `BP reader ${stamp}`, bookId: b.id, examType: "QUARTERLY", durationMin: 60, chapters: { create: [{ chapterId: ch["B:Reading Skills"], marks: 8 }] } },
      })
    ).id;
  });

  afterAll(async () => {
    const books = await prisma.book.findMany({ where: { className: CLASS }, select: { id: true } });
    const ids = [...new Set([...made, ...books.map((b) => b.id)])];
    await prisma.blueprint.deleteMany({ where: { bookId: { in: ids } } });
    await prisma.question.deleteMany({ where: { bookId: { in: ids } } });
    await prisma.book.deleteMany({ where: { id: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } });
  });

  it("dry run reports the plan without changing anything", async () => {
    const report = await consolidateCurriculumBooks(prisma, curriculum, { dryRun: true });
    expect(report).toHaveLength(1);
    expect(report[0].keptBookId).toBe(made[2]); // the combined book (it carries the blueprint)
    expect(await prisma.book.count({ where: { className: CLASS } })).toBe(3);
  });

  it("leaves one book with every chapter, question and blueprint link intact", async () => {
    const [report] = await consolidateCurriculumBooks(prisma, curriculum);
    expect(report.deletedBooks).toBe(2);
    expect(report.foldedChapters).toBe(2); // the two chapters the combined copy already had
    expect(report.movedChapters).toBe(2);

    const books = await prisma.book.findMany({ where: { className: CLASS }, include: { chapters: { orderBy: { number: "asc" } } } });
    expect(books).toHaveLength(1);
    const book = books[0];
    expect(book.title).toBe(ALL);
    expect(book.academicSession).toBe("2026–27");
    expect(book.chapters.map((c) => c.title)).toEqual([
      `[${TB_A}] A Letter to God`,
      `[${TB_A}] Two Stories`,
      `[${TB_B}] Reading Skills`,
      `[${TB_B}] Grammar`,
    ]);

    // the question now sits on the combined book's chapter
    const q = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
    expect(q.bookId).toBe(book.id);
    expect(q.chapterId).toBe(ch[`ALL:[${TB_A}] A Letter to God`]);

    // quotas unchanged, including the grammar unit
    const compositeRows = await prisma.blueprintChapter.findMany({ where: { blueprintId: compositeBlueprintId }, orderBy: { marks: "asc" } });
    expect(compositeRows.map((r) => [r.chapterId, r.marks, r.unitKey])).toEqual([
      [ch[`ALL:[${TB_A}] A Letter to God`], 10, "u1"],
      [ch[`ALL:[${TB_B}] Grammar`], 15, "u3"],
    ]);
    // the reader's blueprint moved with its chapter (same chapter id, now a part of the book)
    const readerBp = await prisma.blueprint.findUniqueOrThrow({ where: { id: readerBlueprintId }, include: { chapters: { include: { chapter: true } } } });
    expect(readerBp.bookId).toBe(book.id);
    expect(readerBp.chapters.map((r) => [r.chapterId, r.marks, r.chapter.title])).toEqual([
      [ch["B:Reading Skills"], 8, `[${TB_B}] Reading Skills`],
    ]);

    // official marks still match the merged chapters
    const official = matchOfficialChapterMarks(
      book.chapters,
      curriculum[0].textbooks.map((t) => ({ title: t.title, chapters: t.chapters.map((c) => ({ ...c, officialMarks: 5 })) })),
      20,
    );
    expect(official.matched).toBe(4);
    expect(official.exact).toBe(true);
  });

  it("is a no-op the second time", async () => {
    expect(await consolidateCurriculumBooks(prisma, curriculum)).toEqual([]);
  });

  it("import adds only missing chapters, as parts, without touching existing ones", async () => {
    const before = await prisma.chapter.findMany({ where: { book: { className: CLASS } }, orderBy: { number: "asc" } });
    const plan = await importIntoSubjectBook(
      prisma,
      {
        className: CLASS,
        subject: SUBJECT,
        session: "2026–27",
        parts: [
          { title: TB_A, chapters: [{ number: 1, title: "A Letter to God" }, { number: 3, title: "From the Diary of Anne Frank" }] },
          { title: TB_B, chapters: [{ number: 2, title: "Grammar" }] },
        ],
      },
      { dryRun: true },
    );
    expect(plan.createsBook).toBe(false);
    expect(plan.chapters).toEqual([
      { title: `[${TB_A}] A Letter to God`, status: "exists" },
      { title: `[${TB_A}] From the Diary of Anne Frank`, status: "new" },
      { title: `[${TB_B}] Grammar`, status: "exists" },
    ]);

    const applied = await importIntoSubjectBook(prisma, {
      className: CLASS,
      subject: SUBJECT,
      session: "2026-27", // either spelling finds the book
      parts: [{ title: TB_A, chapters: [{ number: 3, title: "From the Diary of Anne Frank" }] }],
    });
    expect(applied.createdChapters).toBe(1);
    const after = await prisma.chapter.findMany({ where: { book: { className: CLASS } }, orderBy: { number: "asc" } });
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after.at(-1)?.title).toBe(`[${TB_A}] From the Diary of Anne Frank`);
    expect(await prisma.book.count({ where: { className: CLASS } })).toBe(1);
  });

  it("the import route fills the subject's book instead of creating new ones, and adds the language units", async () => {
    mockSessionUserId = userId;
    const body = {
      format: "custom",
      customBooks: [
        { title: "Some Preset", className: CLASS, subject: SUBJECT, academicSession: "2026–27", chapters: [{ number: 1, title: "The Hack Driver" }] },
      ],
    };
    const call = (extra: object) =>
      postImport(new Request("http://localhost/api/books/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...extra }) }), {
        params: Promise.resolve({}),
      });

    const dry = (await (await call({ dryRun: true })).json()) as { plans: Array<{ bookTitle: string; chapters: Array<{ title: string; status: string }> }> };
    expect(dry.plans).toHaveLength(1);
    expect(dry.plans[0].bookTitle).toBe(ALL);
    const newTitles = dry.plans[0].chapters.filter((c) => c.status === "new").map((c) => c.title);
    expect(newTitles[0]).toBe("[Some Preset] The Hack Driver");
    expect(newTitles.length).toBeGreaterThan(1); // the missing writing unit is added for a language

    const res = (await (await call({ onlyChapters: [newTitles[0]] })).json()) as { createdChapters: number; createdBooks: number };
    expect(res).toMatchObject({ createdChapters: 1, createdBooks: 0 });
    expect(await prisma.book.count({ where: { className: CLASS } })).toBe(1);
  });
});
