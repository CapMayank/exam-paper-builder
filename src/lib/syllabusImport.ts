/**
 * Syllabus & Book Import Parser & Utilities
 * Supports:
 * 1. CSV (tabular books & chapters)
 * 2. JSON (hierarchical or flat)
 * 3. Text / Freeform syllabus paste (with auto chapter numbering)
 * 4. Standard Curricula Presets (CBSE/NCERT)
 */

export interface ParsedChapterItem {
  number: number;
  title: string;
}

export interface ParsedBookItem {
  title: string;
  className: string;
  subject: string;
  academicSession?: string;
  chapters: ParsedChapterItem[];
}

export interface SyllabusImportError {
  row?: number;
  field?: string;
  message: string;
}

export interface SyllabusImportResult {
  books: ParsedBookItem[];
  errors: SyllabusImportError[];
  warnings: string[];
}

export interface StandardCurriculumPreset {
  id: string;
  title: string;
  className: string;
  subject: string;
  board: string;
  description: string;
  isComposite?: boolean;
  subBooks?: string[];
  chapters: ParsedChapterItem[];
}

import { STANDARD_CURRICULUM_PRESETS } from "./curriculumPresets";
import { getCanonicalSubjectName } from "./schoolCurriculum";
export { STANDARD_CURRICULUM_PRESETS };

/**
 * Robust CSV Line Parser that respects quoted fields and commas inside quotes.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split(/\r?\n/);
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === "\\" && line[j + 1] === '"') {
        currentField += '"';
        j++;
      } else if (char === '"') {
        if (insideQuotes && line[j + 1] === '"') {
          currentField += '"';
          j++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }

    if (!insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += "\n";
    }
  }

  return rows;
}

/**
 * Parses freeform syllabus text.
 * Detects headers like "Book: ...", "Class: ...", "Subject: ...".
 * Parses numbered chapter lines e.g. "1. Motion", "Chapter 2: Force", "Ch 3 - Energy".
 * If chapter numbers are omitted, sequentially numbers them.
 */
export function parseTextSyllabus(
  text: string,
  defaults: { defaultTitle?: string; defaultClass?: string; defaultSubject?: string } = {},
): SyllabusImportResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errors: SyllabusImportError[] = [];
  const warnings: string[] = [];

  let bookTitle = defaults.defaultTitle || "";
  let className = defaults.defaultClass || "";
  let subject = defaults.defaultSubject || "";

  const chapters: ParsedChapterItem[] = [];
  let autoNumber = 1;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Check for Book / Title header
    const titleMatch = line.match(/^(?:Book|Textbook|Title)\s*:\s*(.+)$/i);
    if (titleMatch) {
      bookTitle = titleMatch[1].trim();
      continue;
    }

    // Check for Class / Grade header
    const classMatch = line.match(/^(?:Class|Grade)\s*:\s*(.+)$/i);
    if (classMatch) {
      className = classMatch[1].trim();
      continue;
    }

    // Check for Subject header
    const subjectMatch = line.match(/^(?:Subject)\s*:\s*(.+)$/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      continue;
    }

    // Skip comments and divider lines
    if (line.startsWith("#") || line.startsWith("//") || /^[-=_*]{3,}$/.test(line)) continue;

    // Skip general headings like "CBSE Class 10 Syllabus 2026-27"
    if (
      /^(?:CBSE|NCERT|ICSE|State Board|Syllabus|Curriculum|Course Outline|Table of Contents|Index)/i.test(line) &&
      !line.match(/^(?:Chapter|Ch|Unit|\d+[\.\:\-])/i)
    ) {
      continue;
    }

    // Check for chapter pattern:
    // e.g. "Chapter 1: Real Numbers", "Ch. 1 - Real Numbers", "1. Real Numbers", "1) Real Numbers", "1 - Real Numbers"
    const chapterMatch = line.match(/^(?:(?:Chapter|Ch|Unit)\s*)?(\d+)[\.\:\-\)\s]+(.+)$/i);
    if (chapterMatch) {
      const num = parseInt(chapterMatch[1], 10);
      const title = chapterMatch[2].trim();
      if (title) {
        chapters.push({ number: num, title });
        autoNumber = num + 1;
        continue;
      }
    }

    // If it's a non-empty text line without numbering, treat as an unnumbered chapter
    if (line.length > 1 && !line.includes(":")) {
      chapters.push({ number: autoNumber++, title: line });
      warnings.push(`Auto-assigned Chapter ${autoNumber - 1} to unnumbered line: "${line}"`);
    }
  }

  if (chapters.length === 0) {
    errors.push({ message: "No chapters detected in the provided syllabus text." });
    return { books: [], errors, warnings };
  }

  if (!bookTitle) bookTitle = "Imported Textbook";
  if (!className) className = "Class 10";
  subject = getCanonicalSubjectName(subject) || subject || "General";

  // Check for duplicate chapter numbers
  const seenNumbers = new Set<number>();
  for (const ch of chapters) {
    if (seenNumbers.has(ch.number)) {
      warnings.push(`Duplicate chapter number ${ch.number} detected for "${ch.title}". It will overwrite earlier entry.`);
    }
    seenNumbers.add(ch.number);
  }

  return {
    books: [
      {
        title: bookTitle,
        className,
        subject,
        chapters: chapters.sort((a, b) => a.number - b.number),
      },
    ],
    errors,
    warnings,
  };
}

/**
 * Parses CSV formatted syllabus / textbook content.
 */
export function parseCsvSyllabus(
  csvText: string,
  defaults: { defaultTitle?: string; defaultClass?: string; defaultSubject?: string } = {},
): SyllabusImportResult {
  const rows = parseCsvRows(csvText);
  const errors: SyllabusImportError[] = [];
  const warnings: string[] = [];

  if (rows.length < 2) {
    errors.push({ message: "CSV content must contain at least a header row and one data row." });
    return { books: [], errors, warnings };
  }

  const headerRow = rows[0].map((h) => h.toLowerCase().trim());
  const findCol = (candidates: string[]) => headerRow.findIndex((h) => candidates.includes(h));

  const hasExplicitBookCol = headerRow.some((h) =>
    ["book", "textbook", "book title", "book_title", "book name"].includes(h),
  );
  const hasExplicitChTitleCol = headerRow.some((h) =>
    ["chapter title", "chapter_title", "chapter name", "chapter_name"].includes(h),
  );

  const titleCol = hasExplicitBookCol
    ? findCol(["book", "textbook", "book title", "book_title", "book name"])
    : hasExplicitChTitleCol
      ? findCol(["title", "book"])
      : -1;

  const classCol = findCol(["class", "classname", "class_name", "grade"]);
  const subjectCol = findCol(["subject"]);
  const numCol = findCol(["chapter", "chapterno", "chapter number", "number", "ch_number", "no"]);

  const chTitleCol = hasExplicitChTitleCol
    ? findCol(["chapter title", "chapter_title", "chapter name", "chapter_name"])
    : findCol(["chapter title", "chapter_title", "title", "chapter name", "chapter_name", "name"]);

  if (numCol === -1 && chTitleCol === -1) {
    errors.push({
      message:
        "CSV must include columns for Chapter Number ('Chapter' or 'Number') and Chapter Title ('Chapter Title' or 'Name').",
    });
    return { books: [], errors, warnings };
  }

  const booksMap = new Map<string, ParsedBookItem>();
  let fallbackAutoNum = 1;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c.trim())) continue;

    const rowBookTitle = (titleCol !== -1 ? row[titleCol] : "") || defaults.defaultTitle || "Imported Textbook";
    const rowClass = (classCol !== -1 ? row[classCol] : "") || defaults.defaultClass || "Class 10";
    const rawSubject = (subjectCol !== -1 ? row[subjectCol] : "") || defaults.defaultSubject || "General";
    const rowSubject = getCanonicalSubjectName(rawSubject) || rawSubject;

    let chNum: number;
    if (numCol !== -1 && row[numCol]) {
      const parsed = parseInt(row[numCol].replace(/\D/g, ""), 10);
      chNum = isNaN(parsed) ? fallbackAutoNum++ : parsed;
    } else {
      chNum = fallbackAutoNum++;
    }

    const chTitle =
      (chTitleCol !== -1 && chTitleCol !== titleCol ? row[chTitleCol] : "") ||
      (numCol !== -1 && chTitleCol === titleCol ? row[titleCol] : "") ||
      `Chapter ${chNum}`;

    if (!chTitle.trim()) {
      warnings.push(`Row ${i + 1}: empty chapter title skipped.`);
      continue;
    }

    const bookKey = `${rowBookTitle}|${rowClass}|${rowSubject}`.toLowerCase();
    if (!booksMap.has(bookKey)) {
      booksMap.set(bookKey, {
        title: rowBookTitle,
        className: rowClass,
        subject: rowSubject,
        chapters: [],
      });
    }

    const bookItem = booksMap.get(bookKey)!;
    bookItem.chapters.push({ number: chNum, title: chTitle.trim() });
  }

  const books = Array.from(booksMap.values()).map((b) => ({
    ...b,
    chapters: b.chapters.sort((a, b) => a.number - b.number),
  }));

  if (books.length === 0) {
    errors.push({ message: "No valid textbooks or chapters could be parsed from the CSV file." });
  }

  return { books, errors, warnings };
}

/**
 * Parses JSON formatted syllabus / textbook content.
 */
export function parseJsonSyllabus(
  jsonText: string,
  defaults: { defaultTitle?: string; defaultClass?: string; defaultSubject?: string } = {},
): SyllabusImportResult {
  const errors: SyllabusImportError[] = [];
  const warnings: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    errors.push({ message: `Invalid JSON syntax: ${(err as Error).message}` });
    return { books: [], errors, warnings };
  }

  const books: ParsedBookItem[] = [];

  if (Array.isArray(parsed)) {
    // Check if it's an array of books or an array of chapters
    const first = parsed[0];
    if (first && typeof first === "object" && "chapters" in first && Array.isArray((first as Record<string, unknown>).chapters)) {
      // Array of books
      for (const item of parsed) {
        if (!item || typeof item !== "object") continue;
        const b = item as Record<string, unknown>;
        const title = String(b.title || defaults.defaultTitle || "Imported Textbook").trim();
        const className = String(b.className || defaults.defaultClass || "Class 10").trim();
        const rawSub = String(b.subject || defaults.defaultSubject || "General").trim();
        const subject = getCanonicalSubjectName(rawSub) || rawSub;
        const rawChapters = Array.isArray(b.chapters) ? b.chapters : [];

        const chapters: ParsedChapterItem[] = [];
        let autoNum = 1;
        for (const rc of rawChapters) {
          if (!rc || typeof rc !== "object") continue;
          const c = rc as Record<string, unknown>;
          const num = typeof c.number === "number" ? c.number : parseInt(String(c.number || autoNum), 10) || autoNum;
          const chTitle = String(c.title || `Chapter ${num}`).trim();
          chapters.push({ number: num, title: chTitle });
          autoNum = num + 1;
        }

        books.push({ title, className, subject, chapters: chapters.sort((a, b) => a.number - b.number) });
      }
    } else {
      // Array of chapters for a single book
      const chapters: ParsedChapterItem[] = [];
      let autoNum = 1;
      for (const rc of parsed) {
        if (!rc || typeof rc !== "object") continue;
        const c = rc as Record<string, unknown>;
        const num = typeof c.number === "number" ? c.number : parseInt(String(c.number || autoNum), 10) || autoNum;
        const title = String(c.title || c.name || `Chapter ${num}`).trim();
        chapters.push({ number: num, title });
        autoNum = num + 1;
      }
      const rawSub = defaults.defaultSubject || "General";
      books.push({
        title: defaults.defaultTitle || "Imported Textbook",
        className: defaults.defaultClass || "Class 10",
        subject: getCanonicalSubjectName(rawSub) || rawSub,
        chapters: chapters.sort((a, b) => a.number - b.number),
      });
    }
  } else if (parsed && typeof parsed === "object") {
    // Single book object
    const b = parsed as Record<string, unknown>;
    const title = String(b.title || defaults.defaultTitle || "Imported Textbook").trim();
    const className = String(b.className || defaults.defaultClass || "Class 10").trim();
    const rawSub = String(b.subject || defaults.defaultSubject || "General").trim();
    const subject = getCanonicalSubjectName(rawSub) || rawSub;
    const rawChapters = Array.isArray(b.chapters) ? b.chapters : [];

    const chapters: ParsedChapterItem[] = [];
    let autoNum = 1;
    for (const rc of rawChapters) {
      if (!rc || typeof rc !== "object") continue;
      const c = rc as Record<string, unknown>;
      const num = typeof c.number === "number" ? c.number : parseInt(String(c.number || autoNum), 10) || autoNum;
      const chTitle = String(c.title || `Chapter ${num}`).trim();
      chapters.push({ number: num, title: chTitle });
      autoNum = num + 1;
    }

    books.push({ title, className, subject, chapters: chapters.sort((a, b) => a.number - b.number) });
  } else {
    errors.push({ message: "JSON root must be an array or an object." });
  }

  return { books, errors, warnings };
}

/**
 * Main unified dispatcher to parse syllabus content across all supported formats.
 */
export function parseSyllabusContent(
  format: "preset" | "text" | "csv" | "json",
  content: string,
  defaults: { defaultTitle?: string; defaultClass?: string; defaultSubject?: string } = {},
): SyllabusImportResult {
  if (format === "preset") {
    const preset = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === content.trim());
    if (!preset) {
      return {
        books: [],
        errors: [{ message: `Curriculum preset "${content}" not found.` }],
        warnings: [],
      };
    }
    return {
      books: [
        {
          title: preset.title,
          className: preset.className,
          subject: preset.subject,
          chapters: [...preset.chapters],
        },
      ],
      errors: [],
      warnings: [],
    };
  }

  if (format === "csv") {
    return parseCsvSyllabus(content, defaults);
  }

  if (format === "json") {
    return parseJsonSyllabus(content, defaults);
  }

  // Fallback to text / freeform
  return parseTextSyllabus(content, defaults);
}
