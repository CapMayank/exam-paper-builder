import React from "react";
import { gridOrder, gridShape, type GridDirection } from "../gridPlacement";
import type { NumberGridCell } from "../types";

interface MathSquareGridProps {
  cells: NumberGridCell[];
  columns?: number;
  /** COLUMN counts down each column; ROW (the default, for older grids) counts across. */
  direction?: GridDirection;
  className?: string;
}

export function MathSquareGrid({ cells = [], columns = 10, direction = "ROW", className = "" }: MathSquareGridProps) {
  const { columns: colCount, rows: rowCount } = gridShape(cells.length, columns, direction);
  const slots = gridOrder(cells.length, columns, direction);

  return (
    <div className={`my-3 overflow-x-auto ${className}`}>
      <div
        className="grid w-full max-w-full rounded-md border-2 border-slate-900 bg-white"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {slots.map((cellIndex, pos) => {
          const cell = cellIndex === null ? undefined : cells[cellIndex];
          const isRightEdge = (pos + 1) % colCount === 0;
          const isBottomEdge = Math.floor(pos / colCount) === rowCount - 1;
          return (
            <div
              key={pos}
              className={`flex aspect-square items-center justify-center p-1 text-center text-base font-bold sm:p-2 sm:text-lg ${
                !isRightEdge ? "border-r border-slate-900" : ""
              } ${!isBottomEdge ? "border-b border-slate-900" : ""} ${!cell || cell.isBlank ? "bg-slate-50/50" : "bg-white font-black text-slate-950"}`}
            >
              {!cell || cell.isBlank ? (
                <span className="select-none font-mono text-xs text-slate-300">&nbsp;</span>
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
