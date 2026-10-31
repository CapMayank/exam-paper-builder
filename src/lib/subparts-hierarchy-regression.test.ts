import { describe, expect, it } from "vitest";
import { toQuestionDto } from "./dto";
import {
  normalizeSubpartMarks,
  parseSubparts,
  parseSubpartsPayload,
  subpartsTotalMarks,
  validateSubPartsSum,
  type SubPart,
} from "./types";
import { decomposeStemSubparts } from "./subpartExtractor";

describe("Subparts Hierarchy, Nested Structures & Attempt Count Regression", () => {
  it("Requirement 1 & 7: Supports subparts on any question type (LONG, SHORT, GRAMMAR, etc.) in toQuestionDto", () => {
    const rawLongQ = {
      id: "q-long-subparts",
      bookId: "b1",
      chapterId: "c1",
      type: "LONG",
      text: "Answer the following multi-part questions:",
      optionsJson: "[]",
      subpartsJson: JSON.stringify([
        { label: "(a)", text: "Derive the quadratic formula.", marks: 3 },
        { label: "(b)", text: "Hence solve $2x^2 + 5x - 3 = 0$.", marks: 2 },
      ]),
      answer: "Complete derivation and roots $x = 1/2, -3$.",
      difficulty: "HARD",
      imagePath: null,
      spaceMm: 0,
      showGrid: false,
      createdById: "u1",
      createdAt: new Date(),
    };

    const dto = toQuestionDto(rawLongQ);
    expect(dto.subparts).toHaveLength(2);
    expect(dto.subparts[0].label).toBe("(a)");
    expect(dto.subparts[0].marks).toBe(3);
    expect(dto.subparts[1].label).toBe("(b)");
    expect(dto.subparts[1].marks).toBe(2);
  });

  it("Requirement 1 & 6: Recursively parses and calculates marks for Level-2 nested subparts", () => {
    const nestedSubpartsJson = JSON.stringify([
      {
        label: "(a)",
        text: "Solve the linear equations:",
        marks: 2,
        subparts: [
          { label: "(i)", text: "$x + y = 5$", marks: 1 },
          { label: "(ii)", text: "$2x - y = 4$", marks: 1 },
        ],
      },
      {
        label: "(b)",
        text: "Find the coordinates of the vertex of the parabola $y = x^2 - 4x + 3$.",
        marks: 3,
      },
    ]);

    const parsed = parseSubparts(nestedSubpartsJson);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].subparts).toBeDefined();
    expect(parsed[0].subparts).toHaveLength(2);
    expect(parsed[0].subparts![0].label).toBe("(i)");
    expect(parsed[0].subparts![1].label).toBe("(ii)");

    // subpartsTotalMarks should sum leaf marks (1 + 1 + 3 = 5)
    const total = subpartsTotalMarks(parsed);
    expect(total).toBe(5);
  });

  it("Requirement 4: Supports attemptCount for 'Answer any 4 of 5' without introducing fractional marks", () => {
    const fiveSubparts: SubPart[] = [
      { label: "(क)", text: "ग्रामम् अभीतः वृक्षाः सन्ति।", marks: 1 },
      { label: "(ख)", text: "नमः शिवायः।", marks: 1 },
      { label: "(ग)", text: "पिता पुत्राय क्रुध्यति।", marks: 1 },
      { label: "(घ)", text: "बालिका पद्येन पठति।", marks: 1 },
      { label: "(ङ)", text: "सः पुस्तकानि पश्यति।", marks: 1 },
    ];

    // Total target marks is 4, but 5 subparts are provided (1 mark each)
    const isValid = validateSubPartsSum(fiveSubparts, 4, 4);
    expect(isValid).toBe(true);

    // normalizeSubpartMarks must NOT scale 1 mark to 0.8 mark!
    const normalized = normalizeSubpartMarks(fiveSubparts, 4, 4);
    expect(normalized).toHaveLength(5);
    expect(normalized[0].marks).toBe(1);
    expect(normalized[1].marks).toBe(1);
    expect(normalized[2].marks).toBe(1);
    expect(normalized[3].marks).toBe(1);
    expect(normalized[4].marks).toBe(1);
  });

  it("Requirement 4 & 7: parseSubpartsPayload handles both arrays and objects with attemptCount", () => {
    const payloadObj = {
      attemptCount: 4,
      subparts: [
        { label: "(1)", text: "Item 1", marks: 1 },
        { label: "(2)", text: "Item 2", marks: 1 },
      ],
    };

    const res = parseSubpartsPayload(JSON.stringify(payloadObj));
    expect(res.attemptCount).toBe(4);
    expect(res.subparts).toHaveLength(2);

    const legacyArr = [
      { label: "(1)", text: "Item 1", marks: 1 },
    ];
    const resArr = parseSubpartsPayload(JSON.stringify(legacyArr));
    expect(resArr.attemptCount).toBeUndefined();
    expect(resArr.subparts).toHaveLength(1);
  });

  it("Requirement 2 & 9: Sanskrit Question 32 fixture extraction and non-destructive legacy rendering", () => {
    const q32Raw =
      "अधोलिखितेषु वाक्येषु केषाञ्चित् चतुर्णां वाक्यानां शुद्धं कुरुत - (क) ग्रामम् अभीतः वृक्षाः सन्ति। (ख) नमः शिवायः। (ग) पिता पुत्राय क्रुध्यति। (घ) बालिका पद्येन पठति। (ङ) सः पुस्तकानि पश्यति।";

    const decomp = decomposeStemSubparts(q32Raw);
    expect(decomp).not.toBeNull();
    expect(decomp!.stem).toBe("अधोलिखितेषु वाक्येषु केषाञ्चित् चतुर्णां वाक्यानां शुद्धं कुरुत -");
    expect(decomp!.attemptCount).toBe(4);
    expect(decomp!.subparts).toHaveLength(5);
    expect(decomp!.subparts.map((s) => s.label)).toEqual(["(क)", "(ख)", "(ग)", "(घ)", "(ङ)"]);

    // Verify marks remain whole integer 1
    const balanced = normalizeSubpartMarks(decomp!.subparts, 4, decomp!.attemptCount);
    expect(balanced.every((s) => s.marks === 1)).toBe(true);
  });

  it("Requirement 6: OR alternative questions can independently contain subparts without affecting primary question", () => {
    const primarySubparts: SubPart[] = [
      { label: "(a)", text: "Explain phenomenon A.", marks: 2 },
      { label: "(b)", text: "State two applications.", marks: 2 },
    ];
    const orSubparts: SubPart[] = [
      { label: "(a)", text: "Explain phenomenon B.", marks: 2 },
      { label: "(b)", text: "State two limitations.", marks: 2 },
    ];

    expect(validateSubPartsSum(primarySubparts, 4)).toBe(true);
    expect(validateSubPartsSum(orSubparts, 4)).toBe(true);
  });
});
