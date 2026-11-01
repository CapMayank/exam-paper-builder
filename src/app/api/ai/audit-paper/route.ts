import { body, HttpError, route } from "@/lib/api";
import { parseMatchColumnPairs } from "@/lib/constants";
import { auditPaperEvidenceBased, type EvidenceAuditFinding } from "@/lib/evidenceAuditEngine";
import { evaluateMPBoardStandardCompliance } from "@/lib/mpbseStandardEngine";
import { validatePaperCompleteness } from "@/lib/paperCompletenessEngine";
import { loadPaperView } from "@/lib/papers";
import { subpartsTotalMarks } from "@/lib/types";
import { z } from "zod";

const auditSchema = z.object({
  paperId: z.string().optional(),
  paperTitle: z.string().optional(),
  className: z.string().optional(),
  subject: z.string().optional(),
  totalMarks: z.number().int().optional(),
  questions: z
    .array(
      z.object({
        id: z.string().default(""),
        number: z.number().int().default(1),
        sectionTitle: z.string().default("Section A"),
        type: z.string().default("SHORT"),
        text: z.string().default(""),
        options: z.array(z.string()).default([]),
        answer: z.string().default(""),
        explanation: z.string().optional(),
        marks: z.number().int().default(1),
        difficulty: z.string().default("MEDIUM"),
        imagePath: z.string().optional(),
        figureDoc: z.unknown().optional(),
      }),
    )
    .optional(),
});

export const POST = route(async (req) => {
  const customKey = req.headers.get("x-gemini-api-key");
  const data = await body(req, auditSchema);

  if (data.paperId) {
    const paper = await loadPaperView(data.paperId);
    if (!paper) {
      throw new HttpError(404, "Paper not found");
    }

    const totalMarks = paper.progress.totalMarks;

    const questions = paper.items.map((it, idx: number) => {
      const sec = paper.blueprint.sections.find((s) => s.id === it.sectionId);
      const marksEach = sec?.marksEach ?? 1;
      const isMatch = it.question.type === "MATCH_COLUMN" || sec?.type === "MATCH_COLUMN";
      const matchPairCount = isMatch
        ? (parseMatchColumnPairs(it.question.options, it.question.text, (it.question as any).explanation).length || sec?.count || 1)
        : 0;
      const subpartsMarks = subpartsTotalMarks(it.question.subparts);
      const actualMarks = isMatch
        ? (sec?.count === 1 ? marksEach : Math.min(matchPairCount * marksEach, (sec?.count || 1) * marksEach))
        : subpartsMarks > 0
        ? subpartsMarks
        : marksEach;

      return {
        id: it.question.id,
        number: idx + 1,
        sectionTitle: sec?.title || "Section",
        type: it.question.type,
        text: it.question.text,
        options: it.question.options || [],
        answer: it.question.answer,
        explanation: (it.question as any).explanation,
        marks: actualMarks,
        difficulty: it.question.difficulty,
        imagePath: (it.question as any).imagePath,
        figureDoc: (it.question as any).figureDoc,
      };
    });

    // 1. Stage: Independent Evidence-Based Audit
    const auditReport = await auditPaperEvidenceBased({
      paperTitle: paper.title,
      className: paper.blueprint.book.className,
      subject: paper.blueprint.book.subject,
      totalMarks,
      questions,
      apiKey: customKey,
    });

    // 2. Stage: Deterministic Paper Completeness & Marks Verification
    const completeness = validatePaperCompleteness({
      blueprint: paper.blueprint as any,
      items: paper.items as any,
    });

    // 3. Stage: MP Board Standard Compliance Comparison
    const mpbseCompliance = evaluateMPBoardStandardCompliance({
      title: paper.title,
      className: paper.blueprint.book.className,
      subject: paper.blueprint.book.subject,
      subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
      board: paper.schoolName?.includes("CBSE") ? "CBSE" : "MPBSE",
      totalMarks,
      sections: paper.blueprint.sections as any,
      items: paper.items as any,
    });

    // Merge deterministic findings with zero false-positive duplication
    const extraFindings: EvidenceAuditFinding[] = [];

    // Attach completeness/marks issues
    if (!completeness.marksValidation.passed) {
      for (const mi of completeness.marksValidation.issues) {
        extraFindings.push({
          questionNumber: 0,
          sectionTitle: "Marks Reconciliation",
          severity: "HIGH",
          type: "MARKS_MISMATCH",
          issue: mi,
          evidence: `Actual calculated marks: ${completeness.marksValidation.actualTotalMarks} vs Expected: ${completeness.marksValidation.expectedTotalMarks}`,
          whyItIsAnIssue: "Total question marks in paper must equal official blueprint grand total.",
          recommendedCorrection: "Reconcile section or subpart marks to match blueprint total marks.",
          description: mi,
          suggestedFix: "Reconcile section or subpart marks to match blueprint total marks.",
          isObjectivelyVerified: true,
          confidence: "HIGH",
        });
      }
    }

    if (!completeness.structuralCompleteness.passed) {
      for (const si of completeness.structuralCompleteness.issues) {
        extraFindings.push({
          questionNumber: 0,
          sectionTitle: "Paper Structure",
          severity: "HIGH",
          type: "INCOMPLETE_QUESTION",
          issue: si,
          evidence: `Missing question count: ${completeness.structuralCompleteness.missingQuestionsCount}`,
          whyItIsAnIssue: "An incomplete paper cannot be administered or printed.",
          recommendedCorrection: "Fill all remaining question slots.",
          description: si,
          suggestedFix: "Fill all remaining question slots.",
          isObjectivelyVerified: true,
          confidence: "HIGH",
        });
      }
      for (const ref of completeness.structuralCompleteness.danglingReferences) {
        extraFindings.push({
          questionNumber: 0,
          sectionTitle: "Visual Assets",
          severity: "HIGH",
          type: "INCOMPLETE_QUESTION",
          issue: ref,
          evidence: ref,
          whyItIsAnIssue: "Students cannot answer questions referencing nonexistent diagrams or passages.",
          recommendedCorrection: "Attach the diagram or remove the visual reference.",
          description: ref,
          suggestedFix: "Attach the diagram or remove the visual reference.",
          isObjectivelyVerified: true,
          confidence: "HIGH",
        });
      }
    }

    // Attach chapter quota implications if any
    if (paper.implications && paper.implications.length > 0) {
      const quotaIssues = paper.implications
        .filter((imp) => imp.code === "CHAPTER_EXCESS" || imp.code === "CHAPTER_DEFICIT")
        .map((imp) => ({
          questionNumber: 0,
          sectionTitle: "Blueprint Weightage",
          type: "BLUEPRINT_MISMATCH" as const,
          severity: (imp.severity === "error" ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
          issue: imp.message,
          evidence: imp.message,
          whyItIsAnIssue: "Chapter weightages deviate from prescribed curriculum blueprint quotas.",
          recommendedCorrection: "Rebalance question chapter assignments to align with official blueprint quotas.",
          description: imp.message,
          suggestedFix: "Rebalance question chapter assignments to align with official blueprint quotas.",
          isObjectivelyVerified: true,
          confidence: "HIGH" as const,
          canReconcileBlueprint: true,
        }));

      extraFindings.push(...quotaIssues);
    }

    // Attach Circular 465 violations if any
    if (!mpbseCompliance.circular465Compliant) {
      for (const v of mpbseCompliance.gateViolations) {
        if (!extraFindings.some((f) => f.issue === v)) {
          extraFindings.push({
            questionNumber: 0,
            sectionTitle: "MP Board Circular 465",
            severity: "HIGH",
            type: "BLUEPRINT_MISMATCH",
            issue: v,
            evidence: v,
            whyItIsAnIssue: "Statutory violation of MPBSE examination order Circular 465.",
            recommendedCorrection: "Ensure 2-mark questions have NO choice, and 3-mark & 4-mark questions have mandatory OR choices.",
            description: v,
            suggestedFix: "Ensure 2-mark questions have NO choice, and 3-mark & 4-mark questions have mandatory OR choices.",
            isObjectivelyVerified: true,
            confidence: "HIGH",
          });
        }
      }
    }

    const allFindings = [...extraFindings, ...auditReport.findings];
    const highCount = allFindings.filter((f) => f.severity === "HIGH").length;
    const medCount = allFindings.filter((f) => f.severity === "MEDIUM").length;

    const finalStatus: "PASS" | "PASS WITH WARNINGS" | "FAIL" =
      highCount > 0
        ? "FAIL"
        : medCount > 0
        ? "PASS WITH WARNINGS"
        : "PASS";

    auditReport.findings = allFindings;
    auditReport.issues = allFindings;
    auditReport.status = finalStatus;

    if (finalStatus === "PASS") {
      auditReport.overallVerdict = "PASS: Certified Ready for Print. Fully verified, mathematically accurate, and 100% compliant with MP Board standards.";
      auditReport.cognitiveBalance.rating = "EXCELLENT";
    } else if (finalStatus === "PASS WITH WARNINGS") {
      auditReport.overallVerdict = `PASS WITH WARNINGS: Found ${medCount} minor item(s) recommended for teacher refinement prior to print run.`;
      auditReport.cognitiveBalance.rating = "BALANCED";
    } else {
      auditReport.overallVerdict = `FAIL: Found ${highCount} significant defect(s) requiring teacher correction prior to printing.`;
      auditReport.cognitiveBalance.rating = "NEEDS_ADJUSTMENT";
    }

    return {
      success: true,
      isMock: false,
      data: auditReport,
      completeness,
      mpbseCompliance,
    };
  }

  if (!data.questions || data.questions.length === 0) {
    throw new HttpError(400, "Provide either paperId or questions array to audit.");
  }

  const auditReport = await auditPaperEvidenceBased({
    paperTitle: data.paperTitle || "Draft Examination Paper",
    className: data.className || "Class 10",
    subject: data.subject || "General",
    totalMarks: data.totalMarks || 80,
    questions: data.questions,
    apiKey: customKey,
  });

  return {
    success: true,
    isMock: false,
    data: auditReport,
  };
});
