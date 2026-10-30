"use client";

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  FileText,
  FileUp,
  GraduationCap,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner, Field, Modal, Spinner, useToast } from "@/components/ui";
import { ACADEMIC_SESSIONS, DEFAULT_ACADEMIC_SESSION, EXAM_TYPES, EXAM_TYPE_LABEL, QUESTION_TYPES, QUESTION_TYPE_LABEL, type ExamType, type QuestionType } from "@/lib/constants";
import { normalizeQuestionType } from "@/lib/paperImport";
import { api } from "@/lib/client";
import type { Book, Blueprint } from "@/lib/types";

interface SectionDraft {
  title: string;
  instructions: string;
  type: string;
  count: number;
  marksEach: number;
}

interface ChapterDraft {
  chapterId: string;
  number: number;
  title: string;
  marks: number;
}

interface AIBlueprintModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (blueprint: Blueprint) => void;
  initialAcademicSession?: string;
}

export function AIBlueprintModal({
  open,
  onClose,
  onCreated,
  initialAcademicSession = DEFAULT_ACADEMIC_SESSION,
}: AIBlueprintModalProps) {
  const toast = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [academicSession, setAcademicSession] = useState<string>(initialAcademicSession);
  const [inputMode, setInputMode] = useState<"upload" | "text">("upload");
  const [rawText, setRawText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<1 | 2 | 3 | null>(null);
  const [saving, setSaving] = useState(false);
  const loading = analyzing || saving;
  const [error, setError] = useState<string | null>(null);

  // Extracted blueprint draft state for review & edit
  const [step, setStep] = useState<"input" | "review">("input");
  const [name, setName] = useState<string>("");
  const [examType, setExamType] = useState<ExamType>("ANNUAL");
  const [durationMin, setDurationMin] = useState<number>(180);
  const [subjectCode, setSubjectCode] = useState<string>("");
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [chapters, setChapters] = useState<ChapterDraft[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      api<Book[]>("/api/books")
        .then((bks) => {
          setBooks(bks);
          if (bks.length > 0 && !selectedBookId) {
            setSelectedBookId(bks[0].id);
          }
        })
        .catch((err) => setError(err.message));
    }
  }, [open, selectedBookId]);

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedBookId),
    [books, selectedBookId],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(",")[1];
      setFileBase64(base64);
    };
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(",")[1];
      setFileBase64(base64);
    };
    reader.readAsDataURL(f);
  };

  // Section marks calculation
  const totalSectionMarks = useMemo(
    () => sections.reduce((sum, s) => sum + (Number(s.count) || 0) * (Number(s.marksEach) || 0), 0),
    [sections],
  );

  // Chapter marks calculation
  const totalChapterMarks = useMemo(
    () => chapters.reduce((sum, c) => sum + (Number(c.marks) || 0), 0),
    [chapters],
  );

  const isBalanced = totalSectionMarks === totalChapterMarks && totalSectionMarks > 0;
  const marksDifference = totalSectionMarks - totalChapterMarks;

  const handleAnalyze = async () => {
    if (!selectedBookId) {
      setError("Please select a target book.");
      return;
    }
    if (inputMode === "upload" && !fileBase64) {
      setError("Please select or drop a blueprint circular image or PDF file.");
      return;
    }
    if (inputMode === "text" && !rawText.trim()) {
      setError("Please paste the marks scheme or blueprint text.");
      return;
    }

    setError(null);
    setAnalyzing(true);
    setAnalysisStage(1);

    const timer1 = setTimeout(() => {
      setAnalysisStage(2);
    }, 1200);

    const timer2 = setTimeout(() => {
      setAnalysisStage(3);
    }, 3200);

    try {
      const payload: Record<string, unknown> = {
        bookId: selectedBookId,
        academicSession,
      };

      if (inputMode === "upload" && file && fileBase64) {
        payload.fileData = fileBase64;
        payload.mimeType = file.type || "application/pdf";
      } else {
        payload.rawText = rawText.trim();
      }

      const res = await api<{
        success: boolean;
        isMock?: boolean;
        data: {
          name: string;
          academicSession: string;
          examType: ExamType;
          durationMin: number;
          subjectCode: string;
          totalMarks: number;
          sections: SectionDraft[];
          chapters: { chapterId: string; marks: number }[];
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

      setAnalysisStage(3);

      setName(res.data.name || `${res.book.className} ${res.book.subject} Annual Blueprint`);
      setExamType(res.data.examType || "ANNUAL");
      setDurationMin(Number(res.data.durationMin) || 180);
      setSubjectCode(res.data.subjectCode || "");
      setSections(
        (res.data.sections || []).map((s) => {
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
            type: t,
            count: Math.max(1, Number(s.count) || 1),
            marksEach: Math.max(1, Number(s.marksEach) || 1),
          };
        }),
      );

      // Map chapters
      const bookChs = res.book.chapters || [];
      const extractedChMap = new Map((res.data.chapters || []).map((c) => [c.chapterId, Number(c.marks) || 0]));

      setChapters(
        bookChs.map((bc) => ({
          chapterId: bc.id,
          number: bc.number,
          title: bc.title,
          marks: extractedChMap.get(bc.id) ?? 0,
        })),
      );

      setStep("review");
      toast.success("AI has successfully extracted the blueprint structure. Review and edit before saving.");
    } catch (err: any) {
      setError(err?.message || "Failed to analyze blueprint.");
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setAnalyzing(false);
      setAnalysisStage(null);
    }
  };

  const handleAutoBalance = () => {
    if (chapters.length === 0) return;
    const diff = totalSectionMarks - totalChapterMarks;
    if (diff === 0) return;

    // Distribute diff to the first chapter or split evenly
    const updated = [...chapters];
    updated[0].marks = Math.max(0, updated[0].marks + diff);
    setChapters(updated);
    toast.info(`Adjusted chapter marks to match total section marks (${totalSectionMarks}m).`);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a blueprint name.");
      return;
    }
    if (sections.length === 0) {
      setError("Please add at least one question section.");
      return;
    }
    if (!isBalanced) {
      setError(
        `Section marks (${totalSectionMarks}m) and chapter marks (${totalChapterMarks}m) must be equal. Click Auto-Balance to resolve.`,
      );
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        bookId: selectedBookId,
        academicSession,
        examType,
        durationMin: Number(durationMin) || 180,
        subjectCode: subjectCode.trim(),
        sections: sections.map((s) => {
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
            title: s.title.trim(),
            instructions: s.instructions.trim(),
            type: t,
            count: Number(s.count) || 1,
            marksEach: Number(s.marksEach) || 1,
          };
        }),
        chapters: chapters
          .filter((c) => c.marks > 0)
          .map((c) => ({
            chapterId: c.chapterId,
            marks: Number(c.marks),
          })),
      };

      const created = await api<Blueprint>("/api/blueprints", {
        method: "POST",
        json: payload,
      });

      toast.success(`Successfully created "${created.name}" (${totalSectionMarks} Marks).`);

      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save blueprint.");
    } finally {
      setSaving(false);
    }
  };

  const addSectionRow = () => {
    setSections([
      ...sections,
      {
        title: `Section ${String.fromCharCode(65 + (sections.length % 26))}`,
        instructions: "",
        type: "MCQ",
        count: 5,
        marksEach: 1,
      },
    ]);
  };

  const removeSectionRow = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  if (!open) return null;

  return (
    <Modal
      onClose={onClose}
      title="AI Blueprint Creator"
      size="xl"
      preventClose={loading}
    >
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        {step === "input" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-indigo-50/70 p-4 border border-indigo-100 flex items-start gap-3">
              <Sparkles size={20} className="text-indigo-600 mt-0.5 shrink-0" />
              <div className="text-xs text-indigo-950 space-y-1">
                <p className="font-bold text-sm text-indigo-900">
                  Instant Board Circular &amp; Marks Scheme Parser
                </p>
                <p className="text-indigo-800 leading-relaxed">
                  Upload an official MP Board circular, syllabus image (JPG/PNG), marks scheme PDF, or paste text.
                  Gemini Vision OCR will detect question sections, objective marks, word-limit classifications, and chapter weightages.
                </p>
              </div>
            </div>

            {/* Book & Session Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Target Class &amp; Subject Book">
                <select
                  className="input text-xs font-semibold"
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.className} &mdash; {b.subject} ({b.title})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Academic Session">
                <select
                  className="input text-xs"
                  value={academicSession}
                  onChange={(e) => setAcademicSession(e.target.value)}
                >
                  {ACADEMIC_SESSIONS.map((sess) => (
                    <option key={sess} value={sess}>
                      {sess}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Input Format Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setInputMode("upload")}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  inputMode === "upload"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileUp size={14} /> Upload Circular (PDF / Image)
              </button>
              <button
                type="button"
                onClick={() => setInputMode("text")}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  inputMode === "text"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText size={14} /> Paste Blueprint Text
              </button>
            </div>

            {inputMode === "upload" ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="rounded-full bg-white p-3 shadow-xs border border-slate-200 group-hover:border-indigo-300">
                  <Upload size={24} className="text-indigo-600" />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-800">
                  {file ? file.name : "Click to select or drag and drop official circular"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Supports MP Board Marks Scheme PDFs, Circular photos (PNG, JPG, WebP)
                </p>
                {file && (
                  <span className="badge !bg-emerald-50 !text-emerald-800 border border-emerald-200 mt-2 text-[10px] font-bold">
                    ✓ File loaded: {(file.size / 1024).toFixed(1)} KB ({file.type || "document"})
                  </span>
                )}
              </div>
            ) : (
              <div>
                <Field label="Blueprint / Marks Scheme Text">
                  <textarea
                    className="input min-h-[160px] text-xs font-mono"
                    placeholder="Paste the official board notification, sections, question counts, and chapter weightages here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                </Field>
              </div>
            )}

            {analyzing && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-3 anim-pop">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-950">
                  <span className="flex items-center gap-2">
                    <Sparkles size={15} className="text-indigo-600 animate-pulse" />
                    AI Blueprint Structure Extraction
                  </span>
                  <span className="text-indigo-600 font-mono text-[11px]">
                    Stage {analysisStage || 1} of 3
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Stage 1 */}
                  <div className="flex items-center gap-2.5">
                    {(analysisStage ?? 1) > 1 ? (
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    ) : (
                      <Loader2 size={15} className="text-indigo-600 animate-spin shrink-0" />
                    )}
                    <span
                      className={`font-medium ${
                        (analysisStage ?? 1) === 1
                          ? "text-indigo-950 font-bold"
                          : (analysisStage ?? 1) > 1
                          ? "text-emerald-800"
                          : "text-slate-400"
                      }`}
                    >
                      1. Uploading circular document...
                    </span>
                  </div>

                  {/* Stage 2 */}
                  <div className="flex items-center gap-2.5">
                    {(analysisStage ?? 1) > 2 ? (
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    ) : (analysisStage ?? 1) === 2 ? (
                      <Loader2 size={15} className="text-indigo-600 animate-spin shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-slate-300 ml-0.5 shrink-0" />
                    )}
                    <span
                      className={`font-medium ${
                        (analysisStage ?? 1) === 2
                          ? "text-indigo-950 font-bold"
                          : (analysisStage ?? 1) > 2
                          ? "text-emerald-800"
                          : "text-slate-400"
                      }`}
                    >
                      2. Analyzing syllabus structure with AI...
                    </span>
                  </div>

                  {/* Stage 3 */}
                  <div className="flex items-center gap-2.5">
                    {(analysisStage ?? 1) === 3 ? (
                      <Loader2 size={15} className="text-indigo-600 animate-spin shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-slate-300 ml-0.5 shrink-0" />
                    )}
                    <span
                      className={`font-medium ${
                        (analysisStage ?? 1) === 3
                          ? "text-indigo-950 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      3. Extracting sections and weightage...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={analyzing || (!file && !rawText.trim())}
                onClick={handleAnalyze}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                {analyzing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {analysisStage === 1
                      ? "Uploading circular document..."
                      : analysisStage === 2
                      ? "Analyzing syllabus structure with AI..."
                      : "Extracting sections and weightage..."}
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Extract Blueprint Structure &rarr;
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            {/* Header Balance Banner */}
            <div
              className={`rounded-xl p-3 border flex flex-wrap items-center justify-between gap-2 ${
                isBalanced
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : "bg-amber-50/80 border-amber-200 text-amber-950"
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                {isBalanced ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                )}
                <span>
                  <strong>Section Marks:</strong> {totalSectionMarks}m &nbsp;|&nbsp;{" "}
                  <strong>Chapter Weightage:</strong> {totalChapterMarks}m
                </span>
                {isBalanced ? (
                  <span className="badge !bg-emerald-100 !text-emerald-800 text-[10px] font-bold ml-1">
                    ✓ Perfectly Balanced
                  </span>
                ) : (
                  <span className="badge !bg-amber-100 !text-amber-900 text-[10px] font-bold ml-1">
                    Difference: {marksDifference > 0 ? `+${marksDifference}m` : `${marksDifference}m`}
                  </span>
                )}
              </div>

              {!isBalanced && (
                <button
                  type="button"
                  onClick={handleAutoBalance}
                  className="btn btn-sm bg-white border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold"
                >
                  <RefreshCw size={12} /> Auto-Balance Remaining Marks
                </button>
              )}
            </div>

            {/* Basic Blueprint Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <div className="sm:col-span-2">
                <Field label="Blueprint Title">
                  <input
                    className="input text-xs font-semibold"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
              </div>

              <div>
                <Field label="Exam Type">
                  <select
                    className="input text-xs"
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as ExamType)}
                  >
                    {EXAM_TYPES.map((et) => (
                      <option key={et} value={et}>
                        {EXAM_TYPE_LABEL[et]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div>
                <Field label="Duration (Minutes)">
                  <input
                    type="number"
                    min={15}
                    max={600}
                    className="input text-xs"
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value) || 180)}
                  />
                </Field>
              </div>
            </div>

            {/* Question Sections Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} className="text-indigo-600" />
                  Sections ({sections.length} sections &middot; {totalSectionMarks} Marks)
                </h3>
                <button
                  type="button"
                  onClick={addSectionRow}
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
                    {sections.map((sec, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-1.5 px-3">
                          <input
                            className="input py-1 px-2 text-xs"
                            value={sec.title}
                            onChange={(e) => {
                              const updated = [...sections];
                              updated[idx].title = e.target.value;
                              setSections(updated);
                            }}
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <select
                            className="input py-1 px-2 text-xs"
                            value={sec.type}
                            onChange={(e) => {
                              const updated = [...sections];
                              updated[idx].type = e.target.value;
                              setSections(updated);
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
                              const updated = [...sections];
                              updated[idx].count = Math.max(1, Number(e.target.value) || 1);
                              setSections(updated);
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
                              const updated = [...sections];
                              updated[idx].marksEach = Math.max(1, Number(e.target.value) || 1);
                              setSections(updated);
                            }}
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-700">
                          {sec.count * sec.marksEach}m
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            disabled={sections.length <= 1}
                            onClick={() => removeSectionRow(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chapters Marks Allocation Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap size={14} className="text-indigo-600" />
                Chapter-wise Marks Distribution ({totalChapterMarks} Marks)
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-[220px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-16">Ch #</th>
                      <th className="py-2 px-3">Chapter Title</th>
                      <th className="py-2 px-3 w-28 text-right">Marks Quota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chapters.map((ch, idx) => (
                      <tr key={ch.chapterId} className="hover:bg-slate-50/60">
                        <td className="py-1.5 px-3 font-semibold text-slate-500">
                          {ch.number}
                        </td>
                        <td className="py-1.5 px-3 font-medium text-slate-800">
                          {ch.title}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="input py-1 px-2 text-xs text-right w-20 inline-block font-bold text-indigo-700"
                            value={ch.marks}
                            onChange={(e) => {
                              const updated = [...chapters];
                              updated[idx].marks = Math.max(0, Number(e.target.value) || 0);
                              setChapters(updated);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep("input")}
                className="btn btn-secondary text-xs"
              >
                &larr; Back to Input
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || !isBalanced}
                  onClick={handleSave}
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Saving Blueprint…
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Save &amp; Create Blueprint
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
