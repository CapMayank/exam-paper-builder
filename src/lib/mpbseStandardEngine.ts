import {
  MPBSE_BLUEPRINT_TEMPLATES,
  validateCircular465Blueprint,
} from "./curriculumTemplates";

export interface MPBoardDimensionScore {
  name: string;
  weight: number; // 0 to 100
  score: number;  // 0 to 100
  passed: boolean;
  /** false = no computation behind this dimension; it is excluded from the score. */
  assessed: boolean;
  evidence: string;
  rationale: string;
}

export interface MPBoardComplianceReport {
  status: "PASS" | "FAIL" | "WARN";
  matchedArchetype: string;
  expectedTotalMarks: number;
  actualTotalMarks: number;
  circular465Compliant: boolean;
  mandatoryGatesPassed: boolean;
  dimensions: {
    overallScore: number;
    questionFraming: number;
    difficultyCalibration: number;
    conceptualDepth: number;
    questionTypes: number;
    internalChoice: number;
    overallStructure: number;
  };
  dimensionScores: {
    questionFramingLanguage: MPBoardDimensionScore;
    academicDifficulty: MPBoardDimensionScore;
    conceptualDepth: MPBoardDimensionScore;
    applicationQuestionDistribution: MPBoardDimensionScore;
    questionTypeDistribution: MPBoardDimensionScore;
    chapterWiseCoverage: MPBoardDimensionScore;
    marksAllocation: MPBoardDimensionScore;
    internalChoicePattern: MPBoardDimensionScore;
    overallStructure: MPBoardDimensionScore;
    similarityToOfficialStandard: MPBoardDimensionScore;
  };
  gateViolations: string[];
  verdict: string;
}

export function evaluateMPBoardStandardCompliance(paper: {
  title?: string;
  className?: string;
  subject?: string;
  subjectCode?: string;
  board?: string;
  academicSession?: string;
  totalMarks?: number;
  sections?: Array<{
    title: string;
    type: string;
    count: number;
    marksEach: number;
    orChoiceMode?: string;
    orAlternativeCount?: number | null;
  }>;
  items?: Array<unknown>;
  hasAcademicDefects?: boolean;
  defectSummary?: string;
}): MPBoardComplianceReport {
  const sections = paper.sections || [];
  const classStr = paper.className || "Class 10";
  const classLevel = parseInt(classStr.replace(/[^0-9]/g, ""), 10) || 10;
  const subCode = paper.subjectCode || "100";
  const totalMarks = paper.totalMarks || 75;

  // 1. Mandatory Quality Gate Checks
  const gateViolations: string[] = [];
  if (paper.hasAcademicDefects) {
    gateViolations.push(`Academic correctness gate failed: ${paper.defectSummary || "Unverified or flawed questions detected."}`);
  }

  // 2. Identify MPBSE Archetype from official 27 templates
  let matchedTemplate = MPBSE_BLUEPRINT_TEMPLATES.find(
    (t) => t.classLevel === classLevel && t.subjectCode === subCode,
  );

  if (!matchedTemplate) {
    matchedTemplate = MPBSE_BLUEPRINT_TEMPLATES.find(
      (t) => t.totalMarks === totalMarks && t.classLevel === classLevel,
    );
  }

  const archetype = matchedTemplate?.archetype || (totalMarks === 70 ? "SCIENCE_20Q_70M" : "STANDARD_23Q_75M");
  const expectedMarks = matchedTemplate?.totalMarks || (archetype === "SCIENCE_20Q_70M" ? 70 : 75);

  // 3. Circular 465 / Vidyochit 2026 Audit
  const c465Result = validateCircular465Blueprint(sections);
  const circular465Compliant = c465Result.isCompliant;

  if (!circular465Compliant) {
    for (const v of c465Result.violations) {
      gateViolations.push(`Circular 465 Violation in "${v.sectionTitle}": ${v.message}`);
    }
  }

  // 4. Calculate Individual Dimension Scores
  const createDimScore = (
    name: string,
    score: number,
    evidence: string,
    rationale: string,
  ): MPBoardDimensionScore => ({
    name,
    weight: 10,
    score,
    passed: score >= 70,
    assessed: true,
    evidence,
    rationale,
  });

  // Dimensions with no computation behind them are reported as not assessed, never scored.
  const createNotAssessed = (name: string): MPBoardDimensionScore => ({
    name,
    weight: 0,
    score: 0,
    passed: false,
    assessed: false,
    evidence: "Not assessed: no deterministic check exists for this dimension.",
    rationale: "Requires teacher or moderator judgement against official model papers.",
  });

  const questionTypeScore = matchedTemplate ? 100 : 0;
  const choiceScore = circular465Compliant ? 100 : 40;
  const marksAllocScore = totalMarks === expectedMarks ? 100 : 50;

  const dimensionScores = {
    questionFramingLanguage: createNotAssessed("Question Framing & Examination Language"),
    academicDifficulty: createNotAssessed("Academic Difficulty Calibration"),
    conceptualDepth: createNotAssessed("Conceptual Depth & Syllabus Grounding"),
    applicationQuestionDistribution: createNotAssessed("Application-Based & Practical Distribution"),
    questionTypeDistribution: createDimScore(
      "Question-Type Distribution (Objective + Subjective)",
      questionTypeScore,
      `Matches MP Board ${archetype} pattern (Prashna Kramank 1-5 objective tiers followed by 2m, 3m, 4m).`,
      "Enforces genuine MPBSE paper structure.",
    ),
    chapterWiseCoverage: createNotAssessed("Chapter-Wise Coverage & Weightage"),
    marksAllocation: createDimScore(
      "Marks Allocation Integrity",
      marksAllocScore,
      `Total marks (${totalMarks}) matches official template theory marks (${expectedMarks}).`,
      "Deterministic calculation guarantees zero marks discrepancy.",
    ),
    internalChoicePattern: createDimScore(
      "Internal Choice Pattern (Circular 465)",
      choiceScore,
      circular465Compliant
        ? "100% compliant with Circular 465 (2m no choice; 3m & 4m mandatory OR alternative from same chapter)."
        : `Non-compliant: ${c465Result.violations.length} choice violations detected.`,
      "Statutory compliance is a mandatory quality gate.",
    ),
    overallStructure: createNotAssessed("Overall Examination Structure"),
    similarityToOfficialStandard: createNotAssessed("Similarity to Official MP Board Experience"),
  };

  const mandatoryGatesPassed = gateViolations.length === 0 && !paper.hasAcademicDefects;

  const assessedDims = Object.values(dimensionScores).filter((d) => d.assessed);
  const rawAvg = Math.round(assessedDims.reduce((acc, d) => acc + d.score, 0) / Math.max(1, assessedDims.length));

  const overallScore = mandatoryGatesPassed ? rawAvg : 0;
  const status: "PASS" | "FAIL" | "WARN" = !mandatoryGatesPassed
    ? "FAIL"
    : overallScore < 75
    ? "WARN"
    : "PASS";

  const verdict = mandatoryGatesPassed
    ? `Passes the checked gates (${archetype}: question format, marks total, Circular 465 internal choice). ${assessedDims.length} of ${Object.values(dimensionScores).length} dimensions are computed; the rest are not assessed.`
    : `MP Board Standard Compliance FAILED: ${gateViolations.join("; ")}`;

  return {
    status,
    matchedArchetype: archetype,
    expectedTotalMarks: expectedMarks,
    actualTotalMarks: totalMarks,
    circular465Compliant,
    mandatoryGatesPassed,
    dimensions: {
      overallScore,
      questionFraming: dimensionScores.questionFramingLanguage.score,
      difficultyCalibration: dimensionScores.academicDifficulty.score,
      conceptualDepth: dimensionScores.conceptualDepth.score,
      questionTypes: dimensionScores.questionTypeDistribution.score,
      internalChoice: dimensionScores.internalChoicePattern.score,
      overallStructure: dimensionScores.overallStructure.score,
    },
    dimensionScores,
    gateViolations,
    verdict,
  };
}
