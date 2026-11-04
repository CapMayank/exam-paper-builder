// One-off, idempotent access migrations, run by the deploy after `prisma db push`.
//  1. HOD accounts (old department model) become Teachers with no assignments; the free-text `department`
//     column is left untouched (unused) so nothing is lost.
//  2. Super Admin: every account that was an Administrator before the Super Admin role existed becomes a
//     Super Admin, once, so nobody loses the right to manage access. A marker row in the audit log records that
//     it ran; Administrators created later stay Administrators.
// Run: node scripts/migrate-rbac.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SUPER_ADMIN_MARKER = "MIGRATION_SUPER_ADMIN";

try {
  const hods = await prisma.user.findMany({ where: { role: "HOD" }, select: { email: true, department: true } });
  if (hods.length > 0) {
    await prisma.user.updateMany({ where: { role: "HOD" }, data: { role: "TEACHER" } });
    console.log(`RBAC migration: ${hods.length} HOD account(s) are now Teachers awaiting class assignment:`);
    for (const h of hods) console.log(`  - ${h.email}${h.department ? ` (was department: ${h.department})` : ""}`);
  }

  const done = await prisma.auditLog.findFirst({ where: { action: SUPER_ADMIN_MARKER }, select: { id: true } });
  if (!done) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true } });
    await prisma.$transaction([
      prisma.user.updateMany({ where: { role: "ADMIN" }, data: { role: "SUPER_ADMIN" } }),
      prisma.auditLog.create({
        data: {
          userName: "System",
          userRole: "SYSTEM",
          action: SUPER_ADMIN_MARKER,
          entityType: "USER",
          detailsJson: JSON.stringify({ promoted: admins.map((a) => a.email) }),
        },
      }),
    ]);
    console.log(`RBAC migration: ${admins.length} Administrator account(s) are now Super Administrators:`);
    for (const a of admins) console.log(`  - ${a.email}`);
  } else if (hods.length === 0) {
    console.log("RBAC migration: nothing to do.");
  }
} finally {
  await prisma.$disconnect();
}
