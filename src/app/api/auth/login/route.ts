import { compare, hash } from "bcryptjs";
import { body, HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas";
import { startSession } from "@/lib/session";

export const POST = route(
  async (req) => {
    const { email, password } = await body(req, loginSchema);
    const user = await prisma.user.findUnique({ where: { email } });
    // Compare against a dummy hash when the user is missing so timing doesn't reveal which emails exist.
    const ok = await compare(password, user?.passwordHash ?? (await hash("x", 4)));
    if (!user || !ok) throw new HttpError(401, "Wrong email or password");
    if (!user.active) throw new HttpError(403, "This account is deactivated. Please contact your school administrator.");
    await startSession(user.id);
    return { id: user.id, name: user.name, email: user.email };
  },
  { auth: false },
);
