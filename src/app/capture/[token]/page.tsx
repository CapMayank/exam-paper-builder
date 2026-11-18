"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Camera, CheckCircle2, ImagePlus, Loader2, AlertTriangle } from "lucide-react";
import { computeFitDimensions } from "@/lib/bookScanFilter";

type Stage = "checking" | "ready" | "uploading" | "sent" | "expired" | "error";

async function downscaleToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = computeFitDimensions(bitmap.width, bitmap.height, 1800);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
      "image/jpeg",
      0.88,
    );
  });
}

export default function MobileCapturePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [stage, setStage] = useState<Stage>("checking");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!token) {
        setStage("expired");
        return;
      }
      try {
        const res = await fetch(`/api/capture-session/${encodeURIComponent(token)}`);
        if (cancelled) return;
        if (!res.ok) {
          setStage("expired");
          return;
        }
        const data = (await res.json()) as { status?: string };
        setStage(data.status === "pending" ? "ready" : "expired");
      } catch {
        if (!cancelled) setStage("expired");
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setStage("uploading");
    setErrorMsg("");
    try {
      const compressed = await downscaleToJpeg(file);
      const fd = new FormData();
      fd.append("file", new File([compressed], "book-capture.jpg", { type: "image/jpeg" }));
      const res = await fetch(`/api/capture-session/${encodeURIComponent(token)}`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 410 || res.status === 404) {
          setStage("expired");
          return;
        }
        throw new Error(body.error || "Upload failed");
      }
      setStage("sent");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not send photo");
      setStage("error");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Send Book Figure to Laptop</h1>
        <p className="mt-1 text-xs text-slate-500">
          Snap the diagram from your book. You can crop and clean it up on your laptop next.
        </p>

        <div className="mt-6">
          {stage === "checking" && (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
              <Loader2 className="size-7 animate-spin text-indigo-600" />
              <span className="text-sm">Connecting to laptop session…</span>
            </div>
          )}

          {stage === "uploading" && (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-600">
              <Loader2 className="size-8 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Sending photo to laptop…</span>
            </div>
          )}

          {stage === "sent" && (
            <div className="flex flex-col items-center gap-2 py-6 text-emerald-700">
              <CheckCircle2 className="size-10 text-emerald-600" />
              <p className="text-base font-semibold">Sent to your laptop!</p>
              <p className="text-xs text-slate-500">You can close this tab now.</p>
            </div>
          )}

          {stage === "expired" && (
            <div className="flex flex-col items-center gap-2 py-6 text-amber-700">
              <AlertTriangle className="size-9 text-amber-500" />
              <p className="text-sm font-semibold">This capture link has expired or was already used.</p>
              <p className="text-xs text-slate-500">Click &ldquo;Scan from book&rdquo; on your laptop to generate a fresh QR code.</p>
            </div>
          )}

          {(stage === "ready" || stage === "error") && (
            <div className="space-y-3">
              {stage === "error" && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {errorMsg}
                </p>
              )}
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm active:bg-indigo-700">
                <Camera className="size-5" />
                Take Photo of Book
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    void handleFile(f);
                  }}
                />
              </label>

              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50">
                <ImagePlus className="size-4" />
                Choose from Gallery
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    void handleFile(f);
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
