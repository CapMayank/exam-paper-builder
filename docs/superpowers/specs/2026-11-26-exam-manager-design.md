# Exam Manager — Design

Date: 2026-11-26 · Status: approved 2026-11-26

## Why

The school runs three or four exams a year (e.g. Half Yearly Examination December 2026). Today the date
sheet is made outside the app (Word/PDF) and nobody can see, per exam day, which question papers are still
being written, which are final, and which have actually been printed. The admin wants one systematic place
to: build the exam's date sheet in the app, print/circulate it as a PDF that looks like the school's current
one, and track every scheduled paper from *not made → final → printed*, shown on a calendar.

Reference: `E:\OneDrive - …\DateSheets\Session 2026-27\HALFYEARLY EXAMINATION DECEMBER 2026.pdf` — one A4
page: school header (logo, name, Dise/School code, session, affiliation), title "DATE SHEET / HALF YEARLY
EXAMINATION DECEMBER 2026", then three tables ("High / Higher Secondary School", "Middle School",
"Pre-Primary / Primary School"), each with its own time line ("TIME: 11:00 am to 02:00 pm"), its own date
columns (date + weekday), class rows (12th…NUR), subject cells, "-" for no exam; Principal signature and
seal bottom-right; address/contact footer.

## Goals

- Create an **Exam** (name, exam type, academic session) and build its **date sheet** in a grid that mirrors
  the PDF: blocks → date columns × class rows → subject cell.
- Every filled cell is a **slot** (class · subject · date) linked to that class-subject's paper in the app.
- **Made** is derived: slot's linked paper has `status = FINAL`. Draft or no paper = not made.
- **Printed** is recorded: after printing a linked paper the app asks "Did you print this paper for <exam>?";
  Yes marks the slot printed (who, when). A manual Printed / Not printed toggle on each slot covers reprints,
  print-shop jobs and undoing a wrong Yes.
- **Calendar** view of the exam: one cell per exam day with a three-part progress bar (printed / final-not-
  printed / not ready), urgency highlight for near days that are not ready, click a day → side panel listing
  that day's slots grouped by block with Open paper · Print · printed toggle. Block and class filters and a
  summary line ("31 of 52 ready · 18 printed · first exam in 14 days").
- **Print date sheet** page reproducing the reference layout; saved as PDF via the browser print dialog
  (same approach as paper printing). Print screen has a **Signed / Blank line** switch: Signed prints the
  uploaded Principal signature+seal image, Blank leaves a line to sign by hand. Defaults to Signed when an
  image exists.
- Signature+seal image is uploaded **once** by an admin and reused for every date sheet.
- Exams can be **Draft** or **Circulated**, and can be **copied** to start the next exam.
- An exam includes **only the classes added to it**. A Pre-Board can be one block with 10th and 12th only;
  a class test can be one class with a few dates. Nothing requires every class.
- **Exam dates flow into papers:** linking a slot to a paper, or creating a paper from a slot, sets the
  paper's `examDate`, `examType` and `academicSession` from the exam. Moving a date column updates every
  linked paper. If a linked paper is already Final or Printed it still gets the new date, and the slot is
  flagged "date changed after printing — reprint needed" until it is marked printed again.
- **Full exam setup flow** on each exam's page, as a four-step checklist with progress per step:
  ① Date sheet → ② Blueprints → ③ Papers → ④ Printing.
  - ② Blueprints: shows how many scheduled class-subjects have a blueprint for this exam type and session.
    "Set up the missing ones" opens the existing bulk Blueprint setup (`/blueprints/setup`,
    `src/lib/blueprintSetup.ts`) pre-filled with exactly those class-subjects (books), exam type and session.
  - ③ Papers: "Create missing drafts" creates a draft paper from each slot's blueprint, pre-filled (date,
    type, session, school header defaults), and links it to the slot. Also available per slot. Papers are
    then built one by one in the existing paper builder.
  - Slot pipeline: **No blueprint → No paper → Draft → Final → Printed**.

## Non-goals

- Teachers do not see the calendar or date sheets (Admin + Exam Cell only). No teacher reminders.
- No assigning papers to teachers. Today the admin builds every paper, so created drafts belong to the
  admin who created them. **Future (3–4 years):** papers will be distributed to subject teachers. Keep that
  easy: create drafts through one function that takes the owner as a parameter (today: the current user),
  so a later "create for the assigned teacher via ClassAssignment" is a small change. Build nothing more now.
- No seating plans, invigilation duty, room allocation, answer-booklet counts, print-run/ream calculator.
- No PDF generated server-side; browser print-to-PDF is enough.
- No calendar library.

## Anti-goals (failure even if it works)

- Re-creating the messiness of the current Exam Cell page: long single-file page, many half-used fields.
- "Printed" being set just because someone opened a print page.
- The printed date sheet not looking like the school's own (header, block tables, signature) — it is a
  circulated document.

## Constraints

- Next.js 16.4.1 App Router (read `node_modules/next/dist/docs/` before writing code — APIs differ from
  older Next), React 19, Tailwind 4, Prisma 6 on SQLite, zod. No new runtime dependencies needed.
- API routes use `route(handler, { roles })` from `src/lib/api.ts`; audit with `recordAudit`.
- Access: `canManageTimetable` in `src/lib/permissions.ts` (ADMIN, SUPER_ADMIN, EXAM_CELL). Rename it to
  `canManageExams` (keep `canViewAudit`).
- Uploads go through `/api/uploads` (images ≤3 MB into `data/uploads`), served by `/api/uploads/[name]`.
- School header constants already exist in `src/lib/constants.ts` (`DEFAULT_SCHOOL_NAME`,
  `DEFAULT_SCHOOL_LOGO = /school-logo.png`, …). Add the missing ones the reference shows: address, phones,
  website, email, Dise code 23440600816, School code 772070, "Affiliated to MPBSE", established 2002.
- Academic session strings use an en dash in the DB ("2026–27"); follow existing normalisation.
- Classes and subjects come from `AcademicClass` / `ClassSubject` for the exam's session. The DB currently
  lacks KG I, KG II, Class 1–4 for 2026–27 (has Nursery, LKG, 5–12). Those must be added in Classes &
  subjects before they can appear in a date sheet; the builder only offers classes that exist.

## Approaches considered

1. **Fresh Exam record (chosen).** New `Exam` → `ExamBlock` → `ExamSlot` models; drop `ExamTimetableEntry`
   (0 rows). Matches how the admin thinks about an exam; copying, per-day rollups and exam-level settings
   are natural.
2. Extend the flat `ExamTimetableEntry` table with block name/exam title per row. Less schema work, but
   exam-level settings get duplicated on every row and drift — the same mess the user wants gone.
3. Calendar via FullCalendar — dropped: heavy for a 2–3 week view and harder to match the app's look.

The user picked approach 1.

## Data model (chosen shape; field details are the builder's)

- `Exam`: id, name ("Half Yearly Examination December 2026"), examType (existing `EXAM_TYPES`),
  academicSession, status `DRAFT | CIRCULATED`, signatureMode `SIGNED | BLANK`, createdById, timestamps.
- `ExamBlock`: id, examId, title ("Middle School"), position, timeText ("11:00 am to 02:00 pm" — free text
  is fine; or start/end times rendered to that format), datesJson (ordered `YYYY-MM-DD[]`),
  classesJson (ordered class names).
- `ExamSlot`: id, examId, blockId, className, subject, examDate, paperId (nullable, FK SetNull),
  printedAt (nullable), printedById (nullable). Unique (blockId, className, examDate). A cell set to "–"
  simply has no slot.
- School setting for the signature image file name. No settings table exists today — add a small key/value
  `SchoolSetting` model (builder may choose another store if one already exists).

Cascade: deleting an Exam deletes its blocks and slots; deleting a Paper leaves the slot unlinked.

## Behaviour details decided

- **Paper linking:** when a cell's subject is chosen, the app auto-suggests the paper matching class +
  subject + exam type + session (effective exam type per existing helper in `constants.ts`). If exactly one
  matches it is linked; if several (e.g. Set A/B) the admin picks; the admin can change or clear the link at
  any time. **One paper per slot (user decided):** a class-subject goes out as one paper per exam day.
  Other sets of the same paper are variants that never appear on the date sheet.
- **Status per slot:** `NO_BLUEPRINT` (no blueprint for class-subject + exam type + session) · `NO_PAPER` (unlinked) · `DRAFT` (linked, paper not FINAL) · `FINAL` · `PRINTED`
  (printedAt set). Printed is shown even if the paper is later reopened to Draft, but flagged
  ("printed, paper since changed") so a stale print is visible.
- **Ask after printing:** on the paper print page (`src/app/papers/[id]/print/page.tsx`), after the print
  dialog closes (`afterprint`), if the paper is linked to any slot in a non-past exam that is not yet
  printed, show a small dialog: "Did you print this paper for <Exam name> (<class> · <date>)? [Yes] [Not
  yet]". Only shown to Admin/Exam Cell. Yes → POST marks printedAt/printedById and records audit.
- **Class labels (my call):** slots store the app's class names ("Class 12", "Nursery"), which match
  `Book.className` for blueprint and paper matching. The printed date sheet shows short labels like the
  reference ("12th", "NUR", "KG II"), from a small mapping helper.
- **Build order (my call):** phase 1 = exam, date sheet, print page, calendar, print tracking, removal of the
  old Exam Cell tabs. Phase 2 = setup checklist with blueprint and paper creation, plus date sync.
  Phase 1 is useful on its own for the December 2026 exam.
- **Day rollup:** a day = all slots on that date across blocks. Ready = FINAL or PRINTED.
- **Urgency:** a day ≤ 3 days away with any slot not ready is highlighted.
- **Copy exam:** duplicates blocks and slot layout (class/subject per column position) with dates cleared
  or kept for editing, links and printed state cleared, status Draft.
- **Exam list:** default opens the nearest upcoming exam.
- **One block per class (my call):** within an exam a class belongs to exactly one block (as in the
  reference); the builder refuses adding a class already in another block. No combined multi-class papers:
  each class row has its own slot and paper.
- **Dates and "today" (my call):** all date logic uses the school's local date (Asia/Kolkata), computed with
  a shared helper, never server UTC. An exam is *past* when its last date is before today. The after-print
  prompt appears for any slot that is not yet printed and whose date is today or later.
- **Draft vs Circulated (my call):** Draft prints a faint "DRAFT" watermark on the date sheet and is
  freely editable. Marking Circulated removes the watermark. Editing a circulated exam's grid shows a
  banner ("Already circulated — reprint and recirculate after changes") and records EXAM_UPDATE; it does
  not lock.
- **Copy exam (my call):** keeps blocks, classes, date columns and subjects as they are. The admin then
  edits each column's date, and changing a column's date moves that column's slots with it. Links and printed
  state are cleared. Status is Draft. The name gets a " (copy)" suffix.
- Removal is safe: `ExamTimetableEntry` and `PrintRunCalculation` both have 0 rows (checked 2026-11-26), so
  there's no data migration. The user asked for the Readiness Matrix and Budget Calculator to be removed, with no
  replacement beyond this manager. `canManageTimetable` is internal only; rename it everywhere.
- Audit events: EXAM_CREATE, EXAM_UPDATE, EXAM_DELETE, EXAM_SLOT_PRINTED, EXAM_SLOT_UNPRINTED.

## Pages

- Nav: replace "Exam cell & Logistics" with **Exams** (`/exams`), visible to Admin/Exam Cell only.
- `/exams` — list of exams (name, dates span, ready/printed counts, status), New exam, Copy, Delete.
- `/exams/[id]` — header with name/type/session/status; tabs **Calendar** (default) · **Date sheet**
  (builder grid, blocks with + date / + class / + block, subject dropdown per cell, linked-paper chip).
- `/exams/[id]/print` — print-only page outside the app shell (like `src/app/papers/[id]/print`), A4,
  reproducing the reference: header band, title, one table per block with right-aligned TIME line, faint
  logo watermark optional, Principal signature block (image or blank line), footer band.
- Audit Trail moves to `/exams/audit` or stays reachable from the Exams page as a tab (builder's call;
  `/admin/activity` already exists and may already cover it).
- Signature upload: on the print page settings or the Exams list header (Admin only).

## Removal

Delete from the current Exam Cell page and codebase: Exam Readiness Matrix, Paper Budget Calculator,
Exam Date-Sheet tab, `/api/exam-cell/*`, `ExamTimetableEntry` and `PrintRunCalculation` models,
`timetableEntrySchema`, `ExamTimetableItem`, `TIMETABLE_STATUSES`/`SessionSlot` if unused elsewhere, and
`/exam-cell` page (redirect `/exam-cell` → `/exams`). Keep the audit trail capability.

## Left to the builder

- Exact component split, API shapes, zod schemas, migration steps (`prisma db push` vs migrations — follow
  repo practice), visual styling within the app's existing look, calendar grid details, tests
  (unit tests for status rollup, paper matching, copy-exam; e2e for build → print date sheet → mark printed).
