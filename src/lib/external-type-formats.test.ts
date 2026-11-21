import { describe, expect, test } from "vitest";
import { QUESTION_TYPE_LABEL } from "./constants";
import { PICTORIAL_TYPES, typeFormat } from "./externalTypeFormats";
import { parsePaperJson } from "./paperImport";
import { getKindergartenActivity, isKindergartenType } from "./kindergarten/registry";
import { CLIPART_LIBRARY } from "./kindergarten/clipartLibrary";

const TYPES = Object.keys(QUESTION_TYPE_LABEL);
const KEYS = /^(text|type|marks|chapterNumber|chapterTitle|difficulty|options|subparts|label|attemptCount|figure|orQuestion|activity)$/;

/** Every string value in an example, at any depth (object keys excluded). */
function stringValues(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => stringValues(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => stringValues(x, out));
  return out;
}

function roundTrip(type: string) {
  const ex = { ...typeFormat(type, "en").example, marks: 2, chapterNumber: 1 };
  return parsePaperJson(JSON.stringify({ title: "x", sections: [{ title: "S", questions: [ex] }] }));
}

describe("external type format catalogue", () => {
  test("every question type has a format", () => {
    for (const t of TYPES) expect(typeFormat(t, "en").rule.length, t).toBeGreaterThan(20);
  });

  test("example top-level keys are importer fields only", () => {
    for (const t of TYPES) for (const k of Object.keys(typeFormat(t, "en").example)) expect(k, t).toMatch(KEYS);
  });

  test("examples are placeholders only", () => {
    for (const t of TYPES) {
      for (const v of stringValues(typeFormat(t, "en").example)) {
        if (v === t) continue; // the "type" value itself
        expect(v, `${t}: ${v}`).toMatch(/<[^>]+>|^\([a-zivx]+\)$|_{8}|^\((A|R)\)|^Both \(A\)|^\(A\) is|^\d+$|^CLIPART$/);
      }
    }
  });

  test("example round-trips through the importer", () => {
    for (const t of TYPES) {
      const res = roundTrip(t);
      expect(res.errors, t).toEqual([]);
      expect(res.paper?.sections[0].questions[0].type, t).toBe(t);
    }
  });

  test("kindergarten examples become the activity settings the printer reads", () => {
    for (const t of TYPES.filter(isKindergartenType)) {
      const q = roundTrip(t).paper!.sections[0].questions[0];
      expect(q.options, t).toHaveLength(1);
      const settings = JSON.parse(q.options![0]);
      const defaults = getKindergartenActivity(t)!.defaultConfig("english") as Record<string, unknown>;
      for (const k of Object.keys(settings)) expect(Object.keys(defaults), `${t}.${k}`).toContain(k);
    }
  });

  test("kindergarten rules list the clipart library", () => {
    const rule = typeFormat("KDG_COUNT_ITEMS", "en").rule;
    for (const c of CLIPART_LIBRARY) expect(rule).toContain(c.id);
  });

  test("pictorial types require figure", () => {
    expect(PICTORIAL_TYPES.has("MAP_WORK")).toBe(true);
    for (const t of PICTORIAL_TYPES) expect(typeFormat(t, "en").example, t).toHaveProperty("figure");
  });

  test("match example keeps Column II in options", () => {
    const ex = typeFormat("MATCH_COLUMN", "en").example as { text: string; options: string[] };
    expect(ex.text).toContain("(A) <Column I item>");
    expect(ex.options[0]).toBe("<Column II item>");
  });

  test("Sanskrit match uses स्तम्भ अ / स्तम्भ ब", () => {
    expect(typeFormat("MATCH_COLUMN", "sa").rule).toContain("स्तम्भ अ");
    expect(typeFormat("MATCH_COLUMN", "hi").rule).toContain("स्तम्भ क");
  });

  test("unknown type falls back to the open-answer format", () => {
    expect(typeFormat("SOMETHING_NEW", "en").rule).toBe(typeFormat("SHORT", "en").rule.replace(/^SHORT/, "SOMETHING_NEW"));
  });
});
