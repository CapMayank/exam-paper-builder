export interface StandardClassPreset {
  name: string;
  displayOrder: number;
  stream: string;
  subjects: Array<{ name: string; code: string }>;
}

export const STANDARD_SCHOOL_CLASSES: StandardClassPreset[] = [
  {
    name: "Nursery",
    displayOrder: -2,
    stream: "Pre-Primary",
    subjects: [
      { name: "English", code: "NUR-ENG" },
      { name: "Hindi", code: "NUR-HIN" },
      { name: "Mathematics", code: "NUR-MAT" },
      { name: "General Awareness (EVS)", code: "NUR-EVS" },
      { name: "Art & Craft", code: "NUR-ART" },
    ],
  },
  {
    name: "LKG",
    displayOrder: -1,
    stream: "Pre-Primary",
    subjects: [
      { name: "English", code: "LKG-ENG" },
      { name: "Hindi", code: "LKG-HIN" },
      { name: "Mathematics", code: "LKG-MAT" },
      { name: "General Awareness (EVS)", code: "LKG-EVS" },
      { name: "Rhymes & Conversation", code: "LKG-RHY" },
    ],
  },
  {
    name: "UKG",
    displayOrder: 0,
    stream: "Pre-Primary",
    subjects: [
      { name: "English", code: "UKG-ENG" },
      { name: "Hindi", code: "UKG-HIN" },
      { name: "Mathematics", code: "UKG-MAT" },
      { name: "Environmental Studies (EVS)", code: "UKG-EVS" },
      { name: "General Knowledge", code: "UKG-GK" },
    ],
  },
  {
    name: "Class 1",
    displayOrder: 1,
    stream: "Primary",
    subjects: [
      { name: "English", code: "101" },
      { name: "Hindi", code: "102" },
      { name: "Mathematics", code: "103" },
      { name: "EVS", code: "104" },
    ],
  },
  {
    name: "Class 2",
    displayOrder: 2,
    stream: "Primary",
    subjects: [
      { name: "English", code: "201" },
      { name: "Hindi", code: "202" },
      { name: "Mathematics", code: "203" },
      { name: "EVS", code: "204" },
    ],
  },
  {
    name: "Class 3",
    displayOrder: 3,
    stream: "Primary",
    subjects: [
      { name: "English", code: "301" },
      { name: "Hindi", code: "302" },
      { name: "Mathematics", code: "303" },
      { name: "EVS", code: "304" },
    ],
  },
  {
    name: "Class 4",
    displayOrder: 4,
    stream: "Primary",
    subjects: [
      { name: "English", code: "401" },
      { name: "Hindi", code: "402" },
      { name: "Mathematics", code: "403" },
      { name: "EVS", code: "404" },
    ],
  },
  {
    name: "Class 5",
    displayOrder: 5,
    stream: "Primary",
    subjects: [
      { name: "English", code: "501" },
      { name: "Hindi", code: "502" },
      { name: "Mathematics", code: "503" },
      { name: "EVS", code: "504" },
    ],
  },
  {
    name: "Class 6",
    displayOrder: 6,
    stream: "Middle",
    subjects: [
      { name: "English", code: "184" },
      { name: "Hindi", code: "002" },
      { name: "Sanskrit", code: "122" },
      { name: "Mathematics", code: "041" },
      { name: "Science", code: "086" },
      { name: "Social Science", code: "087" },
    ],
  },
  {
    name: "Class 7",
    displayOrder: 7,
    stream: "Middle",
    subjects: [
      { name: "English", code: "184" },
      { name: "Hindi", code: "002" },
      { name: "Sanskrit", code: "122" },
      { name: "Mathematics", code: "041" },
      { name: "Science", code: "086" },
      { name: "Social Science", code: "087" },
    ],
  },
  {
    name: "Class 8",
    displayOrder: 8,
    stream: "Middle",
    subjects: [
      { name: "English", code: "184" },
      { name: "Hindi", code: "002" },
      { name: "Sanskrit", code: "122" },
      { name: "Mathematics", code: "041" },
      { name: "Science", code: "086" },
      { name: "Social Science", code: "087" },
    ],
  },
  {
    name: "Class 9",
    displayOrder: 9,
    stream: "Secondary",
    subjects: [
      { name: "English", code: "184" },
      { name: "Hindi", code: "002" },
      { name: "Mathematics", code: "041" },
      { name: "Science", code: "086" },
      { name: "Social Science", code: "087" },
      { name: "Sanskrit", code: "122" },
      { name: "Information Technology", code: "402" },
      { name: "Artificial Intelligence", code: "417" },
    ],
  },
  {
    name: "Class 10",
    displayOrder: 10,
    stream: "Secondary",
    subjects: [
      { name: "English", code: "184" },
      { name: "Hindi", code: "002" },
      { name: "Mathematics", code: "041" },
      { name: "Science", code: "086" },
      { name: "Social Science", code: "087" },
      { name: "Sanskrit", code: "122" },
      { name: "Information Technology", code: "402" },
      { name: "Artificial Intelligence", code: "417" },
    ],
  },
  {
    name: "Class 11",
    displayOrder: 11,
    stream: "Senior Secondary",
    subjects: [
      { name: "English", code: "301" },
      { name: "Hindi", code: "302" },
      { name: "Physics", code: "042" },
      { name: "Chemistry", code: "043" },
      { name: "Mathematics", code: "041" },
      { name: "Biology", code: "044" },
      { name: "Accountancy", code: "055" },
      { name: "Business Studies", code: "054" },
      { name: "Economics", code: "030" },
      { name: "History", code: "027" },
      { name: "Political Science", code: "028" },
      { name: "Geography", code: "029" },
      { name: "Computer Science", code: "083" },
      { name: "Informatics Practices", code: "065" },
      { name: "Psychology", code: "037" },
      { name: "Sociology", code: "039" },
    ],
  },
  {
    name: "Class 12",
    displayOrder: 12,
    stream: "Senior Secondary",
    subjects: [
      { name: "English", code: "301" },
      { name: "Hindi", code: "302" },
      { name: "Physics", code: "042" },
      { name: "Chemistry", code: "043" },
      { name: "Mathematics", code: "041" },
      { name: "Biology", code: "044" },
      { name: "Accountancy", code: "055" },
      { name: "Business Studies", code: "054" },
      { name: "Economics", code: "030" },
      { name: "History", code: "027" },
      { name: "Political Science", code: "028" },
      { name: "Geography", code: "029" },
      { name: "Computer Science", code: "083" },
      { name: "Informatics Practices", code: "065" },
      { name: "Psychology", code: "037" },
      { name: "Sociology", code: "039" },
    ],
  },
];

export const EDUCATIONAL_STAGES = [
  { id: "ALL", label: "All Stages", sublabel: "Nursery – 12th" },
  { id: "Pre-Primary", label: "Pre-Primary", sublabel: "Nursery – UKG" },
  { id: "Primary", label: "Primary", sublabel: "Classes 1 – 5" },
  { id: "Middle", label: "Middle", sublabel: "Classes 6 – 8" },
  { id: "Secondary", label: "Secondary", sublabel: "Classes 9 & 10" },
  { id: "Senior Secondary", label: "Sr. Secondary", sublabel: "Classes 11 & 12" },
] as const;

export function getEducationalStage(className: string, stream?: string | null): string {
  if (stream && stream.trim()) {
    const s = stream.trim().toLowerCase();
    if (s.includes("pre-primary") || s.includes("prenursery") || s.includes("nursery") || s.includes("kindergarten")) return "Pre-Primary";
    if (s.includes("primary")) return "Primary";
    if (s.includes("middle")) return "Middle";
    if (s.includes("senior") || s.includes("sr")) return "Senior Secondary";
    if (s.includes("secondary")) return "Secondary";
    return stream.trim();
  }
  const lower = className.trim().toLowerCase();
  if (lower.includes("nursery") || lower.includes("lkg") || lower.includes("ukg") || lower.includes("playgroup") || lower.includes("pp")) {
    return "Pre-Primary";
  }
  const numMatch = lower.match(/\b(1[0-2]|[1-9])\b/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (n >= 1 && n <= 5) return "Primary";
    if (n >= 6 && n <= 8) return "Middle";
    if (n >= 9 && n <= 10) return "Secondary";
    if (n >= 11 && n <= 12) return "Senior Secondary";
  }
  return "General";
}

export function getStandardPresetForClass(className: string): StandardClassPreset | null {
  const clean = className.trim().toLowerCase();
  return (
    STANDARD_SCHOOL_CLASSES.find((c) => c.name.toLowerCase() === clean) ||
    STANDARD_SCHOOL_CLASSES.find((c) => clean.includes(c.name.toLowerCase())) ||
    null
  );
}

export function getMissingStandardSubjects(
  className: string,
  existingSubjectNames: string[]
): Array<{ name: string; code: string }> {
  const preset = getStandardPresetForClass(className);
  if (!preset) return [];
  const existingSet = new Set(existingSubjectNames.map((s) => s.trim().toLowerCase()));
  return preset.subjects.filter((s) => !existingSet.has(s.name.trim().toLowerCase()));
}

/**
 * Resolves any school subject variant (e.g. "English Core", "English Language & Literature",
 * "Mathematics / गणित", "Maths", "Hindi Core", "Environmental Studies (EVS)")
 * into its single, clean, canonical department subject name.
 */
export function getCanonicalSubjectName(rawSubject?: string | null): string {
  if (!rawSubject || !rawSubject.trim()) return "";
  const s = rawSubject.trim();
  const lower = s.toLowerCase();

  // If bilingual slash separator exists (e.g. "Mathematics / गणित"), take first part
  const base = lower.split("/")[0].trim();

  // English variants
  if (
    base === "english" ||
    base.startsWith("english ") ||
    base === "eng" ||
    base === "angrezi" ||
    base === "अंग्रेजी"
  ) {
    return "English";
  }

  // Hindi variants
  if (
    base === "hindi" ||
    base.startsWith("hindi ") ||
    base === "hin" ||
    base === "हिंदी" ||
    base === "हिन्दी"
  ) {
    return "Hindi";
  }

  // Mathematics variants
  if (
    base === "math" ||
    base === "maths" ||
    base === "mathematics" ||
    base.startsWith("mathematics ") ||
    base.startsWith("math ") ||
    base === "ganit" ||
    base === "गणित"
  ) {
    return "Mathematics";
  }

  // Social Science variants
  if (
    base === "social science" ||
    base === "social studies" ||
    base === "sst" ||
    base === "samajik vigyan" ||
    base === "सामाजिक विज्ञान" ||
    base === "social"
  ) {
    return "Social Science";
  }

  // General Science variants
  if (
    base === "science" ||
    base === "general science" ||
    base === "sci" ||
    base === "vigyan" ||
    base === "विज्ञान"
  ) {
    return "Science";
  }

  // Sanskrit variants
  if (base === "sanskrit" || base === "sans" || base === "संस्कृत") {
    return "Sanskrit";
  }

  // EVS variants
  if (
    base === "evs" ||
    base.includes("environmental") ||
    base.includes("general awareness") ||
    base === "paryavaran" ||
    base === "पर्यावरण"
  ) {
    return "EVS";
  }

  // Computer / IT variants
  if (
    base === "computer" ||
    base === "computer science" ||
    base === "information technology" ||
    base === "it" ||
    base === "cs" ||
    base === "ip" ||
    base === "informatics practices" ||
    base === "artificial intelligence" ||
    base === "ai"
  ) {
    return "Information Technology";
  }

  // History variants
  if (base === "history" || base === "इतिहास" || base.startsWith("history ")) {
    return "History";
  }

  // Political Science variants
  if (
    base === "political science" ||
    base === "pol science" ||
    base === "polscience" ||
    base === "राजनीति विज्ञान" ||
    base === "civics"
  ) {
    return "Political Science";
  }

  // Geography variants
  if (base === "geography" || base === "भूगोल" || base === "geo") {
    return "Geography";
  }

  // Economics variants
  if (base === "economics" || base === "अर्थशास्त्र" || base === "eco") {
    return "Economics";
  }

  // Business Studies variants
  if (
    base === "business studies" ||
    base === "business" ||
    base === "व्यवसाय अध्ययन" ||
    base === "bst"
  ) {
    return "Business Studies";
  }

  // Accountancy variants
  if (base === "accountancy" || base === "accounts" || base === "लेखाशास्त्र" || base === "acc") {
    return "Accountancy";
  }

  // Physics variants
  if (base === "physics" || base === "भौतिक विज्ञान" || base === "भौतिकी") {
    return "Physics";
  }

  // Chemistry variants
  if (base === "chemistry" || base === "रसायन विज्ञान" || base === "रसायन") {
    return "Chemistry";
  }

  // Biology variants
  if (base === "biology" || base === "जीव विज्ञान") {
    return "Biology";
  }

  // Sociology variants
  if (base === "sociology" || base === "समाजशास्त्र") {
    return "Sociology";
  }

  // Psychology variants
  if (base === "psychology" || base === "मनोविज्ञान") {
    return "Psychology";
  }

  if (s.includes("/")) {
    return s.split("/")[0].trim();
  }

  return s;
}

/**
 * Canonical subject matcher that accounts for:
 * 1. Exact match (case insensitive)
 * 2. Canonical subject resolution (e.g. "English Core", "English Language & Literature", "English" all match)
 * 3. Bilingual slash separator (e.g. "Mathematics / गणित" matching "Mathematics")
 * 4. Standard school curriculum aliases (e.g. Maths, Mathematics, Ganit)
 */
export function isSubjectMatching(subjectA?: string | null, subjectB?: string | null): boolean {
  if (!subjectA || !subjectB) return false;
  if (subjectA === "ALL" || subjectB === "ALL") return true;
  const a = subjectA.trim().toLowerCase();
  const b = subjectB.trim().toLowerCase();
  if (a === b) return true;

  // Direct canonical match
  const canonA = getCanonicalSubjectName(subjectA);
  const canonB = getCanonicalSubjectName(subjectB);
  if (canonA && canonB && canonA === canonB) return true;

  const aParts = a.split("/").map((s) => s.trim());
  const bParts = b.split("/").map((s) => s.trim());
  if (aParts.some((ap) => bParts.includes(ap))) return true;

  const aliases: Array<string[]> = [
    [
      "math",
      "maths",
      "mathematics",
      "ganit",
      "गणित",
      "mathematics standard",
      "mathematics basic",
      "applied mathematics",
      "pre-maths",
    ],
    ["science", "sci", "vigyan", "विज्ञान", "general science"],
    ["social science", "social studies", "sst", "samajik vigyan", "सामाजिक विज्ञान", "social"],
    [
      "evs",
      "environmental studies",
      "environmental science",
      "paryavaran",
      "पर्यावरण",
      "general awareness (evs)",
      "general awareness",
      "environmental studies (evs)",
    ],
    [
      "english",
      "eng",
      "angrezi",
      "अंग्रेजी",
      "english core",
      "english elective",
      "english language & literature",
      "english language and literature",
      "english literature",
      "general english",
      "special english",
      "communicative english",
      "foundational english",
      "foundational english & math",
    ],
    [
      "hindi",
      "hin",
      "हिंदी",
      "हिन्दी",
      "hindi core",
      "hindi elective",
      "hindi course-a",
      "hindi course-b",
      "hindi a",
      "hindi b",
      "samanya hindi",
      "vishesh hindi",
    ],
    ["sanskrit", "sans", "संस्कृत"],
    [
      "computer",
      "information technology",
      "it",
      "cs",
      "computer science",
      "ip",
      "informatics practices",
      "artificial intelligence",
      "ai",
    ],
    ["history", "इतिहास", "world history", "indian history", "themes in world history", "themes in indian history"],
    ["political science", "pol science", "polscience", "राजनीति विज्ञान", "civics", "political theory", "indian constitution"],
    ["geography", "भूगोल", "geo", "physical geography", "human geography"],
    ["economics", "अर्थशास्त्र", "eco", "macroeconomics", "microeconomics", "indian economic development"],
    ["business studies", "business", "व्यवसाय अध्ययन", "bst", "management"],
    ["accountancy", "accounts", "लेखाशास्त्र", "acc", "accounting"],
    ["physics", "भौतिक विज्ञान", "भौतिकी"],
    ["chemistry", "रसायन विज्ञान", "रसायन"],
    ["biology", "जीव विज्ञान", "bio"],
    ["sociology", "समाजशास्त्र"],
    ["psychology", "मनोविज्ञान"],
  ];

  for (const group of aliases) {
    const aInGroup = aParts.some(
      (p) => group.includes(p) || group.some((g) => p.startsWith(g + " ") || g.startsWith(p + " "))
    );
    const bInGroup = bParts.some(
      (p) => group.includes(p) || group.some((g) => p.startsWith(g + " ") || g.startsWith(p + " "))
    );
    if (aInGroup && bInGroup) return true;
  }

  return false;
}

/**
 * Normalizes preset or imported subject names to match an existing class/subject context,
 * stripping out unwanted course qualifiers (e.g. "Core", "Language & Literature") and bilingual slash suffixes.
 */
export function normalizePresetSubject(presetSubject: string, targetSubject?: string): string {
  // If targetSubject is provided, check if it matches
  if (targetSubject && isSubjectMatching(presetSubject, targetSubject)) {
    const canonTarget = getCanonicalSubjectName(targetSubject);
    if (canonTarget) return canonTarget;
    return targetSubject.trim();
  }

  const canonPreset = getCanonicalSubjectName(presetSubject);
  if (canonPreset) return canonPreset;

  if (presetSubject.includes("/")) {
    return presetSubject.split("/")[0].trim();
  }
  return presetSubject.trim();
}
