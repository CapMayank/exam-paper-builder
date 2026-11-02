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
