"use client";

import { CalendarPlus, Check, Clock, ExternalLink, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Modal, useConfirm, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { nextExamDay, shortDateLabel, weekdayName } from "@/lib/exams/dates";
import { shortClassLabel } from "@/lib/exams/labels";
import type { BlockView, ExamView, SlotStatus, SlotView } from "@/lib/exams/types";
import type { AcademicClassDto } from "@/lib/types";
import { SLOT_STATUS_LABEL, SlotStatusBadge } from "./SlotStatusBadge";

type Candidate = { id: string; title: string; paperSet: string };
type Ambiguous = { slotId: string; label: string; candidates: Candidate[] };
/** Which popover is open: a cell's subject picker, a date's menu, or the add-a-day picker. */
type Open =
  | {
      kind: "cell";
      blockId: string;
      className: string;
      date: string;
      index: number;
      anchor: HTMLElement;
    }
  | { kind: "date"; blockId: string; date: string; anchor: HTMLElement }
  | { kind: "add"; blockId: string; anchor: HTMLElement }
  | null;

const DOT: Record<SlotStatus, string> = {
  NO_BLUEPRINT: "bg-rose-500",
  NO_PAPER: "bg-slate-400",
  DRAFT: "bg-sky-500",
  FINAL: "bg-amber-500",
  PRINTED: "bg-emerald-500",
};

/** The date sheet as the school prints it: blocks of date columns × class rows. Click a cell to pick its subject. */
export function DateSheetBuilder({ exam, classes, onChange }: { exam: ExamView; classes: AcademicClassDto[]; onChange: (v: ExamView) => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [ambiguous, setAmbiguous] = useState<Ambiguous | null>(null);
  const [open, setOpen] = useState<Open>(null);
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

  /** Resolves true once saved; false (after showing why) when the server refused it. */
  const patchBlock = async (b: BlockView, patch: Record<string, unknown>): Promise<boolean> =>
    (await run(async () => {
      onChange(
        await api<ExamView>(`/api/exams/${exam.id}/blocks/${b.id}`, {
          method: "PATCH",
          json: patch,
        }),
      );
      return true;
    })) === true;

  const addBlock = () =>
    run(async () =>
      onChange(
        await api<ExamView>(`/api/exams/${exam.id}/blocks`, {
          method: "POST",
          json: {
            title: blocks.length ? "New block" : "High / Higher Secondary School",
            timeText: "11:00 am to 02:00 pm",
          },
        }),
      ),
    );

  const deleteBlock = async (b: BlockView) => {
    const n = exam.slots.filter((s) => s.blockId === b.id).length;
    if (
      n &&
      !(await confirm({
        title: `Delete “${b.title}”?`,
        message: `Its ${n} scheduled paper${n === 1 ? "" : "s"} come off the date sheet.`,
        tone: "danger",
      }))
    )
      return;
    await run(async () =>
      onChange(
        await api<ExamView>(`/api/exams/${exam.id}/blocks/${b.id}`, {
          method: "DELETE",
        }),
      ),
    );
  };

  const removeDate = async (b: BlockView, date: string) => {
    const n = exam.slots.filter((s) => s.blockId === b.id && s.examDate === date).length;
    if (
      n &&
      !(await confirm({
        title: "Remove this date?",
        message: `${n} paper${n === 1 ? "" : "s"} on it come off the date sheet.`,
        tone: "danger",
      }))
    )
      return;
    await patchBlock(b, { removeDate: date });
  };

  const removeClass = async (b: BlockView, className: string) => {
    const n = exam.slots.filter((s) => s.blockId === b.id && s.className === className).length;
    if (
      n &&
      !(await confirm({
        title: `Remove ${className}?`,
        message: `Its ${n} paper${n === 1 ? "" : "s"} come off the date sheet.`,
        tone: "danger",
      }))
    )
      return;
    await patchBlock(b, { removeClass: className });
  };

  const cellSlots = (b: BlockView, className: string, date: string) => exam.slots.filter((s) => s.blockId === b.id && s.className === className && s.examDate === date);

  /** Saves a cell's subjects (one, or two papers sharing the day such as GK and Drawing). */
  const saveCell = (b: BlockView, className: string, date: string, subjects: string[]) =>
    run(async () => {
      const res = await api<{
        exam: ExamView;
        ambiguousCandidates?: Candidate[];
      }>(`/api/exams/${exam.id}/cells`, {
        method: "PUT",
        json: { blockId: b.id, className, date, subjects },
      });
      onChange(res.exam);
      if (res.ambiguousCandidates?.length) {
        const known = new Set(exam.slots.map((s) => s.id));
        const fresh = res.exam.slots.find((s) => !known.has(s.id) && s.blockId === b.id && s.className === className && s.examDate === date && !s.paper);
        if (fresh)
          setAmbiguous({
            slotId: fresh.id,
            label: `${shortClassLabel(className)} · ${fresh.subject}`,
            candidates: res.ambiguousCandidates,
          });
      }
    });

  /**
   * Changes paper `index` of a cell to `subject` (null removes it). Replacing or removing a paper that is linked or
   * printed asks first: its link and printed mark go.
   */
  const changeCell = async (b: BlockView, className: string, date: string, index: number, subject: string | null) => {
    const current = cellSlots(b, className, date);
    const old = current[index];
    if (old && (old.paper || old.printedAt)) {
      const what = old.printedAt ? "is marked printed" : `is linked to “${old.paper!.title}”`;
      const ok = await confirm({
        title: subject ? `Change ${shortClassLabel(className)} ${old.subject} to ${subject}?` : `Remove ${shortClassLabel(className)} ${old.subject}?`,
        message: `This paper ${what}. ${subject ? "The new subject starts without a paper." : "It comes off the date sheet."}`,
        confirmLabel: subject ? "Change subject" : "Remove",
        tone: "danger",
      });
      if (!ok) return;
    }
    const subjects = current.map((s) => s.subject);
    if (subject) subjects[index] = subject;
    else subjects.splice(index, 1);
    await saveCell(b, className, date, subjects.filter(Boolean));
  };

  const linkPaper = (slotId: string, paperId: string | null) =>
    run(async () => {
      onChange(
        await api<ExamView>(`/api/exams/${exam.id}/slots/${slotId}`, {
          method: "PATCH",
          json: { paperId },
        }),
      );
      setAmbiguous(null);
    });

  const totalCells = blocks.reduce((n, b) => n + b.dates.length * b.classes.length, 0);
  const filledCells = new Set(exam.slots.map((s) => `${s.blockId}|${s.className}|${s.examDate}`)).size;
  const openBlock = open ? blocks.find((b) => b.id === open.blockId) : undefined;

  const addNextDay = (b: BlockView, anchor: HTMLElement) => {
    if (!b.dates.length) return setOpen({ kind: "add", blockId: b.id, anchor });
    const last = [...b.dates].sort().at(-1)!;
    void patchBlock(b, { addDate: nextExamDay(last, b.dates) });
  };

  return (
    <div className="space-y-5">
      {blocks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width: `${totalCells ? (filledCells / totalCells) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{filledCells}</span> of {totalCells} cells filled · {exam.slots.length} paper
              {exam.slots.length === 1 ? "" : "s"}
            </p>
          </div>
          <p className="text-xs text-slate-500">Click a cell to choose its subject. “Next day” skips Sundays.</p>
        </div>
      )}

      {blocks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-semibold text-slate-800">Start your date sheet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            A block is one table on the printed sheet, such as “High / Higher Secondary School”, with its own time. Add one, then its days and classes.
          </p>
          <button type="button" className="btn btn-primary mt-4" onClick={addBlock}>
            <Plus size={15} /> Add first block
          </button>
        </div>
      )}

      {blocks.map((b) => (
        <section key={b.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
            <input
              key={`t-${b.title}`}
              className="min-w-[200px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 font-display text-base font-semibold text-slate-900 hover:border-slate-200 focus:border-indigo-300 focus:bg-white focus:outline-none"
              defaultValue={b.title}
              aria-label="Block title"
              onBlur={(e) => e.target.value.trim() && e.target.value !== b.title && patchBlock(b, { title: e.target.value.trim() })}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 focus-within:border-indigo-300">
              <Clock size={13} />
              <input
                key={`tm-${b.timeText}`}
                className="w-40 bg-transparent text-sm text-slate-800 focus:outline-none"
                defaultValue={b.timeText}
                aria-label="Exam time"
                placeholder="11:00 am to 02:00 pm"
                onBlur={(e) => e.target.value !== b.timeText && patchBlock(b, { timeText: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
            </label>
            <span className="hidden text-xs text-slate-400 sm:inline">
              {b.dates.length} day{b.dates.length === 1 ? "" : "s"} · {b.classes.length} class{b.classes.length === 1 ? "" : "es"}
            </span>
            <button
              type="button"
              className="btn btn-icon btn-ghost text-slate-400 hover:text-red-700"
              title="Delete block"
              aria-label={`Delete ${b.title}`}
              onClick={() => deleteBlock(b)}
            >
              <Trash2 size={15} />
            </button>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="sticky left-0 z-10 min-w-[112px] bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Class</th>
                  {b.dates.map((d) => {
                    const sunday = weekdayName(d) === "Sunday";
                    const [wd, rest] = shortDateLabel(d).split(", ");
                    return (
                      <th key={d} className="min-w-[116px] border-l border-slate-100 px-1.5 py-1.5">
                        <button
                          type="button"
                          className="w-full rounded-lg px-2 py-1 text-center hover:bg-slate-100"
                          title="Change or remove this day"
                          onClick={(e) =>
                            setOpen({
                              kind: "date",
                              blockId: b.id,
                              date: d,
                              anchor: e.currentTarget,
                            })
                          }
                        >
                          <span className={`block text-[11px] font-semibold uppercase tracking-wide ${sunday ? "text-rose-600" : "text-slate-400"}`}>{wd}</span>
                          <span className="block text-sm font-semibold text-slate-900">{rest}</span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="w-[124px] border-l border-slate-100 px-1.5 py-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex-1 whitespace-nowrap rounded-lg border border-dashed border-indigo-300 px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                        title={b.dates.length ? `Adds ${shortDateLabel(nextExamDay([...b.dates].sort().at(-1)!, b.dates))}` : "Pick the first exam day"}
                        onClick={(e) => addNextDay(b, e.currentTarget)}
                      >
                        <Plus size={12} className="mr-0.5 inline" />
                        {b.dates.length ? "Next day" : "Add day"}
                      </button>
                      {b.dates.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost text-slate-500"
                          title="Pick a specific date"
                          aria-label="Pick a specific date"
                          onClick={(e) =>
                            setOpen({
                              kind: "add",
                              blockId: b.id,
                              anchor: e.currentTarget,
                            })
                          }
                        >
                          <CalendarPlus size={15} />
                        </button>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {b.classes.map((c) => {
                  const subjects = classByName.get(c)?.subjects.map((s) => s.name) ?? [];
                  const scheduled = new Set(exam.slots.filter((s) => s.className === c).map((s) => s.subject));
                  const left = subjects.filter((s) => !scheduled.has(s));
                  return (
                    <tr key={c} className="group border-b border-slate-100 last:border-b-0">
                      <th className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 text-left align-middle">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-900">{shortClassLabel(c)}</span>
                          <button
                            type="button"
                            className="rounded p-0.5 text-slate-300 opacity-0 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                            title={`Remove ${c}`}
                            aria-label={`Remove ${c}`}
                            onClick={() => removeClass(b, c)}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {subjects.length === 0 ? (
                          <Link href="/classes" className="block text-[10px] font-normal text-indigo-700 hover:underline">
                            No subjects yet — add
                          </Link>
                        ) : left.length ? (
                          <span className="block text-[10px] font-medium text-amber-700" title={`Not on the date sheet yet: ${left.join(", ")}`}>
                            {left.length} subject{left.length === 1 ? "" : "s"} left
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-700">
                            <Check size={10} /> All placed
                          </span>
                        )}
                      </th>
                      {b.dates.map((d) => {
                        const inCell = cellSlots(b, c, d);
                        const isOpen = open?.kind === "cell" && open.blockId === b.id && open.className === c && open.date === d;
                        return (
                          <td key={d} className="border-l border-slate-100 p-1 align-middle">
                            <button
                              type="button"
                              aria-label={`${shortClassLabel(c)} on ${shortDateLabel(d)}: ${inCell.map((s) => s.subject).join(" and ") || "empty"}`}
                              onClick={(e) =>
                                setOpen({
                                  kind: "cell",
                                  blockId: b.id,
                                  className: c,
                                  date: d,
                                  index: 0,
                                  anchor: e.currentTarget,
                                })
                              }
                              className={`flex min-h-[38px] w-full flex-col justify-center gap-0.5 rounded-lg px-2 py-1 text-left transition ${isOpen ? "bg-indigo-50 ring-2 ring-indigo-400" : inCell.length ? "hover:bg-slate-100" : "border border-dashed border-transparent text-slate-300 hover:border-slate-300 hover:text-slate-500"}`}
                            >
                              {inCell.length === 0 ? (
                                <span className="text-center text-sm">+</span>
                              ) : (
                                inCell.map((s) => (
                                  <span key={s.id} className="flex items-center gap-1.5 text-[13px] font-medium text-slate-800" title={SLOT_STATUS_LABEL[s.status]}>
                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[s.status]}`} />
                                    <span className="truncate">{s.subject}</span>
                                  </span>
                                ))
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-100" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(freeClasses.length > 0 || b.classes.length === 0) && (
            <footer className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-2.5">
              <select className="input w-48 py-1.5 text-sm" value="" aria-label="Add a class" onChange={(e) => e.target.value && patchBlock(b, { addClass: e.target.value })}>
                <option value="">+ Add class…</option>
                {freeClasses.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {b.classes.length === 0 && <span className="text-xs text-slate-500">Add only the classes taking this exam.</span>}
            </footer>
          )}
        </section>
      ))}

      {blocks.length > 0 && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700"
          onClick={addBlock}
        >
          <Plus size={15} /> Add another block
        </button>
      )}

      {blocks.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-slate-500">
          {(Object.keys(DOT) as SlotStatus[]).map((st) => (
            <span key={st} className="inline-flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${DOT[st]}`} /> {SLOT_STATUS_LABEL[st]}
            </span>
          ))}
        </div>
      )}

      {open && openBlock && (
        <Popover
          anchor={open.anchor}
          label={open.kind === "cell" ? `Subject for ${shortClassLabel(open.className)} on ${shortDateLabel(open.date)}` : open.kind === "date" ? `Change ${shortDateLabel(open.date)}` : "Add an exam day"}
          onClose={() => setOpen(null)}
        >
          {open.kind === "date" && (
            <div className="w-60 space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                {weekdayName(open.date)}, {shortDateLabel(open.date).split(", ")[1]}
              </p>
              <label className="block space-y-1 text-xs font-medium text-slate-600">
                Move to another date
                <DateInput
                  value={open.date}
                  label="Exam date"
                  onCommit={async (to) => {
                    const ok = await patchBlock(openBlock, {
                      moveDate: { from: open.date, to },
                    });
                    if (ok) setOpen(null);
                    return ok;
                  }}
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm w-full justify-center text-red-700"
                onClick={() => {
                  setOpen(null);
                  void removeDate(openBlock, open.date);
                }}
              >
                <Trash2 size={13} /> Remove this day
              </button>
            </div>
          )}

          {open.kind === "add" && (
            <div className="w-56 space-y-1 text-xs font-medium text-slate-600">
              <span>Add an exam day</span>
              <DateInput
                value=""
                label="Add a date"
                autoFocus
                onCommit={async (d) => {
                  const ok = await patchBlock(openBlock, { addDate: d });
                  if (ok) setOpen(null);
                  return ok;
                }}
              />
            </div>
          )}

          {open.kind === "cell" && (
            <CellPicker
              exam={exam}
              className={open.className}
              date={open.date}
              index={open.index}
              inCell={cellSlots(openBlock, open.className, open.date)}
              subjects={classByName.get(open.className)?.subjects.map((s) => s.name) ?? []}
              onIndex={(index) => setOpen({ ...open, index })}
              onPick={async (index, subject) => {
                setOpen(null);
                await changeCell(openBlock, open.className, open.date, index, subject);
              }}
            />
          )}
        </Popover>
      )}

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

/** Pick a cell's subject from the class's list. Subjects already on another date show where they are. */
function CellPicker({
  exam,
  className: c,
  date: d,
  index: wanted,
  inCell,
  subjects,
  onIndex,
  onPick,
}: {
  exam: ExamView;
  className: string;
  date: string;
  index: number;
  inCell: SlotView[];
  subjects: string[];
  onIndex: (i: number) => void;
  onPick: (index: number, subject: string | null) => void;
}) {
  const index = Math.min(wanted, inCell.length, 1);
  const slot = inCell[index];
  const other = inCell[1 - index]?.subject;
  const elsewhere = new Map(exam.slots.filter((s) => s.className === c && s.examDate !== d).map((s) => [s.subject, s.examDate]));
  const list = slot && !subjects.includes(slot.subject) ? [slot.subject, ...subjects] : subjects;
  const tabs = inCell.length ? [0, 1] : [];

  return (
    <div className="w-72 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          {shortClassLabel(c)} · {shortDateLabel(d)}
        </p>
        {tabs.length > 0 && (
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
            {tabs.map((i) => (
              <button key={i} type="button" className={`rounded-md px-2 py-0.5 ${index === i ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`} onClick={() => onIndex(i)}>
                {i < inCell.length ? `Paper ${i + 1}` : "+ 2nd paper"}
              </button>
            ))}
          </div>
        )}
      </div>
      {index === 1 && !slot && <p className="text-xs text-slate-500">A second paper the same day, such as GK and Drawing.</p>}

      {subjects.length === 0 ? (
        <p className="text-sm text-slate-600">
          {c} has no subjects yet.{" "}
          <Link href="/classes" className="font-medium text-indigo-700 hover:underline">
            Add them in Classes &amp; subjects
          </Link>
        </p>
      ) : (
        <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto">
          {list.map((s) => {
            const at = elsewhere.get(s);
            const current = slot?.subject === s;
            const disabled = !current && (!!at || s === other);
            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => !current && onPick(index, s)}
                className={`rounded-lg px-2 py-1.5 text-left text-[13px] font-medium ring-1 ring-inset transition ${current ? "bg-indigo-600 text-white ring-indigo-600" : disabled ? "cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-100" : "bg-white text-slate-800 ring-slate-200 hover:bg-indigo-50 hover:ring-indigo-300"}`}
              >
                <span className="block truncate">{s}</span>
                {at && !current && <span className="block text-[10px] font-normal">on {shortDateLabel(at)}</span>}
                {s === other && !current && <span className="block text-[10px] font-normal">other paper</span>}
              </button>
            );
          })}
        </div>
      )}

      {slot && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <SlotStatusBadge status={slot.status} warnings={slot.warnings} />
            {slot.paper && (
              <Link
                href={`/papers/${slot.paper.id}`}
                className="inline-flex max-w-[150px] items-center gap-1 truncate text-xs text-indigo-700 hover:underline"
                title={slot.paper.title}
              >
                <ExternalLink size={11} /> {slot.paper.title}
              </Link>
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-sm text-red-700" onClick={() => onPick(index, null)}>
            <X size={13} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}

/** A small floating panel under `anchor`, kept on screen. Closes on an outside click, Escape, or page scroll. */
function Popover({ anchor, label, onClose, children }: { anchor: HTMLElement; label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const below = r.bottom + 6;
    const top = below + h > window.innerHeight - 8 && r.top - h - 6 > 8 ? r.top - h - 6 : below;
    setPos({ top, left });
  }, [anchor, children]);

  // focus moves into the panel when it opens and back to the cell or date that opened it
  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>("input, button:not([disabled]), a[href]");
    first?.focus({ preventScroll: true });
    return () => {
      if (anchor.isConnected) anchor.focus({ preventScroll: true });
    };
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = (e: Event) => !ref.current?.contains(e.target as Node) && onClose();
    // tabbing out of the panel closes it, so it never sits open behind the focus
    const onFocus = (e: FocusEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor.contains(t)) onClose();
    };
    // a phone's on-screen keyboard only changes the height: close only when the width changes
    let width = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth !== width) onClose();
      width = window.innerWidth;
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("focusin", onFocus);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [anchor, onClose]);

  return (
    <div ref={ref} role="dialog" aria-label={label} className="anim-fade fixed z-50 rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={pos ?? { top: -9999, left: -9999 }}>
      {children}
    </div>
  );
}

/** A date box that saves when you leave it or press Enter, never mid-typing, and only for a sensible year. */
function DateInput({ value, label, autoFocus, onCommit }: { value: string; label: string; autoFocus?: boolean; onCommit: (date: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value);
  const commit = async () => {
    if (draft === value) return;
    const year = Number(draft.slice(0, 4));
    // empty, half-typed or an unlikely year: show the saved date again
    if (!draft || year < 2000 || year > 2100) {
      setDraft(value);
      return;
    }
    // refused by the server (e.g. that date is already in the block): show the saved date again
    if (!(await onCommit(draft))) setDraft(value);
  };
  return (
    <input
      type="date"
      className="input w-full py-1.5 text-sm"
      value={draft}
      min="2000-01-01"
      max="2100-12-31"
      aria-label={label}
      autoFocus={autoFocus}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
    />
  );
}
