"use client";

import { ArrowDown, ArrowUp, BookOpen, Check, Code2, Download, FileText, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, use, useEffect, useMemo, useState } from "react";
import { ErrorBanner, Field, useConfirm, useToast } from "@/components/ui";
import { BlueprintImportModal } from "@/components/BlueprintImportModal";
import { BlueprintJsonModal } from "@/components/BlueprintJsonModal";
import { BlueprintTemplateModal } from "@/components/BlueprintTemplateModal";
import { MPBSE_BLUEPRINT_TEMPLATES, STANDARD_BLUEPRINT_TEMPLATES, type BlueprintTemplate, type ExaminationTerm, adaptChaptersHamiltonHare } from "@/lib/curriculumTemplates";
import { StandardMpbseConfigurator } from "@/components/blueprints/StandardMpbseConfigurator";
import { CustomSchoolTermConfigurator } from "@/components/blueprints/CustomSchoolTermConfigurator";
import { FeasibilityStatusAlert } from "@/components/blueprints/FeasibilityStatusAlert";
import { SANSKRIT_COMPETENCY_TAXONOMY } from "@/lib/curriculumContract";
import { downloadBlueprintJson, type BlueprintWithExportRelations } from "@/lib/blueprintExport";
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
import { matchOfficialChapterMarks } from "@/lib/officialChapterMarks";
import {
  detectBoardRuleConflict,
  getBoardDefaultChoiceRequirement,
} from "@/lib/internalChoiceRules";
import { canManageScope, hasAnyWriteScope, type Actor } from "@/lib/permissions";
import { api } from "@/lib/client";
import { DEFAULT_SCHOOL_NAME, EXAM_TYPES, EXAM_TYPE_LABEL, KINDERGARTEN_QUESTION_TYPES, QUESTION_TYPES, QUESTION_TYPE_LABEL, STANDARD_QUESTION_TYPES, defaultExamDurationMin, defaultLayoutForClass, sortClassNames } from "@/lib/constants";
import { BlueprintStartPicker } from "@/components/blueprints/BlueprintStartPicker";
import { isSubjectMatching } from "@/lib/schoolCurriculum";
import { distributeMarksByRole, missingUnitRoles } from "@/lib/roleMarks";
import { schoolAllowedTypes } from "@/lib/blueprintSetupPlan";
import { getLanguageNonChapterUnits } from "@/lib/syllabusImport";
import { allowedTypesFor } from "@/lib/sectionTypes";
import type { AcademicClassDto, Blueprint, Book, PaperData } from "@/lib/types";

let qtSeq = 0;
const newQuestionType = (over: Partial<QuestionTypeItem> = {}): QuestionTypeItem => ({
  key: `qt${qtSeq++}`,
  type: "MCQ",
  count: 5,
  marksEach: 1,
  orChoiceMode: "BOARD_DEFAULT",
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

/**
 * The app keeps pages alive between visits (Cache Components preserve state with <Activity>), so without a key
 * a second "New blueprint" would reopen the last blueprint's editor instead of the picker. Keying on bfcacheId
 * gives every fresh visit a clean editor and still restores a draft on browser back / forward.
 */
export default function BlueprintEditorPage(props: PageProps<"/blueprints/[id]">) {
  const { bfcacheId } = useRouter();
  const { id } = use(props.params);
  const sp = use(props.searchParams);
  const from = typeof sp.from === "string" ? sp.from : "";
  return <BlueprintEditor key={`${bfcacheId}|${id}|${from}`} {...props} />;
}

function BlueprintEditor({ params, searchParams }: PageProps<"/blueprints/[id]">) {
  const { id } = use(params);
  const sp = use(searchParams);
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const { currentSession, availableSessions } = useAcademicSession();

  const [books, setBooks] = useState<Book[]>([]);
  const [classes, setClasses] = useState<AcademicClassDto[]>([]);
  // every class the school has, in any session: a class does not stop existing when the session changes
  const [allClasses, setAllClasses] = useState<AcademicClassDto[]>([]);
  const [currentUser, setCurrentUser] = useState<Actor | null>(null);
  // the book the saved blueprint belongs to; edit rights follow its class/subject, not the picker's current value
  const [savedBook, setSavedBook] = useState<{ className: string; subject: string } | null>(null);
  const [name, setName] = useState("");
  const [academicSession, setAcademicSession] = useState(currentSession);
  const [bookId, setBookId] = useState("");
  const [examType, setExamType] = useState<string>("QUARTERLY");
  const [durationMin, setDurationMin] = useState(60);
  const [subjectCode, setSubjectCode] = useState("");
  const [marks, setMarks] = useState<Record<string, number>>({});
  // quota groups: lessons of one unit share a quota (the scheme allocates marks by unit)
  const [unitKeys, setUnitKeys] = useState<Record<string, { key: string; title: string }>>({});
  const [sectionGroups, setSectionGroups] = useState<SectionGroup[]>([]);
  const [paperCount, setPaperCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importModalTab, setImportModalTab] = useState<"import" | "ai" | "examples">("import");
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [expandedSlotCustomizers, setExpandedSlotCustomizers] = useState<Record<string, boolean>>({});

  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("");

  const [curriculumMode, setCurriculumMode] = useState<"STANDARD_MPBSE" | "CUSTOM_SCHOOL" | "BLANK_CUSTOM">("BLANK_CUSTOM");
  // a new blueprint starts with the class / subject / pattern picker; the editor opens once something is chosen
  const [started, setStarted] = useState(id !== "new" || Boolean(from));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [curriculumTemplateId, setCurriculumTemplateId] = useState<string | null>(null);
  const [curriculumVariantId, setCurriculumVariantId] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<ExaminationTerm>("QUARTERLY");
  const [customTargetMarks, setCustomTargetMarks] = useState<number>(75);

  useEffect(() => {
    if (sp.import === "true" || sp.import === "1") {
      if (sp.tab === "ai") {
        setImportModalTab("ai");
      }
      setImportModalOpen(true);
    }
  }, [sp.import, sp.tab]);

  useEffect(() => {
    (async () => {
      try {
        const [bs, clsList, source, me] = await Promise.all([
          api<Book[]>("/api/books"),
          api<AcademicClassDto[]>(`/api/classes?session=${encodeURIComponent(currentSession)}`).catch(() => []),
          id !== "new" ? api<Blueprint>(`/api/blueprints/${id}`) : from ? api<Blueprint>(`/api/blueprints/${from}`) : Promise.resolve(null),
          api<Actor>("/api/me").catch(() => null),
        ]);
        setBooks(bs);
        setClasses(clsList);
        void api<AcademicClassDto[]>("/api/classes?session=ALL").then(setAllClasses, () => setAllClasses(clsList));
        setCurrentUser(me);
        if (source) {
          setName(id === "new" ? `${source.name} (copy)` : source.name);
          setBookId(source.bookId);
          if (id !== "new") setSavedBook(source.book);
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
          setUnitKeys(
            Object.fromEntries(
              source.chapters
                .filter((c) => c.unitKey)
                .map((c) => [c.chapterId, { key: c.unitKey as string, title: c.unitTitle ?? "" }]),
            ),
          );
          setSectionGroups(groupSectionsFromFlat(source.sections));
          setPaperCount(id === "new" ? 0 : source._count.papers);
          setCurriculumMode(((source as any).curriculumMode as any) || "BLANK_CUSTOM");
          setCurriculumTemplateId((source as any).curriculumTemplateId || null);
          setCurriculumVariantId((source as any).curriculumVariantId || null);
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
                isSubjectMatching(b.subject, urlSubject)
            )) ||
            (urlClassName && !urlSubject && bs.find((b) => b.className.trim().toLowerCase() === urlClassName.trim().toLowerCase())) ||
            null;

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
          const activeClass = initialBook?.className || urlClassName;
          const activeSub = initialBook?.subject || urlSubject;
          const matchingClass = clsList.find((c) => c.name.trim().toLowerCase() === activeClass.trim().toLowerCase());
          const matchingSubject = matchingClass?.subjects.find((s) => isSubjectMatching(s.name, activeSub));
          if (urlCode) {
            setSubjectCode(urlCode);
          } else if (matchingSubject?.code) {
            setSubjectCode(matchingSubject.code);
          }
          setAcademicSession(currentSession);
          const urlTemplateId = typeof sp.templateId === "string" ? sp.templateId : undefined;
          const matchedTmpl = urlTemplateId ? (STANDARD_BLUEPRINT_TEMPLATES.find((t) => t.id === urlTemplateId) || MPBSE_BLUEPRINT_TEMPLATES.find((t) => t.id === urlTemplateId)) : null;
          // otherwise the class / subject / pattern picker is shown first
          if (matchedTmpl) {
            setStarted(true);
            void handleLoadOfficialTemplate(matchedTmpl as any, bs);
          }
        }
        setLoaded(true);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [id, from, currentSession, sp.bookId, sp.subjectCode, sp.className, sp.subject, sp.templateId]);

  const hasPapers = paperCount > 0;
  const book = books.find((b) => b.id === bookId);
  // tracing / counting activity types belong to nursery-KG papers only
  const isPrePrimary = /nursery|kg|lkg|ukg|pre[-\s]?primary/i.test(book?.className ?? selectedClassFilter);
  const chapterQuotas = (book?.chapters ?? []).map((c) => ({
    chapterId: c.id,
    marks: marks[c.id] ?? 0,
    title: c.title,
    number: c.number,
    unitKey: unitKeys[c.id]?.key ?? "",
    unitTitle: unitKeys[c.id]?.title ?? "",
  }));
  const sections = flattenSectionGroups(sectionGroups);
  const total = blueprintTotalMarks(sections);
  const chapterTotal = chapterQuotas.reduce((s, c) => s + c.marks, 0);
  const problems = validateBlueprint({ sections, chapters: chapterQuotas });
  const feasibilityWarnings = checkBlueprintFeasibility({ sections, chapters: chapterQuotas });

  const { totalLogicalQuestions, totalAlternativeQuestions } = useMemo(() => {
    let logical = 0;
    let alt = 0;
    for (const grp of sectionGroups) {
      for (const qt of grp.questionTypes) {
        logical += qt.count;
        const boardRule = getBoardDefaultChoiceRequirement({
          board: "MPBSE",
          className: book?.className,
          subject: book?.subject,
          subjectCode,
          academicSession,
          examType,
          questionType: qt.type,
          marksEach: qt.marksEach,
          sectionTitle: grp.title,
        });

        let overrides: Record<number, boolean> | null = null;
        if (qt.orSlotsJson) {
          try {
            const arr = JSON.parse(qt.orSlotsJson);
            if (Array.isArray(arr)) {
              overrides = {};
              arr.forEach((s: any) => {
                if (typeof s?.slotIndex === "number" && typeof s?.required === "boolean") {
                  overrides![s.slotIndex] = s.required;
                }
              });
            }
          } catch {}
        }

        const modeDefault =
          qt.orChoiceMode === "REQUIRED"
            ? true
            : qt.orChoiceMode === "NOT_REQUIRED"
            ? false
            : boardRule.required;

        for (let idx = 0; idx < qt.count; idx++) {
          const req = overrides && typeof overrides[idx] === "boolean" ? overrides[idx] : modeDefault;
          if (req) alt++;
        }
      }
    }
    return { totalLogicalQuestions: logical, totalAlternativeQuestions: alt };
  }, [sectionGroups, book, subjectCode, academicSession, examType]);

  const canManageBlueprint =
    id === "new" ? hasAnyWriteScope(currentUser) : Boolean(currentUser) && canManageScope(currentUser, savedBook);
  const isReadOnly = id !== "new" && !canManageBlueprint;

  const currentBlueprintData = useMemo<BlueprintWithExportRelations>(() => {
    const flatSections = flattenSectionGroups(sectionGroups);
    const chapterAllocations = (book?.chapters || []).map((ch) => ({
      chapterId: ch.id,
      marks: marks[ch.id] || 0,
      chapter: ch,
    }));

    return {
      name,
      examType,
      durationMin,
      academicSession,
      subjectCode,
      book,
      sections: flatSections,
      chapters: chapterAllocations,
    };
  }, [name, examType, durationMin, academicSession, subjectCode, book, sectionGroups, marks]);

  const availableClasses = useMemo(() => {
    const classNamesFromClasses = classes.map((c) => c.name);
    const classNamesFromBooks = books.map((b) => b.className);
    return sortClassNames(Array.from(new Set([...classNamesFromClasses, ...classNamesFromBooks])));
  }, [classes, books]);

  const availableSubjects = useMemo(() => {
    const subjectsFromClasses = classes
      .filter((c) => !selectedClassFilter || c.name.trim().toLowerCase() === selectedClassFilter.trim().toLowerCase())
      .flatMap((c) => c.subjects.map((s) => s.name));
    const subjectsFromBooks = books
      .filter((b) => !selectedClassFilter || b.className.trim().toLowerCase() === selectedClassFilter.trim().toLowerCase())
      .map((b) => b.subject);
    return Array.from(new Set([...subjectsFromClasses, ...subjectsFromBooks])).sort();
  }, [classes, books, selectedClassFilter]);

  const matchingBooks = useMemo(() => {
    return books.filter(
      (b) =>
        (!selectedClassFilter || b.className.trim().toLowerCase() === selectedClassFilter.trim().toLowerCase()) &&
        (!selectedSubjectFilter || isSubjectMatching(b.subject, selectedSubjectFilter))
    );
  }, [books, selectedClassFilter, selectedSubjectFilter]);

  const isSanskrit10 = useMemo(() => {
    const isSa =
      Boolean(book?.subject?.toLowerCase().includes("sanskrit")) ||
      Boolean(selectedSubjectFilter?.toLowerCase().includes("sanskrit")) ||
      name.toLowerCase().includes("संस्कृत") ||
      name.toLowerCase().includes("sanskrit") ||
      subjectCode === "512" ||
      subjectCode === "122";
    const isC10 =
      Boolean(book?.className?.includes("10")) ||
      Boolean(selectedClassFilter?.includes("10")) ||
      name.includes("10") ||
      name.toLowerCase().includes("कक्षा 10");
    return isSa && isC10;
  }, [book, selectedSubjectFilter, selectedClassFilter, name, subjectCode]);

  /**
   * Spreads the paper's marks over the chapters in the exam (those that already have marks, else all chapters),
   * one whole question at a time, so every chapter quota can really be filled by questions.
   */
  function autoDistributeMarks() {
    if (!book || book.chapters.length === 0 || total === 0) return;
    const inExam = book.chapters.filter((c) => (marks[c.id] ?? 0) > 0);
    const pool = inExam.length > 0 ? inExam : book.chapters;
    // passage, writing and grammar slots go to their own syllabus units, the rest to the lessons
    const slots = sections.flatMap((s) => Array.from({ length: Math.max(0, s.count) }, () => ({ marks: s.marksEach, role: s.role })));
    const nextMarks = distributeMarksByRole(slots, pool.map((c) => ({ id: c.id, title: c.title })), book.subject);
    for (const c of book.chapters) nextMarks[c.id] ??= 0;
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

  function toggleSlotCustomizer(qtKey: string) {
    setExpandedSlotCustomizers((prev) => ({
      ...prev,
      [qtKey]: !prev[qtKey],
    }));
  }

  function parseSlotOverrides(json?: string | null): Record<number, boolean> | null {
    if (!json) return null;
    try {
      const arr = JSON.parse(json);
      if (Array.isArray(arr)) {
        const map: Record<number, boolean> = {};
        arr.forEach((s: any) => {
          if (typeof s?.slotIndex === "number" && typeof s?.required === "boolean") {
            map[s.slotIndex] = s.required;
          }
        });
        return map;
      }
    } catch {}
    return null;
  }

  function isSlotChoiceRequired(
    qt: QuestionTypeItem,
    slotIdx: number,
    boardDefault: boolean,
  ): boolean {
    const overrides = parseSlotOverrides(qt.orSlotsJson);
    if (overrides && typeof overrides[slotIdx] === "boolean") {
      return overrides[slotIdx];
    }
    if (qt.orChoiceMode === "REQUIRED") return true;
    if (qt.orChoiceMode === "NOT_REQUIRED") return false;
    return boardDefault;
  }

  function hasExplicitSlotOverride(qt: QuestionTypeItem, slotIdx: number): boolean {
    const overrides = parseSlotOverrides(qt.orSlotsJson);
    return Boolean(overrides && typeof overrides[slotIdx] === "boolean");
  }

  function toggleSlotOverride(
    grpKey: string,
    qtKey: string,
    totalCount: number,
    slotIdx: number,
    currentVal: boolean,
  ) {
    const grp = sectionGroups.find((g) => g.key === grpKey);
    const qt = grp?.questionTypes.find((q) => q.key === qtKey);
    if (!qt) return;
    const overrides = parseSlotOverrides(qt.orSlotsJson) || {};
    overrides[slotIdx] = !currentVal;
    const list = Object.entries(overrides)
      .filter(([k]) => Number(k) < totalCount)
      .map(([k, v]) => ({ slotIndex: Number(k), required: v }));
    patchQuestionType(grpKey, qtKey, { orSlotsJson: JSON.stringify(list) });
  }

  function setAllSlotsRequirement(
    grpKey: string,
    qtKey: string,
    totalCount: number,
    required: boolean,
  ) {
    const list = Array.from({ length: totalCount }, (_, i) => ({
      slotIndex: i,
      required,
    }));
    patchQuestionType(grpKey, qtKey, { orSlotsJson: JSON.stringify(list) });
  }

  function resetSlotsToDefault(grpKey: string, qtKey: string) {
    patchQuestionType(grpKey, qtKey, { orSlotsJson: undefined });
  }

  function startBlank(pick?: { className: string; subject: string }) {
    setStarted(true);
    setCurriculumMode("BLANK_CUSTOM");
    if (pick?.className) {
      const wanted = pick.subject;
      const first = books.find((b) => b.className === pick.className && (!wanted || isSubjectMatching(b.subject, wanted)));
      setSelectedClassFilter(pick.className);
      setSelectedSubjectFilter(wanted);
      setBookId(first?.id ?? "");
      setName(`${pick.className} ${wanted} – Blueprint`.trim());
      setDurationMin(defaultExamDurationMin(pick.className));
      const cls = classes.find((c) => c.name === pick.className);
      const sub = cls?.subjects.find((s) => isSubjectMatching(s.name, wanted));
      if (sub?.code) setSubjectCode(sub.code);
    }
    setSectionGroups([
      newSectionGroup(
        {
          title: "Section A",
          instructions: "All questions are compulsory.",
          questionTypes: [newQuestionType({ type: "MCQ", count: 10, marksEach: 1 })],
        },
        0,
      ),
    ]);
    setMarks({});
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
      setStarted(true);
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

  /**
   * Classes 1–8: the school's 50 / 60-mark pattern on the class + subject book. Chapter marks are handed out whole
   * question by question; a language pattern's unseen passage, writing and grammar slots go to their own syllabus
   * units (added to the book first if it has none), so they never use up a lesson's quota.
   */
  async function applySchoolPattern(template: BlueprintTemplate, pick: { className: string; subject: string }) {
    startBlank(pick);
    applyStarterTemplate(template, pick.subject);
    setName(`${pick.className} ${pick.subject} – ${template.title}`);
    let target = books.find((b) => b.className === pick.className && isSubjectMatching(b.subject, pick.subject));
    if (!target || target.chapters.length === 0) return;
    const slots = template.sections.flatMap((g) =>
      g.questionTypes.flatMap((qt) => Array.from({ length: qt.count }, () => ({ marks: qt.marksEach, role: qt.role ?? null }))),
    );
    const missing = missingUnitRoles(slots, target.chapters, target.subject);
    if (missing.length > 0) {
      const domain = { PASSAGE: "reading", WRITING: "writing", GRAMMAR: "grammar" } as const;
      const units = getLanguageNonChapterUnits(target.subject, target.className);
      let next = target.chapters.reduce((m, c) => Math.max(m, c.number), 0) + 1;
      try {
        const added: Book["chapters"] = [];
        for (const role of missing) {
          const unit = units.find((u) => u.domain === domain[role]);
          if (unit) added.push(await api<Book["chapters"][number]>(`/api/books/${target.id}/chapters`, { method: "POST", json: { number: next++, title: unit.title } }));
        }
        target = { ...target, chapters: [...target.chapters, ...added] };
        const updated = target;
        setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        if (added.length > 0) toast.info(`Added ${added.map((c) => `"${c.title}"`).join(", ")} to ${target.className} ${target.subject}, so these marks have their own row.`);
      } catch (e) {
        toast.error(`Could not add the unseen passage / writing / grammar units to the book: ${(e as Error).message}`);
      }
    }
    setMarks(distributeMarksByRole(slots, target.chapters.map((c) => ({ id: c.id, title: c.title })), target.subject));
  }

  /** `subject` given: each slot also accepts that subject's other forms at the same marks (school patterns). */
  function applyStarterTemplate(template: BlueprintTemplate, subject?: string) {
    setExamType(template.examType);
    setDurationMin(template.durationMin);
    const newGroups: SectionGroup[] = template.sections.map((sec, idx) => ({
      key: `sec_tmpl_${Date.now()}_${idx}`,
      title: sec.title,
      instructions: sec.instructions,
      questionTypes: sec.questionTypes.map((qt, qIdx) => ({
        key: `qt_tmpl_${Date.now()}_${idx}_${qIdx}`,
        type: qt.type,
        count: qt.count,
        marksEach: qt.marksEach,
        orChoiceMode: (qt as any).orChoiceMode ?? "BOARD_DEFAULT",
        // a row with no internal choice has no alternatives (as multi-class setup saves it)
        orAlternativeCount: (qt as any).orAlternativeCount ?? ((qt as any).orChoiceMode === "NOT_REQUIRED" ? 0 : null),
        orSlotsJson: (qt as any).orSlotsJson ?? null,
        allowedTypesJson: subject
          ? JSON.stringify(schoolAllowedTypes(qt.type, qt.marksEach, subject, qt.role))
          : ((qt as { allowedTypesJson?: string }).allowedTypesJson ?? "[]"),
        role: (qt as any).role ?? "STANDARD",
        groupKey: (qt as any).groupKey ?? "",
      })),
    }));
    setSectionGroups(newGroups);
    setTemplateModalOpen(false);
    toast.success(`Applied template "${template.title}" (${template.totalMarks} marks)`);
  }

  async function handleLoadOfficialTemplate(template: BlueprintTemplate, availableBooks?: Book[]) {
    const bookList = availableBooks || books;
    setCurriculumMode("STANDARD_MPBSE");
    setName(`${template.subjectName || template.title} Class ${template.classLevel} (MPBSE ${academicSession})`);
    setExamType(template.examType);
    setDurationMin(template.durationMin);
    if (template.subjectCode) {
      setSubjectCode(template.subjectCode);
    }

    let matchedBook = bookList.find(
      (b) =>
        (b.className.includes(String(template.classLevel)) || b.className.toLowerCase() === `class ${template.classLevel}`.toLowerCase()) &&
        isSubjectMatching(b.subject, template.subjectName || template.title)
    );

    const newGroups: SectionGroup[] = template.sections.map((sec, idx) => ({
      key: `sec_mpbse_${Date.now()}_${idx}`,
      title: sec.title,
      instructions: sec.instructions,
      questionTypes: sec.questionTypes.map((qt, qIdx) => ({
        key: `qt_mpbse_${Date.now()}_${idx}_${qIdx}`,
        type: qt.type,
        count: qt.count,
        marksEach: qt.marksEach,
        orChoiceMode: (qt as any).orChoiceMode ?? "BOARD_DEFAULT",
        orAlternativeCount: (qt as any).orAlternativeCount ?? null,
        orSlotsJson: (qt as any).orSlotsJson ?? null,
        allowedTypesJson: (qt as { allowedTypesJson?: string }).allowedTypesJson ?? "[]",
        role: (qt as any).role ?? "STANDARD",
        groupKey: (qt as any).groupKey ?? "",
      })),
    }));
    setSectionGroups(newGroups);

    try {
      const tData = await api<any>(`/api/curriculum/templates/${template.templateCode || template.id}`);
      if (tData?.id) {
        setCurriculumTemplateId(tData.id);
      } else {
        setCurriculumTemplateId(null);
      }

      // The paper covers every prescribed book (e.g. Kshitij + Kritika + writing/grammar components), so the
      // blueprint needs all of them as one syllabus. Reuse the combined book if it already exists.
      const officialTbs: Array<{ legacyBookId?: string | null }> = tData?.subject?.textbooks ?? [];
      // Textbooks of one subject now share one book, so their links collapse to a single id.
      const legacyIds = Array.from(
        new Set(officialTbs.map((tb) => tb.legacyBookId).filter((x): x is string => Boolean(x))),
      );
      if (legacyIds.length === 1) {
        const legacyMatch = bookList.find((b) => b.id === legacyIds[0]);
        if (legacyMatch) matchedBook = legacyMatch;
      } else if (legacyIds.length > 1) {
        const className = `Class ${template.classLevel}`;
        const subjectName = template.subjectName || tData?.subject?.name || "";
        const combinedTitle = `${subjectName} ${className} – all prescribed books${template.variant ? ` (${template.variant})` : ""}`;
        let combined = bookList.find((b) => b.title === combinedTitle && b.className === className);
        if (!combined) {
          const res = await api<{ book: Book }>("/api/books/combine", {
            method: "POST",
            json: { bookIds: legacyIds, compositeTitle: combinedTitle, className, subject: subjectName, keepOriginals: true, academicSession },
          });
          combined = res.book;
          setBooks((prev) => [...prev.filter((b) => b.id !== res.book.id), res.book]);
        }
        matchedBook = combined;
      }

      if (matchedBook) {
        setBookId(matchedBook.id);
        setSelectedClassFilter(matchedBook.className);
        setSelectedSubjectFilter(matchedBook.subject);
      }

      const targetBook = matchedBook || book;
      const officialChapters: any[] = tData?.subject?.textbooks?.flatMap((tb: any) => tb.chapters || []) || [];

      if (officialChapters.length > 0 && targetBook?.chapters?.length) {
        // match official marks onto the book's chapters, also when several textbooks were combined into one book
        const matchedOfficial = matchOfficialChapterMarks(
          targetBook.chapters.map((c: any) => ({ id: c.id, number: c.number, title: c.title })),
          tData?.subject?.textbooks || [],
          template.totalMarks,
        );
        const newMarks: Record<string, number> = matchedOfficial.marks;
        setUnitKeys(matchedOfficial.units);

        const currentSum = Object.values(newMarks).reduce((a, b) => a + b, 0);
        if (currentSum === template.totalMarks) {
          setMarks(newMarks);
        } else if (currentSum > 0) {
          // Proportionally distribute remainder to reach exact target
          const activeChs = targetBook.chapters
            .filter((c: any) => (newMarks[c.id] ?? 0) > 0 || newMarks[c.id] === undefined)
            .map((c: any) => ({ chapterId: c.id, marks: newMarks[c.id] || 4 }));
          const adapted = adaptChaptersHamiltonHare(activeChs, template.totalMarks);
          const dist: Record<string, number> = { ...newMarks };
          adapted.forEach((a) => { dist[a.chapterId] = a.marks; });
          setMarks(dist);
        } else {
          const adapted = adaptChaptersHamiltonHare(
            targetBook.chapters.map((c: any) => ({ chapterId: c.id, marks: 5 })),
            template.totalMarks
          );
          const dist: Record<string, number> = {};
          adapted.forEach((a) => { dist[a.chapterId] = a.marks; });
          setMarks(dist);
        }
      } else if (targetBook?.chapters?.length) {
        const adapted = adaptChaptersHamiltonHare(
          targetBook.chapters.map((c: any) => ({ chapterId: c.id, marks: 5 })),
          template.totalMarks
        );
        const dist: Record<string, number> = {};
        adapted.forEach((a) => { dist[a.chapterId] = a.marks; });
        setMarks(dist);
      }
    } catch {
      setCurriculumTemplateId(null);
      if (matchedBook) {
        setBookId(matchedBook.id);
        setSelectedClassFilter(matchedBook.className);
        setSelectedSubjectFilter(matchedBook.subject);
      }
      const targetBook = matchedBook || book;
      if (targetBook?.chapters?.length) {
        const adapted = adaptChaptersHamiltonHare(
          targetBook.chapters.map((c: any) => ({ chapterId: c.id, marks: 5 })),
          template.totalMarks
        );
        const dist: Record<string, number> = {};
        adapted.forEach((a) => { dist[a.chapterId] = a.marks; });
        setMarks(dist);
      }
    }

    toast.success(`MPBSE board pattern loaded: ${template.totalMarks} marks`);
  }

  async function save(e?: React.FormEvent, andBuildPaper = false) {
    if (e) e.preventDefault();
    setError(null);

    if (!bookId) {
      setError(`Please select or add a textbook for ${selectedClassFilter || "this class"} ${selectedSubjectFilter ? `· ${selectedSubjectFilter}` : ""} before saving the blueprint.`);
      return;
    }

    if (hasPapers) {
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
        curriculumMode,
        curriculumTemplateId,
        curriculumVariantId,
        chapters: chapterQuotas.filter((c) => c.marks > 0),
        sections: sections.map((s) => ({
          id: s.id,
          title: s.title,
          instructions: s.instructions,
          type: s.type,
          count: s.count,
          marksEach: s.marksEach,
          orChoiceMode: (s as any).orChoiceMode ?? "BOARD_DEFAULT",
          orAlternativeCount: (s as any).orAlternativeCount ?? null,
          orSlotsJson: (s as any).orSlotsJson ?? null,
          allowedTypesJson: s.allowedTypesJson ?? "[]",
          role: (s as any).role ?? "STANDARD",
          groupKey: (s as any).groupKey ?? "",
        })),
      };
      let savedBlueprintId = id;
      if (id === "new") {
        const created = await api<{ id: string }>("/api/blueprints", { method: "POST", json });
        savedBlueprintId = created.id;
      } else {
        await api(`/api/blueprints/${id}`, { method: "PUT", json });
        // the list's banner confirms a plain save; the paper count is news only here
        if (hasPapers) toast.success(`Updated blueprint & synchronized ${paperCount} paper(s)`);
      }

      if (andBuildPaper) {
        const paper = await api<PaperData>("/api/papers", {
          method: "POST",
          json: {
            title: `${name} — Draft Paper`,
            blueprintId: savedBlueprintId,
            examType,
            layout: defaultLayoutForClass(book?.className),
            schoolName: DEFAULT_SCHOOL_NAME,
            paperSet: "SET A",
            subjectCode,
            academicSession,
          },
        });
        toast.success(`Created paper "${paper.title}"`);
        setBusy(false); // the editor stays alive behind the next page; Back must not find it stuck on "Saving…"
        router.push(`/papers/${paper.id}`);
      } else {
        setBusy(false);
        router.push(`/blueprints?saved=${encodeURIComponent(savedBlueprintId)}${id === "new" ? "&created=1" : ""}`);
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function buildPaperDirectly() {
    setBusy(true);
    setError(null);
    try {
      const paper = await api<PaperData>("/api/papers", {
        method: "POST",
        json: {
          title: `${name} — Draft Paper`,
          blueprintId: id,
          examType,
          layout: defaultLayoutForClass(book?.className),
          schoolName: DEFAULT_SCHOOL_NAME,
          paperSet: "SET A",
          subjectCode,
          academicSession,
        },
      });
      toast.success(`Created paper "${paper.title}"`);
      setBusy(false);
      router.push(`/papers/${paper.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!loaded) return error ? <ErrorBanner message={error} /> : <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <form onSubmit={isReadOnly ? (e) => e.preventDefault() : save} className="space-y-4 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">
            {id === "new" ? "New blueprint" : isReadOnly ? "View blueprint" : "Edit blueprint"}
          </h1>
          {id === "new" && !isReadOnly && (
            <ol className="mt-2 flex flex-wrap items-center gap-2 text-xs" aria-label="Steps">
              <li>
                <button
                  type="button"
                  onClick={() => setStarted(false)}
                  disabled={!started}
                  aria-current={!started ? "step" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 font-medium ${
                    started ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900" : "bg-indigo-50 text-indigo-800"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${started ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"}`}>
                    {started ? <Check size={12} aria-hidden /> : "1"}
                  </span>
                  Class, subject and pattern
                </button>
              </li>
              <li aria-hidden className="h-px w-5 bg-slate-300" />
              <li
                aria-current={started ? "step" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 font-medium ${started ? "bg-indigo-50 text-indigo-800" : "text-slate-400"}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${started ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>2</span>
                Sections, marks and chapters
              </li>
            </ol>
          )}
          {started && (book || selectedClassFilter) && (
            <p className="mt-0.5 text-sm text-slate-500">
              {book?.className ?? selectedClassFilter} · {book?.subject ?? selectedSubjectFilter}
              {curriculumMode === "STANDARD_MPBSE" ? " · MPBSE 2026–27 board pattern" : curriculumMode === "CUSTOM_SCHOOL" ? " · school exam adapted from the board pattern" : " · custom pattern"}
              {id === "new" && !isReadOnly && (
                <button type="button" className="ml-2 font-medium text-indigo-700 hover:underline" onClick={() => setStarted(false)}>
                  Change class or pattern
                </button>
              )}
            </p>
          )}
        </div>
        {started && (
          <div className="flex flex-wrap items-center gap-2">
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  setImportModalTab("ai");
                  setImportModalOpen(true);
                }}
                className="btn btn-ghost border border-slate-200 bg-white text-xs"
                title="Read a blueprint from a circular, syllabus image, PDF or text with AI"
              >
                <Sparkles size={14} className="text-indigo-600" /> Read from a document
              </button>
            )}
            <button
              type="button"
              onClick={() => setJsonModalOpen(true)}
              className="btn btn-ghost border border-slate-200 bg-white text-xs"
              title="View this blueprint as JSON"
            >
              <Code2 size={14} className="text-slate-600" /> JSON
            </button>
            <button
              type="button"
              onClick={() => downloadBlueprintJson(currentBlueprintData, book)}
              className="btn btn-ghost border border-slate-200 bg-white text-xs"
              title="Download this blueprint as a .json file"
            >
              <Download size={14} className="text-slate-600" /> Download
            </button>
          </div>
        )}
      </div>

      {started ? (
      <>
      {isReadOnly && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/90 p-4 text-xs text-sky-950 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-sky-900">
            <Sparkles size={16} className="text-sky-600" />
            <span>View-Only Blueprint Mode</span>
          </div>
          <p className="leading-relaxed">
            {id === "new"
              ? "You are not assigned to any class yet, so you cannot create blueprints. Ask your Administrator to assign your classes."
              : "This blueprint belongs to a class or subject you are not assigned to. You can still build a paper from it, or duplicate it into one of your own classes."}
          </p>
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

      {curriculumMode === "CUSTOM_SCHOOL" && (
        <CustomSchoolTermConfigurator
          chapters={book?.chapters || []}
          marks={marks}
          onMarksChange={setMarks}
          term={selectedTerm}
          onTermChange={(t, dur) => {
            setSelectedTerm(t);
            setExamType(t === "PRE_BOARD" ? "ANNUAL" : t === "UNIT_TEST" ? "QUARTERLY" : t);
            setDurationMin(dur);
          }}
          targetMarks={customTargetMarks}
          onTargetMarksChange={setCustomTargetMarks}
          isReadOnly={isReadOnly}
        />
      )}

      <FeasibilityStatusAlert
        warnings={feasibilityWarnings}
        totalSectionMarks={total}
        totalChapterMarks={chapterTotal}
      />

      <fieldset disabled={isReadOnly} className="space-y-4">
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

        {curriculumMode === "BLANK_CUSTOM" && (
          <>
            <Field label="Class">
              <select
                className="input"
                value={selectedClassFilter}
                disabled={hasPapers}
                onChange={(e) => {
                  const cls = e.target.value;
                  setSelectedClassFilter(cls);
                  setSelectedSubjectFilter("");
                  const firstMatch = books.find((b) => !cls || b.className.trim().toLowerCase() === cls.trim().toLowerCase());
                  if (firstMatch) {
                    setBookId(firstMatch.id);
                    setMarks({});
                  } else {
                    setBookId("");
                    setMarks({});
                  }
                }}
              >
                <option value="">All Classes</option>
                {availableClasses.map((cls) => (
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
                      (!selectedClassFilter || b.className.trim().toLowerCase() === selectedClassFilter.trim().toLowerCase()) &&
                      (!sub || isSubjectMatching(b.subject, sub))
                  );
                  if (firstMatch) {
                    setBookId(firstMatch.id);
                    setMarks({});
                  } else {
                    setBookId("");
                    setMarks({});
                  }
                  const matchedCls = classes.find(
                    (c) => !selectedClassFilter || c.name.trim().toLowerCase() === selectedClassFilter.trim().toLowerCase()
                  );
                  const matchedSub = matchedCls?.subjects.find((s) => isSubjectMatching(s.name, sub));
                  if (matchedSub?.code) {
                    setSubjectCode(matchedSub.code);
                  }
                }}
              >
                <option value="">All Subjects</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        <Field label="Textbook / Syllabus" helper={hasPapers ? "Book cannot be changed while papers use this blueprint." : undefined}>
          <select
            className="input"
            value={bookId}
            required
            disabled={hasPapers || matchingBooks.length === 0}
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
            {matchingBooks.length === 0 ? (
              <option value="">No textbooks available for this subject</option>
            ) : (
              matchingBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.className} · {b.subject} · {b.chapters.length} ch)
                </option>
              ))
            )}
          </select>
        </Field>

        {selectedClassFilter && selectedSubjectFilter && matchingBooks.length === 0 && (
          <div className="col-span-full rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <Sparkles size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">
                  No textbook found for {selectedClassFilter} · {selectedSubjectFilter}
                </p>
                <p className="text-amber-800/90 mt-0.5">
                  Exam blueprints require a syllabus textbook and chapters to allocate marks and build exam papers.
                </p>
              </div>
            </div>
            <Link
              href={`/books?className=${encodeURIComponent(selectedClassFilter)}&subject=${encodeURIComponent(selectedSubjectFilter)}&add=1`}
              className="btn btn-primary text-xs py-1.5 px-3 shrink-0 self-start sm:self-auto gap-1.5"
            >
              <Plus size={14} /> Add Textbook for {selectedSubjectFilter}
            </Link>
          </div>
        )}

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
            {!isReadOnly && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={addSectionGroup}
              >
                <Plus size={14} /> Add section
              </button>
            )}
          </div>

          <div className="space-y-4">
            {sectionGroups.map((grp, i) => {
              const grpCount = grp.questionTypes.reduce((s, qt) => s + qt.count, 0);
              const grpMarks = grp.questionTypes.reduce((s, qt) => s + qt.count * qt.marksEach, 0);
              const grpOrCount = grp.questionTypes.reduce((acc, q) => {
                const bRule = getBoardDefaultChoiceRequirement({
                  board: "MPBSE",
                  className: book?.className,
                  subject: book?.subject,
                  subjectCode,
                  academicSession,
                  examType,
                  questionType: q.type,
                  marksEach: q.marksEach,
                  sectionTitle: grp.title,
                });
                return (
                  acc +
                  Array.from({ length: q.count }).filter((_, idx) =>
                    isSlotChoiceRequired(q, idx, bRule.required)
                  ).length
                );
              }, 0);

              // an official pattern is read, not edited, most of the time: show each section as one line
              if (curriculumMode === "STANDARD_MPBSE" && !openGroups[grp.key]) {
                return (
                  <div key={grp.key} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{grp.title || `Section ${String.fromCharCode(65 + i)}`}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {grp.questionTypes
                          .map((qt) => `${QUESTION_TYPE_LABEL[qt.type as keyof typeof QUESTION_TYPE_LABEL] ?? qt.type} × ${qt.count} (${qt.marksEach} each)`)
                          .join(", ")}
                        {` · ${grpMarks} marks`}
                        {grpOrCount > 0 ? ` · OR choice on ${grpOrCount}` : ""}
                      </p>
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost shrink-0 border border-slate-200"
                        onClick={() => setOpenGroups((g) => ({ ...g, [grp.key]: true }))}
                        aria-label={`Edit ${grp.title}`}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                    )}
                  </div>
                );
              }

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
                    <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs py-1 px-2.5 whitespace-nowrap shadow-2xs">
                      {grpCount} Qs {grpOrCount > 0 ? `(+${grpOrCount} OR)` : ""} · {grpMarks} marks
                    </span>
                    {!isReadOnly && (
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
                    )}
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
                        {grpCount} Qs {grpOrCount > 0 ? `(+${grpOrCount} OR)` : ""} · {grpMarks} Marks
                      </span>
                    </div>

                    <div className="space-y-2">
                      {grp.questionTypes.map((qt) => {
                        const boardDefaultReq = getBoardDefaultChoiceRequirement({
                          board: "MPBSE",
                          className: book?.className,
                          subject: book?.subject,
                          subjectCode,
                          academicSession,
                          examType,
                          questionType: qt.type,
                          marksEach: qt.marksEach,
                          sectionTitle: grp.title,
                        });

                        const conflict = detectBoardRuleConflict({
                          board: "MPBSE",
                          className: book?.className,
                          subject: book?.subject,
                          subjectCode,
                          academicSession,
                          examType,
                          questionType: qt.type,
                          marksEach: qt.marksEach,
                          sectionTitle: grp.title,
                          orChoiceMode: qt.orChoiceMode,
                        });

                        const effectiveAltCount = Array.from({ length: qt.count }).filter((_, slotIdx) =>
                          isSlotChoiceRequired(qt, slotIdx, boardDefaultReq.required)
                        ).length;

                        return (
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
                                  {(isPrePrimary ? [...KINDERGARTEN_QUESTION_TYPES, ...STANDARD_QUESTION_TYPES] : STANDARD_QUESTION_TYPES).map((t) => (
                                    <option key={t} value={t}>
                                      {QUESTION_TYPE_LABEL[t]}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {!isReadOnly && grp.questionTypes.length > 1 && (
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

                            {/* Other forms this slot may take at the same marks (e.g. grammar in an English 3-mark section) */}
                            {(() => {
                              const accepted = allowedTypesFor(qt);
                              const pool = (isPrePrimary ? [...KINDERGARTEN_QUESTION_TYPES, ...STANDARD_QUESTION_TYPES] : STANDARD_QUESTION_TYPES).filter((t) => t !== qt.type);
                              const toggle = (t: string) => {
                                const next = accepted.includes(t) ? accepted.filter((x) => x !== t) : [...accepted, t];
                                patchQuestionType(grp.key, qt.key, { allowedTypesJson: JSON.stringify(next) });
                              };
                              return (
                                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                                  <div className="text-[11px] font-semibold text-slate-700">
                                    Also accepts, at {qt.marksEach} mark{qt.marksEach > 1 ? "s" : ""}:
                                    <span className="ml-1 font-normal text-slate-500">teachers can use these forms instead of {QUESTION_TYPE_LABEL[qt.type as keyof typeof QUESTION_TYPE_LABEL] ?? qt.type}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1" role="group" aria-label="Also accepts">
                                    {pool.map((t) => {
                                      const on = accepted.includes(t);
                                      return (
                                        <button
                                          key={t}
                                          type="button"
                                          disabled={isReadOnly}
                                          aria-pressed={on}
                                          onClick={() => toggle(t)}
                                          className={`rounded-full border px-2 py-0.5 text-[10.5px] ${on ? "border-indigo-400 bg-indigo-50 font-semibold text-indigo-800" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                                        >
                                          {QUESTION_TYPE_LABEL[t as keyof typeof QUESTION_TYPE_LABEL] ?? t}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Internal Choice (OR / अथवा) Configuration */}
                            <div className="pt-2 border-t border-slate-200/80 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-slate-700">
                                    Internal Choice (OR / अथवा):
                                  </span>
                                  <select
                                    className={`input text-xs py-1 px-2 font-medium ${
                                      qt.orChoiceMode === "REQUIRED"
                                        ? "border-purple-300 text-purple-900 bg-purple-50/60"
                                        : qt.orChoiceMode === "NOT_REQUIRED"
                                        ? "border-slate-300 text-slate-600 bg-slate-50"
                                        : "border-indigo-300 text-indigo-900 bg-indigo-50/40"
                                    }`}
                                    value={qt.orChoiceMode || "BOARD_DEFAULT"}
                                    onChange={(e) =>
                                      patchQuestionType(grp.key, qt.key, {
                                        orChoiceMode: e.target.value as "BOARD_DEFAULT" | "REQUIRED" | "NOT_REQUIRED",
                                      })
                                    }
                                    disabled={isReadOnly}
                                    aria-label="Internal choice configuration"
                                  >
                                    <option value="BOARD_DEFAULT">
                                      Use Board Default ({boardDefaultReq.required ? "Required" : "Not Required"})
                                    </option>
                                    <option value="REQUIRED">Required (OR / अथवा)</option>
                                    <option value="NOT_REQUIRED">Not Required</option>
                                  </select>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-slate-700">Section role:</span>
                                  <select
                                    className="input text-xs py-1 px-2 font-medium"
                                    value={qt.role || "STANDARD"}
                                    onChange={(e) => patchQuestionType(grp.key, qt.key, { role: e.target.value })}
                                    disabled={isReadOnly}
                                    aria-label="Section role"
                                  >
                                    <option value="STANDARD">General</option>
                                    <option value="PASSAGE">Passage group (unseen prose / poetry)</option>
                                    <option value="GRAMMAR">Grammar</option>
                                    <option value="WRITING">Writing task</option>
                                    <option value="LITERATURE">Literature</option>
                                  </select>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-medium">
                                    {effectiveAltCount > 0 ? (
                                      <span className="text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                        {effectiveAltCount} OR {effectiveAltCount === 1 ? "alternative" : "alternatives"}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">No alternatives</span>
                                    )}
                                  </span>

                                  {qt.count > 1 && (
                                    <button
                                      type="button"
                                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                                      onClick={() => toggleSlotCustomizer(qt.key)}
                                    >
                                      <span>{expandedSlotCustomizers[qt.key] ? "Hide Slots ▲" : "Customize Slots ▼"}</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Conflict warning banner if school override conflicts with board circular */}
                              {/* an official MPBSE pattern is the board rule itself, so only flag edits made outside it */}
                              {conflict.hasConflict && curriculumMode !== "STANDARD_MPBSE" && (
                                <div className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 rounded p-1.5 flex items-start gap-1.5">
                                  <span className="font-bold shrink-0">⚠️ Conflict Notice:</span>
                                  <div className="flex-1">
                                    <span>{conflict.message}</span>
                                    {conflict.ruleReference && (
                                      <span className="block text-[10px] text-amber-700/90 font-mono mt-0.5">
                                        Ref: {conflict.ruleReference}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Collapsible Question Slot Customizer */}
                              {expandedSlotCustomizers[qt.key] && (
                                <div className="mt-2 p-2 bg-white rounded border border-slate-200 space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold text-slate-700 border-b border-slate-100 pb-1">
                                    <span>Question Slot Overrides ({qt.count} slots):</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        className="px-1.5 py-0.5 text-[10px] rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-medium"
                                        onClick={() => setAllSlotsRequirement(grp.key, qt.key, qt.count, true)}
                                        disabled={isReadOnly}
                                      >
                                        All OR
                                      </button>
                                      <button
                                        type="button"
                                        className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-medium"
                                        onClick={() => setAllSlotsRequirement(grp.key, qt.key, qt.count, false)}
                                        disabled={isReadOnly}
                                      >
                                        None
                                      </button>
                                      <button
                                        type="button"
                                        className="px-1.5 py-0.5 text-[10px] rounded bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 font-medium"
                                        onClick={() => resetSlotsToDefault(grp.key, qt.key)}
                                        disabled={isReadOnly}
                                      >
                                        Reset to Default
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5 pt-1">
                                    {Array.from({ length: qt.count }).map((_, slotIdx) => {
                                      const isReq = isSlotChoiceRequired(qt, slotIdx, boardDefaultReq.required);
                                      const hasCustom = hasExplicitSlotOverride(qt, slotIdx);

                                      return (
                                        <button
                                          key={slotIdx}
                                          type="button"
                                          className={`flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium border transition ${
                                            isReq
                                              ? "bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100"
                                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                          } ${hasCustom ? "ring-1 ring-purple-400 font-semibold" : ""}`}
                                          onClick={() => toggleSlotOverride(grp.key, qt.key, qt.count, slotIdx, isReq)}
                                          disabled={isReadOnly}
                                          title={hasCustom ? "Custom slot override applied" : "Inherited from section default"}
                                        >
                                          <span>Slot {slotIdx + 1}</span>
                                          <span className={`text-[10px] px-1 rounded ${isReq ? "bg-purple-200/80 text-purple-950 font-bold" : "bg-slate-200 text-slate-600"}`}>
                                            {isReq ? "OR" : "No"}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!isReadOnly && (
                      <button
                        type="button"
                        className="btn btn-sm text-xs font-semibold text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/80 border border-indigo-200/80 w-full flex items-center justify-center gap-1.5 py-1.5 transition"
                        onClick={() => addQuestionTypeToGroup(grp.key)}
                      >
                        <Plus size={13} className="text-indigo-600" /> Add another question type to {grp.title || `Section ${String.fromCharCode(65 + i)}`}
                      </button>
                    )}
                  </div>
                </fieldset>
              );
            })}
          </div>

          <div className="text-sm font-semibold text-slate-900 pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>Total Sections:</span>
              <span className="text-xs font-normal text-slate-500">
                {totalLogicalQuestions} Questions {totalAlternativeQuestions > 0 ? `(+${totalAlternativeQuestions} OR alternatives)` : ""}
              </span>
            </div>
            <span className="badge badge-indigo text-xs font-bold px-3 py-1">{total} marks</span>
          </div>
        </section>

        <section className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">Chapter Marks</h2>
              <span
                className={`badge text-xs font-bold py-0.5 px-2.5 border ${
                  chapterTotal === total && total > 0
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : chapterTotal > total
                    ? "bg-red-50 text-red-800 border-red-300"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}
              >
                {chapterTotal}/{total}m {chapterTotal === total && total > 0 ? "✓ Balanced" : chapterTotal < total ? `(${total - chapterTotal}m needed)` : `(${chapterTotal - total}m over)`}
              </span>
            </div>
            {!isReadOnly && book && book.chapters.length > 0 && total > 0 && chapterTotal !== total && (
              <button
                type="button"
                className="btn btn-sm text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                onClick={autoDistributeMarks}
                title="Spread the marks over the chapters that have marks (or all chapters), one whole question at a time"
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
                {book.chapters.map((c, idx) => {
                  // a combined book prefixes each chapter with its source book: show that once, as a heading
                  const m = c.title.match(/^\[([^\]]+)\]\s*(.*)$/);
                  const source = m?.[1] ?? "";
                  const prev = idx > 0 ? book.chapters[idx - 1].title.match(/^\[([^\]]+)\]/)?.[1] ?? "" : null;
                  return (
                    <Fragment key={c.id}>
                      {source && source !== prev && (
                        <tr>
                          <th colSpan={3} className="pt-3 pb-1 text-left text-xs font-semibold text-slate-500">
                            {source}
                          </th>
                        </tr>
                      )}
                      <tr className="border-t border-slate-100">
                        <td className="w-10 py-1.5 text-slate-500">{c.number}</td>
                        <td className="py-1.5">{m ? m[2] : c.title}</td>
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
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>



      </fieldset>

      {isReadOnly ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={buildPaperDirectly}
            className="btn btn-primary flex items-center gap-1.5"
            disabled={busy}
            title="Create a new draft exam paper using this blueprint"
          >
            <FileText size={15} /> Build Exam Paper
          </button>
          <button
            type="button"
            onClick={() => router.push(`/blueprints/new?from=${id}`)}
            className="btn btn-ghost border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 font-semibold flex items-center gap-1.5"
            disabled={busy}
            title="Duplicate this blueprint into a new customizable blueprint"
          >
            <Sparkles size={14} className="text-indigo-600" /> Duplicate as New Blueprint
          </button>
          <button
            type="button"
            className="btn btn-ghost border border-slate-200"
            onClick={() => router.push("/blueprints")}
          >
            Back to Blueprints
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {problems.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-bold">⚠️ To save blueprint:</span>
                <span>{problems.join(" • ")}</span>
              </div>
              {book && book.chapters.length > 0 && total > 0 && chapterTotal !== total && (
                <button
                  type="button"
                  className="btn btn-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded shadow-2xs shrink-0"
                  onClick={autoDistributeMarks}
                >
                  ⚡ Auto-Balance Chapter Marks ({total}m)
                </button>
              )}
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
        </div>
      )}

      </>
      ) : (
        <BlueprintStartPicker
          classes={allClasses.length ? allClasses : classes}
          books={books}
          initialClassName={typeof sp.className === "string" ? sp.className : undefined}
          initialSubject={typeof sp.subject === "string" ? sp.subject : undefined}
          onUsePattern={(t) => {
            setStarted(true);
            void handleLoadOfficialTemplate(t);
          }}
          onAdaptPattern={(t) => {
            setStarted(true);
            void handleLoadOfficialTemplate(t).then(() => setCurriculumMode("CUSTOM_SCHOOL"));
          }}
          onUseSchoolPattern={applySchoolPattern}
          onBlank={startBlank}
          onImport={() => {
            setImportModalTab("import");
            setImportModalOpen(true);
          }}
          onAi={() => {
            setImportModalTab("ai");
            setImportModalOpen(true);
          }}
        />
      )}

      <BlueprintImportModal
        isOpen={importModalOpen}
        initialTab={importModalTab}
        onClose={() => setImportModalOpen(false)}
        onApply={handleImportedBlueprint}
        book={book}
        books={books}
      />

      <BlueprintJsonModal
        isOpen={jsonModalOpen}
        onClose={() => setJsonModalOpen(false)}
        blueprint={currentBlueprintData}
        book={book}
      />

      <BlueprintTemplateModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSelectTemplate={applyStarterTemplate}
      />

      {/* Sticky budget bar: stays inside the content column, never over the sidebar */}
      {started && (
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200/90 bg-white/95 px-4 py-2.5 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Questions:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {totalLogicalQuestions}
              </span>
            </div>
            {totalAlternativeQuestions > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-purple-600 font-medium">OR Choices:</span>
                <span className="font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  +{totalAlternativeQuestions}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Sections Target:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {total}m
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Chapter Quotas:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {chapterTotal}m
              </span>
            </div>
            <span
              className={`badge text-[11px] font-bold py-0.5 px-2 border ${
                chapterTotal === total && total > 0
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : chapterTotal > total
                  ? "bg-red-50 text-red-800 border-red-300"
                  : "bg-amber-50 text-amber-800 border-amber-300"
              }`}
            >
              {chapterTotal === total && total > 0
                ? "✓ Balanced"
                : chapterTotal < total
                ? `Difference: -${total - chapterTotal}m`
                : `Difference: +${chapterTotal - total}m`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isReadOnly && book && book.chapters.length > 0 && total > 0 && chapterTotal !== total && (
              <button
                type="button"
                className="btn btn-xs text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-2xs"
                onClick={autoDistributeMarks}
                title="Spread the marks over the chapters that have marks (or all chapters), one whole question at a time"
              >
                ⚡ Auto-Distribute {total}m
              </button>
            )}
            {!isReadOnly && (
              <button
                type="button"
                onClick={(e) => void save(e, false)}
                disabled={busy || problems.length > 0}
                className="btn btn-xs btn-primary shadow-2xs font-semibold px-3 py-1"
              >
                {busy ? "Saving…" : "Save Blueprint"}
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </form>
  );
}
