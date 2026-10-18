"use client";

import { Eye, EyeOff, Shield, ShieldCheck, School, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { ErrorBanner, Field, Modal, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import { DEFAULT_SCHOOL_LOGO } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [statusLoading, setStatusLoading] = useState(true);
  const [initialized, setInitialized] = useState(true);
  const [schoolCodeConfigured, setSchoolCodeConfigured] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "", schoolCode: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    api<{ initialized: boolean; schoolCodeConfigured: boolean }>("/api/auth/setup-status")
      .then((res) => {
        setInitialized(res.initialized);
        setSchoolCodeConfigured(res.schoolCodeConfigured);
      })
      .catch(() => {
        setInitialized(true);
      })
      .finally(() => setStatusLoading(false));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!initialized) {
        // First-time administrator creation
        await api("/api/auth/register", { method: "POST", json: form });
      } else {
        // Standard staff login
        await api("/api/auth/login", {
          method: "POST",
          json: { email: form.email, password: form.password },
        });
      }
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      {/* Left Institutional Branding Panel */}
      <section className="graph-paper-dark relative hidden flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <span className="font-display text-base font-semibold block leading-tight text-white">
                Sarvodaya Higher Secondary School
              </span>
              <span className="text-xs text-indigo-200/80">
                Lakhnadon · Official Examination Portal
              </span>
            </div>
          </div>
          <span className="text-xs font-medium text-amber-300">
            तमसो माँ ज्योतिर्गमय
          </span>
        </div>

        <div className="my-auto py-8 space-y-6">
          <div className="inline-flex rounded-2xl bg-white p-3.5 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DEFAULT_SCHOOL_LOGO}
              alt="Sarvodaya English Higher Secondary School, Lakhnadon Official Emblem"
              className="h-32 w-32 object-contain"
            />
          </div>

          <div className="max-w-lg space-y-2.5">
            <h2 className="font-display text-3xl font-semibold leading-tight text-white">
              Sarvodaya Higher Secondary School, Lakhnadon
            </h2>
            <p className="text-sm font-medium text-amber-300">
              Sarvodaya English Higher Secondary School · Established 2002
            </p>
            <p className="pt-1 text-base leading-relaxed text-indigo-100/80">
              Pick questions chapter by chapter, verify blueprint mark quotas, author bilingual Hindi &amp; English papers, and print ready-to-fold examination booklets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-indigo-200/75">
          <School size={15} className="text-amber-300" />
          <span>Sarvodaya Higher Secondary School, Lakhnadon · CBSE &amp; Board Compliant</span>
        </div>
      </section>

      {/* Right Login / Setup Form */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs lg:hidden">
            <BrandMark size={48} surface="none" />
            <div className="min-w-0">
              <span className="font-display text-base font-semibold text-slate-900 block leading-tight">
                Sarvodaya H.S. School, Lakhnadon
              </span>
              <span className="text-xs text-slate-600 block">
                तमसो माँ ज्योतिर्गमय · Est. 2002
              </span>
            </div>
          </div>

          {statusLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Spinner />
              <span className="text-xs">Connecting to Sarvodaya School portal…</span>
            </div>
          ) : !initialized ? (
            /* Setup Mode: First-time Admin initialization */
            <div className="space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 mb-2">
                  <ShieldCheck size={13} className="text-amber-700" /> Initial School Setup
                </span>
                <h1 className="font-display text-[1.75rem] font-semibold leading-tight text-slate-900">
                  Create Administrator
                </h1>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Welcome to the official examination portal of <strong>Sarvodaya Higher Secondary School, Lakhnadon</strong>. Create the primary School Administrator account to begin.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <ErrorBanner message={error} />

                <Field label="Administrator / Principal Name">
                  <input
                    className="input"
                    required
                    value={form.name}
                    onChange={set("name")}
                    placeholder="e.g. Dr. Sunita Sharma"
                    autoComplete="name"
                  />
                </Field>

                <Field label="Official School Email">
                  <input
                    type="email"
                    className="input"
                    required
                    value={form.email}
                    onChange={set("email")}
                    autoComplete="email"
                    placeholder="principal@school.edu"
                  />
                </Field>

                <Field label="Administrator Password" helper="At least 8 characters.">
                  <span className="relative block">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input pr-11"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={set("password")}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </Field>

                {schoolCodeConfigured && (
                  <Field label="School Code" helper="Pre-configured environment verification code.">
                    <input
                      className="input"
                      required
                      value={form.schoolCode}
                      onChange={set("schoolCode")}
                      placeholder="e.g. 772070"
                      autoComplete="off"
                    />
                  </Field>
                )}

                <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={busy}>
                  {busy && <Spinner />}
                  {busy ? "Initializing Portal…" : "Complete Setup & Create Admin"}
                </button>
              </form>
            </div>
          ) : (
            /* Normal Operation Mode: Dedicated Staff Login Only */
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-[1.75rem] font-semibold leading-tight text-slate-900">
                  Faculty &amp; Staff Sign In
                </h1>
                <p className="mt-1.5 text-sm text-slate-600">
                  Sign in with your school-assigned credentials.
                </p>
              </div>

              {/* Private School Notice */}
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-slate-900">
                <Shield size={16} className="shrink-0 text-amber-700 mt-0.5" />
                <div className="space-y-0.5 leading-snug">
                  <span className="font-bold block text-slate-900">
                    Sarvodaya Higher Secondary School, Lakhnadon
                  </span>
                  <span className="text-slate-600">
                    Authorized Examination Cell portal. Teacher and coordinator accounts are provisioned by the School Administration.
                  </span>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <ErrorBanner message={error} />

                <Field label="School Email">
                  <input
                    type="email"
                    className="input"
                    required
                    autoFocus
                    value={form.email}
                    onChange={set("email")}
                    autoComplete="email"
                    placeholder="teacher@school.edu"
                  />
                </Field>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <span className="relative block">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input pr-11"
                      required
                      value={form.password}
                      onChange={set("password")}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={busy}>
                  {busy && <Spinner />}
                  {busy ? "Signing in…" : "Sign In to Portal"}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                Forgot password or need an account? <br />
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-slate-800 font-semibold hover:text-indigo-700 underline mt-0.5"
                >
                  Contact your Examination Cell or School Administrator.
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Institutional Password Assistance Modal */}
      {showForgotModal && (
        <Modal
          title="Institutional Password Assistance"
          subtitle="Sarvodaya Higher Secondary School, Lakhnadon"
          onClose={() => setShowForgotModal(false)}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5">
              <Lock size={18} className="shrink-0 text-indigo-700 mt-0.5" />
              <div className="space-y-1 text-xs text-indigo-950 leading-relaxed">
                <div className="font-bold text-sm text-indigo-900">
                  Password Reset Policy (Admin-Managed Only)
                </div>
                <p>
                  To protect the confidentiality of upcoming examination question papers, student marking keys, and curriculum blueprints, self-service automated password resets via external links are disabled.
                </p>
                <p className="font-semibold text-indigo-800">
                  Faculty passwords are reset directly by the School Administrator or Examination Cell.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 text-xs text-slate-700">
              <div className="font-bold text-slate-900 text-sm">How to recover access:</div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                <li>
                  <strong>Contact in person:</strong> Visit the Principal&apos;s Office or Examination Cell coordinator during school hours.
                </li>
                <li>
                  <strong>Direct Request:</strong> Your administrator will generate a secure temporary password for your account in the Faculty &amp; RBAC console.
                </li>
                <li>
                  <strong>Update Credentials:</strong> Once signed in, you can immediately change your password in your Account &amp; Security profile.
                </li>
              </ol>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <a
                href={`mailto:admin@sarvodaya.edu?subject=Sarvodaya%20Exam%20Portal%20-%20Password%20Reset%20Request&body=Respected%20Administrator,%0A%0AI%20am%20requesting%20a%20password%20reset%20for%20my%20faculty%20account%20on%20the%20Sarvodaya%20Examination%20Portal.%0A%0AEmail:%20${encodeURIComponent(
                  form.email || "faculty@school.edu"
                )}%0AFaculty%20Name:%20%0ADepartment:%20%0A%0AThank%20you.`}
                className="btn btn-primary flex items-center justify-center gap-1.5 w-full"
              >
                <Mail size={15} /> Open Email Request to Administrator
              </a>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="btn btn-ghost w-full"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
