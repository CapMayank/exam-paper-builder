import { z } from "zod";
import { body, route } from "@/lib/api";
import { adaptCustomSchoolBlueprint } from "@/lib/blueprints";
import { checkBlueprintFeasibility } from "@/lib/blueprint";

const adaptRequestSchema = z.object({
  baseTemplateId: z.string().min(1),
  bookId: z.string().min(1),
  term: z.enum(["QUARTERLY", "HALF_YEARLY", "PRE_BOARD", "UNIT_TEST"]),
  activeChapterIds: z.array(z.string().min(1)).min(1, "Select at least one active chapter"),
});

export const POST = route(async (req) => {
  const input = await body(req, adaptRequestSchema);
  const adapted = await adaptCustomSchoolBlueprint(
    input.baseTemplateId,
    input.bookId,
    input.term,
    input.activeChapterIds
  );

  const warnings = checkBlueprintFeasibility({
    sections: adapted.sections,
    chapters: adapted.chapters,
  });

  return {
    blueprint: adapted,
    feasibility: {
      isFeasible: warnings.length === 0,
      warnings,
    },
  };
});
