import { body, route } from "@/lib/api";
import { getSignature, setSignature } from "@/lib/exams/server";
import { signatureSettingSchema } from "@/lib/schemas";

/** The Principal's signature and seal image printed on date sheets (an upload's file name). */
export const GET = route(() => getSignature(), { roles: ["ADMIN", "EXAM_CELL"] });

export const PUT = route(async (req, _params, user) => setSignature((await body(req, signatureSettingSchema)).fileName, user), { roles: ["ADMIN"] });
