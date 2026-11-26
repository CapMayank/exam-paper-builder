import { describe, expect, it } from "vitest";
import { cellDuration, paperSyncFields } from "./sync";

describe("paperSyncFields", () => {
  it("gives a linked paper the exam's date, type and session", () => {
    expect(paperSyncFields({ examType: "HALF_YEARLY", academicSession: "2026–27" }, "2026-12-10")).toEqual({
      examDate: "2026-12-10",
      examType: "HALF_YEARLY",
      academicSession: "2026–27",
      durationMin: null,
    });
  });
});

describe("cellDuration", () => {
  it("uses the date sheet's time when the paper sits alone that day", () => {
    expect(cellDuration("11:00 am to 02:00 pm", 1)).toBe(180);
  });
  it("leaves papers sharing a day (GK and Drawing) on their own blueprint time", () => {
    expect(cellDuration("11:00 am to 01:30 pm", 2)).toBeNull();
  });
  it("falls back to the blueprint when the time can't be read", () => {
    expect(cellDuration("", 1)).toBeNull();
  });
});
