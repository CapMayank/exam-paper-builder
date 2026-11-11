"use client";

import React, { useState, useEffect } from "react";
import { DifficultySelect, useDifficultyProfile } from "@/components/DifficultySelect";
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  BookOpen,
  SlidersHorizontal,
  RotateCcw,
  Plus,
} from "lucide-react";
import { MathText } from "@/components/MathText";
import { QuestionContent } from "@/components/QuestionContent";
import { useToast } from "@/components/ui";
import { answerStageSummary, runAnswerStages } from "@/lib/answerStage";
import { api, retryTransient } from "@/lib/client";
import {
  cleanMatchItem,
  cleanOptionText,
  detectPaperLanguage,
  getMatchColumnInstruction,
  isSubpartQuestionType,
  PaperLanguage,
  parseMatchColumnPairs,
  QUESTION_TYPE_LABEL,
  serializeMatchColumnPair,
} from "@/lib/constants";
import type { GeneratedPaperQuestion } from "@/lib/gemini";
import { planPaperSlotAssignments, slotFitsRole, slotRowRole } from "@/lib/paperAutogen";
import { allowedTypesFor } from "@/lib/sectionTypes";
import { type PaperData, type Section, subpartsTotalMarks, normalizeSubpartMarks } from "@/lib/types";

interface SectionAiModalProps {
  isOpen: boolean;
  section: Section | null;
  paper: PaperData;
  onClose: () => void;
  onCommitted: (updatedPaper: PaperData) => void;
}

/** What the model will write for one question of this form, in the teacher's words. */
function formDescription(type: string, marks: number): string {
  const m = `${marks} mark${marks === 1 ? "" : "s"}`;
  switch (type) {
    case "UNSEEN_PASSAGE":
      return `Each question is one new passage with comprehension sub-questions adding up to ${m}.`;
    case "REFERENCE_CONTEXT":
      return `Each question is an extract from the lesson with sub-questions adding up to ${m}.`;
    case "CASE_STUDY":
      return `Each question is a short case with sub-questions adding up to ${m}.`;
    case "WRITING_SKILL":
      return `Each question is one writing task (letter, notice, paragraph, story…) worth ${m}, with a model answer and marking scheme.`;
    case "GRAMMAR":
      return `Each question tests one grammar point, worth ${m}.`;
    case "MATCH_COLUMN":
      return `Each question is one match-the-columns set worth ${m}.`;
    case "MAP_WORK":
      return `Each question asks for places to be marked on an outline map, worth ${m}.`;
    default:
      return `Each question carries ${m}.`;
  }
}

export function SectionAiModal({
  isOpen,
  section,
  paper,
  onClose,
  onCommitted,
}: SectionAiModalProps) {
  const [difficulty, setDifficulty] = useDifficultyProfile();
  const [language, setLanguage] = useState<PaperLanguage>(() => detectPaperLanguage(paper, paper.items));
  const [chapterMode, setChapterMode] = useState<"auto" | "specific">("auto");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(1);
  const [teacherFocus, setTeacherFocus] = useState<string>("");
  const [generateDiagrams, setGenerateDiagrams] = useState<boolean>(true);
  // which of the section's allowed forms to generate; the default type unless the teacher picks another
  const [aiChoice, setAiChoice] = useState<{ sectionId: string; type: string } | null>(null);
  const allowedTypes = section ? allowedTypesFor(section) : [];
  const aiType =
    aiChoice && section && aiChoice.sectionId === section.id && allowedTypes.includes(aiChoice.type)
      ? aiChoice.type
      : section?.type ?? "";
  const setAiType = (type: string) => section && setAiChoice({ sectionId: section.id, type });

  const [loading, setLoading] = useState<boolean>(false);
  const [committing, setCommitting] = useState<boolean>(false);
  const [commitActivity, setCommitActivity] = useState<string>("");
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedPaperQuestion[]>([]);
  const [step, setStep] = useState<"config" | "preview">("config");

  const isMatchSection = section?.type === "MATCH_COLUMN";
  const isMultiUnitMatch = isMatchSection && (section?.count ?? 1) > 1 && section?.marksEach === 1;

  // Calculate existing question units in section
  const sectionItems = section
    ? paper.items.filter((item) => item.sectionId === section.id)
    : [];

  const placedUnits = sectionItems.reduce((sum, it) => {
    if (isMultiUnitMatch) {
      const pairs = parseMatchColumnPairs(it.question.options, it.question.text, (it.question as any).explanation);
      return sum + (pairs.length > 0 ? Math.min(pairs.length, section.count) : section.count);
    }
    return sum + 1;
  }, 0);

  const remainingUnits = section ? Math.max(0, section.count - placedUnits) : 0;
  const remainingQuestions = isMultiUnitMatch ? (sectionItems.length === 0 ? 1 : 0) : remainingUnits;
  const targetSlotMarks = isMultiUnitMatch ? (section?.count ?? 1) * (section?.marksEach ?? 1) : (section?.marksEach ?? 1);

  // Track chapter quotas and remaining deficits
  const chapterQuotas = React.useMemo(() => {
    return (paper.blueprint.chapters || []).map((bc) => {
      const prog = paper.progress.chapters.find((p) => p.chapterId === bc.chapterId);
      const used = prog?.used ?? 0;
      const target = prog?.target ?? bc.marks;
      const remaining = Math.max(0, target - used);
      return {
        id: bc.chapterId,
        number: bc.chapter?.number ?? 0,
        title: bc.chapter?.title ?? "General",
        targetMarks: target,
        usedMarks: used,
        remainingMarks: remaining,
      };
    });
  }, [paper.blueprint.chapters, paper.progress.chapters]);

  const availableChapters = React.useMemo(() => {
    return chapterQuotas.map((cq) => ({ id: cq.id, number: cq.number, title: cq.title }));
  }, [chapterQuotas]);

  // The blueprint planner's empty slots of this row, by form: a row of six 3-mark questions may plan five short
  // answers (one on the grammar unit) and one unseen passage.
  const plannedSlotsByForm = React.useMemo(() => {
    const out = new Map<string, Array<{ chapterId: string; chapterNumber: number; chapterTitle: string }>>();
    if (!section) return out;
    try {
      for (const sp of planPaperSlotAssignments(paper).sections) {
        if (sp.sectionId === section.id && sp.slots.length > 0) out.set(sp.sectionType, sp.slots);
      }
    } catch {}
    return out;
  }, [paper, section]);

  // Which chapter each new question goes to: the planner's slots for the chosen form first, then chapters suited
  // to that form (a passage, a writing task, grammar). Each entry carries the chapter's real remaining marks.
  const plannedChapterAllocations = React.useMemo(() => {
    if (!section) return [];
    const left = new Map(chapterQuotas.map((c) => [c.id, c.remainingMarks]));
    const take = (c: { id: string; number: number; title: string }) => {
      const before = left.get(c.id) ?? 0;
      left.set(c.id, before - targetSlotMarks);
      return { id: c.id, number: c.number, title: c.title, remainingMarks: before };
    };
    const subject = paper.blueprint.book?.subject;
    const result: Array<{ id: string; number: number; title: string; remainingMarks: number }> = [];
    for (const sl of (plannedSlotsByForm.get(aiType || section.type) ?? []).slice(0, questionCount)) {
      result.push(take({ id: sl.chapterId, number: sl.chapterNumber, title: sl.chapterTitle }));
    }

    const fits = (title: string) => slotFitsRole(aiType || section.type, targetSlotMarks, slotRowRole(title, subject));
    for (let i = result.length; i < questionCount; i++) {
      const byRoom = (pool: typeof chapterQuotas) =>
        pool.filter((c) => (left.get(c.id) ?? 0) >= targetSlotMarks).sort((a, b) => (left.get(b.id) ?? 0) - (left.get(a.id) ?? 0));
      const suited = chapterQuotas.filter((c) => fits(c.title));
      const pick =
        byRoom(suited)[0] ??
        byRoom(chapterQuotas)[0] ??
        [...chapterQuotas].sort((a, b) => (left.get(b.id) ?? 0) - (left.get(a.id) ?? 0))[0];
      if (pick) result.push(take(pick));
    }
    return result;
  }, [paper, section, questionCount, chapterQuotas, targetSlotMarks, aiType, plannedSlotsByForm]);

  useEffect(() => {
    if (isOpen && section) {
      setStep("config");
      setGeneratedQuestions([]);
      setError(null);
      // as many as the planner has empty slots of the row's own form (a passage slot in the row waits for its own run)
      const planned = plannedSlotsByForm.get(section.type)?.length ?? 0;
      setQuestionCount(Math.max(1, Math.min(remainingQuestions, planned > 0 ? planned : 5)));
      const paperLang = detectPaperLanguage(paper, paper.items);
      setLanguage(paperLang === "sa" ? "sa" : paperLang === "hi" ? "hi" : "en");
      if (availableChapters.length > 0) {
        // Default to chapter with highest remaining deficit
        const topDeficit = [...chapterQuotas].sort((a, b) => b.remainingMarks - a.remainingMarks)[0];
        setSelectedChapterId(topDeficit?.id || availableChapters[0].id);
      }
    }
  }, [isOpen, section, remainingQuestions, availableChapters, chapterQuotas, paper, plannedSlotsByForm]);

  if (!isOpen || !section) return null;

  async function handleGenerate() {
    if (!section) return;
    setError(null);
    setLoading(true);

    try {
      // Determine slot targets
      const slots: { chapterId: string; chapterNumber: number; chapterTitle: string; marks: number }[] = [];

      for (let i = 0; i < questionCount; i++) {
        if (chapterMode === "specific" && selectedChapterId) {
          const chap = availableChapters.find((c) => c.id === selectedChapterId);
          slots.push({
            chapterId: selectedChapterId,
            chapterNumber: chap?.number ?? 0,
            chapterTitle: chap?.title || "General",
            marks: targetSlotMarks,
          });
        } else {
          const planned = plannedChapterAllocations[i];
          slots.push({
            chapterId: planned?.id || availableChapters[0]?.id || "",
            chapterNumber: planned?.number ?? availableChapters[0]?.number ?? 0,
            chapterTitle: planned?.title || "General",
            marks: targetSlotMarks,
          });
        }
      }

      const customKey =
        typeof window !== "undefined"
          ? localStorage.getItem("exam_gemini_api_key") || ""
          : "";
      const headers: Record<string, string> = {};
      if (customKey) headers["x-gemini-api-key"] = customKey;

      const res = await retryTransient(() => api<{
        success: boolean;
        isMock?: boolean;
        questions: GeneratedPaperQuestion[];
      }>(`/api/papers/${paper.id}/ai-generate-section`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sectionId: section.id,
          sectionTitle: section.title,
          sectionType: aiType || section.type,
          sectionInstructions: section.instructions,
          marksEach: targetSlotMarks,
          language,
          difficulty,
          teacherFocus,
          generateDiagrams,
          slots: slots.map((s, idx) => ({
            slotIndex: idx,
            chapterId: s.chapterId,
            chapterNumber: s.chapterNumber,
            chapterTitle: s.chapterTitle,
            marks: s.marks,
          })),
          customKey: customKey || undefined,
        }),
      }));

      if (!res.success || !res.questions || res.questions.length === 0) {
        throw new Error("No questions were returned. Please try again.");
      }

      setGeneratedQuestions(res.questions);
      setStep("preview");
    } catch (err: any) {
      setError(err?.message || "Failed to generate questions.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    setError(null);
    setCommitting(true);

    try {
      const processedQuestions = generatedQuestions.map((q) => {
        const isMatch = q.type === "MATCH_COLUMN" || section!.type === "MATCH_COLUMN";
        let opts = q.options || [];
        if (isMatch) {
          const pairs = parseMatchColumnPairs(opts, q.text, q.explanation);
          if (pairs.length > 0 && pairs.some((p) => p.left && p.right)) {
            opts = pairs.map((p) => serializeMatchColumnPair(p.left, p.right));
          }
        }
        let updatedSubparts = q.subparts;
        if (updatedSubparts && updatedSubparts.length > 0) {
          updatedSubparts = normalizeSubpartMarks(updatedSubparts, section!.marksEach, (q as any).attemptCount);
        }
        let updatedOr = q.orQuestion;
        if (updatedOr && updatedOr.subparts && updatedOr.subparts.length > 0) {
          updatedOr = {
            ...updatedOr,
            subparts: normalizeSubpartMarks(updatedOr.subparts, section!.marksEach, (updatedOr as any).attemptCount),
          };
        }
        return {
          ...q,
          type: q.type || aiType || section!.type,
          options: opts,
          subparts: updatedSubparts,
          orQuestion: updatedOr,
        };
      });

      const res = await api<{
        success: boolean;
        addedCount: number;
        paper: PaperData;
      }>(`/api/papers/${paper.id}/ai-commit-section`, {
        method: "POST",
        body: JSON.stringify({
          sectionId: section!.id,
          questions: processedQuestions,
          difficulty,
        }),
      });

      if (!res.success) {
        throw new Error("Failed to commit questions to paper.");
      }

      // the questions are saved; answers come from a separate pass, then the objective keys are re-checked
      const stage = await runAnswerStages(paper.id, { onActivity: setCommitActivity, sectionId: section!.id });
      onCommitted(stage.paper ?? res.paper);
      if (stage.answerError || (stage.check?.disagreements.length ?? 0) > 0) {
        toast.info(
          `${answerStageSummary(stage)}${
            stage.check?.disagreements.length
              ? `: ${stage.check.disagreements.map((d) => `${d.label} (key ${d.storedAnswer}, check ${d.solverAnswer})`).join("; ")}`
              : ""
          }`,
        );
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to insert questions into paper.");
    } finally {
      setCommitting(false);
      setCommitActivity("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI Generate &mdash; {section.title}
              </h2>
              <p className="text-xs text-slate-500">
                {QUESTION_TYPE_LABEL[section.type as keyof typeof QUESTION_TYPE_LABEL] || section.type} &middot;{" "}
                {isMultiUnitMatch
                  ? `1 Set (${section.count} Pairs · ${targetSlotMarks}m)`
                  : `${section.marksEach}m each`}{" "}
                &middot; {placedUnits}/{section.count} {isMultiUnitMatch ? "pairs" : "slots"} filled
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle size={15} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="max-h-[65vh] overflow-y-auto p-6">
          {step === "config" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Number of questions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Questions to Generate
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, remainingQuestions)}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Math.min(Math.max(1, remainingQuestions), Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-hidden"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {isMultiUnitMatch
                      ? `Section requires 1 match set (${section.count} pairs, ${targetSlotMarks} marks)`
                      : remainingQuestions === 0
                      ? "This section is full. Replace a question to change it."
                      : `${remainingQuestions} empty slot${remainingQuestions === 1 ? "" : "s"} left in this section (${remainingUnits * section.marksEach} marks).`}
                  </p>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Difficulty
                  </label>
                  <DifficultySelect value={difficulty} onChange={setDifficulty} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-hidden" />
                </div>
              </div>

              {allowedTypes.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="section-ai-type">
                    Question type
                  </label>
                  <select
                    id="section-ai-type"
                    value={aiType}
                    onChange={(e) => {
                      setAiType(e.target.value);
                      const planned = plannedSlotsByForm.get(e.target.value)?.length ?? 0;
                      if (planned > 0) setQuestionCount(Math.min(Math.max(1, remainingQuestions), planned));
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-hidden"
                  >
                    {allowedTypes.map((t) => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABEL[t as keyof typeof QUESTION_TYPE_LABEL] ?? t}
                        {t === section.type ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">{formDescription(aiType || section.type, targetSlotMarks)}</p>
                </div>
              )}

              {/* Chapter Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chapter Scope &amp; Quota Balancing
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="chapterMode"
                      checked={chapterMode === "auto"}
                      onChange={() => setChapterMode("auto")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium">Auto-balance by blueprint deficit</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="chapterMode"
                      checked={chapterMode === "specific"}
                      onChange={() => setChapterMode("specific")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Target Specific Chapter</span>
                  </label>
                </div>

                {chapterMode === "auto" && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs">
                    <div className="flex items-center justify-between font-semibold text-indigo-950 mb-1">
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={13} className="text-indigo-600" />
                        Planned Deficit Allocation
                      </span>
                      <span className="text-[11px] font-normal text-indigo-700">
                        {targetSlotMarks} mark{targetSlotMarks === 1 ? "" : "s"} per question
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-800/80 mb-2">
                      Questions target chapters with remaining blueprint quota to satisfy paper requirements:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {plannedChapterAllocations.map((alloc, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-white px-2 py-1 text-[11px] text-slate-700 shadow-2xs"
                        >
                          <span className="font-bold text-indigo-600 font-mono">Q{idx + 1}</span>
                          <span className="font-medium truncate max-w-[150px]">Ch {alloc.number}: {alloc.title}</span>
                          <span className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-semibold ${
                            alloc.remainingMarks > 0
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {Math.max(0, alloc.remainingMarks)} marks left
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {chapterMode === "specific" && (
                  <div className="space-y-1.5">
                    <select
                      value={selectedChapterId}
                      onChange={(e) => setSelectedChapterId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-hidden"
                    >
                      {chapterQuotas.map((c) => (
                        <option key={c.id} value={c.id}>
                          Ch {c.number}: {c.title} — {c.remainingMarks}m available of {c.targetMarks}m quota ({c.usedMarks}m used)
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const sel = chapterQuotas.find((c) => c.id === selectedChapterId);
                      if (!sel) return null;
                      const needed = questionCount * targetSlotMarks;
                      const willExceed = needed > sel.remainingMarks;
                      return (
                        <div
                          className={`flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg border ${
                            willExceed
                              ? "bg-amber-50 border-amber-200 text-amber-800"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          <span>
                            Needs <strong>{needed}m</strong> ({questionCount} &times; {targetSlotMarks}m)
                          </span>
                          <span>
                            {willExceed ? (
                              <strong className="text-amber-700">
                                Exceeds chapter quota by {needed - sel.remainingMarks}m
                              </strong>
                            ) : (
                              <span className="text-emerald-700 font-medium">
                                Within quota ({sel.remainingMarks - needed}m remaining)
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Language & Diagram Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as PaperLanguage)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="en">English</option>
                    <option value="sa">Sanskrit (संस्कृतम्)</option>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="bilingual">Bilingual (English + Hindi)</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generateDiagrams}
                      onChange={(e) => setGenerateDiagrams(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Generate Figure Studio diagrams if relevant</span>
                  </label>
                </div>
              </div>

              {/* Teacher instructions / focus */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Guidance / Specific Focus (Optional)
                </label>
                <textarea
                  rows={2}
                  value={teacherFocus}
                  onChange={(e) => setTeacherFocus(e.target.value)}
                  placeholder="e.g. Focus on numerical calculations, real-world case applications, avoid chemical equations..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          ) : (
            /* Preview of generated questions */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Generated {generatedQuestions.length} Question{generatedQuestions.length > 1 ? "s" : ""} for {section.title}
                  </span>
                  <span className="rounded-md bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                    {generatedQuestions.reduce((sum, q) => {
                      if (q.subparts && q.subparts.length > 0) {
                        const m = (q as any).attemptCount
                          ? (q as any).attemptCount * (q.subparts[0]?.marks || 1)
                          : subpartsTotalMarks(q.subparts);
                        return sum + (section.marksEach > 0 && m > section.marksEach ? section.marksEach : m);
                      }
                      return sum + targetSlotMarks;
                    }, 0)} Marks Total
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("config")}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <RotateCcw size={12} /> Reconfigure &amp; Regenerate
                </button>
              </div>

              <div className="space-y-3">
                {generatedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs text-xs space-y-2"
                  >
                    {/* Question Header & Marks */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Question {idx + 1}</span>
                        {q.chapterTitle && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-medium">
                            {q.chapterTitle}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                          {q.difficulty}
                        </span>
                        <span className="rounded bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 font-bold text-indigo-700">
                          {isSubpartQuestionType(q.type || section.type) && q.subparts && q.subparts.length > 0
                            ? `${subpartsTotalMarks(q.subparts)} Mark(s)`
                            : isMultiUnitMatch
                            ? `${targetSlotMarks} Marks (${section.count} Pairs)`
                            : `${targetSlotMarks} Mark(s)`}
                        </span>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div className="font-medium text-slate-900 leading-relaxed">
                      <QuestionContent
                        text={
                          q.type === "MATCH_COLUMN" || section.type === "MATCH_COLUMN"
                            ? getMatchColumnInstruction(q.text)
                            : q.text
                        }
                      />
                    </div>

                    {/* MATCH_COLUMN Two-Column Layout */}
                    {(q.type === "MATCH_COLUMN" || section.type === "MATCH_COLUMN") && q.options && q.options.length > 0 && (() => {
                      const pairs = parseMatchColumnPairs(q.options, q.text, q.explanation);
                      if (pairs.length === 0) return null;
                      const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
                      const romans = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
                      return (
                        <div className="my-2 overflow-hidden rounded-lg border border-slate-200">
                          <div className="grid grid-cols-2 bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 border-b border-slate-200 text-[11px]">
                            <span>Column A (स्तम्भ &apos;अ&apos;)</span>
                            <span>Column B (स्तम्भ &apos;ब&apos;)</span>
                          </div>
                          <div className="divide-y divide-slate-100 bg-white">
                            {pairs.map((p, pIdx) => (
                              <div key={pIdx} className="grid grid-cols-2 px-3 py-1.5 text-slate-700 text-[11px]">
                                <div className="flex items-start gap-1.5 pr-2">
                                  <span className="font-bold text-slate-400 font-mono text-[10px]">
                                    ({letters[pIdx] ?? pIdx + 1})
                                  </span>
                                  <MathText text={cleanMatchItem(p.left)} />
                                </div>
                                <div className="flex items-start gap-1.5 pl-2 border-l border-slate-100">
                                  <span className="font-bold text-slate-400 font-mono text-[10px]">
                                    {romans[pIdx] ?? `(${pIdx + 1})`}
                                  </span>
                                  <MathText text={cleanMatchItem(p.right)} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Standard MCQ / Option Layout */}
                    {q.type !== "MATCH_COLUMN" && section.type !== "MATCH_COLUMN" && q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 pl-2 pt-1">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="text-slate-600 text-[11px]">
                            <span className="font-semibold mr-1">
                              ({String.fromCharCode(97 + oIdx)})
                            </span>
                            <MathText text={opt} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Subparts Layout (Case Study / Multi-part / Unseen Passage / Composite) */}
                    {q.subparts && q.subparts.length > 0 && (
                      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                        <div className="font-semibold text-slate-700 text-[11px]">
                          Sub-questions ({q.subparts.length}):
                        </div>
                        {q.subparts.map((sp, sIdx) => (
                          <div key={sIdx} className="rounded-md bg-slate-50 p-2 text-[11px] space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-1.5 font-medium text-slate-800">
                                <span className="font-bold text-indigo-600 font-mono">{sp.label || `(${sIdx + 1})`}</span>
                                <QuestionContent text={sp.text} />
                              </div>
                              <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                {sp.marks} mark{sp.marks > 1 ? "s" : ""}
                              </span>
                            </div>
                            {sp.options && sp.options.length > 0 && (
                              <div className="grid grid-cols-2 gap-1 pl-4 pt-0.5 text-slate-600">
                                {sp.options.map((opt, oIdx) => (
                                  <div key={oIdx}>
                                    <span className="font-medium mr-1">({String.fromCharCode(97 + oIdx)})</span>
                                    <MathText text={opt} />
                                  </div>
                                ))}
                              </div>
                            )}
                            {sp.answer && (
                              <div className="text-[10px] text-emerald-800 font-medium pl-4">
                                <span className="font-bold">Ans: </span>
                                <MathText text={sp.answer} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Overall Model Answer */}
                    {q.answer && (!q.subparts || q.subparts.length === 0) && (
                      <div className="rounded-lg bg-emerald-50/70 p-2 text-[11px] text-emerald-900 border border-emerald-100">
                        <span className="font-semibold text-emerald-950">Model Answer: </span>
                        <MathText text={q.answer} />
                      </div>
                    )}

                    {/* Internal Choice (OR / अथवा) Question & Answer */}
                    {q.orQuestion && (
                      <div className="mt-2 pt-2 border-t border-dashed border-indigo-200 space-y-2">
                        <div className="flex items-center justify-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-[10px] tracking-wide">
                            OR (अथवा)
                          </span>
                        </div>
                        <div className="font-medium text-slate-900 leading-relaxed">
                          <QuestionContent text={q.orQuestion.text} />
                        </div>
                        {q.orQuestion.answer && (
                          <div className="rounded-lg bg-indigo-50/70 p-2 text-[11px] text-indigo-900 border border-indigo-100">
                            <span className="font-semibold text-indigo-950">OR Model Answer: </span>
                            <MathText text={q.orQuestion.answer} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost text-xs text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>

          {step === "config" ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="btn btn-primary text-xs shadow-xs font-semibold flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Generating with AI…</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Generate Questions</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("config")}
                className="btn btn-ghost border border-slate-200 text-xs text-slate-700 hover:bg-slate-100 font-medium"
              >
                Back
              </button>
              <button
                type="button"
                disabled={committing}
                onClick={handleCommit}
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-xs font-semibold flex items-center gap-1.5"
              >
                {committing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>{commitActivity ? (commitActivity.startsWith("Key check") ? "Checking answer keys…" : "Writing answer key…") : "Inserting…"}</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    <span>Insert All ({generatedQuestions.length}) into Section</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
