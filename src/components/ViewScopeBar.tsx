"use client";

import { Archive } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_VIEW_SCOPE,
  parseViewScope,
  serializeViewScope,
  type ViewScope,
} from "@/lib/schoolProfile";

const COOKIE = "epb_view";

function readScope(): ViewScope {
  if (typeof document === "undefined") return DEFAULT_VIEW_SCOPE;
  return parseViewScope(document.cookie);
}

/** The "show other subjects" switch. The server reads the same cookie to filter lists. */
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

/** Admin only: reveal subjects outside the school's required set. Renders nothing for teachers. */
export function ViewScopeBar({ role }: { role?: string }) {
  const [scope, setScope] = useViewScope();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={scope.showOther}
      onClick={() => setScope({ showOther: !scope.showOther })}
      title="Also list subjects outside the school's required set (kept for reference, not part of the teacher workflow)"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
        scope.showOther
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Archive size={13} />
      {scope.showOther ? "Showing other subjects" : "Other subjects hidden"}
    </button>
  );
}
