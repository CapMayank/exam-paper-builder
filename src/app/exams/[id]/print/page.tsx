"use client";

import { ArrowLeft, Lock, Printer } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useExamsGate } from "@/components/exams/useExamsGate";
import { EmptyState, Spinner, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import {
  DEFAULT_SCHOOL_LOGO,
  SCHOOL_ADDRESS,
  SCHOOL_AFFILIATION,
  SCHOOL_CODE,
  SCHOOL_DISE_CODE,
  SCHOOL_EMAIL,
  SCHOOL_ESTABLISHED_YEAR,
  SCHOOL_LOCATION,
  SCHOOL_PHONES,
  SCHOOL_PRINT_NAME,
  SCHOOL_WEBSITE,
} from "@/lib/constants";
import { formatDMY, weekdayName } from "@/lib/exams/dates";
import { shortClassLabel, shortSubjectLabel } from "@/lib/exams/labels";
import type { ExamView, SignatureMode } from "@/lib/exams/types";

const SERIF = { fontFamily: '"Times New Roman", Times, serif' };

/** The circulated date sheet: one A4 page laid out like the school's own. Save as PDF from the print dialog. */
export default function DateSheetPrintPage({ params }: PageProps<"/exams/[id]/print">) {
  const { id } = use(params);
  const gate = useExamsGate();
  const toast = useToast();
  const [exam, setExam] = useState<ExamView | null>(null);
  const [signature, setSignature] = useState<string | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overflow, setOverflow] = useState(false);
  const sheet = useRef<HTMLElement>(null);

  useEffect(() => {
    if (gate.state !== "allowed") return;
    api<ExamView>(`/api/exams/${id}`).then(setExam, (e) => setLoadError(e instanceof Error ? e.message : "Could not load the exam"));
    api<{ fileName: string | null }>("/api/settings/signature").then(
      (r) => setSignature(r.fileName),
      () => setSignature(null),
    );
  }, [gate.state, id]);

  // a sheet that no longer fits one A4 page is cut off when printed: say so
  useEffect(() => {
    const main = sheet.current?.querySelector("main");
    if (!main) return;
    const check = () => setOverflow(main.scrollHeight > main.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(main);
    return () => ro.disconnect();
  }, [exam, signature]);

  const setMode = async (signatureMode: SignatureMode) => {
    if (!exam) return;
    setExam({ ...exam, signatureMode });
    try {
      setExam(await api<ExamView>(`/api/exams/${id}`, { method: "PATCH", json: { signatureMode } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  if (gate.state === "forbidden") {
    return (
      <main className="mx-auto max-w-lg p-10">
        <EmptyState icon={Lock} title="You don't have access" description="Date sheets are printed by Admins and Exam Cell." />
      </main>
    );
  }
  if (loadError) {
    return (
      <main className="mx-auto max-w-lg p-10">
        <EmptyState icon={Lock} title="This date sheet could not be opened" description={loadError} action={<Link href="/exams" className="btn btn-secondary">Back to Exams</Link>} />
      </main>
    );
  }
  if (gate.state === "loading" || !exam || signature === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        <Spinner size="lg" />
      </main>
    );
  }

  const signed = exam.signatureMode === "SIGNED" && !!signature;
  const blocks = [...exam.blocks].sort((a, b) => a.position - b.position).filter((b) => b.dates.length && b.classes.length);
  // two papers on one day (GK and Drawing) share the cell: "GK/Draw."
  const subjectAt = (blockId: string, c: string, d: string) =>
    exam.slots
      .filter((s) => s.blockId === blockId && s.className === c && s.examDate === d)
      .map((s) => shortSubjectLabel(s.subject))
      .join("/");

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      <style>{`@page { size: A4 portrait; margin: 0; } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      <div className="no-print sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/exams/${id}?tab=sheet`} className="btn btn-ghost btn-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Back to exam
          </Link>
          <span className="font-display font-semibold text-slate-800">Date sheet</span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Signature">
            {(["SIGNED", "BLANK"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={exam.signatureMode === m}
                disabled={m === "SIGNED" && !signature}
                title={m === "SIGNED" && !signature ? "Upload the Principal's signature on the Exams page first" : undefined}
                onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-40 ${exam.signatureMode === m ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"}`}
              >
                {m === "SIGNED" ? "Signed" : "Blank line"}
              </button>
            ))}
          </div>
          {exam.signatureMode === "SIGNED" && !signature && <span className="text-xs text-slate-600">No signature uploaded yet — prints a blank line to sign.</span>}
          {exam.status === "DRAFT" && <span className="text-xs text-amber-700">Draft — prints with a DRAFT watermark. Mark it Circulated to remove it.</span>}
          {overflow && <span className="text-xs font-semibold text-red-700">Too long for one A4 page — the bottom is cut off. Remove empty dates or classes, or shorten block titles.</span>}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => window.print()} autoFocus>
          <Printer size={15} /> Print / Save as PDF
        </button>
      </div>

      <div className="flex justify-center py-8 print:block print:p-0">
        <article ref={sheet} className="relative flex flex-col overflow-hidden bg-white text-black shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
          {/* faint logo watermark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEFAULT_SCHOOL_LOGO} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 w-[120mm] -translate-x-1/2 -translate-y-1/2 opacity-[0.06]" />
          {exam.status === "DRAFT" && (
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[35deg] text-[110pt] font-black tracking-widest text-slate-900 opacity-[0.07]">
              DRAFT
            </span>
          )}

          <header className="flex shrink-0 items-center gap-[4mm] px-[8mm] py-[4mm]" style={{ background: "#c9dcf0" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEFAULT_SCHOOL_LOGO} alt="School logo" className="h-[30mm] w-[30mm] shrink-0 rounded bg-[#fdf3c4] object-contain p-[1mm]" />
            <div className="min-w-0 flex-1 text-center">
              <h1 className="whitespace-nowrap text-[15pt] font-black uppercase leading-tight text-[#1f2f86]" style={{ fontFamily: "Georgia, serif", letterSpacing: "0.02em" }}>
                {SCHOOL_PRINT_NAME}
              </h1>
              <div className="mt-[1mm] grid grid-cols-3 items-start text-[9.5pt] font-bold leading-tight text-[#1f2f86]">
                <div className="text-left">
                  Dise Code: {SCHOOL_DISE_CODE}
                  <br />
                  Established: {SCHOOL_ESTABLISHED_YEAR}
                </div>
                <div className="text-[12pt] uppercase">
                  {SCHOOL_LOCATION}
                  <br />
                  Session: {exam.academicSession.replace("–", "-")}
                </div>
                <div className="text-right">
                  School Code: {SCHOOL_CODE}
                  <br />({SCHOOL_AFFILIATION})
                </div>
              </div>
            </div>
          </header>

          <main className="relative flex min-h-0 flex-1 flex-col px-[8mm] pt-[4mm]" style={SERIF}>
            <h2 className="text-center text-[17pt] font-bold leading-snug">
              DATE SHEET
              <br />
              {exam.name.toUpperCase()}
            </h2>

            {blocks.length === 0 && <p className="mt-[20mm] text-center text-[12pt] text-slate-500">This date sheet has no dates or classes yet.</p>}

            {blocks.map((b) => (
              <section key={b.id} className="mt-[3mm]">
                <div className="relative mb-[1mm] text-center">
                  <h3 className="text-[13pt] font-bold">{b.title}</h3>
                  {b.timeText && <span className="absolute bottom-0 right-0 text-[10pt]" style={{ fontFamily: "Arial, sans-serif" }}>TIME: {b.timeText}</span>}
                </div>
                <table className="w-full border-collapse text-center text-[11.5pt]">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="w-[16mm] border border-black px-1 font-normal">
                        Class
                      </th>
                      {b.dates.map((d) => (
                        <th key={d} className="border border-black px-1 py-[0.6mm] font-bold">
                          {formatDMY(d)}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {b.dates.map((d) => (
                        <th key={d} className="border border-black px-1 py-[0.6mm] font-bold">
                          {weekdayName(d)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.classes.map((c) => (
                      <tr key={c}>
                        <td className="border border-black px-1 py-[0.5mm]">{shortClassLabel(c)}</td>
                        {b.dates.map((d) => {
                          const s = subjectAt(b.id, c, d);
                          return (
                            <td key={d} className="border border-black px-1 py-[0.5mm] leading-tight">
                              {s || "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}

            <div className="mt-auto flex w-[50mm] flex-col items-center self-end pb-[3mm] pr-[2mm] pt-[3mm]">
              {signed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/uploads/${signature}`} alt="Principal's signature and seal" className="h-[22mm] max-w-[50mm] object-contain" />
              ) : (
                <span className="mb-[1mm] block h-[16mm] w-full border-b border-black" />
              )}
              <span className="text-[12pt] font-bold">Principal</span>
            </div>
          </main>

          <footer className="shrink-0 px-[6mm] py-[3mm] text-[10pt] font-bold text-[#1f2f86]" style={{ background: "#c9dcf0", fontFamily: "Georgia, serif" }}>
            <p className="text-center">{SCHOOL_ADDRESS}</p>
            <p className="mt-[0.5mm] flex justify-between">
              <span>{SCHOOL_PHONES}</span>
              <span className="underline">{SCHOOL_WEBSITE}</span>
              <span className="underline">{SCHOOL_EMAIL}</span>
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
