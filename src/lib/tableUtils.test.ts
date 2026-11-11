import { describe, expect, it } from "vitest";
import { buildStatTableLatex, buildTableLatex, formatCellForLatex, TABLE_PRESETS } from "./tableUtils";
import { extractTableFromText } from "./math";

describe("tableUtils & Table Serialization Suite", () => {
  describe("formatCellForLatex", () => {
    it("formats empty cell as dash", () => {
      expect(formatCellForLatex("")).toBe("-");
      expect(formatCellForLatex("   ")).toBe("-");
    });

    it("leaves numbers, ratios, and standard ranges unescaped", () => {
      expect(formatCellForLatex("0-10")).toBe("0-10");
      expect(formatCellForLatex("15")).toBe("15");
      expect(formatCellForLatex("3.14")).toBe("3.14");
      expect(formatCellForLatex("1:2")).toBe("1:2");
    });

    it("wraps text in \\text{...}", () => {
      expect(formatCellForLatex("Class Interval")).toBe("\\text{Class Interval}");
      expect(formatCellForLatex("Sample A")).toBe("\\text{Sample A}");
    });

    it("preserves existing \\text{...} without double-wrapping", () => {
      expect(formatCellForLatex("\\text{Observation}")).toBe("\\text{Observation}");
    });

    it("strips dollar signs from $math$ expressions", () => {
      expect(formatCellForLatex("$x^2$")).toBe("x^2");
      expect(formatCellForLatex("$$\\alpha + \\beta$$")).toBe("\\alpha + \\beta");
    });

    it("preserves LaTeX commands", () => {
      expect(formatCellForLatex("\\frac{1}{2}")).toBe("\\frac{1}{2}");
      expect(formatCellForLatex("\\sqrt{x}")).toBe("\\sqrt{x}");
    });
  });

  describe("buildTableLatex & extractTableFromText Round-trip", () => {
    it("generates a valid LaTeX array table with custom rows and columns", () => {
      const headers = ["Test Tube", "Solution", "Observation"];
      const rows = [
        ["A", "Dilute HCl", "Effervescence"],
        ["B", "Dilute NaOH", "No reaction"],
      ];

      const latex = buildTableLatex(headers, rows, true);
      expect(latex).toContain("\\begin{array}{|c|c|c|}");
      expect(latex).toContain("\\text{Test Tube} & \\text{Solution} & \\text{Observation} \\\\");
      expect(latex).toContain("\\text{A} & \\text{Dilute HCl} & \\text{Effervescence} \\\\");
      expect(latex).toContain("\\end{array}");

      // Verify that extractTableFromText properly extracts the table
      const extracted = extractTableFromText(`Given the experiment:\n${latex}\nIdentify the gas.`);
      expect(extracted.table).not.toBeNull();
      expect(extracted.table!.headers).toEqual(["Test Tube", "Solution", "Observation"]);
      expect(extracted.table!.rows).toHaveLength(2);
      expect(extracted.table!.rows[0]).toEqual(["A", "Dilute HCl", "Effervescence"]);
      expect(extracted.table!.rows[1]).toEqual(["B", "Dilute NaOH", "No reaction"]);
      expect(extracted.prefixText).toContain("Given the experiment:");
      expect(extracted.suffixText).toContain("Identify the gas.");
    });

    it("supports tables with 4 rows and 4 columns", () => {
      const headers = ["Col 1", "Col 2", "Col 3", "Col 4"];
      const rows = [
        ["1", "2", "3", "4"],
        ["5", "6", "7", "8"],
        ["9", "10", "11", "12"],
        ["13", "14", "15", "16"],
      ];

      const latex = buildTableLatex(headers, rows, true);
      const extracted = extractTableFromText(latex);
      expect(extracted.table).not.toBeNull();
      expect(extracted.table!.headers).toEqual(["Col 1", "Col 2", "Col 3", "Col 4"]);
      expect(extracted.table!.rows).toHaveLength(4);
      expect(extracted.table!.rows[3]).toEqual(["13", "14", "15", "16"]);
    });

    it("supports tables with math in cells", () => {
      const headers = ["Formula", "Name", "Degree"];
      const rows = [
        ["$f(x) = x^2$", "Quadratic", "2"],
        ["$g(x) = x^3$", "Cubic", "3"],
      ];

      const latex = buildTableLatex(headers, rows, true);
      const extracted = extractTableFromText(latex);
      expect(extracted.table).not.toBeNull();
      expect(extracted.table!.headers).toEqual(["Formula", "Name", "Degree"]);
      expect(extracted.table!.rows).toHaveLength(2);
      expect(extracted.table!.rows[0][1]).toBe("Quadratic");
      expect(extracted.table!.rows[0][2]).toBe("2");
    });
  });

  describe("buildStatTableLatex & extractTableFromText Round-trip", () => {
    it("generates 2-row horizontal CBSE statistics table", () => {
      const cols = [
        { col1: "0-10", col2: "5" },
        { col1: "10-20", col2: "8" },
        { col1: "20-30", col2: "12" },
      ];

      const latex = buildStatTableLatex("Class Interval", "Frequency", cols);
      expect(latex).toContain("\\begin{array}{|c|c|c|c|}");
      expect(latex).toContain("\\text{Class Interval} & 0-10 & 10-20 & 20-30 \\\\");
      expect(latex).toContain("\\text{Frequency} & 5 & 8 & 12 \\\\");

      const extracted = extractTableFromText(latex);
      expect(extracted.table).not.toBeNull();
      expect(extracted.table!.headers).toEqual(["Class Interval", "0-10", "10-20", "20-30"]);
      expect(extracted.table!.rows).toHaveLength(1);
      expect(extracted.table!.rows[0]).toEqual(["Frequency", "5", "8", "12"]);
    });
  });

  describe("TABLE_PRESETS", () => {
    it("contains valid presets that can be rendered to LaTeX", () => {
      for (const preset of TABLE_PRESETS) {
        const latex = buildTableLatex(preset.headers, preset.rows, true);
        const extracted = extractTableFromText(latex);
        expect(extracted.table).not.toBeNull();
        expect(extracted.table!.headers).toEqual(preset.headers);
        expect(extracted.table!.rows.length).toBe(preset.rows.length);
      }
    });
  });
});
