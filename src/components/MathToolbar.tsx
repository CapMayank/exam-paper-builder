"use client";

import { useState } from "react";
import { MathText } from "./MathText";
import { Modal } from "./ui";
import { Calculator, ChevronDown, ChevronUp, Grid, Sparkles, Table as TableIcon } from "lucide-react";

export type MathCategory = "arithmetic" | "science" | "calculus" | "trig" | "geometry" | "formulas" | "tables";

interface MathSnippet {
  label: string;
  snippet: string;
  display?: string; // If different from label, rendered with MathText
  tooltip?: string;
  isMathDisplay?: boolean;
}

const SNIPPETS: Record<Exclude<MathCategory, "tables">, MathSnippet[]> = {
  arithmetic: [
    { label: "a/b", display: "$\\frac{a}{b}$", snippet: "$\\frac{a}{b}$", tooltip: "Fraction", isMathDisplay: true },
    { label: "x²", display: "$x^2$", snippet: "$x^2$", tooltip: "Power / Square", isMathDisplay: true },
    { label: "xⁿ", display: "$x^n$", snippet: "$x^n$", tooltip: "Exponent", isMathDisplay: true },
    { label: "xₙ", display: "$x_n$", snippet: "$x_n$", tooltip: "Subscript", isMathDisplay: true },
    { label: "√x", display: "$\\sqrt{x}$", snippet: "$\\sqrt{x}$", tooltip: "Square root", isMathDisplay: true },
    { label: "ⁿ√x", display: "$\\sqrt[n]{x}$", snippet: "$\\sqrt[n]{x}$", tooltip: "n-th root", isMathDisplay: true },
    { label: "±", display: "$\\pm$", snippet: "$\\pm$", tooltip: "Plus-minus", isMathDisplay: true },
    { label: "×", display: "$\\times$", snippet: "$\\times$", tooltip: "Multiply", isMathDisplay: true },
    { label: "÷", display: "$\\div$", snippet: "$\\div$", tooltip: "Divide", isMathDisplay: true },
    { label: "≠", display: "$\\neq$", snippet: "$\\neq$", tooltip: "Not equal", isMathDisplay: true },
    { label: "≤", display: "$\\le$", snippet: "$\\le$", tooltip: "Less than or equal", isMathDisplay: true },
    { label: "≥", display: "$\\ge$", snippet: "$\\ge$", tooltip: "Greater than or equal", isMathDisplay: true },
    { label: "≈", display: "$\\approx$", snippet: "$\\approx$", tooltip: "Approximately equal", isMathDisplay: true },
    { label: "π", display: "$\\pi$", snippet: "$\\pi$", tooltip: "Pi (3.14159...)", isMathDisplay: true },
    { label: "∞", display: "$\\infty$", snippet: "$\\infty$", tooltip: "Infinity", isMathDisplay: true },
    { label: "⇒", display: "$\\Rightarrow$", snippet: "$\\Rightarrow$", tooltip: "Implies", isMathDisplay: true },
  ],
  science: [
    { label: "→(Δ)", display: "$\\xrightarrow{\\Delta}$", snippet: "$\\xrightarrow{\\Delta}$", tooltip: "Reaction with heat (Delta)", isMathDisplay: true },
    { label: "⇌", display: "$\\rightleftharpoons$", snippet: "$\\rightleftharpoons$", tooltip: "Reversible equilibrium", isMathDisplay: true },
    { label: "→", display: "$\\rightarrow$", snippet: "$\\rightarrow$", tooltip: "Reaction yields arrow", isMathDisplay: true },
    { label: "↑", display: "$\\uparrow$", snippet: "$\\uparrow$", tooltip: "Gas released", isMathDisplay: true },
    { label: "↓", display: "$\\downarrow$", snippet: "$\\downarrow$", tooltip: "Precipitate formed", isMathDisplay: true },
    { label: "(aq)", display: "$\\text{(aq)}$", snippet: "$\\text{(aq)}$", tooltip: "Aqueous state", isMathDisplay: true },
    { label: "(s)", display: "$\\text{(s)}$", snippet: "$\\text{(s)}$", tooltip: "Solid state", isMathDisplay: true },
    { label: "(l)", display: "$\\text{(l)}$", snippet: "$\\text{(l)}$", tooltip: "Liquid state", isMathDisplay: true },
    { label: "(g)", display: "$\\text{(g)}$", snippet: "$\\text{(g)}$", tooltip: "Gas state", isMathDisplay: true },
    { label: "H⁺", display: "$\\text{H}^+$", snippet: "$\\text{H}^+$", tooltip: "Hydrogen ion", isMathDisplay: true },
    { label: "OH⁻", display: "$\\text{OH}^-$", snippet: "$\\text{OH}^-$", tooltip: "Hydroxide ion", isMathDisplay: true },
    { label: "SO₄²⁻", display: "$\\text{SO}_4^{2-}$", snippet: "$\\text{SO}_4^{2-}$", tooltip: "Sulfate ion", isMathDisplay: true },
    { label: "CO₃²⁻", display: "$\\text{CO}_3^{2-}$", snippet: "$\\text{CO}_3^{2-}$", tooltip: "Carbonate ion", isMathDisplay: true },
    { label: "Fe²⁺", display: "$\\text{Fe}^{2+}$", snippet: "$\\text{Fe}^{2+}$", tooltip: "Ferrous ion", isMathDisplay: true },
    { label: "CO₂", display: "$\\text{CO}_2$", snippet: "$\\text{CO}_2$", tooltip: "Carbon dioxide", isMathDisplay: true },
    { label: "H₂O", display: "$\\text{H}_2\\text{O}$", snippet: "$\\text{H}_2\\text{O}$", tooltip: "Water", isMathDisplay: true },
    { label: "Ohm's Law", snippet: "$V = IR$", tooltip: "Ohm's Law (V = IR)" },
    { label: "Lens Formula", snippet: "$\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}$", tooltip: "Lens formula 1/f = 1/v - 1/u" },
    { label: "Mirror Formula", snippet: "$\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}$", tooltip: "Mirror formula 1/f = 1/v + 1/u" },
    { label: "Electric Power", snippet: "$P = VI = I^2 R = \\frac{V^2}{R}$", tooltip: "Power formulas" },
    { label: "Snell's Law", snippet: "$\\frac{\\sin i}{\\sin r} = n$", tooltip: "Snell's law of refraction" },
  ],
  calculus: [
    { label: "∫", display: "$\\int$", snippet: "$\\int f(x)\\,dx$", tooltip: "Indefinite Integral", isMathDisplay: true },
    { label: "∫ₐᵇ", display: "$\\int_a^b$", snippet: "$\\int_{a}^{b} f(x)\\,dx$", tooltip: "Definite Integral", isMathDisplay: true },
    { label: "∑", display: "$\\sum$", snippet: "$\\sum_{i=1}^{n} x_i$", tooltip: "Summation sigma", isMathDisplay: true },
    { label: "lim", display: "$\\lim$", snippet: "$\\lim_{x \\to 0} f(x)$", tooltip: "Limit as x approaches 0", isMathDisplay: true },
    { label: "dy/dx", display: "$\\frac{dy}{dx}$", snippet: "$\\frac{dy}{dx}$", tooltip: "First derivative", isMathDisplay: true },
    { label: "d²y/dx²", display: "$\\frac{d^2y}{dx^2}$", snippet: "$\\frac{d^2y}{dx^2}$", tooltip: "Second derivative", isMathDisplay: true },
    { label: "v⃗", display: "$\\vec{v}$", snippet: "$\\vec{v}$", tooltip: "Vector v", isMathDisplay: true },
    { label: "î+ĵ+k̂", display: "$\\hat{i}$", snippet: "$\\hat{i} + \\hat{j} + \\hat{k}$", tooltip: "Unit Cartesian vectors", isMathDisplay: true },
    { label: "A⃗ · B⃗", display: "$\\vec{A} \\cdot \\vec{B}$", snippet: "$\\vec{A} \\cdot \\vec{B}$", tooltip: "Dot product", isMathDisplay: true },
    { label: "A⃗ × B⃗", display: "$\\vec{A} \\times \\vec{B}$", snippet: "$\\vec{A} \\times \\vec{B}$", tooltip: "Cross product", isMathDisplay: true },
    { label: "2×2 Matrix", display: "$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$", snippet: "$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$", tooltip: "2x2 Matrix", isMathDisplay: true },
    { label: "2×2 Det", display: "$\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$", snippet: "$\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$", tooltip: "2x2 Determinant", isMathDisplay: true },
    { label: "3×3 Matrix", snippet: "$\\begin{pmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{pmatrix}$", tooltip: "3x3 Matrix" },
  ],
  trig: [
    { label: "θ", display: "$\\theta$", snippet: "$\\theta$", tooltip: "Theta", isMathDisplay: true },
    { label: "α", display: "$\\alpha$", snippet: "$\\alpha$", tooltip: "Alpha", isMathDisplay: true },
    { label: "β", display: "$\\beta$", snippet: "$\\beta$", tooltip: "Beta", isMathDisplay: true },
    { label: "°", display: "$^{\\circ}$", snippet: "$^{\\circ}$", tooltip: "Degree symbol", isMathDisplay: true },
    { label: "sin θ", display: "$\\sin\\theta$", snippet: "$\\sin\\theta$", tooltip: "Sine", isMathDisplay: true },
    { label: "cos θ", display: "$\\cos\\theta$", snippet: "$\\cos\\theta$", tooltip: "Cosine", isMathDisplay: true },
    { label: "tan θ", display: "$\\tan\\theta$", snippet: "$\\tan\\theta$", tooltip: "Tangent", isMathDisplay: true },
    { label: "sec θ", display: "$\\sec\\theta$", snippet: "$\\sec\\theta$", tooltip: "Secant", isMathDisplay: true },
    { label: "cosec θ", display: "$\\csc\\theta$", snippet: "$\\csc\\theta$", tooltip: "Cosecant", isMathDisplay: true },
    { label: "cot θ", display: "$\\cot\\theta$", snippet: "$\\cot\\theta$", tooltip: "Cotangent", isMathDisplay: true },
    { label: "sin²θ", display: "$\\sin^2\\theta$", snippet: "$\\sin^2\\theta$", tooltip: "sin squared theta", isMathDisplay: true },
    { label: "cos²θ", display: "$\\cos^2\\theta$", snippet: "$\\cos^2\\theta$", tooltip: "cos squared theta", isMathDisplay: true },
    { label: "tan²θ", display: "$\\tan^2\\theta$", snippet: "$\\tan^2\\theta$", tooltip: "tan squared theta", isMathDisplay: true },
  ],
  geometry: [
    { label: "△ABC", display: "$\\triangle ABC$", snippet: "$\\triangle ABC$", tooltip: "Triangle ABC", isMathDisplay: true },
    { label: "∠A", display: "$\\angle A$", snippet: "$\\angle A$", tooltip: "Angle A", isMathDisplay: true },
    { label: "⊥", display: "$\\perp$", snippet: "$\\perp$", tooltip: "Perpendicular", isMathDisplay: true },
    { label: "∥", display: "$\\parallel$", snippet: "$\\parallel$", tooltip: "Parallel", isMathDisplay: true },
    { label: "≅", display: "$\\cong$", snippet: "$\\cong$", tooltip: "Congruent", isMathDisplay: true },
    { label: "∼", display: "$\\sim$", snippet: "$\\sim$", tooltip: "Similar triangles", isMathDisplay: true },
    { label: "cm²", display: "$\\text{cm}^2$", snippet: "$\\text{cm}^2$", tooltip: "Square centimeters", isMathDisplay: true },
    { label: "m²", display: "$\\text{m}^2$", snippet: "$\\text{m}^2$", tooltip: "Square meters", isMathDisplay: true },
    { label: "cm³", display: "$\\text{cm}^3$", snippet: "$\\text{cm}^3$", tooltip: "Cubic centimeters", isMathDisplay: true },
    { label: "r²", display: "$r^2$", snippet: "$r^2$", tooltip: "Radius squared", isMathDisplay: true },
    { label: "2πr", display: "$2\\pi r$", snippet: "$2\\pi r$", tooltip: "Circumference of circle", isMathDisplay: true },
    { label: "πr²", display: "$\\pi r^2$", snippet: "$\\pi r^2$", tooltip: "Area of circle", isMathDisplay: true },
  ],
  formulas: [
    {
      label: "Quadratic Formula",
      snippet: "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
      tooltip: "Roots of ax² + bx + c = 0",
    },
    {
      label: "Discriminant (D)",
      snippet: "$D = b^2 - 4ac$",
      tooltip: "Discriminant of quadratic equation",
    },
    {
      label: "AP n-th Term",
      snippet: "$a_n = a + (n - 1)d$",
      tooltip: "Arithmetic progression n-th term",
    },
    {
      label: "AP Sum (Sn)",
      snippet: "$S_n = \\frac{n}{2}[2a + (n - 1)d]$",
      tooltip: "Sum of first n terms of an AP",
    },
    {
      label: "Distance Formula",
      snippet: "$d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$",
      tooltip: "Coordinate geometry distance",
    },
    {
      label: "Section Formula",
      snippet: "$\\left(\\frac{m_1 x_2 + m_2 x_1}{m_1 + m_2}, \\frac{m_1 y_2 + m_2 y_1}{m_1 + m_2}\\right)$",
      tooltip: "Internal division coordinates",
    },
    {
      label: "Trig Identity 1",
      snippet: "$\\sin^2\\theta + \\cos^2\\theta = 1$",
      tooltip: "Pythagorean trig identity",
    },
    {
      label: "Statistics Mean",
      snippet: "$\\bar{x} = \\frac{\\sum f_i x_i}{\\sum f_i}$",
      tooltip: "Direct mean formula",
    },
    {
      label: "Statistics Median",
      snippet: "$\\text{Median} = l + \\left(\\frac{\\frac{N}{2} - cf}{f}\\right) \\times h$",
      tooltip: "Grouped data median",
    },
    {
      label: "Statistics Mode",
      snippet: "$\\text{Mode} = l + \\left(\\frac{f_1 - f_0}{2f_1 - f_0 - f_2}\\right) \\times h$",
      tooltip: "Grouped data mode",
    },
  ],
};

export function MathToolbar({
  onInsert,
}: {
  onInsert: (snippet: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<MathCategory>("arithmetic");
  const [expanded, setExpanded] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);

  // Frequency Table Generator State
  const [tableHeaders, setTableHeaders] = useState({
    col1: "Class Interval",
    col2: "Frequency",
  });
  const [tableRows, setTableRows] = useState([
    { col1: "0-10", col2: "5" },
    { col1: "10-20", col2: "8" },
    { col1: "20-30", col2: "12" },
    { col1: "30-40", col2: "15" },
    { col1: "40-50", col2: "10" },
  ]);

  function handleInsertTable() {
    const validRows = tableRows.filter((r) => r.col1.trim() || r.col2.trim());
    if (validRows.length === 0) return;

    // Transposed horizontal table (standard Indian / CBSE board exam layout):
    // Row 1: Header 1 & intervals
    // Row 2: Header 2 & frequencies
    const colCount = validRows.length + 1;
    const colSpec = "|c|" + "c|".repeat(validRows.length);

    const row1 = `\\text{${tableHeaders.col1}} & ` + validRows.map((r) => r.col1.trim()).join(" & ") + " \\\\";
    const row2 = `\\text{${tableHeaders.col2}} & ` + validRows.map((r) => r.col2.trim()).join(" & ") + " \\\\";

    const latex = `$$\\begin{array}{${colSpec}}\n\\hline\n${row1}\n\\hline\n${row2}\n\\hline\n\\end{array}$$`;

    onInsert(latex);
    setShowTableModal(false);
  }

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-2 text-xs">
      {/* Top Header Row with Categories & Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-indigo-100/80">
        <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
          <Calculator size={13} className="text-indigo-600" />
          <span>Math Assistant:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("arithmetic")}
            className={`rounded px-2 py-0.5 font-medium transition ${
              activeTab === "arithmetic"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-indigo-100"
            }`}
          >
            Basic / Algebra
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("science")}
            className={`rounded px-2 py-0.5 font-medium transition ${
              activeTab === "science"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-indigo-100"
            }`}
          >
            Science &amp; Reactions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("calculus")}
            className={`rounded px-2 py-0.5 font-medium transition ${
              activeTab === "calculus"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-indigo-100"
            }`}
          >
            Calculus &amp; Matrices
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trig")}
            className={`rounded px-2 py-0.5 font-medium transition ${
              activeTab === "trig"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-indigo-100"
            }`}
          >
            Trigonometry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("geometry")}
            className={`rounded px-2 py-0.5 font-medium transition ${
              activeTab === "geometry"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-indigo-100"
            }`}
          >
            Geometry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("formulas")}
            className={`rounded px-2 py-0.5 font-medium transition ${
              activeTab === "formulas"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-indigo-100"
            }`}
          >
            Board Formulas
          </button>
          <button
            type="button"
            onClick={() => setShowTableModal(true)}
            className="flex items-center gap-1 rounded bg-white px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition"
            title="Create a Class Interval & Frequency Table"
          >
            <TableIcon size={12} className="text-emerald-600" />
            + Stat Table
          </button>
        </div>
      </div>

      {/* Buttons Palette */}
      <div className="pt-2 flex flex-wrap gap-1.5 items-center">
        {activeTab !== "tables" &&
          SNIPPETS[activeTab as keyof typeof SNIPPETS]?.map((s) => (
            <button
              key={s.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className="inline-flex items-center justify-center rounded border border-indigo-200/90 bg-white px-2 py-1 text-xs font-medium text-slate-800 shadow-2xs hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-950 active:scale-95 transition min-h-7"
              title={`${s.tooltip || s.label} (Click to insert)`}
              onClick={() => onInsert(s.snippet)}
            >
              {s.isMathDisplay && s.display ? (
                <span className="pointer-events-none select-none text-xs leading-none">
                  <MathText text={s.display} />
                </span>
              ) : (
                <span className="font-mono text-xs">{s.label}</span>
              )}
            </button>
          ))}
      </div>

      {/* Frequency Table Generator Modal */}
      {showTableModal && (
        <Modal
          title="Insert Statistics Frequency Table"
          subtitle="Generate a CBSE-standard Class Interval and Frequency table for Mean, Median, or Mode problems."
          onClose={() => setShowTableModal(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Header 1 (Row 1)</label>
                <input
                  className="input text-xs"
                  value={tableHeaders.col1}
                  onChange={(e) => setTableHeaders({ ...tableHeaders, col1: e.target.value })}
                  placeholder="e.g. Class Interval"
                />
              </div>
              <div>
                <label className="label">Header 2 (Row 2)</label>
                <input
                  className="input text-xs"
                  value={tableHeaders.col2}
                  onChange={(e) => setTableHeaders({ ...tableHeaders, col2: e.target.value })}
                  placeholder="e.g. Frequency"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="label">Table Columns &amp; Values</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() =>
                    setTableRows([...tableRows, { col1: "", col2: "" }])
                  }
                >
                  + Add Column
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {tableRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 text-xs text-slate-400">#{i + 1}</span>
                    <input
                      className="input text-xs flex-1"
                      placeholder="e.g. 0-10"
                      value={r.col1}
                      onChange={(e) => {
                        const copy = [...tableRows];
                        copy[i].col1 = e.target.value;
                        setTableRows(copy);
                      }}
                    />
                    <input
                      className="input text-xs w-28"
                      placeholder="Frequency"
                      value={r.col2}
                      onChange={(e) => {
                        const copy = [...tableRows];
                        copy[i].col2 = e.target.value;
                        setTableRows(copy);
                      }}
                    />
                    <button
                      type="button"
                      disabled={tableRows.length <= 2}
                      className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-20"
                      onClick={() => setTableRows(tableRows.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Table Preview */}
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <span className="label text-indigo-700">Live Table Preview:</span>
              <div className="overflow-x-auto pt-1 text-center">
                <MathText
                  text={`$$\\begin{array}{|c|${"c|".repeat(tableRows.length)}}\n\\hline\n\\text{${tableHeaders.col1}} & ${tableRows
                    .map((r) => r.col1 || "-")
                    .join(" & ")} \\\\\n\\hline\n\\text{${tableHeaders.col2}} & ${tableRows
                    .map((r) => r.col2 || "-")
                    .join(" & ")} \\\\\n\\hline\n\\end{array}$$`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                className="btn"
                onClick={() => setShowTableModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleInsertTable}
              >
                Insert Table into Question
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
