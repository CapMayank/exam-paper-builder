import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentPaperContext } from "@/components/QuestionUsageHistory";
import type { QuestionDto, QuestionText, QuestionUsageTag } from "@/lib/types";
import {
  __resetSimilarCacheForTests,
  loadBookTexts,
  loadQuestionDetails,
  rememberSavedQuestion,
  usageTag,
} from "./similarQuestionsClient";

function makeDto(usages: QuestionUsageTag[], overrides: Partial<QuestionDto> = {}): QuestionDto {
  return {
    id: "q-1",
    bookId: "book-1",
    chapterId: "ch-1",
    type: "SHORT",
    text: "Explain photosynthesis in green plants.",
    options: [],
    answer: "",
    difficulty: "MEDIUM",
    imagePath: null,
    spaceMm: 10,
    showGrid: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    subparts: [],
    usages,
    ...overrides,
  };
}

describe("similarQuestionsClient", () => {
  beforeEach(() => {
    __resetSimilarCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends If-None-Match on the second load and reuses the cache on 304", async () => {
    const initial: QuestionText[] = [
      { id: "q1", type: "SHORT", chapterId: "ch1", text: "What is Newton's second law of motion?" },
      { id: "q2", type: "MCQ", chapterId: "ch1", text: "Define acceleration and state its SI unit." },
    ];

    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(initial), {
          status: 200,
          headers: { ETag: '"v1"', "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 304,
          headers: { ETag: '"v1"' },
        }),
      );

    const first = await loadBookTexts("book-1", fetcher);
    expect(first).toHaveLength(2);
    expect(first[0].tokens).toBeInstanceOf(Set);

    const second = await loadBookTexts("book-1", fetcher);
    expect(second).toHaveLength(2);
    expect(second.map((q) => q.id)).toEqual(["q1", "q2"]);

    expect(fetcher).toHaveBeenCalledTimes(2);
    const secondInit = fetcher.mock.calls[1]?.[1];
    const sentIfNoneMatch = new Headers(secondInit?.headers).get("if-none-match");
    expect(sentIfNoneMatch).toBe('"v1"');
  });

  it("rememberSavedQuestion adds a question without refetching", async () => {
    const initial: QuestionText[] = [
      { id: "q1", type: "SHORT", chapterId: "ch1", text: "What is Newton's second law of motion?" },
      { id: "q2", type: "MCQ", chapterId: "ch1", text: "Define acceleration and state its SI unit." },
    ];

    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(initial), {
          status: 200,
          headers: { ETag: '"v1"', "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 304,
          headers: { ETag: '"v1"' },
        }),
      );

    await loadBookTexts("book-1", fetcher);

    rememberSavedQuestion({
      id: "q3",
      bookId: "book-1",
      type: "LONG",
      chapterId: "ch2",
      text: "State and prove the conservation of mechanical energy.",
    });

    const after = await loadBookTexts("book-1", fetcher);
    expect(after).toHaveLength(3);
    const added = after.find((q) => q.id === "q3");
    expect(added).toBeDefined();
    expect(added!.tokens).toBeInstanceOf(Set);
    expect(added!.tokens.has("conservation")).toBe(true);
    expect(added!.tokens.has("mechanical")).toBe(true);
  });

  it("usageTag prefers the finalized-exam tag", () => {
    const finalUsage: QuestionUsageTag = {
      paperId: "paper-final",
      paperTitle: "Half Yearly Exam 2026",
      paperSet: "Set A",
      examDate: "2026-09-15",
      academicSession: "2026-27",
      className: "Class 10",
      subject: "Science",
      status: "FINAL",
      isOrChoice: false,
    };
    const draftUsage: QuestionUsageTag = {
      paperId: "paper-draft",
      paperTitle: "Unit Test 2 Draft",
      paperSet: "Set B",
      examDate: "2026-08-01",
      academicSession: "2026-27",
      className: "Class 10",
      subject: "Science",
      status: "DRAFT",
      isOrChoice: false,
    };

    const currentPaper: CurrentPaperContext = {
      id: "paper-current",
      academicSession: "2026-27",
      className: "Class 10",
      subject: "Science",
    };

    const withBoth = makeDto([draftUsage, finalUsage]);
    const redTag = usageTag(withBoth, currentPaper);
    expect(redTag).not.toBeNull();
    expect(redTag!.tone).toBe("red");
    expect(redTag!.label).toContain("Half Yearly Exam 2026");

    const withDraftOnly = makeDto([draftUsage]);
    const amberTag = usageTag(withDraftOnly, currentPaper);
    expect(amberTag).not.toBeNull();
    expect(amberTag!.tone).toBe("amber");
    expect(amberTag!.label).toContain("Unit Test 2 Draft");

    expect(usageTag(withBoth, null)).toBeNull();
    expect(usageTag(withBoth)).toBeNull();
  });

  it("separate form caches do not share stale usages", async () => {
    const finalUsage: QuestionUsageTag = {
      paperId: "paper-final",
      paperTitle: "Half Yearly Exam 2026",
      paperSet: "Set A",
      examDate: "2026-09-15",
      academicSession: "2026-27",
      className: "Class 10",
      subject: "Science",
      status: "FINAL",
      isOrChoice: false,
    };

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([makeDto([], { id: "q1", text: "Question 1" })]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([makeDto([finalUsage], { id: "q1", text: "Question 1" })]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([makeDto([], { id: "q1", text: "Question 1" })]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const cacheA = new Map<string, QuestionDto>();
    const cacheB = new Map<string, QuestionDto>();

    const fromFormA = await loadQuestionDetails(["q1"], cacheA);
    expect(fromFormA[0]?.usages).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const fromFormB = await loadQuestionDetails(["q1"], cacheB);
    expect(fromFormB[0]?.usages).toHaveLength(1);
    expect(fromFormB[0]?.usages?.[0]?.paperTitle).toBe("Half Yearly Exam 2026");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Calling without an explicit cache map must not reuse any prior form cache either.
    const uncached = await loadQuestionDetails(["q1"]);
    expect(uncached[0]?.usages).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("loadQuestionDetails caches DTOs within the same form cache, fetches only missing ids, preserves order, and chunks by 10", async () => {
    const dtosById = new Map<string, QuestionDto>();
    for (let i = 1; i <= 15; i++) {
      const id = `q${i}`;
      dtosById.set(id, makeDto([], { id, text: `Question ${i}` }));
    }

    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      const idsParam = new URL(url, "http://localhost").searchParams.get("ids") ?? "";
      const requested = idsParam.split(",").filter(Boolean);
      // Return in reverse order to prove loadQuestionDetails restores caller order.
      const body = requested
        .slice()
        .reverse()
        .map((id) => dtosById.get(id))
        .filter(Boolean);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const formCache = new Map<string, QuestionDto>();

    const first = await loadQuestionDetails(["q1", "q2", "q3"], formCache);
    expect(first.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/questions?ids=q1,q2,q3");

    // Request a mix of cached (q2, q1) and uncached (q4) ids; only q4 should be fetched.
    const second = await loadQuestionDetails(["q2", "q4", "q1"], formCache);
    expect(second.map((q) => q.id)).toEqual(["q2", "q4", "q1"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/questions?ids=q4");

    // Request 12 new ids + 1 cached id (q1); missing 12 should chunk into 10 + 2.
    const batchIds = [
      "q1",
      "q5",
      "q6",
      "q7",
      "q8",
      "q9",
      "q10",
      "q11",
      "q12",
      "q13",
      "q14",
      "q15",
      "q16",
    ];
    for (let i = 16; i <= 16; i++) {
      dtosById.set(`q${i}`, makeDto([], { id: `q${i}`, text: `Question ${i}` }));
    }
    const third = await loadQuestionDetails(batchIds, formCache);
    expect(third.map((q) => q.id)).toEqual(batchIds);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "/api/questions?ids=q5,q6,q7,q8,q9,q10,q11,q12,q13,q14",
    );
    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/questions?ids=q15,q16");
  });

  it("rememberSavedQuestion replaces existing text by id and evicts cached DTO from the form cache", async () => {
    const initial: QuestionText[] = [
      { id: "q1", type: "SHORT", chapterId: "ch1", text: "What is Newton's first law of motion?" },
      { id: "q2", type: "MCQ", chapterId: "ch1", text: "Define acceleration and state its SI unit." },
    ];

    const bookFetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(initial), {
          status: 200,
          headers: { ETag: '"v1"', "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 304,
          headers: { ETag: '"v1"' },
        }),
      );

    await loadBookTexts("book-1", bookFetcher);

    const dtoFetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([makeDto([], { id: "q1", text: "What is Newton's first law of motion?" })]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            makeDto([], { id: "q1", text: "Explain the conservation of angular momentum clearly." }),
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", dtoFetcher);

    const formCache = new Map<string, QuestionDto>();

    const cachedBefore = await loadQuestionDetails(["q1"], formCache);
    expect(cachedBefore[0]?.text).toBe("What is Newton's first law of motion?");
    expect(dtoFetcher).toHaveBeenCalledTimes(1);

    rememberSavedQuestion(
      {
        id: "q1",
        bookId: "book-1",
        type: "SHORT",
        chapterId: "ch1",
        text: "Explain the conservation of angular momentum clearly.",
      },
      formCache,
    );

    const refreshedTexts = await loadBookTexts("book-1", bookFetcher);
    expect(refreshedTexts).toHaveLength(2);
    const updatedText = refreshedTexts.find((q) => q.id === "q1");
    expect(updatedText?.text).toBe("Explain the conservation of angular momentum clearly.");
    expect(updatedText?.tokens.has("angular")).toBe(true);
    expect(updatedText?.tokens.has("momentum")).toBe(true);

    // DTO cache entry for q1 must have been evicted, forcing a fresh fetch.
    const refetchedAfterSave = await loadQuestionDetails(["q1"], formCache);
    expect(dtoFetcher).toHaveBeenCalledTimes(2);
    expect(refetchedAfterSave[0]?.text).toBe(
      "Explain the conservation of angular momentum clearly.",
    );
  });
});
