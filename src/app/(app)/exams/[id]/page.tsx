"use client";

import { ArrowLeft, CalendarDays, ListChecks, Lock, Pencil, Printer, Send, Table2, Undo2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { DateSheetBuilder } from "@/components/exams/DateSheetBuilder";
import { ExamDetailsModal, type ExamDetails } from "@/components/exams/ExamDetailsModal";
import { ExamCalendar } from "@/components/exams/ExamCalendar";
import { SetupChecklist } from "@/components/exams/SetupChecklist";
import { useExamsGate } from "@/components/exams/useExamsGate";
import { EmptyState, ErrorBanner, ListSkeleton, useConfirm, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { EXAM_TYPE_LABEL, type ExamType } from "@/lib/constants";
import type { ExamView } from "@/lib/exams/types";
import type { AcademicClassDto } from "@/lib/types";

type Tab = "setup" | "calendar" | "sheet";
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "sheet", label: "Date sheet", icon: Table2 },
  { id: "setup", label: "Checklist", icon: ListChecks },
];

export default function ExamPage({ params }: PageProps<"/exams/[id]">) {
  const { id } = use(params);
  const gate = useExamsGate();
  const toast = useToast();
  const confirm = useConfirm();
  const [exam, setExam] = useState<ExamView | null>(null);
  const [classes, setClasses] = useState<AcademicClassDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  // null until the exam loads (unless the URL names a tab)
  const [tab, setTabState] = useState<Tab | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the URL once on mount
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
      // picked once: an exam with papers opens on its calendar, an empty one on its date sheet
      setTabState((t) => t ?? (view.slots.length ? "calendar" : "sheet"));
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

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = async (patch: Partial<ExamDetails> & { status?: ExamView["status"] }): Promise<boolean> => {
    setSaving(true);
    try {
      setExam(await api<ExamView>(`/api/exams/${id}`, { method: "PATCH", json: patch }));
      if (patch.academicSession) void load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!exam) return;
    const toCirculated = exam.status === "DRAFT";
    const ok = await confirm(
      toCirculated
        ? { title: "Mark this date sheet circulated?", message: "It prints without the DRAFT watermark. Later changes show a reminder to recirculate.", confirmLabel: "Mark circulated" }
        : { title: "Move back to draft?", message: "The date sheet prints with a DRAFT watermark again.", confirmLabel: "Back to draft" },
    );
    if (ok) await update({ status: toCirculated ? "CIRCULATED" : "DRAFT" });
  };

  if (gate.state === "loading") return <ListSkeleton />;
  if (gate.state === "forbidden") return <EmptyState icon={Lock} title="You don't have access" description="Exams are managed by Admins and Exam Cell." />;
  if (error) return <ErrorBanner message={error} />;
  if (!exam) return <ListSkeleton />;

  const circulated = exam.status === "CIRCULATED";
  const current = tab ?? "calendar";

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <Link href="/exams" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={14} /> All exams
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">{exam.name}</h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${circulated ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${circulated ? "bg-emerald-500" : "bg-amber-500"}`} />
                {circulated ? "Circulated" : "Draft"}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {EXAM_TYPE_LABEL[exam.examType as ExamType] ?? exam.examType} · Session {exam.academicSession}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit details
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={toggleStatus}>
              {circulated ? (
                <>
                  <Undo2 size={14} /> Back to draft
                </>
              ) : (
                <>
                  <Send size={14} /> Mark circulated
                </>
              )}
            </button>
            <Link href={`/exams/${id}/print`} className="btn btn-primary btn-sm" target="_blank">
              <Printer size={14} /> Print date sheet
            </Link>
          </div>
        </div>
      </header>

      {editing && (
        <ExamDetailsModal
          title="Edit exam details"
          initial={{ name: exam.name, examType: exam.examType as ExamType, academicSession: exam.academicSession }}
          linkedPapers={exam.slots.filter((x) => x.paper).length}
          saveLabel="Save"
          busy={saving}
          onClose={() => setEditing(false)}
          onSave={async (d) => {
            const patch: Partial<ExamDetails> = {};
            if (d.name !== exam.name) patch.name = d.name;
            if (d.examType !== exam.examType) patch.examType = d.examType;
            if (d.academicSession !== exam.academicSession) patch.academicSession = d.academicSession;
            if (Object.keys(patch).length && (await update(patch))) setEditing(false);
            else if (!Object.keys(patch).length) setEditing(false);
          }}
        />
      )}

      <nav className="inline-flex rounded-xl bg-slate-100 p-1" aria-label="Exam views">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={current === t.id ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${current === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </nav>

      {current === "setup" && <SetupChecklist exam={exam} isAdmin={gate.isAdmin} onChange={setExam} onEditSheet={() => setTab("sheet")} />}
      {current === "calendar" && <ExamCalendar exam={exam} isAdmin={gate.isAdmin} onChange={setExam} onEditSheet={() => setTab("sheet")} />}
      {current === "sheet" && (
        <>
          {exam.status === "CIRCULATED" && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              This date sheet is already circulated. Reprint and recirculate it after making changes.
            </p>
          )}
          <DateSheetBuilder exam={exam} classes={classes} onChange={setExam} />
        </>
      )}
    </div>
  );
}
