"use client";

/**
 * Hindi and EVS activities that work exactly like an existing one, with their own name, place in the
 * library and starting content: matching letters to pictures and animals to homes (Picture Match), and the
 * EVS odd one out (Circle Target).
 */
import type { CircleTargetConfig, HindiFirstLetterConfig, KindergartenActivityPlugin, PictureMatchConfig } from "../types";
import { circleTargetPlugin } from "./circleTarget";
import { hindiFirstLetterPlugin } from "./hindiFirstLetter";
import { pictureMatchPlugin } from "./pictureMatch";

const pair = (id: string, clipartId: string, label: string, matchLabel: string) => ({ id, clipartId, label, matchLabel });

export const hindiLetterMatchDefaultConfig = (): PictureMatchConfig => ({
  pairs: [pair("1", "mango", "आम", "आ"), pair("2", "fish", "मछली", "म"), pair("3", "kite", "पतंग", "प"), pair("4", "house", "घर", "घ")],
  shuffleRight: true,
  leftTitle: "चित्र",
  rightTitle: "अक्षर",
  instruction: "चित्र को उसके पहले अक्षर से मिलाइए (Match each picture to its first letter):",
});

export const hindiLetterMatchPlugin: KindergartenActivityPlugin<PictureMatchConfig> = {
  ...pictureMatchPlugin,
  type: "KDG_HINDI_LETTER_MATCH",
  label: "Match Hindi letter to picture",
  shortLabel: "Letter–Picture Match",
  category: "hindi",
  description: "Draw lines from each picture (आम, मछली…) to its first letter.",
  defaultConfig: hindiLetterMatchDefaultConfig,
};

export const evsHomeDefaultConfig = (): PictureMatchConfig => ({
  pairs: [pair("1", "fish", "Fish", "Water"), pair("2", "elephant", "Elephant", "Forest"), pair("3", "dog", "Dog", "Kennel"), pair("4", "butterfly", "Butterfly", "Garden")],
  shuffleRight: true,
  leftTitle: "Who?",
  rightTitle: "Lives in",
  instruction: "Match each animal to where it lives:",
});

export const evsHomePlugin: KindergartenActivityPlugin<PictureMatchConfig> = {
  ...pictureMatchPlugin,
  type: "KDG_EVS_HOME",
  label: "Where does it live? (match)",
  shortLabel: "Where It Lives",
  category: "evs",
  description: "Match animals and things to their place: fish → water, dog → kennel.",
  defaultConfig: evsHomeDefaultConfig,
};

let n = 0;
const item = (clipartId: string, isTarget = false) => ({ id: `evs-${++n}`, type: "CLIPART" as const, clipartId, isTarget });

export const evsOddOneDefaultConfig = (): CircleTargetConfig => ({
  mode: "ODD_ONE_OUT",
  targetDescription: "Cross (✗) the one that does not belong in each row:",
  rows: [
    { rowLabel: "Row 1", items: [item("apple"), item("mango"), item("car", true), item("grapes")] },
    { rowLabel: "Row 2", items: [item("cat"), item("dog"), item("elephant"), item("pencil", true)] },
    { rowLabel: "Row 3", items: [item("ball"), item("fish", true), item("kite"), item("teddy")] },
  ],
  instruction: "Cross (✗) the odd one out in each row:",
});

export const evsOddOnePlugin: KindergartenActivityPlugin<CircleTargetConfig> = {
  ...circleTargetPlugin,
  type: "KDG_EVS_ODD_ONE",
  label: "Odd one out (EVS)",
  shortLabel: "Odd One Out",
  category: "evs",
  description: "Rows of pictures – fruits, animals, toys; the child crosses the one that does not belong.",
  defaultConfig: evsOddOneDefaultConfig,
};

export const englishFirstLetterDefaultConfig = (): HindiFirstLetterConfig => ({
  answerStyle: "WRITE",
  rows: [
    { clipartId: "apple", word: "Apple", choices: ["A"] },
    { clipartId: "ball", word: "Ball", choices: ["B"] },
    { clipartId: "cat", word: "Cat", choices: ["C"] },
    { clipartId: "duck", word: "Duck", choices: ["D"] },
    { clipartId: "fish", word: "Fish", choices: ["F"] },
    { clipartId: "kite", word: "Kite", choices: ["K"] },
  ],
  instruction: "Look at the pictures and write the first letter:",
});

export const englishFirstLetterPlugin: KindergartenActivityPlugin<HindiFirstLetterConfig> = {
  ...hindiFirstLetterPlugin,
  type: "KDG_FIRST_LETTER",
  label: "Picture → first letter",
  shortLabel: "First Letter",
  category: "english",
  description: "A picture (apple, ball…); the child writes or circles the first letter of its name.",
  defaultConfig: englishFirstLetterDefaultConfig,
};
