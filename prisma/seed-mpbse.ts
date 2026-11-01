import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to safely format JSON
function toJson<T>(data: T): Prisma.InputJsonValue {
  return data as unknown as Prisma.InputJsonValue;
}

// Choice Policy Helper adhering to Circular 465/2026
function createChoicePolicy(
  policyType: "NO_CHOICE" | "FULL_OR_ALTERNATIVE" | "ATTEMPT_K_OF_N" | "SELECT_ONE_OF_N",
  totalProvided: number,
  totalRequired: number,
  poolScope: "ANY_INCLUDED_CHAPTER" | "SAME_UNIT" | "SAME_CHAPTER",
  rationale: string
) {
  return { policyType, totalProvided, totalRequired, poolScope, rationale };
}

// Archetype generator for Standard 23Q 75M (Classes 9 & 10 General Subjects)
function generateStandard23Q75MSections() {
  return [
    {
      position: 1,
      title: "प्रश्न 1: सही विकल्प चुनिए (Multiple Choice Questions)",
      instructions: "प्रत्येक प्रश्न के लिए दिए गए विकल्पों में से सही विकल्प चुनकर लिखिए।",
      type: "MCQ",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Circular 465: All objective questions are compulsory"),
    },
    {
      position: 2,
      title: "प्रश्न 2: रिक्त स्थानों की पूर्ति कीजिए (Fill in the Blanks)",
      instructions: "दिए गए रिक्त स्थानों की सही शब्दों द्वारा पूर्ति कीजिए।",
      type: "FILL_IN_BLANKS",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Circular 465: All objective questions are compulsory"),
    },
    {
      position: 3,
      title: "प्रश्न 3: सत्य / असत्य लिखिए (True / False)",
      instructions: "निम्नलिखित कथनों में सत्य अथवा असत्य चुनकर लिखिए।",
      type: "TRUE_FALSE",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Circular 465: All objective questions are compulsory"),
    },
    {
      position: 4,
      title: "प्रश्न 4: सही जोड़ी बनाइए (Match the Columns)",
      instructions: "स्तम्भ 'अ' के सम्मुख स्तम्भ 'ब' से सही मिलान कीजिए।",
      type: "MATCH_FOLLOWING",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Circular 465: All objective questions are compulsory"),
    },
    {
      position: 5,
      title: "प्रश्न 5: एक शब्द / एक वाक्य में उत्तर दीजिए (One Word / Sentence Answer)",
      instructions: "निम्नलिखित प्रश्नों के उत्तर एक शब्द अथवा एक वाक्य में लिखिए।",
      type: "ONE_WORD",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Circular 465: All objective questions are compulsory"),
    },
    {
      position: 6,
      title: "प्रश्न 6 से 17: अतिलघुउत्तरीय प्रश्न (Very Short Answer Questions)",
      instructions: "प्रत्येक प्रश्न का उत्तर लगभग 30 शब्दों में दीजिए। सभी प्रश्न अनिवार्य हैं।",
      type: "VERY_SHORT_ANSWER",
      count: 12,
      marksEach: 2,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 12, 12, "ANY_INCLUDED_CHAPTER", "Circular 465/2026: Abolition of internal choice in 2-mark questions"),
    },
    {
      position: 7,
      title: "प्रश्न 18 से 20: लघुउत्तरीय प्रश्न (Short Answer Questions)",
      instructions: "प्रत्येक प्रश्न का उत्तर लगभग 75 शब्दों में दीजिए। आंतरिक विकल्प उपलब्ध हैं।",
      type: "SHORT_ANSWER",
      count: 3,
      marksEach: 3,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 3-mark questions from same unit"),
    },
    {
      position: 8,
      title: "प्रश्न 21 से 23: दीर्घउत्तरीय / विश्लेषणात्मक प्रश्न (Long Answer Questions)",
      instructions: "प्रत्येक प्रश्न का उत्तर लगभग 120 शब्दों में दीजिए। आंतरिक विकल्प उपलब्ध हैं।",
      type: "LONG_ANSWER",
      count: 3,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 4-mark questions from same unit"),
    },
  ];
}

// Archetype generator for Science 20Q 70M (Classes 11 & 12 Physics, Chemistry, Biology)
function generateScience20Q70MSections() {
  return [
    {
      position: 1,
      title: "प्रश्न 1: सही विकल्प चुनिए (Multiple Choice Questions)",
      instructions: "प्रत्येक प्रश्न के लिए दिए गए विकल्पों में से सही विकल्प चुनकर लिखिए।",
      type: "MCQ",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
    },
    {
      position: 2,
      title: "प्रश्न 2: रिक्त स्थानों की पूर्ति कीजिए (Fill in the Blanks)",
      instructions: "दिए गए रिक्त स्थानों की सही शब्दों द्वारा पूर्ति कीजिए।",
      type: "FILL_IN_BLANKS",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
    },
    {
      position: 3,
      title: "प्रश्न 3: सत्य / असत्य लिखिए (True / False)",
      instructions: "निम्नलिखित कथनों में सत्य अथवा असत्य चुनकर लिखिए।",
      type: "TRUE_FALSE",
      count: 5,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 5, 5, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
    },
    {
      position: 4,
      title: "प्रश्न 4: सही जोड़ी बनाइए (Match the Columns)",
      instructions: "स्तम्भ 'अ' के सम्मुख स्तम्भ 'ब' से सही मिलान कीजिए।",
      type: "MATCH_FOLLOWING",
      count: 5,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 5, 5, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
    },
    {
      position: 5,
      title: "प्रश्न 5: एक शब्द / एक वाक्य में उत्तर दीजिए (One Word / Sentence Answer)",
      instructions: "निम्नलिखित प्रश्नों के उत्तर एक शब्द अथवा एक वाक्य में लिखिए।",
      type: "ONE_WORD",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
    },
    {
      position: 6,
      title: "प्रश्न 6 से 12: अतिलघुउत्तरीय प्रश्न (Very Short Answer Questions)",
      instructions: "प्रत्येक प्रश्न का उत्तर लगभग 30 शब्दों में दीजिए। सभी प्रश्न अनिवार्य हैं।",
      type: "VERY_SHORT_ANSWER",
      count: 7,
      marksEach: 2,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 7, 7, "ANY_INCLUDED_CHAPTER", "Circular 465/2026: Abolition of internal choice in 2-mark questions"),
    },
    {
      position: 7,
      title: "प्रश्न 13 से 16: लघुउत्तरीय प्रश्न (Short Answer Questions)",
      instructions: "प्रत्येक प्रश्न का उत्तर लगभग 75 शब्दों में दीजिए। प्रत्येक प्रश्न में आंतरिक विकल्प दिया गया है।",
      type: "SHORT_ANSWER",
      count: 4,
      marksEach: 3,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 3-mark questions from same unit"),
    },
    {
      position: 8,
      title: "प्रश्न 17 से 20: विश्लेषणात्मक / दीर्घउत्तरीय प्रश्न (Long Answer Questions)",
      instructions: "प्रत्येक प्रश्न का उत्तर लगभग 120 शब्दों में दीजिए। प्रत्येक प्रश्न में आंतरिक विकल्प दिया गया है।",
      type: "LONG_ANSWER",
      count: 4,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 4-mark questions from same unit"),
    },
  ];
}

// Archetype generator for Standard 23Q 80M (Classes 11 & 12 Mathematics, Hindi)
function generateStandard23Q80MSections() {
  return [
    {
      position: 1,
      title: "प्रश्न 1: सही विकल्प चुनिए (Multiple Choice Questions)",
      instructions: "प्रत्येक प्रश्न के लिए दिए गए विकल्पों में से सही विकल्प चुनकर लिखिए।",
      type: "MCQ",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
    },
    {
      position: 2,
      title: "प्रश्न 2: रिक्त स्थानों की पूर्ति कीजिए (Fill in the Blanks)",
      instructions: "दिए गए रिक्त स्थानों की सही शब्दों द्वारा पूर्ति कीजिए।",
      type: "FILL_IN_BLANKS",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
    },
    {
      position: 3,
      title: "प्रश्न 3: सत्य / असत्य लिखिए (True / False)",
      instructions: "निम्नलिखित कथनों में सत्य अथवा असत्य चुनकर लिखिए।",
      type: "TRUE_FALSE",
      count: 7,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 7, 7, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
    },
    {
      position: 4,
      title: "प्रश्न 4: सही जोड़ी बनाइए (Match the Columns)",
      instructions: "स्तम्भ 'अ' के सम्मुख स्तम्भ 'ब' से सही मिलान कीजिए।",
      type: "MATCH_FOLLOWING",
      count: 7,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 7, 7, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
    },
    {
      position: 5,
      title: "प्रश्न 5: एक शब्द / एक वाक्य में उत्तर दीजिए (One Word / Sentence Answer)",
      instructions: "निम्नलिखित प्रश्नों के उत्तर एक शब्द अथवा एक वाक्य में लिखिए।",
      type: "ONE_WORD",
      count: 6,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 6, 6, "ANY_INCLUDED_CHAPTER", "Compulsory objective items"),
    },
    {
      position: 6,
      title: "प्रश्न 6 से 15: अतिलघुउत्तरीय प्रश्न (Very Short Answer Questions)",
      instructions: "प्रत्येक प्रश्न का उत्तर लगभग 30 शब्दों में दीजिए। सभी प्रश्न अनिवार्य हैं।",
      type: "VERY_SHORT_ANSWER",
      count: 10,
      marksEach: 2,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "ANY_INCLUDED_CHAPTER", "Circular 465/2026: Abolition of internal choice in 2-mark questions"),
    },
    {
      position: 7,
      title: "प्रश्न 16 से 19: लघुउत्तरीय प्रश्न (Short Answer Questions)",
      instructions: "प्रत्येक प्रश्न का उत्तर लगभग 75 शब्दों में दीजिए। प्रत्येक प्रश्न में आंतरिक विकल्प दिया गया है।",
      type: "SHORT_ANSWER",
      count: 4,
      marksEach: 3,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 3-mark questions from same unit"),
    },
    {
      position: 8,
      title: "प्रश्न 20 से 23: विश्लेषणात्मक / दीर्घउत्तरीय प्रश्न (Long Answer Questions)",
      instructions: "प्रत्येक प्रश्न का उत्तर लगभग 120 शब्दों में दीजिए। प्रत्येक प्रश्न में आंतरिक विकल्प दिया गया है।",
      type: "LONG_ANSWER",
      count: 4,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465/2026: Mandatory 100% internal choice in 4-mark questions from same unit"),
    },
  ];
}

// Archetype generator for English 16Q 75M (Classes 9 & 10 English)
function generateEnglish16Q75MSections() {
  return [
    {
      position: 1,
      title: "Section A: Reading Skills (Q.1 & Q.2 Unseen Passages)",
      instructions: "Read the passages carefully and answer the objective questions given below.",
      type: "MCQ",
      count: 10,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "ANY_INCLUDED_CHAPTER", "Two unseen passages with 5 MCQs each"),
    },
    {
      position: 2,
      title: "Section B: Writing Skills - Q.3 Note Making",
      instructions: "Read the passage carefully, make notes using abbreviations where necessary, and supply a suitable title.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 1, 1, "ANY_INCLUDED_CHAPTER", "Title (1m), Notes & Indenting (2m), Key/Glossary (1m)"),
    },
    {
      position: 3,
      title: "Section B: Writing Skills - Q.4 Letter Writing",
      instructions: "Write a Formal application OR Informal letter as instructed.",
      type: "LONG_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "ANY_INCLUDED_CHAPTER", "Full internal choice between Formal and Informal letters"),
    },
    {
      position: 4,
      title: "Section B: Writing Skills - Q.5 Long Composition",
      instructions: "Write an essay / paragraph in about 150 words on any one topic.",
      type: "LONG_ANSWER",
      count: 1,
      marksEach: 5,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 4, 1, "ANY_INCLUDED_CHAPTER", "Choice of 4-5 contemporary essay topics"),
    },
    {
      position: 5,
      title: "Section B: Writing Skills - Q.6 Picture Guided Composition",
      instructions: "On the basis of the picture given below, write a short paragraph in about 75 words.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 3,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 1, 1, "ANY_INCLUDED_CHAPTER", "Single picture prompt description"),
    },
    {
      position: 6,
      title: "Section C: Grammar - Q.7 Fill in the Blanks",
      instructions: "Fill in the blanks choosing the correct alternative given in the brackets (Any 5).",
      type: "FILL_IN_BLANKS",
      count: 5,
      marksEach: 1,
      orChoiceMode: "ATTEMPT_K_OF_N",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("ATTEMPT_K_OF_N", 6, 5, "ANY_INCLUDED_CHAPTER", "Attempt any 5 out of 6 grammar items"),
    },
    {
      position: 7,
      title: "Section C: Grammar - Q.8 Do As Directed",
      instructions: "Do as directed (Any 5).",
      type: "VERY_SHORT_ANSWER",
      count: 5,
      marksEach: 1,
      orChoiceMode: "ATTEMPT_K_OF_N",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("ATTEMPT_K_OF_N", 6, 5, "ANY_INCLUDED_CHAPTER", "Attempt any 5 out of 6 sentence transformation items"),
    },
    {
      position: 8,
      title: "Section D: Textbooks - Q.9 & Q.10 Textual MCQs & Extracts",
      instructions: "Choose the correct options from prescribed textual extracts and poems.",
      type: "MCQ",
      count: 10,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "SAME_UNIT", "4 textual MCQs + 3 prose extract MCQs + 3 poetry extract MCQs"),
    },
    {
      position: 9,
      title: "Section D: Textbooks - Q.11 to Q.13 Short Answer Questions",
      instructions: "Answer the questions in about 30 words each from Beehive Prose, Poetry, and Moments.",
      type: "VERY_SHORT_ANSWER",
      count: 10,
      marksEach: 2,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "SAME_UNIT", "Circular 465: All 2-mark short answer questions are compulsory"),
    },
    {
      position: 10,
      title: "Section D: Textbooks - Q.14 to Q.16 Long Answer Questions",
      instructions: "Answer the questions in about 75 words each with internal choice.",
      type: "SHORT_ANSWER",
      count: 3,
      marksEach: 3,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465: Mandatory 100% internal choice in 3-mark questions"),
    },
  ];
}

// Archetype generator for English 15Q 80M (Classes 11 & 12 English Core)
function generateEnglish15Q80MSections() {
  return [
    {
      position: 1,
      title: "Section A: Reading Skills - Q.1 Unseen Comprehension Passage",
      instructions: "Read the passage carefully and answer the objective questions given below.",
      type: "MCQ",
      count: 10,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "ANY_INCLUDED_CHAPTER", "Unseen passage testing comprehension and vocabulary"),
    },
    {
      position: 2,
      title: "Section A: Reading Skills - Q.2 Note Making",
      instructions: "Read the passage carefully, make structured notes and provide a suitable title.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 1, 1, "ANY_INCLUDED_CHAPTER", "Title 1m + Numbering/Indenting 1m + Abbreviations 1m + Notes 1m"),
    },
    {
      position: 3,
      title: "Section B: Writing Skills - Q.3 Notice / Advertisement / Poster",
      instructions: "Draft a notice, advertisement, or poster in about 50 words.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "ANY_INCLUDED_CHAPTER", "Internal choice between notice, poster, or ad"),
    },
    {
      position: 4,
      title: "Section B: Writing Skills - Q.4 Letter Writing",
      instructions: "Write a Formal or Informal letter in about 120 words.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "ANY_INCLUDED_CHAPTER", "Choice between formal and informal letter"),
    },
    {
      position: 5,
      title: "Section B: Writing Skills - Q.5 Long Composition",
      instructions: "Write an article, report, or speech in about 120-150 words.",
      type: "SHORT_ANSWER",
      count: 1,
      marksEach: 4,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "ANY_INCLUDED_CHAPTER", "Choice between article, report, or speech"),
    },
    {
      position: 6,
      title: "Section C: Grammar - Q.6 Sentence Corrections / Gap Filling",
      instructions: "Fill in the blanks with correct alternatives (Any 5).",
      type: "FILL_IN_BLANKS",
      count: 5,
      marksEach: 1,
      orChoiceMode: "ATTEMPT_K_OF_N",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("ATTEMPT_K_OF_N", 6, 5, "ANY_INCLUDED_CHAPTER", "Attempt any 5 out of 6 grammar items"),
    },
    {
      position: 7,
      title: "Section C: Grammar - Q.7 Do As Directed",
      instructions: "Transform sentences as directed (Any 5).",
      type: "VERY_SHORT_ANSWER",
      count: 5,
      marksEach: 1,
      orChoiceMode: "ATTEMPT_K_OF_N",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("ATTEMPT_K_OF_N", 6, 5, "ANY_INCLUDED_CHAPTER", "Attempt any 5 out of 6 sentence transformations"),
    },
    {
      position: 8,
      title: "Section D: Textbooks - Q.8 & Q.9 Extracts from Prescribed Texts",
      instructions: "Read the extracts and choose the correct option.",
      type: "MCQ",
      count: 12,
      marksEach: 1,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 12, 12, "SAME_UNIT", "Prose extract (5m) + Poetry extract (3m) + Supplementary extract (4m)"),
    },
    {
      position: 9,
      title: "Section D: Textbooks - Q.10 to Q.12 Short Answer Questions",
      instructions: "Answer the questions in about 30 words each. All questions are compulsory.",
      type: "VERY_SHORT_ANSWER",
      count: 10,
      marksEach: 2,
      orChoiceMode: "NO_CHOICE",
      orAlternativeCount: 0,
      choicePolicy: createChoicePolicy("NO_CHOICE", 10, 10, "SAME_UNIT", "Circular 465: All 2-mark short answer questions are compulsory"),
    },
    {
      position: 10,
      title: "Section D: Textbooks - Q.13 to Q.15 Long Answer Questions",
      instructions: "Answer the questions in about 75-100 words each with internal choice.",
      type: "SHORT_ANSWER",
      count: 4,
      marksEach: 3,
      orChoiceMode: "FULL_OR_ALTERNATIVE",
      orAlternativeCount: 1,
      choicePolicy: createChoicePolicy("FULL_OR_ALTERNATIVE", 2, 1, "SAME_UNIT", "Circular 465: Mandatory 100% internal choice in 3-mark questions"),
    },
  ];
}

async function main() {
  console.log("================================================================================");
  console.log("🌱 SEEDING MPBSE CURRICULUM, BLUEPRINTS & EXAMINATION PATTERNS (CLASSES 9–12)");
  console.log("================================================================================");

  // 1. Board
  const board = await prisma.curriculumBoard.upsert({
    where: { code: "MPBSE" },
    update: {
      name: "Madhya Pradesh Board of Secondary Education (माध्यमिक शिक्षा मण्डल, मध्य प्रदेश, भोपाल)",
      state: "Madhya Pradesh",
      websiteUrl: "https://mpbse.nic.in",
      activeSession: "2026-27",
    },
    create: {
      code: "MPBSE",
      name: "Madhya Pradesh Board of Secondary Education (माध्यमिक शिक्षा मण्डल, मध्य प्रदेश, भोपाल)",
      state: "Madhya Pradesh",
      websiteUrl: "https://mpbse.nic.in",
      activeSession: "2026-27",
    },
  });
  console.log(`✓ Board ready: ${board.name} (${board.code})`);

  // 2. Source Documents
  const sourceDocsData = [
    {
      title: "अंकयोजना 2026-27 (Marks Distribution Scheme)",
      docType: "MARKS_SCHEME",
      academicSession: "2026-27",
      officialUrl: "https://mpbse.nic.in/MarksScheme_2026_27.pdf",
      notes: "Official subject-wise marks distribution for Classes 9 to 12",
    },
    {
      title: "पाठ्यक्रम 2026-27 (Prescribed Syllabus & Curriculum)",
      docType: "SYLLABUS",
      academicSession: "2026-27",
      officialUrl: "https://mpbse.nic.in/Syllabus_2026_27.pdf",
      notes: "Official prescribed rationalized syllabus for Classes 9 to 12",
    },
    {
      title: "प्रायोजना / प्रायोगिक कार्य 2026-27 (Projects & Practicals)",
      docType: "PRACTICAL",
      academicSession: "2026-27",
      officialUrl: "https://mpbse.nic.in/Project%20%26%20Practical_2026_27.pdf",
      notes: "Official internal evaluation rubrics, practical exams, and experiment lists",
    },
    {
      title: "आंतरिक विकल्प नियम विज्ञप्ति (Circular 465 & 466)",
      docType: "CIRCULAR",
      academicSession: "2026-27",
      officialUrl: "https://mpbse.nic.in/Bse_465_466.pdf",
      circularNumber: "465/विद्योचित/2026",
      notes: "Abolition of choice on 2-mark questions; 100% mandatory OR alternatives on 3m/4m",
    },
    {
      title: "अंग्रेजी Basic एवं Standard विज्ञप्ति (Circular 149 & 150)",
      docType: "CIRCULAR",
      academicSession: "2026-27",
      officialUrl: "https://mpbse.nic.in/Bse_149_150.pdf",
      circularNumber: "149/150/विद्योचित/2026",
      notes: "English Basic & Standard option notification starting 2026–27",
    },
    {
      title: "गणित Basic एवं Standard नियम (Circular 53 & 54)",
      docType: "CIRCULAR",
      academicSession: "2026-27",
      officialUrl: "https://mpbse.nic.in/Bse_53_54_Maths(Basic%26%20Standard).pdf",
      circularNumber: "53/54/विद्योचित/2026",
      notes: "Mathematics Basic and Standard selection rules & Class 11 eligibility",
    },
  ];

  const docMap = new Map<string, string>();
  for (const doc of sourceDocsData) {
    const existing = await prisma.curriculumDocument.findFirst({
      where: { boardId: board.id, officialUrl: doc.officialUrl },
    });
    if (existing) {
      docMap.set(doc.docType, existing.id);
      if (doc.circularNumber) docMap.set(doc.circularNumber, existing.id);
    } else {
      const created = await prisma.curriculumDocument.create({
        data: {
          boardId: board.id,
          ...doc,
        },
      });
      docMap.set(doc.docType, created.id);
      if (doc.circularNumber) docMap.set(doc.circularNumber, created.id);
    }
  }
  console.log(`✓ Seeded ${sourceDocsData.length} Authoritative Primary Source Documents`);

  // Default marks scheme docId for relationships
  const defaultMarksSchemeDocId = docMap.get("MARKS_SCHEME")!;

  // 3. Classes (9, 10, 11, 12)
  const classesData = [
    { classLevel: 9, displayName: "Class 9th", isBoardExam: false },
    { classLevel: 10, displayName: "Class 10th", isBoardExam: true },
    { classLevel: 11, displayName: "Class 11th", isBoardExam: false },
    { classLevel: 12, displayName: "Class 12th", isBoardExam: true },
  ];

  const classMap = new Map<number, string>();
  for (const c of classesData) {
    const cls = await prisma.curriculumClass.upsert({
      where: {
        boardId_classLevel: {
          boardId: board.id,
          classLevel: c.classLevel,
        },
      },
      update: {
        displayName: c.displayName,
        isBoardExam: c.isBoardExam,
      },
      create: {
        boardId: board.id,
        classLevel: c.classLevel,
        displayName: c.displayName,
        isBoardExam: c.isBoardExam,
      },
    });
    classMap.set(c.classLevel, cls.id);
  }
  console.log(`✓ Seeded Classes 9, 10, 11, and 12`);

  // 4. Streams
  const streamsConfig = [
    { classLevel: 9, code: "SECONDARY_GENERAL", name: "Secondary General" },
    { classLevel: 10, code: "SECONDARY_GENERAL", name: "Secondary General" },
    { classLevel: 11, code: "SCIENCE_BIO", name: "Science (Biology Group)" },
    { classLevel: 11, code: "SCIENCE_PCM", name: "Science (Mathematics Group)" },
    { classLevel: 11, code: "SECONDARY_GENERAL", name: "General / Core Languages" },
    { classLevel: 12, code: "SCIENCE_BIO", name: "Science (Biology Group)" },
    { classLevel: 12, code: "SCIENCE_PCM", name: "Science (Mathematics Group)" },
    { classLevel: 12, code: "SECONDARY_GENERAL", name: "General / Core Languages" },
  ];

  const streamMap = new Map<string, string>();
  for (const s of streamsConfig) {
    const classId = classMap.get(s.classLevel)!;
    const stream = await prisma.curriculumStream.upsert({
      where: {
        classId_code: {
          classId,
          code: s.code,
        },
      },
      update: {
        name: s.name,
      },
      create: {
        classId,
        code: s.code,
        name: s.name,
      },
    });
    streamMap.set(`${s.classLevel}_${s.code}`, stream.id);
  }
  console.log(`✓ Seeded Academic Streams (Secondary General, Science PCB, Science PCM)`);

  // 5. Subject Specifications & Chapter Catalog
  interface ChapterSpec {
    chapterNumber: number;
    title: string;
    unitNumber?: number;
    unitTitle?: string;
    officialMarks?: number;
    isDeleted?: boolean;
    provenancePage?: number;
    topics?: { title: string; isExcluded?: boolean }[];
  }

  interface TextbookSpec {
    title: string;
    publisher?: string;
    chapters: ChapterSpec[];
  }

  interface SubjectSpec {
    classLevel: number;
    code: string;
    name: string;
    streamCode?: string;
    isCompulsory: boolean;
    hasPracticals: boolean;
    theoryMarks: number;
    practicalMarks: number;
    projectMarks: number;
    variants: { code: string; name: string; cognitiveWeight?: Record<string, number> }[];
    archetype: "STANDARD_23Q_75M" | "SCIENCE_20Q_70M" | "STANDARD_23Q_80M" | "ENGLISH_16Q_75M" | "ENGLISH_15Q_80M";
    textbooks: TextbookSpec[];
    practicalRubric?: Record<string, number>;
    unitBreakdown?: Array<{ title: string; officialMarks: number; unitNumber?: number; chapterNumbers?: number[] }>;
  }

  const subjectsSeed: SubjectSpec[] = [
    // -------------------------------------------------------------------------
    // CLASS 9 SUBJECTS
    // -------------------------------------------------------------------------
    {
      classLevel: 9,
      code: "401",
      name: "Hindi",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "CORE", name: "Hindi Core / General" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "क्षितिज भाग-1 (NCERT Class IX)",
          chapters: [
            { chapterNumber: 1, title: "साखियाँ एवं सबद (कबीर)", unitNumber: 1, unitTitle: "पद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 2, title: "वाख (ललद्यद)", unitNumber: 1, unitTitle: "पद्य खण्ड", officialMarks: 2 },
            { chapterNumber: 3, title: "सवैये (रसखान)", unitNumber: 1, unitTitle: "पद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 4, title: "कैदी और कोकिला (माखनलाल चतुर्वेदी)", unitNumber: 1, unitTitle: "पद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 5, title: "ग्राम श्री (सुमित्रानंदन पंत)", unitNumber: 1, unitTitle: "पद्य खण्ड", officialMarks: 2 },
            { chapterNumber: 6, title: "मेघ आए (सर्वेश्वर दयाल सक्सेना)", unitNumber: 1, unitTitle: "पद्य खण्ड", officialMarks: 2 },
            { chapterNumber: 7, title: "बच्चे काम पर जा रहे हैं (राजेश जोशी)", unitNumber: 1, unitTitle: "पद्य खण्ड", officialMarks: 2 },
            { chapterNumber: 8, title: "काव्य बोध (रस, छंद, अलंकार, काव्य भेद)", unitNumber: 2, unitTitle: "काव्य बोध", officialMarks: 10 },
            { chapterNumber: 9, title: "दो बैलों की कथा (प्रेमचंद)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 4 },
            { chapterNumber: 10, title: "ल्हासा की ओर (राहुल सांकृत्यायन)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 11, title: "उपभोक्तावाद की संस्कृति (श्यामाचरण दुबे)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 12, title: "साँवले सपनों की याद (जाबिर हुसैन)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 2 },
            { chapterNumber: 13, title: "प्रेमचंद के फटे जूते (हरिशंकर परसाई)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 14, title: "मेरे बचपन के दिन (महादेवी वर्मा)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 2 },
            { chapterNumber: 15, title: "भाषा बोध (संधि, समास, निपात, मुहावरे)", unitNumber: 4, unitTitle: "भाषा बोध", officialMarks: 8 },
            { chapterNumber: 16, title: "अपठित बोध (काव्यांश / गद्यांश)", unitNumber: 6, unitTitle: "अपठित बोध", officialMarks: 4 },
            { chapterNumber: 17, title: "पत्र लेखन (औपचारिक / अनौपचारिक)", unitNumber: 7, unitTitle: "पत्र लेखन", officialMarks: 4 },
            { chapterNumber: 18, title: "अनुच्छेद, संवाद एवं निबन्ध लेखन", unitNumber: 8, unitTitle: "रचना खण्ड", officialMarks: 7 },
            { chapterNumber: 19, title: "चंद्र गहना से लौटती बेर (केदारनाथ अग्रवाल)", isDeleted: true },
            { chapterNumber: 20, title: "यमराज की दिशा (चंद्रकांत देवताले)", isDeleted: true },
            { chapterNumber: 21, title: "नाना साहब की पुत्री देवी मैना (चपला देवी)", isDeleted: true },
            { chapterNumber: 22, title: "एक कुत्ता और एक मैना (हजारीप्रसाद द्विवेदी)", isDeleted: true },
          ],
        },
        {
          title: "कृतिका भाग-1 (पूरक पाठ्यपुस्तक)",
          chapters: [
            { chapterNumber: 1, title: "इस जल प्रलय में (फणीश्वरनाथ रेणु)", unitNumber: 5, unitTitle: "कृतिका भाग-1", officialMarks: 3 },
            { chapterNumber: 2, title: "मेरे संग की औरतें (मृदुला गर्ग)", unitNumber: 5, unitTitle: "कृतिका भाग-1", officialMarks: 3 },
            { chapterNumber: 3, title: "रीढ़ की हड्डी (जगदीशचंद्र माथुर)", unitNumber: 5, unitTitle: "कृतिका भाग-1", officialMarks: 2 },
            { chapterNumber: 4, title: "माटी वाली (विद्यासागर नौटियाल)", isDeleted: true },
            { chapterNumber: 5, title: "किस तरह आखिरकार मैं हिंदी में आया (शमशेर बहादुर सिंह)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 9,
      code: "411",
      name: "English",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [
        { code: "STANDARD", name: "English Standard", cognitiveWeight: { EASY: 30, AVERAGE: 50, DIFFICULT: 20 } },
        { code: "BASIC", name: "English Basic", cognitiveWeight: { EASY: 50, AVERAGE: 40, DIFFICULT: 10 } },
      ],
      archetype: "ENGLISH_16Q_75M",
      textbooks: [
        {
          title: "Beehive (NCERT Class IX)",
          chapters: [
            { chapterNumber: 1, title: "The Fun They Had / The Road Not Taken", unitNumber: 4, unitTitle: "Literature", officialMarks: 5 },
            { chapterNumber: 2, title: "The Sound of Music / Wind", unitNumber: 4, unitTitle: "Literature", officialMarks: 5 },
            { chapterNumber: 3, title: "The Little Girl / Rain on the Roof", unitNumber: 4, unitTitle: "Literature", officialMarks: 4 },
            { chapterNumber: 4, title: "A Truly Beautiful Mind / The Lake Isle of Innisfree", unitNumber: 4, unitTitle: "Literature", officialMarks: 4 },
            { chapterNumber: 5, title: "The Snake and the Mirror / A Legend of the Northland", unitNumber: 4, unitTitle: "Literature", officialMarks: 4 },
            { chapterNumber: 6, title: "My Childhood / No Men Are Foreign", unitNumber: 4, unitTitle: "Literature", officialMarks: 4 },
            { chapterNumber: 7, title: "Reach for the Top / On Killing a Tree", unitNumber: 4, unitTitle: "Literature", officialMarks: 4 },
            { chapterNumber: 8, title: "Kathmandu / A Slumber Did My Spirit Seal", unitNumber: 4, unitTitle: "Literature", officialMarks: 4 },
            { chapterNumber: 9, title: "If I Were You (Play)", unitNumber: 4, unitTitle: "Literature", officialMarks: 3 },
            { chapterNumber: 10, title: "Packing (Jerome K. Jerome)", isDeleted: true },
            { chapterNumber: 11, title: "The Bond of Love (Kenneth Anderson)", isDeleted: true },
            { chapterNumber: 12, title: "The Snake Trying (Poem)", isDeleted: true },
          ],
        },
        {
          title: "Moments (Supplementary Reader)",
          chapters: [
            { chapterNumber: 1, title: "The Lost Child", officialMarks: 2 },
            { chapterNumber: 2, title: "The Adventures of Toto", officialMarks: 2 },
            { chapterNumber: 3, title: "Iswaran the Storyteller", officialMarks: 2 },
            { chapterNumber: 4, title: "In the Kingdom of Fools", officialMarks: 2 },
            { chapterNumber: 5, title: "The Happy Prince", officialMarks: 2 },
            { chapterNumber: 6, title: "Weathering the Storm in Ersama", officialMarks: 2 },
            { chapterNumber: 7, title: "The Last Leaf", officialMarks: 2 },
            { chapterNumber: 8, title: "A House Is Not a Home", officialMarks: 2 },
            { chapterNumber: 9, title: "The Beggar", officialMarks: 2 },
            { chapterNumber: 10, title: "The Accidental Tourist", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 9,
      code: "100",
      name: "Mathematics Standard",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "STANDARD", name: "Mathematics Standard" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "Mathematics (NCERT Class IX)",
          chapters: [
            { chapterNumber: 1, title: "संख्या पद्धति (Number Systems)", officialMarks: 6, provenancePage: 12 },
            { chapterNumber: 2, title: "बहुपद (Polynomials)", officialMarks: 10, provenancePage: 12 },
            { chapterNumber: 3, title: "निर्देशांक ज्यामिति (Coordinate Geometry)", officialMarks: 8, provenancePage: 12 },
            { chapterNumber: 4, title: "दो चरों वाले रैखिक समीकरण (Linear Equations in Two Variables)", officialMarks: 8, provenancePage: 12 },
            { chapterNumber: 5, title: "यूक्लिड ज्यामिति का परिचय (Introduction to Euclid's Geometry)", officialMarks: 3, provenancePage: 12 },
            { chapterNumber: 6, title: "रेखाएँ और कोण (Lines and Angles)", officialMarks: 5, provenancePage: 12 },
            { chapterNumber: 7, title: "त्रिभुज (Triangles)", officialMarks: 5, provenancePage: 12 },
            { chapterNumber: 8, title: "चतुर्भुज (Quadrilaterals)", officialMarks: 7, provenancePage: 12 },
            { chapterNumber: 9, title: "वृत्त (Circles)", officialMarks: 6, provenancePage: 12 },
            { chapterNumber: 10, title: "हीरोन का सूत्र (Heron's Formula)", officialMarks: 5, provenancePage: 12 },
            { chapterNumber: 11, title: "पृष्ठीय क्षेत्रफल और आयतन (Surface Areas and Volumes)", officialMarks: 6, provenancePage: 12 },
            { chapterNumber: 12, title: "सांख्यिकी (Statistics)", officialMarks: 6, provenancePage: 12 },
            { chapterNumber: 13, title: "समांतर चतुर्भुजों और त्रिभुजों के क्षेत्रफल", isDeleted: true },
            { chapterNumber: 14, title: "रचनाएँ (Constructions)", isDeleted: true },
            { chapterNumber: 15, title: "प्रायिकता (Probability)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 9,
      code: "101",
      name: "Mathematics Basic",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "BASIC", name: "Mathematics Basic" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "Mathematics (NCERT Class IX - Basic)",
          chapters: [
            { chapterNumber: 1, title: "संख्या पद्धति (Number Systems)", officialMarks: 6, provenancePage: 12 },
            { chapterNumber: 2, title: "बहुपद (Polynomials)", officialMarks: 10, provenancePage: 12 },
            { chapterNumber: 3, title: "निर्देशांक ज्यामिति (Coordinate Geometry)", officialMarks: 8, provenancePage: 12 },
            { chapterNumber: 4, title: "दो चरों वाले रैखिक समीकरण (Linear Equations in Two Variables)", officialMarks: 8, provenancePage: 12 },
            { chapterNumber: 5, title: "यूक्लिड ज्यामिति का परिचय (Introduction to Euclid's Geometry)", officialMarks: 3, provenancePage: 12 },
            { chapterNumber: 6, title: "रेखाएँ और कोण (Lines and Angles)", officialMarks: 5, provenancePage: 12 },
            { chapterNumber: 7, title: "त्रिभुज (Triangles)", officialMarks: 5, provenancePage: 12 },
            { chapterNumber: 8, title: "चतुर्भुज (Quadrilaterals)", officialMarks: 7, provenancePage: 12 },
            { chapterNumber: 9, title: "वृत्त (Circles)", officialMarks: 6, provenancePage: 12 },
            { chapterNumber: 10, title: "हीरोन का सूत्र (Heron's Formula)", officialMarks: 5, provenancePage: 12 },
            { chapterNumber: 11, title: "पृष्ठीय क्षेत्रफल और आयतन (Surface Areas and Volumes)", officialMarks: 6, provenancePage: 12 },
            { chapterNumber: 12, title: "सांख्यिकी (Statistics)", officialMarks: 6, provenancePage: 12 },
            { chapterNumber: 13, title: "समांतर चतुर्भुजों और त्रिभुजों के क्षेत्रफल", isDeleted: true },
            { chapterNumber: 14, title: "रचनाएँ (Constructions)", isDeleted: true },
            { chapterNumber: 15, title: "प्रायिकता (Probability)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 9,
      code: "200",
      name: "Science",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: true,
      theoryMarks: 75,
      practicalMarks: 25,
      projectMarks: 0,
      variants: [{ code: "GENERAL", name: "General Science" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "Science (NCERT Class IX)",
          chapters: [
            { chapterNumber: 1, title: "हमारे आस-पास के पदार्थ (Matter in Our Surroundings)", unitTitle: "Chemistry", officialMarks: 6, provenancePage: 13 },
            { chapterNumber: 2, title: "क्या हमारे आस-पास के पदार्थ शुद्ध हैं (Is Matter Around Us Pure)", unitTitle: "Chemistry", officialMarks: 7, provenancePage: 13 },
            { chapterNumber: 3, title: "परमाणु एवं अणु (Atoms and Molecules)", unitTitle: "Chemistry", officialMarks: 7, provenancePage: 13 },
            { chapterNumber: 4, title: "परमाणु की संरचना (Structure of the Atom)", unitTitle: "Chemistry", officialMarks: 7, provenancePage: 13 },
            { chapterNumber: 5, title: "जीवन की मौलिक इकाई (The Fundamental Unit of Life)", unitTitle: "Biology", officialMarks: 6, provenancePage: 13 },
            { chapterNumber: 6, title: "ऊतक (Tissues)", unitTitle: "Biology", officialMarks: 7, provenancePage: 13 },
            { chapterNumber: 7, title: "गति (Motion)", unitTitle: "Physics", officialMarks: 8, provenancePage: 13 },
            { chapterNumber: 8, title: "बल एवं गति के नियम (Force and Laws of Motion)", unitTitle: "Physics", officialMarks: 6, provenancePage: 13 },
            { chapterNumber: 9, title: "गुरुत्वाकर्षण (Gravitation)", unitTitle: "Physics", officialMarks: 5, provenancePage: 13 },
            { chapterNumber: 10, title: "कार्य एवं ऊर्जा (Work and Energy)", unitTitle: "Physics", officialMarks: 6, provenancePage: 13 },
            { chapterNumber: 11, title: "ध्वनि (Sound)", unitTitle: "Physics", officialMarks: 5, provenancePage: 13 },
            { chapterNumber: 12, title: "खाद्य संसाधनों में सुधार (Improvement in Food Resources)", unitTitle: "Biology", officialMarks: 5, provenancePage: 13 },
            { chapterNumber: 13, title: "जीवों में विविधता (Diversity in Living Organisms)", isDeleted: true },
            { chapterNumber: 14, title: "हम बीमार क्यों होते हैं (Why Do We Fall Ill)", isDeleted: true },
            { chapterNumber: 15, title: "प्राकृतिक संपदा (Natural Resources)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 9,
      code: "300",
      name: "Social Science",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "GENERAL", name: "General Social Science" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "समकालीन भारत-1 (भूगोल Class IX)",
          chapters: [
            { chapterNumber: 1, title: "भारत आकार और स्थिति", officialMarks: 4, provenancePage: 14 },
            { chapterNumber: 2, title: "भारत का भौतिक स्वरूप", officialMarks: 4, provenancePage: 14 },
            { chapterNumber: 3, title: "अपवाह", officialMarks: 2, provenancePage: 14 },
            { chapterNumber: 4, title: "जलवायु", officialMarks: 4, provenancePage: 14 },
            { chapterNumber: 5, title: "प्राकृतिक वनस्पति तथा वन्य प्राणी", officialMarks: 3, provenancePage: 14 },
            { chapterNumber: 6, title: "जनसंख्या", officialMarks: 4, provenancePage: 14 },
          ],
        },
        {
          title: "भारत और समकालीन विश्व-1 (इतिहास Class IX)",
          chapters: [
            { chapterNumber: 1, title: "फ्रांसीसी क्रांति", officialMarks: 2, provenancePage: 14 },
            { chapterNumber: 2, title: "यूरोप में समाजवाद एवं रूसी क्रांति", officialMarks: 4, provenancePage: 14 },
            { chapterNumber: 3, title: "नात्सीवाद और हिटलर का उदय", officialMarks: 3, provenancePage: 14 },
            { chapterNumber: 4, title: "वन्य समाज एवं उपनिवेशवाद", officialMarks: 3, provenancePage: 14 },
            { chapterNumber: 5, title: "आधुनिक विश्व में चरवाहे", officialMarks: 3, provenancePage: 14 },
            { chapterNumber: 6, title: "किसान और काश्तकार", isDeleted: true },
          ],
        },
        {
          title: "लोकतांत्रिक राजनीति-1 (राजनीति विज्ञान Class IX)",
          chapters: [
            { chapterNumber: 1, title: "लोकतंत्र क्या और लोकतंत्र क्यों", officialMarks: 5, provenancePage: 14 },
            { chapterNumber: 2, title: "संविधान निर्माण", officialMarks: 3, provenancePage: 14 },
            { chapterNumber: 3, title: "चुनावी राजनीति", officialMarks: 3, provenancePage: 14 },
            { chapterNumber: 4, title: "संस्थाओं का कामकाज", officialMarks: 5, provenancePage: 14 },
            { chapterNumber: 5, title: "लोकतांत्रिक अधिकार", officialMarks: 4, provenancePage: 14 },
            { chapterNumber: 6, title: "समकालीन विश्व में लोकतंत्र", isDeleted: true },
          ],
        },
        {
          title: "अर्थशास्त्र (Economics Class IX)",
          chapters: [
            { chapterNumber: 1, title: "पालमपुर गांव की कहानी", officialMarks: 3, provenancePage: 14 },
            { chapterNumber: 2, title: "संसाधन के रूप में लोग", officialMarks: 4, provenancePage: 14 },
            { chapterNumber: 3, title: "निर्धनता एवं चुनौती", officialMarks: 5, provenancePage: 14 },
            { chapterNumber: 4, title: "भारत में खाद्य सुरक्षा", officialMarks: 3, provenancePage: 14 },
          ],
        },
      ],
    },
    {
      classLevel: 9,
      code: "512",
      name: "Sanskrit",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: false,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "GENERAL", name: "General Sanskrit" }],
      archetype: "STANDARD_23Q_75M",
      unitBreakdown: [
        { unitNumber: 1, title: "शब्दरूपाणि + अव्यया: (Objective 1m x 6)", officialMarks: 6 },
        { unitNumber: 2, title: "धातुरूपाणि + उपसर्गा: (Objective 1m x 6)", officialMarks: 6 },
        { unitNumber: 3, title: "सन्धयः + समासाः (Objective 1m x 6)", officialMarks: 6 },
        { unitNumber: 4, title: "प्रत्ययाः + एकपदेन प्रश्नोत्तराणि (Objective 1m x 6)", officialMarks: 6 },
        { unitNumber: 5, title: "विशेषणं / विशेष्यं + पर्यायशब्दाः + विलोमशब्दाः (Objective 1m x 6)", officialMarks: 6 },
        { unitNumber: 6, title: "पाठगतप्रश्नोत्तराणि (शेमुषी पाठ्यपुस्तक - 2m x 5)", officialMarks: 10 },
        { unitNumber: 7, title: "प्रश्ननिर्माणम् (2m x 1)", officialMarks: 2 },
        { unitNumber: 8, title: "कः कं प्रति कथयति (2m x 1)", officialMarks: 2 },
        { unitNumber: 9, title: "वाच्यपरिवर्तनम् (2m x 1)", officialMarks: 2 },
        { unitNumber: 10, title: "श्लोककण्ठस्थीकरणम् - सुभाषितम् (2m x 1)", officialMarks: 2 },
        { unitNumber: 11, title: "अशुद्धकारकसंशोधनम् (2m x 1)", officialMarks: 2 },
        { unitNumber: 12, title: "पाठगतरिक्तस्थानपूर्तिः (2m x 1)", officialMarks: 2 },
        { unitNumber: 13, title: "पाठाधारितं कथाक्रमसंयोजनम् (2m x 1)", officialMarks: 2 },
        { unitNumber: 14, title: "गद्यांशम् अधिकृत्य अवबोधनात्मकप्रश्नानि (3m x 1)", officialMarks: 3 },
        { unitNumber: 15, title: "पद्यांशम् अधिकृत्य अवबोधनात्मकप्रश्नानि (3m x 1)", officialMarks: 3 },
        { unitNumber: 16, title: "नाट्यांशम् अधिकृत्य अवबोधनात्मकप्रश्नानि (3m x 1)", officialMarks: 3 },
        { unitNumber: 17, title: "अपठितगद्यांशम् (4m x 1)", officialMarks: 4 },
        { unitNumber: 18, title: "पत्रम् / आवेदनपत्रलेखनम् (4m x 1)", officialMarks: 4 },
        { unitNumber: 19, title: "निबन्धलेखनम् (4m x 1)", officialMarks: 4 },
      ],
      textbooks: [
        {
          title: "शेमुषी प्रथमो भागः (NCERT Class IX)",
          chapters: [
            { chapterNumber: 1, title: "भारतीवसन्तगीतिः", officialMarks: 7, provenancePage: 6 },
            { chapterNumber: 2, title: "स्वर्णकाकः", officialMarks: 7, provenancePage: 6 },
            { chapterNumber: 3, title: "गोदोहनम्", officialMarks: 8, provenancePage: 6 },
            { chapterNumber: 4, title: "कल्पतरुः", officialMarks: 7, provenancePage: 6 },
            { chapterNumber: 5, title: "सूक्तिमौक्तिकम्", officialMarks: 8, provenancePage: 6 },
            { chapterNumber: 6, title: "भ्रान्तो बालः", officialMarks: 7, provenancePage: 6 },
            { chapterNumber: 7, title: "प्रत्यभिज्ञानम्", officialMarks: 8, provenancePage: 6 },
            { chapterNumber: 8, title: "लौहतुला", officialMarks: 7, provenancePage: 6 },
            { chapterNumber: 9, title: "सिकतासेतुः", officialMarks: 8, provenancePage: 6 },
            { chapterNumber: 10, title: "जटायोः शौर्यम्", officialMarks: 8, provenancePage: 6 },
          ],
        },
      ],
    },

    // -------------------------------------------------------------------------
    // CLASS 10 SUBJECTS
    // -------------------------------------------------------------------------
    {
      classLevel: 10,
      code: "401",
      name: "Hindi",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "CORE", name: "Hindi Core / General" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "क्षितिज भाग-2 (NCERT Class X)",
          chapters: [
            { chapterNumber: 1, title: "पद (सूरदास)", unitNumber: 1, unitTitle: "काव्य खण्ड", officialMarks: 3 },
            { chapterNumber: 2, title: "राम-लक्ष्मण-परशुराम संवाद (तुलसीदास)", unitNumber: 1, unitTitle: "काव्य खण्ड", officialMarks: 3 },
            { chapterNumber: 3, title: "आत्मकथ्य (जयशंकर प्रसाद)", unitNumber: 1, unitTitle: "काव्य खण्ड", officialMarks: 3 },
            { chapterNumber: 4, title: "उत्साह एवं अट नहीं रही है (सूर्यकांत त्रिपाठी निराला)", unitNumber: 1, unitTitle: "काव्य खण्ड", officialMarks: 3 },
            { chapterNumber: 5, title: "यह दंतुरित मुसकान एवं फसल (नागार्जुन)", unitNumber: 1, unitTitle: "काव्य खण्ड", officialMarks: 3 },
            { chapterNumber: 6, title: "संगतकार (मंगलेश डबराल)", unitNumber: 1, unitTitle: "काव्य खण्ड", officialMarks: 2 },
            { chapterNumber: 7, title: "काव्य बोध (रस, छंद, अलंकार, शब्द गुण)", unitNumber: 2, unitTitle: "काव्य बोध", officialMarks: 10 },
            { chapterNumber: 8, title: "नेताजी का चश्मा (स्वयं प्रकाश)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 9, title: "बालगोबिन भगत (रामवृक्ष बेनीपुरी)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 10, title: "लखनवी अंदाज (यशपाल)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 11, title: "एक कहानी यह भी (मन्नू भण्डारी)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 12, title: "नौबतखाने में इबादत (यतीन्द्र मिश्र)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 3 },
            { chapterNumber: 13, title: "संस्कृति (भदंत आनंद कौसल्यायन)", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 2 },
            { chapterNumber: 14, title: "भाषा बोध (संधि, समास, वाच्य, मुहावरे, लोकोक्तियाँ)", unitNumber: 4, unitTitle: "भाषा बोध", officialMarks: 8 },
            { chapterNumber: 15, title: "अपठित बोध (अपठित काव्यांश / गद्यांश)", unitNumber: 6, unitTitle: "अपठित बोध", officialMarks: 4 },
            { chapterNumber: 16, title: "पत्र लेखन (औपचारिक / अनौपचारिक)", unitNumber: 7, unitTitle: "पत्र लेखन", officialMarks: 4 },
            { chapterNumber: 17, title: "अनुच्छेद, संवाद, विज्ञापन एवं निबंध लेखन", unitNumber: 8, unitTitle: "रचना खण्ड", officialMarks: 7 },
            { chapterNumber: 18, title: "सवैया और कवित्त (देव)", isDeleted: true },
            { chapterNumber: 19, title: "छाया मत छूना (गिरिजाकुमार माथुर)", isDeleted: true },
            { chapterNumber: 20, title: "कन्यादान (ऋतुराज)", isDeleted: true },
            { chapterNumber: 21, title: "मानवीय करुणा की दिव्य चमक (सर्वेश्वर दयाल सक्सेना)", isDeleted: true },
            { chapterNumber: 22, title: "स्त्री शिक्षा के विरोधी कुतर्कों का खंडन (महावीरप्रसाद द्विवेदी)", isDeleted: true },
          ],
        },
        {
          title: "कृतिका भाग-2 (पूरक पाठ्यपुस्तक)",
          chapters: [
            { chapterNumber: 1, title: "माता का अँचल (शिवपूजन सहाय)", unitNumber: 5, unitTitle: "कृतिका भाग-2", officialMarks: 3 },
            { chapterNumber: 2, title: "साना-साना हाथ जोड़ि... (मधु कांकरिया)", unitNumber: 5, unitTitle: "कृतिका भाग-2", officialMarks: 3 },
            { chapterNumber: 3, title: "मैं क्यों लिखता हूँ? (स.ही. वात्स्यायन अज्ञेय)", unitNumber: 5, unitTitle: "कृतिका भाग-2", officialMarks: 2 },
            { chapterNumber: 4, title: "जॉर्ज पंचम की नाक (कमलेश्वर)", isDeleted: true },
            { chapterNumber: 5, title: "एही ठैयाँ झुलनी हेरानी हो रामा! (शिवप्रसाद मिश्र 'रुद्र')", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 10,
      code: "411",
      name: "English",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "STANDARD", name: "English Core / General" }],
      archetype: "ENGLISH_16Q_75M",
      textbooks: [
        {
          title: "First Flight (NCERT Class X)",
          chapters: [
            { chapterNumber: 1, title: "A Letter to God / Dust of Snow / Fire and Ice", unitNumber: 4, unitTitle: "Literature", officialMarks: 5 },
            { chapterNumber: 2, title: "Nelson Mandela: Long Walk to Freedom / A Tiger in the Zoo", unitNumber: 4, unitTitle: "Literature", officialMarks: 5 },
            { chapterNumber: 3, title: "Two Stories about Flying / How to Tell Wild Animals / The Ball Poem", unitNumber: 4, unitTitle: "Literature", officialMarks: 5 },
            { chapterNumber: 4, title: "From the Diary of Anne Frank / Amanda!", unitNumber: 4, unitTitle: "Literature", officialMarks: 5 },
            { chapterNumber: 5, title: "Glimpses of India / The Trees", unitNumber: 4, unitTitle: "Literature", officialMarks: 5 },
            { chapterNumber: 6, title: "Mijbil the Otter / Fog", unitNumber: 4, unitTitle: "Literature", officialMarks: 4 },
            { chapterNumber: 7, title: "Madam Rides the Bus / The Tale of Custard the Dragon", unitNumber: 4, unitTitle: "Literature", officialMarks: 4 },
            { chapterNumber: 8, title: "The Sermon at Benares / For Anne Gregory", unitNumber: 4, unitTitle: "Literature", officialMarks: 4 },
            { chapterNumber: 9, title: "The Proposal (Play)", unitNumber: 4, unitTitle: "Literature", officialMarks: 4 },
            { chapterNumber: 10, title: "The Hundred Dresses - I", isDeleted: true },
            { chapterNumber: 11, title: "The Hundred Dresses - II", isDeleted: true },
            { chapterNumber: 12, title: "Animals (Poem)", isDeleted: true },
          ],
        },
        {
          title: "Footprints without Feet (Supplementary Reader)",
          chapters: [
            { chapterNumber: 1, title: "A Triumph of Surgery", officialMarks: 2 },
            { chapterNumber: 2, title: "The Thief's Story", officialMarks: 2 },
            { chapterNumber: 3, title: "The Midnight Visitor", officialMarks: 2 },
            { chapterNumber: 4, title: "A Question of Trust", officialMarks: 2 },
            { chapterNumber: 5, title: "Footprints without Feet", officialMarks: 2 },
            { chapterNumber: 6, title: "The Making of a Scientist", officialMarks: 2 },
            { chapterNumber: 7, title: "The Necklace", officialMarks: 2 },
            { chapterNumber: 8, title: "Bholi", officialMarks: 2 },
            { chapterNumber: 9, title: "The Book That Saved the Earth", officialMarks: 2 },
            { chapterNumber: 10, title: "The Hack Driver (Sinclair Lewis)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 10,
      code: "100",
      name: "Mathematics Standard",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "STANDARD", name: "Mathematics Standard" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "Mathematics (NCERT Class X)",
          chapters: [
            { chapterNumber: 1, title: "वास्तविक संख्याएँ (Real Numbers)", officialMarks: 6, provenancePage: 31 },
            { chapterNumber: 2, title: "बहुपद (Polynomials)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 3, title: "दो चर वाले रैखिक समीकरण युग्म (Pair of Linear Equations)", officialMarks: 7, provenancePage: 31 },
            { chapterNumber: 4, title: "द्विघात समीकरण (Quadratic Equations)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 5, title: "समांतर श्रेढ़ियाँ (Arithmetic Progressions)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 6, title: "त्रिभुज (Triangles)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 7, title: "निर्देशांक ज्यामिति (Coordinate Geometry)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 8, title: "त्रिकोणमिति का परिचय (Introduction to Trigonometry)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 9, title: "त्रिकोणमिति के कुछ अनुप्रयोग (Applications of Trigonometry)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 10, title: "वृत्त (Circles)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 11, title: "वृत्तों से संबंधित क्षेत्रफल (Areas Related to Circles)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 12, title: "पृष्ठीय क्षेत्रफल और आयतन (Surface Areas and Volumes)", officialMarks: 6, provenancePage: 31 },
            { chapterNumber: 13, title: "सांख्यिकी (Statistics)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 14, title: "प्रायिकता (Probability)", officialMarks: 6, provenancePage: 31 },
            { chapterNumber: 15, title: "रचनाएँ (Constructions)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 10,
      code: "101",
      name: "Mathematics Basic",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "BASIC", name: "Mathematics Basic" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "Mathematics (NCERT Class X - Basic)",
          chapters: [
            { chapterNumber: 1, title: "वास्तविक संख्याएँ (Real Numbers)", officialMarks: 6, provenancePage: 31 },
            { chapterNumber: 2, title: "बहुपद (Polynomials)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 3, title: "दो चर वाले रैखिक समीकरण युग्म (Pair of Linear Equations)", officialMarks: 7, provenancePage: 31 },
            { chapterNumber: 4, title: "द्विघात समीकरण (Quadratic Equations)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 5, title: "समांतर श्रेढ़ियाँ (Arithmetic Progressions)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 6, title: "त्रिभुज (Triangles)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 7, title: "निर्देशांक ज्यामिति (Coordinate Geometry)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 8, title: "त्रिकोणमिति का परिचय (Introduction to Trigonometry)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 9, title: "त्रिकोणमिति के कुछ अनुप्रयोग (Applications of Trigonometry)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 10, title: "वृत्त (Circles)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 11, title: "वृत्तों से संबंधित क्षेत्रफल (Areas Related to Circles)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 12, title: "पृष्ठीय क्षेत्रफल और आयतन (Surface Areas and Volumes)", officialMarks: 6, provenancePage: 31 },
            { chapterNumber: 13, title: "सांख्यिकी (Statistics)", officialMarks: 5, provenancePage: 31 },
            { chapterNumber: 14, title: "प्रायिकता (Probability)", officialMarks: 6, provenancePage: 31 },
            { chapterNumber: 15, title: "रचनाएँ (Constructions)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 10,
      code: "200",
      name: "Science",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: true,
      theoryMarks: 75,
      practicalMarks: 25,
      projectMarks: 0,
      variants: [{ code: "GENERAL", name: "General Science" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "Science (NCERT Class X)",
          chapters: [
            { chapterNumber: 1, title: "रासायनिक अभिक्रियाएं एवं समीकरण (Chemical Reactions and Equations)", unitTitle: "Chemical Substances", officialMarks: 7, provenancePage: 32 },
            { chapterNumber: 2, title: "अम्ल, क्षार एवं लवण (Acids, Bases and Salts)", unitTitle: "Chemical Substances", officialMarks: 6, provenancePage: 32 },
            { chapterNumber: 3, title: "धातु एवं अधातु (Metals and Non-metals)", unitTitle: "Chemical Substances", officialMarks: 5, provenancePage: 32 },
            { chapterNumber: 4, title: "कार्बन एवं उसके यौगिक (Carbon and its Compounds)", unitTitle: "Chemical Substances", officialMarks: 6, provenancePage: 32 },
            { chapterNumber: 5, title: "जैव प्रक्रम (Life Processes)", unitTitle: "Living World", officialMarks: 8, provenancePage: 32 },
            { chapterNumber: 6, title: "नियंत्रण एवं समन्वय (Control and Coordination)", unitTitle: "Living World", officialMarks: 6, provenancePage: 32 },
            { chapterNumber: 7, title: "जीव जनन कैसे करते हैं? (How do Organisms Reproduce?)", unitTitle: "Living World", officialMarks: 6, provenancePage: 32 },
            { chapterNumber: 8, title: "आनुवांशिकता (Heredity)", unitTitle: "Living World", officialMarks: 4, provenancePage: 32 },
            { chapterNumber: 9, title: "प्रकाश – परावर्तन तथा अपवर्तन (Light – Reflection and Refraction)", unitTitle: "Natural Phenomena", officialMarks: 8, provenancePage: 32 },
            { chapterNumber: 10, title: "मानव नेत्र तथा रंगबिरंगा संसार (Human Eye and Colourful World)", unitTitle: "Natural Phenomena", officialMarks: 5, provenancePage: 32 },
            { chapterNumber: 11, title: "विद्युत (Electricity)", unitTitle: "Effects of Current", officialMarks: 5, provenancePage: 32 },
            { chapterNumber: 12, title: "विद्युत धारा के चुंबकीय प्रभाव (Magnetic Effects of Electric Current)", unitTitle: "Effects of Current", officialMarks: 6, provenancePage: 32 },
            { chapterNumber: 13, title: "हमारा पर्यावरण (Our Environment)", unitTitle: "Natural Resources", officialMarks: 3, provenancePage: 32 },
            { chapterNumber: 14, title: "तत्वों का आवर्त वर्गीकरण (Periodic Classification of Elements)", isDeleted: true },
            { chapterNumber: 15, title: "ऊर्जा के स्रोत (Sources of Energy)", isDeleted: true },
            { chapterNumber: 16, title: "प्राकृतिक संसाधनों का संपोषित प्रबंधन (Sustainable Management of Natural Resources)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 10,
      code: "300",
      name: "Social Science",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "GENERAL", name: "General Social Science" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "समकालीन भारत-2 (भूगोल Class X)",
          chapters: [
            { chapterNumber: 1, title: "संसाधन एवं विकास", officialMarks: 4, provenancePage: 33 },
            { chapterNumber: 2, title: "वन एवं वन्य जीव संसाधन", officialMarks: 4, provenancePage: 33 },
            { chapterNumber: 3, title: "जल संसाधन", officialMarks: 2, provenancePage: 33 },
            { chapterNumber: 4, title: "कृषि", officialMarks: 3, provenancePage: 33 },
            { chapterNumber: 5, title: "खनिज तथा ऊर्जा संसाधन (मानचित्र कार्य)", officialMarks: 4, provenancePage: 33 },
            { chapterNumber: 6, title: "विनिर्माण उद्योग", officialMarks: 3, provenancePage: 33 },
            { chapterNumber: 7, title: "राष्ट्रीय अर्थव्यवस्था की जीवन रेखाएं", officialMarks: 5, provenancePage: 33 },
          ],
        },
        {
          title: "भारत और समकालीन विश्व-2 (इतिहास Class X)",
          chapters: [
            { chapterNumber: 1, title: "यूरोप में राष्ट्रवाद का उदय", officialMarks: 2, provenancePage: 33 },
            { chapterNumber: 2, title: "भारत में राष्ट्रवाद", officialMarks: 5, provenancePage: 33 },
            { chapterNumber: 3, title: "भूमंडलीकृत विश्व का बनना", officialMarks: 3, provenancePage: 33 },
            { chapterNumber: 4, title: "औद्योगिकीकरण का युग", officialMarks: 4, provenancePage: 33 },
            { chapterNumber: 5, title: "मुद्रण संस्कृति और आधुनिक दुनिया", officialMarks: 4, provenancePage: 33 },
            { chapterNumber: 6, title: "अमर बलिदानी (मध्यप्रदेश के स्वतंत्रता सेनानी)", officialMarks: 2, provenancePage: 33 },
          ],
        },
        {
          title: "लोकतांत्रिक राजनीति-2 (राजनीति विज्ञान Class X)",
          chapters: [
            { chapterNumber: 1, title: "सत्ता की साझेदारी", officialMarks: 2, provenancePage: 33 },
            { chapterNumber: 2, title: "संघवाद", officialMarks: 4, provenancePage: 33 },
            { chapterNumber: 3, title: "जाति, धर्म और लैंगिक मसले", officialMarks: 2, provenancePage: 33 },
            { chapterNumber: 4, title: "राजनीतिक दल", officialMarks: 4, provenancePage: 33 },
            { chapterNumber: 5, title: "लोकतंत्र के परिणाम", officialMarks: 3, provenancePage: 33 },
            { chapterNumber: 6, title: "लोकतंत्र की चुनौतियाँ", isDeleted: true },
          ],
        },
        {
          title: "आर्थिक विकास की समझ (Economics Class X)",
          chapters: [
            { chapterNumber: 1, title: "विकास", officialMarks: 2, provenancePage: 33 },
            { chapterNumber: 2, title: "भारतीय अर्थव्यवस्था के क्षेत्रक", officialMarks: 4, provenancePage: 33 },
            { chapterNumber: 3, title: "मुद्रा और साख", officialMarks: 4, provenancePage: 33 },
            { chapterNumber: 4, title: "वैश्वीकरण और भारतीय अर्थव्यवस्था", officialMarks: 3, provenancePage: 33 },
            { chapterNumber: 5, title: "उपभोक्ता अधिकार", officialMarks: 2, provenancePage: 33 },
          ],
        },
      ],
    },
    {
      classLevel: 10,
      code: "512",
      name: "Sanskrit",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: false,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "GENERAL", name: "General Sanskrit" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "शेमुषी द्वितीयो भागः (NCERT Class X)",
          chapters: [
            { chapterNumber: 1, title: "शुचिपर्यावरणम्", officialMarks: 7 },
            { chapterNumber: 2, title: "बुद्धिर्बलवती सदा", officialMarks: 7 },
            { chapterNumber: 3, title: "जननी तुल्यवत्सला", officialMarks: 8 },
            { chapterNumber: 4, title: "सुभाषितानि", officialMarks: 8 },
            { chapterNumber: 5, title: "सौहार्दं प्रकृतेः शोभा", officialMarks: 8 },
            { chapterNumber: 6, title: "विचित्रः साक्षी", officialMarks: 7 },
            { chapterNumber: 7, title: "सूक्तयः", officialMarks: 8 },
            { chapterNumber: 8, title: "भूकम्पविभीषिका", officialMarks: 7 },
            { chapterNumber: 9, title: "प्राणेभ्योऽपि प्रियः सुहृद्", officialMarks: 7 },
            { chapterNumber: 10, title: "अन्योक्तयः", officialMarks: 8 },
            { chapterNumber: 11, title: "व्यायामः सर्वदा पथ्यः", isDeleted: true },
            { chapterNumber: 12, title: "शिशुलालनम्", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 10,
      code: "508",
      name: "Urdu",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: false,
      hasPracticals: false,
      theoryMarks: 75,
      practicalMarks: 0,
      projectMarks: 25,
      variants: [{ code: "GENERAL", name: "General Urdu" }],
      archetype: "STANDARD_23Q_75M",
      textbooks: [
        {
          title: "Nawa-e-Urdu (NCERT Class X)",
          chapters: [
            { chapterNumber: 1, title: "Hissa Nasr (Prose Sections)", officialMarks: 30 },
            { chapterNumber: 2, title: "Hissa Nazm (Poetry Sections)", officialMarks: 23 },
            { chapterNumber: 3, title: "Hissa Qawaid (Grammar)", officialMarks: 10 },
            { chapterNumber: 4, title: "Khat / Darkhwast (Letter / Application)", officialMarks: 4 },
            { chapterNumber: 5, title: "Mazmoon (Essay)", officialMarks: 4 },
            { chapterNumber: 6, title: "Ghair Darsi Iqtibas (Unseen Passage)", officialMarks: 4 },
          ],
        },
      ],
    },

    // -------------------------------------------------------------------------
    // CLASS 11 SUBJECTS (Science Stream + Languages)
    // -------------------------------------------------------------------------
    {
      classLevel: 11,
      code: "051",
      name: "Hindi",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 80,
      practicalMarks: 0,
      projectMarks: 20,
      variants: [{ code: "GENERAL", name: "Hindi General / Core" }],
      archetype: "STANDARD_23Q_80M",
      textbooks: [
        {
          title: "आरोह भाग-1 (NCERT Class XI)",
          chapters: [
            { chapterNumber: 1, title: "पद्य खण्ड: कबीर, मीरा, भवानी प्रसाद मिश्र, त्रिलोचन, दुष्यंत कुमार, अक्क महादेवी, पाश, निर्मला पुतुल", unitNumber: 1, unitTitle: "काव्य खण्ड", officialMarks: 17 },
            { chapterNumber: 2, title: "काव्य बोध: रस, अलंकार, छंद, गजल संरचना, शब्द-गुण, बिम्ब", unitNumber: 2, unitTitle: "काव्य बोध", officialMarks: 9 },
            { chapterNumber: 3, title: "गद्य खण्ड: प्रेमचंद (नमक का दारोगा), कृष्णा सोबती, सत्यजित राय, बालमुकुंद गुप्त, शेखर जोशी, मन्नू भंडारी, कृश्नचंदर, नेहरू", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 17 },
            { chapterNumber: 4, title: "भाषा बोध: शब्द शक्ति, वाक्य भेद, मुहावरे, भाव पल्लवन, सार संक्षेपण", unitNumber: 4, unitTitle: "भाषा बोध", officialMarks: 12 },
            { chapterNumber: 5, title: "वितान भाग - 1 (लता मंगेशकर, राजस्थान की रजत बूँदें, आलो-आँधारि)", unitNumber: 5, unitTitle: "वितान भाग - 1", officialMarks: 7 },
            { chapterNumber: 6, title: "अभिव्यक्ति और माध्यम (जनसंचार माध्यम, पत्रकारिता, कार्यालयी लेखन)", unitNumber: 6, unitTitle: "अभिव्यक्ति और माध्यम", officialMarks: 7 },
            { chapterNumber: 7, title: "अपठित बोध (काव्यांश / गद्यांश)", unitNumber: 7, unitTitle: "अपठित बोध", officialMarks: 3 },
            { chapterNumber: 8, title: "पत्र लेखन (औपचारिक / अनौपचारिक)", unitNumber: 8, unitTitle: "पत्र लेखन", officialMarks: 4 },
            { chapterNumber: 9, title: "निबन्ध लेखन (सामयिक एवं साहित्यिक)", unitNumber: 9, unitTitle: "निबन्ध लेखन", officialMarks: 4 },
          ],
        },
      ],
    },
    {
      classLevel: 11,
      code: "052",
      name: "English",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 80,
      practicalMarks: 0,
      projectMarks: 20,
      variants: [{ code: "GENERAL", name: "English General / Core" }],
      archetype: "ENGLISH_15Q_80M",
      textbooks: [
        {
          title: "Hornbill & Snapshots (NCERT Class XI)",
          chapters: [
            { chapterNumber: 1, title: "Reading Skills: Unseen Passage & Note Making", unitNumber: 1, unitTitle: "Section A: Reading", officialMarks: 14 },
            { chapterNumber: 2, title: "Writing Skills: Notice, Poster, Letter, Long Composition", unitNumber: 2, unitTitle: "Section B: Writing", officialMarks: 12 },
            { chapterNumber: 3, title: "Grammar: Gap Filling & Do As Directed", unitNumber: 3, unitTitle: "Section C: Grammar", officialMarks: 10 },
            { chapterNumber: 4, title: "Hornbill Prose: The Portrait of a Lady, We're Not Afraid to Die, Discovering Tut, The Adventure, Silk Road", unitNumber: 4, unitTitle: "Section D: Hornbill Prose", officialMarks: 21 },
            { chapterNumber: 5, title: "Hornbill Poetry: A Photograph, The Laburnum Top, The Voice of the Rain, Childhood, Father to Son", unitNumber: 4, unitTitle: "Section D: Hornbill Poetry", officialMarks: 12 },
            { chapterNumber: 6, title: "Snapshots: Summer of Beautiful White Horse, The Address, Mother's Day, Birth, The Tale of Melon City", unitNumber: 4, unitTitle: "Section D: Snapshots", officialMarks: 11 },
          ],
        },
      ],
    },
    {
      classLevel: 11,
      code: "210",
      name: "Physics",
      streamCode: "SCIENCE_PCM",
      isCompulsory: true,
      hasPracticals: true,
      theoryMarks: 70,
      practicalMarks: 30,
      projectMarks: 0,
      variants: [{ code: "GENERAL", name: "Physics General" }],
      archetype: "SCIENCE_20Q_70M",
      unitBreakdown: [
        {
          unitNumber: 1,
          title: "Group 1: इकाई 1, 2 एवं 3 (भौतिक जगत एवं मापन, गतिकी, गति के नियम: Ch 1–4)",
          officialMarks: 23,
          chapterNumbers: [1, 2, 3, 4],
        },
        {
          unitNumber: 2,
          title: "Group 2: इकाई 4, 5 एवं 6 (कार्य, ऊर्जा और शक्ति, घूर्णी गति, गुरुत्वाकर्षण: Ch 5–7)",
          officialMarks: 17,
          chapterNumbers: [5, 6, 7],
        },
        {
          unitNumber: 3,
          title: "Group 3: इकाई 7, 8 एवं 9 (स्थूल द्रव्य के गुण, ऊष्मागतिकी, अणुगति सिद्धांत: Ch 8–12)",
          officialMarks: 20,
          chapterNumbers: [8, 9, 10, 11, 12],
        },
        {
          unitNumber: 4,
          title: "Group 4: इकाई 10 (दोलन एवं तरंगें: Ch 13–14)",
          officialMarks: 10,
          chapterNumbers: [13, 14],
        },
      ],
      textbooks: [
        {
          title: "Physics Part 1 & 2 (NCERT Class XI)",
          chapters: [
            { chapterNumber: 1, title: "मात्रक एवं मापन (Units and Measurement)", unitNumber: 1, unitTitle: "Group 1: Mechanics 1", officialMarks: 6, provenancePage: 46 },
            { chapterNumber: 2, title: "सरल रेखा में गति (Motion in a Straight Line)", unitNumber: 1, unitTitle: "Group 1: Mechanics 1", officialMarks: 6, provenancePage: 46 },
            { chapterNumber: 3, title: "समतल में गति (Motion in a Plane)", unitNumber: 1, unitTitle: "Group 1: Mechanics 1", officialMarks: 5, provenancePage: 46 },
            { chapterNumber: 4, title: "गति के नियम (Laws of Motion)", unitNumber: 1, unitTitle: "Group 1: Mechanics 1", officialMarks: 6, provenancePage: 46 },
            { chapterNumber: 5, title: "कार्य, ऊर्जा और शक्ति (Work, Energy and Power)", unitNumber: 2, unitTitle: "Group 2: Mechanics 2", officialMarks: 6, provenancePage: 46 },
            { chapterNumber: 6, title: "कणों के निकाय तथा घूर्णी गति (Systems of Particles & Rotational Motion)", unitNumber: 2, unitTitle: "Group 2: Mechanics 2", officialMarks: 6, provenancePage: 46 },
            { chapterNumber: 7, title: "गुरुत्वाकर्षण (Gravitation)", unitNumber: 2, unitTitle: "Group 2: Mechanics 2", officialMarks: 5, provenancePage: 46 },
            { chapterNumber: 8, title: "ठोसों के यांत्रिक गुण (Mechanical Properties of Solids)", unitNumber: 3, unitTitle: "Group 3: Bulk Matter & Thermodynamics", officialMarks: 4, provenancePage: 46 },
            { chapterNumber: 9, title: "तरलों के यांत्रिकी गुण (Mechanical Properties of Fluids)", unitNumber: 3, unitTitle: "Group 3: Bulk Matter & Thermodynamics", officialMarks: 4, provenancePage: 46 },
            { chapterNumber: 10, title: "द्रव्य के तापीय गुण (Thermal Properties of Matter)", unitNumber: 3, unitTitle: "Group 3: Bulk Matter & Thermodynamics", officialMarks: 4, provenancePage: 46 },
            { chapterNumber: 11, title: "ऊष्मागतिकी (Thermodynamics)", unitNumber: 3, unitTitle: "Group 3: Bulk Matter & Thermodynamics", officialMarks: 4, provenancePage: 46 },
            { chapterNumber: 12, title: "अणुगति सिद्धांत (Kinetic Theory of Gases)", unitNumber: 3, unitTitle: "Group 3: Bulk Matter & Thermodynamics", officialMarks: 4, provenancePage: 46 },
            { chapterNumber: 13, title: "दोलन (Oscillations)", unitNumber: 4, unitTitle: "Group 4: Oscillations & Waves", officialMarks: 5, provenancePage: 46 },
            { chapterNumber: 14, title: "तरंगें (Waves)", unitNumber: 4, unitTitle: "Group 4: Oscillations & Waves", officialMarks: 5, provenancePage: 46 },
            { chapterNumber: 15, title: "भौतिक जगत (Physical World)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 11,
      code: "220",
      name: "Chemistry",
      streamCode: "SCIENCE_PCM",
      isCompulsory: true,
      hasPracticals: true,
      theoryMarks: 70,
      practicalMarks: 30,
      projectMarks: 0,
      variants: [{ code: "GENERAL", name: "Chemistry General" }],
      archetype: "SCIENCE_20Q_70M",
      textbooks: [
        {
          title: "Chemistry Part 1 & 2 (NCERT Class XI)",
          chapters: [
            { chapterNumber: 1, title: "रसायन विज्ञान की मूल अवधारणाएं (Some Basic Concepts of Chemistry)", officialMarks: 7, provenancePage: 48 },
            { chapterNumber: 2, title: "परमाणु संरचना (Structure of Atom)", officialMarks: 9, provenancePage: 48 },
            { chapterNumber: 3, title: "तत्वों का वर्गीकरण एवं गुणों में आवर्तिता (Classification & Periodicity)", officialMarks: 6, provenancePage: 48 },
            { chapterNumber: 4, title: "रासायनिक आबंधन तथा आण्विक संरचना (Chemical Bonding & Molecular Structure)", officialMarks: 7, provenancePage: 48 },
            { chapterNumber: 5, title: "ऊष्मागतिकी (Thermodynamics)", officialMarks: 9, provenancePage: 48 },
            { chapterNumber: 6, title: "साम्यावस्था (Equilibrium)", officialMarks: 7, provenancePage: 48 },
            { chapterNumber: 7, title: "अपचयोपचय अभिक्रियाएं (Redox Reactions)", officialMarks: 4, provenancePage: 48 },
            { chapterNumber: 8, title: "कार्बनिक रसायन: कुछ आधारभूत सिद्धांत तथा तकनीकें (Organic Chemistry)", officialMarks: 11, provenancePage: 48 },
            { chapterNumber: 9, title: "हाइड्रोकार्बन (Hydrocarbons)", officialMarks: 10, provenancePage: 48 },
            { chapterNumber: 10, title: "द्रव्य की अवस्थाएं (States of Matter)", isDeleted: true },
            { chapterNumber: 11, title: "हाइड्रोजन (Hydrogen)", isDeleted: true },
            { chapterNumber: 12, title: "s-ब्लॉक तत्व (s-Block Elements)", isDeleted: true },
            { chapterNumber: 13, title: "कुछ p-ब्लॉक तत्व (Some p-Block Elements)", isDeleted: true },
            { chapterNumber: 14, title: "पर्यावरणीय रसायन (Environmental Chemistry)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 11,
      code: "231",
      name: "Biology",
      streamCode: "SCIENCE_BIO",
      isCompulsory: true,
      hasPracticals: true,
      theoryMarks: 70,
      practicalMarks: 30,
      projectMarks: 0,
      variants: [{ code: "GENERAL", name: "Biology General" }],
      archetype: "SCIENCE_20Q_70M",
      textbooks: [
        {
          title: "Biology (NCERT Class XI)",
          chapters: [
            { chapterNumber: 1, title: "जीव जगत (The Living World)", unitNumber: 1, unitTitle: "Diversity in Living World", officialMarks: 3, provenancePage: 51 },
            { chapterNumber: 2, title: "जीव जगत का वर्गीकरण (Biological Classification)", unitNumber: 1, unitTitle: "Diversity in Living World", officialMarks: 3, provenancePage: 51 },
            { chapterNumber: 3, title: "वनस्पति जगत (Plant Kingdom)", unitNumber: 1, unitTitle: "Diversity in Living World", officialMarks: 3, provenancePage: 51 },
            { chapterNumber: 4, title: "प्राणी जगत (Animal Kingdom)", unitNumber: 1, unitTitle: "Diversity in Living World", officialMarks: 3, provenancePage: 51 },
            { chapterNumber: 5, title: "पुष्पी पादपों की आकारिकी (Morphology of Flowering Plants)", unitNumber: 2, unitTitle: "Structural Organisation", officialMarks: 5, provenancePage: 51 },
            { chapterNumber: 6, title: "पुष्पी पादपों का शरीर (Anatomy of Flowering Plants)", unitNumber: 2, unitTitle: "Structural Organisation", officialMarks: 5, provenancePage: 51 },
            { chapterNumber: 7, title: "प्राणियों में संरचनात्मक संगठन (Structural Organisation in Animals)", unitNumber: 2, unitTitle: "Structural Organisation", officialMarks: 4, provenancePage: 51 },
            { chapterNumber: 8, title: "कोशिका: जीवन की इकाई (Cell: The Unit of Life)", unitNumber: 3, unitTitle: "Cell Structure and Function", officialMarks: 4, provenancePage: 51 },
            { chapterNumber: 9, title: "जैव अणु (Biomolecules)", unitNumber: 3, unitTitle: "Cell Structure and Function", officialMarks: 4, provenancePage: 51 },
            { chapterNumber: 10, title: "कोशिका चक्र और कोशिका विभाजन (Cell Cycle & Cell Division)", unitNumber: 3, unitTitle: "Cell Structure and Function", officialMarks: 4, provenancePage: 51 },
            { chapterNumber: 11, title: "उच्च पादपों में प्रकाश संश्लेषण (Photosynthesis in Higher Plants)", unitNumber: 4, unitTitle: "Plant Physiology", officialMarks: 5, provenancePage: 51 },
            { chapterNumber: 12, title: "पादप में श्वसन (Respiration in Plants)", unitNumber: 4, unitTitle: "Plant Physiology", officialMarks: 5, provenancePage: 51 },
            { chapterNumber: 13, title: "पादप वृद्धि एवं परिवर्धन (Plant Growth & Development)", unitNumber: 4, unitTitle: "Plant Physiology", officialMarks: 4, provenancePage: 51 },
            { chapterNumber: 14, title: "श्वसन और गैसों का विनिमय (Breathing & Exchange of Gases)", unitNumber: 5, unitTitle: "Human Physiology", officialMarks: 3, provenancePage: 51 },
            { chapterNumber: 15, title: "शरीर द्रव तथा परिसंचरण (Body Fluids & Circulation)", unitNumber: 5, unitTitle: "Human Physiology", officialMarks: 3, provenancePage: 51 },
            { chapterNumber: 16, title: "उत्सर्जी उत्पाद एवं उनका निष्कासन (Excretory Products & Elimination)", unitNumber: 5, unitTitle: "Human Physiology", officialMarks: 3, provenancePage: 51 },
            { chapterNumber: 17, title: "गमन एवं संचलन (Locomotion & Movement)", unitNumber: 5, unitTitle: "Human Physiology", officialMarks: 3, provenancePage: 51 },
            { chapterNumber: 18, title: "तंत्रिकीय नियंत्रण एवं समन्वय (Neural Control & Coordination)", unitNumber: 5, unitTitle: "Human Physiology", officialMarks: 3, provenancePage: 51 },
            { chapterNumber: 19, title: "रासायनिक समन्वय तथा एकीकरण (Chemical Coordination & Integration)", unitNumber: 5, unitTitle: "Human Physiology", officialMarks: 3, provenancePage: 51 },
            { chapterNumber: 20, title: "पौधों में परिवहन (Transport in Plants)", isDeleted: true },
            { chapterNumber: 21, title: "खनिज पोषण (Mineral Nutrition)", isDeleted: true },
            { chapterNumber: 22, title: "पाचन एवं अवशोषण (Digestion and Absorption)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 11,
      code: "150",
      name: "Mathematics",
      streamCode: "SCIENCE_PCM",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 80,
      practicalMarks: 0,
      projectMarks: 20,
      variants: [{ code: "GENERAL", name: "Mathematics General" }],
      archetype: "STANDARD_23Q_80M",
      textbooks: [
        {
          title: "Mathematics (NCERT Class XI)",
          chapters: [
            { chapterNumber: 1, title: "समुच्चय (Sets)", officialMarks: 6, provenancePage: 50 },
            { chapterNumber: 2, title: "संबंध एवं फलन (Relations and Functions)", officialMarks: 5, provenancePage: 50 },
            { chapterNumber: 3, title: "त्रिकोणमितीय फलन (Trigonometric Functions)", officialMarks: 10, provenancePage: 50 },
            { chapterNumber: 4, title: "सम्मिश्र संख्याएँ और द्विघातीय समीकरण (Complex Numbers)", officialMarks: 9, provenancePage: 50 },
            { chapterNumber: 5, title: "रैखिक असमिकाएँ (Linear Inequalities)", officialMarks: 4, provenancePage: 50 },
            { chapterNumber: 6, title: "क्रमचय और संचय (Permutations and Combinations)", officialMarks: 4, provenancePage: 50 },
            { chapterNumber: 7, title: "द्विपद प्रमेय (Binomial Theorem)", officialMarks: 4, provenancePage: 50 },
            { chapterNumber: 8, title: "अनुक्रम तथा श्रेणी (Sequences and Series)", officialMarks: 8, provenancePage: 50 },
            { chapterNumber: 9, title: "सरल रेखाएं (Straight Lines)", officialMarks: 6, provenancePage: 50 },
            { chapterNumber: 10, title: "शंकु परिच्छेद (Conic Sections)", officialMarks: 2, provenancePage: 50 },
            { chapterNumber: 11, title: "त्रिविमीय ज्यामिति का परिचय (Introduction to 3D Geometry)", officialMarks: 5, provenancePage: 50 },
            { chapterNumber: 12, title: "सीमा और अवकलज (Limits and Derivatives)", officialMarks: 8, provenancePage: 50 },
            { chapterNumber: 13, title: "सांख्यिकी (Statistics)", officialMarks: 5, provenancePage: 50 },
            { chapterNumber: 14, title: "प्रायिकता (Probability)", officialMarks: 4, provenancePage: 50 },
            { chapterNumber: 15, title: "गणितीय आगमन का सिद्धांत (Mathematical Induction)", isDeleted: true },
            { chapterNumber: 16, title: "गणितीय विवेचन (Mathematical Reasoning)", isDeleted: true },
          ],
        },
      ],
    },

    // -------------------------------------------------------------------------
    // CLASS 12 SUBJECTS (Science Stream + Languages)
    // -------------------------------------------------------------------------
    {
      classLevel: 12,
      code: "051",
      name: "Hindi",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 80,
      practicalMarks: 0,
      projectMarks: 20,
      variants: [{ code: "GENERAL", name: "Hindi General / Core" }],
      archetype: "STANDARD_23Q_80M",
      textbooks: [
        {
          title: "आरोह भाग-2 (NCERT Class XII)",
          chapters: [
            { chapterNumber: 1, title: "पद्य खण्ड: हरिवंश राय बच्चन, आलोक धन्वा, कुँवर नारायण, रघुवीर सहाय, शमशेर बहादुर सिंह, निराला, तुलसीदास, फिराक गोरखपुरी, उमाशंकर जोशी", unitNumber: 1, unitTitle: "काव्य खण्ड", officialMarks: 17 },
            { chapterNumber: 2, title: "काव्य बोध: रस, अलंकार (संदेह, भ्रांतिमान, विरोधाभास), छंद, शब्द गुण, बिम्ब", unitNumber: 2, unitTitle: "काव्य बोध", officialMarks: 9 },
            { chapterNumber: 3, title: "गद्य खण्ड: महादेवी वर्मा (भक्तिन), जैनेन्द्र कुमार (बाज़ार दर्शन), धर्मवीर भारती (काले मेघा पानी दे), फणीश्वर नाथ रेणु, हजारी प्रसाद द्विवेदी, आंबेडकर", unitNumber: 3, unitTitle: "गद्य खण्ड", officialMarks: 17 },
            { chapterNumber: 4, title: "भाषा बोध: शब्द शक्ति, वाक्य शुद्धिकरण, मुहावरे, राजभाषा, भाव पल्लवन, विज्ञापन", unitNumber: 4, unitTitle: "भाषा बोध", officialMarks: 12 },
            { chapterNumber: 5, title: "वितान भाग-2 (सिल्वर वैडिंग, जूझ, अतीत में दबे पाँव)", unitNumber: 5, unitTitle: "वितान भाग-2", officialMarks: 7 },
            { chapterNumber: 6, title: "अभिव्यक्ति और माध्यम (जनसंचार माध्यम, पत्रकारीय लेखन, सृजनात्मक लेखन)", unitNumber: 6, unitTitle: "अभिव्यक्ति और माध्यम", officialMarks: 7 },
            { chapterNumber: 7, title: "अपठित बोध (काव्यांश / गद्यांश)", unitNumber: 7, unitTitle: "अपठित बोध", officialMarks: 3 },
            { chapterNumber: 8, title: "पत्र लेखन (औपचारिक / अनौपचारिक)", unitNumber: 8, unitTitle: "पत्र लेखन", officialMarks: 4 },
            { chapterNumber: 9, title: "निबन्ध लेखन (सामयिक एवं राष्ट्रीय)", unitNumber: 9, unitTitle: "निबन्ध लेखन", officialMarks: 4 },
          ],
        },
      ],
    },
    {
      classLevel: 12,
      code: "052",
      name: "English",
      streamCode: "SECONDARY_GENERAL",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 80,
      practicalMarks: 0,
      projectMarks: 20,
      variants: [{ code: "GENERAL", name: "English General / Core" }],
      archetype: "ENGLISH_15Q_80M",
      textbooks: [
        {
          title: "Flamingo & Vistas (NCERT Class XII)",
          chapters: [
            { chapterNumber: 1, title: "Reading Skills: Unseen Comprehension & Note Making", unitNumber: 1, unitTitle: "Section A: Reading", officialMarks: 14 },
            { chapterNumber: 2, title: "Writing Skills: Notice, Poster, Letter, Long Composition", unitNumber: 2, unitTitle: "Section B: Writing", officialMarks: 12 },
            { chapterNumber: 3, title: "Grammar: Sentence Corrections & Do As Directed", unitNumber: 3, unitTitle: "Section C: Grammar", officialMarks: 10 },
            { chapterNumber: 4, title: "Flamingo Prose: The Last Lesson, Lost Spring, Deep Water, The Rattrap, Indigo, Poets and Pancakes, The Interview, Going Places", unitNumber: 4, unitTitle: "Section D: Flamingo Prose", officialMarks: 21 },
            { chapterNumber: 5, title: "Flamingo Poetry: My Mother at Sixty-Six, Keeping Quiet, A Thing of Beauty, A Roadside Stand, Aunt Jennifer's Tigers", unitNumber: 4, unitTitle: "Section D: Flamingo Poetry", officialMarks: 12 },
            { chapterNumber: 6, title: "Vistas: The Third Level, The Tiger King, Journey to End of Earth, The Enemy, On the Face of It, Memories of Childhood", unitNumber: 4, unitTitle: "Section D: Vistas", officialMarks: 11 },
            { chapterNumber: 7, title: "An Elementary School Classroom in a Slum (Stephen Spender)", isDeleted: true },
            { chapterNumber: 8, title: "Should Wizard Hit Mommy? (John Updike)", isDeleted: true },
            { chapterNumber: 9, title: "Evans Tries an O-Level (Colin Dexter)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 12,
      code: "210",
      name: "Physics",
      streamCode: "SCIENCE_PCM",
      isCompulsory: true,
      hasPracticals: true,
      theoryMarks: 70,
      practicalMarks: 30,
      projectMarks: 0,
      variants: [{ code: "GENERAL", name: "Physics General" }],
      archetype: "SCIENCE_20Q_70M",
      textbooks: [
        {
          title: "Physics Part 1 & 2 (NCERT Class XII)",
          chapters: [
            { chapterNumber: 1, title: "वैद्युत आवेश तथा क्षेत्र (Electric Charges & Fields)", unitNumber: 1, unitTitle: "Electrostatics & Current", officialMarks: 5, provenancePage: 94 },
            { chapterNumber: 2, title: "स्थिरवैद्युत विभव तथा धारिता (Electrostatic Potential & Capacitance)", unitNumber: 1, unitTitle: "Electrostatics & Current", officialMarks: 5, provenancePage: 94 },
            { chapterNumber: 3, title: "विद्युत धारा (Current Electricity)", unitNumber: 1, unitTitle: "Electrostatics & Current", officialMarks: 6, provenancePage: 94 },
            { chapterNumber: 4, title: "गतिमान आवेश और चुंबकत्व (Moving Charges & Magnetism)", unitNumber: 2, unitTitle: "Magnetic Effects & Induction", officialMarks: 5, provenancePage: 94 },
            { chapterNumber: 5, title: "चुंबकत्व एवं द्रव्य (Magnetism & Matter)", unitNumber: 2, unitTitle: "Magnetic Effects & Induction", officialMarks: 3, provenancePage: 94 },
            { chapterNumber: 6, title: "वैद्युतचुंबकीय प्रेरण (Electromagnetic Induction)", unitNumber: 2, unitTitle: "Magnetic Effects & Induction", officialMarks: 4, provenancePage: 94 },
            { chapterNumber: 7, title: "प्रत्यावर्ती धारा (Alternating Current)", unitNumber: 2, unitTitle: "Magnetic Effects & Induction", officialMarks: 5, provenancePage: 94 },
            { chapterNumber: 8, title: "वैद्युतचुंबकीय तरंगें (Electromagnetic Waves)", unitNumber: 3, unitTitle: "Optics & EM Waves", officialMarks: 4, provenancePage: 94 },
            { chapterNumber: 9, title: "किरण प्रकाशिकी एवं प्रकाशिक यंत्र (Ray Optics & Optical Instruments)", unitNumber: 3, unitTitle: "Optics & EM Waves", officialMarks: 8, provenancePage: 94 },
            { chapterNumber: 10, title: "तरंग प्रकाशिकी (Wave Optics)", unitNumber: 3, unitTitle: "Optics & EM Waves", officialMarks: 6, provenancePage: 94 },
            { chapterNumber: 11, title: "विकिरण तथा द्रव्य की द्वैत प्रकृति (Dual Nature of Radiation & Matter)", unitNumber: 4, unitTitle: "Modern Physics", officialMarks: 4, provenancePage: 94 },
            { chapterNumber: 12, title: "परमाणु (Atoms)", unitNumber: 4, unitTitle: "Modern Physics", officialMarks: 4, provenancePage: 94 },
            { chapterNumber: 13, title: "नाभिक (Nuclei)", unitNumber: 4, unitTitle: "Modern Physics", officialMarks: 4, provenancePage: 94 },
            { chapterNumber: 14, title: "अर्धचालक इलेक्ट्रॉनिकी- पदार्थ, युक्तियाँ तथा सरल परिपथ (Semiconductor Electronics)", unitNumber: 5, unitTitle: "Electronic Devices", officialMarks: 7, provenancePage: 94 },
          ],
        },
      ],
    },
    {
      classLevel: 12,
      code: "220",
      name: "Chemistry",
      streamCode: "SCIENCE_PCM",
      isCompulsory: true,
      hasPracticals: true,
      theoryMarks: 70,
      practicalMarks: 30,
      projectMarks: 0,
      variants: [{ code: "GENERAL", name: "Chemistry General" }],
      archetype: "SCIENCE_20Q_70M",
      textbooks: [
        {
          title: "Chemistry Part 1 & 2 (NCERT Class XII)",
          chapters: [
            { chapterNumber: 1, title: "विलयन (Solutions)", officialMarks: 7, provenancePage: 96 },
            { chapterNumber: 2, title: "वैद्युतरसायन (Electrochemistry)", officialMarks: 9, provenancePage: 96 },
            { chapterNumber: 3, title: "रासायनिक बलगतिकी (Chemical Kinetics)", officialMarks: 7, provenancePage: 96 },
            { chapterNumber: 4, title: "d- एवं f- ब्लॉक के तत्व (d- and f-Block Elements)", officialMarks: 7, provenancePage: 96 },
            { chapterNumber: 5, title: "उपसहसंयोजन यौगिक (Coordination Compounds)", officialMarks: 7, provenancePage: 96 },
            { chapterNumber: 6, title: "हैलोऐल्केन तथा हैलोऐरीन (Haloalkanes & Haloarenes)", officialMarks: 6, provenancePage: 96 },
            { chapterNumber: 7, title: "ऐल्कोहॉल, फीनॉल एवं ईथर (Alcohols, Phenols & Ethers)", officialMarks: 6, provenancePage: 96 },
            { chapterNumber: 8, title: "ऐल्डिहाइड, कीटोन एवं कार्बोक्सिलिक अम्ल (Aldehydes, Ketones & Carboxylic Acids)", officialMarks: 8, provenancePage: 96 },
            { chapterNumber: 9, title: "ऐमीन (Amines)", officialMarks: 6, provenancePage: 96 },
            { chapterNumber: 10, title: "जैव-अणु (Biomolecules)", officialMarks: 7, provenancePage: 96 },
            { chapterNumber: 11, title: "ठोस अवस्था (Solid State)", isDeleted: true },
            { chapterNumber: 12, title: "पृष्ठ रसायन (Surface Chemistry)", isDeleted: true },
            { chapterNumber: 13, title: "तत्वों के निष्कर्षण के सिद्धांत (Metallurgy)", isDeleted: true },
            { chapterNumber: 14, title: "p-ब्लॉक के तत्व (p-Block Elements)", isDeleted: true },
            { chapterNumber: 15, title: "बहुलक (Polymers)", isDeleted: true },
            { chapterNumber: 16, title: "दैनिक जीवन में रसायन (Chemistry in Everyday Life)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 12,
      code: "231",
      name: "Biology",
      streamCode: "SCIENCE_BIO",
      isCompulsory: true,
      hasPracticals: true,
      theoryMarks: 70,
      practicalMarks: 30,
      projectMarks: 0,
      variants: [{ code: "GENERAL", name: "Biology General" }],
      archetype: "SCIENCE_20Q_70M",
      textbooks: [
        {
          title: "Biology (NCERT Class XII)",
          chapters: [
            { chapterNumber: 1, title: "पुष्पी पादपों में लैंगिक प्रजनन (Sexual Reproduction in Flowering Plants)", unitNumber: 1, unitTitle: "Reproduction", officialMarks: 6, provenancePage: 99 },
            { chapterNumber: 2, title: "मानव जनन (Human Reproduction)", unitNumber: 1, unitTitle: "Reproduction", officialMarks: 6, provenancePage: 99 },
            { chapterNumber: 3, title: "जनन स्वास्थ्य (Reproductive Health)", unitNumber: 1, unitTitle: "Reproduction", officialMarks: 4, provenancePage: 99 },
            { chapterNumber: 4, title: "वंशागति तथा विविधता के सिद्धांत (Principles of Inheritance & Variation)", unitNumber: 2, unitTitle: "Genetics and Evolution", officialMarks: 6, provenancePage: 99 },
            { chapterNumber: 5, title: "वंशागति के आणविक आधार (Molecular Basis of Inheritance)", unitNumber: 2, unitTitle: "Genetics and Evolution", officialMarks: 6, provenancePage: 99 },
            { chapterNumber: 6, title: "विकास (Evolution)", unitNumber: 2, unitTitle: "Genetics and Evolution", officialMarks: 4, provenancePage: 99 },
            { chapterNumber: 7, title: "मानव स्वास्थ्य तथा रोग (Human Health & Disease)", unitNumber: 3, unitTitle: "Biology in Human Welfare", officialMarks: 7, provenancePage: 99 },
            { chapterNumber: 8, title: "मानव कल्याण में सूक्ष्मजीव (Microbes in Human Welfare)", unitNumber: 3, unitTitle: "Biology in Human Welfare", officialMarks: 7, provenancePage: 99 },
            { chapterNumber: 9, title: "जैव प्रौद्योगिकी - सिद्धांत व प्रक्रम (Biotechnology: Principles & Processes)", unitNumber: 4, unitTitle: "Biotechnology", officialMarks: 6, provenancePage: 99 },
            { chapterNumber: 10, title: "जैव प्रौद्योगिकी एवं उसके उपयोग (Biotechnology & Applications)", unitNumber: 4, unitTitle: "Biotechnology", officialMarks: 6, provenancePage: 99 },
            { chapterNumber: 11, title: "जीव और समष्टियाँ (Organisms & Populations)", unitNumber: 5, unitTitle: "Ecology", officialMarks: 4, provenancePage: 99 },
            { chapterNumber: 12, title: "पारितंत्र (Ecosystem)", unitNumber: 5, unitTitle: "Ecology", officialMarks: 4, provenancePage: 99 },
            { chapterNumber: 13, title: "जैव-विविधता एवं संरक्षण (Biodiversity & Conservation)", unitNumber: 5, unitTitle: "Ecology", officialMarks: 4, provenancePage: 99 },
            { chapterNumber: 14, title: "जीवों में जनन (Reproduction in Organisms)", isDeleted: true },
            { chapterNumber: 15, title: "खाद्य उत्पादन में वृद्धि की कार्यनीति (Enhancement in Food Production)", isDeleted: true },
            { chapterNumber: 16, title: "पर्यावरण के मुद्दे (Environmental Issues)", isDeleted: true },
          ],
        },
      ],
    },
    {
      classLevel: 12,
      code: "150",
      name: "Mathematics",
      streamCode: "SCIENCE_PCM",
      isCompulsory: true,
      hasPracticals: false,
      theoryMarks: 80,
      practicalMarks: 0,
      projectMarks: 20,
      variants: [{ code: "GENERAL", name: "Mathematics General" }],
      archetype: "STANDARD_23Q_80M",
      textbooks: [
        {
          title: "Mathematics Part 1 & 2 (NCERT Class XII)",
          chapters: [
            { chapterNumber: 1, title: "संबंध एवं फलन (Relations and Functions)", officialMarks: 5, provenancePage: 98 },
            { chapterNumber: 2, title: "प्रतिलोम त्रिकोणमितीय फलन (Inverse Trigonometric Functions)", officialMarks: 6, provenancePage: 98 },
            { chapterNumber: 3, title: "आव्यूह (Matrices)", officialMarks: 6, provenancePage: 98 },
            { chapterNumber: 4, title: "सारणिक (Determinants)", officialMarks: 6, provenancePage: 98 },
            { chapterNumber: 5, title: "सांतत्य तथा अवकलनीयता (Continuity & Differentiability)", officialMarks: 8, provenancePage: 98 },
            { chapterNumber: 6, title: "अवकलज के अनुप्रयोग (Applications of Derivatives)", officialMarks: 6, provenancePage: 98 },
            { chapterNumber: 7, title: "समाकलन (Integrals)", officialMarks: 12, provenancePage: 98 },
            { chapterNumber: 8, title: "समाकलनों के अनुप्रयोग (Applications of Integrals)", officialMarks: 3, provenancePage: 98 },
            { chapterNumber: 9, title: "अवकल समीकरण (Differential Equations)", officialMarks: 6, provenancePage: 98 },
            { chapterNumber: 10, title: "सदिश बीजगणित (Vector Algebra)", officialMarks: 7, provenancePage: 98 },
            { chapterNumber: 11, title: "त्रि-विमीय ज्यामिति (Three Dimensional Geometry)", officialMarks: 7, provenancePage: 98 },
            { chapterNumber: 12, title: "रैखिक प्रोग्रामन (Linear Programming)", officialMarks: 3, provenancePage: 98 },
            { chapterNumber: 13, title: "प्रायिकता (Probability)", officialMarks: 5, provenancePage: 98 },
          ],
        },
      ],
    },
  ];

  let totalTextbooksCreated = 0;
  let totalChaptersCreated = 0;
  let totalBlueprintsCreated = 0;
  let totalLegacyBooksLinked = 0;

  for (const s of subjectsSeed) {
    const classId = classMap.get(s.classLevel)!;
    const streamId = s.streamCode ? streamMap.get(`${s.classLevel}_${s.streamCode}`) : null;

    // Create or update Subject
    const subject = await prisma.curriculumSubject.upsert({
      where: {
        classId_code: {
          classId,
          code: s.code,
        },
      },
      update: {
        name: s.name,
        streamId,
        isCompulsory: s.isCompulsory,
        hasPracticals: s.hasPracticals,
        theoryMarks: s.theoryMarks,
        practicalMarks: s.practicalMarks,
        projectMarks: s.projectMarks,
      },
      create: {
        classId,
        streamId,
        code: s.code,
        name: s.name,
        isCompulsory: s.isCompulsory,
        hasPracticals: s.hasPracticals,
        theoryMarks: s.theoryMarks,
        practicalMarks: s.practicalMarks,
        projectMarks: s.projectMarks,
      },
    });

    // Variants
    for (const v of s.variants) {
      await prisma.curriculumSubjectVariant.upsert({
        where: {
          subjectId_code: {
            subjectId: subject.id,
            code: v.code,
          },
        },
        update: {
          name: v.name,
          cognitiveWeight: v.cognitiveWeight ? toJson(v.cognitiveWeight) : undefined,
        },
        create: {
          subjectId: subject.id,
          code: v.code,
          name: v.name,
          cognitiveWeight: v.cognitiveWeight ? toJson(v.cognitiveWeight) : undefined,
        },
      });
    }

    // Textbooks & Chapters
    for (const tb of s.textbooks) {
      // 1. Create or link legacy Book record for immediate Paper Builder utilization
      let legacyBook = await prisma.book.findFirst({
        where: {
          title: tb.title,
          className: `Class ${s.classLevel}`,
          academicSession: "2026-27",
        },
      });

      if (!legacyBook) {
        legacyBook = await prisma.book.create({
          data: {
            title: tb.title,
            subject: s.name,
            className: `Class ${s.classLevel}`,
            academicSession: "2026-27",
          },
        });
        totalLegacyBooksLinked++;
      }

      // 2. Find or create CurriculumTextbook
      let textbook = await prisma.curriculumTextbook.findFirst({
        where: {
          subjectId: subject.id,
          title: tb.title,
        },
      });

      if (textbook) {
        textbook = await prisma.curriculumTextbook.update({
          where: { id: textbook.id },
          data: {
            publisher: tb.publisher || "NCERT / MP Text Book Corporation",
            academicSession: "2026-27",
            legacyBookId: legacyBook.id,
          },
        });
      } else {
        textbook = await prisma.curriculumTextbook.create({
          data: {
            subjectId: subject.id,
            title: tb.title,
            publisher: tb.publisher || "NCERT / MP Text Book Corporation",
            academicSession: "2026-27",
            legacyBookId: legacyBook.id,
          },
        });
      }
      totalTextbooksCreated++;

      // 3. Chapters
      for (const ch of tb.chapters) {
        // Create or find legacy Chapter
        let legacyChapter = await prisma.chapter.findFirst({
          where: {
            bookId: legacyBook.id,
            number: ch.chapterNumber,
          },
        });

        if (!legacyChapter) {
          legacyChapter = await prisma.chapter.create({
            data: {
              bookId: legacyBook.id,
              number: ch.chapterNumber,
              title: ch.title,
            },
          });
        }

        let currChapter = await prisma.curriculumChapter.findFirst({
          where: {
            textbookId: textbook.id,
            chapterNumber: ch.chapterNumber,
          },
        });

        if (currChapter) {
          currChapter = await prisma.curriculumChapter.update({
            where: { id: currChapter.id },
            data: {
              title: ch.title,
              documentId: defaultMarksSchemeDocId,
              unitNumber: ch.unitNumber,
              unitTitle: ch.unitTitle,
              isDeleted: ch.isDeleted || false,
              officialMarks: ch.officialMarks,
              provenancePage: ch.provenancePage,
              legacyChapterId: legacyChapter.id,
            },
          });
        } else {
          currChapter = await prisma.curriculumChapter.create({
            data: {
              textbookId: textbook.id,
              documentId: defaultMarksSchemeDocId,
              unitNumber: ch.unitNumber,
              unitTitle: ch.unitTitle,
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              isDeleted: ch.isDeleted || false,
              officialMarks: ch.officialMarks,
              provenancePage: ch.provenancePage,
              legacyChapterId: legacyChapter.id,
            },
          });
        }
        totalChaptersCreated++;

        // Add or update topic outline
        const existingTopic = await prisma.curriculumTopic.findFirst({
          where: {
            chapterId: currChapter.id,
            sortOrder: 1,
          },
        });

        if (existingTopic) {
          await prisma.curriculumTopic.update({
            where: { id: existingTopic.id },
            data: {
              title: `${ch.title} - Core Competency Unit`,
              isExcluded: ch.isDeleted || false,
              competencies: toJson([
                { code: "KNOWLEDGE", description: "Direct conceptual and formula recall" },
                { code: "UNDERSTANDING", description: "Application, reasoning, and standard derivation" },
              ]),
            },
          });
        } else {
          await prisma.curriculumTopic.create({
            data: {
              chapterId: currChapter.id,
              title: `${ch.title} - Core Competency Unit`,
              isExcluded: ch.isDeleted || false,
              sortOrder: 1,
              competencies: toJson([
                { code: "KNOWLEDGE", description: "Direct conceptual and formula recall" },
                { code: "UNDERSTANDING", description: "Application, reasoning, and standard derivation" },
              ]),
            },
          });
        }
      }
    }

    // Marks Scheme
    const existingMarksScheme = await prisma.curriculumMarksScheme.findFirst({
      where: {
        subjectId: subject.id,
        academicSession: "2026-27",
      },
    });

    const marksSchemeData = {
      subjectId: subject.id,
      documentId: defaultMarksSchemeDocId,
      academicSession: "2026-27",
      totalTheory: s.theoryMarks,
      totalPractical: s.practicalMarks,
      totalProject: s.projectMarks,
      verificationPage: 1,
      unitBreakdown: s.unitBreakdown
        ? toJson(s.unitBreakdown)
        : toJson([
            {
              title: "Board Prescribed Marks Distribution Scheme 2026–27",
              officialMarks: s.theoryMarks,
            },
          ]),
      practicalRubric: s.hasPracticals
        ? toJson({
            majorExperiment: 18,
            projectWork: 3,
            recordFile: 4,
            vivaVoce: 5,
            total: s.practicalMarks,
          })
        : toJson({
            workbook: 5,
            quarterlyProject: 5,
            halfYearlyProject: 5,
            annualProject: 5,
            total: s.projectMarks,
          }),
    };

    if (existingMarksScheme) {
      await prisma.curriculumMarksScheme.update({
        where: { id: existingMarksScheme.id },
        data: marksSchemeData,
      });
    } else {
      await prisma.curriculumMarksScheme.create({
        data: marksSchemeData,
      });
    }

    // Blueprint Template
    let sectionsJson: unknown = [];
    if (s.archetype === "STANDARD_23Q_75M") {
      sectionsJson = generateStandard23Q75MSections();
    } else if (s.archetype === "SCIENCE_20Q_70M") {
      sectionsJson = generateScience20Q70MSections();
    } else if (s.archetype === "STANDARD_23Q_80M") {
      sectionsJson = generateStandard23Q80MSections();
    } else if (s.archetype === "ENGLISH_16Q_75M") {
      sectionsJson = generateEnglish16Q75MSections();
    } else if (s.archetype === "ENGLISH_15Q_80M") {
      sectionsJson = generateEnglish15Q80MSections();
    }

    const templateCode = `mpbse-${s.classLevel}th-${s.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${s.code}-${s.theoryMarks}m`;
    await prisma.curriculumBlueprintTemplate.upsert({
      where: { templateCode },
      update: {
        title: `MPBSE Class ${s.classLevel} ${s.name} Official Blueprint (${s.theoryMarks} Marks)`,
        durationMin: 180,
        totalMarks: s.theoryMarks,
        archetype: s.archetype,
        sectionsJson: toJson(sectionsJson),
      },
      create: {
        subjectId: subject.id,
        documentId: defaultMarksSchemeDocId,
        templateCode,
        title: `MPBSE Class ${s.classLevel} ${s.name} Official Blueprint (${s.theoryMarks} Marks)`,
        academicSession: "2026-27",
        durationMin: 180,
        totalMarks: s.theoryMarks,
        archetype: s.archetype,
        sectionsJson: toJson(sectionsJson),
      },
    });
    totalBlueprintsCreated++;

    console.log(`  ✓ Class ${s.classLevel} Subject: ${s.name} (${s.code}) - ${s.theoryMarks}m [${s.archetype}]`);
  }

  console.log("================================================================================");
  console.log(`🎉 MPBSE CURRICULUM SEED COMPLETE!`);
  console.log(`- Total Subjects: ${subjectsSeed.length}`);
  console.log(`- Total Textbooks: ${totalTextbooksCreated}`);
  console.log(`- Total Chapters: ${totalChaptersCreated}`);
  console.log(`- Total Blueprint Templates: ${totalBlueprintsCreated}`);
  console.log(`- Legacy Books Linked: ${totalLegacyBooksLinked}`);
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
