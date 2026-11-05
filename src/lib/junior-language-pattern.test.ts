import { describe, expect, it } from "vitest";
import { validateBlueprint } from "./blueprint";
import { buildSetupInput, presetTotals, suggestPreset } from "./blueprintSetupPlan";
import { builtInBlueprintPresets } from "./presets";
import { distributeMarksByRole, missingUnitRoles } from "./roleMarks";
import { distributeSlotMarks, marksByRole, schoolPatternsForLevel } from "./schoolPatterns";
import { getLanguageNonChapterUnits } from "./syllabusImport";

const presets = builtInBlueprintPresets();
const exam = { examType: "ANNUAL" as const, academicSession: "2026–27" };

/** A Class 8 book as a teacher builds it: lessons, then the three language units. */
function book(subject: "English" | "Hindi" | "Sanskrit", lessonCount = 12) {
  const lessons = Array.from({ length: lessonCount }, (_, i) => ({ id: `l${i + 1}`, title: subject === "English" ? `Lesson ${i + 1}` : `पाठ ${i + 1}` }));
  const units = getLanguageNonChapterUnits(subject, "Class 8").map((u) => ({ id: u.domain, title: u.title }));
  return { id: "b", className: "Class 8", subject, chapters: [...lessons, ...units] };
}

describe("Classes 5–8 English and Hindi follow the Rajya Shiksha Kendra M.P. paper", () => {
  it("English: 26 questions, 60 marks; lessons 40, grammar 7, unseen passage 3, writing 10", () => {
    const t = schoolPatternsForLevel(8, "English")[0];
    expect(t.subjectName).toBe("English");
    expect(presetTotals(t)).toEqual({ marks: 60, questions: 26 });
    expect(marksByRole(t)).toEqual({ LITERATURE: 40, GRAMMAR: 7, PASSAGE: 3, WRITING: 10 });
  });

  it("Hindi: 26 questions, 60 marks; पाठ 37, व्याकरण 10, अपठित 3, लेखन 10", () => {
    const t = schoolPatternsForLevel(6, "हिंदी")[0];
    expect(t.subjectName).toBe("Hindi");
    expect(presetTotals(t)).toEqual({ marks: 60, questions: 26 });
    expect(marksByRole(t)).toEqual({ LITERATURE: 37, GRAMMAR: 10, PASSAGE: 3, WRITING: 10 });
  });

  it("is offered first for English and Hindi books, and not for other subjects", () => {
    expect(suggestPreset(presets, { className: "Class 7", subject: "English" })!.subjectName).toBe("English");
    expect(suggestPreset(presets, { className: "Class 5", subject: "Hindi" })!.subjectName).toBe("Hindi");
    expect(suggestPreset(presets, { className: "Class 7", subject: "Science" })!.subjectName).toBeUndefined();
    expect(schoolPatternsForLevel(7, "Mathematics").every((t) => !t.subjectName)).toBe(true);
  });

  it("Sanskrit (Classes 6–8): 26 questions, 60 marks; पाठाः 37, व्याकरणम् 8, गद्यांश 5, लेखनम् 10", () => {
    const t = schoolPatternsForLevel(7, "संस्कृत")[0];
    expect(t.subjectName).toBe("Sanskrit");
    expect(presetTotals(t)).toEqual({ marks: 60, questions: 26 });
    expect(marksByRole(t)).toEqual({ LITERATURE: 37, GRAMMAR: 8, PASSAGE: 5, WRITING: 10 });
    expect(suggestPreset(presets, { className: "Class 6", subject: "Sanskrit" })!.subjectName).toBe("Sanskrit");
    expect(suggestPreset(presets, { className: "Class 5", subject: "Sanskrit" })!.subjectName).toBeUndefined();
    expect(suggestPreset(presets, { className: "Class 9", subject: "Sanskrit" })!.archetype).not.toBe("SCHOOL");
  });

  for (const subject of ["English", "Hindi", "Sanskrit"] as const) {
    it(`${subject}: the unseen passage, writing and grammar marks go only to their own units`, () => {
      const b = book(subject);
      const preset = suggestPreset(presets, b)!;
      const input = buildSetupInput(preset, b, exam);
      expect(validateBlueprint(input)).toEqual([]);
      const marks = Object.fromEntries(input.chapters.map((c) => [c.chapterId, c.marks]));
      const roles = marksByRole(preset);
      expect(marks.reading).toBe(roles.PASSAGE);
      expect(marks.writing).toBe(roles.WRITING);
      expect(marks.grammar).toBe(roles.GRAMMAR);
      const lessonMarks = input.chapters.filter((c) => c.chapterId.startsWith("l")).reduce((s, c) => s + c.marks, 0);
      expect(lessonMarks).toBe(roles.LITERATURE);
    });
  }

  it("asks for the units a hand-made book is missing, and meanwhile keeps every mark on a real row", () => {
    const lessonsOnly = { ...book("English"), chapters: book("English").chapters.filter((c) => c.id.startsWith("l")) };
    const preset = suggestPreset(presets, lessonsOnly)!;
    const slots = preset.sections.flatMap((g) => g.questionTypes.flatMap((q) => Array.from({ length: q.count }, () => ({ marks: q.marksEach, role: q.role }))));
    expect(missingUnitRoles(slots, lessonsOnly.chapters, "English").sort()).toEqual(["GRAMMAR", "PASSAGE", "WRITING"]);
    const marks = distributeMarksByRole(slots, lessonsOnly.chapters, "English");
    expect(Object.values(marks).reduce((a, b) => a + b, 0)).toBe(60);
  });

  it("leaves patterns without roles exactly as they were", () => {
    const marks = [5, 5, 5, 5, 3, 3, 3, 2, 2, 1, 1, 1, 1, 1, 1];
    const chapters = book("English").chapters;
    expect(distributeMarksByRole(marks.map((m) => ({ marks: m })), chapters, "English")).toEqual(
      distributeSlotMarks(marks, chapters.map((c) => c.id)),
    );
  });
});
