"use client";

import { BookOpen, Calendar, GraduationCap, Layers, Library, Pencil, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorBanner, Field, ListSkeleton, Modal, PageHeader, Spinner, useConfirm, useToast } from "@/components/ui";
import { SyllabusImportModal } from "@/components/SyllabusImportModal";
import { CombineBooksModal } from "@/components/CombineBooksModal";
import { AcademicRolloverModal } from "@/components/AcademicRolloverModal";
import { normalizeSession, useAcademicSession } from "@/lib/academicSession";
import { api } from "@/lib/client";
import { sortClassNames } from "@/lib/constants";
import { plural } from "@/lib/format";
import type { AcademicClassDto, Book, Chapter } from "@/lib/types";

const emptyBook = { title: "", subject: "", className: "", academicSession: "" };

function subjectMatchesFilter(bookSubject: string, filterSub: string): boolean {
  if (!filterSub || filterSub === "ALL") return true;
  const a = bookSubject.trim().toLowerCase();
  const b = filterSub.trim().toLowerCase();
  if (a === b) return true;
  const aParts = a.split("/").map((s) => s.trim());
  const bParts = b.split("/").map((s) => s.trim());
  return aParts.some((p) => bParts.includes(p));
}

export default function BooksPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { currentSession, setSession, availableSessions: hookSessions } = useAcademicSession();
  const [books, setBooks] = useState<Book[]>([]);
  const [classes, setClasses] = useState<AcademicClassDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string>(currentSession);
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [bookDialog, setBookDialog] = useState<{ editingId: string | null } | null>(null);
  const [bookForm, setBookForm] = useState(emptyBook);
  const [chapterForm, setChapterForm] = useState({ number: "", title: "" });
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importInitialTab, setImportInitialTab] = useState<"preset" | "rollover" | "ai_scan" | "text" | "csv" | "json">("preset");
  const [importTargetBook, setImportTargetBook] = useState<{ id: string; title: string; className: string; subject: string } | null>(null);
  const [combineOpen, setCombineOpen] = useState(false);
  const [rolloverModalOpen, setRolloverModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chapterTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSessionFilter(normalizeSession(currentSession));
  }, [currentSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const cls = sp.get("className");
    const sub = sp.get("subject");
    const bId = sp.get("bookId");
    if (cls) setClassFilter(cls);
    if (sub) setSubjectFilter(sub);
    if (bId) setSelectedId(bId);
  }, []);

  const load = useCallback(
    () =>
      Promise.all([api<Book[]>("/api/books"), api<AcademicClassDto[]>("/api/classes")]).then(
        ([data, clsData]) => {
          setBooks(data);
          setClasses(clsData);
          setSelectedId((cur) => (cur && data.some((b) => b.id === cur) ? cur : (data[0]?.id ?? null)));
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

  const availableSessions = useMemo(() => {
    return Array.from(new Set([currentSession, ...books.map((b) => normalizeSession(b.academicSession))])).sort();
  }, [books, currentSession]);

  const sessionBooks = useMemo(() => {
    return books.filter((b) => {
      if (sessionFilter === "ALL") return true;
      return normalizeSession(b.academicSession) === sessionFilter;
    });
  }, [books, sessionFilter]);

  const availableClasses = useMemo(() => {
    const fromClasses = classes
      .filter((c) => sessionFilter === "ALL" || normalizeSession(c.academicSession) === sessionFilter)
      .map((c) => c.name);
    const fromBooks = sessionBooks.map((b) => b.className);
    return sortClassNames(Array.from(new Set([...fromClasses, ...fromBooks])));
  }, [classes, sessionBooks, sessionFilter]);

  const availableSubjects = useMemo(() => {
    const relevantClasses = classes.filter(
      (c) =>
        (sessionFilter === "ALL" || normalizeSession(c.academicSession) === sessionFilter) &&
        (classFilter === "ALL" || c.name.trim().toLowerCase() === classFilter.trim().toLowerCase())
    );
    const fromClasses = relevantClasses.flatMap((c) => c.subjects.map((s) => s.name));
    const fromBooks = sessionBooks
      .filter((b) => classFilter === "ALL" || b.className.trim().toLowerCase() === classFilter.trim().toLowerCase())
      .map((b) => b.subject);
    return Array.from(new Set([...fromClasses, ...fromBooks]));
  }, [classes, sessionBooks, sessionFilter, classFilter]);

  const displayedBooks = useMemo(() => {
    return sessionBooks.filter((b) => {
      if (classFilter !== "ALL" && b.className.trim().toLowerCase() !== classFilter.trim().toLowerCase()) {
        return false;
      }
      if (subjectFilter !== "ALL" && !subjectMatchesFilter(b.subject, subjectFilter)) {
        return false;
      }
      return true;
    });
  }, [sessionBooks, classFilter, subjectFilter]);

  const selected = displayedBooks.find((b) => b.id === selectedId) ?? displayedBooks[0] ?? null;
  const nextChapterNumber = selected ? Math.max(0, ...selected.chapters.map((c) => c.number)) + 1 : 1;

  async function run(fn: () => Promise<unknown>, success?: string) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await load();
      if (success) toast.success(success);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openBookDialog(b?: Book) {
    setError(null);
    setBookForm(
      b
        ? { title: b.title, subject: b.subject, className: b.className, academicSession: b.academicSession || currentSession }
        : {
            ...emptyBook,
            className: classFilter !== "ALL" ? classFilter : availableClasses[0] || "",
            subject: subjectFilter !== "ALL" ? subjectFilter : "",
            academicSession: sessionFilter !== "ALL" ? sessionFilter : currentSession,
          },
    );
    setBookDialog({ editingId: b?.id ?? null });
  }

  async function saveBook(e: React.FormEvent) {
    e.preventDefault();
    const editingId = bookDialog?.editingId;
    const ok = await run(async () => {
      if (editingId) await api(`/api/books/${editingId}`, { method: "PATCH", json: bookForm });
      else {
        const created = await api<Book>("/api/books", { method: "POST", json: bookForm });
        setSelectedId(created.id);
      }
    }, editingId ? "Textbook updated" : "Textbook added");
    if (ok) setBookDialog(null);
  }

  async function saveChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const number = Number(chapterForm.number || nextChapterNumber);
    const json = { number, title: chapterForm.title };
    const wasEditing = editingChapterId;
    const ok = await run(async () => {
      if (wasEditing) await api(`/api/chapters/${wasEditing}`, { method: "PATCH", json });
      else await api(`/api/books/${selected.id}/chapters`, { method: "POST", json });
    });
    if (ok) {
      setChapterForm({ number: String(number + 1), title: "" });
      setEditingChapterId(null);
      chapterTitleRef.current?.focus(); // ready for the next chapter
    }
  }

  function editChapter(c: Chapter) {
    setEditingChapterId(c.id);
    setChapterForm({ number: String(c.number), title: c.title });
    chapterTitleRef.current?.focus();
  }

  async function removeBook(b: Book) {
    const ok = await confirm({
      title: `Delete “${b.title}”?`,
      message: (
        <>
          This removes the textbook, its {plural(b.chapters.length, "chapter")} and its {plural(b._count.questions, "question")} from the bank. Blueprints that use it
          will be affected. This can&apos;t be undone.
        </>
      ),
      confirmLabel: "Delete textbook",
      tone: "danger",
    });
    if (ok) await run(() => api(`/api/books/${b.id}`, { method: "DELETE" }), `Deleted “${b.title}”`);
  }

  async function removeChapter(c: Chapter) {
    const ok = await confirm({
      title: `Delete chapter ${c.number}?`,
      message: `“${c.title}” will be removed from this book.`,
      confirmLabel: "Delete chapter",
      tone: "danger",
    });
    if (ok) await run(() => api(`/api/chapters/${c.id}`, { method: "DELETE" }), "Chapter deleted");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Books and syllabus"
        description="Add the textbooks you teach from and their chapters. Blueprints set marks per chapter against these."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              onClick={() => setRolloverModalOpen(true)}
              title="Clone syllabus, classes, and blueprints into a new academic session"
            >
              <RotateCcw size={16} /> Rollover Session
            </button>
            <button
              type="button"
              className="btn btn-ghost border border-purple-200 bg-purple-50/50 text-purple-800 hover:bg-purple-100 hover:border-purple-300"
              onClick={() => setCombineOpen(true)}
              title="Combine multiple readers (e.g. English First Flight + Footprints, or Social Science 4-books) into a single composite exam subject"
            >
              <Layers size={16} className="text-purple-600" /> Combine for Multi-Book Exam
            </button>
            <button
              type="button"
              className="btn btn-ghost border border-slate-200 hover:border-slate-300"
              onClick={() => {
                setImportTargetBook(null);
                setImportInitialTab("preset");
                setImportOpen(true);
              }}
            >
              <Sparkles size={16} className="text-indigo-600" /> Import syllabus
            </button>
            <button type="button" className="btn btn-primary" onClick={() => openBookDialog()}>
              <Plus size={16} /> Add textbook
            </button>
          </div>
        }
      />

      {/* Academic Session & Class -> Subject Hierarchy Filter Bar */}
      <div className="card p-4 space-y-3 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-600" /> Active Session:
            </span>
            <span className="badge !bg-slate-900 !text-white font-mono px-2.5 py-0.5">
              {normalizeSession(currentSession)}
            </span>
            <span className="text-xs text-slate-500">
              ({sessionBooks.length} textbooks)
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
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong>{displayedBooks.length}</strong> of {sessionBooks.length} textbooks
          </div>
        </div>
      </div>

      <ErrorBanner message={bookDialog ? null : error} onDismiss={() => setError(null)} />

      {!loaded ? (
        <ListSkeleton rows={3} />
      ) : books.length === 0 ? (
        <EmptyState
          icon={Library}
          title="No textbooks yet"
          description="Start with the book you set papers from, or import complete syllabi with chapters in 1-click."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setImportTargetBook(null);
                  setImportInitialTab("preset");
                  setImportOpen(true);
                }}
              >
                <Sparkles size={16} /> Import syllabus &amp; books
              </button>
              <button type="button" className="btn" onClick={() => openBookDialog()}>
                <Plus size={16} /> Add manually
              </button>
            </div>
          }
        />
      ) : displayedBooks.length === 0 ? (
        <EmptyState
          icon={Library}
          title={`No textbooks in session ${sessionFilter}`}
          description="Switch sessions or rollover textbooks from a previous session to start setting blueprints and papers."
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setImportTargetBook(null);
                setImportInitialTab("rollover");
                setImportOpen(true);
              }}
            >
              <RotateCcw size={16} /> Rollover into {sessionFilter === "ALL" ? currentSession : sessionFilter}
            </button>
          }
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3.5rem)] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} className="text-indigo-600" /> Textbooks ({displayedBooks.length})
              </span>
              <button
                type="button"
                className="btn btn-primary text-[11px] py-1 px-2.5 gap-1"
                onClick={() => openBookDialog()}
              >
                <Plus size={13} /> Add
              </button>
            </div>
            <ul className="overflow-y-auto overscroll-contain flex-1 p-2 space-y-1.5 focus:outline-none" aria-label="Textbooks">
              {displayedBooks.map((b) => {
                const active = b.id === selectedId;
                return (
                  <li key={b.id}>
                    <div
                      className={`group relative rounded-xl border p-3 transition ${
                        active ? "border-indigo-500/80 ring-1 ring-indigo-500/20 bg-indigo-50/90 text-indigo-950 shadow-2xs" : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(b.id);
                          if (typeof window !== "undefined") {
                            const el = document.getElementById("book-details-section");
                            if (el && (el.getBoundingClientRect().top < 20 || window.innerWidth < 1024)) {
                              el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }
                        }}
                        aria-pressed={active}
                        className="block w-full rounded-lg text-left after:absolute after:inset-0 after:rounded-xl"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="block font-semibold text-sm text-slate-900 truncate">{b.title}</span>
                          <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 whitespace-nowrap">
                            {b.academicSession || "2025–26"}
                          </span>
                        </div>
                        <span className="mt-0.5 block text-xs text-slate-600">
                          {b.className} · {b.subject}
                        </span>
                        <span className="mt-1.5 block text-[11px] text-slate-500">
                          {plural(b.chapters.length, "chapter")} · {plural(b._count.questions, "question")}
                        </span>
                      </button>
                      <div className="absolute right-2 top-2 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-white/95 rounded-lg p-0.5 shadow-2xs border border-slate-200/60">
                        <button type="button" className="btn btn-ghost btn-icon btn-xs p-1" title="Edit textbook" aria-label={`Edit ${b.title}`} onClick={() => openBookDialog(b)}>
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-xs p-1 hover:bg-red-50 hover:text-red-700"
                          title="Delete textbook"
                          aria-label={`Delete ${b.title}`}
                          onClick={() => removeBook(b)}
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

          <section id="book-details-section" className="card space-y-5 p-5 sm:p-6" aria-live="polite">
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-slate-900">{selected.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-slate-600">
                        {selected.className} · {selected.subject} · {plural(selected.chapters.length, "chapter")}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 whitespace-nowrap">
                        <Calendar size={12} /> Session {selected.academicSession || "2025–26"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost border border-slate-200 hover:border-slate-300 text-indigo-700"
                    onClick={() => {
                      setImportTargetBook({
                        id: selected.id,
                        title: selected.title,
                        className: selected.className,
                        subject: selected.subject,
                      });
                      setImportOpen(true);
                    }}
                  >
                    <Sparkles size={14} className="text-indigo-600" /> Bulk import chapters
                  </button>
                </div>

                <form onSubmit={saveChapter} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <Field label="Number" className="w-24">
                    <input
                      type="number"
                      min={1}
                      className="input"
                      required
                      placeholder={String(nextChapterNumber)}
                      value={chapterForm.number}
                      onChange={(e) => setChapterForm({ ...chapterForm, number: e.target.value })}
                    />
                  </Field>
                  <Field label={editingChapterId ? "Edit chapter title" : "New chapter title"} className="min-w-48 flex-1">
                    <input
                      ref={chapterTitleRef}
                      className="input"
                      required
                      placeholder="Chemical reactions and equations"
                      value={chapterForm.title}
                      onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                    />
                  </Field>
                  <div className="flex gap-2">
                    <button className="btn btn-primary" disabled={busy}>
                      {editingChapterId ? "Save chapter" : <><Plus size={15} /> Add chapter</>}
                    </button>
                    {editingChapterId && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setEditingChapterId(null);
                          setChapterForm({ number: String(nextChapterNumber), title: "" });
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {selected.chapters.length === 0 ? (
                  <EmptyState compact icon={BookOpen} title="No chapters yet" description="Add the first chapter above. The number moves on by itself, so you can type titles one after another." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="table-clean">
                      <thead>
                        <tr>
                          <th className="w-24">Chapter</th>
                          <th>Title</th>
                          <th className="w-28 text-right">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selected.chapters]
                          .sort((a, b) => a.number - b.number)
                          .map((c) => (
                            <tr key={c.id} className={editingChapterId === c.id ? "bg-amber-50/70" : ""}>
                              <td className="font-semibold tabular-nums text-slate-500">{c.number}</td>
                              <td className="font-medium text-slate-800">{c.title}</td>
                              <td className="text-right whitespace-nowrap">
                                <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Edit chapter" aria-label={`Edit chapter ${c.number}`} onClick={() => editChapter(c)}>
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-icon btn-sm hover:bg-red-50 hover:text-red-700"
                                  title="Delete chapter"
                                  aria-label={`Delete chapter ${c.number}`}
                                  onClick={() => removeChapter(c)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <EmptyState compact icon={BookOpen} title="Select a textbook" description="Pick a book on the left to manage its chapters." />
            )}
          </section>
        </div>
      )}

      {bookDialog && (
        <Modal
          size="sm"
          title={bookDialog.editingId ? "Edit textbook" : "Add textbook"}
          onClose={() => setBookDialog(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setBookDialog(null)}>
                Cancel
              </button>
              <button form="book-form" className="btn btn-primary" disabled={busy}>
                {busy && <Spinner />}
                {bookDialog.editingId ? "Save changes" : "Add textbook"}
              </button>
            </>
          }
        >
          <form id="book-form" onSubmit={saveBook} className="space-y-4">
            <ErrorBanner message={error} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Class">
                <input
                  list="class-options"
                  className="input"
                  required
                  placeholder="Class 10"
                  value={bookForm.className}
                  onChange={(e) => setBookForm({ ...bookForm, className: e.target.value })}
                />
                <datalist id="class-options">
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls} />
                  ))}
                </datalist>
              </Field>
              <Field label="Subject">
                <input
                  list="subject-options"
                  className="input"
                  required
                  placeholder="Science"
                  value={bookForm.subject}
                  onChange={(e) => setBookForm({ ...bookForm, subject: e.target.value })}
                />
                <datalist id="subject-options">
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub} />
                  ))}
                </datalist>
              </Field>
            </div>
            <Field label="Textbook title">
              <input className="input" required placeholder="NCERT Science" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} />
            </Field>
            <Field label="Academic session" helper="e.g. 2025–26, 2026–27">
              <input
                className="input"
                placeholder={currentSession}
                value={bookForm.academicSession}
                onChange={(e) => setBookForm({ ...bookForm, academicSession: e.target.value })}
              />
            </Field>
          </form>
        </Modal>
      )}

      {importOpen && (
        <SyllabusImportModal
          targetBook={importTargetBook}
          initialTab={importInitialTab}
          onClose={() => setImportOpen(false)}
          onSuccess={({ bookId }) => {
            void load().then(() => {
              if (bookId) setSelectedId(bookId);
            });
          }}
        />
      )}

      {combineOpen && (
        <CombineBooksModal
          books={books}
          onClose={() => setCombineOpen(false)}
          onSuccess={(newBookId) => {
            void load().then(() => {
              if (newBookId) setSelectedId(newBookId);
            });
          }}
        />
      )}

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
