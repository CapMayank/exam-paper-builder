import { z } from "zod";
import { body, route } from "@/lib/api";
import { applySetup, planSetup } from "@/lib/blueprintSetup";
import { EXAM_TYPES } from "@/lib/constants";

const setupSchema = z.object({
  mode: z.enum(["plan", "apply"]),
  exam: z.object({
    examType: z.enum(EXAM_TYPES),
    academicSession: z.string().trim().min(4).max(20),
    durationMin: z.number().int().min(5).max(600).nullable().optional(),
  }),
  rows: z
    .array(
      z.object({
        bookId: z.string().min(1),
        presetId: z.string().min(1),
        action: z.enum(["create", "update", "skip"]).optional(),
        targetBlueprintId: z.string().min(1).optional(),
      }),
    )
    .min(1)
    .max(300),
});

/**
 * POST { mode: "plan", exam, rows }   what setting these up would do: existing blueprints of the same exam per book,
 *                                     and what updating each would do to its papers. Changes nothing.
 * POST { mode: "apply", exam, rows }  creates or updates each row's blueprint (or skips it) and reports per row.
 */
export const POST = route(
  async (req, _params, user) => {
    const input = await body(req, setupSchema);
    return input.mode === "plan" ? planSetup(input.exam, input.rows, user) : applySetup(input.exam, input.rows, user);
  },
  { roles: ["ADMIN", "TEACHER"] },
);
