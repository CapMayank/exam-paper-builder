"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { DEFAULT_SCHOOL_LOGO, DEFAULT_SCHOOL_NAME, EXAM_TYPE_LABEL, type ExamType } from "@/lib/constants";
import { blueprintsForExport, buildBlueprintSheet, formatDuration, type BlueprintSheet } from "@/lib/blueprintSheet";
import type { Blueprint } from "@/lib/types";

/**
 * Printable blueprints for students: one A4 page per subject, for the exam and classes chosen in
 * "Export blueprints" (?session=2026–27&exam=ANNUAL&classes=Class 9|Class 10).
 */
export default function BlueprintPrintPage({ searchParams }: PageProps<"/blueprints/print">) {
  const sp = use(searchParams);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const session = one(sp.session);
  const exam = one(sp.exam) || "ALL";
  const classesParam = one(sp.classes);

  const [list, setList] = useState<Blueprint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Blueprint[]>(`/api/blueprints?session=${encodeURIComponent(session)}`).then(setList, (e) => setError((e as Error).message));
  }, [session]);

  const sheets = useMemo(() => {
    const classes = classesParam.split("|").filter(Boolean);
    return list ? blueprintsForExport(list, { session, examType: exam, classes }).map(buildBlueprintSheet) : [];
  }, [list, session, exam, classesParam]);
  const examLabel = EXAM_TYPE_LABEL[exam as ExamType] ?? "All exams";

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{PRINT_CSS}</style>
      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/blueprints" className="btn btn-ghost btn-sm border border-slate-200">
              <ArrowLeft size={15} /> Blueprints
            </Link>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {examLabel} blueprints · Session {session}
              </p>
              <p className="text-xs text-slate-500">
                {list ? `${sheets.length} page${sheets.length === 1 ? "" : "s"}, one per subject` : "Loading…"}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={sheets.length === 0}>
            <Printer size={15} /> Print or save as PDF
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[210mm] flex-col items-center gap-6 py-6 print:block print:max-w-none print:gap-0 print:py-0">
        {error && <p className="no-print rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {list && sheets.length === 0 && (
          <p className="no-print rounded-lg bg-white px-4 py-6 text-sm text-slate-600 shadow-xs">No blueprints match this exam and these classes.</p>
        )}
        {sheets.map((s) => (
          <Sheet key={s.id} sheet={s} />
        ))}
      </main>
    </div>
  );
}

function Sheet({ sheet: s }: { sheet: BlueprintSheet }) {
  return (
    <article className="bp-sheet bg-white text-slate-900 shadow-sm print:shadow-none">
      <header className="flex items-center gap-4 border-b-2 border-slate-900 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DEFAULT_SCHOOL_LOGO} alt="" className="h-14 w-14 object-contain" />
        <div className="min-w-0 flex-1 text-center">
          <p className="font-display text-[17px] font-semibold leading-tight">{DEFAULT_SCHOOL_NAME}</p>
          <p className="mt-0.5 text-[13px] tracking-wide">
            Blueprint · {s.examLabel} {s.session}
          </p>
        </div>
        <div className="h-14 w-14" aria-hidden />
      </header>

      <dl className="mt-3 grid grid-cols-4 border border-slate-900 text-[12.5px]">
        {[
          ["Class", s.className],
          ["Subject", s.subject],
          ["Maximum marks", String(s.totalMarks)],
          ["Time", formatDuration(s.durationMin)],
        ].map(([k, v], i) => (
          <div key={k} className={`px-2.5 py-1.5 ${i > 0 ? "border-l border-slate-900" : ""}`}>
            <dt className="text-[10.5px] text-slate-600">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-5 text-[13px] font-semibold">Question pattern</h2>
      <table className="bp-table mt-1.5">
        <thead>
          <tr>
            <th className="w-[16%]">Q. No.</th>
            <th>Type of question</th>
            <th className="w-[13%] text-center">Questions</th>
            <th className="w-[13%] text-center">Marks each</th>
            <th className="w-[12%] text-center">Marks</th>
          </tr>
        </thead>
        <tbody>
          {s.pattern.map((r, i) => (
            <tr key={i}>
              <td className="tabular-nums">{r.questionNos}</td>
              <td>
                {r.type}
                {r.withChoice > 0 && (
                  <span className="block text-[10.5px] text-slate-600">
                    Internal choice (OR) in {r.withChoice === r.count ? "every question" : `${r.withChoice} question${r.withChoice === 1 ? "" : "s"}`}
                  </span>
                )}
              </td>
              <td className="text-center tabular-nums">{r.count}</td>
              <td className="text-center tabular-nums">{r.marksEach}</td>
              <td className="text-center tabular-nums">{r.total}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Total</td>
            <td className="text-center tabular-nums">{s.questionCount}</td>
            <td />
            <td className="text-center tabular-nums">{s.totalMarks}</td>
          </tr>
        </tfoot>
      </table>

      {s.chapters.length > 0 && (
        <>
          <h2 className="mt-5 text-[13px] font-semibold">Marks by chapter</h2>
          <table className="bp-table mt-1.5">
            <thead>
              <tr>
                <th className="w-[8%] text-center">No.</th>
                <th>Chapter</th>
                <th className="w-[12%] text-center">Marks</th>
              </tr>
            </thead>
            <tbody>
              {s.chapters.map((c, i) => (
                <ChapterRows
                  key={i}
                  index={i + 1}
                  heading={c.part !== null && c.part !== s.chapters[i - 1]?.part ? c.part : null}
                  title={c.title}
                  marks={c.marks}
                />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td className="text-center tabular-nums">{s.chapters.reduce((n, c) => n + c.marks, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </article>
  );
}

function ChapterRows({ index, heading, title, marks }: { index: number; heading: string | null; title: string; marks: number }) {
  return (
    <>
      {heading && (
        <tr className="bp-part">
          <td colSpan={3}>{heading}</td>
        </tr>
      )}
      <tr>
        <td className="text-center tabular-nums">{index}</td>
        <td>{title}</td>
        <td className="text-center tabular-nums">{marks}</td>
      </tr>
    </>
  );
}

// in the components layer, so Tailwind utilities on the cells (text-center, …) still apply
const PRINT_CSS = `
@layer components {
.bp-sheet { width: 210mm; min-height: 297mm; padding: 14mm 15mm; box-sizing: border-box; }
.bp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.bp-table th, .bp-table td { border: 1px solid #0f172a; padding: 4px 7px; vertical-align: top; text-align: left; }
.bp-table thead th { background: #f1f5f9; font-weight: 600; font-size: 11.5px; }
.bp-table tfoot td { font-weight: 700; background: #f8fafc; }
.bp-table .bp-part td { background: #f8fafc; font-weight: 600; font-size: 11.5px; }
.bp-table tr { break-inside: avoid; }
@media print {
  .bp-sheet { break-after: page; min-height: auto; }
  .bp-sheet:last-child { break-after: auto; }
  .bp-table thead th, .bp-table tfoot td, .bp-table .bp-part td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
}
`;
