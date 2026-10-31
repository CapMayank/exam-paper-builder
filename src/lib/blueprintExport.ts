import { groupSectionsFromFlat } from "./blueprint";
import type { Blueprint, Chapter, Book } from "./types";

export interface BlueprintWithExportRelations {
  id?: string;
  name: string;
  examType: string;
  durationMin: number;
  academicSession?: string;
  subjectCode?: string;
  book?: {
    className?: string;
    subject?: string;
    title?: string;
  } | null;
  sections: Array<{
    id?: string;
    position?: number;
    title: string;
    instructions?: string;
    type: string;
    count: number;
    marksEach: number;
    orChoiceMode?: string;
    orAlternativeCount?: number;
    orSlotsJson?: string;
  }>;
  chapters: Array<{
    id?: string;
    chapterId?: string;
    marks: number;
    chapter?: {
      number?: number;
      title?: string;
    } | null;
  }>;
}

export interface ExportedBlueprintJson {
  name: string;
  examType: string;
  durationMin: number;
  academicSession: string;
  subjectCode: string;
  className: string;
  subject: string;
  sections: Array<{
    title: string;
    instructions: string;
    questionTypes: Array<{
      type: string;
      count: number;
      marksEach: number;
      orChoiceMode?: string;
      orAlternativeCount?: number;
      orSlots?: boolean[];
    }>;
  }>;
  chapters: Array<{
    chapterNumber: number;
    chapterTitle: string;
    marks: number;
  }>;
}

/**
 * Converts a blueprint (from database or editor state) into a clean, canonical JSON object
 * that is 100% round-trip compatible with BlueprintImportModal / parseBlueprintImport.
 */
export function exportBlueprintToJsonObject(
  blueprint: BlueprintWithExportRelations,
  book?: { className?: string; subject?: string; title?: string } | null
): ExportedBlueprintJson {
  const activeBook = book || blueprint.book;

  // Group flat sections into canonical grouped sections
  const grouped = groupSectionsFromFlat(blueprint.sections || []);

  const sections = grouped.map((g) => ({
    title: g.title,
    instructions: g.instructions || "",
    questionTypes: g.questionTypes.map((qt) => {
      let orSlots: boolean[] | undefined;
      if (qt.orSlotsJson) {
        try {
          const parsed = JSON.parse(qt.orSlotsJson);
          if (Array.isArray(parsed) && parsed.length > 0) orSlots = parsed;
        } catch {
          // ignore
        }
      }
      return {
        type: qt.type,
        count: qt.count,
        marksEach: qt.marksEach,
        orChoiceMode: qt.orChoiceMode || "BOARD_DEFAULT",
        orAlternativeCount: qt.orAlternativeCount ?? 1,
        orSlots,
      };
    }),
  }));

  // Map chapter allocations with chapter numbers and titles
  const chapters = (blueprint.chapters || [])
    .filter((c) => c.marks > 0)
    .map((c, idx) => ({
      chapterNumber: c.chapter?.number ?? idx + 1,
      chapterTitle: c.chapter?.title ?? `Chapter ${c.chapter?.number ?? idx + 1}`,
      marks: c.marks,
    }));

  return {
    name: blueprint.name,
    examType: blueprint.examType || "ANNUAL",
    durationMin: blueprint.durationMin || 180,
    academicSession: blueprint.academicSession || "2026–27",
    subjectCode: blueprint.subjectCode || "",
    className: activeBook?.className || "",
    subject: activeBook?.subject || "",
    sections,
    chapters,
  };
}

/**
 * Returns a human-readable, beautifully formatted JSON string with 2-space indentation.
 */
export function exportBlueprintToJsonString(
  blueprint: BlueprintWithExportRelations,
  book?: { className?: string; subject?: string; title?: string } | null
): string {
  const obj = exportBlueprintToJsonObject(blueprint, book);
  return JSON.stringify(obj, null, 2);
}

/**
 * Generates a safe, descriptive filename for the downloaded blueprint JSON.
 */
export function getBlueprintJsonFilename(
  blueprint: { name?: string; examType?: string },
  book?: { className?: string; subject?: string } | null
): string {
  const parts: string[] = [];
  if (book?.className) parts.push(book.className);
  if (book?.subject) parts.push(book.subject);
  if (blueprint.examType) parts.push(blueprint.examType);
  if (parts.length === 0 && blueprint.name) {
    parts.push(blueprint.name);
  } else {
    parts.push("Blueprint");
  }

  const rawName = parts.join("_").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${rawName}.json`;
}

/**
 * Triggers a client-side download of the blueprint JSON file.
 */
export function downloadBlueprintJson(
  blueprint: BlueprintWithExportRelations,
  book?: { className?: string; subject?: string; title?: string } | null
): void {
  if (typeof window === "undefined") return;

  const jsonStr = exportBlueprintToJsonString(blueprint, book);
  const filename = getBlueprintJsonFilename(blueprint, book);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const buildBlueprintExportPayload = exportBlueprintToJsonObject;
