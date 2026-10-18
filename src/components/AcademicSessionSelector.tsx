"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Check, ChevronDown, Plus, Sparkles } from "lucide-react";
import { useAcademicSession } from "@/lib/academicSession";

interface AcademicSessionSelectorProps {
  compact?: boolean;
  className?: string;
}

export function AcademicSessionSelector({ compact = false, className = "" }: AcademicSessionSelectorProps) {
  const { currentSession, setSession, availableSessions, addCustomSession } = useAcademicSession();
  const [open, setOpen] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        setAddingCustom(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customInput.trim()) return;
    addCustomSession(customInput.trim());
    setCustomInput("");
    setAddingCustom(false);
    setOpen(false);
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`group flex items-center gap-2 rounded-xl border border-indigo-700/60 bg-indigo-950/40 px-3 py-1.5 text-xs font-medium text-indigo-100 transition hover:border-amber-300/60 hover:bg-white/10 hover:text-white ${
          compact ? "px-2 py-1" : ""
        }`}
        title={`Active Academic Session: ${currentSession} (Click to switch or roll over)`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Calendar size={14} className="text-amber-300" />
        <span className="flex items-center gap-1.5">
          {!compact && <span className="text-indigo-300/80 font-normal">Session:</span>}
          <strong className="font-semibold text-white tracking-wide">{currentSession}</strong>
        </span>
        <ChevronDown size={13} className={`text-indigo-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="anim-pop absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-60 z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-2 py-1.5 border-b border-slate-100 mb-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Academic Year / Session</p>
            <p className="text-xs text-slate-600">Select active session to scope papers, blueprints &amp; roll over</p>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {availableSessions.map((session) => {
              const active = session === currentSession;
              return (
                <button
                  key={session}
                  type="button"
                  onClick={() => {
                    setSession(session);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    active ? "bg-indigo-50 font-semibold text-indigo-900" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  role="menuitem"
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${active ? "bg-indigo-600" : "bg-transparent"}`} />
                    <span>Session {session}</span>
                  </span>
                  {active && <Check size={14} className="text-indigo-600" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 mt-1.5 pt-1.5">
            {addingCustom ? (
              <form onSubmit={handleAddCustom} className="space-y-1.5 p-1">
                <input
                  type="text"
                  placeholder="e.g. 2027–28"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="input input-sm w-full text-xs"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCustom(false);
                      setCustomInput("");
                    }}
                    className="btn btn-sm btn-ghost text-xs py-0.5 px-2 h-7"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary text-xs py-0.5 px-2 h-7">
                    Add Session
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingCustom(true)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 font-medium hover:bg-indigo-50 transition"
              >
                <Plus size={13} />
                <span>Add new session (e.g. 2027–28)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
