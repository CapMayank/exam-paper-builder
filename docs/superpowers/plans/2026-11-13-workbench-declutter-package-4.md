# Workbench Declutter (Package 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The paper workbench shows each action and each fact once: one status line per section, four visible actions per question, errors in one place, and a confirmation before anything is removed.

**Architecture:** All changes are in the workbench page `src/app/(app)/papers/[id]/page.tsx` plus one small new menu component. The wording rules (section status line, the one warning, which row actions exist) move to pure functions in `src/lib/workbenchView.ts`, which carry the unit tests. No server changes.

**Tech Stack:** Next.js 16.4.1 (App Router), React 19, TypeScript 5, Tailwind v4, Vitest 5 (node environment, `src/**/*.test.ts`), Playwright for e2e.

**Spec:** `docs/superpowers/specs/2026-11-12-paper-quality-overhaul-design.md`, section "Package 4: workbench declutter (`PAPER`)".

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (`AGENTS.md`).
- Test first. There are no React render tests: rules go in pure functions under `src/lib` and are tested there.
- Pass bar per task: `npm test` passes; `npx tsc --noEmit` shows no errors under `src/` (two known errors in generated `.next/types/validator.ts` are ignored); eslint shows no new problems on touched files (compare counts with HEAD: `git show HEAD:<path> | npx eslint --stdin --stdin-filename <path> -f json`).
- No server route changes, no database schema change, no new dependencies.
- Nothing a teacher can do today becomes impossible: every removed button's action stays reachable from the place this plan names.
- A finalised paper, or a user who cannot edit, sees no action that changes the paper (same guards as today: `canEditPaper`, `final`).
- Difficulty is shown through `difficultyLabel` (`src/lib/questionModal.ts`); type through `typeLabel` (`src/lib/sectionTypes.ts`). Say "OR question" and "main question", never "alternate" or "primary".
- Tests must not leave rows in the dev database.
- End every commit message with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- `PAPER` = `src/app/(app)/papers/[id]/page.tsx`. Its line numbers below are from commit `8c6609f` and shift as tasks land: find code by the names given.

## Review Focus

1. **An action fails far down the page.** The teacher must still see the error where they are (a toast), once. (Task 2.)
2. **Confirm, then cancel.** Cancelling "Remove question" or "Remove OR question" changes nothing and sends no request. (Task 2.)
3. **Keyboard and outside click on the More menu.** Esc and a click outside close it; Tab reaches every item; an item that opens something (Quick Swap, a modal) closes the menu first. Only one row's menu is open at a time. (Task 5.)
4. **First and last question in a section.** Move up is disabled on the first, Move down on the last, and both while a move is in flight. (Task 1 test `rowMenuItems`; Task 5 wiring.)
5. **Unusual sections.** A match-the-column section with one question holding all pairs, a question whose sub-parts fill several slots, an overfilled section, and a section whose placed marks differ from its total each get a correct status line and exactly one warning. (Task 1 tests.)
6. **View-only and finalised papers.** No Edit/Replace/OR/Delete/More and no Add question; the status line and question content still show. (Task 1 test `rowActions`; Tasks 4 and 5.)

---

### Task 1: Workbench wording and action rules as pure functions

**Files:**
- Create: `src/lib/workbenchView.ts`
- Test: `src/lib/workbenchView.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:

```ts
export function sectionStatusLine(a: {
  type: string; count: number; filledUnits: number; itemCount: number;
  placedMarks: number; targetMarks: number; matchPairs?: number;
}): string;
/** The single warning for a section, or null. Overfill wins over a marks mismatch. */
export function sectionWarning(a: { count: number; filledUnits: number; placedMarks: number; targetMarks: number }): string | null;
export type ChoicePolicy = "MANDATORY_EVERY_SLOT" | "FORBIDDEN" | "OPTIONAL";
export function choicePolicyNote(policy: ChoicePolicy | undefined, forbidden: boolean): string; // "" when nothing to say
export type RowAction = "edit" | "replace" | "or" | "delete" | "more";
export function rowActions(a: { canEdit: boolean; hasOr: boolean; orForbidden: boolean }): RowAction[];
export type RowMenuItem = { key: "addDiagram" | "changeDiagram" | "editDiagram" | "previewDiagramBw" | "removeDiagram" | "pageBreak" | "moveUp" | "moveDown" | "quickSwap"; label: string; disabled?: boolean };
export function rowMenuItems(a: { hasFigure: boolean; pageBreakBefore: boolean; index: number; total: number; moving: boolean }): RowMenuItem[];
export type OrMenuItem = { key: "editOr" | "changeOr" | "removeOr"; label: string };
/** [] when the slot has no OR question (the OR button then adds one directly). */
export function orMenuItems(hasOr: boolean): OrMenuItem[];
```

Rules the signatures do not decide:
- `sectionStatusLine`: `"{filledUnits}/{count} questions · {placedMarks}/{targetMarks} marks"`. Exceptions for the first half only: a `MATCH_COLUMN` section with exactly one item → `"1 question ({matchPairs} pairs)"`; any other section with exactly one item that fills more than one slot (`filledUnits > 1`) → `"1 question ({filledUnits} parts)"`; a `MATCH_COLUMN` section with no item → `"0/1 question ({count} pairs)"`. Marks print without trailing zeros (`2.5`, not `2.50`).
- `sectionWarning`: `filledUnits > count` → `"{n} more than this section holds"` (n = the excess); else `placedMarks !== targetMarks` and `filledUnits >= count` → `"Placed marks ({placed}) do not match the section total ({target})"`; else `null`. A section that is simply not full yet has no warning.
- `choicePolicyNote`: `MANDATORY_EVERY_SLOT` → `"OR on every question"`; `forbidden` true → `"No OR questions"`; otherwise `""`.
- `rowActions`: `canEdit` false → `[]`. Otherwise `["edit", "replace", "or", "delete", "more"]`, without `"or"` when `orForbidden && !hasOr` (an existing OR that the blueprint forbids must still be removable, so `"or"` stays when `hasOr`).
- `rowMenuItems`, in this order: with a figure `Change diagram`, `Edit diagram`, `Preview diagram in black & white`, `Remove diagram`; without one `Add diagram`; then `Add page break before` or `Remove page break` ; `Move up` (disabled when `index === 0` or `moving`); `Move down` (disabled when `index === total - 1` or `moving`); `Quick Swap`.
- `orMenuItems(true)`: `Edit OR question`, `Change OR question`, `Remove OR question`.

- [ ] **Step 1: Write the failing tests.** Required cases:

```ts
expect(sectionStatusLine({ type: "SHORT", count: 4, filledUnits: 1, itemCount: 1, placedMarks: 3, targetMarks: 12 })).toBe("1/4 questions · 3/12 marks");
expect(sectionStatusLine({ type: "MATCH_COLUMN", count: 5, filledUnits: 5, itemCount: 1, placedMarks: 5, targetMarks: 5, matchPairs: 5 })).toBe("1 question (5 pairs) · 5/5 marks");
expect(sectionStatusLine({ type: "MATCH_COLUMN", count: 5, filledUnits: 0, itemCount: 0, placedMarks: 0, targetMarks: 5 })).toBe("0/1 question (5 pairs) · 0/5 marks");
expect(sectionStatusLine({ type: "FILL_BLANK", count: 4, filledUnits: 4, itemCount: 1, placedMarks: 4, targetMarks: 4 })).toBe("1 question (4 parts) · 4/4 marks");
expect(sectionStatusLine({ type: "SHORT", count: 2, filledUnits: 1, itemCount: 1, placedMarks: 2.5, targetMarks: 5 })).toBe("1/2 questions · 2.5/5 marks");
expect(sectionWarning({ count: 4, filledUnits: 2, placedMarks: 6, targetMarks: 12 })).toBeNull();
expect(sectionWarning({ count: 4, filledUnits: 6, placedMarks: 18, targetMarks: 12 })).toBe("2 more than this section holds");
expect(sectionWarning({ count: 4, filledUnits: 4, placedMarks: 10, targetMarks: 12 })).toBe("Placed marks (10) do not match the section total (12)");
expect(sectionWarning({ count: 4, filledUnits: 4, placedMarks: 12, targetMarks: 12 })).toBeNull();
expect(choicePolicyNote("MANDATORY_EVERY_SLOT", false)).toBe("OR on every question");
expect(choicePolicyNote("FORBIDDEN", true)).toBe("No OR questions");
expect(choicePolicyNote("OPTIONAL", false)).toBe("");
expect(rowActions({ canEdit: false, hasOr: true, orForbidden: false })).toEqual([]);
expect(rowActions({ canEdit: true, hasOr: false, orForbidden: false })).toEqual(["edit", "replace", "or", "delete", "more"]);
expect(rowActions({ canEdit: true, hasOr: false, orForbidden: true })).toEqual(["edit", "replace", "delete", "more"]);
expect(rowActions({ canEdit: true, hasOr: true, orForbidden: true })).toContain("or");
expect(rowMenuItems({ hasFigure: false, pageBreakBefore: false, index: 0, total: 3, moving: false }).map((i) => i.key)).toEqual(["addDiagram", "pageBreak", "moveUp", "moveDown", "quickSwap"]);
const first = rowMenuItems({ hasFigure: false, pageBreakBefore: false, index: 0, total: 3, moving: false });
expect(first.find((i) => i.key === "moveUp")!.disabled).toBe(true);
expect(first.find((i) => i.key === "moveDown")!.disabled).toBeFalsy();
const last = rowMenuItems({ hasFigure: true, pageBreakBefore: true, index: 2, total: 3, moving: false });
expect(last.map((i) => i.key).slice(0, 4)).toEqual(["changeDiagram", "editDiagram", "previewDiagramBw", "removeDiagram"]);
expect(last.find((i) => i.key === "pageBreak")!.label).toBe("Remove page break");
expect(last.find((i) => i.key === "moveDown")!.disabled).toBe(true);
expect(rowMenuItems({ hasFigure: false, pageBreakBefore: false, index: 1, total: 3, moving: true }).filter((i) => i.disabled).map((i) => i.key)).toEqual(["moveUp", "moveDown"]);
expect(orMenuItems(false)).toEqual([]);
expect(orMenuItems(true).map((i) => i.key)).toEqual(["editOr", "changeOr", "removeOr"]);
```

- [ ] **Step 2: Run** `npx vitest run src/lib/workbenchView.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `src/lib/workbenchView.ts` with the signatures and rules above.
- [ ] **Step 4: Run** the same command (PASS), then `npm test`.
- [ ] **Step 5: Commit** `feat(workbench): pure rules for status lines and row actions`.

---

### Task 2: Errors once, confirm before removing, dead duplicate-set modal

**Files:**
- Modify: `PAPER` (error effect `:169-174`, top banner `:980`, `call` `:509-518`, Remove OR `:2104-2121`, Remove question `:2337-2350`, duplicate-set state/handler/modal `:195`, `:465-485`, `:2585-2640`)

**Interfaces:**
- Consumes: `useConfirm()` and `useToast()` from `src/components/ui.tsx` (`const confirm = useConfirm(); if (!(await confirm({ title, tone: "danger" }))) return;` — read its `ConfirmOptions` for the available fields).
- Produces: two page-local handlers later tasks call: `removeQuestion(item)` and `removeOrQuestion(item)`.

- [ ] **Step 1: Errors show once.** An action error is shown as a toast only (it is visible wherever the teacher has scrolled). Delete the `<ErrorBanner message={error} />` that sits under the header (`:980`). Keep the full-page error shown when the paper itself fails to load (`:531-533`). Check that nothing else renders `error` a second time, and that `setError(null)` calls no longer leave a stale toast (a toast is fired once per new message; setting the same message twice in a row must still show it the second time — if the current effect cannot do that, call `toast.error` where `setError` is called and drop the state for action errors).
- [ ] **Step 2: Confirm before removing.** `removeQuestion(item)`: `confirm({ title: "Remove this question from the paper?", message: "It stays in the question bank.", confirmLabel: "Remove", tone: "danger" })`, then the existing DELETE. `removeOrQuestion(item)`: `confirm({ title: "Remove the OR question from this slot?", message: "It stays in the question bank.", confirmLabel: "Remove", tone: "danger" })`, then the existing `PATCH { orQuestionId: null }`. Use the field names `ConfirmOptions` really has. Wire the two existing buttons to these handlers; cancel sends no request.
- [ ] **Step 3: Delete the unused duplicate-set modal.** Confirm with grep that `setDuplicatingSet(true)` is never called. If so delete the `duplicatingSet` state, `handleDuplicateSet`, its form state, and the `{duplicatingSet && (<Modal title="Generate Parallel Exam Set" …>)}` block, plus imports that become unused. If something does open it, leave it and report that instead.
- [ ] **Step 4: Verify.** `npx tsc --noEmit`, eslint count on `PAPER` not higher than HEAD, `npm test`.
- [ ] **Step 5: Commit** `fix(workbench): one error message, confirm before removing, drop dead set modal`.

---

### Task 3: One button per level, less standing text

**Files:**
- Modify: `PAPER` (header actions `:947-969`, notice buttons `:1599-1628`, onboarding card `:1666-1760`, tip `:2446-2454`, any always-visible helper paragraphs in the workbench column)

**Interfaces:** consumes and produces nothing for other tasks.

- [ ] **Step 1: Whole-paper actions live in the header only.** Keep `Generate with AI` and `Bank Auto-Fill` in the header. Delete the two buttons in the "paper not complete" notice that call `handleAutofill` (`Auto-Fill Missing Slots`, `Auto-Fix Internal Choices`); the notice keeps its text and its Details toggle. If the notice mentions fixing OR questions, its text ends with `Use Bank Auto-Fill above to fix these.` so the action is still discoverable.
- [ ] **Step 2: Onboarding only on an empty paper.** The "Welcome to your Exam Paper Workbench" card already shows only when `paper.items.length === 0`; keep that and its dismiss button. Shorten it to the heading, one sentence naming the blueprint and total marks, and the three numbered steps as single lines without sub-paragraphs.
- [ ] **Step 3: Delete the "Smart Auto-Fill" tip** under the last section (no button of that name exists).
- [ ] **Step 4: Remove always-visible helper text** in the workbench column: sentences that only explain what a visible, labelled control does. Move the explanation to that control's `title` when it has none. List in the report every sentence removed and where its meaning went. Do not touch the Quotas & Progress panel, Print Setup, Toolkit or the live preview.
- [ ] **Step 5: Verify** (`tsc`, eslint count, `npm test`) and **commit** `feat(workbench): whole-paper actions in the header only; shorter onboarding`.

---

### Task 4: Section header — one status line; empty slot — one button

**Files:**
- Modify: `PAPER` (section header `:1780-1857`, section actions `:1859-1905`, empty slot `:2372-2432`)

**Interfaces:**
- Consumes: `sectionStatusLine`, `sectionWarning`, `choicePolicyNote` (Task 1); `typeLabel` (`src/lib/sectionTypes.ts`).
- Produces: nothing for later tasks.

- [ ] **Step 1: One status line.** Under the section title show a single line of text: `sectionStatusLine(...)`, then ` · {typeLabel(s.type)} · {s.marksEach} mark(s) each`, then ` · {choicePolicyNote(...)}` when it is not empty, then the existing `slotPlanSummary(s)` in brackets when present. Colour the first part amber when the section is not full, emerald when full, red when overfilled (as the old badge did). Delete the two badges (questions, marks), the three internal-choice badges and the old sub-line (`{type} · {count} slot(s) × {marksEach} mark(s) = {total} marks`). The MPBSE reason that was the forbidden badge's `title` becomes the `title` of the status line.
- [ ] **Step 2: One warning.** When `sectionWarning(...)` is not null, show it once, in amber (red for overfill), on its own line under the status line. Delete the inline "⚠ Placed marks … do not match target" span.
- [ ] **Step 3: Section actions.** Keep `Add Question`, `AI Fill`, `Auto-Fill` and Collapse/Expand in the section header exactly as today (same guards).
- [ ] **Step 4: Empty slot.** An empty slot shows `Empty slot {n} of {count}` (the match-column wording stays) and one button, `Add question`. Delete the slot's own `AI Fill` button and its marks and type chips (both are in the section's status line). Keep the "Under-covered: Ch …" hint.
- [ ] **Step 5: e2e.** `tests/e2e/mandatory-workflows.spec.ts` uses the empty slot's `Add question` button and section text; update any selector this task breaks. Run `npx playwright test tests/e2e/mandatory-workflows.spec.ts -g "Slot"` if the environment can; the known failing assertion at about line 381 (`toBeDisabled`) is not part of this task — report the result, do not chase it.
- [ ] **Step 6: Verify** (`tsc`, eslint count, `npm test`) and **commit** `feat(workbench): one status line per section; empty slot shows one button`.

---

### Task 5: Question row — Edit, Replace, OR, Delete, More

**Files:**
- Create: `src/components/RowMenu.tsx`
- Modify: `PAPER` (row badges `:2049-2070`, row toolbar `:2072-2352`, Quick Swap popover `:2211-2300`, page-break strip `:1957-1975`)
- Modify: `tests/e2e/mandatory-workflows.spec.ts:311` (`button[title="Move question down"]`)

**Interfaces:**
- Consumes: `rowActions`, `rowMenuItems`, `orMenuItems`, `RowMenuItem` (Task 1); `removeQuestion`, `removeOrQuestion` (Task 2).
- Produces:

```tsx
/** A small button that opens a list of actions. Closes on Esc, outside click, and after an item is chosen. */
export function RowMenu(props: {
  label: string;                 // visible button text, e.g. "More" or "OR"
  ariaLabel?: string;
  items: { key: string; label: string; disabled?: boolean; danger?: boolean }[];
  onSelect: (key: string) => void;
  open: boolean;                 // controlled, so the page keeps only one menu open
  onOpenChange: (open: boolean) => void;
  buttonClassName?: string;
}): JSX.Element;
```

`RowMenu` renders `button[aria-haspopup="menu"][aria-expanded]` and a `div[role="menu"]` of `button[role="menuitem"]`; arrow keys move between items, Esc closes and returns focus to the button. It holds no state of its own beyond focus.

- [ ] **Step 1: Build `RowMenu`** as specified, styled like the existing small popovers on the page.
- [ ] **Step 2: Row badges.** Delete the per-question marks badge (marks are in the question body). Keep the "Exhausted Question" flag, the difficulty and chapter badges, and the "Internal Choice (Ch n)" badge reworded to `OR question · Ch {n}`.
- [ ] **Step 3: Visible actions.** Render the actions `rowActions(...)` returns, in that order: `Edit`, `Replace`, `OR`, the trash icon button (`aria-label="Remove question from paper"`, calls `removeQuestion`), `More`.
  - `OR`: with no OR question it is a plain button `Add OR` that opens the picker in OR mode (as `+ OR Choice` does today). With an OR question it is a `RowMenu` labelled `OR` with `orMenuItems(true)`: Edit OR question → the edit modal on the OR target; Change OR question → the picker in OR mode; Remove OR question → `removeOrQuestion`. The red "Forbidden Choice" flag stays beside it when the blueprint forbids an OR that exists.
  - `More`: a `RowMenu` with `rowMenuItems(...)`. Wire each key to the handler its old button used (diagram modal, Figure Studio, B&W preview toggle, remove diagram, `handleTogglePageBreak`, `handleMoveQuestion`, `handleOpenQuickSwap`).
  - Delete the old inline buttons these replace, including the diagram button group and the move up/down pair.
- [ ] **Step 4: Quick Swap.** Choosing Quick Swap closes the menu and opens the existing "Sibling Questions" popover anchored where the More button is. Its contents and behaviour are unchanged.
- [ ] **Step 5: One menu at a time.** One piece of page state names the open menu (`{ itemId, kind: "more" | "or" } | null`). Opening one closes any other; opening a modal or the Quick Swap popover closes it.
- [ ] **Step 6: Page-break strip.** The "Forced Page Break" strip above a question keeps its own remove button (it is the visible fact, not a duplicate action).
- [ ] **Step 7: e2e.** The reorder test clicks `button[title="Move question down"]`: update it to open the row's `More` menu and choose `Move down`. Run that test if the environment can; report the result.
- [ ] **Step 8: Verify** (`tsc`, eslint counts on `PAPER` and `RowMenu.tsx`, `npm test`) and **commit** `feat(workbench): four actions per question, the rest under More`.

---

## After the tasks

The controller checks in the running app (`preview_start {name:"dev"}`, Browser pane shown): section status line and warning on a part-filled, a full and a mismatched section; an empty slot; the row's Edit / Replace / OR / Delete / More; every More item (diagram, page break, move, Quick Swap); confirm-and-cancel on Delete; an error from a failed action shown once; a finalised paper showing no actions. Then a whole-branch review.
