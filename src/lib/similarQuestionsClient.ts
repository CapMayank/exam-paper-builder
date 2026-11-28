import {
  findFreshnessConflicts,
  isExhaustedUsage,
  type CurrentPaperContext,
} from "@/components/QuestionUsageHistory";
import { api } from "@/lib/client";
import { prepareCandidates, questionTokens } from "@/lib/questionSimilarity";
import type { QuestionDto, QuestionText } from "@/lib/types";

export type PreparedText = QuestionText & { tokens: Set<string> };

export type UsageTag = {
  tone: "red" | "amber";
  label: string;
};

type BookCacheEntry = {
  etag: string;
  items: PreparedText[];
};

const MAX_QUESTION_DETAIL_IDS = 10;

const bookTextsCache = new Map<string, BookCacheEntry>();
const inFlightBookLoads = new Map<string, Promise<PreparedText[]>>();

/** Returns already-cached prepared texts for a book, or `null` if not yet loaded. */
export function getCachedBookTexts(bookId: string): PreparedText[] | null {
  return bookTextsCache.get(bookId)?.items ?? null;
}

/**
 * Loads all question texts for `bookId` using conditional `ETag` / `If-None-Match` caching.
 * Uses plain `fetch` because `api()` treats `304 Not Modified` as an error.
 */
export async function loadBookTexts(
  bookId: string,
  fetcher?: typeof fetch,
): Promise<PreparedText[]> {
  if (!bookId.trim()) return [];

  if (!fetcher) {
    const existing = inFlightBookLoads.get(bookId);
    if (existing) return existing;
  }

  const run = async (): Promise<PreparedText[]> => {
    const cached = bookTextsCache.get(bookId);
    const headers: HeadersInit = cached?.etag ? { "If-None-Match": cached.etag } : {};
    const fetchFn = fetcher ?? fetch;
    const res = await fetchFn(`/api/questions/texts?bookId=${encodeURIComponent(bookId)}`, {
      credentials: "same-origin",
      headers,
    });

    if (res.status === 304) {
      if (cached) {
        const refreshedEtag = res.headers.get("etag");
        if (refreshedEtag) cached.etag = refreshedEtag;
        return cached.items;
      }
      return [];
    }

    if (!res.ok) {
      throw new Error(`Failed to load question texts (${res.status})`);
    }

    const rows = (await res.json()) as QuestionText[];
    const items = prepareCandidates(rows);
    const etag = res.headers.get("etag") ?? "";
    bookTextsCache.set(bookId, { etag, items });
    return items;
  };

  if (fetcher) {
    return run();
  }

  const promise = run().finally(() => {
    inFlightBookLoads.delete(bookId);
  });
  inFlightBookLoads.set(bookId, promise);
  return promise;
}

/**
 * Upserts a newly created or edited question into its book's cached text list
 * and evicts its cached DTO from `detailCache` so subsequent lookups reflect the saved version.
 */
export function rememberSavedQuestion(
  q: {
    id: string;
    bookId: string;
    type: string;
    chapterId: string;
    text: string;
  },
  detailCache?: Map<string, QuestionDto>,
): void {
  detailCache?.delete(q.id);

  const entry = bookTextsCache.get(q.bookId);
  if (!entry) return;

  const prepared: PreparedText = {
    id: q.id,
    type: q.type,
    chapterId: q.chapterId,
    text: q.text,
    tokens: questionTokens(q.text),
  };

  const idx = entry.items.findIndex((item) => item.id === q.id);
  if (idx >= 0) {
    const next = entry.items.slice();
    next[idx] = prepared;
    entry.items = next;
  } else {
    entry.items = [...entry.items, prepared];
  }
}

/**
 * Returns full `QuestionDto` objects for `ids` in the requested order,
 * serving cached entries from `detailCache` and fetching only missing ids from `/api/questions`.
 */
export async function loadQuestionDetails(
  ids: string[],
  detailCache: Map<string, QuestionDto> = new Map(),
): Promise<QuestionDto[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const missingIds = uniqueIds.filter((id) => !detailCache.has(id));
  for (let i = 0; i < missingIds.length; i += MAX_QUESTION_DETAIL_IDS) {
    const chunk = missingIds.slice(i, i + MAX_QUESTION_DETAIL_IDS);
    const query = chunk.map((id) => encodeURIComponent(id)).join(",");
    const fetched = await api<QuestionDto[]>(`/api/questions?ids=${query}`);
    for (const dto of fetched) {
      detailCache.set(dto.id, dto);
    }
  }

  return uniqueIds
    .map((id) => detailCache.get(id))
    .filter((q): q is QuestionDto => q !== undefined);
}

/**
 * Summarizes the strongest prior-usage warning for a similar question relative to the active paper:
 * red if already shown in a finalized exam for this cohort/subject/session, else amber if in another
 * paper this session, else `null`.
 */
export function usageTag(
  q: QuestionDto,
  paper?: CurrentPaperContext | null,
): UsageTag | null {
  if (!paper || !q.usages || q.usages.length === 0) return null;

  const exhausted = q.usages.find((u) => isExhaustedUsage(u, paper));
  if (exhausted) {
    const title = exhausted.paperTitle?.trim() || "previous exam";
    return { tone: "red", label: `Students saw this \u2014 ${title}` };
  }

  const conflicts = findFreshnessConflicts(q.usages, paper);
  if (conflicts.length > 0) {
    const title = conflicts[0].paperTitle?.trim() || "another paper";
    return { tone: "amber", label: `In ${title} this session` };
  }

  return null;
}

/** Clears book-text caches (for unit tests). */
export function __resetSimilarCacheForTests(): void {
  bookTextsCache.clear();
  inFlightBookLoads.clear();
}
