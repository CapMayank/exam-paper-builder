# Figure Studio Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add flat grouping (`groupId`), marquee drag-select + Shift-select, custom cell/slice fraction shading, proportional group/multi-select resize, object key-point snapping, and one-click PNG clipboard copy to Figure Studio.

**Architecture:** Extend `Base` with optional `groupId?: string` and `FractionObj` with optional `shadedCells?: number[]` in `types.ts`, keeping `Doc.objects` flat and 100% backwards-compatible with `pngMeta.ts` and `gemini.ts`. Pure geometry, grouping, and fraction helpers live in `geometry.ts` and `fractions.ts` with Vitest coverage in `studio.test.ts`, while `render.ts`, `FigureInspectors.tsx`, `ObjectInspectors.tsx`, and `FigureStudio.tsx` wire up rendering and 60fps pointer interactions.

**Tech Stack:** TypeScript, React 19, Next.js App Router, HTML5 Canvas 2D, Tailwind CSS, Lucide Icons, Vitest.

**Spec:** [2026-11-17-figure-studio-enhancements-design.md](file:///c:/Users/StrawHat/MasterRepo/web_develpoment/exam-paper-builder/docs/superpowers/specs/2026-11-17-figure-studio-enhancements-design.md)

## Global Constraints

- `Base.groupId?: string` and `FractionObj.shadedCells?: number[]` MUST remain optional and default cleanly to legacy behavior for existing `examfig` PNGs and `gemini.ts` outputs.
- Locked objects (`locked === true`) MUST be skipped by marquee selection, `Ctrl+A`, group creation, and group transforms.
- Pointer-move drags (marquee, group scale, snapping) MUST stay ref-driven at 60fps and commit to undo history (`pushHistory`) only on `pointerup`.
- Freehand `pen` and `highlighter` strokes MUST NEVER be snapped; `snapToObjects` and grid `snap` are independent toggles both bypassed while `Alt` is held.
- `style.width` (stroke width) stays fixed during `scaleObj`; text/label font sizes scale proportionally clamped to `>= 8px`.

## Review Focus

1. **Duplicate/paste of mixed grouped + ungrouped objects:** Cloning a selection containing two separate groups plus an ungrouped object must assign two distinct new `groupId`s and leave the ungrouped object with `groupId === undefined` (tested in Task 2).
2. **Marquee partially touching a grouped object:** Dragging a marquee over just one shape of a 3-shape group must select all unlocked members of that group without selecting locked members (tested in Task 2).
3. **Custom `shadedCells` after reducing `parts` or `rows`:** Reducing a 3x3 grid (`shadedCells: [0, 4, 8]`) to 2x2 (`total = 4`) must clamp `shadedCells` to `[0]` and `shaded` to `1` rather than keeping out-of-range index `8` (tested in Task 1).
4. **Zero-size or inverted drag during group resize:** Dragging a multi-select corner handle past the opposite corner (`origin`) must clamp minimum scale/dimensions (`w >= 4`, `h >= 4`) instead of producing negative dimensions or `NaN` (tested in Task 3).
5. **Rotated `BoxObj` non-uniform scale:** Calling `scaleObj` with `sx !== sy` on a `BoxObj` with `rot !== 0` must fall back to uniform scaling by `sAvg` instead of distorting `BoxFields` (tested in Task 3).

---

### Task 1: Schema & Custom Fraction Shading (`types.ts`, `fractions.ts`, `render.ts`, `FigureInspectors.tsx`)

**Files:**
- Modify: `src/components/figure-studio/types.ts:28-32,212-221`
- Modify: `src/components/figure-studio/fractions.ts:1-54`
- Modify: `src/components/figure-studio/render.ts:838-902`
- Modify: `src/components/figure-studio/FigureInspectors.tsx:1052-1117`
- Test: `src/components/figure-studio/studio.test.ts`

**Interfaces:**
- Produces:
  - `Base.groupId?: string` in `types.ts`
  - `FractionObj.shadedCells?: number[]` in `types.ts`
  - `getShadedCells(obj: Pick<FractionObj, "model" | "parts" | "rows" | "shaded" | "shadedCells">): number[]` in `fractions.ts`
  - `stepShadedCells(obj: Pick<FractionObj, "model" | "parts" | "rows" | "shaded" | "shadedCells">, nextCount: number): number[]` in `fractions.ts`

- [ ] **Step 1: Write the failing tests in `studio.test.ts`**

```ts
import { getShadedCells, stepShadedCells } from "./fractions";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/figure-studio/studio.test.ts`
Expected: FAIL with `getShadedCells` / `stepShadedCells` not exported from `./fractions`.

- [ ] **Step 3: Add `groupId?: string` to `Base` and `shadedCells?: number[]` to `FractionObj` in `src/components/figure-studio/types.ts`**

- [ ] **Step 4: Implement `getShadedCells` and `stepShadedCells` in `src/components/figure-studio/fractions.ts`**

`getShadedCells` computes `total = obj.model === "grid" ? rows * Math.max(1, Math.round(parts / rows)) : parts`, then either normalizes `obj.shadedCells` (unique integers `0 <= i < total`, sorted ascending) or returns `[0..Math.min(shaded, total)-1]`. `stepShadedCells` adds lowest unshaded indices when `nextCount > current.length`, or slices from the end when `nextCount < current.length`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/figure-studio/studio.test.ts`
Expected: PASS.

- [ ] **Step 6: Update `renderFraction` in `src/components/figure-studio/render.ts` and `FractionInspector` in `src/components/figure-studio/FigureInspectors.tsx`**

In `renderFraction`, build `const shadedSet = new Set(getShadedCells(obj))`, fill index `i` when `shadedSet.has(i)`, and display `shadedSet.size` in the fraction label. In `FractionInspector`, add the clickable mini-grid / mini-bar / mini-circle SVG picker that toggles indices in `shadedCells` and syncs `shaded`; presets reset `shadedCells` to `[0..n-1]`, while `Stepper` uses `stepShadedCells`, and changing `parts`/`rows` clamps `shadedCells` via `getShadedCells`.

- [ ] **Step 7: Commit**

```bash
git add src/components/figure-studio/types.ts src/components/figure-studio/fractions.ts src/components/figure-studio/render.ts src/components/figure-studio/FigureInspectors.tsx src/components/figure-studio/studio.test.ts
git commit -m "feat(figure-studio): support custom fraction cell shading and groupId schema"
```

---

### Task 2: Grouping & Marquee Selection Helpers (`geometry.ts`, `studio.test.ts`)

**Files:**
- Modify: `src/components/figure-studio/geometry.ts:653-675`
- Test: `src/components/figure-studio/studio.test.ts`

**Interfaces:**
- Consumes: `Base.groupId` (`types.ts`), `objectBounds` (`geometry.ts`), `translateObj` (`geometry.ts`)
- Produces:
  - `rectsIntersect(a: Rect, b: Rect): boolean` in `geometry.ts`
  - `expandGroupSelection(objects: Obj[], seedIds: string[]): string[]` in `geometry.ts`
  - `marqueeSelectIds(objects: Obj[], marquee: Rect, existingIds: string[], additive: boolean): string[]` in `geometry.ts`
  - `cloneWithRemappedGroups(objs: Obj[], dx: number, dy: number, makeId: () => string): Obj[]` in `geometry.ts`

- [ ] **Step 1: Write the failing tests in `studio.test.ts`**

```ts
import {
  cloneWithRemappedGroups,
  expandGroupSelection,
  marqueeSelectIds,
  rectsIntersect,
} from "./geometry";

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
    expect(marqueeSelectIds(objs, { x: 0, y: 0, w: 30, h: 30 }, ["c"], false)).toEqual(["a", "b"]);
    expect(marqueeSelectIds(objs, { x: 0, y: 0, w: 30, h: 30 }, ["c"], true)).toEqual(["c", "a", "b"]);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/figure-studio/studio.test.ts`
Expected: FAIL with missing exports from `./geometry`.

- [ ] **Step 3: Implement `rectsIntersect`, `expandGroupSelection`, `marqueeSelectIds`, and `cloneWithRemappedGroups` in `src/components/figure-studio/geometry.ts`**

`expandGroupSelection` collects all `groupId`s present on `seedIds` and returns IDs of all unlocked objects matching `seedIds` or those `groupId`s (preserving `objects` order). `marqueeSelectIds` finds unlocked objects whose `objectBounds(o)` intersects `marquee`, expands via `expandGroupSelection`, and unions with `existingIds` when `additive` is true. `cloneWithRemappedGroups` translates each object by `(dx, dy)`, assigns a fresh `id = makeId()`, and maps each unique non-empty `groupId` to a fresh `makeId()` via a `Map<string, string>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/figure-studio/studio.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/figure-studio/geometry.ts src/components/figure-studio/studio.test.ts
git commit -m "feat(figure-studio): add group selection, marquee, and clone helpers"
```

---

### Task 3: Proportional Group Scaling & Object Key-Point Snapping (`geometry.ts`, `studio.test.ts`)

**Files:**
- Modify: `src/components/figure-studio/geometry.ts:578-610,818-865`
- Test: `src/components/figure-studio/studio.test.ts`

**Interfaces:**
- Produces:
  - `scaleObj<T extends Obj>(o: T, sx: number, sy: number, origin: Pt): T` in `geometry.ts`
  - `objectSnapPoints(o: Obj): Pt[]` in `geometry.ts`

- [ ] **Step 1: Write the failing tests in `studio.test.ts`**

```ts
import { objectSnapPoints, scaleObj } from "./geometry";

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/figure-studio/studio.test.ts`
Expected: FAIL with `scaleObj` / `objectSnapPoints` not exported from `./geometry`.

- [ ] **Step 3: Implement `scaleObj` and `objectSnapPoints` in `src/components/figure-studio/geometry.ts`**

`scaleObj` scales coordinates around `origin` (`origin.x + (p.x - origin.x) * sx`), enforces minimum `w >= 4`, `h >= 4` and positive scale factors, uses uniform `sAvg` when `rot !== 0 && sx !== sy`, scales `TextObj.size`, `LineObj.labelSize`, `AngleObj.fontSize`, `PointObj.fontSize` by `sAvg` clamped `>= 8`, and keeps `style.width` unchanged. `objectSnapPoints` returns segment endpoints + midpoints for `LineObj`, `{ v, a, b }` + arm midpoints for `AngleObj`, `{ x, y }` for `PointObj`, and rotated 4 corners + 4 edge midpoints + center for `BoxObj`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/figure-studio/studio.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/figure-studio/geometry.ts src/components/figure-studio/studio.test.ts
git commit -m "feat(figure-studio): add proportional scaleObj and objectSnapPoints"
```

---

### Task 4: Wire Grouping, Marquee, Group Resize, Snapping, and Copy PNG into UI (`ObjectInspectors.tsx`, `FigureStudio.tsx`)

**Files:**
- Modify: `src/components/figure-studio/ObjectInspectors.tsx:120-210`
- Modify: `src/components/figure-studio/FigureStudio.tsx`

**Interfaces:**
- Consumes: `expandGroupSelection`, `marqueeSelectIds`, `cloneWithRemappedGroups`, `scaleObj`, `objectSnapPoints`, `snapPoint`, `selectionBounds` (`geometry.ts`)

- [ ] **Step 1: Add Group / Ungroup actions to `ObjectInspectors.tsx` multi-selection inspector**

Add `Group` and `Ungroup` buttons (using `Group` / `Ungroup` icons from `lucide-react` or clear labeled chips) to the multi-selection panel when `selectedCount > 1` or any selected object has `groupId`.

- [ ] **Step 2: Wire Marquee Drag-Select & `Shift+Click` / `Shift+Drag` in `FigureStudio.tsx`**

Add `marqueeRef = useRef<{ start: Pt; current: Pt; additive: boolean } | null>(null)`. In `handlePointerDown` (`activeTool === "select"`):
- If `hit` is found: resolve `groupIds = expandGroupSelection(doc.objects, [hit.id])`; if `e.shiftKey`, toggle `groupIds` in `selectedIds`, else set `selectedIds(groupIds)`.
- If no `hit` is found: initialize `marqueeRef.current = { start: p, current: p, additive: e.shiftKey }`, and if `!e.shiftKey` clear `selectedIds([])`.
In `handlePointerMove`, update `marqueeRef.current.current = p`. In `render()`, draw the dashed indigo marquee rect when `marqueeRef.current` is active. In `handlePointerUp`, compute normalized `Rect` and call `marqueeSelectIds(doc.objects, rect, selectedIds, marqueeRef.current.additive)`, then clear `marqueeRef.current`.

- [ ] **Step 3: Wire Grouping (`Ctrl+G` / `Ctrl+Shift+G`) & `cloneWithRemappedGroups` in `FigureStudio.tsx`**

Implement `groupSelected()` and `ungroupSelected()` (filtering out `locked` objects, pushing to `pushHistory`). Bind `Ctrl+G` / `Cmd+G` (Group) and `Ctrl+Shift+G` / `Cmd+Shift+G` (Ungroup) in `handleKeyDown`. Update `Ctrl+C`/`Ctrl+V` and `duplicateSelected()` to use `cloneWithRemappedGroups`.

- [ ] **Step 4: Wire Multi-Selection Corner Resize Handles in `FigureStudio.tsx`**

When `selectedIds.length > 1`, draw 4 corner handles on `sb = selectionBounds(selectedObjs)` in `render()`. In `handlePointerDown`, hit-test those 4 corner handles before object hit-testing, storing `groupScaleRef.current = { origin, startBounds: sb, snapshot: selectedObjs, startPt: p }`. In `handlePointerMove`, compute uniform `s` (or free `(sx, sy)` if `e.shiftKey`) from pointer to `origin` and update `doc.objects` via `scaleObj`. Commit `pushHistory` on `pointerup`.

- [ ] **Step 5: Wire Object Key-Point Snapping (`snapToObjects`) & Visual Snap Indicator in `FigureStudio.tsx`**

Add `snapToObjects` state (default `true`) with a toggle button in the top/grid controls. Create a helper `snapScenePt(raw: Pt, excludeIds?: Set<string>)` that skips snapping for `pen`/`highlighter` or when `altKey` is held, gathers `objectSnapPoints` from other objects when `snapToObjects` is on, calls `snapPoint`, and stores `activeSnapRef.current`. Render a crisp indigo snap ring/crosshair at `activeSnapRef.current.target` when `kind === "point"`.

- [ ] **Step 6: Add One-Click Copy PNG (`copyFigurePng`, `Ctrl+Shift+C`) in `FigureStudio.tsx`**

Add a "Copy PNG" button in the top bar next to "Use figure" (and `Ctrl+Shift+C` shortcut) that calls `renderDocToBlob(doc, grid, 2, cropToFigure)` and `navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])`, showing brief `"Copied!"` feedback or a friendly error message if clipboard write is unsupported/blocked.

- [ ] **Step 7: Run full unit tests and TypeScript check**

Run: `npx vitest run src/components/figure-studio/studio.test.ts`
Run: `npx tsc --noEmit`
Expected: All Vitest tests PASS and `tsc --noEmit` exits with code 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/figure-studio/ObjectInspectors.tsx src/components/figure-studio/FigureStudio.tsx
git commit -m "feat(figure-studio): wire grouping, marquee, group resize, snapping, and PNG copy"
```

---

## Self-Review

1. **Spec coverage:**
   - 5.1 Grouping & Marquee + `Shift+Click` / `Shift+Drag` + `Ctrl+G`/`Ctrl+Shift+G` + remapped copy/paste/duplicate -> Tasks 1, 2, 4.
   - 5.2 Custom Fraction Shading (`shadedCells`, `renderFraction`, `FractionInspector` interactive mini-model) -> Task 1.
   - 5.3 Group / Multi-Select Proportional Resize (`scaleObj`, corner handles) -> Tasks 3, 4.
   - 5.4 Object Key-Point Snapping (`objectSnapPoints`, `snapToObjects`, visual snap indicator) -> Tasks 3, 4.
   - 5.5 One-Click Copy PNG (`copyFigurePng`, `Ctrl+Shift+C`, top bar button) -> Task 4.
2. **Step scan:** Every step specifies exact file paths, function signatures, assertions, and verification commands.
3. **Type consistency:** `Base.groupId`, `FractionObj.shadedCells`, `getShadedCells`, `stepShadedCells`, `rectsIntersect`, `expandGroupSelection`, `marqueeSelectIds`, `cloneWithRemappedGroups`, `scaleObj`, and `objectSnapPoints` match across all 4 tasks.
4. **Review Focus:** All 5 edge cases are pinned to tests in Tasks 1, 2, and 3.
