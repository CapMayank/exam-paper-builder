import { body, route } from "@/lib/api";
import { deleteExam, loadExamView, updateExam } from "@/lib/exams/server";
import { examUpdateSchema } from "@/lib/schemas";

const managers = { roles: ["ADMIN", "EXAM_CELL"] } satisfies Parameters<typeof route>[1];

export const GET = route((_req, { id }) => loadExamView(id), managers);

export const PATCH = route(async (req, { id }, user) => updateExam(id, await body(req, examUpdateSchema), user), managers);

export const DELETE = route((_req, { id }, user) => deleteExam(id, user), managers);
