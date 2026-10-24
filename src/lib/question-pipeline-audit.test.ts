import { describe, expect, it } from "vitest";
import {
  cleanMatchItem,
  cleanOptionText,
  derangeMatchColumnPairs,
  extractColumnIItems,
  extractColumnIIItems,
  getMatchColumnInstruction,
  isMcqLikeType,
  parseMatchColumnPairs,
  serializeMatchColumnPair,
} from "./constants";
import { extractTableFromText } from "./math";
import { parseSubparts, subpartsTotalMarks } from "./types";
import { parseQuestionCsv } from "./batchQuestionIo";

describe("Question Pipeline Deep Audit & Bug Fix Verification", () => {
  describe("MATCH_COLUMN Parsing & Independent Column Separation", () => {
    it("parses independent Column I from text and Column II from options", () => {
      const text =
        "Match the items in Column I with Column II:\nColumn I:\n(A) Photosynthesis\n(B) Respiration\n(C) Transpiration";
      const options = [
        "Loss of water vapor from stomata",
        "Conversion of light energy into chemical energy",
        "Oxidation of glucose to release ATP",
      ];

      const pairs = parseMatchColumnPairs(options, text);
      expect(pairs).toHaveLength(3);
      expect(pairs[0].left).toBe("Photosynthesis");
      expect(pairs[0].right).toBe("Loss of water vapor from stomata");
      expect(pairs[1].left).toBe("Respiration");
      expect(pairs[1].right).toBe("Conversion of light energy into chemical energy");
      expect(pairs[2].left).toBe("Transpiration");
      expect(pairs[2].right).toBe("Oxidation of glucose to release ATP");
    });

    it("parses combined ||| pairs from options", () => {
      const options = [
        "A. Evaporation ||| Cooling effect",
        "B. Boiling ||| Bulk phenomenon",
        "C. Sublimation ||| Direct gas transition",
      ];

      const pairs = parseMatchColumnPairs(options);
      expect(pairs).toHaveLength(3);
      expect(pairs[0].left).toBe("Evaporation");
      expect(pairs[0].right).toBe("Cooling effect");
      expect(pairs[1].left).toBe("Boiling");
      expect(pairs[1].right).toBe("Bulk phenomenon");
      expect(pairs[2].left).toBe("Sublimation");
      expect(pairs[2].right).toBe("Direct gas transition");
    });

    it("parses colon, hyphen, and equals delimited pairs", () => {
      const options = [
        "Mitosis: Equational division",
        "Meiosis - Reductional division",
        "Amitosis = Direct nuclear fission",
      ];

      const pairs = parseMatchColumnPairs(options);
      expect(pairs).toHaveLength(3);
      expect(pairs[0].left).toBe("Mitosis");
      expect(pairs[0].right).toBe("Equational division");
      expect(pairs[1].left).toBe("Meiosis");
      expect(pairs[1].right).toBe("Reductional division");
      expect(pairs[2].left).toBe("Amitosis");
      expect(pairs[2].right).toBe("Direct nuclear fission");
    });

    it("extracts clean instruction from stem text containing Column I items", () => {
      const text =
        "Match the items in Column I with their features in Column II:\nColumn I:\n(A) Item 1\n(B) Item 2";
      const instruction = getMatchColumnInstruction(text);
      expect(instruction).toBe("Match the items in Column I with their features in Column II:");
    });

    it("extracts Column I items with extractColumnIItems", () => {
      const text =
        "Match the following:\nColumn I:\n(A) Acid\n(B) Base\n(C) Salt";
      const col1 = extractColumnIItems(text);
      expect(col1).toEqual(["Acid", "Base", "Salt"]);
    });

    it("extracts Column II items with extractColumnIIItems", () => {
      const text =
        "Match the following:\nColumn I:\n(A) Acid\n(B) Base\nColumn II:\n(i) pH < 7\n(ii) pH > 7";
      const col2 = extractColumnIIItems(text);
      expect(col2).toEqual(["pH < 7", "pH > 7"]);
    });

    it("prioritizes delimited option pairs when question text contains Column I header", () => {
      const text = "Match the following items:\nColumn I:\n(A) Acid\n(B) Base";
      const options = ["Acid :: pH < 7", "Base :: pH > 7"];
      const pairs = parseMatchColumnPairs(options, text);
      expect(pairs).toHaveLength(2);
      expect(pairs[0].left).toBe("Acid");
      expect(pairs[0].right).toBe("pH < 7");
      expect(pairs[1].left).toBe("Base");
      expect(pairs[1].right).toBe("pH > 7");
    });
  });

  describe("Derangement Algorithm (Anti-Leakage Verification)", () => {
    it("strictly ensures no item remains at its original position for N >= 2", () => {
      const pairs = [
        { left: "(A) Item 1", right: "Value 1" },
        { left: "(B) Item 2", right: "Value 2" },
        { left: "(C) Item 3", right: "Value 3" },
        { left: "(D) Item 4", right: "Value 4" },
      ];

      const deranged = derangeMatchColumnPairs(pairs);
      expect(deranged).toHaveLength(4);
      expect(deranged.pairs).toHaveLength(4);
      expect(deranged.answerKey).toContain("(A) →");

      // Verify all items are preserved
      const rightValues = deranged.map((d) => d.right).sort();
      expect(rightValues).toEqual(["Value 1", "Value 2", "Value 3", "Value 4"].sort());

      // Verify mathematical derangement: NO row has its original value
      for (let i = 0; i < pairs.length; i++) {
        expect(deranged[i].right).not.toBe(pairs[i].right);
      }
    });

    it("handles boundary lengths gracefully (0, 1, 2)", () => {
      expect(derangeMatchColumnPairs([])).toHaveLength(0);

      const single = [{ left: "A", right: "1" }];
      expect(derangeMatchColumnPairs(single)).toHaveLength(1);

      const two = [
        { left: "A", right: "1" },
        { left: "B", right: "2" },
      ];
      const derangedTwo = derangeMatchColumnPairs(two);
      expect(derangedTwo[0].right).toBe("2");
      expect(derangedTwo[1].right).toBe("1");
    });
  });

  describe("Subparts Sanitization & Total Marks Calculation", () => {
    it("handles stringified marks gracefully without NaN", () => {
      const rawSubparts = [
        { label: "(i)", text: "Sub 1", marks: "2" as any },
        { label: "(ii)", text: "Sub 2", marks: "1" as any },
      ];
      const parsed = parseSubparts(rawSubparts);
      expect(parsed[0].marks).toBe(2);
      expect(parsed[1].marks).toBe(1);
      expect(subpartsTotalMarks(parsed)).toBe(3);
    });

    it("preserves finite numbers and falls back to 1 mark when marks is missing", () => {
      const rawSubparts = [
        { label: "(i)", text: "Sub 1", marks: 0 },
        { label: "(ii)", text: "Sub 2", marks: 2 },
        { label: "(iii)", text: "Sub 3", marks: undefined as any },
      ];
      const parsed = parseSubparts(rawSubparts);
      expect(parsed[0].marks).toBe(0);
      expect(parsed[1].marks).toBe(2);
      expect(parsed[2].marks).toBe(1);
      expect(subpartsTotalMarks(parsed)).toBe(3);
    });

    it("handles empty or invalid subparts safely", () => {
      expect(parseSubparts(null)).toEqual([]);
      expect(parseSubparts(undefined)).toEqual([]);
      expect(parseSubparts("[]")).toEqual([]);
      expect(parseSubparts("invalid-json")).toEqual([]);
      expect(subpartsTotalMarks([])).toBe(0);
    });
  });

  describe("Subjective Answer Prefix Preservation", () => {
    it("cleans MCQ answer prefixes", () => {
      expect(cleanOptionText("(A) Photosynthesis")).toBe("Photosynthesis");
      expect(cleanOptionText("B) Respiration")).toBe("Respiration");
      expect(cleanOptionText("1. Option text")).toBe("Option text");
    });

    it("preserves numbered steps in subjective model answers", () => {
      const subjectiveAnswer = `1. Balanced Equation: CaO + H2O -> Ca(OH)2 + Heat [1 mark]
2. Type of Reaction: Combination and Exothermic [1 mark]
3. Observation: Beaker becomes vigorously hot [1 mark]`;

      const qType = "SHORT";
      const isMcq = isMcqLikeType(qType);
      const processedAnswer = isMcq ? cleanOptionText(subjectiveAnswer) : subjectiveAnswer.trim();

      // Step 1 MUST NOT have its '1.' stripped!
      expect(processedAnswer.startsWith("1. Balanced Equation:")).toBe(true);
      expect(isMcq).toBe(false);
    });
  });

  describe("Table Extraction from Question Text (Markdown & LaTeX Arrays)", () => {
    it("extracts Markdown tables from question stem", () => {
      const text = `Study the given observation table and answer the following questions:

| Test Tube | Solution | Observation |
| A | Dilute HCl | Effervescence |
| B | Dilute NaOH | No reaction |

Identify the gas evolved in Test Tube A.`;

      const result = extractTableFromText(text);
      expect(result.table).not.toBeNull();
      expect(result.table!.headers).toEqual(["Test Tube", "Solution", "Observation"]);
      expect(result.table!.rows).toHaveLength(2);
      expect(result.table!.rows[0]).toEqual(["A", "Dilute HCl", "Effervescence"]);
      expect(result.table!.rows[1]).toEqual(["B", "Dilute NaOH", "No reaction"]);
      expect(result.prefixText).toContain("Study the given observation table");
      expect(result.suffixText).toContain("Identify the gas evolved in Test Tube A.");
    });

    it("extracts LaTeX array tables from question stem", () => {
      const text = `Given the matrix representations:
$\\begin{array}{ccc}
a_{11} & a_{12} & a_{13} \\\\
a_{21} & a_{22} & a_{23}
\\end{array}$
Find the determinant of the submatrix.`;

      const result = extractTableFromText(text);
      expect(result.table).not.toBeNull();
      expect(result.table!.rows).toHaveLength(2);
      expect(result.table!.rows[0]).toEqual(["a_{11}", "a_{12}", "a_{13}"]);
      expect(result.table!.rows[1]).toEqual(["a_{21}", "a_{22}", "a_{23}"]);
      expect(result.prefixText).toContain("Given the matrix representations:");
      expect(result.suffixText).toContain("Find the determinant of the submatrix.");
    });

    it("returns table as null when no table is present in text", () => {
      const text = "State Archimedes principle and give two practical applications.";
      const result = extractTableFromText(text);
      expect(result.table).toBeNull();
      expect(result.prefixText).toBe(text);
      expect(result.suffixText).toBe("");
    });
  });

  describe("Adversarial Prefix Stripping Defense (Words vs Labels)", () => {
    it("preserves English words followed by colons or hyphens in cleanOptionText", () => {
      expect(cleanOptionText("Observation: Precipitate turns bright yellow")).toBe(
        "Observation: Precipitate turns bright yellow"
      );
      expect(cleanOptionText("Definition: Electric current is the rate of charge flow")).toBe(
        "Definition: Electric current is the rate of charge flow"
      );
      expect(cleanOptionText("Assertion: Velocity is constant in uniform motion")).toBe(
        "Assertion: Velocity is constant in uniform motion"
      );
      expect(cleanOptionText("Reason: Net external force is zero")).toBe(
        "Reason: Net external force is zero"
      );
      expect(cleanOptionText("Reaction: Exothermic with high enthalpy")).toBe(
        "Reaction: Exothermic with high enthalpy"
      );
    });

    it("still cleanly strips legitimate MCQ option labels", () => {
      expect(cleanOptionText("(A) Photosynthesis")).toBe("Photosynthesis");
      expect(cleanOptionText("(iv) Glycolysis")).toBe("Glycolysis");
      expect(cleanOptionText("(viii) Osmosis")).toBe("Osmosis");
      expect(cleanOptionText("A. Mitosis")).toBe("Mitosis");
      expect(cleanOptionText("b) Meiosis")).toBe("Meiosis");
      expect(cleanOptionText("1. Cytokinesis")).toBe("Cytokinesis");
      expect(cleanOptionText("12. Karyokinesis")).toBe("Karyokinesis");
      expect(cleanOptionText("iv: Telophase")).toBe("Telophase");
      expect(cleanOptionText("क. प्रकाश संश्लेषण")).toBe("प्रकाश संश्लेषण");
      expect(cleanOptionText("(क) श्वसन क्रिया")).toBe("श्वसन क्रिया");
    });

    it("preserves 4-letter English words in cleanMatchItem while stripping labels", () => {
      expect(cleanMatchItem("Acid - pH < 7")).toBe("Acid - pH < 7");
      expect(cleanMatchItem("Zinc - alloy component")).toBe("Zinc - alloy component");
      expect(cleanMatchItem("Iron - magnetic element")).toBe("Iron - magnetic element");
      expect(cleanMatchItem("Gold - noble metal")).toBe("Gold - noble metal");
      expect(cleanMatchItem("Lead - heavy metal")).toBe("Lead - heavy metal");

      // Valid labels stripped:
      expect(cleanMatchItem("(A) Acid")).toBe("Acid");
      expect(cleanMatchItem("(iv) pH < 7")).toBe("pH < 7");
      expect(cleanMatchItem("A. Chloroplast")).toBe("Chloroplast");
      expect(cleanMatchItem("1. Mitochondria")).toBe("Mitochondria");
      expect(cleanMatchItem("iv - Ribosome")).toBe("Ribosome");
    });
  });

  describe("Batch Question Import Subparts Parity (UNSEEN_PASSAGE & REFERENCE_CONTEXT)", () => {
    const chapters = [{ id: "c1", number: 1, title: "Comprehension & Context" }];

    it("rejects UNSEEN_PASSAGE when subparts marks sum does not match question marks", () => {
      const csvMismatch = `type,marks,text,answer,chapterNumber,subparts
UNSEEN_PASSAGE,5,"Read the poem and answer:","Ans",1,"[{""label"":""(a)"",""text"":""Theme"",""marks"":1},{""label"":""(b)"",""text"":""Tone"",""marks"":2}]"`;

      const report = parseQuestionCsv(csvMismatch, { bookId: "b1", chapters });
      expect(report.validCount).toBe(0);
      expect(report.errorCount).toBe(1);
      expect(report.errors[0].field).toBe("subparts");
      expect(report.errors[0].error).toContain("Subparts total marks (3) does not match question marks (5)");
    });

    it("auto-populates UNSEEN_PASSAGE marks from subparts sum when marks column is omitted", () => {
      const csvNoMarks = `type,text,answer,chapterNumber,subparts
UNSEEN_PASSAGE,"Read the excerpt:","Ans",1,"[{""label"":""(a)"",""text"":""Part A"",""marks"":2},{""label"":""(b)"",""text"":""Part B"",""marks"":2}]"`;

      const report = parseQuestionCsv(csvNoMarks, { bookId: "b1", chapters });
      expect(report.errorCount).toBe(0);
      expect(report.validCount).toBe(1);
      expect(report.items[0].type).toBe("UNSEEN_PASSAGE");
      expect(report.items[0].marks).toBe(4);
    });

    it("parses valid REFERENCE_CONTEXT with subparts successfully", () => {
      const csvValid = `type,marks,text,answer,chapterNumber,subparts
REFERENCE_CONTEXT,3,"Context quote:","Ans",1,"[{""label"":""(i)"",""text"":""Speaker"",""marks"":1},{""label"":""(ii)"",""text"":""Significance"",""marks"":2}]"`;

      const report = parseQuestionCsv(csvValid, { bookId: "b1", chapters });
      expect(report.errorCount).toBe(0);
      expect(report.validCount).toBe(1);
      expect(report.items[0].type).toBe("REFERENCE_CONTEXT");
      expect(report.items[0].marks).toBe(3);
      expect(report.items[0].subparts).toHaveLength(2);
    });
  });

  describe("Derangement Mapping & Multi-Part Subpart Options Integrity", () => {
    it("strictly deranges matching pairs so no answer is in the same row as its question", () => {
      const basePairs = [
        { left: "(A) Acid", right: "pH < 7" },
        { left: "(B) Base", right: "pH > 7" },
        { left: "(C) Salt", right: "Neutral ionic compound" },
        { left: "(D) Buffer", right: "Resists pH changes" },
      ];

      const deranged = derangeMatchColumnPairs(basePairs);
      expect(deranged.pairs).toHaveLength(4);
      // Confirm strict derangement: no row j has the original answer
      for (let j = 0; j < basePairs.length; j++) {
        expect(deranged.pairs[j].right).not.toBe(basePairs[j].right);
      }
      // Confirm answerKey correctly maps each question to its deranged position
      expect(deranged.answerKey).toBe("(A) → (ii), (B) → (iii), (C) → (iv), (D) → (i)");
    });

    it("parses and preserves subpart MCQ options in parseSubparts", () => {
      const subpartsJson = JSON.stringify([
        {
          label: "(i)",
          text: "Which of the following is an amphoteric oxide?",
          marks: 1,
          options: ["Na2O", "Al2O3", "SO2", "CO2"],
          answer: "(b) Al2O3",
        },
        {
          label: "(ii)",
          text: "Explain with balanced chemical equation.",
          marks: 2,
          answer: "Al2O3 + 6HCl -> 2AlCl3 + 3H2O",
        },
      ]);

      const parsed = parseSubparts(subpartsJson);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].options).toEqual(["Na2O", "Al2O3", "SO2", "CO2"]);
      expect(parsed[0].marks).toBe(1);
      expect(parsed[1].options).toBeUndefined();
      expect(parsed[1].marks).toBe(2);
      expect(subpartsTotalMarks(parsed)).toBe(3);
    });

    it("safely handles legacy saved question records with string marks or missing fields", () => {
      const legacyJson = JSON.stringify([
        { label: "1", text: "Legacy part 1", marks: "2" },
        { text: "Legacy part 2 without label", marks: "3" },
        null,
        "invalid-object",
      ]);

      const parsed = parseSubparts(legacyJson);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].label).toBe("1");
      expect(parsed[0].marks).toBe(2);
      expect(parsed[1].label).toBe("(2)");
      expect(parsed[1].marks).toBe(3);
      expect(subpartsTotalMarks(parsed)).toBe(5);
    });
  });
});



