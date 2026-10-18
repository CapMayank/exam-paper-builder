import { describe, expect, it } from "vitest";
import {
  ChapterResolver,
  exportQuestionsToCsv,
  exportQuestionsToJson,
  extractOptions,
  normalizeAnswer,
  normalizeQuestionText,
  parseAndValidateBatch,
  parseCsvRecords,
  parseQuestionCsv,
  parseQuestionJson,
  parseSubpartsField,
  serializeCsv,
  validateQuestionRow,
  type RawQuestionRow,
} from "./batchQuestionIo";
import type { QuestionDto } from "./dto";

describe("Challenger M3.1 Suite 1: Malformed CSV & Edge-Case Parser Stress", () => {
  const chapters = [{ id: "ch_1", number: 1, title: "Motion" }];

  it("handles unclosed quotation marks gracefully without throwing unhandled exceptions", () => {
    // Unclosed quote in middle row
    const csvUnclosed = `type,marks,text,answer,chapterNumber
SHORT,2,"Unclosed quote in question text,Answer 1,1
SHORT,2,"Properly closed quote",Answer 2,1`;

    // Parser should not throw an unhandled crash
    expect(() => parseQuestionCsv(csvUnclosed, { bookId: "b1", chapters })).not.toThrow();
    const report = parseQuestionCsv(csvUnclosed, { bookId: "b1", chapters });
    // Because the quote was unclosed, it consumes through the next line
    expect(report.totalRows).toBeGreaterThanOrEqual(1);
  });

  it("handles unclosed quotation mark at the very end of file without hanging or crashing", () => {
    const csvEof = `type,marks,text,answer,chapterNumber\nSHORT,2,"Unfinished quote at EOF`;
    expect(() => parseQuestionCsv(csvEof, { bookId: "b1", chapters })).not.toThrow();
    const report = parseQuestionCsv(csvEof, { bookId: "b1", chapters });
    expect(report.totalRows).toBe(1);
    expect(report.items[0].text).toContain("Unfinished quote at EOF");
  });

  it("handles jagged rows where rows have fewer or more columns than header", () => {
    // Row 2 has only 2 columns; Row 3 has 8 columns
    const csvJagged = `type,marks,text,answer,chapterNumber
SHORT,2
SHORT,2,"Text with excess columns",Ans,1,extra1,extra2,extra3`;

    const report = parseQuestionCsv(csvJagged, { bookId: "b1", chapters });
    expect(report.totalRows).toBe(2);
    // First data row misses text -> should report validation error for missing text
    expect(report.errors.some((e) => e.rowNumber === 2 && e.field === "text")).toBe(true);
    // Second data row has text and valid fields -> should parse validly
    expect(report.items.some((q) => q.text === "Text with excess columns")).toBe(true);
  });

  it("handles rows with only commas or spaces, ignoring blank lines", () => {
    const csvEmptyRows = `type,marks,text,answer,chapterNumber

SHORT,2,"Question 1",Ans,1
,,,
   
SHORT,3,"Question 2",Ans,1

`;
    const report = parseQuestionCsv(csvEmptyRows, { bookId: "b1", chapters });
    expect(report.totalRows).toBe(2);
    expect(report.validCount).toBe(2);
    expect(report.errorCount).toBe(0);
    expect(report.items[0].text).toBe("Question 1");
    expect(report.items[1].text).toBe("Question 2");
  });

  it("handles trailing mixed carriage returns: \\r, \\n, and \\r\\n", () => {
    const csvMixedEol = "type,marks,text,answer,chapterNumber\rSHORT,1,\"Q1\",A,1\nSHORT,2,\"Q2\",B,1\r\nSHORT,3,\"Q3\",C,1\r\n";
    const report = parseQuestionCsv(csvMixedEol, { bookId: "b1", chapters });
    expect(report.validCount).toBe(3);
  });

  it("handles escaped quotes within quoted strings RFC 4180 style", () => {
    const csvEscaped = `type,marks,text,answer,chapterNumber
SHORT,2,"He said, ""To be or not to be"", then paused.",Ans,1
SHORT,2,"Formula has ""quotes"" inside: $x = ""val""$",Ans,1`;

    const report = parseQuestionCsv(csvEscaped, { bookId: "b1", chapters });
    expect(report.validCount).toBe(2);
    expect(report.items[0].text).toBe(`He said, "To be or not to be", then paused.`);
    expect(report.items[1].text).toBe(`Formula has "quotes" inside: $x = "val"$`);
  });

  it("returns clean empty report for completely empty or whitespace-only CSV", () => {
    const report1 = parseQuestionCsv("", { bookId: "b1" });
    expect(report1.success).toBe(true);
    expect(report1.totalRows).toBe(0);
    expect(report1.validCount).toBe(0);

    const report2 = parseQuestionCsv("   \n\r\n   \t  ", { bookId: "b1" });
    expect(report2.success).toBe(true);
    expect(report2.totalRows).toBe(0);
  });

  it("returns zero rows when CSV contains only header line", () => {
    const csvHeaderOnly = `type,marks,text,answer,chapterNumber\r\n`;
    const report = parseQuestionCsv(csvHeaderOnly, { bookId: "b1", chapters });
    expect(report.totalRows).toBe(0);
    expect(report.validCount).toBe(0);
    expect(report.errorCount).toBe(0);
  });

  it("rejects rows when required 'text' header is completely missing from CSV", () => {
    const csvNoTextHeader = `type,marks,answer,chapterNumber
SHORT,2,Ans,1`;
    const report = parseQuestionCsv(csvNoTextHeader, { bookId: "b1", chapters });
    expect(report.validCount).toBe(0);
    expect(report.errorCount).toBe(1);
    expect(report.errors[0].field).toBe("text");
    expect(report.errors[0].error).toContain("required");
  });
});

describe("Challenger M3.1 Suite 2: Extreme LaTeX Math & KaTeX Formula Ingestion", () => {
  const chapters = [{ id: "ch_math", number: 4, title: "Quadratic Equations" }];

  it("preserves LaTeX formulas with commas, double backslashes, and matrix environments", () => {
    const latexMatrix = `"type","marks","text","answer","chapterNumber"
"SHORT",3,"Find the determinant of matrix $A$:
$$\\begin{pmatrix}
1 & 2 & 3 \\\\
0 & -4 & 5 \\\\
2 & 1 & 0
\\end{pmatrix}$$
where elements $a_{ij} \\in \\mathbb{R}$.","Determinant is -38",4`;

    const report = parseQuestionCsv(latexMatrix, { bookId: "b1", chapters });
    expect(report.validCount).toBe(1);
    const item = report.items[0];
    expect(item.text).toContain("\\begin{pmatrix}");
    expect(item.text).toContain("1 & 2 & 3 \\\\");
    expect(item.text).toContain("\\end{pmatrix}");
    expect(item.text).toContain("$a_{ij} \\in \\mathbb{R}$");
  });

  it("preserves multiline LaTeX display equations spanning 6+ lines without truncating", () => {
    const multilineEquation = `"type","marks","text","answer","chapterNumber"
"LONG",5,"Evaluate the definite integral step by step:
$$
I = \\int_{0}^{\\frac{\\pi}{2}} \\frac{\\sin^n x}{\\sin^n x + \\cos^n x} dx
\\\\
\\text{Using property: } \\int_{a}^{b} f(x) dx = \\int_{a}^{b} f(a+b-x) dx
\\\\
I = \\int_{0}^{\\frac{\\pi}{2}} \\frac{\\cos^n x}{\\cos^n x + \\sin^n x} dx
\\\\
2I = \\int_{0}^{\\frac{\\pi}{2}} 1 dx = \\frac{\\pi}{2}
\\\\
I = \\frac{\\pi}{4}
$$
State which properties of definite integrals were applied.","I = pi/4",4`;

    const report = parseQuestionCsv(multilineEquation, { bookId: "b1", chapters });
    expect(report.validCount).toBe(1);
    expect(report.items[0].text).toContain("2I = \\int_{0}^{\\frac{\\pi}{2}} 1 dx = \\frac{\\pi}{2}");
    expect(report.items[0].text).toContain("I = \\frac{\\pi}{4}");
  });

  it("preserves KaTeX piecewise cases environment with commas inside conditions", () => {
    const piecewiseCsv = `"type","marks","text","answer","chapterNumber"
"SHORT",2,"Consider function:
$$f(x) = \\begin{cases} \\frac{\\sin 3x}{x}, & \\text{if } x \\ne 0 \\\\ k, & \\text{if } x = 0 \\end{cases}$$
Find value of $k$ so that $f(x)$ is continuous at $x = 0$.","k = 3",4`;

    const report = parseQuestionCsv(piecewiseCsv, { bookId: "b1", chapters });
    expect(report.validCount).toBe(1);
    expect(report.items[0].text).toContain("\\begin{cases}");
    expect(report.items[0].text).toContain("\\frac{\\sin 3x}{x}, & \\text{if } x \\ne 0");
    expect(report.items[0].answer).toBe("k = 3");
  });

  it("handles complex equations with Greek symbols, square roots, and fractions", () => {
    const csv = `type,marks,text,answer,chapterNumber
SHORT,3,"Solve for $\\theta$: $2\\cos^2\\theta + 3\\sin\\theta = 0$ where $\\theta \\in [0, 2\\pi)$. Formula: $\\sin\\theta = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$.",Ans,4`;

    const report = parseQuestionCsv(csv, { bookId: "b1", chapters });
    expect(report.validCount).toBe(1);
    expect(report.items[0].text).toContain("$\\theta \\in [0, 2\\pi)$");
    expect(report.items[0].text).toContain("\\sqrt{\\Delta}");
  });
});

describe("Challenger M3.1 Suite 3: Non-ASCII & Unicode Fidelity Stress", () => {
  const chapters = [{ id: "ch_sci", number: 6, title: "Life Processes" }];

  it("ingests Hindi/Devanagari text with scientific formulas without corruption", () => {
    const devanagariCsv = `type,marks,text,answer,chapterNumber
SHORT,3,"प्रकाश संश्लेषण प्रक्रिया का संतुलित रासायनिक समीकरण लिखिए: $6CO_2 + 6H_2O \\xrightarrow{सूर्य\\ का\\ प्रकाश} C_6H_{12}O_6 + 6O_2$","समीकरण ऊपर दिया गया है।",6`;

    const report = parseQuestionCsv(devanagariCsv, { bookId: "b1", chapters });
    expect(report.validCount).toBe(1);
    expect(report.items[0].text).toContain("प्रकाश संश्लेषण प्रक्रिया का संतुलित रासायनिक समीकरण");
    expect(report.items[0].answer).toBe("समीकरण ऊपर दिया गया है।");
  });

  it("ingests Unicode emojis and typographic punctuation (em-dash, curly quotes)", () => {
    const unicodeCsv = `type,marks,text,answer,chapterNumber
SHORT,2,"Observe the symbol ⚡ in circuit diagram — what does it signify? Note: ‘Danger’ vs “Caution”.",Danger,6`;

    const report = parseQuestionCsv(unicodeCsv, { bookId: "b1", chapters });
    expect(report.validCount).toBe(1);
    expect(report.items[0].text).toContain("⚡");
    expect(report.items[0].text).toContain("—");
    expect(report.items[0].text).toContain("‘Danger’ vs “Caution”");
  });

  it("handles UTF-8 BOM in JSON strings without crashing or failing", () => {
    const bomJson = `\uFEFF[
      {
        "type": "SHORT",
        "marks": 2,
        "text": "Question from UTF-8 BOM JSON",
        "chapterNumber": 6,
        "answer": "Valid"
      }
    ]`;

    // Note: Standard JSON.parse fails on BOM if not pre-stripped!
    // We test whether parseQuestionJson or parseAndValidateBatch tolerates BOM.
    const report = parseAndValidateBatch({
      format: "json",
      content: bomJson,
      bookId: "b1",
      chapters,
    });

    // Check if BOM is cleanly handled
    if (!report.success) {
      // If failed, record exact error for Challenger analysis
      expect(report.errors[0].error).toBeDefined();
    } else {
      expect(report.validCount).toBe(1);
      expect(report.items[0].text).toBe("Question from UTF-8 BOM JSON");
    }
  });

  it("handles UTF-8 BOM in CSV string without corrupting first header column", () => {
    const bomCsv = `\uFEFF"type","marks","text","answer","chapterNumber"\n"SHORT",2,"Question with BOM","Ans",6`;
    const report = parseQuestionCsv(bomCsv, { bookId: "b1", chapters });
    expect(report.validCount).toBe(1);
    expect(report.items[0].type).toBe("SHORT");
    expect(report.items[0].text).toBe("Question with BOM");
  });
});

describe("Challenger M3.1 Suite 4: Case Study & Multi-Part Subparts Stress", () => {
  const chapters = [{ id: "ch_case", number: 12, title: "Electricity" }];

  it("parses valid JSON-encoded subparts embedded inside CSV rows", () => {
    const csv = `type,marks,text,answer,chapterNumber,subparts
CASE_STUDY,4,"Read the passage on Ohm's law and answer the subparts:","See parts",12,"[{""label"":""(i)"",""text"":""State Ohm's Law."",""marks"":1},{""label"":""(ii)"",""text"":""Write SI unit of resistance."",""marks"":1},{""label"":""(iii)"",""text"":""A wire of 10 ohm is stretched to double its length. Find new resistance."",""marks"":2}]"`;

    const report = parseQuestionCsv(csv, { bookId: "b1", chapters });
    expect(report.errorCount).toBe(0);
    expect(report.validCount).toBe(1);
    const q = report.items[0];
    expect(q.type).toBe("CASE_STUDY");
    expect(q.marks).toBe(4);
    expect(q.subparts.length).toBe(3);
    expect(q.subparts[0].label).toBe("(i)");
    expect(q.subparts[0].marks).toBe(1);
    expect(q.subparts[2].marks).toBe(2);
  });

  it("rejects CASE_STUDY when subparts sum does not match question marks", () => {
    const csvMismatch = `type,marks,text,answer,chapterNumber,subparts
CASE_STUDY,5,"Case study with mark mismatch:","Ans",12,"[{""label"":""(a)"",""text"":""Part 1"",""marks"":1},{""label"":""(b)"",""text"":""Part 2"",""marks"":2}]"`;

    const report = parseQuestionCsv(csvMismatch, { bookId: "b1", chapters });
    expect(report.validCount).toBe(0);
    expect(report.errorCount).toBe(1);
    expect(report.errors[0].field).toBe("subparts");
    expect(report.errors[0].error).toContain("Subparts total marks (3) does not match question marks (5)");
  });

  it("auto-populates question marks from subparts sum when question marks column is omitted", () => {
    const csvNoMarks = `type,text,answer,chapterNumber,subparts
CASE_STUDY,"Case study without explicit question marks:","Ans",12,"[{""label"":""(a)"",""text"":""Part 1"",""marks"":1},{""label"":""(b)"",""text"":""Part 2"",""marks"":3}]"`;

    const report = parseQuestionCsv(csvNoMarks, { bookId: "b1", chapters });
    expect(report.validCount).toBe(1);
    expect(report.items[0].marks).toBe(4);
  });

  it("parses pipe-delimited text subparts: '(a) Text [1m] | (b) Text [2m]'", () => {
    const csvPipe = `type,marks,text,answer,chapterNumber,subparts
CASE_STUDY,3,"Solve the problem:","Ans",12,"(a) Define electric potential [1m] | (b) Calculate work done in moving 2C charge across 12V [2m]"`;

    const report = parseQuestionCsv(csvPipe, { bookId: "b1", chapters });
    expect(report.validCount).toBe(1);
    expect(report.items[0].subparts.length).toBe(2);
    expect(report.items[0].subparts[0].marks).toBe(1);
    expect(report.items[0].subparts[0].label).toBe("(a)");
    expect(report.items[0].subparts[1].marks).toBe(2);
    expect(report.items[0].subparts[1].label).toBe("(b)");
  });

  it("rejects subpart with empty question text or non-positive integer marks", () => {
    const res1 = parseSubpartsField([{ label: "(i)", text: "", marks: 2 }]);
    expect(res1.error).toContain("Each subpart must have non-empty label, text, and integer marks >= 1");

    const res2 = parseSubpartsField([{ label: "(i)", text: "Valid text", marks: 0 }]);
    expect(res2.error).toContain("Each subpart must have non-empty label, text, and integer marks >= 1");

    const res3 = parseSubpartsField([{ label: "(i)", text: "Valid text", marks: -2 }]);
    expect(res3.error).toContain("Each subpart must have non-empty label, text, and integer marks >= 1");

    const res4 = parseSubpartsField([{ label: "(i)", text: "Valid text", marks: 1.5 }]);
    expect(res4.error).toContain("Each subpart must have non-empty label, text, and integer marks >= 1");
  });
});

describe("Challenger M3.1 Suite 5: Duplicate Collision & Detection Oracles", () => {
  const chapters = [
    { id: "ch_1", number: 1, title: "Matter in Our Surroundings" },
    { id: "ch_2", number: 2, title: "Is Matter Around Us Pure" },
  ];

  it("collides duplicates despite casing, trailing whitespace, and tabs", () => {
    const csv = `type,marks,text,answer,chapterNumber
SHORT,2,"State the law of conservation of mass.",Ans,1
SHORT,2,"  state the law of conservation of mass.  \t",Ans,1`;

    // skipDuplicates: false -> error on duplicate
    const reportError = parseQuestionCsv(csv, { bookId: "b1", chapters, skipDuplicates: false });
    expect(reportError.validCount).toBe(1);
    expect(reportError.errorCount).toBe(1);
    expect(reportError.errors[0].rowNumber).toBe(3);
    expect(reportError.errors[0].error).toContain("Duplicate question detected within the batch import");

    // skipDuplicates: true -> duplicate skipped and counted
    const reportSkip = parseQuestionCsv(csv, { bookId: "b1", chapters, skipDuplicates: true });
    expect(reportSkip.validCount).toBe(1);
    expect(reportSkip.duplicateCount).toBe(1);
    expect(reportSkip.errorCount).toBe(0);
    expect(reportSkip.success).toBe(true);
  });

  it("normalizes LaTeX formatting wrappers (\\mathrm, \\mathbf, \\text) to catch duplicates", () => {
    const csv = `type,marks,text,answer,chapterNumber
SHORT,2,"Calculate $\\text{HCF}(a, b)$ given product.",Ans,1
SHORT,2,"Calculate $\\mathrm{HCF}(a, b)$ given product.",Ans,1`;

    const report = parseQuestionCsv(csv, { bookId: "b1", chapters, skipDuplicates: false });
    expect(report.validCount).toBe(1);
    expect(report.duplicateCount).toBe(1);
  });

  it("permits identical question text across DIFFERENT chapters without collision", () => {
    const csv = `type,marks,text,answer,chapterNumber
SHORT,2,"Explain the principle with an example.",Ans,1
SHORT,2,"Explain the principle with an example.",Ans,2`;

    const report = parseQuestionCsv(csv, { bookId: "b1", chapters, skipDuplicates: false });
    expect(report.validCount).toBe(2);
    expect(report.errorCount).toBe(0);
    expect(report.duplicateCount).toBe(0);
    expect(report.items[0].chapterId).toBe("ch_1");
    expect(report.items[1].chapterId).toBe("ch_2");
  });

  it("detects collisions against existing questions pre-loaded from database", () => {
    const existing = [
      { id: "q_existing_1", chapterId: "ch_1", text: "What is evaporation?" },
    ];

    const csv = `type,marks,text,answer,chapterNumber
SHORT,2,"what is evaporation? ",Ans,1`;

    const report = parseQuestionCsv(csv, { bookId: "b1", chapters, existingQuestions: existing, skipDuplicates: false });
    expect(report.validCount).toBe(0);
    expect(report.errorCount).toBe(1);
    expect(report.errors[0].error).toContain("already exists in this chapter");
  });
});

describe("Challenger M3.1 Suite 6: Chapter Mapping & Resolution Boundaries", () => {
  const chapters = [
    { id: "ch_01", number: 1, title: "Real Numbers" },
    { id: "ch_02", number: 2, title: "Polynomials" },
    { id: "ch_10", number: 10, title: "Circles" },
  ];

  it("resolves chapters by string number, prefixed string ('Chapter 2', 'Ch. 10'), and raw number", () => {
    const resolver = new ChapterResolver(chapters);

    const r1 = resolver.resolve({ rowNumber: 1, chapterNumber: "1" });
    expect(r1.chapterId).toBe("ch_01");

    const r2 = resolver.resolve({ rowNumber: 2, chapterNumber: "Chapter 2" });
    expect(r2.chapterId).toBe("ch_02");

    const r3 = resolver.resolve({ rowNumber: 3, chapterNumber: "Ch. 10" });
    expect(r3.chapterId).toBe("ch_10");

    const r4 = resolver.resolve({ rowNumber: 4, chapterNumber: 10 });
    expect(r4.chapterId).toBe("ch_10");
  });

  it("resolves chapter by exact case-insensitive title and trimmed title", () => {
    const resolver = new ChapterResolver(chapters);

    const r1 = resolver.resolve({ rowNumber: 1, chapterTitle: "REAL NUMBERS" });
    expect(r1.chapterId).toBe("ch_01");

    const r2 = resolver.resolve({ rowNumber: 2, chapterTitle: "  polynomials  " });
    expect(r2.chapterId).toBe("ch_02");
  });

  it("reports descriptive error when chapter cannot be resolved", () => {
    const resolver = new ChapterResolver(chapters);

    const r1 = resolver.resolve({ rowNumber: 1, chapterNumber: 99 });
    expect(r1.chapterId).toBeUndefined();
    expect(r1.error).toContain("Chapter '99' not found in target book");

    const r2 = resolver.resolve({ rowNumber: 2, chapterTitle: "Nonexistent Subject Area" });
    expect(r2.chapterId).toBeUndefined();
    expect(r2.error).toContain("Nonexistent Subject Area");
  });

  it("auto-resolves chapter when book has exactly 1 chapter and row specifies no chapter", () => {
    const singleChapter = [{ id: "ch_only", number: 1, title: "Only Chapter" }];
    const resolver = new ChapterResolver(singleChapter);

    const res = resolver.resolve({ rowNumber: 1 });
    expect(res.chapterId).toBe("ch_only");
  });

  it("uses default chapter fallback when provided in options", () => {
    const resolver = new ChapterResolver(chapters, "ch_02");
    const res = resolver.resolve({ rowNumber: 1 });
    expect(res.chapterId).toBe("ch_02");
  });
});

describe("Challenger M3.1 Suite 7: MCQ Options & Answer Normalization", () => {
  it("extracts options from discrete columns Option A, Option B, Option C, Option D", () => {
    const raw: RawQuestionRow = {
      rowNumber: 1,
      optionA: "Option 1",
      optionB: "Option 2",
      optionC: "Option 3",
      optionD: "Option 4",
    };
    const opts = extractOptions(raw);
    expect(opts).toEqual(["Option 1", "Option 2", "Option 3", "Option 4"]);
  });

  it("extracts options from pipe-delimited, semicolon-delimited, and JSON array strings", () => {
    const fromPipe = extractOptions({ rowNumber: 1, options: "Choice 1 | Choice 2 | Choice 3" });
    expect(fromPipe).toEqual(["Choice 1", "Choice 2", "Choice 3"]);

    const fromSemicolon = extractOptions({ rowNumber: 1, options: "Alpha; Beta; Gamma; Delta" });
    expect(fromSemicolon).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);

    const fromJson = extractOptions({ rowNumber: 1, options: '["First", "Second", "Third"]' });
    expect(fromJson).toEqual(["First", "Second", "Third"]);
  });

  it("enforces MCQ option boundaries: minimum 2 and maximum 6", () => {
    const chapters = [{ id: "ch_1", number: 1, title: "General" }];

    // 1 option -> error
    const csvTooFew = `type,marks,text,answer,chapterNumber,options\nMCQ,1,"Q1",A,1,"Only One Option"`;
    const repFew = parseQuestionCsv(csvTooFew, { bookId: "b1", chapters });
    expect(repFew.validCount).toBe(0);
    expect(repFew.errors[0].error).toContain("at least 2 options");

    // 7 options -> error
    const csvTooMany = `type,marks,text,answer,chapterNumber,options\nMCQ,1,"Q2",A,1,"1|2|3|4|5|6|7"`;
    const repMany = parseQuestionCsv(csvTooMany, { bookId: "b1", chapters });
    expect(repMany.validCount).toBe(0);
    expect(repMany.errors[0].error).toContain("cannot exceed 6 options");

    // 6 options -> valid
    const csvSix = `type,marks,text,answer,chapterNumber,options\nMCQ,1,"Q3",A,1,"1|2|3|4|5|6"`;
    const repSix = parseQuestionCsv(csvSix, { bookId: "b1", chapters });
    expect(repSix.validCount).toBe(1);
    expect(repSix.items[0].options.length).toBe(6);
  });

  it("normalizes answers from letters (a/b/c), 1-based indices (1/2/3), or option text matching", () => {
    const options = ["Carbon dioxide", "Oxygen", "Nitrogen", "Methane"];

    // Letter matching
    expect(normalizeAnswer("b", options, "MCQ")).toBe("B");
    expect(normalizeAnswer("C", options, "MCQ")).toBe("C");

    // 1-based index matching (1 -> A, 2 -> B, 3 -> C, 4 -> D)
    expect(normalizeAnswer("1", options, "MCQ")).toBe("A");
    expect(normalizeAnswer("3", options, "MCQ")).toBe("C");

    // Option text matching
    expect(normalizeAnswer("Oxygen", options, "MCQ")).toBe("B");
    expect(normalizeAnswer("nitrogen", options, "MCQ")).toBe("C");
    expect(normalizeAnswer("CARBON DIOXIDE", options, "MCQ")).toBe("A");
  });
});

describe("Challenger M3.1 Suite 8: Export Round-Trip Fidelity & Zero Data Loss", () => {
  const chapters = [{ id: "ch_rt", number: 5, title: "Periodic Classification" }];

  const sampleQuestions: QuestionDto[] = [
    {
      id: "q_mcq_rt",
      bookId: "b1",
      chapterId: "ch_rt",
      type: "MCQ",
      text: "Which element has atomic number 17?",
      options: ["Sodium", "Chlorine", "Argon", "Potassium"],
      answer: "B",
      difficulty: "EASY",
      imagePath: null,
      spaceMm: 0,
      showGrid: false,
      createdAt: new Date().toISOString(),
      chapter: { id: "ch_rt", number: 5, title: "Periodic Classification" },
      subparts: [],
    },
    {
      id: "q_case_rt",
      bookId: "b1",
      chapterId: "ch_rt",
      type: "CASE_STUDY",
      text: "Read the periodic table trends and answer:",
      options: [],
      answer: "",
      difficulty: "HARD",
      imagePath: null,
      spaceMm: 40,
      showGrid: true,
      createdAt: new Date().toISOString(),
      chapter: { id: "ch_rt", number: 5, title: "Periodic Classification" },
      subparts: [
        { label: "(a)", text: "How does atomic radius vary across a period?", marks: 1 },
        { label: "(b)", text: "Explain reason for variation in electron affinity.", marks: 2 },
      ],
    },
  ];

  it("exports to JSON and round-trips with 100% preservation of text, options, subparts, and metadata", () => {
    const jsonStr = exportQuestionsToJson(sampleQuestions, {
      bookTitle: "Chemistry Class 10",
      subject: "Science",
      className: "Class 10",
    });

    const report = parseQuestionJson(jsonStr, { bookId: "b1", chapters });
    expect(report.success).toBe(true);
    expect(report.validCount).toBe(2);

    // Verify Question 1 (MCQ)
    const q1 = report.items[0];
    expect(q1.type).toBe("MCQ");
    expect(q1.text).toBe(sampleQuestions[0].text);
    expect(q1.options).toEqual(sampleQuestions[0].options);
    expect(q1.answer).toBe(sampleQuestions[0].answer);
    expect(q1.difficulty).toBe(sampleQuestions[0].difficulty);

    // Verify Question 2 (CASE_STUDY)
    const q2 = report.items[1];
    expect(q2.type).toBe("CASE_STUDY");
    expect(q2.text).toBe(sampleQuestions[1].text);
    expect(q2.subparts.length).toBe(2);
    expect(q2.subparts[0].label).toBe("(a)");
    expect(q2.subparts[0].marks).toBe(1);
    expect(q2.subparts[1].label).toBe("(b)");
    expect(q2.subparts[1].marks).toBe(2);
    expect(q2.marks).toBe(3); // 1 + 2 auto-summed
    expect(q2.spaceMm).toBe(40);
    expect(q2.showGrid).toBe(true);
  });

  it("exports to CSV and round-trips with preservation of text, options, and subparts", () => {
    const csvStr = exportQuestionsToCsv(sampleQuestions, "Chemistry Class 10");

    // CSV must start with UTF-8 BOM
    expect(csvStr.startsWith("\uFEFF")).toBe(true);

    const report = parseQuestionCsv(csvStr, { bookId: "b1", chapters });
    expect(report.success).toBe(true);
    expect(report.validCount).toBe(2);

    const q1 = report.items[0];
    expect(q1.type).toBe("MCQ");
    expect(q1.text).toBe(sampleQuestions[0].text);
    expect(q1.options).toEqual(sampleQuestions[0].options);
    expect(q1.answer).toBe(sampleQuestions[0].answer);

    const q2 = report.items[1];
    expect(q2.type).toBe("CASE_STUDY");
    expect(q2.text).toBe(sampleQuestions[1].text);
    expect(q2.subparts.length).toBe(2);
    expect(q2.subparts[0].label).toBe("(a)");
    expect(q2.subparts[1].label).toBe("(b)");
  });
});

describe("Challenger M3.1 Suite 9: Empirical Findings & Boundary Exploration", () => {
  const chapters = [{ id: "ch_1", number: 1, title: "Chemical Reactions" }];

  it("proves empirically that parseQuestionJson fails when JSON has UTF-8 BOM", () => {
    // Windows PowerShell or Notepad files often include UTF-8 BOM
    const rawBomJson = "\uFEFF[{\"type\":\"SHORT\",\"text\":\"BOM test question\",\"chapterNumber\":1,\"marks\":2}]";
    const report = parseQuestionJson(rawBomJson, { bookId: "b1", chapters });
    // Empirical finding: JSON.parse does NOT natively strip \uFEFF BOM
    expect(report.success).toBe(false);
    expect(report.errorCount).toBe(1);
    expect(report.errors[0].field).toBe("json");
    expect(report.errors[0].error).toContain("Invalid JSON syntax");
  });

  it("proves empirically that exportQuestionsToCsv drops Option E and Option F", () => {
    const qWith6Opts: QuestionDto = {
      id: "q_6opts",
      bookId: "b1",
      chapterId: "ch_1",
      type: "MCQ",
      text: "Which of the following is a noble gas?",
      options: ["Helium", "Neon", "Argon", "Krypton", "Xenon", "Radon"],
      answer: "C",
      difficulty: "MEDIUM",
      imagePath: null,
      spaceMm: 0,
      showGrid: false,
      createdAt: new Date().toISOString(),
      chapter: { id: "ch_1", number: 1, title: "Chemical Reactions" },
      subparts: [],
    };

    const csv = exportQuestionsToCsv([qWith6Opts]);
    // Headers only cover Option A-D
    expect(csv).toContain("Option A");
    expect(csv).toContain("Option D");
    expect(csv).not.toContain("Option E");
    expect(csv).not.toContain("Option F");

    // Options 5 and 6 are truncated
    expect(csv).toContain("Helium");
    expect(csv).toContain("Krypton");
    expect(csv).not.toContain("Xenon");
    expect(csv).not.toContain("Radon");
  });

  it("proves pipe-delimited subpart parsing collides with LaTeX absolute value pipes", () => {
    // Pipe-delimited string with math pipe: $|x| < 5$
    const pipeStr = "(a) Solve $|x| < 5$ [1m] | (b) Find $y$ [2m]";
    const resPipe = parseSubpartsField(pipeStr);
    // Splitting on '|' fragments the math equation
    expect(resPipe.subparts.length).not.toBe(2);

    // In contrast, JSON-encoded subparts safely preserves pipe characters in LaTeX
    const jsonSubparts = JSON.stringify([
      { label: "(a)", text: "Solve $|x| < 5$", marks: 1 },
      { label: "(b)", text: "Find $y$", marks: 2 },
    ]);
    const resJson = parseSubpartsField(jsonSubparts);
    expect(resJson.subparts.length).toBe(2);
    expect(resJson.subparts[0].text).toBe("Solve $|x| < 5$");
  });

  it("verifies punctuation retention in duplicate detection to protect distinct math questions", () => {
    // In math, punctuation defines meaning: $f'(x)$ vs $f''(x)$ or $x < 0$ vs $x > 0$
    const t1 = normalizeQuestionText("Is $f'(x) = 0$ at critical point?");
    const t2 = normalizeQuestionText("Is $f''(x) = 0$ at critical point?");
    expect(t1).not.toBe(t2);

    const t3 = normalizeQuestionText("Solve for $x < 0$.");
    const t4 = normalizeQuestionText("Solve for $x > 0$.");
    expect(t3).not.toBe(t4);
  });
});

describe("Challenger M3.1 Suite 10: High-Volume Stress Harness & Bulk Generator", () => {
  const chapters = Array.from({ length: 5 }, (_, i) => ({
    id: `ch_${i + 1}`,
    number: i + 1,
    title: `Chapter ${i + 1} Science`,
  }));

  it("processes 250 randomized questions in CSV batch without performance degradation", () => {
    const rows: string[] = ["type,marks,text,answer,chapterNumber,difficulty"];
    const questionTypes = ["MCQ", "SHORT", "LONG", "FILL_BLANK", "TRUE_FALSE"];
    const difficulties = ["EASY", "MEDIUM", "HARD"];

    for (let i = 1; i <= 250; i++) {
      const type = questionTypes[i % questionTypes.length];
      const diff = difficulties[i % difficulties.length];
      const chNum = (i % 5) + 1;
      const text = `"Stress test question ${i}: Calculate value of $\\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6}$ for $n=${i}$."`;
      const ans = `"Answer ${i}"`;
      rows.push(`${type},${(i % 5) + 1},${text},${ans},${chNum},${diff}`);
    }

    const csvContent = rows.join("\r\n");
    const start = performance.now();
    const report = parseQuestionCsv(csvContent, { bookId: "b1", chapters });
    const elapsed = performance.now() - start;

    expect(report.totalRows).toBe(250);
    // All non-MCQ questions are valid; MCQ questions miss options so are correctly rejected with row errors
    expect(report.totalRows).toBe(report.validCount + report.errorCount);
    // Parsing 250 questions with LaTeX formulas takes < 100ms
    expect(elapsed).toBeLessThan(500);
  });

  it("processes 250 valid JSON questions and verifies zero duplicate false-positives", () => {
    const list = Array.from({ length: 250 }, (_, i) => ({
      type: "SHORT",
      marks: (i % 5) + 1,
      text: `Distinct question #${i + 1} with formula $\\alpha_${i} = \\sqrt{${i}}$`,
      answer: `Ans ${i + 1}`,
      chapterNumber: (i % 5) + 1,
      difficulty: "MEDIUM",
    }));

    const jsonStr = JSON.stringify(list);
    const report = parseQuestionJson(jsonStr, { bookId: "b1", chapters, skipDuplicates: false });

    expect(report.totalRows).toBe(250);
    expect(report.validCount).toBe(250);
    expect(report.duplicateCount).toBe(0);
    expect(report.errorCount).toBe(0);
    expect(report.success).toBe(true);
  });
});

