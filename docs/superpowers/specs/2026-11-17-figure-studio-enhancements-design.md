# Figure Studio Enhancements — Design Spec

**Date:** 2026-11-17
**Status:** Draft (pending user approval)
**Scope:** Multi-feature enhancement to `src/components/figure-studio/` for building math exam figures across all class levels inside Exam Paper Builder.

---

## 1. Intent & Why

Teachers use Figure Studio inside `QuestionForm` to draw math figures (fractions, geometry diagrams, mensuration, coordinate graphs) and attach them to exam questions as PNGs with embedded vector JSON (`pngMeta.ts` `examfig` chunk). Today, three friction points slow down building and reusing figures:

1. **Multi-part figures can't be grouped or box-selected:** Complex figures made of multiple shapes, lines, points, and labels must be clicked one by one (only single-click selection works), and cannot be grouped into a single unit for moving, resizing, or copy-pasting.
2. **Fraction shading is sequential-only:** `FractionObj` only tracks `shaded: number` and fills indices `0 .. shaded - 1`, so teachers cannot shade arbitrary cells/slices (e.g., non-adjacent squares in a grid or alternating bars for fraction equivalence/probability questions).
3. **Geometry alignment & quick export friction:** Drawing accurate triangles, chords, and transversals lacks visible vertex/midpoint snapping, multi-selections can't be scaled together to fit an exam column, and copying the cropped figure PNG to the clipboard takes extra steps.

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Marquee (drag-box) & Shift selection:** Dragging on empty canvas with the `Select` tool draws a marquee rectangle and selects all unlocked intersecting objects. `Shift+Click` toggles an object/group in/out of `selectedIds`, while `Shift+Drag` marquee adds (unions) hit objects/groups into `selectedIds`.
- **Flat Grouping (`groupId`):** Group (`Ctrl+G`) and Ungroup (`Ctrl+Shift+G`) any 2+ objects, plus toolbar/inspector buttons. Clicking any member selects the entire group. Copy/paste (`Ctrl+C`/`Ctrl+V`) and duplicate (`Ctrl+D`) remap `groupId` to fresh IDs so pasted groups are independent.
- **Custom Fraction Shading:** Support arbitrary cell/slice shading on `FractionObj` (`grid`, `bar`, and `circle`) via an optional `shadedCells?: number[]` field, with an interactive mini-model picker in `FractionInspector`.
- **Group / Multi-Select Resize:** Dragging any of the 4 corner handles on a multi-object `selectionBounds` scales all selected objects proportionally around the opposite corner.
- **Object Key-Point Snapping:** Snap drawing and handle-dragging points (lines, angles, points, shapes) to vertices, endpoints, midpoints, and centers of existing objects, with a toggleable snap setting and a clear visual snap indicator on canvas.
- **One-Click Copy PNG:** Copy the rendered (and optionally cropped) figure PNG to the system clipboard from the Figure Studio top bar.

### Non-Goals
- Nested groups (groups inside groups).
- Multi-object rotation handle (corner proportional scaling is in scope; multi-object rotation is deferred).
- Changing `QuestionForm.tsx` integration or `pngMeta.ts` chunk format.
- Adding new AI prompt schemas in `src/lib/gemini.ts`.

### Anti-Goals
- **Breaking saved figures or AI-generated figures:** Existing `examfig` PNGs and `gemini.ts` outputs do not have `groupId` or `shadedCells`. All new schema fields MUST be optional and default cleanly to legacy behavior.
- **Slowing down 60fps pointer dragging:** Selection, snapping, and group scaling must remain ref-driven during pointer move and commit to undo history only on pointer up.

## 3. Constraints

- **Backwards compatibility:** `Base.groupId?: string` and `FractionObj.shadedCells?: number[]` must be optional. When `shadedCells` is `undefined`, `renderFraction` and `FractionInspector` treat `[0, 1, ..., shaded - 1]` as shaded.
- **Locked objects:** Locked objects (`locked === true`) must be skipped by marquee selection, `Ctrl+A`, group creation, and group transforms.
- **Browser clipboard API:** `navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])` requires a secure context; handle unsupported/denied cases gracefully with user feedback (toast/status).

## 4. Approaches Considered

| Approach | Summary | Trade-offs | Decision |
| --- | --- | --- | --- |
| **Option A: Flat `groupId` on `Base`** | Add `groupId?: string` to `Base`; `doc.objects` stays a flat array. Selection expands to all members sharing a `groupId`. | Simple, zero breaking changes to `pngMeta.ts`, `gemini.ts`, layer order, `AlignTools`, `hitTest`, `objectBounds`. No nested groups. | **Selected** |
| **Option B: Nested `GroupObj` container** | Add `type: "group"` with `children: Obj[]`. | Supports nested groups, but requires recursive rewrites across `render.ts`, `geometry.ts`, z-ordering, and `AlignTools`. | Rejected |

## 5. Detailed Design

### 5.1 Grouping (`groupId`) & Selection Expansion
- **Schema (`types.ts`):** Add `groupId?: string;` to `Base`.
- **Selection expansion helper:** Clicking an object `hit` in `Select` mode resolves to all unlocked object IDs sharing `hit.groupId` (or `[hit.id]` if ungrouped).
  - Normal click: replaces `selectedIds` with the clicked object/group's IDs.
  - `Shift+Click`: toggles the clicked object/group's IDs in/out of `selectedIds`.
- **Marquee Drag-Select (`FigureStudio.tsx`):**
  - On `pointerdown` in `select` mode when no handle or object is hit: start a marquee ref `{ start: Pt, current: Pt, additive: boolean }` (additive = `e.shiftKey`).
  - On `pointermove`: update `marquee.current` and trigger canvas redraw to render a dashed indigo selection rectangle (`rgba(79, 70, 229, 0.1)` fill, `#4f46e5` dashed stroke).
  - On `pointerup`: compute normalized marquee `Rect`. Find all unlocked objects whose `objectBounds(o)` intersects the marquee `Rect`. Expand any hit object to include all members of its `groupId`. If `additive`, union with prior `selectedIds`; otherwise replace `selectedIds`. (`Shift+Click` on a single object/group continues to toggle it in/out of `selectedIds`.)
- **Group / Ungroup Actions & Shortcuts:**
  - `groupSelected()`: requires `>= 2` unlocked selected objects; assigns a fresh `groupId` (`uid()`) to all of them and pushes history.
  - `ungroupSelected()`: clears `groupId` (`undefined`) on all selected objects that have one and pushes history.
  - Shortcuts: `Ctrl+G` / `Cmd+G` -> Group; `Ctrl+Shift+G` / `Cmd+Shift+G` -> Ungroup.
  - UI: Add Group / Ungroup buttons to the multi-selection inspector header (`ObjectInspectors.tsx` / `FigureStudio.tsx`) and keyboard shortcut hint in the help bar.
- **Copy / Paste / Duplicate:**
  - When cloning objects in `Ctrl+C`/`Ctrl+V` and `duplicateSelected()`, build a `Map<string, string>` mapping each old `groupId` in the cloned set to a new `uid()`. Each cloned object gets its remapped `groupId` so duplicated groups stay grouped together without merging into the original group.

### 5.2 Custom Fraction Shading (`shadedCells`)
- **Schema (`types.ts`):** Add `shadedCells?: number[];` to `FractionObj`.
- **Normalization helper (`fractions.ts`):** Add `getShadedCells(obj: Pick<FractionObj, "parts" | "rows" | "model" | "shaded" | "shadedCells">): number[]` that:
  - Computes `total` (`model === "grid" ? rows * Math.max(1, Math.round(parts / rows)) : parts`).
  - If `shadedCells` is defined, filters to unique valid integers `0 <= i < total` sorted ascending.
  - Otherwise returns `[0, 1, ..., Math.min(shaded, total) - 1]`.
- **Rendering (`render.ts`):**
  - In `renderFraction`, build a `Set<number>` from `getShadedCells(obj)`.
  - For `circle`, `bar`, and `grid`, fill part `i` when `shadedSet.has(i)`.
  - When `obj.showLabel` is true, display `shadedSet.size` over `parts`.
- **Inspector (`FigureInspectors.tsx`):**
  - In `FractionInspector`, add an interactive clickable mini-model ("Tap parts to shade"):
    - `grid`: CSS grid with `cols` columns x `rows` rows of clickable cells.
    - `bar`: horizontal flex row of `parts` clickable segments.
    - `circle`: small inline SVG pie with `parts` clickable `<path>` wedges.
  - Clicking a cell toggles its index in `shadedCells` and updates `shaded: nextCells.length`.
  - Using presets (`1/2`, `3/4`, etc.) resets `shadedCells` to sequential `[0..n-1]` and updates `shaded`.
  - Using the `Shaded parts` stepper preserves any custom `shadedCells` pattern: decrementing removes the last index in `shadedCells`, and incrementing adds the lowest unshaded index (`0 .. total-1`) not already in `shadedCells`.
  - Changing `parts` or `rows` clamps `shadedCells` to indices `< newTotal` and updates `shaded`.

### 5.3 Group / Multi-Select Proportional Resize
- **Geometry (`geometry.ts`):**
  - Add `scaleObj(o: Obj, sx: number, sy: number, origin: Pt): Obj` that scales an object around `origin` (with `sAvg = (Math.abs(sx) + Math.abs(sy)) / 2`):
    - `BoxObj`: scales `x, y` relative to `origin` and multiplies `w *= sx`, `h *= sy` (clamped to min size `4`). For rotated `BoxObj`s (`rot !== 0`), when `sx !== sy`, fall back to uniform scaling by `sAvg` so `BoxFields` doesn't distort.
    - `TextObj`: also scales `size = Math.max(8, Math.round(o.size * sAvg))` so labels don't overflow their scaled boxes.
    - `PathObj`: scales each `(x, y)` pair in `pts` relative to `origin`.
    - `LineObj`: scales each `Pt` in `pts` relative to `origin`, and scales `labelSize = Math.max(8, Math.round(o.labelSize * sAvg))`.
    - `AngleObj`: scales `v`, `a`, `b` relative to `origin`, `arcR *= sAvg`, and `fontSize = Math.max(8, Math.round(o.fontSize * sAvg))`.
    - `PointObj`: scales `x, y`, `lx, ly` relative to `origin`, and `fontSize = Math.max(8, Math.round(o.fontSize * sAvg))`.
    - `style.width` (stroke width) stays fixed across all objects so line weights remain crisp on printed exam papers.
- **Interaction (`FigureStudio.tsx`):**
  - When `selectedIds.length > 1`, `render` already computes `sb = selectionBounds(selectedObjs)` and draws the group bounding box. Draw 4 corner resize handles (`nw`, `ne`, `sw`, `se`) on `sb`.
  - On `pointerdown`, hit-test those 4 corner handles when `selectedIds.length > 1`, recording `origin` (the opposite corner of `sb`) and initial `sb` + snapshot of selected objects.
  - On `pointermove`, compute `sx`, `sy` from pointer position relative to `origin` (if `e.shiftKey` or by default when uniform, lock `s = Math.max(sx, sy)` or allow free aspect—default uniform scale on corner drag, or `Shift` to unlock aspect, or vice versa: uniform by default for corner handles on multi-select prevents distorting circles/angles!). Let's make corner drag **uniformly** scale `s` by default so geometry angles/circles don't warp unexpectedly, and `Shift` unlocks free aspect.
  - Commit to undo history on `pointerup`.

### 5.4 Object Key-Point Snapping
- **Key-point extraction (`geometry.ts`):**
  - Add `objectSnapPoints(o: Obj): Pt[]`:
    - `LineObj`: all `pts` + midpoint of each segment.
    - `AngleObj`: `v`, `a`, `b` + midpoints of `v-a` and `v-b`.
    - `PointObj`: `{ x: o.x, y: o.y }`.
    - `BoxObj` (`shape`, `text`, `axes`, `numberline`, `fraction`, `table`): 4 corners (rotated if `rot !== 0`), 4 edge midpoints, and center.
- **Wiring (`FigureStudio.tsx`):**
  - Add `snapToObjects` state (default `true`, independent from the existing grid `snap` toggle; both are bypassed while `Alt` is held).
  - Consistent with existing `FigureStudio` behavior, freehand `pen` and `highlighter` strokes are never snapped. Snap `line`, `angle`, `point`, `shape`, and handle dragging (`activeHandleRef`) via `snapPoint(p, { points: snapToObjects ? otherObjectPoints : [], grid: snap && grid.style !== "none" ? grid.size : null, tol: 10 / zoom })`.
  - Store `activeSnapRef.current: SnapResult | null` and draw a crisp snap ring/crosshair at `activeSnapRef.current.target` when `kind === "point"`.

### 5.5 One-Click Copy PNG to Clipboard
- **Action (`FigureStudio.tsx`):**
  - Add `copyFigurePng()` using `renderDocToBlob(doc, grid, 2, cropToFigure)` and `navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])`.
  - Add a "Copy PNG" button next to "Use figure" / export in the top bar, plus `Ctrl+Shift+C` shortcut, with brief "Copied!" feedback state.

## 6. Builder Handoff Notes

- All unit tests for `getShadedCells`, `scaleObj`, `objectSnapPoints`, and `groupId` remapping should be added to `src/components/figure-studio/studio.test.ts` and run via `vitest`.
- After code edits, run `graphify update .` if available per repo rules, and verify TypeScript compilation (`npx tsc --noEmit` or project build) and `vitest`.
