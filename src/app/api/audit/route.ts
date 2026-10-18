import { route, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = route(
  async (req, _params, user) => {
    // Only Admin, HOD, and Exam Cell can view audit trail
    if (user.role !== "ADMIN" && user.role !== "HOD" && user.role !== "EXAM_CELL") {
      throw new HttpError(403, "Access restricted to Administrators, Department Heads, and Exam Cell officers");
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (search) {
      where.OR = [
        { userName: { contains: search } },
        { action: { contains: search } },
        { detailsJson: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      total,
      limit,
      offset,
      logs: logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  },
  { roles: ["ADMIN", "HOD", "EXAM_CELL"] },
);
