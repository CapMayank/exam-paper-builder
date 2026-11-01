import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== EMPIRICAL DATABASE VERIFICATION (prisma/dev.db) ===");

  // 1. Verify Class 11 Physics (210)
  const p11 = await prisma.curriculumSubject.findFirst({
    where: { code: "210", curriculumClass: { classLevel: 11 } },
    include: { marksSchemes: true, textbooks: { include: { chapters: true } } },
  });

  console.log("\n[1] Class 11 Physics (Code 210):");
  console.log("Subject Name:", p11?.name);
  console.log("Theory Marks:", p11?.theoryMarks);
  console.log("Practical Marks:", p11?.practicalMarks);
  console.log("Total Textbooks:", p11?.textbooks.length);
  const p11Chapters = p11?.textbooks[0].chapters || [];
  const p11Active = p11Chapters.filter((c) => !c.isDeleted);
  const p11Deleted = p11Chapters.filter((c) => c.isDeleted);
  const p11ActiveMarksSum = p11Active.reduce((acc, c) => acc + (c.officialMarks || 0), 0);
  console.log(`Active Chapters: ${p11Active.length}, Deleted Chapters: ${p11Deleted.length}`);
  console.log(`Active Chapters Marks Sum: ${p11ActiveMarksSum} (theoryMarks: ${p11?.theoryMarks}, diff: ${p11ActiveMarksSum - (p11?.theoryMarks || 0)})`);
  console.log("Unit Breakdown in DB:");
  console.log(JSON.stringify(p11?.marksSchemes[0]?.unitBreakdown, null, 2));

  // 2. Verify Class 9 Sanskrit (512)
  const s9 = await prisma.curriculumSubject.findFirst({
    where: { code: "512", curriculumClass: { classLevel: 9 } },
    include: { marksSchemes: true, textbooks: { include: { chapters: true } } },
  });

  console.log("\n[2] Class 9 Sanskrit (Code 512):");
  console.log("Subject Name:", s9?.name);
  console.log("Theory Marks:", s9?.theoryMarks);
  console.log("Total Textbooks:", s9?.textbooks.length);
  const s9Chapters = s9?.textbooks[0].chapters || [];
  const s9Active = s9Chapters.filter((c) => !c.isDeleted);
  const s9ActiveMarksSum = s9Active.reduce((acc, c) => acc + (c.officialMarks || 0), 0);
  console.log(`Active Chapters: ${s9Active.length}`);
  console.log(`Active Chapters Marks Sum: ${s9ActiveMarksSum} (theoryMarks: ${s9?.theoryMarks}, diff: ${s9ActiveMarksSum - (s9?.theoryMarks || 0)})`);
  const s9UnitBreakdown = s9?.marksSchemes[0]?.unitBreakdown as any[];
  console.log(`Unit Breakdown Units Count: ${s9UnitBreakdown?.length}`);
  const s9UnitSum = s9UnitBreakdown?.reduce((acc, u) => acc + (u.officialMarks || 0), 0);
  console.log(`Unit Breakdown Total Marks: ${s9UnitSum}`);
  console.log("Sample Sanskrit Units (first 3 and last 3):");
  console.log(JSON.stringify(s9UnitBreakdown?.slice(0, 3), null, 2));
  console.log(JSON.stringify(s9UnitBreakdown?.slice(-3), null, 2));

  // 3. Database Population Counts
  const totalSubjects = await prisma.curriculumSubject.count();
  const totalClasses = await prisma.curriculumClass.count();
  const totalStreams = await prisma.curriculumStream.count();
  const totalTextbooks = await prisma.curriculumTextbook.count();
  const totalChapters = await prisma.curriculumChapter.count();
  const totalTopics = await prisma.curriculumTopic.count();
  const totalMarksSchemes = await prisma.curriculumMarksScheme.count();
  const totalTemplates = await prisma.curriculumBlueprintTemplate.count();
  const totalLegacyBooks = await prisma.book.count();
  const totalLegacyChapters = await prisma.chapter.count();

  console.log("\n[3] Overall Database Entity Counts:");
  console.log(`- CurriculumClass: ${totalClasses}`);
  console.log(`- CurriculumStream: ${totalStreams}`);
  console.log(`- CurriculumSubject: ${totalSubjects}`);
  console.log(`- CurriculumTextbook: ${totalTextbooks}`);
  console.log(`- CurriculumChapter: ${totalChapters}`);
  console.log(`- CurriculumTopic: ${totalTopics}`);
  console.log(`- CurriculumMarksScheme: ${totalMarksSchemes}`);
  console.log(`- CurriculumBlueprintTemplate: ${totalTemplates}`);
  console.log(`- Legacy Book: ${totalLegacyBooks}`);
  console.log(`- Legacy Chapter: ${totalLegacyChapters}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
