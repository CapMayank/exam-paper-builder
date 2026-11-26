"use client";

import { ArrowRight, CheckCircle2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { typeLabel } from "@/lib/sectionTypes";
import { suggestQuestionType, type TypeSuggestion } from "@/lib/typeInference";
import type { Book, QuestionDto } from "@/lib/types";
import { Modal, useToast } from "./ui";

type Row = { q: QuestionDto; s: TypeSuggestion };

/**
 * Lists bank questions whose stored type looks wrong (an unseen passage saved as a Short answer with sub-parts, a
 * map question saved as a Long answer...) with the type that fits, and sets the ones the teacher keeps ticked.
 */
export function QuestionTypeCheckModal({
  questions,
  books,
  onClose,
  onApplied,
}: {
  questions: QuestionDto[];
  books: Book[];
  onClose: () => void;
  onApplied: () => void | Promise<void>;
}) {
  const toast = useToast();
  const bookOf = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const rows = useMemo<Row[]>(
    () =>
      questions.flatMap((q) => {
        const s = suggestQuestionType({ type: q.type, text: q.text, subparts: q.subparts, chapterTitle: q.chapter?.title, subject: bookOf.get(q.bookId)?.subject, className: bookOf.get(q.bookId)?.className });
        return s ? [{ q, s }] : [];
      }),
    [questions, bookOf],
  );
  // every row starts ticked; the teacher unticks the ones to keep as they are
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const picked = useMemo(() => new Set(rows.map((r) => r.q.id).filter((id) => !unticked.has(id))), [rows, unticked]);
  const [busy, setBusy] = useState(false);

  async function apply() {
    const changes = rows.filter((r) => picked.has(r.q.id)).map((r) => ({ id: r.q.id, type: r.s.type }));
    if (changes.length === 0) return;
    setBusy(true);
    try {
      const res = await api<{ count: number; skipped: Array<{ id: string; why: string }> }>("/api/questions/retype", { method: "POST", json: { changes } });
      toast.success(`Changed the type of ${res.count} question${res.count === 1 ? "" : "s"}.`);
      if (res.skipped.length > 0) {
        toast.error(`Left ${res.skipped.length} as they were: ${res.skipped[0].why}${res.skipped.length > 1 ? ", and others" : ""}.`);
      }
      await onApplied();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id: string) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal
      size="xl"
      title="Check question types"
      subtitle={`Read ${questions.length} questions for a type that fits better`}
      onClose={onClose}
      footer={
        rows.length > 0 ? (
          <div className="flex w-full items-center justify-between gap-2">
            <button type="button" className="btn btn-sm" onClick={() => setUnticked(picked.size === rows.length ? new Set(rows.map((r) => r.q.id)) : new Set())}>
              {picked.size === rows.length ? "Untick all" : "Tick all"}
            </button>
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void apply()} disabled={busy || picked.size === 0}>
                <Wand2 size={15} /> {busy ? "Changing…" : `Change ${picked.size} type${picked.size === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="max-h-[70vh] space-y-2 overflow-y-auto p-1">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-12 text-center text-slate-500">
            <CheckCircle2 size={36} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800">Every type fits</h3>
            <p className="max-w-sm text-xs">None of these {questions.length} questions looks like a passage, reference to context, writing, grammar, map or drawing question saved under a general type.</p>
          </div>
        ) : (
          <>
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <b>{rows.length}</b> question{rows.length === 1 ? "" : "s"} may have the wrong type, so {rows.length === 1 ? "it" : "they"} would not show up for the paper slots of that form. Untick any you want to keep as they are.
            </p>
            {rows.map(({ q, s }) => (
              <label key={q.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:bg-slate-50">
                <input type="checkbox" className="mt-1" checked={picked.has(q.id)} onChange={() => toggle(q.id)} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-slate-600">{typeLabel(q.type)}</span>
                    <ArrowRight size={12} className="text-slate-400" />
                    <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-indigo-700">{typeLabel(s.type)}</span>
                    <span className="font-normal text-slate-500">· {s.reason}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-700">{q.text}</p>
                  {q.chapter && <p className="text-[10px] text-slate-400">Ch {q.chapter.number}: {q.chapter.title}{q.subparts?.length ? ` · ${q.subparts.length} sub-parts` : ""}</p>}
                </div>
              </label>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
