"use client";

import { ArrowLeft, CheckCircle2, FileDown, FileText, Grid3X3, ListChecks, Printer, Table } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { MathText } from "@/components/MathText";
import { api, imageUrl } from "@/lib/client";
import {
  cleanOptionText,
  DEFAULT_SCHOOL_LOGO,
  DEFAULT_SCHOOL_NAME,
  EXAM_TYPE_LABEL,
  isMcqLikeType,
  isSubpartQuestionType,
  normalizeMcqAnswer,
  parseMatchColumnPairs,
  QUESTION_TYPE_LABEL,
  resolvePaperExamType,
} from "@/lib/constants";
import { subpartsTotalMarks } from "@/lib/types";
import { formatQuestionNumber } from "@/lib/layout";
import type { PaperData, QuestionDto } from "@/lib/types";

function getMarksRubric(marks: number, type: string) {
  if (isMcqLikeType(type)) return ["1 mark: Correct option selected"];
  if (type === "TRUE_FALSE") return ["1 mark: Correct identification of True/False"];
  if (type === "FILL_BLANK") return ["1 mark: Correct word/term filled in"];
  if (marks === 1) return ["1 mark: Complete and accurate answer"];
  if (marks === 2) return ["1 mark: Accurate definition or principle statement", "1 mark: Proper explanation, formula or example"];
  if (marks === 3) return ["1 mark: Core principle/statement", "1 mark: Accurate diagram, formula, or derivation", "1 mark: Correct conclusion, units, or application"];
  if (marks === 4) return ["1 mark: Identification/statement", "1.5 marks: Step-wise explanation or calculation", "1.5 marks: Diagram or final result with units"];
  if (marks >= 5) return [
    "2 marks: Comprehensive concept definition/statement",
    "2 marks: Neat diagram, detailed working, or experimental setup",
    "1 mark: Final inference, precautions, or practical application",
  ];
  return [`${marks} marks: Full marks for complete and structured answer`];
}

export default function SolutionsPage({ params }: PageProps<"/papers/[id]/solutions">) {
  const { id } = use(params);
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"SOLUTIONS" | "AWARD_LIST">("SOLUTIONS");

  useEffect(() => {
    api<PaperData>(`/api/papers/${id}`).then(setPaper, (e) => setError(e.message));
  }, [id]);

  if (error) return <p className="p-8 text-red-700">{error}</p>;
  if (!paper) return <p className="p-8 text-sm text-slate-500">Loading…</p>;

  const { blueprint } = paper;
  const resolvedLogoSrc =
    paper.schoolLogo === "NONE"
      ? null
      : paper.logoPath
      ? imageUrl(paper.logoPath)
      : paper.schoolLogo || DEFAULT_SCHOOL_LOGO;

  // Flatten questions with numbering matching paper numbering style
  const allNumberedItems: {
    number: number;
    label: string;
    itemId: string;
    sectionTitle: string;
    marks: number;
    type: string;
    question: QuestionDto;
    orQuestion?: QuestionDto | null;
  }[] = [];
  let numCount = 0;
  let sectionGroupCounter = 0;
  let sectionRelativeCounter = 0;
  for (let i = 0; i < blueprint.sections.length; i++) {
    const s = blueprint.sections[i];
    const prev = i > 0 ? blueprint.sections[i - 1] : null;
    const isSameAsPrev = Boolean(prev && prev.title.trim().toLowerCase() === s.title.trim().toLowerCase());
    if (!isSameAsPrev) {
      if (i > 0) {
        sectionGroupCounter++;
      }
      sectionRelativeCounter = 0;
    }
    const match = s.title.match(/section\s+([a-z0-9]+)/i);
    const sectionLetter = match ? match[1].toUpperCase() : String.fromCharCode(65 + sectionGroupCounter);

    const items = paper.items.filter((item) => item.sectionId === s.id);
    for (const it of items) {
      const globalIdx = numCount;
      const numberLabel = formatQuestionNumber(
        paper.numberingStyle || "CONTINUOUS",
        globalIdx,
        sectionLetter,
        sectionRelativeCounter
      );
      numCount++;
      sectionRelativeCounter++;

      const isMatch = s.type === "MATCH_COLUMN" || it.question.type === "MATCH_COLUMN";
      const matchPairCount = isMatch
        ? (parseMatchColumnPairs(it.question.options, it.question.text, (it.question as any).explanation).length || s.count)
        : 0;
      const subpartsMarks = subpartsTotalMarks(it.question.subparts);
      const totalQuestionMarks = isMatch
        ? (s.count === 1 ? s.marksEach : Math.min(matchPairCount * s.marksEach, s.count * s.marksEach))
        : subpartsMarks > 0
        ? subpartsMarks
        : s.marksEach;

      allNumberedItems.push({
        number: numCount,
        label: numberLabel,
        itemId: it.id,
        sectionTitle: s.title,
        marks: totalQuestionMarks,
        type: s.type,
        question: it.question,
        orQuestion: it.orQuestion,
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-12 print:bg-white print:pb-0">
      {/* Top action bar (hidden in print) */}
      <div className="no-print sticky top-0 z-10 border-b border-slate-300 bg-white px-4 py-2.5 shadow-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 text-sm">
          <Link href={`/papers/${id}`} className="btn btn-sm">
            <ArrowLeft size={14} /> Back to builder
          </Link>
          <span className="font-semibold text-slate-800">{paper.title}</span>
          <div className="flex gap-1 rounded-md bg-slate-100 p-1 text-xs">
            <button
              onClick={() => setActiveTab("SOLUTIONS")}
              className={`rounded px-2.5 py-1 font-medium transition ${activeTab === "SOLUTIONS" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              <ListChecks size={13} className="inline mr-1" /> Marking Scheme &amp; Key
            </button>
            <button
              onClick={() => setActiveTab("AWARD_LIST")}
              className={`rounded px-2.5 py-1 font-medium transition ${activeTab === "AWARD_LIST" ? "bg-white text-indigo-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              <Table size={13} className="inline mr-1" /> Examiner Award List (Foil)
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={`/api/papers/${id}/export-docx?markingScheme=true`}
              download
              className="btn btn-sm border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <FileDown size={14} /> Word (.docx)
            </a>
            <button className="btn btn-sm btn-primary" onClick={() => window.print()}>
              <Printer size={14} /> Print {activeTab === "SOLUTIONS" ? "Solution Key" : "Award Sheet"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto my-6 max-w-4xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm print:my-0 print:border-none print:p-0 print:shadow-none">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          {paper.paperSet && (
            <div className="flex justify-end mb-1">
              <span className="border border-slate-900 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
                {paper.paperSet}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            {resolvedLogoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedLogoSrc}
                alt="School Emblem"
                className="h-16 w-16 shrink-0 object-contain"
              />
            ) : null}
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900">
                {paper.schoolName || DEFAULT_SCHOOL_NAME}
              </h1>
              <p className="text-sm font-semibold text-slate-700">
                {EXAM_TYPE_LABEL[resolvePaperExamType(paper)]} Examination (
                {paper.academicSession || blueprint.academicSession || "2025–26"})
                {paper.examDate ? ` · ${new Date(paper.examDate + "T00:00:00").toLocaleDateString("en-GB")}` : ""}
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-600">
                {blueprint.book.className} — {blueprint.book.subject}
                {paper.subjectCode || blueprint.subjectCode ? ` (Sub Code: ${paper.subjectCode || blueprint.subjectCode})` : ""}
              </p>
            </div>
            {resolvedLogoSrc ? <div className="w-16 shrink-0" aria-hidden /> : null}
          </div>
          <div className="mt-3 inline-block rounded bg-emerald-50 px-3 py-1 border border-emerald-300">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-900">
              {activeTab === "SOLUTIONS"
                ? "CONFIDENTIAL — TEACHER'S MARKING SCHEME & MODEL ANSWERS (मूल्यांकन योजना)"
                : "OFFICIAL EXAMINER'S MARKS AWARD LIST & TABULATION SHEET (अंक तालिका)"}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-xs font-semibold text-slate-600">
            <span>Duration: {blueprint.durationMin} minutes</span>
            <span>Total Weightage: {paper.progress.totalMarks} Marks</span>
          </div>
        </div>

        {activeTab === "AWARD_LIST" ? (
          /* Examiner Award List (Foil) for Grading */
          <div className="mt-6 space-y-4">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Section / Class: _______________</span>
              <span>Invigilator / Examiner Name: ____________________________</span>
              <span>Date of Evaluation: ____________</span>
            </div>
            <table className="w-full border-collapse border border-slate-400 text-xs text-center">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="border border-slate-400 p-1.5 w-12">S.No</th>
                  <th className="border border-slate-400 p-1.5 w-24">Roll No.</th>
                  <th className="border border-slate-400 p-1.5 text-left pl-3">Student Name</th>
                  <th className="border border-slate-400 p-1.5 w-24">Total Marks (/ {paper.progress.totalMarks})</th>
                  <th className="border border-slate-400 p-1.5 w-32">Marks in Words</th>
                  <th className="border border-slate-400 p-1.5 w-28">Examiner Sign</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(25)].map((_, idx) => (
                  <tr key={idx} className="h-7">
                    <td className="border border-slate-300 p-1 text-slate-500">{idx + 1}</td>
                    <td className="border border-slate-300 p-1"></td>
                    <td className="border border-slate-300 p-1 text-left pl-3"></td>
                    <td className="border border-slate-300 p-1"></td>
                    <td className="border border-slate-300 p-1"></td>
                    <td className="border border-slate-300 p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-between text-xs font-medium text-slate-600 pt-3">
              <span>Chief Examiner Signature: __________________</span>
              <span>Date Verified: __________________</span>
            </div>
          </div>
        ) : (
          /* Solutions & Detailed Rubrics */
          <>
            {/* Quick Answer Key Matrix / OMR Grid for Rapid Grading */}
            <div className="mt-5 rounded border border-indigo-200 bg-indigo-50/40 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 uppercase tracking-wide mb-2">
                <Grid3X3 size={14} className="text-indigo-700" />
                Quick Answer Key Summary (for Rapid Evaluation / OMR):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 text-xs">
                {allNumberedItems.map((item) => {
                  let displayAns: React.ReactNode;
                  if (isMcqLikeType(item.question.type)) {
                    const resolvedMcq = normalizeMcqAnswer(item.question.answer, item.question.options);
                    displayAns = `(${resolvedMcq.letter || item.question.answer.toUpperCase() || "—"})`;
                  } else if (item.question.type === "TRUE_FALSE") {
                    displayAns = item.question.answer || "—";
                  } else if (
                    item.question.type === "FILL_BLANK" &&
                    item.question.answer &&
                    item.question.answer.length <= 20
                  ) {
                    displayAns = <MathText text={item.question.answer} />;
                  } else if (
                    (isSubpartQuestionType(item.question.type) || item.question.type === "CASE_STUDY") &&
                    item.question.subparts &&
                    item.question.subparts.length > 0
                  ) {
                    displayAns = (
                      <span
                        className="text-slate-600 font-medium text-[11px]"
                        title={item.question.subparts
                          .map((sp) => `${sp.label}: ${cleanOptionText(sp.answer) || "—"}`)
                          .join(" | ")}
                      >
                        {item.question.subparts
                          .map((sp) => `${sp.label}${sp.answer ? ` (${sp.answer})` : ""}`)
                          .join(", ")}
                      </span>
                    );
                  } else if (
                    (item.question.type === "MATCH_COLUMN" || item.type === "MATCH_COLUMN") &&
                    item.question.answer
                  ) {
                    displayAns = (
                      <span className="font-mono text-[10px] text-indigo-900" title={item.question.answer}>
                        {item.question.answer}
                      </span>
                    );
                  } else {
                    displayAns = <span className="text-slate-500 italic font-normal text-[11px]">[Descriptive]</span>;
                  }
                  const cleanLabel = item.label.startsWith("Q") || /^[A-Za-z]\d+/.test(item.label)
                    ? item.label
                    : `Q${item.label}`;
                  return (
                    <div
                      key={item.number}
                      className="rounded border border-indigo-100 bg-white p-1.5 shadow-xs flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-800 shrink-0">{cleanLabel}:</span>
                      <span className="font-semibold text-emerald-800 truncate mx-1" title={cleanOptionText(item.question.answer)}>
                        {displayAns}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium shrink-0">[{item.marks}M]</span>
                    </div>
                  );
                })}
              </div>
            </div>

        {/* Section by Section Solutions */}
        <div className="mt-6 space-y-6">
          {blueprint.sections.map((s, si) => {
            const items = paper.items.filter((i) => i.sectionId === s.id);
            if (items.length === 0) return null;
            const prev = si > 0 ? blueprint.sections[si - 1] : null;
            const isSameAsPrev = Boolean(prev && prev.title.trim().toLowerCase() === s.title.trim().toLowerCase());
            const allInGroup = blueprint.sections.filter(
              (x) => x.title.trim().toLowerCase() === s.title.trim().toLowerCase()
            );
            const hasMultipleTypes = allInGroup.length > 1;

            return (
              <section key={s.id} className="space-y-4">
                {!isSameAsPrev && (
                  <div className="border-b-2 border-slate-300 pb-1 pt-2">
                    <h2 className="text-sm font-bold uppercase text-slate-800 flex items-center justify-between">
                      <span>{s.title}</span>
                      {hasMultipleTypes && (
                        <span className="text-xs font-semibold text-slate-500 normal-case">
                          {allInGroup.reduce((sum, x) => sum + x.count, 0)} Questions · {allInGroup.reduce((sum, x) => sum + x.count * x.marksEach, 0)} Marks Total
                        </span>
                      )}
                    </h2>
                  </div>
                )}
                {hasMultipleTypes && (
                  <div className="border-l-2 border-indigo-600 bg-indigo-50/50 px-2.5 py-1 text-xs font-semibold text-indigo-900">
                    {QUESTION_TYPE_LABEL[s.type as keyof typeof QUESTION_TYPE_LABEL] || s.type} ({s.marksEach} Mark{s.marksEach === 1 ? "" : "s"} Each · {s.count} Questions)
                  </div>
                )}

                <div className="space-y-4">
                  {items.map((it, idx) => {
                    const numberedItem = allNumberedItems.find((x) => x.itemId === it.id);
                    const itemNumber = numberedItem?.number ?? idx + 1;
                    const itemLabel = numberedItem?.label ?? `${itemNumber}`;
                    const itemMarks = numberedItem?.marks ?? s.marksEach;
                    return (
                      <div key={it.id} className="rounded border border-slate-200 p-3.5 bg-slate-50/50 print:bg-transparent">
                        {/* Primary Question Solution */}
                        <QuestionSolutionItem
                          number={itemNumber}
                          numberLabel={itemLabel}
                          marks={itemMarks}
                          type={s.type}
                          q={it.question}
                        />

                        {/* Alternate (OR) Question Solution if present */}
                        {it.orQuestion && (
                          <div className="mt-3 border-t border-dashed border-slate-300 pt-3">
                            <div className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-purple-800">
                              — OR OPTION ANSWER / अथवा विकल्प उत्तर —
                            </div>
                            <QuestionSolutionItem
                              number={itemNumber}
                              numberLabel={itemLabel}
                              isOrOption
                              marks={itemMarks}
                              type={s.type}
                              q={it.orQuestion}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* End of Marking Scheme */}
        <div className="mt-8 border-t border-slate-400 pt-3 text-center text-xs font-semibold text-slate-500">
          — END OF MARKING SCHEME / मूल्यांकन योजना समाप्त —
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function QuestionSolutionItem({
  number,
  numberLabel,
  isOrOption,
  marks,
  type,
  q,
}: {
  number: number;
  numberLabel?: string;
  isOrOption?: boolean;
  marks: number;
  type: string;
  q: QuestionDto;
}) {
  const isCaseStudyWithSubparts =
    (type === "CASE_STUDY" || isSubpartQuestionType(type) || (q.subparts && q.subparts.length > 0)) &&
    Boolean(q.subparts && q.subparts.length > 0);
  const rubrics = getMarksRubric(marks, type);
  const displayLabel = numberLabel ? `${numberLabel}.` : `${number}.`;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-slate-900 text-sm">
          {displayLabel} {isOrOption && "(OR) "}
          <span className="font-normal text-slate-800">
            <MathText text={q.text} />
          </span>
        </div>
        <span className="whitespace-nowrap rounded bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-700">
          [{marks} M]
        </span>
      </div>

      {q.imagePath && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl(q.imagePath)}
          alt="Diagram"
          className="my-1 max-h-36 rounded border border-slate-200 object-contain"
        />
      )}

      {isCaseStudyWithSubparts ? (
        <div className="space-y-3 pt-1">
          {q.subparts.map((sp, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-semibold text-slate-800">
                  <span className="font-bold text-indigo-700 mr-1.5">{sp.label || `(${idx + 1})`}</span>
                  <MathText text={sp.text} />
                </div>
                {sp.marks !== undefined && (
                  <span className="whitespace-nowrap rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">
                    [{sp.marks} M]
                  </span>
                )}
              </div>

              {/* Subpart Answer Block */}
              <div className="rounded border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-emerald-950">
                <div className="font-bold flex items-center gap-1 text-emerald-900">
                  <CheckCircle2 size={13} className="text-emerald-700" />
                  Model Answer ({sp.label || `(${idx + 1})`}):
                </div>
                <div className="mt-1 whitespace-pre-wrap pl-4 font-medium">
                  {sp.options && sp.options.length > 0 && sp.answer ? (
                    (() => {
                      const resolved = normalizeMcqAnswer(sp.answer, sp.options);
                      return (
                        <span>
                          {resolved.letter && <b>({resolved.letter.toLowerCase()})</b>}{" "}
                          <MathText text={cleanOptionText(resolved.optionText || sp.answer)} />
                        </span>
                      );
                    })()
                  ) : sp.answer ? (
                    <MathText text={sp.answer} />
                  ) : (
                    <span className="italic text-slate-500">
                      Standard conceptual evaluation for {sp.marks} mark(s).
                    </span>
                  )}
                </div>
              </div>

              {/* Subpart Step Rubric */}
              <div className="rounded border border-slate-200 bg-white p-2 text-[11px] text-slate-700">
                <div className="font-semibold text-slate-900 flex items-center gap-1">
                  <FileText size={12} className="text-slate-500" />
                  Marking Rubric (Step Distribution):
                </div>
                <ul className="mt-1 list-inside list-disc space-y-0.5 pl-1 text-slate-600">
                  {getMarksRubric(sp.marks, sp.options && sp.options.length > 0 ? "MCQ" : "SHORT").map(
                    (r, ri) => (
                      <li key={ri}>{r}</li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Answer Block */}
          <div className="rounded border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-emerald-950">
            <div className="font-bold flex items-center gap-1 text-emerald-900">
              <CheckCircle2 size={13} className="text-emerald-700" />
              Model Answer / Expected Points:
            </div>
            <div className="mt-1 whitespace-pre-wrap pl-4 font-medium">
              {type === "MCQ" && q.answer ? (
                (() => {
                  const resolved = normalizeMcqAnswer(q.answer, q.options);
                  return (
                    <span>
                      {resolved.letter && <b>({resolved.letter.toLowerCase()})</b>}{" "}
                      <MathText text={cleanOptionText(resolved.optionText || q.answer)} />
                    </span>
                  );
                })()
              ) : q.answer ? (
                <MathText text={q.answer} />
              ) : (
                <span className="italic text-slate-500">
                  Teacher has not entered a specific model text. Evaluate based on standard textbook concepts.
                </span>
              )}
            </div>
          </div>

          {/* Grading Rubric */}
          <div className="rounded border border-slate-200 bg-white p-2 text-[11px] text-slate-700">
            <div className="font-semibold text-slate-900 flex items-center gap-1">
              <FileText size={12} className="text-slate-500" />
              Marking Rubric (Step-wise Distribution):
            </div>
            <ul className="mt-1 list-inside list-disc space-y-0.5 pl-1 text-slate-600">
              {rubrics.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="text-[11px] text-slate-500">
        Chapter: Ch {q.chapter?.number}. {q.chapter?.title} · Difficulty: {q.difficulty}
      </div>
    </div>
  );
}
