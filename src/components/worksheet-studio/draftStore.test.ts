import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDraftStore } from "./draftStore";

type D = { text: string; config: { mode: string } };

describe("createDraftStore", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps both of two edits made in the same moment", async () => {
    const saved: [string, D][] = [];
    const store = createDraftStore<D>({ delayMs: 700, save: async (id, d) => void saved.push([id, d]) });
    const base: D = { text: "Circle the bigger one:", config: { mode: "BIGGER" } };

    store.edit("a", base, { config: { mode: "MORE" } });
    store.edit("a", base, { text: "Circle the group with more:" });

    expect(store.get("a")).toEqual({ text: "Circle the group with more:", config: { mode: "MORE" } });
    await vi.advanceTimersByTimeAsync(700);
    expect(saved).toEqual([["a", { text: "Circle the group with more:", config: { mode: "MORE" } }]]);
  });

  it("still saves activity A after editing B", async () => {
    const saved: string[] = [];
    const store = createDraftStore<D>({ delayMs: 700, save: async (id) => void saved.push(id) });
    const base: D = { text: "x", config: { mode: "BIGGER" } };
    store.edit("a", base, { text: "y" });
    store.edit("b", base, { text: "z" });
    await vi.advanceTimersByTimeAsync(700);
    expect(saved.sort()).toEqual(["a", "b"]);
  });

  it("reports pending saves until they finish", async () => {
    const store = createDraftStore<D>({ delayMs: 700, save: async () => {} });
    store.edit("a", { text: "x", config: { mode: "M" } }, { text: "y" });
    expect(store.pending()).toBe(1);
    await vi.advanceTimersByTimeAsync(700);
    expect(store.pending()).toBe(0);
  });
});
