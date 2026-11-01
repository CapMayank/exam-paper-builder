import "server-only";
import {
  canHaveSubparts,
  cleanMatchItem,
  cleanOptionText,
  cleanQuestionStatement,
  derangeMatchColumnPairs,
  extractMatchPairsFromExplanation,
  getMatchColumnInstruction,
  isKindergartenType,
  isMcqLikeType,
  isSubpartQuestionType,
  PaperLanguage,
  parseMatchColumnPairs,
  QUESTION_TYPES,
} from "./constants";
import { decomposeStemSubparts } from "./subpartExtractor";
import {
  findEligibleDiagrams,
  isSectionVisuallyEligible,
  isSubjectChapterVisual,
  saveDiagramToUploads,
} from "./diagram-search";
import {
  buildAndValidateGenerationContract,
  cleanChapterTitleForLookup,
  generateCurriculumGroundedSectionQuestions,
  getChapterCurriculumSpec,
  type CurriculumGenerationPayload,
  type GenerationContract,
} from "./curriculumContract";
import {
  createGenerationJobTrace,
  type GenerationJobTrace,
} from "./generationObservability";
import {
  validateGeneratedSection,
  type QuestionValidationIssue,
} from "./questionValidator";
import { isParaphraseOrDuplicateChoice } from "./internalChoiceRules";
import { normalizeQuestionType } from "./paperImport";
import { ensureLanguageNonChapterUnits } from "./syllabusImport";
import { parseGeminiJsonWithLatexSafety, repairLatex } from "./math";
import { normalizeSubpartMarks, type SubPart } from "./types";
import { getSubjectPromptDirectives } from "./subjectPrompts";
import {
  verifyQuestionAcademicQuality,
  repairOrRegenerateQuestion,
} from "./questionVerificationEngine";
import { auditPaperEvidenceBased } from "./evidenceAuditEngine";

export interface GeminiCallResult<T> {
  success: boolean;
  isMock: boolean;
  data: T;
  rawResponse?: string;
  error?: string;
  modelUsed?: string;
  trace?: GenerationJobTrace;
  contract?: GenerationContract;
  validationIssues?: QuestionValidationIssue[];
}

export function getGeminiApiKey(customKey?: string | null): string | null {
  if (customKey && customKey.trim().length > 5) {
    return customKey.trim();
  }
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function isGeminiConfigured(customKey?: string | null): boolean {
  return Boolean(getGeminiApiKey(customKey));
}

export type GeminiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * Low-level caller for Google Gemini API (Gemini 2.5 Pro / 2.5 Flash)
 * using standard HTTPS fetch with LaTeX-safe JSON parsing.
 */
export async function callGeminiApi<T>(
  prompt: string | GeminiContentPart[],
  systemInstruction: string,
  opts: {
    json?: boolean;
    apiKey?: string | null;
    model?: string;
    mockFallback?: () => T;
    allowFallbackOnApiFailure?: boolean;
  } = {},
): Promise<GeminiCallResult<T>> {
  const apiKey = getGeminiApiKey(opts.apiKey);

  // If no API key is configured, use curriculum-grounded offline generator if provided
  if (!apiKey) {
    if (opts.mockFallback) {
      return {
        success: true,
        isMock: true,
        modelUsed: "offline-curriculum-engine",
        data: opts.mockFallback(),
      };
    }
    return {
      success: false,
      isMock: true,
      error: "No Gemini API key configured.",
      data: null as unknown as T,
    };
  }

  // Model priority: configured model or gemini-2.5-pro / gemini-2.5-flash / gemini-2.5-flash-lite
  const chosenModel = opts.model || process.env.GEMINI_MODEL;
  const isPro = Boolean(chosenModel?.includes("pro"));
  const fallbackList = isPro
    ? [
        chosenModel!,
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-flash-lite-latest",
      ]
    : [
        chosenModel || "gemini-2.5-flash",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-flash-latest",
      ];
  const candidateModels = Array.from(new Set(fallbackList.filter(Boolean)));

  const parts = typeof prompt === "string" ? [{ text: prompt }] : prompt;

  const payload: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.3,
      topP: 0.95,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  let lastStatus = 0;
  let lastErrorText = "";

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let retry = 0; retry < 2; retry++) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          lastStatus = res.status;
          lastErrorText = await res.text();
          // On transient 503 (High Demand / Unavailable) or 429, wait briefly once on the primary model before rotating
          if ((res.status === 503 || res.status === 429) && retry === 0 && model === candidateModels[0]) {
            await new Promise((r) => setTimeout(r, 450));
            continue;
          }
          console.warn(`Gemini API Model ${model} returned ${res.status}. Trying fallback model...`);
          break;
        }

        const json = await res.json();
        const candidateText =
          json.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (opts.json) {
          const parsedData = parseGeminiJsonWithLatexSafety<T>(candidateText);
          return {
            success: true,
            isMock: false,
            modelUsed: model,
            data: parsedData,
            rawResponse: candidateText,
          };
        }

        return {
          success: true,
          isMock: false,
          modelUsed: model,
          data: candidateText as unknown as T,
          rawResponse: candidateText,
        };
      } catch (err: any) {
        lastErrorText = err?.message || String(err);
        console.warn(`Gemini API Model ${model} fetch/parse failed:`, lastErrorText);
        break;
      }
    }
  }

  // Fall back to curriculum-grounded offline engine when live API endpoints are unavailable (e.g. 503 High Demand / 429 Quota)
  if (opts.allowFallbackOnApiFailure !== false && opts.mockFallback) {
    return {
      success: true,
      isMock: true,
      modelUsed: "curriculum-grounded-fallback",
      data: opts.mockFallback(),
      error: `Gemini API returned status ${lastStatus || 503}; served from curriculum-grounded engine.`,
    };
  }

  return {
    success: false,
    isMock: false,
    error: `Gemini API Error (${lastStatus || "PARSE_OR_NETWORK"}): ${lastErrorText || "All model endpoints unavailable"}`,
    data: null as unknown as T,
  };
}

/* ------------------------------------------------------------------ */
/* 1. Question Generator AI                                            */
/* ------------------------------------------------------------------ */

export interface GeneratedQuestionItem {
  type: string;
  text: string;
  options: string[];
  subparts: Array<SubPart>;
  attemptCount?: number;
  answer: string;
  marks: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  cognitiveLevel: "REMEMBERING" | "UNDERSTANDING" | "APPLYING" | "ANALYZING" | "EVALUATING";
  explanation?: string;
  requiresInternalChoice?: boolean;
  orQuestion?: {
    chapterId?: string;
    chapterNumber?: number;
    chapterTitle?: string;
    type: string;
    text: string;
    options: string[];
    subparts: Array<SubPart>;
    attemptCount?: number;
    answer: string;
    marks: number;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    cognitiveLevel?: string;
    explanation?: string;
  };
}

export async function generateQuestionsWithGemini(params: {
  chapter: string;
  className: string;
  subject: string;
  type: string;
  marks: number;
  difficulty: string;
  cognitiveLevel?: string;
  language: PaperLanguage;
  count: number;
  topicContext?: string;
  board?: string | null;
  academicSession?: string | null;
  subjectCode?: string | null;
  sectionInstructions?: string | null;
  requiresInternalChoice?: boolean;
  apiKey?: string | null;
}): Promise<GeminiCallResult<GeneratedQuestionItem[]>> {
  const {
    chapter,
    className,
    subject,
    type,
    marks,
    difficulty,
    cognitiveLevel,
    language,
    count,
    topicContext,
    board,
    academicSession,
    subjectCode,
    sectionInstructions,
    requiresInternalChoice,
    apiKey,
  } = params;

  const normalizedType = normalizeQuestionType(type);
  const effectiveCount = Math.max(1, count || 1);
  const contractRes = buildAndValidateGenerationContract({
    board,
    className,
    academicSession,
    subject,
    subjectCode,
    sectionInstructions,
    questionType: normalizedType,
    marksEach: marks || 1,
    difficulty,
    language,
    requiredCount: effectiveCount,
    slots: Array.from({ length: effectiveCount }, (_, i) => ({
      slotIndex: i,
      chapterId: `ch_${i + 1}`,
      chapterNumber: i + 1,
      chapterTitle: chapter || "Syllabus Chapter",
      marks: marks || 1,
      requiresInternalChoice,
    })),
  });

  if (!contractRes.valid || !contractRes.contract) {
    return {
      success: false,
      isMock: false,
      error: contractRes.errors.join(" "),
      data: [],
    };
  }

  const contract = contractRes.contract;
  const chapterSpec = contract.slots[0].curriculumSpec;
  const subjectDirectives = getSubjectPromptDirectives(
    contract.canonicalSubject,
    contract.className,
    language,
    (contract.subjectVariant as any) || "STANDARD",
  );

  const systemPrompt = `You are a strict, experienced ${contract.boardDisplayName} Senior Examiner and ${contract.canonicalSubject} Curriculum Specialist.
Your task is to generate authentic, mathematically/scientifically rigorous examination questions strictly aligned with the ${contract.className} ${contract.canonicalSubject} syllabus (${contract.academicSession}, Subject Code: ${contract.subjectCode}).
${subjectDirectives.systemDirective}

STRICT DOMAIN ISOLATION & SUBJECT DIRECTIVES:
- Generate questions ONLY for ${contract.canonicalSubject} (Chapter: "${chapter}").
- Allowed syllabus topics: ${chapterSpec.includedTopics.join("; ")}
${chapterSpec.deletedTopics.length > 0 ? `- Deleted/Excluded topics (DO NOT ASK): ${chapterSpec.deletedTopics.join("; ")}` : ""}
${contract.forbiddenCrossSubjectDomains.length > 0 ? `- FORBIDDEN cross-subject domains (NEVER include): ${contract.forbiddenCrossSubjectDomains.join("; ")}` : ""}
- Solvability & Validity:
${subjectDirectives.solvabilityRules.map((r) => `  * ${r}`).join("\n")}
- Completeness & Clear Conditions:
${subjectDirectives.completenessRules.map((r) => `  * ${r}`).join("\n")}
- Rubric: ${subjectDirectives.rubricDirective}
- NEVER output generic placeholder templates or cross-subject content.
Output format: JSON array of question objects only. No conversational wrapper.`;

  const isMatchColumn = normalizedType === "MATCH_COLUMN";
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const romans = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
  const pairCount = isMatchColumn ? (marks <= 1 ? 4 : Math.min(10, marks)) : 4;
  const targetLetters = letters.slice(0, pairCount);
  const targetRomans = romans.slice(0, pairCount);

  const userPrompt = isMatchColumn
    ? `Generate ${effectiveCount} distinct board-aligned Match the Columns question(s) with the following specifications:
- Board: ${contract.boardDisplayName} (${contract.academicSession})
- Class: ${className}
- Subject: ${contract.canonicalSubject} (Code: ${contract.subjectCode})
- Chapter: ${chapter}
- Allowed Topics: ${chapterSpec.includedTopics.join("; ")}
- Question Type: MATCH_COLUMN
- Marks: ${marks} marks each (containing exactly ${pairCount} matching pairs)
- Difficulty: ${difficulty}
- Cognitive Level: ${cognitiveLevel || "APPLYING"}
- Language: ${
  language === "sa"
    ? "Pure Sanskrit in authentic Devanagari script (संस्कृतम्). Follow NCERT/MPBSE Shemushi standards. Use proper sandhi, vibhakti, and Sanskrit terminology. Do NOT write in English or Hindi."
    : language === "bilingual"
    ? "Bilingual (English with Hindi translation in parentheses)"
    : language === "hi"
    ? "Hindi (Devanagari script)"
    : "English"
}
${topicContext ? `- Specific Topic / Context Focus: ${topicContext}` : ""}

CRITICAL MATCH_COLUMN STRUCTURE REQUIREMENTS:
1. The "text" field MUST contain:
   - The opening instruction line (e.g. "Match the items in Column I with their correct evaluated forms in Column II:")
   - Followed by "Column I:" on its own line
   - Followed by EXACTLY ${pairCount} Column I items labeled ${targetLetters.map((l) => `(${l})`).join(", ")} on separate lines.
2. The "options" array MUST contain EXACTLY the ${pairCount} corresponding Column II matching items/expressions (shuffled/deranged relative to Column I).
   DO NOT leave "options" empty!
3. The "answer" field MUST specify the correct pairing for all ${pairCount} items:
   Example: "${targetLetters.map((l, i) => `(${l})-${targetRomans[(i + 1) % pairCount]}`).join(", ")}"
4. Use standard LaTeX math $...$ for any mathematical expressions, integrals, equations, fractions, or symbols.

Return a JSON array strictly matching this TypeScript structure:
[
  {
    "type": "MATCH_COLUMN",
    "text": "Match the items in Column I with Column II:\\nColumn I:\\n${targetLetters.map((l, i) => `(${l}) Concept ${i + 1}`).join("\\n")}",
    "options": ${JSON.stringify(targetLetters.map((_, i) => `Definition / result for ${letters[(i + 1) % pairCount]} (shuffled)`), null, 4)},
    "subparts": [],
    "answer": "${targetLetters.map((l, i) => `(${l})-${targetRomans[(i + 1) % pairCount]}`).join(", ")}",
    "marks": ${marks},
    "difficulty": "${difficulty}",
    "cognitiveLevel": "${cognitiveLevel || "APPLYING"}",
    "explanation": "Step-by-step evaluation showing why each pairing is correct."
  }
]`
    : `Generate ${effectiveCount} distinct board-aligned question(s) with the following specifications:
- Board: ${contract.boardDisplayName} (${contract.academicSession})
- Class: ${className}
- Subject: ${contract.canonicalSubject} (Code: ${contract.subjectCode})
- Chapter: ${chapter}
- Allowed Topics: ${chapterSpec.includedTopics.join("; ")}
- Question Type: ${normalizedType}
- Marks: ${marks} marks each
- Difficulty: ${difficulty}
- Cognitive Level: ${cognitiveLevel || "APPLYING"}
- Language: ${
  language === "sa"
    ? "Pure Sanskrit in authentic Devanagari script (संस्कृतम्). Follow NCERT/MPBSE Shemushi standards. Use proper sandhi, vibhakti, and Sanskrit terminology. Do NOT write in English or Hindi."
    : language === "bilingual"
    ? "Bilingual (English with Hindi translation in parentheses)"
    : language === "hi"
    ? "Hindi (Devanagari script)"
    : "English"
}
${topicContext ? `- Specific Topic / Context Focus: ${topicContext}` : ""}

Strict requirements:
1. For MCQ: Provide exactly 4 distinct options with one correct answer. Make distractors conceptually plausible based on common student misconceptions in ${contract.canonicalSubject}.
2. For ASSERTION_REASON: Provide Assertion (A) and Reason (R), and standard 4 options:
   (a) Both (A) and (R) are true and (R) is the correct explanation of (A).
   (b) Both (A) and (R) are true, but (R) is not the correct explanation of (A).
   (c) (A) is true, but (R) is false.
   (d) (A) is false, but (R) is true.
3. For CASE_STUDY, UNSEEN_PASSAGE, REFERENCE_CONTEXT: Provide an authentic ${contract.canonicalSubject} passage/scenario for "${chapter}", followed by graded subparts matching the question's target marks (${marks} marks) and blueprint pattern with labels (e.g. "(i)", "(ii)" or "(a)", "(b)"), question text, marks distribution, and answers.
4. For VERY_SHORT, SHORT, LONG, NUMERICAL, GRAMMAR: Provide step-wise model answer and marking scheme breakdown.
5. For FILL_BLANK: Provide question text containing one or more blanks indicated by "________" (at least 8 underscores). Options should be empty []. The answer should be the exact word(s) or value filling the blank.
6. For TRUE_FALSE: Provide a clear declarative statement. Options should be ["True", "False"] (or ["आम्", "न"] for Sanskrit, or ["सत्य", "असत्य"] for Hindi). Answer must be "True", "False", "आम्", "न", "सत्य", or "असत्य".
7. Use standard LaTeX math $...$ for any mathematical expressions, formulas, chemical reactions, or units.
8. Subparts rule: ${
    isSubpartQuestionType(normalizedType)
      ? `Provide graded subparts in "subparts" whose marks sum to ${marks}.`
      : `If this question tests multiple distinct sentences, components, equations, or sub-questions (e.g., 'Correct the following sentences', 'Solve (a) and (b)', 'Differentiate between (i) and (ii)'), output each item in "subparts" with label, text, and marks. If the question has internal choice across subparts (e.g. 'Answer any 4 of 5'), include all 5 subparts (each 1 mark) and specify "attemptCount": 4. Otherwise, if it is a single unified essay or paragraph without distinct sub-items, keep "subparts": [].`
  }

Return a JSON array strictly matching this TypeScript structure:
[
  {
    "type": "${normalizedType}",
    "text": "Question text...",
    "options": ${isMcqLikeType(normalizedType) ? '["Option A", "Option B", "Option C", "Option D"]' : "[]"},
    "subparts": ${
      isSubpartQuestionType(normalizedType)
        ? '[\n      { "label": "(i)", "text": "Subpart text", "marks": 1, "answer": "Answer" }\n    ]'
        : '[] // or list of subparts if multi-component'
    },
    "answer": "Detailed model answer / step marking scheme",
    "marks": ${marks},
    "difficulty": "${difficulty}",
    "cognitiveLevel": "${cognitiveLevel || "APPLYING"}",
    "explanation": "Why this answer is correct"
  }
]`;

  const fallbackQuestions = (): GeneratedQuestionItem[] => {
    if (isKindergartenType(type)) {
      if (type === "KDG_TRACE_WRITE") {
        return [
          {
            type: "KDG_TRACE_WRITE",
            text: language === "hi" ? "चार-लाइन पर सुंदर अक्षरों में लिखिए:" : "Trace and copy the letters neatly on the four-line guide:",
            options: [JSON.stringify({ guideType: "FOUR_LINE", targetText: "A B C D E", showDotted: true, repeatRows: 2 })],
            subparts: [],
            answer: "A B C D E",
            marks: marks || 5,
            difficulty: "EASY",
            cognitiveLevel: "REMEMBERING",
            explanation: "Trace capital letters on four-line guide.",
          },
        ];
      }
      if (type === "KDG_NUMBER_GRID") {
        return [
          {
            type: "KDG_NUMBER_GRID",
            text: language === "hi" ? "खाली स्थानों में छूटी हुई संख्याएँ भरिए:" : "Fill in the missing numbers in the grid from 1 to 50:",
            options: [JSON.stringify({ maxNumber: 50, columns: 5, blankIndices: [1, 3, 5, 7, 9, 11, 13, 15] })],
            subparts: [],
            answer: "2, 4, 6, 8, 10, 12, 14, 16",
            marks: marks || 5,
            difficulty: "EASY",
            cognitiveLevel: "REMEMBERING",
            explanation: "Practice number sequencing in 1-50 grid.",
          },
        ];
      }
      if (type === "KDG_COUNT_ITEMS") {
        return [
          {
            type: "KDG_COUNT_ITEMS",
            text: language === "hi" ? "गुब्बारे गिनिए और डिब्बे में संख्या लिखिए:" : "Count the balloons and write the correct number in the box:",
            options: [JSON.stringify({ clipartId: "balloon", count: 4, mode: "write_box" })],
            subparts: [],
            answer: "4",
            marks: marks || 5,
            difficulty: "EASY",
            cognitiveLevel: "UNDERSTANDING",
            explanation: "Count outline objects and write the numeral.",
          },
        ];
      }
      if (type === "KDG_PICTURE_MATCH") {
        return [
          {
            type: "KDG_PICTURE_MATCH",
            text: language === "hi" ? "चित्र पहचानकर सही अक्षर से रेखा खींचकर मिलाइए:" : "Look at the pictures and draw a line to match with the correct letter:",
            options: [
              JSON.stringify({
                pairs: [
                  { clipartId: "apple", label: "Apple", target: "A" },
                  { clipartId: "ball", label: "Ball", target: "B" },
                  { clipartId: "cat", label: "Cat", target: "C" },
                  { clipartId: "duck", label: "Duck", target: "D" },
                ],
                shuffleTargets: true,
              }),
            ],
            subparts: [],
            answer: "Apple->A, Ball->B, Cat->C, Duck->D",
            marks: marks || 5,
            difficulty: "EASY",
            cognitiveLevel: "UNDERSTANDING",
            explanation: "Picture to letter phonics matching.",
          },
        ];
      }
      if (type === "KDG_CIRCLE_TARGET") {
        return [
          {
            type: "KDG_CIRCLE_TARGET",
            text: language === "hi" ? "प्रत्येक पंक्ति में भिन्न चित्र पर गोला लगाइए:" : "Circle the odd picture in each row:",
            options: [
              JSON.stringify({
                rows: [
                  { items: ["apple", "apple", "car", "apple"], targetIndex: 2 },
                  { items: ["cat", "kite", "cat", "cat"], targetIndex: 1 },
                ],
              }),
            ],
            subparts: [],
            answer: "Row 1: Car, Row 2: Kite",
            marks: marks || 5,
            difficulty: "EASY",
            cognitiveLevel: "ANALYZING",
            explanation: "Identify the odd object in each row.",
          },
        ];
      }
      if (type === "KDG_SEQUENCE_CHAIN") {
        return [
          {
            type: "KDG_SEQUENCE_CHAIN",
            text: language === "hi" ? "इल्ली के शरीर में छूटे हुए अक्षर भरिए:" : "Fill in the missing letters in the caterpillar's body:",
            options: [
              JSON.stringify({
                style: "caterpillar",
                items: [
                  { value: "A", isBlank: false },
                  { value: "B", isBlank: true },
                  { value: "C", isBlank: false },
                  { value: "D", isBlank: true },
                  { value: "E", isBlank: false },
                ],
              }),
            ],
            subparts: [],
            answer: "B, D",
            marks: marks || 5,
            difficulty: "EASY",
            cognitiveLevel: "REMEMBERING",
            explanation: "Complete the missing letter chain.",
          },
        ];
      }
    }

    const grounded = generateCurriculumGroundedSectionQuestions(contract);
    return grounded.map((g) => ({
      type: g.type,
      text: g.text,
      options: g.options,
      subparts: g.subparts.map((sp) => ({
        label: sp.label,
        text: sp.text,
        marks: sp.marks,
        answer: sp.answer || "",
        options: sp.options,
      })),
      answer: g.answer,
      marks: marks || 1,
      difficulty: g.difficulty,
      cognitiveLevel: (g.cognitiveLevel as any) || "UNDERSTANDING",
      explanation: g.explanation,
      requiresInternalChoice: g.requiresInternalChoice,
      orQuestion: g.orQuestion
        ? {
            chapterId: g.orQuestion.chapterId,
            chapterNumber: g.orQuestion.chapterNumber,
            chapterTitle: g.orQuestion.chapterTitle,
            type: g.orQuestion.type,
            text: g.orQuestion.text,
            options: g.orQuestion.options,
            subparts: g.orQuestion.subparts.map((sp) => ({
              label: sp.label,
              text: sp.text,
              marks: sp.marks,
              answer: sp.answer || "",
              options: sp.options,
            })),
            answer: g.orQuestion.answer,
            marks: g.orQuestion.marks,
            difficulty: g.orQuestion.difficulty,
            cognitiveLevel: g.orQuestion.cognitiveLevel,
            explanation: g.orQuestion.explanation,
          }
        : undefined,
    }));
  };

  const callResult = await callGeminiApi<GeneratedQuestionItem[]>(userPrompt, systemPrompt, {
    json: true,
    apiKey,
    mockFallback: fallbackQuestions,
    allowFallbackOnApiFailure: true,
  });

  if (callResult.success && Array.isArray(callResult.data)) {
    const cleanCh = cleanChapterTitleForLookup(chapter || "Syllabus Chapter");
    const chapterSupplementPairs: Array<{ left: string; right: string }> = [
      ...chapterSpec.sampleMatchPairs,
      ...chapterSpec.includedTopics.map((t, i) => ({
        left: `${cleanCh}: ${t.split(":")[0].trim()}`,
        right:
          chapterSpec.keyFormulasOrConcepts[i % chapterSpec.keyFormulasOrConcepts.length] ||
          `Verified relation in ${cleanCh} (${i + 1})`,
      })),
    ];
    while (chapterSupplementPairs.length < 10) {
      const idx = chapterSupplementPairs.length + 1;
      chapterSupplementPairs.push({
        left: `${cleanCh} theorem (${idx})`,
        right: `${chapterSpec.keyFormulasOrConcepts[0] || `Verified result in ${cleanCh}`} (${idx})`,
      });
    }

    const fallbackPool = fallbackQuestions();

    callResult.data = callResult.data.map((item, itemIdx) => {
      const slot = contract.slots[itemIdx] || contract.slots[0];
      const qType = normalizeQuestionType(item.type || type);
      const isMatch = qType === "MATCH_COLUMN";
      let options = Array.isArray(item.options) ? item.options.map((o) => repairLatex(cleanOptionText(String(o).trim()))) : [];
      let qText = repairLatex(cleanQuestionStatement(String(item.text || "").trim(), qType));
      let qAnswer = isMcqLikeType(qType) ? repairLatex(cleanOptionText(item.answer || "")) : repairLatex(String(item.answer || "").trim());

      if (qType === "TRUE_FALSE") {
        if (language === "sa") {
          options = ["आम्", "न"];
          if (/true|सत्य|आम्|सही/i.test(qAnswer)) qAnswer = "आम्";
          else if (/false|असत्य|न|गलत/i.test(qAnswer)) qAnswer = "न";
        } else if (language === "hi") {
          options = ["सत्य", "असत्य"];
          if (/true|सत्य|सही/i.test(qAnswer)) qAnswer = "सत्य";
          else if (/false|असत्य|गलत/i.test(qAnswer)) qAnswer = "असत्य";
        } else if (language === "bilingual") {
          options = ["सत्य / True", "असत्य / False"];
        } else {
          options = ["True", "False"];
        }
      }

      // If MATCH_COLUMN, ensure robust pair extraction, column formatting, and derangement
      if (isMatch) {
        let pairs = parseMatchColumnPairs(options, qText, item.explanation);
        if (pairs.length === 0) {
          pairs = extractMatchPairsFromExplanation(item.explanation);
        }
        if (pairs.length === 0 && qText) {
          pairs = extractMatchPairsFromExplanation(qText);
        }

        const targetPairCount = marks <= 1 ? 4 : Math.min(10, marks);

        if (pairs.length > 0) {
          if (pairs.length < targetPairCount) {
            for (let idx = pairs.length; idx < targetPairCount; idx++) {
              const sup = chapterSupplementPairs[idx % chapterSupplementPairs.length];
              pairs.push({
                left: `(${letters[idx] ?? idx + 1}) ${sup.left}`,
                right: sup.right,
              });
            }
          } else if (pairs.length > targetPairCount) {
            pairs = pairs.slice(0, targetPairCount);
          }

          const isDirectMatch =
            /^\s*\(?[Aa]\)?\s*[-→:]\s*\(?([1iI])\)?\s*,\s*\(?[Bb]\)?\s*[-→:]\s*\(?([2iI]{2})\)?/.test(qAnswer) ||
            !qAnswer ||
            qAnswer.toLowerCase().includes("direct");

          const deranged = isDirectMatch && pairs.length > 1 ? derangeMatchColumnPairs(pairs) : pairs;
          const col1Lines = pairs.map((p, idx) => `(${letters[idx] ?? idx + 1}) ${cleanMatchItem(p.left)}`);
          const col2Items = deranged.map((p) => cleanMatchItem(p.right));
          const answers = pairs.map((p, idx) => {
            const optIdx = col2Items.indexOf(cleanMatchItem(p.right));
            const romanLabel = optIdx >= 0 ? (romans[optIdx] ?? `(${optIdx + 1})`) : (romans[idx] ?? `(${idx + 1})`);
            return `(${letters[idx] ?? idx + 1})-${romanLabel}`;
          });
          const instr = getMatchColumnInstruction(qText);
          qText = `${instr}\nColumn I:\n${col1Lines.join("\n")}`;
          options = col2Items;
          qAnswer = answers.join(", ");
        } else {
          const fallbackPairs = chapterSupplementPairs.slice(0, targetPairCount).map((p, idx) => ({
            left: `(${letters[idx] ?? idx + 1}) ${p.left}`,
            right: p.right,
          }));
          const deranged = derangeMatchColumnPairs(fallbackPairs);
          const col1Lines = fallbackPairs.map((p, idx) => `(${letters[idx] ?? idx + 1}) ${cleanMatchItem(p.left)}`);
          const col2Items = deranged.map((p) => cleanMatchItem(p.right));
          const answers = fallbackPairs.map((p, idx) => {
            const optIdx = col2Items.indexOf(cleanMatchItem(p.right));
            return `(${letters[idx] ?? idx + 1})-${romans[optIdx] ?? `(${optIdx + 1})`}`;
          });
          const instr = getMatchColumnInstruction(qText);
          qText = `${instr}\nColumn I:\n${col1Lines.join("\n")}`;
          options = col2Items;
          qAnswer = answers.join(", ");
        }
      }

      // Parse and normalize subparts
      let rawSubparts: SubPart[] =
        canHaveSubparts(qType) && Array.isArray(item.subparts) && item.subparts.length > 0
          ? item.subparts.map((sp, spIdx) => ({
              label: String(sp.label || `(${spIdx + 1})`),
              text: repairLatex(String(sp.text || "")),
              marks: Number(sp.marks) || 1,
              options: Array.isArray(sp.options) ? sp.options.map((o) => repairLatex(cleanOptionText(String(o).trim()))) : undefined,
              answer: sp.answer ? (isMcqLikeType(qType) ? repairLatex(cleanOptionText(String(sp.answer))) : repairLatex(String(sp.answer))) : "",
            }))
          : [];

      let attemptCount = typeof (item as any).attemptCount === "number" && (item as any).attemptCount > 0
        ? (item as any).attemptCount
        : undefined;

      // Safe fallback: if AI generated plain text with inlined subparts, decompose it safely
      if (rawSubparts.length === 0 && canHaveSubparts(qType)) {
        const decomp = decomposeStemSubparts(qText);
        if (decomp) {
          qText = decomp.stem;
          rawSubparts = decomp.subparts;
          if (decomp.attemptCount && !attemptCount) {
            attemptCount = decomp.attemptCount;
          }
        }
      }

      const normalizedSubparts = rawSubparts.length > 0 ? normalizeSubpartMarks(rawSubparts, marks, attemptCount) : [];

      let normalizedOrQuestion: GeneratedQuestionItem["orQuestion"] = undefined;
      if (!contract.internalChoiceRequirement.forbidden && slot?.requiresInternalChoice) {
        if (item.orQuestion && typeof item.orQuestion.text === "string" && item.orQuestion.text.trim()) {
          let orText = repairLatex(cleanQuestionStatement(item.orQuestion.text.trim(), qType));
          const orOpts = Array.isArray(item.orQuestion.options)
            ? item.orQuestion.options.map((o) => repairLatex(cleanOptionText(String(o).trim())))
            : [];
          let orSubpartsRaw: SubPart[] =
            Array.isArray(item.orQuestion.subparts) && item.orQuestion.subparts.length > 0
              ? item.orQuestion.subparts.map((sp, spIdx) => ({
                  label: String(sp.label || `(${spIdx + 1})`),
                  text: repairLatex(String(sp.text || "")),
                  marks: Number(sp.marks) || 1,
                  options: Array.isArray(sp.options)
                    ? sp.options.map((o) => repairLatex(cleanOptionText(String(o).trim())))
                    : undefined,
                  answer: sp.answer
                    ? isMcqLikeType(qType)
                      ? repairLatex(cleanOptionText(String(sp.answer)))
                      : repairLatex(String(sp.answer))
                    : "",
                }))
              : [];
          let orAttemptCount =
            typeof (item.orQuestion as any).attemptCount === "number" && (item.orQuestion as any).attemptCount > 0
              ? (item.orQuestion as any).attemptCount
              : undefined;

          if (orSubpartsRaw.length === 0 && canHaveSubparts(qType)) {
            const decompOr = decomposeStemSubparts(orText);
            if (decompOr) {
              orText = decompOr.stem;
              orSubpartsRaw = decompOr.subparts;
              if (decompOr.attemptCount && !orAttemptCount) {
                orAttemptCount = decompOr.attemptCount;
              }
            }
          }

          const orSubparts = orSubpartsRaw.length > 0 ? normalizeSubpartMarks(orSubpartsRaw, marks, orAttemptCount) : [];
          const orAnswer = isMcqLikeType(qType)
            ? repairLatex(cleanOptionText(item.orQuestion.answer || ""))
            : repairLatex(String(item.orQuestion.answer || "").trim());

          if (!isParaphraseOrDuplicateChoice(qText, orText) && orAnswer.trim().length > 0) {
            normalizedOrQuestion = {
              chapterId: slot.chapterId,
              chapterNumber: slot.chapterNumber,
              chapterTitle: slot.chapterTitle,
              type: qType,
              text: orText,
              options: orOpts,
              subparts: orSubparts,
              answer: orAnswer,
              marks,
              difficulty: (["EASY", "MEDIUM", "HARD"].includes(item.orQuestion.difficulty)
                ? item.orQuestion.difficulty
                : item.difficulty || "MEDIUM") as "EASY" | "MEDIUM" | "HARD",
              cognitiveLevel: item.orQuestion.cognitiveLevel || item.cognitiveLevel || "APPLYING",
              explanation: item.orQuestion.explanation,
            };
          }
        }

        if (!normalizedOrQuestion) {
          const fbItem = fallbackPool[itemIdx] || fallbackPool[0];
          if (fbItem?.orQuestion && !isParaphraseOrDuplicateChoice(qText, fbItem.orQuestion.text)) {
            normalizedOrQuestion = fbItem.orQuestion;
          } else if (fbItem && !isParaphraseOrDuplicateChoice(qText, fbItem.text)) {
            normalizedOrQuestion = {
              chapterId: slot.chapterId,
              chapterNumber: slot.chapterNumber,
              chapterTitle: slot.chapterTitle,
              type: qType,
              text: fbItem.text,
              options: fbItem.options,
              subparts: fbItem.subparts,
              answer: fbItem.answer,
              marks,
              difficulty: fbItem.difficulty,
              cognitiveLevel: fbItem.cognitiveLevel,
              explanation: fbItem.explanation,
            };
          }
        }
      }

      return {
        ...item,
        type: qType,
        text: qText,
        options,
        answer: qAnswer,
        marks,
        subparts: normalizedSubparts,
        requiresInternalChoice: Boolean(!contract.internalChoiceRequirement.forbidden && slot?.requiresInternalChoice),
        orQuestion: normalizedOrQuestion,
      };
    });

    if (!isKindergartenType(normalizedType)) {
      const validation = validateGeneratedSection(callResult.data, contract);
      const trace = createGenerationJobTrace({
        contract,
        modelUsed: callResult.modelUsed || "gemini-2.5-flash",
        isOfflineCurriculumMode: callResult.isMock,
        retryCount: 0,
        acceptedCount: validation.acceptedQuestions.length,
        rejectedCount: validation.rejectedSlotIndices.length,
        validationIssues: validation.issues,
      });
      callResult.trace = trace;
      callResult.contract = contract;
      callResult.validationIssues = validation.issues;

      if (!validation.valid) {
        return {
          success: false,
          isMock: callResult.isMock,
          error: `Generated question failed subject/curriculum validation: ${validation.issues.map((i) => i.message).join("; ")}`,
          data: validation.acceptedQuestions as GeneratedQuestionItem[],
          trace,
          contract,
          validationIssues: validation.issues,
        };
      }
    }
  }

  return callResult;
}

/* ------------------------------------------------------------------ */
/* 1b. Complete Paper Section Question Generator                     */
/* ------------------------------------------------------------------ */

export interface GeneratePaperSectionSlot {
  slotId?: string;
  slotIndex: number;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  marks: number;
  topicFocus?: string;
  requiresInternalChoice?: boolean;
  curriculumPayload?: CurriculumGenerationPayload;
}

export interface GeneratePaperSectionInput {
  className: string;
  subject: string;
  sectionTitle: string;
  sectionType: string;
  sectionInstructions?: string | null;
  marksEach: number;
  language: PaperLanguage;
  difficulty: "BALANCED" | "EASY" | "MEDIUM" | "HARD";
  model?: string;
  teacherFocus?: string;
  generateDiagrams?: boolean;
  slots: GeneratePaperSectionSlot[];
  board?: string | null;
  schoolName?: string | null;
  blueprintName?: string | null;
  academicSession?: string | null;
  examType?: string | null;
  bookId?: string | null;
  subjectCode?: string | null;
  validBookChapterIds?: Set<string>;
  existingQuestionTexts?: string[];
  apiKey?: string | null;
}

export interface GeneratedPaperQuestion {
  slotId?: string;
  slotIndex: number;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  type: string;
  text: string;
  options: string[];
  subparts: Array<SubPart>;
  attemptCount?: number;
  answer: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  cognitiveLevel?: string;
  explanation?: string;
  figurePrompt?: string;
  imagePath?: string;
  diagramSource?: string;
  figureDoc?: {
    summary: string;
    canvasWidth: number;
    canvasHeight: number;
    objects: unknown[];
  };
  requiresInternalChoice?: boolean;
  orQuestion?: {
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    type: string;
    text: string;
    options: string[];
    subparts: Array<SubPart>;
    attemptCount?: number;
    answer: string;
    marks: number;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    cognitiveLevel?: string;
    explanation?: string;
  };
}

export async function generatePaperSectionWithGemini(
  params: GeneratePaperSectionInput,
): Promise<GeminiCallResult<GeneratedPaperQuestion[]>> {
  const {
    className,
    subject,
    sectionTitle,
    sectionType,
    sectionInstructions,
    marksEach,
    language,
    difficulty,
    model,
    teacherFocus,
    generateDiagrams,
    slots,
    board,
    schoolName,
    blueprintName,
    academicSession,
    examType,
    bookId,
    subjectCode,
    validBookChapterIds,
    existingQuestionTexts,
    apiKey,
  } = params;

  const normalizedType = normalizeQuestionType(sectionType);
  const contractRes = buildAndValidateGenerationContract({
    board,
    schoolName,
    blueprintName,
    className,
    academicSession,
    examType,
    bookId,
    subject,
    subjectCode,
    sectionTitle,
    sectionInstructions,
    questionType: normalizedType,
    marksEach,
    difficulty,
    language,
    requiredCount: normalizedType === "MATCH_COLUMN" ? 1 : slots?.length || 0,
    slots,
    validBookChapterIds,
  });

  if (!contractRes.valid || !contractRes.contract) {
    return {
      success: false,
      isMock: false,
      error: contractRes.errors.join(" "),
      data: [],
    };
  }

  const contract = contractRes.contract;
  const anySlotRequiresChoice = contract.slots.some((s) => s.requiresInternalChoice);
  const choiceForbidden = contract.internalChoiceRequirement.forbidden;

  const subjectDirectives = getSubjectPromptDirectives(
    contract.canonicalSubject,
    contract.className,
    language,
    (contract.subjectVariant as any) || "STANDARD",
  );

  // Check section and chapter visual eligibility
  const sectionEligible = isSectionVisuallyEligible(normalizedType, contract.rawSubject);
  const visualSlotIndices = slots
    .map((s, idx) => (isSubjectChapterVisual(contract.rawSubject, s.chapterTitle, normalizedType) ? idx : -1))
    .filter((idx) => idx !== -1);
  const effectiveGenerateDiagrams = Boolean(
    generateDiagrams && sectionEligible && visualSlotIndices.length > 0,
  );

  const systemPrompt = `You are an elite, senior board examiner, question paper setter, and ${contract.canonicalSubject} curriculum specialist for ${contract.boardDisplayName}.
Your objective is to generate rigorous, authentic, high-standard ${contract.canonicalSubject} examination questions for ${contract.className} (Session: ${contract.academicSession}, Syllabus: ${contract.syllabusVersion}, Subject Code: ${contract.subjectCode}).
${subjectDirectives.systemDirective}

STRICT CURRICULUM & DOMAIN INTEGRITY CONTRACT:
1. Every question, option, distractor, and model answer MUST strictly belong to ${contract.canonicalSubject} (${contract.className}) and the exact chapter assigned to its slot.
${contract.forbiddenCrossSubjectDomains.length > 0 ? `2. FORBIDDEN CROSS-SUBJECT DOMAINS (NEVER generate): ${contract.forbiddenCrossSubjectDomains.join("; ")}.` : "2. Never include content from unrelated subjects."}
3. Never use generic templates such as "Examine the fundamental principles of [Chapter]" or "Which of the following statements is correct regarding the core process in [Chapter]?".
4. For Multiple Choice Questions (MCQ): Provide exactly 4 distinct options. The 'answer' field MUST exactly match the text of the correct option.
5. For Assertion-Reason (ASSERTION_REASON): Provide Assertion (A) and Reason (R), and use the 4 standard options:
   - Both (A) and (R) are true and (R) is the correct explanation of (A).
   - Both (A) and (R) are true, but (R) is not the correct explanation of (A).
   - (A) is true, but (R) is false.
   - (A) is false, but (R) is true.
6. For Match the Columns (MATCH_COLUMN): Generate EXACTLY 1 combined question containing all matching pairs across the section slots. Clearly list Column I items in 'text' and Column II items in 'options', with correct pairings in 'answer'. For Sanskrit use "स्तम्भ 'अ'" / "स्तम्भ 'ब'". For Hindi use "स्तम्भ 'क'" / "स्तम्भ 'ख'".
7. For Case Study / Passage (CASE_STUDY, UNSEEN_PASSAGE, REFERENCE_CONTEXT): Provide a domain-authentic scenario/passage, followed by labeled subparts ((i), (ii), etc.) whose marks sum up exactly to ${marksEach}.
8. For subjective questions (VERY_SHORT, SHORT, LONG, NUMERICAL): Provide a detailed step-wise model answer and marking scheme breakdown.
9. LaTeX Math: Enclose all mathematical expressions, equations, symbols, and formulas in standard LaTeX $...$ delimiters.
10. Vector Diagram Prompt (Figure Studio): If diagram generation is enabled and a question naturally involves a visual diagram, provide a concise description in "figurePrompt". Otherwise leave "figurePrompt" as null.
11. INTERNAL CHOICE (अथवा / OR) POLICY (${contract.internalChoiceRequirement.patternVersion}):
   - ${contract.internalChoiceRequirement.rationale}
   - ${
     anySlotRequiresChoice
       ? `For EVERY question slot requiring internal choice, you MUST generate a complete "orQuestion" object from the EXACT SAME chapter, with equivalent marks (${marksEach}), equivalent difficulty, and a distinct subtopic/method/problem (NEVER a paraphrase of the primary question).`
       : choiceForbidden
       ? `Internal choice (OR / अथवा) is STRICTLY FORBIDDEN for this section. Do NOT generate "orQuestion" on any item.`
       : `Do not include "orQuestion" unless explicitly required by a slot.`
   }
12. QUESTION STEM & CLEAN FORMATTING RULES:
   - DO NOT prepend question numbers, Roman numerals, or letter bullets (like "1.", "(a)", "(i)", "(क)") to the "text" field. All question numbering is automatically formatted by the exam layout engine.
   - DO NOT append marks annotations (like "[1 Mark]", "[2 Marks]", "[1 अंक]", "[1 अङ्कः]") inside the "text" field. Marks are rendered dynamically in the right margin.
   - For FILL_BLANK: Write ONLY the statement with blank(s) indicated as "________" (at least 8 underscores). NEVER append meta-instructions like "इति रिक्तस्थानं पूरयत", "fill in the blanks", or "रिक्त स्थान भरिए" to the "text" field.
   - For TRUE_FALSE: Write ONLY a single declarative factual statement. NEVER append questions or prompt wrappers like "अयम् आशयः सत्यः अस्ति वा?", "सत्यं वा असत्यं", or "state whether true or false". The answer field MUST be "आम्" or "न" for Sanskrit, "सत्य" or "असत्य" for Hindi, "True" or "False" for English.
13. LANGUAGE PURITY & SANSKRIT ACADEMIC INTEGRITY:
   - When language is "sa" (Sanskrit), generate 100% authentic Sanskrit in Devanagari script. Follow Paninian grammar and NCERT Shemushi standards.
   - Suffix Precision (Pratyaya): Past active participles ending in '-वान् / -वती / -वत्' (e.g. पठितवान्, कृतवान्) MUST be matched or identified as 'क्तवतु-प्रत्ययः', NEVER as 'तप्रत्ययः' or 'क्त-प्रत्ययः'. Words ending in '-तः / -तम्' (e.g. पठितः) are 'क्त-प्रत्ययः'. Words ending in '-न्' (e.g. गच्छन्) are 'शतृ-प्रत्ययः'. Feminine ending in '-आ' (e.g. बालिका) is 'टाप्-प्रत्ययः'.
   - Interrogative Agreement: Strictly match the grammatical number of interrogatives with the target answer entity. Use 'कः' only for singular masculine; use dual 'कौ' for dual entities (e.g. 'कौ बालकौ', 'लवकुशौ'); use plural 'के' for plural entities. Dual masculine nouns must end in '-ौ' (e.g. 'द्वौ बालकौ', NEVER 'द्वौ बालको').
   - Anti-Calque Rule: NEVER use 'गच्छति' / 'ग्छति' as a passive voice auxiliary (e.g. NEVER generate 'प्रदत्तोग्छति' or 'प्रदत्तो गच्छति'). The authentic passive of 'to give' is 'प्रदीयते' or 'दीयते', or 'प्रदत्तः अस्ति'.
   - Textbook Accuracy: For Shemushi chapters, adhere strictly to authentic textbook dialogues. Never mix 1st person 'अहम्' with 2nd person verbs (like 'भुञ्जाथ'). Never fabricate corrupted words like 'कालिकाविधानाय' or 'एकचने'. For examination directives asking to describe, write 'वर्णयत' (describe), NEVER 'वर्जयत' (avoid).
   - Internal Choice Isolation: NEVER embed the word 'अथवा' or alternative questions inside the primary question's 'text' field. All alternative questions must strictly be placed in the separate 'orQuestion' object.
   - When language is "hi" (Hindi), generate 100% standard Hindi in Devanagari script. Never leak English words.
   - When language is "en" (English), generate 100% English.
14. SUBJECT VARIANT & COGNITIVE LEVEL DIRECTIVE:
   - Subject Variant: ${contract.subjectVariant || "STANDARD"}
   ${
     contract.subjectVariant === "BASIC"
       ? "- TARGET COGNITIVE LEVEL (BASIC / CODE 101): 50% Easy (Direct Recall / Single-Step Formula Substitution), 40% Average (Standard Textbook Applications), 10% Higher Order. Keep numbers clean, avoid multi-step algebraic manipulations, and focus on fundamental definitions. NEVER generate irrationality proofs (e.g. proof that √5 is irrational) or multi-concept synthesis."
       : "- TARGET COGNITIVE LEVEL (STANDARD / CODE 100): 30% Easy, 50% Average, 20% Higher Order (Multi-step Problem Solving, Geometric/Algebraic Proofs, In-depth Conceptual Analysis). 3-mark and 4-mark slots must NOT be trivial 1-step substitutions."
   }
15. STATUTORY RATIONALIZED SYLLABUS COMPLIANCE (NEGATIVE CONSTRAINT):
   - The Board has officially deleted and rationalized specific chapters and topics for the 2026–27 session.
   - VIOLATION PENALTY: Generating any question, option, distractor, scenario, or alternative (OR) question testing deleted topics is an examination security violation and will cause immediate rejection by deterministic quality gates.
16. STATUTORY INTERNAL CHOICE & WORD COUNT RUBRIC (Circular 465/2026):
   - 1-mark & 2-mark questions: Strictly NO internal choice. Target answer length: ~30 words for 2m.
   - 3-mark questions: 100% mandatory internal choice (Full OR alternative from same chapter). Target answer length: ~75 words.
   - 4-mark questions: 100% mandatory internal choice (Full OR alternative from same chapter). Target answer length: ~120 words.
   - 5-mark questions: 100% mandatory internal choice. Target answer length: ~150 words.
   - Rubric: For all subjective questions, model answers MUST provide a step-wise mark distribution totaling the exact slot marks.
17. Echo the stable "slotId" provided in each slot specification inside the returned JSON question object.
18. Return ONLY a valid JSON array of question objects. No markdown wrapping or conversational commentary.
19. SUBJECT-SPECIFIC ACADEMIC QUALITY DIRECTIVES (${subjectDirectives.subjectName}):
- Solvability & Numerical Solvability:
${subjectDirectives.solvabilityRules.map((r) => `  * ${r}`).join("\n")}
- Completeness & Clear Conditions:
${subjectDirectives.completenessRules.map((r) => `  * ${r}`).join("\n")}
- Marking Scheme Rubric: ${subjectDirectives.rubricDirective}`;

  const slotsDescription = contract.slots
    .map((s, idx) => {
      const origSlot = slots[idx];
      const slotId = s.slotId || origSlot?.slotId || `slot_${idx}`;
      const allowed = s.curriculumSpec.includedTopics.join("; ");
      const deleted =
        s.curriculumSpec.deletedTopics.length > 0
          ? ` | STATUTORY EXCLUDED/DELETED TOPICS (FORBIDDEN): ${s.curriculumSpec.deletedTopics.join("; ")}`
          : "";
      const choiceRule = s.requiresInternalChoice
        ? ` | Internal Choice: REQUIRED (Must include distinct "orQuestion" from same chapter "${s.chapterTitle}")`
        : choiceForbidden
        ? ` | Internal Choice: FORBIDDEN (No "orQuestion")`
        : "";
      const targetWords = s.marks === 2 ? 30 : s.marks === 3 ? 75 : s.marks === 4 ? 120 : 150;
      return `Question ${idx + 1} (Slot ${s.slotIndex}, slotId: "${slotId}"): Chapter ${s.chapterNumber} - "${s.chapterTitle}" (${s.marks} marks, target length: ~${targetWords} words) | Allowed Topics: ${allowed}${deleted}${choiceRule}${
        origSlot?.topicFocus ? ` | Topic Focus: ${origSlot.topicFocus}` : ""
      }`;
    })
    .join("\n");

  const isMatchSection = normalizedType === "MATCH_COLUMN";

  const baseUserPrompt = isMatchSection
    ? `Generate EXACTLY 1 combined Match the Columns question containing all ${slots.length} matching pairs for the following exam section:
- Board: ${contract.boardDisplayName} (${contract.academicSession})
- Class: ${className}
- Subject: ${contract.canonicalSubject} (Subject Code: ${contract.subjectCode})
- Section Title: ${sectionTitle}
- Section Question Type: MATCH_COLUMN
- Total Marks: ${slots.length * marksEach} (${slots.length} pairs × ${marksEach} mark each)
- Language: ${
        language === "sa"
          ? "Pure Sanskrit in authentic Devanagari script (संस्कृतम्). Follow NCERT/MPBSE Shemushi standards. Use proper sandhi, vibhakti, and Paninian grammar: 'पठितवान्' is 'क्तवतु-प्रत्ययः' (never 'तप्रत्ययः'), passive is 'प्रदीयते'/'दीयते' (never 'प्रदत्तोग्छति'), interrogatives must agree in number (use 'कौ' for dual entities like लवकुशौ). Dual masculine nouns end in '-ौ' (द्वौ बालकौ). Match columns must use 'स्तम्भ अ' / 'स्तम्भ ब'. Never output English column names or marks inside question text."
          : language === "hi"
          ? "Hindi in Devanagari script. Follow MP Board standards. Do NOT write in English. TRUE_FALSE answers must be 'सत्य' or 'असत्य'. Match columns must use 'स्तम्भ क' / 'स्तम्भ ख'. Never output English column names or marks inside question text."
          : language === "bilingual"
          ? "Bilingual (English with Hindi translation in parentheses)"
          : "English"
      }
- Instructions:
  1. Return a JSON array containing EXACTLY ONE question object.
  2. The 'text' field must contain the instruction prompt followed by the list of ${slots.length} Column I items labeled (A), (B), (C), etc., derived from the assigned ${contract.canonicalSubject} chapters. For Sanskrit use 'स्तम्भ अ' / 'स्तम्भ ब', for Hindi use 'स्तम्भ क' / 'स्तम्भ ख'.
  3. The 'options' array must contain the corresponding ${slots.length} Column II matching items/expressions.
  4. The 'answer' field must specify all correct pairings (e.g. '(A)-(ii), (B)-(i), (C)-(iv), (D)-(iii)').

Assigned Chapter Targets for each matching pair:
${slotsDescription}

JSON Array Output Schema:
[
  {
    "slotIndex": 0,
    "chapterNumber": ${slots[0]?.chapterNumber ?? 1},
    "chapterTitle": "${slots[0]?.chapterTitle ?? "Syllabus Topics"}",
    "type": "MATCH_COLUMN",
    "text": "Match the items in Column I with Column II:\\nColumn I:\\n(A) ...\\n(B) ...",
    "options": ["Item 1", "Item 2"],
    "subparts": [],
    "answer": "(A)-(ii), (B)-(i)",
    "difficulty": "MEDIUM",
    "cognitiveLevel": "UNDERSTANDING",
    "explanation": "Rationale for pairings"
  }
]`
    : `Generate ${slots.length} distinct, high-standard ${contract.canonicalSubject} question(s) for the following exam section:
- Board: ${contract.boardDisplayName} (${contract.academicSession})
- Class: ${className}
- Subject: ${contract.canonicalSubject} (Subject Code: ${contract.subjectCode})
- Section Title: ${sectionTitle}
- Section Question Type: ${normalizedType}
- Marks Per Question: ${marksEach}
- Internal Choice Policy (${contract.internalChoiceRequirement.patternVersion}): ${
        anySlotRequiresChoice
          ? `MANDATORY — Every slot requiring internal choice MUST include a complete "orQuestion" object from the SAME chapter assessing a different subtopic/formula/method.`
          : choiceForbidden
          ? `FORBIDDEN — Never include "orQuestion" in this section (${contract.internalChoiceRequirement.rationale}).`
          : `Not required.`
      }
- Language: ${
        language === "sa"
          ? "Pure Sanskrit in authentic Devanagari script (संस्कृतम्). Follow NCERT/MPBSE Shemushi standards. Use proper sandhi, vibhakti, and Paninian grammar: 'पठितवान्' is 'क्तवतु-प्रत्ययः' (never 'तप्रत्ययः'), passive is 'प्रदीयते'/'दीयते' (never 'प्रदत्तोग्छति'), interrogatives must agree in number (use 'कौ' for dual entities like लवकुशौ). Dual masculine nouns end in '-ौ' (द्वौ बालकौ). For directives use 'वर्णयत' (never 'वर्जयत'). Never embed 'अथवा' in primary question text. TRUE_FALSE answers must be 'आम्' or 'न'. Never append [1 Mark] or instructions like 'इति रिक्तस्थानं पूरयत' or 'अयम् आशयः सत्यः अस्ति वा?'."
          : language === "hi"
          ? "Hindi in Devanagari script. Follow MP Board standards. Do NOT write in English. TRUE_FALSE answers must be 'सत्य' or 'असत्य'. Never append [1 अंक] or instructions."
          : language === "bilingual"
          ? "Bilingual (English with Hindi translation in parentheses)"
          : "English"
      }
- Difficulty Policy: ${
        difficulty === "BALANCED"
          ? "Balanced mix: ~30% Easy, ~50% Medium, ~20% Hard"
          : difficulty
      }
${teacherFocus ? `- Teacher Specific Instructions / Focus: ${teacherFocus}` : ""}
- Diagram Generation: ${
        effectiveGenerateDiagrams
          ? "Enabled (strictly follow board standards: at most ONE question in the section may have a diagram; only if the question concept cannot be answered without visual input)"
          : "Disabled (this section is non-visual or contains no visual syllabus topics)"
      }

${
  effectiveGenerateDiagrams
    ? `CRITICAL DIAGRAM INSTRUCTIONS:
- Board examinations have very few diagrams (at most ONE in this entire section).
- ONLY provide 'figurePrompt' if the question concept CANNOT be answered without visual input.
- NEVER attach a diagram to a standard question that can be answered from text alone.
- If a question does not strictly require a diagram, 'figurePrompt' MUST BE null.`
    : `DIAGRAM INSTRUCTIONS:
- No diagrams should be included in this section. 'figurePrompt' MUST BE null for all questions.`
}

Assigned Chapter Targets for each question slot:
${slotsDescription}
${
  existingQuestionTexts && existingQuestionTexts.length > 0
    ? `\nALREADY-PLACED QUESTIONS IN THIS PAPER (STRICTLY FORBIDDEN TO REPEAT, REUSE, OR ASK THE SAME PROBLEM TEMPLATE):\n${existingQuestionTexts
        .slice(-40)
        .map((t, idx) => `${idx + 1}. ${t.replace(/\s+/g, " ").trim().slice(0, 200)}`)
        .join("\n")}\nCRITICAL: Every question you generate in this section MUST test a DIFFERENT topic/sub-concept or problem type than the questions listed above. Never repeat the same question or merely change numbers in an already-asked question.\n`
    : ""
}
SUBPARTS RULE:
${
  isSubpartQuestionType(normalizedType)
    ? `- Every ${normalizedType} item MUST include graded "subparts" whose marks sum to ${marksEach}.`
    : `- If a question comprises multiple distinct sentences, tasks, or sub-questions (e.g. 'Correct the following sentences', 'Solve (a) and (b)', grammar drills, translation items), you MUST output them in the "subparts" array with label, text, and marks. NEVER inline labels like (क), (ख) or (a), (b) into the main question text.
- If there is an internal choice across subparts (e.g. 'Answer any 4 of 5'), include all 5 in "subparts" (1 mark each) and specify "attemptCount": 4.
- If the question is a unified single narrative/essay without sub-items, set "subparts": [].`
}

JSON Array Output Schema:
[
  {
    "slotIndex": 0,
    "chapterNumber": 1,
    "chapterTitle": "Chapter Name",
    "type": "${normalizedType}",
    "text": "Question text...",
    "options": ${isMcqLikeType(normalizedType) ? '["A", "B", "C", "D"]' : "[]"},
    "subparts": ${
      isSubpartQuestionType(normalizedType)
        ? '[\n      { "label": "(i)", "text": "Subpart question", "marks": 1, "answer": "Model answer" }\n    ]'
        : '[] // or array of subparts if multi-component'
    },
    "attemptCount": 4, // only when question specifies internal choice among subparts (e.g. answer any 4 of 5)
    "answer": "Detailed model answer and marking scheme breakdown",
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "cognitiveLevel": "REMEMBERING" | "UNDERSTANDING" | "APPLYING" | "ANALYZING" | "EVALUATING",
    "explanation": "Brief explanation or concept rationale",
    "figurePrompt": "Concise description of diagram to draw"${
      anySlotRequiresChoice
        ? `,
    "orQuestion": {
      "chapterNumber": 1,
      "chapterTitle": "Chapter Name",
      "type": "${normalizedType}",
      "text": "Distinct alternative (OR / अथवा) question from the same chapter...",
      "options": ${isMcqLikeType(normalizedType) ? '["A", "B", "C", "D"]' : "[]"},
      "subparts": ${
        isSubpartQuestionType(normalizedType)
          ? '[\n        { "label": "(i)", "text": "Alternative subpart question", "marks": 1, "answer": "Model answer" }\n      ]'
          : '[] // or array of subparts if multi-component'
      },
      "attemptCount": 4, // only if OR question has internal subpart choice
      "answer": "Complete independent model answer and step-marking scheme for the OR question",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "cognitiveLevel": "APPLYING",
      "explanation": "Brief explanation for the alternative question"
    }`
        : ""
    }
  }
]`;

  const fallbackQuestions = (): GeneratedPaperQuestion[] => {
    const grounded = generateCurriculumGroundedSectionQuestions(contract, {
      generateDiagrams: effectiveGenerateDiagrams,
      existingQuestionTexts: existingQuestionTexts || [],
    });
    return grounded.map((g) => ({
      slotId: contract.slots[g.slotIndex]?.slotId || `slot_${g.slotIndex}`,
      slotIndex: g.slotIndex,
      chapterId: g.chapterId,
      chapterNumber: g.chapterNumber,
      chapterTitle: g.chapterTitle,
      type: g.type,
      text: g.text,
      options: g.options,
      subparts: g.subparts,
      answer: g.answer,
      difficulty: g.difficulty,
      cognitiveLevel: g.cognitiveLevel,
      explanation: g.explanation,
      figurePrompt: g.figurePrompt,
      requiresInternalChoice: g.requiresInternalChoice,
      orQuestion: g.orQuestion ? { ...g.orQuestion } : undefined,
    }));
  };

  const normalizeRawSectionData = async (
    rawArray: GeneratedPaperQuestion[],
  ): Promise<GeneratedPaperQuestion[]> => {
    if (normalizedType === "MATCH_COLUMN") {
      const primaryQ = rawArray[0] || ({} as GeneratedPaperQuestion);
      let qText = typeof primaryQ.text === "string" && primaryQ.text.trim() ? primaryQ.text.trim() : "";
      let qOptions = Array.isArray(primaryQ.options) ? primaryQ.options.map((o: unknown) => String(o).trim()) : [];
      let qAnswer = typeof primaryQ.answer === "string" ? primaryQ.answer : "";
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
      const romans = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];

      if (rawArray.length > 1) {
        const rawPairs = rawArray.map((item, idx) => {
          const itemText = typeof item.text === "string" ? item.text.replace(/^Match.*?:\s*/i, "").trim() : `Item ${idx + 1}`;
          const itemOpt =
            Array.isArray(item.options) && item.options.length > 0
              ? String(item.options[0]).trim()
              : item.answer || `Relation ${idx + 1}`;
          return {
            left: `(${letters[idx] ?? idx + 1}) ${itemText}`,
            right: itemOpt,
          };
        });

        const deranged = derangeMatchColumnPairs(rawPairs);
        const col1Items = rawPairs.map((p) => p.left);
        const col2Items = deranged.map((p) => p.right);
        const answers = rawPairs.map((p, idx) => {
          const optIdx = col2Items.indexOf(p.right);
          return `(${letters[idx] ?? idx + 1})-${romans[optIdx] ?? `(${optIdx + 1})`}`;
        });

        qText = `Match the items in Column I with Column II:\nColumn I:\n${col1Items.join("\n")}`;
        qOptions = col2Items;
        qAnswer = answers.join(", ");
      } else if (rawArray.length === 1) {
        let pairs = parseMatchColumnPairs(qOptions, qText, primaryQ.explanation);
        if (pairs.length === 0) {
          pairs = extractMatchPairsFromExplanation(primaryQ.explanation);
        }
        if (pairs.length === 0 && qText) {
          pairs = extractMatchPairsFromExplanation(qText);
        }

        if (pairs.length > 0) {
          if (pairs.length < contract.slots.length) {
            for (let idx = pairs.length; idx < contract.slots.length; idx++) {
              const s = contract.slots[idx];
              const cleanCh = cleanChapterTitleForLookup(s.chapterTitle);
              const samplePair = s.curriculumSpec.sampleMatchPairs[0] || {
                left: `${cleanCh}: ${s.curriculumSpec.includedTopics[0] || "Core relation"}`,
                right: s.curriculumSpec.keyFormulasOrConcepts[0] || `Verified formula in ${cleanCh}`,
              };
              pairs.push({
                left: `(${letters[idx] ?? idx + 1}) ${samplePair.left}`,
                right: samplePair.right,
              });
            }
          } else if (pairs.length > contract.slots.length) {
            pairs = pairs.slice(0, contract.slots.length);
          }

          const isDirectMatch =
            /^\s*\(?[Aa]\)?\s*[-→:]\s*\(?([1iI])\)?\s*,\s*\(?[Bb]\)?\s*[-→:]\s*\(?([2iI]{2})\)?/.test(qAnswer) ||
            !qAnswer ||
            qAnswer.toLowerCase().includes("direct");
          const deranged = isDirectMatch && pairs.length > 1 ? derangeMatchColumnPairs(pairs) : pairs;
          const col1Lines = pairs.map((p, idx) => `(${letters[idx] ?? idx + 1}) ${cleanMatchItem(p.left)}`);
          const col2Items = deranged.map((p) => cleanMatchItem(p.right));
          const answers = pairs.map((p, idx) => {
            const optIdx = col2Items.indexOf(cleanMatchItem(p.right));
            return `(${letters[idx] ?? idx + 1})-${romans[optIdx] ?? `(${optIdx + 1})`}`;
          });
          const instr = getMatchColumnInstruction(qText);
          qText = `${instr}\nColumn I:\n${col1Lines.join("\n")}`;
          qOptions = col2Items;
          qAnswer = answers.join(", ");
        }
      }

      const firstSlot = contract.slots[0];
      return [
        {
          slotIndex: firstSlot.slotIndex,
          chapterId: firstSlot.chapterId,
          chapterNumber: firstSlot.chapterNumber,
          chapterTitle: firstSlot.chapterTitle,
          type: "MATCH_COLUMN",
          text: qText,
          options: qOptions,
          subparts: [],
          answer: qAnswer,
          difficulty: ["EASY", "MEDIUM", "HARD"].includes(primaryQ.difficulty) ? primaryQ.difficulty : "MEDIUM",
          cognitiveLevel: primaryQ.cognitiveLevel || "UNDERSTANDING",
          explanation: primaryQ.explanation || `Curriculum matching exercise across ${contract.canonicalSubject} chapters.`,
          requiresInternalChoice: false,
        },
      ];
    }

    const normalizedQuestions: GeneratedPaperQuestion[] = [];
    let sectionDiagramCount = 0;

    for (let i = 0; i < contract.slots.length; i++) {
      const slot = contract.slots[i];
      const rawQ = rawArray[i] || ({} as GeneratedPaperQuestion);

      const qType = normalizeQuestionType(rawQ.type || normalizedType);
      const rawText = typeof rawQ.text === "string" ? rawQ.text.trim() : "";
      const qText = repairLatex(cleanQuestionStatement(rawText, qType));
      let qOptions = Array.isArray(rawQ.options)
        ? rawQ.options.map((o: unknown) => repairLatex(cleanOptionText(String(o).trim())))
        : [];
      if (qType === "TRUE_FALSE") {
        if (language === "sa") {
          qOptions = ["आम्", "न"];
        } else if (language === "hi") {
          qOptions = ["सत्य", "असत्य"];
        } else if (language === "bilingual") {
          qOptions = ["सत्य / True", "असत्य / False"];
        } else {
          qOptions = ["True", "False"];
        }
      }
      const targetSlotMarks = slot.marks || marksEach;
      let rawSubparts: SubPart[] =
        canHaveSubparts(qType) && Array.isArray(rawQ.subparts) && rawQ.subparts.length > 0
          ? rawQ.subparts.map((sp: any, spIdx: number) => ({
              label: String(sp.label || `(${spIdx + 1})`),
              text: repairLatex(cleanQuestionStatement(String(sp.text || ""))),
              marks: Number(sp.marks) || 1,
              options: Array.isArray(sp.options)
                ? sp.options.map((o: unknown) => repairLatex(cleanOptionText(String(o).trim())))
                : undefined,
              answer: sp.answer
                ? isMcqLikeType(qType)
                  ? repairLatex(cleanOptionText(String(sp.answer)))
                  : repairLatex(String(sp.answer))
                : undefined,
            }))
          : [];

      let attemptCount =
        typeof (rawQ as any).attemptCount === "number" && (rawQ as any).attemptCount > 0
          ? (rawQ as any).attemptCount
          : undefined;

      let effectiveQText = qText;
      if (rawSubparts.length === 0 && canHaveSubparts(qType)) {
        const decomp = decomposeStemSubparts(effectiveQText);
        if (decomp) {
          effectiveQText = decomp.stem;
          rawSubparts = decomp.subparts;
          if (decomp.attemptCount && !attemptCount) {
            attemptCount = decomp.attemptCount;
          }
        }
      }

      const qSubparts = rawSubparts.length > 0 ? normalizeSubpartMarks(rawSubparts, targetSlotMarks, attemptCount) : [];
      let qAnswer =
        typeof rawQ.answer === "string"
          ? isMcqLikeType(qType)
            ? repairLatex(cleanOptionText(rawQ.answer))
            : repairLatex(rawQ.answer)
          : "";
      if (qType === "TRUE_FALSE") {
        if (language === "sa") {
          if (/true|सत्य|आम्|सही/i.test(qAnswer)) qAnswer = "आम्";
          else if (/false|असत्य|न|गलत/i.test(qAnswer)) qAnswer = "न";
        } else if (language === "hi") {
          if (/true|सत्य|सही/i.test(qAnswer)) qAnswer = "सत्य";
          else if (/false|असत्य|गलत/i.test(qAnswer)) qAnswer = "असत्य";
        }
      }
      const qDiff = ["EASY", "MEDIUM", "HARD"].includes(rawQ.difficulty) ? rawQ.difficulty : "MEDIUM";
      const figurePrompt =
        typeof rawQ.figurePrompt === "string" && rawQ.figurePrompt.trim()
          ? rawQ.figurePrompt.trim()
          : undefined;

      // Normalize OR choice when allowed/required by slot
      const slotRequiresChoice = Boolean(!choiceForbidden && slot.requiresInternalChoice);
      let normalizedOrQuestion: GeneratedPaperQuestion["orQuestion"] = undefined;

      if (!choiceForbidden && rawQ.orQuestion && typeof rawQ.orQuestion.text === "string" && rawQ.orQuestion.text.trim()) {
        const orText = repairLatex(cleanQuestionStatement(rawQ.orQuestion.text.trim(), qType));
        let orOptions = Array.isArray(rawQ.orQuestion.options)
          ? rawQ.orQuestion.options.map((o: unknown) => repairLatex(cleanOptionText(String(o).trim())))
          : [];
        if (qType === "TRUE_FALSE") {
          orOptions = [...qOptions];
        }
        let rawOrSubparts: SubPart[] =
          canHaveSubparts(qType) && Array.isArray(rawQ.orQuestion.subparts) && rawQ.orQuestion.subparts.length > 0
            ? rawQ.orQuestion.subparts.map((sp: any, spIdx: number) => ({
                label: String(sp.label || `(${spIdx + 1})`),
                text: repairLatex(cleanQuestionStatement(String(sp.text || ""))),
                marks: Number(sp.marks) || 1,
                options: Array.isArray(sp.options)
                  ? sp.options.map((o: unknown) => repairLatex(cleanOptionText(String(o).trim())))
                  : undefined,
                answer: sp.answer
                  ? isMcqLikeType(qType)
                    ? repairLatex(cleanOptionText(String(sp.answer)))
                    : repairLatex(String(sp.answer))
                  : undefined,
              }))
            : [];
        let orAttemptCount =
          typeof (rawQ.orQuestion as any).attemptCount === "number" && (rawQ.orQuestion as any).attemptCount > 0
            ? (rawQ.orQuestion as any).attemptCount
            : undefined;

        let effectiveOrText = orText;
        if (rawOrSubparts.length === 0 && canHaveSubparts(qType)) {
          const decompOr = decomposeStemSubparts(effectiveOrText);
          if (decompOr) {
            effectiveOrText = decompOr.stem;
            rawOrSubparts = decompOr.subparts;
            if (decompOr.attemptCount && !orAttemptCount) {
              orAttemptCount = decompOr.attemptCount;
            }
          }
        }

        const orSubparts = rawOrSubparts.length > 0 ? normalizeSubpartMarks(rawOrSubparts, targetSlotMarks, orAttemptCount) : [];
        let orAnswer =
          typeof rawQ.orQuestion.answer === "string"
            ? isMcqLikeType(qType)
              ? repairLatex(cleanOptionText(rawQ.orQuestion.answer))
              : repairLatex(rawQ.orQuestion.answer)
            : "";
        if (qType === "TRUE_FALSE") {
          if (language === "sa") {
            if (/true|सत्य|आम्|सही/i.test(orAnswer)) orAnswer = "आम्";
            else if (/false|असत्य|न|गलत/i.test(orAnswer)) orAnswer = "न";
          } else if (language === "hi") {
            if (/true|सत्य|सही/i.test(orAnswer)) orAnswer = "सत्य";
            else if (/false|असत्य|गलत/i.test(orAnswer)) orAnswer = "असत्य";
          }
        }
        const orDiff = ["EASY", "MEDIUM", "HARD"].includes(rawQ.orQuestion.difficulty)
          ? rawQ.orQuestion.difficulty
          : qDiff;

        normalizedOrQuestion = {
          chapterId: slot.chapterId,
          chapterNumber: slot.chapterNumber,
          chapterTitle: slot.chapterTitle,
          type: qType,
          text: effectiveOrText,
          options: orOptions,
          subparts: orSubparts,
          attemptCount: orAttemptCount,
          answer: orAnswer,
          marks: targetSlotMarks,
          difficulty: orDiff as "EASY" | "MEDIUM" | "HARD",
          cognitiveLevel: rawQ.orQuestion.cognitiveLevel || rawQ.cognitiveLevel || "APPLYING",
          explanation: rawQ.orQuestion.explanation,
        };
      }

      const questionItem: GeneratedPaperQuestion = {
        slotId: rawQ.slotId || slot.slotId,
        slotIndex: slot.slotIndex,
        chapterId: slot.chapterId,
        chapterNumber: slot.chapterNumber,
        chapterTitle: slot.chapterTitle,
        type: qType,
        text: effectiveQText,
        options: qOptions,
        subparts: qSubparts,
        attemptCount,
        answer: qAnswer,
        difficulty: qDiff as "EASY" | "MEDIUM" | "HARD",
        cognitiveLevel: rawQ.cognitiveLevel || "APPLYING",
        explanation: rawQ.explanation,
        figurePrompt,
        requiresInternalChoice: slotRequiresChoice,
        orQuestion: normalizedOrQuestion,
      };

      const textLower = qText.toLowerCase();
      const explicitlyNeedsDiagram =
        textLower.includes("diagram") ||
        textLower.includes("figure") ||
        textLower.includes("shown below") ||
        textLower.includes("given below") ||
        textLower.includes("labeled part") ||
        textLower.includes("marked as") ||
        textLower.includes("refer to") ||
        textLower.includes("study the") ||
        textLower.includes("observe the") ||
        textLower.includes("visual stimulus") ||
        textLower.includes("visual input");

      const slotIsVisual = isSubjectChapterVisual(contract.rawSubject, slot.chapterTitle, normalizedType);
      const allowDiagram = Boolean(
        effectiveGenerateDiagrams &&
          figurePrompt &&
          slotIsVisual &&
          explicitlyNeedsDiagram &&
          sectionDiagramCount === 0,
      );

      if (!allowDiagram || !figurePrompt) {
        questionItem.figurePrompt = undefined;
        questionItem.imagePath = undefined;
        questionItem.figureDoc = undefined;
      } else {
        try {
          const eligibleCandidates =
            !lastIsMock && isGeminiConfigured(apiKey)
              ? await findEligibleDiagrams({
                  query: figurePrompt,
                  subject: contract.rawSubject,
                  chapter: slot.chapterTitle,
                  questionText: questionItem.text,
                })
              : [];

          const bestMatch = eligibleCandidates.find(
            (c) =>
              c.eligibility.eligible &&
              c.eligibility.status !== "OFF_TOPIC" &&
              c.eligibility.score >= 75,
          );

          if (bestMatch) {
            try {
              const savedName = await saveDiagramToUploads({
                svgContent: bestMatch.svgContent,
                downloadUrl: bestMatch.downloadUrl,
              });
              questionItem.imagePath = savedName;
              questionItem.diagramSource = bestMatch.source;
              sectionDiagramCount++;
            } catch (saveErr) {
              console.warn("Failed to save eligible online diagram to uploads:", saveErr);
            }
          }

          if (!questionItem.imagePath) {
            const figRes = await promptToFigureSceneWithGemini({
              prompt: figurePrompt,
              subject: contract.rawSubject,
              apiKey: lastIsMock ? null : apiKey,
            });
            if (figRes.success && figRes.data) {
              questionItem.figureDoc = {
                summary: figRes.data.summary,
                canvasWidth: figRes.data.canvasWidth || 640,
                canvasHeight: figRes.data.canvasHeight || 360,
                objects: normalizeFigureObjects(
                  figRes.data.objects,
                  figRes.data.canvasWidth,
                  figRes.data.canvasHeight,
                ),
              };
              sectionDiagramCount++;
            }
          }
        } catch (figErr) {
          console.warn("Figure generation error for question:", figErr);
        }
      }

      normalizedQuestions.push(questionItem);
    }

    return normalizedQuestions;
  };

  const MAX_VALIDATION_RETRIES = 2;
  let retryCount = 0;
  let activePrompt = baseUserPrompt;
  let lastValidationIssues: QuestionValidationIssue[] = [];
  let lastAccepted: GeneratedPaperQuestion[] = [];
  let lastNormalizedQuestions: GeneratedPaperQuestion[] = [];
  let lastIsMock = false;
  let lastModelUsed = model || "gemini-2.5-pro";

  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    const callResult = await callGeminiApi<GeneratedPaperQuestion[]>(activePrompt, systemPrompt, {
      json: true,
      apiKey,
      model: model || "gemini-2.5-pro",
      mockFallback: fallbackQuestions,
      allowFallbackOnApiFailure: true,
    });

    lastIsMock = callResult.isMock;
    lastModelUsed = callResult.modelUsed || lastModelUsed;

    if (!callResult.success || !Array.isArray(callResult.data)) {
      const trace = createGenerationJobTrace({
        contract,
        modelUsed: lastModelUsed,
        isOfflineCurriculumMode: callResult.isMock,
        retryCount: attempt,
        acceptedCount: 0,
        rejectedCount: contract.slots.length,
        validationIssues: lastValidationIssues,
      });
      return {
        success: false,
        isMock: callResult.isMock,
        error: callResult.error || "Failed to generate valid question array from AI model.",
        data: [],
        trace,
        contract,
      };
    }

    let normalizedQuestions = await normalizeRawSectionData(callResult.data);

    // Multi-stage surgical question-level verification & repair
    for (let i = 0; i < normalizedQuestions.length; i++) {
      const q = normalizedQuestions[i];
      const vRes = verifyQuestionAcademicQuality(q as any, contract, {
        slotIndex: i,
        existingQuestionTexts,
      });
      if (vRes.status === "FAIL") {
        const repRes = await repairOrRegenerateQuestion(q as any, contract, {
          slotIndex: i,
          maxRetries: 1,
        });
        if (repRes.success) {
          normalizedQuestions[i] = {
            ...q,
            text: repRes.question.text,
            options: repRes.question.options || q.options,
            subparts: repRes.question.subparts || q.subparts,
            answer: repRes.question.answer || q.answer,
            orQuestion: (repRes.question.orQuestion as any) ?? q.orQuestion,
          };
        }
      }
    }

    let validation = validateGeneratedSection(
      normalizedQuestions,
      contract,
      existingQuestionTexts || [],
    );

    // If on the final attempt (or mock fallback) some slots only failed because of missing/invalid orQuestion,
    // backfill the missing/invalid orQuestion from the curriculum-grounded generator and re-validate.
    if (
      !validation.valid &&
      (callResult.isMock || attempt === MAX_VALIDATION_RETRIES) &&
      anySlotRequiresChoice
    ) {
      const groundedFallbacks = generateCurriculumGroundedSectionQuestions(contract, {
        generateDiagrams: false,
        existingQuestionTexts: [
          ...(existingQuestionTexts || []),
          ...normalizedQuestions.map((q) => q.text),
        ],
      });
      normalizedQuestions = normalizedQuestions.map((q, idx) => {
        const slot = contract.slots[idx];
        if (!slot?.requiresInternalChoice || choiceForbidden) return q;
        const slotHasOrIssue = validation.issues.some(
          (iss) =>
            iss.slotIndex === slot.slotIndex &&
            (iss.code === "MISSING_INTERNAL_CHOICE" || iss.code === "INVALID_INTERNAL_CHOICE"),
        );
        if (!q.orQuestion || slotHasOrIssue) {
          const fb = groundedFallbacks[idx];
          if (fb?.orQuestion && !isParaphraseOrDuplicateChoice(q.text, fb.orQuestion.text)) {
            return { ...q, requiresInternalChoice: true, orQuestion: { ...fb.orQuestion } };
          }
          if (fb && !isParaphraseOrDuplicateChoice(q.text, fb.text)) {
            return {
              ...q,
              requiresInternalChoice: true,
              orQuestion: {
                chapterId: slot.chapterId,
                chapterNumber: slot.chapterNumber,
                chapterTitle: slot.chapterTitle,
                type: q.type,
                text: fb.text,
                options: fb.options,
                subparts: fb.subparts,
                answer: fb.answer,
                marks: slot.marks || marksEach,
                difficulty: fb.difficulty,
                cognitiveLevel: fb.cognitiveLevel,
                explanation: fb.explanation,
              },
            };
          }
        }
        return q;
      });
      validation = validateGeneratedSection(
        normalizedQuestions,
        contract,
        existingQuestionTexts || [],
      );
    }

    lastValidationIssues = validation.issues;
    lastAccepted = validation.acceptedQuestions as GeneratedPaperQuestion[];
    lastNormalizedQuestions = normalizedQuestions;

    if (validation.valid) {
      const trace = createGenerationJobTrace({
        contract,
        modelUsed: lastModelUsed,
        isOfflineCurriculumMode: callResult.isMock,
        retryCount: attempt,
        acceptedCount: normalizedQuestions.length,
        rejectedCount: 0,
        validationIssues: validation.issues,
      });
      return {
        success: true,
        isMock: callResult.isMock,
        modelUsed: lastModelUsed,
        data: normalizedQuestions,
        trace,
        contract,
        validationIssues: validation.issues,
      };
    }

    // If offline mode failed validation or max retries reached, stop retrying
    if (callResult.isMock || attempt === MAX_VALIDATION_RETRIES) {
      retryCount = attempt;
      break;
    }

    retryCount = attempt + 1;
    const errorFeedback = validation.issues.map((iss) => `- ${iss.message}`).join("\n");
    activePrompt = `${baseUserPrompt}\n\nCRITICAL VALIDATION CORRECTION (Retry #${retryCount}):\nYour previous output was rejected by the Subject & Curriculum Quality Gate for the following reasons:\n${errorFeedback}\nRegenerate the complete JSON array ensuring every question strictly passes all ${contract.canonicalSubject} curriculum and format checks.`;
  }

  // If validation is still not passing after all retries, patch failing slots with guaranteed curriculum-grounded questions
  if (lastValidationIssues.length > 0) {
    const fallbackPool = fallbackQuestions();
    if (fallbackPool && fallbackPool.length > 0) {
      const invalidSlotIndices = new Set(
        lastValidationIssues
          .map((iss) => iss.slotIndex)
          .filter((idx): idx is number => typeof idx === "number"),
      );
      const patchedQuestions = contract.slots.map((slot, idx) => {
        if (invalidSlotIndices.has(slot.slotIndex) || !lastNormalizedQuestions[idx]) {
          return (fallbackPool[idx] || lastNormalizedQuestions[idx]) as GeneratedPaperQuestion;
        }
        return lastNormalizedQuestions[idx];
      });
      const patchedValidation = validateGeneratedSection(
        patchedQuestions,
        contract,
        existingQuestionTexts || [],
      );
      if (patchedValidation.valid) {
        const trace = createGenerationJobTrace({
          contract,
          modelUsed: lastModelUsed,
          isOfflineCurriculumMode: true,
          retryCount,
          acceptedCount: patchedQuestions.length,
          rejectedCount: 0,
          validationIssues: [],
        });
        return {
          success: true,
          isMock: true,
          modelUsed: lastModelUsed,
          data: patchedQuestions,
          trace,
          contract,
          validationIssues: [],
        };
      }
    }
  }

  const trace = createGenerationJobTrace({
    contract,
    modelUsed: lastModelUsed,
    isOfflineCurriculumMode: lastIsMock,
    retryCount,
    acceptedCount: lastAccepted.length,
    rejectedCount: contract.slots.length - lastAccepted.length,
    validationIssues: lastValidationIssues,
  });

  return {
    success: false,
    isMock: lastIsMock,
    modelUsed: lastModelUsed,
    error: `Section generation failed subject/curriculum validation after ${retryCount + 1} attempt(s): ${lastValidationIssues.map((i) => i.message).join("; ")}`,
    data: lastAccepted,
    trace,
    contract,
    validationIssues: lastValidationIssues,
  };
}

/* ------------------------------------------------------------------ */
/* 2. Question Rewriter & Polish AI                                    */
/* ------------------------------------------------------------------ */

export interface QuestionImproveResult {
  improvedText: string;
  improvedOptions: string[];
  improvedAnswer: string;
  stepMarkingScheme?: string;
  bilingualDevanagari?: string;
  critique: string[];
}

export async function improveQuestionWithGemini(params: {
  questionText: string;
  options: string[];
  answer: string;
  type: string;
  task: "refine_cbse" | "generate_distractors" | "bilingual_hindi" | "step_marking_scheme" | "fix_ambiguity";
  apiKey?: string | null;
}): Promise<GeminiCallResult<QuestionImproveResult>> {
  const { questionText, options, answer, type, task, apiKey } = params;
  const isKdg = isKindergartenType(type);

  const systemPrompt = isKdg
    ? `You are an expert Early Childhood & Kindergarten (ECCE / Pre-Primary) Curriculum Specialist for Nursery, LKG, and UKG.
Evaluate the given preschool workbook activity instruction and improve it so it is warm, clear, age-appropriate, encouraging, and bilingual (English + simple Hindi).`
    : `You are a senior CBSE Paper Setter and Moderator.
Evaluate the given question and improve it strictly according to CBSE board standards, LaTeX math formatting, and grammatical precision.`;

  const taskDescription = isKdg
    ? {
        refine_cbse: "Refine language into clear, encouraging, child-friendly activity instructions for Nursery/KG students.",
        generate_distractors: "Refine activity items and options to be distinct and child-friendly.",
        bilingual_hindi: "Add simple Hindi instructions (e.g. चित्र देखकर सही अक्षर से मिलाइए / सुंदर अक्षरों में लिखिए) alongside English.",
        step_marking_scheme: "Structure a simple teacher assessment guide with star rating and smiley evaluation.",
        fix_ambiguity: "Ensure the visual task instruction is clear, unambiguous, and easy for 3-5 year olds to follow with teacher help.",
      }[task]
    : {
        refine_cbse: "Refine language to formal, rigorous CBSE Board Examination phrasing. Remove ambiguity, ensure accurate scientific units, and format equations in LaTeX $...$.",
        generate_distractors: "Generate 4 plausible, high-quality MCQ options (one correct, three distractors based on genuine student conceptual mistakes).",
        bilingual_hindi: "Add accurate Hindi (Devanagari script) translation in parentheses alongside the English text and options, using official NCERT vocabulary.",
        step_marking_scheme: "Structure a detailed step-wise marking scheme breakdown (e.g. formula [½m], substitution [1m], final unit [½m]).",
        fix_ambiguity: "Identify any vagueness, missing given values, or multiple valid interpretations, and fix them cleanly.",
      }[task];

  const qText = questionText || "";
  const opts = options || [];
  const ans = answer || "";

  const userPrompt = `Task: ${taskDescription}

Input Question:
Type: ${type}
Question Text: ${qText}
Existing Options: ${JSON.stringify(opts)}
Existing Answer: ${ans}

Return a JSON object strictly matching this TypeScript structure:
{
  "improvedText": "Refined question text",
  "improvedOptions": ["Option A", "Option B", "Option C", "Option D"],
  "improvedAnswer": "Refined model answer with marking guide",
  "stepMarkingScheme": "Step by step mark allocation breakdown",
  "bilingualDevanagari": "Devanagari translation string",
  "critique": ["List of specific improvements made to the question"]
}`;

  const mockFallback = (): QuestionImproveResult => {
    if (isKdg) {
      if (task === "bilingual_hindi") {
        const hindiSuffix =
          type === "KDG_TRACE_WRITE"
            ? "चार-लाइन पर सुंदर अक्षर लिखिए"
            : type === "KDG_NUMBER_GRID"
            ? "खाली स्थानों में सही संख्या भरिए"
            : type === "KDG_PICTURE_MATCH"
            ? "चित्र पहचानकर सही अक्षर से मिलाइए"
            : type === "KDG_COUNT_ITEMS"
            ? "वस्तुएं गिनिए और डिब्बे में संख्या लिखिए"
            : type === "KDG_CIRCLE_TARGET"
            ? "भिन्न चित्र पर गोला लगाइए"
            : "छूटे हुए अक्षर अथवा संख्याएँ भरिए";
        return {
          improvedText: `${qText.trim()} (${hindiSuffix})`,
          improvedOptions: opts,
          improvedAnswer: ans || "Activity verified for preschool level",
          bilingualDevanagari: hindiSuffix,
          critique: ["Added clear Devanagari preschool activity instruction for bilingual kindergarten workbook."],
        };
      }
      return {
        improvedText: qText.endsWith(":") || qText.endsWith(".") ? qText : `${qText}:`,
        improvedOptions: opts,
        improvedAnswer: ans || "Full marks for neat tracing, matching, or counting.",
        stepMarkingScheme: "Total: 5 Marks (1 Mark each for neatness and accuracy)",
        critique: [
          "Preschool activity phrasing polished to age-appropriate ECCE kindergarten standards.",
          "Clear, gentle instruction designed for Nursery / LKG / UKG workbook sheets.",
        ],
      };
    }

    if (task === "bilingual_hindi") {
      return {
        improvedText: `${qText.trim()} (${qText.trim()} - हिंदी अनुवाद)`,
        improvedOptions: opts.map((opt) => `${opt} (${opt})`),
        improvedAnswer: ans,
        bilingualDevanagari: "सटीक हिंदी अनुवाद जोड़ा गया है।",
        critique: ["Appended official NCERT Devanagari translation for bilingual board layout."],
      };
    }
    if (task === "generate_distractors") {
      return {
        improvedText: qText,
        improvedOptions: [
          ans || "Correct Option A",
          "Common Misconception B (Inverted ratio)",
          "Sign Error Variant C (Opposite polarity)",
          "Formula Confusion D (Neglecting exponent)",
        ],
        improvedAnswer: ans || "Correct Option A",
        critique: ["Generated 3 pedagogically calibrated distractors reflecting student sign and ratio errors."],
      };
    }
    return {
      improvedText: qText.endsWith("?") ? qText : `${qText}?`,
      improvedOptions: opts.length ? opts : ["A", "B", "C", "D"],
      improvedAnswer: `Step 1: Formula definition [1 Mark]\nStep 2: Substitution of given values [1 Mark]\nStep 3: Final result with appropriate SI unit [1 Mark]`,
      stepMarkingScheme: "Total: 3 Marks (1m formula, 1m substitution, 1m result)",
      critique: [
        "Enhanced scientific terminology to match CBSE Board specifications.",
        "Formatted mathematical notation into standard KaTeX syntax.",
        "Added explicit step-wise marking rubric for uniform teacher evaluation.",
      ],
    };
  };

  return callGeminiApi<QuestionImproveResult>(userPrompt, systemPrompt, {
    json: true,
    apiKey,
    mockFallback,
  });
}

/* ------------------------------------------------------------------ */
/* 3. Exam Paper Auditor & Bloom's Taxonomy Checker                   */
/* ------------------------------------------------------------------ */

export interface PaperAuditReport {
  paperTitle: string;
  totalQuestions: number;
  totalMarks: number;
  cognitiveBalance: {
    rememberingPct: number;
    understandingPct: number;
    applyingPct: number;
    analyzingHotsPct: number;
    cbseBenchmark: {
      remembering: string;
      understanding: string;
      applying: string;
      analyzingHots: string;
    };
    rating: "EXCELLENT" | "BALANCED" | "NEEDS_ADJUSTMENT";
    summary: string;
  };
  issues: Array<{
    questionId?: string;
    questionNumber: number;
    sectionTitle: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    type: "FLAWED_MCQ" | "AMBIGUITY" | "CALCULATION_MISMATCH" | "SYLLABUS_OUTLIER" | "DIFFICULTY_IMBALANCE" | "BLUEPRINT_MISMATCH";
    description: string;
    suggestedFix: string;
    fixedText?: string;
    fixedOptions?: string[];
    canReconcileBlueprint?: boolean;
  }>;
  overallVerdict: string;
}

export async function auditPaperWithGemini(params: {
  paperTitle: string;
  className: string;
  subject: string;
  totalMarks: number;
  questions: Array<{
    id: string;
    number: number;
    sectionTitle: string;
    type: string;
    text: string;
    options: string[];
    answer: string;
    marks: number;
    difficulty: string;
  }>;
  apiKey?: string | null;
}): Promise<GeminiCallResult<PaperAuditReport>> {
  const auditReport = await auditPaperEvidenceBased(params);
  return {
    success: true,
    isMock: false,
    modelUsed: "evidence-audit-engine",
    data: auditReport as unknown as PaperAuditReport,
  };
}

/* ------------------------------------------------------------------ */
/* 4. Natural Language to Figure Studio Prompt Converter               */
/* ------------------------------------------------------------------ */

export interface FigureStudioPromptResult {
  prompt: string;
  summary: string;
  canvasWidth: number;
  canvasHeight: number;
  objects: unknown[];
}

/**
 * Normalizes, validates, and de-conflicts raw scene objects from AI or fallback.
 * - Flattens nested box properties (x, y, w, h, rot)
 * - Maps stampId / synonyms to standard Figure Studio STAMP_REGISTRY keys
 * - Automatically pushes vertex and point labels OUTWARD from polygon centroids to eliminate label overlap
 */
export function normalizeFigureObjects(
  rawObjects: unknown[],
  canvasWidth = 640,
  canvasHeight = 360,
): Array<Record<string, unknown>> {
  if (!Array.isArray(rawObjects)) return [];

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  // 1. Pass: Flatten structures & normalize types
  const normalized = rawObjects
    .map((item: any, idx: number) => {
      if (!item || typeof item !== "object") return null;

      const id = String(item.id || `ai_obj_${Date.now()}_${idx}`);
      const type = String(item.type || "shape");
      const style = {
        stroke: item.style?.stroke || "#0f172a",
        width: Number(item.style?.width ?? 2),
        dash: item.style?.dash || "solid",
        fill: item.style?.fill ?? null,
        hatch: item.style?.hatch || "none",
        opacity: Number(item.style?.opacity ?? 1),
      };

      // Flatten box if nested
      const x = Number(item.x ?? item.box?.x ?? cx - 30);
      const y = Number(item.y ?? item.box?.y ?? cy - 20);
      const w = Math.max(10, Number(item.w ?? item.box?.w ?? 60));
      const h = Math.max(10, Number(item.h ?? item.box?.h ?? 40));
      const rot = Number(item.rot ?? item.box?.rot ?? 0);

      if (type === "stamp") {
        let rawStamp = String(
          item.stamp || item.stampId || item.stamp_id || item.symbol || "",
        )
          .toLowerCase()
          .trim();

        // Map circuit, biology, and science synonyms to valid STAMP_REGISTRY keys
        if (rawStamp === "plant_cell" || rawStamp.includes("plant_cell") || (rawStamp.includes("plant") && rawStamp.includes("cell"))) rawStamp = "plant_cell";
        else if (rawStamp === "animal_cell" || rawStamp.includes("animal_cell") || (rawStamp.includes("animal") && rawStamp.includes("cell"))) rawStamp = "animal_cell";
        else if (rawStamp === "neuron" || rawStamp.includes("neuron") || rawStamp.includes("nerve")) rawStamp = "neuron";
        else if (rawStamp.includes("ohm") || rawStamp === "resistor" || rawStamp === "resistance") rawStamp = "resistor";
        else if (rawStamp.includes("batt") || rawStamp === "dc_cell" || rawStamp === "cell" || rawStamp === "electric_cell") rawStamp = "battery";
        else if (rawStamp.includes("volt") || rawStamp === "v") rawStamp = "voltmeter";
        else if (rawStamp.includes("ammet") || rawStamp === "a") rawStamp = "ammeter";
        else if (rawStamp.includes("rheo") || rawStamp.includes("variable")) rawStamp = "rheostat";
        else if (rawStamp.includes("switch_c") || rawStamp.includes("closed") || rawStamp.includes("key_c") || rawStamp === "plug_key") rawStamp = "switch_closed";
        else if (rawStamp.includes("switch_o") || rawStamp.includes("open") || rawStamp.includes("key_o")) rawStamp = "switch_open";
        else if (rawStamp.includes("lamp") || rawStamp.includes("bulb")) rawStamp = "bulb";
        else if (rawStamp.includes("galv") || rawStamp === "g") rawStamp = "galvanometer";
        else if (rawStamp.includes("capaci")) rawStamp = "capacitor";
        else if (rawStamp.includes("ground") || rawStamp.includes("earth")) rawStamp = "ground";
        else if (rawStamp.includes("fuse")) rawStamp = "fuse";
        else if (rawStamp.includes("prism")) rawStamp = "prism";
        else if (rawStamp.includes("lens_conv") || rawStamp === "convex_lens") rawStamp = "lens_convex";
        else if (rawStamp.includes("lens_conc") || rawStamp === "concave_lens") rawStamp = "lens_concave";
        else if (rawStamp.includes("beaker")) rawStamp = "beaker";
        else if (rawStamp.includes("flask")) rawStamp = "flask";
        else if (rawStamp.includes("test_tube")) rawStamp = "test_tube";
        else if (rawStamp.includes("cuboid")) rawStamp = "cuboid";
        else if (rawStamp.includes("cube")) rawStamp = "cube";
        else if (rawStamp.includes("cylinder")) rawStamp = "cylinder";

        return {
          id,
          type: "stamp",
          stamp: rawStamp || "resistor",
          x,
          y,
          w: rawStamp === "resistor" || rawStamp === "rheostat" ? Math.max(w, 70) : w,
          h,
          rot,
          style,
        };
      }

      if (type === "line") {
        const rawPts = Array.isArray(item.pts) ? item.pts : [];
        const pts = rawPts.map((p: any) => ({
          x: Number(p.x ?? cx),
          y: Number(p.y ?? cy),
        }));
        if (pts.length < 2) return null;

        return {
          id,
          type: "line",
          kind: item.kind || (pts.length > 2 ? "polyline" : "line"),
          pts,
          start: item.start || "none",
          end: item.end || "none",
          ticks: Number(item.ticks || 0),
          parallels: Number(item.parallels || 0),
          label: item.label || "",
          labelSize: Number(item.labelSize ?? item.label_size ?? 13),
          labelOffset: Number(item.labelOffset ?? item.label_offset ?? 18),
          style,
        };
      }

      if (type === "angle") {
        const v = item.v ? { x: Number(item.v.x), y: Number(item.v.y) } : { x: cx, y: cy };
        const a = item.a ? { x: Number(item.a.x), y: Number(item.a.y) } : { x: cx - 40, y: cy };
        const b = item.b ? { x: Number(item.b.x), y: Number(item.b.y) } : { x: cx, y: cy - 40 };

        return {
          id,
          type: "angle",
          v,
          a,
          b,
          labelMode: item.labelMode || (item.label ? "custom" : item.rightMark ? "none" : "auto"),
          label: item.label || (item.rightMark ? "" : "θ"),
          fontSize: Number(item.fontSize || 13),
          rightMark: Boolean(item.rightMark),
          arcs: Number(item.arcs || 1),
          arcR: Number(item.arcR || (item.rightMark ? 20 : 26)),
          reflex: Boolean(item.reflex),
          decimals: Number(item.decimals || 0),
          fillSector: Boolean(item.fillSector),
          armArrow: item.armArrow || "none",
          armTicks: Number(item.armTicks || 0),
          style,
        };
      }

      if (type === "point") {
        return {
          id,
          type: "point",
          x: Number(item.x ?? cx),
          y: Number(item.y ?? cy),
          label: item.label || "",
          lx: Number(item.lx ?? -16),
          ly: Number(item.ly ?? -16),
          size: Number(item.size || 3),
          mode: item.mode || "dot",
          fontSize: Number(item.fontSize || 14),
          style,
        };
      }

      if (type === "text") {
        return {
          id,
          type: "text",
          text: item.text || item.label || "",
          x,
          y,
          w: Math.max(w, 80),
          h: Math.max(h, 22),
          rot,
          font: item.font || "sans",
          size: Number(item.size || item.fontSize || 12),
          bold: Boolean(item.bold),
          italic: Boolean(item.italic),
          underline: Boolean(item.underline),
          align: item.align || "center",
          bg: item.bg || "white",
          border: Boolean(item.border),
          style,
        };
      }

      if (type === "shape") {
        return {
          id,
          type: "shape",
          kind: item.kind || "rect",
          x,
          y,
          w,
          h,
          rot,
          sides: Number(item.sides || 3),
          a0: Number(item.a0 || 0),
          a1: Number(item.a1 || 360),
          radius: Number(item.radius || 0),
          inner: Number(item.inner || 0.5),
          style,
        };
      }

      return null;
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  // 2. Intelligent Auto-Deconfliction:
  // If points are geometric vertices (e.g. A, B, C), calculate centroid and orient lx, ly strictly outwards
  const points = normalized.filter((o) => o.type === "point");
  if (points.length >= 2) {
    const avgX = points.reduce((sum, p) => sum + (p.x as number), 0) / points.length;
    const avgY = points.reduce((sum, p) => sum + (p.y as number), 0) / points.length;

    points.forEach((p) => {
      const dx = (p.x as number) - avgX;
      const dy = (p.y as number) - avgY;
      const len = Math.hypot(dx, dy) || 1;
      // Push label 18px outward along radial line away from shape interior
      p.lx = Math.round((dx / len) * 18);
      p.ly = Math.round((dy / len) * 18);
    });
  }

  return normalized;
}

export async function promptToFigureSceneWithGemini(params: {
  prompt: string;
  subject?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  apiKey?: string | null;
}): Promise<GeminiCallResult<FigureStudioPromptResult>> {
  const { prompt, subject, canvasWidth = 640, canvasHeight = 360, apiKey } = params;

  const systemPrompt = `You are a professional physics, mathematics, and science diagram engine for an interactive vector studio.
Translate the user's natural language request into a valid JSON array of 2D canvas vector scene objects.
Canvas coordinates: (0,0) is top-left, x increases right, y increases down. Canvas dimensions: ${canvasWidth}x${canvasHeight}. Center is approx (${canvasWidth / 2}, ${canvasHeight / 2}).

CRITICAL OBJECT SCHEMA RULES:
1. Stamp (Physical components & symbols):
   { "type": "stamp", "stamp": "resistor"|"battery"|"ammeter"|"voltmeter"|"rheostat"|"switch_closed"|"switch_open"|"bulb"|"galvanometer"|"plant_cell"|"animal_cell"|"neuron", "x": x, "y": y, "w": w, "h": h, "rot": 0, "style": { "stroke": "#0f172a", "width": 2 } }
   * NEVER wrap in a "box" property. Use top-level x, y, w, h, rot.
   * NEVER use "stampId". Use "stamp".

2. Line (Wires, dimensions, rays, leader lines):
   { "type": "line", "kind": "line"|"polyline"|"dimension", "pts": [{"x": x1, "y": y1}, {"x": x2, "y": y2}], "start": "none"|"filled", "end": "none"|"filled", "label": "label text", "labelOffset": 20, "labelSize": 13, "style": { "stroke": "#0f172a", "width": 2 } }

3. Point (Vertices, nodes):
   { "type": "point", "x": x, "y": y, "label": "A", "lx": -16, "ly": -16, "size": 3, "mode": "dot", "fontSize": 14, "style": { "stroke": "#0f172a", "width": 2 } }

4. Angle (Angle arcs & right-angle marks):
   { "type": "angle", "v": {"x": vx, "y": vy}, "a": {"x": ax, "y": ay}, "b": {"x": bx, "y": by}, "label": "θ", "labelMode": "custom", "rightMark": boolean, "arcR": 26, "fontSize": 14, "style": { "stroke": "#0f172a", "width": 2 } }

5. Text (Labels, headings, value annotations):
   { "type": "text", "text": "Label", "x": x, "y": y, "w": 90, "h": 22, "rot": 0, "size": 12, "bold": false, "align": "center", "bg": "white", "style": { "stroke": "#0f172a", "width": 2 } }

CRITICAL ANTI-OVERLAP & DISCIPLINE RULES:
- FOR BIOLOGY: NEVER output circuit components ("resistor", "battery", "ammeter", "voltmeter"). Use biology stamps ("plant_cell", "animal_cell", "neuron"), Punnett square grids (rects with gametes and genotypes), or trophic pyramids. Leader lines pointing to parts ((A), (B), (C), (D)) must have callout text placed outside the boundary with zero overlap!
- FOR CIRCUITS (Physics only): ALWAYS output actual component stamps ("resistor", "voltmeter", "ammeter", "rheostat", "battery", "switch_closed"). Do NOT draw a circuit with only lines! Connect components with rectangular wire lines ending exactly at the component terminals.
- Place text labels in clear space at least 15-20px away from shapes. Set "bg": "white" on text objects.
- FOR GEOMETRY: Point labels (A, B, C) MUST be placed on the EXTERIOR of the shape using lx/ly.`;

  const userPrompt = `Generate the 2D vector drawing scene for:
"${prompt}"

Return a JSON object strictly matching:
{
  "prompt": "${prompt}",
  "summary": "Brief explanation of elements drawn",
  "canvasWidth": ${canvasWidth},
  "canvasHeight": ${canvasHeight},
  "objects": [ ...scene objects... ]
}`;

  const mockFallback = (): FigureStudioPromptResult => {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const lower = prompt.toLowerCase();
    const isBio = Boolean(subject?.toLowerCase().includes("bio"));

    // 0a. Biology: Punnett Square / Genetic Cross
    if (
      lower.includes("punnett") ||
      lower.includes("cross") ||
      lower.includes("genotype") ||
      lower.includes("phenotype") ||
      lower.includes("allele") ||
      lower.includes("mendel") ||
      lower.includes("monohybrid") ||
      lower.includes("dihybrid") ||
      lower.includes("f1") ||
      lower.includes("f2")
    ) {
      const startX = cx - 90;
      const startY = cy - 65;
      const cellSize = 80;

      return {
        prompt,
        summary: "Punnett square diagram for Mendelian monohybrid cross with parent gametes and offspring genotypes.",
        canvasWidth,
        canvasHeight,
        objects: [
          {
            id: `txt_${Date.now()}_title`,
            type: "text",
            text: "Punnett Square: Monohybrid Cross (T × t)",
            x: cx - 140,
            y: startY - 45,
            w: 280,
            h: 22,
            rot: 0,
            size: 13,
            bold: true,
            align: "center",
            bg: "white",
            style: { stroke: "#1e293b", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_lbl_female`,
            type: "text",
            text: "Gametes →",
            x: startX - 85,
            y: startY - 26,
            w: 80,
            h: 20,
            rot: 0,
            size: 11,
            bold: true,
            align: "right",
            bg: "transparent",
            style: { stroke: "#64748b", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_g_top1`,
            type: "text",
            text: "T",
            x: startX + 25,
            y: startY - 26,
            w: 30,
            h: 22,
            rot: 0,
            size: 14,
            bold: true,
            align: "center",
            bg: "#e0e7ff",
            style: { stroke: "#4338ca", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_g_top2`,
            type: "text",
            text: "t",
            x: startX + cellSize + 25,
            y: startY - 26,
            w: 30,
            h: 22,
            rot: 0,
            size: 14,
            bold: true,
            align: "center",
            bg: "#e0e7ff",
            style: { stroke: "#4338ca", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_g_left1`,
            type: "text",
            text: "T",
            x: startX - 35,
            y: startY + 25,
            w: 30,
            h: 22,
            rot: 0,
            size: 14,
            bold: true,
            align: "center",
            bg: "#e0e7ff",
            style: { stroke: "#4338ca", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_g_left2`,
            type: "text",
            text: "t",
            x: startX - 35,
            y: startY + cellSize + 25,
            w: 30,
            h: 22,
            rot: 0,
            size: 14,
            bold: true,
            align: "center",
            bg: "#e0e7ff",
            style: { stroke: "#4338ca", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `shp_${Date.now()}_c00`,
            type: "shape",
            kind: "rect",
            x: startX,
            y: startY,
            w: cellSize,
            h: cellSize,
            rot: 0,
            style: { stroke: "#334155", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_v00`,
            type: "text",
            text: "TT\n(Tall)",
            x: startX + 10,
            y: startY + 20,
            w: cellSize - 20,
            h: 36,
            rot: 0,
            size: 12,
            bold: true,
            align: "center",
            bg: "transparent",
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `shp_${Date.now()}_c01`,
            type: "shape",
            kind: "rect",
            x: startX + cellSize,
            y: startY,
            w: cellSize,
            h: cellSize,
            rot: 0,
            style: { stroke: "#334155", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_v01`,
            type: "text",
            text: "Tt\n(Tall)",
            x: startX + cellSize + 10,
            y: startY + 20,
            w: cellSize - 20,
            h: 36,
            rot: 0,
            size: 12,
            bold: true,
            align: "center",
            bg: "transparent",
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `shp_${Date.now()}_c10`,
            type: "shape",
            kind: "rect",
            x: startX,
            y: startY + cellSize,
            w: cellSize,
            h: cellSize,
            rot: 0,
            style: { stroke: "#334155", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_v10`,
            type: "text",
            text: "Tt\n(Tall)",
            x: startX + 10,
            y: startY + cellSize + 20,
            w: cellSize - 20,
            h: 36,
            rot: 0,
            size: 12,
            bold: true,
            align: "center",
            bg: "transparent",
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `shp_${Date.now()}_c11`,
            type: "shape",
            kind: "rect",
            x: startX + cellSize,
            y: startY + cellSize,
            w: cellSize,
            h: cellSize,
            rot: 0,
            style: { stroke: "#334155", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_v11`,
            type: "text",
            text: "tt\n(Dwarf)",
            x: startX + cellSize + 10,
            y: startY + cellSize + 20,
            w: cellSize - 20,
            h: 36,
            rot: 0,
            size: 12,
            bold: true,
            align: "center",
            bg: "transparent",
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_ratio`,
            type: "text",
            text: "Genotypic Ratio: 1 TT : 2 Tt : 1 tt | Phenotypic Ratio: 3 Tall : 1 Dwarf",
            x: cx - 210,
            y: startY + cellSize * 2 + 18,
            w: 420,
            h: 22,
            rot: 0,
            size: 11,
            bold: false,
            align: "center",
            bg: "white",
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
        ],
      };
    }

    // 0b. Biology: Ecological Trophic Pyramid
    if (
      lower.includes("pyramid") ||
      lower.includes("trophic") ||
      lower.includes("biomass") ||
      lower.includes("producer") ||
      lower.includes("ecosystem") ||
      lower.includes("energy transfer")
    ) {
      const topY = 60;
      const tierH = 44;
      return {
        prompt,
        summary: "Ecological trophic pyramid of energy with 4 trophic levels and 10% law annotation.",
        canvasWidth,
        canvasHeight,
        objects: [
          {
            id: `txt_${Date.now()}_title`,
            type: "text",
            text: "Trophic Pyramid of Energy (10% Energy Transfer)",
            x: cx - 180,
            y: topY - 35,
            w: 360,
            h: 22,
            rot: 0,
            size: 13,
            bold: true,
            align: "center",
            bg: "white",
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `shp_${Date.now()}_t4`,
            type: "shape",
            kind: "rect",
            x: cx - 80,
            y: topY,
            w: 160,
            h: tierH,
            rot: 0,
            style: { stroke: "#047857", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_lbl_t4`,
            type: "text",
            text: "Tertiary Consumers (10 J)",
            x: cx - 75,
            y: topY + 12,
            w: 150,
            h: 20,
            rot: 0,
            size: 11,
            bold: true,
            align: "center",
            bg: "white",
            style: { stroke: "#047857", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `shp_${Date.now()}_t3`,
            type: "shape",
            kind: "rect",
            x: cx - 130,
            y: topY + tierH,
            w: 260,
            h: tierH,
            rot: 0,
            style: { stroke: "#059669", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_lbl_t3`,
            type: "text",
            text: "Secondary Consumers (100 J)",
            x: cx - 110,
            y: topY + tierH + 12,
            w: 220,
            h: 20,
            rot: 0,
            size: 11,
            bold: true,
            align: "center",
            bg: "white",
            style: { stroke: "#059669", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `shp_${Date.now()}_t2`,
            type: "shape",
            kind: "rect",
            x: cx - 180,
            y: topY + tierH * 2,
            w: 360,
            h: tierH,
            rot: 0,
            style: { stroke: "#10b981", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_lbl_t2`,
            type: "text",
            text: "Primary Consumers - Herbivores (1,000 J)",
            x: cx - 140,
            y: topY + tierH * 2 + 12,
            w: 280,
            h: 20,
            rot: 0,
            size: 11,
            bold: true,
            align: "center",
            bg: "white",
            style: { stroke: "#10b981", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `shp_${Date.now()}_t1`,
            type: "shape",
            kind: "rect",
            x: cx - 230,
            y: topY + tierH * 3,
            w: 460,
            h: tierH,
            rot: 0,
            style: { stroke: "#047857", width: 2.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_lbl_t1`,
            type: "text",
            text: "Primary Producers - Plants / Phytoplankton (10,000 J)",
            x: cx - 180,
            y: topY + tierH * 3 + 12,
            w: 360,
            h: 20,
            rot: 0,
            size: 11,
            bold: true,
            align: "center",
            bg: "white",
            style: { stroke: "#047857", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `arr_${Date.now()}_up`,
            type: "line",
            kind: "line",
            pts: [{ x: cx + 245, y: topY + tierH * 3.5 }, { x: cx + 245, y: topY + 10 }],
            start: "none",
            end: "filled",
            label: "10% Law",
            labelOffset: 20,
            labelSize: 11,
            style: { stroke: "#0284c7", width: 2, dash: "dashed", fill: null, hatch: "none", opacity: 1 },
          },
        ],
      };
    }

    // 0c. Biology: Plant/Animal Cell with Clean Callout Leader Lines
    if (
      isBio ||
      lower.includes("cell") ||
      lower.includes("plant") ||
      lower.includes("animal") ||
      lower.includes("organelle") ||
      lower.includes("vacuole") ||
      lower.includes("chloroplast") ||
      lower.includes("neuron")
    ) {
      const cellW = 230;
      const cellH = 160;
      const cellX = cx - cellW / 2;
      const cellY = cy - cellH / 2 + 10;

      return {
        prompt,
        summary: "Diagram of plant cell structure with labeled leader lines pointing to parts (A), (B), (C), and (D).",
        canvasWidth,
        canvasHeight,
        objects: [
          {
            id: `txt_${Date.now()}_title`,
            type: "text",
            text: "Diagram: Plant Cell Structure",
            x: cx - 120,
            y: 18,
            w: 240,
            h: 22,
            rot: 0,
            size: 13,
            bold: true,
            align: "center",
            bg: "white",
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `st_${Date.now()}_cell`,
            type: "stamp",
            stamp: "plant_cell",
            x: cellX,
            y: cellY,
            w: cellW,
            h: cellH,
            rot: 0,
            style: { stroke: "#15803d", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Callout (A) - Cell Wall
          {
            id: `line_${Date.now()}_a`,
            type: "line",
            kind: "line",
            pts: [{ x: cellX + 12, y: cellY + 12 }, { x: cellX - 45, y: cellY - 10 }],
            start: "filled",
            end: "none",
            label: "",
            labelOffset: 0,
            labelSize: 12,
            style: { stroke: "#15803d", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_lbl_a`,
            type: "text",
            text: "Part (A)",
            x: cellX - 95,
            y: cellY - 22,
            w: 60,
            h: 22,
            rot: 0,
            size: 12,
            bold: true,
            align: "center",
            bg: "#f0fdf4",
            style: { stroke: "#15803d", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Callout (B) - Central Vacuole
          {
            id: `line_${Date.now()}_b`,
            type: "line",
            kind: "line",
            pts: [{ x: cellX + cellW * 0.45, y: cellY + cellH * 0.45 }, { x: cellX + cellW + 35, y: cellY + 25 }],
            start: "filled",
            end: "none",
            label: "",
            labelOffset: 0,
            labelSize: 12,
            style: { stroke: "#15803d", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_lbl_b`,
            type: "text",
            text: "Part (B)",
            x: cellX + cellW + 35,
            y: cellY + 14,
            w: 60,
            h: 22,
            rot: 0,
            size: 12,
            bold: true,
            align: "center",
            bg: "#f0fdf4",
            style: { stroke: "#15803d", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Callout (C) - Chloroplast
          {
            id: `line_${Date.now()}_c`,
            type: "line",
            kind: "line",
            pts: [{ x: cellX + cellW * 0.82, y: cellY + cellH * 0.72 }, { x: cellX + cellW + 35, y: cellY + cellH - 10 }],
            start: "filled",
            end: "none",
            label: "",
            labelOffset: 0,
            labelSize: 12,
            style: { stroke: "#15803d", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_lbl_c`,
            type: "text",
            text: "Part (C)",
            x: cellX + cellW + 35,
            y: cellY + cellH - 22,
            w: 60,
            h: 22,
            rot: 0,
            size: 12,
            bold: true,
            align: "center",
            bg: "#f0fdf4",
            style: { stroke: "#15803d", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Callout (D) - Nucleus
          {
            id: `line_${Date.now()}_d`,
            type: "line",
            kind: "line",
            pts: [{ x: cellX + cellW * 0.18, y: cellY + cellH * 0.45 }, { x: cellX - 45, y: cellY + cellH * 0.55 }],
            start: "filled",
            end: "none",
            label: "",
            labelOffset: 0,
            labelSize: 12,
            style: { stroke: "#15803d", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_lbl_d`,
            type: "text",
            text: "Part (D)",
            x: cellX - 95,
            y: cellY + cellH * 0.55 - 11,
            w: 60,
            h: 22,
            rot: 0,
            size: 12,
            bold: true,
            align: "center",
            bg: "#f0fdf4",
            style: { stroke: "#15803d", width: 1.5, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
        ],
      };
    }

    // 1. Ohm's Law Circuit (Physics only: strictly disabled for Biology)
    if (
      !isBio && (
        lower.includes("ohm") ||
        (lower.includes("circuit") &&
          (lower.includes("resistor") ||
            lower.includes("law") ||
            lower.includes("voltage") ||
            lower.includes("current") ||
            lower.includes("v = ir") ||
            lower.includes("resistance")))
      )
    ) {
      return {
        prompt,
        summary: "Standard CBSE Ohm's Law circuit diagram with Voltmeter in parallel across Resistor R, Ammeter in series, Rheostat, Key, and Battery.",
        canvasWidth,
        canvasHeight,
        objects: [
          // 1. Voltmeter (V) connected in parallel across the resistor
          {
            id: `st_${Date.now()}_v`,
            type: "stamp",
            stamp: "voltmeter",
            x: 295,
            y: 40,
            w: 40,
            h: 40,
            rot: 0,
            style: { stroke: "#4f46e5", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_v_lbl`,
            type: "text",
            text: "V (Voltmeter in Parallel)",
            x: 245,
            y: 16,
            w: 140,
            h: 18,
            rot: 0,
            font: "sans",
            size: 11,
            bold: true,
            italic: false,
            underline: false,
            align: "center",
            bg: "white",
            border: false,
            style: { stroke: "#4f46e5", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // 2. Resistor (R)
          {
            id: `st_${Date.now()}_res`,
            type: "stamp",
            stamp: "resistor",
            x: 280,
            y: 95,
            w: 70,
            h: 30,
            rot: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_r_lbl`,
            type: "text",
            text: "R (Resistance Wire)",
            x: 265,
            y: 132,
            w: 100,
            h: 18,
            rot: 0,
            font: "sans",
            size: 11,
            bold: true,
            italic: false,
            underline: false,
            align: "center",
            bg: "white",
            border: false,
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // 3. Ammeter (A) in series
          {
            id: `st_${Date.now()}_a`,
            type: "stamp",
            stamp: "ammeter",
            x: 160,
            y: 90,
            w: 40,
            h: 40,
            rot: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_a_lbl`,
            type: "text",
            text: "A (Ammeter in Series)",
            x: 125,
            y: 135,
            w: 110,
            h: 18,
            rot: 0,
            font: "sans",
            size: 11,
            bold: true,
            italic: false,
            underline: false,
            align: "center",
            bg: "white",
            border: false,
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // 4. Rheostat (Rh) on bottom branch
          {
            id: `st_${Date.now()}_rh`,
            type: "stamp",
            stamp: "rheostat",
            x: 360,
            y: 250,
            w: 70,
            h: 40,
            rot: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_rh_lbl`,
            type: "text",
            text: "Rh (Rheostat)",
            x: 355,
            y: 295,
            w: 80,
            h: 18,
            rot: 0,
            font: "sans",
            size: 11,
            bold: true,
            italic: false,
            underline: false,
            align: "center",
            bg: "white",
            border: false,
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // 5. Plug Key (K) on bottom branch
          {
            id: `st_${Date.now()}_key`,
            type: "stamp",
            stamp: "switch_closed",
            x: 255,
            y: 255,
            w: 50,
            h: 30,
            rot: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_key_lbl`,
            type: "text",
            text: "K (Plug Key)",
            x: 245,
            y: 292,
            w: 70,
            h: 18,
            rot: 0,
            font: "sans",
            size: 11,
            bold: true,
            italic: false,
            underline: false,
            align: "center",
            bg: "white",
            border: false,
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // 6. Battery (E) on bottom branch
          {
            id: `st_${Date.now()}_bat`,
            type: "stamp",
            stamp: "battery",
            x: 140,
            y: 250,
            w: 60,
            h: 40,
            rot: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_bat_lbl`,
            type: "text",
            text: "+  -  Battery (E)",
            x: 125,
            y: 295,
            w: 90,
            h: 18,
            rot: 0,
            font: "sans",
            size: 11,
            bold: true,
            italic: false,
            underline: false,
            align: "center",
            bg: "white",
            border: false,
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Connecting wires:
          // Top circuit loop:
          {
            id: `w_${Date.now()}_1`,
            type: "line",
            kind: "line",
            pts: [{ x: 100, y: 110 }, { x: 160, y: 110 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_2`,
            type: "line",
            kind: "line",
            pts: [{ x: 200, y: 110 }, { x: 235, y: 110 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_3`,
            type: "line",
            kind: "line",
            pts: [{ x: 235, y: 110 }, { x: 280, y: 110 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_4`,
            type: "line",
            kind: "line",
            pts: [{ x: 350, y: 110 }, { x: 395, y: 110 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_5`,
            type: "line",
            kind: "line",
            pts: [{ x: 395, y: 110 }, { x: 500, y: 110 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Voltmeter parallel wires:
          {
            id: `w_${Date.now()}_v1`,
            type: "line",
            kind: "polyline",
            pts: [{ x: 235, y: 110 }, { x: 235, y: 60 }, { x: 295, y: 60 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#4f46e5", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_v2`,
            type: "line",
            kind: "polyline",
            pts: [{ x: 335, y: 60 }, { x: 395, y: 60 }, { x: 395, y: 110 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#4f46e5", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Right vertical & bottom loop:
          {
            id: `w_${Date.now()}_r`,
            type: "line",
            kind: "polyline",
            pts: [{ x: 500, y: 110 }, { x: 500, y: 270 }, { x: 430, y: 270 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_b1`,
            type: "line",
            kind: "line",
            pts: [{ x: 360, y: 270 }, { x: 305, y: 270 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_b2`,
            type: "line",
            kind: "line",
            pts: [{ x: 255, y: 270 }, { x: 200, y: 270 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_l`,
            type: "line",
            kind: "polyline",
            pts: [{ x: 140, y: 270 }, { x: 100, y: 270 }, { x: 100, y: 110 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Current direction arrow:
          {
            id: `w_${Date.now()}_cur`,
            type: "line",
            kind: "line",
            pts: [{ x: 100, y: 205 }, { x: 100, y: 175 }],
            start: "none",
            end: "filled",
            ticks: 0,
            parallels: 0,
            label: "I (Current)",
            labelSize: 11,
            labelOffset: -18,
            style: { stroke: "#dc2626", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Node points (junctions)
          {
            id: `pt_${Date.now()}_n1`,
            type: "point",
            x: 235,
            y: 110,
            label: "",
            lx: 0,
            ly: 0,
            size: 3.5,
            mode: "dot",
            fontSize: 12,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `pt_${Date.now()}_n2`,
            type: "point",
            x: 395,
            y: 110,
            label: "",
            lx: 0,
            ly: 0,
            size: 3.5,
            mode: "dot",
            fontSize: 12,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
        ],
      };
    }

    // 2. General Electric Circuit
    if (lower.includes("circuit") || lower.includes("battery") || lower.includes("bulb")) {
      return {
        prompt,
        summary: "Electric series circuit with battery, bulb, switch, and resistor stamps.",
        canvasWidth,
        canvasHeight,
        objects: [
          {
            id: `st_${Date.now()}_bat`,
            type: "stamp",
            stamp: "battery",
            x: cx - 110,
            y: cy + 50,
            w: 60,
            h: 40,
            rot: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_bat_l`,
            type: "text",
            text: "Battery (+/-)",
            x: cx - 120,
            y: cy + 95,
            w: 80,
            h: 18,
            rot: 0,
            font: "sans",
            size: 11,
            bold: true,
            italic: false,
            underline: false,
            align: "center",
            bg: "white",
            border: false,
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `st_${Date.now()}_res`,
            type: "stamp",
            stamp: "resistor",
            x: cx - 35,
            y: cy - 70,
            w: 70,
            h: 30,
            rot: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_res_l`,
            type: "text",
            text: "Resistor (R)",
            x: cx - 40,
            y: cy - 95,
            w: 80,
            h: 18,
            rot: 0,
            font: "sans",
            size: 11,
            bold: true,
            italic: false,
            underline: false,
            align: "center",
            bg: "white",
            border: false,
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `st_${Date.now()}_bulb`,
            type: "stamp",
            stamp: "bulb",
            x: cx + 80,
            y: cy - 75,
            w: 40,
            h: 40,
            rot: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_bulb_l`,
            type: "text",
            text: "Bulb",
            x: cx + 75,
            y: cy - 98,
            w: 50,
            h: 18,
            rot: 0,
            font: "sans",
            size: 11,
            bold: true,
            italic: false,
            underline: false,
            align: "center",
            bg: "white",
            border: false,
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `st_${Date.now()}_sw`,
            type: "stamp",
            stamp: "switch_closed",
            x: cx + 60,
            y: cy + 55,
            w: 50,
            h: 30,
            rot: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `txt_${Date.now()}_sw_l`,
            type: "text",
            text: "Switch (K)",
            x: cx + 55,
            y: cy + 92,
            w: 60,
            h: 18,
            rot: 0,
            font: "sans",
            size: 11,
            bold: true,
            italic: false,
            underline: false,
            align: "center",
            bg: "white",
            border: false,
            style: { stroke: "#0f172a", width: 1, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Wires
          {
            id: `w_${Date.now()}_top1`,
            type: "line",
            kind: "polyline",
            pts: [{ x: cx - 110, y: cy + 70 }, { x: cx - 150, y: cy + 70 }, { x: cx - 150, y: cy - 55 }, { x: cx - 35, y: cy - 55 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_top2`,
            type: "line",
            kind: "line",
            pts: [{ x: cx + 35, y: cy - 55 }, { x: cx + 80, y: cy - 55 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_right`,
            type: "line",
            kind: "polyline",
            pts: [{ x: cx + 120, y: cy - 55 }, { x: cx + 160, y: cy - 55 }, { x: cx + 160, y: cy + 70 }, { x: cx + 110, y: cy + 70 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `w_${Date.now()}_bot`,
            type: "line",
            kind: "line",
            pts: [{ x: cx - 50, y: cy + 70 }, { x: cx + 60, y: cy + 70 }],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "",
            labelSize: 12,
            labelOffset: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
        ],
      };
    }

    // 3. Right-angled triangle ABC with non-overlapping exterior labels
    if (lower.includes("right") || lower.includes("triangle")) {
      const pB = { x: cx - 110, y: cy + 70 }; // Vertex B (right angle)
      const pC = { x: cx + 120, y: cy + 70 }; // Vertex C (base)
      const pA = { x: cx - 110, y: cy - 80 }; // Vertex A (altitude)

      return {
        prompt,
        summary: "Constructed right-angled triangle ABC with right angle marker at B, angle θ at vertex A, and exterior non-overlapping labels.",
        canvasWidth,
        canvasHeight,
        objects: [
          // Lines with generous exterior labelOffset
          {
            id: `l_${Date.now()}_ab`,
            type: "line",
            kind: "line",
            pts: [pA, pB],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "c = 6 cm",
            labelSize: 13,
            labelOffset: -26, // Exterior (left side)
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `l_${Date.now()}_bc`,
            type: "line",
            kind: "line",
            pts: [pB, pC],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "a = 8 cm",
            labelSize: 13,
            labelOffset: 24, // Exterior (below base)
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `l_${Date.now()}_ca`,
            type: "line",
            kind: "line",
            pts: [pC, pA],
            start: "none",
            end: "none",
            ticks: 0,
            parallels: 0,
            label: "b = 10 cm",
            labelSize: 13,
            labelOffset: -24, // Exterior (above hypotenuse)
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Right angle at B (inside corner)
          {
            id: `ang_${Date.now()}_rt`,
            type: "angle",
            v: pB,
            a: pA,
            b: pC,
            labelMode: "none",
            label: "",
            fontSize: 13,
            rightMark: true,
            arcs: 1,
            arcR: 20,
            reflex: false,
            decimals: 0,
            fillSector: false,
            armArrow: "none",
            armTicks: 0,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Angle theta at A (inside triangle, well below vertex A)
          {
            id: `ang_${Date.now()}_th`,
            type: "angle",
            v: pA,
            a: pB,
            b: pC,
            labelMode: "custom",
            label: "θ",
            fontSize: 14,
            rightMark: false,
            arcs: 1,
            arcR: 28,
            reflex: false,
            decimals: 0,
            fillSector: false,
            armArrow: "none",
            armTicks: 0,
            style: { stroke: "#4f46e5", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          // Vertices labels pointing OUTWARDS away from triangle center
          {
            id: `pt_${Date.now()}_a`,
            type: "point",
            x: pA.x,
            y: pA.y,
            label: "A",
            lx: 0,
            ly: -20, // Straight UP, away from angle arc θ
            size: 3,
            mode: "dot",
            fontSize: 15,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `pt_${Date.now()}_b`,
            type: "point",
            x: pB.x,
            y: pB.y,
            label: "B",
            lx: -20,
            ly: 20, // Down-Left, away from right-angle marker
            size: 3,
            mode: "dot",
            fontSize: 15,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
          {
            id: `pt_${Date.now()}_c`,
            type: "point",
            x: pC.x,
            y: pC.y,
            label: "C",
            lx: 20,
            ly: 20, // Down-Right, away from base
            size: 3,
            mode: "dot",
            fontSize: 15,
            style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
        ],
      };
    }

    // 4. Generic geometry / circle / coordinate plane fallback
    return {
      prompt,
      summary: "Generated geometric diagram layout with outward non-overlapping labels.",
      canvasWidth,
      canvasHeight,
      objects: [
        {
          id: `shp_${Date.now()}_1`,
          type: "shape",
          kind: "circle",
          x: cx - 70,
          y: cy - 70,
          w: 140,
          h: 140,
          rot: 0,
          sides: 3,
          a0: 0,
          a1: 360,
          radius: 0,
          inner: 0.5,
          style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
        },
        {
          id: `pt_${Date.now()}_o`,
          type: "point",
          x: cx,
          y: cy,
          label: "O",
          lx: -16,
          ly: -16,
          size: 3,
          mode: "dot",
          fontSize: 14,
          style: { stroke: "#0f172a", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
        },
        {
          id: `l_${Date.now()}_rad`,
          type: "line",
          kind: "line",
          pts: [{ x: cx, y: cy }, { x: cx + 70, y: cy }],
          start: "none",
          end: "none",
          ticks: 0,
          parallels: 0,
          label: "r",
          labelSize: 13,
          labelOffset: -18,
          style: { stroke: "#4f46e5", width: 2, dash: "dashed", fill: null, hatch: "none", opacity: 1 },
        },
      ],
    };
  };

  const rawResult = await callGeminiApi<FigureStudioPromptResult>(userPrompt, systemPrompt, {
    json: true,
    apiKey,
    mockFallback,
  });

  if (!rawResult.success || !rawResult.data) {
    return rawResult;
  }

  // Normalize all objects and de-conflict labels automatically
  const isBio = Boolean(subject?.toLowerCase().includes("bio"));
  let normalizedObjs = normalizeFigureObjects(
    rawResult.data.objects,
    canvasWidth,
    canvasHeight,
  );

  // Guardrail: If subject is Biology, reject any physics components (circuits, batteries, resistors)
  if (isBio) {
    const hasPhysicsStamp = normalizedObjs.some((o: any) =>
      o?.type === "stamp" &&
      ["resistor", "battery", "ammeter", "voltmeter", "rheostat", "switch_closed", "switch_open", "bulb", "galvanometer"].includes(o?.stamp)
    );
    if (hasPhysicsStamp) {
      console.warn("Detected physics component in Biology diagram. Replacing with validated Biology archetype.");
      const fallback = mockFallback();
      normalizedObjs = normalizeFigureObjects(fallback.objects, canvasWidth, canvasHeight);
    }
  }

  return {
    ...rawResult,
    data: {
      ...rawResult.data,
      objects: normalizedObjs,
    },
  };
}

export interface ParsedSyllabusResponse {
  bookTitle: string;
  className: string;
  subject: string;
  isComposite: boolean;
  books: Array<{
    title: string;
    className: string;
    subject: string;
    chapters: Array<{ number: number; title: string }>;
  }>;
}

/**
 * Intelligent Table of Contents & Syllabus Circular Parser using Gemini.
 * Takes unformatted index text or syllabus circulars from private publishers
 * (e.g. Oxford, Pearson, Ratna Sagar, Cambridge) and extracts structured chapters
 * with automatic detection of multi-book or multi-unit composite subjects.
 */
export async function parseSyllabusWithGemini(params: {
  rawText: string;
  className?: string;
  subject?: string;
  apiKey?: string | null;
}): Promise<GeminiCallResult<ParsedSyllabusResponse>> {
  const { rawText, className = "Class 10", subject = "General", apiKey } = params;

  const systemPrompt = `You are an expert school academic curriculum analyzer for Indian school education (CBSE, ICSE, NCERT, State Boards, and private publishers such as Oxford, Pearson, Ratna Sagar, Cambridge, S. Chand, Cordova, Madhubun).
Analyze the provided textbook index, table of contents, or syllabus circular text.
Extract all chapters in proper sequential order.
Requirements:
1. Strip out page numbers, unit weights, lesson durations, dots, and trailing garbage.
2. If the text contains MULTIPLE books, readers, or distinct parts (e.g., "Book 1: First Flight" and "Book 2: Footprints Without Feet", or "History", "Geography", "Civics", "Economics", or "Part 1" and "Part 2"):
   - Set isComposite: true
   - In the 'books' array, output either separate book objects for each reader/part, or group them with clear [Part Name] prefixes in chapter titles.
3. If it is a single textbook, return a single entry in 'books' with all sequential chapters (1, 2, 3...).
4. For Language subjects (English, Hindi, Sanskrit, etc.), if the raw input contains literature/prose/poetry lessons only, ensure the essential examination non-chapter components (Reading Comprehension / Unseen Passage, Writing Skills / Creative Composition, and Applied Grammar / Vyakaran) are included as distinct units:
   - English: Reading Skills, Writing Skills, Grammar
   - Hindi: खंड क: अपठित बोध, खंड ख: रचनात्मक लेखन, खंड ग: व्यावहारिक व्याकरण
   - Sanskrit: भागः क: अपठित-अवबोधनम्, भागः ख: रचनात्मक-कार्यम्, भागः ग: अनुप्रयुक्त-व्याकरणम्
5. Return strictly valid JSON matching this schema:
{
  "bookTitle": "Main Textbook Title",
  "className": "${className}",
  "subject": "${subject}",
  "isComposite": false,
  "books": [
    {
      "title": "Textbook Title",
      "className": "${className}",
      "subject": "${subject}",
      "chapters": [
        { "number": 1, "title": "Chapter 1 Title" },
        { "number": 2, "title": "Chapter 2 Title" }
      ]
    }
  ]
}`;

  const userPrompt = `Class: ${className}\nSubject: ${subject}\n\nRaw Index / Table of Contents Text:\n${rawText.slice(0, 8000)}`;

  const mockFallback = (): ParsedSyllabusResponse => {
    // Robust regex fallback parser
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const chapters: Array<{ number: number; title: string }> = [];
    let detectedNum = 1;

    for (const line of lines) {
      // Ignore header lines like "Table of Contents", "Index", etc.
      if (/^(table of contents|index|contents|syllabus|units)/i.test(line)) continue;

      // Match patterns like "1. Something", "Chapter 1: Something", "Lesson 1 - Something", "Unit 1: Something"
      const match = line.match(/^(?:chapter|lesson|unit)?\s*(\d+)[\.\:\-\s]+(.+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        let title = match[2].trim();
        // Remove trailing page numbers like "... 45", "(pg 12)", "(page 14)", or "... pg 12"
        title = title.replace(/[\.\s\-_]*(?:\(|\[)?(?:page|pg\.?)?\s*\d+\s*(?:\)|\])?\s*$/i, "").trim();
        if (title.length > 2) {
          chapters.push({ number: num || detectedNum, title });
          detectedNum = (num || detectedNum) + 1;
        }
      } else if (line.length > 3 && !/^\d+$/.test(line)) {
        // Fallback for lines without numbers
        chapters.push({ number: detectedNum++, title: line });
      }
    }

    const defaultTitle = `${subject} (${className})`;
    const initialChapters = chapters.length > 0 ? chapters : [{ number: 1, title: "Chapter 1: Introduction" }];
    const { chapters: finalChapters } = ensureLanguageNonChapterUnits(initialChapters, subject, className);

    return {
      bookTitle: defaultTitle,
      className,
      subject,
      isComposite: false,
      books: [
        {
          title: defaultTitle,
          className,
          subject,
          chapters: finalChapters,
        },
      ],
    };
  };

  const rawResult = await callGeminiApi<ParsedSyllabusResponse>(userPrompt, systemPrompt, {
    json: true,
    apiKey,
    mockFallback,
  });

  if (rawResult.data?.books) {
    for (const b of rawResult.data.books) {
      const bSub = b.subject || subject;
      const bCls = b.className || className;
      const { chapters: finalChapters } = ensureLanguageNonChapterUnits(b.chapters, bSub, bCls);
      b.chapters = finalChapters;
    }
  }

  return rawResult;
}

export interface ParseBlueprintInput {
  rawText?: string;
  fileData?: string; // base64
  mimeType?: string; // application/pdf, image/png, image/jpeg, image/webp
  className?: string;
  subject?: string;
  academicSession?: string;
  bookChapters?: Array<{ id: string; number: number; title: string }>;
  apiKey?: string | null;
}

export interface ParsedBlueprintResponse {
  name: string;
  academicSession: string;
  examType: "QUARTERLY" | "HALF_YEARLY" | "ANNUAL";
  durationMin: number;
  subjectCode: string;
  totalMarks: number;
  sections: Array<{
    title: string;
    instructions: string;
    type: string;
    count: number;
    marksEach: number;
  }>;
  chapters: Array<{
    chapterId: string;
    marks: number;
  }>;
}

/**
 * Parses official education board blueprint circulars (PDFs, images, or raw text)
 * into a structured, balanced Blueprint using Gemini Multimodal Vision / OCR.
 */
export async function parseBlueprintWithGemini(
  input: ParseBlueprintInput,
): Promise<GeminiCallResult<ParsedBlueprintResponse>> {
  const apiKey = getGeminiApiKey(input.apiKey);
  const className = input.className || "Class 12";
  const subject = input.subject || "English";
  const academicSession = input.academicSession || "2025–26";
  const chapters = input.bookChapters || [];

  const systemInstruction = `You are an expert exam blueprint and syllabus analyzer for official Indian state and central education boards (e.g., MP Board / MPBSE, CBSE, ICSE, UP Board, etc.).
Your mission is to extract, normalize, and arithmetically balance an examination blueprint from the provided document (PDF, image, or text) into a strict JSON object.

CRITICAL REQUIREMENTS:
1. "name": Generate a professional title including board, class, subject, and session (e.g. "MP Board Class 12 English Annual Examination 2025–26").
2. "academicSession": Return standard academic session (e.g. "${academicSession}").
3. "examType": Exactly one of: "ANNUAL", "HALF_YEARLY", "QUARTERLY".
4. "durationMin": Examination time in minutes (e.g. 180 for 3:00 Hours, 150 for 2:30 Hours). Default to 180 if unspecified.
5. "subjectCode": Official subject code if stated (e.g. "051"), otherwise empty string "".
6. "sections": Array of question paper sections.
   - For MP Board / State Board Objective Questions (e.g. Q1 to Q5 carrying 28 to 32 objective marks):
     Break down by question type:
     - Multiple Choice Questions (e.g., count: 6, marksEach: 1, type: "MCQ")
     - Fill in the Blanks (e.g., count: 6, marksEach: 1, type: "FILL_BLANK")
     - True / False (e.g., count: 6, marksEach: 1, type: "TRUE_FALSE")
     - Match the Columns (e.g., count: 5, marksEach: 1, type: "MATCH_COLUMN")
     - One Word / One Sentence Answer (e.g., count: 5, marksEach: 1, type: "VERY_SHORT")
   - For Subjective Sections:
     - Very Short Answer (अति लघु उत्तरीय, 2 marks, ~30 words): type: "VERY_SHORT", marksEach: 2
     - Short Answer (लघु उत्तरीय, 3 marks, ~75 words): type: "SHORT", marksEach: 3
     - Long Answer / Analytical (दीर्घ उत्तरीय, 4 marks, ~120 words): type: "LONG", marksEach: 4
     - Case Study / Passage Extracts: type: "CASE_STUDY" or "UNSEEN_PASSAGE"
   - Question Types must be chosen strictly from: "MCQ", "ASSERTION_REASON", "TRUE_FALSE", "FILL_BLANK", "MATCH_COLUMN", "VERY_SHORT", "SHORT", "LONG", "CASE_STUDY", "UNSEEN_PASSAGE", "REFERENCE_CONTEXT", "WRITING_SKILL", "GRAMMAR", "DRAW", "MAP_WORK".
7. "chapters": Array of { "chapterId": string, "marks": number }.
   - Distribute the examination marks across the provided chapter IDs.
   - CRITICAL INVARIANT: The sum of marks in "chapters" MUST EXACTLY EQUAL the sum of (count * marksEach) across all "sections".
   - Only assign marks to chapter IDs provided in the chapter list. Do not invent non-existent IDs.
8. LANGUAGE MEDIUM POLICY:
   - For Sanskrit (or codes 122/512): All section titles MUST be in authentic Sanskrit in Devanagari script (e.g. "खण्डः 'क' : बहुविकल्पीयप्रश्नाः", "खण्डः 'ख' : रिक्तस्थानपूर्तिः", "खण्डः 'ग' : सत्यासत्यनिरूपणम्", "खण्डः 'घ' : उचितयुग्ममेलनम्", "खण्डः 'ङ' : एकपदेन उत्तराणि", "खण्डः 'च' : लघूत्तरीयप्रश्नाः", "खण्डः 'छ' : पाठ्यांश-अवबोधनम्", "खण्डः 'ज' : दीर्घोत्तरीय-रचनात्मककार्यम्"). Instructions must also be in Sanskrit.
   - For Hindi: All section titles and instructions MUST be in standard Hindi (e.g. "खण्ड 'क' : सही विकल्प चुनिए", "खण्ड 'ख' : रिक्त स्थानों की पूर्ति", "खण्ड 'ग' : सत्य / असत्य", "खण्ड 'घ' : सही जोड़ी मिलाइए").
   - For English: Use standard English ("Section A: Multiple Choice Questions", etc.).
   - NEVER generate English section titles for Sanskrit or Hindi papers.

RETURN ONLY VALID JSON matching this schema:
{
  "name": "string",
  "academicSession": "string",
  "examType": "ANNUAL" | "HALF_YEARLY" | "QUARTERLY",
  "durationMin": number,
  "subjectCode": "string",
  "totalMarks": number,
  "sections": [
    {
      "title": "string",
      "instructions": "string",
      "type": "string",
      "count": number,
      "marksEach": number
    }
  ],
  "chapters": [
    {
      "chapterId": "string",
      "marks": number
    }
  ]
}`;

  const chaptersPromptList = chapters
    .map((c) => `- ID: "${c.id}", Number: ${c.number}, Title: "${c.title}"`)
    .join("\n");

  const promptText = `Please parse the following examination blueprint for ${className} ${subject} (${academicSession}).

Available Book Chapters in System:
${chaptersPromptList || "No existing chapters provided; distribute marks logically across detected units."}

Provided Document / Text:
${input.rawText || "Please inspect the attached blueprint document/image and extract the full marks scheme."}`;

  let promptContent: string | GeminiContentPart[];
  if (input.fileData && input.mimeType) {
    promptContent = [
      {
        inlineData: {
          mimeType: input.mimeType,
          data: input.fileData,
        },
      },
      { text: promptText },
    ];
  } else {
    promptContent = promptText;
  }

  const mockFallback = (): ParsedBlueprintResponse => {
    // Intelligent fallback modeled on MP Board / State Board 80-mark standard pattern
    const isSanskrit = /sanskrit|संस्कृत/i.test(subject);
    const isHindi = /hindi|हिंदी|हिन्दी/i.test(subject);
    const sections = isSanskrit
      ? [
          { title: "खण्डः 'क' : बहुविकल्पीयप्रश्नाः", instructions: "उचितविकल्पं चित्वा लिखत", type: "MCQ", count: 6, marksEach: 1 },
          { title: "खण्डः 'ख' : रिक्तस्थानपूर्तिः", instructions: "कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत", type: "FILL_BLANK", count: 6, marksEach: 1 },
          { title: "खण्डः 'ग' : शुद्ध/अशुद्धवाक्यनिरूपणम्", instructions: "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत", type: "TRUE_FALSE", count: 6, marksEach: 1 },
          { title: "खण्डः 'घ' : उचितयुग्ममेलनम्", instructions: "स्तम्भ 'अ' सह स्तम्भ 'ब' इत्यस्य समुचितं मेलनं कुरुत", type: "MATCH_COLUMN", count: 6, marksEach: 1 },
          { title: "खण्डः 'ङ' : एकपदेन उत्तराणि", instructions: "एकपदेन उत्तरं संस्कृतभाषया लिखत", type: "VERY_SHORT", count: 6, marksEach: 1 },
          { title: "खण्डः 'च' : लघूत्तरीयप्रश्नाः", instructions: "अधोलिखितानां प्रश्नानाम् उत्तराणि संस्कृतभाषया संक्षेपेण लिखत", type: "SHORT", count: 12, marksEach: 2 },
          { title: "खण्डः 'छ' : पाठ्यांश-अवबोधनम्", instructions: "प्रदत्तं गद्यांशं/पद्यांशं/नाट्यांशं पठित्वा प्रश्नानाम् उत्तराणि लिखत", type: "SHORT", count: 3, marksEach: 3 },
          { title: "खण्डः 'ज' : दीर्घोत्तरीय-रचनात्मककार्यम्", instructions: "पत्रलेखनम्, अपठितगद्यांशः, तथा निबन्धलेखनं कुरुत", type: "LONG", count: 3, marksEach: 4 },
        ]
      : isHindi
      ? [
          { title: "खण्ड 'क' : सही विकल्प चुनिए", instructions: "सही विकल्प चुनकर लिखिए", type: "MCQ", count: 6, marksEach: 1 },
          { title: "खण्ड 'ख' : रिक्त स्थानों की पूर्ति", instructions: "रिक्त स्थानों की पूर्ति कीजिए", type: "FILL_BLANK", count: 6, marksEach: 1 },
          { title: "खण्ड 'ग' : सत्य / असत्य", instructions: "सत्य या असत्य लिखिए", type: "TRUE_FALSE", count: 6, marksEach: 1 },
          { title: "खण्ड 'घ' : सही जोड़ी मिलाइए", instructions: "स्तम्भ 'अ' का स्तम्भ 'ब' से सही मिलान कीजिए", type: "MATCH_COLUMN", count: 6, marksEach: 1 },
          { title: "खण्ड 'ङ' : एक शब्द / वाक्य में उत्तर", instructions: "एक शब्द या एक वाक्य में उत्तर दीजिए", type: "VERY_SHORT", count: 6, marksEach: 1 },
          { title: "खण्ड 'च' : अति लघु उत्तरीय प्रश्न", instructions: "लगभग 30 शब्दों में उत्तर दीजिए", type: "VERY_SHORT", count: 10, marksEach: 2 },
          { title: "खण्ड 'छ' : लघु उत्तरीय प्रश्न", instructions: "लगभग 75 शब्दों में उत्तर दीजिए", type: "SHORT", count: 4, marksEach: 3 },
          { title: "खण्ड 'ज' : दीर्घ उत्तरीय प्रश्न", instructions: "लगभग 120 शब्दों में उत्तर दीजिए", type: "LONG", count: 4, marksEach: 4 },
        ]
      : /english/i.test(subject)
      ? [
          { title: "Section A – Objective: Multiple Choice", instructions: "Choose the correct option", type: "MCQ", count: 6, marksEach: 1 },
          { title: "Section A – Objective: Fill in Blanks", instructions: "Fill in the correct blanks", type: "FILL_BLANK", count: 6, marksEach: 1 },
          { title: "Section A – Objective: True / False", instructions: "State whether true or false", type: "TRUE_FALSE", count: 6, marksEach: 1 },
          { title: "Section A – Objective: Match Column", instructions: "Match Column A with Column B", type: "MATCH_COLUMN", count: 7, marksEach: 1 },
          { title: "Section A – Objective: One Word Answer", instructions: "Answer in one sentence", type: "VERY_SHORT", count: 7, marksEach: 1 },
          { title: "Section B – Very Short Answer", instructions: "Answer in about 30 words (2 marks each)", type: "VERY_SHORT", count: 10, marksEach: 2 },
          { title: "Section C – Short Answer", instructions: "Answer in about 75 words (3 marks each)", type: "SHORT", count: 4, marksEach: 3 },
          { title: "Section D – Long Answer", instructions: "Answer in about 120 words (4 marks each)", type: "LONG", count: 4, marksEach: 4 },
        ]
      : [
          { title: "Section A – Multiple Choice Questions", instructions: "All questions carry 1 mark", type: "MCQ", count: 16, marksEach: 1 },
          { title: "Section B – Very Short Answer", instructions: "Answer questions in 30 words", type: "VERY_SHORT", count: 5, marksEach: 2 },
          { title: "Section C – Short Answer", instructions: "Answer questions in 75 words", type: "SHORT", count: 6, marksEach: 3 },
          { title: "Section D – Long Answer", instructions: "Answer questions in 120 words", type: "LONG", count: 4, marksEach: 5 },
          { title: "Section E – Case Study Questions", instructions: "Case study questions with subparts", type: "CASE_STUDY", count: 3, marksEach: 4 },
        ];

    const totalSectionMarks = sections.reduce((sum, s) => sum + s.count * s.marksEach, 0);

    // Distribute among available chapters evenly
    const distributedChapters = chapters.map((c, idx) => {
      const base = Math.floor(totalSectionMarks / Math.max(1, chapters.length));
      return { chapterId: c.id, marks: base };
    });

    // Balance remainder
    const currentSum = distributedChapters.reduce((sum, c) => sum + c.marks, 0);
    const remainder = totalSectionMarks - currentSum;
    if (distributedChapters.length > 0 && remainder !== 0) {
      distributedChapters[0].marks += remainder;
    }

    return {
      name: `${className} ${subject} Annual Examination Blueprint (${academicSession})`,
      academicSession,
      examType: "ANNUAL",
      durationMin: 180,
      subjectCode: "",
      totalMarks: totalSectionMarks,
      sections,
      chapters: distributedChapters,
    };
  };

  const result = await callGeminiApi<ParsedBlueprintResponse>(promptContent, systemInstruction, {
    json: true,
    apiKey,
    mockFallback,
  });

  // Post-process to ensure mathematical balance between sections and chapters and strict type validity
  if (result.success && result.data && Array.isArray(result.data.sections)) {
    // Sanitize and normalize all question types to valid system enum values
    result.data.sections = result.data.sections.map((s) => {
      let t = (s.type || "MCQ").trim().toUpperCase().replace(/[\s-]+/g, "_");
      if (t === "ONE_WORD" || t === "ONEWORD" || t === "VSA" || t === "ONE_LINE") {
        t = "VERY_SHORT";
      } else if (!QUESTION_TYPES.includes(t as any)) {
        t = normalizeQuestionType(t);
        if (!QUESTION_TYPES.includes(t as any)) {
          t = "MCQ";
        }
      }
      return {
        ...s,
        type: t,
        count: Math.max(1, Number(s.count) || 1),
        marksEach: Math.max(1, Number(s.marksEach) || 1),
      };
    });

    const totalSecMarks = result.data.sections.reduce(
      (sum, s) => sum + (Number(s.count) || 1) * (Number(s.marksEach) || 1),
      0,
    );
    result.data.totalMarks = totalSecMarks;

    // Filter valid chapters and map to known book chapters
    const validChapters = (result.data.chapters || []).filter(
      (c) => c && typeof c.chapterId === "string" && chapters.some((ch) => ch.id === c.chapterId),
    );

    // If chapters were empty or missing, distribute among provided chapters
    if (validChapters.length === 0 && chapters.length > 0) {
      const perCh = Math.floor(totalSecMarks / chapters.length);
      chapters.forEach((ch, idx) => {
        validChapters.push({
          chapterId: ch.id,
          marks: idx === 0 ? perCh + (totalSecMarks % chapters.length) : perCh,
        });
      });
    }

    // Balance check
    const currentChMarks = validChapters.reduce((sum, c) => sum + (Number(c.marks) || 0), 0);
    const diff = totalSecMarks - currentChMarks;
    if (diff !== 0 && validChapters.length > 0) {
      validChapters[0].marks = Math.max(0, (validChapters[0].marks || 0) + diff);
    }

    result.data.chapters = validChapters;
  }

  return result;
}


