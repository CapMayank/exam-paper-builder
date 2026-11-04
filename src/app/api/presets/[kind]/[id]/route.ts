import { Prisma } from "@prisma/client";
import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { builtInPresets, cleanPreset, isCustomId, PRESET_KINDS, type PresetKind } from "@/lib/presets";

function target(params: Record<string, string>): { kind: PresetKind; id: string; builtIn: { title: string } | null } {
  const kind = (params.kind ?? "").toUpperCase();
  if (!(PRESET_KINDS as readonly string[]).includes(kind)) throw new HttpError(400, "kind must be SYLLABUS or BLUEPRINT");
  const id = decodeURIComponent(params.id ?? "");
  const builtIn = (builtInPresets(kind as PresetKind) as Array<{ id: string; title: string }>).find((p) => p.id === id) ?? null;
  return { kind: kind as PresetKind, id, builtIn };
}

async function existingCustom(kind: PresetKind, id: string) {
  const row = await prisma.presetOverride.findUnique({ where: { kind_presetId: { kind, presetId: id } } });
  if (!row) throw new HttpError(404, "Preset not found");
  return row;
}

/** PUT { data }: save the whole preset (a built-in one becomes "edited"). */
export const PUT = route(
  async (req, params, user) => {
    const { kind, id, builtIn } = target(params);
    if (!builtIn && !isCustomId(id)) throw new HttpError(404, "Preset not found");
    if (!builtIn) await existingCustom(kind, id);
    const { data: raw } = await body(req, z.object({ data: z.unknown() }));
    const data = cleanPreset(kind, id, raw);
    await prisma.presetOverride.upsert({
      where: { kind_presetId: { kind, presetId: id } },
      create: { kind, presetId: id, data: data as object, updatedById: user.id, updatedByName: user.name },
      update: { data: data as object, updatedById: user.id, updatedByName: user.name },
    });
    await recordAudit(user, "PRESET_UPDATE", "PRESET", id, { kind, title: data.title });
    return { id, data };
  },
  { roles: ["ADMIN"] },
);

/** PATCH { hidden }: hide a preset from the import dialog / blueprint picker, or show it again. */
export const PATCH = route(
  async (req, params, user) => {
    const { kind, id, builtIn } = target(params);
    const { hidden } = await body(req, z.object({ hidden: z.boolean() }));
    if (!builtIn) await existingCustom(kind, id);
    await prisma.presetOverride.upsert({
      where: { kind_presetId: { kind, presetId: id } },
      create: { kind, presetId: id, hidden, updatedById: user.id, updatedByName: user.name },
      update: { hidden, updatedById: user.id, updatedByName: user.name },
    });
    await recordAudit(user, hidden ? "PRESET_HIDE" : "PRESET_SHOW", "PRESET", id, { kind, title: builtIn?.title });
    return { id, hidden };
  },
  { roles: ["ADMIN"] },
);

/** DELETE: a built-in preset goes back to its shipped version; a school-made one is deleted. */
export const DELETE = route(
  async (_req, params, user) => {
    const { kind, id, builtIn } = target(params);
    const row = await prisma.presetOverride.findUnique({ where: { kind_presetId: { kind, presetId: id } } });
    if (!builtIn) {
      if (!row) throw new HttpError(404, "Preset not found");
      await prisma.presetOverride.delete({ where: { id: row.id } });
      await recordAudit(user, "PRESET_DELETE", "PRESET", id, { kind, title: (row.data as { title?: string } | null)?.title });
      return { id, deleted: true };
    }
    if (row) {
      // keep the row only to remember that the preset is hidden
      if (row.hidden) await prisma.presetOverride.update({ where: { id: row.id }, data: { data: Prisma.DbNull, updatedById: user.id, updatedByName: user.name } });
      else await prisma.presetOverride.delete({ where: { id: row.id } });
    }
    await recordAudit(user, "PRESET_RESTORE", "PRESET", id, { kind, title: builtIn.title });
    return { id, restored: true };
  },
  { roles: ["ADMIN"] },
);
