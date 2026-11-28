import { firstLetter } from "./hindi";
import { hashText } from "./seeded";

type Style = "CIRCLE" | "WRITE";
type Row = { word: string; choices: string[] };

/** The automatic instruction for each way of answering, in the words' own script. */
export const FIRST_LETTER_INSTRUCTIONS: Record<"latin" | "hindi", Record<Style, string>> = {
  latin: {
    CIRCLE: "Look at the pictures and circle the first letter:",
    WRITE: "Look at the pictures and write the first letter:",
  },
  hindi: {
    CIRCLE: "चित्र का पहला अक्षर गोला लगाइए (Circle the first letter of each picture's name):",
    WRITE: "चित्र का पहला अक्षर लिखिए (Write the first letter of each picture's name):",
  },
};

export const firstLetterInstruction = (latin: boolean, style: Style) => FIRST_LETTER_INSTRUCTIONS[latin ? "latin" : "hindi"][style];

/** Letters a child might mix up with the right one, used to fill a row that has too few to circle from. */
const LATIN_POOL = "BDPQMNWUVCGOEFHKLRSTAIJXYZ".split("");
const HINDI_POOL = ["क", "ग", "म", "न", "प", "ब", "र", "ल", "स", "ह", "त", "द", "च", "ज", "अ", "आ", "घ", "भ"];

/** A row's letters filled up to `want`, keeping the right letter and the ones already there. */
export function padChoices(row: Row, want = 3): string[] {
  const right = firstLetter(row.word);
  const out = [...new Set([...(right ? [right] : []), ...row.choices.map((c) => c.trim()).filter(Boolean)])];
  // keep the teacher's order when nothing needs adding
  if (out.length >= want) return row.choices.includes(right) || !right ? row.choices : out;
  const pool = /[A-Za-z]/.test(row.word) ? LATIN_POOL : HINDI_POOL;
  const start = hashText(row.word) % pool.length;
  for (let k = 0; out.length < want && k < pool.length; k++) {
    const c = pool[(start + k) % pool.length];
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

/**
 * The letters in the order they print: the right one moved to a spot that follows from the word,
 * so it isn't always first, and the same row always prints the same way.
 */
export function printedChoices(row: Row): string[] {
  const right = firstLetter(row.word);
  const at = row.choices.indexOf(right);
  if (!right || at < 0 || row.choices.length < 2) return row.choices;
  const others = row.choices.filter((_, i) => i !== at);
  const place = hashText(row.word.trim().toLowerCase()) % row.choices.length;
  return [...others.slice(0, place), right, ...others.slice(place)];
}
