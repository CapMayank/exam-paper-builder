# External Prompt Formats, Match Fix & Figures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pasted chat-AI replies import correctly for every question type, match questions keep both columns, and figure descriptions come through, get auto-drawn when a key exists, and are otherwise flagged "Figure needed".

**Architecture:** A pure per-type catalogue (`externalTypeFormats.ts`) feeds the prompt builder. The importer learns a `figure` field, stored as a small JSON "figure brief" in the existing `Question.figureScene` column (`figureBrief.ts`). After import, the client draws each brief through the existing prompt-to-figure → PNG → upload path and PATCHes `imagePath`. Printing is unchanged: it only ever prints `imagePath`.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching routes, per AGENTS.md), TypeScript, Prisma (no schema change), Zod, Vitest (`npm test` = `vitest run`).

**Spec:** `docs/superpowers/specs/2026-11-21-external-prompt-formats-and-figures-design.md`

## Global Constraints

- No Prisma schema change. The figure brief lives in `Question.figureScene` as JSON.
- Example skeletons use placeholders only (`<...>`), never real subject content.
- The prompt includes rule + skeleton only for the types the paper uses.
- Auto-draw never runs inside the import transaction. A failed draw never fails the import. `isMock: true` results are never saved.
- `needsFigure` and `autoDrawn` never print. The printed paper and DOCX output stay unchanged.
- Every key of `QUESTION_TYPE_LABEL` (`src/lib/constants.ts`) has a catalogue entry.
- Existing tests keep passing: `npm test`.

## Review Focus

1. A Hindi/Sanskrit match question whose instruction names both "स्तम्भ अ" and "स्तम्भ ब" must still give two columns (Task 1 test).
2. An old-style reply with explicit `Column I:` / `Column II:` header lines in `text` must still parse as before (Task 1 test).
3. "Figure out the value…" must not raise a missing-figure warning (Task 4 test).
4. An OR question with its own `figure` must get its own brief, separate from the main question's (Task 5 test).
5. A teacher replacing an auto-drawn figure (upload/search/edit) must clear the "Auto-drawn — check it" note (Task 5 test).

---

## File Structure

- Modify `src/lib/constants.ts`: match column header detection.
- Create `src/lib/externalTypeFormats.ts`: per-type `{ rule, example, needsFigure }`.
- Modify `src/lib/externalPaperPrompt.ts`: uses the catalogue, envelope example, figure rule.
- Modify `src/lib/paperImport.ts`: `figure` field, missing-figure warning.
- Create `src/lib/figureBrief.ts`: encode/parse/update the brief JSON (pure).
- Modify `app/api/papers/[id]/import-questions/route.ts` and `app/api/papers/import/route.ts`: write the brief, return `figuresNeeded`.
- Modify `src/lib/dto.ts`: expose `figureBrief` on `QuestionDto`.
- Modify `src/lib/schemas.ts` + `app/api/questions/[id]/route.ts`: `figureAutoDrawn` patch field, update the brief when `imagePath` changes.
- Modify `app/api/ai/prompt-to-figure/route.ts`: normalize objects.
- Create `src/lib/autoDrawFigures.ts` (client): draw + upload + patch loop.
- Modify `src/components/PaperImportModal.tsx`: run auto-draw after import.
- Modify `src/app/(app)/papers/[id]/page.tsx`: "Figure needed" / "Auto-drawn" badges and actions.

Tests live beside the code as `src/lib/<name>.test.ts` (project convention).

---

### Task 1: Match parser treats an instruction naming both columns as instruction

**Files:**
- Modify: `src/lib/constants.ts` (`extractColumnIItems` ~L338, `extractColumnIIItems` ~L375, `getMatchColumnInstruction` ~L406)
- Test: `src/lib/match-column-instruction.test.ts`

**Interfaces:**
- Produces: `isColumnHeaderLine(line: string): "I" | "II" | null` (exported from `constants.ts`). It returns `null` when the line names both columns. Otherwise it returns the column it names. All three functions use it in place of their inline `col1Regex`/`col2Regex` tests.

- [ ] **Step 1: Write the failing tests**

```ts
// fixture = the verbatim reply in the spec, section C
test("instruction naming Column A and Column B keeps options as Column II", () => {
  const pairs = parseMatchColumnPairs(fixture.options, fixture.text, null);
  expect(pairs).toHaveLength(6);
  expect(pairs[0]).toEqual({ left: "$(x + y + z)^2$", right: "$(x - y)(x^2 + xy + y^2)$" });
  expect(pairs[5].left).toBe("Factorisation of $x^2 - 9y^2$");
  expect(pairs[5].right).toBe("$(x + y + z)(x^2 + y^2 + z^2 - xy - yz - zx)$");
});
test("instruction line is the stem", () => {
  expect(getMatchColumnInstruction(fixture.text)).toBe("Match the items in Column A with their corresponding equivalents in Column B:");
});
test("Sanskrit instruction naming both columns", () => {
  const text = "स्तम्भ अ इत्यस्य पदानि स्तम्भ ब इत्यनेन सह योजयत\n(क) रामः\n(ख) सीता";
  expect(parseMatchColumnPairs(["जनकसुता", "दशरथपुत्रः"], text, null).map((p) => p.right)).toEqual(["जनकसुता", "दशरथपुत्रः"]);
});
test("explicit header lines still split both columns from text", () => {
  const text = "Match the following:\nColumn I\n(A) Cell\n(B) Atom\nColumn II\n(i) Unit of life\n(ii) Unit of matter";
  expect(parseMatchColumnPairs([], text, null)).toEqual([
    { left: "Cell", right: "Unit of life" },
    { left: "Atom", right: "Unit of matter" },
  ]);
});
test("isColumnHeaderLine", () => {
  expect(isColumnHeaderLine("Column II")).toBe("II");
  expect(isColumnHeaderLine("Column I:")).toBe("I");
  expect(isColumnHeaderLine("Match Column I with Column II")).toBeNull();
});
```

- [ ] **Step 2: Run to verify they fail.** Run: `npx vitest run src/lib/match-column-instruction.test.ts`. Expected: FAIL. The first test gets the Column I items on both sides, and `isColumnHeaderLine` is not exported.
- [ ] **Step 3: Implement `isColumnHeaderLine` and use it in the three functions.** Move the two existing regexes into it. Test col2 before col1, as today. If both match, return `null`.
- [ ] **Step 4: Run the new test, then the match suites.** Run: `npx vitest run src/lib/match-column-instruction.test.ts src/lib/paperImport.test.ts src/lib/question-pipeline-audit.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "fix: match instruction naming both columns no longer read as Column II header"`

---

### Task 2: Per-type format catalogue

**Files:**
- Create: `src/lib/externalTypeFormats.ts`
- Test: `src/lib/external-type-formats.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TypeFormat { rule: string; example: Record<string, unknown>; needsFigure: boolean }
  export function typeFormat(type: string, language: string): TypeFormat   // unknown type → the SHORT/LONG default
  export const PICTORIAL_TYPES: ReadonlySet<string>                         // types whose rule requires "figure"
  ```
- `example` is one question object in the importer's JSON shape: `text`, `type`, `marks: "<marks>"`, `chapterNumber: "<chapter number>"`, `chapterTitle`, `difficulty`, `options`, and `subparts` / `attemptCount` / `figure` where the type uses them. Placeholders are `"<...>"` strings.
- The rules carry over today's `typeFormat()` sentences from `externalPaperPrompt.ts` and extend them.
- MATCH_COLUMN rule and example: `text` = `"<instruction>\n(A) <Column I item>\n(B) <Column I item>"`, `options` = `["<Column II item>", "<Column II item>"]`, plus "Column II in shuffled order, same count as Column I; marks = section total". The column headings come from `languageRule()` for hi/sa.
- KDG_*, DRAW, MAP_WORK, GRAMMAR, WRITING_SKILL: write each rule by reading how the type is stored and rendered in `QuestionView.tsx`, `QuestionForm.tsx` and `diagram-rules.ts`. A type goes in `PICTORIAL_TYPES` when its rendered question cannot exist without a picture (expected at least: KDG_PICTURE_MATCH, KDG_COUNT_ITEMS, KDG_TICK_PICTURE, KDG_COLOUR, KDG_PICTURE_SUM, KDG_JOIN_DOTS, MAP_WORK). Put the final list in the commit message for review.

- [ ] **Step 1: Write the failing tests**

```ts
test("every question type has a format", () => {
  for (const t of Object.keys(QUESTION_TYPE_LABEL)) expect(typeFormat(t, "en").rule.length).toBeGreaterThan(20);
});
test("examples are placeholders only", () => {
  for (const t of Object.keys(QUESTION_TYPE_LABEL)) {
    const strings = JSON.stringify(typeFormat(t, "en").example).match(/"[^"]*"/g) ?? [];
    const values = strings.filter((s) => !/^"(text|type|marks|chapterNumber|chapterTitle|difficulty|options|subparts|label|attemptCount|figure|orQuestion|EASY|MEDIUM|HARD)"$/.test(s) && s !== `"${t}"`);
    for (const v of values) expect(v).toMatch(/<[^>]+>|^"\([a-zivx]+\)"$|^"[A-F]?"$|_{8}/);
  }
});
test("example round-trips through the importer", () => {
  for (const t of Object.keys(QUESTION_TYPE_LABEL)) {
    const ex = { ...typeFormat(t, "en").example, marks: 2, chapterNumber: 1 };
    const res = parsePaperJson(JSON.stringify({ title: "x", sections: [{ title: "S", questions: [ex] }] }));
    expect(res.errors, t).toEqual([]);
    expect(res.paper?.sections[0].questions[0].type).toBe(t);
  }
});
test("pictorial types require figure", () => {
  for (const t of PICTORIAL_TYPES) expect(typeFormat(t, "en").example).toHaveProperty("figure");
});
test("Sanskrit match uses स्तम्भ अ / स्तम्भ ब", () => {
  expect(typeFormat("MATCH_COLUMN", "sa").rule).toContain("स्तम्भ अ");
});
```

(`parsePaperJson` currently has no `figure` field. That doesn't matter here: an unknown key does not error. Task 4 adds it.)

- [ ] **Step 2: Run to verify fail.** Run: `npx vitest run src/lib/external-type-formats.test.ts`. Expected: FAIL with module not found.
- [ ] **Step 3: Implement `externalTypeFormats.ts`.** Write the per-type data and `typeFormat`. Adjust the placeholder regex in the test only if a legitimate fixed token needs it, such as the 4 standard A/R options.
- [ ] **Step 4: Run to verify pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: per-type format catalogue for the external paper prompt"`

---

### Task 3: Prompt uses the catalogue and asks for figures

**Files:**
- Modify: `src/lib/externalPaperPrompt.ts` (delete local `typeFormat`, rebuild `example`, "Question formats" and "Reply format")
- Test: extend `src/lib/externalPaperPrompt.test.ts` (create if absent; mirror the plan fixtures used in `two-stage-generation.test.ts` or build a minimal `PaperAutogenPlan`)

**Interfaces:**
- Consumes: `typeFormat`, `PICTORIAL_TYPES` (Task 2).
- `buildExternalPaperPrompt` keeps its signature and return type.

- [ ] **Step 1: Write the failing tests.** Use a plan with an MCQ section and a MATCH_COLUMN section.

```ts
test("each used type gets its rule and example", () => {
  const { prompt } = buildExternalPaperPrompt({ plan });
  expect(prompt).toContain(typeFormat("MATCH_COLUMN", "en").rule);
  expect(prompt).toContain('"<Column II item>"');
  expect(prompt).not.toContain(typeFormat("CASE_STUDY", "en").rule); // unused type
});
test("reply envelope no longer carries the first section's type", () => {
  const { prompt } = buildExternalPaperPrompt({ plan });
  const reply = prompt.slice(prompt.indexOf("## Reply format"));
  expect(reply).toContain('"sections"');
  expect(reply).not.toContain('"type": "MCQ"');
});
test("figure rule present", () => {
  expect(buildExternalPaperPrompt({ plan }).prompt).toContain("Never write 'in the figure' without a \"figure\"");
});
test("OR example carries type, chapterTitle and subparts when choice is required", () => { /* plan slot with requiresInternalChoice */ });
```

- [ ] **Step 2: Run to verify fail.** Run: `npx vitest run src/lib/externalPaperPrompt.test.ts`.
- [ ] **Step 3: Implement.**
  - "## Question formats": for each used type, `- ${rule}` then a ```json block with `JSON.stringify(example, null, 2)`.
  - "## Reply format": envelope `{ title, sections: [{ title, questions: ["<one object per question, in the shape shown for its type>"] }] }`.
  - Add the shared figure rule line exactly as in spec B. When `orQuestion` is needed, show `{ text, type, marks, chapterNumber, chapterTitle, difficulty, options, subparts }`.
- [ ] **Step 4: Run the prompt tests and the blueprint prompt route's tests.** Run: `npx vitest run src/lib/externalPaperPrompt.test.ts src/lib/two-stage-generation.test.ts`. Expected: PASS. The blueprint route (`app/api/blueprints/[id]/external-prompt/route.ts`) already calls `buildExternalPaperPrompt`, so it gets this for free.
- [ ] **Step 5: Commit.** `git commit -m "feat: external prompt shows per-type examples and figure rule"`

---

### Task 4: Importer reads `figure` and warns on missing figures

**Files:**
- Modify: `src/lib/paperImport.ts` (`ImportedPaperQuestion`, its `orQuestion`, JSON parse ~L460-600)
- Test: `src/lib/paper-import-figure.test.ts`

**Interfaces:**
- Produces: `figure?: string` on `ImportedPaperQuestion` and on `ImportedPaperQuestion["orQuestion"]`. Also produces `export function mentionsFigure(text: string): boolean`.
- The warning text is `${secTitle} Question ${n}: mentions a figure but has no "figure" description.`

- [ ] **Step 1: Write the failing tests**

```ts
test("figure is kept, trimmed", () => { /* {figure: "  Triangle ABC, AB = 5 cm  "} → "Triangle ABC, AB = 5 cm" */ });
test("orQuestion figure kept separately", () => { /* main figure "X", or figure "Y" */ });
test("blank figure dropped", () => { /* figure: "   " → undefined */ });
test("mentionsFigure", () => {
  expect(mentionsFigure("In the given figure, find ∠ABC")).toBe(true);
  expect(mentionsFigure("दिए गए चित्र में")).toBe(true);
  expect(mentionsFigure("Study the graph below")).toBe(true);
  expect(mentionsFigure("Figure out the value of x")).toBe(false);
});
test("warning when text, a subpart, or the OR question mentions a figure without one", () => { /* three cases → three warnings */ });
```

- [ ] **Step 2: Run to verify fail.** Run: `npx vitest run src/lib/paper-import-figure.test.ts`.
- [ ] **Step 3: Implement.** Keyword regex as in spec D, with `figure(?!\s+out)`.
- [ ] **Step 4: Run it plus `src/lib/paperImport.test.ts src/lib/paper-import-units.test.ts`.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: import reads figure descriptions and warns when missing"`

---

### Task 5: Store the figure brief, expose it, keep it in sync on PATCH

**Files:**
- Create: `src/lib/figureBrief.ts`
- Modify: `app/api/papers/[id]/import-questions/route.ts` (both `question.create` calls, response), `app/api/papers/import/route.ts` (both `question.create` calls, response)
- Modify: `src/lib/dto.ts` (`QuestionDto` + `toQuestionDto`, ~L14 and ~L225); every `select`/`include` that feeds `toQuestionDto` must include `figureScene` (grep `toQuestionDto(`)
- Modify: `src/lib/schemas.ts` (`questionPatchSchema` ~L193), `app/api/questions/[id]/route.ts` PATCH (~L21-60) and PUT
- Test: `src/lib/figure-brief.test.ts`

**Interfaces:**
- Produces (`figureBrief.ts`, pure):
  ```ts
  export interface FigureBrief { description: string; needsFigure: boolean; autoDrawn: boolean }
  export function figureBriefScene(description: string): string
  //  → JSON {summary, canvasWidth: 640, canvasHeight: 360, objects: [], needsFigure: true, autoDrawn: false}
  export function parseFigureBrief(scene: string | null | undefined): FigureBrief | null  // null for non-brief/invalid JSON
  export function sceneAfterImageChange(scene: string | null, imagePath: string | null, autoDrawn: boolean | undefined): string | null
  //  imagePath set → needsFigure false, autoDrawn = autoDrawn ?? false; imagePath null → needsFigure true (if a brief), autoDrawn false
  ```
- `QuestionDto.figureBrief: FigureBrief | null`.
- `questionPatchSchema.figureAutoDrawn: z.boolean().optional()`. PATCH: when `imagePath` or `figureAutoDrawn` is given, set `figureScene = sceneAfterImageChange(...)`. A PATCH with only `figureAutoDrawn: false` (the "Looks right" button) clears `autoDrawn` and nothing else. PUT applies the same rule when `imagePath` changes.
- Import response gains `figuresNeeded: { questionId: string; description: string }[]` (main and OR questions alike).

- [ ] **Step 1: Write the failing tests** (pure, on `figureBrief.ts`)

```ts
test("brief round-trip", () => { expect(parseFigureBrief(figureBriefScene("Circle, centre O"))).toEqual({ description: "Circle, centre O", needsFigure: true, autoDrawn: false }); });
test("auto-drawn image clears needsFigure, sets autoDrawn", () => { /* sceneAfterImageChange(brief, "a.png", true) */ });
test("teacher replacing image clears autoDrawn", () => { /* from autoDrawn true, sceneAfterImageChange(s, "b.png", undefined).autoDrawn === false */ });
test("removing image re-flags needsFigure", () => {});
test("non-brief figureScene (an AI generator figureDoc without needsFigure) parses to null and is left untouched", () => {});
```

- [ ] **Step 2: Run to verify fail.** Run: `npx vitest run src/lib/figure-brief.test.ts`.
- [ ] **Step 3: Implement `figureBrief.ts`.** Then wire the routes, DTO and schema as listed under Interfaces. Pass `figureScene: q.figure ? figureBriefScene(q.figure) : null` (and the same for `q.orQuestion.figure`). Collect `figuresNeeded` from the created ids.
- [ ] **Step 4: Run the full suite and the type check.** Run: `npm test` and `npx tsc --noEmit`. Expected: PASS, no new type errors. Existing DTO tests must accept the new field: update fixtures only where they deep-equal the DTO.
- [ ] **Step 5: Commit.** `git commit -m "feat: store imported figure briefs and keep them in sync with the question image"`

---

### Task 6: Auto-draw after import

**Files:**
- Modify: `app/api/ai/prompt-to-figure/route.ts` (run objects through `normalizeFigureObjects(objects, canvasWidth, canvasHeight)` from `lib/gemini.ts`)
- Create: `src/lib/autoDrawFigures.ts` (client-only)
- Modify: `src/components/PaperImportModal.tsx` (~L276-300, both branches)
- Test: `src/lib/auto-draw-figures.test.ts`

**Interfaces:**
- Consumes: import response `figuresNeeded` (Task 5); PATCH `{ imagePath, figureAutoDrawn: true }` (Task 5).
- Produces:
  ```ts
  export interface AutoDrawDeps {
    promptToFigure(description: string): Promise<{ isMock: boolean; objects: unknown[] }>;
    renderAndUpload(objects: unknown[]): Promise<string>;              // returns imagePath
    patchQuestion(id: string, body: { imagePath: string; figureAutoDrawn: true }): Promise<void>;
    onProgress?(done: number, total: number): void;
  }
  export async function autoDrawFigures(items: { questionId: string; description: string }[], deps: AutoDrawDeps): Promise<{ drawn: number; skipped: number }>
  ```
  The items run one at a time. The first `isMock: true` result stops the pass, and every remaining item counts as skipped. Empty `objects`, or a throw, skips that item and the pass continues. No retries.
- `renderAndUpload` copies the body of `AIPaperGeneratorModal.tsx` L352-364 (Doc → `renderDocToBlob` → `embedSceneInPng` → `uploadImage`). Extract it into an exported helper in `autoDrawFigures.ts` and have `AIPaperGeneratorModal` call that helper, so the code lives in one place.
- `promptToFigure` posts to `/api/ai/prompt-to-figure`, with `x-gemini-api-key` from `localStorage.getItem("exam_gemini_api_key")` when present (wrap the read in try/catch).
- In `PaperImportModal`, after the import succeeds and when `figuresNeeded.length > 0`, run `autoDrawFigures`. Show a toast "Drawing figures 2/5". At the end, show "Drew N figure(s); M still need one" when M > 0. Call `onPaperUpdated` once the pass ends. The modal may close before then; the pass must not depend on the modal staying mounted. If closing would unmount it, start the pass before `onClose()` and don't await it in the close path.

- [ ] **Step 1: Write the failing tests** (fake deps)

```ts
test("draws each in order and patches with figureAutoDrawn", async () => { /* 2 items → 2 patch calls, drawn 2 */ });
test("mock result stops the pass and saves nothing", async () => { /* first isMock → drawn 0, skipped 2, no patch */ });
test("a failing item is skipped, the rest continue", async () => { /* renderAndUpload throws on #1 → drawn 1, skipped 1 */ });
test("empty objects skipped", async () => {});
```

- [ ] **Step 2: Run to verify fail.** Run: `npx vitest run src/lib/auto-draw-figures.test.ts`.
- [ ] **Step 3: Implement** the helper, the route normalization and the modal wiring.
- [ ] **Step 4: Run tests and type check.** Run: `npm test` and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: auto-draw imported figure descriptions after import"`

---

### Task 7: "Figure needed" and "Auto-drawn" in the workbench

**Files:**
- Modify: `src/app/(app)/papers/[id]/page.tsx` (question card above `<QuestionView` ~L1993; reuse `setDiagramModalItem`, `setEditingItem`)
- Test: browser check (below). Workbench card logic has no unit seam beyond `parseFigureBrief`, which Task 5 covers.

**Interfaces:**
- Consumes: `QuestionDto.figureBrief` (Task 5), `autoDrawFigures` + its default deps (Task 6), PATCH `figureAutoDrawn: false` (Task 5).

- [ ] **Step 1: Implement the badges.** These are workbench-only: they sit outside `QuestionView`, so nothing prints.
  - When `figureBrief?.needsFigure && !question.imagePath`, show an amber "Figure needed" badge and the description in small text. Its actions:
    - "Auto-draw": runs `autoDrawFigures([{questionId, description}], defaultDeps)`. On a mock result, show the toast "Set an AI key to auto-draw".
    - "Search diagrams": opens `DiagramSearchModal` through `setDiagramModalItem`, with the description as `initialQuery`.
    - "Add / draw figure": opens the edit form through `setEditingItem` (it already offers upload and Figure Studio).
  - When `figureBrief?.autoDrawn && question.imagePath`, show a note "Auto-drawn — check it" with a "Looks right" button that PATCHes `{ figureAutoDrawn: false }`.
  - Do the same for the OR question.
- [ ] **Step 2: Verify in the browser.** Start the dev server via `preview_start`. On a paper, import a reply where one question has `"figure": "Right triangle ABC, right angle at B, AB = 3 cm, BC = 4 cm"` and one mentions "the given figure" without one. Expected: the import report shows one missing-figure warning. With no key, the first question shows "Figure needed" and the print preview shows no badge and no empty box. With a key, the figure is drawn, the note shows, and "Looks right" clears it. Then import the user's match fixture (spec C) and confirm two columns render.
- [ ] **Step 3: Run the full suite.** Run: `npm test` and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 4: Commit.** `git commit -m "feat: workbench shows figure-needed and auto-drawn badges"`
