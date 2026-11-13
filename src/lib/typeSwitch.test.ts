import { describe, expect, it } from "vitest";
import {
  ASSERTION_REASON_TEXT_TEMPLATE,
  DEFAULT_ASSERTION_OPTIONS_EN,
  DEFAULT_ASSERTION_OPTIONS_HI,
  freshOptionsFor,
  getDefaultSubpartsForType,
  switchTypeFields,
  type TypeSwitchFields,
} from "./typeSwitch";

const BLANK_OPTIONS = ["", "", "", ""];

/** What a fresh form of `type` holds before the teacher types anything. */
function fresh(type: string, targetMarks?: number): TypeSwitchFields {
  return { text: "", subparts: getDefaultSubpartsForType(type, targetMarks), options: freshOptionsFor(type), answer: "" };
}

describe("switchTypeFields: the old type's untouched defaults are cleared", () => {
  it("Reference to context → Short answer drops the template parts", () => {
    for (const marks of [3, 4, 5, undefined]) {
      const from = { ...fresh("REFERENCE_CONTEXT", marks), text: "Read the lines and answer." };
      const next = switchTypeFields("REFERENCE_CONTEXT", "SHORT", from, marks);
      expect(next.subparts).toEqual([]);
      expect(next.text).toBe("Read the lines and answer.");
    }
  });

  it("Unseen passage or Case study → Short / Long answer drops the empty default parts", () => {
    expect(switchTypeFields("UNSEEN_PASSAGE", "SHORT", fresh("UNSEEN_PASSAGE", 5), 5).subparts).toEqual([]);
    expect(switchTypeFields("UNSEEN_PASSAGE", "LONG", fresh("UNSEEN_PASSAGE", 4), 4).subparts).toEqual([]);
    expect(switchTypeFields("CASE_STUDY", "LONG", fresh("CASE_STUDY", 4), 4).subparts).toEqual([]);
    expect(switchTypeFields("CASE_STUDY", "SHORT", fresh("CASE_STUDY"), undefined).subparts).toEqual([]);
  });

  it("compares the parts without their ids", () => {
    const parts = getDefaultSubpartsForType("CASE_STUDY", 4).map((sp, i) => ({ ...sp, id: `p${i}` }));
    const next = switchTypeFields("CASE_STUDY", "SHORT", { ...fresh("CASE_STUDY", 4), subparts: parts }, 4);
    expect(next.subparts).toEqual([]);
  });

  it("Assertion & Reason → MCQ resets the A/R statements, the auto answer and the inserted text", () => {
    const from = { text: ASSERTION_REASON_TEXT_TEMPLATE, subparts: [], options: [...DEFAULT_ASSERTION_OPTIONS_EN], answer: "A" };
    expect(switchTypeFields("ASSERTION_REASON", "MCQ", from)).toEqual({ text: "", subparts: [], options: BLANK_OPTIONS, answer: "" });
  });

  it("resets the Hindi A/R statements too", () => {
    const from = { text: "", subparts: [], options: [...DEFAULT_ASSERTION_OPTIONS_HI], answer: "A" };
    const next = switchTypeFields("ASSERTION_REASON", "MCQ", from);
    expect(next.options).toEqual(BLANK_OPTIONS);
    expect(next.answer).toBe("");
  });

  it("Assertion & Reason → Short answer does not carry the answer A", () => {
    const from = { text: "Assertion (A): Water boils at 100 °C.", subparts: [], options: [...DEFAULT_ASSERTION_OPTIONS_EN], answer: "A" };
    const next = switchTypeFields("ASSERTION_REASON", "SHORT", from);
    expect(next.answer).toBe("");
    expect(next.options).toEqual(BLANK_OPTIONS);
    expect(next.text).toBe("Assertion (A): Water boils at 100 °C.");
  });
});

describe("switchTypeFields: what the teacher wrote is kept", () => {
  it("keeps parts the teacher changed", () => {
    const parts = getDefaultSubpartsForType("REFERENCE_CONTEXT", 3);
    parts[1] = { ...parts[1], text: "व्याख्या कीजिए।" };
    const next = switchTypeFields("REFERENCE_CONTEXT", "SHORT", { ...fresh("REFERENCE_CONTEXT", 3), subparts: parts }, 3);
    expect(next.subparts).toEqual(parts);
  });

  it("keeps parts whose marks or answer the teacher changed", () => {
    const marks = getDefaultSubpartsForType("CASE_STUDY", 4).map((sp, i) => (i === 0 ? { ...sp, marks: 2 } : sp));
    expect(switchTypeFields("CASE_STUDY", "SHORT", { ...fresh("CASE_STUDY", 4), subparts: marks }, 4).subparts).toEqual(marks);
    const answered = getDefaultSubpartsForType("CASE_STUDY", 4).map((sp, i) => (i === 2 ? { ...sp, answer: "Rain" } : sp));
    expect(switchTypeFields("CASE_STUDY", "LONG", { ...fresh("CASE_STUDY", 4), subparts: answered }, 4).subparts).toEqual(answered);
  });

  it("keeps parts that are not the defaults for this question's marks", () => {
    // the 5-mark template is not what a 3-mark question starts with
    const parts = getDefaultSubpartsForType("REFERENCE_CONTEXT", 5);
    expect(switchTypeFields("REFERENCE_CONTEXT", "SHORT", { ...fresh("REFERENCE_CONTEXT", 3), subparts: parts }, 3).subparts).toEqual(parts);
  });

  it("keeps options the teacher typed, and their answer", () => {
    const options = [...DEFAULT_ASSERTION_OPTIONS_EN];
    options[3] = "Both are false.";
    const from = { text: ASSERTION_REASON_TEXT_TEMPLATE, subparts: [], options, answer: "A" };
    const next = switchTypeFields("ASSERTION_REASON", "MCQ", from);
    expect(next.options).toEqual(options);
    expect(next.answer).toBe("A");
  });

  it("keeps an answer the teacher picked other than the auto A", () => {
    const from = { text: "", subparts: [], options: [...DEFAULT_ASSERTION_OPTIONS_EN], answer: "C" };
    expect(switchTypeFields("ASSERTION_REASON", "MCQ", from).answer).toBe("C");
  });

  it("keeps text the teacher typed, even inside the A/R template", () => {
    const typed = ASSERTION_REASON_TEXT_TEMPLATE.replace("[Enter statement here]", "Iron rusts in moist air.");
    const from = { text: typed, subparts: [], options: [...DEFAULT_ASSERTION_OPTIONS_EN], answer: "A" };
    expect(switchTypeFields("ASSERTION_REASON", "MCQ", from).text).toBe(typed);
  });

  it("keeps an MCQ's typed options when going to Assertion & Reason", () => {
    const from = { text: "Pick one", subparts: [], options: ["1", "2", "3", "4"], answer: "B" };
    expect(switchTypeFields("MCQ", "ASSERTION_REASON", from)).toEqual(from);
  });
});

describe("switchTypeFields: the new type still gets its own defaults", () => {
  it("Short answer → Case study gets the case study parts", () => {
    expect(switchTypeFields("SHORT", "CASE_STUDY", fresh("SHORT"), 4).subparts).toEqual(getDefaultSubpartsForType("CASE_STUDY", 4));
  });

  it("Reference to context → Unseen passage swaps the untouched template for the passage parts", () => {
    const next = switchTypeFields("REFERENCE_CONTEXT", "UNSEEN_PASSAGE", fresh("REFERENCE_CONTEXT", 5), 5);
    expect(next.subparts).toEqual(getDefaultSubpartsForType("UNSEEN_PASSAGE", 5));
  });

  it("an empty form → Assertion & Reason gets the statements, the template text and answer A", () => {
    expect(switchTypeFields("MCQ", "ASSERTION_REASON", fresh("MCQ"))).toEqual({
      text: ASSERTION_REASON_TEXT_TEMPLATE,
      subparts: [],
      options: DEFAULT_ASSERTION_OPTIONS_EN,
      answer: "A",
    });
  });

  it("a type that takes no parts clears them", () => {
    const parts = getDefaultSubpartsForType("CASE_STUDY", 4).map((sp) => ({ ...sp, text: "typed" }));
    expect(switchTypeFields("CASE_STUDY", "MCQ", { ...fresh("CASE_STUDY", 4), subparts: parts }, 4).subparts).toEqual([]);
  });

  it("a Match the column question gets its instruction when the text is empty", () => {
    expect(switchTypeFields("SHORT", "MATCH_COLUMN", fresh("SHORT")).text).toMatch(/^Match Column A with Column B/);
  });
});

describe("switchTypeFields: switching to a type and back leaves a clean form", () => {
  it("Short → Reference to context → Short", () => {
    const start = { ...fresh("SHORT"), text: "Explain the lines." };
    const there = switchTypeFields("SHORT", "REFERENCE_CONTEXT", start, 4);
    expect(switchTypeFields("REFERENCE_CONTEXT", "SHORT", there, 4)).toEqual(start);
  });

  it("MCQ → Assertion & Reason → MCQ", () => {
    const start = fresh("MCQ");
    const there = switchTypeFields("MCQ", "ASSERTION_REASON", start);
    expect(switchTypeFields("ASSERTION_REASON", "MCQ", there)).toEqual(start);
  });

  it("Assertion & Reason → Short → Assertion & Reason", () => {
    const start = switchTypeFields("MCQ", "ASSERTION_REASON", fresh("MCQ"));
    const there = switchTypeFields("ASSERTION_REASON", "SHORT", start);
    expect(there).toEqual(fresh("SHORT"));
    expect(switchTypeFields("SHORT", "ASSERTION_REASON", there)).toEqual(start);
  });

  it("Case study → Long → Case study", () => {
    const start = fresh("CASE_STUDY", 5);
    const there = switchTypeFields("CASE_STUDY", "LONG", start, 5);
    expect(there.subparts).toEqual([]);
    expect(switchTypeFields("LONG", "CASE_STUDY", there, 5)).toEqual(start);
  });
});
