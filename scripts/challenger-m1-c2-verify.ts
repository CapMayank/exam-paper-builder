import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("================================================================================");
  console.log("🔍 CHALLENGER 2: EMPIRICAL VERIFICATION OF STATUTORY RULES & FK INTEGRITY");
  console.log("================================================================================");

  // ---------------------------------------------------------------------------
  // PART 1: CIRCULAR 465 STATUTORY CHOICE RULES VERIFICATION ACROSS ALL 27 TEMPLATES
  // ---------------------------------------------------------------------------
  console.log("\n--- PART 1: Verifying All 27 CurriculumBlueprintTemplates ---");

  const templates = await prisma.curriculumBlueprintTemplate.findMany({
    include: {
      subject: {
        include: { curriculumClass: true },
      },
    },
    orderBy: [
      { subject: { curriculumClass: { classLevel: "asc" } } },
      { subject: { code: "asc" } },
    ],
  });

  console.log(`Found ${templates.length} CurriculumBlueprintTemplate records in database.`);
  if (templates.length !== 27) {
    throw new Error(`FAIL: Expected 27 templates, found ${templates.length}`);
  }

  let total2mSections = 0;
  let total3m4mStandardSections = 0;
  let totalTemplatesVerified = 0;

  for (const t of templates) {
    const className = t.subject.curriculumClass.displayName;
    const subjectName = t.subject.name;
    const code = t.subject.code;
    const archetype = t.archetype;
    const totalMarks = t.totalMarks;

    const sections = t.sectionsJson as Array<{
      position: number;
      title: string;
      type: string;
      count: number;
      marksEach: number;
      orChoiceMode: string;
      orAlternativeCount: number;
      choicePolicy?: {
        policyType: string;
        totalProvided: number;
        totalRequired: number;
        poolScope?: string;
        rationale: string;
      };
    }>;

    if (!Array.isArray(sections) || sections.length === 0) {
      throw new Error(`FAIL: Template ${t.templateCode} has empty or invalid sectionsJson`);
    }

    const calcSum = sections.reduce((sum, s) => sum + s.count * s.marksEach, 0);
    if (calcSum !== totalMarks) {
      throw new Error(`FAIL: Template ${t.templateCode} sum (${calcSum}) !== totalMarks (${totalMarks})`);
    }

    // Inspect each section for Circular 465 compliance
    for (const sec of sections) {
      // 2-MARK QUESTIONS: CIRCULAR 465 STATUTORY ABOLITION OF CHOICE (NO_CHOICE)
      if (sec.marksEach === 2) {
        total2mSections++;
        if (sec.orChoiceMode !== "NO_CHOICE") {
          throw new Error(
            `FAIL: Template ${t.templateCode} section '${sec.title}' (2m) has orChoiceMode '${sec.orChoiceMode}', expected 'NO_CHOICE'`
          );
        }
        if (sec.orAlternativeCount !== 0) {
          throw new Error(
            `FAIL: Template ${t.templateCode} section '${sec.title}' (2m) has orAlternativeCount ${sec.orAlternativeCount}, expected 0`
          );
        }
        if (!sec.choicePolicy || sec.choicePolicy.policyType !== "NO_CHOICE") {
          throw new Error(
            `FAIL: Template ${t.templateCode} section '${sec.title}' (2m) has invalid choicePolicy: ${JSON.stringify(sec.choicePolicy)}`
          );
        }
        if (sec.choicePolicy.totalProvided !== sec.count || sec.choicePolicy.totalRequired !== sec.count) {
          throw new Error(
            `FAIL: Template ${t.templateCode} section '${sec.title}' (2m) choicePolicy totalProvided/totalRequired mismatch`
          );
        }
      }

      // 3-MARK & 4-MARK QUESTIONS: CIRCULAR 465 MANDATORY 100% INTERNAL ALTERNATIVE (अथवा)
      if (archetype === "STANDARD_23Q_75M" || archetype === "SCIENCE_20Q_70M" || archetype === "STANDARD_23Q_80M") {
        if (sec.marksEach === 3 || sec.marksEach === 4) {
          total3m4mStandardSections++;
          if (sec.orChoiceMode !== "FULL_OR_ALTERNATIVE") {
            throw new Error(
              `FAIL: Template ${t.templateCode} section '${sec.title}' (${sec.marksEach}m) has orChoiceMode '${sec.orChoiceMode}', expected 'FULL_OR_ALTERNATIVE'`
            );
          }
          if (sec.orAlternativeCount !== 1) {
            throw new Error(
              `FAIL: Template ${t.templateCode} section '${sec.title}' (${sec.marksEach}m) has orAlternativeCount ${sec.orAlternativeCount}, expected 1`
            );
          }
          if (!sec.choicePolicy || sec.choicePolicy.policyType !== "FULL_OR_ALTERNATIVE") {
            throw new Error(
              `FAIL: Template ${t.templateCode} section '${sec.title}' (${sec.marksEach}m) has invalid choicePolicy: ${JSON.stringify(sec.choicePolicy)}`
            );
          }
          if (sec.choicePolicy.totalProvided !== 2 || sec.choicePolicy.totalRequired !== 1) {
            throw new Error(
              `FAIL: Template ${t.templateCode} section '${sec.title}' (${sec.marksEach}m) choicePolicy totalProvided/totalRequired !== 2/1`
            );
          }
          if (sec.choicePolicy.poolScope !== "SAME_UNIT") {
            throw new Error(
              `FAIL: Template ${t.templateCode} section '${sec.title}' (${sec.marksEach}m) poolScope '${sec.choicePolicy.poolScope}' !== 'SAME_UNIT'`
            );
          }
        }
      }
    }

    totalTemplatesVerified++;
    console.log(`  ✓ [${totalTemplatesVerified}/27] ${className} - ${subjectName} (${code}) | Total: ${totalMarks}m | Arch: ${archetype} | Sections: ${sections.length} [OK]`);
  }

  console.log(`\nVerified all 27 templates:`);
  console.log(`  Total 2-mark sections verified with NO_CHOICE: ${total2mSections}`);
  console.log(`  Total 3m/4m standard sections verified with FULL_OR_ALTERNATIVE (SAME_UNIT): ${total3m4mStandardSections}`);

  // ---------------------------------------------------------------------------
  // PART 2: FOREIGN KEY CASCADE, RESTRICT & SETNULL ON BLUEPRINT AND QUESTION
  // ---------------------------------------------------------------------------
  console.log("\n--- PART 2: Empirical Verification of FK Constraints & Nullability ---");
  const stamp = Date.now();

  // Create temporary User, Book, Chapter
  const testUser = await prisma.user.create({
    data: {
      name: `C2 Test User ${stamp}`,
      email: `c2-test-${stamp}@internal.test`,
      passwordHash: "hash",
      role: "TEACHER",
    },
  });

  const testBook = await prisma.book.create({
    data: {
      title: `C2 Test Book ${stamp}`,
      subject: "Science",
      className: "Class 10",
      academicSession: "2026-27",
    },
  });

  const testChapter = await prisma.chapter.create({
    data: {
      bookId: testBook.id,
      number: 1,
      title: `C2 Test Chapter ${stamp}`,
    },
  });

  // 2.1 Verify Blueprint Schema Nullability & Defaults
  console.log("  Checking Blueprint nullability & default values...");
  const blankBp = await prisma.blueprint.create({
    data: {
      name: `C2 Blank BP ${stamp}`,
      bookId: testBook.id,
      examType: "ANNUAL",
      durationMin: 180,
    },
  });
  if (blankBp.curriculumMode !== "BLANK_CUSTOM") {
    throw new Error(`FAIL: Blueprint default curriculumMode is ${blankBp.curriculumMode}, expected 'BLANK_CUSTOM'`);
  }
  if (blankBp.curriculumTemplateId !== null || blankBp.curriculumVariantId !== null) {
    throw new Error("FAIL: Blueprint curriculumTemplateId and curriculumVariantId should default to null");
  }
  console.log("  ✓ Blueprint defaults and nullable columns verified.");

  // 2.2 Verify Question Schema Nullability & Defaults
  console.log("  Checking Question nullability & default values...");
  const blankQ = await prisma.question.create({
    data: {
      bookId: testBook.id,
      chapterId: testChapter.id,
      type: "MCQ",
      text: `C2 Test Blank Question ${stamp}`,
      createdById: testUser.id,
    },
  });
  if (blankQ.curriculumTopicId !== null || blankQ.competencyLevel !== null || blankQ.sourceProvenance !== null) {
    throw new Error("FAIL: Question curriculumTopicId, competencyLevel, sourceProvenance should default to null");
  }
  console.log("  ✓ Question nullable columns verified.");

  // 2.3 Verify SetNull on Blueprint when CurriculumBlueprintTemplate is deleted
  console.log("  Testing SetNull on Blueprint when CurriculumBlueprintTemplate is deleted...");
  const subject = await prisma.curriculumSubject.findFirst();
  const document = await prisma.curriculumDocument.findFirst();
  if (!subject || !document) throw new Error("Seed data missing subject/document");

  const transientTemplate = await prisma.curriculumBlueprintTemplate.create({
    data: {
      subjectId: subject.id,
      documentId: document.id,
      templateCode: `c2-transient-template-${stamp}`,
      title: `Transient Template ${stamp}`,
      totalMarks: 75,
      archetype: "STANDARD_23Q_75M",
      sectionsJson: [],
    },
  });

  const linkedBp = await prisma.blueprint.create({
    data: {
      name: `C2 Linked BP ${stamp}`,
      bookId: testBook.id,
      examType: "ANNUAL",
      durationMin: 180,
      curriculumTemplateId: transientTemplate.id,
      curriculumMode: "STANDARD_MPBSE",
    },
  });
  if (linkedBp.curriculumTemplateId !== transientTemplate.id) {
    throw new Error("FAIL: Blueprint failed to link to template");
  }

  // Delete the template
  await prisma.curriculumBlueprintTemplate.delete({ where: { id: transientTemplate.id } });

  // Query linkedBp
  const reloadedBp = await prisma.blueprint.findUnique({ where: { id: linkedBp.id } });
  if (!reloadedBp) throw new Error("FAIL: Blueprint was deleted when template was deleted (Cascade occurred instead of SetNull!)");
  if (reloadedBp.curriculumTemplateId !== null) {
    throw new Error(`FAIL: Blueprint curriculumTemplateId is ${reloadedBp.curriculumTemplateId}, expected null (SetNull failed!)`);
  }
  console.log("  ✓ SetNull verified on Blueprint.curriculumTemplateId.");

  // 2.4 Verify SetNull on Question when CurriculumTopic is deleted
  console.log("  Testing SetNull on Question when CurriculumTopic is deleted...");
  const currChapter = await prisma.curriculumChapter.findFirst();
  if (!currChapter) throw new Error("CurriculumChapter missing");

  const transientTopic = await prisma.curriculumTopic.create({
    data: {
      chapterId: currChapter.id,
      title: `Transient Topic ${stamp}`,
    },
  });

  const linkedQ = await prisma.question.create({
    data: {
      bookId: testBook.id,
      chapterId: testChapter.id,
      type: "MCQ",
      text: `Question linked to transient topic ${stamp}`,
      curriculumTopicId: transientTopic.id,
      createdById: testUser.id,
    },
  });
  if (linkedQ.curriculumTopicId !== transientTopic.id) {
    throw new Error("FAIL: Question failed to link to topic");
  }

  // Delete topic
  await prisma.curriculumTopic.delete({ where: { id: transientTopic.id } });

  // Query linkedQ
  const reloadedQ = await prisma.question.findUnique({ where: { id: linkedQ.id } });
  if (!reloadedQ) throw new Error("FAIL: Question was deleted when topic was deleted (Cascade occurred instead of SetNull!)");
  if (reloadedQ.curriculumTopicId !== null) {
    throw new Error(`FAIL: Question curriculumTopicId is ${reloadedQ.curriculumTopicId}, expected null (SetNull failed!)`);
  }
  console.log("  ✓ SetNull verified on Question.curriculumTopicId.");

  // 2.5 Verify Restrict on Blueprint deletion when Paper references it
  console.log("  Testing Restrict on Blueprint deletion when Paper references it...");
  const testSection = await prisma.blueprintSection.create({
    data: {
      blueprintId: blankBp.id,
      position: 1,
      title: "Section A",
      instructions: "",
      type: "MCQ",
      count: 1,
      marksEach: 1,
    },
  });

  const testPaper = await prisma.paper.create({
    data: {
      title: `C2 Test Paper ${stamp}`,
      blueprintId: blankBp.id,
      layout: "BOOKLET",
      schoolName: "Test School",
      createdById: testUser.id,
    },
  });

  let restrictThrownBp = false;
  try {
    await prisma.blueprint.delete({ where: { id: blankBp.id } });
  } catch {
    restrictThrownBp = true;
  }
  if (!restrictThrownBp) {
    throw new Error("FAIL: Deleting Blueprint referenced by Paper did not throw Restrict violation!");
  }
  console.log("  ✓ Restrict verified on Blueprint -> Paper reference.");

  // 2.6 Verify Restrict on Question deletion when PaperQuestion references it
  console.log("  Testing Restrict on Question deletion when PaperQuestion references it...");
  const testPaperQuestion = await prisma.paperQuestion.create({
    data: {
      paperId: testPaper.id,
      sectionId: testSection.id,
      questionId: blankQ.id,
      position: 1,
    },
  });

  let restrictThrownQ = false;
  try {
    await prisma.question.delete({ where: { id: blankQ.id } });
  } catch {
    restrictThrownQ = true;
  }
  if (!restrictThrownQ) {
    throw new Error("FAIL: Deleting Question referenced by PaperQuestion did not throw Restrict violation!");
  }
  console.log("  ✓ Restrict verified on Question -> PaperQuestion reference.");

  // Clean up test records
  console.log("  Cleaning up test fixtures...");
  await prisma.paperQuestion.deleteMany({ where: { paperId: testPaper.id } });
  await prisma.paper.delete({ where: { id: testPaper.id } });
  await prisma.blueprintSection.deleteMany({ where: { blueprintId: blankBp.id } });
  await prisma.blueprint.delete({ where: { id: blankBp.id } });
  await prisma.blueprint.delete({ where: { id: linkedBp.id } });
  await prisma.question.delete({ where: { id: blankQ.id } });
  await prisma.question.delete({ where: { id: linkedQ.id } });
  await prisma.chapter.delete({ where: { id: testChapter.id } });
  await prisma.book.delete({ where: { id: testBook.id } });
  await prisma.user.delete({ where: { id: testUser.id } });

  console.log("================================================================================");
  console.log("🎉 ALL CHALLENGER 2 EMPIRICAL CHECKS PASSED WITH ZERO DEFECTS!");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
