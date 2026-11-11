# Graph Report - exam-paper-builder  (2026-11-11)

## Corpus Check
- 461 files · ~671,889 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .prisma 1, .ico 1)

## Summary
- 3022 nodes · 11156 edges · 111 communities (104 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1b9e6464`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- FigureInspectors.tsx
- BlueprintEditor
- papers/[id]/page.tsx
- verify-key/route.ts
- geometry.ts
- package.json
- schemas.ts
- curriculumInit.ts
- syllabusImport.ts
- HttpError
- presets/page.tsx
- time
- paperDocx.ts
- localization/index.ts
- blueprint.ts
- diagram-search.ts
- constants.ts
- curriculumTemplates.ts
- figure-studio/types.ts
- render.ts
- devDependencies
- class-assignment-rbac.test.ts
- batchQuestionIo.ts
- questionValidator.ts
- users/page.tsx
- @playwright/test
- blueprintSetup.ts
- multiset.ts
- compilerOptions
- dependencies
- app/layout.tsx
- prisma.ts
- scripts
- setup/page.tsx
- e2e.mjs
- layout.ts
- studio.test.ts
- text.ts
- papers.ts
- _shared.tsx
- paperImport.ts
- lib/types.ts
- languageComponents.ts
- MathParser
- QuestionForm.tsx
- vitest
- mpbseStandardEngine.ts
- math.ts
- README.md
- blueprints/[id]/page.tsx
- AGENTS.md
- deploy.sh
- FigureStudio.tsx
- ui.tsx
- internalChoiceRules.ts
- react
- generatePaperSectionWithGemini
- api
- presets.ts
- subpartExtractor.ts
- QuestionPicker.tsx
- paperAutogen.ts
- curriculumContract.ts
- officialTemplates.ts
- PaperSheets.tsx
- preflight.ts
- gemini.ts
- classes/route.ts
- BlueprintTemplate
- @prisma/client
- preWriting.tsx
- classes/route.ts
- ai-commit-section/route.ts
- zod
- TableModal
- MathRichEditor
- e2e-school.mjs
- compare.tsx
- joinDots.tsx
- junior-language-pattern.test.ts
- MathRichEditor.tsx
- ref_node_fs
- e2e-live-generation.mjs
- kindergarten/types.ts
- slotPlan.ts
- reset-content.mjs
- QuestionView.tsx
- ai-paper-review.mjs
- seed-vs-scheme.test.ts
- pattern.tsx
- e2e-blueprint.mjs
- Gemini API keys and rate limits
- Curriculum and blueprint coverage matrix (MPBSE, session 2026-27)
- sanskrit-academic-quality.test.ts
- blueprintExport.ts
- questionVerificationEngine.ts
- api.ts
- matchColumnKey.ts
- detectPaperLanguage
- AppShell.tsx
- subpartsTotalMarks
- Project: Sarvodaya School Examination Portal — Production Business Logic
- e2e-all-templates.mjs
- BlueprintImportModal.tsx
- registry.ts
- checkBoundedPartitionFeasible
- vitest.config.mjs
- PaperBuilderPage
- autofill/route.ts

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 172 edges
2. `vitest` - 123 edges
3. `api()` - 113 edges
4. `body()` - 104 edges
5. `prisma` - 98 edges
6. `recordAudit()` - 93 edges
7. `react` - 89 edges
8. `route()` - 88 edges
9. `loadPaperView()` - 73 edges
10. `lucide-react` - 68 edges

## Surprising Connections (you probably didn't know these)
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `Update 2: shared marks, components, regeneration (verified against a running server)` --references--> `questionSlotMarks()`  [INFERRED]
  docs/audit/PHASE1_AUDIT.md → src/lib/blueprint.ts
- `Suggested fix order` --references--> `quotaErrorText()`  [INFERRED]
  docs/audit-2026-11-05-ai-and-paper-builder.md → src/lib/gemini.ts
- `Part 2 — Paper builder: OR question cannot be modified` --references--> `QuestionForm()`  [INFERRED]
  docs/audit-2026-11-05-ai-and-paper-builder.md → src/components/QuestionForm.tsx
- `Part 3 — AI single-question Replace / Change OR does not follow the full-generation standard` --references--> `QuestionPicker()`  [INFERRED]
  docs/audit-2026-11-05-ai-and-paper-builder.md → src/components/QuestionPicker.tsx

## Import Cycles
- None detected.

## Communities (111 total, 7 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.16
Nodes (19): CircleTargetEditor(), CircleTargetPrint(), CountItemsEditor(), CountItemsPrint(), PictureMatchEditor(), pictureMatchPlugin, PictureMatchPrint(), CLIPART_LIBRARY (+11 more)

### Community 1 - "FigureInspectors.tsx"
Cohesion: 0.09
Nodes (55): AlignMode, AlignTools(), AxesInspector(), CanvasSizeControls(), CHIP, decompose(), FRACTION_PRESETS, FractionField() (+47 more)

### Community 2 - "BlueprintEditor"
Cohesion: 0.11
Nodes (23): BlueprintEditor(), addQuestionTypeToGroup(), addSectionGroup(), applyStarterTemplate(), autoDistributeMarks(), buildPaperDirectly(), hasExplicitSlotOverride(), isSlotChoiceRequired() (+15 more)

### Community 3 - "papers/[id]/page.tsx"
Cohesion: 0.10
Nodes (41): nextConfig, M1 (RBAC & Ownership), next, Filter, PapersPage(), openCreate(), QuestionExportModal(), Activity (+33 more)

### Community 4 - "verify-key/route.ts"
Cohesion: 0.09
Nodes (39): KeyDisputesBanner(), acceptChecked(), bank(), KEY_CHECK_TYPES, KeyDisagreement, keysAgree(), matchPairs(), mcqLetter() (+31 more)

### Community 5 - "geometry.ts"
Cohesion: 0.06
Nodes (73): AlignMode, alignObjects(), angleLabelPos(), angleLabelText(), ArcGeom, arcPoints(), arcThrough(), axesLayout() (+65 more)

### Community 6 - "package.json"
Cohesion: 0.12
Nodes (15): eslintConfig, name, private, version, eslint, eslint-config-next, prisma, react-dom (+7 more)

### Community 7 - "schemas.ts"
Cohesion: 0.06
Nodes (50): AuditAction, DEFAULT_MARKS_STYLE, DEFAULT_NUMBERING_STYLE, DEFAULT_PRINT_DENSITY, MARKS_STYLES, MarksStyle, NUMBERING_STYLES, NumberingStyle (+42 more)

### Community 8 - "curriculumInit.ts"
Cohesion: 0.05
Nodes (67): main(), prisma, handleLoadOfficialTemplate(), create(), register(), ChapterSpec, CLASSES_DATA, SOURCE_DOCS_DATA (+59 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.15
Nodes (26): STANDARD_CURRICULUM_PRESETS, parseSyllabusWithGemini(), ROLE, chapters(), parts(), SCHOOL_CLASS_1_TO_8_PRESETS, getCanonicalSubjectName(), normalizePresetSubject() (+18 more)

### Community 10 - "HttpError"
Cohesion: 0.08
Nodes (47): generateSchema, improveSchema, POST, parseBlueprintSchema, POST, parseSchema, POST, figureSchema (+39 more)

### Community 11 - "presets/page.tsx"
Cohesion: 0.10
Nodes (42): blankPreset(), payloadOf(), PresetsPage(), leave(), open(), restoreOrDelete(), save(), select() (+34 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "paperDocx.ts"
Cohesion: 0.21
Nodes (25): docx, buildBlocks(), extractSectionLetter(), cleanQuestionStatement(), formatExerciseFormula(), formatMarksLabel(), formatQuestionNumber(), getColumnLabels() (+17 more)

### Community 14 - "localization/index.ts"
Cohesion: 0.13
Nodes (21): BILINGUAL_DICTIONARY, DEVANAGARI_LETTERS, ENGLISH_DICTIONARY, ENGLISH_SECTION_TYPE_MAP, HINDI_DICTIONARY, LOCALES, localizeSectionTitle(), resolvePartSuffix() (+13 more)

### Community 15 - "blueprint.ts"
Cohesion: 0.07
Nodes (39): handleImportedBlueprint(), AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits() (+31 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.26
Nodes (13): GET, POST, CURATED_DIAGRAMS, CuratedDiagram, DIAGRAM_STOP_WORDS, DiagramCandidate, DiagramEligibility, findEligibleDiagrams() (+5 more)

### Community 17 - "constants.ts"
Cohesion: 0.06
Nodes (51): Tab, BlueprintPrintPage(), ChapterRows(), Sheet(), AIBlueprintModalProps, BlueprintExportModal(), STAGES, PaperImportModalProps (+43 more)

### Community 18 - "curriculumTemplates.ts"
Cohesion: 0.11
Nodes (36): adaptRequestSchema, POST, GET, ChapterItem, CustomSchoolTermConfigurator(), CustomSchoolTermConfiguratorProps, checkBlueprintFeasibility(), validateBlueprint() (+28 more)

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
Cohesion: 0.04
Nodes (81): bcryptjs, GET, POST, bulkSchema, POST, Skipped, POST, assertCanEditClass() (+73 more)

### Community 23 - "batchQuestionIo.ts"
Cohesion: 0.14
Nodes (29): RFC-4180, QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat, BatchParseOptions, ChapterResolver (+21 more)

### Community 24 - "questionValidator.ts"
Cohesion: 0.14
Nodes (40): buildAndValidateGenerationContract(), GenerationContract, getForbiddenDomainsForSubject(), createSubjectContract(), createSubjectContract(), createSubjectContract(), createTestContract(), createTestContract() (+32 more)

### Community 25 - "users/page.tsx"
Cohesion: 0.18
Nodes (18): AssignmentField(), ROLE_BADGE, ROLE_HELP, RoleField(), toPickerClasses(), UsersAdminPage(), AssignmentChips(), ClassAssignmentPicker() (+10 more)

### Community 26 - "@playwright/test"
Cohesion: 0.32
Nodes (5): @playwright/test, applySessionCookie(), generateSessionCookie(), applySessionCookie(), generateSessionCookie()

### Community 27 - "blueprintSetup.ts"
Cohesion: 0.09
Nodes (43): POST, setupSchema, setClassOn(), BlueprintInput, ApplyRow, applySetup(), DOMAIN_OF, ensureUnitsFor() (+35 more)

### Community 28 - "multiset.ts"
Cohesion: 0.12
Nodes (20): assert(), runServerChecks(), MultiSetGeneratorModal(), BlueprintSectionDef, calculateSectionOverlap(), CandidateQuestionDef, formatSetIdentifier(), LETTERS (+12 more)

### Community 29 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 30 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, docx, katex, lucide-react, mathlive, next, @prisma/client (+4 more)

### Community 31 - "app/layout.tsx"
Cohesion: 0.20
Nodes (7): katex, deva, heading, metadata, noto, ui, viewport

### Community 32 - "prisma.ts"
Cohesion: 0.10
Nodes (39): Feature Inventory, GET, GET, GET, POST, DELETE, editableItem(), EditedQuestion (+31 more)

### Community 33 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, seed, seed:mpbse, start, test (+1 more)

### Community 34 - "setup/page.tsx"
Cohesion: 0.06
Nodes (61): ActivityLogPage(), Filters, OUTCOME_TONE, query(), today(), BlueprintsPage(), clearBulk(), openBuildPaperModal() (+53 more)

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "layout.ts"
Cohesion: 0.17
Nodes (13): isBookletLayout(), bookletPageCount(), DisplayedItemNumber, DisplayedPaperNumbering, DisplayedSectionRange, formatQuestionNumber(), imposeBooklet(), imposeTwoUpCut() (+5 more)

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk(), PNG_KEYWORD (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.18
Nodes (11): cssVar(), fontCss(), fontStack(), Measurer, measureWidth(), setMeasurer(), TEXT_PAD, TextLayout (+3 more)

### Community 39 - "papers.ts"
Cohesion: 0.08
Nodes (49): auditSchema, POST, GET, DELETE, patchSchema, PUT, GET, answerFields (+41 more)

### Community 40 - "_shared.tsx"
Cohesion: 0.19
Nodes (27): ColourEditor(), colourPlugin, ColourPrint(), COLOURS, SWATCH, CompareEditor(), JoinDotsEditor(), MissingLettersEditor() (+19 more)

### Community 41 - "paperImport.ts"
Cohesion: 0.06
Nodes (63): POST, POST, PaperImportModal(), handleImport(), writeAnswerKey(), inferExamTypeFromText(), paper, blueprint (+55 more)

### Community 42 - "lib/types.ts"
Cohesion: 0.18
Nodes (16): calculatePrintLogistics(), calculateSheetsPerCopy(), distributeSetsEvenly(), generatePackagingSlips(), getSectionsForClass(), PrintLogisticsMetrics, SectionPackagingSlip, ClassSectionInput (+8 more)

### Community 43 - "languageComponents.ts"
Cohesion: 0.11
Nodes (19): PaperImplication, componentTitle(), isMultiMatch(), SectionLite, slotComponentKey(), suggestSlotComponents(), comps, allocateComponents() (+11 more)

### Community 45 - "QuestionForm.tsx"
Cohesion: 0.06
Nodes (41): Part 2 — Paper builder: OR question cannot be modified, WorksheetPage(), addActivity(), addOne(), editActivity(), quickStart(), setMarks(), AIQuestionImproverModal() (+33 more)

### Community 46 - "vitest"
Cohesion: 0.27
Nodes (13): M3 (Question Exhaustion Tagging), vitest, CATEGORY_STYLES, CompactExamTagInfo, CurrentPaperContext, ExamCategory, findFreshnessConflicts(), isExhaustedUsage() (+5 more)

### Community 47 - "mpbseStandardEngine.ts"
Cohesion: 0.43
Nodes (4): paper, evaluateMPBoardStandardCompliance(), MPBoardComplianceReport, MPBoardDimensionScore

### Community 48 - "math.ts"
Cohesion: 0.20
Nodes (16): splitOutsideMath(), cleanLatexToUnicode(), convertNaturalMathToTex(), ExtractedTableResult, findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX, isEntirelyMath() (+8 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "blueprints/[id]/page.tsx"
Cohesion: 0.17
Nodes (16): subjectMatches(), BlueprintImportModalProps, BlueprintStartPicker(), inRange(), levelOf(), questionCount(), questionKinds(), STAGES (+8 more)

### Community 54 - "FigureStudio.tsx"
Cohesion: 0.08
Nodes (33): ActiveHandle, CURSOR_CROSS, CURSOR_ERASER, CURSOR_TEXT, Glyph(), GroupId, hasBoxFields(), RAIL (+25 more)

### Community 55 - "ui.tsx"
Cohesion: 0.07
Nodes (34): QuestionImportModal(), handleFileChange(), validateContent(), QuestionsPage(), remove(), AIQuestionGeneratorModal(), handleGenerate(), AIQuestionGeneratorModalProps (+26 more)

### Community 56 - "internalChoiceRules.ts"
Cohesion: 0.11
Nodes (27): BoardRuleConflictResult, ChoicePaperLike, ChoiceSectionLike, detectBoardRuleConflict(), detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet, ExaminationPatternVersionId (+19 more)

### Community 57 - "react"
Cohesion: 0.11
Nodes (24): lucide-react, react, OmrSheetPage(), AnswerKeyFill, FillState, AcademicSessionSelectorProps, AIPaperAuditModalProps, AIQuestionImproverModalProps (+16 more)

### Community 58 - "generatePaperSectionWithGemini"
Cohesion: 0.12
Nodes (30): Audit: AI generation failures and paper-builder gaps (2026-11-05), Part 3 — AI single-question Replace / Change OR does not follow the full-generation standard, Part 4 — Full "Generate with AI" run on the audit paper, Round 2 — "Unseen passage in a long-answer section" and a full workflow sweep (not committed yet), Suggested fix order, DEFAULT_DIFFICULTY_PROFILE, DifficultyInput, DifficultyProfile (+22 more)

### Community 59 - "api"
Cohesion: 0.16
Nodes (19): save(), ClassesHierarchyPage(), addMissingStandardSubjects(), addSectionToClass(), deleteClass(), deleteSubject(), removeSectionFromClass(), saveClass() (+11 more)

### Community 60 - "presets.ts"
Cohesion: 0.14
Nodes (19): GET, isManager(), BlueprintPreset, blueprintPresetSchema, builtInBlueprintPresets(), builtInPresets(), builtInSyllabusPresets(), CUSTOM_PREFIX (+11 more)

### Community 61 - "subpartExtractor.ts"
Cohesion: 0.21
Nodes (12): DecomposedSubpartsResult, decomposeStemSubparts(), detectAttemptCount(), DEVANAGARI_CONSONANTS, DEVANAGARI_DIGITS, findSequenceMatches(), isFalsePositiveParenthesis(), isInsideMath() (+4 more)

### Community 62 - "QuestionPicker.tsx"
Cohesion: 0.12
Nodes (43): getMarksRubric(), QuestionSolutionItem(), SolutionsPage(), AIPaperGeneratorModal(), AIPaperGeneratorModalProps, DifficultySelect(), useDifficultyProfile(), QuestionContent() (+35 more)

### Community 63 - "paperAutogen.ts"
Cohesion: 0.13
Nodes (22): POST, generated, generateMock, ChoicePolicy, CurriculumGenerationPayload, resolveChapterCurriculumContextSync(), resolveChoicePolicyForSlot(), DifficultyLevel (+14 more)

### Community 64 - "curriculumContract.ts"
Cohesion: 0.10
Nodes (24): ParsedQuestionItem, QuestionType, CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, ChoicePolicyType, CLASS_10_SANSKRIT_SPECS, CLASS_12_MATH_CHAPTER_SPECS (+16 more)

### Community 65 - "officialTemplates.ts"
Cohesion: 0.11
Nodes (29): attachOfficialSource(), LANG, written, FormatDef, FormatId, formatIdFor(), FORMATS, MUSIC_FORMATS (+21 more)

### Community 66 - "PaperSheets.tsx"
Cohesion: 0.20
Nodes (20): BlankPage(), Block, Page(), PaperSheets(), renderBlock(), SheetsInfo, BOOKLET_MAX_PAGES, describeFit() (+12 more)

### Community 67 - "preflight.ts"
Cohesion: 0.14
Nodes (14): PaperPreflightModal(), PaperPreflightModalProps, evaluatePaperInternalChoiceCompliance(), PreflightIssue, PreflightReport, validatePaperPreflight(), getEffectiveQuestionMarks(), ReassignmentResult (+6 more)

### Community 68 - "gemini.ts"
Cohesion: 0.06
Nodes (67): Defects that turn this into user-visible errors, Part 1 — Why AI generation "suddenly" fails, Root cause: Google moved the `-latest` aliases onto new models with much smaller free quotas, What works today (verified), POST, GET, cleanChapterTitleForLookup(), getChapterCurriculumSpec() (+59 more)

### Community 69 - "classes/route.ts"
Cohesion: 0.28
Nodes (15): POST, assertCanEditClass(), DELETE, PATCH, GET, POST, postClassUnionSchema, ensureClassAndSubject() (+7 more)

### Community 70 - "BlueprintTemplate"
Cohesion: 0.09
Nodes (26): Additional defects found and fixed, Findings, Not done (needs your input before it can be done correctly), Official sources actually read (MPBSE, session 2026-27), Phase 1 Audit: Blueprint, Curriculum and Paper Pipeline, Still open, Template inventory (27 MPBSE + 7 legacy), Update 2: shared marks, components, regeneration (verified against a running server) (+18 more)

### Community 71 - "@prisma/client"
Cohesion: 0.07
Nodes (12): @prisma/client, prisma, prisma, prisma, prisma, prisma, prisma, prisma (+4 more)

### Community 72 - "preWriting.tsx"
Cohesion: 0.29
Nodes (6): preWritingPlugin, PreWritingPrint(), STROKE_LABEL, strokePath(), PreWritingConfig, PreWritingStroke

### Community 73 - "classes/route.ts"
Cohesion: 0.15
Nodes (23): BlueprintTemplateModal(), readScope(), useViewScope(), ViewScopeBar(), ensureSchoolSubjects(), ALIASES, canonicalSubject(), classLevelOf() (+15 more)

### Community 74 - "ai-commit-section/route.ts"
Cohesion: 0.19
Nodes (16): POST, canonicalMcqAnswer(), GeneratedPaperQuestion, shuffleMcqOptionsIfSafe(), isQuestionContaminated(), allowedTypesFor(), defaultAllowedTypes(), isTypeAllowed() (+8 more)

### Community 75 - "zod"
Cohesion: 0.17
Nodes (16): zod, DELETE, existingCustom(), PATCH, PUT, target(), kindOf(), POST (+8 more)

### Community 76 - "TableModal"
Cohesion: 0.22
Nodes (10): TableModal(), handleAddCol(), handleAddRow(), updateDimensions(), TableModalProps, buildStatTableLatex(), buildTableLatex(), formatCellForLatex() (+2 more)

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

### Community 81 - "junior-language-pattern.test.ts"
Cohesion: 0.11
Nodes (23): applySchoolPattern(), book(), exam, presets, chapterRole, skillOf(), distributeMarksByRole(), hasComponentRoles() (+15 more)

### Community 82 - "MathRichEditor.tsx"
Cohesion: 0.33
Nodes (5): mathlive, loadMathlive(), MathfieldCtor, MathRichEditorHandle, TEMPLATES

### Community 83 - "ref_node_fs"
Cohesion: 0.21
Nodes (7): prisma, UPLOAD_DIR, GET, TYPE_BY_EXT, EXT_BY_TYPE, POST, UPLOAD_DIR

### Community 84 - "e2e-live-generation.mjs"
Cohesion: 0.22
Nodes (8): call(), chapters, grammarSec, passages, passageSec, perChapter, runSection(), tpl

### Community 85 - "kindergarten/types.ts"
Cohesion: 0.09
Nodes (26): circleTargetPlugin, numberGridPlugin, NumberGridPrint(), SequenceChainEditor(), sequenceChainPlugin, SequenceChainPrint(), MathSquareGrid(), MathSquareGridProps (+18 more)

### Community 86 - "slotPlan.ts"
Cohesion: 0.23
Nodes (13): presets, defaultTypeFor(), hasMixedSlots(), openSlotSpecs(), parseSlotPlan(), PlannedRow, ROLES, rowSlotSpecs() (+5 more)

### Community 87 - "reset-content.mjs"
Cohesion: 0.29
Nodes (7): CLASSES, main(), prisma, SECONDARY, SENIOR, sqliteFile(), TABLES

### Community 88 - "QuestionView.tsx"
Cohesion: 0.29
Nodes (11): isPassageType(), LETTERS_LIST, QuestionRenderMode, QuestionView(), ROMAN_LOWER, SingleQuestionBody(), subpartOptionColumns(), canHaveSubparts() (+3 more)

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

### Community 95 - "sanskrit-academic-quality.test.ts"
Cohesion: 0.23
Nodes (9): evaluateSanskritCompetencyCoverage(), SANSKRIT_COMPETENCY_TAXONOMY, RAW_OFFICIAL_2026_ITEMS, RAW_SANSKRIT_ITEMS, SANSKRIT_CLASS10_BLUEPRINT, SANSKRIT_CLASS10_PAPER, SANSKRIT_MPBSE_2026_BLUEPRINT, SANSKRIT_MPBSE_2026_PAPER (+1 more)

### Community 96 - "blueprintExport.ts"
Cohesion: 0.38
Nodes (9): BlueprintJsonModal(), BlueprintJsonModalProps, BlueprintWithExportRelations, buildBlueprintExportPayload, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson (+1 more)

### Community 97 - "questionVerificationEngine.ts"
Cohesion: 0.08
Nodes (38): cleanOptionText(), isMcqLikeType(), auditPaperEvidenceBased(), AuditPaperInput, EvidenceAuditFinding, EvidenceAuditReport, PASSAGE_TYPES, referencesMissingVisual() (+30 more)

### Community 98 - "api.ts"
Cohesion: 0.09
Nodes (27): Architecture, server-only, POST, codeMatches(), POST, GET, POST, POST (+19 more)

### Community 99 - "matchColumnKey.ts"
Cohesion: 0.27
Nodes (8): derangeMatchColumnPairs(), formatMatchKey(), layoutMatchColumn(), LETTERS, MatchColumnLayout, parseMatchKey(), ROMAN_INDEX, ROMANS

### Community 100 - "detectPaperLanguage"
Cohesion: 0.28
Nodes (7): detectPaperLanguage, PaperView, generate, paper, section, slot, regenerateSlot()

### Community 101 - "AppShell.tsx"
Cohesion: 0.11
Nodes (20): AppLayout(), LoginPage(), submit(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AppShell(), signOut() (+12 more)

### Community 102 - "subpartsTotalMarks"
Cohesion: 0.43
Nodes (5): validateChoiceParity(), selectVariantCandidates(), parseSubparts(), SubPart, subpartsTotalMarks()

### Community 103 - "Project: Sarvodaya School Examination Portal — Production Business Logic"
Cohesion: 0.29
Nodes (6): Code Layout, Interface Contracts, M2 (Section Enrollment & Print Logistics), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, SectionDetail

### Community 105 - "BlueprintImportModal.tsx"
Cohesion: 0.16
Nodes (20): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent(), BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection (+12 more)

### Community 106 - "registry.ts"
Cohesion: 0.13
Nodes (14): countItemsPlugin, missingLettersPlugin, patternPlugin, pictureSumPlugin, tickPicturePlugin, TraceWriteEditor(), traceWritePlugin, TraceWritePrint() (+6 more)

### Community 107 - "checkBoundedPartitionFeasible"
Cohesion: 0.50
Nodes (4): checkBoundedPartitionFeasible(), getSolutions(), solve(), search()

### Community 109 - "PaperBuilderPage"
Cohesion: 0.12
Nodes (3): Bar(), PaperBuilderPage(), handleAutofill()

### Community 122 - "autofill/route.ts"
Cohesion: 0.14
Nodes (24): DELETE, PATCH, GET, POST, POST, duplicateSetSchema, POST, parallelSetsSchema (+16 more)

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 822 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `kindergarten/types.ts`, `verify-key/route.ts`, `package.json`, `schemas.ts`, `curriculumInit.ts`, `syllabusImport.ts`, `HttpError`, `paperDocx.ts`, `localization/index.ts`, `blueprint.ts`, `diagram-search.ts`, `constants.ts`, `curriculumTemplates.ts`, `class-assignment-rbac.test.ts`, `batchQuestionIo.ts`, `questionValidator.ts`, `blueprintSetup.ts`, `multiset.ts`, `prisma.ts`, `layout.ts`, `studio.test.ts`, `papers.ts`, `paperImport.ts`, `lib/types.ts`, `languageComponents.ts`, `mpbseStandardEngine.ts`, `math.ts`, `generatePaperSectionWithGemini`, `presets.ts`, `subpartExtractor.ts`, `QuestionPicker.tsx`, `paperAutogen.ts`, `curriculumContract.ts`, `officialTemplates.ts`, `PaperSheets.tsx`, `preflight.ts`, `gemini.ts`, `classes/route.ts`, `BlueprintTemplate`, `@prisma/client`, `classes/route.ts`, `ai-commit-section/route.ts`, `TableModal`, `junior-language-pattern.test.ts`, `slotPlan.ts`, `seed-vs-scheme.test.ts`, `sanskrit-academic-quality.test.ts`, `questionVerificationEngine.ts`, `api.ts`, `matchColumnKey.ts`, `detectPaperLanguage`, `subpartsTotalMarks`, `BlueprintImportModal.tsx`, `vitest.config.mjs`, `autofill/route.ts`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FigureInspectors.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08832425892316999 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `kindergarten/types.ts`, `FigureInspectors.tsx`, `papers/[id]/page.tsx`, `verify-key/route.ts`, `package.json`, `presets/page.tsx`, `constants.ts`, `curriculumTemplates.ts`, `users/page.tsx`, `setup/page.tsx`, `_shared.tsx`, `paperImport.ts`, `QuestionForm.tsx`, `blueprints/[id]/page.tsx`, `FigureStudio.tsx`, `ui.tsx`, `QuestionPicker.tsx`, `PaperSheets.tsx`, `preflight.ts`, `BlueprintTemplate`, `preWriting.tsx`, `classes/route.ts`, `TableModal`, `compare.tsx`, `joinDots.tsx`, `MathRichEditor.tsx`, `kindergarten/types.ts`, `pattern.tsx`, `blueprintExport.ts`, `AppShell.tsx`, `registry.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `BlueprintEditor` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `kindergarten/types.ts`, `FigureInspectors.tsx`, `papers/[id]/page.tsx`, `verify-key/route.ts`, `package.json`, `presets/page.tsx`, `constants.ts`, `curriculumTemplates.ts`, `users/page.tsx`, `setup/page.tsx`, `_shared.tsx`, `paperImport.ts`, `QuestionForm.tsx`, `vitest`, `blueprints/[id]/page.tsx`, `FigureStudio.tsx`, `ui.tsx`, `QuestionPicker.tsx`, `preflight.ts`, `BlueprintTemplate`, `classes/route.ts`, `TableModal`, `kindergarten/types.ts`, `blueprintExport.ts`, `AppShell.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `papers/[id]/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10101010101010101 - nodes in this community are weakly interconnected._