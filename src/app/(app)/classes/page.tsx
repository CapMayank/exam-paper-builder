"use client";

import {
  ArrowRight,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Ruler,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AcademicRolloverModal } from "@/components/AcademicRolloverModal";
import {
  EmptyState,
  ErrorBanner,
  Field,
  ListSkeleton,
  Modal,
  PageHeader,
  useConfirm,
  useToast,
} from "@/components/ui";
import { normalizeSession, useAcademicSession } from "@/lib/academicSession";
import { api } from "@/lib/client";
import { plural } from "@/lib/format";
import type {
  AcademicClassDto,
  Blueprint,
  Book,
  ClassSubjectDto,
  PaperListItem,
} from "@/lib/types";

const STREAM_PRIORITY: Record<string, number> = {
  "pre-primary": 1,
  "primary": 2,
  "middle": 3,
  "secondary": 4,
  "senior secondary": 5,
  "science": 6,
  "commerce": 7,
  "arts": 8,
  "humanities": 9,
  "general": 10,
};

function subjectMatches(bookSubject: string, classSubjectName: string): boolean {
  const a = bookSubject.trim().toLowerCase();
  const b = classSubjectName.trim().toLowerCase();
  if (a === b) return true;
  const aParts = a.split("/").map((s) => s.trim());
  const bParts = b.split("/").map((s) => s.trim());
  return aParts.some((p) => bParts.includes(p));
}

export default function ClassesHierarchyPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { currentSession, setSession, availableSessions } = useAcademicSession();

  const [classes, setClasses] = useState<AcademicClassDto[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | null>(null);
  const [streamFilter, setStreamFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals for Class and Subject management
  const [classModal, setClassModal] = useState<{ editing: AcademicClassDto | null } | null>(null);
  const [classForm, setClassForm] = useState({ name: "", stream: "", sectionsText: "A" });

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<ClassSubjectDto | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });

  const [rolloverModalOpen, setRolloverModalOpen] = useState(false);

  const activeSession = normalizeSession(currentSession);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [cls, bks, bps, pps] = await Promise.all([
        api<AcademicClassDto[]>(`/api/classes?session=${encodeURIComponent(activeSession)}`),
        api<Book[]>("/api/books"),
        api<Blueprint[]>("/api/blueprints"),
        api<PaperListItem[]>("/api/papers"),
      ]);
      setClasses(cls);
      setBooks(bks);
      setBlueprints(bps);
      setPapers(pps);
      setSelectedClassId((prev) => {
        if (prev && cls.some((c) => c.id === prev)) return prev;
        return cls[0]?.id ?? null;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }, [activeSession]);

  useEffect(() => {
    void load();
  }, [load]);

  const sessionBooks = useMemo(
    () => books.filter((b) => normalizeSession(b.academicSession) === activeSession),
    [books, activeSession]
  );

  const sessionBlueprints = useMemo(
    () => blueprints.filter((bp) => normalizeSession(bp.academicSession) === activeSession),
    [blueprints, activeSession]
  );

  const sessionPapers = useMemo(
    () => papers.filter((p) => normalizeSession(p.academicSession) === activeSession),
    [papers, activeSession]
  );

  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (c.stream) set.add(c.stream);
    });
    return Array.from(set).sort((a, b) => {
      const orderA = STREAM_PRIORITY[a.trim().toLowerCase()] ?? 99;
      const orderB = STREAM_PRIORITY[b.trim().toLowerCase()] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });
  }, [classes]);

  const displayedClasses = useMemo(() => {
    return classes.filter((c) => {
      if (streamFilter !== "ALL" && c.stream.trim().toLowerCase() !== streamFilter.trim().toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchSub = c.subjects.some((s) => s.name.toLowerCase().includes(q));
        if (!matchName && !matchSub) return false;
      }
      return true;
    });
  }, [classes, streamFilter, searchQuery]);

  const selectedClass = useMemo(
    () => displayedClasses.find((c) => c.id === selectedClassId) ?? displayedClasses[0] ?? classes[0] ?? null,
    [displayedClasses, classes, selectedClassId]
  );

  const [mobileTab, setMobileTab] = useState<"directory" | "details">("directory");

  const selectedClassIndex = useMemo(() => {
    if (!selectedClass) return -1;
    return classes.findIndex((c) => c.id === selectedClass.id);
  }, [classes, selectedClass]);

  const prevClass = selectedClassIndex > 0 ? classes[selectedClassIndex - 1] : null;
  const nextClass = selectedClassIndex >= 0 && selectedClassIndex < classes.length - 1 ? classes[selectedClassIndex + 1] : null;

  const handleSelectClass = useCallback((clsId: string) => {
    setSelectedClassId(clsId);
    setSelectedSubjectName(null);
    setMobileTab("details");
    if (typeof window !== "undefined") {
      const el = document.getElementById("class-details-workspace");
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top < 20 || window.innerWidth < 1024) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
  }, []);

  // Registered ClassSubjects + any subjects present on existing books
  const classSubjects = useMemo(() => {
    if (!selectedClass) return [];
    const list: Array<{ id?: string; name: string; code: string }> = selectedClass.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
    }));
    const classBooks = sessionBooks.filter(
      (b) => b.className.trim().toLowerCase() === selectedClass.name.trim().toLowerCase()
    );
    for (const b of classBooks) {
      if (!list.some((s) => subjectMatches(b.subject, s.name))) {
        list.push({ name: b.subject, code: "" });
      }
    }
    return list;
  }, [selectedClass, sessionBooks]);

  const activeSubject = useMemo(() => {
    if (classSubjects.length === 0) return null;
    if (selectedSubjectName) {
      const found = classSubjects.find((s) => s.name === selectedSubjectName);
      if (found) return found;
    }
    return classSubjects[0] ?? null;
  }, [classSubjects, selectedSubjectName]);

  // Scoped entity counts for selected class and subject
  const subjectBooks = useMemo(() => {
    if (!selectedClass || !activeSubject) return [];
    return sessionBooks.filter(
      (b) =>
        b.className.trim().toLowerCase() === selectedClass.name.trim().toLowerCase() &&
        subjectMatches(b.subject, activeSubject.name)
    );
  }, [sessionBooks, selectedClass, activeSubject]);

  const subjectBookIds = useMemo(() => new Set(subjectBooks.map((b) => b.id)), [subjectBooks]);

  const subjectBlueprints = useMemo(
    () => sessionBlueprints.filter((bp) => subjectBookIds.has(bp.bookId)),
    [sessionBlueprints, subjectBookIds]
  );

  const subjectPapers = useMemo(() => {
    if (!selectedClass || !activeSubject) return [];
    return sessionPapers.filter(
      (p) =>
        p.blueprint.book.className.trim().toLowerCase() === selectedClass.name.trim().toLowerCase() &&
        subjectMatches(p.blueprint.book.subject, activeSubject.name)
    );
  }, [sessionPapers, selectedClass, activeSubject]);

  const totalSubjectQuestions = useMemo(
    () => subjectBooks.reduce((sum, b) => sum + b._count.questions, 0),
    [subjectBooks]
  );

  const totalSubjectChapters = useMemo(
    () => subjectBooks.reduce((sum, b) => sum + b.chapters.length, 0),
    [subjectBooks]
  );

  async function seedStandardClasses() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/classes", {
        method: "POST",
        json: { action: "SEED_STANDARD", academicSession: activeSession },
      });
      await load();
      toast.success(`Initialized standard Classes Nursery–12th & Subjects for Session ${activeSession}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveClass(e: React.FormEvent) {
    e.preventDefault();
    if (!classForm.name.trim()) return;
    setBusy(true);
    setError(null);
    const sections = classForm.sectionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      if (classModal?.editing) {
        await api(`/api/classes/${classModal.editing.id}`, {
          method: "PATCH",
          json: {
            name: classForm.name.trim(),
            stream: classForm.stream.trim(),
            sections: sections.length > 0 ? sections : ["A"],
          },
        });
        toast.success(`Updated ${classForm.name.trim()}`);
      } else {
        const created = await api<AcademicClassDto>("/api/classes", {
          method: "POST",
          json: {
            name: classForm.name.trim(),
            stream: classForm.stream.trim(),
            sections: sections.length > 0 ? sections : ["A"],
            academicSession: activeSession,
          },
        });
        setSelectedClassId(created.id);
        toast.success(`Added ${created.name}`);
      }
      setClassModal(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteClass(cls: AcademicClassDto) {
    const ok = await confirm({
      title: `Delete ${cls.name}?`,
      message:
        "This will remove the class definition and its subject list from this academic session. Textbooks and exam papers associated with this class name will remain in the database.",
      confirmLabel: "Delete Class",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await api(`/api/classes/${cls.id}`, { method: "DELETE" });
      toast.success(`Removed ${cls.name}`);
      setSelectedClassId(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass || !subjectForm.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (editingSubject?.id) {
        await api(`/api/classes/${selectedClass.id}/subjects/${editingSubject.id}`, {
          method: "PATCH",
          json: { name: subjectForm.name.trim(), code: subjectForm.code.trim() },
        });
        toast.success(`Updated subject ${subjectForm.name.trim()}`);
      } else {
        await api(`/api/classes/${selectedClass.id}/subjects`, {
          method: "POST",
          json: { name: subjectForm.name.trim(), code: subjectForm.code.trim() },
        });
        toast.success(`Added ${subjectForm.name.trim()} to ${selectedClass.name}`);
        setSelectedSubjectName(subjectForm.name.trim());
      }
      setSubjectModalOpen(false);
      setEditingSubject(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteSubject(subjectId?: string, subjectName?: string) {
    if (!selectedClass) return;
    if (!subjectId) {
      toast.error("This subject was imported from existing textbooks and cannot be deleted here.");
      return;
    }
    const ok = await confirm({
      title: `Remove ${subjectName || "Subject"}?`,
      message: `Remove this subject from ${selectedClass.name}? Textbooks already saved under this subject remain safe.`,
      confirmLabel: "Remove Subject",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await api(`/api/classes/${selectedClass.id}/subjects/${subjectId}`, { method: "DELETE" });
      toast.success(`Removed subject`);
      if (selectedSubjectName === subjectName) setSelectedSubjectName(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Curriculum Hierarchy"
        description={`Manage institutional classes, sections, streams, and subject rosters for Session ${activeSession}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={seedStandardClasses}
              className="btn btn-ghost border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              title="Populate standard school classes (Nursery to Class 12) with foundational & CBSE/NCERT subjects for this session"
            >
              <Sparkles size={15} className="text-amber-600" /> Initialize Nursery–12th
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRolloverModalOpen(true)}
              className="btn btn-ghost border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              title="Rollover classes, syllabus, and blueprints into a new academic year"
            >
              <RotateCcw size={15} /> Rollover Session
            </button>
            <button
              type="button"
              onClick={() => {
                setClassForm({ name: "", stream: "", sectionsText: "A" });
                setClassModal({ editing: null });
              }}
              className="btn btn-primary"
            >
              <Plus size={16} /> Add Class
            </button>
          </div>
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Slim Institutional Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={14} className="text-slate-500" />
          <span className="font-semibold text-slate-800">Active Academic Session:</span>
          <span className="badge !bg-slate-900 !text-white font-mono px-2 py-0.5 text-xs">
            {activeSession}
          </span>
          <span className="text-slate-400">·</span>
          <span>
            <strong>{classes.length}</strong> institutional classes configured
          </span>
        </div>

        <div className="flex items-center gap-3 font-semibold text-slate-700">
          <Link
            href="/books"
            className="hover:text-slate-950 inline-flex items-center gap-1 transition"
          >
            <BookOpen size={13} className="text-indigo-600" /> Textbooks &amp; Syllabus
          </Link>
          <span className="text-slate-300">·</span>
          <Link
            href="/blueprints"
            className="hover:text-slate-950 inline-flex items-center gap-1 transition"
          >
            <Ruler size={13} className="text-indigo-600" /> Exam Blueprints
          </Link>
        </div>
      </div>

      {/* Mobile Tab Switcher (< lg screens) */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("directory")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileTab === "directory" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <GraduationCap size={14} /> Classes Directory ({classes.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("details")}
          disabled={!selectedClass}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileTab === "details" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers size={14} /> {selectedClass ? `${selectedClass.name} Options` : "Class Options"}
        </button>
      </div>

      {!loaded ? (
        <ListSkeleton rows={4} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={`No classes configured for Session ${activeSession}`}
          description="Start by initializing standard school classes (Nursery to Class 12) with foundational & CBSE/NCERT subjects, or add a class manually."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={seedStandardClasses} className="btn btn-primary">
                <Sparkles size={16} /> Initialize Standard Classes (Nursery–12th)
              </button>
              <button
                type="button"
                onClick={() => {
                  setClassForm({ name: "Nursery", stream: "Pre-Primary", sectionsText: "A" });
                  setClassModal({ editing: null });
                }}
                className="btn btn-ghost border border-slate-200"
              >
                <Plus size={16} /> Add Class Manually
              </button>
            </div>
          }
        />
      ) : displayedClasses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No matching classes"
          description={`No classes match the filter "${streamFilter !== "ALL" ? streamFilter : searchQuery}". Try clearing your filters.`}
          action={
            <button
              type="button"
              className="btn btn-ghost border border-slate-200"
              onClick={() => {
                setStreamFilter("ALL");
                setSearchQuery("");
              }}
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
          {/* LEFT COLUMN: Sticky, Viewport-Contained Classes Directory */}
          <div
            className={`lg:sticky lg:top-6 lg:max-h-[calc(100vh-3.5rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden ${
              mobileTab === "details" ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Directory Header with Quick Filter Pills & Search */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/70 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Directory</span>
                  <span className="badge !bg-indigo-100 !text-indigo-800 text-[10px] px-1.5 font-mono">
                    {displayedClasses.length}/{classes.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClassForm({ name: "", stream: "", sectionsText: "A" });
                    setClassModal({ editing: null });
                  }}
                  className="btn btn-primary text-[11px] py-1 px-2.5 gap-1"
                  title="Add class"
                >
                  <Plus size={13} /> Add
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Find class or subject..."
                  className="input py-1 pl-7 pr-7 text-xs w-full bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs px-1"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Stream filter chips */}
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setStreamFilter("ALL")}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                    streamFilter === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  All ({classes.length})
                </button>
                {availableStreams.map((st) => {
                  const count = classes.filter((c) => c.stream.trim().toLowerCase() === st.trim().toLowerCase()).length;
                  const active = streamFilter.trim().toLowerCase() === st.trim().toLowerCase();
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStreamFilter(active ? "ALL" : st)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                        active
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {st} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Class List */}
            <ul className="overflow-y-auto overscroll-contain flex-1 p-2 space-y-1 divide-y divide-slate-100 focus:outline-none" aria-label="Classes Directory">
              {displayedClasses.map((cls) => {
                const active = selectedClass?.id === cls.id;
                const clsBooks = sessionBooks.filter(
                  (b) => b.className.trim().toLowerCase() === cls.name.trim().toLowerCase()
                );
                const clsBookIds = new Set(clsBooks.map((b) => b.id));
                const clsBps = sessionBlueprints.filter((bp) => clsBookIds.has(bp.bookId));
                const clsPapers = sessionPapers.filter(
                  (p) => p.blueprint.book.className.trim().toLowerCase() === cls.name.trim().toLowerCase()
                );

                return (
                  <li key={cls.id} className="pt-1 first:pt-0">
                    <div
                      className={`group relative rounded-xl transition border ${
                        active
                          ? "bg-indigo-50/90 border-indigo-500/80 ring-1 ring-indigo-500/20 shadow-2xs text-indigo-950"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50/80 text-slate-800"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectClass(cls.id)}
                        aria-pressed={active}
                        className="w-full text-left p-2.5 rounded-xl block relative after:absolute after:inset-0 after:rounded-xl"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-semibold text-sm truncate">{cls.name}</span>
                          {cls.stream && (
                            <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.2 text-[10px] font-medium whitespace-nowrap ${
                              active ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"
                            }`}>
                              {cls.stream}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="font-mono text-slate-600">
                            {cls.sections.length === 1 ? `Sec ${cls.sections[0]}` : `Secs ${cls.sections.join(",")}`}
                          </span>
                          <span className="truncate">
                            {plural(cls.subjects.length, "subj")} · {plural(clsBooks.length, "book")} · {plural(clsPapers.length, "paper")}
                          </span>
                        </div>
                      </button>
                      <div className="absolute right-2 top-2 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-white/95 rounded-lg p-0.5 shadow-2xs border border-slate-200/60">
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-xs p-1"
                          title="Edit class"
                          aria-label={`Edit ${cls.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setClassForm({
                              name: cls.name,
                              stream: cls.stream,
                              sectionsText: cls.sections.join(", "),
                            });
                            setClassModal({ editing: cls });
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-xs p-1 hover:bg-red-50 hover:text-red-700"
                          title="Delete class"
                          aria-label={`Delete ${cls.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteClass(cls);
                          }}
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

          {/* RIGHT COLUMN: Selected Class Configuration & Relational Workspaces */}
          {selectedClass && (
            <div
              id="class-details-workspace"
              className={`space-y-6 ${mobileTab === "directory" ? "hidden lg:block" : "block"}`}
            >
              {/* Mobile Back to Directory Button */}
              <div className="lg:hidden flex items-center justify-between gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => setMobileTab("directory")}
                  className="btn btn-ghost border border-slate-200 text-xs py-1.5 px-3 inline-flex items-center gap-1.5 font-semibold text-slate-800"
                >
                  ← Back to Directory
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  Viewing {selectedClass.name}
                </span>
              </div>

              {/* Card 1: Class Details & Subject Roster */}
              <div className="card p-5 space-y-4 bg-white">
                {/* Horizontal Quick-Switch Class Strip */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 -mt-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs no-scrollbar">
                    <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 text-[11px]">
                      <Layers size={13} className="text-indigo-600" /> Switch Class:
                    </span>
                    {classes.map((c) => {
                      const isCur = c.id === selectedClass.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectClass(c.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                            isCur
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950"
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Prev / Next buttons */}
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={!prevClass}
                      onClick={() => prevClass && handleSelectClass(prevClass.id)}
                      className="btn btn-ghost btn-xs border border-slate-200 py-1 px-2 text-[11px] disabled:opacity-40"
                      title={prevClass ? `Go to ${prevClass.name}` : "No previous class"}
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      disabled={!nextClass}
                      onClick={() => nextClass && handleSelectClass(nextClass.id)}
                      className="btn btn-ghost btn-xs border border-slate-200 py-1 px-2 text-[11px] disabled:opacity-40"
                      title={nextClass ? `Go to ${nextClass.name}` : "No next class"}
                    >
                      Next →
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900">{selectedClass.name}</h2>
                      {selectedClass.stream && (
                        <span className="badge !bg-slate-100 !text-slate-700 border border-slate-200">
                          {selectedClass.stream}
                        </span>
                      )}
                      <span className="badge !bg-slate-100 !text-slate-700 border border-slate-200 font-mono">
                        {selectedClass.sections.length === 1 ? `Section ${selectedClass.sections[0]}` : `Sections: ${selectedClass.sections.join(", ")}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage subjects taught in <strong>{selectedClass.name}</strong>. Select a subject below to view connected curriculum and exam workspaces.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubject(null);
                        setSubjectForm({ name: "", code: "" });
                        setSubjectModalOpen(true);
                      }}
                      className="btn btn-primary text-xs py-1.5 px-3"
                    >
                      <Plus size={14} /> Add Subject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClassForm({
                          name: selectedClass.name,
                          stream: selectedClass.stream,
                          sectionsText: selectedClass.sections.join(", "),
                        });
                        setClassModal({ editing: selectedClass });
                      }}
                      className="btn btn-ghost border border-slate-200 text-xs py-1.5 px-2.5"
                      title="Edit class name, stream, or sections"
                    >
                      <Pencil size={14} /> Edit Class
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteClass(selectedClass)}
                      className="btn btn-ghost border border-slate-200 text-red-600 hover:bg-red-50 text-xs py-1.5 px-2.5"
                      title="Remove class"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Subject Chips inside Selected Class */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Subjects in {selectedClass.name} ({classSubjects.length})
                  </div>

                  {classSubjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-2">
                      <p className="text-sm font-semibold text-slate-800">
                        No subjects added to {selectedClass.name} yet
                      </p>
                      <p className="text-xs text-slate-500">
                        Add subjects (e.g. Mathematics, Science, English, Hindi) to organize textbooks and exam blueprints.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubject(null);
                          setSubjectForm({ name: "", code: "" });
                          setSubjectModalOpen(true);
                        }}
                        className="btn btn-primary text-xs mt-1"
                      >
                        <Plus size={14} /> Add First Subject
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {classSubjects.map((sub) => {
                        const isSelected = activeSubject?.name === sub.name;
                        const subBookCount = sessionBooks.filter(
                          (b) =>
                            b.className.trim().toLowerCase() === selectedClass.name.trim().toLowerCase() &&
                            subjectMatches(b.subject, sub.name)
                        ).length;

                        return (
                          <div
                            key={sub.name}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedSubjectName(sub.name)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedSubjectName(sub.name);
                              }
                            }}
                            className={`group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold cursor-pointer transition ${
                              isSelected
                                ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/60 text-indigo-950 shadow-2xs"
                                : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white"
                            }`}
                          >
                            <span>{sub.name}</span>
                            {sub.code && (
                              <span
                                className={`rounded px-1.5 py-0.2 font-mono text-[10px] ${
                                  isSelected ? "bg-indigo-100 text-indigo-700 font-bold" : "bg-slate-200/80 text-slate-700"
                                }`}
                              >
                                {sub.code}
                              </span>
                            )}
                            <span
                              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                                isSelected ? "bg-indigo-200/70 text-indigo-900" : "bg-slate-200 text-slate-600"
                              }`}
                              title={`${plural(subBookCount, "textbook")} configured`}
                            >
                              {subBookCount} {subBookCount === 1 ? "book" : "books"}
                            </span>

                            {sub.id && (
                              <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSubject(sub as ClassSubjectDto);
                                    setSubjectForm({ name: sub.name, code: sub.code });
                                    setSubjectModalOpen(true);
                                  }}
                                  className={`rounded p-0.5 hover:bg-black/10 ${
                                    isSelected ? "text-slate-300 hover:text-white" : "text-slate-400 hover:text-slate-800"
                                  }`}
                                  title="Edit subject"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void deleteSubject(sub.id, sub.name);
                                  }}
                                  className="rounded p-0.5 text-red-500 hover:bg-red-500/10"
                                  title="Remove subject"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Connected Curriculum & Assessment Workspaces (Non-duplicated Gateways) */}
              {activeSubject && (
                <div className="card p-5 space-y-4 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Curriculum &amp; Assessment Gateways
                      </span>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                        <Layers size={17} className="text-slate-700" />
                        {selectedClass.name} · {activeSubject.name}
                        {activeSubject.code && (
                          <span className="font-mono text-xs text-slate-500 font-normal">
                            ({activeSubject.code})
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Select a workspace below to manage its content in its dedicated studio.
                    </div>
                  </div>

                  {/* 4 Clean Gateways in a 2x2 Grid */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Gateway 1: Books & Syllabus */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3 hover:border-slate-300 hover:bg-white transition">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                          <BookOpen size={16} className="text-indigo-600" />
                          Textbooks &amp; Syllabus
                        </div>
                        <p className="text-xs text-slate-600">
                          {subjectBooks.length > 0 ? (
                            <>
                              <strong>{plural(subjectBooks.length, "textbook")}</strong> with{" "}
                              <strong>{plural(totalSubjectChapters, "chapter")}</strong> configured.
                            </>
                          ) : (
                            "No textbooks or chapters configured for this subject yet."
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/books?className=${encodeURIComponent(selectedClass.name)}&subject=${encodeURIComponent(activeSubject.name)}`}
                        className="btn btn-ghost border border-slate-200 bg-white text-xs py-1.5 px-3 self-start font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5"
                      >
                        Open in Books &amp; Syllabus <ArrowRight size={13} />
                      </Link>
                    </div>

                    {/* Gateway 2: Question Bank */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3 hover:border-slate-300 hover:bg-white transition">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                          <HelpCircle size={16} className="text-indigo-600" />
                          Question Bank
                        </div>
                        <p className="text-xs text-slate-600">
                          {totalSubjectQuestions > 0 ? (
                            <>
                              <strong>{plural(totalSubjectQuestions, "question")}</strong> authored across chapters in this subject.
                            </>
                          ) : (
                            "Author MCQs, Short/Long Answers, or import from CSV/AI."
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/questions?className=${encodeURIComponent(selectedClass.name)}&subject=${encodeURIComponent(activeSubject.name)}${subjectBooks[0] ? `&bookId=${subjectBooks[0].id}` : ""}`}
                        className="btn btn-ghost border border-slate-200 bg-white text-xs py-1.5 px-3 self-start font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5"
                      >
                        Open in Question Bank <ArrowRight size={13} />
                      </Link>
                    </div>

                    {/* Gateway 3: Exam Blueprints */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3 hover:border-slate-300 hover:bg-white transition">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                          <Ruler size={16} className="text-indigo-600" />
                          Exam Blueprints &amp; Quotas
                        </div>
                        <p className="text-xs text-slate-600">
                          {subjectBlueprints.length > 0 ? (
                            <>
                              <strong>{plural(subjectBlueprints.length, "blueprint")}</strong> active for Quarterly, Half-Yearly, or Annual exams.
                            </>
                          ) : (
                            "Define marks, section structures, and chapter quotas for this subject."
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/blueprints?className=${encodeURIComponent(selectedClass.name)}&subject=${encodeURIComponent(activeSubject.name)}`}
                        className="btn btn-ghost border border-slate-200 bg-white text-xs py-1.5 px-3 self-start font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5"
                      >
                        Open in Blueprints <ArrowRight size={13} />
                      </Link>
                    </div>

                    {/* Gateway 4: Exam Papers */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3 hover:border-slate-300 hover:bg-white transition">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                          <FileText size={16} className="text-indigo-600" />
                          Exam Papers
                        </div>
                        <p className="text-xs text-slate-600">
                          {subjectPapers.length > 0 ? (
                            <>
                              <strong>{plural(subjectPapers.length, "exam paper")}</strong> drafted or finalized for this subject.
                            </>
                          ) : (
                            "Draft question papers (Sets A, B, C) and print booklets."
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/papers?className=${encodeURIComponent(selectedClass.name)}&subject=${encodeURIComponent(activeSubject.name)}`}
                        className="btn btn-ghost border border-slate-200 bg-white text-xs py-1.5 px-3 self-start font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5"
                      >
                        Open in Exam Papers <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create / Edit Class */}
      {classModal !== null && (
        <Modal
          onClose={() => setClassModal(null)}
          title={classModal.editing ? `Edit ${classModal.editing.name}` : `Add Class (${activeSession})`}
          subtitle="Classes organize subjects, textbooks, blueprints, and question papers for the active academic session."
        >
          <form onSubmit={saveClass} className="space-y-4">
            <Field label="Class Name" helper="e.g. Nursery, LKG, UKG, Class 1, Class 10, Class 12">
              <input
                type="text"
                className="input"
                placeholder="Nursery or Class 10"
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                required
                autoFocus
              />
            </Field>

            <Field label="Stream (Optional)" helper="e.g. Pre-Primary, Primary, Middle, Secondary, Senior Secondary, Science, Commerce">
              <input
                type="text"
                className="input"
                placeholder="Pre-Primary"
                value={classForm.stream}
                onChange={(e) => setClassForm({ ...classForm, stream: e.target.value })}
              />
            </Field>

            <Field label="Sections" helper="Comma-separated section names; defaults to a single section A (e.g. A, or A, B, C)">
              <input
                type="text"
                className="input"
                placeholder="A"
                value={classForm.sectionsText}
                onChange={(e) => setClassForm({ ...classForm, sectionsText: e.target.value })}
                required
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setClassModal(null)} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {classModal.editing ? "Save Changes" : "Create Class"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Add / Edit Subject */}
      {subjectModalOpen && selectedClass && (
        <Modal
          onClose={() => {
            setSubjectModalOpen(false);
            setEditingSubject(null);
          }}
          title={editingSubject ? `Edit Subject in ${selectedClass.name}` : `Add Subject to ${selectedClass.name}`}
          subtitle="Subjects link textbooks, chapter syllabus, and examination blueprints."
        >
          <form onSubmit={saveSubject} className="space-y-4">
            <Field label="Subject Name" helper="e.g. Science, Mathematics, English Language & Literature">
              <input
                type="text"
                className="input"
                placeholder="Science"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                required
                autoFocus
              />
            </Field>

            <Field label="Subject Code (Optional)" helper="CBSE/State Board official code, e.g. 086 for Science, 041 for Mathematics">
              <input
                type="text"
                className="input font-mono"
                placeholder="086"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubjectModalOpen(false);
                  setEditingSubject(null);
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {editingSubject ? "Save Subject" : "Add Subject"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Unified Academic Session Rollover */}
      {rolloverModalOpen && (
        <AcademicRolloverModal
          currentSession={currentSession}
          availableSessions={availableSessions}
          onClose={() => setRolloverModalOpen(false)}
          onSuccess={(targetSession) => {
            setRolloverModalOpen(false);
            setSession(targetSession);
            void load();
          }}
        />
      )}
    </div>
  );
}
