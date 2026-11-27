"use client";

import { ChevronDown, Info, Plus, Search } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Spinner } from "@/components/ui";
import { libraryGroups } from "@/lib/kindergarten/library";
import type { KindergartenActivityPlugin } from "@/lib/kindergarten/types";

const SHOW_ALL_KEY = "epb:ws-library-all";

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

export function ActivityLibrary({ subject, busy, onAdd }: { subject?: string; busy: boolean; onAdd: (p: KindergartenActivityPlugin) => void }) {
  const [query, setQuery] = useState("");
  // the server has no saved choice, so it renders "off" and the browser picks up the saved one
  const showAll = useSyncExternalStore(subscribe, readShowAll, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { groups, comingSoon } = useMemo(() => libraryGroups({ subject, showAll, query }), [subject, showAll, query]);

  function toggleAll(v: boolean) {
    memoryShowAll = v;
    try {
      localStorage.setItem(SHOW_ALL_KEY, v ? "1" : "0");
    } catch {}
    listeners.forEach((l) => l());
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-bold text-slate-900 lg:pointer-events-none"
      >
        <span className="flex items-center gap-2">
          <Plus size={15} className="text-indigo-600 lg:hidden" /> Add an activity
        </span>
        {busy ? <Spinner size="sm" /> : <ChevronDown size={15} className={`transition-transform lg:hidden ${mobileOpen ? "rotate-180" : ""}`} />}
      </button>

      <div className={`${mobileOpen ? "block" : "hidden"} space-y-3 border-t border-slate-100 p-3 lg:block`}>
        <label className="relative block">
          <Search size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activities"
            aria-label="Search activities"
            className="w-full rounded-lg border border-slate-300 py-1.5 pr-2 pl-8 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
          />
        </label>

        {comingSoon && !query && (
          <p className="flex gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-900">
            <Info size={13} className="mt-px shrink-0" /> More {subject} activities are coming. These ones work well meanwhile.
          </p>
        )}

        {groups.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-slate-500">No activity matches “{query}”.</p>
        ) : (
          groups.map((g) => (
            <div key={g.category}>
              <div className="mb-1 px-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">{g.label}</div>
              <div className="space-y-1">
                {g.plugins.map((p) => (
                  <button
                    key={p.type}
                    type="button"
                    disabled={busy}
                    onClick={() => onAdd(p)}
                    title={p.description}
                    className="group flex w-full items-start gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-indigo-400 hover:bg-indigo-50/50 disabled:opacity-60"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white">
                      <Plus size={13} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{p.shortLabel}</span>
                      <span className="line-clamp-2 block text-[11px] leading-snug text-slate-500 lg:hidden 2xl:block">{p.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        {!query && (
          <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs font-semibold text-slate-600">
            Show all subjects
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
    </div>
  );
}
