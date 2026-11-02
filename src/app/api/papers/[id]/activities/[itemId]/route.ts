import { z } from "zod";
import { body, route } from "@/lib/api";
import { removeWorksheetActivity, updateWorksheetActivity } from "@/lib/worksheet";

const patchSchema = z.object({
  text: z.string().trim().min(1).max(500).optional(),
  options: z.array(z.string().max(20000)).max(4).optional(),
  answer: z.string().max(5000).optional(),
  marks: z.number().int().min(1).max(50).optional(),
  move: z.enum(["up", "down"]).optional(),
});

export const PUT = route(async (req, { id, itemId }, user) => {
  const input = await body(req, patchSchema);
  return updateWorksheetActivity(id, itemId, user, input);
});

export const DELETE = route(async (_req, { id, itemId }, user) => {
  return removeWorksheetActivity(id, itemId, user);
});
