import { describe, expect, it } from "vitest";
import {
  evaluateMPBoardStandardCompliance,
  type MPBoardComplianceReport,
} from "./mpbseStandardEngine";
import type { ValidatableQuestion } from "./questionValidator";

describe("MP Board Examination Standard Comparison Engine (TDD)", () => {
  it("evaluates a standard MP Board Class 10 Science paper (75 marks, 23 questions)", () => {
    // MP Board Standard 23Q 75M:
    // Q1-Q5 Objective (30 marks)
    // Q6-Q17 2-mark (12 questions = 24 marks, no choice)
    // Q18-Q20 3-mark (3 questions = 9 marks, 100% internal choice)
    // Q21-Q23 4-mark (3 questions = 12 marks, 100% internal choice)
    // Total = 75 marks, 23 numbered questions
    const mockPaper = {
      title: "Class 10 Science Annual Examination 2026-27",
      className: "Class 10",
      subject: "Science",
      subjectCode: "200",
      board: "MPBSE",
      academicSession: "2026-2027",
      totalMarks: 75,
      sections: [
        { title: "प्रश्न 1 सही विकल्प चुनिए", type: "MCQ", count: 6, marksEach: 1 },
        { title: "प्रश्न 2 रिक्त स्थानों की पूर्ति कीजिए", type: "FILL_BLANK", count: 6, marksEach: 1 },
        { title: "प्रश्न 3 सही जोड़ी बनाइए", type: "MATCH_COLUMN", count: 1, marksEach: 6 },
        { title: "प्रश्न 4 एक वाक्य में उत्तर दीजिए", type: "VERY_SHORT", count: 6, marksEach: 1 },
        { title: "प्रश्न 5 सत्य / असत्य लिखिए", type: "TRUE_FALSE", count: 6, marksEach: 1 },
        { title: "अति लघु उत्तरीय प्रश्न", type: "SHORT", count: 12, marksEach: 2 },
        { title: "लघु उत्तरीय प्रश्न", type: "SHORT", count: 3, marksEach: 3, orChoiceMode: "REQUIRED" },
        { title: "दीर्घ उत्तरीय प्रश्न", type: "LONG", count: 3, marksEach: 4, orChoiceMode: "REQUIRED" },
      ],
      items: [
        // 5 objective group items + 12 VSA + 3 SA + 3 LA = 23 questions with valid choices
      ],
    };

    const report: MPBoardComplianceReport = evaluateMPBoardStandardCompliance(mockPaper as any);

    expect(report.matchedArchetype).toBe("STANDARD_23Q_75M");
    expect(report.circular465Compliant).toBe(true);
    expect(report.dimensions.overallScore).toBeGreaterThanOrEqual(80);
    expect(report.dimensionScores.questionTypeDistribution.passed).toBe(true);
    expect(report.dimensionScores.internalChoicePattern.passed).toBe(true);
  });

  it("fails compliance and scores 0 overall if mandatory quality gates (academic correctness or blueprint) fail", () => {
    const defectivePaper = {
      title: "Class 10 Math Annual Exam",
      className: "Class 10",
      subject: "Mathematics",
      subjectCode: "100",
      board: "MPBSE",
      totalMarks: 75,
      sections: [],
      items: [],
      hasAcademicDefects: true,
      defectSummary: "Unsolvable quadratic equation in Question 14",
    };

    const report = evaluateMPBoardStandardCompliance(defectivePaper as any);
    expect(report.status).toBe("FAIL");
    expect(report.mandatoryGatesPassed).toBe(false);
    expect(report.verdict).toContain("Academic correctness gate failed");
  });
});
