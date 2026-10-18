"use client";

import {
  Boxes,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Layers,
  MapPin,
  PackageCheck,
  Paperclip,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBanner, Modal, Skeleton } from "@/components/ui";
import { useAcademicSession } from "@/lib/academicSession";
import { api } from "@/lib/client";
import {
  EXAM_TYPES,
  EXAM_TYPE_LABEL,
  SESSION_SLOTS,
  SESSION_SLOT_LABEL,
  TIMETABLE_STATUSES,
  TIMETABLE_STATUS_LABEL,
  type ExamType,
  type Layout,
  type SessionSlot,
  type TimetableStatus,
} from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import type {
  AcademicClassDto,
  AuditLogEntry,
  Blueprint,
  ClassSectionInput,
  ExamTimetableItem,
  PaperListItem,
  PrintRunCalculationDto,
  SetDistribution,
  UserData,
} from "@/lib/types";

type Tab = "calculator" | "timetable" | "audit";

function getSectionsForClass(cls?: AcademicClassDto | null): ClassSectionInput[] {
  if (!cls) {
    return [
      { name: "Section A", count: 40 },
    ];
  }
  const secs = cls.sections && cls.sections.length > 0 ? cls.sections : ["A"];
  return secs.map((s) => ({
    name: `${cls.name} - Section ${s}`,
    count: 40,
  }));
}

export default function ExamCellPage() {
  const { currentSession, availableSessions } = useAcademicSession();
  const [sessionFilter, setSessionFilter] = useState<string>(currentSession);
  const [activeTab, setActiveTab] = useState<Tab>("calculator");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [classes, setClasses] = useState<AcademicClassDto[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [calculations, setCalculations] = useState<PrintRunCalculationDto[]>([]);
  const [timetable, setTimetable] = useState<ExamTimetableItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);

  // Filters for Timetable
  const [timetableClassFilter, setTimetableClassFilter] = useState<string>("ALL");
  const [timetableExamTypeFilter, setTimetableExamTypeFilter] = useState<string>("ALL");
  const [timetableStatusFilter, setTimetableStatusFilter] = useState<string>("ALL");
  const [timetableSearch, setTimetableSearch] = useState<string>("");

  // Calculator State
  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const [paperTitle, setPaperTitle] = useState("");
  const [className, setClassName] = useState("Class 10");
  const [subject, setSubject] = useState("Science");
  const [layout, setLayout] = useState<Layout>("BOOKLET_A4");
  const [pageCount, setPageCount] = useState<number>(4);
  const [wastagePercent, setWastagePercent] = useState<number>(3);
  const [sections, setSections] = useState<ClassSectionInput[]>([
    { name: "10-A", count: 40 },
  ]);
  const [sets, setSets] = useState<SetDistribution[]>([
    { set: "Set 1", count: 0 },
    { set: "Set 2", count: 0 },
    { set: "Set 3", count: 0 },
  ]);
  const [savingCalc, setSavingCalc] = useState(false);
  const [latestCalcResult, setLatestCalcResult] = useState<any>(null);
  const [packagingSlipModal, setPackagingSlipModal] = useState(false);

  // Timetable State
  const [timetableModal, setTimetableModal] = useState(false);
  const [timetableForm, setTimetableForm] = useState({
    title: "",
    className: "Class 10",
    subject: "Science",
    subjectCode: "086",
    academicSession: currentSession,
    examType: "ANNUAL" as ExamType,
    examDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "12:00",
    sessionSlot: "MORNING" as SessionSlot,
    roomLocations: "Halls A & B, Room 204",
    status: "SCHEDULED" as TimetableStatus,
    submissionDeadline: "",
    printingDeadline: "",
    paperId: "",
    blueprintId: "",
  });
  const [savingTimetable, setSavingTimetable] = useState(false);

  // Audit Filter State
  const [auditFilter, setAuditFilter] = useState({
    search: "",
    entityType: "",
    action: "",
  });
  const [inspectAudit, setInspectAudit] = useState<AuditLogEntry | null>(null);

  // Synchronize sessionFilter with currentSession
  useEffect(() => {
    setSessionFilter(currentSession);
  }, [currentSession]);

  // URL search params parsing
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as Tab | null;
    const classParam = params.get("className");
    const subjectParam = params.get("subject");
    const sessionParam = params.get("session");

    if (tabParam && (tabParam === "calculator" || tabParam === "timetable" || tabParam === "audit")) {
      setActiveTab(tabParam);
    }
    if (classParam) {
      setClassName(classParam);
      setTimetableClassFilter(classParam);
    }
    if (subjectParam) {
      setSubject(subjectParam);
    }
    if (sessionParam) {
      setSessionFilter(sessionParam);
    }
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionQuery = sessionFilter !== "ALL" ? `?session=${encodeURIComponent(sessionFilter)}` : "";
      const timetableQuery = sessionFilter !== "ALL" ? `?academicSession=${encodeURIComponent(sessionFilter)}` : "";
      const calcQuery = sessionFilter !== "ALL" ? `?academicSession=${encodeURIComponent(sessionFilter)}` : "";

      const [u, p, c, t, a, clsList, bpList] = await Promise.all([
        api<UserData>("/api/me"),
        api<PaperListItem[]>("/api/papers"),
        api<PrintRunCalculationDto[]>(`/api/exam-cell/calculator${calcQuery}`),
        api<ExamTimetableItem[]>(`/api/exam-cell/timetable${timetableQuery}`),
        api<{ logs: AuditLogEntry[]; total: number }>("/api/audit?limit=50"),
        api<AcademicClassDto[]>(`/api/classes${sessionQuery}`),
        api<Blueprint[]>("/api/blueprints"),
      ]);

      setCurrentUser(u);
      setPapers(p);
      setCalculations(c);
      setTimetable(t);
      setAuditLogs(a.logs);
      setAuditTotal(a.total);
      setClasses(clsList);
      setBlueprints(bpList);

      // Auto-initialize class & subject from loaded classes if available
      if (clsList.length > 0) {
        setClassName((prevClass) => {
          const matched = clsList.find((cl) => cl.name === prevClass) || clsList[0];
          setSubject((prevSubj) => {
            if (matched.subjects.some((s) => s.name === prevSubj)) return prevSubj;
            return matched.subjects[0]?.name || "General";
          });
          setSections((prevSecs) => {
            if (prevSecs.length > 0 && prevSecs[0].name.startsWith(matched.name)) return prevSecs;
            return getSectionsForClass(matched);
          });
          return matched.name;
        });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sessionFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const selectedClassObj = useMemo(() => {
    return classes.find((c) => c.name === className) || null;
  }, [classes, className]);

  const availableSubjectsForCalculator = useMemo(() => {
    if (!selectedClassObj) return [];
    return selectedClassObj.subjects;
  }, [selectedClassObj]);

  const matchingPapersForCalculator = useMemo(() => {
    return papers.filter((p) => {
      if (sessionFilter !== "ALL" && (p.academicSession || "2025–26") !== sessionFilter) return false;
      if (className && p.blueprint.book.className !== className) return false;
      if (subject && p.blueprint.book.subject !== subject) return false;
      return true;
    });
  }, [papers, sessionFilter, className, subject]);

  const handleClassChange = (newClassName: string) => {
    setClassName(newClassName);
    const matched = classes.find((c) => c.name === newClassName);
    if (matched) {
      if (matched.subjects.length > 0) {
        setSubject(matched.subjects[0].name);
      }
      setSections(getSectionsForClass(matched));
    }
  };

  const handleResetSectionsToClass = () => {
    if (selectedClassObj) {
      setSections(getSectionsForClass(selectedClassObj));
    }
  };

  // When a paper is chosen in the calculator, auto-populate details
  const handleSelectPaper = (id: string, paperList = papers) => {
    setSelectedPaperId(id);
    const found = paperList.find((p) => p.id === id);
    if (found) {
      setPaperTitle(found.title);
      setClassName(found.blueprint.book.className);
      setSubject(found.blueprint.book.subject);
      setLayout((found.layout as any) || "BOOKLET_A4");
      setPageCount(found.targetPages || 4);
      const matchedClass = classes.find((c) => c.name === found.blueprint.book.className);
      if (matchedClass) {
        setSections(getSectionsForClass(matchedClass));
      }
    }
  };

  // Live calculator totals
  const totalStudents = useMemo(
    () => sections.reduce((sum, s) => sum + (Number(s.count) || 0), 0),
    [sections],
  );

  const sheetsPerCopy = useMemo(() => {
    const isBooklet = layout === "BOOKLET" || layout === "BOOKLET_A4";
    return isBooklet
      ? Math.max(1, Math.ceil(pageCount / 4))
      : Math.max(1, Math.ceil(pageCount / 2));
  }, [layout, pageCount]);

  const rawSheets = totalStudents * sheetsPerCopy;
  const wastageSheets = Math.ceil(rawSheets * (wastagePercent / 100));
  const totalSheetsRequired = rawSheets + wastageSheets;
  const totalReamsRequired = parseFloat((totalSheetsRequired / 500).toFixed(2));
  const reamsToOrder = Math.ceil(totalReamsRequired);

  // Auto-distribute sets across total students
  const computedSets = useMemo(() => {
    const count = sets.length || 1;
    const base = Math.floor(totalStudents / count);
    let rem = totalStudents % count;
    return sets.map((s) => {
      const extra = rem > 0 ? 1 : 0;
      if (rem > 0) rem--;
      return { set: s.set, count: base + extra };
    });
  }, [totalStudents, sets]);

  // Handle calculator submission
  const handleRunCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCalc(true);
    setError(null);
    try {
      const activeSessionVal = sessionFilter !== "ALL" ? sessionFilter : currentSession;
      const res = await api<any>("/api/exam-cell/calculator", {
        method: "POST",
        json: {
          paperId: selectedPaperId || null,
          paperTitle: paperTitle || "Examination Paper",
          academicSession: activeSessionVal,
          className,
          subject,
          layout,
          pageCount,
          totalStudents,
          sections,
          sets: computedSets,
          wastagePercent,
          answerBookletCount: totalStudents,
        },
      });
      setLatestCalcResult(res);
      setCalculations((prev) => [res, ...prev.slice(0, 20)]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingCalc(false);
    }
  };

  // Handle Timetable Entry Create
  const handleCreateTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTimetable(true);
    setError(null);
    try {
      const res = await api<ExamTimetableItem>("/api/exam-cell/timetable", {
        method: "POST",
        json: {
          ...timetableForm,
          academicSession: sessionFilter !== "ALL" ? sessionFilter : currentSession,
        },
      });
      setTimetable((prev) => [...prev, res].sort((a, b) => a.examDate.localeCompare(b.examDate)));
      setTimetableModal(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingTimetable(false);
    }
  };

  const handleTimetableClassChange = (nextClass: string) => {
    const cls = classes.find((c) => c.name === nextClass);
    const subj = cls?.subjects[0];
    setTimetableForm((prev) => ({
      ...prev,
      className: nextClass,
      subject: subj?.name || "",
      subjectCode: subj?.code || "",
      title: cls && subj ? `${cls.name} ${subj.name} Examination` : prev.title,
      paperId: "",
      blueprintId: "",
    }));
  };

  const handleTimetableSubjectChange = (nextSubject: string) => {
    const cls = classes.find((c) => c.name === timetableForm.className);
    const subj = cls?.subjects.find((s) => s.name === nextSubject);
    setTimetableForm((prev) => ({
      ...prev,
      subject: nextSubject,
      subjectCode: subj?.code || prev.subjectCode,
      title: cls && subj ? `${cls.name} ${subj.name} Examination` : prev.title,
      paperId: "",
      blueprintId: "",
    }));
  };

  const handleTimetablePaperSelect = (paperId: string) => {
    const paper = papers.find((p) => p.id === paperId);
    if (paper) {
      setTimetableForm((prev) => ({
        ...prev,
        paperId: paper.id,
        title: paper.title,
        className: paper.blueprint.book.className,
        subject: paper.blueprint.book.subject,
        subjectCode: paper.subjectCode || prev.subjectCode,
        examType: (paper.examType as ExamType) || prev.examType,
      }));
    } else {
      setTimetableForm((prev) => ({ ...prev, paperId: "", blueprintId: "" }));
    }
  };

  const openScheduleExamModal = () => {
    const defaultClass =
      (timetableClassFilter !== "ALL" && classes.find((c) => c.name === timetableClassFilter)) ||
      classes[0];
    const defaultSubject = defaultClass?.subjects[0];
    setTimetableForm({
      title: defaultClass && defaultSubject ? `${defaultClass.name} ${defaultSubject.name} Examination` : "",
      className: defaultClass?.name || "Class 10",
      subject: defaultSubject?.name || "Science",
      subjectCode: defaultSubject?.code || "086",
      academicSession: sessionFilter !== "ALL" ? sessionFilter : currentSession,
      examType: "ANNUAL",
      examDate: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "12:00",
      sessionSlot: "MORNING",
      roomLocations: "Halls A & B, Room 204",
      status: "SCHEDULED",
      submissionDeadline: "",
      printingDeadline: "",
      paperId: "",
      blueprintId: "",
    });
    setTimetableModal(true);
  };

  // Handle Timetable Status change
  const handleUpdateTimetableStatus = async (id: string, status: TimetableStatus) => {
    try {
      const updated = await api<ExamTimetableItem>(`/api/exam-cell/timetable/${id}`, {
        method: "PATCH",
        json: { status },
      });
      setTimetable((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Section managers for calculator
  const addSection = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nextIdx = sections.length;
    const nextName = `10-${letters[nextIdx] || nextIdx + 1}`;
    setSections([...sections, { name: nextName, count: 40 }]);
  };

  const removeSection = (idx: number) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, i) => i !== idx));
  };

  const updateSection = (idx: number, field: keyof ClassSectionInput, val: string | number) => {
    const next = [...sections];
    next[idx] = { ...next[idx], [field]: val };
    setSections(next);
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditFilter.entityType && log.entityType !== auditFilter.entityType) return false;
      if (auditFilter.action && log.action !== auditFilter.action) return false;
      if (auditFilter.search) {
        const q = auditFilter.search.toLowerCase();
        const matches =
          log.userName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.detailsJson.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [auditLogs, auditFilter]);

  // Filtered Timetable entries
  const filteredTimetable = useMemo(() => {
    const q = timetableSearch.trim().toLowerCase();
    return timetable.filter((item) => {
      if (sessionFilter !== "ALL" && (item.academicSession || "2025–26") !== sessionFilter) return false;
      if (timetableClassFilter !== "ALL" && item.className !== timetableClassFilter) return false;
      if (timetableExamTypeFilter !== "ALL" && item.examType !== timetableExamTypeFilter) return false;
      if (timetableStatusFilter !== "ALL" && item.status !== timetableStatusFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.className.toLowerCase().includes(q) ||
        item.roomLocations.toLowerCase().includes(q)
      );
    });
  }, [timetable, sessionFilter, timetableClassFilter, timetableExamTypeFilter, timetableStatusFilter, timetableSearch]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <PackageCheck size={16} /> Exam Cell Operations &amp; Logistics
          </div>
          <h1 className="page-title mt-1">Exam Cell Control Centre</h1>
          <p className="page-lede">
            Logistics budget calculator, timetable scheduling, and confidential examination audit trail.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="segmented inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("calculator")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "calculator"
                ? "bg-white text-indigo-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Boxes size={15} className="text-indigo-600" />
            Paper Budget Calculator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("timetable")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "timetable"
                ? "bg-white text-indigo-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays size={15} className="text-indigo-600" />
            Exam Date-Sheet ({timetable.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "audit"
                ? "bg-white text-indigo-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History size={15} className="text-indigo-600" />
            Audit Trail ({auditTotal})
          </button>
        </div>
      </header>

      {/* Academic Session Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar size={13} /> Session:
          </span>
          <button
            type="button"
            onClick={() => setSessionFilter("ALL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
              sessionFilter === "ALL"
                ? "bg-indigo-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Sessions
          </button>
          {availableSessions.map((sess) => {
            const active = sessionFilter === sess;
            return (
              <button
                key={sess}
                type="button"
                onClick={() => setSessionFilter(sess)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                  active
                    ? "bg-indigo-900 text-white shadow-sm"
                    : sess === currentSession
                    ? "bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sess}
                {sess === currentSession && <span className="ml-1 text-[10px] text-amber-500 font-bold">●</span>}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500">
          Academic Hierarchy: <strong>Session {sessionFilter !== "ALL" ? sessionFilter : currentSession}</strong> · {classes.length} Classes configured
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* ============================================================== */}
      {/* TAB 1: PRINT RUN & PAPER BUDGET CALCULATOR                      */}
      {/* ============================================================== */}
      {activeTab === "calculator" && (
        <div className="space-y-8">
          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="card p-4 bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold uppercase text-slate-500">Total Students</span>
              <div className="mt-1 font-display text-2xl font-bold text-slate-900">{totalStudents}</div>
              <span className="text-xs text-slate-500">{sections.length} Class Sections</span>
            </div>
            <div className="card p-4 bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold uppercase text-slate-500">Sheets Per Student</span>
              <div className="mt-1 font-display text-2xl font-bold text-indigo-700">
                {sheetsPerCopy} <span className="text-xs font-normal text-slate-600">{layout === "BOOKLET" ? "A3 Sheet" : "A4 Sheet"}</span>
              </div>
              <span className="text-xs text-slate-500">{pageCount} Pages ({layout})</span>
            </div>
            <div className="card p-4 bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold uppercase text-slate-500">Total Paper Sheets</span>
              <div className="mt-1 font-display text-2xl font-bold text-slate-900">
                {totalSheetsRequired.toLocaleString()}{" "}
                <span className="text-xs font-normal text-emerald-700">({wastageSheets} buffer)</span>
              </div>
              <span className="text-xs text-slate-500">{wastagePercent}% Spoilage buffer</span>
            </div>
            <div className="card p-4 bg-indigo-50 border border-indigo-200 shadow-2xs">
              <span className="text-xs font-bold uppercase text-indigo-900">Paper Reams to Order</span>
              <div className="mt-1 font-display text-2xl font-bold text-indigo-950">
                {reamsToOrder} <span className="text-xs font-normal text-indigo-800">({totalReamsRequired} exact)</span>
              </div>
              <span className="text-xs text-indigo-700">500 sheets per standard ream</span>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            {/* Input Form Column (7 cols) */}
            <form onSubmit={handleRunCalculation} className="lg:col-span-7 space-y-6">
              <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-5">
                <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-indigo-600" /> Paper &amp; Cohort Parameters
                </h2>

                {/* Pre-fill from existing paper */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">Select Paper from Bank (Auto-fill parameters)</label>
                    {selectedPaperId && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaperId("")}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Clear linked paper
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedPaperId}
                    onChange={(e) => handleSelectPaper(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">— Select an Exam Paper (or set manually below) —</option>
                    {matchingPapersForCalculator.length > 0 && (
                      <optgroup label={`Papers for ${className} · ${subject}`}>
                        {matchingPapersForCalculator.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.status} · {p.academicSession})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="All other papers in session">
                      {papers
                        .filter((p) => !matchingPapersForCalculator.some((m) => m.id === p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} · {p.blueprint.book.className} {p.blueprint.book.subject} ({p.academicSession})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                {/* Dynamic Class & Subject Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Class / Grade</label>
                    {classes.length > 0 ? (
                      <select
                        className="input w-full font-medium"
                        value={className}
                        onChange={(e) => handleClassChange(e.target.value)}
                        required
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} {c.stream ? `(${c.stream})` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="input w-full"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        required
                      />
                    )}
                  </div>
                  <div>
                    <label className="label">Subject</label>
                    {availableSubjectsForCalculator.length > 0 ? (
                      <select
                        className="input w-full font-medium"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                      >
                        {availableSubjectsForCalculator.map((s) => (
                          <option key={s.id || s.name} value={s.name}>
                            {s.name} {s.code ? `(${s.code})` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="input w-full"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Layout Format</label>
                    <select
                      className="input w-full"
                      value={layout}
                      onChange={(e) => setLayout(e.target.value as any)}
                    >
                      <option value="BOOKLET_A4">A4 Booklet (Folded to A5)</option>
                      <option value="BOOKLET">A3 Booklet (Folded to A4)</option>
                      <option value="PAGE">A4 Single Pages (Duplex)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Target Page Sides</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      className="input w-full"
                      value={pageCount}
                      onChange={(e) => setPageCount(Number(e.target.value) || 4)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Wastage Buffer (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      className="input w-full"
                      value={wastagePercent}
                      onChange={(e) => setWastagePercent(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Class Sections Editor */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-sm text-slate-900 block">Class Sections &amp; Headcount</span>
                      <span className="text-xs text-slate-500">Specify student counts per exam hall or section</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedClassObj && (
                        <button
                          type="button"
                          onClick={handleResetSectionsToClass}
                          className="btn btn-sm btn-ghost border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                          title={`Reset to standard sections configured for ${className}`}
                        >
                          <RefreshCw size={13} className="text-slate-500" /> Reset to {className} Sections
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={addSection}
                        className="btn btn-sm btn-ghost text-indigo-700 hover:bg-indigo-50"
                      >
                        <Plus size={14} /> Add Section
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {sections.map((sec, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="e.g. 10-A"
                          style={{ width: "9rem" }}
                          className="input text-xs font-bold shrink-0"
                          value={sec.name}
                          onChange={(e) => updateSection(idx, "name", e.target.value)}
                          required
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={1}
                            placeholder="Qty"
                            style={{ width: "6rem" }}
                            className="input text-xs font-semibold tabular-nums text-center shrink-0"
                            value={sec.count}
                            onChange={(e) => updateSection(idx, "count", Number(e.target.value) || 0)}
                            required
                          />
                          <span className="text-xs text-slate-500 whitespace-nowrap">Students</span>
                        </div>
                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSection(idx)}
                            className="btn btn-icon btn-ghost text-slate-400 hover:text-red-600 ml-auto"
                            title="Remove section"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Parallel Sets Configuration */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-semibold text-sm text-slate-900 block mb-1">
                    Multi-Set Distribution (Automatic Equal Spread)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {computedSets.map((s) => (
                      <div key={s.set} className="rounded-lg border border-purple-200 bg-purple-50/50 p-2.5 text-center">
                        <span className="block text-xs font-bold text-purple-900">{s.set}</span>
                        <span className="block font-display text-lg font-bold text-purple-950">{s.count}</span>
                        <span className="block text-[10px] text-purple-700">Copies needed</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={savingCalc}
                    className="btn btn-primary shadow-sm"
                  >
                    {savingCalc ? "Calculating…" : "Calculate & Generate Logistics Order"}
                  </button>
                </div>
              </div>
            </form>

            {/* Results & Packaging Slips Column (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Logistics Order Summary
                  </h3>
                  {latestCalcResult && (
                    <button
                      type="button"
                      onClick={() => setPackagingSlipModal(true)}
                      className="btn btn-sm btn-ghost text-indigo-700 border border-indigo-200"
                    >
                      <Printer size={14} /> Packaging Slips
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Total Candidates</span>
                    <span className="font-bold text-slate-900">{totalStudents}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Paper Format</span>
                    <span className="font-bold text-slate-900">
                      {layout === "BOOKLET_A4"
                        ? "A4 Folded (A5 Booklet)"
                        : layout === "BOOKLET"
                        ? "A3 Folded (A4 Booklet)"
                        : "A4 Duplex Sheets"}
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Net Paper Sheets</span>
                    <span className="font-bold text-slate-900">{rawSheets.toLocaleString()}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Buffer / Wastage Allowance</span>
                    <span className="font-bold text-emerald-700">+{wastageSheets} Sheets ({wastagePercent}%)</span>
                  </div>
                  <div className="py-2 flex justify-between font-semibold">
                    <span className="text-slate-800">Gross Sheets Required</span>
                    <span className="font-bold text-indigo-900">{totalSheetsRequired.toLocaleString()} Sheets</span>
                  </div>
                  <div className="py-2 flex justify-between items-center bg-indigo-50/70 p-2 rounded-lg font-bold">
                    <span className="text-indigo-950">Procurement Reams</span>
                    <span className="text-lg text-indigo-700">
                      {reamsToOrder} Reams ({layout === "BOOKLET" ? "A3 Paper" : "A4 Paper"})
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Answer Booklets (16 / 32 Page)</span>
                    <span className="font-bold text-slate-900">{totalStudents} Booklets</span>
                  </div>
                </div>

                {/* Section Distribution Preview */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="block text-xs font-bold text-slate-800 mb-2">Section Packing Manifest</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {sections.map((sec, i) => {
                      const setCount = sets.length || 1;
                      const base = Math.floor(sec.count / setCount);
                      let rem = sec.count % setCount;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-100"
                        >
                          <span className="font-bold text-slate-900">{sec.name}</span>
                          <span className="text-slate-600">{sec.count} Students</span>
                          <div className="flex gap-1">
                            {sets.map((s) => {
                              const extra = rem > 0 ? 1 : 0;
                              if (rem > 0) rem--;
                              return (
                                <span key={s.set} className="badge !bg-purple-100 !text-purple-800 text-[10px]">
                                  {s.set}: {base + extra}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Past Calculations History */}
              <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-display font-semibold text-sm text-slate-900">
                  Recent Paper Calculations
                </h4>
                {calculations.length === 0 ? (
                  <p className="text-xs text-slate-400">No saved calculations yet.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {calculations.slice(0, 5).map((c, i) => (
                      <div
                        key={c.id || i}
                        className="text-xs p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition"
                      >
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>{c.paperTitle}</span>
                          <span className="text-indigo-700">{c.totalReamsRequired} Reams</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                          <span>{c.className} · {c.totalStudents} Students</span>
                          <span>{timeAgo(c.createdAt || "")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: EXAM DATE-SHEET & TIMETABLE PLANNER                      */}
      {/* ============================================================== */}
      {activeTab === "timetable" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Examination Date-Sheet &amp; Timetable
              </h2>
              <p className="text-xs text-slate-600">
                Official schedule tracking deadlines for blueprint submission, moderation, and print runs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-ghost text-slate-700 hover:bg-slate-100"
              >
                <Printer size={15} /> Print Date-Sheet
              </button>
              <button
                type="button"
                onClick={openScheduleExamModal}
                className="btn btn-primary"
              >
                <Plus size={15} /> Schedule Exam
              </button>
            </div>
          </div>

          {/* Timetable Filters Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter size={13} /> Filters:
              </span>
              <select
                className="input h-9 text-xs font-medium py-1 w-36"
                value={timetableClassFilter}
                onChange={(e) => setTimetableClassFilter(e.target.value)}
                aria-label="Filter by class"
              >
                <option value="ALL">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>

              <select
                className="input h-9 text-xs font-medium py-1 w-36"
                value={timetableExamTypeFilter}
                onChange={(e) => setTimetableExamTypeFilter(e.target.value)}
                aria-label="Filter by exam term"
              >
                <option value="ALL">All Terms</option>
                {EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EXAM_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>

              <select
                className="input h-9 text-xs font-medium py-1 w-36"
                value={timetableStatusFilter}
                onChange={(e) => setTimetableStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="ALL">All Statuses</option>
                {TIMETABLE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {TIMETABLE_STATUS_LABEL[st]}
                  </option>
                ))}
              </select>

              {(timetableClassFilter !== "ALL" ||
                timetableExamTypeFilter !== "ALL" ||
                timetableStatusFilter !== "ALL" ||
                timetableSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setTimetableClassFilter("ALL");
                    setTimetableExamTypeFilter("ALL");
                    setTimetableStatusFilter("ALL");
                    setTimetableSearch("");
                  }}
                  className="text-xs font-semibold text-indigo-700 hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>

            <div className="relative min-w-56 max-w-xs">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                className="input pl-8 py-1 text-xs h-9 w-full [&::-webkit-search-cancel-button]:hidden"
                placeholder="Search subject, title, room…"
                value={timetableSearch}
                onChange={(e) => setTimetableSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Timetable Schedule Cards / Table */}
          {filteredTimetable.length === 0 ? (
            timetable.length === 0 ? (
              <div className="card p-12 text-center bg-white border border-slate-200">
                <CalendarDays size={36} className="mx-auto text-slate-400 mb-3" />
                <h3 className="font-display font-semibold text-slate-800">No exams scheduled yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Schedule exam dates, time slots, and link with exam papers or blueprints for Session {sessionFilter !== "ALL" ? sessionFilter : currentSession}.
                </p>
                <button
                  type="button"
                  onClick={openScheduleExamModal}
                  className="btn btn-primary btn-sm mt-4 inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Schedule First Exam
                </button>
              </div>
            ) : (
              <div className="card p-8 text-center bg-white border border-slate-200">
                <Search size={28} className="mx-auto text-slate-400 mb-2" />
                <h4 className="font-semibold text-sm text-slate-800">No scheduled exams match filters</h4>
                <p className="text-xs text-slate-500 mt-1">Try switching the class, term, status, or search query.</p>
                <button
                  type="button"
                  onClick={() => {
                    setTimetableClassFilter("ALL");
                    setTimetableExamTypeFilter("ALL");
                    setTimetableStatusFilter("ALL");
                    setTimetableSearch("");
                  }}
                  className="btn btn-sm btn-ghost border border-slate-200 mt-3"
                >
                  Clear filters
                </button>
              </div>
            )
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Date &amp; Slot</th>
                      <th className="px-4 py-3">Class &amp; Subject</th>
                      <th className="px-4 py-3">Exam Title &amp; Paper</th>
                      <th className="px-4 py-3">Rooms / Halls</th>
                      <th className="px-4 py-3">Print Deadline</th>
                      <th className="px-4 py-3">Lifecycle Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTimetable.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-indigo-600" />
                            <span>{item.examDate}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.startTime} – {item.endTime} ({item.sessionSlot})
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{item.className}</span>
                            <span className="badge badge-sm !bg-indigo-50 !text-indigo-900 text-[10px]">
                              {item.academicSession}
                            </span>
                          </div>
                          <div className="text-slate-600 font-medium">
                            {item.subject} {item.subjectCode ? `(${item.subjectCode})` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs font-medium text-slate-800">
                          <div className="truncate font-semibold">{item.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="badge !bg-slate-100 !text-slate-700 text-[10px]">
                              {EXAM_TYPE_LABEL[item.examType as ExamType] || item.examType}
                            </span>
                            {item.paperId ? (
                              <Link
                                href={`/papers/${item.paperId}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
                                title="Open linked Exam Paper workbench"
                              >
                                <FileText size={11} /> Open Paper <ExternalLink size={10} />
                              </Link>
                            ) : (
                              <span className="text-[10px] text-slate-400">No paper linked</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400" />
                            <span>{item.roomLocations || "Unassigned"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock size={13} className="text-amber-500" />
                            <span>{item.printingDeadline || item.examDate}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={item.status}
                            onChange={(e) =>
                              handleUpdateTimetableStatus(item.id, e.target.value as TimetableStatus)
                            }
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition ${
                              item.status === "PRINTED"
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : item.status === "MODERATED"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : item.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {TIMETABLE_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {TIMETABLE_STATUS_LABEL[st]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm("Delete this scheduled exam?")) {
                                await api(`/api/exam-cell/timetable/${item.id}`, { method: "DELETE" });
                                setTimetable((prev) => prev.filter((t) => t.id !== item.id));
                              }
                            }}
                            className="btn btn-icon btn-ghost text-slate-400 hover:text-red-600"
                            title="Delete entry"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* ============================================================== */}
      {/* TAB 3: CONFIDENTIAL EXAMINATION AUDIT TRAIL                     */}
      {/* ============================================================== */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Examination Security &amp; Change Audit Trail
              </h2>
              <p className="text-xs text-slate-600">
                Immutable chronological log of all authoring, status transitions, set generation, and print activities.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="btn btn-ghost text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw size={14} /> Refresh Log
            </button>
          </div>

          {/* Audit Filters */}
          <div className="card p-3 bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail by user, action or keyword…"
                value={auditFilter.search}
                onChange={(e) => setAuditFilter({ ...auditFilter, search: e.target.value })}
                className="input pl-8 py-1.5 text-xs w-full"
              />
            </div>
            <select
              value={auditFilter.entityType}
              onChange={(e) => setAuditFilter({ ...auditFilter, entityType: e.target.value })}
              className="input text-xs py-1.5"
            >
              <option value="">All Entities</option>
              <option value="PAPER">Papers</option>
              <option value="QUESTION">Questions</option>
              <option value="USER">User / RBAC</option>
              <option value="TIMETABLE">Timetable</option>
              <option value="LOGISTICS">Logistics</option>
            </select>
          </div>

          {/* Audit List */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Operator</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No audit events matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {timeAgo(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.userName}</div>
                          <span className="badge badge-sm !bg-slate-100 !text-slate-700 text-[10px]">
                            {log.userRole}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                          <span
                            className={`rounded px-1.5 py-0.5 font-bold ${
                              log.action.includes("CREATE")
                                ? "bg-emerald-50 text-emerald-800"
                                : log.action.includes("DELETE")
                                ? "bg-red-50 text-red-800"
                                : log.action.includes("ROLE")
                                ? "bg-purple-50 text-purple-800"
                                : "bg-blue-50 text-blue-800"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-semibold">
                          {log.entityType}
                        </td>
                        <td className="px-4 py-3 max-w-sm truncate text-slate-600 font-mono text-[11px]">
                          {log.detailsJson}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setInspectAudit(log)}
                            className="btn btn-icon btn-ghost text-slate-600 hover:text-indigo-600"
                            title="Inspect details payload"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PACKAGING SLIPS PRINT VIEW                              */}
      {/* ============================================================== */}
      {packagingSlipModal && latestCalcResult && (
        <Modal
          title={`Hall Packaging Slips · ${latestCalcResult.paperTitle}`}
          onClose={() => setPackagingSlipModal(false)}
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto p-1">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-600">
                Print these labels to affix onto sealed examination question envelopes for each hall.
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Envelopes
              </button>
            </div>

            <div className="space-y-4">
              {latestCalcResult.packagingSlips?.map((slip: any, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border-2 border-slate-900 bg-white p-4 text-xs space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3 border-b-2 border-slate-900 pb-2">
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/school-logo.png"
                        alt="Sarvodaya School Logo"
                        className="h-11 w-11 shrink-0 object-contain"
                      />
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                          Sarvodaya Higher Secondary School, Lakhnadon
                        </div>
                        <h4 className="font-bold text-sm text-slate-950 uppercase">
                          EXAMINATION PACKET · {latestCalcResult.paperTitle}
                        </h4>
                        <p className="text-[11px] text-slate-600">
                          {latestCalcResult.className} · {latestCalcResult.subject} ({latestCalcResult.academicSession})
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="badge !bg-slate-900 !text-white font-bold text-xs">
                        HALL / SECTION: {slip.section}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-1">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Enclosed Papers:</span>
                      <span className="font-bold text-base text-slate-900">{slip.studentCount} Copies</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Paper Format:</span>
                      <span className="font-bold text-slate-800">{latestCalcResult.layout}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Answer Booklets:</span>
                      <span className="font-bold text-slate-800">{slip.answerBookletsRequired} Nos.</span>
                    </div>
                  </div>

                  <div className="border border-purple-200 bg-purple-50/50 p-2 rounded flex gap-4">
                    <span className="font-bold text-purple-900">Set Breakdown:</span>
                    {slip.sets?.map((s: any) => (
                      <span key={s.set} className="font-semibold text-purple-950">
                        {s.set}: <b>{s.copies}</b>
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dashed border-slate-300">
                    <div className="border-t border-slate-700 pt-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-700 block">
                        Exam Superintendent / Custodian Seal
                      </span>
                    </div>
                    <div className="border-t border-slate-700 pt-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-700 block">
                        Invigilator Signature upon Opening
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL: SCHEDULE NEW EXAM TIMETABLE                             */}
      {/* ============================================================== */}
      {timetableModal && (
        <Modal
          title="Schedule Examination in Timetable"
          subtitle={`Plan date, rooms, and connect with paper for Session ${timetableForm.academicSession || currentSession}.`}
          onClose={() => setTimetableModal(false)}
        >
          <form onSubmit={handleCreateTimetable} className="space-y-4">
            {/* Dynamic Class & Subject Hierarchy */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                1. Target Class &amp; Subject
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Class / Grade</label>
                  {classes.length > 0 ? (
                    <select
                      value={timetableForm.className}
                      onChange={(e) => handleTimetableClassChange(e.target.value)}
                      className="input w-full bg-white font-medium"
                      required
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} {c.stream ? `(${c.stream})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={timetableForm.className}
                      onChange={(e) => handleTimetableClassChange(e.target.value)}
                      className="input w-full bg-white"
                      required
                    />
                  )}
                </div>
                <div>
                  <label className="label">Subject</label>
                  {(classes.find((c) => c.name === timetableForm.className)?.subjects || []).length > 0 ? (
                    <select
                      value={timetableForm.subject}
                      onChange={(e) => handleTimetableSubjectChange(e.target.value)}
                      className="input w-full bg-white font-medium"
                      required
                    >
                      {(classes.find((c) => c.name === timetableForm.className)?.subjects || []).map((s) => (
                        <option key={s.id || s.name} value={s.name}>
                          {s.name} {s.code ? `(${s.code})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={timetableForm.subject}
                      onChange={(e) => handleTimetableSubjectChange(e.target.value)}
                      className="input w-full bg-white"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 041, 086"
                    value={timetableForm.subjectCode}
                    onChange={(e) => setTimetableForm({ ...timetableForm, subjectCode: e.target.value })}
                    className="input w-full bg-white"
                  />
                </div>
                <div>
                  <label className="label">Examination Term</label>
                  <select
                    value={timetableForm.examType}
                    onChange={(e) => setTimetableForm({ ...timetableForm, examType: e.target.value as ExamType })}
                    className="input w-full bg-white font-medium"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {EXAM_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Link to Exam Paper (Optional)</label>
                <select
                  value={timetableForm.paperId}
                  onChange={(e) => handleTimetablePaperSelect(e.target.value)}
                  className="input w-full bg-white text-xs"
                >
                  <option value="">— Not linked to specific paper yet —</option>
                  {papers
                    .filter(
                      (p) =>
                        p.blueprint.book.className === timetableForm.className &&
                        p.blueprint.book.subject === timetableForm.subject,
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.status} · {p.academicSession})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Exam Title</label>
              <input
                type="text"
                placeholder="e.g. Class 10 Science Annual Board Exam"
                value={timetableForm.title}
                onChange={(e) => setTimetableForm({ ...timetableForm, title: e.target.value })}
                className="input w-full font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Exam Date</label>
                <input
                  type="date"
                  value={timetableForm.examDate}
                  onChange={(e) => setTimetableForm({ ...timetableForm, examDate: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="label">Start Time</label>
                <input
                  type="time"
                  value={timetableForm.startTime}
                  onChange={(e) => setTimetableForm({ ...timetableForm, startTime: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="label">End Time</label>
                <input
                  type="time"
                  value={timetableForm.endTime}
                  onChange={(e) => setTimetableForm({ ...timetableForm, endTime: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Session Slot</label>
                <select
                  value={timetableForm.sessionSlot}
                  onChange={(e) => setTimetableForm({ ...timetableForm, sessionSlot: e.target.value as any })}
                  className="input w-full"
                >
                  {SESSION_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {SESSION_SLOT_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Exam Rooms / Halls</label>
                <input
                  type="text"
                  placeholder="e.g. Hall 1, Hall 2, Room 104"
                  value={timetableForm.roomLocations}
                  onChange={(e) => setTimetableForm({ ...timetableForm, roomLocations: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Paper Submission Deadline</label>
                <input
                  type="date"
                  value={timetableForm.submissionDeadline}
                  onChange={(e) => setTimetableForm({ ...timetableForm, submissionDeadline: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="label">Printing Window Deadline</label>
                <input
                  type="date"
                  value={timetableForm.printingDeadline}
                  onChange={(e) => setTimetableForm({ ...timetableForm, printingDeadline: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTimetableModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingTimetable}
                className="btn btn-primary"
              >
                {savingTimetable ? "Scheduling…" : "Save to Timetable"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL: INSPECT AUDIT LOG PAYLOAD                               */}
      {/* ============================================================== */}
      {inspectAudit && (
        <Modal
          title={`Audit Event: ${inspectAudit.action}`}
          onClose={() => setInspectAudit(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">Operator</span>
                <span className="font-bold text-slate-900">{inspectAudit.userName} ({inspectAudit.userRole})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Date / Time</span>
                <span className="font-bold text-slate-900">{inspectAudit.createdAt}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Entity</span>
                <span className="font-bold text-slate-900">{inspectAudit.entityType} ({inspectAudit.entityId || "N/A"})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Action ID</span>
                <span className="font-mono text-slate-700">{inspectAudit.id}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-1">Payload JSON</span>
              <pre className="rounded-lg bg-slate-950 p-4 font-mono text-xs text-indigo-200 overflow-x-auto max-h-64">
                {JSON.stringify(JSON.parse(inspectAudit.detailsJson || "{}"), null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
