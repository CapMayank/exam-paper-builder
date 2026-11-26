import { afterAll, describe, expect, it } from "vitest";
import { ensureSchoolSubjects } from "./classes";
import { prisma } from "./prisma";

const SESSION = "2098–99";

describe("GK and Drawing on every class from Nursery to Class 8", () => {
  afterAll(async () => {
    const ids = (await prisma.academicClass.findMany({ where: { academicSession: SESSION }, select: { id: true } })).map((c) => c.id);
    await prisma.schoolSetting.deleteMany({ where: { key: { in: ids.map((id) => `minorSubjectsAdded:${id}`) } } });
    await prisma.academicClass.deleteMany({ where: { academicSession: SESSION } });
  });

  it("adds both subjects to Nursery–Class 8 and leaves Classes 9–12 alone", async () => {
    for (const [name, order] of [["Nursery", -2], ["Class 3", 3], ["Class 8", 8], ["Class 9", 9]] as const) {
      await prisma.academicClass.create({ data: { name, displayOrder: order, academicSession: SESSION } });
    }
    await ensureSchoolSubjects(SESSION);
    await ensureSchoolSubjects(SESSION); // twice: nothing is added again
    const subjects = async (name: string) =>
      (await prisma.classSubject.findMany({ where: { academicClass: { name, academicSession: SESSION } }, select: { name: true } })).map((s) => s.name);
    for (const name of ["Nursery", "Class 3", "Class 8"]) {
      const list = await subjects(name);
      expect(list.filter((s) => s === "General Knowledge")).toHaveLength(1);
      expect(list.filter((s) => s === "Drawing")).toHaveLength(1);
    }
    expect(await subjects("Class 9")).not.toContain("Drawing");
  });

  it("adds them once: a school that removes one keeps it removed", async () => {
    const nursery = await prisma.academicClass.findFirstOrThrow({ where: { name: "Nursery", academicSession: SESSION } });
    await prisma.classSubject.deleteMany({ where: { classId: nursery.id, name: "Drawing" } });
    await ensureSchoolSubjects(SESSION);
    const names = (await prisma.classSubject.findMany({ where: { classId: nursery.id } })).map((s) => s.name);
    expect(names).toContain("General Knowledge");
    expect(names).not.toContain("Drawing");
  });
});
