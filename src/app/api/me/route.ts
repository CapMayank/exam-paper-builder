import { body, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { userProfileUpdateSchema } from "@/lib/schemas";
import { toUserDto, userDirectorySelect } from "@/lib/userDirectory";

export const GET = route(async (_req, _params, sessionUser) => {
  const me = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: userDirectorySelect });
  return me ? toUserDto(me) : sessionUser;
});

export const PATCH = route(async (req, _params, sessionUser) => {
  const input = await body(req, userProfileUpdateSchema);
  const dataToUpdate: { name?: string } = {};
  if (input.name !== undefined) dataToUpdate.name = input.name;

  const updated = await prisma.user.update({
    where: { id: sessionUser.id },
    data: dataToUpdate,
    select: userDirectorySelect,
  });

  await recordAudit(sessionUser, "USER_PROFILE_UPDATE", "USER", sessionUser.id, {
    updatedFields: Object.keys(dataToUpdate),
  });

  return toUserDto(updated);
});
