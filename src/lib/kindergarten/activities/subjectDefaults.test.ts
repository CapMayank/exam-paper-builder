import { describe, expect, it } from "vitest";
import { evsOddOneDefaultConfig } from "./subjectVariants";
import { getKindergartenActivity } from "../registry";

describe("EVS odd one out defaults", () => {
  it("gives the same ids every time, so the server and the browser render the same", () => {
    expect(evsOddOneDefaultConfig()).toEqual(evsOddOneDefaultConfig());
  });

  it("doesn't print the cross instruction twice", () => {
    expect(evsOddOneDefaultConfig().targetDescription ?? "").toBe("");
  });
});

describe("Hindi match the columns default", () => {
  it("only uses real words", () => {
    const c = getKindergartenActivity("KDG_HINDI_TEXT_MATCH")?.defaultConfig("hindi") as { pairs: { right: string }[] } | undefined;
    const words = (c?.pairs ?? []).map((p) => p.right);
    expect(words).not.toContain("वक");
  });
});
