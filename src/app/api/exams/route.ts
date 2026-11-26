import { body, route } from "@/lib/api";
import { createExam, listExams } from "@/lib/exams/server";
import { examCreateSchema } from "@/lib/schemas";

const managers = { roles: ["ADMIN", "EXAM_CELL"] } satisfies Parameters<typeof route>[1];

export const GET = route(() => listExams(), managers);

export const POST = route(async (req, _params, user) => createExam(await body(req, examCreateSchema), user), managers);
