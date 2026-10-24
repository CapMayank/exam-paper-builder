"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Columns2,
  CopyPlus,
  ExternalLink,
  FileDown,
  Grid3X3,
  History,
  ImagePlus,
  KeyRound,
  Lightbulb,
  Lock,
  Pencil,
  PencilRuler,
  Plus,
  Printer,
  RefreshCw,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState, Fragment } from "react";
import { AIPaperAuditModal } from "@/components/AIPaperAuditModal";
import { AIPaperGeneratorModal } from "@/components/AIPaperGeneratorModal";
import { DiagramSearchModal } from "@/components/DiagramSearchModal";
import { FigureStudio } from "@/components/figure-studio";
import { PaperImportModal } from "@/components/PaperImportModal";
import { PaperPreflightModal } from "@/components/PaperPreflightModal";
import { PaperSheets } from "@/components/PaperSheets";
import { PaperSnapshotDrawer } from "@/components/PaperSnapshotDrawer";
import { SubjectWorkspaceDrawer } from "@/components/subject-workspace/SubjectWorkspaceDrawer";
import { SectionAiModal } from "@/components/SectionAiModal";
import { QuestionForm } from "@/components/QuestionForm";
import { QuestionPicker } from "@/components/QuestionPicker";
import { isExhaustedUsage, QuestionFreshnessAlert, QuestionUsagePills } from "@/components/QuestionUsageHistory";
import { QuestionView } from "@/components/QuestionView";
import { ErrorBanner, Field, Modal, useConfirm, useToast } from "@/components/ui";
import { api, imageUrl } from "@/lib/client";
import {
  ACADEMIC_SESSIONS,
  DEFAULT_SCHOOL_LOGO,
  DEFAULT_SCHOOL_NAME,
  EXAM_TYPES,
  EXAM_TYPE_LABEL,
  inferExamTypeFromText,
  LAYOUTS,
  LAYOUT_LABEL,
  MARKS_STYLES,
  MARKS_STYLE_LABEL,
  NUMBERING_STYLES,
  NUMBERING_STYLE_LABEL,
  parseMatchColumnPairs,
  PRINT_DENSITIES,
  PRINT_DENSITY_LABEL,
  QUESTION_TYPE_LABEL,
  resolvePaperExamType,
  SCHOOL_DISPLAY_NAME,
  type ExamType,
} from "@/lib/constants";
import { formatQuestionNumber } from "@/lib/layout";
import { nextSetIdentifier } from "@/lib/multiset";
import type { Book, PaperData, PaperItem, Section, MarksStyle, NumberingStyle, PrintDensity } from "@/lib/types";

function Bar({ used, target, isComplete }: { used: number; target: number; isComplete?: boolean }) {
  const pct = target === 0 ? 0 : Math.min(100, (used / target) * 100);
  const color =
    isComplete !== undefined
      ? isComplete
        ? "bg-emerald-500"
        : used >= target
        ? "bg-amber-500"
        : "bg-indigo-600"
      : used === target
      ? "bg-emerald-500"
      : used > target
      ? "bg-red-500"
      : "bg-indigo-600";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function PaperBuilderPage({ params }: PageProps<"/papers/[id]">) {
  const { id } = use(params);
  const confirm = useConfirm();
  const toast = useToast();
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: PaperItem; section: Section } | null>(null);
  const [replacingItem, setReplacingItem] = useState<{ item: PaperItem; section: Section } | null>(null);
  const [alternateItem, setAlternateItem] = useState<{ item: PaperItem; section: Section } | null>(null);
  const [diagramModalItem, setDiagramModalItem] = useState<{ item: PaperItem; section: Section } | null>(null);
  const [studioItem, setStudioItem] = useState<{ item: PaperItem; section: Section; initialUrl: string | null } | null>(null);
  const [bwPreviewIds, setBwPreviewIds] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState({
    title: "",
    schoolName: "",
    academicSession: "",
    examDate: "",
    paperSet: "",
    subjectCode: "",
    generalInstructions: "",
    printDensity: "STANDARD" as PrintDensity,
    showCandidateDetails: true,
    showSignatures: false,
    securityWatermark: false,
    watermarkText: "",
  });
  const [splitPreview, setSplitPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(0.55);
  const [quickSwapItemId, setQuickSwapItemId] = useState<string | null>(null);
  const [siblingQuestions, setSiblingQuestions] = useState<Array<{ id: string; text: string; difficulty: string }>>([]);
  const [siblingLoading, setSiblingLoading] = useState(false);
  const [swappingBusy, setSwappingBusy] = useState(false);
  const [sectionAutofilling, setSectionAutofilling] = useState<string | null>(null);
  const [sectionAiModalSection, setSectionAiModalSection] = useState<Section | null>(null);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [autofilling, setAutofilling] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [duplicatingSet, setDuplicatingSet] = useState(false);
  const [duplicateForm, setDuplicateForm] = useState({
    targetSet: "SET B",
    shuffleQuestions: true,
    shuffleMcqOptions: true,
  });
  const [duplicatingBusy, setDuplicatingBusy] = useState(false);
  const [createdPaperLink, setCreatedPaperLink] = useState<{ id: string; title: string } | null>(null);
  const [multiSetModalOpen, setMultiSetModalOpen] = useState(false);
  const [createdPaperLinks, setCreatedPaperLinks] = useState<Array<{ id: string; title: string; setCode: string }>>([]);
  const [aiAuditOpen, setAiAuditOpen] = useState(false);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [paperImportOpen, setPaperImportOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [toolkitDrawerOpen, setToolkitDrawerOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"quotas" | "settings">("quotas");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [dismissOnboarding, setDismissOnboarding] = useState(false);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("aiGenerate") === "true") {
        setAiGeneratorOpen(true);
      }
    }
  }, []);

  const adopt = useCallback((p: PaperData) => {
    setPaper(p);
    setDetails({
      title: p.title,
      schoolName: p.schoolName,
      academicSession: p.academicSession ?? "2025–26",
      examDate: p.examDate,
      paperSet: p.paperSet ?? "",
      subjectCode: p.subjectCode ?? "",
      generalInstructions: p.generalInstructions ?? "",
      printDensity: (p.printDensity as PrintDensity) ?? "STANDARD",
      showCandidateDetails: p.showCandidateDetails !== false,
      showSignatures: p.showSignatures === true,
      securityWatermark: p.securityWatermark === true,
      watermarkText: p.watermarkText ?? "",
    });
  }, []);

  // Autosave effect for details
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!paper || paper.status === "FINAL") return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      setAutosaveStatus("saving");
      try {
        await api<PaperData>(`/api/papers/${id}`, {
          method: "PATCH",
          json: {
            title: details.title,
            schoolName: details.schoolName,
            academicSession: details.academicSession,
            examDate: details.examDate,
            paperSet: details.paperSet,
            subjectCode: details.subjectCode,
            generalInstructions: details.generalInstructions,
            printDensity: details.printDensity,
            showCandidateDetails: details.showCandidateDetails,
            showSignatures: details.showSignatures,
            securityWatermark: details.securityWatermark,
            watermarkText: details.watermarkText,
          },
        });
        setAutosaveStatus("saved");
        setTimeout(() => setAutosaveStatus("idle"), 2500);
      } catch {
        setAutosaveStatus("error");
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [id, details, paper?.status]);

  async function handleTogglePageBreak(itemId: string, pageBreakBefore: boolean) {
    try {
      const updated = await api<PaperData>(`/api/papers/${id}/questions/${itemId}`, {
        method: "PATCH",
        json: { pageBreakBefore },
      });
      adopt(updated);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleOpenQuickSwap(itemId: string) {
    setQuickSwapItemId(itemId);
    setSiblingLoading(true);
    setSiblingQuestions([]);
    try {
      const data = await api<{ siblings: Array<{ id: string; text: string; difficulty: string }> }>(
        `/api/papers/${id}/questions/${itemId}/siblings`
      );
      setSiblingQuestions(data.siblings || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSiblingLoading(false);
    }
  }

  async function handleExecuteQuickSwap(itemId: string, replacementQuestionId: string) {
    setSwappingBusy(true);
    setError(null);
    try {
      const updated = await api<PaperData>(`/api/papers/${id}/questions/${itemId}`, {
        method: "PUT",
        json: { mode: "replace", question: { id: replacementQuestionId } },
      });
      adopt(updated);
      setQuickSwapItemId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSwappingBusy(false);
    }
  }

  async function handleSectionAutofill(sectionId: string) {
    setError(null);
    setInfoMessage(null);
    setSectionAutofilling(sectionId);
    try {
      const res = await api<{
        success: boolean;
        addedCount: number;
        message: string;
        paper: PaperData;
      }>(`/api/papers/${id}/autofill`, {
        method: "POST",
        json: { targetSectionId: sectionId },
      });
      if (res.paper) adopt(res.paper);
      setInfoMessage(res.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSectionAutofilling(null);
    }
  }

  async function handleAutofill() {
    setError(null);
    setInfoMessage(null);
    setAutofilling(true);
    try {
      if (paper && paper.items.length > 0) {
        api(`/api/papers/${id}/snapshots`, {
          method: "POST",
          json: { name: `Auto-checkpoint (Before Auto-Fill - ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})` },
        }).catch(() => undefined);
      }
      const res = await api<{
        success: boolean;
        addedCount: number;
        message: string;
        paper: PaperData;
      }>(`/api/papers/${id}/autofill`, { method: "POST" });
      if (res.paper) adopt(res.paper);
      setInfoMessage(res.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAutofilling(false);
    }
  }

  async function handleReconcileBlueprint() {
    setError(null);
    setInfoMessage(null);
    setReconciling(true);
    try {
      const res = await api<{
        success: boolean;
        reassignmentsCount: number;
        isBalanced: boolean;
        summary: string;
        paper: PaperData;
      }>(`/api/papers/${id}/reconcile-blueprint`, { method: "POST" });
      if (res.paper) adopt(res.paper);
      setInfoMessage(res.summary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReconciling(false);
    }
  }

  async function handleDuplicateSet(e: React.FormEvent) {
    e.preventDefault();
    setDuplicatingBusy(true);
    setError(null);
    try {
      const res = await api<{ success: boolean; paper: PaperData; message: string }>(
        `/api/papers/${id}/duplicate-set`,
        {
          method: "POST",
          json: duplicateForm,
        },
      );
      setDuplicatingSet(false);
      setCreatedPaperLink({ id: res.paper.id, title: res.paper.title });
      setInfoMessage(`${res.message} You can open it anytime from your Papers dashboard.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDuplicatingBusy(false);
    }
  }

  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string; department?: string } | null>(null);

  useEffect(() => {
    api<{ id: string; name: string; email: string; role: string; department?: string }>("/api/me").then(setCurrentUser, () => undefined);
  }, []);

  const reloadPaper = useCallback(() => {
    api<PaperData>(`/api/papers/${id}`).then(adopt, (e) => setError(e.message));
  }, [id, adopt]);

  useEffect(() => {
    Promise.all([api<PaperData>(`/api/papers/${id}`), api<Book[]>("/api/books")]).then(
      ([p, b]) => {
        adopt(p);
        setBooks(b);
      },
      (e) => setError(e.message),
    );
  }, [id, adopt]);

  async function call<T = PaperData>(fn: () => Promise<T>, then?: (r: T) => void) {
    setError(null);
    try {
      const r = await fn();
      then?.(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const patch = (json: Record<string, unknown>) => {
    const isFin = paper?.status === "FINAL";
    const isAdm = currentUser?.role === "ADMIN";
    const isHod = currentUser?.role === "HOD";
    const isOwn = Boolean(currentUser?.id && paper?.createdById && currentUser.id === paper.createdById);
    const canEdit = !isFin && (isAdm || isHod || isOwn);
    if (!canEdit && !(isFin && isAdm && json.status === "DRAFT")) {
      setError("Forbidden: You do not have permission to modify this paper.");
      return;
    }
    call(() => api<PaperData>(`/api/papers/${id}`, { method: "PATCH", json }), adopt);
  };

  if (!paper) {
    return error ? (
      <ErrorBanner message={error} />
    ) : (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading Exam Paper Workbench…
        </div>
      </div>
    );
  }

  const { blueprint, progress } = paper;
  const final = paper.status === "FINAL";
  const isAdmin = currentUser?.role === "ADMIN";
  const isHod = currentUser?.role === "HOD";
  const isOwner = Boolean(currentUser?.id && paper.createdById && currentUser.id === paper.createdById);
  const canEditPaper = !final && (isAdmin || isHod || isOwner);
  const resolvedExamType = resolvePaperExamType(paper);
  const pickerSection = blueprint.sections.find((s) => s.id === pickerSectionId) ?? null;

  // Continuous numbering across sections
  const firstNumber = new Map<string, number>();
  let numbered = 0;
  for (const s of blueprint.sections) {
    firstNumber.set(s.id, numbered + 1);
    numbered += paper.items.filter((i) => i.sectionId === s.id).length;
  }

  return (
    <div className="space-y-4">
      {/* Navigation Breadcrumb & Title Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/papers" className="hover:text-indigo-600 flex items-center gap-1 font-medium">
            <ChevronLeft size={13} /> Exam Papers
          </Link>
          <span>/</span>
          <span>
            {blueprint.book.className} {blueprint.book.subject}
          </span>
          <span>/</span>
          <span className="font-semibold text-slate-700">{paper.title}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{paper.title}</h1>
            <span className="badge !bg-slate-100 !text-slate-800 border border-slate-200 font-medium whitespace-nowrap">
              {EXAM_TYPE_LABEL[resolvedExamType]}
            </span>
            {paper.academicSession && (
              <span className="badge !bg-slate-100 !text-slate-700 border border-slate-200 font-mono text-[11px] whitespace-nowrap">
                {paper.academicSession}
              </span>
            )}
            {paper.paperSet && (
              <span className="badge !bg-indigo-50 !text-indigo-800 border border-indigo-200 font-bold whitespace-nowrap">
                {paper.paperSet}
              </span>
            )}
            <span
              className={`badge ${
                final
                  ? "!bg-emerald-50 !text-emerald-800 border border-emerald-200 font-bold"
                  : "!bg-slate-100 !text-slate-700 border border-slate-200"
              }`}
            >
              {final ? "Finalized" : "Draft"}
            </span>

            {canEditPaper && !final && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
                title={
                  autosaveStatus === "saving"
                    ? "Saving changes..."
                    : autosaveStatus === "saved"
                    ? "All changes saved"
                    : autosaveStatus === "error"
                    ? "Failed to save changes"
                    : "Autosave active"
                }
              >
                {autosaveStatus === "saving" && (
                  <span className="text-amber-600 flex items-center gap-1 font-sans">
                    <RefreshCw size={11} className="animate-spin" /> Saving…
                  </span>
                )}
                {autosaveStatus === "saved" && (
                  <span className="text-emerald-700 flex items-center gap-1 font-sans font-semibold">
                    <CheckCircle2 size={11} /> Saved
                  </span>
                )}
                {autosaveStatus === "error" && (
                  <span className="text-rose-600 flex items-center gap-1 font-sans font-semibold">
                    ✕ Save failed
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Action Toolbar: Consolidated Progressive Disclosure */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Tools & AI Dropdown */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setToolsMenuOpen((v) => !v);
                  setExportMenuOpen(false);
                }}
                className={`btn text-xs font-semibold flex items-center gap-1.5 transition ${
                  toolsMenuOpen
                    ? "bg-slate-100 text-slate-900 border-slate-300"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
                }`}
                aria-expanded={toolsMenuOpen}
                title="AI tools, paper import, and multi-set generation"
              >
                <Sparkles size={14} className="text-purple-600" />
                <span>Tools &amp; AI</span>
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${toolsMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {toolsMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-30 space-y-0.5">
                  <button
                    type="button"
                    disabled={paper.items.length === 0}
                    onClick={() => {
                      setToolsMenuOpen(false);
                      setMultiSetModalOpen(true);
                    }}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                      paper.items.length === 0
                        ? "opacity-50 cursor-not-allowed text-slate-400"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="rounded-md bg-purple-50 p-1.5 text-purple-700">
                      <CopyPlus size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Multi-Set Suite</div>
                      <div className="text-[11px] text-slate-500">Parallel sets (Sets B, C) with 60/40 overlap</div>
                    </div>
                  </button>

                  {canEditPaper && (
                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        setPaperImportOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                    >
                      <div className="rounded-md bg-indigo-50 p-1.5 text-indigo-700">
                        <Upload size={14} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Import Questions</div>
                        <div className="text-[11px] text-slate-500">From JSON, CSV, or formatted text</div>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setToolsMenuOpen(false);
                      setAiAuditOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <div className="rounded-md bg-purple-50 p-1.5 text-purple-700">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">AI Audit &amp; Balance</div>
                      <div className="text-[11px] text-slate-500">Bloom&apos;s cognitive &amp; rigor check</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Export & Print Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen((v) => !v);
                  setToolsMenuOpen(false);
                }}
                className={`btn text-xs font-semibold flex items-center gap-1.5 transition ${
                  exportMenuOpen
                    ? "bg-slate-100 text-slate-900 border-slate-300"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
                }`}
                aria-expanded={exportMenuOpen}
                title="Preview printable booklets, download Word docs, OMR, or marking schemes"
              >
                <Printer size={14} className="text-slate-600" />
                <span>Export &amp; Print</span>
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-30 space-y-0.5">
                  <Link
                    href={`/papers/${id}/print`}
                    target="_blank"
                    onClick={() => setExportMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <div className="rounded-md bg-slate-100 p-1.5 text-slate-700">
                      <Printer size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Preview &amp; Print</div>
                      <div className="text-[11px] text-slate-500">A3 / A4 booklets &amp; sheets</div>
                    </div>
                  </Link>

                  <a
                    href={`/api/papers/${id}/export-docx`}
                    download
                    onClick={() => setExportMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <div className="rounded-md bg-blue-50 p-1.5 text-blue-700">
                      <FileDown size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Word Document (.docx)</div>
                      <div className="text-[11px] text-slate-500">Editable Word exam paper</div>
                    </div>
                  </a>

                  <Link
                    href={`/papers/${id}/solutions`}
                    target="_blank"
                    onClick={() => setExportMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <div className="rounded-md bg-emerald-50 p-1.5 text-emerald-700">
                      <KeyRound size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Marking Scheme</div>
                      <div className="text-[11px] text-slate-500">Solutions, rubrics &amp; answer keys</div>
                    </div>
                  </Link>

                  <Link
                    href={`/papers/${id}/omr`}
                    target="_blank"
                    onClick={() => setExportMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <div className="rounded-md bg-indigo-50 p-1.5 text-indigo-700">
                      <Grid3X3 size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">OMR Bubble Sheet</div>
                      <div className="text-[11px] text-slate-500">Printable MCQ answer grids</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Live Sheet Preview Toggle */}
            <button
              type="button"
              onClick={() => setSplitPreview((v) => !v)}
              className={`btn text-xs font-semibold flex items-center gap-1.5 transition ${
                splitPreview
                  ? "border-indigo-400 bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
              }`}
              title="Toggle live side-by-side print sheet preview"
            >
              <Columns2 size={14} className={splitPreview ? "text-indigo-200" : "text-slate-500"} />
              <span>{splitPreview ? "Hide Live Sheet" : "Live Sheet Preview"}</span>
            </button>

            {/* Version History & Rollback Checkpoints */}
            <button
              type="button"
              onClick={() => setHistoryDrawerOpen(true)}
              className="btn border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
              title="View saved checkpoints, revisions, and rollback versions"
            >
              <History size={14} className="text-indigo-600" />
              <span>History</span>
            </button>

            {/* Subject Toolkit & Instructions Library */}
            <button
              type="button"
              onClick={() => setToolkitDrawerOpen(true)}
              className="btn border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
              title="Subject instructions, formulas, and rubrics"
            >
              <Lightbulb size={14} className="text-amber-600" />
              <span>Toolkit</span>
            </button>

            {/* 3. Primary Contextual CTA */}
            <div className="border-l border-slate-200 pl-2">
              {final ? (
                isAdmin ? (
                  <button
                    className="btn border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs shadow-2xs font-semibold flex items-center gap-1.5"
                    onClick={() => patch({ status: "DRAFT" })}
                    title="Unlock paper to add, remove, or rearrange questions"
                  >
                    <Unlock size={14} />
                    <span>Reopen for editing</span>
                  </button>
                ) : (
                  <span
                    className="badge border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold text-xs flex items-center gap-1 py-1.5 px-2.5"
                    title="This exam paper is finalized and locked. Only an Administrator can unlock it."
                  >
                    <Lock size={12} className="text-emerald-700" />
                    <span>Finalized (Locked)</span>
                  </span>
                )
              ) : progress.complete ? (
                canEditPaper ? (
                  <button
                    className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-xs font-semibold flex items-center gap-1.5"
                    onClick={() => setPreflightOpen(true)}
                    title="Lock and finalize paper"
                  >
                    <Lock size={14} />
                    <span>Finalise Paper</span>
                  </button>
                ) : (
                  <span className="badge border border-slate-200 bg-slate-50 text-slate-600 font-medium text-xs py-1.5 px-2.5">
                    Draft (View Only)
                  </span>
                )
              ) : (
                canEditPaper ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs shadow-xs font-semibold flex items-center gap-1.5"
                      onClick={() => setAiGeneratorOpen(true)}
                      title="Generate complete question paper using AI strictly matching blueprint quotas"
                    >
                      <Sparkles size={14} />
                      <span>Generate with AI</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs shadow-2xs font-semibold flex items-center gap-1.5"
                      disabled={autofilling}
                      onClick={handleAutofill}
                      title="Automatically fill all remaining question slots from existing Question Bank"
                    >
                      <RefreshCw size={13} className={autofilling ? "animate-spin" : ""} />
                      <span>{autofilling ? "Auto-filling…" : "Bank Auto-Fill"}</span>
                    </button>
                  </div>
                ) : (
                  <span className="badge border border-slate-200 bg-slate-50 text-slate-600 font-medium text-xs py-1.5 px-2.5">
                    Draft (View Only)
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      {infoMessage && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 shadow-2xs">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{infoMessage}</span>
            </div>
            {createdPaperLinks.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pl-6">
                {createdPaperLinks.map((p) => (
                  <Link
                    key={p.id}
                    href={`/papers/${p.id}`}
                    className="inline-flex items-center gap-1 rounded bg-emerald-100/90 px-2 py-0.5 text-xs font-bold text-emerald-950 underline hover:bg-emerald-200"
                  >
                    Open {p.setCode} ({p.title}) &rarr;
                  </Link>
                ))}
              </div>
            )}
            {createdPaperLink && (
              <Link
                href={`/papers/${createdPaperLink.id}`}
                className="ml-6 font-bold underline text-emerald-950 hover:text-emerald-700"
              >
                Open {createdPaperLink.title} &rarr;
              </Link>
            )}
          </div>
          <button
            onClick={() => {
              setInfoMessage(null);
              setCreatedPaperLink(null);
              setCreatedPaperLinks([]);
            }}
            className="font-bold text-emerald-700 hover:text-emerald-950 px-1 self-start"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2- or 3-Column Workbench Grid */}
      <div
        className={`grid gap-5 items-start ${
          splitPreview
            ? "lg:grid-cols-[18rem_1fr_450px] xl:grid-cols-[18.5rem_1fr_500px]"
            : "lg:grid-cols-[19.5rem_1fr]"
        }`}
      >
        {/* Left Sidebar: Blueprint Metrics & Configuration */}
        <aside className="lg:sticky lg:top-20 lg:self-start flex flex-col lg:max-h-[calc(100vh-6rem)]">
          {/* Segmented Tab Switcher (Pinned at Top of Sidebar) */}
          <div className="shrink-0 mb-3 flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSidebarTab("quotas")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition ${
                sidebarTab === "quotas"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900 font-medium"
              }`}
            >
              <CheckCircle2 size={13} className={progress.complete ? "text-emerald-600" : "text-indigo-600"} />
              <span>Quotas &amp; Progress</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("settings")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition ${
                sidebarTab === "settings"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900 font-medium"
              }`}
            >
              <SlidersHorizontal size={13} className="text-slate-500" />
              <span>Print Setup</span>
            </button>
          </div>

          {/* Independently Scrollable Tab Panels */}
          <div className="flex-1 overflow-y-auto overscroll-contain sidebar-scroll pr-1.5 -mr-1.5 space-y-3.5 pb-4">
            {/* TAB 1: Blueprint Quotas & Progress */}
            <div className={`space-y-3.5 ${sidebarTab === "quotas" ? "block" : "hidden"}`}>
            {/* Total Marks & Blueprint Completion Card */}
            <section className="card space-y-2.5 p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-800 line-clamp-2 min-w-0 leading-snug">
                  {blueprint.name}
                </span>
                <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
                  {blueprint.durationMin} mins
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-slate-900">
                  Total Marks: {progress.usedMarks} / {progress.totalMarks}
                </span>
                {progress.complete ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> Quotas Complete
                  </span>
                ) : progress.usedMarks === progress.totalMarks ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                    title="All marks placed, but chapter or section distribution differs from blueprint quotas"
                  >
                    <AlertTriangle size={12} /> Quotas Imbalanced
                  </span>
                ) : progress.usedMarks > progress.totalMarks ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200"
                    title="Placed marks exceed blueprint quota"
                  >
                    <AlertCircle size={12} /> +{progress.usedMarks - progress.totalMarks}m over quota
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-500">
                    {progress.totalMarks - progress.usedMarks}m remaining
                  </span>
                )}
              </div>
              <Bar used={progress.usedMarks} target={progress.totalMarks} isComplete={progress.complete} />
            </section>

            {/* Chapter Weightage Quotas */}
            <section className="card space-y-2.5 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Chapter Weightage
                </h2>
                <span className="text-[11px] text-slate-400 font-medium">Marks Quota</span>
              </div>
              <div className="space-y-2.5 pt-1">
                {(showAllChapters || blueprint.chapters.length <= 6
                  ? blueprint.chapters
                  : blueprint.chapters.slice(0, 6)
                ).map((c) => {
                  const used = progress.chapters.find((p) => p.chapterId === c.chapterId)?.used ?? 0;
                  const isMatched = used === c.marks;
                  const isOver = used > c.marks;
                  const remaining = c.marks - used;
                  return (
                    <div key={c.chapterId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate pr-2 font-medium text-slate-700" title={c.chapter.title}>
                          Ch {c.chapter.number}. {c.chapter.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isMatched ? (
                            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              ✓ {used}/{c.marks}m
                            </span>
                          ) : isOver ? (
                            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-red-50 text-[10px] font-bold text-red-700 border border-red-200">
                              ⚠ {used}/{c.marks}m
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-500">
                              {used}/{c.marks}m{" "}
                              <span className="text-amber-700 font-normal">({remaining}m left)</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <Bar used={used} target={c.marks} />
                    </div>
                  );
                })}
              </div>
              {blueprint.chapters.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllChapters((v) => !v)}
                  className="w-full text-center text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 pt-1.5 border-t border-slate-100 transition"
                >
                  {showAllChapters
                    ? "Show fewer chapters ▴"
                    : `Show all ${blueprint.chapters.length} chapters (${blueprint.chapters.length - 6} more) ▾`}
                </button>
              )}
            </section>
          </div>

          {/* TAB 2: Paper Header & Print Settings */}
          <div className={`space-y-3.5 ${sidebarTab === "settings" ? "block" : "hidden"}`}>
            {!canEditPaper && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 font-medium flex items-center gap-2">
                <Lock size={14} className="shrink-0 text-amber-700" />
                <span>Read-Only: You can view formatting and details, but only the paper author or an administrator can modify settings.</span>
              </div>
            )}
            <fieldset disabled={!canEditPaper} className="space-y-3.5 border-none p-0 m-0">
            {/* Card 1: Exam & School Identity */}
            <section className="card space-y-3 p-4 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                School &amp; Exam Identity
              </h2>

              <Field label="Examination Term (Blueprint Specification)">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs">
                  <span className="font-bold text-slate-900">
                    {EXAM_TYPE_LABEL[resolvedExamType] || resolvedExamType} Examination
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Locked to Blueprint
                  </span>
                </div>
              </Field>

              <Field label="Paper Title">
                <input
                  className="input text-xs"
                  value={details.title}
                  onChange={(e) => setDetails({ ...details, title: e.target.value })}
                  onBlur={() => {
                    const trimmed = details.title.trim();
                    if (trimmed && trimmed !== paper.title) {
                      patch({ title: trimmed });
                    }
                  }}
                />
              </Field>

              {/* School Emblem & Branding Preview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        paper.logoPath
                          ? imageUrl(paper.logoPath)
                          : paper.schoolLogo && paper.schoolLogo !== "NONE"
                          ? paper.schoolLogo
                          : DEFAULT_SCHOOL_LOGO
                      }
                      alt="School Crest"
                      className={`h-full w-full object-contain ${
                        paper.schoolLogo === "NONE" ? "opacity-30 grayscale" : ""
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      Sarvodaya School Emblem
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Lakhnadon · Est. 2002
                    </div>
                    <label className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paper.schoolLogo !== "NONE"}
                        onChange={(e) =>
                          patch({ schoolLogo: e.target.checked ? DEFAULT_SCHOOL_LOGO : "NONE" })
                        }
                        className="rounded text-indigo-600"
                      />
                      <span>Print emblem on paper &amp; OMR</span>
                    </label>
                  </div>
                </div>
              </div>

              <Field label="School Name">
                <div className="space-y-1.5">
                  <input
                    className="input text-xs"
                    value={details.schoolName}
                    onChange={(e) => setDetails({ ...details, schoolName: e.target.value })}
                    onBlur={() =>
                      details.schoolName.trim() &&
                      details.schoolName !== paper.schoolName &&
                      patch({ schoolName: details.schoolName })
                    }
                  />
                  <div className="flex flex-wrap gap-1">
                    {[DEFAULT_SCHOOL_NAME, SCHOOL_DISPLAY_NAME].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setDetails((d) => ({ ...d, schoolName: preset }));
                          if (paper.schoolName !== preset) patch({ schoolName: preset });
                        }}
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition ${
                          details.schoolName === preset
                            ? "border-indigo-300 bg-indigo-50 text-indigo-900 font-semibold"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {preset.includes("English") ? "Sarvodaya English H.S." : "Sarvodaya H.S. School"}
                      </button>
                    ))}
                  </div>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Academic Session">
                  <select
                    className="input text-xs"
                    value={details.academicSession}
                    onChange={(e) => {
                      const nextSession = e.target.value;
                      setDetails({ ...details, academicSession: nextSession });
                      patch({ academicSession: nextSession });
                    }}
                  >
                    {Array.from(new Set([...ACADEMIC_SESSIONS, details.academicSession || "2025–26"])).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Subject Code">
                  <input
                    className="input text-xs"
                    placeholder="e.g. 086 / SCI"
                    value={details.subjectCode}
                    onChange={(e) => setDetails({ ...details, subjectCode: e.target.value })}
                    onBlur={() => details.subjectCode !== paper.subjectCode && patch({ subjectCode: details.subjectCode })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Exam Date">
                  <input
                    type="date"
                    className="input text-xs"
                    value={details.examDate}
                    onChange={(e) => setDetails({ ...details, examDate: e.target.value })}
                    onBlur={() => details.examDate !== paper.examDate && patch({ examDate: details.examDate })}
                  />
                </Field>
                <Field label="Paper Set">
                  <input
                    className="input text-xs"
                    placeholder="e.g. SET A"
                    value={details.paperSet}
                    onChange={(e) => setDetails({ ...details, paperSet: e.target.value })}
                    onBlur={() => details.paperSet !== paper.paperSet && patch({ paperSet: details.paperSet })}
                  />
                </Field>
              </div>
            </section>

            {/* Card 2: Print Formatting & Layout */}
            <section className="card space-y-3 p-4 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Print Formatting &amp; Styles
              </h2>

              <Field label="Print Page Layout">
                <select
                  className="input text-xs"
                  value={paper.layout}
                  onChange={(e) => patch({ layout: e.target.value })}
                >
                  {LAYOUTS.map((l) => (
                    <option key={l} value={l}>
                      {LAYOUT_LABEL[l]}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Question Numbering">
                  <select
                    className="input text-xs"
                    value={paper.numberingStyle || "CONTINUOUS"}
                    onChange={(e) => patch({ numberingStyle: e.target.value })}
                  >
                    {NUMBERING_STYLES.map((st) => (
                      <option key={st} value={st}>
                        {NUMBERING_STYLE_LABEL[st]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Marks Style">
                  <select
                    className="input text-xs"
                    value={paper.marksStyle || "INLINE"}
                    onChange={(e) => patch({ marksStyle: e.target.value })}
                  >
                    {MARKS_STYLES.map((ms) => (
                      <option key={ms} value={ms}>
                        {MARKS_STYLE_LABEL[ms]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Print Density">
                <select
                  className="input text-xs"
                  value={paper.printDensity || "STANDARD"}
                  onChange={(e) => patch({ printDensity: e.target.value })}
                >
                  {PRINT_DENSITIES.map((pd) => (
                    <option key={pd} value={pd}>
                      {PRINT_DENSITY_LABEL[pd]}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="space-y-1.5 pt-0.5 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paper.showCandidateDetails !== false}
                    onChange={(e) => patch({ showCandidateDetails: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Print Candidate Name &amp; Roll No. Box</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paper.showSignatures === true}
                    onChange={(e) => patch({ showSignatures: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Print Invigilator Signature Box</span>
                </label>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={details.securityWatermark}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDetails((d) => ({ ...d, securityWatermark: checked }));
                        patch({ securityWatermark: checked });
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span>Confidential Security Watermark</span>
                  </label>
                  {details.securityWatermark && (
                    <div className="pl-6 space-y-1.5">
                      <input
                        className="input text-xs"
                        placeholder="e.g. CONFIDENTIAL — SARVODAYA EXAM CELL"
                        value={details.watermarkText}
                        onChange={(e) => setDetails((d) => ({ ...d, watermarkText: e.target.value }))}
                        onBlur={() => {
                          if (details.watermarkText !== paper.watermarkText) {
                            patch({ watermarkText: details.watermarkText });
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-1">
                        {["CONFIDENTIAL", "CONFIDENTIAL — EXAM CELL", "PRE-BOARD SPECIMEN", "DO NOT COPY"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setDetails((d) => ({ ...d, watermarkText: preset }));
                              patch({ watermarkText: preset });
                            }}
                            className={`rounded px-1.5 py-0.5 text-[10px] border transition ${
                              details.watermarkText === preset
                                ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Prints diagonal semi-transparent watermark text on all sheets to prevent unauthorized exam paper leaks.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Card 3: General Instructions */}
            <section className="card space-y-3 p-4 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                General Instructions
              </h2>

              <Field label="Instructions (Print Header)">
                <div className="flex flex-col gap-1.5">
                  <textarea
                    className="input text-xs font-sans leading-relaxed"
                    rows={4}
                    placeholder="1. All questions are compulsory.&#10;2. Section A has MCQs of 1 mark each.&#10;3. Calculators are not permitted."
                    value={details.generalInstructions}
                    onChange={(e) => setDetails({ ...details, generalInstructions: e.target.value })}
                    onBlur={() =>
                      details.generalInstructions !== paper.generalInstructions &&
                      patch({ generalInstructions: details.generalInstructions })
                    }
                  />
                  <button
                    type="button"
                    className="self-end text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    onClick={() => {
                      const sample = [
                        "1. All questions are compulsory. Internal choices are provided in some questions.",
                        ...blueprint.sections.map(
                          (s, idx) =>
                            `2.${idx + 1} ${s.title} contains ${s.count} question(s) of ${s.marksEach} mark(s) each.`,
                        ),
                        "3. Neat and labeled diagrams must be drawn wherever necessary.",
                        "4. Use of calculators and electronic devices is strictly prohibited.",
                      ].join("\n");
                      setDetails((d) => ({ ...d, generalInstructions: sample }));
                      patch({ generalInstructions: sample });
                    }}
                  >
                    ⚡ Auto-generate instructions
                  </button>
                </div>
              </Field>
            </section>
            </fieldset>
          </div>
          </div>
        </aside>

        {/* Right Column: Sections & Question Slot Workbench */}
        <div className="space-y-5">
          {/* Smart Blueprint Reconciliation Notice */}
          {paper.implications && paper.implications.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/95 p-5 shadow-sm space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                  <Sparkles className="text-amber-600" size={18} />
                  <span>
                    Blueprint Synchronization Notice ({paper.implications.length} adjustment{paper.implications.length > 1 ? "s" : ""} required)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {canEditPaper && (
                    <>
                      {paper.implications.some(
                        (i) => i.code === "CHAPTER_EXCESS" || i.code === "CHAPTER_DEFICIT",
                      ) && (
                        <button
                          type="button"
                          className="btn btn-xs !bg-amber-600 !text-white hover:!bg-amber-700 shadow-2xs font-semibold"
                          disabled={reconciling}
                          onClick={handleReconcileBlueprint}
                          title="Automatically realign question chapter allocations to match blueprint chapter quotas"
                        >
                          <Sparkles size={12} className={reconciling ? "animate-spin" : ""} />
                          <span>{reconciling ? "Rebalancing..." : "Auto-Rebalance Chapter Quotas"}</span>
                        </button>
                      )}
                      {paper.implications.some(
                        (i) => i.code === "SECTION_UNDERFILLED" || i.code === "CHAPTER_DEFICIT",
                      ) && (
                        <button
                          type="button"
                          className="btn btn-xs !bg-indigo-600 !text-white hover:!bg-indigo-700 shadow-2xs font-semibold"
                          disabled={autofilling}
                          onClick={handleAutofill}
                          title="Automatically fill empty question slots from existing question bank"
                        >
                          <Sparkles size={12} className={autofilling ? "animate-spin" : ""} />
                          <span>{autofilling ? "Auto-Filling..." : "Auto-Fill Missing Slots"}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                The blueprint linked to this paper was modified. Below is a breakdown of what needs adjustment to maintain examination standards:
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {paper.implications.map((imp, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 text-xs flex items-start gap-2.5 transition ${
                      imp.severity === "error"
                        ? "border-red-200 bg-red-50/90 text-red-950 shadow-2xs"
                        : "border-amber-200 bg-white text-amber-900 shadow-2xs"
                    }`}
                  >
                    <span
                      className={`badge shrink-0 text-[10px] font-bold ${
                        imp.severity === "error"
                          ? "!bg-red-100 !text-red-800 border border-red-200"
                          : "!bg-amber-100 !text-amber-800 border border-amber-200"
                      }`}
                    >
                      {imp.code.replace(/_/g, " ")}
                    </span>
                    <p className="leading-snug font-medium">{imp.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guided Quick-Start Onboarding Banner for Empty Papers */}
          {paper.items.length === 0 && !dismissOnboarding && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs relative">
              <button
                type="button"
                onClick={() => setDismissOnboarding(true)}
                className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
                title="Dismiss quick start guide"
              >
                <X size={15} />
              </button>
              <div className="flex items-start gap-3.5">
                <div className="rounded-lg bg-slate-900 p-2 text-white shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="space-y-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Welcome to your Exam Paper Workbench
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                      This paper follows the <strong>{blueprint.name}</strong> blueprint ({progress.totalMarks} marks). Here is the fastest way to get started:
                    </p>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-3 text-xs pt-1">
                    <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 space-y-1.5">
                      <div className="font-semibold text-slate-900 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">1</span>
                          <span>Generate or Pick</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Generate complete paper using AI according to blueprint quotas, or pick from bank.
                      </p>
                      {canEditPaper && (
                        <button
                          type="button"
                          onClick={() => setAiGeneratorOpen(true)}
                          className="btn bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] py-1 px-2.5 rounded-md font-bold inline-flex items-center gap-1 shadow-2xs mt-1"
                        >
                          <Sparkles size={11} /> Generate with AI
                        </button>
                      )}
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 space-y-1">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-800">2</span>
                        <span>Print &amp; School Setup</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Switch to the <strong>Print Setup</strong> tab on the left to customize the Sarvodaya header, exam date, booklet layout, and instructions.
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 space-y-1">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-800">3</span>
                        <span>Export &amp; Finalize</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Use <strong>Export &amp; Print</strong> to print folded A3/A4 booklets, export Word .docx papers, and generate marking schemes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {blueprint.sections.map((s, si) => {
            const items = paper.items.filter((i) => i.sectionId === s.id);
            const st = progress.sections.find((x) => x.id === s.id)!;
            const effectiveUnits = items.reduce((sum, it) => {
              if (it.question.type === "MATCH_COLUMN" || s.type === "MATCH_COLUMN") {
                const pairs = parseMatchColumnPairs(it.question.options, it.question.text);
                return sum + (s.count === 1 ? 1 : (pairs.length > 0 ? Math.min(pairs.length, s.count) : s.count));
              }
              const subLen = it.question.subparts?.length || 0;
              return sum + (subLen > 1 && s.count >= subLen ? subLen : 1);
            }, 0);
            const isOverfilled = effectiveUnits > s.count;
            const isSectionFull = effectiveUnits === s.count;
            const emptySlots = Math.max(0, s.count - effectiveUnits);
            const isCollapsed = !!collapsedSections[s.id];

            return (
              <section
                key={s.id}
                className="card space-y-3 p-5 shadow-xs transition border-slate-200"
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">
                        {s.title}
                        {blueprint.sections.filter((x) => x.title.trim().toLowerCase() === s.title.trim().toLowerCase()).length > 1 && (
                          <span className="ml-2 font-semibold text-indigo-700 text-sm">
                            · {QUESTION_TYPE_LABEL[s.type as keyof typeof QUESTION_TYPE_LABEL] || s.type}
                          </span>
                        )}
                      </h2>
                      <span
                        className={`badge ${
                          isOverfilled
                            ? "!bg-red-100 !text-red-800 border border-red-300 font-bold"
                            : isSectionFull
                            ? "!bg-emerald-50 !text-emerald-800 border border-emerald-200"
                            : "!bg-amber-50 !text-amber-800 border border-amber-200"
                        }`}
                      >
                        {items.length === 1 && s.type === "MATCH_COLUMN"
                          ? `1 question (${parseMatchColumnPairs(items[0].question.options, items[0].question.text).length || s.count} matching pairs)`
                          : items.length === 1 && effectiveUnits > 1
                          ? `1 question (${effectiveUnits} sub-parts)`
                          : s.type === "MATCH_COLUMN" && items.length === 0
                          ? `0/1 question (${s.count} pairs)`
                          : `${effectiveUnits}/${s.count} questions`}{" "}
                        {isOverfilled ? `(${effectiveUnits - s.count} excess!)` : ""}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {QUESTION_TYPE_LABEL[s.type as keyof typeof QUESTION_TYPE_LABEL]} · {s.count} question(s) ×{" "}
                      {s.marksEach} mark(s) ={" "}
                      <span className="font-semibold text-slate-700">{s.count * s.marksEach} marks</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canEditPaper && effectiveUnits < s.count && (
                      <>
                        <button
                          className="btn btn-sm btn-primary shadow-2xs"
                          onClick={() => {
                            setCollapsedSections((prev) => ({ ...prev, [s.id]: false }));
                            setPickerSectionId(s.id);
                          }}
                        >
                          <Plus size={13} /> Add Question
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-2xs flex items-center gap-1 text-xs font-semibold"
                          onClick={() => {
                            setCollapsedSections((prev) => ({ ...prev, [s.id]: false }));
                            setSectionAiModalSection(s);
                          }}
                          title="Generate questions for this section using AI"
                        >
                          <Sparkles size={12} />
                          <span>AI Fill</span>
                        </button>
                        <button
                          type="button"
                          disabled={sectionAutofilling === s.id}
                          className="btn btn-sm border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-2xs flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
                          onClick={() => {
                            setCollapsedSections((prev) => ({ ...prev, [s.id]: false }));
                            handleSectionAutofill(s.id);
                          }}
                          title="Auto-fill empty slots in this section from question bank"
                        >
                          <RefreshCw size={12} className={sectionAutofilling === s.id ? "animate-spin" : ""} />
                          <span>{sectionAutofilling === s.id ? "Filling…" : "Auto-Fill"}</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setCollapsedSections((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className="btn btn-sm border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs flex items-center gap-1 text-xs font-semibold"
                      title={isCollapsed ? "Expand section questions" : "Collapse section"}
                    >
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      <span>{isCollapsed ? "Expand" : "Collapse"}</span>
                    </button>
                  </div>
                </div>

                {isCollapsed ? (
                  <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                    <span>
                      {items.length === 0
                        ? "No questions added yet."
                        : `${items.length} question(s) placed (${items.length * s.marksEach} marks).`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCollapsedSections((prev) => ({ ...prev, [s.id]: false }))}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Show questions &rarr;
                    </button>
                  </div>
                ) : (
                  <>
                    {s.instructions && (
                      <p className="rounded-md bg-slate-50 px-3 py-1.5 text-xs italic text-slate-600">
                        {s.instructions}
                      </p>
                    )}

                    {/* Question Slots List */}
                    <ol className="space-y-3 pt-1">
                      {items.map((it, idx) => {
                        const questionNumber = (firstNumber.get(s.id) ?? 1) + idx;
                        const secLetterMatch = s.title.match(/\b([A-Z])\b/i);
                        const secLetter = secLetterMatch ? secLetterMatch[1].toUpperCase() : String.fromCharCode(65 + (si % 26));
                        const numberLabel = formatQuestionNumber(
                          paper.numberingStyle || "CONTINUOUS",
                          questionNumber - 1,
                          secLetter,
                          idx
                        );
                        const isSubjectiveCompat =
                          (it.question.type === "SHORT" || it.question.type === "LONG") &&
                          (s.type === "SHORT" || s.type === "LONG") &&
                          s.marksEach >= 3;
                        const isObjectiveCompat =
                          ["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "ONE_WORD"].includes(it.question.type) &&
                          ["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "ONE_WORD"].includes(s.type) &&
                          s.marksEach === 1;
                        const isTypeMismatch = it.question.type !== s.type && !isSubjectiveCompat && !isObjectiveCompat;
                        const isExcess = idx >= s.count || effectiveUnits > s.count;

                        const isMatchQ = it.question.type === "MATCH_COLUMN" || s.type === "MATCH_COLUMN";
                        const matchCount = isMatchQ
                          ? (parseMatchColumnPairs(it.question.options, it.question.text).length || s.count)
                          : 0;
                        const subpartsMarks = it.question.subparts && it.question.subparts.length > 0
                          ? it.question.subparts.reduce((sum, sp) => sum + (sp.marks || 1), 0)
                          : 0;
                        const questionTotalMarks = isMatchQ
                          ? (s.count === 1 ? s.marksEach : Math.min(matchCount * s.marksEach, s.count * s.marksEach))
                          : subpartsMarks > 0
                          ? subpartsMarks
                          : s.marksEach;

                        return (
                          <Fragment key={it.id}>
                            {it.pageBreakBefore && (
                              <div className="flex items-center gap-2 py-1 px-3 my-1.5 text-xs font-mono font-semibold text-amber-800 bg-amber-50/90 border-y border-dashed border-amber-300 rounded-lg">
                                <Scissors size={13} className="text-amber-600 rotate-90" />
                                <span>Forced Page Break (Starts new page here)</span>
                                {canEditPaper && !final && (
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePageBreak(it.id, false)}
                                    className="ml-auto text-amber-700 hover:text-amber-950 font-sans font-bold hover:underline"
                                    title="Remove forced page break"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            )}
                            <li
                              className={`rounded-xl border p-4 shadow-2xs transition hover:border-slate-300 ${
                              isExcess || isTypeMismatch
                                ? "border-amber-300 bg-amber-50/20"
                                : "border-slate-200/90 bg-white"
                            }`}
                          >
                            {(isTypeMismatch || isExcess) && (
                              <div className="mb-2.5 flex flex-wrap gap-1.5">
                                {isTypeMismatch && (
                                  <span className="badge !bg-red-100 !text-red-800 border border-red-200 text-[10px] font-bold">
                                    ⚠ Type Mismatch: Expected {QUESTION_TYPE_LABEL[s.type as keyof typeof QUESTION_TYPE_LABEL] || s.type}, but question is {it.question.type}
                                  </span>
                                )}
                                {isExcess && (
                                  <span className="badge !bg-amber-100 !text-amber-800 border border-amber-200 text-[10px] font-bold">
                                    ⚠ Excess Slot: Section quota is {s.count} questions. Remove this question to balance section.
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Question Content View */}
                            <div className={`paper-font text-sm leading-relaxed transition ${bwPreviewIds[it.question.id] ? "grayscale contrast-150" : ""}`}>
                              <QuestionView
                                q={it.question}
                                orQuestion={it.orQuestion}
                                number={questionNumber}
                                numberLabel={numberLabel}
                                marks={questionTotalMarks}
                                marksStyle={paper.marksStyle || "RIGHT_COLUMN"}
                              />
                            </div>

                            {/* Question Usage History & Freshness Alerts */}
                            {((it.question.usages && it.question.usages.length > 0) ||
                              (it.orQuestion?.usages && it.orQuestion.usages.length > 0)) && (
                              <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2">
                                {it.question.usages && it.question.usages.length > 0 && (
                                  <div className="space-y-1">
                                    <QuestionFreshnessAlert usages={it.question.usages} currentPaper={paper} />
                                    <QuestionUsagePills usages={it.question.usages} currentPaperId={paper.id} currentPaper={paper} />
                                  </div>
                                )}
                                {it.orQuestion?.usages && it.orQuestion.usages.length > 0 && (
                                  <div className="border-t border-purple-100 pt-1.5 mt-1.5 space-y-1">
                                    <div className="text-[11px] font-semibold text-purple-700">
                                      Alternate (OR) Question Usage:
                                    </div>
                                    <QuestionFreshnessAlert usages={it.orQuestion.usages} currentPaper={paper} />
                                    <QuestionUsagePills usages={it.orQuestion.usages} currentPaperId={paper.id} currentPaper={paper} />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Metadata Tagline & Action Toolbar */}
                            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {it.question.usages?.some((u) => isExhaustedUsage(u, paper)) && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-950 border border-amber-300 ring-1 ring-amber-400/40">
                                    <AlertTriangle size={11} className="text-amber-700 shrink-0" />
                                    Exhausted Question
                                  </span>
                                )}
                                <span className="badge font-semibold !bg-slate-100 !text-slate-700 border border-slate-200">{it.question.difficulty}</span>
                                <span className="badge !bg-slate-100 text-slate-700 font-medium border border-slate-200">
                                  Ch {it.question.chapter?.number}. {it.question.chapter?.title}
                                </span>
                                {it.orQuestion && (
                                  <span className="badge !bg-purple-50 !text-purple-800 border border-purple-200 font-semibold">
                                    Internal Choice (Ch {it.orQuestion.chapter?.number})
                                  </span>
                                )}
                              </div>

                              {canEditPaper && (
                                <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                                  {!it.orQuestion ? (
                                    <button
                                      className="btn btn-sm border-slate-200 bg-white text-slate-600 hover:text-purple-700 hover:border-purple-200 hover:bg-purple-50/50 shadow-2xs font-medium"
                                      title="Add internal choice alternate question (OR)"
                                      onClick={() => setAlternateItem({ item: it, section: s })}
                                    >
                                      + OR Choice
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        className="btn btn-sm border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium"
                                        title="Change alternate question"
                                        onClick={() => setAlternateItem({ item: it, section: s })}
                                      >
                                        Change OR
                                      </button>
                                      <button
                                        className="btn btn-sm text-red-600 hover:bg-red-50 font-medium"
                                        title="Remove alternate question"
                                        onClick={() =>
                                          call(
                                            () =>
                                              api<PaperData>(`/api/papers/${id}/questions/${it.id}`, {
                                                method: "PATCH",
                                                json: { orQuestionId: null },
                                              }),
                                            adopt,
                                          )
                                        }
                                      >
                                        Unlink OR
                                      </button>
                                    </>
                                  )}

                                  {it.question.imagePath ? (
                                    <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200/90 bg-slate-50/80 p-0.5">
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                        <Printer size={11} className="text-slate-400" />
                                        Diagram
                                      </span>
                                      <button
                                        className="btn btn-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs font-medium"
                                        title="Swap diagram with another from educational library"
                                        onClick={() => setDiagramModalItem({ item: it, section: s })}
                                      >
                                        <RefreshCw size={11} className="text-slate-500" /> Swap
                                      </button>
                                      <button
                                        className="btn btn-xs border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-2xs font-medium"
                                        title="Edit or mask labels in Figure Studio"
                                        onClick={() =>
                                          setStudioItem({
                                            item: it,
                                            section: s,
                                            initialUrl: it.question.imagePath ? imageUrl(it.question.imagePath) : null,
                                          })
                                        }
                                      >
                                        <PencilRuler size={11} className="text-indigo-600" /> Studio
                                      </button>
                                      <button
                                        className={`btn btn-xs font-medium ${
                                          bwPreviewIds[it.question.id]
                                            ? "bg-slate-800 text-white border-slate-700 shadow-2xs"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs"
                                        }`}
                                        title="Preview how this figure looks on B&W photocopier"
                                        onClick={() =>
                                          setBwPreviewIds((prev) => ({
                                            ...prev,
                                            [it.question.id]: !prev[it.question.id],
                                          }))
                                        }
                                      >
                                        <Printer size={11} />
                                        {bwPreviewIds[it.question.id] ? "B&W On" : "B&W Test"}
                                      </button>
                                      <button
                                        className="btn btn-xs border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 shadow-2xs font-medium"
                                        title="Remove diagram from this question"
                                        onClick={() =>
                                          call(
                                            async () => {
                                              await api(`/api/questions/${it.question.id}`, {
                                                method: "PATCH",
                                                json: { imagePath: null },
                                              });
                                              return api<PaperData>(`/api/papers/${id}`);
                                            },
                                            adopt,
                                          )
                                        }
                                      >
                                        <X size={11} className="text-amber-600" /> Remove
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      className="btn btn-sm border-slate-200 bg-white text-slate-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50/50 shadow-2xs font-medium"
                                      title="Add educational diagram or vector figure to this question"
                                      onClick={() => setDiagramModalItem({ item: it, section: s })}
                                    >
                                      <ImagePlus size={12} className="text-slate-400" /> + Diagram
                                    </button>
                                  )}

                                  <button
                                    className="btn btn-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-medium"
                                    title="Edit question text or options"
                                    onClick={() => setEditingItem({ item: it, section: s })}
                                  >
                                    <Pencil size={12} className="text-slate-500" /> Edit
                                  </button>

                                  <button
                                    className="btn btn-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-medium"
                                    title="Replace with another question from bank"
                                    onClick={() => setReplacingItem({ item: it, section: s })}
                                  >
                                    <RefreshCw size={12} className="text-slate-400" /> Replace
                                  </button>

                                  {/* Quick Swap Popover */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      className={`btn btn-sm font-medium ${
                                        quickSwapItemId === it.id
                                          ? "bg-indigo-100 text-indigo-900 border-indigo-300 shadow-2xs"
                                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                                      }`}
                                      title="1-click Quick Swap with a sibling question from the same chapter"
                                      onClick={() => {
                                        if (quickSwapItemId === it.id) {
                                          setQuickSwapItemId(null);
                                        } else {
                                          handleOpenQuickSwap(it.id);
                                        }
                                      }}
                                    >
                                      <RefreshCw size={11} className={`text-indigo-600 ${quickSwapItemId === it.id ? "rotate-180 transition-transform" : ""}`} />
                                      <span>Quick Swap</span>
                                    </button>

                                    {quickSwapItemId === it.id && (
                                      <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-30 space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                          <div>
                                            <div className="text-xs font-bold text-slate-900">Sibling Questions</div>
                                            <div className="text-[10px] text-slate-500">Same chapter &amp; type from bank</div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setQuickSwapItemId(null)}
                                            className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                                          >
                                            ✕
                                          </button>
                                        </div>

                                        {siblingLoading ? (
                                          <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                                            <RefreshCw size={13} className="animate-spin text-indigo-600" />
                                            <span>Searching question bank…</span>
                                          </div>
                                        ) : siblingQuestions.length === 0 ? (
                                          <div className="py-4 text-center text-xs text-slate-500">
                                            No alternative unused questions found in this chapter and question type.
                                            <div className="mt-2">
                                              <button
                                                type="button"
                                                className="text-indigo-600 font-semibold hover:underline text-[11px]"
                                                onClick={() => {
                                                  setQuickSwapItemId(null);
                                                  setReplacingItem({ item: it, section: s });
                                                }}
                                              >
                                                Open Full Question Bank Picker &rarr;
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                                            {siblingQuestions.map((sib) => (
                                              <div
                                                key={sib.id}
                                                className="group rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-200 p-2 text-xs transition flex flex-col gap-1.5"
                                              >
                                                <div className="line-clamp-2 text-slate-800 font-medium leading-relaxed group-hover:text-indigo-950">
                                                  {sib.text}
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                                                    {sib.difficulty || "MEDIUM"}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    disabled={swappingBusy}
                                                    onClick={() => handleExecuteQuickSwap(it.id, sib.id)}
                                                    className="btn btn-xs btn-primary shadow-2xs font-semibold"
                                                  >
                                                    Swap In
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Page Break Toggle */}
                                  <button
                                    type="button"
                                    className={`btn btn-sm font-medium ${
                                      it.pageBreakBefore
                                        ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                                    }`}
                                    title={it.pageBreakBefore ? "Remove forced page break before this question" : "Force page break before this question in print & export"}
                                    onClick={() => handleTogglePageBreak(it.id, !it.pageBreakBefore)}
                                  >
                                    <Scissors size={11} className={it.pageBreakBefore ? "text-amber-700" : "text-slate-400"} />
                                    <span>{it.pageBreakBefore ? "Page Break ✓" : "Page Break"}</span>
                                  </button>

                                  <div className="inline-flex items-center rounded-md border border-slate-200 bg-white shadow-2xs overflow-hidden">
                                    <button
                                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white"
                                      disabled={idx === 0}
                                      title="Move question up"
                                      onClick={() =>
                                        call(
                                          () =>
                                            api<PaperData>(`/api/papers/${id}/questions/${it.id}`, {
                                              method: "PATCH",
                                              json: { direction: "up" },
                                            }),
                                          adopt,
                                        )
                                      }
                                    >
                                      <ArrowUp size={12} />
                                    </button>
                                    <div className="h-3 w-px bg-slate-200" />
                                    <button
                                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white"
                                      disabled={idx === items.length - 1}
                                      title="Move question down"
                                      onClick={() =>
                                        call(
                                          () =>
                                            api<PaperData>(`/api/papers/${id}/questions/${it.id}`, {
                                              method: "PATCH",
                                              json: { direction: "down" },
                                            }),
                                          adopt,
                                        )
                                      }
                                    >
                                      <ArrowDown size={12} />
                                    </button>
                                  </div>

                                  <button
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition ml-0.5"
                                    title="Remove question from paper"
                                    onClick={() =>
                                      call(
                                        () =>
                                          api<PaperData>(`/api/papers/${id}/questions/${it.id}`, {
                                            method: "DELETE",
                                          }),
                                        adopt,
                                      )
                                    }
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </li>
                        </Fragment>
                      );
                    })}

                      {/* Interactive Empty Slot Targets */}
                      {Array.from({
                        length: s.type === "MATCH_COLUMN" ? (items.length === 0 ? 1 : 0) : emptySlots,
                      }).map((_, i) => {
                        const slotNum = effectiveUnits + i + 1;
                        return (
                          <li key={`empty-${i}`}>
                            {canEditPaper ? (
                              <button
                                type="button"
                                onClick={() => setPickerSectionId(s.id)}
                                className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 text-sm text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-800 transition flex items-center justify-center gap-2 group cursor-pointer"
                              >
                                <Plus
                                  size={16}
                                  className="text-slate-400 group-hover:text-indigo-600 transition group-hover:scale-110"
                                />
                                <span>
                                  {s.type === "MATCH_COLUMN" ? (
                                    <>
                                      Match the Columns Question &mdash;{" "}
                                      <strong className="font-semibold">
                                        Click to select question ({s.count * s.marksEach}m · {s.count} pairs)
                                      </strong>
                                    </>
                                  ) : (
                                    <>
                                      Slot {slotNum} of {s.count} &mdash;{" "}
                                      <strong className="font-semibold">
                                        Click to select question ({s.marksEach}m{" "}
                                        {QUESTION_TYPE_LABEL[s.type as keyof typeof QUESTION_TYPE_LABEL]})
                                      </strong>
                                    </>
                                  )}
                                </span>
                              </button>
                            ) : (
                              <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400 text-center">
                                {s.type === "MATCH_COLUMN"
                                  ? `Empty match the columns question (${s.count * s.marksEach}m)`
                                  : `Empty slot ${slotNum} of ${s.count}`}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>

                    {si === blueprint.sections.length - 1 && !progress.complete && (
                      <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 p-3 text-xs text-indigo-800 flex items-center gap-2 mt-2">
                        <Sparkles size={15} className="text-indigo-600 shrink-0" />
                        <span>
                          Tip: Use <strong>Smart Auto-Fill</strong> at the top to automatically pick suitable questions from
                          your bank that satisfy all remaining chapter marks!
                        </span>
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>

        {/* Right Column: Live Sheet Preview (Split Screen) */}
        {splitPreview && (
          <aside className="sticky top-20 self-start flex flex-col h-[calc(100vh-6rem)] rounded-2xl border border-slate-200/90 bg-slate-100/70 p-3 shadow-xs">
            {/* Header bar with Zoom controls, page count, and open print preview link */}
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">Live Print Sheet</span>
                <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-600 font-mono">
                  {paper.layout === "BOOKLET_A4" ? "A5" : "A4"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.max(0.35, Number((z - 0.05).toFixed(2))))}
                    className="px-1.5 py-0.5 text-xs text-slate-600 hover:text-slate-900 font-bold"
                    title="Zoom out"
                  >
                    −
                  </button>
                  <span className="px-1 text-[11px] font-mono font-medium text-slate-700 min-w-[34px] text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.min(1.0, Number((z + 0.05).toFixed(2))))}
                    className="px-1.5 py-0.5 text-xs text-slate-600 hover:text-slate-900 font-bold"
                    title="Zoom in"
                  >
                    +
                  </button>
                </div>
                <Link
                  href={`/papers/${id}/print`}
                  target="_blank"
                  className="text-slate-400 hover:text-indigo-600 transition p-1"
                  title="Open full print view in new tab"
                >
                  <ExternalLink size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => setSplitPreview(false)}
                  className="text-slate-400 hover:text-slate-600 transition p-1"
                  title="Close live sheet preview"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Scrollable container with zoom applied */}
            <div className="flex-1 overflow-y-auto overscroll-contain rounded-xl bg-slate-200/60 p-2 flex justify-center">
              <div
                className="origin-top transition-transform"
                style={{ zoom: previewZoom }}
              >
                <PaperSheets
                  paper={paper}
                  view="reading"
                  watermark={details.securityWatermark}
                  watermarkText={details.watermarkText}
                  compact={details.printDensity === "COMPACT"}
                  showSignatures={details.showSignatures}
                />
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Modals & Pickers */}
      {pickerSection && (
        <QuestionPicker
          paper={paper}
          section={pickerSection}
          books={books}
          onPaper={adopt}
          onClose={() => setPickerSectionId(null)}
        />
      )}

      {editingItem && (
        <Modal
          title={`Edit Question in ${editingItem.section.title} — ${
            QUESTION_TYPE_LABEL[editingItem.section.type as keyof typeof QUESTION_TYPE_LABEL]
          }`}
          onClose={() => setEditingItem(null)}
          wide
        >
          <QuestionForm
            books={books}
            initial={editingItem.item.question}
            fixedBookId={paper.blueprint.bookId}
            fixedType={editingItem.section.type}
            targetMarks={editingItem.section.marksEach}
            showPaperEditModes={true}
            submitLabel="Save Changes"
            onCancel={() => setEditingItem(null)}
            customSaveHandler={async (payload, mode) => {
              const updated = await api<PaperData>(`/api/papers/${id}/questions/${editingItem.item.id}`, {
                method: "PUT",
                json: { mode, question: payload },
              });
              adopt(updated);
              setEditingItem(null);
            }}
          />
        </Modal>
      )}

      {replacingItem && (
        <QuestionPicker
          paper={paper}
          section={replacingItem.section}
          books={books}
          replacingItemId={replacingItem.item.id}
          onPaper={adopt}
          onClose={() => setReplacingItem(null)}
        />
      )}

      {alternateItem && (
        <QuestionPicker
          paper={paper}
          section={alternateItem.section}
          books={books}
          alternateTargetItemId={alternateItem.item.id}
          onPaper={adopt}
          onClose={() => setAlternateItem(null)}
        />
      )}

      {duplicatingSet && (
        <Modal
          title="Generate Parallel Exam Set"
          subtitle="Generate Set B, Set C, or Set D with shuffled questions and permutation of MCQ options."
          onClose={() => setDuplicatingSet(false)}
        >
          <form onSubmit={handleDuplicateSet} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Instantly create a new exam paper set based on this paper. Questions will be grouped in the exact same
              sections, adhering to all blueprint marks and chapter weightages.
            </p>
            <Field label="Set Identifier / Name">
              <input
                className="input"
                required
                value={duplicateForm.targetSet}
                placeholder="e.g. SET B, SET 2, SET C"
                onChange={(e) => setDuplicateForm({ ...duplicateForm, targetSet: e.target.value })}
              />
            </Field>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">Anti-Cheating &amp; Shuffling Options:</div>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={duplicateForm.shuffleQuestions}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, shuffleQuestions: e.target.checked })}
                />
                <span>Shuffle question order within each section</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={duplicateForm.shuffleMcqOptions}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, shuffleMcqOptions: e.target.checked })}
                />
                <span>Shuffle MCQ options (A, B, C, D) and recalculate answer keys</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" className="btn" onClick={() => setDuplicatingSet(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={duplicatingBusy || !duplicateForm.targetSet.trim()}
              >
                {duplicatingBusy ? "Generating…" : "Generate Parallel Set"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Controlled Multi-Set Suite Generator (CBSE 60/40 Overlap) */}
      {multiSetModalOpen && (
        <MultiSetGeneratorModal
          paper={paper}
          onClose={() => setMultiSetModalOpen(false)}
          onSuccess={(res) => {
            setCreatedPaperLinks(res.createdPapers.map((p) => ({ id: p.id, title: p.title, setCode: p.setCode })));
            setInfoMessage(res.message);
          }}
        />
      )}

      {/* AI Cognitive Balance & Flaw Auditor */}
      {aiAuditOpen && paper && (
        <AIPaperAuditModal
          paperId={id}
          paperTitle={details.title || paper.title}
          onClose={() => setAiAuditOpen(false)}
          onQuestionUpdated={reloadPaper}
        />
      )}

      {/* AI Complete Question Paper Generator */}
      {aiGeneratorOpen && paper && (
        <AIPaperGeneratorModal
          paperId={id}
          paperTitle={details.title || paper.title}
          open={aiGeneratorOpen}
          onClose={() => setAiGeneratorOpen(false)}
          onPaperUpdated={(updatedPaper) => {
            setPaper(updatedPaper);
            reloadPaper();
          }}
        />
      )}

      {/* Question Paper & Section Import Modal */}
      {paperImportOpen && paper && (
        <PaperImportModal
          isOpen={paperImportOpen}
          onClose={() => setPaperImportOpen(false)}
          currentPaper={paper}
          blueprints={[paper.blueprint]}
          onPaperUpdated={reloadPaper}
        />
      )}

      {/* Educational Diagram Search & Picker Modal */}
      {diagramModalItem && paper && (
        <DiagramSearchModal
          isOpen={true}
          subject={paper.blueprint?.book?.subject || paper.blueprint?.name || ""}
          chapterTitle={diagramModalItem.item.question.chapter?.title || ""}
          questionText={diagramModalItem.item.question.text}
          onClose={() => setDiagramModalItem(null)}
          onSelectDiagram={async ({ imagePath }) => {
            const currentItem = diagramModalItem;
            setDiagramModalItem(null);
            await api(`/api/questions/${currentItem.item.question.id}`, {
              method: "PATCH",
              json: { imagePath },
            });
            await reloadPaper();
          }}
          onOpenInStudio={(imgUrl) => {
            const currentItem = diagramModalItem;
            setDiagramModalItem(null);
            setStudioItem({
              item: currentItem.item,
              section: currentItem.section,
              initialUrl: imgUrl || null,
            });
          }}
        />
      )}

      {/* Figure Studio for Custom Editing or Masking */}
      {studioItem && (
        <FigureStudio
          initialImageUrl={studioItem.initialUrl}
          onCancel={() => setStudioItem(null)}
          onDone={async (png) => {
            const currentItem = studioItem;
            setStudioItem(null);
            const fd = new FormData();
            fd.append("file", png, "diagram.png");
            const res = await api<{ name: string }>("/api/uploads", {
              method: "POST",
              body: fd,
            });
            await api(`/api/questions/${currentItem.item.question.id}`, {
              method: "PATCH",
              json: { imagePath: res.name },
            });
            await reloadPaper();
          }}
        />
      )}

      {/* Pre-Finalization Quality Preflight Modal */}
      {preflightOpen && paper && (
        <PaperPreflightModal
          isOpen={preflightOpen}
          paper={paper}
          onClose={() => setPreflightOpen(false)}
          onConfirmFinalize={() => {
            setPreflightOpen(false);
            patch({ status: "FINAL" });
          }}
        />
      )}

      {/* Section-Specific AI Question Generator Modal */}
      {sectionAiModalSection && paper && (
        <SectionAiModal
          isOpen={Boolean(sectionAiModalSection)}
          section={sectionAiModalSection}
          paper={paper}
          onClose={() => setSectionAiModalSection(null)}
          onCommitted={(updated: PaperData) => {
            adopt(updated);
            setSectionAiModalSection(null);
          }}
        />
      )}

      {/* Version History Checkpoint Drawer */}
      {paper && (
        <PaperSnapshotDrawer
          isOpen={historyDrawerOpen}
          paperId={id}
          paperTitle={paper.title}
          isFinalized={paper.status === "FINAL"}
          onClose={() => setHistoryDrawerOpen(false)}
          onRestore={adopt}
        />
      )}

      {/* Subject Instructions & Formula Toolkit Drawer */}
      <SubjectWorkspaceDrawer
        isOpen={toolkitDrawerOpen}
        onClose={() => setToolkitDrawerOpen(false)}
        onApplyInstructions={(instructions) => {
          setDetails((d) => ({ ...d, generalInstructions: instructions }));
          api(`/api/papers/${id}`, {
            method: "PATCH",
            json: { generalInstructions: instructions },
          }).then((p) => adopt(p as PaperData)).catch(() => undefined);
        }}
      />
    </div>
  );
}

export function MultiSetGeneratorModal({
  paper,
  onClose,
  onSuccess,
}: {
  paper: PaperData;
  onClose: () => void;
  onSuccess: (result: {
    parentPaperId: string;
    createdPapers: Array<{
      id: string;
      title: string;
      setCode: string;
      totalQuestions: number;
      commonCount: number;
      variantCount: number;
      overlapPercentage: number;
    }>;
    warnings: string[];
    message: string;
  }) => void;
}) {
  const defaultNext = nextSetIdentifier(paper.paperSet || "SET A");
  const [selectedSets, setSelectedSets] = useState<string[]>([defaultNext, nextSetIdentifier(defaultNext)]);
  const [customSetInput, setCustomSetInput] = useState("");
  const [preset, setPreset] = useState<"CBSE_60" | "HIGH_80" | "IDENTICAL_100" | "CUSTOM">("CBSE_60");
  const [commonRatio, setCommonRatio] = useState<number>(0.6);
  const [shufflePositions, setShufflePositions] = useState(true);
  const [shuffleMcqOptions, setShuffleMcqOptions] = useState(true);
  const [excludeUsedThisSession, setExcludeUsedThisSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalQuestions = paper.items.length;
  const commonCount = Math.min(totalQuestions, Math.max(0, Math.round(totalQuestions * commonRatio)));
  const variantCount = totalQuestions - commonCount;

  function handlePresetChange(p: "CBSE_60" | "HIGH_80" | "IDENTICAL_100" | "CUSTOM") {
    setPreset(p);
    if (p === "CBSE_60") setCommonRatio(0.6);
    else if (p === "HIGH_80") setCommonRatio(0.8);
    else if (p === "IDENTICAL_100") setCommonRatio(1.0);
  }

  function toggleSet(setCode: string) {
    if (selectedSets.includes(setCode)) {
      setSelectedSets(selectedSets.filter((s) => s !== setCode));
    } else {
      setSelectedSets([...selectedSets, setCode]);
    }
  }

  function addCustomSet() {
    const trimmed = customSetInput.trim().toUpperCase();
    if (trimmed && !selectedSets.includes(trimmed)) {
      setSelectedSets([...selectedSets, trimmed]);
      setCustomSetInput("");
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSets.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{
        success: boolean;
        parentPaperId: string;
        createdPapers: Array<{
          id: string;
          title: string;
          setCode: string;
          totalQuestions: number;
          commonCount: number;
          variantCount: number;
          overlapPercentage: number;
        }>;
        warnings: string[];
        message: string;
      }>(`/api/papers/${paper.id}/parallel-sets`, {
        method: "POST",
        json: {
          sets: selectedSets,
          commonRatio,
          shufflePositions,
          shuffleMcqOptions,
          skipAcademicSessionCollisions: excludeUsedThisSession,
        },
      });
      onSuccess(res);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Generate Multi-Set Exam Suite"
      subtitle="Produce parallel sets with controlled overlap adhering to board parity quotas."
      onClose={onClose}
      wide
    >
      <form onSubmit={handleGenerate} className="space-y-4 text-xs">
        {/* Source Paper Banner */}
        <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/70 p-3 text-purple-900">
          <div>
            <span className="font-bold">Source Paper:</span> {paper.title} ({paper.paperSet || "SET A"})
            <div className="text-[11px] text-purple-700 mt-0.5">
              {paper.blueprint.book.className} {paper.blueprint.book.subject} · {totalQuestions} Questions ·{" "}
              {paper.progress.usedMarks} Marks
            </div>
          </div>
          <span className="badge !bg-purple-200/80 !text-purple-900 font-bold">Base Set</span>
        </div>

        {/* Target Sets Selector */}
        <div className="space-y-2">
          <span className="label !mb-1">Target Parallel Sets to Generate:</span>
          <div className="flex flex-wrap items-center gap-2">
            {["SET B", "SET C", "SET D"].map((s) => (
              <button
                key={s}
                type="button"
                className={`rounded-lg border px-3 py-1.5 font-semibold transition ${
                  selectedSets.includes(s)
                    ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => toggleSet(s)}
              >
                {selectedSets.includes(s) ? "✓ " : "+ "}
                {s}
              </button>
            ))}

            <div className="flex items-center gap-1 ml-auto">
              <input
                className="input py-1 text-xs w-28"
                placeholder="Custom set…"
                value={customSetInput}
                onChange={(e) => setCustomSetInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomSet();
                  }
                }}
              />
              <button type="button" className="btn btn-sm" onClick={addCustomSet}>
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Overlap Ratio Selector */}
        <div className="space-y-2">
          <span className="label !mb-1">Question Overlap Configuration:</span>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              className={`rounded-xl border p-3 text-left transition ${
                preset === "CBSE_60"
                  ? "border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              onClick={() => handlePresetChange("CBSE_60")}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">CBSE Standard</span>
                <span className="badge !bg-indigo-100 !text-indigo-800 text-[10px] font-bold">Standard</span>
              </div>
              <p className="text-slate-600 mt-1 text-[11px] font-medium">60% Common / 40% Variant</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Official board parallel set distribution</p>
            </button>

            <button
              type="button"
              className={`rounded-xl border p-3 text-left transition ${
                preset === "HIGH_80"
                  ? "border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              onClick={() => handlePresetChange("HIGH_80")}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">High Overlap</span>
              </div>
              <p className="text-slate-600 mt-1 text-[11px] font-medium">80% Common / 20% Variant</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Minor variation across sets</p>
            </button>

            <button
              type="button"
              className={`rounded-xl border p-3 text-left transition ${
                preset === "IDENTICAL_100"
                  ? "border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              onClick={() => handlePresetChange("IDENTICAL_100")}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">100% Core</span>
              </div>
              <p className="text-slate-600 mt-1 text-[11px] font-medium">Full Duplicate &amp; Scramble</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Scrambled order &amp; options</p>
            </button>
          </div>

          {/* Dynamic Allocation Breakdown */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
            <span className="text-slate-600 font-medium">
              Projected Set Composition:{" "}
              <b className="text-indigo-700">{commonCount} Common Questions</b> ·{" "}
              <b className="text-purple-700">{variantCount} Variant Questions</b>
            </span>
            <span className="text-slate-500 font-semibold">{Math.round(commonRatio * 100)}% Shared Ratio</span>
          </div>
        </div>

        {/* Anti-Cheating & Board Parity Options */}
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-slate-700">
          <div className="font-bold text-slate-900 mb-1">Board Parity &amp; Anti-Cheating Guardrails:</div>
          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={shufflePositions}
              onChange={(e) => setShufflePositions(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span>Shuffle question order within each section</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={shuffleMcqOptions}
              onChange={(e) => setShuffleMcqOptions(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span>Shuffle MCQ options (A, B, C, D) and auto-recalculate answer keys</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={excludeUsedThisSession}
              onChange={(e) => setExcludeUsedThisSession(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span>Exclude questions already used in academic session ({paper.academicSession})</span>
          </label>
        </div>

        <ErrorBanner message={error} />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || selectedSets.length === 0}
          >
            {busy ? "Generating Multi-Set Suite…" : `Generate ${selectedSets.length} Parallel Sets`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
