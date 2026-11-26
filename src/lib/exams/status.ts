import { daysUntil } from "./dates";
import type { DayRollup, ExamSummary, SlotStatus, SlotView, SlotWarning } from "./types";

/** Days ahead within which an exam day that is not ready is flagged. */
export const URGENT_WITHIN_DAYS = 3;

/** Printed wins: once marked printed, the copies exist whatever happens to the paper afterwards. */
export function slotStatus(s: { paper: SlotView["paper"]; hasBlueprint: boolean; printedAt: string | null }): SlotStatus {
  if (s.printedAt) return "PRINTED";
  if (!s.paper) return s.hasBlueprint ? "NO_PAPER" : "NO_BLUEPRINT";
  return s.paper.status === "FINAL" ? "FINAL" : "DRAFT";
}

export function slotWarnings(s: Pick<SlotView, "paper" | "printedAt" | "printedPaperAt" | "dateChangedAfterPrint">): SlotWarning[] {
  if (!s.printedAt) return [];
  const out: SlotWarning[] = [];
  if (s.paper && s.printedPaperAt && new Date(s.paper.updatedAt).getTime() > new Date(s.printedPaperAt).getTime()) {
    out.push("PAPER_CHANGED_AFTER_PRINT");
  }
  if (s.dateChangedAfterPrint) out.push("DATE_CHANGED_AFTER_PRINT");
  return out;
}

const isReady = (s: SlotStatus) => s === "FINAL" || s === "PRINTED";

export function dayRollups(slots: SlotView[], today: string): DayRollup[] {
  const byDate = new Map<string, DayRollup>();
  for (const s of slots) {
    const d = byDate.get(s.examDate) ?? { date: s.examDate, total: 0, printed: 0, finalNotPrinted: 0, notReady: 0, urgent: false };
    d.total++;
    if (s.status === "PRINTED") d.printed++;
    else if (s.status === "FINAL") d.finalNotPrinted++;
    else d.notReady++;
    byDate.set(s.examDate, d);
  }
  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const away = daysUntil(d.date, today);
      return { ...d, urgent: d.notReady > 0 && away >= 0 && away <= URGENT_WITHIN_DAYS };
    });
}

export function examSummary(slots: SlotView[], today: string): ExamSummary {
  const dates = slots.map((s) => s.examDate).sort();
  const firstDate = dates[0] ?? null;
  const lastDate = dates[dates.length - 1] ?? null;
  return {
    total: slots.length,
    ready: slots.filter((s) => isReady(s.status)).length,
    printed: slots.filter((s) => s.status === "PRINTED").length,
    firstDate,
    lastDate,
    daysToFirst: firstDate ? daysUntil(firstDate, today) : null,
    isPast: lastDate !== null && lastDate < today,
  };
}
