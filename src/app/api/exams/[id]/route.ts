import { body, route } from "@/lib/api";
import { deleteExam, linkFreePapers, loadExamView, updateExam } from "@/lib/exams/server";
import { examUpdateSchema } from "@/lib/schemas";

const managers = { roles: ["ADMIN", "EXAM_CELL"] } satisfies Parameters<typeof route>[1];

// opening an exam picks up papers made since the last visit
export const GET = route(async (_req, { id }, user) => {
  await linkFreePapers(id, user);
  return loadExamView(id);
}, managers);

export const PATCH = route(async (req, { id }, user) => updateExam(id, await body(req, examUpdateSchema), user), managers);

export const DELETE = route((_req, { id }, user) => deleteExam(id, user), managers);
