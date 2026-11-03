import { z } from "zod";
import { body, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { DEFAULT_ACADEMIC_SESSION, EXAM_TYPES, KG_CLASSES } from "@/lib/constants";
import { assertCanManageScope } from "@/lib/papers";
import { createWorksheet } from "@/lib/worksheet";

const worksheetSchema = z.object({
  title: z.string().trim().min(1).max(160),
  className: z.enum(KG_CLASSES),
  subject: z.string().trim().min(1).max(80),
  schoolName: z.string().trim().min(1).max(120),
  examType: z.enum(EXAM_TYPES).default("UNIT_TEST"),
  examDate: z.string().max(40).default(""),
  academicSession: z.string().max(40).default(DEFAULT_ACADEMIC_SESSION),
  language: z.enum(["en", "hi", "sa", "bilingual"]).default("en"),
});

/** Creates a Nursery / LKG / UKG worksheet. No blueprint or book needed – they are managed behind the scenes. */
export const POST = route(async (req, _params, user) => {
  const input = await body(req, worksheetSchema);
  assertCanManageScope(user, input);
  const paper = await createWorksheet(user, input);
  await recordAudit(user, "PAPER_CREATE", "PAPER", paper.id, { title: paper.title, kind: "KG_WORKSHEET" });
  return { id: paper.id };
});
