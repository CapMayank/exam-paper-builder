import { AlertTriangle } from "lucide-react";
import type { SlotStatus, SlotWarning } from "@/lib/exams/types";

export const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  NO_BLUEPRINT: "No blueprint",
  NO_PAPER: "No paper",
  DRAFT: "Draft",
  FINAL: "Final",
  PRINTED: "Printed",
};

const TONE: Record<SlotStatus, string> = {
  NO_BLUEPRINT: "bg-rose-50 text-rose-700 ring-rose-200",
  NO_PAPER: "bg-slate-100 text-slate-600 ring-slate-200",
  DRAFT: "bg-sky-50 text-sky-700 ring-sky-200",
  FINAL: "bg-amber-50 text-amber-800 ring-amber-200",
  PRINTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export const SLOT_WARNING_TEXT: Record<SlotWarning, string> = {
  PAPER_CHANGED_AFTER_PRINT: "Paper changed after printing",
  DATE_CHANGED_AFTER_PRINT: "Date changed after printing — reprint needed",
};

export function SlotStatusBadge({ status, warnings = [] }: { status: SlotStatus; warnings?: SlotWarning[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE[status]}`}>
        {SLOT_STATUS_LABEL[status]}
      </span>
      {warnings.length > 0 && (
        <span title={warnings.map((w) => SLOT_WARNING_TEXT[w]).join(" · ")} className="text-amber-600">
          <AlertTriangle size={13} aria-label={warnings.map((w) => SLOT_WARNING_TEXT[w]).join(" · ")} />
        </span>
      )}
    </span>
  );
}
