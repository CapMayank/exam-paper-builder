import type { BlueprintTemplateSectionGroup } from "./curriculumTemplates";
import { isObjectiveRow } from "./layout";

export type BoardSectionLang = "en" | "hi" | "sa";

const SECTION_LETTERS: Record<BoardSectionLang, string[]> = {
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  hi: ["अ", "ब", "स", "द", "इ", "फ", "ग", "ह"],
  sa: ["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ"],
};

const OBJECTIVE_NAME: Record<BoardSectionLang, string> = {
  en: "Objective Questions",
  hi: "वस्तुनिष्ठ प्रश्न",
  sa: "वस्तुनिष्ठप्रश्नाः",
};

/** A board-style section heading: "Section A — {name}", "खण्ड 'अ' — {name}" or "खण्डः 'क' — {name}". */
export function boardSectionHeading(index: number, lang: BoardSectionLang, name: string): string {
  const letters = SECTION_LETTERS[lang];
  const letter = letters[index] ?? String(index + 1);
  if (lang === "hi") return `खण्ड '${letter}' — ${name}`;
  if (lang === "sa") return `खण्डः '${letter}' — ${name}`;
  return `Section ${letter} — ${name}`;
}

const DIGITS = "[0-9०-९]+";
const QUESTION_PREFIXES = [
  // Question 1: … / Questions 6 to 17: …
  new RegExp(String.raw`^questions?\s+${DIGITS}(?:\s*(?:to|-|–)\s*${DIGITS})?\s*:\s*`, "i"),
  // प्रश्न 1: … / प्रश्न 6 से 17: …
  new RegExp(String.raw`^प्रश्न\s*${DIGITS}(?:\s*(?:से|-|–)\s*${DIGITS})?\s*:\s*`),
  // प्रश्नः १ : … / प्रश्नः 6 तः 17 पर्यन्तम् : …
  new RegExp(String.raw`^प्रश्नः\s*${DIGITS}(?:\s*तः\s*${DIGITS}(?:\s*पर्यन्तम्)?)?\s*:\s*`),
  // खण्डः 'छ' : …
  /^खण्डः?\s*'[^']+'\s*:\s*/,
  // Section E – … / SECTION-B: …
  /^section[\s-]*[A-Z]\s*[–—:-]\s*/i,
];

/** A heading without its question-number or khand prefix: "Questions 6 to 17: Very Short …" → "Very Short …". */
export function stripQuestionPrefix(title: string): string {
  const t = title.trim();
  for (const re of QUESTION_PREFIXES) {
    if (re.test(t)) return t.replace(re, "").trim();
  }
  return t;
}

type Group = BlueprintTemplateSectionGroup;

/** A section holding exactly one objective row (a match counts here: it is one objective question). */
function isSingleObjectiveGroup(g: Group): boolean {
  if (g.questionTypes.length !== 1) return false;
  const row = g.questionTypes[0];
  return row.type === "MATCH_COLUMN" || isObjectiveRow(row);
}

/**
 * Board style for a template's sections: the first run of two or more sections that each hold one objective form
 * becomes one objective section, each row keeping its old prompt as its question title; every later section is
 * re-lettered after it. Marks, counts and every row field are unchanged. With no such run, `groups` is returned as is.
 */
export function regroupObjectiveSections(groups: Group[], lang: BoardSectionLang): Group[] {
  let start = -1;
  let end = -1;
  for (let i = 0; i < groups.length; i++) {
    if (!isSingleObjectiveGroup(groups[i])) continue;
    let j = i;
    while (j + 1 < groups.length && isSingleObjectiveGroup(groups[j + 1])) j++;
    if (j > i) {
      start = i;
      end = j;
      break;
    }
    i = j;
  }
  if (start < 0) return groups;

  const objective: Group = {
    title: boardSectionHeading(0, lang, OBJECTIVE_NAME[lang]),
    instructions: "",
    questionTypes: groups.slice(start, end + 1).map((g) => ({
      ...g.questionTypes[0],
      questionTitle: g.instructions.trim() || stripQuestionPrefix(g.title),
    })),
  };
  const later = groups.slice(end + 1).map((g, k) => ({ ...g, title: boardSectionHeading(k + 1, lang, stripQuestionPrefix(g.title)) }));
  return [...groups.slice(0, start), objective, ...later];
}
