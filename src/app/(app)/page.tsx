"use client";

import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  CopyPlus,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  PackageCheck,
  PencilRuler,
  Plus,
  Printer,
  Ruler,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { PaperRow, Progress } from "@/components/PaperRow";
import { EmptyState, ListSkeleton, Skeleton } from "@/components/ui";
import { normalizeSession, useAcademicSession } from "@/lib/academicSession";
import { api } from "@/lib/client";
import { greeting, plural, timeAgo } from "@/lib/format";
import type { AcademicClassDto, Blueprint, Book, PaperListItem, QuestionDto } from "@/lib/types";

type Data = {
  classes: AcademicClassDto[];
  papers: PaperListItem[];
  books: Book[];
  blueprints: Blueprint[];
  questionCount: number;
  name: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<Data | null>(null);
  const { currentSession } = useAcademicSession();
  const activeSession = normalizeSession(currentSession);

  useEffect(() => {
    Promise.all([
      api<AcademicClassDto[]>(`/api/classes?session=${encodeURIComponent(activeSession)}`),
      api<PaperListItem[]>("/api/papers"),
      api<Book[]>("/api/books"),
      api<Blueprint[]>("/api/blueprints"),
      api<QuestionDto[]>("/api/questions"),
      api<{ name: string }>("/api/me"),
    ])
      .then(([classes, papers, books, blueprints, q, me]) =>
        setData({ classes, papers, books, blueprints, questionCount: q.length, name: me.name })
      )
      .catch(() =>
        setData({ classes: [], papers: [], books: [], blueprints: [], questionCount: 0, name: "" })
      );
  }, [activeSession]);

  const view = useMemo(() => {
    if (!data) return null;
    const sessBooks = data.books.filter((b) => normalizeSession(b.academicSession) === activeSession);
    const sessBlueprints = data.blueprints.filter(
      (bp) => normalizeSession(bp.academicSession) === activeSession
    );
    const sessPapers = data.papers.filter((p) => normalizeSession(p.academicSession) === activeSession);
    const sorted = [...sessPapers].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const drafts = sorted.filter((p) => p.status !== "FINAL");
    const totalSubjects = data.classes.reduce((sum, c) => sum + c.subjects.length, 0);
    return {
      sessBooks,
      sessBlueprints,
      sessPapers,
      totalSubjects,
      recent: sorted.slice(0, 6),
      continuing: drafts[0] ?? null,
      draftCount: drafts.length,
      finalCount: sorted.length - drafts.length,
      chapterCount: sessBooks.reduce((n, b) => n + (b.chapters?.length ?? 0), 0),
    };
  }, [data, activeSession]);

  if (!data || !view) {
    return (
      <div className="space-y-8" role="status" aria-label="Loading dashboard">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  const setup = [
    { done: data.classes.length > 0, label: "Configure Classes & Subjects for the session", href: "/classes", icon: GraduationCap },
    { done: view.sessBooks.length > 0, label: "Add textbooks & syllabus chapters per subject", href: "/books", icon: BookOpen },
    { done: data.questionCount > 0, label: "Write or import chapter questions", href: "/questions", icon: HelpCircle },
    { done: view.sessBlueprints.length > 0, label: "Create a subject blueprint with chapter quotas", href: "/blueprints", icon: Ruler },
    { done: view.sessPapers.length > 0, label: "Build your exam paper from the blueprint", href: "/papers", icon: FileText },
  ];
  const setupDone = setup.every((s) => s.done);
  const first = data.name.split(" ").slice(0, 2).join(" ");
  const c = view.continuing;

  const hierarchySteps = [
    {
      step: "1. Classes",
      title: plural(data.classes.length, "Class", "Classes"),
      subtitle: `${plural(view.totalSubjects, "Subject")} in ${activeSession}`,
      href: "/classes",
      icon: GraduationCap,
    },
    {
      step: "2. Books & Syllabus",
      title: plural(view.sessBooks.length, "Book"),
      subtitle: `${plural(view.chapterCount, "Chapter")} configured`,
      href: "/books",
      icon: BookOpen,
    },
    {
      step: "3. Question Bank",
      title: plural(data.questionCount, "Question"),
      subtitle: "Tagged by Class, Subject & Chapter",
      href: "/questions",
      icon: HelpCircle,
    },
    {
      step: "4. Blueprints",
      title: plural(view.sessBlueprints.length, "Blueprint"),
      subtitle: "Marks & chapter distribution",
      href: "/blueprints",
      icon: Ruler,
    },
    {
      step: "5. Exam Papers",
      title: plural(view.sessPapers.length, "Paper"),
      subtitle: `${view.draftCount} draft · ${view.finalCount} final`,
      href: "/papers",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Clean Institutional Letterhead Masthead */}
      <header
        className="rise flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        style={{ "--i": 0, boxShadow: "var(--shadow-card)" } as React.CSSProperties}
      >
        <div className="flex items-center gap-4 min-w-0">
          <BrandMark size={64} surface="none" className="shrink-0" />
          <div className="min-w-0 space-y-0.5">
            <h1 className="font-display text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
              Sarvodaya Higher Secondary School, Lakhnadon
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Sarvodaya English Higher Secondary School · Est. 2002 · तमसो माँ ज्योतिर्गमय · Session {activeSession}
            </p>
            <p className="pt-1 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">
                {greeting()}
                {first ? `, ${first}` : ""}.
              </span>{" "}
              {view.sessPapers.length === 0
                ? `Manage Classes, Subjects, Books, and Blueprints for Session ${activeSession}.`
                : `${plural(view.draftCount, "draft")} in progress and ${plural(view.finalCount, "finalized paper")} in Session ${activeSession}.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/classes" className="btn">
            <GraduationCap size={16} className="text-slate-700" />
            Classes &amp; Subjects
          </Link>
          <Link href="/papers" className="btn btn-primary btn-lg">
            <Plus size={18} />
            New exam paper
          </Link>
        </div>
      </header>

      {/* Explicit Session-Wise Academic Hierarchy Pipeline */}
      <section
        className="rise rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
        style={{ "--i": 0.5, boxShadow: "var(--shadow-card)" } as React.CSSProperties}
        aria-label="Academic workflow hierarchy"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
              <Calendar size={13} className="text-amber-300" /> Session {activeSession}
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              Academic Curriculum &amp; Assessment Flow
            </h2>
          </div>
          <Link
            href="/classes"
            className="text-xs font-semibold text-slate-700 hover:text-slate-950 inline-flex items-center gap-1"
          >
            Open Class &amp; Subject Manager <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          {hierarchySteps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.step}
                href={item.href}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 transition hover:border-slate-400 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {item.step}
                  </span>
                  <Icon size={15} className="text-slate-600 group-hover:text-slate-900" />
                </div>
                <div className="mt-2">
                  <div className="font-display text-base font-bold text-slate-900">{item.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</div>
                </div>
                {idx < hierarchySteps.length - 1 && (
                  <ChevronRight
                    size={14}
                    className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {c ? (
        <section
          className="rise graph-paper relative grid gap-6 overflow-hidden rounded-2xl border border-slate-200 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8"
          style={{ "--i": 1 } as React.CSSProperties}
          aria-labelledby="continue-title"
        >
          <div className="min-w-0 space-y-4">
            <p className="text-sm font-medium text-slate-600">
              Pick up where you left off · edited {timeAgo(c.updatedAt)}
            </p>
            <h2 id="continue-title" className="font-display text-2xl font-semibold leading-snug text-slate-900 sm:text-[1.7rem]">
              {c.title}
            </h2>
            <p className="text-sm text-slate-600">
              {c.blueprint.book.className} · {c.blueprint.book.subject} · Blueprint: {c.blueprint.name}
            </p>
            <div className="max-w-md">
              <Progress filled={c.filled} needed={c.needed} />
              <p className="mt-1 text-sm text-slate-600">
                {c.filled >= c.needed ? "Every slot is filled. Check the page budget and print." : `${plural(c.needed - c.filled, "question slot")} left to fill.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
            <Link href={`/papers/${c.id}`} className="btn btn-primary btn-lg">
              Continue editing <ArrowRight size={17} />
            </Link>
            <Link href={`/papers/${c.id}/print`} target="_blank" className="btn">
              <Printer size={15} /> Print preview
            </Link>
          </div>
        </section>
      ) : null}

      <div className="rise grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]" style={{ "--i": 2 } as React.CSSProperties}>
        <section aria-labelledby="recent-title" className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-title" className="font-display text-lg font-semibold text-slate-900">
              Recent papers ({activeSession})
            </h2>
            {view.sessPapers.length > 0 && (
              <Link href="/papers" className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-950">
                All {view.sessPapers.length} papers <ArrowRight size={14} />
              </Link>
            )}
          </div>
          {view.recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={`No exam papers in Session ${activeSession} yet`}
              description="Start by selecting a Class & Subject, setting up its Book & Blueprint, and building your paper."
              action={
                <div className="flex flex-wrap gap-2">
                  <Link href="/classes" className="btn">
                    <GraduationCap size={16} /> Go to Classes &amp; Subjects
                  </Link>
                  <Link href="/papers" className="btn btn-primary">
                    <Plus size={16} /> Create exam paper
                  </Link>
                </div>
              }
            />
          ) : (
            <ul className="relative divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ boxShadow: "var(--shadow-card)" }}>
              {view.recent.map((p) => (
                <PaperRow key={p.id} p={p} />
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="glance-title">
            <h2 id="glance-title" className="mb-3 font-display text-lg font-semibold text-slate-900">
              Session {activeSession} Overview
            </h2>
            <div className="card divide-y divide-slate-100 p-0">
              {[
                { href: "/classes", icon: GraduationCap, value: data.classes.length, label: `classes, ${view.totalSubjects} subjects` },
                { href: "/books", icon: BookOpen, value: view.sessBooks.length, label: `books, ${view.chapterCount} chapters` },
                { href: "/questions", icon: HelpCircle, value: data.questionCount, label: "questions in the bank" },
                { href: "/blueprints", icon: Ruler, value: view.sessBlueprints.length, label: "blueprints" },
              ].map(({ href, icon: Icon, value, label }) => (
                <Link key={href} href={href} className="group flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-slate-50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
                    <Icon size={17} />
                  </span>
                  <span className="text-sm text-slate-600">
                    <span className="mr-1.5 font-display text-lg font-semibold tabular-nums text-slate-900">{value}</span>
                    {label}
                  </span>
                  <ArrowRight size={15} className="ml-auto text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="shortcuts-title">
            <h2 id="shortcuts-title" className="mb-3 font-display text-lg font-semibold text-slate-900">
              Shortcuts
            </h2>
            <div className="space-y-2">
              {[
                { href: "/classes", icon: Layers, title: "Manage Classes & Subjects", text: "Organize subjects, books, and blueprints class-wise." },
                { href: "/questions", icon: UploadCloud, title: "Import questions", text: "Bring in many at once from CSV or JSON." },
                { href: "/questions", icon: PencilRuler, title: "Draw a figure", text: "Add diagrams, angles and labels to a question." },
                { href: "/papers", icon: CopyPlus, title: "Make Set A, B and C", text: "Generate parallel sets with shared questions." },
              ].map(({ href, icon: Icon, title, text }) => (
                <Link key={title} href={href} className="card card-hover group flex items-start gap-3 p-3.5">
                  <Icon size={18} className="mt-0.5 shrink-0 text-slate-700" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{title}</span>
                    <span className="block text-xs leading-relaxed text-slate-500">{text}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {!setupDone && (
            <section aria-labelledby="setup-title" className="card space-y-3 border-amber-200 bg-amber-50/60">
              <h2 id="setup-title" className="font-display text-base font-semibold text-slate-900">
                Session Setup Checklist
              </h2>
              <ol className="space-y-1.5">
                {setup.map(({ done, label, href }) => (
                  <li key={label}>
                    <Link href={href} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${done ? "text-slate-500" : "font-medium text-slate-900 hover:bg-white"}`}>
                      {done ? <CheckCircle2 size={17} className="text-emerald-600" /> : <Circle size={17} className="text-slate-400" />}
                      <span className={done ? "line-through decoration-slate-300" : ""}>{label}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
