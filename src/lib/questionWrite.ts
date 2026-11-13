// How a question is written to the database, in one place: the bank, the paper builder, copies and sets all
// store the same columns the same way. Pure: no I/O, safe on client and server.

import { parseSubpartsPayload } from "./types";

type SubpartLike = { marks: number };

/**
 * What the `subpartsJson` column holds: the plain list, or `{ attemptCount, subparts }` when students answer
 * "any N of" the parts. `Question` has no attempt-count column; it lives here.
 */
export function subpartsColumn(subparts: readonly SubpartLike[] | null | undefined, attemptCount?: number | null): string {
  const list = subparts ?? [];
  const n = Number(attemptCount);
  return JSON.stringify(Number.isInteger(n) && n > 0 && n <= list.length && list.length > 1 ? { attemptCount: n, subparts: list } : list);
}

/** Marks a question as a paper's own copy of a bank question (shuffled options, re-tagged chapter). */
export const VARIANT_MARKER = "_forkedFrom";

/** True for a paper's own copy of a bank question. Such copies are not offered by the bank, auto-fill or sets. */
export function isVariantCopy(subpartsJson: string | null | undefined): boolean {
  return typeof subpartsJson === "string" && subpartsJson.includes(VARIANT_MARKER);
}

/** `subpartsJson` for a paper's own copy: the source's parts and attempt count, plus where the copy came from. */
export function variantSubpartsColumn(
  sourceSubpartsJson: string | null | undefined,
  marker: { forkedFrom: string; paperId?: string; paperSet?: string; reconciledToChapter?: string },
): string {
  const { subparts, attemptCount } = parseSubpartsPayload(sourceSubpartsJson);
  return JSON.stringify({
    subparts,
    ...(attemptCount ? { attemptCount } : {}),
    [VARIANT_MARKER]: marker.forkedFrom,
    ...(marker.paperId ? { _paperId: marker.paperId } : {}),
    ...(marker.paperSet ? { _paperSet: marker.paperSet } : {}),
    ...(marker.reconciledToChapter ? { _reconciledToChapter: marker.reconciledToChapter } : {}),
  });
}

type QuestionInput = {
  options: string[];
  subparts?: SubpartLike[];
  attemptCount?: number;
};

/**
 * A validated question (questionSchema) as database columns: options and parts become JSON, and the attempt
 * count is folded into the parts column.
 */
export function questionColumns<T extends QuestionInput>(input: T): Omit<T, "options" | "subparts" | "attemptCount"> & { optionsJson: string; subpartsJson: string } {
  const { options, subparts, attemptCount, ...rest } = input;
  return { ...rest, optionsJson: JSON.stringify(options), subpartsJson: subpartsColumn(subparts, attemptCount) };
}

type QuestionRow = {
  bookId: string;
  chapterId: string;
  type: string;
  text: string;
  optionsJson: string;
  subpartsJson: string;
  answer: string;
  difficulty: string;
  cognitiveLevel?: string | null;
  explanation?: string | null;
  figureScene?: string | null;
  imagePath?: string | null;
  spaceMm: number;
  showGrid: boolean;
  curriculumTopicId?: string | null;
  competencyLevel?: string | null;
  sourceProvenance?: string | null;
  passageGroupId?: string | null;
};

/** Every content column of a question, for making a copy of it. The caller adds `createdById` and any changes. */
export function questionCopyData(q: QuestionRow) {
  return {
    bookId: q.bookId,
    chapterId: q.chapterId,
    type: q.type,
    text: q.text,
    optionsJson: q.optionsJson,
    subpartsJson: q.subpartsJson,
    answer: q.answer,
    difficulty: q.difficulty,
    cognitiveLevel: q.cognitiveLevel ?? null,
    explanation: q.explanation ?? null,
    figureScene: q.figureScene ?? null,
    imagePath: q.imagePath ?? null,
    spaceMm: q.spaceMm,
    showGrid: q.showGrid,
    curriculumTopicId: q.curriculumTopicId ?? null,
    competencyLevel: q.competencyLevel ?? null,
    sourceProvenance: q.sourceProvenance ?? null,
    passageGroupId: q.passageGroupId ?? null,
  };
}

type PaperRow = {
  blueprintId: string;
  layout: string;
  schoolName: string;
  schoolLogo: string | null;
  logoPath: string | null;
  academicSession: string;
  examType: string;
  examDate: string;
  paperSet: string;
  subjectCode: string;
  language: string;
  generalInstructions: string;
  printDensity: string;
  twoColumn: boolean;
  targetPages: number | null;
  numberingStyle: string;
  marksStyle: string;
  showCandidateDetails: boolean;
  showSignatures: boolean;
  securityWatermark: boolean;
  watermarkText: string;
};

/** A paper's own settings, for a duplicate or a parallel set. The caller adds title, status and creator. */
export function paperCopyData(p: PaperRow) {
  return {
    blueprintId: p.blueprintId,
    layout: p.layout,
    schoolName: p.schoolName,
    schoolLogo: p.schoolLogo,
    logoPath: p.logoPath,
    academicSession: p.academicSession,
    examType: p.examType,
    examDate: p.examDate,
    paperSet: p.paperSet,
    subjectCode: p.subjectCode,
    language: p.language,
    generalInstructions: p.generalInstructions,
    printDensity: p.printDensity,
    twoColumn: p.twoColumn,
    targetPages: p.targetPages,
    numberingStyle: p.numberingStyle,
    marksStyle: p.marksStyle,
    showCandidateDetails: p.showCandidateDetails,
    showSignatures: p.showSignatures,
    securityWatermark: p.securityWatermark,
    watermarkText: p.watermarkText,
  };
}

type ItemRow = { sectionId: string; position: number; pageBreakBefore?: boolean | null; componentKey?: string | null; instruction?: string | null; pairMarks?: number | null };

/** What a placed question carries besides the question itself: its slot and its per-paper settings. */
export function itemCopyData(it: ItemRow) {
  return {
    sectionId: it.sectionId,
    position: it.position,
    pageBreakBefore: Boolean(it.pageBreakBefore),
    componentKey: it.componentKey || "",
    instruction: it.instruction || "",
    pairMarks: it.pairMarks ?? null,
  };
}
