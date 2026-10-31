import {
  resolveInternalChoiceRequirement,
  type InternalChoiceRequirement,
} from "./internalChoiceRules";
import type { PaperData, Section } from "./types";

export interface PaperAutogenSlot {
  slotIndex: number;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  marks: number;
  requiresInternalChoice?: boolean;
}

export interface PaperAutogenSectionPlan {
  sectionId: string;
  sectionTitle: string;
  sectionType: string;
  sectionInstructions?: string;
  marksEach: number;
  requiresInternalChoice?: boolean;
  internalChoiceRequirement?: InternalChoiceRequirement;
  totalQuestionsNeeded: number;
  alreadyPlacedCount: number;
  slots: PaperAutogenSlot[];
}

export interface PaperAutogenPlan {
  paperId: string;
  title: string;
  className: string;
  subject: string;
  bookTitle: string;
  totalMarksNeeded: number;
  totalQuestionsNeeded: number;
  sections: PaperAutogenSectionPlan[];
  chapterQuotas: Array<{
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    targetMarks: number;
    alreadyPlacedMarks: number;
    plannedMarks: number;
  }>;
}

export interface PaperAutogenInput {
  id: string;
  title: string;
  schoolName?: string | null;
  academicSession?: string | null;
  examType?: string | null;
  subjectCode?: string | null;
  blueprint: {
    name?: string | null;
    academicSession?: string | null;
    examType?: string | null;
    subjectCode?: string | null;
    sections: Array<{
      id: string;
      title: string;
      instructions?: string | null;
      type: string;
      count: number;
      marksEach: number;
    }>;
    chapters: Array<{
      chapterId: string;
      marks: number;
      chapter: {
        id: string;
        number: number;
        title: string;
      };
    }>;
    book?: {
      className?: string;
      subject?: string;
      title?: string;
    } | null;
  };
  items: Array<{
    sectionId: string;
    question: {
      chapterId: string;
    };
  }>;
}

/**
 * Plans the assignment of empty question slots in a paper to target chapters
 * based on the blueprint's chapter marks quota.
 *
 * Sorts unfilled slots by marks descending (e.g. 5m -> 4m -> 3m -> 2m -> 1m)
 * and greedily matches them to chapters with highest remaining quota to avoid
 * mark fragmentation.
 */
export function planPaperSlotAssignments(paper: PaperAutogenInput): PaperAutogenPlan {
  const { blueprint, items } = paper;

  // 1. Compute already placed marks and count per chapter
  const placedMarksByChapter = new Map<string, number>();
  const marksBySection = new Map<string, number>(blueprint.sections.map((s) => [s.id, s.marksEach]));
  const placedCountBySection = new Map<string, number>();

  const sectionById = new Map(blueprint.sections.map((s) => [s.id, s]));

  for (const item of items) {
    const sec = sectionById.get(item.sectionId);
    const isMatch = sec?.type === "MATCH_COLUMN" || (item.question as any).type === "MATCH_COLUMN";
    const sectionMarks = marksBySection.get(item.sectionId) ?? 0;
    const chapId = item.question.chapterId;
    if (isMatch) {
      const units = sec?.count ?? 1;
      placedMarksByChapter.set(chapId, (placedMarksByChapter.get(chapId) ?? 0) + sectionMarks * units);
      placedCountBySection.set(item.sectionId, (placedCountBySection.get(item.sectionId) ?? 0) + units);
    } else {
      placedMarksByChapter.set(chapId, (placedMarksByChapter.get(chapId) ?? 0) + sectionMarks);
      placedCountBySection.set(item.sectionId, (placedCountBySection.get(item.sectionId) ?? 0) + 1);
    }
  }

  // 2. Track remaining quotas per chapter
  type ChapterState = {
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    targetMarks: number;
    alreadyPlacedMarks: number;
    remainingQuota: number;
    plannedMarks: number;
  };

  const chapterMap = new Map<string, ChapterState>();
  for (const c of blueprint.chapters) {
    const alreadyPlaced = placedMarksByChapter.get(c.chapterId) ?? 0;
    chapterMap.set(c.chapterId, {
      chapterId: c.chapterId,
      chapterNumber: c.chapter.number,
      chapterTitle: c.chapter.title,
      targetMarks: c.marks,
      alreadyPlacedMarks: alreadyPlaced,
      remainingQuota: Math.max(0, c.marks - alreadyPlaced),
      plannedMarks: 0,
    });
  }

  // Fallback chapter list if blueprint has chapters
  const allChapters = Array.from(chapterMap.values()).sort(
    (a, b) => a.chapterNumber - b.chapterNumber,
  );

  // 3. Build planning units for each section
  type PlanningUnit =
    | {
        kind: "SINGLE_SLOT";
        sectionId: string;
        slotIndex: number;
        marksEach: number;
        totalMarks: number;
        globalOrder: number;
      }
    | {
        kind: "MATCH_GROUP";
        sectionId: string;
        slotCount: number;
        marksEach: number;
        totalMarks: number;
        globalOrder: number;
      };

  const planningUnits: PlanningUnit[] = [];
  let globalOrderCounter = 0;

  for (const sec of blueprint.sections) {
    const placed = placedCountBySection.get(sec.id) ?? 0;
    const needed = Math.max(0, sec.count - placed);
    if (needed === 0) continue;

    // MATCH_COLUMN is generated and saved as a single combined question carrying all pairs.
    // Group all its pairs into one planning block so that its entire mark quota
    // (needed * marksEach) is assigned to a single chapter with sufficient weightage,
    // preventing mark fragmentation across chapters.
    if (sec.type === "MATCH_COLUMN") {
      planningUnits.push({
        kind: "MATCH_GROUP",
        sectionId: sec.id,
        slotCount: needed,
        marksEach: sec.marksEach,
        totalMarks: needed * sec.marksEach,
        globalOrder: globalOrderCounter++,
      });
    } else {
      for (let i = 0; i < needed; i++) {
        planningUnits.push({
          kind: "SINGLE_SLOT",
          sectionId: sec.id,
          slotIndex: placed + i,
          marksEach: sec.marksEach,
          totalMarks: sec.marksEach,
          globalOrder: globalOrderCounter++,
        });
      }
    }
  }

  // 4. Sort planning units descending by totalMarks to fill large mark allocations first
  const sortedUnits = [...planningUnits].sort((a, b) => {
    if (b.totalMarks !== a.totalMarks) return b.totalMarks - a.totalMarks;
    return a.globalOrder - b.globalOrder;
  });

  // 5. Greedily assign planning units to chapters
  const unitAssignments = new Map<PlanningUnit, ChapterState>();

  for (const unit of sortedUnits) {
    if (allChapters.length === 0) break;

    // Find chapters that have enough quota remaining
    const eligible = allChapters
      .filter((c) => c.remainingQuota >= unit.totalMarks)
      .sort((a, b) => b.remainingQuota - a.remainingQuota || a.chapterNumber - b.chapterNumber);

    let chosen: ChapterState;
    if (eligible.length > 0) {
      chosen = eligible[0];
    } else {
      // If no chapter has full quota remaining, pick chapter with highest remaining quota
      const sortedByRem = [...allChapters].sort(
        (a, b) => b.remainingQuota - a.remainingQuota || b.targetMarks - a.targetMarks || a.chapterNumber - b.chapterNumber,
      );
      chosen = sortedByRem[0];
    }

    chosen.remainingQuota -= unit.totalMarks;
    chosen.plannedMarks += unit.totalMarks;
    unitAssignments.set(unit, chosen);
  }

  // 6. Assemble section plans
  const sectionPlans: PaperAutogenSectionPlan[] = blueprint.sections.map((sec) => {
    const placed = placedCountBySection.get(sec.id) ?? 0;
    const needed = Math.max(0, sec.count - placed);

    const choiceReq = resolveInternalChoiceRequirement({
      schoolName: paper.schoolName,
      blueprintName: blueprint.name,
      academicSession: paper.academicSession || blueprint.academicSession,
      className: blueprint.book?.className,
      subject: blueprint.book?.subject,
      subjectCode: paper.subjectCode || blueprint.subjectCode,
      examType: paper.examType || blueprint.examType,
      sectionTitle: sec.title,
      sectionInstructions: sec.instructions,
      questionType: sec.type,
      marksEach: sec.marksEach,
    });

    let sectionSlots: PaperAutogenSlot[] = [];

    if (sec.type === "MATCH_COLUMN") {
      const matchUnit = planningUnits.find(
        (u): u is Extract<PlanningUnit, { kind: "MATCH_GROUP" }> =>
          u.kind === "MATCH_GROUP" && u.sectionId === sec.id,
      );
      if (matchUnit && unitAssignments.has(matchUnit)) {
        const assignedChap = unitAssignments.get(matchUnit)!;
        sectionSlots = Array.from({ length: matchUnit.slotCount }, (_, idx) => ({
          slotIndex: placed + idx,
          chapterId: assignedChap.chapterId,
          chapterNumber: assignedChap.chapterNumber,
          chapterTitle: assignedChap.chapterTitle,
          marks: sec.marksEach,
          requiresInternalChoice: false,
        }));
      }
    } else {
      const singleUnits = planningUnits.filter(
        (u): u is Extract<PlanningUnit, { kind: "SINGLE_SLOT" }> =>
          u.kind === "SINGLE_SLOT" && u.sectionId === sec.id,
      );
      sectionSlots = singleUnits
        .sort((a, b) => a.slotIndex - b.slotIndex)
        .map((s) => {
          const assignedChap = unitAssignments.get(s)!;
          return {
            slotIndex: s.slotIndex,
            chapterId: assignedChap.chapterId,
            chapterNumber: assignedChap.chapterNumber,
            chapterTitle: assignedChap.chapterTitle,
            marks: s.marksEach,
            requiresInternalChoice: choiceReq.required,
          };
        });
    }

    return {
      sectionId: sec.id,
      sectionTitle: sec.title,
      sectionType: sec.type,
      sectionInstructions: sec.instructions || undefined,
      marksEach: sec.marksEach,
      requiresInternalChoice: choiceReq.required,
      internalChoiceRequirement: choiceReq,
      totalQuestionsNeeded: needed,
      alreadyPlacedCount: placed,
      slots: sectionSlots,
    };
  });

  const totalMarksNeeded = sectionPlans.reduce(
    (acc, s) => acc + s.slots.reduce((m, sl) => m + sl.marks, 0),
    0,
  );
  const totalQuestionsNeeded = sectionPlans.reduce((acc, s) => acc + s.slots.length, 0);

  return {
    paperId: paper.id,
    title: paper.title,
    className: blueprint.book?.className || "Class",
    subject: blueprint.book?.subject || "Subject",
    bookTitle: blueprint.book?.title || "",
    totalMarksNeeded,
    totalQuestionsNeeded,
    sections: sectionPlans,
    chapterQuotas: allChapters.map((c) => ({
      chapterId: c.chapterId,
      chapterNumber: c.chapterNumber,
      chapterTitle: c.chapterTitle,
      targetMarks: c.targetMarks,
      alreadyPlacedMarks: c.alreadyPlacedMarks,
      plannedMarks: c.plannedMarks,
    })),
  };
}
