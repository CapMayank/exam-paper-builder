import { randomUUID } from "node:crypto";
import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { BUILT_IN_TEMPLATES, cleanTemplate, WORKSHEET_TEMPLATE_KIND, type WorksheetTemplate } from "@/lib/worksheetTemplates";

type StoredTemplate = Omit<WorksheetTemplate, "id" | "builtIn">;

/** GET: every worksheet template – built-in ones, then the ones teachers of this school saved. */
export const GET = route(async () => {
  const rows = await prisma.presetOverride.findMany({ where: { kind: WORKSHEET_TEMPLATE_KIND, hidden: false }, orderBy: { createdAt: "desc" } });
  const saved: WorksheetTemplate[] = rows.flatMap((r) => {
    const d = r.data as StoredTemplate | null;
    if (!d || !Array.isArray(d.activities)) return [];
    return [{ ...d, id: r.presetId, builtIn: false, createdById: r.updatedById ?? undefined, createdByName: r.updatedByName ?? undefined }];
  });
  return [...saved, ...BUILT_IN_TEMPLATES];
});

const activitySchema = z.object({
  type: z.string().max(60),
  text: z.string().max(500).optional(),
  options: z.array(z.string().max(20000)).max(4).optional(),
  marks: z.number().int().min(1).max(50),
});

/** POST { name, className, subject, activities }: saves a template every teacher of the school can use. */
export const POST = route(async (req, _params, user) => {
  const input = await body(
    req,
    z.object({ name: z.string().max(200), className: z.string().max(40), subject: z.string().max(80), activities: z.array(activitySchema).max(20) }),
  );
  let data: StoredTemplate;
  try {
    data = cleanTemplate(input);
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
  const id = `wt-${randomUUID().slice(0, 8)}`;
  await prisma.presetOverride.create({
    data: { kind: WORKSHEET_TEMPLATE_KIND, presetId: id, data: data as object, updatedById: user.id, updatedByName: user.name },
  });
  await recordAudit(user, "WORKSHEET_TEMPLATE_CREATE", "PRESET", id, { name: data.name, className: data.className, subject: data.subject });
  return { ...data, id, builtIn: false, createdById: user.id, createdByName: user.name } satisfies WorksheetTemplate;
});
