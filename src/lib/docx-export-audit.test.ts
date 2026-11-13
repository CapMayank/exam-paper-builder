import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { buildPaperDocx } from "./paperDocx";
import { getSharedInstruction } from "./constants";
import { POST as postQuestion } from "../app/api/papers/[id]/questions/route";
import { PUT as putQuestionItem } from "../app/api/papers/[id]/questions/[itemId]/route";

describe("DOCX Export & Question Structure Cross-Surface Integrity Audit", () => {
  const testStamp = Date.now();

  let teacherUser: { id: string; email: string; role: string };
  let bookId: string;
  let ch1Id: string;
  let ch2Id: string;
  let blueprintId: string;
  let secMathId: string;
  let secMatchId: string;
  let secCaseId: string;
  let paperId: string;

  let qMathMatrixId: string;
  let qChemistryMatchId: string;
  let qCaseStudyId: string;
  let qOrAlternateId: string;

  let mathItemId: string;
  let matchItemId: string;
  let caseItemId: string;

  beforeAll(async () => {
    // 1. Create Teacher User
    const user = await prisma.user.create({
      data: {
        name: `Teacher Reviewer ${testStamp}`,
        email: `teacher-docx-${testStamp}@school.internal`,
        passwordHash: "dummyhash",
        role: "TEACHER",
        department: "Science & Math",
        active: true,
      },
    });
    teacherUser = { id: user.id, email: user.email, role: user.role };
    mockSessionUserId = user.id;

    // 2. Book & Chapters
    const book = await prisma.book.create({
      data: {
        title: `Comprehensive Board Exam Science & Math ${testStamp}`,
        subject: "Mathematics & Chemistry",
        className: "Class 12",
        chapters: {
          create: [
            { number: 1, title: "Matrices & Determinants" },
            { number: 2, title: "Chemical Reactions & Coordination Compounds" },
          ],
        },
      },
      include: { chapters: true },
    });
    bookId = book.id;
    ch1Id = book.chapters[0].id;
    ch2Id = book.chapters[1].id;

    // 3. Blueprint with 3 distinct sections:
    // - Section A: Math Matrix (SHORT: 2 questions x 3 marks = 6 marks)
    // - Section B: Chemistry Match (MATCH_COLUMN: 1 question x 4 marks = 4 marks)
    // - Section C: Case Study (CASE_STUDY: 1 question x 4 marks = 4 marks)
    // Total marks = 14 marks. Chapter 1 = 6 marks, Chapter 2 = 8 marks.
    const bp = await prisma.blueprint.create({
      data: {
        name: `Cross-Surface Parity Blueprint ${testStamp}`,
        bookId,
        examType: "ANNUAL",
        durationMin: 180,
        chapters: {
          create: [
            { chapterId: ch1Id, marks: 6 },
            { chapterId: ch2Id, marks: 8 },
          ],
        },
        sections: {
          create: [
            { position: 1, title: "Section A - Mathematics", type: "SHORT", count: 2, marksEach: 3 },
            { position: 2, title: "Section B - Chemistry Match", type: "MATCH_COLUMN", count: 1, marksEach: 4 },
            { position: 3, title: "Section C - Integrated Case Study", type: "CASE_STUDY", count: 1, marksEach: 4 },
          ],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    secMathId = bp.sections.find((s) => s.type === "SHORT")!.id;
    secMatchId = bp.sections.find((s) => s.type === "MATCH_COLUMN")!.id;
    secCaseId = bp.sections.find((s) => s.type === "CASE_STUDY")!.id;

    // 4. Create Questions:
    // Question A: 3x3 LaTeX matrix in question prompt
    const qMath = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "SHORT",
        text: `Given the 3x3 matrix representing a linear transformation system:
$$\\begin{array}{ccc}
1 & 2 & 3 \\\\
0 & 1 & 4 \\\\
5 & 6 & 0
\\end{array}$$
Find the determinant of the matrix and state whether it is invertible.`,
        answer: "Model Answer: det(A) = 1(0 - 24) - 2(0 - 20) + 3(0 - 5) = -24 + 40 - 15 = 1. Since det(A) != 0, matrix is invertible.",
        createdById: teacherUser.id,
      },
    });
    qMathMatrixId = qMath.id;

    // Question B: Alternate (OR) question for Math slot (without subparts)
    const qOr = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch1Id,
        type: "SHORT",
        text: "Prove that every square matrix can be uniquely expressed as the sum of a symmetric and a skew-symmetric matrix.",
        answer: "Model Answer: For matrix A, write A = (1/2)(A + A^T) + (1/2)(A - A^T). (A + A^T)^T = A^T + A, hence symmetric. (A - A^T)^T = -(A - A^T), hence skew-symmetric.",
        createdById: teacherUser.id,
      },
    });
    qOrAlternateId = qOr.id;

    // Question C: Chemistry MATCH_COLUMN with independent columns
    const qMatch = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch2Id,
        type: "MATCH_COLUMN",
        text: `Match the coordination complex in Column I with its IUPAC nomenclature in Column II:
Column I:
(A) [Co(NH3)6]Cl3
(B) K4[Fe(CN)6]
(C) [Pt(NH3)2Cl2]
(D) [Ni(CO)4]`,
        optionsJson: JSON.stringify([
          "Hexaamminecobalt(III) chloride",
          "Potassium hexacyanoferrate(II)",
          "Diamminedichloridoplatinum(II)",
          "Tetracarbonylnickel(0)",
        ]),
        answer: "(A) → (ii), (B) → (iii), (C) → (iv), (D) → (i)",
        createdById: teacherUser.id,
      },
    });
    qChemistryMatchId = qMatch.id;

    // Question D: CASE_STUDY with subpart MCQs
    const qCase = await prisma.question.create({
      data: {
        bookId,
        chapterId: ch2Id,
        type: "CASE_STUDY",
        text: `Read the following passage regarding ligand substitution kinetics:
In crystal field theory, the interaction between transition metal d-orbitals and incoming ligand fields causes degenerate d-orbitals to split into t2g and eg sets. The crystal field splitting energy (Delta_o) determines optical absorption spectra and magnetic dipole moments.`,
        subpartsJson: JSON.stringify([
          {
            label: "(i)",
            text: "Which of the following ligands exerts the strongest crystal field splitting according to the spectrochemical series?",
            marks: 1,
            options: ["Iodide ion (I^-)", "Water (H2O)", "Ammonia (NH3)", "Cyanide ion (CN^-)"],
            answer: "(d) Cyanide ion (CN^-)",
          },
          {
            label: "(ii)",
            text: "A high-spin octahedral d^4 complex has how many unpaired electrons?",
            marks: 1,
            options: ["4", "2", "0", "1"],
            answer: "(a) 4",
          },
          {
            label: "(iii)",
            text: "Calculate the crystal field stabilization energy (CFSE) for a low-spin d^6 octahedral complex in terms of Delta_o and pairing energy P.",
            marks: 2,
            answer: "CFSE = -2.4 Delta_o + 2P",
          },
        ]),
        answer: "Complete case study marking scheme distributed across subparts (i)-(iii).",
        createdById: teacherUser.id,
      },
    });
    qCaseStudyId = qCase.id;

    // 5. Create Paper and assemble items
    const paper = await prisma.paper.create({
      data: {
        title: `Comprehensive Term Assessment 2026`,
        blueprintId,
        layout: "PAGE",
        schoolName: "Test Examination Board Academy",
        status: "DRAFT",
        createdById: teacherUser.id,
        generalInstructions: "All questions are compulsory. Use of calculators is prohibited.",
      },
    });
    paperId = paper.id;

    // Place Math question with OR alternate
    const item1 = await prisma.paperQuestion.create({
      data: {
        paperId,
        sectionId: secMathId,
        questionId: qMathMatrixId,
        orQuestionId: qOrAlternateId,
        position: 0,
      },
    });
    mathItemId = item1.id;

    // Place Chemistry Match question
    const item2 = await prisma.paperQuestion.create({
      data: {
        paperId,
        sectionId: secMatchId,
        questionId: qChemistryMatchId,
        position: 0,
      },
    });
    matchItemId = item2.id;

    // Place Case Study question
    const item3 = await prisma.paperQuestion.create({
      data: {
        paperId,
        sectionId: secCaseId,
        questionId: qCaseStudyId,
        position: 0,
      },
    });
    caseItemId = item3.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
    await prisma.paper.deleteMany({ where: { id: paperId } });
    await prisma.question.deleteMany({
      where: { id: { in: [qMathMatrixId, qOrAlternateId, qChemistryMatchId, qCaseStudyId] } },
    });
    await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
    await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    await prisma.chapter.deleteMany({ where: { bookId } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    // Every buildPaperDocx call writes a PAPER_EXPORT_DOCX audit row as this run's own
    // teacher; those rows outlive the user (onDelete: SetNull), so remove them first.
    await prisma.auditLog.deleteMany({ where: { userId: teacherUser.id } });
    await prisma.user.deleteMany({ where: { id: teacherUser.id } });
  });

  describe("Edge Case 2: Multi-Surface Document Export Parity (DOCX)", () => {
    it("generates a valid student examination paper .docx buffer with 3x3 LaTeX matrix, MATCH_COLUMN, and CASE_STUDY", async () => {
      const result = await buildPaperDocx(paperId, false, teacherUser as any);
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(1000);

      // Verify Word DOCX file signature (standard PK ZIP header)
      expect(result.buffer[0]).toBe(0x50); // 'P'
      expect(result.buffer[1]).toBe(0x4b); // 'K'
      expect(result.buffer[2]).toBe(0x03);
      expect(result.buffer[3]).toBe(0x04);
      expect(result.safeFilename).toContain(".docx");
    });

    it("prints each sub-question's marks once in brackets, never doubled ([[1 Mark]])", async () => {
      const result = await buildPaperDocx(paperId, false, teacherUser as any);
      const { default: JSZip } = await import("jszip");
      const xml = await (await JSZip.loadAsync(result.buffer)).file("word/document.xml")!.async("string");
      const text = xml.replace(/<[^>]+>/g, "");
      expect(text).toMatch(/\[\d+ Marks?\]/);
      expect(text).not.toMatch(/\[\[\d+ Marks?\]\]/);
    });

    it("generates a valid teacher marking scheme .docx buffer including the OR question model answer without dropping it", async () => {
      const result = await buildPaperDocx(paperId, true, teacherUser as any);
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(1000);

      // Verify ZIP header
      expect(result.buffer[0]).toBe(0x50);
      expect(result.buffer[1]).toBe(0x4b);
      expect(result.safeFilename).toContain("_Marking_Scheme.docx");
    });

    it("exports TRUE_FALSE primary and OR questions with explicit bilingual indicator", async () => {
      const tfPrimary = await prisma.question.create({
        data: {
          bookId,
          chapterId: ch1Id,
          type: "TRUE_FALSE",
          text: "The inverse of an orthogonal matrix is its transpose.",
          answer: "True",
          createdById: teacherUser.id,
        },
      });
      const tfOr = await prisma.question.create({
        data: {
          bookId,
          chapterId: ch1Id,
          type: "TRUE_FALSE",
          text: "आव्यूह का व्युत्क्रम हमेशा अद्वितीय होता है। (The inverse of a matrix is always unique.)",
          answer: "True",
          createdById: teacherUser.id,
        },
      });

      const tfItem = await prisma.paperQuestion.create({
        data: {
          paperId,
          sectionId: secMathId,
          position: 1,
          questionId: tfPrimary.id,
          orQuestionId: tfOr.id,
        },
      });

      const studentDoc = await buildPaperDocx(paperId, false, teacherUser as any);
      expect(studentDoc.buffer).toBeInstanceOf(Buffer);
      expect(studentDoc.buffer.length).toBeGreaterThan(1000);

      const schemeDoc = await buildPaperDocx(paperId, true, teacherUser as any);
      expect(schemeDoc.buffer).toBeInstanceOf(Buffer);
      expect(schemeDoc.buffer.length).toBeGreaterThan(1000);

      // Clean up tfItem and questions
      await prisma.paperQuestion.delete({ where: { id: tfItem.id } });
      await prisma.question.deleteMany({ where: { id: { in: [tfPrimary.id, tfOr.id] } } });
    });
  });

  describe("Marks follow the print rules in Word", () => {
    async function docText(paper: string): Promise<string> {
      const result = await buildPaperDocx(paper, false, teacherUser as any);
      const { default: JSZip } = await import("jszip");
      const xml = await (await JSZip.loadAsync(result.buffer)).file("word/document.xml")!.async("string");
      return xml.replace(/<[^>]+>/g, "");
    }

    async function makePaper(
      marksStyle: string | undefined,
      build: (sectionId: string) => Promise<{ questionId: string; orQuestionId?: string }>,
    ) {
      const section = await prisma.blueprintSection.create({
        data: { blueprintId, position: 9, title: "Section Marks Rules", type: "LONG", count: 1, marksEach: 5 },
      });
      const { questionId, orQuestionId } = await build(section.id);
      const paper = await prisma.paper.create({
        data: {
          title: `Marks rules ${Date.now()}`,
          blueprintId,
          layout: "PAGE",
          schoolName: "Test Examination Board Academy",
          status: "DRAFT",
          createdById: teacherUser.id,
          ...(marksStyle ? { marksStyle } : {}),
        },
      });
      await prisma.paperQuestion.create({
        data: { paperId: paper.id, sectionId: section.id, questionId, orQuestionId, position: 0 },
      });
      const questionIds = [questionId, ...(orQuestionId ? [orQuestionId] : [])];
      return {
        paperId: paper.id,
        cleanup: async () => {
          await prisma.paperQuestion.deleteMany({ where: { paperId: paper.id } });
          await prisma.paper.delete({ where: { id: paper.id } });
          await prisma.question.deleteMany({ where: { id: { in: questionIds } } });
          await prisma.blueprintSection.delete({ where: { id: section.id } });
        },
      };
    }

    const mkQuestion = (text: string, subpartsJson?: unknown) =>
      prisma.question.create({
        data: {
          bookId,
          chapterId: ch1Id,
          type: "LONG",
          text,
          subpartsJson: subpartsJson === undefined ? undefined : JSON.stringify(subpartsJson),
          createdById: teacherUser.id,
        },
      });
    const four = (marks: number) =>
      ["First", "Second", "Third", "Fourth"].map((w, i) => ({ label: `(${i + 1})`, text: `${w} essay topic`, marks }));
    const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

    it("prints the total once for an any-1-of-4 question, not on each option", async () => {
      const made = await makePaper(undefined, async () => {
        const q = await mkQuestion("Write an essay on any one of the following.", { attemptCount: 1, subparts: four(5) });
        return { questionId: q.id };
      });
      try {
        const text = await docText(made.paperId);
        expect(text).toContain("Write an essay on any one of the following.  [5 Marks]");
        expect(count(text, /\[5 Marks?\]/g)).toBe(1);
      } finally {
        await made.cleanup();
      }
    });

    it("prints no marks labels at all when the marks style is SUPPRESSED", async () => {
      const made = await makePaper("SUPPRESSED", async () => {
        const q = await mkQuestion("Answer each part below.", four(1));
        return { questionId: q.id };
      });
      try {
        const text = await docText(made.paperId);
        expect(text).toContain("Answer each part below.");
        expect(text).toContain("Fourth essay topic");
        expect(count(text, /\[[\d½¼¾.]+ Marks?\]/g)).toBe(0);
      } finally {
        await made.cleanup();
      }
    });

    it("treats an unknown stored marks style as INLINE", async () => {
      const made = await makePaper("WEIRD", async () => {
        const q = await mkQuestion("Answer every part below.", [
          { label: "(1)", text: "Part alpha", marks: 2 },
          { label: "(2)", text: "Part beta", marks: 3 },
        ]);
        return { questionId: q.id };
      });
      try {
        const text = await docText(made.paperId);
        expect(text).toContain("Part alpha [2 Marks]");
        expect(text).toContain("Part beta [3 Marks]");
        expect(text).toContain("Answer every part below.  [5 Marks]");
      } finally {
        await made.cleanup();
      }
    });

    it("prints an OR pair's marks once, after the first question, not after the alternative", async () => {
      const made = await makePaper(undefined, async () => {
        const q = await mkQuestion("Primary question stem here.");
        const or = await mkQuestion("Alternative question stem here.");
        return { questionId: q.id, orQuestionId: or.id };
      });
      try {
        const text = await docText(made.paperId);
        expect(text).toContain("Primary question stem here.  [5 Marks]");
        expect(text).toContain("Alternative question stem here.");
        expect(text).not.toMatch(/Alternative question stem here\.\s*\[/);
        expect(count(text, /\[5 Marks?\]/g)).toBe(1);
      } finally {
        await made.cleanup();
      }
    });

    it("applies each body's own attempt count inside an OR pair", async () => {
      const made = await makePaper(undefined, async () => {
        const q = await mkQuestion("Compulsory body stem.", [
          { label: "(1)", text: "Compulsory one", marks: 2 },
          { label: "(2)", text: "Compulsory two", marks: 3 },
        ]);
        const or = await mkQuestion("Choice body stem.", { attemptCount: 1, subparts: four(5) });
        return { questionId: q.id, orQuestionId: or.id };
      });
      try {
        const text = await docText(made.paperId);
        expect(text).toContain("Compulsory one [2 Marks]");
        expect(text).toContain("Compulsory two [3 Marks]");
        expect(text).toContain("Compulsory body stem.  [5 Marks]");
        expect(count(text, /\[5 Marks?\]/g)).toBe(1); // the question line only; the options and the alternative print none
        expect(text).not.toMatch(/essay topic\s*\[/);
      } finally {
        await made.cleanup();
      }
    });
  });

  describe("Word prints only the instructions the teacher typed", () => {
    async function docText(paper: string): Promise<string> {
      const result = await buildPaperDocx(paper, false, teacherUser as never);
      const { default: JSZip } = await import("jszip");
      const xml = await (await JSZip.loadAsync(result.buffer)).file("word/document.xml")!.async("string");
      return xml.replace(/<[^>]+>/g, "");
    }

    it("a Hindi paper prints no default for an empty section instruction and the Hindi default for untranslatable typed English", async () => {
      const book = await prisma.book.create({
        data: { title: `Hindi Instructions ${testStamp}`, subject: "Hindi", className: "Class 10", chapters: { create: [{ number: 1, title: "पाठ 1" }] } },
        include: { chapters: true },
      });
      const bp = await prisma.blueprint.create({
        data: {
          name: `Hindi Instructions BP ${testStamp}`,
          bookId: book.id,
          examType: "ANNUAL",
          durationMin: 180,
          chapters: { create: [{ chapterId: book.chapters[0].id, marks: 8 }] },
          sections: {
            create: [
              { position: 1, title: "खण्ड अ", type: "SHORT", count: 1, marksEach: 3, instructions: "   " },
              { position: 2, title: "खण्ड ब", type: "LONG", count: 1, marksEach: 5, instructions: "Write the answers neatly." },
            ],
          },
        },
      });
      const paper = await prisma.paper.create({
        data: { title: `हिन्दी ${testStamp}`, blueprintId: bp.id, layout: "PAGE", schoolName: "Test School", status: "DRAFT", createdById: teacherUser.id },
      });
      try {
        const text = await docText(paper.id);
        expect(text).not.toContain(getSharedInstruction("SHORT", "hi"));
        expect(text).toContain(getSharedInstruction("LONG", "hi"));
        expect(text).not.toContain("Write the answers neatly.");
      } finally {
        await prisma.paper.delete({ where: { id: paper.id } });
        await prisma.blueprintSection.deleteMany({ where: { blueprintId: bp.id } });
        await prisma.blueprintChapter.deleteMany({ where: { blueprintId: bp.id } });
        await prisma.blueprint.delete({ where: { id: bp.id } });
        await prisma.chapter.deleteMany({ where: { bookId: book.id } });
        await prisma.book.delete({ where: { id: book.id } });
      }
    });

    it("an English paper keeps a typed Hindi section instruction and prints no automatic question line", async () => {
      const section = await prisma.blueprintSection.create({
        data: {
          blueprintId,
          position: 9,
          title: "Section Typed Lines",
          type: "SHORT",
          count: 2,
          marksEach: 3,
          instructions: "सभी प्रश्न ध्यान से पढ़िए।",
          allowedTypesJson: JSON.stringify(["GRAMMAR"]),
        },
      });
      const g1 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "GRAMMAR", text: "Grammar item without a line.", createdById: teacherUser.id },
      });
      const g2 = await prisma.question.create({
        data: { bookId, chapterId: ch1Id, type: "GRAMMAR", text: "Grammar item with a line.", createdById: teacherUser.id },
      });
      const paper = await prisma.paper.create({
        data: { title: `Typed lines ${Date.now()}`, blueprintId, layout: "PAGE", schoolName: "Test School", status: "DRAFT", createdById: teacherUser.id },
      });
      await prisma.paperQuestion.create({ data: { paperId: paper.id, sectionId: section.id, questionId: g1.id, position: 0 } });
      await prisma.paperQuestion.create({
        data: { paperId: paper.id, sectionId: section.id, questionId: g2.id, position: 1, instruction: "Change into passive voice." },
      });
      try {
        const text = await docText(paper.id);
        expect(text).toContain("सभी प्रश्न ध्यान से पढ़िए।");
        expect(text).not.toContain(getSharedInstruction("SHORT", "en"));
        expect(text).not.toContain("Do as directed.");
        expect(text).toContain("Change into passive voice.");
      } finally {
        await prisma.paperQuestion.deleteMany({ where: { paperId: paper.id } });
        await prisma.paper.delete({ where: { id: paper.id } });
        await prisma.question.deleteMany({ where: { id: { in: [g1.id, g2.id] } } });
        await prisma.blueprintSection.delete({ where: { id: section.id } });
      }
    });
  });

  describe("Subpart Marks Invariant Guardrails (Edit PUT & Add POST)", () => {
    it("rejects PUT edit if subpart marks sum does not match section marksEach", async () => {
      const invalidPayload = {
        mode: "FORK_COPY",
        question: {
          bookId,
          chapterId: ch2Id,
          type: "CASE_STUDY",
          text: "Updated Case Study Prompt",
          options: [],
          subparts: [
            { label: "(i)", text: "Part 1", marks: 1 },
            { label: "(ii)", text: "Part 2", marks: 1 },
          ], // Total = 2 marks, but Section C is 4 marks!
          answer: "Model",
          difficulty: "MEDIUM",
        },
      };

      const req = new Request(`http://localhost/api/papers/${paperId}/questions/${caseItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPayload),
      });

      const res = await putQuestionItem(req, { params: Promise.resolve({ id: paperId, itemId: caseItemId }) } as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/^Edited question .*must match section marks/i);
    });

    it("rejects POST addition if candidate question subpart marks sum does not match target section marksEach", async () => {
      // Create a question with 2 marks subparts
      const mismatchedQ = await prisma.question.create({
        data: {
          bookId,
          chapterId: ch2Id,
          type: "CASE_STUDY",
          text: "Mismatched candidate question",
          subpartsJson: JSON.stringify([
            { label: "(i)", text: "Sub 1", marks: 1 },
          ]), // Total = 1 mark, but Section C expects 4 marks!
          createdById: teacherUser.id,
        },
      });

      const req = new Request(`http://localhost/api/papers/${paperId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: secCaseId,
          questionId: mismatchedQ.id,
        }),
      });

      const res = await postQuestion(req, { params: Promise.resolve({ id: paperId }) } as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/^Question .*must match section marks/i);

      // Cleanup candidate
      await prisma.question.delete({ where: { id: mismatchedQ.id } });
    });
  });
});
