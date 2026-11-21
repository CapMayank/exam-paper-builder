import { withPairMarksNote } from "@/lib/flexibleMarksPrint";
import { imageUrl } from "@/lib/client";
import {
  canHaveSubparts,
  cleanMatchItem,
  cleanOptionText,
  formatMarksLabel,
  matchColumnLabels,
  getMatchColumnInstruction,
  isKindergartenType,
  isMcqLikeType,
  isSubpartQuestionType,
  normalizeMcqAnswer,
  parseMatchColumnPairs,
  type MarksStyle,
} from "@/lib/constants";
import { formatMarksValue } from "@/lib/types";
import { decomposeForSlot } from "@/lib/subpartExtractor";
import {
  getKindergartenActivity,
  parseKindergartenConfig,
} from "@/lib/kindergarten/registry";
import { getInternalChoiceSeparatorLabel } from "@/lib/internalChoiceRules";
import { isTextPredominantlySanskrit, type PaperLanguage } from "@/lib/localization";
import type { PrintFit } from "@/lib/printFit";
import { figureOptionColumns, hasFigureOptions, splitOptionFigure } from "@/lib/optionFigure";
import { optionLabel, optionMinWidth, splitStemParagraphs, subpartGridColumns } from "@/lib/compactLayout";
import { partsAttemptCount, showPartMarks } from "@/lib/marksDisplay";
import type { QuestionDto } from "@/lib/types";
import { MathText } from "@/components/MathText";
import { QuestionContent } from "@/components/QuestionContent";

const LETTERS_LIST = ["(A)", "(B)", "(C)", "(D)", "(E)", "(F)", "(G)", "(H)", "(I)", "(J)"];
const ROMAN_LOWER = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];

/**
 * Options laid out to use as few lines as they need: short ones four across, medium ones two across, and an
 * option too long for its share takes a row of its own instead of wrapping inside a narrow column.
 */
export function OptionFlow({ options, forceSingle, isA5, fontSize, marginTop }: { options: string[]; forceSingle?: boolean; isA5?: boolean; fontSize: string; marginTop: string }) {
  if (hasFigureOptions(options)) return <FigureOptionGrid options={options} isA5={isA5} fontSize={fontSize} marginTop={marginTop} />;
  const cleaned = options.map((o) => cleanOptionText(o));
  const minWidth = optionMinWidth(cleaned, forceSingle);
  const gapMm = isA5 ? 3 : 4;
  return (
    <div data-option-rows style={{ display: "flex", flexWrap: "wrap", gap: `${isA5 ? 1 : 1.5}mm ${gapMm}mm`, marginTop }}>
      {cleaned.map((o, i) => (
        <div
          key={i}
          className="opt-text"
          style={{
            // no grow: options that fit their share line up in columns across questions
            flex: "0 0 auto",
            minWidth: minWidth === "100%" ? "100%" : `calc(${minWidth} - ${gapMm}mm)`,
            maxWidth: "100%",
            boxSizing: "border-box",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontSize,
          }}
        >
          <span style={{ fontWeight: 600 }}>{optionLabel(i)}</span> <MathText text={o} />
        </div>
      ))}
    </div>
  );
}

/**
 * Picture options ("Which figure shows a rhombus?"): labelled pictures in a grid, four or two across, every picture
 * fitted into the same box so none looks bigger than the others. A caption, when the option has one, prints below.
 */
function FigureOptionGrid({ options, isA5, fontSize, marginTop }: { options: string[]; isA5?: boolean; fontSize: string; marginTop: string }) {
  const cols = figureOptionColumns(options, isA5);
  const boxMm = cols === 4 ? (isA5 ? 20 : 28) : isA5 ? 28 : 38;
  return (
    <div
      className="opt-figure-grid"
      data-option-rows
      style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: `${isA5 ? 1.5 : 2}mm ${isA5 ? 3 : 4}mm`, marginTop, breakInside: "avoid" }}
    >
      {options.map((o, i) => {
        const { figure, text } = splitOptionFigure(cleanOptionText(o));
        const caption = cleanOptionText(text);
        return (
          <div key={i} className="opt-text" style={{ display: "flex", alignItems: "flex-start", gap: "1.5mm", fontSize, minWidth: 0 }}>
            {/* fixed label width so every picture box is the same size, (m) as wide as (i) */}
            <span style={{ fontWeight: 600, flex: "0 0 auto", width: "1.9em" }}>{optionLabel(i)}</span>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {figure ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(figure)} alt={caption || `Option ${optionLabel(i)}`} style={{ width: "100%", height: `${boxMm}mm`, objectFit: "contain" }} />
              ) : null}
              {caption && (
                <div style={{ marginTop: figure ? "0.8mm" : 0, textAlign: "center", overflowWrap: "anywhere" }}>
                  <MathText text={caption} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The correct option as an answer key shows it: its picture (small) when it has one, then its text. */
export function ResolvedOptionText({ figure, text, fallback }: { figure?: string; text?: string; fallback: string }) {
  const shown = figure ? text ?? "" : text || fallback;
  return (
    <>
      {figure && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl(figure)} alt="Correct option" style={{ display: "inline-block", height: "12mm", maxWidth: "24mm", objectFit: "contain", verticalAlign: "middle" }} />
      )}
      {shown && <> <MathText text={cleanOptionText(shown)} /></>}
    </>
  );
}

/** The stem as printed: a match question shows only its instruction, a decomposable one only its lead-in. */
export function questionStemText(q: QuestionDto, slotMarks?: number): string {
  const pairs = q.type === "MATCH_COLUMN" ? parseMatchColumnPairs(q.options, q.text, (q as { explanation?: string }).explanation) : [];
  const base = q.type === "MATCH_COLUMN" && pairs.length > 0 ? withPairMarksNote(getMatchColumnInstruction(q.text), (q as { pairMarks?: number | null }).pairMarks) : q.text;
  const decomposed = (!q.subparts || q.subparts.length === 0) && canHaveSubparts(q.type) ? decomposeForSlot(base, slotMarks) : null;
  return decomposed ? decomposed.stem : base;
}

function isPassageType(type: string): boolean {
  return type === "UNSEEN_PASSAGE" || type === "CASE_STUDY" || type === "REFERENCE_CONTEXT";
}

export type QuestionRenderMode = "FULL" | "STEM_ONLY" | "SUBPART_ONLY";

/**
 * A question printed in pieces so it can cross a page: its figure on its own, or rows [from, to) of its match
 * table. `header` prints the column headings (the first rows, or rows that open a new page); `last` closes the table.
 */
export type QuestionPiece = { kind: "figure" } | { kind: "matchRows"; from: number; to: number; header: boolean; last: boolean };

/** "Q. 22 (Continued)": heads the part of a question that carries on at the top of a new page. */
export function ContinuationBanner({ label, lang, isA5 }: { label?: string; lang: PaperLanguage; isA5?: boolean }) {
  const prefix = lang === "sa" ? "प्रश्नः" : lang === "hi" ? "प्रश्न" : "Q.";
  const text = label
    ? label.startsWith("Q.") || label.startsWith("प्रश्न")
      ? label
      : `${prefix} ${label}`
    : lang === "sa" ? "प्रश्नः" : lang === "hi" ? "प्रश्न" : "Question";
  const suffix =
    lang === "sa" || lang === "hi"
      ? " (क्रमशः...)"
      : lang === "bilingual"
      ? " (Continued / क्रमशः...)"
      : " (Continued)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2mm",
        fontSize: isA5 ? "8pt" : "8.5pt",
        fontWeight: 700,
        color: "#475569",
        padding: "0.5mm 0 1.5mm 0",
        borderBottom: "1px dashed #cbd5e1",
        marginBottom: "1.5mm",
      }}
    >
      <span>{text}{suffix}</span>
    </div>
  );
}

function SingleQuestionBody({
  q,
  number,
  numberLabel,
  marks,
  slotMarks = marks,
  marksStyle = "INLINE",
  showAnswer,
  renderMode = "FULL",
  subpartIndex,
  isContinuation,
  isA5,
  lang,
  fit,
  dense,
  stemPart,
  piece,
  splitAttachments,
}: {
  q: QuestionDto;
  number?: number;
  numberLabel?: string;
  marks?: number;
  /** Print only this piece of the question (see QuestionPiece). */
  piece?: QuestionPiece;
  /** STEM_ONLY: leave the figure and the match table out; they print as pieces of their own. */
  splitAttachments?: boolean;
  /** Printed paper: short sub-items share a line and marks tags that repeat the question's total are dropped. */
  dense?: boolean;
  /** STEM_ONLY: print only this paragraph of the stem (see splitStemParagraphs), so a passage can cross a page. */
  stemPart?: number;
  /** What the whole question is worth, even where `marks` is not printed on this body (an OR pair prints it once). */
  slotMarks?: number;
  marksStyle?: MarksStyle;
  showAnswer?: boolean;
  renderMode?: QuestionRenderMode;
  subpartIndex?: number;
  isContinuation?: boolean;
  isA5?: boolean;
  lang?: PaperLanguage;
  fit?: PrintFit;
}) {
  const displayLabel = numberLabel ?? (number !== undefined ? `${number}.` : undefined);
  const optFontSize = isA5 ? "9.5pt" : "10pt";
  const marksFontSize = isA5 ? "9pt" : "9.5pt";
  const tableFontSize = isA5 ? "9pt" : "9.5pt";
  const metaFontSize = isA5 ? "8.5pt" : "9pt";
  const subpartMarginLeft = isA5 ? "6mm" : "7mm";
  const lineHeight = isA5 ? fit?.lineHeight ?? 1.35 : 1.45;

  const hasSanskrit = isTextPredominantlySanskrit(q.text) || q.options.some((o) => isTextPredominantlySanskrit(o));
  const hasHindi = /[\u0900-\u097F]/.test(q.text) || q.options.some((o) => /[\u0900-\u097F]/.test(o));
  const effectiveLang: PaperLanguage = lang ?? (hasSanskrit ? "sa" : hasHindi ? "hi" : "en");
  // headed in the question's own words: "Match Column I with Column II" → Column I / Column II
  const colLabels = matchColumnLabels(q.text, effectiveLang);

  if (renderMode === "SUBPART_ONLY") {
    const decomposed = (!q.subparts || q.subparts.length === 0) && canHaveSubparts(q.type)
      ? decomposeForSlot(q.text, slotMarks)
      : null;
    const effectiveSubparts = q.subparts && q.subparts.length > 0
      ? q.subparts
      : decomposed?.subparts ?? [];
    const sp = effectiveSubparts && subpartIndex !== undefined ? effectiveSubparts[subpartIndex] : null;
    if (!sp) return null;
    // the printed paper (dense, no answers) shows only each question's total, so the marks beside questions add up to the paper's
  const hideSubMarks = !showPartMarks(effectiveSubparts.length, partsAttemptCount(q, decomposed), marksStyle) || Boolean(dense && !showAnswer);
    return (
      <div style={{ marginLeft: subpartMarginLeft }}>
        {isContinuation && <ContinuationBanner label={displayLabel} lang={effectiveLang} isA5={isA5} />}
        <div
          style={{
            display: "flex",
            gap: "2mm",
            alignItems: "flex-start",
            paddingLeft: "2.5mm",
            borderLeft: "2px solid #e2e8f0",
          }}
        >
          <span style={{ fontWeight: 700, minWidth: isA5 ? "5.5mm" : "7mm", color: "#334155" }}>
            {sp.label || `(${(subpartIndex ?? 0) + 1})`}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight }}>
              <MathText text={sp.text} />
            </div>
            {sp.options && sp.options.length > 0 && (
              <OptionFlow options={sp.options} isA5={isA5} fontSize={optFontSize} marginTop="1.5mm" />
            )}
            {showAnswer && sp.answer && (
              <div style={{ marginTop: "1mm", fontSize: isA5 ? "7.5pt" : "0.85em", color: "#166534" }}>
                <span style={{ fontWeight: 600 }}>{effectiveLang === "sa" ? "उत्तरम्:" : effectiveLang === "hi" ? "उत्तर:" : "Answer:"}</span> <MathText text={sp.answer} />
              </div>
            )}
          </div>
          {sp.marks > 0 && !hideSubMarks && (
            <div
              style={{
                whiteSpace: "nowrap",
                fontWeight: 700,
                fontSize: marksFontSize,
                paddingLeft: "2.5mm",
                color: "#475569",
              }}
            >
              {formatMarksLabel(sp.marks, effectiveLang)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isKindergartenType(q.type)) {
    const plugin = getKindergartenActivity(q.type);
    if (plugin) {
      const rawCfg = q.options && q.options.length > 0 ? q.options[0] : "";
      const config = parseKindergartenConfig(q.type, rawCfg);
      const PrintComp = plugin.renderPrint;
      return (
        <PrintComp
          config={config}
          instructionText={q.text}
          marks={marks}
          number={number}
          numberLabel={displayLabel}
        />
      );
    }
  }

  const isMcq = isMcqLikeType(q.type);
  const isMathComplex = q.options?.some((o) => o.includes("\\frac") || o.includes("\\sqrt") || o.includes("\n"));
  const singleColumnOptions = q.type === "ASSERTION_REASON" || Boolean(isMathComplex);

  const normalizedMcq = isMcq ? normalizeMcqAnswer(q.answer, q.options) : null;
  const matchPairs = q.type === "MATCH_COLUMN" ? parseMatchColumnPairs(q.options, q.text, (q as any).explanation) : [];
  const baseStemText = q.type === "MATCH_COLUMN" && matchPairs.length > 0 ? withPairMarksNote(getMatchColumnInstruction(q.text), (q as { pairMarks?: number | null }).pairMarks) : q.text;

  const tableBorder = "1px solid #cbd5e1";
  const cellPad = isA5 ? "0.8mm 2mm" : "1.2mm 2.5mm";
  const figure = (marginTop: string) =>
    q.imagePath ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl(q.imagePath)}
        alt=""
        style={{ display: "block", marginTop, maxWidth: isA5 ? "65%" : "60%", maxHeight: isA5 ? "34mm" : "45mm", objectFit: "contain" }}
      />
    ) : null;
  /** The match table, or rows [from, to) of it; pieces stack into one table (no doubled borders between them). */
  const matchTable = (from: number, to: number, header: boolean, closes: boolean, marginTop: string) => (
    <table
      style={{
        width: "100%",
        tableLayout: "fixed",
        borderCollapse: "collapse",
        marginTop,
        fontSize: tableFontSize,
        borderLeft: tableBorder,
        borderRight: tableBorder,
        borderTop: header || from === 0 ? tableBorder : "none",
        borderBottom: closes ? tableBorder : "none",
      }}
    >
      {header && (
        <thead>
          <tr style={{ backgroundColor: "#f8fafc", borderBottom: tableBorder }}>
            <th style={{ textAlign: "left", padding: cellPad, borderRight: tableBorder, width: "50%", fontWeight: 700 }}>{colLabels.colA}</th>
            <th style={{ textAlign: "left", padding: cellPad, width: "50%", fontWeight: 700 }}>{colLabels.colB}</th>
          </tr>
        </thead>
      )}
      <tbody>
        {matchPairs.slice(from, to).map((pair, k) => {
          const idx = from + k;
          return (
            <tr key={idx} style={{ borderBottom: idx < matchPairs.length - 1 ? "1px solid #e2e8f0" : "none" }}>
              <td style={{ padding: cellPad, borderRight: tableBorder, verticalAlign: "top", width: "50%" }}>
                <span style={{ fontWeight: 600, marginRight: "1.5mm" }}>
                  {LETTERS_LIST[idx] ?? `(${String.fromCharCode(65 + idx)})`}
                </span>
                <MathText text={cleanMatchItem(pair.left)} />
              </td>
              <td style={{ padding: cellPad, verticalAlign: "top", width: "50%" }}>
                <span style={{ fontWeight: 600, marginRight: "1.5mm" }}>
                  {ROMAN_LOWER[idx] ?? `(${idx + 1})`}
                </span>
                <MathText text={cleanMatchItem(pair.right)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  // pieces line up with the question's text column (to the right of its number)
  const pieceIndent = displayLabel !== undefined ? (isA5 ? "7.5mm" : "9.5mm") : 0;
  if (piece?.kind === "figure") {
    return (
      <div>
        {isContinuation && <ContinuationBanner label={displayLabel} lang={effectiveLang} isA5={isA5} />}
        <div style={{ marginLeft: pieceIndent }}>{figure("0")}</div>
      </div>
    );
  }
  if (piece?.kind === "matchRows") {
    // rows that open a new page repeat the column headings
    const header = piece.header || Boolean(isContinuation);
    return <div style={{ marginLeft: pieceIndent }}>{matchTable(piece.from, piece.to, header, piece.last, piece.from === 0 ? "2mm" : "0")}</div>;
  }

  const decomposed = (!q.subparts || q.subparts.length === 0) && canHaveSubparts(q.type)
    ? decomposeForSlot(baseStemText, slotMarks)
    : null;
  const stemText = decomposed ? decomposed.stem : baseStemText;
  const effectiveSubparts = q.subparts && q.subparts.length > 0
    ? q.subparts
    : decomposed
    ? decomposed.subparts
    : [];

  // One paragraph of a split stem: only the first carries the number, only the last the marks and attachments.
  const stemParts = renderMode === "STEM_ONLY" && stemPart !== undefined ? splitStemParagraphs(stemText) : null;
  const shownStem = stemParts ? stemParts[stemPart ?? 0] ?? "" : stemText;
  const isFirstStemPart = !stemParts || stemPart === 0;
  const isLastStemPart = !stemParts || stemPart === stemParts.length - 1;
  // the printed paper (dense, no answers) shows only each question's total, so the marks beside questions add up to the paper's
  const hideSubMarks = !showPartMarks(effectiveSubparts.length, partsAttemptCount(q, decomposed), marksStyle) || Boolean(dense && !showAnswer);
  const subGridCols = dense && !showAnswer && renderMode !== "STEM_ONLY" ? subpartGridColumns(effectiveSubparts, isA5) : 0;

  return (
    <div>
      <div style={{ display: "flex", gap: "2.5mm", alignItems: "flex-start" }}>
        {displayLabel !== undefined && (
          <div style={{ minWidth: "7mm", fontWeight: 700, whiteSpace: "nowrap", ...(isFirstStemPart ? null : { visibility: "hidden" as const }) }}>
            {displayLabel.endsWith(".") ? displayLabel : `${displayLabel}.`}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* flow-root keeps the right-floated marks tag inside this box when it drops to a line of its own */}
          <div data-split-lines style={{ display: "flow-root", whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight, ...(isA5 && fit && fit.passageScale !== 1 && ((renderMode === "STEM_ONLY" && stemPart !== undefined) || isPassageType(q.type)) ? { fontSize: `${fit.passageScale}em` } : null) }}>
            <QuestionContent text={shownStem} isA5={isA5} />
            {marks !== undefined && marksStyle === "INLINE" && isLastStemPart && (
              <span style={{ float: "right", fontWeight: 700, fontSize: marksFontSize, marginLeft: "2mm", whiteSpace: "nowrap", color: "#334155" }}>
                {formatMarksLabel(marks, effectiveLang)}
              </span>
            )}
          </div>
          {isLastStemPart && !splitAttachments && figure("2mm")}
          {isLastStemPart && isMcq && q.options.length > 0 && (
            <OptionFlow options={q.options} forceSingle={singleColumnOptions} isA5={isA5} fontSize={optFontSize} marginTop={dense ? "1mm" : "2mm"} />
          )}
          {isLastStemPart && !splitAttachments && q.type === "MATCH_COLUMN" && matchPairs.length > 0 && matchTable(0, matchPairs.length, true, true, "2mm")}
          {isLastStemPart && q.type === "TRUE_FALSE" && (
            <div style={{ marginTop: "1.5mm", fontStyle: "italic", fontSize: metaFontSize }}>
              {effectiveLang === "sa"
                ? "(आम् / न)"
                : effectiveLang === "hi"
                ? "(सत्य / असत्य)"
                : effectiveLang === "bilingual"
                ? "(सही / गलत — True / False)"
                : "(True / False)"}
            </div>
          )}
          {subGridCols > 0 && (
            <div style={{ marginTop: "1.2mm", display: "grid", gridTemplateColumns: `repeat(${subGridCols}, 1fr)`, gap: isA5 ? "1mm 3mm" : "1.5mm 4mm" }}>
              {effectiveSubparts.map((sp, idx) => (
                <div key={idx} style={{ display: "flex", gap: "1.5mm", alignItems: "baseline", minWidth: 0 }}>
                  <span style={{ fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>{sp.label || `(${idx + 1})`}</span>
                  <span style={{ minWidth: 0, overflowWrap: "anywhere", lineHeight }}>
                    <MathText text={sp.text.trim()} />
                    {sp.marks > 0 && !hideSubMarks && (
                      <span style={{ fontWeight: 700, fontSize: marksFontSize, marginLeft: "1.5mm", whiteSpace: "nowrap", color: "#475569" }}>
                        {formatMarksLabel(sp.marks, effectiveLang)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          {subGridCols === 0 && renderMode !== "STEM_ONLY" && effectiveSubparts.length > 0 && (
            <div style={{ marginTop: dense ? "1.2mm" : "2mm", display: "flex", flexDirection: "column", gap: isA5 ? "1.5mm" : "2.5mm" }}>
              {effectiveSubparts.map((sp, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: "2mm",
                    alignItems: "flex-start",
                    paddingLeft: "2.5mm",
                    borderLeft: "2px solid #e2e8f0",
                  }}
                >
                  <span style={{ fontWeight: 700, minWidth: isA5 ? "5.5mm" : "7mm", color: "#334155" }}>
                    {sp.label || `(${idx + 1})`}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight }}>
                      <QuestionContent text={sp.text} isA5={isA5} />
                    </div>
                    {sp.options && sp.options.length > 0 && (
                      <OptionFlow options={sp.options} isA5={isA5} fontSize={optFontSize} marginTop="1.5mm" />
                    )}
                    {/* Level 2 nested subparts support */}
                    {sp.subparts && sp.subparts.length > 0 && (
                      <div style={{ marginTop: "1.5mm", display: "flex", flexDirection: "column", gap: isA5 ? "1mm" : "1.5mm" }}>
                        {sp.subparts.map((nested, nIdx) => (
                          <div key={nIdx} style={{ display: "flex", gap: "2mm", alignItems: "flex-start", paddingLeft: "2mm", borderLeft: "1.5px solid #cbd5e1" }}>
                            <span style={{ fontWeight: 600, minWidth: isA5 ? "5mm" : "6mm", color: "#475569" }}>
                              {nested.label || `(${nIdx + 1})`}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight }}>
                                <QuestionContent text={nested.text} isA5={isA5} />
                              </div>
                              {showAnswer && nested.answer && (
                                <div style={{ marginTop: "1mm", fontSize: isA5 ? "7.5pt" : "0.85em", color: "#166534" }}>
                                  <span style={{ fontWeight: 600 }}>{effectiveLang === "sa" ? "उत्तरम्:" : effectiveLang === "hi" ? "उत्तर:" : "Answer:"}</span> <MathText text={nested.answer} />
                                </div>
                              )}
                            </div>
                            {nested.marks > 0 && !hideSubMarks && (
                              <div style={{ whiteSpace: "nowrap", fontWeight: 700, fontSize: marksFontSize, paddingLeft: "2mm", color: "#475569" }}>
                                {formatMarksLabel(nested.marks, effectiveLang)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {showAnswer && sp.answer && (
                      <div style={{ marginTop: "1mm", fontSize: isA5 ? "8pt" : "0.85em", color: "#166534" }}>
                        <span style={{ fontWeight: 600 }}>{effectiveLang === "sa" ? "उत्तरम्:" : effectiveLang === "hi" ? "उत्तर:" : "Answer:"}</span> <MathText text={sp.answer} />
                      </div>
                    )}
                  </div>
                  {sp.marks > 0 && !hideSubMarks && (
                    <div
                      style={{
                        whiteSpace: "nowrap",
                        fontWeight: 700,
                        fontSize: marksFontSize,
                        paddingLeft: "2.5mm",
                        color: "#475569",
                      }}
                    >
                      {formatMarksLabel(sp.marks, effectiveLang)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {marks !== undefined && marksStyle === "RIGHT_COLUMN" && (
          <div style={{ whiteSpace: "nowrap", fontWeight: 700, fontSize: marksFontSize, paddingLeft: "3mm", ...(isFirstStemPart ? null : { visibility: "hidden" as const }) }}>
            [{formatMarksValue(marks)}]
          </div>
        )}
      </div>
      {renderMode !== "STEM_ONLY" && showAnswer && q.answer && (
        <div style={{ marginTop: "1.5mm", marginLeft: displayLabel !== undefined ? (isA5 ? "7.5mm" : "9.5mm") : 0, fontSize: isA5 ? "8pt" : "0.85em", color: "#166534" }}>
          <span style={{ fontWeight: 600 }}>{effectiveLang === "sa" ? "उत्तरम्:" : effectiveLang === "hi" ? "उत्तर:" : "Answer:"}</span>{" "}
          {isMcq && normalizedMcq ? (
            <span>
              ({normalizedMcq.letter.toLowerCase()})<ResolvedOptionText figure={normalizedMcq.optionFigure} text={normalizedMcq.optionText} fallback={q.answer} />
            </span>
          ) : (
            <MathText text={q.answer} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One question as it appears on paper. Used by the printed paper, builder, and bank preview.
 * Supports primary question and optional alternate ("— OR / अथवा —") choice question.
 */
export function QuestionView({
  q,
  orQuestion,
  number,
  numberLabel,
  marks,
  marksStyle = "INLINE",
  showAnswer,
  compact,
  renderMode = "FULL",
  subpartIndex,
  isContinuation,
  isA5,
  lang,
  fit,
  dense,
  stemPart,
  slotMarks = marks,
  piece,
  splitAttachments,
}: {
  q: QuestionDto;
  /** Print only this piece of the question (see QuestionPiece): no OR alternative, no answer space. */
  piece?: QuestionPiece;
  /** STEM_ONLY: the figure and match table print as pieces of their own. */
  splitAttachments?: boolean;
  /** What the whole question is worth when `marks` is not printed (an OR alternative printed on its own). */
  slotMarks?: number;
  /** Printed paper: use the space-saving arrangement (see SingleQuestionBody). */
  dense?: boolean;
  /** STEM_ONLY: print only this paragraph of the stem. */
  stemPart?: number;
  orQuestion?: QuestionDto | null;
  number?: number;
  numberLabel?: string;
  marks?: number;
  marksStyle?: MarksStyle;
  showAnswer?: boolean;
  compact?: boolean;
  renderMode?: QuestionRenderMode;
  subpartIndex?: number;
  isContinuation?: boolean;
  isA5?: boolean;
  lang?: PaperLanguage;
  fit?: PrintFit;
}) {
  const hasSanskrit = isTextPredominantlySanskrit(q.text) || (orQuestion && isTextPredominantlySanskrit(orQuestion.text));
  const hasHindi = /[\u0900-\u097F]/.test(q.text) || (orQuestion && /[\u0900-\u097F]/.test(orQuestion.text));
  const effectiveLang: PaperLanguage = lang ?? (hasSanskrit ? "sa" : hasHindi ? "hi" : "en");

  if (piece) {
    return (
      <SingleQuestionBody
        q={q}
        number={number}
        numberLabel={numberLabel}
        marks={marks}
        slotMarks={slotMarks}
        marksStyle={marksStyle}
        piece={piece}
        isContinuation={isContinuation}
        isA5={isA5}
        lang={effectiveLang}
        fit={fit}
        dense={dense}
      />
    );
  }

  if (renderMode === "SUBPART_ONLY") {
    return (
      <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
        <SingleQuestionBody
          q={q}
          number={number}
          numberLabel={numberLabel}
          marks={marks}
          slotMarks={slotMarks}
          marksStyle={marksStyle}
          showAnswer={showAnswer}
          renderMode="SUBPART_ONLY"
          subpartIndex={subpartIndex}
          isContinuation={isContinuation}
          isA5={isA5}
          lang={effectiveLang}
          fit={fit}
          dense={dense}
        />
      </div>
    );
  }

  const isKdg = isKindergartenType(q.type);
  const maxSpaceMm = compact || isKdg ? 0 : Math.round(Math.max(q.spaceMm, orQuestion?.spaceMm ?? 0) * (fit?.space ?? 1));
  const isDraw =
    q.type === "DRAW" ||
    q.type === "MAP_WORK" ||
    orQuestion?.type === "DRAW" ||
    orQuestion?.type === "MAP_WORK";
  const hasLabel = numberLabel !== undefined || number !== undefined;

  const orSeparator = getInternalChoiceSeparatorLabel(effectiveLang);

  return (
    <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
      {/* An OR pair prints its marks once, on the first question's line, in every marks style. */}
      <SingleQuestionBody
        q={q}
        number={number}
        numberLabel={numberLabel}
        marks={marks}
        slotMarks={slotMarks}
        marksStyle={marksStyle}
        showAnswer={showAnswer}
        renderMode={renderMode}
        isA5={isA5}
        lang={effectiveLang}
        fit={fit}
        dense={dense}
        stemPart={stemPart}
        splitAttachments={splitAttachments}
      />

      {orQuestion && (
        <div
          style={{
            marginTop: "2mm",
            marginLeft: hasLabel ? (isA5 ? "7.5mm" : "9.5mm") : 0,
            breakInside: "avoid",
            pageBreakInside: "avoid",
          }}
        >
          <div
            style={{
              textAlign: "center",
              margin: "2mm 0",
              fontWeight: 700,
              fontSize: isA5 ? "8.5pt" : "9.5pt",
              letterSpacing: "0.04em",
              color: "#1e293b",
            }}
          >
            {orSeparator}
          </div>
          <SingleQuestionBody
            q={orQuestion}
            slotMarks={slotMarks}
            showAnswer={showAnswer}
            marksStyle={marksStyle}
            isA5={isA5}
            lang={effectiveLang}
            dense={dense}
          />
        </div>
      )}

      {renderMode !== "STEM_ONLY" && maxSpaceMm > 0 && (
        <AnswerSpace mm={maxSpaceMm} isDraw={isDraw} indent={hasLabel ? "9.5mm" : 0} lang={effectiveLang} />
      )}
    </div>
  );
}

/** The blank (ruled, or a grid for a drawing) space printed under a question for its answer. */
export function AnswerSpace({ mm, isDraw, indent, lang }: { mm: number; isDraw: boolean; indent: string | 0; lang: PaperLanguage }) {
  const label = isDraw
    ? lang === "sa"
      ? "[चित्राङ्कनार्थं स्थानम्]"
      : lang === "hi"
      ? "[चित्र हेतु स्थान]"
      : lang === "bilingual"
      ? "[Space for Diagram / चित्र हेतु स्थान]"
      : "[Space for Diagram]"
    : lang === "sa"
    ? "[उत्तरलेखनार्थं स्थानम्]"
    : lang === "hi"
    ? "[उत्तर हेतु स्थान]"
    : lang === "bilingual"
    ? "[Space for Answer / उत्तर हेतु स्थान]"
    : "[Space for Answer]";
  return (
    <div
      className={isDraw ? "paper-grid" : "paper-ruled"}
      style={{ height: `${mm}mm`, marginTop: "2mm", marginLeft: indent, position: "relative" }}
    >
      <span
        style={{
          position: "absolute",
          bottom: "1mm",
          right: "2mm",
          fontSize: "7pt",
          color: "#94a3b8",
          fontStyle: "italic",
          userSelect: "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}
