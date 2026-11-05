/**
 * Stages 2 and 3 of AI paper generation, run in the browser after the questions are committed:
 * 2. the answer-key pass writes every missing answer (subjective model answers, marking schemes);
 * 3. an independent solver re-answers the objective items and reports keys it disagrees with.
 * Each stage's failure is reported, never thrown: the questions are already saved.
 */
import type { KeyCheckReport } from "./answerKeyCheck";
import { api } from "./client";
import { recordKeyCheck } from "./keyDisputes";
import type { PaperData } from "./types";

export interface AnswerStageResult {
  /** Questions that got an answer written. */
  answered: number;
  /** Questions still without an answer after stage 2. */
  stillMissing: number;
  answerError?: string;
  check: KeyCheckReport | null;
  checkError?: string;
  /** The paper as stage 2 left it (answers filled), when stage 2 ran. */
  paper?: PaperData;
}

export async function runAnswerStages(
  paperId: string,
  opts: {
    signal?: AbortSignal;
    onActivity?: (text: string) => void;
    verifyKeys?: boolean;
    /** Check only this section's keys (the answer pass still covers the whole paper, blanks only). */
    sectionId?: string;
  } = {},
): Promise<AnswerStageResult> {
  const customKey = typeof window !== "undefined" ? localStorage.getItem("exam_gemini_api_key") || "" : "";
  const headers: Record<string, string> = customKey ? { "x-gemini-api-key": customKey } : {};
  const result: AnswerStageResult = { answered: 0, stillMissing: 0, check: null };

  opts.onActivity?.("Answer key: a separate pass is writing model answers and marking schemes...");
  try {
    const res = await api<{ saved: string[]; failed: Array<{ id: string }>; paper: PaperData }>(`/api/papers/${paperId}/answer-key`, {
      method: "POST",
      headers,
      signal: opts.signal,
    });
    result.answered = res.saved.length;
    result.stillMissing = res.failed.length;
    result.paper = res.paper;
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    result.answerError = err instanceof Error ? err.message : String(err);
  }

  if (opts.verifyKeys !== false) {
    opts.onActivity?.("Key check: an independent solver is re-answering the objective questions...");
    try {
      const qs = opts.sectionId ? `?sectionId=${encodeURIComponent(opts.sectionId)}` : "";
      result.check = await api<KeyCheckReport>(`/api/papers/${paperId}/verify-key${qs}`, { method: "POST", headers, signal: opts.signal });
      // keep what the check disputes on the paper until the teacher decides, instead of only a passing toast
      recordKeyCheck(paperId, result.check.disagreements);
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      result.checkError = err instanceof Error ? err.message : String(err);
    }
  }
  return result;
}

/** One line for a toast. */
export function answerStageSummary(r: AnswerStageResult): string {
  const parts: string[] = [];
  if (r.answerError) parts.push(`Answer key not written (${r.answerError}); open Solutions to retry`);
  else parts.push(`Answer key: ${r.answered} written${r.stillMissing ? `, ${r.stillMissing} still missing` : ""}`);
  if (r.check && r.check.checked > 0) {
    parts.push(
      r.check.disagreements.length
        ? `${r.check.disagreements.length} of ${r.check.checked} objective keys disputed by the check — review them`
        : `all ${r.check.checked} objective keys confirmed by an independent check`,
    );
  } else if (r.checkError) {
    parts.push(`key check skipped (${r.checkError})`);
  }
  return parts.join(" · ");
}
