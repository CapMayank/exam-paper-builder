/**
 * Utilities for generating standard LaTeX array tables for exam papers.
 * The generated LaTeX arrays are compatible with KaTeX, MathLive editor,
 * QuestionContent HTML renderer, and paperDocx Word exporter.
 */

export interface TablePreset {
  id: string;
  name: string;
  description: string;
  headers: string[];
  rows: string[][];
}

export const TABLE_PRESETS: TablePreset[] = [
  {
    id: "grid-3x3",
    name: "Standard 3 × 3",
    description: "3 columns with 3 data rows",
    headers: ["Parameter", "Sample A", "Sample B"],
    rows: [
      ["Colour", "Blue", "Colourless"],
      ["pH Value", "4.5", "7.0"],
      ["Action on Litmus", "Turns red", "No change"],
    ],
  },
  {
    id: "comparison-2col",
    name: "Comparison / Distinction",
    description: "2 columns for comparing two concepts or terms",
    headers: ["Property / Feature", "Concept A", "Concept B"],
    rows: [
      ["Definition", "", ""],
      ["SI Unit", "", ""],
      ["Key Example", "", ""],
    ],
  },
  {
    id: "science-observation",
    name: "Observation Table (4 Cols)",
    description: "Common for laboratory and experimental questions",
    headers: ["S. No.", "Test / Substance", "Observation", "Inference"],
    rows: [
      ["1", "Dilute HCl + Zinc", "Brisk effervescence", "H2 gas evolved"],
      ["2", "NaOH + Al metal", "Gas with pop sound", "H2 gas evolved"],
      ["3", "Cu + Dilute HCl", "No reaction", "Cu less reactive than H"],
    ],
  },
  {
    id: "vertical-freq",
    name: "Frequency Table (Vertical)",
    description: "Standard vertical table for Statistics",
    headers: ["Class Interval", "Frequency (fi)", "Cumulative Freq (cf)"],
    rows: [
      ["0-10", "5", "5"],
      ["10-20", "8", "13"],
      ["20-30", "12", "25"],
      ["30-40", "15", "40"],
      ["40-50", "10", "50"],
    ],
  },
  {
    id: "simple-grid",
    name: "Empty 3 × 3",
    description: "Clean empty 3 columns and 3 rows",
    headers: ["Column 1", "Column 2", "Column 3"],
    rows: [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ],
  },
];

/**
 * Formats a single cell value for inclusion in a LaTeX array environment.
 * - Leaves existing math expressions ($...$ or $$...$$) intact without dollars.
 * - Leaves pure numbers and math symbols (+, -, /, =, <, >) bare.
 * - Wraps plain text phrases in \text{...} so KaTeX renders them in upright Roman font.
 */
export function formatCellForLatex(cell: string): string {
  const trimmed = cell.trim();
  if (!trimmed) return "-";

  // If already wrapped in display math $$...$$
  if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
    return trimmed.slice(2, -2).trim();
  }

  // If already wrapped in inline math $...$
  if (trimmed.startsWith("$") && trimmed.endsWith("$") && trimmed.length > 2) {
    return trimmed.slice(1, -1).trim();
  }

  // If already wrapped in \text{...}
  if (trimmed.startsWith("\\text{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  // If it already contains LaTeX macro commands like \frac, \sqrt, \alpha, etc.
  if (/\\(?:[a-zA-Z]+)\b/.test(trimmed)) {
    return trimmed;
  }

  // Pure numeric / standard range / ratio symbols like "0-10", "25", "100.5", "1:2", "(a)"
  if (/^[0-9\.\,\+\-\*\/\=\<\>\:\(\)\s]+$/.test(trimmed)) {
    return trimmed;
  }

  // Text string: wrap in \text{...}
  return `\\text{${trimmed}}`;
}

/**
 * Builds a LaTeX array environment representing a grid table.
 */
export function buildTableLatex(
  headers: string[],
  rows: string[][],
  hasHeader: boolean = true,
): string {
  const numCols = Math.max(
    hasHeader ? headers.length : 0,
    ...rows.map((r) => r.length),
    1,
  );
  const colSpec = "|" + "c|".repeat(numCols);

  const lines: string[] = ["\\hline"];

  if (hasHeader && headers.length > 0) {
    const paddedHeaders = [...headers];
    while (paddedHeaders.length < numCols) paddedHeaders.push("");
    const headerRow = paddedHeaders.map(formatCellForLatex).join(" & ");
    lines.push(`${headerRow} \\\\`);
    lines.push("\\hline");
  }

  for (const row of rows) {
    const paddedRow = [...row];
    while (paddedRow.length < numCols) paddedRow.push("");
    const dataRow = paddedRow.map(formatCellForLatex).join(" & ");
    lines.push(`${dataRow} \\\\`);
    lines.push("\\hline");
  }

  return `$$\\begin{array}{${colSpec}}\n${lines.join("\n")}\n\\end{array}$$`;
}

/**
 * Builds a 2-row horizontal statistics table (Class Interval & Frequency)
 * in the CBSE board layout style.
 */
export function buildStatTableLatex(
  header1: string,
  header2: string,
  cols: Array<{ col1: string; col2: string }>,
): string {
  const validCols = cols.filter((c) => c.col1.trim() || c.col2.trim());
  if (validCols.length === 0) return "";
  const colSpec = "|c|" + "c|".repeat(validCols.length);

  const row1 =
    `${formatCellForLatex(header1 || "Class Interval")} & ` +
    validCols.map((c) => formatCellForLatex(c.col1)).join(" & ") +
    " \\\\";
  const row2 =
    `${formatCellForLatex(header2 || "Frequency")} & ` +
    validCols.map((c) => formatCellForLatex(c.col2)).join(" & ") +
    " \\\\";

  return `$$\\begin{array}{${colSpec}}\n\\hline\n${row1}\n\\hline\n${row2}\n\\hline\n\\end{array}$$`;
}
