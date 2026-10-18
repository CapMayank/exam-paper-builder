import { route } from "@/lib/api";
import { getGeminiApiKey } from "@/lib/gemini";

export const GET = route(async () => {
  const hasEnvKey = Boolean(getGeminiApiKey());
  return {
    hasEnvApiKey: hasEnvKey,
    model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
    freeQuotaInfo: "15 Requests/min, 1,500 Requests/day free on Google AI Studio",
  };
});
