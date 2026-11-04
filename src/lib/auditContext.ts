import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request flag: did the handler write its own audit entry? `route()` writes a general one for any change
 * (POST / PUT / PATCH / DELETE) that did not, so every change shows up in the activity log with who made it.
 */
export const auditContext = new AsyncLocalStorage<{ audited: boolean }>();

export function markAudited() {
  const store = auditContext.getStore();
  if (store) store.audited = true;
}

const ENTITY_BY_SEGMENT: Record<string, string> = {
  books: "BOOK",
  chapters: "CHAPTER",
  classes: "CLASS",
  blueprints: "BLUEPRINT",
  papers: "PAPER",
  questions: "QUESTION",
  users: "USER",
  ai: "AI",
  uploads: "UPLOAD",
  curriculum: "CURRICULUM",
  "exam-cell": "TIMETABLE",
  "academic-rollover": "ACADEMIC_SESSION",
  me: "USER",
};

/** "/api/papers/abc123/questions/x" → entity PAPER, id "abc123". */
export function entityFromPath(pathname: string): { entityType: string; entityId: string | null } {
  const parts = pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
  const entityType = ENTITY_BY_SEGMENT[parts[0]] ?? "SYSTEM";
  const id = parts[1] && /^[a-z0-9]{20,}$/i.test(parts[1]) ? parts[1] : null;
  return { entityType, entityId: id };
}
