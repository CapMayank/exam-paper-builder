"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { isAdmin } from "@/lib/permissions";

/** Printables are for Admins and Super Admins only (same rule as Presets). A 401 sends the user to /login. */
export function useAdminGate(): "loading" | "admin" | "forbidden" {
  const [state, setState] = useState<"loading" | "admin" | "forbidden">("loading");
  useEffect(() => {
    let cancelled = false;
    api<{ id: string; role?: string }>("/api/me").then(
      (me) => !cancelled && setState(isAdmin({ id: me.id, role: me.role ?? "" }) ? "admin" : "forbidden"),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
