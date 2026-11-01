import "server-only";
import type { z } from "zod";
import { HttpError } from "./api";
import { validateBlueprint } from "./blueprint";
import { prisma } from "./prisma";
import type { blueprintSchema } from "./schemas";

export type BlueprintInput = z.infer<typeof blueprintSchema>;

export const blueprintInclude = {
  book: { select: { id: true, title: true, subject: true, className: true } },
  chapters: { include: { chapter: { select: { id: true, number: true, title: true } } }, orderBy: { chapter: { number: "asc" } } },
  sections: { orderBy: { position: "asc" } },
  curriculumTemplate: { select: { id: true, templateCode: true, title: true, archetype: true } },
  curriculumVariant: { select: { id: true, code: true, name: true } },
  _count: { select: { papers: true } },
} as const;

import {
  MPBSE_BLUEPRINT_TEMPLATES,
  STANDARD_BLUEPRINT_TEMPLATES,
  TERM_CONFIGS,
  adaptChaptersHamiltonHare,
  normalizeQuestionType,
  type BlueprintTemplate,
  type ExaminationTerm,
} from "./curriculumTemplates";

export * from "./curriculumTemplates";

export function loadBlueprint(id: string) {
  return prisma.blueprint.findUnique({ where: { id }, include: blueprintInclude });
}

/** Throws 400 unless the blueprint is internally consistent and its chapters belong to its book. */
export async function assertBlueprintValid(input: BlueprintInput) {
  const errors = validateBlueprint(input);
  if (errors.length) throw new HttpError(400, errors.join(" "));
  const chapters = await prisma.chapter.findMany({
    where: { id: { in: input.chapters.map((c) => c.chapterId) } },
    select: { id: true, bookId: true },
  });
  if (chapters.length !== input.chapters.length || chapters.some((c) => c.bookId !== input.bookId)) {
    throw new HttpError(400, "All chapters must belong to the chosen book");
  }
}

/**
 * Maps a CurriculumBlueprintTemplate (from DB or built-in templates) + Book to a valid BlueprintInput.
 */
export async function mapCurriculumTemplateToBlueprintInput(
  templateIdOrCode: string,
  bookId: string
): Promise<BlueprintInput> {
  const dbTemplate = await prisma.curriculumBlueprintTemplate.findFirst({
    where: {
      OR: [{ id: templateIdOrCode }, { templateCode: templateIdOrCode }],
    },
    include: {
      subject: {
        include: {
          textbooks: { include: { chapters: true } },
          marksSchemes: true,
        },
      },
    },
  });

  const staticTemplate = STANDARD_BLUEPRINT_TEMPLATES.find(
    (t) => t.id === templateIdOrCode || t.templateCode === templateIdOrCode
  );

  if (!dbTemplate && !staticTemplate) {
    throw new HttpError(404, `Curriculum blueprint template "${templateIdOrCode}" not found.`);
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { chapters: { orderBy: { number: "asc" } } },
  });
  if (!book) {
    throw new HttpError(404, `Textbook with id "${bookId}" not found.`);
  }

  const title = dbTemplate ? dbTemplate.title : staticTemplate!.title;
  const templateCode = dbTemplate ? dbTemplate.templateCode : staticTemplate!.templateCode;
  const templateId = dbTemplate ? dbTemplate.id : staticTemplate!.id;
  const totalMarks = dbTemplate ? dbTemplate.totalMarks : staticTemplate!.totalMarks;
  const durationMin = dbTemplate ? dbTemplate.durationMin : staticTemplate!.durationMin;
  const subjectCode = dbTemplate ? dbTemplate.subject.code : staticTemplate!.subjectCode || "";
  const language = (dbTemplate ? (dbTemplate.subject.name.toLowerCase().includes("sanskrit") ? "sa" : "hi") : staticTemplate!.language || "hi") as "en" | "hi" | "sa" | "bilingual";

  // Reconcile sections
  type RawSection = {
    title: string;
    instructions?: string | null;
    type: string;
    count: number;
    marksEach: number;
    orChoiceMode?: string | null;
    orAlternativeCount?: number | null;
    orSlotsJson?: string | null;
    choicePolicy?: { policyType: string };
  };

  let rawSections: RawSection[] = [];
  if (dbTemplate && Array.isArray(dbTemplate.sectionsJson) && dbTemplate.sectionsJson.length > 0) {
    rawSections = dbTemplate.sectionsJson as RawSection[];
  } else if (staticTemplate) {
    rawSections = staticTemplate.sections.flatMap((g) =>
      g.questionTypes.map((qt) => ({
        title: g.title,
        instructions: g.instructions,
        type: qt.type,
        count: qt.count,
        marksEach: qt.marksEach,
        orChoiceMode: qt.orChoiceMode,
        orAlternativeCount: qt.orAlternativeCount,
        choicePolicy: qt.choicePolicy,
      }))
    );
  }

  const sections = rawSections.map((s) => {
    const normType = normalizeQuestionType(s.type);
    let choiceMode: "BOARD_DEFAULT" | "REQUIRED" | "NOT_REQUIRED" = "BOARD_DEFAULT";
    if (s.orChoiceMode === "NO_CHOICE" || s.choicePolicy?.policyType === "NO_CHOICE" || s.orChoiceMode === "NOT_REQUIRED") {
      choiceMode = "NOT_REQUIRED";
    } else if (s.orChoiceMode === "FULL_OR_ALTERNATIVE" || s.choicePolicy?.policyType === "FULL_OR_ALTERNATIVE" || s.orChoiceMode === "REQUIRED") {
      choiceMode = "REQUIRED";
    } else if (s.marksEach === 2) {
      choiceMode = "NOT_REQUIRED";
    } else if (s.marksEach === 3 || s.marksEach === 4) {
      choiceMode = "REQUIRED";
    }

    return {
      title: s.title,
      instructions: s.instructions || "",
      type: normType,
      count: s.count,
      marksEach: s.marksEach,
      orChoiceMode: choiceMode,
      orAlternativeCount: s.orAlternativeCount ?? (choiceMode === "REQUIRED" ? 1 : 0),
      orSlotsJson: s.orSlotsJson || "[]",
    };
  });

  // Reconcile chapters and official marks
  const currChapters = dbTemplate ? dbTemplate.subject.textbooks.flatMap((tb) => tb.chapters) : [];
  const marksScheme = dbTemplate?.subject.marksSchemes[0];
  const unitBreakdown = (marksScheme?.unitBreakdown as Array<{ title?: string; officialMarks: number; chapterIds?: string[] }>) || [];

  const rawChapterAllocations = book.chapters.map((ch) => {
    const currCh = currChapters.find(
      (c) => c.legacyChapterId === ch.id || c.chapterNumber === ch.number
    );
    let officialMarks = currCh?.officialMarks || 0;
    if (currCh?.isDeleted) {
      officialMarks = 0;
    } else if (!officialMarks && currCh && unitBreakdown.length > 0) {
      const unit = unitBreakdown.find((u) => u.chapterIds?.includes(currCh.id));
      if (unit && unit.chapterIds && unit.chapterIds.length > 0) {
        officialMarks = Math.round(unit.officialMarks / unit.chapterIds.length);
      }
    }
    return {
      chapterId: ch.id,
      officialMarks,
      isDeleted: Boolean(currCh?.isDeleted),
    };
  });

  // Calculate sum of chapter marks vs section total marks
  const targetSectionMarks = sections.reduce((sum, s) => sum + s.count * s.marksEach, 0);
  const nonDeletedChapters = rawChapterAllocations.filter((c) => !c.isDeleted);
  const currentChapterSum = nonDeletedChapters.reduce((sum, c) => sum + c.officialMarks, 0);

  let finalChapters: Array<{ chapterId: string; marks: number }>;
  if (currentChapterSum === targetSectionMarks && nonDeletedChapters.length > 0) {
    // Exact official match
    finalChapters = rawChapterAllocations.map((c) => ({
      chapterId: c.chapterId,
      marks: c.isDeleted ? 0 : c.officialMarks,
    }));
  } else if (nonDeletedChapters.length > 0) {
    // Reconcile using Hamilton-Hare largest remainder method
    const minDenom = Math.min(...sections.map((s) => s.marksEach));
    const adapted = adaptChaptersHamiltonHare(
      nonDeletedChapters.map((c) => ({ chapterId: c.chapterId, officialMarks: c.officialMarks || 1 })),
      targetSectionMarks,
      minDenom
    );
    const adaptedMap = new Map(adapted.map((a) => [a.chapterId, a.marks]));
    finalChapters = rawChapterAllocations.map((c) => ({
      chapterId: c.chapterId,
      marks: c.isDeleted ? 0 : (adaptedMap.get(c.chapterId) || 0),
    }));
  } else {
    // Fallback: equal distribution across all book chapters
    const count = book.chapters.length || 1;
    const baseMark = Math.floor(targetSectionMarks / count);
    const remainder = targetSectionMarks % count;
    finalChapters = book.chapters.map((ch, idx) => ({
      chapterId: ch.id,
      marks: baseMark + (idx < remainder ? 1 : 0),
    }));
  }

  return {
    name: title,
    bookId,
    academicSession: dbTemplate ? dbTemplate.academicSession : "2026-27",
    examType: "ANNUAL",
    durationMin,
    subjectCode,
    language,
    curriculumMode: "STANDARD_MPBSE",
    curriculumTemplateId: templateId,
    curriculumVariantId: null,
    sections,
    chapters: finalChapters,
  };
}

/**
 * Adapts a standard board blueprint for school term exams (Quarterly, Half-Yearly, Unit Test, Pre-Board)
 * applying Hamilton-Hare proportional allocation and preserving Circular 465 rules.
 */
export async function adaptCustomSchoolBlueprint(
  baseTemplateIdOrCode: string,
  bookId: string,
  term: ExaminationTerm,
  activeChapterIds: string[]
): Promise<BlueprintInput> {
  const baseInput = await mapCurriculumTemplateToBlueprintInput(baseTemplateIdOrCode, bookId);
  const config = TERM_CONFIGS[term] || TERM_CONFIGS.QUARTERLY;
  const targetMarks = config.targetMarks;

  if (activeChapterIds.length === 0) {
    throw new HttpError(400, "At least one active chapter must be selected for term adaptation.");
  }

  const baseSectionsTotal = baseInput.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);

  // 1. Scale Sections if required by reduced-mark term
  let adaptedSections = [...baseInput.sections];
  if (config.proportionalScaling && targetMarks < baseSectionsTotal) {
    const scaleFactor = targetMarks / baseSectionsTotal;
    adaptedSections = baseInput.sections.map((sec) => {
      const scaledCount = Math.max(1, Math.round(sec.count * scaleFactor));
      return { ...sec, count: scaledCount };
    });

    const scaledTotal = adaptedSections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
    const diff = targetMarks - scaledTotal;
    if (diff !== 0) {
      const sec1m = adaptedSections.find((s) => s.marksEach === 1);
      if (sec1m && sec1m.count + diff >= 1) {
        sec1m.count += diff;
      } else {
        const sorted = [...adaptedSections].sort((a, b) => a.marksEach - b.marksEach);
        const targetSec = sorted[0];
        if (targetSec) {
          const adjCount = Math.round(diff / targetSec.marksEach);
          if (targetSec.count + adjCount >= 1) {
            targetSec.count += adjCount;
          }
        }
      }
    }

    // Preserve Circular 465 rules on adapted sections
    adaptedSections = adaptedSections.map((sec) => {
      if (sec.marksEach === 2) {
        return { ...sec, orChoiceMode: "NOT_REQUIRED" as const, orAlternativeCount: 0 };
      }
      if (sec.marksEach === 3 || sec.marksEach === 4) {
        return { ...sec, orChoiceMode: "REQUIRED" as const, orAlternativeCount: 1 };
      }
      return sec;
    });
  }

  // 2. Proportional Chapter Marks Allocation via Hamilton-Hare
  const denominations = Array.from(new Set(adaptedSections.map((s) => s.marksEach))).sort((a, b) => a - b);
  const minDenom = denominations[0] || 1;

  const activeChapters = baseInput.chapters.filter((c) => activeChapterIds.includes(c.chapterId));
  const adaptedActiveChapters = adaptChaptersHamiltonHare(activeChapters, targetMarks, minDenom);
  const activeMarksMap = new Map(adaptedActiveChapters.map((a) => [a.chapterId, a.marks]));

  const finalChapters = baseInput.chapters.map((ch) => ({
    chapterId: ch.chapterId,
    marks: activeMarksMap.get(ch.chapterId) || 0,
  }));

  return {
    ...baseInput,
    name: `${baseInput.name} [${term} Adapted]`,
    examType: term === "PRE_BOARD" ? "ANNUAL" : term === "UNIT_TEST" ? "QUARTERLY" : term,
    durationMin: config.durationMin,
    curriculumMode: "CUSTOM_SCHOOL",
    sections: adaptedSections,
    chapters: finalChapters,
  };
}
