import { questionSlotMarks } from "./blueprint";
import type { DisplayedPaperNumbering } from "./layout";
import type { PaperLocaleDictionary } from "./localization/types";

/**
 * What each heading level prints for one section row. A paper has three levels that can describe a section: the
 * section band ("SECTION B ······ 8 Questions · 8 Marks"), the type sub-band of a heading that mixes forms, and the
 * line of a grouped question ("2. Fill in the blanks … (6 × 1 = 6)"). Each fact is printed once, by the level that
 * owns it:
 * - a heading of separate questions: the band owns the instruction and the count; each question shows its own marks.
 * - a heading that numbers one question (a grouped question, a match, a single long answer): that question's own line
 *   owns its marks, so the band prints the heading's name alone. A grouped question's line also owns the instruction,
 *   as does a match, whose stem is its instruction ("Match Column I with Column II").
 * - a heading that mixes forms: a run of several separate questions gets a "form · formula" sub-band; a run that is one
 *   question gets none, since that question's line already names and marks itself.
 */
export interface SectionHeadingPlan {
  /** this row opens its heading, so the section band is printed above it */
  showBand: boolean;
  /** the band's right-hand label; empty when the heading numbers one question, whose own line carries the marks */
  bandSummary: string;
  /** the band prints the heading's instruction line (unless a grouped first row or a lone match carries it) */
  showBandInstruction: boolean;
  /** a "form · formula" sub-band precedes this row (mixed-form headings, runs of several separate questions only) */
  showTypeSubBand: boolean;
  /** the row prints as one numbered question with lettered parts */
  grouped: boolean;
}

type PlanSection = Parameters<typeof questionSlotMarks>[0] & { id: string; title: string; type: string };
type PlanItem = { sectionId?: string | null; question: Parameters<typeof questionSlotMarks>[1] };

const headingKey = (title: string) => title.trim().toLowerCase();

/**
 * The heading plan of every row, keyed by section id. `sections` are the rows in print order (after same-form rows are
 * merged); consecutive rows with one title form one heading. A worksheet prints no section headings at all.
 * A band's count and marks both describe the questions placed, so they add up to the marks printed beside them; a
 * heading with nothing placed yet shows what its blueprint plans.
 */
export function planSectionHeadings(
  sections: PlanSection[],
  items: PlanItem[],
  numbering: DisplayedPaperNumbering,
  locale: PaperLocaleDictionary,
  opts: { worksheet?: boolean } = {},
): Record<string, SectionHeadingPlan> {
  const plans: Record<string, SectionHeadingPlan> = {};
  let i = 0;
  while (i < sections.length) {
    let j = i;
    while (j + 1 < sections.length && headingKey(sections[j + 1].title) === headingKey(sections[i].title)) j++;
    const heading = sections.slice(i, j + 1);
    const first = heading[0];
    const range = numbering.sectionRanges[first.id];
    const placed = heading.flatMap((s) =>
      items.filter((it) => it.sectionId === s.id).map((it) => questionSlotMarks(s, it.question).marks),
    );
    const displayed = range?.groupDisplayedCount ?? 0;
    const oneQuestion = displayed === 1;
    const bandSummary = oneQuestion
      ? ""
      : placed.length > 0
        ? locale.section.formatGroupSummary(displayed, placed.reduce((sum, m) => sum + m, 0), { displayedCount: displayed })
        : locale.section.formatGroupSummary(
            heading.reduce((sum, s) => sum + s.count, 0),
            heading.reduce((sum, s) => sum + s.count * s.marksEach, 0),
          );
    const firstGrouped = Boolean(range?.isGroupedExercise);
    const loneMatch = oneQuestion && first.type === "MATCH_COLUMN";
    const mixed = heading.length > 1;

    heading.forEach((s, k) => {
      const row = numbering.sectionRanges[s.id];
      const grouped = Boolean(row?.isGroupedExercise);
      plans[s.id] = {
        showBand: !opts.worksheet && k === 0,
        bandSummary,
        showBandInstruction: !firstGrouped && !loneMatch,
        showTypeSubBand: !opts.worksheet && mixed && !grouped && row?.displayedCount !== 1,
        grouped,
      };
    });
    i = j + 1;
  }
  return plans;
}
