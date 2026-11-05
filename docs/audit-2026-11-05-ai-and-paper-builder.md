# Audit: AI generation failures and paper-builder gaps (2026-11-05)

Scope: every AI workflow reachable from the paper builder (full paper generation, section AI fill, single-question
Replace with AI, Change OR with AI, answer key, key check, improve question) plus the Edit / Change OR / Replace
controls. How it was done: code graph refreshed with graphify (3322 nodes, 156 communities), Gemini probed directly
with both configured keys, every AI route called through the API, and the builder driven in headless Playwright on
a throw-away paper `[AUDIT] OR edit test` (id `cmw3bwuoh0045uogsmra4h12y`, Class 8 Science blueprint).

Status: **Part 1 fixed (not committed yet)**: A1 (Flash default), A2 (pinned Flash models lead the chain, retired
Flash names map onto them), A3 (503 pause capped at 30 s), A6 (quota message checks every model in the chain),
A7 (trace labels), A8 (tests updated and extended), A9 (real failure reason shown). Also: section AI calls with no
model chosen no longer start on Pro (`gemini.ts:1908`). Verified: a full paper (26 questions) generated in about
3 min with no template fallbacks, plus the answer key and key check. A10/A5 (timeout and retry budget) and Part 3 are still open.

**Part 2 fixed (not committed yet)**: B1–B3, B5. The PUT item route takes `target: "or"` and edits the OR question
with the same two save modes as the main question ("update in bank" or "copy for this paper only"). It applies the
same rules as linking an OR: same chapter, an allowed type, subpart marks equal to the slot's marks, and not identical
to the main question. The Edit modal has "Main question" / "OR question (alternative)" tabs, and each slot with an OR
has an **Edit OR** button next to Change OR. Covered by `src/lib/or-question-edit.test.ts` (8 tests) and checked in
the browser. B4 (a small bank in Change OR) is unchanged.

**Part 3 fixed for the paper builder (not committed yet)**: the picker's "Generate with AI" tab (Add, Replace and
Change OR) now calls `ai-generate-section` with one slot, so it gets everything full generation does: the paper's
questions as "do not repeat", difficulty targeting, the section's OR rules for that slot, verification and repair,
validation retries, a loud failure instead of silent templates, the Flash default, and automatic retry on 502/503.
Single questions use `answerMode: "together"` so the preview shows the full model answer. Change OR sends
`alternateForItemId`: the route checks the chapter, shows the model the main question with an "equivalent, never
a paraphrase" instruction, never asks for an OR of the OR, and rejects a near copy (`isParaphraseOrDuplicateChoice`).
The route's own default model was also still `gemini-pro-latest` and is now the Flash default. Covered by
`src/lib/ai-replace-or-generation.test.ts` (6 tests). Live: Change OR with AI 7 s (was 103 s), Replace with AI 21 s
including one auto-retried 503 (was 70 s), accept and place checked. 

**Question bank AI fixed too (not committed yet)**: the bank's "AI Question Co-Pilot" sends its book and chapter ids,
and `/api/ai/generate-questions` then runs `generatePaperSectionWithGemini`. It uses the real chapter, the chapter's
last 60 bank questions as "do not repeat", the full model answer, the Flash default, and verification and repair.
Checks: book access and that the chapter belongs to the book. With a key configured, a failed model call is now a
502/429 with the real reason on both paths, never template text (templates remain only when no key exists at all).
Kindergarten activity types keep their own generator. `/api/ai/settings` now reports the model that actually runs
first. Covered by `src/lib/bank-ai-generation.test.ts` (6 tests). Live: 7.5 s, a distinct numerical question with a
step-marking scheme. The test paper and two `[AUDIT]` bank questions exist in
`prisma/dev.db` and can be deleted.

---

## Part 1 — Why AI generation "suddenly" fails

### Root cause: Google moved the `-latest` aliases onto new models with much smaller free quotas

The code calls the floating aliases. Google re-pointed them, and the new targets have different limits. Measured today with
both keys (`…IsBg`, `…IaFg`, separate projects):

| Alias the app calls | Model Google now serves | Free-tier limit | Result today |
|---|---|---|---|
| `gemini-pro-latest` | `gemini-3.1-pro` | **0 requests/day** | always 429, "retry in 22 h" |
| `gemini-flash-latest` | `gemini-3.8-flash` | **20 requests/day per key** | key `…IsBg` used up (429); `…IaFg` mostly 503 |
| `gemini-flash-lite-latest` (= `GEMINI_MODEL` in `.env`) | lite | higher | 200, but frequent 503s |
| `gemini-3.5-flash` (added in the uncommitted diff) | served as `gemini-3.6-flash` | works | 200, currently doing all the work |
| `gemini-2.5-*` | — | — | 404 "no longer available to new users" (mapped away by `LEGACY_MODEL_ALIASES`, OK) |

A full paper makes roughly 5 sections × (1–3 generation attempts + repairs) + answer key + key check. That is about
15–40 calls, so **one paper uses up a key's 20-per-day flash quota.** Earlier the aliases pointed at models with larger
quotas, which is why this "was working before".

### Defects that turn this into user-visible errors

| # | Sev | Where | Defect | Effect |
|---|---|---|---|---|
| A1 | **High** | `AIPaperGeneratorModal.tsx:74`, `:697` | The full generator **defaults to `gemini-pro-latest`**, which has 0 free quota. | Every full-paper run starts with a guaranteed 429 on both keys, then falls back. The UI promises "Pro / Senior Examiner Quality" but Flash is what actually runs. |
| A2 | **High** | `gemini.ts:94-101` `resolveModelChain` | The chain is built only from floating aliases. Nothing pins a model or checks its quota, and `gemini-3.5-flash` was only just added (uncommitted). | When Google re-points an alias, generation breaks with no code change. The only model that works today was added by hand, and nothing is committed. |
| A3 | **High** | `geminiPool.ts:17-33,161,187-195` (uncommitted) | New **global 503 circuit breaker**: one 503 parks the model for 30 s, doubling to 5 min, and resets only on a success *of that model*. | 503s from Google come and go within seconds. After a few strikes, lite and flash-latest stay parked for minutes at a time. Every call then waits on whatever is left (3.5-flash), and when that also returns a 503, the whole chain fails at once with "overloaded" even though a retry seconds later would work. |
| A4 | Med | `gemini.ts:203-208` | A 503 gets one 450 ms retry, but only on the first model in the chain. Google holds 503 responses for 4–20 s. | Observed latency: **single-question generate 69–103 s**, all of it spent waiting through 503s on lite and flash-latest before 3.5-flash answers. |
| A5 | Med | `client.ts:23-40` `retryTransient` + `ai-generate-section/route.ts:148-155` | Server fallbacks return 502. The client retries a 502/503 up to twice more (8 s, 20 s), and each retry runs the whole server chain again. | One stuck section can make up to 3 × (chain × 2) Gemini calls. That uses up the 20/day quota faster, and the section takes minutes to time out. |
| A6 | Med | `gemini.ts:295-302` `quotaErrorText` | The "quota used up" message is only shown when *both* the first model and `gemini-flash-lite-latest` are blocked. `gemini-3.5-flash` is never checked. | Teachers get "AI did not return usable questions… unknown/503" instead of an honest "today's free quota is gone". |
| A7 | Low | `gemini.ts:1011`, `:1897` | The trace labels default to `"gemini-2.5-flash"` / `"gemini-2.5-pro"` when `modelUsed` is missing. | Audit trail and observability show a model that no longer exists. |
| A8 | Low | `gemini-models.test.ts:25` | The unit test still expects the old chain. **1 of 48 Gemini tests fails** against the uncommitted change. | The suite is red. Nobody has finished or committed the in-progress fix. |

Server log during the tests (in order):
```
Gemini key …IsBg refused gemini-flash-latest (429); trying another key.
Gemini API Model gemini-flash-latest returned 503. Trying fallback model...
Gemini key …IaFg refused gemini-pro-latest (429)  /  …IsBg refused gemini-pro-latest (429)
Gemini API Model gemini-flash-lite-latest returned 503. Trying fallback model...
```

### What works today (verified)
- Login, `ai-plan`, `ai-generate-section` (succeeded with both Pro and Flash selected; both were actually served by `gemini-3.5-flash`, 4–8 s).
- `/api/ai/generate-questions` returns real model output (not mock), but only after long 503 waits.
- Response parsing skips "thought" parts correctly (`gemini.ts:222-225`, `evidenceAuditEngine.ts:365`).

---

## Part 2 — Paper builder: OR question cannot be modified

Reproduced in the UI on the audit paper (primary "State the two laws of reflection…", OR "Explain why the image in a
plane mirror is laterally inverted").

| # | Sev | Where | Finding |
|---|---|---|---|
| B1 | **High** | `papers/[id]/page.tsx:2614-2630` | **Edit** builds `QuestionForm` from `editingItem.item.question` only. Checked in the browser: the Edit modal shows the primary text and contains **no OR text and no OR field**. |
| B2 | **High** | `api/papers/[id]/questions/[itemId]/route.ts:259-362` (PUT) | The edit API edits only the primary question (`UPDATE_MASTER` / fork). **No server path edits `orQuestion` in place**, so the UI cannot be fixed without an API change. |
| B3 | **High** | `QuestionPicker.tsx:62-71`, `page.tsx:2155-2161` | **Change OR** opens the bank picker on the *last used tab*, which defaults to **"+ Compose New Question"**: a blank form. The current OR question is never loaded anywhere in the modal (checked: its text is not in the DOM). That is why it "only gives the option to write new questions". |
| B4 | Med | `QuestionPicker.tsx:139-140,154-155` | In Change OR mode the bank is locked to the primary's chapter and type. With a small bank (this chapter had 1 other question), the bank tab is effectively empty, which pushes teachers to Compose New. |
| B5 | Med | — | The only route to "fix a typo in the OR" is Unlink OR, then compose a new question, then re-link. That loses the OR's usage history and leaves the old question orphaned in the bank. |

What a fix needs: Edit should show *Primary* and *OR (alternative)* tabs, both prefilled. The PUT route needs a
`target: "primary" | "or"` field with the same UPDATE_MASTER/fork modes. Change OR should open with the current OR
loaded (an "Edit current OR" action) as well as the bank and AI options.

---

## Part 3 — AI single-question Replace / Change OR does not follow the full-generation standard

Replace-with-AI and Change-OR-with-AI both call **`/api/ai/generate-questions` → `generateQuestionsWithGemini`**
(`gemini.ts:337`). Full paper and section AI use **`ai-generate-section` → `generatePaperSectionWithGemini`**
(`gemini.ts:1146`). The two pipelines have drifted apart:

| Standard in full generation (`generatePaperSectionWithGemini`) | Single-question replace (`generateQuestionsWithGemini`) |
|---|---|
| Passes `existingQuestionTexts` (every question and OR already in the paper) as "FORBIDDEN TO REPEAT" (`:1441`) | **Not passed.** Observed: Replace produced the same "ray at 35° to the mirror" problem that the MCQ section had already produced. |
| Prompt explicitly requires a complete `orQuestion` from the same chapter, with a different subtopic (`:1260`, `:1405`, schema `:1484`) | **The prompt never asks for `orQuestion`.** The OR comes from the offline template pool (`:971-990`). Observed OR text: *"Explain the scientific principles, experimental observations, and balanced equations associated with Chapter 1: Light."* That is generic filler, and it mentions "balanced equations" in a physics chapter. |
| Change OR: should know the primary so the OR is equivalent but not a paraphrase | `QuestionPicker` sends neither the primary's text nor its topic. The model writes a fresh question blind, and nothing checks it against the primary for paraphrase. |
| Difficulty profile + per-slot planned difficulty (`:1208-1210`, `:1419`) | Only a single EASY/MEDIUM/HARD value |
| `slotQuestionForm` varied forms per slot (`:1330`) | Not used |
| Per-question academic verification + repair/regenerate (`:1933-1956`, `questionVerificationEngine.ts`) | **None** |
| Validation retry loop, `MAX_VALIDATION_RETRIES = 2` (`:1890`) | One shot; a failed validation is returned as an error |
| Two-stage answers (questions first, then an independent answer-key pass and key check) | Answer written in the same call; no independent check |
| Model chosen by the teacher (`model` field) | No `model` parameter; always `GEMINI_MODEL` (lite) |
| Real `chapterId`/`chapterNumber` for each slot | Fake ids `ch_1…` and `chapterNumber: i+1` (`:388-395`) |
| Fails loudly when a key is configured (`route.ts:148-155`) | `allowFallbackOnApiFailure: true` (`:784`). On API failure it **silently returns offline template questions** with `success: true` |
| Section modes: passage/case groups, component keys, unit-role task directives (route `:66-108`) | None |

Related defects seen along the way:

| # | Sev | Where | Finding |
|---|---|---|---|
| C1 | Med | `SectionAiModal.tsx:228-233` | Sends `chapterNumber: idx + 1` (the *slot index*), not the chapter's real number. Prompts can say "Chapter 3" for a Chapter 1 slot. |
| C2 | Low | `SectionAiModal.tsx:213-240` | Sends no `model`, so section AI and the full generator use different chains for the same paper. |
| C3 | Low | `generate-questions/route.ts` | No `board`/`className` checks against the paper beyond what the client sends; the server trusts the client for the subject. |

Recommended direction: drop the separate single-question pipeline. Route Replace and Change OR through
`generatePaperSectionWithGemini` with a one-slot section built from the target item: same chapter, marks, type, OR
rule and `existingQuestionTexts`. For Change OR, add a "primary question (write an equivalent alternative, not a
paraphrase)" block and run the existing `isParaphraseOrDuplicateChoice` check against the primary.

---

## Part 4 — Full "Generate with AI" run on the audit paper

Run in the UI with the defaults (English, School difficulty, **model preselected as `gemini-pro-latest`**, "Clear &
Generate Fresh"), 26 slots in 5 sections. **Result: it paused at Section B with the exact error teachers see:**
*"The AI did not return usable questions for this section. Reason: unknown Nothing was added; please try again."*

Timeline from the server log:

| Time | Call | Outcome |
|---|---|---|
| 0 → 3.4 min | Section A, attempt 1 | pro 429 → lite 503 → flash-latest **timed out after 120 s** → 3.5-flash 503 → **502 "no reason recorded"** |
| +10 s | Section A, client retry | pro 429 → lite 503 → flash-latest **429 on both keys (daily 20 used up)** → 3.5-flash → **200** in 5.8 s, 5 MCQs committed |
| +10 s | Section B, attempt 1 | the whole chain 429/503 → 502 in 3.0 s |
| +10 s / +20 s | Section B, client retries | **502 in 42 ms** and 1.8 s: the 503 breaker had parked every model, so no request reached Google |
| — | — | Generation paused at 5 / 26 questions |

New defects found by this run:

| # | Sev | Where | Defect |
|---|---|---|---|
| A9 | **High** | `gemini.ts:2037-2045` | When `callGeminiApi` falls back to the offline template (`isMock: true`), `generatePaperSectionWithGemini` returns `success: true` **without `error`**. The route then shows `Reason: unknown` (`ai-generate-section/route.ts:154`) and logs "no reason recorded". The real cause (quota used up, overload) never reaches the teacher. |
| A10 | Med | `gemini.ts:203` + pool `timeoutMs: 120_000` | One slow model (flash-latest) holds a section for the full 2 minutes before the chain moves on. Combined with A5, a single section took 3.4 min to fail. |
| A11 | Med | — | The run itself spent the second key's 20-per-day flash quota. On the free tier this setup supports roughly **one full paper per day**. |

Output quality of what did generate (Section A, 5 MCQs; also the single-question tests): the format is right. There
are 4 options, one key that matches an option, LaTeX `$40^\circ$` renders through KaTeX, chapter ids are real, and
marks match the slot. The content is correct but **repetitive**: the "ray on a plane mirror / angle of incidence"
problem came back in Section A, in Replace-with-AI and in the MCQ test, because only the section pipeline sees the
existing questions (Part 3).

---

## Suggested fix order

1. **Unblock AI now (A1, A2, A3, A6, A8, A9, A10):** pass the real failure reason through (A9). default the generator to a Flash tier. Put models with working free quota
   first (`gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`), keep `pro` opt-in. Replace the global
   503 breaker with a short per-model backoff (seconds, not minutes). Count every chain model in `quotaErrorText`.
   Fix the test. Longer term: a paid key, or more keys from separate projects.
2. **OR editing (B1–B5):** a PUT `target: "or"` path plus Primary/OR tabs in Edit, and "Edit current OR" in Change OR.
3. **One generation standard (Part 3):** Replace and Change OR go through the section pipeline.
4. Clean-ups: C1, C2, A4/A5 retry budget, A7 labels.

---

## Round 2 — "Unseen passage in a long-answer section" and a full workflow sweep (not committed yet)

Reported: generating an Unseen passage in Class 7 English, Section E (Long answer, 5 marks), failed when added:
*"the unseen passage has only 91 words … Expected question type LONG, but received UNSEEN_PASSAGE … requires graded
subparts"*. Reproduced exactly on a Class 7 English test paper.

| # | Where | Bug | Fix |
|---|---|---|---|
| R1 | `ai-commit-section/route.ts` | Every question was validated against the **section's default type**. A passage (or writing task) the section allows failed "expected LONG", was then **regenerated as a LONG question** that kept the passage label, hence "91 words" and "no subparts". | Each question is validated, repaired and regenerated as its own type (`contractFor(type)`); `regenerateSlot` takes the type. The offline-passage guard checks each question. |
| R2 | `paperAutogen.ts` `slotTaskDirective` | The model's task came from the **chapter's name**, not the chosen type: Writing skill on an "Unseen Passage" row produced a reading passage. | An explicit form (passage, writing, map, grammar) decides the task; the row's title is the topic only when it matches. |
| R3 | `paperAutogen.ts` | Passages read like adult prose in Class 7 ("subterranean ecosystem… bioluminescent fungi"). | The passage instruction adds a reading level by class. |
| R4 | `gemini.ts` section generator | **Match the columns never came from the AI**: a single match question was asked for "all 1 matching pairs" while the validator wanted 4, so it always fell back to template filler. | One pair count for prompt and validator; too few pairs is retried, never padded with template text. |
| R5 | `gemini.ts` / `geminiPool.ts` | After a few 503s **every model was paused**, so requests failed in 0 s without reaching Google. | When all models are paused, one real attempt goes to the model nearest its resume. |
| R6 | `gemini.ts` model chain | `gemini-3.5-flash` also has a **20 requests/day** free limit (served as 3.6-flash) and ran out; nothing else with a separate bucket was in the chain. | Chain: 3.5-flash, 3-flash-preview, flash-latest, 3.5-flash-lite, 3.1-flash-lite, flash-lite-latest. A mix of spent quota and busy models gets its own message; `/api/ai/settings` states the real limit. |
| R7 | `ai-generate-section/route.ts`, `gemini.ts` | Busy-AI failures said "Offline templates cannot write a passage. Connect a Gemini API key" (a key was configured) or "validation failed". | The real reason is reported. |
| R8 | `answer-key/route.ts`, `gemini.ts` | The answer key gave up on the first 503, leaving answers blank, and stored Google's raw JSON as the reason. | Retries after 4 s and 10 s on a busy AI; plain-language reason. |
| R9 | `gemini.ts` | Models copied `"attemptCount": 4` from the prompt example onto questions with no sub-questions (stray "attempt any 4"). | `validAttemptCount`: kept only when there are more sub-questions than must be attempted. |
| R10 | `paperDocx.ts` | Word export printed sub-question marks as **"[[1 Mark]]"**. | Single brackets (test added). |
| R11 | Answer-key check | A key the independent check disputed (a wrong Hindi True/False key, verified) showed once in a toast, then printed in the marking scheme. | **Answer keys to review** banner on the paper, kept until the teacher picks "Use checked answer" (written in the key's own words, e.g. असत्य) or "Keep key"; **Tools & AI → Check answer key** runs it any time. |
| R12 | `SectionAiModal.tsx` | The question count could exceed the empty slots; chips said "5m left" (the slot's marks, not the chapter's); chapter numbers were the slot index; the type picker came after the chapter choice. | Count capped at the empty slots; real marks left per chapter; chapters suited to the chosen form first; real chapter numbers; type first, with a line saying what will be generated. |

Verified live after the fixes:
- Every allowed form in every section of a Class 7 English paper (16 combinations) was generated, committed and keyed; the failures seen were Google 503 spells, now reported as such.
- Full "Generate with AI" made **17/17 questions in about 70 s** with no template fallbacks; answer key written; 6/6 objective keys confirmed.
- Print view and Word export (paper and marking scheme) work.
- Snapshot, duplicate, Set B, finalise (locks edits), reopen and reconcile all work.
- Replace with an AI Unseen passage works through the picker.
- Hindi Class 9: MCQ, True/False (सत्य/असत्य) and अपठित गद्यांश generated and committed; the disputed key was caught and fixed through the banner.
- Every app page loads with no console errors or failed requests.

Known limits:
- **Free-tier capacity.** About 20 requests a day per key on each full Flash model; one paper uses roughly 15–40. After that the Lite models write the questions (quality is fine, slightly simpler). More keys from other Google projects, or a billed key, raise it.
- **Content accuracy.** It depends on the model. The key check covers objective answers only; subjective model answers still need a teacher's read.
