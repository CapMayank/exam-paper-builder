import { describe, expect, it } from "vitest";
import { mixedOrder } from "./seeded";
import { rightColumnOrder, textMatchDefaultConfig } from "./activities/textMatch";

describe("mixedOrder", () => {
  it("gives the same order for the same text", () => {
    expect(mixedOrder(6, "abc")).toEqual(mixedOrder(6, "abc"));
  });

  it("is a full reordering that leaves nothing in its own place", () => {
    for (let n = 2; n <= 10; n++) {
      for (const seed of ["a", "b", "Happy|Sad", "अ|अनार", String(n)]) {
        const order = mixedOrder(n, seed);
        expect([...order].sort((x, y) => x - y)).toEqual(Array.from({ length: n }, (_, i) => i));
        order.forEach((v, k) => expect(v, `${seed} n=${n}`).not.toBe(k));
      }
    }
  });

  it("leaves one item alone", () => {
    expect(mixedOrder(1, "x")).toEqual([0]);
  });
});

describe("Match the columns", () => {
  it("never prints a match straight across when mixed", () => {
    const config = textMatchDefaultConfig();
    rightColumnOrder(config).forEach((v, k) => expect(v).not.toBe(k));
  });

  it("keeps the teacher's order when mixing is off", () => {
    const config = { ...textMatchDefaultConfig(), mixRight: false };
    expect(rightColumnOrder(config)).toEqual([0, 1, 2, 3, 4]);
  });
});
