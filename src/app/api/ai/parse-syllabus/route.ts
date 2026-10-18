import { body, route } from "@/lib/api";
import { parseSyllabusWithGemini } from "@/lib/gemini";
import { z } from "zod";

const parseSchema = z.object({
  rawText: z.string().trim().min(5, "Please provide table of contents or syllabus text"),
  className: z.string().trim().default("Class 10"),
  subject: z.string().trim().default("General"),
});

export const POST = route(async (req) => {
  const customKey = req.headers.get("x-gemini-api-key");
  const data = await body(req, parseSchema);

  const result = await parseSyllabusWithGemini({
    ...data,
    apiKey: customKey,
  });

  return result;
});
