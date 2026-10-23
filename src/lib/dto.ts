import type { Chapter, Question } from "@prisma/client";
import {
  MARKS_STYLES,
  NUMBERING_STYLES,
  PRINT_DENSITIES,
  type MarksStyle,
  type NumberingStyle,
  type PrintDensity,
} from "./constants";
import { parseSubparts, type QuestionUsageTag, type SubPart } from "./types";

export type QuestionDto = {
  id: string;
  bookId: string;
  chapterId: string;
  type: string;
  text: string;
  options: string[];
  answer: string;
  difficulty: string;
  imagePath: string | null;
  spaceMm: number;
  showGrid: boolean;
  createdAt: string;
  createdById?: string;
  chapter?: { id: string; number: number; title: string };
  timesUsed?: number;
  subparts: SubPart[];
  subpartsJson?: string;
  usages?: QuestionUsageTag[];
};

export type PaperSnapshotDto = {
  id: string;
  paperId: string;
  name: string;
  snapshotJson: string;
  createdById: string;
  createdAt: string;
  createdByName?: string;
};

export type PaperDto = {
  id: string;
  title: string;
  blueprintId: string;
  layout: string;
  schoolName: string;
  examDate: string;
  paperSet: string;
  subjectCode: string;
  generalInstructions: string;
  status: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  academicSession: string;
  schoolLogo: string | null;
  logoPath: string | null;
  printDensity: PrintDensity;
  twoColumn: boolean;
  targetPages: number | null;
  numberingStyle: NumberingStyle;
  marksStyle: MarksStyle;
  showCandidateDetails: boolean;
  showSignatures: boolean;
};

export type BlueprintDto = {
  id: string;
  name: string;
  bookId: string;
  examType: string;
  durationMin: number;
  subjectCode: string;
  createdAt: string;
  updatedAt: string;
};

export function toQuestionDto(
  q: Omit<Question, "createdAt"> & {
    createdAt: Date | string;
    chapter?: Pick<Chapter, "id" | "number" | "title">;
    _count?: { paperQuestions?: number; orPaperQuestions?: number };
    subpartsJson?: string | null;
    paperQuestions?: Array<{
      paperId: string;
      orQuestionId?: string | null;
      paper?: {
        title: string;
        paperSet: string;
        examDate: string;
        academicSession?: string;
        status?: string;
        blueprint?: { book?: { className: string; subject?: string } };
      };
    }>;
    orPaperQuestions?: Array<{
      paperId: string;
      orQuestionId?: string | null;
      paper?: {
        title: string;
        paperSet: string;
        examDate: string;
        academicSession?: string;
        status?: string;
        blueprint?: { book?: { className: string; subject?: string } };
      };
    }>;
  },
): QuestionDto {
  let options: string[] = [];
  try {
    const parsed = JSON.parse(q.optionsJson);
    options = Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    /* corrupt options -> treat as none */
    options = [];
  }

  let subparts: SubPart[] = [];
  if ("subpartsJson" in q && typeof (q as { subpartsJson?: string | null }).subpartsJson === "string") {
    subparts = parseSubparts((q as { subpartsJson?: string | null }).subpartsJson);
  }

  let usages: QuestionUsageTag[] | undefined = undefined;
  const hasPaperQuestions = "paperQuestions" in q && Array.isArray(q.paperQuestions);
  const hasOrPaperQuestions = "orPaperQuestions" in q && Array.isArray(q.orPaperQuestions);

  if (hasPaperQuestions || hasOrPaperQuestions) {
    usages = [];
    if (hasPaperQuestions && q.paperQuestions) {
      for (const pq of q.paperQuestions) {
        if (!pq) continue;
        const usageItem: QuestionUsageTag = {
          paperId: pq.paperId,
          paperTitle: pq.paper?.title ?? "",
          paperSet: pq.paper?.paperSet ?? "",
          examDate: pq.paper?.examDate ?? "",
          academicSession: pq.paper?.academicSession ?? "2025–26",
          className: pq.paper?.blueprint?.book?.className ?? "",
          isOrChoice: Boolean(pq.orQuestionId && pq.orQuestionId === q.id),
        };
        if (pq.paper?.status) {
          usageItem.status = pq.paper.status;
        }
        if (pq.paper?.blueprint?.book?.subject) {
          usageItem.subject = pq.paper.blueprint.book.subject;
        }
        usages.push(usageItem);
      }
    }
    if (hasOrPaperQuestions && q.orPaperQuestions) {
      for (const opq of q.orPaperQuestions) {
        if (!opq) continue;
        const usageItem: QuestionUsageTag = {
          paperId: opq.paperId,
          paperTitle: opq.paper?.title ?? "",
          paperSet: opq.paper?.paperSet ?? "",
          examDate: opq.paper?.examDate ?? "",
          academicSession: opq.paper?.academicSession ?? "2025–26",
          className: opq.paper?.blueprint?.book?.className ?? "",
          isOrChoice: true,
        };
        if (opq.paper?.status) {
          usageItem.status = opq.paper.status;
        }
        if (opq.paper?.blueprint?.book?.subject) {
          usageItem.subject = opq.paper.blueprint.book.subject;
        }
        usages.push(usageItem);
      }
    }
  }

  return {
    id: q.id,
    bookId: q.bookId,
    chapterId: q.chapterId,
    type: q.type,
    text: q.text,
    options,
    answer: q.answer,
    difficulty: q.difficulty,
    imagePath: q.imagePath,
    spaceMm: q.spaceMm,
    showGrid: q.showGrid,
    createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : String(q.createdAt),
    createdById: (q as { createdById?: string }).createdById,
    chapter: q.chapter && { id: q.chapter.id, number: q.chapter.number, title: q.chapter.title },
    timesUsed: q._count
      ? (q._count.paperQuestions ?? 0) + (q._count.orPaperQuestions ?? 0)
      : usages !== undefined
      ? usages.length
      : undefined,
    subparts,
    subpartsJson: q.subpartsJson ?? undefined,
    usages,
  };
}

export const toQuestionData = toQuestionDto;

export function toSnapshotDto(s: {
  id: string;
  paperId: string;
  name: string;
  snapshotJson: string;
  createdById: string;
  createdAt: Date | string;
  createdBy?: { name: string } | null;
}): PaperSnapshotDto {
  return {
    id: s.id,
    paperId: s.paperId,
    name: s.name,
    snapshotJson: s.snapshotJson,
    createdById: s.createdById,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
    createdByName: s.createdBy?.name,
  };
}

export function toPaperDto(p: {
  id: string;
  title: string;
  blueprintId: string;
  layout: string;
  schoolName: string;
  examDate?: string | null;
  paperSet?: string | null;
  subjectCode?: string | null;
  generalInstructions?: string | null;
  status?: string | null;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  academicSession?: string | null;
  schoolLogo?: string | null;
  logoPath?: string | null;
  printDensity?: PrintDensity | string | null;
  twoColumn?: boolean | null;
  targetPages?: number | null;
  numberingStyle?: NumberingStyle | string | null;
  marksStyle?: MarksStyle | string | null;
  showCandidateDetails?: boolean | null;
  showSignatures?: boolean | null;
}): PaperDto {
  const printDensity: PrintDensity =
    p.printDensity && (PRINT_DENSITIES as readonly string[]).includes(p.printDensity)
      ? (p.printDensity as PrintDensity)
      : "STANDARD";

  const numberingStyle: NumberingStyle =
    p.numberingStyle && (NUMBERING_STYLES as readonly string[]).includes(p.numberingStyle)
      ? (p.numberingStyle as NumberingStyle)
      : "CONTINUOUS";

  const marksStyle: MarksStyle =
    p.marksStyle && (MARKS_STYLES as readonly string[]).includes(p.marksStyle)
      ? (p.marksStyle as MarksStyle)
      : "INLINE";

  return {
    id: p.id,
    title: p.title,
    blueprintId: p.blueprintId,
    layout: p.layout,
    schoolName: p.schoolName,
    examDate: p.examDate ?? "",
    paperSet: p.paperSet ?? "",
    subjectCode: p.subjectCode ?? "",
    generalInstructions: p.generalInstructions ?? "",
    status: p.status ?? "DRAFT",
    createdById: p.createdById,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    academicSession: p.academicSession ?? "2025–26",
    schoolLogo: p.schoolLogo ?? p.logoPath ?? null,
    logoPath: p.logoPath ?? p.schoolLogo ?? null,
    printDensity,
    twoColumn: Boolean(p.twoColumn),
    targetPages: p.targetPages ?? null,
    numberingStyle,
    marksStyle,
    showCandidateDetails: p.showCandidateDetails ?? true,
    showSignatures: p.showSignatures ?? false,
  };
}

export function toBlueprintDto(bp: {
  id: string;
  name: string;
  bookId: string;
  examType: string;
  durationMin: number;
  subjectCode?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): BlueprintDto {
  return {
    id: bp.id,
    name: bp.name,
    bookId: bp.bookId,
    examType: bp.examType,
    durationMin: bp.durationMin,
    subjectCode: bp.subjectCode ?? "",
    createdAt: bp.createdAt instanceof Date ? bp.createdAt.toISOString() : String(bp.createdAt),
    updatedAt: bp.updatedAt instanceof Date ? bp.updatedAt.toISOString() : String(bp.updatedAt),
  };
}


