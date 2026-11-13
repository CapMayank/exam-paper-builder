"use client";

import { useRef, useState } from "react";
import { QuestionForm } from "@/components/QuestionForm";
import { Modal } from "@/components/ui";
import { api } from "@/lib/client";
import { OR_CHAPTER_GUIDELINE, OR_CHAPTER_REQUIRED, orChapterRequired } from "@/lib/internalChoiceRules";
import { parseComponents } from "@/lib/languageComponents";
import { chapterOptionIds, modalTitle, paperFieldsPatch, samePayload } from "@/lib/questionModal";
import type { Book, PaperData, PaperItem, Section } from "@/lib/types";

type Target = "primary" | "or";

/**
 * Edit a question already on the paper: the same question form as everywhere else, plus (for the main question)
 * the slot's paper-only fields, its printed instruction and syllabus component, saved together with the question.
 */
export function PaperQuestionEditModal({
  paper,
  books,
  item,
  section,
  target: requestedTarget,
  canEdit,
  onTarget,
  onPaper,
  onClose,
}: {
  paper: PaperData;
  books: Book[];
  item: PaperItem;
  section: Section;
  target: Target;
  /** False on a finalised paper or for a view-only user: the paper fields cannot be changed. */
  canEdit: boolean;
  onTarget: (t: Target) => void;
  onPaper: (p: PaperData) => void;
  onClose: () => void;
}) {
  const orQ = item.orQuestion ?? null;
  const target: Target = requestedTarget === "or" && orQ ? "or" : "primary";
  const editing = target === "or" && orQ ? orQ : item.question;
  const components = parseComponents(paper.blueprint.componentsJson);
  const orRequired = orChapterRequired(paper.blueprint.book.className);
  const orRule = orRequired ? OR_CHAPTER_REQUIRED : OR_CHAPTER_GUIDELINE;

  // the paper fields, held until the form is saved; cancel discards them
  const [instruction, setInstruction] = useState(item.instruction ?? "");
  const [componentKey, setComponentKey] = useState(item.componentKey ?? "");
  const storedKey = item.componentKey ?? "";
  // what the server holds for them, moved on after each PATCH that lands, so a retry sends only what is left
  const storedFields = useRef({ instruction: item.instruction ?? "", componentKey: item.componentKey ?? "" });
  // the question last saved by PUT in this modal, so a retry after a failed PATCH does not save it again
  const savedQuestion = useRef<{ target: Target; mode: string; payload: unknown } | null>(null);
  // targets already forked in this modal: a later save updates that paper-only copy instead of forking again
  const forked = useRef(new Set<Target>());

  async function save(payload: unknown, mode: "UPDATE_MASTER" | "FORK_COPY", info?: { unchanged: boolean }) {
    const last = savedQuestion.current;
    const alreadySaved = !!last && last.target === target && last.mode === mode && samePayload(last.payload, payload);
    // an untouched question is never sent: saving only the paper fields must not rewrite or fork it
    if (!info?.unchanged && !alreadySaved) {
      // After a fork in this modal the slot already points at that new copy, made for this paper only (by this
      // user, in no other paper). Forking again would orphan it, so a later save updates that copy in place.
      const putMode = forked.current.has(target) ? "UPDATE_MASTER" : mode;
      const updated = await api<PaperData>(`/api/papers/${paper.id}/questions/${item.id}`, {
        method: "PUT",
        json: { mode: putMode, target, question: payload },
      });
      onPaper(updated);
      savedQuestion.current = { target, mode, payload };
      if (putMode === "FORK_COPY") forked.current.add(target);
    }

    // the fields belong to the slot, so they are saved with either question (they are edited on the main tab)
    if (canEdit) {
      const patch = paperFieldsPatch(storedFields.current, { instruction, componentKey });
      // the route takes one of these keys per request
      for (const [key, value] of Object.entries(patch ?? {})) {
        try {
          const updated = await api<PaperData>(`/api/papers/${paper.id}/questions/${item.id}`, {
            method: "PATCH",
            json: { [key]: value },
          });
          onPaper(updated);
          storedFields.current = { ...storedFields.current, [key]: value };
        } catch (e) {
          const what = key === "instruction" ? "printed instruction" : "syllabus component";
          throw new Error(`The question was saved, but its ${what} was not: ${(e as Error).message} Save again to retry.`);
        }
      }
    }
    onClose();
  }

  const detailsExtra =
    target === "primary" ? (
      <div className="grid gap-3 sm:grid-cols-2">
        {components.length > 0 && (
          <label className="block">
            <span className="label">Syllabus component</span>
            <select
              className="input"
              value={componentKey}
              disabled={!canEdit}
              onChange={(e) => setComponentKey(e.target.value)}
            >
              <option value="">Not assigned</option>
              {storedKey && !components.some((c) => c.key === storedKey) && (
                <option value={storedKey}>{storedKey} (not in blueprint)</option>
              )}
              {components.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.title} ({c.marks})
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={`block ${components.length > 0 ? "" : "sm:col-span-2"}`}>
          <span className="label">Printed instruction</span>
          <input
            className="input"
            value={instruction}
            maxLength={300}
            placeholder="Optional line printed above this question"
            disabled={!canEdit}
            onChange={(e) => setInstruction(e.target.value)}
          />
        </label>
      </div>
    ) : undefined;

  return (
    <Modal
      title={modalTitle({ mode: "edit", sectionTitle: section.title, type: editing.type, marks: section.marksEach, chips: false, target })}
      onClose={onClose}
      wide
    >
      {orQ && (
        <div className="mb-3 space-y-1.5">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold" role="tablist" aria-label="Question of this slot">
            {(["primary", "or"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={target === t}
                className={`rounded-md px-3 py-1.5 transition ${
                  target === t ? (t === "or" ? "bg-white text-purple-700 shadow-xs" : "bg-white text-indigo-700 shadow-xs") : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => onTarget(t)}
              >
                {t === "primary" ? "Main question" : "OR question"}
              </button>
            ))}
          </div>
          {target === "or" && (
            <p className="text-[11px] text-slate-500">
              It carries the same {section.marksEach} mark(s) as the main question.
            </p>
          )}
        </div>
      )}
      <QuestionForm
        // remount when switching between the main and the OR question, so the form shows the right one
        key={`${item.id}-${target}-${editing.id}`}
        books={books}
        initial={editing}
        fixedBookId={paper.blueprint.bookId}
        typeFromParent={editing.type}
        targetMarks={section.marksEach}
        allowedChapterIds={chapterOptionIds(
          paper.blueprint.chapters.map((c) => c.chapterId),
          editing.chapterId,
          target === "or" && orRequired ? item.question.chapterId : null,
        )}
        chapterHint={target === "or" ? orRule : undefined}
        detailsExtra={detailsExtra}
        showPaperEditModes={true}
        submitLabel={target === "or" ? "Save OR Question" : "Save Changes"}
        onCancel={onClose}
        customSaveHandler={save}
      />
    </Modal>
  );
}
