import { z } from "zod";
import { body, route } from "@/lib/api";
import { adaptCustomSchoolBlueprint } from "@/lib/blueprints";

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

  return {
    blueprint: adapted,
    // kept for older clients: chapter marks no longer have to be formable from the question sizes
    feasibility: { isFeasible: true, warnings: [] as string[] },
  };
});
