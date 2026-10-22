import "server-only";
import { isKindergartenType, QUESTION_TYPES } from "./constants";
import {
  findEligibleDiagrams,
  isSectionVisuallyEligible,
  isSubjectChapterVisual,
  saveDiagramToUploads,
} from "./diagram-search";
import { normalizeQuestionType } from "./paperImport";
import { ensureLanguageNonChapterUnits } from "./syllabusImport";

export interface GeminiCallResult<T> {
  success: boolean;
  isMock: boolean;
  data: T;
  rawResponse?: string;
  error?: string;
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
 * Low-level caller for Google Gemini API (Gemini 1.5 Flash / 2.0 Flash)
 * using standard HTTPS fetch.
 */
export async function callGeminiApi<T>(
  prompt: string | GeminiContentPart[],
  systemInstruction: string,
  opts: {
    json?: boolean;
    apiKey?: string | null;
    model?: string;
    mockFallback?: () => T;
  } = {},
): Promise<GeminiCallResult<T>> {
  const apiKey = getGeminiApiKey(opts.apiKey);

  // If no API key is provided, return intelligent mock response
  if (!apiKey) {
    if (opts.mockFallback) {
      return {
        success: true,
        isMock: true,
        data: opts.mockFallback(),
      };
    }
    return {
      success: false,
      isMock: true,
      error: "No Gemini API key configured. Provide an API key or use demo templates.",
      data: null as unknown as T,
    };
  }

  // Model priority: configured model or gemini-2.5-pro / gemini-2.5-flash, with automatic fallback
  const chosenModel = opts.model || process.env.GEMINI_MODEL;
  const isPro = Boolean(chosenModel?.includes("pro"));
  const fallbackList = isPro
    ? [
        chosenModel!,
        "gemini-2.5-pro",
        "gemini-1.5-pro",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-flash-lite-latest",
      ]
    : [
        chosenModel || "gemini-2.5-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
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

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        lastStatus = res.status;
        lastErrorText = await res.text();
        console.warn(`Gemini API Model ${model} returned ${res.status}. Trying fallback model...`);
        continue;
      }

      const json = await res.json();
      const candidateText =
        json.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (opts.json) {
        // Clean possible markdown code fence ```json ... ```
        const cleaned = candidateText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/, "")
          .replace(/```\s*$/, "")
          .trim();

        const parsedData = JSON.parse(cleaned) as T;
        return {
          success: true,
          isMock: false,
          data: parsedData,
          rawResponse: candidateText,
        };
      }

      return {
        success: true,
        isMock: false,
        data: candidateText as unknown as T,
        rawResponse: candidateText,
      };
    } catch (err: any) {
      console.warn(`Gemini API Model ${model} fetch failed:`, err?.message || err);
    }
  }

  // If all models failed or encountered quota/demand spikes, use graceful fallback if available
  if (opts.mockFallback) {
    return {
      success: true,
      isMock: true,
      data: opts.mockFallback(),
      error: `Gemini API returned status ${lastStatus || 500}. Switched to offline demo fallback.`,
    };
  }

  return {
    success: false,
    isMock: false,
    error: `Gemini API Error (${lastStatus}): ${lastErrorText || "All model endpoints unavailable"}`,
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
  subparts: Array<{ label: string; text: string; marks: number; answer: string }>;
  answer: string;
  marks: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  cognitiveLevel: "REMEMBERING" | "UNDERSTANDING" | "APPLYING" | "ANALYZING" | "EVALUATING";
  explanation?: string;
}

export async function generateQuestionsWithGemini(params: {
  chapter: string;
  className: string;
  subject: string;
  type: string;
  marks: number;
  difficulty: string;
  cognitiveLevel?: string;
  language: "en" | "hi" | "bilingual";
  count: number;
  topicContext?: string;
  apiKey?: string | null;
}): Promise<GeminiCallResult<GeneratedQuestionItem[]>> {
  const { chapter, className, subject, type, marks, difficulty, cognitiveLevel, language, count, topicContext, apiKey } = params;

  const systemPrompt = `You are a strict, experienced CBSE and Indian School Board Senior Examiner and Curriculum Expert.
Your task is to generate high-standard examination questions strictly aligned with NCERT curriculum, Bloom's Taxonomy, and official CBSE blueprinted patterns.
Output format: JSON array of question objects only. No conversational wrapper.`;

  const userPrompt = `Generate ${count} distinct board-aligned question(s) with the following specifications:
- Class: ${className}
- Subject: ${subject}
- Chapter: ${chapter}
- Question Type: ${type} (Options: MCQ, SHORT, LONG, CASE_STUDY, ASSERTION_REASON, NUMERICAL)
- Marks: ${marks} marks each
- Difficulty: ${difficulty}
- Cognitive Level: ${cognitiveLevel || "APPLYING"}
- Language: ${language === "bilingual" ? "Bilingual (English with Hindi translation in parentheses)" : language === "hi" ? "Hindi (Devanagari script)" : "English"}
${topicContext ? `- Specific Topic / Context Focus: ${topicContext}` : ""}

Strict requirements:
1. For MCQ: Provide exactly 4 distinct options with one correct answer. Make distractors conceptually plausible based on common student misconceptions.
2. For ASSERTION_REASON: Provide Assertion (A) and Reason (R), and standard 4 CBSE options:
   (a) Both A and R are true and R is the correct explanation of A
   (b) Both A and R are true but R is not the correct explanation of A
   (c) A is true but R is false
   (d) A is false but R is true
3. For CASE_STUDY: Provide a real-world scenario/passage, followed by 3-4 subparts with label (e.g. "(i)", "(ii)", "(iii)"), question text, marks distribution totaling ${marks} marks, and answers.
4. For SHORT, LONG, NUMERICAL: Provide step-wise model answer and marking scheme breakdown.
5. Use standard LaTeX math $...$ for any mathematical expressions, formulas, chemical reactions, or units.

Return a JSON array strictly matching this TypeScript structure:
[
  {
    "type": "${type}",
    "text": "Question text...",
    "options": ["Option A", "Option B", "Option C", "Option D"], // empty for non-MCQ
    "subparts": [
      { "label": "(i)", "text": "Subpart text", "marks": 1, "answer": "Answer" }
    ], // for case study only
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

    if (type === "MCQ") {
      return [
        {
          type: "MCQ",
          text: `Which of the following observations indicates a chemical change during the reaction of aqueous lead nitrate with potassium iodide? ${
            language === "bilingual" ? "(निम्नलिखित में से कौन सा प्रेक्षण लेड नाइट्रेट और पोटैशियम आयोडाइड की अभिक्रिया में रासायनिक परिवर्तन को दर्शाता है?)" : ""
          }`,
          options: [
            "Formation of a yellow precipitate of $\\text{PbI}_2$",
            "Evolution of pungent brown gas",
            "Dissolution of the test tube glass",
            "Change of liquid temperature to freezing point",
          ],
          subparts: [],
          answer: "Formation of a yellow precipitate of $\\text{PbI}_2$",
          marks: 1,
          difficulty: "MEDIUM",
          cognitiveLevel: "UNDERSTANDING",
          explanation: "Lead nitrate reacts with potassium iodide to precipitate bright yellow lead iodide: $\\text{Pb(NO}_3)_2 + 2\\text{KI} \\rightarrow \\text{PbI}_2\\downarrow + 2\\text{KNO}_3$.",
        },
      ];
    }

    if (type === "ASSERTION_REASON") {
      return [
        {
          type: "ASSERTION_REASON",
          text: `Given below are two statements labeled as Assertion (A) and Reason (R):
Assertion (A): Silver chloride turns grey in sunlight.
Reason (R): Decomposition of silver chloride into silver and chlorine occurs by light. ${
            language === "bilingual" ? "\n(अभिकथन (A): सिल्वर क्लोराइड सूर्य के प्रकाश में धूसर हो जाता है।\nकारण (R): प्रकाश द्वारा सिल्वर क्लोराइड का अपघटन सिल्वर और क्लोरीन में होता है।)" : ""
          }`,
          options: [
            "Both (A) and (R) are true, and (R) is the correct explanation of (A).",
            "Both (A) and (R) are true, but (R) is not the correct explanation of (A).",
            "(A) is true, but (R) is false.",
            "(A) is false, but (R) is true.",
          ],
          subparts: [],
          answer: "Both (A) and (R) are true, and (R) is the correct explanation of (A).",
          marks: 1,
          difficulty: "MEDIUM",
          cognitiveLevel: "ANALYZING",
          explanation: "Photolytic decomposition: $2\\text{AgCl}(s) \\xrightarrow{\\text{sunlight}} 2\\text{Ag}(s) + \\text{Cl}_2(g)$. Grey silver metal is formed.",
        },
      ];
    }

    if (type === "CASE_STUDY") {
      return [
        {
          type: "CASE_STUDY",
          text: `Read the following passage and answer the questions that follow:
A student took three test tubes A, B, and C containing clean iron nails. In tube A, nails were immersed in boiled distilled water covered with oil. In tube B, anhydrous calcium chloride was kept. In tube C, nails were half-immersed in tap water exposed to air. After five days, rusting was observed only in tube C.`,
          options: [],
          subparts: [
            {
              label: "(i)",
              text: "State the essential conditions required for the rusting of iron.",
              marks: 1,
              answer: "Both moisture (water) and air (oxygen) are simultaneously required for rusting.",
            },
            {
              label: "(ii)",
              text: "Why was boiled distilled water with an oil layer used in test tube A?",
              marks: 1,
              answer: "Boiling removes dissolved air/oxygen from water, and the oil layer prevents atmospheric oxygen from re-dissolving.",
            },
            {
              label: "(iii)",
              text: "Write the chemical formula of rust and state one industrial method to prevent it on large iron bridges.",
              marks: 2,
              answer: "Hydrated ferric oxide $\\text{Fe}_2\\text{O}_3 \\cdot x\\text{H}_2\\text{O}$ [1 mark]. Galvanisation (coating with zinc) or sacrificial anode protection [1 mark].",
            },
          ],
          answer: "Refer to subpart answers above (total 4 marks).",
          marks: 4,
          difficulty: "HARD",
          cognitiveLevel: "ANALYZING",
          explanation: "CBSE Case study testing controlled experimental observation on corrosion.",
        },
      ];
    }

    if (type === "MATCH_COLUMN") {
      return [
        {
          type: "MATCH_COLUMN",
          text: `Match the items in Column I with their corresponding features in Column II:\nColumn I:\n(A) Primary factor\n(B) Secondary regulator\n(C) Catalytic center\n(D) Feedback inhibitor`,
          options: [
            "Metabolic activation pathway",
            "Structural stability and conformation",
            "Substrate binding site",
            "Allosteric control regulation",
          ],
          subparts: [],
          answer: "(A)-(i), (B)-(ii), (C)-(iii), (D)-(iv)",
          marks: marks || 4,
          difficulty: (difficulty as any) || "MEDIUM",
          cognitiveLevel: (cognitiveLevel as any) || "UNDERSTANDING",
          explanation: "Curriculum standard match the column exercise.",
        },
      ];
    }

    // Default Short/Long
    return [
      {
        type: type,
        text: `State the balanced chemical equation for the reaction that takes place when quicklime is added to water. Name the type of reaction and state the temperature change observed. ${
          language === "bilingual" ? "(जब बिना बुझे चूने में जल मिलाया जाता है तो होने वाली अभिक्रिया का संतुलित समीकरण लिखिए। इस अभिक्रिया का प्रकार तथा तापमान परिवर्तन बताइए।)" : ""
        }`,
        options: [],
        subparts: [],
        answer: `1. Balanced Equation: $\\text{CaO}(s) + \\text{H}_2\\text{O}(l) \\rightarrow \\text{Ca(OH)}_2(aq) + \\text{Heat}$ [1 mark]
2. Type of Reaction: Combination reaction and Exothermic reaction [1 mark]
3. Observation: The container becomes vigorously hot due to the release of large heat [1 mark]`,
        marks: marks || 3,
        difficulty: "MEDIUM",
        cognitiveLevel: "UNDERSTANDING",
        explanation: "Exothermic synthesis of slaked lime.",
      },
    ];
  };

  return callGeminiApi<GeneratedQuestionItem[]>(userPrompt, systemPrompt, {
    json: true,
    apiKey,
    mockFallback: fallbackQuestions,
  });
}

/* ------------------------------------------------------------------ */
/* 1b. Complete Paper Section Question Generator                     */
/* ------------------------------------------------------------------ */

export interface GeneratePaperSectionSlot {
  slotIndex: number;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  marks: number;
  topicFocus?: string;
}

export interface GeneratePaperSectionInput {
  className: string;
  subject: string;
  sectionTitle: string;
  sectionType: string;
  marksEach: number;
  language: "en" | "hi" | "bilingual";
  difficulty: "BALANCED" | "EASY" | "MEDIUM" | "HARD";
  model?: string;
  teacherFocus?: string;
  generateDiagrams?: boolean;
  slots: GeneratePaperSectionSlot[];
  apiKey?: string | null;
}

export interface GeneratedPaperQuestion {
  slotIndex: number;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  type: string;
  text: string;
  options: string[];
  subparts: Array<{ label: string; text: string; marks: number; answer?: string }>;
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
}

export async function generatePaperSectionWithGemini(
  params: GeneratePaperSectionInput,
): Promise<GeminiCallResult<GeneratedPaperQuestion[]>> {
  const {
    className,
    subject,
    sectionTitle,
    sectionType,
    marksEach,
    language,
    difficulty,
    model,
    teacherFocus,
    generateDiagrams,
    slots,
    apiKey,
  } = params;

  const normalizedType = normalizeQuestionType(sectionType);

  // Check section and chapter visual eligibility
  const sectionEligible = isSectionVisuallyEligible(normalizedType, subject);
  const visualSlotIndices = slots
    .map((s, idx) => (isSubjectChapterVisual(subject, s.chapterTitle, normalizedType) ? idx : -1))
    .filter((idx) => idx !== -1);
  const effectiveGenerateDiagrams = Boolean(
    generateDiagrams && sectionEligible && visualSlotIndices.length > 0
  );

  const systemPrompt = `You are an elite, senior board examiner, question paper setter, and curriculum specialist (CBSE, ICSE, and Indian State Boards).
Your objective is to generate rigorous, authentic, high-standard examination questions for a specific section of a formal board examination paper.

STRICT CURRICULUM & BOARD STANDARDS:
1. All questions must align directly with NCERT / prescribed national curriculum standards and syllabus topics.
2. Maintain precise technical terminology, standard units, and unambiguous phrasing.
3. For Multiple Choice Questions (MCQ): Provide exactly 4 options. Distractors MUST be plausible based on typical misconceptions; never include trivial throwaways.
4. For Assertion-Reason (ASSERTION_REASON): Provide Assertion (A) and Reason (R), and use standard 4 CBSE options:
   (a) Both A and R are true and R is the correct explanation of A
   (b) Both A and R are true but R is not the correct explanation of A
   (c) A is true but R is false
   (d) A is false but R is true
5. For Match the Columns (MATCH_COLUMN): Generate EXACTLY 1 combined question containing all matching pairs across the section slots. Clearly list Column I items in 'text' and Column II items in 'options', with correct pairings in 'answer'.
6. For Case Study (CASE_STUDY): Provide a concise real-world scenario/passage, followed by labeled subparts ((i), (ii), etc.) whose marks sum up exactly to ${marksEach}.
7. For subjective questions (VERY_SHORT, SHORT, LONG): Provide a detailed step-wise model answer and marking scheme breakdown.
8. LaTeX Math: Enclose all mathematical expressions, chemical equations, symbols, and formulas in standard LaTeX $...$ delimiters.
9. Vector Diagram Prompt (Figure Studio): If diagram generation is enabled and a question naturally involves a visual diagram (such as ray optics, electric circuit, organ/tissue structure, Punnett square, geometric shape, or chart), provide a concise description in "figurePrompt". If no diagram is needed, leave "figurePrompt" as null.
10. Return ONLY a valid JSON array of question objects. No markdown wrapping or conversational commentary.`;

  const slotsDescription = slots
    .map(
      (s, idx) =>
        `Question ${idx + 1} (Slot ${s.slotIndex}): Chapter ${s.chapterNumber} - "${s.chapterTitle}" (${s.marks} marks)${
          s.topicFocus ? ` [Topic Focus: ${s.topicFocus}]` : ""
        }`,
    )
    .join("\n");

  const isMatchSection = normalizedType === "MATCH_COLUMN";

  const userPrompt = isMatchSection
    ? `Generate EXACTLY 1 combined Match the Columns question containing all ${slots.length} matching pairs for the following exam section:
- Class: ${className}
- Subject: ${subject}
- Section Title: ${sectionTitle}
- Section Question Type: MATCH_COLUMN
- Total Marks: ${slots.length * marksEach} (${slots.length} pairs × ${marksEach} mark each)
- Language: ${
    language === "bilingual"
      ? "Bilingual (English with Hindi translation in parentheses)"
      : language === "hi"
      ? "Hindi (Devanagari script)"
      : "English"
  }
- Instructions:
  1. Return a JSON array containing EXACTLY ONE question object.
  2. The 'text' field must contain the instruction prompt followed by the list of ${slots.length} Column I items labeled (A), (B), (C), etc., derived from the assigned chapters.
  3. The 'options' array must contain the corresponding ${slots.length} Column II matching items/definitions.
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
    : `Generate ${slots.length} distinct, high-standard question(s) for the following exam section:
- Class: ${className}
- Subject: ${subject}
- Section Title: ${sectionTitle}
- Section Question Type: ${normalizedType}
- Marks Per Question: ${marksEach}
- Language: ${
    language === "bilingual"
      ? "Bilingual (English with Hindi translation in parentheses)"
      : language === "hi"
      ? "Hindi (Devanagari script)"
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
- ONLY provide 'figurePrompt' if the question concept CANNOT be answered without visual input (e.g. geometric figure with lettered vertices, circuit with specific meter readings, anatomical callouts to identify, or visual stimulus in English).
- NEVER attach a diagram to a standard question that can be answered from text alone.
- If a question does not strictly require a diagram, 'figurePrompt' MUST BE null.
- The diagram must specifically depict the exact subject of the question (e.g. flower for flower question, human reproductive system for human reproduction).`
    : `DIAGRAM INSTRUCTIONS:
- No diagrams should be included in this section. 'figurePrompt' MUST BE null for all questions.`
}

Assigned Chapter Targets for each question slot:
${slotsDescription}

JSON Array Output Schema:
[
  {
    "slotIndex": 0,
    "chapterNumber": 1,
    "chapterTitle": "Chapter Name",
    "type": "${normalizedType}",
    "text": "Question text...",
    "options": ["A", "B", "C", "D"], // exactly 4 for MCQ/ASSERTION_REASON, empty [] for subjective
    "subparts": [
      { "label": "(i)", "text": "Subpart question", "marks": 1, "answer": "Model answer" }
    ], // for CASE_STUDY, empty [] for others
    "answer": "Detailed model answer and marking scheme breakdown",
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "cognitiveLevel": "REMEMBERING" | "UNDERSTANDING" | "APPLYING" | "ANALYZING" | "EVALUATING",
    "explanation": "Brief explanation or concept rationale",
    "figurePrompt": "Concise description of diagram to draw" // or null
  }
]`;

  const fallbackQuestions = (): GeneratedPaperQuestion[] => {
    if (normalizedType === "MATCH_COLUMN") {
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
      const romans = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
      const col1Lines = slots.map((s, idx) => `(${letters[idx] ?? idx + 1}) Concept of ${s.chapterTitle}`);
      const col2Items = slots.map((s) => `Key mechanism and definition of ${s.chapterTitle}`);
      const answerPairs = slots.map((_, idx) => `(${letters[idx] ?? idx + 1})-${romans[idx] ?? `(${idx + 1})`}`).join(", ");

      return [
        {
          slotIndex: slots[0]?.slotIndex ?? 0,
          chapterId: slots[0]?.chapterId ?? "",
          chapterNumber: slots[0]?.chapterNumber ?? 1,
          chapterTitle: slots[0]?.chapterTitle ?? "Syllabus Topics",
          type: "MATCH_COLUMN",
          text: `Match the items in Column I with their corresponding concepts in Column II:\nColumn I:\n${col1Lines.join("\n")}`,
          options: col2Items,
          subparts: [],
          answer: answerPairs,
          difficulty: "MEDIUM",
          cognitiveLevel: "UNDERSTANDING",
          explanation: "Standard curriculum matching exercise across syllabus topics.",
        },
      ];
    }

    return slots.map((slot, idx) => {
      const isMcq = normalizedType === "MCQ";
      const isAssertionReason = normalizedType === "ASSERTION_REASON";
      const isTrueFalse = normalizedType === "TRUE_FALSE";
      const isMatch = normalizedType === "MATCH_COLUMN";
      const isCaseStudy = normalizedType === "CASE_STUDY";

      let text = `Examine the fundamental principles of ${slot.chapterTitle}. Describe the core mechanisms and their biological/scientific significance in standard board curriculum context.`;
      let options: string[] = [];
      let subparts: Array<{ label: string; text: string; marks: number; answer?: string }> = [];
      let answer = `Model Answer:\n1. Definition and core principles [${Math.max(1, Math.floor(slot.marks / 2))} marks]\n2. Application and critical observations [${Math.ceil(slot.marks / 2)} marks]`;
      let figurePrompt: string | undefined = undefined;

      if (isMcq) {
        text = `Which of the following statements is correct regarding the core process in ${slot.chapterTitle}?`;
        options = [
          `It operates under regulated physiological pathways in optimal conditions`,
          `It proceeds without any energy investment or enzymatic involvement`,
          `It only occurs in non-living abiotic systems`,
          `It inhibits all associated cellular metabolism`,
        ];
        answer = "Option A";
      } else if (isAssertionReason) {
        text = `Assertion (A): Process X in ${slot.chapterTitle} requires specific regulatory conditions.\nReason (R): Regulatory mechanisms maintain homeostatic equilibrium during cellular activity.`;
        options = [
          "(a) Both A and R are true and R is the correct explanation of A",
          "(b) Both A and R are true but R is not the correct explanation of A",
          "(c) A is true but R is false",
          "(d) A is false but R is true",
        ];
        answer = "(a) Both A and R are true and R is the correct explanation of A";
      } else if (isTrueFalse) {
        text = `In ${slot.chapterTitle}, the primary mechanism proceeds unidirectionally under standard physiological conditions.`;
        options = ["True", "False"];
        answer = "True";
      } else if (isMatch) {
        text = `Match the items in Column I with their corresponding features in Column II:\nColumn I:\n(A) Primary factor\n(B) Secondary regulator\nColumn II:\n(1) Metabolic activation\n(2) Structural stability`;
        options = ["A-1, B-2", "A-2, B-1"];
        answer = "A-1, B-2";
      } else if (isCaseStudy) {
        text = `Read the following excerpt and answer the questions:\nIn a laboratory study of ${slot.chapterTitle}, researchers observed the response of biological specimens to varying external stimuli over a 72-hour period.`;
        subparts = [
          { label: "(i)", text: "Identify the primary independent variable in this experiment.", marks: 1, answer: "External stimuli concentration." },
          { label: "(ii)", text: "State two key observations recorded during the study.", marks: 1, answer: "Rate variation and phenotypic stability." },
          { label: "(iii)", text: "Explain the biochemical rationale for the observed response.", marks: Math.max(1, slot.marks - 2), answer: "Enzymatic kinetics and molecular equilibrium." },
        ];
        answer = "Complete case study evaluation based on subparts.";
      }

      // If diagram generation is requested, apply strict board exam discipline:
      // At most 1 question in the section gets a diagram, and ONLY if chapter is genuinely visual.
      const isSlotVisual =
        effectiveGenerateDiagrams &&
        visualSlotIndices.length > 0 &&
        idx === visualSlotIndices[0];

      if (isSlotVisual) {
        const isLang =
          subject.toLowerCase().includes("english") ||
          subject.toLowerCase().includes("hindi") ||
          subject.toLowerCase().includes("sanskrit") ||
          subject.toLowerCase().includes("language") ||
          normalizedType === "WRITING_SKILL";
        const isBio = subject.toLowerCase().includes("bio");
        const isPhys = subject.toLowerCase().includes("phys") || subject.toLowerCase().includes("sci");
        const isMath = subject.toLowerCase().includes("math");

        if (isLang) {
          text = `Look at the visual stimulus given below regarding environmental conservation and write a coherent paragraph/article in 100-120 words. Highlight key measures to reduce pollution and conserve natural resources.`;
          answer = `Model Answer / Marking Scheme:\n1. Title & Format [1 mark]\n2. Content & Integration of Visual Input [2 marks]\n3. Organization & Expression [1 mark]\n4. Accuracy & Grammar [1 mark]`;
          figurePrompt = `Visual stimulus infographic showing environmental conservation with tree plantation, water drop, and recycling badge`;
        } else if (isBio) {
          const chLower = slot.chapterTitle.toLowerCase();
          if (chLower.includes("flower") || chLower.includes("flowering") || chLower.includes("sexual reproduction in plant")) {
            text = `In the given diagram showing the longitudinal section (L.S.) of a flower, identify labeled parts (A) and (B) and choose the correct option:`;
            options = [
              "(A) Stigma, (B) Anther",
              "(A) Ovary, (B) Petal",
              "(A) Sepal, (B) Filament",
              "(A) Style, (B) Stamen",
            ];
            answer = "(A) Stigma, (B) Anther";
            figurePrompt = `Longitudinal section of a flower with labeled leader lines pointing to parts (A) Stigma and (B) Anther`;
          } else if (chLower.includes("human reproduction") || chLower.includes("reproductive system")) {
            text = `In the given schematic diagram of the human female reproductive system, identify labeled parts (A) and (B):`;
            options = [
              "(A) Ovary, (B) Oviduct (Fallopian Tube)",
              "(A) Uterus, (B) Cervix",
              "(A) Vagina, (B) Ovary",
              "(A) Endometrium, (B) Fimbriae",
            ];
            answer = "(A) Ovary, (B) Oviduct (Fallopian Tube)";
            figurePrompt = `Human female reproductive system diagram with leader lines pointing to parts (A) Ovary and (B) Oviduct`;
          } else if (chLower.includes("inherit") || chLower.includes("gene") || chLower.includes("mendel")) {
            text = `Study the given Punnett square representing a monohybrid cross. Determine the genotypic ratio of the F2 generation and calculate the percentage of heterozygous tall offspring.`;
            answer = `Model Answer:\n1. Genotypic ratio is 1 TT : 2 Tt : 1 tt [1 mark]\n2. Phenotypic ratio is 3 Tall : 1 Dwarf [1 mark]\n3. Percentage of heterozygous tall (Tt) offspring = 50% [${Math.max(1, slot.marks - 2)} marks]`;
            figurePrompt = `Punnett square for monohybrid cross showing parental gametes T, t and F2 offspring TT, Tt, Tt, tt with genotypic and phenotypic ratios`;
          } else if (chLower.includes("eco") || chLower.includes("populat") || chLower.includes("biodivers")) {
            text = `Refer to the ecological trophic pyramid shown below. Identify the trophic level having maximum available energy and explain Lindeman's 10% energy transfer rule.`;
            answer = `Model Answer:\n1. Primary producers have maximum available energy (10,000 J) [1 mark]\n2. According to Lindeman's 10% rule, only 10% of energy is transferred to the next trophic level while 90% is lost as metabolic heat [${Math.max(1, slot.marks - 1)} marks]`;
            figurePrompt = `Ecological trophic pyramid of energy with 4 levels: primary producers (10,000 J), primary consumers (1,000 J), secondary consumers (100 J), and tertiary consumers (10 J)`;
          } else {
            text = `In the given diagram of a plant cell structure, identify labeled parts (A) and (B):`;
            options = [
              "(A) Cell wall, (B) Central vacuole",
              "(A) Cell membrane, (B) Mitochondria",
              "(A) Chloroplast, (B) Ribosome",
              "(A) Nucleus, (B) Endoplasmic reticulum",
            ];
            answer = "(A) Cell wall, (B) Central vacuole";
            figurePrompt = `Diagram of plant cell structure with labeled leader lines pointing to parts (A) cell wall and (B) central vacuole`;
          }
        } else if (isPhys) {
          text = `In the circuit diagram shown below, calculate the total equivalent resistance of the combination and the current reading on ammeter (A).`;
          answer = `Model Answer:\n1. Equivalent resistance calculation: $R_{eq} = R_1 + R_2$ [${Math.max(1, Math.floor(slot.marks / 2))} marks]\n2. Current reading: $I = V / R_{eq}$ [${Math.ceil(slot.marks / 2)} marks]`;
          figurePrompt = `Circuit diagram with voltmeter across resistor R, ammeter in series, rheostat, switch and battery`;
        } else if (isMath) {
          text = `In the given right triangle ABC, right-angled at B with $AB = 6\\text{ cm}$ and $BC = 8\\text{ cm}$, determine the value of $\\sin A$ and $\\cos C$.`;
          answer = `Model Answer:\n1. Hypotenuse $AC = \\sqrt{6^2 + 8^2} = 10\\text{ cm}$ [1 mark]\n2. $\\sin A = 8/10 = 4/5$ [1 mark]\n3. $\\cos C = 8/10 = 4/5$ [${Math.max(1, slot.marks - 2)} marks]`;
          figurePrompt = `Right triangle ABC with right angle at B, AB = 6 cm, BC = 8 cm, AC = 10 cm`;
        }
      }

      return {
        slotIndex: slot.slotIndex,
        chapterId: slot.chapterId,
        chapterNumber: slot.chapterNumber,
        chapterTitle: slot.chapterTitle,
        type: normalizedType,
        text,
        options,
        subparts,
        answer,
        difficulty: idx % 3 === 0 ? "EASY" : idx % 3 === 1 ? "MEDIUM" : "HARD",
        cognitiveLevel: "APPLYING",
        explanation: `Curriculum standard question for Chapter ${slot.chapterNumber}: ${slot.chapterTitle}`,
        figurePrompt,
      };
    });
  };

  const callResult = await callGeminiApi<GeneratedPaperQuestion[]>(userPrompt, systemPrompt, {
    json: true,
    apiKey,
    model: model || "gemini-2.5-pro",
    mockFallback: fallbackQuestions,
  });

  if (!callResult.success || !Array.isArray(callResult.data)) {
    return {
      success: false,
      isMock: callResult.isMock,
      error: callResult.error || "Failed to generate valid question array from AI model.",
      data: [],
    };
  }

  // Handle Match the Columns: Guarantee exactly ONE question containing all pairs across the section slots
  if (normalizedType === "MATCH_COLUMN") {
    const primaryQ = callResult.data[0] || {};
    let qText = typeof primaryQ.text === "string" && primaryQ.text.trim() ? primaryQ.text.trim() : "";
    let qOptions = Array.isArray(primaryQ.options) ? primaryQ.options.map((o: unknown) => String(o).trim()) : [];
    let qAnswer = typeof primaryQ.answer === "string" ? primaryQ.answer : "";

    // If the model returned multiple questions (1 per slot) instead of 1 combined question, collapse them
    if (callResult.data.length > 1) {
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
      const romans = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
      const col1Items: string[] = [];
      const col2Items: string[] = [];
      const answers: string[] = [];

      callResult.data.forEach((item, idx) => {
        const itemText = typeof item.text === "string" ? item.text.replace(/^Match.*?:\s*/i, "").trim() : `Item ${idx + 1}`;
        const itemOpt = Array.isArray(item.options) && item.options.length > 0 ? String(item.options[0]).trim() : (item.answer || `Feature ${idx + 1}`);
        col1Items.push(`(${letters[idx] ?? idx + 1}) ${itemText}`);
        col2Items.push(itemOpt);
        answers.push(`(${letters[idx] ?? idx + 1})-${romans[idx] ?? `(${idx + 1})`}`);
      });

      qText = `Match the items in Column I with Column II:\nColumn I:\n${col1Items.join("\n")}`;
      qOptions = col2Items;
      qAnswer = answers.join(", ");
    } else if (!qText || qOptions.length === 0) {
      const fb = fallbackQuestions()[0];
      qText = fb.text;
      qOptions = fb.options;
      qAnswer = fb.answer;
    }

    const firstSlot = slots[0];
    const singleMatchQ: GeneratedPaperQuestion = {
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
      explanation: primaryQ.explanation || "Curriculum matching exercise across syllabus topics.",
    };

    return {
      success: true,
      isMock: callResult.isMock,
      data: [singleMatchQ],
    };
  }

  // Normalize questions and guarantee correct slot and chapter mapping
  const normalizedQuestions: GeneratedPaperQuestion[] = [];
  let sectionDiagramCount = 0;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const rawQ = callResult.data[i] || {};

    const qType = normalizeQuestionType(rawQ.type || normalizedType);
    const qText = typeof rawQ.text === "string" && rawQ.text.trim() ? rawQ.text.trim() : `Question regarding ${slot.chapterTitle}`;
    const qOptions = Array.isArray(rawQ.options) ? rawQ.options.map((o: unknown) => String(o).trim()) : [];
    const qSubparts = Array.isArray(rawQ.subparts)
      ? rawQ.subparts.map((sp: any, spIdx: number) => ({
          label: String(sp.label || `(${spIdx + 1})`),
          text: String(sp.text || ""),
          marks: Number(sp.marks) || 1,
          answer: sp.answer ? String(sp.answer) : undefined,
        }))
      : [];
    const qAnswer = typeof rawQ.answer === "string" ? rawQ.answer : "Refer to standard model answer.";
    const qDiff = ["EASY", "MEDIUM", "HARD"].includes(rawQ.difficulty) ? rawQ.difficulty : "MEDIUM";
    const figurePrompt = typeof rawQ.figurePrompt === "string" && rawQ.figurePrompt.trim() ? rawQ.figurePrompt.trim() : undefined;

    const questionItem: GeneratedPaperQuestion = {
      slotIndex: slot.slotIndex,
      chapterId: slot.chapterId,
      chapterNumber: slot.chapterNumber,
      chapterTitle: slot.chapterTitle,
      type: qType,
      text: qText,
      options: qOptions,
      subparts: qSubparts,
      answer: qAnswer,
      difficulty: qDiff as "EASY" | "MEDIUM" | "HARD",
      cognitiveLevel: rawQ.cognitiveLevel || "APPLYING",
      explanation: rawQ.explanation,
      figurePrompt,
    };

    // Check whether the question text explicitly references a diagram/figure
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

    const slotIsVisual = isSubjectChapterVisual(subject, slot.chapterTitle, normalizedType);

    // Board examination discipline: At most ONE diagram per section,
    // ONLY if the slot's chapter is visually eligible,
    // and ONLY if the question text explicitly references the figure!
    const allowDiagram = Boolean(
      effectiveGenerateDiagrams &&
      figurePrompt &&
      slotIsVisual &&
      explicitlyNeedsDiagram &&
      sectionDiagramCount === 0
    );

    if (!allowDiagram || !figurePrompt) {
      questionItem.figurePrompt = undefined;
      questionItem.imagePath = undefined;
      questionItem.figureDoc = undefined;
    } else {
      try {
        const eligibleCandidates = await findEligibleDiagrams({
          query: figurePrompt,
          subject,
          chapter: slot.chapterTitle,
          questionText: questionItem.text,
        });

        // Strict threshold: Must be eligible, not off-topic, and score >= 75
        const bestMatch = eligibleCandidates.find(
          (c) => c.eligibility.eligible && c.eligibility.status !== "OFF_TOPIC" && c.eligibility.score >= 75
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

        // If no eligible online diagram was found or saving failed, synthesize in Figure Studio
        if (!questionItem.imagePath) {
          const figRes = await promptToFigureSceneWithGemini({
            prompt: figurePrompt,
            subject,
            apiKey,
          });
          if (figRes.success && figRes.data) {
            questionItem.figureDoc = {
              summary: figRes.data.summary,
              canvasWidth: figRes.data.canvasWidth || 640,
              canvasHeight: figRes.data.canvasHeight || 360,
              objects: normalizeFigureObjects(figRes.data.objects, figRes.data.canvasWidth, figRes.data.canvasHeight),
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

  return {
    success: true,
    isMock: callResult.isMock,
    data: normalizedQuestions,
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
  const { paperTitle, className, subject, totalMarks, questions, apiKey } = params;

  const systemPrompt = `You are the Chief Moderator of the CBSE Board Examination Cell.
Audit the submitted examination paper thoroughly. Evaluate cognitive distribution across Bloom's Taxonomy, verify MCQ integrity (no duplicate/flawed options), verify calculation accuracy, check clarity of instructions, and flag potential student confusion.`;

  const userPrompt = `Audit this complete examination paper:
- Paper: "${paperTitle}"
- Class: ${className}
- Subject: ${subject}
- Total Marks: ${totalMarks}
- Total Questions: ${questions.length}

Questions in Paper:
${JSON.stringify(
  questions.map((q) => ({
    id: q.id,
    number: q.number,
    section: q.sectionTitle,
    type: q.type,
    marks: q.marks,
    difficulty: q.difficulty,
    text: (q.text || "").slice(0, 150),
    options: q.options || [],
    answer: (q.answer || "").slice(0, 80),
  })),
  null,
  2,
)}

CBSE Standard Cognitive Norms:
- Remembering: 20-25%
- Understanding: 30-35%
- Applying: 25-30%
- Analyzing / Evaluating (HOTS): 10-15%

Return a JSON object strictly matching this TypeScript structure:
{
  "paperTitle": "${paperTitle}",
  "totalQuestions": ${questions.length},
  "totalMarks": ${totalMarks},
  "cognitiveBalance": {
    "rememberingPct": 25,
    "understandingPct": 35,
    "applyingPct": 25,
    "analyzingHotsPct": 15,
    "cbseBenchmark": {
      "remembering": "20-25%",
      "understanding": "30-35%",
      "applying": "25-30%",
      "analyzingHots": "10-15%"
    },
    "rating": "EXCELLENT",
    "summary": "Cognitive weightage closely mirrors official CBSE curriculum guidelines."
  },
  "issues": [
    {
      "questionId": "q_id",
      "questionNumber": 1,
      "sectionTitle": "Section A",
      "severity": "HIGH", // HIGH | MEDIUM | LOW
      "type": "FLAWED_MCQ", // FLAWED_MCQ | AMBIGUITY | CALCULATION_MISMATCH | SYLLABUS_OUTLIER | DIFFICULTY_IMBALANCE
      "description": "Specific issue description",
      "suggestedFix": "How the teacher should modify this question",
      "fixedText": "Proposed reworded question text",
      "fixedOptions": ["Option A", "Option B", "Option C", "Option D"] // optional if MCQ
    }
  ],
  "overallVerdict": "Summary report on paper quality, exam cell readiness, and print approval."
}`;

  const mockFallback = (): PaperAuditReport => {
    const issues: PaperAuditReport["issues"] = [];

    // Scan for obvious empty, duplicate, or flawed MCQ options
    questions.forEach((q) => {
      if (q.type === "MCQ") {
        const uniqueOpts = new Set((q.options || []).map((o) => (o || "").trim().toLowerCase()));
        if ((q.options || []).length < 4 || uniqueOpts.size < (q.options || []).length) {
          issues.push({
            questionId: q.id,
            questionNumber: q.number,
            sectionTitle: q.sectionTitle,
            severity: "HIGH",
            type: "FLAWED_MCQ",
            description: "MCQ contains duplicate options or fewer than 4 choices.",
            suggestedFix: "Provide 4 distinct, plausible distractors for standard board alignment.",
            fixedText: q.text,
            fixedOptions: [
              q.options[0] || "Distinct Option A",
              q.options[1] || "Distinct Option B",
              "Alternative Option C",
              "Alternative Option D",
            ],
          });
        } else if (q.options.some((o) => !o || o.trim().length === 0)) {
          issues.push({
            questionId: q.id,
            questionNumber: q.number,
            sectionTitle: q.sectionTitle,
            severity: "HIGH",
            type: "FLAWED_MCQ",
            description: "MCQ contains empty or missing option text.",
            suggestedFix: "Fill in all 4 options (A, B, C, D) before sending to printing.",
            fixedText: q.text,
            fixedOptions: q.options.map((o, idx) => (o && o.trim()) || `Verified Option ${String.fromCharCode(65 + idx)}`),
          });
        }
      }
      if (q.text.length < 15) {
        issues.push({
          questionId: q.id,
          questionNumber: q.number,
          sectionTitle: q.sectionTitle,
          severity: "MEDIUM",
          type: "AMBIGUITY",
          description: "Question statement is unusually brief and may lack sufficient context.",
          suggestedFix: "Expand the problem statement with specific conditions and required units.",
          fixedText: `${q.text} (Provide your answer with appropriate units and justification).`,
        });
      }
    });

    return {
      paperTitle,
      totalQuestions: questions.length,
      totalMarks,
      cognitiveBalance: {
        rememberingPct: 22,
        understandingPct: 38,
        applyingPct: 26,
        analyzingHotsPct: 14,
        cbseBenchmark: {
          remembering: "20-25%",
          understanding: "30-35%",
          applying: "25-30%",
          analyzingHots: "10-15%",
        },
        rating: issues.length > 0 ? "BALANCED" : "EXCELLENT",
        summary:
          "The question paper presents an admirable distribution across Bloom's cognitive tiers. Section A builds confidence with foundational recall, while Sections C and D effectively test higher-order synthesis.",
      },
      issues,
      overallVerdict:
        issues.length === 0
          ? "Certified Ready for Print: Fully compliant with CBSE board pattern and school exam cell standards."
          : `Review Needed: ${issues.length} minor item(s) recommended for teacher refinement prior to print run.`,
    };
  };

  return callGeminiApi<PaperAuditReport>(userPrompt, systemPrompt, {
    json: true,
    apiKey,
    mockFallback,
  });
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
    const isLang = /english|hindi|sanskrit/i.test(subject);
    const sections = isLang
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


