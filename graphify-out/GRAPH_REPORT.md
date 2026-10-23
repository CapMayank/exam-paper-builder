# Graph Report - exam-paper-builder  (2026-10-23)

## Corpus Check
- 238 files · ~332,784 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1443 nodes · 5111 edges · 56 communities (51 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6552594f`
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
- dto.ts
- syllabusImport.ts
- lib/types.ts
- recordAudit
- time
- schemas.ts
- blueprints/[id]/page.tsx
- (app)/page.tsx
- subpartsTotalMarks
- multiset.ts
- math.ts
- HttpError
- render.ts
- QuestionForm.tsx
- hitTest
- api
- uploads/route.ts
- AppShell.tsx
- body
- diagram-search.ts
- api.ts
- compilerOptions
- PaperData
- app/layout.tsx
- m1-rbac-adversarial-stress.test.ts
- logic.test.ts
- PaperBuilderPage
- e2e.mjs
- api.ts
- studio.test.ts
- text.ts
- export-docx/route.ts
- constants.ts
- subpartsTotalMarks
- Project: Sarvodaya School Examination Portal — Production Business Logic
- QuestionType
- diagram-rules.ts
- parse-syllabus/route.ts
- print-logistics.ts
- paperAutogen.ts
- MultiSetGeneratorModal
- README.md
- m1-rbac-adversarial-stress.test.ts
- AGENTS.md
- deploy.sh
- QuestionImportModal
- seed-kindergarten.mjs

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 129 edges
2. `api()` - 86 edges
3. `body()` - 82 edges
4. `recordAudit()` - 70 edges
5. `route()` - 67 edges
6. `prisma` - 64 edges
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
- `Feature Inventory` --references--> `assertCanModifyPaper()`  [INFERRED]
  PROJECT.md → src/lib/papers.ts

## Import Cycles
- None detected.

## Communities (56 total, 5 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.07
Nodes (42): CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint(), numberGridPlugin, NumberGridPrint() (+34 more)

### Community 1 - "gemini.ts"
Cohesion: 0.12
Nodes (24): improveSchema, POST, GET, auditPaperWithGemini(), callGeminiApi(), FigureStudioPromptResult, GeminiCallResult, GeminiContentPart (+16 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.11
Nodes (31): POST, AIBlueprintModalProps, PaperImportModal(), PaperImportModalProps, inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier() (+23 more)

### Community 3 - "batchQuestionIo.ts"
Cohesion: 0.15
Nodes (24): RFC-4180, GET, BatchImportError, BatchIoFormat, ChapterResolver, DuplicateRecord, escapeCsvField(), exportQuestionsToCsv() (+16 more)

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
Cohesion: 0.08
Nodes (32): react, AIPaperAuditModalProps, AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, AIQuestionImproverModalProps, ImproveTask (+24 more)

### Community 8 - "dto.ts"
Cohesion: 0.17
Nodes (21): @prisma/client, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, NUMBERING_STYLES, PRINT_DENSITIES, BlueprintDto (+13 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.10
Nodes (36): POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON, SyllabusImportModal(), handleAiScan() (+28 more)

### Community 10 - "lib/types.ts"
Cohesion: 0.19
Nodes (18): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+10 more)

### Community 11 - "recordAudit"
Cohesion: 0.12
Nodes (38): POST, POST, GET, POST, POST, POST, duplicateSetSchema, POST (+30 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "schemas.ts"
Cohesion: 0.14
Nodes (29): POST, GET, POST, PATCH, GET, POST, postClassUnionSchema, AuditAction (+21 more)

### Community 14 - "blueprints/[id]/page.tsx"
Cohesion: 0.06
Nodes (59): GET, BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleImportedBlueprint(), moveSectionGroup(), removeSectionGroup(), save() (+51 more)

### Community 15 - "(app)/page.tsx"
Cohesion: 0.18
Nodes (20): UsersAdminPage(), ExamCellPage(), getSectionsForClass(), DashboardPage(), Data, PaperRow(), Progress(), Skeleton() (+12 more)

### Community 16 - "subpartsTotalMarks"
Cohesion: 0.22
Nodes (6): ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 17 - "multiset.ts"
Cohesion: 0.21
Nodes (16): BlueprintSectionDef, calculateSectionOverlap(), CandidateQuestionDef, formatSetIdentifier(), LETTERS, MultiSetPlanResult, nextSetIdentifier(), OverlapCalculationResult (+8 more)

### Community 18 - "math.ts"
Cohesion: 0.27
Nodes (9): katex, convertNaturalMathToTex(), INLINE_PATTERNS, INLINE_REGEX, isEntirelyMath(), MathSegment, parseInlineMathFragments(), parseMathSegments() (+1 more)

### Community 19 - "HttpError"
Cohesion: 0.13
Nodes (17): GET, POST, DELETE, GET, PATCH, DELETE, PATCH, DELETE (+9 more)

### Community 20 - "render.ts"
Cohesion: 0.19
Nodes (24): FigureStudio(), hasBoxFields(), angleGeom, boxCenter(), boxCorners(), boxHandlePos(), hatchGeometry(), applyStyle() (+16 more)

### Community 21 - "QuestionForm.tsx"
Cohesion: 0.08
Nodes (54): getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), AIPaperGeneratorModal(), AIQuestionImproverModal(), DiagramSearchModal(), DiagramSearchModalProps, MathText() (+46 more)

### Community 22 - "hitTest"
Cohesion: 0.13
Nodes (24): axesLayout(), boxToWorld(), clamp(), constrainAngle(), deg(), dist(), distToPolyline(), distToSeg() (+16 more)

### Community 23 - "api"
Cohesion: 0.07
Nodes (65): BlueprintsPage(), remove(), subjectMatches(), BooksPage(), removeBook(), removeChapter(), run(), saveBook() (+57 more)

### Community 24 - "uploads/route.ts"
Cohesion: 0.16
Nodes (8): prisma, UPLOAD_DIR, GET, TYPE_BY_EXT, EXT_BY_TYPE, POST, UPLOAD_DIR, __dirname

### Community 25 - "AppShell.tsx"
Cohesion: 0.10
Nodes (22): nextConfig, lucide-react, next, AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom() (+14 more)

### Community 26 - "body"
Cohesion: 0.09
Nodes (26): zod, auditSchema, POST, generateSchema, POST, parseBlueprintSchema, POST, figureSchema (+18 more)

### Community 27 - "diagram-search.ts"
Cohesion: 0.26
Nodes (13): GET, POST, CURATED_DIAGRAMS, CuratedDiagram, DIAGRAM_STOP_WORDS, DiagramCandidate, DiagramEligibility, findEligibleDiagrams() (+5 more)

### Community 28 - "api.ts"
Cohesion: 0.20
Nodes (14): server-only, POST, POST, codeMatches(), POST, Ctx, loginSchema, endSession() (+6 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "PaperData"
Cohesion: 0.19
Nodes (12): AIPaperGeneratorModalProps, PaperPreflightModal(), PaperPreflightModalProps, PaperSnapshotDrawerProps, SnapshotItem, SectionAiModalProps, GeneratedPaperQuestion, PreflightIssue (+4 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.22
Nodes (6): deva, heading, metadata, noto, ui, viewport

### Community 32 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.12
Nodes (18): bcryptjs, POST, DELETE, POST, DELETE, PATCH, updateSubjectSchema, GET (+10 more)

### Community 33 - "logic.test.ts"
Cohesion: 0.13
Nodes (20): assert(), runServerChecks(), autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits() (+12 more)

### Community 34 - "PaperBuilderPage"
Cohesion: 0.10
Nodes (10): Bar(), PaperBuilderPage(), handleAutofill(), SectionAiModal(), COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS (+2 more)

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
Cohesion: 0.40
Nodes (8): docx, buildPaperDocx(), GET, formatQuestionNumber(), DocxTextStyle, formatMathTextRuns(), formatOptionPairRuns(), cleanLatexToUnicode()

### Community 40 - "constants.ts"
Cohesion: 0.07
Nodes (50): Tab, OmrSheetPage(), PrintPage(), BlueprintRolloverModalProps, BlankPage(), Block, buildBlocks(), extractSectionLetter() (+42 more)

### Community 41 - "subpartsTotalMarks"
Cohesion: 0.26
Nodes (14): editableItem(), PATCH, PUT, whyCannotAdd(), validateChoiceParity(), getEligible(), toPlacedItems(), getEffectiveQuestionMarks() (+6 more)

### Community 42 - "Project: Sarvodaya School Examination Portal — Production Business Logic"
Cohesion: 0.22
Nodes (8): Architecture, Code Layout, Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, SectionDetail

### Community 43 - "QuestionType"
Cohesion: 0.28
Nodes (7): BatchImportOptions, BatchParseOptions, ValidatedQuestionPayload, Difficulty, QuestionType, BlueprintTemplateSectionGroup, STANDARD_BLUEPRINT_TEMPLATES

### Community 44 - "diagram-rules.ts"
Cohesion: 0.70
Nodes (3): getMaxPaperDiagramBudget(), isSectionVisuallyEligible(), isSubjectChapterVisual()

### Community 45 - "parse-syllabus/route.ts"
Cohesion: 0.67
Nodes (3): parseSchema, POST, parseSyllabusWithGemini()

### Community 46 - "print-logistics.ts"
Cohesion: 0.32
Nodes (10): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, AcademicClassDto (+2 more)

### Community 47 - "paperAutogen.ts"
Cohesion: 0.40
Nodes (4): PaperAutogenInput, PaperAutogenPlan, PaperAutogenSectionPlan, PaperAutogenSlot

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.23
Nodes (13): Feature Inventory, DELETE, GET, PATCH, PUT, GET, include, POST (+5 more)

### Community 54 - "QuestionImportModal"
Cohesion: 0.50
Nodes (3): QuestionImportModal(), handleFileChange(), validateContent()

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 380 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Modal` to `kindergarten/types.ts`, `paperImport.ts`, `PaperBuilderPage`, `FigureStudio.tsx`, `package.json`, `constants.ts`, `syllabusImport.ts`, `blueprints/[id]/page.tsx`, `(app)/page.tsx`, `QuestionForm.tsx`, `api`, `AppShell.tsx`, `PaperData`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06861239119303636 - nodes in this community are weakly interconnected._
- **Why does `api()` connect `api` to `PaperBuilderPage`, `Modal`, `constants.ts`, `syllabusImport.ts`, `blueprints/[id]/page.tsx`, `(app)/page.tsx`, `QuestionForm.tsx`, `AppShell.tsx`, `PaperData`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `gemini.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12433862433862433 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `lib/types.ts` to `gemini.ts`, `paperImport.ts`, `batchQuestionIo.ts`, `package.json`, `dto.ts`, `syllabusImport.ts`, `recordAudit`, `schemas.ts`, `blueprints/[id]/page.tsx`, `subpartsTotalMarks`, `multiset.ts`, `QuestionForm.tsx`, `uploads/route.ts`, `diagram-search.ts`, `m1-rbac-adversarial-stress.test.ts`, `logic.test.ts`, `studio.test.ts`, `subpartsTotalMarks`, `QuestionType`, `diagram-rules.ts`, `print-logistics.ts`, `paperAutogen.ts`, `m1-rbac-adversarial-stress.test.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10853658536585366 - nodes in this community are weakly interconnected._