import { body, route } from "@/lib/api";
import { generateQuestionsWithGemini } from "@/lib/gemini";
import { z } from "zod";

const generateSchema = z.object({
  chapter: z.string().trim().min(1, "Chapter is required"),
  className: z.string().trim().default("Class 10"),
  subject: z.string().trim().default("Science"),
  type: z.string().trim().default("SHORT"),
  marks: z.number().int().min(1).max(20).default(3),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  cognitiveLevel: z.string().optional().default("APPLYING"),
  language: z.enum(["en", "hi", "bilingual"]).default("en"),
  count: z.number().int().min(1).max(10).default(1),
  topicContext: z.string().trim().max(500).optional().default(""),
});

export const POST = route(async (req) => {
  const customKey = req.headers.get("x-gemini-api-key");
  const data = await body(req, generateSchema);

  const result = await generateQuestionsWithGemini({
    ...data,
    apiKey: customKey,
  });

  return result;
});
