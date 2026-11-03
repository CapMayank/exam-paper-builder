import "server-only";
import type { Prisma } from "@prisma/client";
import { normalizeRole, type Assignment } from "./permissions";

/** What the admin users page and /api/me show for one account. */
export const userDirectorySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  assignments: { select: { className: true, subject: true }, orderBy: [{ className: "asc" }, { subject: "asc" }] },
  _count: { select: { questions: true, papers: true } },
} as const satisfies Prisma.UserSelect;

type Row = Prisma.UserGetPayload<{ select: typeof userDirectorySelect }>;

export function toUserDto(u: Row) {
  return { ...u, role: normalizeRole(u.role), createdAt: u.createdAt.toISOString() };
}

/** Drops blanks and duplicates (case-insensitive), and subject lines already covered by an in-charge line. */
export function cleanAssignments(list: Assignment[]): Assignment[] {
  const key = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const inCharge = new Set(list.filter((a) => !a.subject.trim()).map((a) => key(a.className)));
  const seen = new Set<string>();
  const out: Assignment[] = [];
  for (const a of list) {
    const className = a.className.trim().replace(/\s+/g, " ");
    const subject = a.subject.trim().replace(/\s+/g, " ");
    if (!className) continue;
    if (subject && inCharge.has(key(className))) continue;
    const k = `${key(className)}|${key(subject)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ className, subject });
  }
  return out.sort((a, b) => a.className.localeCompare(b.className) || a.subject.localeCompare(b.subject));
}
