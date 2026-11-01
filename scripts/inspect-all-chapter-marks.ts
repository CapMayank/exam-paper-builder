import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function inspect() {
  const subjects = await prisma.curriculumSubject.findMany({
    include: {
      curriculumClass: true,
      textbooks: {
        include: {
          chapters: true,
        },
      },
      marksSchemes: true,
      blueprints: true,
    },
    orderBy: [{ curriculumClass: { classLevel: "asc" } }, { code: "asc" }],
  });

  console.log(`Inspecting ${subjects.length} subjects...\n`);

  for (const s of subjects) {
    const cls = s.curriculumClass.classLevel;
    const allChs = s.textbooks.flatMap((tb) => tb.chapters);
    const activeChs = allChs.filter((ch) => !ch.isDeleted);
    const deletedChs = allChs.filter((ch) => ch.isDeleted);
    const chsWithMarks = allChs.filter((ch) => ch.officialMarks !== null && ch.officialMarks !== undefined);
    const activeChsWithMarks = activeChs.filter((ch) => ch.officialMarks !== null && ch.officialMarks !== undefined);
    const sumActiveMarks = activeChsWithMarks.reduce((acc, ch) => acc + (ch.officialMarks || 0), 0);

    const diff = sumActiveMarks - s.theoryMarks;
    const flag = diff !== 0 ? `[MISMATCH: sum=${sumActiveMarks} vs theory=${s.theoryMarks} (diff: ${diff > 0 ? "+" : ""}${diff})]` : "[OK]";

    console.log(`Class ${cls} - ${s.name} (${s.code}): theoryMarks=${s.theoryMarks} | activeChapters=${activeChs.length} (deleted=${deletedChs.length}) | markedChapters=${activeChsWithMarks.length} | sumOfMarks=${sumActiveMarks} ${flag}`);

    if (diff !== 0) {
      console.log(`   Detailed chapters for ${s.name} (Class ${cls}):`);
      for (const ch of activeChs) {
        console.log(`     Ch ${ch.chapterNumber}: "${ch.title}" -> marks: ${ch.officialMarks}, unit: "${ch.unitTitle || ''}", page: ${ch.provenancePage}`);
      }
    }
  }

  await prisma.$disconnect();
}

inspect().catch(console.error);
