"use client";

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  HelpCircle,
  Info,
  Maximize2,
  Minimize2,
  PenLine,
  Printer,
  Sliders,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { PaperSheets, type SheetsInfo } from "@/components/PaperSheets";
import { Modal } from "@/components/ui";
import { api } from "@/lib/client";
import { EXAM_TYPES, EXAM_TYPE_LABEL, isBookletLayout, resolvePaperExamType, type ExamType } from "@/lib/constants";
import type { PaperData } from "@/lib/types";

export default function PrintPage({ params }: PageProps<"/papers/[id]/print">) {
  const { id } = use(params);
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"reading" | "sheets">("sheets");
  const [zoom, setZoom] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const val = localStorage.getItem("epb:printPreviewZoom");
        if (val) return parseFloat(val);
      } catch {}
    }
    return null;
  });
  const [info, setInfo] = useState<SheetsInfo | null>(null);
  const [compact, setCompact] = useState(true);
  const [includeRoughWork, setIncludeRoughWork] = useState(false);
  const [showSignatures, setShowSignatures] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleSetZoom = (z: number | null) => {
    setZoom(z);
    try {
      if (z === null) localStorage.removeItem("epb:printPreviewZoom");
      else localStorage.setItem("epb:printPreviewZoom", String(z));
    } catch {}
  };

  useEffect(() => {
    api<PaperData>(`/api/papers/${id}`).then(
      (p) => {
        setPaper(p);
        setShowSignatures(Boolean(p.showSignatures));
      },
      (e) => setError(e.message),
    );
  }, [id]);

  const onInfo = useCallback(
    (i: SheetsInfo) => {
      setInfo(i);
      if (paper && i.pages > 0 && paper.targetPages !== i.pages) {
        api(`/api/papers/${paper.id}`, {
          method: "PATCH",
          json: { targetPages: i.pages },
        }).catch(() => undefined);
      }
    },
    [paper],
  );

  if (error) return <p className="p-8 text-red-700">{error}</p>;
  if (!paper) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Preparing Printable Examination Booklet…
        </div>
      </div>
    );
  }

  const booklet = isBookletLayout(paper.layout);
  const isA5 = paper.layout === "BOOKLET_A4";
  const defaultZoom = booklet && view === "sheets" ? 0.6 : 0.85;
  const effectiveZoom = zoom ?? defaultZoom;
  const currentExamType = resolvePaperExamType(paper);

  return (
    <div className="min-h-screen bg-slate-200/90 pb-12 print:min-h-0 print:h-auto print:bg-white print:p-0 print:m-0">
      {/* Top Floating Control Bar (Hidden on Print) */}
      <div className="no-print sticky top-0 z-20 border-b border-slate-300 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3">
            <Link
              href={`/papers/${id}`}
              className="btn btn-sm text-slate-700 hover:text-indigo-700 hover:bg-slate-100"
            >
              <ArrowLeft size={13} /> Workbench
            </Link>
            <div className="border-l border-slate-200 pl-3 flex items-center gap-2">
              <span className="font-bold text-slate-900">{paper.title}</span>
              <span
                className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 text-xs font-bold text-indigo-900 shadow-2xs"
                title={`Exam Type locked to blueprint: ${EXAM_TYPE_LABEL[currentExamType]}`}
              >
                {EXAM_TYPE_LABEL[currentExamType]} Exam
              </span>
              {paper.paperSet && (
                <span className="badge !bg-purple-50 !text-purple-700 border border-purple-200 font-bold text-[10px]">
                  {paper.paperSet}
                </span>
              )}
            </div>
          </div>

          {/* Center: View & Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {booklet && (
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setView("sheets");
                    handleSetZoom(null);
                  }}
                  className={`rounded-md px-2.5 py-1 transition ${
                    view === "sheets"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title={
                    isA5
                      ? "A4 2-sided landscape sheets folded to A5 pages"
                      : "A3 2-sided landscape sheets folded to A4 pages"
                  }
                >
                  {isA5 ? "A4 Folded Sheets (A5 Booklet)" : "A3 Folded Sheets (A4 Booklet)"}
                </button>
                <button
                  onClick={() => {
                    setView("reading");
                    handleSetZoom(null);
                  }}
                  className={`rounded-md px-2.5 py-1 transition ${
                    view === "reading"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Sequential order: Page 1, Page 2, Page 3, Page 4"
                >
                  Reading Sequence
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setCompact(false)}
                className={`rounded-md px-2.5 py-1 transition ${
                  !compact
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Includes student response spaces & ruled writing lines"
              >
                Question-Cum-Answer
              </button>
              <button
                onClick={() => setCompact(true)}
                className={`rounded-md px-2.5 py-1 transition ${
                  compact
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Question paper only (collapses answer space to fit maximum questions on minimal pages)"
              >
                Compact (Question Only)
              </button>
            </div>

            {/* Rough Work Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setIncludeRoughWork(!includeRoughWork)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                  includeRoughWork
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Toggle rough work page on or off"
              >
                <PenLine size={13} />
                <span>Rough Work: {includeRoughWork ? "ON" : "OFF"}</span>
              </button>
            </div>

            {/* Invigilator Sign Box Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setShowSignatures(!showSignatures)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                  showSignatures
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Toggle Invigilator Signature Box on or off"
              >
                <span>Invigilator Sign: {showSignatures ? "ON" : "OFF"}</span>
              </button>
            </div>

            {/* Quick Zoom Presets */}
            <div className="hidden lg:flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                onClick={() => handleSetZoom(0.5)}
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  effectiveZoom === 0.5 ? "bg-slate-200 font-bold" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                50%
              </button>
              <button
                onClick={() => handleSetZoom(0.75)}
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  effectiveZoom === 0.75 ? "bg-slate-200 font-bold" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                75%
              </button>
              <button
                onClick={() => handleSetZoom(1.0)}
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  effectiveZoom === 1.0 ? "bg-slate-200 font-bold" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                100%
              </button>
            </div>
          </div>

          {/* Right: Info, Instructions & Print Button */}
          <div className="flex items-center gap-2">
            {info && (
              <span className="hidden sm:inline-block rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                {info.pages} page{info.pages === 1 ? "" : "s"}
                {booklet && view === "sheets" && ` (${info.sheets} ${isA5 ? "A4" : "A3"} sheet${info.sheets === 1 ? "" : "s"})`}
              </span>
            )}

            <button
              className="btn btn-sm border-slate-200 text-slate-700 hover:bg-slate-50"
              onClick={() => setShowGuide(true)}
              title="View printer setup instructions"
            >
              <Info size={14} className="text-indigo-600" />
              <span className="hidden sm:inline">Print Guide</span>
            </button>

            <button
              className="btn btn-primary shadow-xs"
              onClick={() => window.print()}
              title="Open browser print dialog"
            >
              <Printer size={15} /> Print Now
            </button>
          </div>
        </div>

        {/* Draft Notice if incomplete */}
        {!paper.progress.complete && (
          <div className="mx-auto mt-2 max-w-7xl rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            ⚠ Notice:{" "}
            {paper.progress.usedMarks === paper.progress.totalMarks
              ? `All ${paper.progress.totalMarks} marks are placed, but chapter/section distribution differs from the active blueprint.`
              : `This paper does not yet fully meet its blueprint quotas (${paper.progress.usedMarks} / ${paper.progress.totalMarks} marks placed).`}{" "}
            It will print as an evaluation draft.
          </div>
        )}
      </div>

      {/* Main Print Sheets Canvas Area */}
      <div className="mt-6 flex justify-center overflow-x-auto px-4 print:m-0 print:p-0 print:block print:overflow-visible">
        <PaperSheets
          paper={paper}
          view={view}
          zoom={effectiveZoom}
          compact={compact}
          includeRoughWork={includeRoughWork}
          showSignatures={showSignatures}
          onInfo={onInfo}
        />
      </div>

      {/* Printer Machine Instructions Modal */}
      {showGuide && (
        <Modal
          title="Examination Booklet Printing Guide"
          subtitle="Follow these machine settings for crisp, correctly folded examination papers."
          onClose={() => setShowGuide(false)}
        >
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            {booklet ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 space-y-1.5">
                  <div className="font-bold text-sm text-indigo-950 flex items-center gap-1.5">
                    <BookOpen size={16} className="text-indigo-600" />
                    {isA5 ? "A4 Saddle-Stitch Booklet Settings (Folded to A5 Pages)" : "A3 Saddle-Stitch Booklet Settings (Folded to A4 Pages)"}
                  </div>
                  <p className="text-indigo-900">
                    {isA5
                      ? "Your document is automatically imposed into paired A5 pages on standard double-sided A4 sheets. Perfect for standard desktop/office duplex printers."
                      : "Your document is automatically imposed into paired A4 pages on double-sided A3 sheets. Requires an A3 printer."}
                  </p>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-2">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-900">Paper Size:</strong> Select{" "}
                      <strong>{isA5 ? "A4 (210 × 297 mm)" : "A3 (297 × 420 mm)"}</strong> in your system print dialog.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-900">Orientation:</strong> Set to <strong>Landscape</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-900">Two-Sided (Duplex):</strong> Check &quot;Print on both
                      sides&quot; and set binding to:
                      <div className="mt-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block">
                        ✓ Flip on Short Edge (Short-edge binding)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                      4
                    </span>
                    <div>
                      <strong className="text-slate-900">Scale &amp; Margins:</strong> Set Scale to{" "}
                      <strong>100% (Default)</strong> and Margins to <strong>None</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                      5
                    </span>
                    <div>
                      <strong className="text-slate-900">Folding &amp; Stapling:</strong> Fold each {isA5 ? "A4" : "A3"}{" "}
                      sheet in half along the center crease guide to form {isA5 ? "A5" : "A4"} pages. If multi-sheet,
                      nest the sheets together and staple the center spine.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 space-y-1">
                  <div className="font-bold text-sm text-indigo-950 flex items-center gap-1.5">
                    <FileText size={16} className="text-indigo-600" />
                    Standard A4 Single Pages Settings
                  </div>
                  <p className="text-indigo-900">Standard portrait A4 examination paper.</p>
                </div>

                <div className="space-y-2">
                  <p>
                    • <strong>Paper Size:</strong> A4 (210 × 297 mm)
                  </p>
                  <p>
                    • <strong>Orientation:</strong> Portrait
                  </p>
                  <p>
                    • <strong>Scale:</strong> 100% (Actual size)
                  </p>
                  <p>
                    • <strong>Margins:</strong> None or Default
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button className="btn btn-primary btn-sm" onClick={() => setShowGuide(false)}>
                Got it, Continue
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
