"use client";

import { CalendarDays, Copy, History, Lock, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ExamDetailsModal, type ExamDetails } from "@/components/exams/ExamDetailsModal";
import { SignatureCard } from "@/components/exams/SignatureCard";
import { useExamsGate } from "@/components/exams/useExamsGate";
import { EmptyState, ErrorBanner, ListSkeleton, PageHeader, useConfirm, useToast } from "@/components/ui";
import { normalizeSession, useAcademicSession } from "@/lib/academicSession";
import { api } from "@/lib/client";
import { EXAM_TYPE_LABEL, type ExamType } from "@/lib/constants";
import { formatDMY } from "@/lib/exams/dates";
import type { ExamListItem, ExamView } from "@/lib/exams/types";

function span(e: ExamListItem): string {
  const { firstDate, lastDate } = e.summary;
  if (!firstDate || !lastDate) return "No dates yet";
  return firstDate === lastDate ? formatDMY(firstDate) : `${formatDMY(firstDate)} – ${formatDMY(lastDate)}`;
}

function countdown(e: ExamListItem): string {
  const s = e.summary;
  if (s.total === 0) return "No papers scheduled yet";
  if (s.isPast) return "Exam finished";
  if (s.daysToFirst !== null && s.daysToFirst > 0) return `First exam in ${s.daysToFirst} day${s.daysToFirst === 1 ? "" : "s"}`;
  return "Exam in progress";
}

export default function ExamsPage() {
  const gate = useExamsGate();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { currentSession } = useAcademicSession();
  const [exams, setExams] = useState<ExamListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setExams(await api<ExamListItem[]>("/api/exams"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load exams");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount; state is set after the fetch resolves
    if (gate.state === "allowed") void load();
  }, [gate.state, load]);

  const openNew = () => setCreating(true);

  const create = async (form: ExamDetails) => {
    setBusy(true);
    try {
      const exam = await api<ExamView>("/api/exams", { method: "POST", json: form });
      router.push(`/exams/${exam.id}?tab=sheet`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the exam");
      setBusy(false);
    }
  };

  const copy = async (e: ExamListItem) => {
    try {
      const made = await api<{ id: string }>(`/api/exams/${e.id}/copy`, { method: "POST" });
      toast.success("Exam copied. Change the dates on its date sheet.");
      router.push(`/exams/${made.id}?tab=sheet`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy the exam");
    }
  };

  const remove = async (e: ExamListItem) => {
    const ok = await confirm({ title: `Delete “${e.name}”?`, message: "Its date sheet and printed marks are deleted. Papers stay as they are.", tone: "danger" });
    if (!ok) return;
    try {
      await api(`/api/exams/${e.id}`, { method: "DELETE" });
      setExams((all) => all?.filter((x) => x.id !== e.id) ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the exam");
    }
  };

  if (gate.state === "loading") return <ListSkeleton />;
  if (gate.state === "forbidden") return <EmptyState icon={Lock} title="You don't have access" description="Exams are managed by Admins and Exam Cell." />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarDays}
        title="Exams"
        description="Build each exam's date sheet, then follow every paper from draft to printed."
        actions={
          <>
            <Link href="/exams/audit" className="btn btn-ghost">
              <History size={15} /> Audit trail
            </Link>
            <button type="button" className="btn btn-primary" onClick={openNew}>
              <Plus size={15} /> New exam
            </button>
          </>
        }
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {exams === null ? (
        <ListSkeleton />
      ) : exams.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No exams yet"
          description="Create an exam, build its date sheet, and track its papers here."
          action={
            <button type="button" className="btn btn-primary" onClick={openNew}>
              <Plus size={15} /> New exam
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {exams.map((e) => {
            const s = e.summary;
            const pct = (n: number) => (s.total ? `${(n / s.total) * 100}%` : "0%");
            return (
              <li key={e.id} className={`card flex flex-col gap-3 p-4 ${s.isPast ? "opacity-75" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/exams/${e.id}`} className="min-w-0">
                    <h2 className="font-display text-base font-semibold text-slate-900 hover:text-indigo-700">{e.name}</h2>
                    <p className="text-xs text-slate-600">
                      {EXAM_TYPE_LABEL[e.examType as ExamType] ?? e.examType} · {e.academicSession} · {span(e)}
                    </p>
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${e.status === "CIRCULATED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {e.status === "CIRCULATED" ? "Circulated" : "Draft"}
                  </span>
                </div>
                <div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                    <span className="bg-emerald-500" style={{ width: pct(s.printed) }} />
                    <span className="bg-amber-400" style={{ width: pct(s.ready - s.printed) }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    {s.ready} of {s.total} papers ready · {s.printed} printed · {countdown(e)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link href={`/exams/${e.id}`} className="btn btn-secondary btn-sm">
                    Open
                  </Link>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(e)}>
                    <Copy size={14} /> Copy
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm text-red-700" onClick={() => remove(e)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {gate.isAdmin && <SignatureCard />}

      {creating && (
        <ExamDetailsModal
          title="New exam"
          initial={{ name: "", examType: "HALF_YEARLY", academicSession: normalizeSession(currentSession) }}
          saveLabel="Create and build date sheet"
          busy={busy}
          onClose={() => setCreating(false)}
          onSave={create}
        />
      )}
    </div>
  );
}
