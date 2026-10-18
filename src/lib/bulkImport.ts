import { DIFFICULTIES, QUESTION_TYPES, type QuestionType } from "./constants";

export interface ParsedQuestionItem {
  type: QuestionType;
  text: string;
  options: string[];
  answer: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  spaceMm: number;
  showGrid: boolean;
}

const DEFAULT_SPACE: Record<string, number> = { SHORT: 20, LONG: 60, DRAW: 70, MCQ: 0, TRUE_FALSE: 0, FILL_BLANK: 0 };
const LETTERS = "ABCDEF";

/**
 * Parses free-form text blocks into structured question objects.
 * Supports blocks separated by '---' or double blank lines.
 */
export function parseBulkQuestions(rawText: string, fallbackType: QuestionType = "SHORT"): ParsedQuestionItem[] {
  if (!rawText || !rawText.trim()) return [];

  // Split by markdown delimiter '---' or 2+ consecutive blank lines
  const rawBlocks = rawText
    .split(/\r?\n\s*---\s*\r?\n|\r?\n\s*\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const parsedItems: ParsedQuestionItem[] = [];

  for (const block of rawBlocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let type: QuestionType = fallbackType;
    let text = "";
    const options: string[] = [];
    let answer = "";
    let difficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM";
    let spaceMm = DEFAULT_SPACE[fallbackType] ?? 0;
    let showGrid = false;

    let capturingQuestion = false;
    const questionLines: string[] = [];

    for (const line of lines) {
      // Type: ...
      const typeMatch = line.match(/^Type\s*:\s*([A-Za-z_]+)/i);
      if (typeMatch) {
        let matched = typeMatch[1].toUpperCase();
        if (matched === "DRAWING" || matched === "DIAGRAM") matched = "DRAW";
        if (matched === "MCQS") matched = "MCQ";
        if (QUESTION_TYPES.includes(matched as QuestionType)) {
          type = matched as QuestionType;
          spaceMm = DEFAULT_SPACE[type] ?? 0;
        }
        capturingQuestion = false;
        continue;
      }

      // Diff / Difficulty: ...
      const diffMatch = line.match(/^Diff(?:iculty)?\s*:\s*([A-Za-z]+)/i);
      if (diffMatch) {
        const matched = diffMatch[1].toUpperCase();
        if (DIFFICULTIES.includes(matched as "EASY" | "MEDIUM" | "HARD")) {
          difficulty = matched as "EASY" | "MEDIUM" | "HARD";
        }
        capturingQuestion = false;
        continue;
      }

      // Space / SpaceMm: ...
      const spaceMatch = line.match(/^Space(?:Mm)?\s*:\s*(\d+)/i);
      if (spaceMatch) {
        spaceMm = parseInt(spaceMatch[1], 10);
        capturingQuestion = false;
        continue;
      }

      // Grid: true / false
      const gridMatch = line.match(/^Grid\s*:\s*(true|yes|1)/i);
      if (gridMatch) {
        showGrid = true;
        capturingQuestion = false;
        continue;
      }

      // Ans / Answer: ...
      const ansMatch = line.match(/^Ans(?:wer)?\s*:\s*(.*)/i);
      if (ansMatch) {
        answer = ansMatch[1].trim();
        capturingQuestion = false;
        continue;
      }

      // MCQ Option lines: A: ... or (A) ... or A. ...
      const optMatch = line.match(/^(?:Option\s*)?\(?([A-F])\)?[\.\:\)]\s*(.*)/i);
      if (optMatch) {
        const letter = optMatch[1].toUpperCase();
        const letterIdx = LETTERS.indexOf(letter);
        if (letterIdx >= 0 && optMatch[2].trim()) {
          options[letterIdx] = optMatch[2].trim();
          type = "MCQ";
        }
        capturingQuestion = false;
        continue;
      }

      // Q: or Question: ...
      const qMatch = line.match(/^Q(?:uestion)?\s*:\s*(.*)/i);
      if (qMatch) {
        capturingQuestion = true;
        questionLines.push(qMatch[1].trim());
        continue;
      }

      // If we are currently capturing multi-line question text
      if (capturingQuestion) {
        questionLines.push(line);
      } else if (!text && questionLines.length === 0) {
        // First unrecognized line is treated as the start of the question text
        capturingQuestion = true;
        questionLines.push(line);
      }
    }

    text = questionLines.join("\n").trim();

    if (!text) continue;

    // Filter out empty holes in options array for MCQ
    const cleanOptions = options.filter(Boolean);

    // If answer is full text matching an MCQ option, convert to letter
    if (type === "MCQ" && answer && !LETTERS.includes(answer.toUpperCase())) {
      const matchIdx = cleanOptions.findIndex((o) => o.toLowerCase() === answer.toLowerCase());
      if (matchIdx >= 0) {
        answer = LETTERS[matchIdx];
      }
    }

    parsedItems.push({
      type,
      text,
      options: type === "MCQ" ? cleanOptions : [],
      answer: type === "MCQ" ? answer.toUpperCase() : answer,
      difficulty,
      spaceMm,
      showGrid,
    });
  }

  return parsedItems;
}
