"use client";

import { Calendar, Check, Copy, FileDown, FileText, GitCompare, GraduationCap, Lock, Plus, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PaperCompareModal } from "@/components/PaperCompareModal";
import { PaperImportModal } from "@/components/PaperImportModal";
import { PaperRow } from "@/components/PaperRow";
import { EmptyState, ErrorBanner, Field, ListSkeleton, Modal, PageHeader, Spinner, useConfirm, useToast } from "@/components/ui";
import { normalizeSession, useAcademicSession } from "@/lib/academicSession";
import { api } from "@/lib/client";
import { ACADEMIC_SESSIONS, DEFAULT_ACADEMIC_SESSION, DEFAULT_SCHOOL_NAME, EXAM_TYPE_LABEL, LAYOUTS, LAYOUT_LABEL, sortClassNames, type ExamType } from "@/lib/constants";
import type { Blueprint, PaperData, PaperListItem } from "@/lib/types";

const SCHOOL_KEY = "epb:schoolName";
type Filter = "ALL" | "DRAFT" | "FINAL";

export default function PapersPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { currentSession } = useAcademicSession();
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string; department?: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string>(currentSession);
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<Filter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalClassFilter, setModalClassFilter] = useState<string>("ALL");
  const [modalSubjectFilter, setModalSubjectFilter] = useState<string>("ALL");
  const [form, setForm] = useState({
    title: "",
    blueprintId: "",
    examType: "ANNUAL" as ExamType,
    layout: "BOOKLET_A4",
    schoolName: DEFAULT_SCHOOL_NAME,
    examDate: "",
    paperSet: "SET A",
    subjectCode: "041",
    academicSession: DEFAULT_ACADEMIC_SESSION,
    generalInstructions: "",
  });

  useEffect(() => {
    setSessionFilter(currentSession);
  }, [currentSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cls = params.get("className");
    const subj = params.get("subject");
    if (cls) setClassFilter(cls);
    if (subj) setSubjectFilter(subj);
  }, []);

  const load = useCallback(
    () =>
      Promise.all([
        api<PaperListItem[]>("/api/papers"),
        api<Blueprint[]>("/api/blueprints"),
        api<{ id: string; name: string; email: string; role: string; department?: string }>("/api/me").catch(() => null),
      ]).then(
        ([p, b, me]) => {
          setPapers(p);
          setBlueprints(b);
          if (me) setCurrentUser(me);
          setLoaded(true);
        },
        (e) => {
          setError(e.message);
          setLoaded(true);
        },
      ),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    const matchingBlueprints = blueprints.filter((b) => {
      if (classFilter !== "ALL" && b.book.className !== classFilter) return false;
      if (subjectFilter !== "ALL" && b.book.subject !== subjectFilter) return false;
      return true;
    });
    const defaultBp = matchingBlueprints[0] || blueprints.find((b) => b.id === form.blueprintId) || blueprints[0];
    setModalClassFilter(defaultBp?.book.className || classFilter);
    setModalSubjectFilter(defaultBp?.book.subject || subjectFilter);
    setForm((f) => {
      const initialTitle = f.title.trim() || (defaultBp ? `${defaultBp.name} (SET A)` : "");
      return {
        ...f,
        title: initialTitle,
        blueprintId: defaultBp?.id || "",
        examType: (defaultBp?.examType as ExamType) || "ANNUAL",
        schoolName: f.schoolName || localStorage.getItem(SCHOOL_KEY) || DEFAULT_SCHOOL_NAME,
        paperSet: f.paperSet || "SET A",
        subjectCode: defaultBp?.subjectCode || f.subjectCode || "041",
        academicSession: currentSession || DEFAULT_ACADEMIC_SESSION,
      };
    });
    setCreating(true);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const p = await api<PaperData>("/api/papers", { method: "POST", json: form });
      localStorage.setItem(SCHOOL_KEY, form.schoolName);
      router.push(`/papers/${p.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function remove(p: PaperListItem) {
    const isAdmin = currentUser?.role === "ADMIN";
    const isHod = currentUser?.role === "HOD";
    const isOwner = currentUser?.id && p.createdById ? p.createdById === currentUser.id : false;

    if (!isAdmin && p.status === "FINAL") {
      setError("Cannot delete a finalized paper. Only an Administrator can unlock or delete it.");
      return;
    }
    if (!isAdmin && !isHod && !isOwner) {
      setError("You can only delete your own draft papers, or department papers if you are an HOD.");
      return;
    }
    const ok = await confirm({
      title: "Delete this paper?",
      message: (
        <>
          <strong className="text-slate-900">{p.title}</strong> and its question placements will be removed. Questions stay in your bank. This can&apos;t be undone.
        </>
      ),
      confirmLabel: "Delete paper",
      tone: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await api(`/api/papers/${p.id}`, { method: "DELETE" });
      toast.success(`Deleted “${p.title}”`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function duplicate(p: PaperListItem) {
    setError(null);
    try {
      const res = await api<{ success: boolean; message: string; paper: PaperData }>(
        `/api/papers/${p.id}/duplicate`,
        { method: "POST", json: { academicSession: currentSession } },
      );
      toast.success(res.message);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const availableSessions = useMemo(() => {
    return Array.from(new Set([normalizeSession(currentSession), ...papers.map((p) => normalizeSession(p.academicSession))])).sort();
  }, [papers, currentSession]);

  const availableClasses = useMemo(() => {
    return sortClassNames(Array.from(new Set(papers.map((p) => p.blueprint.book.className))));
  }, [papers]);

  const availableSubjects = useMemo(() => {
    const pool = classFilter === "ALL" ? papers : papers.filter((p) => p.blueprint.book.className === classFilter);
    return Array.from(new Set(pool.map((p) => p.blueprint.book.subject))).sort();
  }, [papers, classFilter]);

  const modalAvailableClasses = useMemo(() => {
    return sortClassNames(Array.from(new Set(blueprints.map((b) => b.book.className))));
  }, [blueprints]);

  const modalAvailableSubjects = useMemo(() => {
    const pool = modalClassFilter === "ALL" ? blueprints : blueprints.filter((b) => b.book.className === modalClassFilter);
    return Array.from(new Set(pool.map((b) => b.book.subject))).sort();
  }, [blueprints, modalClassFilter]);

  const modalFilteredBlueprints = useMemo(() => {
    return blueprints.filter((b) => {
      if (modalClassFilter !== "ALL" && b.book.className !== modalClassFilter) return false;
      if (modalSubjectFilter !== "ALL" && b.book.subject !== modalSubjectFilter) return false;
      return true;
    });
  }, [blueprints, modalClassFilter, modalSubjectFilter]);

  const filteredPapers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...papers]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .filter((p) => {
        if (sessionFilter !== "ALL" && normalizeSession(p.academicSession) !== normalizeSession(sessionFilter)) return false;
        if (classFilter !== "ALL" && p.blueprint.book.className !== classFilter) return false;
        if (subjectFilter !== "ALL" && p.blueprint.book.subject !== subjectFilter) return false;
        if (filterStatus !== "ALL" && p.status !== filterStatus) return false;
        if (!query) return true;
        return [p.title, p.blueprint.book.subject, p.blueprint.book.className, p.blueprint.name, p.academicSession || ""].some((s) =>
          s.toLowerCase().includes(query),
        );
      });
  }, [papers, sessionFilter, classFilter, subjectFilter, filterStatus, searchQuery]);

  const toggleSelectPaper = useCallback((p: PaperListItem) => {
    setSelectedPaperIds((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    if (selectedPaperIds.size === filteredPapers.length && filteredPapers.length > 0) {
      setSelectedPaperIds(new Set());
    } else {
      setSelectedPaperIds(new Set(filteredPapers.map((p) => p.id)));
    }
  }, [selectedPaperIds.size, filteredPapers]);

  async function handleBatchFinalize() {
    const selectedList = papers.filter((p) => selectedPaperIds.has(p.id) && p.status === "DRAFT");
    if (selectedList.length === 0) {
      toast.info("No draft papers selected to finalise.");
      return;
    }
    const ok = await confirm({
      title: `Finalise ${selectedList.length} exam paper${selectedList.length > 1 ? "s" : ""}?`,
      message: "Once finalised, these papers will be locked. Only an Administrator can reopen them. Are you sure you are ready to finalise?",
      confirmLabel: "Finalise Selected",
      tone: "default",
    });
    if (!ok) return;

    setBatchBusy(true);
    setError(null);
    try {
      let successCount = 0;
      for (const p of selectedList) {
        try {
          await api(`/api/papers/${p.id}`, { method: "PATCH", json: { status: "FINAL" } });
          successCount++;
        } catch {}
      }
      toast.success(`Finalised ${successCount} paper${successCount > 1 ? "s" : ""}.`);
      setSelectedPaperIds(new Set());
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBatchBusy(false);
    }
  }

  async function handleBatchDelete() {
    const selectedList = papers.filter((p) => selectedPaperIds.has(p.id));
    if (selectedList.length === 0) return;

    const ok = await confirm({
      title: `Delete ${selectedList.length} exam paper${selectedList.length > 1 ? "s" : ""}?`,
      message: `This will remove ${selectedList.length} paper(s) and their question placements. Questions will remain safely in your question bank. This cannot be undone.`,
      confirmLabel: "Delete Selected",
      tone: "danger",
    });
    if (!ok) return;

    setBatchBusy(true);
    setError(null);
    try {
      let successCount = 0;
      for (const p of selectedList) {
        try {
          await api(`/api/papers/${p.id}`, { method: "DELETE" });
          successCount++;
        } catch {}
      }
      toast.success(`Deleted ${successCount} paper${successCount > 1 ? "s" : ""}.`);
      setSelectedPaperIds(new Set());
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBatchBusy(false);
    }
  }

  const handleBatchExportZip = () => {
    if (selectedPaperIds.size === 0) return;
    const ids = Array.from(selectedPaperIds).join(",");
    window.location.href = `/api/papers/export-zip?ids=${encodeURIComponent(ids)}`;
    toast.success("Preparing your exam papers ZIP archive download…");
  };

  const counts = {
    ALL: papers.length,
    DRAFT: papers.filter((p) => p.status === "DRAFT").length,
    FINAL: papers.filter((p) => p.status === "FINAL").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam papers"
        description="Draft, auto-fill, and print your papers. Open a paper to place questions against its blueprint."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost border border-slate-200"
              disabled={blueprints.length === 0}
              onClick={() => setImportOpen(true)}
              title={blueprints.length === 0 ? "Create a blueprint first" : undefined}
            >
              <Upload size={16} className="text-indigo-600" /> Import exam paper
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={blueprints.length === 0}
              onClick={openCreate}
              title={blueprints.length === 0 ? "Create a blueprint first" : undefined}
            >
              <Plus size={16} /> New exam paper
            </button>
          </div>
        }
      />

      {loaded && blueprints.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Create a blueprint first</p>
          <p className="mt-0.5 leading-relaxed">A blueprint sets the sections, question counts and marks per chapter that every paper follows.</p>
          <Link href="/blueprints" className="mt-2 inline-flex font-semibold underline underline-offset-2 hover:text-amber-950">
            Go to blueprints
          </Link>
        </div>
      )}

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* Active Session & Count Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Calendar size={14} className="text-slate-600" /> Active Session:
          </span>
          <span className="badge !bg-slate-900 !text-white font-mono px-2.5 py-0.5">
            {normalizeSession(currentSession)}
          </span>
          <span className="text-xs text-slate-500">
            ({filteredPapers.length} of {papers.length} exam papers)
          </span>
        </div>

        <Link
          href="/classes"
          className="text-xs font-semibold text-slate-700 hover:text-slate-950 inline-flex items-center gap-1"
        >
          <GraduationCap size={14} /> Manage Classes &amp; Subjects
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented" role="group" aria-label="Filter by status">
            {(
              [
                ["ALL", "All"],
                ["DRAFT", "Drafts"],
                ["FINAL", "Finalized"],
              ] as const
            ).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={filterStatus === key} onClick={() => setFilterStatus(key)}>
                {label}
                <span className="tabular-nums text-slate-400">{counts[key]}</span>
              </button>
            ))}
          </div>

          <select
            className="input h-9 w-40 py-1 text-xs font-medium"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setSubjectFilter("ALL");
            }}
            aria-label="Filter by class"
          >
            <option value="ALL">All Classes</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          <select
            className="input h-9 w-44 py-1 text-xs font-medium"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="Filter by subject"
          >
            <option value="ALL">All Subjects</option>
            {availableSubjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>

          {(classFilter !== "ALL" || subjectFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setClassFilter("ALL");
                setSubjectFilter("ALL");
              }}
              className="text-xs font-semibold text-indigo-700 hover:underline"
            >
              Reset Class/Subject
            </button>
          )}
        </div>

        <div className="relative w-full min-w-56 max-w-sm sm:w-auto sm:flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="input pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
            placeholder="Search by title, subject or class"
            aria-label="Search papers"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {!loaded ? (
        <ListSkeleton rows={4} />
      ) : filteredPapers.length === 0 ? (
        papers.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No exam papers yet"
            description="Create your first paper from a blueprint, then add questions chapter by chapter."
            action={
              blueprints.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    <Plus size={16} /> New exam paper
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost border border-slate-200"
                    onClick={() => setImportOpen(true)}
                  >
                    <Upload size={16} className="text-indigo-600" /> Import exam paper
                  </button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            compact
            icon={Search}
            title="No papers match"
            description="Try a different search or switch the class, subject, or status filter."
            action={
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("ALL");
                  setClassFilter("ALL");
                  setSubjectFilter("ALL");
                }}
              >
                Clear filters
              </button>
            }
          />
        )
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-t-2xl text-xs font-semibold text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                checked={selectedPaperIds.size > 0 && selectedPaperIds.size === filteredPapers.length}
                onChange={toggleSelectAllVisible}
              />
              <span>Select all {filteredPapers.length} papers</span>
            </label>
            {selectedPaperIds.size > 0 && (
              <span className="text-indigo-700 font-bold">{selectedPaperIds.size} selected</span>
            )}
          </div>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white" style={{ boxShadow: "var(--shadow-card)" }}>
            {filteredPapers.map((p) => {
              const isOwner = currentUser?.id && p.createdById ? p.createdById === currentUser.id : false;
              const isAdmin = currentUser?.role === "ADMIN";
              const isHod = currentUser?.role === "HOD";
              const canDelete = currentUser ? (isAdmin || isHod || (isOwner && p.status !== "FINAL")) : false;
              return (
                <PaperRow
                  key={p.id}
                  p={p}
                  currentUser={currentUser}
                  selected={selectedPaperIds.has(p.id)}
                  onToggleSelect={toggleSelectPaper}
                  onDuplicate={duplicate}
                  onDelete={canDelete ? remove : undefined}
                />
              );
            })}
          </ul>
        </div>
      )}

      {/* Floating Sticky Bulk Actions Bar */}
      {selectedPaperIds.size > 0 && (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white/95 px-5 py-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
              {selectedPaperIds.size}
            </span>
            <span>paper{selectedPaperIds.size > 1 ? "s" : ""} selected</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedPaperIds.size === 2 && (
              <button
                type="button"
                disabled={batchBusy}
                onClick={() => setCompareOpen(true)}
                className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs"
                title="Compare questions, overlap ratio, and differences between these 2 examination papers"
              >
                <GitCompare size={13} /> Compare Sets (Diff)
              </button>
            )}
            <button
              type="button"
              disabled={batchBusy}
              onClick={handleBatchExportZip}
              className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs"
              title="Download a ZIP archive containing DOCX Question Papers and Marking Schemes for all selected papers"
            >
              <FileDown size={13} /> Export ZIP Bundle
            </button>
            <button
              type="button"
              disabled={batchBusy}
              onClick={handleBatchFinalize}
              className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Lock size={13} /> Finalise Selected
            </button>
            <button
              type="button"
              disabled={batchBusy}
              onClick={handleBatchDelete}
              className="btn btn-sm btn-danger font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Trash2 size={13} /> Delete Selected
            </button>
            <button
              type="button"
              disabled={batchBusy}
              onClick={() => setSelectedPaperIds(new Set())}
              className="btn btn-sm btn-ghost text-slate-600"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {creating && (
        <Modal
          title="New exam paper"
          subtitle="Select Class, Subject, and Blueprint to build an exam paper."
          onClose={() => setCreating(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button form="new-paper-form" className="btn btn-primary" disabled={saving || !form.blueprintId}>
                {saving && <Spinner />}
                {saving ? "Creating…" : "Create and open"}
              </button>
            </>
          }
        >
          <form id="new-paper-form" onSubmit={create} className="space-y-4">
            <ErrorBanner message={error} />
            <Field label="Paper title" helper="Shown at the top of the printed paper.">
              <input
                className="input"
                required
                placeholder="Science, Half-Yearly Examination 2026"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                1. Curriculum Selection (Class → Subject → Blueprint)
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Filter by Class">
                  <select
                    className="input bg-white"
                    value={modalClassFilter}
                    onChange={(e) => {
                      const nextCls = e.target.value;
                      setModalClassFilter(nextCls);
                      setModalSubjectFilter("ALL");
                      const matching = blueprints.filter((b) => nextCls === "ALL" || b.book.className === nextCls);
                      if (matching[0]) {
                        setForm((f) => ({
                          ...f,
                          blueprintId: matching[0].id,
                          examType: (matching[0].examType as ExamType) || f.examType,
                          subjectCode: matching[0].subjectCode || f.subjectCode,
                        }));
                      }
                    }}
                  >
                    <option value="ALL">All Classes</option>
                    {modalAvailableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Filter by Subject">
                  <select
                    className="input bg-white"
                    value={modalSubjectFilter}
                    onChange={(e) => {
                      const nextSubj = e.target.value;
                      setModalSubjectFilter(nextSubj);
                      const matching = blueprints.filter(
                        (b) =>
                          (modalClassFilter === "ALL" || b.book.className === modalClassFilter) &&
                          (nextSubj === "ALL" || b.book.subject === nextSubj),
                      );
                      if (matching[0]) {
                        setForm((f) => ({
                          ...f,
                          blueprintId: matching[0].id,
                          examType: (matching[0].examType as ExamType) || f.examType,
                          subjectCode: matching[0].subjectCode || f.subjectCode,
                        }));
                      }
                    }}
                  >
                    <option value="ALL">All Subjects</option>
                    {modalAvailableSubjects.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Blueprint" helper="Sets the sections and marks per chapter.">
                  <select
                    className="input bg-white"
                    required
                    value={form.blueprintId}
                    onChange={(e) => {
                      const nextBp = blueprints.find((b) => b.id === e.target.value);
                      const shouldUpdateTitle = !form.title.trim() || blueprints.some((b) => b.name === form.title.trim() || form.title.startsWith(b.name));
                      setForm({
                        ...form,
                        blueprintId: e.target.value,
                        examType: (nextBp?.examType as ExamType) || "ANNUAL",
                        ...(nextBp?.subjectCode ? { subjectCode: nextBp.subjectCode } : {}),
                        ...(nextBp && shouldUpdateTitle ? { title: `${nextBp.name} (${form.paperSet || "SET A"})` } : {}),
                      });
                    }}
                  >
                    {modalFilteredBlueprints.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({EXAM_TYPE_LABEL[b.examType as ExamType]} · {b.book.className} {b.book.subject})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Examination Term (Blueprint Specification)" helper="Defined and locked by the selected Blueprint.">
                  <div className="input bg-slate-50 flex items-center justify-between font-semibold text-slate-800">
                    <span>{EXAM_TYPE_LABEL[form.examType as ExamType] || form.examType} Examination</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Blueprint Locked
                    </span>
                  </div>
                </Field>
              </div>
            </div>

            <Field
              label="Print format"
              helper={
                form.layout === "BOOKLET_A4"
                  ? "Standard office printers: 1 A4 sheet (landscape) folded in half creates 4 A5 pages. Minimum 4 pages."
                  : form.layout === "BOOKLET"
                  ? "A3 sheets folded into an A4 booklet: 4 pages per sheet. Requires an A3 printer."
                  : "Continuous single A4 portrait pages."
              }
            >
              <select className="input" value={form.layout} onChange={(e) => setForm({ ...form, layout: e.target.value })}>
                {LAYOUTS.map((l) => (
                  <option key={l} value={l}>
                    {LAYOUT_LABEL[l]}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="School name" helper="Printed in the paper header.">
                <input
                  className="input"
                  required
                  placeholder="Sarvodaya English Higher Secondary School, Lakhnadon"
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                />
              </Field>
              <Field label="Exam date (optional)">
                <input type="date" className="input" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
              </Field>
              <Field label="Subject code" helper="For example 041 (Mathematics) or 086 (Science).">
                <input className="input" placeholder="041" value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value })} />
              </Field>
              <Field label="Paper set" helper="For example SET A or SET 1.">
                <input className="input" placeholder="SET A" value={form.paperSet} onChange={(e) => setForm({ ...form, paperSet: e.target.value })} />
              </Field>
              <Field label="Academic session" helper="e.g. 2025–26, 2026–27">
                <select
                  className="input bg-white"
                  value={form.academicSession}
                  onChange={(e) => setForm({ ...form, academicSession: e.target.value })}
                >
                  {ACADEMIC_SESSIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="General instructions (optional)" helper="Printed under the title block.">
              <textarea
                className="input"
                rows={4}
                placeholder={"1. All questions are compulsory.\n2. Use of calculators is not permitted."}
                value={form.generalInstructions}
                onChange={(e) => setForm({ ...form, generalInstructions: e.target.value })}
              />
            </Field>
            <div>
              <button
                type="button"
                className="btn btn-sm btn-ghost bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5 text-xs font-semibold"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    generalInstructions: [
                      "1. This question paper contains multiple sections. All questions are compulsory.",
                      "2. In questions with internal choice, attempt only one of the alternatives.",
                      "3. Neat and labeled diagrams must be drawn wherever necessary. Take π = 22/7 wherever required if not stated.",
                      "4. Use of calculators is strictly prohibited.",
                    ].join("\n"),
                  }))
                }
              >
                <Sparkles size={13} className="text-indigo-600" />
                <span>Use Standard CBSE Instructions Template</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {importOpen && (
        <PaperImportModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          onSuccess={(paperId) => router.push(`/papers/${paperId}`)}
          blueprints={blueprints}
        />
      )}

      {compareOpen && selectedPaperIds.size === 2 && (
        <PaperCompareModal
          paperIdA={Array.from(selectedPaperIds)[0]}
          paperIdB={Array.from(selectedPaperIds)[1]}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}
