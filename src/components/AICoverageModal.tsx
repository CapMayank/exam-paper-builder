"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { ErrorBanner, Modal, Spinner } from "@/components/ui";
import { describeSkips, type CoverageReport } from "@/lib/aiCoverage";
import { api } from "@/lib/client";
import type { PaperData } from "@/lib/types";

type ApplyResult = { applied: string[]; skipped: Array<{ questionId: string; reason: string }>; paper: PaperData };

/**
 * The AI coverage check: asks the AI once which chapter each question tests, then shows the chapter-wise spread by
 * that reading next to the targets, and the questions where it disagrees with the stored chapter. Applying the
 * suggestions is optional and only changes the chapters of questions the user may edit.
 */
export function AICoverageModal({
  paper,
  canApply,
  onClose,
  onApplied,
}: {
  paper: PaperData;
  canApply: boolean;
  onClose: () => void;
  onApplied: (paper: PaperData) => void;
}) {
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [skipped, setSkipped] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const headers: Record<string, string> = {};
    try {
      const key = localStorage.getItem("exam_gemini_api_key");
      if (key) headers["x-gemini-api-key"] = key;
    } catch {
      /* storage blocked: the server's own key is used */
    }
    api<CoverageReport>(`/api/papers/${paper.id}/ai-coverage`, { method: "POST", headers }).then(
      (r) => {
        if (cancelled) return;
        setReport(r);
        setPicked(new Set(r.disagreements.map((d) => d.questionId)));
      },
      (e) => !cancelled && setError((e as Error).message),
    );
    return () => {
      cancelled = true;
    };
  }, [paper.id]);

  const chapterLabel = useMemo(() => {
    const byId = new Map(paper.blueprint.chapters.map((c) => [c.chapterId, c.chapter]));
    return (id: string) => {
      const ch = byId.get(id);
      return ch ? `Ch ${ch.number}` : "a chapter outside the blueprint";
    };
  }, [paper.blueprint.chapters]);

  async function apply() {
    if (!report) return;
    const changes = report.disagreements.filter((d) => picked.has(d.questionId)).map((d) => ({ questionId: d.questionId, chapterId: d.aiChapterId }));
    if (changes.length === 0) return;
    setApplying(true);
    setError(null);
    try {
      const res = await api<ApplyResult>(`/api/papers/${paper.id}/ai-coverage/apply`, { method: "POST", json: { changes } });
      onApplied(res.paper);
      setSkipped(describeSkips(res.skipped, report.disagreements));
      const done = new Set(res.applied);
      const refused = new Set(res.skipped.map((s) => s.questionId));
      setReport((r) => (r ? { ...r, disagreements: r.disagreements.filter((d) => !done.has(d.questionId)) } : r));
      // a refused change would be refused again, so it is no longer ticked
      setPicked((p) => new Set([...p].filter((q) => !done.has(q) && !refused.has(q))));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal
      title="Chapter coverage by AI"
      subtitle="The AI reads every question and says which chapter it tests. This is a second opinion: nothing changes unless you apply it."
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        {!report && !error && (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-600">
            <Spinner /> Reading the questions…
          </div>
        )}
        {report && (
          <>
            <div className="space-y-2">
              {report.spread.map((s) => (
                <div key={s.chapterId} className="flex items-center justify-between text-xs">
                  <span className="truncate pr-2 font-medium text-slate-700">{s.title}</span>
                  <span className={`shrink-0 font-mono ${Math.abs(s.aiMarks - s.target) > 1 ? "text-amber-700" : "text-slate-600"}`}>
                    {s.aiMarks} of {s.target}
                  </span>
                </div>
              ))}
            </div>
            {report.unclassified.length > 0 && (
              <p className="text-[11px] text-slate-500">
                The AI gave no usable chapter for question{report.unclassified.length === 1 ? "" : "s"} {report.unclassified.join(", ")}; they are counted under their stored chapter.
              </p>
            )}
            {report.disagreements.length === 0 ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                The AI agrees with the stored chapter of every question it could place.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-800">Where the AI disagrees</p>
                <ul className="space-y-1.5">
                  {report.disagreements.map((d) => (
                    <li key={d.questionId} className="flex items-center gap-2 text-xs text-slate-700">
                      {canApply && (
                        <input
                          type="checkbox"
                          aria-label={`Apply the change for question ${d.label}`}
                          checked={picked.has(d.questionId)}
                          onChange={() =>
                            setPicked((p) => {
                              const next = new Set(p);
                              if (next.has(d.questionId)) next.delete(d.questionId);
                              else next.add(d.questionId);
                              return next;
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      )}
                      <span>
                        Q{d.label}: stored {chapterLabel(d.storedChapterId)}, AI says {chapterLabel(d.aiChapterId)} ({d.confidence})
                        {d.preview && <span className="block truncate text-[11px] text-slate-500">{d.preview}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                {canApply && (
                  <div className="flex justify-end pt-1">
                    <button type="button" className="btn btn-primary btn-sm" disabled={applying || picked.size === 0} onClick={apply}>
                      {applying ? <Spinner size="sm" /> : <Sparkles size={13} />} Apply {picked.size} change{picked.size === 1 ? "" : "s"}
                    </button>
                  </div>
                )}
              </div>
            )}
            {skipped && skipped.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">{skipped.length} change{skipped.length === 1 ? " was" : "s were"} not applied:</p>
                <ul className="mt-1 list-disc pl-5">
                  {skipped.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
