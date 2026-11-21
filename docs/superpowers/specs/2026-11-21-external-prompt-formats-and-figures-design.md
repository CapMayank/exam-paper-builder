# External paper prompt: per-type formats, match fix, figures — design

Date: 2026-11-21

## Intent and why

Teachers use the "copy prompt → paste the chat AI's reply back" import (`src/lib/externalPaperPrompt.ts` builds the
prompt; `src/lib/paperImport.ts` + `app/api/papers/[id]/import-questions/route.ts` read the reply). Replies come
back in shapes the importer misreads, because the prompt shows a JSON example for the first section's type only
and describes every other type in one sentence. The visible failure: a Match the Columns question rendered with a
single column. Questions that refer to a figure ("in the given figure") also arrive with no figure and nowhere to
put one.

Goal: whatever subject and question types a paper has, the prompt tells the AI the exact shape for each type, the
importer reads it correctly, and figures come through as a description the app can draw or the teacher can fill.

## Goals

1. Every question type in `QUESTION_TYPE_LABEL` (`src/lib/constants.ts`, 28 types incl. `KDG_*`, `DRAW`,
   `MAP_WORK`, `GRAMMAR`, `WRITING_SKILL`) has a format rule and a JSON example skeleton.
2. The prompt includes the rule + skeleton for each type the paper actually uses (not all 28), so it stays short.
3. Match the Columns imports with both columns, from new replies and from old-shape replies like the one below.
4. A question that needs a figure carries a `figure` description through import; the app auto-draws it when a
   real AI key is available, and otherwise flags it "Figure needed" with one-click ways to add it.

## Non-goals

- The AI returning images, image URLs or SVG (decided: description only; AI image links are mostly invented or
  break).
- Changing the in-app generator (`lib/gemini.ts`) prompts.
- New question types.

## Anti-goals

- Example skeletons containing real subject content — the AI copies it into papers of other subjects. Skeletons
  use placeholders like `<Column I item>`.
- A prompt so long that chat AIs truncate or ignore it.
- Auto-drawn figures silently treated as final: they are always shown for the teacher to check.

## Root cause of the match bug (verified by reading the code)

Reply text: `"Match the items in Column A with their corresponding equivalents in Column B:\n(A) ...\n(B) ..."` with
Column II in `options`. In `src/lib/constants.ts`, `extractColumnIIItems` tests each line with `col2Regex`; the
instruction line names "Column B", so it is taken as the Column II header and every following `(A)..(F)` line is
collected as Column II. `extractColumnIItems` also collects `(A)..(F)` (no explicit Column I header). So
`parseMatchColumnPairs` takes branch 3a ("both columns in text"), pairs each item with itself, and ignores
`options`. `getMatchColumnInstruction` has the same weakness.

## Approaches considered

1. **Per-type example skeletons in the prompt + harden the importer.** Picked as the base.
2. **Importer only: accept and repair any shape.** Rejected: endless guessing, and KDG/DRAW types would still be
   wrong because the AI was never told their shape.
3. **Approach 1 + auto-draw imported figure descriptions when an AI key is set.** **Chosen by the user.** Reuses the
   existing `promptToFigureSceneWithGemini` / `POST /api/ai/prompt-to-figure`.

## Design

### A. Type format catalogue

- New pure module (e.g. `src/lib/externalTypeFormats.ts`): for each type, `{ rule: string; example: object }`.
  `rule` replaces today's `typeFormat()` sentences (keep their content, extend it); `example` is one question
  object with placeholders, in the exact importer shape (`text`, `type`, `marks`, `chapterNumber`,
  `chapterTitle`, `difficulty`, `options`, `subparts`, `orQuestion`, `attemptCount`, `figure` where relevant).
- Language-aware where the type depends on it (Hindi/Sanskrit column headings per `languageRule()`).
- A test asserts every key of `QUESTION_TYPE_LABEL` has an entry, so a new type can't be added without one.
- The KDG / DRAW / MAP_WORK rules must match how those types are stored and rendered today (read
  `QuestionView.tsx`, `QuestionForm.tsx`, `diagram-rules.ts` for each). Where a KDG type is inherently pictorial,
  its rule asks for a `figure` description (see C).

### B. Prompt changes (`externalPaperPrompt.ts`)

- "## Question formats": for each type used, its rule followed by its example skeleton in a small ```json block.
- "## Reply format": keep one overall envelope example (`title`, `sections[]`), no longer tied to the first
  section's type.
- OR question example carries `type`, `chapterTitle`, `subparts` (today it omits them).
- Subparts example shown for SHORT/LONG when the rule allows subparts, not only for passage types.
- MATCH_COLUMN rule asks for the shape the parser reads unambiguously: an instruction line that does not need to
  name the columns, then Column I items `(A) ...` in `text`, Column II in `options` (shuffled, same count). Exact
  wording is the builder's call as long as the parser test (below) passes on it.
- Figure rule (shared): "If and only if the question refers to a figure, diagram, graph, map or picture, add
  `"figure": "<exact description: what to draw, every label, every value/measurement, nothing that gives away the
  answer>"`. Never write 'in the figure' without a `figure`."

### C. Match parser fix (`src/lib/constants.ts`)

- A line that mentions both Column I and Column II names (any of I/A/1 and II/B/2, plus the Hindi/Sanskrit forms
  already in the regexes) is an instruction line, not a column header — in `extractColumnIItems`,
  `extractColumnIIItems` and `getMatchColumnInstruction`.
- Optional hardening (builder's call): a header line is only a header if it is short / ends after the column
  name (e.g. `Column B` or `Column II:`), not a sentence.
- Regression test using the user's exact reply: 6 pairs, left = (A)..(F) items, right = the 6 `options`.
  Fixture (verbatim as pasted):

```json
{
  "text": "Match the items in Column A with their corresponding equivalents in Column B:\n(A) $(x + y + z)^2$\n(B) $x^3 + y^3$\n(C) $x^3 - y^3$\n(D) $x^3 + y^3 + z^3 - 3xyz$\n(E) Zero of the linear polynomial $ax + b$ ($a \\neq 0$)\n(F) Factorisation of $x^2 - 9y^2$",
  "type": "MATCH_COLUMN", "marks": 6, "chapterNumber": 2, "chapterTitle": "Polynomials", "difficulty": "MEDIUM",
  "options": [
    "$(x - y)(x^2 + xy + y^2)$",
    "$-\\frac{b}{a}$",
    "$x^2 + y^2 + z^2 + 2xy + 2yz + 2zx$",
    "$(x - 3y)(x + 3y)$",
    "$(x + y)(x^2 - xy + y^2)$",
    "$(x + y + z)(x^2 + y^2 + z^2 - xy - yz - zx)$"
  ]
}
```

### D. Figures through import

- `ImportedPaperQuestion` (and its `orQuestion`) gains `figure?: string`. `paperImport.ts` parses it (trimmed,
  non-empty string) for JSON imports; CSV/text formats may ignore it.
- Storage: no new column. Store the description in the existing `Question.figureScene` as a figure doc
  `{ summary: <description>, canvasWidth: 640, canvasHeight: 360, objects: [], needsFigure: true }` — the
  in-app generator's `figureDoc` shape (`lib/gemini.ts`) plus an explicit flag. *(My call: an explicit
  `needsFigure` flag inside the JSON, not derived from empty `objects`, so a scene a teacher cleared on purpose is
  not mistaken for one awaiting a figure. No schema change.)* "Figure needed" = `needsFigure === true` and no
  `imagePath`. Saving a figure (upload, diagram pick, Figure Studio save, auto-draw) clears `needsFigure`.
- Render guard: not needed. Verified while planning: nothing renders or exports `figureScene`; papers print only
  `imagePath` (`QuestionView.tsx`). A drawn figure therefore has to become an uploaded PNG (see E), as the in-app
  generator already does in `AIPaperGeneratorModal.tsx`.
- Import warning: a question whose text, any subpart, or its OR question refers to a figure with no `figure`
  field gets a warning in the import report. Keywords: "figure" (not "figure out"), "diagram", "graph", "given
  map", "picture", Hindi/Sanskrit "चित्र", "आकृति". *(My call: include subparts and OR.)*

### E. Auto-draw (approach 3)

- After a successful import, the client draws each imported "Figure needed" question one at a time by calling
  `/api/ai/prompt-to-figure` with the description, then saves the returned objects into that question's
  `figureScene` (keeping `summary`, clearing `needsFigure`, setting `autoDrawn: true`). Run after import, not
  inside the import transaction, so a slow or failing draw never fails the import.
- Key: the browser's `exam_gemini_api_key` sent as `x-gemini-api-key`, else the server's configured key
  (`getGeminiApiKey`). Verified while planning: there is no per-user saved key in the schema, and
  `prompt-to-figure` already falls back to the server key. A result with `isMock: true` means no key resolved: stop
  the pass.
- Drawing = objects from `prompt-to-figure` (run through `normalizeFigureObjects`) → `renderDocToBlob` →
  `embedSceneInPng` → `uploadImage` → `PATCH /api/questions/:id { imagePath, figureAutoDrawn: true }`.
- Mock results (`isMock: true`) are never saved; those questions stay "Figure needed".
- Progress shown ("Drawing figures 2/5"); failures leave the question flagged, no retry loop.

### F. "Figure needed" in the workbench

- On a flagged question: a badge "Figure needed" plus the description, and actions that open the existing tools
  with the description prefilled: Upload image, Search diagrams (`DiagramSearchModal`, `initialQuery` =
  description), Draw in Figure Studio, and "Auto-draw" when a key is set.
- Auto-drawn figures show a small "Auto-drawn — check it" note while `figureScene.autoDrawn === true`; editing in
  Figure Studio or clicking "Looks right" clears it. *(My call: persisted inside the figureScene JSON.)* Print and
  DOCX ignore `autoDrawn` and `needsFigure`.

### G. Which types always need a figure

- Builder decides per type by reading its renderer: a type whose rendered question cannot exist without a picture
  (e.g. picture-count, picture-match, tick-the-picture, colour, join-dots, map work) gets `figure` as a required
  field in its skeleton and rule; other types use the general "only if the question refers to one" rule.
  *(My call: decided from the renderers, listed in the plan for review.)*

## Constraints

- Next.js here differs from training data: read `node_modules/next/dist/docs/` before touching routes (AGENTS.md).
- Prompt stays usable in ChatGPT/Claude/Gemini apps: skeleton count = types used in the paper only.
- Existing imports, prompts for blueprints (`app/api/blueprints/[id]/external-prompt/route.ts`) and the many
  existing tests (`paperImport.test.ts`, `paper-import-units.test.ts`, match-related tests) keep passing.

## Left to the builder

- Exact rule wording and placeholder text per type.
- Module/file names, UI layout of the badge and actions.
- Whether the blueprint-level external prompt shares the catalogue (it should if it builds the same prompt).
