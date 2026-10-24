# Graph Report - exam-paper-builder  (2026-10-24)

## Corpus Check
- 241 files · ~341,321 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1459 nodes · 5222 edges · 58 communities (54 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b17caaa9`
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
- papers/[id]/page.tsx
- dto.ts
- syllabusImport.ts
- vitest
- loadPaperView
- time
- classes/route.ts
- BlueprintImportModal.tsx
- QuestionImportModal
- multiset.ts
- lib/types.ts
- api.ts
- schemas.ts
- render.ts
- teacher-audit-fixes.test.ts
- hitTest
- blueprints/[id]/page.tsx
- api
- AppShell.tsx
- register/route.ts
- exam-cell/page.tsx
- PaperSheets.tsx
- compilerOptions
- export-docx/route.ts
- app/layout.tsx
- subpartsTotalMarks
- BlueprintTemplateModal.tsx
- paperAutogen.ts
- e2e.mjs
- api.ts
- studio.test.ts
- text.ts
- blueprint.ts
- solutions/page.tsx
- PaperBuilderPage
- math.ts
- recordAudit
- HttpError
- constants.ts
- BlueprintEditorPage
- blueprintExport.ts
- autofill.ts
- README.md
- toQuestionDto
- AGENTS.md
- deploy.sh
- Modal
- parseMatchColumnPairs
- BlueprintImportModal
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

## Communities (58 total, 4 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.06
Nodes (53): attach(), submit(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin (+45 more)

### Community 1 - "gemini.ts"
Cohesion: 0.05
Nodes (51): prisma, UPLOAD_DIR, generateSchema, POST, improveSchema, POST, GET, POST (+43 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.12
Nodes (29): POST, PaperImportModal(), inferExamTypeFromText(), resolvePaperExamType(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion (+21 more)

### Community 3 - "batchQuestionIo.ts"
Cohesion: 0.13
Nodes (28): RFC-4180, QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat, BatchParseOptions, ChapterResolver (+20 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.04
Nodes (45): eslintConfig, dependencies, bcryptjs, docx, katex, lucide-react, next, @prisma/client (+37 more)

### Community 7 - "papers/[id]/page.tsx"
Cohesion: 0.08
Nodes (42): M1 (RBAC & Ownership), lucide-react, react, AcademicSessionSelectorProps, AIPaperAuditModalProps, AIPaperGeneratorModal(), AIPaperGeneratorModalProps, AIQuestionImproverModal() (+34 more)

### Community 8 - "dto.ts"
Cohesion: 0.15
Nodes (24): @prisma/client, vitest, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, MarksStyle, NUMBERING_STYLES (+16 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.09
Nodes (36): parseSchema, POST, POST, openBookDialog(), EditableChapter, SyllabusImportModal(), handleAiScan(), handleImport() (+28 more)

### Community 10 - "vitest"
Cohesion: 0.29
Nodes (11): M3 (Question Exhaustion Tagging), CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage(), parseCompactExamTag() (+3 more)

### Community 11 - "loadPaperView"
Cohesion: 0.15
Nodes (27): POST, POST, GET, POST, POST, POST, POST, POST (+19 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.25
Nodes (17): POST, GET, POST, PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject() (+9 more)

### Community 14 - "BlueprintImportModal.tsx"
Cohesion: 0.22
Nodes (16): BlueprintImportModalProps, BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, normalizeExamType(), normalizeQuestionType(), parseBlueprintImport() (+8 more)

### Community 15 - "QuestionImportModal"
Cohesion: 0.50
Nodes (3): QuestionImportModal(), handleFileChange(), validateContent()

### Community 16 - "multiset.ts"
Cohesion: 0.19
Nodes (17): serializeQuestionsToCsv, serializeQuestionsToJson, BlueprintSectionDef, calculateSectionOverlap(), CandidateQuestionDef, formatSetIdentifier(), LETTERS, MultiSetPlanResult (+9 more)

### Community 17 - "lib/types.ts"
Cohesion: 0.16
Nodes (18): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, AuditLogEntry (+10 more)

### Community 18 - "api.ts"
Cohesion: 0.13
Nodes (22): server-only, zod, parseBlueprintSchema, figureSchema, GET, updateSubjectSchema, duplicateSetSchema, parallelSetsSchema (+14 more)

### Community 19 - "schemas.ts"
Cohesion: 0.09
Nodes (22): GET, POST, GET, POST, AuditAction, addItemSchema, changePasswordSchema, classSectionInputSchema (+14 more)

### Community 20 - "render.ts"
Cohesion: 0.19
Nodes (24): FigureStudio(), hasBoxFields(), angleGeom, boxCenter(), boxCorners(), boxHandlePos(), hatchGeometry(), applyStyle() (+16 more)

### Community 21 - "teacher-audit-fixes.test.ts"
Cohesion: 0.43
Nodes (5): PaperPreflightModal(), PaperPreflightModalProps, PreflightIssue, PreflightReport, validatePaperPreflight()

### Community 22 - "hitTest"
Cohesion: 0.13
Nodes (24): axesLayout(), boxToWorld(), clamp(), constrainAngle(), deg(), dist(), distToPolyline(), distToSeg() (+16 more)

### Community 23 - "blueprints/[id]/page.tsx"
Cohesion: 0.13
Nodes (33): BlueprintsPage(), subjectMatches(), BooksPage(), emptyBook, Filter, PapersPage(), handleBatchDelete(), handleBatchFinalize() (+25 more)

### Community 24 - "api"
Cohesion: 0.10
Nodes (28): remove(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage(), addMissingStandardSubjects() (+20 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.14
Nodes (17): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), AppShell(), signOut(), isActive() (+9 more)

### Community 26 - "register/route.ts"
Cohesion: 0.16
Nodes (14): Architecture, Code Layout, Interface Contracts, M2 (Section Enrollment & Print Logistics), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, POST, endSession() (+6 more)

### Community 27 - "exam-cell/page.tsx"
Cohesion: 0.11
Nodes (31): nextConfig, next, UsersAdminPage(), ExamCellPage(), getSectionsForClass(), Tab, DashboardPage(), Data (+23 more)

### Community 28 - "PaperSheets.tsx"
Cohesion: 0.13
Nodes (25): assert(), runServerChecks(), PrintPage(), BlankPage(), Block, buildBlocks(), extractSectionLetter(), Page() (+17 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "export-docx/route.ts"
Cohesion: 0.39
Nodes (10): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), formatQuestionNumber(), DocxTextStyle (+2 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "subpartsTotalMarks"
Cohesion: 0.17
Nodes (14): validateChoiceParity(), getEligible(), selectVariantCandidates(), getEffectiveQuestionMarks(), ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput (+6 more)

### Community 33 - "BlueprintTemplateModal.tsx"
Cohesion: 0.39
Nodes (6): BlueprintTemplateModalProps, ParsedQuestionItem, QuestionType, BlueprintTemplate, BlueprintTemplateSectionGroup, STANDARD_BLUEPRINT_TEMPLATES

### Community 34 - "paperAutogen.ts"
Cohesion: 0.40
Nodes (4): PaperAutogenInput, PaperAutogenPlan, PaperAutogenSectionPlan, PaperAutogenSlot

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "api.ts"
Cohesion: 0.29
Nodes (11): DELETE, GET, PUT, GET, POST, diagnosePaperImplications(), assertBlueprintValid(), blueprintInclude (+3 more)

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "blueprint.ts"
Cohesion: 0.16
Nodes (14): handleImportedBlueprint(), ChapterQuota, checkBlueprintFeasibility(), DiagnosticItem, flattenSectionGroups(), getItemMarks(), getItemUnits(), groupSectionsFromFlat() (+6 more)

### Community 40 - "solutions/page.tsx"
Cohesion: 0.24
Nodes (18): OmrSheetPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), DiagramSearchModalProps, LETTERS_LIST, QuestionRenderMode, ROMAN_LOWER (+10 more)

### Community 41 - "PaperBuilderPage"
Cohesion: 0.09
Nodes (10): Bar(), MultiSetGeneratorModal(), PaperBuilderPage(), handleAutofill(), COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS (+2 more)

### Community 42 - "math.ts"
Cohesion: 0.23
Nodes (15): cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX, isEntirelyMath() (+7 more)

### Community 43 - "recordAudit"
Cohesion: 0.16
Nodes (13): POST, DELETE, PATCH, GET, PATCH, GET, handleZipExport(), POST (+5 more)

### Community 44 - "HttpError"
Cohesion: 0.09
Nodes (38): bcryptjs, auditSchema, POST, POST, POST, GET, POST, codeMatches() (+30 more)

### Community 45 - "constants.ts"
Cohesion: 0.08
Nodes (25): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL, MatchColumnPair, MAX_OPTIONS, MIN_OPTIONS, NUMBERING_STYLE_LABEL (+17 more)

### Community 46 - "BlueprintEditorPage"
Cohesion: 0.17
Nodes (10): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), moveSectionGroup(), removeSectionGroup(), save(), newQuestionType(), newSectionGroup() (+2 more)

### Community 47 - "blueprintExport.ts"
Cohesion: 0.44
Nodes (8): BlueprintJsonModal(), BlueprintJsonModalProps, BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson, getBlueprintJsonFilename()

### Community 48 - "autofill.ts"
Cohesion: 0.24
Nodes (9): autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot, BlueprintDef (+1 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "toQuestionDto"
Cohesion: 0.14
Nodes (19): Feature Inventory, GET, bulkRequestSchema, legacyBulkSchema, modernBulkSchema, POST, GET, DELETE (+11 more)

### Community 54 - "Modal"
Cohesion: 0.08
Nodes (29): AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, BlueprintRolloverModal(), BlueprintRolloverModalProps, CombineBooksModal(), CombineBooksModalProps (+21 more)

### Community 55 - "parseMatchColumnPairs"
Cohesion: 0.43
Nodes (7): add(), handleAcceptAiQuestion(), cleanMatchItem(), extractColumnIIItems(), extractColumnIItems(), parseMatchColumnPairs(), splitOutsideMath()

### Community 56 - "BlueprintImportModal"
Cohesion: 0.38
Nodes (5): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent(), matchChaptersToBook()

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 382 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `BlueprintTemplateModal.tsx`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `solutions/page.tsx`, `PaperBuilderPage`, `BlueprintImportModal.tsx`, `blueprintExport.ts`, `teacher-audit-fixes.test.ts`, `Modal`, `blueprints/[id]/page.tsx`, `AppShell.tsx`, `exam-cell/page.tsx`, `PaperSheets.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06015037593984962 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `BlueprintTemplateModal.tsx`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `solutions/page.tsx`, `PaperBuilderPage`, `vitest`, `BlueprintImportModal.tsx`, `blueprintExport.ts`, `teacher-audit-fixes.test.ts`, `Modal`, `blueprints/[id]/page.tsx`, `AppShell.tsx`, `exam-cell/page.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `gemini.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05352112676056338 - nodes in this community are weakly interconnected._
- **Why does `api()` connect `api` to `papers/[id]/page.tsx`, `solutions/page.tsx`, `PaperBuilderPage`, `syllabusImport.ts`, `BlueprintEditorPage`, `BlueprintImportModal.tsx`, `Modal`, `blueprints/[id]/page.tsx`, `BlueprintImportModal`, `AppShell.tsx`, `exam-cell/page.tsx`, `PaperSheets.tsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11923076923076924 - nodes in this community are weakly interconnected._