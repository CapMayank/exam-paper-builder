import { body, HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { classSubjectSchema } from "@/lib/schemas";

export const POST = route(
  async (req, params) => {
    const classId = params.id;
    const data = await body(req, classSubjectSchema);

    const existingClass = await prisma.academicClass.findUnique({
      where: { id: classId },
    });
    if (!existingClass) throw new HttpError(404, "Academic class not found");

    const subject = await prisma.classSubject.upsert({
      where: {
        classId_name: {
          classId,
          name: data.name.trim(),
        },
      },
      update: {
        code: data.code?.trim() || "",
      },
      create: {
        classId,
        name: data.name.trim(),
        code: data.code?.trim() || "",
      },
    });

    return subject;
  },
  { roles: ["ADMIN"] },
);
