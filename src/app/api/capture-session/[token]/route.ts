import { HttpError, route } from "@/lib/api";
import {
  consumeCaptureSessionImage,
  getCaptureSessionStatus,
  isValidCaptureToken,
  saveCaptureSessionImage,
} from "@/lib/captureSessions";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const GET = route(
  async (req, params) => {
    const token = params.token ?? "";
    if (!isValidCaptureToken(token)) throw new HttpError(400, "Invalid capture token");

    const url = new URL(req.url);
    if (url.searchParams.get("image") === "1") {
      const consumed = await consumeCaptureSessionImage(token);
      if (!consumed) throw new HttpError(404, "Capture image not ready or expired");
      return new Response(new Uint8Array(consumed.buffer), {
        status: 200,
        headers: {
          "Content-Type": consumed.mimeType,
          "Cache-Control": "no-store",
        },
      });
    }

    const status = await getCaptureSessionStatus(token);
    if (!status) throw new HttpError(404, "Capture link expired or invalid");
    return status;
  },
  { auth: false },
);

export const POST = route(
  async (req, params) => {
    const token = params.token ?? "";
    if (!isValidCaptureToken(token)) throw new HttpError(400, "Invalid capture token");

    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No image file provided");
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new HttpError(400, "Only PNG, JPEG, or WebP images are allowed");
    }
    if (file.size > MAX_BYTES) {
      throw new HttpError(400, "Image must be 5 MB or smaller");
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const saved = await saveCaptureSessionImage(token, buf, file.type);
    if (!saved) throw new HttpError(410, "Capture link expired or already used");
    return { ok: true };
  },
  { auth: false },
);
