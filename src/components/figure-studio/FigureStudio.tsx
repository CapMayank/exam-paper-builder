"use client";

import {
  Check,
  ChevronDown,
  Eraser,
  Grid,
  Hand,
  HelpCircle,
  Highlighter,
  Magnet,
  MousePointer,
  Pencil,
  Plus,
  Redo2,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  angleGeom,
  boxCenter,
  boxHandlePos,
  BOX_HANDLES,
  BoxHandle,
  clamp,
  deg,
  dist,
  dragHandle,
  flipObjects,
  normAngle,
  objectBounds,
  objectHandles,
  pt,
  rad,
  rectCenter,
  resizeBox,
  rotateAround,
  selectionBounds,
  translateObj,
  uid,
  withAngleDegrees,
} from "./geometry";
import { embedSceneInPng, extractSceneFromPng } from "./pngMeta";
import { renderDocToBlob, renderGrid, renderObj } from "./render";
import { STAMP_CATEGORIES, STAMP_REGISTRY, StampDef } from "./stamps";
import { TEMPLATES } from "./templates";
import type {
  AngleObj,
  ArrowKind,
  AxesObj,
  BoxFields,
  Dash,
  Doc,
  FontKey,
  GridSettings,
  Hatch,
  LineObj,
  FractionObj,
  NumLineObj,
  TableObj,
  Obj,
  PointObj,
  Pt,
  Rect,
  SceneFile,
  ShapeKind,
  ShapeObj,
  Style,
  TextAlign,
  TextObj,
} from "./types";
import { CANVAS_PRESETS, DEFAULT_STYLE } from "./types";
import {
  AlignTools,
  AxesInspector,
  CanvasSizeControls,
  FractionInspector,
  NumberLineInspector,
  Section,
  Seg,
  TableInspector,
  Toggle,
  type AlignMode,
} from "./FigureInspectors";
import { InsertPanel, type InsertTab } from "./InsertPanel";
import {
  AngleInspector,
  LineInspector,
  MATH_SYMBOLS,
  objectName,
  PointInspector,
  SelectionHeader,
  ShapeInspector,
  StyleSection,
  TextInspector,
} from "./ObjectInspectors";

export type Tool =
  | "select"
  | "hand"
  | "pen"
  | "highlighter"
  | "eraser"
  | "angle"
  | "line"
  | "ray"
  | "double_arrow"
  | "dimension"
  | "arc_line"
  | "rect"
  | "roundrect"
  | "circle"
  | "triangle"
  | "rtriangle"
  | "parallelogram"
  | "rhombus"
  | "trapezium"
  | "polygon"
  | "star"
  | "cross"
  | "semicircle"
  | "sector"
  | "ring"
  | "axes"
  | "numberline"
  | "fraction_circle"
  | "fraction_bar"
  | "fraction_grid"
  | "table"
  | "point"
  | "text"
  | "stamp";


type ActiveHandle =
  | { kind: "obj"; id: string; objId: string }
  | { kind: "box"; handle: BoxHandle; objId: string }
  | { kind: "rot"; objId: string };

/** Cursors with a white halo around a dark ink stroke so they stay visible on white paper, grid and grey workspace. */
const cursorSvg = (body: string, x: number, y: number, fallback: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${body}</svg>`,
  )}") ${x} ${y}, ${fallback}`;
const CURSOR_CROSS = cursorSvg(
  `<g stroke-linecap="round"><path d="M16 3v10M16 19v10M3 16h10M19 16h10" stroke="#fff" stroke-width="5"/>` +
    `<path d="M16 3v10M16 19v10M3 16h10M19 16h10" stroke="#0f172a" stroke-width="2"/>` +
    `<circle cx="16" cy="16" r="2.2" fill="#0f172a" stroke="#fff" stroke-width="1.6"/></g>`,
  16,
  16,
  "crosshair",
);
const CURSOR_TEXT = cursorSvg(
  `<g stroke-linecap="round"><path d="M11 5h10M16 5v22M11 27h10" stroke="#fff" stroke-width="5"/>` +
    `<path d="M11 5h10M16 5v22M11 27h10" stroke="#0f172a" stroke-width="2"/></g>`,
  16,
  16,
  "text",
);
const CURSOR_ERASER = cursorSvg(
  `<circle cx="16" cy="16" r="9" fill="rgba(239,68,68,0.12)" stroke="#fff" stroke-width="5"/>` +
    `<circle cx="16" cy="16" r="9" fill="none" stroke="#b91c1c" stroke-width="2"/>`,
  16,
  16,
  "crosshair",
);

function hasBoxFields(o: Obj): o is Obj & BoxFields {
  return "w" in o && "h" in o && "x" in o && "y" in o && "rot" in o;
}

export function FigureStudio({
  initialImageUrl,
  onDone,
  onCancel,
}: {
  initialImageUrl?: string | null;
  onDone: (png: Blob) => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Document state
  const [doc, setDoc] = useState<Doc>({
    w: 640,
    h: 360,
    bg: "white",
    objects: [],
  });

  const [grid, setGrid] = useState<GridSettings>({
    style: "squares",
    size: 20,
    include: false,
  });

  // History for Undo/Redo
  const [history, setHistory] = useState<Doc[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = useCallback((newDoc: Doc) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, newDoc].slice(-60);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 59));
    setDoc(newDoc);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setDoc(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setDoc(history[historyIndex + 1]);
    }
  };

  // Viewport pan/zoom
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const [cropToFigure, setCropToFigure] = useState(true);
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 });

  // Tool & Active Selection
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE);

  // Tool Flyout popovers
  const [activeFlyout, setActiveFlyout] = useState<"lines" | "shapes" | "graphs" | null>(null);

  // Angle tool interactive steps: 0 = vertex, 1 = arm1, 2 = arm2
  const [anglePending, setAnglePending] = useState<{ v?: Pt; a?: Pt } | null>(null);

  // Modals & Popovers
  const [insertTab, setInsertTab] = useState<InsertTab | null>(null);
  const [aiPromptText, setAiPromptText] = useState("");
  const [aiPromptBusy, setAiPromptBusy] = useState(false);
  const [aiPromptError, setAiPromptError] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMobileInspector, setShowMobileInspector] = useState(false);

  // Inline on-canvas text editing
  const [inlineText, setInlineText] = useState<{
    x: number;
    y: number;
    text: string;
    id?: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Mouse / Pointer drag state (ref-based for 60fps performance)
  const isDragging = useRef(false);
  const dragStart = useRef<Pt>({ x: 0, y: 0 });
  const pointerPosRef = useRef<Pt>({ x: 0, y: 0 });
  const activeHandleRef = useRef<ActiveHandle | null>(null);
  const liveObj = useRef<Obj | null>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const clipboardRef = useRef<Obj[]>([]);
  const pasteCount = useRef(0);
  const zoomRef = useRef(1);
  const panRef = useRef<Pt>({ x: 0, y: 0 });

  // 1. Load initial image or embedded metadata
  useEffect(() => {
    if (!initialImageUrl) {
      pushHistory({ w: 640, h: 360, bg: "white", objects: [] });
      return;
    }

    fetch(initialImageUrl)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const meta = extractSceneFromPng(buffer);
        if (meta) {
          try {
            const parsed = JSON.parse(meta) as SceneFile;
            if (parsed.doc) {
              setDoc(parsed.doc);
              if (parsed.grid) setGrid(parsed.grid);
              pushHistory(parsed.doc);
              return;
            }
          } catch {
            // fallback to raw image
          }
        }

        // Fallback: load as backdrop image object
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const w = Math.min(1200, Math.max(300, img.naturalWidth || 640));
          const h = Math.round((w / (img.naturalWidth || 640)) * (img.naturalHeight || 360));
          const backdrop: Obj = {
            id: uid(),
            type: "image",
            src: initialImageUrl,
            x: 0,
            y: 0,
            w,
            h,
            rot: 0,
            style: DEFAULT_STYLE,
            locked: true,
          };
          const initialDoc: Doc = { w, h, bg: "white", objects: [backdrop] };
          setDoc(initialDoc);
          pushHistory(initialDoc);
        };
        img.src = initialImageUrl;
      })
      .catch(() => {
        pushHistory({ w: 640, h: 360, bg: "white", objects: [] });
      });
  }, [initialImageUrl]);

  // Scale the page to fill the workspace (and re-centre it) on load and whenever the canvas size changes
  const fitView = useCallback(
    (maxZoom = 3) => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return;
      const z = Math.max(
        0.2,
        Math.min((canvas.clientWidth - 64) / doc.w, (canvas.clientHeight - 64) / doc.h, maxZoom),
      );
      setZoom(z);
      setPan({
        x: Math.round((canvas.clientWidth - doc.w * z) / 2),
        y: Math.round((canvas.clientHeight - doc.h * z) / 2),
      });
    },
    [doc.w, doc.h],
  );

  useEffect(() => {
    const timer = setTimeout(() => fitView(2), 60);
    return () => clearTimeout(timer);
  }, [fitView]);

  // Global Clipboard Paste for Images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              const src = evt.target?.result as string;
              if (src) {
                const img = new Image();
                img.onload = () => {
                  const maxDim = 320;
                  const ratio = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
                  const w = Math.round(img.naturalWidth * ratio);
                  const h = Math.round(img.naturalHeight * ratio);
                  const newImg: Obj = {
                    id: uid(),
                    type: "image",
                    src,
                    x: doc.w / 2 - w / 2,
                    y: doc.h / 2 - h / 2,
                    w,
                    h,
                    rot: 0,
                    style: DEFAULT_STYLE,
                  };
                  pushHistory({ ...doc, objects: [...doc.objects, newImg] });
                  setSelectedIds([newImg.id]);
                  setActiveTool("select");
                };
                img.src = src;
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [doc, pushHistory]);

  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const z = zoomRef.current;
        const nz = Math.min(4, Math.max(0.2, z * Math.exp(-e.deltaY * 0.0015)));
        const pn = panRef.current;
        setZoom(nz);
        setPan({ x: mx - ((mx - pn.x) * nz) / z, y: my - ((my - pn.y) * nz) / z });
      } else {
        const pn = panRef.current;
        setPan({ x: pn.x - e.deltaX, y: pn.y - e.deltaY });
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [mounted]);

  // Screen to Scene coordinate transform
  const screenToScene = useCallback(
    (screenX: number, screenY: number): Pt => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = (screenX - rect.left - pan.x) / zoom;
      const y = (screenY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [pan, zoom],
  );

  const sceneToScreen = useCallback(
    (sceneX: number, sceneY: number): Pt => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + pan.x + sceneX * zoom;
      const y = rect.top + pan.y + sceneY * zoom;
      return { x, y };
    },
    [pan, zoom],
  );

  // Redraw canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Viewport transform
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Page Shadow & Background
    ctx.save();
    ctx.shadowColor = "rgba(13, 45, 56, 0.15)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = doc.bg === "white" ? "#ffffff" : "transparent";
    ctx.fillRect(0, 0, doc.w, doc.h);
    ctx.restore();

    // Page border
    ctx.strokeStyle = "#cbd2cb";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, doc.w, doc.h);

    // Grid
    renderGrid(ctx, doc.w, doc.h, grid);

    // Committed objects
    for (const obj of doc.objects) {
      renderObj(ctx, obj, imageCache.current);
    }

    // Live dragging preview object
    if (liveObj.current) {
      renderObj(ctx, liveObj.current, imageCache.current);
    }

    // Live Angle Construction Rubber-Band & Live Degree Badge
    if (activeTool === "angle" && anglePending?.v) {
      const p = pointerPosRef.current;
      const v = anglePending.v;

      ctx.save();
      // Vertex indicator
      ctx.beginPath();
      ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#1e6075";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (!anglePending.a) {
        // Step 1: dashed line to cursor for first arm
        ctx.strokeStyle = "#1e6075";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Hint near cursor
        ctx.setLineDash([]);
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#1e6075";
        ctx.fillText("Click for Arm 1", p.x + 12, p.y - 10);
      } else {
        // Step 2: solid arm 1, dashed arm 2, and live arc with angle degrees!
        const a = anglePending.a;
        ctx.strokeStyle = style.stroke || "#1e6075";
        ctx.lineWidth = style.width || 2;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(a.x, a.y);
        ctx.stroke();

        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Calculate live angle geometry
        const g = angleGeom(v, a, p, false);
        const arcR = Math.min(36, Math.max(18, dist(v, a) * 0.35));
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(v.x, v.y, arcR, g.a0, g.a0 + g.sweep, g.sweep < 0);
        ctx.stroke();

        // Live Degree Badge pill
        const midAng = g.a0 + g.sweep / 2;
        const badgeDist = arcR + 22;
        const bx = v.x + Math.cos(midAng) * badgeDist;
        const by = v.y + Math.sin(midAng) * badgeDist;

        ctx.save();
        ctx.fillStyle = "rgba(30, 96, 117, 0.92)";
        ctx.roundRect(bx - 20, by - 10, 40, 20, 6);
        ctx.fill();
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.round(g.deg)}°`, bx, by);
        ctx.restore();
      }
      ctx.restore();
    }

    // Selection indicators & Direct-Manipulation Handles
    if (selectedIds.length === 1) {
      const obj = doc.objects.find((o) => o.id === selectedIds[0]);
      if (obj) {
        const bounds = objectBounds(obj);
        ctx.save();

        // Bounding box dashed border
        ctx.strokeStyle = "#1e6075";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
        ctx.setLineDash([]);

        // 1. Direct Object Handles (Angles, Lines, Points, Sectors)
        const oHandles = objectHandles(obj);
        for (const h of oHandles) {
          ctx.beginPath();
          if (h.id === "v") {
            // Angle vertex handle
            ctx.arc(h.p.x, h.p.y, 6.5, 0, Math.PI * 2);
            ctx.fillStyle = "#1e6075";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (h.id === "a" || h.id === "b") {
            // Angle arm handles
            ctx.arc(h.p.x, h.p.y, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = "#2563eb";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.8;
            ctx.stroke();
          } else if (h.id === "r") {
            // Angle arc radius handle (Amber)
            ctx.arc(h.p.x, h.p.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = "#d97706";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.8;
            ctx.stroke();
          } else {
            // Lines & Points
            ctx.arc(h.p.x, h.p.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = "#2563eb";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        }

        // 2. Box Resize Handles & Rotation Handle (Shapes, Stamps, Images, Text, Axes, Number line)
        if (hasBoxFields(obj)) {
          const rotOffset = 22 / zoom;
          const nPos = boxHandlePos(obj, "n");
          const dir = normAngle(obj.rot - Math.PI / 2);
          const rotHandlePt: Pt = {
            x: nPos.x + Math.cos(dir) * rotOffset,
            y: nPos.y + Math.sin(dir) * rotOffset,
          };

          // Rotation stem line & knob
          ctx.beginPath();
          ctx.moveTo(nPos.x, nPos.y);
          ctx.lineTo(rotHandlePt.x, rotHandlePt.y);
          ctx.strokeStyle = "#1e6075";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(rotHandlePt.x, rotHandlePt.y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = "#1e6075";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 8 Box resize handles
          const hSize = 8 / zoom;
          for (const bh of BOX_HANDLES) {
            const hp = boxHandlePos(obj, bh);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(hp.x - hSize / 2, hp.y - hSize / 2, hSize, hSize);
            ctx.strokeStyle = "#1e6075";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(hp.x - hSize / 2, hp.y - hSize / 2, hSize, hSize);
          }
        }

        ctx.restore();
      }
    } else if (selectedIds.length > 1) {
      // Multi-selection bounding box
      const selectedObjs = doc.objects.filter((o) => selectedIds.includes(o.id));
      const sb = selectionBounds(selectedObjs);
      if (sb) {
        ctx.save();
        ctx.strokeStyle = "#1e6075";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(sb.x - 4, sb.y - 4, sb.w + 8, sb.h + 8);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [doc, grid, pan, zoom, selectedIds, anglePending, activeTool, style]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      render();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [render]);

  // Pointer Event Handlers
  /** Snap drawing clicks to the grid (hold Alt to place freely). Editing and freehand tools are never snapped. */
  const snapPoint = (pt: Pt, bypass: boolean): Pt => {
    if (!snap || bypass || grid.style === "none" || grid.size <= 0) return pt;
    if (["select", "hand", "pen", "highlighter", "eraser", "text"].includes(activeTool)) return pt;
    return { x: Math.round(pt.x / grid.size) * grid.size, y: Math.round(pt.y / grid.size) * grid.size };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = snapPoint(screenToScene(e.clientX, e.clientY), e.altKey);
    isDragging.current = true;
    dragStart.current = p;
    pointerPosRef.current = p;

    if (activeTool === "hand") return;

    // 1. Direct Handle Hit-Testing on Selected Object
    if (selectedIds.length === 1) {
      const target = doc.objects.find((o) => o.id === selectedIds[0]);
      if (target) {
        // Hit-test object specific handles (v, a, b, r, endpoints, etc.)
        const handles = objectHandles(target);
        for (const h of handles) {
          if (dist(p, h.p) <= 12 / zoom) {
            activeHandleRef.current = { kind: "obj", id: h.id, objId: target.id };
            return;
          }
        }

        // Hit-test box handles & rotation handle
        if (hasBoxFields(target)) {
          const rotOffset = 22 / zoom;
          const nPos = boxHandlePos(target, "n");
          const dir = normAngle(target.rot - Math.PI / 2);
          const rotHandlePt: Pt = {
            x: nPos.x + Math.cos(dir) * rotOffset,
            y: nPos.y + Math.sin(dir) * rotOffset,
          };

          if (dist(p, rotHandlePt) <= 12 / zoom) {
            activeHandleRef.current = { kind: "rot", objId: target.id };
            return;
          }

          for (const bh of BOX_HANDLES) {
            const bhp = boxHandlePos(target, bh);
            if (dist(p, bhp) <= 10 / zoom) {
              activeHandleRef.current = { kind: "box", handle: bh, objId: target.id };
              return;
            }
          }
        }
      }
    }

    // 2. Select tool click hit-testing
    if (activeTool === "select") {
      const hit = [...doc.objects].reverse().find((o) => {
        const b = objectBounds(o);
        return p.x >= b.x - 6 && p.x <= b.x + b.w + 6 && p.y >= b.y - 6 && p.y <= b.y + b.h + 6;
      });

      if (hit) {
        setSelectedIds([hit.id]);
        setStyle(hit.style);
      } else {
        setSelectedIds([]);
      }
      return;
    }

    // 3. Eraser
    if (activeTool === "eraser") {
      const remaining = doc.objects.filter((o) => {
        const b = objectBounds(o);
        return !(p.x >= b.x - 6 && p.x <= b.x + b.w + 6 && p.y >= b.y - 6 && p.y <= b.y + b.h + 6);
      });
      if (remaining.length !== doc.objects.length) {
        pushHistory({ ...doc, objects: remaining });
      }
      return;
    }

    // 4. Freehand Pen & Highlighter
    if (activeTool === "pen" || activeTool === "highlighter") {
      liveObj.current = {
        id: uid(),
        type: "path",
        pts: [p.x, p.y],
        highlighter: activeTool === "highlighter",
        style: {
          ...style,
          width: activeTool === "highlighter" ? Math.max(16, style.width * 4) : style.width,
          opacity: activeTool === "highlighter" ? 0.35 : 1,
        },
      };
      return;
    }

    // 5. Angle Tool (Interactive 3-Step Construction)
    if (activeTool === "angle") {
      if (!anglePending) {
        // Step 1: vertex placed
        setAnglePending({ v: p });
      } else if (!anglePending.a) {
        // Step 2: arm 1 placed
        setAnglePending({ v: anglePending.v, a: p });
      } else {
        // Step 3: arm 2 placed -> commit AngleObj
        const v = anglePending.v!;
        const a = anglePending.a!;
        const b = p;
        const newAngle: AngleObj = {
          id: uid(),
          type: "angle",
          v,
          a,
          b,
          reflex: false,
          arcs: 1,
          arcR: Math.min(36, Math.max(18, dist(v, a) * 0.35)),
          labelMode: "auto",
          label: "",
          fontSize: 15,
          decimals: 0,
          rightMark: false,
          fillSector: false,
          armArrow: "none",
          armTicks: 0,
          style: { ...style },
        };
        const nextDoc = { ...doc, objects: [...doc.objects, newAngle] };
        pushHistory(nextDoc);
        setSelectedIds([newAngle.id]);
        setAnglePending(null);
      }
      return;
    }

    // 6. Point Tool
    if (activeTool === "point") {
      const currentPtsCount = doc.objects.filter((o) => o.type === "point").length;
      const letter = String.fromCharCode(65 + (currentPtsCount % 26));
      const newPt: Obj = {
        id: uid(),
        type: "point",
        x: p.x,
        y: p.y,
        label: letter,
        lx: 14,
        ly: -14,
        size: 3.5,
        mode: "dot",
        fontSize: 16,
        style: { ...style },
      };
      pushHistory({ ...doc, objects: [...doc.objects, newPt] });
      setSelectedIds([newPt.id]);
      setActiveTool("select");
      return;
    }

    // 7. Text Tool (Opens Inline Canvas Text Editor)
    if (activeTool === "text") {
      setInlineText({ x: p.x, y: p.y, text: "Label" });
      return;
    }

    // 8. Line family (line, ray, double_arrow, dimension, arc_line)
    if (["line", "ray", "double_arrow", "dimension", "arc_line"].includes(activeTool)) {
      const kind =
        activeTool === "arc_line" ? "arc" : activeTool === "dimension" ? "dimension" : "line";
      const startArrow: ArrowKind =
        activeTool === "double_arrow" ? "filled" : activeTool === "dimension" ? "bar" : "none";
      const endArrow: ArrowKind =
        activeTool === "ray" || activeTool === "double_arrow"
          ? "filled"
          : activeTool === "dimension"
            ? "bar"
            : "none";

      liveObj.current = {
        id: uid(),
        type: "line",
        kind,
        pts: [p, p],
        start: startArrow,
        end: endArrow,
        ticks: 0,
        parallels: 0,
        label: activeTool === "dimension" ? "5 cm" : "",
        labelSize: 14,
        labelOffset: -12,
        style: { ...style },
      };
      return;
    }

    // 9. Graphs: Coordinate Plane & Number Line
    if (activeTool === "axes") {
      const newAxes: AxesObj = {
        id: uid(),
        type: "axes",
        x: p.x - 120,
        y: p.y - 120,
        w: 240,
        h: 240,
        rot: 0,
        xMin: -4,
        xMax: 4,
        yMin: -4,
        yMax: 4,
        showNumbers: true,
        showGrid: true,
        arrows: true,
        names: true,
        style: { ...style, width: 1.5 },
      };
      pushHistory({ ...doc, objects: [...doc.objects, newAxes] });
      setSelectedIds([newAxes.id]);
      setActiveTool("select");
      return;
    }

    if (activeTool === "numberline") {
      const newNumLine: NumLineObj = {
        id: uid(),
        type: "numberline",
        x: p.x - 170,
        y: p.y - 58,
        w: 340,
        h: 156,
        rot: 0,
        min: -5,
        max: 5,
        step: 1,
        arrows: true,
        showNumbers: true,
        marks: [],
        style: { ...style, width: 2 },
      };
      pushHistory({ ...doc, objects: [...doc.objects, newNumLine] });
      setSelectedIds([newNumLine.id]);
      setActiveTool("select");
      return;
    }

    if (activeTool === "fraction_circle" || activeTool === "fraction_bar" || activeTool === "fraction_grid") {
      const model = activeTool === "fraction_circle" ? "circle" : activeTool === "fraction_bar" ? "bar" : "grid";
      const w = model === "circle" ? 140 : 220;
      const h = model === "circle" ? 140 : model === "bar" ? 50 : 120;
      const newFraction: FractionObj = {
        id: uid(),
        type: "fraction",
        x: p.x - w / 2,
        y: p.y - h / 2,
        w,
        h,
        rot: 0,
        model,
        parts: model === "grid" ? 12 : 4,
        shaded: model === "grid" ? 6 : 3,
        rows: model === "grid" ? 3 : 1,
        showLabel: true,
        style: { ...style, width: 2, fill: "#93c5fd" },
      };
      pushHistory({ ...doc, objects: [...doc.objects, newFraction] });
      setSelectedIds([newFraction.id]);
      setActiveTool("select");
      return;
    }

    if (activeTool === "table") {
      const rows = 3;
      const cols = 3;
      const newTable: TableObj = {
        id: uid(),
        type: "table",
        x: p.x - 120,
        y: p.y - 48,
        w: 240,
        h: 96,
        rot: 0,
        rows,
        cols,
        cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => "")),
        headerRow: true,
        headerCol: false,
        size: 14,
        style: { ...style, width: 1.5, fill: null },
      };
      pushHistory({ ...doc, objects: [...doc.objects, newTable] });
      setSelectedIds([newTable.id]);
      setActiveTool("select");
      return;
    }

    // 10. Shapes family (all 15 shapes)
    const shapeKinds: ShapeKind[] = [
      "rect",
      "roundrect",
      "ellipse",
      "triangle",
      "rtriangle",
      "rhombus",
      "parallelogram",
      "trapezium",
      "polygon",
      "star",
      "cross",
      "semicircle",
      "sector",
      "ring",
    ];

    const currentShapeKind: ShapeKind =
      activeTool === "circle" ? "ellipse" : (activeTool as ShapeKind);

    if (shapeKinds.includes(currentShapeKind)) {
      liveObj.current = {
        id: uid(),
        type: "shape",
        kind: currentShapeKind,
        x: p.x,
        y: p.y,
        w: 1,
        h: 1,
        rot: 0,
        sides: currentShapeKind === "polygon" || currentShapeKind === "star" ? 5 : 3,
        a0: 0,
        a1: 60,
        radius: 12,
        inner: 0.5,
        style: { ...style },
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const p = snapPoint(screenToScene(e.clientX, e.clientY), e.altKey);
    if (coordRef.current) coordRef.current.textContent = `x ${Math.round(p.x)}  y ${Math.round(p.y)}`;
    pointerPosRef.current = p;

    // 1. Direct Handle Dragging (Smooth 60fps)
    if (activeHandleRef.current && isDragging.current) {
      const { objId } = activeHandleRef.current;
      const target = doc.objects.find((o) => o.id === objId);
      if (!target) return;

      if (activeHandleRef.current.kind === "obj") {
        const updated = dragHandle(target, activeHandleRef.current.id, p, e.shiftKey);
        setDoc((prev) => ({
          ...prev,
          objects: prev.objects.map((o) => (o.id === objId ? updated : o)),
        }));
        return;
      }

      if (activeHandleRef.current.kind === "box" && hasBoxFields(target)) {
        const newRect = resizeBox(target, activeHandleRef.current.handle, p, {
          aspect: e.shiftKey,
          center: e.altKey,
        });
        setDoc((prev) => ({
          ...prev,
          objects: prev.objects.map((o) => (o.id === objId ? { ...o, ...newRect } : o)),
        }));
        return;
      }

      if (activeHandleRef.current.kind === "rot" && hasBoxFields(target)) {
        const c = boxCenter(target);
        const ang = Math.atan2(p.y - c.y, p.x - c.x) + Math.PI / 2;
        const finalRot = e.shiftKey
          ? Math.round(ang / (Math.PI / 12)) * (Math.PI / 12)
          : ang;
        setDoc((prev) => ({
          ...prev,
          objects: prev.objects.map((o) => (o.id === objId ? { ...o, rot: finalRot } : o)),
        }));
        return;
      }
    }

    if (!isDragging.current && activeTool !== "angle") return;

    if (activeTool === "hand" && isDragging.current) {
      setPan((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
      return;
    }

    // Whole object translation
    if (activeTool === "select" && isDragging.current && selectedIds.length > 0) {
      const dx = p.x - dragStart.current.x;
      const dy = p.y - dragStart.current.y;
      dragStart.current = p;

      setDoc((prev) => ({
        ...prev,
        objects: prev.objects.map((o) =>
          selectedIds.includes(o.id) ? translateObj(o, dx, dy) : o,
        ),
      }));
      return;
    }

    // Freehand drawing
    if (
      (activeTool === "pen" || activeTool === "highlighter") &&
      liveObj.current &&
      liveObj.current.type === "path"
    ) {
      liveObj.current.pts.push(p.x, p.y);
      return;
    }

    // Line drawing
    if (liveObj.current && liveObj.current.type === "line") {
      liveObj.current.pts[1] = p;
      return;
    }

    // Shape drawing
    if (liveObj.current && liveObj.current.type === "shape") {
      const start = dragStart.current;
      const x = Math.min(start.x, p.x);
      const y = Math.min(start.y, p.y);
      const w = Math.max(2, Math.abs(p.x - start.x));
      const h = Math.max(2, Math.abs(p.y - start.y));

      liveObj.current.x = x;
      liveObj.current.y = y;
      liveObj.current.w = e.shiftKey ? Math.max(w, h) : w;
      liveObj.current.h = e.shiftKey ? Math.max(w, h) : h;
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;

    // Commit handle dragging into history
    if (activeHandleRef.current) {
      activeHandleRef.current = null;
      pushHistory(doc);
      return;
    }

    // Commit newly drawn object into history
    if (liveObj.current) {
      const newObj = liveObj.current;
      liveObj.current = null;
      pushHistory({ ...doc, objects: [...doc.objects, newObj] });
      setSelectedIds([newObj.id]);
      if (activeTool !== "pen" && activeTool !== "highlighter") {
        setActiveTool("select");
      }
    }
  };

  // Double click handler on canvas to trigger text edit
  const handleDoubleClick = (e: React.MouseEvent) => {
    const p = screenToScene(e.clientX, e.clientY);
    const hit = [...doc.objects].reverse().find((o) => {
      const b = objectBounds(o);
      return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    });

    if (hit && hit.type === "text") {
      setInlineText({
        x: hit.x,
        y: hit.y,
        text: hit.text,
        id: hit.id,
      });
    } else if (hit && hit.type === "point") {
      const newLabel = prompt("Edit point label:", hit.label);
      if (newLabel !== null) {
        updateSelected((o) => ({ ...(o as PointObj), label: newLabel }));
      }
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        // Duplicate
        e.preventDefault();
        duplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const picked = doc.objects.filter((o) => selectedIds.includes(o.id) && !o.locked);
        if (picked.length > 0) {
          e.preventDefault();
          clipboardRef.current = picked;
          pasteCount.current = 0;
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboardRef.current.length > 0) {
        e.preventDefault();
        pasteCount.current += 1;
        const shift = 20 * pasteCount.current;
        const clones = clipboardRef.current.map((o) => ({ ...translateObj(o, shift, shift), id: uid() }));
        pushHistory({ ...doc, objects: [...doc.objects, ...clones] });
        setSelectedIds(clones.map((c) => c.id));
        setActiveTool("select");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setSelectedIds(doc.objects.filter((o) => !o.locked).map((o) => o.id));
        setActiveTool("select");
      } else if (e.key.startsWith("Arrow") && selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        pushHistory({
          ...doc,
          objects: doc.objects.map((o) => (selectedIds.includes(o.id) && !o.locked ? translateObj(o, dx, dy) : o)),
        });
      } else if (e.key === "0" && !e.ctrlKey && !e.metaKey) {
        fitView();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          pushHistory({
            ...doc,
            objects: doc.objects.filter((o) => !selectedIds.includes(o.id)),
          });
          setSelectedIds([]);
        }
      } else if (e.key === "Escape") {
        setActiveTool("select");
        setInsertTab(null);
        setAnglePending(null);
        setSelectedIds([]);
        setActiveFlyout(null);
        setInlineText(null);
      } else if (e.key === "v") setActiveTool("select");
      else if (e.key === "h") setActiveTool("hand");
      else if (e.key === "a") setActiveTool("angle");
      else if (e.key === "l") setActiveTool("line");
      else if (e.key === "r") setActiveTool("rect");
      else if (e.key === "c") setActiveTool("circle");
      else if (e.key === "t") setActiveTool("text");
      else if (e.key === "p") setActiveTool("pen");
      else if (e.key === "e") setActiveTool("eraser");
      else if (e.key === "?") setShowShortcuts(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [doc, selectedIds, undo, redo, fitView]);

  // Selected Object Inspector helpers
  const selectedObj = doc.objects.find((o) => selectedIds.includes(o.id));

  const updateSelected = (updater: (o: Obj) => Obj) => {
    if (!selectedObj) return;
    const nextDoc = {
      ...doc,
      objects: doc.objects.map((o) => (o.id === selectedObj.id ? updater(o) : o)),
    };
    pushHistory(nextDoc);
  };

  // Arrange & Layering operations
  const bringForward = () => {
    if (!selectedObj) return;
    const idx = doc.objects.findIndex((o) => o.id === selectedObj.id);
    if (idx < doc.objects.length - 1) {
      const next = [...doc.objects];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      pushHistory({ ...doc, objects: next });
    }
  };

  const sendBackward = () => {
    if (!selectedObj) return;
    const idx = doc.objects.findIndex((o) => o.id === selectedObj.id);
    if (idx > 0) {
      const next = [...doc.objects];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      pushHistory({ ...doc, objects: next });
    }
  };

  const bringToFront = () => {
    if (!selectedObj) return;
    const remaining = doc.objects.filter((o) => o.id !== selectedObj.id);
    pushHistory({ ...doc, objects: [...remaining, selectedObj] });
  };

  const sendToBack = () => {
    if (!selectedObj) return;
    const remaining = doc.objects.filter((o) => o.id !== selectedObj.id);
    pushHistory({ ...doc, objects: [selectedObj, ...remaining] });
  };

  const flipH = () => {
    if (selectedIds.length === 0) return;
    const flipped = flipObjects(
      doc.objects.filter((o) => selectedIds.includes(o.id)),
      "h",
    );
    const idMap = new Map(flipped.map((o) => [o.id, o]));
    pushHistory({
      ...doc,
      objects: doc.objects.map((o) => idMap.get(o.id) ?? o),
    });
  };

  const flipV = () => {
    if (selectedIds.length === 0) return;
    const flipped = flipObjects(
      doc.objects.filter((o) => selectedIds.includes(o.id)),
      "v",
    );
    const idMap = new Map(flipped.map((o) => [o.id, o]));
    pushHistory({
      ...doc,
      objects: doc.objects.map((o) => idMap.get(o.id) ?? o),
    });
  };

  const alignSelected = (mode: AlignMode) => {
    const picked = doc.objects.filter((o) => selectedIds.includes(o.id) && !o.locked);
    if (picked.length < 2) return;
    const boxes = picked.map((o) => ({ o, b: objectBounds(o) }));
    const minX = Math.min(...boxes.map((x) => x.b.x));
    const maxX = Math.max(...boxes.map((x) => x.b.x + x.b.w));
    const minY = Math.min(...boxes.map((x) => x.b.y));
    const maxY = Math.max(...boxes.map((x) => x.b.y + x.b.h));
    const moves = new Map<string, { dx: number; dy: number }>();
    if (mode === "distH" || mode === "distV") {
      const horiz = mode === "distH";
      const sorted = [...boxes].sort((a, b) => (horiz ? a.b.x - b.b.x : a.b.y - b.b.y));
      const total = sorted.reduce((sum, x) => sum + (horiz ? x.b.w : x.b.h), 0);
      const gap = ((horiz ? maxX - minX : maxY - minY) - total) / (sorted.length - 1);
      let cursor = horiz ? minX : minY;
      for (const x of sorted) {
        const delta = cursor - (horiz ? x.b.x : x.b.y);
        moves.set(x.o.id, horiz ? { dx: delta, dy: 0 } : { dx: 0, dy: delta });
        cursor += (horiz ? x.b.w : x.b.h) + gap;
      }
    } else {
      for (const { o, b } of boxes) {
        const dx = mode === "left" ? minX - b.x : mode === "right" ? maxX - (b.x + b.w) : mode === "hcenter" ? (minX + maxX) / 2 - (b.x + b.w / 2) : 0;
        const dy = mode === "top" ? minY - b.y : mode === "bottom" ? maxY - (b.y + b.h) : mode === "vcenter" ? (minY + maxY) / 2 - (b.y + b.h / 2) : 0;
        moves.set(o.id, { dx, dy });
      }
    }
    pushHistory({
      ...doc,
      objects: doc.objects.map((o) => {
        const m = moves.get(o.id);
        return m && (m.dx || m.dy) ? translateObj(o, m.dx, m.dy) : o;
      }),
    });
  };

  const duplicateSelected = () => {
    if (selectedIds.length === 0) return;
    const clones = doc.objects
      .filter((o) => selectedIds.includes(o.id))
      .map((o) => {
        const shifted = translateObj(o, 20, 20);
        return { ...shifted, id: uid() };
      });
    pushHistory({ ...doc, objects: [...doc.objects, ...clones] });
    setSelectedIds(clones.map((c) => c.id));
  };

  const handleExport = async () => {
    try {
      const rawPng = await renderDocToBlob(doc, grid, 2, cropToFigure);
      const sceneData: SceneFile = { v: 1, doc, grid };
      const finalBlob = await embedSceneInPng(rawPng, JSON.stringify(sceneData));
      onDone(finalBlob);
    } catch (err) {
      alert("Failed to export drawing: " + (err as Error).message);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const src = evt.target?.result as string;
      if (src) {
        const img = new Image();
        img.onload = () => {
          const maxDim = 340;
          const ratio = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
          const w = Math.round(img.naturalWidth * ratio);
          const h = Math.round(img.naturalHeight * ratio);
          const newImg: Obj = {
            id: uid(),
            type: "image",
            src,
            x: doc.w / 2 - w / 2,
            y: doc.h / 2 - h / 2,
            w,
            h,
            rot: 0,
            style: DEFAULT_STYLE,
          };
          pushHistory({ ...doc, objects: [...doc.objects, newImg] });
          setSelectedIds([newImg.id]);
          setActiveTool("select");
        };
        img.src = src;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAiDraw = async () => {
    if (!aiPromptText.trim()) return;
    setAiPromptBusy(true);
    setAiPromptError(null);
    try {
      const key = typeof window !== "undefined" ? localStorage.getItem("exam_gemini_api_key") || "" : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (key) headers["x-gemini-api-key"] = key;

      const res = await fetch("/api/ai/prompt-to-figure", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: aiPromptText.trim(),
          canvasWidth: doc.w,
          canvasHeight: doc.h,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate diagram from prompt");
      }

      const json = (await res.json()) as { objects?: Obj[]; data?: { objects?: Obj[] } };
      const objects: Obj[] = json.objects || json.data?.objects || [];
      if (objects.length > 0) {
        pushHistory({ ...doc, objects: [...doc.objects, ...objects] });
        setSelectedIds(objects.map((o) => o.id));
        setInsertTab(null);
        setAiPromptText("");
      } else {
        throw new Error("No diagram objects generated. Try refining your prompt description.");
      }
    } catch (err) {
      setAiPromptError((err as Error).message || "Generation error");
    } finally {
      setAiPromptBusy(false);
    }
  };

  const commitInlineText = () => {
    if (!inlineText) return;
    if (inlineText.id) {
      updateSelected((o) => ({ ...(o as TextObj), text: inlineText.text }));
    } else {
      const newText: TextObj = {
        id: uid(),
        type: "text",
        x: inlineText.x,
        y: inlineText.y,
        w: 120,
        h: 36,
        rot: 0,
        text: inlineText.text || "Label",
        font: "sans",
        size: 16,
        bold: false,
        italic: false,
        underline: false,
        align: "left",
        bg: "none",
        border: false,
        style: { ...style },
      };
      pushHistory({ ...doc, objects: [...doc.objects, newText] });
      setSelectedIds([newText.id]);
      setActiveTool("select");
    }
    setInlineText(null);
  };

  const insertObjects = (objs: Obj[]) => {
    pushHistory({ ...doc, objects: [...doc.objects, ...objs] });
    setSelectedIds(objs.map((o) => o.id));
    setActiveTool("select");
    setInsertTab(null);
  };

  /** Writes only the changed style property, to every selected object and to the style for new drawings. */
  const updateSelectedStyle = (patch: Partial<Style>) => {
    setStyle((s) => ({ ...s, ...patch }));
    if (selectedIds.length === 0) return;
    pushHistory({
      ...doc,
      objects: doc.objects.map((o) => (selectedIds.includes(o.id) ? { ...o, style: { ...o.style, ...patch } } : o)),
    });
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    pushHistory({ ...doc, objects: doc.objects.filter((o) => !selectedIds.includes(o.id)) });
    setSelectedIds([]);
  };

  const pickTool = (t: Tool) => {
    setActiveTool(t);
    setAnglePending(null);
    setActiveFlyout(null);
    setInsertTab(null);
  };

  if (!mounted) return null;

  const selectedCount = selectedIds.length;
  const single = selectedCount === 1 ? selectedObj : undefined;
  const toolLabel = TOOL_LABELS[activeTool] ?? activeTool;
  const canvasHint =
    activeTool === "angle"
      ? !anglePending
        ? "Angle · click the corner point (vertex)"
        : !anglePending.a
          ? "Angle · click the end of the first arm"
          : "Angle · click the end of the second arm"
      : TOOL_HINTS[activeTool];

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-100 font-sans text-slate-900 select-none animate-in fade-in duration-150">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* ---------------- Header ---------------- */}
      <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-slate-200 bg-white px-3 sm:px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Ruler size={17} />
          </div>
          <h1 className="hidden text-sm font-semibold tracking-tight text-slate-900 sm:block">Figure Studio</h1>
        </div>

        <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

        <div className="flex items-center">
          <button type="button" className="btn btn-sm btn-ghost !px-2" disabled={historyIndex <= 0} onClick={undo} title="Undo (Ctrl+Z)" aria-label="Undo">
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost !px-2"
            disabled={historyIndex >= history.length - 1}
            onClick={redo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            className={`btn btn-sm ${insertTab && insertTab !== "ai" ? "border-indigo-300 bg-indigo-50 text-indigo-800" : ""}`}
            aria-expanded={!!insertTab && insertTab !== "ai"}
            onClick={() => {
              setInsertTab(insertTab && insertTab !== "ai" ? null : "templates");
              setActiveFlyout(null);
            }}
            title="Ready-made figures, science symbols and pictures"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Insert</span>
            <ChevronDown size={13} className="hidden opacity-60 sm:block" />
          </button>
          <button
            type="button"
            className={`btn btn-sm ${insertTab === "ai" ? "border-indigo-300 bg-indigo-50 text-indigo-800" : ""}`}
            aria-expanded={insertTab === "ai"}
            onClick={() => {
              setInsertTab(insertTab === "ai" ? null : "ai");
              setActiveFlyout(null);
            }}
            title="Describe a figure in words and have it drawn"
          >
            <Sparkles size={14} className="text-indigo-600" />
            <span className="hidden md:inline">Draw from text</span>
          </button>
          {insertTab && (
            <InsertPanel
              tab={insertTab}
              onTab={setInsertTab}
              onClose={() => setInsertTab(null)}
              onTemplate={(t) => insertObjects(t.create({ x: doc.w / 2, y: doc.h / 2 }))}
              onStamp={(id) =>
                insertObjects([
                  { id: uid(), type: "stamp", stamp: id, x: doc.w / 2 - 45, y: doc.h / 2 - 35, w: 90, h: 70, rot: 0, style: { ...style } },
                ])
              }
              onImage={() => {
                setInsertTab(null);
                fileInputRef.current?.click();
              }}
              ai={{ text: aiPromptText, setText: setAiPromptText, busy: aiPromptBusy, error: aiPromptError, generate: handleAiDraw }}
            />
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 lg:flex">
            <button type="button" className="rounded-md p-1.5 text-slate-600 hover:bg-white" onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))} aria-label="Zoom out" title="Zoom out">
              <ZoomOut size={15} />
            </button>
            <span className="w-12 text-center text-xs font-semibold tabular-nums text-slate-700">{Math.round(zoom * 100)}%</span>
            <button type="button" className="rounded-md p-1.5 text-slate-600 hover:bg-white" onClick={() => setZoom((z) => Math.min(4, z + 0.15))} aria-label="Zoom in" title="Zoom in">
              <ZoomIn size={15} />
            </button>
            <button type="button" className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white" onClick={() => fitView()} title="Fit the page on screen (0)">
              Fit
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-ghost !px-2 lg:hidden"
            onClick={() => setShowMobileInspector((v) => !v)}
            aria-label="Show properties"
            aria-expanded={showMobileInspector}
          >
            <SlidersHorizontal size={16} />
          </button>
          <button type="button" className="btn btn-sm btn-ghost hidden !px-2 sm:flex" onClick={() => setShowShortcuts(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
            <HelpCircle size={16} />
          </button>
          <button type="button" className="btn btn-sm !px-2 sm:!px-3" onClick={onCancel} aria-label="Cancel">
            <X size={15} className="sm:hidden" />
            <span className="hidden sm:inline">Cancel</span>
          </button>
          <button type="button" className="btn btn-sm btn-primary !px-2.5 sm:!px-3" onClick={handleExport}>
            <Check size={14} /> Use<span className="hidden sm:inline"> figure</span>
          </button>
        </div>
      </header>

      {/* ---------------- Body ---------------- */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Tool rail */}
        <aside className="z-20 flex w-[68px] shrink-0 flex-col items-center gap-0.5 border-r border-slate-200 bg-white py-2" aria-label="Tools">
          {RAIL.map((entry, i) => {
            if (entry === "divider") return <div key={`d${i}`} className="my-1 h-px w-9 shrink-0 bg-slate-200" />;
            const group = entry.group ? TOOL_GROUPS[entry.group] : null;
            const groupTools = group ? group.sections.flatMap((s) => s.items.map((it) => it.id)) : [];
            const active = group ? groupTools.includes(activeTool) : activeTool === entry.tool;
            const activeItem = group?.sections.flatMap((s) => s.items).find((it) => it.id === activeTool);
            const tone = entry.tone ?? "indigo";
            const activeCls = tone === "red" ? "bg-red-600 text-white" : tone === "amber" ? "bg-amber-500 text-white" : "bg-indigo-600 text-white";
            return (
              <div key={entry.label} className="relative">
                <button
                  type="button"
                  aria-pressed={active}
                  aria-haspopup={group ? "menu" : undefined}
                  aria-expanded={group ? activeFlyout === entry.group : undefined}
                  title={entry.title}
                  className={`relative flex h-[50px] w-[56px] flex-col items-center justify-center gap-1 rounded-lg transition-colors ${
                    active ? activeCls : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  } ${group && activeFlyout === entry.group && !active ? "bg-slate-100" : ""}`}
                  onClick={() => {
                    if (group) {
                      setActiveFlyout(activeFlyout === entry.group ? null : entry.group!);
                      setInsertTab(null);
                    } else pickTool(entry.tool!);
                  }}
                >
                  {activeItem ? <Glyph name={activeItem.id} /> : entry.icon}
                  <span className="max-w-full truncate px-0.5 text-[10px] font-medium leading-none">{entry.label}</span>
                  {group && <span className="absolute bottom-1 right-1 h-0 w-0 border-l-[4px] border-t-[4px] border-l-transparent border-t-current opacity-50" />}
                </button>

                {group && activeFlyout === entry.group && (
                  <div role="menu" className="absolute left-full top-0 z-50 ml-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    {group.sections.map((sec) => (
                      <div key={sec.title} className="mb-1 last:mb-0">
                        <div className="px-2 pb-1 pt-0.5 text-xs font-semibold text-slate-500">{sec.title}</div>
                        <div className={sec.items.length > 3 ? "grid grid-cols-2 gap-0.5" : "space-y-0.5"}>
                          {sec.items.map((it) => (
                            <button
                              key={it.id}
                              type="button"
                              role="menuitem"
                              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
                                activeTool === it.id ? "bg-indigo-50 font-semibold text-indigo-800" : "text-slate-800 hover:bg-slate-100"
                              }`}
                              onClick={() => pickTool(it.id)}
                            >
                              <Glyph name={it.id} className="shrink-0 text-slate-500" />
                              <span className="min-w-0 flex-1 truncate">{it.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* Canvas */}
        <main
          className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-100 select-none"
          style={{
            cursor:
              activeTool === "hand" ? "grab" : activeTool === "select" ? "default" : activeTool === "text" ? CURSOR_TEXT : activeTool === "eraser" ? CURSOR_ERASER : CURSOR_CROSS,
          }}
          onClick={() => {
            setActiveFlyout(null);
            setInsertTab(null);
          }}
        >
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none"
            style={{ cursor: "inherit" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
          />

          {canvasHint && activeTool !== "select" && !inlineText && (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
              <div className="flex items-center gap-2 rounded-full bg-slate-900/85 py-1.5 pl-3 pr-1.5 text-xs text-white shadow-lg">
                <span>{canvasHint}</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] text-white/80">Esc to stop</span>
              </div>
            </div>
          )}

          {doc.objects.length === 0 && !inlineText && activeTool === "select" && (
            <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
              <div className="rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs text-slate-600 shadow-sm">
                Choose a tool on the left, or <b>Insert</b> a ready figure. Scroll to move around, Ctrl + scroll to zoom.
              </div>
            </div>
          )}

          {/* On-canvas text editor */}
          {inlineText && (
            <div
              className="absolute z-40 w-72 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl animate-in zoom-in-95 duration-100"
              style={{
                left: Math.max(16, Math.min(window.innerWidth - 300, sceneToScreen(inlineText.x, inlineText.y).x)),
                top: Math.max(60, Math.min(window.innerHeight - 220, sceneToScreen(inlineText.x, inlineText.y).y)),
              }}
            >
              <textarea
                autoFocus
                className="input w-full font-sans text-sm"
                rows={2}
                aria-label="Text"
                placeholder="Type a label or formula"
                value={inlineText.text}
                onChange={(e) => setInlineText({ ...inlineText, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setInlineText(null);
                  } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                    e.preventDefault();
                    commitInlineText();
                  }
                }}
              />
              <div className="flex flex-wrap gap-1 pt-1.5">
                {MATH_SYMBOLS.slice(0, 16).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-800 hover:border-indigo-300 hover:bg-indigo-50"
                    onClick={() => setInlineText({ ...inlineText, text: inlineText.text + sym })}
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-1.5 pt-2">
                <span className="text-[11px] text-slate-400">Enter to place · Shift+Enter new line</span>
                <div className="flex gap-1.5">
                  <button type="button" className="btn btn-sm btn-ghost text-xs" onClick={() => setInlineText(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-sm btn-primary text-xs" onClick={commitInlineText}>
                    {inlineText.id ? "Update" : "Place text"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Inspector */}
        <aside
          aria-label="Properties"
          className={`fixed bottom-0 right-0 top-14 z-30 flex w-[20.5rem] max-w-[100vw] shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:static lg:shadow-none ${
            showMobileInspector ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}
        >
          {selectedObj ? (
            <>
              <SelectionHeader
                title={selectedCount > 1 ? `${selectedCount} objects` : objectName(selectedObj)}
                detail={single && hasBoxFields(single) ? `${Math.round(single.w)} × ${Math.round(single.h)}` : undefined}
                onFront={bringToFront}
                onForward={bringForward}
                onBackward={sendBackward}
                onBack={sendToBack}
                onFlipH={flipH}
                onFlipV={flipV}
                onDuplicate={duplicateSelected}
                onDelete={deleteSelected}
              />
              {single?.type === "angle" && (
                <AngleInspector
                  key={single.id}
                  obj={single}
                  update={updateSelected}
                  onAddPoints={(pts) => pushHistory({ ...doc, objects: [...doc.objects, ...pts] })}
                />
              )}
              {single?.type === "shape" && <ShapeInspector key={single.id} obj={single} update={updateSelected} />}
              {single?.type === "line" && <LineInspector key={single.id} obj={single} update={updateSelected} />}
              {single?.type === "point" && <PointInspector key={single.id} obj={single} update={updateSelected} />}
              {single?.type === "text" && <TextInspector key={single.id} obj={single} update={updateSelected} />}
              {single?.type === "numberline" && <NumberLineInspector key={single.id} obj={single} update={updateSelected} />}
              {single?.type === "axes" && <AxesInspector key={single.id} obj={single} update={updateSelected} />}
              {single?.type === "table" && <TableInspector key={single.id} obj={single} update={updateSelected} />}
              {single?.type === "fraction" && <FractionInspector key={single.id} obj={single} update={updateSelected} />}
              {selectedCount >= 2 && <AlignTools count={selectedCount} onAlign={alignSelected} />}
              <StyleSection
                key={`style-${selectedObj.id}`}
                title={single?.type === "text" ? "Colour" : "Colour and line"}
                value={selectedObj.style}
                onChange={updateSelectedStyle}
                defaultOpen={!single || !RICH_INSPECTORS.includes(single.type)}
              />
            </>
          ) : (
            <>
              <div className="border-b border-slate-200 px-4 pb-3 pt-3">
                <h2 className="text-[15px] font-semibold text-slate-900">Page</h2>
                <p className="mt-0.5 text-xs text-slate-500">Click something on the page to edit it.</p>
              </div>
              <StyleSection title="Style for new drawings" value={style} onChange={updateSelectedStyle} />
              <Section title="Grid" summary={grid.style === "none" ? "off" : `${grid.size}px${snap ? ", snapping" : ""}`}>
                <div className="grid grid-cols-2">
                  <Toggle label="Show grid" checked={grid.style !== "none"} onChange={(v) => setGrid((g) => ({ ...g, style: v ? "squares" : "none" }))} />
                  <Toggle label="Snap to grid" checked={snap} onChange={setSnap} />
                  <Toggle label="Print the grid" checked={grid.include} onChange={(v) => setGrid((g) => ({ ...g, include: v }))} />
                </div>
                <Seg
                  label="Grid spacing"
                  value={grid.size}
                  options={[10, 20, 40].map((n) => ({ id: n, label: `${n}px` }))}
                  onChange={(n) => setGrid((g) => ({ ...g, size: n, style: g.style === "none" ? "squares" : g.style }))}
                />
                <p className="text-xs text-slate-500">Hold Alt while drawing to place freely without snapping.</p>
              </Section>
              <Section title="Page size" summary={`${doc.w} × ${doc.h}`}>
                <CanvasSizeControls w={doc.w} h={doc.h} onResize={(w, h) => pushHistory({ ...doc, w, h })} />
                <Toggle label="Trim empty space when saving" checked={cropToFigure} onChange={setCropToFigure} />
              </Section>
            </>
          )}
        </aside>
      </div>

      {/* ---------------- Status bar ---------------- */}
      <footer className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 text-xs text-slate-500">
        <span className="truncate font-medium text-slate-700">{toolLabel}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-pressed={grid.style !== "none"}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 ${grid.style !== "none" ? "text-indigo-700" : "text-slate-500"} hover:bg-slate-100`}
            onClick={() => setGrid((g) => ({ ...g, style: g.style === "none" ? "squares" : "none" }))}
            title="Show or hide the grid"
          >
            <Grid size={13} /> Grid
          </button>
          <button
            type="button"
            aria-pressed={snap}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 ${snap ? "text-indigo-700" : "text-slate-500"} hover:bg-slate-100`}
            onClick={() => setSnap((s) => !s)}
            title="Snap to grid (hold Alt to bypass)"
          >
            <Magnet size={13} /> Snap
          </button>
          <span className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />
          <span className="hidden tabular-nums sm:inline">
            {doc.w} × {doc.h}
          </span>
          <span ref={coordRef} className="hidden w-24 text-right tabular-nums text-slate-400 sm:inline">
            x –  y –
          </span>
          <span className="w-12 text-right tabular-nums">{Math.round(zoom * 100)}%</span>
        </div>
      </footer>

      {/* ---------------- Shortcuts ---------------- */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setShowShortcuts(false)}>
          <div
            role="dialog"
            aria-label="Keyboard shortcuts"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Keyboard shortcuts</h3>
              <button type="button" aria-label="Close" onClick={() => setShowShortcuts(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-600">
              <div><kbd className="kbd">V</kbd> Select</div>
              <div><kbd className="kbd">H</kbd> Pan</div>
              <div><kbd className="kbd">A</kbd> Angle</div>
              <div><kbd className="kbd">L</kbd> Line</div>
              <div><kbd className="kbd">R</kbd> Rectangle</div>
              <div><kbd className="kbd">C</kbd> Circle</div>
              <div><kbd className="kbd">T</kbd> Text</div>
              <div><kbd className="kbd">P</kbd> Pen</div>
              <div><kbd className="kbd">E</kbd> Eraser</div>
              <div><kbd className="kbd">Esc</kbd> Stop / deselect</div>
              <div><kbd className="kbd">Ctrl+D</kbd> Duplicate</div>
              <div><kbd className="kbd">Del</kbd> Delete</div>
              <div><kbd className="kbd">Ctrl+Z</kbd> Undo</div>
              <div><kbd className="kbd">Ctrl+Y</kbd> Redo</div>
              <div><kbd className="kbd">Ctrl+C / V</kbd> Copy / paste</div>
              <div><kbd className="kbd">Ctrl+A</kbd> Select all</div>
              <div><kbd className="kbd">Arrows</kbd> Nudge (Shift = 10px)</div>
              <div><kbd className="kbd">Alt</kbd> Draw without snapping</div>
              <div><kbd className="kbd">Ctrl+Scroll</kbd> Zoom at pointer</div>
              <div><kbd className="kbd">0</kbd> Fit page on screen</div>
            </div>
            <button type="button" className="btn btn-primary btn-sm mt-4 w-full" onClick={() => setShowShortcuts(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ Tool rail data */

type GroupId = "lines" | "shapes" | "graphs";
type ToolItem = { id: Tool; label: string };

const TOOL_GROUPS: Record<GroupId, { sections: { title: string; items: ToolItem[] }[] }> = {
  lines: {
    sections: [
      {
        title: "Lines",
        items: [
          { id: "line", label: "Line segment" },
          { id: "ray", label: "Ray (one arrow)" },
          { id: "double_arrow", label: "Double arrow" },
          { id: "dimension", label: "Dimension (5 cm)" },
          { id: "arc_line", label: "Curve through 3 points" },
        ],
      },
    ],
  },
  shapes: {
    sections: [
      {
        title: "Basic",
        items: [
          { id: "rect", label: "Rectangle" },
          { id: "roundrect", label: "Rounded box" },
          { id: "circle", label: "Circle" },
          { id: "triangle", label: "Triangle" },
          { id: "rtriangle", label: "Right triangle" },
          { id: "polygon", label: "Polygon" },
        ],
      },
      {
        title: "Quadrilaterals",
        items: [
          { id: "parallelogram", label: "Parallelogram" },
          { id: "rhombus", label: "Rhombus" },
          { id: "trapezium", label: "Trapezium" },
          { id: "cross", label: "Cross" },
        ],
      },
      {
        title: "Curved regions",
        items: [
          { id: "semicircle", label: "Semicircle" },
          { id: "sector", label: "Sector" },
          { id: "ring", label: "Ring" },
          { id: "star", label: "Star" },
        ],
      },
    ],
  },
  graphs: {
    sections: [
      {
        title: "Graphs and scales",
        items: [
          { id: "numberline", label: "Number line" },
          { id: "axes", label: "x–y graph" },
          { id: "table", label: "Table" },
        ],
      },
      {
        title: "Fraction models",
        items: [
          { id: "fraction_circle", label: "Fraction circle" },
          { id: "fraction_bar", label: "Fraction bar" },
          { id: "fraction_grid", label: "Fraction grid" },
        ],
      },
    ],
  },
};

type RailEntry =
  | "divider"
  | { label: string; title: string; icon: React.ReactNode; tool?: Tool; group?: GroupId; tone?: "indigo" | "amber" | "red" };

const RAIL: RailEntry[] = [
  { label: "Select", title: "Select and move (V)", icon: <MousePointer size={18} />, tool: "select" },
  { label: "Pan", title: "Move around the page (H)", icon: <Hand size={18} />, tool: "hand" },
  "divider",
  { label: "Point", title: "Point with a letter (A, B, C…)", icon: <Glyph name="point" />, tool: "point" },
  { label: "Lines", title: "Lines, rays, arrows, dimensions and curves", icon: <Glyph name="line" />, group: "lines" },
  { label: "Angle", title: "Angle (A): click the corner, then each arm", icon: <Glyph name="angle" />, tool: "angle" },
  { label: "Shapes", title: "Triangles, quadrilaterals, circles and more", icon: <Glyph name="shapes" />, group: "shapes" },
  { label: "Maths", title: "Number line, graph, table and fraction models", icon: <Glyph name="numberline" />, group: "graphs" },
  "divider",
  { label: "Text", title: "Text and formulas (T)", icon: <Type size={18} />, tool: "text" },
  { label: "Pen", title: "Freehand pen (P)", icon: <Pencil size={17} />, tool: "pen" },
  { label: "Marker", title: "Highlighter", icon: <Highlighter size={17} />, tool: "highlighter", tone: "amber" },
  { label: "Eraser", title: "Eraser: click an object to remove it (E)", icon: <Eraser size={17} />, tool: "eraser", tone: "red" },
];

/** Inspectors with enough of their own controls that the colour section starts collapsed. */
const RICH_INSPECTORS: Obj["type"][] = ["numberline", "axes", "table", "fraction", "angle"];

const TOOL_LABELS: Partial<Record<Tool, string>> = {
  select: "Select: click an object to edit it, drag to move it",
  hand: "Pan: drag to move around the page",
  ...Object.fromEntries(
    Object.values(TOOL_GROUPS).flatMap((g) => g.sections.flatMap((s) => s.items.map((it) => [it.id, it.label]))),
  ),
  angle: "Angle",
  point: "Point",
  text: "Text",
  pen: "Pen",
  highlighter: "Highlighter",
  eraser: "Eraser",
  stamp: "Symbol",
};

const TOOL_HINTS: Partial<Record<Tool, string>> = {
  hand: "Drag to move around the page",
  point: "Click to place a point. Letters go A, B, C…",
  line: "Drag to draw a line",
  ray: "Drag to draw a ray",
  double_arrow: "Drag to draw a double arrow",
  dimension: "Drag to draw a dimension line",
  arc_line: "Click three points: start, a point on the curve, end",
  text: "Click where the text should go",
  pen: "Draw freehand",
  highlighter: "Drag to highlight",
  eraser: "Click an object to erase it",
  numberline: "Click to place a number line",
  axes: "Click to place an x–y graph",
  table: "Click to place a table",
  fraction_circle: "Click to place a fraction circle",
  fraction_bar: "Click to place a fraction bar",
  fraction_grid: "Click to place a fraction grid",
  ...Object.fromEntries(TOOL_GROUPS.shapes.sections.flatMap((s) => s.items.map((it) => [it.id, `Drag to draw a ${it.label.toLowerCase()}. Hold Shift for equal sides`]))),
};

/* ------------------------------------------------------------------ Geometry glyphs */

/** Small line drawings of each figure tool, so the menus show the shape rather than only its name. */
function Glyph({ name, className = "" }: { name: string; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const body: Record<string, React.ReactNode> = {
    point: (
      <>
        <circle cx="8" cy="12" r="2.4" fill="currentColor" stroke="none" />
        <path d="M12.5 8.5 14.5 3l2 5.5M13.2 6.7h2.6" {...p} strokeWidth={1.3} />
      </>
    ),
    line: <path d="M3 16 17 4" {...p} />,
    ray: <path d="M3 16 17 4m0 0h-5m5 0v5" {...p} />,
    double_arrow: <path d="M3 16 17 4m0 0h-5m5 0v5M3 16h5m-5 0v-5" {...p} />,
    dimension: <path d="M3 10h14M3 6v8M17 6v8M6 10l-2 0" {...p} />,
    arc_line: <path d="M3 15Q10 0 17 15" {...p} />,
    angle: <path d="M3 16h14M3 16 13 5M9 16a6 6 0 0 0-2-4.5" {...p} />,
    shapes: (
      <>
        <rect x="2.5" y="8.5" width="8" height="8" rx="0.5" {...p} />
        <circle cx="13.5" cy="7" r="4.5" {...p} />
      </>
    ),
    rect: <rect x="3" y="5" width="14" height="10" {...p} />,
    roundrect: <rect x="3" y="5" width="14" height="10" rx="3" {...p} />,
    circle: <circle cx="10" cy="10" r="7" {...p} />,
    triangle: <path d="M10 3 17 16H3Z" {...p} />,
    rtriangle: <path d="M4 3v13h13ZM4 13h3v3" {...p} />,
    polygon: <path d="M10 2.5 16.5 6.25v7.5L10 17.5l-6.5-3.75v-7.5Z" {...p} />,
    parallelogram: <path d="M6.5 5H18l-4.5 10H2Z" {...p} />,
    rhombus: <path d="M10 2.5 17 10l-7 7.5L3 10Z" {...p} />,
    trapezium: <path d="M6.5 5h7L18 15H2Z" {...p} />,
    cross: <path d="M8 3h4v5h5v4h-5v5H8v-5H3V8h5Z" {...p} />,
    semicircle: <path d="M3 13a7 7 0 0 1 14 0Z" {...p} />,
    sector: <path d="M10 15V4a7 7 0 0 1 7 7Z" {...p} transform="translate(-2 0)" />,
    ring: (
      <>
        <circle cx="10" cy="10" r="7" {...p} />
        <circle cx="10" cy="10" r="3.2" {...p} />
      </>
    ),
    star: <path d="m10 2.5 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.8l5-.7Z" {...p} />,
    numberline: <path d="M2 11h16M2 11l2-2m-2 2 2 2m14-2-2-2m2 2-2 2M6 9v4M10 9v4M14 9v4" {...p} strokeWidth={1.4} />,
    axes: <path d="M10 2v16M2 10h16M10 2 8.5 4M10 2l1.5 2M18 10l-2-1.5M18 10l-2 1.5M12.5 8a3 3 0 0 0 3-4" {...p} strokeWidth={1.4} />,
    table: <path d="M3 4h14v12H3ZM3 8h14M3 12h14M8 4v12M12.5 4v12" {...p} strokeWidth={1.3} />,
    fraction_circle: (
      <>
        <path d="M10 10V3a7 7 0 0 1 7 7Z" fill="currentColor" opacity={0.35} stroke="none" />
        <circle cx="10" cy="10" r="7" {...p} />
        <path d="M10 3v14M3 10h14" {...p} strokeWidth={1.2} />
      </>
    ),
    fraction_bar: (
      <>
        <rect x="2.5" y="7" width="7.5" height="6" fill="currentColor" opacity={0.35} />
        <path d="M2.5 7h15v6h-15ZM6.25 7v6M10 7v6M13.75 7v6" {...p} strokeWidth={1.3} />
      </>
    ),
    fraction_grid: (
      <>
        <rect x="3" y="4" width="7" height="6" fill="currentColor" opacity={0.35} />
        <path d="M3 4h14v12H3ZM3 10h14M10 4v12" {...p} strokeWidth={1.3} />
      </>
    ),
  };
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className={className}>
      {body[name] ?? body.shapes}
    </svg>
  );
}
