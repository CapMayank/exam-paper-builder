"use client";

import React, { useMemo } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Lock, ShieldCheck, X, ArrowUpRight } from "lucide-react";
import type { PaperData } from "@/lib/types";
import { validatePaperPreflight, type PreflightIssue } from "@/lib/preflight";

interface PaperPreflightModalProps {
  isOpen: boolean;
  paper: PaperData;
  onClose: () => void;
  onConfirmFinalize: () => void;
  onJumpToQuestion?: (questionId?: string, questionNumber?: number) => void;
  onGoToTab?: (tab: "questions" | "blueprint" | "print") => void;
}

export function PaperPreflightModal({
  isOpen,
  paper,
  onClose,
  onConfirmFinalize,
  onJumpToQuestion,
  onGoToTab,
}: PaperPreflightModalProps) {
  const report = useMemo(() => validatePaperPreflight(paper), [paper]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preflight-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              report.errors.length > 0
                ? "bg-rose-100 text-rose-700"
                : report.warnings.length > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              {report.errors.length > 0 ? (
                <AlertCircle size={20} />
              ) : report.warnings.length > 0 ? (
                <AlertTriangle size={20} />
              ) : (
                <ShieldCheck size={20} />
              )}
            </div>
            <div>
              <h2 id="preflight-modal-title" className="text-base font-bold text-slate-900">
                Pre-Finalisation Quality Check
              </h2>
              <p className="text-xs text-slate-500">
                Auditing &ldquo;{paper.title}&rdquo; before locking for printing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-[65vh] overflow-y-auto p-6 space-y-5">
          {/* Status summary banner */}
          {report.errors.length > 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900">
              <div className="font-semibold text-rose-950 flex items-center gap-1.5 mb-1">
                <AlertCircle size={15} className="text-rose-600" />
                <span>Cannot Finalise Yet &mdash; Blueprint Incomplete</span>
              </div>
              <p>
                The paper has {report.errors.length} blocking requirement(s) that must be fulfilled before it can be finalized.
              </p>
            </div>
          ) : report.warnings.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900">
              <div className="font-semibold text-amber-950 flex items-center gap-1.5 mb-1">
                <AlertTriangle size={15} className="text-amber-600" />
                <span>Ready to Finalise &mdash; {report.warnings.length} Quality Notice(s) Found</span>
              </div>
              <p>
                The paper fulfills blueprint quotas, but contains potential quality gaps (e.g. missing model answers or unset date). You can review these or proceed to lock now.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-900">
              <div className="font-semibold text-emerald-950 flex items-center gap-1.5 mb-1">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>All Quality Pre-flight Checks Passed</span>
              </div>
              <p>
                Questions match blueprint totals, answer keys are present, instructions are set, and no duplicate questions were detected.
              </p>
            </div>
          )}

          {/* Group: Blocking Errors */}
          {report.errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <AlertCircle size={13} />
                <span>Blocking Issues ({report.errors.length})</span>
              </h3>
              <div className="space-y-2">
                {report.errors.map((err, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border border-rose-100 bg-rose-50/40 p-3 text-xs text-rose-900">
                    <div className="flex-1">
                      <span className="font-semibold text-rose-950 block">{err.message}</span>
                    </div>
                    {onGoToTab && (
                      <button
                        type="button"
                        onClick={() => {
                          onGoToTab("questions");
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:underline shrink-0"
                      >
                        Fix Now <ArrowUpRight size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group: Warnings */}
          {report.warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                <span>Quality Warnings ({report.warnings.length})</span>
              </h3>
              <div className="space-y-2">
                {report.warnings.map((warn, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/40 p-3 text-xs text-amber-900">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        {warn.questionNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900 font-bold text-[10px]">
                            Q{warn.questionNumber}
                          </span>
                        )}
                        <span className="font-medium text-amber-950">{warn.message}</span>
                      </div>
                    </div>
                    {warn.code === "DATE_UNSET" && onGoToTab ? (
                      <button
                        type="button"
                        onClick={() => {
                          onGoToTab("print");
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:underline shrink-0"
                      >
                        Set Date <ArrowUpRight size={12} />
                      </button>
                    ) : warn.questionId && onJumpToQuestion ? (
                      <button
                        type="button"
                        onClick={() => {
                          onJumpToQuestion(warn.questionId, warn.questionNumber);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:underline shrink-0"
                      >
                        Review <ArrowUpRight size={12} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group: Advisory Info */}
          {report.info.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Info size={13} />
                <span>Advisory Notices ({report.info.length})</span>
              </h3>
              <div className="space-y-2">
                {report.info.map((inf, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 text-xs text-slate-700">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {inf.questionNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                            Q{inf.questionNumber}
                          </span>
                        )}
                        <span>{inf.message}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost text-xs text-slate-600 hover:text-slate-900"
          >
            Back to Editing
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!report.canFinalize}
              onClick={() => {
                onConfirmFinalize();
                onClose();
              }}
              className={`btn text-xs font-semibold flex items-center gap-1.5 ${
                report.canFinalize
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Lock size={13} />
              <span>
                {report.warnings.length > 0
                  ? "Proceed & Finalise Anyway"
                  : "Confirm & Finalise Paper"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
