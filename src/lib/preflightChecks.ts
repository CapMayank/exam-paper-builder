import { computeDisplayedPaperNumbering } from "./layout";
import type { PaperStatus } from "./blueprint";
import type { PaperData } from "./types";

/** Text with its HTML tags and entities removed, spaces collapsed. */
export function plainText(html?: string | null): string {
  return (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PLACEHOLDER = /\[\s*(enter|type|write|insert|add|fill)\b[^\]]*\]|type the question here|enter the question text/i;

/** The first leftover placeholder (such as "[Enter statement here]") in some text, or null. */
export function findPlaceholder(text?: string | null): string | null {
  const m = plainText(text).match(PLACEHOLDER);
  return m ? m[0] : null;
}

/** True when a paper's placed marks differ from the paper's total. */
export function marksMismatch(progress: Pick<PaperStatus, "usedMarks" | "totalMarks">): boolean {
  return progress.usedMarks !== progress.totalMarks;
}

/** Why the marks block finalising, or null when they match. */
export function marksMismatchMessage(progress: Pick<PaperStatus, "usedMarks" | "totalMarks">): string | null {
  if (!marksMismatch(progress)) return null;
  return `The paper's questions add up to ${progress.usedMarks} marks, but the paper is set for ${progress.totalMarks}.`;
}

/** A paper that is not complete prints with a DRAFT mark: slots not full, or marks not matching. */
export function isDraftPaper(paper: Pick<PaperData, "progress">): boolean {
  return !paper.progress.complete || marksMismatch(paper.progress);
}

type InstructionLang = "en" | "hi" | "sa";

/**
 * General instructions written from the paper's own sections and numbering.
 * Internal choice is mentioned only when some question has an OR.
 */
export function buildGeneralInstructions(
  paper: Pick<PaperData, "blueprint" | "items" | "numberingStyle">,
  lang: InstructionLang = "en",
): string {
  const sections = paper.blueprint.sections;
  const numbering = computeDisplayedPaperNumbering(
    sections.map((s) => ({ id: s.id, title: s.title, type: s.type, order: s.position })),
    paper.items,
    paper.numberingStyle || "CONTINUOUS",
  );
  const hasChoice = paper.items.some((i) => i.orQuestion);
  const lines: string[] = [];
  const range = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);
  const used = sections.filter((s) => numbering.sectionRanges[s.id] && numbering.sectionRanges[s.id].displayedCount > 0);

  const T = {
    en: {
      all: "All questions are compulsory.",
      choice: "Internal choice is given in some questions.",
      sec: (t: string, r: string, m: number) => `${t}: Question ${r}, ${m} mark(s) each.`,
      fig: "Draw neat, labelled diagrams wherever necessary.",
    },
    hi: {
      all: "सभी प्रश्न अनिवार्य हैं।",
      choice: "कुछ प्रश्नों में आंतरिक विकल्प दिए गए हैं।",
      sec: (t: string, r: string, m: number) => `${t}: प्रश्न ${r}, प्रत्येक ${m} अंक।`,
      fig: "आवश्यकतानुसार स्वच्छ एवं नामांकित चित्र बनाइए।",
    },
    sa: {
      all: "सर्वे प्रश्नाः अनिवार्याः सन्ति।",
      choice: "केषुचित् प्रश्नेषु आन्तरिकविकल्पाः प्रदत्ताः सन्ति।",
      sec: (t: string, r: string, m: number) => `${t}: प्रश्नक्रमाङ्कः ${r}, प्रत्येकस्मिन् ${m} अङ्काः।`,
      fig: "आवश्यकतानुसारं स्पष्टाः नामाङ्किताः आकृतयः रचितव्याः।",
    },
  }[lang];

  lines.push(T.all);
  if (hasChoice) lines.push(T.choice);
  for (const s of used) {
    const r = numbering.sectionRanges[s.id];
    lines.push(T.sec(s.title, range(r.startQ, r.endQ), s.marksEach));
  }
  if (paper.items.some((i) => i.question.imagePath)) lines.push(T.fig);
  return lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
}
