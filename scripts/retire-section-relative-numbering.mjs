// One-off: papers stored with the retired SECTION_RELATIVE numbering style move to CONTINUOUS (board style numbers run
// through the whole paper). Print already reads the old value as continuous; this makes the stored setting match.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const { count } = await prisma.paper.updateMany({
    where: { numberingStyle: "SECTION_RELATIVE" },
    data: { numberingStyle: "CONTINUOUS" },
  });
  console.log(`Moved ${count} paper(s) from SECTION_RELATIVE to CONTINUOUS numbering.`);
} finally {
  await prisma.$disconnect();
}
