# Project: Exam Paper Builder — Teacher Customization & Strict Board Guardrails

## Architecture
- **Framework & Runtime**: Next.js 16.4.1 (App Router), React 19, TypeScript 5, Tailwind CSS 4.
- **Persistence & ORM**: SQLite (`prisma/dev.db`) via Prisma ORM 6.19.3.
- **Typesetting & Math**: KaTeX 0.19.0 for inline (`$...$`) and display (`$$...$$`) LaTeX math.
- **Imposition Engine**: Saddle-stitch booklet permutation (A3 landscape folded into A4 booklets) and dynamic browser DOM height probe.
- **State & API**: REST API endpoints under `src/app/api/` with cookie session authentication and client-side React state.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database Schema Foundation | Prisma schema extensions: `Blueprint.subjectCode`, `Paper` branding/density/numbering fields, `Question.subpartsJson`, `PaperSnapshot` model | M1 | Survey (R1-R8) |
| 2 | TypeScript Types & DTOs | Updated data transfer objects, Zod validation schemas, and types | M1 | Survey |
| 3 | OR Choice Parity Guardrails | Strict enforcement that alternate (OR) questions match primary question's chapter and mark value | M2 | R3 |
| 4 | Multi-Part Case Study Questions | Subparts schema, marks sum validation, authoring UI, multi-part rendering, and step rubrics | M2 | R3 |
| 5 | Question Usage History Tags | Historical paper usage metadata tracking across papers, sets, and dates with clickable/hoverable pills | M2 | R5 |
| 6 | Cohort Freshness Warning | Alert banner when reusing a question in the same cohort or academic session | M2 | R5 |
| 7 | Batch Question Import (JSON/CSV) | Batch parser with schema validation, chapter mapping, duplicate prevention, and line-by-line error reports | M3 | R4 |
| 8 | Batch Question Export (JSON/CSV) | Export full question bank or chapter subset to formatted CSV / JSON | M3 | R4 |
| 9 | Controlled Multi-Set Overlap | Generator for Sets 1, 2, 3 with configurable common/variant ratio (e.g. CBSE 60% common / 40% variant) matching blueprint quotas | M3 | R6 |
| 10 | Draft Snapshots Creation | 1-click named snapshot creation saving paper state checkpoints | M4 | R7 |
| 11 | Revision History & Diff View | Side-by-side visual diff of snapshot vs current paper (added, removed, replaced questions) | M4 | R7 |
| 12 | 1-Click Snapshot Rollback | Atomic restoration of paper metadata and placed questions from snapshot | M4 | R7 |
| 13 | Print Density Controls | 3-tier font size scale (compact/standard/comfortable ≥9pt), line-height spacing, and 2-column density toggle | M5 | R1 |
| 14 | Physical Page-Budget Guardrails | Dynamic calculation against A3 4-page booklet / A4 duplex 2-page limits, overflow alert banner, print blocking with acknowledgement override | M5 | R1 |
| 15 | Exam Header Branding | School logo upload/URL, Academic Session (e.g. 2025–26), candidate roll number boxes, signature blocks | M5 | R2 |
| 16 | Locked Board Metadata | Lock Subject Code, Duration, Total Marks to 1-to-1 sync with Blueprint | M5 | R2 |
| 17 | Question Numbering Customizer | Numbering styles: Continuous 1, 2, 3...; Prefixed Q.1, Q.2...; Section-Relative A1, A2... / B1, B2... | M5 | R8 |
| 18 | Marks Display Customizer | Marks formatting: Bracketed inline [3 Marks], right-aligned margin column, or suppressed | M5 | R8 |
| 19 | Route Audit & Redirects | End-to-end verification of all routes; top-level `/print` and `/solutions` redirect to `/papers` | M6 | R9 |
| 20 | E2E Testing Suite (Tiers 1-4) | Systematic Category-Partition, BVA, Pairwise, and Application-level test suite with `TEST_READY.md` | M6 | R9 / Testing Track |
| 21 | Final Verification & Tier 5 Hardening | 100% Vitest pass, clean `tsc --noEmit`, Playwright tests, adversarial coverage hardening, forensic integrity audit | M7 | R9 / Final Milestone |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Schema & Data Foundation | Prisma schema updates, DB migration, types, DTOs, and unit tests | none | DONE |
| M2 | Board Guardrails & Question Features | Choice chapter parity, multi-part case study questions, usage history tags & freshness warning | M1 | DONE |
| M3 | Batch Import/Export & Multi-Set Overlap | Batch CSV/JSON import with line errors & duplicate check, export, 60/40 multi-set generator | M1, M2 | IN_PROGRESS |
| M4 | Draft Snapshots & Revision History | Snapshot creation, difference preview, 1-click rollback, and workbench UI | M1 | PLANNED |
| M5 | Print Density, Branding & Customization | 3-tier density scale, 2-column mode, page budget overflow guardrails, school branding, locked metadata, numbering/marks customizer | M1 | PLANNED |
| M6 | Route Audit & E2E Test Suite (Tiers 1-4) | Bare route redirects, test suite covering all R1-R8 acceptance criteria, Playwright tests, publish `TEST_READY.md` | M2, M3, M4, M5 | PLANNED |
| M7 | Final Verification & Adversarial Hardening | 100% Vitest pass, clean TypeScript, Playwright verification, Tier 5 adversarial tests, Forensic Integrity Audit | M6 | PLANNED |

## Interface Contracts

### M1 ↔ All Milestones
- `Blueprint`: includes `subjectCode: string`
- `Paper`: includes `academicSession: string`, `logoPath: string | null`, `printDensity: "COMPACT" | "STANDARD" | "COMFORTABLE"`, `twoColumn: boolean`, `targetPages: number | null`, `numberingStyle: "CONTINUOUS" | "PREFIXED" | "SECTION_RELATIVE"`, `marksStyle: "INLINE" | "RIGHT_COLUMN" | "SUPPRESSED"`, `showCandidateDetails: boolean`, `showSignatures: boolean`
- `Question`: includes `subpartsJson: string` (JSON array of `SubPart` objects: `{ label, text, marks, answer?, options? }`)
- `PaperSnapshot`: `{ id, paperId, name, snapshotJson, createdById, createdAt }`

### M2 (Guardrails & Multi-Part) ↔ Paper Workbench
- `PATCH /api/papers/[id]/questions/[itemId]` enforces `candidate.chapterId === item.question.chapterId` on alternate questions.
- `QUESTION_TYPES`: includes `"CASE_STUDY"`.
- `QuestionDto`: includes `subparts: SubPart[]` and `usages: QuestionUsageTag[]`.
- `QuestionUsageTag`: `{ paperId, paperTitle, paperSet, examDate, academicSession, className, isOrChoice }`.

### M3 (Import/Export & Multi-Set) ↔ Question Bank & Paper Workbench
- `POST /api/questions/bulk`: accepts `{ format: "csv" | "json", content: string, bookId: string, skipDuplicates?: boolean }`. Returns `BatchImportReport`: `{ totalRows, validCount, duplicateCount, errorCount, errors: [{ rowNumber, field, error }], createdQuestions }`.
- `GET /api/questions/export?bookId=...&format=csv|json`: streams formatted CSV or JSON.
- `POST /api/papers/[id]/parallel-sets`: accepts `{ sets: string[], commonRatio: number, shufflePositions?: boolean, shuffleMcqOptions?: boolean }`. Returns array of created Paper objects.

### M4 (Snapshots) ↔ Paper Workbench
- `GET /api/papers/[id]/snapshots`: list snapshots.
- `POST /api/papers/[id]/snapshots`: body `{ name: string }`.
- `GET /api/papers/[id]/snapshots/[snapshotId]/diff`: returns `{ addedQuestionIds, removedQuestionIds, replacedItems, metadataChanges }`.
- `POST /api/papers/[id]/snapshots/[snapshotId]/rollback`: restores paper atomically.

### M5 (Print Density & Customization) ↔ Print Engine & Workbench
- `formatQuestionNumber(style: NumberingStyle, globalIdx: number, sectionLetter: string, sectionIdx: number): string`
- `PaperSheets.tsx`: supports `density` (Compact/Standard/Comfortable), `twoColumn`, `targetPages`, `numberingStyle`, `marksStyle`, and emits `onInfo({ pages, sheets, overflow })`.
- Print preview page disables print button on overflow unless `acknowledged: true`.

## Code Layout
- Schema & Migrations: `prisma/schema.prisma`, `prisma/dev.db`
- Data Types & DTOs: `src/lib/types.ts`, `src/lib/dto.ts`, `src/lib/constants.ts`
- Domain Logic:
  - Blueprint & Quotas: `src/lib/blueprint.ts`
  - Paper Assembly & Status: `src/lib/paper.ts`
  - Layout & Pagination: `src/lib/layout.ts`
  - Math & KaTeX: `src/lib/math.ts`
  - Batch Import/Export: `src/lib/batchQuestionIo.ts`
  - Multi-Set Generation: `src/lib/multiset.ts`
  - Snapshots & Diff: `src/lib/snapshots.ts`
- API Routes:
  - Questions: `src/app/api/questions/route.ts`, `src/app/api/questions/bulk/route.ts`, `src/app/api/questions/export/route.ts`
  - Papers: `src/app/api/papers/[id]/route.ts`, `src/app/api/papers/[id]/questions/[itemId]/route.ts`, `src/app/api/papers/[id]/snapshots/route.ts`, `src/app/api/papers/[id]/parallel-sets/route.ts`
- Components:
  - Workbench: `src/app/(app)/papers/[id]/page.tsx`, `src/components/QuestionPicker.tsx`
  - Print & Solutions: `src/app/papers/[id]/print/page.tsx`, `src/components/PaperSheets.tsx`, `src/components/QuestionView.tsx`, `src/app/papers/[id]/solutions/page.tsx`
  - Questions UI: `src/app/(app)/questions/page.tsx`, `src/components/QuestionForm.tsx`
- Tests: `src/lib/logic.test.ts`, `src/lib/*.test.ts`, `tests/`
