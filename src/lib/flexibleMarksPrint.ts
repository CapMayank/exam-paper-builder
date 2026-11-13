import { questionSlotMarks } from "./blueprint";
import { getPaperLocale } from "./localization";
import type { PaperLanguage } from "./localization/types";

type PrintSection = Parameters<typeof questionSlotMarks>[0];
type PrintQuestion = Parameters<typeof questionSlotMarks>[1];

/**
 * When a match question spans several slots of a non-match section (class 8 and below), the blueprint's
 * "count x marks each" formula no longer describes what is printed. Returns the real question count and marks of that
 * section, or null when the usual formula is still true.
 */
export function spanningSectionTotals(
  section: PrintSection,
  questions: PrintQuestion[],
): { count: number; marks: number } | null {
  if (section.type === "MATCH_COLUMN") return null;
  const slots = questions.map((q) => questionSlotMarks(section, q));
  if (!slots.some((s, i) => questions[i].type === "MATCH_COLUMN" && s.units > 1)) return null;
  return { count: questions.length, marks: slots.reduce((sum, s) => sum + s.marks, 0) };
}

/** The line printed for a section's items: the usual "n x m = t" formula, or the true total when a match spans slots. */
export function sectionItemsFormula(
  section: PrintSection & { type: string },
  questions: PrintQuestion[],
  usualFormula: string,
  lang: PaperLanguage = "en",
): string {
  const totals = spanningSectionTotals(section, questions);
  if (!totals) return usualFormula;
  return getPaperLocale(lang).section.formatGroupSummary(totals.count, totals.marks, {
    displayedCount: totals.count,
    rawItemCount: totals.count,
    type: section.type,
  });
}
