import { body, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { printRunCalculationSchema } from "@/lib/schemas";

export const GET = route(async (req) => {
  const { searchParams } = new URL(req.url);
  const className = searchParams.get("className");
  const academicSession = searchParams.get("academicSession");

  const where: Record<string, unknown> = {};
  if (className && className !== "ALL") where.className = className;
  if (academicSession && academicSession !== "ALL") where.academicSession = academicSession.replace(/-/g, "–");

  const calculations = await prisma.printRunCalculation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return calculations.map((c) => ({
    ...c,
    sections: JSON.parse(c.sectionsJson || "[]"),
    sets: JSON.parse(c.setsJson || "[]"),
    createdAt: c.createdAt.toISOString(),
  }));
});

export const POST = route(async (req, _params, user) => {
  const input = await body(req, printRunCalculationSchema);

  // Compute paper budget metrics
  // Booklet: 1 sheet = 4 page sides (A4 sheet folded to A5, or A3 sheet folded to A4). Page: 1 A4 sheet duplex = 2 page sides
  const isBooklet = input.layout === "BOOKLET" || input.layout === "BOOKLET_A4";
  const sheetsPerCopy = isBooklet
    ? Math.max(1, Math.ceil(input.pageCount / 4))
    : Math.max(1, Math.ceil(input.pageCount / 2));

  const totalRawSheets = input.totalStudents * sheetsPerCopy;
  const wastageSheets = Math.ceil(totalRawSheets * (input.wastagePercent / 100));
  const totalSheetsRequired = totalRawSheets + wastageSheets;
  const totalReamsRequired = parseFloat((totalSheetsRequired / 500).toFixed(2));

  // Compute packaging slips per section with distributed sets
  const packagingSlips = input.sections.map((section) => {
    const setCount = input.sets.length || 1;
    const basePerSet = Math.floor(section.count / setCount);
    let remainder = section.count % setCount;

    const setBreakdown = input.sets.map((s) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder--;
      return {
        set: s.set,
        copies: basePerSet + extra,
      };
    });

    return {
      section: section.name,
      studentCount: section.count,
      sheetsRequired: section.count * sheetsPerCopy,
      answerBookletsRequired: section.count,
      sets: setBreakdown,
    };
  });

  const created = await prisma.printRunCalculation.create({
    data: {
      paperId: input.paperId ?? null,
      paperTitle: input.paperTitle,
      academicSession: input.academicSession,
      className: input.className,
      subject: input.subject,
      layout: input.layout,
      pageCount: input.pageCount,
      totalStudents: input.totalStudents,
      sectionsJson: JSON.stringify(input.sections),
      setsJson: JSON.stringify(input.sets),
      wastagePercent: input.wastagePercent,
      totalSheetsRequired,
      totalReamsRequired,
      answerBookletCount: input.answerBookletCount || input.totalStudents,
      notes: input.notes,
      createdById: user.id,
    },
  });

  await recordAudit(user, "CALCULATOR_ESTIMATE", "LOGISTICS", created.id, {
    paperTitle: input.paperTitle,
    className: input.className,
    totalStudents: input.totalStudents,
    totalSheets: totalSheetsRequired,
    totalReams: totalReamsRequired,
  });

  return {
    id: created.id,
    paperId: created.paperId,
    paperTitle: created.paperTitle,
    academicSession: created.academicSession,
    className: created.className,
    subject: created.subject,
    layout: created.layout,
    pageCount: created.pageCount,
    sheetsPerCopy,
    totalStudents: created.totalStudents,
    sections: input.sections,
    sets: input.sets,
    wastagePercent: created.wastagePercent,
    rawSheets: totalRawSheets,
    wastageSheets,
    totalSheetsRequired,
    totalReamsRequired,
    answerBookletCount: created.answerBookletCount,
    packagingSlips,
    notes: created.notes,
    createdAt: created.createdAt.toISOString(),
  };
});
