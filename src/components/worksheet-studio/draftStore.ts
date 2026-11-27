/**
 * Local copies of the activities being edited, each saved a moment after its last change.
 *
 * - Edits always build on the latest copy (not on what the last render saw), so an editor that
 *   changes two things in one click keeps both.
 * - Each activity has its own timer, so moving to another activity never drops a pending save.
 * - Saves of one activity go out one after another, so an older save can never land last.
 * - Once a copy is saved and has not changed since, it is handed back (`onSaved`) and forgotten,
 *   so the page's own data is the truth again. A failed save keeps the copy.
 * - `flushAll` sends everything still waiting at once, marked urgent (the page is closing).
 */
export function createDraftStore<D extends object>(opts: {
  delayMs: number;
  save: (id: string, draft: D, urgent: boolean) => Promise<void>;
  onSaved?: (id: string, draft: D) => void;
  onChange?: () => void;
}) {
  const drafts = new Map<string, D>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const chains = new Map<string, Promise<void>>();
  let inFlight = 0;
  const notify = () => opts.onChange?.();
  const savedListeners = new Set<(id: string, draft: D) => void>();
  if (opts.onSaved) savedListeners.add(opts.onSaved);

  function run(id: string, urgent: boolean) {
    timers.delete(id);
    const draft = drafts.get(id);
    if (!draft) return;
    inFlight++;
    notify();
    const previous = chains.get(id) ?? Promise.resolve();
    const next = previous.then(async () => {
      try {
        if (drafts.get(id) === undefined) return; // deleted while waiting its turn
        await opts.save(id, draft, urgent);
        if (drafts.get(id) === draft) {
          drafts.delete(id);
          savedListeners.forEach((l) => l(id, draft));
        }
      } catch {
        // keep the draft; the caller reports the error
      } finally {
        inFlight--;
        if (chains.get(id) === next) chains.delete(id);
        notify();
      }
    });
    chains.set(id, next);
  }

  return {
    get: (id: string): D | undefined => drafts.get(id),
    edit(id: string, base: D, patch: Partial<D>): D {
      const next = { ...(drafts.get(id) ?? base), ...patch };
      drafts.set(id, next);
      clearTimeout(timers.get(id));
      timers.set(
        id,
        setTimeout(() => run(id, false), opts.delayMs),
      );
      notify();
      return next;
    },
    /** Forget an activity's draft and any save still waiting (the activity was deleted). */
    discard(id: string) {
      clearTimeout(timers.get(id));
      timers.delete(id);
      drafts.delete(id);
      notify();
    },
    /** Hear about drafts that were saved and forgotten; returns a function that stops listening. */
    subscribeSaved(listener: (id: string, draft: D) => void) {
      savedListeners.add(listener);
      return () => {
        savedListeners.delete(listener);
      };
    },
    /** Saves still waiting for their timer plus saves on their way to the server. */
    pending: () => timers.size + inFlight,
    flushAll() {
      for (const [id, t] of [...timers]) {
        clearTimeout(t);
        run(id, true);
      }
    },
  };
}
