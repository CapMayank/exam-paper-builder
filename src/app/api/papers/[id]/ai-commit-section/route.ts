import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { isSubpartQuestionType, parseMatchColumnPairs, serializeMatchColumnPair } from "@/lib/constants";
import {
  buildAndValidateGenerationContract,
  generateCurriculumGroundedSectionQuestions,
} from "@/lib/curriculumContract";
import type { GeneratedPaperQuestion } from "@/lib/gemini";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { isQuestionContaminated, validateGeneratedQuestion } from "@/lib/questionValidator";
import { normalizeSubpartMarks } from "@/lib/types";
import {
  verifyQuestionAcademicQuality,
  repairOrRegenerateQuestion,
} from "@/lib/questionVerificationEngine";

export const POST = route(async (req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") {
    throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");
  }

  const body = await req.json();
  const { sectionId, questions } = body as {
    sectionId: string;
    questions: (GeneratedPaperQuestion & { imagePath?: string; figureScene?: unknown })[];
  };

  if (!sectionId) throw new HttpError(400, "sectionId is required");
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new HttpError(400, "Questions array must not be empty");
  }

  const section = paper.blueprint.sections.find((s) => s.id === sectionId);
  if (!section) throw new HttpError(404, "Section not found in blueprint");

  // Determine starting position and verify section capacity
  const existingSectionItems = paper.items.filter((i) => i.sectionId === sectionId);
  const remainingCapacity = section.count - existingSectionItems.length;
  if (remainingCapacity <= 0) {
    throw new HttpError(400, `Section "${section.title}" is already full (${section.count}/${section.count}).`);
  }
  if (questions.length > remainingCapacity) {
    throw new HttpError(
      400,
      `Cannot commit ${questions.length} question(s); section "${section.title}" only has room for ${remainingCapacity} more question(s).`
    );
  }

  const validChapterIds = new Set(paper.blueprint.chapters.map((c) => c.chapterId));
  const fallbackChapterId = paper.blueprint.chapters[0]?.chapterId;
  if (!fallbackChapterId) {
    throw new HttpError(400, "Blueprint has no associated chapters. Add chapters to the blueprint first.");
  }

  // Enforce Subject & Curriculum Validation Gate before committing to paper or Question Bank
  const contractRes = buildAndValidateGenerationContract({
    schoolName: paper.schoolName,
    blueprintName: paper.blueprint.name,
    className: paper.blueprint.book.className,
    academicSession: paper.academicSession || paper.blueprint.academicSession,
    examType: paper.examType || paper.blueprint.examType,
    bookId: paper.blueprint.bookId,
    subject: paper.blueprint.book.subject,
    subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
    sectionTitle: section.title,
    sectionInstructions: section.instructions,
    questionType: section.type,
    marksEach: section.marksEach,
    slots: questions.map((q, idx) => {
      const ch =
        paper.blueprint.chapters.find((c) => c.chapterId === q.chapterId)?.chapter ||
        paper.blueprint.chapters[0]?.chapter;
      return {
        slotIndex: typeof q.slotIndex === "number" ? q.slotIndex : idx,
        chapterId: ch?.id || fallbackChapterId,
        chapterNumber: ch?.number || q.chapterNumber || idx + 1,
        chapterTitle: q.chapterTitle || ch?.title || "Syllabus Chapter",
        marks: section.marksEach,
        requiresInternalChoice: q.requiresInternalChoice,
      };
    }),
  });

  if (!contractRes.valid || !contractRes.contract) {
    throw new HttpError(422, `Invalid generation contract: ${contractRes.errors.join(" ")}`);
  }

  const choiceForbidden = contractRes.contract.internalChoiceRequirement.forbidden;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (choiceForbidden && q.orQuestion) {
      q.orQuestion = undefined;
      q.requiresInternalChoice = false;
    }

    const contam = isQuestionContaminated(
      {
        text: q.text,
        options: q.options,
        subparts: q.subparts as any,
        answer: q.answer,
        explanation: q.explanation,
        chapterTitle: q.chapterTitle,
      },
      paper.blueprint.book.subject,
      paper.blueprint.book.className,
    );
    if (contam.contaminated) {
      throw new HttpError(
        422,
        `Question ${i + 1} rejected by Subject Integrity Gate: ${contam.reason}`,
      );
    }

    let valRes = validateGeneratedQuestion(
      {
        ...q,
        type: q.type || section.type,
      } as any,
      contractRes.contract,
      { slotIndex: i },
    );

    let vRes = verifyQuestionAcademicQuality(
      {
        ...q,
        type: q.type || section.type,
      } as any,
      contractRes.contract,
      { slotIndex: i },
    );

    if (!valRes.valid || vRes.status === "FAIL") {
      // Attempt surgical repair
      const repRes = await repairOrRegenerateQuestion(
        {
          ...q,
          type: q.type || section.type,
        } as any,
        contractRes.contract,
        { slotIndex: i, maxRetries: 1 },
      );

      if (repRes.success) {
        questions[i] = {
          ...q,
          text: repRes.question.text,
          options: repRes.question.options || q.options,
          subparts: repRes.question.subparts || q.subparts,
          answer: repRes.question.answer || q.answer,
          orQuestion: repRes.question.orQuestion ?? q.orQuestion,
        } as any;
        valRes = validateGeneratedQuestion(questions[i] as any, contractRes.contract, { slotIndex: i });
        vRes = repRes.verificationResult;
      }
    }

    if (!valRes.valid || vRes.status === "FAIL") {
      // If surgical repair could not resolve all issues, recover using curriculum-grounded question
      // rather than throwing a 422 that aborts whole-paper generation.
      const grounded = generateCurriculumGroundedSectionQuestions(contractRes.contract, {
        generateDiagrams: false,
        existingQuestionTexts: questions.map((item) => item.text).filter((t): t is string => Boolean(t)),
      })[i];
      if (grounded) {
        questions[i] = {
          ...q,
          text: grounded.text,
          options: grounded.options || q.options,
          subparts: grounded.subparts || q.subparts,
          answer: grounded.answer || q.answer,
          difficulty: grounded.difficulty || q.difficulty || "MEDIUM",
          cognitiveLevel: grounded.cognitiveLevel || q.cognitiveLevel || "APPLYING",
          explanation: grounded.explanation || q.explanation,
          orQuestion: grounded.orQuestion ?? q.orQuestion,
          requiresInternalChoice: grounded.requiresInternalChoice ?? q.requiresInternalChoice,
        } as any;
        valRes = validateGeneratedQuestion(questions[i] as any, contractRes.contract, { slotIndex: i });
        vRes = verifyQuestionAcademicQuality(questions[i] as any, contractRes.contract, { slotIndex: i });
      }
    }

    if (!valRes.valid || vRes.status === "FAIL") {
      const issuesCombined = [
        ...valRes.issues.map((iss) => iss.message),
        ...vRes.allIssues.map((iss) => iss.message),
      ];
      throw new HttpError(
        422,
        `Question ${i + 1} failed independent quality validation: ${issuesCombined.join("; ")}`,
      );
    }
  }

  let nextPos = existingSectionItems.reduce((max, i) => Math.max(max, i.position), -1) + 1;

  // Persist questions and link to paper
  await prisma.$transaction(async (tx) => {
    for (const q of questions) {
      const qType = q.type || section.type;
      const isMatch = qType === "MATCH_COLUMN" || section.type === "MATCH_COLUMN";

      // Serialize MATCH_COLUMN pairs into self-contained "Left::Right" option strings
      let processedOptions = Array.isArray(q.options) ? q.options : [];
      if (isMatch) {
        const pairs = parseMatchColumnPairs(processedOptions, q.text, q.explanation);
        if (pairs.length > 0 && pairs.some((p) => p.left && p.right)) {
          processedOptions = pairs.map((p) => serializeMatchColumnPair(p.left, p.right));
        }
      }

      // Balance subpart marks when subparts are present
      let normalizedSubparts = Array.isArray(q.subparts) && q.subparts.length > 0 ? q.subparts : [];
      const attemptCount = typeof (q as any).attemptCount === "number" && (q as any).attemptCount > 0 ? (q as any).attemptCount : undefined;
      if (normalizedSubparts.length > 0) {
        normalizedSubparts = normalizeSubpartMarks(normalizedSubparts, section.marksEach, attemptCount);
      }
      const subpartsData = attemptCount ? { attemptCount, subparts: normalizedSubparts } : normalizedSubparts;

      let chapterId = q.chapterId && q.chapterId.trim() ? q.chapterId.trim() : fallbackChapterId;
      if (!validChapterIds.has(chapterId)) {
        chapterId = fallbackChapterId;
      }

      // 1. Create primary question in the question bank
      const figureSceneVal = q.figureScene
        ? (typeof q.figureScene === "string" ? q.figureScene : JSON.stringify(q.figureScene))
        : (q.figureDoc ? JSON.stringify(q.figureDoc) : null);

      const createdQuestion = await tx.question.create({
        data: {
          bookId: paper.blueprint.bookId,
          chapterId,
          type: qType,
          text: q.text,
          optionsJson: JSON.stringify(processedOptions),
          subpartsJson: JSON.stringify(subpartsData),
          answer: q.answer || "",
          difficulty: q.difficulty || "MEDIUM",
          cognitiveLevel: q.cognitiveLevel || null,
          explanation: q.explanation || null,
          figureScene: figureSceneVal,
          imagePath: q.imagePath || null,
          createdById: user.id,
        },
      });

      // 1b. Create internal choice (OR / अथवा) question in the question bank when present
      let createdOrQuestionId: string | null = null;
      if (!choiceForbidden && q.orQuestion && typeof q.orQuestion.text === "string" && q.orQuestion.text.trim()) {
        const orType = q.orQuestion.type || qType;
        const orOptions = Array.isArray(q.orQuestion.options) ? q.orQuestion.options : [];
        let orSubparts =
          Array.isArray(q.orQuestion.subparts) && q.orQuestion.subparts.length > 0
            ? q.orQuestion.subparts
            : [];
        const orAttemptCount =
          typeof (q.orQuestion as any).attemptCount === "number" && (q.orQuestion as any).attemptCount > 0
            ? (q.orQuestion as any).attemptCount
            : undefined;
        if (orSubparts.length > 0) {
          orSubparts = normalizeSubpartMarks(orSubparts, section.marksEach, orAttemptCount);
        }
        const orSubpartsData = orAttemptCount ? { attemptCount: orAttemptCount, subparts: orSubparts } : orSubparts;

        const createdOrQuestion = await tx.question.create({
          data: {
            bookId: paper.blueprint.bookId,
            chapterId,
            type: orType,
            text: q.orQuestion.text,
            optionsJson: JSON.stringify(orOptions),
            subpartsJson: JSON.stringify(orSubpartsData),
            answer: q.orQuestion.answer || "",
            difficulty: q.orQuestion.difficulty || q.difficulty || "MEDIUM",
            cognitiveLevel: q.orQuestion.cognitiveLevel || q.cognitiveLevel || null,
            explanation: q.orQuestion.explanation || null,
            createdById: user.id,
          },
        });
        createdOrQuestionId = createdOrQuestion.id;
      }

      // 2. Link question (and OR choice if applicable) into this paper's section
      await tx.paperQuestion.create({
        data: {
          paperId: id,
          sectionId,
          questionId: createdQuestion.id,
          orQuestionId: createdOrQuestionId,
          position: nextPos++,
        },
      });
    }

    await tx.paper.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  });

  await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
    action: "AI_COMMIT_SECTION",
    sectionId,
    sectionTitle: section.title,
    questionsAdded: questions.length,
  });

  const updatedPaper = await loadPaperView(id);

  return {
    success: true,
    addedCount: questions.length,
    paper: updatedPaper,
  };
});
