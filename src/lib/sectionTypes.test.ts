import { describe, expect, it } from "vitest";
import { autoFillPaper } from "./autofill";
import { whyCannotAdd, type BlueprintDef } from "./blueprint";
import { QUESTION_TYPE_LABEL } from "./constants";
import {
  allowedTypesFor,
  defaultAllowedTypes,
  groupedItemInstruction,
  isTypeAllowed,
  orTypeRefusal,
  questionInstruction,
  subjectFamily,
  toleratesType,
  typeLabel,
  typeLabels,
  typeRejection,
} from "./sectionTypes";

const sec = (type: string, marksEach: number, allowed?: string[]) => ({
  id: `s-${type}-${marksEach}`,
  title: `Section ${type}`,
  type,
  count: 2,
  marksEach,
  allowedTypesJson: allowed ? JSON.stringify(allowed) : "[]",
});

describe("allowed types of a blueprint slot", () => {
  it("a section with no stored list places only its own type", () => {
    expect(allowedTypesFor(sec("SHORT", 3))).toEqual(["SHORT"]);
    expect(isTypeAllowed(sec("SHORT", 3), "LONG")).toBe(false);
  });

  it("an already-placed question keeps the old tolerance, so no new warnings appear", () => {
    expect(toleratesType(sec("SHORT", 3), "LONG")).toBe(true);
    expect(toleratesType(sec("SHORT", 2), "LONG")).toBe(false);
    expect(toleratesType(sec("MCQ", 1), "TRUE_FALSE")).toBe(true);
    expect(toleratesType(sec("MCQ", 2), "TRUE_FALSE")).toBe(false);
    expect(toleratesType(sec("SHORT", 3, ["GRAMMAR"]), "GRAMMAR")).toBe(true);
  });

  it("uses the stored list, always with the default type first", () => {
    const s = sec("SHORT", 3, ["GRAMMAR", "UNSEEN_PASSAGE"]);
    expect(allowedTypesFor(s)).toEqual(["SHORT", "GRAMMAR", "UNSEEN_PASSAGE"]);
    expect(isTypeAllowed(s, "GRAMMAR")).toBe(true);
    expect(isTypeAllowed(s, "LONG")).toBe(false);
  });

  it("a stored list of only the default type locks the section", () => {
    expect(allowedTypesFor(sec("MCQ", 1, ["MCQ"]))).toEqual(["MCQ"]);
  });

  it("an allowed form must carry exactly the slot's marks", () => {
    const s = sec("SHORT", 3, ["GRAMMAR"]);
    expect(typeRejection(s, "GRAMMAR", 3)).toBeNull();
    expect(typeRejection(s, "GRAMMAR", 4)).toMatch(/3-mark/);
    expect(typeRejection(s, "MAP_WORK", 3)).toMatch(/only accepts/);
  });

  it("names types by their labels, never the raw value", () => {
    const s = sec("SHORT", 3, ["GRAMMAR"]);
    const L = QUESTION_TYPE_LABEL;
    expect(typeRejection(s, "MAP_WORK", 3)).toBe(`Section SHORT only accepts ${L.SHORT}; ${L.GRAMMAR} questions, not ${L.MAP_WORK}.`);
    expect(typeRejection(s, "GRAMMAR", 4)).toBe(`Section SHORT takes 3-mark questions; this ${L.GRAMMAR} question is worth 4.`);
  });

  it("a type without a label shows its stored value", () => {
    expect(typeLabel("MCQ")).toBe("Multiple choice");
    expect(typeLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
    expect(typeLabels(["MCQ", "FILL_BLANK", "SOMETHING_NEW"])).toBe("Multiple choice; Fill in the blank; SOMETHING_NEW");
  });

  it("an OR question of a type the section does not take is refused in plain words", () => {
    expect(orTypeRefusal(sec("SHORT", 3))).toBe("The OR question must be of type Short answer.");
    expect(orTypeRefusal(sec("MCQ", 1, ["FILL_BLANK"]))).toBe("The OR question must be one of: Multiple choice; Fill in the blank.");
  });
});

describe("school pattern defaults by subject", () => {
  it("recognises the subject family", () => {
    expect(subjectFamily("English")).toBe("LANGUAGE");
    expect(subjectFamily("हिंदी")).toBe("LANGUAGE");
    expect(subjectFamily("Social Science")).toBe("SST");
    expect(subjectFamily("Science")).toBe("SCIENCE");
    expect(subjectFamily("Mathematics")).toBe("MATHS");
  });

  it("gives English grammar, passage and writing at the right marks", () => {
    expect(defaultAllowedTypes("MCQ", 1, "English")).toContain("GRAMMAR");
    expect(defaultAllowedTypes("SHORT", 3, "English")).toEqual(["SHORT", "LONG", "GRAMMAR", "REFERENCE_CONTEXT", "UNSEEN_PASSAGE"]);
    expect(defaultAllowedTypes("LONG", 5, "English")).toEqual(["LONG", "SHORT", "WRITING_SKILL", "UNSEEN_PASSAGE", "GRAMMAR"]);
    // "One word" (VERY_SHORT) fits a one-mark slot in every subject
    expect(defaultAllowedTypes("MCQ", 1, "Science")).toEqual(["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "VERY_SHORT"]);
    expect(defaultAllowedTypes("LONG", 5, "Science")).not.toContain("GRAMMAR");
  });

  it("gives SST maps, Science diagrams and Maths case studies, not grammar", () => {
    expect(defaultAllowedTypes("SHORT", 3, "Social Science")).toContain("MAP_WORK");
    expect(defaultAllowedTypes("VERY_SHORT", 2, "Science")).toContain("DRAW");
    expect(defaultAllowedTypes("LONG", 5, "Mathematics")).toContain("CASE_STUDY");
    expect(defaultAllowedTypes("SHORT", 3, "Mathematics")).not.toContain("GRAMMAR");
  });
});

describe("printed instruction line", () => {
  const english = sec("SHORT", 3, ["GRAMMAR"]);
  it("prints only what the teacher typed, never an automatic line", () => {
    expect(questionInstruction({ type: "SHORT", allowedTypes: ["GRAMMAR"] } as never, "GRAMMAR", "")).toBe("");
    expect(questionInstruction({ type: "SHORT", allowedTypes: ["GRAMMAR"] } as never, "GRAMMAR", " Do it ")).toBe("Do it");
    expect(questionInstruction(english, "SHORT")).toBe("");
    expect(questionInstruction(english, "GRAMMAR")).toBe("");
    expect(questionInstruction(english, "GRAMMAR", null)).toBe("");
    expect(questionInstruction(english, "GRAMMAR", "   ")).toBe("");
    expect(questionInstruction(english, "GRAMMAR", "Change into passive voice.")).toBe("Change into passive voice.");
    expect(questionInstruction(sec("SHORT", 3), "LONG")).toBe("");
  });
});

describe("placing a mixed-form question", () => {
  const bp: BlueprintDef = {
    sections: [sec("SHORT", 3, ["GRAMMAR"])],
    chapters: [{ chapterId: "c1", marks: 6 }],
  };
  const id = bp.sections[0].id;

  it("accepts an allowed form at the slot's marks", () => {
    expect(whyCannotAdd(bp, [], { sectionId: id, chapterId: "c1", type: "GRAMMAR", marks: 3 })).toBeNull();
  });

  it("refuses a form the section does not list", () => {
    expect(whyCannotAdd(bp, [], { sectionId: id, chapterId: "c1", type: "LONG", marks: 3 })).toMatch(/only accepts/);
  });
});

describe("autofill with allowed forms", () => {
  const bp: BlueprintDef = {
    sections: [sec("SHORT", 3, ["GRAMMAR"])],
    chapters: [{ chapterId: "c1", marks: 6 }],
  };

  it("fills with the default form first", () => {
    const res = autoFillPaper(bp, [], [
      { id: "g1", chapterId: "c1", type: "GRAMMAR" },
      { id: "s1", chapterId: "c1", type: "SHORT" },
      { id: "s2", chapterId: "c1", type: "SHORT" },
    ]);
    expect(res.complete).toBe(true);
    expect(res.added.map((a) => a.questionId).sort()).toEqual(["s1", "s2"]);
  });

  it("falls back to another allowed form when the bank runs short", () => {
    const res = autoFillPaper(bp, [], [
      { id: "s1", chapterId: "c1", type: "SHORT" },
      { id: "g1", chapterId: "c1", type: "GRAMMAR" },
      { id: "l1", chapterId: "c1", type: "LONG" },
    ]);
    expect(res.complete).toBe(true);
    expect(res.added.map((a) => a.questionId).sort()).toEqual(["g1", "s1"]);
  });
});

describe("groupedItemInstruction", () => {
  const sec = { type: "TRUE_FALSE" } as never;
  it("prints the line the teacher typed for an item of a grouped exercise", () => {
    expect(groupedItemInstruction(sec, "MCQ", "  Choose the correct option. ", "Write True or False.")).toBe("Choose the correct option.");
  });
  it("prints nothing when none was typed", () => {
    expect(groupedItemInstruction(sec, "TRUE_FALSE", "", "Write True or False.")).toBe("");
    expect(groupedItemInstruction(sec, "TRUE_FALSE", null, "Write True or False.")).toBe("");
  });
  it("skips a line that repeats the exercise's own instruction", () => {
    expect(groupedItemInstruction(sec, "TRUE_FALSE", " Write True or False.", "Write True or False. ")).toBe("");
  });
});
