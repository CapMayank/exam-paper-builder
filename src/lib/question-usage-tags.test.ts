import { describe, expect, it } from "vitest";
import { parseCompactExamTag } from "../components/QuestionUsageHistory";
import type { QuestionUsageTag } from "./types";

describe("Strict Teacher Compact Question Usage Tag Formatting", () => {
  it("formats Quarterly 2026 from various title & date forms", () => {
    const u1: Partial<QuestionUsageTag> = {
      paperId: "p1",
      paperTitle: "Quarterly Examination 2026",
      examDate: "2026-08-20",
      academicSession: "2026–27",
    };
    const parsed1 = parseCompactExamTag(u1);
    expect(parsed1.displayLabel).toBe("Quarterly 2026");
    expect(parsed1.category).toBe("quarterly");

    const u2: Partial<QuestionUsageTag> = {
      paperId: "p2",
      paperTitle: "Class 10 Science Quaterly Test",
      examDate: "2026-09-01",
    };
    const parsed2 = parseCompactExamTag(u2);
    expect(parsed2.displayLabel).toBe("Quarterly 2026");
    expect(parsed2.category).toBe("quarterly");
  });

  it("formats Half 2026 from Half Yearly or Mid-Term titles", () => {
    const u1: Partial<QuestionUsageTag> = {
      paperId: "p3",
      paperTitle: "Half Yearly Examination - Set A",
      examDate: "2026-10-15",
      academicSession: "2026–27",
      paperSet: "Set A",
    };
    const parsed1 = parseCompactExamTag(u1);
    expect(parsed1.displayLabel).toBe("Half 2026");
    expect(parsed1.category).toBe("half");

    const u2: Partial<QuestionUsageTag> = {
      paperId: "p4",
      paperTitle: "Mid-Term Examination",
      academicSession: "2025–26",
    };
    const parsed2 = parseCompactExamTag(u2);
    expect(parsed2.displayLabel).toBe("Half 2026");
    expect(parsed2.category).toBe("half");
  });

  it("formats Annual 2025 from Annual, Final, or Board titles", () => {
    const u1: Partial<QuestionUsageTag> = {
      paperId: "p5",
      paperTitle: "Annual Examination 2025",
      examDate: "2025-03-10",
      academicSession: "2024–25",
    };
    const parsed1 = parseCompactExamTag(u1);
    expect(parsed1.displayLabel).toBe("Annual 2025");
    expect(parsed1.category).toBe("annual");

    const u2: Partial<QuestionUsageTag> = {
      paperId: "p6",
      paperTitle: "Final Board Assessment",
      examDate: "2025-02-28",
    };
    const parsed2 = parseCompactExamTag(u2);
    expect(parsed2.displayLabel).toBe("Annual 2025");
    expect(parsed2.category).toBe("annual");
  });

  it("formats Pre-Board and Unit Test terms cleanly", () => {
    const uPre: Partial<QuestionUsageTag> = {
      paperId: "p7",
      paperTitle: "Pre-Board I Examination 2026",
      academicSession: "2025–26",
    };
    const parsedPre = parseCompactExamTag(uPre);
    expect(parsedPre.displayLabel).toBe("Pre-Board 2026");
    expect(parsedPre.category).toBe("preboard");

    const uUt: Partial<QuestionUsageTag> = {
      paperId: "p8",
      paperTitle: "Unit Test 2",
      examDate: "2025-07-20",
    };
    const parsedUt = parseCompactExamTag(uUt);
    expect(parsedUt.displayLabel).toBe("UT-2 2025");
    expect(parsedUt.category).toBe("unittest");
  });

  it("formats Practice tests cleanly instead of long titles", () => {
    const u: Partial<QuestionUsageTag> = {
      paperId: "p9",
      paperTitle: "Science Practice Test - Single Page Format",
      examDate: "2026-11-15",
      academicSession: "2026–27",
    };
    const parsed = parseCompactExamTag(u);
    expect(parsed.displayLabel).toBe("Practice 2026");
    expect(parsed.category).toBe("practice");
  });
});
