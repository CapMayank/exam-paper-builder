"use client";

import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileText,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Ruler,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AcademicRolloverModal } from "@/components/AcademicRolloverModal";
import {
  EmptyState,
  ErrorBanner,
  Field,
  ListSkeleton,
  Modal,
  PageHeader,
  Spinner,
  useConfirm,
  useToast,
} from "@/components/ui";
import { normalizeSession, useAcademicSession } from "@/lib/academicSession";
import { blueprintTotalMarks } from "@/lib/blueprint";
import { api } from "@/lib/client";
import {
  DEFAULT_SCHOOL_NAME,
  EXAM_TYPES,
  EXAM_TYPE_LABEL,
  LAYOUTS,
  LAYOUT_LABEL,
  sortClassNames,
  type ExamType,
  type Layout,
} from "@/lib/constants";
import { plural } from "@/lib/format";
import type { AcademicClassDto, Blueprint, PaperData } from "@/lib/types";

function subjectMatches(bookSubject: string, filterSubject: string): boolean {
  if (!filterSubject || filterSubject === "ALL") return true;
  const a = bookSubject.trim().toLowerCase();
  const s = filterSubject.trim().toLowerCase();
  if (a === s) return true;
  const aParts = a.split("/").map((x) => x.trim());
  const sParts = s.split("/").map((x) => x.trim());
  return aParts.some((p) => sParts.includes(p));
}

export default function BlueprintsPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { currentSession, setSession, availableSessions } = useAcademicSession();

  const [items, setItems] = useState<Blueprint[]>([]);
  const [classes, setClasses] = useState<AcademicClassDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [examTypeFilter, setExamTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rolloverOpen, setRolloverOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"directory" | "details">("directory");

  // Quick Paper Build Modal
  const [buildPaperBp, setBuildPaperBp] = useState<Blueprint | null>(null);
  const [paperForm, setPaperForm] = useState({
    title: "",
    examType: "ANNUAL" as ExamType,
    layout: "BOOKLET_A4" as Layout,
    paperSet: "SET A",
    examDate: "",
  });
  const [buildingPaper, setBuildingPaper] = useState(false);

  const activeSession = normalizeSession(currentSession);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const cls = sp.get("className");
    const sub = sp.get("subject");
    if (cls) setClassFilter(cls);
    if (sub) setSubjectFilter(sub);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bpData, clsData] = await Promise.all([
        api<Blueprint[]>("/api/blueprints"),
        api<AcademicClassDto[]>(`/api/classes?session=${encodeURIComponent(activeSession)}`),
      ]);
      setItems(bpData);
      setClasses(clsData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }, [activeSession]);

  useEffect(() => {
    void load();
  }, [load]);

  // Scoped strictly to active academic session
  const sessionItems = useMemo(() => {
    return items.filter((b) => normalizeSession(b.academicSession) === activeSession);
  }, [items, activeSession]);

  // All available classes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => set.add(c.name));
    sessionItems.forEach((b) => set.add(b.book.className));
    return sortClassNames(Array.from(set));
  }, [classes, sessionItems]);

  // Available subjects for the currently selected class filter
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    const matchedClass = classes.find(
      (c) => classFilter !== "ALL" && c.name.trim().toLowerCase() === classFilter.trim().toLowerCase()
    );
    if (matchedClass) {
      matchedClass.subjects.forEach((s) => set.add(s.name));
    }
    sessionItems.forEach((b) => {
      if (classFilter === "ALL" || b.book.className.trim().toLowerCase() === classFilter.trim().toLowerCase()) {
        set.add(b.book.subject);
      }
    });
    return Array.from(set).sort();
  }, [classes, sessionItems, classFilter]);

  // Filtered blueprints based on filters
  const displayedBlueprints = useMemo(() => {
    return sessionItems.filter((b) => {
      if (
        classFilter !== "ALL" &&
        b.book.className.trim().toLowerCase() !== classFilter.trim().toLowerCase()
      ) {
        return false;
      }
      if (subjectFilter !== "ALL" && !subjectMatches(b.book.subject, subjectFilter)) {
        return false;
      }
      if (examTypeFilter !== "ALL" && b.examType !== examTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchSub = b.book.subject.toLowerCase().includes(q);
        const matchBook = b.book.title.toLowerCase().includes(q);
        const matchCls = b.book.className.toLowerCase().includes(q);
        if (!matchName && !matchSub && !matchBook && !matchCls) return false;
      }
      return true;
    });
  }, [sessionItems, classFilter, subjectFilter, examTypeFilter, searchQuery]);

  const selected = useMemo(() => {
    return displayedBlueprints.find((b) => b.id === selectedId) ?? displayedBlueprints[0] ?? null;
  }, [displayedBlueprints, selectedId]);

  const selectedTotalMarks = selected ? blueprintTotalMarks(selected.sections) : 0;
  const selectedTotalQuestions = selected ? selected.sections.reduce((sum, s) => sum + s.count, 0) : 0;

  async function remove(b: Blueprint) {
    const ok = await confirm({
      title: `Delete “${b.name}”?`,
      message:
        b._count.papers > 0
          ? `${plural(b._count.papers, "paper")} use this blueprint. Delete those papers first or archive them.`
          : "This blueprint and its mark quotas will be permanently removed.",
      confirmLabel: "Delete blueprint",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await api(`/api/blueprints/${b.id}`, { method: "DELETE" });
      toast.success(`Deleted “${b.name}”`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function duplicate(b: Blueprint) {
    try {
      const copy = await api<Blueprint>("/api/blueprints", {
        method: "POST",
        json: {
          name: `${b.name} (Copy)`,
          bookId: b.bookId,
          examType: b.examType,
          durationMin: b.durationMin,
          academicSession: b.academicSession,
          subjectCode: b.subjectCode || "",
          sections: b.sections.map((s) => ({
            title: s.title,
            instructions: s.instructions,
            type: s.type,
            count: s.count,
            marksEach: s.marksEach,
          })),
          chapters: b.chapters.map((c) => ({
            chapterId: c.chapterId,
            marks: c.marks,
          })),
        },
      });
      toast.success(`Created “${copy.name}”`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function openBuildPaperModal(bp: Blueprint) {
    setBuildPaperBp(bp);
    setPaperForm({
      title: `${bp.book.className} ${bp.book.subject} — ${EXAM_TYPE_LABEL[bp.examType as ExamType] || "Annual"} Exam`,
      examType: (bp.examType as ExamType) || "ANNUAL",
      layout: "BOOKLET_A4",
      paperSet: "SET A",
      examDate: "",
    });
  }

  async function handleBuildPaperSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!buildPaperBp || !paperForm.title.trim()) return;

    setBuildingPaper(true);
    setError(null);

    try {
      const created = await api<PaperData>("/api/papers", {
        method: "POST",
        json: {
          title: paperForm.title.trim(),
          blueprintId: buildPaperBp.id,
          examType: paperForm.examType,
          layout: paperForm.layout,
          schoolName: DEFAULT_SCHOOL_NAME,
          examDate: paperForm.examDate,
          paperSet: paperForm.paperSet,
          subjectCode: buildPaperBp.subjectCode || "",
          academicSession: activeSession,
        },
      });
      setBuildPaperBp(null);
      toast.success(`Created draft paper "${created.title}"`);
      router.push(`/papers/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBuildingPaper(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Blueprints & Quotas"
        description={`Exam blueprints define marks, section formats, and chapter allocations for each subject in Session ${activeSession}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRolloverOpen(true)}
              className="btn btn-ghost border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs py-1.5"
              title="Carry forward blueprints, classes & syllabus into a new session"
            >
              <RotateCcw size={15} className="text-slate-600" /> Rollover Session
            </button>
            <Link
              href="/blueprints/new?import=true"
              className="btn btn-ghost border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs py-1.5"
              title="Import blueprint specification from JSON or CSV"
            >
              <Upload size={15} className="text-slate-600" /> Import Blueprint
            </Link>
            <Link
              href={`/blueprints/new${classFilter !== "ALL" ? `?className=${encodeURIComponent(classFilter)}` : ""}${subjectFilter !== "ALL" ? `&subject=${encodeURIComponent(subjectFilter)}` : ""}`}
              className="btn btn-primary text-xs py-1.5"
            >
              <Plus size={15} /> New Blueprint
            </Link>
          </div>
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Top Filter Card (Matching Books & Syllabus) */}
      <div className="card p-4 space-y-3 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-600" /> Active Session:
            </span>
            <span className="badge !bg-slate-900 !text-white font-mono px-2.5 py-0.5">
              {activeSession}
            </span>
            <span className="text-xs text-slate-500">
              ({sessionItems.length} {sessionItems.length === 1 ? "blueprint" : "blueprints"})
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
            <Link
              href="/classes"
              className="hover:text-slate-950 inline-flex items-center gap-1"
            >
              <GraduationCap size={14} /> Manage Classes &amp; Subjects
            </Link>
            <Link
              href="/books"
              className="hover:text-slate-950 inline-flex items-center gap-1"
            >
              <BookOpen size={14} /> Textbooks &amp; Syllabus
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Class:</span>
              <select
                className="input py-1 px-2.5 text-xs w-40"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSubjectFilter("ALL");
                }}
              >
                <option value="ALL">All Classes ({availableClasses.length})</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Subject:</span>
              <select
                className="input py-1 px-2.5 text-xs w-48"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                <option value="ALL">All Subjects ({availableSubjects.length})</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Exam Term:</span>
              <select
                className="input py-1 px-2.5 text-xs w-36"
                value={examTypeFilter}
                onChange={(e) => setExamTypeFilter(e.target.value)}
              >
                <option value="ALL">All Terms</option>
                {EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EXAM_TYPE_LABEL[t] || t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Search:</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Find blueprint..."
                  className="input py-1 pl-7 pr-2.5 text-xs w-44"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong>{displayedBlueprints.length}</strong> of {sessionItems.length} blueprints
          </div>
        </div>
      </div>

      {!loaded ? (
        <ListSkeleton rows={4} />
      ) : sessionItems.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title={`No blueprints configured for Session ${activeSession}`}
          description="Start by creating an exam blueprint or initializing standard classes in the Curriculum Hub."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/classes" className="btn btn-primary">
                <GraduationCap size={16} /> Open Classes &amp; Subjects Hub
              </Link>
              <Link href="/blueprints/new" className="btn btn-ghost border border-slate-200">
                <Plus size={16} /> Create Blueprint
              </Link>
            </div>
          }
        />
      ) : displayedBlueprints.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="No matching blueprints"
          description={`No blueprints match your current filter settings. Try clearing your filters.`}
          action={
            <button
              type="button"
              className="btn btn-ghost border border-slate-200"
              onClick={() => {
                setClassFilter("ALL");
                setSubjectFilter("ALL");
                setExamTypeFilter("ALL");
                setSearchQuery("");
              }}
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <>
          {/* Mobile Tab Switcher (< lg screens) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl lg:hidden">
            <button
              type="button"
              onClick={() => setMobileTab("directory")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                mobileTab === "directory" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Ruler size={14} /> Blueprints ({displayedBlueprints.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("details")}
              disabled={!selected}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                mobileTab === "details" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers size={14} /> {selected ? selected.name : "Blueprint Details"}
            </button>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            {/* LEFT COLUMN: Blueprints List */}
            <div
              className={`lg:sticky lg:top-6 lg:max-h-[calc(100vh-3.5rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden ${
                mobileTab === "details" ? "hidden lg:flex" : "flex"
              }`}
            >
              <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler size={14} className="text-indigo-600" /> Blueprints ({displayedBlueprints.length})
                </span>
                <Link href="/blueprints/new" className="btn btn-primary text-[11px] py-1 px-2.5 gap-1">
                  <Plus size={13} /> New
                </Link>
              </div>
              <ul className="overflow-y-auto overscroll-contain flex-1 p-2 space-y-1.5 focus:outline-none" aria-label="Blueprints">
                {displayedBlueprints.map((bp) => {
                  const active = selected?.id === bp.id;
                  const totalMarks = blueprintTotalMarks(bp.sections);

                  return (
                    <li key={bp.id}>
                      <div
                        className={`group relative rounded-xl border p-3 transition ${
                          active ? "border-indigo-500/80 ring-1 ring-indigo-500/20 bg-indigo-50/90 text-indigo-950 shadow-2xs" : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(bp.id);
                            setMobileTab("details");
                            if (typeof window !== "undefined") {
                              const el = document.getElementById("blueprint-detail-workspace");
                              if (el && (el.getBoundingClientRect().top < 20 || window.innerWidth < 1024)) {
                                el.scrollIntoView({ behavior: "smooth", block: "start" });
                              }
                            }
                          }}
                          aria-pressed={active}
                          className="block w-full rounded-lg text-left after:absolute after:inset-0 after:rounded-xl"
                        >
                        <div className="flex items-center justify-between gap-2">
                          <span className="block font-semibold text-sm text-slate-900 truncate">{bp.name}</span>
                          <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 whitespace-nowrap">
                            {EXAM_TYPE_LABEL[bp.examType as ExamType] || bp.examType}
                          </span>
                        </div>
                        <span className="mt-0.5 block text-xs text-slate-600 truncate">
                          {bp.book.className} · {bp.book.subject}
                        </span>
                        <span className="mt-1.5 block text-[11px] text-slate-500">
                          {totalMarks} marks · {bp.durationMin} mins · {plural(bp.sections.length, "section")}
                        </span>
                      </button>
                      <div className="absolute right-2 top-2 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-white/95 rounded-lg p-0.5 shadow-2xs border border-slate-200/60">
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-xs p-1"
                          title="Duplicate blueprint"
                          aria-label={`Duplicate ${bp.name}`}
                          onClick={() => duplicate(bp)}
                        >
                          <Copy size={12} />
                        </button>
                        <Link
                          href={`/blueprints/${bp.id}`}
                          className="btn btn-ghost btn-icon btn-xs p-1"
                          title="Edit blueprint"
                          aria-label={`Edit ${bp.name}`}
                        >
                          <Pencil size={12} />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-xs p-1 hover:bg-red-50 hover:text-red-700"
                          title="Delete blueprint"
                          aria-label={`Delete ${bp.name}`}
                          onClick={() => remove(bp)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* RIGHT COLUMN: Focused Blueprint Studio & Launcher Workspace */}
          {selected && (
            <div
              id="blueprint-detail-workspace"
              className={`space-y-6 ${mobileTab === "directory" ? "hidden lg:block" : "block"}`}
            >
              {/* Mobile Back to Blueprints Button */}
              <div className="lg:hidden flex items-center justify-between gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => setMobileTab("directory")}
                  className="btn btn-ghost border border-slate-200 text-xs py-1.5 px-3 inline-flex items-center gap-1.5 font-semibold text-slate-800"
                >
                  ← Back to Blueprints
                </button>
                <span className="text-xs text-slate-500 font-medium truncate">
                  {selected.name}
                </span>
              </div>

              {/* Card 1: Blueprint Header & Quick Actions */}
              <div className="card p-6 space-y-6 bg-white" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                      <span className="badge !bg-indigo-50 !text-indigo-700 border border-indigo-200/50">
                        {EXAM_TYPE_LABEL[selected.examType as ExamType] || selected.examType} Exam
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {selected.book.className} · {selected.book.subject} · {selected.book.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openBuildPaperModal(selected)}
                      className="btn btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                      title="Build a question paper using this blueprint"
                    >
                      <FileText size={14} /> Build Paper
                    </button>
                    <Link
                      href={`/blueprints/${selected.id}`}
                      className="btn btn-ghost border border-slate-200 text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                      title="Edit blueprint configuration"
                    >
                      <Pencil size={13} /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => duplicate(selected)}
                      className="btn btn-ghost border border-slate-200 text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                      title="Duplicate blueprint"
                    >
                      <Copy size={13} /> Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(selected)}
                      className="btn btn-ghost border border-slate-200 text-red-600 hover:bg-red-50 text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                      title="Delete blueprint"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Marks</span>
                    <span className="text-xl font-bold text-slate-900 mt-0.5 block">{selectedTotalMarks}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Duration</span>
                    <span className="text-xl font-bold text-slate-900 mt-0.5 block">{selected.durationMin} mins</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sections</span>
                    <span className="text-xl font-bold text-slate-900 mt-0.5 block">{selected.sections.length}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Question Slots</span>
                    <span className="text-xl font-bold text-slate-900 mt-0.5 block">{selectedTotalQuestions}</span>
                  </div>
                </div>

                {/* Sections Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Exam Sections ({selected.sections.length})
                    </h3>
                    <span className="text-xs text-slate-500">
                      Total: {selectedTotalQuestions} questions · {selectedTotalMarks} marks
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selected.sections.map((sec, idx) => (
                      <div
                        key={sec.id || idx}
                        className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 flex flex-wrap items-center justify-between gap-3 hover:border-slate-300 transition"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{sec.title}</span>
                            <span className="badge !bg-indigo-50 !text-indigo-700 border border-indigo-200/50 text-[10px] uppercase font-semibold">
                              {sec.type}
                            </span>
                          </div>
                          {sec.instructions && (
                            <p className="text-xs text-slate-500 italic">{sec.instructions}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
                          <span className="text-slate-500">{sec.count} questions × {sec.marksEach}m</span>
                          <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                            {sec.count * sec.marksEach} marks
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chapter Mark Allocations */}
                {selected.chapters.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Chapter Marks Allocation ({selected.chapters.length})
                      </h3>
                      <span className="text-xs text-slate-500">
                        Total: {selected.chapters.reduce((sum, c) => sum + c.marks, 0)} marks allocated
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selected.chapters.map((ch, idx) => (
                        <div
                          key={ch.chapterId || idx}
                          className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 px-3 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-slate-500 shrink-0">Ch. {ch.chapter.number}</span>
                            <span className="text-slate-800 font-medium truncate">{ch.chapter.title}</span>
                          </div>
                          <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] shrink-0">
                            {ch.marks}m
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Callout Card: Build Exam Paper */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950">Ready to assemble an examination paper?</h4>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      Generate customized question paper sets (Set A, B, C) matching this blueprint structure.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openBuildPaperModal(selected)}
                    className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                  >
                    <FileText size={14} /> Build Exam Paper Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* Unified Academic Rollover Modal */}
      {rolloverOpen && (
        <AcademicRolloverModal
          currentSession={currentSession}
          availableSessions={availableSessions}
          onClose={() => setRolloverOpen(false)}
          onSuccess={(targetSession) => {
            setRolloverOpen(false);
            setSession(targetSession);
            void load();
          }}
        />
      )}

      {/* Build Exam Paper Modal */}
      {buildPaperBp !== null && (
        <Modal
          onClose={() => setBuildPaperBp(null)}
          title={`Build Exam Paper — ${buildPaperBp.book.className} ${buildPaperBp.book.subject}`}
          subtitle={`Based on blueprint "${buildPaperBp.name}" (${blueprintTotalMarks(buildPaperBp.sections)} Marks · ${buildPaperBp.durationMin} mins)`}
        >
          <form onSubmit={handleBuildPaperSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {error}
              </div>
            )}

            <Field label="Exam Paper Title">
              <input
                className="input text-xs"
                required
                value={paperForm.title}
                onChange={(e) => setPaperForm({ ...paperForm, title: e.target.value })}
                placeholder="e.g. Class 10 Science — Annual Examination 2025–26"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Exam Term">
                <select
                  className="input text-xs"
                  value={paperForm.examType}
                  onChange={(e) =>
                    setPaperForm({ ...paperForm, examType: e.target.value as ExamType })
                  }
                >
                  {EXAM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {EXAM_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Print Layout">
                <select
                  className="input text-xs"
                  value={paperForm.layout}
                  onChange={(e) =>
                    setPaperForm({ ...paperForm, layout: e.target.value as Layout })
                  }
                >
                  {LAYOUTS.map((l) => (
                    <option key={l} value={l}>
                      {LAYOUT_LABEL[l]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Initial Set Identifier">
                <input
                  className="input text-xs"
                  value={paperForm.paperSet}
                  onChange={(e) => setPaperForm({ ...paperForm, paperSet: e.target.value })}
                  placeholder="SET A"
                />
              </Field>

              <Field label="Exam Date (Optional)">
                <input
                  type="date"
                  className="input text-xs"
                  value={paperForm.examDate}
                  onChange={(e) => setPaperForm({ ...paperForm, examDate: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBuildPaperBp(null)}
                className="btn btn-ghost text-xs"
                disabled={buildingPaper}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary text-xs"
                disabled={buildingPaper || !paperForm.title.trim()}
              >
                {buildingPaper && <Spinner />}
                {buildingPaper ? "Creating Paper…" : "Create & Open Paper Studio"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
