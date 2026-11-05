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
  Scissors,
  Sliders,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { PaperSheets, type SheetsInfo } from "@/components/PaperSheets";
import { Modal } from "@/components/ui";
import { api } from "@/lib/client";
import { BOOKLET_MAX_PAGES } from "@/lib/printFit";
import { EXAM_TYPES, EXAM_TYPE_LABEL, isBookletLayout, resolvePaperExamType, type ExamType } from "@/lib/constants";
import type { PaperData } from "@/lib/types";

export default function PrintPage({ params }: PageProps<"/papers/[id]/print">) {
  const { id } = use(params);
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosenView, setChosenView] = useState<"reading" | "sheets" | null>(() => {
    if (typeof window !== "undefined") {
      const urlView = new URLSearchParams(window.location.search).get("view");
      if (urlView === "sheets" || urlView === "reading") return urlView;
    }
    return null;
  });
  const setView = setChosenView;
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
  const [twoUpCutMode, setTwoUpCutMode] = useState<boolean>(true);
  const [showGuide, setShowGuide] = useState(false);
  const [autoFitting, setAutoFitting] = useState(false);
  const [autoFitPages, setAutoFitPages] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("epb:autoFitPages") !== "off";
      } catch {}
    }
    return true;
  });
  const handleAutoFitPages = (on: boolean) => {
    setAutoFitPages(on);
    try {
      localStorage.setItem("epb:autoFitPages", on ? "on" : "off");
    } catch {}
  };

  const handleAutoFit = async () => {
    setAutoFitting(true);
    try {
      await api(`/api/papers/${id}`, {
        method: "PATCH",
        json: { printDensity: "COMPACT" },
      });
      setCompact(true);
      if (paper) {
        setPaper({ ...paper, printDensity: "COMPACT" });
      }
    } catch {
    } finally {
      setAutoFitting(false);
    }
  };

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
      if (!paper || paper.status === "FINAL") return;
      // targetPages is the paper's own length, not the sheet count (a 2-up sheet carries the paper twice).
      if (i.contentPages > 0 && paper.targetPages !== i.contentPages) {
        api(`/api/papers/${paper.id}`, {
          method: "PATCH",
          json: { targetPages: i.contentPages },
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
  // A short A5 paper (one or two pages) is printed two-up by default: two copies per A4 sheet, cut down the middle.
  // That layout only exists in the sheets view, so open it unless the teacher already chose a view.
  const shortA5 = isA5 && (info?.contentPages ?? 0) > 0 && (info?.contentPages ?? 0) <= 2;
  const view: "reading" | "sheets" = chosenView ?? (shortA5 && twoUpCutMode ? "sheets" : "reading");
  const isWorksheet = paper.blueprint.curriculumMode === "KG_WORKSHEET";
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
              href={paper.blueprint.curriculumMode === "KG_WORKSHEET" ? `/worksheets/${id}` : `/papers/${id}`}
              className="btn btn-sm text-slate-700 hover:text-indigo-700 hover:bg-slate-100"
            >
              <ArrowLeft size={13} /> {paper.blueprint.curriculumMode === "KG_WORKSHEET" ? "Worksheet" : "Workbench"}
            </Link>
            <div className="border-l border-slate-200 pl-3 flex items-center gap-2">
              <span className="font-bold text-slate-900">{paper.title}</span>
              <span
                className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 text-xs font-bold text-indigo-900 shadow-2xs"
                title={`Exam Type locked to blueprint: ${EXAM_TYPE_LABEL[currentExamType]}`}
              >
                {paper.blueprint.curriculumMode === "KG_WORKSHEET" ? "Worksheet" : `${EXAM_TYPE_LABEL[currentExamType]} Exam`}
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
                    setView("reading");
                    handleSetZoom(null);
                  }}
                  className={`rounded-md px-2.5 py-1 transition ${
                    view === "reading"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Sequential 1-up reading order (Page 1, 2, 3...) ideal for standard digital PDF export & desktop printers"
                >
                  Sequential PDF (Reading Order)
                </button>
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
                  {isA5 ? "Folded Booklet (A4 → A5)" : "Folded Booklet (A3 → A4)"}
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
                title={info?.isTwoUpCut && info.contentPages > 1 ? "A two-page paper printed two-up uses both sides of the sheet, so there is no room for a rough work page. Turn 2-Up off to add one." : "Toggle rough work page on or off"}
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

            {/* 2-Up Cut-in-Half Mode (For 1-2 page short papers) */}
            {isA5 && (info?.contentPages ?? 0) > 0 && (info?.contentPages ?? 0) <= 2 && (
              <div className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTwoUpCutMode(!twoUpCutMode)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                    twoUpCutMode
                      ? "bg-purple-700 text-white shadow-xs font-bold"
                      : "text-purple-900 hover:bg-purple-100/70"
                  }`}
                  title="Prints 2 complete exam papers on one A4 sheet to cut down the center (halves paper consumption)"
                >
                  <Scissors size={13} />
                  <span>2-Up Cut in Half: {twoUpCutMode ? "ON (2 copies/sheet)" : "OFF"}</span>
                </button>
              </div>
            )}

            {/* Worksheets always scale to 2 pages = one A4 sheet printed on both sides */}
            {isWorksheet && (
              <div className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 p-0.5 text-xs font-semibold">
                <span
                  className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 font-bold text-white shadow-xs"
                  title="Activities are scaled automatically so the worksheet is never longer than 2 pages. Print double-sided (duplex) on one A4 sheet."
                >
                  <Sparkles size={13} />
                  <span>Fit to 2 pages (duplex): AUTO</span>
                </span>
              </div>
            )}

            {/* Automatic fit of booklet papers into 8 A5 pages (2 folded A4 sheets) */}
            {isA5 && (
              <div className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleAutoFitPages(!autoFitPages)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                    autoFitPages ? "bg-amber-500 text-white shadow-xs font-bold" : "text-amber-900 hover:bg-amber-100/70"
                  }`}
                  title={`Tightens spacing step by step (never below readable size) until the paper fits ${BOOKLET_MAX_PAGES} A5 pages. Turn off to print the paper's own Print Density exactly.`}
                >
                  <Sparkles size={13} />
                  <span>Fit to {BOOKLET_MAX_PAGES} pages: {autoFitPages ? "AUTO" : "OFF"}</span>
                </button>
              </div>
            )}

            {/* Auto-Fit to 4 Pages button if slightly overflowing */}
            {info && info.pages === 5 && (
              <button
                type="button"
                onClick={handleAutoFit}
                disabled={autoFitting || compact}
                className="btn btn-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-1 text-xs shadow-xs"
                title="Automatically adjust density to Compact to fit paper on exactly 4 pages"
              >
                <Sparkles size={13} />
                <span>Auto-Fit to 4 Pages</span>
              </button>
            )}

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
                {info.isTwoUpCut && view === "sheets"
                  ? `${info.contentPages} page${info.contentPages === 1 ? "" : "s"} · 2 copies on ${info.sheets} A4 sheet${info.sheets === 1 ? "" : "s"}`
                  : `${info.pages} page${info.pages === 1 ? "" : "s"}${
                      booklet && view === "sheets" ? ` (${info.sheets} ${isA5 ? "A4" : "A3"} sheet${info.sheets === 1 ? "" : "s"})` : ""
                    }`}
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
              <Printer size={15} />{" "}
              {booklet && view === "sheets" ? "Print Booklet Sheets" : "Save / Print Sequential PDF"}
            </button>
          </div>
        </div>

        {/* Worksheet 2-page fit status */}
        {isWorksheet && info?.fit?.overLimit && (
          <div className="mx-auto mt-2 max-w-7xl rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            ⚠ This worksheet is still {info.fit.pages} pages even at the smallest size ({Math.round(info.fit.scale * 100)}%). Remove an activity or two to fit one A4 sheet.
          </div>
        )}
        {isWorksheet && !info?.fit?.overLimit && info?.fit?.tightened && (
          <div className="mx-auto mt-2 max-w-7xl rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Scaled to {Math.round(info.fit.scale * 100)}% so the worksheet fits {info.fit.pages} {info.fit.pages === 1 ? "page" : "pages"} (one A4 sheet, both sides).
          </div>
        )}

        {/* Booklet page-limit status */}
        {isA5 && info?.fit?.overLimit && (
          <div className="mx-auto mt-2 max-w-7xl rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            ⚠ This paper is {info.fit.pages} A5 pages — more than the {info.fit.maxPages}-page booklet limit
            (2 folded A4 sheets)
            {info.fit.tightened ? ", even at the tightest readable spacing" : ""}. Shorten some questions or
            switch to &quot;Compact (Question Only)&quot;{autoFitPages ? "" : ", or turn on Fit to 8 pages"}.
          </div>
        )}
        {isA5 && !info?.fit?.overLimit && info?.fit?.tightened && (
          <div className="mx-auto mt-2 max-w-7xl rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Spacing was tightened automatically (level {info.fit.level}) to fit {info.fit.pages} of{" "}
            {info.fit.maxPages} A5 pages.
          </div>
        )}
        {isA5 && !autoFitPages && info && info.pages > BOOKLET_MAX_PAGES && (
          <div className="mx-auto mt-2 max-w-7xl rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            ⚠ This paper is {info.pages} A5 pages — more than the {BOOKLET_MAX_PAGES}-page booklet limit. Turn on
            Fit to {BOOKLET_MAX_PAGES} pages to tighten the spacing automatically.
          </div>
        )}

        {/* Draft Notice if incomplete */}
        {!paper.progress.complete && paper.blueprint.curriculumMode !== "KG_WORKSHEET" && (
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
          twoUpCutMode={twoUpCutMode}
          autoFit={autoFitPages}
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
