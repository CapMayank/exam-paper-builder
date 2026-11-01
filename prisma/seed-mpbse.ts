import { PrismaClient } from "@prisma/client";
import { ensureCurriculumSeeded } from "../src/lib/curriculumInit";

const prisma = new PrismaClient();

async function main() {
  console.log("================================================================================");
  console.log("🌱 SEEDING MPBSE CURRICULUM, BLUEPRINTS & EXAMINATION PATTERNS (CLASSES 9–12)");
  console.log("================================================================================");

  await ensureCurriculumSeeded(prisma, true);

  console.log("================================================================================");
  console.log("✅ MPBSE CURRICULUM SEED COMPLETE!");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
