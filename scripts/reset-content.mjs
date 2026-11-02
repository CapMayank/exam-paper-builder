// Wipes all school content (classes, books, questions, blueprints, papers, curriculum cache) and keeps
// every login account. Afterwards the app re-seeds the MPBSE 2026-27 curriculum on first use and this
// script recreates Classes 9-12 with the school's required subjects.
//
//   node scripts/reset-content.mjs          -> dry run: prints what would be deleted
//   node scripts/reset-content.mjs --yes    -> backs up the SQLite file, then deletes
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const SESSION = "2026–27";

// children before parents
const TABLES = [
  "paperQuestion",
  "paperSnapshot",
  "examTimetableEntry",
  "printRunCalculation",
  "paper",
  "blueprintSection",
  "blueprintChapter",
  "blueprint",
  "question",
  "chapter",
  "book",
  "classSubject",
  "academicClass",
  "curriculumTopic",
  "curriculumBlueprintTemplate",
  "curriculumMarksScheme",
  "curriculumChapter",
  "curriculumTextbook",
  "curriculumSubjectVariant",
  "curriculumSubject",
  "curriculumStream",
  "curriculumClass",
  "curriculumDocument",
  "curriculumBoard",
  "auditLog",
];

// mirrors src/lib/schoolProfile.ts
const SECONDARY = ["Hindi", "English", "Mathematics", "Science", "Social Science", "Sanskrit", "Disaster Management"];
const SENIOR = ["Physics", "Chemistry", "Mathematics", "Biology", "Hindi", "English", "Disaster Management"];
const CLASSES = [
  { name: "Class 9", displayOrder: 9, stream: "", subjects: SECONDARY },
  { name: "Class 10", displayOrder: 10, stream: "", subjects: SECONDARY },
  { name: "Class 11", displayOrder: 11, stream: "Science", subjects: SENIOR },
  { name: "Class 12", displayOrder: 12, stream: "Science", subjects: SENIOR },
];

function sqliteFile() {
  const url = process.env.DATABASE_URL || "";
  const m = url.match(/^file:(.+)$/);
  if (!m) return null;
  const p = m[1];
  // Prisma resolves relative SQLite paths against the schema folder
  return path.isAbsolute(p) ? p : path.resolve("prisma", p);
}

async function main() {
  const apply = process.argv.includes("--yes");
  const users = await prisma.user.count();
  console.log(`Keeping ${users} user account(s).`);
  for (const t of TABLES) console.log(`  ${t.padEnd(30)} ${await prisma[t].count()} row(s)`);

  if (!apply) {
    console.log("\nDry run. Re-run with --yes to delete these rows.");
    return;
  }

  const file = sqliteFile();
  if (file && fs.existsSync(file)) {
    const backup = `${file}.before-reset-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    fs.copyFileSync(file, backup);
    console.log(`\nBacked up database to ${backup}`);
  }

  await prisma.$transaction(TABLES.map((t) => prisma[t].deleteMany({})));
  console.log("Deleted all content rows.");

  for (const c of CLASSES) {
    await prisma.academicClass.create({
      data: {
        name: c.name,
        displayOrder: c.displayOrder,
        stream: c.stream,
        academicSession: SESSION,
        sectionsJson: JSON.stringify(["A"]),
        subjects: { create: c.subjects.map((name) => ({ name })) },
      },
    });
  }
  console.log(`Created Classes 9-12 for ${SESSION} with the school's required subjects.`);
  console.log("The MPBSE curriculum and textbooks are re-seeded automatically on first use.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
