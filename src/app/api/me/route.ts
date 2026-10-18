import { body, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { userProfileUpdateSchema } from "@/lib/schemas";

export const GET = route(async (_req, _params, sessionUser) => {
  const me = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      active: true,
      createdAt: true,
      _count: {
        select: {
          questions: true,
          papers: true,
        },
      },
    },
  });

  if (!me) return sessionUser;

  return {
    ...me,
    createdAt: me.createdAt.toISOString(),
  };
});

export const PATCH = route(async (req, _params, sessionUser) => {
  const input = await body(req, userProfileUpdateSchema);
  const dataToUpdate: { name?: string; department?: string } = {};
  if (input.name !== undefined) dataToUpdate.name = input.name;
  if (input.department !== undefined) dataToUpdate.department = input.department;

  const updated = await prisma.user.update({
    where: { id: sessionUser.id },
    data: dataToUpdate,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      active: true,
      createdAt: true,
      _count: {
        select: {
          questions: true,
          papers: true,
        },
      },
    },
  });

  await recordAudit(sessionUser, "USER_PROFILE_UPDATE", "USER", sessionUser.id, {
    updatedFields: Object.keys(dataToUpdate),
  });

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  };
});
