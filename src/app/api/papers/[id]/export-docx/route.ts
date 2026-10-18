import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import {
  DEFAULT_SCHOOL_NAME,
  EXAM_TYPE_LABEL,
  formatQuestionNumber,
  isMcqLikeType,
  parseMatchColumnPairs,
  resolvePaperExamType,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const GET = route(async (_req, params, user) => {
  const paperId = params.id;

  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    include: {
      blueprint: {
        include: {
          book: true,
          sections: { orderBy: { position: "asc" } },
        },
      },
      items: {
        include: {
          question: true,
          orQuestion: true,
          section: true,
        },
        orderBy: [{ section: { position: "asc" } }, { position: "asc" }],
      },
    },
  });

  if (!paper) throw new HttpError(404, "Paper not found");

  const totalMarks = paper.blueprint.sections.reduce((sum, s) => sum + s.count * s.marksEach, 0);
  const examType = resolvePaperExamType(paper);
  const examTermHeading = `${EXAM_TYPE_LABEL[examType]} Examination (${paper.academicSession || paper.blueprint.academicSession || "2025–26"})`;
  const resolvedSubjectCode = paper.subjectCode || paper.blueprint.subjectCode || "";

  // Group items by section
  const sectionMap = new Map<string, typeof paper.items>();
  for (const s of paper.blueprint.sections) {
    sectionMap.set(s.id, []);
  }
  for (const item of paper.items) {
    const list = sectionMap.get(item.sectionId) || [];
    list.push(item);
    sectionMap.set(item.sectionId, list);
  }

  const paragraphs: (Paragraph | Table)[] = [];

  // --- School Logo (if enabled) ---
  if (paper.schoolLogo !== "NONE") {
    try {
      const logoFile = path.join(process.cwd(), "public", "school-logo.png");
      if (fs.existsSync(logoFile)) {
        const logoBuf = fs.readFileSync(logoFile);
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new ImageRun({
                data: logoBuf,
                transformation: { width: 56, height: 56 },
                type: "png",
              }),
            ],
          }),
        );
      }
    } catch {
      // ignore if logo file is unreadable
    }
  }

  // --- Title & School Header ---
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: (paper.schoolName || DEFAULT_SCHOOL_NAME).toUpperCase(),
          bold: true,
          size: 32, // 16pt
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: examTermHeading.toUpperCase(),
          bold: true,
          size: 26, // 13pt
          font: "Times New Roman",
        }),
      ],
    }),
  );

  // --- Metadata Bar (Class, Subject, Time, Marks) ---
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Class: ", bold: true, font: "Times New Roman" }),
                  new TextRun({ text: `${paper.blueprint.book.className}  |  `, font: "Times New Roman" }),
                  new TextRun({ text: "Subject: ", bold: true, font: "Times New Roman" }),
                  new TextRun({
                    text: `${paper.blueprint.book.subject}${resolvedSubjectCode ? ` (${resolvedSubjectCode})` : ""}`,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  ...(paper.examDate
                    ? [
                        new TextRun({ text: "Date: ", bold: true, font: "Times New Roman" }),
                        new TextRun({ text: `${paper.examDate}  |  `, font: "Times New Roman" }),
                      ]
                    : []),
                  new TextRun({ text: "Time: ", bold: true, font: "Times New Roman" }),
                  new TextRun({ text: `${paper.blueprint.durationMin} Mins  |  `, font: "Times New Roman" }),
                  new TextRun({ text: "Max. Marks: ", bold: true, font: "Times New Roman" }),
                  new TextRun({ text: `${totalMarks}`, bold: true, font: "Times New Roman" }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  paragraphs.push(metaTable);

  // --- General Instructions ---
  if (paper.generalInstructions) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [new TextRun({ text: "General Instructions:", bold: true, italics: true, font: "Times New Roman" })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: paper.generalInstructions,
            font: "Times New Roman",
            size: 20, // 10pt
          }),
        ],
      }),
    );
  }

  // --- Sections & Questions ---
  let globalQNum = 1;

  for (const section of paper.blueprint.sections) {
    const items = sectionMap.get(section.id) || [];

    // Section Header
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 140 },
        children: [
          new TextRun({
            text: `${section.title.toUpperCase()}`,
            bold: true,
            size: 24, // 12pt
            font: "Times New Roman",
          }),
          new TextRun({
            text: ` (${section.count} × ${section.marksEach} = ${section.count * section.marksEach} Marks)`,
            bold: true,
            font: "Times New Roman",
          }),
        ],
      }),
    );

    if (section.instructions) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: section.instructions,
              italics: true,
              size: 20,
              font: "Times New Roman",
            }),
          ],
        }),
      );
    }

    // Render questions in section
    for (const item of items) {
      const q = item.question;
      const qNum = globalQNum++;
      const qLabel = formatQuestionNumber(qNum, paper.numberingStyle);

      // Question line
      paragraphs.push(
        new Paragraph({
          spacing: { before: 100, after: 60 },
          children: [
            new TextRun({ text: `${qLabel}  `, bold: true, font: "Times New Roman" }),
            new TextRun({ text: q.text, font: "Times New Roman" }),
            new TextRun({ text: `  [${section.marksEach} Mark${section.marksEach > 1 ? "s" : ""}]`, bold: true, font: "Times New Roman" }),
          ],
        }),
      );

      // MCQ / Assertion-Reason options
      if (isMcqLikeType(q.type) && q.optionsJson) {
        try {
          const opts: string[] = JSON.parse(q.optionsJson);
          if (Array.isArray(opts) && opts.length > 0) {
            const letters = ["A", "B", "C", "D", "E", "F"];
            for (let i = 0; i < opts.length; i += 2) {
              const leftOpt = `(${letters[i]}) ${opts[i]}`;
              const rightOpt = i + 1 < opts.length ? `(${letters[i + 1]}) ${opts[i + 1]}` : "";
              paragraphs.push(
                new Paragraph({
                  indent: { left: 720 }, // 0.5 inch indent
                  spacing: { after: 40 },
                  children: [
                    new TextRun({ text: leftOpt.padEnd(45, " "), font: "Times New Roman" }),
                    new TextRun({ text: rightOpt, font: "Times New Roman" }),
                  ],
                }),
              );
            }
          }
        } catch {
          // ignore parsing error
        }
      }

      // Match the Column Table
      if (q.type === "MATCH_COLUMN" && q.optionsJson) {
        try {
          const opts: string[] = JSON.parse(q.optionsJson);
          const pairs = parseMatchColumnPairs(opts);
          if (pairs.length > 0) {
            const letters = ["a", "b", "c", "d", "e", "f"];
            const roman = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)"];
            paragraphs.push(
              new Table({
                width: { size: 92, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: "Column A (स्तम्भ 'अ')", bold: true, font: "Times New Roman" })],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: "Column B (स्तम्भ 'ब')", bold: true, font: "Times New Roman" })],
                          }),
                        ],
                      }),
                    ],
                  }),
                  ...pairs.map(
                    (pair, idx) =>
                      new TableRow({
                        children: [
                          new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({ text: `${roman[idx] ?? `(${idx + 1})`} `, bold: true, font: "Times New Roman" }),
                                  new TextRun({ text: pair.left, font: "Times New Roman" }),
                                ],
                              }),
                            ],
                          }),
                          new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({ text: `(${letters[idx] ?? idx + 1}) `, bold: true, font: "Times New Roman" }),
                                  new TextRun({ text: pair.right, font: "Times New Roman" }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                  ),
                ],
              }),
            );
          }
        } catch {
          // ignore
        }
      }

      // Subparts for case study
      if (q.subpartsJson) {
        try {
          const subparts = JSON.parse(q.subpartsJson);
          if (Array.isArray(subparts) && subparts.length > 0) {
            for (const sp of subparts) {
              paragraphs.push(
                new Paragraph({
                  indent: { left: 720 },
                  spacing: { after: 40 },
                  children: [
                    new TextRun({ text: `${sp.label || "(i)"} `, bold: true, font: "Times New Roman" }),
                    new TextRun({ text: sp.text || "", font: "Times New Roman" }),
                    new TextRun({ text: ` [${sp.marks} Mark${sp.marks > 1 ? "s" : ""}]`, bold: true, font: "Times New Roman" }),
                  ],
                }),
              );
            }
          }
        } catch {
          // ignore
        }
      }

      // Alternate (OR) Choice question
      if (item.orQuestion) {
        const orQ = item.orQuestion;
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({ text: "— OR —", bold: true, italics: true, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `Q.${qNum} (OR)  `, bold: true, font: "Times New Roman" }),
              new TextRun({ text: orQ.text, font: "Times New Roman" }),
              new TextRun({ text: `  [${section.marksEach} Mark${section.marksEach > 1 ? "s" : ""}]`, bold: true, font: "Times New Roman" }),
            ],
          }),
        );

        if (orQ.type === "MCQ" && orQ.optionsJson) {
          try {
            const opts: string[] = JSON.parse(orQ.optionsJson);
            if (Array.isArray(opts) && opts.length > 0) {
              const letters = ["A", "B", "C", "D", "E", "F"];
              for (let i = 0; i < opts.length; i += 2) {
                const leftOpt = `(${letters[i]}) ${opts[i]}`;
                const rightOpt = i + 1 < opts.length ? `(${letters[i + 1]}) ${opts[i + 1]}` : "";
                paragraphs.push(
                  new Paragraph({
                    indent: { left: 720 },
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: leftOpt.padEnd(45, " "), font: "Times New Roman" }),
                      new TextRun({ text: rightOpt, font: "Times New Roman" }),
                    ],
                  }),
                );
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${paper.title} · ${paper.paperSet ? `Set ${paper.paperSet}` : ""}`,
                    size: 16,
                    italics: true,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
        },
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  await recordAudit(user, "PAPER_EXPORT_DOCX", "PAPER", paper.id, {
    paperTitle: paper.title,
    schoolName: paper.schoolName,
  });

  const safeFilename = `${paper.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_${paper.paperSet ? `Set_${paper.paperSet}` : "Paper"}.docx`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
    },
  });
});
