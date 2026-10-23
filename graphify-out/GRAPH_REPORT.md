# Graph Report - exam-paper-builder  (2026-10-23)

## Corpus Check
- 229 files · ~324,211 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1408 nodes · 4952 edges · 49 communities (46 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ae89e3c3`
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
- schemas.ts
- syllabusImport.ts
- blueprints/page.tsx
- m1-rbac-adversarial-stress.test.ts
- time
- schemas.ts
- lib/types.ts
- lucide-react
- subpartsTotalMarks
- PaperData
- logic.test.ts
- HttpError
- render.ts
- QuestionForm.tsx
- hitTest
- api
- questions/page.tsx
- AppShell.tsx
- recordAudit
- devDependencies
- dependencies
- compilerOptions
- solutions/page.tsx
- app/layout.tsx
- scripts
- blueprints/[id]/page.tsx
- PaperBuilderPage
- e2e.mjs
- api.ts
- studio.test.ts
- text.ts
- export-docx/route.ts
- constants.ts
- eslint.config.mjs
- PaperSheets.tsx
- print-logistics.ts
- README.md
- toQuestionDto
- AGENTS.md
- deploy.sh

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 124 edges
2. `body()` - 82 edges
3. `api()` - 80 edges
4. `recordAudit()` - 66 edges
5. `route()` - 65 edges
6. `prisma` - 62 edges
7. `Modal()` - 57 edges
8. `react` - 55 edges
9. `loadPaperView()` - 51 edges
10. `lucide-react` - 45 edges

## Surprising Connections (you probably didn't know these)
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `Architecture` --references--> `SessionUser`  [INFERRED]
  PROJECT.md → src/lib/api.ts
- `M2 (Section Enrollment & Print Logistics)` --references--> `toAcademicClassDto()`  [INFERRED]
  PROJECT.md → src/lib/classes.ts
- `M1 (RBAC & Ownership)` --references--> `toQuestionDto()`  [INFERRED]
  PROJECT.md → src/lib/dto.ts
- `Feature Inventory` --references--> `AcademicClassDto`  [INFERRED]
  PROJECT.md → src/lib/types.ts

## Import Cycles
- None detected.

## Communities (49 total, 3 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.07
Nodes (48): react, CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint(), numberGridPlugin (+40 more)

### Community 1 - "gemini.ts"
Cohesion: 0.05
Nodes (52): prisma, UPLOAD_DIR, generateSchema, POST, improveSchema, POST, parseSchema, POST (+44 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.11
Nodes (32): POST, GET, PaperImportModal(), PaperImportModalProps, inferExamTypeFromText(), resolvePaperExamType(), BlueprintSectionCandidate, ChapterVerificationResult (+24 more)

### Community 3 - "batchQuestionIo.ts"
Cohesion: 0.08
Nodes (45): RFC-4180, GET, MultiSetGeneratorModal(), BatchImportError, BatchImportOptions, BatchIoFormat, BatchParseOptions, ChapterResolver (+37 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, version, prisma, react-dom, tailwindcss, @tailwindcss/turbopack, @types/katex (+4 more)

### Community 7 - "Modal"
Cohesion: 0.07
Nodes (31): PrintPage(), AIBlueprintModal(), AIBlueprintModalProps, ChapterDraft, SectionDraft, AIPaperAuditModalProps, AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps (+23 more)

### Community 8 - "schemas.ts"
Cohesion: 0.10
Nodes (38): M3 (Question Exhaustion Tagging), @prisma/client, vitest, prisma, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory (+30 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.11
Nodes (33): POST, EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON, SyllabusImportModal(), handleAiScan(), handleImport() (+25 more)

### Community 10 - "blueprints/page.tsx"
Cohesion: 0.13
Nodes (26): BlueprintsPage(), remove(), subjectMatches(), BooksPage(), openBookDialog(), removeBook(), removeChapter(), run() (+18 more)

### Community 11 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.13
Nodes (36): Feature Inventory, auditSchema, POST, POST, POST, GET, POST, POST (+28 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "schemas.ts"
Cohesion: 0.12
Nodes (32): POST, GET, POST, PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject() (+24 more)

### Community 14 - "lib/types.ts"
Cohesion: 0.12
Nodes (27): UsersAdminPage(), ExamCellPage(), getSectionsForClass(), Tab, ErrorBanner(), Skeleton(), SuccessBanner(), DetailedProfile (+19 more)

### Community 15 - "lucide-react"
Cohesion: 0.12
Nodes (22): nextConfig, lucide-react, next, DashboardPage(), Data, Filter, LoginPage(), AcademicSessionSelectorProps (+14 more)

### Community 16 - "subpartsTotalMarks"
Cohesion: 0.22
Nodes (7): getEffectiveQuestionMarks(), ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 17 - "PaperData"
Cohesion: 0.16
Nodes (14): AIPaperGeneratorModalProps, PaperPreflightModal(), PaperPreflightModalProps, SectionAiModalProps, GeneratedPaperQuestion, PaperAutogenInput, PaperAutogenPlan, PaperAutogenSectionPlan (+6 more)

### Community 18 - "logic.test.ts"
Cohesion: 0.15
Nodes (19): assert(), runServerChecks(), DEFAULT_SPACE, parseBulkQuestions(), ParsedQuestionItem, QuestionType, bookletPageCount(), imposeBooklet() (+11 more)

### Community 19 - "HttpError"
Cohesion: 0.07
Nodes (45): zod, parseBlueprintSchema, POST, figureSchema, POST, GET, POST, codeMatches() (+37 more)

### Community 20 - "render.ts"
Cohesion: 0.19
Nodes (24): FigureStudio(), hasBoxFields(), angleGeom, boxCenter(), boxCorners(), boxHandlePos(), hatchGeometry(), applyStyle() (+16 more)

### Community 21 - "QuestionForm.tsx"
Cohesion: 0.10
Nodes (31): AIQuestionImproverModal(), MathText(), MathCategory, MathSnippet, MathToolbar(), SNIPPETS, DEFAULT_ASSERTION_OPTIONS_EN, DEFAULT_ASSERTION_OPTIONS_HI (+23 more)

### Community 22 - "hitTest"
Cohesion: 0.13
Nodes (24): axesLayout(), boxToWorld(), clamp(), constrainAngle(), deg(), dist(), distToPolyline(), distToSeg() (+16 more)

### Community 23 - "api"
Cohesion: 0.12
Nodes (26): save(), ClassesHierarchyPage(), addMissingStandardSubjects(), addSectionToClass(), deleteClass(), deleteSubject(), removeSectionFromClass(), saveClass() (+18 more)

### Community 24 - "questions/page.tsx"
Cohesion: 0.24
Nodes (8): QuestionExportModal(), QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), Field(), BatchImportReport, QuestionDto

### Community 25 - "AppShell.tsx"
Cohesion: 0.17
Nodes (14): AppLayout(), AcademicSessionSelector(), handleAddCustom(), AppShell(), signOut(), isActive(), NAV, NavList() (+6 more)

### Community 26 - "recordAudit"
Cohesion: 0.08
Nodes (35): bcryptjs, server-only, POST, GET, POST, DELETE, PATCH, GET (+27 more)

### Community 27 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/turbopack, @types/katex, @types/node (+4 more)

### Community 28 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, docx, katex, lucide-react, next, @prisma/client, react (+3 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "solutions/page.tsx"
Cohesion: 0.49
Nodes (9): OmrSheetPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), imageUrl(), cleanOptionText(), isMcqLikeType(), normalizeMcqAnswer() (+1 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, seed, start, test

### Community 33 - "blueprints/[id]/page.tsx"
Cohesion: 0.06
Nodes (63): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleImportedBlueprint(), moveSectionGroup(), removeSectionGroup(), newQuestionType(), newSectionGroup() (+55 more)

### Community 34 - "PaperBuilderPage"
Cohesion: 0.10
Nodes (7): Bar(), PaperBuilderPage(), DiagramSearchModal(), QuestionPicker(), add(), handleAcceptAiQuestion(), SectionAiModal()

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "api.ts"
Cohesion: 0.30
Nodes (11): GET, PUT, GET, POST, diagnosePaperImplications(), assertBlueprintValid(), blueprintInclude, BlueprintInput (+3 more)

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
Cohesion: 0.10
Nodes (31): AIPaperGeneratorModal(), PaperCompareModal(), PaperCompareModalProps, AcademicSession, cleanMatchItem(), extractColumnIItems(), getMatchColumnInstruction(), KINDERGARTEN_QUESTION_TYPES (+23 more)

### Community 41 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 44 - "PaperSheets.tsx"
Cohesion: 0.26
Nodes (12): BlankPage(), Block, buildBlocks(), extractSectionLetter(), Page(), PaperSheets(), renderBlock(), DEFAULT_SCHOOL_LOGO (+4 more)

### Community 46 - "print-logistics.ts"
Cohesion: 0.12
Nodes (23): Architecture, Code Layout, Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, POST (+15 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "toQuestionDto"
Cohesion: 0.21
Nodes (10): GET, bulkRequestSchema, legacyBulkSchema, modernBulkSchema, POST, GET, GET, include (+2 more)

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 376 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `kindergarten/types.ts` to `blueprints/[id]/page.tsx`, `gemini.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `Modal`, `constants.ts`, `syllabusImport.ts`, `blueprints/page.tsx`, `PaperSheets.tsx`, `lib/types.ts`, `lucide-react`, `PaperData`, `QuestionForm.tsx`, `api`, `questions/page.tsx`, `AppShell.tsx`, `solutions/page.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07002012072434607 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `schemas.ts` to `blueprints/[id]/page.tsx`, `gemini.ts`, `batchQuestionIo.ts`, `paperImport.ts`, `studio.test.ts`, `package.json`, `syllabusImport.ts`, `m1-rbac-adversarial-stress.test.ts`, `schemas.ts`, `print-logistics.ts`, `subpartsTotalMarks`, `PaperData`, `logic.test.ts`, `QuestionForm.tsx`, `recordAudit`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `gemini.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05060882800608828 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `kindergarten/types.ts`, `blueprints/[id]/page.tsx`, `gemini.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `Modal`, `constants.ts`, `schemas.ts`, `blueprints/page.tsx`, `syllabusImport.ts`, `lib/types.ts`, `PaperData`, `QuestionForm.tsx`, `api`, `questions/page.tsx`, `AppShell.tsx`, `solutions/page.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10963455149501661 - nodes in this community are weakly interconnected._