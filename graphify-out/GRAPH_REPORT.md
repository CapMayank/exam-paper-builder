# Graph Report - exam-paper-builder  (2026-10-30)

## Corpus Check
- 250 files · ~361,596 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1492 nodes · 5481 edges · 62 communities (58 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb5edceb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- lib/types.ts
- paperImport.ts
- blueprints/[id]/page.tsx
- FigureStudio.tsx
- geometry.ts
- package.json
- blueprints/[id]/route.ts
- dto.ts
- syllabusImport.ts
- ErrorBanner
- recordAudit
- time
- schemas.ts
- vitest
- blueprints/[id]/page.tsx
- gemini.ts
- logic.test.ts
- HttpError
- ui.tsx
- render.ts
- devDependencies
- hitTest
- batchQuestionIo.ts
- api.ts
- AppShell.tsx
- session.ts
- api
- constants.ts
- compilerOptions
- dependencies
- app/layout.tsx
- multiset.ts
- scripts
- print-logistics.ts
- e2e.mjs
- reconcileBlueprint.ts
- studio.test.ts
- text.ts
- Project: Sarvodaya School Examination Portal — Production Business Logic
- PaperSheets.tsx
- paperAutogen.ts
- export-zip/route.ts
- seed-kindergarten.mjs
- QuestionForm
- math.ts
- solutions/page.tsx
- QuestionsPage
- parseMatchColumnPairs
- README.md
- toQuestionDto
- AGENTS.md
- deploy.sh
- audit-defects-regression.test.ts
- papers/[id]/page.tsx
- export-docx/route.ts
- blueprints/page.tsx
- QuestionPicker
- PaperPreflightModal.tsx
- ref_node_crypto
- PaperBuilderPage

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

## Communities (62 total, 4 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.06
Nodes (51): attach(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint() (+43 more)

### Community 1 - "lib/types.ts"
Cohesion: 0.12
Nodes (15): PaperImplication, SessionSlot, TimetableStatus, UserRole, AuditLogEntry, BlueprintData, ClassSectionInput, ClassSubjectDto (+7 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.16
Nodes (24): inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion, ImportedPaperSection, ImportedPaperSubpart, isLikelyCsv() (+16 more)

### Community 3 - "blueprints/[id]/page.tsx"
Cohesion: 0.22
Nodes (10): BlueprintTemplateModalProps, ValidatedQuestionPayload, DEFAULT_SPACE, parseBulkQuestions(), ParsedQuestionItem, Difficulty, QuestionType, BlueprintTemplate (+2 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.12
Nodes (15): eslintConfig, name, private, version, eslint, eslint-config-next, prisma, react-dom (+7 more)

### Community 7 - "blueprints/[id]/route.ts"
Cohesion: 0.43
Nodes (7): DELETE, GET, PUT, POST, diagnosePaperImplications(), assertBlueprintValid(), loadBlueprint()

### Community 8 - "dto.ts"
Cohesion: 0.14
Nodes (27): @prisma/client, DEFAULT_ACADEMIC_SESSION, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, MarksStyle, NUMBERING_STYLES (+19 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.10
Nodes (34): POST, openBookDialog(), EditableChapter, SyllabusImportModal(), handleAiScan(), handleImport(), STANDARD_CURRICULUM_PRESETS, rolloverBlueprintsSchema (+26 more)

### Community 10 - "ErrorBanner"
Cohesion: 0.14
Nodes (23): nextConfig, next, UsersAdminPage(), remove(), DashboardPage(), Data, LoginPage(), submit() (+15 more)

### Community 11 - "recordAudit"
Cohesion: 0.14
Nodes (38): POST, POST, GET, POST, POST, POST, POST, POST (+30 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "schemas.ts"
Cohesion: 0.09
Nodes (40): POST, GET, POST, PATCH, GET, POST, postClassUnionSchema, AuditAction (+32 more)

### Community 14 - "vitest"
Cohesion: 0.29
Nodes (12): vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage(), parseCompactExamTag() (+4 more)

### Community 15 - "blueprints/[id]/page.tsx"
Cohesion: 0.06
Nodes (53): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleImportedBlueprint(), moveSectionGroup(), removeSectionGroup(), save(), newQuestionType() (+45 more)

### Community 16 - "gemini.ts"
Cohesion: 0.06
Nodes (49): prisma, UPLOAD_DIR, parseSchema, POST, GET, POST, GET, GET (+41 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.16
Nodes (17): assert(), runServerChecks(), autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits() (+9 more)

### Community 18 - "HttpError"
Cohesion: 0.08
Nodes (44): bcryptjs, auditSchema, POST, POST, GET, POST, codeMatches(), POST (+36 more)

### Community 19 - "ui.tsx"
Cohesion: 0.09
Nodes (25): AIBlueprintModalProps, ChapterDraft, SectionDraft, AIQuestionGeneratorModalProps, BlueprintImportModalProps, BlueprintRolloverModalProps, CombineBooksModalProps, ConfirmContext (+17 more)

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
Cohesion: 0.15
Nodes (23): RFC-4180, BatchImportError, BatchImportOptions, BatchIoFormat, BatchParseOptions, ChapterResolver, DuplicateRecord, escapeCsvField() (+15 more)

### Community 24 - "api.ts"
Cohesion: 0.09
Nodes (35): server-only, zod, generateSchema, POST, improveSchema, POST, parseBlueprintSchema, figureSchema (+27 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.08
Nodes (28): ExamCellPage(), getSectionsForClass(), Tab, AppLayout(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AcademicSessionSelectorProps (+20 more)

### Community 26 - "session.ts"
Cohesion: 0.42
Nodes (7): POST, endSession(), parseRawSessionCookie(), secret(), sessionUserId(), sessionUserIdFromRequest(), sign()

### Community 27 - "api"
Cohesion: 0.11
Nodes (23): removeBook(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage(), addMissingStandardSubjects(), addSectionToClass() (+15 more)

### Community 28 - "constants.ts"
Cohesion: 0.10
Nodes (19): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL, MatchColumnPair, NUMBERING_STYLE_LABEL, PRINT_DENSITY_LABEL, QUESTION_TYPE_LABEL_BILINGUAL (+11 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, docx, katex, lucide-react, next, @prisma/client, react (+3 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "multiset.ts"
Cohesion: 0.21
Nodes (16): BlueprintSectionDef, calculateSectionOverlap(), CandidateQuestionDef, formatSetIdentifier(), LETTERS, MultiSetPlanResult, nextSetIdentifier(), OverlapCalculationResult (+8 more)

### Community 33 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, seed, start, test, test:e2e

### Community 34 - "print-logistics.ts"
Cohesion: 0.42
Nodes (8): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, AcademicClassDto

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

### Community 39 - "Project: Sarvodaya School Examination Portal — Production Business Logic"
Cohesion: 0.22
Nodes (8): Architecture, Code Layout, Interface Contracts, M2 (Section Enrollment & Print Logistics), M3 (Question Exhaustion Tagging), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, SectionDetail

### Community 40 - "PaperSheets.tsx"
Cohesion: 0.20
Nodes (16): PrintPage(), BlankPage(), Block, buildBlocks(), extractSectionLetter(), Page(), PaperSheets(), renderBlock() (+8 more)

### Community 41 - "paperAutogen.ts"
Cohesion: 0.40
Nodes (4): PaperAutogenInput, PaperAutogenPlan, PaperAutogenSectionPlan, PaperAutogenSlot

### Community 42 - "export-zip/route.ts"
Cohesion: 0.60
Nodes (3): GET, handleZipExport(), POST

### Community 44 - "QuestionForm"
Cohesion: 0.20
Nodes (14): getDefaultSubpartsForType(), getSubpartLabel(), QuestionForm(), submit(), LETTERS_LIST, QuestionRenderMode, QuestionView(), ROMAN_LOWER (+6 more)

### Community 45 - "math.ts"
Cohesion: 0.23
Nodes (15): cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX, isEntirelyMath() (+7 more)

### Community 46 - "solutions/page.tsx"
Cohesion: 0.38
Nodes (12): OmrSheetPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), DiagramSearchModalProps, imageUrl(), cleanOptionText(), isMcqLikeType() (+4 more)

### Community 47 - "QuestionsPage"
Cohesion: 0.18
Nodes (6): QuestionExportModal(), QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), remove()

### Community 48 - "parseMatchColumnPairs"
Cohesion: 0.36
Nodes (9): SectionAiModal(), handleCommit(), cleanMatchItem(), extractColumnIIItems(), extractColumnIItems(), extractMatchPairsFromExplanation(), parseMatchColumnPairs(), splitOutsideMath() (+1 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "toQuestionDto"
Cohesion: 0.16
Nodes (17): Feature Inventory, bulkDeleteSchema, bulkRequestSchema, legacyBulkSchema, modernBulkSchema, POST, DELETE, GET (+9 more)

### Community 54 - "audit-defects-regression.test.ts"
Cohesion: 0.32
Nodes (6): GET, QuestionDuplicateModalProps, BatchImportReport, exportQuestionsToCsv(), exportQuestionsToJson(), QuestionDto

### Community 55 - "papers/[id]/page.tsx"
Cohesion: 0.10
Nodes (41): M1 (RBAC & Ownership), lucide-react, react, AIPaperAuditModalProps, AIPaperGeneratorModal(), AIPaperGeneratorModalProps, AIQuestionGeneratorModal(), GeneratedQuestionPayload (+33 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.25
Nodes (17): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), cleanQuestionStatement(), detectPaperLanguage() (+9 more)

### Community 57 - "blueprints/page.tsx"
Cohesion: 0.14
Nodes (25): BlueprintsPage(), subjectMatches(), BooksPage(), emptyBook, Filter, PapersPage(), handleBatchDelete(), handleBatchFinalize() (+17 more)

### Community 58 - "QuestionPicker"
Cohesion: 0.39
Nodes (6): QuestionPicker(), add(), handleAcceptAiQuestion(), handleEditAiQuestion(), serializeMatchColumnPair(), normalizeSubpartMarks()

### Community 59 - "PaperPreflightModal.tsx"
Cohesion: 0.43
Nodes (5): PaperPreflightModal(), PaperPreflightModalProps, PreflightIssue, PreflightReport, validatePaperPreflight()

### Community 60 - "ref_node_crypto"
Cohesion: 0.40
Nodes (3): @playwright/test, applySessionCookie(), generateSessionCookie()

### Community 62 - "PaperBuilderPage"
Cohesion: 0.07
Nodes (11): Bar(), MultiSetGeneratorModal(), PaperBuilderPage(), handleAutofill(), PaperImportModal(), COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset (+3 more)

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 394 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `blueprints/[id]/page.tsx`, `FigureStudio.tsx`, `package.json`, `PaperSheets.tsx`, `ErrorBanner`, `solutions/page.tsx`, `blueprints/[id]/page.tsx`, `ui.tsx`, `PaperBuilderPage`, `blueprints/page.tsx`, `PaperPreflightModal.tsx`, `AppShell.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0627027027027027 - nodes in this community are weakly interconnected._
- **Why does `api()` connect `api` to `PaperSheets.tsx`, `syllabusImport.ts`, `ErrorBanner`, `solutions/page.tsx`, `blueprints/[id]/page.tsx`, `QuestionsPage`, `ui.tsx`, `papers/[id]/page.tsx`, `PaperBuilderPage`, `blueprints/page.tsx`, `QuestionPicker`, `AppShell.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `blueprints/[id]/page.tsx`, `FigureStudio.tsx`, `package.json`, `ErrorBanner`, `solutions/page.tsx`, `blueprints/[id]/page.tsx`, `vitest`, `ui.tsx`, `PaperBuilderPage`, `blueprints/page.tsx`, `PaperPreflightModal.tsx`, `AppShell.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `FigureStudio.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._