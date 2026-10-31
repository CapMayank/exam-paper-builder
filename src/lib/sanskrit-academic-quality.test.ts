import { describe, it, expect } from "vitest";
import { type QuestionType } from "./constants";
import {
  getChapterCurriculumSpec,
  type GenerationContract,
  SANSKRIT_COMPETENCY_TAXONOMY,
  evaluateSanskritCompetencyCoverage,
  resolveBoardAndSubjectCode,
} from "./curriculumContract";
import {
  SANSKRIT_CLASS10_BLUEPRINT,
  SANSKRIT_CLASS10_PAPER,
  SANSKRIT_MPBSE_2026_BLUEPRINT,
  SANSKRIT_MPBSE_2026_PAPER,
} from "./fixtures/sanskritPaperFixture";
import { STANDARD_BLUEPRINT_TEMPLATES } from "./curriculumTemplates";
import { resolveInternalChoiceRequirement } from "./internalChoiceRules";
import { computeDisplayedPaperNumbering } from "./layout";
import { getPaperLocale } from "./localization";
import { validateGeneratedQuestion } from "./questionValidator";

describe("Class 10 Sanskrit Academic Quality & Metric Integrity Audit", () => {
  const saLocale = getPaperLocale("sa");
  const hiLocale = getPaperLocale("hi");
  const enLocale = getPaperLocale("en");
  const biLocale = getPaperLocale("bilingual");

  const sanskritContract: GenerationContract = {
    contractId: "contract_sanskrit_test",
    board: "MPBSE",
    boardDisplayName: "MPBSE",
    classId: "cls_10",
    className: "Class 10",
    academicSession: "2026–27",
    syllabusVersion: "NCERT Rationalized",
    examType: "ANNUAL",
    bookId: "bk_shemushi",
    subjectId: "sub_sanskrit",
    rawSubject: "Sanskrit",
    canonicalSubject: "Sanskrit",
    subjectCode: "122",
    language: "sa",
    marksEach: 1,
    questionType: "MCQ",
    difficulty: "BALANCED",
    requiredCount: 6,
    sectionTitle: "खण्डः 'क' - बहुविकल्पीयप्रश्नाः",
    slots: [
      {
        slotIndex: 0,
        chapterId: "ch_sanskrit_4",
        chapterNumber: 4,
        chapterTitle: "शिशुलालनम्",
        marks: 1,
        requiresInternalChoice: false,
        curriculumSpec: getChapterCurriculumSpec("Sanskrit", "शिशुलालनम्", "Class 10"),
      },
    ],
    forbiddenCrossSubjectDomains: [],
    internalChoiceRequirement: resolveInternalChoiceRequirement({
      board: "MPBSE",
      academicSession: "2026–27",
      className: "Class 10",
      marksEach: 1,
      subjectCode: "122",
      subject: "Sanskrit",
    }),
    provenance: {
      board: "MPBSE",
      session: "2026–27",
      syllabusVersion: "NCERT Rationalized",
      subjectCode: "122",
      canonicalSubject: "Sanskrit",
    },
  };

  describe("Requirement 1: Question Counting & Separate Metrics", () => {
    it("computes exact separate metrics for 33 numbered questions, 48 allocation units, and 75 marks", () => {
      const numbering = computeDisplayedPaperNumbering(
        SANSKRIT_CLASS10_BLUEPRINT.sections,
        SANSKRIT_CLASS10_PAPER.items,
        "CONTINUOUS"
      );

      // 1. Numbered Parent Questions: exactly 33
      expect(numbering.numberedParentQuestions).toBe(33);
      expect(numbering.totalDisplayedQuestions).toBe(33);

      // 2. Blueprint Allocation Units: exactly 48 (6+6+6+6+6+12+3+3)
      expect(numbering.blueprintAllocationUnits).toBe(48);

      // 3. Atomic Response Tasks: 57 (counting subparts and column pairs)
      expect(numbering.atomicResponseTasks).toBe(57);

      // 4. Maximum marks: 75
      expect(numbering.totalMarks).toBe(75);

      // 5. Grouped Sub-items exist (Q7, Q8, Q9)
      expect(numbering.hasGroupedSubItems).toBe(true);

      // Verify that OR alternatives do NOT add extra question numbers or marks
      expect(SANSKRIT_CLASS10_PAPER.items.filter((i) => i.orQuestion).length).toBe(6);
      expect(numbering.numberedParentQuestions).toBe(33);
    });

    it("verifies section-level ranges and item counts", () => {
      const numbering = computeDisplayedPaperNumbering(
        SANSKRIT_CLASS10_BLUEPRINT.sections,
        SANSKRIT_CLASS10_PAPER.items,
        "CONTINUOUS"
      );

      // Section क: MCQs (Q1 to Q6) -> 6 questions, 6 marks
      const secA = numbering.sectionRanges["sec_a_mcq"];
      expect(secA.startQ).toBe(1);
      expect(secA.endQ).toBe(6);
      expect(secA.displayedCount).toBe(6);
      expect(secA.rawItemCount).toBe(6);

      // Section ख: Fill in Blanks (Q7 with 6 items a to f) -> 1 parent question, 6 items
      const secB = numbering.sectionRanges["sec_b_fill"];
      expect(secB.startQ).toBe(7);
      expect(secB.endQ).toBe(7);
      expect(secB.displayedCount).toBe(1);
      expect(secB.rawItemCount).toBe(6);

      // Section ग: True/False (Q8 with 6 statements a to f) -> 1 parent question, 6 items
      const secC = numbering.sectionRanges["sec_c_tf"];
      expect(secC.startQ).toBe(8);
      expect(secC.endQ).toBe(8);
      expect(secC.displayedCount).toBe(1);
      expect(secC.rawItemCount).toBe(6);

      // Section घ: Match Column (Q9 with 6 pairs) -> 1 parent question
      const secD = numbering.sectionRanges["sec_d_match"];
      expect(secD.startQ).toBe(9);
      expect(secD.endQ).toBe(9);
      expect(secD.displayedCount).toBe(1);

      // Section ङ: Very Short (Q10 to Q15) -> 6 questions
      const secE = numbering.sectionRanges["sec_e_vshort"];
      expect(secE.startQ).toBe(10);
      expect(secE.endQ).toBe(15);
      expect(secE.displayedCount).toBe(6);

      // Section च: Short (Q16 to Q27) -> 12 questions
      const secF = numbering.sectionRanges["sec_f_short"];
      expect(secF.startQ).toBe(16);
      expect(secF.endQ).toBe(27);
      expect(secF.displayedCount).toBe(12);

      // Section छ: Passage Short (Q28 to Q30) -> 3 questions
      const secG = numbering.sectionRanges["sec_g_passage"];
      expect(secG.startQ).toBe(28);
      expect(secG.endQ).toBe(30);
      expect(secG.displayedCount).toBe(3);

      // Section ज: Long (Q31 to Q33) -> 3 questions
      const secH = numbering.sectionRanges["sec_h_long"];
      expect(secH.startQ).toBe(31);
      expect(secH.endQ).toBe(33);
      expect(secH.displayedCount).toBe(3);

      // Sum of displayed question counts across all sections = 33
      const sumDisplayed =
        secA.displayedCount +
        secB.displayedCount +
        secC.displayedCount +
        secD.displayedCount +
        secE.displayedCount +
        secF.displayedCount +
        secG.displayedCount +
        secH.displayedCount;
      expect(sumDisplayed).toBe(33);
    });

    it("formats section headers with correct academic terminology rather than misleading question counts", () => {
      const numbering = computeDisplayedPaperNumbering(
        SANSKRIT_CLASS10_BLUEPRINT.sections,
        SANSKRIT_CLASS10_PAPER.items,
        "CONTINUOUS"
      );

      // Section ख (FILL_BLANK): 1 parent question with 6 fill-in-the-blank items
      const secB = numbering.sectionRanges["sec_b_fill"];
      const headerSaB = saLocale.section.formatGroupSummary(6, 6, {
        displayedCount: secB.displayedCount,
        rawItemCount: secB.rawItemCount,
        type: "FILL_BLANK",
      });
      expect(headerSaB).toBe("1 प्रश्नः (6 रिक्तस्थानानि) · 6 अङ्काः");

      // Section ग (TRUE_FALSE): 1 parent question with 6 True/False statements
      const secC = numbering.sectionRanges["sec_c_tf"];
      const headerSaC = saLocale.section.formatGroupSummary(6, 6, {
        displayedCount: secC.displayedCount,
        rawItemCount: secC.rawItemCount,
        type: "TRUE_FALSE",
      });
      expect(headerSaC).toBe("1 प्रश्नः (6 सत्यासत्य-कथनानि) · 6 अङ्काः");

      // Section घ (MATCH_COLUMN): 1 parent question with 6 matching pairs
      const secD = numbering.sectionRanges["sec_d_match"];
      const headerSaD = saLocale.section.formatGroupSummary(6, 6, {
        displayedCount: secD.displayedCount,
        rawItemCount: 6,
        type: "MATCH_COLUMN",
      });
      expect(headerSaD).toBe("1 प्रश्नः (6 युग्मानि) · 6 अङ्काः");

      // Section च (SHORT): 12 distinct numbered questions
      const secF = numbering.sectionRanges["sec_f_short"];
      const headerSaF = saLocale.section.formatGroupSummary(12, 24, {
        displayedCount: secF.displayedCount,
        rawItemCount: secF.rawItemCount,
        type: "SHORT",
      });
      expect(headerSaF).toBe("12 प्रश्नाः · 24 अङ्काः");

      // English Header Verification
      expect(
        enLocale.section.formatGroupSummary(6, 6, {
          displayedCount: 1,
          rawItemCount: 6,
          type: "FILL_BLANK",
        })
      ).toBe("1 Question (6 Fill-in-the-Blank items) · 6 Marks");

      expect(
        enLocale.section.formatGroupSummary(6, 6, {
          displayedCount: 1,
          rawItemCount: 6,
          type: "MATCH_COLUMN",
        })
      ).toBe("1 Question (6 Matching pairs) · 6 Marks");
    });
  });

  describe("Requirement 2 & 3: Context-Aware Sanskrit Academic Validation", () => {
    it("rejects पठितवान् matched with तप्रत्ययः / क्त-प्रत्ययः and accepts क्तवतु-प्रत्ययः", () => {
      const invalidMatchContract: GenerationContract = {
        ...sanskritContract,
        questionType: "MATCH_COLUMN",
        marksEach: 6,
      };

      // Invalid: पठितवान् paired with तप्रत्ययः
      const invalidResult = validateGeneratedQuestion(
        {
          type: "MATCH_COLUMN",
          text: "अधोलिखितयोः स्तम्भयोः उचितं मेलनं कुरुत:",
          options: [
            "पठितवान् ||| तप्रत्ययः",
            "नमस्ते ||| विसर्गसन्धिः",
          ],
          answer: "(A)-(i), (B)-(ii)",
        },
        invalidMatchContract
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);

      // Valid: पठितवान् paired with क्तवतु-प्रत्ययः
      const validResult = validateGeneratedQuestion(
        {
          type: "MATCH_COLUMN",
          text: "अधोलिखितयोः स्तम्भयोः उचितं मेलनं कुरुत:",
          options: [
            "पठितवान् ||| क्तवतु-प्रत्ययः",
            "नमस्ते ||| विसर्गसन्धिः",
          ],
          answer: "(A)-(i), (B)-(ii)",
        },
        invalidMatchContract
      );
      expect(validResult.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(false);
    });

    it("rejects Hindi calque pseudo-Sanskrit passive forms like प्रदत्तोग्छति / प्रदत्तो गच्छति", () => {
      const fillContract: GenerationContract = {
        ...sanskritContract,
        questionType: "FILL_BLANK",
      };
      const result = validateGeneratedQuestion(
        {
          type: "FILL_BLANK",
          text: "अन्योक्तिपाठस्य पद्येषु प्रकृतिमाध्यमेन मानवानाम् ________ उपदेशः प्रदत्तोग्छति।",
          answer: "सद्गुणानाम्",
        },
        fillContract
      );
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("rejects grammatical agreement mismatch when stem asks 'कः' but options are dual entities", () => {
      // Question 5 Defect: asks singular 'कः' with dual options 'लवकुशौ', 'भरतशत्रुघ्नौ'
      const result = validateGeneratedQuestion(
        {
          type: "MCQ",
          text: "शिशुलालनम् पाठे रामस्य सिंहासने उपवेष्टुम् कः द्वौ बालकौ आकृष्टवान्?",
          options: ["लवकुशौ", "भरतशत्रुघ्नौ", "सुग्रीवविभीषणौ", "युधिष्ठिरभीमसेनौ"],
          answer: "लवकुशौ",
        },
        sanskritContract
      );
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(true);
    });

    it("rejects invalid dual noun inflection like 'द्वौ बालको' (must be 'द्वौ बालकौ')", () => {
      const result = validateGeneratedQuestion(
        {
          type: "MCQ",
          text: "शिशुलालनम् पाठे रामस्य सिंहासने उपवेष्टुम् कौ द्वौ बालको आकृष्टवान्?",
          options: ["लवकुशौ", "भरतशत्रुघ्नौ", "सुग्रीवविभीषणौ", "युधिष्ठिरभीमसेनौ"],
          answer: "लवकुशौ",
        },
        sanskritContract
      );
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "SANSKRIT_MORPHOLOGY_ERROR")).toBe(true);
    });

    it("rejects typographical corruption 'एकचने' and semantic error 'वर्जयत'", () => {
      const fillContract: GenerationContract = {
        ...sanskritContract,
        questionType: "FILL_BLANK",
      };
      const shortContract: GenerationContract = {
        ...sanskritContract,
        questionType: "SHORT",
        marksEach: 2,
      };

      const typoResult = validateGeneratedQuestion(
        {
          type: "FILL_BLANK",
          text: "पितृ शब्दस्य सप्तमी विभक्ति एकचने ________ रूपं भवति।",
          answer: "पितरि",
        },
        fillContract
      );
      expect(typoResult.valid).toBe(false);
      expect(typoResult.issues.some((i) => i.code === "SANSKRIT_SPELLING_ERROR")).toBe(true);

      const semanticResult = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "बुद्धिमत्याः चातुर्यं सविस्तरं वर्जयत।",
          answer: "विवरणम्",
        },
        shortContract
      );
      expect(semanticResult.valid).toBe(false);
      expect(semanticResult.issues.some((i) => i.code === "SANSKRIT_SEMANTIC_ERROR")).toBe(true);
    });

    it("distinguishes actual internal-choice objects from ordinary conjunction uses of अथवा", () => {
      const shortContract: GenerationContract = {
        ...sanskritContract,
        questionType: "SHORT",
        marksEach: 2,
      };

      // Natural conjunction in prompt (should NOT trigger an internal-choice split or error)
      const conjunctionResult = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "पद्यांशस्य गद्यांशस्य वा हिन्दीभाषया अनुवादं कुरुत अथवा व्याख्यां लिखत।",
          answer: "अनुवादः",
        },
        shortContract
      );
      // Valid because it is not rejected as an internal-choice error
      expect(conjunctionResult.issues.filter((i) => i.severity === "ERROR").length).toBe(0);

      // Embedded alternate question in stem gives a WARNING for review rather than hard fatal crash
      const embeddedResult = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "केषां प्रकृतेः जनानां संसर्गः सज्जनैः सह न शोभते अथवा किं कृत्वा मनुष्यः महान् भवति?",
          answer: "सज्जनानाम्",
        },
        shortContract
      );
      expect(embeddedResult.issues.some((i) => i.code === "EMBEDDED_OR_CHOICE_WARNING")).toBe(true);
      expect(embeddedResult.issues.find((i) => i.code === "EMBEDDED_OR_CHOICE_WARNING")?.severity).toBe("WARNING");
    });
  });

  describe("Requirement 4 & 7: Permanent Regression Fixture Integrity", () => {
    it("validates that all questions in the audited Sanskrit paper fixture pass academic validation without fatal errors", () => {
      for (let idx = 0; idx < SANSKRIT_CLASS10_PAPER.items.length; idx++) {
        const item = SANSKRIT_CLASS10_PAPER.items[idx];
        const sec = SANSKRIT_CLASS10_BLUEPRINT.sections.find((s) => s.id === item.sectionId)!;

        const contract: GenerationContract = {
          ...sanskritContract,
          questionType: sec.type as QuestionType,
          marksEach: sec.marksEach,
          internalChoiceRequirement: resolveInternalChoiceRequirement({
            board: "MPBSE",
            academicSession: "2026–27",
            className: "Class 10",
            marksEach: sec.marksEach,
            subjectCode: "122",
            subject: "Sanskrit",
          }),
          slots: [
            {
              slotIndex: idx,
              chapterId: "ch_sanskrit_1",
              chapterNumber: 1,
              chapterTitle: "शेमुषी",
              marks: sec.marksEach,
              requiresInternalChoice: Boolean(item.orQuestion),
              curriculumSpec: getChapterCurriculumSpec("Sanskrit", "शेमुषी", "Class 10"),
            },
          ],
        };

        const res = validateGeneratedQuestion(
          {
            ...item.question,
            type: item.question.type,
            marks: item.question.marks || sec.marksEach,
            orQuestion: item.orQuestion,
          },
          contract,
          { slotIndex: idx }
        );

        const fatalErrors = res.issues.filter((i) => i.severity === "ERROR");
        if (fatalErrors.length > 0) {
          console.error(`Item ${item.id} (Q${idx + 1}) errors:`, fatalErrors);
        }
        expect(fatalErrors.length).toBe(0);
      }
    });
  });

  describe("Official MPBSE Class 10 Sanskrit Examination Blueprint (2026–27)", () => {
    it("verifies the official standard starter blueprint template in STANDARD_BLUEPRINT_TEMPLATES", () => {
      const tmpl = STANDARD_BLUEPRINT_TEMPLATES.find((t) => t.id === "mpbse-sanskrit-10th-75m");
      expect(tmpl).toBeDefined();
      expect(tmpl!.totalMarks).toBe(75);
      expect(tmpl!.durationMin).toBe(180);
      expect(tmpl!.targetClasses).toBe("Class 10");
      expect(tmpl!.language).toBe("sa");
      expect(tmpl!.subjectCode).toBe("512");
      expect(tmpl!.sections.length).toBe(19);

      // Verify marks arithmetic across the 19 section records
      const totalMarks = tmpl!.sections.reduce((sum, sec) => {
        return sum + sec.questionTypes.reduce((s, qt) => s + qt.count * qt.marksEach, 0);
      }, 0);
      expect(totalMarks).toBe(75);

      // Verify no OR choice configured for Q1-Q17
      for (let sIdx = 0; sIdx <= 12; sIdx++) {
        const sec = tmpl!.sections[sIdx];
        for (const qt of sec.questionTypes) {
          expect(qt.orChoiceMode).toBe("NOT_REQUIRED");
        }
      }

      // Verify Q18, Q19, Q20 have BOARD_DEFAULT or REQUIRED internal choices
      expect(["REQUIRED", "BOARD_DEFAULT"]).toContain(tmpl!.sections[13].questionTypes[0].orChoiceMode);
      expect(["REQUIRED", "BOARD_DEFAULT"]).toContain(tmpl!.sections[14].questionTypes[0].orChoiceMode);
      expect(["REQUIRED", "BOARD_DEFAULT"]).toContain(tmpl!.sections[15].questionTypes[0].orChoiceMode);

      // Verify Q21 has NOT_REQUIRED (choices are via attempt-any-4 subparts)
      expect(tmpl!.sections[16].questionTypes[0].orChoiceMode).toBe("NOT_REQUIRED");

      // Verify Q22 has BOARD_DEFAULT or REQUIRED
      expect(["REQUIRED", "BOARD_DEFAULT"]).toContain(tmpl!.sections[17].questionTypes[0].orChoiceMode);

      // Verify Q23 has NOT_REQUIRED (choice is via 4 selectable essay topics)
      expect(tmpl!.sections[18].questionTypes[0].orChoiceMode).toBe("NOT_REQUIRED");
    });

    it("computes exactly 23 numbered parent questions, 75 maximum marks, and 19 section ranges", () => {
      const numbering = computeDisplayedPaperNumbering(
        SANSKRIT_MPBSE_2026_BLUEPRINT.sections,
        SANSKRIT_MPBSE_2026_PAPER.items,
        "CONTINUOUS"
      );

      // 1. Exactly 23 Numbered Parent Questions (5 objective groups + 12 short/competency + 3 passage + 3 writing)
      expect(numbering.numberedParentQuestions).toBe(23);
      expect(numbering.totalDisplayedQuestions).toBe(23);

      // 2. Maximum Marks: exactly 75
      expect(numbering.totalMarks).toBe(75);

      // 3. Has Grouped Sub-Items (Q1, Q2, Q4, Q5)
      expect(numbering.hasGroupedSubItems).toBe(true);

      // 4. Blueprint Allocation Units: 48 blueprint units
      expect(numbering.blueprintAllocationUnits).toBe(48);

      // 5. Atomic Response Tasks: 67 atomic tasks (subparts, column pairs)
      expect(numbering.atomicResponseTasks).toBe(67);

      // 6. Verify section ranges for the 19 blueprint sections:
      const r = numbering.sectionRanges;

      // Q1: MCQ (grouped, 6 sub-items)
      expect(r["sec_mp_1_mcq"].startQ).toBe(1);
      expect(r["sec_mp_1_mcq"].endQ).toBe(1);
      expect(r["sec_mp_1_mcq"].displayedCount).toBe(1);
      expect(r["sec_mp_1_mcq"].rawItemCount).toBe(6);

      // Q2: True/False (grouped, 6 sub-items)
      expect(r["sec_mp_2_tf"].startQ).toBe(2);
      expect(r["sec_mp_2_tf"].endQ).toBe(2);
      expect(r["sec_mp_2_tf"].displayedCount).toBe(1);
      expect(r["sec_mp_2_tf"].rawItemCount).toBe(6);

      // Q3: Match Column (1 item with 6 pairs)
      expect(r["sec_mp_3_match"].startQ).toBe(3);
      expect(r["sec_mp_3_match"].endQ).toBe(3);
      expect(r["sec_mp_3_match"].displayedCount).toBe(1);

      // Q4: Very Short (grouped, 6 sub-items)
      expect(r["sec_mp_4_vshort"].startQ).toBe(4);
      expect(r["sec_mp_4_vshort"].endQ).toBe(4);
      expect(r["sec_mp_4_vshort"].displayedCount).toBe(1);
      expect(r["sec_mp_4_vshort"].rawItemCount).toBe(6);

      // Q5: Fill Blanks with Word Bank (grouped, 6 sub-items)
      expect(r["sec_mp_5_fill"].startQ).toBe(5);
      expect(r["sec_mp_5_fill"].endQ).toBe(5);
      expect(r["sec_mp_5_fill"].displayedCount).toBe(1);
      expect(r["sec_mp_5_fill"].rawItemCount).toBe(6);

      // Q6 to Q10: 5 independent 2-mark questions
      expect(r["sec_mp_6_text_short"].startQ).toBe(6);
      expect(r["sec_mp_6_text_short"].endQ).toBe(10);
      expect(r["sec_mp_6_text_short"].displayedCount).toBe(5);
      expect(r["sec_mp_6_text_short"].rawItemCount).toBe(5);

      // Q11: Subhashita
      expect(r["sec_mp_11_shloka"].startQ).toBe(11);
      expect(r["sec_mp_11_shloka"].endQ).toBe(11);
      expect(r["sec_mp_11_shloka"].displayedCount).toBe(1);

      // Q12: Scrambled Story
      expect(r["sec_mp_12_katha"].startQ).toBe(12);
      expect(r["sec_mp_12_katha"].endQ).toBe(12);

      // Q13: Question Formation
      expect(r["sec_mp_13_prashna"].startQ).toBe(13);
      expect(r["sec_mp_13_prashna"].endQ).toBe(13);

      // Q14: Speaker / Listener
      expect(r["sec_mp_14_samvada"].startQ).toBe(14);
      expect(r["sec_mp_14_samvada"].endQ).toBe(14);

      // Q15: Karaka Correction
      expect(r["sec_mp_15_karaka"].startQ).toBe(15);
      expect(r["sec_mp_15_karaka"].endQ).toBe(15);

      // Q16: Fill Blanks from Textbook
      expect(r["sec_mp_16_fill_text"].startQ).toBe(16);
      expect(r["sec_mp_16_fill_text"].endQ).toBe(16);

      // Q17: Voice Transformation
      expect(r["sec_mp_17_vacya"].startQ).toBe(17);
      expect(r["sec_mp_17_vacya"].endQ).toBe(17);

      // Q18: Prose Passage with OR
      expect(r["sec_mp_18_prose"].startQ).toBe(18);
      expect(r["sec_mp_18_prose"].endQ).toBe(18);

      // Q19: Poetry Passage with OR
      expect(r["sec_mp_19_poetry"].startQ).toBe(19);
      expect(r["sec_mp_19_poetry"].endQ).toBe(19);

      // Q20: Drama Passage with OR
      expect(r["sec_mp_20_drama"].startQ).toBe(20);
      expect(r["sec_mp_20_drama"].endQ).toBe(20);

      // Q21: Unseen Passage (attempt 4 of 5)
      expect(r["sec_mp_21_unseen"].startQ).toBe(21);
      expect(r["sec_mp_21_unseen"].endQ).toBe(21);

      // Q22: Letter Writing with OR
      expect(r["sec_mp_22_letter"].startQ).toBe(22);
      expect(r["sec_mp_22_letter"].endQ).toBe(22);

      // Q23: Essay Writing
      expect(r["sec_mp_23_essay"].startQ).toBe(23);
      expect(r["sec_mp_23_essay"].endQ).toBe(23);

      // Verify Devanagari sub-item labels (क)–(च) on grouped Q1
      const q1_item1 = numbering.itemNumbers["item_mp_1_1"];
      expect(q1_item1.isGroupedSubItem).toBe(true);
      expect(q1_item1.subLabel).toBe("(क)");
      expect(q1_item1.questionNumber).toBe(1);

      const q1_item6 = numbering.itemNumbers["item_mp_1_6"];
      expect(q1_item6.isGroupedSubItem).toBe(true);
      expect(q1_item6.subLabel).toBe("(च)");
      expect(q1_item6.questionNumber).toBe(1);
    });

    it("verifies accurate subject-code resolution for MPBSE (512), CBSE (122), and CBSE Communicative (119)", () => {
      // MPBSE Sanskrit General -> 512
      const mpbseRes = resolveBoardAndSubjectCode({
        board: "MPBSE",
        className: "Class 10",
        subject: "Sanskrit",
      });
      expect(mpbseRes.board).toBe("MPBSE");
      expect(mpbseRes.subjectCode).toBe("512");

      // CBSE Sanskrit -> 122
      const cbseRes = resolveBoardAndSubjectCode({
        board: "CBSE",
        className: "Class 10",
        subject: "Sanskrit",
      });
      expect(cbseRes.board).toBe("CBSE");
      expect(cbseRes.subjectCode).toBe("122");

      // CBSE Sanskrit Communicative -> 119
      const cbseCommRes = resolveBoardAndSubjectCode({
        board: "CBSE",
        className: "Class 10",
        subject: "Sanskrit Communicative",
      });
      expect(cbseCommRes.board).toBe("CBSE");
      expect(cbseCommRes.subjectCode).toBe("119");

      // Preserves existing explicit subject codes on historical records
      const preservedRes = resolveBoardAndSubjectCode({
        board: "MPBSE",
        className: "Class 10",
        subject: "Sanskrit",
        subjectCode: "122", // Historical record with 122
      });
      expect(preservedRes.subjectCode).toBe("122");
    });

    it("verifies the Application-defined Competency Taxonomy (16 competencies, 75 marks, zero inflation)", () => {
      // Exactly 16 competencies mapped to syllabus
      expect(SANSKRIT_COMPETENCY_TAXONOMY.length).toBe(16);

      // Sum of default expected marks across taxonomy is exactly 75
      const sumTaxonomy = SANSKRIT_COMPETENCY_TAXONOMY.reduce((sum, c) => sum + c.defaultExpectedMarks, 0);
      expect(sumTaxonomy).toBe(75);

      // Evaluate coverage from the official 2026-27 model paper items
      const numbering = computeDisplayedPaperNumbering(
        SANSKRIT_MPBSE_2026_BLUEPRINT.sections,
        SANSKRIT_MPBSE_2026_PAPER.items,
        "CONTINUOUS"
      );
      const report = evaluateSanskritCompetencyCoverage(
        SANSKRIT_MPBSE_2026_PAPER.items.map((it) => {
          const sec = SANSKRIT_MPBSE_2026_BLUEPRINT.sections.find((s) => s.id === it.sectionId);
          const isMatch = it.question.type === "MATCH_COLUMN" || sec?.type === "MATCH_COLUMN";
          const marks = isMatch
            ? (sec?.count || 1) * (sec?.marksEach || 1)
            : (it.question.marks || sec?.marksEach || 1);
          return {
            questionNumber: numbering.itemNumbers[it.id]?.questionNumber,
            type: it.question.type,
            marks,
            text: it.question.text,
            sectionTitle: sec?.title,
          };
        })
      );

      // Verify that total evaluated marks equals the exact paper total (75) without inflation
      expect(report.totalMarks).toBe(75);
      expect(report.unassignedMarks).toBe(0);

      // Verify specific competencies received allocations
      expect(report.coverage["shabdarupa"]).toBeGreaterThan(0);
      expect(report.coverage["dhaturupa"]).toBeGreaterThan(0);
      expect(report.coverage["sandhi"]).toBeGreaterThan(0);
      expect(report.coverage["patra_lekhanam"]).toBe(4);
      expect(report.coverage["nibandha_lekhanam"]).toBe(4);
    });

    it("verifies authentic curriculum specification grounding for Shemushi Part 2", () => {
      const spec = getChapterCurriculumSpec("Sanskrit", "शुचिपर्यावरणम्", "Class 10");
      expect(spec.canonicalSubject).toBe("Sanskrit");
      // Must contain authentic Sanskrit literary references
      expect(spec.sampleMcqs[0].text).toContain("शुचिपर्यावरणम्");
      expect(spec.sampleMcqs[0].answer).toBe("हरिदत्तशर्मा");
      // Must NOT contain generic English literary fallback text
      expect(spec.sampleMcqs[0].text).not.toContain("Human resilience");
      expect(spec.sampleFillBlanks[0].text).not.toContain("Neither the teacher nor the students");

      // Verify Buddhimati chapter
      const specBuddhi = getChapterCurriculumSpec("Sanskrit", "बुद्धिर्बलवती सदा", "Class 10");
      expect(specBuddhi.sampleMcqs[0].answer).toBe("गहनकानने");

      // Verify custom chapter fallback is authentic Sanskrit Devanagari
      const specCustom = getChapterCurriculumSpec("Sanskrit", "कश्चित् नूतनः पाठः", "Class 10");
      expect(specCustom.canonicalSubject).toBe("Sanskrit");
      expect(specCustom.sampleMcqs[0].text).toContain("मुख्यसन्देशः");
      expect(specCustom.sampleFillBlanks[0].answer).toBe("धर्मः");
    });

    it("validates that all 23 official model paper questions pass academic validation without errors", () => {
      for (let idx = 0; idx < SANSKRIT_MPBSE_2026_PAPER.items.length; idx++) {
        const item = SANSKRIT_MPBSE_2026_PAPER.items[idx];
        const sec = SANSKRIT_MPBSE_2026_BLUEPRINT.sections.find((s) => s.id === item.sectionId)!;

        const contract: GenerationContract = {
          ...sanskritContract,
          subjectCode: "512",
          questionType: sec.type as QuestionType,
          marksEach: sec.marksEach,
          internalChoiceRequirement: resolveInternalChoiceRequirement({
            board: "MPBSE",
            academicSession: "2026–27",
            className: "Class 10",
            marksEach: sec.marksEach,
            subjectCode: "512",
            subject: "Sanskrit",
          }),
          slots: [
            {
              slotIndex: idx,
              chapterId: "ch_sanskrit_1",
              chapterNumber: 1,
              chapterTitle: "शेमुषी",
              marks: sec.marksEach,
              requiresInternalChoice: Boolean(item.orQuestion),
              curriculumSpec: getChapterCurriculumSpec("Sanskrit", "शेमुषी", "Class 10"),
            },
          ],
        };

        const res = validateGeneratedQuestion(
          {
            ...item.question,
            type: item.question.type,
            marks: item.question.marks || sec.marksEach,
            orQuestion: item.orQuestion,
          },
          contract,
          { slotIndex: idx }
        );

        const fatalErrors = res.issues.filter((i) => i.severity === "ERROR");
        if (fatalErrors.length > 0) {
          console.error(`Item ${item.id} (index ${idx}) errors:`, fatalErrors);
        }
        expect(fatalErrors.length).toBe(0);
      }
    });
  });
});
