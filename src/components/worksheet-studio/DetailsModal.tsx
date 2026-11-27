"use client";

import { useState } from "react";
import { ErrorBanner, Field, Modal } from "@/components/ui";
import { api } from "@/lib/client";
import { DEFAULT_SCHOOL_NAME, EXAM_TYPES, EXAM_TYPE_LABEL, resolvePaperExamType, type ExamType } from "@/lib/constants";
import type { PaperData } from "@/lib/types";

export function DetailsModal({ paper, onClose, onSaved }: { paper: PaperData; onClose: () => void; onSaved: (p: PaperData) => void }) {
  const [title, setTitle] = useState(paper.title);
  const [schoolName, setSchoolName] = useState(paper.schoolName || DEFAULT_SCHOOL_NAME);
  const [examDate, setExamDate] = useState(paper.examDate || "");
  const [examType, setExamType] = useState<ExamType>(resolvePaperExamType(paper));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/papers/${paper.id}`, { method: "PATCH", json: { title: title.trim(), schoolName: schoolName.trim(), examDate, examType } });
      onSaved(await api<PaperData>(`/api/papers/${paper.id}`));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Worksheet details"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="ws-details" className="btn btn-primary" disabled={busy}>
            Save
          </button>
        </>
      }
    >
      <form id="ws-details" onSubmit={save} className="space-y-3">
        <ErrorBanner message={error} />
        <Field label="Title">
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div>
          <span className="label">Exam</span>
          <div className="flex flex-wrap gap-1.5">
            {EXAM_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setExamType(t)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${examType === t ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}
              >
                {EXAM_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        <Field label="School name">
          <input className="input" required value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
        </Field>
        <Field label="Date (optional)">
          <input type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
