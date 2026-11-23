import { describe, expect, test } from "vitest";
import {
  LEGACY_STARTER_TEMPLATES,
  MPBSE_BLUEPRINT_TEMPLATES,
  STANDARD_BLUEPRINT_TEMPLATES,
  UNGROUPED_LEGACY_STARTER_TEMPLATES,
  UNGROUPED_MPBSE_BLUEPRINT_TEMPLATES,
  type BlueprintTemplate,
} from "./curriculumTemplates";
import { boardSectionHeading, regroupObjectiveSections, stripQuestionPrefix } from "./boardSections";
import { SCHOOL_PATTERNS, UNGROUPED_SCHOOL_PATTERNS } from "./schoolPatterns";

const byId = (id: string) => STANDARD_BLUEPRINT_TEMPLATES.find((t) => t.id === id)!;
const totals = (t: BlueprintTemplate) => {
  const rows = t.sections.flatMap((s) => s.questionTypes);
  return { count: rows.reduce((n, r) => n + r.count, 0), marks: rows.reduce((n, r) => n + r.count * r.marksEach, 0), rows: rows.length };
};

describe("board-style template sections", () => {
  test("the Sanskrit 8-khand template regroups into one objective khand", () => {
    const t = byId("mpbse-sanskrit-10th-legacy-75m");
    expect(t.sections[0].title).toBe("खण्डः 'क' — वस्तुनिष्ठप्रश्नाः");
    expect(t.sections[0].instructions).toBe("");
    expect(t.sections[0].questionTypes.map((q) => q.type)).toEqual(["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "VERY_SHORT"]);
    expect(t.sections[0].questionTypes[1].questionTitle).toBe("कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत (प्रश्नक्रमाङ्कः 2):");
    expect(t.sections[1].title).toBe("खण्डः 'ख' — लघूत्तरीयप्रश्नाः");
    expect(t.sections).toHaveLength(4);
  });

  test("the Class 10 Science template regroups", () => {
    const t = byId("mpbse-10th-science-200-75m");
    expect(t.sections[0].title).toBe("Section A — Objective Questions");
    expect(t.sections[0].questionTypes).toHaveLength(5);
    expect(t.sections[1].title).toBe("Section B — Very Short Answer Questions");
  });

  test("a Hindi template uses Hindi section letters", () => {
    const t = byId("mpbse-10th-hindi-401-75m");
    expect(t.sections[0].title).toBe("खण्ड 'अ' — वस्तुनिष्ठ प्रश्न");
    expect(t.sections[1].title.startsWith("खण्ड 'ब' — ")).toBe(true);
  });

  test("every template keeps its rows, question count and marks", () => {
    const raw = [...UNGROUPED_MPBSE_BLUEPRINT_TEMPLATES, ...UNGROUPED_LEGACY_STARTER_TEMPLATES];
    const done = [...MPBSE_BLUEPRINT_TEMPLATES, ...LEGACY_STARTER_TEMPLATES];
    expect(done).toHaveLength(raw.length);
    raw.forEach((t, i) => expect(totals(done[i])).toEqual(totals(t)));
  });

  test("English templates keep their skill-based sections", () => {
    const raw = UNGROUPED_MPBSE_BLUEPRINT_TEMPLATES.find((t) => t.id === "mpbse-10th-english-411-75m")!;
    expect(byId("mpbse-10th-english-411-75m").sections.map((s) => s.title)).toEqual(raw.sections.map((s) => s.title));
  });

  test("a pattern with no run of single-form objective sections is left alone", () => {
    const groups = [
      { title: "Section A", instructions: "x", questionTypes: [{ type: "SHORT" as const, count: 3, marksEach: 2 }] },
      { title: "Section B", instructions: "y", questionTypes: [{ type: "LONG" as const, count: 2, marksEach: 5 }] },
    ];
    expect(regroupObjectiveSections(groups, "en")).toBe(groups);
  });

  test.each([
    ["Questions 6 to 17: Very Short Answer Questions", "Very Short Answer Questions"],
    ["Question 1: Multiple Choice Questions", "Multiple Choice Questions"],
    ["प्रश्न 6 से 17: अतिलघुउत्तरीय प्रश्न (Very Short Answer Questions)", "अतिलघुउत्तरीय प्रश्न (Very Short Answer Questions)"],
    ["प्रश्नः 6 तः 17 पर्यन्तम् : अतिलघूत्तरीयप्रश्नाः", "अतिलघूत्तरीयप्रश्नाः"],
    ["प्रश्नः १ : उचितं विकल्पं चित्वा लिखत (बहुविकल्पीयप्रश्नाः)", "उचितं विकल्पं चित्वा लिखत (बहुविकल्पीयप्रश्नाः)"],
    ["खण्डः 'छ' : पाठाधारित-अवबोधनम्", "पाठाधारित-अवबोधनम्"],
    ["Reading Comprehension", "Reading Comprehension"],
  ])("strips the number prefix of %s", (a, b) => expect(stripQuestionPrefix(a)).toBe(b));

  test("section headings per language", () => {
    expect(boardSectionHeading(0, "en", "Objective Questions")).toBe("Section A — Objective Questions");
    expect(boardSectionHeading(2, "hi", "x")).toBe("खण्ड 'स' — x");
    expect(boardSectionHeading(3, "sa", "x")).toBe("खण्डः 'घ' — x");
  });
});

describe("board-style school presets (Classes 1–8)", () => {
  const byCode = (code: string) => SCHOOL_PATTERNS.find((p) => p.template.templateCode === code)!.template;
  const rawByCode = (code: string) => UNGROUPED_SCHOOL_PATTERNS.find((p) => p.template.templateCode === code)!.template;

  test("the primary pattern puts MCQ, blanks, true/false and match in one objective section", () => {
    const t = SCHOOL_PATTERNS[0].template;
    expect(t.sections[0].title).toBe("Section A — Objective Questions");
    expect(t.sections[0].questionTypes.map((q) => q.type)).toEqual(["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN"]);
    expect(t.sections[0].questionTypes[2].questionTitle).toBe("Write True or False.");
    expect(t.sections[1].title).toBe("Section B — Very Short Answer Questions");
  });

  test("the Hindi and Sanskrit patterns use their own section letters", () => {
    const hi = byCode("school-5-8-60m-hindi");
    expect(hi.sections[0].title).toBe("खण्ड 'अ' — वस्तुनिष्ठ प्रश्न");
    expect(hi.sections[0].questionTypes.map((q) => q.type)).toEqual(["MCQ", "FILL_BLANK"]);
    expect(hi.sections[1].title).toBe("खण्ड 'ब' — अति लघु उत्तरीय प्रश्न");
    const sa = byCode("school-6-8-60m-sanskrit");
    expect(sa.sections[0].title).toBe("खण्डः 'क' — वस्तुनिष्ठप्रश्नाः");
  });

  test("the English school pattern, sectioned by form, is regrouped too", () => {
    expect(byCode("school-5-8-60m-english").sections[0].title).toBe("Section A — Objective Questions");
  });

  test("every school pattern keeps its rows, question count and marks", () => {
    expect(SCHOOL_PATTERNS).toHaveLength(UNGROUPED_SCHOOL_PATTERNS.length);
    UNGROUPED_SCHOOL_PATTERNS.forEach((p, i) => expect(totals(SCHOOL_PATTERNS[i].template)).toEqual(totals(p.template)));
    expect(rawByCode("school-5-8-60m-hindi").sections).toHaveLength(5);
  });

  test("an old 'Section E –' letter is dropped from a re-lettered heading", () => {
    expect(stripQuestionPrefix("Section E – Very Short Answer Questions")).toBe("Very Short Answer Questions");
    expect(stripQuestionPrefix("SECTION-B: Grammar")).toBe("Grammar");
  });
});
