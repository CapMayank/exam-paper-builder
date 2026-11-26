import { body, route } from "@/lib/api";
import { deleteBlock, patchBlock } from "@/lib/exams/server";
import { examBlockPatchSchema } from "@/lib/schemas";

const managers = { roles: ["ADMIN", "EXAM_CELL"] } satisfies Parameters<typeof route>[1];

/** PATCH one change: title, timeText, position, addDate, removeDate, moveDate, addClass or removeClass. */
export const PATCH = route(async (req, { id, blockId }, user) => patchBlock(id, blockId, await body(req, examBlockPatchSchema), user), managers);

export const DELETE = route((_req, { id, blockId }, user) => deleteBlock(id, blockId, user), managers);
