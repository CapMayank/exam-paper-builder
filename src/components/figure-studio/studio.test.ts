import { describe, expect, it } from "vitest";
import {
  angleGeom,
  withAngleDegrees,
  isRightAngle,
  snapPoint,
  objectBounds,
  hitTest,
  hatchGeometry,
  rotateAround,
  rad,
  cloneWithRemappedGroups,
  expandGroupSelection,
  marqueeSelectIds,
  rectsIntersect,
  objectSnapPoints,
  scaleObj,
} from "./geometry";
import { embedSceneInPng, extractSceneFromPng, isPng } from "./pngMeta";
import { getShadedCells, stepShadedCells } from "./fractions";
import type { AngleObj, Doc, LineObj, PathObj, PointObj, SceneFile, ShapeObj, TextObj } from "./types";

describe("Figure Studio - Geometry & Angle Engine", () => {
  it("computes angle geometry and degrees correctly", () => {
    // Vertex at (0, 0), arm A along +X at (100, 0), arm B along +Y at (0, 100) -> 90 degrees
    const v = { x: 0, y: 0 };
    const a = { x: 100, y: 0 };
    const b = { x: 0, y: 100 };

    const geom = angleGeom(v, a, b, false);
    expect(Math.round(geom.deg)).toBe(90);

    // Reflex angle should be 360 - 90 = 270 degrees
    const reflexGeom = angleGeom(v, a, b, true);
    expect(Math.round(reflexGeom.deg)).toBe(270);
  });

  it("adjusts arm B to match exact target degrees with withAngleDegrees", () => {
    const angle: AngleObj = {
      id: "a1",
      type: "angle",
      v: { x: 100, y: 100 },
      a: { x: 200, y: 100 },
      b: { x: 100, y: 200 },
      reflex: false,
      arcR: 30,
      arcs: 1,
      rightMark: true,
      labelMode: "auto",
      label: "",
      decimals: 0,
      fontSize: 14,
      fillSector: false,
      armArrow: "none",
      armTicks: 0,
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };

    // Rotate to exact 60 degrees
    const updated = withAngleDegrees(angle, 60);
    const measured = angleGeom(angle.v, angle.a, updated.b, updated.reflex);
    expect(Math.round(measured.deg)).toBe(60);

    // Rotate to exact 120 degrees
    const updated120 = withAngleDegrees(angle, 120);
    const measured120 = angleGeom(angle.v, angle.a, updated120.b, updated120.reflex);
    expect(Math.round(measured120.deg)).toBe(120);
  });

  it("detects right angles accurately", () => {
    const rightAngle: AngleObj = {
      id: "a2",
      type: "angle",
      v: { x: 50, y: 50 },
      a: { x: 150, y: 50 },
      b: { x: 50, y: 150 },
      reflex: false,
      arcR: 24,
      arcs: 1,
      rightMark: true,
      labelMode: "auto",
      label: "",
      decimals: 0,
      fontSize: 14,
      fillSector: false,
      armArrow: "none",
      armTicks: 0,
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    expect(isRightAngle(rightAngle)).toBe(true);

    // If angle is 45 degrees, it should not be a right angle
    const acute = {
      ...rightAngle,
      ...withAngleDegrees(rightAngle, 45),
    };
    expect(isRightAngle(acute)).toBe(false);
  });

  it("snaps points to grid and key points", () => {
    // Grid snapping (grid = 20)
    const resGrid = snapPoint({ x: 23, y: 39 }, { grid: 20, tol: 8 });
    expect(resGrid.p).toEqual({ x: 20, y: 40 });
    expect(resGrid.kind).toBe("grid");

    // Key point snapping
    const keyPoints = [{ x: 100, y: 100 }, { x: 200, y: 200 }];
    const resPoint = snapPoint({ x: 102, y: 99 }, { points: keyPoints, grid: 20, tol: 8 });
    expect(resPoint.p).toEqual({ x: 100, y: 100 });
    expect(resPoint.kind).toBe("point");
  });

  it("computes object bounds and performs hit-testing", () => {
    const rectShape: ShapeObj = {
      id: "s1",
      type: "shape",
      kind: "rect",
      x: 50,
      y: 50,
      w: 100,
      h: 80,
      rot: 0,
      sides: 4,
      radius: 0,
      a0: 0,
      a1: 360,
      inner: 0.5,
      style: { stroke: "#000", width: 2, dash: "solid", fill: "#ff0000", hatch: "none", opacity: 1 },
    };

    const bounds = objectBounds(rectShape);
    expect(bounds.x).toBeLessThanOrEqual(50);
    expect(bounds.y).toBeLessThanOrEqual(50);
    expect(bounds.w).toBeGreaterThanOrEqual(100);
    expect(bounds.h).toBeGreaterThanOrEqual(80);

    // Hit-testing
    expect(hitTest(rectShape, { x: 100, y: 90 }, 4)).toBe(true);
    expect(hitTest(rectShape, { x: 20, y: 20 }, 4)).toBe(false);
  });

  it("computes hatch lines and affine rotations", () => {
    const hatch = hatchGeometry({ x: 0, y: 0, w: 100, h: 100 }, "diagonal", 10);
    expect(hatch.lines.length).toBeGreaterThan(0);

    const rotated = rotateAround({ x: 10, y: 0 }, { x: 0, y: 0 }, rad(90));
    expect(Math.round(rotated.x)).toBe(0);
    expect(Math.round(rotated.y)).toBe(10);
  });
});

describe("Figure Studio - PNG Metadata & Scene Roundtrip", () => {
  // Construct a minimal valid PNG image in memory
  function makeMinimalPng(): Uint8Array {
    // 8-byte PNG signature
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    // IHDR chunk (13 bytes data: 1x1 8-bit RGBA)
    // len: 13, type: IHDR, width: 1, height: 1, bitDepth: 8, colorType: 6, comp: 0, filter: 0, interlace: 0
    const ihdr = [
      0x00, 0x00, 0x00, 0x0d, // len
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width 1
      0x00, 0x00, 0x00, 0x01, // height 1
      0x08, 0x06, 0x00, 0x00, 0x00,
      0x1f, 0x15, 0xc4, 0x89, // CRC
    ];
    // IEND chunk
    const iend = [
      0x00, 0x00, 0x00, 0x00, // len
      0x49, 0x45, 0x4e, 0x44, // IEND
      0xae, 0x42, 0x60, 0x82, // CRC
    ];
    return new Uint8Array([...sig, ...ihdr, ...iend]);
  }

  it("verifies PNG signature check", () => {
    const pngBytes = makeMinimalPng();
    expect(isPng(pngBytes)).toBe(true);

    const invalidBytes = new Uint8Array([1, 2, 3, 4]);
    expect(isPng(invalidBytes)).toBe(false);
  });

  it("embeds and extracts scene JSON lossless roundtrip", async () => {
    const pngBytes = makeMinimalPng();
    const blob = new Blob([pngBytes.buffer as ArrayBuffer], { type: "image/png" });

    const sceneFile: SceneFile = {
      v: 1,
      doc: {
        w: 640,
        h: 360,
        bg: "white",
        objects: [
          {
            id: "angle1",
            type: "angle",
            v: { x: 200, y: 200 },
            a: { x: 300, y: 200 },
            b: { x: 250, y: 120 },
            reflex: false,
            arcR: 35,
            arcs: 1,
            rightMark: false,
            labelMode: "custom",
            label: "θ",
            decimals: 0,
            fontSize: 16,
            fillSector: false,
            armArrow: "none",
            armTicks: 0,
            style: { stroke: "#000000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
          },
        ],
      },
      grid: { style: "squares", size: 20, include: false },
    };

    const json = JSON.stringify(sceneFile);
    const modifiedBlob = await embedSceneInPng(blob, json);
    const modifiedBuffer = await modifiedBlob.arrayBuffer();

    const extractedJson = extractSceneFromPng(modifiedBuffer);
    expect(extractedJson).not.toBeNull();
    expect(extractedJson).toBe(json);

    const parsedScene: SceneFile = JSON.parse(extractedJson!);
    expect(parsedScene.doc.objects.length).toBe(1);
    expect(parsedScene.doc.objects[0].type).toBe("angle");
    expect((parsedScene.doc.objects[0] as AngleObj).label).toBe("θ");
  });
});

describe("Figure Studio - Custom Fraction Shading", () => {
  it("falls back to sequential indices when shadedCells is undefined", () => {
    expect(getShadedCells({ model: "bar", parts: 5, rows: 1, shaded: 3 })).toEqual([0, 1, 2]);
  });

  it("filters, deduplicates, sorts, and clamps shadedCells to grid total", () => {
    expect(
      getShadedCells({ model: "grid", parts: 4, rows: 2, shaded: 3, shadedCells: [8, 2, 0, 2, -1] }),
    ).toEqual([0, 2]);
  });

  it("preserves custom pattern when stepping shaded count up or down", () => {
    const base = { model: "grid" as const, parts: 6, rows: 2, shaded: 2, shadedCells: [1, 4] };
    expect(stepShadedCells(base, 3)).toEqual([0, 1, 4]);
    expect(stepShadedCells(base, 1)).toEqual([1]);
  });
});

describe("Figure Studio - Grouping & Marquee Selection", () => {
  const mkRect = (id: string, x: number, y: number, extra: Partial<ShapeObj> = {}): ShapeObj => ({
    id,
    type: "shape",
    kind: "rect",
    x,
    y,
    w: 40,
    h: 40,
    rot: 0,
    sides: 4,
    a0: 0,
    a1: 90,
    radius: 0,
    inner: 0.5,
    style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    ...extra,
  });

  it("expands selection to all unlocked members of a group", () => {
    const objs = [
      mkRect("a", 0, 0, { groupId: "g1" }),
      mkRect("b", 100, 0, { groupId: "g1" }),
      mkRect("c", 200, 0, { groupId: "g1", locked: true }),
      mkRect("d", 300, 0),
    ];
    expect(expandGroupSelection(objs, ["a"])).toEqual(["a", "b"]);
  });

  it("marquee selects intersecting unlocked objects, expands groups, and unions when additive", () => {
    const objs = [
      mkRect("a", 10, 10, { groupId: "g1" }),
      mkRect("b", 200, 200, { groupId: "g1" }),
      mkRect("c", 300, 300),
    ];
    expect(rectsIntersect({ x: 0, y: 0, w: 30, h: 30 }, { x: 10, y: 10, w: 40, h: 40 })).toBe(true);
    expect(rectsIntersect({ x: 0, y: 0, w: 30, h: 30 }, { x: 200, y: 200, w: 40, h: 40 })).toBe(false);
    expect(marqueeSelectIds(objs, { x: 0, y: 0, w: 30, h: 30 }, ["c"], false)).toEqual(["a", "b"]);
    expect(marqueeSelectIds(objs, { x: 0, y: 0, w: 30, h: 30 }, ["c"], true)).toEqual(["c", "a", "b"]);
  });

  it("skips locked objects inside the marquee rect", () => {
    const objs = [
      mkRect("a", 10, 10),
      mkRect("locked_in", 15, 15, { locked: true }),
      mkRect("grouped_unlocked", 200, 200, { groupId: "g1" }),
      mkRect("grouped_locked", 12, 12, { groupId: "g1", locked: true }),
    ];
    expect(marqueeSelectIds(objs, { x: 0, y: 0, w: 60, h: 60 }, [], false)).toEqual(["a"]);
  });

  it("clones mixed grouped and ungrouped objects with remapped groupIds", () => {
    const objs = [
      mkRect("a", 0, 0, { groupId: "g1" }),
      mkRect("b", 50, 0, { groupId: "g1" }),
      mkRect("c", 100, 0, { groupId: "g2" }),
      mkRect("d", 150, 0),
    ];
    let n = 0;
    const clones = cloneWithRemappedGroups(objs, 20, 20, () => `id_${++n}`);
    expect(clones.map((c) => c.id)).toEqual(["id_1", "id_3", "id_4", "id_6"]);
    expect(clones[0].groupId).toBe("id_2");
    expect(clones[1].groupId).toBe("id_2");
    expect(clones[2].groupId).toBe("id_5");
    expect(clones[2].groupId).not.toBe("g2");
    expect(clones[3].groupId).toBeUndefined();
  });
});

describe("Figure Studio - Group Scaling & Object Snapping", () => {
  it("scales BoxObj, TextObj font size, and keeps stroke width fixed", () => {
    const txt: TextObj = {
      id: "t1",
      type: "text",
      x: 100,
      y: 100,
      w: 80,
      h: 30,
      rot: 0,
      text: "ABC",
      font: "sans",
      size: 16,
      bold: false,
      italic: false,
      underline: false,
      align: "center",
      bg: "none",
      border: false,
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    const scaled = scaleObj(txt, 0.5, 0.5, { x: 0, y: 0 });
    expect(scaled.x).toBe(50);
    expect(scaled.y).toBe(50);
    expect(scaled.w).toBe(40);
    expect(scaled.h).toBe(15);
    expect(scaled.size).toBe(8);
    expect(scaled.style.width).toBe(2);
  });

  it("clamps minimum box size and falls back to uniform scale on rotated BoxObj", () => {
    const box: ShapeObj = {
      id: "s1",
      type: "shape",
      kind: "rect",
      x: 10,
      y: 10,
      w: 20,
      h: 20,
      rot: Math.PI / 4,
      sides: 4,
      a0: 0,
      a1: 90,
      radius: 0,
      inner: 0.5,
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    const tiny = scaleObj(box, 0.01, 0.01, { x: 0, y: 0 });
    expect(tiny.w).toBeGreaterThanOrEqual(4);
    expect(tiny.h).toBeGreaterThanOrEqual(4);

    const nonUniformRot = scaleObj(box, 2, 4, { x: 0, y: 0 });
    expect(nonUniformRot.w).toBe(nonUniformRot.h);
  });

  it("extracts vertices, midpoints, and centers in objectSnapPoints", () => {
    const line: LineObj = {
      id: "l1",
      type: "line",
      kind: "line",
      pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      start: "none",
      end: "none",
      ticks: 0,
      parallels: 0,
      label: "",
      labelSize: 14,
      labelOffset: 10,
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    const pts = objectSnapPoints(line);
    expect(pts).toContainEqual({ x: 0, y: 0 });
    expect(pts).toContainEqual({ x: 50, y: 0 });
    expect(pts).toContainEqual({ x: 100, y: 0 });
  });

  it("scales AngleObj (arcR, fontSize), PointObj (lx, ly, fontSize), and PathObj", () => {
    const angle: AngleObj = {
      id: "a1",
      type: "angle",
      v: { x: 10, y: 10 },
      a: { x: 110, y: 10 },
      b: { x: 10, y: 110 },
      reflex: false,
      arcR: 20,
      arcs: 1,
      rightMark: false,
      labelMode: "auto",
      label: "",
      decimals: 0,
      fontSize: 16,
      fillSector: false,
      armArrow: "none",
      armTicks: 0,
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    const scaledAngle = scaleObj(angle, 2, 2, { x: 10, y: 10 });
    expect(scaledAngle.v).toEqual({ x: 10, y: 10 });
    expect(scaledAngle.a).toEqual({ x: 210, y: 10 });
    expect(scaledAngle.b).toEqual({ x: 10, y: 210 });
    expect(scaledAngle.arcR).toBe(40);
    expect(scaledAngle.fontSize).toBe(32);

    const tinyAngle = scaleObj(angle, 0.1, 0.1, { x: 0, y: 0 });
    expect(tinyAngle.arcR).toBe(4);
    expect(tinyAngle.fontSize).toBe(8);

    const point: PointObj = {
      id: "pt1",
      type: "point",
      x: 50,
      y: 30,
      label: "A",
      lx: 12,
      ly: -10,
      size: 3.5,
      mode: "dot",
      fontSize: 16,
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    const scaledPoint = scaleObj(point, 2, 0.5, { x: 10, y: 10 });
    expect(scaledPoint.x).toBe(90);
    expect(scaledPoint.y).toBe(20);
    expect(scaledPoint.lx).toBe(24);
    expect(scaledPoint.ly).toBe(-5);
    expect(scaledPoint.fontSize).toBe(20); // round(16 * ((2 + 0.5) / 2))

    const path: PathObj = {
      id: "p1",
      type: "path",
      pts: [10, 20, 30, 60],
      style: { stroke: "#000", width: 3, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    const scaledPath = scaleObj(path, 2, 0.5, { x: 10, y: 20 });
    expect(scaledPath.pts).toEqual([10, 20, 50, 40]);
    expect(scaledPath.style.width).toBe(3);
  });

  it("extracts snap points for AngleObj, PointObj, PathObj, and rotated BoxObj", () => {
    const angle: AngleObj = {
      id: "a1",
      type: "angle",
      v: { x: 0, y: 0 },
      a: { x: 100, y: 0 },
      b: { x: 0, y: 80 },
      reflex: false,
      arcR: 20,
      arcs: 1,
      rightMark: false,
      labelMode: "auto",
      label: "",
      decimals: 0,
      fontSize: 14,
      fillSector: false,
      armArrow: "none",
      armTicks: 0,
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    expect(objectSnapPoints(angle)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 80 },
      { x: 50, y: 0 },
      { x: 0, y: 40 },
    ]);

    const point: PointObj = {
      id: "pt1",
      type: "point",
      x: 42,
      y: 84,
      label: "P",
      lx: 10,
      ly: -10,
      size: 3,
      mode: "dot",
      fontSize: 14,
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    expect(objectSnapPoints(point)).toEqual([{ x: 42, y: 84 }]);

    const path: PathObj = {
      id: "p1",
      type: "path",
      pts: [0, 0, 10, 10, 20, 0],
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    expect(objectSnapPoints(path)).toEqual([]);

    // 40x20 box centered at (100, 100), rotated 90 degrees -> half-extents become (10, 20)
    const rotatedBox: ShapeObj = {
      id: "b1",
      type: "shape",
      kind: "rect",
      x: 80,
      y: 90,
      w: 40,
      h: 20,
      rot: Math.PI / 2,
      sides: 4,
      a0: 0,
      a1: 90,
      radius: 0,
      inner: 0.5,
      style: { stroke: "#000", width: 2, dash: "solid", fill: null, hatch: "none", opacity: 1 },
    };
    const boxPts = objectSnapPoints(rotatedBox).map((q) => ({
      x: Math.round(q.x),
      y: Math.round(q.y),
    }));
    expect(boxPts).toHaveLength(9);
    expect(boxPts).toContainEqual({ x: 100, y: 100 }); // center
    expect(boxPts).toContainEqual({ x: 110, y: 80 }); // rotated corners
    expect(boxPts).toContainEqual({ x: 90, y: 120 });
    expect(boxPts).toContainEqual({ x: 110, y: 100 }); // rotated edge midpoints
    expect(boxPts).toContainEqual({ x: 100, y: 80 });
  });
});
