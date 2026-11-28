import { describe, expect, it } from "vitest";
import { traceWriteDefaultConfig, traceInstruction, nextTraceInstruction } from "./traceWrite";

describe("trace and write instruction", () => {
  it("says copy, not trace, when the default letters are solid", () => {
    const c = traceWriteDefaultConfig();
    expect(c.lines[0].traceDotted).toBe(false);
    expect(c.instruction).toBe(traceInstruction(false, "FOUR_LINE"));
    expect(c.instruction).not.toMatch(/trace/i);
  });

  it("names the ruling and tracing it asks for", () => {
    expect(traceInstruction(true, "FOUR_LINE")).toMatch(/^Trace and copy.*4-line/);
    expect(traceInstruction(false, "BOXES")).toMatch(/boxes/);
  });

  it("follows the settings, including from the old default wording", () => {
    expect(nextTraceInstruction("Trace and copy the letters neatly (4-line ruling):", false, "FOUR_LINE", true, "FOUR_LINE")).toBe(traceInstruction(true, "FOUR_LINE"));
    expect(nextTraceInstruction(traceInstruction(false, "FOUR_LINE"), false, "FOUR_LINE", false, "BOXES")).toBe(traceInstruction(false, "BOXES"));
  });

  it("keeps a Hindi or hand-written instruction", () => {
    expect(nextTraceInstruction("सुंदर अक्षरों में लिखिए (Copy in neat handwriting):", false, "TWO_LINE", true, "TWO_LINE")).toBe("सुंदर अक्षरों में लिखिए (Copy in neat handwriting):");
  });
});
