import { describe, expect, it } from "vitest";
import { MPBSE_BLUEPRINT_TEMPLATES, type BlueprintTemplate } from "./curriculumTemplates";
import { auditTemplateStructure, isLanguageTemplate } from "./blueprintStructure";

const codes = (t: BlueprintTemplate) => auditTemplateStructure(t).map((f) => f.code);

describe("blueprint structure audit", () => {
  it("every built-in template's section marks sum to its declared total", () => {
    for (const t of MPBSE_BLUEPRINT_TEMPLATES) expect(codes(t)).not.toContain("MARKS_MISMATCH");
  });

  it("English class 9/10 reading is two passage groups; 11/12 stays flagged until the passage count is verified", () => {
    const en = MPBSE_BLUEPRINT_TEMPLATES.filter((t) => t.subjectName === "English");
    expect(en.length).toBe(4);
    for (const t of en) {
      if (t.classLevel! <= 10) {
        expect(codes(t)).not.toContain("PASSAGE_SECTION_IS_FLAT_OBJECTIVE");
        const reading = t.sections[0].questionTypes[0];
        expect([reading.type, reading.count, reading.marksEach, reading.role]).toEqual(["UNSEEN_PASSAGE", 2, 5, "PASSAGE"]);
      } else {
        expect(codes(t)).toContain("PASSAGE_SECTION_IS_FLAT_OBJECTIVE");
      }
    }
  });

  it("language templates with an official scheme carry components that add up to the paper total", () => {
    const langs = MPBSE_BLUEPRINT_TEMPLATES.filter((t) => isLanguageTemplate(t));
    const withScheme = langs.filter((t) => t.components);
    const keys = withScheme.map((t) => `${t.classLevel}-${t.subjectName}`);
    for (const k of ["9-Hindi", "10-Hindi", "11-Hindi", "12-Hindi", "9-Sanskrit", "10-Sanskrit", "11-Sanskrit", "12-Sanskrit", "9-English", "10-English", "11-English", "12-English"]) {
      expect(keys).toContain(k);
    }
    for (const t of withScheme) expect(codes(t)).not.toContain("COMPONENT_MARKS_MISMATCH");
  });

  it("templates are UNVERIFIED unless an official source was read", () => {
    for (const t of MPBSE_BLUEPRINT_TEMPLATES) {
      expect(codes(t).includes("MISSING_SOURCE_REFERENCE")).toBe(!t.source);
    }
    const urdu10 = MPBSE_BLUEPRINT_TEMPLATES.find((t) => t.subjectName === "Urdu")!;
    expect(urdu10.source).toBeUndefined();
  });

  it("accepts a language template with a passage parent group, grammar and writing", () => {
    const t: BlueprintTemplate & { sourceUrl: string } = {
      id: "x", templateCode: "x", title: "x", description: "", examType: "ANNUAL", durationMin: 180,
      totalMarks: 10, targetClasses: "Class 10", classLevel: 10, subjectName: "Hindi", archetype: "X",
      sourceUrl: "https://example.test/blueprint.pdf",
      sections: [
        { title: "अपठित गद्यांश", instructions: "", questionTypes: [{ type: "UNSEEN_PASSAGE", count: 1, marksEach: 4 }] },
        { title: "व्याकरण", instructions: "", questionTypes: [{ type: "GRAMMAR", count: 2, marksEach: 1 }] },
        { title: "रचनात्मक लेखन", instructions: "", questionTypes: [{ type: "WRITING_SKILL", count: 1, marksEach: 4 }] },
      ],
    };
    expect(auditTemplateStructure(t)).toEqual([]);
  });
});
