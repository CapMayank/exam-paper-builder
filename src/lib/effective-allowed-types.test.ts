import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as addItem } from "@/app/api/papers/[id]/questions/route";
import { classNumberOf, orChapterRequired } from "./internalChoiceRules";
import { prisma } from "./prisma";
import { allowedTypesFor, effectiveAllowedTypesJson, withEffectiveAllowedTypes } from "./sectionTypes";

const short3 = (allowedTypesJson?: string | null) => ({ type: "SHORT", marksEach: 3, allowedTypesJson });
const english = (className: string | null) => ({ className, subject: "English" });
const parsed = (json: string) => JSON.parse(json) as string[];

/** Up to class 8 (or a class with no readable number) an umbrella section with no stored list takes the school's usual forms. */
describe("effectiveAllowedTypesJson", () => {
  it("a class 6 English 3-mark short section with no stored list takes the usual forms, its own type first", () => {
    const list = parsed(effectiveAllowedTypesJson(short3("[]"), english("Class 6")));
    expect(list[0]).toBe("SHORT");
    for (const t of ["LONG", "GRAMMAR", "REFERENCE_CONTEXT", "UNSEEN_PASSAGE"]) expect(list).toContain(t);
  });

  it("from class 9 a section with no stored list keeps its own type only", () => {
    expect(effectiveAllowedTypesJson(short3("[]"), english("Class 10"))).toBe("[]");
    expect(allowedTypesFor(withEffectiveAllowedTypes(short3("[]"), english("Class 10")))).toEqual(["SHORT"]);
  });

  it("a stored non-empty list wins on any class", () => {
    const stored = JSON.stringify(["SHORT", "DRAW"]);
    expect(effectiveAllowedTypesJson(short3(stored), english("Class 6"))).toBe(stored);
    expect(effectiveAllowedTypesJson(short3(stored), english("Class 10"))).toBe(stored);
  });

  it("null, empty, unparsable and non-list values count as no stored list", () => {
    for (const v of [null, undefined, "", "not json", "{}", "[]", "[1, 2]"]) {
      expect(parsed(effectiveAllowedTypesJson(short3(v), english("Class 6"))), String(v)).toContain("GRAMMAR");
    }
  });

  it("a class with no readable number (Nursery, KG) takes the defaults", () => {
    expect(parsed(effectiveAllowedTypesJson(short3("[]"), english("Nursery")))).toContain("GRAMMAR");
    expect(parsed(effectiveAllowedTypesJson(short3("[]"), english("KG")))).toContain("GRAMMAR");
    expect(parsed(effectiveAllowedTypesJson(short3("[]"), english(null)))).toContain("GRAMMAR");
  });

  it("a kindergarten section type is never widened", () => {
    expect(effectiveAllowedTypesJson({ type: "KDG_TRACE_WRITE", marksEach: 3, allowedTypesJson: "[]" }, english("Nursery"))).toBe("[]");
    expect(effectiveAllowedTypesJson({ type: "KDG_PICTURE_MATCH", marksEach: 1, allowedTypesJson: null }, english("Class 1"))).toBe("[]");
  });

  it("reads the class exactly as the OR rule does", () => {
    for (const c of ["Class VIII", "8th", "Class8"]) expect(parsed(effectiveAllowedTypesJson(short3("[]"), english(c))), c).toContain("GRAMMAR");
    for (const c of ["Class IX", "Class 10A"]) expect(effectiveAllowedTypesJson(short3("[]"), english(c)), c).toBe("[]");
    for (const c of ["Class 1", "Class 8", "8th", "Class VIII", "Class8", "Nursery", "KG", "Class 9", "Class IX", "Class 10A", "XII", "", null]) {
      const widened = effectiveAllowedTypesJson(short3("[]"), english(c)) !== "[]";
      expect(widened, String(c)).toBe(!orChapterRequired(c));
    }
  });

  it("classNumberOf reads digits, ordinals and Roman numerals; null when there is none", () => {
    expect(classNumberOf("Class 8")).toBe(8);
    expect(classNumberOf("Class VIII")).toBe(8);
    expect(classNumberOf("10A")).toBe(10);
    expect(classNumberOf("Nursery")).toBeNull();
    expect(classNumberOf(null)).toBeNull();
  });

  it("a 1-mark MCQ section in class 5 Science takes the objective forms", () => {
    expect(parsed(effectiveAllowedTypesJson({ type: "MCQ", marksEach: 1, allowedTypesJson: "[]" }, { className: "Class 5", subject: "Science" }))).toEqual([
      "MCQ",
      "FILL_BLANK",
      "TRUE_FALSE",
      "MATCH_COLUMN",
    ]);
  });

  it("withEffectiveAllowedTypes keeps every other field of the section", () => {
    const s = { id: "s1", title: "Short answer", count: 4, ...short3("[]") };
    const out = withEffectiveAllowedTypes(s, english("Class 6"));
    expect(out).toMatchObject({ id: "s1", title: "Short answer", count: 4, type: "SHORT", marksEach: 3 });
    expect(allowedTypesFor(out)).toContain("GRAMMAR");
  });
});

/** POST /api/papers/:id/questions: a grammar question in an English 3-mark short-answer section with no stored list. */
describe("adding another form of question to an umbrella section", () => {
  const stamp = Date.now();
  let userId: string;
  const bookIds: string[] = [];
  const blueprintIds: string[] = [];
  const paperIds: string[] = [];

  async function paperFor(className: string) {
    const tag = `${stamp}-${className}-${bookIds.length}`;
    const book = await prisma.book.create({ data: { title: `Umbrella ${tag}`, subject: "English", className, academicSession: "2026–27" } });
    bookIds.push(book.id);
    const ch1 = (await prisma.chapter.create({ data: { bookId: book.id, number: 1, title: "The Little Girl" } })).id;
    const bp = await prisma.blueprint.create({
      data: {
        name: `Umbrella BP ${tag}`,
        bookId: book.id,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 120,
        chapters: { create: [{ chapterId: ch1, marks: 12 }] },
        sections: { create: [{ position: 1, title: "Short answer", instructions: "", type: "SHORT", count: 4, marksEach: 3, allowedTypesJson: "[]" }] },
      },
      include: { sections: true },
    });
    blueprintIds.push(bp.id);
    const paperId = (
      await prisma.paper.create({
        data: { title: `Umbrella paper ${tag}`, blueprintId: bp.id, layout: "PAGE", schoolName: "Test School", createdById: userId, status: "DRAFT" },
      })
    ).id;
    paperIds.push(paperId);
    const grammar = await prisma.question.create({
      data: { bookId: book.id, chapterId: ch1, type: "GRAMMAR", text: "Change the voice: The cat chased the mouse.", answer: "The mouse was chased by the cat.", createdById: userId },
    });
    return { paperId, sectionId: bp.sections[0].id, questionId: grammar.id };
  }

  const add = (paperId: string, json: unknown) =>
    addItem(
      new Request(`http://localhost/api/papers/${paperId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      }),
      { params: Promise.resolve({ id: paperId }) },
    );

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: `Umbrella ${stamp}`, email: `umbrella-${stamp}@test.internal`, passwordHash: "hash", role: "TEACHER", active: true },
    });
    userId = user.id;
    mockSessionUserId = userId;
  });

  afterAll(async () => {
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

  it("is accepted on a class 6 paper, and the paper view lists the wider types for the section", async () => {
    const { paperId, sectionId, questionId } = await paperFor("Class 6");
    const res = await add(paperId, { sectionId, questionId });
    const json = await res.json();
    expect(json.error).toBeUndefined();
    expect(res.status).toBe(200);
    expect(json.items.map((i: { question: { id: string } }) => i.question.id)).toContain(questionId);
    const section = json.blueprint.sections.find((s: { id: string }) => s.id === sectionId);
    expect(allowedTypesFor(section)).toEqual(expect.arrayContaining(["SHORT", "LONG", "GRAMMAR", "REFERENCE_CONTEXT", "UNSEEN_PASSAGE"]));
    // nothing written to the blueprint: the stored list stays empty
    expect((await prisma.blueprintSection.findUnique({ where: { id: sectionId } }))?.allowedTypesJson).toBe("[]");
  });

  it("is refused on a class 10 paper, as before", async () => {
    const { paperId, sectionId, questionId } = await paperFor("Class 10");
    const res = await add(paperId, { sectionId, questionId });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/only accepts/);
    expect(await prisma.paperQuestion.count({ where: { paperId } })).toBe(0);
  });
});
