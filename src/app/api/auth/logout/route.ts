import { route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { endSession, sessionUserId } from "@/lib/session";

export const POST = route(
  async (req) => {
    const id = await sessionUserId(req);
    const user = id ? await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true, email: true } }) : null;
    await endSession();
    if (user) await recordAudit(user, "LOGOUT", "AUTH", user.id, { email: user.email });
    return { ok: true };
  },
  { auth: false },
);
