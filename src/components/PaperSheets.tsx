"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { QuestionView } from "@/components/QuestionView";
import { imageUrl } from "@/lib/client";
import {
  DEFAULT_SCHOOL_LOGO,
  DEFAULT_SCHOOL_NAME,
  EXAM_TYPE_LABEL,
  isBookletLayout,
  QUESTION_TYPE_LABEL,
  resolvePaperExamType,
} from "@/lib/constants";
import { formatQuestionNumber, imposeBooklet, paginate } from "@/lib/layout";
import type { PaperData } from "@/lib/types";

type Block = { key: string; keepWithNext: boolean; node: ReactNode };

// A4 minus page padding (see .a4 in globals.css): 14mm sides, 14mm top, 16mm bottom.
const CONTENT_W_MM = 182;
const CONTENT_H_MM = 267;

// A5 minus page padding (see .a5 in globals.css): 10mm sides, 10mm top, 12mm bottom.
const A5_CONTENT_W_MM = 128.5;
const A5_CONTENT_H_MM = 188;

function extractSectionLetter(title: string, fallbackIndex: number): string {
  const match = title.match(/\b([A-Z])\b/i);
  if (match) return match[1].toUpperCase();
  return String.fromCharCode(65 + (fallbackIndex % 26));
}

function buildBlocks(paper: PaperData, compact?: boolean, isA5?: boolean): Block[] {
  const { blueprint } = paper;
  const total = paper.progress.totalMarks;
  const examType = resolvePaperExamType(paper);
  const examHeading = `${EXAM_TYPE_LABEL[examType]} Examination`;
  const sessionText = paper.academicSession || blueprint.academicSession || "2025–26";
  const blocks: Block[] = [];

  const isEffectiveCompact = compact || paper.printDensity === "COMPACT";
  const questionBottomPadding =
    paper.printDensity === "COMPACT" ? "2.5mm" : paper.printDensity === "COMFORTABLE" ? "5.5mm" : "4mm";
  const resolvedLogoSrc =
    paper.schoolLogo === "NONE"
      ? null
      : paper.logoPath
      ? imageUrl(paper.logoPath)
      : paper.schoolLogo || DEFAULT_SCHOOL_LOGO;
  const logoBoxSize = isA5 ? "12.5mm" : "15.5mm";

  blocks.push({
    key: "header",
    keepWithNext: true,
    node: (
      <div style={{ paddingBottom: "3mm" }}>
        {/* Top Board Meta Bar: Question Count, Set Box, Subject Code */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2mm",
            fontSize: "8.5pt",
            borderBottom: "1px solid #cbd5e1",
            paddingBottom: "1.5mm",
          }}
        >
          <div>
            <span style={{ fontWeight: 600 }}>Total Questions: </span>
            <strong>{paper.items.length}</strong>
          </div>
          {paper.paperSet && (
            <div
              style={{
                border: "2px solid #000",
                padding: "1px 8px",
                fontWeight: 800,
                fontSize: "9.5pt",
                letterSpacing: "0.05em",
              }}
            >
              {paper.paperSet.toUpperCase().startsWith("SET")
                ? paper.paperSet.toUpperCase()
                : `SET ${paper.paperSet.toUpperCase()}`}
            </div>
          )}
          {(paper.subjectCode || blueprint.subjectCode) && (
            <div>
              <span style={{ fontWeight: 600 }}>Subject Code: </span>
              <strong>{paper.subjectCode || blueprint.subjectCode}</strong>
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
                fontSize: isA5 ? "11.5pt" : "14pt",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                lineHeight: 1.2,
              }}
            >
              {paper.schoolName || DEFAULT_SCHOOL_NAME}
            </div>
            <div style={{ fontSize: isA5 ? "9.5pt" : "11pt", fontWeight: 700, marginTop: "0.6mm" }}>
              {examHeading} ({sessionText})
              {paper.examDate ? ` · ${new Date(paper.examDate + "T00:00:00").toLocaleDateString("en-GB")}` : ""}
            </div>
            <div style={{ fontSize: isA5 ? "9pt" : "10.5pt", fontWeight: 600, marginTop: "0.5mm" }}>
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
            marginTop: "2mm",
            fontWeight: 700,
            fontSize: isA5 ? "8.5pt" : "9.5pt",
            borderTop: "1.2px solid #000",
            borderBottom: "1.2px solid #000",
            padding: "1.2mm 1mm",
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "2.5mm",
              fontSize: "8.5pt",
              border: "1px solid #333",
              padding: "2mm 2.5mm",
              borderRadius: "2px",
              backgroundColor: "#fafafa",
            }}
          >
            <div>
              <span style={{ fontWeight: 700 }}>Student Name: </span>
              <span style={{ display: "inline-block", width: "42mm", borderBottom: "1px solid #000" }}>&nbsp;</span>
            </div>
            <div>
              <span style={{ fontWeight: 700 }}>Class &amp; Sec: </span>
              <span style={{ display: "inline-block", width: "16mm", borderBottom: "1px solid #000" }}>&nbsp;</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5mm" }}>
              <span style={{ fontWeight: 700 }}>Roll No:</span>
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
            {paper.showSignatures !== false && (
              <div>
                <span style={{ fontWeight: 700 }}>Invigilator Sign: </span>
                <span style={{ display: "inline-block", width: "20mm", borderBottom: "1px solid #000" }}>&nbsp;</span>
              </div>
            )}
          </div>
        )}

        {/* General Instructions Box */}
        {paper.generalInstructions && (
          <div
            style={{
              marginTop: "2.5mm",
              padding: "2mm 3mm",
              backgroundColor: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "3px",
              fontSize: "8.5pt",
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 700, textDecoration: "underline", marginBottom: "1mm", color: "#0f172a" }}>
              General Instructions / सामान्य निर्देश:
            </div>
            <div style={{ whiteSpace: "pre-line", color: "#334155" }}>{paper.generalInstructions}</div>
          </div>
        )}
      </div>
    ),
  });

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

      blocks.push({
        key: `sec-main-${s.id}`,
        keepWithNext: true,
        node: (
          <div style={{ padding: "3mm 0 1.5mm" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                borderBottom: "1.5px solid #000",
                paddingBottom: "1mm",
                textTransform: "uppercase",
                fontSize: isA5 ? "10pt" : "11pt",
              }}
            >
              <span>{s.title}</span>
              <span style={{ fontWeight: 600, fontSize: isA5 ? "8.5pt" : "9.5pt" }}>
                {groupCount} Questions · {groupMarks} Marks
              </span>
            </div>
            {s.instructions && (
              <div style={{ fontStyle: "italic", marginTop: "1mm", fontSize: "8.5pt", color: "#334155" }}>
                {s.instructions}
              </div>
            )}
          </div>
        ),
      });
    }

    // If section has multiple question types, render a clean sub-heading for this question type!
    if (hasMultipleTypes) {
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
              padding: "1mm 2mm",
              margin: "1.5mm 0 2mm",
            }}
          >
            <span>{QUESTION_TYPE_LABEL[s.type as keyof typeof QUESTION_TYPE_LABEL] || s.type}</span>
            <span>
              {s.count} question(s) × {s.marksEach} mark(s) = {s.count * s.marksEach}m
            </span>
          </div>
        ),
      });
    }

    for (const it of paper.items.filter((item) => item.sectionId === s.id)) {
      const numberLabel = formatQuestionNumber(
        paper.numberingStyle || "CONTINUOUS",
        n,
        sectionLetter,
        sectionRelativeCounter
      );
      n += 1;
      sectionRelativeCounter += 1;
      blocks.push({
        key: it.id,
        keepWithNext: false,
        node: (
          <div style={{ paddingBottom: questionBottomPadding }}>
            <QuestionView
              q={it.question}
              orQuestion={it.orQuestion}
              number={n}
              numberLabel={numberLabel}
              marks={s.marksEach}
              marksStyle={paper.marksStyle || "RIGHT_COLUMN"}
              compact={isEffectiveCompact}
            />
          </div>
        ),
      });
    }
  }

  blocks.push({
    key: "end",
    keepWithNext: false,
    node: (
      <div
        style={{
          textAlign: "center",
          paddingTop: "5mm",
          paddingBottom: "2mm",
          fontSize: "9pt",
          fontWeight: 700,
          letterSpacing: "0.06em",
          borderTop: "1.2px dashed #94a3b8",
          marginTop: "4mm",
          color: "#334155",
        }}
      >
        *** END OF QUESTION PAPER / समाप्त ***
      </div>
    ),
  });

  return blocks;
}

function Page({ n, total, blocks, isA5 }: { n: number; total: number; blocks: Block[]; isA5?: boolean }) {
  const isLastPage = n === total;
  return (
    <div className={`${isA5 ? "a5" : "a4"} paper-font`}>
      {blocks.map((b) => (
        <div key={b.key} style={{ display: "flow-root" }}>
          {b.node}
        </div>
      ))}
      <div className="page-footer">
        <div style={{ width: isA5 ? "20mm" : "35mm" }}>{/* Left gutter spacer */}</div>
        <div style={{ fontWeight: 600, fontSize: isA5 ? "7.5pt" : "8.5pt", color: "#334155" }}>
          Page {n} of {total}
        </div>
        <div style={{ width: isA5 ? "20mm" : "35mm", textAlign: "right", fontWeight: 700, fontSize: isA5 ? "7pt" : "8pt", color: "#1e293b" }}>
          {!isLastPage && <span>P.T.O. / कृपया उलटिए &rarr;</span>}
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

export type SheetsInfo = { pages: number; sheets: number };

/**
 * Lays the paper out on real A4 or A5 pages (measured in the browser), then stacks them (PAGE),
 * imposes onto A4-landscape sheets folded to A5 (BOOKLET_A4), or imposes onto A3-landscape sheets (BOOKLET).
 */
export function PaperSheets({
  paper,
  view,
  zoom,
  compact,
  includeRoughWork = true,
  onInfo,
}: {
  paper: PaperData;
  view: "reading" | "sheets";
  zoom: number;
  compact?: boolean;
  includeRoughWork?: boolean;
  onInfo?: (i: SheetsInfo) => void;
}) {
  const isA5 = paper.layout === "BOOKLET_A4";
  const isBooklet = isBookletLayout(paper.layout);
  const blocks = useMemo(() => buildBlocks(paper, compact, isA5), [paper, compact, isA5]);
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
      setPages(paginate(heights, blocks.map((b) => b.keepWithNext), pageH - 2)); // 2px slack for rounding
    })();
    return () => {
      cancelled = true;
    };
  }, [blocks]);

  const pageCount = pages?.length ?? 0;
  const sheets = useMemo(
    () => (isBooklet && pageCount > 0 ? imposeBooklet(pageCount) : []),
    [isBooklet, pageCount],
  );

  const isBookletPrint = isBooklet && view === "sheets";
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
      onInfo?.({ pages: totalPages, sheets: sheets.length });
    }
  }, [pageCount, sheets.length, isBookletPrint, includeRoughWork, onInfo]);

  const pageEl = (i: number | null, key: string) =>
    i === null || !pages ? (
      <BlankPage key={key} showTemplate={includeRoughWork} isA5={isA5} />
    ) : (
      <Page key={key} n={i + 1} total={pageCount} blocks={pages[i].map((b) => blocks[b])} isA5={isA5} />
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
      (["front", "back"] as const).map((side) => (
        <div key={`${k}-${side}`} className="page-frame shadow-md">
          <div className="no-print mb-1 text-center text-xs font-semibold text-slate-500">
            {isA5 ? "A4 Sheet (Fold to A5)" : "A3 Sheet (Fold to A4)"} {k + 1} · {side.toUpperCase()} (Side {side === "front" ? "1" : "2"})
          </div>
          <div className={isA5 ? "a4-sheet" : "a3-sheet"}>
            {pageEl(s[side][0], "l")}
            {pageEl(s[side][1], "r")}
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
              {b.node}
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
