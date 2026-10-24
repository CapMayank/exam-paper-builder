# Graph Report - exam-paper-builder  (2026-10-24)

## Corpus Check
- 242 files · ~346,053 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1462 nodes · 5305 edges · 62 communities (57 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9bc1f06c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- diagram-search.ts
- paperImport.ts
- batchQuestionIo.ts
- FigureStudio.tsx
- geometry.ts
- package.json
- schemas.ts
- dto.ts
- syllabusImport.ts
- vitest
- prisma.ts
- time
- classes/route.ts
- blueprint.ts
- QuestionImportModal
- gemini.ts
- logic.test.ts
- body
- QuestionForm
- render.ts
- devDependencies
- hitTest
- blueprints/page.tsx
- api
- AppShell.tsx
- lib/types.ts
- Modal
- PaperBuilderPage
- compilerOptions
- dependencies
- app/layout.tsx
- subpartsTotalMarks
- scripts
- paperAutogen.ts
- e2e.mjs
- api.ts
- studio.test.ts
- text.ts
- multiset.ts
- solutions/page.tsx
- SubjectWorkspaceDrawer.tsx
- math.ts
- recordAudit
- export-docx/route.ts
- MultiSetGeneratorModal
- eslint.config.mjs
- HttpError
- route
- README.md
- toQuestionDto
- AGENTS.md
- deploy.sh
- papers/[id]/page.tsx
- parseMatchColumnPairs
- constants.ts
- blueprints/[id]/page.tsx
- register/route.ts
- QuestionType
- Project: Sarvodaya School Examination Portal — Production Business Logic
- seed-kindergarten.mjs

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 129 edges
2. `api()` - 86 edges
3. `body()` - 82 edges
4. `recordAudit()` - 70 edges
5. `route()` - 67 edges
6. `prisma` - 65 edges
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

## Communities (62 total, 5 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.06
Nodes (50): attach(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint() (+42 more)

### Community 1 - "diagram-search.ts"
Cohesion: 0.11
Nodes (21): prisma, UPLOAD_DIR, GET, POST, GET, TYPE_BY_EXT, EXT_BY_TYPE, POST (+13 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.11
Nodes (31): POST, AIBlueprintModalProps, PaperImportModal(), PaperImportModalProps, inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier() (+23 more)

### Community 3 - "batchQuestionIo.ts"
Cohesion: 0.14
Nodes (26): RFC-4180, QuestionDuplicateModalProps, BatchImportError, BatchImportReport, BatchIoFormat, ChapterResolver, DuplicateRecord, escapeCsvField() (+18 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, version, prisma, react-dom, tailwindcss, @tailwindcss/turbopack, @types/katex (+4 more)

### Community 7 - "schemas.ts"
Cohesion: 0.07
Nodes (31): AuditAction, MAX_OPTIONS, MIN_OPTIONS, SESSION_SLOTS, TIMETABLE_STATUSES, USER_ROLES, addItemSchema, changePasswordSchema (+23 more)

### Community 8 - "dto.ts"
Cohesion: 0.16
Nodes (24): @prisma/client, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, NUMBERING_STYLES, PRINT_DENSITIES, BlueprintDto (+16 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.10
Nodes (36): POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON, SyllabusImportModal(), handleAiScan() (+28 more)

### Community 10 - "vitest"
Cohesion: 0.27
Nodes (13): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+5 more)

### Community 11 - "prisma.ts"
Cohesion: 0.15
Nodes (30): POST, POST, POST, POST, POST, POST, DELETE, editableItem() (+22 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.35
Nodes (14): PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject(), normalizeAcademicSession(), normalizeSectionDetails(), syncClassesFromBooks() (+6 more)

### Community 14 - "blueprint.ts"
Cohesion: 0.06
Nodes (53): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleImportedBlueprint(), moveSectionGroup(), removeSectionGroup(), save(), newQuestionType() (+45 more)

### Community 15 - "QuestionImportModal"
Cohesion: 0.50
Nodes (3): QuestionImportModal(), handleFileChange(), validateContent()

### Community 16 - "gemini.ts"
Cohesion: 0.10
Nodes (29): improveSchema, POST, parseSchema, POST, GET, getMaxPaperDiagramBudget(), isSectionVisuallyEligible(), isSubjectChapterVisual() (+21 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.14
Nodes (20): assert(), runServerChecks(), autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits() (+12 more)

### Community 18 - "body"
Cohesion: 0.08
Nodes (28): zod, auditSchema, generateSchema, POST, parseBlueprintSchema, POST, figureSchema, POST (+20 more)

### Community 19 - "QuestionForm"
Cohesion: 0.18
Nodes (16): getDefaultSubpartsForType(), getSubpartLabel(), QuestionForm(), submit(), LETTERS_LIST, QuestionRenderMode, QuestionView(), ROMAN_LOWER (+8 more)

### Community 20 - "render.ts"
Cohesion: 0.19
Nodes (24): FigureStudio(), hasBoxFields(), angleGeom, boxCenter(), boxCorners(), boxHandlePos(), hatchGeometry(), applyStyle() (+16 more)

### Community 21 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/turbopack, @types/katex, @types/node (+4 more)

### Community 22 - "hitTest"
Cohesion: 0.13
Nodes (24): axesLayout(), boxToWorld(), clamp(), constrainAngle(), deg(), dist(), distToPolyline(), distToSeg() (+16 more)

### Community 23 - "blueprints/page.tsx"
Cohesion: 0.11
Nodes (38): nextConfig, M1 (RBAC & Ownership), next, BlueprintsPage(), subjectMatches(), BooksPage(), removeBook(), emptyBook (+30 more)

### Community 24 - "api"
Cohesion: 0.08
Nodes (31): remove(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage(), addMissingStandardSubjects(), addSectionToClass() (+23 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.13
Nodes (18): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), AcademicSessionSelectorProps, AppShell(), signOut() (+10 more)

### Community 26 - "lib/types.ts"
Cohesion: 0.12
Nodes (23): MarksStyle, PrintDensity, SessionSlot, TimetableStatus, UserRole, calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly() (+15 more)

### Community 27 - "Modal"
Cohesion: 0.15
Nodes (24): UsersAdminPage(), ExamCellPage(), getSectionsForClass(), Tab, ConfirmContext, ConfirmOptions, ErrorBanner(), FALLBACK_TOAST (+16 more)

### Community 28 - "PaperBuilderPage"
Cohesion: 0.11
Nodes (22): Bar(), PaperBuilderPage(), handleAutofill(), OmrSheetPage(), PrintPage(), DiagramSearchModalProps, BlankPage(), Block (+14 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, docx, katex, lucide-react, next, @prisma/client, react (+3 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "subpartsTotalMarks"
Cohesion: 0.22
Nodes (7): getEffectiveQuestionMarks(), ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 33 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, seed, start, test

### Community 34 - "paperAutogen.ts"
Cohesion: 0.38
Nodes (5): PaperAutogenInput, PaperAutogenPlan, PaperAutogenSectionPlan, PaperAutogenSlot, planPaperSlotAssignments()

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "api.ts"
Cohesion: 0.31
Nodes (10): GET, PUT, GET, POST, diagnosePaperImplications(), assertBlueprintValid(), blueprintInclude, BlueprintInput (+2 more)

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "multiset.ts"
Cohesion: 0.22
Nodes (15): BlueprintSectionDef, calculateSectionOverlap(), CandidateQuestionDef, formatSetIdentifier(), LETTERS, MultiSetPlanResult, OverlapCalculationResult, permuteMcqOptions() (+7 more)

### Community 40 - "solutions/page.tsx"
Cohesion: 0.29
Nodes (12): getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), PaperPreflightModal(), PaperPreflightModalProps, cleanOptionText(), isMcqLikeType(), isSubpartQuestionType() (+4 more)

### Community 41 - "SubjectWorkspaceDrawer.tsx"
Cohesion: 0.43
Nodes (5): COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS, SubjectWorkspaceDrawerProps

### Community 42 - "math.ts"
Cohesion: 0.23
Nodes (15): cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX, isEntirelyMath() (+7 more)

### Community 43 - "recordAudit"
Cohesion: 0.18
Nodes (20): Feature Inventory, bcryptjs, POST, GET, PATCH, DELETE, PATCH, GET (+12 more)

### Community 44 - "export-docx/route.ts"
Cohesion: 0.39
Nodes (10): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), formatQuestionNumber(), DocxTextStyle (+2 more)

### Community 46 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 47 - "HttpError"
Cohesion: 0.13
Nodes (18): GET, DELETE, POST, DELETE, GET, PATCH, DELETE, PATCH (+10 more)

### Community 48 - "route"
Cohesion: 0.15
Nodes (12): GET, POST, POST, GET, POST, GET, bulkUpdateSchema, POST (+4 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "toQuestionDto"
Cohesion: 0.21
Nodes (10): bulkRequestSchema, legacyBulkSchema, modernBulkSchema, POST, GET, GET, GET, include (+2 more)

### Community 54 - "papers/[id]/page.tsx"
Cohesion: 0.09
Nodes (44): lucide-react, react, AIPaperAuditModal(), AIPaperAuditModalProps, AIPaperGeneratorModal(), AIPaperGeneratorModalProps, AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps (+36 more)

### Community 55 - "parseMatchColumnPairs"
Cohesion: 0.24
Nodes (15): QuestionPicker(), add(), handleAcceptAiQuestion(), handleEditAiQuestion(), SectionAiModal(), handleCommit(), cleanMatchItem(), derangeMatchColumnPairs() (+7 more)

### Community 56 - "constants.ts"
Cohesion: 0.11
Nodes (18): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL, MatchColumnPair, NUMBERING_STYLE_LABEL, PRINT_DENSITY_LABEL, SCHOOL_DISPLAY_NAME (+10 more)

### Community 57 - "blueprints/[id]/page.tsx"
Cohesion: 0.14
Nodes (11): ChapterDraft, SectionDraft, BlueprintRolloverModal(), BlueprintRolloverModalProps, BlueprintTemplateModal(), BlueprintTemplateModalProps, DEFAULT_SCHOOL_NAME, EXAM_TYPE_LABEL (+3 more)

### Community 58 - "register/route.ts"
Cohesion: 0.22
Nodes (12): server-only, POST, POST, codeMatches(), POST, endSession(), parseRawSessionCookie(), secret() (+4 more)

### Community 59 - "QuestionType"
Cohesion: 0.21
Nodes (9): BatchImportOptions, BatchParseOptions, ValidatedQuestionPayload, DEFAULT_SPACE, ParsedQuestionItem, Difficulty, QuestionType, BlueprintTemplateSectionGroup (+1 more)

### Community 60 - "Project: Sarvodaya School Examination Portal — Production Business Logic"
Cohesion: 0.25
Nodes (7): Architecture, Code Layout, Interface Contracts, M2 (Section Enrollment & Print Logistics), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, SectionDetail

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 381 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `solutions/page.tsx`, `SubjectWorkspaceDrawer.tsx`, `syllabusImport.ts`, `blueprint.ts`, `blueprints/page.tsx`, `blueprints/[id]/page.tsx`, `Modal`, `PaperBuilderPage`, `AppShell.tsx`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06354642313546423 - nodes in this community are weakly interconnected._
- **Why does `api()` connect `api` to `solutions/page.tsx`, `syllabusImport.ts`, `blueprint.ts`, `parseMatchColumnPairs`, `papers/[id]/page.tsx`, `blueprints/page.tsx`, `blueprints/[id]/page.tsx`, `Modal`, `PaperBuilderPage`, `AppShell.tsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `diagram-search.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10873440285204991 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `solutions/page.tsx`, `SubjectWorkspaceDrawer.tsx`, `vitest`, `syllabusImport.ts`, `blueprint.ts`, `blueprints/page.tsx`, `blueprints/[id]/page.tsx`, `Modal`, `PaperBuilderPage`, `AppShell.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11033681765389082 - nodes in this community are weakly interconnected._