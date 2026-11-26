"use client";

import { useMemo, useState } from "react";
import { daysUntil, monthGrid, todayIST } from "@/lib/exams/dates";
import { shortClassLabel } from "@/lib/exams/labels";
import { dayRollups, examSummary } from "@/lib/exams/status";
import type { DayRollup, ExamView } from "@/lib/exams/types";
import { DayPanel } from "./DayPanel";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function summaryLine(s: ReturnType<typeof examSummary>): string {
  if (s.total === 0) return "No papers scheduled yet";
  const head = `${s.ready} of ${s.total} papers ready · ${s.printed} printed`;
  if (s.isPast) return `${head} · Exam finished`;
  if (s.daysToFirst !== null && s.daysToFirst > 0) return `${head} · first exam in ${s.daysToFirst} day${s.daysToFirst === 1 ? "" : "s"}`;
  return `${head} · exam in progress`;
}

function Bar({ d }: { d: DayRollup }) {
  if (!d.total) return null;
  const w = (n: number) => `${(n / d.total) * 100}%`;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden>
      <span className="bg-emerald-500" style={{ width: w(d.printed) }} />
      <span className="bg-amber-400" style={{ width: w(d.finalNotPrinted) }} />
      <span className={d.urgent ? "bg-rose-400" : "bg-slate-300"} style={{ width: w(d.notReady) }} />
    </div>
  );
}

export function ExamCalendar({ exam, onChange, onEditSheet }: { exam: ExamView; onChange: (v: ExamView) => void; onEditSheet: () => void }) {
  const today = todayIST();
  const [blockFilter, setBlockFilter] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string[]>([]);
  const [openDate, setOpenDate] = useState<string | null>(null);

  const blocks = useMemo(() => [...exam.blocks].sort((a, b) => a.position - b.position), [exam.blocks]);
  const allClasses = useMemo(() => blocks.flatMap((b) => b.classes), [blocks]);
  const slots = useMemo(
    () => exam.slots.filter((s) => (!blockFilter.length || blockFilter.includes(s.blockId)) && (!classFilter.length || classFilter.includes(s.className))),
    [exam.slots, blockFilter, classFilter],
  );
  const rollups = useMemo(() => new Map(dayRollups(slots, today).map((d) => [d.date, d])), [slots, today]);
  const summary = examSummary(slots, today);
  const months = monthGrid(exam.slots.map((s) => s.examDate));

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const chip = (on: boolean) => `rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${on ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"}`;

  if (exam.slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-600">No papers scheduled yet. Build the date sheet and the calendar fills in.</p>
        <button type="button" className="btn btn-primary mt-3" onClick={onEditSheet}>
          Build date sheet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-800">{summaryLine(summary)}</p>

      <div className="flex flex-wrap gap-1.5">
        {blocks.length > 1 &&
          blocks.map((b) => (
            <button key={b.id} type="button" className={chip(blockFilter.includes(b.id))} aria-pressed={blockFilter.includes(b.id)} onClick={() => toggle(blockFilter, setBlockFilter, b.id)}>
              {b.title}
            </button>
          ))}
        {allClasses.length > 1 && <span className="mx-1 w-px self-stretch bg-slate-200" />}
        {allClasses.length > 1 &&
          allClasses.map((c) => (
            <button key={c} type="button" className={chip(classFilter.includes(c))} aria-pressed={classFilter.includes(c)} onClick={() => toggle(classFilter, setClassFilter, c)}>
              {shortClassLabel(c)}
            </button>
          ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-emerald-500" /> Printed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-amber-400" /> Final, not printed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-slate-300" /> Not ready</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-rose-400" /> Not ready, within 3 days</span>
      </div>

      {months.map((m) => (
        <section key={m.month} className="card overflow-hidden">
          <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-2 font-display text-sm font-semibold text-slate-800">{m.month}</h3>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {WEEK.map((w) => (
              <div key={w} className="py-1.5">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {m.weeks.flat().map((date, i) => {
              if (!date) return <div key={`x${i}`} className="min-h-[68px] bg-slate-50" />;
              const d = rollups.get(date);
              const isToday = date === today;
              const past = daysUntil(date, today) < 0;
              const day = Number(date.slice(8));
              if (!d) {
                return (
                  <div key={date} className={`min-h-[68px] bg-white p-1.5 text-left text-xs ${past ? "text-slate-300" : "text-slate-400"} ${isToday ? "ring-2 ring-inset ring-indigo-400" : ""}`}>
                    {day}
                  </div>
                );
              }
              const ready = d.printed + d.finalNotPrinted;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setOpenDate(date)}
                  className={`flex min-h-[68px] flex-col gap-1 bg-white p-1.5 text-left transition hover:bg-indigo-50 ${d.urgent ? "ring-2 ring-inset ring-rose-400" : isToday ? "ring-2 ring-inset ring-indigo-400" : ""} ${past ? "opacity-70" : ""}`}
                  aria-label={`${date}: ${ready} of ${d.total} ready, ${d.printed} printed`}
                >
                  <span className="text-xs font-bold text-slate-900">{day}</span>
                  <Bar d={d} />
                  <span className={`text-[11px] font-medium ${ready === d.total ? "text-emerald-700" : d.urgent ? "text-rose-700" : "text-slate-600"}`}>
                    {ready === d.total ? `${d.total}/${d.total} ✓` : `${ready}/${d.total} ready`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {openDate && <DayPanel exam={exam} date={openDate} slots={slots.filter((s) => s.examDate === openDate)} onChange={onChange} onClose={() => setOpenDate(null)} />}
    </div>
  );
}
