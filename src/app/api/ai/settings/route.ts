import { route } from "@/lib/api";
import { canManageAiSettings } from "@/lib/permissions";
import { DEFAULT_GENERATION_MODEL, getGeminiApiKey } from "@/lib/gemini";
import { configuredKeys, poolStatus } from "@/lib/geminiPool";

export const GET = route(async (_req, _ctx, user) => {
  const keys = configuredKeys().length;
  const privileged = canManageAiSettings(user);
  return {
    hasEnvApiKey: Boolean(getGeminiApiKey()),
    // the model question generation starts with (GEMINI_MODEL is only a fallback after it)
    model: DEFAULT_GENERATION_MODEL,
    keyCount: keys,
    freeQuotaInfo:
      keys > 1
        ? `Requests are spread over ${keys} API keys. Google's free tier limits requests per minute and per day for each model and project; the daily count resets at midnight Pacific time.`
        : "Google's free tier limits requests per minute and per day for each model; add more API keys (GEMINI_API_KEYS) from separate Google projects to raise the limit.",
    // masked key endings and live cooldowns, for administrators only
    keys: privileged ? poolStatus() : undefined,
  };
});
