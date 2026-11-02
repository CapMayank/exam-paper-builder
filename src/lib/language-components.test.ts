import { describe, expect, it } from "vitest";
import { componentCoverage, componentImplications, parseComponents } from "./languageComponents";
import { MPBSE_BLUEPRINT_TEMPLATES } from "./curriculumTemplates";

const comps = [
  { key: "unseen", title: "अपठित बोध", marks: 4, role: "PASSAGE" as const },
  { key: "letter", title: "पत्र लेखन", marks: 4, role: "WRITING" as const },
];

describe("component coverage", () => {
  it("sums marks per component and reports untagged work", () => {
    const cov = componentCoverage(comps, [
      { componentKey: "unseen", marks: 4 },
      { componentKey: "", marks: 2 },
    ]);
    expect(cov.rows.find((r) => r.key === "unseen")!.used).toBe(4);
    expect(cov.untaggedMarks).toBe(2);
  });

  it("errors when a component exceeds its allocation", () => {
    const imp = componentImplications(comps, [{ componentKey: "letter", marks: 4 }, { componentKey: "letter", marks: 2 }]);
    expect(imp.map((i) => i.code)).toContain("COMPONENT_EXCESS");
  });

  it("warns on a deficit only once every question is tagged", () => {
    expect(componentImplications(comps, [{ componentKey: "unseen", marks: 4 }]).map((i) => i.code)).toEqual(["COMPONENT_DEFICIT"]);
    expect(componentImplications(comps, [{ componentKey: "unseen", marks: 4 }, { marks: 1 }]).map((i) => i.code)).toEqual(["COMPONENT_UNTAGGED"]);
  });

  it("rejects an unknown component key", () => {
    const imp = componentImplications(comps, [{ componentKey: "bogus", marks: 1 }]);
    expect(imp.some((i) => i.severity === "error")).toBe(true);
  });

  it("is a no-op for blueprints without components", () => {
    expect(componentImplications([], [{ componentKey: "x", marks: 1 }])).toEqual([]);
    expect(parseComponents("not json")).toEqual([]);
  });

  it("every template with an official scheme round-trips through the stored JSON", () => {
    for (const t of MPBSE_BLUEPRINT_TEMPLATES.filter((x) => x.components)) {
      const back = parseComponents(JSON.stringify(t.components));
      expect(back.reduce((a, c) => a + c.marks, 0)).toBe(t.totalMarks);
    }
  });
});
