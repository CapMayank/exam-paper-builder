import { describe, expect, it } from "vitest";
import { isTemplateFiller, TEMPLATE_FALLBACK_PROVENANCE } from "./templateFiller";

describe("template filler questions are identifiable", () => {
  it("recognises the offline curriculum template provenance", () => {
    expect(isTemplateFiller({ sourceProvenance: "TEMPLATE_FALLBACK: offline curriculum template, not AI-generated; teacher review required" })).toBe(true);
    expect(isTemplateFiller({ sourceProvenance: TEMPLATE_FALLBACK_PROVENANCE })).toBe(true);
    expect(TEMPLATE_FALLBACK_PROVENANCE.startsWith("TEMPLATE_FALLBACK")).toBe(true);
  });

  it("does not flag bank, AI or unknown questions", () => {
    expect(isTemplateFiller({ sourceProvenance: null })).toBe(false);
    expect(isTemplateFiller({ sourceProvenance: undefined })).toBe(false);
    expect(isTemplateFiller({})).toBe(false);
    expect(isTemplateFiller({ sourceProvenance: "AI" })).toBe(false);
    expect(isTemplateFiller({ sourceProvenance: "" })).toBe(false);
  });
});
