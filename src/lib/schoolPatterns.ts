/**
 * The school's own question-paper patterns for Classes 1–8 (MPBSE publishes none for these classes).
 *
 *   Classes 1–4, 50 marks: MCQ 5×1, Fill in the blanks 5×1, VSA 6×2, SA 6×3, LA 2×5  (24 questions)
 *   Classes 5–8, 60 marks: MCQ 5×1, Fill in the blanks 5×1, VSA 6×2, SA 6×3, LA 4×5  (26 questions)
 *
 * Every question of the school's blueprint grid also names its content (chapter), difficulty (Easy / Average /
 * Difficult) and skill (Knowledge / Understanding / Applying / HOTS); those are carried by the questions.
 */
import type { BlueprintTemplate } from "./curriculumTemplates";

function schoolPattern(range: [number, number], totalMarks: number, longCount: number, durationMin: number): BlueprintTemplate {
  const [from, to] = range;
  return {
    id: `school-${from}-${to}-${totalMarks}m`,
    templateCode: `school-${from}-${to}-${totalMarks}m`,
    title: `School pattern, ${totalMarks} marks`,
    description: `Classes ${from}–${to}: MCQ, fill in the blanks, very short, short and long answers.`,
    examType: "ANNUAL",
    durationMin,
    totalMarks,
    targetClasses: `Class ${from}–${to}`,
    archetype: "SCHOOL",
    sections: [
      { title: "Section A – Multiple Choice Questions", instructions: "Choose the correct option.", questionTypes: [{ type: "MCQ", count: 5, marksEach: 1, orChoiceMode: "NOT_REQUIRED" }] },
      { title: "Section B – Fill in the Blanks", instructions: "Fill in the blanks.", questionTypes: [{ type: "FILL_BLANK", count: 5, marksEach: 1, orChoiceMode: "NOT_REQUIRED" }] },
      { title: "Section C – Very Short Answer Questions", instructions: "Answer in one or two sentences.", questionTypes: [{ type: "VERY_SHORT", count: 6, marksEach: 2, orChoiceMode: "NOT_REQUIRED" }] },
      { title: "Section D – Short Answer Questions", instructions: "Answer in 30–40 words.", questionTypes: [{ type: "SHORT", count: 6, marksEach: 3, orChoiceMode: "NOT_REQUIRED" }] },
      { title: "Section E – Long Answer Questions", instructions: "Answer in detail.", questionTypes: [{ type: "LONG", count: longCount, marksEach: 5, orChoiceMode: "NOT_REQUIRED" }] },
    ],
  };
}

export const SCHOOL_PATTERNS: Array<{ levels: [number, number]; template: BlueprintTemplate }> = [
  { levels: [1, 4], template: schoolPattern([1, 4], 50, 2, 150) },
  { levels: [5, 8], template: schoolPattern([5, 8], 60, 4, 150) },
];

export function schoolPatternsForLevel(level: number | null): BlueprintTemplate[] {
  if (level === null) return [];
  return SCHOOL_PATTERNS.filter((p) => level >= p.levels[0] && level <= p.levels[1]).map((p) => p.template);
}

/**
 * Chapter marks that a paper can actually meet: every question slot is handed whole to one chapter (largest
 * marks first, always to the chapter with the fewest marks so far), so each chapter's quota is a sum of real
 * question marks. An even split (60 marks / 15 chapters = 4 each) would leave no chapter able to take a 5-mark
 * question. Returns marks per chapter id; chapters given no slot get 0.
 */
export function distributeSlotMarks(slotMarks: number[], chapterIds: string[]): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(chapterIds.map((id) => [id, 0]));
  if (chapterIds.length === 0) return out;
  const slots = [...slotMarks].filter((m) => m > 0).sort((a, b) => b - a);
  for (const m of slots) {
    let best = chapterIds[0];
    for (const id of chapterIds) if (out[id] < out[best]) best = id;
    out[best] += m;
  }
  return out;
}

/** One entry per question slot: its marks. */
export function slotMarksOf(sections: Array<{ count: number; marksEach: number }>): number[] {
  return sections.flatMap((s) => Array<number>(Math.max(0, s.count)).fill(s.marksEach));
}
