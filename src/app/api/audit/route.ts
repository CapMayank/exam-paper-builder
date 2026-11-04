import type { Prisma } from "@prisma/client";
import { route, HttpError } from "@/lib/api";
import { ACTIVITY_CATEGORIES, categoryOf, describeActivity, SECURITY_ENTITY_TYPES } from "@/lib/activityLog";
import { canViewAudit, canViewSecurityLog } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * The activity log. The Super Admin sees everything, including sign-ins, failed sign-ins and account changes,
 * with the address and browser they came from. Admins and the Exam Cell see the exam work only.
 * Filters: category, userId, action, entityType/entityId, search, from/to (YYYY-MM-DD); format=csv downloads.
 */
export const GET = route(
  async (req, _params, user) => {
    if (!canViewAudit(user)) {
      throw new HttpError(403, "Access restricted to Administrators and the Exam Cell");
    }
    const full = canViewSecurityLog(user);

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const csv = searchParams.get("format") === "csv";
    const limit = csv ? 5000 : Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = csv ? 0 : Math.max(Number(searchParams.get("offset")) || 0, 0);

    const and: Prisma.AuditLogWhereInput[] = [];
    if (!full) and.push({ entityType: { notIn: SECURITY_ENTITY_TYPES } }, { NOT: { action: { startsWith: "MIGRATION_" } } });
    if (entityType) and.push({ entityType });
    if (entityId) and.push({ entityId });
    if (action) and.push({ action });
    if (userId) and.push({ userId });
    const cat = ACTIVITY_CATEGORIES.find((c) => c.key === category);
    if (cat) and.push({ entityType: { in: [...cat.entityTypes] } });
    const day = (s: string | null, end: boolean) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T${end ? "23:59:59.999" : "00:00:00"}`) : null);
    const fromDate = day(from, false);
    const toDate = day(to, true);
    if (fromDate || toDate) and.push({ createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } });
    if (search) {
      and.push({
        OR: [
          { userName: { contains: search } },
          { action: { contains: search } },
          { detailsJson: { contains: search } },
          ...(full ? [{ ipAddress: { contains: search } }] : []),
        ],
      });
    }
    const where: Prisma.AuditLogWhereInput = and.length ? { AND: and } : {};

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      prisma.auditLog.count({ where }),
    ]);

    const rows = logs.map((l) => {
      const { ipAddress, userAgent, ...rest } = l;
      return {
        ...rest,
        ...(full ? { ipAddress, userAgent } : {}),
        category: categoryOf(l.entityType),
        createdAt: l.createdAt.toISOString(),
      };
    });

    if (csv) {
      const cell = (v: unknown) => {
        const s = String(v ?? "");
        // quoted, and never read as a formula by a spreadsheet
        return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
      };
      const header = ["When", "Who", "Role", "What", "Details", ...(full ? ["IP address", "Browser"] : []), "Action", "Entity", "Entity id"];
      const lines = rows.map((r) => {
        const { title, detail } = describeActivity(r);
        return [
          r.createdAt,
          r.userName,
          r.userRole,
          title,
          detail,
          ...(full ? [r.ipAddress, r.userAgent] : []),
          r.action,
          r.entityType,
          r.entityId ?? "",
        ]
          .map(cell)
          .join(",");
      });
      return new Response([header.map(cell).join(","), ...lines].join("\r\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="activity-log-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return { total, limit, offset, full, logs: rows };
  },
  { roles: ["ADMIN", "EXAM_CELL"] },
);
