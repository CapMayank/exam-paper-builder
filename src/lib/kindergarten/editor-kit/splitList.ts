/** Split pasted or typed text ("A B C", "cat, dog") into list items. */
export function splitList(raw: string): string[] {
  return raw
    .split(/[\s,]+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}
