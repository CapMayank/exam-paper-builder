# Flexible Marks (class 8 and below) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In classes up to 8, a match question occupies the marks it is worth (A), at a chosen pair value (B), and same-mark sections can lend slots on one paper (C), with AI fill/generate/commit following the same rules.

**Architecture:** Every placement route already goes through `questionSlotMarks`, `slotPlacement` and `whyCannotAdd` in `src/lib/blueprint.ts`; the plan changes that seam, gated by a new `flexible` flag on sections (set where sections load, true only up to class 8), then wires UI and AI to it. Classes 9+ never take the new branches.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching routes/pages, per AGENTS.md), Prisma (`prisma db push`, no migrations folder), Vitest (`npm test`), Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-13-flexible-marks-design.md`

## Global Constraints

- Classes 9 to 12 behave exactly as today; every new branch checks `section.flexible` first.
- The blueprint is never edited by these features; flexibility lives on the paper.
- Stored `marks` stay whole numbers; 1/2 per pair only for an even pair count.
- Flexible match span applies only to sections with `marksEach === 1`, `count > 1`, and MATCH_COLUMN in their allowed types.
- Pools (C): same `marksEach`, objective types only, `flexible` sections only; per-paper deltas in a pool sum to zero.
- Each phase is its own commit series and works alone. Run `npm test` and `npx tsc --noEmit` before each commit.

## Review Focus

- Class 9 section that lists MATCH_COLUMN as allowed: a match still counts as 1 slot, 1 mark (Task 1).
- Match whose pairs cannot be parsed (0 pairs): counts as 1 slot, never 0 or NaN (Task 1).
- Editing a placed match to more pairs than free slots: refused, the stored question is unchanged (Task 3).
- Two matches in one section share its slots; deleting or replacing a match frees exactly its slots (Task 3).
- Pair value 1/2 with an odd pair count refused; changing pair value that no longer fits refused (Task 4).
- Moving slots below what is already placed, or between unlike sections, refused (Task 5).

---

### Task 1: Flexible flag and slot-span rules (A, pure logic)

**Files:**
- Modify: `src/lib/sectionTypes.ts` (`TypedSection`, `withEffectiveAllowedTypes`, add `isFlexibleClass`)
- Modify: `src/lib/blueprint.ts` (`SectionDef`, `questionSlotMarks`, `slotPlacement`, `whyCannotAdd`)
- Test: `src/lib/flexible-marks.test.ts` (create)

**Interfaces:**
- Produces: `isFlexibleClass(className: string | null | undefined, sectionType: string): boolean` (class number <= 8, or unreadable number and not a kindergarten type); `flexible?: boolean` on `TypedSection` and `SectionDef`; `spansSlots(section: SectionDef-like & {flexible?: boolean}): boolean` exported from `blueprint.ts` = flexible, `marksEach === 1`, `count > 1`, `isTypeAllowed(section, "MATCH_COLUMN")`. `questionSlotMarks`/`slotPlacement` signatures unchanged.

- [ ] **Step 1: Write failing tests** in `flexible-marks.test.ts`: (a) a 4-pair MATCH_COLUMN question in `{type:"MCQ",count:5,marksEach:1,allowedTypesJson:'["MCQ","MATCH_COLUMN"]',flexible:true}` gives `slotPlacement` = `{marks:4, subpartsCount:4}`; (b) same section with `flexible:false` gives `{marks:1}` and `subpartsCount` undefined; (c) unparseable pairs (empty options/text) gives marks 1, units 1; (d) pairs greater than `count` is capped at `count`; (e) `whyCannotAdd` refuses the 4-pair match when 2 slots are free, message contains "free slots" and the section title, and accepts it when 4 are free, and does not reject on the marks===marksEach rule; (f) `isFlexibleClass("Class 8","MCQ")` true, `("Class 9","MCQ")` false, `("Nursery","KDG_PICTURE_MATCH")` false, `("Nursery","MCQ")` true; (g) `withEffectiveAllowedTypes` sets `flexible` accordingly.
- [ ] **Step 2: Run** `npx vitest run src/lib/flexible-marks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `isFlexibleClass` reuses `classNumberOf` and `isKindergartenType`, mirroring `effectiveAllowedTypesJson`. `withEffectiveAllowedTypes` adds `flexible`. In `blueprint.ts` replace the three hard-wired match conditions (lines ~390, ~605, ~633) with "section is a multi-slot MATCH section (today's rule) OR `spansSlots(section)`"; in `whyCannotAdd` pass `marks` to `typeRejection` only when not spanning.
- [ ] **Step 4: Run** the new test plus `npx vitest run src/lib`. Expected: all PASS (existing match tests unchanged).
- [ ] **Step 5: Commit** `feat(marks): match questions span slots in flexible sections (class 8 and below)`.

### Task 2: Flag reaches every consumer of sections

**Files:**
- Modify: `src/lib/papers.ts:144`, `src/lib/blueprintSetup.ts:152`, `src/app/api/papers/[id]/questions/[itemId]/route.ts:33`, `src/app/api/questions/[id]/route.ts:97`, and any other place that builds a `BlueprintDef` or passes a section to `slotPlacement`/`whyCannotAdd` (grep both; `QuestionPicker.tsx`, `papers/[id]/page.tsx`, autofill, ai-commit-section, bulk).
- Test: `src/lib/flexible-marks.test.ts` (extend)

**Interfaces:**
- Consumes: `withEffectiveAllowedTypes` from Task 1.

- [ ] **Step 1: Write failing test:** loading a class 8 paper's blueprint yields sections with `flexible: true`, a class 9 paper yields `flexible: false` (use the existing `papers.ts` loader with the repo's test helpers, as `effective-allowed-types.test.ts` does).
- [ ] **Step 2: Run** it. Expected: FAIL for any loader that skips `withEffectiveAllowedTypes`.
- [ ] **Step 3: Route every section load through `withEffectiveAllowedTypes`** so `flexible` is present; no consumer computes its own.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(marks): all section loads carry the flexible flag`.

### Task 3: Placement routes, picker and workbench for spanning matches (A)

**Files:**
- Modify: `src/components/QuestionPicker.tsx` (~131, ~185-206), `src/app/(app)/papers/[id]/page.tsx` (~570, ~1692-1710, ~1841), `src/components/PaperSheets.tsx` (~602), `src/lib/paperCompletenessEngine.ts` (~107, ~130), print numbering (grep `subpartsCount` across `src`)
- Test: `src/lib/flexible-marks.test.ts`; `tests/e2e/mandatory-workflows.spec.ts` (add one flow)

**Interfaces:**
- Consumes: `spansSlots`, `slotPlacement` (Task 1).

- [ ] **Step 1: Write failing tests:** `paperStatus` counts a 4-pair match in a 5-slot MCQ section as filled 4, needed 5; a second 2-pair match is refused; removing the match returns filled 0; replacing it with an MCQ via the item route frees 3 slots; PATCH-editing a placed match to more pairs than free slots is refused and leaves the question unchanged; `paperStatus.usedMarks` includes the 4 marks.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Generalize every `type === "MATCH_COLUMN"` section check on the workbench, picker and numbering** from "section is a match section" to "section is a match section or `spansSlots`". Matches in spanning sections render as one row labelled "Match (N pairs, N marks)" covering the slots; picker disables a match whose pairs exceed free slots and shows the `whyCannotAdd` reason.
- [ ] **Step 4: Run** `npm test`, then the new e2e flow on port 3100 (stop any dev server on 3000 first). Expected: PASS.
- [ ] **Step 5: Commit** `feat(workbench): spanning match rows, picker limits and numbering`.

### Task 4: Pair value, marks per pair 1 or 1/2 (B)

**Files:**
- Modify: `prisma/schema.prisma` (`PaperQuestion.pairMarks Float?`), `src/lib/blueprint.ts` (`questionSlotMarks`, `slotPlacement`, `toPlacedItems`), `src/app/api/papers/[id]/questions/[itemId]/route.ts` (accept and validate `pairMarks`), placement routes that create items, workbench row control, print/DOCX instruction line
- Test: `src/lib/flexible-marks.test.ts`

**Interfaces:**
- Produces: `q.pairMarks?: number | null` accepted by `questionSlotMarks`; with `pairMarks = 0.5` and `pairs` even, `marks = pairs / 2`, `units = marks`. `pairMarksProblem(section, pairs: number, pairMarks: number): string | null` exported from `blueprint.ts` (refuses values other than 1 or 0.5, odd pairs at 0.5, non-flexible sections, and a result that no longer fits the free slots).

- [ ] **Step 1: Write failing tests:** 4 pairs at 0.5 gives `{marks:2, subpartsCount:2}`; 2 pairs at 0.5 gives `{marks:1}`; 3 pairs at 0.5 gives a problem message; `pairMarks:1` equals today's result; class 9 ignores `pairMarks`; the item PATCH route rejects 0.5 with odd pairs with HTTP 400 and the message.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Add the column, run `npx prisma db push`,** thread `pairMarks` through `toPlacedItems`/`slotPlacement`, validate in the PATCH route, add a "Marks per pair: 1 | 1/2" control on a placed spanning match (1/2 disabled for odd pairs), and print "(1/2 mark each)" in the instruction line when 0.5.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(marks): per-pair value 1 or 1/2 for match questions`.

### Task 5: Mark pools, rebalance slots between same-mark sections (C)

**Files:**
- Modify: `prisma/schema.prisma` (new `PaperSectionSlots { paperId, sectionId, delta Int, @@unique([paperId, sectionId]) }`, relations to `Paper` and `BlueprintSection` with cascade delete), `src/lib/papers.ts` (apply deltas to section counts at load)
- Create: `src/lib/sectionPools.ts`, `src/app/api/papers/[id]/rebalance/route.ts`
- Modify: workbench section header (a "Move slots" control, flexible pools only)
- Test: `src/lib/section-pools.test.ts` (create)

**Interfaces:**
- Produces: `poolOf(section, sections): string[]` (ids of flexible sections with the same `marksEach` and an objective type, including itself); `rebalanceProblem(sections, filledBySection: Record<string, number>, fromId: string, toId: string, slots: number): string | null` (refuses `slots <= 0`, different pools, or a from-section left below what is already placed); `POST /api/papers/[id]/rebalance` body `{fromSectionId, toSectionId, slots}` upserts two delta rows in one transaction and returns the new effective counts.

- [ ] **Step 1: Write failing tests:** `poolOf` groups a 5x1 MCQ and a 5x1 FILL_BLANK, excludes a 2-mark section and every section of a class 9 book; `rebalanceProblem` refuses moving 3 slots out of a section with 4 of 5 filled, refuses unlike pools; after a valid move the loader returns counts 3 and 7 and `blueprintTotalMarks` is unchanged; `paperStatus` and `whyCannotAdd` use the effective counts; route returns 400 with the reason on refusal.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the model (`db push`), pool helpers, route (teacher must own the paper, same auth as sibling routes), and loader that adds deltas; print numbering and preflight read `count` so they follow. Add the workbench control.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(papers): rebalance slots between same-mark sections`.

### Task 6: AI fill, generate and commit follow the same rules

**Files:**
- Modify: `src/lib/autofill.ts` (~159-230, ~282, ~359, ~385), `src/app/api/papers/[id]/autofill/route.ts` (~202-227, ~382, ~428), `src/app/api/papers/[id]/ai-generate-section/route.ts` (~58), `src/app/api/papers/[id]/ai-commit-section/route.ts` (~140, ~302), `src/lib/aiQuestionPayload.ts` (~48)
- Test: `src/lib/flexible-marks-ai.test.ts` (create; model it on `ai-fill-replace-marks.test.ts` and `aiPaperAutogenApi.test.ts`)

**Interfaces:**
- Consumes: `spansSlots`, `slotPlacement`, effective counts from Tasks 1 to 5. Autofill slot planning must size a match by `slotPlacement(section, q).subpartsCount ?? 1`, and the free-slot count passed to AI generate for a section is its effective count minus filled units.

- [ ] **Step 1: Write failing tests:** (a) autofill given a bank containing one 4-pair match and MCQs fills a flexible 5x1 MCQ section with the match plus 1 MCQ (4+1 slots, 5 marks), never overfills; same bank in a class 9 section places only MCQs; (b) autofill respects rebalanced counts; (c) `ai-generate-section` for a flexible section with N free slots accepts a MATCH_COLUMN draft with up to N pairs, rejects more with a clear error, and rejects MATCH_COLUMN for a section that does not allow it; (d) `ai-commit-section` commits a 4-pair AI match into 4 slots with marks 4 and honours `pairMarks`; (e) the picker, autofill and ai-commit place the same match with identical `marks` and `subpartsCount`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Extend** the autofill planner (`autofill.ts` currently only plans matches inside MATCH sections, and filters MATCH_COLUMN out of alternative types at ~228) so a flexible section may take a match sized by `slotPlacement`; pass free slots and the pair limit into the generate prompt/payload; make commit pass flexible sections and effective counts into `whyCannotAdd`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, including every existing AI test unchanged.
- [ ] **Step 5: Commit** `feat(ai): fill, generate and commit use flexible slot rules`.

### Task 7: End-to-end check and handover note

**Files:**
- Modify: `tests/e2e/mandatory-workflows.spec.ts`; `docs/superpowers/HANDOVER-2026-11-13.md` (append a short section)

- [ ] **Step 1: Add an e2e flow** on a class 8 paper: add a 4-pair match to a 5x1 section, set 1/2 per pair, rebalance 2 slots between sections, run AI fill, confirm totals; and a class 9 paper where none of the controls appear.
- [ ] **Step 2: Run** `npx playwright test tests/e2e/mandatory-workflows.spec.ts` on port 3100. Expected: PASS.
- [ ] **Step 3: Append** what shipped, the `db push` steps run, and leftovers to the handover file.
- [ ] **Step 4: Commit** `test(e2e): flexible marks flows; handover note`.
