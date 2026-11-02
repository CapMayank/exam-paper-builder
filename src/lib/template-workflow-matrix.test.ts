import { describe, expect, it } from "vitest";
import {
  blueprintTotalMarks,
  checkBlueprintFeasibility,
  paperStatus,
  validateBlueprint,
  whyCannotAdd,
  type BlueprintDef,
  type PlacedItem,
} from "./blueprint";
import { autoFillPaper, type CandidateQuestion } from "./autofill";
import { LEGACY_STARTER_TEMPLATES, MPBSE_BLUEPRINT_TEMPLATES, type BlueprintTemplate } from "./curriculumTemplates";
import { questionSlotMarks } from "./blueprint";

/** Every built-in template must support the same workflow: define, validate, fill (auto and manual), total. */
const ALL: BlueprintTemplate[] = [...MPBSE_BLUEPRINT_TEMPLATES, ...LEGACY_STARTER_TEMPLATES].filter(
  (t) => !t.archetype.startsWith("KINDERGARTEN"),
);

function buildDef(t: BlueprintTemplate, chapterCount = 4): BlueprintDef {
  const sections = t.sections.flatMap((g, gi) =>
    g.questionTypes.map((q, qi) => ({
      id: `s${gi}_${qi}`,
      title: g.title,
      type: q.type,
      count: q.count,
      marksEach: q.marksEach,
      instructions: g.instructions,
      orChoiceMode: q.orChoiceMode ?? "BOARD_DEFAULT",
      role: q.role ?? "STANDARD",
    })),
  );
  const total = blueprintTotalMarks(sections);
  const base = Math.floor(total / chapterCount);
  const chapters = Array.from({ length: chapterCount }, (_, i) => ({
    chapterId: `c${i}`,
    marks: base + (i < total - base * chapterCount ? 1 : 0),
  }));
  return { sections, chapters };
}

/** Children of passage sections need a group id; parents do not. */
function bank(def: BlueprintDef): CandidateQuestion[] {
  const out: CandidateQuestion[] = [];
  let n = 0;
  for (const s of def.sections) {
    const isPassageChild = s.role === "PASSAGE" && !["UNSEEN_PASSAGE", "CASE_STUDY", "REFERENCE_CONTEXT"].includes(s.type);
    for (const ch of def.chapters) {
      for (let i = 0; i < s.count * 3; i++) {
        out.push({
          id: `q${n++}`,
          chapterId: ch.chapterId,
          type: s.type,
          passageGroupId: isPassageChild ? `g${n}` : null,
          matchPairs: s.type === "MATCH_COLUMN" ? s.count : undefined,
        });
      }
    }
  }
  return out;
}

describe.each(ALL.map((t) => [t.templateCode, t] as const))("template %s", (_code, t) => {
  const def = buildDef(t);

  it("is a valid blueprint whose sections add up to the declared total", () => {
    expect(validateBlueprint({ sections: def.sections, chapters: def.chapters } as never)).toEqual([]);
    expect(blueprintTotalMarks(def.sections)).toBe(t.totalMarks);
  });

  it("is structurally feasible against its chapter quotas", () => {
    expect(checkBlueprintFeasibility({ sections: def.sections, chapters: def.chapters } as never)).toEqual([]);
  });

  it("can be completed automatically from a question bank", () => {
    const res = autoFillPaper(def, [], bank(def));
    expect(res.unfilled, JSON.stringify(res.unfilled)).toEqual([]);
    expect(res.complete).toBe(true);
    const placed: PlacedItem[] = res.added.map((a) => {
      const sec = def.sections.find((x) => x.id === a.sectionId)!;
      const multi = sec.type === "MATCH_COLUMN" && sec.count > 1;
      return {
        sectionId: a.sectionId,
        chapterId: a.chapterId,
        marks: multi ? sec.count * sec.marksEach : sec.marksEach,
        subpartsCount: multi ? sec.count : undefined,
      };
    });
    expect(placed.reduce((sum, i) => sum + (i.marks ?? 0), 0)).toBe(t.totalMarks);
    const st = paperStatus(def, placed);
    expect(st.sections.every((s) => s.filled === s.needed)).toBe(true);
  });

  it("accepts a correctly typed question in each section and rejects a wrong type", () => {
    for (const s of def.sections) {
      const ok = whyCannotAdd(def, [], {
        sectionId: s.id,
        chapterId: def.chapters[0].chapterId,
        type: s.type,
        passageGroupId: s.role === "PASSAGE" && !["UNSEEN_PASSAGE", "CASE_STUDY", "REFERENCE_CONTEXT"].includes(s.type) ? "g" : null,
      });
      expect(ok, `${s.title} / ${s.type}: ${ok}`).toBeNull();
      const bad = whyCannotAdd(def, [], { sectionId: s.id, chapterId: def.chapters[0].chapterId, type: s.type === "LONG" ? "TRUE_FALSE" : "LONG" });
      expect(bad).not.toBeNull();
    }
  });

  it("a question's slot marks never exceed the slot", () => {
    for (const s of def.sections) {
      const m = questionSlotMarks(s, { type: s.type, text: "t", options: [], subparts: [{ marks: s.marksEach + 5 }] }).marks;
      const cap = s.type === "MATCH_COLUMN" && s.count > 1 ? s.count * s.marksEach : s.marksEach;
      expect(m).toBeLessThanOrEqual(cap);
    }
  });
});
