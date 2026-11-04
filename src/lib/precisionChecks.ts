/**
 * Deterministic checks for wording defects that make a question wrong or unanswerable even though it "looks" fine.
 * Each check comes from an error a teacher had to correct in a generated paper. A finding is an ERROR, so the
 * generator repairs or regenerates the question instead of letting it reach the printed paper.
 */

export interface PrecisionIssue {
  code: "FILL_BLANK_GIVEAWAY" | "MOLECULAR_MASS_OF_IONIC" | "CONTRADICTORY_DRAWING_TASK" | "VERIFY_WITHOUT_DATA";
  dimension: "clarity" | "academicCorrectness" | "completeness";
  message: string;
  evidence: string;
  recommendation: string;
}

export interface PrecisionCheckInput {
  type?: string | null;
  text?: string | null;
  answer?: string | null;
  subparts?: Array<{ text?: string | null }> | null;
}

/** Strip LaTeX wrappers so "$\text{Al}_2(\text{SO}_4)_3$" reads as "Al2(SO4)3". */
function plainChem(s: string): string {
  return s.replace(/\\(?:text|mathrm|ce)\s*/g, "").replace(/[${}_\\]/g, "").replace(/\s+/g, " ");
}

const BLANK = /_{3,}|\.{4,}|…{2,}/;
const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "which", "into", "are", "was", "were", "its", "their", "है", "हैं", "का", "की", "के", "को", "में", "से", "एवं", "तथा", "और"]);

function contentWords(s: string): string[] {
  return (s.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).filter((w) => w.length >= 3 && !STOP.has(w));
}

/** The answer of a fill-in-the-blank already appears in the sentence (outside a bracketed hint or choice list). */
function fillBlankGiveaway(text: string, answer: string): string | null {
  if (!BLANK.test(text)) return null;
  const answerWords = contentWords(answer.replace(/\(.*?\)/g, ""));
  if (answerWords.length === 0 || answerWords.length > 4) return null;
  // hints such as "(modal verb)" or choice lists "(evaporation / condensation)" are allowed to name the answer
  const stem = text.replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ");
  const stemWords = new Set(contentWords(stem));
  return answerWords.every((w) => stemWords.has(w)) ? answerWords.join(" ") : null;
}

const ION_FORMULA = /\b(?:Na|K|Ca|Mg|Al|Zn|Fe|Cu|Ba|Li|Ag|Pb|NH4)\d*\(?(?:Cl|SO4|SO3|NO3|NO2|CO3|HCO3|PO4|OH|O|Br|I|S|F)\)?\d*\b|\(NH4\)\d*(?:SO4|CO3|PO4)/;
const ION_NAME_EN = /\b(?:sodium|potassium|calcium|magnesium|aluminium|aluminum|zinc|iron|ferrous|ferric|copper|cupric|barium|lithium|silver|lead|ammonium)\s+(?:chloride|sulphate|sulfate|sulphite|nitrate|nitrite|carbonate|hydrogen carbonate|bicarbonate|phosphate|oxide|hydroxide|bromide|iodide|sulphide|sulfide|fluoride)\b/i;
const ION_NAME_HI = /(?:सोडियम|पोटैशियम|पोटेशियम|कैल्शियम|कैल्सियम|मैग्नीशियम|ऐलुमिनियम|एलुमिनियम|एल्युमिनियम|एल्यूमिनियम|ऐल्युमिनियम|जिंक|जस्ता|कॉपर|ताँबा|बेरियम|अमोनियम|सिल्वर)\s*(?:क्लोराइड|सल्फेट|सल्फ़ेट|नाइट्रेट|कार्बोनेट|फ़ॉस्फ़ेट|फॉस्फेट|ऑक्साइड|ओक्साइड|हाइड्रॉक्साइड|हाइड्रोक्साइड|ब्रोमाइड|आयोडाइड|सल्फाइड)/;
const MOLECULAR_MASS = /molecular\s+mass|molecular\s+weight|आण्विक\s*द्रव्यमान|अणु\s*द्रव्यमान|आणविक\s*द्रव्यमान/i;

/** "Molecular mass" asked of an ionic compound: the textbook term is formula unit mass. */
function molecularMassOfIonic(text: string): string | null {
  if (!MOLECULAR_MASS.test(text)) return null;
  const plain = plainChem(text);
  const m = plain.match(ION_FORMULA) ?? plain.match(ION_NAME_EN) ?? text.match(ION_NAME_HI);
  if (!m) return null;
  // "molecular mass of H2O and formula unit mass of NaCl" names both correctly
  if (/formula\s+unit\s+mass|सूत्र\s*इकाई\s*द्रव्यमान/i.test(text)) return null;
  return m[0];
}

const CONTRADICTORY_DRAWING = /textual\s+(?:outline|diagram|sketch)|diagram\s+in\s+words|draw\s+(?:a\s+)?(?:neat\s+)?(?:,\s*)?(?:well[-\s]labell?ed\s+)?(?:text|textual)\b|शाब्दिक\s*(?:रूपरेखा|आरेख)/i;

/** Asks to verify / prove a law from data, but supplies no numbers. */
function verifyWithoutData(all: string): boolean {
  const asksVerify = /\bverify\b|\bverification\b|सत्यापित|सत्यापन/i.test(all);
  const ofLaw = /\blaw\b|नियम/i.test(all);
  if (!asksVerify || !ofLaw) return false;
  return !/\d/.test(all.replace(/class\s*\d+|कक्षा\s*\d+/gi, ""));
}

export function precisionIssues(q: PrecisionCheckInput): PrecisionIssue[] {
  const text = String(q.text ?? "");
  const answer = String(q.answer ?? "");
  const type = String(q.type ?? "").toUpperCase();
  const subText = (q.subparts ?? []).map((s) => String(s?.text ?? "")).join(" \n ");
  const all = `${text}\n${subText}`;
  const out: PrecisionIssue[] = [];

  if (type === "FILL_BLANK") {
    const given = fillBlankGiveaway(text, answer);
    if (given) {
      out.push({
        code: "FILL_BLANK_GIVEAWAY",
        dimension: "clarity",
        message: `The fill-in-the-blank sentence already contains its answer ("${given}"), so it tests nothing.`,
        evidence: text,
        recommendation: "Reword so the blank holds the tested term and no other word in the sentence gives it away.",
      });
    }
  }

  const ionic = molecularMassOfIonic(all);
  if (ionic) {
    out.push({
      code: "MOLECULAR_MASS_OF_IONIC",
      dimension: "academicCorrectness",
      message: `"Molecular mass" is asked of an ionic compound (${ionic}); ionic compounds have a formula unit mass.`,
      evidence: all.trim(),
      recommendation: "Ask for the formula unit mass of the ionic compound.",
    });
  }

  if (CONTRADICTORY_DRAWING.test(all)) {
    out.push({
      code: "CONTRADICTORY_DRAWING_TASK",
      dimension: "clarity",
      message: "The instruction contradicts itself (a 'textual' outline or diagram).",
      evidence: all.trim(),
      recommendation: "Write 'Draw a neat, well-labelled diagram of ...' or ask for a written answer, not both.",
    });
  }

  if (verifyWithoutData(all)) {
    out.push({
      code: "VERIFY_WITHOUT_DATA",
      dimension: "completeness",
      message: "The question asks students to verify a law but gives no data to verify it from.",
      evidence: all.trim(),
      recommendation: "Give the measurements (e.g. the masses of at least two samples) needed to verify the law.",
    });
  }

  return out;
}
