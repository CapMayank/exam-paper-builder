"use client";

import {
  Calculator,
  CheckSquare,
  CircleDot,
  GitMerge,
  Grid3x3,
  Hash,
  Image,
  ListChecks,
  Palette,
  PenTool,
  Pencil,
  Plus,
  Scale,
  Search,
  Shapes,
  Tag,
  TrendingUp,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Spinner } from "@/components/ui";
import { libraryGroups } from "@/lib/kindergarten/library";
import type { AnyActivityPlugin } from "@/lib/kindergarten/types";

const SHOW_ALL_KEY = "epb:ws-library-all";

const ICONS: Record<string, LucideIcon> = {
  Calculator,
  CheckSquare,
  CircleDot,
  GitMerge,
  Grid: Grid3x3,
  Hash,
  Image,
  ListChecks,
  Palette,
  PenTool,
  Pencil,
  Scale,
  Shapes,
  Tag,
  TrendingUp,
  Type,
};

/** A soft colour per category, so a teacher can tell maths from Hindi at a glance. */
const TONES: Record<string, string> = {
  english: "bg-sky-100 text-sky-700",
  math: "bg-amber-100 text-amber-700",
  hindi: "bg-rose-100 text-rose-700",
  evs: "bg-emerald-100 text-emerald-700",
  general: "bg-violet-100 text-violet-700",
};

const listeners = new Set<() => void>();
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

let memoryShowAll = false; // used when the browser blocks storage

function readShowAll(): boolean {
  try {
    const saved = localStorage.getItem(SHOW_ALL_KEY);
    return saved === null ? memoryShowAll : saved === "1";
  } catch {
    return memoryShowAll;
  }
}

/** The activity picker, as a panel that slides over the left side of the studio. Picking one adds it and closes. */
export function ActivityLibrary({
  subject,
  busy,
  onAdd,
  onClose,
}: {
  subject?: string;
  busy: boolean;
  onAdd: (p: AnyActivityPlugin) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  // the server has no saved choice, so it renders "off" and the browser picks up the saved one
  const showAll = useSyncExternalStore(subscribe, readShowAll, () => false);
  const groups = useMemo(() => libraryGroups({ subject, showAll, query }), [subject, showAll, query]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    searchRef.current?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  function toggleAll(v: boolean) {
    memoryShowAll = v;
    try {
      localStorage.setItem(SHOW_ALL_KEY, v ? "1" : "0");
    } catch {}
    listeners.forEach((l) => l());
  }

  return (
    <div className="no-print fixed inset-0 z-40">
      <button type="button" aria-label="Close activity library" tabIndex={-1} className="anim-fade absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add an activity"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        className="anim-slide-left relative flex h-full w-[32rem] max-w-full flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add an activity</h2>
            <p className="text-xs text-slate-500">It goes at the end of the page. You can drag it anywhere after.</p>
          </div>
          {busy ? (
            <Spinner size="sm" />
          ) : (
            <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="space-y-3 border-b border-slate-100 px-5 py-3">
          <label className="relative block">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search – e.g. trace, count, match"
              aria-label="Search activities"
              className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
            />
          </label>
          {!query && (
            <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-slate-600">
              Show activities from all subjects
              <button
                type="button"
                role="switch"
                aria-label="Show all subjects"
                aria-checked={showAll}
                onClick={() => toggleAll(!showAll)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition ${showAll ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${showAll ? "left-4.5" : "left-0.5"}`} />
              </button>
            </label>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {groups.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No activity matches “{query}”.</p>
          ) : (
            groups.map((g) => (
              <section key={g.category} aria-label={g.label}>
                <h3 className="mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">{g.label}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.plugins.map((p) => {
                    const Icon = ICONS[p.iconName] ?? Shapes;
                    return (
                      <button
                        key={p.type}
                        type="button"
                        disabled={busy}
                        onClick={() => onAdd(p)}
                        className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-px hover:border-indigo-400 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none disabled:opacity-60"
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[p.category] ?? TONES.general}`}>
                          <Icon size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-1 text-sm font-semibold text-slate-900">
                            {p.shortLabel}
                            <Plus size={15} className="shrink-0 text-indigo-500 opacity-0 transition group-hover:opacity-100" />
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-slate-500">{p.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
