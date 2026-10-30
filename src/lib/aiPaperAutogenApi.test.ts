import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { GET as getAiPlan } from "@/app/api/papers/[id]/ai-plan/route";
import { POST as generateSection } from "@/app/api/papers/[id]/ai-generate-section/route";
import { POST as commitSection } from "@/app/api/papers/[id]/ai-commit-section/route";
import { prisma } from "./prisma";

describe("AI Paper Generation API Pipeline", () => {
  let user: { id: string; role: string };
  let bookId: string;
  let ch1Id: string;
  let ch2Id: string;
  let blueprintId: string;
  let section1Id: string;
  let section2Id: string;
  let paperId: string;

  const testStamp = Date.now();

  beforeAll(async () => {
    // 1. Create Teacher User
    user = await prisma.user.create({
      data: {
        name: `Teacher AI Test ${testStamp}`,
        email: `teacher-ai-${testStamp}@test.internal`,
        passwordHash: "hash123",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });
    mockSessionUserId = user.id;

    // 2. Create Book & Chapters
    const book = await prisma.book.create({
      data: {
        title: `Biology AI Test ${testStamp}`,
        subject: "Biology",
        className: "Class 12",
        academicSession: "2026–27",
      },
    });
    bookId = book.id;

    const ch1 = await prisma.chapter.create({
      data: { bookId, number: 1, title: "Sexual Reproduction in Flowering Plants" },
    });
    ch1Id = ch1.id;

    const ch2 = await prisma.chapter.create({
      data: { bookId, number: 2, title: "Human Reproduction" },
    });
    ch2Id = ch2.id;

    // 3. Create Blueprint
    const bp = await prisma.blueprint.create({
      data: {
        name: `Class 12 Bio Blueprint ${testStamp}`,
        bookId,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 180,
        chapters: {
          create: [
            { chapterId: ch1Id, marks: 3 },
            { chapterId: ch2Id, marks: 3 },
          ],
        },
        sections: {
          create: [
            {
              position: 1,
              title: "Multiple Choice Questions",
              instructions: "Choose the correct option",
              type: "MCQ",
              count: 2,
              marksEach: 1,
            },
            {
              position: 2,
              title: "Short Answer Questions",
              instructions: "Answer in 30-50 words",
              type: "SHORT",
              count: 2,
              marksEach: 2,
            },
          ],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    section1Id = bp.sections[0].id;
    section2Id = bp.sections[1].id;

    // 4. Create Paper
    const p = await prisma.paper.create({
      data: {
        title: `Bio Annual Exam Mock ${testStamp}`,
        blueprintId,
        layout: "BOOKLET_A4",
        schoolName: "Test School",
        academicSession: "2026–27",
        createdById: user.id,
      },
    });
    paperId = p.id;
  });

  afterAll(async () => {
    // Cleanup in order
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
    await prisma.paper.deleteMany({ where: { id: paperId } });
    await prisma.question.deleteMany({ where: { bookId } });
    await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
    await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    await prisma.chapter.deleteMany({ where: { bookId } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it("1. GET /api/papers/[id]/ai-plan returns balanced empty slot plan", async () => {
    const fakeReq = new Request("http://localhost/api/papers/p/ai-plan");
    const res = await getAiPlan(fakeReq, { params: Promise.resolve({ id: paperId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.plan).toBeDefined();
    expect(json.plan.totalQuestionsNeeded).toBe(4);
    expect(json.plan.totalMarksNeeded).toBe(6);
    expect(json.plan.sections.length).toBe(2);

    const s1 = json.plan.sections.find((s: any) => s.sectionId === section1Id);
    expect(s1.slots.length).toBe(2);
    expect(s1.marksEach).toBe(1);

    const s2 = json.plan.sections.find((s: any) => s.sectionId === section2Id);
    expect(s2.slots.length).toBe(2);
    expect(s2.marksEach).toBe(2);
  });

  it("2. POST /api/papers/[id]/ai-generate-section generates questions with mock fallback", async () => {
    const prevKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "";
    try {
      const fakeReq = new Request("http://localhost/api/papers/p/ai-generate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionTitle: "Multiple Choice Questions",
          sectionType: "MCQ",
          marksEach: 1,
          language: "en",
          difficulty: "BALANCED",
          generateDiagrams: true,
          slots: [
            { slotIndex: 0, chapterId: ch1Id, chapterNumber: 1, chapterTitle: "Sexual Reproduction", marks: 1 },
            { slotIndex: 1, chapterId: ch2Id, chapterNumber: 2, chapterTitle: "Human Reproduction", marks: 1 },
          ],
        }),
      });

      const res = await generateSection(fakeReq, { params: Promise.resolve({ id: paperId }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.questions.length).toBe(2);
      expect(json.questions[0].type).toBe("MCQ");
      expect(json.questions[0].options.length).toBe(4);
      expect(json.questions[0].chapterId).toBe(ch1Id);
    } finally {
      process.env.GEMINI_API_KEY = prevKey;
    }
  });

  it("3. POST /api/papers/[id]/ai-commit-section persists questions into database and links to paper", async () => {
    const fakeReq = new Request("http://localhost/api/papers/p/ai-commit-section", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId: section1Id,
        questions: [
          {
            slotIndex: 0,
            chapterId: ch1Id,
            chapterNumber: 1,
            chapterTitle: "Sexual Reproduction",
            type: "MCQ",
            text: "Which cell division occurs during microsporogenesis in angiosperms?",
            options: ["Meiosis", "Mitosis", "Amitosis", "Endomitosis"],
            subparts: [],
            answer: "Meiosis",
            difficulty: "MEDIUM",
            imagePath: "test-diagram.png",
          },
        ],
      }),
    });

    const res = await commitSection(fakeReq, { params: Promise.resolve({ id: paperId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.addedCount).toBe(1);

    // Verify paper now contains 1 item
    const paperInDb = await prisma.paper.findUnique({
      where: { id: paperId },
      include: { items: { include: { question: true } } },
    });

    expect(paperInDb?.items.length).toBe(1);
    expect(paperInDb?.items[0].sectionId).toBe(section1Id);
    expect(paperInDb?.items[0].question.chapterId).toBe(ch1Id);
    expect(paperInDb?.items[0].question.text).toContain("microsporogenesis");
    expect(paperInDb?.items[0].question.imagePath).toBe("test-diagram.png");
  });

  it("4. Blocks commit to finalized paper with 403 / 409", async () => {
    await prisma.paper.update({
      where: { id: paperId },
      data: { status: "FINAL" },
    });

    const fakeReq = new Request("http://localhost/api/papers/p/ai-commit-section", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId: section1Id,
        questions: [{ chapterId: ch1Id, type: "MCQ", text: "Test", answer: "A" }],
      }),
    });

    const res = await commitSection(fakeReq, { params: Promise.resolve({ id: paperId }) });
    expect([403, 409]).toContain(res.status);

    // Revert status
    await prisma.paper.update({
      where: { id: paperId },
      data: { status: "DRAFT" },
    });
  });

  it("5. Rejects committing contaminated/generic fallback questions into a paper with 422", async () => {
    const fakeReq = new Request("http://localhost/api/papers/p/ai-commit-section", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId: section2Id,
        questions: [
          {
            slotIndex: 0,
            chapterId: ch1Id,
            chapterNumber: 1,
            chapterTitle: "Sexual Reproduction in Flowering Plants",
            type: "SHORT",
            text: "Examine the fundamental principles of Sexual Reproduction in Flowering Plants. Describe the core mechanisms and their biological/scientific significance in standard board curriculum context.",
            options: [],
            subparts: [],
            answer: "Key Concept: Sexual Reproduction principle and definition.",
            difficulty: "MEDIUM",
          },
        ],
      }),
    });

    const res = await commitSection(fakeReq, { params: Promise.resolve({ id: paperId }) });
    expect(res.status).toBe(422);
  });
});
