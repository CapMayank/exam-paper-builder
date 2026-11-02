"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

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

  // the budget bar already shows a balanced blueprint; only problems need a banner
  if (isFeasible) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950 shadow-2xs space-y-2">
      <div className="flex items-center gap-2 font-bold text-amber-900">
        <AlertCircle size={18} className="text-amber-600 shrink-0" />
        <span>This blueprint cannot be filled exactly yet</span>
      </div>
      <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
        {!isMatch && (
          <li>
            Sections total <strong>{totalSectionMarks}m</strong>, but chapter weightages sum to <strong>{totalChapterMarks}m</strong>.
            Use <strong>Auto-distribute</strong> in the bar below to balance them.
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
