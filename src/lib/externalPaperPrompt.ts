/**
 * A prompt a teacher can paste into any chat AI (ChatGPT, Claude, Gemini app...) to get the questions for a
 * paper, built from the same slot plan, difficulty profile and quality rules the app's own generator uses.
 *
 * The prompt asks for questions only. Answers, marking schemes and checks are done by the app after the
 * reply is pasted back: the setter writing its own answer key in the same reply is what lowers question
 * quality, and a separate answer pass also catches questions that turn out to have no single correct answer.
 *
 * Pure: give it a plan and paper facts, get text back.
 */
import { QUESTION_TYPE_LABEL, type QuestionType } from "./constants";
import { levelMeaning, planSlotDifficulties, resolveDifficultyProfile, type DifficultyInput } from "./difficultyProfiles";
import type { PaperAutogenPlan } from "./paperAutogen";
import { getSubjectPromptDirectives, slotQuestionForm, UNIVERSAL_QUALITY_RULES } from "./subjectPrompts";

export interface ExternalPromptContext {
  plan: PaperAutogenPlan;
  schoolName?: string | null;
  academicSession?: string | null;
  examType?: string | null;
  subjectCode?: string | null;
  difficulty?: DifficultyInput;
  teacherFocus?: string | null;
  /** Questions already on the paper, so the reply does not repeat them. */
  existingQuestionTexts?: string[];
}

export interface ExternalPrompt {
  prompt: string;
  /** Questions the reply should contain (a match section counts as one). */
  questionCount: number;
  totalMarks: number;
}

const PASSAGE = new Set(["CASE_STUDY", "UNSEEN_PASSAGE", "REFERENCE_CONTEXT"]);

function languageRule(language: string): string {
  if (language === "hi") {
    return "Hindi in Devanagari script, MP Board style. Do not write in English. Match columns use 'स्तम्भ क' / 'स्तम्भ ख'.";
  }
  if (language === "sa") {
    return "Pure Sanskrit (संस्कृतम्) in Devanagari, NCERT/MPBSE Shemushi style, with correct sandhi, vibhakti and number agreement (e.g. 'कौ' for dual entities, dual masculine nouns end in '-ौ'). Match columns use 'स्तम्भ अ' / 'स्तम्भ ब'. Never put 'अथवा' inside a question's own text.";
  }
  if (language === "bilingual") return "Bilingual: each question and option in English, with its Hindi translation in parentheses.";
  return "English.";
}

/** How a question of this type has to be written, in the shape the importer reads. */
function typeFormat(type: string): string {
  switch (type) {
    case "MCQ":
      return 'MCQ: "options" holds exactly 4 distinct options (text only, no "(a)" prefixes). Exactly one option is correct; the other three are plausible distractors built on common student misconceptions.';
    case "ASSERTION_REASON":
      return 'ASSERTION_REASON: "text" holds "Assertion (A): ..." and "Reason (R): ..." on separate lines; "options" holds the 4 standard options: "Both (A) and (R) are true and (R) is the correct explanation of (A).", "Both (A) and (R) are true, but (R) is not the correct explanation of (A).", "(A) is true, but (R) is false.", "(A) is false, but (R) is true."';
    case "TRUE_FALSE":
      return 'TRUE_FALSE: "text" is one declarative statement only; do not append "True or False?". "options" is [].';
    case "FILL_BLANK":
      return 'FILL_BLANK: "text" has the blank as "________" (8 underscores). The blank holds the tested term and nothing else in the sentence gives it away. "options" is [].';
    case "MATCH_COLUMN":
      return 'MATCH_COLUMN: the whole section is ONE question. "text" holds the instruction and the Column I items labelled (A), (B), (C)...; "options" holds the Column II items in shuffled order (as many as Column I). Its "marks" is the section total.';
    case "CASE_STUDY":
      return 'CASE_STUDY: "text" holds the case/source (a short original scenario, extract, data table or situation); "subparts" holds the graded sub-questions, each {"label": "(i)", "text": ..., "marks": n}, marks adding up to the question\'s marks. A 1-mark subpart may be an MCQ with its own 4 "options".';
    case "UNSEEN_PASSAGE":
      return 'UNSEEN_PASSAGE: "text" holds a NEW, ORIGINAL passage of 120-180 words (not from any textbook or published text) followed by nothing else; "subparts" holds the sub-questions, each answerable from the passage alone, marks adding up to the question\'s marks. 1-mark subparts are MCQs with 4 "options".';
    case "REFERENCE_CONTEXT":
      return 'REFERENCE_CONTEXT: "text" holds the exact extract from the prescribed lesson/poem and the instruction; "subparts" (if the marks are split) hold the sub-questions.';
    default:
      return `${type}: "options" is []. Phrase the question so the expected length matches the marks; when points are wanted, say how many (e.g. "Give any three reasons"). When the question lists several items to do (features to locate on a map, parts to label, tasks (i), (ii), (iii)), keep only the instruction in "text" and give each item as its own entry in "subparts" ({"label": "(i)", "text": "...", "marks": 1}); never run them together in one paragraph or number them "(1)", "(2)" inside "text". If only some are to be attempted ("any four of the following"), list one more than needed and set "attemptCount" on the question.`;
  }
}

/** The prompt text plus counts, for the plan's still-empty slots. */
export function buildExternalPaperPrompt(ctx: ExternalPromptContext): ExternalPrompt {
  const { plan } = ctx;
  const profile = resolveDifficultyProfile(ctx.difficulty);
  const directives = getSubjectPromptDirectives(plan.subject, plan.className, plan.language);
  const sections = plan.sections.filter((s) => s.slots.length > 0);

  let questionCount = 0;
  let totalMarks = 0;
  const typesUsed = new Set<string>();
  let anyChoice = false;
  let offset = 0;

  const sectionBlocks = sections.map((sec) => {
    const type = sec.sectionType;
    typesUsed.add(type);
    const isMatch = type === "MATCH_COLUMN";
    const sectionMarks = sec.slots.length * sec.marksEach;
    totalMarks += sectionMarks;
    questionCount += isMatch ? 1 : sec.slots.length;
    const label = QUESTION_TYPE_LABEL[type as QuestionType] ?? type;
    const choice = sec.internalChoiceRequirement;
    const levels = planSlotDifficulties(sec.slots.length, sec.marksEach, profile.id, offset + sec.marksEach);
    offset += sec.slots.length;

    const head = [
      `### Section "${sec.sectionTitle}"`,
      isMatch
        ? `Type: ${type} (${label}). ONE match question with ${sec.slots.length} pairs, ${sec.marksEach} mark per pair = ${sectionMarks} marks.`
        : `Type: ${type} (${label}). ${sec.slots.length} question(s) × ${sec.marksEach} mark(s) = ${sectionMarks} marks.`,
      sec.sectionInstructions ? `Section instructions: ${sec.sectionInstructions}` : "",
    ];

    const slotLines = sec.slots.map((slot, i) => {
      const level = levels[i] ?? "MEDIUM";
      const requiresChoice = !isMatch && Boolean(slot.requiresInternalChoice ?? choice?.required);
      if (requiresChoice) anyChoice = true;
      const form = slotQuestionForm(plan.subject, slot.chapterTitle, type, sec.marksEach, slot.slotIndex + i);
      // chapters without a syllabus breakdown get a generic "Core concepts ... in <chapter>" topic: no help to the AI
      const topics = slot.curriculumPayload?.includedTopics?.filter((t) => t && !/^core concepts\b/i.test(t)) ?? [];
      const excluded = slot.curriculumPayload?.excludedTopics?.filter(Boolean) ?? [];
      const parts = [
        `${isMatch ? `Pair ${String.fromCharCode(65 + i)}` : `Q${i + 1}`}: Chapter ${slot.chapterNumber} "${slot.chapterTitle}"`,
        slot.componentTitle ? `Component: ${slot.componentTitle}` : "",
        isMatch ? "" : `Difficulty: ${level} (${levelMeaning(level, sec.marksEach)})`,
        form,
        topics.length ? `Topics allowed: ${topics.slice(0, 12).join("; ")}` : "",
        excluded.length ? `NOT in syllabus, do not use: ${excluded.slice(0, 12).join("; ")}` : "",
        requiresChoice ? 'Internal choice REQUIRED: add an "orQuestion" from the same chapter, same marks, type and difficulty, testing a different subtopic' : "",
      ];
      return `- ${parts.filter(Boolean).join(" | ")}`;
    });

    if (choice?.forbidden && !isMatch) head.push('Internal choice: not allowed in this section (no "orQuestion").');
    return [...head.filter(Boolean), ...slotLines].join("\n");
  });

  const exampleSection = sections[0];
  const example = exampleSection
    ? JSON.stringify(
        {
          title: plan.title,
          sections: [
            {
              title: exampleSection.sectionTitle,
              questions: [
                {
                  text: "…",
                  type: exampleSection.sectionType,
                  marks: exampleSection.sectionType === "MATCH_COLUMN" ? exampleSection.slots.length * exampleSection.marksEach : exampleSection.marksEach,
                  chapterNumber: exampleSection.slots[0]?.chapterNumber ?? 1,
                  chapterTitle: exampleSection.slots[0]?.chapterTitle ?? "…",
                  difficulty: "MEDIUM",
                  options: exampleSection.sectionType === "MCQ" ? ["…", "…", "…", "…"] : [],
                  ...(PASSAGE.has(exampleSection.sectionType) ? { subparts: [{ label: "(i)", text: "…", marks: 1 }] } : {}),
                  ...(anyChoice ? { orQuestion: { text: "… (only where internal choice is required)", marks: exampleSection.marksEach, chapterNumber: exampleSection.slots[0]?.chapterNumber ?? 1, difficulty: "MEDIUM", options: [] } } : {}),
                },
              ],
            },
          ],
        },
        null,
        2,
      )
    : "{}";

  const subjectRules = [
    ...directives.solvabilityRules,
    ...directives.completenessRules,
    ...(directives.varietyRules ?? []),
  ];
  const existing = (ctx.existingQuestionTexts ?? []).map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);

  const prompt = [
    `You are a senior board examiner setting an examination question paper. Write ONLY the questions. Do NOT write answers, solutions, explanations or marking schemes — the school's system writes the answer key separately.`,
    "",
    "## Paper",
    `- ${[ctx.schoolName, plan.title].filter(Boolean).join(" — ")}`,
    `- Class: ${plan.className} | Subject: ${plan.subject}${ctx.subjectCode ? ` (code ${ctx.subjectCode})` : ""} | Book: ${plan.bookTitle}`,
    `- Session: ${ctx.academicSession || "—"} | Exam: ${ctx.examType || "—"} | Marks in this request: ${totalMarks}`,
    `- Language: ${languageRule(plan.language)}`,
    "",
    "## Difficulty",
    `Profile: ${profile.label} — about ${profile.mix.EASY}% easy / ${profile.mix.MEDIUM}% medium / ${profile.mix.HARD}% hard; at least ${profile.applicationShare}% of marks test application, analysis or reasoning rather than recall.`,
    ...profile.directives.map((d) => `- ${d}`),
    `- Each question below has its own Difficulty. Write it AT that level and copy the level into its "difficulty" field. An OR alternative has the same difficulty as its main question.`,
    "",
    "## Quality rules (check every question against these before replying)",
    ...UNIVERSAL_QUALITY_RULES.filter((r) => !/^Model answers/.test(r)).map((r) => `- ${r}`),
    ...subjectRules.map((r) => `- ${r}`),
    "- Every question must be answerable from the prescribed textbook for this class, with exactly one correct answer for objective items.",
    "- Do not number questions or add marks like [2] inside the text; the paper adds numbering and marks.",
    /math|science|physic|chem|गणित|विज्ञान|भौतिक|रसायन/i.test(plan.subject) && !/social|सामाजिक/i.test(plan.subject)
      ? "- Write formulas and symbols in LaTeX inside $...$ (e.g. $v = u + at$)."
      : "",
    "- No two questions may test the same fact.",
    ctx.teacherFocus ? `- Teacher's instructions: ${ctx.teacherFocus}` : "",
    "",
    "## Question formats",
    ...[...typesUsed].map((t) => `- ${typeFormat(t)}`),
    "",
    "## Sections and questions to write",
    sectionBlocks.join("\n"),
    existing.length
      ? ["", "## Already on the paper (do not repeat or closely paraphrase)", ...existing.slice(0, 40).map((t) => `- ${t.slice(0, 160)}`)].join("\n")
      : "",
    "",
    "## Reply format",
    `Reply with ONE JSON object in a \`\`\`json code block and nothing else. Use this shape:`,
    "```json",
    example,
    "```",
    `- One entry in "sections" per section above, with "title" copied exactly, and its questions in the order listed (${questionCount} question(s) in all).`,
    `- Copy "type", "marks", "chapterNumber", "chapterTitle" and "difficulty" from the question's line above.`,
    `- Leave out "answer" everywhere.`,
    `- Before replying, count the questions in each section and check the marks add up to ${totalMarks}.`,
  ]
    .filter((line) => line !== "")
    .join("\n")
    // keep blank lines between headings readable
    .replace(/\n## /g, "\n\n## ")
    .replace(/\n### /g, "\n\n### ");

  return { prompt, questionCount, totalMarks };
}
