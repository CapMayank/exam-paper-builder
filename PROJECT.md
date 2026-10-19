# Project: Sarvodaya School Examination Portal — Production Business Logic

## Architecture
- **Framework & Runtime**: Next.js 16.4.1 (App Router), React 19, TypeScript 5, Tailwind CSS 4.
- **Persistence & ORM**: SQLite (`prisma/dev.db`) via Prisma ORM 6.19.3.
- **Auth & Session**: Signed HMAC-SHA256 session cookie (`epb_session`), `sessionUserId`, `route(handler, opts: { roles })`, `SessionUser`.
- **Exam Cell Engine**: Print-Run Calculator (`/exam-cell`) calculating raw sheets, wastage buffers, reams to order, answer booklets, and packaging slips.
- **Paper Builder**: Interactive paper editor (`/papers/[id]`) and Question Picker modal (`QuestionPicker.tsx`) with compact exam usage tagging and freshness warnings.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Server-Side RBAC Paper Ownership & Finalized Lock | `assertCanModifyPaper` enforcing teacher paper ownership (`createdById`) and forbidding non-admin modifications/unlock of `FINAL` papers (HTTP 403) | M1 | R1 Survey |
| 2 | Server-Side RBAC Question Ownership | `assertCanModifyQuestion` in `/api/questions/[id]` forbidding teachers from modifying/deleting questions created by others (HTTP 403) | M1 | R1 Survey |
| 3 | Server-Side Admin-Only Routes | Route guards `{ roles: ["ADMIN"] }` on `/api/classes`, `/api/classes/[id]`, `/api/classes/[id]/subjects`, and `/api/academic-rollover` (HTTP 403) | M1 | R1 Survey |
| 4 | Client-Side UI RBAC Visibility | Conditional hiding/disabling of delete/edit actions on unowned/finalized papers, questions, classes, and rollover in UI | M1 | R1 Survey |
| 5 | Class Section Enrollment Data Model | Backward-compatible `AcademicClassDto` with `sections: string[]` + `sectionDetails: Array<{ name: string; studentCount: number }>` and schema validation | M2 | R2 Survey |
| 6 | Classes Studio Inline Section Manager | Interactive inline manager in `/classes` to update per-section student headcounts with instant persistence | M2 | R2 Survey |
| 7 | Exam Cell Print-Run Auto-Population & Calculator | Auto-populate section student counts and total strength on class selection; calculate sheets, wastage buffers, reams, and answer booklets | M2 | R2 Survey |
| 8 | Compact Exam Exhaustion Tagging & Amber Badge | Detect earlier finalized exams for same class/subject in active session; display compact tags (`Quarterly 2025`, `Halfyearly 2025`, `Annual 2025`) with amber warning badges in QuestionPicker and paper editor | M3 | R3 Survey |
| 9 | Question Usage Query & DTO Enhancements | Query `paper.status` and `blueprint.book.subject` in `/api/questions` and `src/lib/papers.ts`; conditional DTO mapping preserving strict `toEqual` compatibility | M3 | R3 Survey |
| 10 | Comprehensive Vitest Test Suites | Pass all 362 existing tests + new unit tests for RBAC, Print Logistics, and Question Exhaustion | M4 | System Verification |
| 11 | Production Build & Forensic Integrity Audit | Clean `npm run build` with zero TypeScript/Turbopack errors + Forensic Integrity Audit | M4 | System Verification |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Role-Based Access Control (RBAC) & Ownership Enforcement | Server API 403 route protection (`/api/papers`, `/api/questions/[id]`, `/api/classes`, `/api/academic-rollover`) and UI edit/delete visibility controls | none | DONE |
| M2 | Class Section Student Enrollment & Print Calculator Integration | `AcademicClass` section capacity, Classes Studio inline manager, and Exam Cell Print-Run Calculator auto-population & logistics | M1 | DONE |
| M3 | Compact Exam Exhaustion Tagging in Paper Builder | Usage history querying (`status`, `subject`), `isExhaustedUsage` logic, amber warning badges in QuestionPicker & workbench | M1 | DONE |
| M4 | Comprehensive Verification, Build & Forensic Integrity Audit | All 362 existing tests passing + new test suites, `npm run build` passing, clean Forensic Integrity Audit | M1, M2, M3 | DONE |

## Interface Contracts

### M1 (RBAC & Ownership)
- `assertCanModifyPaper(user: SessionUser, paper: { createdById: string; status?: string }): void`
  - Throws `HttpError(403)` if `paper.status === "FINAL"` and `user.role !== "ADMIN"`.
  - Throws `HttpError(403)` if `paper.createdById !== user.id && user.role !== "ADMIN" && user.role !== "HOD"`.
- `assertCanModifyQuestion(user: SessionUser, question: { createdById: string }): void`
  - Throws `HttpError(403)` if `user.role === "TEACHER" && question.createdById !== user.id`.
- `POST /api/classes`, `PATCH/DELETE /api/classes/[id]`, `POST /api/academic-rollover`:
  - Guarded with `route(..., { roles: ["ADMIN"] })` -> HTTP 403 for non-admins.
- `toQuestionDto`, `PaperListItem`, `PaperData`: expose `createdById`.

### M2 (Section Enrollment & Print Logistics)
- `SectionDetail`: `{ name: string; studentCount: number }`
- `AcademicClassDto`: includes `sections: string[]` and `sectionDetails: SectionDetail[]`.
- `toAcademicClassDto`: parses legacy string array `["A", "B"]` or object array `[{ name: "A", studentCount: 42 }]`.
- `getSectionsForClass(cls?: AcademicClassDto | null)`: maps `sectionDetails` to `{ name: `${cls.name} - Section ${s.name}`, count: s.studentCount }`.
- Print Calculator Formulas:
  - `rawSheets = totalStudents * sheetsPerCopy`
  - `wastageSheets = Math.ceil(rawSheets * (wastagePercent / 100))`
  - `totalSheetsRequired = rawSheets + wastageSheets`
  - `totalReamsRequired = parseFloat((totalSheetsRequired / 500).toFixed(2))`
  - `reamsToOrder = Math.ceil(totalReamsRequired)`
  - `answerBookletsRequired = totalStudents`

### M3 (Question Exhaustion Tagging)
- `QuestionUsageTag`: `{ paperId, paperTitle, paperSet, examDate, academicSession, className, subject?: string, status?: string, isOrChoice: boolean }`
- `isExhaustedUsage(usage: QuestionUsageTag, currentPaper?: CurrentPaperContext | null): boolean`
  - Returns true if different paper, normalized active session matches, class matches, subject matches, and status is "FINAL".
- Amber Badge UX:
  - Compact tag formatted via `parseCompactExamTag`.
  - Warning styling: `bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-400/40 hover:bg-amber-200`.
  - `AlertTriangle` icon + `[Exhausted]` indicator badge.

## Code Layout
- Authentication & Sessions: `src/lib/session.ts`, `src/lib/api.ts`
- Paper Utilities & Permissions: `src/lib/papers.ts`
- Classes & Enrollment: `src/lib/types.ts`, `src/lib/schemas.ts`, `src/lib/classes.ts`, `src/app/(app)/classes/page.tsx`
- Exam Cell Print Calculator: `src/app/(app)/exam-cell/page.tsx`, `src/app/api/exam-cell/calculator/route.ts`
- Question Usage & Tagging: `src/components/QuestionUsageHistory.tsx`, `src/components/QuestionPicker.tsx`, `src/app/(app)/papers/[id]/page.tsx`
- API Routes:
  - `src/app/api/papers/[id]/route.ts`
  - `src/app/api/papers/[id]/questions/[itemId]/route.ts`
  - `src/app/api/questions/route.ts`
  - `src/app/api/questions/[id]/route.ts`
  - `src/app/api/classes/route.ts`
  - `src/app/api/classes/[id]/route.ts`
  - `src/app/api/academic-rollover/route.ts`
- Tests:
  - `src/lib/rbac-ownership.test.ts`
  - `src/lib/print-logistics.test.ts`
  - `src/lib/question-exhaustion.test.ts`
