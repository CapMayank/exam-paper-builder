# KG Worksheet Studio (phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-column worksheet builder with a three-pane studio (subject-filtered library · live A4 page · editor), rebuild all 14 activity editors on a shared editor kit, and make the number grid count down columns.

**Architecture:** Pure logic (grid placement, library filtering, list splitting) lives in small tested modules under `src/lib/kindergarten/`. A shared editor kit under `src/lib/kindergarten/editor-kit/` gives every plugin editor the same "basic + More options" shape without changing the plugin contract. The studio UI is split into focused components under `src/components/worksheet-studio/`; the route file only mounts it.

**Tech Stack:** Next.js (repo version — read `node_modules/next/dist/docs/` before touching routing), React 19, Tailwind 4, lucide-react, vitest (node env, no DOM).

**Spec:** `docs/superpowers/specs/2026-11-27-kg-worksheet-studio-design.md`

## Global Constraints

- Work on branch `feat/kg-worksheet-studio` (not `main`).
- `KindergartenEditorProps` / `KindergartenPrintProps` signatures unchanged; `QuestionForm.tsx:882` and `QuestionView.tsx:292` must keep working without edits.
- Config shapes only gain optional fields. The only new config field is `NumberGridConfig.fillDirection?: "COLUMN" | "ROW"`.
- Saved number grids without `fillDirection` render as `"ROW"`; new grids default to `"COLUMN"`.
- No API, Prisma, print-route, or `NewWorksheetModal` changes. Saving: debounced 700 ms `PUT /api/papers/[id]/activities/[itemId]` with `{ text, options: [JSON.stringify(config)] }`; marks via `{ marks }` (1–20); move via `{ move: "up" | "down" }`; add via `POST .../activities`; delete via `DELETE`.
- Only one live preview while editing: the studio wraps editors in `EditorPreviewContext.Provider value={false}`; the question bank keeps the editor's own `PreviewBox`.
- Subject → category: English→`english`, Mathematics→`math`, Hindi→`hindi`, General Awareness (EVS)→`evs`, Rhymes & Activities→`general`; unknown → `general`.
- localStorage only for the "show all activities" toggle, key `epb:ws-library-all`, every access in try/catch.

## Review Focus

1. **Old worksheet opened after the change** — a stored grid config with no `fillDirection` must render row-by-row in studio, print and question bank (test in Task 1).
2. **Grid counts that don't fill the last column** (e.g. 1–23 with 5 columns, column mode) — no gaps mid-column, the empty cells sit at the bottom of the last column, borders still close (test in Task 1).
3. **Hindi / EVS worksheet with an empty subject group** — library still offers activities and shows the "coming soon" note, never a blank panel (test in Task 2).
4. **Typing fast then switching selection** — a pending debounced save for activity A must still fire with A's id after the teacher selects B (covered in Task 6, step 3).
5. **Pasting "A, B  C" or "क ख ग" into a list field** — splits on commas and any whitespace, drops empties, keeps Devanagari intact (test in Task 3).

---

### Task 1: Number grid fills down columns

**Files:**
- Create: `src/lib/kindergarten/gridPlacement.ts`
- Test: `src/lib/kindergarten/gridPlacement.test.ts`
- Modify: `src/lib/kindergarten/types.ts` (NumberGridConfig, KindergartenActivityPlugin)
- Modify: `src/lib/kindergarten/registry.ts` (`parseKindergartenConfig`)
- Modify: `src/lib/kindergarten/components/MathSquareGrid.tsx`
- Modify: `src/lib/kindergarten/activities/numberGrid.tsx` (default config, print; editor is rewritten in Task 4)
- Test: `src/lib/kindergarten.test.ts`

**Interfaces:**
- Produces: `type GridDirection = "COLUMN" | "ROW"`; `gridOrder(count: number, columns: number, direction: GridDirection): (number | null)[]` — returns cell indexes in **visual row-major order** (what a CSS grid renders left→right, top→bottom), `null` for empty slots. `MathSquareGrid` gains prop `direction?: GridDirection` (default `"ROW"`).
- Produces: optional plugin field `legacyDefaults?: Partial<TConfig>` — applied only to stored configs: `{ ...fallback, ...legacyDefaults, ...stored }`.

- [ ] **Step 1: Write failing tests** in `gridPlacement.test.ts`:
  - `gridOrder(6, 3, "ROW")` → `[0,1,2,3,4,5]`
  - `gridOrder(6, 3, "COLUMN")` → `[0,2,4,1,3,5]` (rows = 2)
  - `gridOrder(50, 5, "COLUMN")` first row → `[0,10,20,30,40]`; index 9 is at visual position 45
  - `gridOrder(23, 5, "COLUMN")` → length 25, rows 5, last column holds `[20,21,22,null,null]` (visual positions 4,9,14,19,24)
  - `gridOrder(23, 5, "ROW")` → length 23 (no padding)
  - `gridOrder(0, 5, "COLUMN")` → `[]`

  In `kindergarten.test.ts` add:
  - `parseKindergartenConfig("KDG_NUMBER_GRID", JSON.stringify({ startNumber: 1, endNumber: 10, columns: 5, cells: [] }))` has `fillDirection === "ROW"`
  - `parseKindergartenConfig("KDG_NUMBER_GRID", null).fillDirection === "COLUMN"` and `getKindergartenActivity("KDG_NUMBER_GRID")!.defaultConfig().fillDirection === "COLUMN"`
  - Stored `{ fillDirection: "COLUMN", ... }` stays `"COLUMN"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/kindergarten` — expect FAIL (module not found / undefined fillDirection).
- [ ] **Step 3: Implement** `gridOrder` (COLUMN: `rows = ceil(count / columns)`, visual slot `(r, c)` holds index `c * rows + r` if `< count` else `null`; ROW: identity). Add `fillDirection?` to `NumberGridConfig`, `legacyDefaults?` to the plugin interface, apply it in `parseKindergartenConfig` in both stored branches. Number grid: `defaultConfig` sets `fillDirection: "COLUMN"`, plugin sets `legacyDefaults: { fillDirection: "ROW" }`, print passes `direction={config.fillDirection ?? "ROW"}`. `MathSquareGrid` maps `gridOrder(...)` to cells; `null` slots render as an empty bordered cell; edge borders computed from visual position, not cell index.
- [ ] **Step 4: Run** `npx vitest run src/lib/kindergarten` — PASS. Run `npx tsc --noEmit` — no errors.
- [ ] **Step 5: Commit** `feat(worksheets): number grid counts down each column`

### Task 2: Library filtering logic

**Files:**
- Create: `src/lib/kindergarten/library.ts`
- Test: `src/lib/kindergarten/library.test.ts`

**Interfaces:**
- Produces:
  - `subjectCategory(subject?: string | null): KindergartenCategory`
  - `CATEGORY_LABEL: Record<KindergartenCategory, string>` (move from the page: english "English & letters", math "Numbers & maths", hindi "Hindi", evs "Our world", general "Drawing, colouring & fun")
  - `type LibraryGroup = { category: KindergartenCategory; label: string; plugins: KindergartenActivityPlugin[] }`
  - `libraryGroups(opts: { subject?: string | null; showAll: boolean; query: string }): { groups: LibraryGroup[]; comingSoon: boolean }`

- [ ] **Step 1: Write failing tests:**
  - `subjectCategory("Mathematics") === "math"`, `("General Awareness (EVS)") === "evs"`, `("Rhymes & Activities") === "general"`, `("Sanskrit") === "general"`, `(undefined) === "general"`
  - English, showAll false → group categories `["english", "general"]`, `comingSoon: false`
  - Hindi, showAll false → `["english", "general"]` (hindi group omitted while empty), `comingSoon: true`
  - EVS, showAll false → `["general"]`, `comingSoon: true`
  - Rhymes & Activities → `["general"]` exactly once
  - showAll true → subject group first, then remaining non-empty groups in order english, math, general, hindi, evs, no duplicates
  - query `"count"` (any subject, showAll false) → only plugins whose `shortLabel`/`label`/`description` contain it case-insensitively, searching **all** groups; empty groups dropped
  - query matching nothing → `groups: []`
- [ ] **Step 2: Run** `npx vitest run src/lib/kindergarten/library.test.ts` — FAIL.
- [ ] **Step 3: Implement** in `library.ts` using `getAllKindergartenActivities()`. A non-empty query ignores `showAll` and searches everything.
- [ ] **Step 4: Run** the test — PASS.
- [ ] **Step 5: Commit** `feat(worksheets): subject-aware activity library`

### Task 3: Shared editor kit

**Files:**
- Create: `src/lib/kindergarten/editor-kit/index.tsx` (components), `src/lib/kindergarten/editor-kit/splitList.ts`
- Test: `src/lib/kindergarten/editor-kit/splitList.test.ts`
- Modify: `src/lib/kindergarten/activities/_shared.tsx` — keep print helpers (`ActivityFrame`, `Art`, `ShapeGlyph`, `AnswerBox`, `SHAPE_IDS`, `EditorPreviewContext`, `PreviewBox`); re-export the old editor helpers from the kit until Tasks 4–5 remove their last use, then delete them.

**Interfaces (all exported from `editor-kit/index.tsx`):**
- `splitList(raw: string): string[]` — split on commas and whitespace, trim, drop empties.
- `EditorMemoryContext: React.Context<{ isOpen(key: string): boolean; setOpen(key: string, open: boolean): void } | null>`
- `EditorShell({ memoryKey, basic, advanced? }: { memoryKey: string; basic: ReactNode; advanced?: ReactNode })` — basic, then a "More options" disclosure (closed by default; open state from `EditorMemoryContext` when provided, else local state); no disclosure when `advanced` is absent. Editors place their own `PreviewBox` after the shell.
- `Field({ label, hint?, children })`
- `InstructionField({ value, onChange, defaultValue })` — shows "Reset" link when `value !== defaultValue`.
- `NumberStepper({ label, value, min, max, onChange })` — −/+ plus a typed number input clamped to [min, max] on blur.
- `ChoiceChips<T extends string>({ label, value, options: { value: T; label: string }[], onChange })`
- `ToggleRow({ label, checked, onChange, hint? })`
- `TextListField({ label, values, onChange, placeholder? })` — chips with ×, an input that adds via Enter or paste using `splitList`.
- `PicturePicker({ label, clipartId, onChange })` — thumbnail + "Change", opens `ClipartPickerModal`.
- `RowList<T>({ label, rows, onChange, makeRow: () => T, max, renderRow: (row: T, update: (r: T) => void, index: number) => ReactNode, addLabel })` — add (disabled at max), remove, move up/down per row.

- [ ] **Step 1: Write failing tests** for `splitList`: `"A B C"`→`["A","B","C"]`; `"A, B  C"`→`["A","B","C"]`; `" ,, "`→`[]`; `"क ख ग"`→`["क","ख","ग"]`; `"cat,dog\nsun"`→`["cat","dog","sun"]`.
- [ ] **Step 2: Run** `npx vitest run src/lib/kindergarten/editor-kit` — FAIL.
- [ ] **Step 3: Implement** `splitList` and the components. Visual style: label `text-xs font-semibold text-slate-600`, controls match existing `Stepper` look; the disclosure is a full-width button "More options" with a chevron.
- [ ] **Step 4: Run** tests — PASS; `npx tsc --noEmit` — clean; `npx eslint src/lib/kindergarten` — clean.
- [ ] **Step 5: Commit** `feat(worksheets): shared editor kit for activity editors`

### Task 4: Rebuild letter & number editors on the kit

Rewrite editors for **Trace & Write, Number Grid, Missing Letters, Pre-writing, Count Items, Picture Sum, Compare** on `EditorShell` with the basic / More-options split from the spec table. Keep each `PreviewBox` (after the shell) so the question bank still has a preview. Print components untouched except Number Grid's (done in Task 1).

**Files:** Modify `src/lib/kindergarten/activities/{traceWrite,numberGrid,missingLetters,preWriting,countItems,pictureSum,compare}.tsx`

**Interfaces:** Consumes the kit (Task 3); `memoryKey` = the plugin's `type`.

- [ ] **Step 1:** Number Grid editor: basic = instruction, from/to `NumberStepper`s (1–100), blanks `ChoiceChips` (None / Every 2nd / Every 3rd / All but first), presets; More options = columns `ChoiceChips` (5 / 10), direction `ChoiceChips` ("↓ Down columns" `COLUMN` / "→ Across rows" `ROW`), click-to-toggle cell grid laid out with `gridOrder` in the chosen direction. Changing from/to/columns keeps the current blank pattern (today it resets to Alternate — fix) and keeps `fillDirection`. Presets set `fillDirection: "COLUMN"`.
- [ ] **Step 2:** The other six editors per the spec table.
- [ ] **Step 3: Run** `npx tsc --noEmit` and `npx vitest run` — all pass.
- [ ] **Step 4: Browser check** in the question bank KG form (create a KG question of each type): every editor renders, basic edits change the preview, "More options" opens and edits apply.
- [ ] **Step 5: Commit** `refactor(worksheets): letter and number editors use the editor kit`

### Task 5: Rebuild picture & drawing editors on the kit

Same as Task 4 for **Picture Match, Circle Target, Sequence Chain, Pattern, Colour, Join Dots, Tick Picture**. Picture Match's line canvas and Circle Target's per-item picking stay custom inside `RowList` rows.

**Files:** Modify `src/lib/kindergarten/activities/{pictureMatch,circleTarget,sequenceChain,pattern,colourPicture,joinDots,tickPicture}.tsx`; Modify `activities/_shared.tsx` (delete the editor helpers now unused: `InstructionField`, `EditorSection`, `Stepper`, `RemoveButton`, `AddRowButton`, `ClipartChip` — `grep` first).

- [ ] **Step 1:** Rewrite the seven editors per the spec table.
- [ ] **Step 2:** Remove unused `_shared` editor helpers; `grep -rn "EditorSection\|AddRowButton\|ClipartChip\|RemoveButton" src` returns only kit internals.
- [ ] **Step 3: Run** `npx tsc --noEmit`, `npx eslint src`, `npx vitest run` — all pass.
- [ ] **Step 4: Browser check** as in Task 4 for these seven.
- [ ] **Step 5: Commit** `refactor(worksheets): picture and drawing editors use the editor kit`

### Task 6: Studio layout

**Files:**
- Create in `src/components/worksheet-studio/`: `WorksheetStudio.tsx` (data + state), `ActivityLibrary.tsx`, `WorksheetCanvas.tsx`, `ActivityInspector.tsx`, `DetailsModal.tsx` (moved verbatim from the page), `useActivityDrafts.ts`
- Modify: `src/app/(app)/worksheets/[id]/page.tsx` → only `const { id } = use(params); return <WorksheetStudio id={id} />;`

**Interfaces:**
- `type Activity = { item: PaperItem; section: Section; plugin: KindergartenActivityPlugin }` exported from `WorksheetStudio.tsx`.
- `useActivityDrafts(paperId: string, subject?: string): { draftFor(a: Activity): { text: string; config: any }; edit(a: Activity, patch: Partial<{ text: string; config: any }>): void; saving: boolean; error: string | null }` — per-item 700 ms debounce timers keyed by `item.id` (today's `editActivity`), flushed on unmount.
- `ActivityLibrary({ subject, busy, onAdd(plugin) })` — uses `libraryGroups`; search input; "All activities" switch (persisted at `epb:ws-library-all`); "coming soon" note when `comingSoon`.
- `WorksheetCanvas({ activities, selectedId, onSelect(id | null), draftFor, emptyState })` — A4 sheet `max-w-[720px]`, each activity a `button`-role wrapper (keyboard Enter selects) rendering `renderPrint` with `numberLabel={`${idx+1}.`}` and `marks`; selected = `ring-2 ring-indigo-500 bg-indigo-50/40`; footer count + total marks + the >7 warning.
- `ActivityInspector({ activity, index, total, draft, onEdit, onMarks(n), onMove(dir), onRemove })` — empty hint when `activity` null; else header, editor inside `EditorPreviewContext.Provider value={false}`, footer marks stepper (1–20), ↑ ↓ delete.
- `WorksheetStudio` provides `EditorMemoryContext` (a `Record<string, boolean>` in state).

- [ ] **Step 1:** Build the components. Layout: `grid lg:grid-cols-[16rem_minmax(0,1fr)_22rem] gap-4`; library and inspector `lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] overflow-y-auto`. Below `lg`: library in a `<details>` "Add activity" above the page, inspector below the page. Escape (when focus is not in an input) clears selection. Adding selects the new item and scrolls it into view. Removing the selected item clears selection.
- [ ] **Step 2:** Replace the route body; keep the non-worksheet redirect, loading and error states from today's page.
- [ ] **Step 3: Pending-save check:** type in activity A's instruction, immediately click activity B; in the network panel the PUT goes to A's item id with A's text.
- [ ] **Step 4: Run** `npx tsc --noEmit`, `npx eslint src`, `npx vitest run` — all pass.
- [ ] **Step 5: Commit** `feat(worksheets): three-pane worksheet studio`

### Task 7: End-to-end check

- [ ] **Step 1:** Start the dev server via the preview tool. Create a Nursery English worksheet: library shows English + Fun only; search "count" finds Count Items; toggle "All" shows maths; reload keeps the toggle.
- [ ] **Step 2:** Add each of the 14 activities, edit basic + More options on each, watch the page update; marks, move, delete work; "Saved" indicator settles.
- [ ] **Step 3:** Number Grid 1–50, 5 columns: first column reads 1–10 top to bottom. Switch to "Across rows": first row 1–5. Print preview matches.
- [ ] **Step 4:** Open a worksheet created before this branch that has a number grid — still row-by-row, everything else looks the same as on `main`.
- [ ] **Step 5:** Hindi and EVS worksheets show the "coming soon" note and a non-empty library. Narrow the window below `lg`: panes stack and are usable.
- [ ] **Step 6:** Screenshot the studio for the hand-off.
