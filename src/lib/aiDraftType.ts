import { QUESTION_TYPES, QUESTION_TYPE_LABEL, type QuestionType } from "./constants";

/**
 * The type a question from the AI tool becomes in the edit form: its own type when the app has it (any case,
 * or the type's label), otherwise MCQ if it came with options, else SHORT.
 */
export function aiDraftType(type: string | null | undefined, options?: string[] | null): QuestionType {
  const t = (type ?? "").trim();
  if (t) {
    const upper = t.toUpperCase();
    const byValue = QUESTION_TYPES.find((v) => v === upper);
    if (byValue) return byValue;
    const lower = t.toLowerCase();
    const byLabel = QUESTION_TYPES.find((v) => QUESTION_TYPE_LABEL[v].toLowerCase() === lower);
    if (byLabel) return byLabel;
  }
  return options && options.length > 0 ? "MCQ" : "SHORT";
}
