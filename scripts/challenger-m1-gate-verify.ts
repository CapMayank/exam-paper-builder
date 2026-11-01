import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== EMPIRICAL CHALLENGER GATE VERIFICATION ===");

  // 1. Defect 1: Class 11 Physics (210)
  const physics11 = await prisma.curriculumSubject.findFirst({
    where: { code: "210", curriculumClass: { classLevel: 11 } },
    include: {
      textbooks: { include: { chapters: true } },
      marksSchemes: true,
    },
  });

  if (!physics11) throw new Error("Class 11 Physics not found");
  const p11ActiveChs = physics11.textbooks.flatMap((t) => t.chapters).filter((c) => !c.isDeleted);
  const p11MarksSum = p11ActiveChs.reduce((sum, c) => sum + (c.officialMarks ?? 0), 0);
  console.log(`Defect 1 - Class 11 Physics: theoryMarks=${physics11.theoryMarks}, activeSum=${p11MarksSum}`);
  console.log(`  Chapters count: ${p11ActiveChs.length}`);
  p11ActiveChs.forEach((c) => {
    console.log(`    Ch ${c.chapterNumber}: ${c.title} -> ${c.officialMarks}m`);
  });
  console.log(`  Unit breakdown:`, JSON.stringify(physics11.marksSchemes[0]?.unitBreakdown, null, 2));

  if (p11MarksSum !== 70) {
    throw new Error(`FAIL: Physics 11 marks sum ${p11MarksSum} !== 70`);
  }

  // 2. Defect 2: Class 9 Sanskrit (512)
  const sanskrit9 = await prisma.curriculumSubject.findFirst({
    where: { code: "512", curriculumClass: { classLevel: 9 } },
    include: {
      textbooks: { include: { chapters: true } },
      marksSchemes: true,
    },
  });

  if (!sanskrit9) throw new Error("Class 9 Sanskrit not found");
  const s9ActiveChs = sanskrit9.textbooks.flatMap((t) => t.chapters).filter((c) => !c.isDeleted);
  const s9MarksSum = s9ActiveChs.reduce((sum, c) => sum + (c.officialMarks ?? 0), 0);
  console.log(`\nDefect 2 - Class 9 Sanskrit: theoryMarks=${sanskrit9.theoryMarks}, activeSum=${s9MarksSum}`);
  console.log(`  Chapters count: ${s9ActiveChs.length}`);
  s9ActiveChs.forEach((c) => {
    console.log(`    Ch ${c.chapterNumber}: ${c.title} -> ${c.officialMarks}m`);
  });
  const s9Breakdown = sanskrit9.marksSchemes[0]?.unitBreakdown as Array<{ title?: string; officialMarks?: number }>;
  const s9BreakdownSum = s9Breakdown.reduce((sum, u) => sum + (u.officialMarks ?? 0), 0);
  console.log(`  Unit breakdown units: ${s9Breakdown.length}, sum: ${s9BreakdownSum}`);
  if (s9MarksSum !== 75) {
    throw new Error(`FAIL: Sanskrit 9 marks sum ${s9MarksSum} !== 75`);
  }

  // 3. Defect 3: Class 9 Social Science (300)
  const soc9 = await prisma.curriculumSubject.findFirst({
    where: { code: "300", curriculumClass: { classLevel: 9 } },
    include: {
      textbooks: { include: { chapters: true } },
      marksSchemes: true,
    },
  });
  if (!soc9) throw new Error("Class 9 Social Science not found");
  const soc9ActiveChs = soc9.textbooks.flatMap((t) => t.chapters).filter((c) => !c.isDeleted);
  const soc9MarksSum = soc9ActiveChs.reduce((sum, c) => sum + (c.officialMarks ?? 0), 0);
  const mapMarks = soc9.theoryMarks - soc9MarksSum;
  console.log(`\nDefect 3 - Class 9 Social Science: theoryMarks=${soc9.theoryMarks}, chapterSum=${soc9MarksSum}, mapMarks=${mapMarks}`);
  if (soc9MarksSum !== 71 || mapMarks !== 4) {
    throw new Error(`FAIL: Soc9 chapterSum ${soc9MarksSum} !== 71 or mapMarks ${mapMarks} !== 4`);
  }

  // 4. Defect 4: Language Subjects Breakdown
  console.log(`\nDefect 4 - Language Subjects Analysis:`);
  const languages = await prisma.curriculumSubject.findMany({
    where: {
      name: { in: ["English", "Hindi", "Sanskrit", "Urdu"] },
    },
    include: {
      curriculumClass: true,
      textbooks: { include: { chapters: true } },
      marksSchemes: true,
    },
    orderBy: [{ curriculumClass: { classLevel: "asc" } }, { code: "asc" }],
  });

  for (const lang of languages) {
    const activeChs = lang.textbooks.flatMap((t) => t.chapters).filter((c) => !c.isDeleted);
    const chSum = activeChs.reduce((sum, c) => sum + (c.officialMarks ?? 0), 0);
    const ms = lang.marksSchemes[0];
    const ub = (ms?.unitBreakdown as Array<{ title?: string; officialMarks?: number }>) || [];
    const ubSum = ub.reduce((sum, u) => sum + (u.officialMarks ?? 0), 0);

    console.log(`  Class ${lang.curriculumClass.classLevel} ${lang.name} (${lang.code}): theory=${lang.theoryMarks}, chSum=${chSum} (<=theory: ${chSum <= lang.theoryMarks}), ubSum=${ubSum} (==theory: ${ubSum === lang.theoryMarks}), ubCount=${ub.length}`);

    if (chSum > lang.theoryMarks) {
      throw new Error(`FAIL: ${lang.name} class ${lang.curriculumClass.classLevel} chSum ${chSum} > ${lang.theoryMarks}`);
    }
    if (ubSum !== lang.theoryMarks) {
      throw new Error(`FAIL: ${lang.name} class ${lang.curriculumClass.classLevel} ubSum ${ubSum} !== ${lang.theoryMarks}`);
    }
  }

  // 5. Total Scan across all 27 subjects for ANY overflow
  console.log(`\n=== SCANNING ALL 27 SUBJECTS FOR OVERFLOWS ===`);
  const allSubjects = await prisma.curriculumSubject.findMany({
    include: {
      curriculumClass: true,
      textbooks: { include: { chapters: true } },
      marksSchemes: true,
    },
    orderBy: [{ curriculumClass: { classLevel: "asc" } }, { code: "asc" }],
  });

  let overflowCount = 0;
  for (const sub of allSubjects) {
    const active = sub.textbooks.flatMap((t) => t.chapters).filter((c) => !c.isDeleted);
    const sum = active.reduce((acc, c) => acc + (c.officialMarks ?? 0), 0);
    const diff = sum - sub.theoryMarks;
    if (diff > 0) {
      overflowCount++;
      console.error(`OVERFLOW DETECTED: Class ${sub.curriculumClass.classLevel} ${sub.name} (${sub.code}): sum=${sum} > theory=${sub.theoryMarks}`);
    }
  }

  console.log(`Total subjects scanned: ${allSubjects.length}`);
  console.log(`Total overflow violations: ${overflowCount}`);
  if (overflowCount > 0) {
    throw new Error(`FAIL: Found ${overflowCount} subjects with overflow!`);
  }

  console.log(`\nALL VERIFICATION CRITERIA EMPIRICALLY CONFIRMED!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
