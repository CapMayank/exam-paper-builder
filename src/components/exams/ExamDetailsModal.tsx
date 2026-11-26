"use client";

import { useState } from "react";
import { Field, Modal } from "@/components/ui";
import { useAcademicSession } from "@/lib/academicSession";
import { EXAM_TYPE_LABEL, EXAM_TYPES, type ExamType } from "@/lib/constants";

export type ExamDetails = { name: string; examType: ExamType; academicSession: string };

/**
 * Name, exam type and session, changed only on Save. The exam type decides which blueprints and papers belong to
 * the exam, so changing it on an exam with linked papers asks first.
 */
export function ExamDetailsModal({
  title,
  initial,
  linkedPapers = 0,
  saveLabel,
  busy,
  onSave,
  onClose,
}: {
  title: string;
  initial: ExamDetails;
  linkedPapers?: number;
  saveLabel: string;
  busy?: boolean;
  onSave: (d: ExamDetails) => void;
  onClose: () => void;
}) {
  const { availableSessions } = useAcademicSession();
  const [form, setForm] = useState<ExamDetails>(initial);
  const sessions = availableSessions.includes(form.academicSession) ? availableSessions : [form.academicSession, ...availableSessions];
  const typeChanged = form.examType !== initial.examType;
  const sessionChanged = form.academicSession !== initial.academicSession;
  const touchesPapers = linkedPapers > 0 && (typeChanged || sessionChanged);
  const valid = form.name.trim().length > 0;

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={busy || !valid} onClick={() => onSave({ ...form, name: form.name.trim() })}>
            {saveLabel}
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !busy) onSave({ ...form, name: form.name.trim() });
        }}
      >
        <Field label="Exam name">
          <input
            className="input w-full"
            autoFocus
            placeholder="Half Yearly Examination December 2026"
            value={form.name}
            maxLength={160}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Exam type">
            <select className="input w-full" value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value as ExamType })}>
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXAM_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Session">
            <select className="input w-full" value={form.academicSession} onChange={(e) => setForm({ ...form, academicSession: e.target.value })}>
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {touchesPapers && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {linkedPapers} linked paper{linkedPapers === 1 ? "" : "s"} will change to{" "}
            {[typeChanged ? EXAM_TYPE_LABEL[form.examType] : null, sessionChanged ? `session ${form.academicSession}` : null].filter(Boolean).join(" and ")} when you save.
          </p>
        )}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
