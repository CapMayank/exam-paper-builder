import type { SchemeGroup } from "./officialSchemeData";

/**
 * Question-format skeletons printed under the MPBSE 2026-27 marking schemes (अंक योजना).
 * Each skeleton was checked against the printed note AND the printed total marks.
 */

export type FormatId =
  | "F75"
  | "F75_MARATHI"
  | "F75_MAP"
  | "F80"
  | "F80_HISTORY"
  | "F70"
  | "F70_PHYSICS"
  | "F70_GEO_XI"
  | "F70_GEO_XII"
  | "F50_MUSIC"
  | "F25_MUSIC"
  | "ENGLISH_IX_X"
  | "ENGLISH_XI_XII"
  | "PRACTICAL"
  | "SCHOOL_DM_50";

export type FormatDef = {
  id: FormatId;
  /** Q1-Q5 objective questions: how many 1-mark items each of the five types has. */
  objective: [number, number, number, number, number];
  /** Written questions after the objective block, in paper order. */
  written: Array<{ marksEach: number; count: number; kind?: "MAP" }>;
};

const o75: FormatDef["objective"] = [6, 6, 6, 6, 6];
const o80: FormatDef["objective"] = [6, 6, 6, 7, 7];
const o70: FormatDef["objective"] = [6, 6, 6, 5, 5];

export const FORMATS: Record<Exclude<FormatId, "ENGLISH_IX_X" | "ENGLISH_XI_XII" | "PRACTICAL" | "F50_MUSIC" | "F25_MUSIC">, FormatDef> = {
  // School-defined (no MPBSE paper exists for Disaster Management in the 2026-27 documents): 20 objective,
  // 5 x 2, 4 x 3, 2 x 4 = 50 marks.
  SCHOOL_DM_50: { id: "SCHOOL_DM_50", objective: [4, 4, 4, 4, 4], written: [{ marksEach: 2, count: 5 }, { marksEach: 3, count: 4 }, { marksEach: 4, count: 2 }] },
  F75: { id: "F75", objective: o75, written: [{ marksEach: 2, count: 12 }, { marksEach: 3, count: 3 }, { marksEach: 4, count: 3 }] },
  F75_MARATHI: { id: "F75_MARATHI", objective: o75, written: [{ marksEach: 2, count: 12 }, { marksEach: 3, count: 2 }, { marksEach: 5, count: 3 }] },
  // Social Science IX/X: Q23 is a map question worth 4 marks
  F75_MAP: { id: "F75_MAP", objective: o75, written: [{ marksEach: 2, count: 12 }, { marksEach: 3, count: 3 }, { marksEach: 4, count: 2 }, { marksEach: 4, count: 1, kind: "MAP" }] },
  F80: { id: "F80", objective: o80, written: [{ marksEach: 2, count: 10 }, { marksEach: 3, count: 4 }, { marksEach: 4, count: 4 }] },
  F80_HISTORY: { id: "F80_HISTORY", objective: o80, written: [{ marksEach: 2, count: 10 }, { marksEach: 3, count: 5 }, { marksEach: 4, count: 2 }, { marksEach: 5, count: 1, kind: "MAP" }] },
  F70: { id: "F70", objective: o70, written: [{ marksEach: 2, count: 7 }, { marksEach: 3, count: 4 }, { marksEach: 4, count: 4 }] },
  F70_PHYSICS: { id: "F70_PHYSICS", objective: [6, 6, 5, 6, 5], written: [{ marksEach: 2, count: 7 }, { marksEach: 3, count: 4 }, { marksEach: 4, count: 4 }] },
  F70_GEO_XI: { id: "F70_GEO_XI", objective: o70, written: [{ marksEach: 2, count: 7 }, { marksEach: 3, count: 5 }, { marksEach: 4, count: 2 }, { marksEach: 5, count: 1, kind: "MAP" }] },
  // Class XII Geography: two map questions (world Q19, India Q20), 5 marks each
  F70_GEO_XII: { id: "F70_GEO_XII", objective: o70, written: [{ marksEach: 2, count: 8 }, { marksEach: 3, count: 4 }, { marksEach: 4, count: 1 }, { marksEach: 5, count: 2, kind: "MAP" }] },
};

/** 50 / 25 mark music papers have their own numbering: Q1-4 / Q1-2 are objective blocks of five items. */
export const MUSIC_FORMATS = {
  F50_MUSIC: { objective: 20, written: [{ marksEach: 2, count: 3 }, { marksEach: 3, count: 2 }, { marksEach: 4, count: 2 }, { marksEach: 5, count: 2 }] },
  F25_MUSIC: { objective: 10, written: [{ marksEach: 2, count: 2 }, { marksEach: 3, count: 2 }, { marksEach: 5, count: 1 }] },
} as const;

export function formatIdFor(g: Pick<SchemeGroup, "classLevel" | "subject" | "totalMarks">): FormatId {
  const { classLevel: c, subject: s, totalMarks: t } = g;
  if (/^(Painting|Drawing and Painting|Still Life and Design|Drawing and Designing)$/.test(s)) return "PRACTICAL";
  if (s === "English") return c <= 10 ? "ENGLISH_IX_X" : "ENGLISH_XI_XII";
  if (t === 25) return "F25_MUSIC";
  if (t === 50) return "F50_MUSIC";
  if (s === "Marathi" && c <= 10) return "F75_MARATHI";
  if (s === "Social Science") return "F75_MAP";
  if (t === 75) return "F75";
  if (s === "History" && c >= 11) return "F80_HISTORY";
  if (t === 80) return "F80";
  if (s === "Physics") return "F70_PHYSICS";
  if (s === "Geography") return c === 11 ? "F70_GEO_XI" : "F70_GEO_XII";
  return "F70";
}

export function skeletonMarks(f: FormatDef): number {
  return f.objective.reduce((a, b) => a + b, 0) + f.written.reduce((a, w) => a + w.marksEach * w.count, 0);
}

/** Counts of questions per marks value, e.g. { 1: 30, 2: 12, 3: 3, 4: 3 }. */
export function skeletonByMarks(f: FormatDef): Record<number, number> {
  const out: Record<number, number> = { 1: f.objective.reduce((a, b) => a + b, 0) };
  for (const w of f.written) out[w.marksEach] = (out[w.marksEach] ?? 0) + w.count;
  return out;
}
