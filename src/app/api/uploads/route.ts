import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { HttpError, route } from "@/lib/api";
import { UPLOAD_DIR } from "@/lib/uploads";

const MAX_BYTES = 3 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const POST = route(async (req) => {
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file uploaded");
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) throw new HttpError(400, "Only PNG, JPEG, WebP or GIF images are allowed");
  if (file.size > MAX_BYTES) throw new HttpError(400, "Image must be 3 MB or smaller");
  const name = `${randomUUID()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return { name };
});
