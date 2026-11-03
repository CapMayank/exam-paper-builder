/**
 * School-shaped access control, shared by API routes and the UI.
 *
 * Roles:
 *  - ADMIN      runs the school portal: users, class assignments, classes, rollover, AI settings, everything else.
 *  - TEACHER    works inside the classes the Admin assigned them:
 *                 Class In-charge  (assignment with subject "")      → every subject of that class + class settings
 *                 Subject Teacher  (assignment with a subject name)  → that subject of that class
 *  - EXAM_CELL  exam logistics: timetable, print runs, audit log; reads papers and blueprints.
 *
 * Everyone can browse and print the whole bank. Writes are limited to the assigned scope, except that a
 * creator always keeps edit rights on their own draft papers and their own questions. FINAL papers are
 * locked to everyone but the Admin.
 *
 * Assignments match on class and subject *names* (as stored on Book.className / Book.subject), so they
 * survive academic rollover, which recreates classes and books for the new session.
 */

export type Assignment = { className: string; subject: string };
export type Scope = { className: string; subject: string };
export type Actor = { id: string; role: string; assignments?: Assignment[] | null };

/** Legacy roles from before the class-assignment model. HOD became an unassigned Teacher. */
export function normalizeRole(role: string | null | undefined): "ADMIN" | "TEACHER" | "EXAM_CELL" {
  if (role === "ADMIN" || role === "EXAM_CELL") return role;
  return "TEACHER";
}

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isAdmin(actor: Actor | null | undefined): boolean {
  return Boolean(actor) && normalizeRole(actor!.role) === "ADMIN";
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

export function canManageUsers(actor: Actor | null | undefined): boolean {
  return isAdmin(actor);
}

export function canManageTimetable(actor: Actor | null | undefined): boolean {
  if (!actor) return false;
  const r = normalizeRole(actor.role);
  return r === "ADMIN" || r === "EXAM_CELL";
}

export const canViewAudit = canManageTimetable;

export function canManageAiSettings(actor: Actor | null | undefined): boolean {
  return isAdmin(actor);
}

/** Short human label for one assignment, e.g. "Class 10 · In-charge" or "Class 10 · Mathematics". */
export function assignmentLabel(a: Assignment): string {
  return a.subject.trim() ? `${a.className} · ${a.subject}` : `${a.className} · Class In-charge`;
}
