import { allocateComponents, parseComponents } from "./languageComponents";
import type { MarkingComponent } from "./officialMarkingSchemes";

type SectionLite = { id: string; type: string; count: number; marksEach: number };

/** A multi-pair match section is one question carrying all its pairs. */
const isMultiMatch = (s: SectionLite) => s.type === "MATCH_COLUMN" && s.count > 1 && s.marksEach === 1;

/**
 * Suggested component for every slot of a blueprint (key "sectionId:slotIndex"), so AI generation and
 * auto-fill can label each question before it exists. Deterministic; the teacher can change any of it.
 */
export function suggestSlotComponents(sections: SectionLite[], componentsJson: string | null | undefined): Record<string, string> {
  const components = parseComponents(componentsJson);
  if (components.length === 0) return {};
  const units: Array<{ id: string; marks: number; type: string }> = [];
  for (const s of sections) {
    if (isMultiMatch(s)) units.push({ id: `${s.id}:0`, marks: s.count, type: s.type });
    else for (let i = 0; i < s.count; i++) units.push({ id: `${s.id}:${i}`, marks: s.marksEach, type: s.type });
  }
  return allocateComponents(units, components);
}

export function componentTitle(components: MarkingComponent[], key?: string | null): string | undefined {
  return components.find((c) => c.key === key)?.title;
}

/** Looks up the suggestion for a slot, treating all slots of a multi-pair match section as one. */
export function slotComponentKey(
  suggestion: Record<string, string>,
  section: SectionLite,
  slotIndex: number,
): string | undefined {
  return suggestion[`${section.id}:${isMultiMatch(section) ? 0 : slotIndex}`];
}
