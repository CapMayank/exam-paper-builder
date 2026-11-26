# Exam Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Exam Cell page with an Exams manager: build an exam's date sheet in the app, print it like the school's PDF, track every scheduled paper (no blueprint → no paper → draft → final → printed) on a calendar, and walk an exam from date sheet to blueprints to papers.

**Architecture:** Three new Prisma models (`Exam` → `ExamBlock` → `ExamSlot`) plus a key/value `SchoolSetting`. Pure logic (dates, status rollup, paper matching, labels, copy) lives in `src/lib/exams/*.ts` and is unit-tested. A thin server layer (`src/lib/exams/server.ts`) does the DB work behind `/api/exams/*` routes. UI is `/exams` (list), `/exams/[id]` (Setup · Calendar · Date sheet tabs), and `/exams/[id]/print` (A4 date sheet outside the app shell).

**Tech Stack:** Next.js 16.4.1 App Router, React 19, Tailwind 4, Prisma 6 on SQLite (`npx prisma db push`, no migrations folder), zod 4, Vitest (`npm test`), Playwright (`npm run test:e2e`), lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-11-26-exam-manager-design.md`

## Global Constraints

- Read `node_modules/next/dist/docs/` for any App Router API before using it (AGENTS.md: this Next differs from training data).
- No new runtime dependencies. No calendar library.
- Access to everything here: Admin, Super Admin, Exam Cell only. Use `roles: ["ADMIN", "EXAM_CELL"]` on routes (Super Admin passes Admin checks in `route()`); UI gates with `canManageExams`.
- All "today" / "days away" logic uses the school's local date, Asia/Kolkata, via `todayIST()`. Never `new Date().toISOString().slice(0,10)`.
- Dates are stored as `YYYY-MM-DD` strings; academic session uses the en dash ("2026–27") like the rest of the DB.
- Exam types come from `EXAM_TYPES` in `src/lib/constants.ts`.
- One paper per slot. A class belongs to only one block within an exam.
- The printed date sheet reproduces the reference: header band (logo, school name, Dise Code 23440600816, Established 2002, School Code 772070, Affiliated to MPBSE, Session), title "DATE SHEET" + exam name in capitals, one table per block with right-aligned "TIME: <timeText>", "-" for no exam, Principal signature block, footer band "Vinoba Bhave Ward No. 05, Lakhnadon, 480886, Seoni, MP, India · 8989646850, 9425888317 · www.sarvodayaschool.co.in · sarvodaya816@gmail.com".
- Audit actions: `EXAM_CREATE`, `EXAM_UPDATE`, `EXAM_DELETE`, `EXAM_SLOT_PRINTED`, `EXAM_SLOT_UNPRINTED`; entity type `EXAM`.
- Created drafts are owned by the current user, through one function taking `ownerId` (future: assigned teacher).

## Review Focus

1. **Date near midnight IST / server in UTC** — at 00:30 IST the app must treat it as the new day (urgency, "today or later" print prompt). Test in Task 2.
2. **Moving a date column onto a date already used in the same block** — must be refused with a clear message, not silently merge or lose slots. Test in Task 4.
3. **A class added to a second block of the same exam** — refused ("Class 10 is already in High / Higher Secondary School"). Test in Task 4.
4. **Linked paper deleted, or reopened to Draft after printing** — slot shows No paper / "printed, paper since changed", never crashes the calendar. Test in Task 3.
5. **Exam with zero slots / block with no dates** — calendar, setup counts and print page render empty states, no division by zero in progress bars. Test in Task 3.

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | Add `Exam`, `ExamBlock`, `ExamSlot`, `SchoolSetting`; `Paper.examSlots`; remove `ExamTimetableEntry`, `PrintRunCalculation` |
| `src/lib/exams/dates.ts` | `todayIST`, `daysUntil`, `weekdayName`, `formatDMY`, `monthGrid` |
| `src/lib/exams/labels.ts` | `shortClassLabel` for the printed sheet |
| `src/lib/exams/status.ts` | slot status, day rollup, exam summary, urgency |
| `src/lib/exams/paperMatch.ts` | choose paper candidates for a slot |
| `src/lib/exams/grid.ts` | pure validation for grid edits (class in one block, date collisions) and copy-exam layout |
| `src/lib/exams/types.ts` | DTOs shared by API and UI |
| `src/lib/exams/server.ts` | server-only DB operations used by routes |
| `src/lib/schemas.ts` | zod schemas for exam API inputs (replace `timetableEntrySchema`) |
| `src/app/api/exams/**` | route handlers |
| `src/app/api/settings/signature/route.ts` | signature image get/set |
| `src/app/(app)/exams/page.tsx` | exam list |
| `src/app/(app)/exams/[id]/page.tsx` | exam shell with tabs |
| `src/components/exams/*.tsx` | `DateSheetBuilder`, `ExamCalendar`, `DayPanel`, `SetupChecklist`, `SlotStatusBadge`, `PrintedPrompt` |
| `src/app/exams/[id]/print/page.tsx` | A4 date sheet |

Existing files to delete: `src/app/(app)/exam-cell/page.tsx`, `src/app/api/exam-cell/**`. Add redirect `/exam-cell` → `/exams` in `next.config.ts`.

---

# Phase 1 — Exams, date sheet, calendar, print tracking

### Task 1: Data model and removal of the old Exam Cell

**Files:**
- Modify: `prisma/schema.prisma`, `src/lib/permissions.ts`, `src/lib/audit.ts`, `src/lib/activityLog.ts`, `src/lib/auditContext.ts`, `src/lib/types.ts`, `src/lib/schemas.ts`, `src/lib/constants.ts`, `src/components/AppShell.tsx`, `next.config.ts`, `src/lib/class-assignment-rbac.test.ts`, `src/lib/passage-internal-choice.test.ts` (only their timetable references)
- Delete: `src/app/(app)/exam-cell/page.tsx`, `src/app/api/exam-cell/`
- Create: `src/app/(app)/exams/page.tsx` (placeholder heading "Exams" only; filled in Task 6), `src/components/exams/AuditTrail.tsx`, `src/app/(app)/exams/audit/page.tsx`

**Interfaces:**
- Produces: Prisma models below; `canManageExams(actor): boolean` (rename of `canManageTimetable`, same rule); `canViewAudit` unchanged in behaviour; school constants `SCHOOL_ADDRESS`, `SCHOOL_PHONES`, `SCHOOL_WEBSITE`, `SCHOOL_EMAIL`, `SCHOOL_DISE_CODE = "23440600816"`, `SCHOOL_CODE = "772070"`, `SCHOOL_AFFILIATION = "Affiliated to MPBSE"`, `SCHOOL_ESTABLISHED_YEAR = 2002`.

```prisma
model Exam {
  id              String      @id @default(cuid())
  name            String
  examType        String      // EXAM_TYPES
  academicSession String
  status          String      @default("DRAFT")   // DRAFT | CIRCULATED
  signatureMode   String      @default("SIGNED")  // SIGNED | BLANK
  createdById     String
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  blocks          ExamBlock[]
  slots           ExamSlot[]
  @@index([academicSession])
}

model ExamBlock {
  id          String     @id @default(cuid())
  examId      String
  title       String
  position    Int
  timeText    String     @default("11:00 am to 02:00 pm")
  datesJson   String     @default("[]") // ordered YYYY-MM-DD[]
  classesJson String     @default("[]") // ordered AcademicClass names
  exam        Exam       @relation(fields: [examId], references: [id], onDelete: Cascade)
  slots       ExamSlot[]
}

model ExamSlot {
  id               String    @id @default(cuid())
  examId           String
  blockId          String
  className        String
  subject          String
  examDate         String
  paperId          String?
  printedAt        DateTime?
  printedById      String?
  printedPaperAt   DateTime? // paper.updatedAt when marked printed; later change ⇒ "paper since changed"
  dateChangedAfterPrint Boolean @default(false)
  exam             Exam      @relation(fields: [examId], references: [id], onDelete: Cascade)
  block            ExamBlock @relation(fields: [blockId], references: [id], onDelete: Cascade)
  paper            Paper?    @relation(fields: [paperId], references: [id], onDelete: SetNull)
  @@unique([blockId, className, examDate])
  @@index([examDate])
  @@index([paperId])
}

model SchoolSetting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```
Add `examSlots ExamSlot[]` to `Paper`. Delete `ExamTimetableEntry` and `PrintRunCalculation` (both 0 rows on 2026-11-26 — re-check with a count before `db push`; stop and report if non-zero).

- [ ] **Step 1:** Back up the DB: `npm run backup`. Expected: backup file reported.
- [ ] **Step 2:** Edit the schema as above, run `npx prisma db push` then `npx prisma generate`. Expected: "Your database is now in sync".
- [ ] **Step 3a:** Keep the Audit Trail (user asked to keep it): move the Audit Trail tab's JSX, state and `/api/audit` fetching out of `src/app/(app)/exam-cell/page.tsx` into `AuditTrail.tsx` unchanged in behaviour, rendered by `/exams/audit` (gated by `canViewAudit`). The Exams list (Task 6) links to it as "Audit trail".
- [ ] **Step 3:** Delete the exam-cell page and API folder; remove `timetableEntrySchema`, `ExamTimetableItem`, `TIMETABLE_STATUSES`, `TimetableStatus`, `SessionSlot` and every remaining reference (`grep -rn "timetable\|Timetable\|PrintRun\|exam-cell" src` must return only audit-history labels you keep for old log rows). Rename `canManageTimetable` → `canManageExams` everywhere.
- [ ] **Step 4:** Add the audit actions and `EXAM` entity type to `src/lib/audit.ts` and human labels to `src/lib/activityLog.ts` ("Created an exam", "Changed an exam", "Deleted an exam", "Marked a paper printed", "Unmarked a printed paper").
- [ ] **Step 5:** Nav: replace the Exam cell entry with `{ href: "/exams", label: "Exams", icon: CalendarDays, hint: "Date sheets, paper readiness and printing" }`, visible only when `canManageExams`. Add redirect `/exam-cell` → `/exams` (permanent: false) in `next.config.ts`.
- [ ] **Step 6:** Run `npx tsc --noEmit` and `npm test`. Expected: both clean.
- [ ] **Step 7:** Commit `feat(exams): exam data model, remove old exam cell`.

### Task 2: Date helpers and class labels

**Files:**
- Create: `src/lib/exams/dates.ts`, `src/lib/exams/labels.ts`
- Test: `src/lib/exams/dates.test.ts`, `src/lib/exams/labels.test.ts`

**Interfaces:**
- Produces:
  - `todayIST(now?: Date): string` — `YYYY-MM-DD` in Asia/Kolkata (use `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" })`).
  - `daysUntil(date: string, today: string): number` — whole days, negative if past.
  - `weekdayName(date: string): string` — "Thursday".
  - `formatDMY(date: string): string` — "10/12/2026".
  - `monthGrid(dates: string[]): { month: string; weeks: (string | null)[][] }[]` — Monday-first weeks covering every month that contains an exam date.
  - `shortClassLabel(className: string): string`.

- [ ] **Step 1: Write the failing tests**

```ts
expect(todayIST(new Date("2026-12-09T19:00:00Z"))).toBe("2026-12-10"); // 00:30 IST next day
expect(todayIST(new Date("2026-12-10T18:00:00Z"))).toBe("2026-12-10"); // 23:30 IST
expect(daysUntil("2026-12-10", "2026-11-26")).toBe(14);
expect(daysUntil("2026-12-09", "2026-12-10")).toBe(-1);
expect(weekdayName("2026-12-10")).toBe("Thursday");
expect(weekdayName("2026-12-12")).toBe("Saturday");
expect(formatDMY("2026-12-21")).toBe("21/12/2026");
const g = monthGrid(["2026-12-10", "2026-12-23"]);
expect(g).toHaveLength(1); expect(g[0].month).toBe("December 2026");
expect(g[0].weeks[1]).toContain("2026-12-10"); expect(g[0].weeks.every(w => w.length === 7)).toBe(true);
expect(shortClassLabel("Class 12")).toBe("12th");
expect(shortClassLabel("Class 1")).toBe("1st");
expect(shortClassLabel("Class 2")).toBe("2nd");
expect(shortClassLabel("Class 3")).toBe("3rd");
expect(shortClassLabel("Nursery")).toBe("NUR");
expect(shortClassLabel("LKG")).toBe("KG I");
expect(shortClassLabel("UKG")).toBe("KG II");
expect(shortClassLabel("KG II")).toBe("KG II");
expect(shortClassLabel("Something Else")).toBe("Something Else");
```

- [ ] **Step 2:** `npx vitest run src/lib/exams` — Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement. Parse `YYYY-MM-DD` as UTC midnight for weekday/diff math so the host timezone never matters.
- [ ] **Step 4:** `npx vitest run src/lib/exams` — Expected: PASS.
- [ ] **Step 5:** Commit `feat(exams): IST date helpers and class labels`.

### Task 3: Slot status and rollups

**Files:**
- Create: `src/lib/exams/types.ts`, `src/lib/exams/status.ts`
- Test: `src/lib/exams/status.test.ts`

**Interfaces:**
- Produces (types.ts):
  ```ts
  type SlotStatus = "NO_BLUEPRINT" | "NO_PAPER" | "DRAFT" | "FINAL" | "PRINTED";
  type SlotView = { id: string; blockId: string; className: string; subject: string; examDate: string;
    paper: { id: string; title: string; status: "DRAFT" | "FINAL"; updatedAt: string } | null;
    hasBlueprint: boolean; printedAt: string | null; printedByName: string | null;
    printedPaperAt: string | null; dateChangedAfterPrint: boolean;
    status: SlotStatus; warnings: ("PAPER_CHANGED_AFTER_PRINT" | "DATE_CHANGED_AFTER_PRINT")[] };
  type BlockView = { id: string; title: string; position: number; timeText: string; dates: string[]; classes: string[] };
  type ExamView = { id: string; name: string; examType: string; academicSession: string;
    status: "DRAFT" | "CIRCULATED"; signatureMode: "SIGNED" | "BLANK"; blocks: BlockView[]; slots: SlotView[] };
  type DayRollup = { date: string; total: number; printed: number; finalNotPrinted: number; notReady: number; urgent: boolean };
  type ExamSummary = { total: number; ready: number; printed: number; firstDate: string | null; lastDate: string | null; daysToFirst: number | null; isPast: boolean };
  ```
- Produces (status.ts):
  - `slotStatus(s: { paper: SlotView["paper"]; hasBlueprint: boolean; printedAt: string | null }): SlotStatus` — printed wins over paper state; no paper ⇒ `NO_BLUEPRINT` if `!hasBlueprint` else `NO_PAPER`.
  - `slotWarnings(s: Pick<SlotView, "paper" | "printedAt" | "printedPaperAt" | "dateChangedAfterPrint">): SlotView["warnings"]`.
  - `dayRollups(slots: SlotView[], today: string): DayRollup[]` — sorted by date; `urgent` = `0 <= daysUntil <= 3 && notReady > 0`.
  - `examSummary(slots: SlotView[], today: string): ExamSummary` — ready = FINAL or PRINTED; `isPast` = lastDate < today.

- [ ] **Step 1: Write the failing tests** covering:
  - `slotStatus({paper:null,hasBlueprint:false,printedAt:null})` → `"NO_BLUEPRINT"`; with blueprint → `"NO_PAPER"`; draft paper → `"DRAFT"`; final → `"FINAL"`; final + printedAt → `"PRINTED"`; **draft + printedAt → `"PRINTED"`** with warning `PAPER_CHANGED_AFTER_PRINT` when `paper.updatedAt > printedPaperAt`.
  - printed slot whose paper was deleted (`paper: null`, printedAt set) → `"PRINTED"`, no throw.
  - `dayRollups` for 3 slots on 2026-12-10 (one printed, one final, one draft) with today 2026-12-08 → `{ total: 3, printed: 1, finalNotPrinted: 1, notReady: 1, urgent: true }`; same with today 2026-12-01 → `urgent: false`; past day → `urgent: false`.
  - `dayRollups([])` → `[]`; `examSummary([], "2026-12-01")` → `{ total: 0, ready: 0, printed: 0, firstDate: null, lastDate: null, daysToFirst: null, isPast: false }`.
- [ ] **Step 2:** Run `npx vitest run src/lib/exams/status.test.ts` — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat(exams): slot status and day rollups`.

### Task 4: Grid rules, paper matching and copy layout

**Files:**
- Create: `src/lib/exams/grid.ts`, `src/lib/exams/paperMatch.ts`
- Test: `src/lib/exams/grid.test.ts`, `src/lib/exams/paperMatch.test.ts`

**Interfaces:**
- Produces:
  - `checkAddClass(blocks: BlockView[], blockId: string, className: string): string | null` — error text or null. Error: `"<className> is already in <block title>"`.
  - `checkMoveDate(block: BlockView, from: string, to: string): string | null` — null if ok; `"<formatDMY(to)> is already a date in <title>"` if `to` already in the block; `"<from> is not a date in <title>"` if missing.
  - `checkAddDate(block: BlockView, date: string): string | null`.
  - `copyLayout(exam: ExamView): { blocks: Omit<BlockView, "id">[]; slots: { blockIndex: number; className: string; subject: string; examDate: string }[] }` — keeps dates, classes, subjects; drops paper/printed state.
  - `pickPaper(candidates: { id: string; status: string; updatedAt: string; paperSet: string }[]): { paperId: string | null; ambiguous: boolean }` — exactly one ⇒ that id; zero ⇒ null; several ⇒ `{ paperId: null, ambiguous: true }` (admin chooses).
  - `paperCandidateWhere(slot: { className: string; subject: string }, exam: { examType: string; academicSession: string })` — a Prisma `where` for `Paper`: blueprint.book.className = className, blueprint.book.subject = subject, academicSession = exam session; filter by `resolvePaperExamType(paper) === exam.examType` after fetch (export `filterByExamType(papers, examType)` for that and test it).

- [ ] **Step 1: Write the failing tests:** class already in another block refused with exact message; same class in same block allowed (no-op is caller's concern, return null); move date onto existing date refused; move to free date ok; add duplicate date refused; `copyLayout` of a 2-block exam with 3 slots (one linked + printed) returns 2 blocks, 3 slots, no paper fields; `pickPaper` zero/one/two; `filterByExamType` keeps a paper whose blueprint says `HALF_YEARLY` and drops an `ANNUAL` one.
- [ ] **Step 2:** Run `npx vitest run src/lib/exams` — Expected: new tests FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat(exams): grid rules, paper matching, copy layout`.

### Task 5: Server layer and API routes

**Files:**
- Create: `src/lib/exams/server.ts`, `src/app/api/exams/route.ts`, `src/app/api/exams/[id]/route.ts`, `src/app/api/exams/[id]/copy/route.ts`, `src/app/api/exams/[id]/blocks/route.ts`, `src/app/api/exams/[id]/blocks/[blockId]/route.ts`, `src/app/api/exams/[id]/cells/route.ts`, `src/app/api/exams/[id]/slots/[slotId]/route.ts`, `src/app/api/exams/printed-prompt/route.ts`, `src/app/api/settings/signature/route.ts`
- Modify: `src/lib/schemas.ts`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces (`server.ts`, all `import "server-only"`):
  - `loadExamView(id: string): Promise<ExamView>` — computes `hasBlueprint` per slot (Blueprint exists with book.className/subject, examType, academicSession), `status`, `warnings`.
  - `listExams(): Promise<(Pick<ExamView,"id"|"name"|"examType"|"academicSession"|"status"> & { summary: ExamSummary })[]>` — sorted: upcoming/ongoing by first date asc, then past by last date desc.
  - `setCell(examId, blockId, className, date, subject: string | null, user)` — null deletes the slot; on create/subject change, auto-link via `pickPaper` and return `{ slot: SlotView; ambiguousCandidates?: {id,title,paperSet}[] }`.
  - `moveDate(examId, blockId, from, to, user)` — updates block dates + slots' `examDate` in one transaction; sets `dateChangedAfterPrint = true` on slots with `printedAt`.
  - `setSlotPaper(slotId, paperId | null, user)`; `setSlotPrinted(slotId, printed: boolean, user)` — Yes sets `printedAt`, `printedById`, `printedPaperAt = paper.updatedAt`, clears `dateChangedAfterPrint`; audit `EXAM_SLOT_PRINTED/UNPRINTED`.
  - `copyExam(id, user): Promise<{ id: string }>` — name + " (copy)", status DRAFT.
  - `pendingPrintSlotsForPaper(paperId, today): Promise<{ slotId: string; examName: string; className: string; examDate: string }[]>` — unprinted slots linked to the paper with `examDate >= today`.
- Routes (all `roles: ["ADMIN", "EXAM_CELL"]`):
  - `GET/POST /api/exams` (POST body `{ name, examType, academicSession }`)
  - `GET/PATCH/DELETE /api/exams/[id]` (PATCH: `name?, examType?, academicSession?, status?, signatureMode?`)
  - `POST /api/exams/[id]/copy`
  - `POST /api/exams/[id]/blocks` `{ title, timeText }`; `PATCH /api/exams/[id]/blocks/[blockId]` one of `{ title }`, `{ timeText }`, `{ position }`, `{ addDate }`, `{ removeDate }`, `{ moveDate: { from, to } }`, `{ addClass }`, `{ removeClass }`; `DELETE` block. Removing a date/class deletes its slots. Grid-rule errors → `HttpError(400, message)`.
  - `PUT /api/exams/[id]/cells` `{ blockId, className, date, subject | null }`
  - `PATCH /api/exams/[id]/slots/[slotId]` `{ paperId }` or `{ printed }`
  - `GET /api/exams/printed-prompt?paperId=` → `pendingPrintSlotsForPaper(paperId, todayIST())`
  - `GET/PUT /api/settings/signature` — PUT `{ fileName: string | null }` (file uploaded first via existing `/api/uploads`), stored as `SchoolSetting` key `principalSignature`; GET returns `{ fileName }`. PUT admin only (`roles: ["ADMIN"]`).
- Every mutation calls `recordAudit(user, "EXAM_UPDATE", "EXAM", examId, {...})` (create/delete use their own actions).

- [ ] **Step 1:** Add zod schemas to `src/lib/schemas.ts` (`examCreateSchema`, `examUpdateSchema`, `blockCreateSchema`, `blockPatchSchema` as a union of single-key objects, `cellSchema`, `slotPatchSchema`, `signatureSchema`). Dates validated with `/^\d{4}-\d{2}-\d{2}$/`.
- [ ] **Step 2:** Implement `server.ts` and the routes.
- [ ] **Step 3:** `npx tsc --noEmit && npm test` — Expected: clean.
- [ ] **Step 4:** Smoke test with the dev server (`preview_start`), signed in as admin: create exam → add block → add 2 dates + 2 classes → set 3 cells → move a date → GET exam shows slots on the new date; move onto an existing date returns 400 with the Task 4 message; a TEACHER session gets 403 on `GET /api/exams`.
- [ ] **Step 5:** Commit `feat(exams): exam API`.

### Task 6: Exams list and date-sheet builder

**Files:**
- Modify: `src/app/(app)/exams/page.tsx`
- Create: `src/app/(app)/exams/[id]/page.tsx`, `src/components/exams/DateSheetBuilder.tsx`, `src/components/exams/SlotStatusBadge.tsx`

**Interfaces:**
- Consumes: Task 5 routes, `ExamView`, `shortClassLabel`, `weekdayName`, `formatDMY`, existing `/api/classes` (classes + subjects for the exam's session) and `src/components/ui.tsx` primitives.
- Produces: `SlotStatusBadge({ status, warnings })` used by Tasks 7 and 9; `/exams/[id]?tab=calendar|sheet|setup` (default `calendar`; `setup` added in Task 10).

- [ ] **Step 1:** List page: cards with name, type, session, date span, "31 of 52 ready · 18 printed", Draft/Circulated pill; buttons New exam (modal: name, type, session defaulting to current session), Copy, Delete (confirm). Non-managers see "You don't have access".
- [ ] **Step 2:** Exam page header: editable name, type, session, status toggle (Draft ⇄ Circulated), Print date sheet button → `/exams/[id]/print`. Banner "Already circulated — reprint and recirculate after changes" on the Date sheet tab when status is CIRCULATED.
- [ ] **Step 3:** `DateSheetBuilder`: per block a table — header row of date columns (date input + weekday, menu: change date / remove), class rows (only classes added; "+ class" dropdown lists session classes not in any block), cells = subject `<select>` of that class's subjects plus "–". Each filled cell shows a `SlotStatusBadge` and linked paper title; when `ambiguousCandidates` returns, show a small picker. "+ date", "+ class", "+ block", block title and time inline-editable. Errors from the API show as toasts.
- [ ] **Step 4:** Verify in the browser: rebuild the Middle School block of the reference (10, 12, 14, 16, 18, 21 Dec; 8th/7th/6th; subjects as in the PDF) and screenshot. No console errors.
- [ ] **Step 5:** Commit `feat(exams): exam list and date-sheet builder`.

### Task 7: Calendar and day panel

**Files:**
- Create: `src/components/exams/ExamCalendar.tsx`, `src/components/exams/DayPanel.tsx`
- Modify: `src/app/(app)/exams/[id]/page.tsx`

**Interfaces:**
- Consumes: `monthGrid`, `dayRollups`, `examSummary`, `todayIST`, `SlotStatusBadge`, `PATCH /api/exams/[id]/slots/[slotId]`.

- [ ] **Step 1:** Summary line: "`ready` of `total` papers ready · `printed` printed · first exam in `daysToFirst` days" ("Exam finished" when `isPast`, "No papers scheduled yet" when total 0).
- [ ] **Step 2:** Month grid (Mon–Sun). Exam days show a stacked bar: printed = emerald, final-not-printed = amber, not ready = slate/rose; "7/8 ready" label. Urgent days get a rose ring. Today outlined. Non-exam days muted. Bars must handle `total = 0` (no bar).
- [ ] **Step 3:** Filters: block and class (multi-select chips) — filter the slots before rollup.
- [ ] **Step 4:** Clicking a day opens `DayPanel` (right drawer on desktop, bottom sheet under 640px): slots grouped by block → class, subject, badge, warnings text, buttons Open paper (`/papers/[id]`), Print (`/papers/[id]/print`), Printed toggle (optimistic, reverts on error).
- [ ] **Step 5:** Verify in the browser at desktop and 375px widths with the Task 6 data; screenshot both.
- [ ] **Step 6:** Commit `feat(exams): exam calendar`.

### Task 8: Printable date sheet and signature

**Files:**
- Create: `src/app/exams/[id]/print/page.tsx`
- Modify: `src/app/(app)/exams/page.tsx` (signature upload card, Admin only)

**Interfaces:**
- Consumes: `GET /api/exams/[id]`, `GET/PUT /api/settings/signature`, `/api/uploads`, school constants, `shortClassLabel`, `formatDMY`, `weekdayName`.

- [ ] **Step 1:** Signature card on the Exams list: preview of current image, Upload (POST `/api/uploads` then PUT `/api/settings/signature`), Remove.
- [ ] **Step 2:** Print page (outside app shell, follow `src/app/papers/[id]/print/page.tsx` for print CSS and toolbar): A4 portrait, toolbar (hidden in print) with Signed / Blank line switch (saved to `signatureMode` via PATCH; Signed disabled with hint when no image) and Print button.
- [ ] **Step 3:** Layout per Global Constraints: header band with logo and details, "DATE SHEET", exam name upper-case, blocks in `position` order each with title centred + "TIME: …" right, table: Class | date columns (DD/MM/YYYY over weekday) | subject or "-". Faint centred logo watermark. Draft exams add a diagonal light "DRAFT" watermark. Signature bottom-right: image + "Principal" (Signed) or a line + "Principal" (Blank). Footer band. Whole sheet must fit one A4 page for the reference's 3 blocks / 15 classes.
- [ ] **Step 4:** Verify: enter the full reference date sheet, print-preview (screenshot) and compare against the reference PDF side by side; check both signature modes and the DRAFT watermark.
- [ ] **Step 5:** Commit `feat(exams): printable date sheet with signature`.

### Task 9: Ask after printing

**Files:**
- Create: `src/components/exams/PrintedPrompt.tsx`
- Modify: `src/app/papers/[id]/print/page.tsx`

**Interfaces:**
- Consumes: `GET /api/exams/printed-prompt?paperId=`, `PATCH /api/exams/[id]/slots/[slotId] { printed: true }`, `canManageExams` (from `/api/me`).

- [ ] **Step 1:** On the paper print page, for Admin/Exam Cell only, listen for `afterprint`; fetch pending slots; if any, show a dialog: "Did you print this paper for **<examName>** (<shortClassLabel> · <formatDMY>)?" with **Yes** / **Not yet**. Multiple pending slots ⇒ one row each with its own Yes. Teachers never see it and the fetch is not made.
- [ ] **Step 2:** Verify in the browser: link a Final paper to a slot dated today or later, open its print page, trigger `window.dispatchEvent(new Event("afterprint"))` via the JS tool, click Yes; the calendar day shows it printed and the activity log shows "Marked a paper printed". A slot dated yesterday produces no prompt.
- [ ] **Step 3:** Commit `feat(exams): ask after printing`.

---

# Phase 2 — Setup flow and date sync

### Task 10: Exam dates flow into papers

**Files:**
- Modify: `src/lib/exams/server.ts`
- Create: `src/lib/exams/sync.ts`, test `src/lib/exams/sync.test.ts`

**Interfaces:**
- Produces: `paperSyncFields(exam: { examType: string; academicSession: string }, examDate: string): { examDate: string; examType: string; academicSession: string }` (pure); server calls it in `setCell` auto-link, `setSlotPaper`, `moveDate` (for every linked paper of moved slots, including FINAL papers — this bypasses the Final lock deliberately, writes directly with prisma, and is audited as `PAPER_UPDATE` with `{ reason: "exam date sheet" }`).

- [ ] **Step 1:** Test `paperSyncFields({examType:"HALF_YEARLY",academicSession:"2026–27"},"2026-12-10")` returns those three values exactly.
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement and wire into server. **Step 4:** Run — PASS.
- [ ] **Step 5:** Browser check: link a paper, move its date, open the paper print page — header shows the new date; slot printed earlier shows the "date changed after printing — reprint needed" warning.
- [ ] **Step 6:** Commit `feat(exams): sync exam dates into linked papers`.

### Task 11: Setup checklist — blueprints and drafts

**Files:**
- Create: `src/components/exams/SetupChecklist.tsx`, `src/lib/paperCreate.ts`, `src/app/api/exams/[id]/create-drafts/route.ts`
- Modify: `src/app/api/papers/route.ts` (POST delegates to `createPaperFromBlueprint`), `src/app/(app)/blueprints/setup/page.tsx` (read pre-fill query), `src/lib/exams/server.ts`, `src/app/(app)/exams/[id]/page.tsx`

**Interfaces:**
- Produces:
  - `createPaperFromBlueprint(input: PaperCreateInput, ownerId: string, actor: SessionUser): Promise<{ id: string }>` — the body of today's POST `/api/papers` moved verbatim (scope check against `actor`, `createdById: ownerId`, audit).
  - `missingBlueprintBooks(examId): Promise<{ bookId: string; className: string; subject: string }[]>` and `createMissingDrafts(examId, user): Promise<{ created: number; skipped: { slotId: string; reason: string }[] }>` in `server.ts` — for each slot with a blueprint and no paper: pick the blueprint (if several match, newest `updatedAt`), title `"<exam name> — <subject> (<className>)"`, `schoolName: DEFAULT_SCHOOL_NAME`, `layout: "PAGE"` unless the blueprint's existing papers mostly use BOOKLET, plus `paperSyncFields`; link to slot. Slots whose class-subject has no Book are skipped with reason "No book for <class> <subject> in <session>".
  - `POST /api/exams/[id]/create-drafts` (also accepts `{ slotId }` for one).
  - Setup page query: `/blueprints/setup?examType=HALF_YEARLY&session=2026–27&books=<id>,<id>` pre-selects those books and exam type.

- [ ] **Step 1:** Move paper creation into `src/lib/paperCreate.ts`; `npm test && npx tsc --noEmit` — Expected: clean (behaviour unchanged).
- [ ] **Step 2:** Implement server functions, route, setup-page pre-fill.
- [ ] **Step 3:** `SetupChecklist` tab (`?tab=setup`): four rows with progress bars — ① Date sheet (blocks, scheduled count) ② Blueprints `n/total` + "Set up the missing ones →" ③ Papers (drafts, final) + "Create missing drafts" ④ Printing (printed/total). Per-slot "Create paper" also appears in `DayPanel` and the builder for `NO_PAPER` slots.
- [ ] **Step 4:** Browser check: for an exam with a slot missing its blueprint, the link opens setup pre-filled; after creating, Create missing drafts makes draft papers dated from the date sheet and owned by the admin; slot statuses move NO_BLUEPRINT → NO_PAPER → DRAFT.
- [ ] **Step 5:** Commit `feat(exams): setup checklist with blueprint and draft creation`.

### Task 12: End-to-end test

**Files:**
- Create: `tests/e2e/exam-manager.spec.ts`

- [ ] **Step 1:** Write a Playwright test following `tests/e2e/mandatory-workflows.spec.ts` sign-in setup: create exam → block with 2 dates, 1 class, 2 subjects → calendar shows 2 days with "0/2 ready" → print page shows the table with "DATE SHEET" and the exam name in capitals → mark a slot printed via the day panel → calendar shows 1 printed.
- [ ] **Step 2:** `npm run test:e2e -- exam-manager` — Expected: PASS.
- [ ] **Step 3:** Commit `test(exams): end-to-end exam flow`.
