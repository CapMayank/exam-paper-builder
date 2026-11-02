/**
 * Content allocation of the official MPBSE marking schemes (अंक योजना), session 2026-27.
 *
 * Source: https://mpbse.nic.in/MarksScheme_2026_27.pdf (scanned, no text layer; read from page images).
 * Only rows that were read are encoded. Nothing here is inferred.
 *
 * The scheme has two parts:
 *  1. a question-format skeleton shared by all subjects (Q1-5 objective, Q6-17 2-mark, ...), and
 *  2. a per-subject content allocation. For language subjects that allocation is by component
 *     (poetry, prose, grammar, unseen passage, writing, ...), not by textbook chapter.
 * The scheme does not say which question number carries which component, so none is assumed.
 */

export type ComponentRole = "STANDARD" | "PASSAGE" | "GRAMMAR" | "WRITING" | "LITERATURE";

export type MarkingComponent = {
  key: string;
  title: string;
  marks: number;
  role: ComponentRole;
};

export type OfficialSource = {
  url: string;
  document: string;
  session: string;
  pdfPage: number;
  /** FORMAT = Q1-23 skeleton; COMPONENTS = per-subject content allocation. */
  verifiedScope: Array<"FORMAT" | "COMPONENTS">;
  /** TWO_READERS = read independently by two reviewers; SINGLE_READER = one. */
  confirmation: "TWO_READERS" | "SINGLE_READER";
};

export type OfficialScheme = {
  classLevel: number;
  subject: string;
  totalMarks: number;
  components: MarkingComponent[];
  source: OfficialSource;
};

const DOC = "अंक योजना 2026-27 (MarksScheme_2026_27.pdf)";
const URL = "https://mpbse.nic.in/MarksScheme_2026_27.pdf";
const src = (pdfPage: number, confirmation: OfficialSource["confirmation"]): OfficialSource => ({
  url: URL,
  document: DOC,
  session: "2026-27",
  pdfPage,
  verifiedScope: ["FORMAT", "COMPONENTS"],
  confirmation,
});

const c = (key: string, title: string, marks: number, role: ComponentRole = "STANDARD"): MarkingComponent => ({
  key,
  title,
  marks,
  role,
});

export const OFFICIAL_SCHEMES_2026_27: OfficialScheme[] = [
  {
    classLevel: 9,
    subject: "Hindi",
    totalMarks: 75,
    source: src(2, "SINGLE_READER"),
    components: [
      c("kshitij1.poetry", "क्षितिज भाग-1 काव्य खण्ड", 17, "LITERATURE"),
      c("kavya-bodh", "काव्य बोध", 10, "GRAMMAR"),
      c("kshitij1.prose", "क्षितिज भाग-1 गद्य खण्ड", 17, "LITERATURE"),
      c("bhasha-bodh", "भाषा बोध", 8, "GRAMMAR"),
      c("kritika1", "कृतिका भाग-1", 8, "LITERATURE"),
      c("unseen", "अपठित बोध (काव्यांश / गद्यांश)", 4, "PASSAGE"),
      c("letter", "पत्र लेखन", 4, "WRITING"),
      c("composition", "अनुच्छेद / संवाद / विज्ञापन / सूचना लेखन एवं निबंध", 7, "WRITING"),
    ],
  },
  {
    classLevel: 10,
    subject: "Hindi",
    totalMarks: 75,
    source: src(20, "TWO_READERS"),
    components: [
      c("kshitij2.poetry", "क्षितिज भाग-2 काव्य खण्ड", 17, "LITERATURE"),
      c("kavya-bodh", "काव्य बोध", 10, "GRAMMAR"),
      c("kshitij2.prose", "क्षितिज भाग-2 गद्य खण्ड", 17, "LITERATURE"),
      c("bhasha-bodh", "भाषा बोध", 8, "GRAMMAR"),
      c("kritika2", "कृतिका भाग-2", 8, "LITERATURE"),
      c("unseen", "अपठित बोध (काव्यांश / गद्यांश)", 4, "PASSAGE"),
      c("letter", "पत्र लेखन", 4, "WRITING"),
      c("composition", "अनुच्छेद / निबंध लेखन", 7, "WRITING"),
    ],
  },
  ...[11, 12].map(
    (classLevel): OfficialScheme => ({
      classLevel,
      subject: "Hindi",
      totalMarks: 80,
      source: src(classLevel === 11 ? 38 : 86, classLevel === 11 ? "TWO_READERS" : "SINGLE_READER"),
      components: [
        c("aroh.poetry", `आरोह भाग-${classLevel - 10} काव्य खण्ड`, 17, "LITERATURE"),
        c("kavya-bodh", "काव्य बोध", 9, "GRAMMAR"),
        c("aroh.prose", `आरोह भाग-${classLevel - 10} गद्य खण्ड`, 17, "LITERATURE"),
        c("bhasha-bodh", "भाषा बोध", 12, "GRAMMAR"),
        c("vitan", `वितान भाग-${classLevel - 10}`, 7, "LITERATURE"),
        c("abhivyakti", "अभिव्यक्ति और माध्यम", 7, "WRITING"),
        c("unseen", "अपठित बोध", 3, "PASSAGE"),
        c("letter", "पत्र लेखन", 4, "WRITING"),
        c("essay", "निबंध लेखन", 4, "WRITING"),
      ],
    }),
  ),
  ...[9, 10].map(
    (classLevel): OfficialScheme => ({
      classLevel,
      subject: "Sanskrit",
      totalMarks: 75,
      source: src(classLevel === 9 ? 7 : 25, classLevel === 10 ? "TWO_READERS" : "SINGLE_READER"),
      components: [
        c("shabdarupani-avyaya", "शब्दरूपाणि + अव्ययाः", 6, "GRAMMAR"),
        c("dhaturupani-upasarga", "धातुरूपाणि + उपसर्गाः", 6, "GRAMMAR"),
        c("sandhi-samasa", "सन्धयः + समासाः", 6, "GRAMMAR"),
        c("pratyaya-ekapada", "प्रत्ययाः + एकपदेन प्रश्नोत्तराणि", 6, "GRAMMAR"),
        c("visheshana-paryaya-viloma", "विशेषणं / विशेष्यम् + पर्यायाः + विलोमाः", 6, "GRAMMAR"),
        c("pathagata-prashnottara", "पाठगतप्रश्नोत्तराणि", 10, "LITERATURE"),
        c("prashnanirmana", "प्रश्ननिर्माणम्", 2, "GRAMMAR"),
        c("kah-kam-prati", "कः कं प्रति कथयति", 2, "LITERATURE"),
        c("shloka-kanthasthikarana", "श्लोककण्ठस्थीकरणम् (पाठ्यपुस्तकात्)", 2, "LITERATURE"),
        c("ashuddha-karaka", "अशुद्धकारकसंशोधनम्", 2, "GRAMMAR"),
        c("pathagata-rikta", "पाठगतरिक्तस्थानपूर्तिः", 2, "LITERATURE"),
        c("katha-kramasanyojana", "पाठाधारितकथाक्रमसंयोजनम्", 2, "LITERATURE"),
        c("vachya-parivartana", "वाच्यपरिवर्तनम्", 2, "GRAMMAR"),
        c("gadyamsha", "गद्यांशम् अधिकृत्य अवबोधनात्मकप्रश्नाः", 3, "PASSAGE"),
        c("padyamsha", "पद्यांशम् अधिकृत्य अवबोधनात्मकप्रश्नाः", 3, "PASSAGE"),
        c("natyamsha", "नाट्यांशम् अधिकृत्य अवबोधनात्मकप्रश्नाः", 3, "PASSAGE"),
        c("apathita-gadyamsha", "अपठितगद्यांशम्", 4, "PASSAGE"),
        c("patra", "पत्रलेखनम् / आवेदनपत्रलेखनम्", 4, "WRITING"),
        c("nibandha", "निबन्धलेखनम्", 4, "WRITING"),
      ],
    }),
  ),
  {
    classLevel: 11,
    subject: "Sanskrit",
    totalMarks: 80,
    source: src(43, "SINGLE_READER"),
    components: [
      c("samasa-sandhi", "समासाः + सन्धयः", 6, "GRAMMAR"),
      c("dhatu-upasarga", "धातुरूपाणि + उपसर्गाः", 7, "GRAMMAR"),
      c("pratyaya-avyaya", "प्रत्ययाः + अव्ययाः", 6, "GRAMMAR"),
      c("paryaya-viloma-ekapada", "पर्यायाः + विलोमाः + एकपदेन उत्तरम्", 7, "GRAMMAR"),
      c("visheshana-karaka", "विशेषणं + विशेष्यं + कारकाः", 6, "GRAMMAR"),
      c("pathagata-prashnottara", "पाठगतप्रश्नोत्तराणि", 10, "LITERATURE"),
      c("subhashita-shloka", "कण्ठस्थीकरणं सुभाषितश्लोकम्", 2, "LITERATURE"),
      c("prashnanirmana", "प्रश्ननिर्माणम्", 2, "GRAMMAR"),
      c("kah-kam-prati", "कः कं प्रति कथयति", 2, "LITERATURE"),
      c("sahitya-parichaya", "संस्कृतसाहित्यपरिचयाधारितानि प्रश्नानि", 4, "LITERATURE"),
      c("gadyamsha", "गद्यांशम्", 3, "PASSAGE"),
      c("padyamsha", "पद्यांशम्", 3, "PASSAGE"),
      c("natyamsha", "नाट्यांशम्", 3, "PASSAGE"),
      c("pathagata-rikta", "पाठगतरिक्तस्थानपूर्तिः", 3, "LITERATURE"),
      c("apathita-gadyamsha", "अपठितगद्यांशम्", 4, "PASSAGE"),
      c("anuchheda-katha", "संकेताधारितम् अनुच्छेदलेखनम् / कथालेखनम्", 4, "WRITING"),
      c("patra", "पत्रम् / आवेदनपत्रम्", 4, "WRITING"),
      c("kavi-parichaya", "कविपरिचयः", 4, "LITERATURE"),
    ],
  },
  {
    classLevel: 12,
    subject: "Sanskrit",
    totalMarks: 80,
    source: src(91, "TWO_READERS"),
    components: [
      c("samasa-sandhi", "समासाः + सन्धयः", 6, "GRAMMAR"),
      c("dhatu-upasarga", "धातुरूपाणि + उपसर्गाः", 7, "GRAMMAR"),
      c("pratyaya-avyaya", "प्रत्ययाः + अव्ययाः", 6, "GRAMMAR"),
      c("paryaya-viloma-ekapada", "पर्यायः + विलोमः + एकपदेन प्रश्नोत्तराणि", 7, "GRAMMAR"),
      c("visheshana-karaka", "विशेषणं / विशेष्यम् + कारकाः", 6, "GRAMMAR"),
      c("pathagata-prashnottara", "पाठगतप्रश्नोत्तराणि", 10, "LITERATURE"),
      c("subhashita-shloka", "कण्ठस्थीकरणं सुभाषित श्लोकं", 2, "LITERATURE"),
      c("prashnanirmana", "प्रश्ननिर्माणम्", 2, "GRAMMAR"),
      c("kah-kam-prati", "कः कं प्रति कथयति", 2, "LITERATURE"),
      c("sahitya-parichaya", "संस्कृतसाहित्यपरिचयाधारितानि प्रश्नानि", 4, "LITERATURE"),
      c("gadyamsha", "गद्यांशम्", 3, "PASSAGE"),
      c("padyamsha", "पद्यांशम्", 3, "PASSAGE"),
      c("natyamsha", "नाट्यांशम्", 3, "PASSAGE"),
      c("pathagata-rikta", "पाठगतरिक्तस्थानपूर्तिः", 3, "LITERATURE"),
      c("apathita-gadyamsha", "अपठितगद्यांशम्", 4, "PASSAGE"),
      c("patra", "पत्रम् / आवेदन पत्रम्", 4, "WRITING"),
      c("anuchheda-katha", "संकेताधारितम् अनुच्छेदलेखनम् / कथालेखनम्", 4, "WRITING"),
      c("kavi-parichaya", "कविपरिचयः", 4, "LITERATURE"),
    ],
  },
  ...[9, 10].map(
    (classLevel): OfficialScheme => ({
      classLevel,
      subject: "English",
      totalMarks: 75,
      source: src(classLevel === 9 ? 4 : 22, "SINGLE_READER"),
      components: [
        c("reading", "Section A: Reading (two unseen passages, 5 marks each)", 10, "PASSAGE"),
        c("writing", "Section B: Writing", 16, "WRITING"),
        c("grammar", "Section C: Grammar", 10, "GRAMMAR"),
        c("textbooks", "Section D: Textbooks", 39, "LITERATURE"),
      ],
    }),
  ),
  ...[11, 12].map(
    (classLevel): OfficialScheme => ({
      classLevel,
      subject: "English",
      totalMarks: 80,
      source: src(classLevel === 11 ? 40 : 88, "SINGLE_READER"),
      components: [
        c("reading", "Section A: Reading (unseen passage 10 + note-making 4)", 14, "PASSAGE"),
        c("writing", "Section B: Writing", 12, "WRITING"),
        c("grammar", "Section C: Grammar", 10, "GRAMMAR"),
        c("textbooks", "Section D: Textbooks", 44, "LITERATURE"),
      ],
    }),
  ),
  {
    classLevel: 9,
    subject: "Urdu",
    totalMarks: 75,
    source: src(8, "SINGLE_READER"),
    components: [
      c("nasr", "हिस्सा नस्र (Prose)", 30, "LITERATURE"),
      c("nazm", "हिस्सा नज़्म (Poetry)", 23, "LITERATURE"),
      c("qawaid", "हिस्सा क़वाइद (Grammar)", 10, "GRAMMAR"),
      c("letter", "ख़त / दरख़्वास्त", 4, "WRITING"),
      c("mazmoon", "मज़मून (Essay)", 4, "WRITING"),
      c("unseen", "ग़ैर दर्सी इक़्तिबास (Unseen passage)", 4, "PASSAGE"),
    ],
  },
];

/**
 * Question-format skeleton printed under every 2026-27 scheme.
 * Verified for classes 9/10 (75 marks) and 11/12 (80 marks); Biology 11/12 (70 marks).
 * Physics and Chemistry 70-mark skeletons were located but not read in detail.
 */
export type FormatSkeleton = { marksEach: number; count: number }[];
export const OFFICIAL_FORMAT_2026_27 = {
  "9-10:75": [
    { marksEach: 1, count: 30 },
    { marksEach: 2, count: 12 },
    { marksEach: 3, count: 3 },
    { marksEach: 4, count: 3 },
  ],
  "11-12:80": [
    { marksEach: 1, count: 32 },
    { marksEach: 2, count: 10 },
    { marksEach: 3, count: 4 },
    { marksEach: 4, count: 4 },
  ],
  "biology:70": [
    { marksEach: 1, count: 28 },
    { marksEach: 2, count: 7 },
    { marksEach: 3, count: 4 },
    { marksEach: 4, count: 4 },
  ],
} satisfies Record<string, FormatSkeleton>;

export function findOfficialScheme(classLevel?: number, subject?: string): OfficialScheme | undefined {
  if (!classLevel || !subject) return undefined;
  const s = subject.trim().toLowerCase();
  return OFFICIAL_SCHEMES_2026_27.find((x) => x.classLevel === classLevel && x.subject.toLowerCase() === s);
}
