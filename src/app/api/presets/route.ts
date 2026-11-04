import { randomUUID } from "node:crypto";
import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { builtInPresets, cleanPreset, CUSTOM_PREFIX, effectivePresets, mergePresets, PRESET_KINDS, type PresetKind } from "@/lib/presets";

const kindOf = (raw: string | null): PresetKind => {
  const k = (raw ?? "").toUpperCase();
  if (!(PRESET_KINDS as readonly string[]).includes(k)) throw new HttpError(400, "kind must be SYLLABUS or BLUEPRINT");
  return k as PresetKind;
};

const isManager = (role: string) => role === "ADMIN" || role === "SUPER_ADMIN";

/**
 * GET ?kind=SYLLABUS|BLUEPRINT          the presets everyone is offered (hidden ones left out)
 * GET ?kind=…&manage=1                  every preset with its origin and the shipped version (Admin)
 */
export const GET = route(async (req, _params, user) => {
  const url = new URL(req.url);
  const kind = kindOf(url.searchParams.get("kind"));
  const rows = await prisma.presetOverride.findMany({ where: { kind }, orderBy: { createdAt: "asc" } });
  if (url.searchParams.get("manage") !== "1") return effectivePresets(kind, rows);
  if (!isManager(user.role)) throw new HttpError(403, "Only administrators can edit presets");
  return mergePresets(builtInPresets(kind) as Array<{ id: string }>, rows);
});

/** POST { kind, data }: a new preset of the school's own. */
export const POST = route(
  async (req, _params, user) => {
    const input = await body(req, z.object({ kind: z.enum(PRESET_KINDS), data: z.unknown() }));
    const id = `${CUSTOM_PREFIX}${randomUUID().slice(0, 8)}`;
    const data = cleanPreset(input.kind, id, input.data);
    const row = await prisma.presetOverride.create({
      data: { kind: input.kind, presetId: id, data: data as object, updatedById: user.id, updatedByName: user.name },
    });
    await recordAudit(user, "PRESET_CREATE", "PRESET", id, { kind: input.kind, title: data.title });
    return { id: row.presetId, data };
  },
  { roles: ["ADMIN"] },
);
