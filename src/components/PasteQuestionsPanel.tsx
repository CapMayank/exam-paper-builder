"use client";

import { useMemo, useState } from "react";
import { ErrorBanner, Spinner, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { DIFFICULTIES, QUESTION_TYPE_LABEL } from "@/lib/constants";
import { assignChapters, splitPastedQuestions } from "@/lib/pasteQuestions";
import { DIFFICULTY_LABEL, SKILLS, suggestDifficulty, suggestSkill } from "@/lib/questionTagging";
import type { ChapterLite } from "@/lib/questionTagging";
import type { PaperData, QuestionDto, Section } from "@/lib/types";

/** Section types whose questions are a plain text (plus options for MCQ) and can be pasted in a list. */
export const PASTEABLE_TYPES = new Set(["MCQ", "TRUE_FALSE", "FILL_BLANK", "VERY_SHORT", "SHORT", "LONG"]);

// Classes 1–12 answer in a separate copy: only drawing and map questions take room on the paper.
const SPACE: Record<string, number> = { DRAW: 70, MAP_WORK: 70 };

type Override = { chapterId?: string; difficulty?: string; skill?: string; skip?: boolean };

/**
 * Paste or type several questions for one section at once. Each one gets a chapter with room left in the
 * blueprint, a difficulty and a skill filled in; the teacher corrects any of them, then all are saved to the
 * bank and placed in the section together.
 */
export function PasteQuestionsPanel({
  paper,
  section,
  chapters,
  openMarks,
  placementProblems,
  slotsLeft,
  onPaper,
  onClose,
}: {
  paper: PaperData;
  section: Section;
  /** Blueprint chapters of this paper's book. */
  chapters: ChapterLite[];
  /** Marks still open per chapter. */
  openMarks: Record<string, number>;
  /** Why each chapter, taken in order, cannot give the section one more question (the server's own rule). */
  placementProblems?: (chapterIds: string[]) => Array<string | null>;
  slotsLeft: number;
  onPaper: (p: PaperData) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [raw, setRaw] = useState("");
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMcq = section.type === "MCQ";

  const parsed = useMemo(() => splitPastedQuestions(raw, isMcq), [raw, isMcq]);

  // chapters are handed out in order, using up each chapter's open marks (a teacher's own pick counts too)
  const left = { ...openMarks };
  const drafted = parsed.map((q, i) => {
    const o = overrides[i] ?? {};
    const auto = o.chapterId || o.skip ? null : assignChapters([q.text], chapters, left, section.marksEach)[0];
    const chapterId = o.chapterId ?? auto?.chapterId ?? "";
    if (chapterId && !o.skip && i < slotsLeft) left[chapterId] = (left[chapterId] ?? 0) - section.marksEach;
    const problem =
      i >= slotsLeft
        ? "No slot left in this section"
        : !chapterId
          ? "No chapter has marks left for this question"
          : isMcq && q.options.length < 2
            ? "Needs at least 2 options: (a) …, (b) …"
            : null;
    return {
      ...q,
      chapterId,
      chapterReason: auto?.reason ?? null,
      difficulty: o.difficulty ?? suggestDifficulty(q.text, section.type, section.marksEach),
      skill: o.skill ?? suggestSkill(q.text, section.type),
      skip: Boolean(o.skip),
      problem,
    };
  });
  // checked before anything is saved, so a refusal never leaves half-added questions in the bank
  const refusals = placementProblems?.(drafted.map((r) => (r.skip || r.problem ? "" : r.chapterId))) ?? [];
  const rows = drafted.map((r, i) => (refusals[i] ? { ...r, problem: refusals[i] } : r));
  const toSave = rows.filter((r) => !r.skip && !r.problem);

  const patch = (i: number, p: Override) => setOverrides((prev) => ({ ...prev, [i]: { ...prev[i], ...p } }));

  async function save() {
    if (toSave.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const ids: string[] = [];
      for (const r of toSave) {
        const q = await api<QuestionDto>("/api/questions", {
          method: "POST",
          json: {
            bookId: paper.blueprint.bookId,
            chapterId: r.chapterId,
            type: section.type,
            text: r.text,
            options: isMcq ? r.options : [],
            answer: r.answer,
            difficulty: r.difficulty,
            cognitiveLevel: r.skill,
            spaceMm: SPACE[section.type] ?? 0,
          },
        });
        ids.push(q.id);
      }
      const res = await api<{ paper: PaperData; addedCount: number }>(`/api/papers/${paper.id}/questions/bulk`, {
        method: "POST",
        json: { sectionId: section.id, questionIds: ids },
      });
      onPaper(res.paper);
      toast.success(`Added ${res.addedCount} question${res.addedCount === 1 ? "" : "s"} to ${section.title}`);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!PASTEABLE_TYPES.has(section.type)) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        {QUESTION_TYPE_LABEL[section.type as keyof typeof QUESTION_TYPE_LABEL] ?? section.type} questions have parts, so write them one at a
        time under “Compose new question”.
      </p>
    );
  }

  const chapterTitle = (id: string) => chapters.find((c) => c.id === id);

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <label className="block">
        <span className="label">
          Questions for {section.title} · {section.marksEach} mark{section.marksEach === 1 ? "" : "s"} each · {slotsLeft} slot
          {slotsLeft === 1 ? "" : "s"} left
        </span>
        <textarea
          className="input min-h-40"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setOverrides({});
          }}
          placeholder={
            isMcq
              ? "1. Which gas do plants take in?\n(a) Oxygen (b) Carbon dioxide (c) Nitrogen (d) Hydrogen\nAns: b\n2. …"
              : "1. Name the process by which plants make food.\n2. What is a habitat?\n3. …"
          }
        />
        <span className="mt-1 block text-xs text-slate-500">
          Number the questions, leave a blank line between them, or write one per line.
          {isMcq ? " Options as (a) … (b) …; an “Ans: b” line sets the answer." : " An “Ans: …” line under a question saves its answer."}
        </span>
      </label>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="table-clean text-sm">
            <thead>
              <tr>
                <th className="w-10">Add</th>
                <th>Question</th>
                <th className="w-56">Chapter</th>
                <th className="w-32">Difficulty</th>
                <th className="w-36">Skill</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={r.skip || r.problem ? "text-slate-400" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-indigo-600"
                      aria-label={`Add question ${i + 1}`}
                      checked={!r.skip && !r.problem}
                      disabled={Boolean(r.problem)}
                      onChange={(e) => patch(i, { skip: !e.target.checked })}
                    />
                  </td>
                  <td className="max-w-md">
                    <p className="whitespace-pre-line">{r.text}</p>
                    {isMcq && r.options.length > 0 && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {r.options.map((o, k) => `(${"abcdef"[k]}) ${o}`).join("  ")}
                        {r.answer ? `  ·  Answer ${r.answer}` : ""}
                      </p>
                    )}
                    {r.problem && <p className="mt-0.5 text-xs font-medium text-amber-700">{r.problem}</p>}
                  </td>
                  <td>
                    <select
                      className="input py-1 text-xs"
                      aria-label={`Chapter for question ${i + 1}`}
                      value={r.chapterId}
                      onChange={(e) => patch(i, { chapterId: e.target.value })}
                    >
                      {!r.chapterId && <option value="">No room left</option>}
                      {chapters.map((c) => (
                        <option key={c.id} value={c.id} disabled={(openMarks[c.id] ?? 0) < section.marksEach}>
                          {c.number}. {c.title}
                        </option>
                      ))}
                    </select>
                    {r.chapterReason && (
                      <span className="mt-0.5 block text-[11px] text-indigo-700">
                        {r.chapterReason === "title" ? "matches the title" : `most marks left (${chapterTitle(r.chapterId)?.number})`}
                      </span>
                    )}
                  </td>
                  <td>
                    <select
                      className="input py-1 text-xs"
                      aria-label={`Difficulty for question ${i + 1}`}
                      value={r.difficulty}
                      onChange={(e) => patch(i, { difficulty: e.target.value })}
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {DIFFICULTY_LABEL[d]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input py-1 text-xs"
                      aria-label={`Skill for question ${i + 1}`}
                      value={r.skill}
                      onChange={(e) => patch(i, { skill: e.target.value })}
                    >
                      {SKILLS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Chapter, difficulty and skill are filled in for you. Change any that are wrong before adding.
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy || toSave.length === 0}>
            {busy && <Spinner />}
            Add {toSave.length} question{toSave.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
