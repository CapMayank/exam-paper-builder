"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { canManageExams, isAdmin } from "@/lib/permissions";

export type ExamsGate = { state: "loading" | "allowed" | "forbidden"; isAdmin: boolean; userId: string | null };

/** Exams are for Admins, Super Admins and Exam Cell. A 401 sends the user to /login. */
export function useExamsGate(): ExamsGate {
  const [gate, setGate] = useState<ExamsGate>({ state: "loading", isAdmin: false, userId: null });
  useEffect(() => {
    let cancelled = false;
    api<{ id: string; role?: string }>("/api/me").then(
      (me) => {
        if (cancelled) return;
        const actor = { id: me.id, role: me.role ?? "" };
        setGate({ state: canManageExams(actor) ? "allowed" : "forbidden", isAdmin: isAdmin(actor), userId: me.id });
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return gate;
}
