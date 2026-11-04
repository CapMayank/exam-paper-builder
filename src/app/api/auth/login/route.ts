import { compare, hash } from "bcryptjs";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { clearLoginFailures, clientIp, loginBlockedFor, recordLoginFailure } from "@/lib/loginThrottle";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas";
import { startSession } from "@/lib/session";

export const POST = route(
  async (req) => {
    const { email, password } = await body(req, loginSchema);
    const ip = clientIp(req.headers);

    const wait = loginBlockedFor(ip, email);
    if (wait > 0) {
      await recordAudit({ id: null, name: email, role: "UNKNOWN" }, "LOGIN_BLOCKED", "AUTH", null, { email, minutesLeft: wait });
      throw new HttpError(429, `Too many wrong passwords. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Compare against a dummy hash when the user is missing so timing doesn't reveal which emails exist.
    const ok = await compare(password, user?.passwordHash ?? (await hash("x", 4)));
    if (!user || !ok) {
      const blocked = recordLoginFailure(ip, email);
      await recordAudit(
        user ? { id: user.id, name: user.name, role: user.role } : { id: null, name: email, role: "UNKNOWN" },
        "LOGIN_FAILED",
        "AUTH",
        user?.id ?? null,
        { email, reason: user ? "WRONG_PASSWORD" : "UNKNOWN_EMAIL", nowBlocked: blocked },
      );
      throw new HttpError(401, "Wrong email or password");
    }
    if (!user.active) {
      await recordAudit({ id: user.id, name: user.name, role: user.role }, "LOGIN_FAILED", "AUTH", user.id, { email, reason: "DEACTIVATED" });
      throw new HttpError(403, "This account is deactivated. Please contact your school administrator.");
    }
    clearLoginFailures(ip, email);
    await startSession(user.id, user.sessionVersion);
    await recordAudit({ id: user.id, name: user.name, role: user.role }, "LOGIN_SUCCESS", "AUTH", user.id, { email });
    return { id: user.id, name: user.name, email: user.email };
  },
  { auth: false },
);
