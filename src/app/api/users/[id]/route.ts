import { hash } from "bcryptjs";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { normalizeRole } from "@/lib/permissions";
import { userUpdateSchema } from "@/lib/schemas";
import { cleanAssignments, toUserDto, userDirectorySelect } from "@/lib/userDirectory";

export const PATCH = route(
  async (req, params, adminUser) => {
    const targetUserId = params.id;
    const input = await body(req, userUpdateSchema);

    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true, active: true, assignments: { select: { className: true, subject: true } } },
    });

    if (!existing) {
      throw new HttpError(404, "User not found");
    }

    // Safety check: Prevent the logged-in admin from demoting or deactivating their own account if they are the only active ADMIN
    if (existing.id === adminUser.id) {
      if (input.active === false) {
        throw new HttpError(400, "You cannot deactivate your own account");
      }
      if (input.role && input.role !== "ADMIN") {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN", active: true } });
        if (adminCount <= 1) {
          throw new HttpError(400, "Cannot remove the only active Administrator");
        }
      }
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (input.name !== undefined) dataToUpdate.name = input.name;
    if (input.role !== undefined) dataToUpdate.role = input.role;
    if (input.active !== undefined) dataToUpdate.active = input.active;
    if (input.password !== undefined) {
      dataToUpdate.passwordHash = await hash(input.password, 10);
    }

    // Only teachers hold class assignments; Admin and Exam Cell work school-wide.
    const finalRole = normalizeRole(input.role ?? existing.role);
    const nextAssignments =
      finalRole !== "TEACHER" ? [] : input.assignments !== undefined ? cleanAssignments(input.assignments) : null;
    if (nextAssignments) {
      dataToUpdate.assignments = { deleteMany: {}, create: nextAssignments };
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: dataToUpdate,
      select: userDirectorySelect,
    });

    if (nextAssignments && JSON.stringify(cleanAssignments(existing.assignments)) !== JSON.stringify(nextAssignments)) {
      await recordAudit(adminUser, "USER_ASSIGNMENT_CHANGE", "USER", targetUserId, {
        previous: existing.assignments,
        next: nextAssignments,
        targetEmail: existing.email,
      });
    }

    if (input.role !== undefined && input.role !== existing.role) {
      await recordAudit(adminUser, "USER_ROLE_CHANGE", "USER", targetUserId, {
        previousRole: existing.role,
        newRole: input.role,
        targetEmail: existing.email,
      });
    }

    if (input.active !== undefined && input.active !== existing.active) {
      await recordAudit(adminUser, "USER_STATUS_CHANGE", "USER", targetUserId, {
        previousStatus: existing.active ? "ACTIVE" : "INACTIVE",
        newStatus: input.active ? "ACTIVE" : "INACTIVE",
        targetEmail: existing.email,
      });
    }

    if (input.password !== undefined) {
      await recordAudit(adminUser, "USER_PASSWORD_RESET", "USER", targetUserId, {
        targetEmail: existing.email,
        targetName: existing.name,
      });
    }

    return toUserDto(updated);
  },
  { roles: ["ADMIN"] },
);

export const DELETE = route(
  async (_req, params, adminUser) => {
    const targetUserId = params.id;

    if (targetUserId === adminUser.id) {
      throw new HttpError(400, "You cannot delete your own account");
    }

    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!existing) {
      throw new HttpError(404, "User not found");
    }

    if (existing.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN", active: true } });
      if (adminCount <= 1) {
        throw new HttpError(400, "Cannot delete the only active Administrator");
      }
    }

    // Safely reassign any questions, papers, and snapshots to the executing admin so institutional records remain intact
    await prisma.$transaction([
      prisma.question.updateMany({
        where: { createdById: targetUserId },
        data: { createdById: adminUser.id },
      }),
      prisma.paper.updateMany({
        where: { createdById: targetUserId },
        data: { createdById: adminUser.id },
      }),
      prisma.paperSnapshot.updateMany({
        where: { createdById: targetUserId },
        data: { createdById: adminUser.id },
      }),
      prisma.user.delete({
        where: { id: targetUserId },
      }),
    ]);

    await recordAudit(adminUser, "USER_DELETE", "USER", targetUserId, {
      deletedEmail: existing.email,
      deletedName: existing.name,
      reassignedToAdmin: adminUser.email,
    });

    return { success: true, deletedId: targetUserId };
  },
  { roles: ["ADMIN"] },
);
