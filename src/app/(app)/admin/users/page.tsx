"use client";

import {
  CheckCircle2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  AlertTriangle,
  GraduationCap,
  UserCog,
  UserPlus,
  XCircle,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AssignmentChips, ClassAssignmentPicker, type PickerClass } from "@/components/ClassAssignmentPicker";
import { ErrorBanner, Modal, Skeleton, SuccessBanner } from "@/components/ui";
import { api } from "@/lib/client";
import { USER_ROLES, USER_ROLE_LABEL, type UserRole } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { assignmentLabel, type Assignment } from "@/lib/permissions";
import type { AcademicClassDto, UserData } from "@/lib/types";

const ROLE_HELP: Record<UserRole, string> = {
  ADMIN: "Runs the portal: accounts, class assignments, classes, academic rollover and unlocking final papers.",
  TEACHER: "Works in the classes assigned below. Class In-charge covers every subject of a class and its settings; a subject assignment covers that subject only.",
  EXAM_CELL: "Date sheet, print runs and the audit log. Can open and print every paper, but does not edit content.",
};

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: "!bg-purple-100 !text-purple-800",
  TEACHER: "!bg-emerald-100 !text-emerald-800",
  EXAM_CELL: "!bg-amber-100 !text-amber-800",
};

/** One entry per class name across sessions, subjects merged, in school order. */
function toPickerClasses(rows: AcademicClassDto[]): PickerClass[] {
  const byName = new Map<string, { order: number; subjects: Set<string> }>();
  for (const r of rows) {
    const entry = byName.get(r.name) ?? { order: r.displayOrder, subjects: new Set<string>() };
    for (const s of r.subjects) entry.subjects.add(s.name);
    byName.set(r.name, entry);
  }
  return [...byName.entries()]
    .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]))
    .map(([name, e]) => ({ name, subjects: [...e.subjects].sort() }));
}

export default function UsersAdminPage() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [resetUser, setResetUser] = useState<UserData | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [showResetPass, setShowResetPass] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savingResetPass, setSavingResetPass] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [classes, setClasses] = useState<PickerClass[]>([]);

  // Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "TEACHER" as UserRole,
    assignments: [] as Assignment[],
  });
  const [savingCreate, setSavingCreate] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    role: "TEACHER" as UserRole,
    assignments: [] as Assignment[],
    active: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, allUsers, classRows] = await Promise.all([
        api<UserData>("/api/me"),
        api<UserData[]>("/api/users"),
        api<AcademicClassDto[]>("/api/classes").catch(() => [] as AcademicClassDto[]),
      ]);
      setCurrentUser(me);
      setUsers(allUsers);
      setClasses(toPickerClasses(classRows));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreate(true);
    setError(null);
    try {
      const created = await api<UserData>("/api/users", {
        method: "POST",
        json: createForm,
      });
      setUsers((prev) => [created, ...prev]);
      setCreateModal(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "TEACHER",
        assignments: [],
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingCreate(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSavingEdit(true);
    setError(null);
    try {
      const updated = await api<UserData>(`/api/users/${editUser.id}`, {
        method: "PATCH",
        json: editForm,
      });
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, ...updated } : u)));
      setEditUser(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await api(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccess(`Faculty account deleted successfully.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const generateTemporaryPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    const prefix = "Sarv#";
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `${prefix}${suffix}`;
  };

  const handleOpenReset = (u: UserData) => {
    setResetUser(u);
    setResetPasswordInput(generateTemporaryPassword());
    setShowResetPass(true);
    setCopied(false);
    setError(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (resetPasswordInput.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSavingResetPass(true);
    setError(null);
    try {
      await api<UserData>(`/api/users/${resetUser.id}`, {
        method: "PATCH",
        json: { password: resetPasswordInput },
      });
      setSuccess(`Password for ${resetUser.name} (${resetUser.email}) successfully reset to: ${resetPasswordInput}`);
      setResetUser(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingResetPass(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter === "UNASSIGNED") {
        if (u.role !== "TEACHER" || (u.assignments ?? []).length > 0) return false;
      } else if (roleFilter && u.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.assignments ?? []).some((a) => assignmentLabel(a).toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [users, roleFilter, search]);

  const isAdmin = currentUser?.role === "ADMIN";
  const unassignedCount = users.filter((u) => u.active && u.role === "TEACHER" && (u.assignments ?? []).length === 0).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Faculty &amp; classes</h1>
          <p className="page-lede">
            Add staff, choose their role, and assign each teacher the classes and subjects they look after.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreateModal(true)}
            className="btn btn-primary flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus size={16} /> Add staff member
          </button>
        )}
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

      {unassignedCount > 0 && (
        <button
          type="button"
          onClick={() => setRoleFilter("UNASSIGNED")}
          className="flex w-full items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950 hover:bg-amber-100"
        >
          <AlertTriangle size={18} className="shrink-0 text-amber-600" aria-hidden />
          <span>
            <strong>{unassignedCount} teacher{unassignedCount === 1 ? " has" : "s have"} no classes yet.</strong>{" "}
            They can browse and print, but cannot add or edit anything until you assign classes. Show them
          </span>
        </button>
      )}

      {/* What each role can do */}
      <section aria-label="What each role can do" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {([
          ["ADMIN", Shield, "text-purple-700"],
          ["TEACHER", GraduationCap, "text-emerald-700"],
          ["EXAM_CELL", Lock, "text-amber-700"],
        ] as const).map(([role, Icon, tone]) => (
          <div key={role} className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className={`flex items-center gap-2 text-sm font-bold ${tone}`}>
              <Icon size={15} aria-hidden /> {USER_ROLE_LABEL[role]}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{ROLE_HELP[role]}</p>
          </div>
        ))}
      </section>

      {/* Filter Bar */}
      <div className="card p-3 bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or class…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-8 py-1.5 text-xs w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ width: "13rem" }}
          className="input text-xs py-1.5 shrink-0"
        >
          <option value="">All roles ({users.length})</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {USER_ROLE_LABEL[r]}
            </option>
          ))}
          <option value="UNASSIGNED">Teachers without classes</option>
        </select>
        <button
          type="button"
          onClick={fetchUsers}
          className="btn btn-icon btn-ghost text-slate-600 hover:bg-slate-100"
          title="Refresh list"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-3">Faculty Member</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Classes</th>
                <th className="px-3 py-3">Authored Content</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Joined</th>
                {isAdmin && <th className="px-3 py-3 text-right whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No faculty members found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const initial = u.name ? u.name.trim()[0]?.toUpperCase() : "T";
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-xs text-indigo-900">
                            {initial}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-500 max-w-[190px] truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`badge font-bold text-[11px] ${ROLE_BADGE[u.role] ?? ROLE_BADGE.TEACHER}`}>
                          {USER_ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {u.role === "TEACHER" ? (
                          <AssignmentChips
                            assignments={u.assignments ?? []}
                            empty={<span className="font-semibold text-amber-700">No classes yet</span>}
                          />
                        ) : (
                          <span className="text-slate-500">Whole school</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                        <span className="font-semibold text-slate-900">{u._count?.questions ?? 0}</span> questions ·{" "}
                        <span className="font-semibold text-slate-900">{u._count?.papers ?? 0}</span> papers
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                            <CheckCircle2 size={13} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-[11px]">
                            <XCircle size={13} /> Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {timeAgo(u.createdAt)}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenReset(u)}
                              className="btn btn-sm btn-ghost text-amber-700 hover:bg-amber-50"
                              title="Reset faculty password"
                            >
                              <KeyRound size={13} /> Reset Password
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditUser(u);
                                setEditForm({
                                  name: u.name,
                                  role: u.role,
                                  assignments: u.assignments ?? [],
                                  active: u.active,
                                });
                              }}
                              className="btn btn-sm btn-ghost text-indigo-700 hover:bg-indigo-50"
                            >
                              <UserCog size={13} /> Role &amp; classes
                            </button>
                            {u.id !== currentUser?.id && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(u)}
                                className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
                                title="Permanently delete account"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: ADD FACULTY MEMBER                                      */}
      {/* ============================================================== */}
      {createModal && (
        <Modal title="Add staff member" onClose={() => setCreateModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. Ramesh Kumar"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                placeholder="faculty@school.edu"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="label">Temporary Password (Min 6 chars)</label>
              <input
                type="password"
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="input w-full"
                required
                minLength={6}
              />
            </div>
            <RoleField value={createForm.role} onChange={(role) => setCreateForm({ ...createForm, role })} />
            {createForm.role === "TEACHER" && (
              <AssignmentField
                classes={classes}
                value={createForm.assignments}
                onChange={(assignments) => setCreateForm({ ...createForm, assignments })}
              />
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreateModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCreate}
                className="btn btn-primary"
              >
                {savingCreate ? "Creating account…" : "Create account"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT ROLE & STATUS                                      */}
      {/* ============================================================== */}
      {editUser && (
        <Modal
          title={`Role & classes: ${editUser.name}`}
          onClose={() => setEditUser(null)}
        >
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <span className="text-xs text-slate-500 block">Email Account</span>
              <span className="font-bold text-sm text-slate-900">{editUser.email}</span>
            </div>

            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="input w-full font-semibold"
                required
              />
            </div>

            <RoleField value={editForm.role} onChange={(role) => setEditForm({ ...editForm, role })} />
            {editForm.role === "TEACHER" && (
              <AssignmentField
                classes={classes}
                value={editForm.assignments}
                onChange={(assignments) => setEditForm({ ...editForm, assignments })}
              />
            )}

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Active Account (Uncheck to suspend login access)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="btn btn-primary"
              >
                {savingEdit ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL: RESET FACULTY PASSWORD                                  */}
      {/* ============================================================== */}
      {resetUser && (
        <Modal
          title={`Reset Password: ${resetUser.name}`}
          subtitle={`${resetUser.email} · ${USER_ROLE_LABEL[resetUser.role] || resetUser.role}`}
          onClose={() => !savingResetPass && setResetUser(null)}
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Lock size={14} className="text-amber-700" /> Institutional Security Policy
              </div>
              <p className="text-slate-700 leading-relaxed">
                Resetting this password will immediately update this faculty member&apos;s sign-in credentials. Please share the new password with them securely.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between pb-1">
                <label className="label mb-0">Temporary / New Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordInput(generateTemporaryPassword());
                    setCopied(false);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  <Sparkles size={12} /> Generate Another
                </button>
              </div>

              <div className="relative">
                <input
                  type={showResetPass ? "text" : "password"}
                  value={resetPasswordInput}
                  onChange={(e) => {
                    setResetPasswordInput(e.target.value);
                    setCopied(false);
                  }}
                  required
                  minLength={6}
                  className="input w-full pr-20 font-mono text-sm tracking-wide font-semibold text-slate-900"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowResetPass((s) => !s)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                    title={showResetPass ? "Hide password" : "Show password"}
                  >
                    {showResetPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resetPasswordInput);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition ${
                      copied
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Minimum 6 characters. Copy and provide this password to the faculty member.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={savingResetPass}
                onClick={() => setResetUser(null)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingResetPass}
                className="btn btn-primary"
              >
                {savingResetPass ? "Updating Password…" : "Save New Password"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL: PERMANENTLY DELETE USER ACCOUNT                         */}
      {/* ============================================================== */}
      {deleteTarget && (
        <Modal
          title="Permanently Delete Faculty Account"
          onClose={() => !deleting && setDeleteTarget(null)}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 p-3.5">
              <AlertTriangle size={20} className="shrink-0 text-red-600 mt-0.5" />
              <div className="space-y-1.5 text-xs text-red-950 leading-relaxed">
                <div className="font-bold text-sm text-red-900">
                  Confirm Permanent Account Deletion
                </div>
                <p>
                  Are you sure you want to permanently delete the account for{" "}
                  <strong className="font-semibold text-slate-900">{deleteTarget.name}</strong>{" "}
                  (<code className="font-mono text-red-800">{deleteTarget.email}</code>)?
                </p>
                <div className="rounded-lg bg-white/80 p-2.5 border border-red-100 text-slate-700 text-[11px] space-y-1">
                  <div className="font-bold text-slate-900">Safety &amp; Data Preservation:</div>
                  <p>
                    All authored questions (<strong>{deleteTarget._count?.questions ?? 0}</strong>) and examination papers (<strong>{deleteTarget._count?.papers ?? 0}</strong>) will be transferred to your Administrator account so school question banks and paper archives remain fully intact.
                  </p>
                </div>
                <p className="font-semibold text-red-700 text-[11px]">
                  ⚠️ This action cannot be undone. The user will be immediately logged out and unable to access the portal.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="btn !bg-red-600 !text-white hover:!bg-red-700 shadow-sm font-semibold"
              >
                {deleting ? "Deleting Account…" : "Permanently Delete Account"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RoleField({ value, onChange }: { value: UserRole; onChange: (role: UserRole) => void }) {
  return (
    <fieldset>
      <legend className="label">Role</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {USER_ROLES.map((r) => (
          <label
            key={r}
            className={`cursor-pointer rounded-xl border p-2.5 text-xs transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-indigo-600 ${
              value === r ? "border-indigo-600 bg-indigo-50 text-indigo-950" : "border-slate-200 hover:border-slate-400"
            }`}
          >
            <input type="radio" name="role" value={r} checked={value === r} onChange={() => onChange(r)} className="sr-only" />
            <span className="block text-sm font-bold">{USER_ROLE_LABEL[r]}</span>
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{ROLE_HELP[value]}</p>
    </fieldset>
  );
}

function AssignmentField({
  classes,
  value,
  onChange,
}: {
  classes: PickerClass[];
  value: Assignment[];
  onChange: (next: Assignment[]) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="label mb-1">Classes and subjects</span>
        <span className="text-xs text-slate-500">{value.length === 0 ? "None yet" : `${value.length} selected`}</span>
      </div>
      <ClassAssignmentPicker classes={classes} value={value} onChange={onChange} />
    </div>
  );
}

