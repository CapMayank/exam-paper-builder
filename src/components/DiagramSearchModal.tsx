"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  Loader2,
  PencilRuler,
  Printer,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { api, imageUrl } from "@/lib/client";
import type { DiagramCandidate } from "@/lib/diagram-search";

export interface DiagramSearchModalProps {
  initialQuery?: string;
  subject?: string;
  chapterTitle?: string;
  questionText?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectDiagram: (diagram: { imagePath: string; title: string; source: string }) => void;
  onOpenInStudio?: (imageUrl: string) => void;
}

export function DiagramSearchModal({
  initialQuery = "",
  subject = "",
  chapterTitle = "",
  questionText = "",
  isOpen,
  onClose,
  onSelectDiagram,
  onOpenInStudio,
}: DiagramSearchModalProps) {
  const [query, setQuery] = useState(initialQuery || chapterTitle || "");
  const [selectedSubject, setSelectedSubject] = useState(subject || "All");
  const [requireUnlabelled, setRequireUnlabelled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<DiagramCandidate[]>([]);
  const [grayscaleMode, setGrayscaleMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search function
  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    setLoading(true);
    setError(null);
    try {
      const res = await api<{
        success: boolean;
        total: number;
        candidates: DiagramCandidate[];
      }>("/api/ai/search-diagrams", {
        method: "POST",
        json: {
          query: q,
          subject: selectedSubject === "All" ? "" : selectedSubject,
          chapter: chapterTitle,
          questionText,
          requireUnlabelled,
        },
      });
      setCandidates(res.candidates || []);
    } catch (err: any) {
      setError(err?.message || "Failed to search diagram repository.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void handleSearch();
    }
  }, [isOpen, selectedSubject, requireUnlabelled]);

  // Import / Select diagram
  const handleChoose = async (candidate: DiagramCandidate) => {
    setImportingId(candidate.id);
    try {
      const res = await api<{ success: boolean; imagePath: string }>("/api/ai/search-diagrams", {
        method: "POST",
        json: {
          action: "import",
          diagramId: candidate.source.includes("Curated") ? candidate.id : undefined,
          downloadUrl: candidate.downloadUrl,
          svgContent: candidate.svgContent,
        },
      });

      if (res.imagePath) {
        onSelectDiagram({
          imagePath: res.imagePath,
          title: candidate.title,
          source: candidate.source,
        });
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to attach diagram.");
    } finally {
      setImportingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <Printer size={15} />
              </span>
              <h2 className="text-base font-bold text-slate-900">Educational Diagram Library</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={11} /> Verified Print Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Standard NCERT, CBSE &amp; public domain line art. Verified for high-contrast B&amp;W photocopy reproduction.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="border-b border-slate-100 p-4 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition"
                placeholder="Search diagrams by topic (e.g. flower L.S., nephron, prism, stomata, circuit)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={loading}
              className="btn btn-primary text-xs py-1.5 px-4 font-semibold shrink-0"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : "Search"}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Subject pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-medium mr-1">Subject:</span>
              {["All", "Biology", "Physics", "Chemistry"].map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubject(sub)}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    selectedSubject === sub
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Print preview & callout toggles */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={requireUnlabelled}
                  onChange={(e) => setRequireUnlabelled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Unlabelled / Parts (A, B, C, D) only
              </label>

              <button
                type="button"
                onClick={() => setGrayscaleMode(!grayscaleMode)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium border transition ${
                  grayscaleMode
                    ? "bg-slate-800 text-white border-slate-700 shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
                title="Simulates standard black & white photocopier output"
              >
                <Printer size={12} />
                {grayscaleMode ? "B&W Photocopy Mode On" : "Test B&W Print"}
              </button>
            </div>
          </div>
        </div>

        {/* Candidate Diagrams Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 size={32} className="mx-auto animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-medium">Searching verified curriculum repositories...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Search size={36} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-semibold text-slate-700">No matching educational diagrams found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No high-contrast line art matched "{query}". You can construct a clean custom diagram in Figure Studio.
              </p>
              {onOpenInStudio && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInStudio("");
                  }}
                  className="mt-4 btn bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 text-xs py-1.5 px-3 font-semibold inline-flex items-center gap-1.5"
                >
                  <PencilRuler size={13} /> Draw in Figure Studio
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((candidate) => {
                const isImporting = importingId === candidate.id;
                const isCurated = candidate.source.includes("Curated");

                return (
                  <div
                    key={candidate.id}
                    className="flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-md transition hover:border-slate-300"
                  >
                    {/* Image Preview Box */}
                    <div
                      className={`relative flex h-48 w-full items-center justify-center rounded-lg border border-slate-100 bg-white p-2 overflow-hidden transition ${
                        grayscaleMode ? "grayscale contrast-150" : ""
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={candidate.previewUrl}
                        alt={candidate.title}
                        className="max-h-full max-w-full object-contain"
                      />
                      <span className="absolute top-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-2xs backdrop-blur-xs border border-slate-200">
                        {isCurated ? "NCERT / CBSE" : candidate.source}
                      </span>
                      {candidate.hasUnlabelledCallouts && (
                        <span className="absolute top-2 right-2 rounded-md bg-emerald-50/95 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 shadow-2xs backdrop-blur-xs border border-emerald-200">
                          Parts (A, B, C, D)
                        </span>
                      )}
                    </div>

                    {/* Metadata & Title */}
                    <div className="mt-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                          {candidate.title}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                          <span>{candidate.license}</span>
                          <span>·</span>
                          <span
                            className={`font-semibold ${
                              candidate.eligibility.eligible ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {candidate.eligibility.reason}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                        {onOpenInStudio && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenInStudio(candidate.previewUrl);
                            }}
                            className="btn btn-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-medium"
                            title="Open this diagram in Figure Studio to add annotations, leader lines, or mask labels"
                          >
                            <PencilRuler size={12} className="text-indigo-600" /> Studio Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleChoose(candidate)}
                          disabled={isImporting}
                          className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] ml-auto inline-flex items-center gap-1 shadow-2xs"
                        >
                          {isImporting ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          Use This Diagram
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Sparkles size={13} className="text-indigo-600" />
            Curated figures bypass vector approximations and ensure high exam fidelity.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
