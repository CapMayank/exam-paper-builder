# Classes 1–4 Blueprint Preset & Half-Mark Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Classes 1–4 school blueprint preset (`school-1-4-50m`) to the 7-section 50-mark structure (including 0.5-mark True/False and Match the Columns) and add native `0.5`-mark support across the database schema, validation, blueprint/paper logic, and UI.

**Architecture:** Migrate `BlueprintSection.marksEach` and `BlueprintChapter.marks` from `Int` to `Float` in Prisma/SQLite, relax Zod `.int()` constraints in `src/lib/schemas.ts`, update multi-unit `MATCH_COLUMN` detection (`marksEach <= 1`) and blueprint/paper helpers so `0.5` marks work end-to-end, and update `schoolPatterns.ts` for Classes 1–4.

**Tech Stack:** Next.js, TypeScript, Prisma (SQLite), Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-classes-1-4-blueprint-preset-design.md`

## Global Constraints

- Classes 1–4 preset (`school-1-4-50m`, 50 marks total) must have exactly:
  1. `MCQ`: 3 questions × 1 mark = 3 marks
  2. `FILL_BLANK`: 3 questions × 1 mark = 3 marks
  3. `TRUE_FALSE`: 4 questions × 0.5 mark = 2 marks
  4. `MATCH_COLUMN`: 4 pairs × 0.5 mark = 2 marks
  5. `VERY_SHORT`: 6 questions × 2 marks = 12 marks
  6. `SHORT`: 6 questions × 3 marks = 18 marks
  7. `LONG`: 2 questions × 5 marks = 10 marks
- Classes 5–8 (`school-5-8-60m`, language patterns) and MPBSE board presets must remain unchanged.

## Review Focus

- `MATCH_COLUMN` with `count: 4, marksEach: 0.5`: must behave as a 4-pair match section totaling 2 marks (one `MATCH_COLUMN` question with 4 pairs fills all 4 slots), not 4 separate 0.5-mark questions.
- Floating-point arithmetic in `blueprintTotalMarks`, `validateBlueprint`, and `distributeSlotMarks`: sums of `0.5` marks must not fail equality checks due to float precision.
- Blueprint editor UI (`src/app/(app)/blueprints/[id]/page.tsx`): editing or saving a `0.5`-mark section must not round or truncate `0.5` to `0` or `1`, and `<input type="number">` must allow `0.5` steps.
- `autofill.ts` and `PasteQuestionsPanel.tsx`: must handle `0.5`-mark slots and `MATCH_COLUMN` `marksEach: 0.5` without rejecting valid placements.
- Existing tests in `src/lib/school-paper-flow.test.ts` and `src/lib/blueprint-export-sheet.test.ts` must pass with the updated Classes 1–4 preset.

---

### Task 1: Prisma Schema & Validation Schemas for Half-Marks

**Files:**
- Modify: `prisma/schema.prisma:122-145`
- Modify: `src/lib/schemas.ts:224-234`
- Test: `src/lib/schemas.test.ts` (or existing schema test file if present, otherwise `src/lib/school-paper-flow.test.ts`)

**Interfaces:**
- Produces: `BlueprintSection.marksEach: Float` and `BlueprintChapter.marks: Float` in Prisma client; `blueprintCreateSchema` accepting `0.5` marks.

- [ ] **Step 1: Write the failing test**

Add a test verifying `blueprintCreateSchema` accepts `marksEach: 0.5` and `chapters: [{ chapterId: "c1", marks: 2.5 }]` in `src/lib/school-paper-flow.test.ts`:
```ts
it("blueprintCreateSchema accepts 0.5 marksEach and fractional chapter marks", async () => {
  const { blueprintCreateSchema } = await import("./schemas");
  const parsed = blueprintCreateSchema.parse({
    name: "Class 1 Test",
    bookId: "book-1",
    examType: "ANNUAL",
    durationMin: 150,
    chapters: [{ chapterId: "c1", marks: 2.5 }],
    sections: [{ title: "True/False", type: "TRUE_FALSE", count: 4, marksEach: 0.5 }],
  });
  expect(parsed.sections[0].marksEach).toBe(0.5);
  expect(parsed.chapters[0].marks).toBe(2.5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/school-paper-flow.test.ts`
Expected: FAIL because `blueprintCreateSchema` rejects `0.5` and `2.5` as non-integers.

- [ ] **Step 3: Update `prisma/schema.prisma` and `src/lib/schemas.ts`**

1. In `prisma/schema.prisma`:
   - Change `BlueprintChapter.marks` from `Int` to `Float`
   - Change `BlueprintSection.marksEach` from `Int` to `Float`
2. Run Prisma migration and client generation:
   - `npx prisma migrate dev --name allow_half_marks_in_blueprint` (or `npx prisma db push` if shadow/dev DB is SQLite without migration history — check existing `prisma/migrations` first)
3. In `src/lib/schemas.ts`:
   - Change `chapters` `marks` from `z.number().int().min(0).max(1000)` to `z.number().min(0).max(1000)`
   - Change `sections` `marksEach` from `z.number().int().min(1).max(100)` to `z.number().positive().max(100)`
   - Check any other blueprint update/patch schemas in `src/lib/schemas.ts` for `marksEach` or `chapters[].marks` `.int()` constraints and relax them similarly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/school-paper-flow.test.ts`
Expected: PASS for the new schema test.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/schemas.ts src/lib/school-paper-flow.test.ts
git commit -m "feat: allow fractional marks (0.5) in blueprint schema and validation"
```

---

### Task 2: Blueprint, Match-Column & Half-Mark Logic

**Files:**
- Modify: `src/lib/blueprint.ts`
- Modify: `src/lib/autofill.ts`
- Modify: `src/components/SectionAiModal.tsx`
- Modify: `src/app/(app)/blueprints/[id]/page.tsx`
- Test: `src/lib/school-paper-flow.test.ts`

**Interfaces:**
- Consumes: `BlueprintSection.marksEach: number` (now supporting `0.5`).
- Produces: `isMultiUnitMatchSection(section)` (or updated `matchTakesSlots` / `getItemUnits` / `blueprintTotalMarks` / `validateBlueprint`) handling `marksEach: 0.5`.

- [ ] **Step 1: Write the failing test**

Add tests in `src/lib/school-paper-flow.test.ts` for:
- `MATCH_COLUMN` section with `count: 4, marksEach: 0.5` where 1 `MATCH_COLUMN` question with 4 pairs fills all 4 units and contributes 2 marks.
- `TRUE_FALSE` section with `count: 4, marksEach: 0.5` where 4 `TRUE_FALSE` questions fill 4 units and contribute 2 marks.
- `validateBlueprint` passing for a 50-mark blueprint with `0.5`-mark sections and matching chapter marks.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/school-paper-flow.test.ts`
Expected: FAIL because `isMultiUnitMatch` in `src/lib/blueprint.ts` checks `section.marksEach === 1` instead of `section.marksEach <= 1`.

- [ ] **Step 3: Update `blueprint.ts`, `autofill.ts`, `SectionAiModal.tsx`, and `blueprints/[id]/page.tsx`**

1. In `src/lib/blueprint.ts`:
   - Update `isMultiUnitMatch` check (`section.marksEach === 1` -> `section.marksEach <= 1` and `section.marksEach > 0`) and export a helper if `SectionAiModal.tsx` can reuse it.
   - Check `getItemUnits`, `getItemMarks`, `blueprintTotalMarks`, and `validateBlueprint` for float rounding (`Math.round(... * 100) / 100` where comparing totals).
2. In `src/lib/autofill.ts`:
   - Update line 161 (`sec.marksEach === 1` -> `sec.marksEach <= 1`).
3. In `src/components/SectionAiModal.tsx`:
   - Update line 102 (`section?.marksEach === 1` -> `(section?.marksEach ?? 1) <= 1`).
4. In `src/app/(app)/blueprints/[id]/page.tsx`:
   - Ensure the `marksEach` `<input type="number">` has `step="0.5"` and `min={0.5}` and its `onChange` handler parses floats (`parseFloat` / `Number`) rather than `parseInt`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/school-paper-flow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blueprint.ts src/lib/autofill.ts src/components/SectionAiModal.tsx src/app/(app)/blueprints/[id]/page.tsx src/lib/school-paper-flow.test.ts
git commit -m "feat: support 0.5-mark sections in blueprint, autofill, and UI"
```

---

### Task 3: Update Classes 1–4 Blueprint Preset in `schoolPatterns.ts`

**Files:**
- Modify: `src/lib/schoolPatterns.ts:1-35,155-161`
- Test: `src/lib/school-paper-flow.test.ts`

**Interfaces:**
- Consumes: `BlueprintTemplate` and `0.5`-mark support from Tasks 1–2.
- Produces: Updated `school-1-4-50m` preset in `SCHOOL_PATTERNS` for Classes 1–4.

- [ ] **Step 1: Update the Classes 1–4 test in `src/lib/school-paper-flow.test.ts`**

Update the `"Classes 1–4: ..."` test to assert:
- `t.totalMarks === 50` and `blueprintTotalMarks(sections) === 50`
- `sections.reduce((n, s) => n + s.count, 0) === 28`
- `sections.map((s) => [s.type, s.count, s.marksEach])` equals:
  ```ts
  [
    ["MCQ", 3, 1],
    ["FILL_BLANK", 3, 1],
    ["TRUE_FALSE", 4, 0.5],
    ["MATCH_COLUMN", 4, 0.5],
    ["VERY_SHORT", 6, 2],
    ["SHORT", 6, 3],
    ["LONG", 2, 5],
  ]
  ```
- `distributeSlotMarks(slotMarksOf(sections), ids)` sums to 50 across various chapter counts.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/school-paper-flow.test.ts`
Expected: FAIL because `schoolPatterns.ts` still returns the old 5-section 24-question pattern.

- [ ] **Step 3: Update `src/lib/schoolPatterns.ts`**

Keep `schoolPattern` for Classes 5–8 (60 marks) intact, and define the Classes 1–4 50-mark pattern (`school-1-4-50m`) with the 7 sections:
1. Section A – Multiple Choice Questions (`MCQ`, `count: 3`, `marksEach: 1`)
2. Section B – Fill in the Blanks (`FILL_BLANK`, `count: 3`, `marksEach: 1`)
3. Section C – True / False (`TRUE_FALSE`, `count: 4`, `marksEach: 0.5`)
4. Section D – Match the Columns (`MATCH_COLUMN`, `count: 4`, `marksEach: 0.5`)
5. Section E – Very Short Answer Questions (`VERY_SHORT`, `count: 6`, `marksEach: 2`)
6. Section F – Short Answer Questions (`SHORT`, `count: 6`, `marksEach: 3`)
7. Section G – Long Answer Questions (`LONG`, `count: 2`, `marksEach: 5`)

Update the file header comment in `src/lib/schoolPatterns.ts` to reflect the new Classes 1–4 pattern.

- [ ] **Step 4: Run full relevant test suite and typecheck**

Run:
- `npx vitest run src/lib/school-paper-flow.test.ts src/lib/presets.test.ts src/lib/blueprint-export-sheet.test.ts`
- `npx tsc --noEmit`
Expected: All tests PASS and TypeScript reports 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schoolPatterns.ts src/lib/school-paper-flow.test.ts
git commit -m "feat: update Classes 1-4 blueprint preset to 7-section 50-mark pattern"
```
