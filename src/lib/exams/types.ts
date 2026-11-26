/** Shapes shared by the exams API and pages. */

export type SlotStatus = "NO_BLUEPRINT" | "NO_PAPER" | "DRAFT" | "FINAL" | "PRINTED";
export type SlotWarning = "PAPER_CHANGED_AFTER_PRINT" | "DATE_CHANGED_AFTER_PRINT";

export type SlotPaper = { id: string; title: string; status: "DRAFT" | "FINAL"; updatedAt: string };

export type SlotView = {
  id: string;
  blockId: string;
  className: string;
  subject: string;
  examDate: string;
  paper: SlotPaper | null;
  hasBlueprint: boolean;
  printedAt: string | null;
  printedByName: string | null;
  printedPaperAt: string | null;
  dateChangedAfterPrint: boolean;
  status: SlotStatus;
  warnings: SlotWarning[];
};

export type BlockView = { id: string; title: string; position: number; timeText: string; dates: string[]; classes: string[] };

export type ExamStatus = "DRAFT" | "CIRCULATED";
export type SignatureMode = "SIGNED" | "BLANK";

export type ExamView = {
  id: string;
  name: string;
  examType: string;
  academicSession: string;
  status: ExamStatus;
  signatureMode: SignatureMode;
  showInstructions: boolean;
  /** One instruction per line; empty until someone writes them. */
  instructions: string;
  blocks: BlockView[];
  slots: SlotView[];
};

export type DayRollup = { date: string; total: number; printed: number; finalNotPrinted: number; notReady: number; urgent: boolean };

export type ExamSummary = {
  total: number;
  ready: number;
  printed: number;
  firstDate: string | null;
  lastDate: string | null;
  daysToFirst: number | null;
  isPast: boolean;
};

export type ExamListItem = Pick<ExamView, "id" | "name" | "examType" | "academicSession" | "status"> & { summary: ExamSummary };
