import { readFile } from "node:fs/promises";
import path from "node:path";
import { HttpError, route } from "@/lib/api";
import { UPLOAD_DIR } from "@/lib/uploads";

const TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export const GET = route(async (_req, { name }) => {
  // Strict whitelist of the exact names we generate: blocks any path traversal.
  const m = /^[a-f0-9-]{36}\.(png|jpg|jpeg|webp|gif|svg)$/.exec(name);
  if (!m) throw new HttpError(404, "Not found");
  try {
    const data = await readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": TYPE_BY_EXT[m[1]], "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    throw new HttpError(404, "Not found");
  }
});
