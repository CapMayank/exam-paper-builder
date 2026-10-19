import type { ReactNode } from "react";
import type { QuestionDto } from "@/lib/types";

export type KindergartenCategory = "english" | "math" | "hindi" | "evs" | "general";

export interface ClipartItem {
  id: string;
  name: string;
  category: "toys" | "animals" | "fruits" | "phonics" | "shapes" | "objects";
  tags: string[];
  svgViewBox?: string;
  svgPath?: string;
  renderSvg: (size?: number, className?: string) => ReactNode;
}

export interface KindergartenEditorProps<TConfig = unknown> {
  config: TConfig;
  onChange: (newConfig: TConfig) => void;
  instructionText: string;
  onInstructionChange: (text: string) => void;
}

export interface KindergartenPrintProps<TConfig = unknown> {
  config: TConfig;
  instructionText: string;
  marks?: number;
  number?: number;
  numberLabel?: string;
}

export interface KindergartenActivityPlugin<TConfig = any> {
  type: string;
  label: string;
  shortLabel: string;
  category: KindergartenCategory;
  description: string;
  iconName: string; // Lucide icon identifier
  defaultConfig: (subject?: string) => TConfig;
  validateConfig: (config: unknown) => { valid: boolean; error?: string };
  renderEditor: React.ComponentType<KindergartenEditorProps<TConfig>>;
  renderPrint: React.ComponentType<KindergartenPrintProps<TConfig>>;
  getSummary?: (config: TConfig, text: string) => string;
}

// ---------------- 1. KDG_TRACE_WRITE Config ----------------
export type RulingType = "FOUR_LINE" | "TWO_LINE" | "SINGLE_LINE" | "BOXES";

export interface TraceWriteLineItem {
  promptText: string; // e.g. "A B C D" or "Apple" or "क ख ग घ"
  traceDotted: boolean; // whether to show dotted tracing font or leave guide empty
  repeatCount: number; // how many lines / boxes to provide for student to write
}

export interface TraceWriteConfig {
  rulingType: RulingType;
  fontSizePt: number;
  lines: TraceWriteLineItem[];
  instruction: string;
}

// ---------------- 2. KDG_NUMBER_GRID Config ----------------
export interface NumberGridCell {
  value: number | string;
  isBlank: boolean; // if true, student fills this in
}

export interface NumberGridConfig {
  startNumber: number;
  endNumber: number;
  columns: number; // typically 5 or 10 columns
  step: number;
  cells: NumberGridCell[];
  instruction: string;
}

// ---------------- 3. KDG_PICTURE_MATCH Config ----------------
export interface PictureMatchPair {
  id: string;
  clipartId: string;
  customImageUrl?: string;
  label: string; // e.g. "A" or "Apple"
  matchLabel: string; // right column text e.g. "A"
}

export interface PictureMatchConfig {
  pairs: PictureMatchPair[];
  shuffleRight: boolean;
  leftTitle?: string;
  rightTitle?: string;
  instruction: string;
}

// ---------------- 4. KDG_COUNT_ITEMS Config ----------------
export interface CountItemsConfig {
  clipartId: string;
  customImageUrl?: string;
  count: number; // 1 to 20
  layout: "GRID" | "SCATTERED" | "ROW";
  answerStyle: "SQUARE_BOX" | "CIRCLE" | "CHOICE_OPTIONS";
  choiceOptions?: number[]; // if CHOICE_OPTIONS e.g. [3, 5, 8]
  objectName: string; // e.g. "balloons", "apples"
  instruction: string;
}

// ---------------- 5. KDG_CIRCLE_TARGET Config ----------------
export interface CircleTargetRowItem {
  id: string;
  type: "CLIPART" | "TEXT";
  clipartId?: string;
  text?: string;
  isTarget: boolean; // whether this is the answer / odd one
}

export interface CircleTargetRow {
  rowLabel?: string;
  items: CircleTargetRowItem[];
}

export interface CircleTargetConfig {
  mode: "ODD_ONE_OUT" | "FIND_TARGET";
  targetDescription?: string; // e.g. "Circle the letter B" or "Circle the fruits"
  rows: CircleTargetRow[];
  instruction: string;
}

// ---------------- 6. KDG_SEQUENCE_CHAIN Config ----------------
export interface SequenceChainItem {
  value: string;
  isBlank: boolean; // student fills this bubble
}

export interface SequenceChainConfig {
  theme: "CATERPILLAR" | "TRAIN" | "BUBBLES" | "APPLES";
  items: SequenceChainItem[];
  instruction: string;
}
