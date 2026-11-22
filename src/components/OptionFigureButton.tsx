"use client";

import { Crop, ImagePlus, Library, Loader2, PencilRuler, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { imageUrl, uploadImage } from "@/lib/client";
import { BookFigureModal } from "./BookFigureModal";
import { DiagramSearchModal } from "./DiagramSearchModal";
import { FigureStudio } from "./figure-studio";

/**
 * The picture of one choice option: a small thumbnail with a remove button, or a button to add one.
 * Either opens a menu with the same sources as a question's own figure: scan from a book, pick from the
 * diagram library, upload a file, or draw one (and, once set, crop/clean or edit it).
 * Every source ends in the same upload as a question's figure (the file lands in data/uploads).
 */
export function OptionFigureButton({
  figure,
  label,
  onChange,
  onError,
  subject,
  chapterTitle,
  questionText,
}: {
  figure: string | null;
  label: string;
  onChange: (figure: string | null) => void;
  onError: (message: string) => void;
  /** Help the library search start on the right topic. */
  subject?: string;
  chapterTitle?: string;
  questionText?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLSpanElement>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState<null | "scan" | "clean" | "library" | "draw">(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function upload(file: Blob) {
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function choose(next: typeof open) {
    setMenuOpen(false);
    setOpen(next);
  }

  const item =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800";

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
      <span ref={menuRef} className="relative inline-flex shrink-0">
        {figure ? (
          <>
            <button
              type="button"
              className="rounded border border-slate-200 bg-white p-0.5 hover:border-indigo-300"
              title={`Change the picture of option ${label}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {busy ? (
                <span className="flex h-10 w-14 items-center justify-center">
                  <Loader2 size={14} className="animate-spin text-indigo-600" />
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(figure)} alt={`Option ${label} picture`} className="h-10 w-14 object-contain" />
              )}
            </button>
            <button
              type="button"
              className="absolute -right-1.5 -top-1.5 rounded-full border border-slate-200 bg-white p-0.5 text-slate-500 shadow-2xs hover:text-red-600"
              aria-label={`Remove the picture of option ${label}`}
              onClick={() => onChange(null)}
            >
              <X size={11} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-700 disabled:opacity-40"
            title={`Use a picture for option ${label}`}
            aria-label={`Add a picture to option ${label}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={busy}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          </button>
        )}

        {menuOpen && (
          <span
            role="menu"
            className="absolute left-0 top-full z-30 mt-1 flex w-44 flex-col rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          >
            {figure && (
              <button type="button" role="menuitem" className={item} onClick={() => choose("clean")}>
                <Crop size={14} aria-hidden /> Crop / Clean
              </button>
            )}
            <button type="button" role="menuitem" className={item} onClick={() => choose("scan")}>
              <ScanLine size={14} aria-hidden /> Scan from book
            </button>
            <button type="button" role="menuitem" className={item} onClick={() => choose("library")}>
              <Library size={14} aria-hidden /> From library
            </button>
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                setMenuOpen(false);
                inputRef.current?.click();
              }}
            >
              <ImagePlus size={14} aria-hidden /> Upload
            </button>
            <button type="button" role="menuitem" className={item} onClick={() => choose("draw")}>
              <PencilRuler size={14} aria-hidden /> {figure ? "Edit" : "Draw"}
            </button>
            {figure && (
              <button
                type="button"
                role="menuitem"
                className={`${item} text-red-700 hover:bg-red-50 hover:text-red-800`}
                onClick={() => {
                  setMenuOpen(false);
                  onChange(null);
                }}
              >
                <X size={14} aria-hidden /> Remove
              </button>
            )}
          </span>
        )}
      </span>

      <BookFigureModal
        isOpen={open === "scan" || open === "clean"}
        initialTab="qr"
        initialImageUrl={open === "clean" && figure ? imageUrl(figure) : null}
        onClose={() => setOpen(null)}
        onComplete={async (blob) => {
          // The modal shows its own error if this throws, so let it.
          onChange(await uploadImage(blob));
        }}
      />

      {open === "library" && (
        <DiagramSearchModal
          isOpen={true}
          subject={subject || ""}
          chapterTitle={chapterTitle || ""}
          questionText={questionText || ""}
          onClose={() => setOpen(null)}
          onSelectDiagram={({ imagePath }) => onChange(imagePath)}
          onOpenInStudio={() => setOpen("draw")}
        />
      )}

      {open === "draw" && (
        <FigureStudio
          initialImageUrl={figure ? imageUrl(figure) : null}
          onCancel={() => setOpen(null)}
          onDone={async (png) => {
            setOpen(null);
            await upload(png);
          }}
        />
      )}
    </>
  );
}
