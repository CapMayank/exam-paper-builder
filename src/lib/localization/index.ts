import {
  BILINGUAL_DICTIONARY,
  ENGLISH_DICTIONARY,
  HINDI_DICTIONARY,
  LOCALES,
  localizeSectionTitle,
  SANSKRIT_DICTIONARY,
  toDevanagariLetter,
} from "./dictionaries";
import type { PaperLanguage, PaperLocaleDictionary } from "./types";

export * from "./types";
export * from "./dictionaries";

export function getPaperLocale(lang?: string | null): PaperLocaleDictionary {
  if (lang === "sa") return SANSKRIT_DICTIONARY;
  if (lang === "hi") return HINDI_DICTIONARY;
  if (lang === "bilingual") return BILINGUAL_DICTIONARY;
  return ENGLISH_DICTIONARY;
}

const SANSKRIT_KEYWORDS: RegExp[] = [
  /इति(?=[^\u0900-\u097F]|$)/,
  /अस्ति(?=[^\u0900-\u097F]|$)/,
  /भवति(?=[^\u0900-\u097F]|$)/,
  /कुरुत(?=[^\u0900-\u097F]|$)/,
  /लिखत(?=[^\u0900-\u097F]|$)/,
  /सन्ति(?=[^\u0900-\u097F]|$)/,
  /पठति(?=[^\u0900-\u097F]|$)/,
  /गच्छति(?=[^\u0900-\u097F]|$)/,
  /पिबति(?=[^\u0900-\u097F]|$)/,
  /आसीत्(?=[^\u0900-\u097F]|$)/,
  /चित्वा(?=[^\u0900-\u097F]|$)/,
  /पूरयत(?=[^\u0900-\u097F]|$)/,
  /चिनुत(?=[^\u0900-\u097F]|$)/,
  /किम्(?=[^\u0900-\u097F]|$)/,
  /कस्य(?=[^\u0900-\u097F]|$)/,
  /कस्याः(?=[^\u0900-\u097F]|$)/,
  /केन(?=[^\u0900-\u097F]|$)/,
  /कस्मै(?=[^\u0900-\u097F]|$)/,
  /कुतः(?=[^\u0900-\u097F]|$)/,
  /कीदृश/,
  /कति(?=[^\u0900-\u097F]|$)/,
  /अधोलिखित/,
  /पाठे(?=[^\u0900-\u097F]|$)/,
  /पाठस्य(?=[^\u0900-\u097F]|$)/,
  /संस्कृत/,
  /शेमुषी/,
  /रुचिरा/,
  /मञ्जूषा/,
  /अधोदत्त/,
  /उचितपद/,
  /उचितविकल्प/,
  /रिक्तस्थान/,
  /समुचित/,
  /प्रश्नानाम्/,
  /उत्तराणि/,
  /उत्तरम्/,
  /शुद्धवाक्य/,
  /सत्यासत्य/,
  /श्लोक/,
  /नाट्यांश/,
  /गद्यांश/,
  /पद्यांश/,
  /अन्वय/,
  /सुभाषित/,
  /अङ्काः|अङ्कौ|अङ्कः/,
  /आम्(?=[^\u0900-\u097F]|$)/,
];

// Highly characteristic Sanskrit tokens that strongly indicate Sanskrit over Hindi
const STRONG_SANSKRIT_PATTERNS = [
  /चित्वा/,
  /पूरयत/,
  /संस्कृत/,
  /शेमुषी/,
  /रुचिरा/,
  /प्रश्नानाम्/,
  /उत्तराणि/,
  /अधोलिखित/,
  /आसीत्/,
  /पिबति/,
  /लिखत/,
  /कुरुत/,
  /सत्यासत्य/,
  /मञ्जूषा/,
  /अन्वय/,
  /नाट्यांश/,
  /उचितविकल्प/,
  /अङ्काः|अङ्कौ/,
  /आम्\b|आम्(?=[^\u0900-\u097F]|$)/,
];

export function isTextPredominantlySanskrit(text?: string | null): boolean {
  if (!text) return false;
  
  for (const strong of STRONG_SANSKRIT_PATTERNS) {
    if (strong.test(text)) return true;
  }

  let matches = 0;
  for (const kw of SANSKRIT_KEYWORDS) {
    if (kw.test(text)) matches++;
  }
  return matches >= 2;
}

export function detectPaperLanguage(
  paper?: {
    title?: string | null;
    language?: string | null;
    subjectCode?: string | null;
    generalInstructions?: string | null;
    blueprint?: {
      language?: string | null;
      subjectCode?: string | null;
      book?: { subject?: string | null; title?: string | null } | null;
      sections?: Array<{ title?: string | null; instructions?: string | null }> | null;
    } | null;
  } | null,
  items?: Array<{ question?: { text?: string | null; options?: string[] } | null }> | null
): PaperLanguage {
  // 1. Explicit override on paper or blueprint record when non-default
  if (paper?.language === "sa" || paper?.blueprint?.language === "sa") return "sa";
  if (paper?.language === "hi" || paper?.blueprint?.language === "hi") return "hi";
  if (paper?.language === "bilingual" || paper?.blueprint?.language === "bilingual") return "bilingual";

  const rawSubject = paper?.blueprint?.book?.subject || "";
  const subjectPrimary = rawSubject.split("/")[0].trim().toLowerCase();
  const bookTitlePrimary = (paper?.blueprint?.book?.title || "").split("/")[0].trim().toLowerCase();
  const subjectCode = (paper?.subjectCode || paper?.blueprint?.subjectCode || "").trim();

  // 2. Sanskrit detection via subject, code, or book title
  // (Takes absolute precedence over DB default 'en' because Sanskrit is intrinsically Sanskrit)
  if (
    subjectPrimary.includes("sanskrit") ||
    subjectPrimary.includes("संस्कृत") ||
    rawSubject.includes("संस्कृतम्") ||
    bookTitlePrimary.includes("shemushi") ||
    bookTitlePrimary.includes("शेमुषी") ||
    bookTitlePrimary.includes("ruchira") ||
    bookTitlePrimary.includes("रुचिरा") ||
    bookTitlePrimary.includes("deepakam") ||
    bookTitlePrimary.includes("दीपकम्") ||
    subjectCode === "122" || // Class 10 Sanskrit (MPBSE / CBSE)
    subjectCode === "512" || // MPBSE High School Sanskrit
    subjectCode === "022"    // Secondary Sanskrit
  ) {
    return "sa";
  }

  // 3. Hindi detection via subject or book title
  // (Takes precedence over DB default 'en' because Hindi literature is intrinsically Hindi)
  if (
    subjectPrimary.includes("hindi") ||
    subjectPrimary.includes("हिंदी") ||
    subjectPrimary.includes("हिन्दी") ||
    bookTitlePrimary.includes("hindi") ||
    bookTitlePrimary.includes("हिंदी") ||
    bookTitlePrimary.includes("हिन्दी") ||
    bookTitlePrimary.includes("kshitij") ||
    bookTitlePrimary.includes("kritika") ||
    bookTitlePrimary.includes("sparsh") ||
    bookTitlePrimary.includes("sanchayan") ||
    bookTitlePrimary.includes("aroh") ||
    bookTitlePrimary.includes("vitan") ||
    bookTitlePrimary.includes("antaral") ||
    bookTitlePrimary.includes("antara")
  ) {
    return "hi";
  }

  const devanagariRegex = /[\u0900-\u097F]/;
  const cleanTitle = (paper?.title || "").replace(/\/\s*[\u0900-\u097F\s]+/g, "");

  // 4. Content inspection if items are present
  if (items && items.length > 0) {
    let devanagariCount = 0;
    let sanskritScore = 0;

    for (const it of items) {
      const qText = it?.question?.text || "";
      if (devanagariRegex.test(qText)) {
        devanagariCount++;
        if (isTextPredominantlySanskrit(qText)) {
          sanskritScore++;
        }
      }
    }

    if (devanagariCount > items.length * 0.35) {
      if (sanskritScore >= Math.max(2, Math.floor(devanagariCount * 0.25))) {
        return "sa";
      }
      return "hi";
    }
  }

  // 5. Title / General Instructions inspection
  if (cleanTitle.toLowerCase().includes("sanskrit") || cleanTitle.includes("संस्कृत") || isTextPredominantlySanskrit(paper?.generalInstructions)) {
    return "sa";
  }

  if (devanagariRegex.test(cleanTitle) || devanagariRegex.test(subjectPrimary)) {
    return "hi";
  }

  // 6. Explicit 'en' or default
  return paper?.language === "en" ? "en" : "en";
}
