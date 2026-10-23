import JSZip from "jszip";
import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { buildPaperDocx } from "../[id]/export-docx/route";

export const GET = route(async (req, _params, user) => {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");
  if (!idsParam) {
    throw new HttpError(400, "Missing 'ids' query parameter.");
  }
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const includeMarking = url.searchParams.get("includeMarking") !== "false";
  return handleZipExport(ids, includeMarking, user);
});

export const POST = route(async (req, _params, user) => {
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const includeMarking = body.includeMarking !== false;
  return handleZipExport(ids, includeMarking, user);
});

async function handleZipExport(ids: string[], includeMarking: boolean, user: any) {
  if (ids.length === 0) {
    throw new HttpError(400, "Please select at least one paper to export.");
  }
  if (ids.length > 25) {
    throw new HttpError(400, "Maximum 25 papers can be exported in a single ZIP bundle.");
  }

  const zip = new JSZip();
  let exportedCount = 0;

  for (const id of ids) {
    try {
      // 1. Paper question document
      const paperDoc = await buildPaperDocx(id, false, user);
      zip.file(paperDoc.safeFilename, paperDoc.buffer);
      exportedCount++;

      // 2. Marking scheme document
      if (includeMarking) {
        const msDoc = await buildPaperDocx(id, true, user);
        zip.file(msDoc.safeFilename, msDoc.buffer);
      }
    } catch (err) {
      console.error(`Failed to export paper ${id} for zip:`, err);
    }
  }

  if (exportedCount === 0) {
    throw new HttpError(404, "No valid papers could be exported.");
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  await recordAudit(user, "PAPERS_EXPORT_ZIP", "PAPER", ids[0], {
    paperCount: ids.length,
    exportedCount,
    includeMarking,
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const zipFilename = `Exam_Papers_Bundle_${timestamp}.zip`;

  return new Response(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
    },
  });
}
