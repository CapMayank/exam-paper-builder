import type { BlueprintTemplate } from "./curriculumTemplates";

/**
 * Structural audit of blueprint templates. Pure and data-driven: it reports
 * defects, it never rewrites a template or invents official patterns.
 */

export type StructureFindingCode =
  | "LANGUAGE_MISSING_COMPONENT"
  | "PASSAGE_SECTION_IS_FLAT_OBJECTIVE"
  | "MISSING_SOURCE_REFERENCE"
  | "MISSING_VARIANT_IDENTITY"
  | "MARKS_MISMATCH"
  | "COMPONENT_MARKS_MISMATCH";

export type StructureFinding = {
  templateCode: string;
  code: StructureFindingCode;
  detail: string;
};

export type VerificationStatus = "UNVERIFIED" | "SOURCE_CITED";

const LANGUAGE_SUBJECTS = ["hindi", "english", "sanskrit", "urdu"];

const PASSAGE_TITLE = /unseen|comprehension|reading|passage|अपठित|गद्यांश|काव्यांश|अवबोधन/i;
const GRAMMAR_TITLE = /grammar|व्याकरण|व्याकरणम्/i;
const WRITING_TITLE = /writing|composition|रचना|लेखन|पत्र|निबंध|रचनात्मक/i;

/** Types that carry a passage plus subquestions as one parent unit. */
const PASSAGE_CONTAINER_TYPES = new Set(["UNSEEN_PASSAGE", "CASE_STUDY", "REFERENCE_CONTEXT"]);

export function isLanguageTemplate(t: Pick<BlueprintTemplate, "subjectName">): boolean {
  return LANGUAGE_SUBJECTS.includes((t.subjectName ?? "").trim().toLowerCase());
}

/**
 * Verification status is only ever SOURCE_CITED when the template carries an
 * explicit source URL/page; a circular number alone is not a reference to the
 * blueprint itself, so it does not upgrade the status.
 */
export function templateVerificationStatus(
  t: Pick<BlueprintTemplate, "provenance" | "source"> & { sourceUrl?: string },
): VerificationStatus {
  return t.source?.url || t.sourceUrl ? "SOURCE_CITED" : "UNVERIFIED";
}

export function auditTemplateStructure(
  t: BlueprintTemplate & { sourceUrl?: string },
): StructureFinding[] {
  const findings: StructureFinding[] = [];
  const add = (code: StructureFindingCode, detail: string) =>
    findings.push({ templateCode: t.templateCode, code, detail });

  const total = t.sections.reduce(
    (sum, g) => sum + g.questionTypes.reduce((s, q) => s + q.count * q.marksEach, 0),
    0,
  );
  if (total !== t.totalMarks) add("MARKS_MISMATCH", `sections sum to ${total}, template says ${t.totalMarks}`);

  if (templateVerificationStatus(t) === "UNVERIFIED") {
    add("MISSING_SOURCE_REFERENCE", "no source URL/page for the official blueprint; status UNVERIFIED");
  }

  if (t.components) {
    const sum = t.components.reduce((a, x) => a + x.marks, 0);
    if (sum !== t.totalMarks) add("COMPONENT_MARKS_MISMATCH", `official components sum to ${sum}, template says ${t.totalMarks}`);
  }

  if (!t.classLevel || !t.subjectName) {
    add("MISSING_VARIANT_IDENTITY", "template has no classLevel/subjectName, so it cannot be matched to a class and subject");
  }

  for (const g of t.sections) {
    if (!PASSAGE_TITLE.test(g.title)) continue;
    const container = g.questionTypes.some((q) => PASSAGE_CONTAINER_TYPES.has(q.type));
    if (!container) {
      add(
        "PASSAGE_SECTION_IS_FLAT_OBJECTIVE",
        `"${g.title}" is made of ${g.questionTypes.map((q) => q.type).join("/")} slots with no passage parent; ` +
          "any one-mark MCQ is accepted there and passage MCQs are indistinguishable from general MCQs",
      );
    }
  }

  if (isLanguageTemplate(t)) {
    const titles = t.sections.map((g) => g.title);
    const types = new Set(t.sections.flatMap((g) => g.questionTypes.map((q) => q.type)));
    const roles = new Set((t.components ?? []).map((x) => x.role));
    const has = (re: RegExp, type: string, role: string) =>
      roles.has(role as never) || titles.some((x) => re.test(x)) || types.has(type as never);
    if (!has(PASSAGE_TITLE, "UNSEEN_PASSAGE", "PASSAGE")) add("LANGUAGE_MISSING_COMPONENT", "no unseen passage / reading component");
    if (!has(GRAMMAR_TITLE, "GRAMMAR", "GRAMMAR")) add("LANGUAGE_MISSING_COMPONENT", "no grammar component");
    if (!has(WRITING_TITLE, "WRITING_SKILL", "WRITING")) add("LANGUAGE_MISSING_COMPONENT", "no writing component");
  }

  return findings;
}
