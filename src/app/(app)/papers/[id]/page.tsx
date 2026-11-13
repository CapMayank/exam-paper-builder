"use client";

import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
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
  KeyRound,
  Lightbulb,
  Lock,
  Pencil,
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
import { AICoverageModal } from "@/components/AICoverageModal";
import { PaperSheets } from "@/components/PaperSheets";
import { PaperSnapshotDrawer } from "@/components/PaperSnapshotDrawer";
import { SubjectWorkspaceDrawer } from "@/components/subject-workspace/SubjectWorkspaceDrawer";
import { SectionAiModal } from "@/components/SectionAiModal";
import { KeyDisputesBanner } from "@/components/KeyDisputesBanner";
import { slotPlanSummary } from "@/lib/slotPlan";
import { choicePolicyNote, orMenuItems, rowActions, rowMenuItems, sectionStatusLine, sectionWarning, showBankAutoFill } from "@/lib/workbenchView";
import { buildGeneralInstructions } from "@/lib/preflightChecks";
import { RowMenu } from "@/components/RowMenu";
import { answerStageSummary, runAnswerStages } from "@/lib/answerStage";
import { PaperQuestionEditModal } from "@/components/PaperQuestionEditModal";
import { QuestionPicker } from "@/components/QuestionPicker";
import { toleratesType, typeLabel } from "@/lib/sectionTypes";
import { isExhaustedUsage, QuestionFreshnessAlert, QuestionUsagePills } from "@/components/QuestionUsageHistory";
import { QuestionView } from "@/components/QuestionView";
import { ErrorBanner, Field, Modal, Spinner, useConfirm, useToast } from "@/components/ui";
import { canModifyPaper, type Actor } from "@/lib/permissions";
import { api, imageUrl } from "@/lib/client";
import {
  ACADEMIC_SESSIONS,
  DEFAULT_SCHOOL_LOGO,
  DEFAULT_SCHOOL_NAME,
  detectPaperLanguage,
  EXAM_TYPES,
  EXAM_TYPE_LABEL,
  inferExamTypeFromText,
  isSubpartQuestionType,
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
  type PaperLanguage,
} from "@/lib/constants";
import { questionSlotMarks } from "@/lib/blueprint";
import { resolveMarksStyle } from "@/lib/marksDisplay";
import { coverageRows } from "@/lib/coverage";
import { componentCoverage, parseComponents } from "@/lib/languageComponents";
import { builderQuestionLabel, computeDisplayedPaperNumbering } from "@/lib/layout";
import { nextSetIdentifier } from "@/lib/multiset";
import { paperSectionChoiceRequirement } from "@/lib/internalChoiceRules";
import { autosavePatch } from "@/lib/paperAutosave";
import { difficultyLabel } from "@/lib/questionModal";
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

// the server rejects the whole payload when one of these is empty, so autosave holds an emptied one back
const AUTOSAVE_REQUIRED = ["title", "schoolName"] as const;

export default function PaperBuilderPage({ params }: PageProps<"/papers/[id]">) {
  const { id } = use(params);
  const confirm = useConfirm();
  const toast = useToast();
  const [checkingKey, setCheckingKey] = useState(false);
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  // target: which question of the slot the Edit modal is changing (the main one or its OR alternative)
  const [editingItem, setEditingItem] = useState<{ item: PaperItem; section: Section; target: "primary" | "or" } | null>(null);
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
    language: "en" as PaperLanguage,
    generalInstructions: "",
    printDensity: "STANDARD" as PrintDensity,
    showCandidateDetails: true,
    showSignatures: false,
    securityWatermark: false,
    watermarkText: "",
  });
  const [splitPreview, setSplitPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(0.55);
  const [openRowMenu, setOpenRowMenu] = useState<{ itemId: string; kind: "more" | "or" } | null>(null);
  const [quickSwapItemId, setQuickSwapItemId] = useState<string | null>(null);
  const [siblingQuestions, setSiblingQuestions] = useState<Array<{ id: string; text: string; difficulty: string }>>([]);
  const [siblingLoading, setSiblingLoading] = useState(false);
  const [swappingBusy, setSwappingBusy] = useState(false);
  const [sectionAutofilling, setSectionAutofilling] = useState<string | null>(null);
  const [sectionAiModalSection, setSectionAiModalSection] = useState<Section | null>(null);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // The details as last loaded from (or saved to) the server: autosave sends only what differs from these.
  const loadedDetailsRef = useRef<typeof details | null>(null);
  // (declared before the autosave effect, which only saves for a user who can edit the paper)
  const [currentUser, setCurrentUser] = useState<Actor & { name: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // `error` is only the "paper failed to load" page. An action error is a toast, shown straight away so the same
  // message twice in a row still appears twice, and visible wherever the teacher has scrolled to.
  const showError = useCallback((message: string) => toast.error(message), [toast]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [autofilling, setAutofilling] = useState(false);
  // The "paper not complete" notice stays a one-line bar until the teacher opens it (remembered per browser).
  // (the notice only renders once the paper has loaded in the browser, so reading storage here cannot mismatch SSR)
  const [noticeOpen, setNoticeOpen] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem("paperbuilder.paperNotice") === "open";
    } catch {
      return false; // storage blocked: stay collapsed
    }
  });
  const toggleNotice = () =>
    setNoticeOpen((open) => {
      try {
        window.localStorage.setItem("paperbuilder.paperNotice", open ? "closed" : "open");
      } catch {
        /* ignore */
      }
      return !open;
    });
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [exportingDocx, setExportingDocx] = useState(false);
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

  const cancelAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const adopt = useCallback((p: PaperData) => {
    cancelAutosave();
    if (p.blueprint.curriculumMode === "KG_WORKSHEET") {
      window.location.replace(`/worksheets/${p.id}`);
      return;
    }
    setPaper(p);
    const loaded = {
      title: p.title,
      schoolName: p.schoolName,
      // no fallback session here: whatever is in details can be saved, and a paper without one keeps none
      academicSession: p.academicSession ?? "",
      examDate: p.examDate,
      paperSet: p.paperSet ?? "",
      subjectCode: p.subjectCode ?? "",
      // the stored language when it is a choice (hi / sa / bilingual), otherwise what the paper detects as
      language: detectPaperLanguage(p, p.items),
      generalInstructions: p.generalInstructions ?? "",
      printDensity: (p.printDensity as PrintDensity) ?? "STANDARD",
      showCandidateDetails: p.showCandidateDetails !== false,
      showSignatures: p.showSignatures === true,
      securityWatermark: p.securityWatermark === true,
      watermarkText: p.watermarkText ?? "",
    };
    loadedDetailsRef.current = loaded;
    setDetails(loaded);
  }, [cancelAutosave]);

  // Autosave: only the fields the teacher changed since the paper was loaded or last saved. Loading or adopting a
  // paper sends nothing (details then equal what was loaded, including the detected language), and a view-only
  // user sends nothing. An emptied title or school name is held back so it cannot sink the other changes.
  useEffect(() => {
    if (!paper || paper.status === "FINAL" || !canModifyPaper(currentUser, paper)) return;
    if (!loadedDetailsRef.current || !autosavePatch(loadedDetailsRef.current, details, AUTOSAVE_REQUIRED)) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      autosaveTimerRef.current = null;
      // diff again when firing: an earlier save may have landed in the meantime
      const changes = loadedDetailsRef.current && autosavePatch(loadedDetailsRef.current, details, AUTOSAVE_REQUIRED);
      if (!changes) return;
      setAutosaveStatus("saving");
      try {
        await api<PaperData>(`/api/papers/${id}`, { method: "PATCH", json: changes });
        // the server now holds these values: they are the new baseline (onto whatever was adopted meanwhile)
        if (loadedDetailsRef.current) loadedDetailsRef.current = { ...loadedDetailsRef.current, ...changes };
        setAutosaveStatus("saved");
        setTimeout(() => setAutosaveStatus("idle"), 2500);
      } catch {
        setAutosaveStatus("error");
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [id, details, paper, currentUser]);

  async function handleMoveQuestion(itemId: string, direction: "up" | "down") {
    if (movingItemId) return;
    cancelAutosave();
    setMovingItemId(itemId);
    try {
      const updated = await api<PaperData>(`/api/papers/${id}/questions/${itemId}`, {
        method: "PATCH",
        json: { direction },
      });
      adopt(updated);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setMovingItemId(null);
    }
  }

  async function handleExportDocx() {
    if (exportingDocx) return;
    setExportingDocx(true);
    setExportMenuOpen(false);
    try {
      const res = await fetch(`/api/papers/${id}/export-docx`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const safeTitle = paper?.title ? paper.title.trim().replace(/[/\\?%*:|"<>]/g, "_") : "Paper";
      const filename = `${safeTitle}.docx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Word document exported");
    } catch (e) {
      toast.error((e as Error).message || "Export failed");
    } finally {
      setExportingDocx(false);
    }
  }

  async function handleTogglePageBreak(itemId: string, pageBreakBefore: boolean) {
    cancelAutosave();
    try {
      const updated = await api<PaperData>(`/api/papers/${id}/questions/${itemId}`, {
        method: "PATCH",
        json: { pageBreakBefore },
      });
      adopt(updated);
    } catch (e) {
      showError((e as Error).message);
    }
  }

  async function handleSuggestComponents() {
    cancelAutosave();
    try {
      const res = await api<{ assigned: number; paper: PaperData }>(`/api/papers/${id}/suggest-components`, { method: "POST", json: {} });
      adopt(res.paper);
      toast.success(`Suggested a component for ${res.assigned} question(s). You can change any of them.`);
    } catch (e) {
      showError((e as Error).message);
    }
  }

  async function handleOpenQuickSwap(itemId: string) {
    setQuickSwapItemId(itemId);
    setSiblingLoading(true);
    setSiblingQuestions([]);
    try {
      const list = await api<Array<{ id: string; text: string; difficulty: string }>>(
        `/api/papers/${id}/questions/${itemId}/siblings`
      );
      setSiblingQuestions(Array.isArray(list) ? list : []);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSiblingLoading(false);
    }
  }

  async function handleExecuteQuickSwap(itemId: string, replacementQuestionId: string) {
    cancelAutosave();
    setSwappingBusy(true);
    try {
      const updated = await api<PaperData>(`/api/papers/${id}/questions/${itemId}`, {
        method: "PATCH",
        json: { replaceWithQuestionId: replacementQuestionId },
      });
      adopt(updated);
      setQuickSwapItemId(null);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSwappingBusy(false);
    }
  }

  async function handleSectionAutofill(sectionId: string) {
    cancelAutosave();
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
      showError((e as Error).message);
    } finally {
      setSectionAutofilling(null);
    }
  }

  async function handleAutofill() {
    cancelAutosave();
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
      showError((e as Error).message);
    } finally {
      setAutofilling(false);
    }
  }

  useEffect(() => {
    api<Actor & { name: string; email: string }>("/api/me").then(setCurrentUser, () => undefined);
  }, []);

  const reloadPaper = useCallback(async () => {
    try {
      adopt(await api<PaperData>(`/api/papers/${id}`));
    } catch (e) {
      showError((e as Error).message);
    }
  }, [id, adopt, showError]);

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
    cancelAutosave();
    try {
      const r = await fn();
      then?.(r);
    } catch (e) {
      showError((e as Error).message);
    }
  }

  function handleMoreSelect(key: string, it: PaperItem, section: Section) {
    switch (key) {
      case "addDiagram":
      case "changeDiagram":
        setDiagramModalItem({ item: it, section });
        break;
      case "editDiagram":
        setStudioItem({ item: it, section, initialUrl: it.question.imagePath ? imageUrl(it.question.imagePath) : null });
        break;
      case "previewDiagramBw":
        setBwPreviewIds((prev) => ({ ...prev, [it.question.id]: !prev[it.question.id] }));
        break;
      case "removeDiagram":
        void call(async () => {
          await api(`/api/questions/${it.question.id}`, { method: "PATCH", json: { imagePath: null } });
          return api<PaperData>(`/api/papers/${id}`);
        }, adopt);
        break;
      case "pageBreak":
        void handleTogglePageBreak(it.id, !it.pageBreakBefore);
        break;
      case "moveUp":
        void handleMoveQuestion(it.id, "up");
        break;
      case "moveDown":
        void handleMoveQuestion(it.id, "down");
        break;
      case "quickSwap":
        void handleOpenQuickSwap(it.id);
        break;
    }
  }

  async function removeQuestion(item: PaperItem) {
    const ok = await confirm({
      title: "Remove this question from the paper?",
      message: "It stays in the question bank.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    await call(() => api<PaperData>(`/api/papers/${id}/questions/${item.id}`, { method: "DELETE" }), adopt);
  }

  async function removeOrQuestion(item: PaperItem) {
    const ok = await confirm({
      title: "Remove the OR question from this slot?",
      message: "It stays in the question bank.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    await call(
      () => api<PaperData>(`/api/papers/${id}/questions/${item.id}`, { method: "PATCH", json: { orQuestionId: null } }),
      adopt,
    );
  }

  const patch = (json: Record<string, unknown>) => {
    const isFin = paper?.status === "FINAL";
    const isAdm = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
    const canEdit = !isFin && Boolean(paper) && canModifyPaper(currentUser, paper!);
    if (!canEdit && !(isFin && isAdm && json.status === "DRAFT")) {
      showError("Forbidden: You do not have permission to modify this paper.");
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
  const blueprintComponents = parseComponents(blueprint.componentsJson);
  const componentRows = componentCoverage(
    blueprintComponents,
    paper.items.map((it) => ({
      componentKey: it.componentKey,
      marks: questionSlotMarks(
        blueprint.sections.find((x) => x.id === it.sectionId) ?? { count: 1, marksEach: 1 },
        it.question as never,
      ).marks,
    })),
  ).rows;
  const final = paper.status === "FINAL";
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
  const canEditPaper = !final && canModifyPaper(currentUser, paper);
  // Chapter weightage is a guide shown in the coverage panel, so chapter differences never raise the notice.
  const noticeItems = (paper.implications ?? []).filter(
    (i) => i.code !== "CHAPTER_EXCESS" && i.code !== "CHAPTER_DEFICIT" && i.code !== "CHAPTER_OUTSIDE_BLUEPRINT",
  );
  // A fresh or half-built paper only has unfilled slots: that is progress, not a blueprint change.
  const onlyProgressGaps = noticeItems.every((i) => i.code === "SECTION_UNDERFILLED");
  // Bank Auto-Fill shows while the paper is incomplete, and on a full paper that has OR-question problems.
  const bankAutoFillShown = showBankAutoFill({
    canEdit: canEditPaper,
    final,
    complete: progress.complete,
    noticeCodes: noticeItems.map((i) => i.code),
  });
  const bankAutoFillButton = (
    <button
      type="button"
      className="btn btn-ghost border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs shadow-2xs font-semibold flex items-center gap-1.5"
      disabled={autofilling}
      onClick={handleAutofill}
      title="Fill the remaining question slots and fix OR questions, from the question bank"
    >
      <RefreshCw size={13} className={autofilling ? "animate-spin" : ""} />
      <span>{autofilling ? "Auto-filling…" : "Bank Auto-Fill"}</span>
    </button>
  );
  const coverage = coverageRows(paper);
  const resolvedExamType = resolvePaperExamType(paper);
  const pickerSection = blueprint.sections.find((s) => s.id === pickerSectionId) ?? null;

  // Continuous numbering & structured metrics across sections
  // the same numbering print uses, so a question carries the label it will have on paper
  const paperNumbering = computeDisplayedPaperNumbering(
    blueprint.sections,
    paper.items,
    paper.numberingStyle || "CONTINUOUS",
    detectPaperLanguage(paper, paper.items)
  );

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
                    disabled={paper.items.length === 0 || checkingKey}
                    onClick={async () => {
                      setToolsMenuOpen(false);
                      setCheckingKey(true);
                      try {
                        // writes any missing answers, then an independent solver re-checks the objective keys;
                        // anything it disputes stays listed on the paper until the teacher decides
                        const stage = await runAnswerStages(paper.id, {});
                        if (stage.paper) adopt(stage.paper);
                        toast.info(answerStageSummary(stage));
                      } finally {
                        setCheckingKey(false);
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                      paper.items.length === 0 || checkingKey
                        ? "opacity-50 cursor-not-allowed text-slate-400"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="rounded-md bg-amber-50 p-1.5 text-amber-700">
                      <KeyRound size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{checkingKey ? "Checking answer key…" : "Check answer key"}</div>
                      <div className="text-[11px] text-slate-500">Fill missing answers and re-check objective keys</div>
                    </div>
                  </button>

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
                    href={`/papers/${id}/print?view=reading`}
                    target="_blank"
                    onClick={() => setExportMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <div className="rounded-md bg-slate-100 p-1.5 text-slate-700">
                      <Printer size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Print / Save PDF (Sequential)</div>
                      <div className="text-[11px] text-slate-500">Normal 1-up portrait pages in reading order</div>
                    </div>
                  </Link>

                  <Link
                    href={`/papers/${id}/print?view=sheets`}
                    target="_blank"
                    onClick={() => setExportMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <div className="rounded-md bg-indigo-50 p-1.5 text-indigo-700">
                      <BookOpen size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Print Folded Booklet Sheets</div>
                      <div className="text-[11px] text-slate-500">2-up landscape sheets for duplex folding</div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    disabled={exportingDocx}
                    onClick={handleExportDocx}
                    className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="rounded-md bg-blue-50 p-1.5 text-blue-700">
                      {exportingDocx ? <Spinner size="sm" /> : <FileDown size={14} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <span>Word Document (.docx)</span>
                        {exportingDocx && <span className="text-[10px] text-blue-600 font-normal">Exporting…</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">Editable Word exam paper</div>
                    </div>
                  </button>

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
                  <div className="flex items-center gap-2">
                    {bankAutoFillShown && bankAutoFillButton}
                    <button
                      className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-xs font-semibold flex items-center gap-1.5"
                      onClick={() => setPreflightOpen(true)}
                      title="Lock and finalize paper"
                    >
                      <Lock size={14} />
                      <span>Finalise Paper</span>
                    </button>
                  </div>
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
                    {bankAutoFillButton}
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

      <KeyDisputesBanner key={paper.id} paperId={paper.id} canEdit={canModifyPaper(currentUser, paper)} onPaper={adopt} />

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
          </div>
          <button
            onClick={() => {
              setInfoMessage(null);
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
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="block text-slate-400 font-semibold uppercase text-[9px]">Numbered Qs</span>
                  <strong className="text-slate-800 text-xs">{paperNumbering.numberedParentQuestions} Questions</strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="block text-slate-400 font-semibold uppercase text-[9px]">Blueprint Units</span>
                  <strong className="text-slate-800 text-xs">{paperNumbering.blueprintAllocationUnits} Units ({paperNumbering.atomicResponseTasks} Tasks)</strong>
                </div>
              </div>
            </section>

            {/* Chapter coverage: weightage is a guide, nothing here blocks the paper */}
            <section className="card space-y-2.5 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Chapter coverage (estimate)</h2>
                <span className="text-[11px] text-slate-400 font-medium">Marks placed of target</span>
              </div>
              {(() => {
                const shown = showAllChapters || coverage.rows.length <= 6 ? coverage.rows : coverage.rows.slice(0, 6);
                return (
                  <>
                    <div className="space-y-2.5 pt-1">
                      {shown.map((r) => (
                        <div key={r.key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate pr-2 font-medium text-slate-700" title={r.title}>
                              {r.title} · {r.used} of {r.target}
                              {r.lessons > 1 && <span className="font-normal text-slate-400"> · {r.lessons} lessons</span>}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${r.off ? "bg-amber-500" : "bg-indigo-600"}`}
                              style={{ width: `${r.target === 0 ? 100 : Math.min(100, (r.used / r.target) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {coverage.rows.length > 6 && (
                      <button
                        type="button"
                        onClick={() => setShowAllChapters((v) => !v)}
                        className="w-full text-center text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 pt-1.5 border-t border-slate-100 transition"
                      >
                        {showAllChapters ? "Show fewer ▴" : `Show all ${coverage.rows.length} (${coverage.rows.length - 6} more) ▾`}
                      </button>
                    )}
                    {coverage.outsideCount > 0 && (
                      <p className="text-[11px] text-slate-500">
                        {coverage.outsideCount} question{coverage.outsideCount === 1 ? " is" : "s are"} from chapters outside this blueprint.
                      </p>
                    )}
                  </>
                );
              })()}
              {paper.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCoverageOpen(true)}
                  className="btn btn-sm w-full justify-center text-xs"
                  title="Ask the AI which chapter each question tests (one request)"
                >
                  <Sparkles size={12} className="text-amber-500" /> Check coverage with AI
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
              <h2 className="text-sm font-semibold text-slate-800">
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
                    {!details.academicSession && (
                      <option value="" disabled>
                        Select session
                      </option>
                    )}
                    {Array.from(new Set([...ACADEMIC_SESSIONS, details.academicSession].filter(Boolean))).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Subject Code">
                  <input
                    className="input text-xs"
                    placeholder="e.g. 086 / 122"
                    value={details.subjectCode}
                    onChange={(e) => setDetails({ ...details, subjectCode: e.target.value })}
                    onBlur={() => details.subjectCode !== paper.subjectCode && patch({ subjectCode: details.subjectCode })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Paper Language">
                  <select
                    className="input text-xs font-medium"
                    value={details.language || "en"}
                    onChange={(e) => {
                      const lang = e.target.value as PaperLanguage;
                      setDetails((d) => ({ ...d, language: lang }));
                      patch({ language: lang });
                    }}
                  >
                    <option value="en">English (Default)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="sa">संस्कृतम् (Sanskrit)</option>
                    <option value="bilingual">Bilingual (English + हिन्दी)</option>
                  </select>
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

              <Field label="Exam Date">
                <input
                  type="date"
                  className="input text-xs"
                  value={details.examDate}
                  onChange={(e) => setDetails({ ...details, examDate: e.target.value })}
                  onBlur={() => details.examDate !== paper.examDate && patch({ examDate: details.examDate })}
                />
              </Field>
            </section>

            {/* Card 2: Print Formatting & Layout */}
            <section className="card space-y-3 p-4 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-800">
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
              <h2 className="text-sm font-semibold text-slate-800">
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
                      const effLang = details.language || detectPaperLanguage(paper, paper.items);
                      const sample = buildGeneralInstructions(paper, effLang === "sa" || effLang === "hi" ? effLang : "en");
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
          {noticeItems.length > 0 && (
            <div
              className={`rounded-2xl border border-amber-300 bg-amber-50/95 shadow-sm ${noticeOpen ? "p-5 space-y-3.5" : "px-4 py-2.5"}`}
            >
              <div
                className={`flex flex-wrap items-center justify-between gap-2 ${noticeOpen ? "border-b border-amber-200/80 pb-2.5" : ""}`}
              >
                <button
                  type="button"
                  onClick={toggleNotice}
                  aria-expanded={noticeOpen}
                  aria-controls="paper-notice-details"
                  className="flex min-h-9 items-center gap-2 rounded-lg text-left text-sm font-bold text-amber-950 hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <Sparkles className="shrink-0 text-amber-600" size={16} aria-hidden />
                  <span>
                    {onlyProgressGaps
                      ? `Paper not complete yet (${noticeItems.length} thing${noticeItems.length > 1 ? "s" : ""} left to place)`
                      : `Blueprint Synchronization Notice (${noticeItems.length} adjustment${noticeItems.length > 1 ? "s" : ""} required)`}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-700">
                    {noticeOpen ? "Hide" : "Details"}
                    {noticeOpen ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
                  </span>
                </button>
                {bankAutoFillShown && (
                  <span className="text-xs text-amber-900">Use Bank Auto-Fill above to fix these.</span>
                )}
              </div>
              {noticeOpen && (
              <div id="paper-notice-details" className="space-y-3.5">
              <p className="text-xs text-amber-900 leading-relaxed">
                {onlyProgressGaps
                  ? "Nothing is wrong, these slots are simply not filled yet:"
                  : "The blueprint linked to this paper was modified. Below is a breakdown of what needs adjustment to maintain examination standards:"}
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {noticeItems.map((imp, idx) => (
                  <div
                    key={idx}
                    className={`min-w-0 rounded-xl border p-3 text-xs flex flex-col items-start gap-1.5 transition ${
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
                    <p className="min-w-0 break-words leading-snug font-medium">{imp.message}</p>
                  </div>
                ))}
              </div>
              </div>
              )}
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
                      This paper follows the <strong>{blueprint.name}</strong> blueprint ({progress.totalMarks} marks).
                    </p>
                  </div>
                  <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-700">
                    <li>{canEditPaper ? "Fill the paper with Generate with AI or Bank Auto-Fill above, or add questions from a section." : "Add questions from a section."}</li>
                    <li>Open the Print Setup tab on the left to set the school header, exam date and instructions.</li>
                    <li>Use Export &amp; Print when the paper is ready.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {componentRows.length > 0 && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <div className="mb-1.5 flex items-center justify-between gap-2 font-semibold text-slate-800">
                <span>Syllabus components (official allocation)</span>
                {canEditPaper && !final && (
                  <button type="button" className="btn btn-ghost !px-2 !py-0.5 text-[11px]" onClick={handleSuggestComponents}>
                    Suggest components
                  </button>
                )}
              </div>
              <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                {componentRows.map((c) => (
                  <li key={c.key} className="flex justify-between gap-2">
                    <span className="truncate">{c.title}</span>
                    <span className={c.used > c.target ? "font-bold text-red-700" : c.used === c.target ? "font-bold text-emerald-700" : "text-slate-600"}>
                      {c.used}/{c.target}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {blueprint.sections.map((s) => {
            const items = paper.items.filter((i) => i.sectionId === s.id);
            const st = progress.sections.find((x) => x.id === s.id)!;
            const slotValues = items.map((it) => questionSlotMarks(s, it.question as never));
            const effectiveUnits = slotValues.reduce((sum, v) => sum + v.units, 0);
            const placedSectionMarks = slotValues.reduce((sum, v) => sum + v.marks, 0);
            const targetSectionMarks = s.count * s.marksEach;
            const isOverfilled = effectiveUnits > s.count;
            const isSectionFull = effectiveUnits === s.count;
            const emptySlots = Math.max(0, s.count - effectiveUnits);
            const isCollapsed = !!collapsedSections[s.id];

            // the same rule the server audits with, including the blueprint's own "OR required / no OR" setting
            const secChoiceReq = paperSectionChoiceRequirement(paper, s);
            const statusText = sectionStatusLine({
              type: s.type,
              count: s.count,
              filledUnits: effectiveUnits,
              itemCount: items.length,
              placedMarks: placedSectionMarks,
              targetMarks: targetSectionMarks,
              matchPairs:
                items.length === 1 && s.type === "MATCH_COLUMN"
                  ? parseMatchColumnPairs(items[0].question.options, items[0].question.text, (items[0].question as any).explanation).length || s.count
                  : undefined,
            });
            const choiceNote = choicePolicyNote(secChoiceReq.policy, secChoiceReq.forbidden);
            const warningText = sectionWarning({
              count: s.count,
              filledUnits: effectiveUnits,
              placedMarks: placedSectionMarks,
              targetMarks: targetSectionMarks,
            });

            return (
              <section
                key={s.id}
                className="card space-y-3 p-5 shadow-xs transition border-slate-200"
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{s.title}</h2>
                    </div>
                    <div
                      className="mt-0.5 text-xs text-slate-500"
                      title={secChoiceReq.forbidden ? secChoiceReq.reason : undefined}
                    >
                      <span
                        className={`font-semibold ${
                          isOverfilled ? "text-red-700" : warningText || !isSectionFull ? "text-amber-700" : "text-emerald-700"
                        }`}
                      >
                        {statusText}
                      </span>
                      {` · ${typeLabel(s.type)} · ${s.marksEach} ${s.marksEach === 1 ? "mark" : "marks"} each`}
                      {choiceNote && ` · ${choiceNote}`}
                      {slotPlanSummary(s) && <span className="ml-1.5 text-indigo-700">({slotPlanSummary(s)})</span>}
                    </div>
                    {warningText && (
                      <div className={`mt-0.5 text-xs font-semibold ${isOverfilled ? "text-red-700" : "text-amber-700"}`}>
                        {warningText}
                      </div>
                    )}
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
                  <div className="flex items-center justify-end pt-1 text-xs text-slate-500">
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
                        const questionNumber = paperNumbering.itemNumbers[it.id]?.questionNumber;
                        const numberLabel = builderQuestionLabel(paperNumbering, it.id);
                        const isTypeMismatch = !toleratesType(s, it.question.type);
                        const isExcess = idx >= s.count || effectiveUnits > s.count;
                        // this slot's own rule: the blueprint may switch the OR on or off slot by slot
                        const slotChoiceReq = paperSectionChoiceRequirement(paper, s, idx);
                        const actions = rowActions({
                          canEdit: canEditPaper,
                          hasOr: Boolean(it.orQuestion),
                          orForbidden: slotChoiceReq.forbidden,
                        });

                        const isMatchQ = it.question.type === "MATCH_COLUMN" || s.type === "MATCH_COLUMN";
                        const questionTotalMarks = questionSlotMarks(s, it.question as never).marks;
                        const targetSlotMarksForQ = isMatchQ && s.count > 1
                          ? s.count * s.marksEach
                          : s.marksEach;
                        const isQuestionMarksMismatch = questionTotalMarks !== targetSlotMarksForQ;

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
                              data-q-ids={`${it.question.id} ${it.orQuestion?.id ?? ""}`.trim()}
                              className={`rounded-xl border p-4 shadow-2xs transition hover:border-slate-300 ${
                              isExcess || isTypeMismatch || isQuestionMarksMismatch
                                ? "border-amber-300 bg-amber-50/20"
                                : "border-slate-200/90 bg-white"
                            }`}
                          >
                            {(isTypeMismatch || isExcess || isQuestionMarksMismatch) && (
                              <div className="mb-2.5 flex flex-wrap gap-1.5">
                                {isTypeMismatch && (
                                  <span className="badge !bg-red-100 !text-red-800 border border-red-200 text-[10px] font-bold">
                                    ⚠ Type Mismatch: Expected {QUESTION_TYPE_LABEL[s.type as keyof typeof QUESTION_TYPE_LABEL] || s.type}, but question is {typeLabel(it.question.type)}
                                  </span>
                                )}
                                {isQuestionMarksMismatch && (
                                  <span className="badge !bg-amber-100 !text-amber-800 border border-amber-200 text-[10px] font-bold">
                                    ⚠ Marks Mismatch: Question carries {questionTotalMarks}m, but section slot expects {targetSlotMarksForQ}m
                                  </span>
                                )}
                                {isExcess && (
                                  <span className="badge !bg-amber-100 !text-amber-800 border border-amber-200 text-[10px] font-bold">
                                    ⚠ Excess Slot: Section quota is {s.count} questions. Remove this question to balance section.
                                  </span>
                                )}
                              </div>
                            )}

                            {/* the slot's paper fields are edited in the Edit modal; the row only shows them when set */}
                            {(it.instruction ?? "").trim() !== "" && (
                              <p className="mb-1.5 text-[11px] text-slate-600 [overflow-wrap:anywhere]">
                                <span className="font-semibold">Instruction:</span> <span className="italic">&ldquo;{it.instruction!.trim()}&rdquo;</span>
                              </p>
                            )}
                            {blueprintComponents.length > 0 && (it.componentKey ?? "") !== "" && (
                              <p className="mb-1.5 text-[11px] text-slate-600">
                                <span className="font-semibold">Component:</span>{" "}
                                {blueprintComponents.find((c) => c.key === it.componentKey)?.title ?? it.componentKey}
                              </p>
                            )}

                            {/* Question Content View */}
                            <div className={`paper-font text-sm leading-relaxed transition ${bwPreviewIds[it.question.id] ? "grayscale contrast-150" : ""}`}>
                              <QuestionView
                                q={it.question}
                                orQuestion={it.orQuestion}
                                number={questionNumber}
                                numberLabel={numberLabel}
                                marks={questionTotalMarks}
                                marksStyle={resolveMarksStyle(paper.marksStyle)}
                                lang={paper ? detectPaperLanguage(paper, paper.items) : "en"}
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
                                      OR question usage:
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
                                <span className="badge font-semibold !bg-slate-100 !text-slate-700 border border-slate-200">{difficultyLabel(it.question.difficulty)}</span>
                                <span className="badge !bg-slate-100 text-slate-700 font-medium border border-slate-200">
                                  Ch {it.question.chapter?.number}. {it.question.chapter?.title}
                                </span>
                                {it.orQuestion && (
                                  <span className="badge !bg-purple-50 !text-purple-800 border border-purple-200 font-semibold">
                                    OR question · Ch {it.orQuestion.chapter?.number}
                                  </span>
                                )}
                              </div>

                              {actions.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                                  {actions.includes("edit") && (
                                    <button
                                      className="btn btn-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-medium"
                                      title="Edit question text or options"
                                      onClick={() => {
                                        setOpenRowMenu(null);
                                        setEditingItem({ item: it, section: s, target: "primary" });
                                      }}
                                    >
                                      <Pencil size={12} className="text-slate-500" /> Edit
                                    </button>
                                  )}
                                  {actions.includes("replace") && (
                                    <button
                                      className="btn btn-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-medium"
                                      title="Replace with another question from bank"
                                      onClick={() => {
                                        setOpenRowMenu(null);
                                        setReplacingItem({ item: it, section: s });
                                      }}
                                    >
                                      <RefreshCw size={12} className="text-slate-400" /> Replace
                                    </button>
                                  )}
                                  {actions.includes("or") &&
                                    (!it.orQuestion ? (
                                      <button
                                        className="btn btn-sm border-slate-200 bg-white text-slate-600 hover:text-purple-700 hover:border-purple-200 hover:bg-purple-50/50 shadow-2xs font-medium"
                                        title="Add an OR question: a second question the student may answer instead"
                                        onClick={() => {
                                          setOpenRowMenu(null);
                                          setAlternateItem({ item: it, section: s });
                                        }}
                                      >
                                        Add OR
                                      </button>
                                    ) : (
                                      <>
                                        {slotChoiceReq.forbidden && (
                                          <span className="badge !bg-red-100 !text-red-800 border border-red-200 text-[10px] font-bold" title={slotChoiceReq.reason}>
                                            OR not allowed here
                                          </span>
                                        )}
                                        <RowMenu
                                          label="OR"
                                          ariaLabel="OR question actions"
                                          items={orMenuItems(true)}
                                          open={openRowMenu?.itemId === it.id && openRowMenu.kind === "or"}
                                          onOpenChange={(o) => {
                                            if (o) setQuickSwapItemId(null);
                                            setOpenRowMenu(o ? { itemId: it.id, kind: "or" } : null);
                                          }}
                                          buttonClassName="btn btn-sm border-purple-200 bg-white text-purple-700 hover:bg-purple-50 shadow-2xs font-medium"
                                          onSelect={(key) => {
                                            setOpenRowMenu(null);
                                            if (key === "editOr") setEditingItem({ item: it, section: s, target: "or" });
                                            else if (key === "changeOr") setAlternateItem({ item: it, section: s });
                                            else if (key === "removeOr") void removeOrQuestion(it);
                                          }}
                                        />
                                      </>
                                    ))}
                                  {actions.includes("delete") && (
                                    <button
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition ml-0.5"
                                      title="Remove question from paper"
                                      aria-label="Remove question from paper"
                                      onClick={() => {
                                        setOpenRowMenu(null);
                                        void removeQuestion(it);
                                      }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                  {actions.includes("more") && (
                                    <div className="relative">
                                      <RowMenu
                                        label="More"
                                        ariaLabel="More actions"
                                        items={rowMenuItems({
                                          hasFigure: Boolean(it.question.imagePath),
                                          pageBreakBefore: Boolean(it.pageBreakBefore),
                                          index: idx,
                                          total: items.length,
                                          moving: movingItemId !== null,
                                        })}
                                        open={openRowMenu?.itemId === it.id && openRowMenu.kind === "more"}
                                        onOpenChange={(o) => {
                                          if (o) setQuickSwapItemId(null);
                                          setOpenRowMenu(o ? { itemId: it.id, kind: "more" } : null);
                                        }}
                                        onSelect={(key) => {
                                          setOpenRowMenu(null);
                                          handleMoreSelect(key, it, s);
                                        }}
                                      />
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
                                                    {difficultyLabel(sib.difficulty)}
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
                                  )}
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
                        const topChapters = coverage.underCovered.slice(0, 3);

                        return (
                          <li key={`empty-${i}`}>
                            {canEditPaper ? (
                              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 transition hover:border-indigo-300 hover:bg-slate-50 shadow-2xs">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-slate-800">
                                        {s.type === "MATCH_COLUMN"
                                          ? `Match the Columns Set (${s.count} Pairs)`
                                          : `Empty slot ${slotNum} of ${s.count}`}
                                      </span>
                                    </div>

                                    {/* Chapters still below their targets, as a hint for what to pick */}
                                    {topChapters.length > 0 && (
                                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                        <span className="font-medium text-slate-600">Under-covered:</span>
                                        {topChapters.map((tc) => (
                                          <span
                                            key={tc.chapterId}
                                            className="inline-flex items-center rounded bg-white px-1.5 py-0.2 border border-slate-200 text-[10px] font-semibold text-indigo-600"
                                          >
                                            Ch {tc.number}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCollapsedSections((prev) => ({ ...prev, [s.id]: false }));
                                        setPickerSectionId(s.id);
                                      }}
                                      className="btn btn-sm btn-primary shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
                                      title="Write a new question, pick one from the bank, paste several, or generate with AI"
                                    >
                                      <Plus size={13} />
                                      <span>Add question</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
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
        <PaperQuestionEditModal
          key={editingItem.item.id}
          paper={paper}
          books={books}
          item={editingItem.item}
          section={editingItem.section}
          target={editingItem.target}
          canEdit={canEditPaper}
          // switching tabs reads the slot afresh, in case a save in this modal already changed it
          onTarget={(t) =>
            setEditingItem({ ...editingItem, item: paper.items.find((i) => i.id === editingItem.item.id) ?? editingItem.item, target: t })
          }
          onPaper={adopt}
          onClose={() => setEditingItem(null)}
        />
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
            try {
              await api(`/api/questions/${currentItem.item.question.id}`, {
                method: "PATCH",
                json: { imagePath },
              });
              await reloadPaper();
            } catch (e) {
              showError((e as Error).message);
            }
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
            try {
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
            } catch (e) {
              showError((e as Error).message);
            }
          }}
        />
      )}

      {/* Pre-Finalization Quality Preflight Modal */}
      {coverageOpen && paper && (
        <AICoverageModal
          paper={paper}
          canApply={canEditPaper}
          onClose={() => setCoverageOpen(false)}
          onApplied={(p) => adopt(p)}
        />
      )}
      {preflightOpen && paper && (
        <PaperPreflightModal
          isOpen={preflightOpen}
          paper={paper}
          onClose={() => setPreflightOpen(false)}
          onJumpToQuestion={(questionId) => {
            if (!questionId) return;
            setSidebarTab("quotas");
            window.setTimeout(() => {
              const el = document.querySelector(`[data-q-ids~="${CSS.escape(questionId)}"]`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 50);
          }}
          onGoToTab={(tab) => setSidebarTab(tab === "print" ? "settings" : "quotas")}
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

function MultiSetGeneratorModal({
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
