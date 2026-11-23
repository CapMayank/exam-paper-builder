# Board-style sections and question numbering

Date: 2026-11-23 · Status: reviewed, awaiting approval

## Why

Printed papers mix two numbering conventions today. An MCQ row gives each item its own number, while fill-in-the-blank
and true/false rows always print as one number with (a), (b), (c) parts. Sections are inconsistent too: some templates
put each question type in its own section, others put several types under "Section A". Teachers want one standard way
every paper is built and printed, the way board papers look. Nothing has been printed yet, so existing papers and
blueprints can move to the new standard with no compatibility concerns.

## What a paper looks like (decided)

```
SECTION A — Objective
Q1. Choose the correct option.            (i) … (vi)    6 × 1 = 6
Q2. Fill in the blanks.                   (i) … (v)     5 × 1 = 5
Q3. Write True or False.                  (i) … (v)     5 × 1 = 5
Q4. Match the columns.                                  5 × 1 = 5
SECTION B — Short answer
Q5. …                                                           2
Q6. …                                                           2
```

- A **section** is a heading the teacher sets ("Section A — Objective", "खण्डः 'क'"). One section can hold several
  question types.
- Within a section, each **objective-type row prints as one numbered question with parts**. All other questions get
  their own number.
- Numbers **run through the whole paper** and never restart at a new section.
- Parts are labelled **(i), (ii), (iii)…** in English papers and **(क), (ख), (ग)…** in Hindi/Sanskrit papers
  (English grouped parts change from (a), (b), (c) to (i), (ii), (iii)).
- A grouped question shows its marks once, as a formula: "6 × 1 = 6".
- The builder, printed paper, Word export, answer key, solutions and OMR pages all show the same labels ("Q2 (iii)").

## Goals / non-goals / anti-goals

- Goal: one rule for grouping and numbering, used by every surface.
- Goal: a row has its own question title ("Fill in the blanks") separate from the section heading it belongs to.
- Non-goal: a CBSE-style "every item numbered" option. It can come back later as a paper setting.
- Non-goal: a new Section table (approach B, rejected below).
- Anti-goal: a paper where the builder, print, Word export and answer key disagree on a question's label.
- Anti-goal: a section split in two because two rows' headings differ by a space or capital letter.

## Approaches considered

- **A. Change only the numbering rule.** Smallest change, but a row's `title` stays both the section heading and the
  question's wording, so "Q2. Fill in the blanks" has nowhere to live.
- **B. A real Section entity in the database.** Cleanest model, but "section" runs through ~300 files and many tests;
  far more churn than the gain over C.
- **C. Each row has two names: section heading + question title. (Picked.)** Fixes A's problem without B's rebuild.

## Design (approach C)

### Data

- `BlueprintSection` stays the row (one question type, count, marks). Its existing `title` keeps its meaning: the
  **section heading** it prints under. Consecutive rows whose headings match (trimmed, case-insensitive) form one
  section; this is how `mergeSameFormRows`, `computeDisplayedPaperNumbering` and `planSectionHeadings` already work.
- Add `questionTitle String @default("")` to `BlueprintSection`. Empty means "use the localized default for the type"
  (`getSharedInstruction(type, lang)`, e.g. "Fill in the blanks."). It prints as the line after a grouped question's
  number, and as the type sub-band for a run of separate questions in a mixed section.
- Blueprint import/export (JSON), templates, presets and paper snapshots carry the new field; a missing field reads as "".

### The one grouping rule

Replace `isGroupedExerciseRow` (`src/lib/layout.ts`) with a rule by type, not by heading text:

| Row type | Prints as |
|---|---|
| MCQ, ASSERTION_REASON, TRUE_FALSE, FILL_BLANK | one question with parts |
| VERY_SHORT with marksEach ≤ 1 (one-word answers) | one question with parts |
| MATCH_COLUMN | one question (already) |
| VERY_SHORT > 1 mark, SHORT, LONG, CASE_STUDY, passages, writing, grammar, draw, map | each item its own number |

- A row with a single item prints as a normal numbered question, as today.
- The "Question 2" heading-text heuristic is removed.
- Kindergarten worksheet types are untouched (worksheets print no section headings).

### Numbering

- `computeDisplayedPaperNumbering` stays the single source of numbers; every surface keeps calling it.
- Grouped sub-labels become `(i)…` for non-Indic papers (`groupedSubLabel`); Devanagari stays `(क)…`. Beyond the
  list, continue in the same script rather than falling back to `(11)`.
- Numbering styles: keep CONTINUOUS ("1") and PREFIXED ("Q.1"); remove SECTION_RELATIVE ("A1"), because it restarts
  per section. Papers set to it move to CONTINUOUS.

### Blueprint editor

- The editor already shows rows grouped under their section heading and renames a group's heading for all its rows;
  keep that, so a heading is edited in one place.
- Each row gets a "Question title" field, with a placeholder showing the localized default.
- Adding a question type within a section adds a row with that section's heading.

### Templates

- Regroup (decided): in the built-in templates (`curriculumTemplates.ts`, `officialTemplates.ts`,
  `officialSchemeData.ts`, presets), consecutive sections that each hold one objective type are merged into one
  objective section. Each merged row's old instruction sentence (or, when it had none, its old heading without the
  "Question N:" prefix) becomes its `questionTitle`, the line printed after the question number. So "खण्डः 'क' : बहुविकल्पीयप्रश्नाः",
  "खण्डः 'ख' : रिक्तस्थानपूर्तिः" and "खण्डः 'ग' : शुद्ध/अशुद्धवाक्यनिरूपणम्" become Q1, Q2, Q3 under one खण्डः 'क'.
  Later sections are re-lettered in order. Marks, counts and chapter quotas don't change.
- Where a row's heading is really a question title, move it to `questionTitle` and give the row its section's heading.
- Update the template and official-scheme tests to the regrouped structure.

### Existing data

- One Prisma migration adds `questionTitle` with default "". No backfill: existing rows print under the new rule with
  the type's default question title.
- One data update sets `numberingStyle = "CONTINUOUS"` on papers that have `SECTION_RELATIVE`.
- JSON exported by the new build doesn't need to import into older builds.

### Calls made while writing this (correct any)

- **Marks line:** a grouped question shows "n × m = total" when every part has the same marks, and only the total when
  they differ. The formula appears wherever the question's marks already appear: print, Word export, builder.
- **One-word rule:** VERY_SHORT rows at ≤ 1 mark always group. There's no per-row override; add one only if a real paper
  needs it.
- **Part order:** parts follow the row's item order in the builder. Answer key, solutions and OMR use the same
  "Q2 (iii)" label.
- **Long lists:** English continues in roman numerals: (xi), (xii)… Devanagari continues after (ञ) with Devanagari
  numerals: (११), (१२)…
- **Script:** part labels follow the paper's language, or Devanagari in the heading, as `groupedSubLabelsIndic` already
  decides.

## Left to the builder

- Exact printed wording and punctuation of default question titles per language (reuse the existing
  `sharedInstructions` locale strings).
- How the band summary reads for a section with grouped and separate questions mixed (`planSectionHeadings` already
  handles mixed sections; adjust only where grouping changes).
- Updating the existing tests that assert (a)/(b) labels or MCQ-per-number behaviour, adding tests for the new rule.
