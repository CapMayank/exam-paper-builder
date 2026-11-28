"use client";

import { useEffect, useRef, useState } from "react";
import { findSimilar, questionTokens, SIMILAR_MIN_TOKENS } from "@/lib/questionSimilarity";
import {
  getCachedBookTexts,
  loadBookTexts,
  loadQuestionDetails,
  type PreparedText,
} from "@/lib/similarQuestionsClient";
import type { QuestionDto } from "@/lib/types";

export type SimilarMatch = {
  question: QuestionDto;
  score: number;
};

type MatchResultState = {
  bookId: string;
  excludeId: string | undefined;
  matches: SimilarMatch[];
};

const DEBOUNCE_MS = 400;

/**
 * Debounced client-side similarity search over a book's cached question texts.
 * Loads texts once per `bookId`, matches locally after 400 ms, fetches full DTOs for hits,
 * and drops stale async results if inputs change or the component unmounts.
 */
export function useSimilarQuestions(args: {
  bookId: string;
  text: string;
  excludeId?: string;
  enabled?: boolean;
}): { matches: SimilarMatch[]; best: number } {
  const { bookId, text, excludeId, enabled } = args;
  const trimmedBookId = bookId.trim();
  const isEnabled = enabled !== false && trimmedBookId.length > 0;
  const hasEnoughTokens = questionTokens(text).size >= SIMILAR_MIN_TOKENS;
  const canMatch = isEnabled && hasEnoughTokens;

  const loadedBookIdRef = useRef<string | null>(null);
  const [result, setResult] = useState<MatchResultState>({
    bookId: "",
    excludeId: undefined,
    matches: [],
  });

  // Load (or revalidate via ETag) the book's question text list once per bookId while enabled.
  useEffect(() => {
    if (!isEnabled || loadedBookIdRef.current === trimmedBookId) return;

    let cancelled = false;
    loadBookTexts(trimmedBookId)
      .then(() => {
        if (!cancelled) {
          loadedBookIdRef.current = trimmedBookId;
        }
      })
      .catch(() => {
        // Degrade silently; matching effect will handle/ignore transient failures.
      });

    return () => {
      cancelled = true;
    };
  }, [isEnabled, trimmedBookId]);

  // Debounce matching on text and hydrate full QuestionDtos for top hits.
  useEffect(() => {
    if (!canMatch) {
      const resetTimer = setTimeout(() => {
        setResult((prev) =>
          prev.matches.length === 0 && prev.bookId === "" && prev.excludeId === undefined
            ? prev
            : { bookId: "", excludeId: undefined, matches: [] },
        );
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          let candidates: PreparedText[];
          if (loadedBookIdRef.current === trimmedBookId) {
            candidates = getCachedBookTexts(trimmedBookId) ?? (await loadBookTexts(trimmedBookId));
          } else {
            candidates = await loadBookTexts(trimmedBookId);
            if (!cancelled) loadedBookIdRef.current = trimmedBookId;
          }
          if (cancelled) return;

          const hits = findSimilar(text, candidates, {
            excludeIds: excludeId ? [excludeId] : undefined,
          });
          if (hits.length === 0) {
            if (!cancelled) {
              setResult({ bookId: trimmedBookId, excludeId, matches: [] });
            }
            return;
          }

          const dtos = await loadQuestionDetails(hits.map((h) => h.item.id));
          if (cancelled) return;

          const byId = new Map(dtos.map((q) => [q.id, q]));
          const ordered: SimilarMatch[] = [];
          for (const hit of hits) {
            const question = byId.get(hit.item.id);
            if (question) ordered.push({ question, score: hit.score });
          }

          setResult({ bookId: trimmedBookId, excludeId, matches: ordered });
        } catch {
          if (!cancelled) {
            setResult({ bookId: trimmedBookId, excludeId, matches: [] });
          }
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canMatch, trimmedBookId, text, excludeId]);

  if (!canMatch || result.bookId !== trimmedBookId || result.excludeId !== excludeId) {
    return { matches: [], best: 0 };
  }

  return {
    matches: result.matches,
    best: result.matches[0]?.score ?? 0,
  };
}
