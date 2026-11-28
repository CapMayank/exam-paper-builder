# Similar-question check while writing — design

Date: 2026-11-28
Status: draft, awaiting approval

## Why

When a teacher writes a new question in the paper workbench ("Write new" tab of the question picker), nothing compares it with the bank. Three things go wrong today:

1. **Students see a repeat.** A question already used in an earlier exam this session gets retyped and lands on the paper as a "new" question, so its usage history (and the "Exhausted in Earlier Exam" badge) never shows.
2. **The bank fills with duplicates.** Save always creates a new row; the only duplicate tool is the after-the-fact finder on the Question Bank page.
3. **Retyping is wasted work.** The question was already in the bank and could have been picked.

## Goals

- While typing, show up to 3 bank questions from the same book that closely match the text.
- On each match, show whether students already saw it this session (and in which exam).
- One click to use the bank question instead of saving a new one (paper workbench only).
- Ask "Save anyway?" when the text is near-identical to a bank question.
- No noticeable extra server load: no database search per keystroke, no loading full questions with usage history for the whole book.

## Non-goals

- Checking questions created by paste, AI generation, bulk import or the import routes (that is the later server-side "approach B").
- Catching paraphrases with different wording (no embeddings/AI).
- Changing the Question Bank page's duplicate finder beyond moving its scoring into the shared helper.
- Blocking the save. The teacher always has the last word.

## Anti-goals (would make this a failure even if it works)

- Typing feels laggy, or the panel flickers on every keystroke.
- The panel shouts on short or generic text ("Define the following terms") and teachers learn to ignore it.
- Hindi or other non-Latin questions are never matched (the current finder's normalizer strips everything outside `a-z0-9`).

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Load a lean list of the book's question texts once when the form opens; match in the browser; fetch full details only for the top matches. | Cheap and instant; only covers the Write form. |
| B | Server check at save time for every creation path. | Covers paste/AI/import, but warns only after the whole question is typed. Planned later. |
| C | A + B together. | Most complete, about twice the work. |

Technology alternatives rejected for now:

- **SQLite FTS5** — indexed server search, but needs raw SQL outside Prisma, sync triggers, a request per typing pause, and ranks by keywords rather than similarity. Worth it only at tens of thousands of questions per book.
- **Stored fingerprint column** (normalized text / hash) — instant exact-match lookup; belongs with approach B.
- **Embeddings (Gemini)** — catches paraphrases but costs an API call per check, adds latency, and spends the Gemini quota. Not worth it here.

## Design

### 1. Shared similarity helper — `src/lib/questionSimilarity.ts`

- `normalizeQuestionText(text)`: lowercase, strip LaTeX macros, strip HTML/markup, replace anything that is not a Unicode letter or number (`\p{L}\p{N}` with the `u` flag) with a space, collapse spaces. Devanagari matras are marks (`\p{M}`), so keep `\p{M}` too or Hindi words split apart.
- `questionTokens(text)`: the set of normalized words, dropping very short tokens (builder's call on the length rule; it must not drop most Hindi words).
- `similarity(a, b)`: Dice coefficient on token sets (same maths as the current finder), 1.0 for identical normalized text.
- `findSimilar(text, candidates, { limit, minScore, excludeIds })`: returns the top matches with their scores. Precompute candidate tokens once per list, not per keystroke.
- `QuestionDuplicateModal` switches to this helper and keeps its 0.75 threshold.

### 2. Lean text list — new `GET /api/questions/texts?bookId=…`

- Returns `[{ id, type, chapterId, text }]` for the book. `select` only those columns, with no joins. Same auth/scope wrapper as the existing questions route, and the same exclusion of shuffled variant clones (`VARIANT_MARKER`).
- **Version tag:** the response carries an `ETag` (hash of the returned body). The client sends `If-None-Match` and gets `304` when nothing changed. The query still runs (index-backed on `bookId`), but the transfer is saved. *Builder's call, flagged:* `Question` has no `updatedAt` column, so a cheaper "has anything changed" check would need a migration; not doing that now.
- Client cache: a module-level map `bookId → { etag, items, tokens }`, so reopening the picker or switching books in the bank page reuses it. A question saved from the form is added to the cached list locally.

### 3. Details for the top matches — `ids=` on the existing `GET /api/questions`

- `GET /api/questions?ids=a,b,c` returns full `QuestionDto`s, including usages, for just those questions (cap the list, e.g. 10). Cache results by id for the life of the form.

### 4. The panel in `QuestionForm`

- Runs only when the text has at least ~4 meaningful words, about 400 ms after typing stops.
- Shows "Similar in bank" with up to 3 matches at ≥ 0.6 similarity: the rendered question (same `QuestionView`/`MathText` as the bank list), its chapter, the similarity percentage, and usage tags:
  - red **"Students saw this — <exam>"** when `isExhaustedUsage` is true (finalized exam, same session, class and subject);
  - amber **"In <exam> this session"** for other `findFreshnessConflicts` hits (drafts);
  - **"Already on this paper"** when it is on the current paper.
- In edit mode the question being edited is excluded.
- The panel is quiet, not a modal: collapsed into one line ("2 similar questions in the bank") when the best match is below 0.75, open above that.
- New optional props, so the form stays usable without a paper:
  - `paperContext?: CurrentPaperContext` — enables the session tags.
  - `onUseExisting?: (q: QuestionDto) => Promise<void> | void` — shows **Use this instead** on each match.
  - `useExistingBlockedReason?: (q: QuestionDto) => string | null` — when it returns a reason, the button is disabled with that reason as its tooltip.

### 5. Wiring in `QuestionPicker`

- Passes `paperContext={paper}`, `onUseExisting={(q) => add(q.id)}` and a blocked-reason function built from the same rules as the bank list's `why` (already on this paper, type not allowed, OR chapter lock, marks/subparts, `whyCannotAdd`). The best way is to pull the per-question part of `ranked`'s `why` into a function that both use.
- Works for every picker mode (add, replace, set OR question), because `add()` already handles them.
- On success the picker closes as it does for a bank pick; the typed text is discarded.

### 6. "Save anyway?"

- On submit, if the best match is ≥ 0.9 and the teacher has not already confirmed for this text, show the existing `useConfirm` dialog: "This looks the same as a question already in the bank (Ch N, used in <exam>). Save a new copy anyway?" with buttons **Save anyway** and **Cancel**.
- Applies on the Question Bank page too.

### 7. Question Bank page

- Same form, no `paperContext` or `onUseExisting`: shows matches and the "Save anyway?" prompt, no session tags, no "use instead" button.

## Constraints

- The project's Next.js version differs from common knowledge; read `node_modules/next/dist/docs/` before writing the route handler (headers/`304` handling, route segment rules for `questions/texts` next to `questions/[id]`).
- The shared `route()` wrapper in `src/lib/api.ts` passes a returned `Response` through unchanged, so the handler can return its own `ETag` header and a `304`.
- A `304` has `ok === false`, so the client `api()` helper in `src/lib/client` would treat it as an error. Make the lean-list request with a plain `fetch` (same credentials) that handles `304`, or teach `api()` about it.
- Typing must stay smooth: matching against a few thousand precomputed token sets per pause is fine; recomputing tokens per keystroke is not.

## Testing

- Unit tests for `questionSimilarity.ts`: identical text, reordered words, LaTeX noise, Hindi text, short/generic text below the word minimum, ranking and `excludeIds`.
- Route tests in the style of the existing API tests: lean list shape, variant exclusion, `304` on matching `ETag`, `ids=` returns usages.
- A check that `QuestionDuplicateModal` still finds the same pairs after the move.

## Left to the builder

- Exact thresholds after trying them on real bank data (start at 0.6 show, 0.75 open, 0.9 confirm).
- Short-token rule and LaTeX/markup stripping details.
- Panel styling, within the existing picker look.
