import { afterEach, describe, expect, it, vi } from "vitest";
import { auditPaperEvidenceBased, referencesMissingVisual } from "./evidenceAuditEngine";
import { evaluateMPBoardStandardCompliance } from "./mpbseStandardEngine";

const paper = {
  paperTitle: "Class 10 Hindi",
  className: "Class 10",
  subject: "Hindi",
  totalMarks: 4,
  questions: [
    {
      id: "p1",
      number: 1,
      sectionTitle: "Reading Comprehension",
      type: "UNSEEN_PASSAGE",
      text: "Read the following passage carefully and answer the questions given below.",
      options: [],
      answer: "",
      marks: 4,
      difficulty: "MEDIUM",
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("referencesMissingVisual", () => {
  it("does not treat a passage or 'questions given below' as a missing diagram", () => {
    expect(referencesMissingVisual("Read the passage and answer the questions given below.", "UNSEEN_PASSAGE")).toBe(false);
    expect(referencesMissingVisual("Answer the questions given below.", "SHORT", "Reading Comprehension")).toBe(false);
    expect(referencesMissingVisual("Identify the figure of speech in the line.", "SHORT")).toBe(false);
  });

  it("still catches a real dangling diagram reference", () => {
    expect(referencesMissingVisual("Look at the diagram given below and label part X.", "SHORT")).toBe(true);
    expect(referencesMissingVisual("In the figure, find angle ABC.", "SHORT")).toBe(true);
  });
});

describe("audit never passes a paper it did not review", () => {
  it("is INCONCLUSIVE, not PASS, when the model stage is skipped", async () => {
    const r = await auditPaperEvidenceBased(paper);
    expect(r.aiStage).toBe("SKIPPED");
    expect(r.status).toBe("INCONCLUSIVE");
    expect(r.findings).toHaveLength(0);
    expect(r.cognitiveBalance.rating).toBe("NOT_ASSESSED");
  });

  it("is INCONCLUSIVE when the model call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const r = await auditPaperEvidenceBased({ ...paper, apiKey: "test-key-123" });
    expect(r.aiStage).toBe("FAILED");
    expect(r.status).toBe("INCONCLUSIVE");
  });

  it("PASSes only when the model stage completed with no defects", async () => {
    const body = { candidates: [{ content: { parts: [{ text: JSON.stringify({ defects: [] }) }] } }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => body }));
    const r = await auditPaperEvidenceBased({ ...paper, apiKey: "test-key-123" });
    expect(r.aiStage).toBe("COMPLETED");
    expect(r.status).toBe("PASS");
    expect(r.overallVerdict).toMatch(/not a certification/);
  });

  it("FAILs on a model-reported defect with evidence", async () => {
    const defects = [{ questionNumber: 1, severity: "HIGH", type: "AMBIGUITY", issue: "x", evidence: "y" }];
    const body = { candidates: [{ content: { parts: [{ text: JSON.stringify({ defects }) }] } }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => body }));
    const r = await auditPaperEvidenceBased({ ...paper, apiKey: "test-key-123" });
    expect(r.status).toBe("FAIL");
  });
});

describe("MP Board standard report does not score what it cannot compute", () => {
  it("marks judgement dimensions as not assessed", () => {
    const rep = evaluateMPBoardStandardCompliance({
      title: "t",
      className: "Class 10",
      subject: "Science",
      board: "MPBSE",
      totalMarks: 75,
      sections: [],
      items: [],
    } as never);
    const d = Object.values(rep.dimensionScores);
    expect(d.filter((x) => !x.assessed).length).toBeGreaterThanOrEqual(7);
    for (const x of d.filter((y) => !y.assessed)) expect(x.score).toBe(0);
  });
});
