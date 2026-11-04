import type { BlueprintPreset, ManagedPreset, PresetKind } from "@/lib/presets";
import type { StandardCurriculumPreset } from "@/lib/syllabusImport";

export type AnyPreset = StandardCurriculumPreset | BlueprintPreset;
export type Managed = ManagedPreset<AnyPreset>;

export const CLASS_OPTIONS = ["Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];

/** Class level for Nursery/LKG/UKG is 0 for blueprint ranges; the syllabus keeps the class name. */
export const LEVEL_OPTIONS = Array.from({ length: 13 }, (_, i) => i);
export const levelLabel = (n: number) => (n === 0 ? "Pre-primary" : `Class ${n}`);

export const SUBJECT_SUGGESTIONS = [
  "English",
  "Hindi / हिंदी",
  "Mathematics / गणित",
  "EVS / पर्यावरण अध्ययन",
  "Science / विज्ञान",
  "Social Science / सामाजिक विज्ञान",
  "Sanskrit / संस्कृतम्",
  "General Knowledge",
  "Computer",
  "Drawing",
];

export const EXAM_TYPES: Array<{ value: BlueprintPreset["examType"]; label: string }> = [
  { value: "UNIT_TEST", label: "Unit test" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Half-yearly" },
  { value: "PRE_BOARD", label: "Pre-board" },
  { value: "ANNUAL", label: "Annual" },
];

export function isBlueprint(p: AnyPreset): p is BlueprintPreset {
  return Array.isArray((p as BlueprintPreset).sections);
}

export function classGroupOf(kind: PresetKind, p: AnyPreset): { key: string; order: number } {
  if (kind === "SYLLABUS") {
    const name = (p as StandardCurriculumPreset).className;
    const idx = CLASS_OPTIONS.indexOf(name);
    return { key: name, order: idx === -1 ? 99 : idx };
  }
  const b = p as BlueprintPreset;
  const key = b.classFrom === b.classTo ? levelLabel(b.classFrom) : `Classes ${b.classFrom}–${b.classTo}`;
  return { key, order: b.classFrom * 20 + (b.classTo - b.classFrom) };
}

export function presetMeta(p: AnyPreset): string {
  if (isBlueprint(p)) {
    const q = p.sections.reduce((a, g) => a + g.questionTypes.reduce((x, t) => x + t.count, 0), 0);
    return `${p.subjectName ?? "Any subject"} · ${p.totalMarks} marks · ${q} questions`;
  }
  return `${p.subject.split("/")[0].trim()} · ${p.chapters.length} chapters`;
}

export function matchesClass(kind: PresetKind, p: AnyPreset, classFilter: string): boolean {
  if (!classFilter) return true;
  if (kind === "SYLLABUS") return (p as StandardCurriculumPreset).className === classFilter;
  const level = CLASS_OPTIONS.indexOf(classFilter) - 2; // Nursery/LKG/UKG → ≤ 0
  const b = p as BlueprintPreset;
  return Math.max(level, 0) >= b.classFrom && Math.max(level, 0) <= b.classTo;
}

/** Section colours for the marks bar, in order; they repeat after eight sections. */
export const SECTION_TONES = [
  { bar: "bg-indigo-600", dot: "bg-indigo-600" },
  { bar: "bg-sky-500", dot: "bg-sky-500" },
  { bar: "bg-emerald-500", dot: "bg-emerald-500" },
  { bar: "bg-amber-500", dot: "bg-amber-500" },
  { bar: "bg-rose-500", dot: "bg-rose-500" },
  { bar: "bg-violet-500", dot: "bg-violet-500" },
  { bar: "bg-teal-500", dot: "bg-teal-600" },
  { bar: "bg-slate-500", dot: "bg-slate-500" },
];
