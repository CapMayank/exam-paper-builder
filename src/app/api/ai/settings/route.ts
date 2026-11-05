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
      (keys > 1 ? `Requests are spread over ${keys} API keys. ` : "") +
      "On Google's free tier each full Flash model allows about 20 requests a day per key, and one full paper uses roughly 15–40. " +
      "When those run out the lighter Flash-Lite models take over. The daily count resets at midnight Pacific time; add keys from other Google projects (GEMINI_API_KEYS) or a billed key for more.",
    // masked key endings and live cooldowns, for administrators only
    keys: privileged ? poolStatus() : undefined,
  };
});
