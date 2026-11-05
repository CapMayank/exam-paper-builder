import { describe, expect, it } from "vitest";
import { autoFillPaper } from "./autofill";
import { blueprintTotalMarks, checkBlueprintFeasibility } from "./blueprint";
import { assignChapters, splitPastedQuestions } from "./pasteQuestions";
import { skillOf, suggestChapter, suggestDifficulty, suggestSkill } from "./questionTagging";
import { distributeSlotMarks, schoolPatternsForLevel, slotMarksOf } from "./schoolPatterns";
import { questionSchema } from "./schemas";

const flat = (level: number) => {
  const [t] = schoolPatternsForLevel(level);
  return { t, sections: t.sections.flatMap((g) => g.questionTypes.map((q) => ({ type: q.type, count: q.count, marksEach: q.marksEach }))) };
};

describe("school blueprint patterns", () => {
  it("Classes 1–4: 24 questions, 50 marks", () => {
    for (const level of [1, 2, 3, 4]) {
      const { t, sections } = flat(level);
      expect(t.totalMarks).toBe(50);
      expect(blueprintTotalMarks(sections)).toBe(50);
      expect(sections.reduce((n, s) => n + s.count, 0)).toBe(24);
      expect(sections.map((s) => [s.type, s.count, s.marksEach])).toEqual([
        ["MCQ", 5, 1],
        ["FILL_BLANK", 5, 1],
        ["VERY_SHORT", 6, 2],
        ["SHORT", 6, 3],
        ["LONG", 2, 5],
      ]);
    }
  });

  it("Classes 5–8: 26 questions, 60 marks", () => {
    for (const level of [5, 6, 7, 8]) {
      const { t, sections } = flat(level);
      expect(t.totalMarks).toBe(60);
      expect(blueprintTotalMarks(sections)).toBe(60);
      expect(sections.reduce((n, s) => n + s.count, 0)).toBe(26);
      expect(sections.at(-1)).toEqual({ type: "LONG", count: 4, marksEach: 5 });
    }
  });

  it("no school pattern for pre-primary or board classes", () => {
    expect(schoolPatternsForLevel(null)).toEqual([]);
    expect(schoolPatternsForLevel(9)).toEqual([]);
    expect(schoolPatternsForLevel(12)).toEqual([]);
  });

  it("chapter marks add up to the paper and each can really be filled with whole questions", () => {
    for (const chapterCount of [3, 8, 15, 30]) {
      const { sections } = flat(6);
      const ids = Array.from({ length: chapterCount }, (_, i) => `c${i}`);
      const marks = distributeSlotMarks(slotMarksOf(sections), ids);
      expect(Object.values(marks).reduce((a, b) => a + b, 0)).toBe(60);

      // fill the paper slot by slot against the quotas: every slot must find a chapter with room
      const left = { ...marks };
      for (const m of slotMarksOf(sections).sort((a, b) => b - a)) {
        const id = ids.find((c) => left[c] >= m && (left[c] - m === 0 || left[c] - m >= 1));
        expect(id, `${chapterCount} chapters: no chapter for a ${m}-mark question`).toBeDefined();
        left[id!] -= m;
      }
    }
  });

  it("an even split would have failed for 5-mark questions (the reason for slot-based quotas)", () => {
    const even = Math.floor(60 / 15);
    expect(even).toBeLessThan(5);
    const marks = distributeSlotMarks(slotMarksOf(flat(6).sections), Array.from({ length: 15 }, (_, i) => `c${i}`));
    expect(Object.values(marks).filter((m) => m >= 5).length).toBeGreaterThanOrEqual(4);
  });

  it("auto-fill completes a paper on the distributed quotas, and the feasibility check passes", () => {
    for (const level of [3, 7]) {
      const { sections } = flat(level);
      const ids = ["a", "b", "c", "d", "e", "f", "g"];
      const marks = distributeSlotMarks(slotMarksOf(sections), ids);
      const bp = {
        sections: sections.map((sec, i) => ({ id: `s${i}`, title: `S${i}`, ...sec })),
        chapters: ids.map((id) => ({ chapterId: id, marks: marks[id] })),
      };
      expect(checkBlueprintFeasibility({ ...bp, enforceMarksConservation: true })).toEqual([]);
      // a bank with plenty of questions of every type in every chapter
      const pool = bp.sections.flatMap((sec) => ids.flatMap((ch) => Array.from({ length: 6 }, (_, k) => ({ id: `${sec.type}-${ch}-${k}`, chapterId: ch, type: sec.type }))));
      const res = autoFillPaper(bp, [], pool);
      expect(res.unfilled).toEqual([]);
      expect(res.complete).toBe(true);
    }
  });
});

const chapters = [
  { id: "c1", number: 1, title: "Food: Where Does It Come From?" },
  { id: "c2", number: 2, title: "Components of Food" },
  { id: "c3", number: 3, title: "Plants and Photosynthesis" },
  { id: "c4", number: 4, title: "[EVS Book] Our Water Resources" },
];

describe("filling in chapter, difficulty and skill", () => {
  it("picks the chapter whose title shares words with the question", () => {
    expect(suggestChapter("Explain photosynthesis in green plants.", chapters)).toEqual({ chapterId: "c3", reason: "title" });
    expect(suggestChapter("Name two components of a balanced food.", chapters)?.chapterId).toBe("c2");
    expect(suggestChapter("Why should we save water?", chapters)?.chapterId).toBe("c4"); // ignores the [part] prefix
  });

  it("weighs rare title words over shared ones and ignores look-alike words", () => {
    const sci = [
      { id: "e1", number: 1, title: "Electricity and Circuits" },
      { id: "e2", number: 2, title: "The Electron and the Atom" },
      { id: "e3", number: 3, title: "Light, Shadows and Reflections" },
    ];
    expect(suggestChapter("What is an electric circuit?", sci)?.chapterId).toBe("e1");
    expect(suggestChapter("Who discovered the electron?", sci)?.chapterId).toBe("e2");
    expect(suggestChapter("Explain the reflection of light from a mirror.", sci)?.chapterId).toBe("e3");
  });

  it("follows a stated chapter number", () => {
    expect(suggestChapter("Ch. 3 – Draw a neat diagram.", chapters)).toEqual({ chapterId: "c3", reason: "title" });
    expect(suggestChapter("अध्याय 2 से प्रश्न", chapters)?.chapterId).toBe("c2");
  });

  it("learns from questions already filed under each chapter", () => {
    const bank = {
      c1: ["Which animals give us milk?", "Name two plant parts we eat."],
      c3: ["What is chlorophyll?", "Why are leaves green? Explain chlorophyll."],
      c4: ["How can we harvest rainwater?", "What is a well?"],
    };
    expect(suggestChapter("Where is chlorophyll found in a leaf?", chapters, undefined, bank)).toEqual({ chapterId: "c3", reason: "bank" });
    expect(suggestChapter("Describe rainwater harvesting at home.", chapters, undefined, bank)?.chapterId).toBe("c4");
    // nothing telling: the quota decides
    expect(suggestChapter("Draw a neat diagram.", chapters, { c1: 2, c2: 7, c3: 0, c4: 5 }, bank)?.reason).toBe("quota");
  });

  it("falls back to the chapter with the most marks left, or nothing", () => {
    expect(suggestChapter("Draw a neat diagram.", chapters, { c1: 2, c2: 7, c3: 0, c4: 5 })).toEqual({ chapterId: "c2", reason: "quota" });
    expect(suggestChapter("Draw a neat diagram.", chapters)).toBeNull();
    expect(suggestChapter("anything", [])).toBeNull();
  });

  it("skill from the asking word, in English and Hindi", () => {
    expect(suggestSkill("Define habitat.", "VERY_SHORT")).toBe("REMEMBERING");
    expect(suggestSkill("Explain how plants make food.", "SHORT")).toBe("UNDERSTANDING");
    expect(suggestSkill("Calculate the area of the rectangle.", "SHORT")).toBe("APPLYING");
    expect(suggestSkill("Justify why forests are important.", "LONG")).toBe("ANALYZING");
    expect(suggestSkill("प्रकाश संश्लेषण को समझाइए।", "SHORT")).toBe("UNDERSTANDING");
    expect(suggestSkill("Paris is the capital of ____.", "FILL_BLANK")).toBe("REMEMBERING");
  });

  it("difficulty from marks and skill", () => {
    expect(suggestDifficulty("Name the largest planet.", "MCQ", 1)).toBe("EASY");
    expect(suggestDifficulty("Explain the water cycle.", "SHORT", 3)).toBe("MEDIUM");
    expect(suggestDifficulty("Describe the parts of a plant.", "LONG", 5)).toBe("HARD");
    expect(suggestDifficulty("Justify your answer.", "VERY_SHORT", 2)).toBe("HARD");
  });

  it("older Bloom levels read as the school's four skills, and the skill saves with a question", () => {
    expect(skillOf("EVALUATING")).toBe("ANALYZING");
    expect(skillOf("APPLYING")).toBe("APPLYING");
    expect(skillOf(null)).toBeNull();
    const parsed = questionSchema.parse({ bookId: "b", chapterId: "c", type: "SHORT", text: "Explain.", cognitiveLevel: "UNDERSTANDING" });
    expect(parsed.cognitiveLevel).toBe("UNDERSTANDING");
    expect(() => questionSchema.parse({ bookId: "b", chapterId: "c", type: "SHORT", text: "x", cognitiveLevel: "GUESSING" })).toThrow();
  });
});

describe("pasting several questions into a section", () => {
  it("numbered questions, with continuation lines", () => {
    expect(splitPastedQuestions("1. Name the process.\n2. What is a habitat?\nGive one example.\n3) Define soil.", false).map((q) => q.text)).toEqual([
      "Name the process.",
      "What is a habitat?\nGive one example.",
      "Define soil.",
    ]);
  });

  it("one per line, or separated by blank lines", () => {
    expect(splitPastedQuestions("Define soil\nName two crops\nWhat is rain?", false)).toHaveLength(3);
    expect(splitPastedQuestions("Define soil and\nits types.\n\nName two crops.", false).map((q) => q.text)).toEqual([
      "Define soil and\nits types.",
      "Name two crops.",
    ]);
  });

  it("MCQs with option lines, inline options and an answer line", () => {
    const qs = splitPastedQuestions(
      "1. Which gas do plants take in?\n(a) Oxygen\n(b) Carbon dioxide\n(c) Nitrogen\n(d) Hydrogen\nAns: (b)\n2. Capital of India is (a) Delhi (b) Agra (c) Pune (d) Goa\nAnswer: a",
      true,
    );
    expect(qs).toEqual([
      { text: "Which gas do plants take in?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], answer: "B" },
      { text: "Capital of India is", options: ["Delhi", "Agra", "Pune", "Goa"], answer: "A" },
    ]);
  });

  it("answer lines are kept for written answers", () => {
    expect(splitPastedQuestions("1. Define soil.\nAns: The top layer of the earth.", false)[0].answer).toBe("The top layer of the earth.");
  });

  it("hands out chapters within the open marks, title match first", () => {
    const got = assignChapters(
      ["Explain photosynthesis.", "Name two food components.", "Draw a cell.", "Draw a leaf.", "Draw a root."],
      chapters,
      { c1: 3, c2: 3, c3: 3, c4: 0 },
      3,
    );
    expect(got).toEqual([
      { chapterId: "c3", reason: "title" },
      { chapterId: "c2", reason: "title" },
      { chapterId: "c1", reason: "quota" },
      null, // all quotas used up
      null,
    ]);
  });
});
