"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  Languages,
  ListOrdered,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Modal, Spinner, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { MathText } from "./MathText";
import type { QuestionImproveResult } from "@/lib/gemini";

interface AIQuestionImproverModalProps {
  initialText: string;
  initialOptions: string[];
  initialAnswer: string;
  type: string;
  onClose: () => void;
  onApply: (improved: { text: string; options: string[]; answer: string }) => void;
}

type ImproveTask =
  | "refine_cbse"
  | "generate_distractors"
  | "bilingual_hindi"
  | "step_marking_scheme"
  | "fix_ambiguity";

export function AIQuestionImproverModal({
  initialText,
  initialOptions,
  initialAnswer,
  type,
  onClose,
  onApply,
}: AIQuestionImproverModalProps) {
  const toast = useToast();

  const [activeTask, setActiveTask] = useState<ImproveTask>(
    type === "MCQ" && initialOptions.filter(Boolean).length <= 1
      ? "generate_distractors"
      : "refine_cbse",
  );

  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionImproveResult | null>(null);

  async function handleRunImprovement(taskToRun: ImproveTask = activeTask) {
    if (!initialText.trim()) {
      setError("Please write some question text before improving.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const customKey =
        typeof window !== "undefined"
          ? localStorage.getItem("exam_gemini_api_key") || ""
          : "";

      const headers: Record<string, string> = {};
      if (customKey) headers["x-gemini-api-key"] = customKey;

      const res = await api<{
        success: boolean;
        isMock: boolean;
        data: QuestionImproveResult;
        error?: string;
      }>("/api/ai/improve-question", {
        method: "POST",
        headers,
        json: {
          questionText: initialText,
          options: initialOptions.filter(Boolean),
          answer: initialAnswer,
          type,
          task: taskToRun,
        },
      });

      if (!res.success && res.error) {
        setError(res.error);
        return;
      }

      setResult(res.data);
      if (res.isMock) {
        if (res.error) {
          toast.info(`Offline Fallback: ${res.error}`);
        } else {
          toast.info("Improved using Board Standards template.");
        }
      } else {
        toast.success("Question improved with Gemini AI!");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleAccept() {
    if (!result) return;
    onApply({
      text: result.improvedText || initialText,
      options: result.improvedOptions?.length ? result.improvedOptions : initialOptions,
      answer: result.improvedAnswer || initialAnswer,
    });
    onClose();
    toast.success("Applied AI enhancements to question!");
  }

  return (
    <Modal
      size="lg"
      title="✨ AI Question Polish &amp; Rewriter"
      subtitle="Refine phrasing to official CBSE standards, generate distractors, add Hindi translation, and write marking rubrics"
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {result ? "Review proposed changes before applying" : "Pick an action to run"}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            {result ? (
              <button type="button" className="btn btn-primary" onClick={handleAccept}>
                <Check size={15} /> Apply changes
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleRunImprovement()}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Spinner /> Polishing...
                  </>
                ) : (
                  <>
                    <Wand2 size={15} /> Run AI Polish
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Preset Action Buttons */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              setActiveTask("refine_cbse");
              void handleRunImprovement("refine_cbse");
            }}
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition text-xs ${
              activeTask === "refine_cbse"
                ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <Sparkles size={16} className="text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block">CBSE Board Rigor</span>
              <span className="text-slate-500 text-[11px] leading-tight block mt-0.5">
                Refine terminology &amp; LaTeX math
              </span>
            </div>
          </button>

          {type === "MCQ" && (
            <button
              type="button"
              onClick={() => {
                setActiveTask("generate_distractors");
                void handleRunImprovement("generate_distractors");
              }}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition text-xs ${
                activeTask === "generate_distractors"
                  ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20"
                : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <ListOrdered size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block">MCQ Distractors</span>
                <span className="text-slate-500 text-[11px] leading-tight block mt-0.5">
                  Generate 4 balanced options
                </span>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTask("bilingual_hindi");
              void handleRunImprovement("bilingual_hindi");
            }}
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition text-xs ${
              activeTask === "bilingual_hindi"
                ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <Languages size={16} className="text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block">Hindi Translation</span>
              <span className="text-slate-500 text-[11px] leading-tight block mt-0.5">
                Append Devanagari translation
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTask("step_marking_scheme");
              void handleRunImprovement("step_marking_scheme");
            }}
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition text-xs ${
              activeTask === "step_marking_scheme"
                ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <FileCheck2 size={16} className="text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block">Step Marking Scheme</span>
              <span className="text-slate-500 text-[11px] leading-tight block mt-0.5">
                Draft formula &amp; unit rubric
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTask("fix_ambiguity");
              void handleRunImprovement("fix_ambiguity");
            }}
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition text-xs ${
              activeTask === "fix_ambiguity"
                ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <AlertCircle size={16} className="text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block">Fix Ambiguities</span>
              <span className="text-slate-500 text-[11px] leading-tight block mt-0.5">
                Tighten conditions &amp; variables
              </span>
            </div>
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Comparison Cards (Before vs After) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Current Original */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2 text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wide block">Current Version</span>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-slate-800 leading-relaxed min-h-24">
              <MathText text={initialText} />
            </div>
            {initialOptions.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-semibold text-slate-500">Options:</span>
                {initialOptions.map((opt, i) => (
                  <div key={i} className="text-slate-600 pl-2">
                    ({String.fromCharCode(65 + i)}) <MathText text={opt} />
                  </div>
                ))}
              </div>
            )}
            {initialAnswer && (
              <div className="pt-1 text-slate-600">
                <span className="font-semibold text-slate-500">Answer: </span>
                {initialAnswer}
              </div>
            )}
          </div>

          {/* AI Enhanced Version */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles size={13} /> Gemini Enhanced Version
              </span>
              {result && (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Ready to apply
                </span>
              )}
            </div>

            {busy ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Spinner />
                <span className="mt-2 text-xs font-medium">Analyzing question with Gemini...</span>
              </div>
            ) : result ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-indigo-200 bg-white p-3 text-slate-900 leading-relaxed font-medium min-h-24">
                  <MathText text={result.improvedText} />
                </div>

                {result.improvedOptions && result.improvedOptions.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold text-indigo-900">Improved Options:</span>
                    {result.improvedOptions.map((opt, i) => (
                      <div key={i} className="text-slate-800 pl-2 bg-white rounded border border-indigo-100 p-1">
                        <strong className="text-indigo-600">({String.fromCharCode(65 + i)})</strong>{" "}
                        <MathText text={opt} />
                      </div>
                    ))}
                  </div>
                )}

                {result.improvedAnswer && (
                  <div className="pt-1 rounded bg-white border border-indigo-100 p-2 text-emerald-900 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                    <strong className="text-emerald-700 font-sans block mb-1">Marking Scheme:</strong>
                    {result.improvedAnswer}
                  </div>
                )}

                {result.critique && result.critique.length > 0 && (
                  <div className="rounded-lg bg-indigo-100/60 p-2.5 text-[11px] text-indigo-950 space-y-1">
                    <span className="font-bold block">Improvements made:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {result.critique.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Wand2 size={24} className="text-indigo-300 mb-1" />
                <span className="text-xs">Click one of the actions above to enhance this question</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
