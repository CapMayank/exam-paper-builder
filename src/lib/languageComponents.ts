import type { MarkingComponent } from "./officialMarkingSchemes";
import type { PaperImplication } from "./blueprint";

/**
 * Component coverage for papers whose official blueprint allocates marks by component
 * (poetry, prose, grammar, unseen passage, writing...) instead of by textbook chapter.
 * Each placed question is tagged with a component key; marks are summed per component.
 */

export function parseComponents(json: string | null | undefined): MarkingComponent[] {
  try {
    const parsed = JSON.parse(json || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is MarkingComponent =>
        c && typeof c.key === "string" && typeof c.title === "string" && typeof c.marks === "number",
    );
  } catch {
    return [];
  }
}

export type ComponentCoverageRow = { key: string; title: string; target: number; used: number };

export type ComponentCoverage = {
  rows: ComponentCoverageRow[];
  untaggedMarks: number;
  untaggedCount: number;
  unknownKeys: string[];
};

export function componentCoverage(
  components: MarkingComponent[],
  items: Array<{ componentKey?: string | null; marks: number }>,
): ComponentCoverage {
  const rows = new Map<string, ComponentCoverageRow>(
    components.map((c) => [c.key, { key: c.key, title: c.title, target: c.marks, used: 0 }]),
  );
  let untaggedMarks = 0;
  let untaggedCount = 0;
  const unknown = new Set<string>();
  for (const it of items) {
    const key = (it.componentKey || "").trim();
    if (!key) {
      untaggedMarks += it.marks;
      untaggedCount += 1;
    } else if (rows.has(key)) {
      rows.get(key)!.used += it.marks;
    } else {
      unknown.add(key);
    }
  }
  return { rows: [...rows.values()], untaggedMarks, untaggedCount, unknownKeys: [...unknown] };
}

export function componentImplications(
  components: MarkingComponent[],
  items: Array<{ componentKey?: string | null; marks: number }>,
): PaperImplication[] {
  if (components.length === 0 || items.length === 0) return [];
  const cov = componentCoverage(components, items);
  const out: PaperImplication[] = [];
  for (const r of cov.rows) {
    if (r.used > r.target) {
      out.push({
        code: "COMPONENT_EXCESS",
        severity: "error",
        message: `${r.title}: ${r.used} marks placed, but the blueprint allows ${r.target}.`,
        details: { key: r.key, target: r.target, used: r.used },
      });
    } else if (r.used < r.target && cov.untaggedCount === 0) {
      out.push({
        code: "COMPONENT_DEFICIT",
        severity: "warning",
        message: `${r.title}: ${r.used} of ${r.target} marks placed.`,
        details: { key: r.key, target: r.target, used: r.used },
      });
    }
  }
  if (cov.untaggedCount > 0) {
    out.push({
      code: "COMPONENT_UNTAGGED",
      severity: "warning",
      message: `${cov.untaggedCount} question(s) (${cov.untaggedMarks} marks) are not assigned to a syllabus component, so component coverage cannot be checked.`,
      details: { count: cov.untaggedCount, marks: cov.untaggedMarks },
    });
  }
  for (const k of cov.unknownKeys) {
    out.push({
      code: "COMPONENT_UNTAGGED",
      severity: "error",
      message: `A question is assigned to "${k}", which is not a component of this blueprint.`,
      details: { key: k },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Suggested component assignment
// ---------------------------------------------------------------------------------------------

export type AllocUnit = { id: string; marks: number; type: string };

const OBJECTIVE_TYPES = new Set(["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "VERY_SHORT", "ASSERTION_REASON"]);

function fits(unit: AllocUnit, comp: MarkingComponent): boolean {
  switch (comp.role) {
    case "PASSAGE":
      // an unseen passage is one passage question, or a written answer worth at least 2 marks
      return unit.type === "UNSEEN_PASSAGE" || (unit.marks >= 2 && !OBJECTIVE_TYPES.has(unit.type));
    case "WRITING":
      return unit.marks >= 3 && ["LONG", "SHORT", "WRITING_SKILL"].includes(unit.type);
    case "GRAMMAR":
      return unit.marks <= 3 && unit.type !== "UNSEEN_PASSAGE";
    default:
      return true;
  }
}

/**
 * Proposes which component each placed question counts toward so that every component gets exactly its
 * official marks. The scheme does not say which question number carries which component, so this is a
 * suggestion the teacher can change; it is deterministic. Units it cannot place are left unassigned.
 */
export function allocateComponents(units: AllocUnit[], components: MarkingComponent[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (components.length === 0 || units.length === 0) return out;

  const order: Record<string, number> = { PASSAGE: 0, WRITING: 1, GRAMMAR: 2, LITERATURE: 3, STANDARD: 4 };
  // most constrained roles first, then bigger components
  const comps = [...components].sort((a, b) => (order[a.role] ?? 4) - (order[b.role] ?? 4) || b.marks - a.marks);
  const taken = new Set<string>();
  let budget = 300000;

  const ranked = (comp: MarkingComponent) =>
    units
      .filter((u) => !taken.has(u.id) && fits(u, comp))
      // grammar prefers objective items, literature prefers written ones; larger first keeps the search short
      .sort((a, b) => {
        const objA = OBJECTIVE_TYPES.has(a.type) ? 1 : 0;
        const objB = OBJECTIVE_TYPES.has(b.type) ? 1 : 0;
        if (comp.role === "GRAMMAR" && objA !== objB) return objB - objA;
        if (comp.role === "LITERATURE" && objA !== objB) return objA - objB;
        return b.marks - a.marks || a.id.localeCompare(b.id);
      });

  // Depth-first search over components; for each, over every subset of units adding up to its marks.
  const solve = (idx: number): boolean => {
    if (idx >= comps.length) return true;
    const comp = comps[idx];
    const cand = ranked(comp);
    const chosen: AllocUnit[] = [];
    const sameKind = (x: AllocUnit, y: AllocUnit) => x.type === y.type && x.marks === y.marks;
    const go = (start: number, left: number): boolean => {
      if (left === 0) {
        for (const u of chosen) taken.add(u.id);
        if (solve(idx + 1)) {
          for (const u of chosen) out[u.id] = comp.key;
          return true;
        }
        for (const u of chosen) taken.delete(u.id);
        return false;
      }
      if (--budget < 0) return false;
      for (let k = start; k < cand.length; k++) {
        const u = cand[k];
        if (u.marks > left) continue;
        // interchangeable units (same type and marks) are only tried in order, never as permutations
        if (k > start && sameKind(cand[k - 1], u)) continue;
        chosen.push(u);
        if (go(k + 1, left - u.marks)) return true;
        chosen.pop();
      }
      return false;
    };
    return go(0, comp.marks);
  };

  if (!solve(0)) {
    // No exact cover: fill what fits greedily so teachers still get a starting point.
    for (const k of Object.keys(out)) delete out[k];
    taken.clear();
    for (const comp of comps) {
      let left = comp.marks;
      for (const u of ranked(comp)) {
        if (u.marks <= left) {
          out[u.id] = comp.key;
          taken.add(u.id);
          left -= u.marks;
        }
        if (left === 0) break;
      }
    }
  }
  return out;
}
