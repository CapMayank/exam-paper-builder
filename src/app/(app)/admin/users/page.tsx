"use client";

import {
  CheckCircle2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  XCircle,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ErrorBanner, Modal, Skeleton, SuccessBanner } from "@/components/ui";
import { api } from "@/lib/client";
import { USER_ROLES, USER_ROLE_LABEL, type UserRole } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import type { UserData } from "@/lib/types";

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

  // Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "TEACHER" as UserRole,
    department: "Science",
  });
  const [savingCreate, setSavingCreate] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    role: "TEACHER" as UserRole,
    department: "",
    active: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, allUsers] = await Promise.all([
        api<UserData>("/api/me"),
        api<UserData[]>("/api/users"),
      ]);
      setCurrentUser(me);
      setUsers(allUsers);
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
        department: "Science",
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
      if (roleFilter && u.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [users, roleFilter, search]);

  const isAdmin = currentUser?.role === "ADMIN";

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
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <ShieldCheck size={16} /> Role-Based Access Control (RBAC)
          </div>
          <h1 className="page-title mt-1">Faculty &amp; Team Management</h1>
          <p className="page-lede">
            Assign teacher roles, department governance, and control permissions across the examination lifecycle.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreateModal(true)}
            className="btn btn-primary flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus size={16} /> Add Faculty Member
          </button>
        )}
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

      {/* Permissions Matrix Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="card p-3.5 bg-white border border-purple-200">
          <div className="flex items-center gap-2 font-bold text-xs text-purple-900">
            <Shield size={14} className="text-purple-600" /> Administrator / Principal
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-snug">
            Full control over school settings, user roles, final paper approvals, and confidential audit trail.
          </p>
        </div>
        <div className="card p-3.5 bg-white border border-indigo-200">
          <div className="flex items-center gap-2 font-bold text-xs text-indigo-900">
            <UserCheck size={14} className="text-indigo-600" /> Head of Department (HOD)
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-snug">
            Oversees department syllabus, reviews &amp; moderates question papers, and approves blueprints.
          </p>
        </div>
        <div className="card p-3.5 bg-white border border-emerald-200">
          <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
            <Users size={14} className="text-emerald-600" /> Subject Teacher
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-snug">
            Authors questions, builds draft question papers, and generates parallel set variants.
          </p>
        </div>
        <div className="card p-3.5 bg-white border border-amber-200">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
            <Lock size={14} className="text-amber-600" /> Exam Cell Officer
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-snug">
            Manages print runs, paper ream budgets, hall packaging slips, date-sheet schedules, and OMR sheets.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-3 bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by faculty name, email or department…"
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
          <option value="">All Roles ({users.length})</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {USER_ROLE_LABEL[r]}
            </option>
          ))}
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
                <th className="px-3 py-3">Department</th>
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
                        <span
                          className={`badge font-bold text-[11px] ${
                            u.role === "ADMIN"
                              ? "!bg-purple-100 !text-purple-800"
                              : u.role === "HOD"
                              ? "!bg-indigo-100 !text-indigo-800"
                              : u.role === "EXAM_CELL"
                              ? "!bg-amber-100 !text-amber-800"
                              : "!bg-emerald-100 !text-emerald-800"
                          }`}
                        >
                          {USER_ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-700">
                        {u.department || "General"}
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
                                  department: u.department || "",
                                  active: u.active,
                                });
                              }}
                              className="btn btn-sm btn-ghost text-indigo-700 hover:bg-indigo-50"
                            >
                              <UserCog size={13} /> Manage Role
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
        <Modal title="Add Faculty Member" onClose={() => setCreateModal(false)}>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Assigned Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  className="input w-full font-semibold"
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {USER_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, Science"
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

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
                {savingCreate ? "Creating Member…" : "Create & Grant Access"}
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
          title={`Manage Role & Access: ${editUser.name}`}
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

            <div>
              <label className="label">Assigned Role (RBAC)</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                className="input w-full font-bold text-sm"
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {USER_ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Department</label>
              <input
                type="text"
                placeholder="e.g. Science, Mathematics"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="input w-full"
              />
            </div>

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
                {savingEdit ? "Updating Role…" : "Save Changes"}
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
