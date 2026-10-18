import { compare, hash } from "bcryptjs";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/schemas";

export const POST = route(async (req, _params, sessionUser) => {
  const input = await body(req, changePasswordSchema);

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user) {
    throw new HttpError(404, "User account not found");
  }

  const matches = await compare(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw new HttpError(400, "Current password is incorrect");
  }

  if (input.currentPassword === input.newPassword) {
    throw new HttpError(400, "New password must be different from your current password");
  }

  const passwordHash = await hash(input.newPassword, 10);
  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash },
  });

  await recordAudit(sessionUser, "USER_PASSWORD_CHANGE", "USER", sessionUser.id, {
    email: user.email,
  });

  return { success: true, message: "Password changed successfully" };
});
