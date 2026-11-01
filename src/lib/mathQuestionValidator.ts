import type { GenerationContract } from "./curriculumContract";
import type { QuestionValidationIssue, ValidatableQuestion } from "./questionValidator";

/* ------------------------------------------------------------------ */
/* 1. Safe Recursive-Descent Arithmetic Evaluator (Zero eval())       */
/* ------------------------------------------------------------------ */

export type MathToken =
  | { type: "NUMBER"; value: number }
  | { type: "PLUS" }
  | { type: "MINUS" }
  | { type: "MUL" }
  | { type: "DIV" }
  | { type: "POW" }
  | { type: "LPAREN" }
  | { type: "RPAREN" };

/**
 * Normalizes mathematical strings (replacing LaTeX fractions, symbols, and whitespace)
 */
export function normalizeMathString(raw: string): string {
  let s = raw.trim();

  // Recursively expand LaTeX fractions \frac{num}{den} -> ((num)/(den))
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))");
  }

  return s
    .replace(/\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\cdot/g, "*")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/[\$\s]/g, "");
}

/**
 * Tokenizes a sanitized arithmetic expression
 */
export function tokenizeMath(str: string): MathToken[] | null {
  const tokens: MathToken[] = [];
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(str[i + 1] || ""))) {
      let numStr = "";
      while (i < str.length && /[0-9.]/.test(str[i])) {
        numStr += str[i];
        i++;
      }
      const val = parseFloat(numStr);
      if (isNaN(val)) return null;
      tokens.push({ type: "NUMBER", value: val });
      continue;
    }

    if (ch === "+") tokens.push({ type: "PLUS" });
    else if (ch === "-") tokens.push({ type: "MINUS" });
    else if (ch === "*") tokens.push({ type: "MUL" });
    else if (ch === "/") tokens.push({ type: "DIV" });
    else if (ch === "^") tokens.push({ type: "POW" });
    else if (ch === "(") tokens.push({ type: "LPAREN" });
    else if (ch === ")") tokens.push({ type: "RPAREN" });
    else {
      // Unrecognized character in arithmetic expression
      return null;
    }
    i++;
  }

  return tokens;
}

class MathParser {
  private pos = 0;
  constructor(private tokens: MathToken[]) {}

  parse(): number | null {
    if (this.tokens.length === 0) return null;
    try {
      const res = this.parseExpression();
      if (this.pos < this.tokens.length) return null;
      return res;
    } catch {
      return null;
    }
  }

  private peek(): MathToken | undefined {
    return this.tokens[this.pos];
  }

  private consume(): MathToken {
    return this.tokens[this.pos++];
  }

  // Expression := Term (('+' | '-') Term)*
  private parseExpression(): number {
    let left = this.parseTerm();
    while (this.peek()?.type === "PLUS" || this.peek()?.type === "MINUS") {
      const op = this.consume().type;
      const right = this.parseTerm();
      if (op === "PLUS") left += right;
      else left -= right;
    }
    return left;
  }

  // Term := Power (('*' | '/') Power)*
  private parseTerm(): number {
    let left = this.parsePower();
    while (this.peek()?.type === "MUL" || this.peek()?.type === "DIV") {
      const op = this.consume().type;
      const right = this.parsePower();
      if (op === "MUL") left *= right;
      else {
        if (Math.abs(right) < 1e-12) throw new Error("Division by zero");
        left /= right;
      }
    }
    return left;
  }

  // Power := Factor ('^' Power)? (right-associative)
  private parsePower(): number {
    const base = this.parseFactor();
    if (this.peek()?.type === "POW") {
      this.consume();
      const exp = this.parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  // Factor := ('+' | '-') Factor | Primary
  private parseFactor(): number {
    if (this.peek()?.type === "PLUS") {
      this.consume();
      return this.parseFactor();
    }
    if (this.peek()?.type === "MINUS") {
      this.consume();
      return -this.parseFactor();
    }
    return this.parsePrimary();
  }

  // Primary := NUMBER | '(' Expression ')'
  private parsePrimary(): number {
    const tok = this.peek();
    if (!tok) throw new Error("Unexpected end of expression");

    if (tok.type === "NUMBER") {
      this.consume();
      return tok.value;
    }

    if (tok.type === "LPAREN") {
      this.consume();
      const expr = this.parseExpression();
      if (this.peek()?.type !== "RPAREN") throw new Error("Expected closing parenthesis");
      this.consume();
      return expr;
    }

    throw new Error(`Unexpected token ${tok.type}`);
  }
}

/**
 * Safely evaluates an arithmetic expression without using eval().
 * Returns the numeric result or null if the expression is unparseable or contains non-arithmetic tokens.
 */
export function evaluateArithmeticExpression(rawExpr: string): number | null {
  const norm = normalizeMathString(rawExpr);
  if (!norm || norm.length === 0) return null;
  const tokens = tokenizeMath(norm);
  if (!tokens || tokens.length === 0) return null;
  const parser = new MathParser(tokens);
  return parser.parse();
}

/**
 * Scans text for explicit arithmetic equality statements (e.g. "15 * 12 = 170" or "25 + 15 = 40")
 * and validates that LHS equals RHS within tolerance.
 */
/**
 * Scans text for explicit arithmetic equality statements (e.g. "15 * 12 = 170" or "25 + 15 = 40")
 * and validates that LHS equals RHS within tolerance.
 */
export function validateArithmeticEquality(text: string): {
  isValid: boolean;
  statement?: string;
  lhs?: number;
  rhs?: number;
  error?: string;
} {
  // Extract math expressions inside $...$ or line segments
  const segments = text.split(/[\n$]/);

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed || !trimmed.includes("=")) continue;

    // Skip if segment contains calculus, integration limits, summation, vectors, matrices, or subscripts
    if (/\\int|\\sum|\\lim|\\left\\[|\\right\\]|\\frac\{d\}|d[xyz]\b|_|\\vec|\\mathbf|\\bmatrix|\\pmatrix/i.test(trimmed)) {
      continue;
    }

    // Split by '=' to inspect each adjacent equation step (supports chained equalities like A = B = 100 / 5 = 50 m/s)
    const eqParts = trimmed.split("=");
    if (eqParts.length >= 2) {
      for (let p = 0; p < eqParts.length - 1; p++) {
        let rawLhs = eqParts[p].trim();
        let rawRhs = eqParts[p + 1].trim();

        // Strip leading non-math words if LHS has prose context (e.g., "Solving gives 25 * 4", "The speed is 100 / 5")
        if (p === 0) {
          rawLhs = rawLhs.replace(/^.*?\b(?:is|as|gives|gives:|gives\s+\$|calculate:|solve:|evaluates to)\s*/i, "").trim();
          rawLhs = rawLhs.replace(/^[^0-9+\-*/^().\\a-z{}×÷$]+/, "").trim();
        }

        // Strip trailing units, punctuation, and prose from RHS (e.g., "50 m/s.", "115.", "20 units")
        rawRhs = rawRhs.replace(/\s*(?:m\/s|km\/h|cm|mm|m|km|s|sec|seconds?|kg|g|mg|N|J|W|V|A|Hz|Pa|mol|hours?|hrs?|min|minutes?|days?|years?|units?|°[CcFf]?|%|[a-zA-Z]+)?[.,;?!]?$/, "").trim();

        // At least one side must contain an arithmetic operator or be an arithmetic computation
        const hasArithmeticOp =
          /[+\-*/×÷]|\\times|\\div|\\cdot|\\frac/i.test(rawLhs) ||
          /[+\-*/×÷]|\\times|\\div|\\cdot|\\frac/i.test(rawRhs);

        if (!hasArithmeticOp) continue;

        let lhsVal = evaluateArithmeticExpression(rawLhs);
        if (lhsVal === null) {
          const trailingMath = rawLhs.replace(/^.*?\b(?:is|as|=|gives|gives:)\s*/i, "").trim();
          if (trailingMath && trailingMath !== rawLhs) {
            lhsVal = evaluateArithmeticExpression(trailingMath);
            if (lhsVal !== null) rawLhs = trailingMath;
          }
        }

        const rhsVal = evaluateArithmeticExpression(rawRhs);

        if (lhsVal !== null && rhsVal !== null && isFinite(lhsVal) && isFinite(rhsVal)) {
          if (Math.abs(lhsVal - rhsVal) > 1e-4) {
            return {
              isValid: false,
              statement: `${rawLhs} = ${rawRhs}`,
              lhs: lhsVal,
              rhs: rhsVal,
              error: `Arithmetic calculation error: ${rawLhs} evaluates to ${lhsVal}, but is claimed to equal ${rhsVal}.`,
            };
          }
        }
      }
    }
  }

  return { isValid: true };
}

/* ------------------------------------------------------------------ */
/* 2. Quadratic Equation Discriminant & Root Verifier                 */
/* ------------------------------------------------------------------ */

export interface QuadraticCoefficients {
  a: number;
  b: number;
  c: number;
  discriminant: number;
}

/**
 * Parses quadratic equations in form ax^2 + bx + c = 0 or similar.
 * Normalizes LaTeX exponents (x^{2} or x^2), signs, and whitespace.
 */
export function parseQuadraticEquation(text: string): QuadraticCoefficients | null {
  // Normalize LaTeX formatting and whitespace
  const norm = text
    .replace(/\\(?:mathbf|mathrm|text)\{([^}]+)\}/g, "$1")
    .replace(/x\^\{2\}/gi, "x^2")
    .replace(/X\^2/g, "x^2")
    .replace(/\s+/g, " ")
    .replace(/[\$]/g, "");

  // Match pattern: [a]x^2 [+/- b]x [+/- c] = 0
  const quadRegex =
    /([+-]?\s*\d*(?:\.\d+)?)?\s*x\^2\s*([+-]\s*\d*(?:\.\d+)?)?\s*x(?!\^)\s*([+-]\s*\d+(?:\.\d+)?)?\s*=\s*0/i;
  const match = norm.match(quadRegex);

  if (match) {
    const rawA = match[1]?.replace(/\s+/g, "");
    const a = !rawA || rawA === "+" ? 1 : rawA === "-" ? -1 : parseFloat(rawA);

    const rawB = match[2]?.replace(/\s+/g, "");
    const b = !rawB ? 0 : rawB === "+" ? 1 : rawB === "-" ? -1 : parseFloat(rawB);

    const rawC = match[3]?.replace(/\s+/g, "");
    const c = !rawC ? 0 : parseFloat(rawC);

    if (!isNaN(a) && !isNaN(b) && !isNaN(c) && a !== 0) {
      const discriminant = b * b - 4 * a * c;
      return { a, b, c, discriminant };
    }
  }

  // Alternate pattern: pure quadratic [a]x^2 [+/- c] = 0 (where b = 0)
  const pureQuadRegex = /([+-]?\s*\d*(?:\.\d+)?)?\s*x\^2\s*([+-]\s*\d+(?:\.\d+)?)\s*=\s*0/i;
  const matchPure = norm.match(pureQuadRegex);
  if (matchPure) {
    const rawA = matchPure[1]?.replace(/\s+/g, "");
    const a = !rawA || rawA === "+" ? 1 : rawA === "-" ? -1 : parseFloat(rawA);
    const rawC = matchPure[2]?.replace(/\s+/g, "");
    const c = !rawC ? 0 : parseFloat(rawC);
    if (!isNaN(a) && !isNaN(c) && a !== 0) {
      const discriminant = -4 * a * c;
      return { a, b: 0, c, discriminant };
    }
  }

  return null;
}

export function validateQuadraticQuestion(
  question: ValidatableQuestion,
  slotIdx: number,
  issues: QuestionValidationIssue[],
): void {
  const isMcq = question.type === "MCQ";
  // For MCQs, distractor options must not be treated as asserted mathematical claims.
  // Evaluate claims only against question.text, question.answer, or question.explanation.
  const claimSources = isMcq
    ? [question.text, question.answer, question.explanation]
    : [question.text, ...(question.options || []), question.answer, question.explanation];
  const fullText = claimSources.filter(Boolean).join(" ");

  // Target equation resolution:
  // If MCQ asks "which of the following" or "निम्न में से", the stem does not state the target equation;
  // look in answer / explanation first so distractor Option A isn't parsed instead.
  let targetEqText = fullText;
  if (isMcq && /which\s+of\s+the\s+following|निम्न\s+में\s+से/i.test(question.text)) {
    const ansExpText = [question.answer, question.explanation].filter(Boolean).join(" ");
    if (parseQuadraticEquation(ansExpText)) {
      targetEqText = ansExpText;
    }
  }

  const quad = parseQuadraticEquation(targetEqText) || parseQuadraticEquation(question.text);
  if (!quad) return;

  const D = quad.discriminant;

  // 1. Claims distinct real roots (requires D > 0)
  const claimsDistinctReal =
    /distinct\s+real\s+roots|two\s+(?:unequal\s+)?real\s+roots|भिन्न\s+वास्तविक\s+मूल|असमान\s+वास्तविक\s+मूल/i.test(
      fullText,
    );
  if (claimsDistinctReal && D <= 0) {
    issues.push({
      code: "MATH_EQUATION_DISCRIMINANT_MISMATCH",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Quadratic equation has discriminant D = ${D} (${D === 0 ? "equal roots" : "no real roots"}), but question claims two distinct real roots (D > 0 required).`,
      slotIndex: slotIdx,
    });
  }

  // 2. Claims equal real roots (requires D = 0)
  const claimsEqualRoots =
    /equal\s+real\s+roots|two\s+equal\s+roots|coincident\s+roots|बराबर\s+मूल|समान\s+वास्तविक\s+मूल/i.test(
      fullText,
    );
  if (claimsEqualRoots && Math.abs(D) > 1e-5) {
    issues.push({
      code: "MATH_EQUATION_DISCRIMINANT_MISMATCH",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Quadratic equation has discriminant D = ${D} != 0, but question claims equal real roots (D = 0 required).`,
      slotIndex: slotIdx,
    });
  }

  // 3. Claims no real roots / imaginary roots (requires D < 0)
  const claimsNoRealRoots =
    /no\s+real\s+roots|imaginary\s+roots|complex\s+roots|कोई\s+वास्तविक\s+मूल\s+नहीं|काल्पनिक\s+मूल/i.test(
      fullText,
    );
  if (claimsNoRealRoots && D >= 0) {
    issues.push({
      code: "MATH_EQUATION_DISCRIMINANT_MISMATCH",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Quadratic equation has discriminant D = ${D} >= 0 (has real roots), but question claims no real roots (D < 0 required).`,
      slotIndex: slotIdx,
    });
  }
}

/* ------------------------------------------------------------------ */
/* 3. Coordinate Geometry Evaluator (Distance & Midpoint)             */
/* ------------------------------------------------------------------ */

export interface CoordinatePoint {
  x: number;
  y: number;
}

export function extractCoordinatePoints(text: string): CoordinatePoint[] {
  const points: CoordinatePoint[] = [];
  const regex = /\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    points.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
  }
  return points;
}

export function validateCoordinateGeometryQuestion(
  question: ValidatableQuestion,
  slotIdx: number,
  issues: QuestionValidationIssue[],
): void {
  const text = question.text;
  const points = extractCoordinatePoints(text);
  if (points.length < 2) return;

  const [p1, p2] = points;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const trueDistanceSquared = dx * dx + dy * dy;
  const trueDistance = Math.sqrt(trueDistanceSquared);

  // 1. Distance formula verification
  const isDistanceQuestion =
    /distance\s+between|के\s+बीच\s+की\s+दूरी|दूरी\s+ज्ञात/i.test(text);

  if (isDistanceQuestion && question.answer) {
    // Check if stated answer contains a number or radical expression
    const ansClean = question.answer.replace(/[\$,]/g, "").trim();

    // Support simplified surds: a\sqrt{b}, a\sqrt b, a√b, or \sqrt{b}
    const surdMatch = ansClean.match(/(?:([0-9.]+)\s*)?(?:\\sqrt|√)\s*\{?([0-9.]+)\}?/i);
    let matchesSurd = false;
    if (surdMatch) {
      const coeff = surdMatch[1] ? parseFloat(surdMatch[1]) : 1;
      const radicand = parseFloat(surdMatch[2]);
      if (!isNaN(coeff) && !isNaN(radicand)) {
        const computedDist = coeff * Math.sqrt(radicand);
        const computedDistSq = coeff * coeff * radicand;
        matchesSurd =
          Math.abs(computedDist - trueDistance) < 0.05 ||
          Math.abs(computedDistSq - trueDistanceSquared) < 0.05;
      }
    }

    const ansMatch = ansClean.match(/[-+]?\d+(?:\.\d+)?/);
    if (ansMatch) {
      const statedNum = parseFloat(ansMatch[0]);
      // Compare either direct decimal/integer distance or squared distance (if in sqrt(d) form)
      const matchesDirect = Math.abs(statedNum - trueDistance) < 0.05;
      const matchesSquared = Math.abs(statedNum - trueDistanceSquared) < 0.05;
      const matchesSquareRootForm =
        /\\sqrt|√/i.test(ansClean) && Math.abs(statedNum - trueDistanceSquared) < 0.05;

      if (!matchesDirect && !matchesSquareRootForm && !matchesSurd && Math.abs(statedNum - trueDistance) > 0.05) {
        issues.push({
          code: "MATH_COORDINATE_GEOMETRY_ERROR",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: Stated distance between (${p1.x}, ${p1.y}) and (${p2.x}, ${p2.y}) is inconsistent with Euclidean formula d = sqrt((${p2.x}-${p1.x})^2 + (${p2.y}-${p1.y})^2) = ${trueDistance.toFixed(2)}.`,
          slotIndex: slotIdx,
        });
      }
    }
  }

  // 2. Midpoint formula verification
  const isMidpointQuestion = /midpoint|मध्य-?बिंदु|मध्यबिन्दु/i.test(text);
  if (isMidpointQuestion) {
    const expectedMidX = (p1.x + p2.x) / 2;
    const expectedMidY = (p1.y + p2.y) / 2;
    const ansPoints = extractCoordinatePoints(question.answer || "");
    if (ansPoints.length > 0) {
      const statedMid = ansPoints[0];
      if (
        Math.abs(statedMid.x - expectedMidX) > 0.05 ||
        Math.abs(statedMid.y - expectedMidY) > 0.05
      ) {
        issues.push({
          code: "MATH_COORDINATE_GEOMETRY_ERROR",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: Stated midpoint (${statedMid.x}, ${statedMid.y}) does not match formula ((x1+x2)/2, (y1+y2)/2) = (${expectedMidX}, ${expectedMidY}).`,
          slotIndex: slotIdx,
        });
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* 4. Variant Complexity Validator (Basic 101 vs Standard 100)        */
/* ------------------------------------------------------------------ */

export function validateMathematicsVariantAlignment(
  question: ValidatableQuestion,
  contract: GenerationContract,
  slotIdx: number,
  issues: QuestionValidationIssue[],
): void {
  const isBasic =
    contract.subjectCode === "101" ||
    contract.subjectVariant === "BASIC" ||
    /basic/i.test(contract.rawSubject || "");
  const isStandard =
    contract.subjectCode === "100" ||
    contract.subjectVariant === "STANDARD" ||
    /standard/i.test(contract.rawSubject || "");

  const marks = question.marks || contract.marksEach;
  const text = question.text;
  const normText = text
    .replace(/\\(?:text|mathrm|mathbf)\{([^}]+)\}/gi, "$1")
    .replace(/[\$]/g, "")
    .replace(/\s+/g, " ");

  // Basic Mathematics: Must NOT feature abstract proofs or irrationality proofs of roots
  if (isBasic) {
    if (
      /\bprove\s+that\s+\\sqrt\{\d+\}\s+is\s+(?:an?\s+)?irrational\b/i.test(normText) ||
      /\bprove\s+that\s+(?:root|√)\s*\d+\s+is\s+(?:an?\s+)?irrational\b/i.test(normText) ||
      /सिद्ध\s+कीजिए\s+कि\s+.*अपरिमेय/i.test(normText)
    ) {
      issues.push({
        code: "MATH_VARIANT_COMPLEXITY_MISMATCH",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Proof of irrationality of square roots is designated for Standard Mathematics (Code 100), not Basic Mathematics (Code 101).`,
        slotIndex: slotIdx,
      });
    }
  }

  // Standard Mathematics: 4-mark slots must not be trivial 1-step substitution
  if (isStandard && marks >= 4) {
    const isSingleStepArithmetic =
      /^\s*(?:find|calculate|evaluate)\s+the\s+value\s+of\s+[0-9+\-*\/ ]+\s*\.?$/i.test(normText) ||
      /^\s*मान\s+ज्ञात\s+कीजिए\s*:\s*[0-9+\-*\/ ]+\s*\.?$/i.test(normText);
    if (isSingleStepArithmetic) {
      issues.push({
        code: "MATH_VARIANT_COMPLEXITY_MISMATCH",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Standard Mathematics (Code 100) 4-mark question requires multi-step analytical problem solving, not a single-step calculation.`,
        slotIndex: slotIdx,
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* 5. Master Mathematics Academic Integrity Dispatcher                */
/* ------------------------------------------------------------------ */

export function validateMathematicsAcademicIntegrity(
  question: ValidatableQuestion,
  contract: GenerationContract,
  slotIdx: number,
  issues: QuestionValidationIssue[],
): void {
  const isMath =
    (contract.canonicalSubject && /math/i.test(contract.canonicalSubject)) ||
    contract.subjectCode === "100" ||
    contract.subjectCode === "101" ||
    contract.subjectCode === "150";

  if (!isMath) return;

  // 1. Explicit calculation equality verification (LHS = RHS)
  const fullText = [question.text, question.answer, question.explanation].filter(Boolean).join("\n");
  const eqRes = validateArithmeticEquality(fullText);
  if (!eqRes.isValid && eqRes.error) {
    issues.push({
      code: "MATH_CALCULATION_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: ${eqRes.error}`,
      slotIndex: slotIdx,
    });
  }

  // 2. Quadratic Equation Discriminant & Nature of Roots
  validateQuadraticQuestion(question, slotIdx, issues);

  // 3. Coordinate Geometry (Distance & Midpoint)
  validateCoordinateGeometryQuestion(question, slotIdx, issues);

  // 4. Variant Complexity Alignment (Basic vs Standard)
  validateMathematicsVariantAlignment(question, contract, slotIdx, issues);
}
