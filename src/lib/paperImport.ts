import {
  inferExamTypeFromText,
  QUESTION_TYPES,
  type ExamType,
  type QuestionType,
} from "./constants";
import type { Blueprint, Chapter } from "./types";

export interface ImportedPaperSubpart {
  label: string;
  text: string;
  marks: number;
  answer?: string;
}

export interface ImportedPaperQuestion {
  text: string;
  type: string; // MCQ | SHORT | LONG | CASE_STUDY | FILL_BLANK | TRUE_FALSE | VERY_SHORT | etc.
  marks: number;
  chapterNumber?: number;
  chapterTitle?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  options?: string[]; // For MCQs
  answer?: string; // Model answer / solution key
  orQuestion?: {
    text: string;
    type?: string;
    marks: number;
    chapterNumber?: number;
    chapterTitle?: string;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    options?: string[];
    answer?: string;
  };
  subparts?: ImportedPaperSubpart[];
}

export interface ImportedPaperSection {
  title: string;
  instructions?: string;
  questions: ImportedPaperQuestion[];
}

export interface PaperImportData {
  title: string;
  examType?: ExamType;
  academicSession?: string;
  schoolName?: string;
  examDate?: string;
  paperSet?: string;
  subjectCode?: string;
  layout?: "BOOKLET_A4" | "BOOKLET" | "PAGE";
  generalInstructions?: string;
  sections: ImportedPaperSection[];
}

export interface SectionVerificationResult {
  sectionTitle: string;
  blueprintSectionId?: string;
  expectedCount: number;
  importedCount: number;
  expectedType: string;
  expectedMarksEach: number;
  status: "MATCH" | "UNDERFILLED" | "OVERFILLED" | "TYPE_MISMATCH" | "MARKS_MISMATCH" | "UNMATCHED_SECTION";
  message: string;
}

export interface ChapterVerificationResult {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  targetMarks: number;
  importedMarks: number;
  difference: number;
  status: "MATCH" | "DEFICIT" | "EXCESS";
}

export interface PaperVerificationReport {
  isValid: boolean;
  canProceed: boolean; // True if importable (even with non-fatal warnings)
  matchPercentage: number;
  totalImportedMarks: number;
  totalBlueprintMarks: number;
  totalImportedQuestions: number;
  totalBlueprintQuestions: number;
  sections: SectionVerificationResult[];
  chapters: ChapterVerificationResult[];
  unmappedQuestions: number;
  errors: string[];
  warnings: string[];
}

export interface PaperImportResult {
  success: boolean;
  paper: PaperImportData;
  format: "json" | "csv" | "text";
  totalQuestions: number;
  totalMarks: number;
  errors: string[];
  warnings: string[];
}

// -----------------------------------------------------------------------------
// Sample Formats & Example Templates
// -----------------------------------------------------------------------------

export const SAMPLE_PAPER_JSON = `{
  "title": "Science Half-Yearly Examination 2026–27",
  "examType": "HALF_YEARLY",
  "academicSession": "2026–27",
  "schoolName": "Sarvodaya English Higher Secondary School",
  "examDate": "2026-11-20",
  "paperSet": "SET A",
  "subjectCode": "086",
  "layout": "BOOKLET_A4",
  "generalInstructions": "1. All questions are compulsory.\\n2. This question paper contains 5 sections: A, B, C, D and E.\\n3. Section A contains 5 MCQs of 1 mark each.\\n4. Section B contains 2 Short answer questions of 2 marks each.\\n5. Section C contains 2 Short answer questions of 3 marks each.\\n6. Section D contains 1 Long answer question of 5 marks.\\n7. Section E contains 1 Case study question of 4 marks.",
  "sections": [
    {
      "title": "Section A",
      "instructions": "Multiple choice questions carrying 1 mark each.",
      "questions": [
        {
          "text": "Which gas is evolved when zinc granules react with dilute sulfuric acid?",
          "type": "MCQ",
          "marks": 1,
          "chapterNumber": 1,
          "chapterTitle": "Chemical Reactions and Equations",
          "difficulty": "EASY",
          "options": ["Hydrogen", "Oxygen", "Nitrogen", "Carbon dioxide"],
          "answer": "A"
        },
        {
          "text": "The chemical formula of washing soda is:",
          "type": "MCQ",
          "marks": 1,
          "chapterNumber": 2,
          "chapterTitle": "Acids, Bases and Salts",
          "difficulty": "EASY",
          "options": ["Na2CO3·10H2O", "NaHCO3", "Na2CO3", "CaSO4·2H2O"],
          "answer": "A"
        },
        {
          "text": "Which non-metal is in liquid state at room temperature?",
          "type": "MCQ",
          "marks": 1,
          "chapterNumber": 3,
          "chapterTitle": "Metals and Non-metals",
          "difficulty": "MEDIUM",
          "options": ["Bromine", "Mercury", "Chlorine", "Iodine"],
          "answer": "A"
        },
        {
          "text": "The breakdown of pyruvate to give carbon dioxide, water and energy takes place in:",
          "type": "MCQ",
          "marks": 1,
          "chapterNumber": 6,
          "chapterTitle": "Life Processes",
          "difficulty": "MEDIUM",
          "options": ["Mitochondria", "Cytoplasm", "Chloroplast", "Nucleus"],
          "answer": "A"
        },
        {
          "text": "An electric bulb is rated 220 V and 100 W. When operated on 110 V, power consumed is:",
          "type": "MCQ",
          "marks": 1,
          "chapterNumber": 12,
          "chapterTitle": "Electricity",
          "difficulty": "HARD",
          "options": ["25 W", "50 W", "75 W", "100 W"],
          "answer": "A"
        }
      ]
    },
    {
      "title": "Section B",
      "instructions": "Very short answer questions carrying 2 marks each.",
      "questions": [
        {
          "text": "Why do we apply paint on iron articles? Name the phenomenon it prevents.",
          "type": "SHORT",
          "marks": 2,
          "chapterNumber": 1,
          "chapterTitle": "Chemical Reactions and Equations",
          "difficulty": "EASY",
          "answer": "Paint forms a protective barrier preventing iron from coming in contact with moist air (oxygen and water). This prevents rusting or corrosion."
        },
        {
          "text": "State Ohm's law. Draw the circuit diagram used to verify it.",
          "type": "SHORT",
          "marks": 2,
          "chapterNumber": 12,
          "chapterTitle": "Electricity",
          "difficulty": "MEDIUM",
          "answer": "Ohm's law states that electric current flowing through a conductor is directly proportional to the potential difference across its ends, provided temperature remains constant (V = IR)."
        }
      ]
    },
    {
      "title": "Section C",
      "instructions": "Short answer questions carrying 3 marks each.",
      "questions": [
        {
          "text": "Define neutralization reaction with two balanced chemical equations from daily life.",
          "type": "SHORT",
          "marks": 3,
          "chapterNumber": 2,
          "chapterTitle": "Acids, Bases and Salts",
          "difficulty": "MEDIUM",
          "answer": "A reaction in which an acid reacts with a base to form salt and water is called a neutralization reaction. e.g. HCl + NaOH -> NaCl + H2O."
        },
        {
          "text": "Explain the role of saliva in the digestion of food.",
          "type": "SHORT",
          "marks": 3,
          "chapterNumber": 6,
          "chapterTitle": "Life Processes",
          "difficulty": "MEDIUM",
          "answer": "Saliva contains the enzyme salivary amylase which breaks down starch (complex carbohydrate) into maltose (simple sugar). It also lubricates food for easy swallowing.",
          "orQuestion": {
            "text": "How do autotrophs obtain CO2 and water for photosynthesis?",
            "marks": 3,
            "chapterNumber": 6,
            "chapterTitle": "Life Processes",
            "difficulty": "MEDIUM",
            "answer": "Plants take in CO2 through tiny stomata pores on leaves, and absorb water from soil through root hairs via osmosis."
          }
        }
      ]
    },
    {
      "title": "Section D",
      "instructions": "Long answer questions carrying 5 marks each.",
      "questions": [
        {
          "text": "Derive the relation between focal length (f) and radius of curvature (R) for a spherical mirror. An object is placed at 10 cm in front of a concave mirror of focal length 15 cm. Find the nature, position and magnification of the image.",
          "type": "LONG",
          "marks": 5,
          "chapterNumber": 10,
          "chapterTitle": "Light – Reflection and Refraction",
          "difficulty": "HARD",
          "answer": "1. R = 2f derivation (2 marks).\\n2. Mirror formula 1/f = 1/v + 1/u gives v = +30 cm (2 marks).\\n3. Virtual, erect, magnified image with m = -v/u = +3 (1 mark)."
        }
      ]
    },
    {
      "title": "Section E",
      "instructions": "Case-based integrated questions carrying 4 marks.",
      "questions": [
        {
          "text": "Read the following passage and answer the questions below:\\n\\nIn human beings, the respiratory pigment is haemoglobin which has a very high affinity for oxygen. Carbon dioxide is more soluble in water than oxygen is, and hence is mostly transported in the dissolved form in our blood.",
          "type": "CASE_STUDY",
          "marks": 4,
          "chapterNumber": 6,
          "chapterTitle": "Life Processes",
          "difficulty": "MEDIUM",
          "subparts": [
            {
              "label": "(i)",
              "text": "Where is haemoglobin present in the human body?",
              "marks": 1,
              "answer": "Inside Red Blood Cells (Erythrocytes)."
            },
            {
              "label": "(ii)",
              "text": "Why can simple diffusion not deliver oxygen to all parts of large multicellular organisms?",
              "marks": 1,
              "answer": "Diffusion is too slow; in humans it would take 3 years for oxygen to reach toes from lungs without haemoglobin."
            },
            {
              "label": "(iii)",
              "text": "How is carbon dioxide transported in the human body?",
              "marks": 2,
              "answer": "Primarily as dissolved bicarbonate ions (HCO3-) in blood plasma and partially bound to carbamino-haemoglobin."
            }
          ]
        }
      ]
    }
  ]
}`;

export const SAMPLE_PAPER_CSV = `Section,Position,Type,Marks,ChapterNumber,ChapterTitle,QuestionText,Options,Answer,Difficulty
Section A,1,MCQ,1,1,Chemical Reactions and Equations,"Which gas is evolved when zinc granules react with dilute sulfuric acid?","Hydrogen|Oxygen|Nitrogen|Carbon dioxide",A,EASY
Section A,2,MCQ,1,2,Acids Bases and Salts,"The chemical formula of washing soda is:","Na2CO3.10H2O|NaHCO3|Na2CO3|CaSO4.2H2O",A,EASY
Section A,3,MCQ,1,3,Metals and Non-metals,"Which non-metal is liquid at room temperature?","Bromine|Mercury|Chlorine|Iodine",A,MEDIUM
Section A,4,MCQ,1,6,Life Processes,"The breakdown of pyruvate to give carbon dioxide and energy takes place in:","Mitochondria|Cytoplasm|Chloroplast|Nucleus",A,MEDIUM
Section A,5,MCQ,1,12,Electricity,"An electric bulb is rated 220V and 100W. Power consumed at 110V is:","25 W|50 W|75 W|100 W",A,HARD
Section B,1,SHORT,2,1,Chemical Reactions and Equations,"Why do we apply paint on iron articles? Name the phenomenon it prevents.",,"Prevents moist air contact and rusting.",EASY
Section B,2,SHORT,2,12,Electricity,"State Ohm's law and give its mathematical equation.",,"Current is directly proportional to potential difference (V = IR).",MEDIUM
Section C,1,SHORT,3,2,Acids Bases and Salts,"Define neutralization reaction with a balanced equation.",,"Acid reacts with base to produce salt and water (HCl + NaOH -> NaCl + H2O).",MEDIUM
Section C,2,SHORT,3,6,Life Processes,"Explain the role of saliva in the digestion of food.",,"Salivary amylase digests starch into maltose and lubricates food.",MEDIUM
Section D,1,LONG,5,10,Light Reflection and Refraction,"An object is placed at 10 cm in front of a concave mirror of focal length 15 cm. Find image position and nature.",,"1/f = 1/v + 1/u gives v = +30 cm. Image is virtual, erect, and magnified (m = +3).",HARD
Section E,1,CASE_STUDY,4,6,Life Processes,"Read the passage: In humans respiratory pigment is haemoglobin with high affinity for oxygen while CO2 is mostly dissolved in blood. Answer (i) Where is haemoglobin present? (ii) Why is diffusion insufficient? (iii) How is CO2 transported?",,"(i) In RBCs. (ii) Diffusion is too slow for large organisms. (iii) Dissolved as bicarbonate ions in plasma.",MEDIUM`;

export const SAMPLE_PAPER_TEXT = `# Science Half-Yearly Examination 2026–27
Class: Class 10 | Subject: Science | Term: HALF_YEARLY | Session: 2026–27 | Set: SET A | Marks: 20 | Time: 60 mins

## Section A (MCQs - 1 Mark Each)
1. [Ch: 1] Which gas is evolved when zinc granules react with dilute sulfuric acid? (1 Mark)
   (A) Hydrogen
   (B) Oxygen
   (C) Nitrogen
   (D) Carbon dioxide
   Answer: (A)

2. [Ch: 2] The chemical formula of washing soda is: (1 Mark)
   (A) Na2CO3·10H2O
   (B) NaHCO3
   (C) Na2CO3
   (D) CaSO4·2H2O
   Answer: (A)

3. [Ch: 3] Which non-metal is in liquid state at room temperature? (1 Mark)
   (A) Bromine
   (B) Mercury
   (C) Chlorine
   (D) Iodine
   Answer: (A)

4. [Ch: 6] The breakdown of pyruvate to give carbon dioxide, water and energy takes place in: (1 Mark)
   (A) Mitochondria
   (B) Cytoplasm
   (C) Chloroplast
   (D) Nucleus
   Answer: (A)

5. [Ch: 12] An electric bulb is rated 220 V and 100 W. When operated on 110 V, power consumed is: (1 Mark)
   (A) 25 W
   (B) 50 W
   (C) 75 W
   (D) 100 W
   Answer: (A)

## Section B (Short Answer - 2 Marks Each)
6. [Ch: 1] Why do we apply paint on iron articles? Name the phenomenon it prevents. (2 Marks)
   Answer: Paint forms a protective barrier preventing iron from coming in contact with moist air (oxygen and water). This prevents rusting.

7. [Ch: 12] State Ohm's law. Write its mathematical expression. (2 Marks)
   Answer: Electric current flowing through a conductor is directly proportional to the potential difference across its ends (V = IR).

## Section C (Short Answer - 3 Marks Each)
8. [Ch: 2] Define neutralization reaction with two balanced chemical equations. (3 Marks)
   Answer: Reaction of acid with base to form salt and water. e.g. HCl + NaOH -> NaCl + H2O.

9. [Ch: 6] Explain the role of saliva in the digestion of food. (3 Marks)
   Answer: Contains salivary amylase which converts starch into maltose. Lubricates food for swallowing.

## Section D (Long Answer - 5 Marks Each)
10. [Ch: 10] An object is placed at 10 cm in front of a concave mirror of focal length 15 cm. Find the nature, position and magnification of the image. (5 Marks)
   Answer: 1/f = 1/v + 1/u gives v = +30 cm. Image is virtual, erect and magnified (m = +3).

## Section E (Case Study - 4 Marks)
11. [Ch: 6] Read the following passage on human respiration: Haemoglobin in RBCs transports oxygen while CO2 is transported dissolved in blood plasma. (4 Marks)
   (i) Where is haemoglobin present? [1m]
   (ii) Why is simple diffusion insufficient in humans? [1m]
   (iii) How is carbon dioxide transported in human blood? [2m]
   Answer: (i) Red blood cells (ii) Too slow over multicellular distances (iii) Bicarbonate ions in plasma.`;

// -----------------------------------------------------------------------------
// Parsers
// -----------------------------------------------------------------------------

/** Parse JSON Question Paper format */
export function parsePaperJson(jsonStr: string): PaperImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(jsonStr);
  } catch (err) {
    return {
      success: false,
      paper: { title: "", sections: [] },
      format: "json",
      totalQuestions: 0,
      totalMarks: 0,
      errors: [`JSON syntax error: ${(err as Error).message}`],
      warnings: [],
    };
  }

  if (typeof raw !== "object" || raw === null) {
    return {
      success: false,
      paper: { title: "", sections: [] },
      format: "json",
      totalQuestions: 0,
      totalMarks: 0,
      errors: ["JSON must be an object containing 'title' and 'sections'."],
      warnings: [],
    };
  }

  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : "Imported Exam Paper";
  const rawExamType = typeof obj.examType === "string" ? obj.examType.trim().toUpperCase() : "";
  const examType: ExamType | undefined =
    rawExamType === "QUARTERLY" || rawExamType === "HALF_YEARLY" || rawExamType === "ANNUAL"
      ? rawExamType
      : inferExamTypeFromText(title) ?? undefined;
  const academicSession = typeof obj.academicSession === "string" ? obj.academicSession.trim() : undefined;
  const schoolName = typeof obj.schoolName === "string" ? obj.schoolName.trim() : undefined;
  const examDate = typeof obj.examDate === "string" ? obj.examDate.trim() : undefined;
  const paperSet = typeof obj.paperSet === "string" ? obj.paperSet.trim() : undefined;
  const subjectCode = typeof obj.subjectCode === "string" ? obj.subjectCode.trim() : undefined;
  const layout =
    obj.layout === "BOOKLET_A4" || obj.layout === "BOOKLET" || obj.layout === "PAGE"
      ? (obj.layout as "BOOKLET_A4" | "BOOKLET" | "PAGE")
      : undefined;
  const generalInstructions =
    typeof obj.generalInstructions === "string"
      ? obj.generalInstructions.trim()
      : Array.isArray(obj.generalInstructions)
      ? obj.generalInstructions.join("\n")
      : undefined;

  const rawSections = Array.isArray(obj.sections) ? obj.sections : [];
  if (rawSections.length === 0) {
    errors.push("Paper must have at least one section.");
  }

  const parsedSections: ImportedPaperSection[] = [];
  let totalQuestions = 0;
  let totalMarks = 0;

  for (let sIdx = 0; sIdx < rawSections.length; sIdx++) {
    const s = rawSections[sIdx] as Record<string, unknown>;
    const secTitle =
      typeof s.title === "string" && s.title.trim()
        ? s.title.trim()
        : `Section ${String.fromCharCode(65 + sIdx)}`;
    const instructions = typeof s.instructions === "string" ? s.instructions.trim() : undefined;

    const rawQuestions = Array.isArray(s.questions) ? s.questions : [];
    const secQuestions: ImportedPaperQuestion[] = [];

    for (let qIdx = 0; qIdx < rawQuestions.length; qIdx++) {
      const q = rawQuestions[qIdx] as Record<string, unknown>;
      const qText = typeof q.text === "string" ? q.text.trim() : "";
      if (!qText) {
        warnings.push(`${secTitle} Question ${qIdx + 1}: empty question text; skipped.`);
        continue;
      }

      const qMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;
      const rawType =
        typeof q.type === "string" && q.type.trim()
          ? q.type.trim()
          : Array.isArray(q.options) && q.options.length >= 2
          ? "MCQ"
          : "SHORT";
      const qType = normalizeQuestionType(rawType);
      const chapterNumber =
        q.chapterNumber !== undefined && !isNaN(Number(q.chapterNumber))
          ? Number(q.chapterNumber)
          : undefined;
      const chapterTitle = typeof q.chapterTitle === "string" ? q.chapterTitle.trim() : undefined;
      const difficulty =
        q.difficulty === "EASY" || q.difficulty === "HARD" ? q.difficulty : "MEDIUM";
      const options = Array.isArray(q.options) ? q.options.map((opt) => String(opt).trim()) : undefined;
      const answer = typeof q.answer === "string" ? q.answer.trim() : undefined;

      // OR question
      let orQuestion: ImportedPaperQuestion["orQuestion"] = undefined;
      if (typeof q.orQuestion === "object" && q.orQuestion !== null) {
        const orObj = q.orQuestion as Record<string, unknown>;
        if (typeof orObj.text === "string" && orObj.text.trim()) {
          orQuestion = {
            text: orObj.text.trim(),
            marks: Number(orObj.marks) || qMarks,
            chapterNumber:
              orObj.chapterNumber !== undefined && !isNaN(Number(orObj.chapterNumber))
                ? Number(orObj.chapterNumber)
                : chapterNumber,
            chapterTitle: typeof orObj.chapterTitle === "string" ? orObj.chapterTitle.trim() : chapterTitle,
            difficulty:
              orObj.difficulty === "EASY" || orObj.difficulty === "HARD" ? orObj.difficulty : "MEDIUM",
            options: Array.isArray(orObj.options) ? orObj.options.map((opt) => String(opt).trim()) : undefined,
            answer: typeof orObj.answer === "string" ? orObj.answer.trim() : undefined,
          };
        }
      }

      // Subparts for case study or structured questions
      let subparts: ImportedPaperSubpart[] | undefined = undefined;
      if (Array.isArray(q.subparts) && q.subparts.length > 0) {
        subparts = q.subparts.map((sp: Record<string, unknown>, spIdx: number) => ({
          label: typeof sp.label === "string" && sp.label.trim() ? sp.label.trim() : `(${spIdx + 1})`,
          text: typeof sp.text === "string" ? sp.text.trim() : "",
          marks: Number(sp.marks) || 1,
          answer: typeof sp.answer === "string" ? sp.answer.trim() : undefined,
        }));
      }

      if (qType === "MCQ" && (!options || options.length < 2)) {
        warnings.push(`${secTitle} Question ${qIdx + 1}: MCQ requires at least 2 options.`);
      }

      secQuestions.push({
        text: qText,
        type: qType,
        marks: qMarks,
        chapterNumber,
        chapterTitle,
        difficulty,
        options,
        answer,
        orQuestion,
        subparts,
      });

      totalQuestions++;
      totalMarks += qMarks;
    }

    parsedSections.push({
      title: secTitle,
      instructions,
      questions: secQuestions,
    });
  }

  const success = errors.length === 0 && totalQuestions > 0;
  return {
    success,
    paper: {
      title,
      examType,
      academicSession,
      schoolName,
      examDate,
      paperSet,
      subjectCode,
      layout,
      generalInstructions,
      sections: parsedSections,
    },
    format: "json",
    totalQuestions,
    totalMarks,
    errors,
    warnings,
  };
}

/** Parse CSV format question paper */
export function parsePaperCsv(csvStr: string): PaperImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = csvStr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      paper: { title: "Imported Paper", sections: [] },
      format: "csv",
      totalQuestions: 0,
      totalMarks: 0,
      errors: ["CSV must contain a header row and at least one question row."],
      warnings: [],
    };
  }

  // Parse header
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const secCol = header.findIndex((h) => h.includes("sec"));
  const typeCol = header.findIndex((h) => h.includes("type"));
  const marksCol = header.findIndex((h) => h.includes("mark"));
  const chNumCol = header.findIndex((h) => h.includes("chnum") || h.includes("chapternum") || h.includes("ch"));
  const chTitleCol = header.findIndex((h) => h.includes("chapt") && !h.includes("num"));
  const textCol = header.findIndex((h) => h.includes("text") || h.includes("question") || h.includes("desc"));
  const optCol = header.findIndex((h) => h.includes("opt"));
  const ansCol = header.findIndex((h) => h.includes("ans") || h.includes("key"));
  const diffCol = header.findIndex((h) => h.includes("diff"));

  if (textCol === -1) {
    errors.push("CSV header must contain a 'Question' or 'Text' column.");
    return {
      success: false,
      paper: { title: "Imported Paper", sections: [] },
      format: "csv",
      totalQuestions: 0,
      totalMarks: 0,
      errors,
      warnings,
    };
  }

  const sectionsMap = new Map<string, ImportedPaperQuestion[]>();
  let totalQuestions = 0;
  let totalMarks = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0 || cols.every((c) => !c.trim())) continue;

    const secName = secCol !== -1 && cols[secCol]?.trim() ? cols[secCol].trim() : "Section A";
    const qText = cols[textCol]?.trim() || "";
    if (!qText) continue;

    const qType = normalizeQuestionType(typeCol !== -1 && cols[typeCol]?.trim() ? cols[typeCol].trim() : "SHORT");
    const qMarks = marksCol !== -1 && Number(cols[marksCol]) > 0 ? Number(cols[marksCol]) : 1;
    const chNum = chNumCol !== -1 && !isNaN(Number(cols[chNumCol])) ? Number(cols[chNumCol]) : undefined;
    const chTitle = chTitleCol !== -1 && cols[chTitleCol]?.trim() ? cols[chTitleCol].trim() : undefined;
    const rawOptions = optCol !== -1 && cols[optCol]?.trim() ? cols[optCol].trim() : "";
    const options = rawOptions
      ? rawOptions.split(/[|;]/).map((o) => o.trim()).filter((o) => o.length > 0)
      : undefined;
    const answer = ansCol !== -1 && cols[ansCol]?.trim() ? cols[ansCol].trim() : undefined;
    const rawDiff = diffCol !== -1 ? cols[diffCol]?.trim().toUpperCase() : "MEDIUM";
    const difficulty: "EASY" | "MEDIUM" | "HARD" =
      rawDiff === "EASY" || rawDiff === "HARD" ? rawDiff : "MEDIUM";

    const question: ImportedPaperQuestion = {
      text: qText,
      type: qType,
      marks: qMarks,
      chapterNumber: chNum,
      chapterTitle: chTitle,
      difficulty,
      options,
      answer,
    };

    if (!sectionsMap.has(secName)) {
      sectionsMap.set(secName, []);
    }
    sectionsMap.get(secName)!.push(question);
    totalQuestions++;
    totalMarks += qMarks;
  }

  const sections: ImportedPaperSection[] = Array.from(sectionsMap.entries()).map(([title, questions]) => ({
    title,
    questions,
  }));

  return {
    success: errors.length === 0 && totalQuestions > 0,
    paper: {
      title: "Imported Paper from CSV",
      sections,
    },
    format: "csv",
    totalQuestions,
    totalMarks,
    errors,
    warnings,
  };
}

/** Parse plain text / markdown structured question paper */
export function parsePaperText(text: string): PaperImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);

  let paperTitle: string | undefined = undefined;
  let examType: ExamType | undefined;
  let academicSession: string | undefined;
  let schoolName: string | undefined;
  let paperSet: string | undefined;
  let subjectCode: string | undefined;

  const sections: ImportedPaperSection[] = [];
  let currentSection: ImportedPaperSection = { title: "Section A", questions: [] };
  let currentQuestion: Partial<ImportedPaperQuestion> | null = null;
  let totalQuestions = 0;
  let totalMarks = 0;

  function commitCurrentQuestion() {
    if (!currentQuestion || !currentQuestion.text?.trim()) return;
    const qMarks = currentQuestion.marks ?? 1;
    const q: ImportedPaperQuestion = {
      text: currentQuestion.text.trim(),
      type: currentQuestion.type || (currentQuestion.options && currentQuestion.options.length >= 2 ? "MCQ" : "SHORT"),
      marks: qMarks,
      chapterNumber: currentQuestion.chapterNumber,
      chapterTitle: currentQuestion.chapterTitle,
      difficulty: currentQuestion.difficulty || "MEDIUM",
      options: currentQuestion.options,
      answer: currentQuestion.answer,
      subparts: currentQuestion.subparts,
      orQuestion: currentQuestion.orQuestion,
    };
    currentSection.questions.push(q);
    totalQuestions++;
    totalMarks += qMarks;
    currentQuestion = null;
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const line = rawLine.trim();
    if (!line) continue;

    // Header metadata extraction
    if (line.startsWith("# ") && !paperTitle) {
      paperTitle = line.replace(/^#\s+/, "").trim();
      const inferred = inferExamTypeFromText(paperTitle);
      if (inferred) examType = inferred;
      continue;
    }
    if (line.toLowerCase().includes("term:") || line.toLowerCase().includes("examtype:") || line.toLowerCase().includes("exam type:")) {
      const match = line.match(/(?:term|exam\s*type):\s*([A-Za-z_-]+)/i);
      if (match) {
        const rawTerm = match[1].trim().toUpperCase();
        if (rawTerm === "QUARTERLY" || rawTerm === "HALF_YEARLY" || rawTerm === "ANNUAL") {
          examType = rawTerm;
        } else {
          const inf = inferExamTypeFromText(rawTerm);
          if (inf) examType = inf;
        }
      }
    }
    if (line.toLowerCase().includes("session:")) {
      const match = line.match(/session:\s*([0-9–-]+)/i);
      if (match) academicSession = match[1];
    }
    if (line.toLowerCase().includes("set:")) {
      const match = line.match(/set:\s*([A-Za-z0-9\s]+)/i);
      if (match) paperSet = match[1].trim();
    }
    if (line.toLowerCase().includes("subject code:") || line.toLowerCase().includes("code:")) {
      const match = line.match(/(?:subject\s+)?code:\s*([0-9A-Za-z]+)/i);
      if (match) subjectCode = match[1].trim();
    }
    if (line.toLowerCase().includes("school:")) {
      const match = line.match(/school:\s*(.+)$/i);
      if (match) schoolName = match[1].trim();
    }

    // Section header e.g. "## Section A" or "Section B:"
    const secMatch = line.match(/^(?:##\s+|###\s+)?(Section\s+[A-Za-z0-9]+|Part\s+[A-Za-z0-9]+)(.*)$/i);
    if (secMatch) {
      commitCurrentQuestion();
      if (currentSection.questions.length > 0) {
        sections.push(currentSection);
      }
      const secTitle = secMatch[1].trim();
      const instructions = secMatch[2]?.replace(/^[:\s\-()]+/, "").trim() || undefined;
      currentSection = { title: secTitle, instructions, questions: [] };
      continue;
    }

    // Question line: starts with number e.g. "1.", "1)", "Q1."
    const qMatch = line.match(/^(?:Q\s*)?(\d+)[.)]\s+(.*)$/i);
    if (qMatch) {
      commitCurrentQuestion();
      const rest = qMatch[2].trim();

      // Extract marks from text e.g. "(1 Mark)", "[2 Marks]", "(5m)"
      let marks = 1;
      const marksMatch = rest.match(/[\(\[]\s*(\d+)\s*(?:marks?|m)\s*[\)\]]/i);
      if (marksMatch) {
        marks = parseInt(marksMatch[1], 10);
      }

      // Extract chapter annotation e.g. "[Ch: 1]", "[Chapter: Real Numbers]"
      let chapterNumber: number | undefined;
      let chapterTitle: string | undefined;
      const chMatch = rest.match(/\[(?:ch|chapter):\s*([0-9]+)(?:\s*-\s*([^\]]+))?\]/i);
      if (chMatch) {
        chapterNumber = parseInt(chMatch[1], 10);
        if (chMatch[2]) chapterTitle = chMatch[2].trim();
      } else {
        const titleMatch = rest.match(/\[(?:ch|chapter):\s*([^\]0-9][^\]]+)\]/i);
        if (titleMatch) chapterTitle = titleMatch[1].trim();
      }

      // Clean extracted tokens from question text
      const cleanText = rest
        .replace(/\[(?:ch|chapter):[^\]]+\]/gi, "")
        .replace(/[\(\[]\s*\d+\s*(?:marks?|m)\s*[\)\]]/gi, "")
        .trim();

      currentQuestion = {
        text: cleanText,
        marks,
        chapterNumber,
        chapterTitle,
        type: marks === 1 ? "MCQ" : marks >= 5 ? "LONG" : "SHORT",
        options: [],
      };
      continue;
    }

    // MCQ option: e.g. "(A) Hydrogen" or "A. Hydrogen"
    const optMatch = line.match(/^[\(\[]?([A-D])[\)\]\.]\s+(.*)$/i);
    if (optMatch && currentQuestion) {
      if (!currentQuestion.options) currentQuestion.options = [];
      currentQuestion.options.push(optMatch[2].trim());
      currentQuestion.type = "MCQ";
      continue;
    }

    // Answer key line: e.g. "Answer: (A)" or "Ans: Option A"
    const ansMatch = line.match(/^(?:Answer|Ans|Key):\s*(.*)$/i);
    if (ansMatch && currentQuestion) {
      currentQuestion.answer = ansMatch[1].trim();
      continue;
    }

    // Case study subpart: e.g. "(i) Where is..."
    const subMatch = line.match(/^\(([ivx]+|\d+)\)\s+(.*)$/i);
    if (subMatch && currentQuestion) {
      if (!currentQuestion.subparts) currentQuestion.subparts = [];
      const spText = subMatch[2].trim();
      let spMarks = 1;
      const spMarksMatch = spText.match(/[\(\[]\s*(\d+)\s*(?:marks?|m)\s*[\)\]]/i);
      if (spMarksMatch) spMarks = parseInt(spMarksMatch[1], 10);
      currentQuestion.subparts.push({
        label: `(${subMatch[1]})`,
        text: spText.replace(/[\(\[]\s*\d+\s*(?:marks?|m)\s*[\)\]]/gi, "").trim(),
        marks: spMarks,
      });
      currentQuestion.type = "CASE_STUDY";
      continue;
    }

    // Continuation of question text
    if (currentQuestion && currentQuestion.text) {
      currentQuestion.text += " " + line;
    }
  }

  commitCurrentQuestion();
  if (currentSection.questions.length > 0) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    errors.push("No sections or numbered questions could be identified from the text.");
  }

  return {
    success: errors.length === 0 && totalQuestions > 0,
    paper: {
      title: paperTitle || "Imported Question Paper",
      examType,
      academicSession,
      schoolName,
      paperSet,
      subjectCode,
      sections,
    },
    format: "text",
    totalQuestions,
    totalMarks,
    errors,
    warnings,
  };
}

/** Unified Parser with automatic format detection */
export function parsePaperImport(
  content: string,
  format: "auto" | "json" | "csv" | "text" = "auto"
): PaperImportResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return {
      success: false,
      paper: { title: "", sections: [] },
      format: "text",
      totalQuestions: 0,
      totalMarks: 0,
      errors: ["Input content is empty."],
      warnings: [],
    };
  }

  if (format === "json" || (format === "auto" && trimmed.startsWith("{"))) {
    return parsePaperJson(trimmed);
  }

  if (format === "csv" || (format === "auto" && isLikelyCsv(trimmed))) {
    return parsePaperCsv(trimmed);
  }

  return parsePaperText(trimmed);
}

// -----------------------------------------------------------------------------
// Blueprint Verification & Matching Engine
// -----------------------------------------------------------------------------

export interface BlueprintSectionCandidate {
  id: string;
  title: string;
  type: string;
  count: number;
  marksEach: number;
  position: number;
  instructions?: string | null;
}

/**
 * Intelligently matches an imported question to the best matching blueprint section slot.
 * Prioritizes matching section title + question type + marksEach, tracking slot capacities
 * to support composite multi-type sections (e.g. Section A containing MCQ, FillBlank, TrueFalse, Match, Short).
 */
export function matchQuestionToBlueprintSection(
  q: ImportedPaperQuestion,
  impSecTitle: string,
  impSecIdx: number,
  bpSections: BlueprintSectionCandidate[],
  allocatedCounts: Map<string, number>
): BlueprintSectionCandidate | null {
  if (bpSections.length === 0) return null;

  const normImpTitle = normalizeText(impSecTitle);
  const normQType = normalizeQuestionType(q.type);
  const qMarks = q.marks ?? 1;

  // 1. Blueprint sections that share the imported section title
  const titleMatches = bpSections.filter(
    (s) => normalizeText(s.title) === normImpTitle
  );

  if (titleMatches.length > 0) {
    // 1A. Title match + Type match + Marks match (with remaining capacity)
    const exactSlot = titleMatches.find(
      (s) =>
        s.type === normQType &&
        s.marksEach === qMarks &&
        (allocatedCounts.get(s.id) ?? 0) < s.count
    );
    if (exactSlot) return exactSlot;

    // 1B. Title match + Type match (with remaining capacity)
    const typeSlot = titleMatches.find(
      (s) => s.type === normQType && (allocatedCounts.get(s.id) ?? 0) < s.count
    );
    if (typeSlot) return typeSlot;

    // 1C. Title match + Type match + Marks match (overflow beyond quota)
    const exactOverflow = titleMatches.find(
      (s) => s.type === normQType && s.marksEach === qMarks
    );
    if (exactOverflow) return exactOverflow;

    // 1D. Title match + Type match (overflow beyond quota)
    const typeOverflow = titleMatches.find((s) => s.type === normQType);
    if (typeOverflow) return typeOverflow;

    // 1E. Title match + Marks match (with remaining capacity)
    const marksSlot = titleMatches.find(
      (s) => s.marksEach === qMarks && (allocatedCounts.get(s.id) ?? 0) < s.count
    );
    if (marksSlot) return marksSlot;

    // 1F. Any title match with remaining capacity
    const anyCapacity = titleMatches.find(
      (s) => (allocatedCounts.get(s.id) ?? 0) < s.count
    );
    if (anyCapacity) return anyCapacity;

    // 1G. Fallback to first section of this title
    return titleMatches[0];
  }

  // 2. No title match (e.g. unnamed sections or mismatched names like "Part 1" vs "Section A")
  // 2A. Global Type + Marks match with remaining capacity
  const globalExact = bpSections.find(
    (s) =>
      s.type === normQType &&
      s.marksEach === qMarks &&
      (allocatedCounts.get(s.id) ?? 0) < s.count
  );
  if (globalExact) return globalExact;

  // 2B. Global Type match with remaining capacity
  const globalType = bpSections.find(
    (s) => s.type === normQType && (allocatedCounts.get(s.id) ?? 0) < s.count
  );
  if (globalType) return globalType;

  // 2C. Global Marks match with remaining capacity
  const globalMarks = bpSections.find(
    (s) => s.marksEach === qMarks && (allocatedCounts.get(s.id) ?? 0) < s.count
  );
  if (globalMarks) return globalMarks;

  // 2D. Global Type match (overflow)
  const globalTypeOverflow = bpSections.find((s) => s.type === normQType);
  if (globalTypeOverflow) return globalTypeOverflow;

  // 2E. Sequential position fallback
  return bpSections[impSecIdx] || bpSections[0];
}

/**
 * Deeply validates and verifies an imported paper against an active Blueprint and its book chapters.
 */
export function verifyPaperAgainstBlueprint(
  imported: PaperImportData,
  blueprint: Blueprint,
  bookChapters: Chapter[]
): PaperVerificationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const totalBlueprintMarks = blueprint.sections.reduce((sum, s) => sum + s.count * s.marksEach, 0);
  const totalBlueprintQuestions = blueprint.sections.reduce((sum, s) => sum + s.count, 0);

  let totalImportedMarks = 0;
  let totalImportedQuestions = 0;
  let unmappedQuestions = 0;

  // Chapter mapping index
  const chapterByNum = new Map<number, Chapter>();
  const chapterByTitle = new Map<string, Chapter>();
  for (const ch of bookChapters) {
    chapterByNum.set(ch.number, ch);
    chapterByTitle.set(normalizeText(ch.title), ch);
  }

  // Track chapter marks accumulated from imported paper
  const chapterMarksAccumulated = new Map<string, number>();
  for (const ch of bookChapters) {
    chapterMarksAccumulated.set(ch.id, 0);
  }

  // Index Blueprint sections
  const bpSections: BlueprintSectionCandidate[] = [...blueprint.sections].sort((a, b) => a.position - b.position);
  const allocatedCounts = new Map<string, number>();
  const assignedQuestionsBySection = new Map<string, ImportedPaperQuestion[]>();
  for (const s of bpSections) {
    allocatedCounts.set(s.id, 0);
    assignedQuestionsBySection.set(s.id, []);
  }

  const unmatchedQuestions: { title: string; question: ImportedPaperQuestion }[] = [];

  // Map each imported question to its best matching blueprint section slot
  for (let sIdx = 0; sIdx < imported.sections.length; sIdx++) {
    const impSec = imported.sections[sIdx];
    for (const q of impSec.questions) {
      totalImportedMarks += q.marks;
      totalImportedQuestions++;

      const bpSec = matchQuestionToBlueprintSection(
        q,
        impSec.title,
        sIdx,
        bpSections,
        allocatedCounts
      );

      if (bpSec) {
        allocatedCounts.set(bpSec.id, (allocatedCounts.get(bpSec.id) ?? 0) + 1);
        assignedQuestionsBySection.get(bpSec.id)!.push(q);
      } else {
        unmatchedQuestions.push({ title: impSec.title, question: q });
      }

      // Track chapter marks accumulated
      let matchedCh: Chapter | undefined;
      if (q.chapterNumber !== undefined && chapterByNum.has(q.chapterNumber)) {
        matchedCh = chapterByNum.get(q.chapterNumber);
      } else if (q.chapterTitle) {
        matchedCh = chapterByTitle.get(normalizeText(q.chapterTitle));
      }

      if (matchedCh) {
        const cur = chapterMarksAccumulated.get(matchedCh.id) ?? 0;
        chapterMarksAccumulated.set(matchedCh.id, cur + q.marks);
      } else {
        unmappedQuestions++;
      }
    }
  }

  // 1. Build Section Verification Results for every Blueprint Section
  const sectionResults: SectionVerificationResult[] = [];

  for (const bpSec of bpSections) {
    const assigned = assignedQuestionsBySection.get(bpSec.id) ?? [];
    const impCount = assigned.length;
    let status: SectionVerificationResult["status"] = "MATCH";
    let message = `All ${impCount} questions match blueprint specifications (${bpSec.type}, ${bpSec.marksEach}m).`;

    if (impCount === 0 && bpSec.count > 0) {
      status = "UNDERFILLED";
      message = `Section contains 0 questions (missing all ${bpSec.count} questions vs. blueprint quota).`;
      warnings.push(`Section '${bpSec.title}' (${bpSec.type}): missing all ${bpSec.count} questions.`);
    } else if (impCount < bpSec.count) {
      status = "UNDERFILLED";
      message = `Section contains ${impCount} questions (short by ${bpSec.count - impCount} vs. blueprint quota of ${bpSec.count}).`;
      warnings.push(`Section '${bpSec.title}' (${bpSec.type}): ${impCount}/${bpSec.count} questions provided (${bpSec.count - impCount} missing).`);
    } else if (impCount > bpSec.count) {
      status = "OVERFILLED";
      message = `Section contains ${impCount} questions (${impCount - bpSec.count} extra beyond blueprint quota of ${bpSec.count}).`;
      warnings.push(`Section '${bpSec.title}' (${bpSec.type}): contains ${impCount} questions (blueprint quota is ${bpSec.count}).`);
    } else {
      const typeMismatches = assigned.filter((q) => normalizeQuestionType(q.type) !== bpSec.type);
      const marksMismatches = assigned.filter((q) => q.marks !== bpSec.marksEach);
      if (typeMismatches.length > 0) {
        status = "TYPE_MISMATCH";
        message = `${typeMismatches.length} question(s) have type mismatch (expected ${bpSec.type}).`;
        warnings.push(`Section '${bpSec.title}' (${bpSec.type}): expected ${bpSec.type} but found ${typeMismatches.length} mismatched questions.`);
      } else if (marksMismatches.length > 0) {
        status = "MARKS_MISMATCH";
        message = `${marksMismatches.length} question(s) have marks mismatch (expected ${bpSec.marksEach}m each).`;
        warnings.push(`Section '${bpSec.title}' (${bpSec.type}): expected ${bpSec.marksEach} marks each but questions have varying marks.`);
      }
    }

    sectionResults.push({
      sectionTitle: bpSec.title,
      blueprintSectionId: bpSec.id,
      expectedCount: bpSec.count,
      importedCount: impCount,
      expectedType: bpSec.type,
      expectedMarksEach: bpSec.marksEach,
      status,
      message,
    });
  }

  if (unmatchedQuestions.length > 0) {
    sectionResults.push({
      sectionTitle: "Unmatched Questions",
      expectedCount: 0,
      importedCount: unmatchedQuestions.length,
      expectedType: "UNKNOWN",
      expectedMarksEach: 0,
      status: "UNMATCHED_SECTION",
      message: `${unmatchedQuestions.length} question(s) could not be mapped to any blueprint section.`,
    });
    warnings.push(`${unmatchedQuestions.length} question(s) could not be matched to the blueprint.`);
  }

  // 2. Verify Chapter Quota & Weightage Balance
  const chapterResults: ChapterVerificationResult[] = [];
  const bpChapterQuotaMap = new Map(blueprint.chapters.map((bc) => [bc.chapterId, bc.marks]));

  for (const ch of bookChapters) {
    const targetMarks = bpChapterQuotaMap.get(ch.id) ?? 0;
    const importedMarks = chapterMarksAccumulated.get(ch.id) ?? 0;
    const diff = importedMarks - targetMarks;

    let status: ChapterVerificationResult["status"] = "MATCH";
    if (diff < 0) {
      status = "DEFICIT";
    } else if (diff > 0) {
      status = "EXCESS";
    }

    chapterResults.push({
      chapterId: ch.id,
      chapterNumber: ch.number,
      chapterTitle: ch.title,
      targetMarks,
      importedMarks,
      difference: diff,
      status,
    });

    if (diff !== 0 && targetMarks > 0) {
      warnings.push(
        `Chapter ${ch.number} (${ch.title}): ${importedMarks}m placed vs ${targetMarks}m quota (${diff > 0 ? `+${diff}m excess` : `${diff}m deficit`}).`
      );
    }
  }

  // 3. Global Invariants & Score Calculation
  if (totalImportedQuestions === 0) {
    errors.push("No valid questions found to import.");
  }

  if (totalImportedMarks !== totalBlueprintMarks) {
    warnings.push(
      `Total marks mismatch: paper has ${totalImportedMarks} marks, but blueprint '${blueprint.name}' requires ${totalBlueprintMarks} marks.`
    );
  }

  if (unmappedQuestions > 0) {
    warnings.push(
      `${unmappedQuestions} question(s) could not be mapped to any chapter in '${blueprint.book.title}'. They will be tagged to Chapter 1 by default.`
    );
  }

  // Match percentage calculation
  const totalSlots = Math.max(1, totalBlueprintQuestions);
  const matchedSlots = sectionResults.reduce(
    (acc, s) => acc + (s.status === "MATCH" ? s.expectedCount : Math.min(s.expectedCount, s.importedCount)),
    0
  );
  const matchPercentage = Math.min(100, Math.round((matchedSlots / totalSlots) * 100));

  const isValid = errors.length === 0;
  const canProceed = isValid && totalImportedQuestions > 0;

  return {
    isValid,
    canProceed,
    matchPercentage,
    totalImportedMarks,
    totalBlueprintMarks,
    totalImportedQuestions,
    totalBlueprintQuestions,
    sections: sectionResults,
    chapters: chapterResults,
    unmappedQuestions,
    errors,
    warnings,
  };
}

// -----------------------------------------------------------------------------
// Helper Utilities
// -----------------------------------------------------------------------------

export function normalizeQuestionType(raw: string): string {
  const upper = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (QUESTION_TYPES.includes(upper as QuestionType)) {
    return upper;
  }
  if (upper.includes("ASSERTION")) return "ASSERTION_REASON";
  if (upper.includes("MATCH") || upper.includes("JODI") || upper.includes("SUMELIT") || upper.includes("COLUMN")) return "MATCH_COLUMN";
  if (upper.includes("UNSEEN") || upper.includes("APATHIT")) return "UNSEEN_PASSAGE";
  if (upper.includes("SANDARBH") || upper.includes("PRASANG") || upper.includes("VYAKHYA") || upper.includes("REFERENCE")) return "REFERENCE_CONTEXT";
  if (upper.includes("WRITING") || upper.includes("PATRA") || upper.includes("NIBANDH")) return "WRITING_SKILL";
  if (upper.includes("GRAMMAR") || upper.includes("VYAKARAN") || upper.includes("DIRECTED")) return "GRAMMAR";
  if (upper.includes("MAP") || upper.includes("MANCHITRA")) return "MAP_WORK";
  if (upper.includes("MCQ") || upper.includes("CHOICE")) return "MCQ";
  if (upper.includes("CASE")) return "CASE_STUDY";
  if (upper.includes("VERY_SHORT") || upper.includes("VSA")) return "VERY_SHORT";
  if (upper.includes("LONG") || upper.includes("LA")) return "LONG";
  if (upper.includes("BLANK") || upper.includes("FILL") || upper.includes("RIKT")) return "FILL_BLANK";
  if (upper.includes("TRUE") || upper.includes("FALSE") || upper.includes("SATYA") || upper.includes("ASATYA")) return "TRUE_FALSE";
  if (upper.includes("DRAW") || upper.includes("DIAGRAM")) return "DRAW";
  return "SHORT";
}

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function isLikelyCsv(str: string): boolean {
  const firstLine = str.split(/\r?\n/)[0] || "";
  return firstLine.includes(",") && (firstLine.toLowerCase().includes("section") || firstLine.toLowerCase().includes("question"));
}
