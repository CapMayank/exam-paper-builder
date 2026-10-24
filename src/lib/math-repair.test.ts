import { describe, expect, it } from "vitest";
import {
  cleanMatchItem,
  cleanOptionText,
  extractColumnIItems,
  getMatchColumnInstruction,
  parseMatchColumnPairs,
  splitOutsideMath,
} from "./constants";
import { cleanLatexToUnicode, extractTableFromText, parseMathSegments, repairLatex, safeRenderLatex } from "./math";

describe("LaTeX Repair & Defensive Math Rendering", () => {
  it("repairs unclosed macro arguments (the exact user reported bug: \\frac{x)", () => {
    const broken = "\\frac{x";
    const repaired = repairLatex(broken);
    expect(repaired).toBe("\\frac{x}{}");

    const rendered = safeRenderLatex(broken);
    expect(rendered.success).toBe(true);
    expect(rendered.html).toContain("katex");
    expect(rendered.html).not.toContain("katex-error");
  });

  it("repairs unclosed braces in fractions, square roots, and exponents", () => {
    expect(repairLatex("\\frac{x - 1}{x + 1")).toBe("\\frac{x - 1}{x + 1}");
    expect(repairLatex("\\sqrt{x^2 + 1")).toBe("\\sqrt{x^2 + 1}");
    expect(repairLatex("x^{2")).toBe("x^{2}");
    expect(repairLatex("\\text{cm")).toBe("\\text{cm}");
    expect(repairLatex("\\frac{a}")).toBe("\\frac{a}{}");
  });

  it("repairs unclosed LaTeX environments (matrix, pmatrix, cases)", () => {
    const unclosedMatrix = "\\begin{pmatrix} 1 & 2 \\\\ 3 & 4";
    const repaired = repairLatex(unclosedMatrix);
    expect(repaired).toContain("\\end{pmatrix}");

    const rendered = safeRenderLatex(unclosedMatrix);
    expect(rendered.success).toBe(true);
    expect(rendered.html).toContain("katex");
  });

  it("safely strips trailing dangling backslashes and carets", () => {
    expect(repairLatex("x + \\")).toBe("x +");
    expect(repairLatex("y^")).toBe("y");
    expect(repairLatex("z_")).toBe("z");
  });

  it("falls back to clean Unicode without katex-error if syntax is completely unparsable", () => {
    const invalid = "\\invalidCommandWhichDoesNotExistReally{123}";
    const rendered = safeRenderLatex(invalid);
    // Should never contain KaTeX parse error banner
    expect(rendered.html).not.toContain("katex-error");
    expect(rendered.html).not.toContain("KaTeX parse error");
  });

  it("auto-closes unclosed $ containing LaTeX math expressions in parseMathSegments", () => {
    const unclosedDollar = "Calculate $\\frac{x}{2}";
    const segments = parseMathSegments(unclosedDollar);
    expect(segments.some((s) => s.type === "math")).toBe(true);
    const mathSeg = segments.find((s) => s.type === "math");
    if (mathSeg && mathSeg.type === "math") {
      expect(mathSeg.html).toContain("katex");
      expect(mathSeg.html).not.toContain("katex-error");
    }
  });
});

describe("Math-Aware Match the Column Parsing", () => {
  it("splits outside math mode but ignores minus signs and arrows inside LaTeX $...$", () => {
    // Delimiter ' - ' outside math mode
    const textWithOuterDelim = "(A) $f(x) - g(x)$ - (1) Difference";
    const split1 = splitOutsideMath(textWithOuterDelim, [" - "]);
    expect(split1).toEqual(["(A) $f(x) - g(x)$", "(1) Difference"]);

    // Option with minus sign strictly inside math mode -> must NOT split
    const textInsideMath = "(1) $\\frac{x - 1}{x + 1}$";
    const split2 = splitOutsideMath(textInsideMath, [" - "]);
    expect(split2).toBeNull();

    // Option with arithmetic expression inside math mode
    const textAp = "$a_n = a + (n - 1)d$";
    const split3 = splitOutsideMath(textAp, [" - "]);
    expect(split3).toBeNull();
  });

  it("correctly pairs questionText Column I with options containing minus signs without slicing LaTeX", () => {
    const questionText = `Match the items in Column I with Column II:
Column I:
(A) $f(x) - g(x)$
(B) $\\frac{x - 1}{x + 1}$
`;
    const options = [
      "(1) Difference of functions",
      "(2) $a_n = a + (n - 1)d$",
    ];

    const pairs = parseMatchColumnPairs(options, questionText);
    expect(pairs.length).toBe(2);
    expect(pairs[0].left).toBe("$f(x) - g(x)$");
    expect(pairs[0].right).toBe("Difference of functions");
    expect(pairs[1].left).toBe("$\\frac{x - 1}{x + 1}$");
    expect(pairs[1].right).toBe("$a_n = a + (n - 1)d$");
  });

  it("does not mistake Column II as Column I when question text contains both column headers", () => {
    const questionText = `Match the items in Column I with Column II:
Column I:
(A) First Item
(B) Second Item

Column II:
(i) Match 1
(ii) Match 2
`;
    const colI = extractColumnIItems(questionText);
    expect(colI).toEqual(["First Item", "Second Item"]);
  });

  it("handles Hindi column headers (स्तम्भ 'अ' / स्तम्भ 'ब')", () => {
    const hindiQuestion = `सही जोड़ी बनाइए:
स्तम्भ 'अ'
(1) विद्युत धारा
(2) विभवान्तर

स्तम्भ 'ब'
(A) वोल्ट
(B) एम्पियर
`;
    const colI = extractColumnIItems(hindiQuestion);
    expect(colI).toEqual(["विद्युत धारा", "विभवान्तर"]);

    const instruction = getMatchColumnInstruction(hindiQuestion);
    expect(instruction).toBe("सही जोड़ी बनाइए:");
  });

  it("splits paired options with ||| delimiter reliably", () => {
    const options = [
      "$\\frac{x - 1}{x + 1}$ ||| Rational function",
      "$x^2 - 4$ ||| Quadratic polynomial",
    ];
    const pairs = parseMatchColumnPairs(options, null);
    expect(pairs.length).toBe(2);
    expect(pairs[0].left).toBe("$\\frac{x - 1}{x + 1}$");
    expect(pairs[0].right).toBe("Rational function");
    expect(pairs[1].left).toBe("$x^2 - 4$");
    expect(pairs[1].right).toBe("Quadratic polynomial");
  });

  it("preserves LaTeX \\text{} inside math mode options while cleaning bare options", () => {
    // Option with math formula having \text{} inside $...$
    const mathOption = "(a) Value is $\\frac{\\text{km}}{\\text{h}}$";
    const cleanedMath = cleanOptionText(mathOption);
    expect(cleanedMath).toBe("Value is $\\frac{\\text{km}}{\\text{h}}$");

    // Option with bare leaked formatting outside math mode
    const bareOption = "(b) \\textbf{Uniform velocity}";
    const cleanedBare = cleanOptionText(bareOption);
    expect(cleanedBare).toBe("Uniform velocity");
  });

  describe("LaTeX Nested Braces & Unicode Conversion Defenses", () => {
    it("safely converts fractions with nested braces in exponents and subscripts to Unicode", () => {
      // Nested curly braces in exponents
      const fracExponent = "\\frac{x^{2}}{y^{2}}";
      const unicodeFrac = cleanLatexToUnicode(fracExponent);
      expect(unicodeFrac).toBe("(x^{2})/(y^{2})");

      // Simple fraction without extra operators
      expect(cleanLatexToUnicode("\\frac{x}{y}")).toBe("x/y");

      // Nested subscripts
      const fracSubscript = "\\frac{a_{1}}{b_{2}}";
      expect(cleanLatexToUnicode(fracSubscript)).toBe("(a_{1})/(b_{2})");

      // Nested fractions
      const nestedFrac = "\\frac{1 + \\frac{1}{x}}{x}";
      expect(cleanLatexToUnicode(nestedFrac)).toBe("(1 + 1/x)/x");
    });

    it("safely converts square and n-th roots with nested curly braces", () => {
      const rootExpr = "\\sqrt{x^{2} + 1}";
      expect(cleanLatexToUnicode(rootExpr)).toBe("√(x^{2} + 1)");

      const cubeRoot = "\\sqrt[3]{x^{3}}";
      expect(cleanLatexToUnicode(cubeRoot)).toBe("3√(x^{3})");
    });

    it("repairs single-argument \\frac with nested braces by auto-completing denominator", () => {
      const singleArg = "\\frac{x^{2}}";
      const repaired = repairLatex(singleArg);
      expect(repaired).toBe("\\frac{x^{2}}{}");
    });

    it("repairs multiple and nested unclosed environments using stack tracking", () => {
      // Multiple environments of the same type: first is closed, second is unclosed
      const doubleMatrix = "\\begin{matrix} 1 & 2 \\end{matrix} + \\begin{matrix} 3 & 4";
      const repaired = repairLatex(doubleMatrix);
      expect(repaired.endsWith("\\end{matrix}")).toBe(true);
      const rendered = safeRenderLatex(doubleMatrix);
      expect(rendered.success).toBe(true);
      expect(rendered.html).toContain("katex");

      // Nested unclosed environments: pmatrix enclosing matrix
      const nestedEnv = "\\begin{pmatrix} \\begin{matrix} a & b \\end{matrix}";
      const repairedNested = repairLatex(nestedEnv);
      expect(repairedNested).toContain("\\end{pmatrix}");
      expect(safeRenderLatex(nestedEnv).success).toBe(true);
    });

    it("balances unclosed \\left delimiters with \\right. to avoid KaTeX parse crash", () => {
      const unclosedLeft = "\\left( \\frac{a}{b}";
      const repaired = repairLatex(unclosedLeft);
      expect(repaired).toContain("\\right.");
      const rendered = safeRenderLatex(unclosedLeft);
      expect(rendered.success).toBe(true);
      expect(rendered.html).toContain("katex");
    });

    it("safely handles truncated trailing \\frac", () => {
      const truncated = "x = \\frac";
      const repaired = repairLatex(truncated);
      expect(repaired).toBe("x = \\frac{}{}");
      expect(safeRenderLatex(truncated).success).toBe(true);
    });
  });

  describe("Table Extraction & Protection of Math Pipes", () => {
    it("protects absolute values and conditional probability pipes inside markdown table cells", () => {
      const markdownTable = `The function and its properties are listed below:
| Function | Property |
|---|---|
| $f(x) = |x|$ | Continuous at $x=0$ |
| $P(A|B) = 0.5$ | Conditional probability |
Find the value of $f(-2)$.`;

      const extracted = extractTableFromText(markdownTable);
      expect(extracted.table).not.toBeNull();
      expect(extracted.table!.headers).toEqual(["Function", "Property"]);
      expect(extracted.table!.rows.length).toBe(2);
      expect(extracted.table!.rows[0]).toEqual(["$f(x) = |x|$", "Continuous at $x=0$"]);
      expect(extracted.table!.rows[1]).toEqual(["$P(A|B) = 0.5$", "Conditional probability"]);
      expect(extracted.prefixText).toContain("listed below:");
      expect(extracted.suffixText).toContain("Find the value of $f(-2)$.");
    });
  });

  describe("Match Column Robustness & Edge Cases", () => {
    it("filters out empty trailing options from match pairs", () => {
      const optionsWithBlanks = [
        "Acid ||| pH < 7",
        "Base ||| pH > 7",
        "",
        "   ",
      ];
      const pairs = parseMatchColumnPairs(optionsWithBlanks, null);
      expect(pairs.length).toBe(2);
      expect(pairs[0].left).toBe("Acid");
      expect(pairs[1].left).toBe("Base");
    });

    it("preserves all Column I items even if options array has fewer items", () => {
      const stem = `Match the following:
Column I:
(A) Acid
(B) Base
(C) Salt
(D) Water
`;
      const shortOptions = ["pH < 7", "pH > 7"];
      const pairs = parseMatchColumnPairs(shortOptions, stem);
      expect(pairs.length).toBe(4);
      expect(pairs[0].left).toBe("Acid");
      expect(pairs[1].left).toBe("Base");
      expect(pairs[2].left).toBe("Salt");
      expect(pairs[3].left).toBe("Water");
      expect(pairs[0].right).toBe("pH < 7");
      expect(pairs[1].right).toBe("pH > 7");
      expect(pairs[2].right).toBe("");
      expect(pairs[3].right).toBe("");
    });
  });
});

