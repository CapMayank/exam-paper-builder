import { describe, expect, it } from "vitest";
import {
  flattenSectionGroups,
  groupSectionsFromFlat,
  reletterTitle,
} from "./blueprint";

describe("Blueprint Multi-Question-Type Sections & Re-lettering", () => {
  describe("reletterTitle", () => {
    it("re-letters 'Section X' preserving sequential alphabetical order", () => {
      expect(reletterTitle("Section E", 4)).toBe("Section E");
      expect(reletterTitle("Section E", 5)).toBe("Section F");
      expect(reletterTitle("Section F", 4)).toBe("Section E");
      expect(reletterTitle("Section A", 0)).toBe("Section A");
      expect(reletterTitle("Section B", 1)).toBe("Section B");
    });

    it("preserves custom descriptive suffixes while relettering prefix", () => {
      expect(reletterTitle("Section E - Case Studies", 5)).toBe("Section F - Case Studies");
      expect(reletterTitle("Section F - Long Answers", 4)).toBe("Section E - Long Answers");
      expect(reletterTitle("Sec E: Objective", 5)).toBe("Sec F: Objective");
      expect(reletterTitle("Part E", 4)).toBe("Part E");
      expect(reletterTitle("Part E", 5)).toBe("Part F");
    });

    it("handles single-letter titles and plain text gracefully", () => {
      expect(reletterTitle("E", 5)).toBe("F");
      expect(reletterTitle("Reading Section", 3)).toBe("Reading Section");
      expect(reletterTitle("", 2)).toBe("Section C");
    });

    it("ensures that swapping Section E and F does NOT result in F before E", () => {
      // Prior to this fix, swapping E and F swapped the titles, resulting in [..., 'Section F', 'Section E']
      const originalSections = [
        { title: "Section A" },
        { title: "Section B" },
        { title: "Section C" },
        { title: "Section D" },
        { title: "Section E" },
        { title: "Section F" },
      ];

      // Simulate swap between index 4 and 5
      const swapped = [...originalSections];
      [swapped[4], swapped[5]] = [swapped[5], swapped[4]];

      // Apply relettering
      const relettered = swapped.map((s, idx) => reletterTitle(s.title, idx));

      expect(relettered[4]).toBe("Section E");
      expect(relettered[5]).toBe("Section F");
      expect(relettered).toEqual([
        "Section A",
        "Section B",
        "Section C",
        "Section D",
        "Section E",
        "Section F",
      ]);
    });
  });

  describe("groupSectionsFromFlat & flattenSectionGroups", () => {
    it("groups multiple question types under the same section title", () => {
      const flat = [
        { id: "s1", title: "Section A", instructions: "All compulsory", type: "MCQ", count: 5, marksEach: 1 },
        { id: "s2", title: "Section A", instructions: "", type: "FILL_BLANK", count: 5, marksEach: 1 },
        { id: "s3", title: "Section A", instructions: "", type: "TRUE_FALSE", count: 5, marksEach: 1 },
        { id: "s4", title: "Section A", instructions: "", type: "SHORT", count: 5, marksEach: 1 },
        { id: "s5", title: "Section B", instructions: "Short answers", type: "SHORT", count: 6, marksEach: 2 },
      ];

      const groups = groupSectionsFromFlat(flat);
      expect(groups).toHaveLength(2);

      // Section A has 4 question types
      expect(groups[0].title).toBe("Section A");
      expect(groups[0].instructions).toBe("All compulsory");
      expect(groups[0].questionTypes).toHaveLength(4);
      expect(groups[0].questionTypes[0].type).toBe("MCQ");
      expect(groups[0].questionTypes[1].type).toBe("FILL_BLANK");
      expect(groups[0].questionTypes[2].type).toBe("TRUE_FALSE");
      expect(groups[0].questionTypes[3].type).toBe("SHORT");

      // Section B has 1 question type
      expect(groups[1].title).toBe("Section B");
      expect(groups[1].questionTypes).toHaveLength(1);
      expect(groups[1].questionTypes[0].type).toBe("SHORT");

      // Flattens back cleanly
      const roundtripped = flattenSectionGroups(groups);
      expect(roundtripped).toHaveLength(5);
      expect(roundtripped[0].title).toBe("Section A");
      expect(roundtripped[1].title).toBe("Section A");
      expect(roundtripped[4].title).toBe("Section B");
    });
  });
});
