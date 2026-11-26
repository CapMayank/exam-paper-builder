"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { formatDMY } from "@/lib/exams/dates";
import { shortClassLabel } from "@/lib/exams/labels";
import { canManageExams } from "@/lib/permissions";

type Pending = { slotId: string; examId: string; examName: string; className: string; examDate: string };

/**
 * After the print dialog closes, asks Admin / Exam Cell whether this paper was printed for the exams it is on.
 * Opening the print page alone never marks anything printed. Teachers never see it and nothing is fetched for them.
 */
export function PrintedPrompt({ paperId }: { paperId: string }) {
  const toast = useToast();
  const [allowed, setAllowed] = useState(false);
  const [pending, setPending] = useState<Pending[] | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    api<{ id: string; role?: string }>("/api/me").then(
      (me) => !cancelled && setAllowed(canManageExams({ id: me.id, role: me.role ?? "" })),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const onAfterPrint = () => {
      api<Pending[]>(`/api/exams/printed-prompt?paperId=${encodeURIComponent(paperId)}`).then(
        (rows) => {
          if (rows.length) {
            setDone(new Set());
            setPending(rows);
          }
        },
        () => undefined,
      );
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [allowed, paperId]);

  if (!pending) return null;

  const markPrinted = async (p: Pending) => {
    try {
      await api(`/api/exams/${p.examId}/slots/${p.slotId}`, { method: "PATCH", json: { printed: true } });
      const next = new Set(done).add(p.slotId);
      setDone(next);
      if (next.size === pending.length) {
        setPending(null);
        toast.success("Marked printed on the exam calendar.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mark it printed");
    }
  };

  return (
    <Modal
      title="Did you print this paper?"
      size="sm"
      onClose={() => setPending(null)}
      footer={
        <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
          Not yet
        </button>
      }
    >
      <ul className="space-y-2">
        {pending.map((p) => (
          <li key={p.slotId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-slate-900">{p.examName}</p>
              <p className="text-slate-600">
                {shortClassLabel(p.className)} · {formatDMY(p.examDate)}
              </p>
            </div>
            {done.has(p.slotId) ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                <Check size={15} /> Printed
              </span>
            ) : (
              <button type="button" className="btn btn-success btn-sm" onClick={() => markPrinted(p)}>
                Yes, printed
              </button>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
