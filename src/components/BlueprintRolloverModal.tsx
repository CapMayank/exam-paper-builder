"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckSquare, Copy, Filter, RotateCcw, Ruler, Square, Tag } from "lucide-react";
import { Modal, Spinner, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { blueprintTotalMarks } from "@/lib/blueprint";
import { EXAM_TYPE_LABEL, type ExamType } from "@/lib/constants";
import type { Blueprint } from "@/lib/types";

interface BlueprintRolloverModalProps {
  onClose: () => void;
  onSuccess: () => void;
  currentSession: string;
  availableSessions: string[];
}

export function BlueprintRolloverModal({
  onClose,
  onSuccess,
  currentSession,
  availableSessions,
}: BlueprintRolloverModalProps) {
  const toast = useToast();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default target session: if current is 2025-26, default target is 2026-27 or current
  const [targetSession, setTargetSession] = useState<string>(() => {
    // If there is a session newer than currentSession in availableSessions, use that; else currentSession
    const nextSess = availableSessions.find((s) => s > currentSession) || currentSession;
    return nextSess;
  });
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api<Blueprint[]>("/api/blueprints")
      .then((data) => {
        setBlueprints(data);
        // By default, pre-select all blueprints if any
        setSelectedIds(new Set(data.map((b) => b.id)));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const filteredBlueprints = blueprints.filter((b) => {
    if (sourceFilter === "ALL") return true;
    return (b.academicSession || "2025–26") === sourceFilter;
  });

  const allFilteredSelected =
    filteredBlueprints.length > 0 && filteredBlueprints.every((b) => selectedIds.has(b.id));

  function toggleAll() {
    if (allFilteredSelected) {
      const next = new Set(selectedIds);
      filteredBlueprints.forEach((b) => next.delete(b.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredBlueprints.forEach((b) => next.add(b.id));
      setSelectedIds(next);
    }
  }

  function toggleBlueprint(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleRollover() {
    if (selectedIds.size === 0) {
      setError("Please select at least one blueprint to roll over.");
      return;
    }
    if (!targetSession.trim()) {
      setError("Please enter or select a valid target academic session.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await api<{ count: number; targetAcademicSession: string }>("/api/blueprints/rollover", {
        method: "POST",
        json: {
          sourceBlueprintIds: Array.from(selectedIds),
          targetAcademicSession: targetSession,
        },
      });

      toast.success(`Successfully rolled over ${result.count} blueprint(s) into Session ${result.targetAcademicSession}!`);
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Import &amp; Rollover Blueprints from Previous Session" onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Header explanation banner */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-900 flex items-start gap-3">
          <RotateCcw size={18} className="text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-indigo-950 text-sm">Carry forward exam blueprints to a new academic session</p>
            <p className="text-indigo-800/90 leading-relaxed">
              When transitioning to a new academic year (e.g. <strong>{targetSession}</strong>), this tool copies your chapter mark allocations, section formats, and question distributions into the new session. You can review and adjust quotas at any time without altering your previous year&apos;s exam archives.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-medium">
            {error}
          </div>
        )}

        {/* Source & Target Session Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Source Blueprints Filter
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="input input-sm w-full text-xs"
            >
              <option value="ALL">All Sessions ({blueprints.length} blueprints)</option>
              {availableSessions.map((s) => (
                <option key={s} value={s}>
                  Session {s} ({blueprints.filter((b) => (b.academicSession || "2025–26") === s).length})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Academic Session
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={targetSession}
                onChange={(e) => setTargetSession(e.target.value)}
                placeholder="e.g. 2026–27"
                className="input input-sm flex-1 text-xs font-semibold text-indigo-900"
              />
              <select
                value={targetSession}
                onChange={(e) => setTargetSession(e.target.value)}
                className="input input-sm w-32 text-xs"
              >
                {availableSessions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Blueprint selection list */}
        <div>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-700">
              Select Blueprints to Rollover ({selectedIds.size} of {filteredBlueprints.length} selected)
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900"
            >
              {allFilteredSelected ? <Square size={14} /> : <CheckSquare size={14} />}
              {allFilteredSelected ? "Deselect all" : "Select all"}
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <Spinner size={24} />
              <span className="text-xs">Loading blueprints...</span>
            </div>
          ) : filteredBlueprints.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No blueprints match the selected source session.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {filteredBlueprints.map((b) => {
                const selected = selectedIds.has(b.id);
                const marks = blueprintTotalMarks(b.sections);
                return (
                  <label
                    key={b.id}
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                      selected
                        ? "border-indigo-400 bg-indigo-50/40 ring-1 ring-indigo-400/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleBlueprint(b.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-semibold text-sm text-slate-900">{b.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="badge badge-sm">{b.academicSession || "2025–26"}</span>
                          <span className="badge badge-sm">{EXAM_TYPE_LABEL[b.examType as ExamType]}</span>
                          <span className="text-xs font-semibold text-indigo-700 tabular-nums">
                            {marks} marks
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>{b.book.className} · {b.book.subject} ({b.book.title})</span>
                        <span>·</span>
                        <span>{b.sections.length} sections</span>
                        <span>·</span>
                        <span>{b.durationMin} min</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal action bar */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-xs text-slate-500">
            Target Session: <strong className="text-indigo-900">{targetSession}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost text-xs">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRollover}
              disabled={busy || selectedIds.size === 0}
              className="btn btn-primary text-xs"
            >
              {busy ? (
                <>
                  <Spinner size={14} /> Rolling over...
                </>
              ) : (
                <>
                  <Copy size={14} /> Rollover {selectedIds.size} Blueprint{selectedIds.size === 1 ? "" : "s"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
