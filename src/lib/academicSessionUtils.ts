import { DEFAULT_ACADEMIC_SESSION } from "./constants";

export const SESSION_STORAGE_KEY = "epb:activeAcademicSession";
export const CUSTOM_SESSIONS_STORAGE_KEY = "epb:customAcademicSessions";

export function normalizeSession(session?: string | null): string {
  if (!session || !session.trim()) return DEFAULT_ACADEMIC_SESSION;
  return session.trim().replace(/-/g, "–");
}
