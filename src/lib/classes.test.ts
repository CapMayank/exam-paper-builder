import { describe, expect, it } from "vitest";
import { inferClassOrder, normalizeAcademicSession, STANDARD_SCHOOL_CLASSES, toAcademicClassDto } from "./classes";
import { academicClassSchema, classSubjectSchema } from "./schemas";

describe("Academic Class & Subject Hierarchy", () => {
  it("normalizes academic sessions consistently with en-dash", () => {
    expect(normalizeAcademicSession("2026-27")).toBe("2026–27");
    expect(normalizeAcademicSession(" 2025–26 ")).toBe("2025–26");
    expect(normalizeAcademicSession("")).toBe("2025–26");
  });

  it("infers natural display order for school classes (Nursery through Class 12)", () => {
    expect(inferClassOrder("Nursery")).toBe(-2);
    expect(inferClassOrder("LKG")).toBe(-1);
    expect(inferClassOrder("UKG")).toBe(0);
    expect(inferClassOrder("Class 1")).toBe(1);
    expect(inferClassOrder("Class 10")).toBe(10);
    expect(inferClassOrder("Class 12")).toBe(12);
    expect(inferClassOrder("Class X")).toBe(10);
    expect(inferClassOrder("Class XII")).toBe(12);
  });

  it("includes standard classes 1 to 12 with curriculum subjects and codes", () => {
    expect(STANDARD_SCHOOL_CLASSES).toHaveLength(12);
    const class10 = STANDARD_SCHOOL_CLASSES.find((c) => c.name === "Class 10");
    expect(class10).toBeDefined();
    expect(class10?.subjects.some((s) => s.name === "Mathematics" && s.code === "041")).toBe(true);
    expect(class10?.subjects.some((s) => s.name === "Science" && s.code === "086")).toBe(true);
  });

  it("maps database rows to AcademicClassDto safely", () => {
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
    expect(dto.subjects).toHaveLength(1);
    expect(dto.subjects[0].code).toBe("041");
  });

  it("validates academicClassSchema and classSubjectSchema", () => {
    const validClass = academicClassSchema.parse({
      name: "Class 10",
      stream: "Secondary",
      academicSession: "2026–27",
      sections: ["A", "B"],
      subjects: [{ name: "Science", code: "086" }],
    });
    expect(validClass.name).toBe("Class 10");
    expect(validClass.subjects).toHaveLength(1);

    const validSubj = classSubjectSchema.parse({ name: "Physics", code: "042" });
    expect(validSubj.name).toBe("Physics");
    expect(validSubj.code).toBe("042");
  });
});
