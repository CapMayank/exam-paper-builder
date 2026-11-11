"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ImagePlus,
  Library,
  PencilRuler,
  Plus,
  RefreshCw,
  Shuffle,
  Sigma,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { type Book, type QuestionDto, type SubPart, attemptedSubpartsMarks, validateSubPartsSum } from "@/lib/types";
import {
  type ChapterBank,
  DIFFICULTY_LABEL,
  SKILLS,
  skillOf,
  suggestChapter,
  suggestDifficulty,
  suggestSkill,
} from "@/lib/questionTagging";
import { MathRichEditor, type MathRichEditorHandle } from "./MathRichEditor";
import { MathToolbar } from "./MathToolbar";
import { DiagramSearchModal } from "./DiagramSearchModal";
import { FigureStudio } from "./figure-studio";
import { AIQuestionImproverModal } from "./AIQuestionImproverModal";
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

const DEFAULT_ASSERTION_OPTIONS_EN = [
  "Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).",
  "Both Assertion (A) and Reason (R) are true but Reason (R) is not the correct explanation of Assertion (A).",
  "Assertion (A) is true but Reason (R) is false.",
  "Assertion (A) is false but Reason (R) is true.",
];

const DEFAULT_ASSERTION_OPTIONS_HI = [
  "अभिकथन (A) और कारण (R) दोनों सही हैं तथा कारण (R), अभिकथन (A) की सही व्याख्या करता है।",
  "अभिकथन (A) और कारण (R) दोनों सही हैं, परन्तु कारण (R), अभिकथन (A) की सही व्याख्या नहीं करता है।",
  "अभिकथन (A) सही है, किंतु कारण (R) गलत है।",
  "अभिकथन (A) गलत है, किंतु कारण (R) सही है।",
];

function getSubpartLabel(index: number): string {
  return ROMAN_LABELS[index] ?? `(${index + 1})`;
}

function getDefaultSubpartsForType(qType?: string, targetMarks?: number): SubPart[] {
  const total = targetMarks && targetMarks >= 2 ? targetMarks : 4;
  if (qType === "REFERENCE_CONTEXT") {
    if (total === 5) {
      return [
        { label: "(क)", text: "सन्दर्भ (Reference): पाठ एवं कवि/लेखक का नाम लिखिए।", marks: 1, answer: "" },
        { label: "(ख)", text: "प्रसंग (Context): पंक्तियों का मुख्य प्रसंग स्पष्ट कीजिए।", marks: 1, answer: "" },
        { label: "(ग)", text: "व्याख्या (Explanation): प्रस्तुत अंश की सप्रसंग व्याख्या कीजिए।", marks: 2, answer: "" },
        { label: "(घ)", text: "विशेष / काव्य-सौन्दर्य (Literary Beauty): भाषा, शैली, रस एवं अलंकार लिखिए।", marks: 1, answer: "" },
      ];
    }
    if (total === 3) {
      return [
        { label: "(क)", text: "सन्दर्भ एवं प्रसंग (Reference & Context)", marks: 1, answer: "" },
        { label: "(ख)", text: "व्याख्या एवं विशेष (Explanation & Literary Note)", marks: 2, answer: "" },
      ];
    }
    return [
      { label: "(क)", text: "सन्दर्भ एवं प्रसंग (Reference & Context)", marks: 1, answer: "" },
      { label: "(ख)", text: "व्याख्या (Explanation)", marks: Math.max(1, total - 2), answer: "" },
      { label: "(ग)", text: "विशेष / काव्य-सौन्दर्य (Poetic / Literary Beauty)", marks: 1, answer: "" },
    ];
  }
  if (qType === "UNSEEN_PASSAGE") {
    if (total === 5) {
      return [
        { label: "(i)", text: "उपर्युक्त गद्यांश का उपयुक्त शीर्षक लिखिए। / Give a suitable title to the passage.", marks: 1, answer: "" },
        { label: "(ii)", text: "", marks: 1, answer: "" },
        { label: "(iii)", text: "", marks: 1, answer: "" },
        { label: "(iv)", text: "", marks: 2, answer: "" },
      ];
    }
    return [
      { label: "(i)", text: "", marks: 1, answer: "" },
      { label: "(ii)", text: "", marks: 1, answer: "" },
      { label: "(iii)", text: "", marks: Math.max(1, total - 2), answer: "" },
    ];
  }
  if (qType === "CASE_STUDY") {
    return [
      { label: "(i)", text: "", marks: 1, answer: "" },
      { label: "(ii)", text: "", marks: 1, answer: "" },
      { label: "(iii)", text: "", marks: Math.max(1, total - 2), answer: "" },
    ];
  }
  return [];
}

/** Create or edit a question. Saving always writes it to the question bank. */
export function QuestionForm({
  books,
  initial,
  fixedBookId,
  fixedType,
  targetMarks,
  allowedChapterIds,
  openMarks,
  submitLabel = "Save question",
  showPaperEditModes,
  customSaveHandler,
  onSaved,
  onCancel,
}: {
  books: Book[];
  initial?: QuestionDto;
  fixedBookId?: string;
  fixedType?: string;
  targetMarks?: number;
  allowedChapterIds?: string[];
  /** Marks still open per chapter in the paper's blueprint; a new question's chapter is suggested from these. */
  openMarks?: Record<string, number>;
  submitLabel?: string;
  showPaperEditModes?: boolean;
  customSaveHandler?: (payload: unknown, mode: "UPDATE_MASTER" | "FORK_COPY") => Promise<void>;
  onSaved?: (q: QuestionDto) => void;
  onCancel: () => void;
}) {
  const [paperEditMode, setPaperEditMode] = useState<"UPDATE_MASTER" | "FORK_COPY">("FORK_COPY");
  const [bookId, setBookId] = useState(initial?.bookId ?? fixedBookId ?? books[0]?.id ?? "");
  const book = books.find((b) => b.id === bookId);
  const allowedKey = allowedChapterIds?.join(",");
  const chapters = useMemo(
    () => (book?.chapters ?? []).filter((c) => !allowedChapterIds || allowedChapterIds.includes(c.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book, allowedKey],
  );
  const initialChapterBelongs = chapters.some((c) => c.id === initial?.chapterId);
  const [chapterId, setChapterId] = useState(
    initialChapterBelongs ? initial!.chapterId : (chapters[0]?.id ?? "")
  );
  const resolvedInitialType = initial?.type ?? fixedType ?? "SHORT";
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
  const [touched, setTouched] = useState({ chapter: false, difficulty: false, skill: false });
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
  const chapterSuggestion = autoTag && !touched.chapter ? suggestChapter(text, chapters, openMarks, chapterBank) : null;
  const effChapterId = chapterSuggestion?.chapterId ?? chapterId;
  const difficultySuggested = autoTag && !touched.difficulty && hasText;
  const effDifficulty = difficultySuggested ? suggestDifficulty(text, type, tagMarks) : difficulty;
  const skillSuggested = autoTag && !touched.skill && hasText;
  const effSkill = skillSuggested ? suggestSkill(text, type) : skill;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const isMcq = isMcqLikeType(type);
    const usesSubparts = isSubpartQuestionType(type) || (subparts && subparts.length > 0);

    if (isMcq && !usesSubparts && options.some((o) => !o.trim())) {
      return setError("Fill in every option, or remove the empty ones.");
    }
    if (isMcq && !usesSubparts && options.length < MIN_OPTIONS) return setError(`Add at least ${MIN_OPTIONS} options.`);

    if (type === "MATCH_COLUMN") {
      if (matchPairs.length < MIN_OPTIONS) {
        return setError(`Add at least ${MIN_OPTIONS} matching rows.`);
      }
      if (matchPairs.some((p) => !p.left.trim() || !p.right.trim())) {
        return setError("Fill in both Column A (स्तम्भ 'अ') and Column B (स्तम्भ 'ब') for every row.");
      }
    }

    if (usesSubparts) {
      if (subparts.length === 0) {
        return setError("Please add at least one sub-question / subpart.");
      }
      if (subparts.some((sp) => !sp.text.trim())) {
        return setError("Fill in the prompt text for every subpart.");
      }
      if (subparts.some((sp) => !sp.marks || sp.marks <= 0)) {
        return setError("Every subpart must have at least 1 mark allocated.");
      }
      const totalSubMarks = attemptedSubpartsMarks(subparts, attemptCount);
      if (targetMarks !== undefined && !validateSubPartsSum(subparts, targetMarks, attemptCount)) {
        return setError(
          attemptCount
            ? `Any ${attemptCount} of these parts add up to ${totalSubMarks}m, but the question must be worth ${targetMarks}m. Adjust the parts or how many are answered.`
            : `Subpart marks sum (${totalSubMarks}m) must equal section question marks (${targetMarks}m). Adjust individual subparts to balance.`
        );
      }
      if (attemptCount && subparts.some((sp) => sp.marks !== subparts[0].marks)) {
        return setError("When students answer any few of the parts, every part must carry the same marks.");
      }
    }

    if (!text.trim()) return setError("Enter the question text.");
    const isKdg = isKindergartenType(type);
    if (isKdg && !text.trim()) {
      return setError("Please provide an activity instruction for the question.");
    }

    setBusy(true);
    try {
      const serializedOptions = isKdg
        ? [serializeKindergartenConfig(kdgConfig)]
        : type === "MATCH_COLUMN"
        ? matchPairs.map((p) => serializeMatchColumnPair(p.left, p.right))
        : isMcq
        ? options.map((o) => o.trim())
        : [];

      const payload = {
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
              marks: Math.max(1, Math.round(Number(sp.marks) || 1)),
              label: sp.label.trim() || "(i)",
              text: sp.text.trim(),
              answer: sp.answer?.trim() || "",
              options: Array.isArray(sp.options) && sp.options.length > 0 ? sp.options.map((o) => o.trim()) : undefined,
            }))
          : [],
        ...(usesSubparts && attemptCount ? { attemptCount } : {}),
      };
      if (customSaveHandler) {
        await customSaveHandler(payload, paperEditMode);
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

  const typeLocked = !!fixedType || (!!initial && (initial.timesUsed ?? 0) > 0);
  const bookLocked = !!fixedBookId || (!!initial && (initial.timesUsed ?? 0) > 0);
  const isMcq = isMcqLikeType(type);
  const usesSubparts = isSubpartQuestionType(type) || (subparts && subparts.length > 0);
  const prePrimary = isPrePrimaryClass(book?.className);
  // Answer space is a worksheet setting: shown for pre-primary, or to clear space an older question still has.
  const showAnswerSpace = !isDrawingType(type) && (prePrimary || (initial?.spaceMm ?? 0) > 0);

  function changeType(newType: string) {
    setType(newType);
    if (!initial) setSpaceMm(defaultSpaceMm(newType, book?.className));
    if (isKindergartenType(newType)) {
      const plugin = getKindergartenActivity(newType);
      if (plugin) {
        const defCfg = plugin.defaultConfig(book?.subject);
        setKdgConfig(defCfg);
        if (!text.trim() || isKindergartenType(type)) {
          setText(defCfg.instruction);
        }
      }
    } else if (newType === "ASSERTION_REASON") {
      setOptions([...DEFAULT_ASSERTION_OPTIONS_EN]);
      if (!text.trim()) {
        setText(
          "Assertion (A): [Enter statement here]\nReason (R): [Enter reason here]\n\nDirection: In the following question, a statement of Assertion (A) is followed by a statement of Reason (R). Choose the correct option."
        );
      }
      if (!answer) setAnswer("A");
    } else if (newType === "MATCH_COLUMN") {
      if (!text.trim()) {
        setText("Match Column A with Column B and choose the correct match: / सही जोड़ी मिलाइए (स्तम्भ 'अ' को स्तम्भ 'ब' से सुमेलित कीजिए):");
      }
    } else if (isSubpartQuestionType(newType)) {
      if (subparts.length === 0) {
        setSubparts(getDefaultSubpartsForType(newType, targetMarks));
      }
    } else if (!canHaveSubparts(newType)) {
      setSubparts([]);
    }
  }

  const templates = templatesFor(type, targetMarks, { setText, setOptions, setAnswer, setSubparts, setMatchPairs });
  const chapterNote = chapterSuggestion
    ? chapterSuggestion.reason === "title"
      ? "Picked for you: the question matches this chapter"
      : chapterSuggestion.reason === "bank"
      ? "Picked for you: like questions already in this chapter"
      : "Picked for you: the chapter with the most marks left"
    : null;

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBanner message={error} />

      {/* 1. Where the question goes */}
      <div className={`grid gap-3 ${bookLocked ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
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
        <Field label="Question type">
          <select className="input" value={type} disabled={typeLocked} onChange={(e) => changeType(e.target.value)}>
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
        <Field label="Chapter">
          <select
            className="input"
            value={effChapterId}
            required
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
          {chapterNote && <SuggestedNote>{chapterNote}</SuggestedNote>}
        </Field>
      </div>

      {isPrePrimaryClass(book?.className) && (
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

      {/* Multi-part Sub-questions Editor (Case Study, Unseen Passage, Reference to Context) */}
      {usesSubparts && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-800">Parts of the question</span>
              {(() => {
                const total = attemptedSubpartsMarks(subparts, attemptCount);
                const expected = targetMarks ?? total;
                const isBalanced = total === expected;
                return isBalanced ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                    ✓ {total}/{expected} marks
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                    {total}/{expected} marks · {total > expected ? `${total - expected} too many` : `${expected - total} short`}
                  </span>
                );
              })()}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubparts(getDefaultSubpartsForType(type, targetMarks));
                  setAttemptCount(undefined);
                }}
                className="btn btn-xs bg-white font-medium"
              >
                Reset parts
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubparts([
                    ...subparts,
                    { label: getSubpartLabel(subparts.length), text: "", marks: 1, answer: "" },
                  ]);
                }}
                className="btn btn-xs btn-primary font-medium"
              >
                <Plus size={12} /> Add part
              </button>
            </div>
          </div>

          {subparts.length > 1 && (
            <label className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
              <span className="font-medium">Students answer</span>
              <select
                className="input !w-auto !py-1 text-xs"
                value={attemptCount ?? 0}
                onChange={(e) => setAttemptCount(Number(e.target.value) || undefined)}
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
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className="input !py-0.5 !px-1.5 w-14 text-xs font-semibold text-center"
                        value={sp.marks}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(20, Number(e.target.value) || 1));
                          setSubparts(subparts.map((s, j) => (j === i ? { ...s, marks: val } : s)));
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...subparts];
                        const temp = next[i - 1];
                        next[i - 1] = next[i];
                        next[i] = temp;
                        setSubparts(next);
                      }}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={i === subparts.length - 1}
                      onClick={() => {
                        const next = [...subparts];
                        const temp = next[i + 1];
                        next[i + 1] = next[i];
                        next[i] = temp;
                        setSubparts(next);
                      }}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={subparts.length <= 1}
                      onClick={() => setSubparts(subparts.filter((_, j) => j !== i))}
                      className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                      title="Delete subpart"
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
                    placeholder={`Model answer / marking rubric for ${sp.label || i + 1} (optional)`}
                    onActivate={activate({ type: "subpart-answer", index: i })}
                    onChange={(v) => setSubparts((subs) => subs.map((s, j) => (j === i ? { ...s, answer: v } : s)))}
                  />
                </div>

                {sp.options && sp.options.length > 0 && (
                  <div className="space-y-1.5 pt-1 rounded-md bg-slate-50 p-2.5 border border-slate-200">
                    <label className="text-[11px] font-semibold text-slate-600">Sub-question Options:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sp.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500 w-5">({String.fromCharCode(97 + optIdx)})</span>
                          <MathRichEditor
                            className="flex-1 text-xs"
                            value={opt}
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

      {/* 3. Figure */}
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

      {/* 4. Tags: filled in from the question, one click to change */}
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

      {/* 5. Rarely needed settings */}
      {!isKindergartenType(type) && (
        <details className="group rounded-xl border border-slate-200 bg-white">
          <summary className="flex min-h-11 cursor-pointer select-none items-center justify-between gap-2 rounded-xl px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span>
              More options{" "}
              <span className="font-normal text-slate-500">
                · {showAnswerSpace ? "answer space, " : ""}passage group, Hindi translation
              </span>
            </span>
            <ChevronDown size={16} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="space-y-4 border-t border-slate-200 px-3.5 py-3.5">
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
          </div>
        </details>
      )}

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
    </form>
  );
}

function SuggestedNote({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-[11px] text-indigo-700">{children}</span>;
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
