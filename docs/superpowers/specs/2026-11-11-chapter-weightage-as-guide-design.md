# Chapter weightage as a guide, not a gate

Date: 2026-11-11
Status: draft for review

## Problem

A question's chapter is often wrong, whether a teacher picked it or the app matched it. Today that chapter is a
hard rule: it decides which questions may be added, it dead-ends sections ("All Chapter Quotas Full for 5m
Questions"), and it decides whether a paper can be finalised. Teachers get stopped by data that is not reliable.

## Decisions (agreed with the product owner)

1. Chapter weightage is a **guide only**. It never blocks adding a question or finalising a paper.
2. Teachers are **not asked for a chapter** while building a paper. The app's existing automatic matching
   (`suggestChapter` in `src/lib/questionTagging.ts`) assigns it in the background.
3. An **AI coverage check** is available on demand, for a more accurate chapter-wise picture than the matcher gives.
4. Section structure stays strict: questions per section, marks per question, question types, total marks.

## What stays strict, what becomes advisory

| Rule | After this change |
|---|---|
| Section has room (slot count) | Strict |
| Question type and marks fit the slot, passage role | Strict |
| Internal choice (OR) rules | Strict, unchanged |
| Question's chapter has marks left | Removed |
| Question's chapter is in the blueprint | Removed as a rule; shown as a note in the coverage panel |
| Every chapter exactly on target before finalising | Removed |
| Blueprint: section total equals chapter total | Strict, unchanged (targets should add up to the paper) |

## Design

### 1. Rules (`src/lib/blueprint.ts`)

- `whyCannotAdd` keeps the section, type, role and slot-count checks and drops every chapter check. The
  look-ahead added earlier today (`canStillComplete`, `strandsChapterMarks`, `chaptersOpenForSlot`, the
  `replaces` option) is deleted with it; nothing can strand any more.
- `paperStatus.complete` becomes: every section filled exactly. `paperStatus.chapters` (target and used per
  chapter or unit) stays as it is; it now feeds the coverage panel only.
- `diagnosePaperImplications` still reports `CHAPTER_EXCESS` and `CHAPTER_DEFICIT`, both as `warning`. A new
  `CHAPTER_OUTSIDE_BLUEPRINT` warning covers a question whose chapter the blueprint does not list.
- `finaliseBlocker` (`src/lib/papers.ts`) and `validatePaperPreflight` (`src/lib/preflight.ts`) follow
  `complete`, so they stop blocking on chapters without further change. Preflight lists chapter gaps under
  "info".
- `checkBlueprintFeasibility` and its alert on the blueprint editor are removed: "this chapter's marks cannot be
  formed from the question sizes" no longer matters.

### 2. Chapter assignment without asking

- **Compose new question** (in the picker): the chapter field is hidden. On save the chapter is
  `suggestChapter(text, blueprint chapters, coverage gaps, bank)`. When the matcher finds nothing, the chapter
  furthest below its target is used, which is what the matcher's own fallback already does. The Question table
  keeps its required `chapterId`; there is no schema change.
- **Paste several**: the per-row chapter select is removed; each row gets the matcher's chapter.
- **Question bank tab**: every question that fits the slot can be added. Questions from chapters below target are
  listed first. The chapter filter stays, for browsing.
- **AI, single question and section fill**: the AI still needs a chapter to write about. It defaults to the
  chapters furthest below target, any chapter can be chosen, and nothing is refused or warned as "exceeds quota".
- **Bank Auto-Fill** (`src/lib/autofill.ts`): prefers questions that move chapters towards their targets, and
  when none is left within a chapter's target it takes the next best question rather than leaving the slot empty.
- **Correcting a chapter**: the existing Edit dialog on a placed question keeps its chapter field. No new
  control is added.

### 3. Coverage panel (replaces "Chapter weightage")

- Title: "Chapter coverage (estimate)". Each row shows target and current marks, for example "The Tree · 4 of 5".
- A row more than 1 mark off its target is tinted amber; nothing is described as "left" or "full".
- A footer line appears when it applies: "2 questions are from chapters outside this blueprint."
- The empty-slot hint on the paper page changes from "Open Quotas" to "Under-covered: Ch 3, Ch 7".
- The "Auto-Rebalance Chapter Quotas" button, its route (`reconcile-blueprint`) and `src/lib/reconcileBlueprint.ts`
  are removed. Re-labelling questions to make numbers match has no purpose once the numbers are a guide.

### 4. AI coverage check

- A "Check coverage with AI" button in the coverage panel.
- One request per check: the paper's questions (number, text, marks) and the blueprint's chapter list go to the
  model in a single call, which returns one chapter per question with a confidence. New function
  `classifyPaperChaptersWithGemini` in `src/lib/gemini.ts`, new route `POST /api/papers/[id]/ai-coverage`. It uses
  the existing key pool, model chain and quota messages.
- The result opens in a modal: the chapter-wise spread by the AI's reading next to the targets, and a list of
  questions where the AI disagrees with the stored chapter ("Q7: stored Ch 2, AI says Ch 5").
- "Apply" updates the stored chapter of the disagreeing questions the teacher is allowed to edit, through the
  existing question update path. Questions they may not edit are listed and skipped. The panel then refreshes.
- When the AI is unavailable or out of quota the button reports that; the matcher's estimate stays on screen.
  The check is never required.

### 5. Existing papers

No migration. A paper that is stuck today becomes addable and finalisable as soon as this ships, because the
rules that stopped it are gone. Papers already finalised are unaffected.

## Error handling

- Adding, replacing, editing, pasting and AI commit can now fail only for section, type, marks, role and OR
  reasons; each keeps its current message.
- The coverage check surfaces AI failures with the existing honest quota and overload messages and changes
  nothing on failure.
- "Apply" is all-or-report: questions that fail to update are named; the rest are applied.

## Testing

- `src/lib/quota-stranding.test.ts` is replaced by tests that a question from any chapter can be added while its
  section has room, and that `complete` ignores chapters.
- Existing tests that assert chapter refusals (`logic.test.ts`, `quota-or-choice-regression.test.ts`,
  `official-scheme-commit-regression.test.ts`, `school-paper-flow.test.ts`, `teacher-audit-fixes.test.ts`,
  `reconcileBlueprint.test.ts` and others that grep for quota) are updated or removed to match.
- New unit tests: automatic chapter assignment on compose and paste; autofill filling every slot when chapter
  targets cannot all be met; the coverage classifier's response parsing and its "Apply" path with a mocked model.
- In the app: build a paper that the old rules would have dead-ended, fill it, and finalise it.

## Out of scope

- Questions that belong to several chapters, or splitting a question's marks across chapters.
- Changing how the question bank page tags or filters by chapter.
- Running the AI coverage check automatically.
