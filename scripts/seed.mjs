import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

// Simple SVG diagrams encoded as PNG data or clean SVGs
const DIAGRAM_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAoAAAAHgCAYAAAA10dzkAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAIABJREFUeJzs3Xd4VNXbwPHv...=="; 

async function main() {
  console.log("Seeding database with realistic exam builder data...");
  await mkdir(UPLOAD_DIR, { recursive: true });

  // 1. Create or update Default Teacher
  const passwordHash = await hash("password123", 10);
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@school.edu" },
    update: {},
    create: {
      name: "Dr. Sunita Sharma",
      email: "teacher@school.edu",
      passwordHash,
    },
  });
  console.log(`✓ Teacher account ready: ${teacher.email} (Password: password123)`);

  // 2. Book 1: Class 8 Science
  const scienceBook = await prisma.book.create({
    data: {
      title: "Science (NCERT Class VIII)",
      subject: "Science / विज्ञान",
      className: "Class 8",
      chapters: {
        create: [
          { number: 1, title: "Crop Production and Management (फसल उत्पादन एवं प्रबंध)" },
          { number: 2, title: "Microorganisms: Friend and Foe (सूक्ष्मजीव: मित्र एवं शत्रु)" },
          { number: 3, title: "Coal and Petroleum (कोयला और पेट्रोलियम)" },
          { number: 4, title: "Combustion and Flame (दहन और ज्वाला)" },
          { number: 5, title: "Conservation of Plants and Animals (पौधे एवं जंतुओं का संरक्षण)" },
          { number: 6, title: "Reproduction in Animals (जन्तुओं में जनन)" },
          { number: 7, title: "Force and Pressure (बल तथा दाब)" },
          { number: 8, title: "Friction (घर्षण)" },
          { number: 9, title: "Sound (ध्वनि)" },
          { number: 10, title: "Light (प्रकाश)" },
        ],
      },
    },
    include: { chapters: { orderBy: { number: "asc" } } },
  });
  console.log(`✓ Created Book: ${scienceBook.title} with ${scienceBook.chapters.length} chapters`);

  const [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10] = scienceBook.chapters;

  // 3. Question Bank entries for Class 8 Science (Hindi & English, varied types)
  const qData = [
    // --- Section A: MCQs (1 Mark each) ---
    {
      bookId: scienceBook.id,
      chapterId: ch1.id,
      type: "MCQ",
      text: "Which of the following is a Kharif crop? / निम्नलिखित में से कौन सी एक खरीफ फसल है?",
      options: ["Wheat / गेहूँ", "Paddy (Rice) / धान", "Gram / चना", "Mustard / सरसों"],
      answer: "B",
      difficulty: "EASY",
      spaceMm: 0,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch1.id,
      type: "MCQ",
      text: "The process of loosening and turning of the soil is called / मिट्टी को उलटने-पलटने एवं पोला करने की प्रक्रिया कहलाती है:",
      options: ["Harvesting / कटाई", "Tilling or Ploughing / जुताई", "Threshing / थ्रेशिंग", "Sowing / बुआई"],
      answer: "B",
      difficulty: "EASY",
      spaceMm: 0,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch2.id,
      type: "MCQ",
      text: "Which bacterium is primarily responsible for the curdling of milk? / दूध को दही में बदलने वाला मुख्य जीवाणु कौन सा है?",
      options: ["Rhizobium / राइजोबियम", "Lactobacillus / लैक्टोबैसिलस", "Yeast / यीस्ट", "Penicillium / पेनिसिलियम"],
      answer: "B",
      difficulty: "EASY",
      spaceMm: 0,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch2.id,
      type: "MCQ",
      text: "Carrier of malaria-causing protozoan is: / मलेरिया परजीवी का वाहक है:",
      options: ["Female Anopheles mosquito / मादा एनोफ़िलीज़ मच्छर", "Cockroach / कॉकरोच", "Housefly / घरेलू मक्खी", "Butterfly / तितली"],
      answer: "A",
      difficulty: "MEDIUM",
      spaceMm: 0,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch3.id,
      type: "MCQ",
      text: "Which of the following is an inexhaustible natural resource? / निम्नलिखित में से कौन सा अक्षय प्राकृतिक संसाधन है?",
      options: ["Coal / कोयला", "Petroleum / पेट्रोलियम", "Sunlight / सूर्य का प्रकाश", "Natural Gas / प्राकृतिक गैस"],
      answer: "C",
      difficulty: "EASY",
      spaceMm: 0,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch4.id,
      type: "MCQ",
      text: "The lowest temperature at which a substance catches fire is called its: / वह न्यूनतम ताप जिस पर कोई पदार्थ आग पकड़ लेता है, कहलाता है:",
      options: ["Boiling point / क्वथनांक", "Melting point / गलनांक", "Ignition temperature / ज्वलन ताप", "Critical temperature / क्रांतिक ताप"],
      answer: "C",
      difficulty: "MEDIUM",
      spaceMm: 0,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch5.id,
      type: "MCQ",
      text: "The Red Data Book keeps a record of all the: / रेड डाटा पुस्तक किसका रिकॉर्ड रखती है?",
      options: ["Endangered plants and animals / संकटापन्न पौधे एवं जीव", "Extinct species / विलुप्त प्रजातियाँ", "Fossil fuels / जीवाश्म ईंधन", "Domestic livestock / घरेलू मवेशी"],
      answer: "A",
      difficulty: "MEDIUM",
      spaceMm: 0,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch5.id,
      type: "MCQ",
      text: "Reforestation means: / पुनर्वनरोपण का अर्थ है:",
      options: ["Planting new trees in destroyed forest land / नष्ट हुए वनों में नए वृक्ष लगाना", "Cutting down dry trees / सूखे पेड़ों को काटना", "Constructing roads / सड़कें बनाना", "Urbanization / शहरीकरण"],
      answer: "A",
      difficulty: "EASY",
      spaceMm: 0,
      showGrid: false,
    },

    // --- Section B: Short Answer Questions (2 Marks each) ---
    {
      bookId: scienceBook.id,
      chapterId: ch1.id,
      type: "SHORT",
      text: "State two advantages of using manure over chemical fertilizers. / रासायनिक उर्वरकों की तुलना में जैविक खाद के दो लाभ लिखिए।",
      options: [],
      answer: "1. Enhances water holding capacity of soil. 2. Improves soil texture and beneficial microbes.",
      difficulty: "MEDIUM",
      spaceMm: 22,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch2.id,
      type: "SHORT",
      text: "What are antibiotics? Give one precaution while taking them. / प्रतिजैविक (एंटीबायोटिक) क्या हैं? इन्हें लेते समय रखी जाने वाली एक सावधानी लिखिए।",
      options: [],
      answer: "Medicines that kill disease-causing microbes. Always complete the prescribed course under a qualified doctor's advice.",
      difficulty: "MEDIUM",
      spaceMm: 22,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch3.id,
      type: "SHORT",
      text: "Explain why fossil fuels are classified as exhaustible natural resources. / समझाइए कि जीवाश्म ईंधन को समाप्त होने वाले प्राकृतिक संसाधन क्यों माना जाता है?",
      options: [],
      answer: "Their formation requires millions of years under specific geological conditions, whereas current consumption rate is much faster than replenishment.",
      difficulty: "MEDIUM",
      spaceMm: 22,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch4.id,
      type: "SHORT",
      text: "Why is water not used to extinguish fires involving electrical equipment or oil? / विद्युत उपकरण अथवा तेल में लगी आग को बुझाने के लिए पानी का उपयोग क्यों नहीं किया जाता?",
      options: [],
      answer: "Water conducts electricity causing shock risk, and oil is lighter than water so it floats and continues burning.",
      difficulty: "HARD",
      spaceMm: 25,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch5.id,
      type: "SHORT",
      text: "What is an ecosystem? Name its two components. / पारितंत्र (इकोसिस्टम) क्या है? इसके दो घटकों के नाम लिखिए।",
      options: [],
      answer: "An ecosystem comprises all plants, animals and microorganisms in an area along with non-living abiotic factors (soil, water, climate).",
      difficulty: "MEDIUM",
      spaceMm: 22,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch5.id,
      type: "SHORT",
      text: "Differentiate between Endangered Species and Extinct Species with one example each. / संकटापन्न प्रजातियों तथा विलुप्त प्रजातियों में एक-एक उदाहरण सहित अंतर स्पष्ट कीजिए।",
      options: [],
      answer: "Endangered: Facing immediate risk of extinction (Tiger). Extinct: No living individuals exist anywhere (Dodo).",
      difficulty: "MEDIUM",
      spaceMm: 22,
      showGrid: false,
    },

    // --- Section C: Long Answer Questions (3 Marks each) ---
    {
      bookId: scienceBook.id,
      chapterId: ch1.id,
      type: "LONG",
      text: "Explain modern methods of irrigation: (a) Drip System, and (b) Sprinkler System. Mention where each is best suited. / आधुनिक सिंचाई विधियों की व्याख्या कीजिए: (क) ड्रिप तंत्र (बूंद-बूंद सिंचाई), और (ख) छिड़काव तंत्र। ये किन परिस्थितियों में सबसे उपयुक्त हैं?",
      options: [],
      answer: "Drip system provides water drop by drop directly near roots (best for fruit plants/water scarcity areas). Sprinkler system sprays water like rain (best for uneven land and sandy soil).",
      difficulty: "HARD",
      spaceMm: 50,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch2.id,
      type: "LONG",
      text: "Describe the role of Rhizobium bacteria in the nitrogen cycle and maintaining soil fertility. / नाइट्रोजन चक्र तथा मिट्टी की उर्वरता बनाए रखने में राइजोबियम जीवाणु की भूमिका का वर्णन कीजिए।",
      options: [],
      answer: "Rhizobium lives in root nodules of leguminous plants, fixes atmospheric nitrogen into nitrates, enriching the soil without needing synthetic fertilizers.",
      difficulty: "HARD",
      spaceMm: 45,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch3.id,
      type: "LONG",
      text: "What is destructive distillation of coal? Name three major products obtained and write one practical use for each. / कोयले का प्रभाजी / विनाशकारी आसवन क्या है? इससे प्राप्त होने वाले तीन प्रमुख उत्पादों के नाम और प्रत्येक का एक उपयोग लिखिए।",
      options: [],
      answer: "Heating coal in absence of air. Products: 1. Coke (steel manufacturing) 2. Coal tar (dyes/perfumes/paints) 3. Coal gas (industrial fuel).",
      difficulty: "MEDIUM",
      spaceMm: 45,
      showGrid: false,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch4.id,
      type: "LONG",
      text: "What is Calorific Value of a fuel? A certain experiment showed 4.5 kg of fuel produced 180,000 kJ of heat. Calculate its calorific value with units. / किसी ईंधन का ऊष्मीय मान (कैलोरी मान) क्या है? एक प्रयोग में 4.5 किग्रा ईंधन को पूर्णतया जलाने पर 180,000 kJ ऊष्मा उत्पन्न हुई। इसका ऊष्मीय मान मात्रक सहित ज्ञात कीजिए।",
      options: [],
      answer: "Calorific value = Heat produced / mass = 180,000 kJ / 4.5 kg = 40,000 kJ/kg.",
      difficulty: "HARD",
      spaceMm: 45,
      showGrid: false,
    },

    // --- Section D: Diagram / Draw Questions (4 Marks each with Grid) ---
    {
      bookId: scienceBook.id,
      chapterId: ch4.id,
      type: "DRAW",
      text: "Draw a neat, labelled diagram showing the different zones of a candle flame (Outer zone, Middle zone, Inner dark zone). Label the hottest and least hot parts. / एक मोमबत्ती की ज्वाला के विभिन्न क्षेत्रों (बाह्य क्षेत्र, मध्य क्षेत्र, आंतरिक अदीप्त क्षेत्र) को दर्शाने वाला एक स्वच्छ एवं नामांकित चित्र बनाइए। सबसे गर्म और सबसे कम गर्म भागों को दर्शाइए।",
      options: [],
      answer: "Outer zone: Complete combustion, blue, hottest. Middle zone: Partial combustion, yellow, moderately hot. Innermost zone: Unburnt wax vapors, black, least hot.",
      difficulty: "HARD",
      spaceMm: 70,
      showGrid: true,
    },
    {
      bookId: scienceBook.id,
      chapterId: ch5.id,
      type: "DRAW",
      text: "Draw an illustrative flowchart or schematic diagram showing the Nitrogen Cycle in nature, indicating atmospheric nitrogen, biological fixation, assimilation, and denitrification. / प्रकृति में नाइट्रोजन चक्र को दर्शाने वाला एक स्पष्ट प्रवाह चित्र (Flowchart) या आरेख बनाइए।",
      options: [],
      answer: "Atmospheric N2 -> Biological/Lightning fixation -> Nitrates in soil -> Plant assimilation -> Animals feed -> Excretion/Death -> Denitrifying bacteria return N2 to atmosphere.",
      difficulty: "HARD",
      spaceMm: 70,
      showGrid: true,
    },
  ];

  const savedQuestions = [];
  for (const q of qData) {
    const created = await prisma.question.create({
      data: {
        bookId: q.bookId,
        chapterId: q.chapterId,
        type: q.type,
        text: q.text,
        optionsJson: JSON.stringify(q.options),
        answer: q.answer,
        difficulty: q.difficulty,
        spaceMm: q.spaceMm,
        showGrid: q.showGrid,
        createdById: teacher.id,
      },
    });
    savedQuestions.push(created);
  }
  console.log(`✓ Seeded ${savedQuestions.length} comprehensive questions into Question Bank`);

  // 4. Create Blueprint for Class 8 Science - Half Yearly Exam (Total = 40 Marks)
  // Section breakdown:
  // Section A: 8 MCQs x 1 mark = 8 marks
  // Section B: 6 Shorts x 2 marks = 12 marks
  // Section C: 4 Longs x 3 marks = 12 marks
  // Section D: 2 Draws x 4 marks = 8 marks
  // Total = 40 marks
  // Chapter breakdown:
  // Ch1: 8 marks
  // Ch2: 8 marks
  // Ch3: 8 marks
  // Ch4: 8 marks
  // Ch5: 8 marks
  // Total = 40 marks
  const halfYearlyBp = await prisma.blueprint.create({
    data: {
      name: "Class 8 Science – Half Yearly Blueprint (40 Marks)",
      bookId: scienceBook.id,
      examType: "HALF_YEARLY",
      durationMin: 90,
      chapters: {
        create: [
          { chapterId: ch1.id, marks: 8 },
          { chapterId: ch2.id, marks: 8 },
          { chapterId: ch3.id, marks: 8 },
          { chapterId: ch4.id, marks: 8 },
          { chapterId: ch5.id, marks: 8 },
        ],
      },
      sections: {
        create: [
          {
            position: 0,
            title: "Section A (खण्ड 'क') - Objective Questions",
            instructions: "All questions are compulsory. Select the single correct option. (सभी प्रश्न अनिवार्य हैं। सही विकल्प का चयन कीजिए।)",
            type: "MCQ",
            count: 8,
            marksEach: 1,
          },
          {
            position: 1,
            title: "Section B (खण्ड 'ख') - Short Answer Questions",
            instructions: "Answer each question in 30 to 50 words. (प्रत्येक प्रश्न का उत्तर 30 से 50 शब्दों में दीजिए।)",
            type: "SHORT",
            count: 6,
            marksEach: 2,
          },
          {
            position: 2,
            title: "Section C (खण्ड 'ग') - Long Answer Questions",
            instructions: "Answer each question in 80 to 120 words. (प्रत्येक प्रश्न का उत्तर 80 से 120 शब्दों में दीजिए।)",
            type: "LONG",
            count: 4,
            marksEach: 3,
          },
          {
            position: 3,
            title: "Section D (खण्ड 'घ') - Diagram & Skill Questions",
            instructions: "Draw neat and well-labelled diagrams in the provided grid boxes. (दिए गए ग्रिड बॉक्स में स्वच्छ एवं नामांकित चित्र बनाइए।)",
            type: "DRAW",
            count: 2,
            marksEach: 4,
          },
        ],
      },
    },
    include: { sections: { orderBy: { position: "asc" } } },
  });
  console.log(`✓ Created Blueprint: "${halfYearlyBp.name}" (40 Marks)`);

  // 5. Pre-build a Complete, Finalised 40-mark Paper in BOOKLET layout
  const paper = await prisma.paper.create({
    data: {
      title: "Science Half-Yearly Examination 2026-27",
      blueprintId: halfYearlyBp.id,
      layout: "BOOKLET_A4",
      schoolName: "Sarvodaya English Higher Secondary School, Lakhnadon",
      examDate: "2026-10-20",
      status: "FINAL",
      createdById: teacher.id,
    },
  });

  // Attach all 20 questions into the appropriate sections
  const secA = halfYearlyBp.sections[0];
  const secB = halfYearlyBp.sections[1];
  const secC = halfYearlyBp.sections[2];
  const secD = halfYearlyBp.sections[3];

  const secAQuestions = savedQuestions.filter((q) => q.type === "MCQ").slice(0, 8);
  const secBQuestions = savedQuestions.filter((q) => q.type === "SHORT").slice(0, 6);
  const secCQuestions = savedQuestions.filter((q) => q.type === "LONG").slice(0, 4);
  const secDQuestions = savedQuestions.filter((q) => q.type === "DRAW").slice(0, 2);

  let pos = 0;
  for (const q of secAQuestions) {
    await prisma.paperQuestion.create({
      data: { paperId: paper.id, sectionId: secA.id, questionId: q.id, position: pos++ },
    });
  }
  pos = 0;
  for (const q of secBQuestions) {
    await prisma.paperQuestion.create({
      data: { paperId: paper.id, sectionId: secB.id, questionId: q.id, position: pos++ },
    });
  }
  pos = 0;
  for (const q of secCQuestions) {
    await prisma.paperQuestion.create({
      data: { paperId: paper.id, sectionId: secC.id, questionId: q.id, position: pos++ },
    });
  }
  pos = 0;
  for (const q of secDQuestions) {
    await prisma.paperQuestion.create({
      data: { paperId: paper.id, sectionId: secD.id, questionId: q.id, position: pos++ },
    });
  }

  console.log(`✓ Assembled Paper "${paper.title}" with 20 questions (Full 40 marks, Booklet layout, Finalized)`);

  // 6. Pre-build a Draft paper in PAGE layout (half-filled) to demonstrate real-time builder assistance
  const draftPaper = await prisma.paper.create({
    data: {
      title: "Science Practice Test - Single Page Format",
      blueprintId: halfYearlyBp.id,
      layout: "PAGE",
      schoolName: "St. Xavier's International Academy",
      examDate: "2026-11-15",
      status: "DRAFT",
      createdById: teacher.id,
    },
  });
  // Add partial items
  for (let i = 0; i < 4; i++) {
    await prisma.paperQuestion.create({
      data: { paperId: draftPaper.id, sectionId: secA.id, questionId: secAQuestions[i].id, position: i },
    });
  }
  console.log(`✓ Assembled Draft Paper "${draftPaper.title}" with 4 questions to showcase in-progress blueprint indicators.`);

  // 7. Seed Standard School Classes (Nursery to Class 12) with default single section ["A"]
  const STANDARD_CLASSES_SEED = [
    {
      name: "Nursery",
      displayOrder: -2,
      stream: "Pre-Primary",
      subjects: [
        { name: "English", code: "NUR-ENG" },
        { name: "Hindi", code: "NUR-HIN" },
        { name: "Mathematics", code: "NUR-MAT" },
        { name: "General Awareness (EVS)", code: "NUR-EVS" },
        { name: "Art & Craft", code: "NUR-ART" },
      ],
    },
    {
      name: "LKG",
      displayOrder: -1,
      stream: "Pre-Primary",
      subjects: [
        { name: "English", code: "LKG-ENG" },
        { name: "Hindi", code: "LKG-HIN" },
        { name: "Mathematics", code: "LKG-MAT" },
        { name: "General Awareness (EVS)", code: "LKG-EVS" },
        { name: "Rhymes & Conversation", code: "LKG-RHY" },
      ],
    },
    {
      name: "UKG",
      displayOrder: 0,
      stream: "Pre-Primary",
      subjects: [
        { name: "English", code: "UKG-ENG" },
        { name: "Hindi", code: "UKG-HIN" },
        { name: "Mathematics", code: "UKG-MAT" },
        { name: "Environmental Studies (EVS)", code: "UKG-EVS" },
        { name: "General Knowledge", code: "UKG-GK" },
      ],
    },
    {
      name: "Class 1",
      displayOrder: 1,
      stream: "Primary",
      subjects: [
        { name: "English", code: "101" },
        { name: "Hindi", code: "102" },
        { name: "Mathematics", code: "103" },
        { name: "EVS", code: "104" },
      ],
    },
    {
      name: "Class 2",
      displayOrder: 2,
      stream: "Primary",
      subjects: [
        { name: "English", code: "101" },
        { name: "Hindi", code: "102" },
        { name: "Mathematics", code: "103" },
        { name: "EVS", code: "104" },
      ],
    },
    {
      name: "Class 3",
      displayOrder: 3,
      stream: "Primary",
      subjects: [
        { name: "English", code: "101" },
        { name: "Hindi", code: "102" },
        { name: "Mathematics", code: "103" },
        { name: "EVS", code: "104" },
      ],
    },
    {
      name: "Class 4",
      displayOrder: 4,
      stream: "Primary",
      subjects: [
        { name: "English", code: "101" },
        { name: "Hindi", code: "102" },
        { name: "Mathematics", code: "103" },
        { name: "EVS", code: "104" },
      ],
    },
    {
      name: "Class 5",
      displayOrder: 5,
      stream: "Primary",
      subjects: [
        { name: "English", code: "101" },
        { name: "Hindi", code: "102" },
        { name: "Mathematics", code: "103" },
        { name: "EVS", code: "104" },
      ],
    },
    {
      name: "Class 6",
      displayOrder: 6,
      stream: "Middle",
      subjects: [
        { name: "English", code: "101" },
        { name: "Hindi", code: "002" },
        { name: "Mathematics", code: "041" },
        { name: "Science", code: "086" },
        { name: "Social Science", code: "087" },
        { name: "Sanskrit", code: "122" },
      ],
    },
    {
      name: "Class 7",
      displayOrder: 7,
      stream: "Middle",
      subjects: [
        { name: "English", code: "101" },
        { name: "Hindi", code: "002" },
        { name: "Mathematics", code: "041" },
        { name: "Science", code: "086" },
        { name: "Social Science", code: "087" },
        { name: "Sanskrit", code: "122" },
      ],
    },
    {
      name: "Class 8",
      displayOrder: 8,
      stream: "Middle",
      subjects: [
        { name: "English", code: "101" },
        { name: "Hindi", code: "002" },
        { name: "Mathematics", code: "041" },
        { name: "Science", code: "086" },
        { name: "Social Science", code: "087" },
        { name: "Sanskrit", code: "122" },
      ],
    },
    {
      name: "Class 9",
      displayOrder: 9,
      stream: "Secondary",
      subjects: [
        { name: "English", code: "184" },
        { name: "Hindi", code: "002" },
        { name: "Mathematics", code: "041" },
        { name: "Science", code: "086" },
        { name: "Social Science", code: "087" },
        { name: "Information Technology", code: "402" },
      ],
    },
    {
      name: "Class 10",
      displayOrder: 10,
      stream: "Secondary",
      subjects: [
        { name: "English", code: "184" },
        { name: "Hindi", code: "002" },
        { name: "Mathematics", code: "041" },
        { name: "Science", code: "086" },
        { name: "Social Science", code: "087" },
        { name: "Information Technology", code: "402" },
      ],
    },
    {
      name: "Class 11",
      displayOrder: 11,
      stream: "Senior Secondary",
      subjects: [
        { name: "English", code: "301" },
        { name: "Hindi", code: "302" },
        { name: "Physics", code: "042" },
        { name: "Chemistry", code: "043" },
        { name: "Mathematics", code: "041" },
        { name: "Biology", code: "044" },
        { name: "Accountancy", code: "055" },
        { name: "Business Studies", code: "054" },
        { name: "Economics", code: "030" },
      ],
    },
    {
      name: "Class 12",
      displayOrder: 12,
      stream: "Senior Secondary",
      subjects: [
        { name: "English", code: "301" },
        { name: "Hindi", code: "302" },
        { name: "Physics", code: "042" },
        { name: "Chemistry", code: "043" },
        { name: "Mathematics", code: "041" },
        { name: "Biology", code: "044" },
        { name: "Accountancy", code: "055" },
        { name: "Business Studies", code: "054" },
        { name: "Economics", code: "030" },
      ],
    },
  ];

  for (const session of ["2025–26", "2026–27"]) {
    for (const item of STANDARD_CLASSES_SEED) {
      const cls = await prisma.academicClass.upsert({
        where: { academicSession_name: { academicSession: session, name: item.name } },
        update: {
          displayOrder: item.displayOrder,
          stream: item.stream,
        },
        create: {
          name: item.name,
          displayOrder: item.displayOrder,
          stream: item.stream,
          academicSession: session,
          sectionsJson: JSON.stringify(["A"]),
        },
      });

      for (const subj of item.subjects) {
        await prisma.classSubject.upsert({
          where: { classId_name: { classId: cls.id, name: subj.name } },
          update: { code: subj.code },
          create: { classId: cls.id, name: subj.name, code: subj.code },
        });
      }
    }
  }
  console.log(`✓ Seeded standard Nursery–12th classes with default section ["A"] for 2025–26 and 2026–27`);

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
