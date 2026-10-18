"use client";

import { BookOpen, Calendar, Layers, Library, Pencil, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorBanner, Field, ListSkeleton, Modal, PageHeader, Spinner, useConfirm, useToast } from "@/components/ui";
import { SyllabusImportModal } from "@/components/SyllabusImportModal";
import { CombineBooksModal } from "@/components/CombineBooksModal";
import { useAcademicSession } from "@/lib/academicSession";
import { api } from "@/lib/client";
import { plural } from "@/lib/format";
import type { Book, Chapter } from "@/lib/types";

const emptyBook = { title: "", subject: "", className: "", academicSession: "" };

export default function BooksPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { currentSession } = useAcademicSession();
  const [books, setBooks] = useState<Book[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string>("ALL");
  const [bookDialog, setBookDialog] = useState<{ editingId: string | null } | null>(null);
  const [bookForm, setBookForm] = useState(emptyBook);
  const [chapterForm, setChapterForm] = useState({ number: "", title: "" });
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importInitialTab, setImportInitialTab] = useState<"preset" | "rollover" | "ai_scan" | "text" | "csv" | "json">("preset");
  const [importTargetBook, setImportTargetBook] = useState<{ id: string; title: string; className: string; subject: string } | null>(null);
  const [combineOpen, setCombineOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chapterTitleRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    () =>
      api<Book[]>("/api/books").then(
        (data) => {
          setBooks(data);
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
    return Array.from(new Set([currentSession, ...books.map((b) => (b.academicSession || "2025–26").replace(/-/g, "–"))])).sort();
  }, [books, currentSession]);

  const displayedBooks = useMemo(() => {
    return books.filter((b) => {
      if (sessionFilter === "ALL") return true;
      return (b.academicSession || "2025–26").replace(/-/g, "–") === sessionFilter;
    });
  }, [books, sessionFilter]);

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
        : { ...emptyBook, academicSession: currentSession },
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
              className="btn btn-ghost border border-indigo-200 bg-indigo-50/50 text-indigo-900 hover:bg-indigo-100 hover:border-indigo-300"
              onClick={() => {
                setImportTargetBook(null);
                setImportInitialTab("rollover");
                setImportOpen(true);
              }}
              title="Import or clone textbooks and syllabus from a previous academic session"
            >
              <RotateCcw size={16} className="text-indigo-600" /> Rollover from previous session
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
            All Sessions ({books.length})
          </button>
          {availableSessions.map((sess) => {
            const count = books.filter((b) => (b.academicSession || "2025–26").replace(/-/g, "–") === sess).length;
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
                {sess} {count > 0 && <span className="opacity-75 font-normal">({count})</span>}
                {sess === currentSession && <span className="ml-1 text-[10px] text-amber-500 font-bold">●</span>}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{displayedBooks.length}</strong> of {books.length} textbooks
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
          <ul className="space-y-2" aria-label="Textbooks">
            {displayedBooks.map((b) => {
              const active = b.id === selectedId;
              return (
                <li key={b.id}>
                  <div
                    className={`group relative rounded-2xl border bg-white p-4 transition ${
                      active ? "border-indigo-500 ring-3 ring-indigo-500/15" : "border-slate-200 hover:border-slate-300"
                    }`}
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(b.id)}
                      aria-pressed={active}
                      className="block w-full rounded-lg text-left after:absolute after:inset-0 after:rounded-2xl"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="block font-semibold leading-snug text-slate-900 truncate">{b.title}</span>
                        <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 whitespace-nowrap">
                          {b.academicSession || "2025–26"}
                        </span>
                      </div>
                      <span className="mt-0.5 block text-sm text-slate-600">
                        {b.className} · {b.subject}
                      </span>
                      <span className="mt-2 block text-xs text-slate-500">
                        {plural(b.chapters.length, "chapter")} · {plural(b._count.questions, "question")}
                      </span>
                    </button>
                    <div className="absolute right-2.5 top-2.5 z-10 flex gap-0.5 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Edit textbook" aria-label={`Edit ${b.title}`} onClick={() => openBookDialog(b)}>
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm hover:bg-red-50 hover:text-red-700"
                        title="Delete textbook"
                        aria-label={`Delete ${b.title}`}
                        onClick={() => removeBook(b)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <section className="card space-y-5 p-5 sm:p-6" aria-live="polite">
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
            <Field label="Textbook title">
              <input className="input" required placeholder="NCERT Science" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Class">
                <input className="input" required placeholder="Class 10" value={bookForm.className} onChange={(e) => setBookForm({ ...bookForm, className: e.target.value })} />
              </Field>
              <Field label="Subject">
                <input className="input" required placeholder="Science" value={bookForm.subject} onChange={(e) => setBookForm({ ...bookForm, subject: e.target.value })} />
              </Field>
            </div>
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
    </div>
  );
}
