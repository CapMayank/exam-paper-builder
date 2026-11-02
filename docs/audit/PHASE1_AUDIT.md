# Phase 1 Audit: Blueprint, Curriculum and Paper Pipeline

Scope inspected: `prisma/schema.prisma`, `src/lib/{blueprint,curriculumTemplates,curriculumData,curriculumContract,gemini,papers,paperCompletenessEngine,questionVerificationEngine,evidenceAuditEngine}.ts`, template inventory (generated with `scratch/inv.ts`), existing tests.
Status: audit complete for the template and placement layers. Authoritative-source research (Phase 2) has **not** been done; nothing below claims a template matches an official MPBSE blueprint.

## Findings

| # | Area | Existing problem | Root cause | Impact | Recommended fix | Priority |
|---|---|---|---|---|---|---|
| 1 | Blueprint data model | `BlueprintSection` is flat: `type`, `count`, `marksEach`. No question group, no passage parent, no section role. | The schema models "N questions of one type at M marks", copied from science/maths papers. | Unseen passages, grammar categories and writing tasks cannot be represented. This is the real source of the passage-MCQ leak. | Add section role and question-group entities (Section → Group → Question → Subquestion). Additive nullable columns, `db push` (repo has no migrations dir). | P0 |
| 2 | Placement | `whyCannotAdd` accepts a question when `candidate.type === section.type` and a slot is free. | Placement is decided by type + marks only. | A passage's 1-mark MCQ fits any MCQ section: Reading, Literature and objective sections all look identical. | Place by blueprint group id, not type. Passage subquestions are children of one parent and are never placed independently. | P0 |
| 3 | English templates | "Section A: Reading Comprehension (Unseen Passages)" is `MCQ ×10 @1`; Class 11/12 "Reading Skills" is `MCQ×10 + SHORT×1`. Section D Literature is also `MCQ`. | Passage section authored as flat slots. | Two sections with identical slot types; the passage section has no passage. | Re-author as passage groups once the official pattern is confirmed. | P0 |
| 4 | Hindi, Sanskrit, Urdu templates (Class 9/10 and 11/12 Hindi) | All built from the generic `STANDARD_23Q_75M/80M` archetype: MCQ, fill blank, true/false, match, very short, short, long. No unseen passage, grammar or writing. | Language subjects reuse the science/maths archetype generator. | Language papers are not shaped like a language paper. Matches the user's reported symptom. | Dedicated language archetypes, only after sourcing the official pattern. | P0 |
| 5 | Verification | File header says "ALL 27 VERIFIED MPBSE BOARD BLUEPRINT TEMPLATES". Provenance holds only a circular number (`465/विद्योचित/2026`); no URL, page, session or status. | No verification metadata exists in the model. | Unverified patterns are presented as official. | `templateVerificationStatus()` added; every built-in template currently reports `UNVERIFIED`. UI should show this. | P0 |
| 6 | Sanskrit variants | `curriculumData.ts` has one `GENERAL` variant for Sanskrit. Templates: `mpbse-10th-sanskrit-512-75m`, legacy `SANSKRIT_23Q_75M` (Shemushi) and `SANSKRIT_8SEC_75M`, with no `classLevel`/`subjectName`. | Variants are free-text archetypes, not a keyed identity (board+session+class+subject+book variant+version). | Textbook variants with and without a separate grammar book are indistinguishable; legacy templates cannot be matched to any class/subject. | Keyed template identity; separate grammar book as its own `Book`/syllabus component. | P1 |
| 7 | Curriculum vs blueprint | Chapter `officialMarks` is used as the paper's quota (`BlueprintChapter.marks`). | Chapter weightage stands in for the blueprint. | Language papers get chapter quotas but no non-chapter components. | Keep chapter weightage as one dimension of a blueprint, alongside groups and components. | P1 |
| 8 | AI generation | `gemini.ts` asks for a passage plus subparts only when the type is `UNSEEN_PASSAGE`; there is no group-level slot concept. Blueprint-import prompt (L3858) already tells the model to add reading/writing/grammar as units, but the DB cannot hold them. | Generation targets type+chapter, not blueprint group. | Passage questions can come back as stand-alone MCQs. | Slot-driven generation per group with a group-level validator. | P1 |
| 9 | Validation | Verification/evidence engines exist (`questionVerificationEngine`, `evidenceAuditEngine`). | Not yet reviewed in depth for self-validation. | Unknown whether validation is independent of generation. | Review in Phase 5. | P1 |
| 10 | Manual builder | Uses the same `whyCannotAdd`, so it inherits finding 2. | Shared placement logic. | Teachers can drop any MCQ into a passage section. | Fix with finding 2. | P1 |
| 11 | Docs | `PROJECT.md` describes an unrelated feature set (RBAC, print calculator). | Stale. | Misleading orientation. | Update after redesign. | P3 |

## Template inventory (27 MPBSE + 7 legacy)

| Class | Subject | Archetype | Language components in template? |
|---|---|---|---|
| 9, 10 | Hindi (401) | STANDARD_23Q_75M | No passage / grammar / writing |
| 9, 10 | English | ENGLISH_16Q_75M | Reading, Writing, Grammar, Literature as sections, but reading is flat MCQ |
| 9, 10 | Mathematics Standard/Basic, Science, Social Science | STANDARD_23Q_75M | n/a |
| 9, 10 | Sanskrit (512) | STANDARD_23Q_75M | No |
| 10 | Urdu (508) | STANDARD_23Q_75M | No |
| 11, 12 | Hindi (051) | STANDARD_23Q_80M | No |
| 11, 12 | English (052) | ENGLISH_15Q_80M | Same flat-reading issue |
| 11, 12 | Physics, Chemistry, Biology | SCIENCE_20Q_70M | n/a |
| 11, 12 | Mathematics (150) | STANDARD_23Q_80M | n/a |
| — | Legacy: Sanskrit ×2, CBSE ×2, middle school, unit test, kindergarten | various | Sanskrit ones lack class/subject identity |

Not present: Class 1–8 MPBSE templates, other class 11/12 subjects (History, Geography, Economics, Accountancy, etc.), second languages. The class list supported by the app is DB-driven (`AcademicClass`) and was not enumerated from a live database in this pass.

## What was changed in this pass

- `src/lib/blueprintStructure.ts`: `auditTemplateStructure()` and `templateVerificationStatus()`. It reports marks mismatch, missing source, missing class/subject identity, flat passage sections, and missing reading/grammar/writing components for language templates. It reports; it does not rewrite templates.
- `src/lib/blueprint-structure-audit.test.ts`: reproduces the flat-passage defect on all four English templates, the missing components on Hindi/Sanskrit/Urdu, and shows a correctly structured language template passes.
- Full suite: 76 files, 1459 tests pass; `tsc --noEmit` clean.

## Not done (needs your input before it can be done correctly)

1. **Official sources.** I did not fetch MPBSE blueprints or NCERT catalogues in this pass. Without them, re-authoring any language template would be inventing a pattern, which you ruled out. Please provide the official 2025–26/2026–27 blueprint PDFs, or confirm I should search the MPBSE site.
2. **Schema redesign (finding 1–2)** changes the database and every consumer of `BlueprintSection`. It is the correct fix for the passage leak, but it needs a go-ahead.

---

## Update: verified sources and second-round findings

### Official sources actually read (MPBSE, session 2026-27)
`https://mpbse.nic.in/MarksScheme_2026_27.pdf` (scanned; read from page images). Hindi 10, Hindi 11, Sanskrit 10 and Sanskrit 12 were cross-checked by a second reader; every other row in `src/lib/officialMarkingSchemes.ts` was read once (`confirmation: SINGLE_READER`). The `Class 10 English` sample paper text confirms Q1/Q2 are each a passage with five 1-mark MCQs.
- The scheme is a shared **question-format skeleton** (Q1–5 objective, Q6–17 two-mark, 18–20 three-mark, 21–23 four-mark for classes 9/10; 32/10/4/4 for 11/12; 28/7/4/4 for Biology) plus a **per-subject content allocation**. For languages that allocation is by component, not by chapter. It does not say which question number carries which component, so none is assumed.
- Circular 465/विद्योचित/2026 (15.10.2026): internal choice abolished on 2-mark questions; kept on 3- and 4-mark.
- **Not verified:** NCERT catalogue (TLS failure), Sanskrit textbook variants (the scheme names no book), Urdu 10–12, Physics/Chemistry detail, 2025-26 scheme, the "BluePrint-Xth/XIIth" PDFs.

### Additional defects found and fixed
| Defect | Fix |
|---|---|
| AI commit skipped blueprint rules, accepted any type, silently reassigned chapters | Per-question `whyCannotAdd`, type must match, explicit chapter required |
| Offline template text committed as real, no provenance | `sourceProvenance` = `TEMPLATE_FALLBACK…` / `AI_GENERATED`; response returns `templateFallbackCount` |
| Audit returned PASS when the model call failed or no key | `INCONCLUSIVE`; `aiStage` reported |
| Audit flagged every "given below" passage as a missing diagram | `referencesMissingVisual()`, narrow and passage-aware |
| Fabricated cognitive split (25/45/20/10), benchmark ranges and "100% compliant" verdict | Removed; `NOT_ASSESSED` unless the model returned a split |
| MPBSE "standard %" built from seven hard-coded constants | Seven dimensions now `assessed: false` and excluded from the score |
| Audit input omitted subparts and the OR alternative | Included |
| Audit route had no ownership check | Teachers can audit only their own papers |
| Editor round-trip wiped `role`/`groupKey`; templates hard-coded STANDARD | Preserved end to end; editor has a role selector |
| Autofill ignored passage groups | Pools keyed by type + passage-child flag |

### Still open
1. Nothing creates a `passageGroupId` yet (question form, bulk import, AI output use the "one question with subparts" representation instead). English class 9/10 Reading now uses that representation (`UNSEEN_PASSAGE` ×2 @5, role PASSAGE).
2. Language **components** (poetry, prose, grammar, writing…) are stored on templates but no question is tagged with a component, so a paper cannot yet be checked against them.
3. Generation is still per section, not per slot; no regenerate-from-independent-review loop.
4. Marks are still computed in ~6 places with different rules.
5. Numbering/export still title-regex driven; passage groups not rendered specially.
6. English class 11/12 Reading passage count unverified (left flat); Urdu 10–12 and Sanskrit book variants unresearched.

---

## Update 2: shared marks, components, regeneration (verified against a running server)

- `questionSlotMarks()` is now the only marks rule (builder, print, DOCX, completeness, audit, paper view).
- Language components: `Blueprint.componentsJson`, `PaperQuestion.componentKey`, coverage implications and a builder panel/selector.
- Passage groups: `passageGroupId` is settable from the question API and form; placement and autofill honour it.
- Rejected AI slots are regenerated one at a time with the rejection reasons, and re-validated; junk-distractor padding was removed. Template output is used only offline, flagged `TEMPLATE_FALLBACK`.
- AI generation refuses a passage-role section made of plain MCQ slots instead of producing stand-alone MCQs for it.
- `scripts/e2e-blueprint.mjs` checks 16 behaviours against a live server on a copy of the database (all pass), including the original passage-MCQ leak.

Still open: component assignment is manual (the scheme does not map components to question numbers), English 11/12 passage count, Urdu 10–12, NCERT/Sanskrit book variants, and a live-model run of the regeneration loop (not exercised: no model calls were made).
