# Graph Report - exam-paper-builder  (2026-10-31)

## Corpus Check
- 254 files · ~387,774 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1564 nodes · 5817 edges · 60 communities (57 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21d8d649`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- lib/types.ts
- paperImport.ts
- api.ts
- FigureStudio.tsx
- geometry.ts
- package.json
- body
- dto.ts
- syllabusImport.ts
- classes/page.tsx
- recordAudit
- time
- classes/route.ts
- vitest
- blueprintImport.ts
- diagram-search.ts
- logic.test.ts
- Modal
- lucide-react
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
- exam-cell/page.tsx
- react
- internalChoiceRules.ts
- HttpError
- PaperData
- blueprintExport.ts
- math.ts
- solutions/page.tsx
- ui.tsx
- BlueprintImportModal
- README.md
- schemas.ts
- AGENTS.md
- deploy.sh
- Project: Sarvodaya School Examination Portal — Production Business Logic
- papers/[id]/page.tsx
- export-docx/route.ts
- api
- gemini.ts
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

## Communities (60 total, 3 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.06
Nodes (50): attach(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint() (+42 more)

### Community 1 - "lib/types.ts"
Cohesion: 0.13
Nodes (21): SessionSlot, TimetableStatus, UserRole, calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass() (+13 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.11
Nodes (29): POST, PaperImportModal(), PaperImportModalProps, inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion (+21 more)

### Community 3 - "api.ts"
Cohesion: 0.15
Nodes (17): bcryptjs, parseBlueprintSchema, GET, DELETE, PATCH, GET, GET, duplicateSetSchema (+9 more)

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
Cohesion: 0.08
Nodes (43): Feature Inventory, zod, auditSchema, POST, generateSchema, POST, improveSchema, POST (+35 more)

### Community 8 - "dto.ts"
Cohesion: 0.12
Nodes (27): @prisma/client, prisma, DEFAULT_ACADEMIC_SESSION, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, MarksStyle (+19 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.11
Nodes (28): parseSchema, POST, POST, openBookDialog(), SyllabusImportModal(), handleAiScan(), handleImport(), STANDARD_CURRICULUM_PRESETS (+20 more)

### Community 10 - "classes/page.tsx"
Cohesion: 0.16
Nodes (17): BlueprintsPage(), remove(), subjectMatches(), emptyBook, AcademicRolloverModal(), handleSubmit(), AcademicRolloverModalProps, Field() (+9 more)

### Community 11 - "recordAudit"
Cohesion: 0.12
Nodes (35): POST, POST, GET, POST, POST, POST, parallelSetsSchema, POST (+27 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.24
Nodes (17): POST, GET, POST, PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject() (+9 more)

### Community 14 - "vitest"
Cohesion: 0.27
Nodes (13): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+5 more)

### Community 15 - "blueprintImport.ts"
Cohesion: 0.23
Nodes (16): BlueprintImportModalProps, BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, matchChaptersToBook(), normalizeExamType(), normalizeQuestionType() (+8 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.10
Nodes (23): prisma, UPLOAD_DIR, GET, POST, GET, TYPE_BY_EXT, EXT_BY_TYPE, POST (+15 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.22
Nodes (11): autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot, BlueprintDef (+3 more)

### Community 18 - "Modal"
Cohesion: 0.16
Nodes (13): QuestionExportModal(), QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), remove(), AIQuestionGeneratorModal(), computeSimilarity() (+5 more)

### Community 19 - "lucide-react"
Cohesion: 0.13
Nodes (27): nextConfig, lucide-react, next, DashboardPage(), Data, Filter, AIBlueprintModal(), AIBlueprintModalProps (+19 more)

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
Nodes (56): RFC-4180, assert(), runServerChecks(), MultiSetGeneratorModal(), QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport (+48 more)

### Community 24 - "blueprints/[id]/route.ts"
Cohesion: 0.22
Nodes (13): server-only, DELETE, GET, PUT, POST, GET, POST, diagnosePaperImplications() (+5 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.10
Nodes (25): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AcademicSessionSelectorProps, AppShell() (+17 more)

### Community 26 - "session.ts"
Cohesion: 0.32
Nodes (9): POST, POST, endSession(), parseRawSessionCookie(), secret(), sessionUserId(), sessionUserIdFromRequest(), sign() (+1 more)

### Community 27 - "useToast"
Cohesion: 0.08
Nodes (28): AIPaperAuditModal(), AIPaperAuditModalProps, AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, AIQuestionImproverModal(), AIQuestionImproverModalProps, ImproveTask (+20 more)

### Community 28 - "constants.ts"
Cohesion: 0.09
Nodes (21): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL, NUMBERING_STYLE_LABEL, PRINT_DENSITY_LABEL, QUESTION_TYPE_LABEL_BILINGUAL, QUESTION_TYPE_LABEL_HI (+13 more)

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
Nodes (6): ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "exam-cell/page.tsx"
Cohesion: 0.26
Nodes (14): UsersAdminPage(), ExamCellPage(), getSectionsForClass(), Tab, ErrorBanner(), Skeleton(), SuccessBanner(), DetailedProfile (+6 more)

### Community 40 - "react"
Cohesion: 0.32
Nodes (7): react, BlueprintTemplateModal(), BlueprintTemplateModalProps, BlueprintTemplate, BlueprintTemplateSectionGroup, STANDARD_BLUEPRINT_TEMPLATES, WorkbookHeaderProps

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.09
Nodes (27): GenerationSlotContract, detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId, InternalChoiceIssue, InternalChoicePolicy, InternalChoiceRequirement (+19 more)

### Community 42 - "HttpError"
Cohesion: 0.11
Nodes (25): GET, codeMatches(), POST, DELETE, GET, PATCH, POST, DELETE (+17 more)

### Community 43 - "PaperData"
Cohesion: 0.23
Nodes (11): AIPaperGeneratorModalProps, PaperPreflightModal(), PaperPreflightModalProps, PaperSnapshotDrawerProps, evaluatePaperInternalChoiceCompliance(), PreflightIssue, PreflightReport, validatePaperPreflight() (+3 more)

### Community 44 - "blueprintExport.ts"
Cohesion: 0.44
Nodes (8): BlueprintJsonModal(), BlueprintJsonModalProps, BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson, getBlueprintJsonFilename()

### Community 45 - "math.ts"
Cohesion: 0.17
Nodes (21): cleanMatchItem(), extractColumnIIItems(), extractColumnIItems(), extractMatchPairsFromExplanation(), parseMatchColumnPairs(), splitOutsideMath(), cleanLatexToUnicode(), convertNaturalMathToTex() (+13 more)

### Community 46 - "solutions/page.tsx"
Cohesion: 0.19
Nodes (24): OmrSheetPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), AIPaperGeneratorModal(), DiagramSearchModalProps, MathText(), LETTERS_LIST (+16 more)

### Community 47 - "ui.tsx"
Cohesion: 0.12
Nodes (14): PaperCompareModalProps, ConfirmContext, ConfirmOptions, FALLBACK_TOAST, lockScroll(), ModalProps, modalStack, ToastApi (+6 more)

### Community 48 - "BlueprintImportModal"
Cohesion: 0.47
Nodes (4): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent()

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "schemas.ts"
Cohesion: 0.08
Nodes (25): AuditAction, addItemSchema, changePasswordSchema, classSectionInputSchema, combineBooksSchema, editPaperItemSchema, loginSchema, moveItemSchema (+17 more)

### Community 54 - "Project: Sarvodaya School Examination Portal — Production Business Logic"
Cohesion: 0.22
Nodes (8): Architecture, Code Layout, Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, SectionDetail

### Community 55 - "papers/[id]/page.tsx"
Cohesion: 0.07
Nodes (35): Bar(), PaperBuilderPage(), handleAutofill(), DiagramSearchModal(), MathCategory, MathSnippet, MathToolbar(), SNIPPETS (+27 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.10
Nodes (45): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), openCreate(), PrintPage() (+37 more)

### Community 57 - "api"
Cohesion: 0.11
Nodes (26): BooksPage(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage(), addMissingStandardSubjects() (+18 more)

### Community 58 - "gemini.ts"
Cohesion: 0.07
Nodes (57): GET, derangeMatchColumnPairs(), buildAndValidateGenerationContract(), CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, CLASS_12_MATH_CHAPTER_SPECS, cleanChapterTitleForLookup() (+49 more)

### Community 60 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 419 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `exam-cell/page.tsx`, `classes/page.tsx`, `PaperData`, `blueprintExport.ts`, `solutions/page.tsx`, `blueprintImport.ts`, `ui.tsx`, `Modal`, `lucide-react`, `papers/[id]/page.tsx`, `export-docx/route.ts`, `AppShell.tsx`, `useToast`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06354642313546423 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `lib/types.ts`, `paperImport.ts`, `package.json`, `dto.ts`, `syllabusImport.ts`, `recordAudit`, `classes/route.ts`, `blueprintImport.ts`, `diagram-search.ts`, `logic.test.ts`, `batchQuestionIo.ts`, `blueprint.ts`, `reconcileBlueprint.ts`, `studio.test.ts`, `react`, `internalChoiceRules.ts`, `HttpError`, `PaperData`, `math.ts`, `schemas.ts`, `papers/[id]/page.tsx`, `export-docx/route.ts`, `gemini.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Why does `HttpError` connect `HttpError` to `paperImport.ts`, `api.ts`, `export-docx/route.ts`, `body`, `syllabusImport.ts`, `recordAudit`, `classes/route.ts`, `diagram-search.ts`, `blueprints/[id]/route.ts`, `session.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11336032388663968 - nodes in this community are weakly interconnected._