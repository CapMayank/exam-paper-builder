import { z } from "zod";
import { body, route } from "@/lib/api";
import { checkBlueprintFeasibility } from "@/lib/blueprint";

const feasibilityCheckSchema = z.object({
  sections: z.array(
    z.object({
      count: z.number().int().min(1),
      marksEach: z.number().int().min(1),
    })
  ),
  chapters: z.array(
    z.object({
      chapterId: z.string().min(1),
      marks: z.number().int().min(0),
      title: z.string().optional(),
      number: z.number().nullable().optional(),
    })
  ),
  enforceMarksConservation: z.boolean().optional(),
});

export const POST = route(
  async (req) => {
    const input = await body(req, feasibilityCheckSchema);
    const warnings = checkBlueprintFeasibility({
      sections: input.sections,
      chapters: input.chapters,
      enforceMarksConservation: input.enforceMarksConservation,
    });

    return {
      isFeasible: warnings.length === 0,
      warnings,
    };
  },
  { auth: false }
);
