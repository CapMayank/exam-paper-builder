"use client";

import { Archive, FlaskConical } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_VIEW_SCOPE,
  parseViewScope,
  serializeViewScope,
  STREAMS,
  type Stream,
  type ViewScope,
} from "@/lib/schoolProfile";

const COOKIE = "epb_view";

function readScope(): ViewScope {
  if (typeof document === "undefined") return DEFAULT_VIEW_SCOPE;
  return parseViewScope(document.cookie);
}

/** The teacher's current view (stream and archive switch). The server reads the same cookie to filter lists. */
export function useViewScope(): [ViewScope, (next: Partial<ViewScope>) => void] {
  const [scope, setScopeState] = useState<ViewScope>(DEFAULT_VIEW_SCOPE);
  useEffect(() => {
    setScopeState(readScope());
  }, []);
  const setScope = useCallback((next: Partial<ViewScope>) => {
    const merged = { ...readScope(), ...next };
    document.cookie = `${COOKIE}=${serializeViewScope(merged)}; path=/; max-age=31536000; samesite=lax`;
    setScopeState(merged);
    // every list is filtered on the server, so reload to pick up the new view
    window.location.reload();
  }, []);
  return [scope, setScope];
}

export function ViewScopeBar({ role, compact = false }: { role?: string; compact?: boolean }) {
  const [scope, setScope] = useViewScope();
  const canSeeOthers = role === "ADMIN" || role === "HOD";
  if (compact) return null;
  return (
    <div className="rounded-xl border border-indigo-700/60 bg-indigo-950/40 p-2 text-[11px] text-indigo-100" aria-label="Subject view">
      <div className="mb-1 flex items-center gap-1.5 font-semibold text-indigo-200">
        <FlaskConical size={12} /> Class 11–12 stream
      </div>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Stream">
        {([{ code: "ALL", label: "All" }, ...STREAMS] as Array<{ code: Stream | "ALL"; label: string }>).map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => setScope({ stream: s.code })}
            aria-pressed={scope.stream === s.code}
            title={s.code === "ALL" ? "Show every required subject" : s.label}
            className={`rounded-lg px-1.5 py-1 font-semibold transition ${
              scope.stream === s.code ? "bg-amber-300 text-indigo-950" : "bg-white/5 text-indigo-100 hover:bg-white/10"
            }`}
          >
            {s.code === "ALL" ? "All" : s.code}
          </button>
        ))}
      </div>
      {canSeeOthers && (
        <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-indigo-200/90">
          <input
            type="checkbox"
            checked={scope.showOther}
            onChange={(e) => setScope({ showOther: e.target.checked })}
          />
          <Archive size={12} /> Show other subjects
        </label>
      )}
    </div>
  );
}
