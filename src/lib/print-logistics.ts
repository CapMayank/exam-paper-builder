import type { AcademicClassDto, ClassSectionInput, SetDistribution } from "./types";

/**
 * Calculates raw sheets per copy depending on layout and page count.
 * Booklet layouts fold sheets (1 sheet = 4 pages). Page duplex layouts print front and back (1 sheet = 2 pages).
 */
export function calculateSheetsPerCopy(layout: string, pageCount: number): number {
  const isBooklet = layout === "BOOKLET" || layout === "BOOKLET_A4";
  const validPages = Math.max(1, pageCount);
  return isBooklet
    ? Math.max(1, Math.ceil(validPages / 4))
    : Math.max(1, Math.ceil(validPages / 2));
}

export type PrintLogisticsMetrics = {
  sheetsPerCopy: number;
  rawSheets: number;
  wastageSheets: number;
  totalSheetsRequired: number;
  totalReamsRequired: number;
  reamsToOrder: number;
  answerBookletsRequired: number;
};

/**
 * Calculates sheet and ream requirements including configured wastage percentage buffers.
 */
export function calculatePrintLogistics(params: {
  totalStudents: number;
  layout: string;
  pageCount: number;
  wastagePercent: number;
}): PrintLogisticsMetrics {
  const { totalStudents, layout, pageCount, wastagePercent } = params;
  const safeStudents = Math.max(0, Math.floor(totalStudents) || 0);
  const sheetsPerCopy = calculateSheetsPerCopy(layout, pageCount);
  const rawSheets = safeStudents * sheetsPerCopy;
  const wastageSheets = Math.ceil(rawSheets * ((Number(wastagePercent) || 0) / 100));
  const totalSheetsRequired = rawSheets + wastageSheets;
  const totalReamsRequired = parseFloat((totalSheetsRequired / 500).toFixed(2));
  const reamsToOrder = Math.ceil(totalSheetsRequired / 500);
  const answerBookletsRequired = safeStudents;

  return {
    sheetsPerCopy,
    rawSheets,
    wastageSheets,
    totalSheetsRequired,
    totalReamsRequired,
    reamsToOrder,
    answerBookletsRequired,
  };
}

/**
 * Distributes student count across sets as evenly as possible.
 * Guarantees that the sum of copies across sets equals the total student count.
 */
export function distributeSetsEvenly(
  totalCount: number,
  sets: Array<{ set: string }>
): SetDistribution[] {
  const setCount = sets.length || 1;
  const basePerSet = Math.floor(totalCount / setCount);
  let remainder = totalCount % setCount;

  return sets.map((s) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder--;
    return {
      set: s.set,
      count: basePerSet + extra,
    };
  });
}

export type SectionPackagingSlip = {
  section: string;
  studentCount: number;
  sheetsRequired: number;
  answerBookletsRequired: number;
  sets: Array<{ set: string; copies: number }>;
};

/**
 * Generates packaging slips per section with distributed sets for printing packs.
 */
export function generatePackagingSlips(
  sections: ClassSectionInput[],
  sets: Array<{ set: string }>,
  sheetsPerCopy: number
): SectionPackagingSlip[] {
  return sections.map((section) => {
    const setCount = sets.length || 1;
    const basePerSet = Math.floor(section.count / setCount);
    let remainder = section.count % setCount;

    const setBreakdown = sets.map((s) => {
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
}

/**
 * Auto-populates section student enrollment counts from AcademicClassDto.
 * Falls back to 40 if sectionDetails is missing or count is not positive.
 */
export function getSectionsForClass(cls?: AcademicClassDto | null): ClassSectionInput[] {
  if (!cls) {
    return [{ name: "Section A", count: 40 }];
  }
  if (cls.sectionDetails && cls.sectionDetails.length > 0) {
    return cls.sectionDetails.map((sec) => ({
      name: `${cls.name} - Section ${sec.name}`,
      count: sec.studentCount > 0 ? sec.studentCount : 40,
    }));
  }
  const secs = cls.sections && cls.sections.length > 0 ? cls.sections : ["A"];
  return secs.map((s) => ({
    name: `${cls.name} - Section ${s}`,
    count: 40,
  }));
}
