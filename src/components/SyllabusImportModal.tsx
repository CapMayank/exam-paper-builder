"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckSquare,
  Download,
  Edit2,
  FileCode,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Modal, Spinner, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { useAcademicSession } from "@/lib/academicSession";
import type { Book } from "@/lib/types";
import {
  parseSyllabusContent,
  STANDARD_CURRICULUM_PRESETS,
  type StandardCurriculumPreset,
  type ParsedBookItem,
  type ParsedChapterItem,
} from "@/lib/syllabusImport";

type ImportFormat = "preset" | "rollover" | "ai_scan" | "text" | "csv" | "json";

interface EditableChapter extends ParsedChapterItem {
  id: string; // unique key for React
  selected: boolean;
}

interface EditableBook {
  title: string;
  className: string;
  subject: string;
  chapters: EditableChapter[];
}

interface SyllabusImportModalProps {
  onClose: () => void;
  onSuccess: (result: { bookId?: string }) => void;
  targetBook?: { id: string; title: string; className: string; subject: string } | null;
  initialTab?: ImportFormat;
}

const SAMPLE_TEXT_SYLLABUS = `1. Chemical Reactions and Equations (रासायनिक अभिक्रियाएँ एवं समीकरण)
2. Acids, Bases and Salts (अम्ल, क्षारक एवं लवण)
3. Metals and Non-metals (धातु एवं अधातु)
4. Carbon and its Compounds (कार्बन एवं उसके यौगिक)
5. Life Processes (जैव प्रक्रम)
6. Control and Coordination (नियंत्रण एवं समन्वय)
7. How do Organisms Reproduce? (जीव जनन कैसे करते हैं?)
8. Heredity (आनुवंशिकता)
9. Light - Reflection and Refraction (प्रकाश - परावर्तन तथा अपवर्तन)
10. The Human Eye and the Colourful World (मानव नेत्र तथा रंगबिरंगा संसार)
11. Electricity (विद्युत)
12. Magnetic Effects of Electric Current (विद्युत धारा के चुंबकीय प्रभाव)
13. Our Environment (हमारा पर्यावरण)`;

const SAMPLE_CSV_FULL = `Book,Class,Subject,Chapter,Title
Science (NCERT),Class 10,Science,1,"Chemical Reactions and Equations"
Science (NCERT),Class 10,Science,2,"Acids, Bases and Salts"
Science (NCERT),Class 10,Science,3,"Metals and Non-metals"
Science (NCERT),Class 10,Science,4,"Carbon and its Compounds"
Science (NCERT),Class 10,Science,5,"Life Processes"`;

const SAMPLE_CSV_CHAPTERS_ONLY = `Chapter,Title
1,"Chemical Reactions and Equations"
2,"Acids, Bases and Salts"
3,"Metals and Non-metals"
4,"Carbon and its Compounds"
5,"Life Processes"`;

const SAMPLE_JSON = JSON.stringify(
  [
    {
      title: "Science (NCERT Class X)",
      className: "Class 10",
      subject: "Science",
      chapters: [
        { number: 1, title: "Chemical Reactions and Equations" },
        { number: 2, title: "Acids, Bases and Salts" },
        { number: 3, title: "Metals and Non-metals" },
        { number: 4, title: "Carbon and its Compounds" },
        { number: 5, title: "Life Processes" },
      ],
    },
  ],
  null,
  2,
);

const SAMPLE_AI_INDEX = `TABLE OF CONTENTS
UNIT 1: Prose & Poetry
Chapter 1: A Letter to God - G.L. Fuentes (pg 3)
Dust of Snow & Fire and Ice (Poetry) (pg 14)
Chapter 2: Nelson Mandela: Long Walk to Freedom (pg 16)
A Tiger in the Zoo (pg 24)
Chapter 3: Two Stories about Flying (pg 32)
His First Flight & Black Aeroplane
Chapter 4: From the Diary of Anne Frank (pg 48)

UNIT 2: Supplementary Reader (Footprints)
1. A Triumph of Surgery - James Herriot (pg 1)
2. The Thief's Story - Ruskin Bond (pg 8)
3. The Midnight Visitor - Robert Arthur (pg 14)
4. A Question of Trust - Victor Canning (pg 20)`;

export function SyllabusImportModal({ onClose, onSuccess, targetBook, initialTab }: SyllabusImportModalProps) {
  const toast = useToast();
  const fileInputId = useId();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ImportFormat>(initialTab || (targetBook ? "text" : "preset"));

  // Preset Filters
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [filterSubject, setFilterSubject] = useState<string>("ALL");
  const [filterCompositeOnly, setFilterCompositeOnly] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("cbse-10-science");

  // Raw Content Inputs
  const [textContent, setTextContent] = useState<string>(SAMPLE_TEXT_SYLLABUS);
  const [csvContent, setCsvContent] = useState<string>(targetBook ? SAMPLE_CSV_CHAPTERS_ONLY : SAMPLE_CSV_FULL);
  const [jsonContent, setJsonContent] = useState<string>(SAMPLE_JSON);

  // AI Scanner State
  const [aiRawText, setAiRawText] = useState<string>(SAMPLE_AI_INDEX);
  const [aiClass, setAiClass] = useState<string>(targetBook?.className || "Class 10");
  const [aiSubject, setAiSubject] = useState<string>(targetBook?.subject || "English");
  const [aiBusy, setAiBusy] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Academic Session Context
  const { currentSession, availableSessions } = useAcademicSession();

  // Rollover State
  const [existingBooks, setExistingBooks] = useState<Book[]>([]);
  const [selectedRolloverBookId, setSelectedRolloverBookId] = useState<string>("");
  const [rolloverTargetSession, setRolloverTargetSession] = useState<string>(currentSession);
  const [rolloverTitle, setRolloverTitle] = useState<string>("");
  const [rolloverIncludeQuestions, setRolloverIncludeQuestions] = useState<boolean>(false);

  useEffect(() => {
    api<Book[]>("/api/books").then(
      (data) => {
        setExistingBooks(data);
        if (data.length > 0 && !selectedRolloverBookId) {
          setSelectedRolloverBookId(data[0].id);
          setRolloverTitle(data[0].title);
        }
      },
      () => {},
    );
  }, []);

  // Update rolloverTitle when selectedRolloverBookId changes
  useEffect(() => {
    if (selectedRolloverBookId) {
      const b = existingBooks.find((book) => book.id === selectedRolloverBookId);
      if (b) {
        setRolloverTitle(b.title);
      }
    }
  }, [selectedRolloverBookId, existingBooks]);

  // Metadata Defaults
  const [defaultTitle, setDefaultTitle] = useState<string>(targetBook?.title || "NCERT Science");
  const [defaultClass, setDefaultClass] = useState<string>(targetBook?.className || "Class 10");
  const [defaultSubject, setDefaultSubject] = useState<string>(targetBook?.subject || "Science");
  const [upsert, setUpsert] = useState<boolean>(true);

  // Editable Books State (Interactive Checklist & Customizer)
  const [editableBooks, setEditableBooks] = useState<EditableBook[]>([]);

  // Submission State
  const [busy, setBusy] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filtered Presets
  const filteredPresets = useMemo(() => {
    return STANDARD_CURRICULUM_PRESETS.filter((p) => {
      if (filterClass !== "ALL" && p.className !== filterClass) return false;
      if (filterSubject !== "ALL" && !p.subject.toLowerCase().includes(filterSubject.toLowerCase())) return false;
      if (filterCompositeOnly && !p.isComposite) return false;
      return true;
    });
  }, [filterClass, filterSubject, filterCompositeOnly]);

  // Sync parsed content to editableBooks whenever raw input or preset changes
  useEffect(() => {
    let sourceBooks: ParsedBookItem[] = [];

    if (activeTab === "rollover") {
      const book = existingBooks.find((b) => b.id === selectedRolloverBookId);
      if (book) {
        sourceBooks = [
          {
            title: rolloverTitle.trim() || book.title,
            className: book.className,
            subject: book.subject,
            chapters: book.chapters,
          },
        ];
      }
    } else if (activeTab === "preset") {
      const preset = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === selectedPresetId);
      if (preset) {
        sourceBooks = [
          {
            title: preset.title,
            className: preset.className,
            subject: preset.subject,
            chapters: preset.chapters,
          },
        ];
      }
    } else if (activeTab === "text") {
      const res = parseSyllabusContent("text", textContent, {
        defaultTitle: defaultTitle.trim() || undefined,
        defaultClass: defaultClass.trim() || undefined,
        defaultSubject: defaultSubject.trim() || undefined,
      });
      sourceBooks = res.books;
    } else if (activeTab === "csv") {
      const res = parseSyllabusContent("csv", csvContent, {
        defaultTitle: defaultTitle.trim() || undefined,
        defaultClass: defaultClass.trim() || undefined,
        defaultSubject: defaultSubject.trim() || undefined,
      });
      sourceBooks = res.books;
    } else if (activeTab === "json") {
      const res = parseSyllabusContent("json", jsonContent, {
        defaultTitle: defaultTitle.trim() || undefined,
        defaultClass: defaultClass.trim() || undefined,
        defaultSubject: defaultSubject.trim() || undefined,
      });
      sourceBooks = res.books;
    }

    if (sourceBooks.length > 0) {
      setEditableBooks(
        sourceBooks.map((b, bIdx) => ({
          title: b.title,
          className: b.className,
          subject: b.subject,
          chapters: b.chapters.map((c, cIdx) => ({
            number: c.number,
            title: c.title,
            id: `b${bIdx}_c${cIdx}_${c.number}`,
            selected: true,
          })),
        })),
      );
    }
  }, [
    activeTab,
    selectedPresetId,
    selectedRolloverBookId,
    existingBooks,
    textContent,
    csvContent,
    jsonContent,
    defaultTitle,
    defaultClass,
    defaultSubject,
  ]);

  // AI Scanner Handler
  async function handleAiScan() {
    if (!aiRawText.trim() || aiRawText.trim().length < 5) {
      setAiError("Please paste some table of contents or syllabus text to scan.");
      return;
    }
    setAiBusy(true);
    setAiError(null);
    try {
      const headers: Record<string, string> = {};
      const customKey = typeof window !== "undefined" ? localStorage.getItem("exam_gemini_api_key") : null;
      if (customKey) headers["x-gemini-api-key"] = customKey;

      const res = await api<{
        success: boolean;
        isMock: boolean;
        data: {
          bookTitle: string;
          className: string;
          subject: string;
          isComposite: boolean;
          books: Array<{
            title: string;
            className: string;
            subject: string;
            chapters: Array<{ number: number; title: string }>;
          }>;
        };
        error?: string;
      }>("/api/ai/parse-syllabus", {
        method: "POST",
        headers,
        json: {
          rawText: aiRawText,
          className: aiClass,
          subject: aiSubject,
        },
      });

      if (!res.success && res.error) {
        setAiError(res.error);
        return;
      }

      const scannedBooks = res.data?.books || [];
      if (scannedBooks.length === 0) {
        setAiError("No chapters could be identified from the text. Please check the text format.");
        return;
      }

      setEditableBooks(
        scannedBooks.map((b, bIdx) => ({
          title: b.title,
          className: b.className,
          subject: b.subject,
          chapters: b.chapters.map((c, cIdx) => ({
            number: c.number,
            title: c.title,
            id: `ai_b${bIdx}_c${cIdx}_${c.number}`,
            selected: true,
          })),
        })),
      );

      toast.success(
        `AI successfully extracted ${scannedBooks.reduce((sum, b) => sum + b.chapters.length, 0)} chapters across ${scannedBooks.length} book(s)!`,
      );
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  // Chapter Toggle Handlers
  function toggleChapter(bookIdx: number, chapterId: string) {
    setEditableBooks((prev) =>
      prev.map((b, bIdx) => {
        if (bIdx !== bookIdx) return b;
        return {
          ...b,
          chapters: b.chapters.map((c) => (c.id === chapterId ? { ...c, selected: !c.selected } : c)),
        };
      }),
    );
  }

  function selectAllChapters(selected: boolean) {
    setEditableBooks((prev) =>
      prev.map((b) => ({
        ...b,
        chapters: b.chapters.map((c) => ({ ...c, selected })),
      })),
    );
  }

  function updateChapterTitle(bookIdx: number, chapterId: string, newTitle: string) {
    setEditableBooks((prev) =>
      prev.map((b, bIdx) => {
        if (bIdx !== bookIdx) return b;
        return {
          ...b,
          chapters: b.chapters.map((c) => (c.id === chapterId ? { ...c, title: newTitle } : c)),
        };
      }),
    );
  }

  function addCustomChapter(bookIdx: number) {
    setEditableBooks((prev) =>
      prev.map((b, bIdx) => {
        if (bIdx !== bookIdx) return b;
        const nextNum = b.chapters.length > 0 ? Math.max(...b.chapters.map((c) => c.number)) + 1 : 1;
        return {
          ...b,
          chapters: [
            ...b.chapters,
            {
              id: `custom_${Date.now()}_${nextNum}`,
              number: nextNum,
              title: `Chapter ${nextNum}: New Topic`,
              selected: true,
            },
          ],
        };
      }),
    );
  }

  function deleteChapter(bookIdx: number, chapterId: string) {
    setEditableBooks((prev) =>
      prev.map((b, bIdx) => {
        if (bIdx !== bookIdx) return b;
        return {
          ...b,
          chapters: b.chapters.filter((c) => c.id !== chapterId),
        };
      }),
    );
  }

  // Count selected chapters
  const totalChapters = useMemo(() => {
    return editableBooks.reduce((acc, b) => acc + b.chapters.length, 0);
  }, [editableBooks]);

  const selectedChaptersCount = useMemo(() => {
    return editableBooks.reduce((acc, b) => acc + b.chapters.filter((c) => c.selected).length, 0);
  }, [editableBooks]);

  // Handle CSV file upload
  function handleCsvFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvContent(text);
        toast.info(`Loaded ${file.name} (${text.length} chars)`);
      }
    };
    reader.readAsText(file);
  }

  function downloadCsvTemplate() {
    const content = targetBook ? SAMPLE_CSV_CHAPTERS_ONLY : SAMPLE_CSV_FULL;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", targetBook ? "chapters_template.csv" : "syllabus_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Perform Final Import
  async function handleImport() {
    setApiError(null);
    if (selectedChaptersCount === 0) {
      setApiError("Please select at least one chapter using the checkboxes before importing.");
      return;
    }

    setBusy(true);
    try {
      if (activeTab === "rollover" && selectedRolloverBookId) {
        const bookToRoll = editableBooks[0];
        const selectedChapters = bookToRoll?.chapters.filter((c) => c.selected) ?? [];
        if (selectedChapters.length === 0) {
          setApiError("Please select at least one chapter to roll over.");
          setBusy(false);
          return;
        }
        const rolled = await api<{ id: string }>("/api/books/rollover", {
          method: "POST",
          json: {
            sourceBookId: selectedRolloverBookId,
            targetAcademicSession: rolloverTargetSession,
            title: (rolloverTitle.trim() || bookToRoll.title).trim(),
            chapters: selectedChapters.map((c) => ({ number: c.number, title: c.title.trim() })),
            includeQuestions: rolloverIncludeQuestions,
          },
        });
        toast.success(`Textbook successfully rolled over into Session ${rolloverTargetSession}!`);
        onSuccess({ bookId: rolled.id });
        return;
      }

      // Build customBooks payload containing ONLY selected and edited chapters
      const booksToImport = editableBooks
        .map((b) => ({
          title: b.title.trim(),
          className: b.className.trim(),
          subject: b.subject.trim(),
          academicSession: currentSession,
          chapters: b.chapters
            .filter((c) => c.selected)
            .map((c) => ({
              number: c.number,
              title: c.title.trim(),
            })),
        }))
        .filter((b) => b.chapters.length > 0);

      const payload = {
        format: "custom" as const,
        content: "",
        targetBookId: targetBook ? targetBook.id : null,
        defaults: {
          defaultTitle: defaultTitle.trim() || undefined,
          defaultClass: defaultClass.trim() || undefined,
          defaultSubject: defaultSubject.trim() || undefined,
          academicSession: currentSession,
        },
        customBooks: booksToImport,
        dryRun: false,
        upsert,
      };

      const res = await api<{
        success: boolean;
        mode: string;
        book?: { id: string };
        bookIds?: string[];
        createdBooks?: number;
        updatedBooks?: number;
        createdChapters?: number;
        updatedChapters?: number;
        warnings?: string[];
      }>("/api/books/import", {
        method: "POST",
        json: payload,
      });

      if (res.warnings && res.warnings.length > 0) {
        toast.info(res.warnings[0]);
      }

      if (targetBook) {
        toast.success(
          `Imported ${res.createdChapters ?? selectedChaptersCount} chapters into "${targetBook.title}".`,
        );
        onSuccess({ bookId: targetBook.id });
      } else {
        const primaryId = res.bookIds?.[0] || res.book?.id;
        toast.success(
          `Imported ${res.createdBooks ?? booksToImport.length} textbook(s) with ${selectedChaptersCount} selected chapters!`,
        );
        onSuccess({ bookId: primaryId });
      }
      onClose();
    } catch (err) {
      setApiError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      size="xl"
      title={targetBook ? `Import chapters into "${targetBook.title}"` : "Textbook & Syllabus Management"}
      subtitle={
        targetBook
          ? `Append or update chapters for ${targetBook.className} · ${targetBook.subject}`
          : "Official CBSE/NCERT presets, AI Index scanner for private publishers, and multi-book composite exams"
      }
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            {selectedChaptersCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <Check size={14} className="text-emerald-600" />
                {selectedChaptersCount} of {totalChapters} chapter(s) selected
              </span>
            ) : (
              <span className="text-amber-700 font-medium">Select chapters below to proceed</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn" onClick={onClose} disabled={busy || aiBusy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={busy || aiBusy || selectedChaptersCount === 0}
            >
              {busy ? (
                <>
                  <Spinner /> Importing...
                </>
              ) : (
                `Import Selected (${selectedChaptersCount} Chapters)`
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("preset")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "preset"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <BookOpen size={14} /> Official CBSE / NCERT Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rollover")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "rollover"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <RotateCcw size={14} className="text-emerald-600" /> Rollover from Previous Session / Books
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai_scan")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "ai_scan"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Sparkles size={14} className="text-purple-600" /> AI Table of Contents Scanner (Private Books)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "text"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <FileText size={14} /> Paste Text
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("csv")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "csv"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <FileSpreadsheet size={14} /> CSV / Spreadsheet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "json"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <FileCode size={14} /> JSON
          </button>
        </div>

        {/* TAB 1: OFFICIAL PRESETS (WITH GRANULAR FILTERS) */}
        {activeTab === "preset" && (
          <div className="space-y-3">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Filter size={13} className="text-slate-500" /> Filter:
              </div>
              {/* Class Filter */}
              <select
                className="input py-1 px-2 text-xs"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="ALL">All Classes (1–12)</option>
                <option value="Class 12">Class 12</option>
                <option value="Class 11">Class 11</option>
                <option value="Class 10">Class 10</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 7">Class 7</option>
                <option value="Class 6">Class 6</option>
                <option value="Class 5">Class 5</option>
                <option value="Class 4">Class 4</option>
                <option value="Class 3">Class 3</option>
                <option value="Class 2">Class 2</option>
                <option value="Class 1">Class 1</option>
              </select>

              {/* Subject Filter */}
              <select
                className="input py-1 px-2 text-xs"
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
              >
                <option value="ALL">All Subjects</option>
                <option value="Science">Science</option>
                <option value="Math">Mathematics</option>
                <option value="English">English</option>
                <option value="Social">Social Science</option>
                <option value="Hindi">Hindi</option>
                <option value="Sanskrit">Sanskrit</option>
                <option value="EVS">EVS / पर्यावरण</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="Accountancy">Accountancy</option>
                <option value="Business">Business Studies</option>
                <option value="Economics">Economics</option>
                <option value="Computer">Computer / IT</option>
              </select>

              {/* Multi-Book Toggle */}
              <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={filterCompositeOnly}
                  onChange={(e) => setFilterCompositeOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="flex items-center gap-1">
                  <Layers size={13} className="text-purple-600" /> Multi-Book Composite Syllabi Only
                </span>
              </label>
            </div>

            {/* Presets Grid */}
            <div className="grid max-h-56 overflow-y-auto gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pr-1">
              {filteredPresets.map((preset: StandardCurriculumPreset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setDefaultTitle(preset.title);
                      setDefaultClass(preset.className);
                      setDefaultSubject(preset.subject);
                    }}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-1.5">
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-800">
                        {preset.className}
                      </span>
                      {preset.isComposite && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800 flex items-center gap-1">
                          <Layers size={10} /> Multi-Book
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-500 ml-auto">
                        {preset.chapters.length} ch
                      </span>
                    </div>
                    <span className="mt-1 font-semibold text-slate-900 line-clamp-1">{preset.title}</span>
                    <span className="text-xs text-slate-500">{preset.subject}</span>
                    <span className="mt-1 line-clamp-1 text-[11px] text-slate-500">{preset.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: ROLLOVER FROM EXISTING / PREVIOUS BOOKS */}
        {activeTab === "rollover" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 flex items-start gap-3">
              <RotateCcw size={18} className="text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-emerald-950 text-sm">Rollover Existing Syllabus into a New Session</p>
                <p className="text-emerald-800 leading-relaxed">
                  Select an existing textbook from a prior session. Its chapters will be loaded into the Interactive Checklist below where you can deselect removed chapters, renumber, or add new chapters before creating the textbook in your target session.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Source Textbook to Rollover
                </label>
                {existingBooks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No textbooks currently in database to roll over.</p>
                ) : (
                  <select
                    value={selectedRolloverBookId}
                    onChange={(e) => setSelectedRolloverBookId(e.target.value)}
                    className="input input-sm w-full text-xs font-medium"
                  >
                    {existingBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.className} · {b.subject}: {b.title} ({b.chapters.length} ch) [{b.academicSession || "2025–26"}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Academic Session
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rolloverTargetSession}
                    onChange={(e) => setRolloverTargetSession(e.target.value)}
                    placeholder="e.g. 2026–27"
                    className="input input-sm flex-1 text-xs font-semibold text-emerald-950"
                  />
                  <select
                    value={rolloverTargetSession}
                    onChange={(e) => setRolloverTargetSession(e.target.value)}
                    className="input input-sm w-32 text-xs"
                  >
                    {availableSessions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rolled-over Book Title in Target Session
                </label>
                <input
                  type="text"
                  value={rolloverTitle}
                  onChange={(e) => setRolloverTitle(e.target.value)}
                  placeholder="e.g. Science (NCERT Class X)"
                  className="input input-sm w-full text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rolloverIncludeQuestions}
                    onChange={(e) => setRolloverIncludeQuestions(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Also duplicate and carry forward questions from question bank into this session</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI INDEX / SYLLABUS SCANNER (FOR PRIVATE BOOKS) */}
        {activeTab === "ai_scan" && (
          <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/40 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-600" /> AI Table of Contents &amp; Circular Scanner
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Paste unformatted index text or syllabus circulars from <strong>any private publisher</strong> (Oxford, Pearson, Ratna Sagar, Cambridge, S. Chand, Cordova). Gemini extracts chapters and separates multi-book parts automatically.
                </p>
              </div>
            </div>

            {aiError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-900">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-700">Target Class:</span>
                <input
                  type="text"
                  className="input text-xs py-1"
                  value={aiClass}
                  onChange={(e) => setAiClass(e.target.value)}
                  placeholder="e.g. Class 7 or Class 10"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-700">Target Subject:</span>
                <input
                  type="text"
                  className="input text-xs py-1"
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  placeholder="e.g. Science, English, etc."
                />
              </label>
            </div>

            <textarea
              className="input font-mono text-xs leading-relaxed"
              rows={6}
              value={aiRawText}
              onChange={(e) => setAiRawText(e.target.value)}
              placeholder="Paste Table of Contents or Syllabus Circular text here..."
            />

            <div className="flex justify-between items-center">
              <button
                type="button"
                className="btn btn-sm btn-ghost text-xs"
                onClick={() => setAiRawText(SAMPLE_AI_INDEX)}
              >
                Load Sample Multi-Book Index
              </button>
              <button
                type="button"
                className="btn btn-sm border-purple-300 bg-purple-600 text-white hover:bg-purple-700 shadow-xs font-semibold"
                onClick={handleAiScan}
                disabled={aiBusy}
              >
                {aiBusy ? (
                  <>
                    <Spinner /> Scanning with AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Scan &amp; Extract Chapters
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: TEXT SYLLABUS */}
        {activeTab === "text" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-600">
                Paste syllabus text directly. Chapter numbers are detected automatically.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-xs"
                  onClick={() => setTextContent(SAMPLE_TEXT_SYLLABUS)}
                >
                  Load sample CBSE Science
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-xs text-red-600 hover:text-red-700"
                  onClick={() => setTextContent("")}
                >
                  Clear
                </button>
              </div>
            </div>

            <textarea
              className="input font-mono text-xs leading-relaxed"
              rows={6}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />

            {!targetBook && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Textbook title</span>
                  <input
                    type="text"
                    className="input text-xs"
                    value={defaultTitle}
                    onChange={(e) => setDefaultTitle(e.target.value)}
                    placeholder="e.g. Oxford Science Class 7"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Class</span>
                  <input
                    type="text"
                    className="input text-xs"
                    value={defaultClass}
                    onChange={(e) => setDefaultClass(e.target.value)}
                    placeholder="e.g. Class 7"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Subject</span>
                  <input
                    type="text"
                    className="input text-xs"
                    value={defaultSubject}
                    onChange={(e) => setDefaultSubject(e.target.value)}
                    placeholder="e.g. Science"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CSV IMPORT */}
        {activeTab === "csv" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-600">
                Headers: <code>Book</code>, <code>Class</code>, <code>Subject</code>, <code>Chapter</code>, <code>Title</code>.
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-sm btn-ghost text-xs" onClick={downloadCsvTemplate}>
                  <Download size={13} /> Download template
                </button>
                <label
                  htmlFor={fileInputId}
                  className="btn btn-sm btn-ghost text-xs cursor-pointer text-indigo-700 hover:text-indigo-800"
                >
                  <Upload size={13} /> Upload .csv file
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="sr-only"
                    onChange={handleCsvFileUpload}
                  />
                </label>
              </div>
            </div>

            <textarea
              className="input font-mono text-xs leading-relaxed"
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
            />
          </div>
        )}

        {/* TAB 5: JSON IMPORT */}
        {activeTab === "json" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-600">Paste structured JSON array of books with chapters.</span>
              <button type="button" className="btn btn-sm btn-ghost text-xs" onClick={() => setJsonContent(SAMPLE_JSON)}>
                Load sample JSON
              </button>
            </div>
            <textarea
              className="input font-mono text-xs leading-relaxed"
              rows={6}
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
            />
          </div>
        )}

        {/* INTERACTIVE CHAPTER CHECKLIST & CUSTOMIZER (THE CORE SOLUTION) */}
        {editableBooks.length > 0 && (
          <div className="space-y-3 rounded-xl border border-indigo-200 bg-white p-4 shadow-2xs">
            {/* Header with Select All / Deselect All */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900">
                  Interactive Chapter Selection ({selectedChaptersCount} of {totalChapters} chapters active)
                </h4>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectAllChapters(true)}
                  className="btn btn-sm btn-ghost text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => selectAllChapters(false)}
                  className="btn btn-sm btn-ghost text-slate-500 hover:text-slate-700"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Book Chapter Groups */}
            <div className="max-h-60 overflow-y-auto space-y-4 pr-1">
              {editableBooks.map((b, bIdx) => (
                <div key={bIdx} className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <BookOpen size={13} className="text-indigo-600" />
                      {b.title} <span className="text-slate-500 font-normal">({b.className} · {b.subject})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => addCustomChapter(bIdx)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <Plus size={12} /> Add Chapter
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {b.chapters.map((c) => {
                      // Check for part prefix e.g. "[First Flight]"
                      const partMatch = c.title.match(/^\[(.*?)\]\s*(.*)$/);
                      const partBadge = partMatch ? partMatch[1] : null;
                      const displayTitle = partMatch ? partMatch[2] : c.title;

                      return (
                        <div
                          key={c.id}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition ${
                            c.selected
                              ? "border-indigo-200 bg-indigo-50/50 text-slate-900"
                              : "border-slate-100 bg-slate-50 text-slate-400 line-through opacity-70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={c.selected}
                            onChange={() => toggleChapter(bIdx, c.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                          />
                          <span className="w-5 font-bold text-slate-500 shrink-0 text-right">{c.number}.</span>
                          {partBadge && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-800 shrink-0">
                              {partBadge}
                            </span>
                          )}
                          <input
                            type="text"
                            value={c.title}
                            onChange={(e) => updateChapterTitle(bIdx, c.id, e.target.value)}
                            className={`min-w-0 flex-1 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 ${
                              !c.selected ? "line-through text-slate-400" : "text-slate-800"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => deleteChapter(bIdx, c.id)}
                            className="text-slate-300 hover:text-red-500 shrink-0"
                            title="Remove chapter"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upsert Safe Guard */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-slate-700 font-medium">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={upsert}
              onChange={(e) => setUpsert(e.target.checked)}
            />
            <span>Safely update chapter titles if numbers match (keeps existing questions intact)</span>
          </label>
          <span className="text-slate-400 font-medium">Non-destructive</span>
        </div>

        {/* API Error Notification */}
        {apiError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600" />
            <div className="font-medium">{apiError}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}
