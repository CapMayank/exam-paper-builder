const TIME = /(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/gi;

/** Minutes since midnight; `meridiem` "am"/"pm" or undefined for a 24-hour (or unmarked) time. */
function toMinutes(h: number, m: number, meridiem: string | undefined): number | null {
  if (m > 59) return null;
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    const pm = meridiem.toLowerCase().startsWith("p");
    return ((h % 12) + (pm ? 12 : 0)) * 60 + m;
  }
  return h > 23 ? null : h * 60 + m;
}

/**
 * How long an exam sitting is, read from a date sheet's time line ("11:00 am to 02:00 pm" → 180), or null when
 * the line can't be read. An unmarked end earlier than the start is taken as afternoon ("11:00 to 2:00" → 180).
 */
export function minutesBetween(timeText: string): number | null {
  const found = [...timeText.matchAll(TIME)];
  if (found.length < 2) return null;
  const [a, b] = found;
  const start = toMinutes(Number(a[1]), Number(a[2] ?? 0), a[3]);
  let end = toMinutes(Number(b[1]), Number(b[2] ?? 0), b[3]);
  if (start === null || end === null) return null;
  if (!b[3] && end <= start && end + 12 * 60 > start) end += 12 * 60;
  const span = end - start;
  return span > 0 && span <= 8 * 60 ? span : null;
}
