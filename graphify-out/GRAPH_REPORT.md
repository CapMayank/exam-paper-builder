# Graph Report - exam-paper-builder  (2026-10-31)

## Corpus Check
- 263 files · ~402,281 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1621 nodes · 6076 edges · 67 communities (63 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cafa69ed`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- parseMatchColumnPairs
- paperImport.ts
- body
- FigureStudio.tsx
- geometry.ts
- package.json
- toQuestionDto
- dto.ts
- classes/page.tsx
- AIBlueprintModal.tsx
- papers.ts
- time
- classes/route.ts
- vitest
- schemas.ts
- diagram-search.ts
- logic.test.ts
- layout.ts
- Modal
- render.ts
- devDependencies
- hitTest
- batchQuestionIo.ts
- blueprints/[id]/route.ts
- AppShell.tsx
- recordAudit
- QuestionsPage
- blueprints/[id]/page.tsx
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
- exam-cell/page.tsx
- syllabusImport.ts
- internalChoiceRules.ts
- prisma
- m1-rbac-adversarial-stress.test.ts
- blueprintExport.ts
- HttpError
- papers/[id]/page.tsx
- blueprintImport.ts
- math.ts
- README.md
- lib/types.ts
- AGENTS.md
- deploy.sh
- BlueprintImportModal
- QuestionForm.tsx
- export-docx/route.ts
- api
- gemini.ts
- constants.ts
- register/route.ts
- subpartExtractor.ts
- cleanOptionText
- Project: Sarvodaya School Examination Portal — Production Business Logic
- SubjectWorkspaceDrawer.tsx
- mandatory-workflows.spec.ts
- seed-kindergarten.mjs

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 133 edges
2. `body()` - 85 edges
3. `api()` - 84 edges
4. `recordAudit()` - 73 edges
5. `route()` - 68 edges
6. `prisma` - 68 edges
7. `Modal()` - 60 edges
8. `react` - 59 edges
9. `loadPaperView()` - 56 edges
10. `vitest` - 53 edges

## Surprising Connections (you probably didn't know these)
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `M3 (Question Exhaustion Tagging)` --references--> `parseCompactExamTag()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `Architecture` --references--> `SessionUser`  [INFERRED]
  PROJECT.md → src/lib/api.ts
- `M2 (Section Enrollment & Print Logistics)` --references--> `toAcademicClassDto()`  [INFERRED]
  PROJECT.md → src/lib/classes.ts
- `M1 (RBAC & Ownership)` --references--> `toQuestionDto()`  [INFERRED]
  PROJECT.md → src/lib/dto.ts

## Import Cycles
- None detected.

## Communities (67 total, 4 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.07
Nodes (47): CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint(), numberGridPlugin, NumberGridPrint() (+39 more)

### Community 1 - "parseMatchColumnPairs"
Cohesion: 0.26
Nodes (16): QuestionPicker(), add(), handleAcceptAiQuestion(), handleEditAiQuestion(), handleGenerateAiQuestion(), handleCommit(), cleanMatchItem(), derangeMatchColumnPairs() (+8 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.12
Nodes (28): POST, PaperImportModal(), inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion, ImportedPaperSection (+20 more)

### Community 3 - "body"
Cohesion: 0.10
Nodes (27): zod, auditSchema, generateSchema, POST, improveSchema, POST, parseBlueprintSchema, POST (+19 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.12
Nodes (15): eslintConfig, name, private, version, eslint, eslint-config-next, prisma, react-dom (+7 more)

### Community 7 - "toQuestionDto"
Cohesion: 0.19
Nodes (11): bulkDeleteSchema, bulkRequestSchema, legacyBulkSchema, modernBulkSchema, POST, GET, GET, GET (+3 more)

### Community 8 - "dto.ts"
Cohesion: 0.17
Nodes (22): @prisma/client, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, NUMBERING_STYLES, PRINT_DENSITIES, QUESTION_TYPES (+14 more)

### Community 9 - "classes/page.tsx"
Cohesion: 0.12
Nodes (19): SectionRosterItem(), subjectMatches(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON, SyllabusImportModal(), handleAiScan() (+11 more)

### Community 10 - "AIBlueprintModal.tsx"
Cohesion: 0.15
Nodes (13): AIBlueprintModalProps, ChapterDraft, SectionDraft, BlueprintRolloverModal(), BlueprintRolloverModalProps, BlueprintTemplateModal(), BlueprintTemplateModalProps, EXAM_TYPE_LABEL (+5 more)

### Community 11 - "papers.ts"
Cohesion: 0.15
Nodes (30): POST, POST, GET, POST, POST, POST, POST, DELETE (+22 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.26
Nodes (17): GET, POST, PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject(), normalizeAcademicSession() (+9 more)

### Community 14 - "vitest"
Cohesion: 0.25
Nodes (13): vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage(), parseCompactExamTag() (+5 more)

### Community 15 - "schemas.ts"
Cohesion: 0.08
Nodes (25): AuditAction, addItemSchema, changePasswordSchema, classSectionInputSchema, classSubjectSchema, combineBooksSchema, editPaperItemSchema, loginSchema (+17 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.12
Nodes (19): prisma, UPLOAD_DIR, GET, POST, GET, TYPE_BY_EXT, CURATED_DIAGRAMS, CuratedDiagram (+11 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.25
Nodes (9): AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot (+1 more)

### Community 18 - "layout.ts"
Cohesion: 0.23
Nodes (10): assert(), runServerChecks(), BlueprintDef, checkBlueprintFeasibility(), DEFAULT_SPACE, parseBulkQuestions(), DIFFICULTIES, bookletPageCount() (+2 more)

### Community 19 - "Modal"
Cohesion: 0.08
Nodes (42): lucide-react, react, UsersAdminPage(), AcademicRolloverModal(), handleSubmit(), AcademicRolloverModalProps, AcademicSessionSelectorProps, AIPaperAuditModal() (+34 more)

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
Nodes (47): RFC-4180, MultiSetGeneratorModal(), QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat, BatchParseOptions (+39 more)

### Community 24 - "blueprints/[id]/route.ts"
Cohesion: 0.27
Nodes (11): GET, PUT, GET, POST, diagnosePaperImplications(), assertBlueprintValid(), blueprintInclude, BlueprintInput (+3 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.16
Nodes (15): AppLayout(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AppShell(), signOut(), isActive(), NAV (+7 more)

### Community 26 - "recordAudit"
Cohesion: 0.14
Nodes (17): bcryptjs, DELETE, PATCH, POST, POST, GET, POST, POST (+9 more)

### Community 27 - "QuestionsPage"
Cohesion: 0.16
Nodes (11): QuestionExportModal(), QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), remove(), LoginPage(), submit() (+3 more)

### Community 28 - "blueprints/[id]/page.tsx"
Cohesion: 0.13
Nodes (24): BlueprintsPage(), remove(), subjectMatches(), emptyBook, Filter, PapersPage(), AIBlueprintModal(), PaperCompareModal() (+16 more)

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
Nodes (15): handleImportedBlueprint(), blueprintTotalMarks(), ChapterQuota, DiagnosticItem, flattenSectionGroups(), getItemMarks(), getItemUnits(), PaperImplication (+7 more)

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

### Community 39 - "exam-cell/page.tsx"
Cohesion: 0.19
Nodes (16): nextConfig, next, ExamCellPage(), getSectionsForClass(), Tab, DashboardPage(), Data, PaperRow() (+8 more)

### Community 40 - "syllabusImport.ts"
Cohesion: 0.17
Nodes (22): POST, STANDARD_CURRICULUM_PRESETS, parseSyllabusWithGemini(), rolloverBlueprintsSchema, rolloverBookSchema, ensureLanguageNonChapterUnits(), getLanguageNonChapterUnits(), hasDomainCovered() (+14 more)

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.06
Nodes (47): GenerationSlotContract, BoardRuleConflictResult, detectBoardRuleConflict(), detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId, getBoardDefaultChoiceRequirement() (+39 more)

### Community 42 - "prisma"
Cohesion: 0.24
Nodes (10): POST, parallelSetsSchema, POST, DELETE, PATCH, bulkDifficultySchema, POST, DELETE (+2 more)

### Community 43 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.17
Nodes (16): Feature Inventory, POST, POST, DELETE, DELETE, PATCH, updateSubjectSchema, GET (+8 more)

### Community 44 - "blueprintExport.ts"
Cohesion: 0.40
Nodes (9): BlueprintJsonModal(), BlueprintJsonModalProps, groupSectionsFromFlat(), BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson (+1 more)

### Community 45 - "HttpError"
Cohesion: 0.15
Nodes (14): GET, DELETE, POST, DELETE, GET, PATCH, DELETE, PATCH (+6 more)

### Community 46 - "papers/[id]/page.tsx"
Cohesion: 0.09
Nodes (27): Bar(), PaperBuilderPage(), handleAutofill(), PrintPage(), MathText(), BlankPage(), Block, extractSectionLetter() (+19 more)

### Community 47 - "blueprintImport.ts"
Cohesion: 0.23
Nodes (16): BlueprintImportModalProps, BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, matchChaptersToBook(), normalizeExamType(), normalizeQuestionType() (+8 more)

### Community 48 - "math.ts"
Cohesion: 0.21
Nodes (16): splitOutsideMath(), cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX (+8 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "lib/types.ts"
Cohesion: 0.15
Nodes (19): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, AuditLogEntry (+11 more)

### Community 54 - "BlueprintImportModal"
Cohesion: 0.47
Nodes (4): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent()

### Community 55 - "QuestionForm.tsx"
Cohesion: 0.08
Nodes (35): AIQuestionImproverModal(), DiagramSearchModal(), DiagramSearchModalProps, MathCategory, MathSnippet, MathToolbar(), SNIPPETS, DEFAULT_ASSERTION_OPTIONS_EN (+27 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.23
Nodes (24): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), openCreate(), buildBlocks() (+16 more)

### Community 57 - "api"
Cohesion: 0.14
Nodes (23): BooksPage(), openBookDialog(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage() (+15 more)

### Community 58 - "gemini.ts"
Cohesion: 0.06
Nodes (65): GET, AIPaperGeneratorModal(), AIQuestionImproverModalProps, ImproveTask, ParsedQuestionItem, QuestionType, buildAndValidateGenerationContract(), CBSE_SECONDARY_CODES (+57 more)

### Community 59 - "constants.ts"
Cohesion: 0.07
Nodes (26): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL, MarksStyle, NUMBERING_STYLE_LABEL, PRINT_DENSITY_LABEL, PrintDensity (+18 more)

### Community 60 - "register/route.ts"
Cohesion: 0.17
Nodes (14): server-only, POST, POST, codeMatches(), POST, EXT_BY_TYPE, POST, endSession() (+6 more)

### Community 61 - "subpartExtractor.ts"
Cohesion: 0.23
Nodes (11): DecomposedSubpartsResult, decomposeStemSubparts(), detectAttemptCount(), DEVANAGARI_CONSONANTS, DEVANAGARI_DIGITS, findSequenceMatches(), isFalsePositiveParenthesis(), isInsideMath() (+3 more)

### Community 62 - "cleanOptionText"
Cohesion: 0.14
Nodes (26): OmrSheetPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), AIPaperGeneratorModalProps, PaperImportModalProps, PaperPreflightModal(), PaperPreflightModalProps (+18 more)

### Community 63 - "Project: Sarvodaya School Examination Portal — Production Business Logic"
Cohesion: 0.20
Nodes (9): Architecture, Code Layout, Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), M3 (Question Exhaustion Tagging), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic (+1 more)

### Community 64 - "SubjectWorkspaceDrawer.tsx"
Cohesion: 0.43
Nodes (5): COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS, SubjectWorkspaceDrawerProps

### Community 65 - "mandatory-workflows.spec.ts"
Cohesion: 0.50
Nodes (3): @playwright/test, applySessionCookie(), generateSessionCookie()

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 430 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `parseMatchColumnPairs`, `BlueprintEditorPage`, `exam-cell/page.tsx`, `classes/page.tsx`, `AIBlueprintModal.tsx`, `papers/[id]/page.tsx`, `blueprintImport.ts`, `Modal`, `BlueprintImportModal`, `QuestionForm.tsx`, `AppShell.tsx`, `gemini.ts`, `QuestionsPage`, `blueprints/[id]/page.tsx`, `cleanOptionText`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0670807453416149 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Modal` to `SubjectWorkspaceDrawer.tsx`, `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `exam-cell/page.tsx`, `classes/page.tsx`, `AIBlueprintModal.tsx`, `blueprintExport.ts`, `papers/[id]/page.tsx`, `blueprintImport.ts`, `QuestionForm.tsx`, `AppShell.tsx`, `gemini.ts`, `QuestionsPage`, `blueprints/[id]/page.tsx`, `cleanOptionText`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12010796221322537 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `parseMatchColumnPairs`, `paperImport.ts`, `package.json`, `dto.ts`, `AIBlueprintModal.tsx`, `papers.ts`, `classes/route.ts`, `schemas.ts`, `diagram-search.ts`, `logic.test.ts`, `layout.ts`, `batchQuestionIo.ts`, `blueprint.ts`, `reconcileBlueprint.ts`, `studio.test.ts`, `syllabusImport.ts`, `internalChoiceRules.ts`, `prisma`, `m1-rbac-adversarial-stress.test.ts`, `blueprintImport.ts`, `math.ts`, `lib/types.ts`, `QuestionForm.tsx`, `export-docx/route.ts`, `gemini.ts`, `subpartExtractor.ts`, `cleanOptionText`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `body` be split into smaller, more focused modules?**
  _Cohesion score 0.10104529616724739 - nodes in this community are weakly interconnected._