"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Printer } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { daysUntil, monthGrid, shortDateLabel, todayIST } from "@/lib/exams/dates";
import { shortClassLabel } from "@/lib/exams/labels";
import { dayRollups, examSummary } from "@/lib/exams/status";
import type { DayRollup, ExamView, SlotView } from "@/lib/exams/types";
import { DayPanel } from "./DayPanel";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const READY = new Set(["FINAL", "PRINTED"]);

function Bar({ d }: { d: DayRollup }) {
  if (!d.total) return null;
  const w = (n: number) => `${(n / d.total) * 100}%`;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
      <span className="bg-emerald-500" style={{ width: w(d.printed) }} />
      <span className="bg-amber-400" style={{ width: w(d.finalNotPrinted) }} />
      <span className={d.urgent ? "bg-rose-400" : "bg-slate-300"} style={{ width: w(d.notReady) }} />
    </div>
  );
}

function Stat({ icon, label, value, sub, tone = "slate" }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: "slate" | "emerald" | "amber" | "rose" | "indigo" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="font-display text-xl font-bold leading-tight text-slate-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function countdown(s: ReturnType<typeof examSummary>): { value: string; sub: string } {
  if (s.total === 0) return { value: "—", sub: "Nothing scheduled" };
  if (s.isPast) return { value: "Done", sub: "Exam finished" };
  if (s.daysToFirst !== null && s.daysToFirst > 0) return { value: `${s.daysToFirst} day${s.daysToFirst === 1 ? "" : "s"}`, sub: s.firstDate ? `First paper ${shortDateLabel(s.firstDate)}` : "" };
  return { value: "Ongoing", sub: s.lastDate ? `Ends ${shortDateLabel(s.lastDate)}` : "Exam in progress" };
}

/** The exam at a glance: how many papers are ready, a month view of every exam day, and what still needs work soon. */
export function ExamCalendar({ exam, isAdmin, onChange, onEditSheet }: { exam: ExamView; isAdmin: boolean; onChange: (v: ExamView) => void; onEditSheet: () => void }) {
  const today = todayIST();
  const [blockFilter, setBlockFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [openDate, setOpenDate] = useState<string | null>(null);

  const blocks = useMemo(() => [...exam.blocks].sort((a, b) => a.position - b.position), [exam.blocks]);
  const classOptions = useMemo(() => (blockFilter ? blocks.filter((b) => b.id === blockFilter) : blocks).flatMap((b) => b.classes), [blocks, blockFilter]);
  const slots = useMemo(
    () => exam.slots.filter((s) => (!blockFilter || s.blockId === blockFilter) && (!classFilter || s.className === classFilter)),
    [exam.slots, blockFilter, classFilter],
  );
  const rollups = useMemo(() => new Map(dayRollups(slots, today).map((d) => [d.date, d])), [slots, today]);
  const summary = examSummary(slots, today);
  const months = monthGrid(exam.slots.map((s) => s.examDate));

  // upcoming papers that are not final yet, soonest first: the to-do list for the exam cell
  const pending = useMemo(
    () =>
      slots
        .filter((s) => daysUntil(s.examDate, today) >= 0 && (!READY.has(s.status) || s.warnings.length))
        .sort((a, b) => a.examDate.localeCompare(b.examDate) || a.className.localeCompare(b.className, undefined, { numeric: true })),
    [slots, today],
  );
  const pendingByDate = useMemo(() => {
    const m = new Map<string, SlotView[]>();
    for (const s of pending) m.set(s.examDate, [...(m.get(s.examDate) ?? []), s]);
    return [...m.entries()];
  }, [pending]);
  const urgent = pending.filter((s) => daysUntil(s.examDate, today) <= 3).length;

  if (exam.slots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <CalendarClock className="mx-auto text-slate-400" size={28} />
        <p className="mt-2 font-semibold text-slate-800">No papers scheduled yet</p>
        <p className="mt-1 text-sm text-slate-500">Build the date sheet and this calendar fills in with every exam day.</p>
        <button type="button" className="btn btn-primary mt-4" onClick={onEditSheet}>
          Build date sheet
        </button>
      </div>
    );
  }

  const cd = countdown(summary);
  const readyPct = summary.total ? Math.round((summary.ready / summary.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<CalendarClock size={18} />} tone="indigo" label="First exam in" value={cd.value} sub={cd.sub} />
        <Stat
          icon={<FileText size={18} />}
          tone="amber"
          label="Papers ready"
          value={
            <>
              {summary.ready}
              <span className="text-sm font-semibold text-slate-400"> / {summary.total}</span>
            </>
          }
          sub={`${readyPct}% final or printed`}
        />
        <Stat icon={<Printer size={18} />} tone="emerald" label="Printed" value={summary.printed} sub={`${summary.total - summary.printed} still to print`} />
        <Stat
          icon={urgent ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          tone={urgent ? "rose" : "emerald"}
          label="Due within 3 days"
          value={urgent}
          sub={urgent ? "papers not ready yet" : "Nothing urgent"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">
              {summary.ready} of {summary.total} papers ready · {summary.printed} printed
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {blocks.length > 1 && (
                <select
                  className="input w-auto py-1.5 text-sm"
                  aria-label="Filter by block"
                  value={blockFilter}
                  onChange={(e) => {
                    setBlockFilter(e.target.value);
                    setClassFilter("");
                  }}
                >
                  <option value="">All blocks</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              )}
              {classOptions.length > 1 && (
                <select className="input w-auto py-1.5 text-sm" aria-label="Filter by class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                  <option value="">All classes</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      {shortClassLabel(c)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {months.map((m) => (
            <section key={m.month} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <h3 className="border-b border-slate-200 px-4 py-2.5 font-display text-sm font-semibold text-slate-900">{m.month}</h3>
              <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {WEEK.map((w) => (
                  <div key={w} className="py-2">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-slate-100">
                {m.weeks.flat().map((date, i) => {
                  if (!date) return <div key={`x${i}`} className="min-h-[84px] bg-slate-50/60" />;
                  const d = rollups.get(date);
                  const isToday = date === today;
                  const past = daysUntil(date, today) < 0;
                  const sunday = i % 7 === 6;
                  const day = Number(date.slice(8));
                  const num = (
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${isToday ? "bg-indigo-600 text-white" : d ? "text-slate-900" : sunday ? "text-rose-300" : past ? "text-slate-300" : "text-slate-400"}`}
                    >
                      {day}
                    </span>
                  );
                  if (!d) {
                    return (
                      <div key={date} className={`min-h-[84px] p-1.5 ${sunday ? "bg-slate-50" : "bg-white"}`}>
                        {num}
                      </div>
                    );
                  }
                  const ready = d.printed + d.finalNotPrinted;
                  const allReady = ready === d.total;
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setOpenDate(date)}
                      className={`group flex min-h-[84px] flex-col gap-1.5 p-1.5 text-left transition ${allReady ? "bg-emerald-50/50" : d.urgent ? "bg-rose-50/60" : "bg-indigo-50/40"} hover:bg-indigo-100/60 ${past ? "opacity-60" : ""}`}
                      aria-label={`${date}: ${ready} of ${d.total} ready, ${d.printed} printed`}
                    >
                      <span className="flex items-center justify-between">
                        {num}
                        <span className="text-[11px] font-medium text-slate-500">
                          {d.total} paper{d.total === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="mt-auto space-y-1">
                        <Bar d={d} />
                        <span className={`block text-[11px] font-semibold ${allReady ? "text-emerald-700" : d.urgent ? "text-rose-700" : "text-slate-600"}`}>
                          {allReady ? "All ready ✓" : `${d.total - ready} not ready`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-emerald-500" /> Printed</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-amber-400" /> Final, not printed</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-slate-300" /> Not ready</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-rose-400" /> Not ready, within 3 days</span>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white xl:sticky xl:top-4">
          <h3 className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 font-display text-sm font-semibold text-slate-900">
            Coming up
            <span className="text-xs font-medium text-slate-500">{pending.length} to finish</span>
          </h3>
          {pendingByDate.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-6 text-sm text-emerald-700">
              <CheckCircle2 size={16} /> Every upcoming paper is final.
            </p>
          ) : (
            <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
              {pendingByDate.slice(0, 8).map(([date, list]) => {
                const days = daysUntil(date, today);
                return (
                  <li key={date}>
                    <button type="button" className="w-full px-4 py-2.5 text-left hover:bg-slate-50" onClick={() => setOpenDate(date)}>
                      <span className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{shortDateLabel(date)}</span>
                        <span className={`font-semibold ${days <= 3 ? "text-rose-600" : "text-slate-400"}`}>{days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`}</span>
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {list.slice(0, 6).map((s) => (
                          <span key={s.id} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700" title={`${s.className} · ${s.subject}`}>
                            {shortClassLabel(s.className)} {s.subject}
                          </span>
                        ))}
                        {list.length > 6 && <span className="px-1 py-0.5 text-[11px] text-slate-500">+{list.length - 6} more</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {pendingByDate.length > 8 && <li className="px-4 py-2 text-xs text-slate-500">+{pendingByDate.length - 8} more days with papers to finish</li>}
            </ul>
          )}
        </aside>
      </div>

      {openDate && <DayPanel exam={exam} isAdmin={isAdmin} date={openDate} slots={slots.filter((s) => s.examDate === openDate)} onChange={onChange} onClose={() => setOpenDate(null)} />}
    </div>
  );
}
