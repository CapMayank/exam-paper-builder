import { route } from "@/lib/api";
import { copyExam } from "@/lib/exams/server";

/** POST: a new Draft exam with the same blocks, dates, classes and subjects; no linked papers or printed marks. */
export const POST = route((_req, { id }, user) => copyExam(id, user), { roles: ["ADMIN", "EXAM_CELL"] });
