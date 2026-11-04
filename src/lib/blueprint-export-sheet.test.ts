import { describe, expect, it } from "vitest";
import { blueprintsForExport, buildBlueprintSheet, formatDuration } from "./blueprintSheet";
import { defaultExamDurationMin } from "./constants";
import { schoolPatternsForLevel } from "./schoolPatterns";
import type { Blueprint } from "./types";

function bp(over: Partial<Blueprint> & { className: string; subject?: string }): Blueprint {
  const { className, subject = "Science", ...rest } = over;
  return {
    id: `${className}-${subject}-${rest.examType ?? "ANNUAL"}`,
    name: "x",
    bookId: "b",
    academicSession: "2026-27",
    examType: "ANNUAL",
    durationMin: 150,
    subjectCode: "",
    book: { id: "b", title: "t", subject, className },
    chapters: [],
    sections: [],
    _count: { papers: 0 },
    ...rest,
  };
}

const sec = (position: number, type: string, count: number, marksEach: number, extra: Record<string, unknown> = {}) => ({
  id: `s${position}`,
  position,
  title: `Section ${position}`,
  instructions: "",
  type,
  count,
  marksEach,
  orChoiceMode: "NOT_REQUIRED" as const,
  ...extra,
});

describe("exam durations", () => {
  it("3 hours for Classes 9–12, 2½ hours for Nursery to Class 8", () => {
    for (const c of ["Class 9", "Class 10", "Class 11", "Class 12"]) expect(defaultExamDurationMin(c)).toBe(180);
    for (const c of ["Nursery", "LKG", "UKG", "Class 1", "Class 5", "Class 8"]) expect(defaultExamDurationMin(c)).toBe(150);
    expect(schoolPatternsForLevel(2)[0].durationMin).toBe(150);
    expect(schoolPatternsForLevel(7)[0].durationMin).toBe(150);
  });

  it("reads as students would say it", () => {
    expect(formatDuration(150)).toBe("2½ hours");
    expect(formatDuration(180)).toBe("3 hours");
    expect(formatDuration(60)).toBe("1 hour");
    expect(formatDuration(45)).toBe("45 minutes");
    expect(formatDuration(100)).toBe("1 h 40 min");
  });
});

describe("student blueprint sheet", () => {
  it("numbers the questions across sections and totals the marks", () => {
    const sheet = buildBlueprintSheet(
      bp({
        className: "Class 6",
        sections: [sec(1, "MCQ", 5, 1), sec(2, "FILL_BLANK", 5, 1), sec(3, "VERY_SHORT", 6, 2), sec(4, "SHORT", 6, 3), sec(5, "LONG", 4, 5)],
      }),
    );
    expect(sheet.pattern.map((r) => [r.questionNos, r.type, r.count, r.marksEach, r.total])).toEqual([
      ["1–5", "Multiple Choice Questions (MCQ)", 5, 1, 5],
      ["6–10", "Fill in the Blanks (FIB)", 5, 1, 5],
      ["11–16", "Very Short Answer (VSA)", 6, 2, 12],
      ["17–22", "Short Answer (SA)", 6, 3, 18],
      ["23–26", "Long Answer (LA)", 4, 5, 20],
    ]);
    expect(sheet.totalMarks).toBe(60);
    expect(sheet.questionCount).toBe(26);
    expect(sheet.examLabel).toBe("Annual Examination");
    expect(sheet.session).toBe("2026–27");
  });

  it("shows internal choice only where the blueprint asks for it", () => {
    const sheet = buildBlueprintSheet(
      bp({ className: "Class 6", sections: [sec(1, "LONG", 4, 5, { orChoiceMode: "REQUIRED" }), sec(2, "SHORT", 3, 3)] }),
    );
    expect(sheet.pattern.map((r) => r.withChoice)).toEqual([4, 0]);
  });

  it("lists chapters in book order with textbook parts, and a shared unit quota once", () => {
    const ch = (number: number, title: string, marks: number, unitKey = "", unitTitle = "") => ({
      chapterId: `c${number}`,
      marks,
      unitKey,
      unitTitle,
      chapter: { id: `c${number}`, number, title },
    });
    const sheet = buildBlueprintSheet(
      bp({
        className: "Class 10",
        subject: "English",
        chapters: [
          ch(4, "[First Flight] A Letter to God", 6),
          ch(1, "[Reading, Writing & Grammar] Section C: Grammar", 10),
          ch(5, "[First Flight] Nelson Mandela", 6),
          ch(7, "[Footprints] A Triumph of Surgery", 3, "u7", "Supplementary reader"),
          ch(8, "[Footprints] The Thief's Story", 1, "u7", "Supplementary reader"),
          ch(9, "[Footprints] Not in this exam", 0),
        ],
      }),
    );
    expect(sheet.chapters).toEqual([
      { part: "Reading, Writing & Grammar", title: "Section C: Grammar", marks: 10 },
      { part: "First Flight", title: "A Letter to God", marks: 6 },
      { part: "First Flight", title: "Nelson Mandela", marks: 6 },
      { part: "Footprints", title: "A Triumph of Surgery, The Thief's Story", marks: 4 },
    ]);
  });
});

describe("choosing blueprints to export", () => {
  const list = [
    bp({ className: "Class 10", subject: "Science" }),
    bp({ className: "Class 9", subject: "Hindi" }),
    bp({ className: "Class 9", subject: "English" }),
    bp({ className: "Class 9", subject: "English", examType: "HALF_YEARLY" }),
    bp({ className: "Class 5", subject: "EVS", academicSession: "2025–26" }),
    bp({ className: "LKG", subject: "English", curriculumMode: "KG_WORKSHEET" }),
    bp({ className: "Class 12", subject: "Physics" }),
  ];

  it("by session, exam and classes, in class then subject order", () => {
    const got = blueprintsForExport(list, { session: "2026–27", examType: "ANNUAL", classes: ["Class 9", "Class 10", "LKG"] });
    expect(got.map((b) => `${b.book.className} ${b.book.subject}`)).toEqual(["Class 9 English", "Class 9 Hindi", "Class 10 Science"]);
  });

  it("other exams and other sessions stay out", () => {
    expect(blueprintsForExport(list, { session: "2026-27", examType: "HALF_YEARLY", classes: ["Class 9"] })).toHaveLength(1);
    expect(blueprintsForExport(list, { session: "2026–27", examType: "ANNUAL", classes: ["Class 5"] })).toHaveLength(0);
  });
});
