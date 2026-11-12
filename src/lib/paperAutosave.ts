/**
 * What the paper workbench's autosave should send.
 *
 * `loaded` is the details as last loaded from (or saved to) the server, `current` is what the form holds now.
 * Fields are compared one by one with strict equality (the details object is flat and holds primitives).
 * A required field that is empty after trimming is not valid to send, so it is left out and the other
 * changes still go through (the server would reject the whole payload otherwise).
 *
 * Fields that differ from what was loaded and are valid to send; null when there is nothing to save.
 */
export function autosavePatch<T extends Record<string, unknown>>(
  loaded: T,
  current: T,
  required: readonly (keyof T)[],
): Partial<T> | null {
  const patch: Partial<T> = {};
  let changed = false;
  for (const key of Object.keys(current) as (keyof T)[]) {
    const value = current[key];
    if (value === loaded[key]) continue;
    if (required.includes(key) && typeof value === "string" && value.trim() === "") continue;
    patch[key] = value;
    changed = true;
  }
  return changed ? patch : null;
}
