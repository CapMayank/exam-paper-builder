# Graph Report - exam-paper-builder  (2026-11-11)

## Corpus Check
- 458 files · ~669,621 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 3006 nodes · 11107 edges · 113 communities (103 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 112 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dedc28c1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- FigureInspectors.tsx
- blueprints/[id]/page.tsx
- geminiPool.ts
- verify-key/route.ts
- geometry.ts
- package.json
- schemas.ts
- curriculumInit.ts
- syllabusImport.ts
- HttpError
- presets/page.tsx
- time
- PaperSheets.tsx
- localization/index.ts
- blueprint.ts
- diagram-search.ts
- normalizeSession
- blueprint.ts
- figure-studio/types.ts
- render.ts
- devDependencies
- class-assignment-rbac.test.ts
- batchQuestionIo.ts
- mathQuestionValidator.ts
- lib/types.ts
- @playwright/test
- blueprintSetup.ts
- multiset.ts
- compilerOptions
- dependencies
- app/layout.tsx
- api.ts
- scripts
- blueprints/page.tsx
- e2e.mjs
- curriculumTemplates.ts
- studio.test.ts
- text.ts
- papers.ts
- _shared.tsx
- paperImport.ts
- lib/types.ts
- BlueprintTemplate
- MathParser
- QuestionForm.tsx
- vitest
- questionSlotMarks
- parseMatchColumnPairs
- README.md
- constants.ts
- AGENTS.md
- deploy.sh
- FigureInspectors.tsx
- react
- internalChoiceRules.ts
- questions/[itemId]/route.ts
- BlueprintPresetEditor.tsx
- api
- presets.ts
- subpartExtractor.ts
- AIPaperGeneratorModal.tsx
- questionValidator.ts
- curriculumContract.ts
- officialTemplates.ts
- buildAndValidateGenerationContract
- papers/import/route.ts
- gemini.ts
- Phase 1 Audit: Blueprint, Curriculum and Paper Pipeline
- blueprintStructure.ts
- dto.ts
- registry.ts
- classes/route.ts
- answerKeyFill.ts
- BlueprintsPage
- worksheet.ts
- MathRichEditor
- e2e-school.mjs
- compare.tsx
- joinDots.tsx
- schoolPatterns.ts
- MathRichEditor.tsx
- ref_node_fs
- e2e-live-generation.mjs
- kindergarten/types.ts
- questionTagging.ts
- reset-content.mjs
- paper-import-units.test.ts
- ai-paper-review.mjs
- seed-vs-scheme.test.ts
- pattern.tsx
- e2e-blueprint.mjs
- Gemini API keys and rate limits
- Curriculum and blueprint coverage matrix (MPBSE, session 2026-27)
- QuestionImportModal
- test-idempotency.ts
- questionVerificationEngine.ts
- session.ts
- audit-comprehensive-checks.ts
- blueprints/route.ts
- AppShell.tsx
- audit-db-verify.ts
- challenger-m1-c2-verify.ts
- challenger-m1-gate-verify.ts
- BlueprintImportModal.tsx
- KindergartenEditorProps
- inspect-all-chapter-marks.ts
- PaperBuilderPage
- PasteQuestionsPanel.tsx
- autofill/route.ts
- PaperImportModal
- StandardCurriculumPreset

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 172 edges
2. `vitest` - 122 edges
3. `api()` - 113 edges
4. `body()` - 104 edges
5. `prisma` - 98 edges
6. `recordAudit()` - 93 edges
7. `react` - 88 edges
8. `route()` - 88 edges
9. `loadPaperView()` - 73 edges
10. `lucide-react` - 67 edges

## Surprising Connections (you probably didn't know these)
- `Part 2 — Paper builder: OR question cannot be modified` --references--> `QuestionForm()`  [INFERRED]
  docs/audit-2026-11-05-ai-and-paper-builder.md → src/components/QuestionForm.tsx
- `Update 2: shared marks, components, regeneration (verified against a running server)` --references--> `questionSlotMarks()`  [INFERRED]
  docs/audit/PHASE1_AUDIT.md → src/lib/blueprint.ts
- `Part 3 — AI single-question Replace / Change OR does not follow the full-generation standard` --references--> `QuestionPicker()`  [INFERRED]
  docs/audit-2026-11-05-ai-and-paper-builder.md → src/components/QuestionPicker.tsx
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `Architecture` --references--> `SessionUser`  [INFERRED]
  PROJECT.md → src/lib/api.ts

## Import Cycles
- None detected.

## Communities (113 total, 10 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.11
Nodes (27): attach(), uploadImage(), CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), countItemsPlugin, CountItemsPrint() (+19 more)

### Community 1 - "FigureInspectors.tsx"
Cohesion: 0.08
Nodes (54): AlignTools(), AxesInspector(), CanvasSizeControls(), CHIP, FractionInspector(), LABEL, NumInput(), Section() (+46 more)

### Community 2 - "blueprints/[id]/page.tsx"
Cohesion: 0.06
Nodes (54): BlueprintEditor(), addQuestionTypeToGroup(), addSectionGroup(), applySchoolPattern(), applyStarterTemplate(), autoDistributeMarks(), buildPaperDirectly(), hasExplicitSlotOverride() (+46 more)

### Community 3 - "geminiPool.ts"
Cohesion: 0.15
Nodes (27): GET, getGeminiApiKey(), allKeysBlocked(), configuredKeys(), DEFAULT_RPM, Family, geminiGenerate(), interpretRateLimit() (+19 more)

### Community 4 - "verify-key/route.ts"
Cohesion: 0.15
Nodes (23): fields, parseOptions(), POST, KeyDisputesBanner(), acceptChecked(), KEY_CHECK_TYPES, KeyDisagreement, keysAgree() (+15 more)

### Community 5 - "geometry.ts"
Cohesion: 0.06
Nodes (71): AlignMode, alignObjects(), angleGeom, angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough() (+63 more)

### Community 6 - "package.json"
Cohesion: 0.12
Nodes (15): eslintConfig, name, private, version, eslint, eslint-config-next, prisma, react-dom (+7 more)

### Community 7 - "schemas.ts"
Cohesion: 0.06
Nodes (34): AuditAction, MAX_OPTIONS, MIN_OPTIONS, SESSION_SLOTS, TIMETABLE_STATUSES, USER_ROLES, addItemSchema, assignmentList (+26 more)

### Community 8 - "curriculumInit.ts"
Cohesion: 0.05
Nodes (66): main(), prisma, GET, register(), ChapterSpec, CLASSES_DATA, SOURCE_DOCS_DATA, STREAMS_CONFIG (+58 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.20
Nodes (22): parseSyllabusWithGemini(), book(), ROLE, getCanonicalSubjectName(), normalizePresetSubject(), ensureLanguageNonChapterUnits(), getLanguageNonChapterUnits(), hasDomainCovered() (+14 more)

### Community 10 - "HttpError"
Cohesion: 0.09
Nodes (51): POST, POST, POST, DELETE, POST, POST, DELETE, GET (+43 more)

### Community 11 - "presets/page.tsx"
Cohesion: 0.15
Nodes (27): blankPreset(), payloadOf(), PresetsPage(), leave(), open(), restoreOrDelete(), save(), select() (+19 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "PaperSheets.tsx"
Cohesion: 0.09
Nodes (58): docx, BlankPage(), Block, buildBlocks(), extractSectionLetter(), Page(), PaperSheets(), renderBlock() (+50 more)

### Community 14 - "localization/index.ts"
Cohesion: 0.14
Nodes (20): BILINGUAL_DICTIONARY, DEVANAGARI_LETTERS, ENGLISH_DICTIONARY, ENGLISH_SECTION_TYPE_MAP, HINDI_DICTIONARY, LOCALES, localizeSectionTitle(), resolvePartSuffix() (+12 more)

### Community 15 - "blueprint.ts"
Cohesion: 0.06
Nodes (58): assert(), runServerChecks(), POST, generated, generateMock, AutoFillOptions, autoFillPaper(), solve() (+50 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.26
Nodes (13): GET, POST, CURATED_DIAGRAMS, CuratedDiagram, DIAGRAM_STOP_WORDS, DiagramCandidate, DiagramEligibility, findEligibleDiagrams() (+5 more)

### Community 17 - "normalizeSession"
Cohesion: 0.14
Nodes (19): BlueprintPrintPage(), ChapterRows(), Sheet(), handleSubmit(), AcademicSessionContext, AcademicSessionContextType, CUSTOM_SESSIONS_STORAGE_KEY, normalizeSession() (+11 more)

### Community 18 - "blueprint.ts"
Cohesion: 0.24
Nodes (17): adaptRequestSchema, POST, ChapterItem, CustomSchoolTermConfigurator(), CustomSchoolTermConfiguratorProps, checkBlueprintFeasibility(), validateBlueprint(), adaptCustomSchoolBlueprint() (+9 more)

### Community 19 - "figure-studio/types.ts"
Cohesion: 0.08
Nodes (40): AI_EXAMPLES, InsertPanel(), InsertTab, StampThumb(), TEMPLATE_GROUPS, STAMP_CATEGORIES, STAMP_REGISTRY, StampDef (+32 more)

### Community 20 - "render.ts"
Cohesion: 0.19
Nodes (25): boxCenter(), boxCorners(), hatchGeometry(), applyStyle(), drawArrowhead(), drawingBox(), drawParallelMarks(), drawStacked() (+17 more)

### Community 21 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, @playwright/test, prisma, tailwindcss, @tailwindcss/turbopack, @types/katex (+5 more)

### Community 22 - "class-assignment-rbac.test.ts"
Cohesion: 0.05
Nodes (69): bcryptjs, GET, POST, POST, POST, assertCanEditClass(), DELETE, PATCH (+61 more)

### Community 23 - "batchQuestionIo.ts"
Cohesion: 0.13
Nodes (31): RFC-4180, GET, QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat, BatchParseOptions (+23 more)

### Community 24 - "mathQuestionValidator.ts"
Cohesion: 0.36
Nodes (15): GenerationContract, resolveChoicePolicyForSlot(), CoordinatePoint, evaluateArithmeticExpression(), extractCoordinatePoints(), MathToken, normalizeMathString(), parseQuadraticEquation() (+7 more)

### Community 25 - "lib/types.ts"
Cohesion: 0.07
Nodes (57): ActivityLogPage(), Filters, OUTCOME_TONE, query(), today(), AssignmentField(), ROLE_BADGE, ROLE_HELP (+49 more)

### Community 26 - "@playwright/test"
Cohesion: 0.32
Nodes (5): @playwright/test, applySessionCookie(), generateSessionCookie(), applySessionCookie(), generateSessionCookie()

### Community 27 - "blueprintSetup.ts"
Cohesion: 0.08
Nodes (53): POST, setupSchema, BlueprintSetupPage(), apply(), setClassOn(), Choice, ImpactLine(), minutesLabel() (+45 more)

### Community 28 - "multiset.ts"
Cohesion: 0.13
Nodes (18): PaperPreflightModal(), PaperPreflightModalProps, BlueprintSectionDef, calculateSectionOverlap(), CandidateQuestionDef, formatSetIdentifier(), LETTERS, MultiSetPlanResult (+10 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, docx, katex, lucide-react, mathlive, next, @prisma/client (+4 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "api.ts"
Cohesion: 0.06
Nodes (48): server-only, zod, generateSchema, POST, improveSchema, POST, parseBlueprintSchema, parseSchema (+40 more)

### Community 33 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, seed, seed:mpbse, start, test (+1 more)

### Community 34 - "blueprints/page.tsx"
Cohesion: 0.10
Nodes (33): Findings, handleLoadOfficialTemplate(), BooksPage(), openBookDialog(), removeBook(), removeChapter(), run(), saveBook() (+25 more)

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "curriculumTemplates.ts"
Cohesion: 0.13
Nodes (22): attachOfficialSource(), BlueprintTemplateSectionGroup, ChoicePolicy, ChoicePolicyType, Circular465AuditResult, Circular465Violation, createChoicePolicy(), generateEnglish15Q80MSectionGroups() (+14 more)

### Community 37 - "studio.test.ts"
Cohesion: 0.17
Nodes (11): rotateAround(), crc32(), crcTable, extractSceneFromPng(), isPng(), makeTextChunk(), PNG_KEYWORD, PNG_SIG (+3 more)

### Community 38 - "text.ts"
Cohesion: 0.17
Nodes (13): textBoxSize(), cssVar(), fontCss(), fontStack(), layoutText(), Measurer, measureWidth(), setMeasurer() (+5 more)

### Community 39 - "papers.ts"
Cohesion: 0.08
Nodes (45): Feature Inventory, auditSchema, POST, GET, POST, GET, GET, GET (+37 more)

### Community 40 - "_shared.tsx"
Cohesion: 0.19
Nodes (27): ColourEditor(), colourPlugin, ColourPrint(), COLOURS, SWATCH, CompareEditor(), JoinDotsEditor(), MissingLettersEditor() (+19 more)

### Community 41 - "paperImport.ts"
Cohesion: 0.13
Nodes (25): PaperImportModalProps, inferExamTypeFromText(), paper, BlueprintSectionCandidate, ChapterVerificationResult, extractPaperJsonFromReply(), importedAttemptCount(), importedDifficulty() (+17 more)

### Community 42 - "lib/types.ts"
Cohesion: 0.16
Nodes (18): SessionSlot, TimetableStatus, calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics (+10 more)

### Community 43 - "BlueprintTemplate"
Cohesion: 0.15
Nodes (11): StandardMpbseConfigurator(), StandardMpbseConfiguratorProps, BlueprintTemplateModalProps, BlueprintTemplate, ComponentRole, FormatSkeleton, MarkingComponent, OFFICIAL_FORMAT_2026_27 (+3 more)

### Community 45 - "QuestionForm.tsx"
Cohesion: 0.07
Nodes (61): AnswerKeyFill, FillState, getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), DiagramSearchModal(), DiagramSearchModalProps, MathText() (+53 more)

### Community 46 - "vitest"
Cohesion: 0.18
Nodes (17): Code Layout, Interface Contracts, M1 (RBAC & Ownership), M3 (Question Exhaustion Tagging), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, CATEGORY_STYLES, CompactExamTagInfo (+9 more)

### Community 47 - "questionSlotMarks"
Cohesion: 0.15
Nodes (13): vitest, paper, evaluateMPBoardStandardCompliance(), MPBoardComplianceReport, MPBoardDimensionScore, AcademicBalanceResult, BlueprintComplianceResult, MarksValidationResult (+5 more)

### Community 48 - "parseMatchColumnPairs"
Cohesion: 0.11
Nodes (33): cleanMatchItem(), derangeMatchColumnPairs(), extractColumnIIItems(), extractColumnIItems(), extractMatchPairsFromExplanation(), getMatchColumnInstruction(), MatchColumnPair, parseMatchColumnPairs() (+25 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "constants.ts"
Cohesion: 0.09
Nodes (26): DEFAULT_SPACE, ParsedQuestionItem, AcademicSession, DerangedMatchColumnResult, DIFFICULTIES, KG_CLASSES, KG_SUBJECTS, KINDERGARTEN_QUESTION_TYPES (+18 more)

### Community 54 - "FigureInspectors.tsx"
Cohesion: 0.21
Nodes (19): AlignMode, decompose(), FRACTION_PRESETS, FractionField(), near(), NumberLineInspector(), NUMLINE_PRESETS, readEntryPref() (+11 more)

### Community 55 - "react"
Cohesion: 0.06
Nodes (68): nextConfig, lucide-react, next, react, Filter, QuestionExportModal(), QuestionsPage(), remove() (+60 more)

### Community 56 - "internalChoiceRules.ts"
Cohesion: 0.11
Nodes (27): BoardRuleConflictResult, ChoicePaperLike, ChoiceSectionLike, detectBoardRuleConflict(), detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId (+19 more)

### Community 57 - "questions/[itemId]/route.ts"
Cohesion: 0.34
Nodes (14): POST, DELETE, editableItem(), EditedQuestion, PATCH, PUT, POST, roleMismatchReason() (+6 more)

### Community 58 - "BlueprintPresetEditor.tsx"
Cohesion: 0.22
Nodes (14): BlueprintPresetEditor(), MarksBar(), OR_LABEL, QT, sectionMarks(), AnyPreset, classGroupOf(), EXAM_TYPES (+6 more)

### Community 59 - "api"
Cohesion: 0.12
Nodes (25): ClassesHierarchyPage(), addMissingStandardSubjects(), addSectionToClass(), deleteClass(), deleteSubject(), removeSectionFromClass(), saveClass(), saveSubject() (+17 more)

### Community 60 - "presets.ts"
Cohesion: 0.12
Nodes (26): DELETE, existingCustom(), PATCH, PUT, target(), GET, isManager(), blueprintPresetSchema (+18 more)

### Community 61 - "subpartExtractor.ts"
Cohesion: 0.15
Nodes (17): validateChoiceParity(), subPartSchema, DecomposedSubpartsResult, detectAttemptCount(), DEVANAGARI_CONSONANTS, DEVANAGARI_DIGITS, findSequenceMatches(), isFalsePositiveParenthesis() (+9 more)

### Community 62 - "AIPaperGeneratorModal.tsx"
Cohesion: 0.10
Nodes (36): AIPaperGeneratorModal(), AIPaperGeneratorModalProps, DifficultySelect(), useDifficultyProfile(), embedSceneInPng(), PaperSnapshotDrawerProps, handleGenerateAiQuestion(), formDescription() (+28 more)

### Community 63 - "questionValidator.ts"
Cohesion: 0.14
Nodes (21): cleanChapterTitleForLookup(), GeminiCallResult, GenerationJobTrace, getRecentGenerationTraces(), recentTraces, resolveInternalChoiceRequirement(), BIOLOGY_CONTAMINATION_PATTERNS, checkDeletedSyllabusTopics() (+13 more)

### Community 64 - "curriculumContract.ts"
Cohesion: 0.08
Nodes (32): QuestionType, CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, ChoicePolicyType, CLASS_10_SANSKRIT_SPECS, CLASS_12_MATH_CHAPTER_SPECS, detectEducationBoard() (+24 more)

### Community 65 - "officialTemplates.ts"
Cohesion: 0.11
Nodes (28): LANG, simulate(), written, FormatDef, FormatId, formatIdFor(), FORMATS, MUSIC_FORMATS (+20 more)

### Community 66 - "buildAndValidateGenerationContract"
Cohesion: 0.20
Nodes (12): buildAndValidateGenerationContract(), getForbiddenDomainsForSubject(), createSubjectContract(), createSubjectContract(), createSubjectContract(), createTestContract(), createTestContract(), createTestContract() (+4 more)

### Community 67 - "papers/import/route.ts"
Cohesion: 0.45
Nodes (12): POST, POST, getQuestionTypeTier(), importedQuestionMarks(), importedQuestionUnits(), matchQuestionToBlueprintSection(), normalizeQuestionType(), normalizeText() (+4 more)

### Community 68 - "gemini.ts"
Cohesion: 0.04
Nodes (81): Audit: AI generation failures and paper-builder gaps (2026-11-05), Defects that turn this into user-visible errors, Part 1 — Why AI generation "suddenly" fails, Part 2 — Paper builder: OR question cannot be modified, Part 3 — AI single-question Replace / Change OR does not follow the full-generation standard, Part 4 — Full "Generate with AI" run on the audit paper, Root cause: Google moved the `-latest` aliases onto new models with much smaller free quotas, Round 2 — "Unseen passage in a long-answer section" and a full workflow sweep (not committed yet) (+73 more)

### Community 69 - "Phase 1 Audit: Blueprint, Curriculum and Paper Pipeline"
Cohesion: 0.18
Nodes (10): Additional defects found and fixed, Not done (needs your input before it can be done correctly), Official sources actually read (MPBSE, session 2026-27), Phase 1 Audit: Blueprint, Curriculum and Paper Pipeline, Still open, Template inventory (27 MPBSE + 7 legacy), Update 2: shared marks, components, regeneration (verified against a running server), Update 3: first live-model run (English Class 10, Reading + Grammar) (+2 more)

### Community 70 - "blueprintStructure.ts"
Cohesion: 0.26
Nodes (10): What was changed in this pass, codes(), auditTemplateStructure(), isLanguageTemplate(), LANGUAGE_SUBJECTS, PASSAGE_CONTAINER_TYPES, StructureFinding, StructureFindingCode (+2 more)

### Community 71 - "dto.ts"
Cohesion: 0.12
Nodes (25): @prisma/client, prisma, prisma, DEFAULT_ACADEMIC_SESSION, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES (+17 more)

### Community 72 - "registry.ts"
Cohesion: 0.13
Nodes (11): missingLettersPlugin, patternPlugin, pictureSumPlugin, preWritingPlugin, PreWritingPrint(), STROKE_LABEL, strokePath(), tickPicturePlugin (+3 more)

### Community 73 - "classes/route.ts"
Cohesion: 0.12
Nodes (34): M2 (Section Enrollment & Print Logistics), GET, POST, postClassUnionSchema, readScope(), useViewScope(), ViewScopeBar(), ensureClassAndSubject() (+26 more)

### Community 74 - "answerKeyFill.ts"
Cohesion: 0.20
Nodes (20): answerFields, POST, bank(), AnswerNeed, AnswerSource, blank(), FillFailure, fillMissingAnswers() (+12 more)

### Community 75 - "BlueprintsPage"
Cohesion: 0.20
Nodes (6): BlueprintsPage(), clearBulk(), remove(), runBulk(), subjectMatches(), BlueprintExportModal()

### Community 76 - "worksheet.ts"
Cohesion: 0.21
Nodes (13): DELETE, patchSchema, PUT, addSchema, POST, ActivityInput, addWorksheetActivity(), createWorksheet() (+5 more)

### Community 77 - "MathRichEditor"
Cohesion: 0.32
Nodes (11): MathRichEditor(), buildNodes(), createMath(), emit(), markEmpty(), onBlur(), onKeyDown(), placeNodes() (+3 more)

### Community 78 - "e2e-school.mjs"
Cohesion: 0.36
Nodes (10): aiChecks(), call(), canon(), data, failures, makeQuestion(), norm(), runTemplate() (+2 more)

### Community 79 - "compare.tsx"
Cohesion: 0.24
Nodes (8): comparePlugin, ComparePrint(), isCount(), MODE_LABEL, Side(), CompareConfig, CompareMode, CompareRow

### Community 80 - "joinDots.tsx"
Cohesion: 0.24
Nodes (9): dotLabel(), dotPoints(), DotsFigure(), joinDotsPlugin, JoinDotsPrint(), OUTLINES, SHAPE_NAMES, JoinDotsConfig (+1 more)

### Community 81 - "schoolPatterns.ts"
Cohesion: 0.20
Nodes (6): marksByRole(), Row, SCHOOL_PATTERNS, SLOT, slotMarksOf(), SlotRole

### Community 82 - "MathRichEditor.tsx"
Cohesion: 0.33
Nodes (5): mathlive, loadMathlive(), MathfieldCtor, MathRichEditorHandle, TEMPLATES

### Community 83 - "ref_node_fs"
Cohesion: 0.20
Nodes (4): failures, templates, prisma, UPLOAD_DIR

### Community 84 - "e2e-live-generation.mjs"
Cohesion: 0.22
Nodes (8): call(), chapters, grammarSec, passages, passageSec, perChapter, runSection(), tpl

### Community 85 - "kindergarten/types.ts"
Cohesion: 0.10
Nodes (22): numberGridPlugin, NumberGridPrint(), SequenceChainEditor(), sequenceChainPlugin, SequenceChainPrint(), MathSquareGrid(), MathSquareGridProps, KindergartenCategory (+14 more)

### Community 86 - "questionTagging.ts"
Cohesion: 0.18
Nodes (13): buildIndex(), ChapterBank, ChapterIndex, ChapterSuggestion, COGNITIVE_LEVELS, GENERIC, indexCache, indexFor() (+5 more)

### Community 87 - "reset-content.mjs"
Cohesion: 0.29
Nodes (7): CLASSES, main(), prisma, SECONDARY, SENIOR, sqliteFile(), TABLES

### Community 88 - "paper-import-units.test.ts"
Cohesion: 0.33
Nodes (6): blueprint, chapters, matchQuestion(), mcqs, paper(), Chapter

### Community 89 - "ai-paper-review.mjs"
Cohesion: 0.29
Nodes (5): [base = "http://localhost:3100", filter = "", out = "paper.txt"], bp, issues, lines, log

### Community 90 - "seed-vs-scheme.test.ts"
Cohesion: 0.38
Nodes (5): active(), byUnit(), canon(), REQUIRED, seeds

### Community 91 - "pattern.tsx"
Cohesion: 0.29
Nodes (10): expandPattern(), Glyph(), isShape(), PatternEditor(), PatternPrint(), TokenPicker(), SHAPE_IDS, ShapeGlyph() (+2 more)

### Community 92 - "e2e-blueprint.mjs"
Cohesion: 0.40
Nodes (4): call(), components, item, mk()

### Community 93 - "Gemini API keys and rate limits"
Cohesion: 0.50
Nodes (3): Gemini API keys and rate limits, Things to know, What the app does

### Community 95 - "QuestionImportModal"
Cohesion: 0.50
Nodes (3): QuestionImportModal(), handleFileChange(), validateContent()

### Community 96 - "test-idempotency.ts"
Cohesion: 0.67
Nodes (3): getCounts(), main(), prisma

### Community 97 - "questionVerificationEngine.ts"
Cohesion: 0.14
Nodes (21): codes(), contentWords(), fillBlankGiveaway(), molecularMassOfIonic(), plainChem(), PrecisionCheckInput, PrecisionIssue, precisionIssues() (+13 more)

### Community 98 - "session.ts"
Cohesion: 0.12
Nodes (16): Architecture, POST, codeMatches(), POST, GET, TYPE_BY_EXT, EXT_BY_TYPE, POST (+8 more)

### Community 100 - "blueprints/route.ts"
Cohesion: 0.19
Nodes (15): GET, GET, PUT, GET, POST, assertBlueprintValid(), blueprintInclude, BlueprintInput (+7 more)

### Community 101 - "AppShell.tsx"
Cohesion: 0.12
Nodes (20): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AcademicSessionSelectorProps, AppShell() (+12 more)

### Community 105 - "BlueprintImportModal.tsx"
Cohesion: 0.11
Nodes (33): handleImportedBlueprint(), BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent(), BlueprintImportModalProps, BlueprintJsonModal(), BlueprintJsonModalProps (+25 more)

### Community 106 - "KindergartenEditorProps"
Cohesion: 0.31
Nodes (7): TraceWriteEditor(), traceWritePlugin, TraceWritePrint(), FourLineGuide(), FourLineGuideProps, RulingType, TraceWriteConfig

### Community 109 - "PaperBuilderPage"
Cohesion: 0.08
Nodes (10): Bar(), MultiSetGeneratorModal(), PaperBuilderPage(), handleAutofill(), COMMON_FORMULA_SNIPPETS, FormulaSnippet, InstructionPreset, STANDARD_INSTRUCTION_PRESETS (+2 more)

### Community 115 - "PasteQuestionsPanel.tsx"
Cohesion: 0.17
Nodes (17): Override, PASTEABLE_TYPES, PasteQuestionsPanel(), SPACE, assignChapters(), normaliseAnswer(), PastedQuestion, splitInline() (+9 more)

### Community 122 - "autofill/route.ts"
Cohesion: 0.10
Nodes (34): POST, safeJsonArray(), POST, duplicateSetSchema, POST, parallelSetsSchema, POST, POST (+26 more)

### Community 126 - "PaperImportModal"
Cohesion: 0.25
Nodes (3): PaperImportModal(), handleImport(), writeAnswerKey()

### Community 132 - "StandardCurriculumPreset"
Cohesion: 0.36
Nodes (6): STANDARD_CURRICULUM_PRESETS, chapters(), parts(), SCHOOL_CLASS_1_TO_8_PRESETS, ParsedChapterItem, StandardCurriculumPreset

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 818 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `questionSlotMarks` to `blueprints/[id]/page.tsx`, `geminiPool.ts`, `verify-key/route.ts`, `package.json`, `schemas.ts`, `curriculumInit.ts`, `syllabusImport.ts`, `HttpError`, `PaperSheets.tsx`, `localization/index.ts`, `blueprint.ts`, `diagram-search.ts`, `normalizeSession`, `blueprint.ts`, `class-assignment-rbac.test.ts`, `batchQuestionIo.ts`, `mathQuestionValidator.ts`, `blueprintSetup.ts`, `multiset.ts`, `api.ts`, `curriculumTemplates.ts`, `studio.test.ts`, `papers.ts`, `paperImport.ts`, `lib/types.ts`, `QuestionForm.tsx`, `vitest`, `parseMatchColumnPairs`, `questions/[itemId]/route.ts`, `presets.ts`, `subpartExtractor.ts`, `AIPaperGeneratorModal.tsx`, `questionValidator.ts`, `curriculumContract.ts`, `officialTemplates.ts`, `buildAndValidateGenerationContract`, `gemini.ts`, `blueprintStructure.ts`, `dto.ts`, `classes/route.ts`, `answerKeyFill.ts`, `paper-import-units.test.ts`, `seed-vs-scheme.test.ts`, `questionVerificationEngine.ts`, `session.ts`, `blueprints/route.ts`, `BlueprintImportModal.tsx`, `PasteQuestionsPanel.tsx`, `autofill/route.ts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1126984126984127 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `kindergarten/types.ts`, `FigureInspectors.tsx`, `blueprints/[id]/page.tsx`, `verify-key/route.ts`, `package.json`, `presets/page.tsx`, `PaperSheets.tsx`, `normalizeSession`, `blueprint.ts`, `figure-studio/types.ts`, `lib/types.ts`, `blueprintSetup.ts`, `multiset.ts`, `blueprints/page.tsx`, `_shared.tsx`, `paperImport.ts`, `BlueprintTemplate`, `QuestionForm.tsx`, `constants.ts`, `FigureInspectors.tsx`, `AIPaperGeneratorModal.tsx`, `gemini.ts`, `registry.ts`, `classes/route.ts`, `compare.tsx`, `joinDots.tsx`, `MathRichEditor.tsx`, `kindergarten/types.ts`, `pattern.tsx`, `AppShell.tsx`, `BlueprintImportModal.tsx`, `KindergartenEditorProps`, `PaperBuilderPage`, `PasteQuestionsPanel.tsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Should `FigureInspectors.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07957393483709273 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `kindergarten/types.ts`, `FigureInspectors.tsx`, `blueprints/[id]/page.tsx`, `verify-key/route.ts`, `package.json`, `presets/page.tsx`, `normalizeSession`, `blueprint.ts`, `figure-studio/types.ts`, `lib/types.ts`, `blueprintSetup.ts`, `multiset.ts`, `blueprints/page.tsx`, `_shared.tsx`, `paperImport.ts`, `BlueprintTemplate`, `QuestionForm.tsx`, `vitest`, `constants.ts`, `FigureInspectors.tsx`, `BlueprintPresetEditor.tsx`, `AIPaperGeneratorModal.tsx`, `classes/route.ts`, `AppShell.tsx`, `BlueprintImportModal.tsx`, `PaperBuilderPage`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `blueprints/[id]/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.061955965181771634 - nodes in this community are weakly interconnected._