"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { QuestionView } from "@/components/QuestionView";
import { MathText } from "@/components/MathText";
import { imageUrl } from "@/lib/client";
import {
  cleanQuestionStatement,
  DEFAULT_SCHOOL_LOGO,
  DEFAULT_SCHOOL_NAME,
  detectPaperLanguage,
  EXAM_TYPE_LABEL,
  formatExerciseFormula,
  formatMarksLabel,
  getQuestionTypeLabel,
  getSharedInstruction,
  isBookletLayout,
  isPrePrimaryClass,
  isSubpartQuestionType,
  parseMatchColumnPairs,
  QUESTION_TYPE_LABEL,
  resolvePaperExamType,
} from "@/lib/constants";
import { WorkbookHeader } from "@/lib/kindergarten/components/WorkbookHeader";
import {
  computeDisplayedPaperNumbering,
  formatQuestionNumber,
  imposeBooklet,
  imposeTwoUpCut,
  paginate,
  reconcileSectionGroupInstruction,
  resolveGroupedExerciseInstruction,
} from "@/lib/layout";
import { resolveBoardAndSubjectCode } from "@/lib/curriculumContract";
import type { PaperData } from "@/lib/types";

const LETTERS = "ABCDEFGHIJ";

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

// A5 minus page padding (see .a5 in globals.css): 9mm sides, 8mm top, 14mm bottom.
const A5_CONTENT_W_MM = 130.5;
const A5_CONTENT_H_MM = 188;

function extractSectionLetter(title: string, fallbackIndex: number): string {
  const match = title.match(/\b([A-Z])\b/i);
  if (match) return match[1].toUpperCase();
  return String.fromCharCode(65 + (fallbackIndex % 26));
}

function buildBlocks(paper: PaperData, compact?: boolean, isA5?: boolean, showSignatures?: boolean): Block[] {
  const { blueprint } = paper;
  const paperLang = detectPaperLanguage(paper, paper.items);
  const isHindi = paperLang === "hi";
  const total = paper.progress.totalMarks;
  const examType = resolvePaperExamType(paper);
  const examHeading = `${EXAM_TYPE_LABEL[examType]} Examination`;
  const sessionText = paper.academicSession || blueprint.academicSession || "2025–26";
  const numbering = computeDisplayedPaperNumbering(
    blueprint.sections,
    paper.items,
    paper.numberingStyle || "CONTINUOUS"
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
  const questionBottomPadding =
    paper.printDensity === "COMPACT" || isEffectiveCompact
      ? isA5 ? "2mm" : "2.5mm"
      : paper.printDensity === "COMFORTABLE"
      ? isA5 ? "4mm" : "5.5mm"
      : isA5 ? "3mm" : "4mm";
  const resolvedLogoSrc =
    paper.schoolLogo === "NONE"
      ? null
      : paper.logoPath
      ? imageUrl(paper.logoPath)
      : paper.schoolLogo || DEFAULT_SCHOOL_LOGO;
  const logoBoxSize = isA5 ? "12mm" : "15.5mm";
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
        <div style={{ paddingBottom: isA5 ? "2mm" : "3mm" }}>
          {/* Top Board Meta Bar: Question Count, Set Box, Subject Code */}
          <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isA5 ? "1.5mm" : "2mm",
            fontSize: isA5 ? "7.5pt" : "8.5pt",
            borderBottom: "1px solid #cbd5e1",
            paddingBottom: "1.5mm",
          }}
        >
          <div>
            <span style={{ fontWeight: 600 }}>Total Questions: </span>
            <strong>{numbering.totalDisplayedQuestions}</strong>
          </div>
          {paper.paperSet && (
            <div
              style={{
                border: "2px solid #000",
                padding: isA5 ? "0.5px 6px" : "1px 8px",
                fontWeight: 800,
                fontSize: isA5 ? "8.5pt" : "9.5pt",
                letterSpacing: "0.05em",
              }}
            >
              {paper.paperSet.toUpperCase().startsWith("SET")
                ? paper.paperSet.toUpperCase()
                : `SET ${paper.paperSet.toUpperCase()}`}
            </div>
          )}
          {effectiveSubjectCode && (
            <div>
              <span style={{ fontWeight: 600 }}>Subject Code: </span>
              <strong>{effectiveSubjectCode}</strong>
            </div>
          )}
        </div>

        {/* School Emblem + Centered School Name & Exam Title Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2.5mm",
          }}
        >
          {resolvedLogoSrc ? (
            <div style={{ width: logoBoxSize, height: logoBoxSize, flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedLogoSrc}
                alt="School Emblem"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          ) : null}

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

          {resolvedLogoSrc ? <div style={{ width: logoBoxSize, flexShrink: 0 }} aria-hidden /> : null}
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
            Time Allowed:{" "}
            {blueprint.durationMin >= 60
              ? `${Math.floor(blueprint.durationMin / 60)} hr ${
                  blueprint.durationMin % 60 ? `${blueprint.durationMin % 60} min` : ""
                }`
              : `${blueprint.durationMin} min`}
          </span>
          <span>Maximum Marks: {total}</span>
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
            {isA5 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2mm" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, marginRight: "3mm" }}>
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Student Name:&nbsp;</span>
                    <span style={{ display: "inline-block", flex: 1, borderBottom: "1px solid #000" }}>&nbsp;</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5mm", flexShrink: 0 }}>
                    <span style={{ fontWeight: 700 }}>Roll No:</span>
                    <span style={{ display: "inline-flex", gap: "1px" }}>
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <span
                          key={i}
                          style={{
                            width: "3.5mm",
                            height: "4.2mm",
                            border: "1px solid #000",
                            display: "inline-block",
                            backgroundColor: "#fff",
                          }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, marginRight: "3mm" }}>
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      {isHindi ? "कक्षा व वर्ग:" : paperLang === "bilingual" ? "Class & Sec / कक्षा:" : "Class & Section:"}&nbsp;
                    </span>
                    <span style={{ display: "inline-block", width: "24mm", borderBottom: "1px solid #000" }}>&nbsp;</span>
                  </div>
                  {effectiveShowSignatures && (
                    <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        {isHindi ? "निरीक्षक हस्ताक्षर:" : paperLang === "bilingual" ? "Invig. Sign / हस्ताक्षर:" : "Invigilator Sign:"}&nbsp;
                      </span>
                      <span style={{ display: "inline-block", width: "24mm", borderBottom: "1px solid #000" }}>&nbsp;</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5mm" }}>
                <div style={{ display: "flex", alignItems: "center", flex: "1 1 50mm" }}>
                  <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {isHindi ? "विद्यार्थी का नाम:" : paperLang === "bilingual" ? "Student Name / नाम:" : "Student Name:"}&nbsp;
                  </span>
                  <span style={{ display: "inline-block", flex: 1, borderBottom: "1px solid #000" }}>&nbsp;</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {isHindi ? "कक्षा व वर्ग:" : paperLang === "bilingual" ? "Class / कक्षा:" : "Class & Sec:"}&nbsp;
                  </span>
                  <span style={{ display: "inline-block", width: "16mm", borderBottom: "1px solid #000" }}>&nbsp;</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5mm", flexShrink: 0 }}>
                  <span style={{ fontWeight: 700 }}>
                    {isHindi ? "अनुक्रमांक:" : paperLang === "bilingual" ? "Roll No / रोल नं:" : "Roll No:"}
                  </span>
                  <span style={{ display: "inline-flex", gap: "1.5px" }}>
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: "4.5mm",
                          height: "5.2mm",
                          border: "1.2px solid #000",
                          display: "inline-block",
                          backgroundColor: "#fff",
                        }}
                      />
                    ))}
                  </span>
                </div>
                {effectiveShowSignatures && (
                  <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      {isHindi ? "निरीक्षक हस्ताक्षर:" : paperLang === "bilingual" ? "Invig. Sign / हस्ताक्षर:" : "Invigilator Sign:"}&nbsp;
                    </span>
                    <span style={{ display: "inline-block", width: "20mm", borderBottom: "1px solid #000" }}>&nbsp;</span>
                  </div>
                )}
              </div>
            )}
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

    // Only render the main SECTION header if it's the first in this title group!
    if (!isSameAsPrev) {
      const allInGroup = blueprint.sections.filter(
        (x) => x.title.trim().toLowerCase() === s.title.trim().toLowerCase()
      );
      const groupMarks = allInGroup.reduce((sum, x) => sum + x.count * x.marksEach, 0);
      const groupCount = allInGroup.reduce((sum, x) => sum + x.count, 0);
      const secRange = numbering.sectionRanges[s.id];
      const reconciledMainInstruction = reconcileSectionGroupInstruction(
        s.instructions,
        secRange?.groupStartQ ?? 0,
        secRange?.groupEndQ ?? 0
      );

      const groupRightLabel = isHindi
        ? `${groupCount} प्रश्न · ${groupMarks} अंक`
        : paperLang === "bilingual"
        ? `${groupCount} Questions / प्रश्न · ${groupMarks} Marks / अंक`
        : `${groupCount} Questions · ${groupMarks} Marks`;

      blocks.push({
        key: `sec-main-${s.id}`,
        keepWithNext: true,
        node: (
          <div style={{ padding: isA5 ? "2mm 0 1mm" : "3mm 0 1.5mm" }}>
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
              <span>{s.title}</span>
              <span style={{ fontWeight: 600, fontSize: isA5 ? "9pt" : "9.5pt" }}>
                {groupRightLabel}
              </span>
            </div>
            {reconciledMainInstruction && (
              <div style={{ fontStyle: "italic", marginTop: "0.8mm", fontSize: "8.5pt", color: "#334155" }}>
                {reconciledMainInstruction}
              </div>
            )}
          </div>
        ),
      });
    }

    // If section has multiple question types, render a clean sub-heading for this question type!
    if (hasMultipleTypes) {
      const typeLabel = getQuestionTypeLabel(s.type, paperLang);
      const typeFormula =
        s.type === "MATCH_COLUMN"
          ? isHindi
            ? `1 प्रश्न (${s.count} जोड़ियाँ) × ${s.marksEach} अंक = ${s.count * s.marksEach} अंक`
            : `1 question (${s.count} pairs) × ${s.marksEach}m = ${s.count * s.marksEach}m`
          : isHindi
          ? `${s.count} प्रश्न × ${s.marksEach} अंक = ${s.count * s.marksEach} अंक`
          : `${s.count} question(s) × ${s.marksEach} mark(s) = ${s.count * s.marksEach}m`;

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
              margin: isA5 ? "1mm 0 1.5mm" : "1.5mm 0 2mm",
            }}
          >
            <span>{typeLabel}</span>
            <span>{typeFormula}</span>
          </div>
        ),
      });
    }

    const sectionItems = paper.items.filter((item) => item.sectionId === s.id);
    const isGroupedObjective =
      (s.type === "TRUE_FALSE" || s.type === "FILL_BLANK") && sectionItems.length > 1;

    if (isGroupedObjective) {
      const exerciseN = n;
      const exerciseLabel = formatQuestionNumber(
        paper.numberingStyle || "CONTINUOUS",
        exerciseN,
        sectionLetter,
        sectionRelativeCounter
      );
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

      sectionItems.forEach((it, itemIdx) => {
        const isLastItem = itemIdx === sectionItems.length - 1;
        const subLabel = `(${LETTERS[itemIdx]?.toLowerCase() ?? itemIdx + 1})`;
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
                paddingBottom: isLastItem ? questionBottomPadding : isA5 ? "1.5mm" : "2mm",
              }}
            >
              <span style={{ fontWeight: 600, minWidth: isA5 ? "5.5mm" : "6.5mm" }}>{subLabel}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: isA5 ? 1.35 : 1.45 }}>
                  <MathText text={cleanQuestionStatement(it.question.text, s.type)} />
                </div>
                {it.question.imagePath && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl(it.question.imagePath)}
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
              </div>
            </div>
          ),
        });
      });
    } else {
      for (const it of sectionItems) {
        const currentN = n;
        const numberLabel = formatQuestionNumber(
          paper.numberingStyle || "CONTINUOUS",
          currentN,
          sectionLetter,
          sectionRelativeCounter
        );
        n += 1;
        sectionRelativeCounter += 1;

        const subparts = isSubpartQuestionType(it.question.type) ? it.question.subparts : [];
        const canDecompose = !isPrePrimary && !it.orQuestion && subparts && subparts.length > 1;
        const isMatch = s.type === "MATCH_COLUMN" || it.question.type === "MATCH_COLUMN";
        const matchPairCount = isMatch
          ? (parseMatchColumnPairs(it.question.options, it.question.text, (it.question as any).explanation).length || s.count)
          : 0;
        const subpartsMarks = subparts && subparts.length > 0 ? subparts.reduce((sum, sp) => sum + (sp.marks || 1), 0) : 0;
        const totalQuestionMarks = isMatch
          ? (s.count === 1 ? s.marksEach : Math.min(matchPairCount * s.marksEach, s.count * s.marksEach))
          : subpartsMarks > 0
          ? subpartsMarks
          : s.marksEach;

        if (canDecompose) {
          // Passage stem keepWithNext: true ensures stems are never detached from first subpart
          blocks.push({
            key: `${it.id}-stem`,
            keepWithNext: true,
            forceBreakBefore: Boolean(it.pageBreakBefore),
            groupId: it.id,
            render: () => (
              <div style={{ paddingBottom: isA5 ? "1.5mm" : "2.5mm" }}>
                <QuestionView
                  q={it.question}
                  number={currentN}
                  numberLabel={numberLabel}
                  marks={totalQuestionMarks}
                  marksStyle={paper.marksStyle || "RIGHT_COLUMN"}
                  compact={isEffectiveCompact}
                  renderMode="STEM_ONLY"
                  isA5={isA5}
                  lang={paperLang}
                />
              </div>
            ),
          });

          // 2. Individual subparts: can cleanly break across page boundaries
          subparts.forEach((_, spIdx) => {
            const isLastSubpart = spIdx === subparts.length - 1;
            blocks.push({
              key: `${it.id}-sp-${spIdx}`,
              keepWithNext: false,
              groupId: it.id,
              render: ({ isContinuation }) => (
                <div style={{ paddingBottom: isLastSubpart ? questionBottomPadding : isA5 ? "1.5mm" : "2.5mm" }}>
                  <QuestionView
                    q={it.question}
                    number={currentN}
                    numberLabel={numberLabel}
                    marks={s.marksEach}
                    marksStyle={paper.marksStyle || "RIGHT_COLUMN"}
                    compact={isEffectiveCompact}
                    renderMode="SUBPART_ONLY"
                    subpartIndex={spIdx}
                    isContinuation={isContinuation}
                    isA5={isA5}
                    lang={paperLang}
                  />
                </div>
              ),
            });
          });
        } else {
          blocks.push({
            key: it.id,
            keepWithNext: false,
            forceBreakBefore: Boolean(it.pageBreakBefore),
            groupId: it.id,
            render: () => (
              <div style={{ paddingBottom: questionBottomPadding }}>
                <QuestionView
                  q={it.question}
                  orQuestion={it.orQuestion}
                  number={currentN}
                  numberLabel={numberLabel}
                  marks={totalQuestionMarks}
                  marksStyle={paper.marksStyle || "RIGHT_COLUMN"}
                  compact={isEffectiveCompact}
                  isA5={isA5}
                  lang={paperLang}
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
          paddingTop: isA5 ? "3mm" : "5mm",
          paddingBottom: "2mm",
          fontSize: isA5 ? "8.5pt" : "9pt",
          fontWeight: 700,
          letterSpacing: "0.06em",
          borderTop: "1.2px dashed #94a3b8",
          marginTop: isA5 ? "2.5mm" : "4mm",
          color: "#334155",
        }}
      >
        *** END OF QUESTION PAPER / समाप्त ***
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
}: {
  n: number;
  total: number;
  blocks: Block[];
  isA5?: boolean;
  continuationKeys?: Set<string>;
  watermark?: boolean;
  watermarkText?: string;
}) {
  const isLastPage = n === total;
  return (
    <div className={`${isA5 ? "a5" : "a4"} paper-font relative overflow-hidden`}>
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
      <div style={{ position: "relative", zIndex: 1 }}>
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
          Page {n} of {total}
        </div>
        <div style={{ flex: 1, textAlign: "right", fontWeight: 700, fontSize: isA5 ? "7pt" : "8pt", color: "#1e293b" }}>
          {!isLastPage ? <span>P.T.O. / कृपया उलटिए &rarr;</span> : null}
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

export type SheetsInfo = { pages: number; sheets: number; isTwoUpCut?: boolean };

/**
 * Lays the paper out on real A4 or A5 pages (measured in the browser), then stacks them (PAGE),
 * imposes onto A4-landscape sheets folded to A5 (BOOKLET_A4), or imposes onto A3-landscape sheets (BOOKLET).
 */
export function PaperSheets({
  paper,
  view = "sheets",
  zoom = 1,
  compact,
  includeRoughWork = false,
  showSignatures,
  watermark,
  watermarkText,
  twoUpCutMode,
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
  onInfo?: (i: SheetsInfo) => void;
}) {
  const isA5 = paper.layout === "BOOKLET_A4";
  const isBooklet = isBookletLayout(paper.layout);
  const effectiveWatermark = watermark ?? paper.securityWatermark ?? false;
  const effectiveWatermarkText = watermarkText || paper.watermarkText || "CONFIDENTIAL — SARVODAYA EXAM CELL";
  const blocks = useMemo(
    () => buildBlocks(paper, compact, isA5, showSignatures),
    [paper, compact, isA5, showSignatures]
  );
  const measureRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][] | null>(null);

  const contentW = isA5 ? A5_CONTENT_W_MM : CONTENT_W_MM;
  const contentH = isA5 ? A5_CONTENT_H_MM : CONTENT_H_MM;

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
      setPages(
        paginate(
          heights,
          blocks.map((b) => b.keepWithNext),
          pageH - 6, // 6px safety buffer above bottom margin to prevent footer collision
          blocks.map((b) => b.groupId),
          blocks.map((b) => Boolean(b.forceBreakBefore))
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [blocks]);

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
      onInfo?.({ pages: totalPages, sheets: sheets.length, isTwoUpCut: isEffectiveTwoUp });
    }
  }, [pageCount, sheets.length, isBookletPrint, includeRoughWork, isEffectiveTwoUp, onInfo]);

  const continuationKeys = useMemo(() => {
    if (!pages) return new Set<string>();
    const seenGroups = new Set<string>();
    const contKeys = new Set<string>();
    for (const pageBlockIndices of pages) {
      const groupsOnThisPage = new Set<string>();
      for (const idx of pageBlockIndices) {
        const b = blocks[idx];
        if (b.groupId) {
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
        blocks={pages[i].map((b) => blocks[b])}
        isA5={isA5}
        continuationKeys={continuationKeys}
        watermark={effectiveWatermark}
        watermarkText={effectiveWatermarkText}
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
        .filter((side) => s[side][0] !== null || s[side][1] !== null)
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
          style={{ width: `${contentW}mm` }}
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
