import "server-only";
import type { z } from "zod";
import type { SessionUser } from "@/lib/api";
import { HttpError } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { resolvePaperExamType } from "@/lib/constants";
import { resolveBoardAndSubjectCode } from "@/lib/curriculumContract";
import { detectPaperLanguage, type PaperLanguage } from "@/lib/localization";
import { assertCanManageScope } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import type { paperCreateSchema } from "@/lib/schemas";

export type PaperCreateInput = z.output<typeof paperCreateSchema>;

/**
 * Creates a paper from a blueprint: scope is checked against `actor`, the paper belongs to `ownerId`
 * (today the same person; later the teacher a paper is assigned to).
 */
export async function createPaperFromBlueprint(input: PaperCreateInput, ownerId: string, actor: SessionUser): Promise<{ id: string }> {
  const user = actor;
  const bp = await prisma.blueprint.findUnique({
    where: { id: input.blueprintId },
    select: {
      id: true,
      name: true,
      examType: true,
      subjectCode: true,
      language: true,
      academicSession: true,
      book: { select: { subject: true, className: true } },
    },
  });
  if (!bp) {
    throw new HttpError(400, "Blueprint not found");
  }
  assertCanManageScope(user, bp.book);
  const resolvedExamType = resolvePaperExamType({
    examType: input.examType,
    title: input.title,
    blueprint: bp,
  });
  const resolvedBoardSubject = resolveBoardAndSubjectCode({
    subject: bp.book.subject,
    className: bp.book.className,
    explicitSubjectCode: input.subjectCode || bp.subjectCode,
    schoolName: input.schoolName,
    blueprintName: bp.name,
    academicSession: input.academicSession || bp.academicSession,
  });
  const resolvedLanguage: PaperLanguage =
    input.language && input.language !== "en"
      ? input.language
      : bp.language && bp.language !== "en"
      ? (bp.language as PaperLanguage)
      : detectPaperLanguage({
          title: input.title,
          subjectCode: input.subjectCode || bp.subjectCode,
          blueprint: bp,
        });

  const paper = await prisma.paper.create({
    data: {
      ...input,
      language: resolvedLanguage,
      subjectCode: resolvedBoardSubject.subjectCode || input.subjectCode || bp.subjectCode || undefined,
      examType: resolvedExamType,
      createdById: ownerId,
    },
  });

  await recordAudit(user, "PAPER_CREATE", "PAPER", paper.id, {
    title: paper.title,
    examType: paper.examType,
    schoolName: paper.schoolName,
    blueprintId: paper.blueprintId,
    academicSession: paper.academicSession,
  });

  return { id: paper.id };
}
