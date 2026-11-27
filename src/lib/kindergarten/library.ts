import { getAllKindergartenActivities } from "./registry";
import type { KindergartenActivityPlugin, KindergartenCategory } from "./types";

export const CATEGORY_LABEL: Record<KindergartenCategory, string> = {
  english: "English & letters",
  math: "Numbers & maths",
  hindi: "Hindi",
  evs: "Our world",
  general: "Drawing, colouring & fun",
};

const CATEGORY_ORDER: KindergartenCategory[] = ["english", "math", "general", "hindi", "evs"];

/** Groups shown next to a subject's own while that subject has no activities of its own yet. */
const STAND_IN: Partial<Record<KindergartenCategory, KindergartenCategory[]>> = {
  hindi: ["english"],
};

export type LibraryGroup = { category: KindergartenCategory; label: string; plugins: KindergartenActivityPlugin[] };

export function subjectCategory(subject?: string | null): KindergartenCategory {
  const s = (subject ?? "").toLowerCase();
  if (s.startsWith("english")) return "english";
  if (s.startsWith("math")) return "math";
  if (s.startsWith("hindi")) return "hindi";
  if (s.includes("evs") || s.includes("general awareness")) return "evs";
  return "general";
}

/**
 * What the worksheet's activity library lists: the subject's own group first, then fun & drawing
 * (they suit any subject). `showAll` adds the rest; a search looks through everything.
 * `comingSoon` is true when the subject has no activities of its own yet.
 */
export function libraryGroups(opts: { subject?: string | null; showAll: boolean; query: string }): {
  groups: LibraryGroup[];
  comingSoon: boolean;
} {
  const all = getAllKindergartenActivities();
  const own = subjectCategory(opts.subject);
  const byCategory = (c: KindergartenCategory) => all.filter((p) => p.category === c);
  const comingSoon = byCategory(own).length === 0;
  const q = opts.query.trim().toLowerCase();

  let order: KindergartenCategory[];
  if (q || opts.showAll) order = [own, ...CATEGORY_ORDER];
  else order = [own, ...(comingSoon ? (STAND_IN[own] ?? []) : []), "general"];

  const seen = new Set<KindergartenCategory>();
  const groups: LibraryGroup[] = [];
  for (const category of order) {
    if (seen.has(category)) continue;
    seen.add(category);
    const plugins = byCategory(category).filter(
      (p) => !q || `${p.label} ${p.shortLabel} ${p.description}`.toLowerCase().includes(q),
    );
    if (plugins.length) groups.push({ category, label: CATEGORY_LABEL[category], plugins });
  }
  return { groups, comingSoon };
}
