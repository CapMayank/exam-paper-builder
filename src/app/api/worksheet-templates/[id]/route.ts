import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { WORKSHEET_TEMPLATE_KIND } from "@/lib/worksheetTemplates";

const isManager = (role: string) => role === "ADMIN" || role === "SUPER_ADMIN";

/** DELETE: removes a saved template – by the teacher who saved it, or an administrator. Built-ins can't be removed. */
export const DELETE = route(async (_req, { id }, user) => {
  const row = await prisma.presetOverride.findUnique({ where: { kind_presetId: { kind: WORKSHEET_TEMPLATE_KIND, presetId: id } } });
  if (!row) throw new HttpError(404, "Template not found");
  if (row.updatedById !== user.id && !isManager(user.role)) throw new HttpError(403, "Only the teacher who saved this template, or an administrator, can remove it");
  await prisma.presetOverride.delete({ where: { id: row.id } });
  await recordAudit(user, "WORKSHEET_TEMPLATE_DELETE", "PRESET", id, {});
  return { ok: true };
});
