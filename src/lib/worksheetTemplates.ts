import { KINDERGARTEN_QUESTION_TYPES } from "./constants";

/** Stored as PresetOverride rows of this kind (school-wide); built-ins live in code below. */
export const WORKSHEET_TEMPLATE_KIND = "WORKSHEET_TEMPLATE";

/** One activity of a template. Built-ins leave text/options out: the activity's own default (for the subject) is used. */
export type TemplateActivity = { type: string; text?: string; options?: string[]; marks: number };

export type WorksheetTemplate = {
  id: string;
  name: string;
  className: string;
  subject: string;
  builtIn: boolean;
  activities: TemplateActivity[];
  createdById?: string;
  createdByName?: string;
};

const SETS: Record<string, Record<string, { name: string; types: string[] }>> = {
  Nursery: {
    English: { name: "Nursery English – first letters", types: ["KDG_PREWRITING", "KDG_TRACE_WRITE", "KDG_PICTURE_MATCH", "KDG_COLOUR"] },
    Mathematics: { name: "Nursery Maths – counting to 10", types: ["KDG_COUNT_ITEMS", "KDG_COMPARE", "KDG_JOIN_DOTS", "KDG_PATTERN"] },
    Hindi: { name: "Nursery Hindi – स्वर", types: ["KDG_PREWRITING", "KDG_HINDI_VARNAMALA", "KDG_HINDI_FIRST_LETTER", "KDG_COLOUR"] },
    "General Awareness (EVS)": { name: "Nursery EVS – things around us", types: ["KDG_EVS_NAME", "KDG_EVS_SORT", "KDG_EVS_ODD_ONE", "KDG_COLOUR"] },
    "Rhymes & Activities": { name: "Nursery fun & strokes", types: ["KDG_PREWRITING", "KDG_JOIN_DOTS", "KDG_COLOUR", "KDG_COMPARE", "KDG_COUNT_ITEMS"] },
  },
  LKG: {
    English: { name: "LKG English – letters & sounds", types: ["KDG_TRACE_WRITE", "KDG_MISSING_LETTERS", "KDG_PICTURE_MATCH", "KDG_TICK_PICTURE"] },
    Mathematics: { name: "LKG Maths – numbers to 20", types: ["KDG_NUMBER_GRID", "KDG_COUNT_ITEMS", "KDG_PATTERN", "KDG_COMPARE"] },
    Hindi: { name: "LKG Hindi – वर्णमाला", types: ["KDG_HINDI_VARNAMALA", "KDG_HINDI_MISSING", "KDG_HINDI_LETTER_MATCH", "KDG_HINDI_FIRST_LETTER"] },
    "General Awareness (EVS)": { name: "LKG EVS – animals & fruits", types: ["KDG_EVS_SORT", "KDG_EVS_HOME", "KDG_EVS_ODD_ONE", "KDG_EVS_NAME"] },
    "Rhymes & Activities": { name: "LKG fun – patterns & dots", types: ["KDG_PATTERN", "KDG_JOIN_DOTS", "KDG_COLOUR", "KDG_TRACE_WRITE", "KDG_COUNT_ITEMS"] },
  },
  UKG: {
    English: { name: "UKG English – words", types: ["KDG_TRACE_WRITE", "KDG_MISSING_LETTERS", "KDG_SEQUENCE_CHAIN", "KDG_PICTURE_MATCH", "KDG_TICK_PICTURE"] },
    Mathematics: { name: "UKG Maths – numbers to 50 & sums", types: ["KDG_NUMBER_GRID", "KDG_PICTURE_SUM", "KDG_SEQUENCE_CHAIN", "KDG_COMPARE", "KDG_PATTERN"] },
    Hindi: { name: "UKG Hindi – अक्षर और शब्द", types: ["KDG_HINDI_MISSING", "KDG_HINDI_FIRST_LETTER", "KDG_HINDI_LETTER_MATCH", "KDG_TRACE_WRITE", "KDG_HINDI_VARNAMALA"] },
    "General Awareness (EVS)": { name: "UKG EVS – our world", types: ["KDG_EVS_SORT", "KDG_EVS_HOME", "KDG_EVS_NAME", "KDG_EVS_ODD_ONE", "KDG_COUNT_ITEMS"] },
    "Rhymes & Activities": { name: "UKG fun – puzzles", types: ["KDG_JOIN_DOTS", "KDG_PATTERN", "KDG_CIRCLE_TARGET", "KDG_COLOUR"] },
  },
};

export const BUILT_IN_TEMPLATES: WorksheetTemplate[] = Object.entries(SETS).flatMap(([className, bySubject]) =>
  Object.entries(bySubject).map(([subject, set]) => ({
    id: `builtin-${className}-${subject}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: set.name,
    className,
    subject,
    builtIn: true,
    activities: set.types.map((type) => ({ type, marks: 2 })),
  })),
);

/** Templates for this class and subject first; then the same subject in other classes; then the rest. */
export function rankTemplates(list: WorksheetTemplate[], className: string, subject: string) {
  const matching = list.filter((t) => t.className === className && t.subject === subject);
  const rest = list.filter((t) => !(t.className === className && t.subject === subject));
  const others = [...rest.filter((t) => t.subject === subject), ...rest.filter((t) => t.subject !== subject)];
  return { matching, others };
}

const KNOWN_TYPES = new Set<string>(KINDERGARTEN_QUESTION_TYPES);

/** Checks and tidies a template sent by a teacher; throws with a plain message when it can't be saved. */
export function cleanTemplate(input: {
  name: string;
  className: string;
  subject: string;
  activities: { type: string; text?: string; options?: string[]; marks: number }[];
}): Omit<WorksheetTemplate, "id" | "builtIn"> {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error("Give the template a name");
  if (!input.activities.length) throw new Error("A template needs at least one activity");
  if (input.activities.length > 20) throw new Error("A template can hold at most 20 activities");
  const activities = input.activities.map((a) => {
    if (!KNOWN_TYPES.has(a.type)) throw new Error(`Unknown activity type: ${a.type}`);
    const marks = Math.min(20, Math.max(1, Math.round(a.marks || 2)));
    return { type: a.type, ...(a.text !== undefined ? { text: a.text.slice(0, 500) } : {}), ...(a.options ? { options: a.options.slice(0, 4) } : {}), marks };
  });
  return { name, className: input.className.trim(), subject: input.subject.trim(), activities };
}
