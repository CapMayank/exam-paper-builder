import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Kindergarten (Nursery, LKG, UKG) workbook papers & question bank...");

  // 1. Get or create teacher user
  let teacher = await prisma.user.findFirst({ where: { email: "teacher@school.edu" } });
  if (!teacher) {
    teacher = await prisma.user.findFirst();
  }
  if (!teacher) {
    console.error("No teacher user found in database. Run main seed first.");
    process.exit(1);
  }

  const session = "2025–26";

  // 2. Academic Class for Nursery, LKG, UKG
  const classesToEnsure = [
    { name: "Nursery", displayOrder: -2 },
    { name: "LKG", displayOrder: -1 },
    { name: "UKG", displayOrder: 0 },
  ];

  for (const c of classesToEnsure) {
    await prisma.academicClass.upsert({
      where: {
        academicSession_name: {
          academicSession: session,
          name: c.name,
        },
      },
      update: { displayOrder: c.displayOrder },
      create: {
        name: c.name,
        displayOrder: c.displayOrder,
        academicSession: session,
        stream: "Pre-Primary",
        sectionsJson: JSON.stringify(["A", "B"]),
      },
    });
  }
  console.log("✓ Pre-primary academic classes ready (Nursery, LKG, UKG)");

  // 3. Create Books for Nursery & LKG
  const nurseryBook = await prisma.book.create({
    data: {
      title: "Nursery Activity Workbook",
      subject: "Foundational English & Math",
      className: "Nursery",
      academicSession: session,
      chapters: {
        create: [
          { number: 1, title: "Pattern Tracing & Capital Letters (A to Z)" },
          { number: 2, title: "Numbers & Counting (1 to 20)" },
          { number: 3, title: "Picture Reading & Phonics Matching" },
          { number: 4, title: "Fun with Shapes & Odd One Out" },
        ],
      },
    },
    include: { chapters: { orderBy: { number: "asc" } } },
  });

  const [ch1, ch2, ch3, ch4] = nurseryBook.chapters;
  console.log(`✓ Created Book: ${nurseryBook.title}`);

  // 4. Create the 6 Kindergarten Questions
  const questionsData = [
    // 1. KDG_TRACE_WRITE: 4-Line English Letter Tracing
    {
      bookId: nurseryBook.id,
      chapterId: ch1.id,
      type: "KDG_TRACE_WRITE",
      text: "Trace and copy the letters neatly on the four-line guide (चार लाइन में सुंदर अक्षर लिखिए):",
      optionsJson: JSON.stringify([
        JSON.stringify({
          rulingType: "FOUR_LINE",
          fontSizePt: 26,
          lines: [
            { promptText: "A   B   C   D   E", traceDotted: false, repeatCount: 2 },
          ],
          instruction: "Trace and copy the letters neatly on the four-line guide:",
        }),
      ]),
      answer: "A B C D E written neatly on 4 lines",
      difficulty: "EASY",
      spaceMm: 0,
      showGrid: false,
      createdById: teacher.id,
    },

    // 2. KDG_NUMBER_GRID: 1 to 50 Number Grid
    {
      bookId: nurseryBook.id,
      chapterId: ch2.id,
      type: "KDG_NUMBER_GRID",
      text: "Fill in the missing numbers in the grid from 1 to 50 (खाली खानों में सही संख्या भरिए):",
      optionsJson: JSON.stringify([
        JSON.stringify({
          startNumber: 1,
          endNumber: 50,
          columns: 10,
          step: 1,
          cells: Array.from({ length: 50 }, (_, i) => ({
            value: i + 1,
            isBlank: (i + 1) % 2 === 0, // Alternate numbers missing
          })),
          instruction: "Fill in the missing numbers in the grid from 1 to 50:",
        }),
      ]),
      answer: "Even numbers 2, 4, 6... 50 filled in",
      difficulty: "MEDIUM",
      spaceMm: 0,
      showGrid: false,
      createdById: teacher.id,
    },

    // 3. KDG_PICTURE_MATCH: Picture to Letter Match
    {
      bookId: nurseryBook.id,
      chapterId: ch3.id,
      type: "KDG_PICTURE_MATCH",
      text: "Look at the pictures and draw a line to match with the correct letter (चित्र पहचानकर सही अक्षर से मिलाइए):",
      optionsJson: JSON.stringify([
        JSON.stringify({
          pairs: [
            { id: "p1", clipartId: "apple", label: "Apple", matchLabel: "A" },
            { id: "p2", clipartId: "ball", label: "Ball", matchLabel: "B" },
            { id: "p3", clipartId: "cat", label: "Cat", matchLabel: "C" },
            { id: "p4", clipartId: "duck", label: "Duck", matchLabel: "D" },
          ],
          shuffleRight: true,
          leftTitle: "Pictures / चित्र",
          rightTitle: "Letters / अक्षर",
          instruction: "Look at the pictures and draw a line to match with the correct letter:",
        }),
      ]),
      answer: "Apple->A, Ball->B, Cat->C, Duck->D",
      difficulty: "EASY",
      spaceMm: 0,
      showGrid: false,
      createdById: teacher.id,
    },

    // 4. KDG_COUNT_ITEMS: Count Balloons & Write
    {
      bookId: nurseryBook.id,
      chapterId: ch2.id,
      type: "KDG_COUNT_ITEMS",
      text: "Count the balloons and write the correct number in the box (गुब्बारे गिनिए और डिब्बे में संख्या लिखिए):",
      optionsJson: JSON.stringify([
        JSON.stringify({
          clipartId: "balloon",
          count: 5,
          layout: "GRID",
          answerStyle: "SQUARE_BOX",
          objectName: "balloons",
          instruction: "Count the balloons and write the correct number in the box:",
        }),
      ]),
      answer: "5",
      difficulty: "EASY",
      spaceMm: 0,
      showGrid: false,
      createdById: teacher.id,
    },

    // 5. KDG_CIRCLE_TARGET: Circle Odd One Out
    {
      bookId: nurseryBook.id,
      chapterId: ch4.id,
      type: "KDG_CIRCLE_TARGET",
      text: "Find and circle the odd picture in each row (प्रत्येक पंक्ति में भिन्न चित्र पर गोला लगाइए):",
      optionsJson: JSON.stringify([
        JSON.stringify({
          mode: "ODD_ONE_OUT",
          targetDescription: "Find and circle the odd picture in each row",
          instruction: "Find and circle the odd picture in each row:",
          rows: [
            {
              rowLabel: "Row 1",
              items: [
                { id: "i1", type: "CLIPART", clipartId: "apple", isTarget: false },
                { id: "i2", type: "CLIPART", clipartId: "apple", isTarget: false },
                { id: "i3", type: "CLIPART", clipartId: "car", isTarget: true }, // odd
                { id: "i4", type: "CLIPART", clipartId: "apple", isTarget: false },
              ],
            },
            {
              rowLabel: "Row 2",
              items: [
                { id: "i5", type: "CLIPART", clipartId: "cat", isTarget: false },
                { id: "i6", type: "CLIPART", clipartId: "kite", isTarget: true }, // odd
                { id: "i7", type: "CLIPART", clipartId: "cat", isTarget: false },
                { id: "i8", type: "CLIPART", clipartId: "cat", isTarget: false },
              ],
            },
          ],
        }),
      ]),
      answer: "Row 1: Car, Row 2: Kite",
      difficulty: "EASY",
      spaceMm: 0,
      showGrid: false,
      createdById: teacher.id,
    },

    // 6. KDG_SEQUENCE_CHAIN: Caterpillar Missing Sequence
    {
      bookId: nurseryBook.id,
      chapterId: ch1.id,
      type: "KDG_SEQUENCE_CHAIN",
      text: "Fill in the missing letters in the caterpillar's body (इल्ली के शरीर में छूटे हुए अक्षर भरिए):",
      optionsJson: JSON.stringify([
        JSON.stringify({
          theme: "CATERPILLAR",
          instruction: "Fill in the missing letters in the caterpillar's body:",
          items: [
            { value: "A", isBlank: false },
            { value: "B", isBlank: true },
            { value: "C", isBlank: false },
            { value: "D", isBlank: true },
            { value: "E", isBlank: false },
            { value: "F", isBlank: true },
            { value: "G", isBlank: false },
          ],
        }),
      ]),
      answer: "B, D, F",
      difficulty: "EASY",
      spaceMm: 0,
      showGrid: false,
      createdById: teacher.id,
    },
  ];

  const createdQuestions = [];
  for (const q of questionsData) {
    const created = await prisma.question.create({
      data: q,
    });
    createdQuestions.push(created);
  }
  console.log(`✓ Created ${createdQuestions.length} Kindergarten activities in Question Bank`);

  // 5. Create Blueprint for Nursery Activity Paper
  const blueprint = await prisma.blueprint.create({
    data: {
      name: "Nursery Annual Activity Workbook Blueprint",
      bookId: nurseryBook.id,
      academicSession: session,
      examType: "ANNUAL",
      durationMin: 60,
      subjectCode: "NUR-ACT-01",
      chapters: {
        create: [
          { chapterId: ch1.id, marks: 10 },
          { chapterId: ch2.id, marks: 10 },
          { chapterId: ch3.id, marks: 5 },
          { chapterId: ch4.id, marks: 5 },
        ],
      },
      sections: {
        create: [
          {
            position: 0,
            title: "Section A - Writing & Tracing",
            instructions: "Trace letters on 4-line guide neatly / चार लाइन में लिखिए",
            type: "KDG_TRACE_WRITE",
            count: 1,
            marksEach: 5,
          },
          {
            position: 1,
            title: "Section B - Number Grid",
            instructions: "Fill in missing numbers 1 to 50 / संख्याएँ भरिए",
            type: "KDG_NUMBER_GRID",
            count: 1,
            marksEach: 5,
          },
          {
            position: 2,
            title: "Section C - Picture Matching",
            instructions: "Match picture to letter / चित्र का अक्षर से मिलान कीजिए",
            type: "KDG_PICTURE_MATCH",
            count: 1,
            marksEach: 5,
          },
          {
            position: 3,
            title: "Section D - Counting Fun",
            instructions: "Count objects and write the number / गिनकर लिखिए",
            type: "KDG_COUNT_ITEMS",
            count: 1,
            marksEach: 5,
          },
          {
            position: 4,
            title: "Section E - Observation & Circling",
            instructions: "Circle the odd picture in each row / भिन्न चित्र पर गोला लगाइए",
            type: "KDG_CIRCLE_TARGET",
            count: 1,
            marksEach: 5,
          },
          {
            position: 5,
            title: "Section F - Sequence Chain",
            instructions: "Fill missing letters in caterpillar / छूटे हुए अक्षर लिखिए",
            type: "KDG_SEQUENCE_CHAIN",
            count: 1,
            marksEach: 5,
          },
        ],
      },
    },
    include: { sections: { orderBy: { position: "asc" } } },
  });
  console.log(`✓ Created Blueprint: ${blueprint.name} (Total 30 marks)`);

  // 6. Create a ready-to-print Sample Paper
  const paper = await prisma.paper.create({
    data: {
      title: "Nursery Annual Activity Examination 2025–26",
      blueprintId: blueprint.id,
      layout: "PAGE", // Portrait A4
      schoolName: "Sarvodaya English Higher Secondary School, Lakhnadon",
      academicSession: session,
      examType: "ANNUAL",
      examDate: "2026-03-15",
      paperSet: "SET A",
      subjectCode: "NUR-ACT-01",
      generalInstructions:
        "1. All questions are compulsory.\n2. Use sharp pencil for writing and drawing lines.\n3. Take teacher's help if you need guidance.",
      status: "FINAL",
      createdById: teacher.id,
      items: {
        create: blueprint.sections.map((sec, idx) => ({
          sectionId: sec.id,
          questionId: createdQuestions[idx].id,
          position: idx + 1,
        })),
      },
    },
  });
  console.log(`✓ Created Sample Paper: ${paper.title} (ID: ${paper.id})`);
  console.log("Kindergarten seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
