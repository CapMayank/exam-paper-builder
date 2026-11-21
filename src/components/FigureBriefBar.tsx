"use client";

import { ImageIcon, PencilRuler, Search, Sparkles, Check } from "lucide-react";
import type { QuestionDto } from "@/lib/types";

/**
 * Workbench-only note for a question's figure brief: "Figure needed" (with ways to add it) while no figure is
 * attached, or "Auto-drawn — check it" after AI drew one. Never part of the printed paper.
 */
export function FigureBriefBar({
  question,
  label,
  busy,
  onAutoDraw,
  onSearch,
  onEdit,
  onLooksRight,
}: {
  question: Pick<QuestionDto, "imagePath" | "figureBrief">;
  /** e.g. "OR question", shown before the note when it is not the main question */
  label?: string;
  busy?: boolean;
  onAutoDraw: () => void;
  onSearch?: () => void;
  onEdit: () => void;
  onLooksRight: () => void;
}) {
  const brief = question.figureBrief;
  if (!brief) return null;
  const prefix = label ? `${label}: ` : "";

  if (brief.needsFigure && !question.imagePath) {
    return (
      <div className="mb-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="badge !bg-amber-100 !text-amber-800 border border-amber-300 font-bold">
            <ImageIcon className="mr-1 inline h-3 w-3" />
            {prefix}Figure needed
          </span>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={onAutoDraw}>
            <Sparkles className="h-3 w-3" /> {busy ? "Drawing…" : "Auto-draw"}
          </button>
          {onSearch && (
            <button type="button" className="btn btn-sm" onClick={onSearch}>
              <Search className="h-3 w-3" /> Search diagrams
            </button>
          )}
          <button type="button" className="btn btn-sm" onClick={onEdit}>
            <PencilRuler className="h-3 w-3" /> Add / draw figure
          </button>
        </div>
        <p className="mt-1 [overflow-wrap:anywhere]">
          <span className="font-semibold">Should show:</span> {brief.description}
        </p>
      </div>
    );
  }

  if (brief.autoDrawn && question.imagePath) {
    return (
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="badge !bg-sky-100 !text-sky-800 border border-sky-200 font-bold">{prefix}Auto-drawn — check it</span>
        <button type="button" className="btn btn-sm" onClick={onLooksRight}>
          <Check className="h-3 w-3" /> Looks right
        </button>
        <button type="button" className="btn btn-sm" onClick={onEdit}>
          <PencilRuler className="h-3 w-3" /> Edit figure
        </button>
      </div>
    );
  }
  return null;
}
