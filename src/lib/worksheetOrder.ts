/** The order after moving `id` to position `toIndex` (clamped to the list). Unknown ids leave it unchanged. */
export function moveToIndex(ids: string[], id: string, toIndex: number): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return [...ids];
  const rest = ids.filter((x) => x !== id);
  const to = Math.max(0, Math.min(rest.length, Math.floor(toIndex)));
  return [...rest.slice(0, to), id, ...rest.slice(to)];
}
