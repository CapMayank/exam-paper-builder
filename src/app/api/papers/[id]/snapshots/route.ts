import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import type { PaperSnapshotPayload } from "@/lib/types";

export const GET = route(async (_req, params, _user) => {
  const { id } = await params;
  const snapshots = await prisma.paperSnapshot.findMany({
    where: { paperId: id },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return snapshots.map((s) => {
    let itemCount = 0;
    try {
      const parsed = JSON.parse(s.snapshotJson);
      itemCount = Array.isArray(parsed?.items) ? parsed.items.length : 0;
    } catch {}
    return {
      id: s.id,
      paperId: s.paperId,
      name: s.name,
      createdAt: s.createdAt.toISOString(),
      createdById: s.createdById,
      createdByName: s.createdBy?.name || s.createdBy?.email || "Teacher",
      itemCount,
    };
  });
});

export const POST = route(async (req, params, user) => {
  const { id } = await params;
  const current = await loadPaperView(id);
  if (!current) throw new HttpError(404, "Paper not found");

  assertCanModifyPaper(user, current);

  const body = await req.json().catch(() => ({}));
  const now = new Date();
  const defaultName = `Snapshot - ${now.toLocaleDateString([], { month: "short", day: "numeric" })}, ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const snapshotName = typeof body.name === "string" && body.name.trim() ? body.name.trim() : defaultName;

  const payload: PaperSnapshotPayload = {
    paperId: current.id,
    title: current.title,
    layout: current.layout,
    schoolName: current.schoolName,
    examDate: current.examDate,
    paperSet: current.paperSet ?? "",
    subjectCode: current.subjectCode ?? "",
    generalInstructions: current.generalInstructions ?? "",
    academicSession: current.academicSession ?? "2025–26",
    logoPath: current.logoPath,
    schoolLogo: current.schoolLogo,
    printDensity: (current.printDensity as any) || "STANDARD",
    twoColumn: current.twoColumn,
    targetPages: current.targetPages,
    numberingStyle: (current.numberingStyle as any) || "CONTINUOUS",
    marksStyle: (current.marksStyle as any) || "INLINE",
    showCandidateDetails: current.showCandidateDetails,
    showSignatures: current.showSignatures,
    items: current.items.map((it) => ({
      sectionId: it.sectionId,
      position: it.position,
      questionId: it.question.id,
      orQuestionId: it.orQuestion?.id || null,
    })),
    timestamp: now.toISOString(),
  };

  const created = await prisma.paperSnapshot.create({
    data: {
      paperId: id,
      name: snapshotName,
      snapshotJson: JSON.stringify(payload),
      createdById: user.id,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  await recordAudit(user, "PAPER_SNAPSHOT_CREATE", "PAPER", id, {
    snapshotId: created.id,
    name: created.name,
    itemCount: payload.items.length,
  });

  return {
    id: created.id,
    paperId: created.paperId,
    name: created.name,
    createdAt: created.createdAt.toISOString(),
    createdById: created.createdById,
    createdByName: created.createdBy?.name || created.createdBy?.email || "Teacher",
    itemCount: payload.items.length,
  };
});
