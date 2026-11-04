/**
 * School-shaped access control, shared by API routes and the UI.
 *
 * Roles:
 *  - SUPER_ADMIN  owns access and security: accounts, roles, class assignments, AI settings and the full activity
 *                 log (sign-ins included). Can also do everything an Admin can.
 *  - ADMIN      runs the school's exam work: every paper, question, book, blueprint, class and rollover, and
 *               unlocking final papers. Cannot change who has access.
 *  - TEACHER    works inside the classes the Admin assigned them:
 *                 Class In-charge  (assignment with subject "")      → every subject of that class + class settings
 *                 Subject Teacher  (assignment with a subject name)  → that subject of that class
 *  - EXAM_CELL  exam logistics: timetable, print runs, audit log; reads papers and blueprints.
 *
 * Everyone can browse and print the whole bank. Writes are limited to the assigned scope, except that a
 * creator always keeps edit rights on their own draft papers and their own questions. FINAL papers are
 * locked to everyone but the Admins.
 *
 * Assignments match on class and subject *names* (as stored on Book.className / Book.subject), so they
 * survive academic rollover, which recreates classes and books for the new session.
 */

export type Assignment = { className: string; subject: string };
export type Scope = { className: string; subject: string };
export type Actor = { id: string; role: string; assignments?: Assignment[] | null };

/** Legacy roles from before the class-assignment model. HOD became an unassigned Teacher. */
export function normalizeRole(role: string | null | undefined): "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "EXAM_CELL" {
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "EXAM_CELL") return role;
  return "TEACHER";
}

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Admin or Super Admin: full rights over papers, questions, books, blueprints and classes. */
export function isAdmin(actor: Actor | null | undefined): boolean {
  if (!actor) return false;
  const r = normalizeRole(actor.role);
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

/** Super Admin: also manages accounts, roles, class assignments and security settings. */
export function isSuperAdmin(actor: Actor | null | undefined): boolean {
  return Boolean(actor) && normalizeRole(actor!.role) === "SUPER_ADMIN";
}

function teacherAssignments(actor: Actor | null | undefined): Assignment[] {
  if (!actor || normalizeRole(actor.role) !== "TEACHER") return [];
  return actor.assignments ?? [];
}

/** Class In-charge of this class (teacher assigned to the whole class). */
export function isClassInCharge(actor: Actor | null | undefined, className: string): boolean {
  return teacherAssignments(actor).some((a) => !a.subject.trim() && norm(a.className) === norm(className));
}

/** Books, chapters, blueprints, new questions and new papers of one subject in one class. */
export function canManageScope(actor: Actor | null | undefined, scope: Scope | null | undefined): boolean {
  if (!actor) return false;
  if (isAdmin(actor)) return true;
  if (!scope) return false;
  return teacherAssignments(actor).some(
    (a) =>
      norm(a.className) === norm(scope.className) &&
      (!a.subject.trim() || norm(a.subject) === norm(scope.subject)),
  );
}

/** Sections and subject list of a class. Creating/deleting classes stays with the Admin. */
export function canManageClassSettings(actor: Actor | null | undefined, className: string): boolean {
  return isAdmin(actor) || isClassInCharge(actor, className);
}

/** Can create anything at all (some assignment, or Admin). Used to show/hide "New …" buttons. */
export function hasAnyWriteScope(actor: Actor | null | undefined): boolean {
  return isAdmin(actor) || teacherAssignments(actor).length > 0;
}

type BookRef = { className: string; subject: string } | null | undefined;

export function bookScope(book: BookRef): Scope | null {
  return book ? { className: book.className, subject: book.subject } : null;
}

export type PaperRef = {
  createdById?: string | null;
  status?: string;
  blueprint?: { book?: BookRef } | null;
};

export function canModifyPaper(actor: Actor | null | undefined, paper: PaperRef): boolean {
  if (!actor) return false;
  if (isAdmin(actor)) return true;
  if (paper.status === "FINAL") return false;
  if (paper.createdById && paper.createdById === actor.id) return true;
  return canManageScope(actor, bookScope(paper.blueprint?.book));
}

export type QuestionRef = { createdById?: string | null; book?: BookRef };

export function canModifyQuestion(actor: Actor | null | undefined, question: QuestionRef): boolean {
  if (!actor) return false;
  if (isAdmin(actor)) return true;
  if (question.createdById && question.createdById === actor.id) return true;
  return canManageScope(actor, bookScope(question.book));
}

/** Accounts, roles and class assignments: the Super Admin only. */
export function canManageUsers(actor: Actor | null | undefined): boolean {
  return isSuperAdmin(actor);
}

export function canManageTimetable(actor: Actor | null | undefined): boolean {
  if (!actor) return false;
  return isAdmin(actor) || normalizeRole(actor.role) === "EXAM_CELL";
}

/** Activity of papers, questions, books and blueprints (Admins and the Exam Cell). */
export const canViewAudit = canManageTimetable;

/** The full activity log including sign-ins, failed sign-ins and access changes. */
export function canViewSecurityLog(actor: Actor | null | undefined): boolean {
  return isSuperAdmin(actor);
}

export function canManageAiSettings(actor: Actor | null | undefined): boolean {
  return isSuperAdmin(actor);
}

/** Short human label for one assignment, e.g. "Class 10 · In-charge" or "Class 10 · Mathematics". */
export function assignmentLabel(a: Assignment): string {
  return a.subject.trim() ? `${a.className} · ${a.subject}` : `${a.className} · Class In-charge`;
}
