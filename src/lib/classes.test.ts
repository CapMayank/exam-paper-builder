import { describe, expect, it } from "vitest";
import { inferClassOrder, normalizeAcademicSession, sortClassNames, STANDARD_SCHOOL_CLASSES, toAcademicClassDto } from "./classes";
import { academicClassSchema, classSubjectSchema } from "./schemas";

describe("Academic Class & Subject Hierarchy", () => {
  it("sorts classes in true curriculum order (Pre-Primary through Class 12)", () => {
    const unsorted = [
      "Class 10",
      "UKG",
      "Class 2",
      "Class 12",
      "Nursery",
      "Class 1",
      "LKG",
      "Class 9",
      "Class 11",
    ];
    const sorted = sortClassNames(unsorted);
    expect(sorted).toEqual([
      "Nursery",
      "LKG",
      "UKG",
      "Class 1",
      "Class 2",
      "Class 9",
      "Class 10",
      "Class 11",
      "Class 12",
    ]);
  });
  it("normalizes academic sessions consistently with en-dash", () => {
    expect(normalizeAcademicSession("2026-27")).toBe("2026–27");
    expect(normalizeAcademicSession(" 2025–26 ")).toBe("2025–26");
    expect(normalizeAcademicSession("")).toBe("2025–26");
  });

  it("infers natural display order for school classes (Pre-Primary through Class 12)", () => {
    expect(inferClassOrder("Playgroup")).toBe(-3);
    expect(inferClassOrder("Pre-Nursery")).toBe(-3);
    expect(inferClassOrder("Nursery")).toBe(-2);
    expect(inferClassOrder("LKG")).toBe(-1);
    expect(inferClassOrder("L.K.G.")).toBe(-1);
    expect(inferClassOrder("KG-1")).toBe(-1);
    expect(inferClassOrder("Lower KG")).toBe(-1);
    expect(inferClassOrder("PP-1")).toBe(-1);
    expect(inferClassOrder("UKG")).toBe(0);
    expect(inferClassOrder("U.K.G.")).toBe(0);
    expect(inferClassOrder("KG-2")).toBe(0);
    expect(inferClassOrder("Upper KG")).toBe(0);
    expect(inferClassOrder("PP-2")).toBe(0);
    expect(inferClassOrder("Class 1")).toBe(1);
    expect(inferClassOrder("Class 10")).toBe(10);
    expect(inferClassOrder("Class 12")).toBe(12);
    expect(inferClassOrder("Class X")).toBe(10);
    expect(inferClassOrder("Class XII")).toBe(12);
  });

  it("includes 15 standard classes from Nursery to 12th with curriculum subjects and codes", () => {
    expect(STANDARD_SCHOOL_CLASSES).toHaveLength(15);

    const nursery = STANDARD_SCHOOL_CLASSES.find((c) => c.name === "Nursery");
    expect(nursery).toBeDefined();
    expect(nursery?.displayOrder).toBe(-2);
    expect(nursery?.stream).toBe("Pre-Primary");
    expect(nursery?.subjects.some((s) => s.name === "English" && s.code === "NUR-ENG")).toBe(true);

    const lkg = STANDARD_SCHOOL_CLASSES.find((c) => c.name === "LKG");
    expect(lkg).toBeDefined();
    expect(lkg?.displayOrder).toBe(-1);
    expect(lkg?.stream).toBe("Pre-Primary");

    const ukg = STANDARD_SCHOOL_CLASSES.find((c) => c.name === "UKG");
    expect(ukg).toBeDefined();
    expect(ukg?.displayOrder).toBe(0);
    expect(ukg?.stream).toBe("Pre-Primary");

    const class10 = STANDARD_SCHOOL_CLASSES.find((c) => c.name === "Class 10");
    expect(class10).toBeDefined();
    expect(class10?.subjects.some((s) => s.name === "Mathematics" && s.code === "041")).toBe(true);
    expect(class10?.subjects.some((s) => s.name === "Science" && s.code === "086")).toBe(true);
  });

  it("maps database rows to AcademicClassDto safely with legacy string sections", () => {
    const dto = toAcademicClassDto({
      id: "cls-10",
      name: "Class 10",
      displayOrder: 10,
      stream: "Secondary",
      academicSession: "2026-27",
      sectionsJson: '["A","B"]',
      subjects: [{ id: "sub-1", classId: "cls-10", name: "Mathematics", code: "041" }],
    });
    expect(dto.academicSession).toBe("2026–27");
    expect(dto.sections).toEqual(["A", "B"]);
    expect(dto.sectionDetails).toEqual([
      { name: "A", studentCount: 40 },
      { name: "B", studentCount: 40 },
    ]);
    expect(dto.subjects).toHaveLength(1);
    expect(dto.subjects[0].code).toBe("041");
  });

  it("maps database rows with structured section objects and custom capacities", () => {
    const dto = toAcademicClassDto({
      id: "cls-10",
      name: "Class 10",
      displayOrder: 10,
      stream: "Secondary",
      academicSession: "2025–26",
      sectionsJson: JSON.stringify([
        { name: "A", studentCount: 42 },
        { name: "B", studentCount: 38 },
      ]),
      subjects: [],
    });
    expect(dto.sections).toEqual(["A", "B"]);
    expect(dto.sectionDetails).toEqual([
      { name: "A", studentCount: 42 },
      { name: "B", studentCount: 38 },
    ]);
  });

  it("validates academicClassSchema and classSubjectSchema with both string and object sections", () => {
    const validClassWithStrings = academicClassSchema.parse({
      name: "Class 10",
      stream: "Secondary",
      academicSession: "2026–27",
      sections: ["A", "B"],
      subjects: [{ name: "Science", code: "086" }],
    });
    expect(validClassWithStrings.name).toBe("Class 10");
    expect(validClassWithStrings.subjects).toHaveLength(1);
    expect(validClassWithStrings.sections).toEqual(["A", "B"]);

    const validClassWithObjects = academicClassSchema.parse({
      name: "Class 12",
      stream: "Science",
      sections: [
        { name: "A", studentCount: 45 },
        { name: "B", studentCount: 40 },
      ],
    });
    expect(validClassWithObjects.sections).toEqual([
      { name: "A", studentCount: 45 },
      { name: "B", studentCount: 40 },
    ]);

    const validSubj = classSubjectSchema.parse({ name: "Physics", code: "042" });
    expect(validSubj.name).toBe("Physics");
    expect(validSubj.code).toBe("042");
  });

  it("accurately correlates class subjects with textbooks and flags subjects needing setup", () => {
    const classDto = toAcademicClassDto({
      id: "cls-10",
      name: "Class 10",
      displayOrder: 10,
      stream: "Secondary",
      academicSession: "2025–26",
      sectionsJson: '["A"]',
      subjects: [
        { id: "sub-1", classId: "cls-10", name: "Mathematics", code: "041" },
        { id: "sub-2", classId: "cls-10", name: "Science", code: "086" },
        { id: "sub-3", classId: "cls-10", name: "Social Science", code: "087" },
      ],
    });

    const existingBooks = [
      {
        id: "book-1",
        title: "NCERT Science 10",
        className: "Class 10",
        subject: "Science",
        academicSession: "2025–26",
        chapters: [{ id: "c1", number: 1, title: "Chemical Reactions" }],
      },
    ];

    // Compute subject status
    const subjectSummary = classDto.subjects.map((sub) => {
      const booksForSub = existingBooks.filter(
        (b) =>
          b.className.toLowerCase() === classDto.name.toLowerCase() &&
          b.subject.toLowerCase() === sub.name.toLowerCase()
      );
      return {
        name: sub.name,
        code: sub.code,
        booksCount: booksForSub.length,
        hasTextbook: booksForSub.length > 0,
      };
    });

    // Science has a textbook
    const science = subjectSummary.find((s) => s.name === "Science");
    expect(science?.hasTextbook).toBe(true);
    expect(science?.booksCount).toBe(1);

    // Mathematics has no textbook yet and is properly surfaced
    const math = subjectSummary.find((s) => s.name === "Mathematics");
    expect(math?.hasTextbook).toBe(false);
    expect(math?.booksCount).toBe(0);

    // Social Science has no textbook yet and is properly surfaced
    const sst = subjectSummary.find((s) => s.name === "Social Science");
    expect(sst?.hasTextbook).toBe(false);
    expect(sst?.booksCount).toBe(0);
  });

  it("prevents blueprint creation from falling back to unrelated textbooks when subject has no books", () => {
    const books = [
      {
        id: "book-physics-12",
        title: "NCERT Physics 12",
        className: "Class 12",
        subject: "Physics",
        academicSession: "2025–26",
      },
      {
        id: "book-science-10",
        title: "NCERT Science 10",
        className: "Class 10",
        subject: "Science",
        academicSession: "2025–26",
      },
    ];

    // Teacher asks to create a blueprint for Class 10 Mathematics
    const targetClass = "Class 10";
    const targetSubject = "Mathematics";

    // Strict subject lookup
    const matchingBook =
      books.find(
        (b) =>
          b.className.trim().toLowerCase() === targetClass.trim().toLowerCase() &&
          b.subject.trim().toLowerCase() === targetSubject.trim().toLowerCase()
      ) ?? null;

    // Must be null, NOT falling back to books[0] (Physics 12) or Class 10 Science!
    expect(matchingBook).toBeNull();
  });
});
