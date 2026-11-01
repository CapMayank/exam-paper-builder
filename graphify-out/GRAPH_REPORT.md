# Graph Report - exam-paper-builder  (2026-11-01)

## Corpus Check
- 302 files · ~495,195 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1797 nodes · 6728 edges · 66 communities (61 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5386400`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- blueprintImport.ts
- paperImport.ts
- blueprints.ts
- FigureStudio.tsx
- geometry.ts
- package.json
- schemas.ts
- curriculumInit.ts
- SyllabusImportModal.tsx
- HttpError
- papers.ts
- time
- @prisma/client
- localization/index.ts
- body
- diagram-search.ts
- lib/types.ts
- blueprint.ts
- classes/route.ts
- render.ts
- devDependencies
- hitTest
- batchQuestionIo.ts
- curriculumContract.ts
- ui.tsx
- @playwright/test
- books/page.tsx
- api
- compilerOptions
- dependencies
- app/layout.tsx
- toQuestionDto
- scripts
- BlueprintEditorPage
- e2e.mjs
- curriculumTemplates.ts
- studio.test.ts
- text.ts
- (app)/page.tsx
- Book
- internalChoiceRules.ts
- constants.ts
- BlueprintRolloverModal
- MathParser
- papers/[id]/page.tsx
- vitest
- print-logistics.ts
- math.ts
- README.md
- QuestionView.tsx
- AGENTS.md
- deploy.sh
- api.ts
- Modal
- export-docx/route.ts
- checkBoundedPartitionFeasible
- gemini.ts
- PaperBuilderPage
- prisma.ts
- subpartExtractor.ts
- blueprintExport.ts
- subpartsTotalMarks
- SubjectWorkspaceDrawer.tsx
- dto.ts

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 137 edges
2. `body()` - 89 edges
3. `api()` - 84 edges
4. `prisma` - 75 edges
5. `recordAudit()` - 73 edges
6. `route()` - 72 edges
7. `vitest` - 71 edges
8. `react` - 62 edges
9. `Modal()` - 60 edges
10. `loadPaperView()` - 57 edges

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

## Communities (66 total, 5 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.06
Nodes (50): attach(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint() (+42 more)

### Community 1 - "blueprintImport.ts"
Cohesion: 0.16
Nodes (19): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent(), BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection (+11 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.12
Nodes (28): POST, PaperImportModal(), inferExamTypeFromText(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion, ImportedPaperSection (+20 more)

### Community 3 - "blueprints.ts"
Cohesion: 0.23
Nodes (17): adaptRequestSchema, POST, ChapterItem, CustomSchoolTermConfigurator(), CustomSchoolTermConfiguratorProps, checkBlueprintFeasibility(), validateBlueprint(), adaptCustomSchoolBlueprint() (+9 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.12
Nodes (15): eslintConfig, name, private, version, eslint, eslint-config-next, prisma, react-dom (+7 more)

### Community 7 - "schemas.ts"
Cohesion: 0.08
Nodes (25): AuditAction, addItemSchema, changePasswordSchema, classSectionInputSchema, classSubjectSchema, combineBooksSchema, editPaperItemSchema, loginSchema (+17 more)

### Community 8 - "curriculumInit.ts"
Cohesion: 0.14
Nodes (20): main(), prisma, GET, GET, register(), ChapterSpec, CLASSES_DATA, SOURCE_DOCS_DATA (+12 more)

### Community 9 - "SyllabusImportModal.tsx"
Cohesion: 0.10
Nodes (37): POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON, SyllabusImportModal(), handleAiScan() (+29 more)

### Community 10 - "HttpError"
Cohesion: 0.10
Nodes (23): GET, DELETE, GET, PUT, POST, POST, POST, DELETE (+15 more)

### Community 11 - "papers.ts"
Cohesion: 0.14
Nodes (28): POST, POST, GET, POST, POST, POST, GET, POST (+20 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "@prisma/client"
Cohesion: 0.08
Nodes (11): @prisma/client, prisma, prisma, prisma, prisma, prisma, prisma, prisma (+3 more)

### Community 14 - "localization/index.ts"
Cohesion: 0.12
Nodes (23): GeneratePaperSectionInput, BILINGUAL_DICTIONARY, DEVANAGARI_LETTERS, ENGLISH_DICTIONARY, ENGLISH_SECTION_TYPE_MAP, HINDI_DICTIONARY, LOCALES, localizeSectionTitle() (+15 more)

### Community 15 - "body"
Cohesion: 0.07
Nodes (33): zod, auditSchema, POST, generateSchema, POST, improveSchema, POST, parseBlueprintSchema (+25 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.12
Nodes (19): prisma, UPLOAD_DIR, GET, POST, GET, TYPE_BY_EXT, CURATED_DIAGRAMS, CuratedDiagram (+11 more)

### Community 17 - "lib/types.ts"
Cohesion: 0.11
Nodes (23): Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), getSectionsForClass(), Tab, Layout, MarksStyle, NumberingStyle (+15 more)

### Community 18 - "blueprint.ts"
Cohesion: 0.10
Nodes (23): vitest, AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits() (+15 more)

### Community 19 - "classes/route.ts"
Cohesion: 0.29
Nodes (16): PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject(), normalizeAcademicSession(), normalizeSectionDetails(), syncClassesFromBooks() (+8 more)

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
Cohesion: 0.09
Nodes (44): RFC-4180, QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat, BatchParseOptions, ChapterResolver (+36 more)

### Community 24 - "curriculumContract.ts"
Cohesion: 0.05
Nodes (86): handleGenerateAiQuestion(), SectionAiModalProps, DEFAULT_SPACE, ParsedQuestionItem, QuestionType, buildAndValidateGenerationContract(), CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES (+78 more)

### Community 25 - "ui.tsx"
Cohesion: 0.08
Nodes (30): AppLayout(), LoginPage(), submit(), AppShell(), signOut(), isActive(), NAV, NavList() (+22 more)

### Community 26 - "@playwright/test"
Cohesion: 0.32
Nodes (5): @playwright/test, applySessionCookie(), generateSessionCookie(), applySessionCookie(), generateSessionCookie()

### Community 27 - "books/page.tsx"
Cohesion: 0.10
Nodes (27): BlueprintsPage(), remove(), subjectMatches(), BooksPage(), removeBook(), removeChapter(), run(), saveBook() (+19 more)

### Community 28 - "api"
Cohesion: 0.11
Nodes (26): ClassesHierarchyPage(), addMissingStandardSubjects(), addSectionToClass(), deleteClass(), deleteSubject(), removeSectionFromClass(), saveClass(), saveSubject() (+18 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, docx, katex, lucide-react, next, @prisma/client, react (+3 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "toQuestionDto"
Cohesion: 0.17
Nodes (18): DELETE, DELETE, PATCH, updateSubjectSchema, GET, POST, DELETE, GET (+10 more)

### Community 33 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, seed, seed:mpbse, start, test (+1 more)

### Community 34 - "BlueprintEditorPage"
Cohesion: 0.11
Nodes (20): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleImportedBlueprint(), handleLoadOfficialTemplate(), hasExplicitSlotOverride(), isSlotChoiceRequired(), moveSectionGroup() (+12 more)

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "curriculumTemplates.ts"
Cohesion: 0.18
Nodes (16): StandardMpbseConfigurator(), StandardMpbseConfiguratorProps, BlueprintTemplateModalProps, BlueprintTemplate, ChoicePolicyType, Circular465AuditResult, Circular465Violation, createChoicePolicy() (+8 more)

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "(app)/page.tsx"
Cohesion: 0.33
Nodes (12): UsersAdminPage(), DashboardPage(), Data, PaperRow(), Progress(), EmptyState(), ListSkeleton(), Skeleton() (+4 more)

### Community 40 - "Book"
Cohesion: 0.33
Nodes (4): BlueprintImportModalProps, CombineBooksModal(), CombineBooksModalProps, Book

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.10
Nodes (30): PaperPreflightModal(), PaperPreflightModalProps, BoardRuleConflictResult, detectBoardRuleConflict(), detectExaminationBoard(), evaluatePaperInternalChoiceCompliance(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet (+22 more)

### Community 42 - "constants.ts"
Cohesion: 0.06
Nodes (43): MathCategory, MathSnippet, MathToolbar(), SNIPPETS, DEFAULT_ASSERTION_OPTIONS_EN, DEFAULT_ASSERTION_OPTIONS_HI, DEFAULT_SPACE, getDefaultSubpartsForType() (+35 more)

### Community 45 - "papers/[id]/page.tsx"
Cohesion: 0.13
Nodes (28): nextConfig, lucide-react, next, react, Filter, AIBlueprintModalProps, ChapterDraft, SectionDraft (+20 more)

### Community 46 - "vitest"
Cohesion: 0.20
Nodes (17): M3 (Question Exhaustion Tagging), QuestionPicker(), add(), handleAcceptAiQuestion(), handleEditAiQuestion(), CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext (+9 more)

### Community 47 - "print-logistics.ts"
Cohesion: 0.33
Nodes (9): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, ClassSectionInput (+1 more)

### Community 48 - "math.ts"
Cohesion: 0.15
Nodes (23): SectionAiModal(), handleCommit(), cleanMatchItem(), extractColumnIIItems(), extractColumnIItems(), getMatchColumnInstruction(), parseMatchColumnPairs(), splitOutsideMath() (+15 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "QuestionView.tsx"
Cohesion: 0.25
Nodes (18): OmrSheetPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), DiagramSearchModalProps, LETTERS_LIST, QuestionRenderMode, QuestionView() (+10 more)

### Community 54 - "api.ts"
Cohesion: 0.12
Nodes (21): Architecture, Code Layout, Feature Inventory, Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, server-only, POST, POST (+13 more)

### Community 55 - "Modal"
Cohesion: 0.09
Nodes (26): ExamCellPage(), MultiSetGeneratorModal(), QuestionExportModal(), QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), AIBlueprintModal() (+18 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.10
Nodes (51): docx, assert(), runServerChecks(), buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx() (+43 more)

### Community 57 - "checkBoundedPartitionFeasible"
Cohesion: 0.50
Nodes (4): checkBoundedPartitionFeasible(), getSolutions(), solve(), search()

### Community 58 - "gemini.ts"
Cohesion: 0.11
Nodes (38): GET, AIPaperGeneratorModal(), canHaveSubparts(), derangeMatchColumnPairs(), extractMatchPairsFromExplanation(), cleanChapterTitleForLookup(), generateCurriculumGroundedSectionQuestions(), getMaxPaperDiagramBudget() (+30 more)

### Community 59 - "PaperBuilderPage"
Cohesion: 0.14
Nodes (4): Bar(), PaperBuilderPage(), handleAutofill(), DiagramSearchModal()

### Community 60 - "prisma.ts"
Cohesion: 0.11
Nodes (21): bcryptjs, POST, POST, GET, POST, DELETE, PATCH, GET (+13 more)

### Community 61 - "subpartExtractor.ts"
Cohesion: 0.23
Nodes (11): DecomposedSubpartsResult, decomposeStemSubparts(), detectAttemptCount(), DEVANAGARI_CONSONANTS, DEVANAGARI_DIGITS, findSequenceMatches(), isFalsePositiveParenthesis(), isInsideMath() (+3 more)

### Community 66 - "blueprintExport.ts"
Cohesion: 0.44
Nodes (8): BlueprintJsonModal(), BlueprintJsonModalProps, BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson, getBlueprintJsonFilename()

### Community 67 - "subpartsTotalMarks"
Cohesion: 0.15
Nodes (22): POST, DELETE, editableItem(), PATCH, PUT, POST, toPlacedItems(), whyCannotAdd() (+14 more)

### Community 70 - "SubjectWorkspaceDrawer.tsx"
Cohesion: 0.43
Nodes (5): COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS, SubjectWorkspaceDrawerProps

### Community 71 - "dto.ts"
Cohesion: 0.14
Nodes (24): DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, NUMBERING_STYLES, PRINT_DENSITIES, QUESTION_TYPES, BlueprintDto (+16 more)

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 469 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `blueprint.ts` to `blueprintImport.ts`, `paperImport.ts`, `blueprints.ts`, `package.json`, `schemas.ts`, `SyllabusImportModal.tsx`, `papers.ts`, `localization/index.ts`, `diagram-search.ts`, `classes/route.ts`, `batchQuestionIo.ts`, `curriculumContract.ts`, `toQuestionDto`, `studio.test.ts`, `constants.ts`, `vitest`, `print-logistics.ts`, `math.ts`, `export-docx/route.ts`, `gemini.ts`, `subpartExtractor.ts`, `subpartsTotalMarks`, `dto.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06354642313546423 - nodes in this community are weakly interconnected._
- **Why does `react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `paperImport.ts`, `blueprints.ts`, `FigureStudio.tsx`, `package.json`, `SyllabusImportModal.tsx`, `lib/types.ts`, `ui.tsx`, `books/page.tsx`, `api`, `curriculumTemplates.ts`, `(app)/page.tsx`, `Book`, `internalChoiceRules.ts`, `constants.ts`, `vitest`, `math.ts`, `QuestionView.tsx`, `Modal`, `export-docx/route.ts`, `blueprintExport.ts`, `SubjectWorkspaceDrawer.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12010796221322537 - nodes in this community are weakly interconnected._
- **Why does `api()` connect `api` to `blueprintImport.ts`, `BlueprintEditorPage`, `(app)/page.tsx`, `Book`, `PaperBuilderPage`, `constants.ts`, `BlueprintRolloverModal`, `SyllabusImportModal.tsx`, `papers/[id]/page.tsx`, `vitest`, `math.ts`, `lib/types.ts`, `QuestionView.tsx`, `Modal`, `ui.tsx`, `gemini.ts`, `books/page.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `FigureStudio.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._