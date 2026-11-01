import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("=== EMPIRICAL CHALLENGE: MILESTONE 1 ===");

  // 1. Board check
  const boards = await prisma.curriculumBoard.findMany({
    include: { classes: true, documents: true },
  });
  console.log("Boards count:", boards.length);
  for (const b of boards) {
    console.log(`Board: ${b.code} (${b.name}), activeSession: ${b.activeSession}, classes: ${b.classes.length}, docs: ${b.documents.length}`);
  }

  // 2. Classes & Board Exam flags
  const classes = await prisma.curriculumClass.findMany({
    include: {
      subjects: {
        include: {
          variants: true,
          textbooks: {
            include: {
              chapters: true,
            },
          },
          marksSchemes: true,
          blueprints: true,
        },
      },
      streams: true,
    },
    orderBy: { classLevel: "asc" },
  });

  console.log("\n--- CLASSES & BOARD EXAM FLAGS ---");
  for (const c of classes) {
    console.log(
      `Class ${c.classLevel}: name="${c.displayName}", isBoardExam=${c.isBoardExam}, streams=${c.streams.map((s) => s.code).join(", ")}, subjectsCount=${c.subjects.length}`
    );
  }

  // 3. Subject Codes Uniqueness per Class
  console.log("\n--- SUBJECT CODES PER CLASS ---");
  let anyDuplicateCode = false;
  for (const c of classes) {
    const codeCounts = new Map<string, string[]>();
    for (const s of c.subjects) {
      if (!codeCounts.has(s.code)) {
        codeCounts.set(s.code, []);
      }
      codeCounts.get(s.code)!.push(`${s.name} (${s.id})`);
    }

    console.log(`Class ${c.classLevel} subjects:`);
    for (const [code, subs] of codeCounts.entries()) {
      if (subs.length > 1) {
        anyDuplicateCode = true;
        console.error(`  [DUPLICATE CODE ERROR] Code '${code}' is shared by: ${subs.join(", ")}`);
      } else {
        console.log(`  Code '${code}': ${subs[0]}`);
      }
    }
  }
  console.log("Subject code uniqueness verified:", !anyDuplicateCode);

  // 4. Official Chapter Marks & Non-Fabrication Check
  console.log("\n--- CHAPTER MARKS & RATIONALIZATION CHECK ---");
  const allChapters = await prisma.curriculumChapter.findMany({
    include: {
      textbook: {
        include: {
          subject: {
            include: {
              curriculumClass: true,
            },
          },
        },
      },
    },
  });

  console.log("Total Curriculum Chapters:", allChapters.length);
  const deletedChapters = allChapters.filter((ch) => ch.isDeleted);
  console.log("Total Deleted Chapters (rationalized out):", deletedChapters.length);

  // Group chapters by class and subject
  const subjectChapters = new Map<string, typeof allChapters>();
  for (const ch of allChapters) {
    const subjKey = `Class ${ch.textbook.subject.curriculumClass.classLevel} - ${ch.textbook.subject.name} (${ch.textbook.subject.code})`;
    if (!subjectChapters.has(subjKey)) {
      subjectChapters.set(subjKey, []);
    }
    subjectChapters.get(subjKey)!.push(ch);
  }

  for (const [subjKey, chs] of subjectChapters.entries()) {
    const withMarks = chs.filter((c) => c.officialMarks !== null && c.officialMarks !== undefined);
    const sumMarks = withMarks.reduce((acc, c) => acc + (c.officialMarks || 0), 0);
    const deletedCount = chs.filter((c) => c.isDeleted).length;
    console.log(
      `${subjKey}: totalChapters=${chs.length}, deleted=${deletedCount}, withOfficialMarks=${withMarks.length}, sumOfMarks=${sumMarks}`
    );
  }

  // 5. Legacy Book & Chapter Synchronization Check
  console.log("\n--- LEGACY BOOK & CHAPTER SYNCHRONIZATION ---");
  const textbooks = await prisma.curriculumTextbook.findMany({
    include: {
      chapters: true,
      subject: {
        include: {
          curriculumClass: true,
        },
      },
    },
  });

  console.log("Curriculum Textbooks count:", textbooks.length);
  let totalLinkedBooks = 0;
  let totalMissingBooks = 0;
  let totalLinkedChapters = 0;
  let totalMissingChapters = 0;

  for (const tb of textbooks) {
    if (!tb.legacyBookId) {
      totalMissingBooks++;
      console.warn(`Textbook ${tb.title} has NO legacyBookId`);
      continue;
    }
    const legacyBook = await prisma.book.findUnique({
      where: { id: tb.legacyBookId },
      include: { chapters: true },
    });
    if (!legacyBook) {
      totalMissingBooks++;
      console.error(`Textbook ${tb.title} references non-existent Book ${tb.legacyBookId}`);
      continue;
    }
    totalLinkedBooks++;

    for (const ch of tb.chapters) {
      if (!ch.legacyChapterId) {
        totalMissingChapters++;
        console.warn(`  Chapter ${ch.chapterNumber} "${ch.title}" has NO legacyChapterId`);
        continue;
      }
      const legacyCh = await prisma.chapter.findUnique({
        where: { id: ch.legacyChapterId },
      });
      if (!legacyCh) {
        totalMissingChapters++;
        console.error(`  Chapter ${ch.chapterNumber} references non-existent Chapter ${ch.legacyChapterId}`);
        continue;
      }
      if (legacyCh.bookId !== legacyBook.id) {
        console.error(`  Chapter ${ch.chapterNumber} legacyChapter.bookId (${legacyCh.bookId}) does not match legacyBook.id (${legacyBook.id})`);
      }
      totalLinkedChapters++;
    }
  }

  console.log(`Legacy Books: ${totalLinkedBooks} linked, ${totalMissingBooks} missing`);
  console.log(`Legacy Chapters: ${totalLinkedChapters} linked, ${totalMissingChapters} missing`);

  // 6. Check existing Book/Chapter queryability in Paper Builder
  // Check if existing Book model queries work with these books
  const sampleLegacyBooks = await prisma.book.findMany({
    where: {
      className: { in: ["Class 9", "Class 10", "Class 11", "Class 12"] },
    },
    include: {
      chapters: true,
    },
  });
  console.log(`\nLegacy Book records found for Classes 9-12 in main 'Book' table: ${sampleLegacyBooks.length}`);

  // 7. Marks Scheme check
  const marksSchemes = await prisma.curriculumMarksScheme.findMany({
    include: { subject: { include: { curriculumClass: true } } },
  });
  console.log(`\nTotal Marks Schemes: ${marksSchemes.length}`);
  for (const ms of marksSchemes) {
    const s = ms.subject;
    const c = s.curriculumClass;
    if (s.theoryMarks !== ms.totalTheory || s.practicalMarks !== ms.totalPractical || s.projectMarks !== ms.totalProject) {
      console.error(`Marks mismatch for ${c.displayName} ${s.name}: subject has (${s.theoryMarks}/${s.practicalMarks}/${s.projectMarks}) vs scheme (${ms.totalTheory}/${ms.totalPractical}/${ms.totalProject})`);
    }
  }

  // 8. Blueprint templates check
  const blueprintTemplates = await prisma.curriculumBlueprintTemplate.findMany({
    include: { subject: { include: { curriculumClass: true } } },
  });
  console.log(`\nTotal Blueprint Templates: ${blueprintTemplates.length}`);
  for (const bt of blueprintTemplates) {
    const sections = bt.sectionsJson as any[];
    const totalSecMarks = sections.reduce((acc, sec) => acc + sec.count * sec.marksEach, 0);
    if (totalSecMarks !== bt.totalMarks) {
      console.error(`Blueprint marks sum mismatch in template ${bt.templateCode}: sections sum=${totalSecMarks}, template totalMarks=${bt.totalMarks}`);
    }
  }

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
