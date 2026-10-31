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
import { HttpError, route, type SessionUser } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { formatMathTextRuns, formatOptionPairRuns } from "@/lib/docxMath";
import { getInternalChoiceSeparatorLabel } from "@/lib/internalChoiceRules";
import { extractTableFromText } from "@/lib/math";
import {
  cleanMatchItem,
  cleanOptionText,
  cleanQuestionStatement,
  DEFAULT_SCHOOL_NAME,
  detectPaperLanguage,
  EXAM_TYPE_LABEL,
  formatExerciseFormula,
  formatMarksLabel,
  formatQuestionNumber,
  getColumnLabels,
  getMatchColumnInstruction,
  getQuestionTypeLabel,
  getSharedInstruction,
  isMcqLikeType,
  isSubpartQuestionType,
  parseMatchColumnPairs,
  QUESTION_TYPE_LABEL,
  resolvePaperExamType,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { parseSubparts, subpartsTotalMarks, type SubPart } from "@/lib/types";
import { UPLOAD_DIR } from "@/lib/uploads";
import {
  computeDisplayedPaperNumbering,
  reconcileSectionGroupInstruction,
  resolveGroupedExerciseInstruction,
} from "@/lib/layout";
import { resolveBoardAndSubjectCode } from "@/lib/curriculumContract";

function renderQuestionOptions(
  opts: string[],
  type: string,
  paragraphs: (Paragraph | Table)[],
  indent = 720,
) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const maxOptionLen = Math.max(...opts.map((o) => String(o).length));
  const isMathComplex = opts.some(
    (o) => String(o).includes("\\frac") || String(o).includes("\\sqrt") || String(o).includes("\n"),
  );
  const singleColumn = type === "ASSERTION_REASON" || isMathComplex || maxOptionLen > 35;

  if (singleColumn) {
    for (let i = 0; i < opts.length; i++) {
      const optText = `(${letters[i] ?? i + 1}) ${cleanOptionText(opts[i])}`;
      paragraphs.push(
        new Paragraph({
          indent: { left: indent },
          spacing: { after: 30 },
          children: formatMathTextRuns(optText, { font: "Times New Roman" }),
        }),
      );
    }
  } else {
    for (let i = 0; i < opts.length; i += 2) {
      const leftOpt = `(${letters[i]}) ${cleanOptionText(opts[i])}`;
      const rightOpt = i + 1 < opts.length ? `(${letters[i + 1]}) ${cleanOptionText(opts[i + 1])}` : "";
      paragraphs.push(
        new Paragraph({
          indent: { left: indent },
          spacing: { after: 30 },
          children: formatOptionPairRuns(leftOpt, rightOpt, { font: "Times New Roman" }),
        }),
      );
    }
  }
}

function renderSubpartsDocx(
  subparts: SubPart[],
  paragraphs: (Paragraph | Table)[],
  isMarkingScheme: boolean,
) {
  const romans = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
  for (let spIdx = 0; spIdx < subparts.length; spIdx++) {
    const sp = subparts[spIdx];
    const spLabel = sp.label && String(sp.label).trim() ? String(sp.label).trim() : (romans[spIdx] || `(${spIdx + 1})`);
    const spMarks = typeof sp.marks === "number" && Number.isFinite(sp.marks) ? sp.marks : 1;
    paragraphs.push(
      new Paragraph({
        indent: { left: 720 },
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `${spLabel} `, bold: true, font: "Times New Roman" }),
          ...formatMathTextRuns(sp.text || "", { font: "Times New Roman" }),
          new TextRun({ text: ` [${spMarks} Mark${spMarks > 1 ? "s" : ""}]`, bold: true, font: "Times New Roman" }),
        ],
      }),
    );

    if (Array.isArray(sp.options) && sp.options.length > 0) {
      const letters = ["a", "b", "c", "d", "e", "f"];
      const maxOptLen = Math.max(...sp.options.map((o: unknown) => String(o).length));
      const singleCol = maxOptLen > 35;
      if (singleCol) {
        for (let oIdx = 0; oIdx < sp.options.length; oIdx++) {
          const optText = `(${letters[oIdx] ?? oIdx + 1}) ${cleanOptionText(String(sp.options[oIdx]))}`;
          paragraphs.push(
            new Paragraph({
              indent: { left: 1080 },
              spacing: { after: 30 },
              children: formatMathTextRuns(optText, { font: "Times New Roman" }),
            }),
          );
        }
      } else {
        for (let oIdx = 0; oIdx < sp.options.length; oIdx += 2) {
          const leftOpt = `(${letters[oIdx] ?? oIdx + 1}) ${cleanOptionText(String(sp.options[oIdx]))}`;
          const rightOpt = oIdx + 1 < sp.options.length ? `(${letters[oIdx + 1] ?? oIdx + 2}) ${cleanOptionText(String(sp.options[oIdx + 1]))}` : "";
          paragraphs.push(
            new Paragraph({
              indent: { left: 1080 },
              spacing: { after: 30 },
              children: formatOptionPairRuns(leftOpt, rightOpt, { font: "Times New Roman" }),
            }),
          );
        }
      }
    }

    if (isMarkingScheme && sp.answer) {
      paragraphs.push(
        new Paragraph({
          indent: { left: 1080 },
          spacing: { before: 20, after: 60 },
          children: [
            new TextRun({ text: "Ans: ", bold: true, color: "0B6623", font: "Times New Roman" }),
            ...formatMathTextRuns(sp.answer, { font: "Times New Roman" }),
          ],
        }),
      );
    }
  }
}

function renderQuestionTextWithTable(
  qLabel: string,
  qText: string,
  qTotalMarks: number | undefined,
  isMatch: boolean,
  pageBreakBefore: boolean,
  paragraphs: (Paragraph | Table)[],
  lang: "hi" | "en" | "bilingual" = "en",
  keepNext = false,
) {
  const marksText = qTotalMarks !== undefined ? `  ${formatMarksLabel(qTotalMarks, lang)}` : "";
  const labelRuns = qLabel ? [new TextRun({ text: `${qLabel}  `, bold: true, font: "Times New Roman" })] : [];
  const marksRuns = marksText ? [new TextRun({ text: marksText, bold: true, font: "Times New Roman" })] : [];
  const tableData = !isMatch ? extractTableFromText(qText) : null;
  if (tableData && tableData.table) {
    paragraphs.push(
      new Paragraph({
        pageBreakBefore,
        keepNext: true,
        indent: qLabel ? undefined : { left: 360 },
        spacing: { before: 100, after: 60 },
        children: [
          ...labelRuns,
          ...formatMathTextRuns(tableData.prefixText, { font: "Times New Roman" }),
          ...marksRuns,
        ],
      }),
    );
    const numCols = Math.max(
      tableData.table.headers ? tableData.table.headers.length : 0,
      ...tableData.table.rows.map((r) => r.length),
      1,
    );
    const colPct = Math.floor(100 / numCols);
    const tableRows: TableRow[] = [];
    if (tableData.table.headers && tableData.table.headers.length > 0) {
      const paddedHeaders = [...tableData.table.headers];
      while (paddedHeaders.length < numCols) paddedHeaders.push("");
      tableRows.push(
        new TableRow({
          children: paddedHeaders.map(
            (h) =>
              new TableCell({
                width: { size: colPct, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: formatMathTextRuns(h, { bold: true, font: "Times New Roman" }),
                  }),
                ],
              }),
          ),
        }),
      );
    }
    for (const row of tableData.table.rows) {
      const paddedRow = [...row];
      while (paddedRow.length < numCols) paddedRow.push("");
      tableRows.push(
        new TableRow({
          children: paddedRow.map(
            (cell) =>
              new TableCell({
                width: { size: colPct, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: formatMathTextRuns(cell, { font: "Times New Roman" }),
                  }),
                ],
              }),
          ),
        }),
      );
    }
    paragraphs.push(
      new Table({
        width: { size: 92, type: WidthType.PERCENTAGE },
        rows: tableRows,
      }),
    );
    if (tableData.suffixText.trim()) {
      paragraphs.push(
        new Paragraph({
          keepNext,
          indent: qLabel ? undefined : { left: 360 },
          spacing: { before: 60, after: 60 },
          children: formatMathTextRuns(tableData.suffixText, { font: "Times New Roman" }),
        }),
      );
    }
  } else {
    paragraphs.push(
      new Paragraph({
        pageBreakBefore,
        keepNext,
        indent: qLabel ? undefined : { left: 360 },
        spacing: { before: 100, after: 60 },
        children: [
          ...labelRuns,
          ...formatMathTextRuns(qText, { font: "Times New Roman" }),
          ...marksRuns,
        ],
      }),
    );
  }
}

export async function buildPaperDocx(
  paperId: string,
  isMarkingScheme: boolean,
  user: SessionUser,
): Promise<{ buffer: Buffer; safeFilename: string; title: string }> {
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

  const paperLang = detectPaperLanguage(paper, paper.items);
  const isHindi = paperLang === "hi";
  const colLabels = getColumnLabels(paperLang);

  const totalMarks = paper.blueprint.sections.reduce((sum, s) => sum + s.count * s.marksEach, 0);
  const examType = resolvePaperExamType(paper);
  const sessionStr = paper.academicSession || paper.blueprint.academicSession || "2025–26";
  const examTermHeading = `${EXAM_TYPE_LABEL[examType]} Examination (${sessionStr})`;
  const resolvedBoardSubject = resolveBoardAndSubjectCode({
    subject: paper.blueprint.book.subject,
    className: paper.blueprint.book.className,
    explicitSubjectCode: paper.subjectCode || paper.blueprint.subjectCode,
    schoolName: paper.schoolName,
    blueprintName: paper.blueprint.name,
    academicSession: sessionStr,
  });
  const resolvedSubjectCode =
    resolvedBoardSubject.subjectCode || paper.subjectCode || paper.blueprint.subjectCode || "";
  const numbering = computeDisplayedPaperNumbering(
    paper.blueprint.sections,
    paper.items,
    (paper.numberingStyle as any) || "CONTINUOUS"
  );

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
    ...(isMarkingScheme
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "CONFIDENTIAL — TEACHER'S MARKING SCHEME & MODEL ANSWERS (मूल्यांकन योजना)",
                bold: true,
                size: 20, // 10pt
                color: "0B6623",
                font: "Times New Roman",
              }),
            ],
          }),
        ]
      : []),
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
        children: [
          new TextRun({
            text: isHindi
              ? "सामान्य निर्देश:"
              : paperLang === "bilingual"
              ? "General Instructions / सामान्य निर्देश:"
              : "General Instructions:",
            bold: true,
            italics: true,
            font: "Times New Roman",
          }),
        ],
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
  let sectionGroupCounter = 0;
  let sectionRelativeNum = 1;

  for (let sIdx = 0; sIdx < paper.blueprint.sections.length; sIdx++) {
    const section = paper.blueprint.sections[sIdx];
    const prev = sIdx > 0 ? paper.blueprint.sections[sIdx - 1] : null;
    const isSameAsPrev = Boolean(prev && prev.title.trim().toLowerCase() === section.title.trim().toLowerCase());
    if (!isSameAsPrev) {
      if (sIdx > 0) {
        sectionGroupCounter++;
      }
      sectionRelativeNum = 1;
    }
    const match = section.title.match(/section\s+([a-z0-9]+)/i);
    const sectionLetter = match ? match[1].toUpperCase() : String.fromCharCode(65 + sectionGroupCounter);

    const items = sectionMap.get(section.id) || [];
    const allInGroup = paper.blueprint.sections.filter(
      (x) => x.title.trim().toLowerCase() === section.title.trim().toLowerCase()
    );
    const hasMultipleTypes = allInGroup.length > 1;

    // Main Section Header (Only if first of its group)
    if (!isSameAsPrev) {
      const groupCount = allInGroup.reduce((sum, s) => sum + s.count, 0);
      const groupMarks = allInGroup.reduce((sum, s) => sum + s.count * s.marksEach, 0);

      const groupRightLabel = isHindi
        ? `${groupCount} प्रश्न · ${groupMarks} अंक`
        : paperLang === "bilingual"
        ? `${groupCount} Questions / प्रश्न · ${groupMarks} Marks / अंक`
        : `${groupCount} Questions · ${groupMarks} Marks`;

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
              text: ` (${groupRightLabel})`,
              bold: true,
              font: "Times New Roman",
            }),
          ],
        }),
      );
    }

    // Sub-heading for specific question type within grouped section
    if (!isSameAsPrev && section.instructions) {
      const secRange = numbering.sectionRanges[section.id];
      const reconciledInstruction = reconcileSectionGroupInstruction(
        section.instructions,
        secRange?.groupStartQ ?? 0,
        secRange?.groupEndQ ?? 0
      );
      if (reconciledInstruction) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: reconciledInstruction,
                italics: true,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
        );
      }
    }

    if (hasMultipleTypes) {
      const typeLabel = getQuestionTypeLabel(section.type, paperLang);
      const typeMarksSuffix = isHindi ? "अंक" : "Marks";
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 100 },
          children: [
            new TextRun({
              text: `[${typeLabel} · ${section.count} × ${section.marksEach} = ${section.count * section.marksEach} ${typeMarksSuffix}]`,
              bold: true,
              italics: true,
              size: 20, // 10pt
              font: "Times New Roman",
            }),
          ],
        }),
      );
    }

    // Render questions in section
    const isGroupedObjective = (section.type === "TRUE_FALSE" || section.type === "FILL_BLANK") && items.length > 1;

    if (isGroupedObjective) {
      const qNum = globalQNum++;
      const currentSecRelNum = sectionRelativeNum++;
      const qLabel = formatQuestionNumber(qNum, paper.numberingStyle, sectionLetter, currentSecRelNum);
      const sharedInstruction = resolveGroupedExerciseInstruction(
        section.instructions,
        section.type,
        hasMultipleTypes,
        paperLang
      );
      const exerciseFormula = formatExerciseFormula(items.length, section.marksEach, paperLang);

      paragraphs.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({ text: `${qLabel}  `, bold: true, font: "Times New Roman" }),
            new TextRun({ text: `${sharedInstruction} `, bold: true, font: "Times New Roman" }),
            new TextRun({ text: ` ${exerciseFormula}`, bold: true, font: "Times New Roman" }),
          ],
        }),
      );

      const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
      items.forEach((item, itemIdx) => {
        const subLabel = `(${LETTERS[itemIdx] ?? itemIdx + 1})`;
        const cleanedStem = cleanQuestionStatement(item.question.text, section.type);

        paragraphs.push(
          new Paragraph({
            indent: { left: 720 },
            spacing: { before: 30, after: 30 },
            children: [
              new TextRun({ text: `${subLabel}  `, bold: true, font: "Times New Roman" }),
              ...formatMathTextRuns(cleanedStem, { font: "Times New Roman" }),
            ],
          }),
        );

        if (isMarkingScheme && item.question.answer) {
          paragraphs.push(
            new Paragraph({
              indent: { left: 1080 },
              spacing: { before: 20, after: 40 },
              children: [
                new TextRun({
                  text: `${isHindi ? "उत्तर: " : "Answer: "}${item.question.answer}`,
                  italics: true,
                  color: "0B6623",
                  font: "Times New Roman",
                }),
              ],
            }),
          );
        }
      });
    } else {
      for (const item of items) {
      const q = item.question;
      const qNum = globalQNum++;
      const currentSecRelNum = sectionRelativeNum++;
      const qLabel = formatQuestionNumber(qNum, paper.numberingStyle, sectionLetter, currentSecRelNum);

      // Question line
      const isMatch = q.type === "MATCH_COLUMN";
      let matchCount = 0;
      if (isMatch && q.optionsJson) {
        try {
          const opts = JSON.parse(q.optionsJson);
          matchCount = parseMatchColumnPairs(opts, q.text, (q as any).explanation).length;
        } catch {}
      }
      const parsedSubparts = isSubpartQuestionType(q.type) ? parseSubparts(q.subpartsJson) : [];
      const subpartsMarks = subpartsTotalMarks(parsedSubparts);
      const qTotalMarks = isMatch
        ? (section.count === 1 ? section.marksEach : Math.min(matchCount * section.marksEach, section.count * section.marksEach))
        : subpartsMarks > 0
        ? subpartsMarks
        : section.marksEach;
      const qText = isMatch ? getMatchColumnInstruction(q.text) : q.text;

      renderQuestionTextWithTable(
        qLabel,
        qText,
        item.orQuestion ? undefined : qTotalMarks,
        isMatch,
        Boolean((item as any).pageBreakBefore),
        paragraphs,
        paperLang,
        Boolean(item.orQuestion),
      );

      // Embedded diagram image if present
      if (q.imagePath) {
        try {
          const imgBuf = fs.readFileSync(path.join(UPLOAD_DIR, q.imagePath));
          const ext = path.extname(q.imagePath).toLowerCase().replace(".", "");
          if (["png", "jpg", "jpeg", "gif"].includes(ext)) {
            paragraphs.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 100 },
                children: [
                  new ImageRun({
                    data: imgBuf,
                    transformation: { width: 340, height: 210 },
                    type: ext === "jpg" ? "jpeg" : (ext as any),
                  }),
                ],
              }),
            );
          } else if (ext === "svg") {
            paragraphs.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 60 },
                children: [
                  new TextRun({
                    text: `[Diagram Attached: ${path.basename(q.imagePath)}]`,
                    italics: true,
                    size: 18,
                    color: "64748B",
                    font: "Times New Roman",
                  }),
                ],
              }),
            );
          }
        } catch {
          // ignore missing image files
        }
      }

      // MCQ / Assertion-Reason options
      if (isMcqLikeType(q.type) && q.optionsJson) {
        try {
          const opts: string[] = JSON.parse(q.optionsJson);
          if (Array.isArray(opts) && opts.length > 0) {
            renderQuestionOptions(opts, q.type, paragraphs, 720);
          }
        } catch {
          // ignore parsing error
        }
      }

      // True / False indicator
      if (q.type === "TRUE_FALSE") {
        paragraphs.push(
          new Paragraph({
            indent: { left: 720 },
            spacing: { before: 20, after: 40 },
            children: [
              new TextRun({
                text: isHindi
                  ? "(सत्य / असत्य)"
                  : paperLang === "bilingual"
                  ? "(सही / गलत — True / False)"
                  : "(True / False)",
                italics: true,
                size: 18, // 9pt
                color: "475569",
                font: "Times New Roman",
              }),
            ],
          }),
        );
      }

      // Match the Column Table
      if (q.type === "MATCH_COLUMN" && q.optionsJson) {
        try {
          const opts: string[] = JSON.parse(q.optionsJson);
          const pairs = parseMatchColumnPairs(opts, q.text, (q as any).explanation);
          if (pairs.length > 0) {
            const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
            const roman = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
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
                            children: [new TextRun({ text: colLabels.colA, bold: true, font: "Times New Roman" })],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: colLabels.colB, bold: true, font: "Times New Roman" })],
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
                                  new TextRun({ text: `(${letters[idx] ?? idx + 1}) `, bold: true, font: "Times New Roman" }),
                                  ...formatMathTextRuns(cleanMatchItem(pair.left), { font: "Times New Roman" }),
                                ],
                              }),
                            ],
                          }),
                          new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({ text: `${roman[idx] ?? `(${idx + 1})`} `, bold: true, font: "Times New Roman" }),
                                  ...formatMathTextRuns(cleanMatchItem(pair.right), { font: "Times New Roman" }),
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

      // Subparts for case study / passage / multi-part questions
      if (parsedSubparts.length > 0) {
        renderSubpartsDocx(parsedSubparts, paragraphs, isMarkingScheme);
      }

      // Model Answer / Solution for primary question
      if (isMarkingScheme && q.answer) {
        paragraphs.push(
          new Paragraph({
            indent: { left: 720 },
            spacing: { before: 40, after: 80 },
            children: [
              new TextRun({
                text: isHindi
                  ? "उत्तर प्रारूप / अंक योजना: "
                  : paperLang === "bilingual"
                  ? "Model Answer / उत्तर प्रारूप: "
                  : "Model Answer / Scheme: ",
                bold: true,
                color: "0B6623",
                font: "Times New Roman",
              }),
              ...formatMathTextRuns(q.answer, { font: "Times New Roman" }),
            ],
          }),
        );
      }

      // Alternate (OR) Choice question
      if (item.orQuestion) {
        const orQ = item.orQuestion;
        const isOrMatch = orQ.type === "MATCH_COLUMN";
        let orMatchCount = 0;
        if (isOrMatch && orQ.optionsJson) {
          try {
            const opts = JSON.parse(orQ.optionsJson);
            orMatchCount = parseMatchColumnPairs(opts, orQ.text, (orQ as any).explanation).length;
          } catch {}
        }
        const parsedOrSubparts = isSubpartQuestionType(orQ.type) ? parseSubparts(orQ.subpartsJson) : [];
        const orSubpartsMarks = subpartsTotalMarks(parsedOrSubparts);
        const orTotalMarks = isOrMatch
          ? (section.count === 1 ? section.marksEach : Math.min(orMatchCount * section.marksEach, section.count * section.marksEach))
          : orSubpartsMarks > 0
          ? orSubpartsMarks
          : section.marksEach;
        const orQText = isOrMatch ? getMatchColumnInstruction(orQ.text) : orQ.text;
        const orSeparatorLabel = getInternalChoiceSeparatorLabel(paperLang);

        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            keepNext: true,
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({
                text: orSeparatorLabel,
                bold: true,
                font: "Times New Roman",
              }),
            ],
          }),
        );
        renderQuestionTextWithTable(
          "",
          orQText,
          qTotalMarks || orTotalMarks,
          isOrMatch,
          false,
          paragraphs,
          paperLang,
        );

        // Embedded diagram image for OR question if present
        if (orQ.imagePath) {
          try {
            const imgBuf = fs.readFileSync(path.join(UPLOAD_DIR, orQ.imagePath));
            const ext = path.extname(orQ.imagePath).toLowerCase().replace(".", "");
            if (["png", "jpg", "jpeg", "gif"].includes(ext)) {
              paragraphs.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80, after: 100 },
                  children: [
                    new ImageRun({
                      data: imgBuf,
                      transformation: { width: 340, height: 210 },
                      type: ext === "jpg" ? "jpeg" : (ext as any),
                    }),
                  ],
                }),
              );
            } else if (ext === "svg") {
              paragraphs.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 60 },
                  children: [
                    new TextRun({
                      text: `[Diagram Attached: ${path.basename(orQ.imagePath)}]`,
                      italics: true,
                      size: 18,
                      color: "64748B",
                      font: "Times New Roman",
                    }),
                  ],
                }),
              );
            }
          } catch {
            // ignore missing image files
          }
        }

        // MCQ / Assertion-Reason options for OR question
        if (isMcqLikeType(orQ.type) && orQ.optionsJson) {
          try {
            const opts: string[] = JSON.parse(orQ.optionsJson);
            if (Array.isArray(opts) && opts.length > 0) {
              renderQuestionOptions(opts, orQ.type, paragraphs, 720);
            }
          } catch {
            // ignore
          }
        }

        // True / False indicator for OR question
        if (orQ.type === "TRUE_FALSE") {
          paragraphs.push(
            new Paragraph({
              indent: { left: 720 },
              spacing: { before: 20, after: 40 },
              children: [
                new TextRun({
                  text: isHindi
                    ? "(सत्य / असत्य)"
                    : paperLang === "bilingual"
                    ? "(सही / गलत — True / False)"
                    : "(True / False)",
                  italics: true,
                  size: 18, // 9pt
                  color: "475569",
                  font: "Times New Roman",
                }),
              ],
            }),
          );
        }

        // Match the Column Table for OR question
        if (orQ.type === "MATCH_COLUMN" && orQ.optionsJson) {
          try {
            const opts: string[] = JSON.parse(orQ.optionsJson);
            const pairs = parseMatchColumnPairs(opts, orQ.text, (orQ as any).explanation);
            if (pairs.length > 0) {
              const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
              const roman = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
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
                              children: [new TextRun({ text: colLabels.colA, bold: true, font: "Times New Roman" })],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: { size: 50, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: colLabels.colB, bold: true, font: "Times New Roman" })],
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
                                    new TextRun({ text: `(${letters[idx] ?? idx + 1}) `, bold: true, font: "Times New Roman" }),
                                    ...formatMathTextRuns(cleanMatchItem(pair.left), { font: "Times New Roman" }),
                                  ],
                                }),
                              ],
                            }),
                            new TableCell({
                              width: { size: 50, type: WidthType.PERCENTAGE },
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({ text: `${roman[idx] ?? `(${idx + 1})`} `, bold: true, font: "Times New Roman" }),
                                    ...formatMathTextRuns(cleanMatchItem(pair.right), { font: "Times New Roman" }),
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

        // Subparts for case study / passage for OR question
        if (parsedOrSubparts.length > 0) {
          renderSubpartsDocx(parsedOrSubparts, paragraphs, isMarkingScheme);
        }

        // Model Answer / Solution for OR question
        if (isMarkingScheme && orQ.answer) {
          paragraphs.push(
            new Paragraph({
              indent: { left: 720 },
              spacing: { before: 40, after: 80 },
              children: [
                new TextRun({
                  text: isHindi
                    ? "उत्तर प्रारूप / अंक योजना: "
                    : paperLang === "bilingual"
                    ? "Model Answer / उत्तर प्रारूप: "
                    : "Model Answer / Scheme: ",
                  bold: true,
                  color: "0B6623",
                  font: "Times New Roman",
                }),
                ...formatMathTextRuns(orQ.answer, { font: "Times New Roman" }),
              ],
            }),
          );
        }
      }

      // Blank answer space / lines for student paper copy
      if (!isMarkingScheme) {
        const maxSpace = Math.max(q.spaceMm || 0, item.orQuestion?.spaceMm || 0);
        if (maxSpace > 0) {
          paragraphs.push(
            new Paragraph({
              spacing: { before: 60, after: Math.min(2400, Math.round(maxSpace * 56.7)) },
              children: [
                new TextRun({
                  text: q.type === "DRAW" ? "[Space for Diagram / चित्र हेतु स्थान]" : "[Space for Answer / उत्तर हेतु स्थान]",
                  size: 16, // 8pt
                  italics: true,
                  color: "94A3B8",
                  font: "Times New Roman",
                }),
              ],
            }),
          );
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
                    text: `${paper.title} · ${paper.paperSet ? `Set ${paper.paperSet} · ` : ""}${isMarkingScheme ? "Confidential Marking Scheme" : "Examination Paper"}`,
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
    markingScheme: isMarkingScheme,
  });

  const safeFilename = isMarkingScheme
    ? `${paper.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_${paper.paperSet ? `Set_${paper.paperSet}_` : ""}Marking_Scheme.docx`
    : `${paper.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_${paper.paperSet ? `Set_${paper.paperSet}` : "Paper"}.docx`;

  return { buffer: Buffer.from(buffer), safeFilename, title: paper.title };
}

export const GET = route(async (_req, params, user) => {
  const paperId = params.id;
  const url = new URL(_req.url);
  const isMarkingScheme = url.searchParams.get("markingScheme") === "true" || url.searchParams.get("type") === "solutions";

  const { buffer, safeFilename } = await buildPaperDocx(paperId, isMarkingScheme, user);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
    },
  });
});
