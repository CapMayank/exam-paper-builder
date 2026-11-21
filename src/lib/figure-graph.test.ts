import { describe, expect, it } from "vitest";
import { boxesOverlap, labelBoxes, layoutGraph, niceStep, type GraphSpec } from "./figureGraph";

const W = 640;
const H = 360;

// the velocity-time graph from the bug report: 36 km/h falling to 0 in 5 s
const vt: GraphSpec = {
  xLabel: "Time (s)",
  yLabel: "Velocity (km/h)",
  xMin: 0, xMax: 6, xStep: 1,
  yMin: 0, yMax: 40, yStep: 10,
  series: [{ points: [{ x: 0, y: 36, label: "(0, 36)" }, { x: 5, y: 0, label: "(5, 0)" }] }],
};

function check(spec: GraphSpec) {
  const objs = layoutGraph(spec, W, H) as Array<Record<string, any>>;
  const boxes = labelBoxes(objs);
  for (const b of boxes) {
    expect(b.x, `${b.text} left edge`).toBeGreaterThanOrEqual(0);
    expect(b.y, `${b.text} top edge`).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w, `${b.text} right edge`).toBeLessThanOrEqual(W);
    expect(b.y + b.h, `${b.text} bottom edge`).toBeLessThanOrEqual(H);
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++)
      expect(boxesOverlap(boxes[i], boxes[j]), `"${boxes[i].text}" overlaps "${boxes[j].text}"`).toBe(false);
  for (const o of objs.filter((o) => o.type === "line"))
    for (const p of o.pts) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(W);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(H);
    }
  return objs;
}

describe("graph layout", () => {
  it("keeps every number, title and point label of the v-t graph apart and on the canvas", () => {
    check(vt);
  });

  it("centres each x number under its own tick", () => {
    const objs = layoutGraph(vt, W, H) as Array<Record<string, any>>;
    const xAxis = objs.find((o) => o.type === "line" && o.end === "filled" && o.pts[0].y === o.pts[1].y)!;
    const tickXs = objs
      .filter((o) => o.type === "line" && o.pts[0].x === o.pts[1].x && o.pts[0].y < xAxis.pts[0].y && o.pts[1].y > xAxis.pts[0].y)
      .map((o) => o.pts[0].x);
    const numbers = objs.filter((o) => o.type === "text" && /^[1-6]$/.test(o.text) && o.y > xAxis.pts[0].y);
    expect(numbers).toHaveLength(6);
    for (const t of numbers) expect(tickXs.some((x) => Math.abs(x - (t.x + t.w / 2)) < 0.01)).toBe(true);
  });

  it("puts the plotted point (5, 0) on the 5 tick", () => {
    const objs = layoutGraph(vt, W, H) as Array<Record<string, any>>;
    const five = objs.find((o) => o.type === "text" && o.text === "5")!;
    const p = objs.find((o) => o.type === "point" && o.label === "(5, 0)")!;
    expect(p.x).toBeCloseTo(five.x + five.w / 2);
  });

  it("writes the y title rotated, clear of the numbers", () => {
    const objs = layoutGraph(vt, W, H) as Array<Record<string, any>>;
    expect(objs.find((o) => o.text === "Velocity (km/h)")!.rot).toBeCloseTo(-Math.PI / 2);
  });

  it("handles big numbers, negative ranges and many labelled points without overlap", () => {
    check({ xLabel: "Mass (kg)", yLabel: "Force (N)", series: [{ points: [{ x: 0, y: 0, label: "O" }, { x: 2500, y: 12000, label: "A (2500, 12000)" }, { x: 5000, y: 24000, label: "B" }] }] });
    check({ xLabel: "x", yLabel: "y", xMin: -4, xMax: 4, yMin: -3, yMax: 3, series: [{ points: [{ x: -4, y: -3, label: "P" }, { x: 4, y: 3, label: "Q" }] }] });
    check({ xLabel: "t", yLabel: "s", series: [{ kind: "dots", points: [1, 2, 3, 4, 5].map((x) => ({ x, y: x * x, label: `(${x}, ${x * x})` })) }] });
  });

  it("picks round steps", () => {
    expect(niceStep(40)).toBe(10);
    expect(niceStep(6)).toBe(1);
    expect(niceStep(24000)).toBe(5000);
  });
});
