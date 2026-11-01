import { describe, expect, it } from "vitest";
import {
  validatePaperCompleteness,
  type PaperCompletenessResult,
} from "./paperCompletenessEngine";
import type { ValidatableQuestion } from "./questionValidator";

describe("Paper Completeness & Deterministic Marks Engine (TDD)", () => {
  const dummyBlueprint = {
    totalMarks: 75,
    durationMin: 180,
    sections: [
      {
        id: "sec1",
        title: "Section A (Objective)",
        type: "MCQ",
        count: 5,
        marksEach: 1,
      },
      {
        id: "sec2",
        title: "Section B (Short Answer)",
        type: "SHORT",
        count: 2,
        marksEach: 2,
      },
    ],
  };

  it("fails when total calculated marks do not match expected blueprint total marks", () => {
    const questions: Array<{
      question: ValidatableQuestion;
      sectionId: string;
      position: number;
    }> = [
      {
        question: { type: "MCQ", text: "Q1", options: ["A", "B", "C", "D"], answer: "A", marks: 1 },
        sectionId: "sec1",
        position: 0,
      },
      // Missing remaining 4 questions in sec1 and all of sec2!
    ];

    const result: PaperCompletenessResult = validatePaperCompleteness({
      blueprint: dummyBlueprint as any,
      items: questions as any,
    });

    expect(result.status).toBe("FAIL");
    expect(result.marksValidation.passed).toBe(false);
    expect(result.marksValidation.actualTotalMarks).toBe(1);
    expect(result.marksValidation.expectedTotalMarks).toBe(75);
    expect(result.structuralCompleteness.passed).toBe(false);
    expect(result.structuralCompleteness.missingQuestionsCount).toBeGreaterThan(0);
  });

  it("detects gaps and duplicate numbers in question sequence", () => {
    const questions = [
      { id: "q1", number: 1, sectionId: "sec1", text: "Q1", marks: 1 },
      { id: "q2", number: 1, sectionId: "sec1", text: "Q2 duplicate number", marks: 1 }, // Duplicate 1!
      { id: "q3", number: 3, sectionId: "sec1", text: "Q3 skipped 2", marks: 1 }, // Skipped 2!
    ];

    const result = validatePaperCompleteness({
      blueprint: {
        totalMarks: 3,
        sections: [{ id: "sec1", title: "Sec 1", type: "MCQ", count: 3, marksEach: 1 }],
      } as any,
      items: questions.map((q, idx) => ({
        question: { type: "MCQ", text: q.text, marks: q.marks },
        sectionId: q.sectionId,
        position: idx,
        itemNumber: q.number,
      })) as any,
    });

    expect(result.structuralCompleteness.numberingIssues.length).toBeGreaterThan(0);
    expect(result.structuralCompleteness.numberingIssues.some((n) => n.includes("Duplicate") || n.includes("duplicate"))).toBe(true);
  });

  it("detects dangling references to missing diagrams or passages", () => {
    const questions = [
      {
        question: {
          type: "SHORT",
          text: "Look at the diagram given below and label part X.", // No imagePath or figureDoc!
          marks: 2,
        },
        sectionId: "sec1",
        position: 0,
      },
    ];

    const result = validatePaperCompleteness({
      blueprint: {
        totalMarks: 2,
        sections: [{ id: "sec1", title: "Sec 1", type: "SHORT", count: 1, marksEach: 2 }],
      } as any,
      items: questions as any,
    });

    expect(result.structuralCompleteness.danglingReferences.length).toBeGreaterThan(0);
    expect(result.structuralCompleteness.danglingReferences[0]).toContain("diagram");
  });

  it("passes a fully assembled, marks-verified, structurally sound paper", () => {
    const questions = [
      { question: { type: "MCQ", text: "Q1", options: ["A", "B", "C", "D"], answer: "A", marks: 1 }, sectionId: "sec1", position: 0 },
      { question: { type: "MCQ", text: "Q2", options: ["A", "B", "C", "D"], answer: "B", marks: 1 }, sectionId: "sec1", position: 1 },
      { question: { type: "SHORT", text: "Q3", marks: 2, answer: "Model ans" }, sectionId: "sec2", position: 2 },
    ];

    const result = validatePaperCompleteness({
      blueprint: {
        totalMarks: 4,
        sections: [
          { id: "sec1", title: "Sec 1", type: "MCQ", count: 2, marksEach: 1 },
          { id: "sec2", title: "Sec 2", type: "SHORT", count: 1, marksEach: 2 },
        ],
      } as any,
      items: questions as any,
    });

    expect(result.status).toBe("PASS");
    expect(result.marksValidation.passed).toBe(true);
    expect(result.structuralCompleteness.passed).toBe(true);
    expect(result.blueprintCompliance.passed).toBe(true);
  });
});
