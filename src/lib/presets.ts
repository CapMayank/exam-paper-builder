/**
 * Editable presets: the syllabus presets offered by the Books import and the blueprint patterns offered when a
 * blueprint is started. Built-in presets live in code; the school's changes are rows in PresetOverride that
 * replace a built-in preset, hide it, or add a new one. Safe to import on the client and the server.
 */
import { z } from "zod";
import { QUESTION_TYPES } from "./constants";
import { STANDARD_CURRICULUM_PRESETS as SHIPPED_SYLLABUS_PRESETS } from "./curriculumPresets";
import { englishPresets } from "./englishTitles";
import { MPBSE_BLUEPRINT_TEMPLATES, type BlueprintTemplate } from "./curriculumTemplates";
import { SCHOOL_PATTERNS } from "./schoolPatterns";
import { ensureLanguageNonChapterUnits, type StandardCurriculumPreset } from "./syllabusImport";

export const PRESET_KINDS = ["SYLLABUS", "BLUEPRINT"] as const;
export type PresetKind = (typeof PRESET_KINDS)[number];

/** A blueprint pattern and the classes (and, optionally, the one subject) it is offered for. */
export type BlueprintPreset = BlueprintTemplate & { classFrom: number; classTo: number };

export type PresetData<K extends PresetKind> = K extends "SYLLABUS" ? StandardCurriculumPreset : BlueprintPreset;

/** BUILT_IN: as shipped. EDITED: a built-in preset the school changed. CUSTOM: added by the school. */
export type PresetOrigin = "BUILT_IN" | "EDITED" | "CUSTOM";

export interface PresetOverrideRow {
  presetId: string;
  data: unknown;
  hidden: boolean;
  updatedAt: string | Date;
  updatedByName?: string | null;
}

export interface ManagedPreset<T> {
  id: string;
  origin: PresetOrigin;
  hidden: boolean;
  data: T;
  /** The shipped version, for built-in presets (edited or not). */
  original: T | null;
  updatedAt?: string;
  updatedByName?: string | null;
}

export const CUSTOM_PREFIX = "custom-";
export const isCustomId = (id: string) => id.startsWith(CUSTOM_PREFIX);

/** "School" and school-made patterns follow the school's own exam rules, not an MPBSE marks scheme. */
export const isSchoolPattern = (t: Pick<BlueprintTemplate, "archetype">) => t.archetype === "SCHOOL" || t.archetype === "CUSTOM";

const RAW_SYLLABUS_PRESETS = englishPresets(SHIPPED_SYLLABUS_PRESETS);

export function builtInSyllabusPresets(): StandardCurriculumPreset[] {
  return RAW_SYLLABUS_PRESETS;
}

export function builtInBlueprintPresets(): BlueprintPreset[] {
  const board = MPBSE_BLUEPRINT_TEMPLATES.map((t) => ({ ...t, classFrom: t.classLevel ?? 0, classTo: t.classLevel ?? 0 }));
  const school = SCHOOL_PATTERNS.map((p) => ({ ...p.template, classFrom: p.levels[0], classTo: p.levels[1] }));
  return [...school, ...board];
}

export function builtInPresets(kind: PresetKind): Array<StandardCurriculumPreset | BlueprintPreset> {
  return kind === "SYLLABUS" ? builtInSyllabusPresets() : builtInBlueprintPresets();
}

const iso = (d: string | Date) => (typeof d === "string" ? d : d.toISOString());

/** Built-in presets with the school's changes applied, followed by the school's own presets. */
export function mergePresets<T extends { id: string }>(builtIns: T[], rows: PresetOverrideRow[]): ManagedPreset<T>[] {
  const byId = new Map(rows.map((r) => [r.presetId, r]));
  const out: ManagedPreset<T>[] = builtIns.map((b) => {
    const row = byId.get(b.id);
    const edited = row?.data != null;
    return {
      id: b.id,
      origin: edited ? "EDITED" : "BUILT_IN",
      hidden: row?.hidden ?? false,
      data: edited ? ({ ...(row!.data as T), id: b.id } as T) : b,
      original: b,
      updatedAt: row ? iso(row.updatedAt) : undefined,
      updatedByName: row?.updatedByName ?? null,
    };
  });
  for (const row of rows) {
    if (!isCustomId(row.presetId) || row.data == null) continue;
    out.push({
      id: row.presetId,
      origin: "CUSTOM",
      hidden: row.hidden,
      data: { ...(row.data as T), id: row.presetId } as T,
      original: null,
      updatedAt: iso(row.updatedAt),
      updatedByName: row.updatedByName ?? null,
    });
  }
  return out;
}

/** What the import dialog and the blueprint picker offer: visible presets, language books with their exam sections. */
export function effectivePresets<K extends PresetKind>(kind: K, rows: PresetOverrideRow[]): PresetData<K>[] {
  const visible = mergePresets(builtInPresets(kind) as Array<{ id: string }>, rows)
    .filter((p) => !p.hidden)
    .map((p) => p.data) as PresetData<K>[];
  if (kind !== "SYLLABUS") return visible;
  return (visible as StandardCurriculumPreset[]).map((p) => ({
    ...p,
    chapters: ensureLanguageNonChapterUnits([...p.chapters], p.subject, p.className).chapters,
  })) as PresetData<K>[];
}

export function blueprintTotals(sections: BlueprintTemplate["sections"]): { marks: number; questions: number } {
  let marks = 0;
  let questions = 0;
  for (const g of sections) {
    for (const q of g.questionTypes) {
      marks += q.count * q.marksEach;
      questions += q.count;
    }
  }
  return { marks: Math.round(marks * 100) / 100, questions };
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const text = (max: number) => z.string().trim().max(max);

export const syllabusPresetSchema = z.object({
  title: text(200).min(1, "Give the book a title"),
  className: text(40).min(1, "Choose a class"),
  subject: text(80).min(1, "Choose a subject"),
  board: text(120).default(""),
  description: text(400).default(""),
  isComposite: z.boolean().optional(),
  subBooks: z.array(text(120)).optional(),
  chapters: z
    .array(z.object({ number: z.number().int().positive(), title: text(300).min(1, "A chapter has no title") }))
    .min(1, "Add at least one chapter")
    .max(200),
});

const questionTypeSchema = z.looseObject({
  type: z.enum(QUESTION_TYPES),
  count: z.number().int().min(0).max(100),
  marksEach: z.number().positive().max(100),
  orChoiceMode: z.enum(["BOARD_DEFAULT", "REQUIRED", "NOT_REQUIRED"]).optional(),
});

export const blueprintPresetSchema = z
  .looseObject({
    title: text(200).min(1, "Give the pattern a name"),
    description: text(400).default(""),
    examType: z.enum(["UNIT_TEST", "QUARTERLY", "HALF_YEARLY", "PRE_BOARD", "ANNUAL"]),
    durationMin: z.number().int().min(10).max(600),
    classFrom: z.number().int().min(0).max(12),
    classTo: z.number().int().min(0).max(12),
    subjectName: text(80).optional(),
    archetype: text(60).default("CUSTOM"),
    sections: z
      .array(
        z.looseObject({
          title: text(200).min(1, "A section has no title"),
          instructions: text(400).default(""),
          questionTypes: z.array(questionTypeSchema).min(1, "A section has no questions"),
        }),
      )
      .min(1, "Add at least one section")
      .max(30),
  })
  .refine((p) => p.classFrom <= p.classTo, { message: "The first class must come before the last", path: ["classTo"] });

/** Validates a preset and fills the fields the server owns (id, numbering, totals). */
export function cleanPreset(kind: PresetKind, id: string, input: unknown): StandardCurriculumPreset | BlueprintPreset {
  if (kind === "SYLLABUS") {
    const p = syllabusPresetSchema.parse(input);
    return { ...p, id, chapters: p.chapters.map((c, i) => ({ number: i + 1, title: c.title })) };
  }
  const p = blueprintPresetSchema.parse(input) as unknown as BlueprintPreset;
  const { marks } = blueprintTotals(p.sections);
  const subjectName = p.subjectName?.trim() || undefined;
  return {
    ...p,
    id,
    templateCode: isCustomId(id) ? id : (p.templateCode ?? id),
    subjectName,
    totalMarks: marks,
    classLevel: p.classFrom === p.classTo ? p.classFrom : p.classLevel,
    targetClasses: p.classFrom === p.classTo ? `Class ${p.classFrom}` : `Class ${p.classFrom}–${p.classTo}`,
  };
}
