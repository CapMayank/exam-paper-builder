"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Copy, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import type { QuestionDto } from "@/lib/types";
import { useConfirm, useToast, Spinner, Modal } from "./ui";
import { MathText } from "./MathText";

function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/\\[a-zA-Z]+/g, "") // strip latex macros
    .replace(/[^a-z0-9\s]/g, " ") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

function computeSimilarity(a: string, b: string): number {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const wordsA = new Set(normA.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(normB.split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }
  return (2.0 * common) / (wordsA.size + wordsB.size);
}

interface QuestionDuplicateModalProps {
  isOpen: boolean;
  questions: QuestionDto[];
  onClose: () => void;
  onQuestionDeleted?: () => void;
}

export function QuestionDuplicateModal({
  isOpen,
  questions,
  onClose,
  onQuestionDeleted,
}: QuestionDuplicateModalProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const duplicatePairs = useMemo(() => {
    if (!isOpen || questions.length < 2) return [];

    const pairs: Array<{
      q1: QuestionDto;
      q2: QuestionDto;
      similarity: number;
    }> = [];

    // Compare questions
    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const q1 = questions[i];
        const q2 = questions[j];

        // Same type makes them high candidate for duplicates
        if (q1.type !== q2.type) continue;

        const sim = computeSimilarity(q1.text, q2.text);
        if (sim >= 0.75) {
          pairs.push({
            q1,
            q2,
            similarity: Math.round(sim * 100),
          });
        }
      }
    }

    return pairs.sort((a, b) => b.similarity - a.similarity).slice(0, 50);
  }, [isOpen, questions]);

  if (!isOpen) return null;

  const handleDelete = async (q: QuestionDto) => {
    const ok = await confirm({
      title: "Delete duplicate question?",
      message: "Are you sure you want to permanently delete this duplicate question from the question bank?",
      confirmLabel: "Delete Question",
      tone: "danger",
    });
    if (!ok) return;

    setDeletingId(q.id);
    try {
      await api(`/api/questions/${q.id}`, { method: "DELETE" });
      toast.success("Duplicate question removed.");
      onQuestionDeleted?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      size="xl"
      title="🔍 Question Bank Duplicate Detector"
      subtitle={`Scanning ${questions.length} questions for near-identical wording across chapters`}
      onClose={onClose}
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
        {duplicatePairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 size={36} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800">No Duplicate Questions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Your question bank is clean. All {questions.length} questions have distinct phrasing and problem stems.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200 flex items-center justify-between">
              <span>
                Found <b>{duplicatePairs.length}</b> potential duplicate question pair(s). Compare them below and remove duplicates.
              </span>
            </div>

            {duplicatePairs.map((pair, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                      {pair.similarity}% Similar
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Type: {pair.q1.type}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Left: Question 1 */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Ch {pair.q1.chapter?.number || "?"}: {pair.q1.chapter?.title || "Chapter"}</span>
                        <span>{pair.q1.usages?.length || 0} Usages</span>
                      </div>
                      <div className="text-xs font-medium text-slate-900">
                        <MathText text={pair.q1.text} />
                      </div>
                      {pair.q1.answer && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50/70 px-2 py-1 rounded">
                          Ans: {pair.q1.answer}
                        </div>
                      )}
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={deletingId === pair.q1.id}
                        onClick={() => handleDelete(pair.q1)}
                        className="btn btn-xs btn-outline text-rose-700 hover:bg-rose-50 hover:border-rose-300 inline-flex items-center gap-1"
                      >
                        {deletingId === pair.q1.id ? <Spinner size={11} /> : <Trash2 size={11} />}
                        <span>Delete Q1</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Question 2 */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Ch {pair.q2.chapter?.number || "?"}: {pair.q2.chapter?.title || "Chapter"}</span>
                        <span>{pair.q2.usages?.length || 0} Usages</span>
                      </div>
                      <div className="text-xs font-medium text-slate-900">
                        <MathText text={pair.q2.text} />
                      </div>
                      {pair.q2.answer && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50/70 px-2 py-1 rounded">
                          Ans: {pair.q2.answer}
                        </div>
                      )}
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={deletingId === pair.q2.id}
                        onClick={() => handleDelete(pair.q2)}
                        className="btn btn-xs btn-outline text-rose-700 hover:bg-rose-50 hover:border-rose-300 inline-flex items-center gap-1"
                      >
                        {deletingId === pair.q2.id ? <Spinner size={11} /> : <Trash2 size={11} />}
                        <span>Delete Q2</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
