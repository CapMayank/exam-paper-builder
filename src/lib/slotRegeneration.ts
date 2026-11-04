import { detectPaperLanguage } from "./constants";
import {
  generatePaperSectionWithGemini,
  type GeneratedPaperQuestion,
  type GeneratePaperSectionSlot,
} from "./gemini";
import type { PaperView } from "./papers";

/**
 * Regenerates a single rejected slot with the model, telling it why the previous attempt failed.
 * Returns null when no usable model result exists. A mock/template result is never returned:
 * the caller decides what to do with a slot that could not be regenerated (reject it).
 */
export async function regenerateSlot(params: {
  paper: PaperView;
  section: PaperView["blueprint"]["sections"][number];
  slot: GeneratePaperSectionSlot;
  reasons: string[];
  apiKey?: string | null;
  /** The paper's difficulty profile, and the level the rejected question was commissioned at. */
  difficulty?: string | null;
  targetDifficulty?: "EASY" | "MEDIUM" | "HARD";
}): Promise<GeneratedPaperQuestion | null> {
  const { paper, section, slot, reasons, apiKey, difficulty, targetDifficulty } = params;
  const res = await generatePaperSectionWithGemini({
    className: paper.blueprint.book.className,
    subject: paper.blueprint.book.subject,
    sectionTitle: section.title,
    sectionType: section.type,
    sectionInstructions: section.instructions,
    marksEach: section.marksEach,
    language: detectPaperLanguage(paper, paper.items),
    difficulty: difficulty ?? null,
    teacherFocus:
      "The previous attempt for this slot was rejected by validation. Fix every problem listed and do not repeat it: " +
      reasons.slice(0, 8).join(" | "),
    generateDiagrams: false,
    slots: [{ ...slot, slotIndex: 0, ...(targetDifficulty ? { targetDifficulty } : {}) }],
    schoolName: paper.schoolName,
    blueprintName: paper.blueprint.name,
    academicSession: paper.academicSession || paper.blueprint.academicSession,
    examType: paper.examType || paper.blueprint.examType,
    bookId: paper.blueprint.bookId,
    subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
    validBookChapterIds: new Set(paper.blueprint.chapters.map((c) => c.chapterId)),
    existingQuestionTexts: paper.items.flatMap((i) =>
      [i.question.text, i.orQuestion?.text].filter((t): t is string => Boolean(t && t.trim())),
    ),
    apiKey: apiKey ?? null,
  });
  if (!res.success || res.isMock || !Array.isArray(res.data) || res.data.length === 0) return null;
  return res.data[0];
}
