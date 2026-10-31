import type { QuestionType } from "./constants";

export interface BlueprintTemplateSectionGroup {
  title: string;
  instructions: string;
  questionTypes: Array<{
    type: QuestionType;
    count: number;
    marksEach: number;
    orChoiceMode?: "BOARD_DEFAULT" | "REQUIRED" | "NOT_REQUIRED";
    orAlternativeCount?: number;
    orSlots?: boolean[];
  }>;
}

export interface BlueprintTemplate {
  id: string;
  title: string;
  description: string;
  examType: "QUARTERLY" | "HALF_YEARLY" | "ANNUAL";
  durationMin: number;
  totalMarks: number;
  targetClasses: string; // e.g. "Class 9, Class 10, Class 11, Class 12"
  language?: string;
  sections: BlueprintTemplateSectionGroup[];
}

export const STANDARD_BLUEPRINT_TEMPLATES: BlueprintTemplate[] = [
  {
    id: "mpbse-sanskrit-10th-75m",
    title: "MPBSE संस्कृतम् कक्षा 10 (75 अङ्काः - शेमुषी भाग-2)",
    description: "म.प्र. माध्यमिक शिक्षा मण्डल (MPBSE) द्वारा निर्धारित कक्षा 10वीं संस्कृत का आधिकारिक 75-अङ्कीय प्रश्नपत्र प्रतिरूप (कोड 512/122)।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    language: "sa",
    sections: [
      {
        title: "खण्डः 'क' : बहुविकल्पीयप्रश्नाः",
        instructions: "उचितविकल्पं चित्वा लिखत (प्रश्नक्रमाङ्कः 1):",
        questionTypes: [
          { type: "MCQ", count: 6, marksEach: 1 },
        ],
      },
      {
        title: "खण्डः 'ख' : रिक्तस्थानपूर्तिः",
        instructions: "कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत (प्रश्नक्रमाङ्कः 2):",
        questionTypes: [
          { type: "FILL_BLANK", count: 6, marksEach: 1 },
        ],
      },
      {
        title: "खण्डः 'ग' : शुद्ध/अशुद्धवाक्यनिरूपणम्",
        instructions: "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत (प्रश्नक्रमाङ्कः 3):",
        questionTypes: [
          { type: "TRUE_FALSE", count: 6, marksEach: 1 },
        ],
      },
      {
        title: "खण्डः 'घ' : उचितयुग्ममेलनम्",
        instructions: "स्तम्भ 'अ' सह स्तम्भ 'ब' इत्यस्य समुचितं मेलनं कुरुत (प्रश्नक्रमाङ्कः 4):",
        questionTypes: [
          { type: "MATCH_COLUMN", count: 6, marksEach: 1 },
        ],
      },
      {
        title: "खण्डः 'ङ' : एकपदेन उत्तराणि",
        instructions: "एकपदेन उत्तरं संस्कृतभाषया लिखत (प्रश्नक्रमाङ्कः 5):",
        questionTypes: [
          { type: "VERY_SHORT", count: 6, marksEach: 1 },
        ],
      },
      {
        title: "खण्डः 'च' : लघूत्तरीयप्रश्नाः",
        instructions: "अधोलिखितानां प्रश्नानाम् उत्तराणि संस्कृतभाषया संक्षेपेण लिखत (प्रश्नक्रमाङ्कः 6 तः 17 पर्यन्तम्):",
        questionTypes: [
          { type: "SHORT", count: 12, marksEach: 2, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "खण्डः 'छ' : पाठ्यांश-अवबोधनम्",
        instructions: "प्रदत्तं गद्यांशं/पद्यांशं/नाट्यांशं पठित्वा प्रश्नानाम् उत्तराणि लिखत (प्रश्नक्रमाङ्कः 18 तः 20 पर्यन्तम्):",
        questionTypes: [
          { type: "SHORT", count: 3, marksEach: 3, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "खण्डः 'ज' : दीर्घोत्तरीय-रचनात्मककार्यम्",
        instructions: "पत्रलेखनम्, अपठितगद्यांशः, तथा निबन्धलेखनं कुरुत (प्रश्नक्रमाङ्कः 21 तः 23 पर्यन्तम्):",
        questionTypes: [
          { type: "LONG", count: 3, marksEach: 4, orChoiceMode: "REQUIRED" },
        ],
      },
    ],
  },
  {
    id: "cbse-80m-5sec",
    title: "CBSE Standard Board Pattern (80 Marks)",
    description: "Official 5-Section pattern (A to E) used for Class 9–10 Board exams in Math, Science, and Social Science.",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 80,
    targetClasses: "Classes 9, 10, 11, 12",
    sections: [
      {
        title: "Section A",
        instructions: "Questions 1 to 20 carry 1 mark each. Select the correct option.",
        questionTypes: [
          { type: "MCQ", count: 18, marksEach: 1 },
          { type: "ASSERTION_REASON", count: 2, marksEach: 1 },
        ],
      },
      {
        title: "Section B",
        instructions: "Questions 21 to 26 carry 2 marks each. Very short answer questions.",
        questionTypes: [
          { type: "VERY_SHORT", count: 6, marksEach: 2 },
        ],
      },
      {
        title: "Section C",
        instructions: "Questions 27 to 33 carry 3 marks each. Short answer questions.",
        questionTypes: [
          { type: "SHORT", count: 7, marksEach: 3 },
        ],
      },
      {
        title: "Section D",
        instructions: "Questions 34 to 36 carry 5 marks each. Long answer questions.",
        questionTypes: [
          { type: "LONG", count: 3, marksEach: 5 },
        ],
      },
      {
        title: "Section E",
        instructions: "Questions 37 to 39 carry 4 marks each. Case-study / passage-based integrated questions.",
        questionTypes: [
          { type: "CASE_STUDY", count: 3, marksEach: 4 },
        ],
      },
    ],
  },
  {
    id: "cbse-science-70m",
    title: "CBSE Senior Secondary Science (70 Marks Theory)",
    description: "Standard 70-mark theory paper for Class 11–12 Physics, Chemistry, and Biology.",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 70,
    targetClasses: "Classes 11, 12",
    sections: [
      {
        title: "Section A",
        instructions: "Questions 1 to 16 are objective questions carrying 1 mark each.",
        questionTypes: [
          { type: "MCQ", count: 12, marksEach: 1 },
          { type: "ASSERTION_REASON", count: 4, marksEach: 1 },
        ],
      },
      {
        title: "Section B",
        instructions: "Questions 17 to 21 carry 2 marks each.",
        questionTypes: [
          { type: "SHORT", count: 5, marksEach: 2 },
        ],
      },
      {
        title: "Section C",
        instructions: "Questions 22 to 28 carry 3 marks each.",
        questionTypes: [
          { type: "SHORT", count: 7, marksEach: 3 },
        ],
      },
      {
        title: "Section D",
        instructions: "Questions 29 and 30 are case-study based questions carrying 4 marks each.",
        questionTypes: [
          { type: "CASE_STUDY", count: 2, marksEach: 4 },
        ],
      },
      {
        title: "Section E",
        instructions: "Questions 31 to 33 carry 5 marks each with internal choice.",
        questionTypes: [
          { type: "LONG", count: 3, marksEach: 5 },
        ],
      },
    ],
  },
  {
    id: "middle-school-50m",
    title: "Middle School Term Exam (50 Marks)",
    description: "Balanced 4-section pattern for Class 6–8 Half-Yearly / Annual examinations.",
    examType: "HALF_YEARLY",
    durationMin: 120,
    totalMarks: 50,
    targetClasses: "Classes 6, 7, 8",
    sections: [
      {
        title: "Section A",
        instructions: "Choose the correct option. All questions are compulsory.",
        questionTypes: [
          { type: "MCQ", count: 10, marksEach: 1 },
        ],
      },
      {
        title: "Section B",
        instructions: "Answer in one or two sentences.",
        questionTypes: [
          { type: "VERY_SHORT", count: 6, marksEach: 2 },
        ],
      },
      {
        title: "Section C",
        instructions: "Short answer questions. Answer in 40–50 words.",
        questionTypes: [
          { type: "SHORT", count: 6, marksEach: 3 },
        ],
      },
      {
        title: "Section D",
        instructions: "Long answer questions. Draw neat labelled diagrams where required.",
        questionTypes: [
          { type: "LONG", count: 2, marksEach: 5 },
        ],
      },
    ],
  },
  {
    id: "unit-test-25m",
    title: "Periodic Unit Test / Assessment (25 Marks)",
    description: "Compact 1-hour assessment pattern ideal for unit tests and monthly revision tests.",
    examType: "QUARTERLY",
    durationMin: 60,
    totalMarks: 25,
    targetClasses: "Classes 3 to 10",
    sections: [
      {
        title: "Section A",
        instructions: "Objective questions carrying 1 mark each.",
        questionTypes: [
          { type: "MCQ", count: 5, marksEach: 1 },
        ],
      },
      {
        title: "Section B",
        instructions: "Short answer questions carrying 2 marks each.",
        questionTypes: [
          { type: "SHORT", count: 4, marksEach: 2 },
        ],
      },
      {
        title: "Section C",
        instructions: "Detailed answer questions carrying 3 marks each.",
        questionTypes: [
          { type: "SHORT", count: 4, marksEach: 3 },
        ],
      },
    ],
  },
  {
    id: "kindergarten-foundational-25m",
    title: "Foundational & Pre-Primary Activity (25 Marks)",
    description: "Interactive tracing, matching, and counting pattern for Nursery, LKG, and UKG classes.",
    examType: "QUARTERLY",
    durationMin: 60,
    totalMarks: 25,
    targetClasses: "Nursery, LKG, UKG, Class 1",
    sections: [
      {
        title: "Section A",
        instructions: "Letter & Pattern Tracing Activity",
        questionTypes: [
          { type: "KDG_TRACE_WRITE", count: 5, marksEach: 1 },
        ],
      },
      {
        title: "Section B",
        instructions: "Count Objects and Match Numbers",
        questionTypes: [
          { type: "KDG_COUNT_ITEMS", count: 5, marksEach: 2 },
        ],
      },
      {
        title: "Section C",
        instructions: "Picture Recognition and Odd One Out",
        questionTypes: [
          { type: "KDG_CIRCLE_TARGET", count: 5, marksEach: 2 },
        ],
      },
    ],
  },
];
