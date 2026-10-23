"use client";

import { Check, CheckCircle2, Copy, ExternalLink, GitCompare, Layers, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MathText } from "@/components/MathText";
import { Modal } from "@/components/ui";
import { api } from "@/lib/client";
import { QUESTION_TYPE_LABEL } from "@/lib/constants";
import type { PaperData, PaperItem } from "@/lib/types";

interface PaperCompareModalProps {
  paperIdA: string;
  paperIdB: string;
  onClose: () => void;
}

export function PaperCompareModal({ paperIdA, paperIdB, onClose }: PaperCompareModalProps) {
  const [paperA, setPaperA] = useState<PaperData | null>(null);
  const [paperB, setPaperB] = useState<PaperData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterView, setFilterView] = useState<"ALL" | "COMMON" | "VARIANTS">("ALL");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api<PaperData>(`/api/papers/${paperIdA}`),
      api<PaperData>(`/api/papers/${paperIdB}`),
    ])
      .then(([a, b]) => {
        if (!mounted) return;
        setPaperA(a);
        setPaperB(b);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Failed to load papers for comparison.");
      })
      .finally(() => {
        if (mounted) setLoadingPlanFalse();
      });

    function setLoadingPlanFalse() {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [paperIdA, paperIdB]);

  // Comparison metrics
  const comparison = useMemo(() => {
    if (!paperA || !paperB) return null;

    const aQuestions = new Map<string, PaperItem>();
    const bQuestions = new Map<string, PaperItem>();

    for (const it of paperA.items) {
      aQuestions.set(it.question.id, it);
      if (it.orQuestion) aQuestions.set(it.orQuestion.id, it);
    }
    for (const it of paperB.items) {
      bQuestions.set(it.question.id, it);
      if (it.orQuestion) bQuestions.set(it.orQuestion.id, it);
    }

    const commonIds = new Set<string>();
    for (const id of aQuestions.keys()) {
      if (bQuestions.has(id)) {
        commonIds.add(id);
      }
    }

    const totalDistinctQuestions = new Set([...aQuestions.keys(), ...bQuestions.keys()]).size;
    const aTotal = paperA.items.length;
    const bTotal = paperB.items.length;
    const commonCount = commonIds.size;
    const maxItems = Math.max(aTotal, bTotal);
    const overlapPercentage = maxItems > 0 ? Math.round((commonCount / maxItems) * 100) : 0;

    return {
      commonIds,
      commonCount,
      aTotal,
      bTotal,
      totalDistinctQuestions,
      overlapPercentage,
      aUniqueCount: aTotal - commonCount,
      bUniqueCount: bTotal - commonCount,
    };
  }, [paperA, paperB]);

  return (
    <Modal
      title="Examination Set Comparison & Diff Tool"
      subtitle={
        paperA && paperB
          ? `Comparing: "${paperA.title}" vs "${paperB.title}"`
          : "Analyzing questions and weightage across examination sets..."
      }
      onClose={onClose}
      wide
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm font-semibold">Comparing examination blueprints and question pools...</p>
        </div>
      ) : error || !paperA || !paperB || !comparison ? (
        <div className="p-6 text-center text-sm text-red-600">
          {error || "Unable to load papers for comparison."}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top Overlap Metric Bar */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Target Set Overlap Analysis
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-indigo-950 font-display">
                    {comparison.overlapPercentage}%
                  </span>
                  <span className="text-xs text-indigo-800 font-medium">
                    ({comparison.commonCount} common questions / {Math.max(comparison.aTotal, comparison.bTotal)} maximum slots)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="rounded-lg bg-white border border-indigo-200 px-3 py-1.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {paperA.paperSet || "Set A"}
                  </div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {comparison.aTotal} questions · {comparison.aUniqueCount} unique
                  </div>
                </div>

                <div className="rounded-lg bg-white border border-indigo-200 px-3 py-1.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {paperB.paperSet || "Set B"}
                  </div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {comparison.bTotal} questions · {comparison.bUniqueCount} unique
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-100/80 border border-emerald-300 px-3 py-1.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Common Questions
                  </div>
                  <div className="font-bold text-emerald-950 mt-0.5">
                    {comparison.commonCount} shared across both
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterView("ALL")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  filterView === "ALL"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                All Questions ({comparison.totalDistinctQuestions})
              </button>
              <button
                type="button"
                onClick={() => setFilterView("COMMON")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  filterView === "COMMON"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                Common Questions Only ({comparison.commonCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterView("VARIANTS")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  filterView === "VARIANTS"
                    ? "bg-indigo-700 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                Variants &amp; Unique ({comparison.aUniqueCount + comparison.bUniqueCount})
              </button>
            </div>

            <div className="text-[11px] font-medium text-slate-500">
              Matching Blueprint: <strong>{paperA.blueprint.name}</strong>
            </div>
          </div>

          {/* Side-by-Side Section Question Matrix */}
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {paperA.blueprint.sections.map((section, sIdx) => {
              const aItems = paperA.items.filter((i) => i.sectionId === section.id);
              const bItems = paperB.items.filter((i) => i.sectionId === section.id);
              const maxRow = Math.max(aItems.length, bItems.length);
              if (maxRow === 0) return null;

              return (
                <div key={section.id} className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">
                        {sIdx + 1}
                      </span>
                      <span>{section.title}</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({QUESTION_TYPE_LABEL[section.type as keyof typeof QUESTION_TYPE_LABEL] || section.type} · {section.marksEach}m each)
                      </span>
                    </div>
                    <span className="text-slate-600 font-semibold text-[11px]">
                      {aItems.length} in {paperA.paperSet || "Set A"} / {bItems.length} in {paperB.paperSet || "Set B"}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {Array.from({ length: maxRow }).map((_, rIdx) => {
                      const itA = aItems[rIdx];
                      const itB = bItems[rIdx];

                      const isCommonA = itA ? comparison.commonIds.has(itA.question.id) : false;
                      const isCommonB = itB ? comparison.commonIds.has(itB.question.id) : false;

                      if (filterView === "COMMON" && !isCommonA && !isCommonB) return null;
                      if (filterView === "VARIANTS" && isCommonA && isCommonB) return null;

                      return (
                        <div key={rIdx} className="grid grid-cols-2 divide-x divide-slate-200 text-xs">
                          {/* Left: Paper A */}
                          <div className={`p-3 space-y-1.5 transition ${isCommonA ? "bg-emerald-50/30" : "bg-white"}`}>
                            {itA ? (
                              <>
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-bold text-slate-800 text-[11px]">
                                    Q{rIdx + 1}. {itA.question.chapter?.title ? `[Ch ${itA.question.chapter.number}]` : ""}
                                  </span>
                                  {isCommonA ? (
                                    <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                                      Shared (Common)
                                    </span>
                                  ) : (
                                    <span className="badge bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">
                                      Unique Variant
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-700 leading-snug line-clamp-3">
                                  <MathText text={itA.question.text} />
                                </div>
                              </>
                            ) : (
                              <div className="text-slate-400 italic p-2 text-center">No question in this slot</div>
                            )}
                          </div>

                          {/* Right: Paper B */}
                          <div className={`p-3 space-y-1.5 transition ${isCommonB ? "bg-emerald-50/30" : "bg-white"}`}>
                            {itB ? (
                              <>
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-bold text-slate-800 text-[11px]">
                                    Q{rIdx + 1}. {itB.question.chapter?.title ? `[Ch ${itB.question.chapter.number}]` : ""}
                                  </span>
                                  {isCommonB ? (
                                    <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                                      Shared (Common)
                                    </span>
                                  ) : (
                                    <span className="badge bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">
                                      Unique Variant
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-700 leading-snug line-clamp-3">
                                  <MathText text={itB.question.text} />
                                </div>
                              </>
                            ) : (
                              <div className="text-slate-400 italic p-2 text-center">No question in this slot</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn">
              Close Comparison
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
