export type HistoryStep = {
  /** Short name shown on the button, e.g. "Remove Compare". */
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  /** Steps with the same key close together become one (typing in one activity). */
  coalesceKey?: string;
  at?: number;
};

/** Undo / redo over the worksheet's changes. Each step knows how to reverse itself. */
export function createHistory(opts: { coalesceMs?: number; limit?: number } = {}) {
  const coalesceMs = opts.coalesceMs ?? 1500;
  const limit = opts.limit ?? 100;
  let past: (HistoryStep & { at: number })[] = [];
  let future: (HistoryStep & { at: number })[] = [];
  let busy = false;

  return {
    push(step: HistoryStep) {
      const at = step.at ?? Date.now();
      future = [];
      const last = past[past.length - 1];
      if (last && step.coalesceKey && last.coalesceKey === step.coalesceKey && at - last.at <= coalesceMs) {
        // keep the oldest undo (back to before the typing started), take the newest redo
        past[past.length - 1] = { ...last, label: step.label, redo: step.redo, at };
        return;
      }
      past = [...past, { ...step, at }].slice(-limit);
    },
    async undo(): Promise<boolean> {
      const step = past[past.length - 1];
      if (!step || busy) return false;
      busy = true;
      try {
        await step.undo();
        past = past.slice(0, -1);
        future = [...future, step];
        return true;
      } finally {
        busy = false;
      }
    },
    async redo(): Promise<boolean> {
      const step = future[future.length - 1];
      if (!step || busy) return false;
      busy = true;
      try {
        await step.redo();
        future = future.slice(0, -1);
        past = [...past, { ...step, at: 0 }]; // never join a redone step with new typing
        return true;
      } finally {
        busy = false;
      }
    },
    undoLabel: () => past[past.length - 1]?.label ?? null,
    redoLabel: () => future[future.length - 1]?.label ?? null,
    size: () => past.length,
  };
}
