// Pure helpers for the space-saving print arrangement: which blocks may sit side by side or be split.
import { extractTableFromText } from "./math";
import { isMcqLikeType } from "./constants";

type SubpartLike = { text: string; marks?: number; options?: string[] | null; subparts?: unknown[] | null };

/** Characters of body text that fit across one line of a question's sub-item area (A5 booklet page / A4 page). */
const LINE_CHARS = { a5: 76, a4: 104 } as const;
/** Characters a grid cell spends on its "(iii)" label and the gap to the next cell. */
const CELL_OVERHEAD_CHARS = 7;

/**
 * How many columns short sub-items ("(i) Write (ii) Clean (iii) young (iv) bowl") can share, or 0 when they
 * must stay one per line: any sub-item with options, nested parts, a line break, a table, or text too long
 * for even two columns. Four items never print as 3 + 1.
 */
export function subpartGridColumns(subparts: readonly SubpartLike[], isA5?: boolean): number {
  const n = subparts.length;
  if (n < 2) return 0;
  const plain = subparts.every(
    (sp) => !(sp.options && sp.options.length) && !(sp.subparts && sp.subparts.length) && !/[\n|]|\$\$|\frac/.test(sp.text),
  );
  if (!plain) return 0;
  const longest = Math.max(...subparts.map((sp) => sp.text.trim().length));
  const line = isA5 ? LINE_CHARS.a5 : LINE_CHARS.a4;
  for (const cols of [4, 3, 2]) {
    if (cols > n || (cols === 3 && n % 3 !== 0)) continue;
    if ((longest + CELL_OVERHEAD_CHARS) * cols <= line) return cols;
  }
  return 0;
}

/**
 * Narrowest share of the row one option may take: short options go four across, medium ones two across,
 * and an option longer than its share simply takes the next row (see optionFlowStyles).
 */
export function optionMinWidth(options: readonly string[], forceSingle = false): "25%" | "50%" | "100%" {
  if (forceSingle) return "100%";
  const longest = Math.max(0, ...options.map((o) => o.trim().length));
  if (options.some((o) => /\frac|\sqrt|\n/.test(o))) return "100%";
  return longest <= 14 && options.length <= 4 ? "25%" : "50%";
}

const OPTION_LETTERS = "abcdefghij";

/** The printed label of the option at `idx`: (a)…(j), then (11), (12)… */
export function optionLabel(idx: number): string {
  return `(${OPTION_LETTERS[idx] ?? idx + 1})`;
}

/** A grouped exercise prints an item's options when the item itself is a choice question, whatever its section. */
export function groupedItemPrintsOptions(q: { type?: string | null; options?: readonly string[] | null }): boolean {
  return isMcqLikeType(q.type) && Array.isArray(q.options) && q.options.length > 0;
}

/**
 * Splits a long stem (a reading passage) into its paragraphs so it can flow across a page break.
 * Stems with a table or display maths, and single-paragraph stems, stay whole.
 */
export function splitStemParagraphs(text: string): string[] {
  const src = text || "";
  if (/\$\$/.test(src) || extractTableFromText(src).table) return [src];
  const parts = src.split(/\n[ \t]*\n+/).map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [src];
}

/** A stem paragraph this short (an instruction line, a title) must not sit alone at the foot of a page. */
export function isShortStemPart(part: string): boolean {
  return part.length < 160;
}
