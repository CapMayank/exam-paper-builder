import { describe, expect, it } from "vitest";
import { decomposeStemSubparts, detectAttemptCount } from "./subpartExtractor";

describe("subpartExtractor", () => {
  it("correctly decomposes Sanskrit Question 32 with 5 subparts and attemptCount 4", () => {
    const rawText =
      "अधोलिखितेषु वाक्येषु केषाञ्चित् चतुर्णां वाक्यानां शुद्धं कुरुत - (क) ग्रामम् अभीतः वृक्षाः सन्ति। (ख) नमः शिवायः। (ग) पिता पुत्राय क्रुध्यति। (घ) बालिका पद्येन पठति। (ङ) सः पुस्तकानि पश्यति।";

    const result = decomposeStemSubparts(rawText);
    expect(result).not.toBeNull();
    expect(result!.stem).toBe("अधोलिखितेषु वाक्येषु केषाञ्चित् चतुर्णां वाक्यानां शुद्धं कुरुत -");
    expect(result!.attemptCount).toBe(4);
    expect(result!.subparts).toHaveLength(5);
    expect(result!.subparts[0].label).toBe("(क)");
    expect(result!.subparts[0].text).toBe("ग्रामम् अभीतः वृक्षाः सन्ति।");
    expect(result!.subparts[1].label).toBe("(ख)");
    expect(result!.subparts[1].text).toBe("नमः शिवायः।");
    expect(result!.subparts[2].label).toBe("(ग)");
    expect(result!.subparts[2].text).toBe("पिता पुत्राय क्रुध्यति।");
    expect(result!.subparts[3].label).toBe("(घ)");
    expect(result!.subparts[3].text).toBe("बालिका पद्येन पठति।");
    expect(result!.subparts[4].label).toBe("(ङ)");
    expect(result!.subparts[4].text).toBe("सः पुस्तकानि पश्यति।");
  });

  it("correctly decomposes English subparts with attemptCount", () => {
    const text =
      "Answer any two of the following questions:\n(a) What is refraction of light?\n(b) State Snell's law.\n(c) Define optical density.";

    const result = decomposeStemSubparts(text);
    expect(result).not.toBeNull();
    expect(result!.stem).toBe("Answer any two of the following questions:");
    expect(result!.attemptCount).toBe(2);
    expect(result!.subparts).toHaveLength(3);
    expect(result!.subparts[0].label).toBe("(a)");
    expect(result!.subparts[0].text).toBe("What is refraction of light?");
    expect(result!.subparts[1].label).toBe("(b)");
    expect(result!.subparts[2].label).toBe("(c)");
  });

  it("correctly decomposes Roman numeral subparts", () => {
    const text = "Differentiate between: (i) Homogeneous mixtures (ii) Heterogeneous mixtures.";

    const result = decomposeStemSubparts(text);
    expect(result).not.toBeNull();
    expect(result!.stem).toBe("Differentiate between:");
    expect(result!.subparts).toHaveLength(2);
    expect(result!.subparts[0].label).toBe("(i)");
    expect(result!.subparts[0].text).toBe("Homogeneous mixtures");
    expect(result!.subparts[1].label).toBe("(ii)");
    expect(result!.subparts[1].text).toBe("Heterogeneous mixtures.");
  });

  describe("Safety Constraints - Rejecting False Positives", () => {
    it("never decomposes chemical formulas", () => {
      const chemText = "When Ca(OH)2 is added to (NH4)2SO4 in aqueous solution, a pungent gas is evolved.";
      const result = decomposeStemSubparts(chemText);
      expect(result).toBeNull();
    });

    it("never decomposes LaTeX mathematical expressions", () => {
      const mathText = "Find the roots of $(x + 1)(x - 2) = 0$ where $x \\in \\mathbb{R}$.";
      const result = decomposeStemSubparts(mathText);
      expect(result).toBeNull();
    });

    it("never decomposes inline mathematical formulas", () => {
      const mathText = "Evaluate the polynomial (a + b)^2 and verify that (a - b)^2 equals a^2 - 2ab + b^2.";
      const result = decomposeStemSubparts(mathText);
      expect(result).toBeNull();
    });

    it("never decomposes ordinary prose with parenthetical comments", () => {
      const prose = "The author visited Oxford (see chapter 2) and completed his degree (in 1995).";
      const result = decomposeStemSubparts(prose);
      expect(result).toBeNull();
    });

    it("never decomposes out-of-order labels", () => {
      const broken = "Answer: (a) First point (c) Third point";
      const result = decomposeStemSubparts(broken);
      expect(result).toBeNull();
    });

    it("preserves existing subparts without touching them", () => {
      const existing = [
        { label: "(1)", text: "Existing part", marks: 2 },
      ];
      const result = decomposeStemSubparts("Some text (a) one (b) two", existing);
      expect(result).toBeNull();
    });
  });

  describe("detectAttemptCount", () => {
    it("detects Sanskrit numbers", () => {
      expect(detectAttemptCount("केषाञ्चित् चतुर्णां वाक्यानां शुद्धं कुरुत")).toBe(4);
      expect(detectAttemptCount("केषाञ्चित् त्रयाणां प्रश्नानां उत्तराणि लिखत")).toBe(3);
      expect(detectAttemptCount("द्वयोः वाक्ययोः वाच्यपरिवर्तनं कुरुत")).toBe(2);
    });

    it("detects Hindi numbers", () => {
      expect(detectAttemptCount("किन्हीं चार वाक्यों को शुद्ध कीजिए")).toBe(4);
      expect(detectAttemptCount("किन्हीं 3 प्रश्नों के उत्तर दीजिए")).toBe(3);
    });

    it("detects English numbers", () => {
      expect(detectAttemptCount("Answer any 4 of the following questions")).toBe(4);
      expect(detectAttemptCount("Attempt any three parts")).toBe(3);
    });
  });
});
