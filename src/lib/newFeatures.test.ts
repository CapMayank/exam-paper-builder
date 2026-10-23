import { describe, expect, it } from "vitest";
import { imposeTwoUpCut } from "./layout";
import { STANDARD_BLUEPRINT_TEMPLATES } from "./curriculumTemplates";

describe("imposeTwoUpCut (2-Up Cut-in-Half Mode)", () => {
  it("imposes a single-page paper into two side-by-side copies on 1 sheet", () => {
    const sheets = imposeTwoUpCut(1);
    expect(sheets).toHaveLength(1);
    expect(sheets[0]).toEqual({
      front: [0, 0],
      back: [null, null],
    });
  });

  it("imposes a two-page paper into front and back duplex cuts on 1 physical sheet", () => {
    const sheets = imposeTwoUpCut(2);
    expect(sheets).toHaveLength(1);
    // Sheet 1 front: both left and right contain page 1 (index 0)
    // Sheet 1 back: both left and right contain page 2 (index 1)
    expect(sheets[0]).toEqual({
      front: [0, 0],
      back: [1, 1],
    });
  });

  it("throws an error if realPages is greater than 2", () => {
    expect(() => imposeTwoUpCut(3)).toThrowError(/2-Up Cut-in-Half mode is only supported for papers with 1 or 2 pages/);
    expect(() => imposeTwoUpCut(4)).toThrowError(/2-Up Cut-in-Half mode is only supported for papers with 1 or 2 pages/);
  });
});

describe("STANDARD_BLUEPRINT_TEMPLATES", () => {
  it("provides templates for all key institutional examination patterns", () => {
    expect(STANDARD_BLUEPRINT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    const ids = STANDARD_BLUEPRINT_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("cbse-80m-5sec");
    expect(ids).toContain("cbse-science-70m");
    expect(ids).toContain("middle-school-50m");
    expect(ids).toContain("unit-test-25m");
    expect(ids).toContain("kindergarten-foundational-25m");
  });

  it("ensures every template section sum matches its stated totalMarks", () => {
    for (const tmpl of STANDARD_BLUEPRINT_TEMPLATES) {
      let calculatedTotal = 0;
      for (const sec of tmpl.sections) {
        for (const qt of sec.questionTypes) {
          calculatedTotal += qt.count * qt.marksEach;
        }
      }
      expect(calculatedTotal).toBe(tmpl.totalMarks);
    }
  });

  it("ensures each template has non-empty instructions and valid question types", () => {
    for (const tmpl of STANDARD_BLUEPRINT_TEMPLATES) {
      expect(tmpl.title.length).toBeGreaterThan(0);
      expect(tmpl.durationMin).toBeGreaterThan(0);
      expect(tmpl.sections.length).toBeGreaterThan(0);
      for (const sec of tmpl.sections) {
        expect(sec.title.length).toBeGreaterThan(0);
        expect(sec.questionTypes.length).toBeGreaterThan(0);
        for (const qt of sec.questionTypes) {
          expect(qt.count).toBeGreaterThan(0);
          expect(qt.marksEach).toBeGreaterThan(0);
        }
      }
    }
  });
});
