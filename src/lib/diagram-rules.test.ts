import { describe, expect, it } from "vitest";
import {
  getMaxPaperDiagramBudget,
  isSectionVisuallyEligible,
  isSubjectChapterVisual,
} from "./diagram-rules";

describe("Board Examination Diagram Rules & Eligibility Suite", () => {
  describe("isSectionVisuallyEligible", () => {
    it("strictly disallows diagrams in objective drill formats", () => {
      expect(isSectionVisuallyEligible("FILL_BLANK", "Biology")).toBe(false);
      expect(isSectionVisuallyEligible("TRUE_FALSE", "Biology")).toBe(false);
      expect(isSectionVisuallyEligible("MATCH_COLUMN", "Biology")).toBe(false);
      expect(isSectionVisuallyEligible("GRAMMAR", "English")).toBe(false);
      expect(isSectionVisuallyEligible("KDG_NUMBER_GRID", "Math")).toBe(false);
      expect(isSectionVisuallyEligible("KDG_SEQUENCE_CHAIN", "Math")).toBe(false);
    });

    it("allows diagrams in dedicated visual task formats", () => {
      expect(isSectionVisuallyEligible("DRAW", "Science")).toBe(true);
      expect(isSectionVisuallyEligible("MAP_WORK", "Social Science")).toBe(true);
      expect(isSectionVisuallyEligible("WRITING_SKILL", "English")).toBe(true);
      expect(isSectionVisuallyEligible("KDG_PICTURE_MATCH", "English")).toBe(true);
    });

    it("handles Languages by restricting diagrams to writing and case/unseen visual formats", () => {
      expect(isSectionVisuallyEligible("MCQ", "English")).toBe(false);
      expect(isSectionVisuallyEligible("SHORT", "English Literature")).toBe(false);
      expect(isSectionVisuallyEligible("LONG", "Hindi")).toBe(false);
      expect(isSectionVisuallyEligible("WRITING_SKILL", "English")).toBe(true);
      expect(isSectionVisuallyEligible("CASE_STUDY", "English")).toBe(true);
    });

    it("allows STEM subjective and objective formats to be evaluated by chapter visual content", () => {
      expect(isSectionVisuallyEligible("MCQ", "Physics")).toBe(true);
      expect(isSectionVisuallyEligible("SHORT", "Biology")).toBe(true);
      expect(isSectionVisuallyEligible("LONG", "Mathematics")).toBe(true);
      expect(isSectionVisuallyEligible("CASE_STUDY", "Chemistry")).toBe(true);
    });
  });

  describe("isSubjectChapterVisual", () => {
    it("correctly identifies visual vs non-visual Mathematics chapters", () => {
      // Visual
      expect(isSubjectChapterVisual("Mathematics", "Triangles")).toBe(true);
      expect(isSubjectChapterVisual("Mathematics", "Circles")).toBe(true);
      expect(isSubjectChapterVisual("Mathematics", "Coordinate Geometry")).toBe(true);
      expect(isSubjectChapterVisual("Mathematics", "Some Applications of Trigonometry (Heights and Distances)")).toBe(true);
      expect(isSubjectChapterVisual("Mathematics", "Surface Areas and Volumes")).toBe(true);

      // Non-visual
      expect(isSubjectChapterVisual("Mathematics", "Real Numbers")).toBe(false);
      expect(isSubjectChapterVisual("Mathematics", "Polynomials")).toBe(false);
      expect(isSubjectChapterVisual("Mathematics", "Pair of Linear Equations in Two Variables")).toBe(false);
      expect(isSubjectChapterVisual("Mathematics", "Quadratic Equations")).toBe(false);
      expect(isSubjectChapterVisual("Mathematics", "Arithmetic Progressions")).toBe(false);
      expect(isSubjectChapterVisual("Mathematics", "Probability")).toBe(false);
      expect(isSubjectChapterVisual("Mathematics", "Matrices and Determinants")).toBe(false);
    });

    it("correctly identifies visual vs non-visual Biology chapters", () => {
      // Visual
      expect(isSubjectChapterVisual("Biology", "Sexual Reproduction in Flowering Plants")).toBe(true);
      expect(isSubjectChapterVisual("Biology", "Human Reproduction")).toBe(true);
      expect(isSubjectChapterVisual("Biology", "Cell - The Fundamental Unit of Life")).toBe(true);
      expect(isSubjectChapterVisual("Biology", "Life Processes (Nephron & Excretion)")).toBe(true);
      expect(isSubjectChapterVisual("Biology", "Principles of Inheritance and Variation (Punnett Square)")).toBe(true);
      expect(isSubjectChapterVisual("Biology", "Ecosystem (Trophic Pyramid)")).toBe(true);

      // Non-visual
      expect(isSubjectChapterVisual("Biology", "Reproductive Health")).toBe(false);
      expect(isSubjectChapterVisual("Biology", "Microbes in Human Welfare")).toBe(false);
      expect(isSubjectChapterVisual("Biology", "Biotechnology: Principles and Processes")).toBe(false);
      expect(isSubjectChapterVisual("Biology", "Biotechnology and its Applications")).toBe(false);
      expect(isSubjectChapterVisual("Biology", "Organisms and Populations")).toBe(false);
      expect(isSubjectChapterVisual("Biology", "Biodiversity and Conservation")).toBe(false);
      expect(isSubjectChapterVisual("Biology", "Human Health and Disease")).toBe(false);
    });

    it("correctly identifies visual vs non-visual Physics chapters", () => {
      // Visual
      expect(isSubjectChapterVisual("Physics", "Electricity and Electric Circuits")).toBe(true);
      expect(isSubjectChapterVisual("Physics", "Light - Reflection and Refraction")).toBe(true);
      expect(isSubjectChapterVisual("Physics", "The Human Eye and the Colourful World (Prism)")).toBe(true);
      expect(isSubjectChapterVisual("Physics", "Magnetic Effects of Electric Current")).toBe(true);

      // Non-visual
      expect(isSubjectChapterVisual("Physics", "Units and Measurements")).toBe(false);
      expect(isSubjectChapterVisual("Physics", "Kinetic Theory of Gases")).toBe(false);
    });

    it("handles English picture composition and writing skills", () => {
      expect(isSubjectChapterVisual("English", "Creative Writing Skills", "WRITING_SKILL")).toBe(true);
      expect(isSubjectChapterVisual("English", "Picture Composition")).toBe(true);
      expect(isSubjectChapterVisual("English", "Article / Paragraph Writing")).toBe(true);
      expect(isSubjectChapterVisual("English", "Flamingo - The Last Lesson")).toBe(false);
      expect(isSubjectChapterVisual("English", "Tenses and Modals (Grammar)")).toBe(false);
    });
  });

  describe("getMaxPaperDiagramBudget", () => {
    it("scales diagram budget strictly according to paper marks", () => {
      expect(getMaxPaperDiagramBudget(20)).toBe(1);
      expect(getMaxPaperDiagramBudget(30)).toBe(1);
      expect(getMaxPaperDiagramBudget(40)).toBe(2);
      expect(getMaxPaperDiagramBudget(50)).toBe(2);
      expect(getMaxPaperDiagramBudget(70)).toBe(3);
      expect(getMaxPaperDiagramBudget(80)).toBe(3);
      expect(getMaxPaperDiagramBudget(100)).toBe(3);
    });
  });
});
