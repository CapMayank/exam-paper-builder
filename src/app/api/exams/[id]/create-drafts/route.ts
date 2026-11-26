import { z } from "zod";
import { body, route } from "@/lib/api";
import { createMissingDrafts } from "@/lib/exams/server";

const schema = z.object({ slotId: z.string().min(1).optional() });

/** POST {} creates a draft for every slot with a blueprint and no paper; POST { slotId } for one. Papers are made by Admins. */
export const POST = route(async (req, { id }, user) => createMissingDrafts(id, user, (await body(req, schema)).slotId), { roles: ["ADMIN"] });
