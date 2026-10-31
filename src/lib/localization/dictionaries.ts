import type { PaperLocaleDictionary, PaperLanguage } from "./types";

const DEVANAGARI_LETTERS = ["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ", "ट", "ठ", "ड", "ढ", "ण"];

export function toDevanagariLetter(letter: string): string {
  const upper = letter.toUpperCase();
  const code = upper.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    const idx = code - 65;
    return DEVANAGARI_LETTERS[idx] || letter;
  }
  return letter;
}

const ENGLISH_SECTION_TYPE_MAP: Record<string, { sa: string; hi: string }> = {
  "MULTIPLE CHOICE QUESTIONS": { sa: "बहुविकल्पीयप्रश्नाः", hi: "सही विकल्प चुनिए" },
  "MULTIPLE CHOICE": { sa: "बहुविकल्पीयप्रश्नाः", hi: "सही विकल्प चुनिए" },
  "FILL IN THE BLANKS": { sa: "रिक्तस्थानपूर्तिः", hi: "रिक्त स्थानों की पूर्ति" },
  "FILL IN BLANKS": { sa: "रिक्तस्थानपूर्तिः", hi: "रिक्त स्थानों की पूर्ति" },
  "TRUE OR FALSE": { sa: "सत्यासत्यनिरूपणम्", hi: "सत्य / असत्य" },
  "TRUE / FALSE": { sa: "सत्यासत्यनिरूपणम्", hi: "सत्य / असत्य" },
  "MATCH THE FOLLOWING": { sa: "उचितयुग्ममेलनम्", hi: "सही जोड़ी मिलाइए" },
  "MATCH THE COLUMNS": { sa: "उचितयुग्ममेलनम्", hi: "सही जोड़ी मिलाइए" },
  "MATCH COLUMN": { sa: "उचितयुग्ममेलनम्", hi: "सही जोड़ी मिलाइए" },
  "ONE WORD ANSWERS": { sa: "एकपदेन उत्तराणि", hi: "एक शब्द / वाक्य में उत्तर" },
  "ONE WORD ANSWER": { sa: "एकपदेन उत्तराणि", hi: "एक शब्द / वाक्य में उत्तर" },
  "VERY SHORT ANSWER QUESTIONS": { sa: "अतिलघूत्तरीयप्रश्नाः", hi: "अति लघु उत्तरीय प्रश्न" },
  "VERY SHORT ANSWER": { sa: "अतिलघूत्तरीयप्रश्नाः", hi: "अति लघु उत्तरीय प्रश्न" },
  "SHORT ANSWER QUESTIONS": { sa: "लघूत्तरीयप्रश्नाः", hi: "लघु उत्तरीय प्रश्न" },
  "SHORT ANSWER": { sa: "लघूत्तरीयप्रश्नाः", hi: "लघु उत्तरीय प्रश्न" },
  "LONG ANSWER QUESTIONS": { sa: "दीर्घोत्तरीयप्रश्नाः", hi: "दीर्घ उत्तरीय प्रश्न" },
  "LONG ANSWER": { sa: "दीर्घोत्तरीयप्रश्नाः", hi: "दीर्घ उत्तरीय प्रश्न" },
  "CASE STUDY": { sa: "केस-आधारितप्रश्नाः", hi: "केस आधारित प्रश्न" },
  "CASE STUDY QUESTIONS": { sa: "केस-आधारितप्रश्नाः", hi: "केस आधारित प्रश्न" },
  "UNSEEN PASSAGE": { sa: "अपठित-अवबोधनम्", hi: "अपठित बोध" },
  "READING SKILLS": { sa: "अपठित-अवबोधनम्", hi: "अपठित बोध" },
  "WRITING SKILLS": { sa: "रचनात्मक-कार्यम्", hi: "रचनात्मक लेखन" },
  "GRAMMAR": { sa: "अनुप्रयुक्त-व्याकरणम्", hi: "व्याकरण" },
};

export function localizeSectionTitle(title: string | null | undefined, lang: PaperLanguage, fallbackLetter = "A"): string {
  if (!title) {
    if (lang === "sa") return `खण्डः '${toDevanagariLetter(fallbackLetter)}'`;
    if (lang === "hi") return `खण्ड '${toDevanagariLetter(fallbackLetter)}'`;
    if (lang === "bilingual") return `SECTION ${fallbackLetter} / खण्ड '${toDevanagariLetter(fallbackLetter)}'`;
    return `SECTION ${fallbackLetter}`;
  }

  const trimmed = title.trim();

  // If already predominantly in Devanagari
  const hasDevanagari = /[\u0900-\u097F]/.test(trimmed);
  if (hasDevanagari) {
    if (lang === "sa") {
      // If it has Hindi-style "खण्ड 'क'" without visarga, normalize to Sanskrit "खण्डः 'क'"
      return trimmed.replace(/^खण्ड\s+(['"][अ-ह]['"]|[अ-ह])(?:\s*[:–-])?/i, (match, letter) => {
        return `खण्डः ${letter}`;
      });
    }
    return trimmed;
  }

  // Parse English pattern like "SECTION A: MULTIPLE CHOICE QUESTIONS" or "Section A – Objective: Multiple Choice"
  const secMatch = trimmed.match(/^(?:section|sec|part)\s+([a-z0-9]+)(?:\s*[:–-]\s*(.*))?$/i);
  if (secMatch) {
    const rawLetter = secMatch[1].toUpperCase();
    const rawDesc = (secMatch[2] || "").trim().toUpperCase().replace(/^OBJECTIVE:\s*/i, "");
    const devaLetter = toDevanagariLetter(rawLetter);

    if (lang === "sa") {
      const typeTrans = ENGLISH_SECTION_TYPE_MAP[rawDesc]?.sa;
      if (typeTrans) {
        return `खण्डः '${devaLetter}' : ${typeTrans}`;
      }
      return `खण्डः '${devaLetter}'`;
    }

    if (lang === "hi") {
      const typeTrans = ENGLISH_SECTION_TYPE_MAP[rawDesc]?.hi;
      if (typeTrans) {
        return `खण्ड '${devaLetter}' : ${typeTrans}`;
      }
      return `खण्ड '${devaLetter}'`;
    }

    if (lang === "bilingual") {
      const typeTrans = ENGLISH_SECTION_TYPE_MAP[rawDesc]?.hi;
      if (typeTrans) {
        return `SECTION ${rawLetter} : ${rawDesc} / खण्ड '${devaLetter}' : ${typeTrans}`;
      }
      return `SECTION ${rawLetter} / खण्ड '${devaLetter}'`;
    }

    return trimmed;
  }

  return trimmed;
}

export const SANSKRIT_DICTIONARY: PaperLocaleDictionary = {
  language: "sa",
  displayName: "Sanskrit (संस्कृतम्)",
  header: {
    timeAllowed: "समयः :",
    timeFormat: (min: number) => {
      if (min >= 60) {
        const hrs = Math.floor(min / 60);
        const rem = min % 60;
        const hrStr = hrs === 1 ? "1 होरा" : `${hrs} होराः`;
        return rem ? `${hrStr} ${rem} निमेषाः` : `${hrStr} (${hrs} घण्टाः)`;
      }
      return `${min} निमेषाः`;
    },
    maxMarks: "पूर्णाङ्काः :",
    totalQuestions: "कुलप्रश्नाः :",
    subjectCode: "विषय-सङ्केताङ्कः :",
    set: "सेट्",
    studentName: "छात्रस्य नाम :",
    rollNo: "अनुक्रमाङ्कः :",
    classAndSec: "कक्षा व वर्गः :",
    invigilatorSign: "निरीक्षक-हस्ताक्षरम् :",
    date: "दिनाङ्कः :",
    classLabel: "कक्षा :",
    subjectLabel: "विषयः :",
    generalInstructionsLabel: "सामान्यनिर्देशाः",
  },
  section: {
    formatSectionHeader: (letter, customTitle) => localizeSectionTitle(customTitle, "sa", letter),
    formatGroupSummary: (count, marks) => `${count} प्रश्नाः · ${marks} अङ्काः`,
    formatTypeFormula: (count, marksEach, type) => {
      if (type === "MATCH_COLUMN") {
        return `1 प्रश्नः (${count} युग्मानि) × ${marksEach} अङ्कः = ${count * marksEach} अङ्काः`;
      }
      const unit = marksEach === 1 ? "अङ्कः" : marksEach === 2 ? "अङ्कौ" : "अङ्काः";
      return `${count} प्रश्नाः × ${marksEach} ${unit} = ${count * marksEach} अङ्काः`;
    },
  },
  questionTypes: {
    MCQ: "बहुविकल्पीयप्रश्नाः (उचितविकल्पं चित्वा लिखत)",
    ASSERTION_REASON: "अभिकथनं तर्कश्च",
    TRUE_FALSE: "शुद्ध/अशुद्ध-वाक्यनिरूपणम् (सत्यासत्यम्)",
    FILL_BLANK: "रिक्तस्थानपूर्तिः",
    MATCH_COLUMN: "उचितयुग्ममेलनम्",
    VERY_SHORT: "अतिलघूत्तरीयप्रश्नाः (एकपदेन / एकवाक्येन)",
    SHORT: "लघूत्तरीयप्रश्नाः",
    LONG: "दीर्घोत्तरीयप्रश्नाः",
    CASE_STUDY: "केस आधारित / बहु-भागीयप्रश्नाः",
    UNSEEN_PASSAGE: "अपठित-अवबोधनम् (गद्यांश-काव्यांश)",
    REFERENCE_CONTEXT: "सन्दर्भ-प्रसङ्गव्याख्या",
    WRITING_SKILL: "रचनात्मक-कार्यम् (पत्रम्, चित्रवर्णनम्, निबन्धः)",
    GRAMMAR: "अनुप्रयुक्त-व्याकरणम् (निर्देशानुसारम्)",
    DRAW: "चित्राङ्कनम् / आरेखम्",
    MAP_WORK: "मानचित्रकार्यम्",
  },
  sharedInstructions: {
    MCQ: "उचितविकल्पं चित्वा लिखत:",
    FILL_BLANK: "कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत:",
    TRUE_FALSE: "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षम् 'न' इति लिखत:",
    MATCH_COLUMN: "अधोदत्तानां पदानां समुचितं मेलनं कुरुत (स्तम्भ 'अ' सह स्तम्भ 'ब'):",
    VERY_SHORT: "अधोलिखितानां प्रश्नानाम् उत्तराणि संस्कृतभाषया एकपदेन एकवाक्येन वा लिखत:",
    SHORT: "अधोलिखितानां प्रश्नानाम् उत्तराणि संस्कृतभाषया संक्षेपेण लिखत (प्रायः 30-75 शब्दाः):",
    LONG: "अधोलिखितानां प्रश्नानाम् उत्तराणि सविस्तरं स्वभाषया / संस्कृतभाषया लिखत:",
    ASSERTION_REASON: "प्रदत्तं अभिकथनं (A) तर्कं (R) च सम्यक् पठित्वा उचितं विकल्पं चिनुत:",
    UNSEEN_PASSAGE: "अधोलिखितं गद्यांशं पठित्वा प्रश्नानाम् उत्तराणि संस्कृतेन लिखत:",
    REFERENCE_CONTEXT: "अधोलिखितस्य पद्यांशस्य/नाट्यांशस्य सप्रसङ्गव्याख्यां कुरुत:",
    WRITING_SKILL: "निर्देशानुसारं पत्रलेखनं / चित्रवर्णनं / निबन्धं कुरुत:",
    GRAMMAR: "निर्देशानुसारं व्याकरणसम्बद्धानां प्रश्नानाम् उत्तराणि लिखत:",
  },
  choiceSeparator: "(अथवा)",
  marksLabel: (marks: number) => {
    if (marks === 1) return "[1 अङ्कः]";
    if (marks === 2) return "[2 अङ्कौ]";
    return `[${marks} अङ्काः]`;
  },
  formulaLabel: (count: number, marksEach: number) => `(${count} × ${marksEach} = ${count * marksEach} अङ्काः)`,
  columnLabels: { colA: "स्तम्भ 'अ'", colB: "स्तम्भ 'ब'" },
  footer: {
    pageOf: (current, total) => `पृष्ठम् ${current} / ${total}`,
    pto: "कृपया पृष्ठं परिवर्तयतु →",
    endOfPaper: "*** प्रश्नपत्रं समाप्तम् ***",
  },
};

export const HINDI_DICTIONARY: PaperLocaleDictionary = {
  language: "hi",
  displayName: "Hindi (हिन्दी)",
  header: {
    timeAllowed: "समय:",
    timeFormat: (min: number) => {
      if (min >= 60) {
        const hrs = Math.floor(min / 60);
        const rem = min % 60;
        return rem ? `${hrs} घण्टे ${rem} मिनट` : `${hrs} घण्टे`;
      }
      return `${min} मिनट`;
    },
    maxMarks: "पूर्णांक:",
    totalQuestions: "कुल प्रश्न:",
    subjectCode: "विषय कोड:",
    set: "सेट",
    studentName: "विद्यार्थी का नाम:",
    rollNo: "अनुक्रमांक:",
    classAndSec: "कक्षा व वर्ग:",
    invigilatorSign: "निरीक्षक हस्ताक्षर:",
    date: "दिनांक:",
    classLabel: "कक्षा:",
    subjectLabel: "विषय:",
    generalInstructionsLabel: "सामान्य निर्देश",
  },
  section: {
    formatSectionHeader: (letter, customTitle) => localizeSectionTitle(customTitle, "hi", letter),
    formatGroupSummary: (count, marks) => `${count} प्रश्न · ${marks} अंक`,
    formatTypeFormula: (count, marksEach, type) => {
      if (type === "MATCH_COLUMN") {
        return `1 प्रश्न (${count} जोड़ियाँ) × ${marksEach} अंक = ${count * marksEach} अंक`;
      }
      return `${count} प्रश्न × ${marksEach} अंक = ${count * marksEach} अंक`;
    },
  },
  questionTypes: {
    MCQ: "सही विकल्प चुनिए",
    ASSERTION_REASON: "अभिकथन एवं तर्क",
    TRUE_FALSE: "सत्य / असत्य",
    FILL_BLANK: "रिक्त स्थानों की पूर्ति",
    MATCH_COLUMN: "सही जोड़ी मिलाइए",
    VERY_SHORT: "अति लघु उत्तरीय प्रश्न (एक शब्द / एक वाक्य)",
    SHORT: "लघु उत्तरीय प्रश्न",
    LONG: "दीर्घ उत्तरीय प्रश्न",
    CASE_STUDY: "केस आधारित / बहु-भागीय प्रश्न",
    UNSEEN_PASSAGE: "अपठित गद्यांश-काव्यांश",
    REFERENCE_CONTEXT: "सन्दर्भ-प्रसंग व्याख्या",
    WRITING_SKILL: "रचनात्मक लेखन (पत्र, निबंध, सूचना)",
    GRAMMAR: "व्याकरण (निर्देशानुसार)",
    DRAW: "चित्रांकन / आरेख",
    MAP_WORK: "मानचित्र कार्य",
  },
  sharedInstructions: {
    MCQ: "सही विकल्प चुनकर लिखिए:",
    FILL_BLANK: "निम्नलिखित रिक्त स्थानों की पूर्ति कीजिए:",
    TRUE_FALSE: "निम्नलिखित कथनों को पढ़कर सही या गलत (सत्य / असत्य) लिखिए:",
    MATCH_COLUMN: "स्तम्भ 'अ' का स्तम्भ 'ब' से सही मिलान कीजिए:",
    VERY_SHORT: "निम्नलिखित प्रश्नों के उत्तर एक शब्द या एक वाक्य में लिखिए:",
    SHORT: "निम्नलिखित प्रश्नों के उत्तर संक्षेप में लिखिए (लगभग 30-75 शब्द):",
    LONG: "निम्नलिखित प्रश्नों के उत्तर विस्तारपूर्वक लिखिए (लगभग 120 शब्द):",
    ASSERTION_REASON: "दिए गए अभिकथन (A) एवं तर्क (R) को ध्यानपूर्वक पढ़कर सही विकल्प का चयन कीजिए:",
    UNSEEN_PASSAGE: "दिए गए अपठित गद्यांश को पढ़कर नीचे दिए गए प्रश्नों के उत्तर दीजिए:",
    REFERENCE_CONTEXT: "दिए गए पद्यांश/गद्यांश की सप्रसंग व्याख्या कीजिए:",
    WRITING_SKILL: "निर्देशानुसार रचनात्मक लेखन कार्य पूर्ण कीजिए:",
    GRAMMAR: "निर्देशानुसार व्याकरण सम्बन्धी प्रश्नों के उत्तर दीजिए:",
  },
  choiceSeparator: "अथवा",
  marksLabel: (marks: number) => `[${marks} अंक]`,
  formulaLabel: (count: number, marksEach: number) => `(${count} × ${marksEach} = ${count * marksEach} अंक)`,
  columnLabels: { colA: "स्तम्भ 'अ'", colB: "स्तम्भ 'ब'" },
  footer: {
    pageOf: (current, total) => `पृष्ठ ${current} / ${total}`,
    pto: "कृपया उलटिए → / P.T.O.",
    endOfPaper: "*** प्रश्न-पत्र समाप्त ***",
  },
};

export const ENGLISH_DICTIONARY: PaperLocaleDictionary = {
  language: "en",
  displayName: "English",
  header: {
    timeAllowed: "Time Allowed:",
    timeFormat: (min: number) => {
      if (min >= 60) {
        const hrs = Math.floor(min / 60);
        const rem = min % 60;
        return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`;
      }
      return `${min} min`;
    },
    maxMarks: "Maximum Marks:",
    totalQuestions: "Total Questions:",
    subjectCode: "Subject Code:",
    set: "SET",
    studentName: "Student Name:",
    rollNo: "Roll No:",
    classAndSec: "Class & Section:",
    invigilatorSign: "Invigilator Sign:",
    date: "Date:",
    classLabel: "Class:",
    subjectLabel: "Subject:",
    generalInstructionsLabel: "General Instructions",
  },
  section: {
    formatSectionHeader: (letter, customTitle) => localizeSectionTitle(customTitle, "en", letter),
    formatGroupSummary: (count, marks) => `${count} Questions · ${marks} Marks`,
    formatTypeFormula: (count, marksEach, type) => {
      if (type === "MATCH_COLUMN") {
        return `1 question (${count} pairs) × ${marksEach}m = ${count * marksEach}m`;
      }
      return `${count} question(s) × ${marksEach} mark(s) = ${count * marksEach}m`;
    },
  },
  questionTypes: {
    MCQ: "Multiple choice",
    ASSERTION_REASON: "Assertion & Reason",
    TRUE_FALSE: "True / False",
    FILL_BLANK: "Fill in the blank",
    MATCH_COLUMN: "Match the column",
    VERY_SHORT: "Very short / One word",
    SHORT: "Short answer",
    LONG: "Long answer",
    CASE_STUDY: "Case study / Multi-part",
    UNSEEN_PASSAGE: "Unseen passage",
    REFERENCE_CONTEXT: "Reference to context",
    WRITING_SKILL: "Writing skill",
    GRAMMAR: "Grammar",
    DRAW: "Draw / diagram",
    MAP_WORK: "Map work",
  },
  sharedInstructions: {
    MCQ: "Choose and write the correct option:",
    FILL_BLANK: "Fill in the blanks with appropriate words:",
    TRUE_FALSE: "State whether the following statements are True or False:",
    MATCH_COLUMN: "Match the items in Column A with Column B:",
    VERY_SHORT: "Answer the following questions in one word or one sentence:",
    SHORT: "Answer the following questions briefly (approx. 30–75 words):",
    LONG: "Answer the following questions in detail (approx. 120 words):",
    ASSERTION_REASON: "Read the given Assertion (A) and Reason (R) carefully and select the correct option:",
    UNSEEN_PASSAGE: "Read the passage carefully and answer the questions that follow:",
    REFERENCE_CONTEXT: "Explain with reference to context:",
    WRITING_SKILL: "Attempt the creative writing tasks as directed:",
    GRAMMAR: "Do as directed for the grammar questions:",
  },
  choiceSeparator: "OR",
  marksLabel: (marks: number) => `[${marks} ${marks === 1 ? "Mark" : "Marks"}]`,
  formulaLabel: (count: number, marksEach: number) => `(${count} × ${marksEach} = ${count * marksEach} Marks)`,
  columnLabels: { colA: "Column A", colB: "Column B" },
  footer: {
    pageOf: (current, total) => `Page ${current} of ${total}`,
    pto: "P.T.O. →",
    endOfPaper: "*** END OF QUESTION PAPER ***",
  },
};

export const BILINGUAL_DICTIONARY: PaperLocaleDictionary = {
  language: "bilingual",
  displayName: "Bilingual (English / हिन्दी / संस्कृत)",
  header: {
    timeAllowed: "Time / समय:",
    timeFormat: (min: number) => {
      if (min >= 60) {
        const hrs = Math.floor(min / 60);
        const rem = min % 60;
        return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`;
      }
      return `${min} min`;
    },
    maxMarks: "Max Marks / पूर्णांक:",
    totalQuestions: "Total Qs / कुल प्रश्न:",
    subjectCode: "Code / विषय कोड:",
    set: "SET / सेट",
    studentName: "Student Name / नाम:",
    rollNo: "Roll No / रोल नं:",
    classAndSec: "Class & Sec / कक्षा:",
    invigilatorSign: "Invig. Sign / हस्ताक्षर:",
    date: "Date / दिनांक:",
    classLabel: "Class / कक्षा:",
    subjectLabel: "Subject / विषय:",
    generalInstructionsLabel: "General Instructions / सामान्य निर्देश",
  },
  section: {
    formatSectionHeader: (letter, customTitle) => localizeSectionTitle(customTitle, "bilingual", letter),
    formatGroupSummary: (count, marks) => `${count} Questions / प्रश्न · ${marks} Marks / अंक`,
    formatTypeFormula: (count, marksEach, type) => {
      if (type === "MATCH_COLUMN") {
        return `1 question (${count} pairs) × ${marksEach}m = ${count * marksEach}m`;
      }
      return `${count} Qs × ${marksEach}m = ${count * marksEach}m`;
    },
  },
  questionTypes: {
    MCQ: "Multiple Choice / सही विकल्प चुनिए",
    ASSERTION_REASON: "Assertion & Reason (अभिकथन एवं तर्क)",
    TRUE_FALSE: "True / False (सत्य / असत्य)",
    FILL_BLANK: "Fill in the blank (रिक्त स्थान पूर्ति)",
    MATCH_COLUMN: "Match the column (सही जोड़ी मिलाइए)",
    VERY_SHORT: "Very short / One word (अति लघु / एक वाक्य)",
    SHORT: "Short Answer (लघु उत्तरीय प्रश्न)",
    LONG: "Long Answer (दीर्घ उत्तरीय प्रश्न)",
    CASE_STUDY: "Case Study / केस आधारित प्रश्न",
    UNSEEN_PASSAGE: "Unseen passage / अपठित गद्यांश-काव्यांश",
    REFERENCE_CONTEXT: "Reference to context / सन्दर्भ-प्रसंग व्याख्या",
    WRITING_SKILL: "Writing skill / रचनात्मक लेखन",
    GRAMMAR: "Grammar / व्याकरण",
    DRAW: "Draw / diagram",
    MAP_WORK: "Map work / मानचित्र कार्य",
  },
  sharedInstructions: {
    MCQ: "सही विकल्प चुनकर लिखिए / Choose and write the correct option:",
    FILL_BLANK: "रिक्त स्थानों की पूर्ति कीजिए / Fill in the blanks with appropriate words:",
    TRUE_FALSE: "निम्नलिखित कथनों को पढ़कर सत्य या असत्य लिखिए / State whether the following statements are True or False:",
    MATCH_COLUMN: "स्तम्भ 'अ' का स्तम्भ 'ब' से सही मिलान कीजिए / Match items in Column A with Column B:",
    VERY_SHORT: "एक शब्द या एक वाक्य में उत्तर लिखिए / Answer in one word or one sentence:",
    SHORT: "संक्षेप में उत्तर लिखिए / Answer briefly (approx. 30–75 words):",
    LONG: "विस्तारपूर्वक उत्तर लिखिए / Answer in detail (approx. 120 words):",
    ASSERTION_REASON: "दिए गए अभिकथन एवं तर्क को पढ़कर सही विकल्प चुनिए / Read Assertion (A) and Reason (R) and choose the correct option:",
    UNSEEN_PASSAGE: "गद्यांश को पढ़कर प्रश्नों के उत्तर दीजिए / Read the passage and answer the questions:",
    REFERENCE_CONTEXT: "सप्रसंग व्याख्या कीजिए / Explain with reference to context:",
    WRITING_SKILL: "निर्देशानुसार रचनात्मक लेखन कीजिए / Complete the creative writing tasks:",
    GRAMMAR: "निर्देशानुसार उत्तर दीजिए / Do as directed:",
  },
  choiceSeparator: "OR (अथवा)",
  marksLabel: (marks: number) => `[${marks} ${marks === 1 ? "Mark" : "Marks"} / अंक]`,
  formulaLabel: (count: number, marksEach: number) => `(${count} × ${marksEach} = ${count * marksEach} Marks / अंक)`,
  columnLabels: { colA: "स्तम्भ 'अ' (Column A)", colB: "स्तम्भ 'ब' (Column B)" },
  footer: {
    pageOf: (current, total) => `Page ${current} of ${total}`,
    pto: "P.T.O. / कृपया उलटिए →",
    endOfPaper: "*** END OF QUESTION PAPER / समाप्त ***",
  },
};

export const LOCALES: Record<PaperLanguage, PaperLocaleDictionary> = {
  sa: SANSKRIT_DICTIONARY,
  hi: HINDI_DICTIONARY,
  en: ENGLISH_DICTIONARY,
  bilingual: BILINGUAL_DICTIONARY,
};
