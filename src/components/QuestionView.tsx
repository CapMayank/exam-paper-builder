import { imageUrl } from "@/lib/client";
import {
  canHaveSubparts,
  cleanMatchItem,
  cleanOptionText,
  formatMarksLabel,
  getColumnLabels,
  getMatchColumnInstruction,
  isKindergartenType,
  isMcqLikeType,
  isSubpartQuestionType,
  normalizeMcqAnswer,
  parseMatchColumnPairs,
  type MarksStyle,
} from "@/lib/constants";
import { decomposeStemSubparts } from "@/lib/subpartExtractor";
import {
  getKindergartenActivity,
  parseKindergartenConfig,
} from "@/lib/kindergarten/registry";
import { getInternalChoiceSeparatorLabel } from "@/lib/internalChoiceRules";
import { isTextPredominantlySanskrit, type PaperLanguage } from "@/lib/localization";
import type { QuestionDto } from "@/lib/types";
import { MathText } from "@/components/MathText";

const LETTERS = "ABCDEFGHIJ";
const LETTERS_LIST = ["(A)", "(B)", "(C)", "(D)", "(E)", "(F)", "(G)", "(H)", "(I)", "(J)"];
const ROMAN_LOWER = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];

export type QuestionRenderMode = "FULL" | "STEM_ONLY" | "SUBPART_ONLY";

function SingleQuestionBody({
  q,
  number,
  numberLabel,
  marks,
  marksStyle = "INLINE",
  showAnswer,
  renderMode = "FULL",
  subpartIndex,
  isContinuation,
  isA5,
  lang,
}: {
  q: QuestionDto;
  number?: number;
  numberLabel?: string;
  marks?: number;
  marksStyle?: MarksStyle;
  showAnswer?: boolean;
  renderMode?: QuestionRenderMode;
  subpartIndex?: number;
  isContinuation?: boolean;
  isA5?: boolean;
  lang?: PaperLanguage;
}) {
  const displayLabel = numberLabel ?? (number !== undefined ? `${number}.` : undefined);
  const optFontSize = isA5 ? "9.5pt" : "10pt";
  const marksFontSize = isA5 ? "9pt" : "9.5pt";
  const tableFontSize = isA5 ? "9pt" : "9.5pt";
  const metaFontSize = isA5 ? "8.5pt" : "9pt";
  const subpartMarginLeft = isA5 ? "6mm" : "7mm";
  const lineHeight = isA5 ? 1.35 : 1.45;

  const hasSanskrit = isTextPredominantlySanskrit(q.text) || q.options.some((o) => isTextPredominantlySanskrit(o));
  const hasHindi = /[\u0900-\u097F]/.test(q.text) || q.options.some((o) => /[\u0900-\u097F]/.test(o));
  const effectiveLang: PaperLanguage = lang ?? (hasSanskrit ? "sa" : hasHindi ? "hi" : "en");
  const colLabels = getColumnLabels(effectiveLang);

  if (renderMode === "SUBPART_ONLY") {
    const effectiveSubparts = q.subparts && q.subparts.length > 0
      ? q.subparts
      : canHaveSubparts(q.type)
      ? decomposeStemSubparts(q.text)?.subparts ?? []
      : [];
    const sp = effectiveSubparts && subpartIndex !== undefined ? effectiveSubparts[subpartIndex] : null;
    if (!sp) return null;
    const contPrefix = effectiveLang === "sa" ? "प्रश्नः" : effectiveLang === "hi" ? "प्रश्न" : "Q.";
    const contLabel = displayLabel
      ? displayLabel.startsWith("Q.") || displayLabel.startsWith("प्रश्न")
        ? displayLabel
        : `${contPrefix} ${displayLabel}`
      : effectiveLang === "sa" ? "प्रश्नः" : effectiveLang === "hi" ? "प्रश्न" : "Question";
    const contSuffix =
      effectiveLang === "sa"
        ? " (क्रमशः...)"
        : effectiveLang === "hi"
        ? " (क्रमशः...)"
        : effectiveLang === "bilingual"
        ? " (Continued / क्रमशः...)"
        : " (Continued)";
    return (
      <div style={{ marginLeft: subpartMarginLeft }}>
        {isContinuation && (
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
            <span>{contLabel}{contSuffix}</span>
          </div>
        )}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isA5 ? "1mm 3mm" : "1.5mm 4mm", marginTop: "1.5mm" }}>
                {sp.options.map((opt, optIdx) => (
                  <div key={optIdx} className="opt-text" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: optFontSize }}>
                    <span style={{ fontWeight: 600 }}>({LETTERS[optIdx].toLowerCase()})</span>{" "}
                    <MathText text={cleanOptionText(opt)} />
                  </div>
                ))}
              </div>
            )}
            {showAnswer && sp.answer && (
              <div style={{ marginTop: "1mm", fontSize: isA5 ? "7.5pt" : "0.85em", color: "#166534" }}>
                <span style={{ fontWeight: 600 }}>{effectiveLang === "sa" ? "उत्तरम्:" : effectiveLang === "hi" ? "उत्तर:" : "Answer:"}</span> <MathText text={sp.answer} />
              </div>
            )}
          </div>
          {sp.marks !== undefined && marksStyle !== "SUPPRESSED" && (
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
  const maxOptionLen = q.options && q.options.length > 0 ? Math.max(...q.options.map((o) => o.length)) : 0;
  const isMathComplex = q.options?.some((o) => o.includes("\\frac") || o.includes("\\sqrt") || o.includes("\n"));
  const gridTemplateColumns =
    q.type === "ASSERTION_REASON" || isMathComplex || maxOptionLen > 35
      ? "1fr"
      : maxOptionLen <= 14 && q.options.length <= 4
      ? "repeat(4, 1fr)"
      : "1fr 1fr";

  const normalizedMcq = isMcq ? normalizeMcqAnswer(q.answer, q.options) : null;
  const matchPairs = q.type === "MATCH_COLUMN" ? parseMatchColumnPairs(q.options, q.text, (q as any).explanation) : [];
  const baseStemText = q.type === "MATCH_COLUMN" && matchPairs.length > 0 ? getMatchColumnInstruction(q.text) : q.text;

  const decomposed = (!q.subparts || q.subparts.length === 0) && canHaveSubparts(q.type)
    ? decomposeStemSubparts(baseStemText)
    : null;
  const stemText = decomposed ? decomposed.stem : baseStemText;
  const effectiveSubparts = q.subparts && q.subparts.length > 0
    ? q.subparts
    : decomposed
    ? decomposed.subparts
    : [];

  return (
    <div>
      <div style={{ display: "flex", gap: "2.5mm", alignItems: "flex-start" }}>
        {displayLabel !== undefined && (
          <div style={{ minWidth: "7mm", fontWeight: 700, whiteSpace: "nowrap" }}>
            {displayLabel.endsWith(".") ? displayLabel : `${displayLabel}.`}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight }}>
            <MathText text={stemText} />
            {marks !== undefined && marksStyle === "INLINE" && (
              <span style={{ fontWeight: 700, fontSize: marksFontSize, marginLeft: "2mm", whiteSpace: "nowrap", color: "#334155" }}>
                {formatMarksLabel(marks, effectiveLang)}
              </span>
            )}
          </div>
          {q.imagePath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(q.imagePath)}
              alt=""
              style={{ display: "block", marginTop: "2mm", maxWidth: "100%", maxHeight: isA5 ? "50mm" : "70mm", objectFit: "contain" }}
            />
          )}
          {isMcq && q.options.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns, gap: isA5 ? "1mm 3mm" : "1.5mm 4mm", marginTop: "2mm" }}>
              {q.options.map((o, i) => (
                <div key={i} className="opt-text" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: optFontSize }}>
                  <span style={{ fontWeight: 600 }}>({LETTERS[i]?.toLowerCase() ?? i + 1})</span> <MathText text={cleanOptionText(o)} />
                </div>
              ))}
            </div>
          )}
          {q.type === "MATCH_COLUMN" && matchPairs.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "2mm",
                fontSize: tableFontSize,
                border: "1px solid #cbd5e1",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: isA5 ? "0.8mm 2mm" : "1.2mm 2.5mm",
                      borderRight: "1px solid #cbd5e1",
                      width: "50%",
                      fontWeight: 700,
                    }}
                  >
                    {colLabels.colA}
                  </th>
                  <th style={{ textAlign: "left", padding: isA5 ? "0.8mm 2mm" : "1.2mm 2.5mm", width: "50%", fontWeight: 700 }}>
                    {colLabels.colB}
                  </th>
                </tr>
              </thead>
              <tbody>
                {matchPairs.map((pair, idx) => (
                  <tr key={idx} style={{ borderBottom: idx < matchPairs.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                    <td style={{ padding: isA5 ? "0.8mm 2mm" : "1.2mm 2.5mm", borderRight: "1px solid #cbd5e1", verticalAlign: "top" }}>
                      <span style={{ fontWeight: 600, marginRight: "1.5mm" }}>
                        {LETTERS_LIST[idx] ?? `(${String.fromCharCode(65 + idx)})`}
                      </span>
                      <MathText text={cleanMatchItem(pair.left)} />
                    </td>
                    <td style={{ padding: isA5 ? "0.8mm 2mm" : "1.2mm 2.5mm", verticalAlign: "top" }}>
                      <span style={{ fontWeight: 600, marginRight: "1.5mm" }}>
                        {ROMAN_LOWER[idx] ?? `(${idx + 1})`}
                      </span>
                      <MathText text={cleanMatchItem(pair.right)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {q.type === "TRUE_FALSE" && (
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
          {renderMode !== "STEM_ONLY" && effectiveSubparts.length > 0 && (
            <div style={{ marginTop: "2mm", display: "flex", flexDirection: "column", gap: isA5 ? "1.5mm" : "2.5mm" }}>
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
                      <MathText text={sp.text} />
                    </div>
                    {sp.options && sp.options.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isA5 ? "1mm 3mm" : "1.5mm 4mm", marginTop: "1.5mm" }}>
                        {sp.options.map((opt, optIdx) => (
                          <div key={optIdx} className="opt-text" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: optFontSize }}>
                            <span style={{ fontWeight: 600 }}>({LETTERS[optIdx].toLowerCase()})</span>{" "}
                            <MathText text={cleanOptionText(opt)} />
                          </div>
                        ))}
                      </div>
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
                                <MathText text={nested.text} />
                              </div>
                              {showAnswer && nested.answer && (
                                <div style={{ marginTop: "1mm", fontSize: isA5 ? "7.5pt" : "0.85em", color: "#166534" }}>
                                  <span style={{ fontWeight: 600 }}>{effectiveLang === "sa" ? "उत्तरम्:" : effectiveLang === "hi" ? "उत्तर:" : "Answer:"}</span> <MathText text={nested.answer} />
                                </div>
                              )}
                            </div>
                            {nested.marks !== undefined && marksStyle !== "SUPPRESSED" && (
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
                  {sp.marks !== undefined && marksStyle !== "SUPPRESSED" && (
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
          <div style={{ whiteSpace: "nowrap", fontWeight: 700, fontSize: marksFontSize, paddingLeft: "3mm" }}>
            [{marks}]
          </div>
        )}
      </div>
      {renderMode !== "STEM_ONLY" && showAnswer && q.answer && (
        <div style={{ marginTop: "1.5mm", marginLeft: displayLabel !== undefined ? (isA5 ? "7.5mm" : "9.5mm") : 0, fontSize: isA5 ? "8pt" : "0.85em", color: "#166534" }}>
          <span style={{ fontWeight: 600 }}>{effectiveLang === "sa" ? "उत्तरम्:" : effectiveLang === "hi" ? "उत्तर:" : "Answer:"}</span>{" "}
          {isMcq && normalizedMcq ? (
            <span>
              ({normalizedMcq.letter.toLowerCase()}) <MathText text={normalizedMcq.optionText ?? q.answer} />
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
  marksStyle = "RIGHT_COLUMN",
  showAnswer,
  compact,
  renderMode = "FULL",
  subpartIndex,
  isContinuation,
  isA5,
  lang,
}: {
  q: QuestionDto;
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
}) {
  const hasSanskrit = isTextPredominantlySanskrit(q.text) || (orQuestion && isTextPredominantlySanskrit(orQuestion.text));
  const hasHindi = /[\u0900-\u097F]/.test(q.text) || (orQuestion && /[\u0900-\u097F]/.test(orQuestion.text));
  const effectiveLang: PaperLanguage = lang ?? (hasSanskrit ? "sa" : hasHindi ? "hi" : "en");

  if (renderMode === "SUBPART_ONLY") {
    return (
      <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
        <SingleQuestionBody
          q={q}
          number={number}
          numberLabel={numberLabel}
          marks={marks}
          marksStyle={marksStyle}
          showAnswer={showAnswer}
          renderMode="SUBPART_ONLY"
          subpartIndex={subpartIndex}
          isContinuation={isContinuation}
          isA5={isA5}
          lang={effectiveLang}
        />
      </div>
    );
  }

  const isKdg = isKindergartenType(q.type);
  const maxSpaceMm = compact || isKdg ? 0 : Math.max(q.spaceMm, orQuestion?.spaceMm ?? 0);
  const showGrid = q.showGrid || !!orQuestion?.showGrid;
  const isDraw =
    q.type === "DRAW" ||
    q.type === "MAP_WORK" ||
    orQuestion?.type === "DRAW" ||
    orQuestion?.type === "MAP_WORK";
  const hasLabel = numberLabel !== undefined || number !== undefined;

  const orSeparator = getInternalChoiceSeparatorLabel(effectiveLang);

  // Show marks allocation ONCE for the entire choice group:
  // - For INLINE marks style with an OR choice, display marks once on the OR alternative at the end of the group.
  // - For RIGHT_COLUMN marks style, display marks once on the primary row at the top-right of the group.
  const primaryMarks = orQuestion && marksStyle === "INLINE" ? undefined : marks;
  const orMarks = orQuestion && marksStyle === "INLINE" ? marks : undefined;

  const spaceLabel = isDraw
    ? effectiveLang === "sa"
      ? "[चित्राङ्कनार्थं स्थानम्]"
      : effectiveLang === "hi"
      ? "[चित्र हेतु स्थान]"
      : effectiveLang === "bilingual"
      ? "[Space for Diagram / चित्र हेतु स्थान]"
      : "[Space for Diagram]"
    : effectiveLang === "sa"
    ? "[उत्तरलेखनार्थं स्थानम्]"
    : effectiveLang === "hi"
    ? "[उत्तर हेतु स्थान]"
    : effectiveLang === "bilingual"
    ? "[Space for Answer / उत्तर हेतु स्थान]"
    : "[Space for Answer]";

  return (
    <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
      <SingleQuestionBody
        q={q}
        number={number}
        numberLabel={numberLabel}
        marks={primaryMarks}
        marksStyle={marksStyle}
        showAnswer={showAnswer}
        renderMode={renderMode}
        isA5={isA5}
        lang={effectiveLang}
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
            marks={orMarks}
            showAnswer={showAnswer}
            marksStyle={marksStyle}
            isA5={isA5}
            lang={effectiveLang}
          />
        </div>
      )}

      {renderMode !== "STEM_ONLY" && maxSpaceMm > 0 && (
        <div
          className={isDraw && showGrid ? "paper-grid" : isDraw ? "paper-grid" : "paper-ruled"}
          style={{
            height: `${maxSpaceMm}mm`,
            marginTop: "2mm",
            marginLeft: hasLabel ? "9.5mm" : 0,
            position: "relative",
          }}
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
            {spaceLabel}
          </span>
        </div>
      )}
    </div>
  );
}
