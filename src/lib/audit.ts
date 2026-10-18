import "server-only";
import { prisma } from "./prisma";
import type { SessionUser } from "./api";

export type AuditAction =
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
  | "BOOK_IMPORT";

export type AuditEntityType = "PAPER" | "QUESTION" | "BLUEPRINT" | "USER" | "TIMETABLE" | "LOGISTICS" | "BOOK";

export async function recordAudit(
  user: SessionUser | { id?: string | null; name: string; role?: string },
  action: AuditAction,
  entityType: AuditEntityType,
  entityId?: string | null,
  details?: Record<string, unknown>,
) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: user.id ?? null,
        userName: user.name || "System",
        userRole: user.role || "TEACHER",
        action,
        entityType,
        entityId: entityId ?? null,
        detailsJson: JSON.stringify(details ?? {}),
      },
    });
  } catch (err) {
    console.error("Failed to record audit log:", err);
    return null;
  }
}
