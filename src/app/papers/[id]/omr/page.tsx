"use client";

import { ArrowLeft, FileText, Printer } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { api, imageUrl } from "@/lib/client";
import { DEFAULT_SCHOOL_LOGO, DEFAULT_SCHOOL_NAME, EXAM_TYPE_LABEL, isMcqLikeType, resolvePaperExamType } from "@/lib/constants";
import { formatQuestionNumber } from "@/lib/layout";
import type { PaperData } from "@/lib/types";

export default function OmrSheetPage({ params }: PageProps<"/papers/[id]/omr">) {
  const { id } = use(params);
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overrideCount, setOverrideCount] = useState<number | null>(null);
  const [selectedSet, setSelectedSet] = useState<string>("A");
  const [rollDigits] = useState<number>(8);

  useEffect(() => {
    api<PaperData>(`/api/papers/${id}`).then(
      (data) => {
        setPaper(data);
        if (data.paperSet) {
          const normalized = data.paperSet.replace(/^SET\s*[-:]?\s*/i, "").trim().toUpperCase();
          setSelectedSet(normalized ? normalized[0] : "A");
        }
      },
      (e) => setError(e.message),
    );
  }, [id]);

  // Extract objective (MCQ-like) items with their real paper question numbering
  const objectiveItems = useMemo(() => {
    if (!paper) return [];
    const itemsList: {
      globalIndex: number;
      label: string;
      itemId?: string;
      sectionTitle: string;
      type: string;
    }[] = [];

    let numCount = 0;
    let sectionGroupCounter = 0;
    let sectionRelativeCounter = 0;

    for (let i = 0; i < paper.blueprint.sections.length; i++) {
      const s = paper.blueprint.sections[i];
      const prev = i > 0 ? paper.blueprint.sections[i - 1] : null;
      const isSameAsPrev = Boolean(prev && prev.title.trim().toLowerCase() === s.title.trim().toLowerCase());
      if (!isSameAsPrev) {
        if (i > 0) sectionGroupCounter++;
        sectionRelativeCounter = 0;
      }
      const match = s.title.match(/section\s+([a-z0-9]+)/i);
      const sectionLetter = match ? match[1].toUpperCase() : String.fromCharCode(65 + sectionGroupCounter);

      const items = paper.items.filter((item) => item.sectionId === s.id);

      if (items.length > 0) {
        for (const it of items) {
          numCount++;
          sectionRelativeCounter++;
          const mainLabel = formatQuestionNumber(
            paper.numberingStyle || "CONTINUOUS",
            numCount - 1,
            sectionLetter,
            sectionRelativeCounter - 1
          );

          // Check for subparts with MCQ options (e.g. Case Study with objective subparts)
          let subparts: any[] = [];
          if (it.question.subparts && Array.isArray(it.question.subparts)) {
            subparts = it.question.subparts;
          } else if (it.question.subpartsJson) {
            try {
              subparts = JSON.parse(it.question.subpartsJson);
            } catch {}
          }

          const mcqSubparts = subparts.filter((sp) => Array.isArray(sp.options) && sp.options.length > 0);

          if (mcqSubparts.length > 0) {
            mcqSubparts.forEach((sp, spIdx) => {
              itemsList.push({
                globalIndex: numCount,
                label: `${mainLabel}(${sp.label || spIdx + 1})`,
                itemId: `${it.id}-sp-${spIdx}`,
                sectionTitle: s.title,
                type: "MCQ",
              });
            });
          } else if (isMcqLikeType(it.question.type) || isMcqLikeType(s.type)) {
            itemsList.push({
              globalIndex: numCount,
              label: mainLabel,
              itemId: it.id,
              sectionTitle: s.title,
              type: it.question.type || s.type,
            });
          }
        }
      } else {
        // Fallback to blueprint question count slots if paper is still being drafted
        for (let slot = 0; slot < s.count; slot++) {
          numCount++;
          sectionRelativeCounter++;
          if (isMcqLikeType(s.type)) {
            itemsList.push({
              globalIndex: numCount,
              label: formatQuestionNumber(
                paper.numberingStyle || "CONTINUOUS",
                numCount - 1,
                sectionLetter,
                sectionRelativeCounter - 1
              ),
              sectionTitle: s.title,
              type: s.type,
              itemId: `slot-${s.id}-${slot}`,
            });
          }
        }
      }
    }
    return itemsList;
  }, [paper]);

  const itemsToRender = useMemo(() => {
    if (overrideCount !== null) {
      return Array.from({ length: overrideCount }, (_, i) => ({
        globalIndex: i + 1,
        label: String(i + 1),
        itemId: `override-${i + 1}`,
        sectionTitle: "",
        type: "MCQ",
      }));
    }
    return objectiveItems;
  }, [overrideCount, objectiveItems]);

  const totalQuestions = itemsToRender.length;
  const questionsPerColumn = totalQuestions > 0 ? Math.ceil(totalQuestions / 4) : 0;
  const columns = useMemo(() => {
    if (totalQuestions === 0) return [];
    const cols: (typeof itemsToRender)[] = [];
    for (let c = 0; c < 4; c++) {
      const start = c * questionsPerColumn;
      const end = Math.min((c + 1) * questionsPerColumn, totalQuestions);
      const slice = itemsToRender.slice(start, end);
      if (slice.length > 0) cols.push(slice);
    }
    return cols;
  }, [itemsToRender, totalQuestions, questionsPerColumn]);

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p className="font-bold">Error loading paper</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Loading OMR Sheet…</p>
      </div>
    );
  }

  const rollBoxIndices = Array.from({ length: rollDigits }, (_, i) => i);
  const sets = ["A", "B", "C", "D"];
  const resolvedLogoSrc =
    paper.schoolLogo === "NONE"
      ? null
      : paper.logoPath
      ? imageUrl(paper.logoPath)
      : paper.schoolLogo || DEFAULT_SCHOOL_LOGO;

  return (
    <div className="min-h-screen bg-slate-200/90 pb-12 print:m-0 print:min-h-0 print:bg-white print:p-0">
      {/* Top Floating Control Bar (Hidden on Print) */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-300 bg-white/95 px-6 py-3 shadow-sm backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/papers/${id}`}
            className="btn btn-ghost btn-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} /> Back to workbench
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <span className="font-display font-semibold text-slate-800">
            Sarvodaya H.S. School · OMR Answer Sheet
          </span>
          {totalQuestions > 0 ? (
            <span className="badge badge-indigo">
              {totalQuestions} Questions
            </span>
          ) : (
            <span className="badge badge-amber">
              No Objective Questions
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            Paper Set:
            <select
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-indigo-900 shadow-sm"
            >
              {sets.map((s) => (
                <option key={s} value={s}>
                  Set {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            Questions:
            <select
              value={overrideCount ?? "auto"}
              onChange={(e) =>
                setOverrideCount(e.target.value === "auto" ? null : Number(e.target.value))
              }
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm"
            >
              <option value="auto">Auto ({objectiveItems.length} from paper)</option>
              <option value="20">20 Questions</option>
              <option value="30">30 Questions</option>
              <option value="40">40 Questions</option>
              <option value="50">50 Questions</option>
              <option value="60">60 Questions</option>
              <option value="80">80 Questions</option>
              <option value="100">100 Questions</option>
            </select>
          </label>

          <button
            type="button"
            disabled={totalQuestions === 0}
            onClick={() => window.print()}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow disabled:opacity-50 disabled:cursor-not-allowed"
            title={totalQuestions === 0 ? "Select a question count to enable printing" : "Print OMR Sheet"}
          >
            <Printer size={15} /> Print OMR Sheet
          </button>
        </div>
      </div>

      {/* Main Printable A4 OMR Page */}
      <div className="mx-auto mt-6 max-w-[210mm] bg-white p-6 shadow-2xl print:m-0 print:max-w-none print:p-4 print:shadow-none">
        <div className="relative border-4 border-slate-900 p-4">
          {/* Corner Registration Markers for Scanner */}
          <div className="absolute left-1 top-1 h-4 w-4 bg-slate-950" />
          <div className="absolute right-1 top-1 h-4 w-4 bg-slate-950" />
          <div className="absolute bottom-1 left-1 h-4 w-4 bg-slate-950" />
          <div className="absolute bottom-1 right-1 h-4 w-4 bg-slate-950" />

          {/* Timing track bars (decorative top/bottom dots for optical alignment) */}
          <div className="mb-2 flex justify-between px-6">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-900" />
            ))}
          </div>

          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-slate-900 pb-2">
            {resolvedLogoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedLogoSrc}
                alt="School Logo"
                className="h-14 w-14 shrink-0 object-contain"
              />
            ) : null}
            <div className="flex-1 text-center">
              <h1 className="font-serif text-lg font-black uppercase tracking-wider text-slate-950">
                {paper.schoolName || DEFAULT_SCHOOL_NAME}
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-800">
                {EXAM_TYPE_LABEL[resolvePaperExamType(paper)]} EXAMINATION · ACADEMIC SESSION{" "}
                {paper.academicSession || paper.blueprint.academicSession || "2025–26"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-700">
                OPTICAL MARK RECOGNITION (OMR) ANSWER SHEET
              </p>
            </div>
            {resolvedLogoSrc ? <div className="w-14 shrink-0" aria-hidden /> : null}
          </div>

          {/* Metadata Row: Class, Subject, Date, Code */}
          <div className="mb-3 grid grid-cols-4 gap-2 border border-slate-900 bg-slate-50 p-2 text-xs font-semibold text-slate-900">
            <div>
              <span className="text-[10px] uppercase text-slate-600 block">Class:</span>
              <span className="font-bold">{paper.blueprint.book.className}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-600 block">Subject:</span>
              <span className="font-bold">{paper.blueprint.book.subject}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-600 block">Date of Exam:</span>
              <span className="font-bold">{paper.examDate || "DD / MM / YYYY"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-600 block">Subject Code:</span>
              <span className="font-bold">{paper.subjectCode || paper.blueprint.subjectCode || "—"}</span>
            </div>
          </div>

          {/* Upper Grid: Roll Number, Candidate Name, Set & Instructions */}
          <div className="mb-4 grid grid-cols-12 gap-3 border border-slate-900 p-2.5">
            {/* Roll Number Bubble Grid (5 cols) */}
            <div className="col-span-5 border-r border-slate-400 pr-2">
              <span className="block text-[11px] font-black uppercase text-slate-900 mb-1">
                Candidate Roll Number:
              </span>
              {/* Digit Entry Boxes */}
              <div className="flex gap-1 mb-1">
                {rollBoxIndices.map((i) => (
                  <div
                    key={i}
                    className="flex h-6 w-6 items-center justify-center border border-slate-900 bg-white text-xs font-bold"
                  />
                ))}
              </div>
              {/* Bubble Matrix (0-9) */}
              <div className="space-y-0.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <div key={digit} className="flex gap-1 items-center">
                    {rollBoxIndices.map((col) => (
                      <div
                        key={col}
                        className="flex h-5 w-6 items-center justify-center text-[10px] font-semibold text-slate-700"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-900 bg-white">
                          {digit}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Set Selection & Candidate Name (4 cols) */}
            <div className="col-span-4 border-r border-slate-400 pr-2">
              {/* Paper Set Code */}
              <div className="mb-3">
                <span className="block text-[11px] font-black uppercase text-slate-900 mb-1">
                  Question Paper Set:
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center border-2 border-slate-900 bg-slate-100 text-sm font-black text-slate-950">
                    {selectedSet}
                  </div>
                  <div className="flex gap-2">
                    {sets.map((s) => (
                      <div key={s} className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-700">{s}</span>
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border border-slate-900 text-[9px] ${
                            s === selectedSet ? "bg-slate-900 text-white font-black" : "bg-white"
                          }`}
                        >
                          {s}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Candidate Name box */}
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-900 mb-0.5">
                  Candidate Name (in Capital Letters):
                </span>
                <div className="h-6 w-full border border-slate-900 bg-white" />
              </div>
              <div className="mt-2">
                <span className="block text-[10px] font-bold uppercase text-slate-900 mb-0.5">
                  Invigilator Name:
                </span>
                <div className="h-6 w-full border border-slate-900 bg-white" />
              </div>
            </div>

            {/* Instructions & Example (3 cols) */}
            <div className="col-span-3 text-[10px] leading-tight text-slate-800 space-y-1">
              <span className="block font-black uppercase text-slate-950 underline">
                Instructions:
              </span>
              <ul className="list-disc pl-3 space-y-0.5">
                <li>Use <b>Blue/Black Ball Point Pen</b> only.</li>
                <li>Darken circle completely.</li>
                <li>Do NOT use tick mark or cross.</li>
                <li>Do not fold or crush this sheet.</li>
              </ul>
              <div className="mt-1.5 border border-slate-300 p-1 bg-slate-50">
                <span className="block font-bold text-[9px] text-slate-700">Method:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-emerald-700 font-bold">✓ Correct:</span>
                  <span className="h-3.5 w-3.5 rounded-full bg-slate-950 inline-block" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-red-700 font-bold">✗ Wrong:</span>
                  <span className="text-[9px] text-slate-600">✕, ✔, ◐</span>
                </div>
              </div>
            </div>
          </div>

          {/* OMR Question Response Grid (4 Columns) or Informational Notice */}
          {totalQuestions === 0 ? (
            <div className="mb-4 border-2 border-dashed border-slate-300 p-8 text-center bg-slate-50/80 rounded">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600 mb-2">
                <FileText size={20} />
              </div>
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                No Objective / MCQ Questions Found
              </h3>
              <p className="mt-1 text-[11px] text-slate-600 max-w-sm mx-auto leading-relaxed">
                This examination paper contains descriptive or subjective questions only. An OMR sheet is not applicable unless objective questions are added.
              </p>
              <div className="mt-3 flex justify-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setOverrideCount(20)}
                  className="btn btn-sm btn-ghost border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold"
                >
                  Generate Standard 20-Question Sheet
                </button>
                <Link
                  href={`/papers/${id}`}
                  className="btn btn-sm btn-ghost border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium"
                >
                  Back to Workbench
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-4 border-2 border-slate-900 p-2">
              <div className="grid grid-cols-4 divide-x-2 divide-slate-900">
                {columns.map((col, colIdx) => (
                  <div key={colIdx} className="px-2">
                    <div className="mb-1 flex justify-between border-b border-slate-900 pb-1 text-[10px] font-black uppercase text-slate-900">
                      <span>Q.No</span>
                      <span>Response</span>
                    </div>
                    <div className="space-y-1">
                      {col.map((qItem) => {
                        const rawLabel = String(qItem.label || qItem.globalIndex);
                        const display = rawLabel.endsWith(".") ? rawLabel : `${rawLabel}.`;
                        return (
                          <div key={qItem.itemId || `${qItem.globalIndex}-${qItem.label}`} className="flex items-center justify-between text-xs">
                            <span
                              className="w-12 font-bold text-slate-900 text-[10px] tabular-nums truncate pr-1"
                              title={rawLabel}
                            >
                              {display}
                            </span>
                            <div className="flex gap-1.5">
                              {["A", "B", "C", "D"].map((opt) => (
                                <span
                                  key={opt}
                                  className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-900 bg-white text-[9px] font-bold text-slate-800"
                                >
                                  {opt}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Signature Blocks */}
          <div className="grid grid-cols-3 gap-4 border border-slate-900 p-2.5 text-center text-xs">
            <div className="border-t border-dashed border-slate-700 pt-6">
              <span className="font-bold text-slate-900 block text-[11px]">
                Candidate’s Signature
              </span>
              <span className="text-[9px] text-slate-600 block">(To be signed in presence of Invigilator)</span>
            </div>
            <div className="border-t border-dashed border-slate-700 pt-6">
              <span className="font-bold text-slate-900 block text-[11px]">
                Invigilator’s Signature
              </span>
              <span className="text-[9px] text-slate-600 block">(Verified candidate details & set)</span>
            </div>
            <div className="border-t border-dashed border-slate-700 pt-6">
              <span className="font-bold text-slate-900 block text-[11px]">
                Centre Superintendent Stamp
              </span>
              <span className="text-[9px] text-slate-600 block">Exam Centre Official Seal</span>
            </div>
          </div>

          {/* Bottom timing track */}
          <div className="mt-2 flex justify-between px-6">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-900" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
