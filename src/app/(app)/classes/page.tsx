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

      {/* Academic Session & Stream Filter Bar (Matching Books & Syllabus) */}
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
              ({classes.length} {classes.length === 1 ? "class" : "classes"} configured)
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
            <Link
              href="/books"
              className="hover:text-slate-950 inline-flex items-center gap-1"
            >
              <BookOpen size={14} /> Textbooks &amp; Syllabus
            </Link>
            <Link
              href="/blueprints"
              className="hover:text-slate-950 inline-flex items-center gap-1"
            >
              <Ruler size={14} /> Exam Blueprints
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Stream:</span>
              <select
                className="input py-1 px-2.5 text-xs w-44"
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
              >
                <option value="ALL">All Streams ({availableStreams.length})</option>
                {availableStreams.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Search:</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Find class..."
                  className="input py-1 pl-7 pr-2.5 text-xs w-44"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong>{displayedClasses.length}</strong> of {classes.length} classes
          </div>
        </div>
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
        <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          {/* LEFT COLUMN: Class Directory */}
          <ul className="space-y-2" aria-label="Classes Directory">
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
                <li key={cls.id}>
                  <div
                    className={`group relative rounded-2xl border bg-white p-4 transition ${
                      active ? "border-indigo-500 ring-3 ring-indigo-500/15" : "border-slate-200 hover:border-slate-300"
                    }`}
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setSelectedSubjectName(null);
                      }}
                      aria-pressed={active}
                      className="block w-full rounded-lg text-left after:absolute after:inset-0 after:rounded-2xl"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="block font-semibold leading-snug text-slate-900 truncate">{cls.name}</span>
                        {cls.stream && (
                          <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 whitespace-nowrap">
                            {cls.stream}
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 block text-sm text-slate-600">
                        {cls.sections.length === 1 ? `Section ${cls.sections[0]}` : `Sections: ${cls.sections.join(", ")}`}
                      </span>
                      <span className="mt-2 block text-xs text-slate-500">
                        {plural(cls.subjects.length, "subject")} · {plural(clsBooks.length, "book")} · {plural(clsBps.length, "blueprint")} · {plural(clsPapers.length, "paper")}
                      </span>
                    </button>
                    <div className="absolute right-2.5 top-2.5 z-10 flex gap-0.5 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 bg-white/95 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Edit class"
                        aria-label={`Edit ${cls.name}`}
                        onClick={() => {
                          setClassForm({
                            name: cls.name,
                            stream: cls.stream,
                            sectionsText: cls.sections.join(", "),
                          });
                          setClassModal({ editing: cls });
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm hover:bg-red-50 hover:text-red-700"
                        title="Delete class"
                        aria-label={`Delete ${cls.name}`}
                        onClick={() => deleteClass(cls)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* RIGHT COLUMN: Selected Class Configuration & Relational Workspaces */}
          {selectedClass && (
            <div className="space-y-6">
              {/* Card 1: Class Details & Subject Roster */}
              <div className="card p-5 space-y-4 bg-white">
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
