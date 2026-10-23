import type { QuestionDto } from "./dto";
import type { PaperImplication, PaperStatus } from "./blueprint";
import type { MarksStyle, NumberingStyle, PrintDensity, UserRole, TimetableStatus, SessionSlot } from "./constants";

export type { QuestionDto, PaperImplication };
export type { MarksStyle, NumberingStyle, PrintDensity, UserRole, TimetableStatus, SessionSlot };

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
};

export type Blueprint = {
  id: string;
  name: string;
  bookId: string;
  academicSession?: string;
  examType: string;
  durationMin: number;
  subjectCode: string;
  book: { id: string; title: string; subject: string; className: string };
  chapters: { chapterId: string; marks: number; chapter: { id: string; number: number; title: string } }[];
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
  generalInstructions: string;
  status: "DRAFT" | "FINAL";
  blueprint: Blueprint;
  items: PaperItem[];
  progress: PaperStatus;
  implications?: PaperImplication[];

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
  blueprint: { name: string; examType: string; book: { title: string; subject: string; className: string } };
  filled: number;
  needed: number;
  createdById?: string;
  academicSession?: string;
  paperSet?: string;
  subjectCode?: string;
  printDensity?: PrintDensity;
  targetPages?: number | null;
};

export function parseSubparts(json?: string | null): SubPart[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function subpartsTotalMarks(
  subparts?: (Pick<SubPart, "marks"> | null | undefined)[] | null,
): number {
  if (!subparts || !Array.isArray(subparts)) return 0;
  return subparts.reduce((sum, sp) => sum + (sp && Number.isFinite(sp.marks) ? sp.marks : 0), 0);
}

export const sumSubPartMarks = subpartsTotalMarks;

export function validateSubPartsSum(
  subparts: (Pick<SubPart, "marks"> | null | undefined)[] | null | undefined,
  expectedTotalMarks: number,
): boolean {
  if (!subparts || subparts.length === 0) return true;
  return subpartsTotalMarks(subparts) === expectedTotalMarks;
}

export type UserData = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  active: boolean;
  createdAt: string;
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


