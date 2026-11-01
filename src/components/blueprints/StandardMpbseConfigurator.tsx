"use client";

import React, { useState, useMemo } from "react";
import { ShieldCheck, BookOpen, Sparkles, Check, FileCheck2 } from "lucide-react";
import { MPBSE_BLUEPRINT_TEMPLATES, type BlueprintTemplate } from "@/lib/curriculumTemplates";

interface StandardMpbseConfiguratorProps {
  onLoadTemplate: (template: BlueprintTemplate) => void;
  isReadOnly?: boolean;
  currentTemplateId?: string | null;
}

export function StandardMpbseConfigurator({
  onLoadTemplate,
  isReadOnly,
  currentTemplateId,
}: StandardMpbseConfiguratorProps) {
  const [selectedClass, setSelectedClass] = useState<number>(10);
  const [selectedStream, setSelectedStream] = useState<string>("ALL");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("100");
  const [selectedVariant, setSelectedVariant] = useState<string>("Standard");

  // Filter templates for current selection
  const classTemplates = useMemo(() => {
    return MPBSE_BLUEPRINT_TEMPLATES.filter((t) => t.classLevel === selectedClass);
  }, [selectedClass]);

  const streamOptions = useMemo(() => {
    if (selectedClass === 9 || selectedClass === 10) return [];
    return [
      { id: "ALL", label: "All Subjects (Science & Languages)" },
      { id: "SCIENCE_BIO", label: "Science (Biology Group - Physics, Chemistry, Biology)" },
      { id: "SCIENCE_PCM", label: "Science (Mathematics Group - Physics, Chemistry, Math)" },
      { id: "SECONDARY_GENERAL", label: "Compulsory Languages (Hindi, English)" },
    ];
  }, [selectedClass]);

  const filteredTemplates = useMemo(() => {
    return classTemplates.filter((t) => {
      if (selectedClass >= 11 && selectedStream !== "ALL") {
        if (selectedStream === "SCIENCE_BIO") {
          return t.stream === "SCIENCE" || t.stream === "SCIENCE_BIO";
        }
        if (selectedStream === "SCIENCE_PCM") {
          return t.stream === "SCIENCE" || t.stream === "SCIENCE_PCM";
        }
        if (selectedStream === "SECONDARY_GENERAL") {
          return t.stream === "SECONDARY_GENERAL";
        }
      }
      return true;
    });
  }, [classTemplates, selectedClass, selectedStream]);

  // Distinct subjects
  const subjectOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; hasVariants: boolean }>();
    for (const t of filteredTemplates) {
      if (t.subjectCode) {
        const existing = map.get(t.subjectName || t.title);
        if (!existing) {
          map.set(t.subjectName || t.title, {
            code: t.subjectCode,
            name: t.subjectName || t.title,
            hasVariants: Boolean(t.variant),
          });
        }
      }
    }
    return Array.from(map.values());
  }, [filteredTemplates]);

  // Current matched template
  const matchedTemplate = useMemo(() => {
    return (
      filteredTemplates.find((t) => {
        if (t.subjectCode !== selectedSubjectCode) return false;
        if (t.variant && selectedVariant) {
          return t.variant.toLowerCase() === selectedVariant.toLowerCase();
        }
        return true;
      }) || filteredTemplates[0]
    );
  }, [filteredTemplates, selectedSubjectCode, selectedVariant]);

  const isApplied = Boolean(
    matchedTemplate && (
      currentTemplateId === matchedTemplate.id ||
      currentTemplateId === matchedTemplate.templateCode
    )
  );

  const hasVariants = Boolean(matchedTemplate?.variant);

  return (
    <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/60 to-white p-4 text-xs shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 font-bold">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
              Official MPBSE Board Blueprint Configurator
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Circular 465 Verified
              </span>
            </h3>
            <p className="text-emerald-700 text-[11px]">
              Select Class and Subject to automatically configure official chapter weightages, 23/20/15 question formats, and statutory internal choice rules.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Class Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Academic Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => {
              const cl = Number(e.target.value);
              setSelectedClass(cl);
              if (cl === 9 || cl === 10) setSelectedStream("ALL");
              // Pick first subject of that class
              const firstTpl = MPBSE_BLUEPRINT_TEMPLATES.find((t) => t.classLevel === cl);
              if (firstTpl && firstTpl.subjectCode) {
                setSelectedSubjectCode(firstTpl.subjectCode);
                setSelectedVariant(firstTpl.variant || "Standard");
                onLoadTemplate(firstTpl);
              }
            }}
            disabled={isReadOnly}
            className="select select-sm w-full bg-white border-slate-200 text-xs font-semibold rounded-lg shadow-2xs"
          >
            <option value={9}>Class 9th (माध्यमिक 9वीं)</option>
            <option value={10}>Class 10th (हाईस्कूल 10वीं - Board)</option>
            <option value={11}>Class 11th (उच्चतर 11वीं Science & Languages)</option>
            <option value={12}>Class 12th (हायर सेकेण्डरी 12वीं - Board)</option>
          </select>
        </div>

        {/* 2. Stream Selector (Class 11 & 12 only) */}
        {selectedClass >= 11 && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Stream / Group
            </label>
            <select
              value={selectedStream}
              onChange={(e) => {
                const str = e.target.value;
                setSelectedStream(str);
                const tpl = classTemplates.find((t) => {
                  if (str === "SCIENCE_BIO") return t.stream === "SCIENCE" || t.stream === "SCIENCE_BIO";
                  if (str === "SCIENCE_PCM") return t.stream === "SCIENCE" || t.stream === "SCIENCE_PCM";
                  if (str === "SECONDARY_GENERAL") return t.stream === "SECONDARY_GENERAL";
                  return true;
                });
                if (tpl && tpl.subjectCode) {
                  setSelectedSubjectCode(tpl.subjectCode);
                  if (tpl.variant) setSelectedVariant(tpl.variant);
                  onLoadTemplate(tpl);
                }
              }}
              disabled={isReadOnly}
              className="select select-sm w-full bg-white border-slate-200 text-xs font-semibold rounded-lg shadow-2xs"
            >
              {streamOptions.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Subject Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Subject
          </label>
          <select
            value={selectedSubjectCode}
            onChange={(e) => {
              const code = e.target.value;
              setSelectedSubjectCode(code);
              const tpl = filteredTemplates.find((t) => t.subjectCode === code);
              if (tpl?.variant) setSelectedVariant(tpl.variant);
              if (tpl) onLoadTemplate(tpl);
            }}
            disabled={isReadOnly}
            className="select select-sm w-full bg-white border-slate-200 text-xs font-semibold rounded-lg shadow-2xs"
          >
            {subjectOptions.map((sub) => (
              <option key={sub.code} value={sub.code}>
                {sub.name} (Code {sub.code})
              </option>
            ))}
          </select>
        </div>

        {/* 4. Variant Selector (if applicable) */}
        {hasVariants && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Subject Variant
            </label>
            <select
              value={selectedVariant}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedVariant(v);
                const tpl = filteredTemplates.find((t) => t.subjectCode === selectedSubjectCode && t.variant?.toLowerCase() === v.toLowerCase());
                if (tpl) onLoadTemplate(tpl);
              }}
              disabled={isReadOnly}
              className="select select-sm w-full bg-white border-slate-200 text-xs font-semibold rounded-lg shadow-2xs"
            >
              <option value="Standard">Standard (कोड 100)</option>
              <option value="Basic">Basic (कोड 101 - Circular 53/54)</option>
            </select>
          </div>
        )}
      </div>

      {/* Provenance Card Preview & 1-Click Load CTA */}
      {matchedTemplate && (
        <div className="rounded-xl border border-emerald-300/80 bg-white p-3.5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCheck2 size={16} className="text-emerald-600 shrink-0" />
              <span className="font-bold text-slate-900 text-xs">{matchedTemplate.title}</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                {matchedTemplate.archetype}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {matchedTemplate.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-0.5">
              <span>⏱️ {matchedTemplate.durationMin} Minutes</span>
              <span>•</span>
              <span className="font-bold text-emerald-800">🎯 {matchedTemplate.totalMarks} Marks Theory</span>
              <span>•</span>
              <span>📜 {matchedTemplate.provenance?.circularReference} Compliant</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onLoadTemplate(matchedTemplate)}
            disabled={isReadOnly}
            className={`btn btn-sm text-xs font-bold px-4 shrink-0 flex items-center gap-1.5 shadow-xs transition ${
              isApplied
                ? "bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                : "btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
            }`}
          >
            {isApplied ? (
              <>
                <Check size={14} className="text-emerald-600" /> 1-Click Load Official Blueprint (Active)
              </>
            ) : (
              <>
                <Sparkles size={14} /> 1-Click Load Official Blueprint
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
