// Blueprint sections saved before a question type joined the school's lists (Reference to context in a 5-mark
// language section, Draw in maths, Map work at 2 marks...) keep their old stored list, so the new type never shows
// there. This adds the missing types; it never removes one an admin kept or added. Pure: no I/O.
import { rowAllowedTypes } from "./blueprintSetupPlan";
import { isKindergartenType } from "./constants";
import { classNumberOf } from "./internalChoiceRules";
import { parseAllowedTypes } from "./sectionTypes";

export type BackfillSection = {
  type: string;
  count: number;
  marksEach: number;
  allowedTypesJson: string | null;
  role?: string | null;
  slotPlanJson?: string | null;
};

/**
 * The section's stored list with the school's current forms added, or null when nothing is missing. Only up to
 * class 8 (board patterns keep strict types), never for kindergarten sections, and only for a stored list: an empty
 * one already takes the current defaults when papers load it.
 */
export function widenedAllowedTypes(section: BackfillSection, book: { className: string; subject: string }): string[] | null {
  const stored = parseAllowedTypes(section.allowedTypesJson);
  if (stored.length === 0 || isKindergartenType(section.type)) return null;
  const n = classNumberOf(book.className);
  if (n !== null && n > 8) return null;
  const current = rowAllowedTypes({ type: section.type, count: section.count, role: section.role, slotPlanJson: section.slotPlanJson }, section.marksEach, book.subject);
  const missing = current.filter((t) => !stored.includes(t));
  return missing.length > 0 ? [...stored, ...missing] : null;
}
