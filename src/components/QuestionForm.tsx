"use client";

import { findPlaceholder } from "@/lib/preflightChecks";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  ImagePlus,
  Library,
  PencilRuler,
  Plus,
  RefreshCw,
  Shuffle,
  Sigma,
  Sparkles,
  Table as TableIcon,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { api, imageUrl, uploadImage } from "@/lib/client";
import {
  canHaveSubparts,
  DIFFICULTIES,
  isKindergartenType,
  isMcqLikeType,
  isPrePrimaryClass,
  isSubpartQuestionType,
  MAX_OPTIONS,
  MIN_OPTIONS,
  getMatchColumnInstruction,
  parseMatchColumnPairs,
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
  serializeMatchColumnPair,
  type MatchColumnPair,
} from "@/lib/constants";
import {
  getAllKindergartenActivities,
  getKindergartenActivity,
  parseKindergartenConfig,
  serializeKindergartenConfig,
} from "@/lib/kindergarten/registry";
import {
  type Book,
  type QuestionDto,
  type SubPart,
  attemptedSubpartsMarks,
  equalPartMarks,
  formatMarksValue,
  snapPartMarks,
  splitMarksEvenly,
  validateSubPartsSum,
} from "@/lib/types";
import { decomposeForSlot, decomposeStemSubparts } from "@/lib/subpartExtractor";
import {
  type ChapterBank,
  DIFFICULTY_LABEL,
  SKILLS,
  skillOf,
  suggestDifficulty,
  suggestSkill,
} from "@/lib/questionTagging";
import { chapterChoice, detailsSummary, samePayload } from "@/lib/questionModal";
import {
  DEFAULT_ASSERTION_OPTIONS_EN,
  DEFAULT_ASSERTION_OPTIONS_HI,
  getDefaultSubpartsForType,
  switchTypeFields,
} from "@/lib/typeSwitch";
import { MathRichEditor, type MathRichEditorHandle } from "./MathRichEditor";
import { MathToolbar } from "./MathToolbar";
import { DiagramSearchModal } from "./DiagramSearchModal";
import { FigureStudio } from "./figure-studio";
import { AIQuestionImproverModal } from "./AIQuestionImproverModal";
import { TableModal } from "./TableModal";
import { ErrorBanner, Field } from "./ui";

/** Pre-primary worksheets are written on: they keep blank answer space under each question. */
const PRE_PRIMARY_SPACE: Record<string, number> = {
  VERY_SHORT: 10,
  SHORT: 20,
  LONG: 60,
  WRITING_SKILL: 70,
  GRAMMAR: 15,
};
const DRAWING_SPACE: Record<string, number> = { DRAW: 70, MAP_WORK: 70 };
const isDrawingType = (t: string) => t === "DRAW" || t === "MAP_WORK";

/** Classes 1 to 12 answer in a separate copy, so only a drawing or map box takes room on their paper. */
function defaultSpaceMm(type: string, className?: string): number {
  return DRAWING_SPACE[type] ?? (isPrePrimaryClass(className) ? (PRE_PRIMARY_SPACE[type] ?? 0) : 0);
}
const LETTERS = "ABCDEF";
const ROMAN_LABELS = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)"];

/** The ways a question's parts are lettered; picking one relabels every part in order. */
const PART_LABEL_STYLES: { id: string; name: string; labels: string[] }[] = [
  { id: "roman", name: "(i), (ii), (iii)", labels: ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"] },
  { id: "alpha", name: "(a), (b), (c)", labels: "abcdefghijkl".split("") },
  { id: "ALPHA", name: "(A), (B), (C)", labels: "ABCDEFGHIJKL".split("") },
  { id: "num", name: "(1), (2), (3)", labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] },
  { id: "hindi", name: "(क), (ख), (ग)", labels: ["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ", "ट", "ठ"] },
].map((st) => ({ ...st, labels: st.labels.map((l) => `(${l})`) }));

function partLabel(styleId: string | null, index: number): string {
  const style = PART_LABEL_STYLES.find((st) => st.id === styleId) ?? PART_LABEL_STYLES[0];
  return style.labels[index] ?? `(${index + 1})`;
}

/** The lettering the parts follow, or null when the teacher typed labels of their own (those are left alone). */
function labelStyleOf(parts: SubPart[]): string | null {
  if (parts.length === 0) return "roman";
  const found = PART_LABEL_STYLES.find((st) => parts.every((sp) => st.labels.includes(sp.label.trim())));
  return found ? found.id : null;
}

/** Parts lettered in order again after one is added, removed or moved. */
function relabelParts(parts: SubPart[], styleId: string | null = labelStyleOf(parts)): SubPart[] {
  return styleId ? parts.map((sp, i) => ({ ...sp, label: partLabel(styleId, i) })) : parts;
}

/** Marks box of one part: takes ½ and ¼ marks, and lets the teacher clear it while typing. */
function PartMarksInput({ value, onChange }: { value: number; onChange: (marks: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0.25}
      max={20}
      step={0.25}
      aria-label="Marks for this part"
      className="input !py-0.5 !px-1.5 w-16 text-xs font-semibold text-center"
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value);
        const marks = snapPartMarks(e.target.value);
        if (marks > 0) onChange(Math.min(20, marks));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

/** Create or edit a question. Saving always writes it to the question bank. */
export function QuestionForm({
  books,
  initial,
  fixedBookId,
  targetMarks,
  allowedChapterIds,
  openMarks,
  typeFromParent,
  detailsExtra,
  chapterHint,
  preferredChapterId,
  submitLabel = "Save question",
  showPaperEditModes,
  customSaveHandler,
  onSaved,
  onCancel,
}: {
  books: Book[];
  initial?: QuestionDto;
  fixedBookId?: string;
  targetMarks?: number;
  allowedChapterIds?: string[];
  /** Marks still open per chapter in the paper's blueprint; a new question's chapter is suggested from these. */
  openMarks?: Record<string, number>;
  /** The parent owns the type (picker chips, edit on a paper): no type dropdown is rendered. When it changes, the form switches type and keeps the typed text. */
  typeFromParent?: string;
  /** Rendered at the top of "More details" (paper-only fields). */
  detailsExtra?: React.ReactNode;
  /** A line under the Chapter select (the OR chapter rule). */
  chapterHint?: string;
  /** A new question starts on this chapter (an OR question on its main question's) instead of a suggested one. */
  preferredChapterId?: string;
  submitLabel?: string;
  showPaperEditModes?: boolean;
  /** `info.unchanged`: the question is exactly as the form opened it (an edit whose question was not touched). */
  customSaveHandler?: (payload: unknown, mode: "UPDATE_MASTER" | "FORK_COPY", info?: { unchanged: boolean }) => Promise<void>;
  onSaved?: (q: QuestionDto) => void;
  onCancel: () => void;
}) {
  const [paperEditMode, setPaperEditMode] = useState<"UPDATE_MASTER" | "FORK_COPY">("FORK_COPY");
  const chapterNoteId = useId();
  const [bookId, setBookId] = useState(initial?.bookId ?? fixedBookId ?? books[0]?.id ?? "");
  const book = books.find((b) => b.id === bookId);
  const allowedKey = allowedChapterIds?.join(",");
  const chapters = useMemo(
    () => (book?.chapters ?? []).filter((c) => !allowedChapterIds || allowedChapterIds.includes(c.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book, allowedKey],
  );
  const initialChapterBelongs = chapters.some((c) => c.id === initial?.chapterId);
  const preferredChapterBelongs = !!preferredChapterId && chapters.some((c) => c.id === preferredChapterId);
  const [chapterId, setChapterId] = useState(
    initialChapterBelongs ? initial!.chapterId : preferredChapterBelongs ? preferredChapterId! : (chapters[0]?.id ?? "")
  );
  const resolvedInitialType = initial?.type ?? typeFromParent ?? "SHORT";
  const [type, setType] = useState(resolvedInitialType);
  const [text, setText] = useState(() => {
    if (initial?.type === "MATCH_COLUMN" && initial.text) {
      const instruction = getMatchColumnInstruction(initial.text);
      if (instruction) return instruction;
    }
    return initial?.text ?? "";
  });
  const [options, setOptions] = useState<string[]>(() => {
    if (initial?.options && initial.options.length > 0 && initial.type !== "MATCH_COLUMN") {
      return initial.options;
    }
    if (resolvedInitialType === "ASSERTION_REASON") {
      return [...DEFAULT_ASSERTION_OPTIONS_EN];
    }
    return ["", "", "", ""];
  });
  const [matchPairs, setMatchPairs] = useState<MatchColumnPair[]>(() => {
    if (initial?.type === "MATCH_COLUMN") {
      const parsed = parseMatchColumnPairs(initial.options || [], initial.text, (initial as any).explanation);
      if (parsed.length > 0 && parsed.some((p) => p.left || p.right)) {
        return parsed;
      }
    }
    return [
      { left: "", right: "" },
      { left: "", right: "" },
      { left: "", right: "" },
      { left: "", right: "" },
    ];
  });
  const [subparts, setSubparts] = useState<SubPart[]>(() => {
    if (initial?.subparts && initial.subparts.length > 0) {
      return initial.subparts;
    }
    return getDefaultSubpartsForType(resolvedInitialType, targetMarks);
  });
  // "Answer any N of these parts"; undefined = every part is answered
  const [attemptCountRaw, setAttemptCount] = useState<number | undefined>(initial?.attemptCount);
  const attemptCount = attemptCountRaw && attemptCountRaw > 0 && attemptCountRaw < subparts.length ? attemptCountRaw : undefined;
  const [kdgConfig, setKdgConfig] = useState<any>(() => {
    if (isKindergartenType(resolvedInitialType)) {
      const raw = initial?.options?.[0] ? initial.options[0] : JSON.stringify(initial?.options || []);
      return parseKindergartenConfig(resolvedInitialType, raw, book?.subject);
    }
    const plugin = getKindergartenActivity(resolvedInitialType);
    return plugin ? plugin.defaultConfig(book?.subject) : null;
  });
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  // The Math Assistant is three rows tall: it opens on demand and stays open for teachers who use it (remembered).
  const [mathBarOpen, setMathBarOpen] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem("paperbuilder.mathbar") === "shown";
    } catch {
      return true;
    }
  });
  const toggleMathBar = (open: boolean) => {
    setMathBarOpen(open);
    try {
      window.localStorage.setItem("paperbuilder.mathbar", open ? "shown" : "hidden");
    } catch {
      /* ignore */
    }
  };
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "MEDIUM");
  const [skill, setSkill] = useState<string>(skillOf(initial?.cognitiveLevel) ?? "");
  // A new question gets its chapter, difficulty and skill filled in from its text until the teacher picks them.
  const autoTag = !initial;
  // a preferred chapter counts as chosen, so the text-based suggestion does not replace it
  const [touched, setTouched] = useState({ chapter: preferredChapterBelongs, difficulty: false, skill: false });
  // How this book's questions were filed before: lets the chapter suggestion go beyond chapter titles.
  const [bankOf, setBankOf] = useState<{ bookId: string; bank: ChapterBank } | null>(null);
  const chapterBank = bankOf?.bookId === bookId ? bankOf.bank : undefined;
  useEffect(() => {
    if (!autoTag || !bookId) return;
    let live = true;
    api<ChapterBank>(`/api/books/${bookId}/chapter-hints`)
      .then((bank) => {
        if (live) setBankOf({ bookId, bank });
      })
      .catch(() => {
        /* titles alone still work */
      });
    return () => {
      live = false;
    };
  }, [autoTag, bookId]);
  const [imagePath, setImagePath] = useState<string | null>(initial?.imagePath ?? null);
  const [spaceMm, setSpaceMm] = useState(initial?.spaceMm ?? defaultSpaceMm(resolvedInitialType, book?.className));
  const [showGrid, setShowGrid] = useState(initial?.showGrid ?? false);
  const [passageGroupId, setPassageGroupId] = useState(initial?.passageGroupId ?? "");
  const [secondaryText, setSecondaryText] = useState("");
  const [sketching, setSketching] = useState(false);
  const [diagramSearchOpen, setDiagramSearchOpen] = useState(false);
  const [aiImproverOpen, setAiImproverOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeEditorRef = useRef<MathRichEditorHandle | null>(null);
  const editorsMounted = useRef<Set<MathRichEditorHandle>>(new Set());
  const [activeField, setActiveField] = useState<
    | { type: "text" }
    | { type: "option"; index: number }
    | { type: "answer" }
    | { type: "subpart-text"; index: number }
    | { type: "subpart-answer"; index: number }
    | { type: "match-left"; index: number }
    | { type: "match-right"; index: number }
    | { type: "secondary" }
  >({ type: "text" });

  function handleInsertSnippet(snippet: string) {
    const editor = activeEditorRef.current;
    if (editor && editorsMounted.current.has(editor)) {
      editor.insert(snippet);
      return;
    }
    const join = (prev: string) => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + snippet + " ";
    if (activeField.type === "text") {
      setText(join);
    } else if (activeField.type === "option") {
      const idx = activeField.index;
      setOptions((opts) => opts.map((opt, j) => (j === idx ? join(opt) : opt)));
    } else if (activeField.type === "answer") {
      setAnswer(join);
    } else if (activeField.type === "subpart-text") {
      const idx = activeField.index;
      setSubparts((subs) => subs.map((sp, j) => (j === idx ? { ...sp, text: join(sp.text) } : sp)));
    } else if (activeField.type === "subpart-answer") {
      const idx = activeField.index;
      setSubparts((subs) => subs.map((sp, j) => (j === idx ? { ...sp, answer: join(sp.answer ?? "") } : sp)));
    } else if (activeField.type === "match-left") {
      const idx = activeField.index;
      setMatchPairs((pairs) => pairs.map((p, j) => (j === idx ? { ...p, left: join(p.left) } : p)));
    } else if (activeField.type === "match-right") {
      const idx = activeField.index;
      setMatchPairs((pairs) => pairs.map((p, j) => (j === idx ? { ...p, right: join(p.right) } : p)));
    } else if (activeField.type === "secondary") {
      setSecondaryText(join);
    }
  }

  function handleNewFormula() {
    const editor = activeEditorRef.current;
    if (editor && editorsMounted.current.has(editor)) editor.insertFormula();
  }

  function activate(field: typeof activeField) {
    return (handle: MathRichEditorHandle) => {
      editorsMounted.current.add(handle);
      activeEditorRef.current = handle;
      setActiveField(field);
    };
  }

  async function attach(blob: Blob) {
    setError(null);
    try {
      setImagePath(await uploadImage(blob));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const tagMarks = targetMarks ?? (subparts.length > 0 ? attemptedSubpartsMarks(subparts, attemptCount) : undefined);
  const hasText = text.replace(/<[^>]+>/g, "").trim().length > 0;
  const chapterPick = chapterChoice({
    isNew: !initial,
    touched: touched.chapter,
    chosenId: chapterId,
    text,
    chapters,
    openMarks,
    bank: chapterBank,
  });
  const effChapterId = chapterPick.chapterId;
  const difficultySuggested = autoTag && !touched.difficulty && hasText;
  const effDifficulty = difficultySuggested ? suggestDifficulty(text, type, tagMarks) : difficulty;
  const skillSuggested = autoTag && !touched.skill && hasText;
  const effSkill = skillSuggested ? suggestSkill(text, type) : skill;

  /** The save body for the current state of the form. */
  function buildPayload() {
    const isMcq = isMcqLikeType(type);
    const usesSubparts = isSubpartQuestionType(type) || (subparts && subparts.length > 0);
    const serializedOptions = isKindergartenType(type)
      ? [serializeKindergartenConfig(kdgConfig)]
      : type === "MATCH_COLUMN"
      ? matchPairs.map((p) => serializeMatchColumnPair(p.left, p.right))
      : isMcq
      ? options.map((o) => o.trim())
      : [];
    return {
      bookId,
      chapterId: effChapterId,
      type,
      text,
      options: serializedOptions,
      answer: isMcq ? (answer || "") : answer,
      difficulty: effDifficulty,
      cognitiveLevel: effSkill || null,
      imagePath,
      spaceMm,
      showGrid: (type === "DRAW" || type === "MAP_WORK") && showGrid,
      passageGroupId: passageGroupId.trim() || null,
      subparts: usesSubparts
        ? subparts.map((sp) => ({
            ...sp,
            marks: snapPartMarks(sp.marks) || 1,
            label: sp.label.trim() || "(i)",
            text: sp.text.trim(),
            answer: sp.answer?.trim() || "",
            options: Array.isArray(sp.options) ? sp.options.map((o) => o.trim()).filter(Boolean) : undefined,
          }))
        : [],
      ...(usesSubparts && attemptCount ? { attemptCount } : {}),
    };
  }
  // The question as the form opened it (no effect changes an edited question's state on mount), so a save can
  // tell the caller the question itself is untouched.
  const [openedPayload] = useState(buildPayload);

  /** Why the question cannot be saved as it is, or null. */
  function validationError(): string | null {
    const isMcq = isMcqLikeType(type);
    const usesSubparts = isSubpartQuestionType(type) || (subparts && subparts.length > 0);

    if (isMcq && !usesSubparts && options.some((o) => !o.trim())) {
      return "Fill in every option, or remove the empty ones.";
    }
    if (isMcq && !usesSubparts && options.length < MIN_OPTIONS) return `Add at least ${MIN_OPTIONS} options.`;

    if (type === "MATCH_COLUMN") {
      if (matchPairs.length < MIN_OPTIONS) {
        return `Add at least ${MIN_OPTIONS} matching rows.`;
      }
      if (matchPairs.some((p) => !p.left.trim() || !p.right.trim())) {
        return "Fill in both Column A (स्तम्भ 'अ') and Column B (स्तम्भ 'ब') for every row.";
      }
    }

    if (usesSubparts) {
      if (subparts.some((sp) => sp.options && sp.options.length > 0 && sp.options.filter((o) => o.trim()).length < MIN_OPTIONS)) {
        return `A part with options needs at least ${MIN_OPTIONS} of them filled in. Fill them or remove that part's options.`;
      }
      if (subparts.length === 0) {
        return "Please add at least one sub-question / subpart.";
      }
      if (subparts.some((sp) => !sp.text.trim())) {
        return "Fill in the prompt text for every subpart.";
      }
      if (subparts.some((sp) => !sp.marks || sp.marks <= 0)) {
        return "Give every part some marks (½ and ¼ marks are allowed).";
      }
      // checked first: unequal "any N" parts fail the marks total too, and this says why
      if (attemptCount && subparts.some((sp) => sp.marks !== subparts[0].marks)) {
        return "When students answer any few of the parts, every part must carry the same marks.";
      }
      const totalSubMarks = attemptedSubpartsMarks(subparts, attemptCount);
      if (targetMarks !== undefined && !validateSubPartsSum(subparts, targetMarks, attemptCount)) {
        return attemptCount
          ? `Any ${attemptCount} of these parts add up to ${formatMarksValue(totalSubMarks)} marks, but the question must be worth ${targetMarks}. Use "Split marks equally" or adjust the parts.`
          : `The parts add up to ${formatMarksValue(totalSubMarks)} marks, but the question must be worth ${targetMarks}. Use "Split marks equally" or adjust the parts.`;
      }
    }

    if (!text.trim()) return "Enter the question text.";
    const leftover = findPlaceholder(text) ?? subparts.map((sp) => findPlaceholder(sp.text)).find(Boolean);
    if (leftover) return `Replace the placeholder text before saving: ${leftover}`;
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = buildPayload();
    const unchanged = !!initial && samePayload(payload, openedPayload);
    // an untouched question is not rewritten by a custom handler, so a legacy flaw in it cannot block saving the rest
    const problem = customSaveHandler && unchanged ? null : validationError();
    if (problem) return setError(problem);

    setBusy(true);
    try {
      if (customSaveHandler) {
        await customSaveHandler(payload, paperEditMode, { unchanged });
      } else {
        const isExisting = Boolean(initial && initial.id && initial.id.trim() !== "");
        const saved = isExisting
          ? await api<QuestionDto>(`/api/questions/${initial!.id}`, { method: "PUT", json: payload })
          : await api<QuestionDto>("/api/questions", { method: "POST", json: payload });
        onSaved?.(saved);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function shuffleMatchColumnB() {
    if (matchPairs.length < 2) return;
    // Create indexed right items, shuffle them, and generate matching key
    const indexedRights = matchPairs.map((p, idx) => ({ origIdx: idx, text: p.right }));
    for (let i = indexedRights.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = indexedRights[i];
      indexedRights[i] = indexedRights[j];
      indexedRights[j] = tmp;
    }
    const nextPairs = matchPairs.map((p, idx) => ({
      left: p.left,
      right: indexedRights[idx].text,
    }));
    const keyParts = matchPairs.map((_, origIdx) => {
      const newColBIdx = indexedRights.findIndex((r) => r.origIdx === origIdx);
      const colA = `(${LETTERS[origIdx] ?? String.fromCharCode(65 + origIdx)})`;
      const colB = ROMAN_LABELS[newColBIdx] ?? `(${newColBIdx + 1})`;
      return `${colA} → ${colB}`;
    });
    setMatchPairs(nextPairs);
    setAnswer(keyParts.join(", "));
  }

  const typeLocked = !!initial && (initial.timesUsed ?? 0) > 0;
  const bookLocked = !!fixedBookId || (!!initial && (initial.timesUsed ?? 0) > 0);
  const isMcq = isMcqLikeType(type);
  const usesSubparts = isSubpartQuestionType(type) || (subparts && subparts.length > 0);
  const prePrimary = isPrePrimaryClass(book?.className);
  // Answer space is a worksheet setting: shown for pre-primary, or to clear space an older question still has.
  const showAnswerSpace = !isDrawingType(type) && (prePrimary || (initial?.spaceMm ?? 0) > 0);

  // Sub-questions can be added to any written question (fill in the blanks, one-word, short answer...), not only passages.
  const canAddParts = canHaveSubparts(type) && type !== "MATCH_COLUMN" && !isKindergartenType(type);
  const partStyle = labelStyleOf(subparts);
  // A list like "(i) ... (ii) ..." typed into the question text: offered for conversion into real parts.
  const typedList = useMemo(
    () => (canAddParts && subparts.length === 0 ? decomposeStemSubparts(text) : null),
    [canAddParts, subparts.length, text],
  );
  const typedListAnswered = typedList
    ? typedList.attemptCount && typedList.attemptCount < typedList.subparts.length
      ? typedList.attemptCount
      : typedList.subparts.length
    : 0;
  const typedListEach = typedList && targetMarks !== undefined ? equalPartMarks(targetMarks, typedListAnswered) : null;

  /** The question's marks shared equally over the parts a student answers; null when there is no target or it cannot be shared. */
  function evenMarks(count: number, answered?: number): number[] | null {
    if (targetMarks === undefined || count === 0) return null;
    if (answered && answered < count) {
      const each = equalPartMarks(targetMarks, answered);
      return each ? Array.from({ length: count }, () => each) : null;
    }
    return splitMarksEvenly(targetMarks, count);
  }

  /** True while the parts still carry the equal share nobody has hand-tuned: adding or removing a part then re-shares the marks. */
  function isEvenlyShared(parts: SubPart[]): boolean {
    if (targetMarks === undefined || parts.length === 0) return false;
    const shares = evenMarks(parts.length, attemptCount);
    return !!shares && parts.every((sp, i) => sp.marks === shares[i]);
  }

  function applyParts(next: SubPart[], reshare: boolean, answered = attemptCount) {
    const shares = reshare ? evenMarks(next.length, answered && answered < next.length ? answered : undefined) : null;
    setSubparts(relabelParts(shares ? next.map((sp, i) => ({ ...sp, marks: shares[i] })) : next, partStyle));
  }

  function addPart() {
    const reshare = subparts.length === 0 || isEvenlyShared(subparts);
    const left = targetMarks !== undefined ? targetMarks - attemptedSubpartsMarks(subparts, attemptCount) : 0;
    const marks = attemptCount && subparts[0] ? subparts[0].marks : left > 0 ? snapPartMarks(left) : 1;
    applyParts([...subparts, { label: partLabel(partStyle, subparts.length), text: "", marks, answer: "" }], reshare);
  }

  function removePart(index: number) {
    applyParts(subparts.filter((_, j) => j !== index), isEvenlyShared(subparts));
  }

  function movePart(index: number, by: -1 | 1) {
    const next = [...subparts];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    // each part keeps its own marks; only the lettering follows the new order
    applyParts(next, false);
  }

  function duplicatePart(index: number) {
    const copy = { ...subparts[index], id: undefined };
    applyParts([...subparts.slice(0, index + 1), copy, ...subparts.slice(index + 1)], isEvenlyShared(subparts));
  }

  function splitMarksEqually() {
    const shares = evenMarks(subparts.length, attemptCount);
    if (!shares) {
      return setError(
        targetMarks === undefined
          ? "This question has no fixed marks to split yet. Set each part's marks yourself."
          : `${targetMarks} marks cannot be shared over ${attemptCount ?? subparts.length} parts in steps of ¼. Change the number of parts.`,
      );
    }
    setError(null);
    setSubparts(subparts.map((sp, i) => ({ ...sp, marks: shares[i] })));
  }

  function changeAttemptCount(next: number | undefined) {
    const reshare = isEvenlyShared(subparts);
    setAttemptCount(next);
    if (reshare) applyParts(subparts, true, next);
  }

  /** Turns a "(i) ... (ii) ..." list typed in the question text into parts that share the question's marks. */
  function convertTypedList() {
    const found = decomposeForSlot(text, targetMarks);
    if (!found) return;
    const answered = found.attemptCount && found.attemptCount < found.subparts.length ? found.attemptCount : undefined;
    const shares = evenMarks(found.subparts.length, answered);
    setText(found.stem);
    setAttemptCount(answered);
    setSubparts(found.subparts.map((sp, i) => ({ ...sp, marks: sp.marks || shares?.[i] || 1, answer: "" })));
  }

  function changeType(newType: string) {
    // the old type's untouched defaults are cleared, the new type's own defaults filled in, typed work kept
    const next = switchTypeFields(type, newType, { text, subparts, options, answer }, targetMarks);
    setType(newType);
    if (!initial) setSpaceMm(defaultSpaceMm(newType, book?.className));
    setText(next.text);
    setSubparts(next.subparts);
    setOptions(next.options);
    setAnswer(next.answer);
    if (isKindergartenType(newType)) {
      const plugin = getKindergartenActivity(newType);
      if (plugin) {
        const defCfg = plugin.defaultConfig(book?.subject);
        setKdgConfig(defCfg);
        if (!next.text.trim() || isKindergartenType(type)) {
          setText(defCfg.instruction);
        }
      }
    }
  }

  // The parent's type control (picker chips) switches the type in place, so the typed question text is kept.
  // Only a CHANGE of the prop after mount switches the type: on mount nothing happens, so an edited question keeps
  // `initial.type` even when the parent passes a different one. Previous prop kept in state, compared during render.
  const [seenTypeFromParent, setSeenTypeFromParent] = useState(typeFromParent);
  if (typeFromParent !== seenTypeFromParent) {
    setSeenTypeFromParent(typeFromParent);
    if (typeFromParent && typeFromParent !== type) changeType(typeFromParent);
  }

  const templates = templatesFor(type, targetMarks, { setText, setOptions, setAnswer, setSubparts, setMatchPairs });
  const chapterNote =
    chapterHint ??
    (chapterPick.suggested && chapters.length !== 1 ? "Suggested — change it if this is the wrong chapter." : null);
  // The type field: none when the parent owns the type; plain text when the type is locked; else a dropdown.
  const typeField = typeFromParent ? null : typeLocked ? "text" : "select";
  const rowColumns = (bookLocked ? 1 : 2) + (typeField ? 1 : 0);

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBanner message={error} />

      {/* 1. Where the question goes */}
      <div className={`grid gap-3 ${rowColumns === 1 ? "sm:grid-cols-1" : rowColumns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {!bookLocked && (
          <Field label="Book">
            <select
              className="input"
              value={bookId}
              onChange={(e) => {
                const next = books.find((b) => b.id === e.target.value);
                setBookId(e.target.value);
                setChapterId(next?.chapters[0]?.id ?? "");
                if (!initial) setSpaceMm(defaultSpaceMm(type, next?.className));
              }}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.className} · {b.subject} · {b.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        {typeField === "text" && (
          <div className="text-sm text-slate-700 sm:pt-6">
            Question type:{" "}
            <span className="font-semibold text-slate-900">
              {QUESTION_TYPE_LABEL[type as keyof typeof QUESTION_TYPE_LABEL] || type}
            </span>
          </div>
        )}
        {typeField === "select" && (
        <Field label="Question type">
          <select className="input" value={type} onChange={(e) => changeType(e.target.value)}>
            {prePrimary ? (
              <>
                <optgroup label="Kindergarten & Pre-Primary Activities">
                  {getAllKindergartenActivities().map((act) => (
                    <option key={act.type} value={act.type}>
                      {act.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Standard Questions">
                  {QUESTION_TYPES.filter((t) => !isKindergartenType(t)).map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABEL[t]}
                    </option>
                  ))}
                </optgroup>
              </>
            ) : (
              QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t]}
                </option>
              ))
            )}
          </select>
        </Field>
        )}
        <Field label="Chapter">
          <select
            className="input"
            value={effChapterId}
            required
            disabled={chapters.length === 1}
            aria-describedby={chapterNote ? chapterNoteId : undefined}
            onChange={(e) => {
              setChapterId(e.target.value);
              setTouched((t) => ({ ...t, chapter: true }));
            }}
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number}. {c.title}
              </option>
            ))}
          </select>
          {chapterNote && <SuggestedNote id={chapterNoteId}>{chapterNote}</SuggestedNote>}
        </Field>
      </div>

      {prePrimary && !typeFromParent && !typeLocked && (
        <div className="p-3 bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200 rounded-2xl">
          <div className="text-xs font-black text-amber-900 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>🎨 Preschool Activity Types ({book?.className})</span>
            <span className="text-[11px] font-medium text-slate-500">Click to switch activity type</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {getAllKindergartenActivities().map((act) => (
              <button
                key={act.type}
                type="button"
                onClick={() => {
                  setType(act.type);
                  const defCfg = act.defaultConfig(book?.subject);
                  setKdgConfig(defCfg);
                  if (!text.trim() || isKindergartenType(type)) {
                    setText(defCfg.instruction);
                  }
                }}
                className={`p-2.5 text-left border rounded-xl transition-all flex flex-col justify-between ${
                  type === act.type
                    ? "bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <span className="font-bold text-xs text-slate-900">{act.shortLabel}</span>
                <span className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                  {act.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isKindergartenType(type) ? (
        <div className="p-4 border-2 border-indigo-200 rounded-2xl bg-indigo-50/20 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-xs rounded-full uppercase tracking-wider">
                Kindergarten Activity Editor
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {QUESTION_TYPE_LABEL[type as keyof typeof QUESTION_TYPE_LABEL] || type}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAiImproverOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 shadow-2xs"
            >
              <Sparkles size={13} className="text-indigo-600" />
              AI Activity Polish
            </button>
          </div>

          {(() => {
            const plugin = getKindergartenActivity(type);
            if (!plugin) return null;
            const Editor = plugin.renderEditor;
            return (
              <Editor
                config={kdgConfig}
                onChange={(newCfg) => setKdgConfig(newCfg)}
                instructionText={text}
                onInstructionChange={(newText) => setText(newText)}
              />
            );
          })()}
        </div>
      ) : (
        <>
          {/* 2. The question itself */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <span className="label !mb-0">
                {type === "FILL_BLANK"
                  ? "Question (type ______ for the blank)"
                  : type === "CASE_STUDY"
                  ? "Case / scenario"
                  : type === "UNSEEN_PASSAGE"
                  ? "Passage or poem (अपठित गद्यांश / काव्यांश)"
                  : type === "REFERENCE_CONTEXT"
                  ? "Extract (गद्यांश / पद्यांश / श्लोक)"
                  : type === "MATCH_COLUMN"
                  ? "Instruction (e.g. Match the following / सही जोड़ी बनाइए)"
                  : "Question"}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {templates.length > 0 && (
                  <label className="relative inline-flex">
                    <span className="sr-only">Start from a template</span>
                    <select
                      className="h-8 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-7 pr-7 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value=""
                      onChange={(e) => {
                        templates[Number(e.target.value)]?.apply();
                      }}
                    >
                      <option value="" disabled>
                        Use a template…
                      </option>
                      {templates.map((t, i) => (
                        <option key={t.label} value={i}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <Wand2 size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
                    <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => toggleMathBar(!mathBarOpen)}
                  aria-pressed={mathBarOpen}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition ${
                    mathBarOpen
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  title="Symbols and formulas, inserted where the cursor is"
                >
                  <Sigma size={13} aria-hidden /> Maths
                </button>
                <button
                  type="button"
                  onClick={() => setTableModalOpen(true)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  title="Insert a custom table with required rows and columns"
                >
                  <TableIcon size={13} aria-hidden /> Table
                </button>
                <button
                  type="button"
                  onClick={() => setAiImproverOpen(true)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  title="Let AI tidy the wording, write options, add Hindi or a marking scheme"
                >
                  <Sparkles size={13} aria-hidden /> Improve with AI
                </button>
              </div>
            </div>
          </div>

          {/* Maths toolbar: a direct child of the form, so it stays pinned to the top of the modal all the way down
              to the options, match rows and parts (tall windows only; on short ones it would cover the field). */}
          {mathBarOpen && (
            <div className="z-20 -mx-5 !mt-1.5 border-b border-slate-200 bg-white/95 px-5 py-1.5 shadow-[0_6px_12px_-10px_rgb(15_23_42/0.35)] backdrop-blur-xs [@media(min-height:640px)]:sticky [@media(min-height:640px)]:-top-5">
              <div className="relative">
                <MathToolbar onInsert={handleInsertSnippet} onNewFormula={handleNewFormula} />
                <button
                  type="button"
                  onClick={() => toggleMathBar(false)}
                  className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close the Maths toolbar"
                  title="Close the Maths toolbar"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            </div>
          )}

          <div className="!mt-1.5">
            <MathRichEditor
              multiline
              value={text}
              onChange={setText}
              onActivate={activate({ type: "text" })}
              placeholder="Type the question here."
              autoFocus
            />
          </div>

      {/* Match the Column Pair Editor */}
      {type === "MATCH_COLUMN" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <span className="font-semibold text-sm text-slate-800">Rows to match</span>
              <p className="text-[11px] text-slate-500">
                Type each matching pair on one row, then shuffle Column B: the answer key is written for you.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={shuffleMatchColumnB}
                className="btn btn-xs bg-white font-medium"
                title="Randomly shuffle Column B items and automatically write the matching Answer Key below"
              >
                <Shuffle size={12} /> Shuffle B &amp; write key
              </button>
              {matchPairs.length < MAX_OPTIONS && (
                <button
                  type="button"
                  onClick={() => setMatchPairs([...matchPairs, { left: "", right: "" }])}
                  className="btn btn-xs btn-primary font-medium"
                >
                  <Plus size={12} /> Add Row
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-6">Column A (स्तम्भ &apos;अ&apos;)</div>
              <div className="col-span-5">Column B (स्तम्भ &apos;ब&apos;)</div>
              <div className="col-span-1 text-right"></div>
            </div>
            {matchPairs.map((pair, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-6 flex items-center gap-1.5">
                  <span className="w-6 text-xs font-bold text-slate-600">
                    ({LETTERS[idx] ?? String.fromCharCode(65 + idx)})
                  </span>
                  <MathRichEditor
                    className="flex-1 text-xs"
                    value={pair.left}
                    placeholder={`Column A item ${LETTERS[idx] ?? idx + 1}`}
                    onActivate={activate({ type: "match-left", index: idx })}
                    onChange={(v) => setMatchPairs((pairs) => pairs.map((p, j) => (j === idx ? { ...p, left: v } : p)))}
                  />
                </div>
                <div className="col-span-5 flex items-center gap-1.5">
                  <span className="w-6 text-xs font-bold text-slate-600">
                    {ROMAN_LABELS[idx] ?? `(${idx + 1})`}
                  </span>
                  <MathRichEditor
                    className="flex-1 text-xs"
                    value={pair.right}
                    placeholder={`Column B item ${ROMAN_LABELS[idx] ?? idx + 1}`}
                    onActivate={activate({ type: "match-right", index: idx })}
                    onChange={(v) => setMatchPairs((pairs) => pairs.map((p, j) => (j === idx ? { ...p, right: v } : p)))}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    disabled={matchPairs.length <= MIN_OPTIONS}
                    onClick={() => setMatchPairs(matchPairs.filter((_, j) => j !== idx))}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    title="Remove row"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-questions: offered for every written question, with a shortcut for a list already typed in the text */}
      {canAddParts && !usesSubparts && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-600">
          {typedList ? (
            <>
              <span className="flex-1 min-w-[14rem]">
                The question text lists {typedList.subparts.length} parts ({typedList.subparts[0].label} to{" "}
                {typedList.subparts[typedList.subparts.length - 1].label}).
                {typedListEach
                  ? ` On the paper each carries ${formatMarksValue(typedListEach)} of the ${targetMarks} marks.`
                  : " Make them parts to give each its own marks and answer."}
              </span>
              <button type="button" className="btn btn-xs btn-primary font-medium" onClick={convertTypedList}>
                Make these separate parts
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 min-w-[14rem]">Has sub-questions like (i), (ii), (iii)? Add them as parts: the marks are shared between them.</span>
              <button
                type="button"
                className="btn btn-xs bg-white font-medium"
                onClick={() =>
                  applyParts(
                    [
                      { label: partLabel("roman", 0), text: "", marks: 1, answer: "" },
                      { label: partLabel("roman", 1), text: "", marks: 1, answer: "" },
                    ],
                    true,
                  )
                }
              >
                <Plus size={12} /> Add sub-questions
              </button>
            </>
          )}
        </div>
      )}

      {usesSubparts && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-800">Parts of the question</span>
              {(() => {
                const total = attemptedSubpartsMarks(subparts, attemptCount);
                const expected = targetMarks ?? total;
                const isBalanced = Math.abs(total - expected) < 1e-6;
                return isBalanced ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                    ✓ {formatMarksValue(total)}/{formatMarksValue(expected)} marks
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                    {formatMarksValue(total)}/{formatMarksValue(expected)} marks ·{" "}
                    {total > expected ? `${formatMarksValue(total - expected)} too many` : `${formatMarksValue(expected - total)} short`}
                  </span>
                );
              })()}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {targetMarks !== undefined && subparts.length > 0 && (
                <button
                  type="button"
                  onClick={splitMarksEqually}
                  className="btn btn-xs bg-white font-medium"
                  title={`Share the ${targetMarks} marks equally between the parts`}
                >
                  Split marks equally
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSubparts(getDefaultSubpartsForType(type, targetMarks));
                  setAttemptCount(undefined);
                }}
                className="btn btn-xs bg-white font-medium"
              >
                {isSubpartQuestionType(type) ? "Reset parts" : "Remove parts"}
              </button>
              <button type="button" onClick={addPart} className="btn btn-xs btn-primary font-medium">
                <Plus size={12} /> Add part
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-700">
            <label className="flex items-center gap-2">
              <span className="font-medium">Numbered as</span>
              <select
                className="input !w-auto !py-1 text-xs"
                value={partStyle ?? "custom"}
                onChange={(e) => e.target.value !== "custom" && setSubparts(relabelParts(subparts, e.target.value))}
              >
                {PART_LABEL_STYLES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
                {!partStyle && <option value="custom">My own labels</option>}
              </select>
            </label>

            {subparts.length > 1 && (
              <label className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Students answer</span>
                <select
                  className="input !w-auto !py-1 text-xs"
                  value={attemptCount ?? 0}
                  onChange={(e) => changeAttemptCount(Number(e.target.value) || undefined)}
                >
                  <option value={0}>all {subparts.length} parts</option>
                  {Array.from({ length: subparts.length - 1 }, (_, n) => n + 1).map((n) => (
                    <option key={n} value={n}>
                      any {n} of the {subparts.length} parts
                    </option>
                  ))}
                </select>
                {attemptCount && <span className="text-slate-500">Marks count the {attemptCount} answered.</span>}
              </label>
            )}
          </div>

          <div className="space-y-3">
            {subparts.map((sp, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs space-y-2 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Part</span>
                    <input
                      className="input !py-0.5 !px-1.5 w-16 text-xs font-semibold text-center"
                      value={sp.label}
                      placeholder="(i)"
                      onChange={(e) =>
                        setSubparts(subparts.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)))
                      }
                      title="Subpart label (e.g. (i), (a), (क))"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                      Marks:
                      <PartMarksInput
                        value={sp.marks}
                        onChange={(marks) => setSubparts((subs) => subs.map((s, j) => (j === i ? { ...s, marks } : s)))}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => movePart(i, -1)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      title="Move up"
                      aria-label="Move part up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={i === subparts.length - 1}
                      onClick={() => movePart(i, 1)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      title="Move down"
                      aria-label="Move part down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicatePart(i)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      title="Duplicate part"
                      aria-label="Duplicate part"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={subparts.length <= 1}
                      onClick={() => removePart(i)}
                      className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                      title="Delete part"
                      aria-label="Delete part"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <MathRichEditor
                    multiline
                    className="min-h-[60px] text-xs"
                    value={sp.text}
                    placeholder={`Enter prompt for subpart ${sp.label || i + 1}...`}
                    onActivate={activate({ type: "subpart-text", index: i })}
                    onChange={(v) => setSubparts((subs) => subs.map((s, j) => (j === i ? { ...s, text: v } : s)))}
                  />
                </div>

                <div>
                  <MathRichEditor
                    className="text-xs"
                    value={sp.answer ?? ""}
                    placeholder={
                      sp.options && sp.options.length > 0
                        ? `Correct option for ${sp.label || i + 1}, e.g. (b)`
                        : `Model answer / marking rubric for ${sp.label || i + 1} (optional)`
                    }
                    onActivate={activate({ type: "subpart-answer", index: i })}
                    onChange={(v) => setSubparts((subs) => subs.map((s, j) => (j === i ? { ...s, answer: v } : s)))}
                  />
                </div>

                {sp.options && sp.options.length > 0 ? (
                  <div className="space-y-1.5 pt-1 rounded-md bg-slate-50 p-2.5 border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">Options of this part:</span>
                      <button
                        type="button"
                        className="text-[11px] font-medium text-slate-500 hover:text-red-600"
                        onClick={() => setSubparts((subs) => subs.map((s, j) => (j === i ? { ...s, options: undefined } : s)))}
                      >
                        Remove options
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sp.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500 w-5">({String.fromCharCode(97 + optIdx)})</span>
                          <MathRichEditor
                            className="flex-1 text-xs"
                            value={opt}
                            placeholder={`Option (${String.fromCharCode(97 + optIdx)})`}
                            onActivate={activate({ type: "text" })}
                            onChange={(v) =>
                              setSubparts((subs) =>
                                subs.map((s, j) =>
                                  j === i ? { ...s, options: (s.options || []).map((o2, k) => (k === optIdx ? v : o2)) } : s
                                )
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-[11px] font-medium text-indigo-700 hover:underline"
                    onClick={() => setSubparts((subs) => subs.map((s, j) => (j === i ? { ...s, options: ["", "", "", ""] } : s)))}
                  >
                    + Give this part options (a) to (d)
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isMcq && !usesSubparts && (
        <div className="space-y-2.5">
          <span className="label">Options <span className="font-normal text-slate-500">· tick the correct one</span></span>
          {options.map((o, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  aria-label={`Option ${LETTERS[i]} is correct`}
                  checked={answer === LETTERS[i]}
                  onChange={() => setAnswer(LETTERS[i])}
                />
                <span className="w-5 text-sm font-medium">{LETTERS[i]}</span>
                <MathRichEditor
                  className="flex-1"
                  value={o}
                  placeholder={`Option ${LETTERS[i]}`}
                  onActivate={activate({ type: "option", index: i })}
                  onChange={(v) => setOptions((opts) => opts.map((x, j) => (j === i ? v : x)))}
                />
                <button
                  type="button"
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  disabled={options.length <= MIN_OPTIONS}
                  aria-label="Remove option"
                  onClick={() => {
                    setOptions(options.filter((_, j) => j !== i));
                    setAnswer(answer === LETTERS[i] ? "" : answer && LETTERS.indexOf(answer) > i ? LETTERS[LETTERS.indexOf(answer) - 1] : answer);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button type="button" className="btn btn-sm" onClick={() => setOptions([...options, ""])}>
              <Plus size={14} /> Add option
            </button>
          )}
        </div>
      )}

      {!isMcq && !usesSubparts && (
        <Field
          label={
            type === "TRUE_FALSE"
              ? "Answer (True / False — सही / गलत)"
              : type === "MATCH_COLUMN"
              ? "Answer key (only on the answer key)"
              : "Answer (optional · only on the answer key)"
          }
        >
          <MathRichEditor
            multiline
            value={answer}
            onChange={setAnswer}
            onActivate={activate({ type: "answer" })}
            placeholder={
              type === "MATCH_COLUMN"
                ? "(i) → (b), (ii) → (d), (iii) → (a), (iv) → (c)"
                : "Model answer or marking points"
            }
          />
        </Field>
      )}

      {/* Drawing and map boxes are the question itself, so their height stays here, not under "More details". */}
      {isDrawingType(type) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={type === "DRAW" ? "Drawing box height (mm)" : "Map box height (mm)"}>
            <input
              type="number"
              min={0}
              max={250}
              className="input"
              value={spaceMm}
              onChange={(e) => setSpaceMm(Math.max(0, Math.min(250, Number(e.target.value) || 0)))}
            />
          </Field>
          {type === "DRAW" && (
            <label className="flex items-center gap-2 pt-5 text-sm">
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
              Print graph-paper grid in the box
            </label>
          )}
        </div>
      )}
      </>
      )}

      {/* 3. Rarely needed settings, one collapsed row */}
      <details className="group rounded-xl border border-slate-200 bg-white" open={initial?.imagePath ? true : undefined}>
        <summary className="flex min-h-11 cursor-pointer select-none items-center justify-between gap-2 rounded-xl px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          <span>
            More details{" "}
            <span className="font-normal text-slate-500">· {detailsSummary(effDifficulty, effSkill)}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-4 border-t border-slate-200 px-3.5 py-3.5">
          {detailsExtra}

          {!isKindergartenType(type) && (
            <div>
              <span className="label">
                Figure <span className="font-normal text-slate-500">· optional</span>
              </span>
              {imagePath ? (
                <div className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(imagePath)} alt="Figure" className="max-h-36 max-w-xs rounded-lg border border-slate-200 bg-white object-contain shadow-2xs" />
                  <div className="flex flex-col gap-2">
                    <button type="button" className="btn btn-sm" onClick={() => setSketching(true)}>
                      <PencilRuler size={14} aria-hidden /> Edit
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => setDiagramSearchOpen(true)}>
                      <RefreshCw size={14} aria-hidden /> Replace
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setImagePath(null)}>
                      <X size={14} aria-hidden /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm" onClick={() => setDiagramSearchOpen(true)}>
                    <Library size={14} aria-hidden /> From library
                  </button>
                  <label className="btn btn-sm cursor-pointer">
                    <ImagePlus size={14} aria-hidden /> Upload
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void attach(f);
                      }}
                    />
                  </label>
                  <button type="button" className="btn btn-sm" onClick={() => setSketching(true)}>
                    <PencilRuler size={14} aria-hidden /> Draw
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tags: filled in from the question, one click to change */}
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2">
            <PillGroup
              label="Difficulty"
              auto={difficultySuggested}
              value={effDifficulty}
              options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
              onChange={(v) => {
                setDifficulty(v);
                setTouched((t) => ({ ...t, difficulty: true }));
              }}
            />
            <PillGroup
              label="Skill"
              auto={skillSuggested}
              value={effSkill}
              options={SKILLS.map((s) => ({ value: s.value, label: s.label }))}
              onChange={(v) => {
                setSkill(v);
                setTouched((t) => ({ ...t, skill: true }));
              }}
            />
          </div>

          {!isKindergartenType(type) && (
            <>
              {showAnswerSpace && (
                <Field
                  label="Blank answer space (mm)"
                  helper={
                    prePrimary
                      ? "Room left under the question for the child to write."
                      : "Classes 1 to 12 answer in a separate copy: set 0 to leave no space."
                  }
                >
                  <input
                    type="number"
                    min={0}
                    max={250}
                    className="input sm:max-w-40"
                    value={spaceMm}
                    onChange={(e) => setSpaceMm(Math.max(0, Math.min(250, Number(e.target.value) || 0)))}
                  />
                </Field>
              )}
              <Field
                label="Passage group"
                helper="Questions with the same value belong to one passage and are placed together in a passage section."
              >
                <input
                  className="input"
                  maxLength={64}
                  placeholder="e.g. unseen-1"
                  value={passageGroupId}
                  onChange={(e) => setPassageGroupId(e.target.value)}
                />
              </Field>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="label !mb-0">Hindi / regional translation</span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
                    disabled={!secondaryText.trim()}
                    onClick={() => {
                      if (secondaryText.trim()) {
                        setText((prev) => prev + (prev.includes(" / ") ? "" : " / ") + secondaryText.trim());
                        setSecondaryText("");
                      }
                    }}
                  >
                    + Add to question
                  </button>
                </div>
                <MathRichEditor
                  multiline
                  className="!min-h-14 text-sm leading-relaxed"
                  placeholder="e.g. प्रकाश संश्लेषण को परिभाषित कीजिए।"
                  value={secondaryText}
                  onActivate={activate({ type: "secondary" })}
                  onChange={setSecondaryText}
                />
              </div>
            </>
          )}
        </div>
      </details>

      {showPaperEditModes && (
        <div className="rounded-md border border-indigo-200 bg-indigo-50/60 p-3 space-y-1.5 text-xs text-slate-700">
          <div className="font-semibold text-slate-800">Save changes to</div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="paperEditMode"
              className="mt-0.5"
              value="FORK_COPY"
              checked={paperEditMode === "FORK_COPY"}
              onChange={() => setPaperEditMode("FORK_COPY")}
            />
            <div>
              <span className="font-medium text-slate-900">This paper only</span> <span className="text-slate-500">(recommended: the bank&apos;s copy stays as it is)</span>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="paperEditMode"
              className="mt-0.5"
              value="UPDATE_MASTER"
              checked={paperEditMode === "UPDATE_MASTER"}
              onChange={() => setPaperEditMode("UPDATE_MASTER")}
            />
            <div>
              <span className="font-medium text-slate-900">The question bank</span> <span className="text-slate-500">(every paper using this question changes too)</span>
            </div>
          </label>
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-5 py-3.5 backdrop-blur-xs shadow-lg z-10">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={busy || !effChapterId}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>

      {sketching && (
        <FigureStudio
          initialImageUrl={imagePath ? imageUrl(imagePath) : null}
          onCancel={() => setSketching(false)}
          onDone={async (png) => {
            setSketching(false);
            await attach(png);
          }}
        />
      )}

      {diagramSearchOpen && (
        <DiagramSearchModal
          isOpen={true}
          subject={book?.subject || ""}
          chapterTitle={chapters.find((c) => c.id === effChapterId)?.title || ""}
          questionText={text}
          onClose={() => setDiagramSearchOpen(false)}
          onSelectDiagram={({ imagePath }) => {
            setImagePath(imagePath);
          }}
          onOpenInStudio={() => {
            setDiagramSearchOpen(false);
            setSketching(true);
          }}
        />
      )}

      {aiImproverOpen && (
        <AIQuestionImproverModal
          initialText={text}
          initialOptions={options}
          initialAnswer={answer}
          type={type}
          onClose={() => setAiImproverOpen(false)}
          onApply={(improved) => {
            setText(improved.text);
            if (improved.options && improved.options.length > 0) {
              setOptions(improved.options);
            }
            if (improved.answer) {
              setAnswer(improved.answer);
            }
          }}
        />
      )}

      <TableModal
        isOpen={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        onInsert={handleInsertSnippet}
        initialMode="grid"
      />
    </form>
  );
}

function SuggestedNote({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <span id={id} className="mt-1 block text-[11px] text-indigo-700">
      {children}
    </span>
  );
}

type TemplateSetters = {
  setText: (v: string) => void;
  setOptions: (v: string[]) => void;
  setAnswer: (v: string) => void;
  setSubparts: (v: SubPart[]) => void;
  setMatchPairs: (v: MatchColumnPair[]) => void;
};

/** Ready-made starting points for a question type, offered in one "Use a template" menu. */
function templatesFor(type: string, targetMarks: number | undefined, f: TemplateSetters): { label: string; apply: () => void }[] {
  switch (type) {
    case "MCQ":
    case "ASSERTION_REASON":
      return [
        {
          label: "Assertion–Reason (English)",
          apply: () => {
            f.setText(
              "Assertion (A): [Enter your statement here]\nReason (R): [Enter your reason here]\n\nDirection: In the following question, a statement of Assertion (A) is followed by a statement of Reason (R). Choose the correct option."
            );
            f.setOptions([...DEFAULT_ASSERTION_OPTIONS_EN]);
            f.setAnswer("A");
          },
        },
        {
          label: "अभिकथन एवं कारण (Hindi)",
          apply: () => {
            f.setText(
              "अभिकथन (A): [यहाँ अपना कथन लिखें]\nकारण (R): [यहाँ कारण लिखें]\n\nनिर्देश: नीचे दो कथन दिए गए हैं—एक को अभिकथन (A) और दूसरे को कारण (R) कहा गया है। सही विकल्प का चयन कीजिए।"
            );
            f.setOptions([...DEFAULT_ASSERTION_OPTIONS_HI]);
            f.setAnswer("A");
          },
        },
      ];
    case "REFERENCE_CONTEXT":
      return [
        {
          label: "सन्दर्भ-प्रसंग सहित व्याख्या (Hindi)",
          apply: () => {
            f.setText(
              "निम्नलिखित पद्यांश/गद्यांश की सन्दर्भ एवं प्रसंग सहित व्याख्या कीजिए तथा उसका काव्य-सौन्दर्य (विशेष) भी स्पष्ट कीजिए:\n\n\"[यहाँ गद्यांश अथवा पद्यांश की पंक्तियाँ लिखें...]\""
            );
            f.setSubparts(getDefaultSubpartsForType("REFERENCE_CONTEXT", targetMarks ?? 5));
          },
        },
        {
          label: "Reference to context (English)",
          apply: () => {
            f.setText(
              "Read the following extract carefully and answer the questions that follow with reference to the context:\n\n\"[Paste stanza or prose extract here...]\""
            );
            const total = targetMarks && targetMarks >= 2 ? targetMarks : 4;
            f.setSubparts([
              { label: "(i)", text: "Name the chapter/poem and its author/poet.", marks: 1, answer: "" },
              { label: "(ii)", text: "Explain the context of the above lines.", marks: 1, answer: "" },
              { label: "(iii)", text: "What literary device / central idea is highlighted in this extract?", marks: Math.max(1, total - 2), answer: "" },
            ]);
          },
        },
      ];
    case "UNSEEN_PASSAGE":
      return [
        {
          label: "अपठित गद्यांश / काव्यांश (Hindi)",
          apply: () => {
            f.setText(
              "निम्नलिखित अपठित गद्यांश/काव्यांश को ध्यानपूर्वक पढ़कर नीचे दिए गए प्रश्नों के उत्तर लिखिए:\n\n[यहाँ अपठित गद्यांश अथवा काव्यांश का मूल पाठ लिखें...]"
            );
            const total = targetMarks && targetMarks >= 3 ? targetMarks : 5;
            f.setSubparts(
              total === 5
                ? [
                    { label: "(क)", text: "उपर्युक्त गद्यांश का उपयुक्त शीर्षक लिखिए।", marks: 1, answer: "" },
                    { label: "(ख)", text: "लेखक ने गद्यांश में किस मुख्य विषय पर प्रकाश डाला है?", marks: 1, answer: "" },
                    { label: "(ग)", text: "प्रस्तुत गद्यांश से हमें क्या प्रेरणा मिलती है?", marks: 1, answer: "" },
                    { label: "(घ)", text: "रेखांकित अंश का भाव स्पष्ट कीजिए तथा एक शब्द का विलोम/पर्यायवाची लिखिए।", marks: 2, answer: "" },
                  ]
                : getDefaultSubpartsForType("UNSEEN_PASSAGE", total)
            );
          },
        },
        {
          label: "Unseen passage (English)",
          apply: () => {
            f.setText("Read the following unseen passage carefully and answer the questions that follow:\n\n[Paste the unseen comprehension passage here...]");
            f.setSubparts(getDefaultSubpartsForType("UNSEEN_PASSAGE", targetMarks ?? 5));
          },
        },
      ];
    case "WRITING_SKILL":
      return [
        {
          label: "हिंदी पत्र-लेखन",
          apply: () => {
            f.setText("अपने विद्यालय के प्राचार्य महोदय को शुल्क-मुक्ति / तीन दिन के अवकाश हेतु एक प्रार्थना-पत्र लिखिए।");
            f.setAnswer("प्रारूप (प्रेषक/सेवा में, विषय, संबोधन) - 1 अंक, विषय-वस्तु - 2 अंक, भाषा एवं समापन - 1 अंक।");
          },
        },
        {
          label: "हिंदी निबंध (रूपरेखा सहित)",
          apply: () => {
            f.setText(
              "निम्नलिखित में से किसी एक विषय पर लगभग 120-150 शब्दों में रूपरेखा सहित सारगर्भित निबंध लिखिए:\n(क) पर्यावरण प्रदूषण: कारण एवं निवारण\n(ख) विज्ञान: वरदान या अभिशाप\n(ग) विद्यार्थी जीवन और अनुशासन"
            );
            f.setAnswer("रूपरेखा/प्रस्तावना - 1 अंक, विषय-विस्तार - 3 अंक, उपसंहार एवं भाषा-शैली - 1 अंक।");
          },
        },
      ];
    case "GRAMMAR":
      return [
        {
          label: "हिंदी व्याकरण (संधि / समास / मुहावरे)",
          apply: () =>
            f.setText(
              "निर्देशानुसार उत्तर दीजिए (Do as directed):\n(i) 'विद्यालय' शब्द का संधि-विच्छेद कर संधि का नाम लिखिए।\n(ii) 'नीलकमल' में कौन-सा समास है? समास-विग्रह कीजिए।\n(iii) 'आँखों का तारा होना' मुहावरे का अर्थ लिखकर वाक्य में प्रयोग कीजिए।"
            ),
        },
      ];
    case "CASE_STUDY":
      return [{ label: "CBSE case study parts", apply: () => f.setSubparts(getDefaultSubpartsForType("CASE_STUDY", targetMarks ?? 4)) }];
    case "MATCH_COLUMN":
      return [
        {
          label: "हिंदी साहित्य: रचना और रचनाकार",
          apply: () => {
            f.setText("सही जोड़ी बनाइए (स्तम्भ 'अ' को स्तम्भ 'ब' से सुमेलित कीजिए):");
            f.setMatchPairs([
              { left: "कामायनी", right: "हरिवंशराय बच्चन" },
              { left: "गोदान", right: "जयशंकर प्रसाद" },
              { left: "रामचरितमानस", right: "मुंशी प्रेमचंद" },
              { left: "मधुशाला", right: "गोस्वामी तुलसीदास" },
            ]);
            f.setAnswer("(A) → (ii), (B) → (iii), (C) → (iv), (D) → (i)");
          },
        },
      ];
    default:
      return [];
  }
}

/** A short single choice shown as buttons: one click instead of opening a dropdown. */
function PillGroup({
  label,
  value,
  options,
  auto,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  auto?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[13px] font-medium text-slate-700">{label}</span>
        {auto && (
          <span className="rounded-full bg-indigo-100 px-1.5 py-px text-[10px] font-semibold text-indigo-700" title="Filled in from the question; click to change">
            auto
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`min-h-8 rounded-full border px-3 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 ${
                on
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
