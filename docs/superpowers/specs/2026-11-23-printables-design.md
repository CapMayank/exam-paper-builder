# Printables page — design

## Intent
Admins print aids that go out with exam papers and that students answer on: graph paper, outline maps,
ruled and handwriting sheets, science diagram sheets. Every sheet has the school name, a Roll No. box and
a Q. No. box, so a loose sheet can be matched to the student and the question.

## Goals / non-goals
- Goals: admin-only page; pick a printable, set options, see a live A4 preview, print N copies cleanly on A4.
- Non-goals: saving printables to the database, attaching them to a paper, editing maps, labelled maps.
- Anti-goals: any map showing India's boundary other than the official one; hand-drawn or approximate borders.

## Approaches considered
1. **Client-side generated SVG + bundled map SVGs (chosen).** Grids and lines are computed in mm in code; maps are
   pre-built SVG files in `public/printables/maps/`. No new API, no DB, exact sizing, works offline.
2. Server-rendered PDFs. Exact, but a new dependency and a second print path unlike the rest of the app.
3. Static image files for every grid. Blurry at print scale and can't take options.

## Decisions
- **Access:** "admin" = ADMIN or SUPER_ADMIN (`isAdmin` in `src/lib/permissions.ts`), the same gate as Presets:
  sidebar entry filtered in `AppShell`, page and print view show the "Only administrators" empty state for others.
  There is no new API (nothing to fetch); the map files are public-domain / open data, served as static files.
- **Where:** `/printables` inside the app shell (sidebar entry after Exam papers, `Printer`-style icon).
  Print view `/printables/print?…` outside the shell, like `/papers/[id]/print`, opened in one named tab
  (`printables-output`), reused on each print; its back link closes the tab when it was opened from the page.
- **Layout of the page:** catalogue grouped by subject (Maths, SST, Science, Languages) → options panel →
  scaled live A4 preview → "Print" (with copies).
- **Every sheet header:** school name (defaults to "Sarvodaya Higher Secondary School, Lakhnadon", editable,
  remembered in localStorage), optional line for exam/subject/class, Roll No. box, Q. No. box.
  Map sheets carry a one-line source credit at the foot.
- **Catalogue (first version):**
  - Maths: graph paper (1 mm / 2 mm / 5 mm / 10 mm, bold every cm), square grid, dot grid, isometric dot grid,
    graph with x/y axes, number lines (range and step).
  - SST: India outline, India states & UTs, India rivers, Madhya Pradesh outline, Asia outline, World outline.
  - Science: diagram sheet (large box + label lines), practical record sheet (diagram box + ruled lines).
  - Languages: ruled answer sheet (spacing, margin), four-line handwriting sheet (sizes, for young classes).
- **Options:** per sheet (grid size, spacing, range, orientation where useful) plus copies (1–60).
- **Map sources (user approved downloading):**
  - India outline: Datameet `Country/india-composite.geojson` — official Survey of India boundary incl. PoK and
    Aksai Chin, CC0.
  - States/UTs (and MP outline): Datameet `States/Admin2` (2021, Ladakh UT) — CC BY 4.0, credit printed.
  - World/Asia: Natural Earth 10 m admin-0 countries, India point of view — public domain.
  - Rivers: Natural Earth 10 m rivers — public domain, clipped to India.
  - Survey of India outline maps: not bundled, reuse licence unclear.
  - Built once by `scripts/build-printable-maps.mjs` (mapshaper via npx, not a dependency), outputs committed with
    `public/printables/maps/SOURCES.md`. If the states layer's outer edge doesn't match the official outline,
    the outline is drawn from the composite file and states inside it.
- **Tests:** vitest for the pure parts (option parsing/clamping, grid/line geometry, sheet registry).

## Left to the builder
Exact icon, card copy, preview scale, header typography (match existing print pages).
