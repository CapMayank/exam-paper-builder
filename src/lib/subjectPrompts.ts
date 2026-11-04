import type { PaperLanguage } from "./constants";
import type { GenerationContract } from "./curriculumContract";

export interface SubjectPromptDirectives {
  subjectName: string;
  systemDirective: string;
  solvabilityRules: string[];
  completenessRules: string[];
  rubricDirective: string;
  formattingNotes: string[];
  /** Kinds of question a good paper in this subject mixes; one per slot is suggested by slotQuestionForm. */
  varietyRules?: string[];
}

/**
 * Precision rules every subject shares. Each one comes from a real error a teacher had to correct in a generated
 * paper before it could be printed.
 */
export const UNIVERSAL_QUALITY_RULES: string[] = [
  "Fill in the blank: the blank must hold the tested term, and nothing else in the sentence may give that term away (wrong: 'Energy possessed due to position is called ________ potential energy'; right: 'Energy possessed by an object due to its position or configuration is called ________ energy').",
  "Use the exact technical term the textbook uses for the case asked (e.g. 'formula unit mass' for ionic compounds such as Al2(SO4)3 or NaCl, 'molecular mass' only for molecular substances; 'speed' vs 'velocity'; 'weather' vs 'climate').",
  "A question that asks students to verify, calculate, compare or interpret MUST supply every value, observation, table or statement needed (e.g. a law-of-constant-proportions question gives the masses of at least two samples). Never ask students to verify a law from data that is not given.",
  "Instructions must not contradict themselves. When a drawing is wanted, say so plainly: 'Draw a neat, well-labelled diagram of ...'. Never write 'textual outline' for a drawing task, and never refer to a figure that is not supplied.",
  "Every factual statement in a question, option or answer must be exact, not loosely true (e.g. ask which nutrient a plant obtains mainly from atmospheric CO2, not that 'carbon is supplied by air and water').",
  "Model answers must be correct and clearly worded in the textbook's own concepts — no vague or confusing phrasing (e.g. explain evaporative cooling as the higher-energy surface particles escaping, which lowers the average kinetic energy of the liquid left behind).",
  "Each question must be answerable from the prescribed textbook for this class; do not require facts, formulas or data from outside it.",
  "An OR alternative must be equivalent in marks, length, difficulty and type of thinking to its main question (a definition must not be the alternative to a numerical).",
  "When the answer needs a set number of points, say how many (e.g. 'Give any three reasons') and make it match the marks.",
];

/** Chapter cues for Class 9-10 Science, used to suggest which kind of question a slot should be. */
const SCI_NUMERICAL = /motion|गति|force|बल|gravitation|गुरुत्व|work|कार्य|energy|ऊर्जा|sound|ध्वनि|electric|विद्युत|light|प्रकाश|reflection|refraction|परावर्तन|अपवर्तन|atoms|molecules|परमाणु|अणु|is matter|शुद्ध|solution|विलयन|magnetic/i;
const SCI_GRAPH = /motion|गति|force|बल|electric|विद्युत|sound|ध्वनि/i;
const SCI_DIAGRAM = /cell|कोशिका|unit of life|मौलिक इकाई|tissue|ऊतक|atom|परमाणु|improvement in food|crop|sound|ध्वनि|eye|नेत्र|light|प्रकाश|reflection|refraction|life process|जैव प्रक्रम|control|नियंत्रण|reproduc|जनन|heredity|आनुवंश|magnetic|चुम्बक|electric|विद्युत|matter|पदार्थ|diversity|विविधता|food|खाद्य/i;

/**
 * Suggests the kind of question one slot should be, rotating through what the subject and chapter support, so a
 * section is not made of one kind of question (e.g. only "explain" questions in a Science paper).
 * Returns "" when there is nothing useful to add (language papers, most objective items).
 */
export function slotQuestionForm(subject: string, chapterTitle: string, type: string, marks: number, position: number): string {
  const norm = (subject || "").toLowerCase();
  const subjective = ["VERY_SHORT", "SHORT", "LONG", "NUMERICAL", "CASE_STUDY"].includes(type) && marks >= 2;
  const ch = chapterTitle || "";
  const pick = (forms: string[]) => `Question form: ${forms[position % forms.length]}.`;
  if (!subjective) {
    if (type === "MCQ" && /science|विज्ञान|physic|chem|bio|math|गणित/i.test(norm) && !/social|सामाजिक/.test(norm)) {
      return pick(["conceptual (why / which explains)", "application to an everyday observation", "numerical or data-reading in one step", "'which of these is NOT' judgement"]);
    }
    return "";
  }
  if (/science|विज्ञान/.test(norm) && !/social|सामाजिक/.test(norm)) {
    const forms: string[] = [];
    if (SCI_NUMERICAL.test(ch)) forms.push("numerical where the student must identify the relation to use (give data with SI units; do not state the formula in the question)");
    if (SCI_DIAGRAM.test(ch)) forms.push("diagram-based: 'Draw a neat, well-labelled diagram of ...' and ask one thing about it (e.g. plant/animal cell, stomata, tissues, atomic structure, apparatus)");
    forms.push("application: explain an everyday observation or situation using the chapter's principle");
    if (SCI_GRAPH.test(ch)) forms.push("graph-based: give data in a small table or describe the graph exactly (axes, shape, values) and ask the student to plot or interpret it (e.g. distance-time / velocity-time)");
    forms.push("reasoning: give reasons / compare / distinguish between two related concepts");
    return pick(forms);
  }
  if (/social|सामाजिक|history|इतिहास|geograph|भूगोल|political|राजनीति|econom|अर्थशास्त्र|civics/.test(norm)) {
    return pick([
      "cause-and-effect: explain causes or consequences with the stated number of points",
      "source/situation-based: give a short (2-4 line) factual extract or situation and ask about it",
      "compare / distinguish between two related concepts, events or features",
      "evaluate or justify a statement using facts from the chapter",
    ]);
  }
  if (/math|गणित/.test(norm)) return pick(["word problem set in a real situation", "multi-step computation", "prove / show that", "find the unknown and verify"]);
  if (/physic|भौतिक|chem|रसायन/.test(norm)) {
    return pick(["numerical where the student chooses the relation", "derivation or reasoning", "application to a practical situation", "diagram / graph based (draw, label or interpret)"]);
  }
  if (/bio|जीव/.test(norm)) {
    return pick(["diagram-based: draw and label, then explain one part", "process explanation in sequence", "compare / distinguish", "application to health, agriculture or everyday life"]);
  }
  return "";
}

/**
 * Returns subject-specific prompt directives tailored for board examination quality.
 */
export function getSubjectPromptDirectives(
  canonicalSubject: string,
  className: string,
  language: PaperLanguage = "en",
  variant: "BASIC" | "STANDARD" = "STANDARD",
): SubjectPromptDirectives {
  const norm = canonicalSubject.trim().toLowerCase();

  if (norm.includes("math") || norm.includes("गणित")) {
    return {
      subjectName: "Mathematics",
      systemDirective: `You are an expert Chief Board Examiner in Mathematics for ${className}.
Every question you produce must be mathematically sound, rigorously verified, and cleanly solvable by a secondary school student within allocated time.
NEVER generate unsolvable equations, negative values under square roots (unless imaginary numbers are in syllabus), or geometric figures with impossible side lengths (e.g. triangle inequality violations).`,
      solvabilityRules: [
        "Numerical and algebraic questions must yield clean, verifiable solutions (integers, simplified radicals, or neat rational fractions).",
        "For quadratic equations, verify the discriminant: $b^2 - 4ac \\ge 0$ for real roots. Ensure factoring is tractable without bizarre decimals unless specifically testing quadratic formula rounding.",
        "For coordinate geometry, verify distance and midpoint calculations: distance formula $\\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$ must yield sensible numbers.",
        "For trigonometry, use standard angles ($0^\\circ, 30^\\circ, 45^\\circ, 60^\\circ, 90^\\circ$) or standard identities $(\\sin^2\\theta + \\cos^2\\theta = 1)$.",
        "For arithmetic progressions (AP), ensure the common difference $d$ and term values $a_n$ are consistent with formulas $a_n = a + (n-1)d$ and $S_n = \\frac{n}{2}[2a + (n-1)d]$.",
        variant === "BASIC"
          ? "BASIC VARIANT (CODE 101): Restrict to single-concept textbook applications and clean numerical substitution. Avoid complex multi-step proofs or non-obvious algebraic manipulations."
          : "STANDARD VARIANT (CODE 100): Balanced analytical depth with clear multi-step reasoning.",
      ],
      completenessRules: [
        "Include all required initial conditions, constraints (e.g. $x \\neq 0$, $a > 0$), and specified units (cm, m, m^2, cm^3).",
        "Never refer to an unspecified diagram or unstated coordinate system.",
        "MCQs must have exactly 4 mathematically distinct options, with 3 plausible distractors resulting from common algebraic or sign errors.",
        "Work the problem through yourself before writing the answer; the answer key must show the working.",
      ],
      varietyRules: ["Mix word problems in real situations, multi-step computations, proofs / 'show that', and find-and-verify questions across the paper."],
      rubricDirective: "Provide step-wise marking breakdown in the 'answer' field (e.g. Formula: 1 mark, Substitution: 1 mark, Final answer with units: 1 mark).",
      formattingNotes: [
        "Enclose ALL math expressions, numbers, variables, and formulas in standard LaTeX $...$ delimiters.",
        "Use \\frac{a}{b} for fractions, \\sqrt{x} for roots, and \\times or \\cdot for multiplication.",
      ],
    };
  }

  if (norm.includes("physic") || norm.includes("भौतिक")) {
    return {
      subjectName: "Physics",
      systemDirective: `You are a Senior Board Moderator in Physics for ${className}.
Physics questions must strictly reflect empirical reality, dimensional homogeneity, and SI unit standards.
Ensure all numerical values represent physically plausible scenarios.`,
      solvabilityRules: [
        "All physical equations must be dimensionally homogeneous.",
        "For optics, adhere strictly to the Cartesian sign convention: object distance $u$ is negative, focal length $f$ is negative for concave mirrors/lenses and positive for convex mirrors/lenses.",
        "For kinematics and dynamics, specify gravitational acceleration $g = 9.8\\text{ m/s}^2$ or $g = 10\\text{ m/s}^2$ explicitly in question stem.",
        "For electricity and magnetism, verify Ohm's law, Kirchhoff's laws, and power formulas ($P = VI = I^2R = V^2/R$).",
      ],
      completenessRules: [
        "Every numerical input must carry explicit SI units.",
        "Circuit or ray diagram questions must clearly state component values or provide visual descriptions.",
        "MCQs must test conceptual understanding of principles rather than blind recall.",
      ],
      rubricDirective: "Provide step-wise marking: Formula/Principle statement (1m), Substitution with units (1m), Final calculation (1m).",
      formattingNotes: [
        "Enclose all formulas and units in LaTeX $...$ delimiters (e.g. $220\\text{ V}$, $50\\text{ Hz}$, $9.8\\text{ m/s}^2$).",
      ],
    };
  }

  if (norm.includes("chem") || norm.includes("रसायन")) {
    return {
      subjectName: "Chemistry",
      systemDirective: `You are a Senior Board Moderator in Chemistry for ${className}.
Chemical formulas, equations, and IUPAC nomenclatures must be 100% accurate and stoichiometrically balanced.
Never generate non-existent oxidation states or invalid reaction products.`,
      solvabilityRules: [
        "Every chemical equation must be stoichiometrically balanced with state symbols where appropriate $(s, l, g, aq)$.",
        "IUPAC names must adhere strictly to current IUPAC gold book conventions.",
        "Organic reaction mechanisms and reagents must reflect authentic laboratory standard conditions (e.g. acidic KMnO4, alkaline hydrolysis, PCC, Lucas reagent).",
        "Electrochemistry questions must use standard reduction potentials $E^\\circ$ from official textbook electrochemical series.",
      ],
      completenessRules: [
        "Specify reaction temperature, pressure, or catalyst whenever reaction outcome depends on them.",
        "Never ask for deleted syllabus topics (e.g. Metallurgy, Solid State, Polymers in 2026-27 syllabus).",
      ],
      rubricDirective: "Step-wise marking: Balanced equation (1m), Observation/Color change (1m), Scientific explanation/reason (1m).",
      formattingNotes: [
        "Format chemical reactions in LaTeX: $\\text{Zn}(s) + \\text{H}_2\\text{SO}_4(aq) \\rightarrow \\text{ZnSO}_4(aq) + \\text{H}_2(g)\\uparrow$.",
      ],
    };
  }

  if (norm.includes("biolog") || norm.includes("जीव विज्ञान")) {
    return {
      subjectName: "Biology",
      systemDirective: `You are a Senior Board Moderator in Biology for ${className}.
Biological terms, processes, structures and examples must be exactly as in the NCERT textbook. Test understanding of processes and their significance, not only names.`,
      solvabilityRules: [
        "Processes (photosynthesis, respiration, reproduction, inheritance, excretion) must be described in the correct sequence with correct terminology.",
        "Genetics problems must state the parental genotypes/phenotypes and give ratios that follow Mendel's laws.",
      ],
      completenessRules: [
        "For a drawing task write 'Draw a neat, well-labelled diagram of ...' and name what must be labelled when it matters.",
        "Do not refer to figures that are not supplied.",
      ],
      rubricDirective: "Point/step-wise marking; for diagrams, the drawing and each required label carry marks.",
      formattingNotes: ["Write scientific names correctly (genus capitalised, species in lower case)."],
      varietyRules: ["Mix diagram-based, process-explanation, compare/distinguish and application (health, agriculture, environment) questions."],
    };
  }

  // "Social Science" / "सामाजिक विज्ञान" also contain "science" / "विज्ञान": they must reach the Social Science branch
  if ((norm.includes("science") || norm.includes("विज्ञान")) && !norm.includes("social") && !norm.includes("सामाजिक") && !norm.includes("political")) {
    return {
      subjectName: "Science",
      systemDirective: `You are an expert Secondary Board Examiner in General Science for ${className}.
Cover Physics, Chemistry and Biology chapters with authentic conceptual clarity. A good Science paper tests scientific thinking — reasoning, application, numericals, diagrams and graphs — not only recall of textbook sentences.`,
      solvabilityRules: [
        "Ensure all scientific statements adhere to NCERT/MP Board Class 9/10 textbook content and terminology.",
        "Chemical equations must be balanced with correct formulae; use 'formula unit mass' for ionic compounds and 'molecular mass' for molecules; use the textbook's atomic masses (H 1, C 12, N 14, O 16, Na 23, Mg 24, Al 27, S 32, Cl 35.5, K 39, Ca 40 u).",
        "Numericals: physically plausible values with SI units and a single correct answer, and not a direct substitution into a formula given in the question — the student should identify the relation (e.g. choose between v = u + at and s = ut + ½at²), convert units, or combine two steps.",
        "Graph questions: either give a small data table to plot, or describe the graph exactly (quantity on each axis, shape, key values) so it can be read without a picture.",
        "Biological processes and structures (cell organelles, tissues, stomata, respiration, photosynthesis, nervous coordination) must use precise textbook terminology.",
      ],
      completenessRules: [
        "Provide all necessary data and context so questions are self-contained; verification questions must give the observations or masses to verify from.",
        "Do not refer to unseen figures or unnamed tables. For a drawing task write 'Draw a neat, well-labelled diagram of ...'.",
        "True/False statements must hinge on a real scientific idea (e.g. a common misconception), not on a trivial word change in a textbook line.",
      ],
      rubricDirective: "Step-wise model answer: concept/principle, application/formula with substitution and units, final answer or labelled diagram parts — marks per step adding up to the slot's marks.",
      formattingNotes: [
        "Use bilingual phrasing (English & Hindi) when requested.",
      ],
      varietyRules: [
        "Across the paper include diagram-based questions (draw and label), at least one graph-based question when a Motion/Force chapter is assigned, application questions about everyday observations, and numericals that need the right formula to be chosen.",
        "Do not ask two questions on the same sub-topic.",
      ],
    };
  }

  if (norm.includes("social") || norm.includes("सामाजिक") || /history|इतिहास|geograph|भूगोल|political|राजनीति|econom|अर्थशास्त्र/.test(norm)) {
    return {
      subjectName: "Social Science",
      systemDirective: `You are a Senior Board Examiner in Social Science (History, Geography, Political Science, Economics) for ${className}.
Questions must be historically and geographically accurate, constitutionally grounded, and analytically balanced.`,
      solvabilityRules: [
        "Historical chronologies, events, and treaty provisions (e.g. Treaty of Vienna 1815, Non-Cooperation Movement 1920) must be historically verifiable.",
        "Geographical facts (soil types, river systems, mineral deposits, major ports) must match official Survey of India / NCERT maps.",
        "Civics & Polity questions must accurately reflect the Constitution of India, democratic institutions, and federalism.",
        "Economics questions must utilize standard terms: Organized vs Unorganized sectors, Formal vs Informal credit, HDI indicators, GDP.",
      ],
      completenessRules: [
        "Questions must clearly state the required analytical perspective and the number of points (e.g. 'Explain any three social consequences of...'), matching the marks.",
        "Dates, names, places and figures used in a question or answer must be exactly as in the NCERT/MP Board textbook for this class.",
        "A source- or situation-based question must include the extract or situation in the question text.",
        "Avoid politically partisan or speculative inquiries.",
      ],
      rubricDirective: "Point-wise marking: 1 mark per distinct, well-explained historical/geographical/civic/economic point, with the number of points equal to the marks.",
      formattingNotes: ["Provide crisp, legible paragraphs with standard point formatting."],
      varietyRules: [
        "Mix question kinds across the paper: cause-and-effect, compare/distinguish, short source- or situation-based questions, and evaluate/justify — not only 'describe' or 'what is'.",
        "Objective items should test understanding (sequence of events, which feature belongs to which region, which right is violated in a situation), not only names and dates.",
      ],
    };
  }

  if (norm.includes("sanskrit") || norm.includes("संस्कृत")) {
    return {
      subjectName: "Sanskrit",
      systemDirective: `त्वं माध्यमिक-शिक्षा-मण्डलस्य (MPBSE) वरिष्ठ-संस्कृत-परीक्षकः असि।
भवता निर्मिताः सर्वे प्रश्नाः शेमुषी/भास्वती पाठ्यक्रमानुरूपाः, पाणिनि-व्याकरण-सम्मत-शुद्धाः च भवेयुः।
किञ्चिद् अपि भ्रष्टं, अशुद्धं वा रूपं मा लिखतु।`,
      solvabilityRules: [
        "प्रत्यय-शुद्धता: 'पठितवान्/कृतवान्' इत्यत्र क्तवतु-प्रत्ययः (न तु क्त अथवा तप्रत्ययः), 'पठितः' इत्यत्र क्त-प्रत्ययः, 'गच्छन्' इत्यत्र शतृ-प्रत्ययः।",
        "प्रश्नवाचक-पदानां वचन-सङ्गतिः: एकवचने 'कः', द्विवचने 'कौ' (उदा. 'कौ बालकौ', 'लवकुशौ'), बहुवचने 'के' इति प्रयोक्तव्यम्।",
        "पुंल्लिङ्ग-द्विवचन-पदानि '-ौ' अन्तानि भवेयुः (उदा. 'द्वौ बालकौ', न तु 'द्वौ बालको')।",
        "हिन्दी-छाया-दोष-निवारणम्: 'गच्छति' इति पदस्य कर्मवाच्ये सहायक-क्रियारूपेण प्रयोगः सर्वथा वर्जितः (उदा. 'प्रदत्तोग्छति' इति सर्वथा अशुद्धम्; 'प्रदीयते' अथवा 'दीयते' इति शुद्धम्)।",
        "सत्य/असत्य प्रश्नेषु विकल्पाः ['आम्', 'न'] इति भवेयुः।",
        "उचित-सम्बन्ध-योजने 'स्तम्भ अ' तथा 'स्तम्भ ब' इति लेखनीयम्।",
      ],
      completenessRules: [
        "प्रश्नेषु विना संदर्भं कोऽपि भ्रष्टः श्लोकांशः मा भवतु।",
        "प्रश्नसंख्या अथवा [1 अंक] इति प्रश्नस्य मूलपाठ्ये (text) मा लिखतु।",
      ],
      rubricDirective: "संस्कृतेन एव स्पष्टं पद-विच्छेदं व्याकरण-कारणं च उत्तर-क्षेत्रे (answer) सूचयतु।",
      formattingNotes: ["शुद्ध-देवनागरी-लिप्यैव लिखतु। आङ्ग्ल-शब्दानां मिश्रणं सर्वथा वर्जितम्।"],
    };
  }

  if (norm.includes("hindi") || norm.includes("हिंदी") || norm.includes("हिन्दी")) {
    return {
      subjectName: "Hindi",
      systemDirective: `आप मध्य प्रदेश माध्यमिक शिक्षा मण्डल (MPBSE) के वरिष्ठ हिन्दी विषय-विशेषज्ञ एवं प्रश्नपत्र निर्माता हैं।
सभी प्रश्न क्षितिज, कृतिका, आरोह अथवा वितान पाठ्यपुस्तकों तथा मानक हिन्दी व्याकरण के पूर्णतः अनुरूप होने चाहिए।`,
      solvabilityRules: [
        "व्याकरणिक शुद्धता: संधि, समास, रस, छंद, अलंकार, पद-परिचय एवं वाक्य-शोधन के नियम मानक हिन्दी व्याकरण सम्मत हों।",
        "साहित्यिक प्रश्नों में कवि, लेखक, विधा, एवं प्रसंग की प्रामाणिकता सुनिश्चित करें।",
        "सत्य / असत्य वाले प्रश्नों के उत्तर 'सत्य' अथवा 'असत्य' ही होने चाहिए।",
        "सही जोड़ी वाले प्रश्नों में 'स्तम्भ क' एवं 'स्तम्भ ख' का प्रयोग करें।",
      ],
      completenessRules: [
        "अपठित गद्यांश अथवा पद्यांश के सभी प्रश्न गद्यांश के भीतर दी गई जानकारी से ही हल होने योग्य हों।",
        "प्रश्न में कोई भी अधूरा वाक्य या अस्पष्ट संदर्भ न हो।",
      ],
      rubricDirective: "अंक-विभाजन: भाव पक्ष (1 अंक), कला पक्ष (1 अंक), निष्कर्ष/शिल्प (1 अंक)।",
      formattingNotes: ["शुद्ध देवनागरी लिपि का प्रयोग करें।"],
    };
  }

  if (norm.includes("english")) {
    return {
      subjectName: "English",
      systemDirective: `You are a Senior Board Examiner in English for ${className}.
Ensure impeccable grammatical syntax, natural idiomatic fluency, and strict alignment with prescribed NCERT readers (First Flight, Footprints, Flamingo, Vistas).`,
      solvabilityRules: [
        "Reading comprehension passages must be self-contained and answerable strictly from the given passage text.",
        "Grammar questions (Reported speech, passive voice, clauses, determiners, tenses) must have unequivocal single correct answers.",
        "Writing section prompts (Formal letter, Article, Notice, Report) must specify the sender, recipient, purpose, and word limit.",
      ],
      completenessRules: [
        "Include the full reading passage text before asking sub-questions.",
        "Options in grammar MCQs must be plausible and grammatically distinct.",
      ],
      rubricDirective: "Marking scheme breakdown: Format (1m), Content (2m), Accuracy & Expression (1m).",
      formattingNotes: ["Use standard Queen's English / formal Indian Board examination convention."],
    };
  }

  // Generic fallback
  return {
    subjectName: canonicalSubject,
    systemDirective: `You are a Senior Board Examiner for ${className} ${canonicalSubject}.
Generate academically rigorous, factually sound, and curriculum-aligned examination questions.`,
    solvabilityRules: ["Ensure questions have clear, unambiguous answers derivable from prescribed syllabus."],
    completenessRules: ["Include all necessary context and conditions."],
    rubricDirective: "Provide step-wise model answer and marks distribution.",
    formattingNotes: ["Use LaTeX for mathematical notation where applicable."],
  };
}
