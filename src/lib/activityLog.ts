/**
 * Shared by the activity log API and page: the categories it can be filtered by, and a plain sentence for each
 * entry ("Signed in", "Deleted a book", "Failed sign-in: wrong password").
 */

export const ACTIVITY_CATEGORIES = [
  { key: "SIGN_IN", label: "Sign-ins", entityTypes: ["AUTH"], securityOnly: true },
  { key: "ACCESS", label: "Accounts & access", entityTypes: ["USER"], securityOnly: true },
  { key: "PAPERS", label: "Papers", entityTypes: ["PAPER"], securityOnly: false },
  { key: "QUESTIONS", label: "Questions", entityTypes: ["QUESTION"], securityOnly: false },
  { key: "SYLLABUS", label: "Books, blueprints & classes", entityTypes: ["BOOK", "CHAPTER", "BLUEPRINT", "CLASS", "CURRICULUM", "ACADEMIC_SESSION"], securityOnly: false },
  { key: "EXAM_CELL", label: "Exam cell", entityTypes: ["TIMETABLE", "LOGISTICS"], securityOnly: false },
  { key: "OTHER", label: "AI & uploads", entityTypes: ["AI", "UPLOAD", "SYSTEM"], securityOnly: false },
] as const;

export type ActivityCategoryKey = (typeof ACTIVITY_CATEGORIES)[number]["key"];

/** Entity types only the Super Admin may read (sign-ins and changes to accounts). */
export const SECURITY_ENTITY_TYPES = ACTIVITY_CATEGORIES.filter((c) => c.securityOnly).flatMap((c) => [...c.entityTypes]);

export function categoryOf(entityType: string): ActivityCategoryKey {
  return ACTIVITY_CATEGORIES.find((c) => (c.entityTypes as readonly string[]).includes(entityType))?.key ?? "OTHER";
}

const ACTION_TEXT: Record<string, string> = {
  LOGIN_SUCCESS: "Signed in",
  LOGIN_FAILED: "Failed sign-in",
  LOGIN_BLOCKED: "Sign-in blocked after too many wrong passwords",
  LOGOUT: "Signed out",
  PAPER_CREATE: "Created a paper",
  PAPER_UPDATE: "Changed a paper",
  PAPER_STATUS_CHANGE: "Changed a paper's status",
  PAPER_DUPLICATE: "Duplicated a paper",
  PAPER_PRINT: "Printed a paper",
  PAPER_EXPORT_DOCX: "Downloaded a paper as Word",
  PAPER_OMR_VIEW: "Opened an OMR sheet",
  PARALLEL_SETS_GENERATE: "Made parallel paper sets",
  PAPERS_EXPORT_ZIP: "Downloaded papers as a ZIP",
  PAPER_SNAPSHOT_CREATE: "Saved a paper version",
  PAPER_SNAPSHOT_RESTORE: "Restored a paper version",
  PAPER_SNAPSHOT_DELETE: "Deleted a paper version",
  QUESTION_CREATE: "Added a question",
  QUESTION_UPDATE: "Edited a question",
  QUESTION_DELETE: "Deleted a question",
  QUESTION_BULK_UPDATE: "Edited several questions",
  USER_CREATE: "Created an account",
  USER_ROLE_CHANGE: "Changed someone's role",
  USER_ASSIGNMENT_CHANGE: "Changed class assignments",
  USER_STATUS_CHANGE: "Activated or deactivated an account",
  USER_DELETE: "Deleted an account",
  USER_PASSWORD_CHANGE: "Changed own password",
  USER_PASSWORD_RESET: "Reset someone's password",
  USER_PROFILE_UPDATE: "Updated a profile",
  CALCULATOR_ESTIMATE: "Ran the print-run calculator",
  TIMETABLE_CREATE: "Added a timetable entry",
  TIMETABLE_UPDATE: "Changed a timetable entry",
  TIMETABLE_DELETE: "Deleted a timetable entry",
  BOOK_IMPORT: "Imported a syllabus",
  ACADEMIC_ROLLOVER: "Rolled over to a new session",
  MIGRATION_SUPER_ADMIN: "Administrators became Super Administrators (one-time upgrade)",
};

const THING: Record<string, string> = {
  BOOK: "book",
  CHAPTER: "chapter",
  CLASS: "class",
  BLUEPRINT: "blueprint",
  PAPER: "paper",
  QUESTION: "question",
  USER: "account",
  AI: "AI tool",
  UPLOAD: "file",
  CURRICULUM: "curriculum pattern",
  TIMETABLE: "timetable entry",
  ACADEMIC_SESSION: "session",
  SYSTEM: "setting",
};

const REASON: Record<string, string> = {
  WRONG_PASSWORD: "wrong password",
  UNKNOWN_EMAIL: "no account with this email",
  DEACTIVATED: "account is deactivated",
};

export type ActivityEntry = {
  action: string;
  entityType: string;
  detailsJson: string;
};

function parseDetails(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json || "{}");
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** A plain sentence for the entry and a short detail line (title, email, path…). */
export function describeActivity(e: ActivityEntry): { title: string; detail: string } {
  const d = parseDetails(e.detailsJson);
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");

  if (e.action === "API_CHANGE") {
    const method = str("method");
    const path = str("path");
    const thing = THING[e.entityType] ?? "item";
    const sub = path.split("/").filter(Boolean).slice(3).filter((p) => !/^[a-z0-9]{20,}$/i.test(p)).join(" ");
    const verb = method === "DELETE" ? "Removed" : method === "POST" ? (e.entityType === "AI" ? "Used" : "Added") : "Changed";
    const what = sub ? `${sub.replace(/-/g, " ")} of a ${thing}` : `a ${thing}`;
    return { title: `${verb} ${e.entityType === "AI" ? `the AI (${path.split("/").pop()?.replace(/-/g, " ")})` : what}`, detail: `${method} ${path}` };
  }

  let title = ACTION_TEXT[e.action] ?? e.action.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  if (e.action === "LOGIN_FAILED" && REASON[str("reason")]) title += `: ${REASON[str("reason")]}`;
  if (e.action === "USER_ROLE_CHANGE" && str("newRole")) title += ` to ${str("newRole").replace(/_/g, " ").toLowerCase()}`;

  const detail =
    str("title") ||
    str("paperTitle") ||
    str("bookTitle") ||
    str("textPreview") ||
    str("deletedEmail") ||
    str("email") ||
    str("name") ||
    str("sectionTitle") ||
    "";
  return { title, detail };
}

/** "Chrome on Windows", "Safari on iPhone", … from a user-agent string. */
export function deviceLabel(ua: string): string {
  if (!ua) return "";
  const browser = /curl|python|node-fetch|axios|HeadlessChrome|Playwright/i.test(ua)
    ? "Script or bot"
    : /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  return os ? `${browser} on ${os}` : browser;
}
