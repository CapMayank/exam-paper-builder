import type { BlueprintTemplateSectionGroup, ChoicePolicy } from "./curriculumTemplates";

/**
 * English papers, question by question, from the MPBSE 2026-27 अंक योजना (pdf p.4-6, 22-24, 40-42, 88-90).
 * Class 9/10: 16 questions, 75 marks. Class 11/12: 15 questions, 80 marks.
 * Internal choice follows Circular 465/2026: none on 2-mark questions, kept on 3- and 4-mark questions;
 * objective questions have none. (The scheme's own note says "internal choices in all questions except
 * objective"; the circular is later and more specific for 2-mark questions.)
 */

type Helpers = {
  createChoicePolicy: (
    policyType: ChoicePolicy["policyType"],
    provided: number,
    required: number,
    scope: ChoicePolicy["poolScope"],
    rationale: string,
  ) => ChoicePolicy;
};

type Row = BlueprintTemplateSectionGroup["questionTypes"][number];

export function englishSections(
  level: "IX_X" | "XI_XII",
  books: { main: string; supplementary: string },
  h: Helpers,
): BlueprintTemplateSectionGroup[] {
  const none = (n: number, why: string): Pick<Row, "orChoiceMode" | "choicePolicy"> => ({
    orChoiceMode: "NOT_REQUIRED",
    choicePolicy: h.createChoicePolicy("NO_CHOICE", n, n, "ANY_INCLUDED_CHAPTER", why),
  });
  const choice = (n: number, why: string): Pick<Row, "orChoiceMode" | "orAlternativeCount" | "choicePolicy"> => ({
    orChoiceMode: "REQUIRED",
    orAlternativeCount: 1,
    choicePolicy: h.createChoicePolicy("FULL_OR_ALTERNATIVE", n * 2, n, "SAME_UNIT", why),
  });
  const g = (title: string, instructions: string, ...rows: Row[]): BlueprintTemplateSectionGroup => ({ title, instructions, questionTypes: rows });

  const { main, supplementary } = books;
  const writingNote = g(
    "Note Making (Writing Skills)",
    "Make notes on the passage: title, numbering and indenting, key/glossary/abbreviations and notes (1 mark each).",
    { type: "LONG", count: 1, marksEach: 4, role: "WRITING", groupKey: "writing.note-making", ...none(1, "Note making") },
  );
  const grammar = [
    g("Grammar: Fill in the blanks / Sentence correction", "Gap filling: tenses, prepositions, verbs, conjunctions, articles, modals, determiners.", {
      type: "FILL_BLANK", count: 5, marksEach: 1, role: "GRAMMAR", groupKey: "grammar.fill-in", ...none(5, "Grammar objective items"),
    }),
    g("Grammar: Do as directed", "Voices, transformation of sentences, clauses.", {
      type: "VERY_SHORT", count: 5, marksEach: 1, role: "GRAMMAR", groupKey: "grammar.do-as-directed", ...none(5, "Grammar objective items"),
    }),
  ];

  if (level === "IX_X") {
    return [
      g("Section A: Reading Comprehension (Unseen Passages)", "Read the following passages carefully and answer the questions given below.", {
        type: "UNSEEN_PASSAGE", count: 2, marksEach: 5, role: "PASSAGE", groupKey: "reading.unseen-passage", ...none(2, "Two unseen passages, five 1-mark MCQs each"),
      }),
      writingNote,
      g("Letter Writing (Writing Skills)", "Write a formal or informal letter (format 1, content 2, expression 1).", {
        type: "LONG", count: 1, marksEach: 4, role: "WRITING", groupKey: "writing.letter", ...choice(1, "Formal / informal letter"),
      }),
      g("Long Composition (Writing Skills)", "Essay, article or paragraph (language 1, content 2, expression 2).", {
        type: "LONG", count: 1, marksEach: 5, role: "WRITING", groupKey: "writing.composition", orChoiceMode: "BOARD_DEFAULT",
        choicePolicy: h.createChoicePolicy("NO_CHOICE", 1, 1, "ANY_INCLUDED_CHAPTER", "Choice rule for 5-mark questions is not stated"),
      }),
      g("Picture Guided Composition (Writing Skills)", "Write on the picture given (language 1, content 1, expression 1).", {
        type: "SHORT", count: 1, marksEach: 3, role: "WRITING", groupKey: "writing.picture", ...choice(1, "Picture-guided composition"),
      }),
      ...grammar,
      g(`Textual MCQs (${main})`, "Choose the correct option.", {
        type: "MCQ", count: 4, marksEach: 1, role: "LITERATURE", groupKey: "literature.textual-mcq", ...none(4, "Textual objective items"),
      }),
      g(`Extracts from Prose (${main})`, "Read the extract and answer the questions (1 mark each).", {
        type: "MCQ", count: 3, marksEach: 1, role: "LITERATURE", groupKey: "literature.extract-prose", ...none(3, "Extract items"),
      }),
      g(`Extracts from Poetry (${main})`, "Read the extract and answer the questions (1 mark each).", {
        type: "MCQ", count: 3, marksEach: 1, role: "LITERATURE", groupKey: "literature.extract-poetry", ...none(3, "Extract items"),
      }),
      g(`Short Answer Questions: Prose (${main})`, "Answer in about 30 words.", {
        type: "VERY_SHORT", count: 6, marksEach: 2, role: "LITERATURE", groupKey: "literature.short-prose", orAlternativeCount: 0, ...none(6, "Circular 465/2026: no choice in 2-mark questions"),
      }),
      g("Short Answer Questions: Poetry", "Answer in about 30 words.", {
        type: "VERY_SHORT", count: 2, marksEach: 2, role: "LITERATURE", groupKey: "literature.short-poetry", orAlternativeCount: 0, ...none(2, "Circular 465/2026: no choice in 2-mark questions"),
      }),
      g(`Short Answer Questions (${supplementary})`, "Answer in about 30 words.", {
        type: "VERY_SHORT", count: 2, marksEach: 2, role: "LITERATURE", groupKey: "literature.short-supplementary", orAlternativeCount: 0, ...none(2, "Circular 465/2026: no choice in 2-mark questions"),
      }),
      g(`Long Answer Questions: Prose (${main})`, "Answer in about 75 words.", {
        type: "SHORT", count: 1, marksEach: 3, role: "LITERATURE", groupKey: "literature.long-prose", ...choice(1, "Long answer, prose"),
      }),
      g(`Long Answer Questions: Poetry (${main})`, "Answer in about 75 words.", {
        type: "SHORT", count: 1, marksEach: 3, role: "LITERATURE", groupKey: "literature.long-poetry", ...choice(1, "Long answer, poetry"),
      }),
      g(`Long Answer Questions (${supplementary})`, "Answer in about 75 words.", {
        type: "SHORT", count: 1, marksEach: 3, role: "LITERATURE", groupKey: "literature.long-supplementary", ...choice(1, "Long answer, supplementary reader"),
      }),
    ];
  }

  return [
    g("Section A: Reading Skills (Unseen Passage)", "Read the passage carefully and answer the questions (MCQ / objective).", {
      type: "UNSEEN_PASSAGE", count: 1, marksEach: 10, role: "PASSAGE", groupKey: "reading.unseen-passage", ...none(1, "One unseen passage, ten 1-mark MCQs"),
    }),
    writingNote,
    g("Notice / Advertisement / Poster (Writing Skills)", "Format 1, content 2, expression 1.", {
      type: "LONG", count: 1, marksEach: 4, role: "WRITING", groupKey: "writing.notice", ...choice(1, "Notice / advertisement / poster"),
    }),
    g("Letter Writing (Writing Skills)", "Formal or informal letter (format 1, content 2, expression 1).", {
      type: "LONG", count: 1, marksEach: 4, role: "WRITING", groupKey: "writing.letter", ...choice(1, "Formal / informal letter"),
    }),
    g("Long Composition (Writing Skills)", "Article, report, speech, debate or paragraph (language 1, content 2, expression 1).", {
      type: "LONG", count: 1, marksEach: 4, role: "WRITING", groupKey: "writing.composition", ...choice(1, "Long composition"),
    }),
    ...grammar,
    g(`Extract from Prose (${main})`, "Read the extract and answer the questions (1 mark each).", {
      type: "MCQ", count: 5, marksEach: 1, role: "LITERATURE", groupKey: "literature.extract-prose", ...none(5, "Extract items"),
    }),
    g(`Extract from Poetry (${main})`, "Read the extract and answer the questions (1 mark each).", {
      type: "MCQ", count: 3, marksEach: 1, role: "LITERATURE", groupKey: "literature.extract-poetry", ...none(3, "Extract items"),
    }),
    g(`Extract from Supplementary Reader (${supplementary})`, "Read the extract and answer the questions (1 mark each).", {
      type: "MCQ", count: 4, marksEach: 1, role: "LITERATURE", groupKey: "literature.extract-supplementary", ...none(4, "Extract items"),
    }),
    g(`Short Answer Questions: Prose (${main})`, "Answer in about 30 words.", {
      type: "VERY_SHORT", count: 5, marksEach: 2, role: "LITERATURE", groupKey: "literature.short-prose", orAlternativeCount: 0, ...none(5, "Circular 465/2026: no choice in 2-mark questions"),
    }),
    g(`Short Answer Questions: Poetry (${main})`, "Answer in about 30 words.", {
      type: "VERY_SHORT", count: 3, marksEach: 2, role: "LITERATURE", groupKey: "literature.short-poetry", orAlternativeCount: 0, ...none(3, "Circular 465/2026: no choice in 2-mark questions"),
    }),
    g(`Short Answer Questions (${supplementary})`, "Answer in about 30 words.", {
      type: "VERY_SHORT", count: 2, marksEach: 2, role: "LITERATURE", groupKey: "literature.short-supplementary", orAlternativeCount: 0, ...none(2, "Circular 465/2026: no choice in 2-mark questions"),
    }),
    g(`Long Answer Questions: Prose (${main})`, "Answer in about 75 words.", {
      type: "SHORT", count: 2, marksEach: 3, role: "LITERATURE", groupKey: "literature.long-prose", ...choice(2, "Long answer, prose"),
    }),
    g(`Long Answer Question: Poetry (${main})`, "Answer in about 75 words.", {
      type: "SHORT", count: 1, marksEach: 3, role: "LITERATURE", groupKey: "literature.long-poetry", ...choice(1, "Long answer, poetry"),
    }),
    g(`Long Answer Question (${supplementary})`, "Answer in about 75 words.", {
      type: "SHORT", count: 1, marksEach: 3, role: "LITERATURE", groupKey: "literature.long-supplementary", ...choice(1, "Long answer, supplementary reader"),
    }),
  ];
}

/** Prescribed English textbooks, as printed in the 2026-27 syllabus (Syllabus_2026_27.pdf). */
export const ENGLISH_BOOKS: Record<9 | 10 | 11 | 12, { main: string; supplementary: string }> = {
  9: { main: "Beehive", supplementary: "Moments" },
  10: { main: "First Flight", supplementary: "Footprints without Feet" },
  11: { main: "Hornbill", supplementary: "Snapshots" },
  12: { main: "Flamingo", supplementary: "Vistas" },
};
