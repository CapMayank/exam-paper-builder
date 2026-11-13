export function sectionStatusLine(a: {
  type: string;
  count: number;
  filledUnits: number;
  itemCount: number;
  placedMarks: number;
  targetMarks: number;
  matchPairs?: number;
}): string {
  const marks = `${String(a.placedMarks)}/${String(a.targetMarks)} marks`;
  const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? "" : "s"}`;
  if (a.type === "MATCH_COLUMN" && a.itemCount === 1) {
    return `1 question (${plural(a.matchPairs ?? a.count, "pair")}) · ${marks}`;
  }
  if (a.type === "MATCH_COLUMN" && a.itemCount === 0) {
    return `0/1 question (${plural(a.count, "pair")}) · ${marks}`;
  }
  if (a.itemCount === 1 && a.filledUnits > 1) {
    return `1 question (${plural(a.filledUnits, "part")}) · ${marks}`;
  }
  return `${String(a.filledUnits)}/${String(a.count)} question${a.count === 1 ? "" : "s"} · ${marks}`;
}

/** The single warning for a section, or null. Overfill wins over a marks mismatch. */
export function sectionWarning(a: { count: number; filledUnits: number; placedMarks: number; targetMarks: number }): string | null {
  if (a.filledUnits > a.count) {
    return `${String(a.filledUnits - a.count)} more than this section holds`;
  }
  if (a.placedMarks > a.targetMarks) {
    return `Placed marks (${String(a.placedMarks)}) are more than the section total (${String(a.targetMarks)})`;
  }
  if (a.placedMarks !== a.targetMarks && a.filledUnits >= a.count) {
    return `Placed marks (${String(a.placedMarks)}) do not match the section total (${String(a.targetMarks)})`;
  }
  return null;
}

export type ChoicePolicy = "MANDATORY_EVERY_SLOT" | "FORBIDDEN" | "OPTIONAL";

/** "" when nothing to say. */
export function choicePolicyNote(policy: ChoicePolicy | undefined, forbidden: boolean): string {
  if (policy === "MANDATORY_EVERY_SLOT") return "OR on every question";
  if (forbidden) return "No OR questions";
  return "";
}

export type RowAction = "edit" | "replace" | "or" | "delete" | "more";

export function rowActions(a: { canEdit: boolean; hasOr: boolean; orForbidden: boolean }): RowAction[] {
  if (!a.canEdit) return [];
  const actions: RowAction[] = ["edit", "replace", "or", "delete", "more"];
  // An existing OR that the blueprint forbids must still be removable.
  if (a.orForbidden && !a.hasOr) {
    return actions.filter((action) => action !== "or");
  }
  return actions;
}

export type RowMenuItem = {
  key: "addDiagram" | "changeDiagram" | "editDiagram" | "previewDiagramBw" | "removeDiagram" | "pageBreak" | "moveUp" | "moveDown" | "quickSwap";
  label: string;
  disabled?: boolean;
};

export function rowMenuItems(a: { hasFigure: boolean; pageBreakBefore: boolean; index: number; total: number; moving: boolean }): RowMenuItem[] {
  const items: RowMenuItem[] = a.hasFigure
    ? [
        { key: "changeDiagram", label: "Change diagram" },
        { key: "editDiagram", label: "Edit diagram" },
        { key: "previewDiagramBw", label: "Preview diagram in black & white" },
        { key: "removeDiagram", label: "Remove diagram" },
      ]
    : [{ key: "addDiagram", label: "Add diagram" }];
  items.push({
    key: "pageBreak",
    label: a.pageBreakBefore ? "Remove page break" : "Add page break before",
  });
  items.push({
    key: "moveUp",
    label: "Move up",
    disabled: a.index === 0 || a.moving,
  });
  items.push({
    key: "moveDown",
    label: "Move down",
    disabled: a.index === a.total - 1 || a.moving,
  });
  items.push({ key: "quickSwap", label: "Quick Swap" });
  return items;
}

export type OrMenuItem = { key: "editOr" | "changeOr" | "removeOr"; label: string };

/** [] when the slot has no OR question (the OR button then adds one directly). */
export function orMenuItems(hasOr: boolean): OrMenuItem[] {
  if (!hasOr) return [];
  return [
    { key: "editOr", label: "Edit OR question" },
    { key: "changeOr", label: "Change OR question" },
    { key: "removeOr", label: "Remove OR question" },
  ];
}

const OR_PROBLEM_CODES = ["MISSING_INTERNAL_CHOICE", "FORBIDDEN_INTERNAL_CHOICE"];

/** Bank Auto-Fill in the header: while the paper is incomplete, or when OR-question problems need it on a full paper. */
export function showBankAutoFill(a: { canEdit: boolean; final: boolean; complete: boolean; noticeCodes: string[] }): boolean {
  if (!a.canEdit || a.final) return false;
  return !a.complete || a.noticeCodes.some((c) => OR_PROBLEM_CODES.includes(c));
}
