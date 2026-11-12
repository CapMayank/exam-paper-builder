/**
 * The section word ("Section", "Part", "खण्ड", "खंड", "भाग") standing on its own, then optional spaces, hyphen or
 * en dash, then one Latin letter that is not the start of a longer word.
 */
const SECTION_LETTER = /(?<![A-Za-zऀ-ॿ])(?:section|part|खण्ड|खंड|भाग)[\s\-–]*([A-Za-z])(?![A-Za-z])/gi;

/** "A" from "Section A", "खण्ड A" or "SECTION-B: Grammar"; undefined when the title names no section letter. */
export function sectionLetter(title: string): string | undefined {
  // the word is case-insensitive; the letter counts only when written as a capital
  for (const m of (title ?? "").matchAll(SECTION_LETTER)) {
    if (m[1] >= "A" && m[1] <= "Z") return m[1];
  }
  return undefined;
}
