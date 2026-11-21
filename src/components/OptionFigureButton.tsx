"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { imageUrl, uploadImage } from "@/lib/client";

/**
 * The picture of one choice option: a small thumbnail with a remove button, or a button to upload one.
 * Uses the same upload as a question's own figure (the file lands in data/uploads).
 */
export function OptionFigureButton({
  figure,
  label,
  onChange,
  onError,
}: {
  figure: string | null;
  label: string;
  onChange: (figure: string | null) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        aria-label={`Picture for option ${label}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      {figure ? (
        <span className="relative inline-flex shrink-0">
          <button
            type="button"
            className="rounded border border-slate-200 bg-white p-0.5"
            title={`Replace the picture of option ${label}`}
            onClick={() => inputRef.current?.click()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(figure)} alt={`Option ${label} picture`} className="h-10 w-14 object-contain" />
          </button>
          <button
            type="button"
            className="absolute -right-1.5 -top-1.5 rounded-full border border-slate-200 bg-white p-0.5 text-slate-500 shadow-2xs hover:text-red-600"
            aria-label={`Remove the picture of option ${label}`}
            onClick={() => onChange(null)}
          >
            <X size={11} />
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-700 disabled:opacity-40"
          title={`Use a picture for option ${label}`}
          aria-label={`Add a picture to option ${label}`}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus size={16} />
        </button>
      )}
    </>
  );
}
