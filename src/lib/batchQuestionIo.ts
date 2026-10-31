import {
  DIFFICULTIES,
  isKindergartenType,
  isMcqLikeType,
  isSubpartQuestionType,
  QUESTION_TYPES,
  type Difficulty,
  type QuestionType,
} from "./constants";
import type { QuestionDto } from "./dto";
import { parseSubparts, subpartsTotalMarks, type SubPart } from "./types";

export type BatchIoFormat = "csv" | "json";

export interface RawQuestionRow {
  rowNumber: number;
  text?: unknown;
  type?: unknown;
  marks?: unknown;
  difficulty?: unknown;
  answer?: unknown;
  explanation?: unknown;
  chapter?: unknown;
  chapterId?: unknown;
  chapterNumber?: unknown;
  chapterTitle?: unknown;
  options?: unknown;
  optionA?: unknown;
  optionB?: unknown;
  optionC?: unknown;
  optionD?: unknown;
  optionE?: unknown;
  optionF?: unknown;
  subparts?: unknown;
  spaceMm?: unknown;
  showGrid?: unknown;
  bloomsLevel?: unknown;
  tags?: unknown;
  [key: string]: unknown;
}

export interface ValidatedQuestionPayload {
  rowNumber: number;
  bookId: string;
  chapterId: string;
  type: QuestionType;
  text: string;
  options: string[];
  subparts: SubPart[];
  answer: string;
  difficulty: Difficulty;
  spaceMm: number;
  showGrid: boolean;
  marks?: number;
  bloomsLevel?: string;
  tags?: string[];
  explanation?: string;
}

export interface BatchImportError {
  rowNumber: number;
  field: string;
  error: string;
  rawContent?: string;
}

export interface DuplicateRecord {
  rowNumber: number;
  text: string;
  chapterId: string;
  existingQuestionId?: string;
}

export interface BatchImportReport {
  success: boolean;
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  errors: BatchImportError[];
  items: ValidatedQuestionPayload[];
  createdQuestions: QuestionDto[];
  duplicates: DuplicateRecord[];
}

export interface BatchParseOptions {
  bookId: string;
  chapterId?: string;
  chapters?: Array<{ id: string; number: number; title: string }>;
  existingQuestions?: Array<{ id: string; chapterId: string; text: string }>;
  skipDuplicates?: boolean;
  defaultType?: QuestionType;
}

export interface BatchImportOptions extends BatchParseOptions {
  format: BatchIoFormat;
  content: string;
  dryRun?: boolean;
  userId?: string;
}

// Header synonyms for tolerant CSV parsing
export const HEADER_SYNONYMS: Record<string, string> = {
  questiontext: "text",
  question: "text",
  prompt: "text",
  text: "text",
  q: "text",

  questiontype: "type",
  type: "type",
  qtype: "type",

  chapter: "chapter",
  chapterid: "chapterId",
  chapternumber: "chapterNumber",
  chapterno: "chapterNumber",
  chapternum: "chapterNumber",
  chaptertitle: "chapterTitle",
  chaptername: "chapterTitle",
  unit: "chapter",

  difficulty: "difficulty",
  diff: "difficulty",
  level: "difficulty",

  marks: "marks",
  mark: "marks",
  points: "marks",
  totalmarks: "marks",

  options: "options",
  choices: "options",
  optiona: "optionA",
  optionb: "optionB",
  optionc: "optionC",
  optiond: "optionD",
  optione: "optionE",
  optionf: "optionF",
  opta: "optionA",
  optb: "optionB",
  optc: "optionC",
  optd: "optionD",

  answer: "answer",
  ans: "answer",
  correctanswer: "answer",
  key: "answer",
  solution: "answer",
  explanation: "explanation",
  rationale: "explanation",

  subparts: "subparts",
  subquestions: "subparts",
  spacemm: "spaceMm",
  space: "spaceMm",
  showgrid: "showGrid",
  grid: "showGrid",
  bloomslevel: "bloomsLevel",
  blooms: "bloomsLevel",
  tags: "tags",
};

// Question type aliases
export const TYPE_ALIASES: Record<string, QuestionType> = {
  MCQ: "MCQ",
  MULTIPLE_CHOICE: "MCQ",
  MULTIPLECHOICE: "MCQ",
  CHOICE: "MCQ",
  ASSERTION_REASON: "ASSERTION_REASON",
  ASSERTION: "ASSERTION_REASON",
  ASSERTION_AND_REASON: "ASSERTION_REASON",
  AR: "ASSERTION_REASON",
  VERY_SHORT: "VERY_SHORT",
  VERY_SHORT_ANSWER: "VERY_SHORT",
  VERYSHORT: "VERY_SHORT",
  ONE_WORD: "VERY_SHORT",
  VSA: "VERY_SHORT",
  SHORT: "SHORT",
  SHORT_ANSWER: "SHORT",
  SHORTANSWER: "SHORT",
  SA: "SHORT",
  LONG: "LONG",
  LONG_ANSWER: "LONG",
  LONGANSWER: "LONG",
  LA: "LONG",
  ESSAY: "LONG",
  FILL_BLANK: "FILL_BLANK",
  FILL_IN_THE_BLANK: "FILL_BLANK",
  FILL_BLANKS: "FILL_BLANK",
  FILLBLANK: "FILL_BLANK",
  TRUE_FALSE: "TRUE_FALSE",
  TRUE_OR_FALSE: "TRUE_FALSE",
  TRUEFALSE: "TRUE_FALSE",
  TF: "TRUE_FALSE",
  MATCH_COLUMN: "MATCH_COLUMN",
  MATCH_THE_COLUMN: "MATCH_COLUMN",
  MATCH_THE_FOLLOWING: "MATCH_COLUMN",
  MATCHING: "MATCH_COLUMN",
  MATCH: "MATCH_COLUMN",
  DRAW: "DRAW",
  DIAGRAM: "DRAW",
  DRAWING: "DRAW",
  MAP_WORK: "MAP_WORK",
  MAP: "MAP_WORK",
  CASE_STUDY: "CASE_STUDY",
  CASE: "CASE_STUDY",
  CASE_BASED: "CASE_STUDY",
  CASEBASED: "CASE_STUDY",
  COMPREHENSION: "CASE_STUDY",
  UNSEEN_PASSAGE: "UNSEEN_PASSAGE",
  APATHIT_GADYANSH: "UNSEEN_PASSAGE",
  APATHIT_PADYANSH: "UNSEEN_PASSAGE",
  REFERENCE_CONTEXT: "REFERENCE_CONTEXT",
  REFERENCE_TO_CONTEXT: "REFERENCE_CONTEXT",
  SANDARBH_PRASANG: "REFERENCE_CONTEXT",
  VYAKHYA: "REFERENCE_CONTEXT",
  SAPRASANG_VYAKHYA: "REFERENCE_CONTEXT",
  WRITING_SKILL: "WRITING_SKILL",
  WRITING_SKILLS: "WRITING_SKILL",
  WRITING: "WRITING_SKILL",
  PATRA_LEKHAN: "WRITING_SKILL",
  NIBANDH: "WRITING_SKILL",
  GRAMMAR: "GRAMMAR",
  VYAKARAN: "GRAMMAR",
  DO_AS_DIRECTED: "GRAMMAR",
};

/**
 * Strips UTF-8 BOM and parses RFC 4180 CSV text.
 * Preserves newlines and commas within quoted strings.
 * Handles escaped quotes ("").
 */
export function parseCsvRecords(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && cleanText[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if (char === "\r" || char === "\n") {
        if (char === "\r" && i + 1 < len && cleanText[i + 1] === "\n") {
          i++;
        }
        currentRow.push(currentField);
        currentField = "";
        i++;

        if (currentRow.some((field) => field.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((field) => field.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Escapes a single CSV cell value per RFC 4180.
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes headers and rows into RFC 4180 CSV string.
 */
export function serializeCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Normalizes question text for duplicate detection.
 * Removes LaTeX text wrappers, collapses whitespace, lowers case.
 */
export function normalizeQuestionText(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/\\(text|mathrm|mathbf)\{([^}]+)\}/g, "$2")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fast chapter resolver by ID, number, or title.
 */
export class ChapterResolver {
  private byId = new Map<string, { id: string; number: number; title: string }>();
  private byNumber = new Map<number, { id: string; number: number; title: string }>();
  private byTitle = new Map<string, { id: string; number: number; title: string }>();

  constructor(
    chapters: Array<{ id: string; number: number; title: string }> = [],
    private defaultChapterId?: string,
  ) {
    for (const ch of chapters) {
      this.byId.set(ch.id.toLowerCase(), ch);
      this.byNumber.set(ch.number, ch);
      this.byTitle.set(ch.title.trim().toLowerCase(), ch);
    }
  }

  resolve(raw: RawQuestionRow): { chapterId?: string; error?: string } {
    // 1. Explicit chapterId match
    const rawId = String(raw.chapterId ?? "").trim();
    if (rawId && this.byId.has(rawId.toLowerCase())) {
      return { chapterId: this.byId.get(rawId.toLowerCase())!.id };
    }

    // 2. Chapter Number match
    const rawNum = raw.chapterNumber ?? raw.chapter;
    if (rawNum !== undefined && rawNum !== null && String(rawNum).trim() !== "") {
      const match = String(rawNum).match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (this.byNumber.has(num)) {
          return { chapterId: this.byNumber.get(num)!.id };
        }
      }
    }

    // 3. Chapter Title match
    const rawTitle = String(raw.chapterTitle ?? raw.chapter ?? "").trim().toLowerCase();
    if (rawTitle && this.byTitle.has(rawTitle)) {
      return { chapterId: this.byTitle.get(rawTitle)!.id };
    }

    // 4. Default fallback chapterId
    if (this.defaultChapterId) {
      if (this.byId.size === 0 || this.byId.has(this.defaultChapterId.toLowerCase())) {
        return { chapterId: this.byId.get(this.defaultChapterId.toLowerCase())?.id ?? this.defaultChapterId };
      }
    }

    // 5. If chapter list is empty (e.g. standalone test), accept identifier directly
    if (this.byId.size === 0) {
      if (rawId) return { chapterId: rawId };
      if (rawNum !== undefined && rawNum !== null && String(rawNum).trim() !== "") {
        const match = String(rawNum).match(/\d+/);
        if (match) return { chapterId: `ch_${match[0]}` };
        return { chapterId: String(rawNum).trim() };
      }
      if (rawTitle) return { chapterId: `ch_${rawTitle.replace(/\s+/g, "_")}` };
    }

    // 6. If chapter list has exactly 1 chapter and no chapter specified, use it
    if (this.byId.size === 1 && !raw.chapter && !raw.chapterNumber && !raw.chapterTitle && !raw.chapterId) {
      return { chapterId: Array.from(this.byId.values())[0].id };
    }

    const identifier = raw.chapterId || raw.chapterNumber || raw.chapterTitle || raw.chapter || "(none)";
    return {
      error: `Chapter '${identifier}' not found in target book. Please provide a valid chapter number, title, or ID.`,
    };
  }
}

/**
 * Parses pipe-delimited or JSON subparts string into SubPart[].
 * Supports formats like:
 * - JSON: '[{"label":"(i)","text":"...","marks":1}]'
 * - Text: '(i) State law [1m] | (ii) Solve problem [2m]'
 */
export function parseSubpartsField(val: unknown): { subparts: SubPart[]; error?: string } {
  if (!val) return { subparts: [] };
  if (Array.isArray(val)) {
    const list: SubPart[] = [];
    for (const item of val) {
      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        const label = String(obj.label || "").trim();
        const text = String(obj.text || "").trim();
        const marks = Number(obj.marks);
        if (!label || !text || !Number.isInteger(marks) || marks < 1) {
          return { subparts: [], error: "Each subpart must have non-empty label, text, and integer marks >= 1." };
        }
        list.push({
          label,
          text,
          marks,
          answer: obj.answer ? String(obj.answer).trim() : undefined,
          options: Array.isArray(obj.options) ? (obj.options as string[]) : undefined,
        });
      }
    }
    return { subparts: list };
  }

  const str = String(val).trim();
  if (!str) return { subparts: [] };

  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const parsed = JSON.parse(str);
      return parseSubpartsField(parsed);
    } catch {
      return { subparts: [], error: "Malformed subparts JSON array." };
    }
  }

  // Pipe-delimited string parsing: "(a) What is EMF? [1m] | (b) State Faraday's law [2m]"
  const parts = str.split("|").map((p) => p.trim()).filter(Boolean);
  const result: SubPart[] = [];

  for (let idx = 0; idx < parts.length; idx++) {
    const p = parts[idx];
    const marksMatch = p.match(/\[(\d+)\s*(?:m|marks?)?\]/i);
    const marks = marksMatch ? parseInt(marksMatch[1], 10) : 1;
    let clean = p.replace(/\[\d+\s*(?:m|marks?)?\]/i, "").trim();

    let label = `(${String.fromCharCode(97 + idx)})`;
    const labelMatch = clean.match(/^(\([a-z0-9ivx]+\)|[a-z0-9ivx]+\.|\([0-9]+\))\s*/i);
    if (labelMatch) {
      label = labelMatch[1].trim();
      clean = clean.slice(labelMatch[0].length).trim();
    }

    if (!clean) {
      return { subparts: [], error: `Subpart ${idx + 1} is missing question text.` };
    }

    result.push({
      label,
      text: clean,
      marks,
    });
  }

  return { subparts: result };
}

/**
 * Extracts and normalizes options for MCQ questions.
 */
export function extractOptions(raw: RawQuestionRow): string[] {
  const collected: string[] = [];

  // Dedicated columns Option A-F
  const directCols = [raw.optionA, raw.optionB, raw.optionC, raw.optionD, raw.optionE, raw.optionF];
  for (const opt of directCols) {
    if (opt !== undefined && opt !== null && String(opt).trim().length > 0) {
      collected.push(String(opt).trim());
    }
  }

  if (collected.length > 0) return collected;

  // Single options field
  if (raw.options !== undefined && raw.options !== null) {
    if (Array.isArray(raw.options)) {
      return raw.options.map((o) => String(o).trim()).filter(Boolean);
    }
    const optStr = String(raw.options).trim();
    if (optStr.startsWith("[") && optStr.endsWith("]")) {
      try {
        const parsed = JSON.parse(optStr);
        if (Array.isArray(parsed)) {
          return parsed.map((o) => String(o).trim()).filter(Boolean);
        }
      } catch {
        // Fall back to pipe splitting
      }
    }
    // Pipe or semicolon separated
    if (optStr.includes("|")) {
      return optStr.split("|").map((o) => o.trim()).filter(Boolean);
    }
    if (optStr.includes(";")) {
      return optStr.split(";").map((o) => o.trim()).filter(Boolean);
    }
    if (optStr.length > 0) {
      return [optStr];
    }
  }

  return [];
}

/**
 * Normalizes answer string against MCQ options.
 */
export function normalizeAnswer(rawAnswer: unknown, options: string[], type: QuestionType): string {
  const ansStr = rawAnswer !== undefined && rawAnswer !== null ? String(rawAnswer).trim() : "";
  if (!ansStr) return "";

  if (type === "MCQ" && options.length > 0) {
    const letters = "ABCDEF";
    const upper = ansStr.toUpperCase();

    // Direct letter A-F
    if (upper.length === 1 && letters.includes(upper)) {
      return upper;
    }

    // Number string (1-based index)
    const num = parseInt(ansStr, 10);
    if (!isNaN(num) && num >= 1 && num <= options.length && num <= letters.length) {
      return letters[num - 1];
    }

    // Option text match
    const textIdx = options.findIndex((o) => o.trim().toLowerCase() === ansStr.toLowerCase());
    if (textIdx >= 0 && textIdx < letters.length) {
      return letters[textIdx];
    }
  }

  return ansStr;
}

/**
 * Validates a single question row against schema.
 */
export function validateQuestionRow(
  raw: RawQuestionRow,
  options: BatchParseOptions,
  chapterResolver: ChapterResolver,
  seenInBatch: Set<string>,
  seenInDb: Map<string, string>, // key -> questionId
): { valid?: ValidatedQuestionPayload; error?: BatchImportError; duplicate?: DuplicateRecord } {
  const rowNumber = raw.rowNumber;

  // 1. Text validation (Required)
  const rawText = raw.text !== undefined && raw.text !== null ? String(raw.text).trim() : "";
  if (!rawText) {
    return {
      error: {
        rowNumber,
        field: "text",
        error: "Question text is required and cannot be empty.",
        rawContent: String(raw.text ?? ""),
      },
    };
  }

  // 2. Question Type validation
  let type: QuestionType = options.defaultType || "SHORT";
  if (raw.type !== undefined && raw.type !== null && String(raw.type).trim() !== "") {
    const rawTypeUpper = String(raw.type).trim().toUpperCase();
    if (TYPE_ALIASES[rawTypeUpper]) {
      type = TYPE_ALIASES[rawTypeUpper];
    } else {
      return {
        error: {
          rowNumber,
          field: "type",
          error: `Unknown question type '${raw.type}'. Must be one of: ${QUESTION_TYPES.join(", ")}.`,
          rawContent: String(raw.type),
        },
      };
    }
  }

  // 3. Marks validation (Must be positive integer >= 1)
  let marks: number | undefined = undefined;
  if (raw.marks !== undefined && raw.marks !== null && String(raw.marks).trim() !== "") {
    const num = Number(raw.marks);
    if (!Number.isInteger(num) || num < 1) {
      return {
        error: {
          rowNumber,
          field: "marks",
          error: "Marks must be positive integer >= 1.",
          rawContent: String(raw.marks),
        },
      };
    }
    marks = num;
  }

  // 4. Difficulty validation
  let difficulty: Difficulty = "MEDIUM";
  if (raw.difficulty !== undefined && raw.difficulty !== null && String(raw.difficulty).trim() !== "") {
    const diffUpper = String(raw.difficulty).trim().toUpperCase();
    if ((DIFFICULTIES as readonly string[]).includes(diffUpper)) {
      difficulty = diffUpper as Difficulty;
    } else {
      return {
        error: {
          rowNumber,
          field: "difficulty",
          error: `Invalid difficulty '${raw.difficulty}'. Must be EASY, MEDIUM, or HARD.`,
          rawContent: String(raw.difficulty),
        },
      };
    }
  }

  // 5. Options validation
  const extractedOpts = extractOptions(raw);
  const optionsList =
    type === "MCQ" || isMcqLikeType(type) || type === "MATCH_COLUMN" || isKindergartenType(type) || extractedOpts.length > 0
      ? extractedOpts
      : [];

  if (type === "MCQ") {
    if (optionsList.length < 2) {
      return {
        error: {
          rowNumber,
          field: "options",
          error: "MCQ question must provide at least 2 options.",
          rawContent: String(raw.options ?? ""),
        },
      };
    }
    if (optionsList.length > 6) {
      return {
        error: {
          rowNumber,
          field: "options",
          error: "MCQ question cannot exceed 6 options.",
          rawContent: String(raw.options ?? ""),
        },
      };
    }
  }

  // 6. Subparts validation (CASE_STUDY, UNSEEN_PASSAGE, REFERENCE_CONTEXT)
  let subparts: SubPart[] = [];
  if (isSubpartQuestionType(type) || raw.subparts) {
    const subRes = parseSubpartsField(raw.subparts);
    if (subRes.error) {
      return {
        error: {
          rowNumber,
          field: "subparts",
          error: subRes.error,
          rawContent: String(raw.subparts ?? ""),
        },
      };
    }
    subparts = subRes.subparts;

    if (subparts.length > 0 && marks !== undefined) {
      const sum = subpartsTotalMarks(subparts);
      if (isSubpartQuestionType(type) && sum !== marks) {
        return {
          error: {
            rowNumber,
            field: "subparts",
            error: `Subparts total marks (${sum}) does not match question marks (${marks}).`,
            rawContent: String(raw.subparts ?? ""),
          },
        };
      }
    } else if (marks === undefined && subparts.length > 0) {
      marks = subpartsTotalMarks(subparts);
    }
  }

  // 7. Chapter Resolution validation
  const chRes = chapterResolver.resolve(raw);
  if (chRes.error || !chRes.chapterId) {
    return {
      error: {
        rowNumber,
        field: "chapter",
        error: chRes.error || "Unable to resolve target chapter.",
        rawContent: String(raw.chapterId ?? raw.chapterNumber ?? raw.chapterTitle ?? raw.chapter ?? ""),
      },
    };
  }
  const chapterId = chRes.chapterId;

  // 8. Answer
  const answer = normalizeAnswer(raw.answer, optionsList, type);

  // 9. Space MM and Show Grid
  let spaceMm = 0;
  if (raw.spaceMm !== undefined && raw.spaceMm !== null && String(raw.spaceMm).trim() !== "") {
    const s = Number(raw.spaceMm);
    if (Number.isInteger(s) && s >= 0 && s <= 250) {
      spaceMm = s;
    }
  }
  const showGrid = Boolean(raw.showGrid === true || raw.showGrid === "true" || raw.showGrid === 1 || raw.showGrid === "1");

  // 10. Duplicate Detection
  const normalized = normalizeQuestionText(rawText);
  const dupKey = `${chapterId}:::${normalized}`;

  const isDbDup = seenInDb.has(dupKey);
  const isBatchDup = seenInBatch.has(dupKey);

  if (isDbDup || isBatchDup) {
    const existingId = seenInDb.get(dupKey);
    const dupRec: DuplicateRecord = {
      rowNumber,
      text: rawText,
      chapterId,
      existingQuestionId: existingId,
    };

    if (options.skipDuplicates) {
      return { duplicate: dupRec };
    } else {
      return {
        error: {
          rowNumber,
          field: "text",
          error: isBatchDup
            ? "Duplicate question detected within the batch import."
            : "Question with identical text already exists in this chapter.",
          rawContent: rawText,
        },
        duplicate: dupRec,
      };
    }
  }

  seenInBatch.add(dupKey);

  return {
    valid: {
      rowNumber,
      bookId: options.bookId,
      chapterId,
      type,
      text: rawText,
      options: optionsList,
      subparts,
      answer,
      difficulty,
      spaceMm,
      showGrid,
      marks,
      bloomsLevel: raw.bloomsLevel ? String(raw.bloomsLevel).trim() : undefined,
      explanation: raw.explanation ? String(raw.explanation).trim() : undefined,
    },
  };
}

/**
 * Parses and validates CSV question batch.
 */
export function parseQuestionCsv(csvText: string, options: BatchParseOptions): BatchImportReport {
  const records = parseCsvRecords(csvText);
  if (records.length === 0) {
    return {
      success: true,
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      errors: [],
      items: [],
      createdQuestions: [],
      duplicates: [],
    };
  }

  const headerRow = records[0];
  const headerKeys: (string | null)[] = headerRow.map((h) => {
    const clean = h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    return HEADER_SYNONYMS[clean] || clean || null;
  });

  const resolver = new ChapterResolver(options.chapters, options.chapterId);
  const seenInDb = new Map<string, string>();
  if (options.existingQuestions) {
    for (const q of options.existingQuestions) {
      seenInDb.set(`${q.chapterId}:::${normalizeQuestionText(q.text)}`, q.id);
    }
  }

  const seenInBatch = new Set<string>();
  const validItems: ValidatedQuestionPayload[] = [];
  const errors: BatchImportError[] = [];
  const duplicates: DuplicateRecord[] = [];

  for (let r = 1; r < records.length; r++) {
    const row = records[r];
    const rawRow: RawQuestionRow = { rowNumber: r + 1 };

    for (let c = 0; c < row.length; c++) {
      const key = headerKeys[c];
      if (key) {
        rawRow[key] = row[c];
      }
    }

    const { valid, error, duplicate } = validateQuestionRow(
      rawRow,
      options,
      resolver,
      seenInBatch,
      seenInDb,
    );

    if (error) {
      errors.push(error);
    }
    if (duplicate) {
      duplicates.push(duplicate);
    }
    if (valid) {
      validItems.push(valid);
    }
  }

  return {
    success: errors.length === 0,
    totalRows: records.length - 1,
    validCount: validItems.length,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    errors,
    items: validItems,
    createdQuestions: [],
    duplicates,
  };
}

/**
 * Parses and validates JSON question batch.
 */
export function parseQuestionJson(
  jsonInput: string | unknown[],
  options: BatchParseOptions,
): BatchImportReport {
  let array: unknown[];
  if (typeof jsonInput === "string") {
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        array = parsed;
      } else if (typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { questions?: unknown[] }).questions)) {
        array = (parsed as { questions: unknown[] }).questions;
      } else {
        return {
          success: false,
          totalRows: 0,
          validCount: 0,
          duplicateCount: 0,
          errorCount: 1,
          errors: [{ rowNumber: 1, field: "root", error: "JSON root must be an array of question objects." }],
          items: [],
          createdQuestions: [],
          duplicates: [],
        };
      }
    } catch (e) {
      return {
        success: false,
        totalRows: 0,
        validCount: 0,
        duplicateCount: 0,
        errorCount: 1,
        errors: [{ rowNumber: 1, field: "json", error: `Invalid JSON syntax: ${(e as Error).message}` }],
        items: [],
        createdQuestions: [],
        duplicates: [],
      };
    }
  } else if (Array.isArray(jsonInput)) {
    array = jsonInput;
  } else {
    return {
      success: false,
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      errorCount: 1,
      errors: [{ rowNumber: 1, field: "root", error: "JSON root must be an array of question objects." }],
      items: [],
      createdQuestions: [],
      duplicates: [],
    };
  }

  const resolver = new ChapterResolver(options.chapters, options.chapterId);
  const seenInDb = new Map<string, string>();
  if (options.existingQuestions) {
    for (const q of options.existingQuestions) {
      seenInDb.set(`${q.chapterId}:::${normalizeQuestionText(q.text)}`, q.id);
    }
  }

  const seenInBatch = new Set<string>();
  const validItems: ValidatedQuestionPayload[] = [];
  const errors: BatchImportError[] = [];
  const duplicates: DuplicateRecord[] = [];

  for (let idx = 0; idx < array.length; idx++) {
    const item = array[idx];
    const rowNumber = idx + 1;

    if (typeof item !== "object" || item === null) {
      errors.push({
        rowNumber,
        field: "item",
        error: "Question item must be a JSON object.",
        rawContent: String(item),
      });
      continue;
    }

    const raw = item as Record<string, unknown>;
    const rawRow: RawQuestionRow = {
      rowNumber,
      ...raw,
    };

    const { valid, error, duplicate } = validateQuestionRow(
      rawRow,
      options,
      resolver,
      seenInBatch,
      seenInDb,
    );

    if (error) {
      errors.push(error);
    }
    if (duplicate) {
      duplicates.push(duplicate);
    }
    if (valid) {
      validItems.push(valid);
    }
  }

  return {
    success: errors.length === 0,
    totalRows: array.length,
    validCount: validItems.length,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    errors,
    items: validItems,
    createdQuestions: [],
    duplicates,
  };
}

/**
 * Universal batch parser supporting CSV and JSON format.
 */
export function parseAndValidateBatch(opts: BatchImportOptions): BatchImportReport {
  if (opts.format === "csv") {
    return parseQuestionCsv(opts.content, opts);
  }
  return parseQuestionJson(opts.content, opts);
}

/**
 * Exports questions to CSV format with UTF-8 BOM.
 */
export function exportQuestionsToCsv(questions: QuestionDto[], _bookTitle?: string): string {
  const headers = [
    "Chapter Number",
    "Chapter Title",
    "Type",
    "Question Text",
    "Option A",
    "Option B",
    "Option C",
    "Option D",
    "Option E",
    "Option F",
    "Answer",
    "Subparts",
    "Difficulty",
    "Space (mm)",
    "Show Grid",
  ];

  const rows = questions.map((q) => {
    const optA = q.options[0] ?? "";
    const optB = q.options[1] ?? "";
    const optC = q.options[2] ?? "";
    const optD = q.options[3] ?? "";
    const optE = q.options[4] ?? "";
    const optF = q.options[5] ?? "";
    const subpartsStr = q.subparts && q.subparts.length > 0 ? JSON.stringify(q.subparts) : "";

    return [
      q.chapter?.number ?? "",
      q.chapter?.title ?? "",
      q.type,
      q.text,
      optA,
      optB,
      optC,
      optD,
      optE,
      optF,
      q.answer,
      subpartsStr,
      q.difficulty,
      q.spaceMm,
      q.showGrid,
    ];
  });

  const csvBody = serializeCsv(headers, rows);
  // Prepend UTF-8 BOM for Microsoft Excel compatibility
  return `\uFEFF${csvBody}`;
}

export const serializeQuestionsToCsv = exportQuestionsToCsv;

/**
 * Exports questions to formatted JSON.
 */
export function exportQuestionsToJson(
  questions: QuestionDto[],
  meta?: { bookTitle?: string; subject?: string; className?: string },
): string {
  const payload = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    book: meta,
    count: questions.length,
    questions: questions.map((q) => ({
      id: q.id,
      chapterNumber: q.chapter?.number,
      chapterTitle: q.chapter?.title,
      type: q.type,
      text: q.text,
      options: q.options,
      answer: q.answer,
      difficulty: q.difficulty,
      subparts: q.subparts,
      spaceMm: q.spaceMm,
      showGrid: q.showGrid,
    })),
  };

  return JSON.stringify(payload, null, 2);
}

export const serializeQuestionsToJson = exportQuestionsToJson;
