import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runChecks() {
  console.log("=== COMPREHENSIVE CURRICULUM INTEGRITY AUDIT ===");

  const subjects = await prisma.curriculumSubject.findMany({
    include: {
      curriculumClass: true,
      textbooks: {
        include: {
          chapters: {
            include: {
              topics: true,
            },
          },
        },
      },
      marksSchemes: true,
      blueprints: true,
    },
    orderBy: [{ curriculumClass: { classLevel: "asc" } }, { code: "asc" }],
  });

  console.log(`Total subjects retrieved: ${subjects.length}`);
  if (subjects.length !== 27) {
    throw new Error(`Expected exactly 27 subjects, got ${subjects.length}`);
  }

  let failures: string[] = [];

  for (const s of subjects) {
    const cls = s.curriculumClass.classLevel;
    const tag = `[Class ${cls} ${s.name} (${s.code})]`;

    if (!s.name || s.name.trim().length === 0) failures.push(`${tag} Empty subject name`);
    if (!s.code || s.code.trim().length === 0) failures.push(`${tag} Empty subject code`);
    if (s.theoryMarks <= 0) failures.push(`${tag} Invalid theoryMarks: ${s.theoryMarks}`);
    if (s.textbooks.length === 0) failures.push(`${tag} No textbooks found`);

    let activeChaptersCount = 0;
    let deletedChaptersCount = 0;
    let activeMarksSum = 0;

    for (const tb of s.textbooks) {
      if (!tb.title || tb.title.trim().length === 0) failures.push(`${tag} Textbook ${tb.id} has empty title`);
      if (tb.chapters.length === 0) failures.push(`${tag} Textbook ${tb.title} has no chapters`);

      for (const ch of tb.chapters) {
        if (!ch.title || ch.title.trim().length === 0) {
          failures.push(`${tag} Chapter ${ch.chapterNumber} in ${tb.title} has empty title`);
        }
        if (ch.isDeleted) {
          deletedChaptersCount++;
        } else {
          activeChaptersCount++;
          if (ch.officialMarks !== null && ch.officialMarks !== undefined) {
            if (ch.officialMarks < 0) failures.push(`${tag} Chapter ${ch.title} has negative marks: ${ch.officialMarks}`);
            activeMarksSum += ch.officialMarks;
          }
        }
        if (ch.topics.length === 0) {
          failures.push(`${tag} Chapter ${ch.title} has no topics attached`);
        }
      }
    }

    if (activeChaptersCount === 0) failures.push(`${tag} No active chapters found`);
    if (activeMarksSum > s.theoryMarks) {
      failures.push(`${tag} Active marks sum (${activeMarksSum}) EXCEEDS theoryMarks (${s.theoryMarks}) by +${activeMarksSum - s.theoryMarks}`);
    }

    // Check marksSchemes
    if (s.marksSchemes.length === 0) {
      failures.push(`${tag} No marks scheme attached`);
    } else {
      for (const ms of s.marksSchemes) {
        if (ms.totalTheory !== s.theoryMarks) {
          failures.push(`${tag} MarksScheme totalTheory (${ms.totalTheory}) !== subject.theoryMarks (${s.theoryMarks})`);
        }
        const ub = ms.unitBreakdown as any[];
        if (!Array.isArray(ub) || ub.length === 0) {
          failures.push(`${tag} MarksScheme unitBreakdown is missing or not an array`);
        } else {
          for (const u of ub) {
            if (!u.title || u.title.trim().length === 0) {
              failures.push(`${tag} Unit breakdown entry has empty title`);
            }
          }
        }
      }
    }

    // Check blueprints
    if (s.blueprints.length === 0) {
      failures.push(`${tag} No blueprint template attached`);
    } else {
      for (const bp of s.blueprints) {
        const secs = bp.sectionsJson as any[];
        if (!Array.isArray(secs) || secs.length === 0) {
          failures.push(`${tag} Blueprint sectionsJson is empty or invalid`);
        }
      }
    }
  }

  console.log(`\nAudit checks evaluated on all 27 subjects.`);
  if (failures.length > 0) {
    console.error(`FAILED CHECKS (${failures.length}):`);
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  } else {
    console.log(`ALL 10 STRUCTURAL & DATA INTEGRITY CHECKS PASSED WITH ZERO VIOLATIONS.`);
  }
}

runChecks()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
