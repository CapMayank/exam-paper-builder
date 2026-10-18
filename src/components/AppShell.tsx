"use client";

import {
  BookOpen,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Ruler,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import { AcademicSessionProvider } from "@/lib/academicSession";
import { AcademicSessionSelector } from "./AcademicSessionSelector";
import { BrandMark } from "./BrandMark";
import { Spinner, UiProvider } from "./ui";

const NAV: { href: string; label: string; icon: LucideIcon; hint: string }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, hint: "Overview and academic flow" },
  { href: "/classes", label: "Classes & subjects", icon: GraduationCap, hint: "Session → Class → Subject curriculum hub" },
  { href: "/books", label: "Books & syllabus", icon: BookOpen, hint: "Textbooks and chapters per class & subject" },
  { href: "/questions", label: "Question bank", icon: HelpCircle, hint: "Questions organized by class, subject & chapter" },
  { href: "/blueprints", label: "Blueprints", icon: Ruler, hint: "Marks and chapter quotas per subject" },
  { href: "/papers", label: "Exam papers", icon: FileText, hint: "Build, print and share papers from blueprints" },
  { href: "/exam-cell", label: "Exam cell & Logistics", icon: PackageCheck, hint: "Paper budget calculator, timetable and audit trail" },
  { href: "/admin/users", label: "Faculty & RBAC", icon: ShieldCheck, hint: "Teacher roles and department access" },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
const COLLAPSE_KEY = "exam-builder:sidebar-collapsed";

type User = { name: string; email: string; role?: string; department?: string };

function NavList({ pathname, rail, onNavigate }: { pathname: string; rail: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, hint }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={rail ? label : hint}
            aria-label={rail ? label : undefined}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              rail ? "justify-center px-0" : "px-3"
            } ${active ? "bg-white/10 text-white" : "text-indigo-100/75 hover:bg-white/6 hover:text-white"}`}
          >
            {/* Highlighter stripe marks the current page */}
            <span
              aria-hidden
              className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-amber-300 transition-opacity ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
            <Icon size={18} className={active ? "text-amber-300" : "text-indigo-200/70 group-hover:text-indigo-100"} />
            {!rail && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard({ user, rail, onSignOut }: { user: User | null; rail: boolean; onSignOut: () => void }) {
  if (!user) {
    return (
      <div className={`flex items-center gap-2.5 rounded-xl bg-white/6 p-2 ${rail ? "flex-col" : ""}`}>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-800 text-xs font-semibold text-indigo-200"
          title="Loading..."
        >
          ...
        </span>
        {!rail && (
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-3.5 w-24 rounded bg-white/10 animate-pulse" />
            <div className="h-2.5 w-32 rounded bg-white/5 animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  const initial = user.name ? user.name.trim()[0]?.toUpperCase() : "T";
  return (
    <div className={`flex items-center gap-2.5 rounded-xl bg-white/6 p-2 ${rail ? "flex-col" : ""}`}>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-300 text-sm font-bold text-indigo-950"
        title={rail ? `${user.name} (${user.email})` : undefined}
      >
        {initial}
      </span>
      {!rail && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight text-white">{user.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-block rounded px-1.5 py-0.5 bg-amber-300/20 text-amber-300 border border-amber-300/30 text-[9px] font-bold uppercase tracking-wider">
              {user.role || "Teacher"}
            </span>
            <span className="truncate text-[11px] leading-tight text-indigo-200/70">{user.email}</span>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onSignOut}
        title="Sign out"
        aria-label="Sign out"
        className="rounded-lg p-2 text-indigo-200/80 transition hover:bg-white/10 hover:text-white"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}

/** Client-side auth gate + navigation. The API enforces auth too; this only avoids showing empty pages. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  // The drawer is "open" only for the page it was opened on, so navigating closes it without an effect.
  const drawerOpen = drawerPath === pathname;

  useEffect(() => {
    api<User>("/api/me").then(setUser, () => undefined); // 401 -> api() redirects to /login
  }, []);

  useEffect(() => {
    // Read after mount so server and first client render agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerPath(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      return !c;
    });
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <UiProvider>
      <AcademicSessionProvider>
        <a
          href="#main"
          className="no-print sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
        >
          Skip to content
        </a>

        {/* Desktop sidebar */}
        <aside
          className="no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-800/40 bg-indigo-900 px-3 py-4 transition-[width] duration-200 lg:flex"
          style={{ width: collapsed ? "var(--sidebar-w-rail)" : "var(--sidebar-w)" }}
        >
          <Link
            href="/"
            className={`mb-4 flex items-center gap-3 border-b border-white/10 pb-3.5 px-1.5 ${
              collapsed ? "justify-center px-0" : ""
            }`}
            aria-label="Sarvodaya Higher Secondary School Lakhnadon — Examination Portal Home"
          >
            <BrandMark size={collapsed ? 36 : 40} className="shrink-0" />
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="font-display block truncate text-[14.5px] font-semibold leading-tight text-white">
                  Sarvodaya H.S. School
                </span>
                <span className="mt-0.5 block truncate text-xs text-indigo-200/75">
                  Lakhnadon · Exam Portal
                </span>
              </span>
            )}
          </Link>

          {/* Academic Session Selector in Sidebar */}
          <div className={`mb-4 px-1 ${collapsed ? "flex justify-center" : ""}`}>
            <AcademicSessionSelector compact={collapsed} className={collapsed ? "" : "w-full"} />
          </div>

          <NavList pathname={pathname} rail={collapsed} />

          <div className="mt-auto space-y-2">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-pressed={collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-indigo-200/70 transition hover:bg-white/6 hover:text-white ${collapsed ? "justify-center px-0" : ""}`}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              {!collapsed && "Collapse"}
            </button>
            <UserCard user={user} rail={collapsed} onSignOut={signOut} />
          </div>
        </aside>

        {/* Mobile / tablet top bar */}
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerPath(pathname)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          >
            <Menu size={20} />
          </button>
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <BrandMark size={32} surface="none" />
            <div className="min-w-0">
              <span className="font-display block truncate text-[14px] font-semibold leading-tight text-slate-900">
                Sarvodaya H.S. School, Lakhnadon
              </span>
              <span className="block truncate text-[11px] text-slate-500">
                Examination Portal
              </span>
            </div>
          </Link>
          <div className="ml-auto shrink-0">
            <AcademicSessionSelector compact={true} />
          </div>
        </header>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="no-print fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="anim-fade absolute inset-0 bg-slate-950/50"
              onClick={() => setDrawerPath(null)}
            />
            <aside className="anim-slide-left relative flex h-full w-72 max-w-[85vw] flex-col bg-indigo-900 px-3 py-4" role="dialog" aria-modal="true" aria-label="Navigation">
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3.5 px-1.5">
                <span className="flex items-center gap-2.5 min-w-0">
                  <BrandMark size={36} />
                  <span className="min-w-0">
                    <span className="font-display block truncate text-[14.5px] font-semibold text-white leading-tight">
                      Sarvodaya H.S. School
                    </span>
                    <span className="block truncate text-xs text-indigo-200/75">
                      Lakhnadon · Exam Portal
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerPath(null)}
                  aria-label="Close navigation"
                  className="rounded-lg p-2 text-indigo-200 hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mb-4 px-1.5">
                <AcademicSessionSelector className="w-full" />
              </div>
              <NavList pathname={pathname} rail={false} onNavigate={() => setDrawerPath(null)} />
              <div className="mt-auto">
                <UserCard user={user} rail={false} onSignOut={signOut} />
              </div>
            </aside>
          </div>
        )}

        <div
          className="min-h-screen transition-[padding] duration-200 lg:pl-(--pad) print:pl-0"
          style={{ "--pad": collapsed ? "var(--sidebar-w-rail)" : "var(--sidebar-w)" } as React.CSSProperties}
        >
          <main id="main" tabIndex={-1} className="mx-auto max-w-[90rem] px-4 py-6 outline-none sm:px-8 sm:py-8">
            {children}
          </main>
        </div>
      </AcademicSessionProvider>
    </UiProvider>
  );
}
