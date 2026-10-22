"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  FileCheck,
  HelpCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Modal, Spinner, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { MathText } from "./MathText";
import type { PaperAuditReport } from "@/lib/gemini";

interface AIPaperAuditModalProps {
  paperId: string;
  paperTitle: string;
  onClose: () => void;
  onQuestionUpdated?: () => void;
}

export function AIPaperAuditModal({
  paperId,
  paperTitle,
  onClose,
  onQuestionUpdated,
}: AIPaperAuditModalProps) {
  const toast = useToast();

  const [busy, setBusy] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PaperAuditReport | null>(null);
  const [isMock, setIsMock] = useState<boolean>(false);
  const [appliedFixes, setAppliedFixes] = useState<Set<number>>(new Set());
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);
  const [applyingAll, setApplyingAll] = useState<boolean>(false);

  async function handleApplyFix(iss: PaperAuditReport["issues"][0], index: number) {
    if (!iss.questionId && !iss.canReconcileBlueprint) return;
    setApplyingIndex(index);
    try {
      if (iss.canReconcileBlueprint) {
        const res = await api<{ success: boolean; reassignmentsCount: number; summary: string }>(
          `/api/papers/${paperId}/reconcile-blueprint`,
          { method: "POST" }
        );
        setAppliedFixes((prev) => new Set(prev).add(index));
        toast.success(res.summary || "Blueprint chapter quotas synchronized successfully!");
        onQuestionUpdated?.();
        return;
      }

      const payload: Record<string, unknown> = {};
      if (iss.fixedText) payload.text = iss.fixedText;
      if (iss.fixedOptions && iss.fixedOptions.length > 0) payload.options = iss.fixedOptions;

      await api(`/api/questions/${iss.questionId}`, {
        method: "PATCH",
        json: payload,
      });

      setAppliedFixes((prev) => new Set(prev).add(index));
      toast.success(`Applied fix to Question ${iss.questionNumber}`);
      onQuestionUpdated?.();
    } catch (err) {
      toast.error((err as Error).message || "Failed to apply fix");
    } finally {
      setApplyingIndex(null);
    }
  }

  async function handleApplyAllFixes() {
    if (!report) return;
    const applicable = report.issues
      .map((iss, index) => ({ iss, index }))
      .filter(
        ({ iss, index }) =>
          ((iss.questionId && (iss.fixedText || (iss.fixedOptions && iss.fixedOptions.length > 0))) ||
            iss.canReconcileBlueprint) &&
          !appliedFixes.has(index)
      );

    if (applicable.length === 0) return;

    setApplyingAll(true);
    let successCount = 0;
    try {
      let blueprintReconciled = false;
      for (const { iss, index } of applicable) {
        try {
          if (iss.canReconcileBlueprint) {
            if (!blueprintReconciled) {
              await api(`/api/papers/${paperId}/reconcile-blueprint`, { method: "POST" });
              blueprintReconciled = true;
            }
            setAppliedFixes((prev) => new Set(prev).add(index));
            successCount++;
            continue;
          }

          const payload: Record<string, unknown> = {};
          if (iss.fixedText) payload.text = iss.fixedText;
          if (iss.fixedOptions && iss.fixedOptions.length > 0) payload.options = iss.fixedOptions;

          await api(`/api/questions/${iss.questionId}`, {
            method: "PATCH",
            json: payload,
          });
          setAppliedFixes((prev) => new Set(prev).add(index));
          successCount++;
        } catch {
          // continue with others
        }
      }
      if (successCount > 0) {
        toast.success(`Applied ${successCount} fix(es) to paper questions`);
        onQuestionUpdated?.();
      }
    } finally {
      setApplyingAll(false);
    }
  }

  async function loadAudit() {
    setBusy(true);
    setError(null);
    setAppliedFixes(new Set());
    try {
      const customKey =
        typeof window !== "undefined"
          ? localStorage.getItem("exam_gemini_api_key") || ""
          : "";

      const headers: Record<string, string> = {};
      if (customKey) headers["x-gemini-api-key"] = customKey;

      const res = await api<{
        success: boolean;
        isMock: boolean;
        data: PaperAuditReport;
        error?: string;
      }>("/api/ai/audit-paper", {
        method: "POST",
        headers,
        json: { paperId },
      });

      if (!res.success && res.error) {
        setError(res.error);
        return;
      }

      setReport(res.data);
      setIsMock(res.isMock);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadAudit();
  }, [paperId]);

  return (
    <Modal
      size="xl"
      title="✨ AI Exam Paper Quality &amp; Bloom's Audit"
      subtitle={`Automated moderation and cognitive balance analysis for "${paperTitle}"`}
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isMock ? (
              <span className="text-amber-700">Offline Board Template Audit</span>
            ) : (
              <span className="text-emerald-700 font-medium">Verified by Gemini AI</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={loadAudit}
              disabled={busy}
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Re-audit
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1 font-medium">{error}</div>
          </div>
        )}

        {busy ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <Spinner />
            <span className="mt-3 text-sm font-semibold text-slate-800">
              Moderating exam paper questions...
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Evaluating cognitive distribution across Bloom's Taxonomy &amp; checking question integrity.
            </span>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Overall Verdict Banner */}
            <div
              className={`rounded-2xl border p-4.5 flex flex-wrap items-center justify-between gap-4 ${
                report.issues.length === 0
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-amber-200 bg-amber-50/70"
              }`}
            >
              <div className="flex items-start gap-3">
                {report.issues.length === 0 ? (
                  <ShieldCheck size={24} className="text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <ShieldAlert size={24} className="text-amber-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {report.cognitiveBalance.rating === "EXCELLENT"
                      ? "Board-Standard Paper Alignment"
                      : "Audit Review Completed"}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed max-w-2xl">
                    {report.overallVerdict}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                  report.cognitiveBalance.rating === "EXCELLENT"
                    ? "bg-emerald-200 text-emerald-950"
                    : "bg-amber-200 text-amber-950"
                }`}
              >
                {report.cognitiveBalance.rating}
              </span>
            </div>

            {/* Bloom's Cognitive Balance Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-4.5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Bloom's Taxonomy Cognitive Distribution ({report.totalMarks} Marks)
                  </h4>
                </div>
                <span className="text-xs text-slate-500">
                  {report.totalQuestions} Questions total
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Remembering */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Remembering</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {report.cognitiveBalance.rememberingPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, report.cognitiveBalance.rememberingPct)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    CBSE target: {report.cognitiveBalance.cbseBenchmark.remembering}
                  </span>
                </div>

                {/* Understanding */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Understanding</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {report.cognitiveBalance.understandingPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${Math.min(100, report.cognitiveBalance.understandingPct)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    CBSE target: {report.cognitiveBalance.cbseBenchmark.understanding}
                  </span>
                </div>

                {/* Applying */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Applying</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {report.cognitiveBalance.applyingPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, report.cognitiveBalance.applyingPct)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    CBSE target: {report.cognitiveBalance.cbseBenchmark.applying}
                  </span>
                </div>

                {/* Analyzing / HOTS */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">HOTS / Analyzing</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {report.cognitiveBalance.analyzingHotsPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${Math.min(100, report.cognitiveBalance.analyzingHotsPct)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    CBSE target: {report.cognitiveBalance.cbseBenchmark.analyzingHots}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-indigo-50/70 p-3 text-xs text-indigo-950 leading-relaxed border border-indigo-100">
                <span className="font-semibold">Analysis: </span>
                {report.cognitiveBalance.summary}
              </div>
            </div>

            {/* Question Flaws, Ambiguities & Checks */}
            <div className="rounded-xl border border-slate-200 bg-white p-4.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck size={16} className="text-indigo-600" />
                    Question Integrity &amp; Ambiguity Checks
                  </h4>
                  <span className="text-xs text-slate-500">
                    ({report.issues.length === 0
                      ? "0 issues detected"
                      : `${report.issues.length} item(s) flagged`})
                  </span>
                </div>

                {report.issues.some(
                  (iss, idx) =>
                    ((iss.questionId &&
                      (iss.fixedText || (iss.fixedOptions && iss.fixedOptions.length > 0))) ||
                      iss.canReconcileBlueprint) &&
                    !appliedFixes.has(idx)
                ) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary flex items-center gap-1.5 text-xs font-medium"
                    onClick={handleApplyAllFixes}
                    disabled={applyingAll || busy}
                  >
                    {applyingAll ? <Spinner /> : <Sparkles size={13} />}
                    Apply All Fixes
                  </button>
                )}
              </div>

              {report.issues.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-900">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block">All questions verified!</span>
                    <span className="text-emerald-800">
                      No ambiguous phrasing, missing MCQ choices, or mark discrepancies were detected.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.issues.map((iss, i) => {
                    const hasFixPayload = Boolean(
                      iss.canReconcileBlueprint ||
                        (iss.questionId &&
                          (iss.fixedText || (iss.fixedOptions && iss.fixedOptions.length > 0))),
                    );
                    const isApplied = appliedFixes.has(i);

                    return (
                      <div
                        key={i}
                        className={`rounded-xl border p-3.5 space-y-2.5 text-xs transition-colors ${
                          isApplied
                            ? "border-emerald-300 bg-emerald-50/40"
                            : "border-amber-200 bg-amber-50/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {iss.questionNumber > 0 ? `Q${iss.questionNumber} (${iss.sectionTitle})` : iss.sectionTitle}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                iss.severity === "HIGH"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {iss.type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Severity: {iss.severity}
                          </span>
                        </div>

                        <p className="text-slate-800 leading-relaxed font-medium">
                          {iss.description}
                        </p>

                        <div className="rounded-lg bg-white border border-slate-200 p-2.5 space-y-1.5">
                          <span className="font-semibold text-indigo-900 block text-[11px]">
                            Recommended Fix:
                          </span>
                          <p className="text-slate-700 text-[11px] leading-relaxed">
                            {iss.suggestedFix}
                          </p>
                          {iss.fixedText && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-emerald-950 font-medium">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                Proposed Question Text:
                              </span>
                              <div className="rounded bg-slate-50 p-1.5 border border-slate-200/60">
                                <MathText text={iss.fixedText} />
                              </div>
                            </div>
                          )}
                          {iss.fixedOptions && iss.fixedOptions.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-emerald-950 font-medium">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                Proposed Options:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 rounded bg-slate-50 p-1.5 border border-slate-200/60">
                                {iss.fixedOptions.map((opt, oi) => (
                                  <div key={oi} className="text-xs text-slate-700 flex items-start gap-1">
                                    <span className="font-bold text-slate-500">({String.fromCharCode(65 + oi)})</span>
                                    <span><MathText text={opt} /></span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {hasFixPayload && (
                          <div className="flex items-center justify-end pt-1">
                            {isApplied ? (
                              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                {iss.canReconcileBlueprint ? "Blueprint Synchronized" : "Fix Applied to Paper"}
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary flex items-center gap-1.5 text-xs shadow-xs"
                                onClick={() => handleApplyFix(iss, i)}
                                disabled={applyingIndex === i || applyingAll}
                              >
                                {applyingIndex === i ? (
                                  <>
                                    <Spinner />
                                    Applying...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={13} />
                                    {iss.canReconcileBlueprint ? "Rebalance Quotas" : "Apply This Fix"}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
