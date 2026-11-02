"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBanner, Field, Modal, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import { DEFAULT_ACADEMIC_SESSION, DEFAULT_SCHOOL_NAME, EXAM_TYPES, EXAM_TYPE_LABEL, KG_CLASSES, KG_SUBJECTS, type ExamType } from "@/lib/constants";

const SCHOOL_KEY = "epb:schoolName";

/**
 * Nursery / LKG / UKG worksheets: just a class and a subject – no blueprint, no book.
 * Activities are added one by one on the worksheet page that opens next.
 */
export function NewWorksheetModal({ session, onClose }: { session?: string; onClose: () => void }) {
  const router = useRouter();
  const [className, setClassName] = useState<(typeof KG_CLASSES)[number]>("Nursery");
  const [subject, setSubject] = useState<string>(KG_SUBJECTS[0]);
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState<ExamType>("UNIT_TEST");
  const [examDate, setExamDate] = useState("");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [schoolName, setSchoolName] = useState(() => {
    try {
      return localStorage.getItem(SCHOOL_KEY) || DEFAULT_SCHOOL_NAME;
    } catch {
      return DEFAULT_SCHOOL_NAME;
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoTitle = `${className} ${subject} ${EXAM_TYPE_LABEL[examType]} Worksheet`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string }>("/api/papers/quick-worksheet", {
        method: "POST",
        json: {
          title: title.trim() || autoTitle,
          className,
          subject,
          schoolName: schoolName.trim() || DEFAULT_SCHOOL_NAME,
          examType,
          examDate,
          academicSession: session || DEFAULT_ACADEMIC_SESSION,
          language,
        },
      });
      try {
        localStorage.setItem(SCHOOL_KEY, schoolName);
      } catch {}
      router.push(`/worksheets/${res.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title="New Nursery–KG worksheet"
      subtitle="Pick the class and subject, then add activities one by one. No blueprint or book needed."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="new-worksheet-form" className="btn btn-primary" disabled={busy}>
            {busy ? <Spinner size="sm" /> : null} Create worksheet
          </button>
        </>
      }
    >
      <form id="new-worksheet-form" onSubmit={create} className="space-y-4">
        <ErrorBanner message={error} />

        <div>
          <span className="label">Class</span>
          <div className="grid grid-cols-3 gap-2">
            {KG_CLASSES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setClassName(c)}
                className={`rounded-xl border-2 px-3 py-3 text-center text-base font-bold transition ${
                  className === c ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {c}
                <span className="block text-[11px] font-medium text-slate-500">{c === "Nursery" ? "Age 3–4" : c === "LKG" ? "KG I · Age 4–5" : "KG II · Age 5–6"}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Subject</span>
          <div className="flex flex-wrap gap-1.5">
            {KG_SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  subject === s ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Exam</span>
          <div className="flex flex-wrap gap-1.5">
            {EXAM_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setExamType(t)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  examType === t ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {EXAM_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <Field label="Worksheet title" helper="Leave empty to use the suggested name.">
          <input className="input" placeholder={autoTitle} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="School name">
            <input className="input" required value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
          </Field>
          <Field label="Date (optional)">
            <input type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Instruction language">
          <select className="input" value={language} onChange={(e) => setLanguage(e.target.value as "en" | "hi")}>
            <option value="en">English</option>
            <option value="hi">Hindi (हिंदी)</option>
          </select>
        </Field>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Prints on <strong>A4 portrait</strong> and automatically fits <strong>2 pages</strong> – one sheet, front and back. You can reorder, resize marks and edit every activity afterwards.
        </p>
      </form>
    </Modal>
  );
}
