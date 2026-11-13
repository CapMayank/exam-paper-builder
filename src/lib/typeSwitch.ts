import { canHaveSubparts, isKindergartenType, isSubpartQuestionType } from "./constants";
import type { SubPart } from "./types";

/** The four standard Assertion & Reason choices a new A/R question starts with. */
export const DEFAULT_ASSERTION_OPTIONS_EN = [
  "Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).",
  "Both Assertion (A) and Reason (R) are true but Reason (R) is not the correct explanation of Assertion (A).",
  "Assertion (A) is true but Reason (R) is false.",
  "Assertion (A) is false but Reason (R) is true.",
];

export const DEFAULT_ASSERTION_OPTIONS_HI = [
  "अभिकथन (A) और कारण (R) दोनों सही हैं तथा कारण (R), अभिकथन (A) की सही व्याख्या करता है।",
  "अभिकथन (A) और कारण (R) दोनों सही हैं, परन्तु कारण (R), अभिकथन (A) की सही व्याख्या नहीं करता है।",
  "अभिकथन (A) सही है, किंतु कारण (R) गलत है।",
  "अभिकथन (A) गलत है, किंतु कारण (R) सही है।",
];

/** The text an empty question gets when it is switched to Assertion & Reason. */
export const ASSERTION_REASON_TEXT_TEMPLATE =
  "Assertion (A): [Enter statement here]\nReason (R): [Enter reason here]\n\nDirection: In the following question, a statement of Assertion (A) is followed by a statement of Reason (R). Choose the correct option.";

/** The text an empty question gets when it is switched to Match the column. */
export const MATCH_COLUMN_TEXT_TEMPLATE =
  "Match Column A with Column B and choose the correct match: / सही जोड़ी मिलाइए (स्तम्भ 'अ' को स्तम्भ 'ब' से सुमेलित कीजिए):";

/** The parts a new question of this type starts with (none for most types). */
export function getDefaultSubpartsForType(qType?: string, targetMarks?: number): SubPart[] {
  const total = targetMarks && targetMarks >= 2 ? targetMarks : 4;
  if (qType === "REFERENCE_CONTEXT") {
    if (total === 5) {
      return [
        { label: "(क)", text: "सन्दर्भ (Reference): पाठ एवं कवि/लेखक का नाम लिखिए।", marks: 1, answer: "" },
        { label: "(ख)", text: "प्रसंग (Context): पंक्तियों का मुख्य प्रसंग स्पष्ट कीजिए।", marks: 1, answer: "" },
        { label: "(ग)", text: "व्याख्या (Explanation): प्रस्तुत अंश की सप्रसंग व्याख्या कीजिए।", marks: 2, answer: "" },
        { label: "(घ)", text: "विशेष / काव्य-सौन्दर्य (Literary Beauty): भाषा, शैली, रस एवं अलंकार लिखिए।", marks: 1, answer: "" },
      ];
    }
    if (total === 3) {
      return [
        { label: "(क)", text: "सन्दर्भ एवं प्रसंग (Reference & Context)", marks: 1, answer: "" },
        { label: "(ख)", text: "व्याख्या एवं विशेष (Explanation & Literary Note)", marks: 2, answer: "" },
      ];
    }
    return [
      { label: "(क)", text: "सन्दर्भ एवं प्रसंग (Reference & Context)", marks: 1, answer: "" },
      { label: "(ख)", text: "व्याख्या (Explanation)", marks: Math.max(1, total - 2), answer: "" },
      { label: "(ग)", text: "विशेष / काव्य-सौन्दर्य (Poetic / Literary Beauty)", marks: 1, answer: "" },
    ];
  }
  if (qType === "UNSEEN_PASSAGE") {
    if (total === 5) {
      return [
        { label: "(i)", text: "उपर्युक्त गद्यांश का उपयुक्त शीर्षक लिखिए। / Give a suitable title to the passage.", marks: 1, answer: "" },
        { label: "(ii)", text: "", marks: 1, answer: "" },
        { label: "(iii)", text: "", marks: 1, answer: "" },
        { label: "(iv)", text: "", marks: 2, answer: "" },
      ];
    }
    return [
      { label: "(i)", text: "", marks: 1, answer: "" },
      { label: "(ii)", text: "", marks: 1, answer: "" },
      { label: "(iii)", text: "", marks: Math.max(1, total - 2), answer: "" },
    ];
  }
  if (qType === "CASE_STUDY") {
    return [
      { label: "(i)", text: "", marks: 1, answer: "" },
      { label: "(ii)", text: "", marks: 1, answer: "" },
      { label: "(iii)", text: "", marks: Math.max(1, total - 2), answer: "" },
    ];
  }
  return [];
}

/** The options a new question of this type starts with. */
export function freshOptionsFor(type: string): string[] {
  return type === "ASSERTION_REASON" ? [...DEFAULT_ASSERTION_OPTIONS_EN] : ["", "", "", ""];
}

function sameList(a: string[] | undefined, b: string[] | undefined): boolean {
  const x = a ?? [];
  const y = b ?? [];
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/** Same parts on label, text, marks, answer and options (ids are ignored). */
function samePartsIgnoringIds(a: SubPart[], b: SubPart[]): boolean {
  return (
    a.length === b.length &&
    a.every((p, i) => {
      const q = b[i];
      return (
        p.label === q.label &&
        p.text === q.text &&
        p.marks === q.marks &&
        (p.answer ?? "") === (q.answer ?? "") &&
        sameList(p.options, q.options) &&
        (p.subparts?.length ?? 0) === 0
      );
    })
  );
}

/** The fields a type switch changes. */
export type TypeSwitchFields = { text: string; subparts: SubPart[]; options: string[]; answer: string };

/**
 * The text, parts, options and answer after the question's type changes from `oldType` to `newType`.
 * (Kindergarten activities, answer space and the type itself are handled by the form.)
 */
export function switchTypeFields(
  oldType: string,
  newType: string,
  fields: TypeSwitchFields,
  targetMarks?: number,
): TypeSwitchFields {
  let { text, subparts, options, answer } = fields;
  // What the old type put in and the teacher never touched goes; anything they edited stays.
  if (oldType !== newType) {
    const oldParts = getDefaultSubpartsForType(oldType, targetMarks);
    if (oldParts.length > 0 && samePartsIgnoringIds(subparts, oldParts)) subparts = [];
    if (oldType === "ASSERTION_REASON") {
      const untouchedOptions = sameList(options, DEFAULT_ASSERTION_OPTIONS_EN) || sameList(options, DEFAULT_ASSERTION_OPTIONS_HI);
      if (untouchedOptions) {
        options = freshOptionsFor(newType);
        if (answer === "A") answer = "";
      }
      if (text === ASSERTION_REASON_TEXT_TEMPLATE) text = "";
    }
  }
  if (isKindergartenType(newType)) return { text, subparts, options, answer };
  if (newType === "ASSERTION_REASON") {
    // keep options the teacher already typed; only an empty set gets the standard A/R choices
    if (options.every((o) => !o.trim())) options = [...DEFAULT_ASSERTION_OPTIONS_EN];
    if (!text.trim()) text = ASSERTION_REASON_TEXT_TEMPLATE;
    if (!answer) answer = "A";
  } else if (newType === "MATCH_COLUMN") {
    if (!text.trim()) text = MATCH_COLUMN_TEXT_TEMPLATE;
  } else if (isSubpartQuestionType(newType)) {
    if (subparts.length === 0) subparts = getDefaultSubpartsForType(newType, targetMarks);
  } else if (!canHaveSubparts(newType)) {
    subparts = [];
  }
  return { text, subparts, options, answer };
}
