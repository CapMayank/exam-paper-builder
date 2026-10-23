"use client";

import { Check, Layers, Sparkles, X, BookOpen, Clock, Award } from "lucide-react";
import { useState } from "react";
import {
  STANDARD_BLUEPRINT_TEMPLATES,
  type BlueprintTemplate,
  type BlueprintTemplateSectionGroup,
} from "@/lib/curriculumTemplates";
import { QUESTION_TYPE_LABEL } from "@/lib/constants";
import { Modal } from "./ui";

interface BlueprintTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: BlueprintTemplate) => void;
}

export function BlueprintTemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: BlueprintTemplateModalProps) {
  const [selectedId, setSelectedId] = useState<string>(STANDARD_BLUEPRINT_TEMPLATES[0].id);

  if (!isOpen) return null;

  const current = STANDARD_BLUEPRINT_TEMPLATES.find((t) => t.id === selectedId) || STANDARD_BLUEPRINT_TEMPLATES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Layers size={18} />
            </div>
            <div>
              <h2 id="template-modal-title" className="text-base font-bold text-slate-900">
                Blueprint Starter Templates
              </h2>
              <p className="text-xs text-slate-500">
                Choose a pre-configured board pattern to populate sections, marks, and question types instantly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left: Template Selector List */}
          <div className="md:col-span-5 border-r border-slate-200 overflow-y-auto p-3 space-y-1.5 bg-slate-50/40">
            {STANDARD_BLUEPRINT_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedId;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedId(tmpl.id)}
                  className={`w-full text-left rounded-xl p-3 transition border ${
                    isSelected
                      ? "bg-white border-indigo-400 shadow-sm ring-1 ring-indigo-400/40"
                      : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {tmpl.title}
                    </span>
                    <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                      {tmpl.totalMarks}M
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" />
                      {tmpl.durationMin} mins
                    </span>
                    <span>•</span>
                    <span>{tmpl.targetClasses}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Selected Template Preview */}
          <div className="md:col-span-7 p-5 overflow-y-auto space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">{current.title}</h3>
                <span className="badge !bg-emerald-50 !text-emerald-800 font-bold text-xs border border-emerald-200">
                  {current.totalMarks} Total Marks
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {current.description}
              </p>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Included Sections ({current.sections.length})
              </h4>
              <div className="space-y-2">
                {current.sections.map((sec, idx) => {
                  const sectionMarks = sec.questionTypes.reduce((s, qt) => s + qt.count * qt.marksEach, 0);
                  const qCount = sec.questionTypes.reduce((s, qt) => s + qt.count, 0);
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span className="text-indigo-950 font-bold">{sec.title}</span>
                        <span className="text-slate-500 font-medium">
                          {qCount} Questions • {sectionMarks} Marks
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        &ldquo;{sec.instructions}&rdquo;
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sec.questionTypes.map((qt, qIdx) => (
                          <span
                            key={qIdx}
                            className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200"
                          >
                            <span>{qt.count}×</span>
                            <span>{QUESTION_TYPE_LABEL[qt.type] || qt.type}</span>
                            <span className="text-slate-400">({qt.marksEach}m each)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-outline text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTemplate(current);
              onClose();
            }}
            className="btn btn-sm btn-primary inline-flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>Apply This Template</span>
          </button>
        </div>
      </div>
    </div>
  );
}
