"use client";

import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface FeasibilityStatusAlertProps {
  warnings: string[];
  totalSectionMarks: number;
  totalChapterMarks: number;
}

export function FeasibilityStatusAlert({
  warnings,
  totalSectionMarks,
  totalChapterMarks,
}: FeasibilityStatusAlertProps) {
  // Don't show feasibility status on unconfigured blueprints
  if (totalSectionMarks === 0) return null;

  const isMatch = totalSectionMarks === totalChapterMarks;
  const isFeasible = warnings.length === 0 && isMatch;

  if (isFeasible) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs text-emerald-950 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold text-emerald-900 block">Exam Mathematically Feasible</span>
            <span className="text-emerald-700">
              Active chapter mark quotas align with section question denominations ({totalSectionMarks} Marks).
            </span>
          </div>
        </div>
        <span className="bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded text-[11px] shrink-0">
          DP Solvable
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950 shadow-2xs space-y-2">
      <div className="flex items-center gap-2 font-bold text-amber-900">
        <AlertCircle size={18} className="text-amber-600 shrink-0" />
        <span>Examination Feasibility Notice ({warnings.length + (!isMatch ? 1 : 0)} issue{warnings.length > 1 ? "s" : ""})</span>
      </div>
      <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
        {!isMatch && (
          <li>
            Sections total <strong>{totalSectionMarks}m</strong>, but chapter weightages sum to <strong>{totalChapterMarks}m</strong>.
            Use the <strong>⚡ Rebalance Marks</strong> button to reconcile.
          </li>
        )}
        {warnings.map((w, idx) => (
          <li key={idx} className="leading-relaxed">
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
}
