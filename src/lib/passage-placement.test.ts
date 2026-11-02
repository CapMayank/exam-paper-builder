import { describe, expect, it } from "vitest";
import { whyCannotAdd, type BlueprintDef } from "./blueprint";

const bp = (readingRole: string): BlueprintDef => ({
  sections: [
    { id: "read", title: "Reading Comprehension", type: "MCQ", count: 5, marksEach: 1, role: readingRole },
    { id: "obj", title: "Choose the Correct Option", type: "MCQ", count: 5, marksEach: 1, role: "STANDARD" },
  ],
  chapters: [{ chapterId: "c1", marks: 10 }],
});
const cand = (sectionId: string, extra: object = {}) => ({ sectionId, chapterId: "c1", type: "MCQ", ...extra });

describe("passage-group placement", () => {
  it("regression: a passage MCQ cannot land in the general objective section", () => {
    const why = whyCannotAdd(bp("PASSAGE"), [], cand("obj", { passageGroupId: "p1" }));
    expect(why).toMatch(/passage group/);
  });

  it("a passage MCQ is accepted in the passage section", () => {
    expect(whyCannotAdd(bp("PASSAGE"), [], cand("read", { passageGroupId: "p1" }))).toBeNull();
  });

  it("a stand-alone MCQ is rejected from a passage section", () => {
    expect(whyCannotAdd(bp("PASSAGE"), [], cand("read"))).toMatch(/passage section/);
  });

  it("a passage parent type is accepted in a passage section of that type", () => {
    const def: BlueprintDef = {
      sections: [{ id: "p", title: "Unseen Passage", type: "UNSEEN_PASSAGE", count: 1, marksEach: 4, role: "PASSAGE" }],
      chapters: [{ chapterId: "c1", marks: 4 }],
    };
    expect(whyCannotAdd(def, [], { sectionId: "p", chapterId: "c1", type: "UNSEEN_PASSAGE", marks: 4 })).toBeNull();
  });

  it("backward compatible: sections without a role and questions without a group behave as before", () => {
    const def: BlueprintDef = {
      sections: [{ id: "s", title: "A", type: "MCQ", count: 2, marksEach: 1 }],
      chapters: [{ chapterId: "c1", marks: 2 }],
    };
    expect(whyCannotAdd(def, [], cand("s"))).toBeNull();
  });
});

import { autoFillPaper } from "./autofill";

describe("autofill honours passage roles", () => {
  const def: BlueprintDef = {
    sections: [
      { id: "obj", title: "Choose the Correct Option", type: "MCQ", count: 1, marksEach: 1, role: "STANDARD" },
      { id: "read", title: "Reading", type: "MCQ", count: 1, marksEach: 1, role: "PASSAGE" },
    ],
    chapters: [{ chapterId: "c1", marks: 2 }],
  };

  it("never puts a passage MCQ in the objective section, nor a stand-alone MCQ in the passage section", () => {
    const res = autoFillPaper(def, [], [
      { id: "standalone", chapterId: "c1", type: "MCQ" },
      { id: "child", chapterId: "c1", type: "MCQ", passageGroupId: "p1" },
    ]);
    const bySection = Object.fromEntries(res.added.map((a) => [a.sectionId, a.questionId]));
    expect(bySection.obj).toBe("standalone");
    expect(bySection.read).toBe("child");
  });

  it("leaves the passage section unfilled when only stand-alone MCQs exist", () => {
    const res = autoFillPaper(def, [], [{ id: "a", chapterId: "c1", type: "MCQ" }, { id: "b", chapterId: "c1", type: "MCQ" }]);
    expect(res.added.map((a) => a.sectionId)).toEqual(["obj"]);
    expect(res.unfilled.map((u) => u.sectionId)).toContain("read");
  });
});

describe("autofill with multi-pair match questions", () => {
  const def: BlueprintDef = {
    sections: [{ id: "m", title: "Match", type: "MATCH_COLUMN", count: 6, marksEach: 1 }],
    chapters: [{ chapterId: "c1", marks: 6 }],
  };
  it("uses one 6-pair question for the whole six-slot match section", () => {
    const res = autoFillPaper(def, [], [
      { id: "short", chapterId: "c1", type: "MATCH_COLUMN", matchPairs: 3 },
      { id: "full", chapterId: "c1", type: "MATCH_COLUMN", matchPairs: 6 },
      { id: "full2", chapterId: "c1", type: "MATCH_COLUMN", matchPairs: 6 },
    ]);
    expect(res.added.map((a) => a.questionId)).toEqual(["full"]);
    expect(res.complete).toBe(true);
  });
  it("reports the section unfilled when no question has enough pairs", () => {
    const res = autoFillPaper(def, [], [{ id: "short", chapterId: "c1", type: "MATCH_COLUMN", matchPairs: 3 }]);
    expect(res.added).toEqual([]);
    expect(res.unfilled[0]).toMatchObject({ sectionId: "m", count: 6 });
  });
});
