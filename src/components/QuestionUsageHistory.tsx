"use client";

import { AlertTriangle, History } from "lucide-react";
import Link from "next/link";
import type { QuestionUsageTag } from "@/lib/types";

export type CurrentPaperContext = {
  id?: string;
  paperId?: string;
  academicSession?: string;
  className?: string;
  subject?: string;
  blueprint?: {
    book?: {
      className?: string;
      subject?: string;
    };
  };
};

/**
 * Detects whether a question usage represents an earlier finalized exam
 * for the same class and subject in the active academic session.
 */
export function isExhaustedUsage(
  usage: QuestionUsageTag,
  currentPaper?: CurrentPaperContext | null,
): boolean {
  if (!usage || !currentPaper) return false;

  const currentPaperId = currentPaper.id || currentPaper.paperId;
  if (currentPaperId && usage.paperId === currentPaperId) return false;

  const normSession = (s?: string) => s?.replace(/[\u2013\u2014]/g, "-").trim();
  const currentSession = normSession(currentPaper.academicSession);
  const usageSession = normSession(usage.academicSession);
  if (!currentSession || !usageSession || currentSession !== usageSession) {
    return false;
  }

  const currentClass = currentPaper.className || currentPaper.blueprint?.book?.className;
  if (
    currentClass &&
    usage.className &&
    currentClass.trim().toLowerCase() !== usage.className.trim().toLowerCase()
  ) {
    return false;
  }

  const currentSubject = currentPaper.subject || currentPaper.blueprint?.book?.subject;
  if (
    currentSubject &&
    usage.subject &&
    currentSubject.trim().toLowerCase() !== usage.subject.trim().toLowerCase()
  ) {
    return false;
  }

  // If status is present, it must be "FINAL". If omitted/undefined in tests, treat as finalized.
  if (usage.status && usage.status !== "FINAL") {
    return false;
  }

  return true;
}

/**
 * Detects whether a question has already been used in another paper
 * for the same academic session and student cohort (class).
 */
export function findFreshnessConflicts(
  usages?: QuestionUsageTag[] | null,
  currentPaper?: CurrentPaperContext | null,
): QuestionUsageTag[] {
  if (!usages || !Array.isArray(usages) || usages.length === 0 || !currentPaper) {
    return [];
  }

  const currentPaperId = currentPaper.id || currentPaper.paperId;
  const normSession = (s?: string) => s?.replace(/[\u2013\u2014]/g, "-").trim();
  const currentSession = normSession(currentPaper.academicSession);
  const currentClass = currentPaper.className || currentPaper.blueprint?.book?.className;

  return usages.filter((u) => {
    // Exclude the current paper itself
    if (currentPaperId && u.paperId === currentPaperId) return false;

    // Must match academic session
    const usageSession = normSession(u.academicSession);
    if (!currentSession || !usageSession || currentSession !== usageSession) {
      return false;
    }

    // Must match student cohort/class if both are specified
    if (
      currentClass &&
      u.className &&
      currentClass.trim().toLowerCase() !== u.className.trim().toLowerCase()
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Exam category mapping for styling badges
 */
export type ExamCategory =
  | "quarterly"
  | "half"
  | "annual"
  | "preboard"
  | "unittest"
  | "practice"
  | "general";

export interface CompactExamTagInfo {
  term: string;
  year: string;
  displayLabel: string;
  category: ExamCategory;
  badgeStyle: {
    bg: string;
    text: string;
    border: string;
    hover: string;
    dot: string;
  };
}

export const CATEGORY_STYLES: Record<ExamCategory, CompactExamTagInfo["badgeStyle"]> = {
  quarterly: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
    hover: "hover:bg-amber-100 hover:border-amber-300",
    dot: "bg-amber-500",
  },
  half: {
    bg: "bg-sky-50",
    text: "text-sky-900",
    border: "border-sky-200",
    hover: "hover:bg-sky-100 hover:border-sky-300",
    dot: "bg-sky-500",
  },
  annual: {
    bg: "bg-purple-50",
    text: "text-purple-900",
    border: "border-purple-200",
    hover: "hover:bg-purple-100 hover:border-purple-300",
    dot: "bg-purple-500",
  },
  preboard: {
    bg: "bg-rose-50",
    text: "text-rose-900",
    border: "border-rose-200",
    hover: "hover:bg-rose-100 hover:border-rose-300",
    dot: "bg-rose-500",
  },
  unittest: {
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    border: "border-emerald-200",
    hover: "hover:bg-emerald-100 hover:border-emerald-300",
    dot: "bg-emerald-500",
  },
  practice: {
    bg: "bg-indigo-50",
    text: "text-indigo-900",
    border: "border-indigo-200",
    hover: "hover:bg-indigo-100 hover:border-indigo-300",
    dot: "bg-indigo-500",
  },
  general: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200",
    hover: "hover:bg-slate-200 hover:border-slate-300",
    dot: "bg-slate-400",
  },
};

/**
 * Extracts compact exam term (e.g. Quarterly, Half, Annual) and year (e.g. 2026, 2025)
 * from a question usage tag's paperTitle, academicSession, and examDate.
 */
export function parseCompactExamTag(
  u: Partial<QuestionUsageTag> & { paperTitle?: string },
): CompactExamTagInfo {
  const title = (u.paperTitle || "").trim();
  const lower = title.toLowerCase();

  // 1. Extract 4-digit Year
  let year = "";
  if (u.examDate && /^\d{4}/.test(u.examDate)) {
    year = u.examDate.slice(0, 4);
  } else if (u.academicSession) {
    // "2025–26" or "2025-26" -> "2026", or "2025" -> "2025"
    const rangeMatch = u.academicSession.match(/(?:20\d{2}[–\-\/])(20\d{2}|\d{2})/);
    if (rangeMatch) {
      const secondPart = rangeMatch[1];
      year = secondPart.length === 2 ? `20${secondPart}` : secondPart;
    } else {
      const yearMatch = u.academicSession.match(/20\d{2}/);
      if (yearMatch) year = yearMatch[0];
    }
  }

  // If still no year, check if title contains 20xx
  if (!year) {
    const titleYear = title.match(/20\d{2}/);
    if (titleYear) year = titleYear[0];
  }

  // 2. Classify exam term & category
  let term = "";
  let category: ExamCategory = "general";

  if (/quaterly|quarterly|qtr|1st[- ]?term|first[- ]?term/i.test(lower)) {
    term = "Quarterly";
    category = "quarterly";
  } else if (/half[- ]?yearly|half|mid[- ]?term|midterm|2nd[- ]?term|second[- ]?term/i.test(lower)) {
    term = "Half";
    category = "half";
  } else if (/pre[- ]?board|preboard/i.test(lower)) {
    term = "Pre-Board";
    category = "preboard";
  } else if (/annual|final|end[- ]?term|year[- ]?end|board[- ]?exam/i.test(lower)) {
    term = "Annual";
    category = "annual";
  } else if (/unit[- ]?test|periodic[- ]?test|ut[- ]?[0-9]+|pt[- ]?[0-9]+/i.test(lower)) {
    const utMatch = title.match(/(?:UT|PT|Unit[- ]?Test|Periodic[- ]?Test)[- ]?([0-9]+)/i);
    term = utMatch ? `UT-${utMatch[1]}` : "Unit Test";
    category = "unittest";
  } else if (/practice|mock|sample|model/i.test(lower)) {
    term = /practice/i.test(lower) ? "Practice" : /mock/i.test(lower) ? "Mock" : "Model";
    category = "practice";
  } else if (title) {
    // Clean up title: strip "Class 10", "Science", "- Single Page Format", etc.
    const clean = title
      .replace(/\s*-\s*Single Page.*$/i, "")
      .replace(/^(?:science|maths|english|physics|chemistry|biology|social)\s+/i, "")
      .replace(/class\s*\d+\s*/i, "");
    const words = clean.split(/\s+/).filter(Boolean);
    term = words.slice(0, 2).join(" ");
    if (term.length > 14) term = term.slice(0, 14);
    category = "general";
  } else {
    term = "Exam";
    category = "general";
  }

  const displayLabel = year ? `${term} ${year}` : term;

  return {
    term,
    year,
    displayLabel,
    category,
    badgeStyle: CATEGORY_STYLES[category],
  };
}

/**
 * Warning banner displayed when a question has been used in another paper
 * during the same academic session for this cohort.
 */
export function QuestionFreshnessAlert({
  usages,
  conflicts,
  currentPaper,
  className = "",
}: {
  usages?: QuestionUsageTag[] | null;
  conflicts?: QuestionUsageTag[] | null;
  currentPaper?: CurrentPaperContext | null;
  className?: string;
}) {
  const activeConflicts = conflicts ?? findFreshnessConflicts(usages, currentPaper);
  if (!activeConflicts || activeConflicts.length === 0) return null;

  const firstConflict = activeConflicts[0];
  const info = parseCompactExamTag(firstConflict);
  const paperSetDisplay = firstConflict.paperSet ? ` (${firstConflict.paperSet})` : "";
  const moreCount = activeConflicts.length - 1;

  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <AlertTriangle size={14} className="shrink-0 text-amber-600" />
        <span className="truncate">
          <strong className="font-semibold text-amber-950">Freshness Alert:</strong> Already used in{" "}
          <strong className="font-semibold text-amber-950">
            {info.displayLabel}
            {paperSetDisplay}
          </strong>
          {moreCount > 0 ? ` and ${moreCount} other paper(s)` : ""} for this session.
        </span>
      </div>
      <Link
        href={`/papers/${firstConflict.paperId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 font-bold text-amber-800 underline decoration-amber-400 hover:text-amber-950 text-[11px]"
      >
        View Paper ↗
      </Link>
    </div>
  );
}

/**
 * Clickable / hoverable pills showing where and when a question was previously used.
 * Formatted as compact semantic tags (e.g., Quarterly 2026, Half 2026, Annual 2025).
 */
export function QuestionUsagePills({
  usages,
  currentPaperId,
  currentPaper,
  className = "",
}: {
  usages?: QuestionUsageTag[] | null;
  currentPaperId?: string;
  currentPaper?: CurrentPaperContext | null;
  className?: string;
}) {
  if (!usages || !Array.isArray(usages) || usages.length === 0) return null;

  const effectivePaperId = currentPaperId || currentPaper?.id || currentPaper?.paperId;
  const filtered = effectivePaperId ? usages.filter((u) => u.paperId !== effectivePaperId) : usages;
  if (filtered.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {filtered.map((u, i) => {
        const info = parseCompactExamTag(u);
        const isExhausted = isExhaustedUsage(u, currentPaper);

        const tooltip = isExhausted
          ? `⚠️ Exhausted Question: Finalized in ${u.paperTitle || info.displayLabel} for ${u.className} ${u.subject || ""} in session ${u.academicSession}. Click to inspect paper ↗`
          : [
              `Exam: ${u.paperTitle || "Untitled"}`,
              u.paperSet ? `Set: ${u.paperSet}` : null,
              u.examDate ? `Date: ${u.examDate}` : null,
              u.academicSession ? `Session: ${u.academicSession}` : null,
              u.className ? `Cohort: ${u.className}` : null,
              u.isOrChoice ? `Role: Alternate Choice (OR Question)` : `Role: Primary Question`,
              `Click to open paper ↗`,
            ]
              .filter(Boolean)
              .join(" | ");

        const badgeClass = isExhausted
          ? "bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-400/40 hover:bg-amber-200 hover:border-amber-400 font-bold"
          : `${info.badgeStyle.bg} ${info.badgeStyle.text} ${info.badgeStyle.border} ${info.badgeStyle.hover} font-semibold`;

        return (
          <Link
            key={`${u.paperId}-${i}`}
            href={`/papers/${u.paperId}`}
            title={tooltip}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] transition shadow-2xs ${badgeClass}`}
          >
            {isExhausted ? (
              <AlertTriangle size={11} className="text-amber-700 shrink-0" />
            ) : (
              <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${info.badgeStyle.dot}`} />
            )}
            <span>{info.displayLabel}</span>
            {u.paperSet && (
              <span className="font-normal opacity-75">· {u.paperSet}</span>
            )}
            {isExhausted && (
              <span className="rounded bg-amber-500/25 px-1 py-0.2 text-[9px] font-extrabold uppercase tracking-tight text-amber-900 border border-amber-400/30">
                Exhausted
              </span>
            )}
            {u.isOrChoice && (
              <span className="rounded bg-black/10 px-1 py-0.2 text-[9.5px] font-bold uppercase tracking-tight">
                OR
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
