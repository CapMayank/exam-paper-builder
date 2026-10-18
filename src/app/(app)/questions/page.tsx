"use client";

import {
  AlertCircle,
  BookOpen,
  Check,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuestionForm } from "@/components/QuestionForm";
import { QuestionUsagePills } from "@/components/QuestionUsageHistory";
import { QuestionView } from "@/components/QuestionView";
import { AIQuestionGeneratorModal } from "@/components/AIQuestionGeneratorModal";
import { ErrorBanner, Field, Modal } from "@/components/ui";
import type { BatchImportReport } from "@/lib/batchQuestionIo";
import { parseBulkQuestions } from "@/lib/bulkImport";
import { api } from "@/lib/client";
import { DIFFICULTIES, QUESTION_TYPES, QUESTION_TYPE_LABEL, type QuestionType } from "@/lib/constants";
import type { Book, QuestionDto } from "@/lib/types";

const SAMPLE_CSV = `type,marks,text,answer,chapterNumber,difficulty,options,subparts
MCQ,1,"What is the SI unit of electric current?",B,1,EASY,"Volt|Ampere|Ohm|Watt",
SHORT,2,"State Ohm's Law and write formula $V = IR$.",V = IR,1,MEDIUM,,
CASE_STUDY,4,"Read the passage on electromagnetic induction and answer:","(i) 1m, (ii) 1m, (iii) 2m",1,HARD,,"(a) Define magnetic flux [1m] | (b) State Faraday's law [1m] | (c) Derive formula for induced EMF [2m]"`;

const SAMPLE_JSON = `[
  {
    "type": "MCQ",
    "marks": 1,
    "text": "What is the SI unit of electric current?",
    "options": ["Volt", "Ampere", "Ohm", "Watt"],
    "answer": "B",
    "difficulty": "EASY",
    "chapterNumber": 1
  },
  {
    "type": "SHORT",
    "marks": 2,
    "text": "State Ohm's Law and write formula $V = IR$.",
    "answer": "V = IR",
    "difficulty": "MEDIUM",
    "chapterNumber": 1
  },
  {
    "type": "CASE_STUDY",
    "marks": 4,
    "text": "Read the passage on electromagnetic induction and answer:",
    "difficulty": "HARD",
    "chapterNumber": 1,
    "subparts": [
      { "label": "(i)", "text": "Define magnetic flux.", "marks": 1 },
      { "label": "(ii)", "text": "State Faraday's law.", "marks": 1 },
      { "label": "(iii)", "text": "Derive formula for induced EMF.", "marks": 2 }
    ]
  }
]`;

const SAMPLE_TEMPLATE = `Type: MCQ
Q: What is the SI unit of electric current?
A: Volt
B: Ampere
C: Ohm
D: Watt
Ans: B
Diff: EASY

---

Type: SHORT
Q: State Newton's second law of motion and write its formula.
Ans: Force equals mass times acceleration ($F = ma$). Rate of change of momentum is proportional to applied force.
Space: 25
Diff: MEDIUM

---

Type: LONG
Q: Describe the process of photosynthesis with a balanced chemical equation.
Ans: Photosynthesis occurs in chloroplasts: $6CO_2 + 6H_2O \\rightarrow C_6H_{12}O_6 + 6O_2$. Chlorophyll absorbs sunlight to convert water and carbon dioxide into glucose and oxygen.
Space: 50
Diff: HARD`;

export default function QuestionsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [classFilter, setClassFilter] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [filters, setFilters] = useState({ bookId: "", chapterId: "", type: "", difficulty: "", q: "", freshness: "ALL" });
  const [editing, setEditing] = useState<QuestionDto | "new" | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Bulk import state
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkBookId, setBulkBookId] = useState("");
  const [bulkChapterId, setBulkChapterId] = useState("");
  const [bulkFallbackType, setBulkFallbackType] = useState<QuestionType>("SHORT");
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // M3 Import & Export Modal states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [aiGenModalOpen, setAiGenModalOpen] = useState(false);

  useEffect(() => {
    const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const urlClass = sp?.get("className") || "";
    const urlSubject = sp?.get("subject") || "";
    const urlBookId = sp?.get("bookId") || "";
    if (urlClass) setClassFilter(urlClass);
    if (urlSubject) setSubjectFilter(urlSubject);
    if (urlBookId) setFilters((f) => ({ ...f, bookId: urlBookId }));

    api<Book[]>("/api/books").then(
      (b) => {
        setBooks(b);
        if (b.length > 0) {
          const initialBook = (urlBookId && b.find((bk) => bk.id === urlBookId)) || b[0];
          setBulkBookId(initialBook.id);
          if (initialBook.chapters.length > 0) {
            setBulkChapterId(initialBook.chapters[0].id);
          }
        }
      },
      (e) => setError(e.message),
    );
  }, []);

  const availableClasses = useMemo(
    () => Array.from(new Set(books.map((b) => b.className))).sort(),
    [books]
  );

  const availableSubjects = useMemo(
    () =>
      Array.from(
        new Set(
          books
            .filter((b) => !classFilter || b.className.trim().toLowerCase() === classFilter.trim().toLowerCase())
            .map((b) => b.subject)
        )
      ).sort(),
    [books, classFilter]
  );

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (classFilter && b.className.trim().toLowerCase() !== classFilter.trim().toLowerCase()) return false;
      if (subjectFilter) {
        const a = b.subject.trim().toLowerCase();
        const s = subjectFilter.trim().toLowerCase();
        const aParts = a.split("/").map((x) => x.trim());
        const sParts = s.split("/").map((x) => x.trim());
        if (a !== s && !aParts.some((p) => sParts.includes(p))) return false;
      }
      return true;
    });
  }, [books, classFilter, subjectFilter]);

  const load = useCallback(async () => {
    const sp = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (k === "freshness") return;
      if (v) sp.set(k, v);
    });
    try {
      setQuestions(await api<QuestionDto[]>(`/api/questions?${sp}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200); // debounce search box
    return () => clearTimeout(t);
  }, [load]);

  const displayedQuestions = useMemo(() => {
    const allowedBookIds = new Set(filteredBooks.map((b) => b.id));
    return questions.filter((q) => {
      if ((classFilter || subjectFilter) && !filters.bookId && !allowedBookIds.has(q.bookId)) {
        return false;
      }
      if (filters.freshness === "FRESH") {
        return (q.timesUsed ?? q.usages?.length ?? 0) === 0;
      }
      if (filters.freshness === "USED") {
        return (q.timesUsed ?? q.usages?.length ?? 0) > 0;
      }
      return true;
    });
  }, [questions, filters.freshness, filters.bookId, classFilter, subjectFilter, filteredBooks]);

  const chapters = books.find((b) => b.id === filters.bookId)?.chapters ?? [];
  const set = (k: keyof typeof filters, v: string) =>
    setFilters((f) => ({ ...f, [k]: v, ...(k === "bookId" ? { chapterId: "" } : {}) }));

  async function remove(q: QuestionDto) {
    if (!confirm("Delete this question from the bank?")) return;
    setError(null);
    try {
      await api(`/api/questions/${q.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const parsedBulk = useMemo(() => parseBulkQuestions(bulkText, bulkFallbackType), [bulkText, bulkFallbackType]);
  const bulkBookChapters = books.find((b) => b.id === bulkBookId)?.chapters ?? [];

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedBulk.length === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      const res = await api<{ success: boolean; count: number; message: string }>("/api/questions/bulk", {
        method: "POST",
        json: {
          bookId: bulkBookId,
          chapterId: bulkChapterId,
          questions: parsedBulk,
        },
      });
      setBulkModal(false);
      setBulkText("");
      setInfoMessage(res.message);
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Question Bank</h1>
          <p className="text-xs text-slate-500">
            Store, categorize, and search curriculum questions with LaTeX math support.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Import Questions Button */}
          <button
            className="btn border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 shadow-2xs"
            disabled={books.length === 0}
            onClick={() => setImportModalOpen(true)}
            title="Import curriculum questions in bulk from CSV or JSON files"
          >
            <UploadCloud size={15} className="text-indigo-600" />
            <span>Import Questions</span>
          </button>

          {/* Export Questions Button */}
          <button
            className="btn border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
            disabled={questions.length === 0}
            onClick={() => setExportModalOpen(true)}
            title="Export current questions or entire book repository to CSV or JSON"
          >
            <Download size={15} className="text-slate-600" />
            <span>Export Questions</span>
          </button>

          {/* AI Question Co-Pilot */}
          <button
            className="btn border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 shadow-2xs font-medium"
            disabled={books.length === 0}
            onClick={() => setAiGenModalOpen(true)}
            title="AI Question Authoring: Generate CBSE questions, case studies, or assertion-reason with Gemini"
          >
            <Sparkles size={15} className="text-purple-600" />
            <span>AI Question Co-Pilot</span>
          </button>

          {/* New Question Button */}
          <button
            className="btn btn-primary"
            disabled={books.length === 0}
            onClick={() => setEditing("new")}
          >
            <Plus size={15} /> New Question
          </button>
        </div>
      </div>

      {books.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <p className="font-semibold">Books Required</p>
          <p className="mt-0.5">Please add a book and its chapters first before creating questions.</p>
        </div>
      )}

      <ErrorBanner message={error} />

      {infoMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span>{infoMessage}</span>
          </div>
          <button
            onClick={() => setInfoMessage(null)}
            className="font-bold text-emerald-700 hover:text-emerald-900 px-1"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs for Question Types */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
          <button
            onClick={() => set("type", "")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              filters.type === ""
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            All Types
          </button>
          {QUESTION_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => set("type", t)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                filters.type === t
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {QUESTION_TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        {/* Show Answers Toggle */}
        <button
          type="button"
          onClick={() => setShowAnswers(!showAnswers)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition shadow-2xs ${
            showAnswers
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {showAnswers ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-slate-400" />}
          <span>{showAnswers ? "Answers Visible" : "Show Answers & Rubric"}</span>
        </button>
      </div>

      {/* Detailed Hierarchy Filter Bar: Class -> Subject -> Book -> Chapter */}
      <div className="card grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 p-4 shadow-xs border-slate-200">
        <select
          className="input text-xs"
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setSubjectFilter("");
            setFilters((f) => ({ ...f, bookId: "", chapterId: "" }));
          }}
          aria-label="Class"
        >
          <option value="">All Classes</option>
          {availableClasses.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>

        <select
          className="input text-xs"
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setFilters((f) => ({ ...f, bookId: "", chapterId: "" }));
          }}
          aria-label="Subject"
        >
          <option value="">All Subjects</option>
          {availableSubjects.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>

        <select
          className="input text-xs"
          value={filters.bookId}
          onChange={(e) => set("bookId", e.target.value)}
          aria-label="Book"
        >
          <option value="">All Books ({filteredBooks.length})</option>
          {filteredBooks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.className} · {b.subject} — {b.title}
            </option>
          ))}
        </select>

        <select
          className="input text-xs"
          value={filters.chapterId}
          disabled={!filters.bookId}
          onChange={(e) => set("chapterId", e.target.value)}
          aria-label="Chapter"
        >
          <option value="">All Chapters</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              Ch {c.number}. {c.title}
            </option>
          ))}
        </select>

        <select
          className="input text-xs"
          value={filters.difficulty}
          onChange={(e) => set("difficulty", e.target.value)}
          aria-label="Difficulty"
        >
          <option value="">Any difficulty</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          className="input text-xs"
          value={filters.freshness}
          onChange={(e) => set("freshness", e.target.value)}
          aria-label="Freshness Filter"
        >
          <option value="ALL">All Freshness Status</option>
          <option value="FRESH">✨ Fresh Only (0 papers)</option>
          <option value="USED">🏷️ Previously Used</option>
        </select>

        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="input pl-8 text-xs"
            placeholder="Search questions by text or keyword…"
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
          />
          {filters.q && (
            <button
              onClick={() => set("q", "")}
              className="absolute right-2.5 top-2 text-xs font-bold text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Results Counter Tagline */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{displayedQuestions.length}</strong> question{displayedQuestions.length === 1 ? "" : "s"}
          {filters.bookId ? ` in selected syllabus` : ""}
          {filters.freshness === "FRESH" ? " · Fresh Only" : filters.freshness === "USED" ? " · Previously Used Only" : ""}
        </span>
        {filters.type && (
          <span className="badge !bg-indigo-50 !text-indigo-700 border border-indigo-100">
            Filtered by {QUESTION_TYPE_LABEL[filters.type as keyof typeof QUESTION_TYPE_LABEL]}
          </span>
        )}
      </div>

      {/* Question Cards List */}
      <ul className="space-y-3">
        {displayedQuestions.map((q) => {
          const diffBadgeClass =
            q.difficulty === "EASY"
              ? "!bg-emerald-50 !text-emerald-800 border-emerald-200"
              : q.difficulty === "MEDIUM"
              ? "!bg-amber-50 !text-amber-800 border-amber-200"
              : "!bg-purple-50 !text-purple-800 border-purple-200";

          return (
            <li
              key={q.id}
              className="card p-4 transition-all hover:border-slate-300 hover:shadow-xs border-slate-200/90"
            >
              <div className="paper-font text-sm leading-relaxed">
                <QuestionView q={q} showAnswer={showAnswers} />
              </div>

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge !bg-slate-100 text-slate-700 font-bold">
                    {QUESTION_TYPE_LABEL[q.type as keyof typeof QUESTION_TYPE_LABEL]}
                  </span>
                  <span className={`badge border font-semibold ${diffBadgeClass}`}>{q.difficulty}</span>
                  <span className="font-medium text-slate-600">
                    Ch {q.chapter?.number}. {q.chapter?.title}
                  </span>
                  <span className="text-slate-300">|</span>
                  {q.usages && q.usages.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-400">Used in:</span>
                      <QuestionUsagePills usages={q.usages} />
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Fresh (0 papers)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    className="btn btn-sm text-slate-700 hover:text-slate-900"
                    title="Edit question text, type, or answers"
                    onClick={() => setEditing(q)}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    title="Delete question from bank"
                    onClick={() => remove(q)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
        {displayedQuestions.length === 0 && (
          <li className="card p-12 text-center text-slate-500 space-y-3">
            <HelpCircle size={32} className="mx-auto text-slate-400" />
            <div className="font-semibold text-slate-700">No questions found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No questions matched your search criteria or the question bank is empty for this section.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>
                <Plus size={13} /> Add New Question
              </button>
              <button className="btn btn-sm" onClick={() => setBulkModal(true)}>
                <UploadCloud size={13} /> Bulk Import
              </button>
            </div>
          </li>
        )}
      </ul>

      {/* Edit / New Question Modal */}
      {editing && (
        <Modal
          title={
            editing === "new" || !editing.id
              ? "Add New Question to Bank"
              : "Edit Question"
          }
          subtitle="Define question text, options, answers, and space requirements."
          onClose={() => setEditing(null)}
          wide
        >
          <QuestionForm
            key={editing === "new" ? "new" : editing.id || "draft"}
            books={books}
            initial={editing === "new" ? undefined : editing}
            fixedBookId={editing === "new" ? (filters.bookId || undefined) : undefined}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void load();
            }}
          />
        </Modal>
      )}

      {/* Bulk Import Modal */}
      {bulkModal && (
        <Modal
          title="Bulk Question Ingestion"
          subtitle="Paste question papers, worksheets, or markdown to import dozens of questions at once."
          onClose={() => setBulkModal(false)}
          wide
        >
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Target Book">
                <select
                  className="input text-xs"
                  value={bulkBookId}
                  required
                  onChange={(e) => {
                    setBulkBookId(e.target.value);
                    const b = books.find((x) => x.id === e.target.value);
                    if (b?.chapters.length) setBulkChapterId(b.chapters[0].id);
                  }}
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.className} · {b.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Target Chapter">
                <select
                  className="input text-xs"
                  value={bulkChapterId}
                  required
                  onChange={(e) => setBulkChapterId(e.target.value)}
                >
                  {bulkBookChapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      Ch {c.number}. {c.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Default Question Type">
                <select
                  className="input text-xs"
                  value={bulkFallbackType}
                  onChange={(e) => setBulkFallbackType(e.target.value as QuestionType)}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="label !mb-0">Paste Questions (separate items with ---)</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                  onClick={() => setBulkText(SAMPLE_TEMPLATE)}
                >
                  Insert Sample Template
                </button>
              </div>
              <textarea
                className="input font-mono text-xs min-h-60 leading-relaxed"
                placeholder={SAMPLE_TEMPLATE}
                value={bulkText}
                required
                onChange={(e) => setBulkText(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs">
              <span className="text-slate-600 font-medium">
                Live Parser Status:{" "}
                <b className={parsedBulk.length > 0 ? "text-emerald-700" : "text-amber-700"}>
                  {parsedBulk.length} valid question{parsedBulk.length === 1 ? "" : "s"} detected
                </b>
              </span>
              <span className="text-slate-500">Supports KaTeX math: $E = mc^2$ or $$F=ma$$</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" className="btn" onClick={() => setBulkModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={bulkBusy || parsedBulk.length === 0 || !bulkChapterId}
              >
                {bulkBusy ? "Importing…" : `Import ${parsedBulk.length} Questions`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Batch Question Import Modal (CSV & JSON) */}
      {importModalOpen && (
        <QuestionImportModal
          books={books}
          defaultBookId={filters.bookId || books[0]?.id}
          defaultChapterId={filters.chapterId}
          onClose={() => setImportModalOpen(false)}
          onImportComplete={(msg) => {
            setInfoMessage(msg);
            void load();
          }}
        />
      )}

      {/* Batch Question Export Modal */}
      {exportModalOpen && (
        <QuestionExportModal
          books={books}
          activeFilters={filters}
          currentQuestionsCount={questions.length}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {/* AI Question Generator Co-Pilot Modal */}
      {aiGenModalOpen && (
        <AIQuestionGeneratorModal
          books={books}
          defaultBookId={filters.bookId || books[0]?.id}
          defaultChapterId={filters.chapterId}
          onClose={() => setAiGenModalOpen(false)}
          onInsertQuestion={(q, bookId, chapterId) => {
            const targetBookId = bookId || filters.bookId || books[0]?.id || "";
            const targetBook = books.find((b) => b.id === targetBookId) || books[0];
            const targetChapterId =
              chapterId ||
              (targetBook?.chapters.some((c) => c.id === filters.chapterId)
                ? filters.chapterId
                : targetBook?.chapters[0]?.id) ||
              "";
            const mappedType = (q.type === "ASSERTION_REASON" ? "MCQ" : q.type) as QuestionType;

            setEditing({
              id: "",
              bookId: targetBookId,
              chapterId: targetChapterId,
              type: mappedType,
              text: q.text,
              options: q.options || [],
              subparts: q.subparts || [],
              answer: q.answer || "",
              difficulty: q.difficulty,
              spaceMm: 0,
              showGrid: false,
              imagePath: null,
              createdAt: new Date().toISOString(),
            });
          }}
        />
      )}
    </div>
  );
}

export function QuestionImportModal({
  books,
  defaultBookId,
  defaultChapterId,
  onClose,
  onImportComplete,
}: {
  books: Book[];
  defaultBookId?: string;
  defaultChapterId?: string;
  onClose: () => void;
  onImportComplete: (message: string) => void;
}) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [bookId, setBookId] = useState<string>(defaultBookId || books[0]?.id || "");
  const [chapterId, setChapterId] = useState<string>(defaultChapterId || "");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [report, setReport] = useState<BatchImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBook = books.find((b) => b.id === bookId);
  const chapters = selectedBook?.chapters ?? [];

  async function validateContent(
    textToValidate: string,
    fmt: "csv" | "json",
    bId: string,
    cId: string,
    skipDup: boolean,
  ) {
    if (!textToValidate.trim()) {
      setReport(null);
      setError(null);
      return;
    }
    setError(null);
    try {
      const res = await api<BatchImportReport>("/api/questions/bulk", {
        method: "POST",
        json: {
          format: fmt,
          content: textToValidate,
          bookId: bId,
          chapterId: cId || undefined,
          skipDuplicates: skipDup,
          dryRun: true,
        },
      });
      setReport(res);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleFileChange(selectedFile: File) {
    setFile(selectedFile);
    setError(null);
    try {
      const text = await selectedFile.text();
      setContent(text);
      void validateContent(text, format, bookId, chapterId, skipDuplicates);
    } catch (e) {
      setError("Failed to read file: " + (e as Error).message);
    }
  }

  function downloadSampleTemplate(fmt: "csv" | "json") {
    const text = fmt === "csv" ? SAMPLE_CSV : SAMPLE_JSON;
    const mime = fmt === "csv" ? "text/csv;charset=utf-8;" : "application/json;charset=utf-8;";
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample-questions-template.${fmt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!content.trim() || !bookId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<BatchImportReport>("/api/questions/bulk", {
        method: "POST",
        json: {
          format,
          content,
          bookId,
          chapterId: chapterId || undefined,
          skipDuplicates,
        },
      });
      onImportComplete(
        `Imported ${res.validCount} questions. ${res.duplicateCount} duplicates skipped. ${res.errorCount} errors.`,
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Batch Question Ingestion"
      subtitle="Import question banks via CSV or JSON with validation and duplicate prevention."
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        {/* Format Selector Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              format === "csv"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => {
              setFormat("csv");
              setContent("");
              setFile(null);
              setReport(null);
            }}
          >
            CSV Format (.csv)
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              format === "json"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => {
              setFormat("json");
              setContent("");
              setFile(null);
              setReport(null);
            }}
          >
            JSON Format (.json)
          </button>
        </div>

        {/* Target Scope Selection */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Target Book &amp; Syllabus">
            <select
              className="input text-xs"
              value={bookId}
              onChange={(e) => {
                setBookId(e.target.value);
                setChapterId("");
                if (content.trim()) {
                  void validateContent(content, format, e.target.value, "", skipDuplicates);
                }
              }}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.className} · {b.title} ({b.subject})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Target Chapter (Fallback)">
            <select
              className="input text-xs"
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
                if (content.trim()) {
                  void validateContent(content, format, bookId, e.target.value, skipDuplicates);
                }
              }}
            >
              <option value="">Auto-map from file (by Chapter No. or Title)</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Ch {c.number}. {c.title}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Duplicate Handling Guardrail */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs">
          <div>
            <span className="font-semibold text-slate-800">Duplicate Question Prevention</span>
            <p className="text-slate-500 mt-0.5">
              Identifies existing questions in the same syllabus with identical normalized text.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => {
                setSkipDuplicates(e.target.checked);
                if (content.trim()) {
                  void validateContent(content, format, bookId, chapterId, e.target.checked);
                }
              }}
              className="rounded text-indigo-600"
            />
            <span>Skip Duplicates</span>
          </label>
        </div>

        {/* Input Mode Toggle: Upload vs Paste */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-md transition ${
                inputMode === "file" ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setInputMode("file")}
            >
              Upload File
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-md transition ${
                inputMode === "paste" ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setInputMode("paste")}
            >
              Paste Raw Data
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-indigo-600">
            <button
              type="button"
              onClick={() => downloadSampleTemplate(format)}
              className="hover:underline flex items-center gap-1"
            >
              <Download size={12} /> Download Sample {format.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Upload Dropzone */}
        {inputMode === "file" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped) void handleFileChange(dropped);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
              isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 bg-slate-50/50 hover:bg-slate-50"
            }`}
          >
            <UploadCloud size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              {file ? file.name : `Drag and drop your .${format} file here, or click to browse`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : `Supports standard .${format} files with LaTeX math`}
            </p>
            <input
              type="file"
              accept={format === "csv" ? ".csv,text/csv" : ".json,application/json"}
              className="hidden"
              id="batch-file-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileChange(f);
              }}
            />
            <label htmlFor="batch-file-input" className="btn btn-sm mt-3 inline-block cursor-pointer">
              {file ? "Replace File" : "Select File"}
            </label>
          </div>
        ) : (
          <textarea
            className="input font-mono text-xs min-h-48 leading-relaxed"
            placeholder={
              format === "csv"
                ? 'type,marks,text,answer,chapterNumber,difficulty,options\nMCQ,1,"What is the SI unit of current?",B,1,EASY,"Volt|Ampere|Ohm|Watt"'
                : '[{\n  "type": "MCQ",\n  "marks": 1,\n  "text": "What is the SI unit of current?",\n  "options": ["Volt", "Ampere", "Ohm", "Watt"],\n  "answer": "B",\n  "difficulty": "EASY",\n  "chapterNumber": 1\n}]'
            }
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              void validateContent(e.target.value, format, bookId, chapterId, skipDuplicates);
            }}
          />
        )}

        <ErrorBanner message={error} />

        {/* Validation Report & Diagnostics */}
        {report && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            {/* KPI Counter Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 text-xs">
              <span className="font-semibold text-slate-800">Validation Status</span>
              <div className="flex items-center gap-2">
                <span className="badge !bg-slate-100 text-slate-700">Total: {report.totalRows}</span>
                <span className="badge !bg-emerald-50 !text-emerald-700 border border-emerald-200">
                  Valid: {report.validCount}
                </span>
                {report.duplicateCount > 0 && (
                  <span className="badge !bg-amber-50 !text-amber-700 border border-amber-200">
                    Duplicates: {report.duplicateCount}
                  </span>
                )}
                {report.errorCount > 0 && (
                  <span className="badge !bg-red-50 !text-red-700 border border-red-200">
                    Errors: {report.errorCount}
                  </span>
                )}
              </div>
            </div>

            {/* Line-by-Line Error Table */}
            {report.errors.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                  Syntax &amp; Schema Issues ({report.errors.length}):
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50/40 text-xs">
                  <table className="w-full text-left">
                    <thead className="border-b border-red-200 bg-red-100/50 text-[11px] font-bold text-red-900">
                      <tr>
                        <th className="p-2 w-16">Row #</th>
                        <th className="p-2 w-24">Field</th>
                        <th className="p-2">Error Description</th>
                        <th className="p-2 w-32">Snippet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-200/60 font-mono text-[11px]">
                      {report.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-red-100/30">
                          <td className="p-2 font-bold text-red-900">{err.rowNumber}</td>
                          <td className="p-2 text-red-800">{err.field}</td>
                          <td className="p-2 text-red-700 font-sans">{err.error}</td>
                          <td className="p-2 text-slate-500 truncate max-w-[120px]" title={err.rawContent}>
                            {err.rawContent ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !content.trim() || (report ? report.validCount === 0 : false)}
            onClick={handleImport}
          >
            {busy ? "Importing…" : report ? `Import ${report.validCount} Questions` : "Import Questions"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function QuestionExportModal({
  books,
  activeFilters,
  currentQuestionsCount,
  onClose,
}: {
  books: Book[];
  activeFilters: { bookId: string; chapterId: string; type: string; difficulty: string };
  currentQuestionsCount: number;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [scope, setScope] = useState<"current_view" | "book">("current_view");
  const [bookId, setBookId] = useState<string>(activeFilters.bookId || books[0]?.id || "");
  const [isExporting, setIsExporting] = useState(false);

  async function handleDownload() {
    setIsExporting(true);
    try {
      const sp = new URLSearchParams();
      sp.set("format", format);
      if (scope === "current_view") {
        if (activeFilters.bookId) sp.set("bookId", activeFilters.bookId);
        if (activeFilters.chapterId) sp.set("chapterId", activeFilters.chapterId);
        if (activeFilters.type) sp.set("type", activeFilters.type);
        if (activeFilters.difficulty) sp.set("difficulty", activeFilters.difficulty);
      } else {
        sp.set("bookId", bookId);
      }

      const res = await fetch(`/api/questions/export?${sp.toString()}`);
      if (!res.ok) throw new Error("Export failed: " + res.statusText);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `questions-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Modal title="Export Questions" subtitle="Download questions for offline backup or migration." onClose={onClose}>
      <div className="space-y-4">
        <Field label="Export Format">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              className={`p-3 rounded-lg border text-left font-semibold transition ${
                format === "csv" ? "border-indigo-600 bg-indigo-50/50 text-indigo-900" : "border-slate-200"
              }`}
              onClick={() => setFormat("csv")}
            >
              CSV Spreadsheet (.csv)
              <p className="text-[11px] font-normal text-slate-500 mt-0.5">Compatible with Excel & Google Sheets</p>
            </button>
            <button
              type="button"
              className={`p-3 rounded-lg border text-left font-semibold transition ${
                format === "json" ? "border-indigo-600 bg-indigo-50/50 text-indigo-900" : "border-slate-200"
              }`}
              onClick={() => setFormat("json")}
            >
              Structured JSON (.json)
              <p className="text-[11px] font-normal text-slate-500 mt-0.5">Preserves full subparts & option arrays</p>
            </button>
          </div>
        </Field>

        <Field label="Export Scope">
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                checked={scope === "current_view"}
                onChange={() => setScope("current_view")}
              />
              <span>Current Search &amp; Filter Results ({currentQuestionsCount} questions)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                checked={scope === "book"}
                onChange={() => setScope("book")}
              />
              <span>Entire Book Repository</span>
            </label>
          </div>
        </Field>

        {scope === "book" && (
          <Field label="Select Book">
            <select className="input text-xs" value={bookId} onChange={(e) => setBookId(e.target.value)}>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.className} · {b.title}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={isExporting} onClick={handleDownload}>
            {isExporting ? "Generating Export…" : "Download File"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
