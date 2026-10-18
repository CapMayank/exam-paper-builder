"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCode,
  FileSpreadsheet,
  HelpCircle,
  Sparkles,
  Upload,
} from "lucide-react";
import { Modal } from "@/components/ui";
import {
  BlueprintImportResult,
  SAMPLE_BLUEPRINT_CSV,
  SAMPLE_BLUEPRINT_JSON,
  matchChaptersToBook,
  parseBlueprintImport,
} from "@/lib/blueprintImport";
import { groupSectionsFromFlat } from "@/lib/blueprint";
import { QUESTION_TYPE_LABEL } from "@/lib/constants";
import type { Book } from "@/lib/types";

interface BlueprintImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: {
    name: string;
    examType: string;
    durationMin: number;
    academicSession?: string;
    subjectCode?: string;
    bookId?: string;
    sections: {
      title: string;
      type: string;
      count: number;
      marksEach: number;
      instructions: string;
    }[];
    chapterMarks?: Record<string, number>;
  }) => void;
  book?: Book;
  books?: Book[];
}

export function BlueprintImportModal({
  isOpen,
  onClose,
  onApply,
  book,
  books = [],
}: BlueprintImportModalProps) {
  const [activeTab, setActiveTab] = useState<"import" | "examples">("import");
  const [inputText, setInputText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [exampleFormat, setExampleFormat] = useState<"json" | "csv">("json");
  const [copied, setCopied] = useState(false);
  const [autoBalanceChapters, setAutoBalanceChapters] = useState(true);
  const [targetBookId, setTargetBookId] = useState<string>(book?.id || books[0]?.id || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (book?.id) {
      setTargetBookId(book.id);
    }
  }, [book?.id]);

  const activeBook = books.find((b) => b.id === targetBookId) || book;

  // Auto-detect matching book from parsed text/name if user hasn't selected one
  useEffect(() => {
    if (!inputText.trim() || books.length === 0) return;
    const lower = inputText.toLowerCase();
    let bestBook: Book | null = null;
    let bestScore = 0;
    for (const b of books) {
      let score = 0;
      const subj = b.subject.toLowerCase().split("/")[0].trim();
      const cls = b.className.toLowerCase();
      if (subj && lower.includes(subj)) score += 10;
      if (cls && lower.includes(cls)) score += 5;
      if (b.chapters.length >= 6) score += 2;
      if (score > bestScore) {
        bestScore = score;
        bestBook = b;
      }
    }
    if (bestBook && bestScore > 0) {
      setTargetBookId(bestBook.id);
    }
  }, [inputText, books]);

  if (!isOpen) return null;

  const parseResult: BlueprintImportResult | null = inputText.trim()
    ? parseBlueprintImport(inputText, "auto")
    : null;

  const matched =
    parseResult?.success && activeBook?.chapters
      ? matchChaptersToBook(parseResult.blueprint.chapters, activeBook.chapters)
      : null;

  function handleFileUpload(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      setInputText(text);
    };
    reader.readAsText(file);
  }

  function downloadSampleFile(format: "json" | "csv") {
    const content = format === "json" ? SAMPLE_BLUEPRINT_JSON : SAMPLE_BLUEPRINT_CSV;
    const mimeType = format === "json" ? "application/json" : "text/csv";
    const extension = format === "json" ? "json" : "csv";
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample-blueprint.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyExample(format: "json" | "csv") {
    const text = format === "json" ? SAMPLE_BLUEPRINT_JSON : SAMPLE_BLUEPRINT_CSV;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function applyImport() {
    if (!parseResult || !parseResult.success) return;
    const { blueprint } = parseResult;

    let finalChapterMarks: Record<string, number> = matched?.marksMap ? { ...matched.marksMap } : {};
    if (activeBook && activeBook.chapters.length > 0 && autoBalanceChapters) {
      const currentSum = Object.values(finalChapterMarks).reduce((a, b) => a + b, 0);
      const targetTotal = parseResult.totalSectionMarks;
      if (currentSum !== targetTotal) {
        const n = activeBook.chapters.length;
        const base = Math.floor(targetTotal / n);
        const remainder = targetTotal % n;
        finalChapterMarks = {};
        activeBook.chapters.forEach((c, idx) => {
          finalChapterMarks[c.id] = base + (idx < remainder ? 1 : 0);
        });
      }
    }

    onApply({
      name: blueprint.name,
      examType: blueprint.examType,
      durationMin: blueprint.durationMin,
      academicSession: blueprint.academicSession,
      subjectCode: blueprint.subjectCode,
      bookId: activeBook?.id,
      sections: blueprint.sections,
      chapterMarks: finalChapterMarks,
    });
    onClose();
  }

  return (
    <Modal title="Import Blueprint & Exam Specification" onClose={onClose} size="xl">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "import"
                  ? "bg-indigo-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Upload size={14} /> Upload & Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("examples")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "examples"
                  ? "bg-indigo-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <HelpCircle size={14} /> Example Formats & Templates
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 mr-1">Download templates:</span>
            <button
              type="button"
              onClick={() => downloadSampleFile("json")}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-2xs"
              title="Download Sample JSON Template"
            >
              <FileCode size={13} className="text-amber-600" /> JSON
            </button>
            <button
              type="button"
              onClick={() => downloadSampleFile("csv")}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition shadow-2xs"
              title="Download Sample CSV Template (Excel friendly)"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" /> CSV
            </button>
          </div>
        </div>

        {activeTab === "examples" ? (
          /* Example Formats & Documentation View */
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                <BookOpen size={15} className="text-indigo-600" />
                <span>Blueprint Specification Formats</span>
              </div>
              <p>
                You can import blueprints using standard <strong>JSON</strong> or <strong>CSV</strong> (Excel compatible).
                Both formats configure exam metadata, multi-question-type sections, question counts, and chapter weightages in a single click.
              </p>
              <div className="rounded-lg border border-indigo-200/80 bg-white/90 p-2.5 text-indigo-950">
                <strong className="font-semibold text-xs block mb-1">✨ Multi-Question-Type Sections:</strong>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  A single section (such as <strong>Section A</strong>) can contain multiple question types (e.g. 5 MCQ + 5 Fill in Blank + 5 True/False + 5 One-Word).
                  In <strong>JSON</strong>, nest them inside the section's <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">"questionTypes": [ ... ]</code> array.
                  In <strong>CSV</strong>, repeat the section title across rows (e.g. multiple rows titled <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">Section A</code>) or leave the title empty on continuation rows.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExampleFormat("json")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    exampleFormat === "json"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  JSON Format
                </button>
                <button
                  type="button"
                  onClick={() => setExampleFormat("csv")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    exampleFormat === "csv"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  CSV Format (Excel)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyExample(exampleFormat)}
                  className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copy format
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputText(exampleFormat === "json" ? SAMPLE_BLUEPRINT_JSON : SAMPLE_BLUEPRINT_CSV);
                    setActiveTab("import");
                  }}
                  className="flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 shadow-2xs"
                >
                  <Sparkles size={13} className="text-indigo-600" /> Load into editor
                </button>
              </div>
            </div>

            <div className="relative rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-100 shadow-inner max-h-[360px] overflow-y-auto">
              <pre className="whitespace-pre overflow-x-auto leading-relaxed">
                {exampleFormat === "json" ? SAMPLE_BLUEPRINT_JSON : SAMPLE_BLUEPRINT_CSV}
              </pre>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <strong className="text-slate-900 block mb-1.5">Supported Question Types:</strong>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: "MCQ", label: "Multiple choice" },
                    { code: "FILL_BLANK", label: "Fill in the blank" },
                    { code: "TRUE_FALSE", label: "True / False" },
                    { code: "SHORT", label: "Short answer / One word" },
                    { code: "LONG", label: "Long answer" },
                    { code: "CASE_STUDY", label: "Case study" },
                    { code: "DRAW", label: "Draw / diagram" },
                  ].map((qt) => (
                    <span
                      key={qt.code}
                      className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] border border-slate-200 text-slate-800"
                      title={qt.label}
                    >
                      <code className="font-bold text-indigo-600">{qt.code}</code>
                      <span className="text-slate-500">· {qt.label}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <strong className="text-slate-900 block mb-1.5">Supported Exam Types:</strong>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: "ANNUAL", label: "Annual" },
                    { code: "HALF_YEARLY", label: "Half Yearly" },
                    { code: "QUARTERLY", label: "Quarterly" },
                    { code: "PERIODIC", label: "Periodic (PT)" },
                    { code: "UNIT_TEST", label: "Unit Test (UT)" },
                  ].map((et) => (
                    <span
                      key={et.code}
                      className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] border border-slate-200 text-slate-800"
                    >
                      <code className="font-bold text-indigo-600">{et.code}</code>
                      <span className="text-slate-500">· {et.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Import / Upload View */
          <div className="space-y-4">
            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/70 hover:bg-indigo-50/30 p-5 text-center cursor-pointer transition"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <Upload size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  {fileName ? (
                    <span className="text-indigo-900 font-bold">📄 {fileName} (Click to change)</span>
                  ) : (
                    <>Click to browse or drop blueprint file here</>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Supports .json, .csv, or plain text</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </div>

            {/* Paste Text Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="blueprint-data-input" className="font-semibold text-slate-700">
                  Or Paste Blueprint JSON or CSV Data:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInputText(SAMPLE_BLUEPRINT_JSON);
                      setFileName("sample-blueprint.json");
                    }}
                    className="text-[11px] font-medium text-indigo-600 hover:underline"
                  >
                    Paste sample JSON
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setInputText(SAMPLE_BLUEPRINT_CSV);
                      setFileName("sample-blueprint.csv");
                    }}
                    className="text-[11px] font-medium text-emerald-600 hover:underline"
                  >
                    Paste sample CSV
                  </button>
                </div>
              </div>
              <textarea
                id="blueprint-data-input"
                rows={6}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setFileName(null);
                }}
                placeholder="Paste JSON or CSV blueprint specification here..."
                className="input font-mono text-xs w-full leading-relaxed"
              />
            </div>

            {/* Validation & Preview Output */}
            {parseResult && (
              <div className="space-y-3 pt-2">
                {parseResult.errors.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-red-950">
                      <AlertCircle size={14} className="text-red-600" />
                      <span>Parsing Errors</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {parseResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {parseResult.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <AlertCircle size={14} className="text-amber-600" />
                      <span>Notice</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {parseResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {parseResult.success && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">
                          {parseResult.blueprint.name || "Untitled Blueprint"}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>Exam: <strong>{parseResult.blueprint.examType}</strong></span>
                          <span>•</span>
                          <span>Duration: <strong>{parseResult.blueprint.durationMin} mins</strong></span>
                          {parseResult.blueprint.academicSession && (
                            <>
                              <span>•</span>
                              <span>Session: <strong>{parseResult.blueprint.academicSession}</strong></span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="badge badge-indigo text-xs font-semibold px-2.5 py-1">
                          {parseResult.totalSectionMarks} Total Marks
                        </span>
                        <span className="badge text-xs font-medium px-2 py-1">
                          {parseResult.totalQuestions} Questions
                        </span>
                      </div>
                    </div>

                    {/* Sections Preview (Grouped by Section) */}
                    <div>
                      {(() => {
                        const grouped = groupSectionsFromFlat(parseResult.blueprint.sections);
                        return (
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                              <span>
                                Sections ({grouped.length} {grouped.length === 1 ? "section" : "sections"} · {parseResult.blueprint.sections.length} question types)
                              </span>
                              <span className="text-[11px] font-normal text-slate-500">
                                {parseResult.totalSectionMarks} section marks
                              </span>
                            </div>
                            <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 text-xs divide-y divide-slate-100 bg-white shadow-2xs">
                              {grouped.map((grp, gIdx) => {
                                const grpTotalMarks = grp.questionTypes.reduce((s, qt) => s + qt.count * qt.marksEach, 0);
                                const grpTotalQs = grp.questionTypes.reduce((s, qt) => s + qt.count, 0);
                                return (
                                  <div key={grp.key || gIdx} className="p-2.5 space-y-1.5 hover:bg-slate-50/50">
                                    <div className="flex items-center justify-between font-semibold text-slate-900">
                                      <span className="text-xs">{grp.title}</span>
                                      <span className="badge badge-indigo text-[10px]">
                                        {grpTotalQs} Qs · {grpTotalMarks} Marks
                                      </span>
                                    </div>
                                    {grp.instructions && (
                                      <p className="text-[11px] text-slate-500 italic line-clamp-1">
                                        {grp.instructions}
                                      </p>
                                    )}
                                    <div className="space-y-1 pt-0.5">
                                      {grp.questionTypes.map((qt, qIdx) => (
                                        <div
                                          key={qt.key || qIdx}
                                          className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span className="badge text-[10px] py-0 px-1.5 bg-white border border-slate-200 font-medium">
                                              {QUESTION_TYPE_LABEL[qt.type as keyof typeof QUESTION_TYPE_LABEL] || qt.type}
                                            </span>
                                            <span className="text-slate-500">
                                              {qt.count} questions × {qt.marksEach}m
                                            </span>
                                          </div>
                                          <span className="font-semibold text-slate-800">
                                            = {qt.count * qt.marksEach}m
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Target Book & Chapter Quotas */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-700">Target Book:</span>
                          {books.length > 0 ? (
                            <select
                              value={targetBookId}
                              onChange={(e) => setTargetBookId(e.target.value)}
                              className="input py-1 px-2 text-xs font-normal"
                            >
                              {books.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.className} · {b.subject} · {b.title} ({b.chapters.length} ch)
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-600 font-normal">
                              {activeBook ? `${activeBook.className} · ${activeBook.subject}` : "None"}
                            </span>
                          )}
                        </div>

                        {activeBook && matched && (
                          <span className="text-emerald-700 text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 size={13} /> {matched.matchedCount} of {activeBook.chapters.length} chapters matched
                          </span>
                        )}
                      </div>

                      {activeBook && (
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={autoBalanceChapters}
                            onChange={(e) => setAutoBalanceChapters(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600"
                          />
                          <span>
                            Auto-balance chapter marks to match total ({parseResult.totalSectionMarks}m)
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <button type="button" onClick={onClose} className="btn btn-ghost text-xs">
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {activeTab === "examples" ? (
              <button
                type="button"
                onClick={() => {
                  setInputText(exampleFormat === "json" ? SAMPLE_BLUEPRINT_JSON : SAMPLE_BLUEPRINT_CSV);
                  setActiveTab("import");
                }}
                className="btn btn-primary text-xs"
              >
                Use this template
              </button>
            ) : (
              <button
                type="button"
                onClick={applyImport}
                disabled={!parseResult || !parseResult.success}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                {parseResult && parseResult.success
                  ? `Apply Blueprint (${parseResult.totalSectionMarks}m)`
                  : "Apply Blueprint"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
