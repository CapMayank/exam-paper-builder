# Graph Report - exam-paper-builder  (2026-10-31)

## Corpus Check
- 264 files · ~404,115 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1622 nodes · 6110 edges · 60 communities (57 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8fceff4c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- papers/[id]/page.tsx
- paperImport.ts
- HttpError
- FigureStudio.tsx
- geometry.ts
- package.json
- m1-rbac-adversarial-stress.test.ts
- lib/types.ts
- SyllabusImportModal.tsx
- BlueprintTemplateModal.tsx
- papers.ts
- time
- classes/route.ts
- localization/index.ts
- schemas.ts
- diagram-search.ts
- logic.test.ts
- PaperBuilderPage
- Modal
- render.ts
- devDependencies
- hitTest
- batchQuestionIo.ts
- blueprints/[id]/route.ts
- AppShell.tsx
- curriculumContract.ts
- QuestionImportModal
- api
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
- paperAutogen.ts
- internalChoiceRules.ts
- mpbse-class12-math-regression.test.ts
- questionValidator.ts
- blueprintExport.ts
- formatMathTextRuns
- PaperSheets.tsx
- eslint.config.mjs
- math.ts
- README.md
- AGENTS.md
- deploy.sh
- QuestionForm.tsx
- export-docx/route.ts
- gemini.ts
- constants.ts
- register/route.ts
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
10. `vitest` - 54 edges

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
Cohesion: 0.07
Nodes (47): CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint(), numberGridPlugin, NumberGridPrint() (+39 more)

### Community 1 - "papers/[id]/page.tsx"
Cohesion: 0.14
Nodes (32): lucide-react, react, AcademicSessionSelectorProps, AIPaperGeneratorModal(), AIPaperGeneratorModalProps, PaperCompareModalProps, PaperPreflightModal(), PaperPreflightModalProps (+24 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.06
Nodes (61): POST, POST, AIBlueprintModalProps, ChapterDraft, SectionDraft, BlueprintImportModal(), copyExample(), downloadSampleFile() (+53 more)

### Community 3 - "HttpError"
Cohesion: 0.07
Nodes (42): zod, auditSchema, POST, generateSchema, POST, improveSchema, POST, parseBlueprintSchema (+34 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, version, prisma, react-dom, tailwindcss, @tailwindcss/turbopack, @types/katex (+4 more)

### Community 7 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.15
Nodes (20): DELETE, bulkDeleteSchema, bulkRequestSchema, DELETE, legacyBulkSchema, modernBulkSchema, POST, DELETE (+12 more)

### Community 8 - "lib/types.ts"
Cohesion: 0.05
Nodes (67): Architecture, Code Layout, Feature Inventory, Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), M3 (Question Exhaustion Tagging), Milestones (+59 more)

### Community 9 - "SyllabusImportModal.tsx"
Cohesion: 0.09
Nodes (39): parseSchema, POST, POST, openBookDialog(), EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON (+31 more)

### Community 10 - "BlueprintTemplateModal.tsx"
Cohesion: 0.52
Nodes (4): BlueprintTemplateModalProps, BlueprintTemplate, BlueprintTemplateSectionGroup, STANDARD_BLUEPRINT_TEMPLATES

### Community 11 - "papers.ts"
Cohesion: 0.10
Nodes (50): vitest, POST, POST, GET, POST, POST, parallelSetsSchema, POST (+42 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "classes/route.ts"
Cohesion: 0.25
Nodes (17): POST, GET, POST, PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject() (+9 more)

### Community 14 - "localization/index.ts"
Cohesion: 0.17
Nodes (17): BILINGUAL_DICTIONARY, DEVANAGARI_LETTERS, ENGLISH_DICTIONARY, ENGLISH_SECTION_TYPE_MAP, HINDI_DICTIONARY, LOCALES, localizeSectionTitle(), resolvePartSuffix() (+9 more)

### Community 15 - "schemas.ts"
Cohesion: 0.07
Nodes (40): POST, GET, POST, DELETE, PATCH, GET, POST, POST (+32 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.12
Nodes (19): prisma, UPLOAD_DIR, GET, POST, GET, TYPE_BY_EXT, CURATED_DIAGRAMS, CuratedDiagram (+11 more)

### Community 17 - "logic.test.ts"
Cohesion: 0.19
Nodes (10): AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), Slot (+2 more)

### Community 18 - "PaperBuilderPage"
Cohesion: 0.11
Nodes (4): Bar(), MultiSetGeneratorModal(), PaperBuilderPage(), handleAutofill()

### Community 19 - "Modal"
Cohesion: 0.06
Nodes (44): ExamCellPage(), AIPaperAuditModal(), AIPaperAuditModalProps, AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, AIQuestionImproverModal() (+36 more)

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
Cohesion: 0.08
Nodes (46): RFC-4180, assert(), runServerChecks(), GET, BatchImportError, BatchImportOptions, BatchIoFormat, BatchParseOptions (+38 more)

### Community 24 - "blueprints/[id]/route.ts"
Cohesion: 0.24
Nodes (12): DELETE, GET, PUT, GET, POST, diagnosePaperImplications(), assertBlueprintValid(), blueprintInclude (+4 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.13
Nodes (18): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AppShell(), signOut() (+10 more)

### Community 26 - "curriculumContract.ts"
Cohesion: 0.17
Nodes (13): CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, CLASS_12_MATH_CHAPTER_SPECS, detectEducationBoard(), GenerationContractValidationResult, getForbiddenDomainsForSubject(), MPBSE_SECONDARY_CODES (+5 more)

### Community 27 - "QuestionImportModal"
Cohesion: 0.50
Nodes (3): QuestionImportModal(), handleFileChange(), validateContent()

### Community 28 - "api"
Cohesion: 0.09
Nodes (55): BlueprintsPage(), remove(), subjectMatches(), BooksPage(), removeBook(), removeChapter(), run(), saveBook() (+47 more)

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
Cohesion: 0.19
Nodes (15): GET, num(), blueprintTotalMarks(), ChapterQuota, checkBlueprintFeasibility(), DiagnosticItem, flattenSectionGroups(), getItemMarks() (+7 more)

### Community 33 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, seed, start, test, test:e2e

### Community 34 - "BlueprintEditorPage"
Cohesion: 0.13
Nodes (17): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleImportedBlueprint(), hasExplicitSlotOverride(), isSlotChoiceRequired(), moveSectionGroup(), parseSlotOverrides() (+9 more)

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "reconcileBlueprint.ts"
Cohesion: 0.21
Nodes (7): POST, ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "exam-cell/page.tsx"
Cohesion: 0.17
Nodes (16): nextConfig, next, UsersAdminPage(), DashboardPage(), Data, PaperRow(), Progress(), Skeleton() (+8 more)

### Community 40 - "paperAutogen.ts"
Cohesion: 0.20
Nodes (11): GenerationContract, GenerationSlotContract, GeminiCallResult, GenerationJobTrace, getRecentGenerationTraces(), recentTraces, InternalChoiceRequirement, PaperAutogenInput (+3 more)

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.12
Nodes (24): BoardRuleConflictResult, detectBoardRuleConflict(), detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId, getBoardDefaultChoiceRequirement(), InternalChoiceIssue (+16 more)

### Community 42 - "mpbse-class12-math-regression.test.ts"
Cohesion: 0.41
Nodes (11): derangeMatchColumnPairs(), extractMatchPairsFromExplanation(), buildAndValidateGenerationContract(), cleanChapterTitleForLookup(), generateCurriculumGroundedSectionQuestions(), getChapterCurriculumSpec(), generatePaperSectionWithGemini(), generateQuestionsWithGemini() (+3 more)

### Community 43 - "questionValidator.ts"
Cohesion: 0.18
Nodes (11): GroundedGeneratedQuestion, GeneratedQuestionItem, BIOLOGY_CONTAMINATION_PATTERNS, checkDeletedSyllabusTopics(), CHEMISTRY_TEMPLATE_PATTERNS, doesMcqAnswerMatchOptions(), GENERIC_TEMPLATE_PATTERNS, QuestionValidationResult (+3 more)

### Community 44 - "blueprintExport.ts"
Cohesion: 0.30
Nodes (11): BlueprintJsonModal(), BlueprintJsonModalProps, groupSectionsFromFlat(), SectionDef, BlueprintWithExportRelations, buildBlueprintExportPayload, downloadBlueprintJson(), exportBlueprintToJsonObject() (+3 more)

### Community 45 - "formatMathTextRuns"
Cohesion: 0.43
Nodes (6): docx, renderQuestionOptions(), renderSubpartsDocx(), DocxTextStyle, formatMathTextRuns(), formatOptionPairRuns()

### Community 46 - "PaperSheets.tsx"
Cohesion: 0.13
Nodes (22): BlankPage(), Block, extractSectionLetter(), Page(), PaperSheets(), renderBlock(), SheetsInfo, DEFAULT_SCHOOL_NAME (+14 more)

### Community 47 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 48 - "math.ts"
Cohesion: 0.21
Nodes (16): splitOutsideMath(), cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX (+8 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 55 - "QuestionForm.tsx"
Cohesion: 0.08
Nodes (47): QuestionExportModal(), QuestionsPage(), remove(), OmrSheetPage(), PrintPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage() (+39 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.32
Nodes (19): buildPaperDocx(), GET, renderQuestionTextWithTable(), buildBlocks(), canHaveSubparts(), cleanQuestionStatement(), detectPaperLanguage, formatExerciseFormula() (+11 more)

### Community 58 - "gemini.ts"
Cohesion: 0.16
Nodes (19): GET, auditPaperWithGemini(), callGeminiApi(), FigureStudioPromptResult, GeminiContentPart, GeneratePaperSectionInput, GeneratePaperSectionSlot, getGeminiApiKey() (+11 more)

### Community 59 - "constants.ts"
Cohesion: 0.07
Nodes (26): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, Layout, MARKS_STYLE_LABEL, MatchColumnPair, MAX_OPTIONS, MIN_OPTIONS (+18 more)

### Community 60 - "register/route.ts"
Cohesion: 0.15
Nodes (18): bcryptjs, server-only, POST, POST, codeMatches(), POST, EXT_BY_TYPE, POST (+10 more)

### Community 61 - "subpartExtractor.ts"
Cohesion: 0.23
Nodes (11): DecomposedSubpartsResult, decomposeStemSubparts(), detectAttemptCount(), DEVANAGARI_CONSONANTS, DEVANAGARI_DIGITS, findSequenceMatches(), isFalsePositiveParenthesis(), isInsideMath() (+3 more)

### Community 65 - "mandatory-workflows.spec.ts"
Cohesion: 0.50
Nodes (3): @playwright/test, applySessionCookie(), generateSessionCookie()

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 430 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `blueprint.ts`, `papers/[id]/page.tsx`, `BlueprintEditorPage`, `paperImport.ts`, `exam-cell/page.tsx`, `lib/types.ts`, `SyllabusImportModal.tsx`, `PaperBuilderPage`, `Modal`, `QuestionForm.tsx`, `AppShell.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06720321931589537 - nodes in this community are weakly interconnected._
- **Why does `react` connect `papers/[id]/page.tsx` to `blueprint.ts`, `kindergarten/types.ts`, `paperImport.ts`, `FigureStudio.tsx`, `package.json`, `exam-cell/page.tsx`, `lib/types.ts`, `SyllabusImportModal.tsx`, `BlueprintTemplateModal.tsx`, `blueprintExport.ts`, `PaperSheets.tsx`, `Modal`, `QuestionForm.tsx`, `AppShell.tsx`, `api`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `papers/[id]/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13732004429678848 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `papers.ts` to `kindergarten/types.ts`, `papers/[id]/page.tsx`, `paperImport.ts`, `package.json`, `m1-rbac-adversarial-stress.test.ts`, `lib/types.ts`, `SyllabusImportModal.tsx`, `BlueprintTemplateModal.tsx`, `classes/route.ts`, `schemas.ts`, `diagram-search.ts`, `logic.test.ts`, `batchQuestionIo.ts`, `curriculumContract.ts`, `blueprint.ts`, `reconcileBlueprint.ts`, `studio.test.ts`, `paperAutogen.ts`, `mpbse-class12-math-regression.test.ts`, `blueprintExport.ts`, `PaperSheets.tsx`, `math.ts`, `export-docx/route.ts`, `gemini.ts`, `subpartExtractor.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.058544303797468354 - nodes in this community are weakly interconnected._