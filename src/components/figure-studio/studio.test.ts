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
} from "./geometry";
import { embedSceneInPng, extractSceneFromPng, isPng } from "./pngMeta";
import type { AngleObj, Doc, SceneFile, ShapeObj } from "./types";

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
