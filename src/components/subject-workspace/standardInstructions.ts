export interface InstructionPreset {
  id: string;
  title: string;
  category: "GENERAL" | "MATHEMATICS" | "SCIENCE" | "LANGUAGES" | "SOCIAL_SCIENCE";
  text: string;
}

export const STANDARD_INSTRUCTION_PRESETS: InstructionPreset[] = [
  {
    id: "cbse-general-standard",
    title: "CBSE Standard General Instructions (15 min reading)",
    category: "GENERAL",
    text: `1. This question paper contains 5 sections: A, B, C, D, and E.
2. Section A comprises 20 Multiple Choice Questions (MCQs) of 1 mark each.
3. Section B comprises 6 Very Short Answer (VSA) questions of 2 marks each.
4. Section C comprises 7 Short Answer (SA) questions of 3 marks each.
5. Section D comprises 3 Long Answer (LA) questions of 5 marks each.
6. Section E comprises 3 Case-Based integrated units of assessment of 4 marks each with sub-parts.
7. All Questions are compulsory. However, an internal choice in 2 Qs of 2 marks, 2 Qs of 3 marks, and 2 Qs of 5 marks has been provided.
8. Use of calculators or electronic devices is strictly prohibited.
9. An additional 15 minutes has been allotted to read this question paper thoroughly before writing begins.`,
  },
  {
    id: "math-step-marking",
    title: "Mathematics Exam Instructions (Formulas & Steps)",
    category: "MATHEMATICS",
    text: `1. All questions are compulsory. Internal choice is provided where indicated.
2. Write neat and legible mathematical steps. Step-wise marks will be awarded for all working and formulas.
3. Wherever applicable, take $\\pi = \\frac{22}{7}$ unless specified otherwise.
4. Use of mathematical tables or calculators is not permitted. Rough work must be done in the designated margin or sheet.`,
  },
  {
    id: "science-diagrams",
    title: "Science Exam Instructions (Units & Neat Diagrams)",
    category: "SCIENCE",
    text: `1. Read the questions carefully and answer precisely according to mark allocation.
2. Wherever required, draw neat, proportionally accurate, and well-labelled diagrams with pencil.
3. In numerical problems, always write the core formula, step-by-step substitution, and final answer with correct SI units.
4. Internal choice has been provided in selected 3-mark and 5-mark questions.`,
  },
  {
    id: "hindi-general",
    title: "सामान्य हिन्दी निर्देश (स्वच्छता एवं वर्तनी)",
    category: "LANGUAGES",
    text: `1. इस प्रश्न-पत्र में दो खंड हैं - खंड 'अ' (वस्तुनिष्ठ प्रश्न) एवं खंड 'ब' (वर्णनात्मक प्रश्न)।
2. सभी प्रश्न अनिवार्य हैं। प्रश्नों के अंक उनके सम्मुख अंकित हैं।
3. उत्तर पुस्तिका में उत्तर लिखते समय क्रम संख्या का विशेष ध्यान रखें।
4. वर्तनी की शुद्धता, स्पष्ट हस्तलेख एवं भाषा के सौन्दर्य पर विशेष ध्यान दें।`,
  },
  {
    id: "english-literature",
    title: "English Language & Literature Instructions",
    category: "LANGUAGES",
    text: `1. The question paper is divided into three sections: Section A (Reading Skills), Section B (Writing Skills & Grammar), Section C (Language through Literature).
2. All questions of a particular section must be attempted in the correct sequential order.
3. Strictly adhere to the prescribed word limit for creative writing and descriptive answers.`,
  },
  {
    id: "social-science-map",
    title: "Social Science Instructions (Map Work Guidelines)",
    category: "SOCIAL_SCIENCE",
    text: `1. The question paper comprises six sections: A, B, C, D, E, and F.
2. Section F contains map-based questions carrying 5 marks (2 marks for History and 3 marks for Geography).
3. Attach the outline map securely in the middle of your answer sheet.
4. Answers should be brief and to the point. Word limit for 3-mark questions is 60–80 words; for 5-mark questions is 100–120 words.`,
  },
];

export interface FormulaSnippet {
  category: string;
  name: string;
  latex: string;
}

export const COMMON_FORMULA_SNIPPETS: FormulaSnippet[] = [
  { category: "Algebra", name: "Quadratic Formula", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
  { category: "Algebra", name: "Binomial Expansion", latex: "(a + b)^2 = a^2 + 2ab + b^2" },
  { category: "Trigonometry", name: "Pythagorean Identity", latex: "\\sin^2\\theta + \\cos^2\\theta = 1" },
  { category: "Trigonometry", name: "Tan Identity", latex: "1 + \\tan^2\\theta = \\sec^2\\theta" },
  { category: "Mensuration", name: "Sphere Volume", latex: "V = \\frac{4}{3}\\pi r^3" },
  { category: "Mensuration", name: "Cylinder Area", latex: "A = 2\\pi r h + 2\\pi r^2" },
  { category: "Physics", name: "Ohm's Law", latex: "V = IR" },
  { category: "Physics", name: "Newton's Second Law", latex: "F = ma = m\\frac{dv}{dt}" },
  { category: "Physics", name: "Kinetic Energy", latex: "E_k = \\frac{1}{2}mv^2" },
  { category: "Chemistry", name: "Ideal Gas Law", latex: "PV = nRT" },
  { category: "Chemistry", name: "Photosynthesis Equation", latex: "6CO_2 + 6H_2O \\xrightarrow{h\\nu} C_6H_{12}O_6 + 6O_2" },
];
