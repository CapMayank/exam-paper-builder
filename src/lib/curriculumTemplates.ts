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
  subjectCode?: string;
  sections: BlueprintTemplateSectionGroup[];
}

export const STANDARD_BLUEPRINT_TEMPLATES: BlueprintTemplate[] = [
  {
    id: "mpbse-sanskrit-10th-75m",
    title: "MPBSE संस्कृतम् कक्षा 10 (75 अङ्काः - आधिकारिक 23-प्रश्नीय प्रतिरूप)",
    description: "म.प्र. माध्यमिक शिक्षा मण्डल (MPBSE) द्वारा शैक्षणिक सत्र 2026–27 के लिए जारी आधिकारिक अभ्यास मॉडल प्रश्नपत्र अनुसार 23-प्रश्नीय, 75-अङ्कीय पूर्ण संरचना (कोड 512, शेमुषी भाग-2 एवं व्याकरणवीथि)।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    language: "sa",
    subjectCode: "512",
    sections: [
      {
        title: "प्रश्न 1: उचितविकल्पं चित्वा लिखत (बहुविकल्प)",
        instructions: "उचितविकल्पं चित्वा लिखत (शब्दरूप, विभक्ति, अव्यय, वचन, पुरुष) [प्रश्नक्रमाङ्कः 1]:",
        questionTypes: [
          { type: "MCQ", count: 6, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 2: शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत",
        instructions: "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत (लकार, पुरुष, वचन, उपसर्ग) [प्रश्नक्रमाङ्कः 2]:",
        questionTypes: [
          { type: "TRUE_FALSE", count: 6, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 3: उचितयुग्ममेलनं कुरुत",
        instructions: "स्तम्भ 'अ' सह स्तम्भ 'ब' इत्यस्य समुचितं मेलनं कुरुत (सन्धि एवं समास) [प्रश्नक्रमाङ्कः 3]:",
        questionTypes: [
          { type: "MATCH_COLUMN", count: 6, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 4: एकपदेन उत्तरं लिखत",
        instructions: "एकपदेन उत्तरं संस्कृतभाषया लिखत (प्रत्यय एवं पाठ्यसूक्तयः) [प्रश्नक्रमाङ्कः 4]:",
        questionTypes: [
          { type: "VERY_SHORT", count: 6, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 5: प्रदत्तशब्दैः रिक्तस्थानपूर्तिं कुरुत",
        instructions: "कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत (पर्यायवाची, विलोम, विशेषण-विशेष्य) [प्रश्नक्रमाङ्कः 5]:",
        questionTypes: [
          { type: "FILL_BLANK", count: 6, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 6 तः 10: पाठ्याधारित-लघूत्तरीयप्रश्नाः",
        instructions: "अधोलिखितानां पञ्चप्रश्नानाम् उत्तराणि संस्कृतभाषया पूर्णवाक्येन लिखत (प्रश्नक्रमाङ्कः 6 तः 10 पर्यन्तम्):",
        questionTypes: [
          { type: "SHORT", count: 5, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 11: श्लोकलेखनम् (सुभाषितम्)",
        instructions: "स्वपाठ्यपुस्तकस्य एकं सुभाषितं लिखत यत् अस्मिन् प्रश्नपत्रे न स्यात् (प्रश्नक्रमाङ्कः 11):",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 12: घटनाक्रमानुसारं कथाक्रमसंयोजनम्",
        instructions: "अधोलिखितानि चत्वारि वाक्यानि कथाक्रमानुसारेण योजयत (½ × 4 = 2) [प्रश्नक्रमाङ्कः 12]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 13: रेखांकितपदानाम् आधारेण प्रश्ननिर्माणम्",
        instructions: "स्थूलाक्षरपदानि आधृत्य चतुर्णां वाक्यानां प्रश्ननिर्माणं कुरुत (½ × 4 = 2) [प्रश्नक्रमाङ्कः 13]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 14: कः कं प्रति कथयति",
        instructions: "अधोलिखितानि वाक्यानि कः कं प्रति कथयति इति लिखत (1 × 2 = 2) [प्रश्नक्रमाङ्कः 14]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 15: अशुद्धकारक-वाक्यसंशोधनम्",
        instructions: "अधोलिखितयोः द्वयोः अशुद्धकारकवाक्ययोः शुद्धिं कुरुत (1 × 2 = 2) [प्रश्नक्रमाङ्कः 15]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 16: पाठ्याधारित-रिक्तस्थानपूर्तिः",
        instructions: "अधोलिखितानि चत्वारि रिक्तस्थानानि पाठ्याधारेण पूरयत (½ × 4 = 2) [प्रश्नक्रमाङ्कः 16]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 17: वाच्य-परिवर्तनम्",
        instructions: "निर्देशानुसारं द्वयोः वाक्ययोः वाच्यपरिवर्तनं कुरुत (1 × 2 = 2) [प्रश्नक्रमाङ्कः 17]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 18: गद्यांश-आधारित-प्रश्नाः",
        instructions: "अधोलिखितं गद्यांशं पठित्वा प्रश्नानाम् उत्तराणि संस्कृतभाषया लिखत (स-विकल्पम्, 1 × 3 = 3) [प्रश्नक्रमाङ्कः 18]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 3, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 19: पद्यांश-आधारित-प्रश्नाः",
        instructions: "अधोलिखितं पद्यांशं पठित्वा प्रश्नानाम् उत्तराणि संस्कृतभाषया लिखत (स-विकल्पम्, 1 × 3 = 3) [प्रश्नक्रमाङ्कः 19]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 3, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 20: नाट्यांश-आधारित-प्रश्नाः",
        instructions: "अधोलिखितं नाट्यांशं पठित्वा प्रश्नानाम् उत्तराणि संस्कृतभाषया लिखत (स-विकल्पम्, 1 × 3 = 3) [प्रश्नक्रमाङ्कः 20]:",
        questionTypes: [
          { type: "SHORT", count: 1, marksEach: 3, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 21: अपठित-गद्यांश-अवबोधनम्",
        instructions: "अपठितं गद्यांशं पठित्वा पञ्चप्रश्नेषु केषाञ्चित् चतुर्णां प्रश्नानाम् उत्तराणि लिखत (1 × 4 = 4) [प्रश्नक्रमाङ्कः 21]:",
        questionTypes: [
          { type: "LONG", count: 1, marksEach: 4, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 22: पत्रलेखनम् / प्रार्थनापत्रम्",
        instructions: "स्वविवाहस्य कृते मित्राय निमन्त्रणपत्रं अथवा स्थानान्तरणप्रमाणपत्रार्थं प्राचार्यं प्रति प्रार्थनापत्रं लिखत (4 अङ्काः) [प्रश्नक्रमाङ्कः 22]:",
        questionTypes: [
          { type: "LONG", count: 1, marksEach: 4, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "प्रश्न 23: संस्कृत-निबन्ध-लेखनम्",
        instructions: "अधोलिखितेषु एकं विषयं चित्वा शतशब्देषु संस्कृतनिबन्धं लिखत (4 अङ्काः) [प्रश्नक्रमाङ्कः 23]: (1) मम प्रियः कविः, (2) आचारस्य महत्त्वम्, (3) अस्माकं देशः, (4) देववाण्याः महत्त्वम्",
        questionTypes: [
          { type: "LONG", count: 1, marksEach: 4, orChoiceMode: "NOT_REQUIRED" },
        ],
      },
    ],
  },
  {
    id: "mpbse-sanskrit-10th-legacy-75m",
    title: "MPBSE संस्कृतम् कक्षा 10 (75 अङ्काः - पारम्परिक 8-खण्डीय प्रतिरूप)",
    description: "पारम्परिक 8-खण्डीय संरचना (खण्ड क तः ज पर्यन्तम्) - बहुविकल्प, रिक्तस्थान, शुद्ध-अशुद्ध, मेलन, लघूत्तरीय एवं दीर्घप्रश्नाः।",
    examType: "ANNUAL",
    durationMin: 180,
    totalMarks: 75,
    targetClasses: "Class 10",
    language: "sa",
    subjectCode: "512",
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
          { type: "MATCH_COLUMN", count: 1, marksEach: 6 },
        ],
      },
      {
        title: "खण्डः 'ङ' : एकपदेन उत्तरत",
        instructions: "एकपदेन/वाक्येन संस्कृतभाषया उत्तरं लिखत (प्रश्नक्रमाङ्कः 5):",
        questionTypes: [
          { type: "VERY_SHORT", count: 6, marksEach: 1 },
        ],
      },
      {
        title: "खण्डः 'च' : लघूत्तरीयप्रश्नाः",
        instructions: "अधोलिखितानां प्रश्नानाम् उत्तराणि संस्कृतभाषया लिखत (प्रत्येकं 2 अङ्कौ):",
        questionTypes: [
          { type: "SHORT", count: 12, marksEach: 2 },
        ],
      },
      {
        title: "खण्डः 'छ' : पाठाधारित-अवबोधनम्",
        instructions: "गद्यांश-पद्यांश-नाट्यांशान् पठित्वा प्रश्नानाम् उत्तराणि लिखत (स-विकल्पम्, प्रत्येकं 3 अङ्काः):",
        questionTypes: [
          { type: "SHORT", count: 3, marksEach: 3, orChoiceMode: "REQUIRED" },
        ],
      },
      {
        title: "खण्डः 'ज' : दीर्घावबोधनम् एवं रचनात्मककार्यम्",
        instructions: "अपठितगद्यांश, पत्रलेखनम् एवं निबन्धलेखनम् (प्रत्येकं 4 अङ्काः):",
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
