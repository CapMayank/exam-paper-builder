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

  it("sends saves of one activity one after another, newest last", async () => {
    const order: string[] = [];
    let release: () => void = () => {};
    const store = createDraftStore<D>({
      delayMs: 700,
      save: (_id, d) =>
        new Promise<void>((resolve) => {
          order.push("start " + d.text);
          if (d.text === "first") release = () => { order.push("end first"); resolve(); };
          else { order.push("end " + d.text); resolve(); }
        }),
    });
    const base: D = { text: "", config: { mode: "M" } };
    store.edit("a", base, { text: "first" });
    await vi.advanceTimersByTimeAsync(700); // first save is on its way, not finished
    store.edit("a", base, { text: "second" });
    await vi.advanceTimersByTimeAsync(700); // second save must wait for the first
    expect(order).toEqual(["start first"]);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(["start first", "end first", "start second", "end second"]);
  });

  it("forgets a draft once it is saved and unchanged, telling the page what was saved", async () => {
    const savedBack: [string, D][] = [];
    const store = createDraftStore<D>({ delayMs: 700, save: async () => {}, onSaved: (id, d) => void savedBack.push([id, d]) });
    store.edit("a", { text: "x", config: { mode: "M" } }, { text: "y" });
    await vi.advanceTimersByTimeAsync(700);
    expect(savedBack).toEqual([["a", { text: "y", config: { mode: "M" } }]]);
    expect(store.get("a")).toBeUndefined();
  });

  it("keeps a draft that changed while it was being saved", async () => {
    let release: () => void = () => {};
    const store = createDraftStore<D>({ delayMs: 700, save: () => new Promise<void>((r) => (release = r)) });
    const base: D = { text: "x", config: { mode: "M" } };
    store.edit("a", base, { text: "y" });
    await vi.advanceTimersByTimeAsync(700);
    store.edit("a", base, { text: "z" });
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.get("a")?.text).toBe("z");
  });

  it("keeps a draft whose save failed", async () => {
    const store = createDraftStore<D>({ delayMs: 700, save: async () => { throw new Error("offline"); } });
    store.edit("a", { text: "x", config: { mode: "M" } }, { text: "y" });
    await vi.advanceTimersByTimeAsync(700);
    expect(store.get("a")?.text).toBe("y");
  });

  it("sends waiting saves at once, marked urgent, when the page is leaving", async () => {
    const calls: [string, boolean][] = [];
    const store = createDraftStore<D>({ delayMs: 700, save: async (id, _d, urgent) => void calls.push([id, urgent]) });
    store.edit("a", { text: "x", config: { mode: "M" } }, { text: "y" });
    store.flushAll();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual([["a", true]]);
  });

  it("drops a draft and its waiting save when the activity is deleted", async () => {
    const saved: string[] = [];
    const store = createDraftStore<D>({ delayMs: 700, save: async (id) => void saved.push(id) });
    store.edit("a", { text: "x", config: { mode: "M" } }, { text: "y" });
    store.discard("a");
    await vi.advanceTimersByTimeAsync(700);
    store.flushAll();
    expect(saved).toEqual([]);
    expect(store.get("a")).toBeUndefined();
    expect(store.pending()).toBe(0);
  });
});
