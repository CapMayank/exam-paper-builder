"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { MathText } from "@/components/MathText";
import type { KeyDisagreement } from "@/lib/answerKeyCheck";
import { api } from "@/lib/client";
import { checkedAnswerAsKey, dismissKeyDispute, KEY_DISPUTES_EVENT, loadKeyDisputes } from "@/lib/keyDisputes";
import type { PaperData } from "@/lib/types";

/**
 * Answer keys the independent check disagrees with, shown on the paper until the teacher accepts the checked
 * answer or keeps the key. A wrong key otherwise prints in the marking scheme with nothing to point at it.
 */
export function KeyDisputesBanner({
  paperId,
  canEdit,
  onPaper,
}: {
  paperId: string;
  canEdit: boolean;
  onPaper: (p: PaperData) => void;
}) {
  // the builder renders on the client after the paper loads, so stored disputes can be read up front
  const [disputes, setDisputes] = useState<KeyDisagreement[]>(() => loadKeyDisputes(paperId));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ paperId: string; list: KeyDisagreement[] }>).detail;
      if (detail?.paperId === paperId) setDisputes(detail.list);
    };
    window.addEventListener(KEY_DISPUTES_EVENT, onChange);
    return () => window.removeEventListener(KEY_DISPUTES_EVENT, onChange);
  }, [paperId]);

  if (disputes.length === 0) return null;

  async function acceptChecked(d: KeyDisagreement) {
    setBusyId(d.questionId);
    setError(null);
    try {
      await api(`/api/questions/${d.questionId}`, { method: "PATCH", json: { answer: checkedAnswerAsKey(d) } });
      onPaper(await api<PaperData>(`/api/papers/${paperId}`));
      setDisputes(dismissKeyDispute(paperId, d.questionId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      aria-label="Answer keys to review"
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-2xs space-y-2.5"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold">
            {disputes.length === 1 ? "1 answer key needs your review" : `${disputes.length} answer keys need your review`}
          </p>
          <p className="text-xs text-amber-900/80">
            A second, independent check solved {disputes.length === 1 ? "this question" : "these questions"} and got a different answer. Check
            which is right before you print the marking scheme.
          </p>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-red-700">{error}</p>}
      <ul className="space-y-2">
        {disputes.map((d) => (
          <li key={d.questionId} className="rounded-md border border-amber-200 bg-white px-3 py-2 text-xs">
            <div className="font-semibold text-slate-800">{d.label}</div>
            <div className="mt-0.5 text-slate-700 line-clamp-2">
              <MathText text={d.text} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Answer key: <strong className="text-slate-900">{d.storedAnswer}</strong>
              </span>
              <span>
                Check found: <strong className="text-amber-800">{checkedAnswerAsKey(d)}</strong>
              </span>
              {canEdit && (
                <span className="ml-auto flex gap-1.5">
                  <button
                    type="button"
                    className="btn btn-sm border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 font-semibold"
                    disabled={busyId !== null}
                    onClick={() => acceptChecked(d)}
                  >
                    {busyId === d.questionId ? "Saving…" : "Use checked answer"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    disabled={busyId !== null}
                    onClick={() => setDisputes(dismissKeyDispute(paperId, d.questionId))}
                  >
                    Keep key
                  </button>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
