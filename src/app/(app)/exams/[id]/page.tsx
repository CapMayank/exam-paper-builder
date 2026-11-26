"use client";

import { ArrowLeft, Lock, Printer } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { DateSheetBuilder } from "@/components/exams/DateSheetBuilder";
import { ExamCalendar } from "@/components/exams/ExamCalendar";
import { SetupChecklist } from "@/components/exams/SetupChecklist";
import { useExamsGate } from "@/components/exams/useExamsGate";
import { EmptyState, ErrorBanner, ListSkeleton, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { EXAM_TYPE_LABEL, EXAM_TYPES, type ExamType } from "@/lib/constants";
import type { ExamView } from "@/lib/exams/types";
import type { AcademicClassDto } from "@/lib/types";

type Tab = "setup" | "calendar" | "sheet";
const TABS: { id: Tab; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "calendar", label: "Calendar" },
  { id: "sheet", label: "Date sheet" },
];

export default function ExamPage({ params }: PageProps<"/exams/[id]">) {
  const { id } = use(params);
  const gate = useExamsGate();
  const toast = useToast();
  const [exam, setExam] = useState<ExamView | null>(null);
  const [classes, setClasses] = useState<AcademicClassDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTabState] = useState<Tab>("calendar");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount; state is set after the fetch resolves
    if (t === "sheet" || t === "calendar" || t === "setup") setTabState(t);
  }, []);

  const setTab = (t: Tab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url);
  };

  const load = useCallback(async () => {
    try {
      const view = await api<ExamView>(`/api/exams/${id}`);
      setExam(view);
      const all = await api<AcademicClassDto[]>(`/api/classes?session=${encodeURIComponent(view.academicSession)}`);
      setClasses([...all].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, undefined, { numeric: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the exam");
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount; state is set after the fetch resolves
    if (gate.state === "allowed") void load();
  }, [gate.state, load]);

  const update = async (patch: Partial<Pick<ExamView, "name" | "examType" | "academicSession" | "status">>) => {
    try {
      setExam(await api<ExamView>(`/api/exams/${id}`, { method: "PATCH", json: patch }));
      if (patch.academicSession) void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  if (gate.state === "loading") return <ListSkeleton />;
  if (gate.state === "forbidden") return <EmptyState icon={Lock} title="You don't have access" description="Exams are managed by Admins and Exam Cell." />;
  if (error) return <ErrorBanner message={error} />;
  if (!exam) return <ListSkeleton />;

  return (
    <div className="space-y-5">
      <Link href="/exams" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={14} /> Exams
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <input
            key={exam.name}
            className="w-full bg-transparent font-display text-lg font-bold sm:text-2xl text-slate-900 outline-none focus:rounded focus:ring-2 focus:ring-indigo-300"
            defaultValue={exam.name}
            aria-label="Exam name"
            onBlur={(e) => e.target.value.trim() && e.target.value !== exam.name && update({ name: e.target.value.trim() })}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select className="input w-auto py-1 text-sm" value={exam.examType} aria-label="Exam type" onChange={(e) => update({ examType: e.target.value })}>
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXAM_TYPE_LABEL[t as ExamType]}
                </option>
              ))}
            </select>
            <input
              key={exam.academicSession}
              className="input w-28 py-1 text-sm"
              defaultValue={exam.academicSession}
              aria-label="Session"
              onBlur={(e) => e.target.value.trim() && e.target.value !== exam.academicSession && update({ academicSession: e.target.value.trim() })}
            />
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Date sheet status">
              {(["DRAFT", "CIRCULATED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={exam.status === s}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${exam.status === s ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"}`}
                  onClick={() => exam.status !== s && update({ status: s })}
                >
                  {s === "DRAFT" ? "Draft" : "Circulated"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Link href={`/exams/${id}/print`} className="btn btn-primary" target="_blank">
          <Printer size={15} /> Print date sheet
        </Link>
      </header>

      <nav className="flex gap-1 border-b border-slate-200" aria-label="Exam views">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${tab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:text-slate-900"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "setup" && <SetupChecklist exam={exam} isAdmin={gate.isAdmin} onChange={setExam} onEditSheet={() => setTab("sheet")} />}
      {tab === "calendar" && <ExamCalendar exam={exam} isAdmin={gate.isAdmin} onChange={setExam} onEditSheet={() => setTab("sheet")} />}
      {tab === "sheet" && (
        <>
          {exam.status === "CIRCULATED" && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Already circulated — reprint and recirculate the date sheet after changes.
            </p>
          )}
          <DateSheetBuilder exam={exam} classes={classes} onChange={setExam} />
        </>
      )}
    </div>
  );
}
