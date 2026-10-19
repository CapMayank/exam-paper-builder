import React from "react";
import type { NumberGridCell } from "../types";

interface MathSquareGridProps {
  cells: NumberGridCell[];
  columns?: number;
  className?: string;
}

export function MathSquareGrid({
  cells = [],
  columns = 10,
  className = "",
}: MathSquareGridProps) {
  const colCount = Math.max(2, Math.min(10, columns));

  return (
    <div className={`my-3 overflow-x-auto ${className}`}>
      <div
        className="grid border-2 border-slate-900 rounded-md bg-white w-full max-w-full"
        style={{
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((cell, idx) => {
          const isRightEdge = (idx + 1) % colCount === 0;
          const isBottomEdge = idx >= cells.length - colCount;

          return (
            <div
              key={idx}
              className={`flex items-center justify-center p-1 sm:p-2 aspect-square text-center font-bold text-base sm:text-lg transition-colors ${
                !isRightEdge ? "border-r border-slate-900" : ""
              } ${!isBottomEdge ? "border-b border-slate-900" : ""} ${
                cell.isBlank ? "bg-slate-50/50" : "bg-white text-slate-950 font-black"
              }`}
            >
              {cell.isBlank ? (
                <span className="text-slate-300 text-xs font-mono select-none">
                  &nbsp;
                </span>
              ) : (
                <span className="leading-none">{cell.value}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
