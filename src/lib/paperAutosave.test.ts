import { describe, expect, it } from "vitest";
import { autosavePatch } from "./paperAutosave";

const loaded = {
  title: "Half Yearly Exam",
  schoolName: "Sarvodaya H.S. School",
  academicSession: "",
  language: "hi",
  showSignatures: false,
};
const REQUIRED = ["title", "schoolName"] as const;

describe("autosavePatch", () => {
  it("identical details: nothing to save", () => {
    expect(autosavePatch(loaded, { ...loaded }, REQUIRED)).toBeNull();
  });

  it("one changed field: only that field", () => {
    expect(autosavePatch(loaded, { ...loaded, title: "Annual Exam" }, REQUIRED)).toEqual({ title: "Annual Exam" });
    expect(autosavePatch(loaded, { ...loaded, showSignatures: true }, REQUIRED)).toEqual({ showSignatures: true });
  });

  it("a changed language is sent like any other field", () => {
    expect(autosavePatch(loaded, { ...loaded, language: "en" }, REQUIRED)).toEqual({ language: "en" });
  });

  it("a required field emptied is left out, other changes are kept", () => {
    expect(autosavePatch(loaded, { ...loaded, title: "   ", academicSession: "2026-27" }, REQUIRED)).toEqual({
      academicSession: "2026-27",
    });
  });

  it("all changes invalid: nothing to save", () => {
    expect(autosavePatch(loaded, { ...loaded, title: "", schoolName: "" }, REQUIRED)).toBeNull();
  });

  it("a field edited back to the loaded value is not a change", () => {
    expect(autosavePatch({ ...loaded, title: "B" }, { ...loaded, title: "B" }, REQUIRED)).toBeNull();
    expect(autosavePatch({ ...loaded, title: "B" }, { ...loaded, title: "Half Yearly Exam" }, REQUIRED)).toEqual({
      title: "Half Yearly Exam",
    });
  });
});
