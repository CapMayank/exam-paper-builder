import { body, route } from "@/lib/api";
import { setSlotPaper, setSlotPrinted } from "@/lib/exams/server";
import { examSlotPatchSchema } from "@/lib/schemas";

/** PATCH { paperId } links a paper; PATCH { printed } marks it printed or not. */
export const PATCH = route(async (req, { id, slotId }, user) => {
  const input = await body(req, examSlotPatchSchema);
  return "printed" in input ? setSlotPrinted(id, slotId, input.printed, user) : setSlotPaper(id, slotId, input.paperId, user);
}, { roles: ["ADMIN", "EXAM_CELL"] });
