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
  QUESTION_TYPE_LABEL,
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

describe("Milestone 1: SubPart Serialization & Mark Summation", () => {
  const validSubparts: SubPart[] = [
    { label: "(a)", text: "State Coulomb's Law.", marks: 1, answer: "F = k*q1*q2/r^2" },
    { label: "(b)", text: "Calculate electric field at distance r.", marks: 1 },
    { label: "(c)", text: "Derive expression for potential energy.", marks: 2 },
  ];

  it("parses valid JSON into SubPart array", () => {
    const json = JSON.stringify(validSubparts);
    const parsed = parseSubparts(json);
    expect(parsed).toEqual(validSubparts);
    expect(parsed.length).toBe(3);
  });

  it("handles null, empty string, or whitespace gracefully without throwing", () => {
    expect(parseSubparts(null)).toEqual([]);
    expect(parseSubparts(undefined)).toEqual([]);
    expect(parseSubparts("")).toEqual([]);
    expect(parseSubparts("   ")).toEqual([]);
  });

  it("handles corrupt JSON string gracefully by returning empty array", () => {
    expect(parseSubparts("{not a valid json}")).toEqual([]);
    expect(parseSubparts("[{ unclosed")).toEqual([]);
    expect(parseSubparts('"just a string"')).toEqual([]);
  });

  it("accurately computes subpartsTotalMarks and sumSubPartMarks across subparts", () => {
    expect(subpartsTotalMarks(validSubparts)).toBe(4);
    expect(subpartsTotalMarks([])).toBe(0);
    expect(sumSubPartMarks(validSubparts)).toBe(4);
    expect(sumSubPartMarks(null)).toBe(0);
  });

  it("validates subparts sum against expected total marks", () => {
    expect(validateSubPartsSum(validSubparts, 4)).toBe(true);
    expect(validateSubPartsSum(validSubparts, 5)).toBe(false);
    expect(validateSubPartsSum([], 0)).toBe(true);
  });

  it("validates subparts with subPartSchema", () => {
    const valid = subPartSchema.parse({
      label: "i",
      text: "Explain osmosis.",
      marks: 2,
      answer: "Net movement of water molecules.",
    });
    expect(valid.marks).toBe(2);
    expect(valid.label).toBe("i");

    // Negative marks or empty fields should fail
    expect(() => subPartSchema.parse({ label: "i", text: "Err", marks: -1 })).toThrow();
    expect(() => subPartSchema.parse({ label: "", text: "Err", marks: 1 })).toThrow();
    expect(() => subPartSchema.parse({ label: "i", text: "", marks: 1 })).toThrow();
  });
});

describe("Milestone 1: Question Numbering Styles", () => {
  it("formats CONTINUOUS style: 1, 2, 3...", () => {
    expect(formatQuestionNumber("CONTINUOUS", 0, "A", 0)).toBe("1");
    expect(formatQuestionNumber("CONTINUOUS", 9, "A", 9)).toBe("10");
    expect(formatQuestionNumber("CONTINUOUS", 15, "B", 5)).toBe("16");
  });

  it("formats PREFIXED style: Q.1, Q.2, Q.3...", () => {
    expect(formatQuestionNumber("PREFIXED", 0, "A", 0)).toBe("Q.1");
    expect(formatQuestionNumber("PREFIXED", 9, "A", 9)).toBe("Q.10");
  });

  it("formats SECTION_RELATIVE style: A1, A2... B1, B2...", () => {
    expect(formatQuestionNumber("SECTION_RELATIVE", 0, "A", 0)).toBe("A1");
    expect(formatQuestionNumber("SECTION_RELATIVE", 1, "A", 1)).toBe("A2");
    expect(formatQuestionNumber("SECTION_RELATIVE", 5, "B", 0)).toBe("B1");
    expect(formatQuestionNumber("SECTION_RELATIVE", 8, "C", 2)).toBe("C3");
  });
});

describe("Milestone 1: Constants & Enums Integrity", () => {
  it("includes CASE_STUDY in QUESTION_TYPES with a label", () => {
    expect(QUESTION_TYPES).toContain("CASE_STUDY");
    expect(QUESTION_TYPE_LABEL["CASE_STUDY"]).toBe("Case study / Multi-part");
  });

  it("has valid PRINT_DENSITIES matching specifications", () => {
    expect(PRINT_DENSITIES).toEqual(["COMPACT", "STANDARD", "COMFORTABLE"]);
    expect(DEFAULT_PRINT_DENSITY).toBe("STANDARD");
  });

  it("has valid NUMBERING_STYLES matching specifications", () => {
    expect(NUMBERING_STYLES).toEqual(["CONTINUOUS", "PREFIXED", "SECTION_RELATIVE"]);
    expect(DEFAULT_NUMBERING_STYLE).toBe("CONTINUOUS");
  });

  it("has valid MARKS_STYLES matching specifications", () => {
    expect(MARKS_STYLES).toEqual(["INLINE", "RIGHT_COLUMN", "SUPPRESSED"]);
    expect(DEFAULT_MARKS_STYLE).toBe("INLINE");
  });

  it("defaults academic session to 2025–26", () => {
    expect(DEFAULT_ACADEMIC_SESSION).toBe("2025–26");
  });
});

describe("Milestone 1: DTO Mapping & Safe Fallbacks", () => {
  it("toQuestionDto safely parses subpartsJson and exposes subparts", () => {
    const rawQuestion: Question = {
      id: "q-sub-1",
      bookId: "b1",
      chapterId: "c1",
      type: "CASE_STUDY",
      text: "Read the case below and answer the questions.",
      optionsJson: "[]",
      subpartsJson: JSON.stringify([
        { label: "1", text: "Part 1", marks: 1 },
        { label: "2", text: "Part 2", marks: 2 },
      ]),
      answer: "",
      difficulty: "HARD",
      cognitiveLevel: null,
      explanation: null,
      figureScene: null,
      imagePath: null,
      spaceMm: 0,
      showGrid: false,
      createdById: "u1",
      createdAt: new Date("2026-01-01"),
    };

    const dto = toQuestionDto(rawQuestion);
    expect(dto.subparts).toBeDefined();
    expect(dto.subparts.length).toBe(2);
    expect(dto.subparts[0].marks).toBe(1);
    expect(dto.subparts[1].marks).toBe(2);
  });

  it("toQuestionDto handles missing or null subpartsJson without crashing", () => {
    const legacyQuestion: Question = {
      id: "q-legacy",
      bookId: "b1",
      chapterId: "c1",
      type: "SHORT",
      text: "Legacy question text",
      optionsJson: "[]",
      subpartsJson: "",
      answer: "Legacy ans",
      difficulty: "EASY",
      cognitiveLevel: null,
      explanation: null,
      figureScene: null,
      imagePath: null,
      spaceMm: 20,
      showGrid: false,
      createdById: "u1",
      createdAt: new Date("2025-01-01"),
    };

    const dto = toQuestionDto(legacyQuestion);
    expect(dto.subparts).toEqual([]);
  });

  it("toQuestionDto maps usages when paperQuestions relation is included", () => {
    const questionWithUsage: Question & {
      paperQuestions: Array<{
        paperId: string;
        orQuestionId: string | null;
        paper: {
          title: string;
          paperSet: string;
          examDate: string;
          academicSession: string;
          blueprint: { book: { className: string } };
        };
      }>;
    } = {
      id: "q-used",
      bookId: "b1",
      chapterId: "c1",
      type: "SHORT",
      text: "Question text",
      optionsJson: "[]",
      subpartsJson: "[]",
      answer: "Ans",
      difficulty: "MEDIUM",
      cognitiveLevel: null,
      explanation: null,
      figureScene: null,
      imagePath: null,
      spaceMm: 0,
      showGrid: false,
      createdById: "u1",
      createdAt: new Date(),
      paperQuestions: [
        {
          paperId: "p-1",
          orQuestionId: null,
          paper: {
            title: "Pre-Board 2026",
            paperSet: "SET A",
            examDate: "2026-01-15",
            academicSession: "2025–26",
            blueprint: { book: { className: "Class 10" } },
          },
        },
      ],
    };

    const dto = toQuestionDto(questionWithUsage);
    expect(dto.usages).toBeDefined();
    expect(dto.usages?.length).toBe(1);
    expect(dto.usages?.[0].paperTitle).toBe("Pre-Board 2026");
    expect(dto.usages?.[0].isOrChoice).toBe(false);
  });

  it("toSnapshotDto formats created date as ISO string and preserves creator name", () => {
    const raw = {
      id: "snap-1",
      paperId: "p-1",
      name: "Checkpoint 1",
      snapshotJson: "{}",
      createdById: "u-1",
      createdAt: new Date("2026-10-15T10:00:00.000Z"),
      createdBy: { name: "Teacher Alice" },
    };
    const dto = toSnapshotDto(raw);
    expect(dto.createdAt).toBe("2026-10-15T10:00:00.000Z");
    expect(dto.createdByName).toBe("Teacher Alice");
  });

  it("toPaperDto provides default fallbacks for null or missing customization fields", () => {
    const rawPaper = {
      id: "paper-1",
      title: "Mid-Term",
      blueprintId: "bp-1",
      layout: "BOOKLET",
      schoolName: "Delhi Public School",
      createdById: "u-1",
      createdAt: new Date("2026-09-01"),
      updatedAt: new Date("2026-09-02"),
    };
    const dto = toPaperDto(rawPaper);
    expect(dto.academicSession).toBe("2025–26");
    expect(dto.printDensity).toBe("STANDARD");
    expect(dto.numberingStyle).toBe("CONTINUOUS");
    expect(dto.marksStyle).toBe("INLINE");
    expect(dto.twoColumn).toBe(false);
    expect(dto.showCandidateDetails).toBe(true);
    expect(dto.showSignatures).toBe(false);
  });

  it("toBlueprintDto preserves subjectCode", () => {
    const rawBp = {
      id: "bp-1",
      name: "Physics Blueprint",
      bookId: "b-1",
      examType: "ANNUAL",
      durationMin: 180,
      subjectCode: "042",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const dto = toBlueprintDto(rawBp);
    expect(dto.subjectCode).toBe("042");
  });
});

describe("Milestone 1: Zod Schemas & Backward Compatible Defaults", () => {
  it("paperCreateSchema populates all M1 default values when omitted", () => {
    const minimalInput = {
      title: "Mid-Term Examination",
      blueprintId: "bp-1",
      layout: "BOOKLET" as const,
      schoolName: "Delhi Public School",
    };

    const parsed = paperCreateSchema.parse(minimalInput);
    expect(parsed.academicSession).toBe("2025–26");
    expect(parsed.printDensity).toBe("STANDARD");
    expect(parsed.twoColumn).toBe(false);
    expect(parsed.numberingStyle).toBe("CONTINUOUS");
    expect(parsed.marksStyle).toBe("INLINE");
    expect(parsed.showCandidateDetails).toBe(true);
    expect(parsed.showSignatures).toBe(false);
    expect(parsed.targetPages).toBeNull();
    expect(parsed.logoPath).toBeNull();
    expect(parsed.schoolLogo).toBeNull();
  });

  it("paperCreateSchema accepts custom branding and density options", () => {
    const custom = {
      title: "Class 10 Pre-Board",
      blueprintId: "bp-1",
      layout: "PAGE" as const,
      schoolName: "St. Xavier's",
      academicSession: "2024–25",
      logoPath: "school-logo.png",
      printDensity: "COMPACT" as const,
      twoColumn: true,
      targetPages: 4,
      numberingStyle: "PREFIXED" as const,
      marksStyle: "RIGHT_COLUMN" as const,
      showCandidateDetails: false,
      showSignatures: false,
    };
    const parsed = paperCreateSchema.parse(custom);
    expect(parsed.printDensity).toBe("COMPACT");
    expect(parsed.numberingStyle).toBe("PREFIXED");
    expect(parsed.marksStyle).toBe("RIGHT_COLUMN");
    expect(parsed.twoColumn).toBe(true);
    expect(parsed.targetPages).toBe(4);
    expect(parsed.showCandidateDetails).toBe(false);
    expect(parsed.showSignatures).toBe(false);
  });

  it("paperUpdateSchema permits partial updates of customization fields", () => {
    const update = paperUpdateSchema.parse({
      printDensity: "COMPACT",
      twoColumn: true,
      numberingStyle: "PREFIXED",
    });

    expect(update.printDensity).toBe("COMPACT");
    expect(update.twoColumn).toBe(true);
    expect(update.numberingStyle).toBe("PREFIXED");
    expect(update.title).toBeUndefined();
  });

  it("blueprintSchema accepts subjectCode with default empty string", () => {
    const bpInput = {
      name: "CBSE Class 10 Physics",
      bookId: "book-1",
      examType: "ANNUAL" as const,
      durationMin: 180,
      chapters: [{ chapterId: "c1", marks: 20 }],
      sections: [{ title: "Section A", type: "MCQ" as const, count: 20, marksEach: 1 }],
    };

    const parsed = blueprintSchema.parse(bpInput);
    expect(parsed.subjectCode).toBe("");

    const withCode = blueprintSchema.parse({ ...bpInput, subjectCode: "086" });
    expect(withCode.subjectCode).toBe("086");
  });

  it("questionSchema validates CASE_STUDY question with subparts", () => {
    const res = questionSchema.safeParse({
      bookId: "b1",
      chapterId: "c1",
      type: "CASE_STUDY",
      text: "A seminar hall has 30 rows of seats...",
      subparts: [
        { label: "(i)", text: "Find seats in row 10", marks: 1 },
        { label: "(ii)", text: "Find total seats", marks: 2 },
        { label: "(iii)", text: "Find difference", marks: 1 },
      ],
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.subparts).toHaveLength(3);
    }
  });

  it("questionSchema defaults subparts to empty array when omitted", () => {
    const res = questionSchema.safeParse({
      bookId: "b1",
      chapterId: "c1",
      type: "SHORT",
      text: "State Ohm's Law.",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.subparts).toEqual([]);
    }
  });

  it("snapshotCreateSchema validates name length and requirements", () => {
    expect(snapshotCreateSchema.parse({ name: "Draft 1 — Pre-Moderation" }).name).toBe("Draft 1 — Pre-Moderation");
    expect(() => snapshotCreateSchema.parse({ name: "" })).toThrow();
  });

  it("snapshotPayloadSchema validates full serialized snapshot payload", () => {
    const payload = {
      paperId: "p1",
      title: "Mathematics Paper",
      layout: "BOOKLET" as const,
      schoolName: "Modern Academy",
      examDate: "2026-03-15",
      paperSet: "SET A",
      subjectCode: "041",
      generalInstructions: "All questions are compulsory.",
      academicSession: "2025–26",
      logoPath: null,
      schoolLogo: null,
      printDensity: "STANDARD" as const,
      twoColumn: false,
      targetPages: 4,
      numberingStyle: "CONTINUOUS" as const,
      marksStyle: "INLINE" as const,
      showCandidateDetails: true,
      showSignatures: true,
      items: [{ sectionId: "s1", position: 0, questionId: "q1" }],
      timestamp: new Date().toISOString(),
    };
    expect(snapshotPayloadSchema.safeParse(payload).success).toBe(true);
  });
});
