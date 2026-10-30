import type { GenerationContract } from "./curriculumContract";
import type { QuestionValidationIssue } from "./questionValidator";

export interface GenerationJobTrace {
  jobId: string;
  contractId: string;
  timestamp: string;
  board: string;
  className: string;
  academicSession: string;
  syllabusVersion: string;
  canonicalSubject: string;
  subjectCode: string;
  sectionTitle: string;
  questionType: string;
  marksEach: number;
  difficulty: string;
  language: string;
  slotAssignments: Array<{
    slotIndex: number;
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    marks: number;
  }>;
  promptTemplateVersion: string;
  modelUsed: string;
  isOfflineCurriculumMode: boolean;
  retryCount: number;
  acceptedCount: number;
  rejectedCount: number;
  validationIssues: QuestionValidationIssue[];
  finalStatus: "ACCEPTED" | "REJECTED" | "PARTIAL";
}

const recentTraces: GenerationJobTrace[] = [];
const MAX_RECENT_TRACES = 100;

export function createGenerationJobTrace(params: {
  contract: GenerationContract;
  modelUsed: string;
  isOfflineCurriculumMode: boolean;
  retryCount: number;
  acceptedCount: number;
  rejectedCount: number;
  validationIssues: QuestionValidationIssue[];
}): GenerationJobTrace {
  const { contract } = params;
  const finalStatus: "ACCEPTED" | "REJECTED" | "PARTIAL" =
    params.rejectedCount === 0 && params.acceptedCount > 0
      ? "ACCEPTED"
      : params.acceptedCount === 0
      ? "REJECTED"
      : "PARTIAL";

  const trace: GenerationJobTrace = {
    jobId: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    contractId: contract.contractId,
    timestamp: new Date().toISOString(),
    board: contract.board,
    className: contract.className,
    academicSession: contract.academicSession,
    syllabusVersion: contract.syllabusVersion,
    canonicalSubject: contract.canonicalSubject,
    subjectCode: contract.subjectCode,
    sectionTitle: contract.sectionTitle,
    questionType: contract.questionType,
    marksEach: contract.marksEach,
    difficulty: contract.difficulty,
    language: contract.language,
    slotAssignments: contract.slots.map((s) => ({
      slotIndex: s.slotIndex,
      chapterId: s.chapterId,
      chapterNumber: s.chapterNumber,
      chapterTitle: s.chapterTitle,
      marks: s.marks,
    })),
    promptTemplateVersion: "v2.0-curriculum-contract-strict",
    modelUsed: params.modelUsed,
    isOfflineCurriculumMode: params.isOfflineCurriculumMode,
    retryCount: params.retryCount,
    acceptedCount: params.acceptedCount,
    rejectedCount: params.rejectedCount,
    validationIssues: params.validationIssues,
    finalStatus,
  };

  recentTraces.unshift(trace);
  if (recentTraces.length > MAX_RECENT_TRACES) {
    recentTraces.length = MAX_RECENT_TRACES;
  }

  return trace;
}

export function getRecentGenerationTraces(): GenerationJobTrace[] {
  return [...recentTraces];
}
