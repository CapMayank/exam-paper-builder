import { describe, expect, it } from "vitest";
import { resolveInternalChoiceRequirement } from "@/lib/internalChoiceRules";

describe("Unseen passage internal choice", () => {
  const base = {
    board: "CBSE",
    className: "Class 10",
    subject: "English",
    academicSession: "2026-27",
    questionType: "UNSEEN_PASSAGE",
    marksEach: 5,
  } as const;

  it("never requires an OR alternative for a 5-mark CBSE passage slot", () => {
    const req = resolveInternalChoiceRequirement({ ...base });
    expect(req.required).toBe(false);
    expect(req.forbidden).toBe(true);
  });

  it("still requires OR for a 5-mark CBSE long answer", () => {
    const req = resolveInternalChoiceRequirement({ ...base, questionType: "LONG" });
    expect(req.required).toBe(true);
  });

  it("allows an explicit blueprint override to enable choice", () => {
    const req = resolveInternalChoiceRequirement({ ...base, orChoiceMode: "REQUIRED" });
    expect(req.required).toBe(true);
  });
});

import { buildAndValidateGenerationContract } from "@/lib/curriculumContract";
import { validateGeneratedQuestion } from "@/lib/questionValidator";

describe("Unseen passage length validation", () => {
  const contract = buildAndValidateGenerationContract({
    board: "CBSE",
    className: "Class 10",
    subject: "English",
    academicSession: "2026-27",
    questionType: "UNSEEN_PASSAGE",
    marksEach: 5,
    requiredCount: 1,
    slots: [{ slotIndex: 0, chapterTitle: "Reading Comprehension", marks: 5 }],
  }).contract!;

  const withPassage = (words: number) => ({
    type: "UNSEEN_PASSAGE",
    text: `Read the passage. ${Array.from({ length: words }, () => "reading").join(" ")}`,
    options: [],
    answer: "(i) a (ii) b (iii) c (iv) d (v) e",
    marks: 5,
    subparts: [1, 2, 3, 4, 5].map((n) => ({ label: `(${n})`, text: `Question ${n}?`, marks: 1, answer: "a" })),
  });
  const lengthIssues = (words: number) =>
    validateGeneratedQuestion(withPassage(words) as never, contract, { slotIndex: 0, strictPassage: true }).issues.filter((i) =>
      /unseen passage has only/.test(i.message),
    );

  it("counts words, not the letter 's' (a 120-word passage with no 's' passes)", () => {
    expect(lengthIssues(120)).toHaveLength(0);
  });

  it("still rejects a stub passage", () => {
    expect(lengthIssues(30)).toHaveLength(1);
  });
});

import { devanagariShare, MIN_DEVANAGARI_SHARE } from "@/lib/questionValidator";

describe("Hindi language check", () => {
  it("does not accept English text just because it quotes a Hindi chapter title", () => {
    expect(devanagariShare('Identify the primary literary theme and purpose highlighted in "पद" (सूरदास).')).toBeLessThan(MIN_DEVANAGARI_SHARE);
  });

  it("accepts Hindi text with a few English terms or math", () => {
    expect(devanagariShare("बहुपद $p(x) = x^2 - 5x + 6$ के शून्यक ज्ञात कीजिए। (Polynomial)")).toBeGreaterThanOrEqual(MIN_DEVANAGARI_SHARE);
  });
});

import { timetableEntrySchema } from "@/lib/schemas";

describe("Timetable entry validation", () => {
  const base = { title: "Maths", className: "Class 10", subject: "Mathematics", examDate: "2026-03-10", startTime: "09:00", endTime: "12:00" };

  it("accepts a real date and times", () => {
    expect(timetableEntrySchema.safeParse(base).success).toBe(true);
  });

  it("rejects impossible dates and times", () => {
    expect(timetableEntrySchema.safeParse({ ...base, examDate: "2026-13-45" }).success).toBe(false);
    expect(timetableEntrySchema.safeParse({ ...base, examDate: "2026-02-30" }).success).toBe(false);
    expect(timetableEntrySchema.safeParse({ ...base, startTime: "99:99" }).success).toBe(false);
  });
});

import { parseBlueprintImport } from "@/lib/blueprintImport";

describe("Blueprint import tolerance", () => {
  it("does not count a 'Section,Type,Count,Marks' header row as a section", () => {
    const r = parseBlueprintImport("Section,Type,Count,Marks\nA,MCQ,5,1\nB,SHORT,3,3");
    expect(r.blueprint.sections).toHaveLength(2);
    expect(r.totalSectionMarks).toBe(14);
  });

  it("warns when a count or marks value had to be corrected", () => {
    const r = parseBlueprintImport(JSON.stringify({ name: "X", sections: [{ title: "A", type: "MCQ", count: -3, marksEach: 0 }] }));
    expect(r.warnings.join(" ")).toMatch(/count "-3"/);
    expect(r.warnings.join(" ")).toMatch(/marks per question "0"/);
  });

  it("stays quiet for valid values", () => {
    const r = parseBlueprintImport("Section,Type,Count,Marks\nA,MCQ,5,1");
    expect(r.warnings).toHaveLength(0);
  });
});

import { canonicalMcqAnswer } from "@/lib/constants";

describe("canonicalMcqAnswer", () => {
  const opts = ["Hydrogen", "Oxygen", "Chlorine", "Nitrogen"];

  it("turns option text into its letter", () => {
    expect(canonicalMcqAnswer("Chlorine", opts)).toBe("C");
    expect(canonicalMcqAnswer("  oxygen ", opts)).toBe("B");
  });

  it("keeps letters and reads numbers as positions", () => {
    expect(canonicalMcqAnswer("d", opts)).toBe("D");
    expect(canonicalMcqAnswer("(b)", opts)).toBe("B");
    expect(canonicalMcqAnswer("2", opts)).toBe("B");
  });

  it("prefers an exact option-text match over reading a digit as a position", () => {
    expect(canonicalMcqAnswer("3", ["10", "3", "7", "9"])).toBe("B");
  });

  it("leaves an answer that matches nothing unchanged", () => {
    expect(canonicalMcqAnswer("All of the above", opts)).toBe("All of the above");
    expect(canonicalMcqAnswer("", opts)).toBe("");
  });
});

import { validateReactionEquation } from "@/lib/questionValidator";

describe("Reaction balance check ignores mark annotations", () => {
  it("accepts a balanced reaction followed by '(1 Mark)'", () => {
    const r = validateReactionEquation(String.raw`2Cu(s) + O_2(g) \xrightarrow{\Delta} 2CuO(s) (1 Mark)`);
    expect(r?.isBalanced).toBe(true);
  });

  it("handles [2 marks] and (3M) the same way", () => {
    expect(validateReactionEquation("2H_2 + O_2 -> 2H_2O [2 marks]")?.isBalanced).toBe(true);
    expect(validateReactionEquation("2H_2 + O_2 -> 2H_2O (3M)")?.isBalanced).toBe(true);
  });

  it("still flags a genuinely unbalanced reaction", () => {
    expect(validateReactionEquation("H_2 + O_2 -> H_2O (1 Mark)")?.isBalanced).toBe(false);
  });
});

import { auditPaperEvidenceBased } from "@/lib/evidenceAuditEngine";

describe("Audit: letter answers on MCQs", () => {
  const mcq = (answer: string) => ({
    id: "q1",
    number: 1,
    sectionTitle: "Section A",
    type: "MCQ",
    text: "Which gas do plants absorb during photosynthesis?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    answer,
    marks: 1,
    difficulty: "EASY",
  });
  const run = (answer: string) =>
    auditPaperEvidenceBased({ paperTitle: "t", className: "Class 10", subject: "Science", totalMarks: 1, questions: [mcq(answer)] });
  const missing = (r: Awaited<ReturnType<typeof run>>) => r.findings.filter((f) => /not present in the options/.test(f.issue));

  it("does not flag a valid letter answer", async () => {
    expect(missing(await run("B"))).toHaveLength(0);
    expect(missing(await run("(d)"))).toHaveLength(0);
  });

  it("still flags a letter that points past the last option", async () => {
    expect(missing(await run("E"))).toHaveLength(1);
  });

  it("still flags text that matches no option", async () => {
    expect(missing(await run("Helium"))).toHaveLength(1);
  });
});

import { shuffleMcqOptionsIfSafe } from "@/lib/multiset";

describe("shuffleMcqOptionsIfSafe", () => {
  const correctText = (opts: string[], letter: string) => opts["ABCDEF".indexOf(letter)];

  it("keeps the correct option correct after shuffling, and uses every position over many runs", () => {
    const opts = ["Hydrogen", "Oxygen", "Chlorine", "Nitrogen"];
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const r = shuffleMcqOptionsIfSafe(opts, "A");
      expect(correctText(r.options, r.answer)).toBe("Hydrogen");
      expect([...r.options].sort()).toEqual([...opts].sort());
      seen.add(r.answer);
    }
    expect(seen.size).toBe(4);
  });

  it("does not shuffle options that depend on their position", () => {
    const opts = ["Carbon", "Silicon", "Both (a) and (b)", "All of the above"];
    expect(shuffleMcqOptionsIfSafe(opts, "D")).toEqual({ options: opts, answer: "D" });
    const hindi = ["लक्ष्मण", "राम", "उपरोक्त सभी", "कोई नहीं"];
    expect(shuffleMcqOptionsIfSafe(hindi, "A").options).toEqual(hindi);
  });

  it("leaves an unresolvable answer alone", () => {
    const opts = ["a1", "b2", "c3", "d4"];
    expect(shuffleMcqOptionsIfSafe(opts, "Z9")).toEqual({ options: opts, answer: "Z9" });
  });
});

import { verifyQuestionAcademicQuality } from "@/lib/questionVerificationEngine";

describe("Quality check: letter answers on MCQs", () => {
  const contract = buildAndValidateGenerationContract({
    board: "CBSE",
    className: "Class 10",
    subject: "Science",
    academicSession: "2026-27",
    questionType: "MCQ",
    marksEach: 1,
    requiredCount: 1,
    slots: [{ slotIndex: 0, chapterTitle: "Chemical Reactions and Equations", marks: 1 }],
  }).contract!;
  const mcq = (answer: string) => ({
    type: "MCQ",
    text: "Which gas is released when zinc reacts with dilute hydrochloric acid?",
    options: ["Hydrogen", "Oxygen", "Chlorine", "Nitrogen"],
    answer,
    marks: 1,
  });
  const notInOptions = (answer: string) =>
    verifyQuestionAcademicQuality(mcq(answer) as never, contract, { slotIndex: 0 }).allIssues.filter((i) => i.code === "ANSWER_NOT_IN_OPTIONS");

  it("accepts a letter that points at an option", () => {
    expect(notInOptions("B")).toHaveLength(0);
    expect(notInOptions("(c)")).toHaveLength(0);
  });

  it("still accepts the option text", () => {
    expect(notInOptions("Hydrogen")).toHaveLength(0);
  });

  it("rejects a letter past the last option and text that matches nothing", () => {
    expect(notInOptions("E")).toHaveLength(1);
    expect(notInOptions("Helium")).toHaveLength(1);
  });
});
