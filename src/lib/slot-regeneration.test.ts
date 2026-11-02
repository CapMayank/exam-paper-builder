import { describe, expect, it, vi } from "vitest";

const generate = vi.fn();
vi.mock("./gemini", () => ({ generatePaperSectionWithGemini: (...a: unknown[]) => generate(...a) }));
vi.mock("./constants", () => ({ detectPaperLanguage: () => "en" }));

import { regenerateSlot } from "./slotRegeneration";

const paper = {
  schoolName: "S",
  academicSession: "2026-27",
  examType: "ANNUAL",
  subjectCode: "",
  items: [{ question: { text: "existing" }, orQuestion: null }],
  blueprint: {
    name: "bp",
    bookId: "b",
    academicSession: "2026-27",
    examType: "ANNUAL",
    subjectCode: "",
    book: { className: "Class 10", subject: "Hindi" },
    chapters: [{ chapterId: "c1" }],
  },
} as never;
const section = { title: "S", type: "MCQ", marksEach: 1, instructions: "" } as never;
const slot = { slotIndex: 3, chapterId: "c1", chapterNumber: 1, chapterTitle: "T", marks: 1 };

describe("regenerateSlot", () => {
  it("asks the model for exactly one slot and passes the rejection reasons", async () => {
    generate.mockResolvedValueOnce({ success: true, isMock: false, data: [{ text: "new" }] });
    const q = await regenerateSlot({ paper, section, slot, reasons: ["duplicate option"] });
    expect(q).toEqual({ text: "new" });
    const arg = generate.mock.calls.at(-1)![0];
    expect(arg.slots).toHaveLength(1);
    expect(arg.slots[0].slotIndex).toBe(0);
    expect(arg.teacherFocus).toContain("duplicate option");
    expect(arg.existingQuestionTexts).toEqual(["existing"]);
  });

  it("never returns template/mock output", async () => {
    generate.mockResolvedValueOnce({ success: true, isMock: true, data: [{ text: "template" }] });
    expect(await regenerateSlot({ paper, section, slot, reasons: [] })).toBeNull();
  });

  it("returns null when generation fails", async () => {
    generate.mockResolvedValueOnce({ success: false, isMock: false, data: [] });
    expect(await regenerateSlot({ paper, section, slot, reasons: [] })).toBeNull();
  });
});
