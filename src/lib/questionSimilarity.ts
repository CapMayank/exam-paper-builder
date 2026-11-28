export const SIMILAR_SHOW = 0.6;
export const SIMILAR_OPEN = 0.75;
export const SIMILAR_CONFIRM = 0.9;
export const SIMILAR_MIN_TOKENS = 4;

export type SimilarCandidate = {
  id: string;
  text: string;
  tokens?: Set<string>;
};

export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensFromNormalized(normalized: string): Set<string> {
  if (!normalized) return new Set();
  const tokens = new Set<string>();
  for (const token of normalized.split(" ")) {
    if ([...token].length >= 2 && !/^\p{N}$/u.test(token)) {
      tokens.add(token);
    }
  }
  return tokens;
}

export function questionTokens(text: string): Set<string> {
  return tokensFromNormalized(normalizeQuestionText(text));
}

export function similarity(a: string | Set<string>, b: string | Set<string>): number {
  let tokensA: Set<string>;
  let tokensB: Set<string>;

  if (typeof a === "string" && typeof b === "string") {
    const normA = normalizeQuestionText(a);
    const normB = normalizeQuestionText(b);
    if (!normA || !normB) return 0;
    if (normA === normB) return 1;
    tokensA = tokensFromNormalized(normA);
    tokensB = tokensFromNormalized(normB);
  } else {
    tokensA = typeof a === "string" ? questionTokens(a) : a;
    tokensB = typeof b === "string" ? questionTokens(b) : b;
  }

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  const [smaller, larger] = tokensA.size <= tokensB.size ? [tokensA, tokensB] : [tokensB, tokensA];
  let common = 0;
  for (const token of smaller) {
    if (larger.has(token)) common++;
  }
  return (2 * common) / (tokensA.size + tokensB.size);
}

export function prepareCandidates<T extends { id: string; text: string }>(
  items: T[],
): (T & { tokens: Set<string> })[] {
  return items.map((item) => ({
    ...item,
    tokens: questionTokens(item.text),
  }));
}

export function findSimilar<T extends SimilarCandidate>(
  text: string,
  candidates: T[],
  opts?: {
    limit?: number;
    minScore?: number;
    excludeIds?: string[];
    minTokens?: number;
  },
): { item: T; score: number }[] {
  const limit = opts?.limit ?? 3;
  const minScore = opts?.minScore ?? SIMILAR_SHOW;
  const minTokens = opts?.minTokens ?? SIMILAR_MIN_TOKENS;
  const excluded = opts?.excludeIds ? new Set(opts.excludeIds) : null;

  const queryTokens = questionTokens(text);
  if (queryTokens.size < minTokens) return [];

  const matches: { item: T; score: number }[] = [];
  for (const candidate of candidates) {
    if (excluded?.has(candidate.id)) continue;
    const candidateTokens = candidate.tokens ?? questionTokens(candidate.text);
    const score = similarity(queryTokens, candidateTokens);
    if (score >= minScore) {
      matches.push({ item: candidate, score });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}
