"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorBanner, Field, Modal, Spinner, SuccessBanner } from "@/components/ui";
import { api } from "@/lib/client";
import { USER_ROLE_LABEL } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import type { UserData } from "@/lib/types";

export type DetailedProfile = UserData & {
  _count?: {
    questions: number;
    papers: number;
  };
};

export function UserProfileModal({
  onClose,
  onUserUpdated,
}: {
  onClose: () => void;
  onUserUpdated?: (user: Partial<UserData>) => void;
}) {
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [profile, setProfile] = useState<DetailedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile Form
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    api<DetailedProfile>("/api/me")
      .then((data) => {
        setProfile(data);
        setName(data.name || "");
        setDepartment(data.department || "");
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api<DetailedProfile>("/api/me", {
        method: "PATCH",
        json: { name: name.trim(), department: department.trim() },
      });
      setProfile(updated);
      onUserUpdated?.(updated);
      setSuccess("Profile details updated successfully.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setSavingPassword(true);
    setError(null);
    setSuccess(null);
    try {
      await api("/api/me/change-password", {
        method: "POST",
        json: { currentPassword, newPassword, confirmPassword },
      });
      setSuccess("Your password has been changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingPassword(false);
    }
  };

  const initial = (name || profile?.name || "T").trim()[0]?.toUpperCase() || "T";

  return (
    <Modal
      title="Faculty Account & Security"
      subtitle="Manage your profile information and update your credentials."
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* User Identity Header */}
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-900 font-bold text-base text-amber-300 shadow-xs">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 text-sm truncate">
                {profile?.name || name || "Loading..."}
              </span>
              {profile?.role && (
                <span
                  className={`badge font-bold text-[10px] ${
                    profile.role === "ADMIN"
                      ? "!bg-purple-100 !text-purple-800"
                      : profile.role === "HOD"
                      ? "!bg-indigo-100 !text-indigo-800"
                      : profile.role === "EXAM_CELL"
                      ? "!bg-amber-100 !text-amber-800"
                      : "!bg-emerald-100 !text-emerald-800"
                  }`}
                >
                  <Shield size={11} className="mr-1" />
                  {USER_ROLE_LABEL[profile.role] || profile.role}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5 truncate">
              <Mail size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{profile?.email || "..."}</span>
              {profile?.createdAt && (
                <span className="text-slate-400">· Joined {timeAgo(profile.createdAt)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab("profile");
              setError(null);
              setSuccess(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "profile"
                ? "border-indigo-600 text-indigo-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <User size={14} /> Profile &amp; Stats
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("password");
              setError(null);
              setSuccess(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "password"
                ? "border-indigo-600 text-indigo-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <KeyRound size={14} /> Change Password
          </button>
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
            <Spinner />
            <span className="text-xs">Loading faculty account details…</span>
          </div>
        ) : activeTab === "profile" ? (
          <div className="space-y-4">
            {/* Activity Stats Ribbon */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                  <HelpCircle size={13} className="text-indigo-600" /> Authored Questions
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {profile?._count?.questions ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                  <FileText size={13} className="text-amber-600" /> Exam Papers
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {profile?._count?.papers ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                  <CheckCircle2 size={13} className="text-emerald-600" /> Account Status
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-700 flex items-center gap-1">
                  Active Member
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4 pt-1">
              <Field label="Full Name">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. Dr. Sunita Sharma"
                />
              </Field>

              <Field label="Department">
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. Science, Mathematics, English"
                />
              </Field>

              <Field
                label="Registered School Email"
                helper="Institutional email accounts are managed by your administrator."
              >
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ""}
                    className="input w-full bg-slate-100 text-slate-600 cursor-not-allowed pr-8"
                  />
                  <Lock
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </Field>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={onClose} className="btn btn-ghost">
                  Close
                </button>
                <button type="submit" disabled={savingProfile} className="btn btn-primary">
                  {savingProfile ? "Saving Profile…" : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 p-3 text-xs text-indigo-900 leading-relaxed">
              Ensure your new password contains at least <strong>6 characters</strong>. For security, you must provide your current password to confirm this change.
            </div>

            <Field label="Current Password">
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input w-full pr-10"
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="New Password" helper="Minimum 6 characters.">
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input w-full pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="Confirm New Password">
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input w-full pr-10"
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="btn btn-ghost">
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className="btn btn-primary"
              >
                {savingPassword ? "Updating Password…" : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
