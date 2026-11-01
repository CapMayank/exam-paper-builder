import type { QuestionType } from "./constants";

export type ChoicePolicyType =
  | "NO_CHOICE"
  | "FULL_OR_ALTERNATIVE"
  | "ATTEMPT_K_OF_N"
  | "SELECT_ONE_OF_N";

export interface ChoicePolicy {
  policyType: ChoicePolicyType;
  totalProvided: number;
  totalRequired: number;
  poolScope: "ANY_INCLUDED_CHAPTER" | "SAME_UNIT" | "SAME_CHAPTER";
  rationale: string;
}

export interface BlueprintTemplateSectionGroup {
  title: string;
  instructions: string;
  questionTypes: Array<{
    type: QuestionType;
    count: number;
    marksEach: number;
    orChoiceMode?: "BOARD_DEFAULT" | "REQUIRED" | "NOT_REQUIRED";
    orAlternativeCount?: number;
    orSlots?: boolean[];
    choicePolicy?: ChoicePolicy;
  }>;
}

export interface BlueprintTemplate {
  id: string;
  templateCode: string;
  title: string;
  description: string;
  examType: "QUARTERLY" | "HALF_YEARLY" | "ANNUAL";
  durationMin: number;
  totalMarks: number;
  targetClasses: string;
  classLevel?: number;
  stream?: string;
  subjectCode?: string;
  subjectName?: string;
  variant?: string;
  language?: string;
  archetype: string;
  sections: BlueprintTemplateSectionGroup[];
  provenance?: {
    documentTitle: string;
    circularReference: string;
    theoryMarks: number;
    practicalMarks?: number;
    projectMarks?: number;
  };
}

export interface Circular465Violation {
  slotIndex: number;
  questionNumber?: number;
  sectionTitle: string;
  marksEach: number;
  ruleType: "NO_CHOICE_2M" | "MANDATORY_OR_3M_4M" | "ATTEMPT_K_OF_N_POOL" | "UNIT_POOL_MISMATCH";
  severity: "error";
  message: string;
}

export interface Circular465AuditResult {
  isCompliant: boolean;
  circularReference: "465/विद्योचित/2026";
  violations: Circular465Violation[];
  coveragePercent: number;
}

export type ExaminationTerm = "QUARTERLY" | "HALF_YEARLY" | "PRE_BOARD" | "UNIT_TEST";

export interface TermAdaptationConfig {
  term: ExaminationTerm;
  targetMarks: number;
  durationMin: number;
  proportionalScaling: boolean;
}

export const TERM_CONFIGS: Record<ExaminationTerm, TermAdaptationConfig> = {
  PRE_BOARD: { term: "PRE_BOARD", targetMarks: 75, durationMin: 180, proportionalScaling: false },
  HALF_YEARLY: { term: "HALF_YEARLY", targetMarks: 75, durationMin: 180, proportionalScaling: false },
  QUARTERLY: { term: "QUARTERLY", targetMarks: 50, durationMin: 120, proportionalScaling: true },
  UNIT_TEST: { term: "UNIT_TEST", targetMarks: 25, durationMin: 60, proportionalScaling: true },
};

export function createChoicePolicy(
  policyType: ChoicePolicyType,
  totalProvided: number,
  totalRequired: number,
  poolScope: "ANY_INCLUDED_CHAPTER" | "SAME_UNIT" | "SAME_CHAPTER",
  rationale: string
): ChoicePolicy {
  return { policyType, totalProvided, totalRequired, poolScope, rationale };
}

/**
 * Normalizes raw string question types from DB/seed to canonical QuestionType enum.
 */
export function normalizeQuestionType(raw: string): QuestionType {
  const upper = raw.trim().toUpperCase();
  const mapping: Record<string, QuestionType> = {
    FILL_IN_BLANKS: "FILL_BLANK",
    FILL_BLANK: "FILL_BLANK",
    MATCH_FOLLOWING: "MATCH_COLUMN",
    MATCH_COLUMN: "MATCH_COLUMN",
    ONE_WORD: "VERY_SHORT",
    VERY_SHORT: "VERY_SHORT",
    VERY_SHORT_ANSWER: "VERY_SHORT",
    SHORT_ANSWER: "SHORT",
    SHORT: "SHORT",
    LONG_ANSWER: "LONG",
    LONG: "LONG",
    MCQ: "MCQ",
    TRUE_FALSE: "TRUE_FALSE",
    ASSERTION_REASON: "ASSERTION_REASON",
    CASE_STUDY: "CASE_STUDY",
  };
  return mapping[upper] || "SHORT";
}

/**
 * Validates blueprint sections against statutory Circular 465 rules:
 * - 2-mark questions: choice is strictly abolished (NO_CHOICE / NOT_REQUIRED).
 * - 3-mark and 4-mark questions: internal choice is 100% mandatory (FULL_OR_ALTERNATIVE / REQUIRED).
 */
export function validateCircular465Blueprint(
  sections: Array<{
    title: string;
    type: string;
    count: number;
    marksEach: number;
    orChoiceMode?: string;
    orAlternativeCount?: number | null;
  }>
): Circular465AuditResult {
  const violations: Circular465Violation[] = [];
  let eligibleSlots = 0;
  let compliantSlots = 0;

  for (const [idx, sec] of sections.entries()) {
    if (sec.marksEach === 2) {
      const hasOrCount = (sec.orAlternativeCount ?? 0) > 0;
      if (sec.orChoiceMode === "REQUIRED" || hasOrCount) {
        violations.push({
          slotIndex: idx,
          sectionTitle: sec.title,
          marksEach: 2,
          ruleType: "NO_CHOICE_2M",
          severity: "error",
          message: `Section "${sec.title}" carries 2 marks per question. Internal choice is prohibited under MPBSE Circular 465/2026.`,
        });
      }
    }

    if (sec.marksEach === 3 || sec.marksEach === 4) {
      eligibleSlots += sec.count;
      if (sec.orChoiceMode === "NOT_REQUIRED") {
        violations.push({
          slotIndex: idx,
          sectionTitle: sec.title,
          marksEach: sec.marksEach,
          ruleType: "MANDATORY_OR_3M_4M",
          severity: "error",
          message: `Section "${sec.title}" carries ${sec.marksEach} marks per question. 100% internal choice (OR / अथवा) is mandatory under MPBSE Circular 465/2026.`,
        });
      } else {
        compliantSlots += sec.count;
      }
    }
  }

  const coveragePercent = eligibleSlots > 0 ? Math.round((compliantSlots / eligibleSlots) * 100) : 100;
  return {
    isCompliant: violations.length === 0 && coveragePercent === 100,
    circularReference: "465/विद्योचित/2026",
    violations,
    coveragePercent,
  };
}

// =============================================================================
// ARCHETYPE GENERATORS (SUBJECT-AWARE HEADINGS: EN, HI, SA)
// =============================================================================

function getArchetypeHeading(
  position: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
  rangeOrCountStr: string,
  lang: "sa" | "hi" | "en" = "en"
): { title: string; instructions: string } {
  if (lang === "sa") {
    switch (position) {
      case 1:
        return {
          title: "प्रश्नः १ : उचितं विकल्पं चित्वा लिखत (बहुविकल्पीयप्रश्नाः)",
          instructions: "प्रत्येकं प्रश्नस्य कृते प्रदत्तविकल्पेभ्यः उचितं विकल्पं चित्वा लिखत।",
        };
      case 2:
        return {
          title: "प्रश्नः २ : रिक्तस्थानानि पूरयत (रिक्तस्थानपूर्तिः)",
          instructions: "प्रदत्तैः उचितपदैः रिक्तस्थानानि पूरयत।",
        };
      case 3:
        return {
          title: "प्रश्नः ३ : शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं च 'न' इति लिखत (सत्यासत्यनिरूपणम्)",
          instructions: "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं च 'न' इति लिखत।",
        };
      case 4:
        return {
          title: "प्रश्नः ४ : उचितयुग्ममेलनम्",
          instructions: "स्तम्भ 'अ' इत्यस्य स्तम्भ 'ब' इत्यनेन सह उचितं मेलनं कुरुत।",
        };
      case 5:
        return {
          title: "प्रश्नः ५ : एकपदेन / एकवाक्येन उत्तरं लिखत (एकपदेन उत्तराणि)",
          instructions: "अधोलिखितानां प्रश्नानाम् उत्तराणि एकपदेन अथवा एकवाक्येन लिखत।",
        };
      case 6:
        return {
          title: `प्रश्नः ${rangeOrCountStr.replace("to", "तः")} पर्यन्तम् : अतिलघूत्तरीयप्रश्नाः`,
          instructions: "प्रत्येकं प्रश्नस्य उत्तरं प्रायः ३० शब्देषु लिखत। सर्वे प्रश्नाः अनिवार्याः सन्ति।",
        };
      case 7:
        return {
          title: `प्रश्नः ${rangeOrCountStr.replace("to", "तः")} पर्यन्तम् : लघूत्तरीयप्रश्नाः`,
          instructions: "प्रत्येकं प्रश्नस्य उत्तरं प्रायः ७५ शब्देषु लिखत। आन्तरिकविकल्पः प्रदत्तः अस्ति।",
        };
      case 8:
        return {
          title: `प्रश्नः ${rangeOrCountStr.replace("to", "तः")} पर्यन्तम् : दीर्घोत्तरीयप्रश्नाः`,
          instructions: "प्रत्येकं प्रश्नस्य उत्तरं प्रायः १२० शब्देषु लिखत। आन्तरिकविकल्पः प्रदत्तः अस्ति।",
        };
    }
  }

  if (lang === "hi") {
    switch (position) {
      case 1:
        return {
          title: "प्रश्न 1: सही विकल्प चुनिए (Multiple Choice Questions)",
          instructions: "प्रत्येक प्रश्न के लिए दिए गए विकल्पों में से सही विकल्प चुनकर लिखिए।",
        };
      case 2:
        return {
          title: "प्रश्न 2: रिक्त स्थानों की पूर्ति कीजिए (Fill in the Blanks)",
          instructions: "दिए गए रिक्त स्थानों की सही शब्दों द्वारा पूर्ति कीजिए।",
        };
      case 3:
        return {
          title: "प्रश्न 3: सत्य / असत्य लिखिए (True / False)",
          instructions: "निम्नलिखित कथनों में सत्य अथवा असत्य चुनकर लिखिए।",
        };
      case 4:
        return {
          title: "प्रश्न 4: सही जोड़ी बनाइए (Match the Columns)",
          instructions: "स्तम्भ 'अ' के सम्मुख स्तम्भ 'ब' से सही मिलान कीजिए।",
        };
      case 5:
        return {
          title: "प्रश्न 5: एक शब्द / एक वाक्य में उत्तर दीजिए (One Word / Sentence Answer)",
          instructions: "निम्नलिखित प्रश्नों के उत्तर एक शब्द अथवा एक वाक्य में लिखिए।",
        };
      case 6:
        return {
          title: `प्रश्न ${rangeOrCountStr.replace("to", "से")}: अतिलघुउत्तरीय प्रश्न (Very Short Answer Questions)`,
          instructions: "प्रत्येक प्रश्न का उत्तर लगभग 30 शब्दों में दीजिए। सभी प्रश्न अनिवार्य हैं।",
        };
      case 7:
        return {
          title: `प्रश्न ${rangeOrCountStr.replace("to", "से")}: लघुउत्तरीय प्रश्न (Short Answer Questions)`,
          instructions: "प्रत्येक प्रश्न का उत्तर लगभग 75 शब्दों में दीजिए। आंतरिक विकल्प उपलब्ध हैं।",
        };
      case 8:
        return {
          title: `प्रश्न ${rangeOrCountStr.replace("to", "से")}: दीर्घउत्तरीय / विश्लेषणात्मक प्रश्न (Long Answer Questions)`,
          instructions: "प्रत्येक प्रश्न का उत्तर लगभग 120 शब्दों में दीजिए। आंतरिक विकल्प उपलब्ध हैं।",
        };
    }
  }

  // Default: English for Mathematics, Science, Social Science, Physics, Chemistry, Biology, Commerce, etc.
  switch (position) {
    case 1:
      return {
        title: "Question 1: Multiple Choice Questions",
        instructions: "Choose and write the correct option for each question.",
      };
    case 2:
      return {
        title: "Question 2: Fill in the Blanks",
        instructions: "Fill in the blanks with the correct words.",
      };
    case 3:
      return {
        title: "Question 3: True / False",
        instructions: "Write True or False for the following statements.",
      };
    case 4:
      return {
        title: "Question 4: Match the Columns",
        instructions: "Match the items in Column A with Column B correctly.",
      };
    case 5:
      return {
        title: "Question 5: One Word / Sentence Answer",
        instructions: "Answer the following questions in one word or one sentence.",
      };
    case 6:
      return {
        title: `Questions ${rangeOrCountStr}: Very Short Answer Questions`,
        instructions: "Answer each question in about 30 words. All questions are compulsory.",
      };
    case 7:
      return {
        title: `Questions ${rangeOrCountStr}: Short Answer Questions`,
        instructions: "Answer each question in about 75 words. Internal choice is provided.",
      };
    case 8:
      return {
        title: `Questions ${rangeOrCountStr}: Long Answer Questions`,
        instructions: "Answer each question in about 120 words. Internal choice is provided.",
      };
  }
}

export function generateStandard23Q75MSectionGroups(lang: "sa" | "hi" | "en" = "en"): BlueprintTemplateSectionGroup[] {
  const h1 = getArchetypeHeading(1, "1", lang);
  const h2 = getArchetypeHeading(2, "2", lang);
  const h3 = getArchetypeHeading(3, "3", lang);
  const h4 = getArchetypeHeading(4, "4", lang);
  const h5 = getArchetypeHeading(5, "5", lang);
  const h6 = getArchetypeHeading(6, "6 to 17", lang);
  const h7 = getArchetypeHeading(7, "18 to 20", lang);
  const h8 = getArchetypeHeading(8, "21 to 23", lang);

  return [
    {
      title: h1.title,
      instructions: h1.instructions,
      questionTypes: [
        {
          type: "MCQ",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Circular 465: Objective questions are compulsory"),
        },
      ],
    },
    {
      title: h2.title,
      instructions: h2.instructions,
      questionTypes: [
        {
          type: "FILL_BLANK",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Circular 465: Objective questions are compulsory"),
        },
      ],
    },
    {
      title: h3.title,
      instructions: h3.instructions,
      questionTypes: [
        {
          type: "TRUE_FALSE",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Circular 465: Objective questions are compulsory"),
        },
      ],
    },
    {
      title: h4.title,
      instructions: h4.instructions,
      questionTypes: [
        {
          type: "MATCH_COLUMN",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Circular 465: Objective questions are compulsory"),
        },
      ],
    },
    {
      title: h5.title,
      instructions: h5.instructions,
      questionTypes: [
        {
          type: "VERY_SHORT",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Circular 465: Objective questions are compulsory"),
        },
      ],
    },
    {
      title: h6.title,
      instructions: h6.instructions,
      questionTypes: [
        {
          type: "VERY_SHORT",
          count: 12,
          marksEach: 2,
          orChoiceMode: "NOT_REQUIRED",
          orAlternativeCount: 0,
          choicePolicy: createChoicePolicy("NO_CHOICE", 12, 12, "ANY_INCLUDED_CHAPTER", "Circular 465/2026: Abolition of internal choice in 2-mark questions"),
        },
      ],
    },
    {
      title: h7.title,
      instructions: h7.instructions,
      questionTypes: [
        {
          type: "SHORT",
          count: 3,
          marksEach: 3,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 3-mark questions from same unit"),
        },
      ],
    },
    {
      title: h8.title,
      instructions: h8.instructions,
      questionTypes: [
        {
          type: "LONG",
          count: 3,
          marksEach: 4,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 4-mark questions from same unit"),
        },
      ],
    },
  ];
}

export function generateScience20Q70MSectionGroups(lang: "sa" | "hi" | "en" = "en"): BlueprintTemplateSectionGroup[] {
  const h1 = getArchetypeHeading(1, "1", lang);
  const h2 = getArchetypeHeading(2, "2", lang);
  const h3 = getArchetypeHeading(3, "3", lang);
  const h4 = getArchetypeHeading(4, "4", lang);
  const h5 = getArchetypeHeading(5, "5", lang);
  const h6 = getArchetypeHeading(6, "6 to 12", lang);
  const h7 = getArchetypeHeading(7, "13 to 16", lang);
  const h8 = getArchetypeHeading(8, "17 to 20", lang);

  return [
    {
      title: h1.title,
      instructions: h1.instructions,
      questionTypes: [
        {
          type: "MCQ",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
        },
      ],
    },
    {
      title: h2.title,
      instructions: h2.instructions,
      questionTypes: [
        {
          type: "FILL_BLANK",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
        },
      ],
    },
    {
      title: h3.title,
      instructions: h3.instructions,
      questionTypes: [
        {
          type: "TRUE_FALSE",
          count: 5,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 5, 5, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
        },
      ],
    },
    {
      title: h4.title,
      instructions: h4.instructions,
      questionTypes: [
        {
          type: "MATCH_COLUMN",
          count: 5,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 5, 5, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
        },
      ],
    },
    {
      title: h5.title,
      instructions: h5.instructions,
      questionTypes: [
        {
          type: "VERY_SHORT",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
        },
      ],
    },
    {
      title: h6.title,
      instructions: h6.instructions,
      questionTypes: [
        {
          type: "VERY_SHORT",
          count: 7,
          marksEach: 2,
          orChoiceMode: "NOT_REQUIRED",
          orAlternativeCount: 0,
          choicePolicy: createChoicePolicy("NO_CHOICE", 7, 7, "ANY_INCLUDED_CHAPTER", "Circular 465/2026: Abolition of internal choice in 2-mark questions"),
        },
      ],
    },
    {
      title: h7.title,
      instructions: h7.instructions,
      questionTypes: [
        {
          type: "SHORT",
          count: 4,
          marksEach: 3,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 3-mark questions from same unit"),
        },
      ],
    },
    {
      title: h8.title,
      instructions: h8.instructions,
      questionTypes: [
        {
          type: "LONG",
          count: 4,
          marksEach: 4,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 4-mark questions from same unit"),
        },
      ],
    },
  ];
}

export function generateStandard23Q80MSectionGroups(lang: "sa" | "hi" | "en" = "en"): BlueprintTemplateSectionGroup[] {
  const h1 = getArchetypeHeading(1, "1", lang);
  const h2 = getArchetypeHeading(2, "2", lang);
  const h3 = getArchetypeHeading(3, "3", lang);
  const h4 = getArchetypeHeading(4, "4", lang);
  const h5 = getArchetypeHeading(5, "5", lang);
  const h6 = getArchetypeHeading(6, "6 to 15", lang);
  const h7 = getArchetypeHeading(7, "16 to 19", lang);
  const h8 = getArchetypeHeading(8, "20 to 23", lang);

  return [
    {
      title: h1.title,
      instructions: h1.instructions,
      questionTypes: [
        {
          type: "MCQ",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
        },
      ],
    },
    {
      title: h2.title,
      instructions: h2.instructions,
      questionTypes: [
        {
          type: "FILL_BLANK",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
        },
      ],
    },
    {
      title: h3.title,
      instructions: h3.instructions,
      questionTypes: [
        {
          type: "TRUE_FALSE",
          count: 6,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
        },
      ],
    },
    {
      title: h4.title,
      instructions: h4.instructions,
      questionTypes: [
        {
          type: "MATCH_COLUMN",
          count: 7,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 7, 7, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
        },
      ],
    },
    {
      title: h5.title,
      instructions: h5.instructions,
      questionTypes: [
        {
          type: "VERY_SHORT",
          count: 7,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 7, 7, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
        },
      ],
    },
    {
      title: h6.title,
      instructions: h6.instructions,
      questionTypes: [
        {
          type: "VERY_SHORT",
          count: 10,
          marksEach: 2,
          orChoiceMode: "NOT_REQUIRED",
          orAlternativeCount: 0,
          choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "ANY_INCLUDED_CHAPTER", "Circular 465/2026: Abolition of internal choice in 2-mark questions"),
        },
      ],
    },
    {
      title: h7.title,
      instructions: h7.instructions,
      questionTypes: [
        {
          type: "SHORT",
          count: 4,
          marksEach: 3,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 3-mark questions from same unit"),
        },
      ],
    },
    {
      title: h8.title,
      instructions: h8.instructions,
      questionTypes: [
        {
          type: "LONG",
          count: 4,
          marksEach: 4,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 4-mark questions from same unit"),
        },
      ],
    },
  ];
}

export function generateEnglish16Q75MSectionGroups(): BlueprintTemplateSectionGroup[] {
  return [
    {
      title: "Section A: Reading Comprehension (Unseen Passages)",
      instructions: "Read the passages carefully and answer the questions that follow.",
      questionTypes: [
        {
          type: "MCQ",
          count: 10,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "ANY_INCLUDED_CHAPTER", "Reading comprehension objective items"),
        },
      ],
    },
    {
      title: "Section B: Writing Skills",
      instructions: "Answer the writing section tasks as per instructions.",
      questionTypes: [
        {
          type: "LONG",
          count: 1,
          marksEach: 4,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 1, 1, "ANY_INCLUDED_CHAPTER", "Note Making and Summary"),
        },
        {
          type: "LONG",
          count: 1,
          marksEach: 4,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Formal / Informal Letter Writing with choice"),
        },
        {
          type: "LONG",
          count: 1,
          marksEach: 5,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Long Composition / Essay with choice"),
        },
        {
          type: "SHORT",
          count: 1,
          marksEach: 3,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 1, 1, "ANY_INCLUDED_CHAPTER", "Picture Guided Composition"),
        },
      ],
    },
    {
      title: "Section C: Grammar",
      instructions: "Answer the grammar exercises as directed.",
      questionTypes: [
        {
          type: "FILL_BLANK",
          count: 5,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("ATTEMPT_K_OF_N", 6, 5, "ANY_INCLUDED_CHAPTER", "Grammar: Fill in the blanks (Attempt any 5 of 6)"),
        },
        {
          type: "VERY_SHORT",
          count: 5,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("ATTEMPT_K_OF_N", 6, 5, "ANY_INCLUDED_CHAPTER", "Grammar: Do as directed (Attempt any 5 of 6)"),
        },
      ],
    },
    {
      title: "Section D: Literature (Textbooks)",
      instructions: "Answer textual extracts, short answers, and long answers from prescribed textbooks.",
      questionTypes: [
        {
          type: "MCQ",
          count: 10,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "ANY_INCLUDED_CHAPTER", "Textual extracts (Beehive / Moments / First Flight)"),
        },
        {
          type: "SHORT",
          count: 10,
          marksEach: 2,
          orChoiceMode: "NOT_REQUIRED",
          orAlternativeCount: 0,
          choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "ANY_INCLUDED_CHAPTER", "Circular 465/2026: Abolition of choice in 2-mark questions"),
        },
        {
          type: "LONG",
          count: 3,
          marksEach: 3,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 3-mark questions"),
        },
      ],
    },
  ];
}

export function generateEnglish15Q80MSectionGroups(): BlueprintTemplateSectionGroup[] {
  return [
    {
      title: "Section A: Reading Skills",
      instructions: "Read the unseen passages and complete the comprehension and note-making tasks.",
      questionTypes: [
        {
          type: "MCQ",
          count: 10,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "ANY_INCLUDED_CHAPTER", "Unseen passage comprehension questions"),
        },
        {
          type: "SHORT",
          count: 1,
          marksEach: 4,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 1, 1, "ANY_INCLUDED_CHAPTER", "Note Making and Summary"),
        },
      ],
    },
    {
      title: "Section B: Writing Skills",
      instructions: "Complete the writing tasks following official format and word limits.",
      questionTypes: [
        {
          type: "SHORT",
          count: 1,
          marksEach: 4,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Notice / Advertisement / Poster with choice"),
        },
        {
          type: "LONG",
          count: 1,
          marksEach: 4,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Formal / Informal Letter with choice"),
        },
        {
          type: "LONG",
          count: 1,
          marksEach: 4,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Article / Report / Speech with choice"),
        },
      ],
    },
    {
      title: "Section C: Grammar",
      instructions: "Answer the grammar exercises as directed.",
      questionTypes: [
        {
          type: "FILL_BLANK",
          count: 5,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("ATTEMPT_K_OF_N", 6, 5, "ANY_INCLUDED_CHAPTER", "Sentence fillers (Attempt 5 of 6)"),
        },
        {
          type: "VERY_SHORT",
          count: 5,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("ATTEMPT_K_OF_N", 6, 5, "ANY_INCLUDED_CHAPTER", "Do as directed (Attempt 5 of 6)"),
        },
      ],
    },
    {
      title: "Section D: Textbooks (Flamingo & Vistas)",
      instructions: "Answer extracts, short answers, and long answers from Flamingo and Vistas.",
      questionTypes: [
        {
          type: "MCQ",
          count: 9,
          marksEach: 1,
          orChoiceMode: "NOT_REQUIRED",
          choicePolicy: createChoicePolicy("NO_CHOICE", 9, 9, "ANY_INCLUDED_CHAPTER", "Flamingo extracts"),
        },
        {
          type: "SHORT",
          count: 11,
          marksEach: 2,
          orChoiceMode: "NOT_REQUIRED",
          orAlternativeCount: 0,
          choicePolicy: createChoicePolicy("NO_CHOICE", 11, 11, "ANY_INCLUDED_CHAPTER", "Circular 465/2026: Abolition of choice in 2-mark questions"),
        },
        {
          type: "LONG",
          count: 3,
          marksEach: 3,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Flamingo long answers with choice"),
        },
        {
          type: "LONG",
          count: 1,
          marksEach: 4,
          orChoiceMode: "REQUIRED",
          orAlternativeCount: 1,
          choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Vistas analytical long answer with choice"),
        },
      ],
    },
  ];
}

// =============================================================================
// ALL 27 VERIFIED MPBSE BOARD BLUEPRINT TEMPLATES
// =============================================================================

export const MPBSE_BLUEPRINT_TEMPLATES: BlueprintTemplate[] = [
  // ---------------------------------------------------------------------------
  // CLASS 9 (7 Subjects)
  // ---------------------------------------------------------------------------
  {
    id: "mpbse-9th-hindi-401-75m",
    templateCode: "mpbse-9th-hindi-401-75m",
    title: "MPBSE Class 9 Hindi Official Blueprint (75 Marks)",
    description: "म.प्र. बोर्ड कक्षा 9 हिन्दी आधिकारिक 23-प्रश्नीय अंकयोजना (75 अंक सैद्धांतिक + 25 अंक प्रायोजना कार्य)।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 9",
    classLevel: 9,
    stream: "SECONDARY_GENERAL",
    subjectCode: "401",
    subjectName: "Hindi",
    language: "hi",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("hi"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-9th-english-411-75m",
    templateCode: "mpbse-9th-english-411-75m",
    title: "MPBSE Class 9 English Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 9 English 16-question examination pattern (Reading 10m, Writing 16m, Grammar 10m, Literature 39m).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 9",
    classLevel: 9,
    stream: "SECONDARY_GENERAL",
    subjectCode: "411",
    subjectName: "English",
    language: "en",
    archetype: "ENGLISH_16Q_75M",
    sections: generateEnglish16Q75MSectionGroups(),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-9th-mathematics-standard-100-75m",
    templateCode: "mpbse-9th-mathematics-standard-100-75m",
    title: "MPBSE Class 9 Mathematics Standard Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 9 Mathematics (Standard) 23-question examination blueprint (75 marks).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 9",
    classLevel: 9,
    stream: "SECONDARY_GENERAL",
    subjectCode: "100",
    subjectName: "Mathematics",
    variant: "Standard",
    language: "en",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-9th-mathematics-basic-101-75m",
    templateCode: "mpbse-9th-mathematics-basic-101-75m",
    title: "MPBSE Class 9 Mathematics Basic Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 9 Mathematics (Basic) 23-question examination blueprint (75 marks).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 9",
    classLevel: 9,
    stream: "SECONDARY_GENERAL",
    subjectCode: "101",
    subjectName: "Mathematics",
    variant: "Basic",
    language: "en",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-9th-science-200-75m",
    templateCode: "mpbse-9th-science-200-75m",
    title: "MPBSE Class 9 Science Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 9 Science 23-question examination pattern (75 marks theory + 25 marks practical/project).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 9",
    classLevel: 9,
    stream: "SECONDARY_GENERAL",
    subjectCode: "200",
    subjectName: "Science",
    language: "en",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-9th-social-science-300-75m",
    templateCode: "mpbse-9th-social-science-300-75m",
    title: "MPBSE Class 9 Social Science Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 9 Social Science 23-question pattern (71 marks chapter weightage + 4 marks map work).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 9",
    classLevel: 9,
    stream: "SECONDARY_GENERAL",
    subjectCode: "300",
    subjectName: "Social Science",
    language: "en",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-9th-sanskrit-512-75m",
    templateCode: "mpbse-9th-sanskrit-512-75m",
    title: "MPBSE Class 9 Sanskrit Official Blueprint (75 Marks)",
    description: "म.प्र. बोर्ड कक्षा 9 संस्कृत आधिकारिक 23-प्रश्नीय अंकयोजना (शेमुषी भाग-1 एवं व्याकरणवीथि)।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 9",
    classLevel: 9,
    stream: "SECONDARY_GENERAL",
    subjectCode: "512",
    subjectName: "Sanskrit",
    language: "sa",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("sa"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },

  // ---------------------------------------------------------------------------
  // CLASS 10 (8 Subjects)
  // ---------------------------------------------------------------------------
  {
    id: "mpbse-10th-hindi-401-75m",
    templateCode: "mpbse-10th-hindi-401-75m",
    title: "MPBSE Class 10 Hindi Official Blueprint (75 Marks)",
    description: "म.प्र. बोर्ड कक्षा 10 हिन्दी आधिकारिक 23-प्रश्नीय बोर्ड अंकयोजना (क्षितिज भाग-2 एवं कृतिका भाग-2)।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    classLevel: 10,
    stream: "SECONDARY_GENERAL",
    subjectCode: "401",
    subjectName: "Hindi",
    language: "hi",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("hi"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-10th-english-411-75m",
    templateCode: "mpbse-10th-english-411-75m",
    title: "MPBSE Class 10 English Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 10 English 16-question examination pattern (First Flight & Footprints without Feet).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    classLevel: 10,
    stream: "SECONDARY_GENERAL",
    subjectCode: "411",
    subjectName: "English",
    language: "en",
    archetype: "ENGLISH_16Q_75M",
    sections: generateEnglish16Q75MSectionGroups(),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-10th-mathematics-standard-100-75m",
    templateCode: "mpbse-10th-mathematics-standard-100-75m",
    title: "MPBSE Class 10 Mathematics Standard Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 10 Mathematics (Standard) 23-question examination pattern (30 objective items, 12x2m, 3x3m, 3x4m).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    classLevel: 10,
    stream: "SECONDARY_GENERAL",
    subjectCode: "100",
    subjectName: "Mathematics",
    variant: "Standard",
    language: "en",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-10th-mathematics-basic-101-75m",
    templateCode: "mpbse-10th-mathematics-basic-101-75m",
    title: "MPBSE Class 10 Mathematics Basic Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 10 Mathematics (Basic) 23-question examination pattern per Circular 53/54.",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    classLevel: 10,
    stream: "SECONDARY_GENERAL",
    subjectCode: "101",
    subjectName: "Mathematics",
    variant: "Basic",
    language: "en",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-10th-science-200-75m",
    templateCode: "mpbse-10th-science-200-75m",
    title: "MPBSE Class 10 Science Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 10 Science 23-question examination pattern (75 marks theory + 25 marks practical).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    classLevel: 10,
    stream: "SECONDARY_GENERAL",
    subjectCode: "200",
    subjectName: "Science",
    language: "en",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-10th-social-science-300-75m",
    templateCode: "mpbse-10th-social-science-300-75m",
    title: "MPBSE Class 10 Social Science Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 10 Social Science 23-question examination pattern (History, Geography, Political Science, Economics).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    classLevel: 10,
    stream: "SECONDARY_GENERAL",
    subjectCode: "300",
    subjectName: "Social Science",
    language: "en",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-10th-sanskrit-512-75m",
    templateCode: "mpbse-10th-sanskrit-512-75m",
    title: "MPBSE Class 10 Sanskrit Official Blueprint (75 Marks)",
    description: "म.प्र. बोर्ड कक्षा 10 संस्कृत आधिकारिक 23-प्रश्नीय बोर्ड अंकयोजना (शेमुषी भाग-2 एवं व्याकरणवीथि)।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    classLevel: 10,
    stream: "SECONDARY_GENERAL",
    subjectCode: "512",
    subjectName: "Sanskrit",
    language: "sa",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("sa"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },
  {
    id: "mpbse-10th-urdu-508-75m",
    templateCode: "mpbse-10th-urdu-508-75m",
    title: "MPBSE Class 10 Urdu Official Blueprint (75 Marks)",
    description: "Official MPBSE Class 10 Urdu 23-question examination pattern (75 marks theory).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    classLevel: 10,
    stream: "SECONDARY_GENERAL",
    subjectCode: "508",
    subjectName: "Urdu",
    language: "en",
    archetype: "STANDARD_23Q_75M",
    sections: generateStandard23Q75MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 75,
      projectMarks: 25,
    },
  },

  // ---------------------------------------------------------------------------
  // CLASS 11 (6 Subjects: Science Stream + Compulsory Languages)
  // ---------------------------------------------------------------------------
  {
    id: "mpbse-11th-hindi-051-80m",
    templateCode: "mpbse-11th-hindi-051-80m",
    title: "MPBSE Class 11 Hindi Official Blueprint (80 Marks)",
    description: "म.प्र. बोर्ड कक्षा 11 हिन्दी आधिकारिक 23-प्रश्नीय बोर्ड अंकयोजना (80 अंक सैद्धांतिक + 20 अंक प्रायोजना)।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 80,
    targetClasses: "Class 11",
    classLevel: 11,
    stream: "SECONDARY_GENERAL",
    subjectCode: "051",
    subjectName: "Hindi",
    language: "hi",
    archetype: "STANDARD_23Q_80M",
    sections: generateStandard23Q80MSectionGroups("hi"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 80,
      projectMarks: 20,
    },
  },
  {
    id: "mpbse-11th-english-052-80m",
    templateCode: "mpbse-11th-english-052-80m",
    title: "MPBSE Class 11 English Official Blueprint (80 Marks)",
    description: "Official MPBSE Class 11 English 15-question examination pattern (Hornbill & Snapshots, 80 Marks).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 80,
    targetClasses: "Class 11",
    classLevel: 11,
    stream: "SECONDARY_GENERAL",
    subjectCode: "052",
    subjectName: "English",
    language: "en",
    archetype: "ENGLISH_15Q_80M",
    sections: generateEnglish15Q80MSectionGroups(),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 80,
      projectMarks: 20,
    },
  },
  {
    id: "mpbse-11th-physics-210-70m",
    templateCode: "mpbse-11th-physics-210-70m",
    title: "MPBSE Class 11 Physics Official Blueprint (70 Marks)",
    description: "Official MPBSE Class 11 Physics 20-question blueprint (70 marks theory + 30 marks practical).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 70,
    targetClasses: "Class 11",
    classLevel: 11,
    stream: "SCIENCE",
    subjectCode: "210",
    subjectName: "Physics",
    language: "en",
    archetype: "SCIENCE_20Q_70M",
    sections: generateScience20Q70MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 70,
      practicalMarks: 30,
    },
  },
  {
    id: "mpbse-11th-chemistry-220-70m",
    templateCode: "mpbse-11th-chemistry-220-70m",
    title: "MPBSE Class 11 Chemistry Official Blueprint (70 Marks)",
    description: "Official MPBSE Class 11 Chemistry 20-question blueprint (70 marks theory + 30 marks practical).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 70,
    targetClasses: "Class 11",
    classLevel: 11,
    stream: "SCIENCE",
    subjectCode: "220",
    subjectName: "Chemistry",
    language: "en",
    archetype: "SCIENCE_20Q_70M",
    sections: generateScience20Q70MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 70,
      practicalMarks: 30,
    },
  },
  {
    id: "mpbse-11th-biology-231-70m",
    templateCode: "mpbse-11th-biology-231-70m",
    title: "MPBSE Class 11 Biology Official Blueprint (70 Marks)",
    description: "Official MPBSE Class 11 Biology 20-question blueprint (70 marks theory + 30 marks practical).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 70,
    targetClasses: "Class 11",
    classLevel: 11,
    stream: "SCIENCE_BIO",
    subjectCode: "231",
    subjectName: "Biology",
    language: "en",
    archetype: "SCIENCE_20Q_70M",
    sections: generateScience20Q70MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 70,
      practicalMarks: 30,
    },
  },
  {
    id: "mpbse-11th-mathematics-150-80m",
    templateCode: "mpbse-11th-mathematics-150-80m",
    title: "MPBSE Class 11 Mathematics Official Blueprint (80 Marks)",
    description: "Official MPBSE Class 11 Mathematics 23-question blueprint (80 marks theory + 20 marks project).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 80,
    targetClasses: "Class 11",
    classLevel: 11,
    stream: "SCIENCE_PCM",
    subjectCode: "150",
    subjectName: "Mathematics",
    language: "en",
    archetype: "STANDARD_23Q_80M",
    sections: generateStandard23Q80MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 80,
      projectMarks: 20,
    },
  },

  // ---------------------------------------------------------------------------
  // CLASS 12 (6 Subjects: Science Stream + Compulsory Languages)
  // ---------------------------------------------------------------------------
  {
    id: "mpbse-12th-hindi-051-80m",
    templateCode: "mpbse-12th-hindi-051-80m",
    title: "MPBSE Class 12 Hindi Official Blueprint (80 Marks)",
    description: "म.प्र. बोर्ड कक्षा 12 हिन्दी आधिकारिक 23-प्रश्नीय बोर्ड अंकयोजना (आरोह भाग-2 एवं वितान भाग-2)।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 80,
    targetClasses: "Class 12",
    classLevel: 12,
    stream: "SECONDARY_GENERAL",
    subjectCode: "051",
    subjectName: "Hindi",
    language: "hi",
    archetype: "STANDARD_23Q_80M",
    sections: generateStandard23Q80MSectionGroups("hi"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 80,
      projectMarks: 20,
    },
  },
  {
    id: "mpbse-12th-english-052-80m",
    templateCode: "mpbse-12th-english-052-80m",
    title: "MPBSE Class 12 English Official Blueprint (80 Marks)",
    description: "Official MPBSE Class 12 English 15-question examination pattern (Flamingo & Vistas, 80 Marks).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 80,
    targetClasses: "Class 12",
    classLevel: 12,
    stream: "SECONDARY_GENERAL",
    subjectCode: "052",
    subjectName: "English",
    language: "en",
    archetype: "ENGLISH_15Q_80M",
    sections: generateEnglish15Q80MSectionGroups(),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 80,
      projectMarks: 20,
    },
  },
  {
    id: "mpbse-12th-physics-210-70m",
    templateCode: "mpbse-12th-physics-210-70m",
    title: "MPBSE Class 12 Physics Official Blueprint (70 Marks)",
    description: "Official MPBSE Class 12 Physics 20-question examination pattern (70 marks theory + 30 marks practical).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 70,
    targetClasses: "Class 12",
    classLevel: 12,
    stream: "SCIENCE",
    subjectCode: "210",
    subjectName: "Physics",
    language: "en",
    archetype: "SCIENCE_20Q_70M",
    sections: generateScience20Q70MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 70,
      practicalMarks: 30,
    },
  },
  {
    id: "mpbse-12th-chemistry-220-70m",
    templateCode: "mpbse-12th-chemistry-220-70m",
    title: "MPBSE Class 12 Chemistry Official Blueprint (70 Marks)",
    description: "Official MPBSE Class 12 Chemistry 20-question examination pattern (70 marks theory + 30 marks practical).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 70,
    targetClasses: "Class 12",
    classLevel: 12,
    stream: "SCIENCE",
    subjectCode: "220",
    subjectName: "Chemistry",
    language: "en",
    archetype: "SCIENCE_20Q_70M",
    sections: generateScience20Q70MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 70,
      practicalMarks: 30,
    },
  },
  {
    id: "mpbse-12th-biology-231-70m",
    templateCode: "mpbse-12th-biology-231-70m",
    title: "MPBSE Class 12 Biology Official Blueprint (70 Marks)",
    description: "Official MPBSE Class 12 Biology 20-question examination pattern (70 marks theory + 30 marks practical).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 70,
    targetClasses: "Class 12",
    classLevel: 12,
    stream: "SCIENCE_BIO",
    subjectCode: "231",
    subjectName: "Biology",
    language: "en",
    archetype: "SCIENCE_20Q_70M",
    sections: generateScience20Q70MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 70,
      practicalMarks: 30,
    },
  },
  {
    id: "mpbse-12th-mathematics-150-80m",
    templateCode: "mpbse-12th-mathematics-150-80m",
    title: "MPBSE Class 12 Mathematics Official Blueprint (80 Marks)",
    description: "Official MPBSE Class 12 Mathematics 23-question examination pattern (80 marks theory + 20 marks project).",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 80,
    targetClasses: "Class 12",
    classLevel: 12,
    stream: "SCIENCE_PCM",
    subjectCode: "150",
    subjectName: "Mathematics",
    language: "en",
    archetype: "STANDARD_23Q_80M",
    sections: generateStandard23Q80MSectionGroups("en"),
    provenance: {
      documentTitle: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      circularReference: "465/विद्योचित/2026",
      theoryMarks: 80,
      projectMarks: 20,
    },
  },
];

// =============================================================================
// LEGACY & STARTER TEMPLATES PRESERVED FOR FULL BACKWARD COMPATIBILITY
// =============================================================================

export const LEGACY_STARTER_TEMPLATES: BlueprintTemplate[] = [
  {
    id: "mpbse-sanskrit-10th-75m",
    templateCode: "mpbse-10th-sanskrit-shemushi-75m",
    title: "MPBSE संस्कृतम् कक्षा 10 (75 अङ्काः - आधिकारिक 23-प्रश्नीय प्रतिरूप)",
    description: "म.प्र. माध्यमिक शिक्षा मण्डल (MPBSE) द्वारा शैक्षणिक सत्र 2026–27 के लिए जारी आधिकारिक अभ्यास मॉडल प्रश्नपत्र अनुसार 23-प्रश्नीय, 75-अङ्कीय पूर्ण संरचना (कोड 512, शेमुषी भाग-2 एवं व्याकरणवीथि)।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    language: "sa",
    subjectCode: "512",
    archetype: "SANSKRIT_23Q_75M",
    sections: [
      {
        title: "प्रश्न 1: उचितविकल्पं चित्वा लिखत (बहुविकल्प)",
        instructions: "उचितविकल्पं चित्वा लिखत (शब्दरूप, विभक्ति, अव्यय, वचन, पुरुष) [प्रश्नक्रमाङ्कः 1]:",
        questionTypes: [
          { type: "MCQ", count: 6, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 2: शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत",
        instructions: "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत (लकार, पुरुष, वचन, उपसर्ग) [प्रश्नक्रमाङ्कः 2]:",
        questionTypes: [
          { type: "TRUE_FALSE", count: 6, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 3: उचितयुग्ममेलनं कुरुत",
        instructions: "स्तम्भ 'अ' सह स्तम्भ 'ब' इत्यस्य समुचितं मेलनं कुरुत (सन्धि एवं समास) [प्रश्नक्रमाङ्कः 3]:",
        questionTypes: [
          { type: "MATCH_COLUMN", count: 6, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 4: एकपदेन उत्तरं लिखत",
        instructions: "एकपदेन उत्तरं संस्कृतभाषया लिखत (प्रत्यय एवं पाठ्यसूक्तयः) [प्रश्नक्रमाङ्कः 4]:",
        questionTypes: [
          { type: "VERY_SHORT", count: 6, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 5: प्रदत्तशब्दैः रिक्तस्थानपूर्तिं कुरुत",
        instructions: "कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत (पर्यायवाची, विलोम, विशेषण-विशेष्य) [प्रश्नक्रमाङ्कः 5]:",
        questionTypes: [
          { type: "FILL_BLANK", count: 6, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 6 तः 10: पाठ्याधारित-लघूत्तरीयप्रश्नाः",
        instructions: "अधोलिखितानां पञ्चप्रश्नानाम् उत्तराणि संस्कृतभाषया पूर्णवाक्येन लिखत (प्रश्नक्रमाङ्कः 6 तः 10 पर्यन्तम्):",
        questionTypes: [
          { type: "SHORT", count: 5, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 11: श्लोकलेखनम् (सुभाषितम्)",
        instructions: "स्वपाठ्यपुस्तकस्य एकं सुभाषितं लिखत यत् अस्मिन् प्रश्नपत्रे न स्यात् (प्रश्नक्रमाङ्कः 11):",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 12: घटनाक्रमानुसारं कथाक्रमसंयोजनम्",
        instructions: "अधोलिखितानि चत्वारि वाक्यानि कथाक्रमानुसारेण योजयत (½ × 4 = 2) [प्रश्नक्रमाङ्कः 12]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 13: रेखांकितपदानाम् आधारेण प्रश्ननिर्माणम्",
        instructions: "स्थूलाक्षरपदानि आधृत्य चतुर्णां वाक्यानां प्रश्ननिर्माणं कुरुत (½ × 4 = 2) [प्रश्नक्रमाङ्कः 13]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 14: कः कं प्रति कथयति",
        instructions: "अधोलिखितानि वाक्यानि कः कं प्रति कथयति इति लिखत (1 × 2 = 2) [प्रश्नक्रमाङ्कः 14]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 15: अशुद्धकारक-वाक्यसंशोधनम्",
        instructions: "अधोलिखितयोः द्वयोः अशुद्धकारकवाक्ययोः शुद्धिं कुरुत (1 × 2 = 2) [प्रश्नक्रमाङ्कः 15]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 16: पाठ्याधारित-रिक्तस्थानपूर्तिः",
        instructions: "अधोलिखितानि चत्वारि रिक्तस्थानानि पाठ्याधारेण पूरयत (½ × 4 = 2) [प्रश्नक्रमाङ्कः 16]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 17: वाच्य-परिवर्तनम्",
        instructions: "निर्देशानुसारं द्वयोः वाक्ययोः वाच्यपरिवर्तनं कुरुत (1 × 2 = 2) [प्रश्नक्रमाङ्कः 17]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 18: गद्यांश-आधारित-प्रश्नाः",
        instructions: "अधोलिखितं गद्यांशं पठित्वा प्रश्नानाम् उत्तराणि संस्कृतभाषया लिखत (स-विकल्पम्, 1 × 3 = 3) [प्रश्नक्रमाङ्कः 18]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 3, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 19: पद्यांश-आधारित-प्रश्नाः",
        instructions: "अधोलिखितं पद्यांशं पठित्वा प्रश्नानाम् उत्तराणि संस्कृतभाषया लिखत (स-विकल्पम्, 1 × 3 = 3) [प्रश्नक्रमाङ्कः 19]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 3, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 20: नाट्यांश-आधारित-प्रश्नाः",
        instructions: "अधोलिखितं नाट्यांशं पठित्वा प्रश्नानाम् उत्तराणि संस्कृतभाषया लिखत (स-विकल्पम्, 1 × 3 = 3) [प्रश्नक्रमाङ्कः 20]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 3, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 21: अपठित-गद्यांश-अवबोधनम्",
        instructions: "अपठितं गद्यांशं पठित्वा पञ्चप्रश्नेषु केषाञ्चित् चतुर्णां प्रश्नानाम् उत्तराणि लिखत (1 × 4 = 4) [प्रश्नक्रमाङ्कः 21]:",
        questionTypes: [
          { type: "LONG", count: 1, marksEach: 4, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 22: पत्रलेखनम् / प्रार्थनापत्रम्",
        instructions: "स्वविवाहस्य कृते मित्राय निमन्त्रणपत्रं अथवा स्थानान्तरणप्रमाणपत्रार्थं प्राचार्यं प्रति प्रार्थनापत्रं लिखत (4 अङ्काः) [प्रश्नक्रमाङ्कः 22]:",
        questionTypes: [
          { type: "LONG", count: 1, marksEach: 4, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 23: संस्कृत-निबन्ध-लेखनम्",
        instructions: "अधोलिखितेषु एकं विषयं चित्वा शतशब्देषु संस्कृतनिबन्धं लिखत (4 अङ्काः) [प्रश्नक्रमाङ्कः 23]: (1) मम प्रियः कविः, (2) आचारस्य महत्त्वम्, (3) अस्माकं देशः, (4) देववाण्याः महत्त्वम्",
        questionTypes: [
          { type: "LONG", count: 1, marksEach: 4, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
    ],
  },
  {
    id: "mpbse-sanskrit-10th-legacy-75m",
    templateCode: "mpbse-sanskrit-10th-legacy-75m",
    title: "MPBSE संस्कृतम् कक्षा 10 (75 अङ्काः - पारम्परिक 8-खण्डीय प्रतिरूप)",
    description: "पारम्परिक 8-खण्डीय संरचना (खण्ड क तः ज पर्यन्तम्) - बहुविकल्प, रिक्तस्थान, शुद्ध-अशुद्ध, मेलन, लघूत्तरीय एवं दीर्घप्रश्नाः।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    language: "sa",
    subjectCode: "512",
    archetype: "SANSKRIT_8SEC_75M",
    sections: [
      {
        title: "खण्डः 'क' : बहुविकल्पीयप्रश्नाः",
        instructions: "उचितविकल्पं चित्वा लिखत (प्रश्नक्रमाङ्कः 1):",
        questionTypes: [
          { type: "MCQ", count: 6, marksEach: 1 },
        ],
      },
      {
        title: "खण्डः 'ख' : रिक्तस्थानपूर्तिः",
        instructions: "कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत (प्रश्नक्रमाङ्कः 2):",
        questionTypes: [
          { type: "FILL_BLANK", count: 6, marksEach: 1 },
        ],
      },
      {
        title: "खण्डः 'ग' : शुद्ध/अशुद्धवाक्यनिरूपणम्",
        instructions: "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत (प्रश्नक्रमाङ्कः 3):",
        questionTypes: [
          { type: "TRUE_FALSE", count: 6, marksEach: 1 },
        ],
      },
      {
        title: "खण्डः 'घ' : उचितयुग्ममेलनम्",
        instructions: "स्तम्भ 'अ' सह स्तम्भ 'ब' इत्यस्य समुचितं मेलनं कुरुत (प्रश्नक्रमाङ्कः 4):",
        questionTypes: [
          { type: "MATCH_COLUMN", count: 1, marksEach: 6 },
        ],
      },
      {
        title: "खण्डः 'ङ' : एकपदेन उत्तरत",
        instructions: "एकपदेन/वाक्येन संस्कृतभाषया उत्तरं लिखत (प्रश्नक्रमाङ्कः 5):",
        questionTypes: [
          { type: "VERY_SHORT", count: 6, marksEach: 1 },
        ],
      },
      {
        title: "खण्डः 'च' : लघूत्तरीयप्रश्नाः",
        instructions: "अधोलिखितानां प्रश्नानाम् उत्तराणि संस्कृतभाषया लिखत (प्रत्येकं 2 अङ्कौ):",
        questionTypes: [
          { type: "SHORT", count: 12, marksEach: 2 },
        ],
      },
      {
        title: "खण्डः 'छ' : पाठाधारित-अवबोधनम्",
        instructions: "गद्यांश-पद्यांश-नाट्यांशान् पठित्वा प्रश्नानाम् उत्तराणि लिखत (स-विकल्पम्, प्रत्येकं 3 अङ्काः):",
        questionTypes: [
          { type: "SHORT", count: 3, marksEach: 3, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "खण्डः 'ज' : दीर्घावबोधनम् एवं रचनात्मककार्यम्",
        instructions: "अपठितगद्यांश, पत्रलेखनम् एवं निबन्धलेखनम् (प्रत्येकं 4 अङ्काः):",
        questionTypes: [
          { type: "LONG", count: 3, marksEach: 4, orChoiceMode: "REQUIRED" },
        ],
      },
    ],
  },
  {
    id: "cbse-80m-5sec",
    templateCode: "cbse-standard-80m-5sec",
    title: "CBSE Standard Board Pattern (80 Marks)",
    description: "Official 5-Section pattern (A to E) used for Class 9–10 Board exams in Math, Science, and Social Science.",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 80,
    targetClasses: "Classes 9, 10, 11, 12",
    archetype: "CBSE_80M",
    sections: [
      {
        title: "Section A",
        instructions: "Questions 1 to 20 carry 1 mark each. Select the correct option.",
        questionTypes: [
          { type: "MCQ", count: 18, marksEach: 1 },
          { type: "ASSERTION_REASON", count: 2, marksEach: 1 },
        ],
      },
      {
        title: "Section B",
        instructions: "Questions 21 to 26 carry 2 marks each. Very short answer questions.",
        questionTypes: [
          { type: "VERY_SHORT", count: 6, marksEach: 2 },
        ],
      },
      {
        title: "Section C",
        instructions: "Questions 27 to 33 carry 3 marks each. Short answer questions.",
        questionTypes: [
          { type: "SHORT", count: 7, marksEach: 3 },
        ],
      },
      {
        title: "Section D",
        instructions: "Questions 34 to 36 carry 5 marks each. Long answer questions.",
        questionTypes: [
          { type: "LONG", count: 3, marksEach: 5 },
        ],
      },
      {
        title: "Section E",
        instructions: "Questions 37 to 39 carry 4 marks each. Case-study / passage-based integrated questions.",
        questionTypes: [
          { type: "CASE_STUDY", count: 3, marksEach: 4 },
        ],
      },
    ],
  },
  {
    id: "cbse-science-70m",
    templateCode: "cbse-senior-science-70m",
    title: "CBSE Senior Secondary Science (70 Marks Theory)",
    description: "Standard 70-mark theory paper for Class 11–12 Physics, Chemistry, and Biology.",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 70,
    targetClasses: "Classes 11, 12",
    archetype: "CBSE_70M",
    sections: [
      {
        title: "Section A",
        instructions: "Questions 1 to 16 are objective questions carrying 1 mark each.",
        questionTypes: [
          { type: "MCQ", count: 12, marksEach: 1 },
          { type: "ASSERTION_REASON", count: 4, marksEach: 1 },
        ],
      },
      {
        title: "Section B",
        instructions: "Questions 17 to 21 carry 2 marks each.",
        questionTypes: [
          { type: "SHORT", count: 5, marksEach: 2 },
        ],
      },
      {
        title: "Section C",
        instructions: "Questions 22 to 28 carry 3 marks each.",
        questionTypes: [
          { type: "SHORT", count: 7, marksEach: 3 },
        ],
      },
      {
        title: "Section D",
        instructions: "Questions 29 and 30 are case-study based questions carrying 4 marks each.",
        questionTypes: [
          { type: "CASE_STUDY", count: 2, marksEach: 4 },
        ],
      },
      {
        title: "Section E",
        instructions: "Questions 31 to 33 carry 5 marks each with internal choice.",
        questionTypes: [
          { type: "LONG", count: 3, marksEach: 5 },
        ],
      },
    ],
  },
  {
    id: "middle-school-50m",
    templateCode: "middle-school-50m",
    title: "Middle School Term Exam (50 Marks)",
    description: "Balanced 4-section pattern for Class 6–8 Half-Yearly / Annual examinations.",
    examType: "HALF_YEARLY",
    durationMin: 120,
    totalMarks: 50,
    targetClasses: "Classes 6, 7, 8",
    archetype: "MIDDLE_SCHOOL_50M",
    sections: [
      {
        title: "Section A",
        instructions: "Choose the correct option. All questions are compulsory.",
        questionTypes: [
          { type: "MCQ", count: 10, marksEach: 1 },
        ],
      },
      {
        title: "Section B",
        instructions: "Answer in one or two sentences.",
        questionTypes: [
          { type: "VERY_SHORT", count: 6, marksEach: 2 },
        ],
      },
      {
        title: "Section C",
        instructions: "Short answer questions. Answer in 40–50 words.",
        questionTypes: [
          { type: "SHORT", count: 6, marksEach: 3 },
        ],
      },
      {
        title: "Section D",
        instructions: "Long answer questions. Draw neat labelled diagrams where required.",
        questionTypes: [
          { type: "LONG", count: 2, marksEach: 5 },
        ],
      },
    ],
  },
  {
    id: "unit-test-25m",
    templateCode: "unit-test-25m",
    title: "Periodic Unit Test / Assessment (25 Marks)",
    description: "Compact 1-hour assessment pattern ideal for unit tests and monthly revision tests.",
    examType: "QUARTERLY",
    durationMin: 60,
    totalMarks: 25,
    targetClasses: "Classes 3 to 10",
    archetype: "UNIT_TEST_25M",
    sections: [
      {
        title: "Section A",
        instructions: "Objective questions carrying 1 mark each.",
        questionTypes: [
          { type: "MCQ", count: 5, marksEach: 1 },
        ],
      },
      {
        title: "Section B",
        instructions: "Short answer questions carrying 2 marks each.",
        questionTypes: [
          { type: "SHORT", count: 4, marksEach: 2 },
        ],
      },
      {
        title: "Section C",
        instructions: "Detailed answer questions carrying 3 marks each.",
        questionTypes: [
          { type: "SHORT", count: 4, marksEach: 3 },
        ],
      },
    ],
  },
  {
    id: "kindergarten-foundational-25m",
    templateCode: "kindergarten-foundational-25m",
    title: "Foundational & Pre-Primary Activity (25 Marks)",
    description: "Interactive tracing, matching, and counting pattern for Nursery, LKG, and UKG classes.",
    examType: "QUARTERLY",
    durationMin: 60,
    totalMarks: 25,
    targetClasses: "Nursery, LKG, UKG, Class 1",
    archetype: "KINDERGARTEN_25M",
    sections: [
      {
        title: "Section A",
        instructions: "Letter & Pattern Tracing Activity",
        questionTypes: [
          { type: "KDG_TRACE_WRITE", count: 5, marksEach: 1 },
        ],
      },
      {
        title: "Section B",
        instructions: "Count Objects and Match Numbers",
        questionTypes: [
          { type: "KDG_COUNT_ITEMS", count: 5, marksEach: 2 },
        ],
      },
      {
        title: "Section C",
        instructions: "Picture Recognition and Odd One Out",
        questionTypes: [
          { type: "KDG_CIRCLE_TARGET", count: 5, marksEach: 2 },
        ],
      },
    ],
  },
];

export const STANDARD_BLUEPRINT_TEMPLATES: BlueprintTemplate[] = [
  ...MPBSE_BLUEPRINT_TEMPLATES,
  ...LEGACY_STARTER_TEMPLATES,
];

// =============================================================================
// HAMILTON-HARE PROPORTIONAL ADAPTATION HELPER
// =============================================================================

/**
 * Distributes targetMarks across active chapters proportionally using the
 * Hamilton-Hare Largest Remainder Method, ensuring exact sum without rounding drift.
 */
export function adaptChaptersHamiltonHare<T extends { chapterId: string; officialMarks?: number; marks?: number }>(
  activeChapters: T[],
  targetMarks: number,
  minDenomination = 1
): Array<T & { marks: number }> {
  if (activeChapters.length === 0) return [];
  if (activeChapters.length === 1) {
    return [{ ...activeChapters[0], marks: targetMarks }];
  }

  const officialSum = activeChapters.reduce(
    (sum, ch) => sum + (ch.officialMarks != null && ch.officialMarks > 0 ? ch.officialMarks : ch.marks != null && ch.marks > 0 ? ch.marks : 1),
    0
  );

  const rawAllocations = activeChapters.map((ch) => {
    const baseWeight =
      ch.officialMarks != null && ch.officialMarks > 0 ? ch.officialMarks : ch.marks != null && ch.marks > 0 ? ch.marks : 1;
    const exact = (baseWeight / officialSum) * targetMarks;
    const integerPart = Math.floor(exact);
    const remainder = exact - integerPart;
    return { ch, exact, integerPart, remainder };
  });

  const integerSum = rawAllocations.reduce((s, r) => s + r.integerPart, 0);
  const remainderCount = targetMarks - integerSum;

  // Sort by remainder descending, break ties by original chapter order
  rawAllocations.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remainderCount; i++) {
    rawAllocations[i].integerPart += 1;
  }

  // Ensure minimum denomination constraint per chapter
  const adjusted = rawAllocations.map((r) => {
    let finalMarks = Math.max(minDenomination, r.integerPart);
    return { ...r.ch, marks: finalMarks };
  });

  // Re-level total to exactly targetMarks if minDenomination bumped it over
  let currentTotal = adjusted.reduce((s, a) => s + a.marks, 0);
  while (currentTotal > targetMarks) {
    // Find chapter with largest marks above minDenomination and decrement
    let maxIdx = -1;
    let maxVal = -1;
    for (let i = 0; i < adjusted.length; i++) {
      if (adjusted[i].marks > minDenomination && adjusted[i].marks > maxVal) {
        maxVal = adjusted[i].marks;
        maxIdx = i;
      }
    }
    if (maxIdx >= 0) {
      adjusted[maxIdx].marks -= 1;
      currentTotal -= 1;
    } else {
      break;
    }
  }

  while (currentTotal < targetMarks) {
    adjusted[0].marks += 1;
    currentTotal += 1;
  }

  return adjusted;
}
