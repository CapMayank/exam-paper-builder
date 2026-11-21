import { describe, expect, it } from "vitest";
import { alignColumnNames, matchColumnLabels, matchColumnScheme } from "@/lib/constants";

describe("match table headings follow the question's wording", () => {
  it("reads the column names the instruction uses", () => {
    expect(matchColumnScheme("Match Column I with Column II:")).toBe("roman");
    expect(matchColumnScheme("Match the items in Column A with Column B correctly.")).toBe("letter");
    expect(matchColumnScheme("Match List-I with List-II")).toBe("list");
    expect(matchColumnScheme("Match column 1 with column 2")).toBe("roman");
    expect(matchColumnScheme("Match the following:")).toBeNull();
    expect(matchColumnScheme("Match the columns and answer")).toBeNull();
  });

  it("only the instruction counts, not the items below it", () => {
    expect(matchColumnScheme("Match the following:\nColumn A\n(a) Cell")).toBeNull();
  });

  it("headings say Column I / Column II when the question does", () => {
    expect(matchColumnLabels("Match Column I with Column II:", "en")).toEqual({ colA: "Column I", colB: "Column II" });
    expect(matchColumnLabels("Match List I with List II", "en")).toEqual({ colA: "List I", colB: "List II" });
    expect(matchColumnLabels("Match Column A with Column B", "en")).toEqual({ colA: "Column A", colB: "Column B" });
  });

  it("keeps the language's own headings when the question names no columns", () => {
    expect(matchColumnLabels("Match the following:", "en")).toEqual({ colA: "Column A", colB: "Column B" });
    expect(matchColumnLabels("सही मिलान कीजिए", "hi")).toEqual({ colA: "स्तम्भ 'अ'", colB: "स्तम्भ 'ब'" });
  });

  it("a bilingual paper keeps the Hindi heading and follows the English name", () => {
    expect(matchColumnLabels("Match Column I with Column II", "bilingual")).toEqual({
      colA: "स्तम्भ 'अ' (Column I)",
      colB: "स्तम्भ 'ब' (Column II)",
    });
  });

  it("rewrites a section instruction to the question's column names", () => {
    expect(alignColumnNames("Match the items in Column A with Column B correctly.", "roman")).toBe(
      "Match the items in Column I with Column II correctly.",
    );
    expect(alignColumnNames("Match Column I with Column II.", "letter")).toBe("Match Column A with Column B.");
    expect(alignColumnNames("Match the items in Column A with Column B.", null)).toBe("Match the items in Column A with Column B.");
    expect(alignColumnNames("Answer all questions.", "roman")).toBe("Answer all questions.");
  });
});
