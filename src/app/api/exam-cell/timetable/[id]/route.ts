import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { timetableUpdateSchema } from "@/lib/schemas";

export const PATCH = route(
  async (req, params, user) => {
    const entryId = params.id;
    const input = await body(req, timetableUpdateSchema);

    const existing = await prisma.examTimetableEntry.findUnique({ where: { id: entryId } });
    if (!existing) throw new HttpError(404, "Timetable entry not found");

    const updated = await prisma.examTimetableEntry.update({
      where: { id: entryId },
      data: input,
    });

    await recordAudit(user, "TIMETABLE_UPDATE", "TIMETABLE", entryId, {
      title: updated.title,
      examDate: updated.examDate,
      status: updated.status,
    });

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },
  { roles: ["ADMIN", "HOD", "EXAM_CELL"] },
);

export const DELETE = route(
  async (_req, params, user) => {
    const entryId = params.id;
    const existing = await prisma.examTimetableEntry.findUnique({ where: { id: entryId } });
    if (!existing) throw new HttpError(404, "Timetable entry not found");

    await prisma.examTimetableEntry.delete({ where: { id: entryId } });

    await recordAudit(user, "TIMETABLE_DELETE", "TIMETABLE", entryId, {
      title: existing.title,
      examDate: existing.examDate,
    });

    return { ok: true, deletedId: entryId };
  },
  { roles: ["ADMIN", "HOD", "EXAM_CELL"] },
);
