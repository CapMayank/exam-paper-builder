import { body, route } from "@/lib/api";
import { improveQuestionWithGemini } from "@/lib/gemini";
import { z } from "zod";

const improveSchema = z.object({
  questionText: z.string().trim().min(1, "Question text required"),
  options: z.array(z.string()).default([]),
  answer: z.string().default(""),
  type: z.string().default("SHORT"),
  task: z.enum([
    "refine_cbse",
    "generate_distractors",
    "bilingual_hindi",
    "step_marking_scheme",
    "fix_ambiguity",
  ]),
});

export const POST = route(async (req) => {
  const customKey = req.headers.get("x-gemini-api-key");
  const data = await body(req, improveSchema);

  const result = await improveQuestionWithGemini({
    ...data,
    apiKey: customKey,
  });

  return result;
});
