import { describe, expect, it } from "vitest";
import { coverageRows } from "./coverage";

type In = Parameters<typeof coverageRows>[0];

const paper = (
  chapters: Array<{ chapterId: string; marks: number; number: number; title: string; unitKey?: string; unitTitle?: string }>,
  progress: Array<{ chapterId: string; target: number; used: number }>,
  itemChapterIds: string[] = [],
) =>
  ({
    blueprint: { chapters: chapters.map((c) => ({ ...c, chapter: { id: c.chapterId, number: c.number, title: c.title } })) },
    progress: { chapters: progress },
    items: itemChapterIds.map((id) => ({ question: { chapterId: id } })),
  }) as unknown as In;

describe("coverageRows", () => {
  it("groups lessons of one unit into a single row named after the unit", () => {
    const res = coverageRows(
      paper(
        [
          { chapterId: "a1", marks: 2, number: 1, title: "Lesson one", unitKey: "u", unitTitle: "Unit A" },
          { chapterId: "a2", marks: 3, number: 2, title: "Lesson two", unitKey: "u", unitTitle: "Unit A" },
          { chapterId: "b", marks: 4, number: 3, title: "[Poem] The Tree" },
        ],
        [
          { chapterId: "a1", target: 5, used: 5 },
          { chapterId: "a2", target: 5, used: 5 },
          { chapterId: "b", target: 4, used: 4 },
        ],
      ),
    );
    expect(res.rows.map((r) => r.title)).toEqual(["Unit A", "The Tree"]);
    expect(res.rows[0]).toMatchObject({ target: 5, used: 5 });
  });

  it("marks a row off only when it is more than 1 mark from its target", () => {
    const res = coverageRows(
      paper(
        [{ chapterId: "a", marks: 5, number: 1, title: "A" }, { chapterId: "b", marks: 5, number: 2, title: "B" }, { chapterId: "c", marks: 5, number: 3, title: "C" }],
        [{ chapterId: "a", target: 5, used: 4 }, { chapterId: "b", target: 5, used: 7 }, { chapterId: "c", target: 5, used: 3 }],
      ),
    );
    expect(res.rows.map((r) => r.off)).toEqual([false, true, true]);
  });

  it("counts questions from a chapter the blueprint does not list, and gives them no row", () => {
    const res = coverageRows(
      paper([{ chapterId: "a", marks: 5, number: 1, title: "A" }], [{ chapterId: "a", target: 5, used: 5 }], ["a", "elsewhere", "elsewhere"]),
    );
    expect(res.outsideCount).toBe(2);
    expect(res.rows).toHaveLength(1);
  });

  it("lists under-covered chapters, the largest gap first, one per unit", () => {
    const res = coverageRows(
      paper(
        [
          { chapterId: "a", marks: 5, number: 1, title: "A" },
          { chapterId: "b", marks: 5, number: 7, title: "B" },
          { chapterId: "u1", marks: 2, number: 3, title: "U1", unitKey: "u", unitTitle: "U" },
          { chapterId: "u2", marks: 2, number: 4, title: "U2", unitKey: "u", unitTitle: "U" },
        ],
        [
          { chapterId: "a", target: 5, used: 4 },
          { chapterId: "b", target: 5, used: 1 },
          { chapterId: "u1", target: 4, used: 3 },
          { chapterId: "u2", target: 4, used: 3 },
        ],
      ),
    );
    expect(res.underCovered).toEqual([
      { chapterId: "b", number: 7 },
      { chapterId: "a", number: 1 },
      { chapterId: "u1", number: 3 },
    ]);
  });

  it("hides chapters with no target and no marks", () => {
    const res = coverageRows(paper([{ chapterId: "a", marks: 0, number: 1, title: "A" }], [{ chapterId: "a", target: 0, used: 0 }]));
    expect(res.rows).toEqual([]);
  });
});
