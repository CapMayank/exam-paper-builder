/**
 * The school's active teaching profile. Only these subjects take part in the teacher workflow
 * (class/subject selection, templates, lists). Everything else stays in the database untouched and is
 * reachable through the "show other subjects" switch.
 *
 * To change the profile edit this file only; the filters, presets and tests all read from it.
 */

export type Stream = "PCM" | "PCB";
export const STREAMS: Array<{ code: Stream; label: string }> = [
  { code: "PCM", label: "Mathematics (PCM)" },
  { code: "PCB", label: "Biology (PCB)" },
];

export type ProfileSubject = {
  /** Canonical English name used by templates and books. */
  name: string;
  /** Hindi display name shown next to the English one. */
  nameHi: string;
  /** Streams this subject belongs to; omitted = every stream / not stream-specific. */
  streams?: Stream[];
  /** Subject name (as the MPBSE scheme names it) that the examination blueprint comes from. */
  schemeSubject: string;
  /** False when MPBSE's 2026-27 documents print no paper for it (school-defined pattern). */
  officialBlueprint: boolean;
};

const DM: ProfileSubject = {
  name: "Disaster Management",
  nameHi: "आपदा प्रबंधन",
  schemeSubject: "Disaster Management",
  officialBlueprint: false,
};

const secondary: ProfileSubject[] = [
  { name: "Hindi", nameHi: "हिन्दी", schemeSubject: "Hindi", officialBlueprint: true },
  { name: "English", nameHi: "अंग्रेजी", schemeSubject: "English", officialBlueprint: true },
  { name: "Mathematics", nameHi: "गणित", schemeSubject: "Mathematics", officialBlueprint: true },
  { name: "Science", nameHi: "विज्ञान", schemeSubject: "Science", officialBlueprint: true },
  { name: "Social Science", nameHi: "सामाजिक विज्ञान", schemeSubject: "Social Science", officialBlueprint: true },
  { name: "Sanskrit", nameHi: "संस्कृत", schemeSubject: "Sanskrit", officialBlueprint: true },
  DM,
];

const seniorSecondary: ProfileSubject[] = [
  { name: "Physics", nameHi: "भौतिक शास्त्र", schemeSubject: "Physics", officialBlueprint: true },
  { name: "Chemistry", nameHi: "रसायन शास्त्र", schemeSubject: "Chemistry", officialBlueprint: true },
  { name: "Mathematics", nameHi: "गणित", streams: ["PCM"], schemeSubject: "Mathematics", officialBlueprint: true },
  { name: "Biology", nameHi: "जीव विज्ञान", streams: ["PCB"], schemeSubject: "Biology", officialBlueprint: true },
  { name: "Hindi", nameHi: "हिन्दी", schemeSubject: "Hindi", officialBlueprint: true },
  { name: "English", nameHi: "अंग्रेजी", schemeSubject: "English", officialBlueprint: true },
  DM,
];

export const SCHOOL_PROFILE: Record<9 | 10 | 11 | 12, ProfileSubject[]> = {
  9: secondary,
  10: secondary,
  11: seniorSecondary,
  12: seniorSecondary,
};

/** Class levels the profile governs; classes outside it are left exactly as they are. */
export const PROFILE_CLASS_LEVELS = [9, 10, 11, 12] as const;

export function classLevelOf(className?: string | null): number | null {
  if (!className) return null;
  const roman: Record<string, number> = { IX: 9, X: 10, XI: 11, XII: 12 };
  const m = className.match(/\b(IX|XII|XI|X)\b/i);
  if (m) return roman[m[1].toUpperCase()];
  const n = className.match(/(\d{1,2})/);
  return n ? parseInt(n[1], 10) : null;
}

// Anchored at the start so "Political Science", "Computer Science" or "Agriculture Science and Mathematics"
// are never mistaken for Science or Mathematics.
const ALIASES: Array<[RegExp, string]> = [
  [/disaster|आपदा/i, "Disaster Management"],
  [/^\s*(social\s*science|sst\b|सामाजिक)/i, "Social Science"],
  [/^\s*(sanskrit|संस्कृत)/i, "Sanskrit"],
  [/^\s*(hindi|हिन्दी|हिंदी)/i, "Hindi"],
  [/^\s*(english|अंग्रेजी|अंग्रेज़ी)/i, "English"],
  [/^\s*(physics|भौतिक)/i, "Physics"],
  [/^\s*(chemistry|रसायन)/i, "Chemistry"],
  [/^\s*(biotech|जैव प्रौद्योगिकी)/i, "Biotechnology"],
  [/^\s*(biology|जीव विज्ञान)/i, "Biology"],
  [/^\s*(math|गणित)/i, "Mathematics"],
  [/^\s*(science|विज्ञान)(?!\s+(of|के))/i, "Science"],
];

/** Maps whatever a book/class/blueprint calls a subject ("Science / विज्ञान", "SST") onto a canonical name. */
export function canonicalSubject(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  for (const [re, name] of ALIASES) if (re.test(s)) return name;
  return null;
}

export function profileSubjectsFor(classLevel: number, stream?: Stream | "ALL" | null): ProfileSubject[] {
  const list = SCHOOL_PROFILE[classLevel as 9 | 10 | 11 | 12];
  if (!list) return [];
  if (!stream || stream === "ALL") return list;
  return list.filter((s) => !s.streams || s.streams.includes(stream));
}

export type ViewScope = {
  stream: Stream | "ALL";
  /** true = show subjects outside the school profile too (archive view) */
  showOther: boolean;
};
export const DEFAULT_VIEW_SCOPE: ViewScope = { stream: "ALL", showOther: false };

/**
 * Is this (class, subject) part of the active teacher workflow?
 * Classes outside 9-12 are never filtered. Within 9-12 only profile subjects are active, and under a
 * stream the other stream's subject (Biology under PCM, Mathematics under PCB) is hidden.
 */
export function isActiveSubject(className: string | null | undefined, subject: string | null | undefined, scope: ViewScope = DEFAULT_VIEW_SCOPE): boolean {
  if (scope.showOther) return true;
  const level = classLevelOf(className);
  if (level === null || !(PROFILE_CLASS_LEVELS as readonly number[]).includes(level)) return true;
  const canon = canonicalSubject(subject);
  if (!canon) return false;
  return profileSubjectsFor(level, scope.stream).some((s) => s.name === canon);
}

export function parseViewScope(cookieHeader?: string | null): ViewScope {
  const m = cookieHeader?.match(/(?:^|;\s*)epb_view=([^;]*)/);
  if (!m) return DEFAULT_VIEW_SCOPE;
  try {
    const p = new URLSearchParams(decodeURIComponent(m[1]));
    return {
      // the UI no longer narrows by stream (every required subject shows); a stale cookie must not hide subjects
      stream: "ALL",
      showOther: p.get("other") === "1",
    };
  } catch {
    return DEFAULT_VIEW_SCOPE;
  }
}

export function serializeViewScope(scope: ViewScope): string {
  return encodeURIComponent(new URLSearchParams({ stream: scope.stream, other: scope.showOther ? "1" : "0" }).toString());
}

/** Is a blueprint template part of the active workflow? Generic starters (no class) only show in the archive view. */
export function isActiveTemplate(
  t: { classLevel?: number | null; subjectName?: string | null },
  scope: ViewScope = DEFAULT_VIEW_SCOPE,
): boolean {
  if (scope.showOther) return true;
  if (!t.classLevel) return false;
  return isActiveSubject(`Class ${t.classLevel}`, t.subjectName, scope);
}
