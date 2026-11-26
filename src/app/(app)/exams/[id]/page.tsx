"use client";

import { ArrowLeft, Lock, Pencil, Printer, Send, Undo2 } from "lucide-react";
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
const TABS: { id: Tab; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "calendar", label: "Calendar" },
  { id: "sheet", label: "Date sheet" },
];

export default function ExamPage({ params }: PageProps<"/exams/[id]">) {
  const { id } = use(params);
  const gate = useExamsGate();
  const toast = useToast();
  const confirm = useConfirm();
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

  return (
    <div className="space-y-5">
      <Link href="/exams" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={14} /> Exams
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h1 className="font-display text-lg font-bold text-slate-900 sm:text-2xl">{exam.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{EXAM_TYPE_LABEL[exam.examType as ExamType] ?? exam.examType}</span>
            <span aria-hidden>·</span>
            <span>Session {exam.academicSession}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${exam.status === "CIRCULATED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
            >
              {exam.status === "CIRCULATED" ? "Circulated" : "Draft"}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              <Pencil size={13} /> Edit details
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={toggleStatus}>
              {exam.status === "CIRCULATED" ? (
                <>
                  <Undo2 size={13} /> Back to draft
                </>
              ) : (
                <>
                  <Send size={13} /> Mark circulated
                </>
              )}
            </button>
          </div>
        </div>
        <Link href={`/exams/${id}/print`} className="btn btn-primary" target="_blank">
          <Printer size={15} /> Print date sheet
        </Link>
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
