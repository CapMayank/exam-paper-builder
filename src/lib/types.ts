import type { QuestionDto } from "./dto";
import type { PaperImplication, PaperStatus } from "./blueprint";
import type { MarksStyle, NumberingStyle, PrintDensity, UserRole, TimetableStatus, SessionSlot, PaperLanguage } from "./constants";
import type { PaperInternalChoiceAudit } from "./internalChoiceRules";

export type { QuestionDto, PaperImplication, PaperInternalChoiceAudit };
export type { MarksStyle, NumberingStyle, PrintDensity, UserRole, TimetableStatus, SessionSlot, PaperLanguage };

export type ClassSubjectDto = {
  id: string;
  classId: string;
  name: string;
  code: string;
};

export type SectionDetail = {
  name: string;
  studentCount: number;
};

export type AcademicClassDto = {
  id: string;
  name: string;
  displayOrder: number;
  stream: string;
  academicSession: string;
  sections: string[];
  sectionDetails: SectionDetail[];
  subjects: ClassSubjectDto[];
};

export type Chapter = { id: string; bookId: string; number: number; title: string };
export type Book = {
  id: string;
  title: string;
  subject: string;
  className: string;
  academicSession?: string;
  chapters: Chapter[];
  _count: { questions: number; blueprints: number };
};

export type Section = {
  id: string;
  position: number;
  title: string;
  instructions: string;
  type: string;
  count: number;
  marksEach: number;
  orChoiceMode?: "BOARD_DEFAULT" | "REQUIRED" | "NOT_REQUIRED";
  orAlternativeCount?: number;
  orSlotsJson?: string;
  allowedTypesJson?: string;
  slotPlanJson?: string;
  role?: "STANDARD" | "PASSAGE" | "GRAMMAR" | "WRITING" | "LITERATURE";
  groupKey?: string;
};

export type Blueprint = {
  id: string;
  name: string;
  bookId: string;
  academicSession?: string;
  examType: string;
  durationMin: number;
  subjectCode: string;
  language?: PaperLanguage;
  book: { id: string; title: string; subject: string; className: string };
  componentsJson?: string;
  /** KG_WORKSHEET for Nursery–KG worksheets built without a blueprint. */
  curriculumMode?: string;
  chapters: { chapterId: string; marks: number; unitKey?: string; unitTitle?: string; chapter: { id: string; number: number; title: string } }[];
  sections: Section[];
  _count: { papers: number };
};

export type BlueprintData = Blueprint;

export type SubPart = {
  id?: string;
  label: string;
  text: string;
  marks: number;
  answer?: string;
  options?: string[];
  subparts?: SubPart[];
};

export type QuestionUsageTag = {
  paperId: string;
  paperTitle: string;
  paperSet: string;
  examDate: string;
  academicSession: string;
  className: string;
  subject?: string;
  status?: string;
  isOrChoice: boolean;
};

export type QuestionData = QuestionDto;

export type PaperItem = {
  id: string;
  sectionId: string;
  position: number;
  pageBreakBefore?: boolean;
  componentKey?: string;
  /** Teacher's line printed above the question; "" = print nothing. */
  instruction?: string;
  question: QuestionDto;
  orQuestion?: QuestionDto | null;
};

export type PaperSnapshot = {
  id: string;
  paperId: string;
  name: string;
  snapshotJson: string;
  createdById: string;
  createdAt: string;
  createdByName?: string;
};

export type PaperSnapshotItem = {
  sectionId: string;
  position: number;
  questionId: string;
  orQuestionId?: string | null;
  question?: QuestionDto;
  orQuestion?: QuestionDto | null;
};

export type PaperSnapshotPayload = {
  paperId: string;
  title: string;
  layout: string;
  schoolName: string;
  examDate: string;
  paperSet: string;
  subjectCode: string;
  language?: PaperLanguage;
  generalInstructions: string;
  academicSession: string;
  logoPath?: string | null;
  schoolLogo?: string | null;
  printDensity: PrintDensity;
  twoColumn: boolean;
  targetPages?: number | null;
  numberingStyle: NumberingStyle;
  marksStyle: MarksStyle;
  showCandidateDetails: boolean;
  showSignatures: boolean;
  items: PaperSnapshotItem[];
  timestamp: string;
};

export type SnapshotDiff = {
  addedQuestionIds: string[];
  removedQuestionIds: string[];
  replacedItems: {
    sectionId: string;
    position: number;
    oldQuestionId: string;
    newQuestionId: string;
  }[];
  metadataChanges: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
};

export type PaperData = {
  id: string;
  title: string;
  examType?: string;
  layout: string;
  schoolName: string;
  examDate: string;
  paperSet: string;
  subjectCode: string;
  language?: PaperLanguage;
  generalInstructions: string;
  status: "DRAFT" | "FINAL";
  blueprint: Blueprint;
  items: PaperItem[];
  progress: PaperStatus;
  implications?: PaperImplication[];
  internalChoiceAudit?: PaperInternalChoiceAudit;

  // Milestone 1 Customization & Board Guardrail Extensions
  academicSession: string;
  schoolLogo?: string | null;
  logoPath: string | null;
  printDensity: PrintDensity;
  twoColumn: boolean;
  targetPages: number | null;
  numberingStyle: NumberingStyle;
  marksStyle: MarksStyle;
  showCandidateDetails: boolean;
  showSignatures: boolean;
  securityWatermark?: boolean;
  watermarkText?: string;
  createdAt?: string;
  updatedAt?: string;
  snapshots?: PaperSnapshot[];
  createdById?: string;
};

export type PaperListItem = {
  id: string;
  title: string;
  examType?: string;
  layout: string;
  status: "DRAFT" | "FINAL";
  schoolName: string;
  examDate: string;
  updatedAt: string;
  blueprint: { name: string; examType: string; curriculumMode?: string; book: { title: string; subject: string; className: string } };
  filled: number;
  needed: number;
  totalMarks?: number;
  placedMarks?: number;
  isComplete?: boolean;
  createdById?: string;
  academicSession?: string;
  paperSet?: string;
  subjectCode?: string;
  printDensity?: PrintDensity;
  targetPages?: number | null;
};

export function parseSubparts(json?: unknown): SubPart[] {
  if (!json) return [];
  try {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    let list: any[] = [];
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && typeof parsed === "object") {
      if (Array.isArray((parsed as any).items)) {
        list = (parsed as any).items;
      } else if (Array.isArray((parsed as any).subparts)) {
        list = (parsed as any).subparts;
      } else {
        return [];
      }
    } else {
      return [];
    }
    return list
      .filter((sp) => Boolean(sp && typeof sp === "object"))
      .map((sp, idx) => {
        const item: SubPart = {
          label: typeof sp?.label === "string" && sp.label.trim() ? sp.label.trim() : `(${idx + 1})`,
          text: typeof sp?.text === "string" ? sp.text : "",
          marks:
            typeof sp?.marks === "number" && Number.isFinite(sp.marks)
              ? sp.marks
              : typeof sp?.marks === "string" && Number.isFinite(Number(sp.marks))
              ? Number(sp.marks)
              : 1,
        };
        if (typeof sp?.id === "string") item.id = sp.id;
        if (typeof sp?.answer === "string") item.answer = sp.answer;
        if (Array.isArray(sp?.options)) item.options = sp.options.map((o: unknown) => String(o));
        if (Array.isArray(sp?.subparts) && sp.subparts.length > 0) {
          item.subparts = parseSubparts(sp.subparts);
        }
        return item;
      });
  } catch {
    return [];
  }
}

export function parseSubpartsPayload(json?: unknown): { subparts: SubPart[]; attemptCount?: number } {
  if (!json) return { subparts: [] };
  try {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    let attemptCount: number | undefined = undefined;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (typeof (parsed as any).attemptCount === "number" && (parsed as any).attemptCount > 0) {
        attemptCount = (parsed as any).attemptCount;
      }
    }
    const subparts = parseSubparts(parsed);
    return { subparts, attemptCount };
  } catch {
    return { subparts: [] };
  }
}

/** Smallest share of a mark a part can carry: a 1-mark question with four blanks gives ¼ each. */
export const PART_MARK_STEP = 0.25;

const sameMarks = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** Part marks as stored: a positive multiple of ¼ (0 when the input is not a usable number). */
export function snapPartMarks(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(PART_MARK_STEP, Math.round(n / PART_MARK_STEP) * PART_MARK_STEP);
}

/** Marks as printed: 0.5 → "½", 1.5 → "1½", 2 → "2". */
export function formatMarksValue(marks: number): string {
  if (!Number.isFinite(marks)) return "";
  const whole = Math.floor(marks + 1e-6);
  const frac = marks - whole;
  const glyph = sameMarks(frac, 0.25) ? "¼" : sameMarks(frac, 0.5) ? "½" : sameMarks(frac, 0.75) ? "¾" : null;
  if (glyph) return whole > 0 ? `${whole}${glyph}` : glyph;
  return sameMarks(frac, 0) ? String(whole) : String(Math.round(marks * 100) / 100);
}

/** What each of `count` equal parts carries when together they are worth `total`; null when that is not a multiple of ¼. */
export function equalPartMarks(total: number, count: number): number | null {
  if (!(total > 0) || !(count > 0)) return null;
  const each = total / count;
  const steps = each / PART_MARK_STEP;
  return steps >= 1 && sameMarks(steps, Math.round(steps)) ? Math.round(steps) * PART_MARK_STEP : null;
}

/**
 * `total` marks shared over `count` parts in steps of ¼, as evenly as possible (any remainder goes to the
 * last parts). null when there is less than ¼ per part.
 */
export function splitMarksEvenly(total: number, count: number): number[] | null {
  if (!(count > 0)) return null;
  const units = Math.round(total / PART_MARK_STEP);
  const base = Math.floor(units / count);
  if (base < 1) return null;
  const extra = units - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i >= count - extra ? 1 : 0)) * PART_MARK_STEP);
}

export function subpartsTotalMarks(
  subparts?: (Pick<SubPart, "marks" | "subparts"> | null | undefined)[] | null,
): number {
  if (!subparts || !Array.isArray(subparts)) return 0;
  return subparts.reduce((sum, sp) => {
    if (!sp) return sum;
    if (Array.isArray(sp.subparts) && sp.subparts.length > 0) {
      return sum + subpartsTotalMarks(sp.subparts);
    }
    const m = sp?.marks;
    return sum + (typeof m === "number" && Number.isFinite(m) ? m : 0);
  }, 0);
}

export const sumSubPartMarks = subpartsTotalMarks;

/**
 * What a question's parts are worth to the student: all of them, or `attemptCount` of them when the question
 * says "answer any N". 0 when there are no parts.
 */
export function attemptedSubpartsMarks(
  subparts: (Pick<SubPart, "marks" | "subparts"> | null | undefined)[] | null | undefined,
  attemptCount?: number | null,
): number {
  if (!subparts || subparts.length === 0) return 0;
  if (typeof attemptCount === "number" && attemptCount > 0 && attemptCount <= subparts.length) {
    return attemptCount * (subparts[0]?.marks || 1);
  }
  return subpartsTotalMarks(subparts);
}

export function validateSubPartsSum(
  subparts: (Pick<SubPart, "marks" | "subparts"> | null | undefined)[] | null | undefined,
  expectedTotalMarks: number,
  attemptCount?: number,
): boolean {
  if (!subparts || subparts.length === 0) return true;
  if (typeof attemptCount === "number" && attemptCount > 0 && attemptCount <= subparts.length) {
    const valid = subparts.filter(Boolean) as Pick<SubPart, "marks" | "subparts">[];
    if (valid.length > 0) {
      const allEqual = valid.every((sp) => sp.marks === valid[0]?.marks);
      if (allEqual && sameMarks(valid[0].marks * attemptCount, expectedTotalMarks)) {
        return true;
      }
      const sumFirstK = subpartsTotalMarks(valid.slice(0, attemptCount));
      if (sameMarks(sumFirstK, expectedTotalMarks)) return true;
    }
  }
  return sameMarks(subpartsTotalMarks(subparts), expectedTotalMarks);
}

/**
 * Deterministically balances subpart marks to guarantee that their sum
 * exactly equals expectedTotalMarks. Preserves minimum 1 mark per subpart.
 * Supports attemptCount (e.g. answer any 4 of 5) to avoid artificial fractional mark scaling.
 */
export function normalizeSubpartMarks<T extends { marks: number; subparts?: any[] }>(
  subparts: T[],
  expectedTotalMarks: number,
  attemptCount?: number,
): T[] {
  if (!Array.isArray(subparts) || subparts.length === 0 || !expectedTotalMarks || expectedTotalMarks <= 0) return subparts;
  const target = Math.max(1, Math.round(expectedTotalMarks || 1));

  // If internal choice is specified (attemptCount of N items), preserve integer marks if match
  if (typeof attemptCount === "number" && attemptCount > 0 && attemptCount <= subparts.length) {
    const allEqual = subparts.every((sp) => sp.marks === subparts[0]?.marks);
    if (allEqual && subparts[0] && subparts[0].marks * attemptCount === target) {
      return subparts;
    }
  }

  let valid = [...subparts];

  const currentTotal = subpartsTotalMarks(valid);
  if (sameMarks(currentTotal, target)) return valid;

  // Fewer marks than parts to answer (e.g. four blanks in a 2-mark question): whole marks cannot fit, share fractions.
  const answered = typeof attemptCount === "number" && attemptCount > 0 && attemptCount <= valid.length ? attemptCount : valid.length;
  if (target < answered) {
    if (answered < valid.length) {
      const each = equalPartMarks(target, answered);
      if (each) return valid.map((sp) => ({ ...sp, marks: each }));
    } else {
      const shares = splitMarksEvenly(target, valid.length);
      if (shares) return valid.map((sp, idx) => ({ ...sp, marks: shares[idx] }));
    }
  }

  if (currentTotal <= 0) {
    const base = Math.floor(target / valid.length);
    const rem = target % valid.length;
    return valid.map((sp, idx) => ({
      ...sp,
      marks: Math.max(1, base + (idx === valid.length - 1 ? rem : 0)),
    }));
  }

  const diff = target - currentTotal;
  if (diff > 0) {
    const lastIdx = valid.length - 1;
    return valid.map((sp, idx) =>
      idx === lastIdx ? { ...sp, marks: sp.marks + diff } : { ...sp, marks: Math.max(1, sp.marks) },
    );
  } else {
    let toReduce = -diff;
    const result = valid.map((sp) => ({ ...sp, marks: Math.max(1, sp.marks) }));
    for (let i = result.length - 1; i >= 0 && toReduce > 0; i--) {
      const reducible = result[i].marks - 1;
      const dec = Math.min(toReduce, reducible);
      result[i].marks -= dec;
      toReduce -= dec;
    }
    return result;
  }
}

export type UserData = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  /** Classes a teacher looks after; subject "" = Class In-charge. Empty for Admin and Exam Cell. */
  assignments: { className: string; subject: string }[];
  _count?: { questions: number; papers: number };
};

export type AuditLogEntry = {
  id: string;
  userId: string | null;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detailsJson: string;
  createdAt: string;
  /** Super Admin only. */
  ipAddress?: string;
  userAgent?: string;
  category?: string;
};

export type ExamTimetableItem = {
  id: string;
  title: string;
  academicSession: string;
  examType: string;
  className: string;
  subject: string;
  subjectCode: string;
  examDate: string;
  startTime: string;
  endTime: string;
  sessionSlot: SessionSlot;
  roomLocations: string;
  paperId: string | null;
  blueprintId: string | null;
  status: TimetableStatus;
  submissionDeadline: string;
  printingDeadline: string;
  createdAt: string;
  updatedAt: string;
};

export type ClassSectionInput = {
  name: string; // e.g. "10-A"
  count: number; // student count
};

export type SetDistribution = {
  set: string; // "Set 1" or "Set A"
  count: number;
};

export type PrintRunCalculationDto = {
  id?: string;
  paperId?: string | null;
  paperTitle: string;
  academicSession: string;
  className: string;
  subject: string;
  layout: string;
  pageCount: number;
  totalStudents: number;
  sections: ClassSectionInput[];
  sets: SetDistribution[];
  wastagePercent: number;
  totalSheetsRequired: number;
  totalReamsRequired: number;
  answerBookletCount: number;
  notes?: string;
  createdAt?: string;
};


