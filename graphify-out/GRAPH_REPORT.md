# Graph Report - exam-paper-builder  (2026-11-04)

## Corpus Check
- 422 files · ~624,553 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 2740 nodes · 10002 edges · 100 communities (95 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `36530498`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- FigureInspectors.tsx
- BlueprintEditor
- blueprints.ts
- FigureStudio.tsx
- geometry.ts
- package.json
- schemas.ts
- curriculumInit.ts
- syllabusImport.ts
- body
- presets/page.tsx
- time
- paperDocx.ts
- localization/index.ts
- api.ts
- diagram-search.ts
- constants.ts
- blueprint.ts
- figure-studio/types.ts
- render.ts
- devDependencies
- class-assignment-rbac.test.ts
- batchQuestionIo.ts
- curriculumContract.ts
- ui.tsx
- @playwright/test
- papers/page.tsx
- api
- compilerOptions
- dependencies
- app/layout.tsx
- body
- scripts
- SyllabusImportModal.tsx
- e2e.mjs
- curriculumTemplates.ts
- studio.test.ts
- text.ts
- papers.ts
- _shared.tsx
- internalChoiceRules.ts
- blueprints/page.tsx
- prisma.ts
- MathParser
- PasteQuestionsPanel.tsx
- vitest
- vitest
- math.ts
- README.md
- QuestionForm.tsx
- AGENTS.md
- deploy.sh
- security-super-admin.test.ts
- react
- internalChoiceRules.ts
- checkBoundedPartitionFeasible
- gemini.ts
- SubjectWorkspaceDrawer.tsx
- presets.ts
- subpartExtractor.ts
- QuestionPicker.tsx
- paperAutogen.ts
- curriculumContract.ts
- officialTemplates.ts
- PaperSheets.tsx
- englishTitles.ts
- geminiPool.ts
- curriculumData.ts
- blueprintStructure.ts
- dto.ts
- registry.ts
- schoolProfile.ts
- answerKeyFill.ts
- BlueprintTemplate
- worksheet.ts
- MathRichEditor
- e2e-school.mjs
- compare.tsx
- joinDots.tsx
- pattern.tsx
- KindergartenEditorProps
- ref_node_fs
- e2e-live-generation.mjs
- kindergarten/types.ts
- blueprintSheet.ts
- reset-content.mjs
- MathRichEditor.tsx
- ai-paper-review.mjs
- seed-vs-scheme.test.ts
- Project: Sarvodaya School Examination Portal — Production Business Logic
- e2e-blueprint.mjs
- Gemini API keys and rate limits
- Curriculum and blueprint coverage matrix (MPBSE, session 2026-27)
- print-logistics.ts
- blueprintExport.ts
- precisionChecks.ts
- [name]/route.ts
- QuestionImportModal

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 161 edges
2. `vitest` - 104 edges
3. `body()` - 102 edges
4. `api()` - 101 edges
5. `recordAudit()` - 91 edges
6. `prisma` - 87 edges
7. `react` - 86 edges
8. `route()` - 83 edges
9. `loadPaperView()` - 68 edges
10. `lucide-react` - 65 edges

## Surprising Connections (you probably didn't know these)
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `Update 2: shared marks, components, regeneration (verified against a running server)` --references--> `questionSlotMarks()`  [INFERRED]
  docs/audit/PHASE1_AUDIT.md → src/lib/blueprint.ts
- `Additional defects found and fixed` --references--> `whyCannotAdd()`  [INFERRED]
  docs/audit/PHASE1_AUDIT.md → src/lib/blueprint.ts
- `Findings` --references--> `whyCannotAdd()`  [INFERRED]
  docs/audit/PHASE1_AUDIT.md → src/lib/blueprint.ts
- `M2 (Section Enrollment & Print Logistics)` --references--> `toAcademicClassDto()`  [INFERRED]
  PROJECT.md → src/lib/classes.ts

## Import Cycles
- None detected.

## Communities (100 total, 5 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.13
Nodes (24): react, CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint(), PictureMatchEditor() (+16 more)

### Community 1 - "FigureInspectors.tsx"
Cohesion: 0.09
Nodes (55): AlignMode, AlignTools(), AxesInspector(), CanvasSizeControls(), CHIP, decompose(), FRACTION_PRESETS, FractionField() (+47 more)

### Community 2 - "BlueprintEditor"
Cohesion: 0.07
Nodes (41): BlueprintEditor(), addQuestionTypeToGroup(), addSectionGroup(), applySchoolPattern(), applyStarterTemplate(), autoDistributeMarks(), buildPaperDirectly(), handleImportedBlueprint() (+33 more)

### Community 3 - "blueprints.ts"
Cohesion: 0.21
Nodes (18): adaptRequestSchema, POST, GET, ChapterItem, CustomSchoolTermConfigurator(), CustomSchoolTermConfiguratorProps, checkBlueprintFeasibility(), validateBlueprint() (+10 more)

### Community 4 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (33): ActiveHandle, CURSOR_CROSS, CURSOR_ERASER, CURSOR_TEXT, Glyph(), GroupId, hasBoxFields(), RAIL (+25 more)

### Community 5 - "geometry.ts"
Cohesion: 0.06
Nodes (73): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), axesLayout() (+65 more)

### Community 6 - "package.json"
Cohesion: 0.12
Nodes (15): eslintConfig, name, private, version, eslint, eslint-config-next, prisma, react-dom (+7 more)

### Community 7 - "schemas.ts"
Cohesion: 0.09
Nodes (40): POST, assertCanEditClass(), PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject(), ensureSchoolSubjects() (+32 more)

### Community 8 - "curriculumInit.ts"
Cohesion: 0.09
Nodes (36): main(), prisma, register(), curriculumSeedSignature(), ensureCurriculumSeeded(), findOrCreatePartChapter(), seedCurriculumData(), syncBlueprintTemplates() (+28 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.19
Nodes (22): parseSchema, POST, parseSyllabusWithGemini(), getCanonicalSubjectName(), normalizePresetSubject(), ensureLanguageNonChapterUnits(), getLanguageNonChapterUnits(), hasDomainCovered() (+14 more)

### Community 10 - "body"
Cohesion: 0.08
Nodes (48): DELETE, GET, PUT, GET, POST, POST, DELETE, GET (+40 more)

### Community 11 - "presets/page.tsx"
Cohesion: 0.09
Nodes (44): blankPreset(), payloadOf(), PresetsPage(), leave(), open(), restoreOrDelete(), save(), select() (+36 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "paperDocx.ts"
Cohesion: 0.23
Nodes (25): docx, buildBlocks(), QuestionDuplicateModalProps, canHaveSubparts(), cleanQuestionStatement(), detectPaperLanguage, formatExerciseFormula(), formatMarksLabel() (+17 more)

### Community 14 - "localization/index.ts"
Cohesion: 0.11
Nodes (26): AIQuestionGeneratorModalProps, GeneratedQuestionPayload, TabMode, BILINGUAL_DICTIONARY, DEVANAGARI_LETTERS, ENGLISH_DICTIONARY, ENGLISH_SECTION_TYPE_MAP, HINDI_DICTIONARY (+18 more)

### Community 15 - "api.ts"
Cohesion: 0.08
Nodes (30): Architecture, server-only, POST, codeMatches(), POST, POST, EXT_BY_TYPE, POST (+22 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.26
Nodes (13): GET, POST, CURATED_DIAGRAMS, CuratedDiagram, DIAGRAM_STOP_WORDS, DiagramCandidate, DiagramEligibility, findEligibleDiagrams() (+5 more)

### Community 17 - "constants.ts"
Cohesion: 0.05
Nodes (51): PaperPreflightModal(), PaperPreflightModalProps, DEFAULT_SPACE, ParsedQuestionItem, AcademicSession, DerangedMatchColumnResult, DIFFICULTIES, formatQuestionNumber() (+43 more)

### Community 18 - "blueprint.ts"
Cohesion: 0.08
Nodes (33): AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits(), PASSAGE_PARENT_TYPES (+25 more)

### Community 19 - "figure-studio/types.ts"
Cohesion: 0.13
Nodes (26): AngleLabelMode, AxesObj, Base, BoxFields, BoxObj, CANVAS_PRESETS, FractionModel, FractionObj (+18 more)

### Community 20 - "render.ts"
Cohesion: 0.20
Nodes (24): boxCenter(), hatchGeometry(), applyStyle(), drawArrowhead(), drawingBox(), drawParallelMarks(), drawStacked(), drawTickLabel() (+16 more)

### Community 21 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, @playwright/test, prisma, tailwindcss, @tailwindcss/turbopack, @types/katex (+5 more)

### Community 22 - "class-assignment-rbac.test.ts"
Cohesion: 0.10
Nodes (29): bcryptjs, DELETE, assertCanEditClass(), POST, GET, PATCH, DELETE, PATCH (+21 more)

### Community 23 - "batchQuestionIo.ts"
Cohesion: 0.07
Nodes (46): RFC-4180, assert(), runServerChecks(), MultiSetGeneratorModal(), BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat (+38 more)

### Community 24 - "curriculumContract.ts"
Cohesion: 0.11
Nodes (51): buildAndValidateGenerationContract(), GenerationContract, getForbiddenDomainsForSubject(), isParaphraseOrDuplicateChoice(), createSubjectContract(), createSubjectContract(), createSubjectContract(), createTestContract() (+43 more)

### Community 25 - "ui.tsx"
Cohesion: 0.08
Nodes (36): AssignmentField(), ROLE_BADGE, ROLE_HELP, RoleField(), toPickerClasses(), UsersAdminPage(), AppLayout(), LoginPage() (+28 more)

### Community 26 - "@playwright/test"
Cohesion: 0.32
Nodes (5): @playwright/test, applySessionCookie(), generateSessionCookie(), applySessionCookie(), generateSessionCookie()

### Community 27 - "papers/page.tsx"
Cohesion: 0.14
Nodes (26): nextConfig, next, ExamCellPage(), Tab, DashboardPage(), Data, Filter, PrintPage() (+18 more)

### Community 28 - "api"
Cohesion: 0.08
Nodes (36): ActivityLogPage(), Filters, OUTCOME_TONE, query(), today(), ClassesHierarchyPage(), addMissingStandardSubjects(), addSectionToClass() (+28 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, docx, katex, lucide-react, mathlive, next, @prisma/client (+4 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "body"
Cohesion: 0.07
Nodes (48): zod, generateSchema, POST, parseBlueprintSchema, POST, feasibilityCheckSchema, POST, POST (+40 more)

### Community 33 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, seed, seed:mpbse, start, test (+1 more)

### Community 34 - "SyllabusImportModal.tsx"
Cohesion: 0.10
Nodes (30): BooksPage(), openBookDialog(), removeBook(), removeChapter(), run(), saveBook(), saveChapter(), SectionRosterItem() (+22 more)

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "curriculumTemplates.ts"
Cohesion: 0.14
Nodes (21): attachOfficialSource(), BlueprintTemplateSectionGroup, ChoicePolicy, ChoicePolicyType, Circular465AuditResult, Circular465Violation, createChoicePolicy(), generateEnglish15Q80MSectionGroups() (+13 more)

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk(), PNG_KEYWORD (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.18
Nodes (11): cssVar(), fontCss(), fontStack(), Measurer, measureWidth(), setMeasurer(), TEXT_PAD, TextLayout (+3 more)

### Community 39 - "papers.ts"
Cohesion: 0.15
Nodes (23): bulkSchema, POST, Skipped, bulkDifficultySchema, POST, bulkUpdateSchema, POST, paperInclude (+15 more)

### Community 40 - "_shared.tsx"
Cohesion: 0.19
Nodes (28): ColourEditor(), colourPlugin, ColourPrint(), COLOURS, SWATCH, CompareEditor(), JoinDotsEditor(), MissingLettersEditor() (+20 more)

### Community 41 - "internalChoiceRules.ts"
Cohesion: 0.07
Nodes (51): POST, BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent(), BlueprintImportModalProps, PaperImportModal(), PaperImportModalProps (+43 more)

### Community 42 - "blueprints/page.tsx"
Cohesion: 0.14
Nodes (16): BlueprintsPage(), clearBulk(), remove(), runBulk(), subjectMatches(), AIBlueprintModal(), AIBlueprintModalProps, ChapterDraft (+8 more)

### Community 43 - "prisma.ts"
Cohesion: 0.09
Nodes (52): Feature Inventory, GET, POST, GET, POST, safeJsonArray(), POST, GET (+44 more)

### Community 45 - "PasteQuestionsPanel.tsx"
Cohesion: 0.14
Nodes (24): Override, PASTEABLE_TYPES, PasteQuestionsPanel(), SPACE, Difficulty, assignChapters(), normaliseAnswer(), PastedQuestion (+16 more)

### Community 46 - "vitest"
Cohesion: 0.11
Nodes (15): M3 (Question Exhaustion Tagging), Bar(), PaperBuilderPage(), handleAutofill(), CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory (+7 more)

### Community 47 - "vitest"
Cohesion: 0.07
Nodes (41): vitest, auditSchema, POST, paper, questionSlotMarks(), auditPaperEvidenceBased(), AuditPaperInput, EvidenceAuditFinding (+33 more)

### Community 48 - "math.ts"
Cohesion: 0.19
Nodes (17): splitOutsideMath(), cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, extractTableFromText(), findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX (+9 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "QuestionForm.tsx"
Cohesion: 0.08
Nodes (38): OmrSheetPage(), DiagramSearchModal(), DiagramSearchModalProps, MathCategory, MathSnippet, MathToolbar(), SNIPPETS, DEFAULT_ASSERTION_OPTIONS_EN (+30 more)

### Community 54 - "security-super-admin.test.ts"
Cohesion: 0.09
Nodes (32): GET, POST, ACTION_TEXT, ACTIVITY_CATEGORIES, ActivityCategoryKey, ActivityEntry, categoryOf(), describeActivity() (+24 more)

### Community 55 - "react"
Cohesion: 0.07
Nodes (42): lucide-react, emptyBook, QuestionExportModal(), QuestionsPage(), remove(), Activity, CATEGORY_LABEL, CATEGORY_ORDER (+34 more)

### Community 56 - "internalChoiceRules.ts"
Cohesion: 0.13
Nodes (24): BoardRuleConflictResult, detectBoardRuleConflict(), detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId, getBoardDefaultChoiceRequirement(), InternalChoiceIssue (+16 more)

### Community 57 - "checkBoundedPartitionFeasible"
Cohesion: 0.50
Nodes (4): checkBoundedPartitionFeasible(), getSolutions(), solve(), search()

### Community 58 - "gemini.ts"
Cohesion: 0.06
Nodes (54): improveSchema, POST, figureSchema, POST, DEFAULT_DIFFICULTY_PROFILE, DIFFICULTY_PROFILES, DifficultyInput, DifficultyLevel (+46 more)

### Community 59 - "SubjectWorkspaceDrawer.tsx"
Cohesion: 0.36
Nodes (6): COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS, SubjectWorkspaceDrawer(), SubjectWorkspaceDrawerProps

### Community 60 - "presets.ts"
Cohesion: 0.12
Nodes (18): STANDARD_CURRICULUM_PRESETS, blueprintPresetSchema, builtInBlueprintPresets(), builtInSyllabusPresets(), CUSTOM_PREFIX, iso(), PresetData, PresetOrigin (+10 more)

### Community 61 - "subpartExtractor.ts"
Cohesion: 0.23
Nodes (11): DecomposedSubpartsResult, decomposeStemSubparts(), detectAttemptCount(), DEVANAGARI_CONSONANTS, DEVANAGARI_DIGITS, findSequenceMatches(), isFalsePositiveParenthesis(), isInsideMath() (+3 more)

### Community 62 - "QuestionPicker.tsx"
Cohesion: 0.13
Nodes (42): AnswerKeyFill, FillState, getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), AIPaperGeneratorModal(), AIPaperGeneratorModalProps, DifficultySelect() (+34 more)

### Community 63 - "paperAutogen.ts"
Cohesion: 0.15
Nodes (21): POST, handleGenerateAiQuestion(), ChoicePolicy, CurriculumGenerationPayload, GenerationSlotContract, resolveChoicePolicyForSlot(), extractTestedTerms(), quotaErrorText() (+13 more)

### Community 64 - "curriculumContract.ts"
Cohesion: 0.07
Nodes (34): ValidatedQuestionPayload, QuestionType, CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, ChoicePolicyType, CLASS_10_SANSKRIT_SPECS, CLASS_12_MATH_CHAPTER_SPECS (+26 more)

### Community 65 - "officialTemplates.ts"
Cohesion: 0.11
Nodes (28): LANG, simulate(), written, FormatDef, FormatId, formatIdFor(), FORMATS, MUSIC_FORMATS (+20 more)

### Community 66 - "PaperSheets.tsx"
Cohesion: 0.14
Nodes (26): BlankPage(), Block, extractSectionLetter(), Page(), PaperSheets(), renderBlock(), SheetsInfo, DEFAULT_SCHOOL_LOGO (+18 more)

### Community 67 - "englishTitles.ts"
Cohesion: 0.20
Nodes (15): handleGenerate(), create(), handleGenerate(), anglicizeStoredTitles(), ENGLISH_BY_HINDI, englishName(), englishPresets(), englishSeed() (+7 more)

### Community 68 - "geminiPool.ts"
Cohesion: 0.16
Nodes (26): GET, getGeminiApiKey(), parseBlueprintWithGemini(), allKeysBlocked(), configuredKeys(), DEFAULT_RPM, Family, geminiGenerate() (+18 more)

### Community 69 - "curriculumData.ts"
Cohesion: 0.22
Nodes (11): ChapterSpec, CLASSES_DATA, SOURCE_DOCS_DATA, STREAMS_CONFIG, SUBJECTS_SEED, SubjectSpec, TextbookSpec, applySchemeCorrections() (+3 more)

### Community 70 - "blueprintStructure.ts"
Cohesion: 0.11
Nodes (21): Additional defects found and fixed, Findings, Not done (needs your input before it can be done correctly), Official sources actually read (MPBSE, session 2026-27), Phase 1 Audit: Blueprint, Curriculum and Paper Pipeline, Still open, Template inventory (27 MPBSE + 7 legacy), Update 2: shared marks, components, regeneration (verified against a running server) (+13 more)

### Community 71 - "dto.ts"
Cohesion: 0.06
Nodes (32): @prisma/client, prisma, prisma, prisma, prisma, prisma, prisma, prisma (+24 more)

### Community 72 - "registry.ts"
Cohesion: 0.12
Nodes (13): missingLettersPlugin, pictureMatchPlugin, pictureSumPlugin, preWritingPlugin, PreWritingPrint(), STROKE_LABEL, strokePath(), sequenceChainPlugin (+5 more)

### Community 73 - "schoolProfile.ts"
Cohesion: 0.16
Nodes (19): BlueprintTemplateModal(), readScope(), useViewScope(), ViewScopeBar(), ALIASES, classLevelOf(), DEFAULT_VIEW_SCOPE, DM (+11 more)

### Community 74 - "answerKeyFill.ts"
Cohesion: 0.20
Nodes (20): answerFields, POST, bank(), AnswerNeed, AnswerSource, blank(), FillFailure, fillMissingAnswers() (+12 more)

### Community 75 - "BlueprintTemplate"
Cohesion: 0.15
Nodes (11): StandardMpbseConfigurator(), StandardMpbseConfiguratorProps, BlueprintTemplateModalProps, BlueprintTemplate, ComponentRole, FormatSkeleton, MarkingComponent, OFFICIAL_FORMAT_2026_27 (+3 more)

### Community 76 - "worksheet.ts"
Cohesion: 0.17
Nodes (16): DELETE, patchSchema, PUT, addSchema, POST, POST, worksheetSchema, defaultExamDurationMin() (+8 more)

### Community 77 - "MathRichEditor"
Cohesion: 0.32
Nodes (11): MathRichEditor(), buildNodes(), createMath(), emit(), markEmpty(), onBlur(), onKeyDown(), placeNodes() (+3 more)

### Community 78 - "e2e-school.mjs"
Cohesion: 0.36
Nodes (10): aiChecks(), call(), canon(), data, failures, makeQuestion(), norm(), runTemplate() (+2 more)

### Community 79 - "compare.tsx"
Cohesion: 0.22
Nodes (9): comparePlugin, ComparePrint(), correctSide(), isCount(), MODE_LABEL, Side(), CompareConfig, CompareMode (+1 more)

### Community 80 - "joinDots.tsx"
Cohesion: 0.24
Nodes (9): dotLabel(), dotPoints(), DotsFigure(), joinDotsPlugin, JoinDotsPrint(), OUTLINES, SHAPE_NAMES, JoinDotsConfig (+1 more)

### Community 81 - "pattern.tsx"
Cohesion: 0.24
Nodes (10): expandPattern(), Glyph(), isShape(), patternPlugin, PatternPrint(), TokenPicker(), SHAPE_IDS, ShapeGlyph() (+2 more)

### Community 82 - "KindergartenEditorProps"
Cohesion: 0.31
Nodes (7): TraceWriteEditor(), traceWritePlugin, TraceWritePrint(), FourLineGuide(), FourLineGuideProps, RulingType, TraceWriteConfig

### Community 83 - "ref_node_fs"
Cohesion: 0.20
Nodes (4): failures, templates, prisma, UPLOAD_DIR

### Community 84 - "e2e-live-generation.mjs"
Cohesion: 0.22
Nodes (8): call(), chapters, grammarSec, passages, passageSec, perChapter, runSection(), tpl

### Community 85 - "kindergarten/types.ts"
Cohesion: 0.11
Nodes (21): numberGridPlugin, NumberGridPrint(), SequenceChainEditor(), SequenceChainPrint(), MathSquareGrid(), MathSquareGridProps, KindergartenCategory, KindergartenEditorProps (+13 more)

### Community 86 - "blueprintSheet.ts"
Cohesion: 0.12
Nodes (22): BlueprintPrintPage(), ChapterRows(), Sheet(), handleSubmit(), AcademicSessionContext, AcademicSessionContextType, CUSTOM_SESSIONS_STORAGE_KEY, normalizeSession() (+14 more)

### Community 87 - "reset-content.mjs"
Cohesion: 0.29
Nodes (7): CLASSES, main(), prisma, SECONDARY, SENIOR, sqliteFile(), TABLES

### Community 88 - "MathRichEditor.tsx"
Cohesion: 0.33
Nodes (5): mathlive, loadMathlive(), MathfieldCtor, MathRichEditorHandle, TEMPLATES

### Community 89 - "ai-paper-review.mjs"
Cohesion: 0.29
Nodes (5): [base = "http://localhost:3100", filter = "", out = "paper.txt"], bp, issues, lines, log

### Community 90 - "seed-vs-scheme.test.ts"
Cohesion: 0.38
Nodes (5): active(), byUnit(), canon(), REQUIRED, seeds

### Community 91 - "Project: Sarvodaya School Examination Portal — Production Business Logic"
Cohesion: 0.25
Nodes (7): Code Layout, Interface Contracts, M1 (RBAC & Ownership), M2 (Section Enrollment & Print Logistics), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, SectionDetail

### Community 92 - "e2e-blueprint.mjs"
Cohesion: 0.40
Nodes (4): call(), components, item, mk()

### Community 93 - "Gemini API keys and rate limits"
Cohesion: 0.50
Nodes (3): Gemini API keys and rate limits, Things to know, What the app does

### Community 95 - "print-logistics.ts"
Cohesion: 0.33
Nodes (9): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, ClassSectionInput (+1 more)

### Community 96 - "blueprintExport.ts"
Cohesion: 0.40
Nodes (9): BlueprintJsonModal(), BlueprintJsonModalProps, groupSectionsFromFlat(), BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson (+1 more)

### Community 97 - "precisionChecks.ts"
Cohesion: 0.27
Nodes (10): codes(), contentWords(), fillBlankGiveaway(), molecularMassOfIonic(), plainChem(), PrecisionCheckInput, PrecisionIssue, precisionIssues() (+2 more)

### Community 98 - "[name]/route.ts"
Cohesion: 0.28
Nodes (4): GET, TYPE_BY_EXT, UPLOAD_DIR, __dirname

### Community 99 - "QuestionImportModal"
Cohesion: 0.50
Nodes (3): QuestionImportModal(), handleFileChange(), validateContent()

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 742 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `kindergarten/types.ts`, `BlueprintEditor`, `blueprints.ts`, `package.json`, `schemas.ts`, `curriculumInit.ts`, `syllabusImport.ts`, `body`, `paperDocx.ts`, `api.ts`, `diagram-search.ts`, `constants.ts`, `blueprint.ts`, `class-assignment-rbac.test.ts`, `batchQuestionIo.ts`, `curriculumContract.ts`, `curriculumTemplates.ts`, `studio.test.ts`, `internalChoiceRules.ts`, `prisma.ts`, `PasteQuestionsPanel.tsx`, `vitest`, `math.ts`, `security-super-admin.test.ts`, `gemini.ts`, `presets.ts`, `subpartExtractor.ts`, `QuestionPicker.tsx`, `paperAutogen.ts`, `curriculumContract.ts`, `officialTemplates.ts`, `PaperSheets.tsx`, `englishTitles.ts`, `geminiPool.ts`, `curriculumData.ts`, `blueprintStructure.ts`, `dto.ts`, `schoolProfile.ts`, `answerKeyFill.ts`, `blueprintSheet.ts`, `seed-vs-scheme.test.ts`, `print-logistics.ts`, `[name]/route.ts`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13368983957219252 - nodes in this community are weakly interconnected._
- **Why does `react` connect `kindergarten/types.ts` to `FigureInspectors.tsx`, `BlueprintEditor`, `blueprints.ts`, `FigureStudio.tsx`, `package.json`, `presets/page.tsx`, `localization/index.ts`, `constants.ts`, `ui.tsx`, `papers/page.tsx`, `api`, `SyllabusImportModal.tsx`, `_shared.tsx`, `internalChoiceRules.ts`, `blueprints/page.tsx`, `PasteQuestionsPanel.tsx`, `QuestionForm.tsx`, `react`, `gemini.ts`, `SubjectWorkspaceDrawer.tsx`, `QuestionPicker.tsx`, `PaperSheets.tsx`, `registry.ts`, `schoolProfile.ts`, `BlueprintTemplate`, `compare.tsx`, `joinDots.tsx`, `pattern.tsx`, `KindergartenEditorProps`, `kindergarten/types.ts`, `blueprintSheet.ts`, `MathRichEditor.tsx`, `blueprintExport.ts`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Should `FigureInspectors.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08832425892316999 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `kindergarten/types.ts`, `FigureInspectors.tsx`, `BlueprintEditor`, `blueprints.ts`, `FigureStudio.tsx`, `package.json`, `presets/page.tsx`, `localization/index.ts`, `constants.ts`, `ui.tsx`, `papers/page.tsx`, `api`, `SyllabusImportModal.tsx`, `_shared.tsx`, `internalChoiceRules.ts`, `blueprints/page.tsx`, `vitest`, `QuestionForm.tsx`, `SubjectWorkspaceDrawer.tsx`, `QuestionPicker.tsx`, `schoolProfile.ts`, `BlueprintTemplate`, `blueprintSheet.ts`, `blueprintExport.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `BlueprintEditor` be split into smaller, more focused modules?**
  _Cohesion score 0.07020408163265306 - nodes in this community are weakly interconnected._