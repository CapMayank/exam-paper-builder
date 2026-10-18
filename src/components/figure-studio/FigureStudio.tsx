"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  Box,
  BringToFront,
  Check,
  ChevronDown,
  Circle,
  Compass,
  Copy,
  CornerDownRight,
  Crop,
  Download,
  Eraser,
  FlipHorizontal,
  FlipVertical,
  Grid,
  Hand,
  Hash,
  HelpCircle,
  Hexagon,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Minus,
  MousePointer,
  Move,
  Pen,
  Pencil,
  Percent,
  PieChart,
  Plus,
  Redo2,
  RotateCcw,
  Ruler,
  Scissors,
  SendToBack,
  Shapes,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Spline,
  Square,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  Type,
  Undo2,
  Upload,
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
  NumLineObj,
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
  | "point"
  | "text"
  | "stamp";

const COLOR_SWATCHES = [
  { label: "Ink Black", val: "#000000" },
  { label: "Graphite", val: "#4f5951" },
  { label: "Teal Primary", val: "#1e6075" },
  { label: "Navy Blue", val: "#1d4ed8" },
  { label: "Emerald Green", val: "#047857" },
  { label: "Crimson Red", val: "#b91c1c" },
  { label: "Amber Accent", val: "#d97706" },
  { label: "Purple", val: "#7c3aed" },
];

const FILL_SWATCHES = [
  { label: "No Fill", val: null },
  { label: "White", val: "#ffffff" },
  { label: "Light Teal", val: "rgba(30, 96, 117, 0.15)" },
  { label: "Light Blue", val: "rgba(29, 78, 216, 0.15)" },
  { label: "Light Green", val: "rgba(4, 120, 87, 0.15)" },
  { label: "Light Red", val: "rgba(185, 28, 28, 0.15)" },
  { label: "Light Amber", val: "rgba(217, 119, 6, 0.15)" },
  { label: "Light Purple", val: "rgba(124, 58, 237, 0.15)" },
];

const MATH_SYMBOLS = [
  "θ", "α", "β", "γ", "δ", "λ", "μ", "π", "σ", "ω", "Δ", "Ω",
  "°", "∠", "△", "⊥", "∥", "≅", "∼", "≈", "≠", "≤", "≥", "±", "×", "÷", "√", "∞", "∴", "∵",
  "²", "³", "₁", "₂", "cm", "mm", "m",
];

type ActiveHandle =
  | { kind: "obj"; id: string; objId: string }
  | { kind: "box"; handle: BoxHandle; objId: string }
  | { kind: "rot"; objId: string };

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
  const [showTemplates, setShowTemplates] = useState(false);
  const [showStamps, setShowStamps] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
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

  // Auto-center the document page on load
  useEffect(() => {
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w > 0 && h > 0) {
        setPan({
          x: Math.max(16, Math.round((w - doc.w) / 2)),
          y: Math.max(16, Math.round((h - doc.h) / 2)),
        });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [doc.w, doc.h]);

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
  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = screenToScene(e.clientX, e.clientY);
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
        x: p.x - 140,
        y: p.y - 25,
        w: 280,
        h: 50,
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
    const p = screenToScene(e.clientX, e.clientY);
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
  }, [doc, selectedIds, undo, redo]);

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
      const rawPng = await renderDocToBlob(doc, grid, 2);
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
        setShowAiPrompt(false);
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

  if (!mounted) return null;

  const currentDeg =
    selectedObj?.type === "angle"
      ? angleGeom(
          (selectedObj as AngleObj).v,
          (selectedObj as AngleObj).a,
          (selectedObj as AngleObj).b,
          (selectedObj as AngleObj).reflex,
        ).deg
      : 0;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-100 font-sans text-slate-900 select-none animate-in fade-in duration-150">
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* ---------------- Top Navbar ---------------- */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
            <Ruler size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900">
                Figure Studio
              </span>
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-100">
                Vector Pro
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-500">
              Interactive geometry, angles, science symbols &amp; diagrams
            </p>
          </div>

          <div className="hidden md:block mx-1.5 h-5 w-px bg-slate-200" />

          {/* Undo / Redo */}
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              className="btn btn-sm btn-ghost p-1.5"
              disabled={historyIndex <= 0}
              onClick={undo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost p-1.5"
              disabled={historyIndex >= history.length - 1}
              onClick={redo}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={16} />
            </button>
          </div>

          <div className="hidden md:block mx-1.5 h-5 w-px bg-slate-200" />

          {/* AI Draw from Prompt */}
          <div className="hidden sm:block relative">
            <button
              type="button"
              className="btn btn-sm border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 font-medium"
              onClick={() => {
                setShowAiPrompt(!showAiPrompt);
                setShowTemplates(false);
                setShowStamps(false);
              }}
              title="Draw diagram automatically from natural language prompt (e.g. Right triangle ABC with base 8cm)"
            >
              <Sparkles size={14} className="text-purple-600" />
              <span>AI Draw</span>
            </button>
            {showAiPrompt && (
              <div className="absolute left-0 top-full mt-1.5 w-96 rounded-xl border border-purple-200 bg-white p-3.5 shadow-2xl z-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                    <Sparkles size={14} className="text-purple-600" />
                    <span>AI Diagram Auto-Layout</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiPrompt(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                  Describe what you want to draw. Gemini generates geometric shapes, angles, labels, coordinates, or circuit diagrams.
                </p>
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-slate-400"
                    placeholder="e.g. Right-angled triangle ABC right angled at B, base BC = 8 cm, altitude AB = 6 cm, with an angle mark θ at vertex A"
                    value={aiPromptText}
                    onChange={(e) => setAiPromptText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleAiDraw();
                      }
                    }}
                  />
                  {/* Quick example prompt chips */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <button
                      type="button"
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 hover:bg-purple-100 hover:text-purple-800 transition cursor-pointer"
                      onClick={() =>
                        setAiPromptText(
                          "Right-angled triangle ABC right angled at B, base BC = 8 cm, altitude AB = 6 cm, with an angle mark θ at vertex A"
                        )
                      }
                    >
                      📐 Right △ with angle θ
                    </button>
                    <button
                      type="button"
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 hover:bg-purple-100 hover:text-purple-800 transition cursor-pointer"
                      onClick={() =>
                        setAiPromptText(
                          "Circle with center O, diameter AB, radius 5 cm, and tangent line touching at point T"
                        )
                      }
                    >
                      ⭕ Circle with tangent
                    </button>
                    <button
                      type="button"
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 hover:bg-purple-100 hover:text-purple-800 transition cursor-pointer"
                      onClick={() =>
                        setAiPromptText(
                          "Circuit diagram for verification of Ohm's Law with resistor R, voltmeter in parallel, ammeter in series, rheostat, plug key, and battery"
                        )
                      }
                    >
                      ⚡ Ohm&apos;s Law Circuit
                    </button>
                  </div>

                  {aiPromptError && (
                    <div className="rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                      {aiPromptError}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">Ctrl+Enter to generate</span>
                    <button
                      type="button"
                      disabled={aiPromptBusy || !aiPromptText.trim()}
                      onClick={handleAiDraw}
                      className="btn btn-sm bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 text-xs font-semibold px-3 py-1.5 shadow-xs"
                    >
                      {aiPromptBusy ? "Generating Diagram…" : "Generate on Canvas"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Insert Templates */}
          <div className="hidden sm:block relative">
            <button
              type="button"
              className="btn btn-sm text-slate-700"
              onClick={() => {
                setShowTemplates(!showTemplates);
                setShowStamps(false);
                setShowAiPrompt(false);
              }}
            >
              <Sparkles size={14} className="text-indigo-600" />
              Templates <ChevronDown size={12} />
            </button>
            {showTemplates && (
              <div className="absolute left-0 top-full mt-1.5 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1">
                  Preset Board &amp; CBSE Geometry
                </div>
                <div className="space-y-1">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="w-full text-left rounded-lg p-2 hover:bg-indigo-50/70 transition flex flex-col"
                      onClick={() => {
                        const newObjs = t.create({ x: doc.w / 2, y: doc.h / 2 });
                        pushHistory({ ...doc, objects: [...doc.objects, ...newObjs] });
                        setSelectedIds(newObjs.map((o) => o.id));
                        setShowTemplates(false);
                      }}
                    >
                      <span className="text-xs font-semibold text-slate-900">{t.name}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        {t.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Symbols & Science Stamps */}
          <div className="hidden sm:block relative">
            <button
              type="button"
              className="btn btn-sm text-slate-700"
              onClick={() => {
                setShowStamps(!showStamps);
                setShowTemplates(false);
                setShowAiPrompt(false);
              }}
            >
              <Shapes size={14} className="text-purple-600" />
              Science &amp; Symbols <ChevronDown size={12} />
            </button>
            {showStamps && (
              <div className="absolute left-0 top-full mt-1.5 w-88 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50 max-h-96 overflow-y-auto">
                {STAMP_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="mb-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                      <span>{cat.label}</span>
                      <span className="text-[9px] font-semibold text-slate-400">
                        {Object.values(STAMP_REGISTRY).filter((s) => s.category === cat.id).length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.values(STAMP_REGISTRY)
                        .filter((s) => s.category === cat.id)
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 p-2 text-xs font-medium text-slate-800 hover:bg-purple-50 hover:border-purple-200 transition"
                            onClick={() => {
                              const newStamp: Obj = {
                                id: uid(),
                                type: "stamp",
                                stamp: s.id,
                                x: doc.w / 2 - 45,
                                y: doc.h / 2 - 35,
                                w: 90,
                                h: 70,
                                rot: 0,
                                style: { ...style },
                              };
                              pushHistory({ ...doc, objects: [...doc.objects, newStamp] });
                              setSelectedIds([newStamp.id]);
                              setShowStamps(false);
                            }}
                          >
                            <span className="truncate">{s.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Insert Image */}
          <button
            type="button"
            className="hidden md:flex btn btn-sm btn-ghost text-slate-700"
            onClick={() => fileInputRef.current?.click()}
            title="Upload image or paste from clipboard (Ctrl+V)"
          >
            <Upload size={14} className="text-slate-600" />
            Image
          </button>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <div className="hidden lg:flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              className="rounded p-1 text-slate-600 hover:bg-white"
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))}
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="px-2 text-xs font-semibold tabular-nums text-slate-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="rounded p-1 text-slate-600 hover:bg-white"
              onClick={() => setZoom((z) => Math.min(4, z + 0.15))}
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-white"
              onClick={() => {
                const canvas = canvasRef.current;
                if (canvas && canvas.clientWidth > 0) {
                  const fitZoom = Math.min(
                    (canvas.clientWidth - 48) / doc.w,
                    (canvas.clientHeight - 48) / doc.h,
                    1,
                  );
                  setZoom(fitZoom);
                  setPan({
                    x: Math.round((canvas.clientWidth - doc.w * fitZoom) / 2),
                    y: Math.round((canvas.clientHeight - doc.h * fitZoom) / 2),
                  });
                } else {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }
              }}
              title="Fit to screen & center"
            >
              Fit
            </button>
          </div>

          <button
            type="button"
            className="lg:hidden btn btn-sm btn-ghost p-1.5 text-slate-600"
            onClick={() => setShowMobileInspector((v) => !v)}
            title="Toggle Properties"
            aria-label="Toggle Properties"
          >
            <SlidersHorizontal size={16} />
          </button>

          <button
            type="button"
            className="hidden sm:flex btn btn-sm btn-ghost p-1.5 text-slate-500"
            onClick={() => setShowShortcuts(true)}
            title="Shortcuts (?)"
          >
            <HelpCircle size={16} />
          </button>

          <button type="button" className="btn btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleExport}>
            <Check size={14} /> Use Figure
          </button>
        </div>
      </header>

      {/* ---------------- Main Body ---------------- */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Toolbar */}
        <aside className="w-14 shrink-0 border-r border-slate-200 bg-white flex flex-col items-center py-2.5 gap-1.5 shadow-2xs z-20">
          {/* Select & Move */}
          <button
            type="button"
            className={`btn btn-icon rounded-lg p-2.5 transition ${
              activeTool === "select"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => {
              setActiveTool("select");
              setAnglePending(null);
              setActiveFlyout(null);
            }}
            title="Select & Move (V)"
          >
            <MousePointer size={18} />
          </button>

          {/* Hand / Pan */}
          <button
            type="button"
            className={`btn btn-icon rounded-lg p-2.5 transition ${
              activeTool === "hand"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => {
              setActiveTool("hand");
              setActiveFlyout(null);
            }}
            title="Hand / Pan (H)"
          >
            <Hand size={18} />
          </button>

          <div className="w-8 h-px bg-slate-200 my-0.5" />

          {/* Angle tool - Primary headline feature */}
          <button
            type="button"
            className={`btn btn-icon rounded-lg p-2.5 transition relative ${
              activeTool === "angle"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => {
              setActiveTool("angle");
              setAnglePending(null);
              setActiveFlyout(null);
            }}
            title="Angle Tool (A) - Click vertex, arm 1, arm 2 with live degree preview"
          >
            <CornerDownRight size={18} />
            <span className="absolute bottom-1 right-1 text-[8px] font-bold">∠</span>
          </button>

          {/* Lines & Dimension Flyout */}
          <div className="relative">
            <button
              type="button"
              className={`btn btn-icon rounded-lg p-2.5 transition relative ${
                ["line", "ray", "double_arrow", "dimension", "arc_line"].includes(activeTool)
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() =>
                setActiveFlyout(activeFlyout === "lines" ? null : "lines")
              }
              title="Lines, Rays, Dimension & Arcs"
            >
              <Minus size={18} />
              <span className="absolute bottom-0.5 right-0.5 text-[7px]">▾</span>
            </button>
            {activeFlyout === "lines" && (
              <div className="absolute left-14 top-0 ml-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5">
                  Line Tools
                </div>
                {[
                  { id: "line", label: "Straight Line", desc: "Segment" },
                  { id: "ray", label: "Single Ray →", desc: "Arrow head" },
                  { id: "double_arrow", label: "Double Arrow ↔", desc: "Both ends" },
                  { id: "dimension", label: "Dimension Line", desc: "With '5 cm' label" },
                  { id: "arc_line", label: "3-Pt Curve / Arc", desc: "Curved path" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-medium transition flex items-center justify-between ${
                      activeTool === item.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                    onClick={() => {
                      setActiveTool(item.id as Tool);
                      setActiveFlyout(null);
                    }}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rich Shapes Flyout */}
          <div className="relative">
            <button
              type="button"
              className={`btn btn-icon rounded-lg p-2.5 transition relative ${
                [
                  "rect",
                  "roundrect",
                  "circle",
                  "triangle",
                  "rtriangle",
                  "parallelogram",
                  "rhombus",
                  "trapezium",
                  "polygon",
                  "star",
                  "cross",
                  "semicircle",
                  "sector",
                  "ring",
                ].includes(activeTool)
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() =>
                setActiveFlyout(activeFlyout === "shapes" ? null : "shapes")
              }
              title="Geometry Shapes (Triangles, Polygons, Sectors)"
            >
              <Square size={17} />
              <span className="absolute bottom-0.5 right-0.5 text-[7px]">▾</span>
            </button>
            {activeFlyout === "shapes" && (
              <div className="absolute left-14 top-0 ml-1.5 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 max-h-96 overflow-y-auto space-y-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                    Triangles &amp; Boxes
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { id: "rect", label: "Rectangle" },
                      { id: "roundrect", label: "Rounded Box" },
                      { id: "circle", label: "Circle / Ellipse" },
                      { id: "triangle", label: "Isosceles Δ" },
                      { id: "rtriangle", label: "Right Δ (90°)" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`text-left rounded-lg p-1.5 text-xs transition truncate ${
                          activeTool === s.id
                            ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                        onClick={() => {
                          setActiveTool(s.id as Tool);
                          setActiveFlyout(null);
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                    Quadrilaterals &amp; Polygons
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { id: "parallelogram", label: "Parallelogram" },
                      { id: "rhombus", label: "Rhombus" },
                      { id: "trapezium", label: "Trapezium" },
                      { id: "polygon", label: "Polygon (N-side)" },
                      { id: "star", label: "Star" },
                      { id: "cross", label: "Cross +" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`text-left rounded-lg p-1.5 text-xs transition truncate ${
                          activeTool === s.id
                            ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                        onClick={() => {
                          setActiveTool(s.id as Tool);
                          setActiveFlyout(null);
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                    Curved Regions (Mensuration)
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { id: "semicircle", label: "Semicircle" },
                      { id: "sector", label: "Sector / Pie" },
                      { id: "ring", label: "Ring / Annulus" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`text-left rounded-lg p-1.5 text-xs transition truncate ${
                          activeTool === s.id
                            ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                        onClick={() => {
                          setActiveTool(s.id as Tool);
                          setActiveFlyout(null);
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Graphs & Axes Flyout */}
          <div className="relative">
            <button
              type="button"
              className={`btn btn-icon rounded-lg p-2.5 transition relative ${
                ["axes", "numberline"].includes(activeTool)
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() =>
                setActiveFlyout(activeFlyout === "graphs" ? null : "graphs")
              }
              title="Graphing Axes &amp; Number Line"
            >
              <TrendingUp size={18} />
              <span className="absolute bottom-0.5 right-0.5 text-[7px]">▾</span>
            </button>
            {activeFlyout === "graphs" && (
              <div className="absolute left-14 top-0 ml-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5">
                  Graphs &amp; Scales
                </div>
                {[
                  { id: "axes", label: "X-Y Coordinate Plane", desc: "4 Quadrants" },
                  { id: "numberline", label: "Number Line", desc: "Negative to positive" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-medium transition flex items-center justify-between ${
                      activeTool === item.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                    onClick={() => {
                      setActiveTool(item.id as Tool);
                      setActiveFlyout(null);
                    }}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Point & Auto-Lettering Tool */}
          <button
            type="button"
            className={`btn btn-icon rounded-lg p-2.5 transition ${
              activeTool === "point"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => {
              setActiveTool("point");
              setActiveFlyout(null);
            }}
            title="Point Tool (P) - Auto-labelled A, B, C..."
          >
            <div className="flex items-center justify-center font-bold text-xs">P•</div>
          </button>

          {/* Text & Formula Tool */}
          <button
            type="button"
            className={`btn btn-icon rounded-lg p-2.5 transition ${
              activeTool === "text"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => {
              setActiveTool("text");
              setActiveFlyout(null);
            }}
            title="Text & Formula Tool (T) - Click canvas to type"
          >
            <Type size={18} />
          </button>

          {/* Pen Freehand */}
          <button
            type="button"
            className={`btn btn-icon rounded-lg p-2.5 transition ${
              activeTool === "pen"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => {
              setActiveTool("pen");
              setActiveFlyout(null);
            }}
            title="Freehand Pen (P)"
          >
            <Pencil size={17} />
          </button>

          {/* Highlighter */}
          <button
            type="button"
            className={`btn btn-icon rounded-lg p-2.5 transition ${
              activeTool === "highlighter"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:bg-amber-50"
            }`}
            onClick={() => {
              setActiveTool("highlighter");
              setActiveFlyout(null);
            }}
            title="Highlighter"
          >
            <Sparkles size={17} />
          </button>

          {/* Eraser */}
          <button
            type="button"
            className={`btn btn-icon rounded-lg p-2.5 transition ${
              activeTool === "eraser"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-red-50 hover:text-red-700"
            }`}
            onClick={() => {
              setActiveTool("eraser");
              setActiveFlyout(null);
            }}
            title="Object Eraser (E)"
          >
            <Eraser size={17} />
          </button>
        </aside>

        {/* Center Canvas Area */}
        <main
          className="flex-1 bg-slate-100 overflow-hidden relative flex items-center justify-center select-none"
          style={{
            cursor:
              activeTool === "hand"
                ? "grab"
                : activeTool === "select"
                  ? "default"
                  : "crosshair",
          }}
          onClick={() => setActiveFlyout(null)}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full touch-none block"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
          />

          {/* On-Canvas Inline Text Editor Overlay */}
          {inlineText && (
            <div
              className="absolute z-40 bg-white rounded-xl shadow-2xl border border-indigo-200 p-2 min-w-64 animate-in zoom-in-95 duration-100"
              style={{
                left: Math.max(
                  16,
                  Math.min(
                    window.innerWidth - 300,
                    sceneToScreen(inlineText.x, inlineText.y).x,
                  ),
                ),
                top: Math.max(
                  60,
                  Math.min(
                    window.innerHeight - 200,
                    sceneToScreen(inlineText.x, inlineText.y).y,
                  ),
                ),
              }}
            >
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100">
                <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                  <Type size={12} className="text-indigo-600" /> Type Label or Formula
                </span>
                <button
                  type="button"
                  className="p-0.5 text-slate-400 hover:text-slate-700"
                  onClick={() => setInlineText(null)}
                >
                  <X size={13} />
                </button>
              </div>

              <textarea
                autoFocus
                className="input text-sm w-full font-sans"
                rows={2}
                value={inlineText.text}
                onChange={(e) =>
                  setInlineText({ ...inlineText, text: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                    e.preventDefault();
                    if (inlineText.id) {
                      updateSelected((o) => ({
                        ...(o as TextObj),
                        text: inlineText.text,
                      }));
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
                  }
                }}
              />

              {/* Quick Math Symbols Bar */}
              <div className="flex flex-wrap gap-1 pt-1.5">
                {MATH_SYMBOLS.slice(0, 16).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    className="rounded bg-slate-100 hover:bg-indigo-50 border border-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-800 transition"
                    onClick={() =>
                      setInlineText({
                        ...inlineText,
                        text: inlineText.text + sym,
                      })
                    }
                  >
                    {sym}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-xs"
                  onClick={() => setInlineText(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary text-xs"
                  onClick={() => {
                    if (inlineText.id) {
                      updateSelected((o) => ({
                        ...(o as TextObj),
                        text: inlineText.text,
                      }));
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
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Right Inspector & Style Panel */}
        <aside
          className={`fixed lg:static top-14 bottom-0 right-0 z-30 w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-y-auto p-4 space-y-4 shadow-xl lg:shadow-2xs text-xs transition-transform duration-200 ${
            showMobileInspector
              ? "translate-x-0"
              : "translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Header of Inspector */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Sliders size={14} className="text-indigo-600" />
              {selectedObj
                ? `Selected: ${selectedObj.type.toUpperCase()}`
                : "Drawing Properties"}
            </span>
            {selectedObj && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                  onClick={duplicateSelected}
                  title="Duplicate (Ctrl+D)"
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => {
                    pushHistory({
                      ...doc,
                      objects: doc.objects.filter((o) => o.id !== selectedObj.id),
                    });
                    setSelectedIds([]);
                  }}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {/* ---------------- Angle Specific Inspector ---------------- */}
          {selectedObj?.type === "angle" && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 flex items-center gap-1">
                  <CornerDownRight size={14} className="text-indigo-600" /> Angle Properties
                </span>
                <span className="badge badge-indigo text-[10px]">
                  {Math.round(currentDeg)}°
                </span>
              </div>

              {/* Exact Numeric Degree Input + Slider */}
              <div className="space-y-1.5 bg-white rounded-lg p-2.5 border border-indigo-100 shadow-2xs">
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700">
                  <span>Exact Angle Value:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={359}
                      value={Math.round(currentDeg)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val) && val >= 1 && val <= 359) {
                          updateSelected((o) => {
                            const ang = o as AngleObj;
                            const { b, reflex } = withAngleDegrees(ang, val);
                            return { ...ang, b, reflex };
                          });
                        }
                      }}
                      className="w-16 px-1.5 py-0.5 text-right font-mono font-bold rounded border border-slate-300 text-xs text-indigo-900"
                    />
                    <span className="text-xs font-bold text-slate-600">°</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={359}
                  value={Math.round(currentDeg)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateSelected((o) => {
                      const ang = o as AngleObj;
                      const { b, reflex } = withAngleDegrees(ang, val);
                      return { ...ang, b, reflex };
                    });
                  }}
                  className="w-full accent-indigo-600"
                />
                <div className="flex gap-1 pt-1">
                  {[30, 45, 60, 90, 120, 180].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="rounded bg-slate-50 border border-slate-200 px-1 py-0.5 text-[10px] font-semibold hover:bg-indigo-50 flex-1 text-slate-700"
                      onClick={() => {
                        updateSelected((o) => {
                          const ang = o as AngleObj;
                          const { b, reflex } = withAngleDegrees(ang, d);
                          return { ...ang, b, reflex };
                        });
                      }}
                    >
                      {d}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Angle Label Mode */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Angle Label Format:
                </label>
                <div className="segmented w-full [&>button]:flex-1">
                  {(["auto", "custom", "none"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={(selectedObj as AngleObj).labelMode === mode}
                      onClick={() =>
                        updateSelected((o) => ({ ...(o as AngleObj), labelMode: mode }))
                      }
                    >
                      {mode === "auto" ? "Value (°)" : mode === "custom" ? "Custom" : "None"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Text and Greek symbol shortcuts */}
              {(selectedObj as AngleObj).labelMode === "custom" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 block">
                    Angle Name / Text:
                  </label>
                  <input
                    className="input text-xs"
                    placeholder="e.g. θ, 2x, ∠ABC"
                    value={(selectedObj as AngleObj).label || ""}
                    onChange={(e) =>
                      updateSelected((o) => ({ ...(o as AngleObj), label: e.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {["θ", "α", "β", "x", "2x", "∠A", "∠1", "∠2"].map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-xs font-medium hover:bg-indigo-50"
                        onClick={() =>
                          updateSelected((o) => ({ ...(o as AngleObj), label: sym }))
                        }
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Arcs count (Equal Angles notation) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Arcs (Equal Angles Notation):
                </label>
                <div className="segmented w-full [&>button]:flex-1">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      aria-pressed={((selectedObj as AngleObj).arcs || 1) === num}
                      onClick={() =>
                        updateSelected((o) => ({ ...(o as AngleObj), arcs: num }))
                      }
                    >
                      {num} {num === 1 ? "Arc" : "Arcs"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shading & Arm options */}
              <div className="space-y-2 pt-1 border-t border-indigo-100">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={(selectedObj as AngleObj).fillSector || false}
                      onChange={(e) =>
                        updateSelected((o) => ({
                          ...(o as AngleObj),
                          fillSector: e.target.checked,
                          style: {
                            ...o.style,
                            fill: e.target.checked
                              ? o.style.fill || "rgba(30, 96, 117, 0.2)"
                              : null,
                          },
                        }))
                      }
                    />
                    Shade Angle Sector
                  </label>
                  {(selectedObj as AngleObj).fillSector && (
                    <input
                      type="color"
                      value={(selectedObj as AngleObj).style.fill || "#1e6075"}
                      onChange={(e) =>
                        updateSelected((o) => ({
                          ...o,
                          style: { ...o.style, fill: e.target.value },
                        }))
                      }
                      className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Arm Arrowheads:
                    </label>
                    <select
                      className="input text-xs"
                      value={(selectedObj as AngleObj).armArrow || "none"}
                      onChange={(e) =>
                        updateSelected((o) => ({
                          ...(o as AngleObj),
                          armArrow: e.target.value as ArrowKind,
                        }))
                      }
                    >
                      <option value="none">None</option>
                      <option value="filled">Filled Arrow</option>
                      <option value="open">Open Arrow</option>
                      <option value="dot">Dot</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Arm Ticks:
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm w-full"
                      onClick={() =>
                        updateSelected((o) => ({
                          ...(o as AngleObj),
                          armTicks: (((o as AngleObj).armTicks || 0) + 1) % 4,
                        }))
                      }
                    >
                      {((selectedObj as AngleObj).armTicks || 0) > 0
                        ? `${(selectedObj as AngleObj).armTicks} Ticks`
                        : "No Ticks"}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={(selectedObj as AngleObj).rightMark}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...(o as AngleObj),
                        rightMark: e.target.checked,
                      }))
                    }
                  />
                  Square 90° Right-Angle Symbol
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={(selectedObj as AngleObj).reflex}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...(o as AngleObj),
                        reflex: e.target.checked,
                      }))
                    }
                  />
                  Reflex Angle (&gt;180°)
                </label>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Arc Radius:</span>
                    <span>{(selectedObj as AngleObj).arcR}px</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={80}
                    value={(selectedObj as AngleObj).arcR}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...(o as AngleObj),
                        arcR: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                {/* 1-Click Auto-Label Vertices */}
                <button
                  type="button"
                  className="btn btn-sm w-full bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium mt-1"
                  onClick={() => {
                    const ang = selectedObj as AngleObj;
                    const ptV: Obj = {
                      id: uid(),
                      type: "point",
                      x: ang.v.x,
                      y: ang.v.y,
                      label: "B",
                      lx: -14,
                      ly: 14,
                      size: 3,
                      mode: "dot",
                      fontSize: 15,
                      style: DEFAULT_STYLE,
                    };
                    const ptA: Obj = {
                      id: uid(),
                      type: "point",
                      x: ang.a.x,
                      y: ang.a.y,
                      label: "C",
                      lx: 14,
                      ly: 14,
                      size: 3,
                      mode: "dot",
                      fontSize: 15,
                      style: DEFAULT_STYLE,
                    };
                    const ptB: Obj = {
                      id: uid(),
                      type: "point",
                      x: ang.b.x,
                      y: ang.b.y,
                      label: "A",
                      lx: 0,
                      ly: -14,
                      size: 3,
                      mode: "dot",
                      fontSize: 15,
                      style: DEFAULT_STYLE,
                    };
                    pushHistory({
                      ...doc,
                      objects: [...doc.objects, ptV, ptA, ptB],
                    });
                  }}
                >
                  <Tag size={13} className="text-indigo-600" />
                  Auto-Label Vertices (A, B, C)
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Shape Specific Inspector ---------------- */}
          {selectedObj?.type === "shape" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 block capitalize">
                  Shape: {(selectedObj as ShapeObj).kind}
                </span>
                <span className="badge badge-slate text-[10px]">
                  {Math.round((selectedObj as ShapeObj).w)} × {Math.round((selectedObj as ShapeObj).h)}
                </span>
              </div>

              {/* Polygon sides slider */}
              {(selectedObj as ShapeObj).kind === "polygon" && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Number of Sides:</span>
                    <span className="font-bold">{(selectedObj as ShapeObj).sides}</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={12}
                    value={(selectedObj as ShapeObj).sides}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...(o as ShapeObj),
                        sides: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              )}

              {/* Star points slider */}
              {(selectedObj as ShapeObj).kind === "star" && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Star Points:</span>
                    <span className="font-bold">{(selectedObj as ShapeObj).sides}</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={10}
                    value={(selectedObj as ShapeObj).sides}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...(o as ShapeObj),
                        sides: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              )}

              {/* Rounded rect corner radius */}
              {(selectedObj as ShapeObj).kind === "roundrect" && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Corner Radius:</span>
                    <span className="font-bold">{(selectedObj as ShapeObj).radius}px</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={40}
                    value={(selectedObj as ShapeObj).radius}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...(o as ShapeObj),
                        radius: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              )}

              {/* Ring inner radius ratio */}
              {(selectedObj as ShapeObj).kind === "ring" && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Inner Hole Ratio:</span>
                    <span className="font-bold">
                      {Math.round(((selectedObj as ShapeObj).inner || 0.5) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={85}
                    value={Math.round(((selectedObj as ShapeObj).inner || 0.5) * 100)}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...(o as ShapeObj),
                        inner: Number(e.target.value) / 100,
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              )}

              {/* Sector angles */}
              {(selectedObj as ShapeObj).kind === "sector" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Start Angle:</label>
                    <input
                      type="number"
                      value={(selectedObj as ShapeObj).a0}
                      onChange={(e) =>
                        updateSelected((o) => ({
                          ...(o as ShapeObj),
                          a0: Number(e.target.value),
                        }))
                      }
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">End Angle:</label>
                    <input
                      type="number"
                      value={(selectedObj as ShapeObj).a1}
                      onChange={(e) =>
                        updateSelected((o) => ({
                          ...(o as ShapeObj),
                          a1: Number(e.target.value),
                        }))
                      }
                      className="input text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Fill Color Swatches for Shapes */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                  Region Fill Color:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FILL_SWATCHES.map((sw) => (
                    <button
                      key={sw.label}
                      type="button"
                      className={`h-6 rounded border flex items-center justify-center text-[10px] font-medium transition ${
                        selectedObj.style.fill === sw.val
                          ? "ring-2 ring-indigo-500 scale-105 border-indigo-400 font-bold"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      style={{
                        backgroundColor: sw.val || "transparent",
                      }}
                      onClick={() =>
                        updateSelected((o) => ({
                          ...o,
                          style: { ...o.style, fill: sw.val },
                        }))
                      }
                    >
                      {!sw.val ? "None" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hatch Pattern (CBSE Shaded Region Problems) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Shading / Hatch Pattern:
                </label>
                <div className="segmented w-full [&>button]:flex-1">
                  {(["none", "diagonal", "cross", "dots", "horizontal"] as const).map(
                    (h) => (
                      <button
                        key={h}
                        type="button"
                        aria-pressed={selectedObj.style.hatch === h}
                        onClick={() =>
                          updateSelected((o) => ({
                            ...o,
                            style: { ...o.style, hatch: h },
                          }))
                        }
                        title={h}
                      >
                        {h === "none"
                          ? "None"
                          : h === "diagonal"
                            ? "///"
                            : h === "cross"
                              ? "XXX"
                              : h === "dots"
                                ? ":::"
                                : "≡"}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- Line Properties Inspector ---------------- */}
          {selectedObj?.type === "line" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <span className="font-bold text-slate-900 block">Line &amp; Arrow Options</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Start Head:</label>
                  <select
                    className="input text-xs"
                    value={(selectedObj as LineObj).start}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...(o as LineObj),
                        start: e.target.value as ArrowKind,
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="filled">Filled Arrow</option>
                    <option value="open">Open Arrow</option>
                    <option value="dot">Dot</option>
                    <option value="bar">Bar |</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">End Head:</label>
                  <select
                    className="input text-xs"
                    value={(selectedObj as LineObj).end}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...(o as LineObj),
                        end: e.target.value as ArrowKind,
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="filled">Filled Arrow</option>
                    <option value="open">Open Arrow</option>
                    <option value="dot">Dot</option>
                    <option value="bar">Bar |</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Length Label:</label>
                <input
                  className="input text-xs"
                  placeholder="e.g. 5 cm, AB, r"
                  value={(selectedObj as LineObj).label || ""}
                  onChange={(e) =>
                    updateSelected((o) => ({ ...(o as LineObj), label: e.target.value }))
                  }
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm flex-1"
                  onClick={() =>
                    updateSelected((o) => ({
                      ...(o as LineObj),
                      ticks: ((o as LineObj).ticks + 1) % 4,
                    }))
                  }
                >
                  Ticks ({(selectedObj as LineObj).ticks})
                </button>
                <button
                  type="button"
                  className="btn btn-sm flex-1"
                  onClick={() =>
                    updateSelected((o) => ({
                      ...(o as LineObj),
                      parallels: ((o as LineObj).parallels + 1) % 4,
                    }))
                  }
                >
                  Parallel ({(selectedObj as LineObj).parallels})
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Point Properties Inspector ---------------- */}
          {selectedObj?.type === "point" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <span className="font-bold text-slate-900 block">Point &amp; Vertex Marker</span>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Vertex Label:</label>
                <input
                  className="input text-xs font-serif font-bold text-base"
                  value={(selectedObj as PointObj).label || ""}
                  onChange={(e) =>
                    updateSelected((o) => ({ ...(o as PointObj), label: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Dot Style:</label>
                <div className="segmented w-full [&>button]:flex-1">
                  {(["dot", "hollow", "cross"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={(selectedObj as PointObj).mode === m}
                      onClick={() =>
                        updateSelected((o) => ({ ...(o as PointObj), mode: m }))
                      }
                    >
                      {m === "dot" ? "Solid •" : m === "hollow" ? "Ring ○" : "Cross ×"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Dot Size:</span>
                  <span>{(selectedObj as PointObj).size}px</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={0.5}
                  value={(selectedObj as PointObj).size}
                  onChange={(e) =>
                    updateSelected((o) => ({
                      ...(o as PointObj),
                      size: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          )}

          {/* ---------------- Text & Formula Inspector ---------------- */}
          {selectedObj?.type === "text" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <span className="font-bold text-slate-900 block">Text &amp; Formula</span>
              <textarea
                className="input text-xs font-sans"
                rows={2}
                value={(selectedObj as TextObj).text}
                onChange={(e) =>
                  updateSelected((o) => ({ ...(o as TextObj), text: e.target.value }))
                }
              />
              <div className="flex flex-wrap gap-1">
                {MATH_SYMBOLS.slice(0, 16).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-xs font-medium hover:bg-indigo-50"
                    onClick={() =>
                      updateSelected((o) => ({
                        ...(o as TextObj),
                        text: (o as TextObj).text + sym,
                      }))
                    }
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Font Size:</label>
                  <input
                    type="number"
                    min={10}
                    max={48}
                    className="input text-xs"
                    value={(selectedObj as TextObj).size}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...(o as TextObj),
                        size: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="flex items-end gap-1">
                  <button
                    type="button"
                    className={`btn btn-sm flex-1 ${
                      (selectedObj as TextObj).bold ? "btn-primary" : ""
                    }`}
                    onClick={() =>
                      updateSelected((o) => ({
                        ...(o as TextObj),
                        bold: !(o as TextObj).bold,
                      }))
                    }
                  >
                    B
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm flex-1 ${
                      (selectedObj as TextObj).italic ? "btn-primary" : ""
                    }`}
                    onClick={() =>
                      updateSelected((o) => ({
                        ...(o as TextObj),
                        italic: !(o as TextObj).italic,
                      }))
                    }
                  >
                    I
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- Arrange & Layering Section ---------------- */}
          {selectedObj && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-900 block text-xs">
                Arrange &amp; Transform
              </span>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  className="btn btn-sm text-[11px] p-1 flex items-center justify-center gap-1"
                  onClick={bringToFront}
                  title="Bring to Front"
                >
                  <BringToFront size={13} /> Front
                </button>
                <button
                  type="button"
                  className="btn btn-sm text-[11px] p-1 flex items-center justify-center gap-1"
                  onClick={bringForward}
                  title="Bring Forward"
                >
                  +1 Up
                </button>
                <button
                  type="button"
                  className="btn btn-sm text-[11px] p-1 flex items-center justify-center gap-1"
                  onClick={sendBackward}
                  title="Send Backward"
                >
                  -1 Down
                </button>
                <button
                  type="button"
                  className="btn btn-sm text-[11px] p-1 flex items-center justify-center gap-1"
                  onClick={sendToBack}
                  title="Send to Back"
                >
                  <SendToBack size={13} /> Back
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  className="btn btn-sm text-xs flex items-center justify-center gap-1"
                  onClick={flipH}
                >
                  <FlipHorizontal size={13} /> Flip H
                </button>
                <button
                  type="button"
                  className="btn btn-sm text-xs flex items-center justify-center gap-1"
                  onClick={flipV}
                >
                  <FlipVertical size={13} /> Flip V
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Stroke & Style Section ---------------- */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <span className="font-bold text-slate-900 block text-xs">Stroke &amp; Colors</span>

            {/* Color Swatches */}
            <div className="grid grid-cols-4 gap-1.5">
              {COLOR_SWATCHES.map((sw) => (
                <button
                  key={sw.val}
                  type="button"
                  className={`h-7 rounded-lg border flex items-center justify-center transition ${
                    style.stroke === sw.val
                      ? "ring-2 ring-indigo-500 scale-105"
                      : "border-slate-300"
                  }`}
                  style={{ backgroundColor: sw.val }}
                  title={sw.label}
                  onClick={() => {
                    const newStyle = { ...style, stroke: sw.val };
                    setStyle(newStyle);
                    if (selectedObj) updateSelected((o) => ({ ...o, style: newStyle }));
                  }}
                >
                  {style.stroke === sw.val && (
                    <Check size={12} className="text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>

            {/* Thickness */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                <span>Stroke Width:</span>
                <span className="font-semibold">{style.width}px</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 6].map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`btn btn-sm flex-1 ${
                      style.width === w ? "btn-primary" : ""
                    }`}
                    onClick={() => {
                      const newStyle = { ...style, width: w };
                      setStyle(newStyle);
                      if (selectedObj) updateSelected((o) => ({ ...o, style: newStyle }));
                    }}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Dash Style */}
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">Dash Style:</label>
              <div className="segmented w-full [&>button]:flex-1">
                {(["solid", "dashed", "dotted"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={style.dash === d}
                    onClick={() => {
                      const newStyle = { ...style, dash: d };
                      setStyle(newStyle);
                      if (selectedObj) updateSelected((o) => ({ ...o, style: newStyle }));
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ---------------- Grid & Canvas Settings ---------------- */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <span className="font-bold text-slate-900 block text-xs">Canvas &amp; Grid</span>
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn btn-sm flex-1 ${
                  grid.style === "squares" ? "btn-primary" : ""
                }`}
                onClick={() =>
                  setGrid((g) => ({
                    ...g,
                    style: g.style === "squares" ? "none" : "squares",
                  }))
                }
              >
                <Grid size={13} /> Graph Grid
              </button>
              <button
                type="button"
                className={`btn btn-sm flex-1 ${grid.include ? "btn-primary" : ""}`}
                onClick={() => setGrid((g) => ({ ...g, include: !g.include }))}
                title="Include graph grid lines in printed figure"
              >
                Print Grid
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ---------------- Bottom Status Bar ---------------- */}
      <footer className="h-7 shrink-0 border-t border-slate-200 bg-white px-4 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-700">
            {activeTool === "angle"
              ? !anglePending
                ? "Angle: Step 1 - Click vertex point"
                : !anglePending.a
                  ? "Angle: Step 2 - Click end of first arm"
                  : "Angle: Step 3 - Click end of second arm (live degree displayed)"
              : activeTool === "select"
                ? "Select: Click object to edit handles & properties, or drag to reposition"
                : activeTool === "pen"
                  ? "Pen: Freehand drawing"
                  : activeTool === "highlighter"
                    ? "Highlighter: Semi-transparent marker"
                    : `Tool: ${activeTool.toUpperCase()}`}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            Canvas: {doc.w} × {doc.h} px
          </span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
      </footer>

      {/* ---------------- Shortcuts Modal ---------------- */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="font-bold text-sm text-slate-900">Figure Studio Shortcuts</h3>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-600">
              <div><kbd className="kbd">A</kbd> Angle tool</div>
              <div><kbd className="kbd">V</kbd> Select &amp; handles</div>
              <div><kbd className="kbd">L</kbd> Line tool</div>
              <div><kbd className="kbd">R</kbd> Rectangle</div>
              <div><kbd className="kbd">C</kbd> Circle</div>
              <div><kbd className="kbd">T</kbd> Text tool</div>
              <div><kbd className="kbd">P</kbd> Freehand pen</div>
              <div><kbd className="kbd">E</kbd> Eraser</div>
              <div><kbd className="kbd">H</kbd> Hand / Pan</div>
              <div><kbd className="kbd">Ctrl+D</kbd> Duplicate</div>
              <div><kbd className="kbd">Del</kbd> Delete object</div>
              <div><kbd className="kbd">Ctrl+Z</kbd> Undo / Redo</div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm w-full mt-4"
              onClick={() => setShowShortcuts(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
