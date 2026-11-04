import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { EXAM_TYPES } from "@/lib/constants";
import { isAdmin, canManageScope } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    ids: z.array(z.string().min(1)).min(1).max(300),
    examType: z.enum(EXAM_TYPES).optional(),
    durationMin: z.number().int().min(5).max(600).optional(),
  }),
  z.object({ action: z.literal("delete"), ids: z.array(z.string().min(1)).min(1).max(300) }),
]);

type Skipped = { id: string; name: string; reason: string };

/**
 * POST { action: "update", ids, examType?, durationMin? }  change the exam and time allowed of many blueprints
 * POST { action: "delete", ids }                            delete many blueprints
 *
 * The time allowed is read from the blueprint, so papers already made follow it. A paper keeps its own exam only when
 * one was set on it; those drafts are moved to the new exam too, finalised papers are left as printed and counted.
 *
 * Each blueprint is checked on its own, with the same rules as editing or deleting it one at a time; the ones the
 * user may not change are skipped and listed with the reason, the rest are changed.
 */
export const POST = route(
  async (req, _params, user) => {
    const input = await body(req, bulkSchema);
    if (input.action === "update" && input.examType === undefined && input.durationMin === undefined) {
      throw new HttpError(400, "Choose an exam or a time to change");
    }

    const ids = Array.from(new Set(input.ids));
    const rows = await prisma.blueprint.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        examType: true,
        durationMin: true,
        book: { select: { className: true, subject: true } },
        papers: { select: { id: true, status: true, examType: true } },
      },
    });

    const skipped: Skipped[] = [];
    const allowed: typeof rows = [];
    for (const id of ids) if (!rows.some((r) => r.id === id)) skipped.push({ id, name: id, reason: "not found" });
    for (const r of rows) {
      if (!canManageScope(user, r.book)) {
        skipped.push({ id: r.id, name: r.name, reason: `you do not look after ${r.book.className} ${r.book.subject}` });
      } else if (input.action === "update" && r.papers.some((p) => p.status === "FINAL") && !isAdmin(user)) {
        skipped.push({ id: r.id, name: r.name, reason: "a finalised paper uses it; only an administrator can change it" });
      } else if (input.action === "delete" && r.papers.length > 0) {
        skipped.push({ id: r.id, name: r.name, reason: `${r.papers.length} paper(s) use it` });
      } else {
        allowed.push(r);
      }
    }

    if (input.action === "delete") {
      if (allowed.length > 0) await prisma.blueprint.deleteMany({ where: { id: { in: allowed.map((r) => r.id) } } });
      await recordAudit(user, "API_CHANGE", "BLUEPRINT", null, {
        title: `Deleted ${allowed.length} blueprint(s)`,
        names: allowed.map((r) => r.name),
        skipped: skipped.length,
      });
      return { changed: allowed.length, skipped };
    }

    const data: { examType?: string; durationMin?: number } = {};
    if (input.examType !== undefined) data.examType = input.examType;
    if (input.durationMin !== undefined) data.durationMin = input.durationMin;
    // only the blueprints that actually differ are written
    const toChange = allowed.filter(
      (r) => (data.examType !== undefined && r.examType !== data.examType) || (data.durationMin !== undefined && r.durationMin !== data.durationMin),
    );
    let papersUpdated = 0;
    let papersKept = 0;
    if (toChange.length > 0) {
      await prisma.blueprint.updateMany({ where: { id: { in: toChange.map((r) => r.id) } }, data });
    }
    if (data.examType !== undefined) {
      // blueprints already on this exam are not in toChange, but their papers may still hold another one
      for (const r of allowed) {
        for (const p of r.papers) {
          if (!p.examType || p.examType === data.examType) continue;
          if (p.status === "FINAL") papersKept++;
          else papersUpdated++;
        }
      }
      const draftIds = allowed.flatMap((r) => r.papers.filter((p) => p.examType && p.examType !== data.examType && p.status !== "FINAL").map((p) => p.id));
      if (draftIds.length > 0) await prisma.paper.updateMany({ where: { id: { in: draftIds } }, data: { examType: data.examType } });
    }
    await recordAudit(user, "API_CHANGE", "BLUEPRINT", null, {
      title: `Changed ${toChange.length} blueprint(s)`,
      ...data,
      names: toChange.map((r) => r.name),
      skipped: skipped.length,
      papersUpdated,
      papersKept,
    });
    return { changed: toChange.length, unchanged: allowed.length - toChange.length, skipped, papersUpdated, papersKept };
  },
  { roles: ["ADMIN", "TEACHER"] },
);
