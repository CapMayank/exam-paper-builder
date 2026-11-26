/**
 * Which question type a bank question really is, read from what it holds. Teachers often build an unseen passage
 * as a Short or Long answer with sub-parts, or a map question as a Long answer, so it never links to the slots
 * made for that form. `suggestQuestionType` says when a question's stored type looks wrong and which one fits.
 * It only re-reads the general forms (Short, Long, Very short, Case study); a type the teacher picked on purpose
 * (MCQ, Grammar, Writing skill...) is left alone. Pure, safe on client and server.
 */
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
};

/** The general forms a teacher picks when no closer one comes to mind; only these are re-read. */
const GENERAL_TYPES = new Set(["SHORT", "LONG", "VERY_SHORT", "CASE_STUDY"]);

const RTC = /सन्दर्भ|संदर्भ|प्रसंग|सप्रसंग|व्याख्या|reference to (the )?context|\bextract\b|\bRTC\b/i;
const PASSAGE = /अपठित|गद्यांश|काव्यांश|unseen|passage|read the (following|given|poem|stanza)|पढ़कर|पढ़िए|पढ़ें|पठित्वा|अधोलिखितं|stanza/i;
const CASE = /\bcase\b|source[- ]based|read the|पढ़कर|स्रोत|परिस्थिति|अनुच्छेद को पढ़/i;
const WRITING =
  /पत्र\s*(लिखिए|लिखें|लिखो)|पत्रं\s*लिखत|निबंध|निबन्ध|अनुच्छेद\s*(लिखिए|लिखें)|अनुच्छेदं\s*लिखत|आवेदन\s*पत्र|प्रार्थना\s*पत्र|write (a|an) (letter|application|essay|paragraph|notice|report|story|diary|message|invitation)|letter to (the|your)|essay on/i;
const MAP = /मानचित्र|नक्श|outline map|on the (given |political |physical )?map|map of india|in the map/i;
const DRAW = /\bdraw\b|\bsketch\b|चित्र\s*(बनाइए|बनाकर|बनाओ|बनाएँ|बनाएं)|आरेख\s*(बनाइए|खींचिए)|\bconstruct\b|रचना\s*कीजिए/i;

function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** The closer type for this question, or null when its stored type already fits. */
export function suggestQuestionType(q: InferableQuestion): TypeSuggestion | null {
  if (!GENERAL_TYPES.has(q.type)) return null;
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

  if (fam === "LANGUAGE") {
    if (role === "WRITING" || WRITING.test(text)) return pick("WRITING_SKILL", role === "WRITING" ? "its chapter is a writing task" : "asks for a letter, essay or other writing");
    if (role === "GRAMMAR" && q.type !== "CASE_STUDY") return pick("GRAMMAR", "its chapter is grammar");
    return null;
  }
  if ((fam === "SST" || role === "MAP") && MAP.test(text)) return pick("MAP_WORK", "asks to mark or show something on a map");
  if (fam !== "OTHER" && DRAW.test(text)) return pick("DRAW", "asks to draw a diagram, sketch or construction");
  return null;
}
