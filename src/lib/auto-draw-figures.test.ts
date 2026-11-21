import { describe, expect, test } from "vitest";
import { autoDrawFigures, type AutoDrawDeps } from "./autoDrawFigures";

const items = [
  { questionId: "q1", description: "Triangle ABC" },
  { questionId: "q2", description: "Circle, centre O" },
];

function fakeDeps(overrides: Partial<AutoDrawDeps> = {}) {
  const patches: { id: string; body: unknown }[] = [];
  const progress: [number, number][] = [];
  const deps: AutoDrawDeps = {
    promptToFigure: async () => ({ isMock: false, objects: [{ kind: "line" }] }),
    renderAndUpload: async () => "11111111-1111-1111-1111-111111111111.png",
    patchQuestion: async (id, body) => {
      patches.push({ id, body });
    },
    onProgress: (d, t) => progress.push([d, t]),
    ...overrides,
  };
  return { deps, patches, progress };
}

describe("autoDrawFigures", () => {
  test("draws each in order and patches with figureAutoDrawn", async () => {
    const { deps, patches, progress } = fakeDeps();
    expect(await autoDrawFigures(items, deps)).toEqual({ drawn: 2, skipped: 0 });
    expect(patches.map((p) => p.id)).toEqual(["q1", "q2"]);
    expect(patches[0].body).toEqual({ imagePath: "11111111-1111-1111-1111-111111111111.png", figureAutoDrawn: true });
    expect(progress.at(-1)).toEqual([2, 2]);
  });

  test("mock result stops the pass and saves nothing", async () => {
    let calls = 0;
    const { deps, patches } = fakeDeps({
      promptToFigure: async () => {
        calls++;
        return { isMock: true, objects: [{ kind: "line" }] };
      },
    });
    expect(await autoDrawFigures(items, deps)).toEqual({ drawn: 0, skipped: 2 });
    expect(patches).toHaveLength(0);
    expect(calls).toBe(1);
  });

  test("a failing item is skipped, the rest continue", async () => {
    let n = 0;
    const { deps, patches } = fakeDeps({
      renderAndUpload: async () => {
        if (n++ === 0) throw new Error("render failed");
        return "22222222-2222-2222-2222-222222222222.png";
      },
    });
    expect(await autoDrawFigures(items, deps)).toEqual({ drawn: 1, skipped: 1 });
    expect(patches.map((p) => p.id)).toEqual(["q2"]);
  });

  test("empty objects skipped", async () => {
    const { deps, patches } = fakeDeps({ promptToFigure: async () => ({ isMock: false, objects: [] }) });
    expect(await autoDrawFigures(items, deps)).toEqual({ drawn: 0, skipped: 2 });
    expect(patches).toHaveLength(0);
  });

  test("nothing to draw", async () => {
    expect(await autoDrawFigures([], fakeDeps().deps)).toEqual({ drawn: 0, skipped: 0 });
  });
});
