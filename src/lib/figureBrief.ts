/**
 * A question's figure brief: the description of a figure the question needs, kept in `Question.figureScene` until a
 * real figure (an uploaded `imagePath`) is attached. Papers print only `imagePath`; the brief is a workbench note.
 *
 * Stored as the in-app generator's figure-doc shape ({summary, canvasWidth, canvasHeight, objects}) plus two flags:
 * `needsFigure` (no figure attached yet) and `autoDrawn` (the attached figure was drawn by AI, not yet checked).
 * A figureScene without `needsFigure` is some other figure doc and is never read or changed here.
 *
 * Pure.
 */

export interface FigureBrief {
  description: string;
  needsFigure: boolean;
  autoDrawn: boolean;
}

interface BriefScene {
  summary: string;
  canvasWidth: number;
  canvasHeight: number;
  objects: unknown[];
  needsFigure: boolean;
  autoDrawn: boolean;
}

function readBrief(scene: string | null | undefined): BriefScene | null {
  if (!scene) return null;
  try {
    const parsed = JSON.parse(scene) as Partial<BriefScene> | null;
    if (!parsed || typeof parsed !== "object" || typeof parsed.needsFigure !== "boolean" || typeof parsed.summary !== "string") return null;
    return { canvasWidth: 640, canvasHeight: 360, objects: [], autoDrawn: false, ...parsed } as BriefScene;
  } catch {
    return null;
  }
}

/** A new brief for a question whose figure is still to be added. */
export function figureBriefScene(description: string): string {
  const brief: BriefScene = { summary: description, canvasWidth: 640, canvasHeight: 360, objects: [], needsFigure: true, autoDrawn: false };
  return JSON.stringify(brief);
}

/** The brief in a figureScene, or null when the scene is not a brief. */
export function parseFigureBrief(scene: string | null | undefined): FigureBrief | null {
  const b = readBrief(scene);
  return b ? { description: b.summary, needsFigure: b.needsFigure, autoDrawn: b.autoDrawn } : null;
}

/**
 * The figureScene once the question's image is set or removed. A figure attached clears `needsFigure`; it counts as
 * auto-drawn only when the caller says so. Removing the image flags the figure as needed again.
 * Scenes that are not briefs come back unchanged.
 */
export function sceneAfterImageChange(scene: string | null, imagePath: string | null, autoDrawn: boolean | undefined): string | null {
  const b = readBrief(scene);
  if (!b) return scene;
  const next: BriefScene = imagePath
    ? { ...b, needsFigure: false, autoDrawn: autoDrawn ?? false }
    : { ...b, needsFigure: true, autoDrawn: false };
  return JSON.stringify(next);
}
