/** Devanagari signs that ride on a letter (matras, anusvara, chandrabindu, visarga) – not the halant or nukta of a joined letter. */
const SIGNS_EXCEPT_JOIN = /[ऀ-ःऺऻा-ौॎॏ॑-ॗॢॣ]/gu;

const VIRAMA = "्";
const NUKTA = "़";
/** Any combining Devanagari sign: matras, halant, nukta, anusvara… */
const SIGN = /^[ऀ-ःऺ-ॏ॑-ॗॢॣ]$/u;
const isConsonant = (c: string | undefined) => !!c && c >= "क" && c <= "ह";

/**
 * The first letter a child writes for a word: "पेड़" → "प", "आम" → "आ", "क्षत्रिय" → "क्ष", "apple" → "A".
 * Joined letters (consonant + halant + consonant) stay together; matras and other signs are dropped.
 * Done by hand, not by grapheme splitting, because older browsers split conjuncts apart.
 */
export function firstLetter(word: string): string {
  const chars = [...word.trim()];
  if (!chars.length) return "";
  let out = chars[0];
  let i = 1;
  if (isConsonant(chars[0])) {
    for (;;) {
      if (chars[i] === NUKTA) out += chars[i++];
      if (chars[i] === VIRAMA && isConsonant(chars[i + 1])) {
        out += chars[i] + chars[i + 1];
        i += 2;
        continue;
      }
      break;
    }
  }
  return out.replace(SIGNS_EXCEPT_JOIN, "").toUpperCase();
}

/**
 * The boxes of a fill-the-gap row: a spaced sequence ("क ख ग") splits on spaces,
 * a word ("कमला") splits into letters with their matras ("क", "म", "ला").
 */
export function wordTokens(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (/\s/u.test(t)) return t.split(/\s+/u);
  // group by hand: a sign joins the letter before it, and a consonant after a halant joins it too
  const out: string[] = [];
  for (const c of t) {
    const prev = out[out.length - 1];
    const joinsPrev = prev !== undefined && (SIGN.test(c) || (prev.endsWith(VIRAMA) && isConsonant(c)));
    if (joinsPrev) out[out.length - 1] = prev + c;
    else out.push(c);
  }
  return out;
}
