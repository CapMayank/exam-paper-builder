"use client";

import { useState } from "react";
import {
  DEFAULT_DIFFICULTY_PROFILE,
  DIFFICULTY_PROFILES,
  resolveDifficultyProfile,
  type DifficultyProfileId,
} from "@/lib/difficultyProfiles";

const STORAGE_KEY = "exam_ai_difficulty_profile";

/** The teacher's last difficulty profile (remembered in this browser), defaulting to the school-exam profile. */
export function useDifficultyProfile(): [DifficultyProfileId, (v: DifficultyProfileId) => void] {
  // the generator modals only render in the browser, after the teacher opens them
  const [value, setValue] = useState<DifficultyProfileId>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      return saved ? resolveDifficultyProfile(saved).id : DEFAULT_DIFFICULTY_PROFILE;
    } catch {
      return DEFAULT_DIFFICULTY_PROFILE;
    }
  });
  const set = (v: DifficultyProfileId) => {
    setValue(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  };
  return [value, set];
}

export function DifficultySelect({
  value,
  onChange,
  className,
}: {
  value: DifficultyProfileId;
  onChange: (v: DifficultyProfileId) => void;
  className?: string;
}) {
  const profile = DIFFICULTY_PROFILES[value];
  return (
    <div className="space-y-1">
      <select className={className ?? "select text-xs w-full"} value={value} onChange={(e) => onChange(e.target.value as DifficultyProfileId)}>
        {(["SCHOOL", "BOARD", "CHALLENGE", "FOUNDATION"] as DifficultyProfileId[]).map((id) => (
          <option key={id} value={id}>
            {DIFFICULTY_PROFILES[id].label}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-slate-500">{profile.description} Harder questions go to the higher-mark slots.</p>
    </div>
  );
}
