// One-off, idempotent: move accounts from the old department/HOD model to class assignments.
// HOD accounts become Teachers with no assignments; the Admin assigns their classes on the Faculty page.
// The free-text `department` column is left untouched (unused) so nothing is lost.
// Run: node scripts/migrate-rbac.mjs   (deploy.sh runs it after `prisma db push`)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const hods = await prisma.user.findMany({ where: { role: "HOD" }, select: { email: true, department: true } });
  if (hods.length === 0) {
    console.log("RBAC migration: nothing to do.");
  } else {
    await prisma.user.updateMany({ where: { role: "HOD" }, data: { role: "TEACHER" } });
    console.log(`RBAC migration: ${hods.length} HOD account(s) are now Teachers awaiting class assignment:`);
    for (const h of hods) console.log(`  - ${h.email}${h.department ? ` (was department: ${h.department})` : ""}`);
  }
} finally {
  await prisma.$disconnect();
}
