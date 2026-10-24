# Graph Report - exam-paper-builder  (2026-10-24)

## Corpus Check
- 243 files · ~348,049 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1463 nodes · 5338 edges · 62 communities (58 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a00ee79a`
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
- BlueprintImportModal.tsx
- BlueprintEditorPage
- gemini.ts
- logic.test.ts
- HttpError
- QuestionForm.tsx
- render.ts
- devDependencies
- hitTest
- blueprints/page.tsx
- api
- AppShell.tsx
- lib/types.ts
- exam-cell/page.tsx
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
- blueprint.ts
- print-logistics.ts
- ui.tsx
- math.ts
- m1-rbac-adversarial-stress.test.ts
- export-docx/route.ts
- blueprintExport.ts
- eslint.config.mjs
- teacher-audit-fixes.test.ts
- BlueprintImportModal
- README.md
- toQuestionDto
- AGENTS.md
- deploy.sh
- papers/[id]/page.tsx
- parseMatchColumnPairs
- constants.ts
- papers/[id]/page.tsx
- blueprints/[id]/page.tsx
- Project: Sarvodaya School Examination Portal — Production Business Logic
- seed-kindergarten.mjs
- PaperBuilderPage

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

## Communities (62 total, 4 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.06
Nodes (50): attach(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint() (+42 more)

### Community 1 - "diagram-search.ts"
Cohesion: 0.08
Nodes (28): prisma, UPLOAD_DIR, GET, POST, POST, GET, TYPE_BY_EXT, EXT_BY_TYPE (+20 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.15
Nodes (26): POST, inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion, ImportedPaperSection, ImportedPaperSubpart (+18 more)

### Community 3 - "batchQuestionIo.ts"
Cohesion: 0.06
Nodes (59): RFC-4180, assert(), runServerChecks(), MultiSetGeneratorModal(), QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport (+51 more)

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
Nodes (30): server-only, POST, GET, POST, GET, POST, GET, PATCH (+22 more)

### Community 8 - "dto.ts"
Cohesion: 0.14
Nodes (26): @prisma/client, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, MarksStyle, NUMBERING_STYLES, PRINT_DENSITIES (+18 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.11
Nodes (29): POST, openBookDialog(), EditableChapter, SyllabusImportModal(), handleAiScan(), handleImport(), STANDARD_CURRICULUM_PRESETS, rolloverBlueprintsSchema (+21 more)

### Community 10 - "vitest"
Cohesion: 0.27
Nodes (13): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+5 more)

### Community 11 - "prisma.ts"
Cohesion: 0.13
Nodes (39): auditSchema, POST, POST, POST, POST, POST, POST, POST (+31 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.24
Nodes (18): POST, GET, POST, PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject() (+10 more)

### Community 14 - "BlueprintImportModal.tsx"
Cohesion: 0.22
Nodes (17): BlueprintImportModalProps, BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, matchChaptersToBook(), normalizeExamType(), normalizeQuestionType() (+9 more)

### Community 15 - "BlueprintEditorPage"
Cohesion: 0.17
Nodes (10): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), moveSectionGroup(), removeSectionGroup(), save(), newQuestionType(), newSectionGroup() (+2 more)

### Community 16 - "gemini.ts"
Cohesion: 0.09
Nodes (30): improveSchema, POST, parseSchema, POST, figureSchema, POST, GET, getMaxPaperDiagramBudget() (+22 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.20
Nodes (12): autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot, BlueprintDef (+4 more)

### Community 18 - "HttpError"
Cohesion: 0.08
Nodes (48): bcryptjs, zod, generateSchema, POST, parseBlueprintSchema, POST, GET, POST (+40 more)

### Community 19 - "QuestionForm.tsx"
Cohesion: 0.12
Nodes (32): OmrSheetPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), DiagramSearchModal(), DiagramSearchModalProps, DEFAULT_ASSERTION_OPTIONS_EN, DEFAULT_ASSERTION_OPTIONS_HI (+24 more)

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
Cohesion: 0.10
Nodes (35): BlueprintsPage(), subjectMatches(), BooksPage(), removeBook(), removeChapter(), run(), saveBook(), saveChapter() (+27 more)

### Community 24 - "api"
Cohesion: 0.09
Nodes (31): ClassesHierarchyPage(), addMissingStandardSubjects(), addSectionToClass(), deleteClass(), deleteSubject(), removeSectionFromClass(), saveClass(), saveSubject() (+23 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.14
Nodes (14): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), AppShell(), signOut(), UserCard() (+6 more)

### Community 26 - "lib/types.ts"
Cohesion: 0.15
Nodes (12): SessionSlot, TimetableStatus, UserRole, AuditLogEntry, BlueprintData, ClassSubjectDto, ExamTimetableItem, PaperSnapshot (+4 more)

### Community 27 - "exam-cell/page.tsx"
Cohesion: 0.16
Nodes (24): M1 (RBAC & Ownership), UsersAdminPage(), remove(), ExamCellPage(), getSectionsForClass(), Tab, DashboardPage(), Data (+16 more)

### Community 28 - "PaperSheets.tsx"
Cohesion: 0.22
Nodes (15): PrintPage(), BlankPage(), Block, buildBlocks(), extractSectionLetter(), Page(), PaperSheets(), renderBlock() (+7 more)

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
Cohesion: 0.40
Nodes (4): PaperAutogenInput, PaperAutogenPlan, PaperAutogenSectionPlan, PaperAutogenSlot

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "api.ts"
Cohesion: 0.28
Nodes (11): DELETE, GET, PUT, GET, POST, diagnosePaperImplications(), assertBlueprintValid(), blueprintInclude (+3 more)

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "blueprint.ts"
Cohesion: 0.17
Nodes (13): handleImportedBlueprint(), ChapterQuota, DiagnosticItem, flattenSectionGroups(), getItemMarks(), getItemUnits(), groupSectionsFromFlat(), PaperImplication (+5 more)

### Community 40 - "print-logistics.ts"
Cohesion: 0.33
Nodes (9): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, ClassSectionInput (+1 more)

### Community 41 - "ui.tsx"
Cohesion: 0.12
Nodes (16): COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS, SubjectWorkspaceDrawerProps, ConfirmContext, ConfirmOptions, FALLBACK_TOAST (+8 more)

### Community 42 - "math.ts"
Cohesion: 0.21
Nodes (16): splitOutsideMath(), cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX (+8 more)

### Community 43 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.20
Nodes (14): Feature Inventory, POST, DELETE, DELETE, PATCH, PUT, DELETE, PATCH (+6 more)

### Community 44 - "export-docx/route.ts"
Cohesion: 0.39
Nodes (10): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), formatQuestionNumber(), DocxTextStyle (+2 more)

### Community 45 - "blueprintExport.ts"
Cohesion: 0.44
Nodes (8): BlueprintJsonModal(), BlueprintJsonModalProps, BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson, getBlueprintJsonFilename()

### Community 46 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 47 - "teacher-audit-fixes.test.ts"
Cohesion: 0.33
Nodes (5): PaperPreflightModal(), PaperPreflightModalProps, PreflightIssue, PreflightReport, validatePaperPreflight()

### Community 48 - "BlueprintImportModal"
Cohesion: 0.47
Nodes (4): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent()

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "toQuestionDto"
Cohesion: 0.15
Nodes (13): GET, GET, bulkRequestSchema, legacyBulkSchema, modernBulkSchema, POST, GET, GET (+5 more)

### Community 54 - "papers/[id]/page.tsx"
Cohesion: 0.07
Nodes (27): AIPaperAuditModal(), AIPaperAuditModalProps, AIPaperGeneratorModalProps, AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, AIQuestionImproverModal() (+19 more)

### Community 55 - "parseMatchColumnPairs"
Cohesion: 0.25
Nodes (19): AIPaperGeneratorModal(), QuestionPicker(), add(), handleAcceptAiQuestion(), handleEditAiQuestion(), SectionAiModal(), handleCommit(), cleanMatchItem() (+11 more)

### Community 56 - "constants.ts"
Cohesion: 0.12
Nodes (16): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL, NUMBERING_STYLE_LABEL, PRINT_DENSITY_LABEL, SCHOOL_DISPLAY_NAME, SCHOOL_ESTABLISHED (+8 more)

### Community 57 - "papers/[id]/page.tsx"
Cohesion: 0.10
Nodes (31): nextConfig, lucide-react, next, react, Filter, AcademicSessionSelectorProps, AIBlueprintModalProps, ChapterDraft (+23 more)

### Community 59 - "blueprints/[id]/page.tsx"
Cohesion: 0.42
Nodes (6): BlueprintTemplateModal(), BlueprintTemplateModalProps, QUESTION_TYPE_LABEL, BlueprintTemplate, BlueprintTemplateSectionGroup, STANDARD_BLUEPRINT_TEMPLATES

### Community 60 - "Project: Sarvodaya School Examination Portal — Production Business Logic"
Cohesion: 0.25
Nodes (7): Architecture, Code Layout, Interface Contracts, M2 (Section Enrollment & Print Logistics), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, SectionDetail

### Community 62 - "PaperBuilderPage"
Cohesion: 0.18
Nodes (3): Bar(), PaperBuilderPage(), handleAutofill()

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 381 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `FigureStudio.tsx`, `package.json`, `exam-cell/page.tsx`, `ui.tsx`, `blueprintExport.ts`, `BlueprintImportModal.tsx`, `teacher-audit-fixes.test.ts`, `QuestionForm.tsx`, `parseMatchColumnPairs`, `papers/[id]/page.tsx`, `blueprints/page.tsx`, `api`, `AppShell.tsx`, `blueprints/[id]/page.tsx`, `PaperSheets.tsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06354642313546423 - nodes in this community are weakly interconnected._
- **Why does `api()` connect `api` to `exam-cell/page.tsx`, `syllabusImport.ts`, `BlueprintImportModal.tsx`, `BlueprintEditorPage`, `BlueprintImportModal`, `QuestionForm.tsx`, `AppShell.tsx`, `parseMatchColumnPairs`, `papers/[id]/page.tsx`, `blueprints/page.tsx`, `papers/[id]/page.tsx`, `blueprints/[id]/page.tsx`, `PaperSheets.tsx`, `PaperBuilderPage`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `diagram-search.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08350951374207188 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `FigureStudio.tsx`, `package.json`, `exam-cell/page.tsx`, `ui.tsx`, `vitest`, `blueprintExport.ts`, `BlueprintImportModal.tsx`, `teacher-audit-fixes.test.ts`, `QuestionForm.tsx`, `parseMatchColumnPairs`, `papers/[id]/page.tsx`, `blueprints/page.tsx`, `api`, `AppShell.tsx`, `blueprints/[id]/page.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `batchQuestionIo.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05765765765765766 - nodes in this community are weakly interconnected._