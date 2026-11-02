import { HttpError, route } from "@/lib/api";
import { componentTitle, slotComponentKey, suggestSlotComponents } from "@/lib/componentSuggestion";
import { parseComponents } from "@/lib/languageComponents";
import { planPaperSlotAssignments } from "@/lib/paperAutogen";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";

export const GET = route(async (_req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);

  const plan = planPaperSlotAssignments(paper);

  // language papers: suggest which syllabus component each slot is for
  const bp = paper.blueprint as { componentsJson?: string; sections: Array<{ id: string; type: string; count: number; marksEach: number }> };
  const suggestion = suggestSlotComponents(bp.sections, bp.componentsJson);
  const comps = parseComponents(bp.componentsJson);
  for (const sec of plan.sections) {
    const def = bp.sections.find((x) => x.id === sec.sectionId);
    if (!def) continue;
    for (const slot of sec.slots) {
      const key = slotComponentKey(suggestion, def, slot.slotIndex);
      if (key) {
        slot.componentKey = key;
        slot.componentTitle = componentTitle(comps, key);
      }
    }
  }

  return {
    success: true,
    plan,
  };
});
