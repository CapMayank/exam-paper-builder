"use client";

import { ArrowDown, ArrowUp, ImagePlus, PencilRuler, Plus, Printer, RefreshCw, Shuffle, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { api, imageUrl, uploadImage } from "@/lib/client";
import {
  DIFFICULTIES,
  isKindergartenType,
  isMcqLikeType,
  isPrePrimaryClass,
  isSubpartQuestionType,
  MAX_OPTIONS,
  MIN_OPTIONS,
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
import { type Book, type QuestionDto, type SubPart, subpartsTotalMarks } from "@/lib/types";
import { MathText } from "./MathText";
import { MathToolbar } from "./MathToolbar";
import { DiagramSearchModal } from "./DiagramSearchModal";
import { FigureStudio } from "./figure-studio";
import { AIQuestionImproverModal } from "./AIQuestionImproverModal";
import { ErrorBanner, Field } from "./ui";

const DEFAULT_SPACE: Record<string, number> = {
  VERY_SHORT: 10,
  SHORT: 20,
  LONG: 60,
  WRITING_SKILL: 70,
  GRAMMAR: 15,
  DRAW: 70,
  MAP_WORK: 70,
};
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
  submitLabel?: string;
  showPaperEditModes?: boolean;
  customSaveHandler?: (payload: unknown, mode: "UPDATE_MASTER" | "FORK_COPY") => Promise<void>;
  onSaved?: (q: QuestionDto) => void;
  onCancel: () => void;
}) {
  const [paperEditMode, setPaperEditMode] = useState<"UPDATE_MASTER" | "FORK_COPY">("FORK_COPY");
  const [bookId, setBookId] = useState(initial?.bookId ?? fixedBookId ?? books[0]?.id ?? "");
  const book = books.find((b) => b.id === bookId);
  const chapters = (book?.chapters ?? []).filter((c) => !allowedChapterIds || allowedChapterIds.includes(c.id));
  const initialChapterBelongs = chapters.some((c) => c.id === initial?.chapterId);
  const [chapterId, setChapterId] = useState(
    initialChapterBelongs ? initial!.chapterId : (chapters[0]?.id ?? "")
  );
  const resolvedInitialType = initial?.type ?? fixedType ?? "SHORT";
  const [type, setType] = useState(resolvedInitialType);
  const [text, setText] = useState(initial?.text ?? "");
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
    if (initial?.type === "MATCH_COLUMN" && initial.options && initial.options.length > 0) {
      return parseMatchColumnPairs(initial.options);
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
  const [kdgConfig, setKdgConfig] = useState<any>(() => {
    if (isKindergartenType(resolvedInitialType)) {
      const raw = initial?.options?.[0] ? initial.options[0] : JSON.stringify(initial?.options || []);
      return parseKindergartenConfig(resolvedInitialType, raw, book?.subject);
    }
    const plugin = getKindergartenActivity(resolvedInitialType);
    return plugin ? plugin.defaultConfig(book?.subject) : null;
  });
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "MEDIUM");
  const [imagePath, setImagePath] = useState<string | null>(initial?.imagePath ?? null);
  const [spaceMm, setSpaceMm] = useState(initial?.spaceMm ?? DEFAULT_SPACE[resolvedInitialType] ?? 0);
  const [showGrid, setShowGrid] = useState(initial?.showGrid ?? false);
  const [sketching, setSketching] = useState(false);
  const [diagramSearchOpen, setDiagramSearchOpen] = useState(false);
  const [aiImproverOpen, setAiImproverOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeElementRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [activeField, setActiveField] = useState<
    | { type: "text" }
    | { type: "option"; index: number }
    | { type: "answer" }
    | { type: "subpart-text"; index: number }
    | { type: "subpart-answer"; index: number }
  >({ type: "text" });

  function handleInsertSnippet(snippet: string) {
    const el = activeElementRef.current;
    if (el && document.body.contains(el)) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const currentVal = el.value;
      const before = currentVal.substring(0, start);
      const after = currentVal.substring(end);

      let toInsert = snippet;
      if (before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n")) {
        toInsert = " " + toInsert;
      }
      if (after.length > 0 && !after.startsWith(" ") && !after.startsWith("\n")) {
        toInsert = toInsert + " ";
      }

      const newVal = before + toInsert + after;
      const newCursor = before.length + toInsert.length;

      if (activeField.type === "text") {
        setText(newVal);
      } else if (activeField.type === "option") {
        const idx = activeField.index;
        setOptions((opts) => opts.map((opt, j) => (j === idx ? newVal : opt)));
      } else if (activeField.type === "answer") {
        setAnswer(newVal);
      } else if (activeField.type === "subpart-text") {
        const idx = activeField.index;
        setSubparts((subs) => subs.map((sp, j) => (j === idx ? { ...sp, text: newVal } : sp)));
      } else if (activeField.type === "subpart-answer") {
        const idx = activeField.index;
        setSubparts((subs) => subs.map((sp, j) => (j === idx ? { ...sp, answer: newVal } : sp)));
      }

      setTimeout(() => {
        try {
          el.focus();
          el.setSelectionRange(newCursor, newCursor);
        } catch {}
      }, 0);
      return;
    }

    if (activeField.type === "text") {
      setText((prev) => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + snippet + " ");
    } else if (activeField.type === "option") {
      const idx = activeField.index;
      setOptions((opts) =>
        opts.map((opt, j) => (j === idx ? opt + (opt.endsWith(" ") || opt === "" ? "" : " ") + snippet + " " : opt))
      );
    } else if (activeField.type === "answer") {
      setAnswer((prev) => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + snippet + " ");
    } else if (activeField.type === "subpart-text") {
      const idx = activeField.index;
      setSubparts((subs) =>
        subs.map((sp, j) =>
          j === idx ? { ...sp, text: sp.text + (sp.text.endsWith(" ") || sp.text === "" ? "" : " ") + snippet + " " } : sp
        )
      );
    } else if (activeField.type === "subpart-answer") {
      const idx = activeField.index;
      setSubparts((subs) =>
        subs.map((sp, j) =>
          j === idx
            ? {
                ...sp,
                answer:
                  (sp.answer ?? "") +
                  ((sp.answer ?? "").endsWith(" ") || sp.answer === "" ? "" : " ") +
                  snippet +
                  " ",
              }
            : sp
        )
      );
    }
  }

  async function attach(blob: Blob) {
    setError(null);
    try {
      setImagePath(await uploadImage(blob));
    } catch (e) {
      setError((e as Error).message);
    }
  }

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
      const totalSubMarks = subpartsTotalMarks(subparts);
      if (targetMarks !== undefined && totalSubMarks !== targetMarks) {
        return setError(
          `Subpart marks sum (${totalSubMarks}m) must equal section question marks (${targetMarks}m). Adjust individual subparts to balance.`
        );
      }
    }

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
        chapterId,
        type,
        text,
        options: serializedOptions,
        answer: isMcq ? (answer || "") : answer,
        difficulty,
        imagePath,
        spaceMm,
        showGrid: (type === "DRAW" || type === "MAP_WORK") && showGrid,
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
      const roman = ROMAN_LABELS[origIdx] ?? `(${origIdx + 1})`;
      const letter = LETTERS[newColBIdx]?.toLowerCase() ?? String(newColBIdx + 1);
      return `${roman} → (${letter})`;
    });
    setMatchPairs(nextPairs);
    setAnswer(keyParts.join(", "));
  }

  const typeLocked = !!fixedType || (!!initial && (initial.timesUsed ?? 0) > 0);
  const isMcq = isMcqLikeType(type);
  const usesSubparts = isSubpartQuestionType(type) || (subparts && subparts.length > 0);

  return (
    <form onSubmit={submit} className="space-y-3">
      <ErrorBanner message={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Book">
          <select
            className="input"
            value={bookId}
            disabled={!!fixedBookId || (!!initial && (initial.timesUsed ?? 0) > 0)}
            onChange={(e) => {
              setBookId(e.target.value);
              setChapterId(books.find((b) => b.id === e.target.value)?.chapters[0]?.id ?? "");
            }}
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.className} · {b.subject} · {b.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chapter">
          <select className="input" value={chapterId} required onChange={(e) => setChapterId(e.target.value)}>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number}. {c.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            className="input"
            value={type}
            disabled={typeLocked}
            onChange={(e) => {
              const newType = e.target.value;
              setType(newType);
              if (!initial) setSpaceMm(DEFAULT_SPACE[newType] ?? 0);
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
                setSubparts(getDefaultSubpartsForType(newType, targetMarks));
              }
            }}
          >
            {isPrePrimaryClass(book?.className) ? (
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
        <Field label="Difficulty">
          <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
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
          {/* Visual Math & Science Equation Editor Toolbar */}
          <div>
            <MathToolbar onInsert={handleInsertSnippet} />
          </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
          <span className="label !mb-0">
            {type === "FILL_BLANK"
              ? "Question (use ______ for the blank / रिक्त स्थान हेतु ______ का प्रयोग करें)"
              : type === "CASE_STUDY"
              ? "Case narrative / Context scenario"
              : type === "UNSEEN_PASSAGE"
              ? "Unseen Passage / Poem text (अपठित गद्यांश अथवा काव्यांश यहाँ लिखें)"
              : type === "REFERENCE_CONTEXT"
              ? "Extract / Gadyansh-Padyansh (सन्दर्भ-प्रसंग व्याख्या हेतु गद्यांश / पद्यांश / श्लोक)"
              : type === "MATCH_COLUMN"
              ? "Question heading / instruction (e.g. Match the following / सही जोड़ी बनाइए)"
              : "Question text"}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAiImproverOpen(true)}
              className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
              title="AI Polish: Refine to CBSE standards, generate distractors, add Hindi, or write marking scheme"
            >
              <Sparkles size={12} className="text-indigo-600" />
              <span>AI Polish &amp; Rewriter</span>
            </button>
            {(type === "MCQ" || type === "ASSERTION_REASON") && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setText(
                      "Assertion (A): [Enter your statement here]\nReason (R): [Enter your reason here]\n\nDirection: In the following question, a statement of Assertion (A) is followed by a statement of Reason (R). Choose the correct option."
                    );
                    setOptions([...DEFAULT_ASSERTION_OPTIONS_EN]);
                    setAnswer("A");
                  }}
                  className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition"
                  title="Pre-fill English Assertion & Reason question structure"
                >
                  + Preset: Assertion-Reason (EN)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setText(
                      "अभिकथन (A): [यहाँ अपना कथन लिखें]\nकारण (R): [यहाँ कारण लिखें]\n\nनिर्देश: नीचे दो कथन दिए गए हैं—एक को अभिकथन (A) और दूसरे को कारण (R) कहा गया है। सही विकल्प का चयन कीजिए।"
                    );
                    setOptions([...DEFAULT_ASSERTION_OPTIONS_HI]);
                    setAnswer("A");
                  }}
                  className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                  title="Pre-fill Hindi अभिकथन एवं कारण question structure"
                >
                  + Preset: अभिकथन एवं कारण (Hindi)
                </button>
              </>
            )}
            {type === "REFERENCE_CONTEXT" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setText(
                      "निम्नलिखित पद्यांश/गद्यांश की सन्दर्भ एवं प्रसंग सहित व्याख्या कीजिए तथा उसका काव्य-सौन्दर्य (विशेष) भी स्पष्ट कीजिए:\n\n\"[यहाँ गद्यांश अथवा पद्यांश की पंक्तियाँ लिखें...]\""
                    );
                    setSubparts(getDefaultSubpartsForType("REFERENCE_CONTEXT", targetMarks ?? 5));
                  }}
                  className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                >
                  + Preset: सन्दर्भ-प्रसंग सहित व्याख्या (Hindi)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setText(
                      "Read the following extract carefully and answer the questions that follow with reference to the context:\n\n\"[Paste stanza or prose extract here...]\""
                    );
                    const total = targetMarks && targetMarks >= 2 ? targetMarks : 4;
                    setSubparts([
                      { label: "(i)", text: "Name the chapter/poem and its author/poet.", marks: 1, answer: "" },
                      { label: "(ii)", text: "Explain the context of the above lines.", marks: 1, answer: "" },
                      { label: "(iii)", text: "What literary device / central idea is highlighted in this extract?", marks: Math.max(1, total - 2), answer: "" },
                    ]);
                  }}
                  className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition"
                >
                  + Preset: English Reference to Context
                </button>
              </>
            )}
            {type === "UNSEEN_PASSAGE" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setText(
                      "निम्नलिखित अपठित गद्यांश/काव्यांश को ध्यानपूर्वक पढ़कर नीचे दिए गए प्रश्नों के उत्तर लिखिए:\n\n[यहाँ अपठित गद्यांश अथवा काव्यांश का मूल पाठ लिखें...]"
                    );
                    const total = targetMarks && targetMarks >= 3 ? targetMarks : 5;
                    if (total === 5) {
                      setSubparts([
                        { label: "(क)", text: "उपर्युक्त गद्यांश का उपयुक्त शीर्षक लिखिए।", marks: 1, answer: "" },
                        { label: "(ख)", text: "लेखक ने गद्यांश में किस मुख्य विषय पर प्रकाश डाला है?", marks: 1, answer: "" },
                        { label: "(ग)", text: "प्रस्तुत गद्यांश से हमें क्या प्रेरणा मिलती है?", marks: 1, answer: "" },
                        { label: "(घ)", text: "रेखांकित अंश का भाव स्पष्ट कीजिए तथा एक शब्द का विलोम/पर्यायवाची लिखिए।", marks: 2, answer: "" },
                      ]);
                    } else {
                      setSubparts(getDefaultSubpartsForType("UNSEEN_PASSAGE", total));
                    }
                  }}
                  className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                >
                  + Preset: अपठित गद्यांश/काव्यांश (Hindi)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setText(
                      "Read the following unseen passage carefully and answer the questions that follow:\n\n[Paste the unseen comprehension passage here...]"
                    );
                    setSubparts(getDefaultSubpartsForType("UNSEEN_PASSAGE", targetMarks ?? 5));
                  }}
                  className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition"
                >
                  + Preset: English Unseen Passage
                </button>
              </>
            )}
            {type === "WRITING_SKILL" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setText(
                      "अपने विद्यालय के प्राचार्य महोदय को शुल्क-मुक्ति / तीन दिन के अवकाश हेतु एक प्रार्थना-पत्र लिखिए।"
                    );
                    setAnswer("प्रारूप (प्रेषक/सेवा में, विषय, संबोधन) - 1 अंक, विषय-वस्तु - 2 अंक, भाषा एवं समापन - 1 अंक।");
                  }}
                  className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                >
                  + Preset: हिंदी पत्र-लेखन
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setText(
                      "निम्नलिखित में से किसी एक विषय पर लगभग 120-150 शब्दों में रूपरेखा सहित सारगर्भित निबंध लिखिए:\n(क) पर्यावरण प्रदूषण: कारण एवं निवारण\n(ख) विज्ञान: वरदान या अभिशाप\n(ग) विद्यार्थी जीवन और अनुशासन"
                    );
                    setAnswer("रूपरेखा/प्रस्तावना - 1 अंक, विषय-विस्तार - 3 अंक, उपसंहार एवं भाषा-शैली - 1 अंक।");
                  }}
                  className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                >
                  + Preset: हिंदी निबंध (रूपरेखा सहित)
                </button>
              </>
            )}
            {type === "GRAMMAR" && (
              <button
                type="button"
                onClick={() => {
                  setText(
                    "निर्देशानुसार उत्तर दीजिए (Do as directed):\n(i) 'विद्यालय' शब्द का संधि-विच्छेद कर संधि का नाम लिखिए।\n(ii) 'नीलकमल' में कौन-सा समास है? समास-विग्रह कीजिए।\n(iii) 'आँखों का तारा होना' मुहावरे का अर्थ लिखकर वाक्य में प्रयोग कीजिए।"
                  );
                }}
                className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
              >
                + Preset: हिंदी व्याकरण (संधि/समास/मुहावरे)
              </button>
            )}
            {type === "CASE_STUDY" && (
              <button
                type="button"
                onClick={() => {
                  setSubparts(getDefaultSubpartsForType("CASE_STUDY", targetMarks ?? 4));
                }}
                className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition inline-flex items-center gap-1"
                title="Pre-fill standard CBSE Section E Case Study structure"
              >
                <Sparkles size={12} /> + Preset: CBSE Case Study
              </button>
            )}
          </div>
        </div>
        <textarea
          className="input min-h-24"
          value={text}
          required
          onFocus={(e) => {
            setActiveField({ type: "text" });
            activeElementRef.current = e.currentTarget;
          }}
          onSelect={(e) => {
            activeElementRef.current = e.currentTarget;
          }}
          placeholder="Type question text here. Click symbols in Math Assistant above to insert formulas, or type $...$ for math, e.g. $x^2 + 5x + 6 = 0$."
          onChange={(e) => setText(e.target.value)}
        />
        {(text.match(/\$/g) || []).length % 2 !== 0 && (
          <div className="mt-1 rounded bg-amber-50 px-2.5 py-1 text-xs text-amber-800 border border-amber-200">
            ⚠️ Tip: Mismatched &apos;$&apos; detected ({(text.match(/\$/g) || []).length} total). Formulas must start and end with &apos;$&apos;, like <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">$x^2$</code>.
          </div>
        )}
        {text.trim() && (
          <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5 text-xs text-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-1 pb-1 border-b border-indigo-100/70">
              <span className="font-semibold text-indigo-800 flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-600" />
                Live KaTeX &amp; Formula Preview
              </span>
              <span className="text-[10px] text-slate-400">WYSIWYG live rendering</span>
            </div>
            <div className="text-slate-900 leading-relaxed font-normal whitespace-pre-wrap">
              <MathText text={text} />
            </div>
          </div>
        )}
      </div>

      {/* Match the Column Pair Editor */}
      {type === "MATCH_COLUMN" && (
        <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/30 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-2">
            <div>
              <span className="font-bold text-sm text-slate-800">
                Match the Column Rows (स्तम्भ &apos;अ&apos; ↔ स्तम्भ &apos;ब&apos;)
              </span>
              <p className="text-[11px] text-slate-500">
                Enter items for Column A and Column B. Tip: Enter matching pairs in order, then click &ldquo;Shuffle Column B &amp; Generate Key&rdquo;!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setText("सही जोड़ी बनाइए (स्तम्भ 'अ' को स्तम्भ 'ब' से सुमेलित कीजिए):");
                  setMatchPairs([
                    { left: "कामायनी", right: "जयशंकर प्रसाद" },
                    { left: "गोदान", right: "मुंशी प्रेमचंद" },
                    { left: "रामचरितमानस", right: "गोस्वामी तुलसीदास" },
                    { left: "मधुशाला", right: "हरिवंशराय बच्चन" },
                  ]);
                  setAnswer("(i) → (a), (ii) → (b), (iii) → (c), (iv) → (d)");
                }}
                className="btn btn-xs border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium"
              >
                + Hindi साहित्य जोड़ी Preset
              </button>
              <button
                type="button"
                onClick={shuffleMatchColumnB}
                className="btn btn-xs border-teal-300 bg-white text-teal-800 hover:bg-teal-50 font-medium"
                title="Randomly shuffle Column B items and automatically write the matching Answer Key below"
              >
                <Shuffle size={12} /> Shuffle Column B &amp; Generate Key
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
                    {ROMAN_LABELS[idx] ?? `(${idx + 1})`}
                  </span>
                  <input
                    className="input text-xs"
                    value={pair.left}
                    placeholder={`Column A item ${idx + 1}`}
                    onChange={(e) =>
                      setMatchPairs(matchPairs.map((p, j) => (j === idx ? { ...p, left: e.target.value } : p)))
                    }
                  />
                </div>
                <div className="col-span-5 flex items-center gap-1.5">
                  <span className="w-5 text-xs font-bold text-slate-600">
                    ({LETTERS[idx]?.toLowerCase() ?? idx + 1})
                  </span>
                  <input
                    className="input text-xs"
                    value={pair.right}
                    placeholder={`Column B item ${LETTERS[idx]?.toLowerCase() ?? idx + 1}`}
                    onChange={(e) =>
                      setMatchPairs(matchPairs.map((p, j) => (j === idx ? { ...p, right: e.target.value } : p)))
                    }
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
        <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/30 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800">
                {type === "REFERENCE_CONTEXT"
                  ? "सन्दर्भ-प्रसंग-व्याख्या अंग / Extract Sub-parts"
                  : type === "UNSEEN_PASSAGE"
                  ? "गद्यांश/काव्यांश प्रश्नोत्तर / Comprehension Sub-questions"
                  : "Case Study Sub-questions"}
              </span>
              {(() => {
                const total = subpartsTotalMarks(subparts);
                const expected = targetMarks ?? 4;
                const isBalanced = total === expected;
                return isBalanced ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                    ✓ {total}/{expected} Marks Balanced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                    ⚠️ Total Marks: {total} / {expected} ({total > expected ? `Exceeds by ${total - expected}m` : `Short by ${expected - total}m`})
                  </span>
                );
              })()}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubparts(getDefaultSubpartsForType(type, targetMarks));
                }}
                className="btn btn-xs border-purple-300 bg-white text-purple-700 hover:bg-purple-50 font-medium"
              >
                Reset Default Parts
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
                <Plus size={12} /> Add Subpart
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {subparts.map((sp, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs space-y-2 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Subpart #{i + 1}</span>
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
                  <textarea
                    className="input min-h-[60px] text-xs"
                    value={sp.text}
                    required
                    placeholder={`Enter prompt for subpart ${sp.label || i + 1}...`}
                    onFocus={(e) => {
                      setActiveField({ type: "subpart-text", index: i });
                      activeElementRef.current = e.currentTarget;
                    }}
                    onSelect={(e) => {
                      activeElementRef.current = e.currentTarget;
                    }}
                    onChange={(e) =>
                      setSubparts(subparts.map((s, j) => (j === i ? { ...s, text: e.target.value } : s)))
                    }
                  />
                  {sp.text.includes("$") && (
                    <div className="mt-1 rounded bg-indigo-50/60 px-2 py-0.5 text-xs text-indigo-900 border border-indigo-100">
                      <span className="font-semibold text-indigo-700">Preview: </span>
                      <MathText text={sp.text} />
                    </div>
                  )}
                </div>

                <div>
                  <input
                    className="input text-xs"
                    value={sp.answer ?? ""}
                    placeholder={`Model answer / marking rubric for ${sp.label || i + 1} (optional)`}
                    onFocus={(e) => {
                      setActiveField({ type: "subpart-answer", index: i });
                      activeElementRef.current = e.currentTarget;
                    }}
                    onSelect={(e) => {
                      activeElementRef.current = e.currentTarget;
                    }}
                    onChange={(e) =>
                      setSubparts(subparts.map((s, j) => (j === i ? { ...s, answer: e.target.value } : s)))
                    }
                  />
                  {(sp.answer ?? "").includes("$") && (
                    <div className="mt-1 rounded bg-emerald-50/60 px-2 py-0.5 text-xs text-emerald-900 border border-emerald-100">
                      <span className="font-semibold text-emerald-800">Preview: </span>
                      <MathText text={sp.answer ?? ""} />
                    </div>
                  )}
                </div>

                {sp.options && sp.options.length > 0 && (
                  <div className="space-y-1.5 pt-1 rounded-md bg-slate-50 p-2.5 border border-slate-200">
                    <label className="text-[11px] font-semibold text-slate-600">Sub-question Options:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sp.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500 w-5">({String.fromCharCode(97 + optIdx)})</span>
                          <input
                            className="input text-xs flex-1 py-1 px-2"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(sp.options || [])];
                              newOpts[optIdx] = e.target.value;
                              setSubparts(subparts.map((s, j) => (j === i ? { ...s, options: newOpts } : s)));
                            }}
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
          <span className="label">Options (select the correct one)</span>
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
                <input
                  className="input"
                  value={o}
                  onFocus={(e) => {
                    setActiveField({ type: "option", index: i });
                    activeElementRef.current = e.currentTarget;
                  }}
                  onSelect={(e) => {
                    activeElementRef.current = e.currentTarget;
                  }}
                  placeholder={`Option ${LETTERS[i]} (e.g. $x = 2$)`}
                  onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
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
              {o.includes("$") && (
                <div className="ml-7 flex items-center gap-1.5 rounded bg-indigo-50/60 px-2 py-0.5 text-xs text-indigo-900 border border-indigo-100/80">
                  <span className="font-semibold text-indigo-700">Preview:</span>
                  <MathText text={o} />
                </div>
              )}
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
              ? "Correct answer (True / False — सही / गलत)"
              : type === "MATCH_COLUMN"
              ? "Correct matching key (e.g. (i)→(b), (ii)→(a), (iii)→(d), (iv)→(c) — printed on Answer Key only)"
              : "Model answer / Marking rubric (optional, never printed on the question paper)"
          }
        >
          <textarea
            className="input"
            rows={2}
            value={answer}
            onFocus={(e) => {
              setActiveField({ type: "answer" });
              activeElementRef.current = e.currentTarget;
            }}
            onSelect={(e) => {
              activeElementRef.current = e.currentTarget;
            }}
            placeholder={
              type === "MATCH_COLUMN"
                ? "(i) → (b), (ii) → (d), (iii) → (a), (iv) → (c)"
                : "Enter model answer or solution step. Use Math Assistant above to insert formulas."
            }
            onChange={(e) => setAnswer(e.target.value)}
          />
          {answer.includes("$") && (
            <div className="mt-1 rounded border border-emerald-100 bg-emerald-50/50 p-2 text-xs text-slate-800">
              <span className="font-semibold text-emerald-800">Solution Preview: </span>
              <MathText text={answer} />
            </div>
          )}
        </Field>
      )}

      <div>
        <span className="label">Figure / diagram</span>
        {imagePath ? (
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(imagePath)} alt="Figure" className="max-h-36 max-w-xs rounded-lg border border-slate-200 bg-white object-contain shadow-2xs" />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setSketching(true)}
              >
                <PencilRuler size={14} /> Edit in Figure Studio
              </button>
              <button
                type="button"
                className="btn btn-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setDiagramSearchOpen(true)}
              >
                <RefreshCw size={14} className="text-slate-500" /> Swap Diagram
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => setImagePath(null)}
              >
                <X size={14} /> Remove figure
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-semibold"
              onClick={() => setDiagramSearchOpen(true)}
            >
              <Printer size={14} /> Search Diagram Library
            </button>
            <label className="btn btn-sm cursor-pointer">
              <ImagePlus size={14} /> Upload image
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
            <button
              type="button"
              className="btn btn-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => setSketching(true)}
            >
              <PencilRuler size={14} /> Draw in Figure Studio
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={type === "DRAW" ? "Drawing box height (mm)" : "Blank answer space (mm)"}>
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
      </>
      )}

      {showPaperEditModes && (
        <div className="rounded-md border border-indigo-200 bg-indigo-50/60 p-3 space-y-1.5 text-xs text-slate-700">
          <div className="font-semibold text-slate-800">Save Destination:</div>
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
              <span className="font-medium text-slate-900">Tailored copy for this paper only</span> (Recommended: leaves the original in the bank untouched)
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
              <span className="font-medium text-slate-900">Update master in question bank</span> (Applies changes to the question bank and all papers using it)
            </div>
          </label>
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-5 py-3.5 backdrop-blur-xs shadow-lg z-10">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={busy || !chapterId}>
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
          chapterTitle={chapters.find((c) => c.id === chapterId)?.title || ""}
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
