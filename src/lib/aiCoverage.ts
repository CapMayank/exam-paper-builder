// Pure part of the AI coverage check: turns the model's chapter for each question into the report the teacher sees.
// The model is only ever asked to label questions; everything it returns is checked here before it is used.

export type CoverageConfidence = "HIGH" | "MEDIUM" | "LOW";

export type CoverageItem = {
  itemId: string;
  questionId: string;
  /** The number the question was sent to the model under. */
  number: number;
  marks: number;
  storedChapterId: string;
  /** The question's number as printed on the paper (numbering style aware); falls back to `number`. */
  label?: string;
  /** The start of its text, so the teacher can recognise it. */
  preview?: string;
};

export type CoverageReport = {
  /** Marks per blueprint chapter by the AI's reading (a question it did not label counts under its stored chapter). */
  spread: Array<{ chapterId: string; title: string; target: number; aiMarks: number }>;
  disagreements: Array<{
    itemId: string;
    questionId: string;
    number: number;
    label: string;
    preview: string;
    storedChapterId: string;
    aiChapterId: string;
    confidence: CoverageConfidence;
  }>;
  /** Numbers of the questions the AI gave no usable chapter for. */
  unclassified: number[];
};

const CONFIDENCES: ReadonlySet<string> = new Set(["HIGH", "MEDIUM", "LOW"]);

export function buildCoverageReport(input: {
  items: CoverageItem[];
  targets: Array<{ chapterId: string; title: string; target: number }>;
  rows: Array<{ number: number; chapterId: string; confidence: string }>;
}): CoverageReport {
  const { items, targets, rows } = input;
  const known = new Set(targets.map((t) => t.chapterId));
  const sent = new Set(items.map((i) => i.number));

  // a row counts only if it names a chapter of this blueprint and a question that was sent; the first row for a number wins
  const aiByNumber = new Map<number, { chapterId: string; confidence: CoverageConfidence }>();
  for (const r of rows) {
    if (!sent.has(r.number) || !known.has(r.chapterId) || aiByNumber.has(r.number)) continue;
    const upper = typeof r.confidence === "string" ? r.confidence.toUpperCase() : "";
    aiByNumber.set(r.number, { chapterId: r.chapterId, confidence: CONFIDENCES.has(upper) ? (upper as CoverageConfidence) : "LOW" });
  }

  const marksOf = new Map<string, number>();
  const disagreements: CoverageReport["disagreements"] = [];
  const unclassified: number[] = [];
  for (const it of items) {
    const ai = aiByNumber.get(it.number);
    const chapterId = ai ? ai.chapterId : it.storedChapterId;
    marksOf.set(chapterId, (marksOf.get(chapterId) ?? 0) + it.marks);
    if (!ai) {
      unclassified.push(it.number);
    } else if (ai.chapterId !== it.storedChapterId) {
      disagreements.push({
        itemId: it.itemId,
        questionId: it.questionId,
        number: it.number,
        label: it.label ?? String(it.number),
        preview: it.preview ?? "",
        storedChapterId: it.storedChapterId,
        aiChapterId: ai.chapterId,
        confidence: ai.confidence,
      });
    }
  }

  return {
    spread: targets.map((t) => ({ chapterId: t.chapterId, title: t.title, target: t.target, aiMarks: marksOf.get(t.chapterId) ?? 0 })),
    disagreements,
    unclassified,
  };
}

/** One line per skipped change, led by the question's printed number when it is known ("Q7: reason"). */
export function describeSkips(
  skipped: Array<{ questionId: string; reason: string }>,
  disagreements: Array<{ questionId: string; label: string }>,
): string[] {
  const labelOf = new Map(disagreements.map((d) => [d.questionId, d.label]));
  return skipped.map((s) => (labelOf.has(s.questionId) ? `Q${labelOf.get(s.questionId)}: ${s.reason}` : s.reason));
}
