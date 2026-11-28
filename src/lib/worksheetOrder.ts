/** The order after moving `id` to position `toIndex` (clamped to the list). Unknown ids leave it unchanged. */
export function moveToIndex(ids: string[], id: string, toIndex: number): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return [...ids];
  const rest = ids.filter((x) => x !== id);
  const to = Math.max(0, Math.min(rest.length, Math.floor(toIndex)));
  return [...rest.slice(0, to), id, ...rest.slice(to)];
}

/**
 * The worksheet's sections in the order of the given activities, or null when the list isn't exactly the
 * worksheet's activities (one missing, unknown or repeated) — the page that sent it is out of date.
 */
export function sectionOrderFor(items: { id: string; sectionId: string }[], itemIds: string[]): string[] | null {
  if (itemIds.length !== items.length || new Set(itemIds).size !== itemIds.length) return null;
  const sectionOf = new Map(items.map((i) => [i.id, i.sectionId]));
  const out: string[] = [];
  for (const id of itemIds) {
    const s = sectionOf.get(id);
    if (!s) return null;
    out.push(s);
  }
  return out;
}
