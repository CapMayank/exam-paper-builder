"use client";

import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { SIMILAR_OPEN } from "@/lib/questionSimilarity";
import { usageTag } from "@/lib/similarQuestionsClient";
import type { QuestionDto } from "@/lib/types";
import { QuestionView } from "./QuestionView";
import type { CurrentPaperContext } from "./QuestionUsageHistory";
import type { SimilarMatch } from "./useSimilarQuestions";
import { Spinner } from "./ui";

export type SimilarQuestionsPanelProps = {
  matches: SimilarMatch[];
  best: number;
  paperContext?: CurrentPaperContext | null;
  onUseExisting?: (q: QuestionDto) => Promise<unknown> | void;
  blockedReason?: (q: QuestionDto) => string | null;
};

/**
 * Quiet inline panel displaying up to 3 close matches from the same book's question bank.
 * Hidden when `matches` is empty; collapsed when `best < SIMILAR_OPEN`; expanded otherwise.
 */
export function SimilarQuestionsPanel(props: SimilarQuestionsPanelProps) {
  if (props.matches.length === 0) return null;
  return <SimilarQuestionsPanelContent {...props} />;
}

function SimilarQuestionsPanelContent({
  matches,
  best,
  paperContext,
  onUseExisting,
  blockedReason,
}: SimilarQuestionsPanelProps) {
  const autoOpen = best >= SIMILAR_OPEN;
  // Remember manual collapse/expand per auto-open state; unmounting when matches empty resets it.
  const [override, setOverride] = useState<{ autoOpen: boolean; open: boolean } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOpen = override && override.autoOpen === autoOpen ? override.open : autoOpen;
  const count = matches.length;
  const summaryLabel = `${count} similar ${count === 1 ? "question" : "questions"} in the bank`;

  async function handleUseExisting(q: QuestionDto) {
    if (!onUseExisting || pendingId !== null) return;
    setPendingId(q.id);
    setActionError(null);
    try {
      await onUseExisting(q);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not use this question.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section
      aria-label="Similar questions in bank"
      className="rounded-xl border border-amber-200 bg-amber-50/40 text-xs"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setOverride({ autoOpen, open: !isOpen })}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-amber-950 transition hover:bg-amber-50/80"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {isOpen ? (
            <ChevronDown size={14} className="shrink-0 text-amber-700" aria-hidden />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-amber-700" aria-hidden />
          )}
          <span className="font-semibold">{isOpen ? "Similar in bank" : summaryLabel}</span>
          {isOpen && <span className="font-normal text-amber-800/80">· {summaryLabel}</span>}
        </span>
        <span className="shrink-0 text-[11px] font-medium text-amber-800">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2 border-t border-amber-200/70 p-2.5">
          {actionError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800">
              {actionError}
            </div>
          )}
          <ul className="space-y-2">
            {matches.map(({ question, score }) => {
              const tag = usageTag(question, paperContext);
              const reason = blockedReason ? blockedReason(question) : null;
              const pct = Math.round(score * 100);
              const isPending = pendingId === question.id;

              return (
                <li
                  key={question.id}
                  className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-2xs"
                >
                  <div className="paper-font min-w-0 text-sm leading-relaxed text-slate-900">
                    <QuestionView q={question} compact />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {question.chapter && (
                        <span
                          className="badge !bg-slate-100 font-medium text-slate-700"
                          title={question.chapter.title}
                        >
                          Ch {question.chapter.number}
                        </span>
                      )}
                      <span className="badge font-semibold">{pct}% similar</span>
                      {tag && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            tag.tone === "red"
                              ? "border-red-200 bg-red-50 text-red-800"
                              : "border-amber-200 bg-amber-50 text-amber-900"
                          }`}
                        >
                          <AlertTriangle
                            size={11}
                            className={`shrink-0 ${tag.tone === "red" ? "text-red-600" : "text-amber-600"}`}
                            aria-hidden
                          />
                          {tag.label}
                        </span>
                      )}
                    </div>

                    {(reason || onUseExisting) && (
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        {reason && <span className="text-[11px] text-slate-500">{reason}</span>}
                        {onUseExisting && (
                          <button
                            type="button"
                            disabled={Boolean(reason) || pendingId !== null}
                            title={reason ?? undefined}
                            onClick={() => void handleUseExisting(question)}
                            className="btn btn-sm border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900"
                          >
                            {isPending && <Spinner size={12} />}
                            Use this instead
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
