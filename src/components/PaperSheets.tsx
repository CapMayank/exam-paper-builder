"use client";
import { questionSlotMarks } from "@/lib/blueprint";
import { questionInstruction } from "@/lib/sectionTypes";
import { BOOKLET_MAX_PAGES, chooseFitLevel, describeFit, FIT_LEVELS, fitMm, getFit, MIN_QUESTION_GAP_MM, nextFitLevel, sheetCost, WORKSHEET_FIT_LEVELS, WORKSHEET_MAX_PAGES, type FitStatus, type PrintFit } from "@/lib/printFit";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { OptionFlow, QuestionView, questionStemText } from "@/components/QuestionView";
import { groupedItemPrintsOptions, isShortStemPart, splitStemParagraphs, subpartGridColumns } from "@/lib/compactLayout";
import { getInternalChoiceSeparatorLabel } from "@/lib/internalChoiceRules";
import { resolveMarksStyle } from "@/lib/marksDisplay";
import { QuestionContent } from "@/components/QuestionContent";
import { imageUrl } from "@/lib/client";
import {
  cleanQuestionStatement,
  DEFAULT_SCHOOL_LOGO,
  DEFAULT_SCHOOL_NAME,
  detectPaperLanguage,
  EXAM_TYPE_LABEL,
  formatExerciseFormula,
  formatMarksLabel,
  getPaperLocale,
  getQuestionTypeLabel,
  isBookletLayout,
  isPrePrimaryClass,
  WORKSHEET_MODE,
  canHaveSubparts,
  isSubpartQuestionType,
  localizeSectionTitle,
  parseMatchColumnPairs,
  QUESTION_TYPE_LABEL,
  resolvePaperExamType,
  type PaperLanguage,
} from "@/lib/constants";
import { decomposeForSlot } from "@/lib/subpartExtractor";
import { WorkbookHeader } from "@/lib/kindergarten/components/WorkbookHeader";
import {
  computeDisplayedPaperNumbering,
  mergeSameFormRows,
  formatQuestionNumber,
  groupedSubLabel,
  groupedSubLabelsIndic,
  imposeBooklet,
  imposeTwoUpCut,
  paginate,
  sectionHeadingInstruction,
  resolveGroupedExerciseInstruction,
} from "@/lib/layout";
import { resolveBoardAndSubjectCode } from "@/lib/curriculumContract";
import { sectionLetter } from "@/lib/sectionLetter";
import type { PaperData, QuestionDto } from "@/lib/types";

type Block = {
  key: string;
  keepWithNext: boolean;
  forceBreakBefore?: boolean;
  groupId?: string;
  node?: ReactNode;
  render?: (ctx: { isContinuation: boolean }) => ReactNode;
};

function renderBlock(b: Block, isContinuation: boolean): ReactNode {
  if (b.render) return b.render({ isContinuation });
  return b.node;
}

// A4 minus page padding (see .a4 in globals.css): 14mm sides, 14mm top, 16mm bottom.
const CONTENT_W_MM = 182;
const CONTENT_H_MM = 267;


/**
 * One item of a grouped exercise (or its OR alternative): its text, its options when the item itself is a choice
 * question, its picture and its stored parts. No marks: the exercise line prints one formula for every item.
 */
function GroupedItemBody({ q, sectionType, isA5 }: { q: QuestionDto; sectionType: string; isA5?: boolean }) {
  const lineHeight = isA5 ? 1.35 : 1.45;
  const optFontSize = isA5 ? "8pt" : "8.5pt";
  return (
    <>
      <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight }}>
        <QuestionContent text={cleanQuestionStatement(q.text, sectionType)} isA5={isA5} />
      </div>
      {groupedItemPrintsOptions(q) && <OptionFlow options={q.options} isA5={isA5} fontSize={optFontSize} marginTop="1.5mm" />}
      {q.imagePath && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl(q.imagePath)}
          alt=""
          style={{
            display: "block",
            marginTop: "2mm",
            maxWidth: "100%",
            maxHeight: isA5 ? "50mm" : "70mm",
            objectFit: "contain",
          }}
        />
      )}
      {q.subparts && q.subparts.length > 0 && (
        <div style={{ marginTop: "1.2mm", display: "flex", flexDirection: "column", gap: isA5 ? "1mm" : "1.5mm" }}>
          {q.subparts.map((sp, spIdx) => (
            <div key={spIdx} style={{ display: "flex", gap: "2mm", alignItems: "flex-start" }}>
              <span style={{ fontWeight: 600, minWidth: isA5 ? "5mm" : "6mm" }}>{sp.label || `(${spIdx + 1})`}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight }}>
                  <QuestionContent text={sp.text} isA5={isA5} />
                </div>
                {sp.options && sp.options.length > 0 && (
                  <OptionFlow options={sp.options} isA5={isA5} fontSize={optFontSize} marginTop="1mm" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function extractSectionLetter(title: string, fallbackIndex: number): string {
  return sectionLetter(title) ?? String.fromCharCode(65 + (fallbackIndex % 26));
}

function buildBlocks(rawPaper: PaperData, compact?: boolean, isA5?: boolean, showSignatures?: boolean, fit: PrintFit = getFit(0)): Block[] {
  // printed as the paper reads: rows of one form under one heading are one run (one sub-heading, one numbering)
  const view = mergeSameFormRows(rawPaper.blueprint.sections, rawPaper.items);
  const paper: PaperData = { ...rawPaper, blueprint: { ...rawPaper.blueprint, sections: view.sections }, items: view.items };
  const g = (mm: number, floor?: number) => fitMm(mm, fit, floor);
  const { blueprint } = paper;
  const paperLang = detectPaperLanguage(paper, paper.items);
  const locale = getPaperLocale(paperLang);
  const isHindi = paperLang === "hi";
  const total = paper.progress.totalMarks;
  const examType = resolvePaperExamType(paper);
  const examHeading = blueprint.curriculumMode === WORKSHEET_MODE ? `${EXAM_TYPE_LABEL[examType]} · Activity Worksheet` : `${EXAM_TYPE_LABEL[examType]} Examination`;
  const sessionText = paper.academicSession || blueprint.academicSession || "2025–26";
  const numbering = computeDisplayedPaperNumbering(
    blueprint.sections,
    paper.items,
    paper.numberingStyle || "CONTINUOUS",
    paperLang
  );
  const resolvedBoardSubject = resolveBoardAndSubjectCode({
    subject: blueprint.book.subject,
    className: blueprint.book.className,
    explicitSubjectCode: paper.subjectCode || blueprint.subjectCode,
    schoolName: paper.schoolName,
    blueprintName: blueprint.name,
    academicSession: sessionText,
  });
  const effectiveSubjectCode =
    resolvedBoardSubject.subjectCode || paper.subjectCode || blueprint.subjectCode;
  const blocks: Block[] = [];

  const isEffectiveCompact = compact || paper.printDensity === "COMPACT";
  const effectiveShowSignatures = showSignatures !== undefined ? showSignatures : (paper.showSignatures === true);
  const questionBottomPadding = g(
    paper.printDensity === "COMPACT" || isEffectiveCompact
      ? isA5 ? 2 : 2.5
      : paper.printDensity === "COMFORTABLE"
      ? isA5 ? 4 : 5.5
      : isA5 ? 3 : 4,
    MIN_QUESTION_GAP_MM
  );
  const resolvedLogoSrc =
    paper.schoolLogo === "NONE"
      ? null
      : paper.logoPath
      ? imageUrl(paper.logoPath)
      : paper.schoolLogo || DEFAULT_SCHOOL_LOGO;
  const logoBoxSize = isA5 ? "12mm" : "15.5mm";
  const sideColW = isA5 ? "24mm" : "30mm";
  const isPrePrimary = isPrePrimaryClass(blueprint.book.className);

  if (isPrePrimary) {
    blocks.push({
      key: "kdg-header",
      keepWithNext: false,
      node: (
        <div style={{ paddingBottom: "3mm" }}>
          <WorkbookHeader
            schoolName={paper.schoolName || DEFAULT_SCHOOL_NAME}
            logoSrc={resolvedLogoSrc}
            classNameTitle={blueprint.book.className}
            subjectTitle={blueprint.book.subject}
            sessionText={sessionText}
            examHeading={examHeading}
            examDate={paper.examDate}
          />
        </div>
      ),
    });
  } else {
    blocks.push({
      key: "header",
      keepWithNext: false,
      node: (
        <div style={{ paddingBottom: g(isA5 ? 2 : 3) }}>
        {/* School Emblem + Centered School Name & Exam Title Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2.5mm",
          }}
        >
          <div style={{ width: sideColW, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
            {resolvedLogoSrc ? (
              <div style={{ width: logoBoxSize, height: logoBoxSize }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedLogoSrc}
                  alt="School Emblem"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
            ) : null}
          </div>

          <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
            <div
              style={{
                fontSize: isA5 ? "13pt" : "14pt",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                lineHeight: 1.2,
              }}
            >
              {paper.schoolName || DEFAULT_SCHOOL_NAME}
            </div>
            <div style={{ fontSize: isA5 ? "10pt" : "11pt", fontWeight: 700, marginTop: "0.6mm" }}>
              {examHeading} ({sessionText})
              {paper.examDate ? ` · ${new Date(paper.examDate + "T00:00:00").toLocaleDateString("en-GB")}` : ""}
            </div>
            <div style={{ fontSize: isA5 ? "9.5pt" : "10.5pt", fontWeight: 600, marginTop: "0.5mm" }}>
              {blueprint.book.className} — {blueprint.book.subject}
            </div>
          </div>

          {/* Right column mirrors the logo column, so the title stays centred; it carries the paper set and subject code. */}
          <div
            style={{
              width: sideColW,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "0.8mm",
              fontSize: isA5 ? "7pt" : "7.5pt",
              lineHeight: 1.15,
            }}
          >
            {paper.paperSet && (
              <div
                style={{
                  border: "1.6px solid #000",
                  padding: isA5 ? "0.3mm 2mm" : "0.5mm 2.5mm",
                  fontWeight: 800,
                  fontSize: isA5 ? "9pt" : "10pt",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                {paper.paperSet.toUpperCase().startsWith("SET")
                  ? `${locale.header.set} ${paper.paperSet.toUpperCase().replace(/^SET\s*/i, "")}`
                  : `${locale.header.set} ${paper.paperSet.toUpperCase()}`}
              </div>
            )}
            {effectiveSubjectCode && (
              <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <span style={{ fontWeight: 600 }}>{locale.header.subjectCode} </span>
                <strong>{effectiveSubjectCode}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Time and Maximum Marks Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: isA5 ? "1.5mm" : "2mm",
            fontWeight: 700,
            fontSize: isA5 ? "9pt" : "9.5pt",
            borderTop: "1.2px solid #000",
            borderBottom: "1.2px solid #000",
            padding: isA5 ? "1mm 0.8mm" : "1.2mm 1mm",
          }}
        >
          <span>
            {locale.header.timeAllowed} {locale.header.timeFormat(blueprint.durationMin)}
          </span>
          <span style={{ fontWeight: 600 }}>
            {locale.header.totalQuestions} <strong>{numbering.totalDisplayedQuestions}</strong>
          </span>
          <span>
            {locale.header.maxMarks} {total}
          </span>
        </div>

        {/* Candidate Details Box */}
        {paper.showCandidateDetails !== false && (
          <div
            style={{
              marginTop: isA5 ? "1.5mm" : "2.2mm",
              border: "1px solid #1e293b",
              padding: isA5 ? "1.2mm 2mm" : "2mm 2.5mm",
              borderRadius: "2px",
              backgroundColor: "#fafafa",
              fontSize: isA5 ? "8pt" : "8.5pt",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: isA5 ? "1.2mm" : "1.6mm" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
                <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{locale.header.studentName}&nbsp;</span>
                  <span style={{ display: "inline-block", flex: 1, borderBottom: "1px solid #000" }}>&nbsp;</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{locale.header.classAndSec}&nbsp;</span>
                  <span style={{ display: "inline-block", width: isA5 ? "22mm" : "28mm", borderBottom: "1px solid #000" }}>&nbsp;</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3mm" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5mm", flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{locale.header.rollNo}</span>
                  {/* Ten boxes: one digit each. */}
                  <span style={{ display: "inline-flex", gap: isA5 ? "0.8px" : "1px" }}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <span
                        key={i}
                        style={{
                          width: isA5 ? "4.2mm" : "5.2mm",
                          height: isA5 ? "4.8mm" : "5.6mm",
                          border: isA5 ? "1px solid #000" : "1.2px solid #000",
                          display: "inline-block",
                          backgroundColor: "#fff",
                        }}
                      />
                    ))}
                  </span>
                </div>
                {effectiveShowSignatures && (
                  <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{locale.header.invigilatorSign}&nbsp;</span>
                    <span style={{ display: "inline-block", width: isA5 ? "18mm" : "26mm", borderBottom: "1px solid #000" }}>&nbsp;</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* General Instructions Box */}
        {paper.generalInstructions && (
          <div
            style={{
              marginTop: isA5 ? "1.5mm" : "2.5mm",
              padding: isA5 ? "1.5mm 2mm" : "2mm 3mm",
              backgroundColor: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "3px",
              fontSize: "8.5pt",
              lineHeight: 1.4,
            }}
          >
            <div style={{ fontWeight: 700, textDecoration: "underline", marginBottom: "0.5mm", color: "#0f172a" }}>
              {isHindi ? "सामान्य निर्देश:" : paperLang === "bilingual" ? "General Instructions / सामान्य निर्देश:" : "General Instructions:"}
            </div>
            <div style={{ whiteSpace: "pre-line", color: "#334155" }}>{paper.generalInstructions}</div>
          </div>
        )}
      </div>
    ),
  });
  }

  let n = 0;
  let sectionGroupCounter = 0;
  let sectionRelativeCounter = 0;
  for (let i = 0; i < blueprint.sections.length; i++) {
    const s = blueprint.sections[i];
    const prev = i > 0 ? blueprint.sections[i - 1] : null;
    const next = i < blueprint.sections.length - 1 ? blueprint.sections[i + 1] : null;
    const isSameAsPrev = Boolean(prev && prev.title.trim().toLowerCase() === s.title.trim().toLowerCase());
    const isSameAsNext = Boolean(next && next.title.trim().toLowerCase() === s.title.trim().toLowerCase());
    const hasMultipleTypes = isSameAsPrev || isSameAsNext;

    if (!isSameAsPrev) {
      sectionRelativeCounter = 0;
    }
    const sectionLetter = extractSectionLetter(s.title, sectionGroupCounter);
    if (!isSameAsNext) {
      sectionGroupCounter += 1;
    }

    const sectionItems = paper.items.filter((item) => item.sectionId === s.id);
    const isNumberedSingleGroupedExercise =
      /(?:^|[^0-9])(?:प्रश्न\s*[1-5]\b|question\s*[1-5]\b|q[1-5]\b)/i.test(s.title);

    const isGroupedObjective =
      sectionItems.length > 1 &&
      (s.type === "TRUE_FALSE" ||
        s.type === "FILL_BLANK" ||
        ((s.type === "MCQ" || s.type === "VERY_SHORT") && isNumberedSingleGroupedExercise));

    // Worksheets list activities straight away – no "Section A" headings.
    const isWorksheet = blueprint.curriculumMode === WORKSHEET_MODE;

    // Only render the main SECTION header if it's the first in this title group!
    if (!isWorksheet && !isSameAsPrev) {
      const allInGroup = blueprint.sections.filter(
        (x) => x.title.trim().toLowerCase() === s.title.trim().toLowerCase()
      );
      const groupMarks = allInGroup.reduce((sum, x) => sum + x.count * x.marksEach, 0);
      const groupCount = allInGroup.reduce((sum, x) => sum + x.count, 0);
      const secRange = numbering.sectionRanges[s.id];
      const reconciledMainInstruction = sectionHeadingInstruction(
        s.instructions,
        s.type,
        secRange?.groupStartQ ?? 0,
        secRange?.groupEndQ ?? 0,
        paperLang
      );

      const groupRightLabel = locale.section.formatGroupSummary(groupCount, groupMarks, {
        displayedCount: secRange?.groupDisplayedCount,
        rawItemCount: secRange?.groupRawItemCount ?? groupCount,
        type: s.type,
      });
      const localizedSectionTitle = locale.section.formatSectionHeader(sectionLetter, s.title);

      blocks.push({
        key: `sec-main-${s.id}`,
        keepWithNext: true,
        node: (
          <div style={{ padding: isA5 ? `${g(2)} 0 ${g(1)}` : `${g(3)} 0 ${g(1.5)}` }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                borderBottom: "1.5px solid #000",
                paddingBottom: "0.8mm",
                textTransform: "uppercase",
                fontSize: isA5 ? "10.5pt" : "11pt",
              }}
            >
              <span>{localizedSectionTitle}</span>
              <span style={{ fontWeight: 600, fontSize: isA5 ? "9pt" : "9.5pt" }}>
                {groupRightLabel}
              </span>
            </div>
            {reconciledMainInstruction && !isGroupedObjective && (
              <div style={{ fontStyle: "italic", marginTop: "0.8mm", fontSize: "8.5pt", color: "#334155" }}>
                {reconciledMainInstruction}
              </div>
            )}
          </div>
        ),
      });
    }

    // If section has multiple question types, render a clean sub-heading for this question type!
    if (!isWorksheet && hasMultipleTypes) {
      const typeLabel = getQuestionTypeLabel(s.type, paperLang);
      const typeFormula = locale.section.formatTypeFormula(s.count, s.marksEach, s.type);

      blocks.push({
        key: `sec-sub-${s.id}`,
        keepWithNext: true,
        node: (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 600,
              fontSize: isA5 ? "8.5pt" : "9pt",
              color: "#1e293b",
              backgroundColor: "#f8fafc",
              borderLeft: "2.5px solid #475569",
              padding: isA5 ? "0.8mm 1.5mm" : "1mm 2mm",
              margin: isA5 ? `${g(1)} 0 ${g(1.5)}` : `${g(1.5)} 0 ${g(2)}`,
            }}
          >
            <span>{typeLabel}</span>
            <span>{typeFormula}</span>
          </div>
        ),
      });
    }

    if (isGroupedObjective) {
      const exerciseN = n;
      // the paper's one numbering (the builder shows the same); the local count only covers an item it does not know
      const exerciseLabel =
        numbering.itemNumbers[sectionItems[0].id]?.questionLabel ??
        formatQuestionNumber(paper.numberingStyle || "CONTINUOUS", exerciseN, sectionLetter, sectionRelativeCounter);
      n += 1;
      sectionRelativeCounter += 1;

      const sharedInstruction = resolveGroupedExerciseInstruction(
        s.instructions,
        s.type,
        hasMultipleTypes,
        paperLang
      );
      const formulaText = formatExerciseFormula(sectionItems.length, s.marksEach, paperLang);

      blocks.push({
        key: `exercise-head-${s.id}`,
        keepWithNext: true,
        groupId: `exercise-${s.id}`,
        node: (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontWeight: 700,
              marginBottom: isA5 ? "1.5mm" : "2mm",
              paddingTop: isA5 ? "1mm" : "1.5mm",
            }}
          >
            <div style={{ flex: 1, minWidth: 0, paddingRight: "3mm" }}>
              <span style={{ marginRight: "2mm", fontWeight: 700 }}>
                {exerciseLabel.endsWith(".") ? exerciseLabel : `${exerciseLabel}.`}
              </span>
              <span>{sharedInstruction}</span>
            </div>
            <span
              style={{
                fontWeight: 700,
                whiteSpace: "nowrap",
                color: "#334155",
                fontSize: isA5 ? "9pt" : "9.5pt",
              }}
            >
              {formulaText}
            </span>
          </div>
        ),
      });

      const isIndic = groupedSubLabelsIndic(s.title, paperLang);

      sectionItems.forEach((it, itemIdx) => {
        const isLastItem = itemIdx === sectionItems.length - 1;
        const subLabel = numbering.itemNumbers[it.id]?.subLabel ?? groupedSubLabel(itemIdx, isIndic);
        blocks.push({
          key: it.id,
          keepWithNext: itemIdx === 0,
          forceBreakBefore: Boolean(it.pageBreakBefore),
          groupId: `exercise-${s.id}`,
          node: (
            <div
              style={{
                display: "flex",
                gap: "2.5mm",
                alignItems: "flex-start",
                paddingLeft: isA5 ? "4mm" : "5mm",
                paddingBottom: isLastItem ? questionBottomPadding : g(isA5 ? 1.5 : 2),
              }}
            >
              <span style={{ fontWeight: 600, minWidth: isA5 ? "5.5mm" : "6.5mm" }}>{subLabel}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* no marks here: the exercise line carries the one formula for every item */}
                <GroupedItemBody q={it.question} sectionType={s.type} isA5={isA5} />
                {it.orQuestion && (
                  <>
                    <div style={{ textAlign: "center", margin: "1.5mm 0", fontWeight: 700, fontSize: isA5 ? "8.5pt" : "9pt" }}>
                      {getInternalChoiceSeparatorLabel(paperLang)}
                    </div>
                    <GroupedItemBody q={it.orQuestion} sectionType={s.type} isA5={isA5} />
                  </>
                )}
              </div>
            </div>
          ),
        });
      });
    } else {
      let lastInstructionLine = "";
      for (const it of sectionItems) {
        const currentN = n;
        const numberLabel =
          numbering.itemNumbers[it.id]?.questionLabel ??
          formatQuestionNumber(paper.numberingStyle || "CONTINUOUS", currentN, sectionLetter, sectionRelativeCounter);
        n += 1;
        sectionRelativeCounter += 1;

        const subparts = it.question.subparts && it.question.subparts.length > 0
          ? it.question.subparts
          : canHaveSubparts(it.question.type)
          ? decomposeForSlot(it.question.text, s.marksEach)?.subparts ?? []
          : [];
        // Short sub-items ("(i) Write (ii) Clean …") share lines inside one block instead of taking a block each.
        const subGridCols = isPrePrimary || it.orQuestion ? 0 : subpartGridColumns(subparts, isA5);
        const canDecompose = !isPrePrimary && !it.orQuestion && subparts && subparts.length > 1 && subGridCols === 0;
        const totalQuestionMarks = questionSlotMarks(s, { ...it.question, subparts } as never).marks;
        // A line the teacher typed for this question prints above it; none typed, none printed.
        // The same instruction on consecutive questions ("Write as directed.") prints once, above the first.
        const ownInstructionLine = questionInstruction(s, it.question.type, it.instruction);
        const instructionLine = ownInstructionLine && ownInstructionLine === lastInstructionLine && !it.pageBreakBefore ? "" : ownInstructionLine;
        lastInstructionLine = ownInstructionLine;
        if (instructionLine) {
          blocks.push({
            key: `${it.id}-instr`,
            keepWithNext: true,
            forceBreakBefore: Boolean(it.pageBreakBefore),
            groupId: it.id,
            render: () => (
              <div style={{ fontStyle: "italic", fontWeight: 500, paddingBottom: g(isA5 ? 0.75 : 1) }}>{instructionLine}</div>
            ),
          });
        }
        const breakBeforeQuestion = Boolean(it.pageBreakBefore) && !instructionLine;

        if (canDecompose) {
          // The stem prints one paragraph per block, so a long passage starts on the current page and carries on
          // overleaf. Its last paragraph stays with the first subpart, and a short lead-in line stays with the
          // paragraph after it, so neither is left alone at the foot of a page.
          const stemParts = splitStemParagraphs(questionStemText(it.question, totalQuestionMarks));
          stemParts.forEach((part, partIdx) => {
            const isLastPart = partIdx === stemParts.length - 1;
            blocks.push({
              key: partIdx === 0 ? `${it.id}-stem` : `${it.id}-stem-${partIdx}`,
              keepWithNext: isLastPart || isShortStemPart(part),
              forceBreakBefore: partIdx === 0 && breakBeforeQuestion,
              groupId: it.id,
              render: () => (
                <div style={{ paddingBottom: g(isA5 ? 1.5 : 2.5) }}>
                  <QuestionView
                    q={it.question}
                    number={currentN}
                    numberLabel={numberLabel}
                    marks={totalQuestionMarks}
                    marksStyle={resolveMarksStyle(paper.marksStyle)}
                    compact={isEffectiveCompact}
                    fit={fit}
                    renderMode="STEM_ONLY"
                    stemPart={stemParts.length > 1 ? partIdx : undefined}
                    isA5={isA5}
                    lang={paperLang}
                    dense
                  />
                </div>
              ),
            });
          });

          // 2. Individual subparts: can cleanly break across page boundaries
          subparts.forEach((_, spIdx) => {
            const isLastSubpart = spIdx === subparts.length - 1;
            blocks.push({
              key: `${it.id}-sp-${spIdx}`,
              keepWithNext: false,
              groupId: it.id,
              render: ({ isContinuation }) => (
                <div style={{ paddingBottom: isLastSubpart ? questionBottomPadding : g(isA5 ? 1.5 : 2.5) }}>
                  <QuestionView
                    q={it.question}
                    number={currentN}
                    numberLabel={numberLabel}
                    marks={totalQuestionMarks}
                    marksStyle={resolveMarksStyle(paper.marksStyle)}
                    compact={isEffectiveCompact}
                  fit={fit}
                    renderMode="SUBPART_ONLY"
                    subpartIndex={spIdx}
                    isContinuation={isContinuation}
                    isA5={isA5}
                    lang={paperLang}
                    dense
                  />
                </div>
              ),
            });
          });
        } else {
          blocks.push({
            key: it.id,
            keepWithNext: false,
            forceBreakBefore: breakBeforeQuestion,
            groupId: it.id,
            render: () => (
              <div style={{ paddingBottom: questionBottomPadding }}>
                <QuestionView
                  q={it.question}
                  orQuestion={it.orQuestion}
                  number={currentN}
                  numberLabel={numberLabel}
                  marks={totalQuestionMarks}
                  marksStyle={resolveMarksStyle(paper.marksStyle)}
                  compact={isEffectiveCompact || subGridCols > 0}
                  fit={fit}
                  isA5={isA5}
                  lang={paperLang}
                  dense
                />
              </div>
            ),
          });
        }
      }
    }
  }

  blocks.push({
    key: "end",
    keepWithNext: false,
    node: (
      <div
        style={{
          textAlign: "center",
          paddingTop: g(isA5 ? 3 : 5),
          paddingBottom: "2mm",
          fontSize: isA5 ? "8.5pt" : "9pt",
          fontWeight: 700,
          letterSpacing: "0.06em",
          borderTop: "1.2px dashed #94a3b8",
          marginTop: g(isA5 ? 2.5 : 4),
          color: "#334155",
        }}
      >
        {locale.footer.endOfPaper}
      </div>
    ),
  });

  return blocks;
}

function Page({
  n,
  total,
  blocks,
  isA5,
  continuationKeys,
  watermark,
  watermarkText,
  lang = "en",
  zoom = 1,
  fit,
}: {
  n: number;
  total: number;
  blocks: Block[];
  isA5?: boolean;
  continuationKeys?: Set<string>;
  watermark?: boolean;
  watermarkText?: string;
  lang?: PaperLanguage;
  zoom?: number;
  fit?: PrintFit;
}) {
  const isLastPage = n === total;
  const locale = getPaperLocale(lang);
  return (
    <div
      className={`${isA5 ? "a5" : "a4"} paper-font relative overflow-hidden`}
      style={isA5 && fit ? ({ "--pad-x": `${fit.padX}mm`, "--pad-t": `${fit.padTop}mm`, "--pad-b": `${fit.padBottom}mm` } as React.CSSProperties) : undefined}
    >
      {watermark && (
        <div
          className="watermark-overlay"
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              transform: "rotate(-35deg)",
              fontSize: isA5 ? "22pt" : "30pt",
              fontWeight: 800,
              color: "rgba(100, 116, 139, 0.08)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {watermarkText || "CONFIDENTIAL — SARVODAYA EXAM CELL"}
          </div>
        </div>
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          ...(zoom !== 1 ? { zoom } : null),
          ...(fit?.layoutZoom && fit.layoutZoom !== zoom ? { width: `${CONTENT_W_MM / fit.layoutZoom}mm`, margin: "0 auto" } : null),
        }}
      >
        {blocks.map((b) => (
          <div key={b.key} style={{ display: "flow-root" }}>
            {renderBlock(b, continuationKeys?.has(b.key) ?? false)}
          </div>
        ))}
      </div>
      <div className="page-footer">
        <div style={{ flex: 1, textAlign: "left", fontSize: isA5 ? "7pt" : "8pt", color: "#64748b" }}>
          {/* Left margin spacer */}
        </div>
        <div style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: isA5 ? "7.5pt" : "8.5pt", color: "#334155" }}>
          {locale.footer.pageOf(n, total)}
        </div>
        <div style={{ flex: 1, textAlign: "right", fontWeight: 700, fontSize: isA5 ? "7pt" : "8pt", color: "#1e293b" }}>
          {!isLastPage ? <span>{locale.footer.pto}</span> : null}
        </div>
      </div>
    </div>
  );
}

function BlankPage({ showTemplate = true, isA5 }: { showTemplate?: boolean; isA5?: boolean }) {
  if (!showTemplate) {
    return <div className={`${isA5 ? "a5" : "a4"} paper-font`} />;
  }
  return (
    <div
      className={`${isA5 ? "a5" : "a4"} paper-font`}
      style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}
    >
      <div
        style={{
          border: "1.5px dashed #94a3b8",
          borderRadius: "4px",
          padding: isA5 ? "4mm 5mm" : "6mm 8mm",
          height: "92%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <div
          style={{
            textAlign: "center",
            borderBottom: "1px solid #cbd5e1",
            width: "100%",
            paddingBottom: isA5 ? "2mm" : "3mm",
          }}
        >
          <div style={{ fontSize: isA5 ? "9pt" : "11pt", fontWeight: 700, letterSpacing: "0.08em", color: "#334155" }}>
            SPACE FOR ROUGH WORK / रफ कार्य हेतु स्थान
          </div>
          <div style={{ fontSize: isA5 ? "7pt" : "8pt", color: "#64748b", marginTop: "0.5mm" }}>
            (Do not write final answers on this page · इस पृष्ठ पर मुख्य उत्तर न लिखें)
          </div>
        </div>
        <div
          style={{
            flex: 1,
            width: "100%",
            marginTop: isA5 ? "3mm" : "4mm",
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 18px, #f1f5f9 18px, #f1f5f9 19px)",
            borderRadius: "2px",
          }}
        />
      </div>
      <div className="page-no text-slate-400" style={{ fontSize: isA5 ? "7pt" : "8pt", fontWeight: 600 }}>
        [ROUGH WORK / रफ कार्य]
      </div>
    </div>
  );
}

/** `pages` is what gets printed; `contentPages` is the paper's own page count (a 2-up sheet prints it twice). */
export type SheetsInfo = { pages: number; contentPages: number; sheets: number; isTwoUpCut?: boolean; fit?: FitStatus };

/**
 * Lays the paper out on real A4 or A5 pages (measured in the browser), then stacks them (PAGE),
 * imposes onto A4-landscape sheets folded to A5 (BOOKLET_A4), or imposes onto A3-landscape sheets (BOOKLET).
 */
export function PaperSheets({
  paper,
  view = "reading",
  zoom = 1,
  compact,
  includeRoughWork = false,
  showSignatures,
  watermark,
  watermarkText,
  twoUpCutMode,
  autoFit = true,
  maxPages = BOOKLET_MAX_PAGES,
  onInfo,
}: {
  paper: PaperData;
  view?: "reading" | "sheets";
  zoom?: number;
  compact?: boolean;
  includeRoughWork?: boolean;
  showSignatures?: boolean;
  watermark?: boolean;
  watermarkText?: string;
  twoUpCutMode?: boolean;
  /** Booklet papers only: tighten spacing step by step until the paper fits maxPages. */
  autoFit?: boolean;
  maxPages?: number;
  onInfo?: (i: SheetsInfo) => void;
}) {
  const isA5 = paper.layout === "BOOKLET_A4";
  const isBooklet = isBookletLayout(paper.layout);
  const paperLang = detectPaperLanguage(paper, paper.items);
  const effectiveWatermark = watermark ?? paper.securityWatermark ?? false;
  const effectiveWatermarkText = watermarkText || paper.watermarkText || "CONFIDENTIAL — SARVODAYA EXAM CELL";
  // Nursery–KG worksheets always scale themselves to 2 pages (one A4 sheet, front and back).
  const isWorksheet = paper.blueprint.curriculumMode === WORKSHEET_MODE;
  const fitLevels = isWorksheet ? WORKSHEET_FIT_LEVELS : FIT_LEVELS;
  const fitMaxPages = isWorksheet ? WORKSHEET_MAX_PAGES : maxPages;
  const fitActive = isWorksheet || (isA5 && autoFit);
  // Any change to the paper or print options restarts the fit from the configured spacing.
  const fitTwoUp = Boolean(twoUpCutMode);
  const fitInputKey = useMemo(() => ({}), [paper, compact, isA5, showSignatures, fitActive, fitMaxPages, fitTwoUp]);
  // `measured[level]` is the page count seen at each level tried so far; `final` marks the level that was chosen.
  const [fitState, setFitState] = useState<{ key: object; level: number; measured: number[]; final: boolean }>({ key: fitInputKey, level: 0, measured: [], final: false });
  const fitCurrent = fitActive && fitState.key === fitInputKey ? fitState : null;
  const fitLevel = fitCurrent?.level ?? 0;
  const fit = useMemo(() => getFit(fitLevel, fitLevels), [fitLevel, fitLevels]);
  const blocks = useMemo(
    () => buildBlocks(paper, compact, isA5, showSignatures, fit),
    [paper, compact, isA5, showSignatures, fit]
  );
  const measureRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][] | null>(null);
  const [fitStatus, setFitStatus] = useState<FitStatus | undefined>(undefined);

  const contentW = isA5 ? 148.5 - 2 * fit.padX : CONTENT_W_MM;
  const contentH = isA5 ? 210 - fit.padTop - fit.padBottom : CONTENT_H_MM;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const root = measureRef.current;
      const probe = probeRef.current;
      if (!root || !probe) return;
      await document.fonts.ready;
      // Image heights are unknown until loaded; measuring early would mis-paginate.
      await Promise.all(
        Array.from(root.querySelectorAll("img")).map((img) =>
          img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }),
        ),
      );
      if (cancelled) return;
      const heights = Array.from(root.children).map((c) => (c as HTMLElement).getBoundingClientRect().height);
      const pageH = probe.getBoundingClientRect().height;
      const paged = paginate(
        heights,
        blocks.map((b) => b.keepWithNext),
        pageH - 6, // 6px safety buffer above bottom margin to prevent footer collision
        blocks.map((b) => b.groupId),
        blocks.map((b) => Boolean(b.forceBreakBefore))
      );
      if (fitActive && isWorksheet) {
        const next = nextFitLevel(fitLevel, paged.length, fitMaxPages, fitLevels.length - 1);
        if (next !== null) {
          // Still too long: re-measure with tighter spacing before showing anything.
          setFitState({ key: fitInputKey, level: next, measured: [], final: false });
          return;
        }
      } else if (fitActive && !fitCurrent?.final) {
        // Booklet: try each level until no sheet can be saved any more, then print at the loosest level
        // that reaches the fewest sheets. Tightening that saves no sheet is not applied.
        const measured = [...(fitCurrent?.measured ?? []), paged.length];
        const atFloor = sheetCost(paged.length, fitTwoUp) <= sheetCost(1, fitTwoUp);
        if (!atFloor && fitLevel < fitLevels.length - 1) {
          setFitState({ key: fitInputKey, level: fitLevel + 1, measured, final: false });
          return;
        }
        const chosen = chooseFitLevel(measured, fitTwoUp);
        if (chosen !== fitLevel) {
          setFitState({ key: fitInputKey, level: chosen, measured, final: true });
          return;
        }
      }
      setPages(paged);
      setFitStatus(fitActive ? describeFit(fitLevel, paged.length, fitMaxPages, fitLevels) : undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [blocks, fitActive, fitLevel, fitCurrent, fitInputKey, fitMaxPages, fitLevels, fitTwoUp, isWorksheet]);

  const pageCount = pages?.length ?? 0;
  const isEligibleTwoUp = isA5 && pageCount > 0 && pageCount <= 2;
  const isEffectiveTwoUp = Boolean(isEligibleTwoUp && twoUpCutMode);

  const sheets = useMemo(() => {
    if (pageCount <= 0) return [];
    if (isEffectiveTwoUp) {
      return imposeTwoUpCut(pageCount);
    }
    return isBooklet ? imposeBooklet(pageCount) : [];
  }, [isBooklet, pageCount, isEffectiveTwoUp]);

  const isBookletPrint = (isBooklet || isEffectiveTwoUp) && view === "sheets";
  const pageSize = isBookletPrint
    ? isA5
      ? "A4 landscape"
      : "A3 landscape"
    : isA5
    ? "A5 portrait"
    : "A4 portrait";

  useEffect(() => {
    if (pageCount > 0) {
      const totalPages = isBookletPrint
        ? sheets.length * 4
        : pageCount + (includeRoughWork ? 1 : 0);
      onInfo?.({ pages: totalPages, contentPages: pageCount, sheets: sheets.length, isTwoUpCut: isEffectiveTwoUp, fit: fitStatus });
    }
  }, [pageCount, sheets.length, isBookletPrint, includeRoughWork, isEffectiveTwoUp, fitStatus, onInfo]);

  const continuationKeys = useMemo(() => {
    if (!pages) return new Set<string>();
    const seenGroups = new Set<string>();
    const contKeys = new Set<string>();
    for (const pageBlockIndices of pages) {
      const groupsOnThisPage = new Set<string>();
      for (const idx of pageBlockIndices) {
        const b = blocks[idx];
        // `pages` can be one render behind `blocks` (it is re-measured in an effect)
        if (b?.groupId) {
          if (seenGroups.has(b.groupId) && !groupsOnThisPage.has(b.groupId)) {
            contKeys.add(b.key);
          }
          groupsOnThisPage.add(b.groupId);
        }
      }
      for (const g of groupsOnThisPage) {
        seenGroups.add(g);
      }
    }
    return contKeys;
  }, [pages, blocks]);

  const pageEl = (i: number | null, key: string) =>
    i === null || !pages ? (
      <BlankPage key={key} showTemplate={includeRoughWork} isA5={isA5} />
    ) : (
      <Page
        key={key}
        n={i + 1}
        total={pageCount}
        blocks={pages[i].map((b) => blocks[b]).filter(Boolean)}
        isA5={isA5}
        continuationKeys={continuationKeys}
        watermark={effectiveWatermark}
        watermarkText={effectiveWatermarkText}
        lang={paperLang}
        zoom={fit.zoom}
        fit={fit}
      />
    );

  const reading = pages && (
    <div className="screen-zoom flex flex-col items-center gap-4" style={{ zoom }}>
      {pages.map((_, i) => (
        <div key={i} className="page-frame shadow-md">
          {pageEl(i, `p${i}`)}
        </div>
      ))}
      {includeRoughWork && (
        <div className="page-frame shadow-md">
          <BlankPage showTemplate={true} isA5={isA5} />
        </div>
      )}
    </div>
  );

  const sheetEls =
    pages &&
    sheets.flatMap((s, k) =>
      (["front", "back"] as const)
        // A one-page paper printed two-up has an empty back: use it for rough work when asked.
        .filter((side) => s[side][0] !== null || s[side][1] !== null || (includeRoughWork && isEffectiveTwoUp))
        .map((side) => (
          <div key={`${k}-${side}`} className="page-frame shadow-md relative">
            <div className="no-print mb-1 text-center text-xs font-semibold text-slate-500">
              {isEffectiveTwoUp
                ? `A4 Sheet (2-Up Cut Mode · 2 Copies per sheet) · ${side.toUpperCase()} (Side ${side === "front" ? "1" : "2"})`
                : isA5
                ? `A4 Sheet (Fold to A5) ${k + 1} · ${side.toUpperCase()} (Side ${side === "front" ? "1" : "2"})`
                : `A3 Sheet (Fold to A4) ${k + 1} · ${side.toUpperCase()} (Side ${side === "front" ? "1" : "2"})`}
            </div>
            <div className={`${isA5 ? "a4-sheet" : "a3-sheet"} relative`}>
              {pageEl(s[side][0], "l")}
              {pageEl(s[side][1], "r")}
              {isEffectiveTwoUp && (
                <div
                  className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 pointer-events-none z-20 flex flex-col justify-between items-center"
                  style={{ width: "0px", borderLeft: "1.5px dashed #94a3b8" }}
                >
                  <div
                    className="absolute top-[2mm] -translate-x-1/2 bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[6.5pt] font-semibold text-slate-600 tracking-wider whitespace-nowrap select-none shadow-2xs"
                    style={{ lineHeight: 1 }}
                  >
                    ✂ CUT
                  </div>
                  <div
                    className="absolute bottom-[2mm] -translate-x-1/2 bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[6.5pt] font-semibold text-slate-600 tracking-wider whitespace-nowrap select-none shadow-2xs"
                    style={{ lineHeight: 1 }}
                  >
                    ✂ CUT
                  </div>
                </div>
              )}
            </div>
          </div>
        )),
    );

  return (
    <>
      <style>{`@page { size: ${pageSize}; margin: 0; }`}</style>

      {/* Hidden measuring area: same width and typography as a real page's content box. */}
      <div
        aria-hidden
        className="no-print"
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <div ref={probeRef} style={{ width: "1px", height: `${contentH}mm` }} />
        <div
          ref={measureRef}
          className={`${isA5 ? "a5-measure" : "a4-measure"} paper-font`}
          style={{ width: `${contentW / (fit.layoutZoom ?? fit.zoom)}mm`, ...(fit.zoom !== 1 ? { zoom: fit.zoom } : null) }}
        >
          {blocks.map((b) => (
            <div key={b.key} style={{ display: "flow-root" }}>
              {renderBlock(b, false)}
            </div>
          ))}
        </div>
      </div>

      {!pages && <p className="p-8 text-center text-sm text-slate-500">Calculating pagination &amp; sheet layout…</p>}

      {isBooklet ? (
        <>
          <div className={view === "reading" ? "block" : "hidden"}>{reading}</div>
          <div className={view === "sheets" ? "block" : "hidden"}>
            <div className="screen-zoom flex flex-col items-center gap-4" style={{ zoom }}>
              {sheetEls}
            </div>
          </div>
        </>
      ) : (
        reading
      )}
    </>
  );
}
