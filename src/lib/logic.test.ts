import { describe, expect, it } from "vitest";
import { checkBlueprintFeasibility, paperStatus, validateBlueprint, whyCannotAdd, type BlueprintDef } from "./blueprint";
import { bookletPageCount, imposeBooklet, paginate } from "./layout";
import { autoFillPaper, type CandidateQuestion } from "./autofill";

const bp: BlueprintDef = {
  sections: [
    { id: "A", title: "Section A", type: "MCQ", count: 2, marksEach: 1 },
    { id: "B", title: "Section B", type: "SHORT", count: 2, marksEach: 2 },
  ],
  chapters: [
    { chapterId: "c1", marks: 3 },
    { chapterId: "c2", marks: 3 },
  ],
};

describe("validateBlueprint & checkBlueprintFeasibility", () => {
  it("accepts matching totals", () => {
    expect(validateBlueprint(bp)).toEqual([]);
  });
  it("rejects mismatched totals", () => {
    const errs = validateBlueprint({ ...bp, chapters: [{ chapterId: "c1", marks: 5 }] });
    expect(errs.join(" ")).toMatch(/must match/);
  });
  it("rejects empty sections", () => {
    expect(validateBlueprint({ sections: [], chapters: bp.chapters }).length).toBeGreaterThan(0);
  });
  it("flags impossible chapter quota below minimum section denomination", () => {
    const warnings = checkBlueprintFeasibility({
      sections: [{ count: 5, marksEach: 3 }],
      chapters: [{ chapterId: "c1", marks: 2 }, { chapterId: "c2", marks: 13 }],
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/smallest/);
  });
  it("flags chapter quota unreachable by denomination combination", () => {
    const warnings = checkBlueprintFeasibility({
      sections: [{ count: 2, marksEach: 2 }, { count: 2, marksEach: 4 }],
      chapters: [{ chapterId: "c1", marks: 3 }, { chapterId: "c2", marks: 9 }],
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/cannot be formed/);
  });
  it("passes when denominations can form chapter marks", () => {
    const warnings = checkBlueprintFeasibility({
      sections: [{ count: 5, marksEach: 2 }, { count: 5, marksEach: 3 }],
      chapters: [{ chapterId: "c1", marks: 5 }, { chapterId: "c2", marks: 7 }],
    });
    expect(warnings).toEqual([]);
  });
});

describe("whyCannotAdd / paperStatus", () => {
  it("rejects wrong type", () => {
    expect(whyCannotAdd(bp, [], { sectionId: "A", chapterId: "c1", type: "LONG" })).toMatch(/only accepts/);
  });
  it("rejects when section is full", () => {
    const items = [
      { sectionId: "A", chapterId: "c1" },
      { sectionId: "A", chapterId: "c2" },
    ];
    expect(whyCannotAdd(bp, items, { sectionId: "A", chapterId: "c1", type: "MCQ" })).toMatch(/full/);
  });
  it("rejects when chapter quota would be exceeded", () => {
    const items = [{ sectionId: "B", chapterId: "c1" }]; // 2 of 3 used
    expect(whyCannotAdd(bp, items, { sectionId: "B", chapterId: "c1", type: "SHORT" })).toMatch(/only 3 marks/);
  });
  it("rejects chapters not in blueprint", () => {
    expect(whyCannotAdd(bp, [], { sectionId: "A", chapterId: "zz", type: "MCQ" })).toMatch(/not in the blueprint/);
  });
  it("allows a valid question", () => {
    expect(whyCannotAdd(bp, [], { sectionId: "A", chapterId: "c1", type: "MCQ" })).toBeNull();
  });
  it("is complete only when every section and chapter is exactly filled", () => {
    const items = [
      { sectionId: "A", chapterId: "c1" },
      { sectionId: "A", chapterId: "c2" },
      { sectionId: "B", chapterId: "c1" }, // c1 = 3
      { sectionId: "B", chapterId: "c2" }, // c2 = 3
    ];
    expect(paperStatus(bp, items.slice(0, 3)).complete).toBe(false);
    expect(paperStatus(bp, items).complete).toBe(true);
  });
});

describe("paginate", () => {
  it("fills pages greedily", () => {
    expect(paginate([40, 40, 40], [false, false, false], 100)).toEqual([[0, 1], [2]]);
  });
  it("keeps a heading with the next block", () => {
    // heading(10, keepWithNext) + q(50) does not fit after 60 used -> both move together
    expect(paginate([60, 10, 50], [false, true, false], 100)).toEqual([[0], [1, 2]]);
  });
  it("gives an oversized unit its own page without looping", () => {
    expect(paginate([10, 500, 10], [false, false, false], 100)).toEqual([[0], [1], [2]]);
  });
  it("handles no blocks", () => {
    expect(paginate([], [], 100)).toEqual([]);
  });
  it("glues passage stem with first subpart so stem is never orphaned alone", () => {
    // pageHeight = 100
    // header: 50px
    // passage stem: 40px (keepWithNext = true)
    // subpart 0: 20px (keepWithNext = false)
    // subpart 1: 20px (keepWithNext = false)
    // At page 1: header(50) + stem(40) + sp0(20) = 110 > 100.
    // Because stem has keepWithNext=true, stem and sp0 are glued and move to page 2 together.
    const heights = [50, 40, 20, 20];
    const keepWithNext = [false, true, false, false];
    const groupIds = [null, "passage-1", "passage-1", "passage-1"];
    const result = paginate(heights, keepWithNext, 100, groupIds);
    expect(result).toEqual([[0], [1, 2, 3]]);
  });
  it("splits subparts across pages and factors continuation header reservation", () => {
    // pageHeight = 100
    // header: 20px
    // stem: 40px (keepWithNext = true)
    // sp0: 30px (keepWithNext = false) -> total on page 1 = 90px <= 100px. Fits on page 1!
    // sp1: 20px (groupId: "passage-1") -> moves to page 2.
    // On page 2, continuation extra (24px) is reserved, so sp1 uses 20 + 24 = 44px.
    const heights = [20, 40, 30, 20];
    const keepWithNext = [false, true, false, false];
    const groupIds = [null, "passage-1", "passage-1", "passage-1"];
    const result = paginate(heights, keepWithNext, 100, groupIds);
    expect(result).toEqual([[0, 1, 2], [3]]);
  });
});

describe("imposeBooklet", () => {
  it("pads to multiples of 4, min 4", () => {
    expect(bookletPageCount(1)).toBe(4);
    expect(bookletPageCount(4)).toBe(4);
    expect(bookletPageCount(5)).toBe(8);
  });
  it("4 pages: one sheet", () => {
    expect(imposeBooklet(4)).toEqual([{ front: [3, 0], back: [1, 2] }]);
  });
  it("8 pages: two sheets", () => {
    expect(imposeBooklet(8)).toEqual([
      { front: [7, 0], back: [1, 6] },
      { front: [5, 2], back: [3, 4] },
    ]);
  });
  it("pads missing pages as blank (null) at the end", () => {
    expect(imposeBooklet(3)).toEqual([{ front: [null, 0], back: [1, 2] }]);
  });
  it("places every real page exactly once", () => {
    for (const n of [1, 2, 5, 9, 12]) {
      const placed = imposeBooklet(n)
        .flatMap((s) => [...s.front, ...s.back])
        .filter((p): p is number => p !== null)
        .sort((a, b) => a - b);
      expect(placed).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });
});

describe("autoFillPaper", () => {
  const pool: CandidateQuestion[] = [
    { id: "q1", chapterId: "c1", type: "MCQ" },
    { id: "q2", chapterId: "c1", type: "SHORT" },
    { id: "q3", chapterId: "c2", type: "MCQ" },
    { id: "q4", chapterId: "c2", type: "MCQ" },
    { id: "q5", chapterId: "c2", type: "SHORT" },
  ];

  it("completely fills an empty paper when candidates satisfy blueprint", () => {
    const res = autoFillPaper(bp, [], pool);
    expect(res.complete).toBe(true);
    expect(res.added.length).toBe(4);
    expect(res.unfilled).toEqual([]);

    // Check with paperStatus to guarantee 100% compliance
    const status = paperStatus(
      bp,
      res.added.map((a) => ({ sectionId: a.sectionId, chapterId: a.chapterId })),
    );
    expect(status.complete).toBe(true);
    expect(status.usedMarks).toBe(status.totalMarks);
  });

  it("fills only remaining slots when paper is partially filled", () => {
    const existing = [{ sectionId: "A", chapterId: "c1", questionId: "q1" }];
    const res = autoFillPaper(bp, existing, pool);
    expect(res.complete).toBe(true);
    expect(res.added.length).toBe(3);
    // Should not reuse q1
    expect(res.added.some((a) => a.questionId === "q1")).toBe(false);

    const allItems = [
      ...existing,
      ...res.added.map((a) => ({ sectionId: a.sectionId, chapterId: a.chapterId, questionId: a.questionId })),
    ];
    const status = paperStatus(bp, allItems);
    expect(status.complete).toBe(true);
  });

  it("handles missing candidates gracefully without violating blueprint", () => {
    // Only MCQs in pool, no SHORT questions
    const mcqOnly: CandidateQuestion[] = [
      { id: "q1", chapterId: "c1", type: "MCQ" },
      { id: "q3", chapterId: "c2", type: "MCQ" },
    ];
    const res = autoFillPaper(bp, [], mcqOnly);
    expect(res.complete).toBe(false);
    expect(res.added.length).toBe(2);
    expect(res.unfilled.find((u) => u.sectionId === "B")?.count).toBe(2);
  });

  it("returns immediately if paper is already complete", () => {
    const full = [
      { sectionId: "A", chapterId: "c1", questionId: "q1" },
      { sectionId: "A", chapterId: "c2", questionId: "q3" },
      { sectionId: "B", chapterId: "c1", questionId: "q2" },
      { sectionId: "B", chapterId: "c2", questionId: "q5" },
    ];
    const res = autoFillPaper(bp, full, pool);
    expect(res.complete).toBe(true);
    expect(res.added.length).toBe(0);
    expect(res.unfilled).toEqual([]);
  });
});

describe("parseMathSegments", () => {
  it("returns single text segment when no math is present", async () => {
    const { parseMathSegments } = await import("./math");
    const segments = parseMathSegments("Explain the law of gravitation.");
    expect(segments).toEqual([{ type: "text", text: "Explain the law of gravitation." }]);
  });

  it("parses inline math ($...$)", async () => {
    const { parseMathSegments } = await import("./math");
    const segments = parseMathSegments("Calculate $E = mc^2$ for 1kg mass.");
    expect(segments.length).toBe(3);
    expect(segments[0]).toEqual({ type: "text", text: "Calculate " });
    expect(segments[1].type).toBe("math");
    if (segments[1].type === "math") {
      expect(segments[1].tex).toBe("E = mc^2");
      expect(segments[1].display).toBe(false);
      expect(segments[1].html).toContain("katex");
    }
    expect(segments[2]).toEqual({ type: "text", text: " for 1kg mass." });
  });

  it("parses display block math ($$...$$)", async () => {
    const { parseMathSegments } = await import("./math");
    const segments = parseMathSegments("Solve the integral: $$\\int_0^1 x dx$$");
    expect(segments.length).toBe(2);
    expect(segments[0]).toEqual({ type: "text", text: "Solve the integral: " });
    expect(segments[1].type).toBe("math");
    if (segments[1].type === "math") {
      expect(segments[1].tex).toBe("\\int_0^1 x dx");
      expect(segments[1].display).toBe(true);
      expect(segments[1].html).toContain("katex-display");
    }
  });

  it("parses natural integral questions without raw carets", async () => {
    const { parseMathSegments } = await import("./math");
    const segments = parseMathSegments("The value of ∫ e^x [f(x) + f'(x)] dx is equal to:");
    expect(segments.length).toBe(3);
    expect(segments[0]).toEqual({ type: "text", text: "The value of " });
    expect(segments[1].type).toBe("math");
    if (segments[1].type === "math") {
      expect(segments[1].tex).toContain("\\int");
      expect(segments[1].tex).toContain("e^{x}");
      expect(segments[1].tex).not.toContain("e^x ");
      expect(segments[1].html).toContain("katex");
    }
    expect(segments[2]).toEqual({ type: "text", text: " is equal to:" });
  });

  it("parses standalone math options and short formulas cleanly", async () => {
    const { parseMathSegments } = await import("./math");
    const opt1 = parseMathSegments("e^x f(x) + C");
    expect(opt1.length).toBe(1);
    expect(opt1[0].type).toBe("math");
    if (opt1[0].type === "math") {
      expect(opt1[0].tex).toBe("e^{x} f(x) + C");
      expect(opt1[0].html).toContain("katex");
    }

    const opt2 = parseMathSegments("e^(-x)");
    expect(opt2.length).toBe(1);
    expect(opt2[0].type).toBe("math");
    if (opt2[0].type === "math") {
      expect(opt2[0].tex).toBe("e^{-x}");
      expect(opt2[0].html).toContain("katex");
    }

    const opt3 = parseMathSegments("y^(3/2)");
    expect(opt3.length).toBe(1);
    expect(opt3[0].type).toBe("math");
    if (opt3[0].type === "math") {
      expect(opt3[0].tex).toBe("y^{3/2}");
    }

    const proseOpt = parseMathSegments("Skew-symmetric matrix");
    expect(proseOpt.length).toBe(1);
    expect(proseOpt[0].type).toBe("text");
    expect(proseOpt[0]).toEqual({ type: "text", text: "Skew-symmetric matrix" });
  });

  it("parses inline caret exponents in differential equation questions", async () => {
    const { parseMathSegments } = await import("./math");
    const segments = parseMathSegments("The integrating factor of the differential equation dy/dx + y = e^(-x) is:");
    expect(segments.length).toBe(3);
    expect(segments[0]).toEqual({ type: "text", text: "The integrating factor of the differential equation dy/dx + y = " });
    expect(segments[1].type).toBe("math");
    if (segments[1].type === "math") {
      expect(segments[1].tex).toBe("e^{-x}");
      expect(segments[1].html).toContain("katex");
    }
    expect(segments[2]).toEqual({ type: "text", text: " is:" });
  });

  it("formats Word (.docx) TextRuns with true superscripts without carets", async () => {
    const { formatMathTextRuns } = await import("./docxMath");
    const runs = formatMathTextRuns("The value of ∫ e^x [f(x) + f'(x)] dx is equal to:");
    expect(runs.length).toBeGreaterThan(1);
    // Ensure no raw ^ character exists in any run
    for (const r of runs) {
      // docx stores text in root[1].root[1] or similar
      const rawRunJson = JSON.stringify(r);
      expect(rawRunJson).not.toContain('"^"');
    }

    const expRuns = formatMathTextRuns("e^(-x)");
    const expJson = JSON.stringify(expRuns);
    expect(expJson).toContain("superscript");
    expect(expJson).toContain("-x");
    expect(expJson).not.toContain("^");
  });
});

describe("multiset helpers", () => {
  it("computes nextSetIdentifier correctly", async () => {
    const { nextSetIdentifier } = await import("./multiset");
    expect(nextSetIdentifier("SET A")).toBe("SET B");
    expect(nextSetIdentifier("Set B")).toBe("SET C");
    expect(nextSetIdentifier("A")).toBe("B");
    expect(nextSetIdentifier("SET 1")).toBe("SET 2");
    expect(nextSetIdentifier("1")).toBe("2");
    expect(nextSetIdentifier("")).toBe("SET B");
  });

  it("permutes MCQ options while correctly recalculating the answer index", async () => {
    const { permuteMcqOptions } = await import("./multiset");
    const options = ["Mercury", "Venus", "Earth", "Mars"];
    // Venus is at index 1 -> 'B'
    const res = permuteMcqOptions(options, "B");
    expect(res.options.length).toBe(4);
    expect([...res.options].sort()).toEqual([...options].sort());
    // The new answer letter must point to 'Venus' in res.options
    const LETTERS = "ABCDEF";
    const newIdx = LETTERS.indexOf(res.answer);
    expect(res.options[newIdx]).toBe("Venus");
  });
});

describe("parseBulkQuestions", () => {
  it("parses multiple questions separated by ---", async () => {
    const { parseBulkQuestions } = await import("./bulkImport");
    const raw = `
Type: MCQ
Q: What is the SI unit of force?
A: Joule
B: Newton
C: Pascal
D: Watt
Ans: B
Diff: EASY

---

Type: SHORT
Q: Define inertia and give one real-life example.
Ans: Inertia is the tendency of a body to resist changes in its state of motion.
Space: 25
Diff: MEDIUM
`;
    const parsed = parseBulkQuestions(raw);
    expect(parsed.length).toBe(2);

    expect(parsed[0].type).toBe("MCQ");
    expect(parsed[0].text).toBe("What is the SI unit of force?");
    expect(parsed[0].options).toEqual(["Joule", "Newton", "Pascal", "Watt"]);
    expect(parsed[0].answer).toBe("B");
    expect(parsed[0].difficulty).toBe("EASY");

    expect(parsed[1].type).toBe("SHORT");
    expect(parsed[1].text).toBe("Define inertia and give one real-life example.");
    expect(parsed[1].answer).toContain("Inertia is the tendency");
    expect(parsed[1].spaceMm).toBe(25);
    expect(parsed[1].difficulty).toBe("MEDIUM");
  });

  it("handles empty or whitespace raw input gracefully", async () => {
    const { parseBulkQuestions } = await import("./bulkImport");
    expect(parseBulkQuestions("")).toEqual([]);
    expect(parseBulkQuestions("   \n\n  ")).toEqual([]);
  });
});

describe("booklet layout and school branding constants", () => {
  it("recognizes BOOKLET_A4 and BOOKLET as booklet layouts", async () => {
    const { isBookletLayout, LAYOUTS, LAYOUT_LABEL, DEFAULT_SCHOOL_NAME } = await import("./constants");
    expect(LAYOUTS).toContain("BOOKLET_A4");
    expect(LAYOUTS).toContain("BOOKLET");
    expect(LAYOUTS).toContain("PAGE");

    expect(isBookletLayout("BOOKLET_A4")).toBe(true);
    expect(isBookletLayout("BOOKLET")).toBe(true);
    expect(isBookletLayout("PAGE")).toBe(false);
    expect(isBookletLayout(null)).toBe(false);
    expect(isBookletLayout(undefined)).toBe(false);

    expect(LAYOUT_LABEL.BOOKLET_A4).toContain("A4 sheets folded to A5");
    expect(LAYOUT_LABEL.BOOKLET).toContain("A3 sheets folded to A4");

    expect(DEFAULT_SCHOOL_NAME).toBe("Sarvodaya English Higher Secondary School, Lakhnadon");
  });
});

describe("diagnosePaperImplications", () => {
  const sampleBp = {
    sections: [
      { id: "sec-a", title: "Section A", type: "MCQ", count: 3, marksEach: 1 },
      { id: "sec-b", title: "Section B", type: "SHORT", count: 2, marksEach: 2 },
    ],
    chapters: [
      { chapterId: "ch1", title: "Chapter 1", marks: 3 },
      { chapterId: "ch2", title: "Chapter 2", marks: 4 },
    ],
  };

  it("returns no implications when paper perfectly matches blueprint quotas and types", async () => {
    const { diagnosePaperImplications } = await import("./blueprint");
    const perfectItems = [
      { id: "1", sectionId: "sec-a", chapterId: "ch1", type: "MCQ" },
      { id: "2", sectionId: "sec-a", chapterId: "ch1", type: "MCQ" },
      { id: "3", sectionId: "sec-a", chapterId: "ch1", type: "MCQ" },
      { id: "4", sectionId: "sec-b", chapterId: "ch2", type: "SHORT" },
      { id: "5", sectionId: "sec-b", chapterId: "ch2", type: "SHORT" },
    ];
    const imps = diagnosePaperImplications(sampleBp, perfectItems);
    expect(imps).toEqual([]);
  });

  it("detects underfilled sections and chapter deficits", async () => {
    const { diagnosePaperImplications } = await import("./blueprint");
    // Only 1 item in sec-a (needs 3)
    const items = [
      { id: "1", sectionId: "sec-a", chapterId: "ch1", type: "MCQ" },
    ];
    const imps = diagnosePaperImplications(sampleBp, items);
    const underfilled = imps.find((i) => i.code === "SECTION_UNDERFILLED" && i.sectionId === "sec-a");
    expect(underfilled).toBeDefined();
    expect(underfilled?.details?.missing).toBe(2);

    const deficit = imps.find((i) => i.code === "CHAPTER_DEFICIT" && i.chapterId === "ch1");
    expect(deficit).toBeDefined();
    expect(deficit?.details?.deficit).toBe(2);
  });

  it("detects overfilled sections when quota is reduced", async () => {
    const { diagnosePaperImplications } = await import("./blueprint");
    // 4 items in sec-a (blueprint only allows 3)
    const items = [
      { id: "1", sectionId: "sec-a", chapterId: "ch1", type: "MCQ" },
      { id: "2", sectionId: "sec-a", chapterId: "ch1", type: "MCQ" },
      { id: "3", sectionId: "sec-a", chapterId: "ch1", type: "MCQ" },
      { id: "4", sectionId: "sec-a", chapterId: "ch1", type: "MCQ" },
    ];
    const imps = diagnosePaperImplications(sampleBp, items);
    const overfilled = imps.find((i) => i.code === "SECTION_OVERFILLED" && i.sectionId === "sec-a");
    expect(overfilled).toBeDefined();
    expect(overfilled?.details?.excess).toBe(1);
    expect(overfilled?.severity).toBe("error");
  });

  it("detects question type mismatch when section question type changed", async () => {
    const { diagnosePaperImplications } = await import("./blueprint");
    // Question placed has type "LONG" but section requires "MCQ"
    const items = [
      { id: "1", sectionId: "sec-a", chapterId: "ch1", type: "LONG", text: "Explain Newton's third law" },
    ];
    const imps = diagnosePaperImplications(sampleBp, items);
    const mismatch = imps.find((i) => i.code === "TYPE_MISMATCH");
    expect(mismatch).toBeDefined();
    expect(mismatch?.details?.expectedType).toBe("MCQ");
    expect(mismatch?.details?.actualType).toBe("LONG");
  });

  it("detects chapter excess when placed marks exceed quota", async () => {
    const { diagnosePaperImplications } = await import("./blueprint");
    // 3 items in sec-b (each 2 marks = 6 marks) for ch1 (quota is 3 marks)
    const items = [
      { id: "1", sectionId: "sec-b", chapterId: "ch1", type: "SHORT" },
      { id: "2", sectionId: "sec-b", chapterId: "ch1", type: "SHORT" },
      { id: "3", sectionId: "sec-b", chapterId: "ch1", type: "SHORT" },
    ];
    const imps = diagnosePaperImplications(sampleBp, items);
    const excess = imps.find((i) => i.code === "CHAPTER_EXCESS" && i.chapterId === "ch1");
    expect(excess).toBeDefined();
    expect(excess?.details?.excess).toBe(3);
  });

  it("detects orphaned questions from deleted sections", async () => {
    const { diagnosePaperImplications } = await import("./blueprint");
    const items = [
      { id: "1", sectionId: "sec-deleted-99", chapterId: "ch1", type: "MCQ" },
    ];
    const imps = diagnosePaperImplications(sampleBp, items);
    const orphaned = imps.find((i) => i.code === "ORPHANED_SECTION");
    expect(orphaned).toBeDefined();
  });
});

