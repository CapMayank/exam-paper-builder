import { describe, expect, it } from "vitest";
import { computeDisplayedPaperNumbering } from "./layout";
import { getPaperLocale } from "./localization";
import { planSectionHeadings } from "./sectionHeadingPlan";

type Row = { id: string; title: string; type: string; count: number; marksEach: number; order: number };

/** `placed` overrides how many questions a row has placed (a draft); by default every slot is filled */
function plan(rows: Row[], lang: "en" | "hi" | "sa" = "en", placed: Record<string, number> = {}) {
  const items = rows.flatMap((r) =>
    Array.from({ length: placed[r.id] ?? (r.type === "MATCH_COLUMN" ? 1 : r.count) }, (_, i) => ({
      id: `${r.id}-${i}`,
      sectionId: r.id,
      position: i,
      question: { type: r.type },
    })),
  );
  const numbering = computeDisplayedPaperNumbering(rows, items, "CONTINUOUS", lang);
  return planSectionHeadings(rows, items, numbering, getPaperLocale(lang));
}

describe("planSectionHeadings: each fact is printed once, by the level that owns it", () => {
  it("a heading that is one grouped question: the band prints its name alone, the question line owns the rest", () => {
    const p = plan([{ id: "fb", title: "Question 2: Fill in the Blanks", type: "FILL_BLANK", count: 6, marksEach: 1, order: 1 }]);
    expect(p.fb).toEqual({
      showBand: true,
      bandSummary: "",
      showBandInstruction: false,
      showTypeSubBand: false,
      grouped: true,
    });
  });

  it("true/false heading: no count or marks in the band", () => {
    const p = plan([{ id: "tf", title: "Question 3: True / False", type: "TRUE_FALSE", count: 5, marksEach: 1, order: 1 }]);
    expect(p.tf.bandSummary).toBe("");
    expect(p.tf.showBandInstruction).toBe(false);
  });

  it("a heading that is one match question: its stem is the instruction and its line the marks, so the band is the name", () => {
    const p = plan([{ id: "m", title: "Match the Columns", type: "MATCH_COLUMN", count: 6, marksEach: 1, order: 1 }]);
    expect(p.m).toEqual({
      showBand: true,
      bandSummary: "",
      showBandInstruction: false,
      showTypeSubBand: false,
      grouped: false,
    });
  });

  it("a heading of separate very-short questions: the band owns the instruction and the count", () => {
    const p = plan([{ id: "vs", title: "Section B", type: "VERY_SHORT", count: 8, marksEach: 1, order: 1 }]);
    expect(p.vs).toEqual({
      showBand: true,
      bandSummary: "8 Questions · 8 Marks",
      showBandInstruction: true,
      showTypeSubBand: false,
      grouped: false,
    });
  });

  it("a draft heading counts what is placed: 5 of 6 two-mark questions is 5 Questions · 10 Marks, never 12", () => {
    const row = { id: "vs", title: "Very Short Answer Type Questions", type: "VERY_SHORT", count: 6, marksEach: 2, order: 1 };
    expect(plan([row], "en", { vs: 5 }).vs.bandSummary).toBe("5 Questions · 10 Marks");
    // nothing placed yet: the band shows what the blueprint plans
    expect(plan([row], "en", { vs: 0 }).vs.bandSummary).toBe("6 Questions · 12 Marks");
  });

  it("a heading of one ordinary question: its own marks label is enough; the band keeps its instruction", () => {
    const p = plan([{ id: "lg", title: "Section E", type: "LONG", count: 1, marksEach: 5, order: 1 }]);
    expect(p.lg.bandSummary).toBe("");
    expect(p.lg.showBandInstruction).toBe(true);
  });

  it("a mixed heading: runs of several questions get a type sub-band; a grouped question or a lone match does not", () => {
    const p = plan([
      { id: "mcq", title: "Section A", type: "MCQ", count: 4, marksEach: 1, order: 1 },
      { id: "fb", title: "Section A", type: "FILL_BLANK", count: 5, marksEach: 1, order: 2 },
      { id: "tf", title: "Section A", type: "TRUE_FALSE", count: 5, marksEach: 1, order: 3 },
      { id: "m", title: "Section A", type: "MATCH_COLUMN", count: 4, marksEach: 1, order: 4 },
    ]);
    // the band counts what is numbered: 4 MCQs + blanks + true/false + match
    expect(p.mcq).toMatchObject({ showBand: true, bandSummary: "7 Questions · 18 Marks", showTypeSubBand: true });
    expect(p.fb).toMatchObject({ showBand: false, showTypeSubBand: false, grouped: true });
    expect(p.tf).toMatchObject({ showBand: false, showTypeSubBand: false, grouped: true });
    expect(p.m).toMatchObject({ showBand: false, showTypeSubBand: false, grouped: false });
  });

  it("a mixed heading that opens with a grouped question: the band leaves the instruction to that question", () => {
    const p = plan([
      { id: "fb", title: "Section A", type: "FILL_BLANK", count: 5, marksEach: 1, order: 1 },
      { id: "vs", title: "Section A", type: "VERY_SHORT", count: 4, marksEach: 2, order: 2 },
    ]);
    expect(p.fb).toMatchObject({ showBand: true, showBandInstruction: false, showTypeSubBand: false });
    expect(p.vs).toMatchObject({ showBand: false, showTypeSubBand: true });
  });

  it("speaks the paper's language", () => {
    expect(plan([{ id: "s", title: "खण्ड ख", type: "SHORT", count: 6, marksEach: 2, order: 1 }], "hi").s.bandSummary).toBe(
      "6 प्रश्न · 12 अंक",
    );
    expect(plan([{ id: "s", title: "खण्डः च", type: "SHORT", count: 12, marksEach: 2, order: 1 }], "sa").s.bandSummary).toBe(
      "12 प्रश्नाः · 24 अङ्काः",
    );
  });
});
