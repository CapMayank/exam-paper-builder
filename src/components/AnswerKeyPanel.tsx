"use client";

import { CheckCircle2, CircleDashed, CircleSlash, KeyRound, Loader2, RefreshCw, Shuffle, Square, TriangleAlert } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { reportNeedsBalancing } from "@/lib/answerPositions";
import { answerKeyRows, paperPositionReport, type AnswerKeyRow } from "@/lib/answerKeyStatus";
import { QUESTION_TYPE_LABEL, type QuestionType } from "@/lib/constants";
import type { PaperData } from "@/lib/types";
import { Modal } from "./ui";

/** Questions sent per request: small enough to show steady progress, large enough not to waste calls. */
const BATCH = 4;

type RunState = { total: number; done: number; running: boolean; stopping: boolean };

const STATUS_STYLE: Record<AnswerKeyRow["status"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  answered: { label: "Answered", cls: "bg-emerald-50 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
  partial: { label: "Partly", cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: CircleDashed },
  missing: { label: "Missing", cls: "bg-red-50 text-red-800 border-red-200", Icon: CircleDashed },
  "not-needed": { label: "No key needed", cls: "bg-slate-50 text-slate-500 border-slate-200", Icon: CircleSlash },
};

/**
 * The paper's answer key at a glance: which questions have an answer, which do not, writing the missing ones with
 * AI in small steps (with progress, reasons for failures and a retry), and how the correct options are spread.
 */
export function AnswerKeyPanel({
  paper,
  canEdit,
  onPaper,
  onClose,
}: {
  paper: PaperData;
  canEdit: boolean;
  onPaper: (p: PaperData) => void;
  onClose: () => void;
}) {
  const rows = useMemo(() => answerKeyRows(paper), [paper]);
  const report = useMemo(() => paperPositionReport(paper), [paper]);
  const [run, setRun] = useState<RunState>({ total: 0, done: 0, running: false, stopping: false });
  const [failures, setFailures] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [balancing, setBalancing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const stopRef = useRef(false);

  const needed = rows.filter((r) => r.status !== "not-needed");
  const answered = needed.filter((r) => r.status === "answered").length;
  const pending = needed.filter((r) => r.status !== "answered");
  const finalised = paper.status === "FINAL";

  async function generate(ids: string[]) {
    if (ids.length === 0) return;
    setError(null);
    setNotice(null);
    stopRef.current = false;
    setRun({ total: ids.length, done: 0, running: true, stopping: false });
    const nextFailures = new Map(failures);
    for (const id of ids) nextFailures.delete(id);
    setFailures(new Map(nextFailures));
    const customKey = (() => {
      try {
        return localStorage.getItem("exam_gemini_api_key") || "";
      } catch {
        return "";
      }
    })();
    let rebalanced = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      if (stopRef.current) break;
      const batch = ids.slice(i, i + BATCH);
      try {
        const res = await fetch(`/api/papers/${paper.id}/answer-key`, {
          method: "POST",
          headers: { "content-type": "application/json", ...(customKey ? { "x-gemini-api-key": customKey } : {}) },
          body: JSON.stringify({ questionIds: batch }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Answer key generation failed");
        for (const f of (data.failed ?? []) as { id: string; reason: string }[]) nextFailures.set(f.id, f.reason);
        rebalanced += Number(data.rebalanced) || 0;
        if (data.paper) onPaper(data.paper as PaperData);
      } catch (e) {
        for (const id of batch) nextFailures.set(id, (e as Error).message);
      }
      setFailures(new Map(nextFailures));
      setRun((r) => ({ ...r, done: Math.min(r.total, i + batch.length) }));
    }
    setRun((r) => ({ ...r, running: false, stopping: false }));
    if (rebalanced > 0) setNotice(`Options of ${rebalanced} question${rebalanced === 1 ? "" : "s"} were rearranged to spread the correct answers.`);
  }

  async function balance() {
    setBalancing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/papers/${paper.id}/answer-positions`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not rearrange the options");
      if (data.paper) onPaper(data.paper as PaperData);
      const n = (data.changedQuestions ?? []).length;
      const shared = Number(data.skippedShared) || 0;
      setNotice(
        (n > 0 ? `Rearranged ${n} question${n === 1 ? "" : "s"}.` : "The answers were already spread well; nothing changed.") +
          (shared > 0 ? ` ${shared} question${shared === 1 ? " is" : "s are"} shared with other papers and kept as printed there.` : ""),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBalancing(false);
    }
  }

  const failedIds = [...failures.keys()].filter((id) => rows.some((r) => r.questionId === id && r.status !== "answered"));
  const pct = run.total > 0 ? Math.round((run.done / run.total) * 100) : 0;
  const spreadOff = reportNeedsBalancing(report);

  return (
    <Modal title="Answer key" subtitle={`${answered} of ${needed.length} questions answered`} onClose={onClose} wide preventClose={run.running}>
      <div className="space-y-4">
        {/* progress and actions */}
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" aria-label="Questions answered">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${needed.length ? (answered / needed.length) * 100 : 100}%` }} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && pending.length > 0 && !run.running && (
              <button type="button" className="btn btn-sm bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => generate(pending.map((r) => r.questionId))}>
                <KeyRound size={13} /> Write {pending.length} missing answer{pending.length === 1 ? "" : "s"} with AI
              </button>
            )}
            {canEdit && failedIds.length > 0 && !run.running && (
              <button type="button" className="btn btn-sm" onClick={() => generate(failedIds)}>
                <RefreshCw size={13} /> Retry {failedIds.length} failed
              </button>
            )}
            {run.running && (
              <>
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <Loader2 size={13} className="animate-spin" /> Writing answers… {run.done} of {run.total} ({pct}%)
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={run.stopping}
                  onClick={() => {
                    stopRef.current = true;
                    setRun((r) => ({ ...r, stopping: true }));
                  }}
                >
                  <Square size={12} /> {run.stopping ? "Stopping after this step…" : "Stop"}
                </button>
              </>
            )}
            {pending.length === 0 && <span className="text-xs font-medium text-emerald-700">Every question has an answer.</span>}
          </div>
          {run.running && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
          {error && <p className="text-xs text-red-700">{error}</p>}
          {notice && <p className="text-xs text-slate-700">{notice}</p>}
        </section>

        {/* where the correct options sit */}
        {(report.answered > 0 || report.matchOpposite > 0) && (
          <section className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">Correct options across the paper</span>
              {canEdit && !finalised && (
                <button type="button" className="btn btn-sm" disabled={balancing || run.running} onClick={balance} title="Reorder options so no letter dominates, none repeats three times running, and no match item sits opposite its match">
                  {balancing ? <Loader2 size={13} className="animate-spin" /> : <Shuffle size={13} />} Spread answers
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {report.counts.map((n, i) => (
                <span key={i} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
                  <b>({String.fromCharCode(97 + i)})</b> {n}
                </span>
              ))}
            </div>
            {spreadOff ? (
              <p className="flex items-start gap-1.5 text-xs text-amber-800">
                <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                <span>
                  {[
                    report.longestRun >= 3 ? `the same letter is correct ${report.longestRun} times in a row` : "",
                    report.matchOpposite > 0 ? `${report.matchOpposite} match question${report.matchOpposite === 1 ? " has" : "s have"} an item opposite its match` : "",
                    Math.max(...report.counts) > Math.ceil(report.answered / 4) + 1 ? "one letter is correct far more often than the others" : "",
                  ]
                    .filter(Boolean)
                    .join("; ")
                    .replace(/^./, (c) => c.toUpperCase())}
                  . Students could guess from the pattern.
                </span>
              </p>
            ) : (
              <p className="text-xs text-slate-500">Spread evenly. No pattern a student could use.</p>
            )}
          </section>
        )}

        {/* every question */}
        <section className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-2.5 py-2 font-semibold">Q</th>
                <th className="px-2.5 py-2 font-semibold">Type</th>
                <th className="px-2.5 py-2 font-semibold">Status</th>
                <th className="px-2.5 py-2 font-semibold">Answer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = STATUS_STYLE[r.status];
                const failure = failures.get(r.questionId);
                return (
                  <tr key={`${r.questionId}-${r.isOr ? "or" : "main"}`} className="border-t border-slate-100 align-top">
                    <td className="px-2.5 py-2 font-semibold whitespace-nowrap">
                      {r.label}
                      {r.isOr && <span className="ml-1 font-normal text-slate-500">(OR)</span>}
                    </td>
                    <td className="px-2.5 py-2 text-slate-600">{QUESTION_TYPE_LABEL[r.type as QuestionType] ?? r.type}</td>
                    <td className="px-2.5 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-medium ${s.cls}`}>
                        <s.Icon size={11} /> {s.label}
                      </span>
                      {r.status === "partial" && r.missingParts.length > 0 && (
                        <div className="mt-1 text-[11px] text-amber-800">No answer for {r.missingParts.join(", ")}</div>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-slate-700">
                      {r.preview || <span className="text-slate-400">—</span>}
                      {failure && r.status !== "answered" && <div className="mt-1 text-[11px] text-red-700">Not written: {failure}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </Modal>
  );
}
