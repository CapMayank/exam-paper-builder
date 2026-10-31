"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Palette,
  Play,
  RotateCcw,
  Sparkles,
  StopCircle,
  X,
} from "lucide-react";
import { MathText } from "@/components/MathText";
import { ErrorBanner, Modal, Spinner, useToast } from "@/components/ui";
import { renderDocToBlob } from "@/components/figure-studio/render";
import { embedSceneInPng } from "@/components/figure-studio/pngMeta";
import type { Doc, GridSettings, SceneFile } from "@/components/figure-studio/types";
import { api, imageUrl, uploadImage } from "@/lib/client";
import {
  cleanMatchItem,
  cleanOptionText,
  getMatchColumnInstruction,
  isSubpartQuestionType,
  PaperLanguage,
  parseMatchColumnPairs,
  QUESTION_TYPE_LABEL,
  type QuestionType,
} from "@/lib/constants";
import { getMaxPaperDiagramBudget, isSectionVisuallyEligible } from "@/lib/diagram-rules";
import type { GeneratedPaperQuestion } from "@/lib/gemini";
import type { PaperAutogenPlan } from "@/lib/paperAutogen";
import { normalizeSubpartMarks, type PaperData } from "@/lib/types";

interface AIPaperGeneratorModalProps {
  paperId: string;
  paperTitle: string;
  open: boolean;
  onClose: () => void;
  onPaperUpdated: (paper: PaperData) => void;
}

export function AIPaperGeneratorModal({
  paperId,
  paperTitle,
  open,
  onClose,
  onPaperUpdated,
}: AIPaperGeneratorModalProps) {
  const toast = useToast();

  // Config & state
  const [loadingPlan, setLoadingPlan] = useState<boolean>(true);
  const [plan, setPlan] = useState<PaperAutogenPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form parameters
  const [language, setLanguage] = useState<PaperLanguage>("en");
  const [difficulty, setDifficulty] = useState<"BALANCED" | "EASY" | "MEDIUM" | "HARD">("BALANCED");
  const [modelTier, setModelTier] = useState<string>("gemini-2.5-pro");
  const [generateDiagrams, setGenerateDiagrams] = useState<boolean>(true);
  const [teacherFocus, setTeacherFocus] = useState<string>("");
  const [generationMode, setGenerationMode] = useState<"fill" | "fresh">("fresh");

  // Running generation state
  const [status, setStatus] = useState<"config" | "generating" | "done" | "stopped">("config");
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [currentSectionTitle, setCurrentSectionTitle] = useState<string>("");
  const [sectionStage, setSectionStage] = useState<1 | 2 | 3>(1);
  const [currentActivity, setCurrentActivity] = useState<string>("");
  const [generatedQuestions, setGeneratedQuestions] = useState<
    (GeneratedPaperQuestion & { imagePath?: string; sectionTitle: string; slotsFilled?: number })[]
  >([]);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<number>>(new Set());
  const [latestPaper, setLatestPaper] = useState<PaperData | null>(null);

  const abortRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Fetch plan when modal opens
  useEffect(() => {
    if (!open) {
      abortControllerRef.current?.abort();
      return;
    }
    abortControllerRef.current?.abort();
    let mounted = true;
    setLoadingPlan(true);
    setError(null);
    setStatus("config");
    setGeneratedQuestions([]);
    abortRef.current = false;

    api<{ success: boolean; plan: PaperAutogenPlan }>(`/api/papers/${paperId}/ai-plan`)
      .then((res) => {
        if (!mounted) return;
        setPlan(res.plan);
        if (res.plan.language) {
          setLanguage(res.plan.language);
          return;
        }
        const sub = (res.plan.subject || "").split("/")[0].trim().toLowerCase();
        const bTitle = (res.plan.bookTitle || "").split("/")[0].trim().toLowerCase();
        const pTitle = (res.plan.title || "").split("/")[0].trim().toLowerCase();
        const devanagariRegex = /[\u0900-\u097F]/;
        const isSanskrit =
          sub.includes("sanskrit") ||
          sub.includes("संस्कृत") ||
          bTitle.includes("sanskrit") ||
          bTitle.includes("शेमुषी") ||
          bTitle.includes("shemushi") ||
          pTitle.includes("sanskrit") ||
          pTitle.includes("संस्कृत");
        if (isSanskrit) {
          setLanguage("sa");
        } else if (
          sub.includes("hindi") ||
          sub.includes("हिंदी") ||
          sub.includes("हिन्दी") ||
          bTitle.includes("hindi") ||
          bTitle.includes("हिंदी") ||
          devanagariRegex.test(sub) ||
          devanagariRegex.test(pTitle) ||
          devanagariRegex.test(bTitle)
        ) {
          setLanguage("hi");
        } else {
          setLanguage("en");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Failed to load generation plan for this paper.");
      })
      .finally(() => {
        if (mounted) setLoadingPlan(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, paperId]);

  const toggleAnswer = (idx: number) => {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleStop = () => {
    abortRef.current = true;
    setCurrentActivity("Finishing and committing current section before pausing...");
  };

  const handleCancelGeneration = async () => {
    abortRef.current = true;
    abortControllerRef.current?.abort();
    setStatus("stopped");
    setCurrentActivity("Cancelling generation and cleaning up draft questions...");
    try {
      await api(`/api/papers/${paperId}/clear-questions`, { method: "POST" });
      const freshPlanRes = await api<{ success: boolean; plan: PaperAutogenPlan }>(
        `/api/papers/${paperId}/ai-plan`,
      );
      setPlan(freshPlanRes.plan);
      setGeneratedQuestions([]);
      toast.info("Generation cancelled and draft questions cleared.");
    } catch (cleanErr) {
      console.warn("Failed to clear questions on cancel:", cleanErr);
      toast.info("Generation cancelled.");
    } finally {
      setCurrentActivity("");
    }
  };

  const handleClose = () => {
    if (status === "generating") {
      abortRef.current = true;
      abortControllerRef.current?.abort();
    }
    onClose();
  };

  // Section-by-section generator runner
  const handleStartGeneration = async () => {
    if (!plan) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setStatus("generating");
    setError(null);
    abortRef.current = false;
    let currentPlan = plan;

    const hasPlaced = currentPlan.sections.some((s) => s.alreadyPlacedCount > 0);
    if (generationMode === "fresh" && hasPlaced) {
      setCurrentActivity("Clearing previous draft questions for fresh generation...");
      try {
        await api(`/api/papers/${paperId}/clear-questions`, { method: "POST", signal });
        const freshPlanRes = await api<{ success: boolean; plan: PaperAutogenPlan }>(
          `/api/papers/${paperId}/ai-plan`,
          { signal },
        );
        currentPlan = freshPlanRes.plan;
        setPlan(freshPlanRes.plan);
      } catch (clearErr: any) {
        if (signal.aborted) return;
        setError(clearErr?.message || "Failed to clear existing questions.");
        setStatus("config");
        return;
      }
    }

    const pendingSections = currentPlan.sections.filter((s) => s.slots.length > 0);
    if (pendingSections.length === 0) {
      toast.info("This paper already has all question slots filled.");
      setStatus("config");
      return;
    }

    let accumulatedQuestions: (GeneratedPaperQuestion & {
      imagePath?: string;
      sectionTitle: string;
      slotsFilled?: number;
    })[] = [];
    let updatedPaperRef: PaperData | null = null;
    const totalMarks = plan?.totalMarksNeeded || 70;
    const maxPaperDiagrams = getMaxPaperDiagramBudget(totalMarks);
    let paperDiagramCount = 0;

    try {
      for (let i = 0; i < pendingSections.length; i++) {
        if (abortRef.current || signal.aborted) {
          setStatus("stopped");
          toast.info("Current section committed. Generation paused.");
          break;
        }

        const sec = pendingSections[i];
        setCurrentSectionIndex(i);
        setCurrentSectionTitle(sec.sectionTitle);
        setSectionStage(1);
        setCurrentActivity("Formulating questions with Gemini...");

        // Board exam standard: dynamically enforce whole-paper diagram budget and section visual eligibility
        const allowSectionDiagrams = Boolean(
          generateDiagrams &&
          paperDiagramCount < maxPaperDiagrams &&
          isSectionVisuallyEligible(sec.sectionType, plan?.subject)
        );

        // 1. Generate section questions from AI
        const customKey =
          typeof window !== "undefined"
            ? localStorage.getItem("exam_gemini_api_key") || ""
            : "";
        const headers: Record<string, string> = {};
        if (customKey) headers["x-gemini-api-key"] = customKey;

        const genRes = await api<{
          success: boolean;
          isMock: boolean;
          questions: GeneratedPaperQuestion[];
        }>(`/api/papers/${paperId}/ai-generate-section`, {
          method: "POST",
          headers,
          signal,
          json: {
            sectionId: sec.sectionId,
            sectionTitle: sec.sectionTitle,
            sectionType: sec.sectionType,
            sectionInstructions: sec.sectionInstructions,
            marksEach: sec.marksEach,
            language,
            difficulty,
            model: modelTier,
            teacherFocus,
            generateDiagrams: allowSectionDiagrams,
            slots: sec.slots,
            customKey: customKey || undefined,
          },
        });

        // Ensure displayed subpart mark allocations in the preview feed match the calculated values before commit
        const rawQuestions = genRes.questions || [];
        const questions = rawQuestions.map((q) => {
          const updated = { ...q };
          if (updated.subparts && updated.subparts.length > 0) {
            updated.subparts = normalizeSubpartMarks(updated.subparts, sec.marksEach, (updated as any).attemptCount);
          }
          if (updated.orQuestion && updated.orQuestion.subparts && updated.orQuestion.subparts.length > 0) {
            updated.orQuestion = {
              ...updated.orQuestion,
              subparts: normalizeSubpartMarks(updated.orQuestion.subparts, sec.marksEach, (updated.orQuestion as any).attemptCount),
            };
          }
          return updated;
        });

        const hasDiagrams = questions.some(
          (q) => !q.imagePath && q.figureDoc && Array.isArray(q.figureDoc.objects) && q.figureDoc.objects.length > 0
        );

        // 2. Render and upload any vector diagrams generated by Figure Studio (only if no online diagram was already attached)
        setSectionStage(2);
        if (hasDiagrams) {
          setCurrentActivity("Rendering vector diagrams in Figure Studio...");
        }

        if (allowSectionDiagrams && !signal.aborted) {
          for (const q of questions) {
            if (signal.aborted) break;
            if (!q.imagePath && q.figureDoc && Array.isArray(q.figureDoc.objects) && q.figureDoc.objects.length > 0) {
              setCurrentActivity("Rendering vector diagrams in Figure Studio...");
              try {
                const doc: Doc = {
                  w: q.figureDoc.canvasWidth || 640,
                  h: q.figureDoc.canvasHeight || 360,
                  bg: "white",
                  objects: q.figureDoc.objects as any,
                };
                const grid: GridSettings = { style: "dots", size: 20, include: false };
                const rawPng = await renderDocToBlob(doc, grid, 2);
                const sceneData: SceneFile = { v: 1, doc, grid };
                const finalBlob = await embedSceneInPng(rawPng, JSON.stringify(sceneData));
                const imagePath = await uploadImage(finalBlob);
                (q as any).imagePath = imagePath;
              } catch (renderErr) {
                console.warn("Failed to render vector diagram to PNG:", renderErr);
              }
            }
          }
        }

        if (signal.aborted) {
          setStatus("stopped");
          break;
        }

        // Track how many questions in this section received diagrams
        const diagramsInThisSection = questions.filter((q) => q.imagePath || q.figureDoc).length;
        paperDiagramCount += diagramsInThisSection;

        // 3. Commit section questions into database & link to paper
        setSectionStage(3);
        setCurrentActivity("Committing section to database...");
        const commitRes = await api<{
          success: boolean;
          addedCount: number;
          paper: PaperData;
        }>(`/api/papers/${paperId}/ai-commit-section`, {
          method: "POST",
          signal,
          json: {
            sectionId: sec.sectionId,
            questions,
          },
        });

        updatedPaperRef = commitRes.paper;
        setLatestPaper(commitRes.paper);

        // Append to live feed (a combined MATCH_COLUMN question fulfills all slots in its section)
        const enriched = questions.map((q) => ({
          ...q,
          sectionTitle: sec.sectionTitle,
          slotsFilled:
            sec.sectionType === "MATCH_COLUMN" || q.type === "MATCH_COLUMN"
              ? Math.max(1, sec.slots.length)
              : 1,
        }));
        accumulatedQuestions = [...accumulatedQuestions, ...enriched];
        setGeneratedQuestions(accumulatedQuestions);
      }

      if (!abortRef.current && !signal.aborted) {
        const totalFilledSlots = accumulatedQuestions.reduce(
          (sum, q) => sum + (q.slotsFilled || 1),
          0
        );
        setStatus("done");
        toast.success(`Successfully generated ${totalFilledSlots} question slots!`);
        if (updatedPaperRef) {
          onPaperUpdated(updatedPaperRef);
        }
      }
    } catch (err: any) {
      if (signal.aborted || err?.name === "AbortError") {
        setStatus("stopped");
        setCurrentActivity("Generation cancelled.");
        return;
      }
      setError(err?.message || "An error occurred during section generation.");
      setStatus("stopped");
    } finally {
      setCurrentActivity("");
    }
  };

  if (!open) return null;

  const pendingSections = plan?.sections.filter((s) => s.slots.length > 0) || [];
  const totalSlotsToGenerate = plan?.totalQuestionsNeeded || 0;
  const totalMarksToGenerate = plan?.totalMarksNeeded || 0;
  const completedSlotsCount = generatedQuestions.reduce(
    (sum, q) =>
      sum +
      (q.slotsFilled ||
        (q.type === "MATCH_COLUMN" ? Math.max(1, q.options?.length || 1) : 1)),
    0
  );

  const modalFooter =
    status === "config" ? (
      <>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost text-xs py-1.5 px-3 border border-slate-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleStartGeneration}
          disabled={loadingPlan || totalSlotsToGenerate === 0}
          className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 font-bold shadow-sm"
        >
          <Sparkles size={14} />
          Generate Complete Paper ({totalSlotsToGenerate} Qs · {totalMarksToGenerate} Marks)
        </button>
      </>
    ) : status === "generating" ? (
      <>
        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <Spinner size={14} className="text-indigo-600" />
          Generating paper section by section...
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancelGeneration}
            className="btn btn-ghost border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
          >
            <X size={14} /> Cancel Generation
          </button>
          <button
            type="button"
            onClick={handleStop}
            className="btn btn-ghost border border-red-200 text-red-600 hover:bg-red-50 text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
          >
            <StopCircle size={14} /> Stop After Current Section
          </button>
        </div>
      </>
    ) : (
      <>
        <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
          <CheckCircle2 size={16} />
          Paper generation complete ({completedSlotsCount} / {totalSlotsToGenerate} Qs placed)
        </div>
        <button
          type="button"
          onClick={() => {
            if (latestPaper) onPaperUpdated(latestPaper);
            onClose();
          }}
          className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold shadow-sm"
        >
          <FileCheck2 size={15} />
          Open & Finalize Paper
        </button>
      </>
    );

  return (
    <Modal
      title="AI Complete Question Paper Generator"
      subtitle={`${paperTitle} · ${plan ? `${plan.className} ${plan.subject}` : "Exam Paper"}`}
      onClose={handleClose}
      preventClose={status === "generating"}
      size="xl"
      footer={modalFooter}
    >
      <div className="space-y-4">
        <ErrorBanner message={error} />

        {loadingPlan ? (
          <div className="py-16 text-center">
            <Spinner size={24} className="mx-auto text-indigo-600" />
            <p className="mt-3 text-sm text-slate-600 font-medium">
              Analyzing blueprint sections and chapter weightages...
            </p>
          </div>
        ) : !plan ? (
            <div className="py-12 text-center text-slate-500">
              <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
              <p className="text-sm">Unable to load blueprint plan.</p>
            </div>
          ) : totalSlotsToGenerate === 0 ? (
            <div className="py-12 text-center text-slate-600 space-y-3">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-1" />
              <h3 className="text-sm font-bold text-slate-800">All Question Slots are Currently Filled</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This paper already has questions in every section slot. If you want to replace them with fresh board-standard AI questions and diagrams, you can clear and regenerate.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setLoadingPlan(true);
                    try {
                      await api(`/api/papers/${paperId}/clear-questions`, { method: "POST" });
                      const freshPlanRes = await api<{ success: boolean; plan: PaperAutogenPlan }>(
                        `/api/papers/${paperId}/ai-plan`,
                      );
                      setPlan(freshPlanRes.plan);
                      setGenerationMode("fresh");
                    } catch (err: any) {
                      setError(err?.message || "Failed to clear questions");
                    } finally {
                      setLoadingPlan(false);
                    }
                  }}
                  className="btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold shadow-xs"
                >
                  <RotateCcw size={14} /> Clear Existing Questions &amp; Start Fresh Generation
                </button>
              </div>
            </div>
          ) : status === "config" ? (
            /* Step 1: Pre-Generation Configuration Form */
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-950">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                    {totalSlotsToGenerate}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {totalSlotsToGenerate} Questions ({totalMarksToGenerate} Marks) Needed
                    </span>
                    <span className="text-slate-600">
                      Spanning {pendingSections.length} sections across {plan.chapterQuotas.length} syllabus chapters
                    </span>
                  </div>
                </div>
                <div className="text-[11px] font-medium text-indigo-800 bg-white/80 px-2.5 py-1 rounded-md border border-indigo-200">
                  Zero Quality Loss · Section-by-Section AI Synthesis
                </div>
              </div>

              {/* Existing Questions Option (if any placed) */}
              {plan.sections.some((s) => s.alreadyPlacedCount > 0) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <span className="text-xs font-semibold text-slate-800 block">Existing Paper Questions Handling</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label
                      className={`p-2.5 rounded-lg border cursor-pointer transition ${
                        generationMode === "fresh"
                          ? "border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="genMode"
                          className="mt-0.5 text-indigo-600"
                          checked={generationMode === "fresh"}
                          onChange={() => setGenerationMode("fresh")}
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">Clear &amp; Generate Fresh Paper</span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Wipes previous draft questions and generates a balanced new paper from scratch.
                          </span>
                        </div>
                      </div>
                    </label>
                    <label
                      className={`p-2.5 rounded-lg border cursor-pointer transition ${
                        generationMode === "fill"
                          ? "border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="genMode"
                          className="mt-0.5 text-indigo-600"
                          checked={generationMode === "fill"}
                          onChange={() => setGenerationMode("fill")}
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">Keep Existing &amp; Fill Deficits</span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Retains current questions and generates only for remaining empty slots.
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Language */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Exam Language</label>
                  <select
                    className="select text-xs w-full"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                  >
                    <option value="en">English (Standard National Terminology)</option>
                    <option value="sa">Sanskrit (संस्कृतम् - शुद्ध देवनागरी)</option>
                    <option value="hi">Hindi (Devanagari script only)</option>
                    <option value="bilingual">Bilingual (English with Hindi Devanagari translation)</option>
                  </select>
                </div>

                {/* Difficulty Mix */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Difficulty Distribution</label>
                  <select
                    className="select text-xs w-full"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                  >
                    <option value="BALANCED">Balanced Board Standard (30% Easy, 50% Medium, 20% Hard)</option>
                    <option value="MEDIUM">Standard Medium</option>
                    <option value="EASY">Foundational / Easy</option>
                    <option value="HARD">Challenger / High Order Thinking (HOTS)</option>
                  </select>
                </div>

                {/* Model Tier */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Cpu size={13} className="text-indigo-600" />
                    AI Reasoning Model
                  </label>
                  <select
                    className="select text-xs w-full font-medium"
                    value={modelTier}
                    onChange={(e) => setModelTier(e.target.value)}
                  >
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Senior Examiner Quality · Deep Thinking)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast generation)</option>
                  </select>
                  <p className="text-[10px] text-slate-500">
                    Pro model enforces Bloom taxonomy, rigorous distractors, and clean LaTeX.
                  </p>
                </div>

                {/* Figure Studio / Visual Diagrams Toggle */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Palette size={13} className="text-indigo-600" />
                      Visual Diagrams & Figures
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Board Standard ({plan ? (plan.totalMarksNeeded <= 50 ? "Max 2" : "Max 3") : "Max 2-3"} per paper)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                      checked={generateDiagrams}
                      onChange={(e) => setGenerateDiagrams(e.target.checked)}
                    />
                    <span className="text-xs text-slate-700">
                      Auto-include diagrams only where pedagogically essential (Geometry, Circuits, Anatomy, Visual Stimulus)
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Strictly follows board paper limits: text-only objective sections remain 100% diagram-free.
                  </p>
                </div>
              </div>

              {/* Teacher Focus / Instructions */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Custom Teacher Focus / Guidelines (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">e.g. NCERT focus, real-world examples</span>
                </label>
                <textarea
                  className="input text-xs w-full h-16 resize-none py-1.5"
                  placeholder="e.g. Focus on NCERT application questions, include Punnett squares for genetics, ensure clear step marking for 4-mark questions..."
                  value={teacherFocus}
                  onChange={(e) => setTeacherFocus(e.target.value)}
                />
              </div>

              {/* Sections Breakdown Accordion */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <span>Sections to Generate ({pendingSections.length})</span>
                  <span>Quota Breakdown</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {pendingSections.map((sec, idx) => (
                    <div
                      key={sec.sectionId}
                      className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50/50"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-400 font-mono text-[11px] w-4">{idx + 1}.</span>
                        <span className="font-semibold text-slate-800">{sec.sectionTitle}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {QUESTION_TYPE_LABEL[sec.sectionType as QuestionType] || sec.sectionType}
                        </span>
                        {sec.internalChoiceRequirement?.required && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            100% Internal Choice (OR / अथवा)
                          </span>
                        )}
                        {sec.internalChoiceRequirement?.forbidden && sec.marksEach === 2 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            No Internal Choice (2026–27 Rule)
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600 font-mono text-[11px]">
                        {sec.slots.length} Qs × {sec.marksEach}m = <span className="font-bold text-slate-900">{sec.slots.length * sec.marksEach}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Generation Progress & Live Question Feed */
            <div className="space-y-4">
              {/* Progress Card */}
              <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {status === "generating" ? (
                      <Loader2 size={16} className="animate-spin text-indigo-600" />
                    ) : status === "done" ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <StopCircle size={18} className="text-amber-600" />
                    )}
                    <span className="text-xs font-bold text-slate-900">
                      {status === "generating"
                        ? `Section ${currentSectionIndex + 1} of ${pendingSections.length}: ${
                            currentSectionTitle || pendingSections[currentSectionIndex]?.sectionTitle || "Generating..."
                          }`
                        : status === "done"
                        ? "Exam Paper Generation Completed!"
                        : "Generation Paused"}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono text-indigo-700">
                    {completedSlotsCount} / {totalSlotsToGenerate} Qs
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-indigo-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(100, (completedSlotsCount / Math.max(1, totalSlotsToGenerate)) * 100)}%`,
                    }}
                  />
                </div>

                {/* Active Section Multi-Stage Progress */}
                {status === "generating" && (
                  <div className="mt-3 pt-2.5 border-t border-indigo-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Stage 1 */}
                    <div
                      className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] transition ${
                        sectionStage === 1
                          ? "bg-white border-indigo-300 shadow-2xs font-semibold text-indigo-950 animate-pulse"
                          : sectionStage > 1
                          ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                          : "bg-white/50 border-slate-200 text-slate-400"
                      }`}
                    >
                      {sectionStage > 1 ? (
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      ) : sectionStage === 1 ? (
                        <Loader2 size={13} className="text-indigo-600 animate-spin shrink-0" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-slate-300 ml-0.5 shrink-0" />
                      )}
                      <span className="truncate">Stage 1: Formulating questions with Gemini...</span>
                    </div>

                    {/* Stage 2 */}
                    <div
                      className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] transition ${
                        sectionStage === 2
                          ? "bg-white border-indigo-300 shadow-2xs font-semibold text-indigo-950 animate-pulse"
                          : sectionStage > 2
                          ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                          : "bg-white/50 border-slate-200 text-slate-400"
                      }`}
                    >
                      {sectionStage > 2 ? (
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      ) : sectionStage === 2 ? (
                        <Loader2 size={13} className="text-indigo-600 animate-spin shrink-0" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-slate-300 ml-0.5 shrink-0" />
                      )}
                      <span className="truncate">Stage 2: Rendering vector diagrams in Figure Studio...</span>
                    </div>

                    {/* Stage 3 */}
                    <div
                      className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] transition ${
                        sectionStage === 3
                          ? "bg-white border-indigo-300 shadow-2xs font-semibold text-indigo-950 animate-pulse"
                          : "bg-white/50 border-slate-200 text-slate-400"
                      }`}
                    >
                      {sectionStage === 3 ? (
                        <Loader2 size={13} className="text-indigo-600 animate-spin shrink-0" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-slate-300 ml-0.5 shrink-0" />
                      )}
                      <span className="truncate">Stage 3: Committing section to database...</span>
                    </div>
                  </div>
                )}

                {currentActivity && (
                  <p className="text-[11px] text-slate-600 mt-2 italic flex items-center gap-1.5">
                    <Sparkles size={11} className="text-indigo-500 animate-pulse" />
                    {currentActivity}
                  </p>
                )}
              </div>

              {/* Feed of Generated Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Generated Question Bank ({generatedQuestions.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Live Preview with MathText & Vector Diagrams
                  </span>
                </div>

                {generatedQuestions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                    Questions will appear here in real-time as each section completes...
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {generatedQuestions.map((q, idx) => {
                      const isExpanded = expandedAnswers.has(idx);
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2 transition"
                        >
                          {/* Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold font-mono text-indigo-600">Q{idx + 1}.</span>
                              <span className="font-semibold text-slate-800">{q.sectionTitle}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                {QUESTION_TYPE_LABEL[q.type as QuestionType] || q.type}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-[10px]">
                                Ch {q.chapterNumber}: {q.chapterTitle}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const secMarksEach =
                                  plan?.sections.find((s) => s.sectionTitle === q.sectionTitle)?.marksEach || 1;
                                const isMatch = q.type === "MATCH_COLUMN";
                                const matchPairs =
                                  isMatch && q.options ? parseMatchColumnPairs(q.options, q.text, q.explanation) : [];
                                const subpartsTotal =
                                  q.subparts && q.subparts.length > 0
                                    ? (q as any).attemptCount
                                      ? (q as any).attemptCount * (Number(q.subparts[0]?.marks) || 1)
                                      : q.subparts.reduce((sum, sp) => sum + (Number(sp.marks) || 0), 0)
                                    : 0;
                                const totalM =
                                  matchPairs.length > 0
                                    ? matchPairs.length * secMarksEach
                                    : subpartsTotal > 0
                                    ? subpartsTotal
                                    : secMarksEach;
                                return (
                                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                                    {totalM} Mark{totalM > 1 ? "s" : ""}
                                  </span>
                                );
                              })()}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  q.difficulty === "HARD"
                                    ? "bg-red-50 text-red-700"
                                    : q.difficulty === "MEDIUM"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {q.difficulty}
                              </span>
                            </div>
                          </div>

                          {/* Question Text */}
                          <div className="text-xs text-slate-900 font-medium leading-relaxed">
                            <MathText
                              text={
                                q.type === "MATCH_COLUMN"
                                  ? getMatchColumnInstruction(q.text)
                                  : q.text
                              }
                            />
                          </div>

                          {/* Render Diagram Thumbnail if present */}
                          {q.imagePath && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 inline-block max-w-sm">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 mb-1">
                                <ImageIcon size={12} />
                                Figure Studio Vector Diagram
                              </div>
                              <img
                                src={imageUrl(q.imagePath)}
                                alt="Question diagram"
                                className="max-h-36 rounded border bg-white object-contain"
                              />
                            </div>
                          )}

                          {/* Options if MATCH_COLUMN */}
                          {q.type === "MATCH_COLUMN" && q.options && q.options.length > 0 && (() => {
                            const pairs = parseMatchColumnPairs(q.options, q.text, q.explanation);
                            const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
                            const roman = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
                            return (
                              <div className="mt-1.5 overflow-hidden rounded border border-slate-200 text-xs">
                                <div className="grid grid-cols-2 bg-slate-100/80 px-2.5 py-1 font-semibold text-slate-600 border-b border-slate-200 text-[11px]">
                                  <span>Column A (स्तम्भ &apos;अ&apos;)</span>
                                  <span>Column B (स्तम्भ &apos;ब&apos;)</span>
                                </div>
                                <div className="divide-y divide-slate-100 bg-white">
                                  {pairs.map((p, pIdx) => (
                                    <div key={pIdx} className="grid grid-cols-2 px-2.5 py-1 text-[11px] text-slate-700">
                                      <div className="flex items-start gap-1 pr-1">
                                        <span className="font-bold text-slate-400 font-mono text-[10px]">
                                          ({letters[pIdx] ?? pIdx + 1})
                                        </span>
                                        <MathText text={cleanMatchItem(p.left)} />
                                      </div>
                                      <div className="flex items-start gap-1 pl-1 border-l border-slate-100">
                                        <span className="font-bold text-slate-400 font-mono text-[10px]">
                                          {roman[pIdx] ?? `(${pIdx + 1})`}
                                        </span>
                                        <MathText text={cleanMatchItem(p.right)} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Options if MCQ / True False */}
                          {q.type !== "MATCH_COLUMN" && q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs">
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className="rounded border border-slate-100 bg-slate-50/70 px-2.5 py-1 text-slate-700 flex items-center gap-1.5 text-[11px]"
                                >
                                  <span className="font-bold text-slate-400 font-mono text-[10px]">
                                    ({String.fromCharCode(65 + optIdx)})
                                  </span>
                                  <MathText text={cleanOptionText(opt)} />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Subparts */}
                          {q.subparts && q.subparts.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
                              {q.subparts.map((sp, spIdx) => (
                                <div key={spIdx} className="text-[11px] text-slate-700 flex items-start gap-1">
                                  <span className="font-bold text-slate-500">{sp.label}</span>
                                  <span className="flex-1"><MathText text={sp.text} /></span>
                                  <span className="text-[10px] text-slate-400 font-mono">[{sp.marks}m]</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Internal Choice (OR / अथवा) Question Preview */}
                          {q.orQuestion && (
                            <div className="mt-2 pt-2 border-t border-dashed border-indigo-200 space-y-1.5">
                              <div className="flex items-center justify-center">
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-[10px] tracking-wide">
                                  OR (अथवा)
                                </span>
                              </div>
                              <div className="text-xs text-slate-900 font-medium leading-relaxed">
                                <MathText text={q.orQuestion.text} />
                              </div>
                              {q.orQuestion.subparts &&
                                q.orQuestion.subparts.length > 0 && (
                                  <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
                                    {q.orQuestion.subparts.map((sp, spIdx) => (
                                      <div key={spIdx} className="text-[11px] text-slate-700 flex items-start gap-1">
                                        <span className="font-bold text-slate-500">{sp.label}</span>
                                        <span className="flex-1"><MathText text={sp.text} /></span>
                                        <span className="text-[10px] text-slate-400 font-mono">[{sp.marks}m]</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          )}

                          {/* Answer Toggle */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => toggleAnswer(idx)}
                              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              <span>{isExpanded ? "Hide Model Answer & Marking" : "View Model Answer & Marking"}</span>
                            </button>
                            {isExpanded && (
                              <div className="mt-1.5 space-y-1.5">
                                <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-950 font-mono whitespace-pre-wrap leading-relaxed">
                                  {q.orQuestion ? `Primary Answer:\n${q.answer}` : q.answer}
                                </div>
                                {q.orQuestion && q.orQuestion.answer && (
                                  <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-200 text-[11px] text-indigo-950 font-mono whitespace-pre-wrap leading-relaxed">
                                    {`OR (अथवा) Answer:\n${q.orQuestion.answer}`}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
  );
}
