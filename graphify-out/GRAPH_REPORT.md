# Graph Report - exam-paper-builder  (2026-10-31)

## Corpus Check
- 260 files · ~398,815 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1604 nodes · 6008 edges · 65 communities (62 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `174cf1b5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- subpartsTotalMarks
- paperImport.ts
- body
- FigureStudio.tsx
- geometry.ts
- package.json
- toQuestionDto
- dto.ts
- syllabusImport.ts
- AIBlueprintModal.tsx
- HttpError
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
- api.ts
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
- ErrorBanner
- ui.tsx
- internalChoiceRules.ts
- parseSubparts
- eslint.config.mjs
- blueprintExport.ts
- localization/index.ts
- papers/[id]/page.tsx
- blueprintImport.ts
- math.ts
- README.md
- print-logistics.ts
- AGENTS.md
- deploy.sh
- BlueprintImportModal
- parseMatchColumnPairs
- export-docx/route.ts
- api
- gemini.ts
- constants.ts
- curriculumContract.ts
- multiset.ts
- PaperSheets.tsx
- SectionAiModal.tsx
- QuestionType

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

### Community 1 - "subpartsTotalMarks"
Cohesion: 0.21
Nodes (23): POST, POST, toPlacedItems(), derangeMatchColumnPairs(), isSubpartQuestionType(), buildAndValidateGenerationContract(), cleanChapterTitleForLookup(), generateCurriculumGroundedSectionQuestions() (+15 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.15
Nodes (26): POST, inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion, ImportedPaperSection, ImportedPaperSubpart (+18 more)

### Community 3 - "body"
Cohesion: 0.06
Nodes (40): bcryptjs, auditSchema, POST, generateSchema, POST, improveSchema, POST, POST (+32 more)

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
Cohesion: 0.15
Nodes (18): Feature Inventory, bulkDeleteSchema, bulkRequestSchema, legacyBulkSchema, modernBulkSchema, POST, GET, DELETE (+10 more)

### Community 8 - "dto.ts"
Cohesion: 0.14
Nodes (25): @prisma/client, prisma, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, NUMBERING_STYLES, PRINT_DENSITIES (+17 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.09
Nodes (39): parseSchema, POST, POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON (+31 more)

### Community 10 - "AIBlueprintModal.tsx"
Cohesion: 0.16
Nodes (9): AIBlueprintModalProps, ChapterDraft, SectionDraft, BlueprintRolloverModal(), BlueprintRolloverModalProps, PaperImportModalProps, EXAM_TYPES, ExamType (+1 more)

### Community 11 - "HttpError"
Cohesion: 0.12
Nodes (35): GET, DELETE, GET, PATCH, DELETE, PATCH, GET, handleZipExport() (+27 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.18
Nodes (22): POST, GET, POST, DELETE, PATCH, GET, POST, postClassUnionSchema (+14 more)

### Community 14 - "vitest"
Cohesion: 0.20
Nodes (17): M3 (Question Exhaustion Tagging), vitest, QuestionPicker(), add(), handleAcceptAiQuestion(), CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext (+9 more)

### Community 15 - "schemas.ts"
Cohesion: 0.08
Nodes (26): GET, POST, GET, POST, AuditAction, MAX_OPTIONS, MIN_OPTIONS, SESSION_SLOTS (+18 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.07
Nodes (34): Architecture, Code Layout, Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, prisma, UPLOAD_DIR, GET, POST (+26 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.15
Nodes (14): AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot (+6 more)

### Community 18 - "layout.ts"
Cohesion: 0.16
Nodes (16): assert(), runServerChecks(), validateBlueprint(), DEFAULT_SPACE, parseBulkQuestions(), ParsedQuestionItem, DIFFICULTIES, formatQuestionNumber() (+8 more)

### Community 19 - "Modal"
Cohesion: 0.09
Nodes (38): lucide-react, react, QuestionExportModal(), AIPaperAuditModalProps, AIPaperGeneratorModal(), AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps, GeneratedQuestionPayload (+30 more)

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
Cohesion: 0.16
Nodes (26): RFC-4180, QuestionDuplicateModalProps, BatchImportError, BatchImportReport, BatchIoFormat, ChapterResolver, DuplicateRecord, escapeCsvField() (+18 more)

### Community 24 - "blueprints/[id]/route.ts"
Cohesion: 0.36
Nodes (8): DELETE, GET, PUT, GET, POST, diagnosePaperImplications(), assertBlueprintValid(), loadBlueprint()

### Community 25 - "AppShell.tsx"
Cohesion: 0.10
Nodes (24): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AcademicSessionSelectorProps, AppShell() (+16 more)

### Community 26 - "api.ts"
Cohesion: 0.16
Nodes (18): server-only, zod, parseBlueprintSchema, GET, duplicateSetSchema, parallelSetsSchema, bulkUpdateSchema, Ctx (+10 more)

### Community 27 - "QuestionsPage"
Cohesion: 0.22
Nodes (5): QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), remove()

### Community 28 - "blueprints/[id]/page.tsx"
Cohesion: 0.12
Nodes (34): nextConfig, next, BlueprintsPage(), subjectMatches(), BooksPage(), emptyBook, Filter, PapersPage() (+26 more)

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
Cohesion: 0.19
Nodes (13): GET, ChapterQuota, DiagnosticItem, flattenSectionGroups(), getItemMarks(), getItemUnits(), groupSectionsFromFlat(), PaperImplication (+5 more)

### Community 33 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, seed, start, test, test:e2e

### Community 34 - "BlueprintEditorPage"
Cohesion: 0.12
Nodes (19): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleImportedBlueprint(), hasExplicitSlotOverride(), isSlotChoiceRequired(), moveSectionGroup(), parseSlotOverrides() (+11 more)

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
Cohesion: 0.11
Nodes (34): Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), UsersAdminPage(), ExamCellPage(), getSectionsForClass(), Tab, DashboardPage() (+26 more)

### Community 40 - "ui.tsx"
Cohesion: 0.13
Nodes (14): BlueprintTemplateModalProps, ConfirmContext, ConfirmOptions, FALLBACK_TOAST, lockScroll(), ModalProps, modalStack, ToastApi (+6 more)

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.12
Nodes (24): BoardRuleConflictResult, detectBoardRuleConflict(), detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId, getBoardDefaultChoiceRequirement(), InternalChoiceIssue (+16 more)

### Community 42 - "parseSubparts"
Cohesion: 0.29
Nodes (10): DELETE, editableItem(), PATCH, PUT, POST, bulkDifficultySchema, POST, DELETE (+2 more)

### Community 43 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 44 - "blueprintExport.ts"
Cohesion: 0.38
Nodes (9): BlueprintJsonModal(), BlueprintJsonModalProps, BlueprintWithExportRelations, buildBlueprintExportPayload, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson (+1 more)

### Community 45 - "localization/index.ts"
Cohesion: 0.15
Nodes (20): GeneratePaperSectionInput, BILINGUAL_DICTIONARY, DEVANAGARI_LETTERS, ENGLISH_DICTIONARY, ENGLISH_SECTION_TYPE_MAP, HINDI_DICTIONARY, LOCALES, localizeSectionTitle() (+12 more)

### Community 46 - "papers/[id]/page.tsx"
Cohesion: 0.06
Nodes (23): Bar(), MultiSetGeneratorModal(), PaperBuilderPage(), handleAutofill(), AIPaperGeneratorModalProps, PaperImportModal(), PaperPreflightModal(), PaperPreflightModalProps (+15 more)

### Community 47 - "blueprintImport.ts"
Cohesion: 0.23
Nodes (15): BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, matchChaptersToBook(), normalizeExamType(), normalizeQuestionType(), parseBlueprintImport() (+7 more)

### Community 48 - "math.ts"
Cohesion: 0.17
Nodes (18): docx, splitOutsideMath(), DocxTextStyle, cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace() (+10 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "print-logistics.ts"
Cohesion: 0.44
Nodes (7): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip

### Community 54 - "BlueprintImportModal"
Cohesion: 0.47
Nodes (4): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent()

### Community 55 - "parseMatchColumnPairs"
Cohesion: 0.13
Nodes (32): getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), getDefaultSubpartsForType(), getSubpartLabel(), QuestionForm(), attach(), submit() (+24 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.25
Nodes (23): buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), openCreate(), buildBlocks(), cleanQuestionStatement() (+15 more)

### Community 57 - "api"
Cohesion: 0.11
Nodes (26): remove(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage(), addMissingStandardSubjects() (+18 more)

### Community 58 - "gemini.ts"
Cohesion: 0.13
Nodes (26): GET, auditPaperWithGemini(), callGeminiApi(), FigureStudioPromptResult, GeminiCallResult, GeminiContentPart, GeneratedQuestionItem, GeneratePaperSectionSlot (+18 more)

### Community 59 - "constants.ts"
Cohesion: 0.10
Nodes (20): AcademicSession, DerangedMatchColumnResult, isPrePrimaryClass(), KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL, MatchColumnPair, NUMBERING_STYLE_LABEL, PRINT_DENSITY_LABEL (+12 more)

### Community 60 - "curriculumContract.ts"
Cohesion: 0.15
Nodes (16): CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, CLASS_12_MATH_CHAPTER_SPECS, GenerationContract, GenerationContractValidationResult, GenerationSlotContract, getForbiddenDomainsForSubject() (+8 more)

### Community 61 - "multiset.ts"
Cohesion: 0.18
Nodes (16): BlueprintSectionDef, calculateSectionOverlap(), CandidateQuestionDef, formatSetIdentifier(), LETTERS, MultiSetPlanResult, OverlapCalculationResult, permuteMcqOptions() (+8 more)

### Community 62 - "PaperSheets.tsx"
Cohesion: 0.18
Nodes (16): OmrSheetPage(), PrintPage(), BlankPage(), Block, extractSectionLetter(), Page(), PaperSheets(), renderBlock() (+8 more)

### Community 63 - "SectionAiModal.tsx"
Cohesion: 0.26
Nodes (9): handleGenerateAiQuestion(), SectionAiModalProps, GeneratedPaperQuestion, resolveInternalChoiceRequirement(), detectPaperLanguage(), PaperAutogenInput, PaperAutogenSlot, planPaperSlotAssignments() (+1 more)

### Community 64 - "QuestionType"
Cohesion: 0.23
Nodes (10): BatchImportOptions, BatchParseOptions, ValidatedQuestionPayload, Difficulty, QuestionType, GroundedGeneratedQuestion, BlueprintTemplateSectionGroup, STANDARD_BLUEPRINT_TEMPLATES (+2 more)

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 424 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `BlueprintEditorPage`, `ErrorBanner`, `syllabusImport.ts`, `AIBlueprintModal.tsx`, `papers/[id]/page.tsx`, `vitest`, `Modal`, `BlueprintImportModal`, `parseMatchColumnPairs`, `AppShell.tsx`, `QuestionsPage`, `blueprints/[id]/page.tsx`, `PaperSheets.tsx`, `SectionAiModal.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0670807453416149 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Modal` to `kindergarten/types.ts`, `FigureStudio.tsx`, `package.json`, `ErrorBanner`, `ui.tsx`, `syllabusImport.ts`, `AIBlueprintModal.tsx`, `blueprintExport.ts`, `papers/[id]/page.tsx`, `parseMatchColumnPairs`, `AppShell.tsx`, `blueprints/[id]/page.tsx`, `PaperSheets.tsx`, `SectionAiModal.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `body` be split into smaller, more focused modules?**
  _Cohesion score 0.0632996632996633 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `subpartsTotalMarks`, `paperImport.ts`, `body`, `package.json`, `toQuestionDto`, `dto.ts`, `syllabusImport.ts`, `HttpError`, `classes/route.ts`, `schemas.ts`, `diagram-search.ts`, `logic.test.ts`, `layout.ts`, `batchQuestionIo.ts`, `blueprint.ts`, `reconcileBlueprint.ts`, `studio.test.ts`, `parseSubparts`, `blueprintImport.ts`, `math.ts`, `print-logistics.ts`, `parseMatchColumnPairs`, `export-docx/route.ts`, `gemini.ts`, `curriculumContract.ts`, `multiset.ts`, `SectionAiModal.tsx`, `QuestionType`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `FigureStudio.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._