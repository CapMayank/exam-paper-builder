import React from "react";
import { DEFAULT_SCHOOL_LOGO, DEFAULT_SCHOOL_NAME } from "@/lib/constants";

interface WorkbookHeaderProps {
  schoolName?: string;
  logoSrc?: string | null;
  classNameTitle?: string;
  subjectTitle?: string;
  sessionText?: string;
  examHeading?: string;
  examDate?: string;
}

export function WorkbookHeader({
  schoolName = DEFAULT_SCHOOL_NAME,
  logoSrc = DEFAULT_SCHOOL_LOGO,
  classNameTitle = "Nursery",
  subjectTitle = "English Activity Workbook",
  sessionText = "2025–26",
  examHeading = "Evaluation Examination",
  examDate = "",
}: WorkbookHeaderProps) {
  return (
    <div className="w-full pb-3 border-b-2 border-slate-900 select-none">
      {/* Top Banner: School Logo & Title */}
      <div className="flex items-center justify-between gap-3 mb-2">
        {logoSrc && (
          <div className="w-14 h-14 shrink-0 flex items-center justify-center p-1 border-2 border-slate-900 rounded-xl bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="School Logo" className="max-w-full max-h-full object-contain" />
          </div>
        )}

        <div className="flex-1 text-center min-w-0">
          <h1 className="text-xl font-black uppercase tracking-wide text-slate-950 font-sans">
            {schoolName}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-0.5 text-xs sm:text-sm font-bold text-slate-800">
            <span>{examHeading}</span>
            <span>•</span>
            <span>Session {sessionText}</span>
            {examDate && (
              <>
                <span>•</span>
                <span>Date: {examDate}</span>
              </>
            )}
          </div>
          <div className="mt-1 inline-block px-3 py-0.5 bg-slate-100 border border-slate-900 rounded-full font-black text-sm uppercase tracking-wider text-slate-950">
            {classNameTitle} — {subjectTitle}
          </div>
        </div>

        {logoSrc && <div className="w-14 shrink-0" aria-hidden />}
      </div>

      {/* Student Details Card */}
      <div className="mt-2.5 p-2.5 border-2 border-slate-900 rounded-xl bg-white text-xs sm:text-sm font-semibold text-slate-900 grid grid-cols-12 gap-2">
        <div className="col-span-6 sm:col-span-5 flex items-center gap-1">
          <span className="font-bold">Student Name:</span>
          <span className="flex-1 border-b-2 border-dotted border-slate-800 inline-block min-w-16">
            &nbsp;
          </span>
        </div>

        <div className="col-span-3 sm:col-span-2 flex items-center gap-1">
          <span className="font-bold">Sec:</span>
          <span className="flex-1 border-b-2 border-dotted border-slate-800 inline-block min-w-6">
            &nbsp;
          </span>
        </div>

        <div className="col-span-3 sm:col-span-2 flex items-center gap-1">
          <span className="font-bold">Roll No:</span>
          <span className="flex-1 border-b-2 border-dotted border-slate-800 inline-block min-w-8">
            &nbsp;
          </span>
        </div>

        <div className="col-span-12 sm:col-span-3 flex items-center justify-end gap-1 font-bold text-amber-500">
          <span className="text-xs text-slate-700 mr-1">Rating:</span>
          <span>★ ★ ★ ★ ★</span>
        </div>
      </div>

      {/* Teacher Remarks & Smiley Row */}
      <div className="mt-1.5 flex items-center justify-between text-xs font-medium text-slate-700 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900">Teacher&apos;s Remarks:</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <span className="w-3.5 h-3.5 border border-slate-400 rounded-xs inline-block" /> Excellent (😊)
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <span className="w-3.5 h-3.5 border border-slate-400 rounded-xs inline-block" /> Very Good (⭐)
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <span className="w-3.5 h-3.5 border border-slate-400 rounded-xs inline-block" /> Good (👍)
          </label>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bold text-slate-900">Signature:</span>
          <span className="w-16 border-b border-slate-400 inline-block">&nbsp;</span>
        </div>
      </div>
    </div>
  );
}
