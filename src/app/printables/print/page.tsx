"use client";

import { ArrowLeft, Lock, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { BackToPaperLink } from "@/components/BackToPaperLink";
import { PrintableSheet, sheetSize } from "@/components/printables/PrintableSheet";
import { useAdminGate } from "@/components/printables/useAdminGate";
import { EmptyState, Spinner } from "@/components/ui";
import { PRINTABLES_OUTPUT_TAB } from "@/lib/paperTabs";
import { fromQuery, getPrintable } from "@/lib/printables";

type Job = ReturnType<typeof fromQuery>;

/** Print view for one printable: N copies, each its own A4 page. Opened from /printables in a reused tab. */
export default function PrintablesPrintPage() {
  const gate = useAdminGate();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    // Read after mount so server and first client render agree (same as the paper print view).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJob(fromQuery(new URLSearchParams(window.location.search)));
  }, []);

  if (gate === "forbidden") {
    return (
      <main className="mx-auto max-w-lg p-10">
        <EmptyState icon={Lock} title="Only administrators can use printables" description="Ask an administrator to print graph paper, maps or answer sheets." />
      </main>
    );
  }
  if (gate === "loading" || !job) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        <Spinner size="lg" />
      </main>
    );
  }

  const p = getPrintable(job.id)!;
  const { w, h } = sheetSize(job.id);
  const orientation = p.landscape ? "landscape" : "portrait";

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      <style>{`@page { size: A4 ${orientation}; margin: 0; }`}</style>
      <div className="no-print sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <BackToPaperLink tabName={PRINTABLES_OUTPUT_TAB} href="/printables" className="btn btn-ghost btn-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Back to printables
          </BackToPaperLink>
          <div className="h-4 w-px bg-slate-200" />
          <span className="font-display font-semibold text-slate-800">{p.title}</span>
          <span className="text-sm text-slate-500">
            {job.copies} {job.copies === 1 ? "copy" : "copies"} · A4 {orientation}
          </span>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => window.print()} autoFocus>
          <Printer size={15} /> Print
        </button>
      </div>
      <div className="flex flex-col items-center gap-6 py-8 print:block print:gap-0 print:p-0">
        {Array.from({ length: job.copies }, (_, i) => (
          <div
            key={i}
            className="bg-white shadow-lg print:shadow-none"
            style={{ width: `${w}mm`, height: `${h}mm`, breakAfter: i < job.copies - 1 ? "page" : "auto", overflow: "hidden" }}
          >
            <PrintableSheet id={job.id} opts={job.opts} school={job.school} subtitle={job.subtitle} />
          </div>
        ))}
      </div>
    </div>
  );
}
