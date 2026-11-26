import { body, route } from "@/lib/api";
import { setCell } from "@/lib/exams/server";
import { examCellSchema } from "@/lib/schemas";

/** PUT { blockId, className, date, subject }: sets one cell of the date sheet (subject null = no exam). */
export const PUT = route(async (req, { id }, user) => setCell(id, await body(req, examCellSchema), user), { roles: ["ADMIN", "EXAM_CELL"] });
