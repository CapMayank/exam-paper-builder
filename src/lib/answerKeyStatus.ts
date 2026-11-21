// What the workbench answer-key panel shows: each question's answer status, in paper order with its printed
// number, and how the correct options are spread. Pure, from the paper view the workbench already holds.

import { findMissingAnswer } from "./answerKeyFill";
import { positionReport, type MatchUnit, type McqUnit, type PositionReport } from "./answerPositions";
import { computeDisplayedPaperNumbering } from "./layout";
import type { PaperData, QuestionDto } from "./types";

export type AnswerStatus = "answered" | "missing" | "partial" | "not-needed";

export type AnswerKeyRow = {
  questionId: string;
  label: string;
  isOr: boolean;
  type: string;
  status: AnswerStatus;
  /** Parts still without an answer, for a question answered part by part. */
  missingParts: string[];
  preview: string;
};

function source(q: QuestionDto) {
  return {
    id: q.id,
    type: q.type,
    text: q.text,
    optionsJson: JSON.stringify(q.options ?? []),
    subpartsJson: JSON.stringify(q.subparts ?? []),
    answer: q.answer ?? "",
  };
}

export function questionAnswerStatus(q: QuestionDto): { status: AnswerStatus; missingParts: string[] } {
  if (q.type.startsWith("KDG_")) return { status: "not-needed", missingParts: [] };
  const need = findMissingAnswer(source(q));
  if (!need) return { status: "answered", missingParts: [] };
  const parts = q.subparts ?? [];
  const missingParts = need.subparts.map((sp) => sp.label || sp.path);
  if (!need.main && parts.length > 0 && need.subparts.length < countLeaves(parts)) return { status: "partial", missingParts };
  return { status: "missing", missingParts };
}

function countLeaves(parts: readonly { subparts?: unknown }[]): number {
  return parts.reduce((n, p) => {
    const nested = Array.isArray(p.subparts) ? (p.subparts as { subparts?: unknown }[]) : [];
    return n + (nested.length > 0 ? countLeaves(nested) : 1);
  }, 0);
}

function preview(q: QuestionDto): string {
  const a = (q.answer ?? "").replace(/\s+/g, " ").trim();
  if (a) return a.length > 80 ? `${a.slice(0, 80)}…` : a;
  const parts = (q.subparts ?? []).filter((sp) => (sp.answer ?? "").trim());
  return parts.length ? `${parts.length} part answer${parts.length === 1 ? "" : "s"}` : "";
}

/** Every question and OR alternative of the paper, in printed order. */
export function answerKeyRows(paper: PaperData): AnswerKeyRow[] {
  const numbering = computeDisplayedPaperNumbering(paper.blueprint.sections, paper.items, paper.numberingStyle || "CONTINUOUS");
  const order = new Map(paper.blueprint.sections.map((s, i) => [s.id, i]));
  const items = [...paper.items].sort((a, b) => (order.get(a.sectionId) ?? 0) - (order.get(b.sectionId) ?? 0) || a.position - b.position);
  return items.flatMap((it) => {
    const label = numbering.itemNumbers[it.id]?.displayLabel || "";
    const row = (q: QuestionDto, isOr: boolean): AnswerKeyRow => ({ questionId: q.id, label, isOr, type: q.type, ...questionAnswerStatus(q), preview: preview(q) });
    return it.orQuestion ? [row(it.question, false), row(it.orQuestion, true)] : [row(it.question, false)];
  });
}

/** The paper's choice questions as answerPositions units (for the spread report). */
export function paperPositionUnits(paper: PaperData): { mcqs: McqUnit[]; matches: MatchUnit[] } {
  const order = new Map(paper.blueprint.sections.map((s, i) => [s.id, i]));
  const items = [...paper.items].sort((a, b) => (order.get(a.sectionId) ?? 0) - (order.get(b.sectionId) ?? 0) || a.position - b.position);
  const mcqs: McqUnit[] = [];
  const matches: MatchUnit[] = [];
  const walk = (qid: string, parts: readonly { options?: string[] | null; answer?: string; subparts?: unknown }[], prefix: string) =>
    parts.forEach((sp, i) => {
      const path = prefix ? `${prefix}.${i}` : String(i);
      if (Array.isArray(sp.options) && sp.options.length > 0) mcqs.push({ key: `${qid}#${path}`, options: sp.options, answer: sp.answer ?? "", movable: true });
      if (Array.isArray(sp.subparts)) walk(qid, sp.subparts as typeof parts, path);
    });
  for (const it of items) {
    for (const q of it.orQuestion ? [it.question, it.orQuestion] : [it.question]) {
      if (q.type === "MCQ") mcqs.push({ key: q.id, options: q.options ?? [], answer: q.answer ?? "", movable: true });
      else if (q.type === "MATCH_COLUMN") matches.push({ key: q.id, text: q.text, options: q.options ?? [], answer: q.answer ?? "", movable: true });
      walk(q.id, q.subparts ?? [], "");
    }
  }
  return { mcqs, matches };
}

export function paperPositionReport(paper: PaperData): PositionReport {
  const { mcqs, matches } = paperPositionUnits(paper);
  return positionReport(mcqs, matches);
}
