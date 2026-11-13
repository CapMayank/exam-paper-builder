// Which question types a blueprint slot may take. A slot is a marks contract ("6 × 3 marks"); its `type` is the
// default form, and `allowedTypesJson` lists the other forms a teacher may use instead at the same marks
// (e.g. a grammar or passage question in an English paper's 3-mark section). Pure: no I/O.

import { QUESTION_TYPE_LABEL } from "./constants";

/** A question type as the teacher reads it; the stored value when the type has no label. */
export function typeLabel(type: string): string {
  return (QUESTION_TYPE_LABEL as Record<string, string>)[type] ?? type;
}

/** Several types as the teacher reads them. Labels hold commas of their own, so they are joined with "; ". */
export function typeLabels(types: string[]): string {
  return types.map(typeLabel).join("; ");
}

/** One-mark objective forms that have always been interchangeable in a one-mark section. */
const OBJECTIVE_TYPES = ["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "ONE_WORD"];
const SUBJECTIVE_TYPES = ["SHORT", "LONG"];

export type TypedSection = { type: string; marksEach: number; allowedTypesJson?: string | null };

export function parseAllowedTypes(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string" && t.length > 0) : [];
  } catch {
    return [];
  }
}

/**
 * Every type a question placed in this slot may have, its default type first. A section with no stored list
 * takes only its own type, as placement always has.
 */
export function allowedTypesFor(section: TypedSection): string[] {
  const out = [section.type];
  for (const t of parseAllowedTypes(section.allowedTypesJson)) if (!out.includes(t)) out.push(t);
  return out;
}

/** May a new question of `type` be placed in this slot (picker, autofill, AI, OR swap)? */
export function isTypeAllowed(section: TypedSection, type: string | null | undefined): boolean {
  if (!type) return true;
  return allowedTypesFor(section).includes(type);
}

/**
 * Is a question ALREADY in this slot acceptable, so no mismatch warning is shown? Allowed types, plus the
 * tolerance older papers rely on: SHORT and LONG swap at 3+ marks, the objective forms swap at 1 mark.
 */
export function toleratesType(section: TypedSection, type: string | null | undefined): boolean {
  if (isTypeAllowed(section, type)) return true;
  const t = type as string;
  if (SUBJECTIVE_TYPES.includes(t) && SUBJECTIVE_TYPES.includes(section.type) && section.marksEach >= 3) return true;
  if (OBJECTIVE_TYPES.includes(t) && OBJECTIVE_TYPES.includes(section.type) && section.marksEach === 1) return true;
  return false;
}

/**
 * Why a question of `type` worth `marks` cannot fill this slot; null if it can. A question in a non-default form
 * must carry exactly the slot's marks, so mixing forms never moves the paper's total.
 */
export function typeRejection(
  section: TypedSection & { title: string },
  type: string | null | undefined,
  marks?: number | null,
): string | null {
  if (!type || type === section.type) return null;
  if (!isTypeAllowed(section, type)) {
    return `${section.title} only accepts ${typeLabels(allowedTypesFor(section))} questions, not ${typeLabel(type)}.`;
  }
  if (marks && marks > 0 && marks !== section.marksEach) {
    return `${section.title} takes ${section.marksEach}-mark questions; this ${typeLabel(type)} question is worth ${marks}.`;
  }
  return null;
}

/** Why an OR question of a type this section does not take is refused. */
export function orTypeRefusal(section: TypedSection): string {
  const allowed = allowedTypesFor(section);
  return allowed.length === 1
    ? `The OR question must be of type ${typeLabel(allowed[0])}.`
    : `The OR question must be one of: ${typeLabels(allowed)}.`;
}

export type SubjectFamily = "LANGUAGE" | "SCIENCE" | "SST" | "MATHS" | "OTHER";

export function subjectFamily(subject: string | null | undefined): SubjectFamily {
  const s = (subject ?? "").toLowerCase();
  if (/english|hindi|sanskrit|urdu|marathi|हिंदी|हिन्दी|संस्कृत|अंग्रेज/.test(s)) return "LANGUAGE";
  if (/math|गणित/.test(s)) return "MATHS";
  if (/social|sst|history|geograph|civics|economics|सामाजिक/.test(s)) return "SST";
  if (/science|evs|environment|विज्ञान|पर्यावरण/.test(s)) return "SCIENCE";
  return "OTHER";
}

/** The school pattern's starting list for a slot of `marksEach`, by subject. Admins can edit it per section. */
export function defaultAllowedTypes(type: string, marksEach: number, subject: string | null | undefined): string[] {
  const fam = subjectFamily(subject);
  const list: string[] = [];
  if (marksEach === 1) {
    list.push("MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN");
    if (fam === "LANGUAGE") list.push("GRAMMAR");
  } else if (marksEach === 2) {
    list.push("VERY_SHORT");
    if (fam === "LANGUAGE") list.push("GRAMMAR");
    if (fam === "SCIENCE") list.push("DRAW");
  } else if (marksEach <= 4) {
    list.push("SHORT", "LONG");
    if (fam === "LANGUAGE") list.push("GRAMMAR", "REFERENCE_CONTEXT", "UNSEEN_PASSAGE");
    if (fam === "SCIENCE") list.push("DRAW");
    if (fam === "SST") list.push("MAP_WORK");
  } else {
    list.push("LONG", "SHORT");
    if (fam === "LANGUAGE") list.push("WRITING_SKILL", "UNSEEN_PASSAGE");
    if (fam === "SCIENCE") list.push("DRAW");
    if (fam === "SST") list.push("MAP_WORK");
    if (fam === "MATHS") list.push("CASE_STUDY");
  }
  return [type, ...list.filter((t) => t !== type)];
}

/** The instruction line to print for a placed question: only what the teacher typed; nothing when they typed none. */
export function questionInstruction(_section: TypedSection, _questionType: string, stored?: string | null): string {
  return (stored ?? "").trim();
}

/**
 * The instruction line printed above one item of a grouped exercise: the one the teacher typed, or "" when none was
 * typed or it only repeats the exercise's own instruction.
 */
export function groupedItemInstruction(
  section: TypedSection,
  questionType: string,
  stored: string | null | undefined,
  exerciseInstruction: string | null | undefined,
): string {
  const own = questionInstruction(section, questionType, stored);
  return own && own !== (exerciseInstruction ?? "").trim() ? own : "";
}
