import type { ChapterSpec, SubjectSpec, TextbookSpec } from "./curriculumData";

/**
 * Brings the seeded chapter data in line with the MPBSE 2026-27 अंक योजना for the subjects the school uses.
 * Verified by src/lib/seed-vs-scheme.test.ts. Only what the scheme prints is changed:
 *  - Social Science IX was missing the 4-mark map row.
 *  - English IX/X carried only literature chapters (55/59 marks); the paper is Reading 10 + Writing 16 +
 *    Grammar 10 + Textbooks 39 = 75.
 *  - Sanskrit IX/X split 75 marks across lessons; the scheme allocates 48 marks to grammar, comprehension and
 *    writing components and 27 to lesson-based items.
 */

const SOURCE = "https://mpbse.nic.in/MarksScheme_2026_27.pdf";

function setMarks(chapters: ChapterSpec[], marks: number[]): void {
  const active = chapters.filter((c) => !c.isDeleted);
  active.forEach((c, i) => {
    c.officialMarks = marks[i] ?? 0;
  });
}

function componentBook(title: string, unitTitle: string, rows: Array<[string, number]>, startUnit: number): TextbookSpec {
  return {
    title,
    publisher: `Examination components (not a textbook). Source: ${SOURCE}`,
    chapters: rows.map(([t, m], i) => ({
      chapterNumber: i + 1,
      title: t,
      unitNumber: startUnit + i,
      unitTitle: `${unitTitle}`,
      officialMarks: m,
    })),
  };
}

export function applySchemeCorrections(seed: SubjectSpec[]): void {
  for (const s of seed) {
    // Hindi XI/XII: the syllabus prescribes Aroh, Vitan and Abhivyakti aur Madhyam (chapters here are the scheme's units)
    if (s.name === "Hindi" && (s.classLevel === 11 || s.classLevel === 12)) {
      const part = s.classLevel - 10;
      const tb = s.textbooks[0];
      if (tb && !tb.title.includes("वितान")) tb.title = `आरोह भाग-${part}, वितान भाग-${part}, अभिव्यक्ति और माध्यम`;
    }

    // Social Science IX: map row
    if (s.name === "Social Science" && s.classLevel === 9) {
      const book = s.textbooks.find((t) => t.title.includes("समकालीन भारत"));
      if (book && !book.chapters.some((c) => c.title.includes("मानचित्र"))) {
        book.chapters.push({
          chapterNumber: book.chapters.length + 1,
          title: "मानचित्र कार्य (समकालीन भारत-1 पर आधारित)",
          officialMarks: 4,
        });
      }
    }

    // English IX / X
    if (s.name === "English" && (s.classLevel === 9 || s.classLevel === 10)) {
      const [main, supp] = s.textbooks;
      if (main && supp && !s.textbooks.some((t) => t.title.startsWith("Reading, Writing"))) {
        setMarks(main.chapters, [4, 4, 4, 4, 4, 3, 3, 3, 3]); // 32 = textual MCQ 4 + extracts 6 + short 16 + long 6
        setMarks(supp.chapters, [1, 1, 1, 1, 1, 1, 1, 0, 0]); // 7 = short 4 + long 3
        s.textbooks.unshift(
          componentBook(
            "Reading, Writing & Grammar (examination components)",
            "Sections A-C",
            [
              ["Section A: Reading (two unseen passages)", 10],
              ["Section B: Writing Skills", 16],
              ["Section C: Grammar", 10],
            ],
            1,
          ),
        );
      }
    }

    // Sanskrit IX / X
    if (s.name === "Sanskrit" && (s.classLevel === 9 || s.classLevel === 10)) {
      const lessons = s.textbooks[0];
      if (lessons && !s.textbooks.some((t) => t.title.includes("परीक्षा घटक"))) {
        setMarks(lessons.chapters, [3, 3, 3, 3, 3, 3, 3, 2, 2, 2]); // 27 lesson-based marks
        s.textbooks.push(
          componentBook(
            "संस्कृत व्याकरण एवं रचना (परीक्षा घटक)",
            "व्याकरण, अपठित एवं लेखन",
            [
              ["शब्दरूपाणि + अव्ययाः", 6],
              ["धातुरूपाणि + उपसर्गाः", 6],
              ["सन्धयः + समासाः", 6],
              ["प्रत्ययाः + एकपदेन प्रश्नोत्तराणि", 6],
              ["विशेषणं / विशेष्यम् + पर्यायाः + विलोमाः", 6],
              ["प्रश्ननिर्माणम्", 2],
              ["अशुद्धकारकसंशोधनम्", 2],
              ["वाच्यपरिवर्तनम्", 2],
              ["अपठितगद्यांशम्", 4],
              ["पत्रलेखनम् / आवेदनपत्रलेखनम्", 4],
              ["निबन्धलेखनम्", 4],
            ],
            1,
          ),
        );
      }
    }
  }
}
