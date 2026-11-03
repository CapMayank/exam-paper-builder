import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { canonicalMcqAnswer, isSubpartQuestionType, parseMatchColumnPairs, serializeMatchColumnPair } from "@/lib/constants";
import {
  buildAndValidateGenerationContract,
  generateCurriculumGroundedSectionQuestions,
} from "@/lib/curriculumContract";
import type { GeneratedPaperQuestion } from "@/lib/gemini";
import { toPlacedItems, whyCannotAdd } from "@/lib/blueprint";
import { regenerateSlot } from "@/lib/slotRegeneration";
import { shuffleMcqOptionsIfSafe } from "@/lib/multiset";
import { parseComponents } from "@/lib/languageComponents";
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
  const customKey = (body as { customKey?: string }).customKey || req.headers.get("x-gemini-api-key") || null;
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
  // A chapter must be named explicitly unless the blueprint has only one; never silently re-assign.
  const resolveChapterId = (q: { chapterId?: string }, idx: number): string => {
    const given = q.chapterId?.trim();
    if (given) {
      if (!validChapterIds.has(given)) {
        throw new HttpError(422, `Question ${idx + 1} names a chapter that is not part of this blueprint.`);
      }
      return given;
    }
    if (validChapterIds.size === 1) return fallbackChapterId;
    throw new HttpError(422, `Question ${idx + 1} has no chapter; refusing to guess one for a multi-chapter blueprint.`);
  };
  const allowedComponentKeys = new Set(
    parseComponents((paper.blueprint as { componentsJson?: string }).componentsJson).map((c) => c.key),
  );
  const bodyIsMock = (body as { isMock?: boolean }).isMock === true;
  const templateFallbackIdx = new Set<number>();
  if (bodyIsMock && ["UNSEEN_PASSAGE", "REFERENCE_CONTEXT"].includes(section.type)) {
    throw new HttpError(422, "Offline templates cannot write a real unseen passage. Connect a Gemini API key, or add the passage and its questions manually.");
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

  // At most this many model calls may be spent regenerating failing questions in one commit request.
  let regenerationBudget = 4;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.type && q.type !== section.type) {
      throw new HttpError(422, `Question ${i + 1} is ${q.type} but section "${section.title}" only accepts ${section.type}.`);
    }
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
      { slotIndex: i, strictPassage: true },
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
        valRes = validateGeneratedQuestion(questions[i] as any, contractRes.contract, { slotIndex: i, strictPassage: true });
        vRes = repRes.verificationResult;
      }
    }

    // Still failing: regenerate just this slot (up to 2 times), feeding the rejection reasons back,
    // and re-validate each replacement. Offline mode has no model to regenerate with, so it uses the
    // curriculum template (already flagged as TEMPLATE_FALLBACK).
    for (let attempt = 0; attempt < 2 && (!valRes.valid || vRes.status === "FAIL") && !bodyIsMock; attempt++) {
      // Each regeneration is a model call; a batch that fails wholesale must not burn the key's per-minute and daily quota.
      if (regenerationBudget <= 0) break;
      regenerationBudget--;
      const reasons = [...valRes.issues.map((x) => x.message), ...vRes.allIssues.map((x) => x.message)];
      const regenerated = await regenerateSlot({
        paper,
        section,
        slot: contractRes.contract.slots[i] ?? contractRes.contract.slots[0],
        reasons,
        apiKey: customKey,
      });
      if (!regenerated) break;
      const candidate = { ...q, ...regenerated, type: q.type || section.type } as never;
      const v2 = validateGeneratedQuestion(candidate, contractRes.contract, { slotIndex: i, strictPassage: true });
      const vr2 = verifyQuestionAcademicQuality(candidate, contractRes.contract, { slotIndex: i });
      if (v2.valid && vr2.status !== "FAIL") {
        questions[i] = candidate;
        valRes = v2;
        vRes = vr2;
      } else {
        valRes = v2;
        vRes = vr2;
      }
    }

    if ((!valRes.valid || vRes.status === "FAIL") && bodyIsMock) {
      const grounded = generateCurriculumGroundedSectionQuestions(contractRes.contract, {
        generateDiagrams: false,
        existingQuestionTexts: questions.map((item) => item.text).filter((t): t is string => Boolean(t)),
      })[i];
      if (grounded) {
        templateFallbackIdx.add(i);
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
        } as never;
        valRes = validateGeneratedQuestion(questions[i] as never, contractRes.contract, { slotIndex: i, strictPassage: true });
        vRes = verifyQuestionAcademicQuality(questions[i] as never, contractRes.contract, { slotIndex: i });
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

  // Same blueprint rules as the manual add path: section role, slot capacity, chapter quota.
  const placedSoFar = toPlacedItems(paper.blueprint.sections, paper.items);
  const bpDef = {
    sections: paper.blueprint.sections,
    chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks, unitKey: c.unitKey, unitTitle: c.unitTitle })),
  };
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const cand = {
      sectionId,
      chapterId: resolveChapterId(q, i),
      type: q.type || section.type,
      passageGroupId: (q as { passageGroupId?: string | null }).passageGroupId ?? null,
    };
    const why = whyCannotAdd(bpDef, placedSoFar, cand);
    if (why) throw new HttpError(409, `Question ${i + 1} cannot be placed: ${why}`);
    placedSoFar.push({ sectionId, chapterId: cand.chapterId, marks: section.marksEach });
  }

  let nextPos = existingSectionItems.reduce((max, i) => Math.max(max, i.position), -1) + 1;

  // Persist questions and link to paper
  await prisma.$transaction(async (tx) => {
    for (const [qIdx, q] of questions.entries()) {
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
      const attemptCount =
        typeof (q as any).attemptCount === "number" && (q as any).attemptCount > 0 && Array.isArray(q.subparts) && q.subparts.length > 1
          ? (q as any).attemptCount
          : undefined;
      if (normalizedSubparts.length > 0) {
        normalizedSubparts = normalizeSubpartMarks(normalizedSubparts, section.marksEach, attemptCount);
      }
      const subpartsData = attemptCount ? { attemptCount, subparts: normalizedSubparts } : normalizedSubparts;

      const chapterId = resolveChapterId(q, qIdx);
      const provenance =
        bodyIsMock || templateFallbackIdx.has(qIdx)
          ? "TEMPLATE_FALLBACK: offline curriculum template, not AI-generated; teacher review required"
          : "AI_GENERATED";

      // 1. Create primary question in the question bank
      const figureSceneVal = q.figureScene
        ? (typeof q.figureScene === "string" ? q.figureScene : JSON.stringify(q.figureScene))
        : (q.figureDoc ? JSON.stringify(q.figureDoc) : null);

      // MCQ: store the answer as a letter, and mix the options so the key is not predictably the first one
      const mcqFinal =
        qType === "MCQ"
          ? shuffleMcqOptionsIfSafe(processedOptions, canonicalMcqAnswer(q.answer, processedOptions))
          : { options: processedOptions, answer: q.answer || "" };

      const createdQuestion = await tx.question.create({
        data: {
          bookId: paper.blueprint.bookId,
          chapterId,
          type: qType,
          text: q.text,
          optionsJson: JSON.stringify(mcqFinal.options),
          subpartsJson: JSON.stringify(subpartsData),
          answer: mcqFinal.answer,
          difficulty: q.difficulty || "MEDIUM",
          cognitiveLevel: q.cognitiveLevel || null,
          explanation: q.explanation || null,
          figureScene: figureSceneVal,
          imagePath: q.imagePath || null,
          sourceProvenance: provenance,
          passageGroupId: (q as { passageGroupId?: string | null }).passageGroupId ?? null,
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
          typeof (q.orQuestion as any).attemptCount === "number" && (q.orQuestion as any).attemptCount > 0 && orSubparts.length > 1
            ? (q.orQuestion as any).attemptCount
            : undefined;
        if (orSubparts.length > 0) {
          orSubparts = normalizeSubpartMarks(orSubparts, section.marksEach, orAttemptCount);
        }
        const orSubpartsData = orAttemptCount ? { attemptCount: orAttemptCount, subparts: orSubparts } : orSubparts;

        const orFinal =
          orType === "MCQ"
            ? shuffleMcqOptionsIfSafe(orOptions, canonicalMcqAnswer(q.orQuestion.answer, orOptions))
            : { options: orOptions, answer: q.orQuestion.answer || "" };

        const createdOrQuestion = await tx.question.create({
          data: {
            bookId: paper.blueprint.bookId,
            chapterId,
            type: orType,
            text: q.orQuestion.text,
            optionsJson: JSON.stringify(orFinal.options),
            subpartsJson: JSON.stringify(orSubpartsData),
            answer: orFinal.answer,
            difficulty: q.orQuestion.difficulty || q.difficulty || "MEDIUM",
            cognitiveLevel: q.orQuestion.cognitiveLevel || q.cognitiveLevel || null,
            explanation: q.orQuestion.explanation || null,
            sourceProvenance: provenance,
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
          componentKey: allowedComponentKeys.has((q as { componentKey?: string }).componentKey ?? "")
            ? ((q as { componentKey?: string }).componentKey as string)
            : "",
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
    templateFallbackCount: templateFallbackIdx.size + (bodyIsMock ? questions.length : 0),
  });

  const updatedPaper = await loadPaperView(id);

  return {
    success: true,
    addedCount: questions.length,
    templateFallbackCount: bodyIsMock ? questions.length : templateFallbackIdx.size,
    paper: updatedPaper,
  };
});
