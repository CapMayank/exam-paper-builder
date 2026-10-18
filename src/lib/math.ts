import katex from "katex";

export type MathSegment =
  | { type: "text"; text: string }
  | { type: "math"; tex: string; display: boolean; html: string };

const MATH_REGEX = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g;

/**
 * Parses a string into plain text segments and KaTeX rendered math segments.
 * Falls back gracefully to original TeX if rendering fails.
 */
export function parseMathSegments(input: string): MathSegment[] {
  if (!input) return [];

  const segments: MathSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  MATH_REGEX.lastIndex = 0;

  while ((match = MATH_REGEX.exec(input)) !== null) {
    const matchStart = match.index;
    const matchEnd = MATH_REGEX.lastIndex;

    // Push preceding text if any
    if (matchStart > lastIndex) {
      segments.push({
        type: "text",
        text: input.slice(lastIndex, matchStart),
      });
    }

    const isDisplay = match[1] !== undefined;
    const tex = (isDisplay ? match[1] : match[2])?.trim() ?? "";

    if (tex) {
      try {
        const html = katex.renderToString(tex, {
          displayMode: isDisplay,
          throwOnError: false,
          output: "htmlAndMathml",
        });
        segments.push({
          type: "math",
          tex,
          display: isDisplay,
          html,
        });
      } catch {
        // Fallback to raw text if KaTeX encounters an unhandled error
        segments.push({
          type: "text",
          text: match[0],
        });
      }
    } else {
      segments.push({
        type: "text",
        text: match[0],
      });
    }

    lastIndex = matchEnd;
  }

  // Push remaining text
  if (lastIndex < input.length) {
    segments.push({
      type: "text",
      text: input.slice(lastIndex),
    });
  }

  return segments;
}
