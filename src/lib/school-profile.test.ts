import { describe, expect, it } from "vitest";
import {
  canonicalSubject,
  classLevelOf,
  isActiveSubject,
  parseViewScope,
  profileSubjectsFor,
  serializeViewScope,
} from "./schoolProfile";

describe("school profile", () => {
  it("classes 9 and 10 have exactly the seven required subjects", () => {
    for (const lvl of [9, 10]) {
      expect(profileSubjectsFor(lvl).map((s) => s.name)).toEqual([
        "Hindi", "English", "Mathematics", "Science", "Social Science", "Sanskrit", "Disaster Management",
      ]);
    }
  });

  it("classes 11 and 12 split into PCM and PCB", () => {
    for (const lvl of [11, 12]) {
      expect(profileSubjectsFor(lvl, "PCM").map((s) => s.name).sort()).toEqual(
        ["Chemistry", "Disaster Management", "English", "Hindi", "Mathematics", "Physics"],
      );
      expect(profileSubjectsFor(lvl, "PCB").map((s) => s.name).sort()).toEqual(
        ["Biology", "Chemistry", "Disaster Management", "English", "Hindi", "Physics"],
      );
      expect(profileSubjectsFor(lvl, "ALL")).toHaveLength(7);
    }
  });

  it("reads class levels from the names the app uses", () => {
    expect(classLevelOf("Class 9")).toBe(9);
    expect(classLevelOf("Class XII")).toBe(12);
    expect(classLevelOf("Class 11 (Science)")).toBe(11);
    expect(classLevelOf("UKG")).toBeNull();
  });

  it("maps the names books and classes use onto canonical subjects without false matches", () => {
    expect(canonicalSubject("Science / विज्ञान")).toBe("Science");
    expect(canonicalSubject("SST")).toBe("Social Science");
    expect(canonicalSubject("सामाजिक विज्ञान (Social Science)")).toBe("Social Science");
    expect(canonicalSubject("Political Science")).toBeNull();
    expect(canonicalSubject("Computer Science")).toBeNull();
    expect(canonicalSubject("Agriculture Science and Mathematics")).toBeNull();
    expect(canonicalSubject("Biotechnology")).toBe("Biotechnology");
    expect(canonicalSubject("आपदा प्रबंधन")).toBe("Disaster Management");
  });

  it("hides other subjects in classes 9-12 and leaves other classes alone", () => {
    expect(isActiveSubject("Class 10", "Information Technology")).toBe(false);
    expect(isActiveSubject("Class 12", "Accountancy")).toBe(false);
    expect(isActiveSubject("Class 12", "Physics")).toBe(true);
    expect(isActiveSubject("Class 6", "Sanskrit")).toBe(true);
    expect(isActiveSubject("UKG", "Hindi")).toBe(true);
    expect(isActiveSubject("Class 10", "Information Technology", { stream: "ALL", showOther: true })).toBe(true);
  });

  it("applies the stream: Biology is hidden under PCM and Mathematics under PCB (class 11/12 only)", () => {
    expect(isActiveSubject("Class 11", "Biology", { stream: "PCM", showOther: false })).toBe(false);
    expect(isActiveSubject("Class 11", "Mathematics", { stream: "PCB", showOther: false })).toBe(false);
    expect(isActiveSubject("Class 11", "Mathematics", { stream: "PCM", showOther: false })).toBe(true);
    expect(isActiveSubject("Class 10", "Mathematics", { stream: "PCB", showOther: false })).toBe(true);
  });

  it("round-trips the view cookie", () => {
    const c = `a=b; epb_view=${serializeViewScope({ stream: "PCB", showOther: true })}; c=d`;
    expect(parseViewScope(c)).toEqual({ stream: "PCB", showOther: true });
    expect(parseViewScope(undefined)).toEqual({ stream: "ALL", showOther: false });
    expect(parseViewScope("epb_view=%E0%A4%A")).toEqual({ stream: "ALL", showOther: false });
  });
});
