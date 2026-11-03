import { hash } from "bcryptjs";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { userCreateSchema } from "@/lib/schemas";
import { cleanAssignments, toUserDto, userDirectorySelect } from "@/lib/userDirectory";

export const GET = route(
  async () => {
    const users = await prisma.user.findMany({
      select: userDirectorySelect,
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return users.map(toUserDto);
  },
  { roles: ["ADMIN"] },
);

export const POST = route(
  async (req, _params, adminUser) => {
    const input = await body(req, userCreateSchema);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new HttpError(409, "A user with this email already exists");
    }

    const passwordHash = await hash(input.password, 10);
    // Only teachers hold class assignments; Admin and Exam Cell work school-wide.
    const assignments = input.role === "TEACHER" ? cleanAssignments(input.assignments) : [];
    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        active: true,
        assignments: { create: assignments },
      },
      select: userDirectorySelect,
    });

    await recordAudit(adminUser, "USER_CREATE", "USER", created.id, {
      name: created.name,
      email: created.email,
      role: created.role,
      assignments,
    });

    return toUserDto(created);
  },
  { roles: ["ADMIN"] },
);
