import { questionInstruction } from "./sectionTypes";
import { loadPaperView } from "./papers";
import { sectionItemsFormula, withPairMarksNote } from "./flexibleMarksPrint";
import { isDraftPaper } from "./preflightChecks";
import { questionSlotMarks } from "@/lib/blueprint";
import { partsAttemptCount, resolveMarksStyle, showPartMarks } from "@/lib/marksDisplay";
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
import { HttpError, type SessionUser } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { formatMathTextRuns, formatOptionPairRuns } from "@/lib/docxMath";
import { getInternalChoiceSeparatorLabel } from "@/lib/internalChoiceRules";
import { getPaperLocale, type PaperLanguage } from "@/lib/localization";
import { extractTableFromText } from "@/lib/math";
import {
  canHaveSubparts,
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
  isMcqLikeType,
  isSubpartQuestionType,
  parseMatchColumnPairs,
  QUESTION_TYPE_LABEL,
  resolvePaperExamType,
} from "@/lib/constants";
import { decomposeForSlot } from "@/lib/subpartExtractor";
import { prisma } from "@/lib/prisma";
import { parseSubparts, parseSubpartsPayload, type SubPart } from "@/lib/types";
import { UPLOAD_DIR } from "@/lib/uploads";
import {
  computeDisplayedPaperNumbering,
  mergeSameFormRows,
  sectionHeadingInstruction,
  resolveGroupedExerciseInstruction,
} from "@/lib/layout";
import { resolveBoardAndSubjectCode } from "@/lib/curriculumContract";
import { sectionLetter as titleSectionLetter } from "@/lib/sectionLetter";

function renderQuestionOptions(
  opts: string[],
  type: string,
  paragraphs: (Paragraph | Table)[],
  indent = 720,
  font = "Times New Roman",
  lang: PaperLanguage = "en",
) {
  const letters = lang === "sa" || lang === "hi"
    ? ["अ", "ब", "स", "द", "य", "र"]
    : ["A", "B", "C", "D", "E", "F"];
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
          children: formatMathTextRuns(optText, { font }),
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
          children: formatOptionPairRuns(leftOpt, rightOpt, { font }),
        }),
      );
    }
  }
}

function renderSubpartsDocx(
  subparts: SubPart[],
  paragraphs: (Paragraph | Table)[],
  isMarkingScheme: boolean,
  lang: PaperLanguage = "en",
  indentLevel = 1,
  showMarks = true,
) {
  const romans = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
  const font = lang === "sa" || lang === "hi" ? "Mangal" : "Times New Roman";
  const baseIndent = 720 * indentLevel;
  const childIndent = baseIndent + 360;

  for (let spIdx = 0; spIdx < subparts.length; spIdx++) {
    const sp = subparts[spIdx];
    const spLabel = sp.label && String(sp.label).trim() ? String(sp.label).trim() : (romans[spIdx] || `(${spIdx + 1})`);
    const spMarks = typeof sp.marks === "number" && Number.isFinite(sp.marks) ? sp.marks : 0;
    paragraphs.push(
      new Paragraph({
        indent: { left: baseIndent },
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `${spLabel} `, bold: true, font }),
          ...formatMathTextRuns(sp.text || "", { font }),
          ...(showMarks && spMarks > 0 ? [new TextRun({ text: ` ${formatMarksLabel(spMarks, lang)}`, bold: true, font })] : []),
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
              indent: { left: childIndent },
              spacing: { after: 30 },
              children: formatMathTextRuns(optText, { font }),
            }),
          );
        }
      } else {
        for (let oIdx = 0; oIdx < sp.options.length; oIdx += 2) {
          const leftOpt = `(${letters[oIdx] ?? oIdx + 1}) ${cleanOptionText(String(sp.options[oIdx]))}`;
          const rightOpt = oIdx + 1 < sp.options.length ? `(${letters[oIdx + 1] ?? oIdx + 2}) ${cleanOptionText(String(sp.options[oIdx + 1]))}` : "";
          paragraphs.push(
            new Paragraph({
              indent: { left: childIndent },
              spacing: { after: 30 },
              children: formatOptionPairRuns(leftOpt, rightOpt, { font }),
            }),
          );
        }
      }
    }

    if (Array.isArray(sp.subparts) && sp.subparts.length > 0) {
      renderSubpartsDocx(sp.subparts, paragraphs, isMarkingScheme, lang, indentLevel + 1, showMarks);
    }

    if (isMarkingScheme && sp.answer) {
      const ansPrefix = lang === "sa" ? "उत्तरम्: " : lang === "hi" ? "उत्तर: " : "Ans: ";
      paragraphs.push(
        new Paragraph({
          indent: { left: childIndent },
          spacing: { before: 20, after: 60 },
          children: [
            new TextRun({ text: ansPrefix, bold: true, color: "0B6623", font }),
            ...formatMathTextRuns(sp.answer, { font }),
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
  lang: PaperLanguage = "en",
  keepNext = false,
) {
  const font = lang === "sa" || lang === "hi" ? "Mangal" : "Times New Roman";
  const marksText = qTotalMarks !== undefined ? `  ${formatMarksLabel(qTotalMarks, lang)}` : "";
  const labelRuns = qLabel ? [new TextRun({ text: `${qLabel}  `, bold: true, font })] : [];
  const marksRuns = marksText ? [new TextRun({ text: marksText, bold: true, font })] : [];
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
          ...formatMathTextRuns(tableData.prefixText, { font }),
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
                    children: formatMathTextRuns(h, { bold: true, font }),
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
                    children: formatMathTextRuns(cell, { font }),
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
          children: formatMathTextRuns(tableData.suffixText, { font }),
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
          ...formatMathTextRuns(qText, { font }),
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
  const loaded = await prisma.paper.findUnique({
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

  if (!loaded) throw new HttpError(404, "Paper not found");
  // exported as printed: rows of one form under one heading are one run (one sub-heading, one numbering)
  const view = mergeSameFormRows(loaded.blueprint.sections, loaded.items);
  const paper = { ...loaded, blueprint: { ...loaded.blueprint, sections: view.sections }, items: view.items };

  const marksStyle = resolveMarksStyle(paper.marksStyle);
  const paperLang = detectPaperLanguage(paper, paper.items);
  const locale = getPaperLocale(paperLang);
  const isHindi = paperLang === "hi";
  const isSanskrit = paperLang === "sa";
  const docFont = isSanskrit || isHindi ? "Mangal" : "Times New Roman";
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
                text: isSanskrit
                  ? "गोपनीयम् — शिक्षकस्य अङ्कयोजना तथा आदर्शोत्तराणि"
                  : isHindi
                  ? "CONFIDENTIAL — TEACHER'S MARKING SCHEME & MODEL ANSWERS (मूल्यांकन योजना)"
                  : "CONFIDENTIAL — TEACHER'S MARKING SCHEME & MODEL ANSWERS",
                bold: true,
                size: 20, // 10pt
                color: "0B6623",
                font: docFont,
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
                  new TextRun({ text: `${locale.header.classLabel} `, bold: true, font: docFont }),
                  new TextRun({ text: `${paper.blueprint.book.className}  |  `, font: docFont }),
                  new TextRun({ text: `${locale.header.subjectLabel} `, bold: true, font: docFont }),
                  new TextRun({
                    text: `${paper.blueprint.book.subject}${resolvedSubjectCode ? ` (${resolvedSubjectCode})` : ""}`,
                    font: docFont,
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
                        new TextRun({ text: `${locale.header.date} `, bold: true, font: docFont }),
                        new TextRun({ text: `${paper.examDate}  |  `, font: docFont }),
                      ]
                    : []),
                  new TextRun({ text: `${locale.header.timeAllowed} `, bold: true, font: docFont }),
                  new TextRun({ text: `${locale.header.timeFormat(paper.blueprint.durationMin)}  |  `, font: docFont }),
                  new TextRun({ text: `${locale.header.maxMarks} `, bold: true, font: docFont }),
                  new TextRun({ text: `${totalMarks}`, bold: true, font: docFont }),
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
            text: `${locale.header.generalInstructionsLabel}:`,
            bold: true,
            italics: true,
            font: docFont,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: paper.generalInstructions,
            font: docFont,
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
    const sectionLetter = titleSectionLetter(section.title) ?? String.fromCharCode(65 + sectionGroupCounter);

    const items = sectionMap.get(section.id) || [];
    const allInGroup = paper.blueprint.sections.filter(
      (x) => x.title.trim().toLowerCase() === section.title.trim().toLowerCase()
    );
    const hasMultipleTypes = allInGroup.length > 1;

    // Main Section Header (Only if first of its group)
    if (!isSameAsPrev) {
      const groupCount = allInGroup.reduce((sum, s) => sum + s.count, 0);
      const groupMarks = allInGroup.reduce((sum, s) => sum + s.count * s.marksEach, 0);
      const secRange = numbering.sectionRanges[section.id];

      const groupRightLabel = locale.section.formatGroupSummary(groupCount, groupMarks, {
        displayedCount: secRange?.groupDisplayedCount,
        rawItemCount: secRange?.groupRawItemCount ?? groupCount,
        type: section.type,
      });

      const sectionTitleDisplay = locale.section.formatSectionHeader(sectionLetter, section.title);

      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 140 },
          children: [
            new TextRun({
              text: sectionTitleDisplay,
              bold: true,
              size: 24, // 12pt
              font: docFont,
            }),
            new TextRun({
              text: ` (${groupRightLabel})`,
              bold: true,
              font: docFont,
            }),
          ],
        }),
      );
    }

    const isNumberedSingleGroupedExercise =
      /(?:^|[^0-9])(?:प्रश्न\s*[1-5]\b|question\s*[1-5]\b|q[1-5]\b)/i.test(section.title);

    const isGroupedObjective =
      items.length > 1 &&
      (section.type === "TRUE_FALSE" ||
        section.type === "FILL_BLANK" ||
        ((section.type === "MCQ" || section.type === "VERY_SHORT") && isNumberedSingleGroupedExercise));

    // Sub-heading for specific question type within grouped section
    if (!isSameAsPrev && section.instructions && !isGroupedObjective) {
      const secRange = numbering.sectionRanges[section.id];
      const reconciledInstruction = sectionHeadingInstruction(
        section.instructions,
        section.type,
        secRange?.groupStartQ ?? 0,
        secRange?.groupEndQ ?? 0,
        paperLang
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
                font: docFont,
              }),
            ],
          }),
        );
      }
    }

    if (hasMultipleTypes) {
      const typeLabel = getQuestionTypeLabel(section.type, paperLang);
      const formula = sectionItemsFormula(
        section,
        items.map((x) => x.question as never),
        formatExerciseFormula(section.count, section.marksEach, paperLang),
        paperLang,
      );
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 100 },
          children: [
            new TextRun({
              text: `[${typeLabel} · ${formula}]`,
              bold: true,
              italics: true,
              size: 20, // 10pt
              font: docFont,
            }),
          ],
        }),
      );
    }

    // Render questions in section
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
      const exerciseFormula = sectionItemsFormula(
        section,
        items.map((x) => x.question as never),
        formatExerciseFormula(items.length, section.marksEach, paperLang),
        paperLang,
      );

      paragraphs.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({ text: `${qLabel}  `, bold: true, font: docFont }),
            new TextRun({ text: `${sharedInstruction} `, bold: true, font: docFont }),
            new TextRun({ text: ` ${exerciseFormula}`, bold: true, font: docFont }),
          ],
        }),
      );

      const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
      const DEVANAGARI_SUB_LABELS = ["(क)", "(ख)", "(ग)", "(घ)", "(ङ)", "(च)", "(छ)", "(ज)", "(झ)", "(ञ)"];
      const isIndic = paperLang === "sa" || paperLang === "hi" || /[\u0900-\u097F]/.test(section.title);
      items.forEach((item, itemIdx) => {
        const subLabel = isIndic
          ? (DEVANAGARI_SUB_LABELS[itemIdx] ?? `(${itemIdx + 1})`)
          : `(${LETTERS[itemIdx] ?? itemIdx + 1})`;
        const cleanedStem = cleanQuestionStatement(item.question.text, section.type);

        paragraphs.push(
          new Paragraph({
            indent: { left: 720 },
            spacing: { before: 30, after: 30 },
            children: [
              new TextRun({ text: `${subLabel}  `, bold: true, font: docFont }),
              ...formatMathTextRuns(cleanedStem, { font: docFont }),
            ],
          }),
        );

        if (section.type === "MCQ" && item.question.optionsJson) {
          try {
            const parsedOpts = JSON.parse(item.question.optionsJson);
            if (Array.isArray(parsedOpts) && parsedOpts.length > 0) {
              renderQuestionOptions(parsedOpts, section.type, paragraphs, 1080, docFont, paperLang);
            }
          } catch {}
        }

        if (isMarkingScheme && item.question.answer) {
          const itemAnsPrefix = isSanskrit ? "उत्तरम्: " : isHindi ? "उत्तर: " : "Answer: ";
          paragraphs.push(
            new Paragraph({
              indent: { left: 1080 },
              spacing: { before: 20, after: 40 },
              children: [
                new TextRun({
                  text: `${itemAnsPrefix}${item.question.answer}`,
                  italics: true,
                  color: "0B6623",
                  font: docFont,
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
      const { subparts: rawSubparts, attemptCount } = parseSubpartsPayload(q.subpartsJson);
      let parsedSubparts = canHaveSubparts(q.type) ? rawSubparts : [];
      let baseQText = isMatch ? withPairMarksNote(getMatchColumnInstruction(q.text), (q as { pairMarks?: number | null }).pairMarks) : q.text;
      let decomp: ReturnType<typeof decomposeForSlot> = null;
      if (parsedSubparts.length === 0 && canHaveSubparts(q.type)) {
        decomp = decomposeForSlot(baseQText, section.marksEach);
        if (decomp) {
          baseQText = decomp.stem;
          parsedSubparts = decomp.subparts;
        }
      }
      const qTotalMarks = questionSlotMarks(section, { ...q, subparts: parsedSubparts, subpartsJson: null, attemptCount } as never).marks;
      const qText = baseQText;
      const instructionLine = questionInstruction(section, q.type, (item as { instruction?: string }).instruction);
      if (instructionLine) {
        paragraphs.push(
          new Paragraph({
            pageBreakBefore: Boolean((item as { pageBreakBefore?: boolean }).pageBreakBefore),
            keepNext: true,
            spacing: { before: 60, after: 20 },
            children: [new TextRun({ text: instructionLine, italics: true })],
          }),
        );
      }

      renderQuestionTextWithTable(
        qLabel,
        qText,
        marksStyle === "SUPPRESSED" ? undefined : qTotalMarks,
        isMatch,
        Boolean((item as any).pageBreakBefore) && !instructionLine,
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
            renderQuestionOptions(opts, q.type, paragraphs, 720, docFont, paperLang);
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
                text: isSanskrit
                  ? "(आम् / न)"
                  : isHindi
                  ? "(सत्य / असत्य)"
                  : paperLang === "bilingual"
                  ? "(सही / गलत — True / False)"
                  : "(True / False)",
                italics: true,
                size: 18, // 9pt
                color: "475569",
                font: docFont,
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
                            children: [new TextRun({ text: colLabels.colA, bold: true, font: docFont })],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: colLabels.colB, bold: true, font: docFont })],
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
                                  new TextRun({ text: `(${letters[idx] ?? idx + 1}) `, bold: true, font: docFont }),
                                  ...formatMathTextRuns(cleanMatchItem(pair.left), { font: docFont }),
                                ],
                              }),
                            ],
                          }),
                          new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({ text: `${roman[idx] ?? `(${idx + 1})`} `, bold: true, font: docFont }),
                                  ...formatMathTextRuns(cleanMatchItem(pair.right), { font: docFont }),
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
        renderSubpartsDocx(
          parsedSubparts,
          paragraphs,
          isMarkingScheme,
          paperLang,
          1,
          showPartMarks(parsedSubparts.length, partsAttemptCount({ subparts: rawSubparts, attemptCount }, decomp), marksStyle),
        );
      }

      // Model Answer / Solution for primary question
      if (isMarkingScheme && q.answer) {
        paragraphs.push(
          new Paragraph({
            indent: { left: 720 },
            spacing: { before: 40, after: 80 },
            children: [
              new TextRun({
                text: isSanskrit
                  ? "उत्तरप्रारूपम् / अङ्कयोजना: "
                  : isHindi
                  ? "उत्तर प्रारूप / अंक योजना: "
                  : paperLang === "bilingual"
                  ? "Model Answer / उत्तर प्रारूप: "
                  : "Model Answer / Scheme: ",
                bold: true,
                color: "0B6623",
                font: docFont,
              }),
              ...formatMathTextRuns(q.answer, { font: docFont }),
            ],
          }),
        );
      }

      // Alternate (OR) Choice question
      if (item.orQuestion) {
        const orQ = item.orQuestion;
        const isOrMatch = orQ.type === "MATCH_COLUMN";
        const { subparts: rawOrSubparts, attemptCount: orAttemptCount } = parseSubpartsPayload(orQ.subpartsJson);
        let parsedOrSubparts = canHaveSubparts(orQ.type) ? rawOrSubparts : [];
        let baseOrQText = isOrMatch ? getMatchColumnInstruction(orQ.text) : orQ.text;
        let decompOr: ReturnType<typeof decomposeForSlot> = null;
        if (parsedOrSubparts.length === 0 && canHaveSubparts(orQ.type)) {
          decompOr = decomposeForSlot(baseOrQText, section.marksEach);
          if (decompOr) {
            baseOrQText = decompOr.stem;
            parsedOrSubparts = decompOr.subparts;
          }
        }
        const orQText = baseOrQText;
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
                font: docFont,
              }),
            ],
          }),
        );
        renderQuestionTextWithTable(
          "",
          orQText,
          undefined, // the pair's marks print once, on the first question's line
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
                  text: isSanskrit
                    ? "(आम् / न)"
                    : isHindi
                    ? "(सत्य / असत्य)"
                    : paperLang === "bilingual"
                    ? "(सही / गलत — True / False)"
                    : "(True / False)",
                  italics: true,
                  size: 18, // 9pt
                  color: "475569",
                  font: docFont,
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
                              children: [new TextRun({ text: colLabels.colA, bold: true, font: docFont })],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: { size: 50, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: colLabels.colB, bold: true, font: docFont })],
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
                                    new TextRun({ text: `(${letters[idx] ?? idx + 1}) `, bold: true, font: docFont }),
                                    ...formatMathTextRuns(cleanMatchItem(pair.left), { font: docFont }),
                                  ],
                                }),
                              ],
                            }),
                            new TableCell({
                              width: { size: 50, type: WidthType.PERCENTAGE },
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({ text: `${roman[idx] ?? `(${idx + 1})`} `, bold: true, font: docFont }),
                                    ...formatMathTextRuns(cleanMatchItem(pair.right), { font: docFont }),
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
          renderSubpartsDocx(
            parsedOrSubparts,
            paragraphs,
            isMarkingScheme,
            paperLang,
            1,
            showPartMarks(
              parsedOrSubparts.length,
              partsAttemptCount({ subparts: rawOrSubparts, attemptCount: orAttemptCount }, decompOr),
              marksStyle,
            ),
          );
        }

        // Model Answer / Solution for OR question
        if (isMarkingScheme && orQ.answer) {
          paragraphs.push(
            new Paragraph({
              indent: { left: 720 },
              spacing: { before: 40, after: 80 },
              children: [
                new TextRun({
                  text: isSanskrit
                    ? "उत्तरप्रारूपम् / अङ्कयोजना: "
                    : isHindi
                    ? "उत्तर प्रारूप / अंक योजना: "
                    : paperLang === "bilingual"
                    ? "Model Answer / उत्तर प्रारूप: "
                    : "Model Answer / Scheme: ",
                  bold: true,
                  color: "0B6623",
                  font: docFont,
                }),
                ...formatMathTextRuns(orQ.answer, { font: docFont }),
              ],
            }),
          );
        }
      }

      // Blank answer space / lines for student paper copy
      if (!isMarkingScheme) {
        const maxSpace = Math.max(q.spaceMm || 0, item.orQuestion?.spaceMm || 0);
        if (maxSpace > 0) {
          const blankSpaceLabel = q.type === "DRAW"
            ? (isSanskrit ? "[चित्राङ्कनार्थं स्थानम्]" : isHindi ? "[चित्र हेतु स्थान]" : paperLang === "bilingual" ? "[Space for Diagram / चित्र हेतु स्थान]" : "[Space for Diagram]")
            : (isSanskrit ? "[उत्तरलेखनार्थं स्थानम्]" : isHindi ? "[उत्तर हेतु स्थान]" : paperLang === "bilingual" ? "[Space for Answer / उत्तर हेतु स्थान]" : "[Space for Answer]");
          paragraphs.push(
            new Paragraph({
              spacing: { before: 60, after: Math.min(2400, Math.round(maxSpace * 56.7)) },
              children: [
                new TextRun({
                  text: blankSpaceLabel,
                  size: 16, // 8pt
                  italics: true,
                  color: "94A3B8",
                  font: docFont,
                }),
              ],
            }),
          );
        }
      }
    }
  }
}

  const draftView = await loadPaperView(paperId);
  const isDraft = draftView ? isDraftPaper(draftView) : false;
  const docHeaderTitle = `${isDraft ? "DRAFT — INCOMPLETE PAPER · " : ""}${paper.title} · ${paper.paperSet ? `${locale.header.set} ${paper.paperSet} · ` : ""}${
    isMarkingScheme
      ? (isSanskrit ? "गोपनीय-अङ्कयोजना" : isHindi ? "गोपनीय अंक योजना" : "Confidential Marking Scheme")
      : (isSanskrit ? "प्रश्नपत्रम्" : isHindi ? "प्रश्न पत्र" : "Examination Paper")
  }`;

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
                    text: docHeaderTitle,
                    size: 16,
                    italics: true,
                    font: docFont,
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
