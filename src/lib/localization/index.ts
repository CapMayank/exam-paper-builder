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

export type HeadingLanguage = "sa" | "hi" | "en";

/**
 * Resolves the heading language strictly according to the official MP Board policy:
 * - Sanskrit -> "sa"
 * - Hindi -> "hi"
 * - All other subjects (English, Mathematics, Science, Social Science, Physics, Chemistry, Biology, Commerce, Urdu, etc.) -> "en"
 */
export function resolveSubjectHeadingLanguage(
  subject?: string | null,
  subjectCode?: string | null,
  bookTitle?: string | null
): HeadingLanguage {
  const rawSubject = (subject || "").trim();
  const subjectLower = rawSubject.toLowerCase();
  const subjectPrimary = subjectLower.split("/")[0].trim();
  const code = (subjectCode || "").trim();
  const titleLower = (bookTitle || "").toLowerCase();

  // 1. Sanskrit
  if (
    subjectPrimary.includes("sanskrit") ||
    subjectPrimary.includes("संस्कृत") ||
    rawSubject.includes("संस्कृतम्") ||
    code === "512" || // Class 9 & 10 Sanskrit
    code === "122" || // Sanskrit secondary
    code === "022" ||
    titleLower.includes("shemushi") ||
    titleLower.includes("शेमुषी") ||
    titleLower.includes("ruchira") ||
    titleLower.includes("रुचिरा") ||
    titleLower.includes("deepakam") ||
    titleLower.includes("दीपकम्")
  ) {
    return "sa";
  }

  // 2. Hindi
  if (
    subjectPrimary.includes("hindi") ||
    subjectPrimary.includes("हिंदी") ||
    subjectPrimary.includes("हिन्दी") ||
    code === "401" || // Class 9 & 10 Hindi
    code === "051" || // Class 11 & 12 Hindi
    titleLower.includes("kshitij") ||
    titleLower.includes("क्षितिज") ||
    titleLower.includes("kritika") ||
    titleLower.includes("कृतिका") ||
    titleLower.includes("sparsh") ||
    titleLower.includes("स्पर्श") ||
    titleLower.includes("sanchayan") ||
    titleLower.includes("संचयन") ||
    titleLower.includes("aroh") ||
    titleLower.includes("आरोह") ||
    titleLower.includes("vitan") ||
    titleLower.includes("वितान") ||
    titleLower.includes("antaral") ||
    titleLower.includes("अंतराल") ||
    titleLower.includes("antara") ||
    titleLower.includes("अंतरा")
  ) {
    return "hi";
  }

  // 3. All other subjects (English, Mathematics, Science, Social Science, Physics, Chemistry, Biology, Commerce, Urdu, etc.)
  return "en";
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
      name?: string | null;
      book?: { subject?: string | null; title?: string | null } | null;
      sections?: Array<{ title?: string | null; instructions?: string | null }> | null;
    } | null;
  } | null,
  items?: Array<{ question?: { text?: string | null; options?: string[] } | null }> | null
): PaperLanguage {
  // 1. Explicit bilingual override
  if (paper?.language === "bilingual" || paper?.blueprint?.language === "bilingual") {
    return "bilingual";
  }

  const rawSubject = (paper?.blueprint?.book?.subject || "").trim();
  const subjectCode = (paper?.subjectCode || paper?.blueprint?.subjectCode || "").trim();
  const bookTitle = (paper?.blueprint?.book?.title || "").trim();

  // 2. Dynamic subject-based language resolution per MP Board rule
  // (Sanskrit -> "sa", Hindi -> "hi", All others -> "en")
  if (rawSubject || subjectCode || bookTitle) {
    const headingLang = resolveSubjectHeadingLanguage(rawSubject, subjectCode, bookTitle);
    if (headingLang === "sa") return "sa";
    if (headingLang === "hi") return "hi";

    const subjectLower = rawSubject.toLowerCase().split("/")[0].trim();
    // If it's a known non-language/non-general subject, it's definitively English
    if (
      subjectLower &&
      !subjectLower.includes("language") &&
      !subjectLower.includes("general")
    ) {
      return "en";
    }
  }

  // 3. Title inspection for subject keywords
  const title = (paper?.title || paper?.blueprint?.name || "").toLowerCase();
  if (title.includes("sanskrit") || title.includes("संस्कृत")) return "sa";
  if (title.includes("hindi") || title.includes("हिंदी") || title.includes("हिन्दी")) return "hi";
  if (
    title.includes("science") ||
    title.includes("math") ||
    title.includes("गणित") ||
    title.includes("physics") ||
    title.includes("chemistry") ||
    title.includes("biology") ||
    title.includes("social") ||
    title.includes("english")
  ) {
    return "en";
  }

  // 4. Content inspection if items are present (for generic "Language" subjects)
  const devanagariRegex = /[\u0900-\u097F]/;
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

  // 5. Fallback explicit overrides or default
  if (paper?.language === "sa" || paper?.blueprint?.language === "sa") return "sa";
  if (paper?.language === "hi" || paper?.blueprint?.language === "hi") return "hi";

  return "en";
}
