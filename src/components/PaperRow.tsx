"use client";

import { Copy, KeyRound, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { EXAM_TYPE_LABEL, resolvePaperExamType, type ExamType } from "@/lib/constants";
import { plural, timeAgo } from "@/lib/format";
import type { PaperListItem } from "@/lib/types";

export function Progress({
  filled,
  needed,
  totalMarks,
  placedMarks,
  isComplete,
  isFinal,
}: {
  filled: number;
  needed: number;
  totalMarks?: number;
  placedMarks?: number;
  isComplete?: boolean;
  isFinal?: boolean;
}) {
  const hasMarks = totalMarks !== undefined && totalMarks > 0;
  const currentVal = hasMarks ? (placedMarks ?? 0) : filled;
  const targetVal = hasMarks ? totalMarks : needed;
  const pct = targetVal === 0 ? 0 : Math.min(100, Math.round((currentVal / targetVal) * 100));

  const ready = Boolean(isFinal || isComplete);
  const isImbalanced = !ready && !isFinal && (
    (hasMarks && (placedMarks ?? 0) >= totalMarks) || (needed > 0 && filled >= needed)
  );

  const barColor = ready
    ? "bg-emerald-500"
    : isImbalanced
    ? "bg-amber-500"
    : "bg-indigo-500";

  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          hasMarks
            ? `${placedMarks ?? 0} of ${totalMarks} marks placed (${filled}/${needed} questions)`
            : `${filled} of ${needed} questions placed`
        }
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs tabular-nums font-medium text-slate-700">
        {hasMarks ? `${placedMarks ?? 0}/${totalMarks}m` : `${filled}/${needed}`}
      </span>
    </div>
  );
}

export function PaperRow({
  p,
  onDelete,
  onDuplicate,
  currentUser,
  selected,
  onToggleSelect,
}: {
  p: PaperListItem;
  onDelete?: (p: PaperListItem) => void;
  onDuplicate?: (p: PaperListItem) => void;
  currentUser?: { id: string; role?: string } | null;
  selected?: boolean;
  onToggleSelect?: (p: PaperListItem) => void;
}) {
  const isFinal = p.status === "FINAL";
  const ready = isFinal || Boolean(p.isComplete);
  const totalMarks = p.totalMarks ?? 0;
  const placedMarks = p.placedMarks ?? 0;
  const hasMarks = totalMarks > 0;
  const isImbalanced = !ready && !isFinal && (
    (hasMarks && placedMarks >= totalMarks) || (p.needed > 0 && p.filled >= p.needed)
  );

  const examType = resolvePaperExamType(p);
  const isOwner = currentUser?.id && p.createdById ? p.createdById === currentUser.id : false;
  const isAdmin = currentUser?.role === "ADMIN";
  const isHod = currentUser?.role === "HOD";
  const canDelete = currentUser ? (isAdmin || ((isHod || isOwner) && p.status !== "FINAL")) : (p.status !== "FINAL");
  return (
    <li className={`group grid gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:items-center ${
      onToggleSelect ? "sm:grid-cols-[auto_minmax(0,1fr)_11rem_auto]" : "sm:grid-cols-[minmax(0,1fr)_11rem_auto]"
    } ${selected ? "bg-indigo-50/50" : ""}`}>
      {onToggleSelect && (
        <div className="flex items-center">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            checked={Boolean(selected)}
            onChange={() => onToggleSelect(p)}
            aria-label={`Select ${p.title}`}
          />
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/papers/${p.id}`} className="truncate font-semibold text-slate-900 hover:text-indigo-700">
            {p.title}
          </Link>
          <span className={`badge ${p.status === "FINAL" ? "badge-success" : ""}`}>{p.status === "FINAL" ? "Finalized" : "Draft"}</span>
          <span className="badge whitespace-nowrap">{EXAM_TYPE_LABEL[examType]}</span>
          {p.paperSet && <span className="badge badge-indigo">{p.paperSet}</span>}
          {p.academicSession && (
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 whitespace-nowrap">
              {p.academicSession}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {p.blueprint.book.className} {p.blueprint.book.subject} · {EXAM_TYPE_LABEL[examType]} Examination ·{" "}
          {p.layout === "BOOKLET_A4" ? "A4 booklet (A5)" : p.layout === "BOOKLET" ? "A3 booklet (A4)" : "Single pages"} · edited {timeAgo(p.updatedAt)}
        </p>
      </div>
      <div className="min-w-0">
        <Progress
          filled={p.filled}
          needed={p.needed}
          totalMarks={p.totalMarks}
          placedMarks={p.placedMarks}
          isComplete={p.isComplete}
          isFinal={isFinal}
        />
        <p className={`mt-0.5 text-xs truncate ${
          ready
            ? "font-medium text-emerald-700"
            : isImbalanced
            ? "font-medium text-amber-700"
            : "text-slate-500"
        }`}>
          {ready
            ? (isFinal ? "Ready to print" : "✓ Quotas met, ready to finalize")
            : isImbalanced
            ? "⚠ Blueprint quota mismatch"
            : hasMarks
            ? p.needed > p.filled
              ? `${totalMarks - placedMarks}m left (${p.needed - p.filled} slots)`
              : `${totalMarks - placedMarks}m remaining`
            : `${plural(p.needed - p.filled, "slot")} to fill`}
        </p>
      </div>
      <div className="flex items-center gap-1.5 sm:justify-end">
        <Link href={`/papers/${p.id}`} className="btn btn-sm">
          Open
        </Link>
        <Link href={`/papers/${p.id}/print`} target="_blank" className="btn btn-sm btn-ghost btn-icon" title="Print preview" aria-label={`Print preview for ${p.title}`}>
          <Printer size={15} />
        </Link>
        <Link href={`/papers/${p.id}/solutions`} target="_blank" className="btn btn-sm btn-ghost btn-icon" title="Marking scheme" aria-label={`Marking scheme for ${p.title}`}>
          <KeyRound size={15} />
        </Link>
        {onDuplicate && (
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-icon text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title="Duplicate paper as draft"
            aria-label={`Duplicate ${p.title}`}
            onClick={() => onDuplicate(p)}
          >
            <Copy size={15} />
          </button>
        )}
        {onDelete && canDelete && (
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-icon text-slate-500 hover:bg-red-50 hover:text-red-700"
            title="Delete paper"
            aria-label={`Delete ${p.title}`}
            onClick={() => onDelete(p)}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </li>
  );
}
