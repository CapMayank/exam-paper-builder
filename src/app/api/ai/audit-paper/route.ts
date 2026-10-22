import { body, HttpError, route } from "@/lib/api";
import { parseMatchColumnPairs } from "@/lib/constants";
import { auditPaperWithGemini } from "@/lib/gemini";
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
        marks: z.number().int().default(1),
        difficulty: z.string().default("MEDIUM"),
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
        ? (parseMatchColumnPairs(it.question.options, it.question.text).length || sec?.count || 1)
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
        marks: actualMarks,
        difficulty: it.question.difficulty,
      };
    });

    const result = await auditPaperWithGemini({
      paperTitle: paper.title,
      className: paper.blueprint.book.className,
      subject: paper.blueprint.book.subject,
      totalMarks,
      questions,
      apiKey: customKey,
    });

    if (result.success && result.data && paper.implications && paper.implications.length > 0) {
      const quotaIssues = paper.implications
        .filter((imp) => imp.code === "CHAPTER_EXCESS" || imp.code === "CHAPTER_DEFICIT")
        .map((imp) => ({
          questionNumber: 0,
          sectionTitle: "Blueprint Weightage",
          type: "BLUEPRINT_MISMATCH" as const,
          severity: (imp.severity === "error" ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
          description: imp.message,
          suggestedFix: "Rebalance question chapter assignments to align with official blueprint quotas.",
          canReconcileBlueprint: true,
        }));

      if (quotaIssues.length > 0) {
        result.data.issues = [...quotaIssues, ...result.data.issues];
        if (result.data.cognitiveBalance.rating === "EXCELLENT") {
          result.data.cognitiveBalance.rating = "BALANCED";
        }
      }
    }

    return result;
  }

  if (!data.questions || data.questions.length === 0) {
    throw new HttpError(400, "Provide either paperId or questions array to audit.");
  }

  const result = await auditPaperWithGemini({
    paperTitle: data.paperTitle || "Draft Examination Paper",
    className: data.className || "Class 10",
    subject: data.subject || "General",
    totalMarks: data.totalMarks || 80,
    questions: data.questions,
    apiKey: customKey,
  });

  return result;
});
