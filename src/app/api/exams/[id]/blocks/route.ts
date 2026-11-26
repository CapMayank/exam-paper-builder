import { body, route } from "@/lib/api";
import { addBlock } from "@/lib/exams/server";
import { examBlockCreateSchema } from "@/lib/schemas";

export const POST = route(async (req, { id }, user) => addBlock(id, await body(req, examBlockCreateSchema), user), { roles: ["ADMIN", "EXAM_CELL"] });
