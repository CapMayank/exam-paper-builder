import { z } from "zod";
import { body, route } from "@/lib/api";
import { KINDERGARTEN_QUESTION_TYPES } from "@/lib/constants";
import { addWorksheetActivity } from "@/lib/worksheet";

const addSchema = z.object({
  type: z.enum(KINDERGARTEN_QUESTION_TYPES),
  text: z.string().trim().min(1).max(500),
  options: z.array(z.string().max(20000)).max(4).default([]),
  answer: z.string().max(5000).default(""),
  marks: z.number().int().min(1).max(50).default(2),
});

/** Adds one activity (question + its own one-slot section) to a worksheet. */
export const POST = route(async (req, { id }, user) => {
  const input = await body(req, addSchema);
  return addWorksheetActivity(id, user, input);
});
