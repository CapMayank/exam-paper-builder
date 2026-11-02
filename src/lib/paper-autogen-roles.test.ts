import { describe, expect, it } from "vitest";
import { chapterRole, planPaperSlotAssignments, slotFitsRole, slotTaskDirective, type PaperAutogenInput } from "./paperAutogen";

// Sanskrit IX/X (MPBSE 2026-27): 30 objective + 12x2 + 3x3 + 3x4 = 75; grammar 30+6, lessons 27, passage/letter/essay 4 each.
const ch = (id: string, n: number, title: string, marks: number, unitKey?: string) => ({
  chapterId: id,
  marks,
  unitKey: unitKey ?? null,
  chapter: { id, number: n, title },
});

const sanskrit: PaperAutogenInput = {
  id: "p",
  title: "Sanskrit IX",
  blueprint: {
    book: { className: "Class 9", subject: "Sanskrit", title: "Sanskrit combined" },
    sections: [
      { id: "s1", title: "MCQ", type: "MCQ", count: 6, marksEach: 1 },
      { id: "s2", title: "Fill", type: "FILL_BLANK", count: 6, marksEach: 1 },
      { id: "s3", title: "TF", type: "TRUE_FALSE", count: 6, marksEach: 1 },
      { id: "s4", title: "Match", type: "MATCH_COLUMN", count: 6, marksEach: 1 },
      { id: "s5", title: "One word", type: "VERY_SHORT", count: 6, marksEach: 1 },
      { id: "s6", title: "2 marks", type: "VERY_SHORT", count: 12, marksEach: 2 },
      { id: "s7", title: "3 marks", type: "SHORT", count: 3, marksEach: 3 },
      { id: "s8", title: "4 marks", type: "LONG", count: 3, marksEach: 4 },
    ],
    chapters: [
      ...Array.from({ length: 9 }, (_, i) => ch(`l${i}`, i + 1, `[शेमुषी] पाठः ${i + 1}`, 3, "lessons")),
      ch("g1", 20, "शब्दरूपाणि + अव्ययाः", 6),
      ch("g2", 21, "धातुरूपाणि + उपसर्गाः", 6),
      ch("g3", 22, "सन्धयः + समासाः", 6),
      ch("g4", 23, "प्रत्ययाः + एकपदेन प्रश्नोत्तराणि", 6),
      ch("g5", 24, "विशेषणं / विशेष्यम् + पर्यायाः + विलोमाः", 6),
      ch("g6", 25, "प्रश्ननिर्माणम्", 2),
      ch("g7", 26, "अशुद्धकारकसंशोधनम्", 2),
      ch("g8", 27, "वाच्यपरिवर्तनम्", 2),
      ch("u1", 28, "अपठितगद्यांशम्", 4),
      ch("w1", 29, "पत्रलेखनम् / आवेदनपत्रलेखनम्", 4),
      ch("w2", 30, "निबन्धलेखनम्", 4),
    ],
  },
  items: [],
};

describe("role-aware slot planning", () => {
  it("classifies language exam components and leaves other subjects' chapters as lessons", () => {
    expect(chapterRole("अपठितगद्यांशम्", "Sanskrit")).toBe("PASSAGE");
    expect(chapterRole("Section A: Reading (two unseen passages)", "English")).toBe("PASSAGE");
    expect(chapterRole("पत्रलेखनम् / आवेदनपत्रलेखनम्", "Sanskrit")).toBe("WRITING");
    expect(chapterRole("Section B: Writing Skills", "English")).toBe("WRITING");
    expect(chapterRole("सन्धयः + समासाः", "Sanskrit")).toBe("GRAMMAR");
    expect(chapterRole("A Letter to God", "English")).toBe("LESSON");
    expect(chapterRole("वर्साय की संधि और यूरोप", "Social Science")).toBe("LESSON");
    expect(chapterRole("मानचित्र कार्य (समकालीन भारत-1 पर आधारित)", "Social Science")).toBe("MAP");
  });

  it("never puts an objective item on an unseen passage, letter or essay row", () => {
    for (const t of ["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN"]) {
      expect(slotFitsRole(t, 1, "PASSAGE")).toBe(false);
      expect(slotFitsRole(t, 1, "WRITING")).toBe(false);
    }
    expect(slotFitsRole("LONG", 4, "PASSAGE")).toBe(true);
    expect(slotFitsRole("LONG", 4, "WRITING")).toBe(true);
    expect(slotFitsRole("LONG", 4, "GRAMMAR")).toBe(false);
  });

  it("plans Sanskrit exactly: passage, letter and essay get the 4-mark questions, objective items go to grammar or lessons", () => {
    const plan = planPaperSlotAssignments(sanskrit);
    const byId = new Map(sanskrit.blueprint.chapters.map((c) => [c.chapterId, c.chapter.title]));
    for (const s of plan.sections) {
      for (const sl of s.slots) {
        const role = chapterRole(byId.get(sl.chapterId)!, "Sanskrit");
        if (role === "PASSAGE" || role === "WRITING") expect(s.sectionType).toBe("LONG");
      }
    }
    const longs = plan.sections.find((s) => s.sectionId === "s8")!.slots.map((sl) => sl.chapterId).sort();
    expect(longs).toEqual(["u1", "w1", "w2"]);
    // every quota group comes out exact (the nine lessons share one 27-mark budget)
    const lessons = plan.chapterQuotas.filter((q) => q.chapterId.startsWith("l")).reduce((a, q) => a + q.plannedMarks, 0);
    expect(lessons).toBe(27);
    for (const q of plan.chapterQuotas.filter((q) => !q.chapterId.startsWith("l"))) expect(q.plannedMarks).toBe(q.targetMarks);
  });

  it("tells the model what each kind of row means", () => {
    expect(slotTaskDirective("GRAMMAR", "सन्धयः + समासाः", "MCQ", 1, "Sanskrit")).toMatch(/not base it on any passage/i);
    expect(slotTaskDirective("PASSAGE", "अपठितगद्यांशम्", "LONG", 4, "Sanskrit")).toMatch(/ORIGINAL passage/);
    expect(slotTaskDirective("WRITING", "निबन्धलेखनम्", "LONG", 4, "Sanskrit")).toMatch(/model response/);
    expect(slotTaskDirective("LESSON", "Real Numbers", "MCQ", 1, "Mathematics")).toBe("");
  });
});

describe("already-tested terms", () => {
  it("collects quoted words and the word a grammar question is about", async () => {
    const { extractTestedTerms } = await import("./gemini");
    const terms = extractTestedTerms([
      "‘पठितवान्’ इत्यस्मिन् पदे कः प्रत्ययः अस्ति?",
      "अस्मद् शब्दस्य तृतीयाविभक्तौ एकवचने ________ रूपं भवति।",
      "सूर्योदयः इत्यस्मिन् पदे ________ सन्धिः अस्ति।",
      'Define "photosynthesis".',
    ]);
    expect(terms).toEqual(expect.arrayContaining(["पठितवान्", "अस्मद्", "सूर्योदयः", "photosynthesis"]));
  });
});

describe("stray attemptCount", () => {
  it("does not shrink a question that has no sub-parts", async () => {
    const { questionSlotMarks } = await import("./blueprint");
    const sec = { type: "SHORT", count: 3, marksEach: 3 };
    expect(questionSlotMarks(sec, { type: "SHORT", subpartsJson: '{"attemptCount":1,"subparts":[]}' }).marks).toBe(3);
    // a real "answer any 4 of 5" keeps counting
    const parts = Array.from({ length: 5 }, (_, i) => ({ label: `(${i + 1})`, text: "x", marks: 1 }));
    expect(
      questionSlotMarks({ type: "VERY_SHORT", count: 1, marksEach: 4 }, { type: "VERY_SHORT", subpartsJson: JSON.stringify({ attemptCount: 4, subparts: parts }) }).marks,
    ).toBe(4);
  });
});

describe("combined match question across chapters", () => {
  it("is not reported as a chapter excess when another chapter is short by the same marks", async () => {
    const { diagnosePaperImplications, paperStatus } = await import("./blueprint");
    const bp = {
      sections: [
        { id: "m", title: "Match", type: "MATCH_COLUMN", count: 6, marksEach: 1 },
        { id: "v", title: "Short", type: "VERY_SHORT", count: 4, marksEach: 1 },
      ],
      chapters: [
        { chapterId: "a", marks: 5, title: "A" },
        { chapterId: "b", marks: 5, title: "B" },
      ],
    };
    const items = [
      { id: "1", sectionId: "m", chapterId: "a", type: "MATCH_COLUMN", marks: 6, subpartsCount: 6 },
      { id: "2", sectionId: "v", chapterId: "a", marks: 1 },
      { id: "3", sectionId: "v", chapterId: "b", marks: 1 },
      { id: "4", sectionId: "v", chapterId: "b", marks: 1 },
      { id: "5", sectionId: "v", chapterId: "b", marks: 1 },
    ];
    // chapter a holds 7 marks against a quota of 5, chapter b 3 against 5: the match question overflows into b
    const found = diagnosePaperImplications(bp, items);
    expect(found.filter((f) => f.code === "CHAPTER_EXCESS")).toHaveLength(0);
    const status = paperStatus(bp, items.map((i) => ({ sectionId: i.sectionId, chapterId: i.chapterId, marks: i.marks, subpartsCount: i.subpartsCount })));
    expect(status.chapters.every((c) => c.used === c.target)).toBe(true);
  });
});

describe("section roles", () => {
  it("keeps Grammar sections on grammar rows and Literature sections on lessons", () => {
    const paper: PaperAutogenInput = {
      id: "e",
      title: "English IX",
      blueprint: {
        book: { className: "Class 9", subject: "English", title: "English" },
        sections: [
          { id: "g", title: "Grammar", type: "FILL_BLANK", count: 5, marksEach: 1, role: "GRAMMAR" },
          { id: "l", title: "Literature", type: "MCQ", count: 5, marksEach: 1, role: "LITERATURE" },
        ],
        chapters: [
          ch("a", 1, "Beehive: The Fun They Had", 3),
          ch("b", 2, "Moments: The Lost Child", 2),
          ch("c", 3, "Section C: Grammar", 5),
        ],
      },
      items: [],
    };
    const plan = planPaperSlotAssignments(paper);
    expect(plan.sections.find((s) => s.sectionId === "g")!.slots.every((sl) => sl.chapterId === "c")).toBe(true);
    expect(plan.sections.find((s) => s.sectionId === "l")!.slots.every((sl) => sl.chapterId !== "c")).toBe(true);
  });
});

describe("rows that hold more than one kind of question", () => {
  it("lets note-making sit on a 'Reading (unseen passage 10 + note-making 4)' row", async () => {
    const { chapterRoles } = await import("./paperAutogen");
    expect(chapterRoles("Section A: Reading (unseen passage 10 + note-making 4)", "English")).toEqual(["PASSAGE", "WRITING"]);
    const paper: PaperAutogenInput = {
      id: "x",
      title: "English XII",
      blueprint: {
        book: { className: "Class 12", subject: "English", title: "English" },
        sections: [
          { id: "p", title: "Passage", type: "UNSEEN_PASSAGE", count: 1, marksEach: 10, role: "PASSAGE" },
          { id: "n", title: "Note making", type: "LONG", count: 1, marksEach: 4, role: "WRITING" },
          { id: "w", title: "Writing", type: "LONG", count: 3, marksEach: 4, role: "WRITING" },
        ],
        chapters: [ch("r", 1, "Section A: Reading (unseen passage 10 + note-making 4)", 14), ch("w", 2, "Section B: Writing", 12)],
      },
      items: [],
    };
    const plan = planPaperSlotAssignments(paper);
    expect(plan.sections.find((s) => s.sectionId === "p")!.slots[0].chapterId).toBe("r");
    const used = new Map<string, number>();
    for (const sec of plan.sections) for (const sl of sec.slots) used.set(sl.chapterId, (used.get(sl.chapterId) ?? 0) + sl.marks);
    expect(used.get("r")).toBe(14);
    expect(used.get("w")).toBe(12);
  });
});
