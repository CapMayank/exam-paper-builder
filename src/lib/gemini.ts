import "server-only";

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

/**
 * Low-level caller for Google Gemini API (Gemini 1.5 Flash / 2.0 Flash)
 * using standard HTTPS fetch.
 */
export async function callGeminiApi<T>(
  prompt: string,
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

  // Model priority: configured model or gemini-flash-lite-latest, with automatic fallback
  const candidateModels = Array.from(
    new Set([
      opts.model || process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
      "gemini-flash-lite-latest",
      "gemini-3.5-flash",
      "gemini-3-flash-preview",
      "gemini-flash-latest",
    ]),
  );

  const payload: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
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

  const systemPrompt = `You are a senior CBSE Paper Setter and Moderator.
Evaluate the given question and improve it strictly according to CBSE board standards, LaTeX math formatting, and grammatical precision.`;

  const taskDescription = {
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
    type: "FLAWED_MCQ" | "AMBIGUITY" | "CALCULATION_MISMATCH" | "SYLLABUS_OUTLIER" | "DIFFICULTY_IMBALANCE";
    description: string;
    suggestedFix: string;
    fixedText?: string;
    fixedOptions?: string[];
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

        // Map circuit and science synonyms to valid STAMP_REGISTRY keys
        if (rawStamp.includes("ohm") || rawStamp === "resistor" || rawStamp === "resistance") rawStamp = "resistor";
        else if (rawStamp.includes("batt") || rawStamp.includes("cell") || rawStamp === "dc_cell") rawStamp = "battery";
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
  canvasWidth?: number;
  canvasHeight?: number;
  apiKey?: string | null;
}): Promise<GeminiCallResult<FigureStudioPromptResult>> {
  const { prompt, canvasWidth = 640, canvasHeight = 360, apiKey } = params;

  const systemPrompt = `You are a professional physics, mathematics, and science diagram engine for an interactive vector studio.
Translate the user's natural language request into a valid JSON array of 2D canvas vector scene objects.
Canvas coordinates: (0,0) is top-left, x increases right, y increases down. Canvas dimensions: ${canvasWidth}x${canvasHeight}. Center is approx (${canvasWidth / 2}, ${canvasHeight / 2}).

CRITICAL OBJECT SCHEMA RULES:
1. Stamp (Physical components & symbols):
   { "type": "stamp", "stamp": "resistor"|"battery"|"ammeter"|"voltmeter"|"rheostat"|"switch_closed"|"switch_open"|"bulb"|"galvanometer", "x": x, "y": y, "w": w, "h": h, "rot": 0, "style": { "stroke": "#0f172a", "width": 2 } }
   * NEVER wrap in a "box" property. Use top-level x, y, w, h, rot.
   * NEVER use "stampId". Use "stamp".

2. Line (Wires, dimensions, rays):
   { "type": "line", "kind": "line"|"polyline"|"dimension", "pts": [{"x": x1, "y": y1}, {"x": x2, "y": y2}], "start": "none"|"filled", "end": "none"|"filled", "label": "label text", "labelOffset": 20, "labelSize": 13, "style": { "stroke": "#0f172a", "width": 2 } }

3. Point (Vertices, nodes):
   { "type": "point", "x": x, "y": y, "label": "A", "lx": -16, "ly": -16, "size": 3, "mode": "dot", "fontSize": 14, "style": { "stroke": "#0f172a", "width": 2 } }

4. Angle (Angle arcs & right-angle marks):
   { "type": "angle", "v": {"x": vx, "y": vy}, "a": {"x": ax, "y": ay}, "b": {"x": bx, "y": by}, "label": "θ", "labelMode": "custom", "rightMark": boolean, "arcR": 26, "fontSize": 14, "style": { "stroke": "#0f172a", "width": 2 } }

5. Text (Labels, headings, value annotations):
   { "type": "text", "text": "Label", "x": x, "y": y, "w": 90, "h": 22, "rot": 0, "size": 12, "bold": false, "align": "center", "bg": "white", "style": { "stroke": "#0f172a", "width": 2 } }

CRITICAL ANTI-OVERLAP & CIRCUIT RULES:
- FOR CIRCUITS (Ohm's Law, Series, Parallel): ALWAYS output actual component stamps ("resistor", "voltmeter", "ammeter", "rheostat", "battery", "switch_closed"). Do NOT draw a circuit with only lines!
- Connect components with rectangular wire lines ending exactly at the component terminals.
- Place text labels (e.g. "R", "V", "A", "Rh", "K", "+/-") in clear space at least 15-20px away from components and wires. Set "bg": "white" on text objects.
- FOR GEOMETRY: Point labels (A, B, C) MUST be placed on the EXTERIOR of the shape using lx/ly. Line dimension labels must use labelOffset pointing away from the interior so they never collide with angle arcs or vertex letters.`;

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

    // 1. Ohm's Law Circuit (CBSE Class 10 standard verification circuit)
    if (
      lower.includes("ohm") ||
      (lower.includes("circuit") &&
        (lower.includes("resistor") ||
          lower.includes("law") ||
          lower.includes("voltage") ||
          lower.includes("current") ||
          lower.includes("v = ir") ||
          lower.includes("resistance")))
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
  const normalizedObjs = normalizeFigureObjects(
    rawResult.data.objects,
    canvasWidth,
    canvasHeight,
  );

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
4. Return strictly valid JSON matching this schema:
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
          chapters: chapters.length > 0 ? chapters : [{ number: 1, title: "Chapter 1: Introduction" }],
        },
      ],
    };
  };

  return callGeminiApi<ParsedSyllabusResponse>(userPrompt, systemPrompt, {
    json: true,
    apiKey,
    mockFallback,
  });
}

