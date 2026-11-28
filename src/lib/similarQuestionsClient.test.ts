import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentPaperContext } from "@/components/QuestionUsageHistory";
import type { QuestionDto, QuestionText, QuestionUsageTag } from "@/lib/types";
import {
  __resetSimilarCacheForTests,
  loadBookTexts,
  rememberSavedQuestion,
  usageTag,
} from "./similarQuestionsClient";

function makeDto(usages: QuestionUsageTag[]): QuestionDto {
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
  };
}

describe("similarQuestionsClient", () => {
  beforeEach(() => {
    __resetSimilarCacheForTests();
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
});
