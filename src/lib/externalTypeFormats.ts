/**
 * How each question type has to be written in a reply to the external (copy-paste) paper prompt: a rule in words
 * and one example question object in the exact shape the importer (`paperImport.ts`) reads.
 *
 * Examples hold placeholders only (`<...>`). Real content in an example gets copied into papers of other
 * subjects, so never put any here.
 *
 * Pure and server-safe: no React or kindergarten plugin imports (those are client modules). The clipart ids below
 * mirror `kindergarten/clipartLibrary.tsx`; a test keeps the two in step.
 */

export interface TypeFormat {
  rule: string;
  example: Record<string, unknown>;
  /** The question cannot exist without a figure: the example carries "figure" and the rule requires it. */
  needsFigure: boolean;
}

/** Types whose question is meaningless without a figure (an outline map for map work). */
export const PICTORIAL_TYPES: ReadonlySet<string> = new Set(["MAP_WORK"]);

export const CLIPART_IDS = [
  "balloon", "ball", "kite", "car", "teddy", "drum", "cat", "dog", "elephant", "fish", "duck", "butterfly", "apple",
  "mango", "icecream", "grapes", "star", "sun", "flower", "tree", "umbrella", "pencil", "clock", "house", "cup", "fan", "coin", "chessboard", "envelope", "cow", "monkey",
] as const;

const SHAPE_IDS = ["circle", "square", "triangle", "star", "heart", "diamond", "rectangle"];

const FIGURE_PLACEHOLDER = "<exact description of the figure: what to draw, every label and value, nothing that gives the answer away>";

function base(type: string, text: string): Record<string, unknown> {
  return {
    text,
    type,
    marks: "<marks>",
    chapterNumber: "<chapter number>",
    chapterTitle: "<chapter title>",
    difficulty: "<difficulty>",
  };
}

function columnNames(language: string): [string, string] {
  if (language === "sa") return ["स्तम्भ अ", "स्तम्भ ब"];
  if (language === "hi") return ["स्तम्भ क", "स्तम्भ ख"];
  return ["Column I", "Column II"];
}

const OPEN_RULE = (type: string) =>
  `${type}: "options" is []. Phrase the question so the expected length matches the marks; when points are wanted, say how many (e.g. "Give any three reasons"). When the question lists several items to do (features to locate, parts to label, tasks (i), (ii), (iii)), keep only the instruction in "text" and give each item as its own entry in "subparts" ({"label": "(i)", "text": "...", "marks": 1}); never run them together in one paragraph or number them "(1)", "(2)" inside "text". If only some are to be attempted ("any four of the following"), list one more than needed and set "attemptCount" on the question.`;

function openFormat(type: string): TypeFormat {
  return {
    rule: OPEN_RULE(type),
    example: {
      ...base(type, "<question, or only the instruction when it has parts>"),
      options: [],
      subparts: [
        { label: "(i)", text: "<part (i), only if the question has parts>", marks: "<marks>" },
        { label: "(ii)", text: "<part (ii)>", marks: "<marks>" },
      ],
    },
    needsFigure: false,
  };
}

const CLIPART_RULE = `Pictures come only from this picture set; use these ids exactly: ${CLIPART_IDS.join(", ")}.`;

/** Kindergarten activities: the "activity" object is the activity's settings, printed by the app. */
function activityFormat(type: string, what: string, activity: Record<string, unknown>): TypeFormat {
  return {
    rule: `${type}: ${what} "text" is the instruction for the child (short, simple words). "activity" holds the activity's settings in exactly the shape shown; replace every <...> and keep every key; write numbers and true/false without quotes. ${CLIPART_RULE} "options" is [].`,
    example: { ...base(type, "<instruction for the child>"), options: [], activity },
    needsFigure: false,
  };
}

const AR_OPTIONS = [
  "Both (A) and (R) are true and (R) is the correct explanation of (A).",
  "Both (A) and (R) are true, but (R) is not the correct explanation of (A).",
  "(A) is true, but (R) is false.",
  "(A) is false, but (R) is true.",
];

function formatFor(type: string, language: string): TypeFormat {
  const [col1, col2] = columnNames(language);
  switch (type) {
    case "MCQ":
      return {
        rule: 'MCQ: "options" holds exactly 4 distinct options (text only, no "(a)" prefixes). Exactly one option is correct; the other three are plausible distractors built on common student misconceptions.',
        example: { ...base(type, "<question stem>"), options: ["<option>", "<option>", "<option>", "<option>"] },
        needsFigure: false,
      };
    case "ASSERTION_REASON":
      return {
        rule: `ASSERTION_REASON: "text" holds "Assertion (A): ..." and "Reason (R): ..." on separate lines; "options" holds these 4 standard options, in this order: ${AR_OPTIONS.map((o) => `"${o}"`).join(", ")}`,
        example: { ...base(type, "Assertion (A): <assertion>\nReason (R): <reason>"), options: AR_OPTIONS },
        needsFigure: false,
      };
    case "TRUE_FALSE":
      return {
        rule: 'TRUE_FALSE: "text" is one declarative statement only; do not append "True or False?". "options" is [].',
        example: { ...base(type, "<one statement>"), options: [] },
        needsFigure: false,
      };
    case "FILL_BLANK":
      return {
        rule: 'FILL_BLANK: "text" has the blank as "________" (8 underscores). The blank holds the tested term and nothing else in the sentence gives it away. "options" is [].',
        example: { ...base(type, "<sentence with the blank> ________ <rest of the sentence>"), options: [] },
        needsFigure: false,
      };
    case "MATCH_COLUMN":
      return {
        rule: `MATCH_COLUMN: the whole section is ONE question. "text" holds a one-line instruction ("Match ${col1} with ${col2}:"), then each ${col1} item on its own line labelled (A), (B), (C)...; "options" holds the ${col2} items, one string each, exactly as many as ${col1}, in a scrambled order: no ${col2} item may sit in the same position as its matching ${col1} item, and the order must not simply be the reverse or a shift of ${col1}. Never put ${col2} items in "text" and never pair items inside one string. Its "marks" is the section total.`,
        example: {
          ...base(type, `<one-line instruction>\n(A) <Column I item>\n(B) <Column I item>\n(C) <Column I item>`),
          options: ["<Column II item>", "<Column II item>", "<Column II item>"],
        },
        needsFigure: false,
      };
    case "CASE_STUDY":
      return {
        rule: 'CASE_STUDY: "text" holds the case/source (a short original scenario, extract, data table or situation); "subparts" holds the graded sub-questions, each {"label": "(i)", "text": ..., "marks": n}, marks adding up to the question\'s marks. A 1-mark subpart may be an MCQ with its own 4 "options".',
        example: {
          ...base(type, "<the case or source>"),
          options: [],
          subparts: [
            { label: "(i)", text: "<1-mark sub-question>", marks: "<marks>", options: ["<option>", "<option>", "<option>", "<option>"] },
            { label: "(ii)", text: "<sub-question>", marks: "<marks>" },
          ],
        },
        needsFigure: false,
      };
    case "UNSEEN_PASSAGE":
      return {
        rule: 'UNSEEN_PASSAGE: "text" holds a NEW, ORIGINAL passage of 120-180 words (not from any textbook or published text) followed by nothing else; "subparts" holds the sub-questions, each answerable from the passage alone, marks adding up to the question\'s marks. 1-mark subparts are MCQs with 4 "options".',
        example: {
          ...base(type, "<original passage, 120-180 words>"),
          options: [],
          subparts: [
            { label: "(i)", text: "<1-mark sub-question>", marks: "<marks>", options: ["<option>", "<option>", "<option>", "<option>"] },
            { label: "(ii)", text: "<sub-question>", marks: "<marks>" },
          ],
        },
        needsFigure: false,
      };
    case "REFERENCE_CONTEXT":
      return {
        rule: 'REFERENCE_CONTEXT: "text" holds the exact extract from the prescribed lesson/poem and the instruction; "subparts" (only if the marks are split) hold the sub-questions.',
        example: {
          ...base(type, "<instruction>\n<exact extract from the prescribed lesson or poem>"),
          options: [],
          subparts: [{ label: "(i)", text: "<sub-question, only if the marks are split>", marks: "<marks>" }],
        },
        needsFigure: false,
      };
    case "WRITING_SKILL":
      return {
        rule: 'WRITING_SKILL: "text" holds the full writing task (letter, essay, notice, application...) with its situation, who it is to and the word limit. If the student may choose one of several topics, put each topic in "subparts" and set "attemptCount": 1. "options" is [].',
        example: {
          ...base(type, "<writing task with situation, audience and word limit>"),
          options: [],
          subparts: [
            { label: "(i)", text: "<topic, only when a choice of topics is given>", marks: "<marks>" },
            { label: "(ii)", text: "<topic>", marks: "<marks>" },
          ],
          attemptCount: 1,
        },
        needsFigure: false,
      };
    case "GRAMMAR":
      return {
        rule: 'GRAMMAR: "text" holds the instruction ("Do as directed", "Change the voice"...); each item to work on is its own entry in "subparts" with its own marks. "options" is [], except a 1-mark item may be an MCQ with 4 "options" of its own.',
        example: {
          ...base(type, "<instruction>"),
          options: [],
          subparts: [
            { label: "(i)", text: "<grammar item>", marks: "<marks>" },
            { label: "(ii)", text: "<grammar item>", marks: "<marks>" },
          ],
        },
        needsFigure: false,
      };
    case "DRAW":
      return {
        rule: 'DRAW: the student draws. "text" says exactly what to draw and what to label. If the student completes or labels a given figure instead, add "figure". "options" is [].',
        example: { ...base(type, "<what to draw and label>"), options: [] },
        needsFigure: false,
      };
    case "MAP_WORK":
      return {
        rule: 'MAP_WORK: "text" holds the instruction only; each place or feature to locate is its own entry in "subparts" (1 mark each). "figure" is REQUIRED: describe the outline map to print (which country/state/region, what boundaries are shown, nothing already marked). If only some are to be attempted, list one more than needed and set "attemptCount". "options" is [].',
        example: {
          ...base(type, "<instruction, e.g. locate and label on the given outline map>"),
          options: [],
          subparts: [
            { label: "(i)", text: "<place or feature to locate>", marks: "<marks>" },
            { label: "(ii)", text: "<place or feature to locate>", marks: "<marks>" },
          ],
          figure: FIGURE_PLACEHOLDER,
        },
        needsFigure: true,
      };
    case "KDG_TRACE_WRITE":
      return activityFormat(type, "trace and copy letters, words or numbers on ruled lines.", {
        rulingType: "<FOUR_LINE | TWO_LINE | SINGLE_LINE | BOXES>",
        fontSizePt: 24,
        lines: [{ promptText: "<letters or word to trace>", traceDotted: true, repeatCount: 2 }],
      });
    case "KDG_NUMBER_GRID":
      return activityFormat(type, "a number grid with some numbers left blank for the child to write.", {
        startNumber: 1,
        endNumber: 50,
        columns: 10,
        descending: "<true to list the numbers high to low (100 to 1), optional>",
        step: 1,
        cells: [{ value: "<number>", isBlank: false }, { value: "<number>", isBlank: true }],
      });
    case "KDG_PICTURE_MATCH":
      return activityFormat(type, "match each picture with its letter or word.", {
        pairs: [
          { id: "1", clipartId: "<picture id>", label: "<picture name>", matchLabel: "<letter or word it matches>" },
          { id: "2", clipartId: "<picture id>", label: "<picture name>", matchLabel: "<letter or word it matches>" },
        ],
        shuffleRight: true,
        leftTitle: "<left heading>",
        rightTitle: "<right heading>",
      });
    case "KDG_COUNT_ITEMS":
      return activityFormat(type, "count pictured objects and write or choose the number.", {
        clipartId: "<picture id>",
        count: "<how many, 1-10>",
        layout: "<GRID | SCATTERED | ROW>",
        answerStyle: "<SQUARE_BOX | CIRCLE | CHOICE_OPTIONS>",
        choiceOptions: ["<number>", "<number>", "<number>"],
        objectName: "<object name, plural>",
        groups: [{ clipartId: "<picture id>", count: "<1-20>" }],
      });
    case "KDG_CIRCLE_TARGET":
      return activityFormat(type, "rows of pictures; the child circles the odd one out or the asked-for picture.", {
        mode: "<ODD_ONE_OUT | FIND_TARGET>",
        targetDescription: "<what to circle>",
        rows: [
          {
            rowLabel: "<row label>",
            items: [
              { id: "1", type: "CLIPART", clipartId: "<picture id>", isTarget: false },
              { id: "2", type: "CLIPART", clipartId: "<picture id>", isTarget: true },
            ],
          },
        ],
      });
    case "KDG_SEQUENCE_CHAIN":
      return activityFormat(type, "a chain of letters or numbers with some missing.", {
        theme: "<CATERPILLAR | TRAIN | BUBBLES | APPLES>",
        items: [{ value: "<letter or number>", isBlank: false }, { value: "<letter or number>", isBlank: true }],
      });
    case "KDG_MISSING_LETTERS":
      return activityFormat(type, "short words, optionally beside a picture, with letters missing; \"blanks\" are 0-based letter positions. \"hints\" (optional) are letters printed in a \"Use these letters\" box, e.g. the vowels.", {
        items: [{ word: "<word>", blanks: ["<position>"], clipartId: "<picture id, optional>" }],
        hints: ["<letter to choose from, optional>"],
      });
    case "KDG_FIRST_LETTER":
      return activityFormat(type, "pictures; the child writes (or circles) the first letter of each picture's English name.", {
        answerStyle: "<WRITE | CIRCLE>",
        rows: [{ clipartId: "<picture id>", word: "<English name of the picture>", choices: ["<right first letter>", "<other letter>"] }],
      });
    case "KDG_PATTERN":
      return activityFormat(type, `shape patterns to continue. Shapes are only: ${SHAPE_IDS.join(", ")}.`, {
        rows: [{ unit: ["<shape>", "<shape>"], repeats: 3, blanksAtEnd: 2 }],
      });
    case "KDG_PICTURE_SUM":
      return activityFormat(type, "add or take away using pictures; numbers stay small (up to 10).", {
        op: "<ADD | SUBTRACT>",
        showPictures: true,
        rows: [{ a: "<number>", b: "<number>", clipartId: "<picture id>" }],
      });
    case "KDG_COMPARE":
      return activityFormat(type, "compare two groups or sizes of the same picture.", {
        mode: "<BIGGER | SMALLER | TALLER | SHORTER | MORE | FEWER | TALLEST_SHORTEST>",
        rows: [{ clipartId: "<picture id>", left: "<number>", right: "<number>", sizes: ["<height 1-5, 3 to 5 of them, only for TALLEST_SHORTEST>"] }],
      });
    case "KDG_COLOUR":
      return activityFormat(type, "colour each picture with the named colour.", {
        items: [{ clipartId: "<picture id>", colour: "<colour name>" }],
      });
    case "KDG_JOIN_DOTS":
      return activityFormat(type, "join numbered or lettered dots to make a shape.", {
        shape: "<TRIANGLE | SQUARE | STAR | HOUSE | STAIRS | ZIGZAG | CIRCLE>",
        labels: "<NUMBERS | LETTERS>",
        count: "<number of dots, 5-15>",
      });
    case "KDG_TICK_PICTURE":
      return activityFormat(type, "for each row, a question and three pictures; the child ticks the right one. \"correctIndex\" is 0, 1 or 2.", {
        rows: [{ question: "<question>", options: ["<picture id>", "<picture id>", "<picture id>"], correctIndex: "<0, 1 or 2>" }],
      });
    case "KDG_PREWRITING":
      return activityFormat(type, "pencil-control strokes to trace.", {
        rows: [{ stroke: "<STANDING | SLEEPING | SLANTING_RIGHT | SLANTING_LEFT | ZIGZAG | CURVES | WAVES | LOOPS | CIRCLES | STEPS>" }],
      });
    case "KDG_HINDI_VARNAMALA":
      return activityFormat(type, "Hindi letters, each with shirorekha boxes to trace and copy.", {
        letters: ["<Hindi letter>", "<Hindi letter>"],
        boxesPerRow: "<boxes per letter, 3-8>",
        dotted: true,
      });
    case "KDG_HINDI_MISSING":
      return activityFormat(type, "rows of Hindi letters in order, or words, with some boxes left blank. For mode ADD_MATRA the child writes a missing matra in: \"text\" is the word printed WITHOUT the matra (सतार), \"answer\" the correct word (सितार), blanks [], and \"matra\" the sign to add (ि). Otherwise \"text\" is letters separated by spaces (\"क ख ग घ\") or one word; \"blanks\" are 0-based box numbers.", {
        mode: "<VARNA | MATRA | ADD_MATRA>",
        rows: [{ text: "<letters with spaces, or a word>", blanks: ["<box number>"], clipartId: "<picture id, words only>" }],
        hints: ["<letter or matra to choose from>"],
      });
    case "KDG_HINDI_FIRST_LETTER":
      return activityFormat(type, "pictures; the child circles or writes the first Hindi letter of each picture's name.", {
        answerStyle: "<CIRCLE | WRITE>",
        rows: [{ clipartId: "<picture id>", word: "<Hindi name of the picture>", choices: ["<right first letter>", "<other letter>", "<other letter>"] }],
      });
    case "KDG_HINDI_LETTER_MATCH":
      return activityFormat(type, "match each picture with its first Hindi letter.", {
        pairs: [{ id: "1", clipartId: "<picture id>", label: "<Hindi name>", matchLabel: "<first letter>" }],
        shuffleRight: true,
        leftTitle: "<left heading, e.g. चित्र>",
        rightTitle: "<right heading, e.g. अक्षर>",
      });
    case "KDG_EVS_SORT":
      return activityFormat(type, "pictures the child ticks (group A) or crosses (group B), e.g. living / non-living.", {
        groupA: "<group to tick>",
        groupB: "<group to cross>",
        items: [{ clipartId: "<picture id>", group: "<A | B>" }],
      });
    case "KDG_EVS_NAME":
      return activityFormat(type, "pictures; the child ticks (or, for CIRCLE, encircles) the right name among the choices, or writes it.", {
        answer: "<TICK | WRITE | CIRCLE>",
        rows: [{ clipartId: "<picture id>", name: "<right name>", choices: ["<right name>", "<other name>"] }],
      });
    case "KDG_EVS_ODD_ONE":
      return activityFormat(type, "rows of pictures; the child crosses the one that does not belong. Exactly one item per row has isTarget true.", {
        mode: "<ODD_ONE_OUT>",
        rows: [{ items: [{ id: "1", type: "CLIPART", clipartId: "<picture id>", isTarget: false }, { id: "2", type: "CLIPART", clipartId: "<picture id>", isTarget: true }] }],
      });
    case "KDG_EVS_HOME":
      return activityFormat(type, "match each animal or thing with where it lives or belongs.", {
        pairs: [{ id: "1", clipartId: "<picture id>", label: "<animal or thing>", matchLabel: "<where it lives>" }],
        shuffleRight: true,
        leftTitle: "<left heading>",
        rightTitle: "<right heading>",
      });
    case "KDG_TEXT_MATCH":
    case "KDG_NUMBER_NAME_MATCH":
    case "KDG_HINDI_TEXT_MATCH":
      return activityFormat(type, "two columns (words, letters, numbers or number names) the child joins with lines; write each pair in its matching order, the printer mixes the right column.", {
        pairs: [{ left: "<left item>", right: "<its match>" }],
        mixRight: true,
      });
    case "KDG_MARK_LETTERS":
      return activityFormat(type, "words in which the child underlines or circles the given letters (usually the vowels).", {
        words: ["<word>"],
        targets: ["<letter to find>"],
        action: "<UNDERLINE | CIRCLE>",
      });
    case "KDG_JOIN_LETTERS":
    case "KDG_HINDI_JOIN_LETTERS":
      return activityFormat(type, "letters joined with + that the child writes as one word (A + p + p + l + e = ____).", {
        rows: [{ parts: ["<letter>", "<letter>"] }],
      });
    case "KDG_ARRANGE_ORDER":
    case "KDG_NUMBER_ORDER":
    case "KDG_HINDI_UNJUMBLE":
      return activityFormat(type, "items the child writes in order; for UNJUMBLE each row holds one correctly spelt word, which the printer jumbles.", {
        mode: "<ALPHABETICAL | ASCENDING | DESCENDING | UNJUMBLE>",
        rows: [{ items: ["<letter, number or word>"] }],
      });
    case "KDG_SENTENCE_BLANK":
    case "KDG_HINDI_SENTENCE_BLANK":
    case "KDG_SHAPE_SENTENCE":
      return activityFormat(type, 'sentences with a blank written as "___" and the words to choose from.', {
        choicesAt: "<TOP | END>",
        rows: [{ text: "<sentence with ___ for the blank>", answer: "<right word>", choices: ["<word>", "<word>"] }],
      });
    case "KDG_ANSWER_LINES":
    case "KDG_HINDI_ANSWER_LINES":
    case "KDG_NUMBER_NAMES":
      return activityFormat(type, "a prompt or question with an answer line beside it, below it, or a numbered (i) (ii) (iii) list.", {
        style: "<BESIDE | BELOW | LIST>",
        answerLabel: "<Ans. or उत्तर, or empty>",
        listCount: 3,
        rows: [{ prompt: "<question or prompt>", answer: "<answer for the key>" }],
      });
    case "KDG_WORD_SEARCH":
      return activityFormat(type, "a letter grid hiding the given words (capital letters A–Z), with a picture for each.", {
        words: [{ word: "<WORD>", clipartId: "<picture id>" }],
        rows: 6,
        cols: 10,
        directions: "<ACROSS | ACROSS_DOWN>",
        showWordList: false,
        answerLines: true,
      });
    case "KDG_NUMBER_NEIGHBOURS":
      return activityFormat(type, "numbers with a box for the number that comes after, before, or between (for BETWEEN give the first number; the second is two more).", {
        mode: "<AFTER | BEFORE | BETWEEN>",
        rows: [{ a: 6 }],
      });
    case "KDG_NUMBER_COMPARE_SIGN":
      return activityFormat(type, "pairs of numbers with a box for >, < or =.", {
        rows: [{ a: 22, b: 35 }],
        showHelp: false,
      });
    case "KDG_VERTICAL_SUM":
      return activityFormat(type, "sums written one below the other.", {
        op: "<ADD | SUBTRACT | MULTIPLY>",
        rows: [{ a: 25, b: 13 }],
        placeValue: false,
      });
    case "KDG_DRAW_FOR_NUMBER":
      return activityFormat(type, "numbers with an empty box where the child draws that many lines or objects.", {
        numbers: [3],
        thing: "<lines, circles or another thing to draw>",
      });
    case "KDG_HINDI_BARAKHADI":
      return activityFormat(type, "barakhadi (क का कि …) for the given consonants, with 12 boxes each.", {
        consonants: ["<consonant>"],
        showForms: "<NONE | FIRST | ALL>",
        showMatraHeader: true,
      });
    default:
      return openFormat(type);
  }
}

/** The rule and example for one question type, in the paper's language (column headings for match questions). */
export function typeFormat(type: string, language: string): TypeFormat {
  return formatFor(type, language);
}
