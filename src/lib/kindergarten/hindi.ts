const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Devanagari signs that ride on a letter (matras, nukta, anusvara, chandrabindu, visarga, halant). */
const SIGNS = /[ऀ-ःऺ-ॏ॑-ॗॢॣ]/gu;

/** The first letter a child writes for a word: "पेड़" → "प", "आम" → "आ", "apple" → "A". */
export function firstLetter(word: string): string {
  const first = [...graphemes.segment(word.trim())][0]?.segment ?? "";
  const bare = first.replace(SIGNS, "");
  return (bare || first).toUpperCase();
}

/**
 * The boxes of a fill-the-gap row: a spaced sequence ("क ख ग") splits on spaces,
 * a word ("कमला") splits into letters with their matras ("क", "म", "ला").
 */
export function wordTokens(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (/\s/u.test(t)) return t.split(/\s+/u);
  return [...graphemes.segment(t)].map((g) => g.segment);
}
