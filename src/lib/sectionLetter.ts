/**
 * The section word ("Section", "Part", "खण्ड", "खंड", "भाग") standing on its own, then optional spaces, hyphen or
 * en dash, then one Latin letter that is not the start of a longer word ("Section wise" names no letter).
 */
const SECTION_LETTER = /(?<![A-Za-zऀ-ॿ])(?:section|part|खण्ड|खंड|भाग)[\s\-–]*([A-Za-z])(?![A-Za-z])/i;

/** "A" from "Section A", "खण्ड A" or "SECTION-B: Grammar"; undefined when the title names no section letter. */
export function sectionLetter(title: string): string | undefined {
  return SECTION_LETTER.exec(title ?? "")?.[1].toUpperCase();
}
