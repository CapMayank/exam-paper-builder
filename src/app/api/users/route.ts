import { hash } from "bcryptjs";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { userCreateSchema } from "@/lib/schemas";

export const GET = route(
  async (_req, _params, user) => {
    // Only Admin and HOD can inspect user list
    if (user.role !== "ADMIN" && user.role !== "HOD") {
      throw new HttpError(403, "Only Administrators and Department Heads can view user directory");
    }

    const users = await prisma.user.findMany({
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
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));
  },
  { roles: ["ADMIN", "HOD"] },
);

export const POST = route(
  async (req, _params, adminUser) => {
    const input = await body(req, userCreateSchema);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new HttpError(409, "A user with this email already exists");
    }

    const passwordHash = await hash(input.password, 10);
    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        department: input.department,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        active: true,
        createdAt: true,
      },
    });

    await recordAudit(adminUser, "USER_CREATE", "USER", created.id, {
      name: created.name,
      email: created.email,
      role: created.role,
      department: created.department,
    });

    return {
      ...created,
      createdAt: created.createdAt.toISOString(),
    };
  },
  { roles: ["ADMIN"] },
);
