import { route } from "@/lib/api";
import { addBooksFromPresets } from "@/lib/exams/server";

/** POST: creates the exam's missing books that have a built-in syllabus (GK and Drawing topic lists). Admins only. */
export const POST = route((_req, { id }, user) => addBooksFromPresets(id, user), { roles: ["ADMIN"] });
