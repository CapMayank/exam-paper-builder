import React from "react";
import { getClipartById } from "../clipartLibrary";
import type { PictureMatchPair } from "../types";

interface MatchingCanvasProps {
  pairs: PictureMatchPair[];
  leftTitle?: string;
  rightTitle?: string;
  className?: string;
}

export function MatchingCanvas({
  pairs = [],
  leftTitle,
  rightTitle,
  className = "",
}: MatchingCanvasProps) {
  return (
    <div className={`my-3 w-full ${className}`}>
      {(leftTitle || rightTitle) && (
        <div className="flex justify-between font-bold text-sm text-slate-700 px-4 mb-2 pb-1 border-b border-slate-200">
          <span>{leftTitle || "Column A"}</span>
          <span>{rightTitle || "Column B"}</span>
        </div>
      )}
      <div className="space-y-3">
        {pairs.map((pair, idx) => {
          const clipart = pair.clipartId ? getClipartById(pair.clipartId) : null;

          return (
            <div
              key={pair.id || idx}
              className="flex items-center justify-between gap-4 py-2 px-3 border border-slate-200 rounded-xl bg-white shadow-2xs"
            >
              {/* Left Side: Clipart Image + connector dot */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-bold text-slate-500 text-sm w-5 select-none">
                  ({idx + 1})
                </span>
                <div className="w-16 h-16 shrink-0 flex items-center justify-center p-1 bg-slate-50 rounded-lg border border-slate-200 text-slate-900">
                  {pair.customImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pair.customImageUrl}
                      alt={pair.label || "clue"}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : clipart ? (
                    clipart.renderSvg(52)
                  ) : (
                    <span className="text-xs text-slate-400">Picture</span>
                  )}
                </div>
                {pair.label && (
                  <span className="text-xs font-semibold text-slate-600 truncate">
                    {pair.label}
                  </span>
                )}
                {/* Connector Dot Right */}
                <div className="ml-auto flex items-center pr-2">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  </div>
                </div>
              </div>

              {/* Middle open space for students to draw connecting lines */}
              <div className="w-16 sm:w-24 border-b border-dashed border-slate-300" />

              {/* Right Side: Connector dot + Alphabet/Word */}
              <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
                {/* Connector Dot Left */}
                <div className="flex items-center pl-2">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  </div>
                </div>
                <div className="w-16 h-16 shrink-0 flex items-center justify-center p-1 bg-slate-50 rounded-lg border-2 border-slate-900 text-slate-950 font-black text-2xl tracking-wider">
                  {pair.matchLabel || "?"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
