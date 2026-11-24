"use client";

import { BookOpenText, Check, FlaskConical, Globe2, Lock, Printer, RotateCcw, Sigma, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PrintableSheet } from "@/components/printables/PrintableSheet";
import { useAdminGate } from "@/components/printables/useAdminGate";
import { EmptyState, ListSkeleton, PageHeader } from "@/components/ui";
import { PRINTABLES_OUTPUT_TAB } from "@/lib/paperTabs";
import {
  DEFAULT_PRINTABLE_SCHOOL,
  getPrintable,
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
  const [lastInGroup, setLastInGroup] = useState<Partial<Record<PrintableGroup, PrintableId>>>({});
  const [school, setSchool] = useState(DEFAULT_PRINTABLE_SCHOOL);
  const [subtitle, setSubtitle] = useState("");

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
  const group = printable.group;
  const opts = useMemo(() => optsById[id] ?? parseOptions(id, {}), [optsById, id]);
  const isDefault = useMemo(() => JSON.stringify(opts) === JSON.stringify(parseOptions(id, {})), [opts, id]);
  const schoolName = school.trim() || DEFAULT_PRINTABLE_SCHOOL;
  const printHref = `/printables/print?${toQuery(id, opts, { school: schoolName, subtitle })}`;
  const inGroup = PRINTABLES.filter((p) => p.group === group);

  function choose(next: PrintableId) {
    setId(next);
    const g = getPrintable(next)!.group;
    setLastInGroup((all) => ({ ...all, [g]: next }));
  }

  function chooseGroup(g: PrintableGroup) {
    if (g === group) return;
    setId(lastInGroup[g] ?? PRINTABLES.find((p) => p.group === g)!.id);
  }

  function setOpt(key: string, value: string | number) {
    setOptsById((all) => ({ ...all, [id]: parseOptions(id, { ...opts, [key]: value }) }));
  }

  function resetOpts() {
    setOptsById((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });
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

      {/* Step 1: choose a sheet */}
      <section aria-labelledby="pr-choose" className="card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StepTitle n={1} id="pr-choose">
            Choose a sheet
          </StepTitle>
          <div aria-label="Subject" className="segmented max-w-full overflow-x-auto">
            {PRINTABLE_GROUPS.map((g) => {
              const Icon = GROUP_ICON[g];
              const count = PRINTABLES.filter((p) => p.group === g).length;
              return (
                <button key={g} type="button" aria-pressed={g === group} onClick={() => chooseGroup(g)} className="shrink-0">
                  <Icon size={14} className={g === group ? "text-indigo-600" : "text-slate-400"} />
                  {g}
                  <span className="rounded-full bg-slate-100 px-1.5 text-[10px] leading-4 text-slate-500">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <ul aria-label={`${group} sheets`} className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {inGroup.map((p) => {
            const active = p.id === id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => choose(p.id)}
                  aria-pressed={active}
                  className={`relative flex h-full w-full flex-col rounded-xl border px-3.5 py-3 text-left transition ${
                    active ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-semibold ${active ? "text-indigo-900" : "text-slate-800"}`}>{p.title}</span>
                    {active ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    ) : (
                      p.landscape && <span className="badge shrink-0 px-1.5 text-[10px]">Landscape</span>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs leading-snug text-slate-500">{p.blurb}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Steps 2-3: preview beside settings */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-label="Preview" className="min-w-0">
          <div className="card overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
              <div className="min-w-0">
                <h2 className="truncate font-display text-sm font-semibold text-slate-900">{printable.title}</h2>
                <p className="text-xs text-slate-500">{printable.blurb}</p>
              </div>
              <span className="badge shrink-0">A4 · {printable.landscape ? "Landscape" : "Portrait"}</span>
            </div>
            <div className="graph-paper flex justify-center bg-slate-50 p-4 sm:p-8">
              <div className={`w-full bg-white shadow-xl ring-1 ring-slate-300 ${printable.landscape ? "max-w-[46rem]" : "max-w-[34rem]"}`}>
                <PrintableSheet id={id} opts={opts} school={schoolName} subtitle={subtitle} preview />
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">Grids print true to size. Set the printer to 100% / “Actual size”.</p>
        </section>

        <aside aria-label="Settings" className="lg:sticky lg:top-20 lg:self-start">
          <div className="card divide-y divide-slate-200 p-0">
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <StepTitle n={2}>Sheet options</StepTitle>
                {printable.options.length > 0 && !isDefault && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={resetOpts}>
                    <RotateCcw size={13} /> Reset
                  </button>
                )}
              </div>
              {printable.options.length === 0 && <p className="text-xs text-slate-500">This sheet has no options. It prints as shown.</p>}
              {printable.options.map((o) =>
                o.kind === "select" ? (
                  <fieldset key={o.key}>
                    <legend className="label">{o.label}</legend>
                    <div className={o.choices.length === 2 && o.choices.every((c) => c.label.length <= 12) ? "segmented w-full" : "space-y-1.5"}>
                      {o.choices.map((c) =>
                        o.choices.length === 2 && o.choices.every((x) => x.label.length <= 12) ? (
                          <button key={c.value} type="button" aria-pressed={String(opts[o.key]) === c.value} onClick={() => setOpt(o.key, c.value)} className="flex-1">
                            {c.label}
                          </button>
                        ) : (
                          <ChoiceRow key={c.value} name={`opt-${o.key}`} checked={String(opts[o.key]) === c.value} onChange={() => setOpt(o.key, c.value)}>
                            {c.label}
                          </ChoiceRow>
                        ),
                      )}
                    </div>
                  </fieldset>
                ) : (
                  <div key={o.key}>
                    <label className="label" htmlFor={`opt-${o.key}`}>
                      {o.label}
                    </label>
                    <NumberField id={`opt-${o.key}`} value={Number(opts[o.key])} min={o.min} max={o.max} step={o.step} onCommit={(n) => setOpt(o.key, n)} />
                  </div>
                ),
              )}
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <StepTitle n={3}>Sheet header</StepTitle>
              <div>
                <label className="label" htmlFor="pr-school">
                  School name
                </label>
                <input id="pr-school" className="input" value={school} onChange={(e) => saveSchool(e.target.value)} placeholder={DEFAULT_PRINTABLE_SCHOOL} />
                <p className="mt-1 text-xs text-slate-500">Saved on this device for next time.</p>
              </div>
              <div>
                <label className="label" htmlFor="pr-sub">
                  Line under the name <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input id="pr-sub" className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Half-Yearly Exam · Class 9 · Mathematics" />
              </div>
            </div>

            <div className="space-y-3 rounded-b-2xl bg-slate-50 p-4 sm:p-5">
              <p className="text-xs text-slate-500">Opens one sheet. Set how many copies you need in the print dialog.</p>
              <Link href={printHref} target={PRINTABLES_OUTPUT_TAB} className="btn btn-primary btn-lg w-full">
                <Printer size={17} /> Print sheet
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StepTitle({ n, id, children }: { n: number; id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">{n}</span>
      {children}
    </h2>
  );
}

function ChoiceRow({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
        checked ? "border-indigo-500 bg-indigo-50/70 text-indigo-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="shrink-0" />
      <span>{children}</span>
    </label>
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
  className = "",
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (n: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const parse = (raw: string) => (raw.trim() === "" ? Number.NaN : Number(raw));
  return (
    <input
      id={id}
      className={`input ${className}`}
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
