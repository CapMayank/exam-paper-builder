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

import { allocateComponents } from "./languageComponents";
import { MPBSE_BLUEPRINT_TEMPLATES as TEMPLATES } from "./curriculumTemplates";

describe("allocateComponents", () => {
  for (const [lvl, subj] of [[9, "Hindi"], [10, "Hindi"], [11, "Hindi"], [12, "Hindi"], [9, "Sanskrit"], [10, "Sanskrit"], [11, "Sanskrit"], [12, "Sanskrit"]] as const) {
    it(`gives every ${lvl} ${subj} component exactly its official marks`, () => {
      const t = TEMPLATES.find((x) => x.classLevel === lvl && x.subjectName === subj)!;
      const units: Array<{ id: string; marks: number; type: string }> = [];
      let n = 0;
      for (const g of t.sections) for (const q of g.questionTypes) {
        const multi = q.type === "MATCH_COLUMN" && q.count > 1 && q.marksEach === 1;
        if (multi) units.push({ id: `u${n++}`, marks: q.count, type: q.type });
        else for (let i = 0; i < q.count; i++) units.push({ id: `u${n++}`, marks: q.marksEach, type: q.type });
      }
      const out = allocateComponents(units, t.components!);
      const sums = new Map<string, number>();
      for (const u of units) if (out[u.id]) sums.set(out[u.id], (sums.get(out[u.id]) ?? 0) + u.marks);
      for (const c of t.components!) expect(sums.get(c.key) ?? 0, `${c.title}`).toBe(c.marks);
      expect(units.every((u) => out[u.id])).toBe(true);
    });
  }
});
