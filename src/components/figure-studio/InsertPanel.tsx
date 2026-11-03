"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, LayoutTemplate, Search, Shapes, Sparkles, X } from "lucide-react";
import { STAMP_CATEGORIES, STAMP_REGISTRY, type StampDef } from "./stamps";
import { TEMPLATES, type TemplateDef } from "./templates";
import { DEFAULT_STYLE } from "./types";

export type InsertTab = "templates" | "symbols" | "ai";

const TEMPLATE_GROUPS: { id: TemplateDef["category"]; label: string }[] = [
  { id: "geometry", label: "Geometry" },
  { id: "mensuration", label: "Mensuration" },
  { id: "graphs", label: "Graphs" },
  { id: "science", label: "Science" },
];

const AI_EXAMPLES = [
  "Right-angled triangle ABC right angled at B, base BC = 8 cm, altitude AB = 6 cm, with an angle mark θ at vertex A",
  "Circle with center O, diameter AB, radius 5 cm, and tangent line touching at point T",
  "Circuit diagram for verification of Ohm's Law with resistor R, voltmeter in parallel, ammeter in series, rheostat, plug key, and battery",
];

/** Draws one symbol into a small canvas so the picker shows what will be placed. */
function StampThumb({ stamp }: { stamp: StampDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0f172a";
    ctx.fillStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    try {
      stamp.draw(ctx, { x: 6, y: 5, w: 60, h: 40 }, { ...DEFAULT_STYLE, width: 1.5 });
    } catch {
      /* a thumbnail failing must not break the picker */
    }
  }, [stamp]);
  return <canvas ref={ref} width={144} height={100} className="h-[50px] w-[72px]" aria-hidden />;
}

export function InsertPanel({
  tab,
  onTab,
  onClose,
  onTemplate,
  onStamp,
  onImage,
  ai,
}: {
  tab: InsertTab;
  onTab: (t: InsertTab) => void;
  onClose: () => void;
  onTemplate: (t: TemplateDef) => void;
  onStamp: (id: string) => void;
  onImage: () => void;
  ai: {
    text: string;
    setText: (s: string) => void;
    busy: boolean;
    error: string | null;
    generate: () => void;
  };
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const aiRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (tab === "symbols") searchRef.current?.focus();
    if (tab === "ai") aiRef.current?.focus();
  }, [tab]);

  const stamps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(STAMP_REGISTRY).filter((s) => !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [query]);

  const tabs: { id: InsertTab; label: string; icon: React.ReactNode }[] = [
    { id: "templates", label: "Ready figures", icon: <LayoutTemplate size={14} /> },
    { id: "symbols", label: "Symbols", icon: <Shapes size={14} /> },
    { id: "ai", label: "Describe it", icon: <Sparkles size={14} /> },
  ];

  return (
    <div
      role="dialog"
      aria-label="Insert"
      className="absolute left-0 top-full z-50 mt-2 flex max-h-[min(36rem,calc(100vh-7rem))] w-[min(30rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-center gap-1 border-b border-slate-200 px-2 pt-2">
        <div role="tablist" className="flex flex-1 gap-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                tab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => onTab(t.id)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" aria-label="Close" className="mb-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose}>
          <X size={15} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "templates" && (
          <div className="space-y-3 p-3">
            {TEMPLATE_GROUPS.map((g) => {
              const items = TEMPLATES.filter((t) => t.category === g.id);
              if (!items.length) return null;
              return (
                <div key={g.id}>
                  <h3 className="mb-1 px-1 text-xs font-semibold text-slate-500">{g.label}</h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="rounded-lg border border-slate-200 p-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/60"
                        onClick={() => onTemplate(t)}
                      >
                        <span className="block text-[13px] font-semibold text-slate-900">{t.name}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-500">{t.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 p-2.5 text-left text-[13px] text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/60"
              onClick={onImage}
            >
              <ImageIcon size={16} className="text-slate-500" />
              <span>
                <span className="font-semibold">Upload a picture</span>
                <span className="block text-xs text-slate-500">or paste one anywhere with Ctrl+V</span>
              </span>
            </button>
          </div>
        )}

        {tab === "symbols" && (
          <div className="p-3">
            <label className="relative mb-3 block">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                className="input !py-1.5 !pl-8 text-[13px]"
                placeholder="Search: beaker, lens, battery, cone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {stamps.length === 0 && <p className="py-6 text-center text-[13px] text-slate-500">No symbol called “{query}”. Try a shorter word.</p>}
            {STAMP_CATEGORIES.map((cat) => {
              const items = stamps.filter((s) => s.category === cat.id);
              if (!items.length) return null;
              return (
                <div key={cat.id} className="mb-3">
                  <h3 className="mb-1 px-1 text-xs font-semibold text-slate-500">{cat.label}</h3>
                  <div className="grid grid-cols-4 gap-1">
                    {items.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        title={s.name}
                        className="flex flex-col items-center gap-0.5 rounded-lg border border-transparent p-1 text-center transition-colors hover:border-indigo-200 hover:bg-indigo-50/60"
                        onClick={() => onStamp(s.id)}
                      >
                        <StampThumb stamp={s} />
                        <span className="line-clamp-2 text-[11px] leading-tight text-slate-700">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "ai" && (
          <div className="space-y-2.5 p-3">
            <p className="text-[13px] text-slate-600">
              Describe the figure with its labels and measurements. It is drawn on the page as normal objects you can edit.
            </p>
            <textarea
              ref={aiRef}
              rows={4}
              className="input text-[13px]"
              aria-label="Describe the figure"
              placeholder="Right-angled triangle ABC right angled at B, BC = 8 cm, AB = 6 cm, angle θ marked at A"
              value={ai.text}
              onChange={(e) => ai.setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  ai.generate();
                }
              }}
            />
            <div>
              <span className="mb-1 block text-xs text-slate-500">Examples</span>
              <div className="space-y-1">
                {AI_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className="block w-full truncate rounded-md px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    title={ex}
                    onClick={() => ai.setText(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            {ai.error && <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{ai.error}</div>}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">Ctrl+Enter</span>
              <button type="button" disabled={ai.busy || !ai.text.trim()} onClick={ai.generate} className="btn btn-sm btn-primary">
                <Sparkles size={14} />
                {ai.busy ? "Drawing…" : "Draw it"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
