import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";

export const GET = route(async (_req, params, user) => {
  const { id, snapshotId } = await params;
  const current = await loadPaperView(id);
  if (!current) throw new HttpError(404, "Paper not found");

  const snapshot = await prisma.paperSnapshot.findFirst({
    where: { id: snapshotId, paperId: id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!snapshot) throw new HttpError(404, "Snapshot not found");

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(snapshot.snapshotJson);
  } catch {}

  return {
    id: snapshot.id,
    paperId: snapshot.paperId,
    name: snapshot.name,
    createdAt: snapshot.createdAt.toISOString(),
    createdById: snapshot.createdById,
    createdByName: snapshot.createdBy?.name || snapshot.createdBy?.email || "Teacher",
    payload: parsed,
  };
});

export const DELETE = route(async (_req, params, user) => {
  const { id, snapshotId } = await params;
  const current = await loadPaperView(id);
  if (!current) throw new HttpError(404, "Paper not found");

  assertCanModifyPaper(user, current);

  const snapshot = await prisma.paperSnapshot.findFirst({
    where: { id: snapshotId, paperId: id },
  });
  if (!snapshot) throw new HttpError(404, "Snapshot not found");

  await prisma.paperSnapshot.delete({
    where: { id: snapshotId },
  });

  await recordAudit(user, "PAPER_SNAPSHOT_DELETE", "PAPER", id, {
    snapshotId,
    snapshotName: snapshot.name,
  });

  return { success: true, message: `Deleted snapshot "${snapshot.name}".` };
});
