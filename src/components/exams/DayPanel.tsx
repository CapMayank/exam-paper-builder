"use client";

import { ExternalLink, Printer, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { formatDMY, weekdayName } from "@/lib/exams/dates";
import { shortClassLabel } from "@/lib/exams/labels";
import type { ExamView, SlotView } from "@/lib/exams/types";
import { SLOT_WARNING_TEXT, SlotStatusBadge } from "./SlotStatusBadge";

/** One exam day's papers, grouped by block: status, open, print, and the printed switch. */
export function DayPanel({ exam, date, slots, onChange, onClose }: { exam: ExamView; date: string; slots: SlotView[]; onChange: (v: ExamView) => void; onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setPrinted = async (s: SlotView, printed: boolean) => {
    setBusy(s.id);
    try {
      onChange(await api<ExamView>(`/api/exams/${exam.id}/slots/${s.id}`, { method: "PATCH", json: { printed } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(null);
    }
  };

  const blocks = [...exam.blocks].sort((a, b) => a.position - b.position);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-900/30 sm:items-stretch" onClick={onClose}>
      <aside
        role="dialog"
        aria-label={`Papers on ${formatDMY(date)}`}
        className="anim-fade flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-none sm:w-[420px] sm:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">{weekdayName(date)}, {formatDMY(date)}</h2>
            <p className="text-xs text-slate-600">{slots.length} paper{slots.length === 1 ? "" : "s"}</p>
          </div>
          <button type="button" className="btn btn-icon btn-ghost" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {blocks.map((b) => {
            const mine = slots.filter((s) => s.blockId === b.id).sort((x, y) => b.classes.indexOf(x.className) - b.classes.indexOf(y.className));
            if (!mine.length) return null;
            return (
              <section key={b.id} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {b.title} · {b.timeText}
                </h3>
                <ul className="space-y-2">
                  {mine.map((s) => (
                    <li key={s.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {shortClassLabel(s.className)} · {s.subject}
                          </p>
                          <p className="truncate text-xs text-slate-500">{s.paper ? s.paper.title : "No paper linked"}</p>
                        </div>
                        <SlotStatusBadge status={s.status} warnings={s.warnings} />
                      </div>
                      {s.warnings.map((w) => (
                        <p key={w} className="mt-1 text-xs text-amber-700">
                          {SLOT_WARNING_TEXT[w]}
                        </p>
                      ))}
                      {s.printedAt && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Printed {new Date(s.printedAt).toLocaleDateString("en-GB")}
                          {s.printedByName ? ` by ${s.printedByName}` : ""}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {s.paper && (
                          <>
                            <Link href={`/papers/${s.paper.id}`} className="btn btn-ghost btn-sm">
                              <ExternalLink size={13} /> Open paper
                            </Link>
                            <Link href={`/papers/${s.paper.id}/print`} className="btn btn-ghost btn-sm" target="_blank">
                              <Printer size={13} /> Print
                            </Link>
                          </>
                        )}
                        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-emerald-600"
                            checked={!!s.printedAt}
                            disabled={busy === s.id}
                            onChange={(e) => setPrinted(s, e.target.checked)}
                          />
                          Printed
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
