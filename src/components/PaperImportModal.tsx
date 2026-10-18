"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Sparkles,
  Upload,
} from "lucide-react";
import { MathText } from "@/components/MathText";
import { Modal, Spinner, useToast } from "@/components/ui";
import {
  parsePaperImport,
  SAMPLE_PAPER_CSV,
  SAMPLE_PAPER_JSON,
  SAMPLE_PAPER_TEXT,
  verifyPaperAgainstBlueprint,
  type PaperImportData,
  type PaperImportResult,
  type PaperVerificationReport,
} from "@/lib/paperImport";
import type { Blueprint, Chapter, PaperData } from "@/lib/types";

interface PaperImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdPaperId: string) => void;
  blueprints: Blueprint[];
  // If provided, the modal operates in "in-paper" mode directly inside the editor
  currentPaper?: PaperData | null;
  onPaperUpdated?: () => void;
}

export function PaperImportModal({
  isOpen,
  onClose,
  onSuccess,
  blueprints,
  currentPaper,
  onPaperUpdated,
}: PaperImportModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"import" | "examples">("import");
  const [exampleFormat, setExampleFormat] = useState<"json" | "csv" | "text">("json");
  const [inputText, setInputText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");

  // Selected target blueprint
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>(
    currentPaper?.blueprint?.id || blueprints[0]?.id || ""
  );

  useEffect(() => {
    if (currentPaper?.blueprint?.id) {
      setSelectedBlueprintId(currentPaper.blueprint.id);
    } else if (blueprints.length > 0 && !selectedBlueprintId) {
      setSelectedBlueprintId(blueprints[0].id);
    }
  }, [currentPaper?.blueprint?.id, blueprints, selectedBlueprintId]);

  const activeBlueprint = useMemo(
    () => blueprints.find((b) => b.id === selectedBlueprintId) || blueprints[0] || null,
    [blueprints, selectedBlueprintId]
  );

  // Auto-detect matching blueprint from parsed text/title
  useEffect(() => {
    if (currentPaper || !inputText.trim() || blueprints.length === 0) return;
    const lower = inputText.toLowerCase();
    let bestBp: Blueprint | null = null;
    let bestScore = 0;
    for (const b of blueprints) {
      let score = 0;
      const subj = b.book.subject.toLowerCase().split("/")[0].trim();
      const cls = b.book.className.toLowerCase();
      if (subj && lower.includes(subj)) score += 10;
      if (cls && lower.includes(cls)) score += 5;
      if (
        b.examType === "HALF_YEARLY" &&
        (lower.includes("half-yearly") || lower.includes("half yearly") || lower.includes("half_yearly"))
      ) {
        score += 4;
      }
      if (b.examType === "QUARTERLY" && lower.includes("quarterly")) score += 4;
      if (b.examType === "ANNUAL" && lower.includes("annual")) score += 4;
      if (b.academicSession && lower.includes(b.academicSession.toLowerCase())) score += 2;
      if (score > bestScore) {
        bestScore = score;
        bestBp = b;
      }
    }
    if (bestBp && bestScore > 0) {
      setSelectedBlueprintId(bestBp.id);
    }
  }, [inputText, blueprints, currentPaper]);

  if (!isOpen) return null;

  // 1. Live Parse
  const parseResult: PaperImportResult | null = inputText.trim()
    ? parsePaperImport(inputText, "auto")
    : null;

  // 2. Live Blueprint Verification
  const verificationReport: PaperVerificationReport | null =
    parseResult?.success && activeBlueprint
      ? verifyPaperAgainstBlueprint(
          parseResult.paper,
          activeBlueprint,
          activeBlueprint.chapters.map((c) => ({
            id: c.chapterId,
            bookId: activeBlueprint.bookId,
            number: c.chapter.number,
            title: c.chapter.title,
          }))
        )
      : null;

  // File Upload Handlers
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInputText(text);
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInputText(text);
      }
    };
    reader.readAsText(file);
  }

  function copyExample(content: string) {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Example template copied to clipboard!");
  }

  function downloadTemplate(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  }

  function useTemplate(content: string) {
    setInputText(content);
    setFileName("sample_template." + (exampleFormat === "json" ? "json" : exampleFormat === "csv" ? "csv" : "txt"));
    setActiveTab("import");
    toast.success("Loaded template into editor!");
  }

  // Submit & Import Execution
  async function handleImport() {
    if (!parseResult || !parseResult.success) {
      toast.error("Please paste or upload a valid question paper first.");
      return;
    }
    if (!activeBlueprint) {
      toast.error("Please select a target blueprint.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentPaper) {
        // Direct Editor Import
        const res = await fetch(`/api/papers/${currentPaper.id}/import-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paperData: parseResult.paper,
            mode: importMode,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to import questions into paper");
        toast.success(`Imported ${data.importedCount} question(s) into ${currentPaper.title}`);
        onPaperUpdated?.();
        onClose();
      } else {
        // Create New Paper from Import
        const res = await fetch("/api/papers/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blueprintId: activeBlueprint.id,
            paperData: parseResult.paper,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create paper from import");
        toast.success(`Created "${data.paper?.title || "Exam Paper"}" matching blueprint!`);
        onSuccess?.(data.paperId);
        onClose();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const exampleContent =
    exampleFormat === "json"
      ? SAMPLE_PAPER_JSON
      : exampleFormat === "csv"
      ? SAMPLE_PAPER_CSV
      : SAMPLE_PAPER_TEXT;

  return (
    <Modal
      title={currentPaper ? `Import Questions into “${currentPaper.title}”` : "Import Question Paper"}
      subtitle="Upload or paste existing question papers and verify them against blueprint quotas."
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "import"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload size={14} /> Import &amp; Verify Paper
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("examples")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "examples"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles size={14} /> Example Formats &amp; Templates
          </button>
        </div>

        {/* Tab 1: Import & Verify */}
        {activeTab === "import" && (
          <div className="space-y-4">
            {/* Target Blueprint Selection */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Blueprint (Validation Spec)
                </label>
                {currentPaper ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800">
                    {activeBlueprint?.name} ({activeBlueprint?.book.className} · {activeBlueprint?.book.subject})
                  </div>
                ) : (
                  <select
                    value={selectedBlueprintId}
                    onChange={(e) => setSelectedBlueprintId(e.target.value)}
                    className="input text-xs"
                  >
                    {blueprints.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.book.className} {b.book.subject}) - {b.sections.reduce((s, x) => s + x.count * x.marksEach, 0)}m
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {currentPaper && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Placement Mode
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === "replace"}
                        onChange={() => setImportMode("replace")}
                      />
                      <span>Replace existing paper questions</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer ml-3">
                      <input
                        type="radio"
                        name="importMode"
                        value="append"
                        checked={importMode === "append"}
                        onChange={() => setImportMode("append")}
                      />
                      <span>Append to sections</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Area / Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 text-center hover:bg-slate-100/70 transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload size={20} className="mx-auto text-slate-400 mb-1" />
              <p className="text-xs font-semibold text-slate-700">
                Click to browse or drag and drop a Question Paper file
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supported formats: JSON (.json), CSV spreadsheet (.csv), or structured plain text (.txt)
              </p>
              {fileName && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-900">
                  <FileText size={12} /> {fileName}
                </div>
              )}
            </div>

            {/* Textarea for direct paste */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Or Paste Paper Content Directly
                </label>
                {inputText && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputText("");
                      setFileName(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-red-600"
                  >
                    Clear text
                  </button>
                )}
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={6}
                placeholder="Paste JSON, CSV table, or numbered markdown text here..."
                className="input font-mono text-xs w-full leading-relaxed"
              />
            </div>

            {/* Live Verification & Blueprint Match Dashboard */}
            {parseResult && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                {/* Status Header */}
                <div
                  className={`rounded-xl border p-3 flex items-start gap-3 ${
                    verificationReport?.isValid && verificationReport.matchPercentage === 100
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                      : verificationReport?.canProceed
                      ? "border-amber-200 bg-amber-50/70 text-amber-900"
                      : "border-red-200 bg-red-50/70 text-red-900"
                  }`}
                >
                  {verificationReport?.isValid && verificationReport.matchPercentage === 100 ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : verificationReport?.canProceed ? (
                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wide">
                        {verificationReport?.isValid && verificationReport.matchPercentage === 100
                          ? "100% Blueprint Match · Verified & Balanced"
                          : verificationReport?.canProceed
                          ? `Valid With Warnings · ${verificationReport.matchPercentage}% Blueprint Match`
                          : "Verification Incomplete / Critical Errors"}
                      </span>
                      <span className="text-xs font-mono font-bold">
                        {parseResult.totalMarks} / {activeBlueprint?.sections.reduce((s, x) => s + x.count * x.marksEach, 0) || 0} Marks
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 leading-snug">
                      Detected <strong>{parseResult.totalQuestions} questions</strong> across{" "}
                      <strong>{parseResult.paper.sections.length} sections</strong> in{" "}
                      <span className="uppercase font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/70 border">
                        {parseResult.format}
                      </span>{" "}
                      format
                      {parseResult.paper.examType && (
                        <>
                          {" "}
                          · Term:{" "}
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/70 border">
                            {parseResult.paper.examType.replace("_", " ")}
                          </span>
                        </>
                      )}
                      .
                    </p>
                  </div>
                </div>

                {/* Section Breakdown Matrix */}
                {verificationReport && (
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between">
                      <span>Blueprint Section Quota &amp; Mapping</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {verificationReport.sections.filter((s) => s.status === "MATCH").length} of{" "}
                        {verificationReport.sections.length} sections matched
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 text-xs">
                      {verificationReport.sections.map((sec, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/50">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{sec.sectionTitle}</span>
                              <span className="badge font-mono text-[10px]">
                                {sec.expectedType} · {sec.expectedMarksEach}m
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{sec.message}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span
                              className={`badge font-bold text-[11px] ${
                                sec.status === "MATCH"
                                  ? "!bg-emerald-100 !text-emerald-800"
                                  : sec.status === "UNDERFILLED"
                                  ? "!bg-amber-100 !text-amber-800"
                                  : "!bg-red-100 !text-red-800"
                              }`}
                            >
                              {sec.importedCount} / {sec.expectedCount} Questions
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chapter Syllabus Quota Matrix */}
                {verificationReport && verificationReport.chapters.some((c) => c.targetMarks > 0) && (
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between">
                      <span>Chapter Weightage Balance</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {verificationReport.chapters.filter((c) => c.status === "MATCH" && c.targetMarks > 0).length}{" "}
                        balanced
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {verificationReport.chapters
                        .filter((c) => c.targetMarks > 0 || c.importedMarks > 0)
                        .map((ch) => (
                          <div key={ch.chapterId} className="px-3 py-2 flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-800 truncate">
                              Ch {ch.chapterNumber}: {ch.chapterTitle}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-slate-500">
                                {ch.importedMarks}m placed / {ch.targetMarks}m quota
                              </span>
                              <span
                                className={`badge font-bold text-[10px] ${
                                  ch.status === "MATCH"
                                    ? "!bg-emerald-100 !text-emerald-800"
                                    : ch.status === "DEFICIT"
                                    ? "!bg-amber-100 !text-amber-800"
                                    : "!bg-purple-100 !text-purple-800"
                                }`}
                              >
                                {ch.status === "MATCH"
                                  ? "✓ Balanced"
                                  : ch.difference < 0
                                  ? `${ch.difference}m deficit`
                                  : `+${ch.difference}m excess`}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Warnings Display */}
                {verificationReport && verificationReport.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Blueprint Invariant Warnings ({verificationReport.warnings.length})
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {verificationReport.warnings.slice(0, 4).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {verificationReport.warnings.length > 4 && (
                        <li>...and {verificationReport.warnings.length - 4} more minor warning(s).</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Example Formats & Templates */}
        {activeTab === "examples" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="segmented" role="group" aria-label="Format selection">
                <button
                  type="button"
                  aria-pressed={exampleFormat === "json"}
                  onClick={() => setExampleFormat("json")}
                >
                  <FileCode size={13} className="inline mr-1" /> JSON Format
                </button>
                <button
                  type="button"
                  aria-pressed={exampleFormat === "csv"}
                  onClick={() => setExampleFormat("csv")}
                >
                  <FileSpreadsheet size={13} className="inline mr-1" /> CSV Spreadsheet
                </button>
                <button
                  type="button"
                  aria-pressed={exampleFormat === "text"}
                  onClick={() => setExampleFormat("text")}
                >
                  <FileText size={13} className="inline mr-1" /> Markdown / Text
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyExample(exampleContent)}
                  className="btn btn-sm btn-ghost border border-slate-200"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copied ? "Copied" : "Copy Template"}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadTemplate(
                      exampleContent,
                      `exam_paper_template.${exampleFormat === "json" ? "json" : exampleFormat === "csv" ? "csv" : "txt"}`,
                      exampleFormat === "json"
                        ? "application/json"
                        : exampleFormat === "csv"
                        ? "text/csv"
                        : "text/plain"
                    )
                  }
                  className="btn btn-sm btn-ghost border border-slate-200"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => useTemplate(exampleContent)}
                  className="btn btn-sm btn-primary"
                >
                  <Sparkles size={13} />
                  <span>Use This Template</span>
                </button>
              </div>
            </div>

            {/* Template Code Preview */}
            <div className="relative">
              <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs font-mono text-slate-200 leading-relaxed scroll-thin">
                {exampleContent}
              </pre>
            </div>

            {/* Format Reference Guide */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-indigo-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <HelpCircle size={14} className="text-indigo-600" /> Format Guide &amp; Supported Fields
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-800">
                • <strong>Sections</strong>: Organize questions under Section A, B, C... matching your blueprint.<br />
                • <strong>Types</strong>: MCQ, SHORT, LONG, CASE_STUDY, FILL_BLANK, TRUE_FALSE, VERY_SHORT.<br />
                • <strong>LaTeX Math</strong>: Formulas are supported inline via <code>$x^2 + 5x = 0$</code>.<br />
                • <strong>Chapters</strong>: Annotate with <code>chapterNumber</code> (e.g. 1) or <code>chapterTitle</code> (e.g. Chemical Reactions) to auto-balance blueprint chapter weightage.<br />
                • <strong>Case Studies</strong>: Include <code>subparts</code> with individual marks e.g. <code>(i), (ii), (iii)</code>.
              </p>
            </div>
          </div>
        )}

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 flex items-center justify-between border-t border-slate-200 bg-white/95 px-6 py-3.5 backdrop-blur-xs shadow-lg z-10">
          <div className="text-xs text-slate-500">
            {parseResult?.success ? (
              <span className="font-semibold text-slate-900">
                {parseResult.totalQuestions} Questions · {parseResult.totalMarks} Marks ·{" "}
                {parseResult.paper.sections.length} Sections
              </span>
            ) : (
              <span>Paste or upload a question paper to verify</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isSubmitting || !parseResult?.success || (verificationReport ? !verificationReport.canProceed : false)}
              className="btn btn-primary shadow-sm min-w-32"
            >
              {isSubmitting && <Spinner />}
              {isSubmitting
                ? "Importing…"
                : currentPaper
                ? "Import Questions"
                : "Import Paper & Open"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
