"use client";

import { AlertTriangle, CheckCircle2, Pencil, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { QuestionForm } from "@/components/QuestionForm";
import { PasteQuestionsPanel } from "@/components/PasteQuestionsPanel";
import { isExhaustedUsage, QuestionFreshnessAlert, QuestionUsagePills } from "@/components/QuestionUsageHistory";
import { QuestionView } from "@/components/QuestionView";
import { ErrorBanner, Modal, Spinner } from "@/components/ui";
import { pairMarksProblem, slotPlacement, spansSlots, subpartsMarksProblem, toPlacedItems, whyCannotAdd, type BlueprintDef } from "@/lib/blueprint";
import { allowedTypesFor, isTypeAllowed, typeLabels } from "@/lib/sectionTypes";
import { SKILLS } from "@/lib/questionTagging";
import { aiQuestionPayload } from "@/lib/aiQuestionPayload";
import { api, retryTransient } from "@/lib/client";
import {
  cleanMatchItem,
  cleanOptionText,
  detectPaperLanguage,
  DIFFICULTIES,
  getMatchColumnInstruction,
  isKindergartenType,
  isSubpartQuestionType,
  PaperLanguage,
  parseMatchColumnPairs,
  QUESTION_TYPE_LABEL,
} from "@/lib/constants";
import { type Book, type PaperData, type QuestionDto, type Section, subpartsTotalMarks } from "@/lib/types";
import { OR_CHAPTER_GUIDELINE, OR_CHAPTER_REQUIRED, orChapterRule, paperSectionChoiceRequirement } from "@/lib/internalChoiceRules";
import {
  canPasteSeveral,
  chapterOptionIds,
  difficultyLabel,
  skillLabel,
  modalTitle as buildModalTitle,
  openingTab,
  showTypeChips,
  type ModalMode,
  type SourceTab,
} from "@/lib/questionModal";
import { MathText } from "./MathText";
import { QuestionContent } from "./QuestionContent";
import type { GeneratedPaperQuestion, GeneratedQuestionItem } from "@/lib/gemini";

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

  const mode: ModalMode = isAlternate ? "or" : isReplacing ? "replace" : "add";
  // The same tab every time (Write), so the modal is usable at once; the bank list loads in the background.
  const [tab, setTab] = useState<SourceTab>(() => openingTab(mode));
  // Inside Write: several questions pasted at once instead of the one-question form.
  const [pasting, setPasting] = useState(false);
  // once opened, the paste panel stays mounted (hidden) so going back to one question keeps the pasted text
  const [pasteOpened, setPasteOpened] = useState(false);
  // An OR question's chapter: from class 9 it must be the main question's ("required"); below that it is advice.
  const orRule = isAlternate ? orChapterRule(paper.blueprint.book.className) : null;
  const mainChapterId = isAlternate && activeItem ? activeItem.question.chapterId : null;
  const orChapterLocked = orRule === "required" && Boolean(mainChapterId);
  // A slot is a marks contract; the teacher picks which of its allowed forms to fill it with.
  const allowedTypes = useMemo(() => allowedTypesFor(section), [section]);
  // memoized with the list it reads, so the React Compiler can keep this component's other memos
  const chips = useMemo(() => showTypeChips(allowedTypes, mode), [allowedTypes, mode]);
  const [pickType, setPickType] = useState<string>(section.type);
  // flexible marks: marks per pair for a match question added to a one-mark section (chosen before it is placed)
  const [pairMarksPick, setPairMarksPick] = useState<1 | 0.5>(1);
  const [bank, setBank] = useState<QuestionDto[]>([]);
  const [bankError, setBankError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    chapterId: isAlternate && activeItem ? activeItem.question.chapterId : "",
    difficulty: "",
    q: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [addingQuestionId, setAddingQuestionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);

  // AI Generator state
  const [initialForEdit, setInitialForEdit] = useState<QuestionDto | undefined>(undefined);
  // an OR question starts on its main question's chapter (replaced by the neediest one if the blueprint lacks it)
  const [aiChapterId, setAiChapterId] = useState<string>(mainChapterId ?? "");
  const [aiDifficulty, setAiDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [aiCognitiveLevel, setAiCognitiveLevel] = useState<string>("UNDERSTANDING");
  const [aiLanguage, setAiLanguage] = useState<PaperLanguage>(() => detectPaperLanguage(paper, paper.items));
  const [aiTopicContext, setAiTopicContext] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState<GeneratedQuestionItem | null>(null);
  const [aiIsMock, setAiIsMock] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);

  const def: BlueprintDef = useMemo(
    () => ({
      sections: paper.blueprint.sections,
      chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks, unitKey: c.unitKey, unitTitle: c.unitTitle })),
    }),
    [paper.blueprint],
  );

  const isMultiUnitMatch = section.type === "MATCH_COLUMN" && section.count > 1;
  const targetSlotMarks = isMultiUnitMatch ? section.count * section.marksEach : section.marksEach;

  const placed = useMemo(
    () => toPlacedItems(paper.blueprint.sections, paper.items.filter((i) => i.id !== replacingItemId)),
    [paper.blueprint.sections, paper.items, replacingItemId],
  );

  // counted exactly as the server counts it
  const activeItemMarks = activeItem ? slotPlacement(section, activeItem.question).marks : 0;

  const sectionStatus = paper.progress.sections.find((s) => s.id === section.id)!;
  // flexible marks: an AI match in another form's one-mark section covers the free slots, one pair per slot
  const spanningMatchPick = pickType === "MATCH_COLUMN" && section.type !== "MATCH_COLUMN" && spansSlots(section);
  // at 1/2 mark per pair the free slots hold twice as many pairs (an even number, so the marks stay whole)
  const marksToGenerate = spanningMatchPick
    ? Math.min(10, Math.max(2, (sectionStatus.needed - sectionStatus.filled) * (pairMarksPick === 0.5 ? 2 : 1)))
    : targetSlotMarks;

  const full = !isReplacing && !isAlternate && sectionStatus.filled >= sectionStatus.needed;

  // Every blueprint chapter may take this section's question: weightage is a guide, not a gate
  // (locked to the main question's chapter for an OR question where the same chapter is required).
  const openChapters = orChapterLocked
    ? paper.blueprint.chapters.filter((c) => c.chapterId === mainChapterId)
    : paper.blueprint.chapters;

  // How far each chapter is below its target (negative when above); the replaced question's marks do not count.
  const chapterGaps = useMemo<Record<string, number>>(
    () =>
      Object.fromEntries(
        paper.blueprint.chapters.map((c) => {
          const prog = paper.progress.chapters.find((p) => p.chapterId === c.chapterId);
          let used = prog?.used ?? 0;
          if (activeItem && activeItem.question.chapterId === c.chapterId && isReplacing) used -= activeItemMarks;
          return [c.chapterId, (prog?.target ?? c.marks) - used];
        }),
      ),
    [paper.blueprint.chapters, paper.progress.chapters, activeItem, isReplacing, activeItemMarks],
  );

  useEffect(() => {
    const sp = new URLSearchParams({ bookId: paper.blueprint.bookId, type: pickType, excludePaperId: paper.id });
    Object.entries(filters).forEach(([k, v]) => v && sp.set(k, v));
    // where the same chapter is only a guideline the chapter follows the filter
    if (orChapterLocked && mainChapterId) {
      sp.set("chapterId", mainChapterId);
    }
    const t = setTimeout(() => {
      setLoading(true);
      setBankError(null);
      api<QuestionDto[]>(`/api/questions?${sp}`)
        .then(setBank, (e) => setBankError(e.message))
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(t);
  }, [paper.id, paper.blueprint.bookId, pickType, filters, orChapterLocked, mainChapterId]);

  // Smart assist: questions that fit the blueprint come first, then least-used, then newest.
  const ranked = useMemo(() => {
    return bank
      .map((q) => {
        let why: string | null = null;
        if (isAlternate) {
          if (activeItem && q.id === activeItem.question.id) {
            why = "This is the main question of this slot.";
          } else if (paper.items.some((i) => i.question.id === q.id || i.orQuestion?.id === q.id)) {
            why = "Already used in this paper.";
          } else if (!isTypeAllowed(section, q.type)) {
            why = `Must be a type this section accepts (${typeLabels(allowedTypes)}).`;
          } else if (orChapterLocked && activeItem && q.chapterId !== activeItem.question.chapterId) {
            why = `Must be from the same chapter as the main question (Ch ${activeItem.question.chapter?.number}).`;
          } else if (subpartsMarksProblem(section, q)) {
            why = `Its parts: ${subpartsMarksProblem(section, q)}`;
          }
        } else {
          if (paper.items.some((i) => (i.question.id === q.id || i.orQuestion?.id === q.id) && i.id !== replacingItemId)) {
            why = "Already used in this paper.";
          } else if (isReplacing && activeItem?.orQuestion?.id === q.id) {
            why = "This is the OR question of this slot.";
          } else {
            // the same two checks the server makes when the question is added
            const marksProblem = subpartsMarksProblem(section, q);
            const pairValue = spanningMatchPick && q.type === "MATCH_COLUMN" ? pairMarksPick : undefined;
            const pairProblem =
              pairValue === 0.5
                ? pairMarksProblem(section, parseMatchColumnPairs(q.options, q.text, (q as { explanation?: string }).explanation).length, 0.5)
                : null;
            why = marksProblem
              ? `Its parts: ${marksProblem}`
              : pairProblem
              ? pairProblem
              : whyCannotAdd(def, placed, {
                  sectionId: section.id,
                  chapterId: q.chapterId,
                  type: q.type,
                  ...slotPlacement(section, pairValue ? { ...q, pairMarks: pairValue } : q),
                  passageGroupId: q.passageGroupId,
                });
          }
        }
        return { q, why };
      })
      // questions that fit come first (for an OR, those from the main question's chapter first among them), then those
      // from the most under-covered chapters, then the least used and newest
      .sort(
        (a, b) =>
          Number(!!a.why) - Number(!!b.why) ||
          (mainChapterId ? Number(b.q.chapterId === mainChapterId) - Number(a.q.chapterId === mainChapterId) : 0) ||
          (chapterGaps[b.q.chapterId] ?? 0) - (chapterGaps[a.q.chapterId] ?? 0) ||
          (a.q.timesUsed ?? 0) - (b.q.timesUsed ?? 0) ||
          Date.parse(b.q.createdAt ?? "") - Date.parse(a.q.createdAt ?? "") ||
          0,
      );
  }, [chapterGaps, bank, placed, def, section.id, isAlternate, activeItem, paper.items, pickType, targetSlotMarks, isMultiUnitMatch, replacingItemId, orChapterLocked, mainChapterId, pairMarksPick, spanningMatchPick]);

  /** Resolves true when the question was placed; false when it was refused (the error is shown in the banner). */
  async function add(questionId: string, orQuestionId?: string | null): Promise<boolean> {
    if (addingQuestionId) return false;
    setAddingQuestionId(questionId);
    setError(null);
    const targetQ = bank.find((q) => q.id === questionId);
    // Optimistically remove question from bank view for standard slot addition
    if (!isAlternate && !isReplacing) {
      setBank((b) => b.filter((q) => q.id !== questionId));
    }
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
          json: { replaceWithQuestionId: questionId, orQuestionId },
        });
        onPaper(updated);
        onClose();
      } else {
        const updated = await api<PaperData>(`/api/papers/${paper.id}/questions`, {
          method: "POST",
          json: {
            sectionId: section.id,
            questionId,
            orQuestionId,
            ...(spanningMatchPick && pairMarksPick === 0.5 ? { pairMarks: 0.5 } : {}),
          },
        });
        onPaper(updated);
        const s = updated.progress.sections.find((x) => x.id === section.id)!;
        if (s.filled >= s.needed) onClose();
      }
      return true;
    } catch (e) {
      // Revert optimistic removal on failure so the question remains available in the bank
      if (targetQ && !isAlternate && !isReplacing) {
        setBank((b) => (b.some((q) => q.id === questionId) ? b : [targetQ, ...b]));
      }
      setError((e as Error).message);
      return false;
    } finally {
      setAddingQuestionId(null);
    }
  }

  async function handleBatchInsert() {
    if (selectedIds.size === 0) return;
    setBatchBusy(true);
    setError(null);
    const prevBank = bank;
    setBank((b) => b.filter((q) => !selectedIds.has(q.id)));
    try {
      const res = await api<{ success: boolean; addedCount: number; message: string; paper: PaperData }>(
        `/api/papers/${paper.id}/questions/bulk`,
        {
          method: "POST",
          json: {
            sectionId: section.id,
            questionIds: Array.from(selectedIds),
          },
        }
      );
      onPaper(res.paper);
      onClose();
    } catch (e) {
      // Revert optimistic removal on batch insert failure
      setBank(prevBank);
      setError((e as Error).message);
    } finally {
      setBatchBusy(false);
    }
  }

  useEffect(() => {
    if (openChapters.length > 0) {
      if (!aiChapterId || !openChapters.some((c) => c.chapterId === aiChapterId)) {
        // default to the chapter furthest below its target
        const neediest = [...openChapters].sort((a, b) => (chapterGaps[b.chapterId] ?? 0) - (chapterGaps[a.chapterId] ?? 0))[0];
        setAiChapterId(neediest.chapterId);
      }
    }
  }, [openChapters, aiChapterId, chapterGaps]);

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

      // The slot this question fills: the replaced one, or the next empty one. The section's OR rules depend on it.
      const sectionItems = paper.items.filter((i) => i.sectionId === section.id).sort((a, b) => a.position - b.position);
      const slotPos = activeItem ? sectionItems.findIndex((i) => i.id === activeItem.id) : sectionItems.length;

      // Same pipeline as full-paper generation: curriculum contract, the paper's other questions as "do not repeat",
      // per-question verification and repair, validation retries, and the section's internal-choice (OR) rules.
      const res = await retryTransient(() =>
        api<{ success: boolean; isMock: boolean; questions: GeneratedPaperQuestion[] }>(
          `/api/papers/${paper.id}/ai-generate-section`,
          {
            method: "POST",
            headers,
            json: {
              sectionId: section.id,
              sectionTitle: section.title,
              sectionType: pickType,
              sectionInstructions: section.instructions,
              marksEach: marksToGenerate,
              ...(spanningMatchPick ? { pairMarks: pairMarksPick } : {}),
              language: aiLanguage,
              difficulty: aiDifficulty,
              teacherFocus: [
                aiTopicContext.trim(),
                `Cognitive level for this question: ${aiCognitiveLevel}.`,
                isReplacing && activeItem ? "This question replaces one the teacher removed from the paper; write a different question, not a variant of it." : "",
              ]
                .filter(Boolean)
                .join(" "),
              generateDiagrams: false,
              // a single question is reviewed right away, so it comes with its full model answer
              answerMode: "together",
              customKey: customKey || undefined,
              alternateForItemId: isAlternate ? alternateTargetItemId : undefined,
              slots: [
                {
                  slotIndex: Math.max(0, slotPos),
                  chapterId: aiChapterId,
                  chapterNumber: selectedChapter.number,
                  chapterTitle: selectedChapter.title,
                  marks: marksToGenerate,
                  targetDifficulty: aiDifficulty,
                },
              ],
            },
          },
        ),
      );

      const q = res.questions?.[0];
      if (!q || !q.text?.trim()) {
        setAiError("No question was generated. Please try again.");
        return;
      }
      setAiGenerated({ ...q, marks: marksToGenerate } as unknown as GeneratedQuestionItem);
      setAiIsMock(res.isMock);
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

      const choiceReq = paperSectionChoiceRequirement(paper, section);

      const bookId = paper.blueprint.bookId;
      const payload = aiQuestionPayload({
        generated: aiGenerated,
        bookId,
        chapterId: aiChapterId,
        type: pickType,
        slotMarks: marksToGenerate,
        difficulty: aiDifficulty,
        skill: aiCognitiveLevel,
      });

      const created = await api<QuestionDto>("/api/questions", {
        method: "POST",
        json: payload,
      });

      let createdOrId: string | null = null;
      if (!isAlternate && !choiceReq.forbidden && aiGenerated.orQuestion && aiGenerated.orQuestion.text?.trim()) {
        const orPayload = aiQuestionPayload({
          generated: aiGenerated.orQuestion,
          bookId,
          chapterId: aiChapterId,
          type: aiGenerated.orQuestion.type || pickType,
          slotMarks: marksToGenerate,
          difficulty: aiDifficulty,
          skill: aiCognitiveLevel,
        });
        const createdOr = await api<QuestionDto>("/api/questions", {
          method: "POST",
          json: orPayload,
        });
        createdOrId = createdOr.id;
      }

      await add(created.id, createdOrId);
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
      ...aiQuestionPayload({
        generated: aiGenerated,
        bookId: paper.blueprint.bookId,
        chapterId: aiChapterId,
        type: pickType,
        slotMarks: marksToGenerate,
        difficulty: aiDifficulty,
        skill: aiCognitiveLevel,
      }),
      imagePath: null,
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
    // the Write form stays mounted across tabs, so it is remounted to load the draft
    setFormKey((k) => k + 1);
    setPasting(false);
    setTab("write");
  }

  const modalTitle = buildModalTitle({ mode, sectionTitle: section.title, type: pickType, marks: marksToGenerate, chips });
  const slotsLeft = Math.max(0, sectionStatus.needed - sectionStatus.filled);
  const pasteOffered = canPasteSeveral({ mode, type: pickType, slotsLeft });
  const showPaste = pasting && pasteOffered;
  const orRuleLine = orRule === "required" ? OR_CHAPTER_REQUIRED : orRule === "guideline" ? OR_CHAPTER_GUIDELINE : null;
  // the bank's chapter filter lists the blueprint's chapters, plus the main question's own when the blueprint lacks it
  const mainChapterOutsideBlueprint =
    orRule === "guideline" && activeItem && !paper.blueprint.chapters.some((c) => c.chapterId === mainChapterId)
      ? activeItem.question.chapter
      : null;

  return (
    <Modal
      title={modalTitle}
      subtitle={mode === "add" ? `${section.title}: ${sectionStatus.filled} of ${sectionStatus.needed} slots filled.` : undefined}
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <ErrorBanner message={error} />

        <div className="flex gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1 text-xs font-semibold">
          <button
            type="button"
            aria-pressed={tab === "bank"}
            onClick={() => setTab("bank")}
            className={`flex-1 rounded-lg py-2 transition ${
              tab === "bank"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            From bank ({ranked.length})
          </button>
          <button
            type="button"
            aria-pressed={tab === "write"}
            onClick={() => setTab("write")}
            className={`flex-1 rounded-lg py-2 transition ${
              tab === "write"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Write
          </button>
          <button
            type="button"
            aria-pressed={tab === "ai"}
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

        {chips && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Question type">
            <span className="text-xs font-medium text-slate-500">Question type:</span>
            {allowedTypes.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={pickType === t}
                onClick={() => {
                  // the Write form switches type itself and keeps the typed text, so it is not remounted
                  setPickType(t);
                  setAiGenerated(null);
                  // bank selections were of the old type and are no longer listed
                  setSelectedIds(new Set());
                  // a type that cannot be pasted closes (and discards) the paste panel
                  if (!canPasteSeveral({ mode, type: t, slotsLeft })) {
                    setPasting(false);
                    setPasteOpened(false);
                  }
                }}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${pickType === t ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
              >
                {QUESTION_TYPE_LABEL[t as keyof typeof QUESTION_TYPE_LABEL] ?? t}
              </button>
            ))}
          </div>
        )}

        {spanningMatchPick && !isAlternate && !isReplacing && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600" role="group" aria-label="Marks per pair">
            <span className="font-medium text-slate-500">Marks per pair:</span>
            {([1, 0.5] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={pairMarksPick === v}
                onClick={() => setPairMarksPick(v)}
                className={`rounded-full border px-2.5 py-0.5 ${pairMarksPick === v ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
              >
                {v === 1 ? "1 mark" : "1/2 mark"}
              </button>
            ))}
            <span className="text-slate-500">A match takes one slot per mark (e.g. 6 pairs at 1/2 = 3 marks).</span>
          </div>
        )}

        {tab === "bank" && (
          <>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <select
                className="input text-xs"
                value={orChapterLocked && mainChapterId ? mainChapterId : filters.chapterId}
                disabled={orChapterLocked}
                onChange={(e) => setFilters({ ...filters, chapterId: e.target.value })}
                aria-label="Chapter"
              >
                {orChapterLocked && activeItem ? (
                  <option value={activeItem.question.chapterId}>
                    Ch {activeItem.question.chapter?.number}. {activeItem.question.chapter?.title} (same as main question)
                  </option>
                ) : (
                  <>
                    <option value="">All chapters</option>
                    {paper.blueprint.chapters.map((c) => (
                      <option key={c.chapterId} value={c.chapterId}>
                        Ch {c.chapter.number}. {c.chapter.title}
                      </option>
                    ))}
                    {mainChapterOutsideBlueprint && mainChapterId && (
                      <option value={mainChapterId}>
                        Ch {mainChapterOutsideBlueprint.number}. {mainChapterOutsideBlueprint.title}
                      </option>
                    )}
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
                  <option key={d} value={d}>
                    {difficultyLabel(d)}
                  </option>
                ))}
              </select>

              <input
                className="input text-xs"
                placeholder="Search question text…"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
            </div>

            {orRuleLine && <p className="text-xs text-slate-600">{orRuleLine}</p>}

            <ErrorBanner message={bankError} />

            <ul className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
              {loading && ranked.length === 0 && !bankError && (
                <li className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                  <Spinner size="sm" /> Loading questions…
                </li>
              )}
              {ranked.map(({ q, why }, idx) => (
                <li
                  key={q.id}
                  className={`rounded-xl border p-3.5 transition ${
                    why
                      ? "border-slate-200 bg-slate-50/70 opacity-65"
                      : selectedIds.has(q.id)
                      ? "border-indigo-400 bg-indigo-50/20 ring-2 ring-indigo-500/50 shadow-xs"
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
                      <span className="badge font-semibold">{difficultyLabel(q.difficulty)}</span>
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
                        <>
                          {!isAlternate && !isReplacing && (
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100 transition select-none">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(q.id)}
                                onChange={() => {
                                  setSelectedIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(q.id)) next.delete(q.id);
                                    else next.add(q.id);
                                    return next;
                                  });
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-[11px]">Select</span>
                            </label>
                          )}
                          <button
                            className="btn btn-sm btn-primary shadow-2xs"
                            disabled={addingQuestionId !== null || batchBusy}
                            onClick={() => add(q.id)}
                          >
                            {addingQuestionId === q.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <Plus size={13} />
                            )}{" "}
                            {isAlternate
                              ? "Set as OR question"
                              : isReplacing
                              ? "Use as Replacement"
                              : "Add to Slot"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {!loading && !bankError && ranked.length === 0 && (
                <li className="p-8 text-center text-sm text-slate-500">
                  No matching {QUESTION_TYPE_LABEL[pickType as keyof typeof QUESTION_TYPE_LABEL]} questions found.
                  Switch to Write to add a new one.
                </li>
              )}
            </ul>

            {/* Sticky Batch Multi-Select Action Bar */}
            {selectedIds.size > 0 && (
              <div className="sticky bottom-0 -mx-6 -mb-6 mt-3 flex items-center justify-between border-t border-indigo-200 bg-indigo-50/95 px-6 py-2.5 shadow-md backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">
                    {selectedIds.size}
                  </span>
                  <span>{selectedIds.size} question{selectedIds.size > 1 ? "s" : ""} selected for {section.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={batchBusy}
                    className="btn btn-sm btn-ghost text-xs text-indigo-900"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={batchBusy}
                    onClick={handleBatchInsert}
                    className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus size={13} />
                    <span>{batchBusy ? "Inserting…" : `Insert ${selectedIds.size} Question${selectedIds.size > 1 ? "s" : ""}`}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" className="btn" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}

        {/* Write stays mounted (hidden and inert) while another tab is open, so typed text and a retry-as-edit survive */}
        <div hidden={tab !== "write"} inert={tab !== "write"}>
          {full ? (
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
          ) : (
            <div className="space-y-3">
              {showPaste ? (
                <div className="flex justify-end">
                  <button type="button" className="btn btn-sm" onClick={() => setPasting(false)}>
                    Back to one question
                  </button>
                </div>
              ) : (
                pasteOffered && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setPasting(true);
                        setPasteOpened(true);
                      }}
                    >
                      Paste several
                    </button>
                  </div>
                )
              )}
              {pasteOpened && pasteOffered && (
                <div hidden={!showPaste} inert={!showPaste}>
                  <PasteQuestionsPanel
                    paper={paper}
                    section={section}
                    type={pickType}
                    chapters={paper.blueprint.chapters.map((c) => c.chapter)}
                    gaps={chapterGaps}
                    slotsLeft={slotsLeft}
                    onPaper={onPaper}
                    onClose={onClose}
                  />
                </div>
              )}
              {/* hidden, not unmounted, while pasting, so going back keeps what was typed */}
              <div hidden={showPaste} inert={showPaste}>
                <QuestionForm
                  key={formKey}
                  books={books}
                  initial={initialForEdit}
                  fixedBookId={paper.blueprint.bookId}
                  typeFromParent={pickType}
                  targetMarks={section.marksEach}
                  allowedChapterIds={chapterOptionIds(
                    paper.blueprint.chapters.map((c) => c.chapterId),
                    // guideline: the main question's chapter is offered even when the blueprint lacks it
                    orRule === "guideline" ? mainChapterId : null,
                    orChapterLocked ? mainChapterId : null,
                  )}
                  preferredChapterId={orRule === "guideline" ? (mainChapterId ?? undefined) : undefined}
                  chapterHint={orRuleLine ?? undefined}
                  openMarks={chapterGaps}
                  submitLabel={
                    isAlternate
                      ? "Save to Bank & Set as OR question"
                      : isReplacing
                      ? "Save to Bank & Use as Replacement"
                      : "Save to Bank & Add to Paper"
                  }
                  onCancel={() => {
                    setInitialForEdit(undefined);
                    onClose();
                  }}
                  onSaved={async (q) => {
                    // The question is already in the bank. Clear the form only once it is on the paper; if the paper
                    // refused it, keep the text on screen so the teacher can fix the marks/chapter instead of retyping.
                    // Reopen it as an edit of the saved question so the next try updates it instead of saving a duplicate.
                    const placedOk = await add(q.id);
                    setInitialForEdit(placedOk ? undefined : q);
                    setFormKey((k) => k + 1);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {tab === "ai" && (
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
                      {QUESTION_TYPE_LABEL[pickType as keyof typeof QUESTION_TYPE_LABEL]} · {targetSlotMarks} Mark{targetSlotMarks > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {isReplacing && activeItem && (
                  <div className="flex items-center gap-2 rounded-lg bg-indigo-100/70 px-3 py-2 text-xs text-indigo-950 font-medium border border-indigo-200">
                    <RefreshCw size={13} className="text-indigo-700 shrink-0" />
                    <span>
                      Replacing question in <strong>{section.title}</strong> (currently carrying {activeItemMarks}m from Ch {activeItem.question.chapter?.number}). The replacement question will carry <strong>{targetSlotMarks} marks</strong>.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Chapter Selection */}
                  <div className="sm:col-span-2">
                    <label className="label text-[11px]">Chapter</label>
                    <select
                      className="input text-xs"
                      value={aiChapterId}
                      disabled={orChapterLocked}
                      onChange={(e) => setAiChapterId(e.target.value)}
                    >
                      {openChapters.map((c) => {
                        const ch = paper.blueprint.chapters.find((x) => x.chapterId === c.chapterId)?.chapter;
                        const target = paper.progress.chapters.find((p) => p.chapterId === c.chapterId)?.target ?? c.marks;
                        return (
                          <option key={c.chapterId} value={c.chapterId}>
                            Ch {ch?.number}: {ch?.title} ({target - (chapterGaps[c.chapterId] ?? 0)} of {target})
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
                          {difficultyLabel(d)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Skill */}
                  <div>
                    <label className="label text-[11px]">Skill</label>
                    <select className="input text-xs" value={aiCognitiveLevel} onChange={(e) => setAiCognitiveLevel(e.target.value)}>
                      {SKILLS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
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
                      onChange={(e) => setAiLanguage(e.target.value as PaperLanguage)}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (हिंदी)</option>
                      <option value="sa">Sanskrit (संस्कृतम्)</option>
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
                      <span className="badge font-bold">{difficultyLabel(aiGenerated.difficulty)}</span>
                      {skillLabel(aiGenerated.cognitiveLevel) && (
                        <span className="badge badge-indigo font-bold">{skillLabel(aiGenerated.cognitiveLevel)}</span>
                      )}
                      <span className="badge badge-emerald font-bold">
                        {aiGenerated.subparts && aiGenerated.subparts.length > 0
                          ? `${subpartsTotalMarks(aiGenerated.subparts)} Mark(s)`
                          : isMultiUnitMatch
                          ? `${marksToGenerate} Marks (${section.count} Pairs)`
                          : `${aiGenerated.marks || marksToGenerate} Mark${(aiGenerated.marks || marksToGenerate) > 1 ? "s" : ""}`}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-slate-900 text-sm leading-relaxed font-medium">
                    <QuestionContent
                      text={
                        pickType === "MATCH_COLUMN"
                            ? getMatchColumnInstruction(aiGenerated.text)
                            : aiGenerated.text
                      }
                    />
                  </div>

                  {/* MCQ Options */}
                  {pickType === "MCQ" && aiGenerated.options && aiGenerated.options.length > 0 && (
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

                  {/* Match the Columns Preview */}
                  {pickType === "MATCH_COLUMN" && (() => {
                    const pairs = parseMatchColumnPairs(aiGenerated.options || [], aiGenerated.text, aiGenerated.explanation);
                    const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
                    const romans = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];

                    return (
                      <div className="space-y-2 rounded-xl border border-teal-200 bg-teal-50/30 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-teal-950 uppercase tracking-wider block">
                            Matching Columns Preview (स्तम्भ &apos;अ&apos; ↔ स्तम्भ &apos;ब&apos;)
                          </span>
                          <span className="text-[11px] font-semibold text-teal-800">
                            {pairs.length} Matching Pairs
                          </span>
                        </div>
                        {pairs.length > 0 ? (
                          <div className="overflow-hidden rounded-lg border border-teal-200 bg-white">
                            <div className="grid grid-cols-2 bg-teal-100/70 px-3 py-1.5 font-semibold text-teal-950 border-b border-teal-200 text-xs">
                              <span>Column I / स्तम्भ &apos;अ&apos;</span>
                              <span className="pl-2 border-l border-teal-200">Column II / स्तम्भ &apos;ब&apos;</span>
                            </div>
                            <div className="divide-y divide-teal-100">
                              {pairs.map((p, pIdx) => (
                                <div key={pIdx} className="grid grid-cols-2 px-3 py-2 text-slate-800 text-xs items-start">
                                  <div className="flex items-start gap-1.5 pr-2">
                                    <span className="font-bold text-teal-700 font-mono text-[11px] shrink-0">
                                      ({letters[pIdx] ?? pIdx + 1})
                                    </span>
                                    <div className="min-w-0 flex-1 leading-relaxed">
                                      <MathText text={cleanMatchItem(p.left)} />
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-1.5 pl-2 border-l border-teal-100">
                                    <span className="font-bold text-slate-500 font-mono text-[11px] shrink-0">
                                      {romans[pIdx] ?? `(${pIdx + 1})`}
                                    </span>
                                    <div className="min-w-0 flex-1 leading-relaxed">
                                      <MathText text={cleanMatchItem(p.right)} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-900 text-center">
                            ⚠ No matching pairs detected. Please click Retry or Edit Before Placing.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Multi-part Subparts (Case Study, Unseen Passage, Reference to Context) */}
                  {(pickType === "CASE_STUDY" || isSubpartQuestionType(pickType) || (aiGenerated.subparts && aiGenerated.subparts.length > 0)) &&
                    aiGenerated.subparts &&
                    aiGenerated.subparts.length > 0 && (
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
                            <QuestionContent text={sp.text} />
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

                  {/* Internal Choice (OR / अथवा) Question Preview */}
                  {aiGenerated.orQuestion && (
                    <div className="space-y-2.5 rounded-lg border border-indigo-200 bg-indigo-50/40 p-3">
                      <div className="flex items-center justify-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-900 font-bold text-xs tracking-wide">
                          OR question (अथवा)
                        </span>
                      </div>
                      <div className="font-medium text-slate-900 leading-relaxed text-xs">
                        <QuestionContent text={aiGenerated.orQuestion.text} />
                      </div>
                      {aiGenerated.orQuestion.answer && (
                        <div className="rounded-lg border border-indigo-100 bg-white p-2.5 text-xs text-indigo-950 font-normal">
                          <span className="font-semibold text-indigo-900 block text-[11px] uppercase tracking-wide">
                            OR Model Answer:
                          </span>
                          <MathText text={aiGenerated.orQuestion.answer} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Model Answer / Solution */}
                  {aiGenerated.answer && pickType !== "MCQ" && (
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
