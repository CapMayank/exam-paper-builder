"use client";

import {
  Clock,
  History,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import type { PaperData } from "@/lib/types";
import { useConfirm, useToast, Spinner } from "./ui";

export interface SnapshotItem {
  id: string;
  paperId: string;
  name: string;
  createdAt: string;
  createdById: string;
  createdByName: string;
  itemCount: number;
}

interface PaperSnapshotDrawerProps {
  isOpen: boolean;
  paperId: string;
  paperTitle: string;
  isFinalized: boolean;
  onClose: () => void;
  onRestore: (updatedPaper: PaperData) => void;
}

export function PaperSnapshotDrawer({
  isOpen,
  paperId,
  paperTitle,
  isFinalized,
  onClose,
  onRestore,
}: PaperSnapshotDrawerProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [newCheckpointName, setNewCheckpointName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<SnapshotItem[]>(`/api/papers/${paperId}/snapshots`);
      setSnapshots(data || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  useEffect(() => {
    if (isOpen) {
      void loadSnapshots();
    }
  }, [isOpen, loadSnapshots]);

  const handleCreateSnapshot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const name = newCheckpointName.trim() || undefined;
      await api(`/api/papers/${paperId}/snapshots`, {
        method: "POST",
        json: { name },
      });
      toast.success("Saved new version checkpoint.");
      setNewCheckpointName("");
      await loadSnapshots();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (snapshot: SnapshotItem) => {
    if (isFinalized) {
      toast.error("Cannot restore snapshots into a finalized exam paper. Unlock paper to Draft first.");
      return;
    }
    const ok = await confirm({
      title: `Restore Version "${snapshot.name}"?`,
      message: `This will restore the paper layout, questions, and section placements to how they were on ${new Date(snapshot.createdAt).toLocaleString()}. Any unsaved edits will be overwritten.`,
      confirmLabel: "Restore This Version",
      tone: "danger",
    });
    if (!ok) return;

    setRestoringId(snapshot.id);
    setError(null);
    try {
      const res = await api<{ success: boolean; message: string; paper: PaperData }>(
        `/api/papers/${paperId}/snapshots/${snapshot.id}/restore`,
        { method: "POST" }
      );
      toast.success(res.message);
      onRestore(res.paper);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (snapshot: SnapshotItem) => {
    const ok = await confirm({
      title: "Delete this snapshot?",
      message: `Are you sure you want to delete "${snapshot.name}"? This cannot be undone.`,
      confirmLabel: "Delete Snapshot",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await api(`/api/papers/${paperId}/snapshots/${snapshot.id}`, {
        method: "DELETE",
      });
      toast.success("Snapshot deleted.");
      await loadSnapshots();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-drawer-title"
    >
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <History size={18} />
            </div>
            <div>
              <h2 id="history-drawer-title" className="text-sm font-bold text-slate-900">
                Version History &amp; Snapshots
              </h2>
              <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                {paperTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            aria-label="Close Version History"
          >
            <X size={18} />
          </button>
        </div>

        {/* Create Checkpoint Form */}
        <div className="border-b border-slate-100 bg-indigo-50/40 p-4">
          <form onSubmit={handleCreateSnapshot} className="space-y-2">
            <label htmlFor="checkpoint-name-input" className="block text-xs font-semibold text-slate-700">
              Create Manual Checkpoint
            </label>
            <div className="flex gap-2">
              <input
                id="checkpoint-name-input"
                type="text"
                placeholder="e.g. Draft before replacing Section B"
                value={newCheckpointName}
                onChange={(e) => setNewCheckpointName(e.target.value)}
                disabled={creating}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={creating}
                className="btn btn-sm btn-primary inline-flex items-center gap-1 shrink-0 text-xs"
              >
                {creating ? <Spinner size={13} /> : <Plus size={13} />}
                <span>Save</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Checkpoints preserve complete question placements, instructions, and formatting.
            </p>
          </form>
        </div>

        {/* Snapshot List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Spinner size={20} />
              <p className="text-xs">Loading version checkpoints…</p>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-2">
              <History size={32} className="text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-medium text-slate-600">No version checkpoints yet</p>
              <p className="text-[11px] text-slate-400 max-w-[240px]">
                Create a checkpoint above or make major changes (Auto-fill, Reconcile) to create snapshots automatically.
              </p>
            </div>
          ) : (
            snapshots.map((s, idx) => {
              const isRestoring = restoringId === s.id;
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {s.name}
                        </span>
                        {idx === 0 && (
                          <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 uppercase tracking-wide">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          {timeAgo(s.createdAt)}
                        </span>
                        <span>•</span>
                        <span>{s.createdByName}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      className="text-slate-300 hover:text-rose-600 transition p-1"
                      title="Delete checkpoint"
                      aria-label="Delete checkpoint"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-600 inline-flex items-center gap-1 font-medium">
                      <FileText size={11} className="text-slate-400" />
                      {s.itemCount} Questions placed
                    </span>
                    <button
                      type="button"
                      disabled={isRestoring || isFinalized}
                      onClick={() => handleRestore(s)}
                      className="btn btn-xs btn-outline inline-flex items-center gap-1 text-slate-700 hover:text-indigo-700 hover:border-indigo-300 disabled:opacity-50"
                      title={isFinalized ? "Unlock paper to restore versions" : "Revert paper to this snapshot"}
                    >
                      {isRestoring ? (
                        <Spinner size={12} />
                      ) : (
                        <RotateCcw size={11} />
                      )}
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-3 text-center">
          <p className="text-[11px] text-slate-500">
            {snapshots.length} checkpoint{snapshots.length === 1 ? "" : "s"} saved for this examination paper.
          </p>
        </div>
      </div>
    </div>
  );
}
