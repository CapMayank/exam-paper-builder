import { z } from "zod";
import {
  DEFAULT_ACADEMIC_SESSION,
  DEFAULT_MARKS_STYLE,
  DEFAULT_NUMBERING_STYLE,
  DEFAULT_PRINT_DENSITY,
  DIFFICULTIES,
  EXAM_TYPES,
  LAYOUTS,
  MARKS_STYLES,
  MAX_OPTIONS,
  MIN_OPTIONS,
  NUMBERING_STYLES,
  PRINT_DENSITIES,
  QUESTION_TYPES,
  USER_ROLES,
  TIMETABLE_STATUSES,
  SESSION_SLOTS,
} from "./constants";

const text = (max = 200) => z.string().trim().min(1, "required").max(max);

export const registerSchema = z.object({
  name: text(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "at least 8 characters").max(100),
  schoolCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const userCreateSchema = z.object({
  name: text(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6, "at least 6 characters").max(100),
  role: z.enum(USER_ROLES).default("TEACHER"),
  department: z.string().trim().max(100).default(""),
});

export const userUpdateSchema = z.object({
  name: text(80).optional(),
  role: z.enum(USER_ROLES).optional(),
  department: z.string().trim().max(100).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).max(100).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters").max(100),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export const userProfileUpdateSchema = z.object({
  name: text(80).optional(),
  department: z.string().trim().max(100).optional(),
});


export const sectionDetailSchema = z.object({
  name: z.string().trim().min(1).max(20),
  studentCount: z.number().int().min(1).max(500).default(40),
});

export const sectionItemSchema = z.union([
  z.string().trim().min(1).max(20),
  sectionDetailSchema,
]);

export const academicClassSchema = z.object({
  name: text(40),
  displayOrder: z.number().int().min(-10).max(100).optional(),
  stream: z.string().trim().max(40).optional().default(""),
  academicSession: z.string().trim().max(40).optional().default(DEFAULT_ACADEMIC_SESSION),
  sections: z.array(sectionItemSchema).optional().default(["A"]),
  subjects: z
    .array(
      z.object({
        name: text(80),
        code: z.string().trim().max(40).optional().default(""),
      })
    )
    .optional(),
});

export const classSubjectSchema = z.object({
  name: text(80),
  code: z.string().trim().max(40).optional().default(""),
});

export const patchClassSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  stream: z.string().trim().max(40).optional(),
  sections: z.array(sectionItemSchema).optional(),
  addSubject: classSubjectSchema.optional(),
  updateSubject: z
    .object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(80),
      code: z.string().trim().max(40).optional().default(""),
    })
    .optional(),
  removeSubjectId: z.string().min(1).optional(),
});

export const bookSchema = z.object({
  title: text(),
  subject: text(80),
  className: text(40),
  academicSession: z.string().trim().max(40).optional().default(DEFAULT_ACADEMIC_SESSION),
});
export const chapterSchema = z.object({ number: z.number().int().min(1).max(999), title: text() });

export const subPartSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Subpart label required (e.g. (a), (i))").max(20),
  text: z.string().trim().min(1, "Subpart text required").max(3000),
  marks: z.number().int().min(1, "Marks must be at least 1").max(50),
  answer: z.string().trim().max(3000).optional().default(""),
  options: z.array(z.string().trim().min(1).max(500)).max(MAX_OPTIONS).optional().default([]),
});

export const questionSchema = z
  .object({
    bookId: z.string().min(1),
    chapterId: z.string().min(1),
    type: z.enum(QUESTION_TYPES),
    text: text(5000),
    options: z.array(z.string().max(20000)).default([]),
    subparts: z.array(subPartSchema).optional().default([]),
    answer: z.string().max(5000).default(""),
    difficulty: z.enum(DIFFICULTIES).default("MEDIUM"),
    imagePath: z
      .string()
      .regex(/^[a-f0-9-]{36}\.(png|jpg|jpeg|webp|gif|svg)$/)
      .nullable()
      .default(null),
    spaceMm: z.number().int().min(0).max(250).default(0),
    showGrid: z.boolean().default(false),
  })
  .superRefine((q, ctx) => {
    if (q.type === "MCQ" || q.type === "ASSERTION_REASON") {
      if (q.options.length < MIN_OPTIONS) {
        ctx.addIssue({ code: "custom", path: ["options"], message: `MCQ needs at least ${MIN_OPTIONS} options` });
      }
      if (q.options.length > MAX_OPTIONS) {
        ctx.addIssue({ code: "custom", path: ["options"], message: `MCQ cannot have more than ${MAX_OPTIONS} options` });
      }
    }
    if (q.type === "MATCH_COLUMN" && q.options.length < MIN_OPTIONS) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: `Match the column needs at least ${MIN_OPTIONS} matching pairs`,
      });
    }
  });

export const questionPatchSchema = z.object({
  text: text(5000).optional(),
  options: z.array(z.string().max(20000)).optional(),
  subparts: z.array(subPartSchema).optional(),
  answer: z.string().max(5000).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  spaceMm: z.number().int().min(0).max(250).optional(),
  showGrid: z.boolean().optional(),
});

export const blueprintSchema = z.object({
  name: text(),
  bookId: z.string().min(1),
  academicSession: z.string().trim().max(40).optional().default(DEFAULT_ACADEMIC_SESSION),
  examType: z.enum(EXAM_TYPES),
  durationMin: z.number().int().min(5).max(600),
  subjectCode: z.string().trim().max(40).optional().default(""),
  chapters: z.array(z.object({ chapterId: z.string().min(1), marks: z.number().int().min(0).max(1000) })),
  sections: z
    .array(
      z.object({
        id: z.string().optional(),
        title: text(100),
        instructions: z.string().trim().max(500).default(""),
        type: z.enum(QUESTION_TYPES),
        count: z.number().int().min(1).max(100),
        marksEach: z.number().int().min(1).max(100),
      }),
    )
    .max(50),
});

export const paperCreateSchema = z.object({
  title: text(),
  blueprintId: z.string().min(1),
  examType: z.enum(EXAM_TYPES).optional(),
  layout: z.enum(LAYOUTS),
  schoolName: text(120),
  examDate: z.string().max(40).default(""),
  paperSet: z.string().max(40).default(""),
  subjectCode: z.string().max(40).default(""),
  generalInstructions: z.string().max(5000).default(""),
  academicSession: z.string().max(40).default(DEFAULT_ACADEMIC_SESSION),
  schoolLogo: z.string().nullable().optional().default(null),
  logoPath: z.string().nullable().optional().default(null),
  printDensity: z.enum(PRINT_DENSITIES).default(DEFAULT_PRINT_DENSITY),
  twoColumn: z.boolean().default(false),
  targetPages: z.number().int().min(1).max(100).nullable().optional().default(null),
  numberingStyle: z.enum(NUMBERING_STYLES).default(DEFAULT_NUMBERING_STYLE),
  marksStyle: z.enum(MARKS_STYLES).default(DEFAULT_MARKS_STYLE),
  showCandidateDetails: z.boolean().default(true),
  showSignatures: z.boolean().default(false),
  securityWatermark: z.boolean().default(false),
  watermarkText: z.string().max(100).default(""),
});

export const paperUpdateSchema = z
  .object({
    title: text(),
    examType: z.enum(EXAM_TYPES),
    layout: z.enum(LAYOUTS),
    schoolName: text(120),
    examDate: z.string().max(40),
    paperSet: z.string().max(40),
    subjectCode: z.string().max(40),
    generalInstructions: z.string().max(5000),
    status: z.enum(["DRAFT", "FINAL"]),
    academicSession: z.string().max(40),
    schoolLogo: z.string().nullable(),
    logoPath: z.string().nullable(),
    printDensity: z.enum(PRINT_DENSITIES),
    twoColumn: z.boolean(),
    targetPages: z.number().int().min(1).max(100).nullable(),
    numberingStyle: z.enum(NUMBERING_STYLES),
    marksStyle: z.enum(MARKS_STYLES),
    showCandidateDetails: z.boolean(),
    showSignatures: z.boolean(),
    securityWatermark: z.boolean(),
    watermarkText: z.string().max(100),
  })
  .partial();

export const snapshotCreateSchema = z.object({
  name: z.string().trim().min(1, "Snapshot name is required").max(100),
});

export const snapshotPayloadSchema = z.object({
  paperId: z.string().min(1),
  title: z.string().min(1),
  layout: z.enum(LAYOUTS),
  schoolName: z.string().min(1),
  examDate: z.string(),
  paperSet: z.string(),
  subjectCode: z.string(),
  generalInstructions: z.string(),
  academicSession: z.string(),
  logoPath: z.string().nullable().optional(),
  schoolLogo: z.string().nullable().optional(),
  printDensity: z.enum(PRINT_DENSITIES),
  twoColumn: z.boolean(),
  targetPages: z.number().int().min(1).max(100).nullable().optional(),
  numberingStyle: z.enum(NUMBERING_STYLES),
  marksStyle: z.enum(MARKS_STYLES),
  showCandidateDetails: z.boolean(),
  showSignatures: z.boolean(),
  items: z.array(
    z.object({
      sectionId: z.string().min(1),
      position: z.number().int().min(0),
      questionId: z.string().min(1),
      orQuestionId: z.string().nullable().optional(),
    }),
  ),
  timestamp: z.string(),
});

export const addItemSchema = z.object({ sectionId: z.string().min(1), questionId: z.string().min(1) });
export const moveItemSchema = z.object({ direction: z.enum(["up", "down"]) });
export const replaceItemSchema = z.object({ replaceWithQuestionId: z.string().min(1) });
export const editPaperItemSchema = z.object({
  mode: z.enum(["UPDATE_MASTER", "FORK_COPY"]),
  question: questionSchema,
});

export const timetableEntrySchema = z.object({
  title: text(120),
  academicSession: z.string().trim().max(40).default(DEFAULT_ACADEMIC_SESSION),
  examType: z.enum(EXAM_TYPES).default("ANNUAL"),
  className: text(40),
  subject: text(80),
  subjectCode: z.string().trim().max(40).default(""),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  sessionSlot: z.enum(SESSION_SLOTS).default("MORNING"),
  roomLocations: z.string().trim().max(200).default(""),
  paperId: z.string().nullable().optional().default(null),
  blueprintId: z.string().nullable().optional().default(null),
  status: z.enum(TIMETABLE_STATUSES).default("SCHEDULED"),
  submissionDeadline: z.string().trim().max(40).default(""),
  printingDeadline: z.string().trim().max(40).default(""),
});

export const timetableUpdateSchema = timetableEntrySchema.partial();

export const classSectionInputSchema = z.object({
  name: z.string().trim().min(1).max(50),
  count: z.number().int().min(1).max(500),
});

export const setDistributionSchema = z.object({
  set: z.string().trim().min(1).max(50),
  count: z.number().int().min(0).max(5000),
});

export const printRunCalculationSchema = z.object({
  paperId: z.string().nullable().optional(),
  paperTitle: text(120),
  academicSession: z.string().trim().max(40).default(DEFAULT_ACADEMIC_SESSION),
  className: text(40),
  subject: text(80),
  layout: z.enum(LAYOUTS).default("BOOKLET"),
  pageCount: z.number().int().min(1).max(100).default(4),
  totalStudents: z.number().int().min(1).max(10000),
  sections: z.array(classSectionInputSchema).min(1),
  sets: z.array(setDistributionSchema).min(1),
  wastagePercent: z.number().min(0).max(50).default(3.0),
  answerBookletCount: z.number().int().min(0).max(10000).default(0),
  notes: z.string().trim().max(500).default(""),
});

export const syllabusImportSchema = z.object({
  format: z.enum(["preset", "text", "csv", "json", "ai_scan", "custom"]),
  content: z.string().optional().default(""),
  targetBookId: z.string().nullable().optional(),
  defaults: z
    .object({
      defaultTitle: z.string().optional(),
      defaultClass: z.string().optional(),
      defaultSubject: z.string().optional(),
      academicSession: z.string().optional(),
    })
    .optional(),
  customBooks: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        className: z.string().trim().min(1),
        subject: z.string().trim().min(1),
        academicSession: z.string().optional(),
        chapters: z.array(
          z.object({
            number: z.number().int().min(1),
            title: z.string().trim().min(1),
          })
        ),
      })
    )
    .optional(),
  dryRun: z.boolean().optional().default(false),
  upsert: z.boolean().optional().default(true),
});

export const combineBooksSchema = z.object({
  bookIds: z.array(z.string().min(1)).min(2, "Select at least 2 books to combine"),
  compositeTitle: text(120),
  className: text(40),
  subject: text(80),
  academicSession: z.string().trim().max(40).optional().default(DEFAULT_ACADEMIC_SESSION),
  keepOriginals: z.boolean().default(true),
});

export const rolloverBlueprintsSchema = z.object({
  sourceBlueprintIds: z.array(z.string().min(1)).min(1, "Select at least one blueprint to roll over"),
  targetAcademicSession: z.string().trim().min(1, "Target academic session is required"),
  namePrefix: z.string().optional().default(""),
  targetBookIdMap: z.record(z.string(), z.string()).optional(),
});

export const rolloverBookSchema = z.object({
  sourceBookId: z.string().min(1, "Source book required"),
  targetAcademicSession: z.string().trim().min(1, "Target session required"),
  title: z.string().trim().min(1, "Book title required"),
  chapters: z.array(z.object({ number: z.number().int().min(1), title: z.string().trim().min(1) })).optional(),
  selectedChapterIds: z.array(z.string()).optional(),
  includeQuestions: z.boolean().optional().default(false),
});

export const unifiedRolloverSchema = z.object({
  sourceSession: z.string().trim().min(1, "Source session required"),
  targetSession: z.string().trim().min(1, "Target session required"),
  includeClasses: z.boolean().default(true),
  includeBooks: z.boolean().default(true),
  includeBlueprints: z.boolean().default(true),
});


