import { traceWritePlugin } from "./activities/traceWrite";
import { numberGridPlugin } from "./activities/numberGrid";
import { pictureMatchPlugin } from "./activities/pictureMatch";
import { countItemsPlugin } from "./activities/countItems";
import { circleTargetPlugin } from "./activities/circleTarget";
import { sequenceChainPlugin } from "./activities/sequenceChain";
import type { KindergartenActivityPlugin } from "./types";

const REGISTRY = new Map<string, KindergartenActivityPlugin>();

// Register initial 6 activities
[
  traceWritePlugin,
  numberGridPlugin,
  pictureMatchPlugin,
  countItemsPlugin,
  circleTargetPlugin,
  sequenceChainPlugin,
].forEach((plugin) => {
  REGISTRY.set(plugin.type, plugin);
});

export function registerKindergartenActivity(plugin: KindergartenActivityPlugin): void {
  REGISTRY.set(plugin.type, plugin);
}

export function getKindergartenActivity(type?: string | null): KindergartenActivityPlugin | undefined {
  if (!type) return undefined;
  return REGISTRY.get(type);
}

export function getAllKindergartenActivities(): KindergartenActivityPlugin[] {
  return Array.from(REGISTRY.values());
}

export function isKindergartenType(type?: string | null): boolean {
  if (!type) return false;
  return REGISTRY.has(type) || type.startsWith("KDG_");
}

export function getKindergartenTypeLabel(type?: string | null): string {
  if (!type) return "Kindergarten Activity";
  const plugin = REGISTRY.get(type);
  return plugin ? plugin.label : type;
}

export function parseKindergartenConfig<T = any>(
  type: string,
  optionsJson?: string | null,
  subject?: string
): T {
  const plugin = REGISTRY.get(type);
  const fallback = plugin ? plugin.defaultConfig(subject) : ({} as T);

  if (!optionsJson || !optionsJson.trim() || optionsJson === "[]") {
    return fallback;
  }

  try {
    const parsed = JSON.parse(optionsJson);
    if (parsed && typeof parsed === "object") {
      // If it was stored as an array of strings in legacy optionsJson, fallback to default
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string" && !parsed[0].startsWith("{")) {
        return fallback;
      }
      // If optionsJson is an array with 1 JSON stringified config object, unwrap it
      if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === "string" && parsed[0].startsWith("{")) {
        return { ...fallback, ...JSON.parse(parsed[0]) };
      }
      return { ...fallback, ...parsed };
    }
  } catch {
    // fallback
  }

  return fallback;
}

export function serializeKindergartenConfig(config: unknown): string {
  return JSON.stringify(config);
}
