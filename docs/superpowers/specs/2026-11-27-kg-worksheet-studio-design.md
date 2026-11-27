# Nursery–KG Worksheet Studio — design

Date: 2026-11-27
Status: draft for approval (phase 1 in full; phases 2–4 outlined, each gets its own design before building)

## Intent

Teachers build Nursery / LKG / UKG worksheets on `/worksheets/[id]`. Today it is one long column of cards
(print preview + an inline editor under each), with an "Add an activity" sidebar that lists all 14 activities
whatever the worksheet's subject is. The teacher said the two things that slow them down most are
**finding the right activity** and **editing an activity**. They want it rebuilt into a cleaner, more advanced
builder, and the number writing grid to count **top to bottom** (down each column) instead of left to right.

Primary users: teachers on a laptop/desktop. Phones must stay usable (stacked), not optimised.

## Goals (phase 1)

1. A three-pane **studio** layout: Library (left) · live A4 page (middle) · Editor (right).
2. The library shows **only the worksheet's subject** by default, with an "All activities" switch.
3. Every activity editor rebuilt on a **shared editor kit**: the 2–3 most-changed settings up front,
   everything else under a "More options" fold, the same layout for every activity.
4. Number grid fills **down each column** by default, with a toggle back to row-by-row.

## Non-goals (phase 1)

- Drag to reorder, duplicate, undo/redo, page-fit meter (phase 2).
- Templates (phase 3).
- New Hindi and EVS activities (phase 4).
- Changing how worksheets are stored, printed, or created (API, Prisma models, print page, `NewWorksheetModal`).
- Phone-first layout.

## Anti-goals

- An already-made worksheet must not print differently after this ships (except where the teacher edits it).
- The question bank (`QuestionForm` / `QuestionView`) uses the same plugin editors and print components; it must keep working.
- No second live preview: the middle page is the only preview while editing (see commit af74fe7).

## Constraints

- Next.js version in this repo has breaking changes — read `node_modules/next/dist/docs/` before touching routing/APIs.
- Plugin contract `KindergartenActivityPlugin` (`src/lib/kindergarten/types.ts`) is shared with the question bank;
  `renderEditor` / `renderPrint` props stay compatible. Config shapes may only gain optional fields.
- Saving stays as today: debounced `PUT /api/papers/[id]/activities/[itemId]` with `{ text, options: [JSON config] }`;
  add/move/delete via the existing routes.
- Print fit: the worksheet scales to 2 A4 pages (`printFit.ts`); unchanged.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | **Shared editor kit** — build a small set of editor building blocks and rewrite all 14 editors on it. | Most work now; every editor looks and behaves the same; phase-4 activities are cheap to add. |
| B | Wrap existing editors in the studio, only add a "most used" block on top of each. | Fast, but editors stay inconsistent and messy underneath. |
| C | Schema-driven editors generated from a field list. | Rejected: Picture Match, Join Dots, Circle Target and Pattern need custom visual controls a generated form can't give. |

The teacher picked A.

## Design

### 1. Studio layout (`/worksheets/[id]`)

```
+--------------------------------------------------------------------------+
| ← All papers  Nursery English Unit Test Worksheet  [Nursery][English]    |
|                                   ✓ Saved   [Details]  [Print preview]   |
+-------------+------------------------------------------+-----------------+
| LIBRARY     |            A4 PAGE (live)                | EDITOR          |
| 🔍 search   |  ┌──────────────────────────────┐        | Trace & Write   |
| English  ▾  |  │ 1. Trace the letters  [2 M]  │◀ sel.  | Letters [A B C] |
|  Trace…  +  |  │ 2. Fill missing …     [2 M]  │        | Rows    [- 3 +] |
|  Missing +  |  │ 3. Match …            [2 M]  │        | Marks   [- 2 +] |
| Fun & draw  |  └──────────────────────────────┘        | ▸ More options  |
|  Colour  +  |   3 activities · 6 marks                 | [↑][↓][🗑]      |
| [All ⇄]     |                                          |                 |
+-------------+------------------------------------------+-----------------+
```

- **Header** keeps today's title, chips, save status, Details modal and Print preview link.
- **Library (left, ~16rem, sticky, own scroll):**
  - Search box (filters by label + description).
  - Default view: the worksheet subject's group first, then "Fun & drawing" (`general`) — those suit every subject.
  - "All activities" toggle shows every group. Choice remembered per browser (localStorage, try/catch).
  - Each entry: icon, short label, one-line description, a "+" add button. Clicking adds the activity at the
    end, selects it, and scrolls the page to it.
  - Subject → category mapping: English→`english`, Mathematics→`math`, Hindi→`hindi`,
    General Awareness (EVS)→`evs`, Rhymes & Activities→`general`. If the subject's own group is empty
    (Hindi, EVS until phase 4), show a short note ("More Hindi activities are coming") and the Fun group plus
    the English group for Hindi / the Fun group for EVS. *(builder's call — see "Calls made")*
- **Page (middle, flexible):** an A4-proportioned white sheet (max ~720px wide) rendering each activity's
  `renderPrint` in order, with numbering and marks. Click an activity to select it (indigo outline + soft
  background). Unselected activities show a hover outline. Below the sheet: count + total marks, and the
  existing "more than 7 activities" warning.
  - Empty state: centred card with the class quick-start button (today's `QUICK_STARTS`) and "or pick from the library".
- **Editor (right, ~22rem, sticky, own scroll):** when nothing is selected, a hint ("Click an activity on the
  page to edit it"). When selected: activity name, the editor (kit-based), then a footer row with marks
  stepper, move up / move down, delete. Escape deselects.
- **Below `lg`:** panes stack (library collapses into a top "Add activity" disclosure, page, then editor
  under the page when something is selected). Usable, not optimised.

The page file is split: `WorksheetStudio` (state + data), `ActivityLibrary`, `WorksheetCanvas`,
`ActivityInspector`, `DetailsModal` — in `src/components/worksheet-studio/`. The route file becomes thin.

### 2. Shared editor kit (`src/lib/kindergarten/editor-kit/`)

Replaces the ad-hoc helpers in `activities/_shared.tsx` (keep `_shared` exports that print components use;
move editor-only ones into the kit).

- `EditorShell` — renders `basic` content, then a `More options` disclosure (closed by default, remembers
  open state per activity type in the session) with `advanced` content.
- `InstructionField` — the instruction text with a "reset to default" link.
- `NumberStepper` — label, −/+ buttons, min/max, typed input allowed.
- `ChoiceChips` — single choice as pills (for modes, layouts, ruling type).
- `ToggleRow` — label + switch.
- `TextListField` — edit a list of short strings (letters, words) as chips with add/remove; paste "A B C" splits.
- `PicturePicker` — wraps `ClipartPickerModal` as one control: thumbnail + "Change".
- `RowList` — repeatable rows with add / remove / move, max count, compact row header.
- `Field` — label + hint + children, consistent spacing.

Rule for every editor: **basic** = instruction + the 2–3 settings that change the content most;
**advanced** = everything else. Proposed split per activity (builder may adjust after trying it):

| Activity | Basic | More options |
|---|---|---|
| Trace & Write | letters/words list, rows per item | ruling type, font size, dotted on/off per line |
| Number Grid | from / to, blanks pattern | columns, fill direction, click-to-toggle cells |
| Picture Match | pairs (picture + label) | shuffle right column, column titles |
| Count Items | picture, how many | layout, answer style, choice numbers, object name |
| Circle Target | mode, rows | target description, per-item text/picture |
| Sequence Chain | items (blank toggles) | theme |
| Missing Letters | words + blanks | picture clue per word |
| Pattern | rows (unit) | repeats, blanks at end |
| Picture Sum | operation, rows | show pictures |
| Compare | mode, rows | — |
| Colour | items (picture + colour) | — |
| Join Dots | shape, number of dots | labels (numbers/letters) |
| Tick Picture | rows (question + options) | correct answer per row |
| Pre-writing | strokes | — |

Editors keep the `KindergartenEditorProps` signature, so `QuestionForm` keeps working. The question bank
gets the new editors for free.

### 3. Number grid — top to bottom

- New optional config field `fillDirection: "COLUMN" | "ROW"`.
- **Default for new grids: `"COLUMN"`.** Missing field on existing saved grids is read as `"ROW"`, so old
  worksheets print as before (anti-goal). The editor shows a toggle "Count: ↓ down columns / → across rows".
- `cells` stays the ordered list of numbers (1, 2, 3…). Only the **visual placement** changes:
  with `columns = C` and `n` cells, `rows = ceil(n / C)`; cell `i` goes to row `i % rows`, column `floor(i / rows)`.
  So 1–50 with 5 columns → column 1 holds 1–10, column 2 holds 11–20, …
  Implemented in `MathSquareGrid` (new `direction` prop) and the editor's click-to-toggle grid, via one pure
  helper `gridPlacement(n, columns, direction)` with unit tests.
- Column count control offers 5 and 10 (as today). For `"COLUMN"`, "columns" still means how many columns
  across; rows follow from the count.
- Preset buttons keep working and set `fillDirection: "COLUMN"`.

## Phases after this (outline only — each gets its own short design)

2. **Power editing:** drag to reorder on the page; duplicate activity; undo/redo (Ctrl+Z / Ctrl+Shift+Z)
   over add/remove/move/edit; page-fit meter (how full the 2 A4 pages are, warn before print gets small).
3. **Templates:** save a worksheet as a template visible to everyone in the school; built-in templates per
   class + subject; "Start from template" in `NewWorksheetModal` and the empty state.
4. **New activities:** Hindi — varnamala trace & write (shirorekha ruling), missing varna/matra,
   picture → first letter, match letter to picture. EVS — sort into groups, name the picture,
   odd one out, where does it live/go. Built on the editor kit.

## Testing

- Unit (vitest): `gridPlacement` for both directions and uneven counts; subject → library filter;
  `parseKindergartenConfig` reading an old grid without `fillDirection` as `"ROW"`.
- Existing `kindergarten.test.ts` keeps passing.
- Browser check: create a Nursery English worksheet, add each of the 14 activities from the library, edit
  basic + more options on each, print preview shows the same thing; open an existing worksheet and confirm
  it looks unchanged; question bank KG question form still edits.

## Answers to builder questions

- **Marks** are per activity (the section's `marksEach`), saved by the existing `PUT /api/papers/[id]/activities/[itemId]`
  with `{ marks }` (today's `setMarks`). The marks stepper lives only in the editor footer, not inside each editor.
- **Print parity:** the print route (`/papers/[id]/print`) is separate and unchanged. The canvas renders the same
  `renderPrint` components with the same props as today's cards; no pixel-diff check, the browser check compares by eye.
- **More options open state:** plain React state in the studio, keyed by activity type; lost on reload.
- **Number grid blanks** are stored per cell (`{ value, isBlank }`), not by position, so changing direction never
  changes which numbers are blank. Every renderer (studio, print, question bank) reads `fillDirection` from the
  config via `renderPrint`, so all of them agree.
- **Every field in the basic/advanced table already exists** in today's configs (`traceDotted`, `answerStyle`,
  `theme`, `targetDescription`, …). The only new field is `fillDirection`.
- **Library order:** subject group first, then (for Hindi) English letters, then Fun & drawing. A "Rhymes &
  Activities" worksheet shows Fun & drawing once.

## Calls made (not asked)

- "Fun & drawing" activities show for every subject, under the subject's own group.
- Until phase 4, a Hindi worksheet also shows the English letter activities (Trace & Write already starts
  with Hindi letters for Hindi); EVS shows Fun only. Both show a "coming soon" note.
- Old number grids stay row-by-row; new ones default to column-wise.
- "Show all activities" preference is per browser.
- The selected activity is not in the URL.

## Left to the builder

- Exact pane widths, icons, and copy.
- Exact basic/advanced split per activity where the table above turns out awkward in use.
- Whether `_shared.tsx` print helpers move or stay.

## Phase 2 — power editing (built 2026-11-27)

- **Drag to reorder:** each activity on the page has a grip handle (on hover, always on the selected one); a blue line
  shows where it lands. The Up/Down buttons stay for keyboard users. Server: `PUT …/activities/[itemId]` takes
  `moveTo` (0-based index); sections are renumbered 0…n-1 (`placeSection`, `moveToIndex` in `src/lib/worksheetOrder.ts`).
- **Copy (duplicate):** inspector button; the copy goes right below the original and is selected.
  Server: `POST …/activities` takes optional `insertAt`.
- **Undo / redo:** header buttons name the step ("Undo: Remove Compare"); Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y outside text
  boxes (which keep their own undo). Covers add, starter set, copy, move, remove, marks and edits. Typing in one activity
  within 1.5 s is one step. A removed activity comes back at its old place with a new id; later steps follow the id.
  History lives for the page visit (not saved).
- **Page-space meter:** below the page. A hidden copy of the page is laid out at the print width (182 mm) and measured;
  it says how many pages the activities need at full size and whether print fits, shrinks a little (≤ 2.5 pages) or
  shrinks a lot. No percentage: the print page also widens the layout as it shrinks, so its exact scale can't be
  predicted from height alone (a 2.9-page worksheet printed at 48%).
