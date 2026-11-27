const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** A letter (with its matra) or a number: short things a teacher lists with plain spaces. */
function isLetterOrNumber(token: string): boolean {
  return /^\d+$/.test(token) || [...graphemes.segment(token)].length <= 2;
}

/**
 * Split typed or pasted text into list items.
 * Commas and new lines always separate items (and so do runs of two or more spaces).
 * Without them, letters and numbers ("A B C", "क ख ग", "1 2 3") split on spaces,
 * while longer text ("ice cream") stays one item.
 */
export function splitList(raw: string): string[] {
  const pieces = raw
    .split(/[,\n]|\s{2,}/u)
    .map((s) => s.trim())
    .filter(Boolean);
  if (pieces.length !== 1) return pieces;
  const tokens = pieces[0].split(/\s+/u);
  return tokens.every(isLetterOrNumber) ? tokens : pieces;
}

/** Trace & Write keeps its items in one line of text, two spaces apart. */
export function joinPrompt(items: string[]): string {
  return items.join("  ");
}

export function splitPrompt(text: string): string[] {
  if (/\S\s{2,}\S/u.test(text)) return text.split(/\s{2,}/u).map((s) => s.trim()).filter(Boolean);
  return splitList(text);
}
