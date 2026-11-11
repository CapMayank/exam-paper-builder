# Chapter Weightage as a Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapter-wise marks stop blocking teachers: any question that fits its section can be added, a paper is complete when its sections are full, chapters are matched automatically, and an on-demand AI check reports the real chapter spread.

**Architecture:** The pure rules in `src/lib/blueprint.ts` lose every chapter check, so the server routes and UI that call them stop refusing without their own changes. Chapter numbers survive only as `paperStatus().chapters`, which feeds a coverage panel. A new single-request Gemini classifier adds the AI coverage check behind its own route.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React, TypeScript, Prisma + SQLite, Vitest, Gemini via `src/lib/gemini.ts`.

**Spec:** `docs/superpowers/specs/2026-11-11-chapter-weightage-as-guide-design.md`

## Global Constraints

- Chapter weightage never blocks adding, replacing, editing, pasting, AI commit, auto-fill or finalising.
- Strict rules that stay: section slot count, question type and marks per slot, passage role, internal choice (OR), and "blueprint section total equals chapter total" (`validateBlueprint`).
- No Prisma schema change. `Question.chapterId` stays required.
- Teachers are not asked for a chapter while building a paper; `suggestChapter` in `src/lib/questionTagging.ts` assigns it.
- The AI coverage check is one Gemini request per run and is never required.
- UI copy fixed by the spec: panel title `Chapter coverage (estimate)`; rows `<title> · <used> of <target>`; amber when `|used - target| > 1`; hint label `Under-covered:`; button `Check coverage with AI`. The words "left", "full" and "quota" do not appear in the coverage UI.
- Before writing or changing any route or page code, read the relevant guide in `node_modules/next/dist/docs/` (project `AGENTS.md`).
- Run `npx tsc --noEmit -p .` and `npx vitest run` green before each commit.

## Review Focus

1. A bank question whose chapter is not in the blueprint: it is added, and the panel footer counts it (test in Task 1 and Task 6).
2. A chapter (or unit of chapters sharing `unitKey`) pushed far over its target: adding still succeeds and `complete` is still true once sections are full (test in Task 1).
3. Composed text the matcher cannot place (one word, Hindi-only, or a blueprint whose targets are all met): a chapter is still assigned, never an empty id (test in Task 4).
4. The AI returns an unknown chapter id, a question number it was not sent, or fewer rows than questions: those rows are dropped and the rest are used (test in Task 8).
5. "Apply" when the teacher may not edit some of the questions: the permitted ones change, the others are named as skipped, and nothing else on the paper changes (test in Task 8).

---

### Task 0: Branch and baseline

**Files:** none changed.

- [ ] **Step 1:** `git switch -c feat/chapter-weightage-guide`
- [ ] **Step 2:** Commit the working tree as it stands (today's dead-end fixes, the spec, this plan): `git add -A && git commit -m "chore: baseline before chapter-weightage-as-guide"`

---

### Task 1: Rules without chapter checks

**Files:**
- Modify: `src/lib/blueprint.ts`
- Delete: `src/lib/quota-stranding.test.ts`
- Create: `src/lib/chapter-guide.test.ts`
- Modify (callers of deleted exports, mechanical): `src/components/QuestionPicker.tsx`, `src/components/SectionAiModal.tsx`, `src/components/PasteQuestionsPanel.tsx`, `src/app/(app)/papers/[id]/page.tsx`, `src/app/api/papers/[id]/questions/[itemId]/route.ts`
- Modify (tests that assert chapter refusals): `src/lib/logic.test.ts`, `src/lib/official-scheme-commit-regression.test.ts`, `src/lib/template-workflow-matrix.test.ts`, `src/lib/school-paper-flow.test.ts`, `src/lib/teacher-audit-fixes.test.ts`, and any other test Step 4 shows failing

**Interfaces:**
- Produces: `whyCannotAdd(bp, items, candidate): string | null` (three parameters; the `opts.replaces` parameter is gone). It returns a reason only for: unknown section, `typeRejection`, `roleMismatchReason`, section full, not enough slots.
- Produces: `paperStatus(bp, items).complete === sections.every(filled === needed)`. `.chapters` is unchanged.
- Produces: `diagnosePaperImplications` emits `CHAPTER_EXCESS` and `CHAPTER_DEFICIT` with `severity: "warning"`, plus new code `CHAPTER_OUTSIDE_BLUEPRINT` (`severity: "warning"`, one per paper, `details: { count, itemIds }`). Add the code to the `PaperImplication["code"]` union.
- Removed exports: `chaptersOpenForSlot`. Removed internals: `canStillComplete`, `strandsChapterMarks`, `partitionFeasible`, `completableCache`, `STRANDS_MARKS_REASON`, `rawQuotaUsage` (if unused after the edit). `checkBoundedPartitionFeasible` returns to its original single-function form until Task 7 deletes it.

- [ ] **Step 1: Write the failing tests** in `src/lib/chapter-guide.test.ts`

```ts
const bp: BlueprintDef = {
  sections: [
    { id: "obj", title: "Section A", type: "MCQ", count: 5, marksEach: 1 },
    { id: "long", title: "Section D", type: "LONG", count: 1, marksEach: 5 },
  ],
  chapters: [{ chapterId: "X", marks: 5 }, { chapterId: "Y", marks: 3 }, { chapterId: "Z", marks: 2 }],
};
const one = (chapterId: string): PlacedItem => ({ sectionId: "obj", chapterId, marks: 1 });

it("adds a question from a chapter that is already over its target", () => {
  const items = [one("Z"), one("Z"), one("Z")];
  expect(whyCannotAdd(bp, items, { sectionId: "obj", chapterId: "Z", type: "MCQ", marks: 1 })).toBeNull();
});
it("adds a question whose chapter the blueprint does not list", () => {
  expect(whyCannotAdd(bp, [], { sectionId: "obj", chapterId: "NOT_LISTED", type: "MCQ", marks: 1 })).toBeNull();
});
it("adds a 5-mark question when no chapter has 5 marks to spare", () => {
  const items = [one("X"), one("X"), one("Y"), one("Y"), one("Z")];
  expect(whyCannotAdd(bp, items, { sectionId: "long", chapterId: "Z", type: "LONG", marks: 5 })).toBeNull();
});
it("still refuses a full section and a wrong type", () => {
  const full = [one("X"), one("X"), one("X"), one("X"), one("X")];
  expect(whyCannotAdd(bp, full, { sectionId: "obj", chapterId: "Y", type: "MCQ", marks: 1 })).toMatch(/already full/);
  expect(whyCannotAdd(bp, [], { sectionId: "obj", chapterId: "Y", type: "LONG", marks: 1 })).toMatch(/only accepts/);
});
it("is complete when sections are full, whatever the chapter spread", () => {
  const items = [one("Z"), one("Z"), one("Z"), one("Z"), one("Z"), { sectionId: "long", chapterId: "Z", marks: 5 }];
  const st = paperStatus(bp, items);
  expect(st.complete).toBe(true);
  expect(st.chapters.find((c) => c.chapterId === "Z")).toMatchObject({ target: 2, used: 10 });
});
it("shares a unit's numbers and never blocks on them", () => {
  const units: BlueprintDef = { sections: bp.sections, chapters: [{ chapterId: "A1", marks: 1, unitKey: "u" }, { chapterId: "A2", marks: 1, unitKey: "u" }, { chapterId: "B", marks: 8 }] };
  const items = [one("A1"), one("A1"), one("A2")];
  expect(whyCannotAdd(units, items, { sectionId: "obj", chapterId: "A2", type: "MCQ", marks: 1 })).toBeNull();
  expect(paperStatus(units, items).chapters.find((c) => c.chapterId === "A2")).toMatchObject({ target: 2, used: 3 });
});
it("reports chapter gaps and outside-blueprint questions as warnings", () => {
  const imps = diagnosePaperImplications(
    { sections: bp.sections, chapters: bp.chapters },
    [{ id: "i1", sectionId: "obj", chapterId: "NOT_LISTED", type: "MCQ" }, { id: "i2", sectionId: "obj", chapterId: "Z", type: "MCQ" }],
  );
  expect(imps.find((i) => i.code === "CHAPTER_OUTSIDE_BLUEPRINT")).toMatchObject({ severity: "warning", details: { count: 1 } });
  expect(imps.filter((i) => i.code === "CHAPTER_EXCESS" || i.code === "CHAPTER_DEFICIT").every((i) => i.severity === "warning")).toBe(true);
});
```

- [ ] **Step 2:** Run `npx vitest run src/lib/chapter-guide.test.ts`. Expected: FAIL (chapter refusals, `complete` false).
- [ ] **Step 3:** Edit `src/lib/blueprint.ts` to the Interfaces above. Delete `src/lib/quota-stranding.test.ts`.
- [ ] **Step 4:** Make callers compile, without redesigning them yet (later tasks do that): drop the `{ replaces }` arguments; in `QuestionPicker.tsx` set `openChapters` to all blueprint chapters, delete `quotaDeadEnd`, `replacedPlaced`, `placementProblems`, `batchProblem` and their uses; in `PasteQuestionsPanel.tsx` remove the `placementProblems` prop; in `SectionAiModal.tsx` remove `quotaDef`, `placedNow`, `slotCandidate`, `canTake` and the pre-generation refusal loop; in the paper page remove `openChapterIdsBySection`. Run `npx tsc --noEmit -p .`. Expected: no output.
- [ ] **Step 5:** Run `npx vitest run`. For each failing test: if it asserts a chapter refusal or chapter-driven incompleteness, rewrite the assertion to the new rule (addable; complete when sections are full); if it asserts anything else, the implementation is wrong. Expected at the end: all pass.
- [ ] **Step 6:** Commit: `feat(blueprint): chapter weightage no longer blocks placement or completeness`

---

### Task 2: Finalise, preflight and blueprint-edit impact

**Files:**
- Modify: `src/lib/preflight.ts`, `src/lib/blueprintSetup.ts:166`
- Test: `src/lib/chapter-guide.test.ts` (append)

**Interfaces:**
- Consumes: `paperStatus().complete`, implication codes from Task 1.
- Produces: `validatePaperPreflight` adds one `info` issue, code `CHAPTER_COVERAGE`, when any chapter's used differs from its target, message `Chapter coverage differs from the blueprint for N chapter(s). This does not stop finalising.`
- Produces: in `blueprintSetup.ts` the `problems` filter also excludes `CHAPTER_EXCESS` and `CHAPTER_OUTSIDE_BLUEPRINT`, so a chapter gap never marks a paper "needs review" or reverts a FINAL paper to draft; `revertToDraft` counts only when `problems.length > 0`.

- [ ] **Step 1:** Add tests: a paper with full sections and uneven chapters gives `canFinalize: true` with one `CHAPTER_COVERAGE` info issue; `finaliseBlocker` returns null for it; a paper with an underfilled section still gives `BLUEPRINT_INCOMPLETE`.
- [ ] **Step 2:** Run them. Expected: FAIL on the missing info issue.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npx vitest run`. Expected: all pass.
- [ ] **Step 5:** Commit: `feat(papers): chapter gaps are information at finalise and after blueprint edits`

---

### Task 3: Auto-fill never leaves a slot empty over chapter targets

**Files:**
- Modify: `src/lib/autofill.ts` (the candidate filters at lines ~308 and ~361 that require `chapterRemaining >= slot.cost`, and the match pre-pick at ~165)
- Test: `src/lib/autofill-guide.test.ts` (create)

**Interfaces:**
- Produces: `autoFillPaper` signature unchanged. Candidates within their chapter's remaining target are still preferred and ordered as today; when a slot has none, candidates over target are used, least-over first.

- [ ] **Step 1:** Test: blueprint `X:1, Y:1` (two 1-mark MCQ slots), pool of two MCQs both in chapter `X`. Expect `added.length === 2` and no unfilled slot for that section.
- [ ] **Step 2:** Run. Expected: FAIL (one slot unfilled).
- [ ] **Step 3:** Implement as a second pass after the existing search: for each slot still empty, take the best unused candidate of an allowed type ignoring `chapterRemaining`.
- [ ] **Step 4:** Sweep the other placement paths for their own chapter refusals: `rg -n "allows only|marks left|chapterRemaining|quota" "src/app/api/papers/[id]/autofill/route.ts" "src/app/api/papers/[id]/import-questions/route.ts" "src/app/api/papers/[id]/ai-commit-section/route.ts" src/lib/paperImport.ts src/lib/paperAutogen.ts`. Any branch that rejects, skips or reports failure for a question because of its chapter's marks becomes a preference only (the question is placed). Branches about AI request quota are left alone. Add one test per path changed, asserting the question is placed.
- [ ] **Step 5:** `npx vitest run`. Expected: all pass, including `src/lib/paperAutogen.test.ts`, the autofill tests and the import tests.
- [ ] **Step 6:** Commit: `feat(autofill): fill every slot, preferring under-covered chapters`

---

### Task 4: Chapter assigned without asking

**Files:**
- Modify: `src/lib/questionTagging.ts`, `src/components/QuestionForm.tsx`, `src/components/PasteQuestionsPanel.tsx`, `src/lib/pasteQuestions.ts`, `src/components/QuestionPicker.tsx`
- Test: `src/lib/questionTagging.test.ts` (append, or create if absent)

**Interfaces:**
- Produces: `assignChapter(text: string, chapters: ChapterLite[], gaps: Record<string, number>, bank?: ChapterBank): string` in `questionTagging.ts`. It returns `suggestChapter(...)`'s chapter when there is one; otherwise the chapter with the largest `gaps` value (`target - used`, may be negative), ties to the lowest chapter number; it throws only when `chapters` is empty.
- Produces: `QuestionForm` prop `hideChapter?: boolean`. When true the chapter field and its note are not rendered and the submitted `chapterId` is `assignChapter(text, chapters, openMarks ?? {}, chapterBank)`.
- Produces: `assignChapters(texts, chapters, gaps)` in `pasteQuestions.ts` loses its `marksEach` parameter and never returns `null`; `PasteQuestionsPanel` drops the per-row chapter select and the "No chapter has marks left" problem.
- Picker passes `hideChapter` and `openMarks = gaps` for all blueprint chapters to `QuestionForm`, and `gaps` to `PasteQuestionsPanel`; `allowedChapterIds` is no longer passed.

- [ ] **Step 1:** Tests for `assignChapter`: text naming a chapter title returns that chapter; `"x"` with gaps `{a: -2, b: 3}` returns `b`; Hindi-only text with all gaps negative returns the least-negative chapter; empty `chapters` throws.
- [ ] **Step 2:** Run. Expected: FAIL (`assignChapter` not exported).
- [ ] **Step 3:** Implement `assignChapter`, then the form, paste and picker changes.
- [ ] **Step 4:** `npx tsc --noEmit -p .` and `npx vitest run`. Expected: clean, all pass (update `src/lib/pasteQuestions` tests for the new `assignChapters` signature).
- [ ] **Step 5:** Commit: `feat(picker): chapters are matched automatically when composing or pasting`

---

### Task 5: Picker and AI dialogs stop talking about quotas

**Files:**
- Modify: `src/components/QuestionPicker.tsx`, `src/components/SectionAiModal.tsx`

**Interfaces:**
- Consumes: `paper.progress.chapters` (`{ chapterId, target, used }`).
- Produces (picker, bank tab): `ranked` sorts addable questions by chapter gap descending (`target - used`), then `timesUsed`, then newest. The chapter filter options carry no suffix. The "all questions exceed remaining chapter mark quotas" notice is deleted.
- Produces (picker, AI tab) and `SectionAiModal`: the chapter select lists every blueprint chapter as `Ch N: Title (U of T)`, defaulting to the largest gap. The "Exceeds chapter quota" / "Within quota" strip and "N marks left" badges are deleted. The auto allocation keeps the planner's slots, then largest gap.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `rg -n "quota|Quota" src/components/QuestionPicker.tsx src/components/SectionAiModal.tsx`. Expected: only AI-usage quota strings (Gemini request limits), none about chapters.
- [ ] **Step 3:** `npx tsc --noEmit -p .` and `npx vitest run`. Expected: clean, all pass.
- [ ] **Step 4:** Commit: `feat(picker): order by chapter coverage instead of blocking on it`

---

### Task 6: Coverage panel, hints, and removal of Auto-Rebalance

**Files:**
- Modify: `src/app/(app)/papers/[id]/page.tsx` (panel at ~1181-1240, implications list at ~1666-1690, empty-slot hint at ~2499-2545), `src/components/AIPaperAuditModal.tsx`, `src/app/papers/[id]/print/page.tsx:428` (banner text only if it mentions chapters)
- Create: `src/lib/coverage.ts`, `src/lib/coverage.test.ts`
- Delete: `src/app/api/papers/[id]/reconcile-blueprint/route.ts`, `src/lib/reconcileBlueprint.ts`, `src/lib/reconcileBlueprint.test.ts`
- Modify: `src/lib/quota-or-choice-regression.test.ts`, `src/lib/paper-lifecycle-review.test.ts` (drop their reconcile cases)

**Interfaces:**
- Produces: `coverageRows(paper: Pick<PaperData, "blueprint" | "progress" | "items">): { rows: Array<{ key: string; title: string; target: number; used: number; off: boolean }>; outsideCount: number; underCovered: Array<{ chapterId: string; number: number }> }` in `src/lib/coverage.ts`. One row per quota group (chapters sharing `unitKey` are one row titled `unitTitle`); `off` is `Math.abs(used - target) > 1`; `outsideCount` counts items whose chapter is not in the blueprint; `underCovered` is chapters with `used < target`, largest gap first.

- [ ] **Step 1:** Tests for `coverageRows`: unit grouping gives one row; `used 4 / target 5` is not `off`, `used 7 / target 5` is; an item from an unlisted chapter gives `outsideCount: 1` and no row; `underCovered` order.
- [ ] **Step 2:** Run. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `coverage.ts`, then the page: panel per the Global Constraints copy, footer `N question(s) are from chapters outside this blueprint.` when `outsideCount > 0`, empty-slot hint `Under-covered: Ch 3, Ch 7` (first three), no hint when none. Remove the Auto-Rebalance button, its `reconciling` state and handler, and the reconcile action in `AIPaperAuditModal.tsx`. Delete the reconcile route, lib and tests.
- [ ] **Step 4:** `rg -n "reconcile" src`. Expected: no matches. `npx tsc --noEmit -p .` and `npx vitest run`. Expected: clean, all pass.
- [ ] **Step 5:** Commit: `feat(papers): chapter coverage panel replaces weightage quotas; remove auto-rebalance`

---

### Task 7: Remove blueprint feasibility warnings

**Files:**
- Modify: `src/lib/blueprint.ts` (delete `checkBlueprintFeasibility`, `checkBoundedPartitionFeasible`), `src/app/(app)/blueprints/[id]/page.tsx` (lines ~14, ~20, ~242, ~1061), `src/app/api/curriculum/blueprints/adapt/route.ts`
- Delete: `src/app/api/blueprints/feasibility/route.ts`, `src/components/blueprints/FeasibilityStatusAlert.tsx`
- Modify: the feasibility cases in `src/lib/logic.test.ts`, `m2-challenger-2-adversarial.test.ts`, `m2-challenger-blueprint.test.ts`, `m2-forensic-adversarial.test.ts`, `mpbse-blueprints.test.ts`, `school-paper-flow.test.ts`, `template-workflow-matrix.test.ts` (remove those cases; keep `validateBlueprint` cases)

**Interfaces:**
- Produces: `validateBlueprint` unchanged and still enforced. The adapt route's response keeps its shape with `warnings: []`.

- [ ] **Step 1:** Delete and edit as listed.
- [ ] **Step 2:** `rg -n "easibility" src`. Expected: no matches. `npx tsc --noEmit -p .` and `npx vitest run`. Expected: clean, all pass.
- [ ] **Step 3:** Commit: `refactor(blueprints): drop denomination feasibility warnings`

---

### Task 8: AI coverage check

**Files:**
- Modify: `src/lib/gemini.ts`
- Create: `src/lib/aiCoverage.ts`, `src/lib/aiCoverage.test.ts`, `src/app/api/papers/[id]/ai-coverage/route.ts`, `src/app/api/papers/[id]/ai-coverage/apply/route.ts`, `src/components/AICoverageModal.tsx`
- Modify: `src/app/(app)/papers/[id]/page.tsx` (button in the coverage panel, modal mount)

**Interfaces:**
- Produces in `gemini.ts`: `classifyPaperChaptersWithGemini(params: { className: string; subject: string; chapters: Array<{ id: string; number: number; title: string }>; questions: Array<{ number: number; text: string; marks: number }>; apiKey?: string | null }): Promise<GeminiCallResult<{ rows: Array<{ number: number; chapterId: string; confidence: "HIGH" | "MEDIUM" | "LOW" }> }>>`. One `callGeminiApi` call, JSON response schema, same model chain and failure handling as `generateAnswerKeyWithGemini`. No offline template fallback: without a usable key it returns `success: false` with the existing quota or configuration message.
- Produces in `aiCoverage.ts` (pure): `buildCoverageReport(input: { items: Array<{ itemId: string; questionId: string; number: number; marks: number; storedChapterId: string }>; targets: Array<{ chapterId: string; title: string; target: number }>; rows: Array<{ number: number; chapterId: string; confidence: string }> }): { spread: Array<{ chapterId: string; title: string; target: number; aiMarks: number }>; disagreements: Array<{ itemId: string; questionId: string; number: number; storedChapterId: string; aiChapterId: string; confidence: "HIGH" | "MEDIUM" | "LOW" }>; unclassified: number[] }`. Rows with an unknown chapter id or a number not in `items` are dropped; duplicate numbers keep the first; items with no row go to `unclassified` and count under their stored chapter in `spread`.
- Produces: `POST /api/papers/[id]/ai-coverage` (reads header `x-gemini-api-key` like the other AI routes) returns the report; 429 with the quota text when out of quota; 502 with the failure text otherwise.
- Produces: `POST /api/papers/[id]/ai-coverage/apply`, body `{ changes: Array<{ questionId: string; chapterId: string }> }`, returns `{ applied: string[]; skipped: Array<{ questionId: string; reason: string }>; paper: PaperData }`. Per change: the question must be on this paper, the chapter must belong to the paper's book, and `assertCanModifyQuestion` must pass; a failure skips that change only. The paper must not be FINAL (409).
- Modal: spread table (chapter, target, AI marks), disagreement list `Q7: stored Ch 2, AI says Ch 5 (HIGH)`, `Apply N changes` button, then a line naming skipped questions.

- [ ] **Step 1:** Tests for `buildCoverageReport`: happy path; unknown chapter id dropped; number not sent dropped; fewer rows than items puts the rest in `unclassified` and keeps their stored chapter in `spread`; duplicate number keeps the first.
- [ ] **Step 2:** Run. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `aiCoverage.ts`. Run. Expected: PASS.
- [ ] **Step 4:** Test for apply (follow the route-test pattern in `src/lib/paper-lifecycle-review.test.ts`): two changes, one question the user may not modify; expect `applied.length === 1`, `skipped.length === 1`, and the unpermitted question's `chapterId` unchanged in the database.
- [ ] **Step 5:** Implement the classifier, both routes, the modal and the button (`Check coverage with AI`).
- [ ] **Step 6:** `npx tsc --noEmit -p .` and `npx vitest run`. Expected: clean, all pass.
- [ ] **Step 7:** Commit: `feat(papers): on-demand AI chapter coverage check`

---

### Task 9: Verify in the app

**Files:** none changed unless a defect is found.

- [ ] **Step 1:** In the dev app, on the local "QA Compose" paper: add a Chapter 1 MCQ to Section A (refused before this work). Expected: it is added, the panel shows `Light · 2 of 3`, and no "left/full/quota" wording appears.
- [ ] **Step 2:** Fill the remaining slot via "Compose New Question" with no chapter field shown. Expected: saved and placed; the paper shows as complete; Finalise is offered.
- [ ] **Step 3:** Click `Check coverage with AI`. Expected: a report, or the honest quota message when the key is spent.
- [ ] **Step 4:** Restore the QA paper to its previous state (remove the two added questions), or note that it was changed.
- [ ] **Step 5:** `npx eslint` on the changed files: no new errors on changed lines.
