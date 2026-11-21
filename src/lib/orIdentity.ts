// Whether an internal-choice alternative (OR) is just the main question over again. Two questions often share
// their opening line ("Write an essay on any one of the following topics.") and differ only in their topics,
// options or figure, so the whole question is compared, not only its text.

type QuestionContent = {
  text: string;
  optionsJson?: string | null;
  subpartsJson?: string | null;
  imagePath?: string | null;
};

const norm = (s: unknown) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function parseArray(json: string | null | undefined): unknown[] {
  try {
    const v = JSON.parse(json || "[]");
    if (Array.isArray(v)) return v;
    // subparts may be stored as { subparts, attemptCount }
    if (v && typeof v === "object" && Array.isArray((v as { subparts?: unknown }).subparts)) return (v as { subparts: unknown[] }).subparts;
    return [];
  } catch {
    return [];
  }
}

type PartLike = { text?: unknown; options?: unknown; subparts?: unknown };

function partsKey(parts: unknown[]): unknown[] {
  return parts.map((p) => {
    const sp = (p ?? {}) as PartLike;
    return {
      t: norm(sp.text),
      o: Array.isArray(sp.options) ? sp.options.map(norm) : [],
      s: Array.isArray(sp.subparts) ? partsKey(sp.subparts) : [],
    };
  });
}

function contentKey(q: QuestionContent): string {
  return JSON.stringify({
    t: norm(q.text),
    o: parseArray(q.optionsJson).map(norm),
    s: partsKey(parseArray(q.subpartsJson)),
    i: q.imagePath ?? null,
  });
}

/** True when the two questions read the same: same text, options, parts and figure (spacing and case ignored). */
export function sameQuestionContent(a: QuestionContent, b: QuestionContent): boolean {
  return contentKey(a) === contentKey(b);
}

/** A question as the paper view carries it (options and parts already parsed). */
export type QuestionBodyLike = {
  text?: string | null;
  options?: readonly string[] | null;
  subparts?: readonly unknown[] | null;
  imagePath?: string | null;
};

function bodyKey(q: QuestionBodyLike): string {
  return JSON.stringify({
    o: (q.options ?? []).map(norm),
    s: partsKey([...(q.subparts ?? [])]),
    i: q.imagePath ?? null,
  });
}

/**
 * True when two questions differ in their options, parts or figure, whatever their text says. A shared opening
 * line ("Answer any one of the following.") with different topics is then a real alternative, not a copy.
 */
export function questionBodiesDiffer(a: QuestionBodyLike, b: QuestionBodyLike): boolean {
  return bodyKey(a) !== bodyKey(b);
}

/** One key for the whole question (text, options, parts, figure), or "" when it has no text and no body. */
export function questionContentKey(q: QuestionBodyLike): string {
  const t = norm(q.text);
  const body = bodyKey(q);
  if (!t && body === bodyKey({})) return "";
  return JSON.stringify({ t, b: body });
}
