import { describe, expect, it } from "vitest";
import { createHistory } from "./history";

function recorder() {
  const log: string[] = [];
  const step = (name: string, extra: { coalesceKey?: string; at?: number } = {}) => ({
    label: name,
    undo: async () => void log.push("undo " + name),
    redo: async () => void log.push("redo " + name),
    ...extra,
  });
  return { log, step };
}

describe("createHistory", () => {
  it("undoes the last step and redoes it", async () => {
    const h = createHistory();
    const { log, step } = recorder();
    h.push(step("add"));
    h.push(step("move"));
    expect(h.undoLabel()).toBe("move");
    await h.undo();
    expect(h.redoLabel()).toBe("move");
    await h.redo();
    expect(log).toEqual(["undo move", "redo move"]);
  });

  it("forgets redo steps after a new change", async () => {
    const h = createHistory();
    const { step } = recorder();
    h.push(step("a"));
    await h.undo();
    h.push(step("b"));
    expect(h.redoLabel()).toBeNull();
    expect(h.undoLabel()).toBe("b");
  });

  it("joins quick edits to the same thing into one step, keeping the first undo", async () => {
    const h = createHistory({ coalesceMs: 1500 });
    const { log, step } = recorder();
    h.push(step("type 1", { coalesceKey: "edit:a", at: 1000 }));
    h.push(step("type 2", { coalesceKey: "edit:a", at: 2000 }));
    h.push(step("type 3", { coalesceKey: "edit:a", at: 3000 }));
    await h.undo();
    expect(log).toEqual(["undo type 1"]);
    expect(h.undoLabel()).toBeNull();
    await h.redo();
    expect(log).toEqual(["undo type 1", "redo type 3"]);
  });

  it("keeps edits apart when there is a pause or a different target", () => {
    const h = createHistory({ coalesceMs: 1500 });
    const { step } = recorder();
    h.push(step("x1", { coalesceKey: "edit:a", at: 1000 }));
    h.push(step("x2", { coalesceKey: "edit:a", at: 5000 }));
    h.push(step("y", { coalesceKey: "edit:b", at: 5100 }));
    expect(h.size()).toBe(3);
  });

  it("keeps at most the given number of steps", () => {
    const h = createHistory({ limit: 2 });
    const { step } = recorder();
    h.push(step("1"));
    h.push(step("2"));
    h.push(step("3"));
    expect(h.size()).toBe(2);
  });

  it("does nothing when there is nothing to undo or redo", async () => {
    const h = createHistory();
    expect(await h.undo()).toBe(false);
    expect(await h.redo()).toBe(false);
  });
});
