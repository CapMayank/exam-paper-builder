import { describe, expect, it } from "vitest";
import {
  parseCsvRows,
  parseCsvSyllabus,
  parseJsonSyllabus,
  parseSyllabusContent,
  parseTextSyllabus,
  STANDARD_CURRICULUM_PRESETS,
} from "./syllabusImport";
import {
  getCanonicalSubjectName,
  isSubjectMatching,
  normalizePresetSubject,
} from "./schoolCurriculum";

describe("STANDARD_CURRICULUM_PRESETS", () => {
  it("contains standard CBSE/NCERT curriculum presets with complete chapter lists", () => {
    expect(STANDARD_CURRICULUM_PRESETS.length).toBeGreaterThanOrEqual(6);
    const cbse10Science = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-10-science");
    expect(cbse10Science).toBeDefined();
    expect(cbse10Science?.chapters.length).toBe(13);
    expect(cbse10Science?.chapters[0].title).toContain("Chemical Reactions and Equations");
    expect(cbse10Science?.chapters[0].title).toContain("रासायनिक अभिक्रियाएँ");

    const cbse10Maths = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-10-maths");
    expect(cbse10Maths).toBeDefined();
    expect(cbse10Maths?.chapters.length).toBe(14);
    expect(cbse10Maths?.chapters[0].title).toContain("Real Numbers");

    const cbse9Science = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-9-science");
    expect(cbse9Science).toBeDefined();
    expect(cbse9Science?.chapters.length).toBe(12);

    for (const preset of STANDARD_CURRICULUM_PRESETS) {
      expect(preset.title).toBeTruthy();
      expect(preset.className).toBeTruthy();
      expect(preset.subject).toBeTruthy();
      expect(preset.chapters.length).toBeGreaterThan(0);
      for (const ch of preset.chapters) {
        expect(ch.number).toBeGreaterThan(0);
        expect(ch.title).toBeTruthy();
      }
    }
  });
});

describe("parseCsvRows RFC 4180 parser", () => {
  it("parses unquoted comma-separated values", () => {
    const csv = "Book,Class,Subject\nNCERT,Class 10,Science";
    const rows = parseCsvRows(csv);
    expect(rows).toEqual([
      ["Book", "Class", "Subject"],
      ["NCERT", "Class 10", "Science"],
    ]);
  });

  it("handles double-quoted values containing commas and escaped quotes", () => {
    const csv = 'Chapter,Title\n1,"Chemical Reactions, Equations and ""Equilibrium"""\n2,"Acids, Bases"';
    const rows = parseCsvRows(csv);
    expect(rows.length).toBe(3);
    expect(rows[1][1]).toBe('Chemical Reactions, Equations and "Equilibrium"');
    expect(rows[2][1]).toBe("Acids, Bases");
  });

  it("handles carriage returns \\r\\n and trailing empty lines", () => {
    const csv = "A,B\r\n1,2\r\n3,4\r\n\r\n";
    const rows = parseCsvRows(csv);
    expect(rows).toEqual([
      ["A", "B"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});

describe("parseCsvSyllabus", () => {
  it("parses multi-book tabular CSV with complete metadata", () => {
    const csv = `Book,Class,Subject,Chapter,Title
Science (NCERT),Class 10,Science,1,"Chemical Reactions and Equations"
Science (NCERT),Class 10,Science,2,"Acids, Bases and Salts"
Mathematics (NCERT),Class 10,Mathematics,1,"Real Numbers"
Mathematics (NCERT),Class 10,Mathematics,2,"Polynomials"`;

    const res = parseCsvSyllabus(csv);
    expect(res.errors).toEqual([]);
    expect(res.books.length).toBe(2);

    const sci = res.books.find((b) => b.title === "Science (NCERT)");
    expect(sci).toBeDefined();
    expect(sci?.chapters.length).toBe(2);
    expect(sci?.chapters[0]).toEqual({ number: 1, title: "Chemical Reactions and Equations" });
    expect(sci?.chapters[1]).toEqual({ number: 2, title: "Acids, Bases and Salts" });

    const math = res.books.find((b) => b.title === "Mathematics (NCERT)");
    expect(math).toBeDefined();
    expect(math?.chapters.length).toBe(2);
    expect(math?.chapters[0]).toEqual({ number: 1, title: "Real Numbers" });
  });

  it("parses single-book chapter CSV (Chapter, Title) using provided defaults", () => {
    const csv = `Chapter,Title
1,"Chemical Reactions and Equations (रासायनिक अभिक्रियाएँ)"
2,"Acids, Bases and Salts (अम्ल, क्षारक एवं लवण)"`;

    const res = parseCsvSyllabus(csv, {
      defaultTitle: "Custom Chemistry",
      defaultClass: "Class 10",
      defaultSubject: "Science",
    });

    expect(res.errors).toEqual([]);
    expect(res.books.length).toBe(1);
    expect(res.books[0].title).toBe("Custom Chemistry");
    expect(res.books[0].className).toBe("Class 10");
    expect(res.books[0].chapters.length).toBe(2);
    expect(res.books[0].chapters[0].title).toContain("रासायनिक अभिक्रियाएँ");
  });

  it("handles case-insensitive column headers and extra whitespace", () => {
    const csv = `  cHaPteR  ,   tItLe   
5 , "Life Processes"
6 , "Control and Coordination"`;

    const res = parseCsvSyllabus(csv);
    expect(res.books.length).toBe(1);
    expect(res.books[0].chapters[0]).toEqual({ number: 5, title: "Life Processes" });
    expect(res.books[0].chapters[1]).toEqual({ number: 6, title: "Control and Coordination" });
  });

  it("returns error for empty or header-only CSV", () => {
    expect(parseCsvSyllabus("").errors.length).toBeGreaterThan(0);
    expect(parseCsvSyllabus("Chapter,Title").errors.length).toBeGreaterThan(0);
  });
});

describe("parseTextSyllabus", () => {
  it("parses numbered outlines with bilingual Hindi/English titles", () => {
    const text = `1. Chemical Reactions and Equations (रासायनिक अभिक्रियाएँ एवं समीकरण)
2. Acids, Bases and Salts (अम्ल, क्षारक एवं लवण)
3. Metals and Non-metals (धातु एवं अधातु)`;

    const res = parseTextSyllabus(text, {
      defaultTitle: "Class 10 Science",
      defaultClass: "Class 10",
      defaultSubject: "Science",
    });

    expect(res.errors).toEqual([]);
    expect(res.books.length).toBe(1);
    expect(res.books[0].title).toBe("Class 10 Science");
    expect(res.books[0].chapters.length).toBe(3);
    expect(res.books[0].chapters[0]).toEqual({
      number: 1,
      title: "Chemical Reactions and Equations (रासायनिक अभिक्रियाएँ एवं समीकरण)",
    });
    expect(res.books[0].chapters[1]).toEqual({
      number: 2,
      title: "Acids, Bases and Salts (अम्ल, क्षारक एवं लवण)",
    });
  });

  it("handles various prefix styles (Chapter X -, Ch X:, Unit X.)", () => {
    const text = `Chapter 1 - Real Numbers
Ch 2: Polynomials
Unit 3. Pair of Linear Equations in Two Variables
4) Quadratic Equations
5. Arithmetic Progressions`;

    const res = parseTextSyllabus(text);
    expect(res.books.length).toBe(1);
    expect(res.books[0].chapters.map((c) => ({ n: c.number, t: c.title }))).toEqual([
      { n: 1, t: "Real Numbers" },
      { n: 2, t: "Polynomials" },
      { n: 3, t: "Pair of Linear Equations in Two Variables" },
      { n: 4, t: "Quadratic Equations" },
      { n: 5, t: "Arithmetic Progressions" },
    ]);
  });

  it("auto-numbers unnumbered lines sequentially", () => {
    const text = `Matter in Our Surroundings
Is Matter Around Us Pure
Atoms and Molecules
Structure of the Atom`;

    const res = parseTextSyllabus(text);
    expect(res.books[0].chapters.length).toBe(4);
    expect(res.books[0].chapters[0]).toEqual({ number: 1, title: "Matter in Our Surroundings" });
    expect(res.books[0].chapters[1]).toEqual({ number: 2, title: "Is Matter Around Us Pure" });
    expect(res.books[0].chapters[2]).toEqual({ number: 3, title: "Atoms and Molecules" });
    expect(res.books[0].chapters[3]).toEqual({ number: 4, title: "Structure of the Atom" });
  });

  it("ignores empty lines, headers like 'Syllabus:', and comment lines", () => {
    const text = `
CBSE Class 10 Syllabus 2026-27

1. First Chapter
// some note
# another note

2. Second Chapter
`;
    const res = parseTextSyllabus(text);
    expect(res.books[0].chapters.length).toBe(2);
    expect(res.books[0].chapters[0]).toEqual({ number: 1, title: "First Chapter" });
    expect(res.books[0].chapters[1]).toEqual({ number: 2, title: "Second Chapter" });
  });
});

describe("parseJsonSyllabus", () => {
  it("parses hierarchical array of book objects with chapters", () => {
    const json = JSON.stringify([
      {
        title: "Physics",
        className: "Class 12",
        subject: "Physics",
        chapters: [
          { number: 1, title: "Electric Charges and Fields" },
          { number: 2, title: "Electrostatic Potential and Capacitance" },
        ],
      },
    ]);

    const res = parseJsonSyllabus(json);
    expect(res.errors).toEqual([]);
    expect(res.books.length).toBe(1);
    expect(res.books[0].title).toBe("Physics");
    expect(res.books[0].chapters.length).toBe(2);
  });

  it("parses flat array of chapters into a single book using defaults", () => {
    const json = JSON.stringify([
      { number: 1, title: "Chemical Reactions" },
      { number: 2, title: "Acids and Bases" },
    ]);

    const res = parseJsonSyllabus(json, {
      defaultTitle: "Chemistry X",
      defaultClass: "Class 10",
      defaultSubject: "Science",
    });

    expect(res.books.length).toBe(1);
    expect(res.books[0].title).toBe("Chemistry X");
    expect(res.books[0].chapters.length).toBe(2);
  });

  it("returns error for invalid JSON syntax", () => {
    const res = parseJsonSyllabus("{ invalid json }");
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0].message).toContain("Invalid JSON");
  });
});

describe("parseSyllabusContent dispatcher", () => {
  it("resolves official preset by ID", () => {
    const res = parseSyllabusContent("preset", "cbse-10-science");
    expect(res.errors).toEqual([]);
    expect(res.books.length).toBe(1);
    expect(res.books[0].chapters.length).toBe(13);
  });

  it("returns error for unknown preset ID", () => {
    const res = parseSyllabusContent("preset", "unknown-board-syllabus");
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0].message).toContain("not found");
  });

  it("dispatches to text, csv, and json formats appropriately", () => {
    const textRes = parseSyllabusContent("text", "1. Chapter One\n2. Chapter Two");
    expect(textRes.books[0].chapters.length).toBe(2);

    const csvRes = parseSyllabusContent("csv", "Chapter,Title\n1,Ch 1\n2,Ch 2");
    expect(csvRes.books[0].chapters.length).toBe(2);

    const jsonRes = parseSyllabusContent("json", JSON.stringify([{ number: 1, title: "Ch 1" }]));
    expect(jsonRes.books[0].chapters.length).toBe(1);
  });
});

describe("isSubjectMatching and normalizePresetSubject", () => {
  it("matches identical subject strings regardless of case and whitespace", () => {
    expect(isSubjectMatching("Mathematics", "mathematics")).toBe(true);
    expect(isSubjectMatching("  Science  ", "science")).toBe(true);
    expect(isSubjectMatching("English", "Hindi")).toBe(false);
  });

  it("matches bilingual preset subjects with standard class subjects", () => {
    expect(isSubjectMatching("Mathematics / गणित", "Mathematics")).toBe(true);
    expect(isSubjectMatching("Mathematics / गणित", "Ganit")).toBe(true);
    expect(isSubjectMatching("Science / विज्ञान", "Science")).toBe(true);
    expect(isSubjectMatching("Social Science / सामाजिक विज्ञान", "Social Science")).toBe(true);
    expect(isSubjectMatching("Social Science / सामाजिक विज्ञान", "SST")).toBe(true);
  });

  it("matches curriculum aliases properly", () => {
    expect(isSubjectMatching("Maths", "Mathematics")).toBe(true);
    expect(isSubjectMatching("Environmental Studies", "EVS")).toBe(true);
    expect(isSubjectMatching("Information Technology", "Computer")).toBe(true);
  });

  it("canonicalizes English Core and English Language & Literature to English", () => {
    expect(getCanonicalSubjectName("English Core")).toBe("English");
    expect(getCanonicalSubjectName("English Language & Literature")).toBe("English");
    expect(getCanonicalSubjectName("English Literature")).toBe("English");
    expect(getCanonicalSubjectName("Hindi Core")).toBe("Hindi");
    expect(getCanonicalSubjectName("Hindi Course-A")).toBe("Hindi");
    expect(getCanonicalSubjectName("Mathematics / गणित")).toBe("Mathematics");
    expect(getCanonicalSubjectName("Maths")).toBe("Mathematics");
  });

  it("matches English Core and English Language & Literature with English presets and class subjects", () => {
    expect(isSubjectMatching("English", "English Core")).toBe(true);
    expect(isSubjectMatching("English Core", "English")).toBe(true);
    expect(isSubjectMatching("English", "English Language & Literature")).toBe(true);
    expect(isSubjectMatching("English Language & Literature", "English Core")).toBe(true);
    expect(isSubjectMatching("Hindi", "Hindi Core")).toBe(true);
    expect(isSubjectMatching("Hindi Course-A", "Hindi")).toBe(true);
  });

  it("normalizes preset subjects to canonical subject without coercing into course qualifiers", () => {
    expect(normalizePresetSubject("Mathematics / गणित", "Mathematics")).toBe("Mathematics");
    expect(normalizePresetSubject("Science / विज्ञान", "Science")).toBe("Science");
    expect(normalizePresetSubject("Mathematics / गणित")).toBe("Mathematics");
    expect(normalizePresetSubject("English")).toBe("English");
    // Crucial: When targetSubject is "English Core", normalized subject must be canonical "English"
    expect(normalizePresetSubject("English", "English Core")).toBe("English");
    expect(normalizePresetSubject("English Core")).toBe("English");
    expect(normalizePresetSubject("English Language & Literature")).toBe("English");
  });

  it("ensures parsers automatically output canonical subject names", () => {
    const textRes = parseTextSyllabus("1. A Letter to God\n2. Nelson Mandela", {
      defaultTitle: "First Flight",
      defaultClass: "Class 10",
      defaultSubject: "English Language & Literature",
    });
    expect(textRes.books[0].subject).toBe("English");

    const csvRes = parseCsvSyllabus("Chapter,Title\n1,The Portrait of a Lady", {
      defaultTitle: "Hornbill",
      defaultClass: "Class 11",
      defaultSubject: "English Core",
    });
    expect(csvRes.books[0].subject).toBe("English");

    const jsonRes = parseJsonSyllabus(
      JSON.stringify([{ title: "Hornbill", className: "Class 11", subject: "English Core", chapters: [{ number: 1, title: "The Portrait of a Lady" }] }])
    );
    expect(jsonRes.books[0].subject).toBe("English");
  });
});
