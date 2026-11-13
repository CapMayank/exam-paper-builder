# Flexible marks for classes up to 8: match questions that span slots, pair value, and mark pools

Date: 2026-11-13. Status: draft, awaiting approval.

## Intent
A blueprint says "Section A: 5 x 1 mark MCQ". Today a Match-the-Column question dropped into it counts as one question and one mark, however many pairs it has, so totals and slots lie. Teachers of classes up to 8 want question types to mix freely inside the marks the blueprint offers: a 4-pair match uses 4 marks of the objective sections and the remaining slots shrink to match.

## Goals
1. A match question occupies as many marks as it is worth, and uses up that many slots of the section.
2. The teacher chooses the pair value: 1 mark per pair, or 1/2 mark per pair.
3. Same-mark objective sections can lend slots to each other on one paper, so the paper total never moves.
4. AI fill (autofill), AI generate and AI commit obey exactly the same rules as manual placement.

## Non-goals
- Classes 9 to 12 stay rigid, byte-for-byte: no new behaviour, no new UI.
- The blueprint itself is never edited by this; all flexibility lives on the paper.
- No new question types, no fractional marks stored in the database.

## Anti-goals
- Any path (manual, picker, bulk, edit, autofill, AI) that counts a match differently from another.
- A paper total that changes because types were mixed.

## Constraints (found in the code)
- Every placement route already goes through `slotPlacement`, `whyCannotAdd` and `questionSlotMarks` in `src/lib/blueprint.ts`. These are the single seam; fix them and the picker, bulk, edit, autofill, print, preflight and audit follow.
- The multi-slot match rule is hard-wired to `section.type === "MATCH_COLUMN"` with `count > 1` and `marksEach === 1` (blueprint.ts lines 390, 605, 633). `typeRejection` forces a non-default type to carry exactly `marksEach`.
- A placed question's marks and slot count are derived, not stored (`PaperQuestion` has no marks column). Phase B therefore adds one nullable column `PaperQuestion.pairMarks Float?` (null = 1 per pair). 1/2 per pair is only allowed when the pair count is even, so a question's marks stay whole. The repo has no `prisma/migrations`; schema changes go through `prisma db push`. Phase A needs no schema change.
- The class gate already exists: `effectiveAllowedTypesJson` widens sections only up to class 8 (and for Nursery/KG). The same rule decides "flexible".

## Approaches considered
- A, slot-span: match fills N slots of any one-mark section. Smallest; no schema change.
- B, pair value: adds the 1/2 choice on top of A. No schema change.
- C, mark pools: same-mark sections lend slots. Needs a per-paper override table.
- Rejected: a full free-for-all mark pool that ignores sections (autofill, numbering, instructions and answer key all assume sections), and editing the blueprint per paper (blurs template and paper).
- Chosen by the user: A, then B, then C, one after another, each shipped and tested before the next.

## Design

### Shared: the "flexible" flag
`withEffectiveAllowedTypes` (the function that loads sections for papers) also sets `flexible: true` on a section when the book's class is 8 or lower, or has no readable number but is not kindergarten-typed. Classes 9+ get `flexible: false`, and every new code path checks it first and falls back to today's logic.

### Phase A: slot-span
- A match question in a flexible section whose `marksEach` is 1, and whose allowed types include MATCH_COLUMN, uses `units = pairs` slots and `marks = pairs` (before B).
- `whyCannotAdd` refuses it with a clear message when `pairs` exceeds the free slots ("Section A has 2 free slots; this match has 4 pairs"). `typeRejection` skips the "must equal marksEach" check for match in this case.
- `questionSlotMarks` / `slotPlacement` return `marks` and `subpartsCount = pairs`; paperStatus, completeness, print and audit already read `subpartsCount`, so they follow.
- Workbench: the match row shows "Match (4 pairs, 4 marks, uses Q3-Q6)" and the covered slots render as part of it, not as empty rows.
- Editing a match's pairs re-checks the section; shrinking frees slots, growing may be refused.

### Phase B: pair value
- New control on a placed match: "Marks per pair: 1 | 1/2". 1/2 is disabled for an odd pair count.
- Marks = pairs x pairValue; slots used = marks / marksEach (must be a whole number, else refused with the reason).
- Print, DOCX and the answer key show the marks as stored (whole numbers); the instruction line can say "1/2 mark each".

### Phase C: mark pools (class 8 and below)
- Sections with the same `marksEach` and objective types form a pool automatically.
- A teacher can move N slots from one section of the pool to another on a paper ("Rebalance"). Stored as a per-paper override: new table `PaperSectionSlots(paperId, sectionId, delta)`, with deltas in a pool summing to zero, so the paper total is unchanged.
- Effective count of a section = blueprint count + delta. `paperStatus`, `whyCannotAdd`, autofill, print numbering and preflight all read the effective count.
- Blueprint and classes 9+ never see the override table.

### AI wiring (every phase)
- Autofill: slot planning in `autofill.ts` gets the same effective-count and span logic. Today its match handling is limited to match sections (lines 159 to 190); extend it so a match candidate can fill N free slots of a flexible section, using `slotPlacement` so it agrees with manual placement.
- AI generate (`ai-generate-section`): when a section allows MATCH_COLUMN and has N free slots, the prompt may ask for a match question with up to N pairs, and the pair count is validated against the free slots. Type allowed-list check stays.
- AI commit (`ai-commit-section`): already validates through `whyCannotAdd` with `slotPlacement`; it gets the flexible sections and effective counts so a generated match commits with the right marks and slot count.
- All three are covered by tests that place the same match via the picker, autofill and AI commit and compare marks and slots.

## Testing
- Pure unit tests for `questionSlotMarks`, `slotPlacement`, `whyCannotAdd` per phase, including class 9 staying unchanged.
- API tests for questions, bulk, edit, autofill, ai-generate-section, ai-commit-section.
- One end-to-end workbench flow per phase.

## Left to the builder
- Exact wording of the refusal messages and the workbench labels.
- Migration for phase C and the UI for "Rebalance".
- Whether the OR-question swap on a match row needs special handling (decide while building A).

## Calls I made (please check)
1. 1/2 mark per pair only for even pair counts, so a question's marks stay whole (B adds one nullable `pairMarks` column).
2. Classes with no readable number (Nursery/KG) follow the existing widening rule, except kindergarten-typed sections, which stay strict.
3. Pools are same-`marksEach` objective sections only, and are per paper, never written to the blueprint.
4. Each phase is its own commit and can be used on its own.
