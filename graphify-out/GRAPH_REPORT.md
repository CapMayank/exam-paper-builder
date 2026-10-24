# Graph Report - exam-paper-builder  (2026-10-24)

## Corpus Check
- 242 files · ~343,606 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1461 nodes · 5279 edges · 55 communities (51 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `65d8b4fa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- diagram-search.ts
- paperImport.ts
- batchQuestionIo.ts
- FigureStudio.tsx
- geometry.ts
- package.json
- QuestionForm.tsx
- dto.ts
- syllabusImport.ts
- vitest
- prisma.ts
- time
- classes/route.ts
- blueprints/[id]/page.tsx
- QuestionImportModal
- gemini.ts
- lib/types.ts
- body
- ui.tsx
- render.ts
- devDependencies
- hitTest
- papers/[id]/page.tsx
- api
- AppShell.tsx
- print-logistics.ts
- books/page.tsx
- PaperSheets.tsx
- compilerOptions
- dependencies
- app/layout.tsx
- subpartsTotalMarks
- scripts
- paperAutogen.ts
- e2e.mjs
- api.ts
- studio.test.ts
- text.ts
- SubjectWorkspaceDrawer.tsx
- diagram-rules.ts
- PaperBuilderPage
- math.ts
- recordAudit
- HttpError
- constants.ts
- eslint.config.mjs
- README.md
- toQuestionDto
- AGENTS.md
- deploy.sh
- Modal
- parseMatchColumnPairs
- seed-kindergarten.mjs

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 129 edges
2. `api()` - 86 edges
3. `body()` - 82 edges
4. `recordAudit()` - 70 edges
5. `route()` - 67 edges
6. `prisma` - 65 edges
7. `Modal()` - 60 edges
8. `react` - 59 edges
9. `loadPaperView()` - 55 edges
10. `lucide-react` - 49 edges

## Surprising Connections (you probably didn't know these)
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `Architecture` --references--> `SessionUser`  [INFERRED]
  PROJECT.md → src/lib/api.ts
- `M2 (Section Enrollment & Print Logistics)` --references--> `toAcademicClassDto()`  [INFERRED]
  PROJECT.md → src/lib/classes.ts
- `M1 (RBAC & Ownership)` --references--> `toQuestionDto()`  [INFERRED]
  PROJECT.md → src/lib/dto.ts
- `Feature Inventory` --references--> `assertCanModifyQuestion()`  [INFERRED]
  PROJECT.md → src/lib/papers.ts

## Import Cycles
- None detected.

## Communities (55 total, 4 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.06
Nodes (50): attach(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint() (+42 more)

### Community 1 - "diagram-search.ts"
Cohesion: 0.07
Nodes (34): Architecture, Code Layout, Interface Contracts, M1 (RBAC & Ownership), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, prisma, UPLOAD_DIR (+26 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.14
Nodes (30): POST, AIBlueprintModalProps, PaperImportModalProps, inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion (+22 more)

### Community 3 - "batchQuestionIo.ts"
Cohesion: 0.07
Nodes (49): RFC-4180, BlueprintTemplateModalProps, BatchImportError, BatchImportOptions, BatchIoFormat, BatchParseOptions, ChapterResolver, DuplicateRecord (+41 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, version, prisma, react-dom, tailwindcss, @tailwindcss/turbopack, @types/katex (+4 more)

### Community 7 - "QuestionForm.tsx"
Cohesion: 0.11
Nodes (31): QuestionExportModal(), QuestionsPage(), DiagramSearchModal(), QuestionDuplicateModalProps, DEFAULT_ASSERTION_OPTIONS_EN, DEFAULT_ASSERTION_OPTIONS_HI, DEFAULT_SPACE, getDefaultSubpartsForType() (+23 more)

### Community 8 - "dto.ts"
Cohesion: 0.14
Nodes (26): @prisma/client, DEFAULT_ACADEMIC_SESSION, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, MarksStyle, NUMBERING_STYLES (+18 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.09
Nodes (39): parseSchema, POST, POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON (+31 more)

### Community 10 - "vitest"
Cohesion: 0.27
Nodes (13): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+5 more)

### Community 11 - "prisma.ts"
Cohesion: 0.11
Nodes (38): Feature Inventory, auditSchema, POST, POST, POST, GET, POST, POST (+30 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.14
Nodes (29): POST, GET, POST, PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject() (+21 more)

### Community 14 - "blueprints/[id]/page.tsx"
Cohesion: 0.07
Nodes (52): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleImportedBlueprint(), moveSectionGroup(), removeSectionGroup(), newQuestionType(), newSectionGroup() (+44 more)

### Community 15 - "QuestionImportModal"
Cohesion: 0.50
Nodes (3): QuestionImportModal(), handleFileChange(), validateContent()

### Community 16 - "gemini.ts"
Cohesion: 0.13
Nodes (21): improveSchema, POST, GET, auditPaperWithGemini(), callGeminiApi(), FigureStudioPromptResult, GeminiCallResult, GeminiContentPart (+13 more)

### Community 17 - "lib/types.ts"
Cohesion: 0.12
Nodes (20): Tab, PaperImplication, Layout, SESSION_SLOT_LABEL, SESSION_SLOTS, SessionSlot, TIMETABLE_STATUS_LABEL, TIMETABLE_STATUSES (+12 more)

### Community 18 - "body"
Cohesion: 0.08
Nodes (37): zod, generateSchema, POST, parseBlueprintSchema, POST, figureSchema, POST, GET (+29 more)

### Community 19 - "ui.tsx"
Cohesion: 0.13
Nodes (20): UsersAdminPage(), ConfirmContext, ConfirmOptions, ErrorBanner(), FALLBACK_TOAST, lockScroll(), modalStack, SuccessBanner() (+12 more)

### Community 20 - "render.ts"
Cohesion: 0.19
Nodes (24): FigureStudio(), hasBoxFields(), angleGeom, boxCenter(), boxCorners(), boxHandlePos(), hatchGeometry(), applyStyle() (+16 more)

### Community 21 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/turbopack, @types/katex, @types/node (+4 more)

### Community 22 - "hitTest"
Cohesion: 0.13
Nodes (24): axesLayout(), boxToWorld(), clamp(), constrainAngle(), deg(), dist(), distToPolyline(), distToSeg() (+16 more)

### Community 23 - "papers/[id]/page.tsx"
Cohesion: 0.14
Nodes (21): nextConfig, lucide-react, next, react, Filter, AcademicSessionSelectorProps, AIBlueprintModal(), ChapterDraft (+13 more)

### Community 24 - "api"
Cohesion: 0.09
Nodes (36): save(), BooksPage(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage() (+28 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.11
Nodes (21): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), AppShell(), signOut(), isActive() (+13 more)

### Community 26 - "print-logistics.ts"
Cohesion: 0.32
Nodes (10): M2 (Section Enrollment & Print Logistics), calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip (+2 more)

### Community 27 - "books/page.tsx"
Cohesion: 0.17
Nodes (20): BlueprintsPage(), remove(), subjectMatches(), emptyBook, ExamCellPage(), getSectionsForClass(), DashboardPage(), Data (+12 more)

### Community 28 - "PaperSheets.tsx"
Cohesion: 0.07
Nodes (48): assert(), runServerChecks(), OmrSheetPage(), PrintPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), AIPaperGeneratorModalProps (+40 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, docx, katex, lucide-react, next, @prisma/client, react (+3 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "subpartsTotalMarks"
Cohesion: 0.22
Nodes (7): getEffectiveQuestionMarks(), ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 33 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, seed, start, test

### Community 34 - "paperAutogen.ts"
Cohesion: 0.38
Nodes (5): PaperAutogenInput, PaperAutogenPlan, PaperAutogenSectionPlan, PaperAutogenSlot, planPaperSlotAssignments()

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

### Community 39 - "SubjectWorkspaceDrawer.tsx"
Cohesion: 0.43
Nodes (5): COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS, SubjectWorkspaceDrawerProps

### Community 40 - "diagram-rules.ts"
Cohesion: 0.70
Nodes (3): getMaxPaperDiagramBudget(), isSectionVisuallyEligible(), isSubjectChapterVisual()

### Community 41 - "PaperBuilderPage"
Cohesion: 0.08
Nodes (8): Bar(), MultiSetGeneratorModal(), PaperBuilderPage(), handleAutofill(), PaperImportModal(), PaperSnapshotDrawer(), SnapshotItem, useConfirm()

### Community 42 - "math.ts"
Cohesion: 0.15
Nodes (25): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), formatQuestionNumber(), DocxTextStyle (+17 more)

### Community 43 - "recordAudit"
Cohesion: 0.15
Nodes (23): bcryptjs, server-only, POST, GET, PATCH, DELETE, PATCH, POST (+15 more)

### Community 44 - "HttpError"
Cohesion: 0.11
Nodes (22): POST, codeMatches(), POST, DELETE, GET, PATCH, DELETE, PATCH (+14 more)

### Community 45 - "constants.ts"
Cohesion: 0.11
Nodes (17): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL, MatchColumnPair, MAX_OPTIONS, MIN_OPTIONS, NUMBERING_STYLE_LABEL (+9 more)

### Community 46 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "toQuestionDto"
Cohesion: 0.19
Nodes (11): bulkRequestSchema, legacyBulkSchema, modernBulkSchema, POST, GET, GET, GET, include (+3 more)

### Community 54 - "Modal"
Cohesion: 0.10
Nodes (26): AIPaperAuditModal(), AIPaperAuditModalProps, AIPaperGeneratorModal(), AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, AIQuestionImproverModal() (+18 more)

### Community 55 - "parseMatchColumnPairs"
Cohesion: 0.18
Nodes (23): QuestionPicker(), add(), handleAcceptAiQuestion(), handleEditAiQuestion(), SectionAiModal(), handleCommit(), SectionAiModalProps, cleanMatchItem() (+15 more)

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 381 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `QuestionForm.tsx`, `SubjectWorkspaceDrawer.tsx`, `PaperBuilderPage`, `syllabusImport.ts`, `blueprints/[id]/page.tsx`, `lib/types.ts`, `ui.tsx`, `Modal`, `parseMatchColumnPairs`, `api`, `AppShell.tsx`, `books/page.tsx`, `PaperSheets.tsx`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06354642313546423 - nodes in this community are weakly interconnected._
- **Why does `api()` connect `api` to `QuestionForm.tsx`, `PaperBuilderPage`, `syllabusImport.ts`, `blueprints/[id]/page.tsx`, `lib/types.ts`, `ui.tsx`, `parseMatchColumnPairs`, `Modal`, `papers/[id]/page.tsx`, `AppShell.tsx`, `books/page.tsx`, `PaperSheets.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `diagram-search.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06745098039215686 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `QuestionForm.tsx`, `SubjectWorkspaceDrawer.tsx`, `PaperBuilderPage`, `vitest`, `syllabusImport.ts`, `blueprints/[id]/page.tsx`, `lib/types.ts`, `ui.tsx`, `Modal`, `parseMatchColumnPairs`, `api`, `AppShell.tsx`, `books/page.tsx`, `PaperSheets.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14453781512605043 - nodes in this community are weakly interconnected._