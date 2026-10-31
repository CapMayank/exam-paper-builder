export type PaperLanguage = "en" | "hi" | "sa" | "bilingual";

export interface PaperLocaleHeader {
  timeAllowed: string;
  timeFormat: (min: number) => string;
  maxMarks: string;
  totalQuestions: string;
  subjectCode: string;
  set: string;
  studentName: string;
  rollNo: string;
  classAndSec: string;
  invigilatorSign: string;
  date: string;
  classLabel: string;
  subjectLabel: string;
  generalInstructionsLabel: string;
}

export interface PaperLocaleSection {
  formatSectionHeader: (letter: string, customTitle?: string | null) => string;
  formatGroupSummary: (
    count: number,
    marks: number,
    context?: {
      displayedCount?: number;
      rawItemCount?: number;
      type?: string;
    }
  ) => string;
  formatTypeFormula: (count: number, marksEach: number, type?: string) => string;
}

export interface PaperLocaleFooter {
  pageOf: (current: number, total: number) => string;
  pto: string;
  endOfPaper: string;
}

export interface PaperLocaleDictionary {
  language: PaperLanguage;
  displayName: string;
  header: PaperLocaleHeader;
  section: PaperLocaleSection;
  questionTypes: Record<string, string>;
  sharedInstructions: Record<string, string>;
  choiceSeparator: string;
  marksLabel: (marks: number) => string;
  formulaLabel: (count: number, marksEach: number) => string;
  columnLabels: { colA: string; colB: string };
  footer: PaperLocaleFooter;
}
