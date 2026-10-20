"use client";

import { useState } from "react";
import { Check, Copy, Download, X, Code2, FileText } from "lucide-react";
import {
  exportBlueprintToJsonString,
  downloadBlueprintJson,
  getBlueprintJsonFilename,
  type BlueprintWithExportRelations,
} from "@/lib/blueprintExport";

interface BlueprintJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: BlueprintWithExportRelations | null;
  book?: { className?: string; subject?: string; title?: string } | null;
}

export function BlueprintJsonModal({
  isOpen,
  onClose,
  blueprint,
  book,
}: BlueprintJsonModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !blueprint) return null;

  const activeBook = book || blueprint.book;
  const jsonContent = exportBlueprintToJsonString(blueprint, activeBook);
  const filename = getBlueprintJsonFilename(blueprint, activeBook);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = jsonContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadBlueprintJson(blueprint, activeBook);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700">
              <Code2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Blueprint JSON</h3>
                {activeBook?.className && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800">
                    {activeBook.className}
                  </span>
                )}
                {activeBook?.subject && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {activeBook.subject}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{filename}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / JSON Code Viewer */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950">
          <pre className="text-xs font-mono text-emerald-400 leading-relaxed tab-4 select-all whitespace-pre">
            <code>{jsonContent}</code>
          </pre>
        </div>

        {/* Modal Footer with Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-200 bg-slate-50 text-xs">
          <div className="text-slate-600 flex items-center gap-1.5">
            <FileText size={14} className="text-slate-400" />
            <span>Ready for import into any exam paper workspace.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`btn btn-sm ${
                copied
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-100"
              } text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 transition`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied to Clipboard!" : "Copy JSON"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-sm btn-primary text-xs font-semibold px-3.5 py-1.5 flex items-center gap-1.5"
            >
              <Download size={14} />
              Download JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-ghost border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs px-3 py-1.5"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
