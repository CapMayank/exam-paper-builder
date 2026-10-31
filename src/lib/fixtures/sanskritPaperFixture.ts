import type { QuestionDto } from "../dto";
import type { PaperData, BlueprintData } from "../types";

/**
 * Permanent regression fixture representing the audited Class 10 Sanskrit Paper
 * (Sarvodaya English Higher Secondary School, Lakhnadon; Code 122; 75 Marks; 33 Questions).
 *
 * Metrics:
 * - Numbered parent questions: 33
 * - Blueprint allocation units: 48 (6+6+6+6+6+12+3+3)
 * - Atomic response tasks: 48
 * - Maximum marks: 75
 */
export const SANSKRIT_CLASS10_BLUEPRINT: BlueprintData = {
  id: "bp_sanskrit_10th_75m_fixture",
  name: "MPBSE Class 10 Sanskrit Annual Board Pattern (75 Marks)",
  bookId: "book_sanskrit_10",
  academicSession: "2026–27",
  examType: "ANNUAL",
  durationMin: 180,
  subjectCode: "122",
  language: "sa",
  book: {
    id: "book_sanskrit_10",
    title: "शेमुषी भाग-2",
    subject: "Sanskrit",
    className: "Class 10",
  },
  _count: { papers: 1 },
  chapters: [
    { chapterId: "ch_1", marks: 8, chapter: { id: "ch_1", number: 1, title: "शुचिपर्यावरणम्" } },
    { chapterId: "ch_2", marks: 8, chapter: { id: "ch_2", number: 2, title: "बुद्धिर्बलवती सदा" } },
    { chapterId: "ch_3", marks: 7, chapter: { id: "ch_3", number: 3, title: "व्यायामः सर्वदा पथ्यः" } },
    { chapterId: "ch_4", marks: 8, chapter: { id: "ch_4", number: 4, title: "शिशुलालनम्" } },
    { chapterId: "ch_5", marks: 8, chapter: { id: "ch_5", number: 5, title: "जननी तुल्यवत्सला" } },
    { chapterId: "ch_6", marks: 7, chapter: { id: "ch_6", number: 6, title: "सुभाषितानि" } },
    { chapterId: "ch_7", marks: 7, chapter: { id: "ch_7", number: 7, title: "सौहार्दं प्रकृतेः शोभा" } },
    { chapterId: "ch_8", marks: 7, chapter: { id: "ch_8", number: 8, title: "विचित्रः साक्षी" } },
    { chapterId: "ch_9", marks: 7, chapter: { id: "ch_9", number: 9, title: "सूक्तयः" } },
    { chapterId: "ch_10", marks: 8, chapter: { id: "ch_10", number: 10, title: "प्राणेभ्योऽपि प्रियः सुहृद्" } },
  ],
  sections: [
    {
      id: "sec_a_mcq",
      position: 0,
      title: "खण्डः 'क' : बहुविकल्पीयप्रश्नाः",
      instructions: "उचितविकल्पं चित्वा लिखत।",
      type: "MCQ",
      count: 6,
      marksEach: 1,
    },
    {
      id: "sec_b_fill",
      position: 1,
      title: "खण्डः 'ख' : रिक्तस्थानपूर्तिः",
      instructions: "रिक्तस्थानानि पूरयत।",
      type: "FILL_BLANK",
      count: 6,
      marksEach: 1,
    },
    {
      id: "sec_c_tf",
      position: 2,
      title: "खण्डः 'ग' : सत्यासत्यनिरूपणम्",
      instructions: "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं च 'न' लिखत।",
      type: "TRUE_FALSE",
      count: 6,
      marksEach: 1,
    },
    {
      id: "sec_d_match",
      position: 3,
      title: "खण्डः 'घ' : उचितयुग्ममेलनम्",
      instructions: "उचितयुग्मं मेलयत (स्तम्भ 'अ' सह स्तम्भ 'ब'):",
      type: "MATCH_COLUMN",
      count: 6,
      marksEach: 1,
    },
    {
      id: "sec_e_vshort",
      position: 4,
      title: "खण्डः 'ङ' : एकपदेन उत्तराणि",
      instructions: "प्रश्नानाम् उत्तराणि एकपदेन लिखत।",
      type: "VERY_SHORT",
      count: 6,
      marksEach: 1,
    },
    {
      id: "sec_f_short",
      position: 5,
      title: "खण्डः 'च' : लघूत्तरीयप्रश्नाः",
      instructions: "अधोलिखितानां प्रश्नानाम् उत्तराणि पूर्णवाक्येन लिखत।",
      type: "SHORT",
      count: 12,
      marksEach: 2,
    },
    {
      id: "sec_g_passage",
      position: 6,
      title: "खण्डः 'छ' : पाठ्यांश-अवबोधनम्",
      instructions: "पद्यांशस्य गद्यांशस्य वा हिन्दीभाषया अनुवादं कुरुत / अवबोधनप्रश्नानाम् उत्तराणि लिखत।",
      type: "SHORT",
      count: 3,
      marksEach: 3,
      orChoiceMode: "REQUIRED",
    },
    {
      id: "sec_h_long",
      position: 7,
      title: "खण्डः 'ज' : दीर्घोत्तरीय-रचनात्मककार्यम्",
      instructions: "अपठितगद्यांशस्य, पत्रलेखनस्य, निबन्धलेखनस्य च उत्तराणि लिखत।",
      type: "LONG",
      count: 3,
      marksEach: 4,
      orChoiceMode: "REQUIRED",
    },
  ],
};

function makeFixtureQuestion(q: any): QuestionDto {
  return {
    id: q.id,
    bookId: q.bookId || "bk_sanskrit_10th",
    chapterId: q.chapterId || "ch_sanskrit_1",
    type: q.type,
    text: q.text,
    options: Array.isArray(q.options) ? q.options : [],
    optionsJson: q.optionsJson || JSON.stringify(q.options || []),
    answer: q.answer || "",
    difficulty: q.difficulty || "MEDIUM",
    marks: q.marks,
    imagePath: q.imagePath || null,
    spaceMm: q.spaceMm || 0,
    showGrid: Boolean(q.showGrid),
    createdAt: q.createdAt || "2026-10-31T00:00:00.000Z",
    attemptCount: q.attemptCount,
    subparts: Array.isArray(q.subparts) ? q.subparts : [],
    subpartsJson: q.subpartsJson || (q.subparts ? JSON.stringify(q.subparts) : "[]"),
  };
}

const RAW_SANSKRIT_ITEMS: any[] = [
    // Section क: 6 MCQs (Q1 to Q6)
    {
      id: "it_1",
      sectionId: "sec_a_mcq",
      position: 0,
      question: {
        id: "q_1",
        type: "MCQ",
        text: "प्रस्तुतपाठे 'प्राणेभ्योऽपि प्रियः सुहृद्' इत्यत्र कः स्वस्य सुहृदः कृते प्राणानामपि त्यागं कर्तुं तत्परः भवति?",
        options: ["चन्दनदासः", "चाणक्यः", "अमात्यराक्षसः", "चन्द्रगुप्तः"],
        optionsJson: JSON.stringify(["चन्दनदासः", "चाणक्यः", "अमात्यराक्षसः", "चन्द्रगुप्तः"]),
        answer: "चन्दनदासः",
        marks: 1,
      },
    },
    {
      id: "it_2",
      sectionId: "sec_a_mcq",
      position: 1,
      question: {
        id: "q_2",
        type: "MCQ",
        text: "अन्योक्तिपाठस्य पद्येषु कस्य स्वभावस्य वर्णनं मुख्यतया कृतम् अस्ति?",
        options: ["सज्जनानां दुर्जनानाञ्च", "केवलपशूनाम्", "नृपाणाम् एव", "वृक्षाणाम् एव"],
        optionsJson: JSON.stringify(["सज्जनानां दुर्जनानाञ्च", "केवलपशूनाम्", "नृपाणाम् एव", "वृक्षाणाम् एव"]),
        answer: "सज्जनानां दुर्जनानाञ्च",
        marks: 1,
      },
    },
    {
      id: "it_3",
      sectionId: "sec_a_mcq",
      position: 2,
      question: {
        id: "q_3",
        type: "MCQ",
        text: "कविः हरिदत्तशर्मा कस्मात् कारणात् महानगरस्य जीवनम् अतीव दुष्करं मन्यते?",
        options: ["प्रदूषणस्य आधिक्यात्", "जनानाम् आधिक्यात्", "धनस्य अभावात्", "वृक्षाणां वृद्धेः"],
        optionsJson: JSON.stringify(["प्रदूषणस्य आधिक्यात्", "जनानाम् आधिक्यात्", "धनस्य अभावात्", "वृक्षाणां वृद्धेः"]),
        answer: "प्रदूषणस्य आधिक्यात्",
        marks: 1,
      },
    },
    {
      id: "it_4",
      sectionId: "sec_a_mcq",
      position: 3,
      question: {
        id: "q_4",
        type: "MCQ",
        text: "बुद्धिर्बलवती सदा इत्यस्मिन् पाठे बुद्धिमती पुत्रद्वयोपेता कुत्र गच्छन्ती आसीत्?",
        options: ["पितुर्गृहम्", "श्वशुरगृहम्", "वनम्", "नगरम्"],
        optionsJson: JSON.stringify(["पितुर्गृहम्", "श्वशुरगृहम्", "वनम्", "नगरम्"]),
        answer: "पितुर्गृहम्",
        marks: 1,
      },
    },
    {
      id: "it_5",
      sectionId: "sec_a_mcq",
      position: 4,
      question: {
        id: "q_5",
        type: "MCQ",
        text: "शिशुलालनम् पाठे रामः स्वस्य सिंहासने उपवेष्टुं कौ बालकौ आकृष्टवान्?",
        options: ["लवकुशौ", "भरतशत्रुघ्नौ", "सुग्रीवविभीषणौ", "युधिष्ठिरभीमसेनौ"],
        optionsJson: JSON.stringify(["लवकुशौ", "भरतशत्रुघ्नौ", "सुग्रीवविभीषणौ", "युधिष्ठिरभीमसेनौ"]),
        answer: "लवकुशौ",
        marks: 1,
      },
    },
    {
      id: "it_6",
      sectionId: "sec_a_mcq",
      position: 5,
      question: {
        id: "q_6",
        type: "MCQ",
        text: "जननी तुल्यवत्सला पाठे सुरभिः किं दृष्ट्वा अश्रूणि मुञ्चति स्म?",
        options: ["स्वपुत्रस्य दुर्बलतां कृषिकर्मकष्टञ्च", "वृष्टिम्", "सिंहस्य आक्रमणम्", "नगरस्य जनसमूहम्"],
        optionsJson: JSON.stringify(["स्वपुत्रस्य दुर्बलतां कृषिकर्मकष्टञ्च", "वृष्टिम्", "सिंहस्य आक्रमणम्", "नगरस्य जनसमूहम्"]),
        answer: "स्वपुत्रस्य दुर्बलतां कृषिकर्मकष्टञ्च",
        marks: 1,
      },
    },

    // Section ख: 6 Fill in blanks under Q7 (a to f)
    {
      id: "it_7",
      sectionId: "sec_b_fill",
      position: 6,
      question: {
        id: "q_7",
        type: "FILL_BLANK",
        text: "चाणक्यः चन्द्रगुप्तस्य राज्ये ________ मन्त्रिणं विना स्थातुं न शक्नोति इति विचिन्त्य राक्षसस्य अन्वेषणं करोति।",
        answer: "योग्यम्",
        marks: 1,
      },
    },
    {
      id: "it_8",
      sectionId: "sec_b_fill",
      position: 7,
      question: {
        id: "q_8",
        type: "FILL_BLANK",
        text: "अन्योक्तिपाठस्य पद्येषु प्रकृतिमाध्यमेन मानवानाम् ________ उपदेशः प्रदीयते।",
        answer: "सद्गुणानाम्",
        marks: 1,
      },
    },
    {
      id: "it_9",
      sectionId: "sec_b_fill",
      position: 8,
      question: {
        id: "q_9",
        type: "FILL_BLANK",
        text: "अपठितगद्यांशस्य पठनेन छात्राणां ________ कौशलस्य विकासः भवति।",
        answer: "अवबोधन",
        marks: 1,
      },
    },
    {
      id: "it_10",
      sectionId: "sec_b_fill",
      position: 9,
      question: {
        id: "q_10",
        type: "FILL_BLANK",
        text: "पत्रलेखने भवदीयः, आज्ञाकारी इति पदम् आवेदनपत्रस्य ________ भागे लिख्यते।",
        answer: "अन्तिम",
        marks: 1,
      },
    },
    {
      id: "it_11",
      sectionId: "sec_b_fill",
      position: 10,
      question: {
        id: "q_11",
        type: "FILL_BLANK",
        text: "पितृ शब्दस्य सप्तमी विभक्ति एकवचने ________ रूपं भवति।",
        answer: "पितरि",
        marks: 1,
      },
    },
    {
      id: "it_12",
      sectionId: "sec_b_fill",
      position: 11,
      question: {
        id: "q_12",
        type: "FILL_BLANK",
        text: "शुचिपर्यावरणम् इत्यस्मिन् पाठे महानगरस्य शतशकटीयानं ________ मुञ्चति इति कविः वदति।",
        answer: "कज्जलमलम्",
        marks: 1,
      },
    },

    // Section ग: 6 True/False statements under Q8 (a to f)
    {
      id: "it_13",
      sectionId: "sec_c_tf",
      position: 12,
      question: {
        id: "q_13",
        type: "TRUE_FALSE",
        text: "बुद्धिमती व्याघ्रं दृष्ट्वा स्वपुत्रौ अवदत् यत् अयमेकः व्याघ्रः तावद् विभज्य भुज्यताम् इति।",
        answer: "आम्",
        marks: 1,
      },
    },
    {
      id: "it_14",
      sectionId: "sec_c_tf",
      position: 13,
      question: {
        id: "q_14",
        type: "TRUE_FALSE",
        text: "शिशुलालनम् पाठे कुशलवौ रामस्य सिंहासनमुपवेष्टुम् अनुज्ञां प्राप्नुतः।",
        answer: "आम्",
        marks: 1,
      },
    },
    {
      id: "it_15",
      sectionId: "sec_c_tf",
      position: 14,
      question: {
        id: "q_15",
        type: "TRUE_FALSE",
        text: "सुरभिः भूमौ पतिते दुर्बलं पुत्रं दृष्ट्वा शोकाकुला भूत्वा अश्रूणि मुञ्चति स्म।",
        answer: "आम्",
        marks: 1,
      },
    },
    {
      id: "it_16",
      sectionId: "sec_c_tf",
      position: 15,
      question: {
        id: "q_16",
        type: "TRUE_FALSE",
        text: "गुणी गुणं वेत्ति, न वेत्ति निर्गुणः; बली बलं वेत्ति, न वेत्ति निर्बलः।",
        answer: "आम्",
        marks: 1,
      },
    },
    {
      id: "it_17",
      sectionId: "sec_c_tf",
      position: 16,
      question: {
        id: "q_17",
        type: "TRUE_FALSE",
        text: "सौहार्दं प्रकृतेः शोभा इत्यस्मिन् नाटके सर्वे पशुपक्षिणः मिलित्वा वनराजस्य चयनं कर्तुम् आत्मानं योग्यं मन्यन्ते।",
        answer: "आम्",
        marks: 1,
      },
    },
    {
      id: "it_18",
      sectionId: "sec_c_tf",
      position: 17,
      question: {
        id: "q_18",
        type: "TRUE_FALSE",
        text: "विचित्रः साक्षी पाठे आरक्षी स्वयम् आसीत् यः अतिथिं चौरम् इति न्यायालये अभियोगम् अकरोत्।",
        answer: "आम्",
        marks: 1,
      },
    },

    // Section घ: 1 MATCH_COLUMN Question under Q9 with 6 pairs
    {
      id: "it_19",
      sectionId: "sec_d_match",
      position: 18,
      question: {
        id: "q_19",
        type: "MATCH_COLUMN",
        text: "अधोलिखितयोः स्तम्भयोः 'अ' तथा 'ब' इत्यनयोः उचितं मेलनं कुरुत:\nस्तम्भ 'अ':\n(A) नमस्ते\n(B) विद्यालयः\n(C) गच्छन्\n(D) पठितवान्\n(E) बालिका\n(F) लभते",
        options: [
          "नमस्ते ||| विसर्गसन्धिः",
          "विद्यालयः ||| दीर्घस्वरसन्धिः",
          "गच्छन् ||| शतृ-प्रत्ययः",
          "पठितवान् ||| क्तवतु-प्रत्ययः",
          "बालिका ||| टाप्-प्रत्ययः",
          "लभते ||| लट्लकारः (आत्मनेपदम्)",
        ],
        optionsJson: JSON.stringify([
          "नमस्ते ||| विसर्गसन्धिः",
          "विद्यालयः ||| दीर्घस्वरसन्धिः",
          "गच्छन् ||| शतृ-प्रत्ययः",
          "पठितवान् ||| क्तवतु-प्रत्ययः",
          "बालिका ||| टाप्-प्रत्ययः",
          "लभते ||| लट्लकारः (आत्मनेपदम्)",
        ]),
        answer: "(A)-(ii), (B)-(i), (C)-(iii), (D)-(iv), (E)-(v), (F)-(vi)",
        explanation: "नमस्ते = नमः + ते (विसर्गसन्धिः), विद्यालयः = विद्या + आलयः (दीर्घस्वरसन्धिः), गच्छन् = गम् + शतृ, पठितवान् = पठ् + क्तवतु, बालिका = बाल + टाप्, लभते = लभ् धातु लट् लकार",
        marks: 6,
      },
    },

    // Section ङ: 6 Very Short Questions (Q10 to Q15)
    {
      id: "it_20",
      sectionId: "sec_e_vshort",
      position: 19,
      question: {
        id: "q_20",
        type: "VERY_SHORT",
        text: "कस्य विचारं विना आचारेण सह जीवनं न कर्तव्यम्?",
        answer: "सत्पुरुषस्य",
        marks: 1,
      },
    },
    {
      id: "it_21",
      sectionId: "sec_e_vshort",
      position: 20,
      question: {
        id: "q_21",
        type: "VERY_SHORT",
        text: "मुद्राराक्षस-नाट्यांशे चन्दनदासस्य कः प्रियः सुहृद् आसीत्?",
        answer: "अमात्यराक्षसः",
        marks: 1,
      },
    },
    {
      id: "it_22",
      sectionId: "sec_e_vshort",
      position: 21,
      question: {
        id: "q_22",
        type: "VERY_SHORT",
        text: "अन्योक्तिपाठस्य पद्येषु कस्य स्वभावस्य मुख्यतया व्यङ्ग्यं कृतम् अस्ति?",
        answer: "दुर्जनानाम्",
        marks: 1,
      },
    },
    {
      id: "it_23",
      sectionId: "sec_e_vshort",
      position: 22,
      question: {
        id: "q_23",
        type: "VERY_SHORT",
        text: "अपठितगद्यांशस्य सम्यक् अवबोधनाय प्रथमं किं करणीयम्?",
        answer: "सावधानतया पठनम्",
        marks: 1,
      },
    },
    {
      id: "it_24",
      sectionId: "sec_e_vshort",
      position: 23,
      question: {
        id: "q_24",
        type: "VERY_SHORT",
        text: "अनौपचारिकपत्रलेखने स्वमित्रं प्रति सम्बोधनकाले किम् पदं प्रयुज्यते?",
        answer: "प्रिय मित्र",
        marks: 1,
      },
    },
    {
      id: "it_25",
      sectionId: "sec_e_vshort",
      position: 24,
      question: {
        id: "q_25",
        type: "VERY_SHORT",
        text: "इत्युक्तावित्यत्र कः सन्धिः अस्ति?",
        answer: "यण्-सन्धिः",
        marks: 1,
      },
    },

    // Section च: 12 Short Questions (Q16 to Q27)
    {
      id: "it_26",
      sectionId: "sec_f_short",
      position: 25,
      question: {
        id: "q_26",
        type: "SHORT",
        text: "केषां प्रकृतेः जनानां संसर्गः सज्जनैः सह न शोभते?",
        answer: "दुर्जनानां संसर्गः सज्जनैः सह न शोभते।",
        marks: 2,
      },
    },
    {
      id: "it_27",
      sectionId: "sec_f_short",
      position: 26,
      question: {
        id: "q_27",
        type: "SHORT",
        text: "वनराजस्य चयनसमये सर्वे पशुपक्षिणः कस्य विचारस्य विरोधं कुर्वन्ति?",
        answer: "सर्वे पशुपक्षिणः आत्मश्लाघिनः सिंहस्य विरोधं कुर्वन्ति।",
        marks: 2,
      },
    },
    {
      id: "it_28",
      sectionId: "sec_f_short",
      position: 27,
      question: {
        id: "q_28",
        type: "SHORT",
        text: "निर्दोषः जनः न्यायाधीशस्य सम्मुखे न्यायप्राप्त्यर्थं किम् अकरोत्?",
        answer: "सः स्वपक्षं न्यायाधीशाग्रतः प्रास्तौत्।",
        marks: 2,
      },
    },
    {
      id: "it_29",
      sectionId: "sec_f_short",
      position: 28,
      question: {
        id: "q_29",
        type: "SHORT",
        text: "किं सम्पन्नस्य मनुष्यस्य वचनानि सर्वैः आचर्यन्ते तथा च लोके कस्य वास्तविकं मूल्यं भवति?",
        answer: "सत्यनिष्ठस्य धर्मशीलस्य च मनुष्यस्य वचनानि आचर्यन्ते।",
        marks: 2,
      },
    },
    {
      id: "it_30",
      sectionId: "sec_f_short",
      position: 29,
      question: {
        id: "q_30",
        type: "SHORT",
        text: "चाणक्यस्य मते राज्यस्य हितरक्षणाय कस्य आवश्यकता अनिवार्या वर्तते?",
        answer: "चाणक्यस्य मते योग्यमन्त्रिणः राष्ट्रभक्तस्य च आवश्यकता अनिवार्या वर्तते।",
        marks: 2,
      },
    },
    {
      id: "it_31",
      sectionId: "sec_f_short",
      position: 30,
      question: {
        id: "q_31",
        type: "SHORT",
        text: "अन्योक्तिपाठे भ्रमरस्य माध्यमम् आश्रित्य केषां प्रकृतेः जनानां व्यङ्ग्यं कृतम् अस्ति?",
        answer: "गुणग्राहिणः सन्तं परित्यज्य इतस्ततः भ्रममाणानां जनानां व्यङ्ग्यं कृतम् अस्ति।",
        marks: 2,
      },
    },
    {
      id: "it_32",
      sectionId: "sec_f_short",
      position: 31,
      question: {
        id: "q_32",
        type: "SHORT",
        text: "अपठितगद्यांशस्य पठनोत्तरं छात्रैः लेखनसमये कानि मुख्यतया ध्यातव्यानि?",
        answer: "प्रश्नानाम् उत्तराणि सरलसंस्कृतभाषया शुद्धव्याकरणेन च लेखनीयानि।",
        marks: 2,
      },
    },
    {
      id: "it_33",
      sectionId: "sec_f_short",
      position: 32,
      question: {
        id: "q_33",
        type: "SHORT",
        text: "पत्रलेखनसमये प्रेषकस्य तथा प्राप्तुः विवरणेषु कानि शिष्टाचारपदानि प्रयुज्यन्ते?",
        answer: "आदरणीयाः, श्रीमन्तः, भवदीयाः इत्यादयः शिष्टाचारपदानि प्रयुज्यन्ते।",
        marks: 2,
      },
    },
    {
      id: "it_34",
      sectionId: "sec_f_short",
      position: 33,
      question: {
        id: "q_34",
        type: "SHORT",
        text: "विद्वान् नरः कुत्र गतः अपि सम्मानं प्राप्नोति तथा च कस्य भाषणं प्रभावी भवति?",
        answer: "विद्वान् सर्वत्र पूज्यते तथा च ज्ञानिनः भाषणं प्रभावी भवति।",
        marks: 2,
      },
    },
    {
      id: "it_35",
      sectionId: "sec_f_short",
      position: 34,
      question: {
        id: "q_35",
        type: "SHORT",
        text: "प्रकृतेः सौन्दर्यं रक्षितुम् अस्माभिः किं कर्तव्यम् इति पशुपक्षिणः वदन्ति?",
        answer: "वृक्षाणां रोपणं संरक्षणाञ्च करणीयम्।",
        marks: 2,
      },
    },
    {
      id: "it_36",
      sectionId: "sec_f_short",
      position: 35,
      question: {
        id: "q_36",
        type: "SHORT",
        text: "न्यायाधीशः बंकिमचन्द्रः उभयोः पक्षयोः प्रथमं विचारणं कथमकरोत्?",
        answer: "सः साक्ष्याणि परीक्ष्य निष्पक्षतया विचारणम् अकरोत्।",
        marks: 2,
      },
    },
    {
      id: "it_37",
      sectionId: "sec_f_short",
      position: 36,
      question: {
        id: "q_37",
        type: "SHORT",
        text: "कीदृशः मनुष्यः लोके वास्तविकार्थे जीवितः इति कथ्यते?",
        answer: "यः परोपकाराय धर्मरक्षणाय च जीवति, स एव वास्तवतः जीवितः।",
        marks: 2,
      },
    },

    // Section छ: 3 Passage Short Questions with complete OR choice objects (Q28 to Q30)
    {
      id: "it_38",
      sectionId: "sec_g_passage",
      position: 37,
      question: {
        id: "q_38",
        type: "SHORT",
        text: "बुद्धिमती पुत्रद्वयोपेता गहनकानने व्याघ्रं दृष्ट्वा कां युक्तिं प्रयुक्तवती इति सविस्तरं वर्णयत।",
        answer: "सा स्वपुत्रौ ताडयित्वा व्याघ्रभक्षणाय कलहं मा कुरुत इति व्याघ्रं भयभीतम् अकरोत्।",
        marks: 3,
      },
      orQuestion: {
        id: "q_38_or",
        type: "SHORT",
        text: "बुद्धिर्बलवती सदा इत्यस्मिन् पाठे बुद्धिमत्याः शौर्यस्य चातुर्यस्य च कः सन्देशः लोके प्रदीयते, तस्य सम्यक् मूल्याङ्कनं कुरुत।",
        answer: "संकटसमये बुद्धिचातुर्येण धैर्यं न त्यक्तव्यम् इति मुख्यः सन्देशः अस्ति।",
        marks: 3,
      },
    },
    {
      id: "it_39",
      sectionId: "sec_g_passage",
      position: 38,
      question: {
        id: "q_39",
        type: "SHORT",
        text: "शिशुलालनम् पाठस्य आधारेण कुशलवयोः रामस्य समक्षमवाप्तस्य परिचयस्य तथा च रामस्य वात्सल्यात्मकमनसो वर्णनं कुरुत।",
        answer: "रामः कुशलवयोः सौन्दर्यं दृष्ट्वा स्नेहेन स्वस्याङ्के उपवेशयति।",
        marks: 3,
      },
      orQuestion: {
        id: "q_39_or",
        type: "SHORT",
        text: "शिशुलालनम् पाठस्य संवादशैलीम् आधारीकृत्य रामस्य तथा विदूषकस्य मध्ये प्रवृत्तस्य संलापस्य सारांशं स्वभाषया लिखत।",
        answer: "विदूषकः रामस्य मनः विनोदयितुं मधुरान् संवादान् करोति।",
        marks: 3,
      },
    },
    {
      id: "it_40",
      sectionId: "sec_g_passage",
      position: 39,
      question: {
        id: "q_40",
        type: "SHORT",
        text: "जननी तुल्यवत्सला इत्यस्मिन् पाठे सुरभेः दयनीयां स्थितिं दृष्ट्वा इन्द्रस्य प्रवृत्तस्य संवादस्य तथा च तयोः मध्ये सम्भाषणस्य सविस्तरं वर्णनं कुरुत।",
        answer: "इन्द्रः सुरभिं पृच्छति - अयि शुभे! किमर्थमेवं रोदिषि? सुरभिः स्वपुत्रस्य पीडां वर्णयति।",
        marks: 3,
      },
      orQuestion: {
        id: "q_40_or",
        type: "SHORT",
        text: "जननी तुल्यवत्सला पाठस्य आधारेण लोके माता सर्वेषु पुत्रेषु समानस्नेहवती भवति चेदपि दुर्बले पुत्रे तस्याः आधिक्येन करुणा कथं प्रकटीभवति, तस्य विवेचनं कुरुत।",
        answer: "मातुः हृदये दुर्बले सन्ततौ स्वाभाविकी अधिका प्रीतिः भवति।",
        marks: 3,
      },
    },

    // Section ज: 3 Long Questions with complete OR choice objects and subparts (Q31 to Q33)
    {
      id: "it_41",
      sectionId: "sec_h_long",
      position: 40,
      question: {
        id: "q_41",
        type: "LONG",
        text: "अधोलिखितं पत्रं मञ्जूषायाः सहायतायाः पूरयित्वा पुनः लिखत - (अवकाशार्थं प्रधानाचार्यं प्रति आवेदनपत्रम्)",
        subparts: [
          { label: "(i)", text: "सम्बोधनपदं लिखत।", marks: 1 },
          { label: "(ii)", text: "आवेदनस्य विषयं स्पष्टीकुरुत।", marks: 1 },
          { label: "(iii)", text: "ज्वरपीडायाः विवरणं पूरयत।", marks: 1 },
          { label: "(iv)", text: "दिवसद्वयस्य अवकाशप्रार्थनां समापयत।", marks: 1 },
        ],
        subpartsJson: JSON.stringify([
          { label: "(i)", text: "सम्बोधनपदं लिखत।", marks: 1 },
          { label: "(ii)", text: "आवेदनस्य विषयं स्पष्टीकुरुत।", marks: 1 },
          { label: "(iii)", text: "ज्वरपीडायाः विवरणं पूरयत।", marks: 1 },
          { label: "(iv)", text: "दिवसद्वयस्य अवकाशप्रार्थनां समापयत।", marks: 1 },
        ]),
        answer: "सेवायाम्, श्रीमन्तः प्रधानाचार्याः...",
        marks: 4,
      },
      orQuestion: {
        id: "q_41_or",
        type: "LONG",
        text: "दत्तं चित्रं दृष्ट्वा मञ्जूषातः पदानि चित्वा संस्कृतभाषायां पञ्च वाक्यानि लिखत (चित्रवर्णनम् कुरुत)।",
        subparts: [
          { label: "(i)", text: "चित्रे कः दृश्यते?", marks: 1 },
          { label: "(ii)", text: "बालकाः किं कुर्वन्ति?", marks: 1 },
          { label: "(iii)", text: "खगाः कुत्र उत्पतन्ति?", marks: 1 },
          { label: "(iv)", text: "प्रकृतेः सौन्दर्यं कीदृशम् अस्ति?", marks: 1 },
        ],
        subpartsJson: JSON.stringify([
          { label: "(i)", text: "चित्रे कः दृश्यते?", marks: 1 },
          { label: "(ii)", text: "बालकाः किं कुर्वन्ति?", marks: 1 },
          { label: "(iii)", text: "खगाः कुत्र उत्पतन्ति?", marks: 1 },
          { label: "(iv)", text: "प्रकृतेः सौन्दर्यं कीदृशम् अस्ति?", marks: 1 },
        ]),
        answer: "चित्रे सुन्दरम् उद्यानम् अस्ति...",
        marks: 4,
      },
    },
    {
      id: "it_42",
      sectionId: "sec_h_long",
      position: 41,
      question: {
        id: "q_42",
        type: "LONG",
        text: "अधोलिखितं पद्यांशं पठित्वा प्रदत्तानां प्रश्नानाम् उत्तराणि संस्कृतभाषायां लिखत -\n'कज्जलमलं धूमं मुञ्चति शतशकटीयानम्, वाष्पयानमाला संधावति वितरन्ती ध्वनिम। यानानां पङ्क्तयो ह्यनन्ताः कठिनं संसरणम्, शुचिपर्यावरणम्॥'",
        subparts: [
          { label: "(i)", text: "शतशकटीयानं कीदृशं धूमं मुञ्चति?", marks: 1 },
          { label: "(ii)", text: "का संधावति वितरन्ती ध्वनिम्?", marks: 1 },
          { label: "(iii)", text: "मार्गेषु कानि अनन्तानि सन्ति?", marks: 1 },
          { label: "(iv)", text: "कस्मिन् विषये कठिनं संसरणम् अस्ति?", marks: 1 },
        ],
        subpartsJson: JSON.stringify([
          { label: "(i)", text: "शतशकटीयानं कीदृशं धूमं मुञ्चति?", marks: 1 },
          { label: "(ii)", text: "का संधावति वितरन्ती ध्वनिम्?", marks: 1 },
          { label: "(iii)", text: "मार्गेषु कानि अनन्तानि सन्ति?", marks: 1 },
          { label: "(iv)", text: "कस्मिन् विषये कठिनं संसरणम् अस्ति?", marks: 1 },
        ]),
        answer: "(i) कज्जलमलम् (ii) वाष्पयानमाला (iii) यानानां पङ्क्तयः (iv) नगरेषु",
        marks: 4,
      },
      orQuestion: {
        id: "q_42_or",
        type: "LONG",
        text: "अधोलिखितं पद्यांशं पठित्वा प्रश्नानाम् उत्तराणि लिखत -\n'वायुमण्डलम् भृशं दूषितं नास्ति निर्मलं जलम्, कुत्सितवस्तुमिश्रितं भक्ष्यं समलं धरातलम्। करणीयम् बहिरन्तरजगती तु बहुशुद्धीकरणम्, शुचिपर्यावरणम्॥'",
        subparts: [
          { label: "(i)", text: "किम् भृशं दूषितं वर्तते?", marks: 1 },
          { label: "(ii)", text: "किं निर्मलं नास्ति?", marks: 1 },
          { label: "(iii)", text: "भक्ष्यं कीदृशं संजातम्?", marks: 1 },
          { label: "(iv)", text: "जगति किम् करणीयम्?", marks: 1 },
        ],
        subpartsJson: JSON.stringify([
          { label: "(i)", text: "किम् भृशं दूषितं वर्तते?", marks: 1 },
          { label: "(ii)", text: "किं निर्मलं नास्ति?", marks: 1 },
          { label: "(iii)", text: "भक्ष्यं कीदृशं संजातम्?", marks: 1 },
          { label: "(iv)", text: "जगति किम् करणीयम्?", marks: 1 },
        ]),
        answer: "(i) वायुमण्डलम् (ii) जलम् (iii) कुत्सितवस्तुमिश्रितम् (iv) बहुशुद्धीकरणम्",
        marks: 4,
      },
    },
    {
      id: "it_43",
      sectionId: "sec_h_long",
      position: 42,
      question: {
        id: "q_43",
        type: "LONG",
        text: "अधोलिखितं व्याकरणपरकपरिच्छेदं पठित्वा प्रदत्तानाम् व्याकरणप्रश्नानाम् उत्तराणि लिखत -\n'संसारे सर्वे जनाः सुखमिच्छन्ति। यः मानवः सत्यं वदति, सः सदा सुखं प्राप्नोति। बालकेन पादैः क्रीड्यते। नदी पर्वतात् प्रभवति।'",
        subparts: [
          { label: "(i)", text: "'सुखमिच्छन्ति' इत्यत्र कः सन्धिः अस्ति तथा च कः नियमः प्रयुक्तः?", marks: 1 },
          { label: "(ii)", text: "'बालकेन पादैः क्रीड्यते' अस्मिन् वाक्ये 'पादैः' पदे का विभक्तिः कञ्च वचनं वर्तते?", marks: 1 },
          { label: "(iii)", text: "'नदी पर्वतात् प्रभवति' अत्र 'पर्वतात्' पदे का विभक्तिः प्रयुक्ता? कश्च हेतुः?", marks: 1 },
          { label: "(iv)", text: "'प्राप्नोति' क्रियापदे कः धातुः, कश्च लकारः पुरुषः वचनञ्च अस्ति?", marks: 1 },
        ],
        subpartsJson: JSON.stringify([
          { label: "(i)", text: "'सुखमिच्छन्ति' इत्यत्र कः सन्धिः अस्ति तथा च कः नियमः प्रयुक्तः?", marks: 1 },
          { label: "(ii)", text: "'बालकेन पादैः क्रीड्यते' अस्मिन् वाक्ये 'पादैः' पदे का विभक्तिः कञ्च वचनं वर्तते?", marks: 1 },
          { label: "(iii)", text: "'नदी पर्वतात् प्रभवति' अत्र 'पर्वतात्' पदे का विभक्तिः प्रयुक्ता? कश्च हेतुः?", marks: 1 },
          { label: "(iv)", text: "'प्राप्नोति' क्रियापदे कः धातुः, कश्च लकारः पुरुषः वचनञ्च अस्ति?", marks: 1 },
        ]),
        answer: "(i) स्वरसन्धिः (ii) तृतीया बहुवचनम् (iii) पञ्चमी (iv) प्र + आप् धातु लट् प्रथमपुरुष एकवचनम्",
        marks: 4,
      },
      orQuestion: {
        id: "q_43_or",
        type: "LONG",
        text: "अधोलिखितं प्रत्यय-उपसर्ग-युक्तं गद्यांशं पठित्वा तदाधारितप्रश्नानाम् उत्तराणि लिखत -\n'विद्वान् जनः पूज्यते। गत्वा सः कार्यं कृतवान्। प्रकृष्टः ज्ञानवान् च आचार्यः छात्रौ पाठयति।'",
        subparts: [
          { label: "(i)", text: "'विद्वान्' पदे कः प्रत्ययः प्रयुक्तः?", marks: 1 },
          { label: "(ii)", text: "'गत्वा' पदे कः प्रत्ययः अस्ति?", marks: 1 },
          { label: "(iii)", text: "'कृतवान्' पदे कः प्रत्ययः अस्ति?", marks: 1 },
          { label: "(iv)", text: "'प्रकृष्टः' पदे कः उपसर्गः प्रयुक्तः?", marks: 1 },
        ],
        subpartsJson: JSON.stringify([
          { label: "(i)", text: "'विद्वान्' पदे कः प्रत्ययः प्रयुक्तः?", marks: 1 },
          { label: "(ii)", text: "'गत्वा' पदे कः प्रत्ययः अस्ति?", marks: 1 },
          { label: "(iii)", text: "'कृतवान्' पदे कः प्रत्ययः अस्ति?", marks: 1 },
          { label: "(iv)", text: "'प्रकृष्टः' पदे कः उपसर्गः प्रयुक्तः?", marks: 1 },
        ]),
        answer: "(i) वसु (ii) क्त्वा (iii) क्तवतु (iv) प्र",
        marks: 4,
      },
    },
];

export const SANSKRIT_CLASS10_PAPER: PaperData = {
  id: "paper_sanskrit_10th_fixture",
  title: "Class 10 Sanskrit Annual Board Examination 2026–27",
  schoolName: "SARVODAYA ENGLISH HIGHER SECONDARY SCHOOL, LAKHNADON",
  academicSession: "2026–27",
  examDate: "2027-03-05",
  paperSet: "SET A",
  subjectCode: "122",
  language: "sa",
  generalInstructions: "सर्वे प्रश्नाः अनिवार्याः सन्ति।",
  status: "FINAL",
  examType: "ANNUAL",
  layout: "BOOKLET_A4",
  numberingStyle: "CONTINUOUS",
  printDensity: "COMPACT",
  twoColumn: false,
  targetPages: 4,
  marksStyle: "INLINE",
  showCandidateDetails: true,
  showSignatures: true,
  logoPath: null,
  blueprint: SANSKRIT_CLASS10_BLUEPRINT,
  progress: {
    totalMarks: 75,
    usedMarks: 75,
    complete: true,
    chapters: SANSKRIT_CLASS10_BLUEPRINT.chapters.map((c) => ({
      chapterId: c.chapterId,
      used: c.marks,
      target: c.marks,
    })),
    sections: SANSKRIT_CLASS10_BLUEPRINT.sections.map((s) => ({
      id: s.id,
      needed: s.count,
      filled: s.count,
    })),
  },
  implications: [],
  items: RAW_SANSKRIT_ITEMS.map((item) => ({
    id: item.id,
    sectionId: item.sectionId,
    position: item.position,
    pageBreakBefore: item.pageBreakBefore,
    question: makeFixtureQuestion(item.question),
    orQuestion: item.orQuestion ? makeFixtureQuestion(item.orQuestion) : null,
  })),
};

/**
 * Official MPBSE Class 10 Sanskrit (2026–27) Examination Blueprint Fixture.
 * Reference: https://mpbse.nic.in/ModelPaper/2026-27/10th%20SANSKRIT.PDF
 *
 * Metrics:
 * - Numbered parent questions: 23
 * - Maximum marks: 75
 * - Blueprint sections: 19
 * - Objective question groups (Q1–Q5): 30 marks
 * - Compulsory 2-mark textbook exercises (Q6–Q17): 24 marks (NO OR choices)
 * - Passage comprehension with OR alternatives (Q18–Q20): 9 marks
 * - Unseen passage with attempt-4-of-5 subparts (Q21): 4 marks (NO OR choice)
 * - Letter writing with wedding invitation vs TC application (Q22): 4 marks
 * - Thematic essay with 4 default topics (Q23): 4 marks (NO OR choice)
 */
export const SANSKRIT_MPBSE_2026_BLUEPRINT: BlueprintData = {
  id: "bp_sanskrit_mpbse_2026_official",
  name: "MPBSE संस्कृतम् कक्षा 10 (75 अङ्काः - आधिकारिक 23-प्रश्नीय प्रतिरूप)",
  bookId: "book_sanskrit_10_shemushi",
  academicSession: "2026–27",
  examType: "ANNUAL",
  durationMin: 180,
  subjectCode: "512",
  language: "sa",
  book: {
    id: "book_sanskrit_10_shemushi",
    title: "शेमुषी भाग-2",
    subject: "Sanskrit",
    className: "Class 10",
  },
  _count: { papers: 1 },
  chapters: [
    { chapterId: "ch_1", marks: 7, chapter: { id: "ch_1", number: 1, title: "शुचिपर्यावरणम्" } },
    { chapterId: "ch_2", marks: 7, chapter: { id: "ch_2", number: 2, title: "बुद्धिर्बलवती सदा" } },
    { chapterId: "ch_3", marks: 7, chapter: { id: "ch_3", number: 3, title: "व्यायामः सर्वदा पथ्यः" } },
    { chapterId: "ch_4", marks: 7, chapter: { id: "ch_4", number: 4, title: "शिशुलालनम्" } },
    { chapterId: "ch_5", marks: 7, chapter: { id: "ch_5", number: 5, title: "जननी तुल्यवत्सला" } },
    { chapterId: "ch_6", marks: 8, chapter: { id: "ch_6", number: 6, title: "सुभाषितानि" } },
    { chapterId: "ch_7", marks: 8, chapter: { id: "ch_7", number: 7, title: "सौहार्दं प्रकृतेः शोभा" } },
    { chapterId: "ch_8", marks: 8, chapter: { id: "ch_8", number: 8, title: "विचित्रः साक्षी" } },
    { chapterId: "ch_9", marks: 8, chapter: { id: "ch_9", number: 9, title: "सूक्तयः" } },
    { chapterId: "ch_10", marks: 8, chapter: { id: "ch_10", number: 10, title: "प्राणेभ्योऽपि प्रियः सुहृद्" } },
  ],
  sections: [
    {
      id: "sec_mp_1_mcq",
      position: 0,
      title: "प्रश्न 1: उचितविकल्पं चित्वा लिखत (बहुविकल्प)",
      instructions: "उचितविकल्पं चित्वा लिखत (शब्दरूप, विभक्ति, अव्यय, वचन, पुरुष) [प्रश्नक्रमाङ्कः 1]:",
      type: "MCQ",
      count: 6,
      marksEach: 1,
    },
    {
      id: "sec_mp_2_tf",
      position: 1,
      title: "प्रश्न 2: शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत",
      instructions: "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत (लकार, पुरुष, वचन, उपसर्ग) [प्रश्नक्रमाङ्कः 2]:",
      type: "TRUE_FALSE",
      count: 6,
      marksEach: 1,
    },
    {
      id: "sec_mp_3_match",
      position: 2,
      title: "प्रश्न 3: उचितयुग्ममेलनं कुरुत",
      instructions: "स्तम्भ 'अ' सह स्तम्भ 'ब' इत्यस्य समुचितं मेलनं कुरुत (सन्धि एवं समास) [प्रश्नक्रमाङ्कः 3]:",
      type: "MATCH_COLUMN",
      count: 6,
      marksEach: 1,
    },
    {
      id: "sec_mp_4_vshort",
      position: 3,
      title: "प्रश्न 4: एकपदेन उत्तरं लिखत",
      instructions: "एकपदेन उत्तरं लिखत (कृत्/तद्धित/स्त्री प्रत्ययाः, संख्या, सामान्यबोधः) [प्रश्नक्रमाङ्कः 4]:",
      type: "VERY_SHORT",
      count: 6,
      marksEach: 1,
    },
    {
      id: "sec_mp_5_fill",
      position: 4,
      title: "प्रश्न 5: प्रदत्तैः शब्दैः रिक्तस्थानपूर्तिं कुरुत",
      instructions: "कोष्ठके प्रदत्तैः शब्दैः रिक्तस्थानानि पूरयत (विशेषण, विशेष्य, पर्याय, विलोम) [प्रश्नक्रमाङ्कः 5]:",
      type: "FILL_BLANK",
      count: 6,
      marksEach: 1,
    },
    {
      id: "sec_mp_6_text_short",
      position: 5,
      title: "प्रश्न 6 तः 10: पाठ्यपुस्तक-आधारित-प्रश्नोत्तराणि",
      instructions: "अधोलिखितानां प्रश्नानाम् उत्तराणि संस्कृतभाषया पूर्णवाक्येन लिखत (प्रश्नक्रमाङ्काः 6 तः 10, सर्वे अनिवार्यप्रश्नाः):",
      type: "SHORT",
      count: 5,
      marksEach: 2,
    },
    {
      id: "sec_mp_11_shloka",
      position: 6,
      title: "प्रश्न 11: श्लोकलेखनम्",
      instructions: "प्रश्नपत्रे समागतान् श्लोकान् विहाय स्वपाठ्यपुस्तकात् एकं शुद्धं सुभाषितं श्लोकं लिखत [प्रश्नक्रमाङ्कः 11]:",
      type: "SHORT",
      count: 1,
      marksEach: 2,
    },
    {
      id: "sec_mp_12_katha",
      position: 7,
      title: "प्रश्न 12: कथाक्रमसंयोजनम्",
      instructions: "अधोलिखितानि वाक्यानि कथाक्रमानुसारेण संयोज्य लिखत [प्रश्नक्रमाङ्कः 12]:",
      type: "SHORT",
      count: 1,
      marksEach: 2,
    },
    {
      id: "sec_mp_13_prashna",
      position: 8,
      title: "प्रश्न 13: प्रश्ननिर्माणम्",
      instructions: "अधोलिखितेषु वाक्येषु रेखाङ्कितपदानि आधृत्य प्रश्ननिर्माणं कुरुत (चत्वारः प्रश्नाः, प्रत्येकमर्धाङ्कः) [प्रश्नक्रमाङ्कः 13]:",
      type: "SHORT",
      count: 1,
      marksEach: 2,
    },
    {
      id: "sec_mp_14_samvada",
      position: 9,
      title: "प्रश्न 14: कः कं प्रति कथयति",
      instructions: "अधोलिखितानि वाक्यानि कः कं प्रति कथयति इति लिखत (द्वौ प्रश्नौ, प्रत्येकमङ्कः 1) [प्रश्नक्रमाङ्कः 14]:",
      type: "SHORT",
      count: 1,
      marksEach: 2,
    },
    {
      id: "sec_mp_15_karaka",
      position: 10,
      title: "प्रश्न 15: अशुद्धकारकवाक्यसंशोधनम्",
      instructions: "अधोलिखितानाम् अशुद्धकारकवाक्यानां शुद्धिकरणं कुरुत (द्वे वाक्ये, प्रत्येकमङ्कः 1) [प्रश्नक्रमाङ्कः 15]:",
      type: "SHORT",
      count: 1,
      marksEach: 2,
    },
    {
      id: "sec_mp_16_fill_text",
      position: 11,
      title: "प्रश्न 16: पाठगत-रिक्तस्थानपूर्तिः",
      instructions: "अधोलिखित-वाक्येषु रिक्तस्थानानि पूरयत (मञ्जूषां विना, चत्वारः प्रश्नाः, प्रत्येकमर्धाङ्कः) [प्रश्नक्रमाङ्कः 16]:",
      type: "FILL_BLANK",
      count: 1,
      marksEach: 2,
    },
    {
      id: "sec_mp_17_vacya",
      position: 12,
      title: "प्रश्न 17: वाच्यपरिवर्तनम्",
      instructions: "अधोलिखितवाक्येषु निर्देशानुसारं वाच्यपरिवर्तनं कुरुत (द्वे वाक्ये, प्रत्येकमङ्कः 1) [प्रश्नक्रमाङ्कः 17]:",
      type: "SHORT",
      count: 1,
      marksEach: 2,
    },
    {
      id: "sec_mp_18_prose",
      position: 13,
      title: "प्रश्न 18: पठितगद्यांशः",
      instructions: "अधोलिखितं गद्यांशं सम्यक् पठित्वा प्रश्नानाम् उत्तराणि संस्कृतेन लिखत (स-विकल्पः) [प्रश्नक्रमाङ्कः 18]:",
      type: "CASE_STUDY",
      count: 1,
      marksEach: 3,
    },
    {
      id: "sec_mp_19_poetry",
      position: 14,
      title: "प्रश्न 19: पठितपद्यांशः",
      instructions: "अधोलिखितं पद्यांशं सम्यक् पठित्वा प्रश्नानाम् उत्तराणि संस्कृतेन लिखत (स-विकल्पः) [प्रश्नक्रमाङ्कः 19]:",
      type: "CASE_STUDY",
      count: 1,
      marksEach: 3,
    },
    {
      id: "sec_mp_20_drama",
      position: 15,
      title: "प्रश्न 20: पठितनाट्यांशः",
      instructions: "अधोलिखितं नाट्यांशं सम्यक् पठित्वा प्रश्नानाम् उत्तराणि संस्कृतेन लिखत (स-विकल्पः) [प्रश्नक्रमाङ्कः 20]:",
      type: "CASE_STUDY",
      count: 1,
      marksEach: 3,
    },
    {
      id: "sec_mp_21_unseen",
      position: 16,
      title: "प्रश्न 21: अपठितगद्यांशः",
      instructions: "अधोलिखितम् अपठितगद्यांशं सम्यक् पठित्वा चतुर्णां प्रश्नानाम् उत्तराणि संस्कृतेन लिखत (पञ्चसु केचन चत्वारः) [प्रश्नक्रमाङ्कः 21]:",
      type: "UNSEEN_PASSAGE",
      count: 1,
      marksEach: 4,
    },
    {
      id: "sec_mp_22_letter",
      position: 17,
      title: "प्रश्न 22: पत्रलेखनम्",
      instructions: "निर्देशानुसारं पत्रलेखनं / प्रार्थनापत्रं कुरुत (स-विकल्पः) [प्रश्नक्रमाङ्कः 22]:",
      type: "LONG",
      count: 1,
      marksEach: 4,
    },
    {
      id: "sec_mp_23_essay",
      position: 18,
      title: "प्रश्न 23: निबन्धलेखनम्",
      instructions: "अधोलिखितेषु विषयेषु एकं विषयं स्वीकृत्य शतशब्देषु संस्कृतभाषया निबन्धं लिखत [प्रश्नक्रमाङ्कः 23]:",
      type: "LONG",
      count: 1,
      marksEach: 4,
    },
  ],
};

const RAW_OFFICIAL_2026_ITEMS: Array<{
  id: string;
  sectionId: string;
  position: number;
  pageBreakBefore?: boolean;
  question: any;
  orQuestion?: any;
}> = [
  // Section 1: Q1 (MCQ - 6 items)
  {
    id: "item_mp_1_1",
    sectionId: "sec_mp_1_mcq",
    position: 0,
    question: {
      type: "MCQ",
      text: "'बालकस्य' इत्यस्मिन् पदे का विभक्तिः अस्ति?",
      options: ["षष्ठी", "पञ्चमी", "तृतीया", "सप्तमी"],
      answer: "षष्ठी",
      explanation: "बालक शब्दस्य षष्ठी-एकवचने 'बालकस्य' भवति।",
    },
  },
  {
    id: "item_mp_1_2",
    sectionId: "sec_mp_1_mcq",
    position: 1,
    question: {
      type: "MCQ",
      text: "'लतायाम्' इत्यस्मिन् पदे किं वचनम् अस्ति?",
      options: ["एकवचनम्", "द्विवचनम्", "बहुवचनम्", "वचनत्रयम्"],
      answer: "एकवचनम्",
      explanation: "लता शब्दस्य सप्तमी-एकवचने 'लतायाम्' भवति।",
    },
  },
  {
    id: "item_mp_1_3",
    sectionId: "sec_mp_1_mcq",
    position: 2,
    question: {
      type: "MCQ",
      text: "'नदी' शब्दस्य द्वितीया-बहुवचने रूपं किम्?",
      options: ["नदीः", "नदीम्", "नद्यः", "नदीभ्यः"],
      answer: "नदीः",
      explanation: "नदी शब्दस्य द्वितीया-बहुवचने 'नदीः' रूपं भवति।",
    },
  },
  {
    id: "item_mp_1_4",
    sectionId: "sec_mp_1_mcq",
    position: 3,
    question: {
      type: "MCQ",
      text: "'अस्मद्' शब्दस्य पञ्चमी-एकवचने रूपं किम्?",
      options: ["मत्", "मम", "मह्यम्", "मयि"],
      answer: "मत्",
      explanation: "अस्मद् शब्दस्य पञ्चमी-एकवचने 'मत्' भवति।",
    },
  },
  {
    id: "item_mp_1_5",
    sectionId: "sec_mp_1_mcq",
    position: 4,
    question: {
      type: "MCQ",
      text: "अधोलिखितेषु अव्ययं पदं नास्ति:",
      options: ["बालकः", "अपि", "अत्र", "तत्र"],
      answer: "बालकः",
      explanation: "'बालकः' नामपदम् अस्ति, न तु अव्ययम्।",
    },
  },
  {
    id: "item_mp_1_6",
    sectionId: "sec_mp_1_mcq",
    position: 5,
    question: {
      type: "MCQ",
      text: "'तत्र' इत्यव्ययपदस्य अर्थः कः?",
      options: ["वहाँ", "यहाँ", "कहाँ", "कब"],
      answer: "वहाँ",
      explanation: "'तत्र' इत्यस्य अर्थः 'वहाँ' भवति।",
    },
  },

  // Section 2: Q2 (True/False - 6 items)
  {
    id: "item_mp_2_1",
    sectionId: "sec_mp_2_tf",
    position: 0,
    question: {
      type: "TRUE_FALSE",
      text: "'पठति' इत्यस्मिन् पदे लट्लकारः अस्ति।",
      options: ["आम्", "न"],
      answer: "आम्",
      explanation: "पठति इति वर्तमानकाले लट्लकारस्य प्रथमपुरुष-एकवचनम्।",
    },
  },
  {
    id: "item_mp_2_2",
    sectionId: "sec_mp_2_tf",
    position: 1,
    question: {
      type: "TRUE_FALSE",
      text: "'अगच्छत्' इत्यस्मिन् पदे लृट्लकारः अस्ति।",
      options: ["आम्", "न"],
      answer: "न",
      explanation: "'अगच्छत्' लङ्-लकारस्य (भूतकालस्य) रूपम् अस्ति।",
    },
  },
  {
    id: "item_mp_2_3",
    sectionId: "sec_mp_2_tf",
    position: 2,
    question: {
      type: "TRUE_FALSE",
      text: "'भवतु' इत्यस्मिन् पदे लोट्लकारः प्रथमपुरुषः एकवचनं च अस्ति।",
      options: ["आम्", "न"],
      answer: "आम्",
      explanation: "भू धातोः लोट्लकारे 'भवतु' रूपं भवति।",
    },
  },
  {
    id: "item_mp_2_4",
    sectionId: "sec_mp_2_tf",
    position: 3,
    question: {
      type: "TRUE_FALSE",
      text: "'अनुगच्छति' इत्यस्मिन् पदे 'अनु' उपसर्गः अस्ति।",
      options: ["आम्", "न"],
      answer: "आम्",
      explanation: "अनु + गच्छति इत्यत्र 'अनु' उपसर्गः।",
    },
  },
  {
    id: "item_mp_2_5",
    sectionId: "sec_mp_2_tf",
    position: 4,
    question: {
      type: "TRUE_FALSE",
      text: "'प्रचारः' इत्यस्मिन् पदे 'परा' उपसर्गः अस्ति।",
      options: ["आम्", "न"],
      answer: "न",
      explanation: "'प्रचारः' इत्यत्र 'प्र' उपसर्गः अस्ति, न तु 'परा'।",
    },
  },
  {
    id: "item_mp_2_6",
    sectionId: "sec_mp_2_tf",
    position: 5,
    question: {
      type: "TRUE_FALSE",
      text: "'पठेत्' इत्यस्मिन् पदे विधिलिङ् लकारः अस्ति।",
      options: ["आम्", "न"],
      answer: "आम्",
      explanation: "पठ् धातोः विधिलिङ्-लकारे 'पठेत्' भवति।",
    },
  },

  // Section 3: Q3 (Match Column - 1 combined item with 6 pairs)
  {
    id: "item_mp_3_1",
    sectionId: "sec_mp_3_match",
    position: 0,
    question: {
      type: "MATCH_COLUMN",
      text: "उचितयुग्मं मेलयत (स्तम्भ 'अ' सह स्तम्भ 'ब'):\nColumn I:\n(A) विद्यालयः\n(B) जगदीशः\n(C) मनोरथः\n(D) प्रतिदिनम्\n(E) पीताम्बरः\n(F) त्रिभुवनम्",
      options: [
        "(A) विद्यालयः :: दीर्घस्वरसन्धिः",
        "(B) जगदीशः :: जश्त्वव्यञ्जनसन्धिः",
        "(C) मनोरथः :: विसर्गसन्धिः",
        "(D) प्रतिदिनम् :: अव्ययीभावसमासः",
        "(E) पीताम्बरः :: बहुव्रीहिसमासः",
        "(F) त्रिभुवनम् :: द्विगुसमासः",
      ],
      answer: "(A)-दीर्घस्वरसन्धिः, (B)-जश्त्वव्यञ्जनसन्धिः, (C)-विसर्गसन्धिः, (D)-अव्ययीभावसमासः, (E)-बहुव्रीहिसमासः, (F)-द्विगुसमासः",
      explanation: "सन्धि-समासयोः आधिकारिक-व्याकरणनियमानुसारेण शुद्धमेलनम्।",
    },
  },

  // Section 4: Q4 (Very Short - 6 items)
  {
    id: "item_mp_4_1",
    sectionId: "sec_mp_4_vshort",
    position: 0,
    question: {
      type: "VERY_SHORT",
      text: "'पठितवान्' इत्यस्मिन् पदे कः प्रत्ययः अस्ति?",
      answer: "क्तवतु-प्रत्ययः",
      explanation: "पठ् + क्तवतु = पठितवान्।",
    },
  },
  {
    id: "item_mp_4_2",
    sectionId: "sec_mp_4_vshort",
    position: 1,
    question: {
      type: "VERY_SHORT",
      text: "'गत्वा' इत्यस्मिन् पदे कः प्रत्ययः अस्ति?",
      answer: "क्त्वा-प्रत्ययः",
      explanation: "गम् + क्त्वा = गत्वा।",
    },
  },
  {
    id: "item_mp_4_3",
    sectionId: "sec_mp_4_vshort",
    position: 2,
    question: {
      type: "VERY_SHORT",
      text: "'अजा' इत्यत्र कः स्त्रीप्रत्ययः अस्ति?",
      answer: "टाप्-प्रत्ययः",
      explanation: "अज + टाप् = अजा।",
    },
  },
  {
    id: "item_mp_4_4",
    sectionId: "sec_mp_4_vshort",
    position: 3,
    question: {
      type: "VERY_SHORT",
      text: "प्राणिनां कः महान् रिपुः?",
      answer: "आलस्यम्",
      explanation: "आलस्यं हि मनुष्याणां शरीरस्थो महान् रिपुः।",
    },
  },
  {
    id: "item_mp_4_5",
    sectionId: "sec_mp_4_vshort",
    position: 4,
    question: {
      type: "VERY_SHORT",
      text: "अहिभुक् इति कस्य पक्षीणः नाम?",
      answer: "मयूरस्य",
      explanation: "मयूरः सर्पं भक्षयति अतः अहिभुक् कथ्यते।",
    },
  },
  {
    id: "item_mp_4_6",
    sectionId: "sec_mp_4_vshort",
    position: 5,
    question: {
      type: "VERY_SHORT",
      text: "कस्य सम्पत्तौ च विपत्तौ च एकरूपता भवति?",
      answer: "महताम् (महापुरुषाणाम्)",
      explanation: "सम्पत्तौ च विपत्तौ च महतामेकरूपता।",
    },
  },

  // Section 5: Q5 (Fill in the blanks with Word Bank - 6 items)
  {
    id: "item_mp_5_1",
    sectionId: "sec_mp_5_fill",
    position: 0,
    question: {
      type: "FILL_BLANK",
      text: "व्यायामं कुर्वतः जनस्य समीपं ________ न उपसर्पन्ति। (मञ्जूषा: व्याधयः, दुर्वहम्, शृगालः, प्रथमः, रसालम्, विद्याधनम्)",
      answer: "व्याधयः",
      explanation: "वैनतेयमिवोरगाः न उपसर्पन्ति व्याधयः।",
    },
  },
  {
    id: "item_mp_5_2",
    sectionId: "sec_mp_5_fill",
    position: 1,
    question: {
      type: "FILL_BLANK",
      text: "महानगरेषु जीवितं ________ जातम्।",
      answer: "दुर्वहम्",
      explanation: "जीवितं दुर्वहं जातं प्रकृतिरेव शरणम्।",
    },
  },
  {
    id: "item_mp_5_3",
    sectionId: "sec_mp_5_fill",
    position: 2,
    question: {
      type: "FILL_BLANK",
      text: "जम्बुकः इत्यस्य पर्यायपदं ________ अस्ति।",
      answer: "शृगालः",
      explanation: "जम्बुकः = शृगालः।",
    },
  },
  {
    id: "item_mp_5_4",
    sectionId: "sec_mp_5_fill",
    position: 3,
    question: {
      type: "FILL_BLANK",
      text: "आचारः ________ धर्मः इत्येतद् विदुषां वचः।",
      answer: "प्रथमः",
      explanation: "आचारः प्रथमो धर्मः।",
    },
  },
  {
    id: "item_mp_5_5",
    sectionId: "sec_mp_5_fill",
    position: 4,
    question: {
      type: "FILL_BLANK",
      text: "आम्रम् इत्यस्य पर्यायपदं ________ अस्ति।",
      answer: "रसालम्",
      explanation: "आम्रम् = रसालम्।",
    },
  },
  {
    id: "item_mp_5_6",
    sectionId: "sec_mp_5_fill",
    position: 5,
    question: {
      type: "FILL_BLANK",
      text: "पिता पुत्राय बाल्ये महत् ________ यच्छति।",
      answer: "विद्याधनम्",
      explanation: "पिता यच्छति पुत्राय बाल्ये विद्याधनं महत्।",
    },
  },

  // Section 6: Q6 to Q10 (5 Textbook Questions, 2 Marks each = 10 Marks. NO OR choices!)
  {
    id: "item_mp_6",
    sectionId: "sec_mp_6_text_short",
    position: 0,
    question: {
      type: "SHORT",
      text: "कविः किमर्थं प्रकृतेः शरणम् इच्छति?",
      answer: "अत्र महानगरेषु जीवितं दुर्वहं जातम्, वायुमण्डलं जलं च सर्वं दूषितम् अस्ति, अतः कविः प्रकृतेः शरणम् इच्छति।",
      explanation: "शुचिपर्यावरणम् पाठाधारितम्।",
    },
  },
  {
    id: "item_mp_7",
    sectionId: "sec_mp_6_text_short",
    position: 1,
    question: {
      type: "SHORT",
      text: "बुद्धिमती केन उपेता पितुर्गृहं प्रति चलिता?",
      answer: "बुद्धिमती पुत्रद्वयोपेता पितुर्गृहं प्रति चलिता।",
      explanation: "बुद्धिर्बलवती सदा पाठाधारितम्।",
    },
  },
  {
    id: "item_mp_8",
    sectionId: "sec_mp_6_text_short",
    position: 2,
    question: {
      type: "SHORT",
      text: "मातुः सुरभेः नेत्राभ्याम् अश्रूणि किमर्थम् आविरासन्?",
      answer: "भूमौ पतिते स्वपुत्रे दुर्बले वृषभे दृष्ट्वा सुरभेः नेत्राभ्याम् अश्रूणि आविरासन्।",
      explanation: "जननी तुल्यवत्सला पाठाधारितम्।",
    },
  },
  {
    id: "item_mp_9",
    sectionId: "sec_mp_6_text_short",
    position: 3,
    question: {
      type: "SHORT",
      text: "कुशलवयोः वंशस्य कर्ता कः आसीत्?",
      answer: "कुशलवयोः वंशस्य कर्ता भगवान् सहस्रदीधितिः (सूर्यः) आसीत्।",
      explanation: "शिशुलालनम् पाठाधारितम्।",
    },
  },
  {
    id: "item_mp_10",
    sectionId: "sec_mp_6_text_short",
    position: 4,
    question: {
      type: "SHORT",
      text: "वस्तुतः चौरः कः आसीत्? न्यायाधीशेन कः दण्डितः?",
      answer: "वस्तुतः चौरः ग्रामस्य आरक्षी एव आसीत्, स एव न्यायाधीशेन कारादण्डेन दण्डितः।",
      explanation: "विचित्रः साक्षी पाठाधारितम्।",
    },
  },

  // Section 7: Q11 (Subhashita Shloka - 1 question, 2 marks. NO OR choice)
  {
    id: "item_mp_11",
    sectionId: "sec_mp_11_shloka",
    position: 0,
    question: {
      type: "SHORT",
      text: "प्रश्नपत्रे समागतान् श्लोकान् विहाय स्वपाठ्यपुस्तकात् एकं शुद्धं सुभाषितं श्लोकं लिखत।",
      answer: "विचित्रः खलु संसारे नास्ति किञ्चिन्निरर्थकम्।\nअश्वश्चेद् धावने वीरः भारस्य वहने खरः॥",
      explanation: "पाठ्यपुस्तकात् शुद्धश्लोकलेखनम् (2 अङ्कौ)।",
    },
  },

  // Section 8: Q12 (Scrambled Story Sentence Ordering - 1 question, 2 marks. NO OR choice)
  {
    id: "item_mp_12",
    sectionId: "sec_mp_12_katha",
    position: 0,
    question: {
      type: "SHORT",
      text: "अधोलिखितानि वाक्यानि कथाक्रमानुसारेण योजयित्वा लिखत:\n(क) व्याघ्रः 'इयं व्याघ्रमारी' इति मत्वा भीतः सन् पलायितः।\n(ख) बुद्धिमती पुत्रद्वयेन सह पितुर्गृहं प्रति चलिता।\n(ग) मार्गे सा गहनकानने एकं व्याघ्रं ददर्श।\n(घ) सा पुत्रौ चपेटया प्रहृत्य व्याघ्रभक्षणाय कलहं निवारितवती।",
      answer: "क्रमशः शुद्धवाक्यानि:\n1. (ख) बुद्धिमती पुत्रद्वयेन सह पितुर्गृहं प्रति चलिता।\n2. (ग) मार्गे सा गहनकानने एकं व्याघ्रं ददर्श।\n3. (घ) सा पुत्रौ चपेटया प्रहृत्य व्याघ्रभक्षणाय कलहं निवारितवती।\n4. (क) व्याघ्रः 'इयं व्याघ्रमारी' इति मत्वा भीतः सन् पलायितः।",
      explanation: "कथाक्रमानुसारेण वाक्यानां संयोजनम्।",
    },
  },

  // Section 9: Q13 (Question Formation - 1 question, 4 subparts of 0.5M each = 2M. NO attempt-2-of-3, all 4 compulsory)
  {
    id: "item_mp_13",
    sectionId: "sec_mp_13_prashna",
    position: 0,
    question: {
      type: "SHORT",
      text: "अधोलिखितेषु वाक्येषु स्थूलाक्षरपदानि / रेखाङ्कितपदानि आधृत्य प्रश्ननिर्माणं कुरुत (चत्वारः प्रश्नाः, प्रत्येकमर्धाङ्कः):",
      subparts: [
        { label: "(क)", text: "धेनूनां माता सुरभिः आसीत्।", marks: 0.5, answer: "कासां माता सुरभिः आसीत्?" },
        { label: "(ख)", text: "चौरस्य पादध्वनिना अतिथिः प्रबुद्धः।", marks: 0.5, answer: "कस्य पादध्वनिना अतिथिः प्रबुद्धः?" },
        { label: "(ग)", text: "मयूरस्य नृत्यं प्रकृतेः आराधना।", marks: 0.5, answer: "मयूरस्य नृत्यं कस्याः आराधना?" },
        { label: "(घ)", text: "उद्याने पक्षिणां कलरवं चेतः प्रसादयति।", marks: 0.5, answer: "उद्याने केषां कलरवं चेतः प्रसादयति?" },
      ],
      answer: "(क) कासां माता सुरभिः आसीत्? (ख) कस्य पादध्वनिना अतिथिः प्रबुद्धः? (ग) मयूरस्य नृत्यं कस्याः आराधना? (घ) उद्याने केषां कलरवं चेतः प्रसादयति?",
      explanation: "किम्-सर्वनाम्ना प्रश्ननिर्माणम्।",
    },
  },

  // Section 10: Q14 (Speaker/Listener - 1 question, 2 subparts of 1M each = 2M. Both compulsory)
  {
    id: "item_mp_14",
    sectionId: "sec_mp_14_samvada",
    position: 0,
    question: {
      type: "SHORT",
      text: "अधोलिखितानि वाक्यानि कः कं प्रति कथयति इति लिखत (द्वौ प्रश्नौ, प्रत्येकमङ्कः 1):",
      subparts: [
        { label: "(क)", text: "'रे रे धूर्त! त्वया मह्यं पुरा व्याघ्रत्रयं दत्तम्।'", marks: 1, answer: "कः: बुद्धिमती (व्याघ्रमारी), कं प्रति: जम्बुकं (शृगालं) प्रति" },
        { label: "(ख)", text: "'जानामि तस्य नामधेयम्।'", marks: 1, answer: "कः: कुशः, कं प्रति: श्रीरामं प्रति" },
      ],
      answer: "(क) बुद्धिमती शृगालं प्रति (ख) कुशः श्रीरामं प्रति",
      explanation: "पाठगतसंवादपरिज्ञानम्।",
    },
  },

  // Section 11: Q15 (Karaka Correction - 1 question, 2 subparts of 1M each = 2M. Both compulsory, no attempt-2-of-3)
  {
    id: "item_mp_15",
    sectionId: "sec_mp_15_karaka",
    position: 0,
    question: {
      type: "SHORT",
      text: "अधोलिखितानाम् अशुद्धकारकवाक्यानां शुद्धिकरणं कुरुत (द्वे वाक्ये, प्रत्येकमङ्कः 1):",
      subparts: [
        { label: "(क)", text: "श्री गणेशं नमः। (अशुद्धम्)", marks: 1, answer: "श्री गणेशाय नमः।" },
        { label: "(ख)", text: "वृक्षस्य पर्णं पतति। (अशुद्धम्)", marks: 1, answer: "वृक्षात् पर्णं पतति।" },
      ],
      answer: "(क) श्री गणेशाय नमः। (ख) वृक्षात् पर्णं पतति।",
      explanation: "नमः योगे चतुर्थी (गणेशाय) तथा अपादाने पञ्चमी (वृक्षात्)।",
    },
  },

  // Section 12: Q16 (Fill in Blanks from Textbook - 1 question, 4 blanks of 0.5M each = 2M. WITHOUT word bank!)
  {
    id: "item_mp_16",
    sectionId: "sec_mp_16_fill_text",
    position: 0,
    question: {
      type: "FILL_BLANK",
      text: "अधोलिखित-वाक्येषु रिक्तस्थानानि पूरयत (पाठ्यपुस्तकाधारेण, मञ्जूषां विना, चत्वारः प्रश्नाः, प्रत्येकमर्धाङ्कः):",
      subparts: [
        { label: "(क)", text: "काकः ________ भवति।", marks: 0.5, answer: "मेध्यामेध्यभक्षकः" },
        { label: "(ख)", text: "मयूरः ________ इति नाम्नापि ज्ञायते।", marks: 0.5, answer: "अहिभुक्" },
        { label: "(ग)", text: "उलूकः ________ आसीत्।", marks: 0.5, answer: "आत्मश्लाघाहीनः" },
        { label: "(घ)", text: "सत्यं ब्रूयात् न ब्रूयात् ________ अनृतम्।", marks: 0.5, answer: "प्रियम्" },
      ],
      answer: "(क) मेध्यामेध्यभक्षकः (ख) अहिभुक् (ग) आत्मश्लाघाहीनः (घ) प्रियम्",
      explanation: "शेमुषी-पाठ्यपुस्तकाधारित-रिक्तस्थानपूर्तिः।",
    },
  },

  // Section 13: Q17 (Voice Transformation - 1 question, 2 subparts of 1M each = 2M. Both compulsory, no attempt-2-of-3)
  {
    id: "item_mp_17",
    sectionId: "sec_mp_17_vacya",
    position: 0,
    question: {
      type: "SHORT",
      text: "अधोलिखितवाक्येषु निर्देशानुसारं वाच्यपरिवर्तनं कुरुत (द्वे वाक्ये, प्रत्येकमङ्कः 1):",
      subparts: [
        { label: "(क)", text: "त्वया सत्यं कथितम्। (कर्तृवाच्ये परिवर्तयत)", marks: 1, answer: "त्वं सत्यम् अकथयः।" },
        { label: "(ख)", text: "लता गीतं गायति। (कर्मवाच्ये परिवर्तयत)", marks: 1, answer: "लतया गीतं गीयते।" },
      ],
      answer: "(क) त्वं सत्यम् अकथयः। (ख) लतया गीतं गीयते।",
      explanation: "कर्तृवाच्य-कर्मवाच्य-परिवर्तननियमाः।",
    },
  },

  // Section 14: Q18 (Prose Passage Comprehension - 1 question, 3 marks, WITH genuine passage-based OR choice)
  {
    id: "item_mp_18",
    sectionId: "sec_mp_18_prose",
    position: 0,
    question: {
      type: "CASE_STUDY",
      text: "अधोलिखितं गद्यांशं सम्यक् पठित्वा प्रश्नानाम् उत्तराणि संस्कृतेन लिखत:\nकश्चिद् निर्धनो जनो भूरि परिश्रम्य किञ्चिद् वित्तमुपार्जितवान्। तेन वित्तेन स्वपुत्रम् एकस्मिन् महाविद्यालये प्रवेशं दापयितुं सफलो जातः। तत्तनयः तत्रैव छात्रावासे निवसन् अध्ययने संलग्नः समभूत्। एकदा स पिता तनूजस्य रुग्णतामाकर्ण्य व्याकुलो जातः पुत्रं द्रष्टुं च प्रस्थितः। परमर्थकार्श्येन पीडितः स बसयानं विहाय पदातिरेव प्राचलत्।",
      subparts: [
        { label: "(i)", text: "निर्धनः जनः कथं वित्तम् उपार्जितवान्?", marks: 1, answer: "निर्धनः जनः भूरि परिश्रम्य वित्तम् उपार्जितवान्।" },
        { label: "(ii)", text: "पिता कस्मात् कारणात् व्याकुलः जातः?", marks: 1, answer: "पिता स्वपुत्रस्य रुग्णताम् आकर्ण्य व्याकुलः जातः।" },
        { label: "(iii)", text: "सः जनः बसयानं विहाय पदातिः एव किमर्थं प्राचलत्?", marks: 1, answer: "अर्थकार्श्येन (धनस्य अभावेन) पीडितः सः बसयानं विहाय पदातिरेव प्राचलत्।" },
      ],
      answer: "(i) भूरि परिश्रम्य (ii) पुत्रस्य रुग्णताम् आकर्ण्य (iii) अर्थकार्श्येन पीडितत्वात्",
      explanation: "'विचित्रः साक्षी' पाठस्य गद्यांशावबोधनम्।",
    },
    orQuestion: {
      type: "CASE_STUDY",
      text: "अथवा\nअधोलिखितं गद्यांशं सम्यक् पठित्वा प्रश्नानाम् उत्तराणि संस्कृतेन लिखत:\nअस्ति देउलाख्यो ग्रामः। तत्र राजसिंहः नाम राजपुत्रः वसति स्म। एकदा केनापि आवश्यककार्येण तस्य भार्या बुद्धिमती पुत्रद्वयोपेता पितुर्गृहं प्रति चलिता। मार्गे गहनकानने सा एकं व्याघ्रं ददर्श। सा व्याघ्रमागच्छन्तं दृष्ट्वा धाष्ट्र्यात् पुत्रौ चपेटया प्रहृत्य जगाद - 'कथमेकैकशो व्याघ्रभक्षणाय कलहं कुरुथः? अयमेकस्तावद् विभज्य भुज्यताम्। पश्चाद् अन्यो द्वितीयः कश्चिल्लक्ष्यते।' इति।",
      subparts: [
        { label: "(i)", text: "देउलाख्ये ग्रामे कः वसति स्म?", marks: 1, answer: "देउलाख्ये ग्रामे राजसिंहः नाम राजपुत्रः वसति स्म।" },
        { label: "(ii)", text: "बुद्धिमती मार्गे कुत्र कं ददर्श?", marks: 1, answer: "बुद्धिमती मार्गे गहनकानने एकं व्याघ्रं ददर्श।" },
        { label: "(iii)", text: "बुद्धिमती स्वपुत्रौ चपेटया प्रहृत्य किम् अवदत्?", marks: 1, answer: "सा अवदत् - 'कथम् एकैकशः व्याघ्रभक्षणाय कलहं कुरुथः? अयमेकः विभज्य भुज्यताम्' इति।" },
      ],
      answer: "(i) राजसिंहः नाम राजपुत्रः (ii) गहनकानने एकं व्याघ्रम् (iii) अयमेकः विभज्य भुज्यताम् इति",
      explanation: "'बुद्धिर्बलवती सदा' पाठस्य गद्यांशावबोधनम्।",
    },
  },

  // Section 15: Q19 (Poetry Passage Comprehension - 1 question, 3 marks, WITH genuine passage-based OR choice)
  {
    id: "item_mp_19",
    sectionId: "sec_mp_19_poetry",
    position: 0,
    question: {
      type: "CASE_STUDY",
      text: "अधोलिखितं पद्यांशं सम्यक् पठित्वा प्रश्नानाम् उत्तराणि संस्कृतेन लिखत:\nआलस्यं हि मनुष्याणां शरीरस्थो महान् रिपुः।\nनास्त्युद्यमसमो बन्धुः कृत्वा यं नावसीदति॥",
      subparts: [
        { label: "(i)", text: "मनुष्याणां शरीरस्थः महान् रिपुः कः?", marks: 1, answer: "मनुष्याणां शरीरस्थः महान् रिपुः आलस्यम् अस्ति।" },
        { label: "(ii)", text: "केन समः बन्धुः नास्ति?", marks: 1, answer: "उद्यमेन (परिश्रमेण) समः बन्धुः नास्ति।" },
        { label: "(iii)", text: "यं कृत्वा मनुष्यः किं न प्राप्नोति?", marks: 1, answer: "यं (उद्यमं) कृत्वा मनुष्यः न अवसीदति (दुःखं न प्राप्नोति)।" },
      ],
      answer: "(i) आलस्यम् (ii) उद्यमेन समः (iii) नावसीदति (कदापि दुःखी न भवति)",
      explanation: "'सुभाषितानि' पाठस्य पद्यांशावबोधनम्।",
    },
    orQuestion: {
      type: "CASE_STUDY",
      text: "अथवा\nअधोलिखितं पद्यांशं सम्यक् पठित्वा प्रश्नानाम् उत्तराणि संस्कृतेन लिखत:\nगुणी गुणं वेत्ति न वेत्ति निर्गुणो बली बलं वेत्ति न वेत्ति निर्बलः।\nपिको वसन्तस्य गुणं न वायसः करी च सिंहस्य बलं न मूषकः॥",
      subparts: [
        { label: "(i)", text: "गुणी किं वेत्ति कश्च न वेत्ति?", marks: 1, answer: "गुणी गुणं वेत्ति, निर्गुणः गुणं न वेत्ति।" },
        { label: "(ii)", text: "वसन्तस्य गुणं कः जानाति पिकः अथवा वायसः?", marks: 1, answer: "वसन्तस्य गुणं पिकः (कोकिलः) जानाति न तु वायसः।" },
        { label: "(iii)", text: "सिंहस्य बलं कः जानाति?", marks: 1, answer: "सिंहस्य बलं करी (गजः) जानाति न तु मूषकः।" },
      ],
      answer: "(i) गुणी गुणं वेत्ति, निर्गुणः न (ii) पिकः जानाति (iii) करी (गजः) जानाति",
      explanation: "'सुभाषितानि' पाठस्य पद्यांशावबोधनम्।",
    },
  },

  // Section 16: Q20 (Drama Passage Comprehension - 1 question, 3 marks, WITH genuine excerpt-based OR choice)
  {
    id: "item_mp_20",
    sectionId: "sec_mp_20_drama",
    position: 0,
    question: {
      type: "CASE_STUDY",
      text: "अधोलिखितं नाट्यांशं सम्यक् पठित्वा प्रश्नानाम् उत्तराणि संस्कृतेन लिखत:\nकाकः - अरे! किं बरसि? यदि अहं कृष्णवर्णः तर्हि त्वं किं गौराङ्गः? अपि च विस्मर्यते किं यन्मम सत्यप्रियता तु जनानां कृते उदाहरणस्वरूपा - 'अनृतं वदसि चेत् काकः दशेत्' इति प्रकारेण। अस्माकं परिश्रमः ऐक्यं च विश्वप्रथितम्।\nपिकः - अलम् अलम् अतिविकत्थनेन। किं विस्मर्यते यत् -\nकाकः कृष्णः पिकः कृष्णः को भेदः पिककाकयोः।\nवसन्तसमये प्राप्ते काकः काकः पिकः पिकः॥",
      subparts: [
        { label: "(i)", text: "कस्य सत्यप्रियता जनानां कृते उदाहरणस्वरूपा?", marks: 1, answer: "काकस्य सत्यप्रियता जनानां कृते उदाहरणस्वरूपा।" },
        { label: "(ii)", text: "काक-पिकयोः भेदः कदा ज्ञायते?", marks: 1, answer: "वसन्तसमये प्राप्ते काक-पिकयोः भेदः ज्ञायते।" },
        { label: "(iii)", text: "'काकः कृष्णः पिकः कृष्णः' इत्यत्र विशेषणपदं किम्?", marks: 1, answer: "'कृष्णः' इति विशेषणपदम् अस्ति।" },
      ],
      answer: "(i) काकस्य सत्यप्रियता (ii) वसन्तसमये (iii) कृष्णः",
      explanation: "'सौहार्दं प्रकृतेः शोभा' पाठस्य नाट्यांशावबोधनम्।",
    },
    orQuestion: {
      type: "CASE_STUDY",
      text: "अथवा\nअधोलिखितं नाट्यांशं सम्यक् पठित्वा प्रश्नानाम् उत्तराणि संस्कृतेन लिखत:\nरामः - एष भवतोः सौन्दर्यावलोकजनितेन कौतूहलेन पृच्छामि - क्षत्रियकुलपितामहयोः सूर्यचन्द्रयोः को वा भवतोर्वंशस्य कर्ता?\nलवः - भगवन्! सहस्रदीधितिः।\nरामः - कथमस्मत्समानाभिजनी संवृत्तौ?\nविदूषकः - किं द्वयोरप्येकमेव प्रतिवचनम्?\nलवः - भ्रातराववां सोदर्यौ।",
      subparts: [
        { label: "(i)", text: "कुशलवयोः वंशस्य कर्ता कः आसीत्?", marks: 1, answer: "कुशलवयोः वंशस्य कर्ता सहस्रदीधितिः (सूर्यः) आसीत्।" },
        { label: "(ii)", text: "लवः कुशलवयोरपि सम्बन्धं किं वदति?", marks: 1, answer: "लवः वदति यत् 'आवां सोदर्यौ भ्रातरौ' इति।" },
        { label: "(iii)", text: "'सहस्रदीधितिः' इत्यस्य कः अर्थः?", marks: 1, answer: "'सहस्रदीधितिः' इत्यस्य अर्थः सूर्यः अस्ति।" },
      ],
      answer: "(i) सहस्रदीधितिः (सूर्यः) (ii) आवां सोदर्यौ भ्रातरौ (iii) सूर्यः",
      explanation: "'शिशुलालनम्' पाठस्य नाट्यांशावबोधनम्।",
    },
  },

  // Section 17: Q21 (Unseen Passage Comprehension - 1 question, 4 marks, 5 subparts of 1M each, ATTEMPT ANY 4. NO OR choice)
  {
    id: "item_mp_21",
    sectionId: "sec_mp_21_unseen",
    position: 0,
    question: {
      type: "UNSEEN_PASSAGE",
      text: "अधोलिखितम् अपठितगद्यांशं सम्यक् पठित्वा चतुर्णां प्रश्नानाम् उत्तराणि संस्कृतेन लिखत (पञ्चसु केचन चत्वारः, 4 × 1 = 4 अङ्काः):\nसंस्कृतभाषा अस्माकं देशस्य प्राचीनतमा भाषा अस्ति। प्राचीनकाले सर्वे एव भारतीयाः संस्कृतभाषया एव व्यवहारं कुर्वन्ति स्म। कालान्तरे विविधाः प्रान्तीयाः भाषाः प्राभवन् किन्तु संस्कृतस्य महत्त्वम् अद्यापि अक्षुण्णं वर्तते। सर्वे प्राचीनग्रन्थाः चत्वारो वेदाश्च संस्कृतभाषायाम् एव सन्ति। संस्कृतभाषा भारतस्य राष्ट्रियैकतायाः आधारः अस्ति। एषा भाषा परिशुद्धा, व्याकरणसुसम्पन्ना, मधुरभाषिणी च वर्तते।",
      attemptCount: 4,
      subparts: [
        { label: "(i)", text: "अस्माकं देशस्य प्राचीनतमा भाषा का?", marks: 1, answer: "संस्कृतभाषा अस्माकं देशस्य प्राचीनतमा भाषा अस्ति।" },
        { label: "(ii)", text: "प्राचीनकाले भारतीयाः कया भाषया व्यवहारं कुर्वन्ति स्म?", marks: 1, answer: "प्राचीनकाले सर्वे भारतीयाः संस्कृतभाषया एव व्यवहारं कुर्वन्ति स्म।" },
        { label: "(iii)", text: "चत्वारः वेदाः कस्यां भाषायां सन्ति?", marks: 1, answer: "चत्वारः वेदाः संस्कृतभाषायाम् एव सन्ति।" },
        { label: "(iv)", text: "राष्ट्रियैकतायाः आधारः का भाषा अस्ति?", marks: 1, answer: "संस्कृतभाषा भारतस्य राष्ट्रियैकतायाः आधारः अस्ति।" },
        { label: "(v)", text: "अस्य गद्यांशस्य समुचितं शीर्षकं संस्कृतेन लिखत।", marks: 1, answer: "समुचितं शीर्षकम्: 'संस्कृतभाषायाः महत्त्वम्' अथवा 'गीर्वाणवाणी'।", },
      ],
      answer: "(i) संस्कृतभाषा (ii) संस्कृतभाषया (iii) संस्कृतभाषायाम् (iv) संस्कृतभाषा (v) संस्कृतभाषायाः महत्त्वम्",
      explanation: "अपठितगद्यांशावबोधनम् (5 प्रश्नाः, छात्रैः केचन 4 प्रश्नाः समाधेयाः, 4 अङ्काः)।",
    },
  },

  // Section 18: Q22 (Letter Writing - 1 question, 4 marks, with genuine model paper alternatives)
  {
    id: "item_mp_22",
    sectionId: "sec_mp_22_letter",
    position: 0,
    question: {
      type: "LONG",
      text: "स्वस्य भ्रातुः/स्वकीयविवाहस्य अवसरे स्वमित्रं प्रति निमन्त्रणपत्रं संस्कृतेन लिखत।",
      answer: "निमन्त्रणपत्रस्य प्रारूपम्:\nस्थानम्: भोपालनगरात्\nदिनाङ्कः: 15.03.2027\n\nप्रिय मित्र रमेश!\nसप्रेम नमो नमः।\n\nअत्र कुशलं तत्रास्तु। भवन्तं सूचयन् परं प्रमोदम् अनुभवामि यत् मम ज्येष्ठभ्रातुः (अथवा स्वकीयस्य) शुभविवाहः आगामि-मासस्य विंशतितमे दिनाङ्के निश्चितः जातः। वरयात्रा देहलीं गमिष्यति।\nअतः अस्मिन् माङ्गलिकावसरे भवन्तः सपरिवारम् अवश्यमेव समागत्य अस्मद् गृहे उत्सवशोभां वर्धयिष्यन्ति इति मे सविनयं प्रार्थनम्।\n\nभवतः अभिन्नमित्रम्\nसुरेशः",
      explanation: "औपचारिक/अनौपचारिक पत्रलेखनस्य 4-अङ्कीय मानकप्रारूपम्।",
    },
    orQuestion: {
      type: "LONG",
      text: "अथवा\nस्वप्राचार्यं प्रति स्थानान्तरणप्रमाणपत्रं (T.C.) प्राप्तुं प्रार्थनापत्रं संस्कृतेन लिखत।",
      answer: "प्रार्थनापत्रस्य प्रारूपम्:\nसेवायाम्,\nश्रीमन्तः प्राचार्यमहोदयाः,\nशासकीय-उच्चतर-माध्यमिक-विद्यालयः, इन्दौरनगरम् (म.प्र.)\n\nविषयः - स्थानान्तरणप्रमाणपत्रं (T.C.) प्राप्तुं प्रार्थनापत्रम्।\n\nमहोदय!\nसविनयं निवेदनम् अस्ति यत् मम पितुः स्थानान्तरणं भोपालनगरे सञ्जातम् अस्ति। मम सम्पूर्णः परिवारः तत्रैव गमिष्यति। अतः अहम् अपि तत्रैव प्रवेशं प्राप्स्यामि।\nकृपया मह्यं विद्यालयस्य स्थानान्तरणप्रमाणपत्रं (Transfer Certificate) प्रदाय अनुगृह्णन्तु।\n\nदिनाङ्कः: 15.03.2027\nभवदीयः आज्ञापालकः शिष्यः\nअनुरागः\nकक्षा - दशमी 'अ'",
      explanation: "प्राचार्यं प्रति स्थानान्तरणप्रमाणपत्राय (T.C.) शुद्धप्रार्थनापत्रम्।",
    },
  },

  // Section 19: Q23 (Thematic Essay - 1 question, 4 marks, 4 default topics, select 1, 100 words)
  {
    id: "item_mp_23",
    sectionId: "sec_mp_23_essay",
    position: 0,
    question: {
      type: "LONG",
      text: "अधोलिखितेषु विषयेषु एकं विषयं स्वीकृत्य शतशब्देषु (100-120) संस्कृतभाषया निबन्धं लिखत:\n(1) मम प्रियः कविः\n(2) आचारस्य महत्त्वम् (सदाचारः)\n(3) अस्माकं देशः (भारतवर्षम्)\n(4) देववाण्याः महत्त्वम् (संस्कृतभाषायाः महत्त्वम्)",
      answer: "निबन्धलेखनस्य आदर्शोत्तराणि (छात्रः एकं विषयं चिनोति):\n\n[विषयः - देववाण्याः महत्त्वम् (संस्कृतभाषा)]:\n1. संस्कृतभाषा अस्माकं देशस्य प्राचीनतमा श्रेष्ठा च भाषा अस्ति।\n2. एषा भाषा 'देववाणी' 'गीर्वाणवाणी' इति नाम्नापि लोके प्रसिद्धा वर्तते।\n3. सर्वे प्राचीनग्रन्थाः, चत्वारो वेदाः, उपनिषदः, रामायणं, महाभारतं च अस्याम् एव भाषायां रचिताः सन्ति।\n4. संस्कृतसाहित्यं विशालं, ज्ञानसम्पन्नं, रसमयं च वर्तते।\n5. कालिदास-भवभूति-दण्डि-बाणभट्टादयः महाकवयः संस्कृतभाषायाम् एव अमूल्यकृतयः अरचयन्।\n6. संस्कृतभाषा भारतस्य राष्ट्रियैकतायाः संस्कृतिसंरक्षणस्य च मूलाधारः अस्ति।\n7. अस्याः व्याकरणं सर्वथा वैज्ञानिकं परिशुद्धं च मन्यते।\n8. सङ्गणकस्य कृते अपि संस्कृतभाषा सर्वोत्तमा भाषा स्वीक्रियते।\n9. 'वसुधैव कुटुम्बकम्' इति उदात्तो विचारः संस्कृतेन एव विश्वस्मै प्रदत्तः।\n10. अतः अस्माभिः देववाण्याः संरक्षणं संवर्धनं च अवश्यमेव करणीयम्।",
      explanation: "शतशब्देषु 4-अङ्कीयः संस्कृतनिबन्धः (चतुर्षु विषयेषु एकस्य चयनम्)।",
    },
  },
];

export const SANSKRIT_MPBSE_2026_PAPER: PaperData = {
  id: "paper_sanskrit_mpbse_2026_fixture",
  title: "Class 10 Sanskrit Annual Board Practice Examination (2026–27)",
  schoolName: "Government Model Higher Secondary School, MP",
  academicSession: "2026–27",
  examDate: "2027-03-15",
  paperSet: "SET A",
  subjectCode: "512",
  language: "sa",
  generalInstructions:
    "(1) सर्वे प्रश्नाः अनिवार्याः सन्ति। (2) प्रश्नानां सम्मुखे अङ्काः प्रदत्ताः। (3) प्रश्नक्रमाङ्कः 1 तः 5 पर्यन्तं 30 अङ्कानां वस्तुनिष्ठप्रश्नाः सन्ति। (4) प्रश्नक्रमाङ्कः 6 तः 17 पर्यन्तं प्रत्येकं प्रश्नः 2 अङ्कयोः अस्ति। (5) प्रश्नक्रमाङ्कः 18 तः 20 पर्यन्तं प्रत्येकं प्रश्नः 3 अङ्कानाम् अस्ति। (6) प्रश्नक्रमाङ्कः 21 तः 23 पर्यन्तं प्रत्येकं प्रश्नः 4 अङ्कानाम् अस्ति।",
  status: "FINAL",
  examType: "ANNUAL",
  layout: "SINGLE_PAGE",
  numberingStyle: "CONTINUOUS",
  marksStyle: "RIGHT_COLUMN",
  printDensity: "COMFORTABLE",
  twoColumn: false,
  targetPages: 4,
  showCandidateDetails: true,
  showSignatures: true,
  logoPath: null,
  blueprint: SANSKRIT_MPBSE_2026_BLUEPRINT,
  progress: {
    totalMarks: 75,
    usedMarks: 75,
    complete: true,
    chapters: SANSKRIT_MPBSE_2026_BLUEPRINT.chapters.map((c) => ({
      chapterId: c.chapterId,
      used: c.marks,
      target: c.marks,
    })),
    sections: SANSKRIT_MPBSE_2026_BLUEPRINT.sections.map((s) => ({
      id: s.id,
      needed: s.count,
      filled: s.count,
    })),
  },
  implications: [],
  items: RAW_OFFICIAL_2026_ITEMS.map((item) => ({
    id: item.id,
    sectionId: item.sectionId,
    position: item.position,
    pageBreakBefore: item.pageBreakBefore,
    question: makeFixtureQuestion(item.question),
    orQuestion: item.orQuestion ? makeFixtureQuestion(item.orQuestion) : null,
  })),
};
