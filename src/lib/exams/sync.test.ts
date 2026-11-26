import { describe, expect, it } from "vitest";
import { paperSyncFields } from "./sync";

describe("paperSyncFields", () => {
  it("gives a linked paper the exam's date, type and session", () => {
    expect(paperSyncFields({ examType: "HALF_YEARLY", academicSession: "2026–27" }, "2026-12-10")).toEqual({
      examDate: "2026-12-10",
      examType: "HALF_YEARLY",
      academicSession: "2026–27",
    });
  });
});
