# Board-style Sections and Numbering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every paper prints board style. A section is a teacher-set heading that can hold several question types, each
objective type prints as one numbered question with (i)/(क) parts, and numbers run through the whole paper.

**Architecture:** A `BlueprintSection` row keeps `title` as its section heading and gains `questionTitle`, the line
printed after a grouped question's number. One type-based rule in `src/lib/layout.ts` decides grouping for numbering,
print, Word export, answer key, solutions and OMR. One pure transform regroups the built-in MPBSE templates.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching app/route code, per AGENTS.md), Prisma 6 on
SQLite (`npx prisma db push`, no migrations folder), Zod, Vitest (`npm test` = `vitest run`), docx.

**Spec:** `docs/superpowers/specs/2026-11-23-board-style-sections-numbering-design.md`

## Global Constraints

- Objective (grouped) types: `MCQ`, `ASSERTION_REASON`, `TRUE_FALSE`, `FILL_BLANK`, and `VERY_SHORT` with `marksEach ≤ 1`.
  `MATCH_COLUMN` is already one question. Every other type: each item its own number.
- A row with one item prints as a normal numbered question.
- Part labels: English `(i) (ii) … (x) (xi) …` (lower-case roman, unbounded). Devanagari `(क) … (ञ)`, then `(११) (१२) …`.
- Script follows `groupedSubLabelsIndic(sectionTitle, paperLang)` (unchanged).
- Numbering styles are `CONTINUOUS` and `PREFIXED` only. `SECTION_RELATIVE` is removed and reads as `CONTINUOUS`.
- `questionTitle` defaults to `""`. Empty means the existing localized prompt (`resolveGroupedExerciseInstruction`).
- No backfill of existing blueprint rows. Built-in templates change; blueprints already in the DB don't.
- New JSON exports don't need to import into older builds.

## Review Focus

1. **A section mixing grouped and separate rows** (Q1 MCQ group, then 3 separate 2-mark VERY_SHORT under the same
   heading): the band summary and the sub-band must still add up to the marks printed. Covered by a test in Task 2.
2. **A grouped row whose items have different marks** prints only the total, not `n × m`. The existing
   `sectionItemsFormula` should already do this; Task 2 pins it with a test.
3. **A paper still stored with `SECTION_RELATIVE`** must render as `1, 2, 3` everywhere, including Word export and OMR,
   before the data script runs. Covered by a test in Task 4.
4. **A regrouped template's total marks and question count** must equal the original. Covered by a test in Task 6.
5. **A 1-mark VERY_SHORT row of 12 items** (more than 10 parts) labels `(xi)`, `(xii)` in English and `(११)`, `(१२)` in
   Sanskrit. Covered by a test in Task 3.

---

### Task 1: `questionTitle` on blueprint rows, end to end

**Files:**
- Modify: `prisma/schema.prisma:136-155` (BlueprintSection)
- Modify: `src/lib/schemas.ts` (~line 240, next to `slotPlanJson`), `src/lib/types.ts:55`, `src/lib/blueprintWrite.ts:33-48`,
  `src/lib/blueprints.ts:104-157`, `src/lib/blueprintImport.ts:560-640`, `src/lib/blueprintExport.ts`,
  `src/lib/curriculumTemplates.ts:26-44` (template row type), `src/app/(app)/blueprints/[id]/page.tsx` (row type and
  the two template-apply maps at ~651 and ~693, plus save at ~848)
- Test: `src/lib/blueprint-question-title.test.ts` (create)

**Interfaces:**
- Produces: `BlueprintSection.questionTitle: string` (DB, default `""`); `questionTitle?: string` on the Zod section
  input, `types.ts` section type, template row type (`BlueprintTemplateSectionGroup["questionTypes"][number]`, together
  with an optional row-level `instructions?: string`), import result rows and export rows.
- Rule: follow `slotPlanJson`/`slotPlan` through every site; wherever that field is carried, carry `questionTitle` next to it.
  `grep -rn "slotPlanJson" src` is the checklist.

- [ ] **Step 1: Write the failing tests**

```ts
// blueprint-question-title.test.ts
test("import reads questionTitle per question type", () => {
  const r = parseBlueprintImport({ sections: [{ title: "Section A — Objective", questionTypes: [
    { type: "MCQ", count: 6, marksEach: 1, questionTitle: "Choose the correct option." },
    { type: "FILL_BLANK", count: 5, marksEach: 1 } ] }] /* + minimal required fields */ });
  expect(r.sections.map((s) => s.questionTitle ?? "")).toEqual(["Choose the correct option.", ""]);
  expect(r.sections.every((s) => s.title === "Section A — Objective")).toBe(true);
});
test("export writes questionTitle and a re-import keeps it", () => { /* export → import round trip, same values */ });
test("template row instructions override the group's", () => { /* rows from a template group whose qt has instructions */ });
```

Use the real exported names from `blueprintImport.ts`/`blueprintExport.ts`. Look them up; don't invent them.

- [ ] **Step 2: Run** `npx vitest run src/lib/blueprint-question-title.test.ts`. Expected: FAIL (field missing).
- [ ] **Step 3: Add `questionTitle String @default("")` to BlueprintSection**, run `npx prisma db push` then `npx prisma generate`.
- [ ] **Step 4: Carry the field through every `slotPlanJson` site listed above.** Template-apply maps set
  `instructions: qt.instructions ?? sec.instructions` and `questionTitle: qt.questionTitle ?? ""`.
- [ ] **Step 5: Run** the new test plus `npx tsc --noEmit`. Expected: PASS, no type errors.
- [ ] **Step 6: Commit** `feat(blueprints): rows carry a question title separate from their section heading`

### Task 2: One type-based grouping rule, and the question title printed

**Files:**
- Modify: `src/lib/layout.ts:293-303` (`isGroupedExerciseRow`), `src/lib/layout.ts:595` area (new helper),
  `src/components/PaperSheets.tsx:531-575`, `src/lib/paperDocx.ts:676-710`
- Test: `src/lib/board-style-numbering.test.ts` (create); update the existing tests that break

**Interfaces:**
- Produces: `isGroupedExerciseRow(section: { type: string; marksEach?: number }, itemCount: number): boolean`. Drop the
  `title` parameter and update every caller (`grep -rn "isGroupedExerciseRow(" src`).
- Produces: `groupedQuestionPrompt(section: { questionTitle?: string | null; instructions?: string | null; type: string }, hasMultipleTypes: boolean, paperLang: PaperLanguage): string`.
  It returns `questionTitle.trim()` when non-empty, else `resolveGroupedExerciseInstruction(section.instructions, section.type, hasMultipleTypes, paperLang)`.
- Produces: `isObjectiveRow(row: { type: string; marksEach?: number }): boolean`, exported. It's true for the grouped types
  in Global Constraints, and `isGroupedExerciseRow` is `itemCount > 1 && isObjectiveRow(section)`. Task 6 imports it.
- Produces: `rowRunLabel(section, paperLang): string`. It returns `questionTitle.trim()` or `getQuestionTypeLabel(section.type, paperLang)`,
  for the mixed-section sub-band.

- [ ] **Step 1: Write the failing tests**

```ts
test.each([
  ["MCQ", 1, true], ["ASSERTION_REASON", 1, true], ["TRUE_FALSE", 1, true], ["FILL_BLANK", 1, true],
  ["VERY_SHORT", 1, true], ["VERY_SHORT", 2, false], ["SHORT", 1, false], ["MATCH_COLUMN", 1, false],
])("%s at %d mark groups: %s", (type, marksEach, grouped) => {
  expect(isGroupedExerciseRow({ type, marksEach }, 6)).toBe(grouped);
});
test("one item never groups", () => expect(isGroupedExerciseRow({ type: "MCQ", marksEach: 1 }, 1)).toBe(false));
test("MCQ rows group regardless of heading text", () => { /* computeDisplayedPaperNumbering: "Section A" MCQ×6 → one number, labels "1 (i)".."1 (vi)" */ });
test("board paper numbers run through sections", () => {
  // Section A: MCQ×6, FILL_BLANK×5, TRUE_FALSE×5, MATCH_COLUMN×1; Section B: SHORT×3
  // → MCQ items "1 (i)".., FIB "2 (i)".., TF "3 (i)".., match "4", shorts "5","6","7"; totalDisplayedQuestions 7
});
test("mixed section: band and sub-band add up", () => { /* planSectionHeadings on MCQ×6 + VERY_SHORT(2m)×3 under one title */ });
test("grouped row with unequal marks prints only the total", () => { /* sectionItemsFormula with per-item marks 1,1,2 → no "×" */ });
test("questionTitle wins over the instruction on the grouped line", () => {
  expect(groupedQuestionPrompt({ questionTitle: "Fill in the blanks.", instructions: "x", type: "FILL_BLANK" }, true, "en")).toBe("Fill in the blanks.");
  expect(groupedQuestionPrompt({ questionTitle: "", instructions: "", type: "FILL_BLANK" }, false, "en"))
    .toBe(resolveGroupedExerciseInstruction("", "FILL_BLANK", false, "en"));
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/board-style-numbering.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the rule, `groupedQuestionPrompt` and `rowRunLabel` in `layout.ts`.** Remove the "Question 2"
  heading regex.
- [ ] **Step 4: Use them in print and Word.** Replace `resolveGroupedExerciseInstruction(...)` at
  `PaperSheets.tsx:573` and `paperDocx.ts:706` with `groupedQuestionPrompt(s, hasMultipleTypes, paperLang)`, and
  `getQuestionTypeLabel(...)` in the `showTypeSubBand` blocks (`PaperSheets.tsx:532`, `paperDocx.ts:677`) with `rowRunLabel`.
- [ ] **Step 5: Run** `npm test`. Fix the existing tests whose expectations encode the old rule (MCQ per-number,
  "Question N" heuristic) so they assert the new behaviour. Don't weaken unrelated assertions. Expected: all PASS.
- [ ] **Step 6: Commit** `feat(print): one grouping rule by question type; grouped lines print the row's question title`

### Task 3: Part labels (i)… and (क)… without a ceiling

**Files:**
- Modify: `src/lib/layout.ts:271-278` (`groupedSubLabel`)
- Test: `src/lib/board-style-numbering.test.ts`

**Interfaces:**
- Produces: `groupedSubLabel(idx: number, isIndic: boolean): string`. Same signature; new output.

- [ ] **Step 1: Write the failing tests**

```ts
test("english parts are lower roman", () => {
  expect([0, 1, 3, 8, 9, 10, 11, 39].map((i) => groupedSubLabel(i, false)))
    .toEqual(["(i)", "(ii)", "(iv)", "(ix)", "(x)", "(xi)", "(xii)", "(xl)"]);
});
test("devanagari parts continue with Devanagari numerals", () => {
  expect([0, 9, 10, 11].map((i) => groupedSubLabel(i, true))).toEqual(["(क)", "(ञ)", "(११)", "(१२)"]);
});
test("12-item one-word row labels through (xii)", () => { /* computeDisplayedPaperNumbering, VERY_SHORT 1m × 12 */ });
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** a small `toRoman(n)` helper (lower case). Devanagari digits come from mapping `0-9` to `०-९`.
- [ ] **Step 4: Run** `npm test`, update the tests that assert `(a)`/`(b)` labels to `(i)`/`(ii)`, and check that
  `cleanQuestionStatement` still strips a leading `(xi)` (its regex allows up to 6 roman chars; add a case). Expected: PASS.
- [ ] **Step 5: Commit** `feat(print): grouped parts labelled (i), (ii)… and (क)… then (११)…`

### Task 4: Retire SECTION_RELATIVE numbering

**Files:**
- Modify: `src/lib/constants.ts:870-910`, `src/lib/layout.ts:174-189`, `src/lib/schemas.ts:265,291,320`,
  `src/app/api/papers/[id]/ai-coverage/route.ts:27`, `src/lib/paperDocx.ts:420,705,782`,
  `src/app/papers/[id]/solutions/page.tsx:107,139`, `src/app/papers/[id]/omr/page.tsx:66,115`,
  `src/components/PaperSheets.tsx` (its numberingStyle reads), `src/app/(app)/papers/[id]/page.tsx:1516`
- Create: `scripts/retire-section-relative-numbering.mjs`
- Test: `src/lib/board-style-numbering.test.ts`

**Interfaces:**
- Produces: `NUMBERING_STYLES = ["CONTINUOUS", "PREFIXED"]` and `normalizeNumberingStyle(v: unknown): NumberingStyle`
  in `constants.ts`. Unknown values or `"SECTION_RELATIVE"` give `"CONTINUOUS"`. Every read of `paper.numberingStyle` goes
  through it.
- Zod paper schemas: `numberingStyle: z.preprocess(normalizeNumberingStyle, z.enum(NUMBERING_STYLES))`, so an old
  client value is accepted and stored as CONTINUOUS.

- [ ] **Step 1: Write failing tests:** `normalizeNumberingStyle("SECTION_RELATIVE") === "CONTINUOUS"`, `("PREFIXED") === "PREFIXED"`,
  `(undefined) === "CONTINUOUS"`; `computeDisplayedPaperNumbering(..., normalizeNumberingStyle("SECTION_RELATIVE"))`
  labels `"1"`, `"2"` (not `"A1"`); the paper Zod schema parses `"SECTION_RELATIVE"` to `"CONTINUOUS"`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Remove the `SECTION_RELATIVE` branches from both `formatQuestionNumber`s. The section-letter
  and section-relative counters left unused in PaperSheets and paperDocx can go.
- [ ] **Step 4: Write the data script.** It uses PrismaClient: `paper.updateMany({ where: { numberingStyle: "SECTION_RELATIVE" }, data: { numberingStyle: "CONTINUOUS" } })`
  and logs the count. Run it once against `prisma/dev.db`.
- [ ] **Step 5: Run** `npm test` and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 6: Commit** `refactor(numbering): retire section-relative numbering; numbers run through the paper`

### Task 5: Question title in the blueprint editor

**Files:**
- Modify: `src/app/(app)/blueprints/[id]/page.tsx` (row editor inside each section group, ~1240-1400)

**Interfaces:**
- Consumes: the row's `questionTitle` (Task 1) and `getSharedInstruction(type, lang)` from `constants.ts`.

- [ ] **Step 1: Add the field.** Each row gets a "Question title" text input bound to `qt.questionTitle`. Its placeholder
  is `getSharedInstruction(qt.type, blueprintLang)`, using the language the page already derives for the blueprint, and
  the input is `maxLength={300}`. It saves through the existing row patch function.
- [ ] **Step 2: Keep "add question type" working.** The existing "add a type to this group" action (~line 415) must create a
  row with `questionTitle: ""` under the same heading.
- [ ] **Step 3: Verify in the browser** (preview_start the dev server). Open a blueprint, set a title on a FILL_BLANK row,
  save, reload, and confirm it persisted. Open a paper from it and confirm the print view shows `Q. Fill in the blanks…`
  with `(i)` parts. Screenshot.
- [ ] **Step 4: Commit** `feat(blueprints): edit each row's question title`

### Task 6: Regroup the built-in templates

**Files:**
- Create: `src/lib/boardSections.ts`
- Modify: `src/lib/curriculumTemplates.ts:1303-1310,1909-1912` (apply the transform), the legacy Sanskrit 8-khand
  template (~1467) gets regrouped by the same transform
- Test: `src/lib/board-sections.test.ts` (create); update template/official-scheme tests that assert old titles

**Interfaces:**
- Produces: `isObjectiveRow(qt: { type: string; marksEach: number }): boolean`. It shares the Task 2 rule: export one
  predicate from `layout.ts` and import it here, don't duplicate it.
- Produces: `boardSectionHeading(index: number, lang: "en" | "hi" | "sa", name: string): string`. Letters are
  en `A B C D E…`, hi `अ ब स द इ…`, sa `क ख ग घ ङ च छ ज…`. The format is
  en `Section A — {name}`, hi `खण्ड '{l}' — {name}`, sa `खण्डः '{l}' — {name}`.
  The objective name is en `Objective Questions`, hi `वस्तुनिष्ठ प्रश्न`, sa `वस्तुनिष्ठप्रश्नाः`.
- Produces: `stripQuestionPrefix(title: string): string`. It removes a leading `Question(s) N( to M)?:`,
  `प्रश्न N( से M)?:`, `प्रश्नः N( तः M पर्यन्तम्)? :` and `खण्डः 'x' :`, with Latin or Devanagari digits.
- Produces: `regroupObjectiveSections(groups: BlueprintTemplateSectionGroup[], lang): BlueprintTemplateSectionGroup[]`.
  1. Find the first run of at least 2 consecutive groups that each have exactly one row and an objective row
     (`MATCH_COLUMN` counts as objective here).
  2. If there's no such run, return `groups` unchanged.
  3. Replace the run with one group: `title = boardSectionHeading(0, lang, objectiveName)`, `instructions = ""`. Each row
     keeps all its fields and gets `questionTitle = group.instructions.trim() || stripQuestionPrefix(group.title)` and
     `instructions: ""`.
  4. Give every later group `title = boardSectionHeading(k, lang, stripQuestionPrefix(old.title))` with k = 1, 2, …,
     and leave its instructions alone.
- Application point: map every template in `MPBSE_BLUEPRINT_TEMPLATES` and `LEGACY_STARTER_TEMPLATES` through
  `regroupObjectiveSections(t.sections, lang)` where `lang` comes from `t.language` (default `"en"`). Skip English-subject
  templates (`/english/i.test(t.subjectName ?? t.title)`), whose skill-based sections are the board pattern.

- [ ] **Step 1: Write the failing tests**

```ts
test("sanskrit 8-khand regroups into one objective khand", () => {
  const t = STANDARD_BLUEPRINT_TEMPLATES.find((x) => x.templateCode === "<8-khand code; look it up>")!;
  expect(t.sections[0].title).toBe("खण्डः 'क' — वस्तुनिष्ठप्रश्नाः");
  expect(t.sections[0].questionTypes.map((q) => q.type)).toEqual(["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "VERY_SHORT"]);
  expect(t.sections[0].questionTypes[1].questionTitle).toBe("कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत (प्रश्नक्रमाङ्कः 2):");
  expect(t.sections[1].title).toBe("खण्डः 'ख' — लघूत्तरीयप्रश्नाः");
});
test("standard english-medium science regroups", () => {
  const t = STANDARD_BLUEPRINT_TEMPLATES.find((x) => x.id === "mpbse-10th-science-200-75m")!;
  expect(t.sections[0].title).toBe("Section A — Objective Questions");
  expect(t.sections[1].title).toBe("Section B — Very Short Answer Questions");
});
test("every regrouped template keeps its marks and question count", () => {
  // for each template: sum(count*marksEach) and sum(count) equal the un-transformed source
});
test("english templates are untouched", () => { /* mpbse-10th-english-411-75m titles equal source */ });
test.each([["Questions 6 to 17: Very Short Answer Questions", "Very Short Answer Questions"],
  ["प्रश्न 6 से 17: अतिलघुउत्तरीय प्रश्न (Very Short Answer Questions)", "अतिलघुउत्तरीय प्रश्न (Very Short Answer Questions)"],
  ["प्रश्नः 6 तः 17 पर्यन्तम् : अतिलघूत्तरीयप्रश्नाः", "अतिलघूत्तरीयप्रश्नाः"],
  ["खण्डः 'छ' : पाठाधारित-अवबोधनम्", "पाठाधारित-अवबोधनम्"]])("strip %s", (a, b) => expect(stripQuestionPrefix(a)).toBe(b));
```

For "keeps marks", compare against the pre-transform list: export the raw arrays, or compute them in the test by calling
the generators before the transform.

- [ ] **Step 2: Run** `npx vitest run src/lib/board-sections.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `boardSections.ts` and apply it.**
- [ ] **Step 4: Check the other template consumers.** `grep -rln "STANDARD_BLUEPRINT_TEMPLATES\|MPBSE_BLUEPRINT_TEMPLATES" src scripts`.
  `curriculumInit.ts`, `blueprintSetupPlan.ts`, `mpbseStandardEngine.ts`, `schoolPatterns.ts` and presets must read the
  transformed lists. If one rebuilds sections from the raw generators, route it through the transform too.
- [ ] **Step 5: Run** `npm test`. Update template, official-scheme, MPBSE and Sanskrit tests whose expectations name the
  old per-type headings or section counts. Keep their marks, count and chapter assertions unchanged. Expected: all PASS.
- [ ] **Step 6: Verify in the browser.** Create a blueprint from the Class 10 Science template and from the Sanskrit
  8-khand template, build a paper, and screenshot print: Section A holds Q1–Q5 with `(i)` and `(क)` parts, and Section B
  starts at Q6.
- [ ] **Step 7: Commit** `feat(templates): regroup objective questions into one board-style section`

### Task 7: Cross-surface check

**Files:**
- Test: `src/lib/board-style-numbering.test.ts`

- [ ] **Step 1: Write a test.** For one regrouped paper fixture, the labels from `computeDisplayedPaperNumbering`
  equal the labels read back from the Word export (`paperDocx` text runs) for every item. Answer key and solutions read
  `numbering.itemNumbers` (`answerKeyStatus.ts`, `solutions/page.tsx`); assert `answerKeyStatus` uses the same `displayLabel`s.
- [ ] **Step 2: Run** `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: all clean.
- [ ] **Step 3: Verify in the browser.** Open the answer key and OMR page of the Task 6 paper and confirm `Q2 (iii)`
  appears identically in builder, print, answer key and OMR. Screenshot.
- [ ] **Step 4: Commit** `test(numbering): builder, print, Word and answer key share every label`
