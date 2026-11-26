/**
 * Which question type a bank question really is, read from what it holds. Teachers often build an unseen passage
 * as a Short or Long answer with sub-parts, or a map question as a Long answer, so it never links to the slots
 * made for that form. `suggestQuestionType` says when a question's stored type looks wrong and which one fits.
 * It only re-reads the general forms (Short, Long, Very short, Case study); a type the teacher picked on purpose
 * (MCQ, Grammar, Writing skill...) is left alone. Only up to class 8 (and Nursery/KG): those sections take several
 * forms each, while a board paper's section (class 9 to 12) takes one exact type, and a board question retyped
 * would stop showing up for it. Pure, safe on client and server.
 */
import { classNumberOf } from "./internalChoiceRules";
import { chapterRole } from "./paperAutogen";
import { subjectFamily } from "./sectionTypes";
import type { SubPart } from "./types";

export type TypeSuggestion = { type: string; reason: string };

export type InferableQuestion = {
  type: string;
  text: string;
  subparts?: SubPart[] | null;
  chapterTitle?: string | null;
  subject?: string | null;
  /** The book's class; from class 9 no type is suggested. */
  className?: string | null;
};

/** The general forms a teacher picks when no closer one comes to mind; only these are re-read. */
const GENERAL_TYPES = new Set(["SHORT", "LONG", "VERY_SHORT", "CASE_STUDY"]);
/** Written answers long enough to be a writing task, a map or a drawing; a very short answer is none of these. */
const ANSWER_TYPES = new Set(["SHORT", "LONG"]);

const RTC = /सन्दर्भ|संदर्भ|प्रसंग|सप्रसंग|व्याख्या|reference to (the )?context|\bextract\b|\bRTC\b/i;
const PASSAGE = /अपठित|गद्यांश|काव्यांश|unseen|passage|read the (following|given|poem|stanza)|पढ़कर|पढ़िए|पढ़ें|पठित्वा|अधोलिखितं|stanza/i;
const CASE = /\bcase\b|source[- ]based|read the|पढ़कर|स्रोत|परिस्थिति|अनुच्छेद को पढ़/i;
const WRITING =
  /पत्र\s*(लिखिए|लिखें|लिखो)|पत्रं\s*लिखत|निबंध|निबन्ध|अनुच्छेद\s*(लिखिए|लिखें)|अनुच्छेदं\s*लिखत|आवेदन\s*पत्र|प्रार्थना\s*पत्र|write (a|an) (letter|application|essay|paragraph|notice|report|story|diary|message|invitation)|letter to (the|your)|essay on/i;
// grammar exercises name what they practise; a chapter called "grammar" alone is not enough (lessons get filed there)
const GRAMMAR =
  /\b(plurals?|singular|opposites?|antonyms?|synonyms?|nouns?|pronouns?|verbs?|adjectives?|adverbs?|tenses?|active voice|passive voice|narration|reported speech|prepositions?|conjunctions?|articles?|punctuate|punctuation|degrees? of comparison|gender)\b|do as directed|संधि|सन्धि|समास|उपसर्ग|प्रत्यय|पर्यायवाची|विलोम|वचन\s*(बदल|लिखिए)|लिंग\s*(बदल|लिखिए)|विशेषण|सर्वनाम|संज्ञा\s*(छाँट|बनाइए|लिखिए)|मुहावर|लोकोक्ति|अलंकार|वर्तनी|शुद्ध\s*(कीजिए|कीजिये|रूप)|अनेकार्थी|तत्सम|तद्भव|कारक|वाच्य|शब्दरूप|धातुरूप|अव्यय|लकार|सन्धिविच्छेद/i;
const MAP = /मानचित्र|नक्श|outline map|on the (given |political |physical )?map|map of india|in the map/i;
const DRAW = /\bdraw\b|\bsketch\b|चित्र\s*(बनाइए|बनाकर|बनाओ|बनाएँ|बनाएं)|आरेख\s*(बनाइए|खींचिए)|\bconstruct\b|रचना\s*कीजिए/i;

function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** The closer type for this question, or null when its stored type already fits. */
export function suggestQuestionType(q: InferableQuestion): TypeSuggestion | null {
  if (!GENERAL_TYPES.has(q.type)) return null;
  const n = classNumberOf(q.className);
  if (n !== null && n > 8) return null;
  const answer = ANSWER_TYPES.has(q.type);
  const fam = subjectFamily(q.subject);
  const role = chapterRole(q.chapterTitle ?? "", q.subject);
  const text = q.text ?? "";
  const parts = (q.subparts ?? []).filter((p) => (p.text ?? "").trim() || (p.marks ?? 0) > 0);
  const partsText = parts.map((p) => p.text ?? "").join(" ");
  const pick = (type: string, reason: string): TypeSuggestion | null => (type === q.type ? null : { type, reason });

  if (parts.length >= 2) {
    if (fam === "LANGUAGE") {
      if (RTC.test(text) || RTC.test(partsText)) return pick("REFERENCE_CONTEXT", "asks for reference, context or explanation of lines");
      if (role === "PASSAGE") return pick("UNSEEN_PASSAGE", "its chapter is the unseen passage");
      if (PASSAGE.test(text)) return pick("UNSEEN_PASSAGE", "a passage to read with questions on it");
      if (words(text) >= 60) return pick("UNSEEN_PASSAGE", `a ${words(text)}-word passage with ${parts.length} questions on it`);
      return null;
    }
    if (CASE.test(text) || words(text) >= 40) return pick("CASE_STUDY", "a case or source to read with questions on it");
    return null;
  }

  // Without sub-parts, the question's own words decide: teachers often file a question under the wrong chapter
  // (a poem's explanation under "Writing", a lesson question under "Grammar").
  if (fam === "LANGUAGE") {
    if (answer && RTC.test(text)) return pick("REFERENCE_CONTEXT", "asks for reference, context or explanation of lines");
    if (answer && WRITING.test(text)) return pick("WRITING_SKILL", "asks for a letter, essay or other writing");
    if (q.type !== "CASE_STUDY" && GRAMMAR.test(text)) return pick("GRAMMAR", role === "GRAMMAR" ? "a grammar exercise in a grammar chapter" : "a grammar exercise");
    return null;
  }
  if (!answer) return null;
  if ((fam === "SST" || role === "MAP") && MAP.test(text)) return pick("MAP_WORK", "asks to mark or show something on a map");
  if (fam !== "OTHER" && DRAW.test(text)) return pick("DRAW", "asks to draw a diagram, sketch or construction");
  return null;
}
