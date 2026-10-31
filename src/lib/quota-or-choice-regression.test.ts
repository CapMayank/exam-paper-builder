import { describe, it, expect } from "vitest";
import { toPlacedItems, paperStatus, diagnosePaperImplications } from "./blueprint";
import { planPaperSlotAssignments } from "./paperAutogen";
import { getEffectiveQuestionMarks } from "./reconcileBlueprint";
import { validatePaperPreflight } from "./preflight";
import { validateSubPartsSum } from "./types";
import { STANDARD_BLUEPRINT_TEMPLATES } from "./curriculumTemplates";
import { STANDARD_CURRICULUM_PRESETS } from "./curriculumPresets";

describe("Quota Manager & Internal Choice (OR) Marks Isolation Regression", () => {
  const sanskritPreset = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-10-sanskrit")!;
  const sanskritTpl = STANDARD_BLUEPRINT_TEMPLATES.find((t) => t.id === "mpbse-sanskrit-10th-legacy-75m")!;

  const sections = sanskritTpl.sections.flatMap((grp, gIdx) =>
    grp.questionTypes.map((qt, qIdx) => ({
      id: `sec_${gIdx}`,
      title: grp.title,
      instructions: grp.instructions,
      type: qt.type,
      count: qt.count,
      marksEach: qt.marksEach,
    }))
  );

  const chapters = sanskritPreset.chapters.map((c, idx) => ({
    chapterId: `ch_${c.number}`,
    marks: idx < 5 ? 8 : 7,
    chapter: {
      id: `ch_${c.number}`,
      number: c.number,
      title: c.title,
    },
  }));

  it("Requirement 1: Internal Choice (OR) questions never add marks or consume duplicate chapter quota", () => {
    // 75-mark paper: Sections A-H. Sections G and H have mandatory OR questions.
    const items: any[] = [];
    let qId = 1;

    // Sec 0: 6 MCQs (1m each)
    for (let i = 0; i < 6; i++) {
      items.push({
        id: `it_${qId}`,
        sectionId: sections[0].id,
        question: { id: `q_${qId++}`, chapterId: `ch_${(i % 5) + 1}`, type: "MCQ", text: "MCQ", optionsJson: "[]" },
        orQuestion: null,
      });
    }
    // Sec 1: 6 Fill in blanks (1m each)
    for (let i = 0; i < 6; i++) {
      items.push({
        id: `it_${qId}`,
        sectionId: sections[1].id,
        question: { id: `q_${qId++}`, chapterId: `ch_${((i + 1) % 5) + 1}`, type: "FILL_BLANK", text: "Blank", optionsJson: "[]" },
        orQuestion: null,
      });
    }
    // Sec 2: 6 True/False (1m each)
    for (let i = 0; i < 6; i++) {
      items.push({
        id: `it_${qId}`,
        sectionId: sections[2].id,
        question: { id: `q_${qId++}`, chapterId: `ch_${((i + 2) % 5) + 1}`, type: "TRUE_FALSE", text: "TF", optionsJson: "[]" },
        orQuestion: null,
      });
    }
    // Sec 3: 1 MATCH_COLUMN (6 pairs = 6m)
    items.push({
      id: `it_${qId}`,
      sectionId: sections[3].id,
      question: {
        id: `q_${qId++}`,
        chapterId: "ch_1",
        type: "MATCH_COLUMN",
        text: "Match",
        optionsJson: JSON.stringify(["a", "b", "c", "d", "e", "f"]),
        explanation: "1-a, 2-b, 3-c, 4-d, 5-e, 6-f",
      },
      orQuestion: null,
    });
    // Sec 4: 6 VERY_SHORT (1m each)
    for (let i = 0; i < 6; i++) {
      items.push({
        id: `it_${qId}`,
        sectionId: sections[4].id,
        question: { id: `q_${qId++}`, chapterId: `ch_${((i + 3) % 5) + 1}`, type: "VERY_SHORT", text: "VShort", optionsJson: "[]" },
        orQuestion: null,
      });
    }
    // Sec 5: 12 SHORT (2m each = 24m)
    for (let i = 0; i < 12; i++) {
      items.push({
        id: `it_${qId}`,
        sectionId: sections[5].id,
        question: { id: `q_${qId++}`, chapterId: `ch_${(i % 10) + 1}`, type: "SHORT", text: "Short", optionsJson: "[]" },
        orQuestion: null,
      });
    }
    // Sec 6: 3 SHORT (3m each = 9m) with complete OR alternatives (3m each)
    for (let i = 0; i < 3; i++) {
      const primaryQId = `q_${qId++}`;
      const orQId = `q_or_${qId++}`;
      items.push({
        id: `it_${qId}`,
        sectionId: sections[6].id,
        question: { id: primaryQId, chapterId: `ch_${i + 6}`, type: "SHORT", text: "Passage Question", optionsJson: "[]" },
        orQuestion: { id: orQId, chapterId: `ch_${i + 6}`, type: "SHORT", text: "Passage Alternate Question (अथवा)", optionsJson: "[]" },
      });
    }
    // Sec 7: 3 LONG (4m each = 12m) with subparts and complete OR alternatives with subparts
    for (let i = 0; i < 3; i++) {
      const subparts = [
        { label: "(i)", text: "Sub 1", marks: 1 },
        { label: "(ii)", text: "Sub 2", marks: 1 },
        { label: "(iii)", text: "Sub 3", marks: 1 },
        { label: "(iv)", text: "Sub 4", marks: 1 },
      ];
      const primaryQId = `q_${qId++}`;
      const orQId = `q_or_${qId++}`;
      items.push({
        id: `it_${qId}`,
        sectionId: sections[7].id,
        question: {
          id: primaryQId,
          chapterId: `ch_${i + 8}`,
          type: "LONG",
          text: "Long Question",
          subpartsJson: JSON.stringify(subparts),
          subparts,
        },
        orQuestion: {
          id: orQId,
          chapterId: `ch_${i + 8}`,
          type: "LONG",
          text: "Long Alternate Question (अथवा)",
          subpartsJson: JSON.stringify(subparts),
          subparts,
        },
      });
    }

    const placedItems = toPlacedItems(sections, items);
    const status = paperStatus(
      {
        sections,
        chapters: chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
      },
      placedItems
    );

    // Total marks must be exactly 75, NOT 96 (75 + 21m of OR choices)
    expect(status.totalMarks).toBe(75);
    expect(status.usedMarks).toBe(75);
    expect(status.usedMarks > status.totalMarks).toBe(false);

    // Placed items count must equal exactly the primary questions count
    expect(placedItems.length).toBe(items.length);
  });

  it("Requirement 2: Subpart marks never exceed section marks quota (no over-quota inflation)", () => {
    // A 4-mark question in Section H with 5 subparts (each 1 mark) without explicit attemptCount
    const subparts5 = [
      { label: "(क)", text: "Sentence 1", marks: 1 },
      { label: "(ख)", text: "Sentence 2", marks: 1 },
      { label: "(ग)", text: "Sentence 3", marks: 1 },
      { label: "(घ)", text: "Sentence 4", marks: 1 },
      { label: "(ङ)", text: "Sentence 5", marks: 1 },
    ];

    const testItem = {
      sectionId: sections[7].id, // 4-mark section
      question: {
        id: "q_32",
        chapterId: "ch_1",
        type: "LONG",
        text: "Correct any four sentences",
        subpartsJson: JSON.stringify(subparts5),
        subparts: subparts5,
      },
    };

    const placed = toPlacedItems(sections, [testItem as any]);
    expect(placed).toHaveLength(1);
    // Effective marks must be capped at section.marksEach (4), NEVER 5!
    expect(placed[0].marks).toBe(4);

    // Also check with attemptCount: 4 explicitly
    const testItemWithAttempt = {
      sectionId: sections[7].id,
      question: {
        id: "q_32_attempt",
        chapterId: "ch_1",
        type: "LONG",
        text: "Correct any four sentences",
        subpartsJson: JSON.stringify({ attemptCount: 4, subparts: subparts5 }),
        attemptCount: 4,
        subparts: subparts5,
      },
    };

    const placedAttempt = toPlacedItems(sections, [testItemWithAttempt as any]);
    expect(placedAttempt[0].marks).toBe(4);

    // Reconcile effective marks solver respects attemptCount
    const effectiveReconcileMarks = getEffectiveQuestionMarks(
      {
        type: "LONG",
        text: "Correct any four sentences",
        subpartsJson: JSON.stringify({ attemptCount: 4, subparts: subparts5 }),
      },
      4
    );
    expect(effectiveReconcileMarks).toBe(4);
  });

  it("Requirement 3: Global Blueprint Planning ensures 100% quota satisfaction with 0 chapters over quota", () => {
    // Generate all 8 sections sequentially using planPaperSlotAssignments
    const placedItemsList: any[] = [];

    for (const sec of sections) {
      const plan = planPaperSlotAssignments({
        id: "paper_sanskrit_10",
        title: "Class 10 Sanskrit Annual Exam",
        blueprint: {
          name: "Class 10 Sanskrit Annual Blueprint",
          sections,
          chapters,
        },
        items: placedItemsList,
      });

      const secPlan = plan.sections.find((s) => s.sectionId === sec.id);
      expect(secPlan).toBeDefined();
      const slots = secPlan!.slots;
      const isMatch = sec.type === "MATCH_COLUMN";

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        placedItemsList.push({
          sectionId: sec.id,
          question: {
            id: `q_${sec.id}_${i}`,
            chapterId: slot.chapterId,
            type: sec.type,
            text: `Question ${sec.id} ${i}`,
            optionsJson: isMatch ? JSON.stringify(["a", "b", "c", "d", "e", "f"]) : "[]",
            explanation: isMatch ? "1-a, 2-b, 3-c, 4-d, 5-e, 6-f" : undefined,
            subpartsJson: "[]",
          },
          orQuestion: slot.requiresInternalChoice
            ? {
                id: `or_${sec.id}_${i}`,
                chapterId: slot.chapterId,
                type: sec.type,
                text: `OR Question ${sec.id} ${i}`,
                optionsJson: isMatch ? JSON.stringify(["a", "b", "c", "d", "e", "f"]) : "[]",
                explanation: isMatch ? "1-a, 2-b, 3-c, 4-d, 5-e, 6-f" : undefined,
                subpartsJson: "[]",
              }
            : null,
        });
        if (isMatch) break;
      }
    }

    const finalPlaced = toPlacedItems(sections, placedItemsList);
    const finalStatus = paperStatus(
      { sections, chapters: chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })) },
      finalPlaced
    );

    expect(finalStatus.totalMarks).toBe(75);
    expect(finalStatus.usedMarks).toBe(75);
    expect(finalStatus.complete).toBe(true);

    // Every chapter must match its target marks exactly without any excess
    for (const ch of finalStatus.chapters) {
      expect(ch.used).toBe(ch.target);
    }

    // Diagnostic implications must have 0 CHAPTER_EXCESS errors
    const implications = diagnosePaperImplications(
      {
        sections,
        chapters: chapters.map((c) => ({ chapterId: c.chapterId, title: c.chapter.title, marks: c.marks })),
      },
      finalPlaced.map((p, idx) => ({
        id: `it_${idx}`,
        sectionId: p.sectionId,
        chapterId: p.chapterId,
        marks: p.marks,
        subpartsCount: p.subpartsCount,
      }))
    );

    const excessErrors = implications.filter((i) => i.code === "CHAPTER_EXCESS");
    expect(excessErrors).toHaveLength(0);
  });

  it("Requirement 4: Preflight Validation correctly validates subparts with attemptCount without false positive mismatch", () => {
    const fiveSubparts = [
      { label: "(i)", text: "Sub 1", marks: 1 },
      { label: "(ii)", text: "Sub 2", marks: 1 },
      { label: "(iii)", text: "Sub 3", marks: 1 },
      { label: "(iv)", text: "Sub 4", marks: 1 },
      { label: "(v)", text: "Sub 5", marks: 1 },
    ];

    // 5 subparts of 1 mark each with attemptCount 4 for a 4-mark question is completely valid
    expect(validateSubPartsSum(fiveSubparts, 4, 4)).toBe(true);

    const mockPaper: any = {
      id: "paper_test",
      examDate: "15/03/2026",
      generalInstructions: "All questions compulsory.",
      progress: { complete: true, usedMarks: 75, totalMarks: 75 },
      blueprint: {
        name: "Mock Blueprint",
        book: { className: "Class 10", subject: "Sanskrit" },
        sections: [{ id: "sec_h", count: 1, marksEach: 4, type: "LONG", title: "Section H" }],
        chapters: [{ chapterId: "ch_1", marks: 4 }],
      },
      items: [
        {
          id: "item_32",
          sectionId: "sec_h",
          question: {
            id: "q_32",
            chapterId: "ch_1",
            type: "LONG",
            text: "Answer any 4 of 5",
            subparts: fiveSubparts,
            attemptCount: 4,
          },
          orQuestion: null,
        },
      ],
    };

    const report = validatePaperPreflight(mockPaper);
    const subpartErrors = report.warnings.filter((w) => w.code === "SUBPARTS_MARKS_MISMATCH");
    expect(subpartErrors).toHaveLength(0);
  });
});
