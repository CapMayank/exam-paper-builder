/**
 * Draws imported figure descriptions with AI, after an import: description → Figure Studio objects
 * (`/api/ai/prompt-to-figure`) → PNG → upload → the question's `imagePath`, marked auto-drawn for the teacher to check.
 *
 * Client-only. The loop itself takes its effects as `deps`, so it is testable without a browser.
 */
import { api, uploadImage } from "./client";

export interface AutoDrawItem {
  questionId: string;
  description: string;
}

export interface AutoDrawDeps {
  promptToFigure(description: string): Promise<{ isMock: boolean; objects: unknown[] }>;
  /** Renders the objects to a PNG, uploads it and returns the stored file name. */
  renderAndUpload(objects: unknown[]): Promise<string>;
  patchQuestion(id: string, body: { imagePath: string; figureAutoDrawn: true }): Promise<void>;
  onProgress?(done: number, total: number): void;
}

/**
 * Draws each item in turn. A mock result means no AI key is set: the pass stops and the rest stay "Figure needed".
 * An item that fails or comes back empty is skipped; no retries.
 */
export async function autoDrawFigures(items: AutoDrawItem[], deps: AutoDrawDeps): Promise<{ drawn: number; skipped: number }> {
  let drawn = 0;
  let skipped = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const res = await deps.promptToFigure(item.description);
      if (res.isMock) {
        skipped += items.length - i;
        break;
      }
      if (!res.objects.length) {
        skipped++;
      } else {
        const imagePath = await deps.renderAndUpload(res.objects);
        await deps.patchQuestion(item.questionId, { imagePath, figureAutoDrawn: true });
        drawn++;
      }
    } catch (err) {
      console.warn("Auto-draw failed for question", item.questionId, err);
      skipped++;
    }
    deps.onProgress?.(i + 1, items.length);
  }
  return { drawn, skipped };
}

/** Figure Studio objects → PNG (with the editable scene embedded) → uploaded file name. */
export async function renderFigureAndUpload(objects: unknown[], canvasWidth = 640, canvasHeight = 360): Promise<string> {
  const [{ renderDocToBlob }, { embedSceneInPng }] = await Promise.all([
    import("@/components/figure-studio/render"),
    import("@/components/figure-studio/pngMeta"),
  ]);
  type Doc = import("@/components/figure-studio/types").Doc;
  type GridSettings = import("@/components/figure-studio/types").GridSettings;
  type SceneFile = import("@/components/figure-studio/types").SceneFile;
  const doc: Doc = { w: canvasWidth, h: canvasHeight, bg: "white", objects: objects as Doc["objects"] };
  const grid: GridSettings = { style: "dots", size: 20, include: false };
  const rawPng = await renderDocToBlob(doc, grid, 2);
  const scene: SceneFile = { v: 1, doc, grid };
  return uploadImage(await embedSceneInPng(rawPng, JSON.stringify(scene)));
}

function geminiKeyHeader(): Record<string, string> {
  try {
    const key = localStorage.getItem("exam_gemini_api_key");
    return key ? { "x-gemini-api-key": key } : {};
  } catch {
    return {};
  }
}

/** The real effects: the app's figure route, renderer, upload and question PATCH. */
export function createDefaultAutoDrawDeps(onProgress?: (done: number, total: number) => void): AutoDrawDeps {
  return {
    promptToFigure: (description) =>
      api<{ isMock: boolean; objects: unknown[] }>("/api/ai/prompt-to-figure", {
        method: "POST",
        headers: geminiKeyHeader(),
        json: { prompt: description },
      }),
    renderAndUpload: (objects) => renderFigureAndUpload(objects),
    patchQuestion: async (id, body) => {
      await api(`/api/questions/${id}`, { method: "PATCH", json: body });
    },
    onProgress,
  };
}
