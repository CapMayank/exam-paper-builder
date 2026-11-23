# Printables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin-only Printables page that previews and prints A4 exam aids (grids, maps, ruled sheets) with school name, Roll No. box and Q. No. box.

**Architecture:** A pure registry (`src/lib/printables.ts`) defines each sheet, its options and their clamping, and serialises options to/from URL query. A React renderer (`src/components/printables/PrintableSheet.tsx`) draws one A4 page as SVG in mm. `/printables` (app shell) hosts catalogue + options + scaled preview; `/printables/print` (no shell) renders N copies and prints. Maps are pre-built SVGs in `public/printables/maps/`.

**Tech Stack:** Next 16 app router (client components), React 19, Tailwind 4, vitest, mapshaper (npx, build-time only).

**Spec:** `docs/superpowers/specs/2026-11-23-printables-design.md`

## Global Constraints
- Admin = `isAdmin()` from `src/lib/permissions.ts` (ADMIN or SUPER_ADMIN). Non-admins: no sidebar entry; both pages show `EmptyState` "Only administrators can use printables".
- Default school name: "Sarvodaya Higher Secondary School, Lakhnadon"; remembered in localStorage key `epb:printables:schoolName`.
- Page size A4 portrait 210×297 mm (landscape 297×210 for World only); print via `@page { size: A4 …; margin: 0 }`.
- Copies clamp 1–60.
- Map credit lines printed at sheet foot; all sources listed in `public/printables/maps/SOURCES.md`.
- No new npm dependencies.

## Review Focus
- Hand-edited / stale URL query on the print view (unknown type, junk numbers) → falls back to defaults, never crashes. (Task 1 test `parseOptions` with garbage.)
- Very long school name → shrinks/wraps inside header, never overflows the page. (Task 2: header uses `textLength`/font shrink; checked in browser.)
- Map file fails to load → sheet shows "Map could not be loaded" text instead of a blank frame. (Task 2.)
- Teacher pastes `/printables/print?...` URL directly → forbidden state. (Task 3, browser check.)
- Printing 60 copies → each copy on its own page, no blank trailing page. (Task 3: `break-after: page` except last; browser check.)

---

### Task 1: Sheet registry and option parsing

**Files:** Create `src/lib/printables.ts`, Test `src/lib/printables.test.ts`

**Interfaces — Produces:**
- `type PrintableId` = `"graph" | "square-grid" | "dot-grid" | "isometric" | "axes" | "number-lines" | "map-india" | "map-india-states" | "map-india-rivers" | "map-mp" | "map-asia" | "map-world" | "diagram" | "practical" | "ruled" | "four-line"`
- `type PrintableGroup = "Maths" | "Social Science" | "Science" | "Languages"`
- `type OptionSpec = { key: string; label: string; kind: "select"; choices: {value: string; label: string}[]; default: string } | { key; label; kind: "number"; min; max; step; default: number }`
- `PRINTABLES: { id; group; title; blurb; options: OptionSpec[]; landscape?: boolean; map?: { file: string; credit: string } }[]`
- `getPrintable(id: string)` → entry or undefined
- `parseOptions(id, raw: Record<string,string|undefined>) → Record<string,string|number>` (clamps numbers, unknown select → default)
- `toQuery(id, opts, common: {copies:number; school:string; subtitle:string}) → string`; `fromQuery(params: URLSearchParams) → {id, opts, copies, school, subtitle}`; `clampCopies(n)`.

- [ ] Step 1: tests — `parseOptions("graph", {size:"7"})` → size `"1"`(default); number option `parseOptions("number-lines",{from:"-999"})` clamps to min; `clampCopies(0)===1`, `clampCopies(500)===60`, `clampCopies(NaN)===1`; `fromQuery(new URLSearchParams(toQuery(...)))` round-trips; `fromQuery` with `type=bogus` returns `id: "graph"`; every map entry has a non-empty credit.
- [ ] Step 2: run `npx vitest run src/lib/printables.test.ts` → FAIL.
- [ ] Step 3: implement.
- [ ] Step 4: run → PASS.

### Task 2: Map data build

**Files:** Create `scripts/build-printable-maps.mjs`, `public/printables/maps/{india,india-states,india-rivers,mp,asia,world}.svg`, `public/printables/maps/SOURCES.md`

- [ ] Download (scratchpad) Datameet `Country/india-composite.geojson`, `States/Admin2.*`; Natural Earth `ne_10m_admin_0_countries_ind.zip`, `ne_10m_rivers_lake_centerlines.zip`.
- [ ] Script runs `npx mapshaper` to simplify, project (India: equal-area-ish; world: Robinson-like `+proj=robin`), and export SVG with stroke only, no labels, fitted to a fixed viewBox.
- [ ] Verify the states layer's outer edge matches the official outline (J&K/Ladakh include PoK, Aksai Chin); otherwise draw outer edge from composite.
- [ ] Each SVG < 300 KB.

### Task 3: Sheet renderer, pages, sidebar

**Files:** Create `src/components/printables/PrintableSheet.tsx`, `src/app/(app)/printables/page.tsx`, `src/app/printables/print/page.tsx`; Modify `src/components/AppShell.tsx` (NAV + filter).

**Interfaces — Consumes:** Task 1 registry. **Produces:** `<PrintableSheet id opts school subtitle />` rendering a `.a4` div (210×297 mm) with header (school, subtitle, Roll No. box, Q. No. box), body SVG, foot credit.

- [ ] Renderer: grids as SVG `<pattern>`-free explicit lines in mm (crisp); maps as `<img>` of the SVG fitted into the body with error fallback.
- [ ] `/printables`: same `PageHeader`, `card`, `btn btn-primary` styles; catalogue grouped by subject; options panel; school / subtitle / copies; preview scaled with CSS `zoom`; Print opens `/printables/print?…` in named tab `printables-output`.
- [ ] `/printables/print`: control bar (Back — closes tab if opener, else link — and Print), N copies, `@page` A4.
- [ ] Both pages gate with `/api/me` + `isAdmin`.
- [ ] Sidebar entry "Printables" after "Exam papers", shown only to ADMIN/SUPER_ADMIN.

### Task 4: Verify and commit
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` → all pass.
- [ ] Browser: admin sees entry, previews each sheet, print view shows copies; teacher sees no entry and forbidden state on both URLs.
- [ ] Commit.
