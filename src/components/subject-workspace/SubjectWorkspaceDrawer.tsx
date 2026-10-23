"use client";

import {
  BookOpen,
  Check,
  Copy,
  FileText,
  Lightbulb,
  Sparkles,
  X,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { MathText } from "@/components/MathText";
import { useToast } from "@/components/ui";
import {
  COMMON_FORMULA_SNIPPETS,
  STANDARD_INSTRUCTION_PRESETS,
  type InstructionPreset,
} from "./standardInstructions";

interface SubjectWorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyInstructions?: (instructions: string) => void;
}

export function SubjectWorkspaceDrawer({
  isOpen,
  onClose,
  onApplyInstructions,
}: SubjectWorkspaceDrawerProps) {
  const toast = useToast();
  const [tab, setTab] = useState<"instructions" | "formulas">("instructions");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-toolkit-title"
    >
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Lightbulb size={18} />
            </div>
            <div>
              <h2 id="subject-toolkit-title" className="text-sm font-bold text-slate-900">
                Subject Toolkit &amp; Instructions Library
              </h2>
              <p className="text-[11px] text-slate-500">
                Standard board instructions, formula snippets, and pedagogical helpers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-5 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("instructions")}
            className={`border-b-2 px-3 py-2 transition flex items-center gap-1.5 ${
              tab === "instructions"
                ? "border-indigo-600 text-indigo-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText size={14} />
            <span>Standard Instructions ({STANDARD_INSTRUCTION_PRESETS.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("formulas")}
            className={`border-b-2 px-3 py-2 transition flex items-center gap-1.5 ${
              tab === "formulas"
                ? "border-indigo-600 text-indigo-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles size={14} />
            <span>Formula Cheatsheet ({COMMON_FORMULA_SNIPPETS.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === "instructions" ? (
            STANDARD_INSTRUCTION_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{preset.title}</h3>
                    <span className="inline-block mt-0.5 rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600 uppercase">
                      {preset.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(preset.text, preset.id)}
                      className="btn btn-xs btn-outline inline-flex items-center gap-1 text-[11px]"
                      title="Copy to clipboard"
                    >
                      {copiedId === preset.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      <span>{copiedId === preset.id ? "Copied" : "Copy"}</span>
                    </button>
                    {onApplyInstructions && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyInstructions(preset.text);
                          toast.success("Applied to General Instructions!");
                        }}
                        className="btn btn-xs btn-primary inline-flex items-center gap-1 text-[11px]"
                        title="Apply to Paper General Instructions"
                      >
                        <Plus size={11} />
                        <span>Apply</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50/80 p-2.5 text-[11px] font-sans text-slate-700 leading-relaxed whitespace-pre-line border border-slate-100 font-mono">
                  {preset.text}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Click any formula to copy its LaTeX syntax directly for question text and answers.
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {COMMON_FORMULA_SNIPPETS.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-indigo-300 transition group"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{item.name}</span>
                        <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-medium text-indigo-700">
                          {item.category}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-900 overflow-x-auto py-0.5">
                        <MathText text={`$${item.latex}$`} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(`$${item.latex}$`, `f-${idx}`)}
                      className="btn btn-xs btn-outline shrink-0 inline-flex items-center gap-1 text-[11px]"
                    >
                      {copiedId === `f-${idx}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      <span>{copiedId === `f-${idx}` ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
