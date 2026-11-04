import { describe, expect, it } from "vitest";
import { buildExternalPaperPrompt } from "./externalPaperPrompt";
import { planPaperWithComponents, type PaperAutogenInput } from "./paperAutogen";
import { extractPaperJsonFromReply, parsePaperImport } from "./paperImport";

const paper: PaperAutogenInput = {
  id: "p1",
  title: "Science Half-Yearly",
  academicSession: "2026-27",
  examType: "HALF_YEARLY",
  blueprint: {
    name: "Class 9 Science",
    sections: [
      { id: "sA", title: "Section A", type: "MCQ", count: 4, marksEach: 1 },
      { id: "sB", title: "Section B", type: "SHORT", count: 2, marksEach: 3 },
      { id: "sC", title: "Section C", type: "CASE_STUDY", count: 1, marksEach: 4 },
    ],
    chapters: [
      { chapterId: "c1", marks: 7, chapter: { id: "c1", number: 1, title: "Matter in Our Surroundings" } },
      { chapterId: "c2", marks: 7, chapter: { id: "c2", number: 8, title: "Motion" } },
    ],
    book: { className: "Class 9", subject: "Science", title: "NCERT Science 9" },
  },
  items: [],
};

describe("buildExternalPaperPrompt", () => {
  const plan = planPaperWithComponents(paper);
  const { prompt, questionCount, totalMarks } = buildExternalPaperPrompt({ plan, difficulty: "BOARD", academicSession: "2026-27" });

  it("counts every empty slot and its marks", () => {
    expect(questionCount).toBe(7);
    expect(totalMarks).toBe(14);
  });

  it("asks for questions only, never answers", () => {
    expect(prompt).toMatch(/Do NOT write answers/);
    expect(prompt).toMatch(/Leave out "answer" everywhere/);
    expect(prompt).not.toMatch(/Model answers must be correct/);
  });

  it("lists each section with its exact title, slots, chapters and a difficulty per question", () => {
    for (const t of ['Section "Section A"', 'Section "Section B"', 'Section "Section C"']) expect(prompt).toContain(t);
    expect(prompt).toMatch(/Q1: Chapter (1|8) "/);
    expect((prompt.match(/Difficulty: (EASY|MEDIUM|HARD) \(/g) ?? []).length).toBe(7);
  });

  it("explains only the formats the paper uses", () => {
    expect(prompt).toMatch(/- MCQ: "options" holds exactly 4/);
    expect(prompt).toMatch(/- CASE_STUDY:/);
    expect(prompt).not.toMatch(/- UNSEEN_PASSAGE:/);
  });

  it("plans only the slots still empty, and lists what is already there", () => {
    const partial = { ...paper, items: [{ sectionId: "sA", question: { chapterId: "c1", text: "Which state of matter has a fixed shape?" } }] };
    const res = buildExternalPaperPrompt({
      plan: planPaperWithComponents(partial),
      existingQuestionTexts: ["Which state of matter has a fixed shape?"],
    });
    expect(res.questionCount).toBe(6);
    expect(res.prompt).toContain("Already on the paper");
    expect(res.prompt).toContain("Which state of matter has a fixed shape?");
  });
});

describe("pasting a chat AI's reply", () => {
  const json = `{
  "title": "Science Half-Yearly",
  "sections": [
    { "title": "Section A", "questions": [
      { "text": "Which has the highest rate of diffusion?", "type": "MCQ", "marks": 1, "chapterNumber": 1, "difficulty": "hard", "options": ["Solid", "Liquid", "Gas", "Plasma"] }
    ] },
    { "title": "Section B", "questions": [
      { "text": "Explain why ice floats.", "type": "SHORT", "marks": 3, "chapterNumber": 1, "difficulty": "Medium",
        "orQuestion": { "text": "Explain latent heat with a case study.", "type": "CASE_STUDY", "marks": 3, "subparts": [{ "label": "(i)", "text": "Define it.", "marks": 3 }] } }
    ] }
  ]
}`;

  it("finds the JSON inside a fenced block with prose around it", () => {
    const reply = `Sure! Here is your paper:\n\n\`\`\`json\n${json}\n\`\`\`\n\nLet me know if you want changes.`;
    expect(extractPaperJsonFromReply(reply)).toBe(json);
    const res = parsePaperImport(reply);
    expect(res.success).toBe(true);
    expect(res.format).toBe("json");
    expect(res.totalQuestions).toBe(2);
  });

  it("finds the JSON between prose without a code fence", () => {
    const res = parsePaperImport(`Here you go:\n${json}\nGood luck with the exam.`);
    expect(res.success).toBe(true);
    expect(res.totalMarks).toBe(4);
  });

  it("reads difficulty in any case, and keeps the OR alternative's type and subparts", () => {
    const res = parsePaperImport(json);
    const [a, b] = res.paper.sections.map((s) => s.questions[0]);
    expect(a.difficulty).toBe("HARD");
    expect(b.difficulty).toBe("MEDIUM");
    expect(b.orQuestion?.type).toBe("CASE_STUDY");
    expect(b.orQuestion?.subparts).toHaveLength(1);
  });

  it("leaves plain text papers to the text parser", () => {
    expect(extractPaperJsonFromReply("Section A\n1. What is matter?")).toBeNull();
  });
});
