import { describe, expect, it } from "vitest";
import { shortClassLabel, shortSubjectLabel } from "./labels";

describe("shortClassLabel", () => {
  it("turns numbered classes into ordinals", () => {
    expect(shortClassLabel("Class 12")).toBe("12th");
    expect(shortClassLabel("Class 1")).toBe("1st");
    expect(shortClassLabel("Class 2")).toBe("2nd");
    expect(shortClassLabel("Class 3")).toBe("3rd");
    expect(shortClassLabel("Class 11")).toBe("11th");
  });
  it("uses the date sheet's names for pre-primary classes", () => {
    expect(shortClassLabel("Nursery")).toBe("NUR");
    expect(shortClassLabel("LKG")).toBe("KG I");
    expect(shortClassLabel("UKG")).toBe("KG II");
    expect(shortClassLabel("KG II")).toBe("KG II");
  });
  it("leaves anything else as it is", () => {
    expect(shortClassLabel("Something Else")).toBe("Something Else");
  });
});

describe("shortSubjectLabel", () => {
  it("uses the short names the school prints on date sheets", () => {
    expect(shortSubjectLabel("Mathematics")).toBe("Math");
    expect(shortSubjectLabel("Mathematics Standard")).toBe("Math");
    expect(shortSubjectLabel("Social Science")).toBe("SST");
    expect(shortSubjectLabel("Biology")).toBe("Bio");
    expect(shortSubjectLabel("GK/Drawing")).toBe("GK/Draw.");
    expect(shortSubjectLabel("General Knowledge")).toBe("GK");
    expect(shortSubjectLabel("Drawing")).toBe("Draw.");
  });
  it("leaves other subjects as they are", () => {
    expect(shortSubjectLabel("Chemistry")).toBe("Chemistry");
    expect(shortSubjectLabel("Disaster Management")).toBe("Disaster Management");
  });
});
