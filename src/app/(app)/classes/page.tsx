"use client";

import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
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
  Users,
  X,
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
import { sortClassNames } from "@/lib/constants";
import { plural } from "@/lib/format";
import {
  EDUCATIONAL_STAGES,
  getEducationalStage,
  getMissingStandardSubjects,
  getStandardPresetForClass,
  STANDARD_SCHOOL_CLASSES,
} from "@/lib/schoolCurriculum";
import type {
  AcademicClassDto,
  Blueprint,
  Book,
  ClassSubjectDto,
  PaperListItem,
  SectionDetail,
} from "@/lib/types";

function subjectMatches(bookSubject: string, classSubjectName: string): boolean {
  const a = bookSubject.trim().toLowerCase();
  const b = classSubjectName.trim().toLowerCase();
  if (a === b) return true;
  const aParts = a.split("/").map((s) => s.trim());
  const bParts = b.split("/").map((s) => s.trim());
  return aParts.some((p) => bParts.includes(p));
}

function SectionRosterItem({
  sec,
  isAdmin,
  disabled,
  canRemove,
  onSaveCount,
  onRemove,
}: {
  sec: SectionDetail;
  isAdmin: boolean;
  disabled: boolean;
  canRemove: boolean;
  onSaveCount: (count: number) => void;
  onRemove: () => void;
}) {
  const [val, setVal] = useState(String(sec.studentCount));

  useEffect(() => {
    setVal(String(sec.studentCount));
  }, [sec.studentCount]);

  const commitChange = () => {
    const parsed = parseInt(val, 10);
    const valid = Number.isFinite(parsed) ? Math.max(1, Math.min(500, parsed)) : sec.studentCount;
    if (valid !== sec.studentCount) {
      onSaveCount(valid);
    } else {
      setVal(String(sec.studentCount));
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs">
      <span className="text-slate-700">Section {sec.name}</span>
      {isAdmin ? (
        <div className="inline-flex items-center gap-1 pl-1 border-l border-slate-200">
          <input
            type="number"
            min={1}
            max={500}
            value={val}
            disabled={disabled}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commitChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-14 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-center font-mono font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            title={`Enrollment capacity for Section ${sec.name} (1–500 students)`}
            aria-label={`Enrollment capacity for Section ${sec.name}`}
          />
          <span className="text-[11px] font-normal text-slate-500">students</span>
        </div>
      ) : (
        <span className="text-slate-500 font-normal border-l border-slate-200 pl-1.5">
          <strong className="font-semibold text-slate-700">{sec.studentCount}</strong> students
        </span>
      )}
      {isAdmin && canRemove && (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="text-slate-400 hover:text-red-600 transition ml-1"
          title={`Remove Section ${sec.name}`}
          aria-label={`Remove Section ${sec.name}`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

export default function ClassesHierarchyPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { currentSession, setSession, availableSessions } = useAcademicSession();

  const [classes, setClasses] = useState<AcademicClassDto[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [subjectQuery, setSubjectQuery] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"directory" | "details">("directory");

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
      const [cls, bks, bps, pps, me] = await Promise.all([
        api<AcademicClassDto[]>(`/api/classes?session=${encodeURIComponent(activeSession)}`),
        api<Book[]>("/api/books"),
        api<Blueprint[]>("/api/blueprints"),
        api<PaperListItem[]>("/api/papers"),
        api<{ id: string; name: string; email: string; role: string }>("/api/me").catch(() => null),
      ]);
      setClasses(cls);
      setBooks(bks);
      setBlueprints(bps);
      setPapers(pps);
      if (me) setCurrentUser(me);
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

  // Filter classes by educational stage & search
  const displayedClasses = useMemo(() => {
    return classes.filter((c) => {
      const classStage = getEducationalStage(c.name, c.stream);
      if (stageFilter !== "ALL" && classStage.toLowerCase() !== stageFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchStage = classStage.toLowerCase().includes(q);
        const matchSub = c.subjects.some(
          (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
        );
        if (!matchName && !matchStage && !matchSub) return false;
      }
      return true;
    });
  }, [classes, stageFilter, searchQuery]);

  const selectedClass = useMemo(
    () => displayedClasses.find((c) => c.id === selectedClassId) ?? displayedClasses[0] ?? classes[0] ?? null,
    [displayedClasses, classes, selectedClassId]
  );

  const handleSelectClass = useCallback((clsId: string) => {
    setSelectedClassId(clsId);
    setMobileTab("details");
    if (typeof window !== "undefined") {
      const el = document.getElementById("class-workspace-card");
      if (el && window.innerWidth < 1024) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  // Registered ClassSubjects + any subjects present in existing books for this class
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

  // Filter subjects within selected class by search input
  const filteredClassSubjects = useMemo(() => {
    if (!subjectQuery.trim()) return classSubjects;
    const q = subjectQuery.trim().toLowerCase();
    return classSubjects.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q))
    );
  }, [classSubjects, subjectQuery]);

  // Standard missing subjects that can be quickly added
  const missingStandardSubjects = useMemo(() => {
    if (!selectedClass) return [];
    return getMissingStandardSubjects(
      selectedClass.name,
      classSubjects.map((s) => s.name)
    );
  }, [selectedClass, classSubjects]);

  // Overall class curriculum statistics
  const classStats = useMemo(() => {
    if (!selectedClass) {
      return { totalSubjects: 0, booksCount: 0, blueprintsCount: 0, papersCount: 0, questionsCount: 0 };
    }
    const cBooks = sessionBooks.filter(
      (b) => b.className.trim().toLowerCase() === selectedClass.name.trim().toLowerCase()
    );
    const bookIdSet = new Set(cBooks.map((b) => b.id));
    const cBlueprints = sessionBlueprints.filter((bp) => bookIdSet.has(bp.bookId));
    const cPapers = sessionPapers.filter(
      (p) => p.blueprint.book.className.trim().toLowerCase() === selectedClass.name.trim().toLowerCase()
    );
    const questionsCount = cBooks.reduce((sum, b) => sum + (b._count?.questions || 0), 0);

    return {
      totalSubjects: classSubjects.length,
      booksCount: cBooks.length,
      blueprintsCount: cBlueprints.length,
      papersCount: cPapers.length,
      questionsCount,
    };
  }, [selectedClass, sessionBooks, sessionBlueprints, sessionPapers, classSubjects]);

  const selectedClassSections = useMemo((): SectionDetail[] => {
    if (!selectedClass) return [];
    if (selectedClass.sectionDetails && selectedClass.sectionDetails.length > 0) {
      return selectedClass.sectionDetails;
    }
    return (selectedClass.sections || ["A"]).map((s) => ({ name: s, studentCount: 40 }));
  }, [selectedClass]);

  const selectedClassTotalEnrollment = useMemo(() => {
    return selectedClassSections.reduce((sum, s) => sum + s.studentCount, 0);
  }, [selectedClassSections]);

  // Subject matrix metadata mapper
  const subjectMetadata = useMemo(() => {
    if (!selectedClass) return new Map<string, { books: Book[]; blueprints: Blueprint[]; papers: PaperListItem[]; questions: number }>();
    const map = new Map<string, { books: Book[]; blueprints: Blueprint[]; papers: PaperListItem[]; questions: number }>();

    for (const sub of classSubjects) {
      const sBooks = sessionBooks.filter(
        (b) =>
          b.className.trim().toLowerCase() === selectedClass.name.trim().toLowerCase() &&
          subjectMatches(b.subject, sub.name)
      );
      const sBookIds = new Set(sBooks.map((b) => b.id));
      const sBlueprints = sessionBlueprints.filter((bp) => sBookIds.has(bp.bookId));
      const sPapers = sessionPapers.filter(
        (p) =>
          p.blueprint.book.className.trim().toLowerCase() === selectedClass.name.trim().toLowerCase() &&
          subjectMatches(p.blueprint.book.subject, sub.name)
      );
      const questions = sBooks.reduce((acc, b) => acc + (b._count?.questions || 0), 0);

      map.set(sub.name, {
        books: sBooks,
        blueprints: sBlueprints,
        papers: sPapers,
        questions,
      });
    }
    return map;
  }, [selectedClass, classSubjects, sessionBooks, sessionBlueprints, sessionPapers]);

  const isAdmin = currentUser?.role === "ADMIN";

  // Direct Section Actions
  async function addSectionToClass(cls: AcademicClassDto) {
    if (!isAdmin) return;
    const existing = cls.sectionDetails && cls.sectionDetails.length > 0
      ? cls.sectionDetails
      : (cls.sections || ["A"]).map((s) => ({ name: s, studentCount: 40 }));
    const existingNames = existing.map((s) => s.name);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let nextLetter = "A";
    for (let i = 0; i < alphabet.length; i++) {
      if (!existingNames.includes(alphabet[i])) {
        nextLetter = alphabet[i];
        break;
      }
    }
    const nextSections = [...existing, { name: nextLetter, studentCount: 40 }];
    setBusy(true);
    setError(null);
    try {
      await api(`/api/classes/${cls.id}`, {
        method: "PATCH",
        json: { sections: nextSections },
      });
      toast.success(`Added Section ${nextLetter} to ${cls.name}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeSectionFromClass(cls: AcademicClassDto, secToRemove: string) {
    if (!isAdmin) return;
    const current = cls.sectionDetails && cls.sectionDetails.length > 0
      ? cls.sectionDetails
      : (cls.sections || ["A"]).map((s) => ({ name: s, studentCount: 40 }));
    if (current.length <= 1) {
      toast.error("A class must maintain at least one active section.");
      return;
    }
    const ok = await confirm({
      title: `Remove Section ${secToRemove}?`,
      message: `Remove Section ${secToRemove} from ${cls.name}?`,
      confirmLabel: "Remove Section",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const nextSections = current.filter((s) => s.name !== secToRemove);
      await api(`/api/classes/${cls.id}`, {
        method: "PATCH",
        json: { sections: nextSections },
      });
      toast.success(`Removed Section ${secToRemove}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function updateSectionStudentCount(cls: AcademicClassDto, secName: string, newCount: number) {
    if (!isAdmin) return;
    const count = Math.max(1, Math.min(500, Math.floor(newCount) || 40));
    const current = cls.sectionDetails && cls.sectionDetails.length > 0
      ? cls.sectionDetails
      : (cls.sections || ["A"]).map((s) => ({ name: s, studentCount: 40 }));
    const nextSections = current.map((sec) =>
      sec.name === secName ? { ...sec, studentCount: count } : sec
    );
    setBusy(true);
    setError(null);
    try {
      await api(`/api/classes/${cls.id}`, {
        method: "PATCH",
        json: { sections: nextSections },
      });
      toast.success(`Updated Section ${secName} enrollment (${count} students)`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addMissingStandardSubjects() {
    if (!isAdmin || !selectedClass || missingStandardSubjects.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await Promise.all(
        missingStandardSubjects.map((s) =>
          api(`/api/classes/${selectedClass.id}/subjects`, {
            method: "POST",
            json: { name: s.name, code: s.code },
          })
        )
      );
      toast.success(
        `Added ${missingStandardSubjects.length} standard subjects to ${selectedClass.name}`
      );
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function seedStandardClasses() {
    if (!isAdmin) return;
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
    if (!isAdmin) return;
    if (!classForm.name.trim()) return;
    setBusy(true);
    setError(null);
    const parsedSections = classForm.sectionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((part) => {
        const match = part.match(/^([A-Za-z0-9_-]+)(?:[:=]\s*(\d+))?$/);
        if (match) {
          const name = match[1];
          const studentCount = match[2] ? parseInt(match[2], 10) : 40;
          return { name, studentCount: Math.max(1, Math.min(500, studentCount)) };
        }
        return { name: part, studentCount: 40 };
      });
    const sections =
      parsedSections.length > 0 ? parsedSections : [{ name: "A", studentCount: 40 }];
    try {
      if (classModal?.editing) {
        await api(`/api/classes/${classModal.editing.id}`, {
          method: "PATCH",
          json: {
            name: classForm.name.trim(),
            stream: classForm.stream.trim(),
            sections,
          },
        });
        toast.success(`Updated ${classForm.name.trim()}`);
      } else {
        const created = await api<AcademicClassDto>("/api/classes", {
          method: "POST",
          json: {
            name: classForm.name.trim(),
            stream: classForm.stream.trim(),
            sections,
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
    if (!isAdmin) return;
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
    if (!isAdmin) return;
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
    if (!isAdmin) return;
    if (!selectedClass) return;
    if (!subjectId) {
      toast.error("This subject was imported from existing textbooks and cannot be deleted here.");
      return;
    }
    const ok = await confirm({
      title: `Remove ${subjectName || "Subject"}?`,
      message: `Remove this subject from ${selectedClass.name}? Textbooks and questions already saved under this subject remain safe.`,
      confirmLabel: "Remove Subject",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await api(`/api/classes/${selectedClass.id}/subjects/${subjectId}`, { method: "DELETE" });
      toast.success(`Removed subject ${subjectName}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* 1. INSTITUTIONAL PAGE HEADER */}
      <PageHeader
        title="Curriculum & Classes Studio"
        description={`Institutional class grades, section configurations, and board subject rosters for Academic Session ${activeSession}.`}
        actions={
          isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={seedStandardClasses}
                className="btn btn-ghost border border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100 shadow-2xs font-medium text-xs sm:text-sm"
                title="Initialize standard school classes (Nursery to Class 12) with foundational & CBSE/NCERT subjects"
              >
                <Sparkles size={15} className="text-amber-600" />
                <span>Initialize Nursery–12th</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRolloverModalOpen(true)}
                className="btn btn-ghost border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs text-xs sm:text-sm"
                title="Rollover classes, syllabus, and blueprints into a new academic year"
              >
                <RotateCcw size={15} />
                <span>Rollover Session</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setClassForm({ name: "", stream: "", sectionsText: "A" });
                  setClassModal({ editing: null });
                }}
                className="btn btn-primary text-xs sm:text-sm"
              >
                <Plus size={16} />
                <span>Add Class</span>
              </button>
            </div>
          ) : null
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* 2. INSTITUTIONAL CONTEXT & WORKSPACE NAV PILLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-xs text-slate-600 shadow-xs min-w-0 max-w-full">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Calendar size={14} className="text-indigo-600" /> Active Academic Session:
          </span>
          <span className="badge !bg-slate-900 !text-white font-mono px-2.5 py-0.5 text-xs">
            {activeSession}
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="font-medium text-slate-700">
            <strong>{classes.length}</strong> classes configured across{" "}
            <strong>
              {classes.reduce((sum, c) => sum + (c.sections?.length || 1), 0)}
            </strong>{" "}
            sections
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-700">
          <Link
            href="/books"
            className="hover:text-indigo-600 inline-flex items-center gap-1.5 transition"
            title="Browse all textbooks & syllabus"
          >
            <BookOpen size={14} className="text-slate-400" /> Textbooks ({sessionBooks.length})
          </Link>
          <span className="text-slate-200">·</span>
          <Link
            href="/blueprints"
            className="hover:text-indigo-600 inline-flex items-center gap-1.5 transition"
            title="Browse all exam blueprints"
          >
            <Ruler size={14} className="text-slate-400" /> Blueprints ({sessionBlueprints.length})
          </Link>
          <span className="text-slate-200">·</span>
          <Link
            href="/papers"
            className="hover:text-indigo-600 inline-flex items-center gap-1.5 transition"
            title="Browse all exam papers"
          >
            <FileText size={14} className="text-slate-400" /> Papers ({sessionPapers.length})
          </Link>
        </div>
      </div>

      {/* 3. MOBILE MASTER-DETAIL TABS (< lg screens) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl lg:hidden min-w-0 max-w-full">
        <button
          type="button"
          onClick={() => setMobileTab("directory")}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition min-w-0 ${
            mobileTab === "directory"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <GraduationCap size={15} className="shrink-0" />
          <span className="truncate">Classes ({displayedClasses.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("details")}
          disabled={!selectedClass}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition min-w-0 ${
            mobileTab === "details"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers size={15} className="shrink-0" />
          <span className="truncate">{selectedClass ? `${selectedClass.name} Workspace` : "Class Details"}</span>
        </button>
      </div>

      {!loaded ? (
        <ListSkeleton rows={5} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={`No classes configured for Session ${activeSession}`}
          description="Initialize all 15 institutional grades from Nursery to Class 12 with standard CBSE/State Board subjects, or configure classes manually."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={seedStandardClasses} className="btn btn-primary">
                <Sparkles size={16} /> Initialize Nursery–12th
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
      ) : (
        /* 4. MAIN RESPONSIVE TWO-COLUMN COMMAND CENTER */
        <div className="grid min-w-0 max-w-full items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
          {/* ======================================================== */}
          {/* LEFT COLUMN: Educational Stages Directory (Sticky)     */}
          {/* ======================================================== */}
          <aside
            className={`min-w-0 max-w-full lg:sticky lg:top-6 lg:max-h-[calc(100vh-3.5rem)] flex-col rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden ${
              mobileTab === "details" ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Header: Title & Quick Class Search */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                    <GraduationCap size={15} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Directory
                  </span>
                  <span className="badge !bg-slate-200/80 !text-slate-800 text-[10px] font-mono px-1.5 py-0.2">
                    {displayedClasses.length}/{classes.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setClassForm({ name: "", stream: "", sectionsText: "A" });
                    setClassModal({ editing: null });
                  }}
                  className="btn btn-primary text-[11px] py-1 px-2.5 gap-1 shrink-0"
                  title="Add new class"
                >
                  <Plus size={13} /> Add Class
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search class or subject..."
                  className="input py-1.5 pl-8 pr-7 text-xs w-full bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
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

              {/* Educational Stages Filter Segment */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
                {EDUCATIONAL_STAGES.map((st) => {
                  const active = stageFilter.toLowerCase() === st.id.toLowerCase();
                  const count =
                    st.id === "ALL"
                      ? classes.length
                      : classes.filter((c) => getEducationalStage(c.name, c.stream).toLowerCase() === st.id.toLowerCase()).length;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStageFilter(st.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                        active
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                      title={st.sublabel}
                    >
                      {st.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Class Grade Items */}
            <ul
              className="overflow-y-auto overscroll-contain flex-1 p-2 space-y-1 focus:outline-none"
              aria-label="Classes List"
            >
              {displayedClasses.length === 0 ? (
                <li className="p-4 text-center text-xs text-slate-500">
                  No classes match current filter.
                </li>
              ) : (
                displayedClasses.map((cls) => {
                  const active = selectedClass?.id === cls.id;
                  const stage = getEducationalStage(cls.name, cls.stream);
                  const clsBooks = sessionBooks.filter(
                    (b) => b.className.trim().toLowerCase() === cls.name.trim().toLowerCase()
                  );
                  const isReady = cls.subjects.length > 0 && clsBooks.length > 0;

                  return (
                    <li key={cls.id}>
                      <div
                        className={`group relative rounded-xl border transition ${
                          active
                            ? "bg-indigo-50/90 border-indigo-400 ring-1 ring-indigo-500/20 shadow-2xs text-indigo-950"
                            : "border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-800"
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
                            <span
                              className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.2 text-[10px] font-medium whitespace-nowrap ${
                                active ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {stage}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1 font-mono text-slate-600">
                              <span>Sec {cls.sections.join(", ")}</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              <span>{plural(cls.subjects.length, "subject")}</span>
                              <span
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                  isReady ? "bg-emerald-500" : "bg-amber-400"
                                }`}
                                title={isReady ? "Syllabus configured" : "Setup needed"}
                              />
                            </div>
                          </div>
                        </button>

                        {/* Hover Quick Edit / Delete */}
                        <div className="absolute right-2 top-2 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-white/95 rounded-lg p-0.5 shadow-2xs border border-slate-200/60">
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-xs p-1"
                            title={`Edit ${cls.name}`}
                            aria-label={`Edit ${cls.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setClassForm({
                                name: cls.name,
                                stream: cls.stream,
                                sectionsText:
                                  cls.sectionDetails && cls.sectionDetails.length > 0
                                    ? cls.sectionDetails
                                        .map((s) => `${s.name}: ${s.studentCount}`)
                                        .join(", ")
                                    : cls.sections.join(", "),
                              });
                              setClassModal({ editing: cls });
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-xs p-1 hover:bg-red-50 hover:text-red-700"
                            title={`Delete ${cls.name}`}
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
                })
              )}
            </ul>
          </aside>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: The Class & Curriculum Command Center     */}
          {/* ======================================================== */}
          {selectedClass && (
            <main
              id="class-workspace-card"
              className={`min-w-0 max-w-full space-y-6 ${mobileTab === "directory" ? "hidden lg:block" : "block"}`}
            >
              {/* Mobile Back Button */}
              <div className="lg:hidden flex items-center justify-between gap-2 pb-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileTab("directory")}
                  className="btn btn-ghost border border-slate-200 text-xs py-1.5 px-3 inline-flex items-center gap-1.5 font-semibold text-slate-800 shrink-0"
                >
                  ← Back to Directory
                </button>
                <span className="text-xs text-slate-500 font-medium truncate">
                  Active: <strong>{selectedClass.name}</strong>
                </span>
              </div>

              {/* CARD 1: Class Identity & Sections Manager */}
              <section className="card min-w-0 max-w-full p-4 sm:p-6 bg-white space-y-5 border-slate-200/90 overflow-hidden">
                {/* Header Row: Title, Stream, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
                        {selectedClass.name}
                      </h2>
                      <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                        {getEducationalStage(selectedClass.name, selectedClass.stream)}
                      </span>
                      {selectedClass.stream && (
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {selectedClass.stream}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl">
                      Configure board subjects, syllabus textbooks, and question paper quotas for{" "}
                      <strong>{selectedClass.name}</strong> in Session {activeSession}.
                    </p>
                  </div>

                  {/* Primary Class Actions */}
                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubject(null);
                          setSubjectForm({ name: "", code: "" });
                          setSubjectModalOpen(true);
                        }}
                        className="btn btn-primary text-xs py-1.5 px-2.5 sm:px-3"
                      >
                        <Plus size={14} /> Add Subject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClassForm({
                            name: selectedClass.name,
                            stream: selectedClass.stream,
                            sectionsText:
                              selectedClass.sectionDetails &&
                              selectedClass.sectionDetails.length > 0
                                ? selectedClass.sectionDetails
                                    .map((s) => `${s.name}: ${s.studentCount}`)
                                    .join(", ")
                                : selectedClass.sections.join(", "),
                          });
                          setClassModal({ editing: selectedClass });
                        }}
                        className="btn btn-ghost border border-slate-200 text-xs py-1.5 px-2.5 sm:px-3"
                        title="Edit class name or stream"
                      >
                        <Pencil size={13} /> Edit Class
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteClass(selectedClass)}
                        className="btn btn-ghost border border-slate-200 text-red-600 hover:bg-red-50 text-xs py-1.5 px-2"
                        title="Delete class"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Interactive Sections Roster */}
                <div className="flex flex-col gap-3 bg-slate-50/70 rounded-xl p-3 border border-slate-100 min-w-0 max-w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider text-[11px] shrink-0">
                        Active Sections:
                      </span>
                      {/* Total Enrollment Summary Chip */}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800 shrink-0 shadow-2xs">
                        <Users size={12} className="text-indigo-600" />
                        <span>
                          Total: {selectedClassTotalEnrollment} students across {selectedClassSections.length} section{selectedClassSections.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => addSectionToClass(selectedClass)}
                        className="btn btn-ghost border border-slate-200 bg-white text-xs py-1 px-2.5 text-indigo-700 hover:bg-indigo-50 font-semibold shrink-0 self-start sm:self-auto"
                        title="Add sequential next section (e.g. Section B)"
                      >
                        <Plus size={13} /> Add Section
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {selectedClassSections.map((sec) => (
                      <SectionRosterItem
                        key={sec.name}
                        sec={sec}
                        isAdmin={isAdmin}
                        disabled={busy}
                        canRemove={selectedClassSections.length > 1}
                        onSaveCount={(newCount) => updateSectionStudentCount(selectedClass, sec.name, newCount)}
                        onRemove={() => removeSectionFromClass(selectedClass, sec.name)}
                      />
                    ))}
                  </div>
                </div>

                {/* Class Health Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Subjects
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900 font-display">
                        {classStats.totalSubjects}
                      </span>
                      <span className="text-xs text-slate-500">enrolled</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Textbooks
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900 font-display">
                        {classStats.booksCount}
                      </span>
                      <span className="text-xs text-slate-500">syllabus</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Blueprints
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900 font-display">
                        {classStats.blueprintsCount}
                      </span>
                      <span className="text-xs text-slate-500">quotas</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Questions
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900 font-display">
                        {classStats.questionsCount}
                      </span>
                      <span className="text-xs text-slate-500">bank</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* CARD 2: Unified Subject Curriculum Roster (The Master Matrix) */}
              <section className="card min-w-0 max-w-full p-4 sm:p-6 bg-white space-y-4 border-slate-200/90 overflow-hidden">
                {/* Header: Title, Search, and Auto-Add Missing Standard Subjects */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 min-w-0">
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen size={17} className="text-indigo-600 shrink-0" />
                      <span className="truncate">Curriculum Subjects Roster</span>
                      <span className="badge !bg-slate-100 !text-slate-800 text-xs font-mono shrink-0">
                        {classSubjects.length}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      View all subjects taught in {selectedClass.name} with connected textbooks, blueprints, and question bank assets.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {/* Auto-add missing standard subjects prompt */}
                    {isAdmin && missingStandardSubjects.length > 0 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={addMissingStandardSubjects}
                        className="btn btn-ghost border border-indigo-200 bg-indigo-50/70 text-indigo-800 hover:bg-indigo-100 text-xs py-1.5 px-2.5 sm:px-3 font-semibold shadow-2xs"
                        title={`Add missing standard board subjects: ${missingStandardSubjects.map((s) => s.name).join(", ")}`}
                      >
                        <Sparkles size={13} className="text-indigo-600 shrink-0" />
                        <span>Add Standard Subjects ({missingStandardSubjects.length})</span>
                      </button>
                    )}

                    {/* Filter subjects input */}
                    <div className="relative w-full sm:w-56">
                      <input
                        type="text"
                        placeholder="Filter subjects..."
                        className="input py-1 pl-7 pr-6 text-xs w-full bg-slate-50 focus:bg-white"
                        value={subjectQuery}
                        onChange={(e) => setSubjectQuery(e.target.value)}
                      />
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      {subjectQuery && (
                        <button
                          type="button"
                          onClick={() => setSubjectQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Empty State when no subjects exist */}
                {classSubjects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 sm:p-8 text-center space-y-3 min-w-0">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        No subjects added to {selectedClass.name} yet
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Add subjects (e.g. Mathematics, Science, English, Hindi) to organize syllabus chapters and build question papers.
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        {missingStandardSubjects.length > 0 && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={addMissingStandardSubjects}
                            className="btn btn-primary text-xs py-1.5 px-3.5"
                          >
                            <Sparkles size={14} /> Add Standard Subjects for {selectedClass.name}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubject(null);
                            setSubjectForm({ name: "", code: "" });
                            setSubjectModalOpen(true);
                          }}
                          className="btn btn-ghost border border-slate-300 bg-white text-xs py-1.5 px-3.5"
                        >
                          <Plus size={14} /> Add Custom Subject
                        </button>
                      </div>
                    )}
                  </div>
                ) : filteredClassSubjects.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No subjects match &quot;{subjectQuery}&quot;. Try clearing the search.
                  </div>
                ) : (
                  /* High-Density Responsive Curriculum Matrix Table */
                  <div className="space-y-1.5 min-w-0 max-w-full">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5 sm:hidden">
                      <span className="font-semibold text-slate-600">Subject Matrix</span>
                      <span className="text-[10px]">← Swipe table to see all columns →</span>
                    </div>
                    <div className="overflow-x-auto min-w-0 max-w-full rounded-xl border border-slate-200 scroll-thin overscroll-x-contain touch-pan-x">
                      <table className="w-full text-left border-collapse text-xs min-w-[36rem]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-2.5 px-3.5 min-w-[9.5rem]">Subject &amp; Code</th>
                            <th className="py-2.5 px-3 min-w-[10rem]">Textbooks &amp; Syllabus</th>
                            <th className="py-2.5 px-2.5 min-w-[6.5rem]">Question Bank</th>
                            <th className="py-2.5 px-2.5 min-w-[6.5rem]">Blueprints</th>
                            <th className="py-2.5 px-2.5 min-w-[5.5rem]">Papers</th>
                            {isAdmin && <th className="py-2.5 px-3 text-right w-16">Actions</th>}
                          </tr>
                        </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredClassSubjects.map((sub) => {
                          const meta = subjectMetadata.get(sub.name) || {
                            books: [],
                            blueprints: [],
                            papers: [],
                            questions: 0,
                          };

                          return (
                            <tr
                              key={sub.name}
                              className="hover:bg-slate-50/80 transition group"
                            >
                              {/* Subject & Official Code */}
                              <td className="py-3 px-3.5 align-middle">
                                <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                                  <span>{sub.name}</span>
                                </div>
                                {sub.code ? (
                                  <span className="mt-0.5 inline-block font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                    Code: {sub.code}
                                  </span>
                                ) : (
                                  <span className="mt-0.5 inline-block text-[10px] text-slate-400">
                                    No code set
                                  </span>
                                )}
                              </td>

                              {/* Textbooks & Chapters */}
                              <td className="py-3 px-3 align-middle">
                                {meta.books.length > 0 ? (
                                  <div className="space-y-1">
                                    {meta.books.map((b) => (
                                      <Link
                                        key={b.id}
                                        href={`/books?className=${encodeURIComponent(selectedClass.name)}&subject=${encodeURIComponent(sub.name)}`}
                                        className="inline-flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 font-medium transition"
                                        title={`View textbook ${b.title}`}
                                      >
                                        <BookOpen size={13} className="text-indigo-600 shrink-0" />
                                        <span className="truncate max-w-[13rem]">{b.title}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          ({plural(b.chapters.length, "ch")})
                                        </span>
                                      </Link>
                                    ))}
                                  </div>
                                ) : (
                                  <Link
                                    href={`/books?className=${encodeURIComponent(selectedClass.name)}&subject=${encodeURIComponent(sub.name)}&add=1`}
                                    className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium"
                                  >
                                    <span>+ Add Textbook</span>
                                  </Link>
                                )}
                              </td>

                              {/* Question Bank Assets */}
                              <td className="py-3 px-3 align-middle font-medium">
                                {meta.questions > 0 ? (
                                  <Link
                                    href={`/questions?className=${encodeURIComponent(selectedClass.name)}&subject=${encodeURIComponent(sub.name)}`}
                                    className="inline-flex items-center gap-1 text-slate-700 hover:text-indigo-600 transition"
                                  >
                                    <HelpCircle size={13} className="text-slate-400" />
                                    <span>{plural(meta.questions, "question")}</span>
                                  </Link>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">0 questions</span>
                                )}
                              </td>

                              {/* Blueprints */}
                              <td className="py-3 px-3 align-middle">
                                {meta.blueprints.length > 0 ? (
                                  <Link
                                    href={`/blueprints?className=${encodeURIComponent(selectedClass.name)}&subject=${encodeURIComponent(sub.name)}`}
                                    className="inline-flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-medium transition"
                                  >
                                    <Ruler size={13} className="text-indigo-600" />
                                    <span>{plural(meta.blueprints.length, "blueprint")}</span>
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/blueprints/new?className=${encodeURIComponent(selectedClass.name)}&subject=${encodeURIComponent(sub.name)}`}
                                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                                  >
                                    + Create
                                  </Link>
                                )}
                              </td>

                              {/* Papers */}
                              <td className="py-3 px-3 align-middle">
                                {meta.papers.length > 0 ? (
                                  <Link
                                    href={`/papers?className=${encodeURIComponent(selectedClass.name)}&subject=${encodeURIComponent(sub.name)}`}
                                    className="inline-flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-medium transition"
                                  >
                                    <FileText size={13} className="text-indigo-600" />
                                    <span>{plural(meta.papers.length, "paper")}</span>
                                  </Link>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">None</span>
                                )}
                              </td>

                              {/* Actions */}
                              {isAdmin && (
                                <td className="py-3 px-3 text-right align-middle whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1">
                                    {sub.id && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSubject(sub as ClassSubjectDto);
                                          setSubjectForm({ name: sub.name, code: sub.code });
                                          setSubjectModalOpen(true);
                                        }}
                                        className="btn btn-ghost btn-icon btn-xs p-1 text-slate-500 hover:text-slate-800"
                                        title="Edit Subject"
                                        aria-label={`Edit ${sub.name}`}
                                      >
                                        <Pencil size={13} />
                                      </button>
                                    )}
                                    {sub.id && (
                                      <button
                                        type="button"
                                        onClick={() => void deleteSubject(sub.id, sub.name)}
                                        className="btn btn-ghost btn-icon btn-xs p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"
                                        title="Remove Subject"
                                        aria-label={`Remove ${sub.name}`}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

              {/* CARD 3: Exam Workflow Launchpad */}
              <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-4 sm:p-5 space-y-3 min-w-0 max-w-full overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      Exam Workflow Actions for {selectedClass.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Jump straight into curriculum studios pre-filtered for this class grade.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 min-w-0">
                    <Link
                      href={`/books?className=${encodeURIComponent(selectedClass.name)}`}
                      className="btn btn-ghost border border-slate-300 bg-white text-xs py-1.5 px-2.5 font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs justify-center"
                    >
                      <BookOpen size={13} className="text-indigo-600 shrink-0" />
                      <span className="truncate">Textbooks</span>
                    </Link>
                    <Link
                      href={`/questions?className=${encodeURIComponent(selectedClass.name)}`}
                      className="btn btn-ghost border border-slate-300 bg-white text-xs py-1.5 px-2.5 font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs justify-center"
                    >
                      <HelpCircle size={13} className="text-indigo-600 shrink-0" />
                      <span className="truncate">Question Bank</span>
                    </Link>
                    <Link
                      href={`/blueprints?className=${encodeURIComponent(selectedClass.name)}`}
                      className="btn btn-ghost border border-slate-300 bg-white text-xs py-1.5 px-2.5 font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs justify-center"
                    >
                      <Ruler size={13} className="text-indigo-600 shrink-0" />
                      <span className="truncate">Blueprints</span>
                    </Link>
                    <Link
                      href={`/papers?className=${encodeURIComponent(selectedClass.name)}`}
                      className="btn btn-primary text-xs py-1.5 px-2.5 font-semibold shadow-2xs justify-center"
                    >
                      <FileText size={13} className="shrink-0" />
                      <span className="truncate">Draft Paper</span>
                    </Link>
                  </div>
                </div>
              </section>
            </main>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS: Class Create / Edit, Subject Create / Edit       */}
      {/* ======================================================== */}

      {/* Modal: Create / Edit Class */}
      {classModal !== null && (
        <Modal
          onClose={() => setClassModal(null)}
          title={classModal.editing ? `Edit ${classModal.editing.name}` : `Add Class (${activeSession})`}
          subtitle="Classes organize subjects, sections, textbooks, blueprints, and question papers for this session."
        >
          <form onSubmit={saveClass} className="space-y-4">
            <Field label="Class Name" helper="e.g. Nursery, LKG, UKG, Class 1, Class 10, Class 12">
              <input
                type="text"
                className="input"
                placeholder="Class 10"
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                required
                autoFocus
              />
            </Field>

            <Field
              label="Educational Stage / Stream"
              helper="e.g. Pre-Primary, Primary, Middle, Secondary, Senior Secondary"
            >
              <input
                type="text"
                className="input"
                placeholder="Secondary"
                value={classForm.stream}
                onChange={(e) => setClassForm({ ...classForm, stream: e.target.value })}
              />
            </Field>

            <Field
              label="Sections"
              helper="Comma-separated section letters (e.g. A, or A, B, C). Defaults to a single section 'A'."
            >
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
            <Field label="Subject Name" helper="e.g. Mathematics, Science, English Language & Literature">
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

            <Field
              label="Subject Code (Optional)"
              helper="CBSE or State Board official subject code (e.g. 086 for Science, 041 for Mathematics)"
            >
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
