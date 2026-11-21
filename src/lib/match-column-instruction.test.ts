import { describe, expect, test } from "vitest";
import { getMatchColumnInstruction, isColumnHeaderLine, parseMatchColumnPairs } from "./constants";

// verbatim reply pasted by a teacher (spec 2026-11-21, section C)
const fixture = {
  text: "Match the items in Column A with their corresponding equivalents in Column B:\n(A) $(x + y + z)^2$\n(B) $x^3 + y^3$\n(C) $x^3 - y^3$\n(D) $x^3 + y^3 + z^3 - 3xyz$\n(E) Zero of the linear polynomial $ax + b$ ($a \\neq 0$)\n(F) Factorisation of $x^2 - 9y^2$",
  options: [
    "$(x - y)(x^2 + xy + y^2)$",
    "$-\\frac{b}{a}$",
    "$x^2 + y^2 + z^2 + 2xy + 2yz + 2zx$",
    "$(x - 3y)(x + 3y)$",
    "$(x + y)(x^2 - xy + y^2)$",
    "$(x + y + z)(x^2 + y^2 + z^2 - xy - yz - zx)$",
  ],
};

describe("match column instruction naming both columns", () => {
  test("instruction naming Column A and Column B keeps options as Column II", () => {
    const pairs = parseMatchColumnPairs(fixture.options, fixture.text, null);
    expect(pairs).toHaveLength(6);
    expect(pairs[0]).toEqual({ left: "$(x + y + z)^2$", right: "$(x - y)(x^2 + xy + y^2)$" });
    expect(pairs[5].left).toBe("Factorisation of $x^2 - 9y^2$");
    expect(pairs[5].right).toBe("$(x + y + z)(x^2 + y^2 + z^2 - xy - yz - zx)$");
  });

  test("instruction line is the stem", () => {
    expect(getMatchColumnInstruction(fixture.text)).toBe(
      "Match the items in Column A with their corresponding equivalents in Column B:",
    );
  });

  test("Sanskrit instruction naming both columns", () => {
    const text = "स्तम्भ अ इत्यस्य पदानि स्तम्भ ब इत्यनेन सह योजयत\n(क) रामः\n(ख) सीता";
    expect(parseMatchColumnPairs(["जनकसुता", "दशरथपुत्रः"], text, null).map((p) => p.right)).toEqual([
      "जनकसुता",
      "दशरथपुत्रः",
    ]);
  });

  test("explicit header lines still split both columns from text", () => {
    const text = "Match the following:\nColumn I\n(A) Cell\n(B) Atom\nColumn II\n(i) Unit of life\n(ii) Unit of matter";
    expect(parseMatchColumnPairs([], text, null)).toEqual([
      { left: "Cell", right: "Unit of life" },
      { left: "Atom", right: "Unit of matter" },
    ]);
  });

  test("isColumnHeaderLine", () => {
    expect(isColumnHeaderLine("Column II")).toBe("II");
    expect(isColumnHeaderLine("Column I:")).toBe("I");
    expect(isColumnHeaderLine("Match Column I with Column II")).toBeNull();
  });
});
