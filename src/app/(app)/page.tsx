"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  CopyPlus,
  FileText,
  HelpCircle,
  PencilRuler,
  Plus,
  Printer,
  Ruler,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PaperRow, Progress } from "@/components/PaperRow";
import { EmptyState, ListSkeleton, Skeleton } from "@/components/ui";
import { api } from "@/lib/client";
import { greeting, plural, timeAgo } from "@/lib/format";
import type { Blueprint, Book, PaperListItem, QuestionDto } from "@/lib/types";

type Data = { papers: PaperListItem[]; books: Book[]; blueprints: Blueprint[]; questionCount: number; name: string };

export default function DashboardPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    Promise.all([
      api<PaperListItem[]>("/api/papers"),
      api<Book[]>("/api/books"),
      api<Blueprint[]>("/api/blueprints"),
      api<QuestionDto[]>("/api/questions"),
      api<{ name: string }>("/api/me"),
    ])
      .then(([papers, books, blueprints, q, me]) => setData({ papers, books, blueprints, questionCount: q.length, name: me.name }))
      .catch(() => setData({ papers: [], books: [], blueprints: [], questionCount: 0, name: "" }));
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const sorted = [...data.papers].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const drafts = sorted.filter((p) => p.status !== "FINAL");
    return {
      recent: sorted.slice(0, 6),
      continuing: drafts[0] ?? null,
      draftCount: drafts.length,
      finalCount: sorted.length - drafts.length,
      chapterCount: data.books.reduce((n, b) => n + (b.chapters?.length ?? 0), 0),
    };
  }, [data]);

  if (!data || !view) {
    return (
      <div className="space-y-8" role="status" aria-label="Loading dashboard">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  const setup = [
    { done: data.books.length > 0, label: "Add a book and its chapters", href: "/books", icon: BookOpen },
    { done: data.blueprints.length > 0, label: "Create a blueprint with marks per chapter", href: "/blueprints", icon: Ruler },
    { done: data.questionCount > 0, label: "Write or import questions", href: "/questions", icon: HelpCircle },
    { done: data.papers.length > 0, label: "Build your first paper", href: "/papers", icon: FileText },
  ];
  const setupDone = setup.every((s) => s.done);
  const first = data.name.split(" ").slice(0, 2).join(" ");
  const c = view.continuing;

  return (
    <div className="space-y-8">
      <header className="rise flex flex-wrap items-end justify-between gap-4" style={{ "--i": 0 } as React.CSSProperties}>
        <div>
          <h1 className="page-title">
            {greeting()}
            {first ? `, ${first}` : ""}
          </h1>
          <p className="page-lede">
            {data.papers.length === 0
              ? "Let's build your first exam paper."
              : `${plural(view.draftCount, "draft")} in progress and ${plural(view.finalCount, "finalized paper")}.`}
          </p>
        </div>
        <Link href="/papers" className="btn btn-primary btn-lg">
          <Plus size={18} />
          New exam paper
        </Link>
      </header>

      {c ? (
        <section
          className="rise graph-paper relative grid gap-6 overflow-hidden rounded-2xl border border-slate-200 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8"
          style={{ "--i": 1 } as React.CSSProperties}
          aria-labelledby="continue-title"
        >
          <div className="min-w-0 space-y-4">
            <p className="text-sm font-medium text-slate-600">Pick up where you left off · edited {timeAgo(c.updatedAt)}</p>
            <h2 id="continue-title" className="font-display text-2xl font-semibold leading-snug text-slate-900 sm:text-[1.7rem]">
              {c.title}
            </h2>
            <p className="text-sm text-slate-600">
              {c.blueprint.book.className} {c.blueprint.book.subject} · {c.blueprint.name}
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
              Recent papers
            </h2>
            {data.papers.length > 0 && (
              <Link href="/papers" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900">
                All {data.papers.length} papers <ArrowRight size={14} />
              </Link>
            )}
          </div>
          {view.recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No exam papers yet"
              description="A paper is built from a blueprint. Pick one, choose a layout, and add questions chapter by chapter."
              action={
                <Link href="/papers" className="btn btn-primary">
                  <Plus size={16} /> Create exam paper
                </Link>
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
              Your library
            </h2>
            <div className="card divide-y divide-slate-100 p-0">
              {[
                { href: "/questions", icon: HelpCircle, value: data.questionCount, label: "questions in the bank" },
                { href: "/blueprints", icon: Ruler, value: data.blueprints.length, label: "blueprints" },
                { href: "/books", icon: BookOpen, value: data.books.length, label: `books, ${view.chapterCount} chapters` },
              ].map(({ href, icon: Icon, value, label }) => (
                <Link key={href} href={href} className="group flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-slate-50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                    <Icon size={17} />
                  </span>
                  <span className="text-sm text-slate-600">
                    <span className="mr-1.5 font-display text-lg font-semibold tabular-nums text-slate-900">{value}</span>
                    {label}
                  </span>
                  <ArrowRight size={15} className="ml-auto text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
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
                { href: "/questions", icon: UploadCloud, title: "Import questions", text: "Bring in many at once from CSV or JSON." },
                { href: "/questions", icon: PencilRuler, title: "Draw a figure", text: "Add diagrams, angles and labels to a question." },
                { href: "/papers", icon: CopyPlus, title: "Make Set A, B and C", text: "Generate parallel sets with shared questions." },
              ].map(({ href, icon: Icon, title, text }) => (
                <Link key={title} href={href} className="card card-hover group flex items-start gap-3 p-3.5">
                  <Icon size={18} className="mt-0.5 shrink-0 text-indigo-600" />
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
                Getting set up
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
