/**
 * Answer keys the independent check disagreed with, kept per paper in this browser until the teacher decides.
 * Before this, a disputed key showed once in a toast and then printed in the marking scheme with no trace.
 * Storage may be blocked (private window); every access is guarded and the page works without it.
 */
import { truthValue, type KeyDisagreement } from "./answerKeyCheck";

export const KEY_DISPUTES_EVENT = "paperbuilder:key-disputes";
const storageKey = (paperId: string) => `paperbuilder.keyDisputes.${paperId}`;

export function loadKeyDisputes(paperId: string): KeyDisagreement[] {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(storageKey(paperId));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as KeyDisagreement[]).filter((d) => d && typeof d.questionId === "string") : [];
  } catch {
    return [];
  }
}

function store(paperId: string, list: KeyDisagreement[]): void {
  try {
    if (list.length) window.localStorage.setItem(storageKey(paperId), JSON.stringify(list));
    else window.localStorage.removeItem(storageKey(paperId));
  } catch {
    /* storage blocked: the banner still shows for this page view through the event */
  }
  try {
    window.dispatchEvent(new CustomEvent(KEY_DISPUTES_EVENT, { detail: { paperId, list } }));
  } catch {
    /* not in a browser */
  }
}

/**
 * Records the result of a key check: new disputes are added, and a question the check now agrees with (it was
 * checked again and is not disputed) is cleared. Pass the ids that were checked so others are left alone.
 */
export function recordKeyCheck(paperId: string, disputes: KeyDisagreement[], checkedIds?: string[]): KeyDisagreement[] {
  const fresh = new Map(disputes.map((d) => [d.questionId, d]));
  const checked = new Set(checkedIds ?? []);
  const kept = loadKeyDisputes(paperId).filter((d) => !fresh.has(d.questionId) && !checked.has(d.questionId));
  const list = [...kept, ...fresh.values()];
  store(paperId, list);
  return list;
}

export function dismissKeyDispute(paperId: string, questionId: string): KeyDisagreement[] {
  const list = loadKeyDisputes(paperId).filter((d) => d.questionId !== questionId);
  store(paperId, list);
  return list;
}

/**
 * The checker's answer written the way the stored key is written: a True/False key keeps its own words
 * (सत्य/असत्य, आम्/न, True/False), so accepting the check never mixes scripts in the marking scheme.
 */
export function checkedAnswerAsKey(d: Pick<KeyDisagreement, "type" | "storedAnswer" | "solverAnswer">): string {
  if (d.type === "TRUE_FALSE") {
    const v = truthValue(d.solverAnswer);
    if (v !== null) {
      const s = d.storedAnswer.trim();
      if (/[ऀ-ॿ]/.test(s)) {
        if (/आम्|^न[\s.।]*$/.test(s)) return v ? "आम्" : "न";
        if (/सही|गलत/.test(s)) return v ? "सही" : "गलत";
        if (/शुद्ध/.test(s)) return v ? "शुद्ध" : "अशुद्ध";
        return v ? "सत्य" : "असत्य";
      }
      return v ? "True" : "False";
    }
  }
  return d.solverAnswer.trim();
}
