import { body, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { timetableEntrySchema } from "@/lib/schemas";

export const GET = route(async (req) => {
  const { searchParams } = new URL(req.url);
  const className = searchParams.get("className");
  const academicSession = searchParams.get("academicSession");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (className) where.className = className;
  if (academicSession) where.academicSession = academicSession;
  if (status) where.status = status;

  const entries = await prisma.examTimetableEntry.findMany({
    where,
    orderBy: [{ examDate: "asc" }, { startTime: "asc" }],
  });

  return entries.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));
});

export const POST = route(
  async (req, _params, user) => {
    const input = await body(req, timetableEntrySchema);

    const entry = await prisma.examTimetableEntry.create({
      data: {
        title: input.title,
        academicSession: input.academicSession,
        examType: input.examType,
        className: input.className,
        subject: input.subject,
        subjectCode: input.subjectCode,
        examDate: input.examDate,
        startTime: input.startTime,
        endTime: input.endTime,
        sessionSlot: input.sessionSlot,
        roomLocations: input.roomLocations,
        paperId: input.paperId ?? null,
        blueprintId: input.blueprintId ?? null,
        status: input.status,
        submissionDeadline: input.submissionDeadline,
        printingDeadline: input.printingDeadline,
      },
    });

    await recordAudit(user, "TIMETABLE_CREATE", "TIMETABLE", entry.id, {
      title: entry.title,
      className: entry.className,
      examDate: entry.examDate,
      subject: entry.subject,
    });

    return {
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  },
  { roles: ["ADMIN", "HOD", "EXAM_CELL"] },
);
