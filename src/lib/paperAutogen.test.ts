import { describe, expect, it } from "vitest";
import { planPaperSlotAssignments, type PaperAutogenInput } from "./paperAutogen";

describe("planPaperSlotAssignments", () => {
  const mockBlueprint = {
    id: "bp_1",
    name: "Class 12 Biology MP Board",
    bookId: "b_1",
    examType: "ANNUAL",
    durationMin: 180,
    subjectCode: "044",
    book: {
      id: "b_1",
      title: "NCERT Biology 12",
      subject: "Biology",
      className: "Class 12",
    },
    chapters: [
      { chapterId: "c1", marks: 5, chapter: { id: "c1", number: 1, title: "Sexual Reproduction in Flowering Plants" } },
      { chapterId: "c2", marks: 6, chapter: { id: "c2", number: 2, title: "Human Reproduction" } },
      { chapterId: "c3", marks: 5, chapter: { id: "c3", number: 3, title: "Reproductive Health" } },
      { chapterId: "c4", marks: 5, chapter: { id: "c4", number: 4, title: "Principles of Inheritance and Variation" } },
      { chapterId: "c5", marks: 6, chapter: { id: "c5", number: 5, title: "Molecular Basis of Inheritance" } },
      { chapterId: "c6", marks: 5, chapter: { id: "c6", number: 6, title: "Evolution" } },
      { chapterId: "c7", marks: 7, chapter: { id: "c7", number: 7, title: "Human Health and Disease" } },
      { chapterId: "c8", marks: 7, chapter: { id: "c8", number: 8, title: "Microbes in Human Welfare" } },
      { chapterId: "c9", marks: 6, chapter: { id: "c9", number: 9, title: "Biotechnology: Principles and Processes" } },
      { chapterId: "c10", marks: 6, chapter: { id: "c10", number: 10, title: "Biotechnology and its Applications" } },
      { chapterId: "c11", marks: 4, chapter: { id: "c11", number: 11, title: "Organisms and Populations" } },
      { chapterId: "c12", marks: 4, chapter: { id: "c12", number: 12, title: "Ecosystem" } },
      { chapterId: "c13", marks: 4, chapter: { id: "c13", number: 13, title: "Biodiversity and Conservation" } },
    ],
    sections: [
      { id: "s1", position: 1, title: "Multiple Choice Questions", instructions: "", type: "MCQ", count: 6, marksEach: 1 },
      { id: "s2", position: 2, title: "Fill in the Blanks", instructions: "", type: "FILL_BLANK", count: 6, marksEach: 1 },
      { id: "s3", position: 3, title: "True / False", instructions: "", type: "TRUE_FALSE", count: 6, marksEach: 1 },
      { id: "s4", position: 4, title: "Match the Columns", instructions: "", type: "MATCH_COLUMN", count: 5, marksEach: 1 },
      { id: "s5", position: 5, title: "One-word Answer", instructions: "", type: "VERY_SHORT", count: 5, marksEach: 1 },
      { id: "s6", position: 6, title: "Very Short Answer Questions", instructions: "", type: "VERY_SHORT", count: 7, marksEach: 2 },
      { id: "s7", position: 7, title: "Short Answer Questions", instructions: "", type: "SHORT", count: 4, marksEach: 3 },
      { id: "s8", position: 8, title: "Long Answer Questions", instructions: "", type: "LONG", count: 4, marksEach: 4 },
    ],
  };

  it("plans an entire empty exam paper with exact quota balancing", () => {
    const emptyPaper: PaperAutogenInput = {
      id: "paper_1",
      title: "MP Board Class 12 Biology Mock",
      blueprint: mockBlueprint,
      items: [],
    };

    const plan = planPaperSlotAssignments(emptyPaper);

    expect(plan.paperId).toBe("paper_1");
    expect(plan.totalMarksNeeded).toBe(70);
    expect(plan.totalQuestionsNeeded).toBe(43);
    expect(plan.sections.length).toBe(8);

    // Verify all slots have valid chapter assignments
    for (const sec of plan.sections) {
      expect(sec.slots.length).toBe(sec.totalQuestionsNeeded);
      for (const slot of sec.slots) {
        expect(slot.chapterId).toBeDefined();
        expect(slot.chapterTitle.length).toBeGreaterThan(0);
        expect(slot.marks).toBe(sec.marksEach);
      }
    }

    // Verify total marks planned across all chapters equals 70
    const totalPlannedMarks = plan.chapterQuotas.reduce((acc, c) => acc + c.plannedMarks, 0);
    expect(totalPlannedMarks).toBe(70);

    // Verify Long Answer Questions (4m each) were distributed to high-quota chapters
    const longSec = plan.sections.find((s) => s.sectionId === "s8")!;
    expect(longSec.slots.length).toBe(4);
    for (const sl of longSec.slots) {
      expect(sl.marks).toBe(4);
    }
  });

  it("accounts for already placed questions and plans only remaining deficits", () => {
    const partiallyFilledPaper: PaperAutogenInput = {
      id: "paper_part",
      title: "Partially Filled Paper",
      blueprint: mockBlueprint,
      items: [
        {
          sectionId: "s8", // 4 marks
          question: {
            chapterId: "c7", // Human Health & Disease (Target 7m)
          },
        },
      ],
    };

    const plan = planPaperSlotAssignments(partiallyFilledPaper);

    expect(plan.totalMarksNeeded).toBe(66);
    expect(plan.totalQuestionsNeeded).toBe(42);

    const longSec = plan.sections.find((s) => s.sectionId === "s8")!;
    expect(longSec.alreadyPlacedCount).toBe(1);
    expect(longSec.totalQuestionsNeeded).toBe(3);
    expect(longSec.slots.length).toBe(3);

    // c7 already has 4 marks placed out of 7, so its alreadyPlacedMarks is 4
    const c7Quota = plan.chapterQuotas.find((c) => c.chapterId === "c7")!;
    expect(c7Quota.alreadyPlacedMarks).toBe(4);
  });

  it("returns zero needed slots if paper is already full", () => {
    const fullPaper: PaperAutogenInput = {
      id: "paper_full",
      title: "Full Paper",
      blueprint: {
        ...mockBlueprint,
        sections: [
          { id: "s1", title: "Section A", type: "MCQ", count: 1, marksEach: 1 },
        ],
        chapters: [
          { chapterId: "c1", marks: 1, chapter: { id: "c1", number: 1, title: "Ch 1" } },
        ],
      },
      items: [
        {
          sectionId: "s1",
          question: {
            chapterId: "c1",
          },
        },
      ],
    };

    const plan = planPaperSlotAssignments(fullPaper);
    expect(plan.totalMarksNeeded).toBe(0);
    expect(plan.totalQuestionsNeeded).toBe(0);
    expect(plan.sections[0].slots.length).toBe(0);
  });

  it("assigns all slots of a MATCH_COLUMN section to the same chapter so weightage is perfectly balanced", () => {
    const emptyPaper: PaperAutogenInput = {
      id: "paper_match",
      title: "MP Board Class 12 Biology Mock",
      blueprint: mockBlueprint,
      items: [],
    };

    const plan = planPaperSlotAssignments(emptyPaper);
    const matchSec = plan.sections.find((s) => s.sectionId === "s4")!;
    expect(matchSec).toBeDefined();
    expect(matchSec.slots.length).toBe(5);

    // All slots in MATCH_COLUMN must share the exact same chapterId
    const firstChapId = matchSec.slots[0].chapterId;
    expect(firstChapId).toBeDefined();
    for (const slot of matchSec.slots) {
      expect(slot.chapterId).toBe(firstChapId);
    }

    // That chapter's plannedMarks must include all 5 marks from MATCH_COLUMN
    const assignedChapQuota = plan.chapterQuotas.find((c) => c.chapterId === firstChapId)!;
    expect(assignedChapQuota.plannedMarks).toBeGreaterThanOrEqual(5);

    // Every chapter quota target must equal plannedMarks
    for (const cq of plan.chapterQuotas) {
      expect(cq.plannedMarks).toBe(cq.targetMarks);
    }
  });
});
