# Similar-Question Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** While a teacher types a new question, show up to 3 close matches from the same book's bank, flag ones students already saw this session, offer "Use this instead" in the paper workbench, and ask "Save anyway?" for near-identical text.

**Architecture:** A shared pure similarity helper (Unicode-aware token Dice score). The form loads a lean `{id,type,chapterId,text}` list for the book once (ETag/304 on reopen), matches in the browser after a typing pause, and fetches full `QuestionDto`s (with usages) only for the top matches via a new `ids=` option on `GET /api/questions`. `QuestionPicker` passes the paper context, a use callback and a blocked-reason function into `QuestionForm`.

**Tech Stack:** Next.js route handlers (project's own Next version — read `node_modules/next/dist/docs/` before writing a route), Prisma on SQLite, React client components, Vitest (node environment, no DOM testing library).

**Spec:** `docs/superpowers/specs/2026-11-28-similar-question-check-design.md`

## Global Constraints

- Thresholds: show matches at similarity ≥ 0.6, panel open at ≥ 0.75, "Save anyway?" at ≥ 0.9; at most 3 matches; matching only once the text has ≥ 4 tokens; run ~400 ms after typing stops.
- `QuestionDuplicateModal` keeps its 0.75 threshold.
- No database query per keystroke. The lean list endpoint selects only `id, type, chapterId, text` with no joins.
- `ids=` accepts at most 10 ids.
- Shuffled variant clones (`subpartsJson` contains `VARIANT_MARKER`) are excluded from the lean list, as in the existing GET.
- Hindi/Devanagari text must tokenize (keep `\p{L}`, `\p{M}`, `\p{N}`).
- The form must work unchanged where the new props are not passed (Question Bank page, `PaperQuestionEditModal`).
- Work on branch `feat/similar-question-check`, never on `main`.

## Review Focus

1. **Hindi question text** — a Hindi question retyped with small changes is matched (test in Task 1).
2. **Short or generic text** ("Define the following.") — no panel below 4 tokens (test in Task 1, `findSimilar` returns `[]`).
3. **Editing an existing question** — the question being edited never matches itself (test in Task 1 via `excludeIds`; wiring in Task 5).
4. **Bank changed since the list was cached** (a question saved from this form) — the new question is in the cached list right away and does not trigger a full refetch (test in Task 4).
5. **A match the slot cannot take** (wrong type, already on this paper) — "Use this instead" is disabled with the reason, not a failed request (Task 6, checked in the browser in Task 7).

---

### Task 1: Shared similarity helper

**Files:**
- Create: `src/lib/questionSimilarity.ts`
- Create: `src/lib/questionSimilarity.test.ts`
- Modify: `src/components/QuestionDuplicateModal.tsx:10-34` (delete the local `normalizeForComparison`/`computeSimilarity`, import from the helper)

**Interfaces:**
- Produces:
  - `normalizeQuestionText(text: string): string`
  - `questionTokens(text: string): Set<string>`
  - `similarity(a: string | Set<string>, b: string | Set<string>): number` — 0..1, Dice on token sets, 1 when normalized texts are equal
  - `type SimilarCandidate = { id: string; text: string; tokens?: Set<string> }`
  - `prepareCandidates<T extends { id: string; text: string }>(items: T[]): (T & { tokens: Set<string> })[]`
  - `findSimilar<T extends SimilarCandidate>(text: string, candidates: T[], opts?: { limit?: number; minScore?: number; excludeIds?: string[]; minTokens?: number }): { item: T; score: number }[]` — defaults `limit 3`, `minScore 0.6`, `minTokens 4`; sorted by score desc
  - constants `SIMILAR_SHOW = 0.6`, `SIMILAR_OPEN = 0.75`, `SIMILAR_CONFIRM = 0.9`, `SIMILAR_MIN_TOKENS = 4`

- [ ] **Step 1: Create the branch**

Run: `git switch -c feat/similar-question-check`
Expected: `Switched to a new branch 'feat/similar-question-check'`

- [ ] **Step 2: Write the failing tests** in `src/lib/questionSimilarity.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { findSimilar, normalizeQuestionText, prepareCandidates, questionTokens, similarity } from "./questionSimilarity";

describe("questionSimilarity", () => {
  it("scores identical text after normalization as 1", () => {
    expect(similarity("What is Photosynthesis?", "what is  photosynthesis")).toBe(1);
  });
  it("ignores LaTeX macros and punctuation", () => {
    expect(normalizeQuestionText("Find \\frac{1}{2} of 10.")).toBe(normalizeQuestionText("Find {1}{2} of 10"));
  });
  it("tokenizes Hindi text", () => {
    expect(questionTokens("प्रकाश संश्लेषण क्या है? समझाइए।").size).toBeGreaterThanOrEqual(3);
    expect(similarity("प्रकाश संश्लेषण क्या है? समझाइए।", "प्रकाश संश्लेषण क्या होता है? समझाइए।")).toBeGreaterThan(0.6);
  });
  it("returns nothing below the token minimum", () => {
    const c = prepareCandidates([{ id: "a", text: "Define the following." }]);
    expect(findSimilar("Define the following.", c)).toEqual([]);
  });
  it("ranks, limits to 3 and excludes ids", () => {
    const c = prepareCandidates([
      { id: "self", text: "Explain the process of photosynthesis in green plants" },
      { id: "a", text: "Explain the process of photosynthesis in plants" },
      { id: "b", text: "Explain photosynthesis process in green plants briefly" },
      { id: "c", text: "Explain the process of photosynthesis in green leaves" },
      { id: "d", text: "Explain the process of photosynthesis in green algae" },
      { id: "far", text: "Name the capital of India" },
    ]);
    const r = findSimilar("Explain the process of photosynthesis in green plants", c, { excludeIds: ["self"] });
    expect(r).toHaveLength(3);
    expect(r.map((m) => m.item.id)).not.toContain("self");
    expect(r.map((m) => m.item.id)).not.toContain("far");
    expect(r[0].score).toBeGreaterThanOrEqual(r[1].score);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/lib/questionSimilarity.test.ts`
Expected: FAIL, cannot resolve `./questionSimilarity`

- [ ] **Step 4: Implement `src/lib/questionSimilarity.ts`**

Normalize: lowercase → strip `\\[a-zA-Z]+` → strip HTML tags → replace `[^\p{L}\p{M}\p{N}\s]` (flag `u`) with space → collapse spaces → trim. Tokens: split on space, keep tokens whose length (in code points, `[...t].length`) is ≥ 2 and that are not pure single digits. `findSimilar` computes the query tokens once and uses `candidate.tokens` when present.

- [ ] **Step 5: Point `QuestionDuplicateModal` at the helper** — replace `computeSimilarity(q1.text, q2.text)` with `similarity(q1.text, q2.text)`, keep `sim >= 0.75`.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/lib/questionSimilarity.test.ts`
Expected: 5 passed

- [ ] **Step 7: Commit** (include the spec and this plan)

```bash
git add src/lib/questionSimilarity.ts src/lib/questionSimilarity.test.ts src/components/QuestionDuplicateModal.tsx docs/superpowers/specs/2026-11-28-similar-question-check-design.md docs/superpowers/plans/2026-11-28-similar-question-check.md
git commit -m "feat(questions): shared Unicode-aware similarity helper"
```

---

### Task 2: Lean text list endpoint with ETag

**Files:**
- Create: `src/app/api/questions/texts/route.ts`
- Create: `src/lib/question-texts-api.test.ts`

**Interfaces:**
- Produces: `GET /api/questions/texts?bookId=<id>` → `200` JSON `QuestionText[]` with header `ETag: "<hash>"`, or `304` with empty body when `If-None-Match` equals that tag; `400` without `bookId`.
- Produces: `export type QuestionText = { id: string; type: string; chapterId: string; text: string }` — put it in `src/lib/types.ts` next to `QuestionDto`.

- [ ] **Step 1: Write the failing tests** in `src/lib/question-texts-api.test.ts`, following the session-mock and `call` helper pattern of `src/lib/flexible-marks-api.test.ts` (create a user, book, chapter; clean up in `afterAll`).

Tests:
- `returns only id, type, chapterId and text for the book` — create 2 questions in the book and 1 in another book; expect 2 items, `Object.keys(item).sort()` equals `["chapterId","id","text","type"]`.
- `excludes shuffled variant clones` — a question whose `subpartsJson` contains `VARIANT_MARKER` is not returned.
- `returns 304 when the ETag matches` — first call's `res.headers.get("ETag")` is truthy; second call with `If-None-Match` set to it gives `status 304`.
- `changes the ETag after a question's text changes` — update one question's text; the new ETag differs.
- `rejects a request without bookId` — `status 400`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/question-texts-api.test.ts`
Expected: FAIL, cannot resolve `@/app/api/questions/texts/route`

- [ ] **Step 3: Implement the route** with the shared `route()` wrapper from `src/lib/api.ts` (it passes a returned `Response` through). Query: `prisma.question.findMany({ where: { bookId, NOT: { subpartsJson: { contains: VARIANT_MARKER } } }, select: { id, type, chapterId, text }, orderBy: { id: "asc" } })`. ETag: SHA-1 (`node:crypto`) of the JSON body, quoted. Return `new Response(null, { status: 304, headers: { ETag } })` on match, else `Response.json(rows, { headers: { ETag, "Cache-Control": "private, no-cache" } })`. Throw `HttpError(400, …)` without `bookId`. Confirm the static `texts` segment resolves ahead of `[id]` in this Next version's docs.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/question-texts-api.test.ts`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/api/questions/texts/route.ts src/lib/question-texts-api.test.ts src/lib/types.ts
git commit -m "feat(questions): lean text list for the similar-question check"
```

---

### Task 3: `ids=` on `GET /api/questions`

**Files:**
- Modify: `src/app/api/questions/route.ts` (in `GET`, next to the `bookIds` handling around line 118)
- Test: add to `src/lib/question-texts-api.test.ts`

**Interfaces:**
- Produces: `GET /api/questions?ids=a,b,c` → `QuestionDto[]` (with `usages`) for just those ids, first 10 ids only. Combines with `bookId` and other filters as an extra `AND`. Variant clones are still excluded.

- [ ] **Step 1: Write the failing tests**
  - `ids= returns just those questions with usages` — put one question on a paper (create paper + `paperQuestion` row, or reuse the fixture helpers in the flexible-marks test); `GET /api/questions?ids=<q1>,<q2>` returns 2 items and q1's `usages` has length 1.
  - `ids= caps the list at 10` — send 12 ids of existing questions; expect ≤ 10 items.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/question-texts-api.test.ts -t "ids="`
Expected: FAIL (returns every question, not 2)

- [ ] **Step 3: Implement** — `const idsParam = sp.get("ids")`; when present, `addAnd(where, { id: { in: idsParam.split(",").filter(Boolean).slice(0, 10) } })`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/question-texts-api.test.ts`
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/api/questions/route.ts src/lib/question-texts-api.test.ts
git commit -m "feat(questions): fetch bank questions by id"
```

---

### Task 4: Client cache, matching hook and usage tags

**Files:**
- Create: `src/lib/similarQuestionsClient.ts` (cache and fetches; no React)
- Create: `src/lib/similarQuestionsClient.test.ts`
- Create: `src/components/useSimilarQuestions.ts` (React hook)

**Interfaces:**
- Consumes: `prepareCandidates`, `findSimilar`, constants (Task 1); `QuestionText` and both endpoints (Tasks 2–3); `isExhaustedUsage`, `findFreshnessConflicts`, `CurrentPaperContext` from `src/components/QuestionUsageHistory.tsx`.
- Produces (`src/lib/similarQuestionsClient.ts`):
  - `loadBookTexts(bookId: string, fetcher?: typeof fetch): Promise<PreparedText[]>` where `PreparedText = QuestionText & { tokens: Set<string> }`. Uses a module-level `Map<bookId, { etag: string; items: PreparedText[] }>`; sends `If-None-Match` when cached; on `304` returns the cached items. Uses plain `fetch` (the `api()` helper throws on `304`).
  - `rememberSavedQuestion(q: { id: string; bookId: string; type: string; chapterId: string; text: string }): void` — upserts into that book's cached list (replaces by id).
  - `loadQuestionDetails(ids: string[]): Promise<QuestionDto[]>` — returns cached DTOs and fetches only the missing ids via `api('/api/questions?ids=…')`.
  - `usageTag(q: QuestionDto, paper?: CurrentPaperContext | null): { tone: "red" | "amber"; label: string } | null` — red `Students saw this — <paperTitle>` when any usage `isExhaustedUsage`, else amber `In <paperTitle> this session` for the first `findFreshnessConflicts` hit, else `null`. No paper → `null`.
  - `__resetSimilarCacheForTests(): void`
- Produces (`src/components/useSimilarQuestions.ts`):
  - `useSimilarQuestions(args: { bookId: string; text: string; excludeId?: string; enabled?: boolean }): { matches: { question: QuestionDto; score: number }[]; best: number }` — loads texts once per `bookId`, debounces 400 ms on `text`, runs `findSimilar` with `excludeIds: [excludeId]`, then `loadQuestionDetails` for the hits; `best` is the top score (0 when none). Drops stale results when `text` changed while details were loading.

- [ ] **Step 1: Write the failing tests** in `src/lib/similarQuestionsClient.test.ts` with a fake `fetcher`:
  - `sends If-None-Match on the second load and reuses the cache on 304` — first fake response `200` + `ETag "v1"` + 2 items; second call asserts the request header `If-None-Match` is `"v1"` and responds `304`; result still has 2 items.
  - `rememberSavedQuestion adds a question without refetching` — after one load, `rememberSavedQuestion` a new id; the next `loadBookTexts` call (fake replies `304`) returns 3 items with tokens.
  - `usageTag prefers the finalized-exam tag` — a DTO with one FINAL usage in the same session/class/subject and one draft usage gives `tone "red"` and a label containing the finalized paper's title; with only the draft usage, `tone "amber"`; with no paper, `null`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/similarQuestionsClient.test.ts`
Expected: FAIL, cannot resolve `./similarQuestionsClient`

- [ ] **Step 3: Implement `src/lib/similarQuestionsClient.ts`**, then `src/components/useSimilarQuestions.ts` (hook untested by Vitest; exercised in Task 7).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/similarQuestionsClient.test.ts`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/similarQuestionsClient.ts src/lib/similarQuestionsClient.test.ts src/components/useSimilarQuestions.ts
git commit -m "feat(questions): client-side similar-question matching with a cached text list"
```

---

### Task 5: Panel in `QuestionForm` and "Save anyway?"

**Files:**
- Create: `src/components/SimilarQuestionsPanel.tsx`
- Modify: `src/components/QuestionForm.tsx` (props block ~line 172; render under the question text field near `MathToolbar` ~line 973; `submit` ~line 492; call `rememberSavedQuestion` after a successful save ~line 515)

**Interfaces:**
- Consumes: `useSimilarQuestions`, `usageTag`, `rememberSavedQuestion` (Task 4); `SIMILAR_OPEN`, `SIMILAR_CONFIRM` (Task 1); `QuestionView` from `src/components/QuestionView.tsx`; `useConfirm` from `src/components/ui.tsx`.
- Produces — new optional `QuestionForm` props:
  - `paperContext?: CurrentPaperContext`
  - `onUseExisting?: (q: QuestionDto) => Promise<unknown> | void`
  - `useExistingBlockedReason?: (q: QuestionDto) => string | null`
- Produces — `SimilarQuestionsPanel({ matches, best, paperContext, onUseExisting, blockedReason }): JSX.Element | null`.

Behaviour decided here:
- Panel hidden when `matches` is empty. Collapsed to one line (`"N similar question(s) in the bank"`, click to expand) when `best < SIMILAR_OPEN`; open otherwise. Each match: `QuestionView`, `Ch <n>`, `<score>% similar`, the `usageTag` chip (red/amber), the blocked reason as muted text, and a **Use this instead** button when `onUseExisting` is passed (disabled with the reason as `title` when blocked; shows a spinner while its promise runs).
- `excludeId` is `initial?.id`. The check is off (`enabled: false`) when `customSaveHandler` is set (editing a question placed on a paper).
- "Save anyway?": in `submit`, after validation, when there is no `initial?.id`, `best >= SIMILAR_CONFIRM` and the teacher has not already confirmed this exact text, call `confirm({ title: "This question is already in the bank", message: "It looks the same as Ch <n>: “<first 80 chars>”<, used in <paperTitle>>. Save a new copy anyway?", confirmLabel: "Save anyway", cancelLabel: "Cancel" })`; return on cancel. Remember the confirmed text in a ref.
- After a successful POST/PUT, call `rememberSavedQuestion(saved)`.

- [ ] **Step 1: Build the panel and wire the props**
- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: no new errors in the touched files

- [ ] **Step 3: Run the whole suite** (the form is used by many flows)

Run: `npm test`
Expected: all passing, same count as before plus the new tests

- [ ] **Step 4: Commit**

```bash
git add src/components/SimilarQuestionsPanel.tsx src/components/QuestionForm.tsx
git commit -m "feat(questions): show similar bank questions while writing and confirm near-copies"
```

---

### Task 6: Wire the picker

**Files:**
- Modify: `src/components/QuestionPicker.tsx` (the `why` logic in `ranked`, lines ~183–226; the `<QuestionForm>` at ~863)

**Interfaces:**
- Consumes: `QuestionForm` props from Task 5; the picker's existing `add(questionId: string): Promise<boolean>`.
- Produces: `whyCannotUse(q: QuestionDto): string | null` inside `QuestionPicker` (a `useCallback`), holding the body of the current per-question `why` computation; `ranked` calls it so the bank list and the panel give the same reasons.

- [ ] **Step 1: Extract `whyCannotUse`** from `ranked` with no change in behaviour; `ranked` maps `q => ({ q, why: whyCannotUse(q) })`.
- [ ] **Step 2: Pass the props** to the Write-tab `QuestionForm`: `paperContext={paper}`, `useExistingBlockedReason={whyCannotUse}`, `onUseExisting={async (q) => { await add(q.id); }}`. `add` already handles add/replace/OR and closes the picker for replace/OR; for a normal add, call `onClose()` when it returns `true`, matching what a bank pick does.
- [ ] **Step 3: Type-check, lint and run the suite**

Run: `npx tsc --noEmit`, `npm run lint`, `npm test`
Expected: no new errors; all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/QuestionPicker.tsx
git commit -m "feat(papers): use a similar bank question from the write tab"
```

---

### Task 7: Check it in the app

**Files:** none (fix anything found in the owning task's files and commit with `fix:`).

- [ ] **Step 1: Start the dev server** with the Browser preview (`preview_start`; add a `.claude/launch.json` entry for `npm run dev` if missing) and open a paper's workbench.
- [ ] **Step 2: Retype an existing bank question** in Add question → Write new. Expected: the panel appears after the pause, shows the match with its usage chip, and the Network tab shows one `/api/questions/texts` request on open (a `304` on reopening) and one `/api/questions?ids=` request, with no requests per keystroke.
- [ ] **Step 3: Click Use this instead** on a match that fits — it lands on the paper. On a match already on this paper — the button is disabled with "Already used in this paper."
- [ ] **Step 4: Save a near-identical question** — "Save anyway?" appears; Cancel keeps the form; Save anyway saves it.
- [ ] **Step 5: Hindi** — in a Hindi book, retype a question with one word changed; the match appears.
- [ ] **Step 6: Question Bank page** — New question shows matches without session chips or a use button.
- [ ] **Step 7: Take a screenshot** of the panel for the user.
