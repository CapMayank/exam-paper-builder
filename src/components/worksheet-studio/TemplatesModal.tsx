"use client";

import { BookmarkPlus, ChevronDown, LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ErrorBanner, Modal, Spinner, useConfirm, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { getKindergartenActivity } from "@/lib/kindergarten/registry";
import { rankTemplates, type WorksheetTemplate } from "@/lib/worksheetTemplates";
import type { ActivitySnapshot } from "./templates";

const isManager = (role?: string) => role === "ADMIN" || role === "SUPER_ADMIN";

/** Pick a template to add to the worksheet, or save this worksheet as a template for the whole school. */
export function TemplatesModal({
  className,
  subject,
  worksheetTitle,
  snapshot,
  onUse,
  onClose,
}: {
  className: string;
  subject: string;
  worksheetTitle: string;
  snapshot: () => ActivitySnapshot[];
  /** Adds the template; true when every activity went in. */
  onUse: (t: WorksheetTemplate) => Promise<boolean>;
  onClose: () => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [templates, setTemplates] = useState<WorksheetTemplate[] | null>(null);
  const [me, setMe] = useState<{ id: string; role?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showOthers, setShowOthers] = useState(false);
  const [name, setName] = useState(`${worksheetTitle}`.slice(0, 80));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([api<WorksheetTemplate[]>("/api/worksheet-templates"), api<{ id: string; role?: string }>("/api/me")])
      .then(([list, user]) => {
        if (!live) return;
        setTemplates(list);
        setMe(user);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);

  const ranked = useMemo(() => rankTemplates(templates ?? [], className, subject), [templates, className, subject]);
  const count = snapshot().length;

  async function use(t: WorksheetTemplate) {
    setBusyId(t.id);
    try {
      // stay open when something went wrong, so the teacher sees it (what did go in can be undone)
      if (await onUse(t)) onClose();
      else setError("Not every activity of this template could be added – the message on the page says why. What was added can be undone.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(t: WorksheetTemplate) {
    const ok = await confirm({ title: "Remove this template?", message: `“${t.name}” will no longer be offered to any teacher.`, confirmLabel: "Remove", tone: "danger" });
    if (!ok) return;
    try {
      await api(`/api/worksheet-templates/${t.id}`, { method: "DELETE" });
      setTemplates((list) => (list ?? []).filter((x) => x.id !== t.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api<WorksheetTemplate>("/api/worksheet-templates", {
        method: "POST",
        json: { name, className, subject, activities: snapshot() },
      });
      setTemplates((list) => [created, ...(list ?? [])]);
      toast.success("Template saved – every teacher can use it now");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const card = (t: WorksheetTemplate) => (
    <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{t.name}</p>
          <p className="text-[11px] text-slate-500">
            {t.className} · {t.subject} · {t.builtIn ? "Ready-made" : `Saved by ${t.createdByName ?? "a teacher"}`}
          </p>
        </div>
        {!t.builtIn && me && (t.createdById === me.id || isManager(me.role)) && (
          <button type="button" aria-label={`Remove template ${t.name}`} onClick={() => void remove(t)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        )}
        <button type="button" className="btn btn-sm btn-primary" disabled={busyId !== null} onClick={() => void use(t)}>
          {busyId === t.id ? <Spinner size="sm" /> : <Plus size={13} />} Add
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {t.activities.map((a, i) => (
          <span key={i} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
            {getKindergartenActivity(a.type)?.shortLabel ?? a.type}
          </span>
        ))}
      </div>
    </li>
  );

  return (
    <Modal title="Templates" subtitle="Add a ready set of activities, or save this worksheet for other teachers." onClose={onClose} wide>
      <div className="space-y-5">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <section aria-label="Use a template" className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
            <LayoutTemplate size={13} /> For {className} {subject}
          </h3>
          {!templates ? (
            <p className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <Spinner size="sm" /> Loading templates…
            </p>
          ) : ranked.matching.length ? (
            <ul className="space-y-2">{ranked.matching.map(card)}</ul>
          ) : (
            <p className="text-sm text-slate-500">No template for this class and subject yet.</p>
          )}
          {templates && ranked.others.length > 0 && (
            <div>
              <button type="button" aria-expanded={showOthers} onClick={() => setShowOthers((v) => !v)} className="flex items-center gap-1 text-xs font-semibold text-indigo-700">
                <ChevronDown size={13} className={showOthers ? "rotate-180" : ""} /> Other classes and subjects ({ranked.others.length})
              </button>
              {showOthers && <ul className="mt-2 space-y-2">{ranked.others.map(card)}</ul>}
            </div>
          )}
        </section>

        <form onSubmit={save} aria-label="Save as template" className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
            <BookmarkPlus size={13} /> Save this worksheet as a template
          </h3>
          <div className="flex gap-2">
            <input
              className="input min-w-0 flex-1"
              aria-label="Template name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. LKG English – week 3"
            />
            <button type="submit" className="btn" disabled={saving || count === 0 || count > 20 || !name.trim()}>
              {saving ? <Spinner size="sm" /> : <BookmarkPlus size={14} />} Save
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            {count === 0
              ? "Add some activities first."
              : count > 20
                ? "A template can hold at most 20 activities – remove some first."
                : `Saves its ${count} activities with their words and pictures. Every teacher of the school will see it.`}
          </p>
        </form>
      </div>
    </Modal>
  );
}
