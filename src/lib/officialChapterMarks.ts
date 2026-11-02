/**
 * Maps the official chapter/unit marks of a curriculum template onto a teacher's Book chapters.
 *
 * Teachers often combine several textbooks of one subject into a single book (Hindi: Kshitij + Kritika,
 * English: Beehive + Moments, ...). Combined chapters are renumbered and their titles get a "[Book] " prefix,
 * so matching by chapter number or exact title silently fails and the marks fall back to an even split.
 * This matcher looks past the prefix and the numbering.
 */

export type BookChapterLite = { id: string; number: number; title: string };
export type OfficialChapterLite = {
  chapterNumber: number;
  title: string;
  officialMarks?: number | null;
  unitNumber?: number | null;
  unitTitle?: string | null;
  isDeleted?: boolean;
  legacyChapterId?: string | null;
};
export type OfficialTextbookLite = { title?: string; chapters: OfficialChapterLite[] };

const norm = (s: string) =>
  s
    .replace(/^\s*\[[^\]]*\]\s*/, "") // "[First Flight] " prefix added when books are combined
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export type OfficialMarksResult = {
  marks: Record<string, number>;
  /** Quota group (unit) of each matched chapter, when the official data has units. */
  units: Record<string, { key: string; title: string }>;
  matched: number;
  total: number;
  /** true when the matched marks add up to the template total */
  exact: boolean;
};

export function matchOfficialChapterMarks(
  bookChapters: BookChapterLite[],
  textbooks: OfficialTextbookLite[],
  templateTotal: number,
): OfficialMarksResult {
  const official = textbooks.flatMap((t) => t.chapters);
  const marks: Record<string, number> = {};
  const units: Record<string, { key: string; title: string }> = {};
  let matched = 0;
  const used = new Set<OfficialChapterLite>();

  const take = (bc: BookChapterLite, oc: OfficialChapterLite) => {
    marks[bc.id] = oc.isDeleted ? 0 : typeof oc.officialMarks === "number" ? oc.officialMarks : 0;
    if (oc.unitNumber != null && !oc.isDeleted) units[bc.id] = { key: `u${oc.unitNumber}`, title: oc.unitTitle ?? "" };
    used.add(oc);
    matched++;
  };

  for (const bc of bookChapters) {
    // 1. explicit link, 2. same title ignoring a combine-prefix
    const byLink = official.find((oc) => !used.has(oc) && oc.legacyChapterId && oc.legacyChapterId === bc.id);
    if (byLink) {
      take(bc, byLink);
      continue;
    }
    const byTitle = official.find((oc) => !used.has(oc) && norm(oc.title) === norm(bc.title));
    if (byTitle) take(bc, byTitle);
  }

  // 3. A single, un-combined textbook can still be matched by chapter number.
  if (textbooks.length === 1 || bookChapters.every((c) => !/^\s*\[/.test(c.title))) {
    for (const bc of bookChapters) {
      if (bc.id in marks) continue;
      const byNumber = official.find((oc) => !used.has(oc) && oc.chapterNumber === bc.number);
      if (byNumber && textbooks.length === 1) take(bc, byNumber);
    }
  }

  const sum = Object.values(marks).reduce((a, b) => a + b, 0);
  return { marks, units, matched, total: sum, exact: sum === templateTotal };
}
