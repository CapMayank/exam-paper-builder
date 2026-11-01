import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getCounts() {
  return {
    boards: await prisma.curriculumBoard.count(),
    documents: await prisma.curriculumDocument.count(),
    classes: await prisma.curriculumClass.count(),
    streams: await prisma.curriculumStream.count(),
    subjects: await prisma.curriculumSubject.count(),
    variants: await prisma.curriculumSubjectVariant.count(),
    textbooks: await prisma.curriculumTextbook.count(),
    chapters: await prisma.curriculumChapter.count(),
    topics: await prisma.curriculumTopic.count(),
    marksSchemes: await prisma.curriculumMarksScheme.count(),
    templates: await prisma.curriculumBlueprintTemplate.count(),
    legacyBooks: await prisma.book.count(),
    legacyChapters: await prisma.chapter.count(),
  };
}

async function main() {
  console.log("=== SEED IDEMPOTENCY EMPIRICAL TEST ===");
  const before = await getCounts();
  console.log("Counts before re-run:", JSON.stringify(before, null, 2));

  // We will run seed in the runner script
  await prisma.$disconnect();
}

main().catch(console.error);
