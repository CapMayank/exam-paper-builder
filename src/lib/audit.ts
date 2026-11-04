import "server-only";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import type { SessionUser } from "./api";
import { clientIp } from "./loginThrottle";
import { markAudited } from "./auditContext";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGIN_BLOCKED"
  | "LOGOUT"
  | "PAPER_CREATE"
  | "PAPER_UPDATE"
  | "PAPER_STATUS_CHANGE"
  | "PAPER_DUPLICATE"
  | "PAPER_PRINT"
  | "PAPER_EXPORT_DOCX"
  | "PAPER_OMR_VIEW"
  | "PARALLEL_SETS_GENERATE"
  | "QUESTION_CREATE"
  | "QUESTION_UPDATE"
  | "QUESTION_DELETE"
  | "USER_ROLE_CHANGE"
  | "USER_ASSIGNMENT_CHANGE"
  | "USER_CREATE"
  | "USER_STATUS_CHANGE"
  | "USER_DELETE"
  | "USER_PASSWORD_CHANGE"
  | "USER_PASSWORD_RESET"
  | "USER_PROFILE_UPDATE"
  | "CALCULATOR_ESTIMATE"
  | "TIMETABLE_CREATE"
  | "TIMETABLE_UPDATE"
  | "TIMETABLE_DELETE"
  | "BOOK_IMPORT"
  | "ACADEMIC_ROLLOVER"
  | "PAPER_SNAPSHOT_CREATE"
  | "PAPER_SNAPSHOT_RESTORE"
  | "PAPER_SNAPSHOT_DELETE"
  | "QUESTION_BULK_UPDATE"
  | "PAPERS_EXPORT_ZIP"
  /** A change made through any other route; details hold the method and path. */
  | "API_CHANGE";

export type AuditEntityType =
  | "AUTH"
  | "PAPER"
  | "QUESTION"
  | "BLUEPRINT"
  | "USER"
  | "TIMETABLE"
  | "LOGISTICS"
  | "BOOK"
  | "ACADEMIC_SESSION"
  | "CHAPTER"
  | "CLASS"
  | "AI"
  | "UPLOAD"
  | "CURRICULUM"
  | "SYSTEM";

export async function recordAudit(
  user: SessionUser | { id?: string | null; name: string; role?: string },
  action: AuditAction,
  entityType: AuditEntityType,
  entityId?: string | null,
  details?: Record<string, unknown>,
) {
  markAudited();
  try {
    const { ipAddress, userAgent } = await requestOrigin();
    return await prisma.auditLog.create({
      data: {
        userId: user.id ?? null,
        userName: user.name || "System",
        userRole: user.role || "TEACHER",
        action,
        entityType,
        entityId: entityId ?? null,
        detailsJson: JSON.stringify(details ?? {}),
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error("Failed to record audit log:", err);
    return null;
  }
}

/** Where the request came from (address and browser), when there is a request; empty in scripts and tests. */
async function requestOrigin(): Promise<{ ipAddress: string; userAgent: string }> {
  try {
    const h = await headers();
    return { ipAddress: clientIp(h), userAgent: (h.get("user-agent") ?? "").slice(0, 300) };
  } catch {
    return { ipAddress: "", userAgent: "" };
  }
}
