import type { BlueprintTemplate, BlueprintTemplateSectionGroup, ChoicePolicy } from "./curriculumTemplates";
import { FORMATS, MUSIC_FORMATS, formatIdFor, type FormatDef } from "./officialFormats";
import type { MarkingComponent, OfficialSource } from "./officialMarkingSchemes";
import { SCHEME_GROUPS_2026_27, type SchemeGroup } from "./officialSchemeData";

type Heading = { title: string; instructions: string };
export type TemplateHelpers = {
  getArchetypeHeading: (position: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, range: string, lang: "sa" | "hi" | "en") => Heading;
  createChoicePolicy: (
    policyType: ChoicePolicy["policyType"],
    provided: number,
    required: number,
    scope: ChoicePolicy["poolScope"],
    rationale: string,
  ) => ChoicePolicy;
};

const LANGUAGE_SUBJECTS = new Set(["Hindi", "Marathi", "Punjabi", "Gujarati", "Sindhi", "Urdu", "Sanskrit", "English"]);
// Urdu keeps the English structural headings, as the existing Class 10 Urdu template does.
const HI_HEADING_SUBJECTS = new Set(["Hindi", "Marathi", "Punjabi", "Gujarati", "Sindhi"]);

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function templateCodeFor(g: Pick<SchemeGroup, "classLevel" | "subject" | "totalMarks">): string {
  return `mpbse-${g.classLevel}th-${slugify(g.subject)}-${g.totalMarks}m`;
}

function roleFor(title: string): MarkingComponent["role"] {
  if (/अपठित|unseen|ग़ैर|गैर/i.test(title)) return "PASSAGE";
  if (/पत्र|निबंध|निबन्ध|लेखन|essay|letter|मज़मून|ख़त|खत|दरख/i.test(title)) return "WRITING";
  if (/व्याकरण|grammar|क़वाइद|कवाइद|भाषा बोध|काव्य बोध|व्याकरण/i.test(title)) return "GRAMMAR";
  return "LITERATURE";
}

export function sectionsFor(f: FormatDef, lang: "sa" | "hi" | "en", h: TemplateHelpers): BlueprintTemplateSectionGroup[] {
  const noChoice = (n: number) => h.createChoicePolicy("NO_CHOICE", n, n, "ANY_INCLUDED_CHAPTER", "Compulsory");
  const types = ["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "VERY_SHORT"] as const;
  const out: BlueprintTemplateSectionGroup[] = [];
  f.objective.forEach((count, i) => {
    const head = h.getArchetypeHeading((i + 1) as 1 | 2 | 3 | 4 | 5, String(i + 1), lang);
    out.push({
      title: head.title,
      instructions: head.instructions,
      questionTypes: [{ type: types[i], count, marksEach: 1, orChoiceMode: "NOT_REQUIRED", choicePolicy: noChoice(count) }],
    });
  });
  let q = 6;
  for (const w of f.written) {
    const from = q;
    const to = q + w.count - 1;
    q = to + 1;
    const range = w.count === 1 ? String(from) : `${from} to ${to}`;
    if (w.kind === "MAP") {
      out.push({
        title: `Question ${range}: Map work`,
        instructions: "Answer the map-based question on the outline map provided.",
        questionTypes: [{ type: "MAP_WORK", count: w.count, marksEach: w.marksEach, orChoiceMode: "NOT_REQUIRED", choicePolicy: noChoice(w.count) }],
      });
      continue;
    }
    if (w.marksEach === 2) {
      const head = h.getArchetypeHeading(6, range, lang);
      out.push({
        title: head.title,
        instructions: head.instructions,
        questionTypes: [{ type: "VERY_SHORT", count: w.count, marksEach: 2, orChoiceMode: "NOT_REQUIRED", orAlternativeCount: 0, choicePolicy: h.createChoicePolicy("NO_CHOICE", w.count, w.count, "ANY_INCLUDED_CHAPTER", "Circular 465/2026: no internal choice in 2-mark questions") }],
      });
    } else if (w.marksEach === 3) {
      const head = h.getArchetypeHeading(7, range, lang);
      out.push({
        title: head.title,
        instructions: head.instructions,
        questionTypes: [{ type: "SHORT", count: w.count, marksEach: 3, orChoiceMode: "REQUIRED", orAlternativeCount: 1, choicePolicy: h.createChoicePolicy("FULL_OR_ALTERNATIVE", w.count * 2, w.count, "SAME_UNIT", "Circular 465/2026: internal choice kept in 3-mark questions") }],
      });
    } else if (w.marksEach === 4) {
      const head = h.getArchetypeHeading(8, range, lang);
      out.push({
        title: head.title,
        instructions: head.instructions,
        questionTypes: [{ type: "LONG", count: w.count, marksEach: 4, orChoiceMode: "REQUIRED", orAlternativeCount: 1, choicePolicy: h.createChoicePolicy("FULL_OR_ALTERNATIVE", w.count * 2, w.count, "SAME_UNIT", "Circular 465/2026: internal choice kept in 4-mark questions") }],
      });
    } else {
      // 5-mark questions: the circular covers 3 and 4 marks only, so choice follows the board default
      out.push({
        title: `Question ${range}: Long answer questions (${w.marksEach} marks)`,
        instructions: "Answer in detail.",
        questionTypes: [{ type: "LONG", count: w.count, marksEach: w.marksEach, orChoiceMode: "BOARD_DEFAULT", choicePolicy: noChoice(w.count) }],
      });
    }
  }
  return out;
}

function musicSections(id: "F50_MUSIC" | "F25_MUSIC", h: TemplateHelpers): BlueprintTemplateSectionGroup[] {
  const m = MUSIC_FORMATS[id];
  const blocks = id === "F50_MUSIC" ? 4 : 2;
  const each = m.objective / blocks;
  // The note lists five objective types but only 4 (or 2) objective questions; the mapping is not printed.
  const types = ["MCQ", "FILL_BLANK", "MATCH_COLUMN", "VERY_SHORT"] as const;
  const out: BlueprintTemplateSectionGroup[] = [];
  for (let i = 0; i < blocks; i++) {
    out.push({
      title: `Question ${i + 1}: Objective`,
      instructions: "Answer all objective questions.",
      questionTypes: [{ type: types[i], count: each, marksEach: 1, orChoiceMode: "NOT_REQUIRED", choicePolicy: h.createChoicePolicy("NO_CHOICE", each, each, "ANY_INCLUDED_CHAPTER", "Compulsory") }],
    });
  }
  let q = blocks + 1;
  for (const w of m.written) {
    const to = q + w.count - 1;
    out.push({
      title: `Question ${w.count === 1 ? q : `${q} to ${to}`}: ${w.marksEach}-mark questions`,
      instructions: "Answer as directed.",
      questionTypes: [{ type: w.marksEach <= 2 ? "VERY_SHORT" : w.marksEach === 3 ? "SHORT" : "LONG", count: w.count, marksEach: w.marksEach, orChoiceMode: "BOARD_DEFAULT", choicePolicy: h.createChoicePolicy("NO_CHOICE", w.count, w.count, "ANY_INCLUDED_CHAPTER", "Choice rule not stated for this paper") }],
    });
    q = to + 1;
  }
  return out;
}

export function sourceFor(g: SchemeGroup): OfficialSource {
  return {
    url: "https://mpbse.nic.in/MarksScheme_2026_27.pdf",
    document: "अंक योजना 2026-27 (MarksScheme_2026_27.pdf)",
    session: "2026-27",
    pdfPage: g.pages[0],
    verifiedScope: ["FORMAT", "COMPONENTS"],
    confirmation: "SINGLE_READER",
  };
}

/** Groups that have no written-paper template (studio / practical papers). Kept visible, never silently dropped. */
export function practicalGroups(): SchemeGroup[] {
  return SCHEME_GROUPS_2026_27.filter((g) => formatIdFor(g) === "PRACTICAL");
}

/**
 * One template for every written paper in the 2026-27 scheme that the hand-written list does not already cover.
 * Subject codes are deliberately left empty: they are not printed in the scheme.
 */
export function buildOfficialTemplates(
  h: TemplateHelpers,
  covered: Array<{ classLevel?: number; subjectName?: string; variant?: string }>,
): BlueprintTemplate[] {
  const have = new Set(covered.map((c) => `${c.classLevel}|${(c.subjectName ?? "").toLowerCase()}`));
  const out: BlueprintTemplate[] = [];
  const seen = new Set<string>();
  for (const g of SCHEME_GROUPS_2026_27) {
    const fid = formatIdFor(g);
    if (fid === "PRACTICAL" || fid === "ENGLISH_IX_X" || fid === "ENGLISH_XI_XII") continue;
    const key = `${g.classLevel}|${g.subject.toLowerCase()}`;
    if (have.has(key) || seen.has(key)) continue;
    seen.add(key);
    const lang: "sa" | "hi" | "en" = g.subject === "Sanskrit" ? "sa" : HI_HEADING_SUBJECTS.has(g.subject) ? "hi" : "en";
    const sections =
      fid === "F50_MUSIC" || fid === "F25_MUSIC"
        ? musicSections(fid, h)
        : sectionsFor(FORMATS[fid as keyof typeof FORMATS], lang, h);
    const isLanguage = LANGUAGE_SUBJECTS.has(g.subject);
    const rows = g.rows.filter((r) => r.marks > 0);
    const t: BlueprintTemplate = {
      id: templateCodeFor(g),
      templateCode: templateCodeFor(g),
      title: `MPBSE Class ${g.classLevel} ${g.subject} Blueprint (${g.totalMarks} Marks)`,
      description: `Class ${g.classLevel} ${g.subject}, ${g.totalMarks}-mark paper. Question format and content allocation from the 2026-27 अंक योजना (pdf p.${g.pages.join(", ")}).${fid.endsWith("MUSIC") ? " The mapping of the five listed objective types onto the objective questions is not printed; adjust as needed." : ""}`,
      examType: "ANNUAL",
      durationMin: 180,
      totalMarks: g.totalMarks,
      targetClasses: `Class ${g.classLevel}`,
      classLevel: g.classLevel,
      stream: g.classLevel <= 10 ? "SECONDARY_GENERAL" : "HIGHER_SECONDARY_GENERAL",
      subjectName: g.subject,
      language: lang === "en" ? "en" : lang,
      archetype: `OFFICIAL_${fid}`,
      sections,
      source: sourceFor(g),
      ...(isLanguage
        ? { components: rows.map((r, i) => ({ key: `c${i + 1}`, title: r.title, marks: r.marks, role: roleFor(r.title) })) }
        : { unitAllocation: rows.map((r) => ({ no: r.no, title: r.title, marks: r.marks })) }),
    };
    out.push(t);
  }
  return out;
}
