import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as autoFillPaperRoute } from "@/app/api/papers/[id]/autofill/route";
import { POST as commitAiSection } from "@/app/api/papers/[id]/ai-commit-section/route";
import { extractTableFromText } from "./math";
import { prisma } from "./prisma";

describe("Full Paper Completion & Robust Generation Suite", () => {
  let user: { id: string; role: string };
  let bookId: string;
  let ch1Id: string;
  let ch2Id: string;
  let blueprintId: string;
  let secShortId: string;
  let secLongId: string;
  let paperId: string;

  const testStamp = Date.now();

  beforeAll(async () => {
    // 1. Create Teacher User
    user = await prisma.user.create({
      data: {
        name: `Teacher Completion ${testStamp}`,
        email: `teacher-comp-${testStamp}@test.internal`,
        passwordHash: "hash123",
        role: "TEACHER",
        department: "Mathematics",
        active: true,
      },
    });
    mockSessionUserId = user.id;

    // 2. Create Book & Chapters for Class 10 Math
    const book = await prisma.book.create({
      data: {
        title: `Mathematics Class 10 ${testStamp}`,
        subject: "Mathematics",
        className: "Class 10",
        academicSession: "2026–27",
      },
    });
    bookId = book.id;

    const ch1 = await prisma.chapter.create({
      data: { bookId, number: 1, title: "वास्तविक संख्याएँ (Real Numbers)" },
    });
    ch1Id = ch1.id;

    const ch2 = await prisma.chapter.create({
      data: { bookId, number: 2, title: "बहुपद (Polynomials)" },
    });
    ch2Id = ch2.id;

    // 3. Create Blueprint with 3-mark and 4-mark sections (both require internal choice in MPBSE)
    const bp = await prisma.blueprint.create({
      data: {
        name: `MPBSE Class 10 Math BP ${testStamp}`,
        bookId,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 180,
        chapters: {
          create: [
            { chapterId: ch1Id, marks: 3 },
            { chapterId: ch2Id, marks: 4 },
          ],
        },
        sections: {
          create: [
            {
              position: 1,
              title: "Questions 18 to 20: Short Answer Questions",
              instructions: "Answer each in 75 words. Each carries 3 marks.",
              type: "SHORT",
              count: 1,
              marksEach: 3,
            },
            {
              position: 2,
              title: "Questions 21 to 23: Long Answer Questions",
              instructions: "Answer each in 120 words. Each carries 4 marks.",
              type: "LONG",
              count: 1,
              marksEach: 4,
            },
          ],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    secShortId = bp.sections[0].id;
    secLongId = bp.sections[1].id;

    // 4. Create empty draft Paper
    const paper = await prisma.paper.create({
      data: {
        blueprintId,
        title: `Class 10 Mathematics Standard — Annual Exam ${testStamp}`,
        createdById: user.id,
        status: "DRAFT",
        academicSession: "2026–27",
        schoolName: "MP Board Model School",
        layout: "SINGLE_COLUMN",
      },
    });
    paperId = paper.id;
  });

  afterAll(async () => {
    await prisma.paperQuestion.deleteMany({ where: { paperId } }).catch(() => {});
    await prisma.paper.deleteMany({ where: { id: paperId } }).catch(() => {});
    await prisma.blueprintChapter.deleteMany({ where: { blueprintId } }).catch(() => {});
    await prisma.blueprintSection.deleteMany({ where: { blueprintId } }).catch(() => {});
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } }).catch(() => {});
    await prisma.question.deleteMany({ where: { bookId } }).catch(() => {});
    await prisma.chapter.deleteMany({ where: { bookId } }).catch(() => {});
    await prisma.book.deleteMany({ where: { id: bookId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: user.id } }).catch(() => {});
  });

  it("1. Smart Auto-Fill synthesizes curriculum-grounded questions with internal choices when bank is empty", async () => {
    const fakeReq = new Request(`http://localhost/api/papers/${paperId}/autofill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await autoFillPaperRoute(fakeReq as any, { params: Promise.resolve({ id: paperId }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.addedCount).toBe(2);
    expect(data.unfilled).toHaveLength(0);
    expect(data.complete).toBe(true);

    // Verify paper items in database have internal choice pairs for both 3m and 4m
    const paperItems = await prisma.paperQuestion.findMany({
      where: { paperId },
      include: { question: true, orQuestion: true },
    });
    expect(paperItems).toHaveLength(2);

    for (const item of paperItems) {
      expect(item.question).toBeDefined();
      expect(item.orQuestion).toBeDefined();
      expect(item.orQuestionId).toBeTruthy();
      expect(item.question.text).toBeTruthy();
      expect(item.orQuestion?.text).toBeTruthy();
      expect(item.question.text).not.toEqual(item.orQuestion?.text);
    }
  });

  it("2. POST /api/papers/[id]/ai-commit-section reliably commits 3-mark questions with OR choices", async () => {
    // Clear items from paper for test 2
    await prisma.paperQuestion.deleteMany({ where: { paperId } });

    const req = new Request(`http://localhost/api/papers/${paperId}/ai-commit-section`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId: secShortId,
        questions: [
          {
            type: "SHORT",
            chapterId: ch1Id,
            chapterNumber: 1,
            chapterTitle: "वास्तविक संख्याएँ (Real Numbers)",
            marks: 3,
            difficulty: "MEDIUM",
            cognitiveLevel: "UNDERSTANDING",
            text: "सिद्ध कीजिए कि $\\sqrt{5}$ एक अपरिमेय संख्या है।",
            answer: "माना $\\sqrt{5} = a/b$ जहाँ $a$ और $b$ सह-अभाज्य पूर्णांक हैं। $5b^2 = a^2$, अतः 5, $a^2$ को विभाजित करता है। विरोधाभास से सिद्ध होता है।",
            requiresInternalChoice: true,
            orQuestion: {
              type: "SHORT",
              chapterId: ch1Id,
              chapterNumber: 1,
              chapterTitle: "वास्तविक संख्याएँ (Real Numbers)",
              marks: 3,
              difficulty: "MEDIUM",
              cognitiveLevel: "APPLYING",
              text: "अभाज्य गुणनखण्ड विधि द्वारा 96 और 404 का HCF ज्ञात कीजिए और फिर इनका LCM ज्ञात कीजिए।",
              answer: "96 = $2^5 \\times 3$, 404 = $2^2 \\times 101$. HCF = $2^2 = 4$. LCM = $(96 \\times 404)/4 = 9696$.",
            },
          },
        ],
      }),
    });

    const res = await commitAiSection(req as any, { params: Promise.resolve({ id: paperId }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.addedCount).toBe(1);
    expect(data.paper.items).toHaveLength(1);
    expect(data.paper.items[0].orQuestion).toBeDefined();
    expect(data.paper.items[0].orQuestion.text).toContain("96 और 404");
  });

  it("3. extractTableFromText handles single-line frequency distribution tables with inline prose", () => {
    const rawSingleLine = "For the following distribution, the modal class is: | Marks | Number of Students | | :--- | :--- | | 0-10 | 3 | | 10-20 | 12 | | 20-30 | 20 | | 30-40 | 10 | | 40-50 | 5 | Find the mode.";
    const tableData = extractTableFromText(rawSingleLine);

    expect(tableData).not.toBeNull();
    expect(tableData?.table).not.toBeNull();
    expect(tableData?.table?.headers).toEqual(["Marks", "Number of Students"]);
    expect(tableData?.table?.rows).toHaveLength(5);
    expect(tableData?.table?.rows[0]).toEqual(["0-10", "3"]);
    expect(tableData?.table?.rows[1]).toEqual(["10-20", "12"]);
    expect(tableData?.table?.rows[2]).toEqual(["20-30", "20"]);
    expect(tableData?.prefixText).toContain("For the following distribution");
    expect(tableData?.suffixText).toContain("Find the mode.");
  });
});
