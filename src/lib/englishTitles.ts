/**
 * English names for books and chapters. Every subject except Hindi and Sanskrit lists its books and chapters in
 * English; the bilingual "English (हिन्दी)" and "हिन्दी (English)" forms and the few Hindi-only titles of the
 * Class 9–10 Social Science books are reduced to the English name. Hindi and Sanskrit keep their own scripts.
 */

const DEVANAGARI = /[ऀ-ॿ]/;
const LATIN_WORD = /[A-Za-z]{3}/;
const LANGUAGE_SUBJECT = /hindi|sanskrit|हिंदी|हिन्दी|संस्कृत/i;

/** Hindi and Sanskrit books and chapters stay as they are. */
export const isLanguageSubjectName = (subject?: string | null): boolean => !!subject && LANGUAGE_SUBJECT.test(subject);

/** Hindi-only titles (the NCERT Class 9–10 Social Science books and the Mathematics chapter without an English form). */
const ENGLISH_BY_HINDI: Record<string, string> = {
  // textbooks
  "समकालीन भारत-1 (भूगोल Class IX)": "Contemporary India I (Geography, Class IX)",
  "भारत और समकालीन विश्व-1 (इतिहास Class IX)": "India and the Contemporary World I (History, Class IX)",
  "लोकतांत्रिक राजनीति-1 (राजनीति विज्ञान Class IX)": "Democratic Politics I (Political Science, Class IX)",
  "अर्थशास्त्र (Economics Class IX)": "Economics (Class IX)",
  "समकालीन भारत-2 (भूगोल Class X)": "Contemporary India II (Geography, Class X)",
  "भारत और समकालीन विश्व-2 (इतिहास Class X)": "India and the Contemporary World II (History, Class X)",
  "लोकतांत्रिक राजनीति-2 (राजनीति विज्ञान Class X)": "Democratic Politics II (Political Science, Class X)",
  "आर्थिक विकास की समझ (Economics Class X)": "Understanding Economic Development (Economics, Class X)",
  // Mathematics
  "समांतर चतुर्भुजों और त्रिभुजों के क्षेत्रफल": "Areas of Parallelograms and Triangles",
  // Class 9 Geography
  "भारत आकार और स्थिति": "India: Size and Location",
  "भारत का भौतिक स्वरूप": "Physical Features of India",
  "अपवाह": "Drainage",
  "जलवायु": "Climate",
  "प्राकृतिक वनस्पति तथा वन्य प्राणी": "Natural Vegetation and Wildlife",
  "जनसंख्या": "Population",
  "मानचित्र कार्य (समकालीन भारत-1 पर आधारित)": "Map Work (based on Contemporary India I)",
  // Class 9 History
  "फ्रांसीसी क्रांति": "The French Revolution",
  "यूरोप में समाजवाद एवं रूसी क्रांति": "Socialism in Europe and the Russian Revolution",
  "नात्सीवाद और हिटलर का उदय": "Nazism and the Rise of Hitler",
  "वन्य समाज एवं उपनिवेशवाद": "Forest Society and Colonialism",
  "आधुनिक विश्व में चरवाहे": "Pastoralists in the Modern World",
  "किसान और काश्तकार": "Peasants and Farmers",
  // Class 9 Political Science
  "लोकतंत्र क्या और लोकतंत्र क्यों": "What is Democracy? Why Democracy?",
  "संविधान निर्माण": "Constitutional Design",
  "चुनावी राजनीति": "Electoral Politics",
  "संस्थाओं का कामकाज": "Working of Institutions",
  "लोकतांत्रिक अधिकार": "Democratic Rights",
  "समकालीन विश्व में लोकतंत्र": "Democracy in the Contemporary World",
  // Class 9 Economics
  "पालमपुर गांव की कहानी": "The Story of Village Palampur",
  "संसाधन के रूप में लोग": "People as Resource",
  "निर्धनता एवं चुनौती": "Poverty as a Challenge",
  "भारत में खाद्य सुरक्षा": "Food Security in India",
  // Class 10 Geography
  "संसाधन एवं विकास": "Resources and Development",
  "वन एवं वन्य जीव संसाधन": "Forest and Wildlife Resources",
  "जल संसाधन": "Water Resources",
  "कृषि": "Agriculture",
  "खनिज तथा ऊर्जा संसाधन (मानचित्र कार्य)": "Minerals and Energy Resources (Map Work)",
  "विनिर्माण उद्योग": "Manufacturing Industries",
  "राष्ट्रीय अर्थव्यवस्था की जीवन रेखाएं": "Lifelines of National Economy",
  // Class 10 History
  "यूरोप में राष्ट्रवाद का उदय": "The Rise of Nationalism in Europe",
  "भारत में राष्ट्रवाद": "Nationalism in India",
  "भूमंडलीकृत विश्व का बनना": "The Making of a Global World",
  "औद्योगिकीकरण का युग": "The Age of Industrialisation",
  "मुद्रण संस्कृति और आधुनिक दुनिया": "Print Culture and the Modern World",
  "अमर बलिदानी (मध्यप्रदेश के स्वतंत्रता सेनानी)": "Immortal Martyrs (Freedom Fighters of Madhya Pradesh)",
  // Class 10 Political Science
  "सत्ता की साझेदारी": "Power-sharing",
  "संघवाद": "Federalism",
  "जाति, धर्म और लैंगिक मसले": "Gender, Religion and Caste",
  "राजनीतिक दल": "Political Parties",
  "लोकतंत्र के परिणाम": "Outcomes of Democracy",
  "लोकतंत्र की चुनौतियाँ": "Challenges to Democracy",
  // Class 10 Economics
  "विकास": "Development",
  "भारतीय अर्थव्यवस्था के क्षेत्रक": "Sectors of the Indian Economy",
  "मुद्रा और साख": "Money and Credit",
  "वैश्वीकरण और भारतीय अर्थव्यवस्था": "Globalisation and the Indian Economy",
  "उपभोक्ता अधिकार": "Consumer Rights",
};

const PAREN = /\s*\(([^()]*)\)/g;
const tidy = (s: string) => s.replace(/\s+/g, " ").replace(/\s+([,.;:)])/g, "$1").replace(/[\s:;,–—-]+$/, "").trim();

/** The English name of one title: no part prefix handling here. */
function englishName(raw: string): string {
  const title = raw.trim();
  if (!DEVANAGARI.test(title)) return title;
  const known = ENGLISH_BY_HINDI[title];
  if (known) return known;

  // "Hindi (English)": the English is in the last bracket and the rest is Hindi
  const parens = [...title.matchAll(PAREN)];
  const outside = title.replace(PAREN, "");
  if (parens.length > 0 && !LATIN_WORD.test(outside)) {
    const english = [...parens].reverse().find((m) => LATIN_WORD.test(m[1]) && !DEVANAGARI.test(m[1]));
    if (english) return tidy(english[1]);
  }

  // "English (हिन्दी)": drop every bracket that holds Hindi
  const withoutHindiBrackets = tidy(title.replace(PAREN, (m, inner: string) => (DEVANAGARI.test(inner) ? "" : m)));
  if (LATIN_WORD.test(withoutHindiBrackets) && !DEVANAGARI.test(withoutHindiBrackets)) return withoutHindiBrackets;

  // anything left: remove the Hindi words and keep the English ones
  const stripped = tidy(withoutHindiBrackets.replace(/[ऀ-ॿ]+/g, " ").replace(/\(\s*\)/g, ""));
  return LATIN_WORD.test(stripped) ? stripped : title;
}

/**
 * "[Part] 3. Title" keeps its shape; the part name and the title are each reduced to English. A title with no
 * English form and no translation is left as it is.
 */
export function englishTitle(raw: string): string {
  if (!DEVANAGARI.test(raw)) return raw;
  const m = /^(\s*\[)([^\]]*)(\]\s*)([\s\S]*)$/.exec(raw);
  if (!m) return englishName(raw);
  return `${m[1]}${englishName(m[2])}${m[3]}${englishName(m[4])}`;
}

/** A book or chapter list for a subject: English for every subject except Hindi and Sanskrit. */
export function englishTitleFor(subject: string | null | undefined, raw: string): string {
  return isLanguageSubjectName(subject) ? raw : englishTitle(raw);
}

type WithChapters = { subject: string; chapters: Array<{ title: string }> };

/** Syllabus presets with English chapter names (Hindi and Sanskrit books untouched). */
export function englishPresets<T extends WithChapters>(presets: T[]): T[] {
  return presets.map((p) =>
    isLanguageSubjectName(p.subject) ? p : { ...p, chapters: p.chapters.map((c) => ({ ...c, title: englishTitle(c.title) })) },
  );
}

type SeedSubject = { name: string; textbooks: Array<{ title: string; chapters: Array<{ title: string }> }> };

/** Seeded MPBSE subjects, in place: English book and chapter names for every subject except Hindi and Sanskrit. */
export function englishSeed(seed: SeedSubject[]): void {
  for (const s of seed) {
    if (isLanguageSubjectName(s.name)) continue;
    for (const tb of s.textbooks) {
      tb.title = englishTitle(tb.title);
      for (const ch of tb.chapters) ch.title = englishTitle(ch.title);
    }
  }
}
