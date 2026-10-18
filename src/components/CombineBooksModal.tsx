"use client";

import { useMemo, useState } from "react";
import { AlertCircle, BookOpen, Check, Layers, Plus } from "lucide-react";
import { Modal, Spinner, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import type { Book } from "@/lib/types";

interface CombineBooksModalProps {
  books: Book[];
  onClose: () => void;
  onSuccess: (newBookId: string) => void;
}

export function CombineBooksModal({ books, onClose, onSuccess }: CombineBooksModalProps) {
  const toast = useToast();

  // Extract unique classes
  const classes = useMemo(() => {
    const set = new Set(books.map((b) => b.className).filter(Boolean));
    return Array.from(set).sort();
  }, [books]);

  const [selectedClass, setSelectedClass] = useState<string>(classes[0] || "Class 10");
  const filteredBooks = useMemo(() => {
    return books.filter((b) => b.className === selectedClass);
  }, [books, selectedClass]);

  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [compositeTitle, setCompositeTitle] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [keepOriginals, setKeepOriginals] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill suggested title when books are toggled
  function toggleBook(id: string) {
    setSelectedBookIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const selected = books.filter((b) => next.includes(b.id));

      if (selected.length > 0) {
        if (!compositeTitle || compositeTitle.includes("Composite") || compositeTitle.includes("Exam")) {
          const names = selected.map((b) => b.title).join(" + ");
          setCompositeTitle(`${selected[0].subject || "Composite"} (${names})`);
        }
        if (!subject && selected[0]?.subject) {
          setSubject(selected[0].subject);
        }
      }
      return next;
    });
  }

  const selectedBooks = books.filter((b) => selectedBookIds.includes(b.id));
  const totalCombinedChapters = selectedBooks.reduce((acc, b) => acc + b.chapters.length, 0);
  const totalCombinedQuestions = selectedBooks.reduce((acc, b) => acc + (b._count?.questions ?? 0), 0);

  async function handleCombine(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selectedBookIds.length < 2) {
      setError("Please select at least 2 textbooks to combine.");
      return;
    }
    if (!compositeTitle.trim()) {
      setError("Please provide a title for the combined composite textbook.");
      return;
    }

    setBusy(true);
    try {
      const res = await api<{
        success: boolean;
        book: Book;
        message: string;
      }>("/api/books/combine", {
        method: "POST",
        json: {
          bookIds: selectedBookIds,
          compositeTitle: compositeTitle.trim(),
          className: selectedClass,
          subject: subject.trim() || selectedBooks[0]?.subject || "General",
          keepOriginals,
        },
      });

      toast.success(res.message);
      onSuccess(res.book.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      size="lg"
      title="Combine Textbooks for Multi-Book Exams"
      subtitle="Create a unified composite exam curriculum combining multiple readers (e.g. English First Flight + Footprints, or Social Science 4-books)"
      onClose={onClose}
    >
      <form onSubmit={handleCombine} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600" />
            <div className="font-medium">{error}</div>
          </div>
        )}

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-700">Filter by Class:</label>
          <div className="flex flex-wrap gap-1">
            {classes.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => {
                  setSelectedClass(cls);
                  setSelectedBookIds([]);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  selectedClass === cls
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Book Selector List */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-700">
            Select 2 or more textbooks to combine ({selectedBookIds.length} selected):
          </span>
          {filteredBooks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              No textbooks found for {selectedClass}. Add textbooks first to combine them.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
              {filteredBooks.map((b) => {
                const isChecked = selectedBookIds.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition cursor-pointer ${
                      isChecked
                        ? "border-indigo-500 bg-indigo-50/70 text-indigo-950 font-medium"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBook(b.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-900">{b.title}</span>
                        <span className="ml-2 text-slate-500">({b.subject})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 shrink-0">
                      <span>{b.chapters.length} ch</span>
                      <span>•</span>
                      <span>{b._count?.questions ?? 0} questions</span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Combined Details */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Combined Textbook Title *</span>
            <input
              type="text"
              required
              className="input text-xs"
              placeholder="e.g. English Language & Literature (Composite)"
              value={compositeTitle}
              onChange={(e) => setCompositeTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Subject Name *</span>
            <input
              type="text"
              required
              className="input text-xs"
              placeholder="e.g. English or Social Science"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
        </div>

        {/* Live Summary Preview */}
        {selectedBooks.length > 0 && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
              <Layers size={14} className="text-indigo-600" />
              <span>Multi-Book Exam Structure:</span>
            </div>
            <p className="text-slate-600">
              Will create <strong>{totalCombinedChapters} total chapters</strong> with book tags (e.g.{" "}
              <code>[{selectedBooks[0]?.title}] Chapter 1</code>) and migrate{" "}
              <strong>{totalCombinedQuestions} existing questions</strong> into the unified composite book.
            </p>
          </div>
        )}

        {/* Keep Originals Checkbox */}
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={keepOriginals}
            onChange={(e) => setKeepOriginals(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Keep original textbooks intact (recommended; safe for existing papers)</span>
        </label>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || selectedBookIds.length < 2 || !compositeTitle.trim()}
          >
            {busy ? (
              <>
                <Spinner /> Combining...
              </>
            ) : (
              `Combine ${selectedBookIds.length} Textbooks (${totalCombinedChapters} ch)`
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
