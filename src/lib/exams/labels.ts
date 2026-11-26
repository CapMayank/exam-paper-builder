const PRE_PRIMARY: Record<string, string> = {
  nursery: "NUR",
  nur: "NUR",
  lkg: "KG I",
  "kg i": "KG I",
  "kg 1": "KG I",
  ukg: "KG II",
  "kg ii": "KG II",
  "kg 2": "KG II",
};

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** The short class name the printed date sheet uses: "Class 12" → "12th", "Nursery" → "NUR", "LKG" → "KG I". */
export function shortClassLabel(className: string): string {
  const name = className.trim();
  const pre = PRE_PRIMARY[name.toLowerCase()];
  if (pre) return pre;
  const m = /^class\s+(\d{1,2})$/i.exec(name);
  return m ? ordinal(Number(m[1])) : name;
}

const SHORT_SUBJECT: Record<string, string> = {
  mathematics: "Math",
  "mathematics standard": "Math",
  "mathematics basic": "Math (Basic)",
  "social science": "SST",
  biology: "Bio",
  "gk/drawing": "GK/Draw.",
  "gk / drawing": "GK/Draw.",
};

/** The short subject name the printed date sheet uses: "Mathematics" → "Math", "Social Science" → "SST". */
export function shortSubjectLabel(subject: string): string {
  return SHORT_SUBJECT[subject.trim().toLowerCase()] ?? subject;
}
