"use client";

import React, { useState } from "react";
import { Calendar, CheckSquare, Square, Zap, Scale, Sparkles } from "lucide-react";
import {
  type ExaminationTerm,
  TERM_CONFIGS,
  adaptChaptersHamiltonHare,
} from "@/lib/curriculumTemplates";

interface ChapterItem {
  id: string;
  number?: number | null;
  title: string;
}

interface CustomSchoolTermConfiguratorProps {
  chapters: ChapterItem[];
  marks: Record<string, number>;
  onMarksChange: (updatedMarks: Record<string, number>) => void;
  term: ExaminationTerm;
  onTermChange: (term: ExaminationTerm, defaultDuration: number) => void;
  targetMarks: number;
  onTargetMarksChange: (newTarget: number) => void;
  isReadOnly?: boolean;
}

export function CustomSchoolTermConfigurator({
  chapters,
  marks,
  onMarksChange,
  term,
  onTermChange,
  targetMarks,
  onTargetMarksChange,
  isReadOnly,
}: CustomSchoolTermConfiguratorProps) {
  const terms: Array<{
    id: ExaminationTerm;
    label: string;
    sublabel: string;
    marks: number;
    duration: number;
  }> = [
    { id: "QUARTERLY", label: "🍂 Quarterly (त्रैमासिक)", sublabel: "Early Term Exam", marks: 50, duration: 120 },
    { id: "HALF_YEARLY", label: "❄️ Half-Yearly (अर्धवार्षिक)", sublabel: "Midterm Exam", marks: 75, duration: 180 },
    { id: "UNIT_TEST", label: "📝 Unit Test (इकाई परीक्षा)", sublabel: "Periodic Assessment", marks: 25, duration: 60 },
    { id: "PRE_BOARD", label: "🎓 Pre-Board (प्री-बोर्ड)", sublabel: "Full Board Simulation", marks: 75, duration: 180 },
  ];

  const activeChapterCount = chapters.filter((c) => (marks[c.id] || 0) > 0).length;

  // Toggle chapter inclusion
  const toggleChapter = (chapterId: string) => {
    if (isReadOnly) return;
    const current = marks[chapterId] || 0;
    const updated = { ...marks };
    if (current > 0) {
      updated[chapterId] = 0;
    } else {
      updated[chapterId] = 5; // default initial weight
    }
    onMarksChange(updated);
  };

  // Preset syllabus buttons
  const applyPreset = (preset: "ALL" | "NONE" | "CH1_4" | "CH5_8") => {
    if (isReadOnly) return;
    const updated = { ...marks };
    chapters.forEach((c, idx) => {
      if (preset === "ALL") {
        updated[c.id] = updated[c.id] > 0 ? updated[c.id] : 5;
      } else if (preset === "NONE") {
        updated[c.id] = 0;
      } else if (preset === "CH1_4") {
        updated[c.id] = idx < 4 ? (updated[c.id] > 0 ? updated[c.id] : 5) : 0;
      } else if (preset === "CH5_8") {
        updated[c.id] = idx >= 4 && idx < 8 ? (updated[c.id] > 0 ? updated[c.id] : 5) : 0;
      }
    });
    onMarksChange(updated);
  };

  // Rebalance proportionally using Hamilton-Hare
  const rebalanceProportional = () => {
    if (isReadOnly) return;
    const active = chapters
      .filter((c) => (marks[c.id] || 0) > 0)
      .map((c) => ({ chapterId: c.id, marks: marks[c.id] }));

    if (active.length === 0) return;

    const adapted = adaptChaptersHamiltonHare(active, targetMarks, 1);
    const updated = { ...marks };
    // Zero out all
    chapters.forEach((c) => {
      updated[c.id] = 0;
    });
    // Set adapted
    adapted.forEach((a) => {
      updated[a.chapterId] = a.marks;
    });
    onMarksChange(updated);
  };

  // Rebalance equally
  const rebalanceEqual = () => {
    if (isReadOnly) return;
    const active = chapters.filter((c) => (marks[c.id] || 0) > 0);
    if (active.length === 0) return;

    const base = Math.floor(targetMarks / active.length);
    const rem = targetMarks % active.length;
    const updated = { ...marks };
    chapters.forEach((c) => {
      updated[c.id] = 0;
    });
    active.forEach((c, idx) => {
      updated[c.id] = base + (idx < rem ? 1 : 0);
    });
    onMarksChange(updated);
  };

  return (
    <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-b from-indigo-50/50 to-white p-4 text-xs shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 font-bold">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
              Custom School Term Examination Configurator
              <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Hamilton-Hare Rebalanced
              </span>
            </h3>
            <p className="text-indigo-700 text-[11px]">
              Select test term, choose which chapters have been covered in class, and proportionally rebalance marks to ensure exact arithmetic feasibility.
            </p>
          </div>
        </div>

        {/* Target Marks indicator */}
        <div className="flex items-center gap-2 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl shadow-2xs shrink-0">
          <span className="text-slate-600 font-semibold text-[11px]">Target Marks:</span>
          <input
            type="number"
            min={5}
            max={200}
            value={targetMarks}
            onChange={(e) => onTargetMarksChange(Math.max(5, Number(e.target.value) || 25))}
            disabled={isReadOnly}
            className="w-14 text-center font-bold text-indigo-900 border border-slate-200 rounded px-1 py-0.5 text-xs bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Term Radio Pills */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-2">
          Examination Term / Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {terms.map((t) => {
            const isSelected = term === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onTermChange(t.id, t.duration);
                  onTargetMarksChange(t.marks);
                }}
                disabled={isReadOnly}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-xs"
                    : "border-slate-200 bg-white/70 hover:bg-white text-slate-700"
                }`}
              >
                <span className="block font-bold text-xs text-slate-900">{t.label}</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  {t.marks} Marks • {t.duration} Min
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chapter Syllabus Checklist & Rebalancing Tools */}
      <div className="space-y-2 pt-1 border-t border-indigo-100/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="text-[11px] font-bold text-slate-800">
            Select Active Chapters for this Exam ({activeChapterCount} of {chapters.length} in syllabus):
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset("ALL")}
              disabled={isReadOnly}
              className="btn btn-ghost btn-xs text-[10px] bg-white border border-slate-200"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => applyPreset("CH1_4")}
              disabled={isReadOnly}
              className="btn btn-ghost btn-xs text-[10px] bg-white border border-slate-200"
            >
              Term 1 (Ch 1–4)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("CH5_8")}
              disabled={isReadOnly}
              className="btn btn-ghost btn-xs text-[10px] bg-white border border-slate-200"
            >
              Term 2 (Ch 5–8)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("NONE")}
              disabled={isReadOnly}
              className="btn btn-ghost btn-xs text-[10px] bg-white border border-slate-200 text-slate-500"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Chapters Matrix */}
        <div className="max-h-56 overflow-y-auto space-y-1 p-2 bg-white rounded-xl border border-slate-200">
          {chapters.map((ch) => {
            const currentMark = marks[ch.id] || 0;
            const inSyllabus = currentMark > 0;

            return (
              <div
                key={ch.id}
                onClick={() => toggleChapter(ch.id)}
                className={`flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer transition select-none ${
                  inSyllabus
                    ? "bg-indigo-50/80 border border-indigo-200/80 text-indigo-950"
                    : "bg-slate-50/60 border border-transparent text-slate-500 hover:bg-slate-100/60"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {inSyllabus ? (
                    <CheckSquare size={16} className="text-indigo-600 shrink-0" />
                  ) : (
                    <Square size={16} className="text-slate-400 shrink-0" />
                  )}
                  <span className="font-semibold text-xs truncate">
                    {ch.number != null ? `Ch ${ch.number}: ` : ""}
                    {ch.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <label className="text-[10px] text-slate-500">Marks:</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={currentMark}
                    onChange={(e) => {
                      if (isReadOnly) return;
                      const val = Math.max(0, Number(e.target.value) || 0);
                      onMarksChange({ ...marks, [ch.id]: val });
                    }}
                    disabled={isReadOnly}
                    className="w-12 text-center font-bold text-slate-900 border border-slate-200 rounded px-1 py-0.5 text-xs bg-white"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Rebalance Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-slate-600">
            Quick Mark Balancing ({targetMarks} Marks target):
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={rebalanceProportional}
              disabled={isReadOnly || activeChapterCount === 0}
              className="btn btn-sm btn-ghost bg-indigo-50 border border-indigo-300 text-indigo-900 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
              title="Scale active chapter marks proportionally to sum up to target marks"
            >
              <Zap size={13} className="text-indigo-600" /> ⚡ Rebalance Marks (Proportional)
            </button>
            <button
              type="button"
              onClick={rebalanceEqual}
              disabled={isReadOnly || activeChapterCount === 0}
              className="btn btn-sm btn-ghost bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 shadow-2xs"
              title="Evenly divide target marks across active chapters"
            >
              <Scale size={13} className="text-slate-500" /> ⚖️ Equal Distribution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
