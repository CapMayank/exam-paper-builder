import { EXAM_TYPES, QUESTION_TYPES } from "./constants";
import type { Chapter } from "./types";

export interface ImportedSection {
  title: string;
  type: string;
  count: number;
  marksEach: number;
  instructions: string;
}

export interface ImportedChapterQuota {
  chapterNumber?: number;
  chapterTitle?: string;
  marks: number;
}

export interface BlueprintImportData {
  name: string;
  examType: string;
  durationMin: number;
  academicSession?: string;
  subjectCode?: string;
  sections: ImportedSection[];
  chapters: ImportedChapterQuota[];
}

export interface BlueprintImportResult {
  success: boolean;
  blueprint: BlueprintImportData;
  totalSectionMarks: number;
  totalChapterMarks: number;
  totalQuestions: number;
  errors: string[];
  warnings: string[];
}

export const SAMPLE_BLUEPRINT_JSON = `{
  "name": "Class 10 Science Annual Examination",
  "examType": "ANNUAL",
  "durationMin": 180,
  "academicSession": "2026–27",
  "subjectCode": "086",
  "sections": [
    {
      "title": "Section A",
      "instructions": "All questions are compulsory. Objective type questions carrying 1 mark each.",
      "questionTypes": [
        {
          "type": "MCQ",
          "count": 5,
          "marksEach": 1
        },
        {
          "type": "FILL_BLANK",
          "count": 5,
          "marksEach": 1
        },
        {
          "type": "TRUE_FALSE",
          "count": 5,
          "marksEach": 1
        },
        {
          "type": "SHORT",
          "count": 5,
          "marksEach": 1
        }
      ]
    },
    {
      "title": "Section B",
      "instructions": "Very short answer questions carrying 2 marks each. Answers should be in 30-50 words.",
      "questionTypes": [
        {
          "type": "SHORT",
          "count": 6,
          "marksEach": 2
        }
      ]
    },
    {
      "title": "Section C",
      "instructions": "Short answer questions carrying 3 marks each. Answers should be in 50-80 words.",
      "questionTypes": [
        {
          "type": "SHORT",
          "count": 7,
          "marksEach": 3
        }
      ]
    },
    {
      "title": "Section D",
      "instructions": "Long answer questions carrying 5 marks each. Internal choice is provided.",
      "questionTypes": [
        {
          "type": "LONG",
          "count": 3,
          "marksEach": 5
        }
      ]
    },
    {
      "title": "Section E",
      "instructions": "Case-based integrated questions carrying 4 marks each with sub-parts.",
      "questionTypes": [
        {
          "type": "CASE_STUDY",
          "count": 3,
          "marksEach": 4
        }
      ]
    }
  ],
  "chapters": [
    { "chapterNumber": 1, "marks": 6 },
    { "chapterNumber": 2, "marks": 6 },
    { "chapterNumber": 3, "marks": 7 },
    { "chapterNumber": 4, "marks": 6 },
    { "chapterNumber": 5, "marks": 5 },
    { "chapterNumber": 6, "marks": 8 },
    { "chapterNumber": 7, "marks": 6 },
    { "chapterNumber": 8, "marks": 6 },
    { "chapterNumber": 9, "marks": 7 },
    { "chapterNumber": 10, "marks": 8 },
    { "chapterNumber": 11, "marks": 7 },
    { "chapterNumber": 12, "marks": 8 }
  ]
}`;

export const SAMPLE_BLUEPRINT_CSV = `# METADATA
Name,Class 10 Science Annual Examination
ExamType,ANNUAL
DurationMinutes,180
AcademicSession,2026–27
SubjectCode,086

# SECTIONS
# Tip: Multiple question types in the same section can be specified by repeating the SectionTitle or leaving it blank on continuation rows.
SectionTitle,Type,QuestionCount,MarksEach,Instructions
Section A,MCQ,5,1,All questions are compulsory. Objective questions carrying 1 mark each
Section A,FILL_BLANK,5,1,Fill in the blanks carrying 1 mark each
Section A,TRUE_FALSE,5,1,True / False questions carrying 1 mark each
Section A,SHORT,5,1,Very short answer / one word questions carrying 1 mark each
Section B,SHORT,6,2,Very short answer questions carrying 2 marks each
Section C,SHORT,7,3,Short answer questions carrying 3 marks each
Section D,LONG,3,5,Long answer questions carrying 5 marks each
Section E,CASE_STUDY,3,4,Case based integrated questions with sub-parts

# CHAPTERS
ChapterNumber,Marks
1,6
2,6
3,7
4,6
5,5
6,8
7,6
8,6
9,7
10,8
11,7
12,8
`;

export function normalizeQuestionType(typeStr: string): string {
  const raw = (typeStr || "").trim();
  const t = raw.toUpperCase().replace(/[\s-_/]+/g, "");

  // Check exact match against QUESTION_TYPES first
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const exactMatched = (QUESTION_TYPES as readonly string[]).find(
    (qt) => clean(qt) === clean(raw) || qt.toUpperCase() === t
  );
  if (exactMatched) return exactMatched;

  if (t.includes("ASSERTION") || t === "AR") return "ASSERTION_REASON";
  if (t.includes("MATCH") || t.includes("JODI") || t.includes("SUMELIT")) return "MATCH_COLUMN";
  if (t.includes("UNSEEN") || t.includes("APATHIT")) return "UNSEEN_PASSAGE";
  if (t.includes("SANDARBH") || t.includes("PRASANG") || t.includes("VYAKHYA") || t.includes("REFERENCE")) return "REFERENCE_CONTEXT";
  if (t.includes("WRITING") || t.includes("LETTER") || t.includes("PATRA") || t.includes("NIBANDH")) return "WRITING_SKILL";
  if (t.includes("GRAMMAR") || t.includes("VYAKARAN") || t.includes("DIRECTED")) return "GRAMMAR";
  if (t.includes("MAP") || t.includes("MANCHITRA")) return "MAP_WORK";
  if (t.includes("MCQ") || t.includes("CHOICE") || t.includes("OBJECTIVE")) return "MCQ";
  if (t.includes("FILL") || t.includes("BLANK") || t === "FIB") return "FILL_BLANK";
  if (t.includes("TRUE") || t.includes("FALSE") || t === "TF") return "TRUE_FALSE";
  if (t.includes("DRAW") || t.includes("DIAGRAM") || t.includes("SKETCH") || t.includes("FIGURE")) return "DRAW";
  if (t.includes("CASE") || t.includes("PASSAGE") || t.includes("SOURCE") || t.includes("COMPREHENSION")) return "CASE_STUDY";
  if (t.includes("LONG") || t === "LA") return "LONG";
  if (t.includes("SHORT") || t.includes("ONEWORD") || t.includes("VERYSHORT") || t === "SA" || t === "VSA") return "SHORT";

  return "MCQ";
}

export function normalizeExamType(examStr: string): string {
  const e = (examStr || "").trim().toUpperCase().replace(/[\s-_]+/g, "");
  if (e.includes("UNIT") || e === "UT") return "UNIT_TEST";
  if (e.includes("PERIODIC") || e === "PT") return "PERIODIC";
  if (e.includes("QUARTER")) return "QUARTERLY";
  if (e.includes("HALF") || e.includes("MID")) return "HALF_YEARLY";
  if (e.includes("PRE")) return "PRE_BOARD";
  if (e.includes("FINAL")) return "FINAL";
  if (e.includes("ANNUAL")) return "ANNUAL";
  const matched = (EXAM_TYPES as readonly string[]).find((et) => et.toUpperCase() === e);
  return matched || "ANNUAL";
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseBlueprintImport(
  rawContent: string,
  preferredFormat: "auto" | "json" | "csv" = "auto"
): BlueprintImportResult {
  const trimmed = rawContent.trim();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!trimmed) {
    return {
      success: false,
      blueprint: {
        name: "",
        examType: "ANNUAL",
        durationMin: 180,
        sections: [],
        chapters: [],
      },
      totalSectionMarks: 0,
      totalChapterMarks: 0,
      totalQuestions: 0,
      errors: ["Input is empty. Please upload or paste a JSON or CSV blueprint."],
      warnings: [],
    };
  }

  const isJson =
    preferredFormat === "json" ||
    (preferredFormat === "auto" && (trimmed.startsWith("{") || trimmed.startsWith("[")));

  if (isJson) {
    try {
      const parsed = JSON.parse(trimmed);
      return parseJsonBlueprint(parsed);
    } catch (err) {
      if (preferredFormat === "json") {
        return {
          success: false,
          blueprint: {
            name: "",
            examType: "ANNUAL",
            durationMin: 180,
            sections: [],
            chapters: [],
          },
          totalSectionMarks: 0,
          totalChapterMarks: 0,
          totalQuestions: 0,
          errors: [`Invalid JSON: ${(err as Error).message}`],
          warnings: [],
        };
      }
      // If auto, try CSV parsing before completely failing
      return parseCsvBlueprint(trimmed);
    }
  } else {
    return parseCsvBlueprint(trimmed);
  }
}

function parseJsonBlueprint(parsed: any): BlueprintImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Can be top-level object or array of sections
  const root = Array.isArray(parsed) ? { sections: parsed } : parsed;

  const name = typeof root.name === "string" ? root.name.trim() : "";
  const examType = normalizeExamType(root.examType || "ANNUAL");
  const durationMin = Number(root.durationMin || root.duration || 180) || 180;
  const academicSession = typeof root.academicSession === "string" ? root.academicSession.trim() : undefined;
  const subjectCode = typeof root.subjectCode === "string" ? root.subjectCode.trim() : undefined;

  const sections: ImportedSection[] = [];
  const rawSections = Array.isArray(root.sections) ? root.sections : [];

  if (rawSections.length === 0) {
    errors.push("No sections found in the uploaded file. Please define at least one section.");
  } else {
    rawSections.forEach((s: any, idx: number) => {
      const title = (s.title || s.name || `Section ${String.fromCharCode(65 + idx)}`).toString().trim();
      const instructions = (s.instructions || s.instruction || "").toString().trim();

      // Check if this section defines multiple question types via questionTypes / questions / types
      const rawTypes = Array.isArray(s.questionTypes)
        ? s.questionTypes
        : Array.isArray(s.questions) && s.questions.length > 0 && typeof s.questions[0] === "object"
        ? s.questions
        : Array.isArray(s.types)
        ? s.types
        : null;

      if (rawTypes && rawTypes.length > 0) {
        rawTypes.forEach((qt: any) => {
          const type = normalizeQuestionType(qt.type || qt.questionType || "MCQ");
          const count = Math.max(1, Math.floor(Number(qt.count || qt.questions || qt.totalQuestions || 1)));
          const marksEach = Math.max(1, Math.floor(Number(qt.marksEach || qt.marks || qt.markEach || 1)));
          const itemInstructions = (qt.instructions || qt.instruction || instructions).toString().trim();

          sections.push({
            title,
            type,
            count,
            marksEach,
            instructions: itemInstructions,
          });
        });
      } else {
        const type = normalizeQuestionType(s.type || s.questionType || "MCQ");
        const count = Math.max(1, Math.floor(Number(s.count || s.questions || s.totalQuestions || 1)));
        const marksEach = Math.max(1, Math.floor(Number(s.marksEach || s.marks || s.markEach || 1)));

        sections.push({
          title,
          type,
          count,
          marksEach,
          instructions,
        });
      }
    });
  }

  const chapters: ImportedChapterQuota[] = [];
  const rawChapters = Array.isArray(root.chapters) ? root.chapters : [];
  rawChapters.forEach((c: any) => {
    const chapterNumber = c.chapterNumber != null ? Number(c.chapterNumber) : c.number != null ? Number(c.number) : undefined;
    const chapterTitle = c.chapterTitle || c.title || c.name || undefined;
    const marks = Math.max(0, Math.floor(Number(c.marks || c.weightage || 0)));

    if (chapterNumber != null || chapterTitle) {
      chapters.push({
        chapterNumber: !isNaN(chapterNumber!) ? chapterNumber : undefined,
        chapterTitle: chapterTitle ? String(chapterTitle).trim() : undefined,
        marks,
      });
    }
  });

  const totalSectionMarks = sections.reduce((acc, s) => acc + s.count * s.marksEach, 0);
  const totalChapterMarks = chapters.reduce((acc, c) => acc + c.marks, 0);
  const totalQuestions = sections.reduce((acc, s) => acc + s.count, 0);

  if (chapters.length > 0 && totalSectionMarks !== totalChapterMarks) {
    warnings.push(
      `Mark discrepancy: Section marks total ${totalSectionMarks}m, but chapter weightages total ${totalChapterMarks}m (${Math.abs(
        totalSectionMarks - totalChapterMarks
      )}m difference).`
    );
  }

  return {
    success: errors.length === 0,
    blueprint: {
      name,
      examType,
      durationMin,
      academicSession,
      subjectCode,
      sections,
      chapters,
    },
    totalSectionMarks,
    totalChapterMarks,
    totalQuestions,
    errors,
    warnings,
  };
}

function parseCsvBlueprint(csvText: string): BlueprintImportResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim());
  const errors: string[] = [];
  const warnings: string[] = [];

  let currentBlock: "METADATA" | "SECTIONS" | "CHAPTERS" | "NONE" = "NONE";
  let name = "";
  let examType = "ANNUAL";
  let durationMin = 180;
  let academicSession: string | undefined;
  let subjectCode: string | undefined;
  const sections: ImportedSection[] = [];
  const chapters: ImportedChapterQuota[] = [];

  let sectionsHeaderSkipped = false;
  let chaptersHeaderSkipped = false;
  let lastSectionTitle = "";
  let lastInstructions = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    // Detect section headers
    const upper = rawLine.toUpperCase();
    if (upper.startsWith("# METADATA") || upper === "[METADATA]") {
      currentBlock = "METADATA";
      continue;
    }
    if (upper.startsWith("# SECTIONS") || upper === "[SECTIONS]") {
      currentBlock = "SECTIONS";
      sectionsHeaderSkipped = false;
      continue;
    }
    if (upper.startsWith("# CHAPTERS") || upper === "[CHAPTERS]") {
      currentBlock = "CHAPTERS";
      chaptersHeaderSkipped = false;
      continue;
    }

    if (rawLine.startsWith("#")) {
      // Ignored comment
      continue;
    }

    const parts = parseCSVLine(rawLine);
    if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

    if (currentBlock === "METADATA") {
      const key = (parts[0] || "").toLowerCase().replace(/[\s-_]/g, "");
      const val = parts[1] || "";
      if (key === "name" || key === "blueprintname" || key === "title") {
        name = val;
      } else if (key === "examtype" || key === "exam") {
        examType = normalizeExamType(val);
      } else if (key === "duration" || key === "durationminutes" || key === "durationmin") {
        durationMin = Number(val) || 180;
      } else if (key === "academicsession" || key === "session") {
        academicSession = val;
      } else if (key === "subjectcode" || key === "code") {
        subjectCode = val;
      }
    } else if (currentBlock === "SECTIONS") {
      if (!sectionsHeaderSkipped) {
        const firstCol = (parts[0] || "").toLowerCase().replace(/[\s-_]/g, "");
        if (firstCol === "sectiontitle" || firstCol === "sectionname" || firstCol === "title" || firstCol === "section") {
          sectionsHeaderSkipped = true;
          continue;
        }
        sectionsHeaderSkipped = true;
      }

      if (parts.length >= 3) {
        let title = (parts[0] || "").trim();
        const rawType = parts[1] || "";
        const count = Math.max(1, Math.floor(Number(parts[2]) || 1));
        const marksEach = Math.max(1, Math.floor(Number(parts[3]) || 1));
        const instructions = (parts[4] || "").trim();

        // If title is empty, inherit from previous section row
        if (!title && lastSectionTitle) {
          title = lastSectionTitle;
        } else if (!title) {
          title = `Section ${String.fromCharCode(65 + sections.length)}`;
        }
        lastSectionTitle = title;
        if (instructions) {
          lastInstructions = instructions;
        }

        sections.push({
          title,
          type: normalizeQuestionType(rawType || "MCQ"),
          count,
          marksEach,
          instructions: instructions || lastInstructions,
        });
      }
    } else if (currentBlock === "CHAPTERS") {
      if (!chaptersHeaderSkipped) {
        const firstCol = parts[0]?.toLowerCase() || "";
        if (firstCol.includes("chapter") || firstCol.includes("number") || firstCol.includes("title")) {
          chaptersHeaderSkipped = true;
          continue;
        }
        chaptersHeaderSkipped = true;
      }

      if (parts.length >= 2) {
        const first = parts[0];
        const numVal = Number(first);
        const marks = Math.max(0, Math.floor(Number(parts[1]) || 0));

        if (!isNaN(numVal)) {
          chapters.push({ chapterNumber: numVal, marks });
        } else {
          chapters.push({ chapterTitle: first, marks });
        }
      }
    } else {
      // If no explicit block was defined, try heuristics
      const firstCol = parts[0]?.toLowerCase() || "";
      if (firstCol.startsWith("section") || firstCol === "title" || parts.length >= 4) {
        // Looks like sections table
        currentBlock = "SECTIONS";
        if (firstCol.includes("title") || firstCol.includes("name")) {
          continue;
        }
        const title = parts[0] || `Section ${String.fromCharCode(65 + sections.length)}`;
        const type = normalizeQuestionType(parts[1] || "MCQ");
        const count = Math.max(1, Math.floor(Number(parts[2]) || 1));
        const marksEach = Math.max(1, Math.floor(Number(parts[3]) || 1));
        const instructions = parts[4] || "";
        sections.push({ title, type, count, marksEach, instructions });
      } else if (parts.length === 2 && (parts[0].toLowerCase().includes("name") || parts[0].toLowerCase().includes("exam"))) {
        // Looks like metadata line
        const key = parts[0].toLowerCase().replace(/[\s-_]/g, "");
        const val = parts[1];
        if (key.includes("name")) name = val;
        if (key.includes("exam")) examType = normalizeExamType(val);
      }
    }
  }

  if (sections.length === 0) {
    errors.push("No valid sections could be extracted from the CSV. Ensure rows match: SectionTitle,Type,QuestionCount,MarksEach,Instructions");
  }

  const totalSectionMarks = sections.reduce((acc, s) => acc + s.count * s.marksEach, 0);
  const totalChapterMarks = chapters.reduce((acc, c) => acc + c.marks, 0);
  const totalQuestions = sections.reduce((acc, s) => acc + s.count, 0);

  if (chapters.length > 0 && totalSectionMarks !== totalChapterMarks) {
    warnings.push(
      `Mark discrepancy: Section marks total ${totalSectionMarks}m, but chapter weightages total ${totalChapterMarks}m (${Math.abs(
        totalSectionMarks - totalChapterMarks
      )}m difference).`
    );
  }

  return {
    success: errors.length === 0,
    blueprint: {
      name,
      examType,
      durationMin,
      academicSession,
      subjectCode,
      sections,
      chapters,
    },
    totalSectionMarks,
    totalChapterMarks,
    totalQuestions,
    errors,
    warnings,
  };
}

/**
 * Matches imported chapter numbers or titles to book chapters and returns
 * a record of { [chapterId]: marks }.
 */
export function matchChaptersToBook(
  importedChapters: ImportedChapterQuota[],
  bookChapters: Chapter[]
): { marksMap: Record<string, number>; matchedCount: number; unmatchedCount: number } {
  const marksMap: Record<string, number> = {};
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const imp of importedChapters) {
    let matchedChapter: Chapter | undefined;

    if (imp.chapterNumber != null) {
      matchedChapter = bookChapters.find((bc) => bc.number === imp.chapterNumber);
    }

    if (!matchedChapter && imp.chapterTitle) {
      const cleanTitle = imp.chapterTitle.trim().toLowerCase();
      matchedChapter = bookChapters.find(
        (bc) =>
          bc.title.trim().toLowerCase() === cleanTitle ||
          bc.title.trim().toLowerCase().includes(cleanTitle) ||
          cleanTitle.includes(bc.title.trim().toLowerCase())
      );
    }

    if (matchedChapter) {
      marksMap[matchedChapter.id] = imp.marks;
      matchedCount++;
    } else {
      unmatchedCount++;
    }
  }

  return { marksMap, matchedCount, unmatchedCount };
}
