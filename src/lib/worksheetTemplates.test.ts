import { describe, expect, it } from "vitest";
import { BUILT_IN_TEMPLATES, cleanTemplate, rankTemplates, type WorksheetTemplate } from "./worksheetTemplates";

const t = (id: string, className: string, subject: string): WorksheetTemplate => ({ id, name: id, className, subject, builtIn: false, activities: [{ type: "KDG_COLOUR", marks: 2 }] });

describe("built-in worksheet templates", () => {
  it("offers at least one for every class and subject", () => {
    for (const c of ["Nursery", "LKG", "UKG"]) {
      for (const s of ["English", "Mathematics", "Hindi", "General Awareness (EVS)", "Rhymes & Activities"]) {
        expect(BUILT_IN_TEMPLATES.some((x) => x.className === c && x.subject === s), `${c} ${s}`).toBe(true);
      }
    }
  });

  it("uses only known activity types and keeps sets small enough to print big", () => {
    for (const x of BUILT_IN_TEMPLATES) {
      expect(x.activities.length).toBeGreaterThanOrEqual(3);
      expect(x.activities.length).toBeLessThanOrEqual(6);
      for (const a of x.activities) expect(a.type).toMatch(/^KDG_/);
    }
  });
});

describe("rankTemplates", () => {
  it("puts this class and subject first, then the same subject, then the rest", () => {
    const list = [t("other", "UKG", "Mathematics"), t("same-subject", "LKG", "English"), t("exact", "Nursery", "English")];
    const r = rankTemplates(list, "Nursery", "English");
    expect(r.matching.map((x) => x.id)).toEqual(["exact"]);
    expect(r.others.map((x) => x.id)).toEqual(["same-subject", "other"]);
  });
});

describe("cleanTemplate", () => {
  it("keeps a valid template", () => {
    const c = cleanTemplate({ name: "  My set ", className: "LKG", subject: "Hindi", activities: [{ type: "KDG_TRACE_WRITE", text: "Write", options: ["{}"], marks: 3 }] });
    expect(c.name).toBe("My set");
    expect(c.activities).toEqual([{ type: "KDG_TRACE_WRITE", text: "Write", options: ["{}"], marks: 3 }]);
  });

  it("rejects an empty name, no activities or an unknown type", () => {
    expect(() => cleanTemplate({ name: " ", className: "LKG", subject: "Hindi", activities: [{ type: "KDG_COLOUR", marks: 2 }] })).toThrow();
    expect(() => cleanTemplate({ name: "x", className: "LKG", subject: "Hindi", activities: [] })).toThrow();
    expect(() => cleanTemplate({ name: "x", className: "LKG", subject: "Hindi", activities: [{ type: "MCQ", marks: 2 }] })).toThrow();
  });

  it("keeps marks between 1 and 20", () => {
    const c = cleanTemplate({ name: "x", className: "LKG", subject: "Hindi", activities: [{ type: "KDG_COLOUR", marks: 99 }] });
    expect(c.activities[0].marks).toBe(20);
  });
});
