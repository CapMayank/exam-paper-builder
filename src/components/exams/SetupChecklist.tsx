"use client";

import { ArrowRight, CalendarDays, FilePlus2, FileText, Printer, Ruler } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { EXAM_TYPE_LABEL, type ExamType } from "@/lib/constants";
import { shortClassLabel } from "@/lib/exams/labels";
import type { ExamView } from "@/lib/exams/types";

type Setup = { missingBlueprints: { bookId: string; className: string; subject: string }[]; noBook: { className: string; subject: string }[] };
type DraftResult = { created: number; skipped: { slotId: string; reason: string }[]; exam: ExamView };

function Step({ n, icon, title, done, total, children }: { n: number; icon: ReactNode; title: string; done: number; total: number; children?: ReactNode }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;
  return (
    <li className="card flex gap-4 p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${complete ? "bg-emerald-600 text-white" : "bg-indigo-50 text-indigo-700"}`}>
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900">
            {icon} {title}
          </h3>
          <span className="text-sm font-medium text-slate-600">
            {done} / {total}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className={`h-full ${complete ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
        </div>
        {children}
      </div>
    </li>
  );
}

function List({ items }: { items: { className: string; subject: string }[] }) {
  return (
    <details className="text-xs text-slate-600">
      <summary className="cursor-pointer select-none font-medium text-slate-700">Show which</summary>
      <p className="mt-1 leading-relaxed">{items.map((m) => `${shortClassLabel(m.className)} ${m.subject}`).join(" · ")}</p>
    </details>
  );
}

/** Date sheet → blueprints → papers → printing, with what is left at each step. */
export function SetupChecklist({ exam, isAdmin, onChange, onEditSheet }: { exam: ExamView; isAdmin: boolean; onChange: (v: ExamView) => void; onEditSheet: () => void }) {
  const toast = useToast();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);

  const load = useCallback(() => {
    api<Setup>(`/api/exams/${exam.id}/setup`).then(setSetup, (e) => toast.error(e instanceof Error ? e.message : "Could not check blueprints"));
  }, [exam.id, toast]);

  useEffect(() => {
     
    load();
  }, [load, exam.slots.length]);

  const slots = exam.slots;
  const total = slots.length;
  const withBlueprint = slots.filter((s) => s.hasBlueprint).length;
  const withPaper = slots.filter((s) => s.paper || s.status === "PRINTED").length;
  const final = slots.filter((s) => s.status === "FINAL" || s.status === "PRINTED").length;
  const printed = slots.filter((s) => s.status === "PRINTED").length;
  const missingDrafts = slots.filter((s) => s.status === "NO_PAPER").length;
  const blueprintLink = setup?.missingBlueprints.length
    ? `/blueprints/setup?${new URLSearchParams({ examType: exam.examType, session: exam.academicSession, books: setup.missingBlueprints.map((m) => m.bookId).join(",") })}`
    : null;

  const createDrafts = async () => {
    setBusy(true);
    try {
      const r = await api<DraftResult>(`/api/exams/${exam.id}/create-drafts`, { method: "POST", json: {} });
      onChange(r.exam);
      setSkipped([...new Set(r.skipped.map((s) => s.reason))]);
      toast.success(r.created ? `Created ${r.created} draft paper${r.created === 1 ? "" : "s"}, dated from the date sheet.` : "No drafts to create.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create drafts");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ol className="space-y-3">
      <Step n={1} icon={<CalendarDays size={16} />} title="Date sheet" done={total} total={total}>
        <p className="text-sm text-slate-600">
          {exam.blocks.length} block{exam.blocks.length === 1 ? "" : "s"}, {total} paper{total === 1 ? "" : "s"} scheduled.{" "}
          <button type="button" className="font-medium text-indigo-700 hover:underline" onClick={onEditSheet}>
            Edit date sheet
          </button>
        </p>
      </Step>

      <Step n={2} icon={<Ruler size={16} />} title="Blueprints" done={withBlueprint} total={total}>
        {setup === null ? (
          <p className="text-sm text-slate-500">Checking…</p>
        ) : (
          <div className="space-y-2 text-sm">
            {blueprintLink && (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-700">
                    {setup.missingBlueprints.length} subject{setup.missingBlueprints.length === 1 ? "" : "s"} still need a {EXAM_TYPE_LABEL[exam.examType as ExamType] ?? exam.examType} blueprint.
                  </span>
                  <Link href={blueprintLink} className="btn btn-secondary btn-sm">
                    Set up the missing ones <ArrowRight size={14} />
                  </Link>
                </div>
                <List items={setup.missingBlueprints} />
              </div>
            )}
            {setup.noBook.length > 0 && (
              <div className="space-y-1">
                <p className="text-amber-800">
                  {setup.noBook.length} subject{setup.noBook.length === 1 ? " has" : "s have"} no book in {exam.academicSession}. Add {setup.noBook.length === 1 ? "it" : "them"} in{" "}
                  <Link href="/books" className="font-medium underline">
                    Books &amp; syllabus
                  </Link>{" "}
                  first.
                </p>
                <List items={setup.noBook} />
              </div>
            )}
            {!blueprintLink && setup.noBook.length === 0 && total > 0 && <p className="text-emerald-700">Every scheduled subject has a blueprint.</p>}
          </div>
        )}
      </Step>

      <Step n={3} icon={<FileText size={16} />} title="Papers" done={final} total={total}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-700">
            {withPaper - final} draft{withPaper - final === 1 ? "" : "s"}, {final} final, {total - withPaper} without a paper.
          </span>
          {isAdmin && missingDrafts > 0 && (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={createDrafts}>
              <FilePlus2 size={14} /> Create {missingDrafts} missing draft{missingDrafts === 1 ? "" : "s"}
            </button>
          )}
        </div>
        {skipped.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-amber-800">
            {skipped.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </Step>

      <Step n={4} icon={<Printer size={16} />} title="Printing" done={printed} total={total}>
        <p className="text-sm text-slate-600">Mark papers printed from the calendar, or answer “Yes” after printing a paper.</p>
      </Step>
    </ol>
  );
}
