import { uid } from "./geometry";
import type { Obj } from "./types";
import { DEFAULT_STYLE } from "./types";

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  category: "geometry" | "graphs" | "mensuration" | "science";
  create: (center: { x: number; y: number }) => Obj[];
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "triangle_abc",
    name: "Triangle ABC with Angle θ",
    description: "Labeled vertices A, B, C with an angle arc and θ marker at B.",
    category: "geometry",
    create: (c) => {
      const v = { x: c.x - 120, y: c.y + 70 }; // B
      const a = { x: c.x + 130, y: c.y + 70 }; // C
      const b = { x: c.x + 10, y: c.y - 80 };  // A

      const tri: Obj = {
        id: uid(),
        type: "shape",
        kind: "triangle",
        x: c.x - 120,
        y: c.y - 80,
        w: 250,
        h: 150,
        rot: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
        sides: 3,
        a0: 0,
        a1: 0,
        radius: 0,
        inner: 0,
      };

      const angle: Obj = {
        id: uid(),
        type: "angle",
        v,
        a,
        b,
        reflex: false,
        arcs: 1,
        arcR: 32,
        labelMode: "custom",
        label: "θ",
        fontSize: 16,
        decimals: 0,
        rightMark: false,
        fillSector: false,
        armArrow: "none",
        armTicks: 0,
        style: { ...DEFAULT_STYLE, width: 1.5 },
      };

      const ptB: Obj = {
        id: uid(),
        type: "point",
        x: v.x,
        y: v.y,
        label: "B",
        lx: -16,
        ly: 16,
        size: 3,
        mode: "dot",
        fontSize: 16,
        style: DEFAULT_STYLE,
      };

      const ptC: Obj = {
        id: uid(),
        type: "point",
        x: a.x,
        y: a.y,
        label: "C",
        lx: 16,
        ly: 16,
        size: 3,
        mode: "dot",
        fontSize: 16,
        style: DEFAULT_STYLE,
      };

      const ptA: Obj = {
        id: uid(),
        type: "point",
        x: b.x,
        y: b.y,
        label: "A",
        lx: 0,
        ly: -16,
        size: 3,
        mode: "dot",
        fontSize: 16,
        style: DEFAULT_STYLE,
      };

      return [tri, angle, ptA, ptB, ptC];
    },
  },

  {
    id: "right_triangle",
    name: "Right-Angled Triangle (90°)",
    description: "Right-angled triangle with square 90° symbol and hypotenuse.",
    category: "geometry",
    create: (c) => {
      const v = { x: c.x - 100, y: c.y + 70 }; // right angle vertex
      const a = { x: c.x + 100, y: c.y + 70 }; // base endpoint
      const b = { x: c.x - 100, y: c.y - 70 }; // vertical endpoint

      const rtri: Obj = {
        id: uid(),
        type: "shape",
        kind: "rtriangle",
        x: c.x - 100,
        y: c.y - 70,
        w: 200,
        h: 140,
        rot: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
        sides: 3,
        a0: 0,
        a1: 0,
        radius: 0,
        inner: 0,
      };

      const angle: Obj = {
        id: uid(),
        type: "angle",
        v,
        a,
        b,
        reflex: false,
        arcs: 1,
        arcR: 20,
        labelMode: "none",
        label: "90°",
        fontSize: 14,
        decimals: 0,
        rightMark: true,
        fillSector: false,
        armArrow: "none",
        armTicks: 0,
        style: { ...DEFAULT_STYLE, width: 1.5 },
      };

      const ptB: Obj = {
        id: uid(),
        type: "point",
        x: v.x,
        y: v.y,
        label: "B",
        lx: -16,
        ly: 16,
        size: 3,
        mode: "dot",
        fontSize: 16,
        style: DEFAULT_STYLE,
      };

      const ptC: Obj = {
        id: uid(),
        type: "point",
        x: a.x,
        y: a.y,
        label: "C",
        lx: 16,
        ly: 16,
        size: 3,
        mode: "dot",
        fontSize: 16,
        style: DEFAULT_STYLE,
      };

      const ptA: Obj = {
        id: uid(),
        type: "point",
        x: b.x,
        y: b.y,
        label: "A",
        lx: -16,
        ly: -10,
        size: 3,
        mode: "dot",
        fontSize: 16,
        style: DEFAULT_STYLE,
      };

      return [rtri, angle, ptA, ptB, ptC];
    },
  },

  {
    id: "parallel_transversal",
    name: "Parallel Lines & Transversal",
    category: "geometry",
    description: "Two parallel horizontal lines cut by a transversal line.",
    create: (c) => {
      const l1: Obj = {
        id: uid(),
        type: "line",
        kind: "line",
        pts: [
          { x: c.x - 140, y: c.y - 45 },
          { x: c.x + 140, y: c.y - 45 },
        ],
        start: "open",
        end: "open",
        ticks: 0,
        parallels: 1,
        label: "l",
        labelSize: 15,
        labelOffset: -12,
        style: { ...DEFAULT_STYLE, width: 2 },
      };

      const l2: Obj = {
        id: uid(),
        type: "line",
        kind: "line",
        pts: [
          { x: c.x - 140, y: c.y + 45 },
          { x: c.x + 140, y: c.y + 45 },
        ],
        start: "open",
        end: "open",
        ticks: 0,
        parallels: 1,
        label: "m",
        labelSize: 15,
        labelOffset: -12,
        style: { ...DEFAULT_STYLE, width: 2 },
      };

      const trans: Obj = {
        id: uid(),
        type: "line",
        kind: "line",
        pts: [
          { x: c.x - 60, y: c.y - 100 },
          { x: c.x + 60, y: c.y + 100 },
        ],
        start: "open",
        end: "open",
        ticks: 0,
        parallels: 0,
        label: "t",
        labelSize: 15,
        labelOffset: 12,
        style: { ...DEFAULT_STYLE, width: 2 },
      };

      return [l1, l2, trans];
    },
  },

  {
    id: "circle_radius",
    name: "Circle with Center and Radius",
    category: "geometry",
    description: "Circle with center point O, radius OA and label r.",
    create: (c) => {
      const radius = 90;
      const circle: Obj = {
        id: uid(),
        type: "shape",
        kind: "ellipse",
        x: c.x - radius,
        y: c.y - radius,
        w: radius * 2,
        h: radius * 2,
        rot: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
        sides: 0,
        a0: 0,
        a1: 0,
        radius: 0,
        inner: 0,
      };

      const rLine: Obj = {
        id: uid(),
        type: "line",
        kind: "dimension",
        pts: [
          { x: c.x, y: c.y },
          { x: c.x + radius, y: c.y },
        ],
        start: "none",
        end: "filled",
        ticks: 0,
        parallels: 0,
        label: "r",
        labelSize: 16,
        labelOffset: -12,
        style: { ...DEFAULT_STYLE, width: 1.5 },
      };

      const ptO: Obj = {
        id: uid(),
        type: "point",
        x: c.x,
        y: c.y,
        label: "O",
        lx: -14,
        ly: -14,
        size: 3,
        mode: "dot",
        fontSize: 16,
        style: DEFAULT_STYLE,
      };

      return [circle, rLine, ptO];
    },
  },

  {
    id: "coordinate_axes",
    name: "Coordinate Plane (X-Y Axes)",
    category: "graphs",
    description: "4-quadrant Cartesian grid with numbered units.",
    create: (c) => {
      const axes: Obj = {
        id: uid(),
        type: "axes",
        x: c.x - 140,
        y: c.y - 120,
        w: 280,
        h: 240,
        rot: 0,
        xMin: -5,
        xMax: 5,
        yMin: -4,
        yMax: 4,
        showNumbers: true,
        showGrid: true,
        arrows: true,
        names: true,
        style: { ...DEFAULT_STYLE, width: 1.5 },
      };
      return [axes];
    },
  },

  {
    id: "number_line",
    name: "Number Line (-5 to +5)",
    category: "graphs",
    description: "Horizontal axis with integer ticks from -5 to +5.",
    create: (c) => {
      const line: Obj = {
        id: uid(),
        type: "numberline",
        x: c.x - 160,
        y: c.y - 30,
        w: 320,
        h: 60,
        rot: 0,
        min: -5,
        max: 5,
        step: 1,
        arrows: true,
        showNumbers: true,
        marks: [],
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      return [line];
    },
  },

  {
    id: "vertically_opposite",
    name: "Vertically Opposite Angles",
    category: "geometry",
    description: "Two straight intersecting lines with ∠1 and ∠2 equal vertical opposite angles.",
    create: (c) => {
      const l1: Obj = {
        id: uid(),
        type: "line",
        kind: "line",
        pts: [
          { x: c.x - 140, y: c.y - 70 },
          { x: c.x + 140, y: c.y + 70 },
        ],
        start: "open",
        end: "open",
        ticks: 0,
        parallels: 0,
        label: "",
        labelSize: 14,
        labelOffset: -12,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const l2: Obj = {
        id: uid(),
        type: "line",
        kind: "line",
        pts: [
          { x: c.x - 140, y: c.y + 70 },
          { x: c.x + 140, y: c.y - 70 },
        ],
        start: "open",
        end: "open",
        ticks: 0,
        parallels: 0,
        label: "",
        labelSize: 14,
        labelOffset: -12,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const a1: Obj = {
        id: uid(),
        type: "angle",
        v: { x: c.x, y: c.y },
        a: { x: c.x + 120, y: c.y - 60 },
        b: { x: c.x + 120, y: c.y + 60 },
        reflex: false,
        arcs: 1,
        arcR: 32,
        labelMode: "custom",
        label: "∠1",
        fontSize: 15,
        decimals: 0,
        rightMark: false,
        fillSector: false,
        armArrow: "none",
        armTicks: 0,
        style: { ...DEFAULT_STYLE, width: 1.5 },
      };
      const a2: Obj = {
        id: uid(),
        type: "angle",
        v: { x: c.x, y: c.y },
        a: { x: c.x - 120, y: c.y + 60 },
        b: { x: c.x - 120, y: c.y - 60 },
        reflex: false,
        arcs: 1,
        arcR: 32,
        labelMode: "custom",
        label: "∠2",
        fontSize: 15,
        decimals: 0,
        rightMark: false,
        fillSector: false,
        armArrow: "none",
        armTicks: 0,
        style: { ...DEFAULT_STYLE, width: 1.5 },
      };
      return [l1, l2, a1, a2];
    },
  },

  {
    id: "reflection_mirror",
    name: "Law of Reflection (∠i = ∠r)",
    category: "science",
    description: "Plane mirror surface with incident ray, normal, reflected ray, and marked angles.",
    create: (c) => {
      const mirrorY = c.y + 40;
      const mirror: Obj = {
        id: uid(),
        type: "stamp",
        stamp: "plane_mirror",
        x: c.x - 120,
        y: mirrorY - 10,
        w: 240,
        h: 20,
        rot: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const normal: Obj = {
        id: uid(),
        type: "line",
        kind: "line",
        pts: [
          { x: c.x, y: mirrorY },
          { x: c.x, y: mirrorY - 110 },
        ],
        start: "none",
        end: "none",
        ticks: 0,
        parallels: 0,
        label: "Normal",
        labelSize: 12,
        labelOffset: 12,
        style: { ...DEFAULT_STYLE, width: 1.5, dash: "dashed" },
      };
      const incRay: Obj = {
        id: uid(),
        type: "line",
        kind: "line",
        pts: [
          { x: c.x - 90, y: mirrorY - 90 },
          { x: c.x, y: mirrorY },
        ],
        start: "none",
        end: "filled",
        ticks: 0,
        parallels: 0,
        label: "",
        labelSize: 14,
        labelOffset: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const refRay: Obj = {
        id: uid(),
        type: "line",
        kind: "line",
        pts: [
          { x: c.x, y: mirrorY },
          { x: c.x + 90, y: mirrorY - 90 },
        ],
        start: "none",
        end: "filled",
        ticks: 0,
        parallels: 0,
        label: "",
        labelSize: 14,
        labelOffset: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const angI: Obj = {
        id: uid(),
        type: "angle",
        v: { x: c.x, y: mirrorY },
        a: { x: c.x, y: mirrorY - 70 },
        b: { x: c.x - 70, y: mirrorY - 70 },
        reflex: false,
        arcs: 1,
        arcR: 28,
        labelMode: "custom",
        label: "i",
        fontSize: 15,
        decimals: 0,
        rightMark: false,
        fillSector: false,
        armArrow: "none",
        armTicks: 0,
        style: { ...DEFAULT_STYLE, width: 1.5 },
      };
      const angR: Obj = {
        id: uid(),
        type: "angle",
        v: { x: c.x, y: mirrorY },
        a: { x: c.x + 70, y: mirrorY - 70 },
        b: { x: c.x, y: mirrorY - 70 },
        reflex: false,
        arcs: 1,
        arcR: 28,
        labelMode: "custom",
        label: "r",
        fontSize: 15,
        decimals: 0,
        rightMark: false,
        fillSector: false,
        armArrow: "none",
        armTicks: 0,
        style: { ...DEFAULT_STYLE, width: 1.5 },
      };
      return [mirror, normal, incRay, refRay, angI, angR];
    },
  },

  {
    id: "simple_circuit",
    name: "Complete Electric Circuit",
    category: "science",
    description: "Series circuit with battery, key switch, resistor, and ammeter.",
    create: (c) => {
      const w = 260;
      const h = 160;
      const left = c.x - w / 2;
      const right = c.x + w / 2;
      const top = c.y - h / 2;
      const btm = c.y + h / 2;

      const battery: Obj = {
        id: uid(),
        type: "stamp",
        stamp: "battery",
        x: c.x - 35,
        y: btm - 18,
        w: 70,
        h: 36,
        rot: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const resistor: Obj = {
        id: uid(),
        type: "stamp",
        stamp: "resistor",
        x: c.x - 40,
        y: top - 18,
        w: 80,
        h: 36,
        rot: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const ammeter: Obj = {
        id: uid(),
        type: "stamp",
        stamp: "ammeter",
        x: right - 22,
        y: c.y - 22,
        w: 44,
        h: 44,
        rot: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const sw: Obj = {
        id: uid(),
        type: "stamp",
        stamp: "switch_closed",
        x: left - 20,
        y: c.y - 18,
        w: 40,
        h: 36,
        rot: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      // Connecting wires
      const wires: Obj = {
        id: uid(),
        type: "line",
        kind: "polyline",
        pts: [
          { x: left, y: c.y - 18 },
          { x: left, y: top },
          { x: c.x - 40, y: top },
        ],
        start: "none",
        end: "none",
        ticks: 0,
        parallels: 0,
        label: "",
        labelSize: 14,
        labelOffset: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const wires2: Obj = {
        id: uid(),
        type: "line",
        kind: "polyline",
        pts: [
          { x: c.x + 40, y: top },
          { x: right, y: top },
          { x: right, y: c.y - 22 },
        ],
        start: "none",
        end: "none",
        ticks: 0,
        parallels: 0,
        label: "",
        labelSize: 14,
        labelOffset: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const wires3: Obj = {
        id: uid(),
        type: "line",
        kind: "polyline",
        pts: [
          { x: right, y: c.y + 22 },
          { x: right, y: btm },
          { x: c.x + 35, y: btm },
        ],
        start: "none",
        end: "none",
        ticks: 0,
        parallels: 0,
        label: "",
        labelSize: 14,
        labelOffset: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      const wires4: Obj = {
        id: uid(),
        type: "line",
        kind: "polyline",
        pts: [
          { x: c.x - 35, y: btm },
          { x: left, y: btm },
          { x: left, y: c.y + 18 },
        ],
        start: "none",
        end: "none",
        ticks: 0,
        parallels: 0,
        label: "",
        labelSize: 14,
        labelOffset: 0,
        style: { ...DEFAULT_STYLE, width: 2 },
      };
      return [battery, resistor, ammeter, sw, wires, wires2, wires3, wires4];
    },
  },
];
