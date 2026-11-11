// Pure blueprint rules. Used by the API (to reject) and the UI (to explain). No I/O here.

import { parseMatchColumnPairs } from "./constants";
import { attemptedSubpartsMarks, parseSubpartsPayload, validateSubPartsSum } from "./types";
import { toleratesType, typeRejection } from "./sectionTypes";

export type SectionDef = {
  id: string;
  title: string;
  type: string;
  count: number;
  marksEach: number;
  instructions?: string | null;
  orChoiceMode?: "BOARD_DEFAULT" | "REQUIRED" | "NOT_REQUIRED" | string | null;
  orAlternativeCount?: number | null;
  orSlotsJson?: string | null;
  /** Other question types this slot accepts at the same marks (see sectionTypes.ts). */
  allowedTypesJson?: string | null;
  /** Which slots are grammar, passage or writing (see slotPlan.ts). */
  slotPlanJson?: string | null;
  /** Examination purpose of the slot; placement honours it, not just type + marks. */
  role?: SectionRole | string | null;
  groupKey?: string | null;
};

export const SECTION_ROLES = ["STANDARD", "PASSAGE", "GRAMMAR", "WRITING", "LITERATURE"] as const;
export type SectionRole = (typeof SECTION_ROLES)[number];

/** Question types that are themselves a passage parent carrying its own sub-questions. */
const PASSAGE_PARENT_TYPES = new Set(["UNSEEN_PASSAGE", "CASE_STUDY", "REFERENCE_CONTEXT"]);

/**
 * Role-based placement rule. Returns a reason when `candidate` must not go in `section`.
 * - PASSAGE sections accept a passage parent, or a sub-question that carries a passageGroupId.
 * - Every other section rejects a passage sub-question, so a 1-mark passage MCQ can never
 *   land in a general objective section.
 */
export function roleMismatchReason(
  section: Pick<SectionDef, "title" | "role" | "type">,
  candidate: { type: string; passageGroupId?: string | null },
): string | null {
  const role = section.role || "STANDARD";
  const isPassageChild = !!candidate.passageGroupId && !PASSAGE_PARENT_TYPES.has(candidate.type);
  if (role === "PASSAGE") {
    if (PASSAGE_PARENT_TYPES.has(candidate.type) || isPassageChild) return null;
    return `${section.title} is a passage section: it only accepts an unseen passage or questions that belong to a passage group.`;
  }
  if (isPassageChild) {
    return `This question belongs to a passage group and can only be placed in a passage section, not ${section.title}.`;
  }
  return null;
}
export type ChapterQuota = {
  chapterId: string;
  marks: number;
  title?: string;
  number?: number | null;
  /** Chapters with the same unitKey share one quota: the scheme allocates marks by unit, not by lesson. */
  unitKey?: string | null;
  unitTitle?: string | null;
};

/** Representative chapter id of each chapter's quota group (itself when it has no unit). */
export function quotaRepresentatives(chapters: Array<Pick<ChapterQuota, "chapterId" | "unitKey">>): Map<string, string> {
  const firstOfUnit = new Map<string, string>();
  const rep = new Map<string, string>();
  for (const c of chapters) {
    if (c.unitKey) {
      if (!firstOfUnit.has(c.unitKey)) firstOfUnit.set(c.unitKey, c.chapterId);
      rep.set(c.chapterId, firstOfUnit.get(c.unitKey)!);
    } else {
      rep.set(c.chapterId, c.chapterId);
    }
  }
  return rep;
}
export type BlueprintDef = { sections: SectionDef[]; chapters: ChapterQuota[] };
export type PlacedItem = {
  sectionId: string;
  chapterId: string;
  marks?: number;
  subpartsCount?: number;
  questionId?: string;
};

export type QuestionTypeItem = {
  key: string;
  id?: string;
  type: string;
  count: number;
  marksEach: number;
  orChoiceMode?: "BOARD_DEFAULT" | "REQUIRED" | "NOT_REQUIRED";
  orAlternativeCount?: number;
  orSlotsJson?: string;
  allowedTypesJson?: string;
  slotPlanJson?: string;
  role?: string;
  groupKey?: string;
};

export type SectionGroup = {
  key: string;
  title: string;
  instructions: string;
  questionTypes: QuestionTypeItem[];
};

/**
 * Re-letters a section title to match its 0-based position in the exam paper.
 * e.g., index 0 -> Section A, index 4 -> Section E, index 5 -> Section F.
 * If moved, "Section E - Case Studies" at index 5 becomes "Section F - Case Studies".
 */
export function reletterTitle(oldTitle: string, newIndex: number): string {
  const letter = String.fromCharCode(65 + newIndex);
  const trimmed = oldTitle.trim();
  const secMatch = trimmed.match(/^(Section|Sec|Part)\s+[A-Z](\b.*)$/i);
  if (secMatch) {
    const prefix = secMatch[1];
    const rest = secMatch[2];
    return `${prefix} ${letter}${rest}`;
  }
  if (/^[A-Z]$/i.test(trimmed)) {
    return letter;
  }
  if (!trimmed) {
    return `Section ${letter}`;
  }
  return trimmed;
}

/**
 * Groups a flat array of BlueprintSections into structured SectionGroups.
 * Consecutive sections sharing the same title (e.g. 5 MCQ + 5 FillBlank in "Section A")
 * are combined into a single section with multiple question types.
 */
export function groupSectionsFromFlat(
  flat: {
    id?: string;
    title: string;
    instructions?: string | null;
    type: string;
    count: number;
    marksEach: number;
    orChoiceMode?: string | null;
    orAlternativeCount?: number | null;
    orSlotsJson?: string | null;
    allowedTypesJson?: string | null;
    slotPlanJson?: string | null;
    role?: string | null;
    groupKey?: string | null;
  }[]
): SectionGroup[] {
  const groups: SectionGroup[] = [];
  let seq = 0;
  for (const s of flat) {
    const last = groups[groups.length - 1];
    const orChoiceMode = (s.orChoiceMode as any) || "BOARD_DEFAULT";
    const orAlternativeCount = s.orAlternativeCount ?? 1;
    const orSlotsJson = s.orSlotsJson || "[]";
    const allowedTypesJson = s.allowedTypesJson || "[]";
    const slotPlanJson = s.slotPlanJson || "[]";
    const role = s.role || "STANDARD";
    const groupKey = s.groupKey || "";
    if (last && last.title.trim().toLowerCase() === s.title.trim().toLowerCase()) {
      last.questionTypes.push({
        key: `qt-${s.id || seq++}`,
        id: s.id,
        type: s.type,
        count: s.count,
        marksEach: s.marksEach,
        orChoiceMode,
        orAlternativeCount,
        orSlotsJson,
        allowedTypesJson,
        slotPlanJson,
        role,
        groupKey,
      });
      if (!last.instructions && s.instructions) {
        last.instructions = s.instructions;
      }
    } else {
      groups.push({
        key: `grp-${s.id || seq++}`,
        title: s.title,
        instructions: s.instructions || "",
        questionTypes: [
          {
            key: `qt-${s.id || seq++}`,
            id: s.id,
            type: s.type,
            count: s.count,
            marksEach: s.marksEach,
            orChoiceMode,
            orAlternativeCount,
            orSlotsJson,
            allowedTypesJson,
            slotPlanJson,
            role,
            groupKey,
          },
        ],
      });
    }
  }
  return groups.length > 0
    ? groups
    : [
        {
          key: `grp-0`,
          title: "Section A",
          instructions: "",
          questionTypes: [{ key: `qt-0`, type: "MCQ", count: 5, marksEach: 1, orChoiceMode: "BOARD_DEFAULT", orAlternativeCount: 1, orSlotsJson: "[]" }],
        },
      ];
}

/**
 * Flattens SectionGroups back into an array of SectionDef items for saving or validation.
 */
export function flattenSectionGroups(groups: SectionGroup[]): {
  id?: string;
  title: string;
  instructions: string;
  type: string;
  count: number;
  marksEach: number;
  orChoiceMode: "BOARD_DEFAULT" | "REQUIRED" | "NOT_REQUIRED";
  orAlternativeCount: number;
  orSlotsJson: string;
  allowedTypesJson: string;
  slotPlanJson: string;
  role: string;
  groupKey: string;
}[] {
  return groups.flatMap((g) =>
    g.questionTypes.map((qt) => ({
      id: qt.id,
      title: g.title,
      instructions: g.instructions,
      type: qt.type,
      count: qt.count,
      marksEach: qt.marksEach,
      orChoiceMode: (qt.orChoiceMode as any) || "BOARD_DEFAULT",
      orAlternativeCount: qt.orAlternativeCount ?? 1,
      orSlotsJson: qt.orSlotsJson || "[]",
      allowedTypesJson: qt.allowedTypesJson || "[]",
      slotPlanJson: qt.slotPlanJson || "[]",
      role: qt.role || "STANDARD",
      groupKey: qt.groupKey || "",
    }))
  );
}

export function sectionMarks(s: Pick<SectionDef, "count" | "marksEach">) {
  return s.count * s.marksEach;
}

export function blueprintTotalMarks(sections: Pick<SectionDef, "count" | "marksEach">[]) {
  return sections.reduce((sum, s) => sum + sectionMarks(s), 0);
}

/** Errors that make a blueprint unusable. Empty array = valid. */
export function validateBlueprint(bp: {
  sections: Pick<SectionDef, "count" | "marksEach">[];
  chapters: ChapterQuota[];
}): string[] {
  const errors: string[] = [];
  if (bp.sections.length === 0) errors.push("Add at least one section.");
  if (bp.chapters.filter((c) => c.marks > 0).length === 0) errors.push("Give at least one chapter some marks.");
  const total = blueprintTotalMarks(bp.sections);
  const chapterTotal = bp.chapters.reduce((s, c) => s + c.marks, 0);
  if (total !== chapterTotal) {
    errors.push(`Sections total ${total} marks but chapter weightage totals ${chapterTotal}. They must match.`);
  }
  return errors;
}

export type PaperStatus = {
  sections: { id: string; needed: number; filled: number }[];
  chapters: { chapterId: string; target: number; used: number }[];
  totalMarks: number;
  usedMarks: number;
  complete: boolean;
};

function getItemUnits(item: PlacedItem, secCount: number): number {
  if (item.subpartsCount && item.subpartsCount > 1 && secCount >= item.subpartsCount) {
    return item.subpartsCount;
  }
  return 1;
}

function getItemMarks(item: PlacedItem, secMarksEach: number): number {
  if (item.marks && item.marks > 0) {
    return item.marks;
  }
  if (item.subpartsCount && item.subpartsCount > 1 && secMarksEach === 1) {
    return item.subpartsCount * secMarksEach;
  }
  return secMarksEach;
}

/**
 * A combined match question carries several pairs, usually from different chapters, but is stored against one
 * chapter. When that chapter's group ends up over its quota only because of the match question, the overflow is
 * counted towards groups that are still short instead of being reported as an excess.
 */
function spillMatchOverflow(
  groups: Map<string, { target: number; used: number }>,
  matches: Array<{ key: string; marks: number }>,
): void {
  for (const m of matches) {
    const g = groups.get(m.key);
    if (!g) continue;
    let spill = Math.min(m.marks, g.used - g.target);
    for (const other of groups.values()) {
      if (spill <= 0) break;
      if (other === g || other.used >= other.target) continue;
      const moved = Math.min(spill, other.target - other.used);
      other.used += moved;
      g.used -= moved;
      spill -= moved;
    }
  }
}

export function paperStatus(bp: BlueprintDef, items: PlacedItem[]): PaperStatus {
  const sectionById = new Map(bp.sections.map((s) => [s.id, s]));
  const sections = bp.sections.map((s) => {
    const placed = items.filter((i) => i.sectionId === s.id);
    const filledUnits = placed.reduce((sum, i) => sum + getItemUnits(i, s.count), 0);
    return {
      id: s.id,
      needed: s.count,
      filled: filledUnits,
    };
  });
  const rep = quotaRepresentatives(bp.chapters);
  const targetOf = new Map<string, number>();
  for (const c of bp.chapters) targetOf.set(rep.get(c.chapterId)!, (targetOf.get(rep.get(c.chapterId)!) ?? 0) + c.marks);
  const usedOf = new Map<string, number>();
  for (const i of items) {
    const key = rep.get(i.chapterId) ?? i.chapterId;
    usedOf.set(key, (usedOf.get(key) ?? 0) + getItemMarks(i, sectionById.get(i.sectionId)?.marksEach ?? 1));
  }
  {
    const groupTotals = new Map([...targetOf.keys()].map((k) => [k, { target: targetOf.get(k) ?? 0, used: usedOf.get(k) ?? 0 }]));
    spillMatchOverflow(
      groupTotals,
      items
        .filter((i) => (i.subpartsCount ?? 0) > 1 && sectionById.get(i.sectionId)?.type === "MATCH_COLUMN")
        .map((i) => ({ key: rep.get(i.chapterId) ?? i.chapterId, marks: getItemMarks(i, sectionById.get(i.sectionId)?.marksEach ?? 1) })),
    );
    for (const [k, g] of groupTotals) usedOf.set(k, g.used);
  }
  // every chapter reports its quota group's numbers, so a lesson inside a unit shares the unit's budget
  const chapters = bp.chapters.map((c) => {
    const key = rep.get(c.chapterId)!;
    return { chapterId: c.chapterId, target: targetOf.get(key) ?? 0, used: usedOf.get(key) ?? 0 };
  });
  const usedMarks = items.reduce((sum, i) => {
    const sec = sectionById.get(i.sectionId);
    return sum + getItemMarks(i, sec?.marksEach ?? 1);
  }, 0);
  // chapter weightage is a guide (see `chapters`), so only the sections decide whether a paper is complete
  const complete = sections.every((s) => s.filled === s.needed);
  return { sections, chapters, totalMarks: blueprintTotalMarks(bp.sections), usedMarks, complete };
}

/**
 * Why `candidate` may NOT be added to a paper built on `bp`; null if it may. Only the section decides: its
 * place in the blueprint, the type and marks it takes, its role and its free slots. Chapter weightage is a
 * guide and never refuses a question.
 */
export function whyCannotAdd(
  bp: BlueprintDef,
  items: PlacedItem[],
  candidate: { sectionId: string; chapterId: string; type: string; marks?: number; subpartsCount?: number; passageGroupId?: string | null },
): string | null {
  const section = bp.sections.find((s) => s.id === candidate.sectionId);
  if (!section) return "That section is not part of this paper's blueprint.";
  const typeReason = typeRejection(section, candidate.type, candidate.marks);
  if (typeReason) return typeReason;
  const roleReason = roleMismatchReason(section, candidate);
  if (roleReason) return roleReason;
  const status = paperStatus(bp, items);
  const sec = status.sections.find((s) => s.id === section.id)!;
  if (sec.filled >= sec.needed) return `${section.title} is already full (${sec.needed} questions).`;
  const isMultiUnitMatch = section.type === "MATCH_COLUMN" && section.count > 1 && section.marksEach === 1;
  const candidateUnits = isMultiUnitMatch && candidate.subpartsCount && candidate.subpartsCount > 1 && section.count >= candidate.subpartsCount
    ? candidate.subpartsCount
    : 1;
  if (sec.filled + candidateUnits > sec.needed) {
    return `${section.title} does not have enough slots available (${sec.filled}/${sec.needed} filled).`;
  }
  return null;
}

export type PaperImplication = {
  code:
    | "SECTION_UNDERFILLED"
    | "SECTION_OVERFILLED"
    | "TYPE_MISMATCH"
    | "CHAPTER_EXCESS"
    | "CHAPTER_DEFICIT"
    | "CHAPTER_OUTSIDE_BLUEPRINT"
    | "ORPHANED_SECTION"
    | "MISSING_INTERNAL_CHOICE"
    | "FORBIDDEN_INTERNAL_CHOICE"
    | "INVALID_INTERNAL_CHOICE"
    | "COMPONENT_EXCESS"
    | "COMPONENT_DEFICIT"
    | "COMPONENT_UNTAGGED";
  severity: "error" | "warning";
  sectionId?: string;
  sectionTitle?: string;
  chapterId?: string;
  chapterTitle?: string;
  questionId?: string;
  questionText?: string;
  message: string;
  details?: Record<string, unknown>;
};

export type DiagnosticItem = {
  id?: string;
  sectionId: string;
  chapterId: string;
  type?: string;
  text?: string;
  marks?: number;
  subpartsCount?: number;
};

export function diagnosePaperImplications(
  bp: {
    sections: { id: string; title: string; type: string; count: number; marksEach: number }[];
    chapters: { chapterId: string; title?: string; marks: number; unitKey?: string | null; unitTitle?: string | null }[];
  },
  items: DiagnosticItem[],
): PaperImplication[] {
  const implications: PaperImplication[] = [];
  const marksBySection = new Map(bp.sections.map((s) => [s.id, s.marksEach]));
  const sectionById = new Map(bp.sections.map((s) => [s.id, s]));

  // 1. Check sections
  for (const s of bp.sections) {
    const placed = items.filter((i) => i.sectionId === s.id);
    const filledUnits = placed.reduce((sum, i) => {
      if (i.subpartsCount && i.subpartsCount > 1) {
        return sum + i.subpartsCount;
      }
      return sum + 1;
    }, 0);

    if (filledUnits < s.count) {
      const missing = s.count - filledUnits;
      implications.push({
        code: "SECTION_UNDERFILLED",
        severity: "warning",
        sectionId: s.id,
        sectionTitle: s.title,
        message: `${s.title} requires ${s.count} questions, but only ${filledUnits} are placed (${missing} slot${missing > 1 ? "s" : ""} to fill).`,
        details: { needed: s.count, filled: filledUnits, missing },
      });
    } else if (filledUnits > s.count) {
      const excess = filledUnits - s.count;
      implications.push({
        code: "SECTION_OVERFILLED",
        severity: "error",
        sectionId: s.id,
        sectionTitle: s.title,
        message: `${s.title} quota was reduced to ${s.count} questions, but has ${filledUnits} placed (${excess} excess question${excess > 1 ? "s" : ""} must be removed).`,
        details: { needed: s.count, filled: filledUnits, excess },
      });
    }

    // Check type mismatches within section
    for (const item of placed) {
      if (item.type && item.type !== s.type) {
        if (!toleratesType(s, item.type)) {
          implications.push({
            code: "TYPE_MISMATCH",
            severity: "error",
            sectionId: s.id,
            sectionTitle: s.title,
            questionId: item.id,
            questionText: item.text,
            message: `Question in ${s.title} has type ${item.type}, but the section now requires ${s.type}.`,
            details: { expectedType: s.type, actualType: item.type, questionId: item.id },
          });
        }
      }
    }
  }

  // 2. Check orphaned items (items in sections no longer in blueprint)
  const orphanedItems = items.filter((i) => !sectionById.has(i.sectionId));
  if (orphanedItems.length > 0) {
    implications.push({
      code: "ORPHANED_SECTION",
      severity: "error",
      message: `${orphanedItems.length} question(s) belong to a section that was deleted from the blueprint.`,
      details: { count: orphanedItems.length, itemIds: orphanedItems.map((i) => i.id) },
    });
  }

  // 3. Check chapter / unit mark allocations (one finding per quota group)
  const rep = quotaRepresentatives(bp.chapters);
  const groups = new Map<string, { chapterId: string; title?: string; target: number; used: number }>();
  for (const c of bp.chapters) {
    const key = rep.get(c.chapterId)!;
    const g = groups.get(key) ?? {
      chapterId: key,
      title: (c as { unitTitle?: string | null }).unitTitle || c.title,
      target: 0,
      used: 0,
    };
    g.target += c.marks;
    groups.set(key, g);
  }
  for (const i of items) {
    const g = groups.get(rep.get(i.chapterId) ?? i.chapterId);
    if (!g) continue;
    g.used += i.marks && i.marks > 0 ? i.marks : (marksBySection.get(i.sectionId) ?? 0);
  }
  spillMatchOverflow(
    groups,
    items
      .filter((i) => i.type === "MATCH_COLUMN" && (i.subpartsCount ?? 0) > 1)
      .map((i) => ({ key: rep.get(i.chapterId) ?? i.chapterId, marks: i.marks ?? 0 })),
  );
  const outside = items.filter((i) => !groups.has(rep.get(i.chapterId) ?? i.chapterId));
  if (outside.length > 0) {
    implications.push({
      code: "CHAPTER_OUTSIDE_BLUEPRINT",
      severity: "warning",
      message: `${outside.length} question(s) are from chapters outside this blueprint.`,
      details: { count: outside.length, itemIds: outside.map((i) => i.id) },
    });
  }
  for (const g of groups.values()) {
    const chapterName = g.title ? g.title : `Chapter ${g.chapterId}`;
    if (g.used > g.target) {
      const excess = g.used - g.target;
      implications.push({
        code: "CHAPTER_EXCESS",
        severity: "warning",
        chapterId: g.chapterId,
        chapterTitle: g.title,
        message: `${chapterName} has ${g.used} marks placed, exceeding updated blueprint quota of ${g.target} marks (+${excess}m excess).`,
        details: { target: g.target, used: g.used, excess },
      });
    } else if (g.used < g.target) {
      const deficit = g.target - g.used;
      implications.push({
        code: "CHAPTER_DEFICIT",
        severity: "warning",
        chapterId: g.chapterId,
        chapterTitle: g.title,
        message: `${chapterName} has ${g.used} marks placed, below updated blueprint quota of ${g.target} marks (${deficit}m needed).`,
        details: { target: g.target, used: g.used, deficit },
      });
    }
  }

  return implications;
}

/**
 * Single source of truth for what one placed question is worth in its slot.
 * Used by the builder, print, DOCX, completeness and audit so totals can never disagree.
 *  - MATCH_COLUMN in a multi-slot match section: one unit per pair, capped at the section count.
 *  - Sub-questions: their total (attempt-count aware), capped at the slot's marks.
 *  - Otherwise: the slot's marks.
 */
export function questionSlotMarks(
  section: { type?: string; count: number; marksEach: number },
  q: {
    type: string;
    text?: string;
    options?: string[] | null;
    optionsJson?: string | null;
    explanation?: string | null;
    subparts?: Array<{ marks: number }> | null;
    subpartsJson?: string | null;
    attemptCount?: number | null;
  },
): { marks: number; units: number } {
  const secMarksEach = section.marksEach ?? 1;
  const secCount = section.count ?? 1;
  const isMatch = q.type === "MATCH_COLUMN";
  const secIsMatch = section.type === "MATCH_COLUMN";
  if (isMatch) {
    let opts: string[] = [];
    if (Array.isArray(q.options)) opts = q.options;
    else {
      try {
        const parsed = JSON.parse(q.optionsJson || "[]");
        opts = Array.isArray(parsed) ? parsed : [];
      } catch {}
    }
    const pairs = parseMatchColumnPairs(opts, q.text ?? "", q.explanation).length;
    if (secIsMatch && secCount > 1) {
      const units = Math.min(pairs > 0 ? pairs : secCount, secCount);
      return { marks: units * secMarksEach, units };
    }
    return { marks: secMarksEach, units: 1 };
  }
  const payload = parseSubpartsPayload(q.subpartsJson);
  const subparts = Array.isArray(q.subparts) && q.subparts.length > 0 ? q.subparts : payload.subparts;
  // "attempt k of n" only means something when there are sub-questions to choose from; a stray attemptCount on
  // a question without sub-parts (some models echo the schema example) must not shrink its marks
  const attemptCount = subparts.length > 0 ? q.attemptCount || payload.attemptCount : undefined;
  const submarks = attemptedSubpartsMarks(subparts as never, attemptCount);
  const marks = submarks > 0 ? (secMarksEach > 0 ? Math.min(submarks, secMarksEach) : submarks) : secMarksEach;
  return { marks, units: 1 };
}

type PlaceableQuestion = Parameters<typeof questionSlotMarks>[1];

/**
 * How one question counts in a section: the marks it carries and, for a combined match question in a
 * one-mark-per-pair match section, how many slots it fills. Every path that places, replaces or edits a
 * question asks here, so a question is never counted one way when added and another way when edited.
 */
export function slotPlacement(
  section: { type?: string; count: number; marksEach: number },
  q: PlaceableQuestion,
): { marks: number; subpartsCount?: number } {
  const { marks, units } = questionSlotMarks(section, q);
  const isMultiUnitMatch = q.type === "MATCH_COLUMN" && section.type === "MATCH_COLUMN" && section.count > 1;
  return { marks, subpartsCount: isMultiUnitMatch ? units : undefined };
}

/**
 * Why a question's parts do not fit a slot of `marksEach` marks; null when they do (or it has none).
 * "Answer any N of" counts the N attempted parts.
 */
export function subpartsMarksProblem(
  section: { marksEach: number },
  q: { subparts?: Array<{ marks: number }> | null; subpartsJson?: string | null; attemptCount?: number | null },
): string | null {
  const payload = parseSubpartsPayload(q.subpartsJson);
  const subparts = Array.isArray(q.subparts) && q.subparts.length > 0 ? q.subparts : payload.subparts;
  if (subparts.length === 0) return null;
  const attemptCount = q.attemptCount || payload.attemptCount;
  if (validateSubPartsSum(subparts as never, section.marksEach, attemptCount)) return null;
  return `total subpart marks (${attemptedSubpartsMarks(subparts as never, attemptCount)}) must match section marks (${section.marksEach}).`;
}

/** Map raw paper items or DTO items to normalized PlacedItem representation for blueprint calculation */
export function toPlacedItems(
  blueprintOrSections:
    | { sections: { id: string; count: number; marksEach: number; type?: string }[] }
    | { id: string; count: number; marksEach: number; type?: string }[],
  items: {
    sectionId: string;
    questionId?: string;
    question: {
      id?: string;
      chapterId: string;
      type: string;
      text: string;
      optionsJson?: string | null;
      subpartsJson?: string | null;
      options?: string[];
      subparts?: Array<{ marks: number }>;
    };
  }[],
): PlacedItem[] {
  const sections = Array.isArray(blueprintOrSections)
    ? blueprintOrSections
    : blueprintOrSections?.sections || [];
  return items.map((i) => {
    const sec = sections.find((x) => x.id === i.sectionId) ?? { count: 1, marksEach: 1 };
    const { marks, subpartsCount } = slotPlacement(sec, {
      ...i.question,
      explanation: (i.question as { explanation?: string | null }).explanation,
      attemptCount: (i.question as { attemptCount?: number | null }).attemptCount,
    });
    return {
      sectionId: i.sectionId,
      chapterId: i.question.chapterId,
      marks,
      subpartsCount,
      questionId: i.questionId || i.question.id || undefined,
    };
  });
}
