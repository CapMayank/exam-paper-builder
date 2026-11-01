"use client";

import { useMemo } from "react";
import { extractTableFromText } from "@/lib/math";
import { MathText } from "@/components/MathText";

export function QuestionContent({
  text,
  className,
  style,
  isA5,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  isA5?: boolean;
}) {
  const extracted = useMemo(() => extractTableFromText(text || ""), [text]);

  if (!extracted.table || extracted.table.rows.length === 0) {
    return <MathText text={text} className={className} style={style} />;
  }

  const { before, table, after } = extracted;
  const tableFontSize = isA5 ? "8.5pt" : "9.5pt";

  return (
    <div className={className} style={style}>
      {before ? (
        <div style={{ marginBottom: "1.5mm" }}>
          <MathText text={before} />
        </div>
      ) : null}
      <div style={{ overflowX: "auto", margin: "2mm 0" }}>
        <table
          style={{
            borderCollapse: "collapse",
            width: "auto",
            minWidth: "50%",
            margin: "0 auto",
            fontSize: tableFontSize,
            border: "1px solid #94a3b8",
            textAlign: "center",
          }}
        >
          {table.headers && table.headers.length > 0 ? (
            <thead>
              <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1px solid #94a3b8" }}>
                {table.headers.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: isA5 ? "1mm 2.5mm" : "1.5mm 3.5mm",
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    <MathText text={h} />
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {table.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                style={{
                  borderBottom: rIdx < table.rows.length - 1 ? "1px solid #e2e8f0" : "none",
                  backgroundColor: rIdx % 2 === 1 ? "#f8fafc" : "#ffffff",
                }}
              >
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: isA5 ? "1mm 2.5mm" : "1.5mm 3.5mm",
                      verticalAlign: "middle",
                    }}
                  >
                    <MathText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {after ? (
        <div style={{ marginTop: "1.5mm" }}>
          <MathText text={after} />
        </div>
      ) : null}
    </div>
  );
}
