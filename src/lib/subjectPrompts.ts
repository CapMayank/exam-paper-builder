import type { PaperLanguage } from "./constants";
import type { GenerationContract } from "./curriculumContract";

export interface SubjectPromptDirectives {
  subjectName: string;
  systemDirective: string;
  solvabilityRules: string[];
  completenessRules: string[];
  rubricDirective: string;
  formattingNotes: string[];
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
      ],
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

  if (norm.includes("science") || norm.includes("विज्ञान")) {
    return {
      subjectName: "Science",
      systemDirective: `You are an expert Secondary Board Examiner in General Science for ${className}.
Cover Chemical Reactions, Living Organisms, Natural Phenomena, and Physical Effects with authentic conceptual clarity.`,
      solvabilityRules: [
        "Ensure all scientific statements adhere to NCERT/MP Board Class 9/10 curriculum standards.",
        "Chemical reactions must be balanced; physical calculations (light reflection/refraction, electric current) must have valid numerical values.",
        "Biological diagrams and physiological processes (respiration, photosynthesis, nervous coordination) must use accurate terminology.",
      ],
      completenessRules: [
        "Provide all necessary context so questions are self-contained.",
        "Do not refer to unseen figures or unnamed tables.",
      ],
      rubricDirective: "Step-wise model answer: Definition/Core concept (1m), Application/Formula/Example (1m).",
      formattingNotes: [
        "Use bilingual phrasing (English & Hindi) when requested.",
      ],
    };
  }

  if (norm.includes("social") || norm.includes("सामाजिक")) {
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
        "Questions must clearly state the required analytical perspective (e.g. 'Explain three social consequences of...').",
        "Avoid politically partisan or speculative inquiries.",
      ],
      rubricDirective: "Point-wise marking: 1 mark per distinct, well-explained historical/geographical/civic point.",
      formattingNotes: ["Provide crisp, legible paragraphs with standard point formatting."],
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
