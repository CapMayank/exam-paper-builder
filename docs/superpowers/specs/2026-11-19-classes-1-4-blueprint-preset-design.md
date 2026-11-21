# Classes 1–4 Blueprint Preset & Half-Mark Support — Design

## Intent & Why
Update the built-in school blueprint preset for Classes 1–4 (`school-1-4-50m`, 50 marks) to match the school's actual 7-section exam structure, including 0.5-mark questions for True/False and Match the Columns.

## Goals & Non-Goals
- **Goals:**
  - Update `school-1-4-50m` in `src/lib/schoolPatterns.ts` to:
    1. MCQ (`MCQ`): 3 questions × 1 mark = 3 marks
    2. Fill in the blanks (`FILL_BLANK`): 3 questions × 1 mark = 3 marks
    3. True / False (`TRUE_FALSE`): 4 questions × 0.5 mark = 2 marks
    4. Match the columns (`MATCH_COLUMN`): 4 pairs × 0.5 mark = 2 marks
    5. Very short (`VERY_SHORT`): 6 questions × 2 marks = 12 marks
    6. Short (`SHORT`): 6 questions × 3 marks = 18 marks
    7. Long (`LONG`): 2 questions × 5 marks = 10 marks
    - Total: 28 slots/items, 50 marks.
  - Enable native half-mark (`0.5`) support across `BlueprintSection.marksEach`, `BlueprintChapter.marks`, validation schemas, blueprint/paper calculations, and UI inputs/displays.
- **Non-Goals:**
  - Changing Classes 5–8 (`school-5-8-60m` or language patterns) or board (MPBSE) presets.
  - Adding new question types.

## Approaches Considered
- **Option A (Selected): Native half-marks (`Float`)** — Change `BlueprintSection.marksEach` and `BlueprintChapter.marks` in `prisma/schema.prisma` from `Int` to `Float` (with migration), update `src/lib/schemas.ts` to accept positive numbers (e.g., `0.5` steps) instead of `.int()`, and verify blueprint/paper/autofill/export/UI code handles `0.5` cleanly.
  - *Trade-off:* Requires a Prisma schema migration and checking floating-point rounding/step inputs across blueprint & paper flows, but models 4 × 0.5 directly and cleanly.
- **Option B (Rejected): Keep `Int` schema** — Model True/False and Match the Columns as single 2-mark grouped slots. Rejected because it does not match the per-question/per-pair 0.5-mark structure requested.

## Constraints & What's Left to Implementation
- SQLite/Prisma migration for `BlueprintSection.marksEach` and `BlueprintChapter.marks` (`Int` → `Float`).
- Ensure `MATCH_COLUMN` with `count: 4, marksEach: 0.5` (4 pairs × 0.5 = 2 marks) works in `blueprint.ts` (`matchTakesSlots`, `getItemMarks`, `spansSlots`, `validateBlueprint`), `autofill.ts`, and paper/export rendering without integer-only bugs.
- Update existing tests (including `src/lib/school-paper-flow.test.ts`) and add coverage for `0.5`-mark sections.
