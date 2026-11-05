import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generatePaperSectionWithGemini } from "./gemini";
import { resetPoolState } from "./geminiPool";

/** A Class 8 school paper (Rajya Shiksha Kendra pattern) has no internal choice; Circular 465 is for Classes 9-12. */
describe("internal choice on school papers", () => {
  let prompts: string[] = [];
  beforeEach(() => {
    resetPoolState();
    prompts = [];
    vi.stubEnv("GEMINI_API_KEYS", "AQ.keyChoice_0000000");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GEMINI_MODEL", "");
    // the model volunteers an OR alternative on a slot that did not ask for one
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      prompts.push([body.systemInstruction?.parts?.[0]?.text ?? "", ...body.contents[0].parts.map((p: { text?: string }) => p.text ?? "")].join("\n"));
      const q = {
        slotIndex: 0, chapterNumber: 1, chapterTitle: "वर दे!", type: "LONG",
        text: "कविता 'वर दे!' में कवि माँ सरस्वती से कौन-कौन से वरदान माँगता है? कविता के आधार पर स्पष्ट कीजिए।",
        options: [], subparts: [], answer: "", difficulty: "MEDIUM",
        orQuestion: { type: "LONG", text: "कविता 'वर दे!' का केंद्रीय भाव अपने शब्दों में लिखिए और बताइए कि यह आज भी प्रासंगिक क्यों है।", options: [], subparts: [], answer: "", difficulty: "MEDIUM" },
      };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify([q]) }] }, finishReason: "STOP" }] }), { status: 200 });
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const run = (className: string, requiresInternalChoice: boolean) =>
    generatePaperSectionWithGemini({
      className, subject: "Hindi", sectionTitle: "दीर्घ उत्तरीय प्रश्न", sectionType: "LONG", marksEach: 5, language: "hi",
      difficulty: "SCHOOL", generateDiagrams: false,
      slots: [{ slotIndex: 0, chapterId: "c1", chapterNumber: 1, chapterTitle: "वर दे!", marks: 5, requiresInternalChoice }],
    });

  it("drops an OR the model adds on a slot that does not ask for one", async () => {
    const res = await run("Class 8", false);
    expect(res.data?.[0]?.text).toMatch(/सरस्वती/);
    expect(res.data?.[0]?.orQuestion).toBeUndefined();
  });

  it("does not tell a Class 8 paper that 5-mark questions need an internal choice", async () => {
    await run("Class 8", false);
    expect(prompts[0]).not.toMatch(/5-mark questions: 100% mandatory internal choice/);
    expect(prompts[0]).toMatch(/5 marks 70-80 words/);
  });

  it("keeps the board rule for Classes 9-12", async () => {
    await run("Class 10", true);
    expect(prompts[0]).toMatch(/Circular 465\/2026/);
  });
});
