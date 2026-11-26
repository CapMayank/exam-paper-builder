import { describe, expect, it } from "vitest";
import { suggestQuestionType } from "./typeInference";

const parts = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `(${i + 1})`, text: `Question ${i + 1}?`, marks: 1 }));
const longPassage = Array.from({ length: 70 }, (_, i) => `word${i}`).join(" ");

describe("suggestQuestionType", () => {
  it("reads a Short answer with sub-parts over a passage as an unseen passage", () => {
    expect(suggestQuestionType({ type: "SHORT", text: "Read the following passage and answer the questions. Once upon a time…", subparts: parts(3), subject: "English" })?.type).toBe("UNSEEN_PASSAGE");
    expect(suggestQuestionType({ type: "LONG", text: "निम्नलिखित गद्यांश को पढ़कर प्रश्नों के उत्तर दीजिए।", subparts: parts(4), subject: "Hindi" })?.type).toBe("UNSEEN_PASSAGE");
    // a long text with questions on it, no passage words
    expect(suggestQuestionType({ type: "LONG", text: longPassage, subparts: parts(3), subject: "English" })?.type).toBe("UNSEEN_PASSAGE");
    // the chapter says it is the unseen passage
    expect(suggestQuestionType({ type: "SHORT", text: "Short text.", subparts: parts(2), subject: "Hindi", chapterTitle: "अपठित गद्यांश" })?.type).toBe("UNSEEN_PASSAGE");
  });

  it("reads lines from a lesson with reference and explanation as reference to context", () => {
    const rtc = [
      { label: "(क)", text: "सन्दर्भ लिखिए।", marks: 1 },
      { label: "(ख)", text: "व्याख्या कीजिए।", marks: 2 },
    ];
    expect(suggestQuestionType({ type: "LONG", text: "निम्नलिखित पंक्तियाँ…", subparts: rtc, subject: "Hindi" })?.type).toBe("REFERENCE_CONTEXT");
    expect(suggestQuestionType({ type: "SHORT", text: "Read the extract from the lesson and answer.", subparts: parts(3), subject: "English" })?.type).toBe("REFERENCE_CONTEXT");
  });

  it("reads writing, grammar, map and drawing questions", () => {
    expect(suggestQuestionType({ type: "LONG", text: "अपने प्रधानाचार्य को अवकाश हेतु प्रार्थना पत्र लिखिए।", subject: "Hindi" })?.type).toBe("WRITING_SKILL");
    expect(suggestQuestionType({ type: "LONG", text: "Write a letter to your friend.", subject: "English" })?.type).toBe("WRITING_SKILL");
    expect(suggestQuestionType({ type: "SHORT", text: "संधि विच्छेद कीजिए।", subject: "Hindi", chapterTitle: "संधि" })?.type).toBe("GRAMMAR");
    expect(suggestQuestionType({ type: "LONG", text: "On the outline map of India, mark the Ganga.", subject: "Social Science" })?.type).toBe("MAP_WORK");
    expect(suggestQuestionType({ type: "SHORT", text: "Draw a labelled diagram of a plant cell.", subject: "Science" })?.type).toBe("DRAW");
    expect(suggestQuestionType({ type: "LONG", text: "Construct a triangle with sides 5 cm, 6 cm and 7 cm.", subject: "Mathematics" })?.type).toBe("DRAW");
  });

  it("reads a long source with sub-parts in a non-language subject as a case study", () => {
    expect(suggestQuestionType({ type: "LONG", text: "Read the source given below and answer the questions.", subparts: parts(3), subject: "Social Science" })?.type).toBe("CASE_STUDY");
  });

  it("leaves a fitting or deliberately chosen type alone", () => {
    expect(suggestQuestionType({ type: "UNSEEN_PASSAGE", text: "Read the passage.", subparts: parts(3), subject: "English" })).toBeNull();
    expect(suggestQuestionType({ type: "MCQ", text: "Draw?", subject: "Science" })).toBeNull();
    expect(suggestQuestionType({ type: "LONG", text: "Explain photosynthesis.", subject: "Science" })).toBeNull();
    expect(suggestQuestionType({ type: "SHORT", text: "Who was the king?", subparts: parts(2), subject: "English" })).toBeNull();
    // passage words in a non-language subject are not an unseen passage, and a lesson about letters is no writing task
    expect(suggestQuestionType({ type: "LONG", text: "Why did Gandhi write a letter to the Viceroy?", subject: "Social Science" })).toBeNull();
    expect(suggestQuestionType({ type: "CASE_STUDY", text: "Read the case.", subparts: parts(3), subject: "Science" })).toBeNull();
  });
});

describe("retyping questions already in papers", async () => {
  const { placementBlock } = await import("./retypePlan");
  const book = { className: "Class 7", subject: "English" };
  const use = (status: string, sectionType: string, allowed: string[] = []) => ({
    paper: { title: "Annual", status },
    section: { title: "Section E", type: sectionType, marksEach: 5, allowedTypesJson: JSON.stringify(allowed) },
  });

  it("allows the change when every section the question sits in takes the new type", () => {
    expect(placementBlock([], book, "UNSEEN_PASSAGE")).toBeNull();
    // a class 7 Long answer section takes an unseen passage by default
    expect(placementBlock([use("DRAFT", "LONG")], book, "UNSEEN_PASSAGE")).toBeNull();
  });

  it("keeps the type when a section refuses the new one, or the paper is finalised", () => {
    expect(placementBlock([use("DRAFT", "LONG", ["SHORT"])], book, "UNSEEN_PASSAGE")).toMatch(/does not take/);
    expect(placementBlock([use("DRAFT", "LONG", ["SHORT"])], { className: "Class 10", subject: "English" }, "UNSEEN_PASSAGE")).toMatch(/does not take/);
    expect(placementBlock([use("FINAL", "LONG")], book, "UNSEEN_PASSAGE")).toMatch(/finalised/);
  });
});

describe("batch import", async () => {
  const { parseAndValidateBatch } = await import("./batchQuestionIo");
  it("saves a row given a general type as the closer one it really is", () => {
    const report = parseAndValidateBatch({
      format: "json",
      content: JSON.stringify([{ type: "LONG", marks: 5, text: "Write a letter to your friend about your holidays.", chapterNumber: 1 }]),
      bookId: "b",
      chapters: [{ id: "c1", number: 1, title: "Lesson 1" }],
      subject: "English",
    });
    expect(report.errorCount).toBe(0);
    expect(report.items[0]).toMatchObject({ type: "WRITING_SKILL", retypedFrom: "LONG" });
  });
});

describe("adding new types to saved blueprint sections", async () => {
  const { widenedAllowedTypes } = await import("./allowedTypesBackfill");
  const hindi = { className: "Class 7", subject: "Hindi" };
  const longRow = { type: "LONG", count: 4, marksEach: 5, role: "LITERATURE", slotPlanJson: JSON.stringify([{ role: "LITERATURE" }, { role: "LITERATURE" }, { role: "WRITING", type: "WRITING_SKILL" }, { role: "WRITING", type: "WRITING_SKILL" }]) };

  it("adds the missing forms and keeps what the admin stored", () => {
    const out = widenedAllowedTypes({ ...longRow, allowedTypesJson: JSON.stringify(["LONG", "SHORT", "WRITING_SKILL", "MCQ"]) }, hindi);
    expect(out?.slice(0, 4)).toEqual(["LONG", "SHORT", "WRITING_SKILL", "MCQ"]);
    expect(out).toEqual(expect.arrayContaining(["UNSEEN_PASSAGE", "REFERENCE_CONTEXT", "GRAMMAR"]));
  });

  it("leaves empty lists, complete lists, board classes and kindergarten alone", () => {
    expect(widenedAllowedTypes({ ...longRow, allowedTypesJson: "[]" }, hindi)).toBeNull();
    const full = widenedAllowedTypes({ ...longRow, allowedTypesJson: JSON.stringify(["LONG"]) }, hindi)!;
    expect(widenedAllowedTypes({ ...longRow, allowedTypesJson: JSON.stringify(full) }, hindi)).toBeNull();
    expect(widenedAllowedTypes({ ...longRow, allowedTypesJson: JSON.stringify(["LONG"]) }, { className: "Class 10", subject: "Hindi" })).toBeNull();
    expect(widenedAllowedTypes({ type: "KDG_TRACE_WRITE", count: 1, marksEach: 5, allowedTypesJson: JSON.stringify(["KDG_TRACE_WRITE"]) }, { className: "LKG", subject: "English" })).toBeNull();
  });
});

describe("where types are not re-read", () => {
  it("leaves board classes (9 to 12) alone: their sections take one exact type", () => {
    expect(suggestQuestionType({ type: "VERY_SHORT", text: "सन्धिविच्छेदं कुरुत।", subject: "Sanskrit", chapterTitle: "सन्धयः", className: "Class 10" })).toBeNull();
    expect(suggestQuestionType({ type: "LONG", text: "Write a letter to your friend.", subject: "English", className: "Class 9" })).toBeNull();
    expect(suggestQuestionType({ type: "LONG", text: "Write a letter to your friend.", subject: "English", className: "Class 8" })?.type).toBe("WRITING_SKILL");
    expect(suggestQuestionType({ type: "LONG", text: "Write a letter to your friend.", subject: "English", className: "UKG" })?.type).toBe("WRITING_SKILL");
  });

  it("never reads a very short answer as writing, a map or a drawing", () => {
    expect(suggestQuestionType({ type: "VERY_SHORT", text: "Whom did Lencho write a letter to the post office about?", subject: "English", className: "Class 7" })).toBeNull();
    expect(suggestQuestionType({ type: "VERY_SHORT", text: "Draw the symbol of a cell.", subject: "Science", className: "Class 7" })).toBeNull();
    // but a very short grammar item in a grammar chapter is grammar
    expect(suggestQuestionType({ type: "VERY_SHORT", text: "पर्यायवाची लिखिए।", subject: "Hindi", chapterTitle: "पर्यायवाची शब्द", className: "Class 7" })?.type).toBe("GRAMMAR");
  });

  it("goes by the question's words, not a chapter it may be misfiled under", () => {
    // lesson questions filed under grammar and writing chapters
    expect(suggestQuestionType({ type: "VERY_SHORT", text: "श्रीकृष्ण ने अर्जुन को गीता के माध्यम से क्या उपदेश दिया?", subject: "Hindi", chapterTitle: "व्याकरण परिवार", className: "Class 6" })).toBeNull();
    expect(suggestQuestionType({ type: "LONG", text: "रानी गयी सिधार, चिता अब उसकी दिव्य सवारी थी।", subject: "Hindi", chapterTitle: "रचनात्मक लेखन (निबंध, पत्र)", className: "Class 6" })).toBeNull();
    // an explanation of lines under a writing chapter is reference to context
    expect(suggestQuestionType({ type: "LONG", text: "निम्नलिखित पद्यांश की संदर्भ, प्रसंग सहित व्याख्या कीजिये-", subject: "Hindi", chapterTitle: "रचनात्मक लेखन (निबंध, पत्र)", className: "Class 6" })?.type).toBe("REFERENCE_CONTEXT");
    expect(suggestQuestionType({ type: "VERY_SHORT", text: "Make plurals of the following words: (i) Prince (ii) Mouse", subject: "English", className: "Class 6" })?.type).toBe("GRAMMAR");
  });
});
