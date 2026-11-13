import { QUESTION_TYPES, type QuestionType } from "./constants";

/**
 * The type a question from the AI tool becomes in the edit form: its own type when the app has it, otherwise
 * MCQ if it came with options, else SHORT.
 */
export function aiDraftType(type: string | null | undefined, options?: string[] | null): QuestionType {
  if (type && (QUESTION_TYPES as readonly string[]).includes(type)) return type as QuestionType;
  return options && options.length > 0 ? "MCQ" : "SHORT";
}
