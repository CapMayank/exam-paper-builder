"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { ACADEMIC_SESSIONS, DEFAULT_ACADEMIC_SESSION } from "./constants";

export const SESSION_STORAGE_KEY = "epb:activeAcademicSession";
export const CUSTOM_SESSIONS_STORAGE_KEY = "epb:customAcademicSessions";

export function normalizeSession(session?: string | null): string {
  if (!session || !session.trim()) return DEFAULT_ACADEMIC_SESSION;
  return session.trim().replace(/-/g, "–");
}

export interface AcademicSessionContextType {
  currentSession: string;
  setSession: (session: string) => void;
  availableSessions: string[];
  addCustomSession: (newSession: string) => void;
  isCustomSession: (session: string) => boolean;
}

const AcademicSessionContext = createContext<AcademicSessionContextType | null>(null);

export function AcademicSessionProvider({ children }: { children: React.ReactNode }) {
  const [currentSession, setCurrentSession] = useState<string>(DEFAULT_ACADEMIC_SESSION);
  const [customSessions, setCustomSessions] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Read persisted active session & custom sessions from localStorage
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored && stored.trim()) {
        // Normalize any hyphens or en-dashes
        const normalized = stored.replace(/-/g, "–");
        startTransition(() => {
          setCurrentSession(normalized);
        });
      }

      const storedCustom = localStorage.getItem(CUSTOM_SESSIONS_STORAGE_KEY);
      if (storedCustom) {
        const parsed = JSON.parse(storedCustom);
        if (Array.isArray(parsed)) {
          startTransition(() => {
            setCustomSessions(parsed.map((s) => String(s).replace(/-/g, "–")));
          });
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  function setSession(session: string) {
    const normalized = session.replace(/-/g, "–").trim();
    startTransition(() => {
      setCurrentSession(normalized);
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, normalized);
      } catch {
        // ignore
      }
    });
  }

  function addCustomSession(newSession: string) {
    const normalized = newSession.replace(/-/g, "–").trim();
    if (!normalized) return;
    if (!ACADEMIC_SESSIONS.includes(normalized as (typeof ACADEMIC_SESSIONS)[number]) && !customSessions.includes(normalized)) {
      const nextCustom = [...customSessions, normalized];
      setCustomSessions(nextCustom);
      try {
        localStorage.setItem(CUSTOM_SESSIONS_STORAGE_KEY, JSON.stringify(nextCustom));
      } catch {
        // ignore
      }
    }
    setSession(normalized);
  }

  const allSessions = Array.from(new Set([...ACADEMIC_SESSIONS, ...customSessions])).sort().reverse();

  function isCustomSession(session: string) {
    const normalized = session.replace(/-/g, "–").trim();
    return customSessions.includes(normalized);
  }

  return (
    <AcademicSessionContext.Provider
      value={{
        currentSession,
        setSession,
        availableSessions: allSessions,
        addCustomSession,
        isCustomSession,
      }}
    >
      {children}
    </AcademicSessionContext.Provider>
  );
}

export function useAcademicSession(): AcademicSessionContextType {
  const ctx = useContext(AcademicSessionContext);
  if (!ctx) {
    // Return a safe fallback if used outside provider
    return {
      currentSession: DEFAULT_ACADEMIC_SESSION,
      setSession: () => {},
      availableSessions: [...ACADEMIC_SESSIONS],
      addCustomSession: () => {},
      isCustomSession: () => false,
    };
  }
  return ctx;
}
