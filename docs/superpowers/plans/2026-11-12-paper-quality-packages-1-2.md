# Paper Quality Overhaul, Packages 1 and 2: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The printed paper, Word export and answer key show marks and instructions the way the spec says, and the broken features and server-side safety gaps are fixed.

**Architecture:** Marks-display decisions move into one pure module, `src/lib/marksDisplay.ts`, that every renderer calls. Section-letter parsing gets one helper. Everything else is a targeted fix in the file that owns the behaviour, each with a Vitest regression test.

**Tech Stack:** Next.js 16.4.1 (App Router), React 19, TypeScript 5, Prisma 6 + SQLite, zod 4, Vitest 5, `docx`.

**Spec:** `docs/superpowers/specs/2026-11-12-paper-quality-overhaul-design.md` (packages 1 and 2). Packages 3 to 5 get their own plans after these merge.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (`AGENTS.md`).
- Test first. `npm test`, `npx tsc --noEmit` and `npm run lint` all pass at the end of every task.
- Tests are `src/**/*.test.ts`, node environment, no React rendering. Rules go in pure functions under `src/lib`.
- Reproduce each bug (failing test or running app) before fixing. If it does not reproduce, write that in the task report and skip the fix.
- No Prisma schema change.
- Package 1 tasks (1 to 6) and package 2 tasks (7 to 13) run in separate worktrees. Package 1 does not edit `src/lib/types.ts`; package 2 does not edit `PaperSheets.tsx`, `QuestionView.tsx`, `paperDocx.ts` or the solutions page.
- Commit after each task. End commit messages with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.

## Review Focus

1. A question with stored parts and `attemptCount` equal to the part count (any 4 of 4): parts are compulsory, so part marks print.
2. A paper whose stored marks style is an empty string or an unknown value: prints as `INLINE`, in print and in Word.
3. An OR pair where only the alternative has "any k of n" parts: marks once on the first question's line, no part marks under the alternative, part marks under the first question if its parts are compulsory.
4. A Hindi-content paper that has never had its language set: still prints Hindi labels after the language fix.
5. A typed list under "किसी एक" where the slot marks are unknown (bank preview): no part marks and no crash.

Each has a test in the task that owns the code (Tasks 1, 1, 2, 9, 1).

---

## Package 1: print fixes

### Task 1: marks-display rules

**Files:**
- Create: `src/lib/marksDisplay.ts`, `src/lib/marksDisplay.test.ts`
- Modify: `src/lib/subpartExtractor.ts:32-64`, `src/lib/subpartExtractor.test.ts`

**Interfaces (produced):**

```ts
import type { MarksStyle } from "./constants";
/** k when the student answers only k of the parts (0 < k < partCount); otherwise undefined. */
export function alternativesCount(partCount: number, attemptCount?: number | null): number | undefined;
/** Whether each part prints its own marks tag. */
export function showPartMarks(partCount: number, attemptCount: number | null | undefined, marksStyle: MarksStyle): boolean;
/** Stored marks style, or INLINE when empty or unknown. */
export function resolveMarksStyle(value?: string | null): MarksStyle;
```

- [ ] **Step 1: failing tests** in `marksDisplay.test.ts`:
  - `alternativesCount(4, 1) === 1`; `alternativesCount(4, 4) === undefined`; `alternativesCount(4, 0)`, `(4, null)`, `(4, 5)`, `(1, 1)` all `undefined`.
  - `showPartMarks(4, 1, "INLINE") === false`; `showPartMarks(4, 2, "RIGHT_COLUMN") === false`; `showPartMarks(4, undefined, "INLINE") === true`; `showPartMarks(4, 4, "INLINE") === true`; `showPartMarks(4, undefined, "SUPPRESSED") === false`.
  - `resolveMarksStyle("")`, `(null)`, `("NOPE")` all `"INLINE"`; `resolveMarksStyle("RIGHT_COLUMN") === "RIGHT_COLUMN"`.
- [ ] **Step 2: failing tests** in `subpartExtractor.test.ts`:
  - `detectAttemptCount("किसी एक विषय पर निबंध लिखिए-(कोई एक)") === 1`; `"कोई एक"` → 1; `"किन्हीं एक"` → 1; `"Write an essay on any one topic"` → 1; `"any 1 of the following"` → 1.
  - `detectAttemptCount("एक निबंध लिखिए")` is `undefined` (bare "एक" is not a choice).
  - `decomposeForSlot("किसी एक विषय पर निबंध लिखिए-\n(i) पर्यावरण रक्षा\n(ii) कोई महापुरुष\n(iii) अनुशासन\n(iv) विज्ञान से लाभ", 5)` returns `attemptCount === 1` and four parts of 5 marks each.
  - Same text with `slotMarks` `undefined`: four parts of 0 marks, no throw.
- [ ] **Step 3:** run `npx vitest run src/lib/marksDisplay.test.ts src/lib/subpartExtractor.test.ts`; expect failures.
- [ ] **Step 4:** implement the three functions; add the Hindi patterns `(?:किसी|कोई|किन्हीं)\s*(?:एक|1)` and the English `any\s+(?:one|1)\b` to `detectAttemptCount`. Existing patterns keep priority.
- [ ] **Step 5:** tests pass; commit `feat(print): one rule for when part marks print`.

### Task 2: print and preview use the rule

**Files:**
- Modify: `src/components/QuestionView.tsx` (`:129-137`, `:196`, `:240-255`, `:353`, `:404`, `:419`, `:469`, `:479-486`, `:544-545`, `:602-611`)
- Modify: `src/components/PaperSheets.tsx` (`:336-395` `groupStatesMarksEach`, `:582-593`, `:652-715`)
- Modify: `src/lib/compactLayout.ts` (delete `hasUniformSubpartMarks`, `statesMarksEach`), `src/lib/compactLayout.test.ts`
- Modify: `src/app/(app)/papers/[id]/page.tsx:2079`

**Interfaces:** consumes Task 1.

- [ ] **Step 1:** in `QuestionView.tsx`, compute the attempt count for a body as `q.attemptCount` when the question has stored parts, else the `attemptCount` from `decomposeForSlot`. Replace both `hideSubMarks` definitions with `!showPartMarks(effectiveSubparts.length, attemptCount, marksStyle)` and use it at all four part-marks sites, including nested parts.
- [ ] **Step 2:** OR pairs: `primaryMarks = marks` and no marks on the alternative, in every marks style. Remove the `hideMarks` prop.
- [ ] **Step 3:** default `marksStyle` to `"INLINE"` in `QuestionView`; in `PaperSheets.tsx` and `page.tsx:2079` pass `resolveMarksStyle(paper.marksStyle)`.
- [ ] **Step 4:** delete `hideQuestionMarks`, `groupStatesMarksEach` and every use in `PaperSheets.tsx`; delete the two helpers and their tests in `compactLayout`.
- [ ] **Step 5:** `npm test`, `npx tsc --noEmit`, `npm run lint` pass.
- [ ] **Step 6:** run the app (`.claude/launch.json` config `dev`), open a paper's print page, and confirm on a paper with an "any 1 of 4" question, a compulsory-parts question and an OR pair: marks once on the alternatives question, per-part marks on the compulsory one, marks on the first line of the OR pair, and marks on every numbered question in a multi-type section. Record what was seen in the task report.
- [ ] **Step 7:** commit `fix(print): marks once for alternatives, marks on every question`.

### Task 3: Word export follows the same rules

**Files:**
- Modify: `src/lib/paperDocx.ts` (`:102-128`, `:191`, `:717-750`, `:902`, `:931-986`, `:1137-1138`), `src/lib/docx-export-audit.test.ts:275-282`

**Interfaces:** `renderSubpartsDocx` gains a final parameter `showMarks: boolean` (default `true`), passed down to nested calls.

- [ ] **Step 1: failing tests** in `docx-export-audit.test.ts` (same DB-backed style as the existing cases): for a paper with an "any 1 of 4 × 5" question the document text contains the marks label once for that question; for a paper with marks style `SUPPRESSED` it contains no marks labels; for an OR pair the label follows the first question's text, not the alternative's.
- [ ] **Step 2:** pass `showPartMarks(parts.length, attemptCount, style)` at `:902` and (with `orAttemptCount`) at `:1138`; print the question-line label on the primary for OR pairs; skip labels when `resolveMarksStyle(paper.marksStyle) === "SUPPRESSED"`; replace the hand-rolled OR total at `:951-960` with `questionSlotMarks(section, orQuestion).marks`.
- [ ] **Step 3:** tests pass; commit `fix(docx): marks follow the print rules`.

### Task 4: answer key totals

**Files:**
- Modify: `src/app/papers/[id]/solutions/page.tsx:152-157, 562-566`
- Create: `src/lib/answer-key-marks.test.ts`

- [ ] **Step 1: failing test:** `questionSlotMarks({ type: "LONG", count: 1, marksEach: 5 }, { type: "LONG", subparts: four parts of 5, attemptCount: 1 }).marks === 5` (pins the helper the page must use; passes already) and a second test importing a new exported pure function from the page's sibling module.
- [ ] **Step 2:** extract the page's total computation to `export function answerKeyMarks(section, question): number` in `src/lib/marksDisplay.ts`, returning `questionSlotMarks(section, question).marks`; test `answerKeyMarks` gives 5 for the case above and 8 for any 4 of 5 two-mark parts in an 8-mark slot. Use it at `:152-157`.
- [ ] **Step 3:** gate the part tag at `:562-566` with `showPartMarks`.
- [ ] **Step 4:** tests pass; commit `fix(answer-key): totals respect "any k of n"`.

### Task 5: no automatic instructions

**Files:**
- Modify: `src/lib/sectionTypes.ts:105-129`, `src/lib/sectionTypes.test.ts:79-88`
- Modify: `src/lib/layout.ts:451-480`, `src/components/PaperSheets.tsx:375-387, 418-422, 615-631`
- Modify: `src/lib/paperDocx.ts:729-739`, `src/app/(app)/papers/[id]/page.tsx:2050-2069`, `src/lib/types.ts:110` (comment only)
- Test: `src/lib/mpbse-class12-math-regression.test.ts:487` (update expectations)

**Interfaces:** `questionInstruction(section, questionType, stored?)` keeps its signature and returns `(stored ?? "").trim()`. `TYPE_INSTRUCTION` is deleted.

- [ ] **Step 1: failing tests:** `questionInstruction({ type: "SHORT", allowedTypes: ["GRAMMAR"] } as never, "GRAMMAR", "")` is `""`; with stored `" Do it "` is `"Do it"`. `reconcileSectionGroupInstruction("", 1, 5, "hi") === ""` and `reconcileSectionGroupInstruction(null, 1, 5, "sa") === ""`; a typed Hindi instruction is returned unchanged.
- [ ] **Step 2:** implement. In `PaperSheets.tsx` remove the path that substitutes `getSharedInstruction` when the section's instruction is empty or has no Devanagari; a teacher-typed English instruction on a Hindi paper keeps going through `localizeSectionInstruction` as today.
- [ ] **Step 3:** in the workbench, change the "Printed instruction" placeholder so it no longer promises an automatic line.
- [ ] **Step 4:** **Leave `resolveGroupedExerciseInstruction` (`layout.ts:487-516`) unchanged.** Its default ("रिक्त स्थानों की पूर्ति कीजिए") is the question line of a grouped exercise whose items are (क), (ख)…; without it the items have no question.
- [ ] **Step 5:** tests pass; commit `fix(print): print only instructions the teacher typed`.

### Task 6: grouped sections and numbering

**Files:**
- Create: `src/lib/sectionLetter.ts`, `src/lib/sectionLetter.test.ts`
- Modify: `src/components/PaperSheets.tsx:71, 514-580`, `src/lib/layout.ts:261`, `src/app/(app)/papers/[id]/page.tsx:599-604, 1964-1965`, `src/app/papers/[id]/solutions/page.tsx:129`, `src/app/papers/[id]/omr/page.tsx:56`, `src/lib/paperDocx.ts:529`

**Interfaces (produced):**

```ts
/** "A" from "Section A", "खण्ड A" or "SECTION-B: Grammar"; undefined when the title names no section letter. */
export function sectionLetter(title: string): string | undefined;
```

- [ ] **Step 1: failing tests:** `sectionLetter("Section A") === "A"`; `"SECTION-B: Grammar"` → `"B"`; `"खण्ड C"` → `"C"`; `"Write a letter"` → `undefined`; `"Section 1"` → `undefined`.
- [ ] **Step 2:** implement and replace the six ad-hoc regexes.
- [ ] **Step 3:** the workbench takes its question labels from `computeDisplayedPaperNumbering` (same call `PaperSheets` makes) in place of the position counter at `page.tsx:599-604`.
- [ ] **Step 4:** in the grouped-exercise renderer (`PaperSheets.tsx:514-580`): print options when `isMcqLikeType(item.question.type)` regardless of section type, with labels from the same generator `QuestionView` uses (no 4-option limit); print the item's parts and its OR question (separator from `getInternalChoiceSeparatorLabel`) under the item.
- [ ] **Step 5:** check in the running app with a true/false section containing one item that has an OR; record the result.
- [ ] **Step 6:** tests pass; commit `fix(print): grouped sections keep OR, parts and options; one numbering`.

---

## Package 2: broken features and server-side safety

### Task 7: Quick Swap

**Files:** `src/app/(app)/papers/[id]/page.tsx:405-437`; test `src/lib/quick-swap.test.ts`

- [ ] **Step 1:** reproduce in the running app: open Quick Swap on a placed question whose chapter has other unused bank questions; record what the list shows and the network response.
- [ ] **Step 2: failing test** (route level, DB-backed like `or-question-edit.test.ts`): `GET …/siblings` returns an array; `PATCH …/questions/:itemId` with `{ replaceWithQuestionId }` replaces the slot's question.
- [ ] **Step 3:** client reads the array directly and swaps with `PATCH { replaceWithQuestionId }`; errors go to the existing error state.
- [ ] **Step 4:** tests pass; confirm in the app; commit `fix(papers): Quick Swap lists and swaps`.

### Task 8: diagram edits on the workbench

**Files:** `src/lib/schemas.ts:193-204`, `src/app/api/questions/[id]/route.ts:21-49`, `src/app/(app)/papers/[id]/page.tsx:2225-2240, 2795-2840`; test `src/lib/question-patch-image.test.ts`

- [ ] **Step 1: failing test:** `questionPatchSchema.parse({ imagePath: "uploads/a.png" }).imagePath === "uploads/a.png"`; `parse({ imagePath: null }).imagePath === null`; route-level: PATCH with `imagePath` updates the row.
- [ ] **Step 2:** add `imagePath: z.string().max(500).nullable().optional()` (match the type `questionSchema` uses for the same field) and set it in the route. Keep the route's existing guard for questions used in FINAL papers.
- [ ] **Step 3:** wrap the three workbench callbacks in try/catch that sets the page error; reload the paper after success.
- [ ] **Step 4:** tests pass; confirm add, swap and remove in the app; commit `fix(papers): diagram changes on the workbench are saved`.

### Task 9: paper language

**Files:** `src/lib/localization/index.ts:176-216`, `src/app/(app)/papers/[id]/page.tsx:249-306`; test `src/lib/paper-language.test.ts`

- [ ] **Step 1:** read how `Paper.language` is stored and defaulted (`prisma/schema.prisma`, `src/app/api/papers/route.ts`) and write the finding at the top of the task report.
- [ ] **Step 2: failing tests** for `detectPaperLanguage`:
  - stored `"hi"`, subject Mathematics, English title → `"hi"`.
  - stored `"sa"` → `"sa"`; stored `"bilingual"` → `"bilingual"`.
  - stored value empty/undefined, Devanagari title and instructions → `"hi"` (unchanged behaviour).
  - stored value equal to the column default with Devanagari content → `"hi"`.
- [ ] **Step 3:** implement: a stored `hi`, `sa` or `bilingual` always wins; a stored `en` wins only if Step 1 shows `en` is never written as a default, otherwise detection decides. State in the report which branch applies.
- [ ] **Step 4:** the workbench initialises the select from the stored value when it wins, and stops writing the detected value back.
- [ ] **Step 5:** tests pass; confirm in the app that choosing Hindi on a Maths paper survives a reload and prints Hindi labels; commit `fix(papers): the chosen paper language is kept`.

### Task 10: autosave

**Files:** `src/app/(app)/papers/[id]/page.tsx:244-306, 1332`; create `src/lib/paperAutosave.ts`, `src/lib/paperAutosave.test.ts`

**Interfaces (produced):**

```ts
/** Fields that differ from what was loaded and are valid to send; null when there is nothing to save. */
export function autosavePatch<T extends Record<string, unknown>>(loaded: T, current: T, required: readonly (keyof T)[]): Partial<T> | null;
```

- [ ] **Step 1: failing tests:** identical objects → `null`; one changed field → only that field; a changed required field that is now `""` is left out while other changes are kept; all changes invalid → `null`.
- [ ] **Step 2:** implement; the workbench keeps the loaded details in a ref, calls `autosavePatch(loaded, details, ["title", "schoolName"])`, and PATCHes only when the result is non-null and the user can edit.
- [ ] **Step 3:** remove the `"2025–26"` fallback from saved state (`:252`, `:1332`); a display-only fallback may stay.
- [ ] **Step 4:** tests pass; confirm in the app that opening a paper sends no PATCH; commit `fix(papers): autosave only real edits`.

### Task 11: finalised papers are protected through OR questions

**Files:** `src/app/api/papers/[id]/questions/[itemId]/route.ts:260-275`; test `src/lib/or-question-edit.test.ts`

- [ ] **Step 1: failing test:** a question used only as `orQuestionId` in a FINAL paper; `PUT` with `mode: "UPDATE_MASTER"` from a draft paper is refused with the same status and message as the existing primary-question case.
- [ ] **Step 2:** count `OR: [{ questionId }, { orQuestionId }]` as the OR-edit path at `:200-205` does.
- [ ] **Step 3:** tests pass; commit `fix(papers): bank edits cannot change a finalised paper's OR question`.

### Task 12: "any k of n" arithmetic

**Files:** `src/lib/types.ts:359-454`; tests `src/lib/shared-marks.test.ts`, `src/lib/fractional-part-marks.test.ts`

- [ ] **Step 1: failing tests:**
  - `validateSubPartsSum([{marks:3},{marks:2},{marks:5}], 5, 2) === false` (unequal alternatives are invalid even though the first two sum to 5).
  - `validateSubPartsSum([{marks:5},{marks:5},{marks:5},{marks:5}], 5, 1) === true`.
  - `attemptedSubpartsMarks([{marks:2},{marks:2},{marks:2},{marks:2},{marks:2}], 4) === 8`.
  - `normalizeSubpartMarks([{marks:1},{marks:1},{marks:1},{marks:1}], 2)` → four parts of 0.5.
  - `normalizeSubpartMarks([{marks:0.5},{marks:0.5}], 1.5)` → sum 1.5, every part a multiple of 0.25, none below 0.25.
  - `normalizeSubpartMarks([{marks:1, subparts:[{marks:1},{marks:1}]},{marks:1}], 4)` → `subpartsTotalMarks(result) === 4`.
- [ ] **Step 2:** remove the "sum of first k" acceptance in `validateSubPartsSum`; make `normalizeSubpartMarks` work in ¼ units (`PART_MARK_STEP`), with floor `PART_MARK_STEP` in place of 1, and adjust leaf parts when a part has nested parts.
- [ ] **Step 3:** run the full suite; AI-path tests (`two-stage-generation`, `slot-regeneration`, `school-paper-flow`) must still pass. Where an existing expectation encoded the old rounding, update it and list it in the report.
- [ ] **Step 4:** commit `fix(marks): one rule for "any k of n" and fractional parts`.

### Task 13: Auto-Fill template questions

**Files:** `src/app/api/papers/[id]/autofill/route.ts:204-330, 358-364, 401-430, 502-553`; create `src/lib/templateFiller.ts`, `src/lib/templateFiller.test.ts`

**Interfaces (produced, used by package 5):**

```ts
/** True for a question created from the offline curriculum template (sourceProvenance starts with "TEMPLATE_FALLBACK"). */
export function isTemplateFiller(q: { sourceProvenance?: string | null }): boolean;
```

- [ ] **Step 1: failing tests:** `isTemplateFiller({ sourceProvenance: "TEMPLATE_FALLBACK: offline…" }) === true`; `null`, `undefined`, `"AI"` → `false`.
- [ ] **Step 2:** implement; export a `TEMPLATE_FALLBACK_PROVENANCE` constant and use it in the autofill and `ai-commit-section` routes in place of the repeated string.
- [ ] **Step 3:** in the autofill route, run `subpartsMarksProblem` and `whyCannotAdd` (`src/lib/blueprint.ts:641, 376`) on template questions and on bank-picked OR questions before inserting; apply the Devanagari check at `:310-311` to template OR questions. A question that fails is skipped and counted in the route's response message.
- [ ] **Step 4:** if `sourceProvenance` is not on `QuestionDto`, add it (`src/lib/dto.ts`) so the client can read it.
- [ ] **Step 5:** tests pass; commit `fix(autofill): template questions pass placement checks and are identifiable`.
