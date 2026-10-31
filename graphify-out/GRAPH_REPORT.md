# Graph Report - exam-paper-builder  (2026-10-31)

## Corpus Check
- 256 files · ~391,400 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1579 nodes · 5876 edges · 59 communities (55 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `44332966`
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
- toQuestionDto
- dto.ts
- syllabusImport.ts
- blueprints/page.tsx
- recordAudit
- time
- classes/route.ts
- vitest
- schemas.ts
- diagram-search.ts
- logic.test.ts
- QuestionImportModal
- classes/page.tsx
- render.ts
- devDependencies
- hitTest
- batchQuestionIo.ts
- blueprints/[id]/route.ts
- AppShell.tsx
- recordAudit
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
- ErrorBanner
- multiset.ts
- internalChoiceRules.ts
- HttpError
- eslint.config.mjs
- blueprintExport.ts
- seed-kindergarten.mjs
- papers/[id]/page.tsx
- README.md
- PaperBuilderPage
- AGENTS.md
- deploy.sh
- Interface Contracts
- QuestionForm.tsx
- export-docx/route.ts
- api
- gemini.ts
- isSubpartQuestionType
- MathText

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
10. `vitest` - 50 edges

## Surprising Connections (you probably didn't know these)
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `Architecture` --references--> `SessionUser`  [INFERRED]
  PROJECT.md → src/lib/api.ts
- `M2 (Section Enrollment & Print Logistics)` --references--> `toAcademicClassDto()`  [INFERRED]
  PROJECT.md → src/lib/classes.ts
- `M1 (RBAC & Ownership)` --references--> `toQuestionDto()`  [INFERRED]
  PROJECT.md → src/lib/dto.ts
- `Feature Inventory` --references--> `assertCanModifyPaper()`  [INFERRED]
  PROJECT.md → src/lib/papers.ts

## Import Cycles
- None detected.

## Communities (59 total, 4 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.07
Nodes (47): CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint(), numberGridPlugin, NumberGridPrint() (+39 more)

### Community 1 - "lib/types.ts"
Cohesion: 0.13
Nodes (21): PaperImplication, PrintDensity, calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics (+13 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.07
Nodes (48): POST, BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent(), PaperImportModal(), PaperImportModalProps, BlueprintImportData (+40 more)

### Community 3 - "body"
Cohesion: 0.08
Nodes (41): bcryptjs, zod, POST, auditSchema, POST, generateSchema, POST, improveSchema (+33 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.13
Nodes (13): name, private, version, @playwright/test, prisma, react-dom, tailwindcss, @tailwindcss/turbopack (+5 more)

### Community 7 - "toQuestionDto"
Cohesion: 0.13
Nodes (19): Feature Inventory, GET, bulkDeleteSchema, bulkRequestSchema, DELETE, legacyBulkSchema, modernBulkSchema, POST (+11 more)

### Community 8 - "dto.ts"
Cohesion: 0.16
Nodes (24): @prisma/client, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, NUMBERING_STYLES, PRINT_DENSITIES, QUESTION_TYPES (+16 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.11
Nodes (28): parseSchema, POST, POST, openBookDialog(), SyllabusImportModal(), handleAiScan(), handleImport(), STANDARD_CURRICULUM_PRESETS (+20 more)

### Community 10 - "blueprints/page.tsx"
Cohesion: 0.13
Nodes (26): BlueprintsPage(), remove(), subjectMatches(), emptyBook, Filter, AcademicRolloverModal(), handleSubmit(), AcademicRolloverModalProps (+18 more)

### Community 11 - "recordAudit"
Cohesion: 0.18
Nodes (26): POST, POST, GET, POST, POST, POST, DELETE, editableItem() (+18 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.27
Nodes (16): GET, POST, PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject(), normalizeAcademicSession() (+8 more)

### Community 14 - "vitest"
Cohesion: 0.29
Nodes (11): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+3 more)

### Community 15 - "schemas.ts"
Cohesion: 0.08
Nodes (28): AuditAction, MAX_OPTIONS, MIN_OPTIONS, addItemSchema, changePasswordSchema, classSectionInputSchema, classSubjectSchema, combineBooksSchema (+20 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.07
Nodes (34): Architecture, Code Layout, Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, prisma, UPLOAD_DIR, GET, POST (+26 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.11
Nodes (19): assert(), runServerChecks(), MultiSetGeneratorModal(), AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion (+11 more)

### Community 18 - "QuestionImportModal"
Cohesion: 0.50
Nodes (3): QuestionImportModal(), handleFileChange(), validateContent()

### Community 19 - "classes/page.tsx"
Cohesion: 0.14
Nodes (18): SectionRosterItem(), subjectMatches(), AIQuestionGeneratorModalProps, BlueprintImportModalProps, CombineBooksModalProps, EditableBook, EditableChapter, ImportFormat (+10 more)

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
Cohesion: 0.13
Nodes (30): RFC-4180, QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat, BatchParseOptions, ChapterResolver (+22 more)

### Community 24 - "blueprints/[id]/route.ts"
Cohesion: 0.21
Nodes (15): GET, PUT, POST, GET, POST, diagnosePaperImplications(), assertBlueprintValid(), blueprintInclude (+7 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.12
Nodes (20): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AcademicSessionSelectorProps, AppShell() (+12 more)

### Community 26 - "recordAudit"
Cohesion: 0.12
Nodes (18): server-only, POST, GET, POST, DELETE, PATCH, POST, POST (+10 more)

### Community 27 - "useToast"
Cohesion: 0.08
Nodes (36): lucide-react, react, QuestionExportModal(), QuestionsPage(), remove(), AIPaperAuditModalProps, AIQuestionGeneratorModal(), GeneratedQuestionPayload (+28 more)

### Community 28 - "constants.ts"
Cohesion: 0.08
Nodes (33): nextConfig, next, ExamCellPage(), getSectionsForClass(), Tab, BlueprintTemplateModal(), BlueprintTemplateModalProps, AcademicSession (+25 more)

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
Cohesion: 0.16
Nodes (16): handleImportedBlueprint(), blueprintTotalMarks(), ChapterQuota, checkBlueprintFeasibility(), DiagnosticItem, flattenSectionGroups(), getItemMarks(), getItemUnits() (+8 more)

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
Cohesion: 0.21
Nodes (8): POST, getEffectiveQuestionMarks(), ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "ErrorBanner"
Cohesion: 0.19
Nodes (20): UsersAdminPage(), DashboardPage(), Data, PaperRow(), Progress(), ErrorBanner(), ListSkeleton(), Skeleton() (+12 more)

### Community 40 - "multiset.ts"
Cohesion: 0.16
Nodes (19): duplicateSetSchema, POST, parallelSetsSchema, POST, BlueprintSectionDef, calculateSectionOverlap(), CandidateQuestionDef, formatSetIdentifier() (+11 more)

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.10
Nodes (27): BoardRuleConflictResult, detectBoardRuleConflict(), detectExaminationBoard(), evaluatePaperInternalChoiceCompliance(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId, getBoardDefaultChoiceRequirement() (+19 more)

### Community 42 - "HttpError"
Cohesion: 0.16
Nodes (14): DELETE, POST, DELETE, GET, PATCH, DELETE, PATCH, GET (+6 more)

### Community 43 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 44 - "blueprintExport.ts"
Cohesion: 0.40
Nodes (9): BlueprintJsonModal(), BlueprintJsonModalProps, groupSectionsFromFlat(), BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson (+1 more)

### Community 46 - "papers/[id]/page.tsx"
Cohesion: 0.11
Nodes (36): AIPaperGeneratorModal(), AIPaperGeneratorModalProps, PaperPreflightModal(), PaperPreflightModalProps, PaperSnapshotDrawerProps, QuestionPicker(), add(), handleAcceptAiQuestion() (+28 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "PaperBuilderPage"
Cohesion: 0.12
Nodes (6): Bar(), PaperBuilderPage(), handleAutofill(), AIPaperAuditModal(), handleApplyAllFixes(), handleApplyFix()

### Community 54 - "Interface Contracts"
Cohesion: 0.50
Nodes (4): Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), SectionDetail

### Community 55 - "QuestionForm.tsx"
Cohesion: 0.12
Nodes (21): AIQuestionImproverModal(), DiagramSearchModal(), DiagramSearchModalProps, DEFAULT_ASSERTION_OPTIONS_EN, DEFAULT_ASSERTION_OPTIONS_HI, DEFAULT_SPACE, getDefaultSubpartsForType(), getSubpartLabel() (+13 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.10
Nodes (43): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), OmrSheetPage(), PrintPage() (+35 more)

### Community 57 - "api"
Cohesion: 0.14
Nodes (22): BooksPage(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage(), addMissingStandardSubjects() (+14 more)

### Community 58 - "gemini.ts"
Cohesion: 0.05
Nodes (84): GET, openCreate(), ParsedQuestionItem, derangeMatchColumnPairs(), extractMatchPairsFromExplanation(), QuestionType, splitOutsideMath(), buildAndValidateGenerationContract() (+76 more)

### Community 59 - "isSubpartQuestionType"
Cohesion: 0.29
Nodes (15): getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), LETTERS_LIST, QuestionRenderMode, QuestionView(), ROMAN_LOWER, SingleQuestionBody() (+7 more)

### Community 61 - "MathText"
Cohesion: 0.18
Nodes (11): MathText(), MathCategory, MathSnippet, MathToolbar(), SNIPPETS, COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset (+3 more)

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 418 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `BlueprintEditorPage`, `paperImport.ts`, `ErrorBanner`, `isSubpartQuestionType`, `blueprints/page.tsx`, `syllabusImport.ts`, `papers/[id]/page.tsx`, `PaperBuilderPage`, `classes/page.tsx`, `QuestionForm.tsx`, `export-docx/route.ts`, `AppShell.tsx`, `useToast`, `constants.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0670807453416149 - nodes in this community are weakly interconnected._
- **Why does `react` connect `useToast` to `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `ErrorBanner`, `blueprints/page.tsx`, `blueprintExport.ts`, `papers/[id]/page.tsx`, `classes/page.tsx`, `QuestionForm.tsx`, `export-docx/route.ts`, `AppShell.tsx`, `isSubpartQuestionType`, `constants.ts`, `MathText`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `lib/types.ts`, `paperImport.ts`, `body`, `package.json`, `dto.ts`, `syllabusImport.ts`, `recordAudit`, `classes/route.ts`, `schemas.ts`, `diagram-search.ts`, `logic.test.ts`, `batchQuestionIo.ts`, `constants.ts`, `blueprint.ts`, `reconcileBlueprint.ts`, `studio.test.ts`, `multiset.ts`, `papers/[id]/page.tsx`, `QuestionForm.tsx`, `export-docx/route.ts`, `gemini.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06758832565284179 - nodes in this community are weakly interconnected._