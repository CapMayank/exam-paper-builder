/**
 * Turns questions pasted or typed one after another into separate questions for one paper section, and gives
 * each a chapter that still has room in the blueprint.
 *
 * Accepted layouts: numbered ("1. …", "Q2) …"), separated by blank lines, or simply one question per line.
 * For multiple-choice sections, option lines "(a) …" / "a) …" (or all options on one line) and an
 * "Ans: b" line are read too.
 */
import { suggestChapter, type ChapterLite } from "./questionTagging";

export type PastedQuestion = { text: string; options: string[]; answer: string };

const NUMBERED = /^\s*(?:Q(?:uestion)?\.?\s*)?\(?(\d{1,3})\s*[.):]\s+/i;
const OPTION = /^\s*\(?([a-fA-F]|[कखगघ])\s*[).]\s*(.+)$/;
const ANSWER = /^\s*(?:ans(?:wer)?|उत्तर)\s*[:\-–.]\s*(.*)$/i;
const INLINE_MARK = /\(([a-dA-D])\)\s*/g;

/** "Capital of India is (a) Delhi (b) Agra (c) Pune (d) Goa" → stem + four options. */
function splitInline(line: string): { stem: string; options: string[] } | null {
  const marks = [...line.matchAll(INLINE_MARK)];
  if (marks.length < 2) return null;
  const options = marks.map((m, i) => line.slice(m.index! + m[0].length, i + 1 < marks.length ? marks[i + 1].index : undefined).trim());
  return { stem: line.slice(0, marks[0].index).trim(), options };
}

function normaliseAnswer(answer: string, hasOptions: boolean): string {
  const a = answer.trim();
  const letter = /^\(?([a-fA-F])\)?\.?$/.exec(a);
  return hasOptions && letter ? letter[1].toUpperCase() : a;
}

export function splitPastedQuestions(raw: string, withOptions: boolean): PastedQuestion[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const numbered = lines.some((l) => NUMBERED.test(l));
  const blankSeparated = !numbered && /\n\s*\n/.test(raw.trim());
  const out: PastedQuestion[] = [];
  let cur: PastedQuestion | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (blankSeparated) cur = null;
      continue;
    }
    const ans = ANSWER.exec(line);
    if (ans && cur) {
      cur.answer = ans[1];
      continue;
    }
    if (withOptions && cur && !NUMBERED.test(line)) {
      const inline = splitInline(line);
      if (inline && !inline.stem) {
        cur.options.push(...inline.options);
        continue;
      }
      const opt = OPTION.exec(line);
      if (opt) {
        cur.options.push(opt[2].trim());
        continue;
      }
    }
    const num = NUMBERED.exec(line);
    const startsNew = numbered ? Boolean(num) : blankSeparated ? !cur : true;
    if (startsNew || !cur) {
      cur = { text: num ? line.slice(num[0].length).trim() : line, options: [], answer: "" };
      out.push(cur);
    } else {
      cur.text += `\n${line}`;
    }
  }

  return out
    .map((q) => {
      let { text, options } = q;
      if (withOptions && options.length === 0) {
        const inline = splitInline(text);
        if (inline?.stem) ({ stem: text, options } = inline);
      }
      return { text: text.trim(), options, answer: normaliseAnswer(q.answer, options.length > 0) };
    })
    .filter((q) => q.text.length > 0);
}

/**
 * A chapter for each question, in order: the chapter its words match (if that chapter can still take a question
 * of `marksEach`), otherwise the chapter with the most marks left. Quotas are used up as questions are assigned,
 * so the result never exceeds the blueprint. `null` when no chapter has room left.
 */
export function assignChapters(
  texts: string[],
  chapters: ChapterLite[],
  openMarks: Record<string, number>,
  marksEach: number,
): Array<{ chapterId: string; reason: "title" | "quota" } | null> {
  const left = { ...openMarks };
  return texts.map((text) => {
    const roomy = chapters.filter((c) => (left[c.id] ?? 0) >= marksEach);
    if (roomy.length === 0) return null;
    const byTitle = suggestChapter(text, roomy);
    const pick =
      byTitle?.reason === "title"
        ? byTitle
        : { chapterId: [...roomy].sort((a, b) => (left[b.id] ?? 0) - (left[a.id] ?? 0) || a.number - b.number)[0].id, reason: "quota" as const };
    left[pick.chapterId] = (left[pick.chapterId] ?? 0) - marksEach;
    return pick;
  });
}
