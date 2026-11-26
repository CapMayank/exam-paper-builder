"use client";

import { Eye, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBanner, Modal } from "@/components/ui";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import type { AuditLogEntry } from "@/lib/types";

/** The examination audit trail (moved unchanged from the old Exam Cell page). */
export function AuditTrail() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState({ search: "", entityType: "", action: "" });
  const [inspectAudit, setInspectAudit] = useState<AuditLogEntry | null>(null);

  const load = useCallback(async () => {
    try {
      const a = await api<{ logs: AuditLogEntry[]; total: number }>("/api/audit?limit=50");
      setAuditLogs(a.logs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the audit trail");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditFilter.entityType && log.entityType !== auditFilter.entityType) return false;
      if (auditFilter.action && log.action !== auditFilter.action) return false;
      if (auditFilter.search) {
        const q = auditFilter.search.toLowerCase();
        return (
          log.userName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.detailsJson.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, auditFilter]);

  return (
    <>
      {error && <ErrorBanner message={error} />}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Examination Security &amp; Change Audit Trail
              </h2>
              <p className="text-xs text-slate-600">
                Immutable chronological log of all authoring, status transitions, set generation, and print activities.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="btn btn-ghost text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw size={14} /> Refresh Log
            </button>
          </div>

          {/* Audit Filters */}
          <div className="card p-3 bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail by user, action or keyword…"
                value={auditFilter.search}
                onChange={(e) => setAuditFilter({ ...auditFilter, search: e.target.value })}
                className="input pl-8 py-1.5 text-xs w-full"
              />
            </div>
            <select
              value={auditFilter.entityType}
              onChange={(e) => setAuditFilter({ ...auditFilter, entityType: e.target.value })}
              className="input text-xs py-1.5"
            >
              <option value="">All Entities</option>
              <option value="PAPER">Papers</option>
              <option value="QUESTION">Questions</option>
              <option value="USER">User / RBAC</option>
              <option value="EXAM">Exams</option>
            </select>
          </div>

          {/* Audit List */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Operator</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No audit events matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {timeAgo(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.userName}</div>
                          <span className="badge badge-sm !bg-slate-100 !text-slate-700 text-[10px]">
                            {log.userRole}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                          <span
                            className={`rounded px-1.5 py-0.5 font-bold ${
                              log.action.includes("CREATE")
                                ? "bg-emerald-50 text-emerald-800"
                                : log.action.includes("DELETE")
                                ? "bg-red-50 text-red-800"
                                : log.action.includes("ROLE")
                                ? "bg-purple-50 text-purple-800"
                                : "bg-blue-50 text-blue-800"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-semibold">
                          {log.entityType}
                        </td>
                        <td className="px-4 py-3 max-w-sm truncate text-slate-600 font-mono text-[11px]">
                          {log.detailsJson}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setInspectAudit(log)}
                            className="btn btn-icon btn-ghost text-slate-600 hover:text-indigo-600"
                            title="Inspect details payload"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {inspectAudit && (
        <Modal
          title={`Audit Event: ${inspectAudit.action}`}
          onClose={() => setInspectAudit(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">Operator</span>
                <span className="font-bold text-slate-900">{inspectAudit.userName} ({inspectAudit.userRole})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Date / Time</span>
                <span className="font-bold text-slate-900">{inspectAudit.createdAt}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Entity</span>
                <span className="font-bold text-slate-900">{inspectAudit.entityType} ({inspectAudit.entityId || "N/A"})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Action ID</span>
                <span className="font-mono text-slate-700">{inspectAudit.id}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-1">Payload JSON</span>
              <pre className="rounded-lg bg-slate-950 p-4 font-mono text-xs text-indigo-200 overflow-x-auto max-h-64">
                {JSON.stringify(JSON.parse(inspectAudit.detailsJson || "{}"), null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
