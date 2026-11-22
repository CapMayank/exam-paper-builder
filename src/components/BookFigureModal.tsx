"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Camera,
  Check,
  ClipboardPaste,
  Crop,
  Eraser,
  Loader2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Smartphone,
  Undo2,
  Upload,
  Wand2,
} from "lucide-react";
import { Modal } from "./ui";
import {
  applyBookScanFilter,
  computeFitDimensions,
  detectDeskewAngle,
  MAX_DESKEW_DEGREES,
  type ScanFilterMode,
} from "@/lib/bookScanFilter";

export interface BookFigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (blob: Blob) => void | Promise<void>;
  initialFile?: File | Blob | null;
  initialImageUrl?: string | null;
  initialTab?: "qr" | "paste" | "webcam";
}

interface CropRect {
  x: number; // normalized 0..1
  y: number;
  w: number;
  h: number;
}

interface WhiteoutStroke {
  points: Array<{ x: number; y: number }>;
  radius: number;
}

type DragMode =
  | { kind: "move"; startX: number; startY: number; orig: CropRect }
  | { kind: "handle"; handle: "nw" | "ne" | "sw" | "se"; startX: number; startY: number; orig: CropRect };

const DEFAULT_CROP: CropRect = { x: 0.04, y: 0.04, w: 0.92, h: 0.92 };
const MAX_UPLOAD_BYTES = 2_900_000; // stay safely under /api/uploads 3 MB limit

async function decodeBlobToBitmap(blob: Blob): Promise<ImageBitmap> {
  if (blob.type !== "image/svg+xml") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // fall through to <img> fallback
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image decode failed"));
      el.src = url;
    });
    const w = Math.max(1, img.naturalWidth || 800);
    const h = Math.max(1, img.naturalHeight || 600);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function encodeCanvasUnderLimit(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const png = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (png && png.size <= MAX_UPLOAD_BYTES) return png;

  for (const quality of [0.9, 0.78, 0.65]) {
    const jpg = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (jpg && jpg.size <= MAX_UPLOAD_BYTES) return jpg;
  }
  return png;
}

/** Auto-straighten: the fine tilt (degrees) that levels this image once turned by `rotation`. */
function measureSkew(bitmap: ImageBitmap, rotation: number): number {
  const swapped = rotation === 90 || rotation === 270;
  const rawW = swapped ? bitmap.height : bitmap.width;
  const rawH = swapped ? bitmap.width : bitmap.height;
  const { width, height } = computeFitDimensions(rawW, rawH, 700);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  const drawW = swapped ? height : width;
  const drawH = swapped ? width : height;
  ctx.drawImage(bitmap, -drawW / 2, -drawH / 2, drawW, drawH);
  return detectDeskewAngle(ctx.getImageData(0, 0, width, height).data, width, height);
}

export function BookFigureModal(props: BookFigureModalProps) {
  if (!props.isOpen) return null;
  return <BookFigureModalInner {...props} />;
}

function BookFigureModalInner({
  onClose,
  onComplete,
  initialFile,
  initialImageUrl,
  initialTab = "qr",
}: BookFigureModalProps) {
  const [tab, setTab] = useState<"qr" | "paste" | "webcam">(initialTab);
  const [sourceBitmap, setSourceBitmap] = useState<ImageBitmap | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  // Fine tilt on top of the quarter turns, in degrees. Set by auto-straighten, then adjustable by hand.
  const [skew, setSkew] = useState(0);
  const [autoSkew, setAutoSkew] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<ScanFilterMode>("bw");
  const [clarity, setClarity] = useState<number>(0.5);
  const [crop, setCrop] = useState<CropRect>(DEFAULT_CROP);
  const [tool, setTool] = useState<"crop" | "whiteout">("crop");
  const [strokes, setStrokes] = useState<WhiteoutStroke[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  /** Turn to `rot` and level the page automatically; clears the crop and whiteout, which no longer line up. */
  const straighten = useCallback((bmp: ImageBitmap, rot: 0 | 90 | 180 | 270) => {
    const angle = measureSkew(bmp, rot);
    setRotation(rot);
    setAutoSkew(angle);
    setSkew(angle);
    setCrop(DEFAULT_CROP);
    setStrokes([]);
  }, []);

  // QR session state
  const [qrNonce, setQrNonce] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [qrStatus, setQrStatus] = useState<"loading" | "waiting" | "expired" | "error">("loading");
  const [isLocalhost] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"),
  );

  // Webcam state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState("");

  // Canvas & pointer refs for Stage 2
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<DragMode | null>(null);
  const drawingRef = useRef<WhiteoutStroke | null>(null);

  const setBitmap = useCallback((bmp: ImageBitmap | null) => {
    bitmapRef.current?.close();
    bitmapRef.current = bmp;
    setSourceBitmap(bmp);
  }, []);

  const loadBlob = useCallback(
    async (blob: Blob) => {
      setLoadError("");
      try {
        const bmp = await decodeBlobToBitmap(blob);
        setBitmap(bmp);
        straighten(bmp, 0);
        setTool("crop");
        setFilterMode("bw");
      } catch {
        setLoadError("Could not read that image. Try PNG, JPEG, or WebP.");
      }
    },
    [setBitmap, straighten],
  );

  // Load initialFile or initialImageUrl if provided
  useEffect(() => {
    let cancelled = false;
    if (initialFile) {
      decodeBlobToBitmap(initialFile)
        .then((bmp) => {
          if (cancelled) {
            bmp.close();
            return;
          }
          setBitmap(bmp);
          straighten(bmp, 0);
          setTool("crop");
          setFilterMode("bw");
        })
        .catch(() => {
          if (!cancelled) setLoadError("Could not read that image. Try PNG, JPEG, or WebP.");
        });
    } else if (initialImageUrl) {
      fetch(initialImageUrl)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to fetch image");
          return r.blob();
        })
        .then((b) => {
          if (!cancelled) void loadBlob(b);
        })
        .catch(() => {
          if (!cancelled) setLoadError("Could not load existing figure.");
        });
    }
    return () => {
      cancelled = true;
    };
  }, [initialFile, initialImageUrl, loadBlob, setBitmap, straighten]);

  // Cleanup bitmap on unmount
  useEffect(() => {
    return () => {
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, []);

  // QR session creation & polling when on QR tab in Stage 1
  useEffect(() => {
    if (sourceBitmap || tab !== "qr") return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;

    async function start() {
      try {
        const res = await fetch("/api/capture-session", { method: "POST" });
        if (!res.ok) throw new Error("Failed to create capture session");
        const { token } = (await res.json()) as { token: string };
        if (cancelled) return;
        const url = `${window.location.origin}/capture/${token}`;
        setQrUrl(url);
        const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 196 });
        if (cancelled) return;
        setQrDataUrl(dataUrl);
        setQrStatus("waiting");

        timer = setInterval(async () => {
          if (inFlight || cancelled) return;
          inFlight = true;
          try {
            const poll = await fetch(`/api/capture-session/${encodeURIComponent(token)}`);
            if (poll.status === 404 || poll.status === 410) {
              if (timer) clearInterval(timer);
              if (!cancelled) setQrStatus("expired");
              return;
            }
            if (!poll.ok) return;
            const data = (await poll.json()) as { status?: string };
            if (data.status === "ready" && !cancelled) {
              const imgRes = await fetch(`/api/capture-session/${encodeURIComponent(token)}?image=1`);
              if (imgRes.ok) {
                if (timer) clearInterval(timer);
                const blob = await imgRes.blob();
                if (!cancelled) await loadBlob(blob);
              }
            }
          } catch {
            // ignore transient poll error
          } finally {
            inFlight = false;
          }
        }, 1500);
      } catch {
        if (!cancelled) setQrStatus("error");
      }
    }
    void start();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [sourceBitmap, tab, qrNonce, loadBlob]);

  // Webcam stream lifecycle
  useEffect(() => {
    if (sourceBitmap || tab !== "webcam") {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1600 } } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        if (!cancelled) setCamError("Camera not available or permission denied.");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [sourceBitmap, tab]);

  // Paste listener inside modal Stage 1
  useEffect(() => {
    if (sourceBitmap) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        void loadBlob(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [sourceBitmap, loadBlob]);

  // Render preview canvas with whiteout strokes
  const drawPreview = useCallback(() => {
    const base = baseCanvasRef.current;
    const canvas = previewCanvasRef.current;
    if (!base || !canvas) return;
    if (canvas.width !== base.width || canvas.height !== base.height) {
      canvas.width = base.width;
      canvas.height = base.height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);

    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const allStrokes = drawingRef.current ? [...strokes, drawingRef.current] : strokes;
    for (const s of allStrokes) {
      if (s.points.length === 0) continue;
      const r = Math.max(4, s.radius * canvas.width);
      ctx.lineWidth = r * 2;
      ctx.beginPath();
      s.points.forEach((pt, idx) => {
        const px = pt.x * canvas.width;
        const py = pt.y * canvas.height;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      if (s.points.length === 1) {
        ctx.arc(s.points[0].x * canvas.width, s.points[0].y * canvas.height, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
    ctx.restore();
  }, [strokes]);

  // Build filtered base canvas whenever bitmap, rotation, tilt, filterMode, or clarity changes
  useEffect(() => {
    if (!sourceBitmap) return;
    const swapped = rotation === 90 || rotation === 270;
    const rawW = swapped ? sourceBitmap.height : sourceBitmap.width;
    const rawH = swapped ? sourceBitmap.width : sourceBitmap.height;
    const fit = computeFitDimensions(rawW, rawH, 1400);
    // Grow the canvas to hold the tilted image so no corner is cut off.
    const rad = (skew * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const width = Math.round(fit.width * cos + fit.height * sin);
    const height = Math.round(fit.width * sin + fit.height * cos);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill white first so transparent PNGs/SVGs (and the corners a tilt uncovers) don't read as black ink
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(((rotation + skew) * Math.PI) / 180);
    const drawW = swapped ? fit.height : fit.width;
    const drawH = swapped ? fit.width : fit.height;
    ctx.drawImage(sourceBitmap, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    if (filterMode !== "original") {
      const imgData = ctx.getImageData(0, 0, width, height);
      const filtered = applyBookScanFilter(imgData.data, width, height, filterMode, clarity);
      imgData.data.set(filtered);
      ctx.putImageData(imgData, 0, 0);
    }

    baseCanvasRef.current = canvas;
    drawPreview();
  }, [sourceBitmap, rotation, skew, filterMode, clarity, drawPreview]);

  function getNormPoint(e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }

  function onOverlayPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const pt = getNormPoint(e);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "whiteout") {
      drawingRef.current = { points: [pt], radius: 0.025 };
      drawPreview();
      return;
    }

    const handleAttr = (e.target as HTMLElement).dataset.handle as "nw" | "ne" | "sw" | "se" | undefined;
    if (handleAttr) {
      dragRef.current = { kind: "handle", handle: handleAttr, startX: pt.x, startY: pt.y, orig: { ...crop } };
      return;
    }
    if (pt.x >= crop.x && pt.x <= crop.x + crop.w && pt.y >= crop.y && pt.y <= crop.y + crop.h) {
      dragRef.current = { kind: "move", startX: pt.x, startY: pt.y, orig: { ...crop } };
    }
  }

  function onOverlayPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const pt = getNormPoint(e);
    if (tool === "whiteout" && drawingRef.current) {
      drawingRef.current.points.push(pt);
      drawPreview();
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const dx = pt.x - drag.startX;
    const dy = pt.y - drag.startY;
    const minSize = 0.08;

    if (drag.kind === "move") {
      setCrop({
        x: Math.max(0, Math.min(1 - drag.orig.w, drag.orig.x + dx)),
        y: Math.max(0, Math.min(1 - drag.orig.h, drag.orig.y + dy)),
        w: drag.orig.w,
        h: drag.orig.h,
      });
      return;
    }

    const { x, y, w, h } = drag.orig;
    let nx = x,
      ny = y,
      nw = w,
      nh = h;
    if (drag.handle.includes("w")) {
      const right = x + w;
      nx = Math.max(0, Math.min(right - minSize, x + dx));
      nw = right - nx;
    }
    if (drag.handle.includes("e")) {
      nw = Math.max(minSize, Math.min(1 - x, w + dx));
    }
    if (drag.handle.includes("n")) {
      const bottom = y + h;
      ny = Math.max(0, Math.min(bottom - minSize, y + dy));
      nh = bottom - ny;
    }
    if (drag.handle.includes("s")) {
      nh = Math.max(minSize, Math.min(1 - y, h + dy));
    }
    setCrop({ x: nx, y: ny, w: nw, h: nh });
  }

  function onOverlayPointerUp() {
    if (tool === "whiteout" && drawingRef.current) {
      const finished = drawingRef.current;
      drawingRef.current = null;
      setStrokes((prev) => [...prev, finished]);
    }
    dragRef.current = null;
  }

  async function handleCaptureWebcam() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d")?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
    if (blob) await loadBlob(blob);
  }

  async function handleUseFigure() {
    const preview = previewCanvasRef.current;
    if (!preview) return;
    setSaving(true);
    setLoadError("");
    try {
      const sx = Math.round(crop.x * preview.width);
      const sy = Math.round(crop.y * preview.height);
      const sw = Math.max(1, Math.round(crop.w * preview.width));
      const sh = Math.max(1, Math.round(crop.h * preview.height));
      const { width, height } = computeFitDimensions(sw, sh, 1600);

      const out = document.createElement("canvas");
      out.width = width;
      out.height = height;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(preview, sx, sy, sw, sh, 0, 0, width, height);

      const blob = await encodeCanvasUnderLimit(out);
      if (!blob) throw new Error("Failed to encode cropped figure.");
      await onComplete(blob);
      onClose();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not attach figure. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={sourceBitmap ? "Crop & Clean Book Figure" : "Scan Figure from Book"}
      subtitle={
        sourceBitmap
          ? "Drag the crop box around just the diagram, erase any stray text, and choose Book Scan (B&W)."
          : "Send a photo from your phone, paste a screenshot (Ctrl+V), upload a file, or use your webcam."
      }
      onClose={onClose}
    >
      {!sourceBitmap ? (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setLoadError("");
                setQrStatus("loading");
                setTab("qr");
              }}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                tab === "qr" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Smartphone size={14} /> Phone QR Snap
            </button>
            <button
              type="button"
              onClick={() => {
                setLoadError("");
                setTab("paste");
              }}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                tab === "paste" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClipboardPaste size={14} /> Paste / Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setLoadError("");
                setCamError("");
                setTab("webcam");
              }}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                tab === "webcam" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Camera size={14} /> Webcam
            </button>
          </div>

          {loadError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{loadError}</p>}

          {tab === "qr" && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-center">
              {qrStatus === "loading" && (
                <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
                  <Loader2 className="size-6 animate-spin text-indigo-600" />
                  <span className="text-xs">Generating QR code…</span>
                </div>
              )}
              {qrStatus === "error" && (
                <p className="text-xs text-rose-600">Could not start phone capture session. Try Paste / Upload instead.</p>
              )}
              {qrStatus === "expired" && (
                <div className="space-y-2 py-4">
                  <p className="text-xs font-medium text-amber-800">This QR code expired.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQrStatus("loading");
                      setQrNonce((n) => n + 1);
                    }}
                    className="btn btn-sm"
                  >
                    <RefreshCw size={13} /> Generate New QR
                  </button>
                </div>
              )}
              {qrStatus === "waiting" && qrDataUrl && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Phone capture QR code" className="size-48" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">Scan with your phone camera</p>
                    <p className="text-xs text-slate-500">
                      Snap the diagram on your phone—it will appear here automatically.
                    </p>
                  </div>
                  {isLocalhost && (
                    <p className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
                      Tip: You are on <code>localhost</code>. For your phone to connect over Wi-Fi, open this app using your laptop&rsquo;s LAN IP address instead of <code>localhost</code>.
                    </p>
                  )}
                  <a href={qrUrl} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 underline">
                    Open capture link
                  </a>
                </>
              )}
            </div>
          )}

          {tab === "paste" && (
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) void loadBlob(f);
              }}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30"
            >
              <Upload className="size-7 text-indigo-600" />
              <p className="text-sm font-semibold text-slate-800">Press Ctrl+V, drop an image, or click to browse</p>
              <p className="text-xs text-slate-500">PNG, JPEG, or WebP — you&rsquo;ll crop and clean it up next.</p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void loadBlob(f);
                }}
              />
            </label>
          )}

          {tab === "webcam" && (
            <div className="space-y-3">
              {camError ? (
                <p className="rounded-lg bg-rose-50 px-3 py-4 text-center text-xs text-rose-700">{camError}</p>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="max-h-72 w-full rounded-xl bg-black object-contain" />
                  <div className="flex justify-end">
                    <button type="button" onClick={handleCaptureWebcam} className="btn btn-primary btn-sm">
                      <Camera size={14} /> Capture Frame
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {loadError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{loadError}</p>}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTool("crop")}
                className={`btn btn-sm ${tool === "crop" ? "btn-primary" : ""}`}
              >
                <Crop size={13} /> Crop
              </button>
              <button
                type="button"
                onClick={() => setTool("whiteout")}
                className={`btn btn-sm ${tool === "whiteout" ? "btn-primary" : ""}`}
                title="Erase stray text or marks inside the crop box"
              >
                <Eraser size={13} /> Whiteout
              </button>
              {strokes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStrokes((prev) => prev.slice(0, -1))}
                  className="btn btn-sm"
                  title="Undo last whiteout stroke"
                >
                  <Undo2 size={13} /> Undo
                </button>
              )}
              <button
                type="button"
                onClick={() => straighten(sourceBitmap, ((rotation + 270) % 360) as 0 | 90 | 180 | 270)}
                className="btn btn-sm"
                title="Rotate left 90°"
              >
                <RotateCcw size={13} />
              </button>
              <button
                type="button"
                onClick={() => straighten(sourceBitmap, ((rotation + 90) % 360) as 0 | 90 | 180 | 270)}
                className="btn btn-sm"
                title="Rotate right 90°"
              >
                <RotateCw size={13} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["bw", "Book Scan (B&W)"],
                  ["grayscale", "Grayscale"],
                  ["original", "Original"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFilterMode(m)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    filterMode === m ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Straighten:</span>
              <input
                type="range"
                min={-MAX_DESKEW_DEGREES}
                max={MAX_DESKEW_DEGREES}
                step={0.1}
                value={skew}
                aria-label="Straighten angle"
                onChange={(e) => {
                  setSkew(Number(e.target.value));
                  setCrop(DEFAULT_CROP);
                  setStrokes([]);
                }}
                className="w-40 accent-indigo-600"
              />
              <span className="w-11 tabular-nums">
                {skew > 0 ? "+" : ""}
                {skew.toFixed(1)}°
              </span>
              <button
                type="button"
                onClick={() => straighten(sourceBitmap, rotation)}
                className="btn btn-sm"
                title="Level the page automatically from its text lines"
              >
                <Wand2 size={13} /> Auto
              </button>
              {skew !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSkew(0);
                    setCrop(DEFAULT_CROP);
                    setStrokes([]);
                  }}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:underline"
                >
                  Reset
                </button>
              )}
              {autoSkew !== null && autoSkew !== 0 && skew === autoSkew && (
                <span className="text-[11px] text-emerald-700">Auto-straightened</span>
              )}
            </div>
            {filterMode !== "original" && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Ink Clarity:</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(clarity * 100)}
                  onChange={(e) => setClarity(Number(e.target.value) / 100)}
                  className="w-44 accent-indigo-600"
                />
              </div>
            )}
          </div>

          {/* Canvas + Interactive Crop Overlay */}
          <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-100 p-2">
            <div
              className={`relative inline-block overflow-hidden select-none touch-none ${tool === "whiteout" ? "cursor-crosshair" : "cursor-default"}`}
              onPointerDown={onOverlayPointerDown}
              onPointerMove={onOverlayPointerMove}
              onPointerUp={onOverlayPointerUp}
              onPointerCancel={onOverlayPointerUp}
            >
              <canvas ref={previewCanvasRef} className="block max-h-[52vh] max-w-full rounded bg-white shadow-xs" />

              <div
                className={`absolute border-2 ${tool === "crop" ? "border-indigo-500 cursor-move" : "pointer-events-none border-indigo-400/70"}`}
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                  boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.45)",
                }}
              >
                {tool === "crop" &&
                  (["nw", "ne", "sw", "se"] as const).map((h) => (
                    <span
                      key={h}
                      data-handle={h}
                      className={`absolute size-3.5 rounded-sm border border-white bg-indigo-600 shadow ${
                        h === "nw"
                          ? "-left-1.5 -top-1.5 cursor-nwse-resize"
                          : h === "ne"
                            ? "-right-1.5 -top-1.5 cursor-nesw-resize"
                            : h === "sw"
                              ? "-left-1.5 -bottom-1.5 cursor-nesw-resize"
                              : "-right-1.5 -bottom-1.5 cursor-nwse-resize"
                      }`}
                    />
                  ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setLoadError("");
                setQrStatus("loading");
                setBitmap(null);
              }}
              className="btn btn-sm"
            >
              Choose different image
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn btn-sm">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={handleUseFigure} className="btn btn-primary btn-sm">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Use Figure
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
