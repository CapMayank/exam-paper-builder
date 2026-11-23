"use client";

import { BookOpenText, FlaskConical, Globe2, Lock, Printer, Sigma, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PrintableSheet } from "@/components/printables/PrintableSheet";
import { useAdminGate } from "@/components/printables/useAdminGate";
import { EmptyState, ListSkeleton, PageHeader } from "@/components/ui";
import { PRINTABLES_OUTPUT_TAB } from "@/lib/paperTabs";
import {
  clampCopies,
  DEFAULT_PRINTABLE_SCHOOL,
  getPrintable,
  MAX_COPIES,
  parseOptions,
  PRINTABLE_GROUPS,
  PRINTABLES,
  toQuery,
  type PrintableGroup,
  type PrintableId,
  type PrintableOptions,
} from "@/lib/printables";

const SCHOOL_KEY = "epb:printables:schoolName";
const GROUP_ICON: Record<PrintableGroup, LucideIcon> = {
  Maths: Sigma,
  "Social Science": Globe2,
  Science: FlaskConical,
  Languages: BookOpenText,
};

/** Admin: graph paper, outline maps and answer sheets that go out with exam papers. */
export default function PrintablesPage() {
  const gate = useAdminGate();
  const [id, setId] = useState<PrintableId>("graph");
  const [optsById, setOptsById] = useState<Partial<Record<PrintableId, PrintableOptions>>>({});
  const [school, setSchool] = useState(DEFAULT_PRINTABLE_SCHOOL);
  const [subtitle, setSubtitle] = useState("");
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCHOOL_KEY);
      // Read after mount so server and first client render agree.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved?.trim()) setSchool(saved);
    } catch {
      // storage blocked: keep the default name
    }
  }, []);

  const printable = getPrintable(id)!;
  const opts = useMemo(() => optsById[id] ?? parseOptions(id, {}), [optsById, id]);
  const schoolName = school.trim() || DEFAULT_PRINTABLE_SCHOOL;
  const printHref = `/printables/print?${toQuery(id, opts, { copies, school: schoolName, subtitle })}`;

  function setOpt(key: string, value: string | number) {
    setOptsById((all) => ({ ...all, [id]: parseOptions(id, { ...opts, [key]: value }) }));
  }

  function saveSchool(value: string) {
    setSchool(value);
    try {
      localStorage.setItem(SCHOOL_KEY, value);
    } catch {
      // storage blocked: the name still applies to this session
    }
  }

  if (gate === "forbidden") {
    return (
      <div className="space-y-6">
        <PageHeader title="Printables" icon={Printer} />
        <EmptyState icon={Lock} title="Only administrators can use printables" description="Ask an administrator to print graph paper, maps or answer sheets." />
      </div>
    );
  }
  if (gate === "loading") {
    return (
      <div className="space-y-6">
        <PageHeader title="Printables" icon={Printer} />
        <ListSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Printables"
        icon={Printer}
        description="Graph paper, outline maps and answer sheets to hand out with a paper. Every sheet carries the school name, a Roll No. box and a Q. No. box."
      />

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_19rem]">
        {/* Catalogue */}
        <nav aria-label="Printables" className="space-y-5">
          {PRINTABLE_GROUPS.map((group) => {
            const Icon = GROUP_ICON[group];
            return (
              <section key={group} aria-labelledby={`grp-${group}`}>
                <h2 id={`grp-${group}`} className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Icon size={14} className="text-indigo-600" /> {group}
                </h2>
                <ul className="space-y-1.5">
                  {PRINTABLES.filter((p) => p.group === group).map((p) => {
                    const active = p.id === id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setId(p.id)}
                          aria-pressed={active}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                            active ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`block text-sm font-semibold ${active ? "text-indigo-900" : "text-slate-800"}`}>{p.title}</span>
                          <span className="mt-0.5 block text-xs leading-snug text-slate-500">{p.blurb}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </nav>

        {/* Preview */}
        <section aria-label="Preview" className="min-w-0 self-start xl:sticky xl:top-16">
          <div className="card graph-paper flex justify-center p-4 sm:p-6">
            <div className={`w-full shadow-lg ring-1 ring-slate-300 ${printable.landscape ? "max-w-[46rem]" : "max-w-[32rem]"}`}>
              <PrintableSheet id={id} opts={opts} school={schoolName} subtitle={subtitle} preview />
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            Preview of one A4 {printable.landscape ? "landscape" : "portrait"} page. Grids print true to size; set the printer to 100% / “Actual size”.
          </p>
        </section>

        {/* Options */}
        <aside aria-label="Options" className="lg:col-start-2 xl:col-start-auto">
          <div className="card space-y-4 xl:sticky xl:top-20">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">{printable.title}</h2>
              <p className="text-xs text-slate-500">{printable.group}</p>
            </div>

            {printable.options.map((o) => (
              <div key={o.key}>
                <label className="label" htmlFor={`opt-${o.key}`}>
                  {o.label}
                </label>
                {o.kind === "select" ? (
                  <select id={`opt-${o.key}`} className="input" value={String(opts[o.key])} onChange={(e) => setOpt(o.key, e.target.value)}>
                    {o.choices.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <NumberField id={`opt-${o.key}`} value={Number(opts[o.key])} min={o.min} max={o.max} step={o.step} onCommit={(n) => setOpt(o.key, n)} />
                )}
              </div>
            ))}

            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div>
                <label className="label" htmlFor="pr-school">
                  School name
                </label>
                <input id="pr-school" className="input" value={school} onChange={(e) => saveSchool(e.target.value)} placeholder={DEFAULT_PRINTABLE_SCHOOL} />
              </div>
              <div>
                <label className="label" htmlFor="pr-sub">
                  Line under the name <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input id="pr-sub" className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Half-Yearly Exam · Class 9 · Mathematics" />
              </div>
              <div>
                <label className="label" htmlFor="pr-copies">
                  Copies
                </label>
                <NumberField id="pr-copies" value={copies} min={1} max={MAX_COPIES} step={1} onCommit={(n) => setCopies(clampCopies(n))} />
                <p className="mt-1 text-xs text-slate-500">Up to {MAX_COPIES} per print. Each copy is its own A4 page.</p>
              </div>
            </div>

            <Link href={printHref} target={PRINTABLES_OUTPUT_TAB} className="btn btn-primary btn-lg w-full">
              <Printer size={17} /> Print {copies > 1 ? `${copies} copies` : ""}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * A number box that lets you type freely ("-", an empty box, "-5") and only applies values in range while typing;
 * on blur the typed value is applied (the caller clamps it) and the box shows the applied value again.
 */
function NumberField({
  id,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const parse = (raw: string) => (raw.trim() === "" ? Number.NaN : Number(raw));
  return (
    <input
      id={id}
      className="input"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parse(e.target.value);
        if (Number.isFinite(n) && n >= min && n <= max) onCommit(n);
      }}
      onBlur={() => {
        if (draft === null) return;
        const n = parse(draft);
        if (Number.isFinite(n)) onCommit(n);
        setDraft(null);
      }}
    />
  );
}
