import { describe, expect, test } from "vitest";
import { parseBlueprintImport } from "./blueprintImport";
import { exportBlueprintToJsonObject } from "./blueprintExport";
import { flattenSectionGroups, groupSectionsFromFlat } from "./blueprint";

const json = JSON.stringify({
  name: "Science Annual",
  examType: "ANNUAL",
  durationMin: 180,
  sections: [
    {
      title: "Section A — Objective",
      instructions: "",
      questionTypes: [
        { type: "MCQ", count: 6, marksEach: 1, questionTitle: "Choose the correct option." },
        { type: "FILL_BLANK", count: 5, marksEach: 1 },
      ],
    },
  ],
  chapters: [{ chapterNumber: 1, chapterTitle: "One", marks: 11 }],
});

describe("row question title", () => {
  test("import reads questionTitle per question type", () => {
    const r = parseBlueprintImport(json, "json");
    expect(r.blueprint.sections.map((s) => s.questionTitle ?? "")).toEqual(["Choose the correct option.", ""]);
    expect(r.blueprint.sections.every((s) => s.title === "Section A — Objective")).toBe(true);
  });

  test("export writes questionTitle and a re-import keeps it", () => {
    const imported = parseBlueprintImport(json, "json").blueprint;
    const exported = exportBlueprintToJsonObject({ ...imported, chapters: [] });
    expect(exported.sections[0].questionTypes.map((q) => q.questionTitle ?? "")).toEqual(["Choose the correct option.", ""]);
    const again = parseBlueprintImport(JSON.stringify({ ...exported, chapters: imported.chapters }), "json").blueprint;
    expect(again.sections.map((s) => s.questionTitle ?? "")).toEqual(["Choose the correct option.", ""]);
  });

  test("editor grouping keeps each row's questionTitle", () => {
    const rows = [
      { id: "a", title: "Section A", type: "MCQ", count: 6, marksEach: 1, questionTitle: "Choose the correct option." },
      { id: "b", title: "Section A", type: "TRUE_FALSE", count: 5, marksEach: 1, questionTitle: "" },
    ];
    const groups = groupSectionsFromFlat(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].questionTypes.map((q) => q.questionTitle)).toEqual(["Choose the correct option.", ""]);
    expect(flattenSectionGroups(groups).map((s) => s.questionTitle)).toEqual(["Choose the correct option.", ""]);
  });
});
