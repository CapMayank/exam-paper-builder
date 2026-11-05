import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as commitSection } from "@/app/api/papers/[id]/ai-commit-section/route";
import { slotTaskDirective } from "./paperAutogen";
import { prisma } from "./prisma";

/**
 * A section accepts other forms at the same marks (an unseen passage or a writing task in an English paper's
 * five-mark long-answer section). Committing such a question failed with "Expected question type LONG" and was
 * then regenerated as a LONG question that kept the passage label ("only 96 words", "requires graded subparts").
 */
describe("a question in one of the section's other allowed forms", () => {
  const stamp = Date.now();
  let userId: string;
  let bookId: string;
  let chapterId: string;
  let blueprintId: string;
  let sectionId: string;
  let paperId: string;

  const passage =
    "Read the following passage carefully and answer the questions that follow: " +
    Array.from({ length: 14 }, (_, i) =>
      `Every morning the old gardener ${["watered", "pruned", "weeded", "planted", "watched"][i % 5]} the rows of marigolds near the village well, and the children stopped to ask him questions about seeds.`,
    ).join(" ");

  const passageQuestion = () => ({
    slotIndex: 0,
    chapterId,
    chapterNumber: 1,
    chapterTitle: "Reading",
    type: "UNSEEN_PASSAGE",
    text: passage,
    options: [],
    subparts: ["(i)", "(ii)", "(iii)", "(iv)", "(v)"].map((label, i) => ({
      label,
      text: `Question ${i + 1} about what the gardener did near the well?`,
      marks: 1,
      answer: `Answer ${i + 1}`,
    })),
    answer: "",
    difficulty: "MEDIUM",
  });

  const commit = (questions: unknown[]) =>
    commitSection(
      new Request(`http://localhost/api/papers/${paperId}/ai-commit-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, questions }),
      }),
      { params: Promise.resolve({ id: paperId }) },
    );

  beforeAll(async () => {
    userId = (
      await prisma.user.create({ data: { name: `Alt type ${stamp}`, email: `alt-type-${stamp}@test.internal`, passwordHash: "hash", role: "TEACHER", active: true } })
    ).id;
    bookId = (await prisma.book.create({ data: { title: `Alt type ${stamp}`, subject: "English", className: "Class 7", academicSession: "2026–27" } })).id;
    chapterId = (await prisma.chapter.create({ data: { bookId, number: 1, title: "Reading" } })).id;
    const bp = await prisma.blueprint.create({
      data: {
        name: `Alt type BP ${stamp}`,
        bookId,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 120,
        chapters: { create: [{ chapterId, marks: 20 }] },
        sections: {
          create: [
            {
              position: 1,
              title: "Section E – Five-Mark Questions",
              instructions: "",
              type: "LONG",
              count: 4,
              marksEach: 5,
              allowedTypesJson: JSON.stringify(["LONG", "SHORT", "WRITING_SKILL", "UNSEEN_PASSAGE"]),
            },
          ],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    sectionId = bp.sections[0].id;
    paperId = (
      await prisma.paper.create({ data: { title: `Alt type paper ${stamp}`, blueprintId, layout: "PAGE", schoolName: "Test School", createdById: userId, status: "DRAFT" } })
    ).id;
  });

  beforeEach(async () => {
    mockSessionUserId = userId;
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
  });

  afterAll(async () => {
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
    await prisma.paper.deleteMany({ where: { id: paperId } });
    await prisma.question.deleteMany({ where: { bookId } });
    await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
    await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    await prisma.chapter.deleteMany({ where: { bookId } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("commits an unseen passage into a long-answer section, checked as a passage", async () => {
    const res = await commit([passageQuestion()]);
    const body = await res.json();
    expect(res.status, JSON.stringify(body).slice(0, 400)).toBe(200);
    expect(body.addedCount).toBe(1);
    const saved = await prisma.question.findFirst({ where: { bookId, type: "UNSEEN_PASSAGE" } });
    expect(saved?.text).toContain("old gardener");
    expect(JSON.parse(saved!.subpartsJson)).toHaveLength(5);
  });

  it("still refuses a form the section does not accept", async () => {
    const res = await commit([{ ...passageQuestion(), type: "MCQ" }]);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/only accepts/);
  });
});

describe("the task given to the model follows the form the teacher picked", () => {
  it("asks for a writing task, not a reading passage, on a row named after unseen passages", () => {
    const d = slotTaskDirective("PASSAGE", "Reading Comprehension (Unseen Passage)", "WRITING_SKILL", 5, "English");
    expect(d).toMatch(/^Writing task/);
    expect(d).toMatch(/NOT a reading passage/);
    expect(d).not.toMatch(/Reading Comprehension/);
  });

  it("asks for an original passage when the teacher picks Unseen passage on a lesson row", () => {
    const d = slotTaskDirective("LESSON", "Three Questions", "UNSEEN_PASSAGE", 5, "English");
    expect(d).toMatch(/^Unseen passage worth 5 marks/);
  });

  it("keeps the row's own directive for the default forms", () => {
    expect(slotTaskDirective("WRITING", "Letter writing", "LONG", 5, "English")).toMatch(/Writing task on "Letter writing"/);
    expect(slotTaskDirective("LESSON", "Three Questions", "LONG", 5, "English")).toMatch(/Textbook-based/);
  });
});

describe("passage reading level follows the class", () => {
  it("asks for plain vocabulary in middle school and allows richer prose in senior classes", () => {
    expect(slotTaskDirective("PASSAGE", "Unseen passage", "UNSEEN_PASSAGE", 5, "English", "Class 7")).toMatch(/Class 7: plain, familiar vocabulary/);
    expect(slotTaskDirective("PASSAGE", "Unseen passage", "UNSEEN_PASSAGE", 5, "English", "Class 12")).toMatch(/senior-secondary prose/);
    expect(slotTaskDirective("PASSAGE", "Unseen passage", "UNSEEN_PASSAGE", 5, "English")).not.toMatch(/Write for Class/);
  });
});

describe("Sanskrit and reference-to-context tasks", () => {
  it("asks Class 8 Sanskrit writing in the paper's forms: a letter from a word bank or five sentences", () => {
    const d = slotTaskDirective("WRITING", "रचनात्मक कार्यम्", "WRITING_SKILL", 5, "Sanskrit", "Class 8");
    expect(d).toMatch(/पत्रं पूरयत/);
    expect(d).toMatch(/पञ्च वाक्यानि/);
    expect(slotTaskDirective("WRITING", "Writing", "WRITING_SKILL", 5, "Sanskrit", "Class 10")).not.toMatch(/पञ्च वाक्यानि/);
  });

  it("makes a reference-to-context question quote its extract", () => {
    expect(slotTaskDirective("LESSON", "मित्रलक्षणम्", "REFERENCE_CONTEXT", 5, "Sanskrit", "Class 8")).toMatch(/MUST first quote/);
  });
});
