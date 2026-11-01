# Graph Report - exam-paper-builder  (2026-11-01)

## Corpus Check
- 298 files · ~493,363 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 1778 nodes · 6663 edges · 65 communities (61 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77bd9db9`
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
- parseMatchColumnPairs
- sanskrit-academic-quality.test.ts
- SyllabusImportModal.tsx
- HttpError
- papers.ts
- time
- dto.ts
- localization/index.ts
- body
- diagram-search.ts
- SyllabusImportModal.tsx
- blueprint.ts
- schemas.ts
- render.ts
- devDependencies
- hitTest
- batchQuestionIo.ts
- questionValidator.ts
- AppShell.tsx
- curriculumContract.ts
- blueprints/page.tsx
- api
- compilerOptions
- dependencies
- app/layout.tsx
- toQuestionDto
- scripts
- BlueprintEditorPage
- e2e.mjs
- StandardMpbseConfigurator.tsx
- studio.test.ts
- text.ts
- Modal
- m3-forensic-adversarial.test.ts
- internalChoiceRules.ts
- constants.ts
- MathParser
- papers/[id]/page.tsx
- vitest
- print-logistics.ts
- math.ts
- README.md
- QuestionView.tsx
- AGENTS.md
- deploy.sh
- m1-rbac-adversarial-stress.test.ts
- QuestionForm.tsx
- export-docx/route.ts
- gemini.ts
- layout.ts
- prisma.ts
- subpartExtractor.ts
- eslint.config.mjs
- blueprintExport.ts
- reconcileBlueprint.ts
- SubjectWorkspaceDrawer.tsx
- quota-or-choice-regression.test.ts

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 137 edges
2. `body()` - 89 edges
3. `api()` - 84 edges
4. `recordAudit()` - 73 edges
5. `prisma` - 73 edges
6. `route()` - 72 edges
7. `vitest` - 70 edges
8. `react` - 62 edges
9. `Modal()` - 60 edges
10. `loadPaperView()` - 57 edges

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

## Communities (65 total, 4 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.07
Nodes (48): CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint(), numberGridPlugin, NumberGridPrint() (+40 more)

### Community 1 - "blueprintImport.ts"
Cohesion: 0.16
Nodes (19): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent(), BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection (+11 more)

### Community 2 - "paperImport.ts"
Cohesion: 0.12
Nodes (29): POST, PaperImportModal(), inferExamTypeFromText(), resolvePaperExamType(), BlueprintSectionCandidate, ChapterVerificationResult, getQuestionTypeTier(), ImportedPaperQuestion (+21 more)

### Community 3 - "blueprints.ts"
Cohesion: 0.12
Nodes (32): GET, adaptRequestSchema, POST, GET, ChapterItem, CustomSchoolTermConfigurator(), CustomSchoolTermConfiguratorProps, checkBlueprintFeasibility() (+24 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (46): ActiveHandle, COLOR_SWATCHES, FILL_SWATCHES, MATH_SYMBOLS, Tool, BOX_HANDLES, BoxHandle, pt() (+38 more)

### Community 5 - "geometry.ts"
Cohesion: 0.07
Nodes (45): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), boundsCache (+37 more)

### Community 6 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, version, prisma, react-dom, tailwindcss, @tailwindcss/turbopack, @types/katex (+4 more)

### Community 7 - "parseMatchColumnPairs"
Cohesion: 0.22
Nodes (21): QuestionPicker(), add(), handleAcceptAiQuestion(), handleEditAiQuestion(), handleGenerateAiQuestion(), SectionAiModal(), handleCommit(), SectionAiModalProps (+13 more)

### Community 8 - "sanskrit-academic-quality.test.ts"
Cohesion: 0.23
Nodes (9): evaluateSanskritCompetencyCoverage(), SANSKRIT_COMPETENCY_TAXONOMY, RAW_OFFICIAL_2026_ITEMS, RAW_SANSKRIT_ITEMS, SANSKRIT_CLASS10_BLUEPRINT, SANSKRIT_CLASS10_PAPER, SANSKRIT_MPBSE_2026_BLUEPRINT, SANSKRIT_MPBSE_2026_PAPER (+1 more)

### Community 9 - "SyllabusImportModal.tsx"
Cohesion: 0.10
Nodes (30): parseSchema, POST, POST, openBookDialog(), SyllabusImportModal(), handleAiScan(), handleImport(), STANDARD_CURRICULUM_PRESETS (+22 more)

### Community 10 - "HttpError"
Cohesion: 0.12
Nodes (19): GET, POST, DELETE, GET, PATCH, DELETE, PATCH, GET (+11 more)

### Community 11 - "papers.ts"
Cohesion: 0.14
Nodes (34): auditSchema, POST, POST, POST, POST, POST, parallelSetsSchema, POST (+26 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "dto.ts"
Cohesion: 0.05
Nodes (42): createChoicePolicy(), generateEnglish15Q80MSections(), generateEnglish16Q75MSections(), generateScience20Q70MSections(), generateStandard23Q75MSections(), generateStandard23Q80MSections(), main(), prisma (+34 more)

### Community 14 - "localization/index.ts"
Cohesion: 0.15
Nodes (20): GeneratePaperSectionInput, BILINGUAL_DICTIONARY, DEVANAGARI_LETTERS, ENGLISH_DICTIONARY, ENGLISH_SECTION_TYPE_MAP, HINDI_DICTIONARY, LOCALES, localizeSectionTitle() (+12 more)

### Community 15 - "body"
Cohesion: 0.12
Nodes (24): zod, generateSchema, POST, improveSchema, POST, parseBlueprintSchema, POST, figureSchema (+16 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.06
Nodes (37): Architecture, Code Layout, Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, @playwright/test, prisma, UPLOAD_DIR, GET (+29 more)

### Community 17 - "SyllabusImportModal.tsx"
Cohesion: 0.33
Nodes (6): EditableBook, EditableChapter, ImportFormat, SAMPLE_JSON, SyllabusImportModalProps, ParsedChapterItem

### Community 18 - "blueprint.ts"
Cohesion: 0.09
Nodes (29): handleImportedBlueprint(), AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits() (+21 more)

### Community 19 - "schemas.ts"
Cohesion: 0.09
Nodes (39): POST, GET, POST, PATCH, GET, POST, postClassUnionSchema, AuditAction (+31 more)

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
Nodes (52): RFC-4180, assert(), runServerChecks(), MultiSetGeneratorModal(), QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport (+44 more)

### Community 24 - "questionValidator.ts"
Cohesion: 0.12
Nodes (25): buildAndValidateGenerationContract(), getForbiddenDomainsForSubject(), createSubjectContract(), createSubjectContract(), createSubjectContract(), createTestContract(), createTestContract(), createTestContract() (+17 more)

### Community 25 - "AppShell.tsx"
Cohesion: 0.12
Nodes (20): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AcademicSessionSelectorProps, AppShell() (+12 more)

### Community 26 - "curriculumContract.ts"
Cohesion: 0.09
Nodes (28): CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, ChoicePolicy, ChoicePolicyType, CLASS_10_SANSKRIT_SPECS, CLASS_12_MATH_CHAPTER_SPECS, CurriculumGenerationPayload (+20 more)

### Community 27 - "blueprints/page.tsx"
Cohesion: 0.10
Nodes (38): nextConfig, Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), next, BlueprintsPage(), remove(), subjectMatches() (+30 more)

### Community 28 - "api"
Cohesion: 0.10
Nodes (29): BooksPage(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), ClassesHierarchyPage(), addMissingStandardSubjects() (+21 more)

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
Cohesion: 0.14
Nodes (21): Feature Inventory, DELETE, GET, POST, bulkDeleteSchema, bulkRequestSchema, DELETE, legacyBulkSchema (+13 more)

### Community 33 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, seed, seed:mpbse, start, test (+1 more)

### Community 34 - "BlueprintEditorPage"
Cohesion: 0.12
Nodes (18): BlueprintEditorPage(), addQuestionTypeToGroup(), addSectionGroup(), handleLoadOfficialTemplate(), hasExplicitSlotOverride(), isSlotChoiceRequired(), moveSectionGroup(), parseSlotOverrides() (+10 more)

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "StandardMpbseConfigurator.tsx"
Cohesion: 0.50
Nodes (4): StandardMpbseConfigurator(), StandardMpbseConfiguratorProps, BlueprintTemplateModalProps, BlueprintTemplate

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), snapPoint(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk() (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "Modal"
Cohesion: 0.10
Nodes (32): UsersAdminPage(), ExamCellPage(), QuestionExportModal(), QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), remove() (+24 more)

### Community 40 - "m3-forensic-adversarial.test.ts"
Cohesion: 0.37
Nodes (16): vitest, GenerationContract, CoordinatePoint, evaluateArithmeticExpression(), extractCoordinatePoints(), MathToken, normalizeMathString(), parseQuadraticEquation() (+8 more)

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.13
Nodes (24): BoardRuleConflictResult, detectBoardRuleConflict(), detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId, getBoardDefaultChoiceRequirement(), InternalChoiceIssue (+16 more)

### Community 42 - "constants.ts"
Cohesion: 0.10
Nodes (20): AcademicSession, DerangedMatchColumnResult, KINDERGARTEN_QUESTION_TYPES, MARKS_STYLE_LABEL, MarksStyle, MatchColumnPair, NUMBERING_STYLE_LABEL, PRINT_DENSITY_LABEL (+12 more)

### Community 45 - "papers/[id]/page.tsx"
Cohesion: 0.09
Nodes (44): lucide-react, react, getSectionsForClass(), Tab, AIBlueprintModalProps, ChapterDraft, SectionDraft, AIPaperGeneratorModalProps (+36 more)

### Community 46 - "vitest"
Cohesion: 0.26
Nodes (12): M3 (Question Exhaustion Tagging), CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage(), parseCompactExamTag() (+4 more)

### Community 47 - "print-logistics.ts"
Cohesion: 0.33
Nodes (9): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, ClassSectionInput (+1 more)

### Community 48 - "math.ts"
Cohesion: 0.23
Nodes (15): cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX, isEntirelyMath() (+7 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "QuestionView.tsx"
Cohesion: 0.18
Nodes (25): OmrSheetPage(), getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), DiagramSearchModalProps, submit(), LETTERS_LIST, QuestionRenderMode (+17 more)

### Community 54 - "m1-rbac-adversarial-stress.test.ts"
Cohesion: 0.11
Nodes (21): bcryptjs, POST, codeMatches(), POST, DELETE, POST, DELETE, PATCH (+13 more)

### Community 55 - "QuestionForm.tsx"
Cohesion: 0.07
Nodes (36): AIPaperAuditModalProps, AIPaperGeneratorModal(), AIQuestionGeneratorModal(), AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, AIQuestionImproverModal(), AIQuestionImproverModalProps (+28 more)

### Community 56 - "export-docx/route.ts"
Cohesion: 0.18
Nodes (28): docx, buildPaperDocx(), GET, renderQuestionOptions(), renderQuestionTextWithTable(), renderSubpartsDocx(), openCreate(), Block (+20 more)

### Community 58 - "gemini.ts"
Cohesion: 0.13
Nodes (32): GET, derangeMatchColumnPairs(), extractMatchPairsFromExplanation(), cleanChapterTitleForLookup(), generateCurriculumGroundedSectionQuestions(), getChapterCurriculumSpec(), auditPaperWithGemini(), callGeminiApi() (+24 more)

### Community 59 - "layout.ts"
Cohesion: 0.08
Nodes (18): Bar(), PaperBuilderPage(), handleAutofill(), PrintPage(), BlankPage(), Page(), PaperSheets(), renderBlock() (+10 more)

### Community 60 - "prisma.ts"
Cohesion: 0.10
Nodes (29): server-only, GET, POST, GET, POST, DELETE, PATCH, GET (+21 more)

### Community 61 - "subpartExtractor.ts"
Cohesion: 0.14
Nodes (15): QuestionType, GroundedGeneratedQuestion, GeneratedPaperQuestion, GeneratedQuestionItem, DecomposedSubpartsResult, detectAttemptCount(), DEVANAGARI_CONSONANTS, DEVANAGARI_DIGITS (+7 more)

### Community 63 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 66 - "blueprintExport.ts"
Cohesion: 0.40
Nodes (9): BlueprintJsonModal(), BlueprintJsonModalProps, groupSectionsFromFlat(), BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson (+1 more)

### Community 67 - "reconcileBlueprint.ts"
Cohesion: 0.22
Nodes (7): getEffectiveQuestionMarks(), ReassignmentResult, ReconcileBlueprintOutput, reconcileBlueprintQuestions(), ReconcileChapterInput, ReconcileItemInput, ReconcileSectionInput

### Community 70 - "SubjectWorkspaceDrawer.tsx"
Cohesion: 0.43
Nodes (5): COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS, SubjectWorkspaceDrawerProps

### Community 71 - "quota-or-choice-regression.test.ts"
Cohesion: 0.52
Nodes (4): evaluatePaperInternalChoiceCompliance(), PreflightReport, validatePaperPreflight(), validateSubPartsSum()

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 465 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `m3-forensic-adversarial.test.ts` to `kindergarten/types.ts`, `blueprintImport.ts`, `paperImport.ts`, `blueprints.ts`, `package.json`, `parseMatchColumnPairs`, `sanskrit-academic-quality.test.ts`, `SyllabusImportModal.tsx`, `HttpError`, `papers.ts`, `dto.ts`, `diagram-search.ts`, `blueprint.ts`, `schemas.ts`, `batchQuestionIo.ts`, `questionValidator.ts`, `curriculumContract.ts`, `toQuestionDto`, `studio.test.ts`, `vitest`, `print-logistics.ts`, `math.ts`, `m1-rbac-adversarial-stress.test.ts`, `export-docx/route.ts`, `gemini.ts`, `layout.ts`, `subpartExtractor.ts`, `reconcileBlueprint.ts`, `quota-or-choice-regression.test.ts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06572769953051644 - nodes in this community are weakly interconnected._
- **Why does `react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `blueprintExport.ts`, `blueprints.ts`, `StandardMpbseConfigurator.tsx`, `FigureStudio.tsx`, `package.json`, `Modal`, `paperImport.ts`, `parseMatchColumnPairs`, `SubjectWorkspaceDrawer.tsx`, `SyllabusImportModal.tsx`, `QuestionView.tsx`, `QuestionForm.tsx`, `export-docx/route.ts`, `AppShell.tsx`, `blueprints/page.tsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `paperImport.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11923076923076924 - nodes in this community are weakly interconnected._
- **Why does `api()` connect `api` to `blueprintImport.ts`, `BlueprintEditorPage`, `Modal`, `blueprints/page.tsx`, `parseMatchColumnPairs`, `SyllabusImportModal.tsx`, `papers/[id]/page.tsx`, `SyllabusImportModal.tsx`, `QuestionView.tsx`, `QuestionForm.tsx`, `AppShell.tsx`, `layout.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `blueprints.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12317073170731707 - nodes in this community are weakly interconnected._