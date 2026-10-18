import { body, route } from "@/lib/api";
import { promptToFigureSceneWithGemini } from "@/lib/gemini";
import { z } from "zod";

const figureSchema = z.object({
  prompt: z.string().trim().min(1, "Diagram prompt required"),
  canvasWidth: z.number().int().default(640),
  canvasHeight: z.number().int().default(360),
});

export const POST = route(async (req) => {
  const customKey = req.headers.get("x-gemini-api-key");
  const data = await body(req, figureSchema);

  const result = await promptToFigureSceneWithGemini({
    ...data,
    apiKey: customKey,
  });

  return {
    success: result.success,
    isMock: result.isMock,
    objects: result.data?.objects || [],
    summary: result.data?.summary || "",
  };
});
