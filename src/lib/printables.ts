/**
 * Printables: A4 aids that go out with an exam paper (graph paper, outline maps, ruled sheets…).
 * This module is the catalogue and the option rules; `components/printables/PrintableSheet.tsx` draws them.
 * Options travel to the print view in the URL, so everything read back from a query is clamped here.
 */

export type PrintableGroup = "Maths" | "Social Science" | "Science" | "Languages";

export type PrintableId =
  | "graph"
  | "square-grid"
  | "dot-grid"
  | "isometric"
  | "axes"
  | "number-lines"
  | "map-india"
  | "map-india-states"
  | "map-india-rivers"
  | "map-mp"
  | "map-asia"
  | "map-world"
  | "diagram"
  | "practical"
  | "ruled"
  | "four-line";

export type SelectOption = { key: string; label: string; kind: "select"; choices: { value: string; label: string }[]; default: string };
export type NumberOption = { key: string; label: string; kind: "number"; min: number; max: number; step: number; default: number };
export type OptionSpec = SelectOption | NumberOption;
export type PrintableOptions = Record<string, string | number>;

export type Printable = {
  id: PrintableId;
  group: PrintableGroup;
  title: string;
  blurb: string;
  options: OptionSpec[];
  landscape?: boolean;
  map?: { file: string; credit: string };
};

export const DEFAULT_PRINTABLE_SCHOOL = "Sarvodaya Higher Secondary School, Lakhnadon";
export const MAX_COPIES = 60;
export const PRINTABLE_GROUPS: PrintableGroup[] = ["Maths", "Social Science", "Science", "Languages"];

const DATAMEET_INDIA = "Boundary: DataMeet india-composite (official Survey of India boundary), CC0.";
const DATAMEET_STATES = "States: DataMeet India Admin2 boundaries, CC BY 4.0 (github.com/datameet/maps).";
const NATURAL_EARTH = "Natural Earth (naturalearthdata.com), India point of view, public domain.";

const yesNo = (key: string, label: string, def: "yes" | "no"): SelectOption => ({
  key,
  label,
  kind: "select",
  choices: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ],
  default: def,
});

export const PRINTABLES: Printable[] = [
  {
    id: "graph",
    group: "Maths",
    title: "Graph paper",
    blurb: "Millimetre graph with bold centimetre lines, for plotting and bar graphs.",
    options: [
      {
        key: "size",
        label: "Smallest square",
        kind: "select",
        choices: [
          { value: "1", label: "1 mm (bold every 5 mm and 1 cm)" },
          { value: "2", label: "2 mm (bold every 1 cm)" },
          { value: "5", label: "5 mm (bold every 1 cm)" },
        ],
        default: "1",
      },
    ],
  },
  {
    id: "axes",
    group: "Maths",
    title: "Graph with x and y axes",
    blurb: "Millimetre graph with the axes already drawn, for coordinate geometry and linear equations.",
    options: [
      {
        key: "origin",
        label: "Origin",
        kind: "select",
        choices: [
          { value: "centre", label: "Centre (all four quadrants)" },
          { value: "corner", label: "Bottom left (first quadrant)" },
        ],
        default: "centre",
      },
    ],
  },
  {
    id: "square-grid",
    group: "Maths",
    title: "Square grid",
    blurb: "Plain squares for geometry, symmetry and area by counting squares.",
    options: [
      {
        key: "size",
        label: "Square size",
        kind: "select",
        choices: [
          { value: "5", label: "5 mm" },
          { value: "10", label: "1 cm" },
        ],
        default: "10",
      },
    ],
  },
  {
    id: "dot-grid",
    group: "Maths",
    title: "Dot grid",
    blurb: "Square dot paper for shapes, perimeter and symmetry.",
    options: [
      {
        key: "size",
        label: "Dot spacing",
        kind: "select",
        choices: [
          { value: "5", label: "5 mm" },
          { value: "10", label: "1 cm" },
        ],
        default: "10",
      },
    ],
  },
  {
    id: "isometric",
    group: "Maths",
    title: "Isometric dot grid",
    blurb: "Triangular dot paper for drawing cubes and 3-D solids (Visualising solid shapes).",
    options: [
      {
        key: "size",
        label: "Dot spacing",
        kind: "select",
        choices: [
          { value: "5", label: "5 mm" },
          { value: "10", label: "1 cm" },
        ],
        default: "10",
      },
    ],
  },
  {
    id: "number-lines",
    group: "Maths",
    title: "Number lines",
    blurb: "Blank or numbered number lines for integers, fractions and addition on the line.",
    options: [
      { key: "from", label: "Start at", kind: "number", min: -100, max: 100, step: 1, default: -10 },
      { key: "to", label: "End at", kind: "number", min: -100, max: 100, step: 1, default: 10 },
      { key: "lines", label: "Lines per page", kind: "number", min: 1, max: 12, step: 1, default: 6 },
      yesNo("numbers", "Print the numbers", "yes"),
    ],
  },
  {
    id: "map-india",
    group: "Social Science",
    title: "India – outline",
    blurb: "Outline of India on the official boundary, for marking places, features and events.",
    options: [],
    map: { file: "/printables/maps/india.svg", credit: DATAMEET_INDIA },
  },
  {
    id: "map-india-states",
    group: "Social Science",
    title: "India – states and UTs",
    blurb: "Political outline with state and union territory boundaries.",
    options: [],
    map: { file: "/printables/maps/india-states.svg", credit: `${DATAMEET_INDIA} ${DATAMEET_STATES}` },
  },
  {
    id: "map-india-rivers",
    group: "Social Science",
    title: "India – rivers",
    blurb: "Outline with the major rivers, for drainage and physical-feature questions.",
    options: [],
    map: { file: "/printables/maps/india-rivers.svg", credit: `${DATAMEET_INDIA} Rivers: ${NATURAL_EARTH}` },
  },
  {
    id: "map-mp",
    group: "Social Science",
    title: "Madhya Pradesh – outline",
    blurb: "Outline of Madhya Pradesh for the state's own geography.",
    options: [],
    map: { file: "/printables/maps/mp.svg", credit: DATAMEET_STATES },
  },
  {
    id: "map-asia",
    group: "Social Science",
    title: "Asia – outline",
    blurb: "Countries of Asia, for neighbours of India and Asian geography.",
    options: [],
    map: { file: "/printables/maps/asia.svg", credit: `Countries: ${NATURAL_EARTH}` },
  },
  {
    id: "map-world",
    group: "Social Science",
    title: "World – outline",
    blurb: "World countries outline, printed landscape.",
    options: [],
    landscape: true,
    map: { file: "/printables/maps/world.svg", credit: `Countries: ${NATURAL_EARTH}` },
  },
  {
    id: "diagram",
    group: "Science",
    title: "Diagram sheet",
    blurb: "A large box to draw a labelled diagram, with lines below for the labels or explanation.",
    options: [{ key: "lines", label: "Writing lines below", kind: "number", min: 0, max: 20, step: 1, default: 8 }],
  },
  {
    id: "practical",
    group: "Science",
    title: "Practical record sheet",
    blurb: "Aim, apparatus, diagram box, observation table and result, for practical work.",
    options: [yesNo("table", "Observation table", "yes")],
  },
  {
    id: "ruled",
    group: "Languages",
    title: "Ruled answer sheet",
    blurb: "Lined sheet with a margin, for English, Hindi and any long answers.",
    options: [
      {
        key: "spacing",
        label: "Line spacing",
        kind: "select",
        choices: [
          { value: "8", label: "8 mm (senior classes)" },
          { value: "10", label: "10 mm" },
          { value: "12", label: "12 mm (junior classes)" },
        ],
        default: "8",
      },
      yesNo("margin", "Left margin", "yes"),
    ],
  },
  {
    id: "four-line",
    group: "Languages",
    title: "Four-line handwriting",
    blurb: "English four-line practice sheet for young classes.",
    options: [
      {
        key: "size",
        label: "Letter size",
        kind: "select",
        choices: [
          { value: "large", label: "Large (Classes 1–2)" },
          { value: "medium", label: "Medium (Classes 3–4)" },
          { value: "small", label: "Small (Class 5)" },
        ],
        default: "large",
      },
    ],
  },
];

export function getPrintable(id: string | null | undefined): Printable | undefined {
  return PRINTABLES.find((p) => p.id === id);
}

export function clampCopies(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_COPIES, Math.max(1, Math.floor(n)));
}

/** Options for one sheet, every value checked: unknown choices and junk numbers fall back to the default. */
export function parseOptions(id: string, raw: Record<string, string | number | undefined>): PrintableOptions {
  const p = getPrintable(id);
  const out: PrintableOptions = {};
  for (const o of p?.options ?? []) {
    const v = raw[o.key];
    if (o.kind === "select") {
      out[o.key] = o.choices.some((c) => c.value === String(v)) ? String(v) : o.default;
    } else {
      const n = typeof v === "number" ? v : v === undefined || String(v).trim() === "" ? Number.NaN : Number(v);
      out[o.key] = Number.isFinite(n) ? Math.min(o.max, Math.max(o.min, Math.round(n))) : o.default;
    }
  }
  return out;
}

export type PrintableCommon = { copies: number; school: string; subtitle: string };

export function toQuery(id: PrintableId, opts: PrintableOptions, common: PrintableCommon): string {
  const q = new URLSearchParams({ type: id, copies: String(clampCopies(common.copies)), school: common.school });
  if (common.subtitle.trim()) q.set("sub", common.subtitle);
  for (const [k, v] of Object.entries(opts)) q.set(`o_${k}`, String(v));
  return q.toString();
}

export function fromQuery(params: URLSearchParams): PrintableCommon & { id: PrintableId; opts: PrintableOptions } {
  const id = getPrintable(params.get("type"))?.id ?? "graph";
  const raw: Record<string, string> = {};
  params.forEach((v, k) => {
    if (k.startsWith("o_")) raw[k.slice(2)] = v;
  });
  return {
    id,
    opts: parseOptions(id, raw),
    copies: clampCopies(Number(params.get("copies") ?? 1)),
    school: params.get("school")?.trim() || DEFAULT_PRINTABLE_SCHOOL,
    subtitle: params.get("sub") ?? "",
  };
}

/**
 * Line weight of grid line `index` on graph paper whose smallest square is `size` mm:
 * bold every 1 cm; on 1 mm paper also a mid line every 5 mm; everything else fine.
 */
export function gridWeight(index: number, size: number): "fine" | "mid" | "bold" {
  const mm = index * size;
  if (mm % 10 === 0) return "bold";
  if (size === 1 && mm % 5 === 0) return "mid";
  return "fine";
}

/**
 * Font size (mm) for the school name so it fits `width` mm. Uses 0.72 em per character, a safe upper bound for
 * bold Latin capitals and Devanagari, so long names shrink instead of running off the page.
 */
export function schoolFontSize(text: string, width: number, max: number): number {
  return Math.min(max, width / (Math.max(1, text.trim().length) * 0.72));
}
