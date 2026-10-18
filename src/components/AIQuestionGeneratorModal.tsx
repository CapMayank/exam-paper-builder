"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Key,
  Layers,
  Lightbulb,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { Modal, Spinner, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { MathText } from "./MathText";
import type { Book, Chapter } from "@/lib/types";

export interface GeneratedQuestionPayload {
  type: string;
  text: string;
  options: string[];
  subparts: Array<{ label: string; text: string; marks: number; answer: string }>;
  answer: string;
  marks: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  cognitiveLevel: string;
}

interface AIQuestionGeneratorModalProps {
  books: Book[];
  defaultBookId?: string;
  defaultChapterId?: string;
  defaultType?: string;
  defaultMarks?: number;
  onClose: () => void;
  onInsertQuestion: (q: GeneratedQuestionPayload, bookId?: string, chapterId?: string) => void;
}

type TabMode = "standard" | "case_study" | "assertion_reason";

export function AIQuestionGeneratorModal({
  books,
  defaultBookId,
  defaultChapterId,
  defaultType = "SHORT",
  defaultMarks = 3,
  onClose,
  onInsertQuestion,
}: AIQuestionGeneratorModalProps) {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabMode>(
    defaultType === "CASE_STUDY"
      ? "case_study"
      : defaultType === "ASSERTION_REASON"
      ? "assertion_reason"
      : "standard",
  );

  // Form selections
  const [selectedBookId, setSelectedBookId] = useState<string>(
    defaultBookId || books[0]?.id || "",
  );
  const selectedBook = books.find((b) => b.id === selectedBookId) || books[0];
  const chapters: Chapter[] = selectedBook?.chapters || [];

  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    defaultChapterId || chapters[0]?.id || "",
  );
  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];

  const [type, setType] = useState<string>(defaultType || "SHORT");
  const [marks, setMarks] = useState<number>(defaultMarks || 3);
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [cognitiveLevel, setCognitiveLevel] = useState<string>("APPLYING");
  const [language, setLanguage] = useState<"en" | "bilingual" | "hi">("en");
  const [topicContext, setTopicContext] = useState<string>("");

  // Case study specific state
  const [caseStudyMarks, setCaseStudyMarks] = useState<number>(4);

  // API Key management
  const [customKey, setCustomKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("exam_gemini_api_key") || "";
    }
    return "";
  });
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [serverModel, setServerModel] = useState<string>("");
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.hasEnvApiKey) {
          setHasServerKey(true);
        }
        if (data?.model) {
          setServerModel(data.model);
        }
      })
      .catch(() => {});
  }, []);

  // Generation state
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedQuestionPayload[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  function handleSaveApiKey(key: string) {
    setCustomKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("exam_gemini_api_key", key.trim());
    }
    setShowKeyInput(false);
    toast.success("Gemini API key saved locally in your browser");
  }

  async function handleGenerate() {
    if (!selectedChapter) {
      setError("Please select a book and chapter first.");
      return;
    }

    setBusy(true);
    setError(null);

    const questionType =
      activeTab === "case_study"
        ? "CASE_STUDY"
        : activeTab === "assertion_reason"
        ? "ASSERTION_REASON"
        : type;

    const questionMarks = activeTab === "case_study" ? caseStudyMarks : marks;

    try {
      const headers: Record<string, string> = {};
      if (customKey) {
        headers["x-gemini-api-key"] = customKey;
      }

      const res = await api<{
        success: boolean;
        isMock: boolean;
        data: GeneratedQuestionPayload[];
        error?: string;
      }>("/api/ai/generate-questions", {
        method: "POST",
        headers,
        json: {
          chapter: `${selectedChapter.number}. ${selectedChapter.title}`,
          className: selectedBook?.className || "Class 10",
          subject: selectedBook?.subject || "Science",
          type: questionType,
          marks: questionMarks,
          difficulty,
          cognitiveLevel,
          language,
          count: 1,
          topicContext: topicContext.trim() || undefined,
        },
      });

      if (!res.success && res.error) {
        setError(res.error);
        return;
      }

      const generated = res.data || [];
      if (generated.length === 0) {
        setError("No questions could be generated. Please try again with adjusted parameters.");
        return;
      }

      setResults(generated);
      setSelectedIndex(0);

      const isKeyActive = Boolean(customKey || hasServerKey);
      if (res.isMock) {
        if (res.error) {
          toast.info(`Offline Fallback: ${res.error}`);
        } else if (isKeyActive) {
          toast.info("Generated using Board-Aligned template.");
        } else {
          toast.info("Generated using Board-Aligned template (Free Gemini API key not detected).");
        }
      } else {
        toast.success("Generated question with Gemini AI!");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const activeQuestion = results[selectedIndex] || null;

  return (
    <Modal
      size="xl"
      title="✨ AI Question Authoring Co-Pilot"
      subtitle="Instantly generate board-standard questions, CBSE case studies, and assertion-reason items with Gemini"
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition ${
                customKey
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium"
                  : hasServerKey
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 font-medium"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              title="Configure free Gemini API Key from Google AI Studio"
            >
              <Key size={13} className={customKey || hasServerKey ? "text-emerald-600" : "text-amber-600"} />
              <span>
                {customKey
                  ? "Gemini Key: Active (Custom)"
                  : hasServerKey
                  ? `Gemini Key: Active (${serverModel ? serverModel.replace("models/", "") : "Server .env"})`
                  : "Add Free Gemini Key"}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            {activeQuestion ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onInsertQuestion(activeQuestion, selectedBook?.id, selectedChapter?.id);
                  onClose();
                }}
              >
                <Plus size={15} /> Use this question
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={busy || !selectedChapter}
              >
                {busy ? (
                  <>
                    <Spinner /> Generating with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Generate Question
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* API Key Drawer */}
        {showKeyInput && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2.5 text-xs text-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                <Key size={14} className="text-amber-700" /> Free Google Gemini API Key
              </span>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setShowKeyInput(false)}
              >
                <X size={14} />
              </button>
            </div>
            {hasServerKey && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>
                  <strong>Active in System:</strong> Connected via server <code>.env</code> ({serverModel ? serverModel.replace("models/", "") : "Gemini Flash"}). You can optionally override it with your own key below:
                </span>
              </div>
            )}
            <p className="text-slate-600 leading-relaxed">
              Get your free API key from{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-indigo-600 underline"
              >
                Google AI Studio
              </a>{" "}
              (1,500 requests/day 100% free, no credit card required).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                className="input text-xs font-mono"
                placeholder={hasServerKey ? "•••••••••••••••••••• (Using Server Key)" : "AIzaSy..."}
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-sm btn-primary shrink-0"
                onClick={() => handleSaveApiKey(customKey)}
              >
                Save key
              </button>
            </div>
          </div>
        )}

        {/* Tab Modes */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("standard");
              if (type === "CASE_STUDY" || type === "ASSERTION_REASON") setType("SHORT");
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              activeTab === "standard"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <BookOpen size={15} /> Standard Questions (MCQ, Short, Long)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("case_study")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              activeTab === "case_study"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Layers size={15} /> CBSE Case Study Passage
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("assertion_reason")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              activeTab === "assertion_reason"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Lightbulb size={15} /> Assertion-Reason Item
          </button>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs">
          {/* Textbook */}
          <label className="block">
            <span className="label">Textbook</span>
            <select
              className="input text-xs"
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(e.target.value);
                const b = books.find((x) => x.id === e.target.value);
                if (b?.chapters.length) setSelectedChapterId(b.chapters[0].id);
              }}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.className} · {b.subject})
                </option>
              ))}
            </select>
          </label>

          {/* Chapter */}
          <label className="block">
            <span className="label">Chapter</span>
            <select
              className="input text-xs"
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Ch {c.number}: {c.title}
                </option>
              ))}
            </select>
          </label>

          {/* Question Type (for standard tab) */}
          {activeTab === "standard" && (
            <label className="block">
              <span className="label">Question Type</span>
              <select
                className="input text-xs"
                value={type}
                onChange={(e) => {
                  const val = e.target.value;
                  setType(val);
                  if (val === "MCQ") setMarks(1);
                  else if (val === "SHORT") setMarks(3);
                  else if (val === "LONG") setMarks(5);
                }}
              >
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="SHORT">Short Answer</option>
                <option value="LONG">Long Answer</option>
                <option value="NUMERICAL">Numerical Problem</option>
              </select>
            </label>
          )}

          {/* Marks */}
          <label className="block">
            <span className="label">Marks</span>
            <input
              type="number"
              min={1}
              max={20}
              className="input text-xs"
              value={activeTab === "case_study" ? caseStudyMarks : marks}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (activeTab === "case_study") setCaseStudyMarks(val);
                else setMarks(val);
              }}
            />
          </label>

          {/* Difficulty */}
          <label className="block">
            <span className="label">Difficulty</span>
            <select
              className="input text-xs"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
            >
              <option value="EASY">Easy (Direct recall / foundational)</option>
              <option value="MEDIUM">Medium (Application & conceptual)</option>
              <option value="HARD">Hard (Multi-step / HOTS)</option>
            </select>
          </label>

          {/* Cognitive Level */}
          <label className="block">
            <span className="label">Bloom's Cognitive Level</span>
            <select
              className="input text-xs"
              value={cognitiveLevel}
              onChange={(e) => setCognitiveLevel(e.target.value)}
            >
              <option value="REMEMBERING">Remembering (Recall terms/facts)</option>
              <option value="UNDERSTANDING">Understanding (Explain/summarize)</option>
              <option value="APPLYING">Applying (Solve/calculate/predict)</option>
              <option value="ANALYZING">Analyzing (Examine/differentiate)</option>
              <option value="EVALUATING">Evaluating (Judge/justify)</option>
            </select>
          </label>

          {/* Language / Translation Mode */}
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="label">Language &amp; Script</span>
            <select
              className="input text-xs"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "bilingual" | "hi")}
            >
              <option value="en">English only</option>
              <option value="bilingual">Bilingual (English + Hindi Devanagari)</option>
              <option value="hi">Hindi (Devanagari)</option>
            </select>
          </label>

          {/* Custom Topic Focus */}
          <label className="block sm:col-span-2 lg:col-span-2">
            <span className="label">Subtopic Focus / Custom Prompt (optional)</span>
            <input
              type="text"
              className="input text-xs"
              placeholder="e.g. Focus on displacement reactions, redox with oxidation states"
              value={topicContext}
              onChange={(e) => setTopicContext(e.target.value)}
            />
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Live Generated Preview Result */}
        {activeQuestion && (
          <div className="space-y-3 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                  {activeQuestion.type} · {activeQuestion.marks} Mark{activeQuestion.marks > 1 ? "s" : ""}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {activeQuestion.difficulty}
                </span>
                <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                  {activeQuestion.cognitiveLevel}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost text-indigo-700 hover:text-indigo-900"
                onClick={handleGenerate}
                disabled={busy}
              >
                <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Regenerate
              </button>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Question Text</span>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-900 leading-relaxed">
                <MathText text={activeQuestion.text} />
              </div>
            </div>

            {/* MCQ Options */}
            {activeQuestion.options && activeQuestion.options.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Options</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activeQuestion.options.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isAnswer =
                      activeQuestion.answer?.toLowerCase().includes(opt.toLowerCase()) ||
                      activeQuestion.answer?.trim() === letter;
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
                          isAnswer
                            ? "border-emerald-300 bg-emerald-50 text-emerald-950 font-medium"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <span className="font-bold text-slate-400">({letter})</span>
                        <div className="flex-1">
                          <MathText text={opt} />
                        </div>
                        {isAnswer && <CheckCircle2 size={14} className="text-emerald-600 mt-0.5" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Case Study Subparts */}
            {activeQuestion.subparts && activeQuestion.subparts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Subparts ({activeQuestion.subparts.length})
                </span>
                <div className="space-y-2">
                  {activeQuestion.subparts.map((sp, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700">{sp.label}</span>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {sp.marks} mark{sp.marks > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="text-slate-800">
                        <MathText text={sp.text} />
                      </div>
                      {sp.answer && (
                        <div className="text-emerald-800 pt-1 border-t border-slate-200/60 font-mono text-[11px]">
                          <strong>Answer: </strong> {sp.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Model Answer & Step-wise Scheme */}
            {activeQuestion.answer && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Model Solution &amp; Step Marking Scheme
                </span>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-950 font-mono leading-relaxed whitespace-pre-wrap">
                  {activeQuestion.answer}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
