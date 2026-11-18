import { route } from "@/lib/api";
import { createCaptureSession } from "@/lib/captureSessions";

export const POST = route(async () => {
  return await createCaptureSession();
});
