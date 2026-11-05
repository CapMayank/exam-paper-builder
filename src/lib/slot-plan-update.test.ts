import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { matchSectionIds } from "./blueprintSetupPlan";
import { updateBlueprintWithPapers } from "./blueprintWrite";
import { prisma } from "./prisma";

/**
 * A blueprint made from the earlier Classes 5–8 English pattern had "MCQ 4 + MCQ 1" under one heading. Updating
 * it to the one-row pattern must move the grammar MCQ into the row of five, not archive it.
 */
describe("updating a split-row blueprint to one row per form", () => {
  const stamp = Date.now();
  let userId: string, bookId: string, lessonId: string, grammarId: string, blueprintId: string, paperId: string;
  let lessonRow: string, grammarRow: string;

  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { name: `Merge ${stamp}`, email: `merge-${stamp}@test.internal`, passwordHash: "hash", role: "ADMIN", active: true } })).id;
    bookId = (await prisma.book.create({ data: { title: `Merge ${stamp}`, subject: "English", className: "Class 8", academicSession: "2026–27" } })).id;
    lessonId = (await prisma.chapter.create({ data: { bookId, number: 1, title: "The Best Christmas Present" } })).id;
    grammarId = (await prisma.chapter.create({ data: { bookId, number: 2, title: "Grammar" } })).id;
    const title = "Multiple Choice Questions";
    const bp = await prisma.blueprint.create({
      data: {
        name: `Merge BP ${stamp}`, bookId, academicSession: "2026–27", examType: "ANNUAL", durationMin: 60,
        chapters: { create: [{ chapterId: lessonId, marks: 4 }, { chapterId: grammarId, marks: 1 }] },
        sections: {
          create: [
            { position: 0, title, type: "MCQ", count: 4, marksEach: 1, role: "LITERATURE" },
            { position: 1, title, type: "MCQ", count: 1, marksEach: 1, role: "GRAMMAR" },
          ],
        },
      },
      include: { sections: { orderBy: { position: "asc" } } },
    });
    blueprintId = bp.id;
    [lessonRow, grammarRow] = bp.sections.map((s) => s.id);
    paperId = (await prisma.paper.create({ data: { title: `Merge ${stamp}`, blueprintId, layout: "PAGE", schoolName: "S", createdById: userId, status: "DRAFT" } })).id;
    const q = (chapterId: string, text: string) => prisma.question.create({ data: { bookId, chapterId, type: "MCQ", text, optionsJson: '["a","b","c","d"]', createdById: userId } });
    const l1 = await q(lessonId, "Who wrote the letter?");
    const l2 = await q(lessonId, "Where was the box found?");
    const g1 = await q(grammarId, "Choose the correct article.");
    await prisma.paperQuestion.create({ data: { paperId, sectionId: lessonRow, questionId: l1.id, position: 0 } });
    await prisma.paperQuestion.create({ data: { paperId, sectionId: lessonRow, questionId: l2.id, position: 1 } });
    await prisma.paperQuestion.create({ data: { paperId, sectionId: grammarRow, questionId: g1.id, position: 0 } });
  });

  afterAll(async () => {
    await prisma.paperSnapshot.deleteMany({ where: { paperId } });
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
    await prisma.paper.deleteMany({ where: { id: paperId } });
    await prisma.question.deleteMany({ where: { bookId } });
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    await prisma.chapter.deleteMany({ where: { bookId } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("moves the grammar question into the merged row and archives nothing", async () => {
    const existing = await prisma.blueprintSection.findMany({ where: { blueprintId }, orderBy: { position: "asc" } });
    const merged = {
      title: "Multiple Choice Questions", instructions: "", type: "MCQ" as const, count: 5, marksEach: 1,
      orChoiceMode: "NOT_REQUIRED" as const, orAlternativeCount: 0, orSlotsJson: "[]", allowedTypesJson: '["MCQ","GRAMMAR"]',
      slotPlanJson: JSON.stringify([{ role: "LITERATURE" }, { role: "LITERATURE" }, { role: "LITERATURE" }, { role: "GRAMMAR" }, { role: "LITERATURE" }]),
      role: "LITERATURE" as const, groupKey: "mcq",
    };
    const { sections, removedIds } = matchSectionIds(existing, [merged]);
    expect(removedIds).toEqual([grammarRow]);
    const res = await updateBlueprintWithPapers(
      blueprintId,
      {
        name: `Merge BP ${stamp}`, bookId, academicSession: "2026–27", examType: "ANNUAL", durationMin: 60, subjectCode: "",
        chapters: [{ chapterId: lessonId, marks: 4, unitKey: "", unitTitle: "" }, { chapterId: grammarId, marks: 1, unitKey: "", unitTitle: "" }],
        sections,
      } as never,
      { id: userId, name: "x", email: "x", role: "ADMIN" } as never,
    );
    expect(res.archivedQuestions).toBe(0);
    const rows = await prisma.blueprintSection.findMany({ where: { blueprintId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(5);
    const items = await prisma.paperQuestion.findMany({ where: { paperId }, orderBy: { position: "asc" } });
    expect(items.map((i) => [i.sectionId, i.position])).toEqual([[lessonRow, 0], [lessonRow, 1], [lessonRow, 2]]);
  });
});
