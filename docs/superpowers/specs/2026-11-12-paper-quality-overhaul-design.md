# Paper quality overhaul: design

Date: 2026-11-12. Status: approved in chat by the owner; this file is the written record.

## Goal

A teacher builds a paper without guessing which modal, type or chapter to use, and the
printed paper, Word export and answer key never show confusing marks, unwanted
instruction lines, or content the teacher did not intend.

Success means:

- "Any k of n" questions show marks once, on the question line.
- Every numbered question prints its marks.
- No instruction text prints unless the teacher typed it.
- One add/edit question modal with one type control and a visible chapter.
- The paper workbench shows each action and each fact once.
- The bugs listed in packages 2 and 5 are fixed, each with a regression test.

## Ground rules for every package

- Next.js 16.4.1 with breaking changes: read the relevant guide in
  `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).
- Test first. Unit tests: `npm test` (Vitest, `src/**/*.test.ts`, node environment).
  Typecheck: `npx tsc --noEmit`. Lint: `npm run lint`. All three must pass.
- There are no React render tests. Put rules in pure functions under `src/lib` and test
  those; keep components thin.
- The bug descriptions come from reading code. Reproduce each one (failing test or in
  the running app) before fixing it. If it does not reproduce, report that and skip it.
- Do not change the database schema unless a package says so.
- Paths: `PAPER` = `src/app/(app)/papers/[id]/page.tsx`, `SHEETS` =
  `src/components/PaperSheets.tsx`, `QV` = `src/components/QuestionView.tsx`,
  `DOCX` = `src/lib/paperDocx.ts`, `SOL` = `src/app/papers/[id]/solutions/page.tsx`,
  `FORM` = `src/components/QuestionForm.tsx`, `PICKER` = `src/components/QuestionPicker.tsx`.

## Package 1: print fixes

One shared rule decides what marks a question and its parts print, used by all four
renderers (print `SHEETS`/`QV`, builder preview, `DOCX`, `SOL`).

### Marks rules

1. **Alternatives.** When `attemptCount < parts.length` ("any k of n"), part marks never
   print. The question line prints the total from `questionSlotMarks`
   (`src/lib/blueprint.ts:578`).
2. **Compulsory parts.** Each part prints its marks; the question line prints the total.
   Remove the dense rule that hides uniform part marks (`QV:137, 255, 404`;
   `hasUniformSubpartMarks` in `src/lib/compactLayout.ts`).
3. **Every numbered question prints marks.** Remove `hideQuestionMarks`
   (`SHEETS:582-593`, uses at `:660, :715`) and `statesMarksEach` if it becomes unused.
4. **OR pairs.** Marks print once on the first question's line in every marks style
   (today INLINE prints them after the alternative, `QV:544-545`; `DOCX:744, 978-986`).
   Parts inside an OR body follow rules 1 and 2.
5. **Marks style.** `SUPPRESSED` stays as a deliberate setting. `DOCX` must honour the
   paper's marks style. The empty-value fallback is `INLINE` everywhere, matching the
   database default (`SHEETS:652, 681, 709`; `PAPER:2079`; `QV:469`).
6. **Grouped objective exercises** keep one formula on the exercise line and no marks
   per item.
7. **Typed lists.** `detectAttemptCount` (`src/lib/subpartExtractor.ts:32-64`) recognises
   "किसी एक", "कोई एक", "(कोई एक)" and "any one" as 1. Renderers read the
   `attemptCount` that `decomposeForSlot` returns.
8. **Answer key total** uses `questionSlotMarks`, not `subpartsTotalMarks`
   (`SOL:152-157`); the OR total in `DOCX:951-960` uses the same helper.

### Instruction rules

1. Delete the automatic per-question line: `TYPE_INSTRUCTION` and the fallback in
   `questionInstruction` (`src/lib/sectionTypes.ts:106-129`). Only a non-empty
   `PaperItem.instruction` prints.
2. An empty section instruction prints nothing. Remove the `getSharedInstruction`
   fallback in the print path (`SHEETS:375-387, 418-422`,
   `reconcileSectionGroupInstruction` in `src/lib/layout.ts:451-480`) and in
   `resolveGroupedExerciseInstruction` (`layout.ts:487-516`).
3. Translation of a teacher-typed instruction is unchanged.
4. Type sub-headings in multi-type sections and paper-level General Instructions stay.

### Grouped sections and numbering

1. Grouped objective sections print the OR question, parts and per-item instruction, and
   print options for any MCQ-like item regardless of section type (`SHEETS:514-580`).
2. One helper for the section letter, used by `PAPER:1965`, `SHEETS:71`,
   `layout.ts:261`, `SOL:129`, the OMR page and `DOCX:529`.
3. The workbench shows the same question numbers as print
   (`computeDisplayedPaperNumbering`, `layout.ts:233`).

Tests to update: `compactLayout.test.ts`, `sectionTypes.test.ts:79-88`,
`docx-export-audit.test.ts:275-282`.

## Package 2: broken features and server-side safety

1. **Quick Swap.** Client reads the array the siblings route returns
   (`PAPER:410-413`) and swaps through `PATCH {replaceWithQuestionId}`
   (`PAPER:426-429`).
2. **Diagram edits.** Add `imagePath` to `questionPatchSchema` (`src/lib/schemas.ts:193`)
   and set it in the route (`src/app/api/questions/[id]/route.ts:39-49`). Add error
   handling to the two callbacks (`PAPER:2799-2807, 2825-2839`).
3. **Paper language.** An explicit stored language wins over detection
   (`src/lib/localization/index.ts:193-216`); detection applies only when none is set.
   The workbench stops overwriting the choice (`PAPER:256, 267-306`).
4. **Autosave.** Saves only after a real edit by a user who can edit; never writes a
   fallback session; an empty title or school name does not discard the other fields.
5. **Finalised papers.** The "used in a FINAL paper" guard counts `orQuestionId` as well
   as `questionId` (`src/app/api/papers/[id]/questions/[itemId]/route.ts:267-269`).
6. **"Any k of n" arithmetic.** `attemptedSubpartsMarks` and `validateSubPartsSum`
   (`src/lib/types.ts:359-388`) agree: with k < n all parts must carry equal marks and
   the total is k × that value.
7. **`normalizeSubpartMarks`** (`types.ts:395-454`) keeps ¼ steps, never rounds a part
   up to 1, and handles nested parts.
8. **Auto-Fill template questions** pass the same placement checks as bank questions
   and are marked so package 5 can flag them (`autofill/route.ts:204-330, 358-364,
   401-430, 502-553`).

## Package 3: one question modal

Restructure `PICKER` and `FORM` in place. The same shell serves add, replace, OR, edit
on the paper, and new/edit in the bank.

1. **Type.** One control. Chips when the section allows more than one type; otherwise
   the type appears only in the title. The disabled dropdown is not rendered when the
   type is fixed. The bank form keeps one enabled dropdown. The pre-primary tile grid
   respects the type lock.
2. **Chapter.** Always visible and editable. Pre-filled by `assignChapter` and labelled
   "suggested" until the teacher changes it. On a paper it lists only the blueprint's
   chapters; for an OR it stays locked to the main question's chapter.
3. **Sources.** Three tabs: From bank, Write, Generate with AI. "Paste several" is a
   button inside Write and uses the selected type.
4. **Opening tab.** Bank when at least one bank question fits the slot, otherwise
   Write. Replace and OR always open on Bank. The last-used-tab preference is removed.
5. **Form order.** Question, sub-questions, answer. Figure, difficulty, skill, answer
   space, passage group and translation sit in one collapsed "More details" row whose
   summary shows the current difficulty and skill.
6. **Edit.** The title shows the question's own type. The syllabus-component and
   printed-instruction fields from the workbench row move into this modal.
7. **Vocabulary.** Difficulty is Easy / Average / Difficult and skill is the four
   `SKILLS` everywhere, including the picker's bank and AI tabs, paste, AI Fill and the
   bank's AI tool.
8. **Bugs.** The AI tab gets a skill control and saves `cognitiveLevel`; the bank's AI
   tool drops the non-existent "Numerical" type and passes marks and skill through;
   the out-of-date e2e selector in `tests/e2e/mandatory-workflows.spec.ts` is fixed.

AI Fill for a section, bulk import and whole-paper AI stay separate tools.

## Package 4: workbench declutter (`PAPER`)

1. One button per level: whole-paper actions in the header, section actions in the
   section header, an empty slot shows only "Add question". The two notice buttons that
   both call `handleAutofill` are removed.
2. One status line per section: "x/y questions · m/M marks" plus one warning on
   mismatch. Remove the duplicate badges and the sub-line total.
3. Per-question row: Edit, Replace, OR, Delete. Diagram, page break, move and Quick
   Swap go in a "More" menu. The per-question marks badge is removed (marks are in the
   question body).
4. Remove always-visible helper text; the onboarding card shows only on an empty paper;
   delete the "Smart Auto-Fill" tip.
5. Errors show once (banner or toast, not both).
6. Confirm before deleting a question or unlinking an OR.
7. Delete the unused duplicate-set modal and handler (`PAPER:490-510, 2688-2742`).

## Package 5: pre-finalise checks

1. A paper is complete only when slots are full and marks equal the paper total.
   Finalise is blocked on a marks mismatch, in `src/lib/preflight.ts` and in
   `finaliseBlocker` (`src/lib/papers.ts:279-288`).
2. Preflight also reports: empty question or part text (tags stripped), duplicates that
   involve OR questions or the same question id, missing answers on OR questions,
   template-filler questions, chapters outside the blueprint, and leftover placeholder
   text such as "[Enter statement here]".
3. The preflight modal's jump buttons work (`PAPER:2853-2861` passes
   `onJumpToQuestion` and `onGoToTab`) and each error has its own heading.
4. An incomplete paper prints with a visible "DRAFT" mark in print and Word export.
5. "Auto-generate instructions" builds its text from the paper's real sections and
   numbering, and mentions internal choice only when the paper has it.
6. The form refuses to save default placeholder text unchanged.

## Order

Packages 1 and 2 run in parallel in separate worktrees, then merge. Packages 3, 4 and 5
run one after another because they all edit `PAPER`. Each package gets an independent
review and a check in the running app before the next starts.

## Not in this round

Snapshot restore without validation, the print page's Auto-Fit and `targetPages`
behaviour, hard-coded school emblem text and date format, the stale match-column key.
