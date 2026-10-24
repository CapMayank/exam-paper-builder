# Graph Report - exam-paper-builder  (2026-10-24)

## Corpus Check
- 244 files · ~351,041 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1473 nodes · 5400 edges · 57 communities (53 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `684bb6ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- register/route.ts
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
- BlueprintImportModal.tsx
- blueprints/[id]/page.tsx
- gemini.ts
- logic.test.ts
- HttpError
- QuestionForm.tsx
- render.ts
- devDependencies
- hitTest
- classes/page.tsx
- api.ts
- AppShell.tsx
- ErrorBanner
- books/page.tsx
- PaperSheets.tsx
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
- audit-paper/route.ts
- lib/types.ts
- math.ts
- body
- export-docx/route.ts
- eslint.config.mjs
- README.md
- toQuestionDto
- AGENTS.md
- deploy.sh
- api
- parseMatchColumnPairs
- constants.ts
- blueprints/page.tsx
- blueprints/[id]/page.tsx
- seed-kindergarten.mjs
- papers/[id]/page.tsx

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

## Communities (57 total, 4 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.07
Nodes (48): react, CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint(), numberGridPlugin (+40 more)

### Community 1 - "register/route.ts"
Cohesion: 0.24
Nodes (11): POST, POST, codeMatches(), POST, endSession(), parseRawSessionCookie(), secret(), sessionUserId() (+3 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.11
Nodes (32): POST, AIBlueprintModalProps, PaperImportModal(), PaperImportModalProps, inferExamTypeFromText(), resolvePaperExamType(), BlueprintSectionCandidate, ChapterVerificationResult (+24 more)

### Community 3 - "batchQuestionIo.ts"
Cohesion: 0.07
Nodes (52): RFC-4180, assert(), runServerChecks(), MultiSetGeneratorModal(), QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport (+44 more)

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
Cohesion: 0.09
Nodes (24): AuditAction, addItemSchema, changePasswordSchema, classSectionInputSchema, classSubjectSchema, combineBooksSchema, editPaperItemSchema, loginSchema (+16 more)

### Community 8 - "dto.ts"
Cohesion: 0.15
Nodes (24): @prisma/client, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, NUMBERING_STYLES, PRINT_DENSITIES, QUESTION_TYPES (+16 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.11
Nodes (34): POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON, SyllabusImportModal(), handleAiScan() (+26 more)

### Community 10 - "vitest"
Cohesion: 0.15
Nodes (20): Architecture, Code Layout, Interface Contracts, M1 (RBAC & Ownership), M3 (Question Exhaustion Tagging), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, vitest (+12 more)

### Community 11 - "prisma.ts"
Cohesion: 0.23
Nodes (22): POST, POST, POST, POST, DELETE, editableItem(), PATCH, PUT (+14 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.35
Nodes (14): PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject(), normalizeAcademicSession(), normalizeSectionDetails(), syncClassesFromBooks() (+6 more)

### Community 14 - "BlueprintImportModal.tsx"
Cohesion: 0.16
Nodes (20): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent(), BlueprintImportModalProps, BlueprintImportData, BlueprintImportResult, ImportedChapterQuota (+12 more)

### Community 15 - "blueprints/[id]/page.tsx"
Cohesion: 0.10
Nodes (33): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleImportedBlueprint(), moveSectionGroup(), removeSectionGroup(), save(), newQuestionType() (+25 more)

### Community 16 - "gemini.ts"
Cohesion: 0.05
Nodes (55): prisma, UPLOAD_DIR, improveSchema, POST, parseSchema, POST, figureSchema, POST (+47 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.17
Nodes (15): autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot, BlueprintDef (+7 more)

### Community 18 - "HttpError"
Cohesion: 0.12
Nodes (20): parseBlueprintSchema, POST, GET, POST, DELETE, GET, PATCH, DELETE (+12 more)

### Community 19 - "QuestionForm.tsx"
Cohesion: 0.15
Nodes (15): AIQuestionImproverModal(), MathToolbar(), DEFAULT_ASSERTION_OPTIONS_EN, DEFAULT_ASSERTION_OPTIONS_HI, DEFAULT_SPACE, getDefaultSubpartsForType(), getSubpartLabel(), QuestionForm() (+7 more)

### Community 20 - "render.ts"
Cohesion: 0.19
Nodes (24): FigureStudio(), hasBoxFields(), angleGeom, boxCenter(), boxCorners(), boxHandlePos(), hatchGeometry(), applyStyle() (+16 more)

### Community 21 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/turbopack, @types/katex, @types/node (+4 more)

### Community 22 - "hitTest"
Cohesion: 0.13
Nodes (24): axesLayout(), boxToWorld(), clamp(), constrainAngle(), deg(), dist(), distToPolyline(), distToSeg() (+16 more)

### Community 23 - "classes/page.tsx"
Cohesion: 0.11
Nodes (24): ClassesHierarchyPage(), addMissingStandardSubjects(), addSectionToClass(), deleteClass(), deleteSubject(), removeSectionFromClass(), saveClass(), saveSubject() (+16 more)

### Community 24 - "api.ts"
Cohesion: 0.10
Nodes (33): zod, POST, generateSchema, GET, POST, GET, POST, DELETE (+25 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.16
Nodes (15): AppLayout(), AcademicSessionSelector(), handleAddCustom(), AppShell(), signOut(), isActive(), NAV, NavList() (+7 more)

### Community 26 - "ErrorBanner"
Cohesion: 0.31
Nodes (9): UsersAdminPage(), ErrorBanner(), SuccessBanner(), DetailedProfile, UserProfileModal(), USER_ROLE_LABEL, USER_ROLES, UserRole (+1 more)

### Community 27 - "books/page.tsx"
Cohesion: 0.15
Nodes (22): nextConfig, next, BooksPage(), removeBook(), removeChapter(), run(), saveBook(), saveChapter() (+14 more)

### Community 28 - "PaperSheets.tsx"
Cohesion: 0.27
Nodes (11): PrintPage(), BlankPage(), Block, Page(), PaperSheets(), renderBlock(), SheetsInfo, isBookletLayout() (+3 more)

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
Cohesion: 0.21
Nodes (7): POST, ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

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
Cohesion: 0.20
Nodes (15): server-only, DELETE, GET, PUT, GET, POST, diagnosePaperImplications(), assertBlueprintValid() (+7 more)

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "audit-paper/route.ts"
Cohesion: 0.67
Nodes (3): auditSchema, POST, auditPaperWithGemini()

### Community 40 - "lib/types.ts"
Cohesion: 0.12
Nodes (26): M2 (Section Enrollment & Print Logistics), getSectionsForClass(), Tab, PaperImplication, SessionSlot, TimetableStatus, calculatePrintLogistics(), calculateSheetsPerCopy() (+18 more)

### Community 42 - "math.ts"
Cohesion: 0.21
Nodes (16): splitOutsideMath(), cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX (+8 more)

### Community 43 - "body"
Cohesion: 0.11
Nodes (23): bcryptjs, POST, POST, POST, GET, POST, DELETE, POST (+15 more)

### Community 44 - "export-docx/route.ts"
Cohesion: 0.23
Nodes (19): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), buildBlocks(), extractSectionLetter() (+11 more)

### Community 46 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "toQuestionDto"
Cohesion: 0.20
Nodes (13): Feature Inventory, GET, GET, DELETE, GET, PATCH, PUT, GET (+5 more)

### Community 54 - "api"
Cohesion: 0.05
Nodes (51): lucide-react, QuestionExportModal(), QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), handleBulkDelete(), handleBulkUpdateDifficulty() (+43 more)

### Community 55 - "parseMatchColumnPairs"
Cohesion: 0.14
Nodes (34): getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), MathText(), submit(), QuestionPicker(), add(), handleAcceptAiQuestion() (+26 more)

### Community 56 - "constants.ts"
Cohesion: 0.08
Nodes (25): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, Layout, MARKS_STYLE_LABEL, MatchColumnPair, MAX_OPTIONS, MIN_OPTIONS (+17 more)

### Community 57 - "blueprints/page.tsx"
Cohesion: 0.12
Nodes (22): BlueprintsPage(), remove(), subjectMatches(), Filter, PapersPage(), handleBatchDelete(), handleBatchFinalize(), remove() (+14 more)

### Community 59 - "blueprints/[id]/page.tsx"
Cohesion: 0.43
Nodes (5): BlueprintTemplateModal(), BlueprintTemplateModalProps, BlueprintTemplate, BlueprintTemplateSectionGroup, STANDARD_BLUEPRINT_TEMPLATES

### Community 62 - "papers/[id]/page.tsx"
Cohesion: 0.09
Nodes (29): Bar(), PaperBuilderPage(), handleAutofill(), OmrSheetPage(), AIPaperGeneratorModal(), AIPaperGeneratorModalProps, DiagramSearchModal(), DiagramSearchModalProps (+21 more)

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 383 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `kindergarten/types.ts` to `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `lib/types.ts`, `blueprints/[id]/page.tsx`, `syllabusImport.ts`, `BlueprintImportModal.tsx`, `blueprints/[id]/page.tsx`, `QuestionForm.tsx`, `AppShell.tsx`, `parseMatchColumnPairs`, `api`, `classes/page.tsx`, `blueprints/page.tsx`, `ErrorBanner`, `books/page.tsx`, `PaperSheets.tsx`, `papers/[id]/page.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07002012072434607 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `api` to `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `syllabusImport.ts`, `vitest`, `BlueprintImportModal.tsx`, `blueprints/[id]/page.tsx`, `QuestionForm.tsx`, `classes/page.tsx`, `AppShell.tsx`, `ErrorBanner`, `books/page.tsx`, `PaperSheets.tsx`, `lib/types.ts`, `parseMatchColumnPairs`, `blueprints/page.tsx`, `blueprints/[id]/page.tsx`, `papers/[id]/page.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10963455149501661 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `paperImport.ts`, `batchQuestionIo.ts`, `package.json`, `schemas.ts`, `dto.ts`, `syllabusImport.ts`, `prisma.ts`, `classes/route.ts`, `BlueprintImportModal.tsx`, `blueprints/[id]/page.tsx`, `gemini.ts`, `logic.test.ts`, `HttpError`, `QuestionForm.tsx`, `subpartsTotalMarks`, `paperAutogen.ts`, `studio.test.ts`, `lib/types.ts`, `math.ts`, `body`, `export-docx/route.ts`, `parseMatchColumnPairs`, `blueprints/[id]/page.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `batchQuestionIo.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06558118498417007 - nodes in this community are weakly interconnected._