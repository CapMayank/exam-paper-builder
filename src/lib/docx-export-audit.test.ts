import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { buildPaperDocx } from "../app/api/papers/[id]/export-docx/route";
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
      expect(data.error).toMatch(/Board Guardrail Violation.*must match section marks/i);
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
      expect(data.error).toMatch(/Board Guardrail Violation.*must match section marks/i);

      // Cleanup candidate
      await prisma.question.delete({ where: { id: mismatchedQ.id } });
    });
  });
});
