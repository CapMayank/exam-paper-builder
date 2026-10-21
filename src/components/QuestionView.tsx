import { imageUrl } from "@/lib/client";
import {
  isKindergartenType,
  isMcqLikeType,
  normalizeMcqAnswer,
  parseMatchColumnPairs,
  type MarksStyle,
} from "@/lib/constants";
import {
  getKindergartenActivity,
  parseKindergartenConfig,
} from "@/lib/kindergarten/registry";
import type { QuestionDto } from "@/lib/types";
import { MathText } from "@/components/MathText";

const LETTERS = "ABCDEF";
const ROMAN_LOWER = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)"];

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
}) {
  const displayLabel = numberLabel ?? (number !== undefined ? `${number}.` : undefined);

  if (renderMode === "SUBPART_ONLY") {
    const sp = q.subparts && subpartIndex !== undefined ? q.subparts[subpartIndex] : null;
    if (!sp) return null;
    const contLabel = displayLabel
      ? displayLabel.startsWith("Q.")
        ? displayLabel
        : `Q. ${displayLabel}`
      : "Question";
    return (
      <div style={{ marginLeft: "7mm" }}>
        {isContinuation && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2mm",
              fontSize: "8.5pt",
              fontWeight: 700,
              color: "#475569",
              padding: "0.5mm 0 1.5mm 0",
              borderBottom: "1px dashed #cbd5e1",
              marginBottom: "2mm",
            }}
          >
            <span>{contLabel} (Continued / क्रमशः...)</span>
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
          <span style={{ fontWeight: 700, minWidth: "7mm", color: "#334155" }}>
            {sp.label || `(${(subpartIndex ?? 0) + 1})`}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.45 }}>
              <MathText text={sp.text} />
            </div>
            {sp.options && sp.options.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5mm 4mm", marginTop: "1.5mm" }}>
                {sp.options.map((opt, optIdx) => (
                  <div key={optIdx} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "10pt" }}>
                    <span style={{ fontWeight: 600 }}>({LETTERS[optIdx].toLowerCase()})</span>{" "}
                    <MathText text={opt} />
                  </div>
                ))}
              </div>
            )}
            {showAnswer && sp.answer && (
              <div style={{ marginTop: "1mm", fontSize: "0.85em", color: "#166534" }}>
                <span style={{ fontWeight: 600 }}>Answer:</span> <MathText text={sp.answer} />
              </div>
            )}
          </div>
          {sp.marks !== undefined && marksStyle !== "SUPPRESSED" && (
            <div
              style={{
                whiteSpace: "nowrap",
                fontWeight: 700,
                fontSize: "9pt",
                paddingLeft: "2.5mm",
                color: "#475569",
              }}
            >
              [{sp.marks} Mark{sp.marks > 1 ? "s" : ""}]
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
  const matchPairs = q.type === "MATCH_COLUMN" ? parseMatchColumnPairs(q.options) : [];
  const hasHindi = /[\u0900-\u097F]/.test(q.text) || q.options.some((o) => /[\u0900-\u097F]/.test(o));

  return (
    <div>
      <div style={{ display: "flex", gap: "2.5mm", alignItems: "flex-start" }}>
        {displayLabel !== undefined && (
          <div style={{ minWidth: "7mm", fontWeight: 700, whiteSpace: "nowrap" }}>
            {displayLabel.endsWith(".") ? displayLabel : `${displayLabel}.`}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.45 }}>
            <MathText text={q.text} />
            {marks !== undefined && marksStyle === "INLINE" && (
              <span style={{ fontWeight: 700, fontSize: "9pt", marginLeft: "2mm", whiteSpace: "nowrap", color: "#334155" }}>
                [{marks} {marks === 1 ? "Mark" : "Marks"}]
              </span>
            )}
          </div>
          {q.imagePath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(q.imagePath)}
              alt=""
              style={{ display: "block", marginTop: "2mm", maxWidth: "100%", maxHeight: "70mm", objectFit: "contain" }}
            />
          )}
          {isMcq && q.options.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns, gap: "1.5mm 4mm", marginTop: "2mm" }}>
              {q.options.map((o, i) => (
                <div key={i} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "10pt" }}>
                  <span style={{ fontWeight: 600 }}>({LETTERS[i]?.toLowerCase() ?? i + 1})</span> <MathText text={o} />
                </div>
              ))}
            </div>
          )}
          {q.type === "MATCH_COLUMN" && matchPairs.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "2.5mm",
                fontSize: "9.5pt",
                border: "1px solid #cbd5e1",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "1.2mm 2.5mm",
                      borderRight: "1px solid #cbd5e1",
                      width: "50%",
                      fontWeight: 700,
                    }}
                  >
                    {hasHindi ? "स्तम्भ 'अ' (Column A)" : "Column A"}
                  </th>
                  <th style={{ textAlign: "left", padding: "1.2mm 2.5mm", width: "50%", fontWeight: 700 }}>
                    {hasHindi ? "स्तम्भ 'ब' (Column B)" : "Column B"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {matchPairs.map((pair, idx) => (
                  <tr key={idx} style={{ borderBottom: idx < matchPairs.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                    <td style={{ padding: "1.2mm 2.5mm", borderRight: "1px solid #cbd5e1", verticalAlign: "top" }}>
                      <span style={{ fontWeight: 600, marginRight: "1.5mm" }}>
                        {ROMAN_LOWER[idx] ?? `(${idx + 1})`}
                      </span>
                      <MathText text={pair.left} />
                    </td>
                    <td style={{ padding: "1.2mm 2.5mm", verticalAlign: "top" }}>
                      <span style={{ fontWeight: 600, marginRight: "1.5mm" }}>
                        ({LETTERS[idx]?.toLowerCase() ?? idx + 1})
                      </span>
                      <MathText text={pair.right} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {q.type === "TRUE_FALSE" && (
            <div style={{ marginTop: "1.5mm", fontStyle: "italic", fontSize: "9pt" }}>
              {hasHindi ? "(सही / गलत — True / False)" : "(True / False)"}
            </div>
          )}
          {renderMode !== "STEM_ONLY" && q.subparts && q.subparts.length > 0 && (
            <div style={{ marginTop: "2.5mm", display: "flex", flexDirection: "column", gap: "2.5mm" }}>
              {q.subparts.map((sp, idx) => (
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
                  <span style={{ fontWeight: 700, minWidth: "7mm", color: "#334155" }}>
                    {sp.label || `(${idx + 1})`}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.45 }}>
                      <MathText text={sp.text} />
                    </div>
                    {sp.options && sp.options.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5mm 4mm", marginTop: "1.5mm" }}>
                        {sp.options.map((opt, optIdx) => (
                          <div key={optIdx} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "10pt" }}>
                            <span style={{ fontWeight: 600 }}>({LETTERS[optIdx].toLowerCase()})</span>{" "}
                            <MathText text={opt} />
                          </div>
                        ))}
                      </div>
                    )}
                    {showAnswer && sp.answer && (
                      <div style={{ marginTop: "1mm", fontSize: "0.85em", color: "#166534" }}>
                        <span style={{ fontWeight: 600 }}>Answer:</span> <MathText text={sp.answer} />
                      </div>
                    )}
                  </div>
                  {sp.marks !== undefined && marksStyle !== "SUPPRESSED" && (
                    <div
                      style={{
                        whiteSpace: "nowrap",
                        fontWeight: 700,
                        fontSize: "9pt",
                        paddingLeft: "2.5mm",
                        color: "#475569",
                      }}
                    >
                      [{sp.marks} Mark{sp.marks > 1 ? "s" : ""}]
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {marks !== undefined && marksStyle === "RIGHT_COLUMN" && (
          <div style={{ whiteSpace: "nowrap", fontWeight: 700, fontSize: "9.5pt", paddingLeft: "3mm" }}>
            [{marks}]
          </div>
        )}
      </div>
      {renderMode !== "STEM_ONLY" && showAnswer && q.answer && (
        <div style={{ marginTop: "1.5mm", marginLeft: displayLabel !== undefined ? "9.5mm" : 0, fontSize: "0.85em", color: "#166534" }}>
          <span style={{ fontWeight: 600 }}>Answer:</span>{" "}
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
}) {
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

  return (
    <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
      <SingleQuestionBody
        q={q}
        number={number}
        numberLabel={numberLabel}
        marks={marks}
        marksStyle={marksStyle}
        showAnswer={showAnswer}
        renderMode={renderMode}
      />

      {orQuestion && (
        <div style={{ marginTop: "2.5mm" }}>
          <div
            style={{
              textAlign: "center",
              margin: "2.5mm 0",
              fontWeight: 700,
              fontSize: "9pt",
              letterSpacing: "0.08em",
              color: "#333",
            }}
          >
            — OR / अथवा —
          </div>
          <SingleQuestionBody q={orQuestion} showAnswer={showAnswer} marksStyle={marksStyle} />
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
            {isDraw ? "[Space for Diagram / चित्र हेतु स्थान]" : "[Space for Answer / उत्तर हेतु स्थान]"}
          </span>
        </div>
      )}
    </div>
  );
}
