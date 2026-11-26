"use client";

import { ArrowLeft, Lock, Pencil, Printer } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useExamsGate } from "@/components/exams/useExamsGate";
import { EmptyState, Modal, Spinner, useToast } from "@/components/ui";
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
import { formatDMY, todayIST, weekdayName } from "@/lib/exams/dates";
import { shortClassLabel, shortSubjectLabel } from "@/lib/exams/labels";
import type { ExamView, SignatureMode } from "@/lib/exams/types";

const SERIF = { fontFamily: '"Times New Roman", Times, serif' };
const NAVY = "#0b2a6b";
const BAND = "#bdd7ee";
const LINK = "#0563c1";
/** The letterhead's lettering: Algerian for the name, Rockwell for the details, as on the school's stationery. */
const DISPLAY = 'Algerian, "Castellar", "Times New Roman", serif';
const SLAB = 'Rockwell, "Rockwell Nova", "Roboto Slab", Georgia, serif';

const BR = "\n";

/** Offered as a starting point the first time someone turns the instructions on. */
const DEFAULT_INSTRUCTIONS = [
  "Students must reach the school at least 15 minutes before the examination begins.",
  "Carrying the school identity card / admit card is compulsory on every examination day.",
  "Students must bring their own stationery. Mobile phones and written material are not allowed in the examination hall.",
  "Any student found using unfair means will be dealt with strictly as per school rules.",
].join(BR);

const lines = (text: string) =>
  text
    .split(BR)
    .map((l) => l.trim())
    .filter(Boolean);

/** The circulated date sheet: one A4 page laid out like the school's own. Save as PDF from the print dialog. */
export default function DateSheetPrintPage({ params }: PageProps<"/exams/[id]/print">) {
  const { id } = use(params);
  const gate = useExamsGate();
  const toast = useToast();
  const [exam, setExam] = useState<ExamView | null>(null);
  const [signature, setSignature] = useState<string | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overflow, setOverflow] = useState(false);
  // the instructions being edited, or null when the editor is closed
  const [draftNotes, setDraftNotes] = useState<string | null>(null);
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
    // the letterhead fonts change the measurements once they load
    void document.fonts?.ready.then(check);
    const ro = new ResizeObserver(check);
    ro.observe(main);
    return () => ro.disconnect();
  }, [exam, signature]);

  /** Shows the change at once and saves it; resolves false (after saying why) if the save failed. */
  const save = async (patch: Partial<Pick<ExamView, "signatureMode" | "showInstructions" | "instructions">>): Promise<boolean> => {
    if (!exam) return false;
    const before = exam;
    setExam({ ...exam, ...patch });
    try {
      setExam(await api<ExamView>(`/api/exams/${id}`, { method: "PATCH", json: patch }));
      return true;
    } catch (e) {
      // show what is really saved, so nothing unsaved gets printed
      setExam(before);
      toast.error(e instanceof Error ? e.message : "Could not save");
      return false;
    }
  };
  const setMode = (signatureMode: SignatureMode) => save({ signatureMode });
  // the first time, start from the usual instructions so there is something to edit
  const toggleNotes = (on: boolean) => save(on && !lines(exam?.instructions ?? "").length ? { showInstructions: true, instructions: DEFAULT_INSTRUCTIONS } : { showInstructions: on });

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
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={exam.showInstructions} onChange={(e) => toggleNotes(e.target.checked)} />
            Instructions
          </label>
          {exam.showInstructions && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraftNotes(exam.instructions || DEFAULT_INSTRUCTIONS)}>
              <Pencil size={13} /> Edit instructions
            </button>
          )}
          {exam.signatureMode === "SIGNED" && !signature && <span className="text-xs text-slate-600">No signature uploaded yet — prints a blank line to sign.</span>}
          {exam.status === "DRAFT" && <span className="text-xs text-amber-700">Draft — prints with a DRAFT watermark. Mark it Circulated to remove it.</span>}
          {overflow && <span className="text-xs font-semibold text-red-700">Too long for one A4 page — the bottom is cut off. Hide the instructions, or remove empty dates or classes.</span>}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => window.print()} autoFocus>
          <Printer size={15} /> Print / Save as PDF
        </button>
      </div>

      <div className="flex justify-center py-8 print:block print:p-0">
        <article ref={sheet} className="relative flex flex-col overflow-hidden bg-white text-black shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
          {/* faint logo watermark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEFAULT_SCHOOL_LOGO} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-[52%] w-[140mm] -translate-x-1/2 -translate-y-1/2 opacity-[0.08]" />
          {exam.status === "DRAFT" && (
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[35deg] text-[110pt] font-black tracking-widest text-slate-900 opacity-[0.07]">
              DRAFT
            </span>
          )}

          {/* letterhead, as on the school's own stationery */}
          <header className="relative h-[42mm] shrink-0">
            <div className="absolute inset-x-0 top-[9mm] h-[24mm]" style={{ background: BAND }} aria-hidden />
            <div className="absolute left-[7mm] top-[5.5mm] flex h-[36mm] w-[34mm] items-center justify-center" style={{ background: "#fdf0c8" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DEFAULT_SCHOOL_LOGO} alt="School logo" className="h-[31mm] w-[31mm] object-contain" />
            </div>
            <div className="absolute left-[44mm] right-[4mm] top-[10mm]" style={{ color: NAVY }}>
              <h1 className="whitespace-nowrap text-center text-[18.5pt] uppercase leading-none tracking-[0.01em]" style={{ fontFamily: DISPLAY }}>
                {SCHOOL_PRINT_NAME}
              </h1>
              <div className="mt-[1.5mm] grid grid-cols-[1fr_auto_1fr] items-start gap-[3mm] text-[10.5pt] font-bold leading-[1.1]" style={{ fontFamily: SLAB }}>
                <div>
                  Dise Code: {SCHOOL_DISE_CODE}
                  <br />
                  Established: {SCHOOL_ESTABLISHED_YEAR}
                </div>
                <div className="text-center text-[13pt] uppercase leading-[1.15]" style={{ fontFamily: DISPLAY }}>
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

          <main className="relative flex min-h-0 flex-1 flex-col px-[10mm] pt-[1mm]" style={SERIF}>
            <div className="flex justify-between text-[10.5pt]">
              <span>
                Ref. No.: <span className="inline-block w-[38mm] border-b border-dotted border-black" />
              </span>
              <span>
                Date: <b>{formatDMY(todayIST())}</b>
              </span>
            </div>

            <h2 className="mt-[1mm] text-center leading-tight">
              <span className="inline-block border-[0.5mm] border-black px-[8mm] py-[0.5mm] text-[14pt] font-bold tracking-[0.25em]">DATE SHEET</span>
              <span className="mt-[1.5mm] block text-[13pt] font-bold uppercase">
                {exam.name} <span className="text-[11pt] font-normal normal-case">(Session {exam.academicSession.replace("–", "-")})</span>
              </span>
            </h2>

            {blocks.length === 0 && <p className="mt-[20mm] text-center text-[12pt] text-slate-500">This date sheet has no dates or classes yet.</p>}

            {blocks.map((b) => (
              <table key={b.id} className="mt-[3mm] w-full border-collapse text-center text-[10.5pt]">
                <thead>
                  <tr>
                    <th colSpan={b.dates.length + 1} className="border border-black px-[2mm] py-[0.6mm]" style={{ background: "#e9edf5" }}>
                      <span className="flex items-baseline justify-between gap-[3mm]">
                        <span className="text-[11pt] font-bold uppercase tracking-wide">{b.title}</span>
                        {b.timeText && <span className="text-[10pt] font-semibold">Time: {b.timeText}</span>}
                      </span>
                    </th>
                  </tr>
                  <tr style={{ background: "#f6f7fa" }}>
                    <th className="w-[17mm] border border-black px-1 py-[0.4mm] text-[10pt] font-bold">Class</th>
                    {b.dates.map((d) => (
                      <th key={d} className="border border-black px-1 py-[0.4mm] leading-tight">
                        <span className="block text-[10pt] font-bold">{formatDMY(d)}</span>
                        <span className="block text-[9pt] font-semibold italic">{weekdayName(d)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.classes.map((c) => (
                    <tr key={c}>
                      <td className="border border-black px-1 py-[1.1mm] font-bold">{shortClassLabel(c)}</td>
                      {b.dates.map((d) => {
                        const s = subjectAt(b.id, c, d);
                        return (
                          <td key={d} className="border border-black px-1 py-[1.1mm] leading-tight">
                            {s || "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

            {exam.showInstructions && lines(exam.instructions).length > 0 && blocks.length > 0 && (
              <section className="mt-[3mm] text-[9.5pt] leading-snug">
                <h3 className="text-[10pt] font-bold underline">Important Instructions:</h3>
                <ol className="mt-[0.5mm] list-decimal pl-[6mm]">
                  {lines(exam.instructions).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
              </section>
            )}

            <div className="mt-auto flex items-end justify-between pb-[2mm] pt-[2mm]">
              <div className="flex w-[50mm] flex-col items-center">
                <span className="mb-[1mm] block h-[11mm] w-full border-b border-black" />
                <span className="text-[11pt] font-bold">Exam In-charge</span>
              </div>
              <div className="flex w-[50mm] flex-col items-center">
                {signed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/uploads/${signature}`} alt="Principal's signature and seal" className="h-[16mm] max-w-[50mm] object-contain" />
                ) : (
                  <span className="mb-[1mm] block h-[11mm] w-full border-b border-black" />
                )}
                <span className="text-[11pt] font-bold">Principal</span>
              </div>
            </div>
          </main>

          <footer className="shrink-0 px-[8mm] pb-[3mm] pt-[2.5mm] text-[10.5pt] font-bold" style={{ background: BAND, color: NAVY, fontFamily: SLAB }}>
            <p className="text-center text-[11pt]">{SCHOOL_ADDRESS}</p>
            <p className="mt-[1mm] flex justify-between text-[9.5pt]">
              <span>{SCHOOL_PHONES}</span>
              <span className="underline" style={{ color: LINK }}>
                {SCHOOL_WEBSITE}
              </span>
              <span className="underline" style={{ color: LINK }}>
                {SCHOOL_EMAIL}
              </span>
            </p>
          </footer>
        </article>
      </div>
      {draftNotes !== null && (
        <Modal
          title="Instructions on the date sheet"
          subtitle="One instruction per line. They print as a numbered list under the timetable."
          onClose={() => setDraftNotes(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost mr-auto" onClick={() => setDraftNotes(DEFAULT_INSTRUCTIONS)}>
                Reset to default
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setDraftNotes(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  if (await save({ instructions: lines(draftNotes).join(BR) })) setDraftNotes(null);
                }}
              >
                Save
              </button>
            </>
          }
        >
          <textarea
            className="input min-h-[180px] w-full font-mono text-sm leading-relaxed"
            value={draftNotes}
            maxLength={2000}
            aria-label="Instructions, one per line"
            onChange={(e) => setDraftNotes(e.target.value)}
          />
        </Modal>
      )}
    </div>
  );
}
