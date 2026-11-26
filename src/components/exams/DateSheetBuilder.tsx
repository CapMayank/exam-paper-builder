"use client";

import { Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Modal, useConfirm, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { weekdayName } from "@/lib/exams/dates";
import { shortClassLabel } from "@/lib/exams/labels";
import type { BlockView, ExamView } from "@/lib/exams/types";
import type { AcademicClassDto } from "@/lib/types";
import { SlotStatusBadge } from "./SlotStatusBadge";

type Candidate = { id: string; title: string; paperSet: string };
type Ambiguous = { slotId: string; label: string; candidates: Candidate[] };

/** The date sheet as the school prints it: blocks of date columns × class rows, one subject per cell. */
export function DateSheetBuilder({ exam, classes, onChange }: { exam: ExamView; classes: AcademicClassDto[]; onChange: (v: ExamView) => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [ambiguous, setAmbiguous] = useState<Ambiguous | null>(null);
  const blocks = [...exam.blocks].sort((a, b) => a.position - b.position);
  const used = new Set(blocks.flatMap((b) => b.classes));
  const freeClasses = classes.filter((c) => !used.has(c.name));
  const classByName = new Map(classes.map((c) => [c.name, c]));

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that change");
      return null;
    }
  }

  const patchBlock = (b: BlockView, patch: Record<string, unknown>) =>
    run(async () => onChange(await api<ExamView>(`/api/exams/${exam.id}/blocks/${b.id}`, { method: "PATCH", json: patch })));

  const addBlock = () =>
    run(async () =>
      onChange(await api<ExamView>(`/api/exams/${exam.id}/blocks`, { method: "POST", json: { title: blocks.length ? "New block" : "High / Higher Secondary School", timeText: "11:00 am to 02:00 pm" } })),
    );

  const deleteBlock = async (b: BlockView) => {
    const n = exam.slots.filter((s) => s.blockId === b.id).length;
    if (n && !(await confirm({ title: `Delete “${b.title}”?`, message: `Its ${n} scheduled paper${n === 1 ? "" : "s"} come off the date sheet.`, tone: "danger" }))) return;
    await run(async () => onChange(await api<ExamView>(`/api/exams/${exam.id}/blocks/${b.id}`, { method: "DELETE" })));
  };

  const removeDate = async (b: BlockView, date: string) => {
    const n = exam.slots.filter((s) => s.blockId === b.id && s.examDate === date).length;
    if (n && !(await confirm({ title: "Remove this date?", message: `${n} paper${n === 1 ? "" : "s"} on it come off the date sheet.`, tone: "danger" }))) return;
    await patchBlock(b, { removeDate: date });
  };

  const removeClass = async (b: BlockView, className: string) => {
    const n = exam.slots.filter((s) => s.blockId === b.id && s.className === className).length;
    if (n && !(await confirm({ title: `Remove ${className}?`, message: `Its ${n} paper${n === 1 ? "" : "s"} come off the date sheet.`, tone: "danger" }))) return;
    await patchBlock(b, { removeClass: className });
  };

  const setCell = (b: BlockView, className: string, date: string, subject: string | null) =>
    run(async () => {
      const res = await api<{ exam: ExamView; ambiguousCandidates?: Candidate[] }>(`/api/exams/${exam.id}/cells`, {
        method: "PUT",
        json: { blockId: b.id, className, date, subject },
      });
      onChange(res.exam);
      const slot = res.exam.slots.find((s) => s.blockId === b.id && s.className === className && s.examDate === date);
      if (slot && res.ambiguousCandidates?.length) {
        setAmbiguous({ slotId: slot.id, label: `${shortClassLabel(className)} · ${subject}`, candidates: res.ambiguousCandidates });
      }
    });

  const linkPaper = (slotId: string, paperId: string | null) =>
    run(async () => {
      onChange(await api<ExamView>(`/api/exams/${exam.id}/slots/${slotId}`, { method: "PATCH", json: { paperId } }));
      setAmbiguous(null);
    });

  return (
    <div className="space-y-6">
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          Start with a block, such as “High / Higher Secondary School”, then add its dates and classes. Add only the classes taking this exam.
        </p>
      )}

      {blocks.map((b) => {
        const slotAt = (c: string, d: string) => exam.slots.find((s) => s.blockId === b.id && s.className === c && s.examDate === d);
        return (
          <section key={b.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="input min-w-[220px] flex-1 font-semibold"
                defaultValue={b.title}
                aria-label="Block title"
                onBlur={(e) => e.target.value.trim() && e.target.value !== b.title && patchBlock(b, { title: e.target.value.trim() })}
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                TIME
                <input
                  className="input w-48"
                  defaultValue={b.timeText}
                  aria-label="Exam time"
                  onBlur={(e) => e.target.value !== b.timeText && patchBlock(b, { timeText: e.target.value })}
                />
              </label>
              <button type="button" className="btn btn-icon btn-ghost text-red-700" title="Delete block" onClick={() => deleteBlock(b)}>
                <Trash2 size={15} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold text-slate-600">Class</th>
                    {b.dates.map((d) => (
                      <th key={d} className="min-w-[150px] border border-slate-200 bg-slate-50 px-1.5 py-1 align-top">
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            className="input w-full py-1 text-xs"
                            value={d}
                            aria-label="Exam date"
                            onChange={(e) => e.target.value && e.target.value !== d && patchBlock(b, { moveDate: { from: d, to: e.target.value } })}
                          />
                          <button type="button" className="btn btn-icon btn-ghost" title="Remove date" onClick={() => removeDate(b, d)}>
                            <X size={13} />
                          </button>
                        </div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-700">{weekdayName(d)}</div>
                      </th>
                    ))}
                    <th className="w-[150px] border border-dashed border-slate-300 px-1.5 py-1 align-top">
                      <label className="block text-[11px] font-medium text-slate-500">+ Add date</label>
                      <input
                        type="date"
                        className="input w-full py-1 text-xs"
                        value=""
                        aria-label="Add a date"
                        onChange={(e) => e.target.value && patchBlock(b, { addDate: e.target.value })}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {b.classes.map((c) => {
                    const subjects = classByName.get(c)?.subjects.map((s) => s.name) ?? [];
                    return (
                      <tr key={c}>
                        <th className="whitespace-nowrap border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-800">
                          <span className="inline-flex items-center gap-1">
                            {shortClassLabel(c)}
                            <button type="button" className="btn btn-icon btn-ghost" title={`Remove ${c}`} onClick={() => removeClass(b, c)}>
                              <X size={12} />
                            </button>
                          </span>
                        </th>
                        {b.dates.map((d) => {
                          const slot = slotAt(c, d);
                          const options = slot && !subjects.includes(slot.subject) ? [slot.subject, ...subjects] : subjects;
                          return (
                            <td key={d} className="border border-slate-200 px-1.5 py-1 align-top">
                              <select
                                className="input w-full py-1 text-sm"
                                value={slot?.subject ?? ""}
                                aria-label={`${c} on ${d}`}
                                onChange={(e) => setCell(b, c, d, e.target.value || null)}
                              >
                                <option value="">–</option>
                                {options.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              {slot && (
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  <SlotStatusBadge status={slot.status} warnings={slot.warnings} />
                                  {slot.paper && (
                                    <Link href={`/papers/${slot.paper.id}`} className="max-w-[140px] truncate text-[11px] text-indigo-700 hover:underline" title={slot.paper.title}>
                                      {slot.paper.title}
                                    </Link>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="border border-dashed border-slate-200" />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <select className="input w-56 text-sm" value="" aria-label="Add a class" onChange={(e) => e.target.value && patchBlock(b, { addClass: e.target.value })}>
              <option value="">+ Add class…</option>
              {freeClasses.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </section>
        );
      })}

      <button type="button" className="btn btn-secondary" onClick={addBlock}>
        <Plus size={15} /> Add block
      </button>

      {ambiguous && (
        <Modal title="Which paper goes on the date sheet?" subtitle={ambiguous.label} onClose={() => setAmbiguous(null)}>
          <ul className="space-y-2">
            {ambiguous.candidates.map((p) => (
              <li key={p.id}>
                <button type="button" className="btn btn-secondary w-full justify-start" onClick={() => linkPaper(ambiguous.slotId, p.id)}>
                  {p.title}
                  {p.paperSet && <span className="text-xs text-slate-500"> · Set {p.paperSet}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}
