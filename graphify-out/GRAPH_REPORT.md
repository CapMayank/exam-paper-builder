# Graph Report - exam-paper-builder  (2026-11-05)

## Corpus Check
- 511 files · ~692,382 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .before-allowed-types 1, .prisma 1)

## Summary
- 3343 nodes · 11109 edges · 155 communities (136 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ae6216f5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kindergarten/types.ts
- FigureInspectors.tsx
- BlueprintEditor
- prisma.ts
- FigureStudio.tsx
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
- autofill.ts
- diagram-search.ts
- constants.ts
- blueprint.ts
- figure-studio/types.ts
- render.ts
- devDependencies
- class-assignment-rbac.test.ts
- batchQuestionIo.ts
- curriculumContract.ts
- lib/types.ts
- @playwright/test
- setup/page.tsx
- worksheets/[id]/page.tsx
- compilerOptions
- dependencies
- app/layout.tsx
- body
- scripts
- blueprints/page.tsx
- e2e.mjs
- curriculumTemplates.ts
- studio.test.ts
- text.ts
- papers.ts
- _shared.tsx
- paperImport.ts
- Issue tracker: GitHub
- BlueprintTemplate
- MathParser
- QuestionForm.tsx
- vitest
- questionSlotMarks
- math.ts
- README.md
- layout.ts
- AGENTS.md
- deploy.sh
- security-super-admin.test.ts
- papers/[id]/page.tsx
- internalChoiceRules.ts
- Triage
- generatePaperSectionWithGemini
- api
- presets.ts
- subpartExtractor.ts
- QuestionPicker.tsx
- paperAutogen.ts
- curriculumContract.ts
- officialTemplates.ts
- PaperSheets.tsx
- englishTitles.ts
- gemini.ts
- curriculumData.ts
- blueprintStructure.ts
- dto.ts
- registry.ts
- classes/route.ts
- answerKeyFill.ts
- languageComponents.ts
- api.ts
- MathRichEditor
- e2e-school.mjs
- compare.tsx
- joinDots.tsx
- teach/SKILL.md
- Process
- e2e-all-templates.mjs
- e2e-live-generation.mjs
- KindergartenPrintProps
- questionTagging.ts
- reset-content.mjs
- sectionTypes.ts
- ai-paper-review.mjs
- seed-vs-scheme.test.ts
- pattern.tsx
- e2e-blueprint.mjs
- Gemini API keys and rate limits
- Curriculum and blueprint coverage matrix (MPBSE, session 2026-27)
- blueprintExport.ts
- Codebase Design
- precisionChecks.ts
- ref_node_fs
- During the session
- blueprintSetup.ts
- AppShell.tsx
- HTML Report Format
- template.sh
- QuestionView.tsx
- blueprintImport.ts
- KindergartenEditorProps
- Ask Matt
- curriculumInit.ts
- PaperBuilderPage
- Diagnosing Bugs
- Steps
- Test-Driven Development
- Process
- writing-for-agents/SKILL.md
- school-paper-flow.test.ts
- Steps
- wayfinder/SKILL.md
- BlueprintImportModal
- officialTemplates.ts
- checkBoundedPartitionFeasible
- Migrate to Shoehorn
- subpartsTotalMarks
- Steps
- Scaffold Exercises
- to-spec/SKILL.md
- PaperImportModal
- detectPaperLanguage
- officialChapterMarks.ts
- Process
- <Questionnaire title>
- writing-shape/SKILL.md
- StandardCurriculumPreset
- chief-of-staff/SKILL.md
- Process
- Sections
- writing-beats/SKILL.md
- loop-me/SKILL.md
- Reference
- hitl-loop.template.sh
- GLOSSARY.md Format
- writing-fragments/SKILL.md
- vitest.config.mjs
- block-dangerous-git.sh
- implement-spec/SKILL.md
- CREDITS.md

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 170 edges
2. `vitest` - 114 edges
3. `api()` - 109 edges
4. `body()` - 104 edges
5. `prisma` - 94 edges
6. `recordAudit()` - 93 edges
7. `react` - 87 edges
8. `route()` - 87 edges
9. `loadPaperView()` - 70 edges
10. `lucide-react` - 66 edges

## Surprising Connections (you probably didn't know these)
- `Part 2 — Paper builder: OR question cannot be modified` --references--> `QuestionForm()`  [INFERRED]
  docs/audit-2026-11-05-ai-and-paper-builder.md → src/components/QuestionForm.tsx
- `Update 2: shared marks, components, regeneration (verified against a running server)` --references--> `questionSlotMarks()`  [INFERRED]
  docs/audit/PHASE1_AUDIT.md → src/lib/blueprint.ts
- `Part 3 — AI single-question Replace / Change OR does not follow the full-generation standard` --references--> `QuestionPicker()`  [INFERRED]
  docs/audit-2026-11-05-ai-and-paper-builder.md → src/components/QuestionPicker.tsx
- `Milestones` --references--> `isExhaustedUsage()`  [INFERRED]
  PROJECT.md → src/components/QuestionUsageHistory.tsx
- `Additional defects found and fixed` --references--> `whyCannotAdd()`  [INFERRED]
  docs/audit/PHASE1_AUDIT.md → src/lib/blueprint.ts

## Import Cycles
- None detected.

## Communities (155 total, 19 thin omitted)

### Community 0 - "kindergarten/types.ts"
Cohesion: 0.11
Nodes (28): CircleTargetEditor(), circleTargetPlugin, CircleTargetPrint(), CountItemsEditor(), CountItemsPrint(), PictureMatchEditor(), PictureMatchPrint(), CLIPART_LIBRARY (+20 more)

### Community 1 - "FigureInspectors.tsx"
Cohesion: 0.09
Nodes (55): AlignMode, AlignTools(), AxesInspector(), CanvasSizeControls(), CHIP, decompose(), FRACTION_PRESETS, FractionField() (+47 more)

### Community 2 - "BlueprintEditor"
Cohesion: 0.13
Nodes (21): BlueprintEditor(), addQuestionTypeToGroup(), addSectionGroup(), applySchoolPattern(), applyStarterTemplate(), hasExplicitSlotOverride(), isSlotChoiceRequired(), moveSectionGroup() (+13 more)

### Community 3 - "prisma.ts"
Cohesion: 0.13
Nodes (20): generateSchema, POST, parseBlueprintSchema, POST, GET, GET, POST, GET (+12 more)

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
Cohesion: 0.07
Nodes (25): POST, AuditAction, blueprintInclude, MAX_OPTIONS, MIN_OPTIONS, assignmentList, changePasswordSchema, classAssignmentSchema (+17 more)

### Community 8 - "curriculumInit.ts"
Cohesion: 0.13
Nodes (25): findOrCreatePartChapter(), ALL, curriculum, stamp, ALL_BOOKS_SUFFIX, consolidateCurriculumBooks(), ConsolidationReport, CurriculumSubjectBooks (+17 more)

### Community 9 - "syllabusImport.ts"
Cohesion: 0.23
Nodes (20): parseSyllabusWithGemini(), getCanonicalSubjectName(), normalizePresetSubject(), ensureLanguageNonChapterUnits(), getLanguageNonChapterUnits(), hasDomainCovered(), isLanguageSubject(), isPrePrimaryClass() (+12 more)

### Community 10 - "HttpError"
Cohesion: 0.14
Nodes (23): GET, DELETE, GET, PUT, POST, POST, DELETE, GET (+15 more)

### Community 11 - "presets/page.tsx"
Cohesion: 0.10
Nodes (42): blankPreset(), payloadOf(), PresetsPage(), leave(), open(), restoreOrDelete(), save(), select() (+34 more)

### Community 12 - "time"
Cohesion: 0.18
Nodes (20): generate_session_cookie(), run_e2e_tests(), generate_session_cookie(), run_visual_verification(), generate_session_cookie(), run_flow_test(), generate_session_cookie(), run_complete_board_flow() (+12 more)

### Community 13 - "paperDocx.ts"
Cohesion: 0.20
Nodes (27): docx, buildBlocks(), extractSectionLetter(), questionSlotMarks(), canHaveSubparts(), cleanQuestionStatement(), formatExerciseFormula(), formatMarksLabel() (+19 more)

### Community 14 - "localization/index.ts"
Cohesion: 0.13
Nodes (22): BILINGUAL_DICTIONARY, DEVANAGARI_LETTERS, ENGLISH_DICTIONARY, ENGLISH_SECTION_TYPE_MAP, HINDI_DICTIONARY, LOCALES, localizeSectionTitle(), resolvePartSuffix() (+14 more)

### Community 15 - "autofill.ts"
Cohesion: 0.12
Nodes (17): handleImportedBlueprint(), AutoFillOptions, autoFillPaper(), solve(), AutoFillResult, CandidateQuestion, getItemMarks(), getItemUnits() (+9 more)

### Community 16 - "diagram-search.ts"
Cohesion: 0.26
Nodes (13): GET, POST, CURATED_DIAGRAMS, CuratedDiagram, DIAGRAM_STOP_WORDS, DiagramCandidate, DiagramEligibility, findEligibleDiagrams() (+5 more)

### Community 17 - "constants.ts"
Cohesion: 0.05
Nodes (76): nextConfig, next, Tab, Filter, BlueprintPrintPage(), ChapterRows(), Sheet(), AIBlueprintModalProps (+68 more)

### Community 18 - "blueprint.ts"
Cohesion: 0.12
Nodes (32): feasibilityCheckSchema, POST, adaptRequestSchema, POST, GET, ChapterItem, CustomSchoolTermConfigurator(), CustomSchoolTermConfiguratorProps (+24 more)

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
Cohesion: 0.07
Nodes (50): bcryptjs, POST, assertCanEditClass(), DELETE, PATCH, assertCanEditClass(), POST, assertCanEditClass() (+42 more)

### Community 23 - "batchQuestionIo.ts"
Cohesion: 0.05
Nodes (67): RFC-4180, MultiSetGeneratorModal(), QuestionDuplicateModalProps, BatchImportError, BatchImportOptions, BatchImportReport, BatchIoFormat, BatchParseOptions (+59 more)

### Community 24 - "curriculumContract.ts"
Cohesion: 0.09
Nodes (58): POST, getMarksRubric(), canonicalMcqAnswer(), isMcqLikeType(), buildAndValidateGenerationContract(), cleanChapterTitleForLookup(), GenerationContract, getChapterCurriculumSpec() (+50 more)

### Community 25 - "lib/types.ts"
Cohesion: 0.10
Nodes (36): ActivityLogPage(), Filters, OUTCOME_TONE, query(), today(), AssignmentField(), ROLE_BADGE, ROLE_HELP (+28 more)

### Community 26 - "@playwright/test"
Cohesion: 0.32
Nodes (5): @playwright/test, applySessionCookie(), generateSessionCookie(), applySessionCookie(), generateSessionCookie()

### Community 27 - "setup/page.tsx"
Cohesion: 0.18
Nodes (18): setClassOn(), inputFor(), buildSetupInput(), classLevel(), norm(), presetSections(), presetsForBook(), presetTotals() (+10 more)

### Community 28 - "worksheets/[id]/page.tsx"
Cohesion: 0.16
Nodes (13): Activity, CATEGORY_LABEL, CATEGORY_ORDER, Draft, QUICK_STARTS, WorksheetPage(), addActivity(), addOne() (+5 more)

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
Nodes (50): zod, POST, parseSchema, POST, figureSchema, POST, codeMatches(), POST (+42 more)

### Community 33 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, seed, seed:mpbse, start, test (+1 more)

### Community 34 - "blueprints/page.tsx"
Cohesion: 0.07
Nodes (50): M2 (Section Enrollment & Print Logistics), BlueprintSetupPage(), apply(), Choice, ImpactLine(), minutesLabel(), patternLabel(), ResultView() (+42 more)

### Community 35 - "e2e.mjs"
Cohesion: 0.14
Nodes (14): add(), call(), fd, forkedItem, itemToReplace, mk(), notImg, origQ (+6 more)

### Community 36 - "curriculumTemplates.ts"
Cohesion: 0.16
Nodes (20): attachOfficialSource(), BlueprintTemplateSectionGroup, ChoicePolicy, ChoicePolicyType, Circular465AuditResult, Circular465Violation, createChoicePolicy(), generateEnglish15Q80MSectionGroups() (+12 more)

### Community 37 - "studio.test.ts"
Cohesion: 0.18
Nodes (12): rotateAround(), crc32(), crcTable, embedSceneInPng(), extractSceneFromPng(), isPng(), makeTextChunk(), PNG_KEYWORD (+4 more)

### Community 38 - "text.ts"
Cohesion: 0.18
Nodes (11): cssVar(), fontCss(), fontStack(), Measurer, measureWidth(), setMeasurer(), TEXT_PAD, TextLayout (+3 more)

### Community 39 - "papers.ts"
Cohesion: 0.08
Nodes (47): Feature Inventory, auditSchema, POST, GET, answerFields, POST, POST, safeJsonArray() (+39 more)

### Community 40 - "_shared.tsx"
Cohesion: 0.17
Nodes (31): ColourEditor(), colourPlugin, ColourPrint(), COLOURS, SWATCH, CompareEditor(), JoinDotsEditor(), MissingLettersEditor() (+23 more)

### Community 41 - "paperImport.ts"
Cohesion: 0.10
Nodes (40): POST, POST, inferExamTypeFromText(), paper, blueprint, chapters, matchQuestion(), mcqs (+32 more)

### Community 42 - "Issue tracker: GitHub"
Cohesion: 0.06
Nodes (30): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary, Conventions, Issue tracker: GitHub, Pull requests as a triage surface (+22 more)

### Community 43 - "BlueprintTemplate"
Cohesion: 0.15
Nodes (11): StandardMpbseConfigurator(), StandardMpbseConfiguratorProps, BlueprintTemplateModalProps, BlueprintTemplate, ComponentRole, FormatSkeleton, MarkingComponent, OFFICIAL_FORMAT_2026_27 (+3 more)

### Community 45 - "QuestionForm.tsx"
Cohesion: 0.12
Nodes (20): DiagramSearchModal(), DEFAULT_ASSERTION_OPTIONS_EN, DEFAULT_ASSERTION_OPTIONS_HI, DEFAULT_SPACE, getDefaultSubpartsForType(), getSubpartLabel(), QuestionForm(), attach() (+12 more)

### Community 46 - "vitest"
Cohesion: 0.18
Nodes (17): Code Layout, Interface Contracts, M1 (RBAC & Ownership), M3 (Question Exhaustion Tagging), Milestones, Project: Sarvodaya School Examination Portal — Production Business Logic, CATEGORY_STYLES, CompactExamTagInfo (+9 more)

### Community 47 - "questionSlotMarks"
Cohesion: 0.12
Nodes (20): vitest, paper, auditPaperEvidenceBased(), AuditPaperInput, EvidenceAuditFinding, EvidenceAuditReport, PASSAGE_TYPES, referencesMissingVisual() (+12 more)

### Community 48 - "math.ts"
Cohesion: 0.20
Nodes (14): convertNaturalMathToTex(), ExtractedTableResult, findMatchingBrace(), INLINE_PATTERNS, INLINE_REGEX, isEntirelyMath(), MathRange, MathSegment (+6 more)

### Community 49 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "layout.ts"
Cohesion: 0.16
Nodes (16): assert(), runServerChecks(), DEFAULT_SPACE, parseBulkQuestions(), ParsedQuestionItem, bookletPageCount(), DisplayedItemNumber, DisplayedPaperNumbering (+8 more)

### Community 54 - "security-super-admin.test.ts"
Cohesion: 0.09
Nodes (31): GET, POST, POST, ACTION_TEXT, ACTIVITY_CATEGORIES, ActivityCategoryKey, ActivityEntry, categoryOf() (+23 more)

### Community 55 - "papers/[id]/page.tsx"
Cohesion: 0.05
Nodes (67): lucide-react, react, AnswerKeyFill, FillState, AcademicSessionSelectorProps, AIPaperAuditModalProps, AIQuestionGeneratorModalProps, GeneratedQuestionPayload (+59 more)

### Community 56 - "internalChoiceRules.ts"
Cohesion: 0.11
Nodes (27): SectionDef, SectionGroup, buildBlueprintExportPayload, BoardRuleConflictResult, detectBoardRuleConflict(), detectExaminationBoard(), EXAMINATION_PATTERN_REGISTRY, ExaminationPatternRuleSet (+19 more)

### Community 57 - "Triage"
Cohesion: 0.06
Nodes (29): Bad agent brief, Behavioral, not procedural, Complete acceptance criteria, Durability over precision, Examples, Explicit scope boundaries, Good agent brief (bug), Good agent brief (enhancement) (+21 more)

### Community 58 - "generatePaperSectionWithGemini"
Cohesion: 0.13
Nodes (28): Audit: AI generation failures and paper-builder gaps (2026-11-05), Part 2 — Paper builder: OR question cannot be modified, Part 3 — AI single-question Replace / Change OR does not follow the full-generation standard, DEFAULT_DIFFICULTY_PROFILE, DIFFICULTY_PROFILES, DifficultyInput, DifficultyProfile, DifficultyProfileId (+20 more)

### Community 59 - "api"
Cohesion: 0.06
Nodes (52): buildPaperDirectly(), save(), BlueprintsPage(), clearBulk(), openBuildPaperModal(), remove(), runBulk(), subjectMatches() (+44 more)

### Community 60 - "presets.ts"
Cohesion: 0.12
Nodes (28): DELETE, existingCustom(), PATCH, PUT, target(), GET, isManager(), blueprintPresetSchema (+20 more)

### Community 61 - "subpartExtractor.ts"
Cohesion: 0.21
Nodes (12): DecomposedSubpartsResult, decomposeStemSubparts(), detectAttemptCount(), DEVANAGARI_CONSONANTS, DEVANAGARI_DIGITS, findSequenceMatches(), isFalsePositiveParenthesis(), isInsideMath() (+4 more)

### Community 62 - "QuestionPicker.tsx"
Cohesion: 0.10
Nodes (45): QuestionSolutionItem(), AIPaperGeneratorModal(), AIPaperGeneratorModalProps, DifficultySelect(), useDifficultyProfile(), QuestionContent(), QuestionPicker(), add() (+37 more)

### Community 63 - "paperAutogen.ts"
Cohesion: 0.13
Nodes (23): POST, generated, generateMock, componentTitle(), ChoicePolicy, CurriculumGenerationPayload, resolveChapterCurriculumContextSync(), resolveChoicePolicyForSlot() (+15 more)

### Community 64 - "curriculumContract.ts"
Cohesion: 0.07
Nodes (32): ValidatedQuestionPayload, QuestionType, CBSE_SECONDARY_CODES, CBSE_SENIOR_CODES, ChapterCurriculumSpec, ChoicePolicyType, CLASS_10_SANSKRIT_SPECS, CLASS_12_MATH_CHAPTER_SPECS (+24 more)

### Community 65 - "officialTemplates.ts"
Cohesion: 0.14
Nodes (18): PlacedItem, LANG, simulate(), written, FormatDef, FormatId, formatIdFor(), FORMATS (+10 more)

### Community 66 - "PaperSheets.tsx"
Cohesion: 0.17
Nodes (23): PrintPage(), BlankPage(), Block, Page(), PaperSheets(), renderBlock(), SheetsInfo, isBookletLayout() (+15 more)

### Community 67 - "englishTitles.ts"
Cohesion: 0.24
Nodes (13): create(), anglicizeStoredTitles(), ENGLISH_BY_HINDI, englishName(), englishPresets(), englishSeed(), englishTitle(), englishTitleFor() (+5 more)

### Community 68 - "gemini.ts"
Cohesion: 0.05
Nodes (69): Defects that turn this into user-visible errors, Part 1 — Why AI generation "suddenly" fails, Part 4 — Full "Generate with AI" run on the audit paper, Root cause: Google moved the `-latest` aliases onto new models with much smaller free quotas, Suggested fix order, What works today (verified), improveSchema, POST (+61 more)

### Community 69 - "curriculumData.ts"
Cohesion: 0.42
Nodes (7): ChapterSpec, SubjectSpec, TextbookSpec, applySchemeCorrections(), componentBook(), groupAsUnit(), setMarks()

### Community 70 - "blueprintStructure.ts"
Cohesion: 0.11
Nodes (21): Additional defects found and fixed, Findings, Not done (needs your input before it can be done correctly), Official sources actually read (MPBSE, session 2026-27), Phase 1 Audit: Blueprint, Curriculum and Paper Pipeline, Still open, Template inventory (27 MPBSE + 7 legacy), Update 2: shared marks, components, regeneration (verified against a running server) (+13 more)

### Community 71 - "dto.ts"
Cohesion: 0.07
Nodes (12): @prisma/client, prisma, prisma, prisma, prisma, prisma, prisma, prisma (+4 more)

### Community 72 - "registry.ts"
Cohesion: 0.10
Nodes (17): countItemsPlugin, missingLettersPlugin, pictureMatchPlugin, pictureSumPlugin, preWritingPlugin, PreWritingPrint(), STROKE_LABEL, strokePath() (+9 more)

### Community 73 - "classes/route.ts"
Cohesion: 0.11
Nodes (35): GET, POST, postClassUnionSchema, ensureClassAndSubject(), ensureSchoolSubjects(), normalizeAcademicSession(), normalizeSectionDetails(), syncClassesFromBooks() (+27 more)

### Community 74 - "answerKeyFill.ts"
Cohesion: 0.12
Nodes (30): bank(), KEY_CHECK_TYPES, KeyDisagreement, keysAgree(), matchPairs(), mcqLetter(), plainWords(), truthValue() (+22 more)

### Community 75 - "languageComponents.ts"
Cohesion: 0.19
Nodes (16): POST, PaperImplication, isMultiMatch(), SectionLite, slotComponentKey(), suggestSlotComponents(), comps, allocateComponents() (+8 more)

### Community 76 - "api.ts"
Cohesion: 0.08
Nodes (31): Architecture, server-only, POST, DELETE, patchSchema, PUT, addSchema, POST (+23 more)

### Community 77 - "MathRichEditor"
Cohesion: 0.19
Nodes (16): mathlive, loadMathlive(), MathfieldCtor, MathRichEditor(), buildNodes(), createMath(), emit(), markEmpty() (+8 more)

### Community 78 - "e2e-school.mjs"
Cohesion: 0.36
Nodes (10): aiChecks(), call(), canon(), data, failures, makeQuestion(), norm(), runTemplate() (+2 more)

### Community 79 - "compare.tsx"
Cohesion: 0.22
Nodes (9): comparePlugin, ComparePrint(), correctSide(), isCount(), MODE_LABEL, Side(), CompareConfig, CompareMode (+1 more)

### Community 80 - "joinDots.tsx"
Cohesion: 0.24
Nodes (9): dotLabel(), dotPoints(), DotsFigure(), joinDotsPlugin, JoinDotsPrint(), OUTLINES, SHAPE_NAMES, JoinDotsConfig (+1 more)

### Community 81 - "teach/SKILL.md"
Cohesion: 0.07
Nodes (25): Learning Record Format, Numbering, Optional sections, Supersession, Template, What does _not_ qualify, When to write a learning record, MISSION.md Format (+17 more)

### Community 82 - "Process"
Cohesion: 0.07
Nodes (25): 1. State the question, 2. Isolate the logic in a portable module, 3. Build the shareable HTML file, 4. Hand it over, 5. Capture the answer and the prototype, Anti-patterns, Logic Prototype, Process (+17 more)

### Community 84 - "e2e-live-generation.mjs"
Cohesion: 0.22
Nodes (8): call(), chapters, grammarSec, passages, passageSec, perChapter, runSection(), tpl

### Community 85 - "KindergartenPrintProps"
Cohesion: 0.25
Nodes (7): numberGridPlugin, NumberGridPrint(), MathSquareGrid(), MathSquareGridProps, KindergartenPrintProps, NumberGridCell, NumberGridConfig

### Community 86 - "questionTagging.ts"
Cohesion: 0.19
Nodes (13): Difficulty, normaliseAnswer(), PastedQuestion, splitInline(), splitPastedQuestions(), ChapterLite, ChapterSuggestion, COGNITIVE_LEVELS (+5 more)

### Community 87 - "reset-content.mjs"
Cohesion: 0.29
Nodes (7): CLASSES, main(), prisma, SECONDARY, SENIOR, sqliteFile(), TABLES

### Community 88 - "sectionTypes.ts"
Cohesion: 0.28
Nodes (10): allowedTypesFor(), isTypeAllowed(), OBJECTIVE_TYPES, parseAllowedTypes(), subjectFamily, SUBJECTIVE_TYPES, toleratesType(), TYPE_INSTRUCTION (+2 more)

### Community 89 - "ai-paper-review.mjs"
Cohesion: 0.29
Nodes (5): [base = "http://localhost:3100", filter = "", out = "paper.txt"], bp, issues, lines, log

### Community 90 - "seed-vs-scheme.test.ts"
Cohesion: 0.38
Nodes (5): active(), byUnit(), canon(), REQUIRED, seeds

### Community 91 - "pattern.tsx"
Cohesion: 0.24
Nodes (10): expandPattern(), Glyph(), isShape(), patternPlugin, PatternPrint(), TokenPicker(), SHAPE_IDS, ShapeGlyph() (+2 more)

### Community 92 - "e2e-blueprint.mjs"
Cohesion: 0.40
Nodes (4): call(), components, item, mk()

### Community 93 - "Gemini API keys and rate limits"
Cohesion: 0.50
Nodes (3): Gemini API keys and rate limits, Things to know, What the app does

### Community 95 - "blueprintExport.ts"
Cohesion: 0.40
Nodes (9): BlueprintJsonModal(), BlueprintJsonModalProps, groupSectionsFromFlat(), BlueprintWithExportRelations, downloadBlueprintJson(), exportBlueprintToJsonObject(), exportBlueprintToJsonString(), ExportedBlueprintJson (+1 more)

### Community 96 - "Codebase Design"
Cohesion: 0.09
Nodes (21): 1. In-process, 2. Local-substitutable, 3. Remote but owned (Ports & Adapters), 4. True external (Mock), Deepening, Dependency categories, Seam discipline, Testing strategy: replace, don't layer (+13 more)

### Community 97 - "precisionChecks.ts"
Cohesion: 0.27
Nodes (10): codes(), contentWords(), fillBlankGiveaway(), molecularMassOfIonic(), plainChem(), PrecisionCheckInput, PrecisionIssue, precisionIssues() (+2 more)

### Community 98 - "ref_node_fs"
Cohesion: 0.21
Nodes (7): prisma, UPLOAD_DIR, GET, TYPE_BY_EXT, EXT_BY_TYPE, POST, UPLOAD_DIR

### Community 99 - "During the session"
Cohesion: 0.09
Nodes (19): ADR Format, Numbering, Optional sections, Template, What qualifies, When to offer an ADR, GLOSSARY.md Format, Rules (+11 more)

### Community 100 - "blueprintSetup.ts"
Cohesion: 0.15
Nodes (25): bulkSchema, POST, Skipped, POST, setupSchema, BlueprintInput, applySetup(), ExistingBlueprint (+17 more)

### Community 101 - "AppShell.tsx"
Cohesion: 0.13
Nodes (20): AppLayout(), AcademicSessionSelector(), handleAddCustom(), handleSelectSession(), AppShell(), signOut(), isActive(), NAV (+12 more)

### Community 102 - "HTML Report Format"
Cohesion: 0.10
Nodes (18): Call-graph collapse, Candidate card, Cross-section (good for layered shallowness), Diagram patterns, Hand-built boxes-and-arrows (when Mermaid's layout fights you), Header, HTML Report Format, Mass diagram (good for "interface as wide as implementation") (+10 more)

### Community 103 - "template.sh"
Cohesion: 0.22
Nodes (18): ask(), ask_secret(), banner(), _clear(), _existing(), finish(), note(), open_url() (+10 more)

### Community 104 - "QuestionView.tsx"
Cohesion: 0.33
Nodes (10): isPassageType(), LETTERS_LIST, QuestionRenderMode, QuestionView(), ROMAN_LOWER, SingleQuestionBody(), subpartOptionColumns(), isKindergartenType() (+2 more)

### Community 105 - "blueprintImport.ts"
Cohesion: 0.24
Nodes (15): BlueprintImportData, BlueprintImportResult, ImportedChapterQuota, ImportedSection, normalizeExamType(), normalizeQuestionType(), parseBlueprintImport(), parseCsvBlueprint() (+7 more)

### Community 106 - "KindergartenEditorProps"
Cohesion: 0.27
Nodes (8): TraceWriteEditor(), traceWritePlugin, TraceWritePrint(), FourLineGuide(), FourLineGuideProps, KindergartenEditorProps, RulingType, TraceWriteConfig

### Community 107 - "Ask Matt"
Cohesion: 0.12
Nodes (14): Phase boundaries, Primary and secondary sources, The five options, The tree, These are judgement calls, Ask Matt, Codebase health, Context hygiene (+6 more)

### Community 108 - "curriculumInit.ts"
Cohesion: 0.20
Nodes (13): main(), prisma, register(), CLASSES_DATA, SOURCE_DOCS_DATA, STREAMS_CONFIG, curriculumSeedSignature(), ensureCurriculumSeeded() (+5 more)

### Community 109 - "PaperBuilderPage"
Cohesion: 0.11
Nodes (10): Bar(), PaperBuilderPage(), handleAutofill(), OmrSheetPage(), SolutionsPage(), DiagramSearchModalProps, imageUrl(), resolvePaperExamType() (+2 more)

### Community 110 - "Diagnosing Bugs"
Cohesion: 0.13
Nodes (14): Completion criterion: a tight loop that goes red, Diagnosing Bugs, Minimise, Non-deterministic bugs, Phase 1: Build a feedback loop, Phase 2: Reproduce + minimise, Phase 3: Hypothesise, Phase 4: Instrument (+6 more)

### Community 111 - "Steps"
Cohesion: 0.15
Nodes (12): 1. Detect package manager, 2. Install dependencies, 3. Initialize Husky, 4. Create `.husky/pre-commit`, 5. Create `.lintstagedrc`, 6. Create `.prettierrc` (if missing), 7. Verify, 8. Commit (+4 more)

### Community 112 - "Test-Driven Development"
Cohesion: 0.15
Nodes (10): Designing for Mockability, When to Mock, Anti-patterns, Rules of the loop, Seams: where tests go, Test-Driven Development, What a good test is, Bad Tests (+2 more)

### Community 113 - "Process"
Cohesion: 0.15
Nodes (12): 1. Gather context, 2. Explore the codebase (optional), 3. Draft vertical slices, 4. Quiz the user, 5. Publish the tickets to the configured tracker, Acceptance criteria, Blocked by, <NN>: <Ticket title> (+4 more)

### Community 114 - "writing-for-agents/SKILL.md"
Cohesion: 0.15
Nodes (11): Context pointers, Information hierarchy, Leading words, Invocation, Router skills, Skill mechanics, Splitting by invocation, Pruning (+3 more)

### Community 115 - "school-paper-flow.test.ts"
Cohesion: 0.31
Nodes (7): autoDistributeMarks(), skillOf(), chapters, flat(), distributeSlotMarks(), schoolPatternsForLevel(), slotMarksOf()

### Community 116 - "Steps"
Cohesion: 0.17
Nodes (11): 1. Detect the environment, 2. Install dependency-cruiser, 3. Write the config, 4. Wire it into the checks, 5. Scaffold the example package, 6. Prove the rules bite, 7. Document the convention, Notes (+3 more)

### Community 117 - "wayfinder/SKILL.md"
Cohesion: 0.17
Nodes (11): Chart the map, Fog of war, Invocation, Out of scope, Plan, don't do, Refer by name, The Map, The map body (+3 more)

### Community 118 - "BlueprintImportModal"
Cohesion: 0.38
Nodes (5): BlueprintImportModal(), copyExample(), downloadSampleFile(), getTemplateContent(), matchChaptersToBook()

### Community 119 - "officialTemplates.ts"
Cohesion: 0.26
Nodes (12): buildOfficialTemplates(), buildSchoolDefinedTemplates(), Heading, HI_HEADING_SUBJECTS, LANGUAGE_SUBJECTS, musicSections(), roleFor(), sectionsFor() (+4 more)

### Community 120 - "checkBoundedPartitionFeasible"
Cohesion: 0.50
Nodes (4): checkBoundedPartitionFeasible(), getSolutions(), solve(), search()

### Community 121 - "Migrate to Shoehorn"
Cohesion: 0.20
Nodes (9): `as Type` → `fromPartial()`, `as unknown as Type` → `fromAny()`, Install, Large objects with few needed properties, Migrate to Shoehorn, Migration patterns, When to use each, Why shoehorn? (+1 more)

### Community 122 - "subpartsTotalMarks"
Cohesion: 0.15
Nodes (14): evaluatePaperInternalChoiceCompliance(), validateChoiceParity(), PreflightIssue, PreflightReport, validatePaperPreflight(), getEffectiveQuestionMarks(), ReassignmentResult, ReconcileBlueprintOutput (+6 more)

### Community 123 - "Steps"
Cohesion: 0.22
Nodes (8): 1. Ask scope, 2. Copy the hook script, 3. Add hook to settings, 4. Ask about customization, 5. Verify, Setup Git Guardrails, Steps, What Gets Blocked

### Community 124 - "Scaffold Exercises"
Cohesion: 0.22
Nodes (8): Directory naming, Example: stubbing from a plan, Exercise variants, Lint rules summary, Moving/renaming exercises, Required files, Scaffold Exercises, Workflow

### Community 125 - "to-spec/SKILL.md"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Process, Solution, Testing Decisions, User Stories

### Community 126 - "PaperImportModal"
Cohesion: 0.25
Nodes (3): PaperImportModal(), handleImport(), writeAnswerKey()

### Community 127 - "detectPaperLanguage"
Cohesion: 0.28
Nodes (7): detectPaperLanguage, PaperView, generate, paper, section, slot, regenerateSlot()

### Community 128 - "officialChapterMarks.ts"
Cohesion: 0.24
Nodes (8): handleLoadOfficialTemplate(), official, BookChapterLite, matchOfficialChapterMarks(), norm(), OfficialChapterLite, OfficialMarksResult, OfficialTextbookLite

### Community 129 - "Process"
Cohesion: 0.25
Nodes (7): 1. Pin the fixed point, 2. Identify the spec source, 3. Identify the standards sources, 4. Spawn both sub-agents in parallel, 5. Aggregate, Process, Why two axes

### Community 130 - "<Questionnaire title>"
Cohesion: 0.25
Nodes (7): Anything else?, Context, Document structure, How to answer, <Questionnaire title>, <Theme heading>, What load is the system expected to handle at launch?

### Community 131 - "writing-shape/SKILL.md"
Cohesion: 0.25
Nodes (7): Conversational feel, Format arguments to actually have, Grounding, Out of scope, Pulling from the pile, The loop, Writing rhythm

### Community 132 - "StandardCurriculumPreset"
Cohesion: 0.36
Nodes (6): STANDARD_CURRICULUM_PRESETS, chapters(), parts(), SCHOOL_CLASS_1_TO_8_PRESETS, ParsedChapterItem, StandardCurriculumPreset

### Community 134 - "chief-of-staff/SKILL.md"
Cohesion: 0.29
Nodes (6): Procedures, Schedules, Strategic View, Subagents, Wiki, Write history, not the present

### Community 135 - "Process"
Cohesion: 0.29
Nodes (6): 1. Scope the procedure, 2. Map each stage's journey, 3. Author the wizard, 4. Verify and hand off, Process, Wizard

### Community 136 - "Sections"
Cohesion: 0.33
Nodes (5): Evidence, Guidance, Merge Danger, Sections, Summary

### Community 137 - "writing-beats/SKILL.md"
Cohesion: 0.33
Nodes (5): Ending the journey, Grounding, Pulling from the pile, What is a beat, Writing rhythm

### Community 138 - "loop-me/SKILL.md"
Cohesion: 0.40
Nodes (4): Definition of done, The loop lens, The workspace, Vocabulary

### Community 139 - "Reference"
Cohesion: 0.40
Nodes (4): Files, Implementation vs Review, Reference, Steps

### Community 140 - "hitl-loop.template.sh"
Cohesion: 0.83
Nodes (3): capture(), hitl-loop.template.sh script, step()

### Community 141 - "GLOSSARY.md Format"
Cohesion: 0.50
Nodes (3): GLOSSARY.md Format, Rules, Structure

### Community 142 - "writing-fragments/SKILL.md"
Cohesion: 0.50
Nodes (3): File format, What is a fragment, Writing rhythm

## Knowledge Gaps
- **9 isolated node(s):** `@tailwindcss/turbopack`, `@types/katex`, `@types/node`, `@types/react`, `@types/react-dom` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1091 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `questionSlotMarks` to `kindergarten/types.ts`, `officialChapterMarks.ts`, `BlueprintEditor`, `prisma.ts`, `package.json`, `schemas.ts`, `curriculumInit.ts`, `syllabusImport.ts`, `paperDocx.ts`, `localization/index.ts`, `autofill.ts`, `diagram-search.ts`, `constants.ts`, `blueprint.ts`, `vitest.config.mjs`, `class-assignment-rbac.test.ts`, `batchQuestionIo.ts`, `curriculumContract.ts`, `setup/page.tsx`, `body`, `studio.test.ts`, `papers.ts`, `paperImport.ts`, `vitest`, `layout.ts`, `security-super-admin.test.ts`, `internalChoiceRules.ts`, `generatePaperSectionWithGemini`, `presets.ts`, `subpartExtractor.ts`, `QuestionPicker.tsx`, `paperAutogen.ts`, `curriculumContract.ts`, `officialTemplates.ts`, `PaperSheets.tsx`, `englishTitles.ts`, `gemini.ts`, `blueprintStructure.ts`, `dto.ts`, `classes/route.ts`, `answerKeyFill.ts`, `languageComponents.ts`, `api.ts`, `sectionTypes.ts`, `seed-vs-scheme.test.ts`, `blueprintImport.ts`, `school-paper-flow.test.ts`, `subpartsTotalMarks`, `detectPaperLanguage`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `@tailwindcss/turbopack`, `@types/katex`, `@types/node` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kindergarten/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11470985155195682 - nodes in this community are weakly interconnected._
- **Why does `react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `FigureInspectors.tsx`, `FigureStudio.tsx`, `package.json`, `presets/page.tsx`, `constants.ts`, `blueprint.ts`, `lib/types.ts`, `worksheets/[id]/page.tsx`, `blueprints/page.tsx`, `_shared.tsx`, `BlueprintTemplate`, `QuestionForm.tsx`, `generatePaperSectionWithGemini`, `api`, `QuestionPicker.tsx`, `PaperSheets.tsx`, `registry.ts`, `MathRichEditor`, `compare.tsx`, `joinDots.tsx`, `KindergartenPrintProps`, `pattern.tsx`, `blueprintExport.ts`, `AppShell.tsx`, `KindergartenEditorProps`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `FigureInspectors.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08832425892316999 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `papers/[id]/page.tsx` to `kindergarten/types.ts`, `FigureInspectors.tsx`, `blueprints/page.tsx`, `FigureStudio.tsx`, `AppShell.tsx`, `package.json`, `_shared.tsx`, `presets/page.tsx`, `BlueprintTemplate`, `QuestionForm.tsx`, `vitest`, `constants.ts`, `blueprint.ts`, `lib/types.ts`, `api`, `worksheets/[id]/page.tsx`, `QuestionPicker.tsx`, `blueprintExport.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `BlueprintEditor` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._