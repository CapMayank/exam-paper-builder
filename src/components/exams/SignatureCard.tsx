"use client";

import { PenLine, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui";
import { api } from "@/lib/client";

/** Admin: the Principal's signature and seal image, uploaded once and printed on every date sheet. */
export function SignatureCard() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ fileName: string | null }>("/api/settings/signature").then(
      (r) => setFileName(r.fileName),
      () => setFileName(null),
    );
  }, []);

  const save = async (name: string | null) => {
    await api("/api/settings/signature", { method: "PUT", json: { fileName: name } });
    setFileName(name);
  };

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { name } = await api<{ name: string }>("/api/uploads", { method: "POST", body: fd });
      await save(name);
      toast.success("Signature saved. It prints on every signed date sheet.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload the signature");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <section className="card flex flex-wrap items-center gap-4 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <PenLine size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-slate-900">Principal&apos;s signature and seal</h2>
        <p className="text-xs text-slate-600">Upload once. Date sheets printed as “Signed” use it; “Blank line” leaves space to sign by hand.</p>
      </div>
      {fileName && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/uploads/${fileName}`} alt="Principal's signature" className="h-14 max-w-[160px] rounded border border-slate-200 bg-white object-contain p-1" />
      )}
      <div className="flex gap-1">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy || fileName === undefined} onClick={() => input.current?.click()}>
          <Upload size={14} /> {fileName ? "Replace" : "Upload"}
        </button>
        {fileName && (
          <button
            type="button"
            className="btn btn-ghost btn-sm text-red-700"
            disabled={busy}
            onClick={() => save(null).catch((e) => toast.error(e instanceof Error ? e.message : "Could not remove it"))}
          >
            <Trash2 size={14} /> Remove
          </button>
        )}
      </div>
    </section>
  );
}
