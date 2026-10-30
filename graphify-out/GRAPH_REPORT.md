# Graph Report - exam-paper-builder  (2026-10-30)

## Corpus Check
- 253 files · ~378,790 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1536 nodes · 5703 edges · 61 communities (56 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed710da0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- lib/types.ts
- paperImport.ts
- recordAudit
- FigureStudio.tsx
- geometry.ts
- package.json
- body
- dto.ts
- syllabusImport.ts
- print-logistics.ts
- recordAudit
- time
- classes/route.ts
- vitest
- blueprintImport.ts
- diagram-search.ts
- logic.test.ts
- m1-rbac-adversarial-stress.test.ts
- react
- render.ts
- devDependencies
- hitTest
- batchQuestionIo.ts
- blueprints/[id]/route.ts
- AppShell.tsx
- session.ts
- useToast
- constants.ts
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
- toQuestionDto
- PaperSheets.tsx
- paperAutogen.ts
- HttpError
- questionValidator.ts
- blueprintExport.ts
- math.ts
- solutions/page.tsx
- Modal
- BlueprintImportModal
- README.md
- schemas.ts
- AGENTS.md
- deploy.sh
- PaperImportModal
- papers/[id]/page.tsx
- export-docx/route.ts
- api
- gemini.ts
- seed-kindergarten.mjs
- eslint.config.mjs

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 133 edges
2. `body()` - 85 edges
3. `api()` - 84 edges
4. `recordAudit()` - 73 edges
5. `route()` - 68 edges
6. `prisma` - 68 edges
7. `Modal()` - 60 edges
8. `react` - 59 edges
9. `loadPaperView()` - 55 edges
10. `lucide-react` - 49 edges

## Surprising Connections (you probably didn't know these)
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `M2 (Section Enrollment & Print Logistics)` --references--> `toAcademicClassDto()`  [INFERRED]
  PROJECT.md → src/lib/classes.ts
- `M1 (RBAC & Ownership)` --references--> `toQuestionDto()`  [INFERRED]
  PROJECT.md → src/lib/dto.ts
- `Feature Inventory` --references--> `assertCanModifyPaper()`  [INFERRED]
  PROJECT.md → src/lib/papers.ts
- `Feature Inventory` --references--> `assertCanModifyQuestion()`  [INFERRED]
  PROJECT.md → src/lib/papers.ts

## Import Cycles
- None detected.

## Communities (61 total, 5 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.06
Nodes (53): attach(), submit(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin (+45 more)

### Community 1 - "lib/types.ts"
Cohesion: 0.11
Nodes (24): Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), getSectionsForClass(), Tab, PrintDensity, SessionSlot, TimetableStatus (+16 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.15
Nodes (26): POST, inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion, ImportedPaperSection, ImportedPaperSubpart (+18 more)

### Community 3 - "recordAudit"
Cohesion: 0.11
Nodes (27): GET, POST, DELETE, PATCH, GET, POST, GET, PATCH (+19 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.13
Nodes (13): name, private, version, @playwright/test, prisma, react-dom, tailwindcss, @tailwindcss/turbopack (+5 more)

### Community 7 - "body"
Cohesion: 0.13
Nodes (17): zod, generateSchema, POST, improveSchema, POST, parseBlueprintSchema, POST, figureSchema (+9 more)

### Community 8 - "dto.ts"
Cohesion: 0.15
Nodes (25): @prisma/client, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, NUMBERING_STYLES, PRINT_DENSITIES, QUESTION_TYPES (+17 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.08
Nodes (38): parseSchema, POST, POST, openBookDialog(), EditableChapter, SyllabusImportModal(), handleAiScan(), handleImport() (+30 more)

### Community 10 - "print-logistics.ts"
Cohesion: 0.44
Nodes (7): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip

### Community 11 - "recordAudit"
Cohesion: 0.15
Nodes (30): auditSchema, POST, POST, GET, POST, POST, POST, POST (+22 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.35
Nodes (14): PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject(), normalizeAcademicSession(), normalizeSectionDetails(), syncClassesFromBooks() (+6 more)

### Community 14 - "vitest"
Cohesion: 0.27
Nodes (13): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+5 more)

### Community 15 - "blueprintImport.ts"
Cohesion: 0.23
Nodes (15): BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, matchChaptersToBook(), normalizeExamType(), normalizeQuestionType(), parseBlueprintImport() (+7 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.10
Nodes (23): prisma, UPLOAD_DIR, GET, POST, GET, TYPE_BY_EXT, EXT_BY_TYPE, POST (+15 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.22
Nodes (11): autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot, BlueprintDef (+3 more)

### Community 18 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.15
Nodes (17): POST, POST, DELETE, DELETE, PATCH, updateSubjectSchema, GET, POST (+9 more)

### Community 19 - "react"
Cohesion: 0.10
Nodes (35): nextConfig, lucide-react, next, react, Filter, AIBlueprintModalProps, ChapterDraft, SectionDraft (+27 more)

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
Cohesion: 0.07
Nodes (52): RFC-4180, QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat, BatchParseOptions, ChapterResolver (+44 more)

### Community 24 - "blueprints/[id]/route.ts"
Cohesion: 0.25
Nodes (11): DELETE, GET, PUT, POST, GET, POST, diagnosePaperImplications(), assertBlueprintValid() (+3 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.10
Nodes (24): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AcademicSessionSelectorProps, AppShell() (+16 more)

### Community 26 - "session.ts"
Cohesion: 0.14
Nodes (20): Architecture, Code Layout, Feature Inventory, Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, bcryptjs, server-only, POST (+12 more)

### Community 27 - "useToast"
Cohesion: 0.08
Nodes (26): QuestionExportModal(), QuestionsPage(), remove(), AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, BlueprintImportModalProps (+18 more)

### Community 28 - "constants.ts"
Cohesion: 0.08
Nodes (24): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL, MatchColumnPair, MAX_OPTIONS, MIN_OPTIONS, NUMBERING_STYLE_LABEL (+16 more)

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
Cohesion: 0.18
Nodes (15): handleImportedBlueprint(), blueprintTotalMarks(), ChapterQuota, DiagnosticItem, flattenSectionGroups(), getItemMarks(), getItemUnits(), groupSectionsFromFlat() (+7 more)

### Community 33 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, seed, start, test, test:e2e

### Community 34 - "BlueprintEditorPage"
Cohesion: 0.17
Nodes (10): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), moveSectionGroup(), removeSectionGroup(), save(), newQuestionType(), newSectionGroup() (+2 more)

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

### Community 39 - "toQuestionDto"
Cohesion: 0.31
Nodes (7): POST, GET, GET, GET, include, POST, toQuestionDto()

### Community 40 - "PaperSheets.tsx"
Cohesion: 0.12
Nodes (24): assert(), runServerChecks(), PrintPage(), BlankPage(), Block, extractSectionLetter(), Page(), PaperSheets() (+16 more)

### Community 41 - "paperAutogen.ts"
Cohesion: 0.40
Nodes (4): PaperAutogenInput, PaperAutogenPlan, PaperAutogenSectionPlan, PaperAutogenSlot

### Community 42 - "HttpError"
Cohesion: 0.12
Nodes (20): GET, GET, POST, DELETE, GET, PATCH, DELETE, PATCH (+12 more)

### Community 43 - "questionValidator.ts"
Cohesion: 0.20
Nodes (12): GenerationContract, GeminiCallResult, GenerationJobTrace, getRecentGenerationTraces(), recentTraces, BIOLOGY_CONTAMINATION_PATTERNS, checkDeletedSyllabusTopics(), CHEMISTRY_TEMPLATE_PATTERNS (+4 more)

### Community 44 - "blueprintExport.ts"
Cohesion: 0.44
Nodes (8): BlueprintJsonModal(), BlueprintJsonModalProps, BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson, getBlueprintJsonFilename()

### Community 45 - "math.ts"
Cohesion: 0.13
Nodes (26): add(), handleAcceptAiQuestion(), handleEditAiQuestion(), SectionAiModal(), handleCommit(), cleanMatchItem(), extractColumnIIItems(), extractColumnIItems() (+18 more)

### Community 46 - "solutions/page.tsx"
Cohesion: 0.21
Nodes (22): OmrSheetPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), DiagramSearchModalProps, LETTERS_LIST, QuestionRenderMode, ROMAN_LOWER (+14 more)

### Community 47 - "Modal"
Cohesion: 0.10
Nodes (24): UsersAdminPage(), MultiSetGeneratorModal(), QuestionImportModal(), handleFileChange(), validateContent(), AIPaperGeneratorModal(), ConfirmContext, ConfirmOptions (+16 more)

### Community 48 - "BlueprintImportModal"
Cohesion: 0.47
Nodes (4): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent()

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "schemas.ts"
Cohesion: 0.08
Nodes (25): GET, POST, AuditAction, addItemSchema, bookSchema, changePasswordSchema, classSectionInputSchema, classSubjectSchema (+17 more)

### Community 55 - "papers/[id]/page.tsx"
Cohesion: 0.06
Nodes (34): Bar(), PaperBuilderPage(), handleAutofill(), AIPaperAuditModal(), handleApplyAllFixes(), handleApplyFix(), AIPaperAuditModalProps, AIQuestionImproverModal() (+26 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.23
Nodes (20): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), buildBlocks(), cleanQuestionStatement() (+12 more)

### Community 57 - "api"
Cohesion: 0.10
Nodes (51): BlueprintsPage(), remove(), subjectMatches(), BooksPage(), removeBook(), removeChapter(), run(), saveBook() (+43 more)

### Community 58 - "gemini.ts"
Cohesion: 0.09
Nodes (47): GET, openCreate(), derangeMatchColumnPairs(), buildAndValidateGenerationContract(), CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, CLASS_12_MATH_CHAPTER_SPECS (+39 more)

### Community 60 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 410 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `kindergarten/types.ts`, `lib/types.ts`, `FigureStudio.tsx`, `package.json`, `PaperSheets.tsx`, `blueprintExport.ts`, `solutions/page.tsx`, `Modal`, `papers/[id]/page.tsx`, `api`, `useToast`, `AppShell.tsx`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06015037593984962 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `kindergarten/types.ts`, `paperImport.ts`, `recordAudit`, `package.json`, `dto.ts`, `syllabusImport.ts`, `print-logistics.ts`, `recordAudit`, `classes/route.ts`, `blueprintImport.ts`, `diagram-search.ts`, `logic.test.ts`, `m1-rbac-adversarial-stress.test.ts`, `react`, `batchQuestionIo.ts`, `blueprint.ts`, `reconcileBlueprint.ts`, `studio.test.ts`, `paperAutogen.ts`, `math.ts`, `schemas.ts`, `export-docx/route.ts`, `gemini.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._
- **Why does `HttpError` connect `HttpError` to `paperImport.ts`, `recordAudit`, `export-docx/route.ts`, `body`, `toQuestionDto`, `syllabusImport.ts`, `recordAudit`, `classes/route.ts`, `diagram-search.ts`, `m1-rbac-adversarial-stress.test.ts`, `blueprints/[id]/route.ts`, `session.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `recordAudit` be split into smaller, more focused modules?**
  _Cohesion score 0.1147086031452359 - nodes in this community are weakly interconnected._