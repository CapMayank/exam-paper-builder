/**
 * Local copies of the activities being edited, each saved a moment after its last change.
 * Edits always build on the latest copy (not on what the last render saw), so an editor that
 * changes two things in one click keeps both. Each activity has its own timer, so moving to
 * another activity never drops a pending save.
 */
export function createDraftStore<D extends object>(opts: { delayMs: number; save: (id: string, draft: D) => Promise<void>; onChange?: () => void }) {
  const drafts = new Map<string, D>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let inFlight = 0;
  const notify = () => opts.onChange?.();

  async function run(id: string) {
    timers.delete(id);
    const draft = drafts.get(id);
    if (!draft) return;
    inFlight++;
    notify();
    try {
      await opts.save(id, draft);
    } finally {
      inFlight--;
      notify();
    }
  }

  return {
    get: (id: string): D | undefined => drafts.get(id),
    edit(id: string, base: D, patch: Partial<D>): D {
      const next = { ...(drafts.get(id) ?? base), ...patch };
      drafts.set(id, next);
      clearTimeout(timers.get(id));
      timers.set(
        id,
        setTimeout(() => void run(id), opts.delayMs),
      );
      notify();
      return next;
    },
    /** Saves still waiting for their timer plus saves on their way to the server. */
    pending: () => timers.size + inFlight,
    /** Send everything still waiting right away (when leaving the page). */
    flushAll() {
      for (const [id, t] of timers) {
        clearTimeout(t);
        void run(id);
      }
    },
  };
}
