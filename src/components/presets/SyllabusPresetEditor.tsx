"use client";

import { ArrowDown, ArrowUp, ClipboardPaste, Info, ListPlus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Field } from "@/components/ui";
import { splitChapterTitle } from "@/lib/subjectBooks";
import { isLanguageSubject, type StandardCurriculumPreset } from "@/lib/syllabusImport";
import { CLASS_OPTIONS, SUBJECT_SUGGESTIONS } from "./presetUi";

type Row = { key: string; part: string; title: string };

let seq = 0;
const nextKey = () => `r${++seq}`;

/** Chapter titles of a composite book read "[Part] n. Title"; the editor shows the part and the bare title. */
export function rowsOf(p: StandardCurriculumPreset): Row[] {
  return p.chapters.map((c) => {
    const { part, title } = splitChapterTitle(c.title);
    return { key: nextKey(), part: part ?? "", title: part ? title.replace(/^\s*\d+\s*[.):-]\s*/, "") : title };
  });
}

/** Rows back into chapters: numbered in order, parts numbered from 1 within each part. */
export function chaptersOf(rows: Row[]): Pick<StandardCurriculumPreset, "chapters" | "isComposite" | "subBooks"> {
  const counts = new Map<string, number>();
  const chapters = rows.map((r, i) => {
    const part = r.part.trim();
    const title = r.title.trim();
    if (!part) return { number: i + 1, title };
    const n = (counts.get(part) ?? 0) + 1;
    counts.set(part, n);
    return { number: i + 1, title: `[${part}] ${n}. ${title}` };
  });
  const parts = Array.from(counts.keys());
  return { chapters, isComposite: parts.length > 1 || undefined, subBooks: parts.length > 1 ? parts : undefined };
}

/** One chapter per line; "# Part name" starts a part; leading "1." or "Chapter 1:" is dropped. */
function parsePaste(text: string): Row[] {
  let part = "";
  const out: Row[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      part = line.replace(/^#+\s*/, "");
      continue;
    }
    const title = line.replace(/^(?:chapter|ch\.?|lesson|unit|पाठ|अध्याय)?\s*\d+\s*[.):-]?\s+/i, "").trim();
    if (title) out.push({ key: nextKey(), part, title });
  }
  return out;
}

function pasteText(rows: Row[]): string {
  let part = "";
  const lines: string[] = [];
  for (const r of rows) {
    if (r.part !== part) {
      part = r.part;
      if (part) lines.push(`# ${part}`);
    }
    lines.push(r.title);
  }
  return lines.join("\n");
}

export function SyllabusPresetEditor({
  draft,
  rows,
  onChange,
  onRowsChange,
}: {
  draft: StandardCurriculumPreset;
  rows: Row[];
  onChange: (next: StandardCurriculumPreset) => void;
  onRowsChange: (rows: Row[]) => void;
}) {
  const [pasting, setPasting] = useState<string | null>(null);
  const hasParts = useMemo(() => rows.some((r) => r.part.trim()), [rows]);
  const level = parseInt(draft.className.replace(/\D/g, ""), 10);

  const set = <K extends keyof StandardCurriculumPreset>(k: K, v: StandardCurriculumPreset[K]) => onChange({ ...draft, [k]: v });
  const update = (i: number, patch: Partial<Row>) => onRowsChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onRowsChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Book title" className="sm:col-span-2">
          <input className="input" value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Bhasha Bharati (Class 6)" />
        </Field>
        <Field label="Class">
          <select className="input" value={draft.className} onChange={(e) => set("className", e.target.value)}>
            {!CLASS_OPTIONS.includes(draft.className) && <option value={draft.className}>{draft.className || "Choose a class"}</option>}
            {CLASS_OPTIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Subject" helper="Matched to the class's subjects, so 'Hindi' and 'Hindi / हिंदी' are the same.">
          <input className="input" list="preset-subjects" value={draft.subject} onChange={(e) => set("subject", e.target.value)} />
          <datalist id="preset-subjects">
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="Publisher or board">
          <input className="input" value={draft.board} onChange={(e) => set("board", e.target.value)} placeholder="e.g. MP Board – RSK Bhopal 2026–27" />
        </Field>
        <Field label="Note shown in the import dialog">
          <input className="input" value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>

      {level >= 9 && (
        <p className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <Info size={16} className="mt-0.5 shrink-0" />
          For Classes 9–12 the import dialog offers the MPBSE scheme first; this preset is offered only when the scheme has no book for the subject.
        </p>
      )}

      <section aria-labelledby="chapters-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="chapters-heading" className="font-semibold text-slate-900">
              Chapters <span className="font-normal text-slate-500">({rows.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              {hasParts ? "Chapters with a part are grouped under it, like History / Geography / Civics." : "Give chapters a part to split the book into History / Geography / Civics or Part I / Part II."}
            </p>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setPasting(pasting === null ? pasteText(rows) : null)} aria-expanded={pasting !== null}>
            <ClipboardPaste size={14} /> {pasting === null ? "Paste a list" : "Back to the list"}
          </button>
        </div>

        {pasting !== null ? (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label htmlFor="paste-chapters" className="text-sm text-slate-600">
              One chapter per line. Start a part with a line like <code className="rounded bg-white px-1"># Geography</code>. Numbers at the start of a line are dropped.
            </label>
            <textarea
              id="paste-chapters"
              className="input min-h-64 font-[inherit]"
              value={pasting}
              onChange={(e) => setPasting(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPasting(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={parsePaste(pasting).length === 0}
                onClick={() => {
                  onRowsChange(parsePaste(pasting));
                  setPasting(null);
                }}
              >
                Use {parsePaste(pasting).length} chapters
              </button>
            </div>
          </div>
        ) : (
          <ol className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {rows.map((r, i) => (
              <li key={r.key} className="flex flex-wrap items-center gap-2 px-2 py-1.5 sm:flex-nowrap">
                <span className="w-7 shrink-0 text-right text-sm tabular-nums text-slate-400">{i + 1}</span>
                <input
                  className="input w-28 shrink-0 py-1 text-sm"
                  aria-label={`Part of chapter ${i + 1}`}
                  placeholder="Part"
                  value={r.part}
                  list="preset-parts"
                  onChange={(e) => update(i, { part: e.target.value })}
                />
                <input
                  className={`input min-w-0 flex-1 py-1 text-sm ${r.title.trim() ? "" : "border-red-300"}`}
                  aria-label={`Title of chapter ${i + 1}`}
                  aria-invalid={!r.title.trim()}
                  value={r.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                />
                <div className="flex shrink-0 items-center">
                  <button type="button" className="btn btn-ghost btn-icon" aria-label={`Move chapter ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label={`Move chapter ${i + 1} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown size={15} />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon text-red-600 hover:text-red-700" aria-label={`Remove chapter ${i + 1}`} onClick={() => onRowsChange(rows.filter((_, j) => j !== i))}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
            {rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">No chapters yet. Add one, or paste the contents page.</li>}
          </ol>
        )}
        <datalist id="preset-parts">
          {Array.from(new Set(rows.map((r) => r.part.trim()).filter(Boolean))).map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

        {pasting === null && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onRowsChange([...rows, { key: nextKey(), part: rows.at(-1)?.part ?? "", title: "" }])}
          >
            <ListPlus size={14} /> Add chapter
          </button>
        )}

        {isLanguageSubject(draft.subject) && (
          <p className="text-xs text-slate-500">Reading, writing and grammar sections are added to language books when they are imported, so leave them out here.</p>
        )}
      </section>
    </div>
  );
}

export type { Row as ChapterRow };
export { nextKey as newRowKey };
