# Graph Report - exam-paper-builder  (2026-10-31)

## Corpus Check
- 255 files · ~387,794 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1565 nodes · 5823 edges · 65 communities (62 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3c733b26`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- print-logistics.ts
- paperImport.ts
- api.ts
- FigureStudio.tsx
- geometry.ts
- package.json
- body
- dto.ts
- syllabusImport.ts
- blueprints/page.tsx
- recordAudit
- time
- classes/route.ts
- vitest
- blueprintImport.ts
- diagram-search.ts
- logic.test.ts
- QuestionImportModal
- react
- render.ts
- devDependencies
- FigureStudio
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
- Modal
- (app)/page.tsx
- internalChoiceRules.ts
- HttpError
- PaperData
- blueprintExport.ts
- math.ts
- papers/[id]/page.tsx
- curriculumContract.ts
- BlueprintImportModal
- README.md
- PaperBuilderPage
- AGENTS.md
- deploy.sh
- Project: Sarvodaya School Examination Portal — Production Business Logic
- QuestionForm.tsx
- export-docx/route.ts
- api
- gemini.ts
- cleanOptionText
- mpbse-class12-math-regression.test.ts
- SubjectWorkspaceDrawer.tsx
- generationObservability.ts
- generateCurriculumGroundedSectionQuestions
- mandatory-workflows.spec.ts

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
- `Feature Inventory` --references--> `assertCanModifyPaper()`  [INFERRED]
  PROJECT.md → src/lib/papers.ts

## Import Cycles
- None detected.

## Communities (65 total, 3 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.07
Nodes (47): CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint(), numberGridPlugin, NumberGridPrint() (+39 more)

### Community 1 - "print-logistics.ts"
Cohesion: 0.33
Nodes (9): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, ClassSectionInput (+1 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.11
Nodes (31): POST, AIBlueprintModalProps, PaperImportModal(), PaperImportModalProps, inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier() (+23 more)

### Community 3 - "api.ts"
Cohesion: 0.11
Nodes (26): server-only, zod, auditSchema, improveSchema, parseBlueprintSchema, parseSchema, figureSchema, GET (+18 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (52): AlignMode, angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), axesLayout(), boundsCache (+44 more)

### Community 6 - "package.json"
Cohesion: 0.12
Nodes (15): eslintConfig, name, private, version, eslint, eslint-config-next, prisma, react-dom (+7 more)

### Community 7 - "body"
Cohesion: 0.10
Nodes (35): Feature Inventory, generateSchema, POST, POST, POST, POST, POST, POST (+27 more)

### Community 8 - "dto.ts"
Cohesion: 0.07
Nodes (51): @prisma/client, prisma, AuditAction, DEFAULT_ACADEMIC_SESSION, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES (+43 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.09
Nodes (38): POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON, SyllabusImportModal(), handleAiScan() (+30 more)

### Community 10 - "blueprints/page.tsx"
Cohesion: 0.12
Nodes (28): BlueprintsPage(), subjectMatches(), emptyBook, Filter, PapersPage(), handleBatchDelete(), handleBatchFinalize(), remove() (+20 more)

### Community 11 - "recordAudit"
Cohesion: 0.15
Nodes (32): POST, POST, POST, GET, POST, POST, POST, POST (+24 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.25
Nodes (17): POST, GET, POST, PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject() (+9 more)

### Community 14 - "vitest"
Cohesion: 0.12
Nodes (27): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+19 more)

### Community 15 - "blueprintImport.ts"
Cohesion: 0.24
Nodes (14): BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, normalizeExamType(), normalizeQuestionType(), parseBlueprintImport(), parseCsvBlueprint() (+6 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.11
Nodes (21): prisma, UPLOAD_DIR, GET, POST, GET, TYPE_BY_EXT, EXT_BY_TYPE, POST (+13 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.24
Nodes (9): autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot, BlueprintDef (+1 more)

### Community 18 - "QuestionImportModal"
Cohesion: 0.50
Nodes (3): QuestionImportModal(), handleFileChange(), validateContent()

### Community 19 - "react"
Cohesion: 0.12
Nodes (22): nextConfig, lucide-react, next, react, PrintPage(), ChapterDraft, SectionDraft, AIPaperAuditModalProps (+14 more)

### Community 20 - "render.ts"
Cohesion: 0.22
Nodes (20): boxCenter(), boxCorners(), hatchGeometry(), applyStyle(), drawArrowhead(), drawParallelMarks(), drawTicks(), renderAngle() (+12 more)

### Community 21 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, @playwright/test, prisma, tailwindcss, @tailwindcss/turbopack, @types/katex (+5 more)

### Community 22 - "FigureStudio"
Cohesion: 0.14
Nodes (21): FigureStudio(), hasBoxFields(), alignObjects(), angleGeom, boxHandlePos(), contentBounds(), deg(), distributeObjects() (+13 more)

### Community 23 - "batchQuestionIo.ts"
Cohesion: 0.08
Nodes (46): RFC-4180, GET, QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat, BatchParseOptions (+38 more)

### Community 24 - "blueprints/[id]/route.ts"
Cohesion: 0.25
Nodes (11): DELETE, GET, PUT, POST, GET, POST, diagnosePaperImplications(), assertBlueprintValid() (+3 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.14
Nodes (17): AppLayout(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AcademicSessionSelectorProps, AppShell(), signOut(), isActive() (+9 more)

### Community 26 - "session.ts"
Cohesion: 0.24
Nodes (11): POST, POST, codeMatches(), POST, endSession(), parseRawSessionCookie(), secret(), sessionUserId() (+3 more)

### Community 27 - "useToast"
Cohesion: 0.09
Nodes (20): QuestionExportModal(), QuestionsPage(), remove(), AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, AIQuestionImproverModal() (+12 more)

### Community 28 - "constants.ts"
Cohesion: 0.05
Nodes (45): assert(), runServerChecks(), MultiSetGeneratorModal(), DEFAULT_SPACE, parseBulkQuestions(), ParsedQuestionItem, AcademicSession, DerangedMatchColumnResult (+37 more)

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
Nodes (14): GET, blueprintTotalMarks(), ChapterQuota, checkBlueprintFeasibility(), DiagnosticItem, getItemMarks(), getItemUnits(), PaperImplication (+6 more)

### Community 33 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, seed, start, test, test:e2e

### Community 34 - "BlueprintEditorPage"
Cohesion: 0.14
Nodes (13): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleImportedBlueprint(), moveSectionGroup(), removeSectionGroup(), save(), newQuestionType() (+5 more)

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "reconcileBlueprint.ts"
Cohesion: 0.22
Nodes (6): ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 37 - "studio.test.ts"
Cohesion: 0.20
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "Modal"
Cohesion: 0.12
Nodes (29): UsersAdminPage(), ExamCellPage(), getSectionsForClass(), Tab, MathCategory, MathSnippet, SNIPPETS, ConfirmContext (+21 more)

### Community 40 - "(app)/page.tsx"
Cohesion: 0.23
Nodes (13): remove(), DashboardPage(), Data, LoginPage(), submit(), BrandMark(), PaperRow(), Progress() (+5 more)

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.13
Nodes (20): detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId, InternalChoiceIssue, InternalChoicePolicy, InternalChoiceResolutionContext, isLegacy2025Session() (+12 more)

### Community 42 - "HttpError"
Cohesion: 0.09
Nodes (30): bcryptjs, GET, POST, DELETE, GET, PATCH, POST, DELETE (+22 more)

### Community 43 - "PaperData"
Cohesion: 0.16
Nodes (15): AIPaperGeneratorModalProps, PaperPreflightModal(), PaperPreflightModalProps, PaperSnapshotDrawerProps, handleGenerateAiQuestion(), evaluatePaperInternalChoiceCompliance(), resolveInternalChoiceRequirement(), PaperAutogenInput (+7 more)

### Community 44 - "blueprintExport.ts"
Cohesion: 0.44
Nodes (8): BlueprintJsonModal(), BlueprintJsonModalProps, BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson, getBlueprintJsonFilename()

### Community 45 - "math.ts"
Cohesion: 0.21
Nodes (15): splitOutsideMath(), cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX (+7 more)

### Community 46 - "papers/[id]/page.tsx"
Cohesion: 0.18
Nodes (28): AIPaperGeneratorModal(), MathText(), QuestionPicker(), add(), handleAcceptAiQuestion(), handleEditAiQuestion(), LETTERS_LIST, QuestionRenderMode (+20 more)

### Community 47 - "curriculumContract.ts"
Cohesion: 0.15
Nodes (16): buildAndValidateGenerationContract(), CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, CLASS_12_MATH_CHAPTER_SPECS, cleanChapterTitleForLookup(), detectEducationBoard(), GenerationContractValidationResult (+8 more)

### Community 48 - "BlueprintImportModal"
Cohesion: 0.38
Nodes (5): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent(), matchChaptersToBook()

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "PaperBuilderPage"
Cohesion: 0.15
Nodes (3): Bar(), PaperBuilderPage(), handleAutofill()

### Community 54 - "Project: Sarvodaya School Examination Portal — Production Business Logic"
Cohesion: 0.22
Nodes (8): Architecture, Code Layout, Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, SectionDetail

### Community 55 - "QuestionForm.tsx"
Cohesion: 0.11
Nodes (22): DiagramSearchModal(), DiagramSearchModalProps, MathToolbar(), DEFAULT_ASSERTION_OPTIONS_EN, DEFAULT_ASSERTION_OPTIONS_HI, DEFAULT_SPACE, getDefaultSubpartsForType(), getSubpartLabel() (+14 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.16
Nodes (29): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), openCreate(), BlankPage() (+21 more)

### Community 57 - "api"
Cohesion: 0.14
Nodes (23): BooksPage(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage(), addMissingStandardSubjects() (+15 more)

### Community 58 - "gemini.ts"
Cohesion: 0.14
Nodes (26): GET, derangeMatchColumnPairs(), extractMatchPairsFromExplanation(), auditPaperWithGemini(), callGeminiApi(), FigureStudioPromptResult, GeminiContentPart, GeneratedQuestionItem (+18 more)

### Community 59 - "cleanOptionText"
Cohesion: 0.44
Nodes (11): OmrSheetPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), imageUrl(), cleanOptionText(), isMcqLikeType(), normalizeMcqAnswer() (+3 more)

### Community 60 - "mpbse-class12-math-regression.test.ts"
Cohesion: 0.27
Nodes (10): isParaphraseOrDuplicateChoice(), BIOLOGY_CONTAMINATION_PATTERNS, checkDeletedSyllabusTopics(), CHEMISTRY_TEMPLATE_PATTERNS, doesMcqAnswerMatchOptions(), GENERIC_TEMPLATE_PATTERNS, QuestionValidationResult, SectionValidationResult (+2 more)

### Community 61 - "SubjectWorkspaceDrawer.tsx"
Cohesion: 0.43
Nodes (5): COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS, SubjectWorkspaceDrawerProps

### Community 62 - "generationObservability.ts"
Cohesion: 0.43
Nodes (6): GenerationContract, GeminiCallResult, GenerationJobTrace, getRecentGenerationTraces(), recentTraces, QuestionValidationIssue

### Community 63 - "generateCurriculumGroundedSectionQuestions"
Cohesion: 0.60
Nodes (4): generateCurriculumGroundedSectionQuestions(), getMaxPaperDiagramBudget(), isSectionVisuallyEligible(), isSubjectChapterVisual()

### Community 64 - "mandatory-workflows.spec.ts"
Cohesion: 0.50
Nodes (3): @playwright/test, applySessionCookie(), generateSessionCookie()

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 417 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `print-logistics.ts`, `paperImport.ts`, `package.json`, `body`, `dto.ts`, `syllabusImport.ts`, `recordAudit`, `classes/route.ts`, `blueprintImport.ts`, `diagram-search.ts`, `batchQuestionIo.ts`, `constants.ts`, `BlueprintEditorPage`, `reconcileBlueprint.ts`, `studio.test.ts`, `HttpError`, `PaperData`, `math.ts`, `papers/[id]/page.tsx`, `QuestionForm.tsx`, `export-docx/route.ts`, `gemini.ts`, `mpbse-class12-math-regression.test.ts`, `generateCurriculumGroundedSectionQuestions`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0670807453416149 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `Modal`, `(app)/page.tsx`, `cleanOptionText`, `blueprints/page.tsx`, `PaperData`, `blueprintExport.ts`, `syllabusImport.ts`, `papers/[id]/page.tsx`, `QuestionForm.tsx`, `export-docx/route.ts`, `AppShell.tsx`, `useToast`, `SubjectWorkspaceDrawer.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11033681765389082 - nodes in this community are weakly interconnected._
- **Why does `HttpError` connect `HttpError` to `paperImport.ts`, `api.ts`, `export-docx/route.ts`, `body`, `syllabusImport.ts`, `recordAudit`, `classes/route.ts`, `diagram-search.ts`, `batchQuestionIo.ts`, `blueprints/[id]/route.ts`, `session.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11233766233766233 - nodes in this community are weakly interconnected._