import { PrismaClient, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import {
  MPBSE_BLUEPRINT_TEMPLATES,
  BlueprintTemplate,
  ChoicePolicy,
} from "@/lib/curriculumTemplates";
import {
  SOURCE_DOCS_DATA,
  CLASSES_DATA,
  STREAMS_CONFIG,
  SUBJECTS_SEED,
} from "@/lib/curriculumData";

function toJson<T>(data: T): Prisma.InputJsonValue {
  return data as unknown as Prisma.InputJsonValue;
}

export function generateEnglish16Q75MSections() {
  return [
    {
      position: 1,
      title: "Section A: Reading Skills (Q.1 & Q.2 Unseen Passages)",
      instructions: "Read the passages carefully and answer the objective questions given below.",
      type: "MCQ",
      count: 10,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: {
        policyType: "NO_CHOICE",
        totalProvided: 10,
        totalRequired: 10,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Two unseen passages with 5 MCQs each",
      },
    },
    {
      position: 2,
      title: "Section B: Writing Skills - Q.3 Note Making",
      instructions: "Read the passage carefully, make notes using abbreviations where necessary, and supply a suitable title.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: {
        policyType: "NO_CHOICE",
        totalProvided: 1,
        totalRequired: 1,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Title (1m), Notes & Indenting (2m), Key/Glossary (1m)",
      },
    },
    {
      position: 3,
      title: "Section B: Writing Skills - Q.4 Letter Writing",
      instructions: "Write a Formal application OR Informal letter as instructed.",
      type: "LONG_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "FULL_OR_ALTERNATIVE",
        totalProvided: 2,
        totalRequired: 1,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Full internal choice between Formal and Informal letters",
      },
    },
    {
      position: 4,
      title: "Section B: Writing Skills - Q.5 Long Composition",
      instructions: "Write an essay / paragraph in about 150 words on any one topic.",
      type: "LONG_ANSWER",
      count: 1,
      marksEach: 5,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "FULL_OR_ALTERNATIVE",
        totalProvided: 4,
        totalRequired: 1,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Choice of 4-5 contemporary essay topics",
      },
    },
    {
      position: 5,
      title: "Section B: Writing Skills - Q.6 Picture Guided Composition",
      instructions: "On the basis of the picture given below, write a short paragraph in about 75 words.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 3,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: {
        policyType: "NO_CHOICE",
        totalProvided: 1,
        totalRequired: 1,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Single picture prompt description",
      },
    },
    {
      position: 6,
      title: "Section C: Grammar - Q.7 Fill in the Blanks",
      instructions: "Fill in the blanks choosing the correct alternative given in the brackets (Any 5).",
      type: "FILL_IN_BLANKS",
      count: 5,
      marksEach: 1,
      orChoiceMode: "ATTEMPT_K_OF_N",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "ATTEMPT_K_OF_N",
        totalProvided: 6,
        totalRequired: 5,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Attempt any 5 out of 6 grammar items",
      },
    },
    {
      position: 7,
      title: "Section C: Grammar - Q.8 Do As Directed",
      instructions: "Do as directed (Any 5).",
      type: "VERY_SHORT_ANSWER",
      count: 5,
      marksEach: 1,
      orChoiceMode: "ATTEMPT_K_OF_N",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "ATTEMPT_K_OF_N",
        totalProvided: 6,
        totalRequired: 5,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Attempt any 5 out of 6 sentence transformation items",
      },
    },
    {
      position: 8,
      title: "Section D: Textbooks - Q.9 & Q.10 Textual MCQs & Extracts",
      instructions: "Choose the correct options from prescribed textual extracts and poems.",
      type: "MCQ",
      count: 10,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: {
        policyType: "NO_CHOICE",
        totalProvided: 10,
        totalRequired: 10,
        poolScope: "SAME_UNIT",
        rationale: "4 textual MCQs + 3 prose extract MCQs + 3 poetry extract MCQs",
      },
    },
    {
      position: 9,
      title: "Section D: Textbooks - Q.11 to Q.13 Short Answer Questions",
      instructions: "Answer the questions in about 30 words each from Beehive Prose, Poetry, and Moments.",
      type: "VERY_SHORT_ANSWER",
      count: 10,
      marksEach: 2,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: {
        policyType: "NO_CHOICE",
        totalProvided: 10,
        totalRequired: 10,
        poolScope: "SAME_UNIT",
        rationale: "Circular 465: All 2-mark short answer questions are compulsory",
      },
    },
    {
      position: 10,
      title: "Section D: Textbooks - Q.14 to Q.16 Long Answer Questions",
      instructions: "Answer the questions in about 75 words each with internal choice.",
      type: "SHORT_ANSWER",
      count: 3,
      marksEach: 3,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "FULL_OR_ALTERNATIVE",
        totalProvided: 2,
        totalRequired: 1,
        poolScope: "SAME_UNIT",
        rationale: "Circular 465: Mandatory 100% internal choice in 3-mark questions",
      },
    },
  ];
}

export function generateEnglish15Q80MSections() {
  return [
    {
      position: 1,
      title: "Section A: Reading Skills - Q.1 Unseen Comprehension Passage",
      instructions: "Read the passage carefully and answer the objective questions given below.",
      type: "MCQ",
      count: 10,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: {
        policyType: "NO_CHOICE",
        totalProvided: 10,
        totalRequired: 10,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Unseen passage testing comprehension and vocabulary",
      },
    },
    {
      position: 2,
      title: "Section A: Reading Skills - Q.2 Note Making",
      instructions: "Read the passage carefully, make structured notes and provide a suitable title.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: {
        policyType: "NO_CHOICE",
        totalProvided: 1,
        totalRequired: 1,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Title 1m + Numbering/Indenting 1m + Abbreviations 1m + Notes 1m",
      },
    },
    {
      position: 3,
      title: "Section B: Writing Skills - Q.3 Notice / Advertisement / Poster",
      instructions: "Draft a notice, advertisement, or poster in about 50 words.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "FULL_OR_ALTERNATIVE",
        totalProvided: 2,
        totalRequired: 1,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Internal choice between notice, poster, or ad",
      },
    },
    {
      position: 4,
      title: "Section B: Writing Skills - Q.4 Letter Writing",
      instructions: "Write a Formal or Informal letter in about 120 words.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "FULL_OR_ALTERNATIVE",
        totalProvided: 2,
        totalRequired: 1,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Choice between formal and informal letter",
      },
    },
    {
      position: 5,
      title: "Section B: Writing Skills - Q.5 Long Composition",
      instructions: "Write an article, report, or speech in about 120-150 words.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "FULL_OR_ALTERNATIVE",
        totalProvided: 2,
        totalRequired: 1,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Choice between article, report, or speech",
      },
    },
    {
      position: 6,
      title: "Section C: Grammar - Q.6 Sentence Corrections / Gap Filling",
      instructions: "Fill in the blanks with correct alternatives (Any 5).",
      type: "FILL_IN_BLANKS",
      count: 5,
      marksEach: 1,
      orChoiceMode: "ATTEMPT_K_OF_N",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "ATTEMPT_K_OF_N",
        totalProvided: 6,
        totalRequired: 5,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Attempt any 5 out of 6 grammar items",
      },
    },
    {
      position: 7,
      title: "Section C: Grammar - Q.7 Do As Directed",
      instructions: "Transform sentences as directed (Any 5).",
      type: "VERY_SHORT_ANSWER",
      count: 5,
      marksEach: 1,
      orChoiceMode: "ATTEMPT_K_OF_N",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "ATTEMPT_K_OF_N",
        totalProvided: 6,
        totalRequired: 5,
        poolScope: "ANY_INCLUDED_CHAPTER",
        rationale: "Attempt any 5 out of 6 sentence transformations",
      },
    },
    {
      position: 8,
      title: "Section D: Textbooks - Q.8 & Q.9 Extracts from Prescribed Texts",
      instructions: "Read the extracts and choose the correct option.",
      type: "MCQ",
      count: 12,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: {
        policyType: "NO_CHOICE",
        totalProvided: 12,
        totalRequired: 12,
        poolScope: "SAME_UNIT",
        rationale: "Prose extract (5m) + Poetry extract (3m) + Supplementary extract (4m)",
      },
    },
    {
      position: 9,
      title: "Section D: Textbooks - Q.10 to Q.12 Short Answer Questions",
      instructions: "Answer the questions in about 30 words each. All questions are compulsory.",
      type: "VERY_SHORT_ANSWER",
      count: 10,
      marksEach: 2,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: {
        policyType: "NO_CHOICE",
        totalProvided: 10,
        totalRequired: 10,
        poolScope: "SAME_UNIT",
        rationale: "Circular 465: All 2-mark short answer questions are compulsory",
      },
    },
    {
      position: 10,
      title: "Section D: Textbooks - Q.13 to Q.15 Long Answer Questions",
      instructions: "Answer the questions in about 75-100 words each with internal choice.",
      type: "SHORT_ANSWER",
      count: 4,
      marksEach: 3,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: {
        policyType: "FULL_OR_ALTERNATIVE",
        totalProvided: 2,
        totalRequired: 1,
        poolScope: "SAME_UNIT",
        rationale: "Circular 465: Mandatory 100% internal choice in 3-mark questions",
      },
    },
  ];
}

/**
 * Converts rich BlueprintTemplateSectionGroup[] into flat sectionsJson array
 * strictly adhering to MPBSE Circular 465 rules and subject-specific heading languages.
 */
export function templateSectionsToSectionsJson(template: BlueprintTemplate) {
  if (template.archetype === "ENGLISH_16Q_75M") {
    return generateEnglish16Q75MSections();
  }
  if (template.archetype === "ENGLISH_15Q_80M") {
    return generateEnglish15Q80MSections();
  }

  let position = 1;
  const sections: any[] = [];

  for (const group of template.sections) {
    for (const qt of group.questionTypes) {
      let orChoiceMode = "NO_CHOICE";
      let orAlternativeCount = 0;

      if (
        qt.orChoiceMode === "REQUIRED" ||
        qt.choicePolicy?.policyType === "FULL_OR_ALTERNATIVE"
      ) {
        orChoiceMode = "FULL_OR_ALTERNATIVE";
        orAlternativeCount = qt.orAlternativeCount || 1;
      } else if (qt.choicePolicy?.policyType === "ATTEMPT_K_OF_N") {
        orChoiceMode = "ATTEMPT_K_OF_N";
        orAlternativeCount = qt.orAlternativeCount || 1;
      } else if (qt.marksEach === 3 || qt.marksEach === 4) {
        if (
          template.archetype.startsWith("STANDARD_") ||
          template.archetype.startsWith("SCIENCE_")
        ) {
          orChoiceMode = "FULL_OR_ALTERNATIVE";
          orAlternativeCount = 1;
        }
      }

      let choicePolicy: ChoicePolicy | undefined = qt.choicePolicy;
      if (!choicePolicy) {
        if (orChoiceMode === "FULL_OR_ALTERNATIVE") {
          choicePolicy = {
            policyType: "FULL_OR_ALTERNATIVE",
            totalProvided: 2,
            totalRequired: 1,
            poolScope: "SAME_UNIT",
            rationale:
              "Circular 465/2026: Mandatory 100% internal choice in 3m/4m questions from same unit",
          };
        } else {
          choicePolicy = {
            policyType: "NO_CHOICE",
            totalProvided: qt.count,
            totalRequired: qt.count,
            poolScope: "ANY_INCLUDED_CHAPTER",
            rationale:
              qt.marksEach === 2
                ? "Circular 465/2026: Abolition of internal choice in 2-mark questions"
                : "Circular 465: Objective questions are compulsory",
          };
        }
      }

      // Circular 465 mandatory check for 2-mark questions: strictly NO_CHOICE
      if (qt.marksEach === 2) {
        orChoiceMode = "NO_CHOICE";
        orAlternativeCount = 0;
        choicePolicy = {
          policyType: "NO_CHOICE",
          totalProvided: qt.count,
          totalRequired: qt.count,
          poolScope: "ANY_INCLUDED_CHAPTER",
          rationale: "Circular 465/2026: Abolition of internal choice in 2-mark questions",
        };
      }

      // Circular 465 mandatory check for 3m/4m in Standard/Science: strictly FULL_OR_ALTERNATIVE from same unit
      if (
        (qt.marksEach === 3 || qt.marksEach === 4) &&
        (template.archetype.startsWith("STANDARD_") ||
          template.archetype.startsWith("SCIENCE_"))
      ) {
        orChoiceMode = "FULL_OR_ALTERNATIVE";
        orAlternativeCount = 1;
        choicePolicy = {
          policyType: "FULL_OR_ALTERNATIVE",
          totalProvided: 2,
          totalRequired: 1,
          poolScope: "SAME_UNIT",
          rationale:
            "Circular 465/2026: Mandatory 100% internal choice in 3-mark/4-mark questions from same unit",
        };
      }

      sections.push({
        position: position++,
        title: group.title,
        instructions: group.instructions || "",
        type: qt.type,
        count: qt.count,
        marksEach: qt.marksEach,
        orChoiceMode,
        orAlternativeCount,
        choicePolicy,
      });
    }
  }
  return sections;
}

/**
 * Updates the 27 system CurriculumBlueprintTemplate records with language-aware headings.
 * Does NOT touch user-customized Blueprint records.
 */
export async function syncBlueprintTemplates(client?: PrismaClient): Promise<number> {
  const prisma = client || defaultPrisma;
  let updatedCount = 0;

  for (const t of MPBSE_BLUEPRINT_TEMPLATES) {
    const sectionsJson = templateSectionsToSectionsJson(t);
    const existing = await prisma.curriculumBlueprintTemplate.findUnique({
      where: { templateCode: t.templateCode },
    });

    if (existing) {
      await prisma.curriculumBlueprintTemplate.update({
        where: { templateCode: t.templateCode },
        data: {
          title: t.title,
          durationMin: t.durationMin,
          totalMarks: t.totalMarks,
          archetype: t.archetype,
          sectionsJson: toJson(sectionsJson),
        },
      });
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Full idempotent curriculum seed: Board, Documents, Classes, Streams, Subjects, Textbooks,
 * Chapters, Topics, Marks Schemes, and CurriculumBlueprintTemplates.
 */
export async function seedCurriculumData(client?: PrismaClient): Promise<{
  subjectsCount: number;
  textbooksCount: number;
  chaptersCount: number;
  templatesCount: number;
}> {
  const prisma = client || defaultPrisma;

  // 1. Board
  const board = await prisma.curriculumBoard.upsert({
    where: { code: "MPBSE" },
    update: {
      name: "Madhya Pradesh Board of Secondary Education (माध्यमिक शिक्षा मण्डल, मध्य प्रदेश, भोपाल)",
      state: "Madhya Pradesh",
      websiteUrl: "https://mpbse.nic.in",
      activeSession: "2026-27",
    },
    create: {
      code: "MPBSE",
      name: "Madhya Pradesh Board of Secondary Education (माध्यमिक शिक्षा मण्डल, मध्य प्रदेश, भोपाल)",
      state: "Madhya Pradesh",
      websiteUrl: "https://mpbse.nic.in",
      activeSession: "2026-27",
    },
  });

  // 2. Source Documents
  const docMap = new Map<string, string>();
  for (const doc of SOURCE_DOCS_DATA) {
    const existing = await prisma.curriculumDocument.findFirst({
      where: { boardId: board.id, officialUrl: doc.officialUrl },
    });
    if (existing) {
      docMap.set(doc.docType, existing.id);
      if (doc.circularNumber) docMap.set(doc.circularNumber, existing.id);
    } else {
      const created = await prisma.curriculumDocument.create({
        data: {
          boardId: board.id,
          ...doc,
        },
      });
      docMap.set(doc.docType, created.id);
      if (doc.circularNumber) docMap.set(doc.circularNumber, created.id);
    }
  }

  const defaultMarksSchemeDocId = docMap.get("MARKS_SCHEME")!;

  // 3. Classes (9, 10, 11, 12)
  const classMap = new Map<number, string>();
  for (const c of CLASSES_DATA) {
    const cls = await prisma.curriculumClass.upsert({
      where: {
        boardId_classLevel: {
          boardId: board.id,
          classLevel: c.classLevel,
        },
      },
      update: {
        displayName: c.displayName,
        isBoardExam: c.isBoardExam,
      },
      create: {
        boardId: board.id,
        classLevel: c.classLevel,
        displayName: c.displayName,
        isBoardExam: c.isBoardExam,
      },
    });
    classMap.set(c.classLevel, cls.id);
  }

  // 4. Streams
  const streamMap = new Map<string, string>();
  for (const s of STREAMS_CONFIG) {
    const classId = classMap.get(s.classLevel)!;
    const stream = await prisma.curriculumStream.upsert({
      where: {
        classId_code: {
          classId,
          code: s.code,
        },
      },
      update: {
        name: s.name,
      },
      create: {
        classId,
        code: s.code,
        name: s.name,
      },
    });
    streamMap.set(`${s.classLevel}_${s.code}`, stream.id);
  }

  // 5. Subjects, Textbooks, Chapters, Marks Schemes, Blueprint Templates
  let totalTextbooksCreated = 0;
  let totalChaptersCreated = 0;
  let totalBlueprintsCreated = 0;

  for (const s of SUBJECTS_SEED) {
    const classId = classMap.get(s.classLevel)!;
    const streamId = s.streamCode ? streamMap.get(`${s.classLevel}_${s.streamCode}`) : null;

    const subject = await prisma.curriculumSubject.upsert({
      where: {
        classId_code: {
          classId,
          code: s.code,
        },
      },
      update: {
        name: s.name,
        streamId,
        isCompulsory: s.isCompulsory,
        hasPracticals: s.hasPracticals,
        theoryMarks: s.theoryMarks,
        practicalMarks: s.practicalMarks,
        projectMarks: s.projectMarks,
      },
      create: {
        classId,
        streamId,
        code: s.code,
        name: s.name,
        isCompulsory: s.isCompulsory,
        hasPracticals: s.hasPracticals,
        theoryMarks: s.theoryMarks,
        practicalMarks: s.practicalMarks,
        projectMarks: s.projectMarks,
      },
    });

    // Variants
    for (const v of s.variants) {
      await prisma.curriculumSubjectVariant.upsert({
        where: {
          subjectId_code: {
            subjectId: subject.id,
            code: v.code,
          },
        },
        update: {
          name: v.name,
          cognitiveWeight: v.cognitiveWeight ? toJson(v.cognitiveWeight) : undefined,
        },
        create: {
          subjectId: subject.id,
          code: v.code,
          name: v.name,
          cognitiveWeight: v.cognitiveWeight ? toJson(v.cognitiveWeight) : undefined,
        },
      });
    }

    // Textbooks & Chapters
    for (const tb of s.textbooks) {
      let legacyBook = await prisma.book.findFirst({
        where: {
          title: tb.title,
          className: `Class ${s.classLevel}`,
          academicSession: "2026-27",
        },
      });

      if (!legacyBook) {
        legacyBook = await prisma.book.create({
          data: {
            title: tb.title,
            subject: s.name,
            className: `Class ${s.classLevel}`,
            academicSession: "2026-27",
          },
        });
      }

      let textbook = await prisma.curriculumTextbook.findFirst({
        where: {
          subjectId: subject.id,
          title: tb.title,
        },
      });

      if (textbook) {
        textbook = await prisma.curriculumTextbook.update({
          where: { id: textbook.id },
          data: {
            publisher: tb.publisher || "NCERT / MP Text Book Corporation",
            academicSession: "2026-27",
            legacyBookId: legacyBook.id,
          },
        });
      } else {
        textbook = await prisma.curriculumTextbook.create({
          data: {
            subjectId: subject.id,
            title: tb.title,
            publisher: tb.publisher || "NCERT / MP Text Book Corporation",
            academicSession: "2026-27",
            legacyBookId: legacyBook.id,
          },
        });
      }
      totalTextbooksCreated++;

      for (const ch of tb.chapters) {
        let legacyChapter = await prisma.chapter.findFirst({
          where: {
            bookId: legacyBook.id,
            number: ch.chapterNumber,
          },
        });

        if (!legacyChapter) {
          legacyChapter = await prisma.chapter.create({
            data: {
              bookId: legacyBook.id,
              number: ch.chapterNumber,
              title: ch.title,
            },
          });
        }

        let currChapter = await prisma.curriculumChapter.findFirst({
          where: {
            textbookId: textbook.id,
            chapterNumber: ch.chapterNumber,
          },
        });

        if (currChapter) {
          currChapter = await prisma.curriculumChapter.update({
            where: { id: currChapter.id },
            data: {
              title: ch.title,
              documentId: defaultMarksSchemeDocId,
              unitNumber: ch.unitNumber,
              unitTitle: ch.unitTitle,
              isDeleted: ch.isDeleted || false,
              officialMarks: ch.officialMarks,
              provenancePage: ch.provenancePage,
              legacyChapterId: legacyChapter.id,
            },
          });
        } else {
          currChapter = await prisma.curriculumChapter.create({
            data: {
              textbookId: textbook.id,
              documentId: defaultMarksSchemeDocId,
              unitNumber: ch.unitNumber,
              unitTitle: ch.unitTitle,
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              isDeleted: ch.isDeleted || false,
              officialMarks: ch.officialMarks,
              provenancePage: ch.provenancePage,
              legacyChapterId: legacyChapter.id,
            },
          });
        }
        totalChaptersCreated++;

        const existingTopic = await prisma.curriculumTopic.findFirst({
          where: {
            chapterId: currChapter.id,
            sortOrder: 1,
          },
        });

        if (existingTopic) {
          await prisma.curriculumTopic.update({
            where: { id: existingTopic.id },
            data: {
              title: `${ch.title} - Core Competency Unit`,
              isExcluded: ch.isDeleted || false,
              competencies: toJson([
                { code: "KNOWLEDGE", description: "Direct conceptual and formula recall" },
                { code: "UNDERSTANDING", description: "Application, reasoning, and standard derivation" },
              ]),
            },
          });
        } else {
          await prisma.curriculumTopic.create({
            data: {
              chapterId: currChapter.id,
              title: `${ch.title} - Core Competency Unit`,
              isExcluded: ch.isDeleted || false,
              sortOrder: 1,
              competencies: toJson([
                { code: "KNOWLEDGE", description: "Direct conceptual and formula recall" },
                { code: "UNDERSTANDING", description: "Application, reasoning, and standard derivation" },
              ]),
            },
          });
        }
      }
    }

    // Marks Scheme
    const existingMarksScheme = await prisma.curriculumMarksScheme.findFirst({
      where: {
        subjectId: subject.id,
        academicSession: "2026-27",
      },
    });

    const marksSchemeData = {
      subjectId: subject.id,
      documentId: defaultMarksSchemeDocId,
      academicSession: "2026-27",
      totalTheory: s.theoryMarks,
      totalPractical: s.practicalMarks,
      totalProject: s.projectMarks,
      verificationPage: 1,
      unitBreakdown: s.unitBreakdown
        ? toJson(s.unitBreakdown)
        : toJson([
            {
              title: "Board Prescribed Marks Distribution Scheme 2026–27",
              officialMarks: s.theoryMarks,
            },
          ]),
      practicalRubric: s.hasPracticals
        ? toJson({
            majorExperiment: 18,
            projectWork: 3,
            recordFile: 4,
            vivaVoce: 5,
            total: s.practicalMarks,
          })
        : toJson({
            workbook: 5,
            quarterlyProject: 5,
            halfYearlyProject: 5,
            annualProject: 5,
            total: s.projectMarks,
          }),
    };

    if (existingMarksScheme) {
      await prisma.curriculumMarksScheme.update({
        where: { id: existingMarksScheme.id },
        data: marksSchemeData,
      });
    } else {
      await prisma.curriculumMarksScheme.create({
        data: marksSchemeData,
      });
    }

    // Blueprint Template: Find matching template from MPBSE_BLUEPRINT_TEMPLATES
    const templateCode = `mpbse-${s.classLevel}th-${s.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${s.code}-${s.theoryMarks}m`;
    const matchingTemplate = MPBSE_BLUEPRINT_TEMPLATES.find(
      (t) => t.templateCode === templateCode
    );

    const sectionsJson = matchingTemplate
      ? templateSectionsToSectionsJson(matchingTemplate)
      : [];

    await prisma.curriculumBlueprintTemplate.upsert({
      where: { templateCode },
      update: {
        title: matchingTemplate?.title || `MPBSE Class ${s.classLevel} ${s.name} Official Blueprint (${s.theoryMarks} Marks)`,
        durationMin: 180,
        totalMarks: s.theoryMarks,
        archetype: s.archetype,
        sectionsJson: toJson(sectionsJson),
      },
      create: {
        subjectId: subject.id,
        documentId: defaultMarksSchemeDocId,
        templateCode,
        title: matchingTemplate?.title || `MPBSE Class ${s.classLevel} ${s.name} Official Blueprint (${s.theoryMarks} Marks)`,
        academicSession: "2026-27",
        durationMin: 180,
        totalMarks: s.theoryMarks,
        archetype: s.archetype,
        sectionsJson: toJson(sectionsJson),
      },
    });
    totalBlueprintsCreated++;
  }

  return {
    subjectsCount: SUBJECTS_SEED.length,
    textbooksCount: totalTextbooksCreated,
    chaptersCount: totalChaptersCreated,
    templatesCount: totalBlueprintsCreated,
  };
}

let initPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Application-level initialization hook.
 * Checks whether blueprint templates exist. If missing, automatically seeds the curriculum.
 * If already present, checks and synchronizes subject heading languages idempotently.
 * Never creates duplicate records or overwrites customized user blueprints.
 */
export async function ensureCurriculumSeeded(
  client?: PrismaClient,
  forceRefresh: boolean = false
): Promise<void> {
  if (isInitialized && !forceRefresh) {
    return;
  }

  if (initPromise && !forceRefresh) {
    return initPromise;
  }

  initPromise = (async () => {
    const prisma = client || defaultPrisma;
    try {
      const templateCount = await prisma.curriculumBlueprintTemplate.count();

      if (templateCount < 27 || forceRefresh) {
        console.log("🌱 [CurriculumInit] Seeding MPBSE curriculum and blueprint templates...");
        const result = await seedCurriculumData(prisma);
        console.log(
          `✅ [CurriculumInit] Seeding complete: ${result.subjectsCount} subjects, ${result.templatesCount} templates.`
        );
      } else {
        // Check if existing templates have outdated Hindi headings for non-Hindi subjects
        const mathTemplate = await prisma.curriculumBlueprintTemplate.findUnique({
          where: { templateCode: "mpbse-10th-mathematics-standard-100-75m" },
        });

        const sections = (mathTemplate?.sectionsJson as any[]) || [];
        const needsHeadingSync = sections.some((s: any) =>
          typeof s.title === "string" && s.title.includes("सही विकल्प")
        );

        if (needsHeadingSync) {
          console.log("🔄 [CurriculumInit] Synchronizing blueprint templates with language-aware headings...");
          const count = await syncBlueprintTemplates(prisma);
          console.log(`✅ [CurriculumInit] Synchronized ${count} blueprint templates.`);
        }
      }

      isInitialized = true;
    } catch (err) {
      console.error("❌ [CurriculumInit] Error initializing curriculum templates:", err);
      isInitialized = false;
      throw err;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}
