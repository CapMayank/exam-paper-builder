import { isMcqLikeType, normalizeNumberingStyle } from "./constants";
import { computeDisplayedPaperNumbering, formatQuestionNumber } from "./layout";
import { detectPaperLanguage } from "./localization";
import type { PaperData } from "./types";

export type OmrItem = {
  /** 1-based row of the answer sheet */
  globalIndex: number;
  /** the question's printed label: "7", or "1 (iii)" for a part of a grouped question */
  label: string;
  itemId?: string;
  sectionTitle: string;
  type: string;
  optionCount?: number;
};

/**
 * The paper's objective (MCQ-like) answers as OMR rows, each labelled with the paper's own numbering, so a bubble row
 * reads "1 (iii)" exactly where the printed paper does. A section with nothing placed yet shows its planned slots.
 */
export function omrItems(paper: PaperData): OmrItem[] {
  const style = normalizeNumberingStyle(paper.numberingStyle);
  const numbering = computeDisplayedPaperNumbering(paper.blueprint.sections, paper.items, style, detectPaperLanguage(paper, paper.items));
  const rows: OmrItem[] = [];
  let lastNumber = 0;
  const push = (row: Omit<OmrItem, "globalIndex">) => rows.push({ ...row, globalIndex: rows.length + 1 });

  for (const s of paper.blueprint.sections) {
    const items = paper.items.filter((it) => it.sectionId === s.id).sort((a, b) => a.position - b.position);
    if (items.length === 0) {
      // a draft: the blueprint's planned slots, numbered after the last placed question
      for (let slot = 0; slot < s.count; slot++) {
        lastNumber += 1;
        if (isMcqLikeType(s.type)) {
          push({ label: formatQuestionNumber(style, lastNumber - 1), sectionTitle: s.title, type: s.type, itemId: `slot-${s.id}-${slot}` });
        }
      }
      continue;
    }
    for (const it of items) {
      const printed = numbering.itemNumbers[it.id];
      const label = printed?.displayLabel ?? formatQuestionNumber(style, lastNumber);
      lastNumber = Math.max(lastNumber, printed?.questionNumber ?? lastNumber + 1);
      const subparts: Array<{ label?: string; options?: unknown[] }> = Array.isArray(it.question.subparts)
        ? (it.question.subparts as never)
        : (() => {
            try {
              return JSON.parse((it.question as { subpartsJson?: string }).subpartsJson || "[]");
            } catch {
              return [];
            }
          })();
      const mcqSubparts = subparts.filter((sp) => Array.isArray(sp.options) && sp.options.length > 0);
      if (mcqSubparts.length > 0) {
        mcqSubparts.forEach((sp, spIdx) =>
          push({
            label: `${label}(${sp.label || spIdx + 1})`,
            itemId: `${it.id}-sp-${spIdx}`,
            sectionTitle: s.title,
            type: "MCQ",
            optionCount: Array.isArray(sp.options) ? sp.options.length : 4,
          }),
        );
      } else if (isMcqLikeType(it.question.type) || isMcqLikeType(s.type)) {
        push({
          label,
          itemId: it.id,
          sectionTitle: s.title,
          type: it.question.type || s.type,
          optionCount: Array.isArray(it.question.options) ? it.question.options.length : 4,
        });
      }
    }
  }
  return rows;
}
