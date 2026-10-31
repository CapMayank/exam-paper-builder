# Graph Report - exam-paper-builder  (2026-10-31)

## Corpus Check
- 260 files · ~396,900 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1602 nodes · 5990 edges · 61 communities (58 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `70c591ff`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- lib/types.ts
- paperImport.ts
- body
- FigureStudio.tsx
- geometry.ts
- package.json
- papers.ts
- dto.ts
- syllabusImport.ts
- Modal
- recordAudit
- time
- classes/route.ts
- vitest
- schemas.ts
- diagram-search.ts
- logic.test.ts
- register/route.ts
- books/page.tsx
- render.ts
- devDependencies
- hitTest
- batchQuestionIo.ts
- blueprints/[id]/route.ts
- AppShell.tsx
- api.ts
- useToast
- react
- compilerOptions
- dependencies
- app/layout.tsx
- blueprint.ts
- scripts
- BlueprintEditorPage
- e2e.mjs
- reconcileBlueprint.ts
- studio.test.ts
- text.ts
- ErrorBanner
- ui.tsx
- internalChoiceRules.ts
- HttpError
- eslint.config.mjs
- blueprintExport.ts
- localization/index.ts
- parseMatchColumnPairs
- blueprintImport.ts
- math.ts
- README.md
- print-logistics.ts
- AGENTS.md
- deploy.sh
- BlueprintImportModal
- QuestionForm.tsx
- export-docx/route.ts
- api
- gemini.ts
- constants.ts
- SubjectWorkspaceDrawer.tsx

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 133 edges
2. `body()` - 85 edges
3. `api()` - 84 edges
4. `recordAudit()` - 73 edges
5. `route()` - 68 edges
6. `prisma` - 68 edges
7. `Modal()` - 60 edges
8. `react` - 59 edges
9. `loadPaperView()` - 57 edges
10. `vitest` - 51 edges

## Surprising Connections (you probably didn't know these)
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `M2 (Section Enrollment & Print Logistics)` --references--> `toAcademicClassDto()`  [INFERRED]
  PROJECT.md → src/lib/classes.ts
- `Feature Inventory` --references--> `assertCanModifyPaper()`  [INFERRED]
  PROJECT.md → src/lib/papers.ts
- `Feature Inventory` --references--> `assertCanModifyQuestion()`  [INFERRED]
  PROJECT.md → src/lib/papers.ts
- `Feature Inventory` --references--> `AcademicClassDto`  [INFERRED]
  PROJECT.md → src/lib/types.ts

## Import Cycles
- None detected.

## Communities (61 total, 3 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.07
Nodes (47): CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint(), numberGridPlugin, NumberGridPrint() (+39 more)

### Community 1 - "lib/types.ts"
Cohesion: 0.11
Nodes (23): Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), GET, include, toQuestionDto(), validateChoiceParity(), questionSchema (+15 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.11
Nodes (31): POST, AIBlueprintModalProps, PaperImportModal(), PaperImportModalProps, inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier() (+23 more)

### Community 3 - "body"
Cohesion: 0.07
Nodes (37): zod, POST, auditSchema, POST, generateSchema, POST, improveSchema, POST (+29 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.13
Nodes (13): name, private, version, @playwright/test, prisma, react-dom, tailwindcss, @tailwindcss/turbopack (+5 more)

### Community 7 - "papers.ts"
Cohesion: 0.16
Nodes (17): DELETE, PATCH, updateSubjectSchema, GET, GET, POST, DELETE, PATCH (+9 more)

### Community 8 - "dto.ts"
Cohesion: 0.12
Nodes (26): @prisma/client, prisma, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, MarksStyle, NUMBERING_STYLES (+18 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.10
Nodes (36): POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON, SyllabusImportModal(), handleAiScan() (+28 more)

### Community 10 - "Modal"
Cohesion: 0.15
Nodes (14): BlueprintsPage(), remove(), subjectMatches(), QuestionExportModal(), LoginPage(), AcademicRolloverModal(), AcademicRolloverModalProps, AIBlueprintModal() (+6 more)

### Community 11 - "recordAudit"
Cohesion: 0.15
Nodes (29): POST, POST, GET, POST, POST, POST, parallelSetsSchema, POST (+21 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.35
Nodes (14): PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject(), normalizeAcademicSession(), normalizeSectionDetails(), syncClassesFromBooks() (+6 more)

### Community 14 - "vitest"
Cohesion: 0.27
Nodes (13): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+5 more)

### Community 15 - "schemas.ts"
Cohesion: 0.09
Nodes (24): AuditAction, addItemSchema, changePasswordSchema, classSectionInputSchema, classSubjectSchema, combineBooksSchema, editPaperItemSchema, loginSchema (+16 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.10
Nodes (23): prisma, UPLOAD_DIR, GET, POST, GET, TYPE_BY_EXT, EXT_BY_TYPE, POST (+15 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.17
Nodes (15): assert(), runServerChecks(), AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks() (+7 more)

### Community 18 - "register/route.ts"
Cohesion: 0.14
Nodes (18): Architecture, Code Layout, Feature Inventory, Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, server-only, POST, POST (+10 more)

### Community 19 - "books/page.tsx"
Cohesion: 0.14
Nodes (15): BooksPage(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), emptyBook, AIQuestionGeneratorModalProps (+7 more)

### Community 20 - "render.ts"
Cohesion: 0.19
Nodes (24): FigureStudio(), hasBoxFields(), angleGeom, boxCenter(), boxCorners(), boxHandlePos(), hatchGeometry(), applyStyle() (+16 more)

### Community 21 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, @playwright/test, prisma, tailwindcss, @tailwindcss/turbopack, @types/katex (+5 more)

### Community 22 - "hitTest"
Cohesion: 0.13
Nodes (24): axesLayout(), boxToWorld(), clamp(), constrainAngle(), deg(), dist(), distToPolyline(), distToSeg() (+16 more)

### Community 23 - "batchQuestionIo.ts"
Cohesion: 0.06
Nodes (55): RFC-4180, GET, MultiSetGeneratorModal(), QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat (+47 more)

### Community 24 - "blueprints/[id]/route.ts"
Cohesion: 0.25
Nodes (11): DELETE, GET, PUT, POST, GET, POST, diagnosePaperImplications(), assertBlueprintValid() (+3 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.10
Nodes (24): AppLayout(), handleSubmit(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AcademicSessionSelectorProps, AppShell(), signOut() (+16 more)

### Community 26 - "api.ts"
Cohesion: 0.15
Nodes (16): bcryptjs, GET, GET, POST, GET, GET, GET, bulkDifficultySchema (+8 more)

### Community 27 - "useToast"
Cohesion: 0.14
Nodes (15): QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), remove(), AIQuestionGeneratorModal(), PaperSnapshotDrawer(), PaperSnapshotDrawerProps (+7 more)

### Community 28 - "react"
Cohesion: 0.15
Nodes (20): nextConfig, lucide-react, next, react, Filter, BlueprintRolloverModalProps, BlueprintTemplateModal(), BlueprintTemplateModalProps (+12 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, docx, katex, lucide-react, next, @prisma/client, react (+3 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "blueprint.ts"
Cohesion: 0.15
Nodes (18): handleImportedBlueprint(), blueprintTotalMarks(), ChapterQuota, checkBlueprintFeasibility(), DiagnosticItem, flattenSectionGroups(), getItemMarks(), getItemUnits() (+10 more)

### Community 33 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, seed, start, test, test:e2e

### Community 34 - "BlueprintEditorPage"
Cohesion: 0.13
Nodes (17): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), hasExplicitSlotOverride(), isSlotChoiceRequired(), moveSectionGroup(), parseSlotOverrides(), patchQuestionType() (+9 more)

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "reconcileBlueprint.ts"
Cohesion: 0.22
Nodes (7): getEffectiveQuestionMarks(), ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "ErrorBanner"
Cohesion: 0.18
Nodes (23): UsersAdminPage(), ExamCellPage(), getSectionsForClass(), Tab, DashboardPage(), Data, PaperRow(), Progress() (+15 more)

### Community 40 - "ui.tsx"
Cohesion: 0.10
Nodes (18): AIQuestionImproverModalProps, ImproveTask, MathCategory, MathSnippet, SNIPPETS, ConfirmContext, ConfirmOptions, FALLBACK_TOAST (+10 more)

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.09
Nodes (31): GenerationSlotContract, BoardRuleConflictResult, detectBoardRuleConflict(), detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId, getBoardDefaultChoiceRequirement() (+23 more)

### Community 42 - "HttpError"
Cohesion: 0.12
Nodes (19): parseBlueprintSchema, POST, GET, POST, DELETE, GET, PATCH, DELETE (+11 more)

### Community 43 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 44 - "blueprintExport.ts"
Cohesion: 0.44
Nodes (8): BlueprintJsonModal(), BlueprintJsonModalProps, BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson, getBlueprintJsonFilename()

### Community 45 - "localization/index.ts"
Cohesion: 0.18
Nodes (15): BILINGUAL_DICTIONARY, DEVANAGARI_LETTERS, ENGLISH_DICTIONARY, ENGLISH_SECTION_TYPE_MAP, HINDI_DICTIONARY, LOCALES, localizeSectionTitle(), SANSKRIT_DICTIONARY (+7 more)

### Community 46 - "parseMatchColumnPairs"
Cohesion: 0.11
Nodes (18): Bar(), PaperBuilderPage(), handleAutofill(), QuestionPicker(), add(), handleAcceptAiQuestion(), handleEditAiQuestion(), handleGenerateAiQuestion() (+10 more)

### Community 47 - "blueprintImport.ts"
Cohesion: 0.23
Nodes (15): BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, matchChaptersToBook(), normalizeExamType(), normalizeQuestionType(), parseBlueprintImport() (+7 more)

### Community 48 - "math.ts"
Cohesion: 0.23
Nodes (15): cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX, isEntirelyMath() (+7 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "print-logistics.ts"
Cohesion: 0.38
Nodes (8): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, SetDistribution

### Community 54 - "BlueprintImportModal"
Cohesion: 0.47
Nodes (4): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent()

### Community 55 - "QuestionForm.tsx"
Cohesion: 0.09
Nodes (46): getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), AIPaperGeneratorModal(), AIQuestionImproverModal(), DiagramSearchModal(), DiagramSearchModalProps, MathText() (+38 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.13
Nodes (42): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), PrintPage(), BlankPage() (+34 more)

### Community 57 - "api"
Cohesion: 0.10
Nodes (28): ClassesHierarchyPage(), addMissingStandardSubjects(), addSectionToClass(), deleteClass(), deleteSubject(), removeSectionFromClass(), saveClass(), saveSubject() (+20 more)

### Community 58 - "gemini.ts"
Cohesion: 0.08
Nodes (55): GET, derangeMatchColumnPairs(), extractMatchPairsFromExplanation(), buildAndValidateGenerationContract(), CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, CLASS_12_MATH_CHAPTER_SPECS (+47 more)

### Community 59 - "constants.ts"
Cohesion: 0.07
Nodes (38): OmrSheetPage(), AIPaperGeneratorModalProps, PaperPreflightModal(), PaperPreflightModalProps, AcademicSession, DEFAULT_SCHOOL_LOGO, DEFAULT_SCHOOL_NAME, DerangedMatchColumnResult (+30 more)

### Community 61 - "SubjectWorkspaceDrawer.tsx"
Cohesion: 0.43
Nodes (5): COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS, SubjectWorkspaceDrawerProps

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 424 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `BlueprintEditorPage`, `ErrorBanner`, `useToast`, `ui.tsx`, `Modal`, `syllabusImport.ts`, `parseMatchColumnPairs`, `books/page.tsx`, `BlueprintImportModal`, `QuestionForm.tsx`, `export-docx/route.ts`, `AppShell.tsx`, `constants.ts`, `react`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0670807453416149 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `ErrorBanner`, `useToast`, `ui.tsx`, `Modal`, `syllabusImport.ts`, `blueprintExport.ts`, `books/page.tsx`, `QuestionForm.tsx`, `export-docx/route.ts`, `api`, `constants.ts`, `SubjectWorkspaceDrawer.tsx`, `AppShell.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `lib/types.ts`, `paperImport.ts`, `package.json`, `papers.ts`, `dto.ts`, `syllabusImport.ts`, `recordAudit`, `classes/route.ts`, `schemas.ts`, `diagram-search.ts`, `logic.test.ts`, `batchQuestionIo.ts`, `blueprint.ts`, `reconcileBlueprint.ts`, `studio.test.ts`, `internalChoiceRules.ts`, `parseMatchColumnPairs`, `blueprintImport.ts`, `math.ts`, `print-logistics.ts`, `QuestionForm.tsx`, `export-docx/route.ts`, `gemini.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10853658536585366 - nodes in this community are weakly interconnected._