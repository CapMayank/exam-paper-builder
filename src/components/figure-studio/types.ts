/** Scene model for the figure studio. Coordinates are "scene px" (canvas logical px). */

export interface Pt {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Dash = "solid" | "dashed" | "dotted";
export type Hatch = "none" | "diagonal" | "cross" | "dots" | "horizontal";
export type ArrowKind = "none" | "filled" | "open" | "dot" | "bar";

export interface Style {
  stroke: string;
  width: number;
  dash: Dash;
  /** Fill colour, or null for no fill. */
  fill: string | null;
  hatch: Hatch;
  opacity: number;
}

interface Base {
  id: string;
  style: Style;
  locked?: boolean;
}

/** Axis-aligned box in scene space, rotated about its centre by `rot` radians. */
export interface BoxFields {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  flipX?: boolean;
  flipY?: boolean;
}

export interface PathObj extends Base {
  type: "path";
  /** Flat x,y list. */
  pts: number[];
  highlighter?: boolean;
}

export type LineKind = "line" | "polyline" | "arc" | "dimension";
export interface LineObj extends Base {
  type: "line";
  kind: LineKind;
  /** line/dimension: 2 pts; polyline: n pts; arc: [start, through, end]. */
  pts: Pt[];
  start: ArrowKind;
  end: ArrowKind;
  /** Equal-length tick marks (0-3) at the middle. */
  ticks: number;
  /** Parallel arrow marks (0-3) at the middle. */
  parallels: number;
  label: string;
  labelSize: number;
  /** Perpendicular offset of the label from the line (screen-space px, + = left of direction). */
  labelOffset: number;
}

export type AngleLabelMode = "auto" | "custom" | "none";
export interface AngleObj extends Base {
  type: "angle";
  v: Pt;
  a: Pt;
  b: Pt;
  reflex: boolean;
  arcs: number;
  arcR: number;
  labelMode: AngleLabelMode;
  label: string;
  fontSize: number;
  decimals: 0 | 1;
  rightMark: boolean;
  fillSector: boolean;
  armArrow: ArrowKind;
  armTicks: number;
}

export type PointMode = "dot" | "cross" | "hollow";
export interface PointObj extends Base {
  type: "point";
  x: number;
  y: number;
  label: string;
  /** Label offset from the point. */
  lx: number;
  ly: number;
  size: number;
  mode: PointMode;
  fontSize: number;
}

export type FontKey = "sans" | "serif" | "mono" | "math";
export type TextAlign = "left" | "center" | "right";
export interface TextObj extends Base, BoxFields {
  type: "text";
  text: string;
  font: FontKey;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
  bg: "none" | "white";
  border: boolean;
}

export type ShapeKind =
  | "rect"
  | "roundrect"
  | "ellipse"
  | "triangle"
  | "rtriangle"
  | "rhombus"
  | "parallelogram"
  | "trapezium"
  | "polygon"
  | "star"
  | "semicircle"
  | "sector"
  | "ring"
  | "cross"
  | "rightmark";
export interface ShapeObj extends Base, BoxFields {
  type: "shape";
  kind: ShapeKind;
  /** polygon sides (3-12); star points. */
  sides: number;
  /** sector start/end angle in degrees. */
  a0: number;
  a1: number;
  /** roundrect corner radius. */
  radius: number;
  /** ring inner radius ratio. */
  inner: number;
}

export interface StampObj extends Base, BoxFields {
  type: "stamp";
  stamp: string;
}

export interface ImageObj extends Base, BoxFields {
  type: "image";
  src: string;
}

export interface AxesObj extends Base, BoxFields {
  type: "axes";
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  showNumbers: boolean;
  showGrid: boolean;
  arrows: boolean;
  names: boolean;
}

export interface NumMark {
  v: number;
  open: boolean;
}
export interface NumLineObj extends Base, BoxFields {
  type: "numberline";
  min: number;
  max: number;
  step: number;
  arrows: boolean;
  showNumbers: boolean;
  marks: NumMark[];
}

export type Obj =
  | PathObj
  | LineObj
  | AngleObj
  | PointObj
  | TextObj
  | ShapeObj
  | StampObj
  | ImageObj
  | AxesObj
  | NumLineObj;

export type BoxObj = TextObj | ShapeObj | StampObj | ImageObj | AxesObj | NumLineObj;
export type ObjType = Obj["type"];

export type GridStyle = "none" | "squares" | "dots";
export interface GridSettings {
  style: GridStyle;
  size: number;
  /** Include the grid in the exported image. */
  include: boolean;
}

export interface Doc {
  w: number;
  h: number;
  bg: "white" | "transparent";
  objects: Obj[];
}

export interface SceneFile {
  v: 1;
  doc: Doc;
  grid: GridSettings;
}

export const MAX_CANVAS = 1600;
export const MIN_CANVAS = 100;

export const CANVAS_PRESETS: { id: string; name: string; w: number; h: number }[] = [
  { id: "landscape", name: "Landscape", w: 640, h: 360 },
  { id: "wide", name: "Wide", w: 720, h: 300 },
  { id: "square", name: "Square", w: 480, h: 480 },
  { id: "portrait", name: "Portrait", w: 400, h: 560 },
];

export const DEFAULT_STYLE: Style = {
  stroke: "#000000",
  width: 2,
  dash: "solid",
  fill: null,
  hatch: "none",
  opacity: 1,
};
