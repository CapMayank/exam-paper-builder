/**
 * The instruction to show after a mode switch: the new mode's automatic text when the current one is
 * blank or still one of the automatic texts, otherwise the teacher's own wording, untouched.
 */
/** Like followMode, for instructions worked out from the settings: replaced only while still the old automatic one. */
export function followAuto(current: string, previousAuto: string, nextAuto: string): string {
  return !current.trim() || current.trim() === previousAuto.trim() ? nextAuto : current;
}

export function followMode<M extends string>(current: string, auto: Record<M, string>, next: M): string {
  const text = current.trim();
  return !text || Object.values<string>(auto).some((a) => a.trim() === text) ? auto[next] : current;
}
