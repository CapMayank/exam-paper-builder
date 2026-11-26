import { route } from "@/lib/api";
import { examSetup } from "@/lib/exams/server";

/** GET: scheduled class-subjects whose book has no blueprint for this exam, and those with no book at all. */
export const GET = route((_req, { id }) => examSetup(id), { roles: ["ADMIN", "EXAM_CELL"] });
