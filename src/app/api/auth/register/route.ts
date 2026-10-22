import { hash } from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import { body, HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/schemas";
import { startSession } from "@/lib/session";

function codeMatches(given: string) {
  const expected = process.env.SCHOOL_CODE;
  if (!expected) throw new HttpError(500, "SCHOOL_CODE is not configured on the server");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const POST = route(
  async (req) => {
    const input = await body(req, registerSchema);
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      throw new HttpError(
        403,
        "Public self-registration is closed. Faculty accounts are provisioned directly by the School Administrator in Faculty & Team Management.",
      );
    }

    if (process.env.SCHOOL_CODE) {
      if (!input.schoolCode || !codeMatches(input.schoolCode)) {
        throw new HttpError(403, "Wrong school code");
      }
    }

    if (await prisma.user.findUnique({ where: { email: input.email } })) {
      throw new HttpError(409, "An account with this email already exists");
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hash(input.password, 10),
        role: "ADMIN",
      },
    });
    await startSession(user.id);
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },
  { auth: false },
);
