import { getAllKindergartenActivities } from "./registry";
import type { AnyActivityPlugin, KindergartenCategory } from "./types";

export const CATEGORY_LABEL: Record<KindergartenCategory, string> = {
  english: "English & letters",
  math: "Numbers & maths",
  hindi: "Hindi",
  evs: "Our world",
  general: "Drawing, colouring & fun",
};

const CATEGORY_ORDER: KindergartenCategory[] = ["english", "math", "general", "hindi", "evs"];

export type LibraryGroup = { category: KindergartenCategory; label: string; plugins: AnyActivityPlugin[] };

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
 */
export function libraryGroups(opts: { subject?: string | null; showAll: boolean; query: string }): LibraryGroup[] {
  const all = getAllKindergartenActivities();
  const own = subjectCategory(opts.subject);
  const q = opts.query.trim().toLowerCase();
  const order: KindergartenCategory[] = q || opts.showAll ? [own, ...CATEGORY_ORDER] : [own, "general"];

  const seen = new Set<KindergartenCategory>();
  const groups: LibraryGroup[] = [];
  for (const category of order) {
    if (seen.has(category)) continue;
    seen.add(category);
    const plugins = all.filter(
      (p) => p.category === category && (!q || `${p.label} ${p.shortLabel} ${p.description}`.toLowerCase().includes(q)),
    );
    if (plugins.length) groups.push({ category, label: CATEGORY_LABEL[category], plugins });
  }
  return groups;
}
