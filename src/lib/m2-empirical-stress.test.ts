import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";
import { parseSubparts, type SubPart, subpartsTotalMarks, validateSubPartsSum } from "./types";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { PATCH, PUT } from "../app/api/papers/[id]/questions/[itemId]/route";

describe("Milestone 2 Empirical Stress Tests: Route Guardrails & Subparts Logic", () => {
  // Test fixture IDs
  let testUserId: string;
  let bookId: string;
  let ch1Id: string;
  let ch2Id: string;
  let otherBookId: string;
  let otherBookChId: string;
  let blueprintId: string;
  let sectionShortId: string;
  let sectionCaseStudyId: string;
  let paperId: string;
  let shortItemId: string;
  let caseStudyItemId: string;

  // Questions
  let qPrimaryShortCh1Id: string;
  let qAltSameCh1Id: string;
  let qAltDiffCh2Id: string;
  let qAltDiffTypeMcqId: string;
  let qAltOtherBookId: string;
  let qReplacementSameCh1Id: string;
  let qReplacementDiffCh2Id: string;

  let qCsPrimaryCh1Id: string;
  let qCsAltValidCh1Id: string;
  let qCsAltMismatchMarksCh1Id: string;

  beforeAll(async () => {
    // 1. User
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("Database missing user");
    testUserId = user.id;
    mockSessionUserId = testUserId;

    // 2. Books & Chapters
    const book = await prisma.book.create({
      data: {
        title: "M2 Empirical Stress Book",
        subject: "Mathematics",
        className: "Class 10",
        chapters: {
          create: [
            { number: 101, title: "Stress Ch 1" },
            { number: 102, title: "Stress Ch 2" },
          ],
        },
      },
      include: { chapters: true },
    });
    bookId = book.id;
    ch1Id = book.chapters.find((c) => c.number === 101)!.id;
    ch2Id = book.chapters.find((c) => c.number === 102)!.id;

    const otherBook = await prisma.book.create({
      data: {
        title: "M2 Other Book",
        subject: "Science",
        className: "Class 10",
        chapters: {
          create: [{ number: 201, title: "Other Science Ch" }],
        },
      },
      include: { chapters: true },
    });
    otherBookId = otherBook.id;
    otherBookChId = otherBook.chapters[0].id;

    // 3. Blueprint with 2 sections: SHORT (2 marks each) and CASE_STUDY (4 marks each)
    // Both Ch 1 and Ch 2 allocated 20 marks each so replacement quota does not block
    const blueprint = await prisma.blueprint.create({
      data: {
        name: "M2 Empirical Stress Blueprint",
        bookId,
        examType: "ANNUAL",
        durationMin: 180,
        chapters: {
          create: [
            { chapterId: ch1Id, marks: 20 },
            { chapterId: ch2Id, marks: 20 },
          ],
        },
        sections: {
          create: [
            {
              position: 1,
              title: "Section B (Short)",
              type: "SHORT",
              count: 2,
              marksEach: 2,
            },
            {
              position: 2,
              title: "Section E (Case Study)",
              type: "CASE_STUDY",
              count: 2,
              marksEach: 4,
            },
          ],
        },
      },
      include: { sections: true },
    });
    blueprintId = blueprint.id;
    sectionShortId = blueprint.sections.find((s) => s.type === "SHORT")!.id;
    sectionCaseStudyId = blueprint.sections.find((s) => s.type === "CASE_STUDY")!.id;

    // 4. Questions
    // SHORT questions
    const qPrimaryShort = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "SHORT",
        text: "Primary Short Question in Ch 1",
        createdById: testUserId,
      },
    });
    qPrimaryShortCh1Id = qPrimaryShort.id;

    const qAltSame = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "SHORT",
        text: "Alternate Short Question in same Ch 1",
        createdById: testUserId,
      },
    });
    qAltSameCh1Id = qAltSame.id;

    const qAltDiffCh = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch2Id,
        type: "SHORT",
        text: "Alternate Short Question in different Ch 2",
        createdById: testUserId,
      },
    });
    qAltDiffCh2Id = qAltDiffCh.id;

    const qAltDiffType = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "MCQ",
        text: "Alternate MCQ Question in Ch 1",
        optionsJson: JSON.stringify(["Opt A", "Opt B", "Opt C", "Opt D"]),
        createdById: testUserId,
      },
    });
    qAltDiffTypeMcqId = qAltDiffType.id;

    const qAltOtherBook = await prisma.question.create({
      data: {
        bookId: otherBookId,
        chapterId: otherBookChId,
        type: "SHORT",
        text: "Alternate Question from different book",
        createdById: testUserId,
      },
    });
    qAltOtherBookId = qAltOtherBook.id;

    const qReplacementSameCh = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "SHORT",
        text: "Replacement Short Question in same Ch 1",
        createdById: testUserId,
      },
    });
    qReplacementSameCh1Id = qReplacementSameCh.id;

    const qReplacementDiffCh = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch2Id,
        type: "SHORT",
        text: "Replacement Short Question in different Ch 2",
        createdById: testUserId,
      },
    });
    qReplacementDiffCh2Id = qReplacementDiffCh.id;

    // CASE_STUDY questions
    const qCsPrimary = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "CASE_STUDY",
        text: "Case Study Primary in Ch 1",
        subpartsJson: JSON.stringify([
          { label: "(i)", text: "Part 1", marks: 1 },
          { label: "(ii)", text: "Part 2", marks: 1 },
          { label: "(iii)", text: "Part 3", marks: 2 },
        ]), // Total 4m
        createdById: testUserId,
      },
    });
    qCsPrimaryCh1Id = qCsPrimary.id;

    const qCsAltValid = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "CASE_STUDY",
        text: "Case Study Alt with matching 4m in Ch 1",
        subpartsJson: JSON.stringify([
          { label: "(a)", text: "Part A", marks: 2 },
          { label: "(b)", text: "Part B", marks: 2 },
        ]), // Total 4m
        createdById: testUserId,
      },
    });
    qCsAltValidCh1Id = qCsAltValid.id;

    const qCsAltMismatch = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "CASE_STUDY",
        text: "Case Study Alt with mismatched 3m in Ch 1",
        subpartsJson: JSON.stringify([
          { label: "(a)", text: "Part A", marks: 1 },
          { label: "(b)", text: "Part B", marks: 2 },
        ]), // Total 3m
        createdById: testUserId,
      },
    });
    qCsAltMismatchMarksCh1Id = qCsAltMismatch.id;

    // 5. Paper and PaperQuestion items
    const paper = await prisma.paper.create({
      data: {
        title: "M2 Stress Test Paper",
        blueprintId,
        layout: "BOOKLET",
        schoolName: "Board Testing Academy",
        status: "DRAFT",
        createdById: testUserId,
      },
    });
    paperId = paper.id;

    const itemShort = await prisma.paperQuestion.create({
      data: {
        paperId,
        sectionId: sectionShortId,
        questionId: qPrimaryShortCh1Id,
        position: 1,
      },
    });
    shortItemId = itemShort.id;

    const itemCs = await prisma.paperQuestion.create({
      data: {
        paperId,
        sectionId: sectionCaseStudyId,
        questionId: qCsPrimaryCh1Id,
        position: 1,
      },
    });
    caseStudyItemId = itemCs.id;
  });

  afterAll(async () => {
    // Cascade-delete the test paper and books
    if (paperId) {
      await prisma.paperQuestion.deleteMany({ where: { paperId } });
      await prisma.paper.deleteMany({ where: { id: paperId } });
    }
    if (blueprintId) {
      await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
      await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
      await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    }
    if (bookId) {
      await prisma.question.deleteMany({ where: { bookId } });
      await prisma.chapter.deleteMany({ where: { bookId } });
      await prisma.book.deleteMany({ where: { id: bookId } });
    }
    if (otherBookId) {
      await prisma.question.deleteMany({ where: { bookId: otherBookId } });
      await prisma.chapter.deleteMany({ where: { bookId: otherBookId } });
      await prisma.book.deleteMany({ where: { id: otherBookId } });
    }
    await prisma.$disconnect();
  });

  describe("1. Route Empirical Stress: Choice Parity & Guardrails (PATCH)", () => {
    it("strictly rejects alternate question from a different chapter with HTTP 400 and verbatim board error", async () => {
      const req = new Request(`http://localhost/api/papers/${paperId}/questions/${shortItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orQuestionId: qAltDiffCh2Id }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: paperId, itemId: shortItemId }) });
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Board Guardrail Violation: Alternate (OR) choice must match primary question chapter");
      expect(data.error).toContain("Chapter 101: Stress Ch 1");

      // Verify DB state remained uncorrupted
      const item = await prisma.paperQuestion.findUnique({ where: { id: shortItemId } });
      expect(item?.orQuestionId).toBeNull();
    });

    it("strictly rejects alternate question with mismatched marks with HTTP 400 and verbatim error", async () => {
      const req = new Request(`http://localhost/api/papers/${paperId}/questions/${caseStudyItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orQuestionId: qCsAltMismatchMarksCh1Id }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: paperId, itemId: caseStudyItemId }) });
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe(
        "Board Guardrail Violation: Alternate (OR) choice total marks (3) must match section marks (4)."
      );

      // Verify DB state: orQuestionId remains null
      const item = await prisma.paperQuestion.findUnique({ where: { id: caseStudyItemId } });
      expect(item?.orQuestionId).toBeNull();
    });

    it("accepts valid alternate question with matching chapter and marks (HTTP 200)", async () => {
      // 1. Short section pairing
      const reqShort = new Request(`http://localhost/api/papers/${paperId}/questions/${shortItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orQuestionId: qAltSameCh1Id }),
      });
      const resShort = await PATCH(reqShort, { params: Promise.resolve({ id: paperId, itemId: shortItemId }) });
      expect(resShort.status).toBe(200);

      const itemShort = await prisma.paperQuestion.findUnique({ where: { id: shortItemId } });
      expect(itemShort?.orQuestionId).toBe(qAltSameCh1Id);

      // 2. Case study section pairing with balanced subparts (2m + 2m = 4m)
      const reqCs = new Request(`http://localhost/api/papers/${paperId}/questions/${caseStudyItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orQuestionId: qCsAltValidCh1Id }),
      });
      const resCs = await PATCH(reqCs, { params: Promise.resolve({ id: paperId, itemId: caseStudyItemId }) });
      expect(resCs.status).toBe(200);

      const itemCs = await prisma.paperQuestion.findUnique({ where: { id: caseStudyItemId } });
      expect(itemCs?.orQuestionId).toBe(qCsAltValidCh1Id);
    });

    it("automatically clears orQuestionId when primary question is replaced with cross-chapter question", async () => {
      // Ensure shortItemId currently has an active OR choice
      let item = await prisma.paperQuestion.findUnique({ where: { id: shortItemId } });
      expect(item?.orQuestionId).toBe(qAltSameCh1Id);

      // Now replace primary question with question from Chapter 2
      const req = new Request(`http://localhost/api/papers/${paperId}/questions/${shortItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replaceWithQuestionId: qReplacementDiffCh2Id }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: paperId, itemId: shortItemId }) });
      expect(res.status).toBe(200);

      // Verify DB: questionId updated to qReplacementDiffCh2Id, and orQuestionId is cleared to null
      item = await prisma.paperQuestion.findUnique({ where: { id: shortItemId } });
      expect(item?.questionId).toBe(qReplacementDiffCh2Id);
      expect(item?.orQuestionId).toBeNull();
    });

    it("preserves orQuestionId when primary question is replaced with a question from the SAME chapter", async () => {
      // First, re-attach primary question back to Ch 1 with an OR choice
      await prisma.paperQuestion.update({
        where: { id: shortItemId },
        data: { questionId: qPrimaryShortCh1Id, orQuestionId: qAltSameCh1Id },
      });

      let item = await prisma.paperQuestion.findUnique({ where: { id: shortItemId } });
      expect(item?.questionId).toBe(qPrimaryShortCh1Id);
      expect(item?.orQuestionId).toBe(qAltSameCh1Id);

      // Replace with another question from same Chapter 1
      const req = new Request(`http://localhost/api/papers/${paperId}/questions/${shortItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replaceWithQuestionId: qReplacementSameCh1Id }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: paperId, itemId: shortItemId }) });
      expect(res.status).toBe(200);

      // Verify DB: questionId updated to replacement, orQuestionId PRESERVED
      item = await prisma.paperQuestion.findUnique({ where: { id: shortItemId } });
      expect(item?.questionId).toBe(qReplacementSameCh1Id);
      expect(item?.orQuestionId).toBe(qAltSameCh1Id);
    });

    it("allows explicitly detaching an alternate question by passing orQuestionId: null", async () => {
      const req = new Request(`http://localhost/api/papers/${paperId}/questions/${shortItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orQuestionId: null }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: paperId, itemId: shortItemId }) });
      expect(res.status).toBe(200);

      const item = await prisma.paperQuestion.findUnique({ where: { id: shortItemId } });
      expect(item?.orQuestionId).toBeNull();
    });

    it("strictly rejects attaching alternate question if paper status is FINAL (HTTP 409)", async () => {
      await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL" } });

      const req = new Request(`http://localhost/api/papers/${paperId}/questions/${shortItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orQuestionId: qAltSameCh1Id }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: paperId, itemId: shortItemId }) });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("This paper is finalised");

      // Reset back to DRAFT
      await prisma.paper.update({ where: { id: paperId }, data: { status: "DRAFT" } });
    });

    it("strictly rejects attaching alternate question identical to primary question (HTTP 400)", async () => {
      const item = await prisma.paperQuestion.findUnique({ where: { id: shortItemId } });
      const req = new Request(`http://localhost/api/papers/${paperId}/questions/${shortItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orQuestionId: item?.questionId }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: paperId, itemId: shortItemId }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Alternate question cannot be identical to the primary question");
    });

    it("strictly rejects attaching alternate question of mismatched type (HTTP 400)", async () => {
      const req = new Request(`http://localhost/api/papers/${paperId}/questions/${shortItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orQuestionId: qAltDiffTypeMcqId }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: paperId, itemId: shortItemId }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Alternate question must be of type SHORT");
    });

    it("strictly rejects attaching alternate question from different book (HTTP 400)", async () => {
      const req = new Request(`http://localhost/api/papers/${paperId}/questions/${shortItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orQuestionId: qAltOtherBookId }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: paperId, itemId: shortItemId }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Alternate question is from a different book");
    });

    it("clears orQuestionId on PUT edit when chapter is altered (UPDATE_MASTER and FORK_COPY)", async () => {
      // 1. Prepare item with Ch 1 question and Ch 1 OR question
      await prisma.paperQuestion.update({
        where: { id: shortItemId },
        data: { questionId: qPrimaryShortCh1Id, orQuestionId: qAltSameCh1Id },
      });

      // FORK_COPY to Chapter 2
      const forkReq = new Request(`http://localhost/api/papers/${paperId}/questions/${shortItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "FORK_COPY",
          question: {
            bookId,
            chapterId: ch2Id,
            type: "SHORT",
            text: "Forked question moved to Chapter 2",
            options: [],
            answer: "Forked answer",
            difficulty: "EASY",
          },
        }),
      });

      const forkRes = await PUT(forkReq, { params: Promise.resolve({ id: paperId, itemId: shortItemId }) });
      expect(forkRes.status).toBe(200);

      // Verify orQuestionId was automatically cleared!
      const itemAfterFork = await prisma.paperQuestion.findUnique({ where: { id: shortItemId } });
      expect(itemAfterFork?.orQuestionId).toBeNull();
    });
  });

  describe("2. Case Study Subparts Marks Stress: subpartsTotalMarks & validateSubPartsSum", () => {
    it("calculates exact marks for CBSE Section E preset: 1m + 1m + 2m = 4m", () => {
      const cbsePreset: SubPart[] = [
        { label: "(i)", text: "Subpart 1", marks: 1 },
        { label: "(ii)", text: "Subpart 2", marks: 1 },
        { label: "(iii)", text: "Subpart 3", marks: 2 },
      ];
      expect(subpartsTotalMarks(cbsePreset)).toBe(4);
      expect(validateSubPartsSum(cbsePreset, 4)).toBe(true);
      expect(validateSubPartsSum(cbsePreset, 3)).toBe(false);
      expect(validateSubPartsSum(cbsePreset, 5)).toBe(false);
    });

    it("calculates exact marks for alternative 5m preset: 2m + 3m = 5m", () => {
      const altPreset: SubPart[] = [
        { label: "(a)", text: "Subpart A", marks: 2 },
        { label: "(b)", text: "Subpart B", marks: 3 },
      ];
      expect(subpartsTotalMarks(altPreset)).toBe(5);
      expect(validateSubPartsSum(altPreset, 5)).toBe(true);
      expect(validateSubPartsSum(altPreset, 4)).toBe(false);
    });

    it("handles boundary values: 1m x 4 = 4m and 2m x 2 = 4m", () => {
      const fourOnes: SubPart[] = [
        { label: "(1)", text: "Q1", marks: 1 },
        { label: "(2)", text: "Q2", marks: 1 },
        { label: "(3)", text: "Q3", marks: 1 },
        { label: "(4)", text: "Q4", marks: 1 },
      ];
      expect(subpartsTotalMarks(fourOnes)).toBe(4);
      expect(validateSubPartsSum(fourOnes, 4)).toBe(true);

      const twoTwos: SubPart[] = [
        { label: "(a)", text: "Part A", marks: 2 },
        { label: "(b)", text: "Part B", marks: 2 },
      ];
      expect(subpartsTotalMarks(twoTwos)).toBe(4);
      expect(validateSubPartsSum(twoTwos, 4)).toBe(true);
    });

    it("handles large single subpart and high total marks boundary", () => {
      const singleFifty: SubPart[] = [{ label: "(a)", text: "Large case study", marks: 50 }];
      expect(subpartsTotalMarks(singleFifty)).toBe(50);
      expect(validateSubPartsSum(singleFifty, 50)).toBe(true);

      const hundredMarks: SubPart[] = [
        { label: "(1)", text: "A", marks: 50 },
        { label: "(2)", text: "B", marks: 50 },
      ];
      expect(subpartsTotalMarks(hundredMarks)).toBe(100);
      expect(validateSubPartsSum(hundredMarks, 100)).toBe(true);
    });

    it("correctly handles empty or null/undefined subparts (standard questions)", () => {
      expect(subpartsTotalMarks([])).toBe(0);
      expect(subpartsTotalMarks(null)).toBe(0);
      expect(subpartsTotalMarks(undefined)).toBe(0);

      // Standard questions without subparts return true for validateSubPartsSum
      expect(validateSubPartsSum([], 4)).toBe(true);
      expect(validateSubPartsSum(null, 4)).toBe(true);
      expect(validateSubPartsSum(undefined, 4)).toBe(true);
    });

    it("gracefully tolerates null, undefined, or malformed entries inside subparts array", () => {
      const malformed = [
        null,
        undefined,
        { marks: 2 },
        { marks: 0 },
        { marks: NaN },
        { marks: Infinity },
        { marks: -1 },
        { marks: 3 },
      ];
      // 2 + 0 + 0 + 0 + (-1) + 3 = 4
      expect(subpartsTotalMarks(malformed as unknown as SubPart[])).toBe(4);
    });

    it("handles floating point values without integer rounding crashes", () => {
      const floatSubparts: SubPart[] = [
        { label: "(a)", text: "Half mark", marks: 1.5 },
        { label: "(b)", text: "Two and half marks", marks: 2.5 },
      ];
      expect(subpartsTotalMarks(floatSubparts)).toBe(4);
      expect(validateSubPartsSum(floatSubparts, 4)).toBe(true);
    });

    it("safely parses malformed subpartsJson strings via parseSubparts", () => {
      expect(parseSubparts("")).toEqual([]);
      expect(parseSubparts(null)).toEqual([]);
      expect(parseSubparts(undefined)).toEqual([]);
      expect(parseSubparts("{ invalid json")).toEqual([]);
      expect(parseSubparts('{"notAnArray": true}')).toEqual([]);
      expect(parseSubparts('"justAString"')).toEqual([]);
      expect(parseSubparts("42")).toEqual([]);
    });
  });
});
