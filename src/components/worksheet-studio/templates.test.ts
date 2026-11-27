import { describe, expect, it } from "vitest";
import { getKindergartenActivity } from "@/lib/kindergarten/registry";
import { BUILT_IN_TEMPLATES } from "@/lib/worksheetTemplates";
import { templateSnapshots } from "./templates";

describe("templateSnapshots", () => {
  it("fills built-in activities with their defaults for the worksheet's subject", () => {
    const hindi = BUILT_IN_TEMPLATES.find((t) => t.className === "UKG" && t.subject === "Hindi")!;
    const snaps = templateSnapshots(hindi, "Hindi");
    const trace = snaps.find((s) => s.type === "KDG_TRACE_WRITE")!;
    const expected = getKindergartenActivity("KDG_TRACE_WRITE")!.defaultConfig("Hindi") as { instruction: string };
    expect(trace.text).toBe(expected.instruction);
    expect(JSON.parse(trace.options[0])).toEqual(expected);
    expect(trace.marks).toBe(2);
  });

  it("uses a saved template's own text and settings", () => {
    const snaps = templateSnapshots(
      { id: "wt-1", name: "x", className: "LKG", subject: "English", builtIn: false, activities: [{ type: "KDG_COLOUR", text: "Colour it", options: ['{"items":[]}'], marks: 4 }] },
      "English",
    );
    expect(snaps).toEqual([{ type: "KDG_COLOUR", text: "Colour it", options: ['{"items":[]}'], marks: 4 }]);
  });

  it("skips activity types this app no longer has", () => {
    const snaps = templateSnapshots({ id: "wt-2", name: "x", className: "LKG", subject: "English", builtIn: false, activities: [{ type: "KDG_GONE", marks: 2 }] }, "English");
    expect(snaps).toEqual([]);
  });
});
