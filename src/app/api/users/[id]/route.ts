import { hash } from "bcryptjs";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/lib/schemas";

export const PATCH = route(
  async (req, params, adminUser) => {
    const targetUserId = params.id;
    const input = await body(req, userUpdateSchema);

    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true, department: true, active: true },
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
    if (input.department !== undefined) dataToUpdate.department = input.department;
    if (input.active !== undefined) dataToUpdate.active = input.active;
    if (input.password !== undefined) {
      dataToUpdate.passwordHash = await hash(input.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: dataToUpdate,
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

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    };
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
