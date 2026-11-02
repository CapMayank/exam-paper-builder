import {
  type ChoicePolicy,
  type CurriculumGenerationPayload,
  resolveChapterCurriculumContextSync,
  resolveChoicePolicyForSlot,
} from "./curriculumContract";
import {
  resolveInternalChoiceRequirement,
  type InternalChoiceRequirement,
} from "./internalChoiceRules";
import { detectPaperLanguage, type PaperLanguage } from "./localization";
import type { PaperData, Section } from "./types";

export interface PaperAutogenSlot {
  slotId?: string;
  slotIndex: number;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  marks: number;
  requiresInternalChoice?: boolean;
  choicePolicy?: ChoicePolicy;
  curriculumPayload?: CurriculumGenerationPayload;
  /** Suggested syllabus component (language papers); the question is generated for it and tagged with it. */
  componentKey?: string;
  componentTitle?: string;
}

export interface PaperAutogenSectionPlan {
  sectionId: string;
  sectionTitle: string;
  sectionType: string;
  sectionInstructions?: string;
  marksEach: number;
  requiresInternalChoice?: boolean;
  internalChoiceRequirement?: InternalChoiceRequirement;
  totalQuestionsNeeded: number;
  alreadyPlacedCount: number;
  slots: PaperAutogenSlot[];
}

export interface PaperAutogenPlan {
  paperId: string;
  title: string;
  className: string;
  subject: string;
  bookTitle: string;
  language: PaperLanguage;
  totalMarksNeeded: number;
  totalQuestionsNeeded: number;
  sections: PaperAutogenSectionPlan[];
  chapterQuotas: Array<{
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    targetMarks: number;
    alreadyPlacedMarks: number;
    plannedMarks: number;
  }>;
}

export interface PaperAutogenInput {
  id: string;
  title: string;
  schoolName?: string | null;
  academicSession?: string | null;
  examType?: string | null;
  subjectCode?: string | null;
  blueprint: {
    name?: string | null;
    academicSession?: string | null;
    examType?: string | null;
    subjectCode?: string | null;
    sections: Array<{
      id: string;
      title: string;
      instructions?: string | null;
      type: string;
      count: number;
      marksEach: number;
      /** STANDARD | PASSAGE | GRAMMAR | WRITING | LITERATURE: what the section is for (language papers) */
      role?: string | null;
    }>;
    chapters: Array<{
      chapterId: string;
      marks: number;
      unitKey?: string | null;
      chapter: {
        id: string;
        number: number;
        title: string;
      };
    }>;
    book?: {
      className?: string;
      subject?: string;
      title?: string;
    } | null;
  };
  items: Array<{
    sectionId: string;
    question: {
      chapterId: string;
      text?: string | null;
      options?: string[];
    };
  }>;
}

/**
 * What kind of syllabus row a blueprint "chapter" is. Language papers carry exam components (unseen passage,
 * letter, essay, grammar) as chapters next to textbook lessons; a slot may only go to a row whose kind of
 * question it can actually be. Lessons take any question.
 */
export type ChapterRole = "PASSAGE" | "WRITING" | "GRAMMAR" | "MAP" | "LESSON";

const LANGUAGE_SUBJECT = /hindi|english|sanskrit|urdu|marathi|punjabi|gujarati|sindhi|हिंदी|हिन्दी|संस्कृत|अंग्रेजी/i;

/**
 * Every kind of question a row can hold. Most rows are one kind; a row such as "Reading (unseen passage 10 +
 * note-making 4)" is both a passage row and a writing row.
 */
export function chapterRoles(title: string, subject?: string | null): ChapterRole[] {
  const t = (title || "").toLowerCase();
  if (/मानचित्र|\bmap\b|map work/.test(t)) return ["MAP"];
  // passage, writing and grammar rows exist only on language papers; elsewhere such words are lesson titles
  if (subject && !LANGUAGE_SUBJECT.test(subject)) return ["LESSON"];
  const roles: ChapterRole[] = [];
  if (/अपठित|unseen|section a:\s*reading|reading.*passage/.test(t)) roles.push("PASSAGE");
  if (/पत्र\s*लेखन|आवेदन\s*पत्र|आवेदनपत्र|निबन्ध|निबंध|अनुच्छेद|संवाद\s*लेखन|लेखनम्|लेखन\s*कौशल|writing skill|section b:\s*writing|letter writing|essay writing|report writing|note[\s-]*making|\bnotice\b|\bposter\b|advertisement/.test(t)) roles.push("WRITING");
  if (roles.length > 0) return roles;
  if (/व्याकरण|grammar|शब्दरूप|धातुरूप|सन्धि|संधि|समास|प्रत्यय|उपसर्ग|अव्यय|पर्याय|विलोम|विशेषण|कारक|वाच्य|प्रश्ननिर्माण|एकपदेन|मुहावर|लोकोक्ति|अलंकार|छंद|छन्द|वर्तनी|वाक्य\s*भेद|पद\s*परिचय/.test(t)) return ["GRAMMAR"];
  return ["LESSON"];
}

export function chapterRole(title: string, subject?: string | null): ChapterRole {
  return chapterRoles(title, subject)[0];
}

/** The role a slot plays on its row: the section's own role when the row allows it, else the row's first role. */
export function slotRowRole(title: string, subject: string | null | undefined, sectionRole?: string | null): ChapterRole {
  const roles = chapterRoles(title, subject);
  return roles.find((r) => r === sectionRole) ?? roles[0];
}

const OBJECTIVE = new Set(["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "ASSERTION_REASON"]);

/** Can a question of this type and mark value belong to a row of this role? */
export function slotFitsRole(type: string, marks: number, role: ChapterRole): boolean {
  const objective = OBJECTIVE.has(type) || (type === "VERY_SHORT" && marks <= 1);
  switch (role) {
    case "PASSAGE":
      // an unseen passage is one passage question with its sub-parts, never a stand-alone objective item
      return type === "UNSEEN_PASSAGE" || (!objective && marks >= 3 && ["LONG", "SHORT", "CASE_STUDY"].includes(type));
    case "WRITING":
      return type === "WRITING_SKILL" || (!objective && marks >= 3 && ["LONG", "SHORT"].includes(type));
    case "MAP":
      return type === "MAP_WORK" || (!objective && marks >= 2 && ["LONG", "SHORT", "VERY_SHORT"].includes(type));
    case "GRAMMAR":
      return marks <= 3 && !["UNSEEN_PASSAGE", "WRITING_SKILL", "MAP_WORK", "CASE_STUDY", "REFERENCE_CONTEXT"].includes(type);
    default:
      return !["UNSEEN_PASSAGE", "WRITING_SKILL", "MAP_WORK"].includes(type);
  }
}

/**
 * Tells the model what a slot on this kind of row must be. Without it a grammar row or an unseen-passage row
 * reads like a textbook lesson, and the model writes lesson questions (or passage questions) in its place.
 */
export function slotTaskDirective(role: ChapterRole, rowTitle: string, type: string, marks: number, subject?: string | null): string {
  // outside language papers every row is a chapter, and the chapter title already says it all
  if (role === "LESSON" && !(subject && LANGUAGE_SUBJECT.test(subject))) return "";
  switch (role) {
    case "GRAMMAR":
      return `Grammar item on "${rowTitle}": test this grammar point directly with your own words or sentences (e.g. form, identify, join or change them). Do not base it on any passage, poem, story or textbook lesson, and do not refer to an unseen passage.`;
    case "PASSAGE":
      return type === "UNSEEN_PASSAGE"
        ? `Unseen passage worth ${marks} marks: write a new, original passage of ${marks >= 8 ? "180-220" : marks >= 5 ? "130-170" : "100-130"} words (count them; under 100 is rejected and over ${marks >= 8 ? 240 : marks >= 5 ? 190 : 150} is too long for the printed booklet), then sub-questions whose marks add up to exactly ${marks}.`
        : `Unseen passage worth ${marks} marks: write a NEW, ORIGINAL passage (100-150 words, not from any textbook or published text) in the paper's language as the question text, then put comprehension sub-questions in "subparts" (answerable from the passage alone) whose marks add up to exactly ${marks}.`;
    case "WRITING":
      return `Writing task on "${rowTitle}": set one realistic task in the paper's language (for a letter/application: who writes to whom and why; for an essay/paragraph: the topic with 3-4 guiding points). Do not ask about a textbook lesson. The answer is a complete model response in the correct format, followed by the marking scheme (format, content, expression) adding up to ${marks} marks.`;
    case "MAP":
      return `Map work: ask the student to locate and mark ${marks} specific places/features from "${rowTitle}" on an outline map of India; the answer lists each item and where it lies.`;
    default:
      return `Textbook-based: the question must come from the lesson "${rowTitle}" (its content, characters, ideas or language), not from grammar drills or unseen passages.`;
  }
}

/**
 * Plans the assignment of empty question slots in a paper to target chapters
 * based on the blueprint's chapter marks quota.
 *
 * Sorts unfilled slots by marks descending (e.g. 5m -> 4m -> 3m -> 2m -> 1m)
 * and greedily matches them to chapters with highest remaining quota to avoid
 * mark fragmentation.
 */
export function planPaperSlotAssignments(paper: PaperAutogenInput): PaperAutogenPlan {
  const { blueprint, items } = paper;
  const paperLang = detectPaperLanguage(paper, paper.items);
  const classLevel = parseInt((blueprint.book?.className || "").replace(/\D/g, "") || "10", 10);

  // 1. Compute already placed marks and count per chapter
  const placedMarksByChapter = new Map<string, number>();
  const marksBySection = new Map<string, number>(blueprint.sections.map((s) => [s.id, s.marksEach]));
  const placedCountBySection = new Map<string, number>();

  const sectionById = new Map(blueprint.sections.map((s) => [s.id, s]));

  for (const item of items) {
    const sec = sectionById.get(item.sectionId);
    const isMatch = sec?.type === "MATCH_COLUMN" || (item.question as any).type === "MATCH_COLUMN";
    const sectionMarks = marksBySection.get(item.sectionId) ?? 0;
    const chapId = item.question.chapterId;
    if (isMatch) {
      const units = sec?.count ?? 1;
      placedMarksByChapter.set(chapId, (placedMarksByChapter.get(chapId) ?? 0) + sectionMarks * units);
      placedCountBySection.set(item.sectionId, (placedCountBySection.get(item.sectionId) ?? 0) + units);
    } else {
      placedMarksByChapter.set(chapId, (placedMarksByChapter.get(chapId) ?? 0) + sectionMarks);
      placedCountBySection.set(item.sectionId, (placedCountBySection.get(item.sectionId) ?? 0) + 1);
    }
  }

  // 2. Track remaining quotas per chapter
  type ChapterState = {
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    targetMarks: number;
    alreadyPlacedMarks: number;
    remainingQuota: number;
    plannedMarks: number;
    /** chapters of the same unit: they share one budget */
    peers: ChapterState[];
    role: ChapterRole;
    roles: ChapterRole[];
  };

  const chapterMap = new Map<string, ChapterState>();
  for (const c of blueprint.chapters) {
    const alreadyPlaced = placedMarksByChapter.get(c.chapterId) ?? 0;
    chapterMap.set(c.chapterId, {
      chapterId: c.chapterId,
      chapterNumber: c.chapter.number,
      chapterTitle: c.chapter.title,
      targetMarks: c.marks,
      alreadyPlacedMarks: alreadyPlaced,
      remainingQuota: Math.max(0, c.marks - alreadyPlaced),
      plannedMarks: 0,
      peers: [],
      role: chapterRole(c.chapter.title, blueprint.book?.subject),
      roles: chapterRoles(c.chapter.title, blueprint.book?.subject),
    });
  }

  // lessons of one unit share a budget (the scheme allocates marks by unit)
  const unitGroups = new Map<string, ChapterState[]>();
  for (const c of blueprint.chapters) {
    const st = chapterMap.get(c.chapterId)!;
    const key = c.unitKey ? `u:${c.unitKey}` : `c:${c.chapterId}`;
    unitGroups.set(key, [...(unitGroups.get(key) ?? []), st]);
  }
  for (const group of unitGroups.values()) {
    const target = group.reduce((a, g) => a + g.targetMarks, 0);
    const placed = group.reduce((a, g) => a + g.alreadyPlacedMarks, 0);
    for (const g of group) {
      g.peers = group;
      g.remainingQuota = Math.max(0, target - placed);
    }
  }

  // Fallback chapter list if blueprint has chapters
  const allChapters = Array.from(chapterMap.values()).sort(
    (a, b) => a.chapterNumber - b.chapterNumber,
  );

  // 3. Build planning units for each section
  type PlanningUnit =
    | {
        kind: "SINGLE_SLOT";
        sectionId: string;
        sectionType: string;
        sectionRole: string;
        slotIndex: number;
        marksEach: number;
        totalMarks: number;
        globalOrder: number;
      }
    | {
        kind: "MATCH_GROUP";
        sectionId: string;
        sectionType: string;
        sectionRole: string;
        slotCount: number;
        marksEach: number;
        totalMarks: number;
        globalOrder: number;
      };

  const planningUnits: PlanningUnit[] = [];
  let globalOrderCounter = 0;

  for (const sec of blueprint.sections) {
    const placed = placedCountBySection.get(sec.id) ?? 0;
    const needed = Math.max(0, sec.count - placed);
    if (needed === 0) continue;

    // MATCH_COLUMN is generated and saved as a single combined question carrying all pairs.
    // Group all its pairs into one planning block so that its entire mark quota
    // (needed * marksEach) is assigned to a single chapter with sufficient weightage,
    // preventing mark fragmentation across chapters.
    if (sec.type === "MATCH_COLUMN") {
      planningUnits.push({
        kind: "MATCH_GROUP",
        sectionId: sec.id,
        sectionType: sec.type,
        sectionRole: sec.role || "STANDARD",
        slotCount: needed,
        marksEach: sec.marksEach,
        totalMarks: needed * sec.marksEach,
        globalOrder: globalOrderCounter++,
      });
    } else {
      for (let i = 0; i < needed; i++) {
        planningUnits.push({
          kind: "SINGLE_SLOT",
          sectionId: sec.id,
          sectionType: sec.type,
          sectionRole: sec.role || "STANDARD",
          slotIndex: placed + i,
          marksEach: sec.marksEach,
          totalMarks: sec.marksEach,
          globalOrder: globalOrderCounter++,
        });
      }
    }
  }

  // 4. Sort planning units descending by totalMarks to fill large mark allocations first
  const sortedUnits = [...planningUnits].sort((a, b) => {
    if (b.totalMarks !== a.totalMarks) return b.totalMarks - a.totalMarks;
    return a.globalOrder - b.globalOrder;
  });

  // 5. Assign planning units to chapters. A unit only goes to a row whose kind of question it can be
  //    (no MCQ on an unseen passage, no letter on a grammar row), and the quotas should come out exact.
  //    Search for an exact assignment first; if none exists, fall back to the closest fit.
  const unitAssignments = new Map<PlanningUnit, ChapterState>();
  // A section the blueprint marks as Grammar / Writing / Passage may only draw on rows of that kind, and a
  // Literature section only on textbook lessons. Applied only where the paper has such rows.
  const rowRoles = new Set(allChapters.flatMap((c) => c.roles));
  const sectionAllows = (sectionRole: string, c: ChapterState): boolean => {
    if (sectionRole === "GRAMMAR" || sectionRole === "WRITING" || sectionRole === "PASSAGE") {
      return !rowRoles.has(sectionRole) || c.roles.includes(sectionRole);
    }
    if (sectionRole === "LITERATURE") return !rowRoles.has("LESSON") || c.roles.includes("LESSON");
    return true;
  };
  const fits = (u: PlanningUnit, c: ChapterState) =>
    c.roles.some((r) => slotFitsRole(u.sectionType, u.marksEach, r)) && sectionAllows(u.sectionRole, c);
  const take = (u: PlanningUnit, c: ChapterState, sign: 1 | -1) => {
    for (const peer of c.peers) peer.remainingQuota -= sign * u.totalMarks;
    c.plannedMarks += sign * u.totalMarks;
  };

  const groups = [...new Set(allChapters.map((c) => c.peers))];
  // rows that only one kind of question can fill (passage, letter, essay, map) are served first
  const specialised = (c: ChapterState) => (c.roles.some((r) => r === "PASSAGE" || r === "WRITING" || r === "MAP") ? 0 : 1);
  // Relaxed pass: a match question is one question from one chapter, and when no chapter carries all its
  // pairs' marks an exact split is impossible. The match may then overshoot its chapter; every other unit
  // still stays within quota, and passage / writing / map rows must still be filled exactly.
  let relaxed = false;
  // every row still owed marks must be reachable by the units left to place (prunes hopeless branches early)
  const feasible = (from: number): boolean => {
    for (const g of groups) {
      const need = g[0].remainingQuota;
      if (need <= 0) continue;
      if (relaxed && specialised(g[0]) === 1) continue;
      let cap = 0;
      for (let j = from; j < sortedUnits.length && cap < need; j++) {
        if (g.some((c) => fits(sortedUnits[j], c))) cap += sortedUnits[j].totalMarks;
      }
      if (cap < need) return false;
    }
    return true;
  };

  // Within a unit (lessons sharing one budget) the question goes to the lesson that is furthest behind its
  // own share, so a paper covers the unit's lessons instead of piling every question onto the first one.
  const spreadWithinUnit = (u: PlanningUnit, c: ChapterState): ChapterState => {
    if (c.peers.length <= 1) return c;
    const members = c.peers.filter((m) => fits(u, m));
    if (members.length === 0) return c;
    return members.reduce((best, m) => {
      const lagM = m.targetMarks - m.alreadyPlacedMarks - m.plannedMarks;
      const lagB = best.targetMarks - best.alreadyPlacedMarks - best.plannedMarks;
      return lagM > lagB || (lagM === lagB && m.chapterNumber < best.chapterNumber) ? m : best;
    });
  };

  let budget = 200000;
  const search = (i: number): boolean => {
    if (i >= sortedUnits.length) return true;
    if (--budget < 0) return false;
    if (!feasible(i)) return false;
    const u = sortedUnits[i];
    const cands = allChapters
      .filter((c) => fits(u, c) && (c.remainingQuota >= u.totalMarks || (relaxed && u.kind === "MATCH_GROUP" && specialised(c) === 1)))
      .sort((x, y) => specialised(x) - specialised(y) || y.remainingQuota - x.remainingQuota || x.chapterNumber - y.chapterNumber);
    const tried = new Set<ChapterState[]>();
    for (const cand of cands) {
      // rows sharing one budget are interchangeable for feasibility; try the group once
      if (tried.has(cand.peers)) continue;
      tried.add(cand.peers);
      const c = spreadWithinUnit(u, cand);
      take(u, c, 1);
      unitAssignments.set(u, c);
      if (search(i + 1)) return true;
      unitAssignments.delete(u);
      take(u, c, -1);
    }
    return false;
  };

  const resetPlan = () => {
    unitAssignments.clear();
    for (const c of allChapters) {
      c.plannedMarks = 0;
      c.remainingQuota = Math.max(0, c.peers.reduce((acc, g) => acc + g.targetMarks - g.alreadyPlacedMarks, 0));
    }
  };
  let solved = allChapters.length === 0 || search(0);
  if (!solved && sortedUnits.some((u) => u.kind === "MATCH_GROUP")) {
    resetPlan();
    relaxed = true;
    budget = 200000;
    solved = search(0);
  }
  if (!solved) {
    resetPlan();
    for (const u of sortedUnits) {
      const byRemaining = (list: ChapterState[]) =>
        [...list].sort((x, y) => y.remainingQuota - x.remainingQuota || y.targetMarks - x.targetMarks || x.chapterNumber - y.chapterNumber);
      const fitting = allChapters.filter((c) => fits(u, c));
      const pool = fitting.length > 0 ? fitting : allChapters.filter((c) => c.roles.includes("LESSON") || c.roles.includes("GRAMMAR"));
      const chosen = spreadWithinUnit(
        u,
        byRemaining(pool.filter((c) => c.remainingQuota >= u.totalMarks))[0] ?? byRemaining(pool.length ? pool : allChapters)[0],
      );
      take(u, chosen, 1);
      unitAssignments.set(u, chosen);
    }
  }

  // 6. Assemble section plans
  const sectionPlans: PaperAutogenSectionPlan[] = blueprint.sections.map((sec) => {
    const placed = placedCountBySection.get(sec.id) ?? 0;
    const needed = Math.max(0, sec.count - placed);

    const choiceReq = resolveInternalChoiceRequirement({
      schoolName: paper.schoolName,
      blueprintName: blueprint.name,
      academicSession: paper.academicSession || blueprint.academicSession,
      className: blueprint.book?.className,
      subject: blueprint.book?.subject,
      subjectCode: paper.subjectCode || blueprint.subjectCode,
      examType: paper.examType || blueprint.examType,
      sectionTitle: sec.title,
      sectionInstructions: sec.instructions,
      questionType: sec.type,
      marksEach: sec.marksEach,
    });

    let sectionSlots: PaperAutogenSlot[] = [];

    if (sec.type === "MATCH_COLUMN") {
      const matchUnit = planningUnits.find(
        (u): u is Extract<PlanningUnit, { kind: "MATCH_GROUP" }> =>
          u.kind === "MATCH_GROUP" && u.sectionId === sec.id,
      );
      if (matchUnit && unitAssignments.has(matchUnit)) {
        const assignedChap = unitAssignments.get(matchUnit)!;
        sectionSlots = Array.from({ length: matchUnit.slotCount }, (_, idx) => {
          const sIdx = placed + idx;
          const slotId = `slot_${sec.id}_${sIdx}`;
          const choicePolicy = resolveChoicePolicyForSlot({
            marks: sec.marksEach,
            questionType: sec.type,
            requiresChoice: false,
            forbiddenChoice: true,
          });
          const currCtx = resolveChapterCurriculumContextSync({
            chapterNumber: assignedChap.chapterNumber,
            chapterTitle: assignedChap.chapterTitle,
            subject: blueprint.book?.subject,
            className: blueprint.book?.className,
          });
          const targetWordCount = sec.marksEach === 2 ? 30 : sec.marksEach === 3 ? 75 : sec.marksEach === 4 ? 120 : 150;
          const curriculumPayload: CurriculumGenerationPayload = {
            board: "MPBSE",
            academicSession: paper.academicSession || blueprint.academicSession || "2026-27",
            classLevel,
            subjectCode: paper.subjectCode || blueprint.subjectCode || "100",
            subjectVariant: (paper.subjectCode === "101" || /basic/i.test(blueprint.book?.subject || "")) ? "BASIC" : "STANDARD",
            chapterNumber: assignedChap.chapterNumber,
            chapterTitle: assignedChap.chapterTitle,
            officialMarksQuota: assignedChap.targetMarks,
            includedTopics: currCtx.includedTopics,
            excludedTopics: currCtx.excludedTopics,
            competencies: currCtx.competencies,
            slotId,
            questionType: sec.type,
            marks: sec.marksEach,
            targetWordCount,
            choicePolicy,
            language: paperLang,
          };
          return {
            slotId,
            slotIndex: sIdx,
            chapterId: assignedChap.chapterId,
            chapterNumber: assignedChap.chapterNumber,
            chapterTitle: assignedChap.chapterTitle,
            marks: sec.marksEach,
            requiresInternalChoice: false,
            choicePolicy,
            curriculumPayload,
          };
        });
      }
    } else {
      const singleUnits = planningUnits.filter(
        (u): u is Extract<PlanningUnit, { kind: "SINGLE_SLOT" }> =>
          u.kind === "SINGLE_SLOT" && u.sectionId === sec.id,
      );
      sectionSlots = singleUnits
        .sort((a, b) => a.slotIndex - b.slotIndex)
        .map((s) => {
          const assignedChap = unitAssignments.get(s)!;
          const slotId = `slot_${sec.id}_${s.slotIndex}`;
          const choicePolicy = resolveChoicePolicyForSlot({
            marks: s.marksEach,
            questionType: sec.type,
            requiresChoice: choiceReq.required,
            forbiddenChoice: choiceReq.forbidden,
          });
          const currCtx = resolveChapterCurriculumContextSync({
            chapterNumber: assignedChap.chapterNumber,
            chapterTitle: assignedChap.chapterTitle,
            subject: blueprint.book?.subject,
            className: blueprint.book?.className,
          });
          const targetWordCount = s.marksEach === 2 ? 30 : s.marksEach === 3 ? 75 : s.marksEach === 4 ? 120 : 150;
          const curriculumPayload: CurriculumGenerationPayload = {
            board: "MPBSE",
            academicSession: paper.academicSession || blueprint.academicSession || "2026-27",
            classLevel,
            subjectCode: paper.subjectCode || blueprint.subjectCode || "100",
            subjectVariant: (paper.subjectCode === "101" || /basic/i.test(blueprint.book?.subject || "")) ? "BASIC" : "STANDARD",
            chapterNumber: assignedChap.chapterNumber,
            chapterTitle: assignedChap.chapterTitle,
            officialMarksQuota: assignedChap.targetMarks,
            includedTopics: currCtx.includedTopics,
            excludedTopics: currCtx.excludedTopics,
            competencies: currCtx.competencies,
            slotId,
            questionType: sec.type,
            marks: s.marksEach,
            targetWordCount,
            choicePolicy,
            language: paperLang,
          };
          return {
            slotId,
            slotIndex: s.slotIndex,
            chapterId: assignedChap.chapterId,
            chapterNumber: assignedChap.chapterNumber,
            chapterTitle: assignedChap.chapterTitle,
            marks: s.marksEach,
            requiresInternalChoice: choiceReq.required,
            choicePolicy,
            curriculumPayload,
          };
        });
    }

    return {
      sectionId: sec.id,
      sectionTitle: sec.title,
      sectionType: sec.type,
      sectionInstructions: sec.instructions || undefined,
      marksEach: sec.marksEach,
      requiresInternalChoice: choiceReq.required,
      internalChoiceRequirement: choiceReq,
      totalQuestionsNeeded: needed,
      alreadyPlacedCount: placed,
      slots: sectionSlots,
    };
  });

  const totalMarksNeeded = sectionPlans.reduce(
    (acc, s) => acc + s.slots.reduce((m, sl) => m + sl.marks, 0),
    0,
  );
  const totalQuestionsNeeded = sectionPlans.reduce((acc, s) => acc + s.slots.length, 0);

  return {
    paperId: paper.id,
    title: paper.title,
    className: blueprint.book?.className || "Class",
    subject: blueprint.book?.subject || "Subject",
    bookTitle: blueprint.book?.title || "",
    language: detectPaperLanguage(paper, paper.items),
    totalMarksNeeded,
    totalQuestionsNeeded,
    sections: sectionPlans,
    chapterQuotas: allChapters.map((c) => ({
      chapterId: c.chapterId,
      chapterNumber: c.chapterNumber,
      chapterTitle: c.chapterTitle,
      targetMarks: c.targetMarks,
      alreadyPlacedMarks: c.alreadyPlacedMarks,
      plannedMarks: c.plannedMarks,
    })),
  };
}
