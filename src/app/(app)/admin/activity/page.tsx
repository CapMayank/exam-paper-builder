"use client";

import { Download, History, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorBanner, ListSkeleton, PageHeader } from "@/components/ui";
import { api } from "@/lib/client";
import { ACTIVITY_CATEGORIES, describeActivity, deviceLabel } from "@/lib/activityLog";
import { USER_ROLE_LABEL, type UserRole } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import type { AuditLogEntry, UserData } from "@/lib/types";

const PAGE = 50;
const today = () => new Date().toISOString().slice(0, 10);

type Filters = { search: string; category: string; userId: string; from: string; to: string };

function query(f: Filters, extra: Record<string, string | number> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v !== "" && v !== undefined) q.set(k, String(v));
  return q.toString();
}

const OUTCOME_TONE: Record<string, string> = {
  LOGIN_FAILED: "text-amber-700",
  LOGIN_BLOCKED: "text-red-700",
  USER_DELETE: "text-red-700",
  USER_ROLE_CHANGE: "text-indigo-700",
  USER_PASSWORD_RESET: "text-indigo-700",
};

/** Super Admin: every sign-in and every change, who made it, when, and from where. */
export default function ActivityLogPage() {
  const [filters, setFilters] = useState<Filters>({ search: "", category: "", userId: "", from: "", to: "" });
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ logs: AuditLogEntry[]; total: number; full: boolean } | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<{ signIns: number; failed: number; blocked: number } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const listQuery = query(filters, { limit: PAGE, offset });
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const loading = loadedQuery !== `${listQuery}#${reload}`;

  useEffect(() => {
    let cancelled = false;
    api<{ logs: AuditLogEntry[]; total: number; full: boolean }>(`/api/audit?${listQuery}`)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoadedQuery(`${listQuery}#${reload}`));
    return () => {
      cancelled = true;
    };
  }, [listQuery, reload]);

  useEffect(() => {
    api<UserData[]>("/api/users").then(setUsers, () => {});
    const day = today();
    const count = (action: string) =>
      api<{ total: number }>(`/api/audit?${query({ search: "", category: "SIGN_IN", userId: "", from: day, to: day }, { action, limit: 1 })}`).then((r) => r.total);
    Promise.all([count("LOGIN_SUCCESS"), count("LOGIN_FAILED"), count("LOGIN_BLOCKED")]).then(
      ([signIns, failed, blocked]) => setStats({ signIns, failed, blocked }),
      () => {},
    );
  }, []);

  // search applies a moment after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0);
      setFilters((f) => (f.search === search ? f : { ...f, search }));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const set = (patch: Partial<Filters>) => {
    setOffset(0);
    setFilters((f) => ({ ...f, ...patch }));
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;
  const page = Math.floor(offset / PAGE) + 1;
  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.name.localeCompare(b.name)), [users]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity log"
        icon={History}
        description="Every sign-in and every change in the portal: who, what, when, and from which device. Entries cannot be edited or deleted."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost border border-slate-200 bg-white text-xs" onClick={() => setReload((n) => n + 1)} disabled={loading}>
              <RefreshCw size={14} /> Refresh
            </button>
            <a className="btn btn-primary text-xs" href={`/api/audit?${query(filters, { format: "csv" })}`}>
              <Download size={14} /> Download CSV
            </a>
          </div>
        }
      />

      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Today">
          {[
            ["Sign-ins today", stats.signIns, "text-slate-900", { category: "SIGN_IN" }],
            ["Failed sign-ins today", stats.failed, stats.failed > 0 ? "text-amber-700" : "text-slate-900", { category: "SIGN_IN" }],
            ["Blocked after wrong passwords", stats.blocked, stats.blocked > 0 ? "text-red-700" : "text-slate-900", { category: "SIGN_IN" }],
          ].map(([label, n, tone, patch]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => set({ ...(patch as Partial<Filters>), from: today(), to: today() })}
              className="rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-slate-300"
            >
              <p className="text-xs text-slate-500">{label as string}</p>
              <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${tone as string}`}>{n as number}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
        <label className="min-w-56 flex-1">
          <span className="label">Search</span>
          <span className="relative block">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, paper title, IP address…"
            />
          </span>
        </label>
        <label>
          <span className="label">What</span>
          <select className="input" value={filters.category} onChange={(e) => set({ category: e.target.value })}>
            <option value="">Everything</option>
            {ACTIVITY_CATEGORIES.filter((c) => data?.full || !c.securityOnly).map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Who</span>
          <select className="input" value={filters.userId} onChange={(e) => set({ userId: e.target.value })}>
            <option value="">Everyone</option>
            {sortedUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">From</span>
          <input type="date" className="input" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label>
          <span className="label">To</span>
          <input type="date" className="input" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} />
        </label>
        {(filters.category || filters.userId || filters.from || filters.to || filters.search) && (
          <button
            type="button"
            className="btn btn-ghost text-xs text-slate-600"
            onClick={() => {
              setSearch("");
              set({ search: "", category: "", userId: "", from: "", to: "" });
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {loading && !data ? (
        <ListSkeleton rows={6} />
      ) : !data || data.logs.length === 0 ? (
        <EmptyState compact icon={ShieldAlert} title="No activity matches" description="Change the filters or the dates to see more." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="table-clean text-sm">
            <thead>
              <tr>
                <th className="w-44">When</th>
                <th className="w-52">Who</th>
                <th>What</th>
                {data.full && <th className="w-56">From</th>}
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => {
                const { title, detail } = describeActivity(l);
                const expanded = open === l.id;
                return (
                  <tr key={l.id} className="align-top">
                    <td className="whitespace-nowrap">
                      <span className="block text-slate-900">{new Date(l.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span className="text-xs text-slate-500">{timeAgo(l.createdAt)}</span>
                    </td>
                    <td>
                      <span className="block font-medium text-slate-900">{l.userName}</span>
                      <span className="text-xs text-slate-500">{USER_ROLE_LABEL[l.userRole as UserRole] ?? l.userRole.replace(/_/g, " ").toLowerCase()}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="text-left"
                        aria-expanded={expanded}
                        onClick={() => setOpen(expanded ? null : l.id)}
                      >
                        <span className={`block font-medium ${OUTCOME_TONE[l.action] ?? "text-slate-900"}`}>{title}</span>
                        {detail && <span className="block text-xs text-slate-500">{detail}</span>}
                      </button>
                      {expanded && (
                        <pre className="mt-2 max-w-xl overflow-x-auto rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-700">
                          {JSON.stringify({ action: l.action, entity: l.entityType, id: l.entityId, ...JSON.parse(l.detailsJson || "{}") }, null, 2)}
                        </pre>
                      )}
                    </td>
                    {data.full && (
                      <td className="text-xs text-slate-600">
                        <span className="block font-mono">{l.ipAddress || "—"}</span>
                        <span>{deviceLabel(l.userAgent ?? "")}</span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">
            <span>
              {data.total} entr{data.total === 1 ? "y" : "ies"} · page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button type="button" className="btn btn-sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE))}>
                Newer
              </button>
              <button type="button" className="btn btn-sm" disabled={page >= pages} onClick={() => setOffset((o) => o + PAGE)}>
                Older
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
