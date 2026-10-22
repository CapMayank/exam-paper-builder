import { describe, expect, it } from "vitest";
import {
  findEligibleDiagrams,
  searchCuratedDiagrams,
  verifyDiagramEligibility,
} from "./diagram-search";

describe("Curated Educational Diagram & Eligibility Verification Suite", () => {
  describe("searchCuratedDiagrams", () => {
    it("finds flower L.S. diagram for reproduction in flowering plants", () => {
      const results = searchCuratedDiagrams({
        subject: "Biology",
        chapter: "Sexual Reproduction in Flowering Plants",
        query: "flower parts stigma ovary",
      });

      expect(results.length).toBeGreaterThan(0);
      const first = results[0];
      expect(first.id).toBe("bio_flower_ls_callouts");
      expect(first.title).toContain("Longitudinal Section");
      expect(first.source).toBe("NCERT Curated");
      expect(first.hasUnlabelledCallouts).toBe(true);
      expect(first.svgContent).toContain("<svg");
      expect(first.eligibility.eligible).toBe(true);
      expect(first.eligibility.score).toBeGreaterThanOrEqual(90);
    });

    it("finds human nephron structure diagram for excretion", () => {
      const results = searchCuratedDiagrams({
        subject: "Biology",
        chapter: "Life Processes",
        query: "nephron structure bowman glomerulus",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("bio_nephron_structure_callouts");
      expect(results[0].hasUnlabelledCallouts).toBe(true);
    });

    it("finds glass prism refraction diagram for physics optics", () => {
      const results = searchCuratedDiagrams({
        subject: "Physics",
        chapter: "The Human Eye and the Colourful World",
        query: "glass prism refraction angle of deviation",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("phys_glass_prism_refraction");
      expect(results[0].subject).toBe("Physics");
    });

    it("finds electrolysis of water diagram for chemistry", () => {
      const results = searchCuratedDiagrams({
        subject: "Chemistry",
        chapter: "Chemical Reactions and Equations",
        query: "electrolysis of water anode cathode hydrogen oxygen",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("chem_electrolysis_of_water");
      expect(results[0].subject).toBe("Chemistry");
    });
  });

  describe("verifyDiagramEligibility", () => {
    it("approves curated diagrams with unlabelled callouts for identification questions", () => {
      const eligibility = verifyDiagramEligibility(
        {
          title: "Flower L.S. with Parts A, B, C, D",
          subject: "Biology",
          hasUnlabelledCallouts: true,
          isCurated: true,
        },
        {
          questionText: "In the given diagram, identify labeled parts (A) and (B):",
          chapterTitle: "Sexual Reproduction in Flowering Plants",
          subject: "Biology",
          isIdentificationQuestion: true,
        },
      );

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.hasSpoilers).toBe(false);
      expect(eligibility.printContrast).toBe("HIGH");
      expect(eligibility.status).toBe("VERIFIED");
    });

    it("flags diagrams containing plain text answer labels for identification questions as needing masking", () => {
      const eligibility = verifyDiagramEligibility(
        {
          title: "Flower Anatomy Diagram",
          subject: "Biology",
          hasUnlabelledCallouts: false,
          spoilerParts: ["Stigma", "Anther", "Ovary"],
          isCurated: false,
        },
        {
          questionText: "Identify the parts marked in the diagram below:",
          isIdentificationQuestion: true,
        },
      );

      expect(eligibility.hasSpoilers).toBe(true);
      expect(eligibility.status).toBe("NEEDS_MASKING");
      expect(eligibility.reason).toContain("Open in Figure Studio to mask");
    });

    it("penalizes non-SVG/PNG photographic files for B&W exam printing", () => {
      const eligibility = verifyDiagramEligibility({
        title: "Microscope specimen photo",
        mime: "image/jpeg",
        isCurated: false,
      });

      expect(eligibility.printContrast).toBe("LOW");
      expect(eligibility.score).toBeLessThan(60);
    });
  });

  describe("findEligibleDiagrams integration", () => {
    it("returns eligible curated diagrams first for core syllabus topics", async () => {
      const candidates = await findEligibleDiagrams({
        query: "flower cross section",
        subject: "Biology",
        chapter: "Sexual Reproduction in Flowering Plants",
        requireUnlabelled: true,
      });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].eligibility.eligible).toBe(true);
      expect(candidates[0].hasUnlabelledCallouts).toBe(true);
    });
  });
});
