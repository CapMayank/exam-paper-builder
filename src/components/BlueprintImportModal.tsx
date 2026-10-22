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
  FileUp,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Field, Modal } from "@/components/ui";
import {
  BlueprintImportResult,
  SAMPLE_BLUEPRINT_CSV,
  SAMPLE_BLUEPRINT_JSON,
  SAMPLE_ENGLISH_BLUEPRINT_JSON,
  matchChaptersToBook,
  parseBlueprintImport,
} from "@/lib/blueprintImport";
import { groupSectionsFromFlat } from "@/lib/blueprint";
import {
  DEFAULT_ACADEMIC_SESSION,
  EXAM_TYPES,
  EXAM_TYPE_LABEL,
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
  type ExamType,
  type QuestionType,
} from "@/lib/constants";
import { normalizeQuestionType } from "@/lib/paperImport";
import { api } from "@/lib/client";
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
  initialTab?: "import" | "ai" | "examples";
}

export function BlueprintImportModal({
  isOpen,
  onClose,
  onApply,
  book,
  books = [],
  initialTab = "import",
}: BlueprintImportModalProps) {
  const [activeTab, setActiveTab] = useState<"import" | "ai" | "examples">(initialTab);
  const [internalBooks, setInternalBooks] = useState<Book[]>(books);
  const [inputText, setInputText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [exampleFormat, setExampleFormat] = useState<"json" | "csv">("json");
  const [exampleTemplate, setExampleTemplate] = useState<"science" | "english">("science");
  const [copied, setCopied] = useState(false);
  const [autoBalanceChapters, setAutoBalanceChapters] = useState(true);
  const [targetBookId, setTargetBookId] = useState<string>(book?.id || books[0]?.id || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Blueprint Creator state
  const [aiInputMode, setAiInputMode] = useState<"upload" | "text">("text");
  const [aiRawText, setAiRawText] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiFileBase64, setAiFileBase64] = useState<string | null>(null);
  const [aiMimeType, setAiMimeType] = useState<string>("application/pdf");
  const [aiAcademicSession, setAiAcademicSession] = useState(book?.academicSession || DEFAULT_ACADEMIC_SESSION);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiExtracted, setAiExtracted] = useState<{
    name: string;
    academicSession: string;
    examType: ExamType;
    durationMin: number;
    subjectCode: string;
    sections: Array<{
      title: string;
      instructions: string;
      type: QuestionType;
      count: number;
      marksEach: number;
    }>;
    chapters: Array<{
      chapterId: string;
      number: number;
      title: string;
      marks: number;
    }>;
  } | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (books.length > 0) {
      setInternalBooks(books);
    } else if (isOpen) {
      api<Book[]>("/api/books")
        .then((bks) => {
          setInternalBooks(bks);
          if (bks.length > 0 && !targetBookId) {
            setTargetBookId(bks[0].id);
          }
        })
        .catch(() => {});
    }
  }, [books, isOpen, targetBookId]);

  useEffect(() => {
    if (book?.id) {
      setTargetBookId(book.id);
    }
  }, [book?.id]);

  const activeBook = (internalBooks.length > 0 ? internalBooks.find((b) => b.id === targetBookId) : null) || book;

  // Auto-detect matching book from parsed text/name if user hasn't selected one
  useEffect(() => {
    if (!inputText.trim() || internalBooks.length === 0) return;
    const lower = inputText.toLowerCase();
    let bestBook: Book | null = null;
    let bestScore = 0;
    for (const b of internalBooks) {
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
  }, [inputText, internalBooks]);

  const handleAiFile = (f: File) => {
    setAiFile(f);
    setAiMimeType(f.type || "application/pdf");
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setAiFileBase64(res.split(",")[1]);
    };
    reader.readAsDataURL(f);
  };

  const handleAiAnalyze = async () => {
    if (!targetBookId) {
      setAiError("Please select a target book.");
      return;
    }
    if (aiInputMode === "upload" && !aiFileBase64) {
      setAiError("Please select or drop a blueprint circular image or PDF file.");
      return;
    }
    if (aiInputMode === "text" && !aiRawText.trim()) {
      setAiError("Please paste the marks scheme or blueprint text.");
      return;
    }

    setAiError(null);
    setAiAnalyzing(true);

    try {
      const payload: Record<string, unknown> = {
        bookId: targetBookId,
        academicSession: aiAcademicSession,
      };

      if (aiInputMode === "upload" && aiFile && aiFileBase64) {
        payload.fileData = aiFileBase64;
        payload.mimeType = aiMimeType || aiFile.type || "application/pdf";
      } else {
        payload.rawText = aiRawText.trim();
      }

      const res = await api<{
        success: boolean;
        data: {
          name: string;
          academicSession: string;
          examType: ExamType;
          durationMin: number;
          subjectCode: string;
          totalMarks: number;
          sections: Array<{
            title: string;
            instructions: string;
            type: string;
            count: number;
            marksEach: number;
          }>;
          chapters: Array<{ chapterId: string; marks: number }>;
        };
        book: {
          id: string;
          title: string;
          className: string;
          subject: string;
          chapters: Array<{ id: string; number: number; title: string }>;
        };
      }>("/api/ai/parse-blueprint", {
        method: "POST",
        json: payload,
      });

      if (!res.data) {
        throw new Error("AI could not extract blueprint information from this document.");
      }

      const bookChs = res.book.chapters || [];
      const extractedChMap = new Map((res.data.chapters || []).map((c) => [c.chapterId, Number(c.marks) || 0]));

      const mappedChapters = bookChs.map((bc) => ({
        chapterId: bc.id,
        number: bc.number,
        title: bc.title,
        marks: extractedChMap.get(bc.id) ?? 0,
      }));

      const mappedSections = (res.data.sections || []).map((s) => {
        let t = (s.type || "MCQ").trim().toUpperCase().replace(/[\s-]+/g, "_");
        if (t === "ONE_WORD" || t === "ONEWORD" || t === "VSA" || t === "ONE_LINE") {
          t = "VERY_SHORT";
        } else if (!QUESTION_TYPES.includes(t as QuestionType)) {
          t = normalizeQuestionType(t) as QuestionType;
          if (!QUESTION_TYPES.includes(t as QuestionType)) {
            t = "MCQ";
          }
        }
        return {
          title: s.title || "Section",
          instructions: s.instructions || "",
          type: t as QuestionType,
          count: Math.max(1, Number(s.count) || 1),
          marksEach: Math.max(1, Number(s.marksEach) || 1),
        };
      });

      setAiExtracted({
        name: res.data.name || `${res.book.className} ${res.book.subject} Annual Blueprint`,
        academicSession: res.data.academicSession || aiAcademicSession,
        examType: res.data.examType || "ANNUAL",
        durationMin: Number(res.data.durationMin) || 180,
        subjectCode: res.data.subjectCode || "",
        sections: mappedSections,
        chapters: mappedChapters,
      });
    } catch (err: any) {
      setAiError(err?.message || "Failed to analyze blueprint with AI.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const aiTotalSecMarks = useMemo(() => {
    if (!aiExtracted) return 0;
    return aiExtracted.sections.reduce((sum, s) => sum + (Number(s.count) || 0) * (Number(s.marksEach) || 0), 0);
  }, [aiExtracted]);

  const aiTotalChMarks = useMemo(() => {
    if (!aiExtracted) return 0;
    return aiExtracted.chapters.reduce((sum, c) => sum + (Number(c.marks) || 0), 0);
  }, [aiExtracted]);

  const handleAiAutoBalance = () => {
    if (!aiExtracted || aiExtracted.chapters.length === 0) return;
    const diff = aiTotalSecMarks - aiTotalChMarks;
    if (diff === 0) return;

    const updated = [...aiExtracted.chapters];
    updated[0] = { ...updated[0], marks: Math.max(0, updated[0].marks + diff) };
    setAiExtracted({
      ...aiExtracted,
      chapters: updated,
    });
  };

  const applyAiImport = () => {
    if (!aiExtracted) return;
    const marksRecord: Record<string, number> = {};
    aiExtracted.chapters.forEach((c) => {
      if (c.marks > 0) marksRecord[c.chapterId] = c.marks;
    });

    onApply({
      name: aiExtracted.name,
      examType: aiExtracted.examType,
      durationMin: aiExtracted.durationMin,
      academicSession: aiExtracted.academicSession,
      subjectCode: aiExtracted.subjectCode,
      bookId: targetBookId,
      sections: aiExtracted.sections.map((s) => ({
        title: s.title,
        instructions: s.instructions,
        type: s.type,
        count: s.count,
        marksEach: s.marksEach,
      })),
      chapterMarks: marksRecord,
    });
    onClose();
  };

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

  function getTemplateContent() {
    if (exampleTemplate === "english") return SAMPLE_ENGLISH_BLUEPRINT_JSON;
    return exampleFormat === "json" ? SAMPLE_BLUEPRINT_JSON : SAMPLE_BLUEPRINT_CSV;
  }

  function downloadSampleFile(format: "json" | "csv") {
    const content = getTemplateContent();
    const mimeType = format === "json" || exampleTemplate === "english" ? "application/json" : "text/csv";
    const extension = format === "json" || exampleTemplate === "english" ? "json" : "csv";
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample-${exampleTemplate}-blueprint.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyExample(format: "json" | "csv") {
    const text = getTemplateContent();
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
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "ai"
                  ? "bg-indigo-900 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80"
              }`}
            >
              <Sparkles size={14} className={activeTab === "ai" ? "text-amber-300" : "text-amber-500"} /> AI Blueprint Creator
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

        {activeTab === "ai" ? (
          /* AI Circular & Syllabus Blueprint Parser View */
          <div className="space-y-4">
            {!aiExtracted ? (
              <div className="space-y-4">
                {/* AI Guidance Header */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                    <Sparkles size={15} className="text-indigo-600" />
                    <span>AI Circular & Syllabus Blueprint Parser</span>
                  </div>
                  <p className="leading-relaxed">
                    Upload an official state or central board circular (PDF / Image) or paste syllabus marks distribution text
                    (such as <strong>MP Board, CBSE, ICSE, UP Board</strong>). Gemini AI extracts sections, multi-question formats, and distributes chapter marks automatically.
                  </p>
                </div>

                {/* Target Book & Academic Session Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/90 p-3 rounded-xl border border-slate-200">
                  <div className="sm:col-span-2">
                    <Field label="Target Book (Class & Subject)">
                      {internalBooks.length > 0 ? (
                        <select
                          value={targetBookId}
                          onChange={(e) => setTargetBookId(e.target.value)}
                          className="input py-1.5 px-2 text-xs"
                        >
                          {internalBooks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.className} · {b.subject} · {b.title} ({b.chapters.length} chapters)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="input py-1.5 px-2 text-xs text-slate-600 bg-white">
                          {activeBook ? `${activeBook.className} · ${activeBook.subject}` : "No book selected"}
                        </div>
                      )}
                    </Field>
                  </div>

                  <div>
                    <Field label="Academic Session">
                      <select
                        value={aiAcademicSession}
                        onChange={(e) => setAiAcademicSession(e.target.value)}
                        className="input py-1.5 px-2 text-xs"
                      >
                        {DEFAULT_ACADEMIC_SESSION && (
                          <option value={DEFAULT_ACADEMIC_SESSION}>{DEFAULT_ACADEMIC_SESSION}</option>
                        )}
                        <option value="2026–27">2026–27</option>
                        <option value="2025–26">2025–26</option>
                        <option value="2024–25">2024–25</option>
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Input Mode Switch */}
                <div className="flex gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setAiInputMode("upload")}
                    className={`btn btn-xs flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold ${
                      aiInputMode === "upload"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <FileUp size={13} /> Upload Circular (PDF / Image / Text)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiInputMode("text")}
                    className={`btn btn-xs flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold ${
                      aiInputMode === "text"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <FileText size={13} /> Paste Circular / Syllabus Text
                  </button>
                </div>

                {/* Upload or Text Content */}
                {aiInputMode === "upload" ? (
                  <div
                    onClick={() => aiFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleAiFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 p-6 text-center cursor-pointer transition"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {aiFile ? (
                          <span className="text-indigo-950 font-bold">📄 {aiFile.name} (Click to change)</span>
                        ) : (
                          <>Click to select or drop official blueprint PDF or image here</>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Supports PDF circulars, PNG, JPG, or TXT</p>
                    </div>
                    <input
                      ref={aiFileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleAiFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label htmlFor="ai-raw-blueprint-text" className="text-xs font-semibold text-slate-700 block">
                      Paste Blueprint / Marks Scheme Text:
                    </label>
                    <textarea
                      id="ai-raw-blueprint-text"
                      rows={9}
                      value={aiRawText}
                      onChange={(e) => setAiRawText(e.target.value)}
                      placeholder={`Paste marks scheme or syllabus text here. Example:\nBoard of Secondary Education, MP, Bhopal\nClass: 12, Subject: Biology, Marks: 70\nQ1: MCQ – 6 questions (1 mark each)\nQ2: Fill in blanks – 6 questions (1 mark each)\nQ3: True / False – 6 questions (1 mark each)\nQ4: Match column – 5 questions (1 mark each)\nQ5: One-word answer – 5 questions (1 mark each)\nQ6-12: Very short answer – 7 questions (2 marks each)\n...`}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {aiError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    {aiError}
                  </div>
                )}
              </div>
            ) : (
              /* Review Extracted Blueprint */
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Top bar with back button */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setAiExtracted(null)}
                    className="btn btn-xs btn-ghost border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-[11px]"
                  >
                    &larr; Extract another document
                  </button>
                  <span className="text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                    ✨ AI Extracted Blueprint
                  </span>
                </div>

                {/* Balance Status Banner */}
                <div
                  className={`rounded-xl p-3 border flex flex-wrap items-center justify-between gap-2 ${
                    aiTotalSecMarks === aiTotalChMarks && aiTotalSecMarks > 0
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                      : "bg-amber-50/80 border-amber-200 text-amber-950"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    {aiTotalSecMarks === aiTotalChMarks && aiTotalSecMarks > 0 ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    )}
                    <span>
                      <strong>Section Marks:</strong> {aiTotalSecMarks}m &nbsp;|&nbsp;{" "}
                      <strong>Chapter Weightage:</strong> {aiTotalChMarks}m
                    </span>
                    {aiTotalSecMarks === aiTotalChMarks && aiTotalSecMarks > 0 ? (
                      <span className="badge !bg-emerald-100 !text-emerald-800 text-[10px] font-bold ml-1">
                        ✓ Perfectly Balanced
                      </span>
                    ) : (
                      <span className="badge !bg-amber-100 !text-amber-900 text-[10px] font-bold ml-1">
                        Difference: {aiTotalSecMarks - aiTotalChMarks > 0 ? `+${aiTotalSecMarks - aiTotalChMarks}m` : `${aiTotalSecMarks - aiTotalChMarks}m`}
                      </span>
                    )}
                  </div>

                  {aiTotalSecMarks !== aiTotalChMarks && (
                    <button
                      type="button"
                      onClick={handleAiAutoBalance}
                      className="btn btn-sm bg-white border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold"
                    >
                      <RefreshCw size={12} /> Auto-Balance Remaining Marks
                    </button>
                  )}
                </div>

                {/* Basic Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div className="sm:col-span-2">
                    <Field label="Blueprint Title">
                      <input
                        className="input py-1 px-2 text-xs"
                        value={aiExtracted.name}
                        onChange={(e) =>
                          setAiExtracted({ ...aiExtracted, name: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <div>
                    <Field label="Exam Type">
                      <select
                        className="input py-1 px-2 text-xs"
                        value={aiExtracted.examType}
                        onChange={(e) =>
                          setAiExtracted({
                            ...aiExtracted,
                            examType: e.target.value as ExamType,
                          })
                        }
                      >
                        {EXAM_TYPES.map((et) => (
                          <option key={et} value={et}>
                            {EXAM_TYPE_LABEL[et] || et}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div>
                    <Field label="Duration (Minutes)">
                      <input
                        type="number"
                        min={10}
                        max={600}
                        className="input py-1 px-2 text-xs"
                        value={aiExtracted.durationMin}
                        onChange={(e) =>
                          setAiExtracted({
                            ...aiExtracted,
                            durationMin: Math.max(1, Number(e.target.value) || 180),
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>

                {/* Sections Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen size={14} className="text-indigo-600" />
                      Question Sections ({aiExtracted.sections.length} sections · {aiTotalSecMarks} Marks)
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setAiExtracted({
                          ...aiExtracted,
                          sections: [
                            ...aiExtracted.sections,
                            {
                              title: `Section ${String.fromCharCode(65 + (aiExtracted.sections.length % 26))}`,
                              instructions: "",
                              type: "MCQ",
                              count: 5,
                              marksEach: 1,
                            },
                          ],
                        })
                      }
                      className="btn btn-xs btn-secondary flex items-center gap-1 text-[11px]"
                    >
                      <Plus size={12} /> Add Section
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="py-2 px-3">Section Title</th>
                          <th className="py-2 px-3">Question Type</th>
                          <th className="py-2 px-3 w-20 text-center">Count</th>
                          <th className="py-2 px-3 w-24 text-center">Marks Each</th>
                          <th className="py-2 px-3 w-20 text-right">Subtotal</th>
                          <th className="py-2 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aiExtracted.sections.map((sec, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-1.5 px-3">
                              <input
                                className="input py-1 px-2 text-xs"
                                value={sec.title}
                                onChange={(e) => {
                                  const updated = [...aiExtracted.sections];
                                  updated[idx] = { ...updated[idx], title: e.target.value };
                                  setAiExtracted({ ...aiExtracted, sections: updated });
                                }}
                              />
                            </td>
                            <td className="py-1.5 px-3">
                              <select
                                className="input py-1 px-2 text-xs"
                                value={sec.type}
                                onChange={(e) => {
                                  const updated = [...aiExtracted.sections];
                                  updated[idx] = { ...updated[idx], type: e.target.value as QuestionType };
                                  setAiExtracted({ ...aiExtracted, sections: updated });
                                }}
                              >
                                {QUESTION_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {QUESTION_TYPE_LABEL[t] || t}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                className="input py-1 px-2 text-xs text-center w-16"
                                value={sec.count}
                                onChange={(e) => {
                                  const updated = [...aiExtracted.sections];
                                  updated[idx] = {
                                    ...updated[idx],
                                    count: Math.max(1, Number(e.target.value) || 1),
                                  };
                                  setAiExtracted({ ...aiExtracted, sections: updated });
                                }}
                              />
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                className="input py-1 px-2 text-xs text-center w-16"
                                value={sec.marksEach}
                                onChange={(e) => {
                                  const updated = [...aiExtracted.sections];
                                  updated[idx] = {
                                    ...updated[idx],
                                    marksEach: Math.max(1, Number(e.target.value) || 1),
                                  };
                                  setAiExtracted({ ...aiExtracted, sections: updated });
                                }}
                              />
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">
                              {(Number(sec.count) || 0) * (Number(sec.marksEach) || 0)}m
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {aiExtracted.sections.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = aiExtracted.sections.filter((_, i) => i !== idx);
                                    setAiExtracted({ ...aiExtracted, sections: updated });
                                  }}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Chapter Marks Distribution Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen size={14} className="text-emerald-600" />
                      Chapter-wise Marks Distribution ({aiTotalChMarks} Marks)
                    </h4>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-16">Ch #</th>
                          <th className="py-2 px-3">Chapter Title</th>
                          <th className="py-2 px-3 w-28 text-right">Marks Quota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aiExtracted.chapters.map((ch, idx) => (
                          <tr key={ch.chapterId} className="hover:bg-slate-50/60">
                            <td className="py-1.5 px-3 font-mono text-slate-500">{ch.number}</td>
                            <td className="py-1.5 px-3 font-medium text-slate-800">{ch.title}</td>
                            <td className="py-1.5 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="input py-1 px-2 text-xs text-right w-20 font-bold font-mono"
                                value={ch.marks}
                                onChange={(e) => {
                                  const updated = [...aiExtracted.chapters];
                                  updated[idx] = {
                                    ...updated[idx],
                                    marks: Math.max(0, Number(e.target.value) || 0),
                                  };
                                  setAiExtracted({ ...aiExtracted, chapters: updated });
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "examples" ? (
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

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setExampleTemplate("science")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    exampleTemplate === "science"
                      ? "bg-white text-indigo-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Class 10 Science (80M)
                </button>
                <button
                  type="button"
                  onClick={() => setExampleTemplate("english")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    exampleTemplate === "english"
                      ? "bg-white text-indigo-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Class 12 English Core (80M)
                </button>
              </div>

              <div className="flex items-center gap-2">
                {exampleTemplate === "science" && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setExampleFormat("json")}
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        exampleFormat === "json"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => setExampleFormat("csv")}
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        exampleFormat === "csv"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      CSV
                    </button>
                  </div>
                )}
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
                      <Copy size={13} /> Copy
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputText(getTemplateContent());
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
                {getTemplateContent()}
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
            ) : activeTab === "ai" ? (
              aiExtracted ? (
                <button
                  type="button"
                  onClick={applyAiImport}
                  className="btn btn-primary text-xs flex items-center gap-1.5 font-bold shadow-xs"
                >
                  <Sparkles size={14} />
                  Apply Blueprint to Editor ({aiTotalSecMarks}m)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAiAnalyze}
                  disabled={aiAnalyzing || (aiInputMode === "upload" ? !aiFileBase64 : !aiRawText.trim())}
                  className="btn btn-primary text-xs flex items-center gap-1.5 font-bold shadow-xs"
                >
                  {aiAnalyzing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Extracting Blueprint with AI…
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Extract Blueprint Structure &rarr;
                    </>
                  )}
                </button>
              )
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
