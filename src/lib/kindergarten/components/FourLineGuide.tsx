import React from "react";
import type { RulingType } from "../types";

interface FourLineGuideProps {
  rulingType?: RulingType;
  promptText?: string;
  traceDotted?: boolean;
  repeatCount?: number;
  fontSizePt?: number;
  className?: string;
}

export function FourLineGuide({
  rulingType = "FOUR_LINE",
  promptText = "",
  traceDotted = false,
  repeatCount = 1,
  fontSizePt = 24,
  className = "",
}: FourLineGuideProps) {
  const count = Math.max(1, repeatCount);
  const rows = Array.from({ length: count });

  if (rulingType === "TWO_LINE") {
    // Standard Hindi 2-line notebook ruling
    return (
      <div className={`space-y-4 my-2 ${className}`}>
        {rows.map((_, rIdx) => (
          <div key={rIdx} className="relative py-2">
            <div className="relative h-14 border-y-2 border-slate-900 bg-slate-50/40 flex items-center px-4">
              {rIdx === 0 && promptText ? (
                <span
                  style={{ fontSize: `${fontSizePt}pt` }}
                  className={`font-semibold tracking-wider ${
                    traceDotted
                      ? "text-slate-400 font-mono border-dashed border-b-2 border-slate-400 select-none"
                      : "text-slate-900"
                  }`}
                >
                  {promptText}
                </span>
              ) : (
                <div className="w-full text-center text-xs text-slate-300 font-mono select-none">
                  {/* Empty guide for student handwriting */}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rulingType === "BOXES") {
    // Blank write-in boxes for letters / words
    const letters = promptText.split("").filter((c) => c !== " ");
    return (
      <div className={`my-2 flex flex-wrap gap-2.5 items-center ${className}`}>
        {letters.map((char, cIdx) => (
          <div
            key={cIdx}
            className="w-14 h-14 border-2 border-slate-800 rounded-lg flex flex-col items-center justify-center bg-white shadow-xs"
          >
            <span
              style={{ fontSize: `${fontSizePt}pt` }}
              className={`font-bold ${traceDotted ? "text-slate-400 border-b border-dashed border-slate-400" : "text-slate-900"}`}
            >
              {char}
            </span>
          </div>
        ))}
        {/* Empty response boxes if repeatCount > 1 */}
        {rows.slice(1).map((_, rIdx) => (
          <div key={`empty-${rIdx}`} className="flex gap-2.5">
            {letters.map((_, cIdx) => (
              <div
                key={`empty-box-${cIdx}`}
                className="w-14 h-14 border-2 border-dashed border-slate-400 rounded-lg bg-slate-50/50 flex items-center justify-center"
              >
                <span className="text-slate-300 text-xs font-mono">•</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Default: Standard 4-Line English Handwriting Ruling
  // Line 1 (Top Ascender): Red
  // Line 2 (Mid Waistline): Blue / Slate dashed
  // Line 3 (Base line): Blue / Slate solid
  // Line 4 (Bottom Descender): Red
  return (
    <div className={`space-y-4 my-2.5 ${className}`}>
      {rows.map((_, rIdx) => (
        <div
          key={rIdx}
          className="relative w-full border-t border-b border-rose-600/90 py-1"
          style={{ minHeight: "18mm" }}
        >
          {/* Top Line (Red) */}
          <div className="w-full border-t-2 border-rose-500 absolute top-0 left-0" />

          {/* Waistline / Midline (Blue dashed) */}
          <div
            className="w-full border-t border-dashed border-blue-500/80 absolute left-0"
            style={{ top: "33%" }}
          />

          {/* Baseline (Blue solid) */}
          <div
            className="w-full border-t-2 border-blue-600 absolute left-0"
            style={{ top: "66%" }}
          />

          {/* Bottom Descender line (Red) */}
          <div className="w-full border-b-2 border-rose-500 absolute bottom-0 left-0" />

          {/* Text layer aligned over the 4 lines */}
          <div
            className="relative z-10 px-4 flex items-center h-full"
            style={{ minHeight: "16mm" }}
          >
            {rIdx === 0 && promptText ? (
              <span
                style={{
                  fontSize: `${fontSizePt}pt`,
                  lineHeight: 1,
                  fontFamily: "'Comic Sans MS', 'Century Gothic', 'Nunito', sans-serif",
                }}
                className={`font-semibold tracking-widest ${
                  traceDotted
                    ? "text-slate-400 select-none opacity-80"
                    : "text-slate-900"
                }`}
              >
                {promptText}
              </span>
            ) : (
              <span className="opacity-0 select-none">A</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
