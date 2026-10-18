import { describe, expect, it } from "vitest";
import {
  ChapterResolver,
  exportQuestionsToCsv,
  exportQuestionsToJson,
  normalizeQuestionText,
  parseAndValidateBatch,
  parseCsvRecords,
  parseQuestionCsv,
  parseQuestionJson,
  serializeCsv,
  serializeQuestionsToCsv,
  serializeQuestionsToJson,
} from "./batchQuestionIo";
import {
  calculateSectionOverlap,
  formatSetIdentifier,
  nextSetIdentifier,
  permuteMcqOptions,
  planMultiSetDistribution,
  selectVariantCandidates,
  shuffle,
} from "./multiset";
import type { QuestionDto } from "./dto";

describe("Milestone 3 Suite 1: RFC 4180 CSV Parser & KaTeX Math Ingestion", () => {
  it("parses standard CSV rows containing MCQ and descriptive questions", () => {
    const csv = `type,marks,text,answer,chapterNumber,difficulty,options
MCQ,1,"What is the SI unit of electric current?",B,12,EASY,"Volt|Ampere|Ohm|Watt"
SHORT,2,"State Ohm's Law and write formula $V = IR$.",V = IR,12,MEDIUM,""`;

    const report = parseQuestionCsv(csv, { bookId: "book_1" });
    expect(report.totalRows).toBe(2);
    expect(report.validCount).toBe(2);
    expect(report.errorCount).toBe(0);
    expect(report.items[0].type).toBe("MCQ");
    expect(report.items[0].options).toEqual(["Volt", "Ampere", "Ohm", "Watt"]);
    expect(report.items[0].answer).toBe("B");
    expect(report.items[1].type).toBe("SHORT");
    expect(report.items[1].marks).toBe(2);
  });

  it("handles quoted CSV strings with embedded commas and quotes cleanly", () => {
    const csv = `type,marks,text,answer,chapterNumber,difficulty,options
SHORT,3,"Calculate force, acceleration, and momentum for a 5kg mass.",Formula applies,1,MEDIUM,""
MCQ,1,"He said, ""Newton's Law holds true"". Identify law.",A,1,EASY,"First|Second|Third|Gravitation"`;

    const report = parseQuestionCsv(csv, { bookId: "book_1" });
    expect(report.validCount).toBe(2);
    expect(report.items[0].text).toBe("Calculate force, acceleration, and momentum for a 5kg mass.");
    expect(report.items[1].text).toContain("Newton's Law holds true");
  });

  it("preserves complex multiline LaTeX display math ($...$ and $$...$$)", () => {
    const csv = `type,marks,text,answer,chapterNumber,difficulty
LONG,5,"Derive the quadratic formula: $$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$. Where $a \\ne 0$.",Proof given,4,HARD`;

    const report = parseQuestionCsv(csv, { bookId: "book_1" });
    expect(report.validCount).toBe(1);
    expect(report.items[0].text).toContain("$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$");
    expect(report.items[0].text).toContain("$a \\ne 0$");
  });

  it("handles multiline records with newlines inside quoted LaTeX equations", () => {
    const csv = `"type","marks","text","answer","chapterNumber","difficulty"
"LONG",5,"Solve system:
$$\\begin{cases}
x + y = 10 \\\\
x - y = 2
\\end{cases}$$
Find x and y.","x=6, y=4",1,"HARD"`;

    const report = parseQuestionCsv(csv, { bookId: "book_1" });
    expect(report.validCount).toBe(1);
    expect(report.items[0].text).toContain("\\begin{cases}");
    expect(report.items[0].text).toContain("x - y = 2");
  });

  it("handles both Windows CRLF (\\r\\n) and Unix LF (\\n) line endings identically", () => {
    const crlfCsv = "type,marks,text,answer,chapterNumber\r\nSHORT,2,Question 1,Ans 1,1\r\nSHORT,2,Question 2,Ans 2,1\r\n";
    const lfCsv = "type,marks,text,answer,chapterNumber\nSHORT,2,Question 1,Ans 1,1\nSHORT,2,Question 2,Ans 2,1\n";

    const reportCrlf = parseQuestionCsv(crlfCsv, { bookId: "book_1" });
    const reportLf = parseQuestionCsv(lfCsv, { bookId: "book_1" });

    expect(reportCrlf.validCount).toBe(2);
    expect(reportLf.validCount).toBe(2);
    expect(reportCrlf.items[0].text).toBe(reportLf.items[0].text);
  });

  it("automatically strips UTF-8 BOM without corrupting first header column", () => {
    const bomCsv = `\uFEFFtype,marks,text,answer,chapterNumber
SHORT,2,Question with BOM,Ans,1`;

    const report = parseQuestionCsv(bomCsv, { bookId: "book_1" });
    expect(report.validCount).toBe(1);
    expect(report.items[0].type).toBe("SHORT");
    expect(report.items[0].text).toBe("Question with BOM");
  });
});

describe("Milestone 3 Suite 2: JSON Import Parser & SubParts Ingestion", () => {
  it("parses valid JSON array with nested options and case study subparts", () => {
    const json = JSON.stringify([
      {
        type: "CASE_STUDY",
        marks: 4,
        text: "Read the case on electromagnetic induction and answer questions:",
        chapterNumber: 13,
        difficulty: "HARD",
        subparts: [
          { label: "(i)", text: "What is induced EMF?", marks: 1 },
          { label: "(ii)", text: "State Faraday's law.", marks: 1 },
          { label: "(iii)", text: "Calculate induced current in 10 ohm coil.", marks: 2 },
        ],
      },
    ]);

    const report = parseQuestionJson(json, { bookId: "book_1" });
    expect(report.validCount).toBe(1);
    expect(report.items[0].type).toBe("CASE_STUDY");
    expect(report.items[0].subparts?.length).toBe(3);
    expect(report.items[0].marks).toBe(4);
  });

  it("rejects non-array JSON root with descriptive error", () => {
    const report = parseQuestionJson('{"single": "question"}', { bookId: "book_1" });
    expect(report.validCount).toBe(0);
    expect(report.errorCount).toBe(1);
    expect(report.errors[0].error).toContain("JSON root must be an array");
  });

  it("handles malformed JSON syntax gracefully", () => {
    const report = parseQuestionJson('{ invalid json', { bookId: "book_1" });
    expect(report.validCount).toBe(0);
    expect(report.errorCount).toBe(1);
    expect(report.errors[0].error).toContain("Invalid JSON syntax");
  });

  it("handles empty array without crashing", () => {
    const report = parseQuestionJson("[]", { bookId: "book_1" });
    expect(report.totalRows).toBe(0);
    expect(report.validCount).toBe(0);
    expect(report.errorCount).toBe(0);
  });
});

describe("Milestone 3 Suite 3: Schema Validation & Row Error Diagnostics", () => {
  it("flags missing text, negative marks, and unknown question type with row numbers", () => {
    const csv = `type,marks,text,answer,chapterNumber
MCQ,0,"Valid text",A,1
UNKNOWN_TYPE,2,"Valid text",Ans,1
SHORT,3,"",Ans,1`;

    const report = parseQuestionCsv(csv, { bookId: "book_1" });
    expect(report.validCount).toBe(0);
    expect(report.errorCount).toBe(3);

    expect(report.errors.some((e) => e.rowNumber === 2 && e.field === "marks")).toBe(true);
    expect(report.errors.some((e) => e.rowNumber === 3 && e.field === "type")).toBe(true);
    expect(report.errors.some((e) => e.rowNumber === 4 && e.field === "text")).toBe(true);
  });

  it("flags MCQ with fewer than 2 options", () => {
    const csv = `type,marks,text,answer,chapterNumber,options
MCQ,1,"Is this valid?",A,1,"Single Option Only"`;

    const report = parseQuestionCsv(csv, { bookId: "book_1" });
    expect(report.validCount).toBe(0);
    expect(report.errors[0].field).toBe("options");
    expect(report.errors[0].error).toContain("at least 2 options");
  });

  it("flags MCQ with more than 6 options", () => {
    const csv = `type,marks,text,answer,chapterNumber,options
MCQ,1,"Too many options",A,1,"O1|O2|O3|O4|O5|O6|O7"`;

    const report = parseQuestionCsv(csv, { bookId: "book_1" });
    expect(report.validCount).toBe(0);
    expect(report.errors[0].field).toBe("options");
    expect(report.errors[0].error).toContain("cannot exceed 6 options");
  });

  it("validates that case study subpart mark sums match total question marks", () => {
    const json = JSON.stringify([
      {
        type: "CASE_STUDY",
        marks: 4,
        text: "Case study text",
        chapterNumber: 1,
        subparts: [
          { label: "(i)", text: "Part A", marks: 1 },
          { label: "(ii)", text: "Part B", marks: 1 },
        ],
      },
    ]);

    const report = parseQuestionJson(json, { bookId: "book_1" });
    expect(report.errorCount).toBe(1);
    expect(report.errors[0].field).toBe("subparts");
    expect(report.errors[0].error).toContain("Subparts total marks (2) does not match question marks (4)");
  });

  it("validates difficulty values and accepts common aliases", () => {
    const csv = `type,marks,text,answer,chapterNumber,difficulty
SHORT,2,"Question 1",Ans,1,EASY
SHORT,2,"Question 2",Ans,1,MEDIUM
SHORT,2,"Question 3",Ans,1,HARD
SHORT,2,"Question 4",Ans,1,EXTREME`;

    const report = parseQuestionCsv(csv, { bookId: "book_1" });
    expect(report.validCount).toBe(3);
    expect(report.errorCount).toBe(1);
    expect(report.errors[0].rowNumber).toBe(5);
    expect(report.errors[0].field).toBe("difficulty");
  });
});

describe("Milestone 3 Suite 4: Chapter Mapping & Deduplication", () => {
  const chapters = [
    { id: "ch_1", number: 1, title: "Chemical Reactions and Equations" },
    { id: "ch_2", number: 2, title: "Acids, Bases and Salts" },
  ];

  it("maps chapter by chapterNumber or chapterTitle", () => {
    const csv = `type,marks,text,answer,chapterNumber
SHORT,2,"Define oxidation.",Ans,1
SHORT,2,"Define neutralization.",Ans,2`;

    const report = parseQuestionCsv(csv, { bookId: "book_1", chapters });
    expect(report.validCount).toBe(2);
    expect(report.items[0].chapterId).toBe("ch_1");
    expect(report.items[1].chapterId).toBe("ch_2");
  });

  it("maps chapter by exact chapterTitle case-insensitively", () => {
    const csv = `type,marks,text,answer,chapterTitle
SHORT,2,"Define oxidation.",Ans,"Chemical Reactions and Equations"
SHORT,2,"Define pH.",Ans,"acids, bases and salts"`;

    const report = parseQuestionCsv(csv, { bookId: "book_1", chapters });
    expect(report.validCount).toBe(2);
    expect(report.items[0].chapterId).toBe("ch_1");
    expect(report.items[1].chapterId).toBe("ch_2");
  });

  it("falls back to default chapter when row specifies no chapter", () => {
    const csv = `type,marks,text,answer
SHORT,2,"Define catalyst.",Ans`;

    const report = parseQuestionCsv(csv, { bookId: "book_1", chapterId: "ch_2", chapters });
    expect(report.validCount).toBe(1);
    expect(report.items[0].chapterId).toBe("ch_2");
  });

  it("detects and skips duplicate questions when skipDuplicates is enabled", () => {
    const csv = `type,marks,text,answer,chapterNumber
SHORT,2,"State Boyle's Law.",Ans,1
SHORT,2,"  State Boyle's Law.  ",Ans,1`;

    const report = parseQuestionCsv(csv, { bookId: "book_1", chapters, skipDuplicates: true });
    expect(report.totalRows).toBe(2);
    expect(report.validCount).toBe(1);
    expect(report.duplicateCount).toBe(1);
  });

  it("detects duplicates against existing database questions", () => {
    const existing = [
      { id: "q_old_1", chapterId: "ch_1", text: "What is photosynthesis?" },
    ];

    const csv = `type,marks,text,answer,chapterNumber
SHORT,2,"What is photosynthesis?",Ans,1`;

    // skipDuplicates: false => error
    const reportError = parseQuestionCsv(csv, { bookId: "book_1", chapters, existingQuestions: existing, skipDuplicates: false });
    expect(reportError.validCount).toBe(0);
    expect(reportError.errorCount).toBe(1);
    expect(reportError.errors[0].field).toBe("text");
    expect(reportError.errors[0].error).toContain("already exists in this chapter");

    // skipDuplicates: true => skip
    const reportSkip = parseQuestionCsv(csv, { bookId: "book_1", chapters, existingQuestions: existing, skipDuplicates: true });
    expect(reportSkip.validCount).toBe(0);
    expect(reportSkip.duplicateCount).toBe(1);
  });

  it("normalizes LaTeX formatting wrappers in text normalization", () => {
    const t1 = normalizeQuestionText("What is $\\text{LCM}(a, b)$?");
    const t2 = normalizeQuestionText("What is $\\mathrm{LCM}(a, b)$?");
    expect(t1).toBe("what is $lcm(a, b)$?");
    expect(t2).toBe("what is $lcm(a, b)$?");
  });
});

describe("Milestone 3 Suite 5: CSV and JSON Export Round-Trip", () => {
  const dummyQuestions: QuestionDto[] = [
    {
      id: "q_1",
      bookId: "b_1",
      chapterId: "ch_1",
      type: "MCQ",
      text: "What is the speed of light in vacuum?",
      options: ["3 x 10^8 m/s", "2 x 10^8 m/s", "1.5 x 10^8 m/s", "Zero"],
      answer: "A",
      difficulty: "EASY",
      imagePath: null,
      spaceMm: 0,
      showGrid: false,
      createdAt: new Date().toISOString(),
      chapter: { id: "ch_1", number: 10, title: "Light" },
      subparts: [],
    },
    {
      id: "q_2",
      bookId: "b_1",
      chapterId: "ch_1",
      type: "SHORT",
      text: "Define refractive index with formula $n = c/v$.",
      options: [],
      answer: "n = c/v",
      difficulty: "MEDIUM",
      imagePath: null,
      spaceMm: 25,
      showGrid: false,
      createdAt: new Date().toISOString(),
      chapter: { id: "ch_1", number: 10, title: "Light" },
      subparts: [],
    },
  ];

  it("exports questions to CSV with UTF-8 BOM and correct headers", () => {
    const csv = exportQuestionsToCsv(dummyQuestions, "Physics Class 10");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Chapter Number");
    expect(csv).toContain("Question Text");
    expect(csv).toContain("What is the speed of light in vacuum?");
    expect(csv).toContain("Define refractive index with formula $n = c/v$.");
  });

  it("round-trips exported CSV back into parser", () => {
    const csv = serializeQuestionsToCsv(dummyQuestions);
    const chapters = [{ id: "ch_1", number: 10, title: "Light" }];
    const report = parseQuestionCsv(csv, { bookId: "b_1", chapters });
    expect(report.validCount).toBe(2);
    expect(report.items[0].type).toBe("MCQ");
    expect(report.items[0].options[0]).toBe("3 x 10^8 m/s");
    expect(report.items[1].type).toBe("SHORT");
  });

  it("exports questions to structured JSON and round-trips back", () => {
    const jsonStr = exportQuestionsToJson(dummyQuestions, { bookTitle: "Physics", subject: "Science" });
    const parsed = JSON.parse(jsonStr);
    expect(parsed.count).toBe(2);
    expect(parsed.questions.length).toBe(2);

    const chapters = [{ id: "ch_1", number: 10, title: "Light" }];
    const report = parseQuestionJson(jsonStr, { bookId: "b_1", chapters });
    expect(report.validCount).toBe(2);
  });
});

describe("Milestone 3 Suite 6: Controlled Multi-Set Overlap & Candidate Selection", () => {
  it("calculates exact 60% common and 40% variant split for a section", () => {
    const sectionQuestions = Array.from({ length: 10 }, (_, i) => ({
      id: `q_${i + 1}`,
      marks: 1,
      chapterId: "ch_1",
    }));

    const split = calculateSectionOverlap(sectionQuestions, 0.6);
    expect(split.commonIds.length).toBe(6);
    expect(split.variantSlots.length).toBe(4);
    expect(split.commonIds.length + split.variantSlots.length).toBe(10);
    expect(split.commonCount).toBe(6);
    expect(split.variantCount).toBe(4);
  });

  it("calculates 80% common and 20% variant split for 5 questions", () => {
    const split = calculateSectionOverlap(5, 0.8);
    expect(split.commonCount).toBe(4);
    expect(split.variantCount).toBe(1);
  });

  it("handles boundary overlap ratios: 0% (all variant) and 100% (all common)", () => {
    const allCommon = calculateSectionOverlap(8, 1.0);
    expect(allCommon.commonCount).toBe(8);
    expect(allCommon.variantCount).toBe(0);

    const allVariant = calculateSectionOverlap(8, 0.0);
    expect(allVariant.commonCount).toBe(0);
    expect(allVariant.variantCount).toBe(8);
  });

  it("selects replacement candidates from bank matching chapter, marks, and type", () => {
    const targetSlot = { chapterId: "ch_1", marks: 2, type: "SHORT", difficulty: "MEDIUM" };
    const bank = [
      { id: "cand_1", chapterId: "ch_1", marks: 2, type: "SHORT", difficulty: "MEDIUM" },
      { id: "cand_2", chapterId: "ch_2", marks: 2, type: "SHORT", difficulty: "MEDIUM" }, // Wrong chapter
      { id: "cand_3", chapterId: "ch_1", marks: 3, type: "SHORT", difficulty: "MEDIUM" }, // Wrong marks
      { id: "cand_4", chapterId: "ch_1", marks: 2, type: "LONG", difficulty: "MEDIUM" },  // Wrong type
    ];

    const eligible = selectVariantCandidates(targetSlot, bank, ["q_original"]);
    expect(eligible.length).toBe(1);
    expect(eligible[0].id).toBe("cand_1");
  });

  it("plans multi-set distribution preserving 60% overlap and chapter quotas", () => {
    const sections = [
      { id: "sec_a", title: "Section A", type: "MCQ", count: 5, marksEach: 1 },
      { id: "sec_b", title: "Section B", type: "SHORT", count: 5, marksEach: 2 },
    ];

    const sourceItems = [
      // 5 MCQs in Sec A (3 from Ch 1, 2 from Ch 2)
      { id: "it_1", sectionId: "sec_a", position: 1, questionId: "q_1", question: { id: "q_1", chapterId: "ch_1", type: "MCQ", difficulty: "EASY" } },
      { id: "it_2", sectionId: "sec_a", position: 2, questionId: "q_2", question: { id: "q_2", chapterId: "ch_1", type: "MCQ", difficulty: "EASY" } },
      { id: "it_3", sectionId: "sec_a", position: 3, questionId: "q_3", question: { id: "q_3", chapterId: "ch_1", type: "MCQ", difficulty: "MEDIUM" } },
      { id: "it_4", sectionId: "sec_a", position: 4, questionId: "q_4", question: { id: "q_4", chapterId: "ch_2", type: "MCQ", difficulty: "MEDIUM" } },
      { id: "it_5", sectionId: "sec_a", position: 5, questionId: "q_5", question: { id: "q_5", chapterId: "ch_2", type: "MCQ", difficulty: "HARD" } },
      // 5 Short in Sec B
      { id: "it_6", sectionId: "sec_b", position: 1, questionId: "q_6", question: { id: "q_6", chapterId: "ch_1", type: "SHORT", difficulty: "MEDIUM" } },
      { id: "it_7", sectionId: "sec_b", position: 2, questionId: "q_7", question: { id: "q_7", chapterId: "ch_1", type: "SHORT", difficulty: "MEDIUM" } },
      { id: "it_8", sectionId: "sec_b", position: 3, questionId: "q_8", question: { id: "q_8", chapterId: "ch_1", type: "SHORT", difficulty: "HARD" } },
      { id: "it_9", sectionId: "sec_b", position: 4, questionId: "q_9", question: { id: "q_9", chapterId: "ch_2", type: "SHORT", difficulty: "EASY" } },
      { id: "it_10", sectionId: "sec_b", position: 5, questionId: "q_10", question: { id: "q_10", chapterId: "ch_2", type: "SHORT", difficulty: "MEDIUM" } },
    ];

    // Bank with candidates
    const candidatePool = [
      // Variants for Set 2
      { id: "cand_mcq_1", chapterId: "ch_1", type: "MCQ", difficulty: "EASY", marks: 1 },
      { id: "cand_mcq_2", chapterId: "ch_1", type: "MCQ", difficulty: "MEDIUM", marks: 1 },
      { id: "cand_short_1", chapterId: "ch_1", type: "SHORT", difficulty: "MEDIUM", marks: 2 },
      { id: "cand_short_2", chapterId: "ch_1", type: "SHORT", difficulty: "HARD", marks: 2 },
      // Variants for Set 3
      { id: "cand_mcq_3", chapterId: "ch_1", type: "MCQ", difficulty: "EASY", marks: 1 },
      { id: "cand_mcq_4", chapterId: "ch_1", type: "MCQ", difficulty: "MEDIUM", marks: 1 },
      { id: "cand_short_3", chapterId: "ch_1", type: "SHORT", difficulty: "MEDIUM", marks: 2 },
      { id: "cand_short_4", chapterId: "ch_1", type: "SHORT", difficulty: "HARD", marks: 2 },
    ];

    const result = planMultiSetDistribution({
      sections,
      sourceItems,
      candidatePool,
      targetSets: ["SET B", "SET C"],
      commonRatio: 0.6,
      shufflePositions: false,
    });

    expect(result.plans.length).toBe(2);

    for (const plan of result.plans) {
      expect(plan.totalQuestions).toBe(10);
      // In 5-question section, 60% = 3 common, 2 variant. Across 2 sections: 6 common, 4 variant.
      expect(plan.commonCount).toBe(6);
      expect(plan.variantCount).toBe(4);
      expect(plan.overlapPercentage).toBe(60);
    }

    // Verify variants between Set B and Set C are mutually exclusive
    const setBVariants = result.plans[0].items.filter((i) => i.isVariant).map((i) => i.questionId);
    const setCVariants = result.plans[1].items.filter((i) => i.isVariant).map((i) => i.questionId);

    for (const vId of setBVariants) {
      expect(setCVariants).not.toContain(vId);
    }
  });

  it("gracefully falls back to Set 1 question when candidate bank is exhausted", () => {
    const sections = [{ id: "sec_a", title: "Section A", type: "MCQ", count: 5, marksEach: 1 }];
    const sourceItems = Array.from({ length: 5 }, (_, i) => ({
      id: `it_${i + 1}`,
      sectionId: "sec_a",
      position: i + 1,
      questionId: `q_${i + 1}`,
      question: { id: `q_${i + 1}`, chapterId: "ch_rare", type: "MCQ", difficulty: "HARD" },
    }));

    // Empty candidate pool
    const result = planMultiSetDistribution({
      sections,
      sourceItems,
      candidatePool: [],
      targetSets: ["SET B"],
      commonRatio: 0.6,
      shufflePositions: false,
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("insufficient questions in bank");
    // All items preserved due to fallback
    expect(result.plans[0].commonCount).toBe(5);
  });
});

describe("Milestone 3 Suite 7: MCQ Option Permutation & Answer Key Sync", () => {
  it("scrambles MCQ options and accurately updates the correct answer index", () => {
    const originalOptions = ["Volt", "Ampere", "Ohm", "Watt"];
    const originalAnswer = "B"; // Value is "Ampere"

    let permutedCount = 0;
    for (let i = 0; i < 25; i++) {
      const res = permuteMcqOptions(originalOptions, originalAnswer);
      expect(res.options.length).toBe(4);
      expect(res.options.slice().sort()).toEqual(originalOptions.slice().sort());

      // Verify answer key points to "Ampere" in the new options list
      const answerIndex = "ABCD".indexOf(res.answer);
      expect(answerIndex).toBeGreaterThanOrEqual(0);
      expect(res.options[answerIndex]).toBe("Ampere");

      if (res.answer !== "B") permutedCount++;
    }
    expect(permutedCount).toBeGreaterThan(0);
  });

  it("handles answer specified as option text instead of letter", () => {
    const options = ["Mercury", "Venus", "Earth", "Mars"];
    const res = permuteMcqOptions(options, "Earth");
    const answerIdx = "ABCD".indexOf(res.answer);
    expect(answerIdx).toBeGreaterThanOrEqual(0);
    expect(res.options[answerIdx]).toBe("Earth");
  });

  it("handles answer specified as 1-based numeric string", () => {
    const options = ["Alpha", "Beta", "Gamma", "Delta"];
    const res = permuteMcqOptions(options, "3"); // Gamma
    const answerIdx = "ABCD".indexOf(res.answer);
    expect(answerIdx).toBeGreaterThanOrEqual(0);
    expect(res.options[answerIdx]).toBe("Gamma");
  });

  it("handles formatting and suggestion of set identifiers", () => {
    expect(formatSetIdentifier("b")).toBe("SET B");
    expect(formatSetIdentifier("SET 2")).toBe("SET 2");
    expect(formatSetIdentifier("3")).toBe("SET 3");

    expect(nextSetIdentifier("SET A")).toBe("SET B");
    expect(nextSetIdentifier("SET B")).toBe("SET C");
    expect(nextSetIdentifier("SET 1")).toBe("SET 2");
    expect(nextSetIdentifier("1")).toBe("2");
  });
});

describe("Milestone 3 Suite 8: Alternate (OR) Choice Parity Preservation", () => {
  it("preserves chapter parity on variant OR choices during multi-set planning", () => {
    const sections = [{ id: "sec_a", title: "Section A", type: "SHORT", count: 2, marksEach: 2 }];
    const sourceItems = [
      {
        id: "it_1",
        sectionId: "sec_a",
        position: 1,
        questionId: "q_1",
        orQuestionId: "q_1_or",
        question: { id: "q_1", chapterId: "ch_chem", type: "SHORT", difficulty: "MEDIUM" },
        orQuestion: { id: "q_1_or", chapterId: "ch_chem", type: "SHORT", difficulty: "MEDIUM" },
      },
      {
        id: "it_2",
        sectionId: "sec_a",
        position: 2,
        questionId: "q_2",
        orQuestionId: null,
        question: { id: "q_2", chapterId: "ch_chem", type: "SHORT", difficulty: "EASY" },
        orQuestion: null,
      },
    ];

    const candidatePool = [
      { id: "cand_prim", chapterId: "ch_chem", type: "SHORT", difficulty: "MEDIUM", marks: 2 },
      { id: "cand_or", chapterId: "ch_chem", type: "SHORT", difficulty: "MEDIUM", marks: 2 },
    ];

    const result = planMultiSetDistribution({
      sections,
      sourceItems,
      candidatePool,
      targetSets: ["SET B"],
      commonRatio: 0.5,
      shufflePositions: false,
    });

    const plannedSet = result.plans[0];
    const itemWithOr = plannedSet.items.find((i) => i.isVariant);
    expect(itemWithOr).toBeDefined();
    expect(itemWithOr!.questionId).toBe("cand_prim");
    expect(itemWithOr!.orQuestionId).toBe("cand_or");
  });
});
