import { traceWritePlugin } from "./activities/traceWrite";
import { numberGridPlugin } from "./activities/numberGrid";
import { pictureMatchPlugin } from "./activities/pictureMatch";
import { countItemsPlugin } from "./activities/countItems";
import { circleTargetPlugin } from "./activities/circleTarget";
import { sequenceChainPlugin } from "./activities/sequenceChain";
import { missingLettersPlugin } from "./activities/missingLetters";
import { patternPlugin } from "./activities/pattern";
import { pictureSumPlugin } from "./activities/pictureSum";
import { comparePlugin } from "./activities/compare";
import { colourPlugin } from "./activities/colourPicture";
import { joinDotsPlugin } from "./activities/joinDots";
import { tickPicturePlugin } from "./activities/tickPicture";
import { preWritingPlugin } from "./activities/preWriting";
import { hindiVarnamalaPlugin } from "./activities/hindiVarnamala";
import { hindiMissingPlugin } from "./activities/hindiMissing";
import { hindiFirstLetterPlugin } from "./activities/hindiFirstLetter";
import { evsSortPlugin } from "./activities/evsSort";
import { evsNamePlugin } from "./activities/evsName";
import { englishFirstLetterPlugin, evsHomePlugin, evsOddOnePlugin, hindiLetterMatchPlugin } from "./activities/subjectVariants";
import { hindiTextMatchPlugin, numberNameMatchPlugin, textMatchPlugin } from "./activities/textMatch";
import { answerLinesPlugin, hindiAnswerLinesPlugin, numberNamesPlugin } from "./activities/answerLines";
import { hindiJoinLettersPlugin, joinLettersPlugin } from "./activities/joinLetters";
import { hindiSentenceBlankPlugin, sentenceBlankPlugin, shapeSentencePlugin } from "./activities/sentenceBlank";
import { arrangeOrderPlugin, hindiUnjumblePlugin, numberOrderPlugin } from "./activities/arrangeOrder";
import { numberNeighboursPlugin } from "./activities/numberNeighbours";
import { numberCompareSignPlugin } from "./activities/numberCompareSign";
import { verticalSumPlugin } from "./activities/verticalSum";
import { drawForNumberPlugin } from "./activities/drawForNumber";
import { hindiBarakhadiPlugin } from "./activities/hindiBarakhadi";
import { markLettersPlugin } from "./activities/markLetters";
import { wordSearchPlugin } from "./activities/wordSearch";
import type { AnyActivityPlugin } from "./types";

const REGISTRY = new Map<string, AnyActivityPlugin>();

// Register all kindergarten activities (in library order within each subject)
[
  traceWritePlugin,
  numberGridPlugin,
  pictureMatchPlugin,
  countItemsPlugin,
  circleTargetPlugin,
  sequenceChainPlugin,
  preWritingPlugin,
  joinDotsPlugin,
  missingLettersPlugin,
  englishFirstLetterPlugin,
  colourPlugin,
  patternPlugin,
  comparePlugin,
  pictureSumPlugin,
  tickPicturePlugin,
  hindiVarnamalaPlugin,
  hindiMissingPlugin,
  hindiFirstLetterPlugin,
  hindiLetterMatchPlugin,
  evsSortPlugin,
  evsNamePlugin,
  evsOddOnePlugin,
  evsHomePlugin,
  // From the 2025-26 Nursery–KG II annual papers
  // English
  textMatchPlugin,
  markLettersPlugin,
  joinLettersPlugin,
  arrangeOrderPlugin,
  sentenceBlankPlugin,
  answerLinesPlugin,
  wordSearchPlugin,
  // Maths
  numberNeighboursPlugin,
  numberCompareSignPlugin,
  verticalSumPlugin,
  numberOrderPlugin,
  numberNameMatchPlugin,
  numberNamesPlugin,
  drawForNumberPlugin,
  shapeSentencePlugin,
  // Hindi
  hindiBarakhadiPlugin,
  hindiTextMatchPlugin,
  hindiJoinLettersPlugin,
  hindiSentenceBlankPlugin,
  hindiUnjumblePlugin,
  hindiAnswerLinesPlugin,
].forEach((plugin) => {
  REGISTRY.set(plugin.type, plugin);
});

export function registerKindergartenActivity(plugin: AnyActivityPlugin): void {
  REGISTRY.set(plugin.type, plugin);
}

export function getKindergartenActivity(type?: string | null): AnyActivityPlugin | undefined {
  if (!type) return undefined;
  return REGISTRY.get(type);
}

export function getAllKindergartenActivities(): AnyActivityPlugin[] {
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

export function parseKindergartenConfig<T = unknown>(
  type: string,
  optionsJson?: string | null,
  subject?: string
): T {
  const plugin = REGISTRY.get(type);
  const fallback = plugin ? plugin.defaultConfig(subject) : ({} as T);
  const legacy = (plugin?.legacyDefaults ?? {}) as Partial<T>;

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
        return { ...fallback, ...legacy, ...JSON.parse(parsed[0]) };
      }
      return { ...fallback, ...legacy, ...parsed };
    }
  } catch {
    // fallback
  }

  return fallback;
}

export function serializeKindergartenConfig(config: unknown): string {
  return JSON.stringify(config);
}
