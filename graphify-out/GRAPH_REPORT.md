# Graph Report - exam-paper-builder  (2026-10-31)

## Corpus Check
- 266 files · ~422,930 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1636 nodes · 6159 edges · 63 communities (60 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `daf6c70d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- parseMatchColumnPairs
- paperImport.ts
- zod
- FigureStudio.tsx
- geometry.ts
- package.json
- m1-rbac-adversarial-stress.test.ts
- lib/types.ts
- SyllabusImportModal.tsx
- api.ts
- loadPaperView
- time
- classes/route.ts
- localization/index.ts
- schemas.ts
- diagram-search.ts
- dto.ts
- blueprint.ts
- useToast
- render.ts
- devDependencies
- hitTest
- batchQuestionIo.ts
- blueprints/[id]/route.ts
- AppShell.tsx
- curriculumContract.ts
- ui.tsx
- api
- compilerOptions
- dependencies
- app/layout.tsx
- blueprintImport.ts
- scripts
- BlueprintEditorPage
- e2e.mjs
- reconcileBlueprint.ts
- studio.test.ts
- text.ts
- exam-cell/page.tsx
- logic.test.ts
- internalChoiceRules.ts
- react
- questionValidator.ts
- blueprintExport.ts
- layout.ts
- vitest
- print-logistics.ts
- math.ts
- README.md
- register/route.ts
- AGENTS.md
- deploy.sh
- BlueprintImportModal
- QuestionForm.tsx
- export-docx/route.ts
- export-zip/route.ts
- gemini.ts
- constants.ts
- HttpError
- subpartExtractor.ts
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
9. `loadPaperView()` - 56 edges
10. `vitest` - 55 edges

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

## Communities (63 total, 3 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.06
Nodes (50): attach(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint() (+42 more)

### Community 1 - "parseMatchColumnPairs"
Cohesion: 0.14
Nodes (29): AIPaperGeneratorModal(), AIPaperGeneratorModalProps, MathText(), QuestionPicker(), add(), handleAcceptAiQuestion(), handleEditAiQuestion(), handleGenerateAiQuestion() (+21 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.12
Nodes (29): POST, PaperImportModal(), inferExamTypeFromText(), resolvePaperExamType(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion (+21 more)

### Community 3 - "zod"
Cohesion: 0.29
Nodes (5): zod, generateSchema, POST, figureSchema, POST

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.12
Nodes (15): eslintConfig, name, private, version, eslint, eslint-config-next, prisma, react-dom (+7 more)

### Community 7 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.15
Nodes (18): GET, bulkDeleteSchema, bulkRequestSchema, DELETE, legacyBulkSchema, modernBulkSchema, POST, GET (+10 more)

### Community 8 - "lib/types.ts"
Cohesion: 0.11
Nodes (23): Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), Tab, Layout, MarksStyle, NumberingStyle, PrintDensity (+15 more)

### Community 9 - "SyllabusImportModal.tsx"
Cohesion: 0.08
Nodes (40): parseSchema, POST, POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON (+32 more)

### Community 10 - "api.ts"
Cohesion: 0.11
Nodes (31): GET, POST, GET, POST, DELETE, PATCH, GET, POST (+23 more)

### Community 11 - "loadPaperView"
Cohesion: 0.14
Nodes (36): auditSchema, POST, POST, POST, GET, POST, POST, parallelSetsSchema (+28 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.35
Nodes (14): PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject(), normalizeAcademicSession(), normalizeSectionDetails(), syncClassesFromBooks() (+6 more)

### Community 14 - "localization/index.ts"
Cohesion: 0.17
Nodes (17): BILINGUAL_DICTIONARY, DEVANAGARI_LETTERS, ENGLISH_DICTIONARY, ENGLISH_SECTION_TYPE_MAP, HINDI_DICTIONARY, LOCALES, localizeSectionTitle(), resolvePartSuffix() (+9 more)

### Community 15 - "schemas.ts"
Cohesion: 0.07
Nodes (29): AuditAction, MAX_OPTIONS, MIN_OPTIONS, SESSION_SLOTS, TIMETABLE_STATUSES, USER_ROLES, addItemSchema, changePasswordSchema (+21 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.12
Nodes (19): prisma, UPLOAD_DIR, GET, POST, GET, TYPE_BY_EXT, CURATED_DIAGRAMS, CuratedDiagram (+11 more)

### Community 17 - "dto.ts"
Cohesion: 0.13
Nodes (24): @prisma/client, prisma, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, NUMBERING_STYLES, PRINT_DENSITIES (+16 more)

### Community 18 - "blueprint.ts"
Cohesion: 0.19
Nodes (15): handleImportedBlueprint(), blueprintTotalMarks(), ChapterQuota, DiagnosticItem, flattenSectionGroups(), getItemMarks(), getItemUnits(), groupSectionsFromFlat() (+7 more)

### Community 19 - "useToast"
Cohesion: 0.08
Nodes (30): QuestionExportModal(), QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), AIBlueprintModal(), AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps (+22 more)

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
Nodes (44): RFC-4180, MultiSetGeneratorModal(), QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat, BatchParseOptions (+36 more)

### Community 24 - "blueprints/[id]/route.ts"
Cohesion: 0.29
Nodes (10): DELETE, GET, PUT, GET, POST, diagnosePaperImplications(), assertBlueprintValid(), blueprintInclude (+2 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.11
Nodes (21): AppLayout(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AcademicSessionSelectorProps, AppShell(), signOut(), isActive() (+13 more)

### Community 26 - "curriculumContract.ts"
Cohesion: 0.09
Nodes (25): CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, CLASS_10_SANSKRIT_SPECS, CLASS_12_MATH_CHAPTER_SPECS, detectEducationBoard(), evaluateSanskritCompetencyCoverage(), GenerationContract (+17 more)

### Community 27 - "ui.tsx"
Cohesion: 0.11
Nodes (18): COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS, SubjectWorkspaceDrawer(), SubjectWorkspaceDrawerProps, ConfirmContext, ConfirmOptions (+10 more)

### Community 28 - "api"
Cohesion: 0.08
Nodes (44): BlueprintsPage(), remove(), subjectMatches(), BooksPage(), removeBook(), removeChapter(), run(), saveBook() (+36 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, docx, katex, lucide-react, next, @prisma/client, react (+3 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "blueprintImport.ts"
Cohesion: 0.23
Nodes (15): BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, matchChaptersToBook(), normalizeExamType(), normalizeQuestionType(), parseBlueprintImport() (+7 more)

### Community 33 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, seed, start, test, test:e2e

### Community 34 - "BlueprintEditorPage"
Cohesion: 0.12
Nodes (18): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), hasExplicitSlotOverride(), isSlotChoiceRequired(), moveSectionGroup(), parseSlotOverrides(), patchQuestionType() (+10 more)

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
Cohesion: 0.16
Nodes (23): UsersAdminPage(), ExamCellPage(), getSectionsForClass(), DashboardPage(), Data, LoginPage(), submit(), BrandMark() (+15 more)

### Community 40 - "logic.test.ts"
Cohesion: 0.22
Nodes (11): AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot (+3 more)

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.12
Nodes (24): BoardRuleConflictResult, detectBoardRuleConflict(), detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId, getBoardDefaultChoiceRequirement(), InternalChoiceIssue (+16 more)

### Community 42 - "react"
Cohesion: 0.16
Nodes (24): nextConfig, lucide-react, next, react, Filter, AIBlueprintModalProps, ChapterDraft, SectionDraft (+16 more)

### Community 43 - "questionValidator.ts"
Cohesion: 0.17
Nodes (18): PaperPreflightModal(), PaperPreflightModalProps, cleanOptionText(), isMcqLikeType(), evaluatePaperInternalChoiceCompliance(), PreflightIssue, PreflightReport, validatePaperPreflight() (+10 more)

### Community 44 - "blueprintExport.ts"
Cohesion: 0.38
Nodes (9): BlueprintJsonModal(), BlueprintJsonModalProps, BlueprintWithExportRelations, buildBlueprintExportPayload, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson (+1 more)

### Community 45 - "layout.ts"
Cohesion: 0.21
Nodes (15): assert(), runServerChecks(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), isSubpartQuestionType(), normalizeMcqAnswer(), bookletPageCount() (+7 more)

### Community 46 - "vitest"
Cohesion: 0.27
Nodes (13): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+5 more)

### Community 47 - "print-logistics.ts"
Cohesion: 0.44
Nodes (7): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip

### Community 48 - "math.ts"
Cohesion: 0.23
Nodes (15): cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX, isEntirelyMath() (+7 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "register/route.ts"
Cohesion: 0.11
Nodes (20): Architecture, Code Layout, Feature Inventory, Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, server-only, POST, POST (+12 more)

### Community 54 - "BlueprintImportModal"
Cohesion: 0.47
Nodes (4): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent()

### Community 55 - "QuestionForm.tsx"
Cohesion: 0.07
Nodes (31): Bar(), PaperBuilderPage(), handleAutofill(), OmrSheetPage(), DiagramSearchModal(), DiagramSearchModalProps, MathCategory, MathSnippet (+23 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.14
Nodes (38): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), openCreate(), BlankPage() (+30 more)

### Community 57 - "export-zip/route.ts"
Cohesion: 0.83
Nodes (3): GET, handleZipExport(), POST

### Community 58 - "gemini.ts"
Cohesion: 0.11
Nodes (37): improveSchema, POST, GET, derangeMatchColumnPairs(), extractMatchPairsFromExplanation(), buildAndValidateGenerationContract(), cleanChapterTitleForLookup(), generateCurriculumGroundedSectionQuestions() (+29 more)

### Community 59 - "constants.ts"
Cohesion: 0.08
Nodes (27): BlueprintTemplateModalProps, DEFAULT_SPACE, ParsedQuestionItem, AcademicSession, DerangedMatchColumnResult, DIFFICULTIES, KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL (+19 more)

### Community 60 - "HttpError"
Cohesion: 0.11
Nodes (32): bcryptjs, POST, parseBlueprintSchema, POST, GET, POST, POST, DELETE (+24 more)

### Community 61 - "subpartExtractor.ts"
Cohesion: 0.16
Nodes (16): GroundedGeneratedQuestion, GeneratedPaperQuestion, GeneratedQuestionItem, ValidatableQuestion, DecomposedSubpartsResult, decomposeStemSubparts(), detectAttemptCount(), DEVANAGARI_CONSONANTS (+8 more)

### Community 65 - "mandatory-workflows.spec.ts"
Cohesion: 0.50
Nodes (3): @playwright/test, applySessionCookie(), generateSessionCookie()

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 434 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `parseMatchColumnPairs`, `BlueprintEditorPage`, `exam-cell/page.tsx`, `lib/types.ts`, `SyllabusImportModal.tsx`, `react`, `layout.ts`, `useToast`, `BlueprintImportModal`, `QuestionForm.tsx`, `AppShell.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06354642313546423 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `kindergarten/types.ts`, `parseMatchColumnPairs`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `exam-cell/page.tsx`, `lib/types.ts`, `SyllabusImportModal.tsx`, `questionValidator.ts`, `blueprintExport.ts`, `layout.ts`, `useToast`, `QuestionForm.tsx`, `export-docx/route.ts`, `AppShell.tsx`, `ui.tsx`, `api`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `parseMatchColumnPairs` be split into smaller, more focused modules?**
  _Cohesion score 0.14102564102564102 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `parseMatchColumnPairs`, `paperImport.ts`, `package.json`, `m1-rbac-adversarial-stress.test.ts`, `SyllabusImportModal.tsx`, `loadPaperView`, `classes/route.ts`, `schemas.ts`, `diagram-search.ts`, `dto.ts`, `blueprint.ts`, `batchQuestionIo.ts`, `curriculumContract.ts`, `blueprintImport.ts`, `reconcileBlueprint.ts`, `studio.test.ts`, `logic.test.ts`, `questionValidator.ts`, `print-logistics.ts`, `math.ts`, `QuestionForm.tsx`, `export-docx/route.ts`, `gemini.ts`, `constants.ts`, `HttpError`, `subpartExtractor.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11923076923076924 - nodes in this community are weakly interconnected._