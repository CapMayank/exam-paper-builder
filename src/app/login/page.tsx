"use client";

import { Eye, EyeOff, Shield, ShieldCheck, School } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { ErrorBanner, Field, Spinner } from "@/components/ui";
import { api } from "@/lib/client";

/** The panel art is a worked geometry figure, the kind a teacher draws in the margin of a paper. */
function FigureArt() {
  return (
    <svg viewBox="0 0 420 300" className="w-full max-w-md" role="img" aria-label="A triangle ABC with its angle at B marked">
      <g fill="none" stroke="#fcd34d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 240 L340 240 L250 70 Z" />
        <path d="M312 240 A28 28 0 0 1 326.900 215.300" stroke="#fff" strokeWidth="2" />
      </g>
      <g fill="#fff" fontFamily="var(--font-heading), Georgia, serif" fontSize="20" fontStyle="italic">
        <text x="40" y="262">A</text>
        <text x="346" y="262">B</text>
        <text x="246" y="56">C</text>
        <text x="232" y="228" fill="#fcd34d" fontSize="17">θ = 62°</text>
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [statusLoading, setStatusLoading] = useState(true);
  const [initialized, setInitialized] = useState(true);
  const [schoolCodeConfigured, setSchoolCodeConfigured] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "", schoolCode: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Left Branding Panel */}
      <section className="graph-paper-dark relative hidden flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <BrandMark size={38} />
          <div>
            <span className="font-display text-lg font-semibold block leading-tight">Exam Paper Builder</span>
            <span className="text-xs text-amber-300 font-medium">School Institutional Edition</span>
          </div>
        </div>
        <div className="space-y-8">
          <FigureArt />
          <div className="max-w-md space-y-3">
            <h2 className="font-display text-3xl font-semibold leading-tight">
              Institutional exam design and question governance.
            </h2>
            <p className="text-base leading-relaxed text-indigo-100/80">
              Pick questions chapter by chapter, verify blueprint quotas, review bilingual Hindi &amp; English papers, and print ready-to-fold booklet sets.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-indigo-200/70">
          <School size={15} className="text-amber-300" />
          <span>Private School System • CBSE &amp; State Board Compliant</span>
        </div>
      </section>

      {/* Right Login / Setup Form */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark size={34} />
            <div>
              <span className="font-display text-lg font-semibold text-slate-900 block leading-tight">
                Exam Paper Builder
              </span>
              <span className="text-xs text-indigo-600 font-medium">School Portal</span>
            </div>
          </div>

          {statusLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Spinner />
              <span className="text-xs">Connecting to school portal…</span>
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
                  Welcome to your school&apos;s private exam portal. Create the primary School Administrator account. Once completed, public registration is permanently disabled and only you can provision faculty accounts.
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

                <button className="btn btn-primary btn-lg w-full mt-2" disabled={busy}>
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
              <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-950">
                <Shield size={16} className="shrink-0 text-indigo-700 mt-0.5" />
                <div className="space-y-0.5 leading-snug">
                  <span className="font-bold block text-indigo-900">Private School Portal</span>
                  <span className="text-slate-600">
                    Public registration is disabled. Teacher and coordinator accounts are managed by the School Administration.
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

                <Field label="Password">
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
                </Field>

                <button className="btn btn-primary btn-lg w-full mt-2" disabled={busy}>
                  {busy && <Spinner />}
                  {busy ? "Signing in…" : "Sign In to Portal"}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                Forgot password or need an account? <br />
                <span className="text-slate-700 font-medium">
                  Contact your Examination Cell or School Administrator.
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
