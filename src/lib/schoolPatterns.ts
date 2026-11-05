/**
 * The school's own question-paper patterns for Classes 1–8 (MPBSE publishes none for these classes).
 *
 *   Classes 1–4, 50 marks: MCQ 5×1, Fill in the blanks 5×1, VSA 6×2, SA 6×3, LA 2×5  (24 questions)
 *   Classes 5–8, 60 marks: MCQ 5×1, Fill in the blanks 5×1, VSA 6×2, SA 6×3, LA 4×5  (26 questions)
 *
 * Section titles name the marks, not the form: each slot also accepts other forms at the same marks (grammar or a
 * passage in English, a map in SST; see sectionTypes.defaultAllowedTypes), so a form-named title would mislead.
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
      { title: "Section A – Objective Questions", instructions: "Choose the correct option.", questionTypes: [{ type: "MCQ", count: 5, marksEach: 1, orChoiceMode: "NOT_REQUIRED" }] },
      { title: "Section B – One-Mark Questions", instructions: "Fill in the blanks.", questionTypes: [{ type: "FILL_BLANK", count: 5, marksEach: 1, orChoiceMode: "NOT_REQUIRED" }] },
      { title: "Section C – Two-Mark Questions", instructions: "Answer in one or two sentences.", questionTypes: [{ type: "VERY_SHORT", count: 6, marksEach: 2, orChoiceMode: "NOT_REQUIRED" }] },
      { title: "Section D – Three-Mark Questions", instructions: "Answer in 30–40 words.", questionTypes: [{ type: "SHORT", count: 6, marksEach: 3, orChoiceMode: "NOT_REQUIRED" }] },
      { title: "Section E – Five-Mark Questions", instructions: "Answer in detail.", questionTypes: [{ type: "LONG", count: longCount, marksEach: 5, orChoiceMode: "NOT_REQUIRED" }] },
    ],
  };
}

type Row = BlueprintTemplate["sections"][number]["questionTypes"][number];
type SlotRole = NonNullable<Row["slotPlan"]>[number];
const SLOT: Record<string, SlotRole> = {
  L: { role: "LITERATURE" },
  G: { role: "GRAMMAR" },
  P: { role: "PASSAGE", type: "UNSEEN_PASSAGE" },
  W: { role: "WRITING", type: "WRITING_SKILL" },
  R: { role: "LITERATURE", type: "REFERENCE_CONTEXT" },
};
/**
 * One row of a section: all its slots under one heading and one count, `slots` naming each slot in question order
 * (L lesson, G grammar, P unseen passage, W writing, R reference to context from a lesson).
 */
const row = (type: Row["type"], marksEach: number, slots: string, groupKey: string): Row => {
  const plan = [...slots].map((c) => SLOT[c]);
  const mixed = plan.some((e) => e.role !== "LITERATURE" || e.type);
  return {
    type,
    count: plan.length,
    marksEach,
    orChoiceMode: "NOT_REQUIRED",
    role: "LITERATURE",
    groupKey,
    ...(mixed ? { slotPlan: plan } : {}),
  };
};

/**
 * English and Hindi (first language), Classes 5–8, as set by Rajya Shiksha Kendra M.P. (Annual Examination
 * 2025-26, Class 8 English 108149 and Hindi 108110): the same 60-mark grid, but some slots are not lesson
 * questions. Each section is one row (five MCQs, not four and one) whose slot plan names the slots that are not
 * lessons, so their marks go to the matching syllabus unit (unseen passage, writing, grammar) and never use up a
 * lesson's quota; a passage taken from a lesson would be a seen one.
 *
 *   English: Q1-5 MCQ (Q4 grammar) · Q6-10 blanks (Q9 homophones) · Q11-16 2 marks (Q14 grammar) · Q17-22 3 marks (Q20 grammar,
 *            Q22 unseen passage, 3 sub-questions) · Q23-26 5 marks (Q25 application, Q26 paragraph)
 *            lessons 40, grammar 7, unseen passage 3, writing 10
 *   Hindi:   Q1-5 बहुविकल्पीय (5 अलंकार) · Q6-10 रिक्त स्थान (10 उपसर्ग) · Q11-16 अति लघु (16 वर्तनी) ·
 *            Q17-22 लघु (20 अनेकार्थी, 22 पर्यायवाची, 21 अपठित गद्यांश) · Q23-26 दीर्घ (25 पत्र, 26 निबंध)
 *            पाठ 37, व्याकरण 10, अपठित 3, लेखन 10
 */
function languagePattern(lang: "English" | "Hindi"): BlueprintTemplate {
  const hi = lang === "Hindi";
  const t = hi
    ? {
        mcq: ["बहुविकल्पीय प्रश्न", "सही विकल्प चुनकर उत्तर लिखिए। प्रत्येक प्रश्न के लिए 1 अंक निर्धारित है।"],
        blank: ["रिक्त स्थान", "नीचे दिए गए रिक्त स्थानों की पूर्ति कीजिए। प्रत्येक प्रश्न के लिए 1 अंक निर्धारित है।"],
        vsa: ["अति लघु उत्तरीय प्रश्न", "नीचे दिए गए प्रश्नों के उत्तर एक शब्द/वाक्य में लिखिए। प्रत्येक प्रश्न के लिए 2 अंक निर्धारित हैं।"],
        sa: ["लघु उत्तरीय प्रश्न", "नीचे दिए गए प्रश्नों के उत्तर 30-40 शब्दों में लिखिए। प्रत्येक प्रश्न के लिए 3 अंक निर्धारित हैं।"],
        la: ["दीर्घ उत्तरीय प्रश्न", "नीचे दिए गए प्रश्नों के उत्तर 70-80 शब्दों में लिखिए। प्रत्येक प्रश्न के लिए 5 अंक निर्धारित हैं।"],
      }
    : {
        mcq: ["Multiple Choice Questions", "Choose and write the correct answer. Each question carries 1 mark."],
        blank: ["Fill in the blanks", "Each question carries 1 mark."],
        vsa: ["Very Short Answer Type Questions", "Answer the following questions in one word/sentence. Each question carries 2 marks."],
        sa: ["Short Answer Type Questions", "Answer the following questions. Each question carries 3 marks."],
        la: ["Long Answer Type Questions", "Answer the following questions. Each question carries 5 marks."],
      };
  const g = ([title, instructions]: string[], ...questionTypes: Row[]) => ({ title, instructions, questionTypes });
  const code = hi ? "hindi" : "english";
  return {
    id: `school-5-8-60m-${code}`,
    templateCode: `school-5-8-60m-${code}`,
    title: hi ? "School pattern, 60 marks – Hindi" : "School pattern, 60 marks – English",
    description: hi
      ? "Classes 5–8 Hindi, as Rajya Shiksha Kendra M.P. sets it: अपठित गद्यांश 3, पत्र और निबंध 10, व्याकरण 10, पाठ 37."
      : "Classes 5–8 English, as Rajya Shiksha Kendra M.P. sets it: unseen passage 3, application and paragraph 10, grammar 7, lessons 40.",
    examType: "ANNUAL",
    durationMin: 150,
    totalMarks: 60,
    targetClasses: "Class 5–8",
    subjectName: lang,
    language: hi ? "hi" : "en",
    archetype: "SCHOOL",
    sections: [
      // question order as the board prints it: English Q4 grammar, Hindi Q5 अलंकार, and so on
      g(t.mcq, row("MCQ", 1, hi ? "LLLLG" : "LLLGL", "mcq")),
      g(t.blank, row("FILL_BLANK", 1, hi ? "LLLLG" : "LLLGL", "fill-in-the-blanks")),
      g(t.vsa, row("VERY_SHORT", 2, hi ? "LLLLLG" : "LLLGLL", "very-short")),
      g(t.sa, row("SHORT", 3, hi ? "LLLGPG" : "LLLGLP", "short")),
      g(t.la, row("LONG", 5, "LLWW", "long")),
    ],
  };
}

/**
 * Sanskrit, Classes 6–8, as Rajya Shiksha Kendra M.P. sets it (Annual Examination 2025-26, Class 8 Sanskrit
 * 308135): the same 60-mark grid with its own spread.
 *   Q1-5 बहुविकल्पीयाः (5 लकार) · Q6-10 रिक्तस्थानानि (10 अव्यय) · Q11-16 अतिलघु-उत्तरीयाः (all from lessons) ·
 *   Q17-22 लघु-उत्तरीयाः (20 प्रत्यय/धातु/समास, 21 संख्या) · Q23 पद्यांश from a lesson · Q24 गद्यांश with five
 *   questions · Q25 पत्र (fill in) · Q26 पञ्च वाक्यानि on a topic
 *   पाठाः 37, व्याकरणम् 8, गद्यांश 5, रचनात्मक कार्यम् 10
 * Q24 is treated as the unseen passage (अपठित गद्यांश), so its marks go to that unit, not to a lesson.
 */
function sanskritPattern(): BlueprintTemplate {
  const g = (title: string, instructions: string, ...questionTypes: Row[]) => ({ title, instructions, questionTypes });
  return {
    id: "school-6-8-60m-sanskrit",
    templateCode: "school-6-8-60m-sanskrit",
    title: "School pattern, 60 marks – Sanskrit",
    description: "Classes 6–8 Sanskrit, as Rajya Shiksha Kendra M.P. sets it: अपठित गद्यांश 5, पत्र और अनुच्छेद 10, व्याकरणम् 8, पाठाः 37.",
    examType: "ANNUAL",
    durationMin: 150,
    totalMarks: 60,
    targetClasses: "Class 6–8",
    subjectName: "Sanskrit",
    language: "sa",
    archetype: "SCHOOL",
    sections: [
      g("बहुविकल्पीयप्रश्नाः", "उचितं विकल्पं चित्वा लिखत। प्रत्येकप्रश्नस्य कृते 1 अङ्कः निर्धारितः अस्ति।", row("MCQ", 1, "LLLLG", "mcq")),
      g("रिक्तस्थानानि", "उचितशब्दैः रिक्तस्थानानि पूरयत। प्रत्येकप्रश्नस्य कृते 1 अङ्कः निर्धारितः अस्ति।", row("FILL_BLANK", 1, "LLLLG", "fill-in-the-blanks")),
      g("अतिलघु-उत्तरीयप्रश्नाः", "अधोलिखितप्रश्नानाम् एकपदेन उत्तरं लिखत। प्रत्येकप्रश्नस्य कृते 2 अङ्कौ निर्धारितौ स्तः।", row("VERY_SHORT", 2, "LLLLLL", "very-short")),
      g("लघु-उत्तरीयप्रश्नाः", "अधोलिखितप्रश्नानाम् उत्तराणि एकवाक्येन लिखत। प्रत्येकप्रश्नस्य कृते 3 अङ्काः निर्धारिताः सन्ति।", row("SHORT", 3, "LLLGGL", "short")),
      g("दीर्घ-उत्तरीयप्रश्नाः", "अधोलिखितप्रश्नानाम् उत्तराणि संस्कृते लिखत। प्रत्येकप्रश्नस्य कृते 5 अङ्काः निर्धारिताः सन्ति।", row("LONG", 5, "RPWW", "long")),
    ],
  };
}

export const SCHOOL_PATTERNS: Array<{ levels: [number, number]; template: BlueprintTemplate }> = [
  { levels: [1, 4], template: schoolPattern([1, 4], 50, 2, 150) },
  { levels: [5, 8], template: languagePattern("English") },
  { levels: [5, 8], template: languagePattern("Hindi") },
  { levels: [6, 8], template: sanskritPattern() },
  { levels: [5, 8], template: schoolPattern([5, 8], 60, 4, 150) },
];

/** Marks of a pattern by role: what the lessons, grammar, unseen passage and writing each carry. */
export function marksByRole(template: Pick<BlueprintTemplate, "sections">): Record<string, number> {
  const out: Record<string, number> = {};
  for (const grp of template.sections) for (const q of grp.questionTypes) {
    for (let i = 0; i < q.count; i++) {
      const r = q.slotPlan?.[i]?.role ?? q.role ?? "STANDARD";
      out[r] = (out[r] ?? 0) + q.marksEach;
    }
  }
  return out;
}

/** The school's patterns for a class, those made for the subject first; subject-specific ones only for their subject. */
export function schoolPatternsForLevel(level: number | null, subject?: string | null): BlueprintTemplate[] {
  if (level === null) return [];
  const sub = (subject ?? "").toLowerCase();
  const named: Record<string, RegExp> = { Hindi: /hindi|हिंदी|हिन्दी/, Sanskrit: /sanskrit|संस्कृत/, English: /english|अंग्रेजी/ };
  const forSubject = (t: BlueprintTemplate) =>
    !t.subjectName || (named[t.subjectName] ?? new RegExp(t.subjectName.toLowerCase())).test(sub);
  return SCHOOL_PATTERNS.filter((p) => level >= p.levels[0] && level <= p.levels[1] && forSubject(p.template))
    .map((p) => p.template)
    .sort((x, y) => Number(Boolean(y.subjectName)) - Number(Boolean(x.subjectName)));
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
