import { describe, expect, it } from "vitest";
import {
  auditPaperEvidenceBased,
  type EvidenceAuditReport,
  type EvidenceAuditFinding,
} from "./evidenceAuditEngine";

describe("Evidence-Based AI Audit Engine (TDD)", () => {
  it("genuinely returns PASS with 0 false positives for a complete and correct paper", async () => {
    const validPaper = {
      paperTitle: "Class 10 Science Model Examination 2026-27",
      className: "Class 10",
      subject: "Science",
      subjectCode: "200",
      totalMarks: 75,
      questions: [
        {
          id: "q1",
          number: 1,
          sectionTitle: "Section A (MCQ)",
          type: "MCQ",
          text: "What is the chemical formula of rust?",
          options: ["Fe2O3 \\cdot xH2O", "Fe3O4", "FeO", "Fe(OH)2"],
          answer: "Fe2O3 \\cdot xH2O",
          explanation: "Rust is hydrated iron(III) oxide with formula Fe2O3.xH2O.",
          marks: 1,
          difficulty: "EASY",
        },
        {
          id: "q2",
          number: 2,
          sectionTitle: "Section A (MCQ)",
          type: "MCQ",
          text: "The focal length of a spherical mirror of radius of curvature 30 cm is:",
          options: ["15 cm", "30 cm", "60 cm", "10 cm"],
          answer: "15 cm",
          explanation: "Focal length f = R/2 = 30/2 = 15 cm.",
          marks: 1,
          difficulty: "EASY",
        },
      ],
    };

    const report: EvidenceAuditReport = await auditPaperEvidenceBased(validPaper);

    expect(report.status).toBe("PASS");
    expect(report.findings.length).toBe(0);
    expect(report.summary).toContain("PASS");
  });

  it("returns FAIL with concrete evidence-based findings when defects exist", async () => {
    const defectivePaper = {
      paperTitle: "Class 10 Science Draft",
      className: "Class 10",
      subject: "Science",
      subjectCode: "200",
      totalMarks: 75,
      questions: [
        {
          id: "q1",
          number: 1,
          sectionTitle: "Section A (MCQ)",
          type: "MCQ",
          text: "Which of the following is an amphoteric oxide?",
          options: ["Na2O", "K2O", "Na2O"], // Duplicate option and only 3 options!
          answer: "Al2O3", // Correct answer is not in options!
          marks: 1,
          difficulty: "MEDIUM",
        },
        {
          id: "q2",
          number: 2,
          sectionTitle: "Section B",
          type: "SHORT",
          text: "In the diagram given below, state the function of part P.", // Missing diagram!
          options: [],
          answer: "P regulates stomatal opening.",
          marks: 2,
          difficulty: "MEDIUM",
        },
      ],
    };

    const report = await auditPaperEvidenceBased(defectivePaper);

    expect(report.status).toBe("FAIL");
    expect(report.findings.length).toBeGreaterThanOrEqual(2);

    const q1Finding = report.findings.find((f) => f.questionNumber === 1);
    expect(q1Finding).toBeDefined();
    expect(q1Finding?.issue).toBeDefined();
    expect(q1Finding?.evidence).toBeDefined();
    expect(q1Finding?.whyItIsAnIssue).toBeDefined();
    expect(q1Finding?.recommendedCorrection).toBeDefined();
    expect(q1Finding?.isObjectivelyVerified).toBe(true);

    const q2Finding = report.findings.find((f) => f.questionNumber === 2);
    expect(q2Finding).toBeDefined();
    expect(q2Finding?.type).toBe("INCOMPLETE_QUESTION");
  });

  it("never generates generic vague findings without evidence", async () => {
    const paper = {
      paperTitle: "Class 10 Mathematics",
      className: "Class 10",
      subject: "Mathematics",
      subjectCode: "100",
      totalMarks: 75,
      questions: [
        {
          id: "q1",
          number: 1,
          sectionTitle: "Section A",
          type: "MCQ",
          text: "The discriminant of the quadratic equation 2x^2 - 4x + 3 = 0 is:",
          options: ["-8", "8", "-16", "16"],
          answer: "-8",
          explanation: "b^2 - 4ac = (-4)^2 - 4(2)(3) = 16 - 24 = -8.",
          marks: 1,
          difficulty: "MEDIUM",
        },
      ],
    };

    const report = await auditPaperEvidenceBased(paper);
    for (const finding of report.findings) {
      expect(finding.evidence).toBeTruthy();
      expect(finding.issue).not.toMatch(/improve question quality|consider increasing difficulty/i);
    }
  });
});
