"use client";

import { useState } from "react";
import { BookOpen, Calendar, Check, CheckSquare, GraduationCap, RotateCcw, Ruler, Sparkles, Square } from "lucide-react";
import { Field, Modal, Spinner, useToast } from "@/components/ui";
import { normalizeSession } from "@/lib/academicSession";
import { api } from "@/lib/client";

interface AcademicRolloverModalProps {
  currentSession: string;
  availableSessions: string[];
  onClose: () => void;
  onSuccess: (targetSession: string) => void;
}

export function AcademicRolloverModal({
  currentSession,
  availableSessions,
  onClose,
  onSuccess,
}: AcademicRolloverModalProps) {
  const toast = useToast();
  const normalizedCurrent = normalizeSession(currentSession);

  // Suggest next session e.g. 2025–26 -> 2026–27
  const defaultTarget = (() => {
    const match = normalizedCurrent.match(/^(\d{4})[–-](\d{2})$/);
    if (match) {
      const y1 = parseInt(match[1], 10) + 1;
      const y2 = parseInt(match[2], 10) + 1;
      return `${y1}–${y2 < 10 ? `0${y2}` : y2}`;
    }
    return "2026–27";
  })();

  const [sourceSession, setSourceSession] = useState(normalizedCurrent);
  const [targetSession, setTargetSession] = useState(defaultTarget);
  const [includeClasses, setIncludeClasses] = useState(true);
  const [includeBooks, setIncludeBooks] = useState(true);
  const [includeBlueprints, setIncludeBlueprints] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTarget = normalizeSession(targetSession);
    if (!cleanTarget) return;

    if (cleanTarget === sourceSession) {
      setError("Target academic session must be different from source session.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await api<{
        ok: boolean;
        summary: {
          classesCloned: number;
          subjectsCloned: number;
          booksCloned: number;
          chaptersCloned: number;
          blueprintsCloned: number;
        };
      }>("/api/academic-rollover", {
        method: "POST",
        json: {
          sourceSession,
          targetSession: cleanTarget,
          includeClasses,
          includeBooks,
          includeBlueprints,
        },
      });

      const s = res.summary;
      toast.success(
        `Rolled over to Session ${cleanTarget}! Cloned: ${s.classesCloned} classes, ${s.booksCloned} books, ${s.blueprintsCloned} blueprints.`
      );
      onSuccess(cleanTarget);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      title="Academic Session Rollover"
      subtitle="Clone classes, syllabus textbooks, and blueprints into a new academic session with zero data loss to previous years."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </div>
        )}

        {/* Source and Target Session Selection */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source Session" helper="Session to copy from">
            <select
              className="input text-xs"
              value={sourceSession}
              onChange={(e) => setSourceSession(e.target.value)}
            >
              {availableSessions.map((sess) => (
                <option key={sess} value={sess}>
                  Session {sess}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Target Session" helper="New academic year">
            <input
              type="text"
              className="input text-xs font-semibold"
              value={targetSession}
              onChange={(e) => setTargetSession(e.target.value)}
              placeholder="e.g. 2026–27"
              required
            />
          </Field>
        </div>

        {/* Checkbox Group for What to Rollover */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Select entities to copy into {targetSession}:
          </label>

          <div className="space-y-2">
            {/* 1. Classes & Subjects */}
            <div
              onClick={() => setIncludeClasses((prev) => !prev)}
              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                includeClasses
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white hover:bg-slate-50/50"
              }`}
            >
              <div className="mt-0.5 text-slate-900">
                {includeClasses ? <CheckSquare size={17} /> : <Square size={17} className="text-slate-400" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <GraduationCap size={15} className="text-slate-700" />
                  <span className="font-semibold text-xs text-slate-900">
                    Classes, Streams &amp; Sections
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Copies standard Class 1–12 definitions, subject lists, codes, and section arrangements.
                </p>
              </div>
            </div>

            {/* 2. Textbooks & Syllabus Chapters */}
            <div
              onClick={() => setIncludeBooks((prev) => !prev)}
              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                includeBooks
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white hover:bg-slate-50/50"
              }`}
            >
              <div className="mt-0.5 text-slate-900">
                {includeBooks ? <CheckSquare size={17} /> : <Square size={17} className="text-slate-400" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BookOpen size={15} className="text-slate-700" />
                  <span className="font-semibold text-xs text-slate-900">
                    Textbooks &amp; Syllabus Chapters
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Re-establishes chapter titles and syllabus structures for each subject in the new session.
                </p>
              </div>
            </div>

            {/* 3. Exam Blueprints & Chapter Quotas */}
            <div
              onClick={() => setIncludeBlueprints((prev) => !prev)}
              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                includeBlueprints
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white hover:bg-slate-50/50"
              }`}
            >
              <div className="mt-0.5 text-slate-900">
                {includeBlueprints ? <CheckSquare size={17} /> : <Square size={17} className="text-slate-400" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Ruler size={15} className="text-slate-700" />
                  <span className="font-semibold text-xs text-slate-900">
                    Exam Blueprints &amp; Chapter Quotas
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Carries forward Quarterly, Half-Yearly, and Annual exam blueprints and chapter mark allocations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Institutional Safeguard Note */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-[11px] text-slate-700 leading-relaxed">
          <strong className="text-slate-900">Archive Preservation:</strong> All previous exam papers, generated PDF print runs, and questions remain archived in Session <strong>{sourceSession}</strong>. No prior year exam records are altered or deleted.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost text-xs"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary text-xs"
            disabled={busy || (!includeClasses && !includeBooks && !includeBlueprints)}
          >
            {busy && <Spinner />}
            {busy ? "Rolling over curriculum…" : `Rollover to ${targetSession}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
