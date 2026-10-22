"use client";

import { AlertTriangle, CheckCircle2, Pencil, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { QuestionForm } from "@/components/QuestionForm";
import { isExhaustedUsage, QuestionFreshnessAlert, QuestionUsagePills } from "@/components/QuestionUsageHistory";
import { QuestionView } from "@/components/QuestionView";
import { ErrorBanner, Modal, Spinner } from "@/components/ui";
import { whyCannotAdd, type BlueprintDef } from "@/lib/blueprint";
import { api } from "@/lib/client";
import { cleanOptionText, DIFFICULTIES, isKindergartenType, QUESTION_TYPE_LABEL } from "@/lib/constants";
import { type Book, type PaperData, type QuestionDto, type Section, subpartsTotalMarks } from "@/lib/types";
import { MathText } from "./MathText";
import type { GeneratedQuestionItem } from "@/lib/gemini";

/**
 * Adds questions to one blueprint section, either from the bank (smartly ordered) or by writing a new one,
 * which is saved to the bank first so it's reusable later.
 */
export function QuestionPicker({
  paper,
  section,
  books,
  replacingItemId,
  alternateTargetItemId,
  onPaper,
  onClose,
}: {
  paper: PaperData;
  section: Section;
  books: Book[];
  replacingItemId?: string;
  alternateTargetItemId?: string;
  onPaper: (p: PaperData) => void;
  onClose: () => void;
}) {
  const isReplacing = Boolean(replacingItemId);
  const isAlternate = Boolean(alternateTargetItemId);
  const activeItemId = replacingItemId ?? alternateTargetItemId;
  const activeItem = activeItemId ? paper.items.find((i) => i.id === activeItemId) : null;

  const [tab, setTab] = useState<"bank" | "new" | "ai">("bank");
  const [bank, setBank] = useState<QuestionDto[]>([]);
  const [filters, setFilters] = useState({
    chapterId: isAlternate && activeItem ? activeItem.question.chapterId : "",
    difficulty: "",
    q: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);

  // AI Generator state
  const [initialForEdit, setInitialForEdit] = useState<QuestionDto | undefined>(undefined);
  const [aiChapterId, setAiChapterId] = useState<string>("");
  const [aiDifficulty, setAiDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [aiCognitiveLevel, setAiCognitiveLevel] = useState<string>("APPLYING");
  const [aiLanguage, setAiLanguage] = useState<"en" | "hi" | "bilingual">("en");
  const [aiTopicContext, setAiTopicContext] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState<GeneratedQuestionItem | null>(null);
  const [aiIsMock, setAiIsMock] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);

  const def: BlueprintDef = useMemo(
    () => ({
      sections: paper.blueprint.sections,
      chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
    }),
    [paper.blueprint],
  );

  const placed = paper.items
    .filter((i) => i.id !== replacingItemId)
    .map((i) => ({ sectionId: i.sectionId, chapterId: i.question.chapterId }));

  const sectionStatus = paper.progress.sections.find((s) => s.id === section.id)!;
  const full = !isReplacing && !isAlternate && sectionStatus.filled >= sectionStatus.needed;

  // Chapters that can still take this section's question marks (locked to primary question's chapter if alternate choice).
  const openChapters = isAlternate
    ? paper.blueprint.chapters.filter((c) => (activeItem ? c.chapterId === activeItem.question.chapterId : true))
    : paper.blueprint.chapters.filter((c) => {
        let used = paper.progress.chapters.find((p) => p.chapterId === c.chapterId)?.used ?? 0;
        if (activeItem && activeItem.question.chapterId === c.chapterId && isReplacing) {
          used -= section.marksEach;
        }
        return used + section.marksEach <= c.marks;
      });

  useEffect(() => {
    const sp = new URLSearchParams({ bookId: paper.blueprint.bookId, type: section.type, excludePaperId: paper.id });
    Object.entries(filters).forEach(([k, v]) => v && sp.set(k, v));
    if (isAlternate && activeItem) {
      sp.set("chapterId", activeItem.question.chapterId);
    }
    const t = setTimeout(() => {
      setLoading(true);
      api<QuestionDto[]>(`/api/questions?${sp}`)
        .then(setBank, (e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(t);
  }, [paper.id, paper.blueprint.bookId, section.type, filters, isAlternate, activeItem]);

  // Smart assist: questions that fit the blueprint come first, then least-used, then newest.
  const ranked = useMemo(() => {
    return bank
      .map((q) => {
        let why: string | null = null;
        if (isAlternate) {
          if (activeItem && q.id === activeItem.question.id) {
            why = "Cannot pick the same question as primary.";
          } else if (paper.items.some((i) => i.question.id === q.id || i.orQuestion?.id === q.id)) {
            why = "Already used in this paper.";
          } else if (q.type !== section.type) {
            why = `Must match section question type (${section.type}).`;
          } else if (activeItem && q.chapterId !== activeItem.question.chapterId) {
            why = `Must match primary question chapter (Ch ${activeItem.question.chapter?.number}).`;
          } else if (q.subparts && q.subparts.length > 0 && subpartsTotalMarks(q.subparts) !== section.marksEach) {
            why = `Subpart marks (${subpartsTotalMarks(q.subparts)}m) must match section (${section.marksEach}m).`;
          }
        } else {
          why = whyCannotAdd(def, placed, { sectionId: section.id, chapterId: q.chapterId, type: q.type });
        }
        return { q, why };
      })
      .sort((a, b) => Number(!!a.why) - Number(!!b.why) || (a.q.timesUsed ?? 0) - (b.q.timesUsed ?? 0));
  }, [bank, placed, def, section.id, isAlternate, activeItem, paper.items, section.type, section.marksEach]);

  async function add(questionId: string) {
    setError(null);
    try {
      if (isAlternate && alternateTargetItemId) {
        const updated = await api<PaperData>(`/api/papers/${paper.id}/questions/${alternateTargetItemId}`, {
          method: "PATCH",
          json: { orQuestionId: questionId },
        });
        onPaper(updated);
        onClose();
      } else if (isReplacing) {
        const updated = await api<PaperData>(`/api/papers/${paper.id}/questions/${replacingItemId}`, {
          method: "PATCH",
          json: { replaceWithQuestionId: questionId },
        });
        onPaper(updated);
        onClose();
      } else {
        const updated = await api<PaperData>(`/api/papers/${paper.id}/questions`, { method: "POST", json: { sectionId: section.id, questionId } });
        onPaper(updated);
        setBank((b) => b.filter((q) => q.id !== questionId));
        const s = updated.progress.sections.find((x) => x.id === section.id)!;
        if (s.filled >= s.needed) onClose();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (openChapters.length > 0) {
      if (!aiChapterId || !openChapters.some((c) => c.chapterId === aiChapterId)) {
        setAiChapterId(openChapters[0].chapterId);
      }
    }
  }, [openChapters, aiChapterId]);

  async function handleGenerateAiQuestion() {
    const selectedChapter = paper.blueprint.chapters.find((c) => c.chapterId === aiChapterId)?.chapter;
    if (!selectedChapter) {
      setAiError("Please select a chapter first.");
      return;
    }

    setAiBusy(true);
    setAiError(null);
    try {
      const customKey =
        typeof window !== "undefined"
          ? localStorage.getItem("exam_gemini_api_key") || ""
          : "";

      const headers: Record<string, string> = {};
      if (customKey) headers["x-gemini-api-key"] = customKey;

      const res = await api<{
        success: boolean;
        isMock: boolean;
        data: GeneratedQuestionItem[];
        error?: string;
      }>("/api/ai/generate-questions", {
        method: "POST",
        headers,
        json: {
          chapter: `Chapter ${selectedChapter.number}: ${selectedChapter.title}`,
          className: paper.blueprint.book.className,
          subject: paper.blueprint.book.subject,
          type: section.type,
          marks: section.marksEach,
          difficulty: aiDifficulty,
          cognitiveLevel: aiCognitiveLevel,
          language: aiLanguage,
          count: 1,
          topicContext: aiTopicContext.trim(),
        },
      });

      if (!res.success && res.error) {
        setAiError(res.error);
        return;
      }

      if (res.data && res.data.length > 0) {
        setAiGenerated(res.data[0]);
        setAiIsMock(res.isMock);
      } else {
        setAiError("No question was generated. Please try again.");
      }
    } catch (e) {
      setAiError((e as Error).message || "Generation failed.");
    } finally {
      setAiBusy(false);
    }
  }

  async function handleAcceptAiQuestion() {
    if (!aiGenerated) return;
    setAiSaving(true);
    setAiError(null);
    try {
      const selectedChapter = paper.blueprint.chapters.find((c) => c.chapterId === aiChapterId)?.chapter;
      if (!selectedChapter) {
        throw new Error("Please select a valid chapter.");
      }

      const payload = {
        bookId: paper.blueprint.bookId,
        chapterId: aiChapterId,
        type: section.type,
        text: aiGenerated.text,
        options: aiGenerated.options || [],
        subparts: (aiGenerated.subparts || []).map((sp, idx) => ({
          label: sp.label || `(${idx + 1})`,
          text: sp.text,
          marks: sp.marks || 1,
          answer: sp.answer || "",
        })),
        answer: aiGenerated.answer || "",
        difficulty: aiDifficulty,
        spaceMm: section.type === "LONG" ? 60 : section.type === "SHORT" ? 20 : 0,
        showGrid: false,
      };

      const created = await api<QuestionDto>("/api/questions", {
        method: "POST",
        json: payload,
      });

      await add(created.id);
    } catch (e) {
      setAiError((e as Error).message || "Failed to save question to paper.");
    } finally {
      setAiSaving(false);
    }
  }

  function handleEditAiQuestion() {
    if (!aiGenerated) return;
    const selectedChapter = paper.blueprint.chapters.find((c) => c.chapterId === aiChapterId)?.chapter;
    const dummyDto: QuestionDto = {
      id: "",
      bookId: paper.blueprint.bookId,
      chapterId: aiChapterId,
      type: section.type,
      text: aiGenerated.text,
      options: aiGenerated.options || [],
      subparts: (aiGenerated.subparts || []).map((sp, idx) => ({
        label: sp.label || `(${idx + 1})`,
        text: sp.text,
        marks: sp.marks || 1,
        answer: sp.answer || "",
      })),
      answer: aiGenerated.answer || "",
      difficulty: aiDifficulty,
      imagePath: null,
      spaceMm: section.type === "LONG" ? 60 : section.type === "SHORT" ? 20 : 0,
      showGrid: false,
      createdAt: new Date().toISOString(),
      chapter: selectedChapter
        ? {
            id: selectedChapter.id,
            number: selectedChapter.number,
            title: selectedChapter.title,
          }
        : undefined,
    };
    setInitialForEdit(dummyDto);
    setTab("new");
  }

  const modalTitle = isAlternate
    ? `Select Alternate Choice (OR) in ${section.title} — (${section.marksEach}m)`
    : isReplacing
    ? `Replace Question in ${section.title} — ${QUESTION_TYPE_LABEL[section.type as keyof typeof QUESTION_TYPE_LABEL]} (${section.marksEach}m)`
    : `Add to ${section.title} — ${QUESTION_TYPE_LABEL[section.type as keyof typeof QUESTION_TYPE_LABEL]} · ${section.marksEach} mark(s) each`;

  return (
    <Modal
      title={modalTitle}
      subtitle={
        isAlternate
          ? "Select an internal choice alternate question for students (does not consume blueprint chapter marks)."
          : isReplacing
          ? "Select a question to replace the current slot. Chapter mark quotas will adjust automatically."
          : `Select a question for ${section.title} (${sectionStatus.filled} of ${sectionStatus.needed} slots filled).`
      }
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <ErrorBanner message={error} />

        <div className="flex gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("bank")}
            className={`flex-1 rounded-lg py-2 transition ${
              tab === "bank"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Choose from Question Bank ({ranked.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setInitialForEdit(undefined);
              setTab("new");
            }}
            className={`flex-1 rounded-lg py-2 transition ${
              tab === "new"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            + Compose New Question
          </button>
          <button
            type="button"
            onClick={() => setTab("ai")}
            className={`flex-1 rounded-lg py-2 transition flex items-center justify-center gap-1.5 ${
              tab === "ai"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles size={13} className="text-amber-500" />
            <span>Generate with AI</span>
          </button>
        </div>

        {isAlternate && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900 font-medium flex items-center gap-2">
            <span className="font-bold">Board Guardrail:</span> Alternate (OR) choices must match the primary question&apos;s chapter and mark value.
          </div>
        )}

        {tab === "bank" ? (
          <>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <select
                className="input text-xs"
                value={isAlternate && activeItem ? activeItem.question.chapterId : filters.chapterId}
                disabled={isAlternate}
                onChange={(e) => setFilters({ ...filters, chapterId: e.target.value })}
                aria-label="Chapter"
              >
                {isAlternate && activeItem ? (
                  <option value={activeItem.question.chapterId}>
                    Ch {activeItem.question.chapter?.number}. {activeItem.question.chapter?.title} (Locked — Board Guardrail)
                  </option>
                ) : (
                  <>
                    <option value="">All chapters</option>
                    {paper.blueprint.chapters.map((c) => {
                      const open = openChapters.some((o) => o.chapterId === c.chapterId);
                      return (
                        <option key={c.chapterId} value={c.chapterId}>
                          Ch {c.chapter.number}. {c.chapter.title}
                          {open ? "" : " (quota full)"}
                        </option>
                      );
                    })}
                  </>
                )}
              </select>

              <select
                className="input text-xs"
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                aria-label="Difficulty"
              >
                <option value="">Any difficulty</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>

              <input
                className="input text-xs"
                placeholder="Search question text…"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
            </div>

            {ranked.length > 0 && ranked.every((r) => !!r.why) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <span className="font-semibold">Notice:</span> All {ranked.length} question(s) in this book currently exceed remaining chapter mark quotas. Switch to &quot;Compose New Question&quot; to write a question for an open chapter, or adjust chapter weightages in the blueprint.
              </div>
            )}

            <ul className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
              {ranked.map(({ q, why }, idx) => (
                <li
                  key={q.id}
                  className={`rounded-xl border p-3.5 transition ${
                    why
                      ? "border-slate-200 bg-slate-50/70 opacity-65"
                      : "border-slate-200/90 bg-white shadow-2xs hover:border-slate-300"
                  }`}
                >
                  <div className="paper-font text-sm leading-relaxed">
                    <QuestionView q={q} />
                  </div>

                  {q.usages && q.usages.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2">
                      <QuestionFreshnessAlert usages={q.usages} currentPaper={paper} />
                      <QuestionUsagePills usages={q.usages} currentPaperId={paper.id} currentPaper={paper} />
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-2">
                      {q.usages?.some((u) => isExhaustedUsage(u, paper)) && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-950 border border-amber-300 ring-1 ring-amber-400/40">
                          <AlertTriangle size={12} className="text-amber-700 shrink-0" />
                          Exhausted in Earlier Exam
                        </span>
                      )}
                      {isKindergartenType(q.type) && (
                        <span className="badge !bg-amber-100 !text-amber-900 border border-amber-300 font-bold">
                          🎨 {QUESTION_TYPE_LABEL[q.type as keyof typeof QUESTION_TYPE_LABEL]?.split(" (")[0] || "Activity"}
                        </span>
                      )}
                      <span className="badge font-semibold">{q.difficulty}</span>
                      <span className="badge !bg-slate-100 text-slate-700 font-medium">
                        Ch {q.chapter?.number}. {q.chapter?.title}
                      </span>
                      <span>· used {q.timesUsed ?? 0}×</span>
                      {!why && idx < 3 && (q.timesUsed ?? 0) === 0 && (
                        <span className="badge !bg-indigo-50 !text-indigo-700 border border-indigo-100 font-semibold">
                          Recommended · unused
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {why ? (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                          {why}
                        </span>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary shadow-2xs"
                          onClick={() => add(q.id)}
                        >
                          <Plus size={13} />{" "}
                          {isAlternate
                            ? "Set as Alternate (OR)"
                            : isReplacing
                            ? "Use as Replacement"
                            : "Add to Slot"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {!loading && ranked.length === 0 && (
                <li className="p-8 text-center text-sm text-slate-500">
                  No matching {QUESTION_TYPE_LABEL[section.type as keyof typeof QUESTION_TYPE_LABEL]} questions found.
                  Switch to the other tab to write a new one.
                </li>
              )}
            </ul>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" className="btn" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : tab === "new" ? (
          full ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                This section is already full ({sectionStatus.filled} of {sectionStatus.needed} slots filled).
              </div>
              <div className="flex justify-end">
                <button type="button" className="btn" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : openChapters.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">All Chapter Quotas Full for {section.marksEach}m Questions</p>
                <p>
                  Every chapter&apos;s allocated marks in the blueprint have been completely utilized.
                  To add more questions to this section, adjust the chapter mark quotas in your blueprint or replace an existing question.
                </p>
              </div>
              <div className="flex justify-end">
                <button type="button" className="btn" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <QuestionForm
              key={formKey}
              books={books}
              initial={initialForEdit}
              fixedBookId={paper.blueprint.bookId}
              fixedType={section.type}
              targetMarks={section.marksEach}
              allowedChapterIds={openChapters.map((c) => c.chapterId)}
              submitLabel={
                isAlternate
                  ? "Save to Bank & Set as Alternate"
                  : isReplacing
                  ? "Save to Bank & Use as Replacement"
                  : "Save to Bank & Add to Paper"
              }
              onCancel={() => {
                setInitialForEdit(undefined);
                onClose();
              }}
              onSaved={async (q) => {
                setInitialForEdit(undefined);
                await add(q.id);
                setFormKey((k) => k + 1);
              }}
            />
          )
        ) : (
          /* tab === "ai" */
          full ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                This section is already full ({sectionStatus.filled} of {sectionStatus.needed} slots filled).
              </div>
              <div className="flex justify-end">
                <button type="button" className="btn" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : openChapters.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">All Chapter Quotas Full for {section.marksEach}m Questions</p>
                <p>
                  Every chapter&apos;s allocated marks in the blueprint have been completely utilized.
                  To generate questions for this section, adjust the chapter mark quotas in your blueprint or replace an existing question.
                </p>
              </div>
              <div className="flex justify-end">
                <button type="button" className="btn" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {aiError && <ErrorBanner message={aiError} />}

              {/* Configuration Controls */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/70 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600" />
                    <span className="font-bold text-slate-900 text-sm">AI Question Generator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white border border-indigo-200 px-2.5 py-0.5 font-semibold text-indigo-900 text-[11px]">
                      {paper.blueprint.book.className} · {paper.blueprint.book.subject}
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 font-bold text-indigo-800 text-[11px]">
                      {QUESTION_TYPE_LABEL[section.type as keyof typeof QUESTION_TYPE_LABEL]} · {section.marksEach} Mark{section.marksEach > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Chapter Selection */}
                  <div className="sm:col-span-2">
                    <label className="label text-[11px]">Chapter</label>
                    <select
                      className="input text-xs"
                      value={aiChapterId}
                      disabled={isAlternate && Boolean(activeItem)}
                      onChange={(e) => setAiChapterId(e.target.value)}
                    >
                      {openChapters.map((c) => {
                        const ch = paper.blueprint.chapters.find((x) => x.chapterId === c.chapterId)?.chapter;
                        return (
                          <option key={c.chapterId} value={c.chapterId}>
                            Ch {ch?.number}: {ch?.title} ({c.marks}m quota)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="label text-[11px]">Difficulty</label>
                    <select
                      className="input text-xs"
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="label text-[11px]">Language</label>
                    <select
                      className="input text-xs"
                      value={aiLanguage}
                      onChange={(e) => setAiLanguage(e.target.value as "en" | "hi" | "bilingual")}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (हिंदी)</option>
                      <option value="bilingual">Bilingual (English + Hindi)</option>
                    </select>
                  </div>

                  {/* Topic Context */}
                  <div className="sm:col-span-3">
                    <label className="label text-[11px]">
                      Specific Topic Focus <span className="text-slate-400 font-normal">(optional topic/concept prompt)</span>
                    </label>
                    <input
                      className="input text-xs"
                      value={aiTopicContext}
                      onChange={(e) => setAiTopicContext(e.target.value)}
                      placeholder="e.g. Focus on balancing chemical equations, or Ohm's Law circuit numericals..."
                    />
                  </div>

                  {/* Generate Button */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleGenerateAiQuestion}
                      disabled={aiBusy || !aiChapterId}
                      className="btn btn-primary w-full flex items-center justify-center gap-1.5 text-xs h-9 shadow-xs"
                    >
                      {aiBusy ? (
                        <>
                          <Spinner />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          {aiGenerated ? "Generate Another" : "Generate Question"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Generated Question Card Preview */}
              {aiGenerated ? (
                <div className="rounded-xl border border-indigo-200 bg-white p-4.5 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Generated Question Preview</span>
                      {aiIsMock && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Offline Demo Fallback
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="badge font-bold">{aiGenerated.difficulty}</span>
                      <span className="badge badge-indigo font-bold">{aiGenerated.cognitiveLevel}</span>
                      <span className="badge badge-emerald font-bold">
                        {section.marksEach} Mark{section.marksEach > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-slate-900 text-sm leading-relaxed font-medium">
                    <MathText text={aiGenerated.text} />
                  </div>

                  {/* MCQ Options */}
                  {section.type === "MCQ" && aiGenerated.options && aiGenerated.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {aiGenerated.options.map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const isCorrect =
                          aiGenerated.answer === letter ||
                          aiGenerated.answer.toLowerCase() === opt.toLowerCase() ||
                          aiGenerated.answer.startsWith(letter);

                        return (
                          <div
                            key={idx}
                            className={`rounded-lg border p-2.5 text-xs flex items-start gap-2 ${
                              isCorrect
                                ? "border-emerald-300 bg-emerald-50/60 font-semibold text-emerald-950"
                                : "border-slate-200 bg-slate-50/60 text-slate-800"
                            }`}
                          >
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                                isCorrect ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {letter}
                            </span>
                            <div className="min-w-0 flex-1">
                              <MathText text={cleanOptionText(opt)} />
                            </div>
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                                Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Case Study Subparts */}
                  {section.type === "CASE_STUDY" && aiGenerated.subparts && aiGenerated.subparts.length > 0 && (
                    <div className="space-y-2.5 rounded-lg border border-purple-100 bg-purple-50/30 p-3">
                      <span className="font-bold text-xs text-purple-950 uppercase tracking-wider block">
                        Sub-questions ({aiGenerated.subparts.length})
                      </span>
                      {aiGenerated.subparts.map((sp, idx) => (
                        <div key={idx} className="rounded-lg border border-purple-200/80 bg-white p-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>{sp.label || `(${idx + 1})`}</span>
                            <span className="badge">{sp.marks} mark{sp.marks > 1 ? "s" : ""}</span>
                          </div>
                          <p className="text-slate-700">
                            <MathText text={sp.text} />
                          </p>
                          {sp.answer && (
                            <div className="pt-1 text-[11px] text-emerald-800">
                              <span className="font-semibold">Answer: </span>
                              <MathText text={sp.answer} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Model Answer / Solution */}
                  {aiGenerated.answer && section.type !== "MCQ" && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-xs space-y-1">
                      <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wider">
                        Model Answer / Marking Scheme:
                      </span>
                      <div className="text-slate-800 leading-relaxed font-normal">
                        <MathText text={aiGenerated.answer} />
                      </div>
                    </div>
                  )}

                  {aiGenerated.explanation && (
                    <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 leading-relaxed border border-slate-200/60">
                      <span className="font-semibold text-slate-800">Explanation: </span>
                      <MathText text={aiGenerated.explanation} />
                    </div>
                  )}

                  {/* Action Buttons: Retry, Edit, Accept */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleGenerateAiQuestion}
                      disabled={aiBusy}
                      className="btn btn-sm btn-ghost flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900"
                    >
                      <RefreshCw size={13} className={aiBusy ? "animate-spin" : ""} />
                      🔄 Retry / Generate Another
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEditAiQuestion}
                        disabled={aiBusy || aiSaving}
                        className="btn btn-sm btn-ghost flex items-center gap-1.5 text-xs text-indigo-700 hover:bg-indigo-50 border border-indigo-200"
                      >
                        <Pencil size={13} />
                        Edit Before Placing
                      </button>

                      <button
                        type="button"
                        onClick={handleAcceptAiQuestion}
                        disabled={aiBusy || aiSaving}
                        className="btn btn-sm btn-primary flex items-center gap-1.5 text-xs shadow-xs"
                      >
                        {aiSaving ? (
                          <>
                            <Spinner />
                            Placing into Paper...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            Accept &amp; Place into Paper
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">Generate a Board Question with AI</h4>
                  <p className="text-xs text-slate-500 max-w-md mt-1">
                    Select your chapter and difficulty above, then click &ldquo;Generate Question&rdquo;. The AI will craft a question strictly calibrated to your section&apos;s marks and CBSE curriculum standards.
                  </p>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </Modal>
  );
}
