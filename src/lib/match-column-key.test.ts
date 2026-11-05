import { describe, expect, it } from "vitest";
import { layoutMatchColumn, parseMatchKey } from "./matchColumnKey";

const pairsFor = (opts: string[]) => opts.map((right, i) => ({ left: `L${i}`, right }));

describe("layoutMatchColumn", () => {
  it("keeps a shuffled Column II and the model's key instead of collapsing to (A)-(i), (B)-(ii)...", () => {
    const options = ["R2", "R0", "R1"]; // positions; true: A->R0 (ii), B->R1 (iii), C->R2 (i)
    const out = layoutMatchColumn(pairsFor(options), options, "(A)-(ii), (B)-(iii), (C)-(i)");
    expect(out.column2).toEqual(options);
    expect(out.answer).toBe("(A)-(ii), (B)-(iii), (C)-(i)");
  });

  it("accepts arrow and numeric key styles", () => {
    expect(parseMatchKey("(A) → (iii), (B) → (i), (C) → (ii)", 3)).toEqual([2, 0, 1]);
    expect(parseMatchKey("A-2, B-3, C-1", 3)).toEqual([1, 2, 0]);
  });

  it("rejects incomplete or non one-to-one keys", () => {
    expect(parseMatchKey("(A)-(i), (B)-(i), (C)-(ii)", 3)).toBeNull();
    expect(parseMatchKey("(A)-(i), (B)-(ii)", 3)).toBeNull();
  });

  it("shuffles aligned pairs itself and keys them correctly when the key is the identity", () => {
    const options = ["R0", "R1", "R2", "R3"];
    const out = layoutMatchColumn(pairsFor(options), options, "(A)-(i), (B)-(ii), (C)-(iii), (D)-(iv)");
    const key = parseMatchKey(out.answer, 4)!;
    expect(key.some((p, i) => p !== i)).toBe(true);
    key.forEach((pos, i) => expect(out.column2[pos]).toBe(`R${i}`));
  });

  it("shuffles when the model gave no key at all", () => {
    const options = ["R0", "R1", "R2"];
    const out = layoutMatchColumn(pairsFor(options), options, "");
    const key = parseMatchKey(out.answer, 3)!;
    key.forEach((pos, i) => expect(out.column2[pos]).toBe(`R${i}`));
  });

  it("treats inline 'left ||| right' options as true pairs", () => {
    const raw = ["L0 ||| R0", "L1 ||| R1", "L2 ||| R2"];
    const pairs = [0, 1, 2].map((i) => ({ left: `L${i}`, right: `R${i}` }));
    const out = layoutMatchColumn(pairs, raw, "(A)-(i), (B)-(ii), (C)-(iii)");
    const key = parseMatchKey(out.answer, 3)!;
    key.forEach((pos, i) => expect(out.column2[pos]).toBe(`R${i}`));
  });
});
