import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACADEMIC_SESSION,
  DEFAULT_MARKS_STYLE,
  DEFAULT_NUMBERING_STYLE,
  DEFAULT_PRINT_DENSITY,
  MARKS_STYLES,
  NUMBERING_STYLES,
  PRINT_DENSITIES,
  QUESTION_TYPES,
} from "./constants";
import { formatQuestionNumber } from "./layout";
import {
  parseSubparts,
  subpartsTotalMarks,
  sumSubPartMarks,
  validateSubPartsSum,
  type SubPart,
} from "./types";
import type { Question } from "@prisma/client";
import { toBlueprintDto, toPaperDto, toQuestionDto, toSnapshotDto } from "./dto";
import {
  blueprintSchema,
  paperCreateSchema,
  paperUpdateSchema,
  questionSchema,
  snapshotCreateSchema,
  snapshotPayloadSchema,
  subPartSchema,
} from "./schemas";

describe("Adversarial Challenge: subPartSchema Boundary & Stress Testing", () => {
  it("rejects empty, whitespace-only, or overlength labels", () => {
    // Empty
    expect(() => subPartSchema.parse({ label: "", text: "Valid text", marks: 1 })).toThrow();
    // Whitespace only
    expect(() => subPartSchema.parse({ label: "   ", text: "Valid text", marks: 1 })).toThrow();
    expect(() => subPartSchema.parse({ label: "\t\n", text: "Valid text", marks: 1 })).toThrow();
    // Max length 20 boundary
    const twentyChars = "a".repeat(20);
    expect(subPartSchema.parse({ label: twentyChars, text: "Valid", marks: 1 }).label).toBe(twentyChars);
    const twentyOneChars = "a".repeat(21);
    expect(() => subPartSchema.parse({ label: twentyOneChars, text: "Valid", marks: 1 })).toThrow();
  });

  it("trims whitespace from labels and texts", () => {
    const res = subPartSchema.parse({
      label: "  (a)  ",
      text: "  State the principle of conservation of energy.  ",
      marks: 2,
    });
    expect(res.label).toBe("(a)");
    expect(res.text).toBe("State the principle of conservation of energy.");
  });

  it("rejects empty or overlength question text", () => {
    expect(() => subPartSchema.parse({ label: "(a)", text: "", marks: 1 })).toThrow();
    expect(() => subPartSchema.parse({ label: "(a)", text: "   ", marks: 1 })).toThrow();

    const threeThousand = "x".repeat(3000);
    expect(subPartSchema.parse({ label: "(a)", text: threeThousand, marks: 1 }).text).toBe(threeThousand);

    const threeThousandOne = "x".repeat(3001);
    expect(() => subPartSchema.parse({ label: "(a)", text: threeThousandOne, marks: 1 })).toThrow();
  });

  it("enforces strict marks boundaries (1 <= marks <= 50, integer only)", () => {
    // Valid boundaries
    expect(subPartSchema.parse({ label: "(a)", text: "T", marks: 1 }).marks).toBe(1);
    expect(subPartSchema.parse({ label: "(a)", text: "T", marks: 50 }).marks).toBe(50);

    // Invalid marks: zero, negative, above 50
    expect(() => subPartSchema.parse({ label: "(a)", text: "T", marks: 0 })).toThrow();
    expect(() => subPartSchema.parse({ label: "(a)", text: "T", marks: -1 })).toThrow();
    expect(() => subPartSchema.parse({ label: "(a)", text: "T", marks: -999 })).toThrow();
    expect(() => subPartSchema.parse({ label: "(a)", text: "T", marks: 51 })).toThrow();
    expect(() => subPartSchema.parse({ label: "(a)", text: "T", marks: 1000000 })).toThrow();

    // Floating point marks (CBSE subparts in our schema require integer marks)
    expect(() => subPartSchema.parse({ label: "(a)", text: "T", marks: 1.5 })).toThrow();
    expect(() => subPartSchema.parse({ label: "(a)", text: "T", marks: 0.5 })).toThrow();

    // Non-numeric or NaN
    expect(() => subPartSchema.parse({ label: "(a)", text: "T", marks: NaN })).toThrow();
    expect(() => subPartSchema.parse({ label: "(a)", text: "T", marks: Infinity })).toThrow();
    expect(() => subPartSchema.parse({ label: "(a)", text: "T", marks: "1" as unknown as number })).toThrow();
  });

  it("handles complex unicode, math notation, and script tags safely", () => {
    const unicodeInput = {
      label: "भाग (क)",
      text: "यदि $f(x) = \\int_0^x \\frac{\\sin t}{t} dt$, तब $f'(x)$ ज्ञात कीजिए। 😊",
      marks: 3,
      answer: "<script>alert('xss')</script> and ' OR 1=1; --",
      options: ["विकल्प 1: $\\alpha$", "विकल्प 2: $\\beta$"],
    };
    const parsed = subPartSchema.parse(unicodeInput);
    expect(parsed.label).toBe("भाग (क)");
    expect(parsed.text).toContain("\\int_0^x");
    expect(parsed.answer).toBe("<script>alert('xss')</script> and ' OR 1=1; --");
    expect(parsed.options).toHaveLength(2);
  });

  it("enforces max options limit on subparts", () => {
    const sixOptions = ["A", "B", "C", "D", "E", "F"];
    expect(subPartSchema.parse({ label: "(i)", text: "Q", marks: 1, options: sixOptions }).options).toHaveLength(6);

    const sevenOptions = ["A", "B", "C", "D", "E", "F", "G"];
    expect(() => subPartSchema.parse({ label: "(i)", text: "Q", marks: 1, options: sevenOptions })).toThrow();
  });
});

describe("Adversarial Challenge: questionSchema Stress & Boundary Testing", () => {
  const baseQuestion = {
    bookId: "book-test-1",
    chapterId: "chap-test-1",
    type: "CASE_STUDY" as const,
    text: "Read the passage carefully...",
    options: [],
    answer: "Detailed solution...",
    difficulty: "HARD" as const,
  };

  it("accepts valid CASE_STUDY with multiple subparts", () => {
    const parsed = questionSchema.parse({
      ...baseQuestion,
      subparts: [
        { label: "(a)", text: "First sub-question", marks: 1 },
        { label: "(b)", text: "Second sub-question", marks: 1 },
        { label: "(c)", text: "Third sub-question", marks: 2 },
      ],
    });
    expect(parsed.subparts).toHaveLength(3);
    expect(parsed.subparts?.[2].marks).toBe(2);
  });

  it("defaults subparts to empty array when omitted", () => {
    const parsed = questionSchema.parse(baseQuestion);
    expect(parsed.subparts).toEqual([]);
  });

  it("rejects question if any subpart is invalid", () => {
    expect(() =>
      questionSchema.parse({
        ...baseQuestion,
        subparts: [
          { label: "(a)", text: "Valid", marks: 1 },
          { label: "", text: "Invalid empty label", marks: 1 },
        ],
      }),
    ).toThrow();

    expect(() =>
      questionSchema.parse({
        ...baseQuestion,
        subparts: [{ label: "(a)", text: "Valid", marks: 0 }],
      }),
    ).toThrow();
  });

  it("enforces MCQ option constraints via superRefine", () => {
    // MCQ with 0 options should fail
    expect(() =>
      questionSchema.parse({
        ...baseQuestion,
        type: "MCQ",
        options: [],
      }),
    ).toThrow(/at least 2 options/);

    // MCQ with 1 option should fail
    expect(() =>
      questionSchema.parse({
        ...baseQuestion,
        type: "MCQ",
        options: ["Only one"],
      }),
    ).toThrow(/at least 2 options/);

    // MCQ with 2 options succeeds
    expect(
      questionSchema.parse({
        ...baseQuestion,
        type: "MCQ",
        options: ["Option A", "Option B"],
      }).options,
    ).toHaveLength(2);

    // MCQ with 7 options fails (MAX_OPTIONS = 6)
    expect(() =>
      questionSchema.parse({
        ...baseQuestion,
        type: "MCQ",
        options: ["1", "2", "3", "4", "5", "6", "7"],
      }),
    ).toThrow();
  });

  it("validates imagePath regex to prevent path traversal", () => {
    const validUuidPng = "123e4567-e89b-12d3-a456-426614174000.png";
    expect(questionSchema.parse({ ...baseQuestion, imagePath: validUuidPng }).imagePath).toBe(validUuidPng);

    // Path traversal attacks
    expect(() => questionSchema.parse({ ...baseQuestion, imagePath: "../../secret.png" })).toThrow();
    expect(() => questionSchema.parse({ ...baseQuestion, imagePath: "/etc/passwd" })).toThrow();
    expect(() => questionSchema.parse({ ...baseQuestion, imagePath: "photo.exe" })).toThrow();
    expect(() => questionSchema.parse({ ...baseQuestion, imagePath: "123e4567-e89b-12d3-a456-426614174000.sh" })).toThrow();
  });

  it("validates spaceMm boundaries (0 <= spaceMm <= 250)", () => {
    expect(questionSchema.parse({ ...baseQuestion, spaceMm: 0 }).spaceMm).toBe(0);
    expect(questionSchema.parse({ ...baseQuestion, spaceMm: 250 }).spaceMm).toBe(250);
    expect(() => questionSchema.parse({ ...baseQuestion, spaceMm: -1 })).toThrow();
    expect(() => questionSchema.parse({ ...baseQuestion, spaceMm: 251 })).toThrow();
    expect(() => questionSchema.parse({ ...baseQuestion, spaceMm: 999 })).toThrow();
  });
});

describe("Adversarial Challenge: paperCreateSchema & paperUpdateSchema Customization Guardrails", () => {
  const minimalPaper = {
    title: "Class 12 Board Exam",
    blueprintId: "bp-valid-123",
    layout: "BOOKLET" as const,
    schoolName: "Kendriya Vidyalaya",
  };

  it("verifies all default values are correctly populated on minimal creation", () => {
    const parsed = paperCreateSchema.parse(minimalPaper);
    expect(parsed.academicSession).toBe("2025–26");
    expect(parsed.printDensity).toBe("STANDARD");
    expect(parsed.numberingStyle).toBe("CONTINUOUS");
    expect(parsed.marksStyle).toBe("INLINE");
    expect(parsed.twoColumn).toBe(false);
    expect(parsed.targetPages).toBeNull();
    expect(parsed.schoolLogo).toBeNull();
    expect(parsed.logoPath).toBeNull();
    expect(parsed.showCandidateDetails).toBe(true);
    expect(parsed.showSignatures).toBe(false);
    expect(parsed.examDate).toBe("");
    expect(parsed.paperSet).toBe("");
    expect(parsed.subjectCode).toBe("");
    expect(parsed.generalInstructions).toBe("");
  });

  it("strictly rejects invalid enum values for printDensity, numberingStyle, marksStyle, and layout", () => {
    expect(() => paperCreateSchema.parse({ ...minimalPaper, printDensity: "DENSE" as unknown as typeof PRINT_DENSITIES[0] })).toThrow();
    expect(() => paperCreateSchema.parse({ ...minimalPaper, numberingStyle: "ROMAN" as unknown as typeof NUMBERING_STYLES[0] })).toThrow();
    expect(() => paperCreateSchema.parse({ ...minimalPaper, marksStyle: "HIDDEN" as unknown as typeof MARKS_STYLES[0] })).toThrow();
    expect(() => paperCreateSchema.parse({ ...minimalPaper, layout: "MAGAZINE" as unknown as "BOOKLET" })).toThrow();
  });

  it("validates targetPages bounds (1 to 100, or null)", () => {
    expect(paperCreateSchema.parse({ ...minimalPaper, targetPages: 1 }).targetPages).toBe(1);
    expect(paperCreateSchema.parse({ ...minimalPaper, targetPages: 4 }).targetPages).toBe(4);
    expect(paperCreateSchema.parse({ ...minimalPaper, targetPages: 100 }).targetPages).toBe(100);
    expect(paperCreateSchema.parse({ ...minimalPaper, targetPages: null }).targetPages).toBeNull();

    expect(() => paperCreateSchema.parse({ ...minimalPaper, targetPages: 0 })).toThrow();
    expect(() => paperCreateSchema.parse({ ...minimalPaper, targetPages: -4 })).toThrow();
    expect(() => paperCreateSchema.parse({ ...minimalPaper, targetPages: 101 })).toThrow();
    expect(() => paperCreateSchema.parse({ ...minimalPaper, targetPages: 2.5 })).toThrow();
  });

  it("enforces string length constraints on paper fields", () => {
    // School name max 120
    const school120 = "S".repeat(120);
    expect(paperCreateSchema.parse({ ...minimalPaper, schoolName: school120 }).schoolName).toBe(school120);
    const school121 = "S".repeat(121);
    expect(() => paperCreateSchema.parse({ ...minimalPaper, schoolName: school121 })).toThrow();

    // General instructions max 5000
    const inst5000 = "I".repeat(5000);
    expect(paperCreateSchema.parse({ ...minimalPaper, generalInstructions: inst5000 }).generalInstructions).toBe(inst5000);
    const inst5001 = "I".repeat(5001);
    expect(() => paperCreateSchema.parse({ ...minimalPaper, generalInstructions: inst5001 })).toThrow();

    // Academic session max 40
    const sess40 = "A".repeat(40);
    expect(paperCreateSchema.parse({ ...minimalPaper, academicSession: sess40 }).academicSession).toBe(sess40);
    const sess41 = "A".repeat(41);
    expect(() => paperCreateSchema.parse({ ...minimalPaper, academicSession: sess41 })).toThrow();
  });

  it("allows partial updates via paperUpdateSchema without requiring non-updated fields", () => {
    const partial1 = paperUpdateSchema.parse({ printDensity: "COMFORTABLE" });
    expect(partial1.printDensity).toBe("COMFORTABLE");
    expect(partial1.title).toBeUndefined();

    const partial2 = paperUpdateSchema.parse({
      twoColumn: true,
      targetPages: 8,
      schoolLogo: "https://example.com/logo.png",
    });
    expect(partial2.twoColumn).toBe(true);
    expect(partial2.targetPages).toBe(8);
    expect(partial2.schoolLogo).toBe("https://example.com/logo.png");
  });
});

describe("Adversarial Challenge: parseSubparts Robustness & Malformed Inputs", () => {
  it("never throws on null, undefined, empty, or whitespace-only inputs", () => {
    expect(() => parseSubparts(null)).not.toThrow();
    expect(() => parseSubparts(undefined)).not.toThrow();
    expect(() => parseSubparts("")).not.toThrow();
    expect(() => parseSubparts("    \n\t  ")).not.toThrow();

    expect(parseSubparts(null)).toEqual([]);
    expect(parseSubparts(undefined)).toEqual([]);
    expect(parseSubparts("")).toEqual([]);
    expect(parseSubparts("   ")).toEqual([]);
  });

  it("never throws on malformed JSON strings and returns empty array", () => {
    const corruptedInputs = [
      "{ invalid json",
      "[{ incomplete",
      "<xml><data>123</data></xml>",
      "SELECT * FROM Questions;",
      "undefined",
      "NaN",
      "12345",
      '"just a raw string"',
      "true",
      "false",
      "null",
      "{}",
      "{\"key\": \"not an array\"}",
      "\0\0\0",
      "{\\\"bad_escape\\\": true}",
    ];

    for (const bad of corruptedInputs) {
      expect(() => parseSubparts(bad)).not.toThrow();
      const res = parseSubparts(bad);
      expect(Array.isArray(res)).toBe(true);
      expect(res).toEqual([]);
    }
  });

  it("safely handles valid JSON array with unicode, html, and SQL strings", () => {
    const maliciousJson = JSON.stringify([
      {
        label: "(i)",
        text: "<script>alert('xss')</script> DROP TABLE Questions; --",
        marks: 2,
        options: ["Option 1", "Option 2"],
      },
    ]);

    expect(() => parseSubparts(maliciousJson)).not.toThrow();
    const res = parseSubparts(maliciousJson);
    expect(res).toHaveLength(1);
    expect(res[0].label).toBe("(i)");
    expect(res[0].text).toContain("<script>");
  });

  it("handles high volume subparts array without crashing", () => {
    const largeList = Array.from({ length: 500 }, (_, i) => ({
      label: `(${i + 1})`,
      text: `Subpart text number ${i + 1}`,
      marks: (i % 3) + 1,
    }));
    const json = JSON.stringify(largeList);
    const parsed = parseSubparts(json);
    expect(parsed).toHaveLength(500);
    expect(parsed[499].label).toBe("(500)");
  });
});

describe("Adversarial Challenge: subpartsTotalMarks & validateSubPartsSum", () => {
  it("computes total marks accurately and ignores non-finite/missing marks", () => {
    const mixed = [
      { marks: 1 },
      { marks: 2 },
      { marks: NaN },
      { marks: Infinity },
      { marks: -Infinity },
      { marks: "3" as unknown as number },
      { marks: undefined as unknown as number },
      { marks: null as unknown as number },
      { marks: 4 },
    ];

    // Number.isFinite: 1 (yes), 2 (yes), NaN (no), Infinity (no), -Infinity (no), "3" (no), undefined (no), null (no), 4 (yes)
    // Sum = 1 + 2 + 4 = 7
    expect(subpartsTotalMarks(mixed as SubPart[])).toBe(7);
  });

  it("handles null, undefined, empty array without throwing", () => {
    expect(subpartsTotalMarks(null)).toBe(0);
    expect(subpartsTotalMarks(undefined)).toBe(0);
    expect(subpartsTotalMarks([])).toBe(0);
    // Adversarial: array containing null element
    expect(() => subpartsTotalMarks([null as unknown as SubPart])).not.toThrow();
  });

  it("validateSubPartsSum validates exact match against expectedTotalMarks", () => {
    const subparts: SubPart[] = [
      { label: "(a)", text: "P1", marks: 1 },
      { label: "(b)", text: "P2", marks: 2 },
      { label: "(c)", text: "P3", marks: 1 },
    ];

    expect(validateSubPartsSum(subparts, 4)).toBe(true);
    expect(validateSubPartsSum(subparts, 3)).toBe(false);
    expect(validateSubPartsSum(subparts, 5)).toBe(false);
    expect(validateSubPartsSum(subparts, 0)).toBe(false);

    // Empty subparts should return true (standard question without subparts)
    expect(validateSubPartsSum([], 0)).toBe(true);
    expect(validateSubPartsSum([], 4)).toBe(true);
  });
});

describe("Adversarial Challenge: toQuestionDto Safe Parsing & Resiliency", () => {
  const baseRawQuestion: Question = {
    id: "q-adv-1",
    bookId: "book-1",
    chapterId: "chap-1",
    type: "CASE_STUDY",
    text: "Adversarial test question",
    optionsJson: "[]",
    subpartsJson: "[]",
    answer: "Sample answer",
    difficulty: "MEDIUM",
    cognitiveLevel: null,
    explanation: null,
    figureScene: null,
    imagePath: null,
    spaceMm: 0,
    showGrid: false,
    createdById: "user-1",
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
  };

  it("does not crash when subpartsJson is malformed or invalid JSON", () => {
    const corruptedSubparts = [
      "{ corrupted",
      "not even json",
      "{\"nested\": 123}",
      "123",
      "true",
      "",
      "null",
    ];

    for (const bad of corruptedSubparts) {
      const q = { ...baseRawQuestion, subpartsJson: bad };
      expect(() => toQuestionDto(q)).not.toThrow();
      const dto = toQuestionDto(q);
      expect(Array.isArray(dto.subparts)).toBe(true);
    }
  });

  it("does not crash when optionsJson is malformed", () => {
    const corruptedOptions = [
      "not json",
      "{ \"a\": 1 }",
      "123",
      "",
    ];

    for (const bad of corruptedOptions) {
      const q = { ...baseRawQuestion, optionsJson: bad };
      expect(() => toQuestionDto(q)).not.toThrow();
      const dto = toQuestionDto(q);
      expect(Array.isArray(dto.options)).toBe(true);
    }
  });

  it("safely handles paperQuestions relation with missing or null properties", () => {
    const qWithSparseUsage = {
      ...baseRawQuestion,
      paperQuestions: [
        {
          paperId: "paper-1",
          orQuestionId: null,
          paper: {
            title: "Annual Exam",
            paperSet: "Set 1",
            examDate: "2026-03-10",
            academicSession: "2025–26",
            blueprint: { book: { className: "Class 10" } },
          },
        },
        {
          paperId: "paper-2",
          orQuestionId: "q-adv-1", // isOrChoice is true
          paper: undefined, // Missing paper relation
        },
      ],
    };

    expect(() => toQuestionDto(qWithSparseUsage)).not.toThrow();
    const dto = toQuestionDto(qWithSparseUsage);
    expect(dto.usages).toBeDefined();
    expect(dto.usages).toHaveLength(2);

    expect(dto.usages?.[0].paperTitle).toBe("Annual Exam");
    expect(dto.usages?.[0].isOrChoice).toBe(false);

    // Missing paper object defaults safely
    expect(dto.usages?.[1].paperTitle).toBe("");
    expect(dto.usages?.[1].academicSession).toBe("2025–26");
    expect(dto.usages?.[1].isOrChoice).toBe(true);
  });

  it("handles string or Date createdAt safely", () => {
    const qWithStringDate = {
      ...baseRawQuestion,
      createdAt: "2026-03-01T00:00:00.000Z" as unknown as Date,
    };
    expect(() => toQuestionDto(qWithStringDate)).not.toThrow();
  });
});

describe("Adversarial Challenge: formatQuestionNumber Extreme Values", () => {
  it("handles boundary indices for CONTINUOUS style", () => {
    expect(formatQuestionNumber("CONTINUOUS", 0, "A", 0)).toBe("1");
    expect(formatQuestionNumber("CONTINUOUS", 99, "A", 99)).toBe("100");
    expect(formatQuestionNumber("CONTINUOUS", 999, "B", 999)).toBe("1000");
    expect(formatQuestionNumber("CONTINUOUS", -1, "A", -1)).toBe("0");
  });

  it("handles boundary indices for PREFIXED style", () => {
    expect(formatQuestionNumber("PREFIXED", 0, "A", 0)).toBe("Q.1");
    expect(formatQuestionNumber("PREFIXED", 99, "A", 99)).toBe("Q.100");
    expect(formatQuestionNumber("PREFIXED", 999, "B", 999)).toBe("Q.1000");
    expect(formatQuestionNumber("PREFIXED", -1, "A", -1)).toBe("Q.0");
  });

  it("handles boundary indices and complex section letters for SECTION_RELATIVE style", () => {
    expect(formatQuestionNumber("SECTION_RELATIVE", 0, "A", 0)).toBe("A1");
    expect(formatQuestionNumber("SECTION_RELATIVE", 99, "Section-E", 99)).toBe("Section-E100");
    expect(formatQuestionNumber("SECTION_RELATIVE", 999, "IV", 999)).toBe("IV1000");
    expect(formatQuestionNumber("SECTION_RELATIVE", 0, "", 0)).toBe("1");
  });

  it("falls back to continuous style on unknown or invalid style strings", () => {
    expect(formatQuestionNumber("UNKNOWN" as unknown as typeof NUMBERING_STYLES[0], 4, "A", 0)).toBe("5");
  });
});

describe("Adversarial Challenge: toPaperDto & toBlueprintDto Defaults & Fallbacks", () => {
  it("toPaperDto safely formats string or Date createdAt/updatedAt and handles null fields", () => {
    const raw = {
      id: "p-test",
      title: "Test Exam",
      blueprintId: "bp-test",
      layout: "BOOKLET",
      schoolName: "Test School",
      createdById: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      schoolLogo: null,
      logoPath: null,
      printDensity: null,
      twoColumn: null,
      targetPages: null,
      numberingStyle: null,
      marksStyle: null,
      showCandidateDetails: null,
      showSignatures: null,
    };

    const dto = toPaperDto(raw);
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.academicSession).toBe("2025–26");
    expect(dto.printDensity).toBe("STANDARD");
    expect(dto.twoColumn).toBe(false);
    expect(dto.numberingStyle).toBe("CONTINUOUS");
    expect(dto.marksStyle).toBe("INLINE");
    expect(dto.showCandidateDetails).toBe(true);
    expect(dto.showSignatures).toBe(false);
  });

  it("toPaperDto synchronizes schoolLogo and logoPath when one is provided", () => {
    const withLogo = toPaperDto({
      id: "p-1",
      title: "Exam",
      blueprintId: "bp-1",
      layout: "PAGE",
      schoolName: "School",
      createdById: "u-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      logoPath: "logo.png",
      schoolLogo: null,
    });
    expect(withLogo.logoPath).toBe("logo.png");
    expect(withLogo.schoolLogo).toBe("logo.png");
  });

  it("toBlueprintDto preserves subjectCode and formats timestamps", () => {
    const bp = toBlueprintDto({
      id: "bp-1",
      name: "Blueprint",
      bookId: "b-1",
      examType: "ANNUAL",
      durationMin: 180,
      subjectCode: "086",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(bp.subjectCode).toBe("086");
    expect(bp.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
