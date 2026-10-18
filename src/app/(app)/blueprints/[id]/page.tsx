"use client";

import { ArrowDown, ArrowUp, FileText, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ErrorBanner, Field, useConfirm, useToast } from "@/components/ui";
import { BlueprintImportModal } from "@/components/BlueprintImportModal";
import { useAcademicSession } from "@/lib/academicSession";
import {
  blueprintTotalMarks,
  checkBlueprintFeasibility,
  flattenSectionGroups,
  groupSectionsFromFlat,
  reletterTitle,
  validateBlueprint,
  type QuestionTypeItem,
  type SectionGroup,
} from "@/lib/blueprint";
import { api } from "@/lib/client";
import { DEFAULT_SCHOOL_NAME, EXAM_TYPES, EXAM_TYPE_LABEL, QUESTION_TYPES, QUESTION_TYPE_LABEL } from "@/lib/constants";
import type { Blueprint, Book, PaperData } from "@/lib/types";

let qtSeq = 0;
const newQuestionType = (over: Partial<QuestionTypeItem> = {}): QuestionTypeItem => ({
  key: `qt${qtSeq++}`,
  type: "MCQ",
  count: 5,
  marksEach: 1,
  ...over,
});

let secSeq = 0;
const newSectionGroup = (over: Partial<SectionGroup> = {}, defaultIndex = 0): SectionGroup => ({
  key: `sec${secSeq++}`,
  title: `Section ${String.fromCharCode(65 + defaultIndex)}`,
  instructions: "",
  questionTypes: [newQuestionType()],
  ...over,
});

const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

export default function BlueprintEditorPage({ params, searchParams }: PageProps<"/blueprints/[id]">) {
  const { id } = use(params);
  const sp = use(searchParams);
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const { currentSession, availableSessions } = useAcademicSession();

  const [books, setBooks] = useState<Book[]>([]);
  const [name, setName] = useState("");
  const [academicSession, setAcademicSession] = useState(currentSession);
  const [bookId, setBookId] = useState("");
  const [examType, setExamType] = useState<string>("QUARTERLY");
  const [durationMin, setDurationMin] = useState(60);
  const [subjectCode, setSubjectCode] = useState("");
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [sectionGroups, setSectionGroups] = useState<SectionGroup[]>([]);
  const [paperCount, setPaperCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("");

  useEffect(() => {
    if (sp.import === "true" || sp.import === "1") {
      setImportModalOpen(true);
    }
  }, [sp.import]);

  useEffect(() => {
    (async () => {
      try {
        const [bs, source] = await Promise.all([
          api<Book[]>("/api/books"),
          id !== "new" ? api<Blueprint>(`/api/blueprints/${id}`) : from ? api<Blueprint>(`/api/blueprints/${from}`) : Promise.resolve(null),
        ]);
        setBooks(bs);
        if (source) {
          setName(id === "new" ? `${source.name} (copy)` : source.name);
          setBookId(source.bookId);
          const matchedBook = bs.find((b) => b.id === source.bookId);
          if (matchedBook) {
            setSelectedClassFilter(matchedBook.className);
            setSelectedSubjectFilter(matchedBook.subject);
          }
          setAcademicSession(source.academicSession || currentSession);
          setExamType(source.examType);
          setDurationMin(source.durationMin);
          setSubjectCode(source.subjectCode || "");
          setMarks(Object.fromEntries(source.chapters.map((c) => [c.chapterId, c.marks])));
          setSectionGroups(groupSectionsFromFlat(source.sections));
          setPaperCount(id === "new" ? 0 : source._count.papers);
        } else {
          const urlBookId = typeof sp.bookId === "string" ? sp.bookId : undefined;
          const urlCode = typeof sp.subjectCode === "string" ? sp.subjectCode : "";
          const urlClassName = typeof sp.className === "string" ? sp.className : "";
          const urlSubject = typeof sp.subject === "string" ? sp.subject : "";

          const initialBook =
            (urlBookId && bs.find((b) => b.id === urlBookId)) ||
            (urlClassName && urlSubject && bs.find(
              (b) =>
                b.className.trim().toLowerCase() === urlClassName.trim().toLowerCase() &&
                b.subject.trim().toLowerCase() === urlSubject.trim().toLowerCase()
            )) ||
            (urlClassName && bs.find((b) => b.className.trim().toLowerCase() === urlClassName.trim().toLowerCase())) ||
            bs[0];

          setBookId(initialBook?.id ?? "");
          if (initialBook) {
            setSelectedClassFilter(initialBook.className);
            setSelectedSubjectFilter(initialBook.subject);
            setName(`${initialBook.className} ${initialBook.subject} – Blueprint`);
          } else if (urlClassName) {
            setSelectedClassFilter(urlClassName);
            if (urlSubject) setSelectedSubjectFilter(urlSubject);
            setName(`${urlClassName} ${urlSubject || ""} – Blueprint`.trim());
          }
          if (urlCode) setSubjectCode(urlCode);
          setAcademicSession(currentSession);
          setSectionGroups([
            newSectionGroup(
              {
                title: "Section A",
                instructions: "All questions are compulsory.",
                questionTypes: [newQuestionType({ type: "MCQ", count: 10, marksEach: 1 })],
              },
              0
            ),
          ]);
        }
        setLoaded(true);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [id, from, currentSession, sp.bookId, sp.subjectCode, sp.className, sp.subject]);

  const hasPapers = paperCount > 0;
  const book = books.find((b) => b.id === bookId);
  const chapterQuotas = (book?.chapters ?? []).map((c) => ({ chapterId: c.id, marks: marks[c.id] ?? 0 }));
  const sections = flattenSectionGroups(sectionGroups);
  const total = blueprintTotalMarks(sections);
  const chapterTotal = chapterQuotas.reduce((s, c) => s + c.marks, 0);
  const problems = validateBlueprint({ sections, chapters: chapterQuotas });
  const feasibilityWarnings = checkBlueprintFeasibility({ sections, chapters: chapterQuotas });

  function autoDistributeMarks() {
    if (!book || book.chapters.length === 0 || total === 0) return;
    const n = book.chapters.length;
    const base = Math.floor(total / n);
    const remainder = total % n;
    const nextMarks: Record<string, number> = {};
    book.chapters.forEach((c, idx) => {
      nextMarks[c.id] = base + (idx < remainder ? 1 : 0);
    });
    setMarks(nextMarks);
  }

  function addSectionGroup() {
    setSectionGroups((groups) => [
      ...groups,
      newSectionGroup({}, groups.length),
    ]);
  }

  function removeSectionGroup(key: string) {
    setSectionGroups((groups) => {
      const remaining = groups.filter((g) => g.key !== key);
      return remaining.map((grp, idx) => ({
        ...grp,
        title: reletterTitle(grp.title, idx),
      }));
    });
  }

  function patchSectionGroup(key: string, patch: Partial<SectionGroup>) {
    setSectionGroups((groups) =>
      groups.map((g) => (g.key === key ? { ...g, ...patch } : g))
    );
  }

  function moveSectionGroup(i: number, d: -1 | 1) {
    setSectionGroups((groups) => {
      const next = [...groups];
      const target = i + d;
      if (target < 0 || target >= next.length) return groups;
      [next[i], next[target]] = [next[target], next[i]];
      // Re-sequence section letters so Section A, B, C, D, E, F stay strictly sequential!
      // "like if i change Sec E and F so F will not be changed with E vice versa"
      return next.map((grp, idx) => ({
        ...grp,
        title: reletterTitle(grp.title, idx),
      }));
    });
  }

  function addQuestionTypeToGroup(groupKey: string) {
    setSectionGroups((groups) =>
      groups.map((g) =>
        g.key === groupKey
          ? {
              ...g,
              questionTypes: [
                ...g.questionTypes,
                newQuestionType({
                  type: g.questionTypes.length === 1 ? "FILL_BLANK" : "SHORT",
                  count: 5,
                  marksEach: 1,
                }),
              ],
            }
          : g
      )
    );
  }

  function patchQuestionType(groupKey: string, qtKey: string, patch: Partial<QuestionTypeItem>) {
    setSectionGroups((groups) =>
      groups.map((g) =>
        g.key === groupKey
          ? {
              ...g,
              questionTypes: g.questionTypes.map((qt) =>
                qt.key === qtKey ? { ...qt, ...patch } : qt
              ),
            }
          : g
      )
    );
  }

  function removeQuestionType(groupKey: string, qtKey: string) {
    setSectionGroups((groups) =>
      groups.map((g) => {
        if (g.key !== groupKey) return g;
        if (g.questionTypes.length <= 1) return g;
        return {
          ...g,
          questionTypes: g.questionTypes.filter((qt) => qt.key !== qtKey),
        };
      })
    );
  }

  function handleImportedBlueprint(imported: {
    name: string;
    examType: string;
    durationMin: number;
    academicSession?: string;
    subjectCode?: string;
    bookId?: string;
    sections: {
      title: string;
      type: string;
      count: number;
      marksEach: number;
      instructions: string;
    }[];
    chapterMarks?: Record<string, number>;
  }) {
    if (imported.name) {
      setName(imported.name);
    }
    if (imported.bookId && imported.bookId !== bookId && !hasPapers) {
      setBookId(imported.bookId);
    }
    if (imported.examType) {
      setExamType(imported.examType);
    }
    if (imported.durationMin) {
      setDurationMin(imported.durationMin);
    }
    if (imported.academicSession) {
      setAcademicSession(imported.academicSession);
    }
    if (imported.subjectCode) {
      setSubjectCode(imported.subjectCode);
    }
    if (imported.sections && imported.sections.length > 0) {
      setSectionGroups(groupSectionsFromFlat(imported.sections));
    }
    if (imported.chapterMarks && Object.keys(imported.chapterMarks).length > 0) {
      setMarks((prev) => ({ ...prev, ...imported.chapterMarks }));
    }
    const totalMarks = blueprintTotalMarks(imported.sections);
    toast.success(
      `Imported blueprint: ${imported.sections.length} section item(s) totaling ${totalMarks} marks!`
    );
  }

  async function save(e?: React.FormEvent, andBuildPaper = false) {
    if (e) e.preventDefault();
    setError(null);

    if (hasPapers && !andBuildPaper) {
      const ok = await confirm({
        title: `Save Blueprint & Sync ${paperCount} Paper(s)?`,
        message: `This blueprint is used in ${paperCount} exam paper(s). Section and quota updates will be applied in-place. If any finalized papers have quota discrepancies, they will safely revert to Draft with detailed reconciliation steps.`,
        confirmLabel: "Save & Synchronize Papers",
        tone: "default",
      });
      if (!ok) return;
    }

    setBusy(true);
    try {
      const json = {
        name,
        bookId,
        academicSession,
        examType,
        durationMin,
        subjectCode,
        chapters: chapterQuotas.filter((c) => c.marks > 0),
        sections: sections.map((s) => ({
          id: s.id,
          title: s.title,
          instructions: s.instructions,
          type: s.type,
          count: s.count,
          marksEach: s.marksEach,
        })),
      };
      let savedBlueprintId = id;
      if (id === "new") {
        const created = await api<{ id: string }>("/api/blueprints", { method: "POST", json });
        savedBlueprintId = created.id;
        toast.success("Blueprint created successfully");
      } else {
        await api(`/api/blueprints/${id}`, { method: "PUT", json });
        toast.success(hasPapers ? `Updated blueprint & synchronized ${paperCount} paper(s)` : "Blueprint saved successfully");
      }

      if (andBuildPaper) {
        const paper = await api<PaperData>("/api/papers", {
          method: "POST",
          json: {
            title: `${name} — Draft Paper`,
            blueprintId: savedBlueprintId,
            examType,
            layout: "BOOKLET_A4",
            schoolName: DEFAULT_SCHOOL_NAME,
            paperSet: "SET A",
            subjectCode,
            academicSession,
          },
        });
        toast.success(`Created paper "${paper.title}"`);
        router.push(`/papers/${paper.id}`);
      } else {
        router.push("/blueprints");
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!loaded) return error ? <ErrorBanner message={error} /> : <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{id === "new" ? "New blueprint" : "Edit blueprint"}</h1>
        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="btn btn-ghost border border-indigo-200 bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100 flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
          title="Import blueprint specification from JSON or CSV"
        >
          <Upload size={14} className="text-indigo-600" /> Import blueprint
        </button>
      </div>

      {id === "new" && (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Have a syllabus or exam specification ready?</strong> Upload your JSON or CSV file to auto-configure sections, marks, and chapter weightages instantly.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="btn btn-sm btn-ghost bg-slate-50 border border-slate-200 text-slate-900 hover:bg-slate-100 text-xs font-semibold shrink-0 flex items-center gap-1.5"
          >
            <Upload size={13} /> Import file
          </button>
        </div>
      )}
      
      {hasPapers && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Sparkles size={16} className="text-amber-600" />
            <span>Smart In-Use Blueprint Editing ({paperCount} linked paper{paperCount > 1 ? "s" : ""})</span>
          </div>
          <p className="leading-relaxed">
            You can freely modify section titles, bilingual instructions, question quotas, marks, and chapter quotas. 
            When you save, the system will update the blueprint in-place, preserve existing question placements, 
            and provide an intelligent reconciliation report in each linked paper detailing any required adjustments.
          </p>
        </div>
      )}

      <ErrorBanner message={error} />

      <section className="card grid gap-3 sm:grid-cols-4">
        <Field label="Academic session">
          <select className="input" value={academicSession} onChange={(e) => setAcademicSession(e.target.value)}>
            {availableSessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Class">
          <select
            className="input"
            value={selectedClassFilter}
            disabled={hasPapers}
            onChange={(e) => {
              const cls = e.target.value;
              setSelectedClassFilter(cls);
              setSelectedSubjectFilter("");
              const firstMatch = books.find((b) => !cls || b.className === cls);
              if (firstMatch) {
                setBookId(firstMatch.id);
                setMarks({});
              }
            }}
          >
            <option value="">All Classes</option>
            {Array.from(new Set(books.map((b) => b.className)))
              .sort()
              .map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Subject">
          <select
            className="input"
            value={selectedSubjectFilter}
            disabled={hasPapers}
            onChange={(e) => {
              const sub = e.target.value;
              setSelectedSubjectFilter(sub);
              const firstMatch = books.find(
                (b) =>
                  (!selectedClassFilter || b.className === selectedClassFilter) &&
                  (!sub || b.subject === sub)
              );
              if (firstMatch) {
                setBookId(firstMatch.id);
                setMarks({});
              }
            }}
          >
            <option value="">All Subjects</option>
            {Array.from(
              new Set(
                books
                  .filter((b) => !selectedClassFilter || b.className === selectedClassFilter)
                  .map((b) => b.subject)
              )
            )
              .sort()
              .map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Textbook / Syllabus" helper={hasPapers ? "Book cannot be changed while papers use this blueprint." : undefined}>
          <select
            className="input"
            value={bookId}
            required
            disabled={hasPapers}
            onChange={(e) => {
              const picked = books.find((b) => b.id === e.target.value);
              setBookId(e.target.value);
              if (picked) {
                setSelectedClassFilter(picked.className);
                setSelectedSubjectFilter(picked.subject);
              }
              setMarks({});
            }}
          >
            {books
              .filter(
                (b) =>
                  (!selectedClassFilter || b.className === selectedClassFilter) &&
                  (!selectedSubjectFilter || b.subject === selectedSubjectFilter)
              )
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.className} · {b.subject})
                </option>
              ))}
          </select>
        </Field>

        <Field label="Blueprint name" className="sm:col-span-2">
          <input className="input" required value={name} placeholder="Class 10 Mathematics – Half Yearly" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Exam">
          <select className="input" value={examType} onChange={(e) => setExamType(e.target.value)}>
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {EXAM_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Duration (min)">
            <input type="number" min={5} className="input" value={durationMin} onChange={(e) => setDurationMin(num(e.target.value))} />
          </Field>
          <Field label="Subject code">
            <input className="input" value={subjectCode} placeholder="041" onChange={(e) => setSubjectCode(e.target.value)} />
          </Field>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-900">Sections & Question Types</h2>
              <p className="text-xs text-slate-500">
                Each section can contain multiple question types (e.g. 5 MCQ + 5 Fill in Blank in Section A).
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={addSectionGroup}
            >
              <Plus size={14} /> Add section
            </button>
          </div>

          <div className="space-y-4">
            {sectionGroups.map((grp, i) => {
              const grpCount = grp.questionTypes.reduce((s, qt) => s + qt.count, 0);
              const grpMarks = grp.questionTypes.reduce((s, qt) => s + qt.count * qt.marksEach, 0);

              return (
                <fieldset key={grp.key} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  {/* Section Title & Reordering */}
                  <div className="flex items-center gap-2">
                    <input
                      className="input font-semibold text-sm flex-1"
                      required
                      placeholder={`Section ${String.fromCharCode(65 + i)}`}
                      value={grp.title}
                      onChange={(e) => patchSectionGroup(grp.key, { title: e.target.value })}
                      aria-label="Section title"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={i === 0}
                        onClick={() => moveSectionGroup(i, -1)}
                        title="Move section up"
                        aria-label="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={i === sectionGroups.length - 1}
                        onClick={() => moveSectionGroup(i, 1)}
                        title="Move section down"
                        aria-label="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={sectionGroups.length <= 1}
                        onClick={() => removeSectionGroup(grp.key)}
                        title="Delete entire section"
                        aria-label="Remove section"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Section Instructions */}
                  <input
                    className="input text-xs text-slate-700"
                    placeholder="Instructions (e.g. All questions are compulsory. Multiple choice and objective questions.)"
                    value={grp.instructions}
                    onChange={(e) => patchSectionGroup(grp.key, { instructions: e.target.value })}
                    aria-label="Instructions"
                  />

                  {/* Question Types within this Section */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-100 pb-1">
                      <span>Question Types in {grp.title || `Section ${String.fromCharCode(65 + i)}`}</span>
                      <span className="badge badge-indigo text-[10px] font-bold">
                        {grpCount} Qs · {grpMarks} Marks
                      </span>
                    </div>

                    <div className="space-y-2">
                      {grp.questionTypes.map((qt) => (
                        <div
                          key={qt.key}
                          className="rounded-lg border border-slate-200/90 bg-slate-50/70 p-2.5 space-y-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <select
                                className="input text-xs py-1.5 w-full font-medium text-slate-800"
                                value={qt.type}
                                onChange={(e) => patchQuestionType(grp.key, qt.key, { type: e.target.value })}
                                aria-label="Question type"
                              >
                                {QUESTION_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {QUESTION_TYPE_LABEL[t]}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {grp.questionTypes.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost hover:bg-red-50 hover:text-red-700 text-slate-400 p-1.5 shrink-0"
                                onClick={() => removeQuestionType(grp.key, qt.key)}
                                title="Remove this question type"
                                aria-label="Remove question type"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-slate-600 pt-0.5">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-500 font-medium">Count:</span>
                                <input
                                  type="number"
                                  min={1}
                                  style={{ width: "3.75rem" }}
                                  className="input text-xs py-1 px-2 text-center font-medium"
                                  value={qt.count}
                                  onChange={(e) => patchQuestionType(grp.key, qt.key, { count: num(e.target.value) })}
                                  aria-label="Question count"
                                />
                              </div>

                              <span className="text-slate-400 text-xs">×</span>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-500 font-medium">Marks:</span>
                                <input
                                  type="number"
                                  min={1}
                                  style={{ width: "3.75rem" }}
                                  className="input text-xs py-1 px-2 text-center font-medium"
                                  value={qt.marksEach}
                                  onChange={(e) => patchQuestionType(grp.key, qt.key, { marksEach: num(e.target.value) })}
                                  aria-label="Marks each"
                                />
                              </div>
                            </div>

                            <div className="font-semibold text-slate-800 text-xs bg-white px-2 py-1 rounded border border-slate-200">
                              = {qt.count * qt.marksEach} marks
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm text-xs font-semibold text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/80 border border-indigo-200/80 w-full flex items-center justify-center gap-1.5 py-1.5 transition"
                      onClick={() => addQuestionTypeToGroup(grp.key)}
                    >
                      <Plus size={13} className="text-indigo-600" /> Add another question type to {grp.title || `Section ${String.fromCharCode(65 + i)}`}
                    </button>
                  </div>
                </fieldset>
              );
            })}
          </div>

          <div className="text-sm font-semibold text-slate-900 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Total Sections Marks:</span>
            <span className="badge badge-indigo text-xs font-bold px-3 py-1">{total} marks</span>
          </div>
        </section>

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Chapter weightage (marks)</h2>
            {book && book.chapters.length > 0 && total > 0 && (
              <button
                type="button"
                className="btn btn-sm text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                onClick={autoDistributeMarks}
                title="Equally distribute section total marks across all chapters"
              >
                ⚡ Auto-distribute {total}m
              </button>
            )}
          </div>
          {!book || book.chapters.length === 0 ? (
            <p className="text-sm text-slate-500">This book has no chapters yet. Add them under Books.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {book.chapters.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="w-10 py-1.5 text-slate-500">{c.number}</td>
                    <td className="py-1.5">{c.title}</td>
                    <td className="w-24 py-1.5">
                      <input
                        type="number"
                        min={0}
                        className="input"
                        aria-label={`Marks for chapter ${c.number}`}
                        value={marks[c.id] ?? 0}
                        onChange={(e) => setMarks({ ...marks, [c.id]: num(e.target.value) })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="pt-2 border-t border-slate-100">
            {chapterTotal === total && total > 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 border border-emerald-200">
                <span>✓ Quota Balanced: Chapter marks ({chapterTotal}m) exactly match section total ({total}m).</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 border border-amber-200">
                <span>
                  ⚠ Quota Imbalance: Chapters sum to {chapterTotal} marks, but sections require {total} marks (
                  {Math.abs(total - chapterTotal)}m {chapterTotal < total ? "needed" : "in excess"}).
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      {(problems.length > 0 || feasibilityWarnings.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-2xs space-y-1">
          <div className="font-bold text-amber-950">Blueprint Validation Checklist:</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
            {feasibilityWarnings.map((w) => (
              <li key={w} className="text-amber-800 font-semibold">
                ⚠ Feasibility notice: {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(e) => void save(e, true)}
          className="btn btn-primary flex items-center gap-1.5"
          disabled={busy || problems.length > 0}
          title="Save blueprint and open immediately in Paper Studio to generate exam paper"
        >
          <FileText size={15} /> Save &amp; Build Exam Paper
        </button>
        <button
          type="submit"
          className="btn btn-ghost border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 font-semibold"
          disabled={busy || problems.length > 0}
        >
          {busy ? "Saving…" : "Save Blueprint"}
        </button>
        <button
          type="button"
          className="btn btn-ghost border border-slate-200"
          onClick={() => router.push("/blueprints")}
        >
          Cancel
        </button>
      </div>

      <BlueprintImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onApply={handleImportedBlueprint}
        book={book}
        books={books}
      />
    </form>
  );
}
