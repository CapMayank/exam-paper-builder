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
import { typeFormat } from "./externalTypeFormats";
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

  const envelope = JSON.stringify(
    {
      title: plan.title,
      sections: [{ title: "<section title, copied exactly>", questions: ["<one object per question, in the shape shown for its type above>"] }],
    },
    null,
    2,
  );
  const orExample = JSON.stringify(
    {
      orQuestion: {
        text: "<alternative question>",
        type: "<same type as the main question>",
        marks: "<same marks>",
        chapterNumber: "<chapter number>",
        chapterTitle: "<chapter title>",
        difficulty: "<same difficulty>",
        options: [],
        subparts: [],
      },
    },
    null,
    2,
  );
  const formatBlocks = [...typesUsed].flatMap((t) => {
    const f = typeFormat(t, plan.language);
    return [`- ${f.rule}`, "```json", JSON.stringify(f.example, null, 2), "```"];
  });

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
    ...formatBlocks,
    `- Figures: if and only if a question refers to a figure, diagram, graph, map or picture, add "figure": "<exact description: what to draw, every label, every value/measurement, nothing that gives away the answer>". Never write 'in the figure' without a "figure". The school's system draws it from your description. Never add "figure" to KDG_* activities (their pictures come from the picture set) or to DRAW questions (the student draws).`,
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
    envelope,
    "```",
    anyChoice ? ["Where internal choice is REQUIRED, add to that question:", "```json", orExample, "```"].join("\n") : "",
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
