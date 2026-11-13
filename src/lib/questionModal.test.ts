import { describe, expect, it } from "vitest";
import { QUESTION_TYPE_LABEL } from "./constants";
import {
  canPasteSeveral,
  chapterChoice,
  chapterOptionIds,
  detailsSummary,
  difficultyLabel,
  modalTitle,
  openingTab,
  paperFieldsPatch,
  showTypeChips,
  skillLabel,
} from "./questionModal";

const SHORT = QUESTION_TYPE_LABEL.SHORT;

describe("openingTab", () => {
  it("opens every mode on Write", () => {
    expect(openingTab("add")).toBe("write");
    expect(openingTab("edit")).toBe("write");
    expect(openingTab("replace")).toBe("write");
    expect(openingTab("or")).toBe("write");
  });
});

describe("showTypeChips", () => {
  it("shows chips only for several allowed types outside edit", () => {
    expect(showTypeChips(["SHORT"], "add")).toBe(false);
    expect(showTypeChips(["SHORT", "LONG"], "add")).toBe(true);
    expect(showTypeChips(["SHORT", "LONG"], "edit")).toBe(false);
  });
});

describe("modalTitle", () => {
  const base = { sectionTitle: "Section B", type: "SHORT", marks: 3, chips: false };
  it("titles add", () => {
    expect(modalTitle({ ...base, mode: "add" })).toBe(`Add to Section B — ${SHORT} · 3 marks`);
    expect(modalTitle({ ...base, mode: "add", marks: 1, chips: true })).toBe("Add to Section B · 1 mark");
  });
  it("titles replace", () => {
    expect(modalTitle({ ...base, mode: "replace" })).toBe(`Replace question in Section B · 3 marks — ${SHORT}`);
    expect(modalTitle({ ...base, mode: "replace", chips: true })).toBe("Replace question in Section B · 3 marks");
  });
  it("titles or", () => {
    expect(modalTitle({ ...base, mode: "or" })).toBe("Add OR question in Section B · 3 marks");
  });
  it("titles edit, with the OR target", () => {
    expect(modalTitle({ ...base, mode: "edit", type: "MCQ", marks: 1 })).toBe(`Edit question — ${QUESTION_TYPE_LABEL.MCQ}`);
    expect(modalTitle({ ...base, mode: "edit", type: "MCQ", marks: 1, target: "or" })).toMatch(/^Edit OR question — /);
  });
  it("falls back to the raw type when unknown", () => {
    expect(modalTitle({ ...base, mode: "add", type: "WEIRD" })).toBe("Add to Section B — WEIRD · 3 marks");
  });
});

describe("difficultyLabel", () => {
  it("maps known values and falls back to what is stored", () => {
    expect(difficultyLabel("MEDIUM")).toBe("Average");
    expect(difficultyLabel("hard")).toBe("Difficult");
    expect(difficultyLabel("TRICKY")).toBe("TRICKY");
    expect(difficultyLabel(null)).toBe("Average");
    expect(difficultyLabel("")).toBe("Average");
    expect(difficultyLabel(undefined)).toBe("Average");
  });
});

describe("skillLabel", () => {
  it("labels the four skills, folding EVALUATING into HOTS", () => {
    expect(skillLabel("EVALUATING")).toBe("HOTS");
    expect(skillLabel("REMEMBERING")).toBe("Knowledge");
    expect(skillLabel("NONSENSE")).toBe("");
    expect(skillLabel(null)).toBe("");
  });
});

describe("detailsSummary", () => {
  it("joins difficulty and skill, or shows difficulty alone", () => {
    expect(detailsSummary("EASY", "REMEMBERING")).toBe("Easy · Knowledge");
    expect(detailsSummary("MEDIUM", "UNDERSTANDING")).toBe("Average · Understanding");
    expect(detailsSummary("EASY", null)).toBe("Easy");
  });
});

describe("chapterOptionIds", () => {
  it("adds the current chapter, honours the lock, and leaves the bank open", () => {
    expect(chapterOptionIds(["a", "b"], "z")).toEqual(["a", "b", "z"]);
    expect(chapterOptionIds(["a", "b"], "a")).toEqual(["a", "b"]);
    expect(chapterOptionIds(["a", "b"])).toEqual(["a", "b"]);
    expect(chapterOptionIds(["a", "b"], "a", "b")).toEqual(["b"]);
    expect(chapterOptionIds(undefined, "z")).toBeUndefined();
  });
});

describe("chapterChoice", () => {
  const chapters = [
    { id: "c1", number: 1, title: "Light" },
    { id: "c2", number: 2, title: "Electricity" },
  ];
  it("keeps the chosen chapter when editing (not new)", () => {
    expect(
      chapterChoice({ isNew: false, touched: false, chosenId: "c1", text: "Explain electricity", chapters, openMarks: { c1: 5, c2: 5 } }),
    ).toEqual({ chapterId: "c1", suggested: false });
  });
  it("keeps the chosen chapter once the teacher touched it", () => {
    expect(
      chapterChoice({ isNew: true, touched: true, chosenId: "c1", text: "Explain electricity", chapters, openMarks: { c1: 5, c2: 5 } }),
    ).toEqual({ chapterId: "c1", suggested: false });
  });
  it("assigns a new untouched question on a paper", () => {
    expect(
      chapterChoice({ isNew: true, touched: false, chosenId: "c1", text: "Explain electricity", chapters, openMarks: { c1: 5, c2: 5 } }),
    ).toEqual({ chapterId: "c2", suggested: true });
  });
  it("suggests nothing for unmatched text in the bank", () => {
    expect(chapterChoice({ isNew: true, touched: false, chosenId: "c1", text: "xyz", chapters })).toEqual({ chapterId: "c1", suggested: false });
  });
  it("suggests a matching chapter in the bank", () => {
    expect(chapterChoice({ isNew: true, touched: false, chosenId: "c1", text: "Explain electricity", chapters })).toEqual({
      chapterId: "c2",
      suggested: true,
    });
  });
  it("returns an empty id when there are no chapters", () => {
    expect(chapterChoice({ isNew: true, touched: false, chosenId: "c1", text: "x", chapters: [], openMarks: {} })).toEqual({
      chapterId: "",
      suggested: false,
    });
  });
});

describe("canPasteSeveral", () => {
  it("needs add mode, a free slot and a pasteable type", () => {
    expect(canPasteSeveral({ mode: "add", type: "SHORT", slotsLeft: 2 })).toBe(true);
    expect(canPasteSeveral({ mode: "add", type: "SHORT", slotsLeft: 0 })).toBe(false);
    expect(canPasteSeveral({ mode: "add", type: "MATCH_COLUMN", slotsLeft: 2 })).toBe(false);
    expect(canPasteSeveral({ mode: "replace", type: "SHORT", slotsLeft: 2 })).toBe(false);
  });
});

describe("paperFieldsPatch", () => {
  it("is null when nothing changed", () => {
    expect(paperFieldsPatch({ instruction: "Answer briefly", componentKey: "read" }, { instruction: "Answer briefly", componentKey: "read" })).toBeNull();
  });

  it("sends only the instruction when only it changed, trimmed", () => {
    expect(paperFieldsPatch({ instruction: "Old", componentKey: "read" }, { instruction: "  New line  ", componentKey: "read" })).toEqual({
      instruction: "New line",
    });
  });

  it("sends only the component when only it changed", () => {
    expect(paperFieldsPatch({ instruction: "", componentKey: "read" }, { instruction: "", componentKey: "write" })).toEqual({
      componentKey: "write",
    });
  });

  it("sends both when both changed", () => {
    expect(paperFieldsPatch({ instruction: "A", componentKey: "" }, { instruction: "B", componentKey: "write" })).toEqual({
      instruction: "B",
      componentKey: "write",
    });
  });

  it("treats a whitespace-only instruction as empty", () => {
    expect(paperFieldsPatch({ instruction: "", componentKey: "" }, { instruction: "   ", componentKey: "" })).toBeNull();
    expect(paperFieldsPatch({ instruction: "Old", componentKey: "" }, { instruction: "   ", componentKey: "" })).toEqual({ instruction: "" });
  });

  it("treats null and a missing value as empty", () => {
    expect(paperFieldsPatch({ instruction: null, componentKey: null }, { instruction: "", componentKey: "" })).toBeNull();
    expect(paperFieldsPatch({}, { instruction: "", componentKey: "" })).toBeNull();
    expect(paperFieldsPatch({ instruction: null, componentKey: undefined }, { instruction: "Say why", componentKey: "read" })).toEqual({
      instruction: "Say why",
      componentKey: "read",
    });
  });

  it("can clear a stored component", () => {
    expect(paperFieldsPatch({ componentKey: "read" }, { instruction: "", componentKey: "" })).toEqual({ componentKey: "" });
  });
});
