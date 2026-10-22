import { describe, expect, it } from "vitest";
import { reconcileBlueprintQuestions } from "./reconcileBlueprint";

describe("reconcileBlueprintQuestions", () => {
  const chapters = [
    { chapterId: "c1", title: "Sexual Reproduction in Flowering Plants", marks: 5 },
    { chapterId: "c2", title: "Human Reproduction", marks: 6 },
    { chapterId: "c3", title: "Reproductive Health", marks: 5 },
    { chapterId: "c4", title: "Principles of Inheritance and Variation", marks: 5 },
    { chapterId: "c5", title: "Molecular Basis of Inheritance", marks: 6 },
    { chapterId: "c6", title: "Evolution", marks: 5 },
    { chapterId: "c7", title: "Human Health and Disease", marks: 7 },
    { chapterId: "c8", title: "Microbes in Human Welfare", marks: 7 },
    { chapterId: "c9", title: "Biotechnology: Principles and Processes", marks: 6 },
    { chapterId: "c10", title: "Biotechnology and its Applications", marks: 6 },
    { chapterId: "c11", title: "Organisms and Populations", marks: 4 },
    { chapterId: "c12", title: "Ecosystem", marks: 4 },
    { chapterId: "c13", title: "Biodiversity and Conservation", marks: 4 },
  ];

  const sections = [
    { id: "s1", title: "Section A", type: "MCQ", count: 6, marksEach: 1 },
    { id: "s4", title: "Section D", type: "MATCH_COLUMN", count: 5, marksEach: 1 },
  ];

  it("returns no reassignments if chapters already perfectly match blueprint quotas", () => {
    const items = [
      {
        paperItemId: "item_1",
        questionId: "q1",
        sectionId: "s1",
        chapterId: "c1",
        type: "MCQ",
        text: "Flower pollination question",
      },
    ];

    const result = reconcileBlueprintQuestions({
      chapters: [{ chapterId: "c1", title: "Sexual Reproduction", marks: 1 }],
      sections,
      items,
    });

    expect(result.reassignments.length).toBe(0);
    expect(result.isBalanced).toBe(true);
  });

  it("reconciles the 5 adjustments case by moving excess questions to deficit chapters", () => {
    // In this scenario:
    // Chapter c4 has 1 MATCH_COLUMN question (5m) + 4 MCQs (1m each) = 9 marks placed (target is 5m, +4m excess)
    // Chapters c5, c6, c7, c8 each have 1m deficit
    const items = [
      {
        paperItemId: "item_match",
        questionId: "q_match",
        sectionId: "s4",
        chapterId: "c4",
        type: "MATCH_COLUMN",
        text: "Match the following items:\n(A) DNA\n(B) RNA",
        optionsJson: JSON.stringify(["Pair 1 ||| Def 1", "Pair 2 ||| Def 2", "Pair 3 ||| Def 3", "Pair 4 ||| Def 4", "Pair 5 ||| Def 5"]),
      },
      {
        paperItemId: "item_mcq1",
        questionId: "q_mcq1",
        sectionId: "s1",
        chapterId: "c4",
        type: "MCQ",
        text: "Question about Molecular DNA structure",
      },
      {
        paperItemId: "item_mcq2",
        questionId: "q_mcq2",
        sectionId: "s1",
        chapterId: "c4",
        type: "MCQ",
        text: "Question about Darwinian Evolution and speciation",
      },
      {
        paperItemId: "item_mcq3",
        questionId: "q_mcq3",
        sectionId: "s1",
        chapterId: "c4",
        type: "MCQ",
        text: "Question about Human Health and viral pathogens",
      },
      {
        paperItemId: "item_mcq4",
        questionId: "q_mcq4",
        sectionId: "s1",
        chapterId: "c4",
        type: "MCQ",
        text: "Question about Microbes in fermentative processing",
      },
      // Baseline questions for other chapters to fill their quotas except 1m deficit in c5, c6, c7, c8
      { paperItemId: "i_c1", questionId: "qc1", sectionId: "s1", chapterId: "c1", type: "MCQ", text: "c1", subpartsJson: JSON.stringify([{ label: "(i)", marks: 5, text: "" }]) },
      { paperItemId: "i_c2", questionId: "qc2", sectionId: "s1", chapterId: "c2", type: "MCQ", text: "c2", subpartsJson: JSON.stringify([{ label: "(i)", marks: 6, text: "" }]) },
      { paperItemId: "i_c3", questionId: "qc3", sectionId: "s1", chapterId: "c3", type: "MCQ", text: "c3", subpartsJson: JSON.stringify([{ label: "(i)", marks: 5, text: "" }]) },
      { paperItemId: "i_c5", questionId: "qc5", sectionId: "s1", chapterId: "c5", type: "MCQ", text: "c5", subpartsJson: JSON.stringify([{ label: "(i)", marks: 5, text: "" }]) }, // 5 of 6
      { paperItemId: "i_c6", questionId: "qc6", sectionId: "s1", chapterId: "c6", type: "MCQ", text: "c6", subpartsJson: JSON.stringify([{ label: "(i)", marks: 4, text: "" }]) }, // 4 of 5
      { paperItemId: "i_c7", questionId: "qc7", sectionId: "s1", chapterId: "c7", type: "MCQ", text: "c7", subpartsJson: JSON.stringify([{ label: "(i)", marks: 6, text: "" }]) }, // 6 of 7
      { paperItemId: "i_c8", questionId: "qc8", sectionId: "s1", chapterId: "c8", type: "MCQ", text: "c8", subpartsJson: JSON.stringify([{ label: "(i)", marks: 6, text: "" }]) }, // 6 of 7
      { paperItemId: "i_c9", questionId: "qc9", sectionId: "s1", chapterId: "c9", type: "MCQ", text: "c9", subpartsJson: JSON.stringify([{ label: "(i)", marks: 6, text: "" }]) },
      { paperItemId: "i_c10", questionId: "qc10", sectionId: "s1", chapterId: "c10", type: "MCQ", text: "c10", subpartsJson: JSON.stringify([{ label: "(i)", marks: 6, text: "" }]) },
      { paperItemId: "i_c11", questionId: "qc11", sectionId: "s1", chapterId: "c11", type: "MCQ", text: "c11", subpartsJson: JSON.stringify([{ label: "(i)", marks: 4, text: "" }]) },
      { paperItemId: "i_c12", questionId: "qc12", sectionId: "s1", chapterId: "c12", type: "MCQ", text: "c12", subpartsJson: JSON.stringify([{ label: "(i)", marks: 4, text: "" }]) },
      { paperItemId: "i_c13", questionId: "qc13", sectionId: "s1", chapterId: "c13", type: "MCQ", text: "c13", subpartsJson: JSON.stringify([{ label: "(i)", marks: 4, text: "" }]) },
    ];

    const result = reconcileBlueprintQuestions({
      chapters,
      sections,
      items,
    });

    expect(result.reassignments.length).toBe(4);
    expect(result.isBalanced).toBe(true);
    expect(result.unreconciledExcessMarks).toBe(0);
    expect(result.unreconciledDeficitMarks).toBe(0);

    // Verify all 4 reassignments were moved away from excess chapter c4
    for (const r of result.reassignments) {
      expect(r.fromChapterId).toBe("c4");
    }

    // Verify keywords matched appropriately:
    // q_mcq1 has "Molecular" -> c5 (Molecular Basis of Inheritance)
    const r1 = result.reassignments.find((r) => r.questionId === "q_mcq1");
    expect(r1?.toChapterId).toBe("c5");

    // q_mcq2 has "Evolution" -> c6 (Evolution)
    const r2 = result.reassignments.find((r) => r.questionId === "q_mcq2");
    expect(r2?.toChapterId).toBe("c6");

    // q_mcq3 has "Health" -> c7 (Human Health and Disease)
    const r3 = result.reassignments.find((r) => r.questionId === "q_mcq3");
    expect(r3?.toChapterId).toBe("c7");

    // q_mcq4 has "Microbes" -> c8 (Microbes in Human Welfare)
    const r4 = result.reassignments.find((r) => r.questionId === "q_mcq4");
    expect(r4?.toChapterId).toBe("c8");
  });
});
