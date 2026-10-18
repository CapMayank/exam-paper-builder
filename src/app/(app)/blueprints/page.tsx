"use client";

import { Calendar, Copy, Pencil, Plus, RotateCcw, Ruler, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorBanner, ListSkeleton, PageHeader, useConfirm, useToast } from "@/components/ui";
import { BlueprintRolloverModal } from "@/components/BlueprintRolloverModal";
import { useAcademicSession } from "@/lib/academicSession";
import { blueprintTotalMarks } from "@/lib/blueprint";
import { api } from "@/lib/client";
import { EXAM_TYPE_LABEL, type ExamType } from "@/lib/constants";
import { plural } from "@/lib/format";
import type { Blueprint } from "@/lib/types";

export default function BlueprintsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { currentSession, availableSessions } = useAcademicSession();
  const [items, setItems] = useState<Blueprint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string>("ALL");
  const [rolloverOpen, setRolloverOpen] = useState(false);

  const load = useCallback(
    () =>
      api<Blueprint[]>("/api/blueprints").then(setItems, (e) => setError(e.message)).finally(() => setLoaded(true)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const displayedItems = items.filter((b) => {
    if (sessionFilter === "ALL") return true;
    return (b.academicSession || "2025–26").replace(/-/g, "–") === sessionFilter;
  });

  async function remove(b: Blueprint) {
    const ok = await confirm({
      title: `Delete “${b.name}”?`,
      message:
        b._count.papers > 0
          ? `${plural(b._count.papers, "paper")} use this blueprint, so it can't be deleted until those papers are removed.`
          : "This can't be undone.",
      confirmLabel: "Delete blueprint",
      tone: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await api(`/api/blueprints/${b.id}`, { method: "DELETE" });
      toast.success(`Deleted “${b.name}”`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blueprints"
        description="A blueprint is the plan for a paper: its sections, how many questions each has, marks, and marks per chapter."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRolloverOpen(true)}
              className="btn btn-ghost border border-indigo-200 bg-indigo-50/50 text-indigo-900 hover:bg-indigo-100 hover:border-indigo-300"
              title="Import or clone blueprints from a previous academic session"
            >
              <RotateCcw size={16} className="text-indigo-600" /> Rollover from previous session
            </button>
            <Link
              href="/blueprints/new?import=true"
              className="btn btn-ghost border border-indigo-200 bg-indigo-50/50 text-indigo-900 hover:bg-indigo-100 hover:border-indigo-300"
              title="Import blueprint specification from JSON or CSV"
            >
              <Upload size={16} className="text-indigo-600" /> Import blueprint
            </Link>
            <Link href="/blueprints/new" className="btn btn-primary">
              <Plus size={16} /> New blueprint
            </Link>
          </div>
        }
      />

      {/* Academic Session Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar size={13} /> Session:
          </span>
          <button
            type="button"
            onClick={() => setSessionFilter("ALL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
              sessionFilter === "ALL"
                ? "bg-indigo-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Sessions ({items.length})
          </button>
          {availableSessions.map((sess) => {
            const count = items.filter((b) => (b.academicSession || "2025–26").replace(/-/g, "–") === sess).length;
            const active = sessionFilter === sess;
            return (
              <button
                key={sess}
                type="button"
                onClick={() => setSessionFilter(sess)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                  active
                    ? "bg-indigo-900 text-white shadow-sm"
                    : sess === currentSession
                    ? "bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sess} {count > 0 && <span className="opacity-75 font-normal">({count})</span>}
                {sess === currentSession && <span className="ml-1 text-[10px] text-amber-500 font-bold">●</span>}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{displayedItems.length}</strong> of {items.length} blueprints
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {!loaded ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="No blueprints yet"
          description="Create one to set question types, marks and chapter weightage. Papers are built from it."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link href="/blueprints/new" className="btn btn-primary">
                <Plus size={16} /> Create blueprint
              </Link>
              <Link href="/blueprints/new?import=true" className="btn btn-ghost border border-slate-200">
                <Upload size={16} /> Import blueprint
              </Link>
            </div>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr>
                  <th className="pl-4">Blueprint</th>
                  <th>Session</th>
                  <th>Class and subject</th>
                  <th>Term</th>
                  <th className="text-right">Marks</th>
                  <th>Sections</th>
                  <th>Papers</th>
                  <th className="pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((b) => (
                  <tr key={b.id}>
                    <td className="pl-4">
                      <Link href={`/blueprints/${b.id}`} className="font-semibold text-slate-900 hover:text-indigo-700">
                        {b.name}
                      </Link>
                      <div className="text-xs text-slate-500">{b.durationMin} min</div>
                    </td>
                    <td>
                      <span className="badge badge-amber font-mono font-medium whitespace-nowrap">
                        {b.academicSession || "2025–26"}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium text-slate-800">
                        {b.book.className} · {b.book.subject}
                      </span>
                      <div className="text-xs text-slate-500">{b.book.title}</div>
                    </td>
                    <td>
                      <span className="badge">{EXAM_TYPE_LABEL[b.examType as ExamType]}</span>
                    </td>
                    <td className="text-right font-semibold tabular-nums text-slate-900">{blueprintTotalMarks(b.sections)}</td>
                    <td className="tabular-nums text-slate-600">{b.sections.length}</td>
                    <td>
                      <span className={`badge ${b._count.papers ? "badge-indigo" : ""}`}>{b._count.papers}</span>
                    </td>
                    <td className="whitespace-nowrap pr-4 text-right">
                      <Link href={`/blueprints/${b.id}`} className="btn btn-sm btn-ghost" title="Edit blueprint">
                        <Pencil size={14} /> Edit
                      </Link>
                      <Link href={`/blueprints/new?from=${b.id}`} className="btn btn-sm btn-ghost" title="Duplicate blueprint">
                        <Copy size={14} /> Duplicate
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost btn-icon hover:bg-red-50 hover:text-red-700"
                        title="Delete blueprint"
                        aria-label={`Delete ${b.name}`}
                        onClick={() => remove(b)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rolloverOpen && (
        <BlueprintRolloverModal
          currentSession={currentSession}
          availableSessions={availableSessions}
          onClose={() => setRolloverOpen(false)}
          onSuccess={() => {
            setRolloverOpen(false);
            void load();
          }}
        />
      )}
    </div>
  );
}
