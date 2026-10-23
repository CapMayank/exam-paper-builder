# Graph Report - exam-paper-builder  (2026-10-23)

## Corpus Check
- 239 files · ~351,413 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1442 nodes · 5101 edges · 52 communities (49 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6bd15b8a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- gemini.ts
- paperImport.ts
- batchQuestionIo.ts
- FigureStudio.tsx
- geometry.ts
- package.json
- Modal
- schemas.ts
- syllabusImport.ts
- blueprints/page.tsx
- m1-rbac-adversarial-stress.test.ts
- time
- schemas.ts
- BlueprintImportModal.tsx
- classes/page.tsx
- subpartsTotalMarks
- BlueprintEditorPage
- logic.test.ts
- HttpError
- render.ts
- QuestionForm.tsx
- hitTest
- api
- uploads/route.ts
- AppShell.tsx
- api.ts
- diagram-search.ts
- session.ts
- compilerOptions
- QuestionView.tsx
- app/layout.tsx
- register/route.ts
- blueprint.ts
- useToast
- e2e.mjs
- api.ts
- studio.test.ts
- text.ts
- export-docx/route.ts
- constants.ts
- AIQuestionGeneratorModal.tsx
- blueprintExport.ts
- BlueprintImportModal
- diagram-rules.ts
- parse-syllabus/route.ts
- classes.ts
- README.md
- m1-rbac-adversarial-stress.test.ts
- AGENTS.md
- deploy.sh

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 129 edges
2. `api()` - 86 edges
3. `body()` - 82 edges
4. `recordAudit()` - 70 edges
5. `route()` - 67 edges
6. `prisma` - 64 edges
7. `Modal()` - 60 edges
8. `react` - 59 edges
9. `loadPaperView()` - 54 edges
10. `lucide-react` - 49 edges

## Surprising Connections (you probably didn't know these)
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `Architecture` --references--> `SessionUser`  [INFERRED]
  PROJECT.md → src/lib/api.ts
- `M1 (RBAC & Ownership)` --references--> `toQuestionDto()`  [INFERRED]
  PROJECT.md → src/lib/dto.ts
- `Feature Inventory` --references--> `assertCanModifyPaper()`  [INFERRED]
  PROJECT.md → src/lib/papers.ts
- `M2 (Section Enrollment & Print Logistics)` --references--> `SectionDetail`  [INFERRED]
  PROJECT.md → src/lib/types.ts

## Import Cycles
- None detected.

## Communities (52 total, 3 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.06
Nodes (50): attach(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint() (+42 more)

### Community 1 - "gemini.ts"
Cohesion: 0.13
Nodes (23): improveSchema, POST, GET, auditPaperWithGemini(), callGeminiApi(), FigureStudioPromptResult, GeminiCallResult, GeminiContentPart (+15 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.10
Nodes (40): POST, GET, PrintPage(), BlankPage(), Block, buildBlocks(), extractSectionLetter(), Page() (+32 more)

### Community 3 - "batchQuestionIo.ts"
Cohesion: 0.07
Nodes (48): RFC-4180, GET, MultiSetGeneratorModal(), QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat (+40 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.04
Nodes (45): eslintConfig, dependencies, bcryptjs, docx, katex, lucide-react, next, @prisma/client (+37 more)

### Community 7 - "Modal"
Cohesion: 0.11
Nodes (24): UsersAdminPage(), QuestionImportModal(), handleFileChange(), validateContent(), ConfirmContext, ConfirmOptions, ErrorBanner(), FALLBACK_TOAST (+16 more)

### Community 8 - "schemas.ts"
Cohesion: 0.07
Nodes (47): M3 (Question Exhaustion Tagging), @prisma/client, vitest, prisma, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory (+39 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.10
Nodes (36): POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON, SyllabusImportModal(), handleAiScan() (+28 more)

### Community 10 - "blueprints/page.tsx"
Cohesion: 0.16
Nodes (17): BlueprintsPage(), remove(), subjectMatches(), LoginPage(), submit(), AcademicRolloverModal(), handleSubmit(), AcademicRolloverModalProps (+9 more)

### Community 11 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.15
Nodes (32): auditSchema, POST, POST, POST, GET, POST, POST, POST (+24 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "schemas.ts"
Cohesion: 0.08
Nodes (26): POST, GET, POST, DELETE, GET, POST, AuditAction, ensureClassAndSubject() (+18 more)

### Community 14 - "BlueprintImportModal.tsx"
Cohesion: 0.22
Nodes (17): BlueprintImportModalProps, BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, matchChaptersToBook(), normalizeExamType(), normalizeQuestionType() (+9 more)

### Community 15 - "classes/page.tsx"
Cohesion: 0.10
Nodes (29): nextConfig, next, emptyBook, SectionRosterItem(), subjectMatches(), ExamCellPage(), DashboardPage(), Data (+21 more)

### Community 16 - "subpartsTotalMarks"
Cohesion: 0.22
Nodes (7): getEffectiveQuestionMarks(), ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 17 - "BlueprintEditorPage"
Cohesion: 0.15
Nodes (11): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), moveSectionGroup(), removeSectionGroup(), save(), newQuestionType(), newSectionGroup() (+3 more)

### Community 18 - "logic.test.ts"
Cohesion: 0.15
Nodes (16): assert(), runServerChecks(), DEFAULT_SPACE, parseBulkQuestions(), ParsedQuestionItem, QuestionType, bookletPageCount(), imposeBooklet() (+8 more)

### Community 19 - "HttpError"
Cohesion: 0.06
Nodes (42): generateSchema, POST, POST, figureSchema, POST, GET, POST, POST (+34 more)

### Community 20 - "render.ts"
Cohesion: 0.19
Nodes (24): FigureStudio(), hasBoxFields(), angleGeom, boxCenter(), boxCorners(), boxHandlePos(), hatchGeometry(), applyStyle() (+16 more)

### Community 21 - "QuestionForm.tsx"
Cohesion: 0.07
Nodes (34): AIPaperAuditModalProps, AIQuestionImproverModal(), AIQuestionImproverModalProps, ImproveTask, DiagramSearchModal(), MathText(), MathCategory, MathSnippet (+26 more)

### Community 22 - "hitTest"
Cohesion: 0.13
Nodes (24): axesLayout(), boxToWorld(), clamp(), constrainAngle(), deg(), dist(), distToPolyline(), distToSeg() (+16 more)

### Community 23 - "api"
Cohesion: 0.14
Nodes (21): BooksPage(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage(), addMissingStandardSubjects() (+13 more)

### Community 24 - "uploads/route.ts"
Cohesion: 0.16
Nodes (8): prisma, UPLOAD_DIR, GET, TYPE_BY_EXT, EXT_BY_TYPE, POST, UPLOAD_DIR, __dirname

### Community 25 - "AppShell.tsx"
Cohesion: 0.12
Nodes (19): AppLayout(), AcademicSessionSelector(), handleAddCustom(), AcademicSessionSelectorProps, AppShell(), signOut(), isActive(), NAV (+11 more)

### Community 26 - "api.ts"
Cohesion: 0.17
Nodes (16): server-only, zod, parseBlueprintSchema, GET, postClassUnionSchema, duplicateSetSchema, parallelSetsSchema, GET (+8 more)

### Community 27 - "diagram-search.ts"
Cohesion: 0.26
Nodes (13): GET, POST, CURATED_DIAGRAMS, CuratedDiagram, DIAGRAM_STOP_WORDS, DiagramCandidate, DiagramEligibility, findEligibleDiagrams() (+5 more)

### Community 28 - "session.ts"
Cohesion: 0.20
Nodes (11): Architecture, Code Layout, Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, POST, endSession(), parseRawSessionCookie(), secret() (+3 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "QuestionView.tsx"
Cohesion: 0.15
Nodes (24): getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), submit(), LETTERS_LIST, QuestionRenderMode, QuestionView(), ROMAN_LOWER (+16 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "register/route.ts"
Cohesion: 0.23
Nodes (9): bcryptjs, POST, codeMatches(), POST, DELETE, PATCH, loginSchema, userUpdateSchema (+1 more)

### Community 33 - "blueprint.ts"
Cohesion: 0.12
Nodes (24): handleImportedBlueprint(), autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot (+16 more)

### Community 34 - "useToast"
Cohesion: 0.07
Nodes (18): PaperBuilderPage(), handleAutofill(), QuestionExportModal(), QuestionsPage(), handleBulkDelete(), handleBulkUpdateDifficulty(), remove(), AIQuestionGeneratorModal() (+10 more)

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "api.ts"
Cohesion: 0.22
Nodes (13): DELETE, GET, PUT, POST, GET, POST, diagnosePaperImplications(), assertBlueprintValid() (+5 more)

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "export-docx/route.ts"
Cohesion: 0.36
Nodes (9): docx, buildPaperDocx(), GET, formatQuestionNumber(), getMatchColumnInstruction(), DocxTextStyle, formatMathTextRuns(), formatOptionPairRuns() (+1 more)

### Community 40 - "constants.ts"
Cohesion: 0.07
Nodes (65): lucide-react, react, getSectionsForClass(), Tab, Bar(), OmrSheetPage(), AIBlueprintModalProps, AIPaperGeneratorModal() (+57 more)

### Community 41 - "AIQuestionGeneratorModal.tsx"
Cohesion: 0.22
Nodes (7): AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, CombineBooksModal(), CombineBooksModalProps, Book, Chapter

### Community 42 - "blueprintExport.ts"
Cohesion: 0.40
Nodes (9): BlueprintJsonModal(), BlueprintJsonModalProps, groupSectionsFromFlat(), BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson (+1 more)

### Community 43 - "BlueprintImportModal"
Cohesion: 0.47
Nodes (4): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent()

### Community 44 - "diagram-rules.ts"
Cohesion: 0.70
Nodes (3): getMaxPaperDiagramBudget(), isSectionVisuallyEligible(), isSubjectChapterVisual()

### Community 45 - "parse-syllabus/route.ts"
Cohesion: 0.67
Nodes (3): parseSchema, POST, parseSyllabusWithGemini()

### Community 46 - "classes.ts"
Cohesion: 0.16
Nodes (23): Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), PATCH, GET, POST, normalizeAcademicSession(), normalizeSectionDetails() (+15 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.14
Nodes (22): Feature Inventory, POST, GET, GET, DELETE, DELETE, GET, PATCH (+14 more)

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 380 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `constants.ts` to `kindergarten/types.ts`, `useToast`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `Modal`, `AIQuestionGeneratorModal.tsx`, `blueprints/page.tsx`, `blueprintExport.ts`, `syllabusImport.ts`, `BlueprintImportModal.tsx`, `classes/page.tsx`, `QuestionForm.tsx`, `AppShell.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06368011847463902 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `schemas.ts` to `kindergarten/types.ts`, `gemini.ts`, `blueprint.ts`, `batchQuestionIo.ts`, `paperImport.ts`, `studio.test.ts`, `package.json`, `syllabusImport.ts`, `m1-rbac-adversarial-stress.test.ts`, `diagram-rules.ts`, `schemas.ts`, `BlueprintImportModal.tsx`, `classes.ts`, `subpartsTotalMarks`, `BlueprintEditorPage`, `m1-rbac-adversarial-stress.test.ts`, `uploads/route.ts`, `diagram-search.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `gemini.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1282051282051282 - nodes in this community are weakly interconnected._
- **Why does `api()` connect `api` to `useToast`, `paperImport.ts`, `Modal`, `constants.ts`, `AIQuestionGeneratorModal.tsx`, `blueprints/page.tsx`, `BlueprintImportModal`, `syllabusImport.ts`, `BlueprintImportModal.tsx`, `classes/page.tsx`, `BlueprintEditorPage`, `QuestionForm.tsx`, `AppShell.tsx`, `QuestionView.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09898989898989899 - nodes in this community are weakly interconnected._