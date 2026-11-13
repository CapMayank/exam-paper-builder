# One Question Modal (Package 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One add/edit question modal with a single type control, an always-visible chapter, three sources, a predictable opening tab, and one difficulty/skill vocabulary.

**Architecture:** `QuestionPicker.tsx` and `QuestionForm.tsx` are restructured in place; no new modal component. Every rule that decides what the modal shows (opening tab, title, type control, chapter choice, labels, AI payload) moves to pure functions in `src/lib/questionModal.ts` and `src/lib/aiQuestionPayload.ts`, which carry the unit tests. Components only call them.

**Tech Stack:** Next.js 16.4.1 (App Router), React 19, TypeScript 5, Tailwind v4, Vitest 5 (node environment, `src/**/*.test.ts`), Playwright for e2e.

**Spec:** `docs/superpowers/specs/2026-11-12-paper-quality-overhaul-design.md`, section "Package 3: one question modal".

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (`AGENTS.md`).
- Test first. There are no React render tests: rules go in pure functions under `src/lib` and are tested there.
- Pass bar per task: `npm test` passes; `npx tsc --noEmit` shows no errors under `src/` (two known errors in generated `.next/types/validator.ts` are ignored); `npx eslint <touched files>` shows no new problems.
- No database schema change. No new dependencies.
- Difficulty is shown as Easy / Average / Difficult (`DIFFICULTY_LABEL` in `src/lib/questionTagging.ts`); stored values stay `EASY | MEDIUM | HARD`.
- Skill is the four `SKILLS` (Knowledge, Understanding, Applying, HOTS), stored in `cognitiveLevel`. Never show the word "Bloom" or a raw enum value to the teacher.
- AI Fill for a section (`SectionAiModal`), bulk import and whole-paper AI stay separate tools. Their difficulty *profile* selector (`DifficultySelect`) is a paper-mix setting and is not changed.
- Tests must not leave rows in the dev database.
- End every commit message with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- Paths: `PAPER` = `src/app/(app)/papers/[id]/page.tsx`, `FORM` = `src/components/QuestionForm.tsx`, `PICKER` = `src/components/QuestionPicker.tsx`, `BANK` = `src/app/(app)/questions/page.tsx`, `AIGEN` = `src/components/AIQuestionGeneratorModal.tsx`, `PASTE` = `src/components/PasteQuestionsPanel.tsx`.

## Review Focus

1. **Bank list fails or is slow to load.** Add mode opens on Write without waiting for the bank, so the modal is usable at once; the From bank tab shows its own spinner or error. (Task 1 test `openingTab`; Task 4 wiring.)
2. **Editing a question whose chapter is not in the blueprint.** The chapter list on a paper is the blueprint's chapters plus the question's current chapter, so saving does not silently move it. (Task 1 test `chapterOptionIds`.)
3. **Switching the type chip after typing.** The typed question text stays; only the type-specific parts reset. (Task 4: chip drives the form's own `changeType`, no remount; checked in the running app.)
4. **AI returns a level outside the four skills** (`EVALUATING`, `CREATING`, junk, nothing). Saved value is one of the four `SKILLS` or `null`, never the raw string. (Task 5 test.)
5. **Section already full, or no slot left.** Write and AI show the "section is full" message; "Paste several" is not offered. (Task 1 test `canPasteSeveral`.)
6. **Class name with no number or an unusual form** ("Nursery", "KG", "Class VIII", "8th", "Class 10 (Science)"). The OR chapter rule treats a class it cannot read as a number as "up to 8": a guideline, never a block. (Task 2 test.)
7. **Old difficulty strings** in existing rows (lower case, unknown). The label falls back to the stored text instead of printing `undefined`. (Task 1 test `difficultyLabel`.)

---

### Task 1: Modal rules as pure functions

**Files:**
- Create: `src/lib/questionModal.ts`
- Test: `src/lib/questionModal.test.ts`

**Interfaces:**
- Consumes: `DIFFICULTY_LABEL`, `SKILLS`, `skillOf`, `suggestChapter`, `assignChapter`, `ChapterLite`, `ChapterBank` from `src/lib/questionTagging.ts`; `QUESTION_TYPE_LABEL` from `src/lib/constants.ts`; `PASTEABLE_TYPES` (move it from `PASTE` into this file and re-export it from `PASTE`).
- Produces:

```ts
export type ModalMode = "add" | "replace" | "or" | "edit";
export type SourceTab = "bank" | "write" | "ai";

export function openingTab(mode: ModalMode): SourceTab;
export function showTypeChips(allowedTypes: string[], mode: ModalMode): boolean;
export function modalTitle(a: { mode: ModalMode; sectionTitle: string; type: string; marks: number; chips: boolean; target?: "primary" | "or" }): string;
export function difficultyLabel(value?: string | null): string;
export function skillLabel(cognitiveLevel?: string | null): string; // "" when none
export function detailsSummary(difficulty: string, cognitiveLevel?: string | null): string;
export function chapterOptionIds(blueprintChapterIds: string[] | undefined, currentChapterId?: string | null, lockedChapterId?: string | null): string[] | undefined;
export function chapterChoice(a: {
  isNew: boolean; touched: boolean; chosenId: string; text: string; chapters: ChapterLite[];
  openMarks?: Record<string, number>; bank?: ChapterBank;
}): { chapterId: string; suggested: boolean };
export function canPasteSeveral(a: { mode: ModalMode; type: string; slotsLeft: number }): boolean;
```

Rules the signatures do not decide:
- `openingTab`: `add` and `edit` → `"write"`; `replace` and `or` → `"bank"`. (Owner's decision, 2026-11-13: adding opens on Write by default.)
- `showTypeChips`: more than one allowed type and mode is not `edit`.
- `modalTitle` (marks word is "mark" for 1, "marks" otherwise; type shown through `QUESTION_TYPE_LABEL`, raw type when unknown):
  - add, no chips: `Add to {section} — {Type} · {n} marks`; with chips: `Add to {section} · {n} marks`
  - replace: `Replace question in {section} · {n} marks` (append ` — {Type}` when no chips)
  - or: `Add OR question in {section} · {n} marks`
  - edit: `Edit question — {Type}`; with `target: "or"`: `Edit OR question — {Type}`
- `difficultyLabel`: upper-cases the value, maps through `DIFFICULTY_LABEL`; unknown non-empty value returns as stored; empty → `"Average"`.
- `skillLabel`: label of `skillOf(level)`, else `""`.
- `detailsSummary`: `"Average · Understanding"`, or just the difficulty label when there is no skill.
- `chapterOptionIds`: `lockedChapterId` → `[lockedChapterId]`; `undefined` blueprint (bank) → `undefined`; otherwise blueprint ids, plus `currentChapterId` appended when it is set and missing.
- `chapterChoice`: not new or touched → `{ chapterId: chosenId, suggested: false }`. New and untouched with `openMarks` (on a paper) → `assignChapter(text, chapters, openMarks, bank)`, `suggested: true`. New and untouched without `openMarks` → `suggestChapter(...)`'s chapter with `suggested: true`, or `chosenId` with `suggested: false` when it returns null. No chapters → `{ chapterId: "", suggested: false }`.
- `canPasteSeveral`: mode `add`, `slotsLeft > 0`, and `PASTEABLE_TYPES.has(type)`.

- [ ] **Step 1: Write the failing tests** in `src/lib/questionModal.test.ts`. Required cases (use `describe` per function):

```ts
expect(openingTab("add")).toBe("write");
expect(openingTab("edit")).toBe("write");
expect(openingTab("replace")).toBe("bank");
expect(openingTab("or")).toBe("bank");
expect(showTypeChips(["SHORT"], "add")).toBe(false);
expect(showTypeChips(["SHORT", "LONG"], "add")).toBe(true);
expect(showTypeChips(["SHORT", "LONG"], "edit")).toBe(false);
expect(modalTitle({ mode: "add", sectionTitle: "Section B", type: "SHORT", marks: 3, chips: false })).toBe("Add to Section B — Short answer · 3 marks");
expect(modalTitle({ mode: "add", sectionTitle: "Section B", type: "SHORT", marks: 1, chips: true })).toBe("Add to Section B · 1 mark");
expect(modalTitle({ mode: "edit", sectionTitle: "Section B", type: "MCQ", marks: 1, chips: false, target: "or" })).toMatch(/^Edit OR question — /);
expect(difficultyLabel("MEDIUM")).toBe("Average");
expect(difficultyLabel("hard")).toBe("Difficult");
expect(difficultyLabel("TRICKY")).toBe("TRICKY");
expect(difficultyLabel(null)).toBe("Average");
expect(skillLabel("EVALUATING")).toBe("HOTS");
expect(skillLabel("NONSENSE")).toBe("");
expect(detailsSummary("EASY", "REMEMBERING")).toBe("Easy · Knowledge");
expect(detailsSummary("EASY", null)).toBe("Easy");
expect(chapterOptionIds(["a", "b"], "z")).toEqual(["a", "b", "z"]);
expect(chapterOptionIds(["a", "b"], "a", "b")).toEqual(["b"]);
expect(chapterOptionIds(undefined, "z")).toBeUndefined();
expect(canPasteSeveral({ mode: "add", type: "SHORT", slotsLeft: 2 })).toBe(true);
expect(canPasteSeveral({ mode: "add", type: "SHORT", slotsLeft: 0 })).toBe(false);
expect(canPasteSeveral({ mode: "add", type: "MATCH_COLUMN", slotsLeft: 2 })).toBe(false);
expect(canPasteSeveral({ mode: "replace", type: "SHORT", slotsLeft: 2 })).toBe(false);
```

Take the exact "Short answer" label from `QUESTION_TYPE_LABEL.SHORT` rather than hard-coding it if it differs. For `chapterChoice` write four cases with chapters `[{id:"c1",number:1,title:"Light"},{id:"c2",number:2,title:"Electricity"}]`: edit keeps `chosenId`; touched keeps `chosenId`; new on a paper with text "Explain electricity" and `openMarks {c1:5,c2:5}` → `{chapterId:"c2", suggested:true}`; new in the bank with text "xyz" and no `openMarks` → `{chapterId: chosenId, suggested:false}`.

- [ ] **Step 2: Run** `npx vitest run src/lib/questionModal.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `src/lib/questionModal.ts` with the signatures and rules above. Move `PASTEABLE_TYPES` here; `PASTE` re-exports it.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then `npm test`.
- [ ] **Step 5: Commit** `feat(modal): pure rules for the question modal`.

---

### Task 2: OR chapter rule — a guideline up to class 8, required from class 9

Owner's decision (2026-11-13): for classes up to 8 an OR question from another chapter is allowed and the app only advises; from class 9 the same-chapter rule stays mandatory. Marks are not part of this change: the slot fixes an OR question's marks in every class.

**Files:**
- Modify: `src/lib/internalChoiceRules.ts` (add the rule next to `parseClassNumber` `:276`)
- Test: `src/lib/or-chapter-rule.test.ts`
- Modify: `src/lib/papers.ts:327-333` (`assertValidOrChoice`)
- Modify: `src/app/api/papers/[id]/questions/[itemId]/route.ts` (`:124-125`, `editOrQuestion` `:179-185`, `:280-285`, `:293-295`)
- Modify: `src/app/api/papers/[id]/ai-generate-section/route.ts:78-84`
- Modify: `src/app/api/papers/[id]/ai-coverage/apply/route.ts:24-26` (only if its "partner must move together" rule blocks a class 1 to 8 paper; otherwise leave it and say so)

**Interfaces:**
- Consumes: `parseClassNumber(className)` (`internalChoiceRules.ts:276`).
- Produces:

```ts
export type OrChapterRule = "required" | "guideline";
/** "required" for classes 9 to 12; "guideline" for classes 1 to 8 and for any class name without a readable number. */
export function orChapterRule(className?: string | null): OrChapterRule;
export const OR_CHAPTER_GUIDELINE = "An OR question is usually from the same chapter as the main question.";
export const OR_CHAPTER_REQUIRED = "An OR question must be from the same chapter as the main question.";
```

`parseClassNumber` reads only Arabic digits. `orChapterRule` (not `parseClassNumber`) also reads Roman numerals I to XII as a whole word ("Class VIII" → 8, "Class X" → 10), so a class 10 book named in Roman numerals is not treated as primary.

- [ ] **Step 1: Write the failing tests:**

```ts
for (const c of ["Class 1", "Class 8", "8th", "Class VIII", "Nursery", "KG", "", null, undefined]) expect(orChapterRule(c)).toBe("guideline");
for (const c of ["Class 9", "Class 10", "10th", "Class 12 (Science)", "Class X", "Class IX", "XII"]) expect(orChapterRule(c)).toBe("required");
```

Add two route-level tests in the style of `src/lib/or-question-edit.test.ts` (same fixtures and clean-up; they must leave no rows behind): linking an OR from another chapter with `PATCH { orQuestionId }` succeeds on a class 6 paper and is refused with status 400 on a class 10 paper.

- [ ] **Step 2: Run** `npx vitest run src/lib/or-chapter-rule.test.ts`. Expected: FAIL, `orChapterRule` is not exported.
- [ ] **Step 3: Implement** `orChapterRule` and the two constants.
- [ ] **Step 4: Apply on the server.** Every listed check that refuses, or silently unlinks, an OR because its chapter differs runs only when `orChapterRule(<the paper's book class name>) === "required"` (use whatever field each route already has for the book's class; load it if missing). In `guideline` mode a chapter mismatch is accepted and nothing is unlinked. The refusal message becomes `OR_CHAPTER_REQUIRED` followed by the chapter in brackets; drop the words "Board Guardrail Violation" from these chapter messages only.
- [ ] **Step 5: Run** the new test file (PASS) and `npm test`; `npx tsc --noEmit`; eslint on touched files.
- [ ] **Step 6: Commit** `feat(or): same-chapter rule is a guideline up to class 8`.

---

### Task 3: Question form — one type control, visible chapter, "More details"

**Files:**
- Modify: `src/components/QuestionForm.tsx` (props `:204-234`, chapter logic `:413-421`, type/chapter row `:695-765`, pre-primary tiles `:767-800`, figure `:1357-1401`, tags `:1426-1448`, details `:1450-1522`, `changeType` near `:650`)
- Modify callers for the removed prop: `src/components/QuestionPicker.tsx:846` (delete `hideChapter`)

**Interfaces:**
- Consumes: `chapterChoice`, `detailsSummary`, `difficultyLabel` from Task 1.
- Produces (new `QuestionForm` props; `hideChapter` is deleted):

```ts
/** The parent owns the type (picker chips, edit on a paper): no type dropdown is rendered. When it changes, the form switches type and keeps the typed text. */
typeFromParent?: string;
/** Rendered at the top of "More details" (paper-only fields). */
detailsExtra?: React.ReactNode;
/** A line under the Chapter select (the OR chapter rule). */
chapterHint?: string;
```

`fixedType` stays as the initial type for existing callers; a caller that passes `typeFromParent` does not also pass `fixedType`.

- [ ] **Step 1: Type control.** When `typeFromParent` is set, render no "Question type" field and no pre-primary tile grid; a `useEffect` on `typeFromParent` calls the existing `changeType(next)` when it differs from the current type. Without `typeFromParent`: the dropdown renders only when it is enabled (`!typeLocked`); a locked type renders as plain text `Question type: {label}`. The pre-primary tile grid renders only when `!typeLocked`.
- [ ] **Step 2: Chapter.** Always render the Chapter select. Replace `chapterSuggestion` / `autoChapterId` / `effChapterId` with one call: `chapterChoice({ isNew: !initial, touched: touched.chapter, chosenId: chapterId, text, chapters, openMarks, bank: chapterBank })`. Under the select show `Suggested — change it if this is the wrong chapter.` while `suggested` is true (reuse `SuggestedNote`; delete the old `chapterNote` text). New optional prop `chapterHint?: string`, shown under the select in place of the suggestion note. When the list has exactly one chapter (an OR question in classes 9 to 12), render the select disabled.
- [ ] **Step 3: Order and "More details".** Order of the form body: type/chapter row, question, sub-questions, options/match pairs, answer, then one collapsed `<details>` titled `More details` whose summary line shows `detailsSummary(effDifficulty, effSkill)`. Move into it, in this order: `detailsExtra`, Figure, Difficulty and Skill pill groups, answer space (same `showAnswerSpace` rule), passage group, translation. The details element starts open when `initial?.imagePath` is set. The drawing/map box-height fields stay outside (they are the question itself for DRAW and MAP_WORK). Kindergarten types keep their own editor; for them "More details" holds only `detailsExtra`, Difficulty and Skill.
- [ ] **Step 4: Verify.** `npx tsc --noEmit` (no errors under `src/`), `npx eslint src/components/QuestionForm.tsx src/components/QuestionPicker.tsx` (no new problems), `npm test` (pass).
- [ ] **Step 5: Commit** `feat(modal): form shows chapter, one type control and a single More details row`.

---

### Task 4: Picker — three sources, one type control, predictable opening tab

**Files:**
- Modify: `src/components/QuestionPicker.tsx` (tab state `:33-85`, bank load `:159-172`, title `:523-540`, tab bar `:547-596`, chips `:604-624`, bank filters `:628-662`, badges `:708`, paste/new branches `:812-868`)
- Modify: `src/components/PasteQuestionsPanel.tsx` (new prop `type: string`; every `section.type` in it becomes `type`)
- Modify: `tests/e2e/mandatory-workflows.spec.ts:355-363`

**Interfaces:**
- Consumes: `openingTab`, `showTypeChips`, `modalTitle`, `canPasteSeveral`, `difficultyLabel`, `SourceTab` (Task 1); `orChapterRule`, `OR_CHAPTER_GUIDELINE`, `OR_CHAPTER_REQUIRED` (Task 2); `typeFromParent`, `chapterHint` (Task 3).
- Produces: `PasteQuestionsPanel` prop `type: string`; picker tab labels `From bank ({n})`, `Write`, `Generate with AI`; button text `Paste several` and `Back to one question`.

- [ ] **Step 1: Tabs.** `PickerTab` becomes `SourceTab`. Delete `PICKER_TAB_KEY` and both `localStorage` uses. Tab state starts as `openingTab(mode)`: Write for add, From bank for replace and OR. The bank still loads in the background so the From bank tab can show its count.
- [ ] **Step 2: Type.** Chips render when `showTypeChips(allowedTypes, mode)`; remove the " (default)" suffix. Title and subtitle come from `modalTitle` with `chips` set accordingly; delete the per-tab subtitle sentence and keep `{section}: x of y slots filled.` for add mode only. Pass `typeFromParent={pickType}` to `QuestionForm` and drop `fixedType`; a chip click no longer bumps `formKey` (the form switches type itself and keeps the text). It still clears `aiGenerated`.
- [ ] **Step 3: Paste inside Write.** Remove the "Paste several" tab. In the Write tab, when `canPasteSeveral({ mode, type: pickType, slotsLeft })`, show a `Paste several` button above the form; it swaps the form for `PasteQuestionsPanel` (passing `type={pickType}`), with a `Back to one question` button. The full-section message is unchanged.
- [ ] **Step 4: Vocabulary in the bank tab.** Difficulty filter options and the per-question badge use `difficultyLabel`; option values stay the enum. Delete the "Board Guardrail" banner. For an OR, read `orChapterRule(paper.blueprint.book.className)` (Task 2):
  - `required`: as today, the chapter filter is fixed (text `Ch {n}. {title} (same as main question)`), other-chapter questions are greyed out, and one line reads `OR_CHAPTER_REQUIRED`.
  - `guideline`: the chapter filter is free and starts on the main question's chapter; other-chapter questions can be added (no `why`), same-chapter ones sort first; one line reads `OR_CHAPTER_GUIDELINE`. The Write form gets all blueprint chapters, pre-selects the main question's chapter, and `chapterHint={OR_CHAPTER_GUIDELINE}`; the AI tab's chapter select is enabled and starts on the main question's chapter.
- [ ] **Step 5: e2e selector.** In `tests/e2e/mandatory-workflows.spec.ts` the empty-slot button is `Add question` (not `Pick from Bank`); after the dialog opens, click the tab `From bank` before looking for `Add to Slot`. Run `npx playwright test tests/e2e/mandatory-workflows.spec.ts -g "Slot"` if the environment can run Playwright; if it cannot, say so in the report and give the error.
- [ ] **Step 6: Verify.** `npx tsc --noEmit`, `npx eslint` on the three touched source files, `npm test`.
- [ ] **Step 7: Commit** `feat(modal): picker has three sources, one type control and a fixed opening tab`.

---

### Task 5: AI tab saves skill and uses the shared vocabulary

**Files:**
- Create: `src/lib/aiQuestionPayload.ts`
- Test: `src/lib/aiQuestionPayload.test.ts`
- Modify: `src/components/QuestionPicker.tsx` (AI state `:104-113`, prompt `:348`, `handleAcceptAiQuestion` `:387-473`, `handleEditAiQuestion` `:475-521`, controls `:934-948`, badges `:1015-1016`)

**Interfaces:**
- Consumes: `skillOf`, `SKILLS` (`questionTagging.ts`); `normalizeSubpartMarks` (`types.ts`); `cleanOptionText`, `parseMatchColumnPairs`, `serializeMatchColumnPair` (`constants.ts`); `difficultyLabel`, `skillLabel` (Task 1).
- Produces:

```ts
export type AiQuestionInput = {
  text: string; type?: string; options?: string[]; answer?: string; explanation?: string;
  difficulty?: string; cognitiveLevel?: string; attemptCount?: number;
  subparts?: { label?: string; text: string; marks?: number; answer?: string; options?: string[] }[];
};
export function aiQuestionPayload(a: {
  generated: AiQuestionInput; bookId: string; chapterId: string; type: string; slotMarks: number;
  difficulty: "EASY" | "MEDIUM" | "HARD"; skill: string;
}): {
  bookId: string; chapterId: string; type: string; text: string; options: string[];
  subparts: SubPart[]; attemptCount?: number; answer: string;
  difficulty: "EASY" | "MEDIUM" | "HARD"; cognitiveLevel: string | null; spaceMm: 0; showGrid: false;
};
```

It is the single home of the block now written three times in `PICKER` (`:399-429`, `:438-459`, `:478-509`): match-column pairs, sub-part clean-up, `normalizeSubpartMarks(parts, slotMarks, attemptCount)`, `attemptCount` kept only when it is an integer with `0 < n < parts.length`. `cognitiveLevel` is `skillOf(generated.cognitiveLevel) ?? skillOf(skill) ?? null`. `difficulty` is the generated one when it is one of the three enum values, else the argument.

- [ ] **Step 1: Write the failing tests:**

```ts
const base = { bookId: "b", chapterId: "c", type: "SHORT", slotMarks: 4, difficulty: "MEDIUM" as const, skill: "APPLYING" };
expect(aiQuestionPayload({ ...base, generated: { text: "Q" } }).cognitiveLevel).toBe("APPLYING");
expect(aiQuestionPayload({ ...base, generated: { text: "Q", cognitiveLevel: "EVALUATING" } }).cognitiveLevel).toBe("ANALYZING");
expect(aiQuestionPayload({ ...base, skill: "", generated: { text: "Q", cognitiveLevel: "junk" } }).cognitiveLevel).toBeNull();
expect(aiQuestionPayload({ ...base, generated: { text: "Q", difficulty: "HARD" } }).difficulty).toBe("HARD");
expect(aiQuestionPayload({ ...base, generated: { text: "Q", difficulty: "tricky" } }).difficulty).toBe("MEDIUM");
const two = aiQuestionPayload({ ...base, generated: { text: "Q", subparts: [{ text: "a", marks: 1 }, { text: "b", marks: 1 }] } });
expect(two.subparts.map((p) => p.marks)).toEqual([1, 3]); // what normalizeSubpartMarks returns today: the parts add up to the slot's 4
expect(two.subparts[0].label).toBe("(1)");
expect(two.attemptCount).toBeUndefined();
const any = aiQuestionPayload({ ...base, generated: { text: "Q", attemptCount: 1, subparts: [{ text: "a", marks: 4 }, { text: "b", marks: 4 }] } });
expect(any.attemptCount).toBe(1);
expect(aiQuestionPayload({ ...base, generated: { text: "Q", attemptCount: 2, subparts: [{ text: "a" }, { text: "b" }] } }).attemptCount).toBeUndefined();
```

- [ ] **Step 2: Run** `npx vitest run src/lib/aiQuestionPayload.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `aiQuestionPayload`, then replace the three blocks in `PICKER` with calls to it (the OR question uses `type: generated.orQuestion.type || pickType`; the edit path spreads the payload into the draft `QuestionDto`, including `cognitiveLevel`). Delete `keptAttemptCount` and the `as any` casts it leaves unused.
- [ ] **Step 4: Controls.** Add a `Skill` select beside Difficulty with the four `SKILLS` (state stays `aiCognitiveLevel`, default `"UNDERSTANDING"`). Difficulty options show `difficultyLabel`. The preview badges show `difficultyLabel(aiGenerated.difficulty)` and `skillLabel(aiGenerated.cognitiveLevel)` (no badge when empty). The prompt line at `:348` keeps sending the enum value.
- [ ] **Step 5: Run** `npx vitest run src/lib/aiQuestionPayload.test.ts` (PASS), `npm test`, `npx tsc --noEmit`, eslint on touched files.
- [ ] **Step 6: Commit** `fix(modal): AI questions save their skill; one payload builder`.

---

### Task 6: Editing on the paper uses the same shell

**Files:**
- Modify: `src/app/(app)/papers/[id]/page.tsx` (row fields `:2025-2062`, edit modal `:2596-2657`, handlers `:379-403`)

**Interfaces:**
- Consumes: `modalTitle`, `chapterOptionIds` (Task 1); `orChapterRule` and its two constants (Task 2); `typeFromParent`, `detailsExtra`, `chapterHint` (Task 3).
- Produces: nothing for later tasks.

- [ ] **Step 1: Title and type.** The edit modal title is `modalTitle({ mode: "edit", sectionTitle, type: editing.type, marks: editSection.marksEach, chips: false, target })` — the question's own type, not the section's. Pass `typeFromParent={editing.type}` and remove `fixedType={editSection.type}`.
- [ ] **Step 2: Chapter list.** `allowedChapterIds={chapterOptionIds(paper.blueprint.chapters.map((c) => c.chapterId), editing.chapterId, target === "or" && orChapterRule(paper.blueprint.book.className) === "required" ? editItem.question.chapterId : null)}`. For an OR target pass `chapterHint` with `OR_CHAPTER_REQUIRED` or `OR_CHAPTER_GUIDELINE` to match, and replace the paragraph under the Main/OR switch with the same sentence plus `It carries the same {n} mark(s).`
- [ ] **Step 3: Move the two row fields into the modal.** Delete the "Syllabus component" select and "Printed instruction" input from the question row. For the primary target, pass them as `detailsExtra`: a select (shown only when `blueprintComponents.length > 0`, same options, first option `Not assigned`) and a text input (`maxLength={300}`, placeholder `Optional line printed above this question`), both held in local state initialised from the item. They are saved when the form is saved: after the `PUT` succeeds, send one `PATCH /api/papers/{id}/questions/{itemId}` with only the changed keys of `{ instruction, componentKey }` (two requests if the route rejects both together), then `adopt` the last response. Cancel discards them. Delete `handleSetInstruction` and `handleSetComponent` if nothing else calls them.
- [ ] **Step 4: Keep the facts visible on the row.** Where the two inputs were, show read-only text only when set: `Instruction: "{text}"` and `Component: {title}`, in the existing 11px slate style, so a teacher still sees a stored instruction without opening the modal.
- [ ] **Step 5: Verify.** `npx tsc --noEmit`, `npx eslint "src/app/(app)/papers/[id]/page.tsx"` (no new problems against the file's baseline), `npm test`.
- [ ] **Step 6: Commit** `feat(modal): edit on the paper uses the question's own type and holds its paper fields`.

---

### Task 7: Bank page and its AI tool

**Files:**
- Modify: `src/components/AIQuestionGeneratorModal.tsx` (type options `:429-444`, difficulty `:468-476`, skill `:480-493`, preview badges `:537-543`)
- Modify: `src/app/(app)/questions/page.tsx` (filter `:559`, list badge `:662`, bulk buttons `:828`, edit modal `:862-887`, `onInsertQuestion` `:1020-1047`)
- Modify: `src/components/SectionAiModal.tsx:622` (badge)

**Interfaces:**
- Consumes: `difficultyLabel`, `skillLabel` (Task 1); `SKILLS`, `skillOf` (`questionTagging.ts`).
- Produces: nothing for later tasks.

- [ ] **Step 1: AI tool.** Remove the `NUMERICAL` option (it is not in `QUESTION_TYPES`). Difficulty options read Easy / Average / Difficult with no parenthetical. The "Bloom's Cognitive Level" field becomes `Skill` with the four `SKILLS`; default `"UNDERSTANDING"`. Preview badges use `difficultyLabel` and `skillLabel`.
- [ ] **Step 2: Pass marks and skill through.** In `BANK`, `onInsertQuestion` sets `cognitiveLevel: skillOf(q.cognitiveLevel)` on the draft and stores `q.marks` in a new state `draftMarks`; the edit modal passes `targetMarks={draftMarks ?? undefined}` to `QuestionForm` and clears it on close. Check that `QuestionForm` reads `initial.cognitiveLevel` and `initial.difficulty` for a draft with an empty `id` (it does at `FORM:314-315`); if `autoTag` overrides them because `initial` is set, no change is needed.
- [ ] **Step 3: Labels.** The bank's difficulty filter, list badge and bulk "set difficulty" buttons, and the `SectionAiModal` question badge, show `difficultyLabel(...)`. Values sent to the server are unchanged.
- [ ] **Step 4: Verify.** `npx tsc --noEmit`, eslint on the three files, `npm test`. Run `grep -rn "Bloom\|NUMERICAL" src/components src/app` and confirm no teacher-facing hit remains (prompt text inside `src/lib/gemini.ts` is out of scope).
- [ ] **Step 5: Commit** `fix(bank): AI tool uses real types, shared difficulty and skill names`.

---

## After the tasks

The controller checks in the running app (`preview_start {name:"dev"}`, Browser pane shown): add on a single-type section (no chips, no type dropdown, chapter visible with "Suggested"), add on a multi-type section (chips only; text survives a chip switch), add opens on Write, replace and OR open on From bank, an OR from another chapter is accepted on a class 6 to 8 paper and refused on a class 9 to 12 paper, Paste several inside Write, edit shows the question's own type and saves instruction and component, bank "New question" keeps one enabled type dropdown. Then a whole-branch review.
