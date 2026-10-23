// Pure blueprint rules. Used by the API (to reject) and the UI (to explain). No I/O here.

export type SectionDef = { id: string; title: string; type: string; count: number; marksEach: number };
export type ChapterQuota = { chapterId: string; marks: number; title?: string; number?: number | null };
export type BlueprintDef = { sections: SectionDef[]; chapters: ChapterQuota[] };
export type PlacedItem = {
  sectionId: string;
  chapterId: string;
  marks?: number;
  subpartsCount?: number;
};

export type QuestionTypeItem = {
  key: string;
  id?: string;
  type: string;
  count: number;
  marksEach: number;
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
    instructions?: string;
    type: string;
    count: number;
    marksEach: number;
  }[]
): SectionGroup[] {
  const groups: SectionGroup[] = [];
  let seq = 0;
  for (const s of flat) {
    const last = groups[groups.length - 1];
    if (last && last.title.trim().toLowerCase() === s.title.trim().toLowerCase()) {
      last.questionTypes.push({
        key: `qt-${s.id || seq++}`,
        id: s.id,
        type: s.type,
        count: s.count,
        marksEach: s.marksEach,
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
          questionTypes: [{ key: `qt-0`, type: "MCQ", count: 5, marksEach: 1 }],
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
}[] {
  return groups.flatMap((g) =>
    g.questionTypes.map((qt) => ({
      id: qt.id,
      title: g.title,
      instructions: g.instructions,
      type: qt.type,
      count: qt.count,
      marksEach: qt.marksEach,
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

/** Arithmetic feasibility checks for chapter mark allocations against section denominations. */
export function checkBlueprintFeasibility(bp: {
  sections: Pick<SectionDef, "count" | "marksEach">[];
  chapters: ChapterQuota[];
}): string[] {
  const warnings: string[] = [];
  if (bp.sections.length === 0 || bp.chapters.length === 0) return warnings;

  const denominations = Array.from(new Set(bp.sections.map((s) => s.marksEach))).sort((a, b) => a - b);
  if (denominations.length === 0) return warnings;

  const minDenom = denominations[0];
  for (const c of bp.chapters) {
    const chapterLabel = c.title
      ? `Chapter "${c.title}"`
      : c.number != null
      ? `Chapter ${c.number}`
      : "A chapter";

    if (c.marks > 0 && c.marks < minDenom) {
      warnings.push(
        `${chapterLabel} is assigned ${c.marks} mark(s), but the smallest section question is ${minDenom} marks.`
      );
    }
  }

  // Coin-change reachability check: can c.marks be formed using denominations?
  for (const c of bp.chapters) {
    if (c.marks <= 0) continue;
    const chapterLabel = c.title
      ? `Chapter "${c.title}"`
      : c.number != null
      ? `Chapter ${c.number}`
      : "Chapter";

    const reachable = new Uint8Array(c.marks + 1);
    reachable[0] = 1;
    for (let i = 0; i <= c.marks; i++) {
      if (!reachable[i]) continue;
      for (const d of denominations) {
        if (i + d <= c.marks) reachable[i + d] = 1;
      }
    }
    if (!reachable[c.marks]) {
      warnings.push(
        `${chapterLabel} quota (${c.marks}m) cannot be formed by any combination of section question denominations (${denominations.join("m, ")}m).`
      );
    }
  }

  return warnings;
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
  if (item.subpartsCount && item.subpartsCount > 1) {
    return item.subpartsCount * secMarksEach;
  }
  return secMarksEach;
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
  const chapters = bp.chapters.map((c) => ({
    chapterId: c.chapterId,
    target: c.marks,
    used: items
      .filter((i) => i.chapterId === c.chapterId)
      .reduce((sum, i) => {
        const sec = sectionById.get(i.sectionId);
        return sum + getItemMarks(i, sec?.marksEach ?? 1);
      }, 0),
  }));
  const usedMarks = items.reduce((sum, i) => {
    const sec = sectionById.get(i.sectionId);
    return sum + getItemMarks(i, sec?.marksEach ?? 1);
  }, 0);
  const complete =
    sections.every((s) => s.filled === s.needed) &&
    chapters.every((c) => c.used === c.target) &&
    items.every((i) => bp.chapters.some((c) => c.chapterId === i.chapterId));
  return { sections, chapters, totalMarks: blueprintTotalMarks(bp.sections), usedMarks, complete };
}

/** Why `candidate` may NOT be added to a paper built on `bp`; null if it may. */
export function whyCannotAdd(
  bp: BlueprintDef,
  items: PlacedItem[],
  candidate: { sectionId: string; chapterId: string; type: string; marks?: number; subpartsCount?: number },
): string | null {
  const section = bp.sections.find((s) => s.id === candidate.sectionId);
  if (!section) return "That section is not part of this paper's blueprint.";
  if (candidate.type !== section.type) return `${section.title} only accepts ${section.type} questions.`;
  const status = paperStatus(bp, items);
  const sec = status.sections.find((s) => s.id === section.id)!;
  if (sec.filled >= sec.needed) return `${section.title} is already full (${sec.needed} questions).`;
  const candidateUnits = candidate.subpartsCount && candidate.subpartsCount > 1 && section.count >= candidate.subpartsCount
    ? candidate.subpartsCount
    : 1;
  if (sec.filled + candidateUnits > sec.needed) {
    return `${section.title} does not have enough slots available (${sec.filled}/${sec.needed} filled).`;
  }
  const chapter = status.chapters.find((c) => c.chapterId === candidate.chapterId);
  if (!chapter) return "This question's chapter is not in the blueprint.";
  const candidateMarks = candidate.marks && candidate.marks > 0
    ? candidate.marks
    : (candidate.subpartsCount && candidate.subpartsCount > 1
        ? candidate.subpartsCount * section.marksEach
        : section.marksEach);
  if (chapter.used + candidateMarks > chapter.target) {
    return `The blueprint allows only ${chapter.target} marks from this chapter; ${chapter.used} are already used.`;
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
    | "ORPHANED_SECTION";
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
    chapters: { chapterId: string; title?: string; marks: number }[];
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
        // Tolerant compatibility: SHORT vs LONG for 3m/4m questions
        const isSubjectiveCompat =
          (item.type === "SHORT" || item.type === "LONG") &&
          (s.type === "SHORT" || s.type === "LONG") &&
          s.marksEach >= 3;
        // Objective types compatibility if section has objective/MCQ
        const isObjectiveCompat =
          ["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "ONE_WORD"].includes(item.type) &&
          ["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "ONE_WORD"].includes(s.type) &&
          s.marksEach === 1;

        if (!isSubjectiveCompat && !isObjectiveCompat) {
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

  // 3. Check chapter mark allocations
  for (const c of bp.chapters) {
    const used = items
      .filter((i) => i.chapterId === c.chapterId)
      .reduce((sum, i) => {
        const itemMarks = i.marks && i.marks > 0 ? i.marks : (marksBySection.get(i.sectionId) ?? 0);
        return sum + itemMarks;
      }, 0);

    const chapterName = c.title ? c.title : `Chapter ${c.chapterId}`;

    if (used > c.marks) {
      const excess = used - c.marks;
      implications.push({
        code: "CHAPTER_EXCESS",
        severity: "error",
        chapterId: c.chapterId,
        chapterTitle: c.title,
        message: `${chapterName} has ${used} marks placed, exceeding updated blueprint quota of ${c.marks} marks (+${excess}m excess).`,
        details: { target: c.marks, used, excess },
      });
    } else if (used < c.marks) {
      const deficit = c.marks - used;
      implications.push({
        code: "CHAPTER_DEFICIT",
        severity: "warning",
        chapterId: c.chapterId,
        chapterTitle: c.title,
        message: `${chapterName} has ${used} marks placed, below updated blueprint quota of ${c.marks} marks (${deficit}m needed).`,
        details: { target: c.marks, used, deficit },
      });
    }
  }

  return implications;
}
